import express from 'express'
import pool, { query } from '../db/pg.js'
import { scheduleDatabaseBackup } from '../services/backupTrigger.js'

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

function normalizeTestnr(v) {
  const raw = String(v || '').trim()
  if (!raw) return ''
  return raw.replace(/^0+/, '') || '0'
}

function normalizeSourcePrefix(v) {
  return String(v || '').trim().toUpperCase()
}

function makeRecordKey(testnr, sourcePrefix) {
  return `${normalizeSourcePrefix(sourcePrefix)}::${normalizeTestnr(testnr)}`
}

async function ensureUsterCardaSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS tb_uster_carda_par (
      testnr TEXT NOT NULL,
      source_prefix TEXT NOT NULL,
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (testnr, source_prefix)
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS tb_uster_carda_tbl (
      id BIGSERIAL PRIMARY KEY,
      testnr TEXT NOT NULL,
      source_prefix TEXT NOT NULL,
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
      UNIQUE(testnr, source_prefix, seqno),
      FOREIGN KEY (testnr, source_prefix)
        REFERENCES tb_uster_carda_par(testnr, source_prefix) ON DELETE CASCADE
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS tb_uster_carda_titulo_tbl (
      id BIGSERIAL PRIMARY KEY,
      testnr TEXT NOT NULL,
      source_prefix TEXT NOT NULL,
      repno INTEGER NOT NULL,
      titulo NUMERIC,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(testnr, source_prefix, repno),
      FOREIGN KEY (testnr, source_prefix)
        REFERENCES tb_uster_carda_par(testnr, source_prefix) ON DELETE CASCADE
    )
  `)
  await query(`ALTER TABLE tb_uster_carda_par ALTER COLUMN source_prefix SET NOT NULL`)
  await query('CREATE INDEX IF NOT EXISTS idx_uster_carda_par_time ON tb_uster_carda_par(time_stamp)')
  await query('CREATE INDEX IF NOT EXISTS idx_uster_carda_tbl_testnr_prefix ON tb_uster_carda_tbl(testnr, source_prefix)')
  await query('CREATE INDEX IF NOT EXISTS idx_uster_carda_titulo_testnr_prefix ON tb_uster_carda_titulo_tbl(testnr, source_prefix)')
}

ensureUsterCardaSchema().catch(err => {
  console.error('[uster-cardas] schema error:', err.message)
})

router.post('/status', async (req, res) => {
  const { entries, testnrs } = req.body
  const normalizedEntries = Array.isArray(entries) && entries.length
    ? entries
      .map((entry) => ({
        testnr: String(entry?.testnr || '').trim(),
        sourcePrefix: normalizeSourcePrefix(entry?.sourcePrefix || entry?.catalog || entry?.source_prefix),
      }))
      .filter((entry) => entry.testnr && entry.sourcePrefix)
    : Array.isArray(testnrs) && testnrs.length
      ? testnrs
        .map((testnr) => ({ testnr: String(testnr || '').trim(), sourcePrefix: '' }))
        .filter((entry) => entry.testnr)
      : []

  if (!normalizedEntries.length) {
    return res.status(400).json({ error: 'entries or testnrs required' })
  }
  try {
    await ensureUsterCardaSchema()
    const original = normalizedEntries.map((entry) => entry.testnr)
    const normalized = original.map((testnr) => normalizeTestnr(testnr))
    const prefixes = [...new Set(normalizedEntries.map((entry) => entry.sourcePrefix).filter(Boolean))]

    const result = prefixes.length
      ? await query(`
          SELECT DISTINCT testnr, source_prefix
          FROM tb_uster_carda_par
          WHERE source_prefix = ANY($1::text[])
            AND (
              trim(testnr) = ANY($2::text[])
              OR ltrim(trim(testnr), '0') = ANY($3::text[])
            )
        `, [prefixes, original, normalized])
      : await query(`
          SELECT DISTINCT testnr, source_prefix
          FROM tb_uster_carda_par
          WHERE trim(testnr) = ANY($1::text[])
             OR ltrim(trim(testnr), '0') = ANY($2::text[])
        `, [original, normalized])

    res.json({ existing: result.rows.map((row) => makeRecordKey(row.testnr, row.source_prefix)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/par', async (req, res) => {
  try {
    await ensureUsterCardaSchema()
    const result = await query(`
      SELECT p.*,
             t.titulo_avg,
             t.titulo_stddev,
             t.titulo_cv,
             t.titulo_1,
             t.titulo_2,
             t.titulo_3
      FROM tb_uster_carda_par p
      LEFT JOIN (
        SELECT testnr, source_prefix,
               AVG(titulo) AS titulo_avg,
               STDDEV_SAMP(titulo) AS titulo_stddev,
               (CASE WHEN AVG(titulo) > 0 THEN (STDDEV_SAMP(titulo) / AVG(titulo)) * 100 ELSE 0 END) AS titulo_cv,
               MAX(CASE WHEN repno = 1 THEN titulo END) AS titulo_1,
               MAX(CASE WHEN repno = 2 THEN titulo END) AS titulo_2,
               MAX(CASE WHEN repno = 3 THEN titulo END) AS titulo_3
        FROM tb_uster_carda_titulo_tbl
        GROUP BY testnr, source_prefix
      ) t ON t.testnr = p.testnr AND t.source_prefix = p.source_prefix
      ORDER BY p.source_prefix, p.testnr
    `)
    res.json({ rows: result.rows.map(uppercaseKeys) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/tbl', async (req, res) => {
  const { testnr, source_prefix: sourcePrefixQuery } = req.query
  try {
    await ensureUsterCardaSchema()
    const sourcePrefix = normalizeSourcePrefix(sourcePrefixQuery)
    const result = testnr && sourcePrefix
      ? await query('SELECT * FROM tb_uster_carda_tbl WHERE testnr = $1 AND source_prefix = $2 ORDER BY seqno', [testnr, sourcePrefix])
      : testnr
        ? await query('SELECT * FROM tb_uster_carda_tbl WHERE testnr = $1 ORDER BY source_prefix, seqno', [testnr])
        : await query('SELECT * FROM tb_uster_carda_tbl ORDER BY source_prefix, testnr, seqno')
    res.json({ rows: result.rows.map(uppercaseKeys) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/titulos', async (req, res) => {
  const { testnr, source_prefix: sourcePrefixQuery } = req.query
  if (!testnr) return res.status(400).json({ error: 'testnr required' })
  try {
    await ensureUsterCardaSchema()
    const sourcePrefix = normalizeSourcePrefix(sourcePrefixQuery)
    const result = sourcePrefix
      ? await query('SELECT * FROM tb_uster_carda_titulo_tbl WHERE testnr = $1 AND source_prefix = $2 ORDER BY repno', [testnr, sourcePrefix])
      : await query('SELECT * FROM tb_uster_carda_titulo_tbl WHERE testnr = $1 ORDER BY source_prefix, repno', [testnr])
    res.json({ rows: result.rows.map(uppercaseKeys) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/upload', async (req, res) => {
  const { par, tbl, titulos } = req.body
  if (!par?.TESTNR) return res.status(400).json({ error: 'Missing PAR data or TESTNR' })
  const sourcePrefix = normalizeSourcePrefix(par.SOURCE_PREFIX || par.CATALOG)
  if (!sourcePrefix) return res.status(400).json({ error: 'Missing SOURCE_PREFIX/CATALOG' })

  await ensureUsterCardaSchema()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      INSERT INTO tb_uster_carda_par
        (testnr, source_prefix, catalog, sortiment, style, machine_family, nomcount,
         maschnr, lote, laborant, time_stamp, matclass, obs, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (testnr, source_prefix) DO UPDATE SET
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
      sourcePrefix,
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

    await client.query('DELETE FROM tb_uster_carda_tbl WHERE testnr = $1 AND source_prefix = $2', [par.TESTNR, sourcePrefix])

    if (Array.isArray(tbl) && tbl.length) {
      for (let i = 0; i < tbl.length; i++) {
        const r = tbl[i]
        await client.query(`
          INSERT INTO tb_uster_carda_tbl
            (testnr, source_prefix, seqno, no_, u_percent, cvm_percent, cvm_1m_percent,
             cvm_3m_percent, cvm_10m_percent, titulo_machine, titulo_rel_perc)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          par.TESTNR,
          sourcePrefix,
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

    // Save manual counts (titulos)
    await client.query('DELETE FROM tb_uster_carda_titulo_tbl WHERE testnr = $1 AND source_prefix = $2', [par.TESTNR, sourcePrefix])
    if (Array.isArray(titulos) && titulos.length) {
      for (const t of titulos) {
        await client.query(`
          INSERT INTO tb_uster_carda_titulo_tbl (testnr, source_prefix, repno, titulo)
          VALUES ($1, $2, $3, $4)
        `, [
          par.TESTNR,
          sourcePrefix,
          t.REPNO,
          toNum(t.TITULO)
        ])
      }
    }

    await client.query('COMMIT')
    scheduleDatabaseBackup(`uster-cardas:${sourcePrefix}:${par.TESTNR}`)
    res.json({ success: true, testnr: par.TESTNR, sourcePrefix, tblRows: tbl?.length || 0 })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.delete('/delete/:testnr', async (req, res) => {
  const sourcePrefix = normalizeSourcePrefix(req.query.source_prefix)
  if (!sourcePrefix) return res.status(400).json({ error: 'source_prefix required' })
  try {
    const result = await query('DELETE FROM tb_uster_carda_par WHERE testnr = $1 AND source_prefix = $2', [req.params.testnr, sourcePrefix])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
