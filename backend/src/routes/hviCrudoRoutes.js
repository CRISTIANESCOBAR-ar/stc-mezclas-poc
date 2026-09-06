import express from 'express'
import pool, { query } from '../db/pg.js'

const router = express.Router()

// Ensure schema
async function ensureHviCrudoSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS tb_hvi_crudo_archivos (
      filename TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS tb_hvi_crudo_datos (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL REFERENCES tb_hvi_crudo_archivos(filename) ON DELETE CASCADE,
      fecha TEXT,
      tipo TEXT,
      proveedor TEXT,
      lote TEXT,
      bale_id TEXT,
      sci NUMERIC,
      mst NUMERIC,
      mic NUMERIC,
      mat NUMERIC,
      uhml NUMERIC,
      ui NUMERIC,
      sf NUMERIC,
      str NUMERIC,
      elg NUMERIC,
      rd NUMERIC,
      plus_b NUMERIC,
      cgrd TEXT,
      trcnt NUMERIC,
      trar NUMERIC,
      trid TEXT,
      amt NUMERIC,
      calidad_fibra_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}
ensureHviCrudoSchema().catch(err => console.error('[hvi-crudo] schema error:', err.message))

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
  const { filename, data, calidad_fibra_id } = req.body
  if (!filename || !Array.isArray(data)) {
    return res.status(400).json({ error: 'filename and data array required' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      INSERT INTO tb_hvi_crudo_archivos (filename, created_at)
      VALUES ($1, NOW())
      ON CONFLICT (filename) DO NOTHING
    `, [filename])

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

    await client.query('COMMIT')
    res.json({ success: true, uploadedRows: data.length })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error in POST /upload hvi-crudo:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

export default router
