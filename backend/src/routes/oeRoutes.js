import express from 'express';
import { query } from '../db/pg.js';

const router = express.Router();

function sqlParseDate(colIdent) {
  return `(
    CASE
      WHEN ${colIdent} IS NULL OR ${colIdent} = '' THEN NULL
      WHEN split_part(btrim(${colIdent}), ' ', 1) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' THEN to_date(split_part(btrim(${colIdent}), ' ', 1), 'DD/MM/YYYY')
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

function sqlParseMixedLocalTimestamp(colIdent) {
  return `(
    CASE
      WHEN ${colIdent} IS NULL OR btrim(${colIdent}) = '' THEN NULL
      WHEN btrim(${colIdent}) ~ '^[0-9]{13}$' THEN timezone('America/Argentina/Buenos_Aires', to_timestamp((btrim(${colIdent})::bigint / 1000.0)))
      WHEN btrim(${colIdent}) ~ '^[0-9]{10}$' THEN timezone('America/Argentina/Buenos_Aires', to_timestamp(btrim(${colIdent})::bigint))
      WHEN btrim(${colIdent}) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4} [0-9]{1,2}:[0-5][0-9](:[0-5][0-9])?$' THEN to_timestamp(
        CASE WHEN length(split_part(btrim(${colIdent}), ' ', 2)) = 5 THEN btrim(${colIdent}) || ':00' ELSE btrim(${colIdent}) END,
        'FMDD/FMMM/YYYY FMHH24:MI:SS'
      )
      WHEN btrim(${colIdent}) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2} [0-9]{1,2}:[0-5][0-9](:[0-5][0-9])?$' THEN to_timestamp(
        CASE WHEN length(split_part(btrim(${colIdent}), ' ', 2)) = 5 THEN btrim(${colIdent}) || ':00' ELSE btrim(${colIdent}) END,
        'FMDD/FMMM/YY FMHH24:MI:SS'
      )
      WHEN btrim(${colIdent}) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-2][0-9]:[0-5][0-9](:[0-5][0-9])?$' THEN to_timestamp(
        CASE WHEN length(split_part(btrim(${colIdent}), ' ', 2)) = 5 THEN btrim(${colIdent}) || ':00' ELSE btrim(${colIdent}) END,
        'YYYY-MM-DD HH24:MI:SS'
      )
      ELSE NULL
    END
  )`;
}

function parseInputDate(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/');
    const dd = day.padStart(2, '0');
    const mm = month.padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  return null;
}

function quoteIdent(ident) {
  return `"${String(ident).replace(/"/g, '""')}"`;
}

function findColumn(columnSet, candidates) {
  for (const candidate of candidates) {
    if (columnSet.has(candidate)) return candidate;
  }
  const lowered = new Map([...columnSet].map((name) => [name.toLowerCase(), name]));
  for (const candidate of candidates) {
    const found = lowered.get(String(candidate).toLowerCase());
    if (found) return found;
  }
  return null;
}

function formatSide(lado) {
  if (lado === 'A') return 'LP';
  if (lado === 'B') return 'LI';
  return lado || '-';
}

function normalizePassador(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes('si') || raw === 's') return 'si';
  if (raw.includes('no') || raw === 'n') return 'no';
  return null;
}

function buildAlerts(row) {
  const alerts = [];
  const push = (severity, code, message) => alerts.push({ severity, code, message });

  const neNum = Number.parseFloat(row.ne);
  const robTotal = [row.rob_01, row.rob_02, row.rob_03].reduce((sum, value) => sum + (Number(value) || 0), 0);

  if (row.efic_informada != null) {
    if (Number(row.efic_informada) < 85) push('alta', 'eficiencia', `Eficiencia informada ${Number(row.efic_informada).toFixed(1)}%.`);
    else if (Number(row.efic_informada) < 90) push('media', 'eficiencia', `Eficiencia informada ${Number(row.efic_informada).toFixed(1)}% por debajo de ventana estable.`);
  }

  if (row.cort_nat != null) {
    if (Number(row.cort_nat) > 250) push('alta', 'corte_nat', `Corte natural ${Number(row.cort_nat).toFixed(1)} elevado.`);
    else if (Number(row.cort_nat) > 150) push('media', 'corte_nat', `Corte natural ${Number(row.cort_nat).toFixed(1)} en vigilancia.`);
  }

  if (robTotal > 4) push('alta', 'robos', `Suma de robos ${robTotal.toFixed(1)}%.`);
  else if (robTotal > 2) push('media', 'robos', `Robos ${robTotal.toFixed(1)}% en seguimiento.`);

  if (row.cvm != null) {
    if (Number(row.cvm) > 13) push('alta', 'cvm', `CVm ${Number(row.cvm).toFixed(2)}%.`);
    else if (Number(row.cvm) > 12) push('media', 'cvm', `CVm ${Number(row.cvm).toFixed(2)}% cerca de límite.`);
  }

  if (row.neps_200 != null) {
    if (Number(row.neps_200) > 700) push('alta', 'neps_200', `Neps +200 ${Number(row.neps_200).toFixed(0)}/km.`);
    else if (Number(row.neps_200) > 500) push('media', 'neps_200', `Neps +200 ${Number(row.neps_200).toFixed(0)}/km por encima de ventana.`);
  }

  if (row.tenacidad != null) {
    if (Number(row.tenacidad) < 14.5) push('alta', 'tenacidad', `Tenacidad ${Number(row.tenacidad).toFixed(2)} cN/tex.`);
    else if (neNum >= 10 && Number(row.tenacidad) < 16) push('media', 'tenacidad', `Tenacidad ${Number(row.tenacidad).toFixed(2)} cN/tex para urdimbre.`);
  }

  if (row.elongacion != null && Number(row.elongacion) < 6) {
    push('media', 'elongacion', `Elongación ${Number(row.elongacion).toFixed(2)}%.`);
  }

  if (row.ensayos_uster == null) push('media', 'sin_uster', 'Sin ensayo Uster asociado para el lote/título en la fecha.');
  if (row.tenacidad == null && row.elongacion == null) push('media', 'sin_tensorapid', 'Sin ensayo Tensorapid asociado para el lote/título en la fecha.');

  return alerts;
}

function buildRecommendation(row, alerts) {
  const parts = [];
  const has = (code) => alerts.some((alert) => alert.code === code);

  if (has('eficiencia') || has('corte_nat') || has('robos')) {
    parts.push('Revisar limpieza de rotor, apertura y estabilidad de alimentación en la OE.');
  }
  if (has('cvm') || has('neps_200')) {
    parts.push('Controlar uniformidad de estiraje y priorizar seguimiento de cardas del día.');
  }
  if (has('tenacidad') || has('elongacion')) {
    parts.push('Bajar exigencia de velocidad/tensión hasta confirmar mezcla y condición mecánica del hilo.');
  }
  if (!parts.length) {
    return 'Sin alertas críticas en esta primera lectura.';
  }

  return parts.join(' ');
}

router.get('/trazabilidad', async (req, res) => {
  try {
    const fecha = parseInputDate(req.query.fecha);
    const lote = req.query.lote ? String(req.query.lote).trim() : null;
    const ne = req.query.ne ? String(req.query.ne).trim() : null;

    if (!fecha) {
      return res.status(400).json({ error: 'Se requiere fecha con formato YYYY-MM-DD o DD/MM/YYYY.' });
    }

    const oeColsResult = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tb_produccion_oe'`
    );
    const oeColSet = new Set(oeColsResult.rows.map((row) => row.column_name));

    const cData = findColumn(oeColSet, ['DATA_PRODUCAO', 'data_producao', 'DATA PRODUCAO', 'data']);
    const cLote = findColumn(oeColSet, ['LOTE PRODUC', 'lote produc', 'lote_produc', 'lote']);
    const cTitulo = findColumn(oeColSet, ['TÍTULO', 'titulo', 'TITULO']);
    const cMaquina = findColumn(oeColSet, ['MAQUINA', 'maquina']);
    const cLado = findColumn(oeColSet, ['LADO', 'lado']);
    const cItem = findColumn(oeColSet, ['ITEM', 'item']);
    const cDescItem = findColumn(oeColSet, ['DESC ITEM', 'desc item', 'desc_item']);
    const cTurno = findColumn(oeColSet, ['TURNO', 'turno', 't']);
    const cRpm = findColumn(oeColSet, ['RPM', 'rpm']);
    const cProdKgHr = findColumn(oeColSet, ['PROD KG/HR', 'prod kg/hr', 'prod_kg_hr']);
    const cProdInformada = findColumn(oeColSet, ['PROD INFORMADA', 'PROD INFORM', 'prod informada', 'prod inform', 'prod_informada']);
    const cEficCalculada = findColumn(oeColSet, ['EFIC CALCULADA', 'EFIC CALC', 'efic calculada', 'efic calc', 'efic_calculada']);
    const cEficInformada = findColumn(oeColSet, ['EFIC INFORMADA', 'EFIC INFOR', 'efic informada', 'efic infor', 'efic_informada']);
    const cCortNat = findColumn(oeColSet, ['CORT NAT', 'cort nat', 'cort_nat']);
    const cRob01 = findColumn(oeColSet, ['% ROB 01', 'rob 01', 'rob_01']);
    const cRob02 = findColumn(oeColSet, ['% ROB 02', 'rob 02', 'rob_02']);
    const cRob03 = findColumn(oeColSet, ['% ROB 03', 'rob 03', 'rob_03']);

    if (!cData || !cLote || !cTitulo) {
      return res.status(500).json({
        error: 'No se pudieron resolver columnas mínimas de tb_produccion_oe (fecha/lote/título).',
        detalle: {
          fecha: cData,
          lote: cLote,
          titulo: cTitulo
        }
      });
    }

    const col = (name) => (name ? `t.${quoteIdent(name)}` : 'NULL');

    const exprData = col(cData);
    const exprLote = col(cLote);
    const exprTitulo = col(cTitulo);
    const exprMaquina = col(cMaquina);
    const exprLado = col(cLado);
    const exprItem = col(cItem);
    const exprDescItem = col(cDescItem);
    const exprTurno = col(cTurno);
    const exprRpm = col(cRpm);
    const exprProdKgHr = col(cProdKgHr);
    const exprProdInformada = col(cProdInformada);
    const exprEficCalculada = col(cEficCalculada);
    const exprEficInformada = col(cEficInformada);
    const exprCortNat = col(cCortNat);
    const exprRob01 = col(cRob01);
    const exprRob02 = col(cRob02);
    const exprRob03 = col(cRob03);

    const oeSql = `
      WITH oe_base AS (
        SELECT
          CASE
            WHEN TRIM(${exprLote}::text) ~ '^[0-9]+$' THEN (TRIM(${exprLote}::text)::bigint)::text
            ELSE TRIM(${exprLote}::text)
          END AS lote,
          CASE WHEN TRIM(${exprLote}::text) ~ '^[0-9]+$' THEN TRIM(${exprLote}::text)::bigint ELSE NULL END AS lote_num,
          NULLIF(TRIM(SPLIT_PART(COALESCE(${exprTitulo}::text, ''), '/', 1)), '') AS ne,
          TRIM(COALESCE(${exprTitulo}::text, '')) AS titulo_oe,
          TRIM(COALESCE(${exprMaquina}::text, '')) AS maquina_codigo,
          CASE
            WHEN RIGHT(regexp_replace(COALESCE(${exprMaquina}::text, ''), '[^0-9]', '', 'g'), 2) ~ '^[0-9]{1,2}$'
              THEN RIGHT(regexp_replace(COALESCE(${exprMaquina}::text, ''), '[^0-9]', '', 'g'), 2)::int
            ELSE NULL
          END AS maquina_num,
          TRIM(COALESCE(${exprLado}::text, '')) AS lado,
          TRIM(COALESCE(${exprItem}::text, '')) AS item,
          TRIM(COALESCE(${exprDescItem}::text, '')) AS desc_item,
          ${sqlParseDate(`${exprData}::text`)} AS fecha_prod,
          TRIM(COALESCE(${exprTurno}::text, '')) AS turno,
          ${sqlParseNumberIntl(`${exprRpm}::text`)} AS rpm,
          ${sqlParseNumberIntl(`${exprProdKgHr}::text`)} AS prod_kg_hr,
          ${sqlParseNumberIntl(`${exprProdInformada}::text`)} AS prod_informada,
          ${sqlParseNumberIntl(`${exprEficCalculada}::text`)} AS efic_calculada,
          ${sqlParseNumberIntl(`${exprEficInformada}::text`)} AS efic_informada,
          ${sqlParseNumberIntl(`${exprCortNat}::text`)} AS cort_nat,
          ${sqlParseNumberIntl(`${exprRob01}::text`)} AS rob_01,
          ${sqlParseNumberIntl(`${exprRob02}::text`)} AS rob_02,
          ${sqlParseNumberIntl(`${exprRob03}::text`)} AS rob_03
        FROM tb_produccion_oe t
        WHERE ${sqlParseDate(`${exprData}::text`)} = $1::date
          AND ($2::text IS NULL OR TRIM(${exprLote}::text) = TRIM($2))
          AND ($3::text IS NULL OR NULLIF(TRIM(SPLIT_PART(COALESCE(${exprTitulo}::text, ''), '/', 1)), '') = SPLIT_PART($3, '/', 1))
      ),
      uster_lotes AS (
        SELECT
          COALESCE(
            (regexp_match(u.lote, '[A-Za-z]+[-\\s]+(\\d+)'))[1],
            (regexp_match(u.lote, '(\\d+)'))[1]
          ) AS lote,
          NULLIF(TRIM(u.nomcount::text), '') AS ne,
          u.testnr,
          CASE
            WHEN lower(COALESCE(u.pasador::text, '')) LIKE '%si%' OR lower(COALESCE(u.pasador::text, '')) = 's' THEN 'si'
            WHEN lower(COALESCE(u.pasador::text, '')) LIKE '%no%' OR lower(COALESCE(u.pasador::text, '')) = 'n' THEN 'no'
            ELSE NULL
          END AS passador,
          NULLIF(TRIM(LEADING '0' FROM COALESCE(u.maschnr, '')), '') AS maquina_uster,
          CASE
            WHEN regexp_replace(TRIM(COALESCE(u.maschnr, '')), '[^0-9]', '', 'g') ~ '^[0-9]+$'
              THEN regexp_replace(TRIM(COALESCE(u.maschnr, '')), '[^0-9]', '', 'g')::int
            ELSE NULL
          END AS maquina_uster_num
        FROM tb_uster_par u
        WHERE u.time_stamp IS NOT NULL
          AND (
            CASE
              WHEN SPLIT_PART(TRIM(u.time_stamp), ' ', 1) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' THEN TO_DATE(SPLIT_PART(TRIM(u.time_stamp), ' ', 1), 'DD/MM/YYYY')
              WHEN SPLIT_PART(TRIM(u.time_stamp), ' ', 1) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}$' THEN TO_DATE(SPLIT_PART(TRIM(u.time_stamp), ' ', 1), 'DD/MM/YY')
              WHEN SPLIT_PART(TRIM(u.time_stamp), ' ', 1) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN SPLIT_PART(TRIM(u.time_stamp), ' ', 1)::date
              ELSE NULL
            END
          ) = $1::date
          AND ($3::text IS NULL OR NULLIF(TRIM(u.nomcount::text), '') = SPLIT_PART($3, '/', 1))
      ),
      uster_agg_lote AS (
        SELECT
          ul.lote,
          ul.ne,
          CASE
            WHEN COUNT(DISTINCT ul.passador) FILTER (WHERE ul.passador IS NOT NULL) = 1 THEN MAX(ul.passador)
            WHEN COUNT(DISTINCT ul.passador) FILTER (WHERE ul.passador IS NOT NULL) > 1 THEN 'mixto'
            ELSE NULL
          END AS passador,
          STRING_AGG(DISTINCT ul.maquina_uster, ', ') FILTER (WHERE ul.maquina_uster IS NOT NULL) AS maquinas_uster,
          ROUND(AVG(t.cvm_percent)::numeric, 2) AS cvm,
          ROUND(AVG(t.h)::numeric, 2) AS vellosidad,
          ROUND(AVG(t.neps_140_km)::numeric, 1) AS neps_140,
          ROUND(AVG(t.neps_200_km)::numeric, 1) AS neps_200,
          ROUND(AVG(t.delg_minus30_km)::numeric, 1) AS thin_30,
          ROUND(AVG(t.delg_minus40_km)::numeric, 1) AS thin_40,
          ROUND(AVG(t.delg_minus50_km)::numeric, 1) AS thin_50,
          ROUND(AVG(t.grue_35_km)::numeric, 1) AS thick_35,
          ROUND(AVG(t.grue_50_km)::numeric, 1) AS thick_50,
          COUNT(DISTINCT ul.testnr) AS ensayos_uster
        FROM uster_lotes ul
        JOIN tb_uster_tbl t ON t.testnr = ul.testnr
        GROUP BY ul.lote, ul.ne
      ),
      uster_agg_machine AS (
        SELECT
          ul.ne,
          ul.maquina_uster_num,
          CASE
            WHEN COUNT(DISTINCT ul.passador) FILTER (WHERE ul.passador IS NOT NULL) = 1 THEN MAX(ul.passador)
            WHEN COUNT(DISTINCT ul.passador) FILTER (WHERE ul.passador IS NOT NULL) > 1 THEN 'mixto'
            ELSE NULL
          END AS passador,
          STRING_AGG(DISTINCT ul.maquina_uster, ', ') FILTER (WHERE ul.maquina_uster IS NOT NULL) AS maquinas_uster,
          ROUND(AVG(t.cvm_percent)::numeric, 2) AS cvm,
          ROUND(AVG(t.h)::numeric, 2) AS vellosidad,
          ROUND(AVG(t.neps_140_km)::numeric, 1) AS neps_140,
          ROUND(AVG(t.neps_200_km)::numeric, 1) AS neps_200,
          ROUND(AVG(t.delg_minus30_km)::numeric, 1) AS thin_30,
          ROUND(AVG(t.delg_minus40_km)::numeric, 1) AS thin_40,
          ROUND(AVG(t.delg_minus50_km)::numeric, 1) AS thin_50,
          ROUND(AVG(t.grue_35_km)::numeric, 1) AS thick_35,
          ROUND(AVG(t.grue_50_km)::numeric, 1) AS thick_50,
          COUNT(DISTINCT ul.testnr) AS ensayos_uster
        FROM uster_lotes ul
        JOIN tb_uster_tbl t ON t.testnr = ul.testnr
        WHERE ul.maquina_uster_num IS NOT NULL
        GROUP BY ul.ne, ul.maquina_uster_num
      ),
      tensor_agg_lote AS (
        SELECT
          ul.lote,
          ul.ne,
          ROUND(AVG(tt.tenacidad)::numeric, 2) AS tenacidad,
          ROUND(AVG(tt.elongacion)::numeric, 2) AS elongacion,
          ROUND(AVG(tt.fuerza_b)::numeric, 2) AS fuerza_b,
          ROUND(AVG(tt.trabajo)::numeric, 2) AS trabajo_b
        FROM uster_lotes ul
        JOIN tb_tensorapid_par tp ON tp.uster_testnr = ul.testnr
        JOIN tb_tensorapid_tbl tt ON tt.testnr = tp.testnr
        GROUP BY ul.lote, ul.ne
      ),
      tensor_agg_machine AS (
        SELECT
          ul.ne,
          ul.maquina_uster_num,
          ROUND(AVG(tt.tenacidad)::numeric, 2) AS tenacidad,
          ROUND(AVG(tt.elongacion)::numeric, 2) AS elongacion,
          ROUND(AVG(tt.fuerza_b)::numeric, 2) AS fuerza_b,
          ROUND(AVG(tt.trabajo)::numeric, 2) AS trabajo_b
        FROM uster_lotes ul
        JOIN tb_tensorapid_par tp ON tp.uster_testnr = ul.testnr
        JOIN tb_tensorapid_tbl tt ON tt.testnr = tp.testnr
        WHERE ul.maquina_uster_num IS NOT NULL
        GROUP BY ul.ne, ul.maquina_uster_num
      )
      SELECT
        oe.fecha_prod,
        oe.turno,
        oe.lote,
        oe.ne,
        oe.titulo_oe,
        oe.maquina_codigo,
        oe.maquina_num,
        oe.lado,
        oe.item,
        oe.desc_item,
        oe.rpm,
        oe.prod_kg_hr,
        oe.prod_informada,
        oe.efic_calculada,
        oe.efic_informada,
        oe.cort_nat,
        oe.rob_01,
        oe.rob_02,
        oe.rob_03,
        COALESCE(ua_l.passador, ua_m.passador) AS passador,
        COALESCE(ua_l.maquinas_uster, ua_m.maquinas_uster) AS maquinas_uster,
        COALESCE(ua_l.cvm, ua_m.cvm) AS cvm,
        COALESCE(ua_l.vellosidad, ua_m.vellosidad) AS vellosidad,
        COALESCE(ua_l.neps_140, ua_m.neps_140) AS neps_140,
        COALESCE(ua_l.neps_200, ua_m.neps_200) AS neps_200,
        COALESCE(ua_l.thin_30, ua_m.thin_30) AS thin_30,
        COALESCE(ua_l.thin_40, ua_m.thin_40) AS thin_40,
        COALESCE(ua_l.thin_50, ua_m.thin_50) AS thin_50,
        COALESCE(ua_l.thick_35, ua_m.thick_35) AS thick_35,
        COALESCE(ua_l.thick_50, ua_m.thick_50) AS thick_50,
        COALESCE(ua_l.ensayos_uster, ua_m.ensayos_uster) AS ensayos_uster,
        COALESCE(ta_l.tenacidad, ta_m.tenacidad) AS tenacidad,
        COALESCE(ta_l.elongacion, ta_m.elongacion) AS elongacion,
        COALESCE(ta_l.fuerza_b, ta_m.fuerza_b) AS fuerza_b,
        COALESCE(ta_l.trabajo_b, ta_m.trabajo_b) AS trabajo_b
      FROM oe_base oe
      LEFT JOIN uster_agg_lote ua_l
        ON ua_l.lote::bigint = oe.lote_num
       AND (
         CASE
           WHEN ua_l.ne ~ '^[0-9]+([.,][0-9]+)?$' AND oe.ne ~ '^[0-9]+([.,][0-9]+)?$'
           THEN replace(ua_l.ne, ',', '.')::numeric = replace(oe.ne, ',', '.')::numeric
           ELSE ua_l.ne = oe.ne
         END
       )
      LEFT JOIN uster_agg_machine ua_m
        ON ua_m.maquina_uster_num = oe.maquina_num
       AND (
         CASE
           WHEN ua_m.ne ~ '^[0-9]+([.,][0-9]+)?$' AND oe.ne ~ '^[0-9]+([.,][0-9]+)?$'
           THEN replace(ua_m.ne, ',', '.')::numeric = replace(oe.ne, ',', '.')::numeric
           ELSE ua_m.ne = oe.ne
         END
       )
      LEFT JOIN tensor_agg_lote ta_l
        ON ta_l.lote::bigint = oe.lote_num
       AND (
         CASE
           WHEN ta_l.ne ~ '^[0-9]+([.,][0-9]+)?$' AND oe.ne ~ '^[0-9]+([.,][0-9]+)?$'
           THEN replace(ta_l.ne, ',', '.')::numeric = replace(oe.ne, ',', '.')::numeric
           ELSE ta_l.ne = oe.ne
         END
       )
      LEFT JOIN tensor_agg_machine ta_m
        ON ta_m.maquina_uster_num = oe.maquina_num
       AND (
         CASE
           WHEN ta_m.ne ~ '^[0-9]+([.,][0-9]+)?$' AND oe.ne ~ '^[0-9]+([.,][0-9]+)?$'
           THEN replace(ta_m.ne, ',', '.')::numeric = replace(oe.ne, ',', '.')::numeric
           ELSE ta_m.ne = oe.ne
         END
       )
      ORDER BY oe.lote_num ASC NULLS LAST, oe.maquina_num ASC NULLS LAST, oe.lado ASC
    `;

    const rowsResult = await query(oeSql, [fecha, lote, ne]);

    let cardaTurno = [];
    try {
      const cardaTurnoSql = `
        WITH carda_lab AS (
          SELECT
            CASE
              WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) < 6 THEN (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date - 1
              ELSE (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date
            END AS fecha_prod,
            CASE
              WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) BETWEEN 6 AND 13 THEN 'A'
              WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) BETWEEN 14 AND 21 THEN 'B'
              ELSE 'C'
            END AS turno,
            CASE
              WHEN upper(COALESCE(p.style, '')) LIKE '%MANUAR%' THEN 'MANUAR'
              WHEN upper(COALESCE(p.style, '')) LIKE '%CARDA%RIETER%' OR upper(COALESCE(p.style, '')) LIKE '%RIETER%' THEN 'CARDA RIETER'
              WHEN upper(COALESCE(p.style, '')) LIKE '%TRUTZSCHLER%' THEN 'TRUTZSCHLER'
              ELSE 'OTRO'
            END AS style_norm,
            CASE
              WHEN regexp_replace(TRIM(COALESCE(p.maschnr, '')), '[^0-9]', '', 'g') ~ '^[0-9]+$'
                THEN regexp_replace(TRIM(COALESCE(p.maschnr, '')), '[^0-9]', '', 'g')::int
              ELSE NULL
            END AS carda_num,
            p.testnr,
            ROUND(AVG(t.cvm_percent)::numeric, 2) AS cvm_test
          FROM tb_uster_carda_par p
          LEFT JOIN tb_uster_carda_tbl t ON t.testnr = p.testnr
          WHERE ${sqlParseMixedLocalTimestamp('p.time_stamp')} IS NOT NULL
            AND (
              CASE
                WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) < 6 THEN (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date - 1
                ELSE (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date
              END
            ) = $1::date
          GROUP BY 1, 2, 3, 4, 5
        )
        SELECT
          fecha_prod,
          turno,
          style_norm,
          ROUND(AVG(cvm_test)::numeric, 2) AS cvm_turno_avg,
          ROUND(MAX(cvm_test)::numeric, 2) AS cvm_turno_max,
          COUNT(DISTINCT testnr) AS muestras_turno,
          STRING_AGG(DISTINCT carda_num::text, ', ') FILTER (WHERE carda_num IS NOT NULL) AS maquinas_lab
        FROM carda_lab
        GROUP BY fecha_prod, turno, style_norm
      `;

      const cardaTurnoResult = await query(cardaTurnoSql, [fecha]);
      cardaTurno = cardaTurnoResult.rows;
    } catch (cardaTurnoError) {
      cardaTurno = [];
      console.warn('[oe/trazabilidad] Cobertura turno/style cardas no disponible:', cardaTurnoError.message);
    }

    let cardas = [];
    try {
      const cardaSql = `
        WITH carda_prod AS (
          SELECT
            ${sqlParseDate('data')} AS fecha_prod,
            TRIM(COALESCE(t::text, '')) AS turno,
            CASE
              WHEN RIGHT(regexp_replace(COALESCE(maquina::text, ''), '[^0-9]', '', 'g'), 2) ~ '^[0-9]{1,2}$'
                THEN RIGHT(regexp_replace(COALESCE(maquina::text, ''), '[^0-9]', '', 'g'), 2)::int
              ELSE NULL
            END AS carda_num,
            ${sqlParseNumberIntl('titulo::text')} AS titulo_cinta,
            ${sqlParseNumberIntl('"PROD KG/H"')} AS prod_kgh,
            ${sqlParseNumberIntl('"PROD INFORM"')} AS prod_inform,
            ${sqlParseNumberIntl('"EFIC INFOR"')} AS efic_infor
          FROM tb_produccion_carda
          WHERE ${sqlParseDate('data')} = $1::date
        ),
        carda_lab AS (
          SELECT
            CASE
              WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) < 6 THEN (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date - 1
              ELSE (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date
            END AS fecha_prod,
            CASE
              WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) BETWEEN 6 AND 13 THEN 'A'
              WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) BETWEEN 14 AND 21 THEN 'B'
              ELSE 'C'
            END AS turno,
            CASE WHEN TRIM(COALESCE(p.maschnr, '')) ~ '^[0-9]+$' THEN TRIM(p.maschnr)::int ELSE NULL END AS carda_num,
            p.nomcount::numeric AS titulo_cinta,
            p.testnr,
            ROUND(AVG(t.cvm_percent)::numeric, 2) AS cvm_avg
          FROM tb_uster_carda_par p
          LEFT JOIN tb_uster_carda_tbl t ON t.testnr = p.testnr
          WHERE ${sqlParseMixedLocalTimestamp('p.time_stamp')} IS NOT NULL
            AND (
              CASE
                WHEN EXTRACT(HOUR FROM ${sqlParseMixedLocalTimestamp('p.time_stamp')}) < 6 THEN (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date - 1
                ELSE (${sqlParseMixedLocalTimestamp('p.time_stamp')})::date
              END
            ) = $1::date
          GROUP BY 1, 2, 3, 4, 5
        ),
        prod_agg AS (
          SELECT
            fecha_prod,
            titulo_cinta,
            STRING_AGG(DISTINCT carda_num::text, ', ') FILTER (WHERE carda_num IS NOT NULL) AS maquinas_prod,
            ROUND(AVG(prod_kgh)::numeric, 2) AS prod_kgh_avg,
            ROUND(AVG(prod_inform)::numeric, 2) AS prod_inform_avg,
            ROUND(AVG(efic_infor)::numeric, 2) AS efic_infor_avg,
            COUNT(*) AS registros_prod
          FROM carda_prod
          GROUP BY fecha_prod, titulo_cinta
        ),
        lab_agg AS (
          SELECT
            fecha_prod,
            titulo_cinta,
            STRING_AGG(DISTINCT carda_num::text, ', ') FILTER (WHERE carda_num IS NOT NULL) AS maquinas_lab,
            ROUND(AVG(cvm_avg)::numeric, 2) AS cvm_avg,
            ROUND(MAX(cvm_avg)::numeric, 2) AS cvm_max,
            COUNT(DISTINCT testnr) AS ensayos_lab
          FROM carda_lab
          GROUP BY fecha_prod, titulo_cinta
        ),
        match_stats AS (
          SELECT
            cp.fecha_prod,
            cp.titulo_cinta,
            COUNT(DISTINCT cp.carda_num::text || '-' || cp.turno) AS posiciones_prod,
            COUNT(DISTINCT cl.testnr) AS ensayos_lab,
            COUNT(DISTINCT CASE WHEN cl.testnr IS NOT NULL THEN cp.carda_num::text || '-' || cp.turno END) AS posiciones_matcheadas
          FROM carda_prod cp
          LEFT JOIN carda_lab cl
            ON cl.fecha_prod = cp.fecha_prod
           AND cl.turno = cp.turno
           AND cl.carda_num = cp.carda_num
           AND COALESCE(cl.titulo_cinta, -1) = COALESCE(cp.titulo_cinta, -1)
          GROUP BY cp.fecha_prod, cp.titulo_cinta
        ),
        titulos_contexto AS (
          SELECT fecha_prod, titulo_cinta FROM prod_agg
          UNION
          SELECT fecha_prod, titulo_cinta FROM lab_agg
        )
        SELECT
          tc.fecha_prod,
          tc.titulo_cinta,
          pa.maquinas_prod,
          pa.prod_kgh_avg,
          pa.prod_inform_avg,
          pa.efic_infor_avg,
          la.maquinas_lab,
          la.cvm_avg,
          la.cvm_max,
          COALESCE(la.ensayos_lab, 0) AS ensayos_lab,
          COALESCE(ms.posiciones_prod, 0) AS posiciones_prod,
          COALESCE(ms.posiciones_matcheadas, 0) AS posiciones_matcheadas,
          CASE
            WHEN COALESCE(ms.posiciones_prod, 0) = 0 AND COALESCE(la.ensayos_lab, 0) > 0 THEN 'media'
            WHEN COALESCE(ms.posiciones_matcheadas, 0) = 0 THEN 'baja'
            WHEN COALESCE(ms.posiciones_matcheadas, 0) = COALESCE(ms.posiciones_prod, 0) THEN 'alta'
            ELSE 'media'
          END AS confianza_match
        FROM titulos_contexto tc
        LEFT JOIN prod_agg pa ON pa.fecha_prod = tc.fecha_prod AND COALESCE(pa.titulo_cinta, -1) = COALESCE(tc.titulo_cinta, -1)
        LEFT JOIN lab_agg la ON la.fecha_prod = tc.fecha_prod AND COALESCE(la.titulo_cinta, -1) = COALESCE(tc.titulo_cinta, -1)
        LEFT JOIN match_stats ms ON ms.fecha_prod = tc.fecha_prod AND COALESCE(ms.titulo_cinta, -1) = COALESCE(tc.titulo_cinta, -1)
        ORDER BY tc.titulo_cinta ASC NULLS LAST
      `;

      const cardaResult = await query(cardaSql, [fecha]);
      cardas = cardaResult.rows.map((row) => ({
        ...row,
        observacion_match: row.confianza_match === 'alta'
          ? 'Coincidencia inferida por fecha productiva, turno y carda.'
          : row.confianza_match === 'media'
            ? 'Coincidencia parcial: falta cobertura completa entre producción y laboratorio.'
            : 'Sin coincidencia completa; usar como contexto diario, no como trazabilidad de lote.'
      }));
    } catch (cardaError) {
      cardas = [];
      console.warn('[oe/trazabilidad] Contexto de cardas no disponible:', cardaError.message);
    }

    const cardaByTurnoStyle = new Map(
      cardaTurno.map((item) => [`${item.fecha_prod}|${String(item.turno || '').trim().toUpperCase()}|${item.style_norm}`, item])
    );

    const rows = rowsResult.rows.map((row) => {
      const passador = normalizePassador(row.passador) || row.passador || null;
      const rowKeyBase = `${row.fecha_prod}|${String(row.turno || '').trim().toUpperCase()}|`;
      const cardaRow = passador === 'si'
        ? (cardaByTurnoStyle.get(`${rowKeyBase}MANUAR`) || cardaByTurnoStyle.get(`${rowKeyBase}TRUTZSCHLER`) || null)
        : passador === 'no'
          ? (cardaByTurnoStyle.get(`${rowKeyBase}CARDA RIETER`) || null)
          : null;
      const styleObjetivo = passador === 'si'
        ? (cardaByTurnoStyle.get(`${rowKeyBase}MANUAR`) ? 'MANUAR' : (cardaByTurnoStyle.get(`${rowKeyBase}TRUTZSCHLER`) ? 'TRUTZSCHLER' : 'MANUAR'))
        : passador === 'no'
          ? 'CARDA RIETER'
          : null;
      const muestrasTurno = cardaRow ? Number(cardaRow.muestras_turno) || 0 : 0;
      const muestrasEsperadas = styleObjetivo ? 2 : 0;
      const alerts = buildAlerts(row);
      return {
        ...row,
        passador,
        alimentacion: passador === 'si' ? 'MANUAR' : passador === 'no' ? 'CARDA RIETER' : passador === 'mixto' ? 'MIXTO' : 'N/D',
        cadena_alimentacion: passador === 'si'
          ? 'TRUTZSCHLER > MANUAR'
          : passador === 'no'
            ? 'CARDA RIETER'
            : passador === 'mixto'
              ? 'MIXTO'
              : 'N/D',
        style_carda_objetivo: styleObjetivo,
        cvm_carda_turno: cardaRow?.cvm_turno_avg ?? null,
        cvm_carda_max_turno: cardaRow?.cvm_turno_max ?? null,
        muestras_carda_turno: muestrasTurno,
        muestras_carda_esperadas: muestrasEsperadas,
        maquinas_carda_turno: cardaRow?.maquinas_lab || null,
        cobertura_carda_turno: !styleObjetivo
          ? 'sin_regla'
          : muestrasTurno >= 2
            ? 'completa'
            : muestrasTurno === 1
              ? 'parcial'
              : 'sin_muestra',
        lado_label: formatSide(row.lado),
        maquina_label: row.maquina_num != null ? `${row.maquina_num} ${formatSide(row.lado)}`.trim() : row.maquina_codigo,
        alertas: alerts,
        recomendacion: buildRecommendation(row, alerts)
      };
    });

    res.json({
      fecha,
      filtros: { lote, ne },
      rows,
      cardas,
      resumen: {
        registros_oe: rows.length,
        maquinas_oe: [...new Set(rows.map((row) => row.maquina_label).filter(Boolean))].length,
        lotes: [...new Set(rows.map((row) => row.lote).filter(Boolean))].length,
        titulos: [...new Set(rows.map((row) => row.ne).filter(Boolean))].length,
        cardas_contexto: cardas.length
      }
    });
  } catch (error) {
    console.error('[oe/trazabilidad] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;