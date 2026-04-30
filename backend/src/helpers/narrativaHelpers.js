// Helpers para generación de narrativa - portados desde legacy server.js

// Auto-extracted helpers from legacy server.js

export function formatOEParaPrompt(oeData, lotesSorted) {
  if (!oeData || !oeData.length) return '';
  const n = (v) => Number(v) || 0;
  const f1 = (v) => v != null && !isNaN(Number(v)) ? Number(v).toFixed(1) : 'â€“';
  const f0 = (v) => v != null && !isNaN(Number(v)) ? Math.round(Number(v)) : 'â€“';
  const pctStr = (a, b) => n(a) === 0 ? 'â€“' : `${Math.round((n(b) - n(a)) / n(a) * 100)}%`;

  // Ãndice lote actual y de referencia
  const actual = lotesSorted[lotesSorted.length - 1];
  const ref0   = lotesSorted[0];

  // Agrupar por mÃ¡quina+item (combinaciÃ³n Ãºnica independiente del lote)
  const machineKeys = [...new Map(
    oeData.map(r => [`${r.maquina}|${r.item}|${r.lado}`, { maquina: r.maquina, item: r.item, lado: r.lado, desc_item: r.desc_item }])
  ).values()];

  const lines = [];
  for (const mk of machineKeys) {
    const maqRows = oeData.filter(r => r.maquina === mk.maquina && r.lado === mk.lado && r.item === mk.item);
    const refRow  = maqRows.find(r => Number(r.lote) === ref0);
    const actRow  = maqRows.find(r => Number(r.lote) === actual);

    // Mostrar lote actual aunque no tenga referencia
    const dispRow = actRow || maqRows[0];
    if (!dispRow) continue;

    const maqNum   = String(mk.maquina).slice(-2).replace(/^0+/, '');
    const ladoStr  = mk.lado === 'A' ? 'LP' : (mk.lado === 'B' ? 'LI' : (mk.lado || ''));
    const displayMaq = `${maqNum} ${ladoStr}`.trim();
    const titulo   = dispRow.titulo ? ` [${dispRow.titulo}]` : '';
    const pasadorStr = dispRow.pasador  ? ` Pasador=${dispRow.pasador}`  : '';
    const estirajStr = dispRow.estiraje_avg != null ? ` Est=${dispRow.estiraje_avg}` : '';

    if (refRow && actRow && refRow !== actRow) {
      // Comparativa ref â†’ actual
      lines.push(
        `  MÃ¡q.${displayMaq}${titulo} (${mk.desc_item}):${pasadorStr}${estirajStr}\n` +
        `    Prod.Inf: ${f1(refRow.prod_informada_avg)}â†’${f1(actRow.prod_informada_avg)} kg/h` +
        `  EficInf: ${f1(refRow.efic_informada_avg)}%â†’${f1(actRow.efic_informada_avg)}%` +
        `  EficCalc: ${f1(refRow.efic_avg)}%â†’${f1(actRow.efic_avg)}%` +
        `  RPM: ${f0(refRow.rpm_avg)}â†’${f0(actRow.rpm_avg)}` +
        `  RPM-Card: ${f0(refRow.rpm_card_avg)}â†’${f0(actRow.rpm_card_avg)}\n` +
        `    Nat: ${n(refRow.nat_total)}â†’${n(actRow.nat_total)}(${pctStr(refRow.nat_total, actRow.nat_total)})` +
        `  Mec%: ${f1(refRow.rob_mecanicos_pct)}â†’${f1(actRow.rob_mecanicos_pct)}` +
        `  N: ${n(refRow.n_total)}â†’${n(actRow.n_total)}` +
        `  S: ${n(refRow.s_total)}â†’${n(actRow.s_total)}` +
        `  L: ${n(refRow.l_total)}â†’${n(actRow.l_total)}` +
        `  T: ${n(refRow.t_total)}â†’${n(actRow.t_total)}` +
        `  MO: ${n(refRow.mo_total)}â†’${n(actRow.mo_total)}` +
        `  JP: ${n(refRow.jp_total)}â†’${n(actRow.jp_total)}` +
        `  JM: ${n(refRow.jm_total)}â†’${n(actRow.jm_total)}`
      );
    } else {
      // Solo un lote disponible
      const r = actRow || refRow || dispRow;
      lines.push(
        `  MÃ¡q.${displayMaq}${titulo} (${mk.desc_item}):${pasadorStr}${estirajStr}\n` +
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
  return lines.length ? `PRODUCCIÃ“N OE â€” KPIs DE EFICIENCIA Y CORTES DE PURGA:\n${lines.join('\n')}` : '';
}



export function generarNarrativaLocal(rows, loteActual, proveedores = [], oeData = []) {
  const lotesSorted = [...new Set(rows.map(r => Number(r.mistura)))].sort((a, b) => a - b);
  const actual = loteActual ? Number(loteActual) : Math.max(...lotesSorted);
  const refs   = lotesSorted.filter(l => l !== actual);

  const f = (v, d = 2) => (v == null || isNaN(parseFloat(v))) ? 'â€“' : parseFloat(v).toFixed(d);
  const pct = (a, b) => {
    if (a == null || b == null) return '';
    const d = parseFloat(b) - parseFloat(a);
    const p = (d / Math.abs(parseFloat(a))) * 100;
    return ` (${d >= 0 ? '+' : ''}${p.toFixed(1)}%)`;
  };

  // Agrupa por lote y obtiene primer registro HVI + todos los Ne
  const getLote = (m) => ({ hvi: rows.find(r => Number(r.mistura) === m) || {}, hilos: rows.filter(r => Number(r.mistura) === m && r.ne != null) });
  const dataActual = getLote(actual);
  const dataRefs   = refs.map(getLote);

  // Nivel de semÃ¡foro global del lote actual
  let nivelGlobal = 'VERDE';
  const alertas = [];
  for (const h of dataActual.hilos) {
    const ten = parseFloat(h.tenacidad);
    const elo = parseFloat(h.elongacion);
    const nps = parseFloat(h.neps_200);
    const cvm = parseFloat(h.cvm);
    if (!isNaN(ten) && ten < 14.5) { nivelGlobal = 'ROJO'; alertas.push(`Ne${h.ne}: Tenacidad crÃ­tica (${f(ten)} cN/tex < 14.5)`); }
    else if (!isNaN(ten) && ten < 16.0) { if (nivelGlobal === 'VERDE') nivelGlobal = 'AMARILLO'; alertas.push(`Ne${h.ne}: Tenacidad en zona de precauciÃ³n (${f(ten)} cN/tex)`); }
    if (!isNaN(elo) && elo < 7.5) { if (nivelGlobal === 'VERDE') nivelGlobal = 'AMARILLO'; alertas.push(`Ne${h.ne}: ElongaciÃ³n ${f(elo)}% â€“ riesgo rotura en Urdidora`); }
    if (!isNaN(nps) && nps > 700) { nivelGlobal = 'ROJO'; alertas.push(`Ne${h.ne}: Neps ${f(nps,1)}/km â€“ riesgo en Ãndigo`); }
    if (!isNaN(cvm) && cvm > 13.0) { if (nivelGlobal === 'VERDE') nivelGlobal = 'AMARILLO'; alertas.push(`Ne${h.ne}: CVm% ${f(cvm)} â€“ masa irregular`); }
  }

  const estadoLabel = { VERDE: 'âœ… APROBADO PARA CONTINUIDAD', AMARILLO: 'âš ï¸ PRECAUCIÃ“N â€“ REVISAR', ROJO: 'ðŸ”´ CRÃTICO â€“ DETENER' }[nivelGlobal];
  const conclusionBase = {
    VERDE: `El Lote FIAC ${actual} cumple todos los umbrales crÃ­ticos de aptitud para tejedurÃ­a.${refs.length ? ` Supera o iguala el desempeÃ±o de referencia (${refs.join('/')}).` : ''}`,
    AMARILLO: `El Lote FIAC ${actual} presenta valores fuera de rango en algunas variables; se recomienda monitoreo intensivo en los procesos afectados.`,
    ROJO: `El Lote FIAC ${actual} registra valores crÃ­ticos que requieren acciÃ³n inmediata antes de continuar la producciÃ³n.`
  }[nivelGlobal];

  // Genera comparativas por variable
  let numVar = 0;
  const bloques = [];

  const varDefs = [
    { key: 'str',       label: 'STR â€” Tenacidad Fibra', unit: 'g/tex', src: 'hvi', buenos: 27, bad: 25, inv: false },
    { key: 'sci',       label: 'SCI â€” Ãndice Hilabilidad', unit: '',   src: 'hvi', buenos: 145, bad: 130, inv: false },
    { key: 'tenacidad', label: 'Tenacidad Hilo', unit: 'cN/tex',       src: 'hilo', buenos: 16, bad: 14.5, inv: false },
    { key: 'elongacion',label: 'ElongaciÃ³n Hilo', unit: '%',           src: 'hilo', buenos: 8,  bad: 7.5,  inv: false },
    { key: 'cvm',       label: 'CVm% â€” Irregularidad de Masa', unit: '%', src: 'hilo', buenos: 12, bad: 13, inv: true },
    { key: 'neps_200',  label: 'Neps +200%', unit: '/km',              src: 'hilo', buenos: 500, bad: 700, inv: true },
  ];

  const emojis = ['1ï¸âƒ£','2ï¸âƒ£','3ï¸âƒ£','4ï¸âƒ£','5ï¸âƒ£','6ï¸âƒ£'];

  for (const vd of varDefs) {
    const getVal = (loteData) => {
      if (vd.src === 'hvi') return parseFloat(loteData.hvi[vd.key]);
      // Para hilo: promedio de todos los Ne
      const vals = loteData.hilos.map(h => parseFloat(h[vd.key])).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b) / vals.length : NaN;
    };

    const valActual = getVal(dataActual);
    if (isNaN(valActual)) continue;

    const descriptor = (val, inv) => {
      if (isNaN(val)) return 'â€“';
      const good = vd.buenos, bad2 = vd.bad;
      if (inv) return val <= good ? 'âœ… Ã“ptimo' : val <= bad2 ? 'âš ï¸ PrecauciÃ³n' : 'ðŸ”´ CrÃ­tico';
      return val >= good ? 'âœ… Ã“ptimo' : val >= bad2 ? 'âš ï¸ PrecauciÃ³n' : 'ðŸ”´ CrÃ­tico';
    };

    numVar++;
    let bloque = `${emojis[numVar-1] || `${numVar}.`} ${vd.label.toUpperCase()}:\n`;
    for (const rd of dataRefs) {
      const v = getVal(rd);
      bloque += `  â€¢ Lote ${refs[dataRefs.indexOf(rd)]}: ${isNaN(v) ? '(sin datos)' : `${f(v)} ${vd.unit} ${descriptor(v, vd.inv)}`}\n`;
    }
    bloque += `  â€¢ Lote ${actual}: ${f(valActual)} ${vd.unit} ${descriptor(valActual, vd.inv)}\n`;

    // Trend vs primer ref
    if (dataRefs.length > 0) {
      const vRef = getVal(dataRefs[0]);
      if (!isNaN(vRef)) {
        const diff = valActual - vRef;
        const arrow = diff > 0.001 ? 'â†‘' : diff < -0.001 ? 'â†“' : '=';
        const mejor = vd.inv ? diff < 0 : diff > 0;
        const cambio = `${arrow} ${Math.abs(diff).toFixed(2)} ${vd.unit}${pct(vRef, valActual)}`;
        const impactoDesc = {
          tenacidad: vd.inv ? `Hilo mÃ¡s dÃ©bil, mayor riesgo de paradas en Telar.` : diff > 0.5 ? `Hilo significativamente mÃ¡s resistente, menor riesgo de rotura en Telar.` : diff > 0 ? `Leve mejora en resistencia.` : `Leve reducciÃ³n; monitorear en alta velocidad.`,
          elongacion: diff < 0 ? `Menor absorciÃ³n de impacto, mayor riesgo de rotura en Urdidora.` : `Mejor elasticidad, mÃ¡s tolerancia a la tensiÃ³n.`,
          cvm: diff < 0 ? `Masa mÃ¡s uniforme; menos irregularidad visual en la tela.` : `Mayor irregularidad de masa; posible barreado.`,
          neps_200: diff < 0 ? `Hilo mÃ¡s limpio; menos enredos y arrastre de colorante desigual en Ãndigo.` : `MÃ¡s impurezas; evaluar ajuste de cardas.`,
          str: diff > 0 ? `Fibra mÃ¡s resistente, impacto positivo directo en tenacidad del hilo.` : `ReducciÃ³n en tenacidad de fibra.`,
          sci: diff > 0 ? `Mayor consistencia de hilatura, menos paradas de rotura esperadas.` : `Menor Ã­ndice composite; revisar mezcla.`,
        }[vd.key] || '';
        bloque += `  ðŸ‘‰ VariaciÃ³n: ${cambio} (${mejor ? 'mejora' : 'empeora'}). ${impactoDesc}`;
      }
    }
    bloques.push(bloque);
  }

  // Puntos clave adicionales por Ne
  const puntosNe = [];
  const HilosActual = dataActual.hilos;
  for (const h of HilosActual) {
    const ten = parseFloat(h.tenacidad);
    const elo = parseFloat(h.elongacion);
    const nps = parseFloat(h.neps_200);
    if (!isNaN(ten) && ten >= 16.0) puntosNe.push(`ðŸ”¸ Ne${h.ne}: Tenacidad ${f(ten)} cN/tex â€” APTO telar alta velocidad.`);
    if (!isNaN(elo) && elo >= 8.0)  puntosNe.push(`ðŸ”¸ Ne${h.ne}: ElongaciÃ³n ${f(elo)}% â€” buena absorciÃ³n de impacto en Urdidora.`);
    if (!isNaN(nps) && nps < 200)   puntosNe.push(`ðŸ”¸ Ne${h.ne}: Neps ${f(nps,1)}/km â€” hilo muy limpio para Ãndigo.`);
  }

  // â”€â”€ AnÃ¡lisis por proveedor del lote actual â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const provActual = (proveedores || []).filter(p => Number(p.mistura) === actual);
  let bloqueProveedores = [];
  if (provActual.length > 0) {
    const totalFardos = provActual.reduce((s, p) => s + (Number(p.fardos_consumidos) || 0), 0);

    // Listas con valor numÃ©rico vÃ¡lido por variable
    const withStr  = provActual.filter(p => p.str  != null && !isNaN(parseFloat(p.str)));
    const withSci  = provActual.filter(p => p.sci  != null && !isNaN(parseFloat(p.sci)));
    const withMic  = provActual.filter(p => p.mic  != null && !isNaN(parseFloat(p.mic)));
    const withUhml = provActual.filter(p => p.uhml != null && !isNaN(parseFloat(p.uhml)));

    // STR / UHML / SCI: mayor = mejor
    const best  = (arr, key) => arr.length ? arr.reduce((a, b) => parseFloat(a[key]) >= parseFloat(b[key]) ? a : b) : null;
    const worst = (arr, key) => arr.length ? arr.reduce((a, b) => parseFloat(a[key]) <= parseFloat(b[key]) ? a : b) : null;
    // MIC: rango Ã³ptimo 3.5â€“4.9; mÃ¡s alejado del centro (4.2) = peor
    const micDist = p => Math.abs(parseFloat(p.mic) - 4.2);
    const bestMic  = withMic.length ? withMic.reduce((a, b) => micDist(a) <= micDist(b) ? a : b) : null;
    const worstMic = withMic.length ? withMic.reduce((a, b) => micDist(a) >= micDist(b) ? a : b) : null;
    const micOutOfRange = withMic.filter(p => { const v = parseFloat(p.mic); return v < 3.5 || v > 4.9; });

    const obs = [];
    if (best(withStr, 'str') && worst(withStr, 'str') && best(withStr, 'str').produtor !== worst(withStr, 'str').produtor) {
      const b = best(withStr, 'str'), w = worst(withStr, 'str');
      obs.push(`  ðŸ† STR mÃ¡s alto: ${b.produtor} (${f(b.str)} g/tex) â€” fibra mÃ¡s resistente para hilatura.`);
      obs.push(`  âš ï¸  STR mÃ¡s bajo: ${w.produtor} (${f(w.str)} g/tex)${parseFloat(w.str) < 25 ? ' â€” por debajo del lÃ­mite crÃ­tico (25 g/tex).' : ' â€” monitorear impacto en tenacidad del hilo.'}`);
    }
    if (best(withSci, 'sci') && worst(withSci, 'sci') && best(withSci, 'sci').produtor !== worst(withSci, 'sci').produtor) {
      const b = best(withSci, 'sci'), w = worst(withSci, 'sci');
      obs.push(`  ðŸ† SCI mÃ¡s alto: ${b.produtor} (${f(b.sci, 1)}) â€” mayor Ã­ndice de hilabilidad, menos paradas esperadas.`);
      obs.push(`  âš ï¸  SCI mÃ¡s bajo: ${w.produtor} (${f(w.sci, 1)})${parseFloat(w.sci) < 130 ? ' â€” riesgo de inestabilidad en hilatura.' : '.'}`);
    }
    if (bestMic && worstMic && bestMic.produtor !== worstMic.produtor) {
      obs.push(`  ðŸ† MIC Ã³ptimo:   ${bestMic.produtor} (${f(bestMic.mic, 3)}) â€” finura mÃ¡s cercana al rango ideal (3.5â€“4.9).`);
      if (micOutOfRange.length) {
        obs.push(`  âš ï¸  MIC fuera de rango (3.5â€“4.9): ${micOutOfRange.map(p => `${p.produtor} ${f(p.mic, 3)}`).join(', ')}.`);
      } else {
        obs.push(`  âš ï¸  MIC mÃ¡s alejado del centro: ${worstMic.produtor} (${f(worstMic.mic, 3)}).`);
      }
    }
    if (best(withUhml, 'uhml') && worst(withUhml, 'uhml') && best(withUhml, 'uhml').produtor !== worst(withUhml, 'uhml').produtor) {
      const b = best(withUhml, 'uhml'), w = worst(withUhml, 'uhml');
      obs.push(`  ðŸ† UHML mÃ¡s largo: ${b.produtor} (${f(b.uhml)} mm) â€” fibra mÃ¡s larga, menor neps y mejor resistencia.`);
      obs.push(`  âš ï¸  UHML mÃ¡s corto: ${w.produtor} (${f(w.uhml)} mm)${parseFloat(w.uhml) < 25 ? ' â€” longitud crÃ­tica.' : '.'}`);
    }

    bloqueProveedores = [
      `ðŸ“¦ PROVEEDORES CLAVE`,
      ...provActual.map(p => {
        const fardos = Number(p.fardos_consumidos) || 0;
        const pct    = totalFardos > 0 ? ((fardos / totalFardos) * 100).toFixed(1) : 'â€“';
        const strVal = p.str  != null ? `STR ${f(p.str)} g/tex` : '';
        const sciVal = p.sci  != null ? `SCI ${f(p.sci, 1)}`     : '';
        const micVal = p.mic  != null ? `MIC ${f(p.mic, 3)}`     : '';
        const uhmlVal= p.uhml != null ? `UHML ${f(p.uhml)} mm`   : '';
        const hvi = [strVal, sciVal, micVal, uhmlVal].filter(Boolean).join(' | ');
        return `  â€¢ ${String(p.produtor).padEnd(16)} ${String(fardos).padStart(4)} fardos (${String(pct).padStart(5)}%)  ${hvi}`;
      }),
      ...(obs.length ? [``, `  ðŸ“Œ Observaciones:`, ...obs] : []),
      ``,
    ];
  }

  const refStr = refs.length > 0 ? refs.join('/') : 'sin referencia';

  // â”€â”€ AuditorÃ­a de Aptitud por Proceso (texto) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MATRIZ = {
    '7':    { app: 'Trama',    dest: ['TELAR'],                          sciMin: 115, strMin: 24, umb: { tenacidad: { ok: 14.0, t: 'min' }, cvm: { ok: 13.5, t: 'max' }, neps_200: { ok: 700, t: 'max' } } },
    '9':    { app: 'Trama',    dest: ['TELAR'],                          sciMin: 120, strMin: 25, umb: { tenacidad: { ok: 14.5, t: 'min' }, cvm: { ok: 13.0, t: 'max' }, neps_200: { ok: 600, t: 'max' } } },
    '10':   { app: 'Urdimbre', dest: ['URDIDORA','INDIGO','TELAR'],      sciMin: 130, strMin: 26, umb: { tenacidad: { ok: 16.0, t: 'min' }, elongacion: { ok: 8.0, t: 'min' }, cvm: { ok: 12.0, t: 'max' }, neps_200: { ok: 500, t: 'max' } } },
    '12.5': { app: 'Urdimbre', dest: ['URDIDORA','INDIGO','TELAR'],      sciMin: 135, strMin: 27, umb: { tenacidad: { ok: 16.5, t: 'min' }, elongacion: { ok: 8.0, t: 'min' }, cvm: { ok: 11.5, t: 'max' }, neps_200: { ok: 450, t: 'max' } } },
    '14':   { app: 'Urdimbre', dest: ['URDIDORA','INDIGO','TELAR'],      sciMin: 140, strMin: 28, umb: { tenacidad: { ok: 17.0, t: 'min' }, elongacion: { ok: 8.5, t: 'min' }, cvm: { ok: 11.0, t: 'max' }, neps_200: { ok: 400, t: 'max' } } },
  };
  const bloqueAuditoria = [];
  if (dataActual.hilos.length > 0) {
    bloqueAuditoria.push(`ðŸ§µ DETALLE TÃ‰CNICO POR NE:`);
    for (const h of dataActual.hilos) {
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
      const estado = desvios.length ? 'ðŸ”´ Rechazado' : 'âœ… Aprobado';
      const procs = dest.map(p => `${p}${desvios.length ? ' âš ï¸' : ' âœ…'}`).join(' â†’ ');
      const maqStr = h.maquinas_uster ? ` en mÃ¡quinas ${h.maquinas_uster}` : '';
      bloqueAuditoria.push(`  Ne ${ne}${maqStr} [${app}] â†’ ${procs} â€” ${estado}${desvios.length ? ' â€” DesvÃ­o: ' + desvios.join(', ') : ''}`);
 // Comentario de planta
      const ten = h.tenacidad != null ? parseFloat(h.tenacidad) : null;
      const cvm = h.cvm != null ? parseFloat(h.cvm) : null;
      const elo = h.elongacion != null ? parseFloat(h.elongacion) : null;
      if (ten != null) {
        if (ten >= 18) bloqueAuditoria.push(`    ðŸ’¬ "Va sobrado de fuerza (${f(ten)} cN/tex). Sin drama en ningÃºn proceso."`);
        else if (ten < 14.5) bloqueAuditoria.push(`    ðŸ’¬ "Tenacidad crÃ­tica. Alta probabilidad de rotura."`);
      }
      if (app === 'Trama' && cvm != null && cvm > 13) bloqueAuditoria.push(`    ðŸ’¬ "La masa viene bailando (CVm ${f(cvm)}%). Riesgo de barras en tela."`);
      if (app === 'Urdimbre' && elo != null && elo < 7.5) bloqueAuditoria.push(`    ðŸ’¬ "ElongaciÃ³n baja. El hilo no perdona en la Urdidora."`);
    }
    bloqueAuditoria.push('');
  }

  const bloqueOE = buildBloqueOE(oeData, lotesSorted);

  const lines = [
    `ðŸ“‹ INFORME DE DESEMPEÃ‘O: LOTE FIAC ${actual} vs ${refStr}`,
    `AnÃ¡lisis Comparativo Fibra â†”ï¸ Hilo`,
    ``,
    `ðŸš¦ RESUMEN EJECUTIVO:`,
    conclusionBase,
    ``,
    `ðŸ“Š COMPARATIVA CONSOLIDADA:`,
    ``,
    ...bloques.flatMap(b => [b, '']),
    ...bloqueProveedores,
    ...bloqueAuditoria,
    ...bloqueOE,
    `ðŸ›  PLAN DE ACCIÃ“N PRIORIZADO (24h):`,
    ...(alertas.length
      ? alertas.map(a => `  âš ï¸ ${a}`)
      : ['  âœ“ Sin alertas crÃ­ticas en el lote actual.']),
    ...(puntosNe.length ? puntosNe : []),
    ``,
    `ðŸš€ ESTADO OPERATIVO:`,
    estadoLabel,
    (() => {
      const lf = actual;
      const mr = dataActual.hvi.n_fardos != null ? `${dataActual.hvi.n_fardos} fardos consumidos` : 'â€“ fardos';
      const ms = dataActual.hvi.n_secuencias != null ? `${dataActual.hvi.n_secuencias} secuencias de blendomat` : '';
      const mreal = dataActual.hvi.mistura_real ? ` (Mistura interna ${dataActual.hvi.mistura_real})` : '';
      if (HilosActual.length === 0) return `Solo se disponen de datos HVI para el Lote FIAC ${lf}${mreal}; los datos de ensayos de hilo estÃ¡n pendientes.`;
      return `El Lote FIAC ${lf}${mreal} tiene ${mr}${ms ? ' y ' + ms : ''} asociadas.`;
    })(),
    ``,
    `_Informe generado localmente Â· ${new Date().toLocaleString('es-AR')}_`,
  ];

  return lines.join('\n');
}

export function buildBloqueOE(oeData, lotesSorted) {
  if (!oeData || !oeData.length) return [];
  const numV = (v) => Number(v) || 0;
  const tipos = [
    { key: 'nat_total', label: 'Naturales' },
    { key: 'n_total',   label: 'N (Neps)' },
    { key: 's_total',   label: 'S (Cortos)' },
    { key: 'l_total',   label: 'L (Largos)' },
    { key: 't_total',   label: 'T (Finos)' },
    { key: 'mo_total',  label: 'MO (Moir\u00e9)' },
    { key: 'jp_total',  label: 'JP (P+)' },
    { key: 'jm_total',  label: 'JM (P-)' },
  ];
  const machineKeys = [...new Map(
    oeData.map(r => [`${r.maquina}|${r.item}|${r.lado}`, { maquina: r.maquina, item: r.item, lado: r.lado, desc_item: r.desc_item }])
  ).values()];
  const lines = [];
  lines.push('\uD83D\uDD17 CORRELACI\u00d3N CON PRODUCCI\u00d3N OE:');
  lines.push('Cortes de purga Open End \u2014 totales acumulados por per\u00edodo analizado');
  lines.push('');
  for (const mk of machineKeys) {
    const maqRows = oeData.filter(r => r.maquina === mk.maquina && r.lado === mk.lado && r.item === mk.item);
    const lotesConDatos = lotesSorted.filter(l => maqRows.some(r => Number(r.lote) === l));
    if (!lotesConDatos.length) continue;
    const maqNum = String(mk.maquina).slice(-2).replace(/^0+/, '');
    const ladoStr = mk.lado === 'A' ? 'LP' : (mk.lado === 'B' ? 'LI' : (mk.lado || ''));
    const displayMaq = `${maqNum} ${ladoStr}`.trim();
    lines.push(`  M\u00e1q. ${displayMaq} \u2014 ${mk.desc_item || mk.item}:`);
    const loteHeader = lotesConDatos.map(l => `L.${l}`.padStart(7)).join(' |');
    lines.push(`    ${'Tipo'.padEnd(12)} |${loteHeader}`);
    for (const ct of tipos) {
      const vals = lotesConDatos.map(l => {
        const row = maqRows.find(r => Number(r.lote) === l);
        return row ? numV(row[ct.key]) : null;
      });
      if (vals.filter(v => v !== null).every(v => v === 0)) continue;
      const valStr = vals.map(v => (v === null ? '      \u2013' : String(v).padStart(7))).join(' |');
      let trend = '';
      const numericVals = vals.filter(v => v !== null);
      if (numericVals.length >= 2) {
        const first = numericVals[0], last = numericVals[numericVals.length - 1];
        if (first > 0) {
          const p = Math.round((last - first) / first * 100);
          trend = last < first ? ` \u2B07\uFE0F Mejor\u00f3 (${p}%)` : last > first ? ` \u2B06\uFE0F Empeor\u00f3 (+${p}%)` : ' = Sin cambio';
        }
      }
      lines.push(`    ${ct.label.padEnd(12)} |${valStr}${trend}`);
    }
    const eficStr = lotesConDatos.map(l => {
      const row = maqRows.find(r => Number(r.lote) === l);
      return (row && row.efic_avg != null) ? `${row.efic_avg}%`.padStart(7) : '      \u2013';
    }).join(' |');
    lines.push(`    ${'Efic. Prom.'.padEnd(12)} |${eficStr}`);
    lines.push('');
  }
  return lines;
}

