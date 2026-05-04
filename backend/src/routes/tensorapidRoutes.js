import express from 'express'
import pool, { query } from '../db/pg.js'

const router = express.Router()

// ---------------------------------------------------------------------------
// Schema auto-provisioning
// ---------------------------------------------------------------------------
async function ensureTensorapidSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS tb_tensorapid_par (
      testnr        TEXT PRIMARY KEY,
      ne_titulo     NUMERIC,
      titulo        TEXT,
      comment_text  TEXT,
      long_prueba   NUMERIC,
      time_stamp    TEXT,
      lote          TEXT,
      ne_titulo_type TEXT,
      uster_testnr  TEXT,
      laborant      TEXT
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS tb_tensorapid_tbl (
      id            SERIAL PRIMARY KEY,
      testnr        TEXT REFERENCES tb_tensorapid_par(testnr) ON DELETE CASCADE,
      huso_number   INTEGER,
      tiempo_rotura NUMERIC,
      fuerza_b      NUMERIC,
      elongacion    NUMERIC,
      tenacidad     NUMERIC,
      trabajo       NUMERIC,
      huso_ensayos  INTEGER
    )
  `)
}

// Run once on startup (non-blocking)
ensureTensorapidSchema().catch(err =>
  console.error('[tensorapid] Schema setup error:', err.message)
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uppercaseKeys(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) out[k.toUpperCase()] = v
  return out
}

function toNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

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
      `SELECT testnr, uster_testnr FROM tb_tensorapid_par WHERE testnr = ANY($1::text[])`,
      [testnrs]
    )
    const existing = result.rows.map(r => r.testnr)
    const details = {}
    result.rows.forEach(r => {
      details[r.testnr] = { usterTestnr: r.uster_testnr || '' }
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
  const { par, tbl } = req.body
  if (!par?.TESTNR) return res.status(400).json({ error: 'Missing data' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
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

    await client.query('COMMIT')
    res.json({ success: true, testnr: par.TESTNR })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[tensorapid] upload error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// DELETE /api/tensorapid/delete/:testnr
router.delete('/delete/:testnr', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM tb_tensorapid_par WHERE testnr = $1',
      [req.params.testnr]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
