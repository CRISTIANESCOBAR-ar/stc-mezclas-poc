import { withTransaction } from '../db/transaction.js';
import { recordBackupRequest } from '../services/backupRequests.js';
import { validateTestImport } from '../helpers/importValidation.js';
import { optionalNumber } from '../../../shared/numbers.js';
import { requiredNumber } from '../../../shared/numbers.js';
import express from 'express'
import pool, { query } from '../db/pg.js'
import { scheduleDatabaseBackup } from '../services/backupTrigger.js'

const router = express.Router()

function uppercaseKeys(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) out[k.toUpperCase()] = v
  return out
}

const toNum = optionalNumber;

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

router.get('/tests/:prefix/:testnr', async (req, res, next) => {
  try {
    const result = await query(`SELECT to_jsonb(p) AS par, p.xmin::text AS version,
      COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY seqno) FROM tb_uster_carda_tbl t
        WHERE t.testnr=p.testnr AND t.source_prefix=p.source_prefix), '[]'::jsonb) AS tbl,
      COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY repno) FROM tb_uster_carda_titulo_tbl t
        WHERE t.testnr=p.testnr AND t.source_prefix=p.source_prefix), '[]'::jsonb) AS titulos
      FROM tb_uster_carda_par p WHERE source_prefix=$1 AND
      COALESCE(NULLIF(ltrim(trim(testnr), '0'), ''), '0')=$2`,
      [normalizeSourcePrefix(req.params.prefix), normalizeTestnr(req.params.testnr)]);
    if (result.rows.length !== 1) return res.status(result.rows.length ? 409 : 404).json({ error: 'No se encontró un ensayo único para ese equipo y número.' });
    const row = result.rows[0];
    res.json({ par: uppercaseKeys(row.par), tbl: row.tbl.map(uppercaseKeys), titulos: row.titulos.map(uppercaseKeys), version: row.version });
  } catch (error) { next(error); }
});

router.patch('/tests/:prefix/:testnr/manual', async (req, res, next) => {
  try {
    const { version, titulos } = req.body;
    if (!/^\d+$/.test(String(version || '')) || !Array.isArray(titulos) || titulos.length !== 3) return res.status(400).json({ error: 'Versión y tres títulos requeridos.' });
    const values = titulos.map((row, i) => {
      if (row?.REPNO !== i + 1) throw Object.assign(new Error('Orden de repeticiones inválido.'), { statusCode: 400 });
      return requiredNumber(row.TITULO, `Título ${i + 1}`, { min: 0 });
    });
    const result = await withTransaction(pool, async client => {
      const found = await client.query(`SELECT testnr, source_prefix, xmin::text AS version FROM tb_uster_carda_par
        WHERE source_prefix=$1 AND COALESCE(NULLIF(ltrim(trim(testnr), '0'), ''), '0')=$2 FOR UPDATE`,
        [normalizeSourcePrefix(req.params.prefix), normalizeTestnr(req.params.testnr)]);
      if (found.rows.length !== 1 || found.rows[0].version !== String(version)) throw Object.assign(new Error('El ensayo cambió. Recarga antes de guardar.'), { statusCode: 409 });
      const row = found.rows[0];
      await client.query('DELETE FROM tb_uster_carda_titulo_tbl WHERE testnr=$1 AND source_prefix=$2', [row.testnr, row.source_prefix]);
      for (let i=0; i<3; i++) await client.query('INSERT INTO tb_uster_carda_titulo_tbl (testnr, source_prefix, repno, titulo) VALUES ($1,$2,$3,$4)', [row.testnr, row.source_prefix, i+1, values[i]]);
      const updated = await client.query('UPDATE tb_uster_carda_par SET updated_at=NOW() WHERE testnr=$1 AND source_prefix=$2 RETURNING xmin::text AS version', [row.testnr, row.source_prefix]);
      await recordBackupRequest(client, 'uster-cardas-manual');
      return { success: true, version: updated.rows[0].version };
    });
    res.json(result);
  } catch (error) { next(error); }
});

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
  let payload;
  try { payload = validateTestImport(req.body, 'carda'); }
  catch (err) { return res.status(400).json({ error: err.message }); }
  const { par, tbl, titulos } = payload;
  const sourcePrefix = par.SOURCE_PREFIX;
  let client;
  try {
    client = await pool.connect();

    await client.query('BEGIN')
    const headerResult = await client.query(`
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
      RETURNING xmin::text AS version
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
    if (titulos !== undefined) await client.query('DELETE FROM tb_uster_carda_titulo_tbl WHERE testnr = $1 AND source_prefix = $2', [par.TESTNR, sourcePrefix])
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

    await recordBackupRequest(client, 'uster-cardas');
    await client.query('COMMIT')
    scheduleDatabaseBackup(`uster-cardas:${sourcePrefix}:${par.TESTNR}`)
    res.json({ success: true, testnr: par.TESTNR, sourcePrefix, tblRows: tbl?.length || 0, version: headerResult.rows[0]?.version })
  } catch (err) {
    await client?.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client?.release()
  }
})

router.delete('/delete/:testnr', async (req, res) => {
  const sourcePrefix = normalizeSourcePrefix(req.query.source_prefix)
  if (!sourcePrefix) return res.status(400).json({ error: 'source_prefix required' })
  try {
    const result = await withTransaction(pool, async client => {
      const deleted = await client.query('DELETE FROM tb_uster_carda_par WHERE testnr = $1 AND source_prefix = $2', [req.params.testnr, sourcePrefix]);
      if (deleted.rowCount) await recordBackupRequest(client, 'ensayo-deleted');
      return deleted;
    })
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
