import { logEvent } from '../http.js';
import { updateManual } from '../services/usterManual.js';
import { withTransaction } from '../db/transaction.js';
import { recordBackupRequest } from '../services/backupRequests.js';
import { validateTestImport } from '../helpers/importValidation.js';
import { optionalNumber } from '../../../shared/numbers.js';
import express from 'express';
import pool, { query } from '../db/pg.js';
import { scheduleDatabaseBackup } from '../services/backupTrigger.js';

const router = express.Router();

function uppercaseKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(uppercaseKeys);
  const out = {};
  for (const key of Object.keys(obj)) out[key.toUpperCase()] = obj[key];
  return out;
}

const toNum = optionalNumber;

// One statement keeps header and detail on the same PostgreSQL snapshot.
router.get('/tests/:testnr', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT to_jsonb(p) AS par, p.xmin::text AS version,
        COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.seqno)
          FROM tb_uster_tbl t WHERE t.testnr = p.testnr), '[]'::jsonb) AS tbl
      FROM tb_uster_par p WHERE p.testnr = $1
    `, [req.params.testnr]);
    if (!result.rows.length) return res.status(404).json({ error: 'El ensayo ya no existe en la base.' });
    const { par, tbl } = result.rows[0];
    return res.json({ par: uppercaseKeys(par), tbl: tbl.map(uppercaseKeys), version: result.rows[0].version });
  } catch (error) { next(error); }
});

router.patch('/tests/:testnr/manual', async (req, res, next) => {
  try { res.json(await updateManual(pool, req.params.testnr, req.body)); }
  catch (error) { next(error); }
});

router.post('/status', async (req, res) => {
  const { testnrs } = req.body;
  if (!Array.isArray(testnrs) || testnrs.length === 0) {
    return res.status(400).json({ error: 'testnrs must be a non-empty array' });
  }

  try {

    const result = await query('SELECT testnr FROM tb_uster_par WHERE testnr = ANY($1::text[])', [testnrs]);
    return res.json({ existing: result.rows.map((r) => r.testnr) });
  } catch (err) {
    logEvent('route_error', { requestId: req.requestId, code: err.code || 'ERROR' });
    return res.status(503).json({ error: 'No se pudo verificar cuáles ensayos están guardados. Reintenta actualizar la carpeta.' });
  }
});

router.get('/par', async (req, res) => {
  try {

    const result = await query(`
      SELECT testnr, nomcount, maschnr, lote, laborant, time_stamp, matclass, estiraje, pasador, obs, created_at, updated_at
      FROM tb_uster_par
      ORDER BY testnr
    `);
    return res.json({ rows: result.rows.map(uppercaseKeys) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/tbl', async (req, res) => {
  const { testnr } = req.query;

  try {

    const sql = testnr
      ? `SELECT * FROM tb_uster_tbl WHERE testnr = $1 ORDER BY seqno`
      : `SELECT * FROM tb_uster_tbl ORDER BY testnr, seqno`;
    const result = await query(sql, testnr ? [testnr] : []);
    return res.json({ rows: result.rows.map(uppercaseKeys) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/husos', async (req, res) => {
  const { testnr } = req.body;
  if (!testnr) return res.status(400).json({ error: 'testnr is required' });

  try {

    const result = await query(`SELECT no_ FROM tb_uster_tbl WHERE testnr = $1 ORDER BY seqno`, [testnr]);
    return res.json({ husos: result.rows.map((r) => r.no_).filter(Boolean) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get Husos' });
  }
});

router.post('/upload', async (req, res) => {
  let payload;
  try { payload = validateTestImport(req.body, 'uster'); }
  catch (err) { return res.status(400).json({ error: err.message }); }
  const { par, tbl } = payload;

  let client;
  try {
    client = await pool.connect();

    await client.query('BEGIN');

    await client.query(`
      INSERT INTO tb_uster_par (testnr, nomcount, maschnr, lote, laborant, time_stamp, matclass, estiraje, pasador, obs, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (testnr) DO UPDATE SET
        nomcount = EXCLUDED.nomcount,
        maschnr = EXCLUDED.maschnr,
        lote = EXCLUDED.lote,
        laborant = EXCLUDED.laborant,
        time_stamp = EXCLUDED.time_stamp,
        matclass = EXCLUDED.matclass,
        estiraje = EXCLUDED.estiraje,
        pasador = EXCLUDED.pasador,
        obs = EXCLUDED.obs,
        updated_at = NOW()
    `, [
      par.TESTNR,
      par.NOMCOUNT,
      par.MASCHNR,
      par.LOTE,
      par.LABORANT,
      par.TIME_STAMP,
      par.MATCLASS,
      par.ESTIRAJE,
      par.PASADOR,
      par.OBS,
    ]);

    await client.query('DELETE FROM tb_uster_tbl WHERE testnr = $1', [par.TESTNR]);

    if (Array.isArray(tbl) && tbl.length > 0) {
      for (let i = 0; i < tbl.length; i += 1) {
        const r = tbl[i];
        const params = [
          par.TESTNR, i + 1, r.NO_,
          toNum(r.U_PERCENT), toNum(r.CVM_PERCENT), toNum(r.INDICE_PERCENT),
          toNum(r.CVM_1M_PERCENT), toNum(r.CVM_3M_PERCENT), toNum(r.CVM_10M_PERCENT),
          toNum(r.TITULO), toNum(r.TITULO_REL_PERC),
          toNum(r.H), toNum(r.SH), toNum(r.SH_1M), toNum(r.SH_3M), toNum(r.SH_10M),
          toNum(r.DELG_MINUS30_KM), toNum(r.DELG_MINUS40_KM),
          toNum(r.DELG_MINUS50_KM), toNum(r.DELG_MINUS60_KM),
          toNum(r.GRUE_35_KM), toNum(r.GRUE_50_KM), toNum(r.GRUE_70_KM),
          toNum(r.GRUE_100_KM),
          toNum(r.NEPS_140_KM), toNum(r.NEPS_200_KM), toNum(r.NEPS_280_KM), toNum(r.NEPS_400_KM),
        ];

        await client.query(`
          INSERT INTO tb_uster_tbl (
            testnr, seqno, no_, u_percent, cvm_percent, indice_percent,
            cvm_1m_percent, cvm_3m_percent, cvm_10m_percent, titulo, titulo_rel_perc,
            h, sh, sh_1m, sh_3m, sh_10m, delg_minus30_km, delg_minus40_km,
            delg_minus50_km, delg_minus60_km, grue_35_km, grue_50_km, grue_70_km,
            grue_100_km, neps_140_km, neps_200_km, neps_280_km, neps_400_km
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
          )
        `, params);
      }
    }

    await recordBackupRequest(client, 'uster');
    await client.query('COMMIT');
    scheduleDatabaseBackup(`uster:${par.TESTNR}`);
    return res.json({ success: true, testnr: par.TESTNR, tblRows: tbl?.length || 0 });
  } catch (err) {
    await client?.query('ROLLBACK');
    logEvent('route_error', { requestId: req.requestId, code: err.code || 'ERROR' });
    return res.status(500).json({ error: err.message });
  } finally {
    client?.release();
  }
});

router.delete('/delete/:testnr', async (req, res) => {
  try {

    const result = await withTransaction(pool, async client => {
      const deleted = await client.query('DELETE FROM tb_uster_par WHERE testnr = $1', [req.params.testnr]);
      if (deleted.rowCount) await recordBackupRequest(client, 'ensayo-deleted');
      return deleted;
    });
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
