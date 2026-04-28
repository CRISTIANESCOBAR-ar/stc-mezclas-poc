import express from 'express'
import pool, { query } from '../db/pg.js'

const router = express.Router()

function uppercaseKeys(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) out[k.toUpperCase()] = v
  return out
}

function toNum(v) {
  if (v == null || v === '') return null
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

async function ensureUsterCardaSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS tb_uster_carda_par (
      testnr TEXT PRIMARY KEY,
      source_prefix TEXT,
      catalog TEXT,
      sortiment TEXT,
      style TEXT,
      machine_family TEXT,
      nomcount NUMERIC,
      maschnr TEXT,
      lote TEXT,
      laborant TEXT,
      time_stamp TEXT,
      matclass TEXT,
      obs TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS tb_uster_carda_tbl (
      id BIGSERIAL PRIMARY KEY,
      testnr TEXT NOT NULL REFERENCES tb_uster_carda_par(testnr) ON DELETE CASCADE,
      seqno INTEGER NOT NULL,
      no_ NUMERIC,
      u_percent NUMERIC,
      cvm_percent NUMERIC,
      cvm_1m_percent NUMERIC,
      cvm_3m_percent NUMERIC,
      cvm_10m_percent NUMERIC,
      titulo_machine NUMERIC,
      titulo_rel_perc NUMERIC,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(testnr, seqno)
    )
  `)
  await query('CREATE INDEX IF NOT EXISTS idx_uster_carda_par_time ON tb_uster_carda_par(time_stamp)')
  await query('CREATE INDEX IF NOT EXISTS idx_uster_carda_tbl_testnr ON tb_uster_carda_tbl(testnr)')
}

ensureUsterCardaSchema().catch(err => {
  console.error('[uster-cardas] schema error:', err.message)
})

router.post('/status', async (req, res) => {
  const { testnrs } = req.body
  if (!Array.isArray(testnrs) || !testnrs.length) {
    return res.status(400).json({ error: 'testnrs required' })
  }
  try {
    await ensureUsterCardaSchema()
    const original = testnrs.map(t => String(t || '').trim()).filter(Boolean)
    const normalized = original.map(t => t.replace(/^0+/, '') || '0')
    const result = await query(`
      SELECT DISTINCT testnr
      FROM tb_uster_carda_par
      WHERE trim(testnr) = ANY($1::text[])
         OR ltrim(trim(testnr), '0') = ANY($2::text[])
    `, [original, normalized])
    res.json({ existing: result.rows.map(r => r.testnr) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/par', async (req, res) => {
  try {
    await ensureUsterCardaSchema()
    const result = await query('SELECT * FROM tb_uster_carda_par ORDER BY testnr')
    res.json({ rows: result.rows.map(uppercaseKeys) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/tbl', async (req, res) => {
  const { testnr } = req.query
  try {
    await ensureUsterCardaSchema()
    const result = testnr
      ? await query('SELECT * FROM tb_uster_carda_tbl WHERE testnr = $1 ORDER BY seqno', [testnr])
      : await query('SELECT * FROM tb_uster_carda_tbl ORDER BY testnr, seqno')
    res.json({ rows: result.rows.map(uppercaseKeys) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/upload', async (req, res) => {
  const { par, tbl } = req.body
  if (!par?.TESTNR) return res.status(400).json({ error: 'Missing PAR data or TESTNR' })

  await ensureUsterCardaSchema()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      INSERT INTO tb_uster_carda_par
        (testnr, source_prefix, catalog, sortiment, style, machine_family, nomcount,
         maschnr, lote, laborant, time_stamp, matclass, obs, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (testnr) DO UPDATE SET
        source_prefix  = EXCLUDED.source_prefix,
        catalog        = EXCLUDED.catalog,
        sortiment      = EXCLUDED.sortiment,
        style          = EXCLUDED.style,
        machine_family = EXCLUDED.machine_family,
        nomcount       = EXCLUDED.nomcount,
        maschnr        = EXCLUDED.maschnr,
        lote           = EXCLUDED.lote,
        laborant       = EXCLUDED.laborant,
        time_stamp     = EXCLUDED.time_stamp,
        matclass       = EXCLUDED.matclass,
        obs            = EXCLUDED.obs,
        updated_at     = NOW()
    `, [
      par.TESTNR,
      par.SOURCE_PREFIX || null,
      par.CATALOG || null,
      par.SORTIMENT || null,
      par.STYLE || null,
      par.MACHINE_FAMILY || null,
      toNum(par.NOMCOUNT),
      par.MASCHNR || null,
      par.LOTE || null,
      par.LABORANT || null,
      par.TIME_STAMP || null,
      par.MATCLASS || null,
      par.OBS || null
    ])

    await client.query('DELETE FROM tb_uster_carda_tbl WHERE testnr = $1', [par.TESTNR])

    if (Array.isArray(tbl) && tbl.length) {
      for (let i = 0; i < tbl.length; i++) {
        const r = tbl[i]
        await client.query(`
          INSERT INTO tb_uster_carda_tbl
            (testnr, seqno, no_, u_percent, cvm_percent, cvm_1m_percent,
             cvm_3m_percent, cvm_10m_percent, titulo_machine, titulo_rel_perc)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `, [
          par.TESTNR,
          i + 1,
          toNum(r.NO_),
          toNum(r.U_PERCENT),
          toNum(r.CVM_PERCENT),
          toNum(r.CVM_1M_PERCENT),
          toNum(r.CVM_3M_PERCENT),
          toNum(r.CVM_10M_PERCENT),
          toNum(r.TITULO_MACHINE),
          toNum(r.TITULO_REL_PERC)
        ])
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, testnr: par.TESTNR, tblRows: tbl?.length || 0 })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.delete('/delete/:testnr', async (req, res) => {
  try {
    const result = await query('DELETE FROM tb_uster_carda_par WHERE testnr = $1', [req.params.testnr])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
