import express from 'express';
import pool from '../db/pg.js';
import { StockRepository } from '../repositories/stockRepository.js';
import { StandardsRepository } from '../repositories/standardsRepository.js';
import { optimizeBlend } from '../services/blend/optimizer.js';

const router = express.Router();

/**
 * 1. GET /api/inventory/cotton-bales - Available stock from DB
 */
router.get('/cotton-bales', async (req, res) => {
    try {
        const stock = await StockRepository.getAllAvailable();
        res.json(stock);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 2. POST /api/inventory/blendomat - The Core Business Logic (Optimizer Engine)
 */
router.post('/blendomat', async (req, res) => {
    try {
        const { 
            blendSize, 
            algorithm, 
            supervisionSettings,
            rules: uiRules = [], 
            stock: selectedLots = [] 
        } = req.body;

        if (!blendSize || blendSize <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid blendSize' });
        }

        // Logic decoupling via Repository pattern
        const stock = selectedLots.length > 0 
            ? selectedLots 
            : await StockRepository.getAllAvailable();
            
        // Use UI rules if provided, otherwise fetch from DB
        const rules = uiRules.length > 0 
            ? uiRules 
            : await StandardsRepository.getActiveRules();

        // Execution of the business logic engine
        const result = optimizeBlend(stock, rules, supervisionSettings, blendSize, algorithm);

        res.json(result);
    } catch (error) {
        console.error('Core Logic failure:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el cálculo estratégico: ' + error.message 
        });
    }
});

/**
 * Mocks for non-critical features in PoC
 */

// ── Helpers SQL copiados de stc-produccion-v2/backend/server.js ──────────────
function sqlParseDate(colIdent) {
  return `(
    CASE
      WHEN ${colIdent} IS NULL OR ${colIdent} = '' THEN NULL
      WHEN ${colIdent} ~ '^[0-3][0-9]/[0-1][0-9]/[0-9]{4}' THEN to_date(substring(${colIdent} from 1 for 10), 'DD/MM/YYYY')
      WHEN ${colIdent} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN substring(${colIdent} from 1 for 10)::date
      ELSE NULL
    END
  )`;
}

function sqlParseNumberIntl(colIdent) {
  return `(
    CASE
      WHEN ${colIdent} IS NULL OR ${colIdent} = '' THEN NULL
      WHEN ${colIdent} ~ '^-?[0-9]{1,3}(\\.[0-9]{3})+(,[0-9]+)?$' THEN replace(replace(${colIdent}, '.', ''), ',', '.')::numeric
      WHEN ${colIdent} ~ '^-?[0-9]+([.,][0-9]+)?$' THEN replace(${colIdent}, ',', '.')::numeric
      ELSE NULL
    END
  )`;
}

function dateVariants(dateStr) {
  const s = String(dateStr || '').trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (iso) {
    const [yyyy, mm, dd] = s.split('-');
    return { iso: s, br: `${dd}/${mm}/${yyyy}` };
  }
  const br = /^\d{2}\/\d{2}\/\d{4}$/.test(s);
  if (br) {
    const [dd, mm, yyyy] = s.split('/');
    return { iso: `${yyyy}-${mm}-${dd}`, br: s };
  }
  return { iso: s, br: s };
}

// GET /api/inventory/lote-fiac-reference-summary?limit=3
// Copiado de stc-produccion-v2/backend/server.js (line 522)
router.get('/lote-fiac-reference-summary', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 3, 10);

    const parseNumCol = (col) => `
      CASE
        WHEN ${col} IS NULL OR TRIM(${col}::TEXT) = '' THEN NULL
        ELSE CAST(REPLACE(REPLACE(TRIM(${col}::TEXT), '.', ''), ',', '.') AS NUMERIC)
      END`;

    const classifNumeric = `
      CASE
        WHEN "TP" IS NULL OR TRIM("TP") = '' THEN NULL
        WHEN TRIM(COALESCE("CLASSIFIC",'')) = '' OR TRIM(COALESCE("CLASSIFIC",'')) = 'null'
          THEN CASE WHEN TRIM("TP") = 'C' THEN 2.0
                    WHEN TRIM("TP") = 'D' THEN 3.0
                    ELSE NULL END
        WHEN TRIM("TP") = 'C' AND TRIM("CLASSIFIC") = '1/4' THEN 2.25
        WHEN TRIM("TP") = 'C' AND TRIM("CLASSIFIC") = '1/2' THEN 2.50
        WHEN TRIM("TP") = 'C' AND TRIM("CLASSIFIC") = '3/4' THEN 2.75
        WHEN TRIM("TP") = 'D' AND TRIM("CLASSIFIC") = '1/4' THEN 3.25
        WHEN TRIM("TP") = 'D' AND TRIM("CLASSIFIC") = '1/2' THEN 3.50
        WHEN TRIM("TP") = 'D' AND TRIM("CLASSIFIC") = '3/4' THEN 3.75
        ELSE NULL
      END`;

    const sql = `
      SELECT
        MAX(TRIM("LOTE_FIAC"))                     AS "lote_fiac",
        TRIM("MISTURA")                            AS "mistura",
        MIN("DT_ENTRADA_PROD")                     AS "primer_ingreso",
        MAX("DT_ENTRADA_PROD")                     AS "ultimo_ingreso",
        COUNT(*)                                   AS "seq_count",
        SUM(${parseNumCol('"PESO"')})              AS "kg_usados",
        AVG(${parseNumCol('"MIC"')})               AS "mic",
        AVG(${parseNumCol('"UHML"')})              AS "uhml",
        AVG(${parseNumCol('"STR"')})               AS "str",
        AVG(${parseNumCol('"ELG"')})               AS "elg",
        AVG(${parseNumCol('"RD"')})                AS "rd",
        AVG(${parseNumCol('"PLUS_B"')})            AS "plus_b",
        AVG(${parseNumCol('"SCI"')})               AS "sci",
        SUM(${classifNumeric} * ${parseNumCol('"PESO"')})
          / NULLIF(SUM(CASE WHEN ${classifNumeric} IS NOT NULL THEN ${parseNumCol('"PESO"')} END), 0)
                                                   AS "classif_prom"
      FROM tb_calidad_fibra
      WHERE "MISTURA" IS NOT NULL
        AND TRIM("MISTURA") != ''
        AND "TIPO_MOV" = 'MIST'
      GROUP BY TRIM("MISTURA")
      ORDER BY
        CAST(NULLIF(regexp_replace(TRIM("MISTURA"), '[^0-9]', '', 'g'), '') AS INTEGER) DESC NULLS LAST
      LIMIT $1
    `;

    const result = await pool.query(sql, [limit]);

    const round2 = (v) => (v !== null && v !== undefined) ? Math.round(Number(v) * 100) / 100 : null;
    const round0 = (v) => (v !== null && v !== undefined) ? Math.round(Number(v)) : null;

    const rows = result.rows.reverse();

    const referencias = rows.map(row => ({
      loteFiac: String(row.lote_fiac || '').replace(/^0+/, '') || String(row.lote_fiac),
      mistura:  String(row.mistura  || '').replace(/^0+/, '') || String(row.mistura),
      primerIngreso: row.primer_ingreso,
      ultimoIngreso: row.ultimo_ingreso,
      kgUsados: round0(row.kg_usados),
      clasificacionProm: row.classif_prom !== null && row.classif_prom !== undefined
        ? Math.round(Number(row.classif_prom) * 100) / 100
        : null,
      averages: {
        MIC:    round2(row.mic),
        UHML:   round2(row.uhml),
        STR:    round2(row.str),
        ELG:    round2(row.elg),
        RD:     round2(row.rd),
        PLUS_B: round2(row.plus_b),
        SCI:    round2(row.sci)
      }
    }));

    res.json({ referencias });
  } catch (err) {
    console.error('[lote-fiac-reference-summary] Error:', err.message);
    res.status(500).json({ referencias: [], error: err.message });
  }
});

// GET /api/inventory/residuos-lote-blendomar?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
// Copiado de stc-produccion-v2/backend/server.js (line 622)
router.get('/residuos-lote-blendomar', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Se requieren fecha_inicio y fecha_fin (YYYY-MM-DD)' });
    }
    const isoInicio = dateVariants(fecha_inicio).iso;
    const isoFin    = dateVariants(fecha_fin).iso;
    if (!isoInicio || !isoFin) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    const SUBPRODUCTOS = [2043336, 1747388, 2075310];

    const sqlResiduos = `
      SELECT
        SUM(${sqlParseNumberIntl('"PESO LIQUIDO (KG)"')}) AS kg_residuos
      FROM tb_residuos_por_sector
      WHERE ${sqlParseDate('"DT_MOV"')} BETWEEN $1::date AND $2::date
        AND CAST(NULLIF(regexp_replace(TRIM("SUBPRODUTO"::TEXT), '[^0-9]', '', 'g'), '') AS BIGINT) = ANY($3::bigint[])
    `;

    const sqlCardas = `
      SELECT
        SUM(${sqlParseNumberIntl('"PROD INFORM"')}) AS kg_cardas
      FROM tb_produccion_carda
      WHERE data IS NOT NULL
        AND TO_DATE(data, 'DD/MM/YY') BETWEEN $1::date AND $2::date
    `;

    const [resResiduos, resCardas] = await Promise.all([
      pool.query(sqlResiduos, [isoInicio, isoFin, SUBPRODUCTOS]),
      pool.query(sqlCardas,   [isoInicio, isoFin])
    ]);

    const kgResiduos = Math.round(Number(resResiduos.rows[0]?.kg_residuos || 0));
    const kgCardas   = Math.round(Number(resCardas.rows[0]?.kg_cardas   || 0));
    res.json({ kgResiduos, kgCardas });
  } catch (err) {
    console.error('[residuos-lote-blendomar] Error:', err.message);
    res.status(500).json({ kgResiduos: 0, kgCardas: 0, error: err.message });
  }
});

export default router;

