import { logEvent } from '../http.js';
import { recordBackupRequest } from '../services/backupRequests.js';
import { validateRawHvi } from '../helpers/importValidation.js';
import express from 'express'
import pool, { query } from '../db/pg.js'

const router = express.Router()

// Ensure schema
// GET /status - returns filenames already uploaded
router.post('/status', async (req, res) => {
  const { filenames } = req.body
  if (!Array.isArray(filenames) || !filenames.length) {
    return res.status(400).json({ error: 'filenames array required' })
  }
  try {
    const result = await query(`
      SELECT filename FROM tb_hvi_crudo_archivos
      WHERE filename = ANY($1::text[])
    `, [filenames])
    res.json({ existing: result.rows.map(r => r.filename) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /nfe-disponibles - returns valid NFE from tb_calidad_fibra
router.get('/nfe-disponibles', async (req, res) => {
  try {
    const result = await query(`
      SELECT "ID", "PRODUTOR", "DATA_MOVIMENTO", "QTDE" 
      FROM tb_calidad_fibra 
      WHERE "TIPO_MOV" = 'NFE'
    `)
    res.json({ rows: result.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /upload - upload batch
router.post('/upload', async (req, res) => {
  let payload;
  try { payload = validateRawHvi(req.body); }
  catch (err) { return res.status(400).json({ error: err.message }); }
  const { filename, data, calidad_fibra_id } = payload;
  let client;
  try {
    client = await pool.connect();

    await client.query('BEGIN')

    await client.query(`
      INSERT INTO tb_hvi_crudo_archivos (filename, created_at)
      VALUES ($1, NOW())
      ON CONFLICT (filename) DO NOTHING
    `, [filename])

    // Serialize replacements of the same file before deleting its detail rows.
    await client.query('SELECT filename FROM tb_hvi_crudo_archivos WHERE filename = $1 FOR UPDATE', [filename])
    await client.query(`DELETE FROM tb_hvi_crudo_datos WHERE filename = $1`, [filename])

    for (const r of data) {
      await client.query(`
        INSERT INTO tb_hvi_crudo_datos (
          filename, fecha, tipo, proveedor, lote, bale_id, sci, mst, mic, mat, uhml, ui, sf, str, elg, rd, plus_b, cgrd, trcnt, trar, trid, amt, calidad_fibra_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `, [
        filename, r.Fecha, r.Tipo, r.Proveedor, r.Lote, r.Bale_ID,
        r.SCI, r.Mst, r.Mic, r.Mat, r.UHML, r.UI, r.SF, r.Str, r.Elg, r.Rd, r.plus_b, r.CGrd, r.TrCnt, r.TrAr, r.TrID, r.Amt,
        calidad_fibra_id || null
      ])
    }

    await recordBackupRequest(client, 'hvi-crudo');
    await client.query('COMMIT')
    res.json({ success: true, uploadedRows: data.length })
  } catch (err) {
    await client?.query('ROLLBACK')
    logEvent('route_error', { requestId: req.requestId, code: err.code || 'ERROR' });
    res.status(500).json({ error: err.message })
  } finally {
    client?.release()
  }
})

export default router
