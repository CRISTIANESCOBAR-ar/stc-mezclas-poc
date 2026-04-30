import express from 'express';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../db/pg.js';

const router = express.Router();

// Cache simple en memoria para diagnósticos IA (key = hash del payload + modelo)
const cachedOeIA = new Map();

// Pricing Gemini (USD por 1M tokens) — usado para estimar costo por respuesta.
const GEMINI_PRICING = {
  'gemini-2.5-pro':   { in: 1.25, out: 10.00 },
  'gemini-2.5-flash': { in: 0.30, out: 2.50 },
  'gemini-2.0-flash': { in: 0.10, out: 0.40 },
};

function sqlParseDate(colIdent) {
  return `(
    CASE
      WHEN ${colIdent} IS NULL OR ${colIdent} = '' THEN NULL
      WHEN split_part(btrim(${colIdent}), ' ', 1) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' THEN to_date(split_part(btrim(${colIdent}), ' ', 1), 'FMDD/FMMM/YYYY')
      WHEN split_part(btrim(${colIdent}), ' ', 1) ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}$' THEN to_date(split_part(btrim(${colIdent}), ' ', 1), 'FMDD/FMMM/YY')
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
  // Robots empalmadores: rob_01/02/03 son % de eficiencia individual de cada Robot.
  // El indicador correcto es el PROMEDIO (no la suma).
  const robValues = [row.rob_01, row.rob_02, row.rob_03]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  const robAvg = robValues.length ? (robValues.reduce((s, v) => s + v, 0) / robValues.length) : null;
  row.robots_efic_avg = robAvg;

  if (row.efic_informada != null) {
    if (Number(row.efic_informada) < 85) push('alta', 'eficiencia', `Eficiencia informada ${Number(row.efic_informada).toFixed(1)}%.`);
    else if (Number(row.efic_informada) < 90) push('media', 'eficiencia', `Eficiencia informada ${Number(row.efic_informada).toFixed(1)}% por debajo de ventana estable.`);
  }

  if (row.cort_nat != null) {
    if (Number(row.cort_nat) > 250) push('alta', 'corte_nat', `Corte natural ${Number(row.cort_nat).toFixed(1)} elevado.`);
    else if (Number(row.cort_nat) > 150) push('media', 'corte_nat', `Corte natural ${Number(row.cort_nat).toFixed(1)} en vigilancia.`);
  }

  // Cortes cortos (CC = CCp + CCm) — defectos puntuales tipo nep/sucio/mota
  const ccTotal = (Number(row.ccp) || 0) + (Number(row.ccm) || 0);
  if (ccTotal > 30) push('alta', 'cortes_cortos', `Cortes cortos ${ccTotal} elevados (calidad de cinta/carda).`);
  else if (ccTotal > 15) push('media', 'cortes_cortos', `Cortes cortos ${ccTotal} en vigilancia.`);

  // Empalmes (J = JP + JM) — calidad mecánica del puesto/empalmador
  const jTotal = (Number(row.jp) || 0) + (Number(row.jm) || 0);
  if (jTotal > 25) push('alta', 'empalmes', `Empalmes ${jTotal} elevados (revisar piecer).`);
  else if (jTotal > 15) push('media', 'empalmes', `Empalmes ${jTotal} en vigilancia.`);

  if (robAvg != null) {
    if (robAvg < 85) push('alta', 'robots', `Eficiencia promedio Robots ${robAvg.toFixed(1)}% (baja).`);
    else if (robAvg < 90) push('media', 'robots', `Eficiencia promedio Robots ${robAvg.toFixed(1)}% en seguimiento.`);
  }

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

  if (has('eficiencia') || has('corte_nat') || has('robots')) {
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
    // Campos extendidos: alfa, paradas y Classimat
    const cAlfa = findColumn(oeColSet, ['alfa', 'ALFA', 'Alfa']);
    const cTBob = findColumn(oeColSet, ['T.BOB.', 't.bob.', 't_bob', 'tbob']);
    const cRpmCard = findColumn(oeColSet, ['RPM CARD', 'rpm card', 'rpm_card']);
    const cMo = findColumn(oeColSet, ['mo', 'MO', 'Mo']);
    const cCp = findColumn(oeColSet, ['CP V+ SL+', 'cp v+ sl+', 'cp']);
    const cCm = findColumn(oeColSet, ['CM V- SL-', 'cm v- sl-', 'cm']);
    const cCcp = findColumn(oeColSet, ['CCp C+', 'ccp c+', 'ccp']);
    const cCcm = findColumn(oeColSet, ['CCm C-', 'ccm c-', 'ccm']);
    const cJp = findColumn(oeColSet, ['JP (P+)', 'jp (p+)', 'jp']);
    const cJm = findColumn(oeColSet, ['JM (P-)', 'jm (p-)', 'jm']);
    const cCvp = findColumn(oeColSet, ['cvp', 'CVP', 'Cvp']);
    const cCvmOe = findColumn(oeColSet, ['cvm', 'CVM', 'Cvm']);
    const cClmN = findColumn(oeColSet, ['n', 'N']);
    const cClmS = findColumn(oeColSet, ['s', 'S']);
    const cClmL = findColumn(oeColSet, ['l', 'L']);
    const cClmT = findColumn(oeColSet, ['t', 'T']);

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
    const exprAlfa = col(cAlfa);
    const exprTBob = col(cTBob);
    const exprRpmCard = col(cRpmCard);
    const exprMo = col(cMo);
    const exprCp = col(cCp);
    const exprCm = col(cCm);
    const exprCcp = col(cCcp);
    const exprCcm = col(cCcm);
    const exprJp = col(cJp);
    const exprJm = col(cJm);
    const exprCvpOe = col(cCvp);
    const exprCvmOe = col(cCvmOe);
    const exprClmN = col(cClmN);
    const exprClmS = col(cClmS);
    const exprClmL = col(cClmL);
    const exprClmT = col(cClmT);

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
          ${sqlParseNumberIntl(`${exprRob03}::text`)} AS rob_03,
          ${sqlParseNumberIntl(`${exprAlfa}::text`)} AS alfa,
          ${sqlParseNumberIntl(`${exprTBob}::text`)} AS t_bob,
          ${sqlParseNumberIntl(`${exprRpmCard}::text`)} AS rpm_card,
          ${sqlParseNumberIntl(`${exprMo}::text`)} AS mo,
          ${sqlParseNumberIntl(`${exprCp}::text`)} AS cp,
          ${sqlParseNumberIntl(`${exprCm}::text`)} AS cm,
          ${sqlParseNumberIntl(`${exprCcp}::text`)} AS ccp,
          ${sqlParseNumberIntl(`${exprCcm}::text`)} AS ccm,
          ${sqlParseNumberIntl(`${exprJp}::text`)} AS jp,
          ${sqlParseNumberIntl(`${exprJm}::text`)} AS jm,
          ${sqlParseNumberIntl(`${exprCvpOe}::text`)} AS oe_cvp,
          ${sqlParseNumberIntl(`${exprCvmOe}::text`)} AS oe_cvm,
          ${sqlParseNumberIntl(`${exprClmN}::text`)} AS clm_n,
          ${sqlParseNumberIntl(`${exprClmS}::text`)} AS clm_s,
          ${sqlParseNumberIntl(`${exprClmL}::text`)} AS clm_l,
          ${sqlParseNumberIntl(`${exprClmT}::text`)} AS clm_t
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
          ROUND(AVG(tt.trabajo)::numeric, 2) AS trabajo_b,
          STRING_AGG(DISTINCT NULLIF(TRIM(COALESCE(tp.comment, tp.comment_text, '')), ''), ' | ') AS obs
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
          ROUND(AVG(tt.trabajo)::numeric, 2) AS trabajo_b,
          STRING_AGG(DISTINCT NULLIF(TRIM(COALESCE(tp.comment, tp.comment_text, '')), ''), ' | ') AS obs
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
        oe.alfa,
        oe.t_bob,
        oe.rpm_card,
        oe.mo,
        oe.cp,
        oe.cm,
        oe.ccp,
        oe.ccm,
        oe.jp,
        oe.jm,
        oe.oe_cvp,
        oe.oe_cvm,
        oe.clm_n,
        oe.clm_s,
        oe.clm_l,
        oe.clm_t,
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
        COALESCE(ta_l.trabajo_b, ta_m.trabajo_b) AS trabajo_b,
        COALESCE(ta_l.obs, ta_m.obs) AS tensor_obs
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
          STRING_AGG(DISTINCT carda_num::text, ', ') FILTER (WHERE carda_num IS NOT NULL) AS maquinas_lab,
          (
            SELECT json_agg(json_build_object('carda', carda_num, 'cvm', cvm_test) ORDER BY carda_num NULLS LAST)
            FROM carda_lab cl2
            WHERE cl2.fecha_prod = carda_lab.fecha_prod
              AND cl2.turno = carda_lab.turno
              AND cl2.style_norm = carda_lab.style_norm
          ) AS detalle_cardas
        FROM carda_lab
        GROUP BY fecha_prod, turno, style_norm
      `;

      const cardaTurnoResult = await query(cardaTurnoSql, [fecha]);
      cardaTurno = cardaTurnoResult.rows;
    } catch (cardaTurnoError) {
      cardaTurno = [];
      console.warn('[oe/trazabilidad] Cobertura turno/style cardas no disponible:', cardaTurnoError.message);
    }

    // Producción Kg/h por turno — directo de tb_produccion_carda, sin depender
    // de USTER. Promedia todas las cardas que produjeron en ese turno.
    let cardaProdTurno = [];
    try {
      // Regla fija de alimentación según nº de carda:
      //   002-007 (TRUTZSCHLER)        -> MANUAR
      //   008-013, 015-017 (RIETER)    -> CARDA RIETER
      const cardaProdTurnoSql = `
        WITH base AS (
          SELECT
            ${sqlParseDate('data')} AS fecha_prod,
            UPPER(TRIM(COALESCE(t::text, ''))) AS turno,
            CASE
              WHEN TRIM(COALESCE(lf::text, '')) ~ '^[0-9]{1,3}$'
                THEN TRIM(lf::text)::int
              ELSE NULL
            END AS carda_num,
            ${sqlParseNumberIntl('"PROD KG/H"')} AS prod_kgh
          FROM tb_produccion_carda
          WHERE ${sqlParseDate('data')} = $1::date
        )
        SELECT
          fecha_prod,
          turno,
          CASE
            WHEN carda_num BETWEEN 2 AND 7 THEN 'MANUAR'
            WHEN carda_num IN (8,9,10,11,12,13,15,16,17) THEN 'CARDA RIETER'
            ELSE NULL
          END AS alim,
          ROUND(AVG(prod_kgh)::numeric, 2) AS prod_kgh_avg,
          ROUND(MIN(prod_kgh)::numeric, 2) AS prod_kgh_min,
          ROUND(MAX(prod_kgh)::numeric, 2) AS prod_kgh_max,
          COUNT(*) AS registros_prod
        FROM base
        WHERE prod_kgh IS NOT NULL AND prod_kgh > 0
          AND carda_num IS NOT NULL
          AND (
            carda_num BETWEEN 2 AND 7
            OR carda_num IN (8,9,10,11,12,13,15,16,17)
          )
        GROUP BY fecha_prod, turno, alim
      `;
      const cardaProdResult = await query(cardaProdTurnoSql, [fecha]);
      cardaProdTurno = cardaProdResult.rows;
    } catch (cardaProdError) {
      cardaProdTurno = [];
      console.warn('[oe/trazabilidad] Producción Kg/h cardas no disponible:', cardaProdError.message);
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
    const cardaProdByTurnoAlim = new Map(
      cardaProdTurno.map((item) => [`${item.fecha_prod}|${String(item.turno || '').trim().toUpperCase()}|${item.alim}`, item])
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
      const alimKgh = passador === 'si' ? 'MANUAR' : passador === 'no' ? 'CARDA RIETER' : null;
      const prodCardaRow = alimKgh
        ? (cardaProdByTurnoAlim.get(`${rowKeyBase}${alimKgh}`) || null)
        : null;
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
        detalle_cardas_turno: cardaRow?.detalle_cardas || null,
        prod_kgh_carda_turno: prodCardaRow?.prod_kgh_avg != null ? Number(prodCardaRow.prod_kgh_avg) : null,
        prod_kgh_carda_min: prodCardaRow?.prod_kgh_min != null ? Number(prodCardaRow.prod_kgh_min) : null,
        prod_kgh_carda_max: prodCardaRow?.prod_kgh_max != null ? Number(prodCardaRow.prod_kgh_max) : null,
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

// =====================================================
// POST /api/oe/diagnostico-ia
// Genera análisis técnico contextual con Gemini para una fila/grupo OE.
// Devuelve además métricas: tokens, latencia y costo USD estimado.
// =====================================================
router.post('/diagnostico-ia', async (req, res) => {
  const t0 = Date.now();
  try {
    const { fila, alertas = [], model: modelName = 'gemini-2.5-flash' } = req.body || {};
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GOOGLE_API_KEY no configurada' });
    }
    if (!fila) {
      return res.status(400).json({ success: false, error: 'Falta payload "fila"' });
    }

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ fila, alertas, modelName }))
      .digest('hex');
    const cacheKey = `oediag_${modelName}_${hash}`;
    if (cachedOeIA.has(cacheKey)) {
      const cached = cachedOeIA.get(cacheKey);
      return res.json({ success: true, ...cached, cache_hit: true, latencia_ms: Date.now() - t0 });
    }

    // Compactamos solo los campos relevantes para reducir tokens
    const compact = {
      maquina: fila.maquina_label,
      lote: fila.lote,
      ne: fila.ne,
      turnos: fila.turnos || [fila.turno],
      alimentacion: fila.alimentacion,
      passador: fila.passador,
      open_end: {
        rpm: fila.rpm,
        alfa: fila.alfa,
        efic_informada: fila.efic_informada ?? fila.efic_avg,
        cort_nat: fila.cort_nat ?? fila.cort_nat_avg,
        ccp: fila.ccp_sum ?? fila.ccp,
        ccm: fila.ccm_sum ?? fila.ccm,
        jp: fila.jp_sum ?? fila.jp,
        jm: fila.jm_sum ?? fila.jm,
        cp: fila.cp_sum ?? fila.cp,
        cm: fila.cm_sum ?? fila.cm,
        mo: fila.mo,
        cvp: fila.oe_cvp,
        cvm: fila.oe_cvm,
        t_bob: fila.t_bob ?? fila.t_bob_avg,
        rpm_card: fila.rpm_card ?? fila.rpm_card_avg,
        robots_efic_avg: fila.robots_efic_avg
          ?? (() => {
            const vals = [fila.rob_01, fila.rob_02, fila.rob_03]
              .map((v) => Number(v))
              .filter((v) => Number.isFinite(v) && v > 0);
            return vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : null;
          })(),
        clm_n: fila.clm_n, clm_s: fila.clm_s, clm_l: fila.clm_l, clm_t: fila.clm_t,
      },
      uster: {
        cvm: fila.cvm,
        neps_140: fila.neps_140,
        neps_200: fila.neps_200,
        thin_30: fila.thin_30, thin_40: fila.thin_40, thin_50: fila.thin_50,
        thick_35: fila.thick_35, thick_50: fila.thick_50,
        vellosidad: fila.vellosidad,
      },
      cardas: {
        kgh_prom: fila.prod_kgh_carda_avg ?? fila.prod_kgh_carda_turno,
        kgh_min: fila.prod_kgh_carda_min,
        kgh_max: fila.prod_kgh_carda_max,
        cvm_carda: fila.cvm_carda_avg ?? fila.cvm_carda_turno,
      },
      tensorapid: {
        tenacidad: fila.tenacidad,
        elongacion: fila.elongacion,
        fuerza_b: fila.fuerza_b,
        trabajo_b: fila.trabajo_b,
      },
      alertas: alertas.map(a => ({ code: a.code, severity: a.severity, msg: a.message || a.msg })),
    };

    const prompt = `Actúas como Ingeniero Senior de Hilandería de Open End con 20 años de experiencia. Analizá la siguiente fila operativa de producción y devolvé un diagnóstico breve, técnico y accionable en español rioplatense para un supervisor de turno.

REGLAS DE FORMATO (OBLIGATORIO):
- Markdown.
- Máximo 220 palabras.
- Estructura:
  **Diagnóstico:** 1-2 oraciones claras sobre qué está pasando.
  **Causas probables:** lista de 2 a 4 causas técnicas (no genéricas).
  **Acciones recomendadas:** lista de 2 a 4 acciones concretas que el operario o supervisor debe ejecutar (ir a la máquina, revisar X, medir Y).
  **Prioridad:** 🔴 Alta / 🟡 Media / 🟢 Baja, con justificación de 1 línea.

CRITERIOS TÉCNICOS:
- Eficiencia <85% es baja; <60% es crítica.
- Cortes Naturales >150 indica algodón inestable o rotor sucio.
- CCp+CCm >50 (cortes cortos) suele apuntar a problemas en cinta o rotor.
- JP+JM >25 (empalmes) implica roturas frecuentes: tensión, mecha o navetes.
- CVm hilo >12% es alto; Neps+200 >60/km es alto.
- Tenacidad <14.5 cN/tex es crítico; <16 es bajo para urdimbre.
- Variación grande entre cardas (Kg/h min/max diff >15) sugiere desbalance de alimentación.

GLOSARIO IMPORTANTE (no confundir):
- "robots_efic_avg" = porcentaje promedio de eficiencia de los Robots empalmadores automáticos (cambiadores) que recorren la máquina OE. NO son "robos de fibra" ni pérdidas. Valores normales 90-98%; <85% indica que los robots no están logrando empalmar (puede ser por roturas excesivas, mecha mala o falla mecánica del propio robot).
- Open End = hilatura por rotor (no anillo).
- "passador" = cinta alimentadora previa (SI = pasó por Manuar; NO = directo de Carda Rieter).

DATOS:
${JSON.stringify(compact, null, 2)}

NO inventes valores que no estén en los datos. Si un campo es null, ignoralo.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const texto = result.response.text();

    const usage = result.response.usageMetadata || {};
    const tokensIn = usage.promptTokenCount || 0;
    const tokensOut = usage.candidatesTokenCount || 0;
    const pricing = GEMINI_PRICING[modelName] || GEMINI_PRICING['gemini-2.5-flash'];
    const costoUsd = +(((tokensIn / 1e6) * pricing.in) + ((tokensOut / 1e6) * pricing.out)).toFixed(6);

    const payload = {
      texto,
      model: modelName,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      costo_usd: costoUsd,
    };
    cachedOeIA.set(cacheKey, payload);

    res.json({
      success: true,
      ...payload,
      latencia_ms: Date.now() - t0,
      cache_hit: false,
    });
  } catch (error) {
    console.error('[oe/diagnostico-ia] Error:', error);
    res.status(500).json({ success: false, error: error.message, latencia_ms: Date.now() - t0 });
  }
});

export default router;