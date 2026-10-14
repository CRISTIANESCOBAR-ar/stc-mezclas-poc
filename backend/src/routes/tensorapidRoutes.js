import { logEvent } from '../http.js';
import { updateTensorapidLink } from '../services/tensorapidLink.js';
import { withTransaction } from '../db/transaction.js';
import { recordBackupRequest } from '../services/backupRequests.js';
import { validateTestImport } from '../helpers/importValidation.js';
import { optionalNumber } from '../../../shared/numbers.js';
import express from 'express'
import pool, { query } from '../db/pg.js'
import { scheduleDatabaseBackup } from '../services/backupTrigger.js'

const router = express.Router()

// ---------------------------------------------------------------------------
// Schema auto-provisioning
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uppercaseKeys(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) out[k.toUpperCase()] = v
  return out
}

const toNum = optionalNumber;

router.get('/tests/:testnr', async (req,res,next)=>{
  try {
    const found=await query(`SELECT to_jsonb(p) AS par,p.xmin::text AS version,
      COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM tb_tensorapid_tbl t WHERE t.testnr=p.testnr),'[]'::jsonb) AS tbl
      FROM tb_tensorapid_par p WHERE testnr=$1`,[req.params.testnr]);
    if(!found.rows.length) return res.status(404).json({error:'El ensayo ya no existe.'});
    const row=found.rows[0]; res.json({par:uppercaseKeys(row.par),tbl:row.tbl.map(uppercaseKeys),version:row.version});
  } catch(error){next(error)}
});
router.patch('/tests/:testnr/link',async(req,res,next)=>{
  try {res.json(await updateTensorapidLink(pool,req.params.testnr,req.body))} catch(error){next(error)}
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /api/tensorapid/status — check which testnrs already exist in DB
router.post('/status', async (req, res) => {
  const { testnrs } = req.body
  if (!Array.isArray(testnrs) || !testnrs.length) {
    return res.status(400).json({ error: 'testnrs required' })
  }
  try {
    const result = await query(
      `SELECT testnr, uster_testnr, xmin::text AS version FROM tb_tensorapid_par WHERE testnr = ANY($1::text[])`,
      [testnrs]
    )
    const existing = result.rows.map(r => r.testnr)
    const details = {}
    result.rows.forEach(r => {
      details[r.testnr] = { usterTestnr: r.uster_testnr || '', version: r.version }
    })
    res.json({ existing, details })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tensorapid/par — all PAR rows
router.get('/par', async (req, res) => {
  try {
    const result = await query(`
      SELECT testnr, ne_titulo, titulo, comment_text, long_prueba, time_stamp,
             lote, ne_titulo_type, uster_testnr, laborant
      FROM tb_tensorapid_par
      ORDER BY testnr
    `)
    res.json({ rows: result.rows.map(uppercaseKeys) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tensorapid/tbl[?testnr=…] — TBL rows, optionally filtered
router.get('/tbl', async (req, res) => {
  const { testnr } = req.query
  try {
    const sql = testnr
      ? `SELECT * FROM tb_tensorapid_tbl WHERE testnr = $1 ORDER BY id`
      : `SELECT * FROM tb_tensorapid_tbl ORDER BY testnr, id`
    const result = await query(sql, testnr ? [testnr] : [])
    res.json({ rows: result.rows.map(uppercaseKeys) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tensorapid/upload — upsert PAR + delete/reinsert TBL (transaction)
router.post('/upload', async (req, res) => {
  let payload;
  try { payload = validateTestImport(req.body, 'tenso'); }
  catch (err) { return res.status(400).json({ error: err.message }); }
  const { par, tbl } = payload;

  let client;
  try {
    client = await pool.connect();

    await client.query('BEGIN')

    const headerResult = await client.query(`
      INSERT INTO tb_tensorapid_par
        (testnr, ne_titulo, titulo, comment_text, long_prueba, time_stamp,
         lote, ne_titulo_type, uster_testnr, laborant)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (testnr) DO UPDATE SET
        ne_titulo      = EXCLUDED.ne_titulo,
        titulo         = EXCLUDED.titulo,
        comment_text   = EXCLUDED.comment_text,
        long_prueba    = EXCLUDED.long_prueba,
        time_stamp     = EXCLUDED.time_stamp,
        lote           = EXCLUDED.lote,
        ne_titulo_type = EXCLUDED.ne_titulo_type,
        uster_testnr   = EXCLUDED.uster_testnr,
        laborant       = EXCLUDED.laborant
      RETURNING xmin::text AS version
    `, [
      par.TESTNR, toNum(par.NE_TITULO), par.TITULO, par.COMMENT_TEXT,
      toNum(par.LONG_PRUEBA), par.TIME_STAMP, par.LOTE,
      par.NE_TITULO_TYPE, par.USTER_TESTNR, par.LABORANT
    ])

    await client.query('DELETE FROM tb_tensorapid_tbl WHERE testnr = $1', [par.TESTNR])

    if (Array.isArray(tbl) && tbl.length > 0) {
      for (const r of tbl) {
        await client.query(`
          INSERT INTO tb_tensorapid_tbl
            (testnr, huso_number, tiempo_rotura, fuerza_b, elongacion,
             tenacidad, trabajo, huso_ensayos)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [
          par.TESTNR,
          r.HUSO_NUMBER,
          toNum(r.TIEMPO_ROTURA),
          toNum(r.FUERZA_B),
          toNum(r.ELONGACION),
          toNum(r.TENACIDAD),
          toNum(r.TRABAJO),
          r.HUSO_ENSAYOS
        ])
      }
    }

    await recordBackupRequest(client, 'tensorapid');
    await client.query('COMMIT')
    scheduleDatabaseBackup(`tensorapid:${par.TESTNR}`)
    res.json({ success: true, testnr: par.TESTNR, version: headerResult.rows[0]?.version })
  } catch (err) {
    await client?.query('ROLLBACK')
    logEvent('route_error', { requestId: req.requestId, code: err.code || 'ERROR' });
    res.status(500).json({ error: err.message })
  } finally {
    client?.release()
  }
})

// DELETE /api/tensorapid/delete/:testnr
router.delete('/delete/:testnr', async (req, res) => {
  try {
    const result = await withTransaction(pool, async client => {
      const deleted = await client.query(
      'DELETE FROM tb_tensorapid_par WHERE testnr = $1',
      [req.params.testnr]
      );
      if (deleted.rowCount) await recordBackupRequest(client, 'tensorapid-deleted');
      return deleted;
    })
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
