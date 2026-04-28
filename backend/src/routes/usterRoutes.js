import express from 'express';
import pool, { query } from '../db/pg.js';

const router = express.Router();

function uppercaseKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(uppercaseKeys);
  const out = {};
  for (const key of Object.keys(obj)) out[key.toUpperCase()] = obj[key];
  return out;
}

async function ensureUsterSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS tb_uster_par (
      testnr TEXT PRIMARY KEY,
      nomcount TEXT,
      maschnr TEXT,
      lote TEXT,
      laborant TEXT,
      time_stamp TEXT,
      matclass TEXT,
      estiraje TEXT,
      pasador TEXT,
      obs TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tb_uster_tbl (
      id BIGSERIAL PRIMARY KEY,
      testnr TEXT NOT NULL REFERENCES tb_uster_par(testnr) ON DELETE CASCADE,
      seqno INTEGER,
      no_ TEXT,
      u_percent NUMERIC,
      cvm_percent NUMERIC,
      indice_percent NUMERIC,
      cvm_1m_percent NUMERIC,
      cvm_3m_percent NUMERIC,
      cvm_10m_percent NUMERIC,
      titulo NUMERIC,
      titulo_rel_perc NUMERIC,
      h NUMERIC,
      sh NUMERIC,
      sh_1m NUMERIC,
      sh_3m NUMERIC,
      sh_10m NUMERIC,
      delg_minus30_km NUMERIC,
      delg_minus40_km NUMERIC,
      delg_minus50_km NUMERIC,
      delg_minus60_km NUMERIC,
      grue_35_km NUMERIC,
      grue_50_km NUMERIC,
      grue_70_km NUMERIC,
      grue_100_km NUMERIC,
      neps_140_km NUMERIC,
      neps_200_km NUMERIC,
      neps_280_km NUMERIC,
      neps_400_km NUMERIC
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_uster_tbl_testnr ON tb_uster_tbl(testnr)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_uster_tbl_testnr_seqno ON tb_uster_tbl(testnr, seqno)`);

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='estiraje'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN estiraje TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='pasador'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN pasador TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='obs'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN obs TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='created_at'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tb_uster_par' AND column_name='updated_at'
      ) THEN
        ALTER TABLE tb_uster_par ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      END IF;
    END $$;
  `);
}

const toNum = (val) => {
  if (val == null || val === '') return null;
  const parsed = parseFloat(String(val).replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
};

router.post('/status', async (req, res) => {
  const { testnrs } = req.body;
  if (!Array.isArray(testnrs) || testnrs.length === 0) {
    return res.status(400).json({ error: 'testnrs must be a non-empty array' });
  }

  try {
    await ensureUsterSchema();
    const placeholders = testnrs.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(`SELECT testnr FROM tb_uster_par WHERE testnr IN (${placeholders})`, testnrs);
    return res.json({ existing: result.rows.map((r) => r.testnr) });
  } catch (err) {
    console.error('Error en /api/uster/status:', err.message);
    return res.json({ existing: [] });
  }
});

router.get('/par', async (req, res) => {
  try {
    await ensureUsterSchema();
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
    await ensureUsterSchema();
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
    await ensureUsterSchema();
    const result = await query(`SELECT no_ FROM tb_uster_tbl WHERE testnr = $1 ORDER BY seqno`, [testnr]);
    return res.json({ husos: result.rows.map((r) => r.no_).filter(Boolean) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get Husos' });
  }
});

router.post('/upload', async (req, res) => {
  const { par, tbl } = req.body;
  if (!par?.TESTNR) return res.status(400).json({ error: 'Missing PAR data or TESTNR' });

  const client = await pool.connect();
  try {
    await ensureUsterSchema();
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

    await client.query('COMMIT');
    return res.json({ success: true, testnr: par.TESTNR, tblRows: tbl?.length || 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error uploading Uster:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/delete/:testnr', async (req, res) => {
  try {
    await ensureUsterSchema();
    const result = await query('DELETE FROM tb_uster_par WHERE testnr = $1', [req.params.testnr]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
