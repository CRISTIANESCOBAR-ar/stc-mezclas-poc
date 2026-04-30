// Helpers para generación de narrativa
// Reescritos con UTF-8 limpio + salida markdown estructurada para el frontend.

// ─────────────────────────────────────────────────────────────────────────────
// formatOEParaPrompt: TEXTO PLANO para inyectar en el prompt de Gemini.
// (No se renderiza en pantalla; sirve solo como contexto de IA.)
// ─────────────────────────────────────────────────────────────────────────────
export function formatOEParaPrompt(oeData, lotesSorted) {
  if (!oeData || !oeData.length) return '';
  const n = (v) => Number(v) || 0;
  const f1 = (v) => v != null && !isNaN(Number(v)) ? Number(v).toFixed(1) : '–';
  const f0 = (v) => v != null && !isNaN(Number(v)) ? Math.round(Number(v)) : '–';
  const pctStr = (a, b) => n(a) === 0 ? '–' : `${Math.round((n(b) - n(a)) / n(a) * 100)}%`;

  const actual = lotesSorted[lotesSorted.length - 1];
  const ref0   = lotesSorted[0];

  const machineKeys = [...new Map(
    oeData.map(r => [`${r.maquina}|${r.item}|${r.lado}`, { maquina: r.maquina, item: r.item, lado: r.lado, desc_item: r.desc_item }])
  ).values()];

  const lines = [];
  for (const mk of machineKeys) {
    const maqRows = oeData.filter(r => r.maquina === mk.maquina && r.lado === mk.lado && r.item === mk.item);
    const refRow  = maqRows.find(r => Number(r.lote) === ref0);
    const actRow  = maqRows.find(r => Number(r.lote) === actual);
    const dispRow = actRow || maqRows[0];
    if (!dispRow) continue;

    const maqNum   = String(mk.maquina).slice(-2).replace(/^0+/, '');
    const ladoStr  = mk.lado === 'A' ? 'LP' : (mk.lado === 'B' ? 'LI' : (mk.lado || ''));
    const displayMaq = `${maqNum} ${ladoStr}`.trim();
    const titulo   = dispRow.titulo ? ` [${dispRow.titulo}]` : '';
    const pasadorStr = dispRow.pasador  ? ` Pasador=${dispRow.pasador}`  : '';
    const estirajStr = dispRow.estiraje_avg != null ? ` Est=${dispRow.estiraje_avg}` : '';

    if (refRow && actRow && refRow !== actRow) {
      lines.push(
        `  Máq.${displayMaq}${titulo} (${mk.desc_item}):${pasadorStr}${estirajStr}\n` +
        `    Prod.Inf: ${f1(refRow.prod_informada_avg)}→${f1(actRow.prod_informada_avg)} kg/h` +
        `  EficInf: ${f1(refRow.efic_informada_avg)}%→${f1(actRow.efic_informada_avg)}%` +
        `  EficCalc: ${f1(refRow.efic_avg)}%→${f1(actRow.efic_avg)}%` +
        `  RPM: ${f0(refRow.rpm_avg)}→${f0(actRow.rpm_avg)}` +
        `  RPM-Card: ${f0(refRow.rpm_card_avg)}→${f0(actRow.rpm_card_avg)}\n` +
        `    Nat: ${n(refRow.nat_total)}→${n(actRow.nat_total)}(${pctStr(refRow.nat_total, actRow.nat_total)})` +
        `  Mec%: ${f1(refRow.rob_mecanicos_pct)}→${f1(actRow.rob_mecanicos_pct)}` +
        `  N: ${n(refRow.n_total)}→${n(actRow.n_total)}` +
        `  S: ${n(refRow.s_total)}→${n(actRow.s_total)}` +
        `  L: ${n(refRow.l_total)}→${n(actRow.l_total)}` +
        `  T: ${n(refRow.t_total)}→${n(actRow.t_total)}` +
        `  MO: ${n(refRow.mo_total)}→${n(actRow.mo_total)}` +
        `  JP: ${n(refRow.jp_total)}→${n(actRow.jp_total)}` +
        `  JM: ${n(refRow.jm_total)}→${n(actRow.jm_total)}`
      );
    } else {
      const r = actRow || refRow || dispRow;
      lines.push(
        `  Máq.${displayMaq}${titulo} (${mk.desc_item}):${pasadorStr}${estirajStr}\n` +
        `    Prod.Inf: ${f1(r.prod_informada_avg)} kg/h` +
        `  EficInf: ${f1(r.efic_informada_avg)}%` +
        `  EficCalc: ${f1(r.efic_avg)}%` +
        `  RPM: ${f0(r.rpm_avg)}  RPM-Card: ${f0(r.rpm_card_avg)}\n` +
        `    Nat: ${n(r.nat_total)}  Mec%: ${f1(r.rob_mecanicos_pct)}` +
        `  N: ${n(r.n_total)} S: ${n(r.s_total)} L: ${n(r.l_total)}` +
        `  T: ${n(r.t_total)} MO: ${n(r.mo_total)} JP: ${n(r.jp_total)} JM: ${n(r.jm_total)}`
      );
    }
  }
  return lines.length ? `PRODUCCIÓN OE — KPIs DE EFICIENCIA Y CORTES DE PURGA:\n${lines.join('\n')}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// generarNarrativaLocal: emite MARKDOWN ESTRUCTURADO (mismo esqueleto que Gemini)
// con tablas para Comparativa Consolidada y Proveedores Clave.
// ─────────────────────────────────────────────────────────────────────────────
export function generarNarrativaLocal(rows, loteActual, proveedores = [], oeData = []) {
  const lotesSorted = [...new Set(rows.map(r => Number(r.mistura)))].sort((a, b) => a - b);
  const actual = loteActual ? Number(loteActual) : Math.max(...lotesSorted);
  const refs   = lotesSorted.filter(l => l !== actual);

  const f = (v, d = 2) => (v == null || isNaN(parseFloat(v))) ? '–' : parseFloat(v).toFixed(d);

  const getLote = (m) => ({
    hvi: rows.find(r => Number(r.mistura) === m) || {},
    hilos: rows.filter(r => Number(r.mistura) === m && r.ne != null),
  });
  const dataActual = getLote(actual);
  const dataRefs   = refs.map(getLote);
  const HilosActual = dataActual.hilos;

  // ── Semáforo global del lote actual ──
  let nivelGlobal = 'VERDE';
  const alertas = [];
  for (const h of HilosActual) {
    const ten = parseFloat(h.tenacidad);
    const elo = parseFloat(h.elongacion);
    const nps = parseFloat(h.neps_200);
    const cvm = parseFloat(h.cvm);
    if (!isNaN(ten) && ten < 14.5) { nivelGlobal = 'ROJO'; alertas.push(`Ne${h.ne}: Tenacidad crítica (${f(ten)} cN/tex < 14.5)`); }
    else if (!isNaN(ten) && ten < 16.0) { if (nivelGlobal === 'VERDE') nivelGlobal = 'AMARILLO'; alertas.push(`Ne${h.ne}: Tenacidad en zona de precaución (${f(ten)} cN/tex)`); }
    if (!isNaN(elo) && elo < 7.5) { if (nivelGlobal === 'VERDE') nivelGlobal = 'AMARILLO'; alertas.push(`Ne${h.ne}: Elongación ${f(elo)}% – riesgo rotura en Urdidora`); }
    if (!isNaN(nps) && nps > 700) { nivelGlobal = 'ROJO'; alertas.push(`Ne${h.ne}: Neps ${f(nps,1)}/km – riesgo en Índigo`); }
    if (!isNaN(cvm) && cvm > 13.0) { if (nivelGlobal === 'VERDE') nivelGlobal = 'AMARILLO'; alertas.push(`Ne${h.ne}: CVm% ${f(cvm)} – masa irregular`); }
  }

  const estadoLabel = {
    VERDE:    '✅ **APROBADO PARA CONTINUIDAD**',
    AMARILLO: '⚠️ **PRECAUCIÓN — REVISAR**',
    ROJO:     '🔴 **CRÍTICO — DETENER**',
  }[nivelGlobal];
  const conclusionBase = {
    VERDE:    `El Lote FIAC ${actual} cumple todos los umbrales críticos de aptitud para tejeduría.${refs.length ? ` Supera o iguala el desempeño de referencia (${refs.join('/')}).` : ''}`,
    AMARILLO: `El Lote FIAC ${actual} presenta valores fuera de rango en algunas variables; se recomienda monitoreo intensivo en los procesos afectados.`,
    ROJO:     `El Lote FIAC ${actual} registra valores críticos que requieren acción inmediata antes de continuar la producción.`,
  }[nivelGlobal];

  const refStr = refs.length > 0 ? refs.join(' / ') : 'sin referencia';

  // ── Comparativa consolidada (TABLA MARKDOWN) ──
  const varDefs = [
    { key: 'str',        label: 'STR (Tenacidad fibra)',      unit: 'g/tex',  src: 'hvi',  buenos: 27,  bad: 25,   inv: false, dec: 2 },
    { key: 'sci',        label: 'SCI (Índice hilabilidad)',   unit: '',       src: 'hvi',  buenos: 145, bad: 130,  inv: false, dec: 1 },
    { key: 'tenacidad',  label: 'Tenacidad hilo',             unit: 'cN/tex', src: 'hilo', buenos: 16,  bad: 14.5, inv: false, dec: 2 },
    { key: 'elongacion', label: 'Elongación hilo',            unit: '%',      src: 'hilo', buenos: 8,   bad: 7.5,  inv: false, dec: 2 },
    { key: 'cvm',        label: 'CVm% (Irregularidad)',       unit: '%',      src: 'hilo', buenos: 12,  bad: 13,   inv: true,  dec: 2 },
    { key: 'neps_200',   label: 'Neps +200%',                 unit: '/km',    src: 'hilo', buenos: 500, bad: 700,  inv: true,  dec: 1 },
  ];

  const getVar = (loteData, vd) => {
    if (vd.src === 'hvi') {
      const v = parseFloat(loteData.hvi[vd.key]);
      return isNaN(v) ? null : v;
    }
    const vals = loteData.hilos.map(h => parseFloat(h[vd.key])).filter(v => !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const desc = (v, vd) => {
    if (v == null) return '–';
    if (vd.inv) return v <= vd.buenos ? '✅' : v <= vd.bad ? '⚠️' : '🔴';
    return v >= vd.buenos ? '✅' : v >= vd.bad ? '⚠️' : '🔴';
  };

  const compHeader = ['Métrica', ...refs.map(r => `Lote ${r}`), `Lote ${actual} (actual)`, 'Δ%', 'Estado'];
  const compAlign  = ['---', ...refs.map(() => '---:'), '---:', '---:', ':---:'];
  const compRows   = [];
  for (const vd of varDefs) {
    const valsRef = dataRefs.map(d => getVar(d, vd));
    const valAct  = getVar(dataActual, vd);
    if (valAct == null && valsRef.every(v => v == null)) continue;

    let deltaCell = '–';
    if (valAct != null && valsRef[0] != null && valsRef[0] !== 0) {
      const d = valAct - valsRef[0];
      const p = (d / Math.abs(valsRef[0])) * 100;
      const arrow = d > 0.001 ? '↑' : d < -0.001 ? '↓' : '=';
      deltaCell = `${arrow} ${(d >= 0 ? '+' : '')}${p.toFixed(1)}%`;
    }
    const fmt = (v) => v == null ? '–' : `${f(v, vd.dec)}${vd.unit ? ' ' + vd.unit : ''}`;
    compRows.push([
      `**${vd.label}**`,
      ...valsRef.map(v => fmt(v)),
      `**${fmt(valAct)}**`,
      deltaCell,
      desc(valAct, vd),
    ]);
  }
  const tablaComparativa = compRows.length ? [
    '| ' + compHeader.join(' | ') + ' |',
    '|' + compAlign.map(a => ` ${a} `).join('|') + '|',
    ...compRows.map(r => '| ' + r.join(' | ') + ' |'),
  ] : ['_(Sin datos comparativos disponibles.)_'];

  // ── Proveedores clave (TABLA MARKDOWN) ──
  const provActual = (proveedores || []).filter(p => Number(p.mistura) === actual);
  const totalFardos = provActual.reduce((s, p) => s + (Number(p.fardos_consumidos) || 0), 0);

  let bloqueProveedores = ['## 📦 Proveedores Clave', '_(Sin datos de proveedores para este lote.)_', ''];
  if (provActual.length > 0) {
    const withStr  = provActual.filter(p => p.str  != null && !isNaN(parseFloat(p.str)));
    const withSci  = provActual.filter(p => p.sci  != null && !isNaN(parseFloat(p.sci)));
    const withMic  = provActual.filter(p => p.mic  != null && !isNaN(parseFloat(p.mic)));
    const withUhml = provActual.filter(p => p.uhml != null && !isNaN(parseFloat(p.uhml)));
    const best  = (arr, key) => arr.length ? arr.reduce((a, b) => parseFloat(a[key]) >= parseFloat(b[key]) ? a : b) : null;
    const worst = (arr, key) => arr.length ? arr.reduce((a, b) => parseFloat(a[key]) <= parseFloat(b[key]) ? a : b) : null;
    const micDist  = p => Math.abs(parseFloat(p.mic) - 4.2);
    const bestMic  = withMic.length ? withMic.reduce((a, b) => micDist(a) <= micDist(b) ? a : b) : null;
    const worstMic = withMic.length ? withMic.reduce((a, b) => micDist(a) >= micDist(b) ? a : b) : null;
    const micOutOfRange = withMic.filter(p => { const v = parseFloat(p.mic); return v < 3.5 || v > 4.9; });

    const obs = [];
    if (best(withStr, 'str') && worst(withStr, 'str') && best(withStr, 'str').produtor !== worst(withStr, 'str').produtor) {
      const b = best(withStr, 'str'), w = worst(withStr, 'str');
      obs.push(`- 🏆 **Mejor STR**: ${b.produtor} (${f(b.str)} g/tex) — fibra más resistente para hilatura.`);
      obs.push(`- ⚠️ **Peor STR**: ${w.produtor} (${f(w.str)} g/tex)${parseFloat(w.str) < 25 ? ' — por debajo del límite crítico (25 g/tex).' : ' — monitorear impacto en tenacidad del hilo.'}`);
    }
    if (best(withSci, 'sci') && worst(withSci, 'sci') && best(withSci, 'sci').produtor !== worst(withSci, 'sci').produtor) {
      const b = best(withSci, 'sci'), w = worst(withSci, 'sci');
      obs.push(`- 🏆 **Mejor SCI**: ${b.produtor} (${f(b.sci, 1)}) — mayor índice de hilabilidad, menos paradas esperadas.`);
      obs.push(`- ⚠️ **Peor SCI**: ${w.produtor} (${f(w.sci, 1)})${parseFloat(w.sci) < 130 ? ' — riesgo de inestabilidad en hilatura.' : '.'}`);
    }
    if (bestMic && worstMic && bestMic.produtor !== worstMic.produtor) {
      obs.push(`- 🏆 **MIC más en rango (3.5–4.9)**: ${bestMic.produtor} (${f(bestMic.mic, 3)}).`);
      if (micOutOfRange.length) {
        obs.push(`- ⚠️ **MIC fuera de rango**: ${micOutOfRange.map(p => `${p.produtor} ${f(p.mic, 3)}`).join(', ')}.`);
      } else {
        obs.push(`- ⚠️ **MIC más alejado del centro**: ${worstMic.produtor} (${f(worstMic.mic, 3)}).`);
      }
    }
    if (best(withUhml, 'uhml') && worst(withUhml, 'uhml') && best(withUhml, 'uhml').produtor !== worst(withUhml, 'uhml').produtor) {
      const b = best(withUhml, 'uhml'), w = worst(withUhml, 'uhml');
      obs.push(`- 🏆 **UHML más largo**: ${b.produtor} (${f(b.uhml)} mm) — fibra más larga, menor neps y mejor resistencia.`);
      obs.push(`- ⚠️ **UHML más corto**: ${w.produtor} (${f(w.uhml)} mm)${parseFloat(w.uhml) < 25 ? ' — longitud crítica.' : '.'}`);
    }

    bloqueProveedores = [
      '## 📦 Proveedores Clave',
      `Para el Lote FIAC ${actual} (${totalFardos} fardos):`,
      '',
      '| Proveedor | Fardos | % | STR (g/tex) | SCI | MIC | UHML (mm) |',
      '|---|---:|---:|---:|---:|---:|---:|',
      ...provActual.map(p => {
        const fardos = Number(p.fardos_consumidos) || 0;
        const pct    = totalFardos > 0 ? ((fardos / totalFardos) * 100).toFixed(1) + '%' : '–';
        const strV   = p.str  != null ? f(p.str)     : '–';
        const sciV   = p.sci  != null ? f(p.sci, 1)  : '–';
        const micV   = p.mic  != null ? f(p.mic, 3)  : '–';
        const uhmlV  = p.uhml != null ? f(p.uhml)    : '–';
        return `| ${p.produtor} | ${fardos} | ${pct} | ${strV} | ${sciV} | ${micV} | ${uhmlV} |`;
      }),
      '',
      ...(obs.length ? ['### Observaciones', ...obs, ''] : []),
    ];
  }

  // ── Detalle técnico por Ne ──
  const MATRIZ = {
    '7':    { app: 'Trama',    dest: ['TELAR'],                          sciMin: 115, strMin: 24, umb: { tenacidad: { ok: 14.0, t: 'min' }, cvm: { ok: 13.5, t: 'max' }, neps_200: { ok: 700, t: 'max' } } },
    '9':    { app: 'Trama',    dest: ['TELAR'],                          sciMin: 120, strMin: 25, umb: { tenacidad: { ok: 14.5, t: 'min' }, cvm: { ok: 13.0, t: 'max' }, neps_200: { ok: 600, t: 'max' } } },
    '10':   { app: 'Urdimbre', dest: ['URDIDORA','INDIGO','TELAR'],      sciMin: 130, strMin: 26, umb: { tenacidad: { ok: 16.0, t: 'min' }, elongacion: { ok: 8.0, t: 'min' }, cvm: { ok: 12.0, t: 'max' }, neps_200: { ok: 500, t: 'max' } } },
    '12.5': { app: 'Urdimbre', dest: ['URDIDORA','INDIGO','TELAR'],      sciMin: 135, strMin: 27, umb: { tenacidad: { ok: 16.5, t: 'min' }, elongacion: { ok: 8.0, t: 'min' }, cvm: { ok: 11.5, t: 'max' }, neps_200: { ok: 450, t: 'max' } } },
    '14':   { app: 'Urdimbre', dest: ['URDIDORA','INDIGO','TELAR'],      sciMin: 140, strMin: 28, umb: { tenacidad: { ok: 17.0, t: 'min' }, elongacion: { ok: 8.5, t: 'min' }, cvm: { ok: 11.0, t: 'max' }, neps_200: { ok: 400, t: 'max' } } },
  };
  const bloqueAuditoria = [];
  if (HilosActual.length > 0) {
    bloqueAuditoria.push('## 🧵 Detalle Técnico por Ne', '');
    for (const h of HilosActual) {
      const ne = String(h.ne);
      const nN = parseFloat(ne);
      const mK = Object.keys(MATRIZ).find(k => Math.abs(parseFloat(k) - nN) < 0.1);
      const m = mK ? MATRIZ[mK] : null;
      const app = m?.app || (nN <= 9 ? 'Trama' : 'Urdimbre');
      const dest = m?.dest || (nN <= 9 ? ['TELAR'] : ['URDIDORA','INDIGO','TELAR']);
      const desvios = [];
      if (m?.umb) {
        for (const [k, u] of Object.entries(m.umb)) {
          const v = h[k] != null ? parseFloat(h[k]) : null;
          if (v == null) continue;
          const fail = u.t === 'min' ? v < u.ok : v > u.ok;
          if (fail) desvios.push(`${k === 'cvm' ? 'CVm%' : k === 'neps_200' ? 'Neps' : k === 'tenacidad' ? 'Tenac.' : k === 'elongacion' ? 'Elong.' : k} ${f(v)} ${u.t === 'min' ? '<' : '>'} ${u.ok}`);
        }
      }
      const estado = desvios.length ? '🔴 **Rechazado**' : '✅ **Aprobado**';
      const procs = dest.map(p => `${p}${desvios.length ? ' ⚠️' : ' ✅'}`).join(' → ');
      const maqStr = h.maquinas_uster ? ` _(${h.maquinas_uster})_` : '';
      bloqueAuditoria.push(`### Ne ${ne} — ${app}${maqStr}`);
      bloqueAuditoria.push(`Ruta: ${procs} — ${estado}${desvios.length ? ` — Desvío: ${desvios.join(', ')}` : ''}`);
      const ten = h.tenacidad != null ? parseFloat(h.tenacidad) : null;
      const cvm = h.cvm != null ? parseFloat(h.cvm) : null;
      const elo = h.elongacion != null ? parseFloat(h.elongacion) : null;
      if (ten != null) {
        if (ten >= 18) bloqueAuditoria.push(`> 💬 "Va sobrado de fuerza (${f(ten)} cN/tex). Sin drama en ningún proceso."`);
        else if (ten < 14.5) bloqueAuditoria.push(`> 💬 "Tenacidad crítica. Alta probabilidad de rotura."`);
      }
      if (app === 'Trama' && cvm != null && cvm > 13) bloqueAuditoria.push(`> 💬 "La masa viene bailando (CVm ${f(cvm)}%). Riesgo de barras en tela."`);
      if (app === 'Urdimbre' && elo != null && elo < 7.5) bloqueAuditoria.push(`> 💬 "Elongación baja. El hilo no perdona en la Urdidora."`);
      bloqueAuditoria.push('');
    }
  }

  // ── Producción OE ──
  const bloqueOE = buildBloqueOE(oeData, lotesSorted);
  const bloqueOEFmt = bloqueOE.length
    ? ['## 🔗 Correlación con Producción OE', '', '```', ...bloqueOE, '```', '']
    : [];

  // ── Plan de acción ──
  const planLines = alertas.length
    ? alertas.map(a => `- ⚠️ ${a}`)
    : ['- ✓ Sin alertas críticas en el lote actual.'];

  // ── Estado operativo (texto final) ──
  const estadoTexto = (() => {
    const lf = actual;
    const mr = dataActual.hvi.n_fardos != null ? `${dataActual.hvi.n_fardos} fardos consumidos` : '– fardos';
    const ms = dataActual.hvi.n_secuencias != null ? `${dataActual.hvi.n_secuencias} secuencias de blendomat` : '';
    const mreal = dataActual.hvi.mistura_real ? ` (Mistura interna ${dataActual.hvi.mistura_real})` : '';
    if (HilosActual.length === 0) return `Solo se disponen de datos HVI para el Lote FIAC ${lf}${mreal}; los datos de ensayos de hilo están pendientes.`;
    return `El Lote FIAC ${lf}${mreal} tiene ${mr}${ms ? ' y ' + ms : ''} asociadas.`;
  })();

  // ── Ensamblado final (markdown) ──
  const out = [
    `# 📋 Informe de Desempeño: Lote FIAC ${actual} vs ${refStr}`,
    `Análisis comparativo Fibra ↔ Hilo`,
    '',
    '## 🚦 Resumen Ejecutivo',
    conclusionBase,
    '',
    '## 📊 Comparativa Consolidada',
    '',
    ...tablaComparativa,
    '',
    ...bloqueProveedores,
    ...bloqueAuditoria,
    ...bloqueOEFmt,
    '## 🛠 Plan de Acción Priorizado (24 h)',
    ...planLines,
    '',
    '## 🚀 Estado Operativo',
    estadoLabel,
    '',
    estadoTexto,
    '',
    `_Informe generado localmente · ${new Date().toLocaleString('es-AR')}_`,
  ];

  return out.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// buildBloqueOE: TEXTO PLANO con tabla ASCII para bloque OE.
// Lo envuelve generarNarrativaLocal en un bloque ``` para preservar formato.
// ─────────────────────────────────────────────────────────────────────────────
export function buildBloqueOE(oeData, lotesSorted) {
  if (!oeData || !oeData.length) return [];
  const numV = (v) => Number(v) || 0;
  const tipos = [
    { key: 'nat_total', label: 'Naturales' },
    { key: 'n_total',   label: 'N (Neps)' },
    { key: 's_total',   label: 'S (Cortos)' },
    { key: 'l_total',   label: 'L (Largos)' },
    { key: 't_total',   label: 'T (Finos)' },
    { key: 'mo_total',  label: 'MO (Moiré)' },
    { key: 'jp_total',  label: 'JP (P+)' },
    { key: 'jm_total',  label: 'JM (P-)' },
  ];
  const machineKeys = [...new Map(
    oeData.map(r => [`${r.maquina}|${r.item}|${r.lado}`, { maquina: r.maquina, item: r.item, lado: r.lado, desc_item: r.desc_item }])
  ).values()];
  const lines = [];
  lines.push('Cortes de purga Open End — totales acumulados por período analizado');
  lines.push('');
  for (const mk of machineKeys) {
    const maqRows = oeData.filter(r => r.maquina === mk.maquina && r.lado === mk.lado && r.item === mk.item);
    const lotesConDatos = lotesSorted.filter(l => maqRows.some(r => Number(r.lote) === l));
    if (!lotesConDatos.length) continue;
    const maqNum = String(mk.maquina).slice(-2).replace(/^0+/, '');
    const ladoStr = mk.lado === 'A' ? 'LP' : (mk.lado === 'B' ? 'LI' : (mk.lado || ''));
    const displayMaq = `${maqNum} ${ladoStr}`.trim();
    lines.push(`Máq. ${displayMaq} — ${mk.desc_item || mk.item}:`);
    const loteHeader = lotesConDatos.map(l => `L.${l}`.padStart(7)).join(' |');
    lines.push(`  ${'Tipo'.padEnd(12)} |${loteHeader}`);
    for (const ct of tipos) {
      const vals = lotesConDatos.map(l => {
        const row = maqRows.find(r => Number(r.lote) === l);
        return row ? numV(row[ct.key]) : null;
      });
      if (vals.filter(v => v !== null).every(v => v === 0)) continue;
      const valStr = vals.map(v => (v === null ? '      –' : String(v).padStart(7))).join(' |');
      let trend = '';
      const numericVals = vals.filter(v => v !== null);
      if (numericVals.length >= 2) {
        const first = numericVals[0], last = numericVals[numericVals.length - 1];
        if (first > 0) {
          const p = Math.round((last - first) / first * 100);
          trend = last < first ? ` ⬇️ Mejoró (${p}%)` : last > first ? ` ⬆️ Empeoró (+${p}%)` : ' = Sin cambio';
        }
      }
      lines.push(`  ${ct.label.padEnd(12)} |${valStr}${trend}`);
    }
    const eficStr = lotesConDatos.map(l => {
      const row = maqRows.find(r => Number(r.lote) === l);
      return (row && row.efic_avg != null) ? `${row.efic_avg}%`.padStart(7) : '      –';
    }).join(' |');
    lines.push(`  ${'Efic. Prom.'.padEnd(12)} |${eficStr}`);
    lines.push('');
  }
  return lines;
}
