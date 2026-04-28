<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-6">

    <!-- Encabezado -->
    <div class="mb-5">
      <h1 class="text-lg font-black text-gray-800 tracking-tight">Trazabilidad OE</h1>
      <p class="text-xs text-gray-400 mt-0.5">Producción Open End cruzada con laboratorio Uster + Tensorapid</p>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fecha *</label>
          <input
            v-model="filtros.fecha"
            type="date"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Lote</label>
          <input
            v-model="filtros.lote"
            type="text"
            placeholder="ej. 112"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Título (Ne)</label>
          <input
            v-model="filtros.ne"
            type="text"
            placeholder="ej. 20"
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>
        <button
          @click="cargar"
          :disabled="!filtros.fecha || loading"
          class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Cargando…</span>
          <span v-else>Consultar</span>
        </button>
        <button
          @click="moverFecha(-1)"
          :disabled="!filtros.fecha || loading"
          class="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Día anterior
        </button>
        <button
          @click="moverFecha(1)"
          :disabled="!filtros.fecha || loading"
          class="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Día siguiente
        </button>
        <button
          v-if="data"
          @click="limpiar"
          class="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          Limpiar
        </button>
      </div>
      <p v-if="error" class="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</p>
      <div
        v-if="data && hayDesfaseTensorapid"
        class="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
      >
        Hay filas sin tenacidad para esta fecha. Tensorapid suele registrarse al día siguiente del Uster;
        para ver los últimos ensayos completos, navega un día hacia atrás.
      </div>
    </div>

    <!-- Resumen cards -->
    <div v-if="data" class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Registros OE</div>
        <div class="text-2xl font-black text-gray-800">{{ data.resumen.registros_oe }}</div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Máquinas</div>
        <div class="text-2xl font-black text-gray-800">{{ data.resumen.maquinas_oe }}</div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Lotes</div>
        <div class="text-2xl font-black text-gray-800">{{ data.resumen.lotes }}</div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Títulos</div>
        <div class="text-2xl font-black text-gray-800">{{ data.resumen.titulos }}</div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
        <div class="text-[10px] text-gray-400 uppercase tracking-wider">Cobertura Carda</div>
        <div class="text-2xl font-black text-gray-800">{{ resumenCoberturaCarda }}</div>
      </div>
    </div>

    <!-- Tabla OE principal -->
    <div v-if="data && data.rows.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 class="text-sm font-bold text-gray-700">Detalle por máquina / lote</h2>
        <span class="text-xs text-gray-400">{{ data.rows.length }} registros</span>
      </div>
      <div class="px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-[11px] text-blue-800">
        Cardas: se esperan <strong>2 muestreos de CVm por turno</strong>. La columna <strong>Muestras</strong> indica cobertura por fila.
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Maq.</th>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Lote</th>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Ne</th>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Alim.</th>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Turno</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">RPM</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Kg/h</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Efic %</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Cort Nat</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">% ROB 01</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">% ROB 02</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">% ROB 03</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">CVm%</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">CVm Carda</th>
              <th class="text-center px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Muestras</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Neps+200</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tenac.</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Elong %</th>
              <th class="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Alertas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <template v-for="(row, idx) in data.rows" :key="idx">
              <tr
                class="hover:bg-gray-50 cursor-pointer transition-colors"
                :class="expanded === idx ? 'bg-indigo-50/50' : ''"
                @click="expanded = expanded === idx ? null : idx"
              >
                <td class="px-3 py-2.5 font-mono font-bold text-gray-800 whitespace-nowrap">{{ row.maquina_label }}</td>
                <td class="px-3 py-2.5 font-mono text-gray-700">{{ row.lote }}</td>
                <td class="px-3 py-2.5 font-mono text-gray-700">{{ row.ne ?? '–' }}</td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="alimentacionClass(row.alimentacion)">
                    {{ row.alimentacion || 'N/D' }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-gray-600">{{ row.turno || '–' }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ fmt(row.rpm, 0) }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ fmt(row.prod_kg_hr, 2) }}</td>
                <td class="px-3 py-2.5 text-right font-mono" :class="eficClass(row.efic_informada)">
                  {{ fmt(row.efic_informada) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="cortNatClass(row.cort_nat)">
                  {{ fmt(row.cort_nat) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="robColClass(row.rob_01)">
                  {{ fmt(row.rob_01) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="robColClass(row.rob_02)">
                  {{ fmt(row.rob_02) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="robColClass(row.rob_03)">
                  {{ fmt(row.rob_03) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="cvmClass(row.cvm)">
                  {{ row.cvm != null ? row.cvm : '–' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="cvmClass(row.cvm_carda_turno)">
                  {{ row.cvm_carda_turno != null ? row.cvm_carda_turno : '–' }}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="coberturaCardaClass(row)">
                    {{ muestrasCardaLabel(row) }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="nepsClass(row.neps_200)">
                  {{ row.neps_200 != null ? row.neps_200 : '–' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="tenacClass(row.tenacidad, row.ne)">
                  {{ row.tenacidad != null ? row.tenacidad : '–' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="elongClass(row.elongacion)">
                  {{ row.elongacion != null ? row.elongacion : '–' }}
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="alerta in row.alertas"
                      :key="alerta.code"
                      class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      :class="alerta.severity === 'alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'"
                    >
                      {{ alerta.severity === 'alta' ? '⚠' : '·' }} {{ labelAlerta(alerta.code) }}
                    </span>
                    <span v-if="!row.alertas.length" class="text-[10px] text-emerald-600 font-semibold">✓</span>
                  </div>
                </td>
              </tr>
              <!-- Fila expandida: detalle + recomendación -->
              <tr v-if="expanded === idx" class="bg-indigo-50/40">
                <td colspan="19" class="px-4 py-3">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Laboratorio -->
                    <div>
                      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Laboratorio Uster/Tensorapid</div>
                      <div class="grid grid-cols-3 gap-2">
                        <div v-for="item in labItems(row)" :key="item.label" class="bg-white rounded-lg p-2 border border-gray-100">
                          <div class="text-[9px] text-gray-400 uppercase tracking-wider">{{ item.label }}</div>
                          <div class="font-bold text-gray-800 text-sm mt-0.5">
                            {{ item.value ?? '–' }} <span class="text-[10px] font-normal text-gray-400">{{ item.unit }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="mt-2 text-[10px] text-gray-500">
                        Ensayos Uster: <strong>{{ row.ensayos_uster ?? 0 }}</strong>
                        <span v-if="row.maquinas_uster"> · Máq. Uster: <strong>{{ row.maquinas_uster }}</strong></span>
                      </div>
                      <div class="mt-3 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2.5 text-xs text-sky-900 space-y-1">
                        <div>
                          Alimentación inferida: <strong>{{ row.cadena_alimentacion || 'N/D' }}</strong>
                          <span v-if="row.passador"> · Pasador: <strong>{{ String(row.passador).toUpperCase() }}</strong></span>
                        </div>
                        <div>
                          Carda turno ({{ row.turno || '–' }}): CVm prom <strong>{{ row.cvm_carda_turno ?? '–' }}</strong>
                          <span class="mx-1">|</span>
                          Muestras <strong>{{ muestrasCardaLabel(row) }}</strong>
                        </div>
                        <div class="text-[11px] text-sky-700">
                          Regla: 2 muestreos de CVm por turno. Cobertura completa = 2/2.
                        </div>
                      </div>
                    </div>
                    <!-- Alertas + recomendación -->
                    <div>
                      <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Detalle alertas</div>
                      <ul v-if="row.alertas.length" class="space-y-1 mb-3">
                        <li
                          v-for="alerta in row.alertas"
                          :key="alerta.code"
                          class="text-xs flex items-start gap-2"
                        >
                          <span :class="alerta.severity === 'alta' ? 'text-red-500' : 'text-amber-500'" class="mt-0.5 shrink-0">
                            {{ alerta.severity === 'alta' ? '⚠' : '◦' }}
                          </span>
                          <span class="text-gray-700">{{ alerta.message }}</span>
                        </li>
                      </ul>
                      <p v-else class="text-xs text-emerald-700 mb-3">Sin alertas en esta fila.</p>
                      <div class="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2.5">
                        <div class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Recomendación</div>
                        <p class="text-xs text-indigo-800">{{ row.recomendacion }}</p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sin datos -->
    <div v-if="data && !data.rows.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm mb-5">
      Sin registros OE para la fecha seleccionada.
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const filtros = reactive({
  fecha: new Date().toISOString().slice(0, 10),
  lote: '',
  ne: ''
});

const loading = ref(false);
const error = ref(null);
const data = ref(null);
const expanded = ref(null);

const hayDesfaseTensorapid = computed(() => {
  if (!data.value?.rows?.length) return false;
  const rows = data.value.rows;
  const hayUster = rows.some((row) => row.ensayos_uster != null && Number(row.ensayos_uster) > 0);
  const faltanTensor = rows.some((row) => row.tenacidad == null && row.elongacion == null);
  return hayUster && faltanTensor;
});

const resumenCoberturaCarda = computed(() => {
  if (!data.value?.rows?.length) return '0/0';
  let observadas = 0;
  let esperadas = 0;
  data.value.rows.forEach((row) => {
    if (row.muestras_carda_esperadas > 0) {
      observadas += Number(row.muestras_carda_turno) || 0;
      esperadas += Number(row.muestras_carda_esperadas) || 0;
    }
  });
  return `${observadas}/${esperadas}`;
});

async function cargar() {
  if (!filtros.fecha) return;
  loading.value = true;
  error.value = null;
  data.value = null;
  expanded.value = null;
  try {
    const params = new URLSearchParams({ fecha: filtros.fecha });
    if (filtros.lote.trim()) params.set('lote', filtros.lote.trim());
    if (filtros.ne.trim()) params.set('ne', filtros.ne.trim());
    const res = await fetch(`/api/oe/trazabilidad?${params}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error del servidor');
    data.value = json;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function limpiar() {
  data.value = null;
  error.value = null;
  expanded.value = null;
}

function moverFecha(offsetDias) {
  if (!filtros.fecha || Number.isNaN(offsetDias)) return;
  const [y, m, d] = filtros.fecha.split('-').map(Number);
  const base = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  base.setUTCDate(base.getUTCDate() + offsetDias);
  filtros.fecha = base.toISOString().slice(0, 10);
  cargar();
}

function fmt(val, dec = 1) {
  if (val == null) return '–';
  return Number(val).toFixed(dec);
}

function robosTotal(row) {
  return (Number(row.rob_01) || 0) + (Number(row.rob_02) || 0) + (Number(row.rob_03) || 0);
}

function fmtRobos(row) {
  const t = robosTotal(row);
  return t > 0 ? t.toFixed(1) : '–';
}

function eficClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n < 85) return 'text-red-600 font-bold';
  if (n < 90) return 'text-amber-600 font-semibold';
  return 'text-emerald-700';
}

function cortNatClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n > 250) return 'text-red-600 font-bold';
  if (n > 150) return 'text-amber-600 font-semibold';
  return 'text-gray-700';
}

function robosClass(total) {
  if (total > 4) return 'text-red-600 font-bold';
  if (total > 2) return 'text-amber-600 font-semibold';
  return 'text-gray-700';
}

function robColClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n > 95) return 'text-red-600 font-bold';
  if (n > 90) return 'text-amber-600 font-semibold';
  return 'text-gray-700';
}

function cvmClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n > 13) return 'text-red-600 font-bold';
  if (n > 12) return 'text-amber-600 font-semibold';
  return 'text-emerald-700';
}

function nepsClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n > 700) return 'text-red-600 font-bold';
  if (n > 500) return 'text-amber-600 font-semibold';
  return 'text-emerald-700';
}

function tenacClass(val, ne) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  const neNum = Number.parseFloat(ne);
  if (n < 14.5) return 'text-red-600 font-bold';
  if (neNum >= 10 && n < 16) return 'text-amber-600 font-semibold';
  return 'text-emerald-700';
}

function elongClass(val) {
  if (val == null) return 'text-gray-400';
  return Number(val) < 6 ? 'text-amber-600 font-semibold' : 'text-gray-700';
}

function labelAlerta(code) {
  const map = {
    eficiencia: 'Efic',
    corte_nat: 'Cort',
    robos: 'Rob',
    cvm: 'CVm',
    neps_200: 'Neps',
    tenacidad: 'Ten',
    elongacion: 'Elong',
    sin_uster: 'S/Uster',
    sin_tensorapid: 'S/Tensor'
  };
  return map[code] || code;
}

function alimentacionClass(alim) {
  if (alim === 'MANUAR') return 'bg-blue-100 text-blue-700';
  if (alim === 'CARDA RIETER') return 'bg-emerald-100 text-emerald-700';
  if (alim === 'MIXTO') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

function muestrasCardaLabel(row) {
  const obs = Number(row.muestras_carda_turno) || 0;
  const exp = Number(row.muestras_carda_esperadas) || 0;
  if (!exp) return 'N/D';
  return `${obs}/${exp}`;
}

function coberturaCardaClass(row) {
  const obs = Number(row.muestras_carda_turno) || 0;
  const exp = Number(row.muestras_carda_esperadas) || 0;
  if (!exp) return 'bg-gray-100 text-gray-600';
  if (obs >= exp) return 'bg-emerald-100 text-emerald-700';
  if (obs > 0) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function labItems(row) {
  return [
    { label: 'CVm%', value: row.cvm, unit: '%' },
    { label: 'Neps+200', value: row.neps_200, unit: '/km' },
    { label: 'Vellosidad', value: row.vellosidad, unit: '' },
    { label: 'Thin -30', value: row.thin_30, unit: '/km' },
    { label: 'Thin -50', value: row.thin_50, unit: '/km' },
    { label: 'Thick +35', value: row.thick_35, unit: '/km' },
    { label: 'Tenacidad', value: row.tenacidad, unit: 'cN/tex' },
    { label: 'Elongación', value: row.elongacion, unit: '%' },
    { label: 'Fuerza B', value: row.fuerza_b, unit: 'cN' },
  ];
}
</script>
