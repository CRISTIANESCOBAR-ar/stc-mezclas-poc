<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <main class="flex-1 p-4 md:p-8 pb-24 md:pb-8 space-y-4">
      <section class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-slate-800 inline-flex items-center gap-2">
              <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.75c.75.5 1.25 1.25 1.4 2.1h5.2c.15-.85.65-1.6 1.4-2.1A7 7 0 0012 2z"/>
              </svg>
              <span>Reporte Estratégico de Hilandería</span>
            </h1>
            <p class="text-sm text-gray-500 mt-1">Lectura ejecutiva simple con foco en productividad, calidad y acciones.</p>
          </div>

          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[auto_auto_auto_auto] xl:items-end">
            <div class="min-w-[150px]">
              <label class="block text-xs font-semibold text-gray-500 mb-1">Fecha trazabilidad</label>
              <CustomDatepicker
                v-model="filtros.fecha"
                :show-buttons="false"
                placeholder="Fecha"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Lote (opcional)</label>
              <input
                v-model="filtros.lote"
                type="text"
                placeholder="ej. 115"
                class="rounded-lg border border-gray-200 px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1">Ne (opcional)</label>
              <input
                v-model="filtros.ne"
                type="text"
                placeholder="ej. 10"
                class="rounded-lg border border-gray-200 px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <button
              @click="generarReporte"
              :disabled="loadingReporte || !filtros.fecha"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {{ loadingReporte ? 'Generando reporte...' : 'Generar reporte' }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="error" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
        {{ error }}
      </section>

      <section v-if="reporte" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg md:text-xl font-black text-slate-800 tracking-tight">🧶 {{ reporte.titulo }}</h2>
            <p class="text-sm text-slate-500 mt-1">📅 Fecha: {{ reporte.fechaLabel }} | 🤖 Análisis: Cruce Laboratorio vs Planta</p>
          </div>
          <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="reporte.estadoColor">
            {{ reporte.estadoLabel }}
          </span>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            @click="compartirWhatsApp"
            class="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors"
          >
            {{ whatsappState === 'success' ? '✓ Copiado para WhatsApp' : '📋 Copiar para WhatsApp' }}
          </button>

          <button
            @click="compartirCorreo"
            class="px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors"
          >
            Abrir correo
          </button>

          <button
            @click="copiarJsonCompartible"
            :disabled="!payloadObj"
            class="px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors disabled:opacity-50"
          >
            {{ jsonShareState === 'success' ? 'JSON copiado' : 'Copiar JSON para otra IA' }}
          </button>
        </div>

        <div class="space-y-3">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 class="text-sm font-bold text-slate-800">📘 Reglas aplicadas</h3>
            <ul class="mt-2 space-y-1 text-sm text-slate-700">
              <li v-for="(regla, idx) in reporte.reglasAplicadas" :key="`regla-${idx}`">• {{ regla }}</li>
            </ul>
          </article>

          <article class="rounded-2xl border border-red-100 bg-red-50 p-4">
            <h3 class="text-sm font-bold text-red-800">🚨 1. EL "ELEFANTE EN LA HABITACIÓN"</h3>
            <p class="text-sm text-red-900 mt-2 whitespace-pre-line">{{ reporte.elefante }}</p>
          </article>

          <article class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <h3 class="text-sm font-bold text-amber-800">📊 2. COMPORTAMIENTO DE PURGA (ROBOS Y CORTES)</h3>
            <p class="text-sm text-amber-900 mt-2 whitespace-pre-line">{{ reporte.purga }}</p>
          </article>

          <article class="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <h3 class="text-sm font-bold text-cyan-800">🔬 3. LABORATORIO: PUNTO CIEGO DE TENSORAPID</h3>
            <p class="text-sm text-cyan-900 mt-2 whitespace-pre-line">{{ reporte.laboratorio }}</p>
          </article>

          <article class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h3 class="text-sm font-bold text-emerald-800">✅ 4. ACCIONES RECOMENDADAS</h3>
            <ol class="mt-2 space-y-1 text-sm text-emerald-900">
              <li v-for="(accion, idx) in reporte.acciones" :key="`accion-${idx}`">
                {{ idx + 1 }}. {{ accion }}
              </li>
            </ol>
          </article>
        </div>
      </section>

      <section v-if="!reporte && !loadingReporte" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-500">
        Seleccioná fecha/lote y tocá Generar reporte para ver el resumen ejecutivo.
      </section>

      <details v-if="payloadObj" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <summary class="cursor-pointer text-sm font-semibold text-slate-700">Ver JSON técnico (para auditoría y comparación IA)</summary>
        <pre class="mt-3 bg-gray-50 rounded-lg border border-gray-100 p-3 text-xs text-slate-700 max-h-72 overflow-auto whitespace-pre-wrap">{{ JSON.stringify(payloadObj, null, 2) }}</pre>
      </details>
    </main>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import CustomDatepicker from '../components/CustomDatepicker.vue';

function defaultYesterdayIso() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - 1);
  return base.toISOString().slice(0, 10);
}

function formatDateLabel(isoDate) {
  const raw = String(isoDate || '').trim();
  if (!raw) return 'S/D';
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseNeNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsFlame(row) {
  const titulo = String(row?.titulo_oe || '').toLowerCase();
  const neRaw = String(row?.ne || '').toLowerCase();
  return titulo.includes('flame') || neRaw.includes('flame');
}

function evalHigherIsBetter(value, warn, crit) {
  if (value == null) return { state: 'sin-dato', source: null };
  if (value < crit) return { state: 'crit', source: value };
  if (value < warn) return { state: 'warn', source: value };
  return { state: 'ok', source: value };
}

function evalLowerIsBetter(value, warn, crit) {
  if (value == null) return { state: 'sin-dato', source: null };
  if (value > crit) return { state: 'crit', source: value };
  if (value > warn) return { state: 'warn', source: value };
  return { state: 'ok', source: value };
}

function evalRange(value, minWarn, maxWarn, minCrit, maxCrit) {
  if (value == null) return { state: 'sin-dato', source: null };
  if (value < minCrit || value > maxCrit) return { state: 'crit', source: value };
  if (value < minWarn || value > maxWarn) return { state: 'warn', source: value };
  return { state: 'ok', source: value };
}

function computeEstadoFromEvaluations(evals, alertas = []) {
  const hasCrit = evals.some((entry) => entry.state === 'crit') || alertas.some((a) => a?.severity === 'alta');
  const hasWarn = evals.some((entry) => entry.state === 'warn') || alertas.some((a) => a?.severity === 'media');

  if (hasCrit) return { state: 'crit', decision: 'Rechazado' };
  if (hasWarn) return { state: 'warn', decision: 'Condicional' };
  return { state: 'ok', decision: 'Aprobado' };
}

function evaluarFilaDashboardStyle(row) {
  const neNum = parseNeNumber(row?.ne);
  const isFlame = parseIsFlame(row);
  const app = neNum != null && neNum <= 9 ? 'Trama' : isFlame ? 'Urdimbre Flame' : 'Urdimbre Liso';

  const cvm = toNumber(row?.cvm);
  const neps200 = toNumber(row?.neps_200);
  const tenacidad = toNumber(row?.tenacidad);
  const elongacion = toNumber(row?.elongacion);
  const mic = toNumber(row?.mic);

  const cvmWarn = isFlame ? 20.0 : 12.5;
  const cvmCrit = cvmWarn + (isFlame ? 0.8 : 0.6);
  const nepsWarn = isFlame ? 700 : 500;
  const nepsCrit = isFlame ? 850 : 700;
  const tenWarn = neNum != null && neNum >= 10 ? 16.0 : 14.5;
  const tenCrit = 14.5;
  const eloWarn = 6.0;
  const eloCrit = 5.5;

  const evals = [
    { variable: 'CVm', ...evalLowerIsBetter(cvm, cvmWarn, cvmCrit), warn: cvmWarn, crit: cvmCrit },
    { variable: 'Neps_200', ...evalLowerIsBetter(neps200, nepsWarn, nepsCrit), warn: nepsWarn, crit: nepsCrit },
    { variable: 'Tenacidad', ...evalHigherIsBetter(tenacidad, tenWarn, tenCrit), warn: tenWarn, crit: tenCrit },
    { variable: 'Elongacion', ...evalHigherIsBetter(elongacion, eloWarn, eloCrit), warn: eloWarn, crit: eloCrit },
    { variable: 'MIC', ...evalRange(mic, 3.6, 4.8, 3.3, 5.1), warn: [3.6, 4.8], crit: [3.3, 5.1] }
  ];

  const estado = computeEstadoFromEvaluations(evals, Array.isArray(row?.alertas) ? row.alertas : []);

  return {
    ne: row?.ne ?? null,
    is_flame: isFlame,
    aplicacion: app,
    estado: estado.state,
    decision: estado.decision,
    evaluaciones: evals,
    alertas: Array.isArray(row?.alertas) ? row.alertas : [],
    recomendacion: row?.recomendacion || null
  };
}

function buildJsonCompartibleFromTrazabilidad(data, filtros) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const evaluadas = rows.map((row) => {
    const matriz = evaluarFilaDashboardStyle(row);
    return {
      lote: row?.lote ?? null,
      maquina: row?.maquina_label ?? row?.maquina_codigo ?? null,
      turno: row?.turno ?? null,
      ne: row?.ne ?? null,
      titulo_oe: row?.titulo_oe ?? null,
      alimentacion: row?.cadena_alimentacion ?? row?.alimentacion ?? null,
      metricas: {
        rpm: toNumber(row?.rpm),
        prod_kg_hr: toNumber(row?.prod_kg_hr),
        efic_informada: toNumber(row?.efic_informada),
        cort_nat: toNumber(row?.cort_nat),
        rob_01: toNumber(row?.rob_01),
        rob_02: toNumber(row?.rob_02),
        rob_03: toNumber(row?.rob_03),
        cvm: toNumber(row?.cvm),
        neps_200: toNumber(row?.neps_200),
        tenacidad: toNumber(row?.tenacidad),
        elongacion: toNumber(row?.elongacion),
        mic: toNumber(row?.mic),
        cvm_carda_turno: toNumber(row?.cvm_carda_turno)
      },
      matriz_dashboard: matriz
    };
  });

  const resumenEstados = evaluadas.reduce((acc, row) => {
    const decision = row?.matriz_dashboard?.decision || 'Sin dato';
    acc[decision] = (acc[decision] || 0) + 1;
    return acc;
  }, {});

  return {
    version: 'stc-trazabilidad-llm-v1',
    origen: 'stc-mezclas-poc',
    generado_at: new Date().toISOString(),
    filtros: {
      fecha: data?.fecha ?? filtros.fecha,
      lote: (filtros.lote || '').trim() || null,
      ne: (filtros.ne || '').trim() || null
    },
    resumen: data?.resumen || {},
    matriz_referencia_dashboard: {
      descripcion: 'Matriz alineada para lectura tipo DashboardMezclaHilo',
      mapeo_estado: { ok: 'Aprobado', warn: 'Condicional', crit: 'Rechazado' }
    },
    filas: evaluadas,
    resumen_decision: resumenEstados,
    uso_sugerido: {
      objetivo: 'Compartir este JSON con Gemini web, GPT-5 o Claude para auditoría cruzada de criterios y narrativa técnica.'
    }
  };
}

function buildReporte(payload) {
  const filas = Array.isArray(payload?.filas) ? payload.filas : [];
  const validRows = filas.filter((row) => row && row.metricas);

  const getMachineNumber = (row) => {
    const raw = String(row?.maquina || '').trim();
    const match = raw.match(/(\d{1,2})/);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  };

  const isOE03 = (row) => getMachineNumber(row) === 3;

  const cvmStateOf = (row) => {
    const cvmEval = Array.isArray(row?.matriz_dashboard?.evaluaciones)
      ? row.matriz_dashboard.evaluaciones.find((item) => item.variable === 'CVm')
      : null;
    return cvmEval?.state || 'sin-dato';
  };

  const cvmIsOk = (row) => cvmStateOf(row) === 'ok';

  if (!validRows.length) {
    return {
      titulo: 'REPORTE ESTRATEGICO DE HILANDERIA',
      fechaLabel: formatDateLabel(payload?.filtros?.fecha),
      estadoLabel: 'Sin datos',
      estadoColor: 'bg-slate-100 text-slate-700',
      reglasAplicadas: [
        'Sin datos suficientes para evaluar reglas de automatización.'
      ],
      elefante: 'No hay filas disponibles para construir diagnóstico.',
      purga: 'Sin datos de robos/cortes para esta consulta.',
      laboratorio: 'Sin datos de laboratorio para esta consulta.',
      acciones: ['Revisar filtros y volver a generar reporte.']
    };
  }

  const lotes = [...new Set(validRows.map((row) => row.lote).filter(Boolean))];
  const loteLabel = lotes.length === 1 ? `LOTE ${lotes[0]}` : `LOTES ${lotes.join(', ')}`;

  const worstByEfic = [...validRows]
    .filter((row) => row.metricas.efic_informada != null)
    .sort((a, b) => Number(a.metricas.efic_informada) - Number(b.metricas.efic_informada))[0] || null;

  const rowsWithQuality = validRows.filter((row) => row.metricas.cvm != null || row.metricas.neps_200 != null);
  const avgCvm = rowsWithQuality.length
    ? rowsWithQuality.reduce((sum, row) => sum + (Number(row.metricas.cvm) || 0), 0) / rowsWithQuality.length
    : null;
  const avgNeps = rowsWithQuality.length
    ? rowsWithQuality.reduce((sum, row) => sum + (Number(row.metricas.neps_200) || 0), 0) / rowsWithQuality.length
    : null;

  const robotRows = validRows.filter((row) => !isOE03(row));
  const robotIssues = robotRows
    .map((row) => ({
      maquina: row.maquina || 'N/D',
      rob1: toNumber(row.metricas.rob_01),
      cort: Number(row.metricas.cort_nat) || 0
    }))
    .filter((row) => row.rob1 != null && row.rob1 < 80)
    .sort((a, b) => a.rob1 - b.rob1)
    .slice(0, 3);

  const robotBest = robotRows
    .map((row) => ({ maquina: row.maquina || 'N/D', rob1: toNumber(row.metricas.rob_01) }))
    .filter((row) => row.rob1 != null && row.rob1 > 90)
    .sort((a, b) => b.rob1 - a.rob1)
    .slice(0, 2);

  const cortesAltos = validRows
    .map((row) => ({ maquina: row.maquina || 'N/D', cort: Number(row.metricas.cort_nat) || 0 }))
    .filter((row) => row.cort >= 220)
    .sort((a, b) => b.cort - a.cort)
    .slice(0, 3);

  const missingTenacidad = validRows.filter((row) => row.metricas.tenacidad == null).length;
  const oe03Rows = validRows.filter((row) => isOE03(row));
  const oe03LowEfic = oe03Rows
    .filter((row) => toNumber(row.metricas.efic_informada) != null && Number(row.metricas.efic_informada) < 60)
    .sort((a, b) => Number(a.metricas.efic_informada) - Number(b.metricas.efic_informada));

  const bajaEficCvmOk = validRows
    .filter((row) => toNumber(row.metricas.efic_informada) != null && Number(row.metricas.efic_informada) < 60 && cvmIsOk(row));

  const okCount = Number(payload?.resumen_decision?.Aprobado || 0);
  const warnCount = Number(payload?.resumen_decision?.Condicional || 0);
  const critCount = Number(payload?.resumen_decision?.Rechazado || 0);

  let estadoLabel = 'Aprobado';
  let estadoColor = 'bg-emerald-100 text-emerald-700';
  if (critCount > 0) {
    estadoLabel = 'Rechazado';
    estadoColor = 'bg-red-100 text-red-700';
  } else if (warnCount > 0) {
    estadoLabel = 'Condicional';
    estadoColor = 'bg-amber-100 text-amber-700';
  }

  let elefante = worstByEfic
    ? `El punto critico aparece en ${worstByEfic.maquina || 'una maquina'} con eficiencia ${Number(worstByEfic.metricas.efic_informada).toFixed(1)}%.\nCalidad de hilo observada: CVm promedio ${avgCvm != null ? avgCvm.toFixed(2) : 'S/D'} y Neps promedio ${avgNeps != null ? avgNeps.toFixed(1) : 'S/D'}.`
    : `No se encontraron eficiencias reportadas para detectar el principal cuello de botella.\nCalidad de hilo observada: CVm promedio ${avgCvm != null ? avgCvm.toFixed(2) : 'S/D'} y Neps promedio ${avgNeps != null ? avgNeps.toFixed(1) : 'S/D'}.`;

  if (oe03LowEfic.length) {
    const worst03 = oe03LowEfic[0];
    elefante += `\nCaso OE 03: eficiencia ${Number(worst03.metricas.efic_informada).toFixed(1)}% con esquema semi-automatico (sin robot).`;
    if (cvmIsOk(worst03)) {
      elefante += '\nInterpretacion: disponibilidad mecanica/humana (operador/repuesto), no problema de fibra.';
    }
  } else if (bajaEficCvmOk.length) {
    elefante += '\nInterpretacion de eficiencia: hay filas con eficiencia <60% y CVm OK; clasificar como disponibilidad mecanica/humana, no como falla de fibra.';
  }

  const purgaHotText = robotIssues.length
    ? robotIssues.map((row) => `${row.maquina}: ROB1 ${row.rob1.toFixed(1)}% (bajo)`).join(' | ')
    : 'Sin maquinas con ROB1 < 80%.';

  const purgaBestText = robotBest.length
    ? `ROB1 alto (exito de robot): ${robotBest.map((row) => `${row.maquina} ${row.rob1.toFixed(1)}%`).join(' | ')}`
    : 'Sin registros ROB1 > 90% en esta muestra.';

  const cortesText = cortesAltos.length
    ? cortesAltos.map((row) => `${row.maquina}: Cortes ${row.cort.toFixed(0)}`).join(' | ')
    : 'Sin cortes naturales en zona de vigilancia alta.';

  const purga = `${purgaHotText}\n${purgaBestText}\n${cortesText}\nRegla aplicada: en maquinas con robot se usa ROB1 como KPI principal y no se suman ROB1+ROB2+ROB3.`;

  const laboratorio = `Filas sin tenacidad: ${missingTenacidad}/${validRows.length}.\nCuando falta tenacidad, el estado tecnico puede sobrerreaccionar a rechazo preventivo.\nConclusión: completar Tensorapid para confirmar si el rechazo es por calidad real o por dato faltante.`;

  const acciones = [
    `Mantenimiento focalizado en ${worstByEfic?.maquina || 'maquinas con baja eficiencia'} para recuperar capacidad sin castigar calidad.`,
    robotIssues.length
      ? `Revisar robots en ${robotIssues.map((row) => row.maquina).join(', ')}: ROB1 bajo indica falla mecanica de automatizacion.`
      : 'Mantener rutina preventiva de robots/purgadores; ROB1 no muestra fallas severas.',
    missingTenacidad > 0
      ? 'Cargar urgentemente datos de tenacidad para validar aptitud final (Aprobado/Condicional/Rechazado).'
      : 'Sostener disciplina de laboratorio: tenacidad completa permite decisiones mas confiables.'
  ];

  if (oe03LowEfic.length) {
    acciones.unshift('Documentar OE 03 como semi-automatica sin robot: si CVm esta OK, clasificar baja eficiencia como disponibilidad de operador/repuesto.');
  }

  if (bajaEficCvmOk.length && !oe03LowEfic.length) {
    acciones.unshift('Cuando eficiencia <60% con CVm OK, registrar evento como disponibilidad mecanica/humana y no como problema de fibra.');
  }

  if (okCount > 0 && critCount === 0 && warnCount === 0) {
    acciones.unshift('Mantener seteo actual y monitoreo diario: el lote aparece estable en estado Aprobado.');
  }

  const reglasAplicadas = [
    'Máquinas con robot: se usa ROB1 como KPI principal; no se suma ROB1+ROB2+ROB3.',
    'Interpretación ROB: >90% éxito alto del robot, <80% posible falla mecánica.',
    'OE 03 se trata como semi-automática: campos ROB se ignoran en diagnóstico.',
    'Si Eficiencia <60% y CVm está OK, se clasifica como disponibilidad mecánica/humana y no como falla de fibra.'
  ];

  return {
    titulo: `REPORTE ESTRATEGICO DE HILANDERIA: ${loteLabel}`,
    fechaLabel: formatDateLabel(payload?.filtros?.fecha),
    estadoLabel,
    estadoColor,
    reglasAplicadas,
    elefante,
    purga,
    laboratorio,
    acciones: acciones.slice(0, 4)
  };
}

function buildShareText(reporte) {
  if (!reporte) return '';

  const s = (text) =>
    String(text || '')
      .replace(/\uFFFD/g, '')
      .replace(/\t/g, ' ')
      .trim();

  // Aplica negrita WA (*...*) a valores numéricos y términos técnicos clave dentro de un texto
  const boldValues = (line) =>
    line
      .replace(/(\d+\.\d+%)/g, '*$1*')              // porcentajes: 15.0%
      .replace(/(\b\d{2,3}\.\d{1,2}\b)/g, '*$1*')   // números decimales: 11.61, 26.38
      .replace(/(\b\d{3,}\b)/g, '*$1*')              // enteros grandes: 313, 261
      .replace(/\bCVm\b/g, '*CVm*')
      .replace(/\bROB1\b/g, '*ROB1*')
      .replace(/\bOE 03\b/g, '*OE 03*')
      .replace(/\bTensorapid\b/gi, '*Tensorapid*')
      .replace(/\bKPI\b/g, '*KPI*');

  const toBullets = (text) => {
    const lines = s(text).split('\n').map((l) => l.trim()).filter((l) => l);
    if (!lines.length) return ['• Sin datos.'];
    return lines.map((line) => `• ${boldValues(line)}`);
  };

  const acciones = Array.isArray(reporte.acciones)
    ? reporte.acciones.map((accion, idx) => `${idx + 1}. ${boldValues(s(accion))}`)
    : ['1. Sin acciones registradas.'];

  return [
    `🧶 *${s(reporte.titulo)}*`,
    `📅 *Fecha: ${s(reporte.fechaLabel)}* | Análisis: Cruce Laboratorio vs Planta`,
    '',
    '---',
    '',
    '🚨 *1. EL "ELEFANTE EN LA HABITACIÓN"*',
    ...toBullets(reporte.elefante),
    '',
    '---',
    '',
    '📊 *2. COMPORTAMIENTO DE PURGA (ROBOS Y CORTES)*',
    ...toBullets(reporte.purga),
    '',
    '---',
    '',
    '🔬 *3. LABORATORIO: PUNTO CIEGO DE TENSORAPID*',
    ...toBullets(reporte.laboratorio),
    '',
    '---',
    '',
    '✅ *4. ACCIONES RECOMENDADAS*',
    ...acciones,
    '',
    '---',
    '',
    `_Generado por STC-Mezclas · ${s(reporte.fechaLabel)}_`
  ].join('\n');
}

async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'absolute';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

const filtros = reactive({
  fecha: defaultYesterdayIso(),
  lote: '',
  ne: ''
});

const loadingReporte = ref(false);
const payloadObj = ref(null);
const reporte = ref(null);
const error = ref('');

const jsonShareState = ref('idle');
const whatsappState = ref('idle');

async function generarReporte() {
  loadingReporte.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ fecha: filtros.fecha });
    if (String(filtros.lote || '').trim()) params.set('lote', String(filtros.lote).trim());
    if (String(filtros.ne || '').trim()) params.set('ne', String(filtros.ne).trim());

    const res = await fetch(`/api/oe/trazabilidad?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || 'No se pudo consultar trazabilidad.');

    const payload = buildJsonCompartibleFromTrazabilidad(data, filtros);
    payloadObj.value = payload;
    reporte.value = buildReporte(payload);
  } catch (err) {
    payloadObj.value = null;
    reporte.value = null;
    error.value = err?.message || 'Error inesperado al generar reporte.';
  } finally {
    loadingReporte.value = false;
  }
}

async function copiarJsonCompartible() {
  if (!payloadObj.value) return;
  try {
    await copyToClipboard(JSON.stringify(payloadObj.value, null, 2));
    jsonShareState.value = 'success';
  } catch {
    jsonShareState.value = 'error';
  } finally {
    setTimeout(() => {
      jsonShareState.value = 'idle';
    }, 2200);
  }
}

async function compartirWhatsApp() {
  if (!reporte.value) return;
  const text = buildShareText(reporte.value);
  try {
    await copyToClipboard(text);
    whatsappState.value = 'success';
  } catch {
    whatsappState.value = 'error';
  } finally {
    setTimeout(() => {
      whatsappState.value = 'idle';
    }, 2200);
  }
}

function compartirCorreo() {
  if (!reporte.value) return;
  const subject = encodeURIComponent(reporte.value.titulo);
  const body = encodeURIComponent(buildShareText(reporte.value));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
</script>
