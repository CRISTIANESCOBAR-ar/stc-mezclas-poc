import express from 'express'
import pool from '../db/pg.js'

const router = express.Router()

// Helper parseNumber if needed, adapted to pure SQL
const sqlParseNumber = (col) => `CASE WHEN ${col} ~ '^[0-9]' THEN REPLACE(${col}, ',', '.')::numeric ELSE NULL END`

// GET /api/calidad-fibra
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT "LOTE_FIAC", "PESO", "MISTURA", "SEQ", "DT_ENTRADA_PROD", "HR_ENTRADA_PROD",
             "SCI", "MST", "MIC", "MAT", "UHML", "UI", "SF", 
             "STR", "ELG", "RD", "PLUS_B", "TIPO", "TrCNT", "TrAR", "TRID"
      FROM tb_calidad_fibra
      WHERE "LOTE_FIAC" IS NOT NULL AND "LOTE_FIAC" != ''
        AND "TIPO_MOV" = 'MIST'
      ORDER BY "MISTURA", "SEQ"
    `)
    res.json({ rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/calidad-fibra-mistura
router.get('/mistura', async (req, res) => {
  try {
    const misturaRaw = String(req.query.mistura || '').trim()
    if (!misturaRaw) return res.status(400).json({ error: 'mistura requerida' })

    const mistura = misturaRaw.padStart(10, '0')
    const sql = `
      SELECT
        "MISTURA" AS MISTURA,
        "SEQ" AS SEQ,
        "DT_ENTRADA_PROD" AS "DT_ENTRADA_PROD",
        "HR_ENTRADA_PROD" AS "HR_ENTRADA_PROD",
        ${sqlParseNumber('"SCI"')} AS SCI,
        ${sqlParseNumber('"MST"')} AS MST,
        ${sqlParseNumber('"MIC"')} AS MIC,
        ${sqlParseNumber('"MAT"')} AS MAT,
        ${sqlParseNumber('"UHML"')} AS UHML,
        ${sqlParseNumber('"UI"')} AS UI,
        ${sqlParseNumber('"SF"')} AS SF,
        ${sqlParseNumber('"STR"')} AS STR,
        ${sqlParseNumber('"ELG"')} AS ELG,
        ${sqlParseNumber('"RD"')} AS RD,
        ${sqlParseNumber('"PLUS_B"')} AS PLUS_B,
        ${sqlParseNumber('"TrCNT"')} AS "TrCNT",
        ${sqlParseNumber('"TrAR"')} AS "TrAR",
        ${sqlParseNumber('"TRID"')} AS "TRID",
        ${sqlParseNumber('"PESO"')} AS PESO
      FROM tb_calidad_fibra
      WHERE "TIPO_MOV" = 'MIST' AND ("MISTURA" = $1 OR "MISTURA" = $2)
    `
    const result = await pool.query(sql, [misturaRaw, mistura])
    res.json({ rows: result.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
