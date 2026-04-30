import express from 'express';
import pool, { query } from '../db/pg.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import { formatOEParaPrompt, generarNarrativaLocal, buildBloqueOE } from '../helpers/narrativaHelpers.js';
import { parseNarrativaStructure } from '../helpers/narrativaSections.js';
const router = express.Router();

function buildNarrativaStructuredFields(narrativaText) {
  const parsed = parseNarrativaStructure(narrativaText);
  return {
    narrativaIntro: parsed.intro || '',
    narrativaSections: Array.isArray(parsed.sections) ? parsed.sections : [],
  };
}

// ─────────── Cache de narrativas (Postgres) ───────────
let cacheTableReady = false;
async function ensureCacheTable() {
  if (cacheTableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tb_narrativa_cache (
        cache_key   VARCHAR(64) PRIMARY KEY,
        lotes       TEXT NOT NULL,
        fecha       VARCHAR(20),
        formato     VARCHAR(32),
        modelo      VARCHAR(64),
        data_hash   VARCHAR(64) NOT NULL,
        narrativa   TEXT NOT NULL,
        json_analisis_ia JSONB,
        modelo_usado VARCHAR(64),
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        last_hit_at TIMESTAMPTZ DEFAULT NOW(),
        hits        INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_narrativa_cache_lotes ON tb_narrativa_cache(lotes, fecha);
    `);
    cacheTableReady = true;
    console.log('✓ Tabla tb_narrativa_cache lista');
  } catch (e) {
    console.warn('⚠️ No pude crear tb_narrativa_cache:', e.message);
  }
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function buildCacheKey({ lotes, fecha, formato, modelo, dataHash }) {
  return sha256(`${lotes}|${fecha || ''}|${formato || 'actual'}|${modelo || ''}|${dataHash}`);
}

// Hash determinístico de los datos relevantes (para invalidar al cambiar datos subyacentes)
function hashRowsPayload(rows, proveedores = []) {
  const norm = rows.map(r => ({
    m: r.mistura, ne: r.ne, t: r.tenacidad, e: r.elongacion,
    cv: r.cvm, n2: r.neps_200, str: r.str, sci: r.sci,
    mic: r.mic, uhml: r.uhml, mu: r.maquinas_uster,
  }));
  const prov = proveedores.map(p => ({ m: p.mistura, p: p.produtor, f: p.fardos_consumidos, str: p.str }));
  return sha256(JSON.stringify({ norm, prov }));
}

router.get('/mezcla-lotes', async (req, res) => {
  try {
    const { lotes, ne } = req.query;
    if (!lotes) return res.status(400).json({ error: 'Se requiere parámetro lotes (ej: 107,108,109)' });

    const loteList = [...new Set(
      lotes.split(',').map(l => parseInt(l.trim(), 10)).filter(n => !isNaN(n) && n > 0)
    )];
    if (loteList.length === 0) return res.status(400).json({ error: 'Sin lotes válidos' });

    const sql = `
      WITH hvi_agg AS (
        -- Filtra por LOTE_FIAC (el número que ingresa el usuario), no por MISTURA.
        -- n_fardos = fardos efectivamente consumidos (DT_ENTRADA_PROD no nulo).
        -- n_secuencias = secuencias (SEQ) ingresadas a blendomat con fecha.
        SELECT
          CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER) AS mistura,
          MAX(CAST(NULLIF(regexp_replace("MISTURA", '[^0-9]', '', 'g'), '') AS INTEGER))::text AS mistura_real,
          ROUND(AVG(CASE WHEN "STR"  ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("STR",  ',', '.')::numeric END), 2) AS str,
          ROUND(AVG(CASE WHEN "SCI"  ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("SCI",  ',', '.')::numeric END), 1) AS sci,
          ROUND(AVG(CASE WHEN "MIC"  ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("MIC",  ',', '.')::numeric END), 3) AS mic,
          ROUND(AVG(CASE WHEN "UHML" ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("UHML", ',', '.')::numeric END), 2) AS uhml,
          ROUND(AVG(CASE WHEN "UI"   ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("UI",   ',', '.')::numeric END), 2) AS ui,
          ROUND(AVG(CASE WHEN "ELG"  ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("ELG",  ',', '.')::numeric END), 2) AS elg_fibra,
            (
              SELECT STRING_AGG(grado || ' (' || ROUND((peso_grado / NULLIF(peso_total, 0)) * 100, 1) || '%)', ', ')
              FROM (
                  SELECT 
                      grado, 
                      peso_grado, 
                      SUM(peso_grado) OVER() AS peso_total
                  FROM (
                      SELECT 
                          NULLIF(TRIM(COALESCE(t2."TP", '') || ' ' || COALESCE(t2."CLASSIFIC", '')), '') AS grado,
                          SUM(CAST(REPLACE(REPLACE(COALESCE(t2."PESO", '0'), '.', ''), ',', '.') AS NUMERIC)) AS peso_grado
                      FROM tb_calidad_fibra t2
                      WHERE t2."TIPO_MOV" = 'MIST'
                        AND CAST(NULLIF(regexp_replace(t2."LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER) = CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER)
                        AND NULLIF(TRIM(COALESCE(t2."TP", '') || ' ' || COALESCE(t2."CLASSIFIC", '')), '') IS NOT NULL
                      GROUP BY NULLIF(TRIM(COALESCE(t2."TP", '') || ' ' || COALESCE(t2."CLASSIFIC", '')), '')
                  ) sub
              ) calc
            ) AS clasificacion_argentina,
            (
              SELECT STRING_AGG('Corteza ' || grado || ' (' || ROUND((peso_grado / NULLIF(peso_total, 0)) * 100, 1) || '%)', ', ')
              FROM (
                  SELECT 
                      grado, 
                      peso_grado, 
                      SUM(peso_grado) OVER() AS peso_total
                  FROM (
                      SELECT 
                          NULLIF(TRIM(COALESCE(t2."CORTEZA", '')), '') AS grado,
                          SUM(CAST(REPLACE(REPLACE(COALESCE(t2."PESO", '0'), '.', ''), ',', '.') AS NUMERIC)) AS peso_grado
                      FROM tb_calidad_fibra t2
                      WHERE t2."TIPO_MOV" = 'MIST'
                        AND CAST(NULLIF(regexp_replace(t2."LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER) = CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER)
                        AND NULLIF(TRIM(COALESCE(t2."CORTEZA", '')), '') IS NOT NULL
                      GROUP BY NULLIF(TRIM(COALESCE(t2."CORTEZA", '')), '')
                  ) sub
              ) calc
            ) AS corteza_porcentaje,
          -- Solo fardos con fecha de entrada a producción (consumidos en blendomat)
          SUM(CASE WHEN "DT_ENTRADA_PROD" IS NOT NULL AND "DT_ENTRADA_PROD" <> ''
                   THEN ROUND(REPLACE("QTDE"::text, ',', '.')::numeric)::integer
                   ELSE 0 END) AS n_fardos,
          -- Secuencias distintas que ya ingresaron (DT_ENTRADA_PROD no nulo)
          COUNT(DISTINCT CASE WHEN "DT_ENTRADA_PROD" IS NOT NULL AND "DT_ENTRADA_PROD" <> '' THEN "SEQ" END) AS n_secuencias
        FROM tb_calidad_fibra
        WHERE "TIPO_MOV" = 'MIST'
          AND "LOTE_FIAC" ~ '[0-9]'
          AND CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER) = ANY($1::integer[])
        GROUP BY CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER)
      ),
      carda_kgh_agg AS (
        SELECT
          mistura,
          STRING_AGG(machine_family || ': ' || ROUND(avg_kgh, 1) || ' KG/H (' || muestras || ' muestras)', ', ' ORDER BY machine_family) AS cardas_kgh
        FROM (
          SELECT
            COALESCE(
              (regexp_match(p.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
              (regexp_match(p.lote, '(\\d+)'))[1]
            )::integer AS mistura,
            p.machine_family,
            ROUND(AVG((regexp_match(p.obs, '(\\d+\\.?\\d*)'))[1]::numeric), 1) AS avg_kgh,
            COUNT(*) AS muestras
          FROM tb_uster_carda_par p
          WHERE COALESCE(
              (regexp_match(p.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
              (regexp_match(p.lote, '(\\d+)'))[1]
            ) IS NOT NULL
            AND p.obs ~ '^\\d'
            AND p.machine_family IS NOT NULL
            AND p.machine_family <> ''
          GROUP BY 1, p.machine_family
        ) sub
        WHERE mistura = ANY($1::integer[])
        GROUP BY mistura
      ),
      uster_base AS (
        SELECT
          u.testnr,
          u.nomcount AS ne,
          u.maschnr,
          COALESCE(
            (regexp_match(u.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(u.lote, '(\\d+)'))[1]
          ) AS mistura_str
        FROM tb_uster_par u
        WHERE COALESCE(
            (regexp_match(u.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(u.lote, '(\\d+)'))[1]
          ) IS NOT NULL
          AND ($2::text IS NULL OR u.nomcount = SPLIT_PART($2, '/', 1) OR u.nomcount::text ILIKE $2)
      ),
      uster_lotes AS (
        SELECT testnr, ne, maschnr, mistura_str::integer AS mistura
        FROM uster_base
        WHERE mistura_str ~ '^\\d+$'
          AND mistura_str::integer = ANY($1::integer[])
      ),
      uster_agg AS (
        SELECT
          ul.mistura,
          ul.ne,
          STRING_AGG(DISTINCT TRIM(LEADING '0' FROM ul.maschnr), ', ') AS maquinas_uster,
          ROUND(AVG(t.cvm_percent)::numeric,    2) AS cvm,
          ROUND(AVG(t.h)::numeric,              2) AS vellosidad,
          ROUND(AVG(t.neps_200_km)::numeric,    1) AS neps_200,
          ROUND(AVG(t.delg_minus30_km)::numeric,1) AS thin_30,
          ROUND(AVG(t.delg_minus40_km)::numeric,1) AS thin_40,
          ROUND(AVG(t.delg_minus50_km)::numeric,1) AS thin_50,
          ROUND(AVG(t.grue_35_km)::numeric,     1) AS thick_35,
          ROUND(AVG(t.grue_50_km)::numeric,     1) AS thick_50,
          ROUND(AVG(t.neps_140_km)::numeric,    1) AS neps_140,
          ROUND(AVG(t.neps_280_km)::numeric,    1) AS neps_280,
          COUNT(DISTINCT ul.testnr)               AS n_uster
        FROM uster_lotes ul
        JOIN tb_uster_tbl t ON t.testnr = ul.testnr
        GROUP BY ul.mistura, ul.ne
      ),
      tenso_agg AS (
        SELECT
          ul.mistura,
          ul.ne,
          ROUND(AVG(tt.tenacidad)::numeric,  2) AS tenacidad,
          ROUND(AVG(tt.elongacion)::numeric, 2) AS elongacion,
          ROUND(AVG(tt.fuerza_b)::numeric,   2) AS fuerza_b,
          ROUND(AVG(tt.trabajo)::numeric,    2) AS trabajo_b
        FROM uster_lotes ul
        JOIN tb_tensorapid_par tp ON tp.uster_testnr = ul.testnr
        JOIN tb_tensorapid_tbl tt ON tt.testnr = tp.testnr
        GROUP BY ul.mistura, ul.ne
      )
      SELECT
        h.mistura,
        h.mistura_real,
        h.str,
        h.sci,
        h.mic,
        h.uhml,
        h.ui,
        h.elg_fibra,
          h.clasificacion_argentina,
          h.corteza_porcentaje,
        h.n_fardos,
        h.n_secuencias,
        ua.ne,
        ua.maquinas_uster,
        ua.cvm,
        ua.vellosidad,
        ua.neps_200,
        ua.thin_30,
        ua.thin_40,
        ua.thin_50,
        ua.thick_35,
        ua.thick_50,
        ua.neps_140,
        ua.neps_280,
        ua.n_uster,
        ta.tenacidad,
        ta.elongacion,
        ta.fuerza_b,
        ta.trabajo_b,
        ck.cardas_kgh
      FROM hvi_agg h
      LEFT JOIN uster_agg  ua ON ua.mistura = h.mistura
      LEFT JOIN tenso_agg  ta ON ta.mistura = h.mistura AND ta.ne = ua.ne
      LEFT JOIN carda_kgh_agg ck ON ck.mistura = h.mistura
      ORDER BY h.mistura ASC, ua.ne::numeric ASC NULLS LAST
    `;

    const result = await query(sql, [loteList, ne || null], 'dashboard/mezcla-lotes');

    // ── Contexto Uster Cardas ─────────────────────────────────────────────────
    let cardasCtx = null
    try {
      // Verificar si la tabla existe antes de consultar
      const tblCheck = await query(`SELECT to_regclass('public.tb_uster_carda_par') AS reg`)
      if (tblCheck.rows[0]?.reg) {
        const sqlCardas = `
          WITH ultimo_dia AS (
            SELECT DATE(created_at AT TIME ZONE 'America/Buenos_Aires') AS dia
            FROM tb_uster_carda_par
            ORDER BY created_at DESC
            LIMIT 1
          ),
          ensayos AS (
            SELECT
              p.testnr, p.maschnr, p.machine_family, p.nomcount, p.lote,
              ROUND(AVG(t.cvm_percent)::numeric, 2) AS cvm_avg,
              COUNT(t.id) AS tbl_rows
            FROM tb_uster_carda_par p
            LEFT JOIN tb_uster_carda_tbl t ON t.testnr = p.testnr
            WHERE DATE(p.created_at AT TIME ZONE 'America/Buenos_Aires') = (SELECT dia FROM ultimo_dia)
            GROUP BY p.testnr, p.maschnr, p.machine_family, p.nomcount, p.lote
          ),
          maq_resumen AS (
            SELECT
              maschnr,
              MAX(machine_family) AS machine_family,
              MAX(nomcount) AS nomcount,
              ROUND(AVG(cvm_avg)::numeric, 2) AS cvm_avg,
              COUNT(*) AS ensayos_maq
            FROM ensayos
            GROUP BY maschnr
          )
          SELECT
            TO_CHAR((SELECT dia FROM ultimo_dia), 'DD/MM/YYYY') AS fecha,
            (SELECT COUNT(*) FROM ensayos) AS ensayos,
            COUNT(*) AS maquinas,
            ROUND(AVG(cvm_avg)::numeric, 2) AS cvm_avg_global,
            ROUND(MAX(cvm_avg)::numeric, 2) AS cvm_max,
            ROUND(MIN(cvm_avg)::numeric, 2) AS cvm_min,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'maschnr', maschnr,
                'machine_family', COALESCE(machine_family, 'N/D'),
                'nomcount', nomcount,
                'cvm_avg', cvm_avg,
                'ensayos', ensayos_maq
              ) ORDER BY COALESCE(machine_family, 'N/D'), maschnr::numeric NULLS LAST
            ) AS maquinas_detalle
          FROM maq_resumen
        `
        const resCardas = await query(sqlCardas, [], 'cardas-context')
        const row = resCardas.rows[0]
        if (row?.fecha) {
          const maquinas = (row.maquinas_detalle || [])
          cardasCtx = {
            disponible: true,
            fecha: row.fecha,
            resumen: {
              ensayos: Number(row.ensayos),
              maquinas: Number(row.maquinas),
              cvm_avg: row.cvm_avg_global != null ? Number(row.cvm_avg_global) : null,
              cvm_max: row.cvm_max != null ? Number(row.cvm_max) : null,
              cvm_min: row.cvm_min != null ? Number(row.cvm_min) : null,
            },
            maquinas,
          }
        } else {
          cardasCtx = { disponible: false, motivo: 'No hay ensayos Uster Cardas importados aún.' }
        }
      } else {
        cardasCtx = { disponible: false, motivo: 'Tabla de Uster Cardas pendiente de creación (importar primer ensayo).' }
      }
    } catch (cardaErr) {
      console.warn('cardas-context error (non-blocking):', cardaErr.message)
      cardasCtx = { disponible: false, motivo: `Error al cargar contexto: ${cardaErr.message}` }
    }

    // ── Análisis por proveedor (PRODUTOR) ────────────────────────────────────
    const sqlProv = `
      SELECT
        CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER) AS mistura,
        "PRODUTOR" AS produtor,
        ROUND(AVG(CASE WHEN "STR"  ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("STR",  ',', '.')::numeric END), 2) AS str,
        ROUND(AVG(CASE WHEN "SCI"  ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("SCI",  ',', '.')::numeric END), 1) AS sci,
        ROUND(AVG(CASE WHEN "MIC"  ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("MIC",  ',', '.')::numeric END), 3) AS mic,
        ROUND(AVG(CASE WHEN "UHML" ~ '^[0-9][0-9,\\.]*$' THEN REPLACE("UHML", ',', '.')::numeric END), 2) AS uhml,
        SUM(CASE WHEN "DT_ENTRADA_PROD" IS NOT NULL AND "DT_ENTRADA_PROD" <> ''
                 THEN ROUND(REPLACE("QTDE"::text, ',', '.')::numeric)::integer
                 ELSE 0 END) AS fardos_consumidos,
        COUNT(DISTINCT CASE WHEN "DT_ENTRADA_PROD" IS NOT NULL AND "DT_ENTRADA_PROD" <> '' THEN "SEQ" END) AS secuencias
      FROM tb_calidad_fibra
      WHERE "TIPO_MOV" = 'MIST'
        AND "LOTE_FIAC" ~ '[0-9]'
        AND CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER) = ANY($1::integer[])
      GROUP BY
        CAST(NULLIF(regexp_replace("LOTE_FIAC", '[^0-9]', '', 'g'), '') AS INTEGER),
        "PRODUTOR"
      ORDER BY mistura, fardos_consumidos DESC
    `;
    const provResult = await query(sqlProv, [loteList], 'dashboard/mezcla-lotes/proveedores');
    res.json({ success: true, rows: result.rows, proveedores: provResult.rows, lotes: loteList, cardas: cardasCtx });
  } catch (err) {
    console.error('Error /api/dashboard/mezcla-lotes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/narrativa-lotes', async (req, res) => {
  try {
    const { rows, loteActual, model: modelReq, modo, proveedores, formato, fecha, forceRefresh } = req.body;
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'Sin datos para analizar' });

    await ensureCacheTable();

    // ─── Cache lookup (ahorro de tokens) ───
    const lotesKey = [...new Set(rows.map(r => Number(r.mistura)))].sort((a, b) => a - b).join(',');
    const formatoKey = formato || 'actual';
    const modeloKey = modelReq || 'gemini-2.5-flash';
    const dataHash = hashRowsPayload(rows, proveedores || []);
    const cacheKey = buildCacheKey({ lotes: lotesKey, fecha, formato: formatoKey, modelo: modeloKey, dataHash });

    if (modo !== 'local' && !forceRefresh) {
      try {
        const hit = await pool.query(
          'SELECT narrativa, json_analisis_ia, modelo_usado FROM tb_narrativa_cache WHERE cache_key = $1',
          [cacheKey]
        );
        if (hit.rows.length) {
          await pool.query(
            'UPDATE tb_narrativa_cache SET hits = hits + 1, last_hit_at = NOW() WHERE cache_key = $1',
            [cacheKey]
          );
          const cached = hit.rows[0];
          console.log(`✓ Caché HIT narrativa lotes=${lotesKey} fecha=${fecha} formato=${formatoKey}`);
          return res.json({
            success: true,
            narrativa: cached.narrativa,
            fuente: 'cache',
            modelo: cached.modelo_usado,
            jsonAnalisisIA: cached.json_analisis_ia,
            ...buildNarrativaStructuredFields(cached.narrativa),
          });
        }
      } catch (e) {
        console.warn('Cache lookup falló (continuamos):', e.message);
      }
    }

    // ── Query producción OE — trazabilidad completa con KPIs de eficiencia ───
    const loteNums = [...new Set(rows.map(r => Number(r.mistura)))].filter(n => !isNaN(n) && n > 0);
    let oeData = [];
    try {
      const oeResult = await pool.query(`
        SELECT
          TO_DATE(data_producao, 'DD/MM/YYYY')                                                          AS fecha_oe,
          TO_CHAR(TO_DATE(data_producao, 'DD/MM/YYYY'), 'YYYY-MM-DD')                                  AS fecha_oe_key,
          TRIM("LOTE PRODUC")::bigint                                                                  AS lote,
          maquina,
          LADO                                                                                          AS lado,
          item,
          "DESC ITEM"                                                                                   AS desc_item,
          TRIM("TÍTULO")                                                                                AS titulo,
          -- Producción e eficiencia
          ROUND(AVG(CASE WHEN "PROD INFORMADA" ~ '^[0-9]' THEN REPLACE("PROD INFORMADA", ',', '.')::numeric END)::numeric, 1) AS prod_informada_avg,
          ROUND(AVG(CASE WHEN "EFIC INFORMADA" ~ '^[0-9]' THEN REPLACE("EFIC INFORMADA", ',', '.')::numeric END)::numeric, 1) AS efic_informada_avg,
          ROUND(AVG(CASE WHEN "EFIC CALCULADA" ~ '^[0-9]' THEN REPLACE("EFIC CALCULADA", ',', '.')::numeric END)::numeric, 1) AS efic_avg,
          ROUND(AVG(CASE WHEN rpm::text ~ '^[0-9]'        THEN rpm::numeric END)::numeric, 0)          AS rpm_avg,
          ROUND(AVG(CASE WHEN "RPM CARD"::text ~ '^[0-9]' THEN "RPM CARD"::numeric END)::numeric, 0)  AS rpm_card_avg,
          -- Cortes naturales y mecánicos
          SUM(CASE WHEN "CORT NAT" ~ '^[0-9]' THEN REPLACE("CORT NAT", ',', '.')::numeric ELSE 0 END) AS nat_total,
          ROUND(
            COALESCE(AVG(CASE WHEN "% ROB 01" ~ '^[0-9]' THEN REPLACE("% ROB 01", ',', '.')::numeric END), 0) +
            COALESCE(AVG(CASE WHEN "% ROB 02" ~ '^[0-9]' THEN REPLACE("% ROB 02", ',', '.')::numeric END), 0) +
            COALESCE(AVG(CASE WHEN "% ROB 03" ~ '^[0-9]' THEN REPLACE("% ROB 03", ',', '.')::numeric END), 0)
          , 2)                                                                                          AS rob_mecanicos_pct,
          -- Cortes de purga por tipo
          SUM(CASE WHEN n        ~ '^[0-9]' THEN REPLACE(n,        ',', '.')::numeric ELSE 0 END)     AS n_total,
          SUM(CASE WHEN s        ~ '^[0-9]' THEN REPLACE(s,        ',', '.')::numeric ELSE 0 END)     AS s_total,
          SUM(CASE WHEN l        ~ '^[0-9]' THEN REPLACE(l,        ',', '.')::numeric ELSE 0 END)     AS l_total,
          SUM(CASE WHEN t        ~ '^[0-9]' THEN REPLACE(t,        ',', '.')::numeric ELSE 0 END)     AS t_total,
          SUM(CASE WHEN mo       ~ '^[0-9]' THEN REPLACE(mo,       ',', '.')::numeric ELSE 0 END)     AS mo_total,
          SUM(CASE WHEN "JP (P+)" ~ '^[0-9]' THEN REPLACE("JP (P+)", ',', '.')::numeric ELSE 0 END)    AS jp_total,
          SUM(CASE WHEN "JM (P-)" ~ '^[0-9]' THEN REPLACE("JM (P-)", ',', '.')::numeric ELSE 0 END)    AS jm_total,
          COUNT(*)                                                                                      AS registros
        FROM tb_produccion_oe
        WHERE TRIM("LOTE PRODUC") ~ '^[0-9]+$'
          AND TRIM("LOTE PRODUC")::bigint = ANY(\$1)
        GROUP BY TO_DATE(data_producao, 'DD/MM/YYYY'), TRIM("LOTE PRODUC")::bigint, maquina, LADO, item, "DESC ITEM", TRIM("TÍTULO")
        ORDER BY TO_DATE(data_producao, 'DD/MM/YYYY') DESC NULLS LAST, TRIM("LOTE PRODUC")::bigint, maquina, LADO
      `, [loteNums]);
      oeData = oeResult.rows;
    } catch (oeErr) {
      console.warn('OE data query failed (non-fatal):', oeErr.message);
    }

    // ── Query pasador/estiraje desde tb_uster_par (por lote + nomcount) ──────
    let usterParData = [];
    try {
      const usterParResult = await pool.query(`
        SELECT
          COALESCE(
            (regexp_match(lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(lote, '(\\d+)'))[1]
          )::integer                                    AS lote_num,
          nomcount                                      AS ne,
          MAX(UPPER(TRIM(COALESCE(pasador::text, ''))))  AS pasador,
          ROUND(AVG(
            CASE WHEN estiraje::text ~ '^[0-9]' THEN estiraje::numeric END
          )::numeric, 2)                                AS estiraje_avg
        FROM tb_uster_par
        WHERE COALESCE(
            (regexp_match(lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(lote, '(\\d+)'))[1]
          ) IS NOT NULL
          AND COALESCE(
            (regexp_match(lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(lote, '(\\d+)'))[1]
          )::integer = ANY(\$1)
        GROUP BY 1, 2
      `, [loteNums]);
      usterParData = usterParResult.rows;
    } catch (upErr) {
      console.warn('Uster PAR pasador/estiraje query failed (non-fatal):', upErr.message);
    }

    // ── Query calidad Uster (CvM%) por lote + título (Ne) ──────────────────
    let usterQualData = [];
    try {
      const usterQualResult = await pool.query(`
        SELECT
          COALESCE(
            (regexp_match(p.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(p.lote, '(\\d+)'))[1]
          )::integer                                     AS lote_num,
          p.nomcount                                     AS ne,
          ROUND(AVG(t.cvm_percent)::numeric, 2)          AS cvm_uster_avg
        FROM tb_uster_par p
        JOIN tb_uster_tbl t ON t.testnr = p.testnr
        WHERE COALESCE(
            (regexp_match(p.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(p.lote, '(\\d+)'))[1]
          ) IS NOT NULL
          AND COALESCE(
            (regexp_match(p.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(p.lote, '(\\d+)'))[1]
          )::integer = ANY(\$1)
        GROUP BY 1, 2
      `, [loteNums]);
      usterQualData = usterQualResult.rows;
    } catch (uqErr) {
      console.warn('Uster calidad CvM query failed (non-fatal):', uqErr.message);
    }

    // ── Query preparación Cardas/Manuar por fecha de producción OE ──────────
    let cardasByDateData = [];
    try {
      const cardasByDateResult = await pool.query(`
        SELECT
          TO_DATE(SPLIT_PART(data, ' ', 1), 'DD/MM/YY')                                            AS fecha_carda,
          TO_CHAR(TO_DATE(SPLIT_PART(data, ' ', 1), 'DD/MM/YY'), 'YYYY-MM-DD')                      AS fecha_carda_key,
          ROUND(AVG(CASE WHEN rpm ~ '^[0-9]' THEN REPLACE(rpm, ',', '.')::numeric END)::numeric, 0) AS rpm_carda_avg,
          STRING_AGG(DISTINCT NULLIF(TRIM(titulo), ''), ', ' ORDER BY NULLIF(TRIM(titulo), ''))      AS titulos_carda
        FROM tb_produccion_carda
        WHERE data IS NOT NULL
          AND TO_DATE(SPLIT_PART(data, ' ', 1), 'DD/MM/YY') = ANY(
            SELECT DISTINCT TO_DATE(data_producao, 'DD/MM/YYYY')
            FROM tb_produccion_oe
            WHERE TRIM("LOTE PRODUC") ~ '^[0-9]+$'
              AND TRIM("LOTE PRODUC")::bigint = ANY(\$1)
          )
        GROUP BY TO_DATE(SPLIT_PART(data, ' ', 1), 'DD/MM/YY')
      `, [loteNums]);
      cardasByDateData = cardasByDateResult.rows;
    } catch (cardaErr) {
      console.warn('Cardas by date query failed (non-fatal):', cardaErr.message);
    }

    const neComparable = (v) => {
      const num = Number(String(v ?? '').replace(',', '.').trim());
      return Number.isFinite(num) ? num : null;
    };
    const isSameNe = (a, b) => {
      const na = neComparable(a);
      const nb = neComparable(b);
      if (na == null || nb == null) return false;
      return Math.abs(na - nb) <= 0.05;
    };

    // Agregar pasador/estiraje a cada fila de oeData por lote + titulo (ne)
    for (const row of oeData) {
      const titulo = String(row.titulo || '').replace(/\/.*/, '').trim(); // "10/1" → "10"
      const up = usterParData.find(u =>
        Number(u.lote_num) === Number(row.lote) &&
        isSameNe(u.ne, titulo)
      );
      const uq = usterQualData.find(u =>
        Number(u.lote_num) === Number(row.lote) &&
        isSameNe(u.ne, titulo)
      );
      const carda = cardasByDateData.find(c => {
        return row.fecha_oe_key && c.fecha_carda_key && row.fecha_oe_key === c.fecha_carda_key;
      });

      const pasadorRaw = String(up?.pasador ?? '').trim();
      const pasadorNorm = pasadorRaw
        ? (/^s/i.test(pasadorRaw) ? 'SI' : /^n/i.test(pasadorRaw) ? 'NO' : pasadorRaw.toUpperCase())
        : null;

      row.pasador = pasadorNorm;
      row.estiraje_avg = up?.estiraje_avg ?? null;
      row.cvm_uster = uq?.cvm_uster_avg ?? null;
      row.rpm_carda_preparacion = carda?.rpm_carda_avg ?? null;
      row.titulo_carda_preparacion = carda?.titulos_carda ?? null;
    }

    // JSON estructurado para análisis IA por fila de hilo (OE + Uster + Cardas)
    const jsonAnalisisIA = {
      version: 'trazabilidad-hilo-v1',
      lotes: loteNums,
      generado_en: new Date().toISOString(),
      filas_hilo: oeData.map(r => ({
        fecha_produccion: r.fecha_oe,
        maq_oe: r.maquina,
        lado: r.lado,
        lote: r.lote,
        titulo: r.titulo,
        eficiencia_informada_pct: r.efic_informada_avg,
        eficiencia_calculada_pct: r.efic_avg,
        prod_informada_kg_h: r.prod_informada_avg,
        rpm_oe: r.rpm_avg,
        cortes_naturales: r.nat_total,
        cortes_mecanicos_pct_rob: r.rob_mecanicos_pct,
        cvm_uster: r.cvm_uster,
        pasador: r.pasador,
        estiraje: r.estiraje_avg,
        cardas_rpm: r.rpm_carda_preparacion,
        cardas_titulo: r.titulo_carda_preparacion,
        item_oe: r.item,
        desc_item_oe: r.desc_item
      }))
    };

    // Si piden explícitamente local, o no hay API key → generación local directa
    if (modo === 'local' || !process.env.GOOGLE_API_KEY) {
      const narrativa = generarNarrativaLocal(rows, loteActual, proveedores || [], oeData);
      return res.json({ success: true, narrativa, fuente: 'local', jsonAnalisisIA, ...buildNarrativaStructuredFields(narrativa) });
    }

    const lotesSorted = [...new Set(rows.map(r => Number(r.mistura)))].sort((a, b) => a - b);
    const actual = loteActual ? Number(loteActual) : Math.max(...lotesSorted);
    const refs   = lotesSorted.filter(l => l !== actual);

    const resumenLotes = lotesSorted.map(mistura => {
      const filas = rows.filter(r => Number(r.mistura) === mistura);
      const hvi = filas[0] || {};
      const hilos = filas
        .filter(r => r.ne != null)
        .map(r => `   • Ne ${r.ne}/1${r.maquinas_uster ? ` (Máq. ${r.maquinas_uster})` : ''}: Tenacidad=${r.tenacidad ?? '-'} cN/tex | Elongación=${r.elongacion ?? '-'}% | CVm%=${r.cvm ?? '-'} | Neps+200%=${r.neps_200 ?? '-'}/km`)
        .join('\n');
      const misturaLabel = hvi.mistura_real ? `${mistura} (Mistura ${hvi.mistura_real})` : `${mistura}`;
      // Proveedores del lote
      const provLote = (proveedores || []).filter(p => Number(p.mistura) === mistura);
      const totalFardosProv = provLote.reduce((s, p) => s + (Number(p.fardos_consumidos) || 0), 0);
      const provStr = provLote.length
        ? '\n  Proveedores (' + totalFardosProv + ' fardos totales):\n' +
          '  | Proveedor | Fardos | % | STR | SCI | MIC | UHML |\n' +
          '  |---|---:|---:|---:|---:|---:|---:|\n' +
          provLote.map(p => {
            const pct = totalFardosProv > 0 ? ((Number(p.fardos_consumidos) / totalFardosProv) * 100).toFixed(1) : '–';
            return `  | ${p.produtor} | ${p.fardos_consumidos} | ${pct}% | ${p.str ?? '—'} | ${p.sci ?? '—'} | ${p.mic ?? '—'} | ${p.uhml ?? '—'} |`;
          }).join('\n')
        : '';
      return `LOTE_FIAC ${misturaLabel}${mistura === actual ? ' [ACTUAL]' : ' [REFERENCIA]'}:
  HVI: STR=${hvi.str ?? '-'} g/tex | SCI=${hvi.sci ?? '-'} | MIC=${hvi.mic ?? '-'} | UHML=${hvi.uhml ?? '-'} mm | Grado=${hvi.clasificacion_argentina || 'N/D'} | Corteza=${hvi.corteza_porcentaje || 'N/D'} | Cardas=${hvi.cardas_kgh || 'N/D'} | ${hvi.n_fardos ?? '-'} fardos consumidos | ${hvi.n_secuencias ?? '-'} secuencias blendomat
  Hilo:\n${hilos || '   (sin datos)'}${provStr}`;
    }).join('\n\n');

    const modelName = modelReq || 'gemini-2.5-flash';
    const FALLBACK_MODELS = [modelName, 'gemini-2.0-flash', 'gemini-1.5-flash'];
    const genAI  = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    const prompt = `Actuá como **Auditor de Calidad Textil** y **Experto en Hilandería Open End** de denim de alta velocidad.

DATOS COMPARATIVOS:
${resumenLotes}${formatOEParaPrompt(oeData, lotesSorted) ? '\n\n' + formatOEParaPrompt(oeData, lotesSorted) : ''}

JSON ESTRUCTURADO DE TRAZABILIDAD HILO (usar este bloque como fuente principal para correlacionar Proceso+Calidad):
${JSON.stringify(jsonAnalisisIA, null, 2)}

UMBRALES: Tenacidad hilo >16.0=APTO, 14.5-16.0=PRECAUCIÓN, <14.5=CRÍTICO | Elongación <7.5%=RIESGO URDIDORA | Neps+200% >700=RIESGO ÍNDIGO | CVm% >13=IRREGULAR | STR fibra >27=ÓPTIMO

MATRIZ DE REQUISITOS MÍNIMOS POR TÍTULO:
Ne 7 (Trama):  Tenac≥14.0, CVm≤13.5%, Neps≤700/km    → solo TELAR
Ne 9 (Trama):  Tenac≥14.5, CVm≤13.0%, Neps≤600/km    → solo TELAR
Ne 10 (Urdimbre): Tenac≥16.0, Elong≥8.0%, CVm≤12.0%, Neps≤500/km → URDIDORA→ÍNDIGO→TELAR
Ne 12.5 (Urdimbre): Tenac≥16.5, Elong≥8.0%, CVm≤11.5%, Neps≤450/km → URDIDORA→ÍNDIGO→TELAR
Ne 14 (Urdimbre): Tenac≥17.0, Elong≥8.5%, CVm≤11.0%, Neps≤400/km → URDIDORA→ÍNDIGO→TELAR

REGLAS DE AUDITORÍA:
- Si es Urdimbre (Ne≥10): ser implacable con Elongación y CVm% (pasa por Urdidora + Índigo).
- Si es Trama (Ne≤9): priorizar estabilidad de masa (CVm%) para evitar barreado.
- Si MIC > 4.7: advertir "cargado al grueso". Si STR supera la matriz por mucho: decir "va sobrado de fuerza".
- Usar vocabulario natural de hilandería.
- Si **tenacidad o elongación vienen como null**, NO marques el lote como Rechazado por eso solo. Aclará: "Datos de Tensorapid pendientes — ensayo tarda 24 h por humectación." y mantener PRECAUCIÓN hasta que lleguen.

=== FORMATO DE SALIDA (Markdown profesional) ===
Devolvé **Markdown bien estructurado**: usá encabezados (\`#\`, \`##\`, \`###\`), listas con \`-\`, **negritas** para destacar valores y veredictos, tablas Markdown cuando compares lotes, y emojis al inicio de cada sección. NO escribas HTML. NO envuelvas en \`\`\`markdown.

Usá EXACTAMENTE este esqueleto de secciones (mantené los títulos con emoji al inicio):

# 📋 Informe de Desempeño: Lote FIAC ${actual} vs ${refs.join(' / ') || 'sin referencia'}
Análisis comparativo Fibra ↔ Hilo

## 🚦 Resumen Ejecutivo
_Veredicto en 2 oraciones citando el estado operativo (APROBADO / PRECAUCIÓN / CRÍTICO / DATOS PENDIENTES)._

## 📊 Comparativa Consolidada
_Tabla Markdown con columnas: Métrica | Lote ref | Lote actual | Δ% | Impacto. Incluí STR, Tenacidad, CVm%, Neps+200%, Elongación._

## 📦 Proveedores Clave
Para el Lote FIAC {actual} ({totalFardos} fardos):

OBLIGATORIO: Renderizá los datos de proveedores **EXACTAMENTE** como tabla Markdown con esta estructura (usá los datos reales del bloque "Proveedores" del contexto). NO uses listas, NO uses bullets, NO uses líneas con "STR=... SCI=...". SOLO esta tabla:

| Proveedor | Fardos | % | STR (g/tex) | SCI | MIC | UHML (mm) |
|---|---:|---:|---:|---:|---:|---:|
| NOMBRE_PROV_1 | 247 | 95.4% | 27.23 | 106.9 | 4.310 | 26.37 |
| NOMBRE_PROV_2 | 6 | 2.3% | 26.10 | 96.0 | 4.330 | 25.82 |

(reemplazá las filas con los proveedores reales del lote).

### Observaciones
- 🏆 Mejor STR: ...
- 🏆 Mejor SCI: ...
- 🏆 MIC más en rango (3.5–4.9): ...
- 🏆 UHML más largo: ...
- ⚠️ Peor en cada variable con impacto práctico.

## 🧵 Detalle Técnico por Ne
_Para cada Ne (## Ne X — [Aplicación]): proceso por etapa con ✅/⚠️, estado (Aprobado / Precaución / Rechazado), desvíos. Indicá Pasador (SÍ/NO) y Estiraje cuando estén. Cerrá con \`> 💬\` comentario de planta._

## 🔗 Correlación con Producción OE
_Por cada máquina: Título (Ne), Pasador, Estiraje. Eficiencia EficInf vs EficCalc, RPM OE y RPM Carda. Cortes Naturales ref→actual con %. %ROB mecánicos. Cortes de purga (N/S/L/T/MO/JP/JM) identificando dominante y causa probable._

## 🛠 Plan de Acción Priorizado (24 h)
- ...
- ...
- ...

## 🚀 Estado Operativo
**APROBADO PARA CONTINUIDAD** / **PRECAUCIÓN — REVISAR** / **CRÍTICO — DETENER** / **DATOS PENDIENTES**
_Oración de cierre._

Límite: 700 palabras. Cuantificá cambios con %.`;

    // Intentar con cada modelo en orden; si hay 503/sobrecarga, pasar al siguiente
    let lastGeminiErr = null;
    for (const mName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: mName });
        const result = await model.generateContent(prompt);
        const narrativaCompleta = result.response.text();
        const modelUsado = mName !== modelName ? mName : undefined;

        // ── Tokens y costo ──
        const usage = result.response.usageMetadata || {};
        const tokensEntrada  = usage.promptTokenCount     || 0;
        const tokensSalida   = usage.candidatesTokenCount || 0;
        const tokensTotal    = usage.totalTokenCount      || (tokensEntrada + tokensSalida);
        // Precios Gemini 2.5 Flash (contexto ≤200k): $0.15/1M entrada, $0.60/1M salida
        // Gemini 2.0 Flash: $0.10/1M entrada, $0.40/1M salida
        // Gemini 1.5 Flash: $0.075/1M entrada, $0.30/1M salida
        const PRECIOS = {
          'gemini-2.5-flash': { in: 0.15, out: 0.60 },
          'gemini-2.0-flash': { in: 0.10, out: 0.40 },
          'gemini-1.5-flash': { in: 0.075, out: 0.30 },
        };
        const p = PRECIOS[mName] || { in: 0.15, out: 0.60 };
        const costoUSD = (tokensEntrada / 1_000_000) * p.in + (tokensSalida / 1_000_000) * p.out;
        const tokenInfo = { tokensEntrada, tokensSalida, tokensTotal, costoUSD: +costoUSD.toFixed(6) };

        // Persistir en caché (best-effort)
        try {
          await pool.query(
            `INSERT INTO tb_narrativa_cache (cache_key, lotes, fecha, formato, modelo, data_hash, narrativa, json_analisis_ia, modelo_usado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (cache_key) DO UPDATE SET narrativa=EXCLUDED.narrativa, json_analisis_ia=EXCLUDED.json_analisis_ia, modelo_usado=EXCLUDED.modelo_usado, last_hit_at=NOW()`,
            [cacheKey, lotesKey, fecha || null, formatoKey, modeloKey, dataHash, narrativaCompleta, jsonAnalisisIA, mName]
          );
        } catch (e) {
          console.warn('No pude guardar en cache:', e.message);
        }
        return res.json({ success: true, narrativa: narrativaCompleta, fuente: 'gemini', modelo: mName, jsonAnalisisIA, tokenInfo, ...(modelUsado && { avisoModelo: `Gemini respondió con modelo alternativo: ${mName}` }), ...buildNarrativaStructuredFields(narrativaCompleta) });
      } catch (geminiErr) {
        const msg = geminiErr.message || String(geminiErr);
        const esTransient = /503|502|overloaded|high demand|unavailable|try again/i.test(msg);
        console.warn(`Gemini [${mName}] falló: ${msg.slice(0, 120)}`);
        lastGeminiErr = msg;
        if (!esTransient) break; // Error no transitorio (quota, auth): no reintenta
        // 503 transitorio: espera 1s antes de probar el siguiente modelo
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Todos los modelos fallaron → fallback local
    const geminiErrMsg = lastGeminiErr || 'Error desconocido';
    const narrativa = generarNarrativaLocal(rows, loteActual, proveedores || [], oeData);
    const esQuota = /quota|429|resource.exhausted/i.test(geminiErrMsg);
    const aviso = esQuota
      ? 'Gemini no disponible – límite de cuota alcanzado. Informe generado localmente.'
      : `Gemini no disponible – informe generado localmente. (${geminiErrMsg.slice(0, 120)})`;
    return res.json({ success: true, narrativa, fuente: 'local', aviso, geminiErrRaw: geminiErrMsg.slice(0, 200), jsonAnalisisIA, ...buildNarrativaStructuredFields(narrativa) });

  } catch (err) {
    console.error('Error narrativa-lotes:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;