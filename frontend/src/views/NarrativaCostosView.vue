<template>
  <div class="p-4 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
        📊 Reporte de Costos — Análisis IA
      </h1>
      <button
        @click="cargar"
        :disabled="cargando"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {{ cargando ? 'Cargando…' : '↺ Actualizar' }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{{ error }}</div>

    <!-- Tarjetas totales -->
    <div v-if="totales" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Llamadas totales</p>
        <p class="text-3xl font-bold text-blue-600">{{ totales.llamadas_totales ?? '—' }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Tokens consumidos</p>
        <p class="text-3xl font-bold text-purple-600">{{ formatNum(totales.tokens_totales) }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Costo total (USD)</p>
        <p class="text-3xl font-bold text-green-600">{{ formatUSD(totales.costo_total_usd) }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Costo promedio / análisis</p>
        <p class="text-3xl font-bold text-orange-500">
          {{ totales.llamadas_totales > 0 ? formatUSD(totales.costo_total_usd / totales.llamadas_totales) : '—' }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Por modelo -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 uppercase tracking-wide">Por modelo</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <th class="pb-2 pr-3">Modelo</th>
              <th class="pb-2 text-right pr-3">Llamadas</th>
              <th class="pb-2 text-right pr-3">Tokens</th>
              <th class="pb-2 text-right">Costo USD</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in resumenPorModelo" :key="m.modelo" class="border-b border-gray-100 dark:border-gray-700">
              <td class="py-2 pr-3 font-mono text-xs text-blue-700 dark:text-blue-300">{{ m.modelo }}</td>
              <td class="py-2 text-right pr-3 tabular-nums">{{ m.llamadas }}</td>
              <td class="py-2 text-right pr-3 tabular-nums text-gray-600 dark:text-gray-400">{{ formatNum(m.total_tokens) }}</td>
              <td class="py-2 text-right font-semibold text-green-700 dark:text-green-400 tabular-nums">{{ formatUSD(m.costo_usd) }}</td>
            </tr>
            <tr v-if="!resumenPorModelo.length">
              <td colspan="4" class="py-4 text-center text-gray-400 text-xs">Sin datos aún</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Por día (últimos 30) -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 uppercase tracking-wide">Por día (últimos 30)</h2>
        <div class="overflow-y-auto max-h-64">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white dark:bg-gray-800">
              <tr class="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th class="pb-2 pr-3">Fecha</th>
                <th class="pb-2 text-right pr-3">Llamadas</th>
                <th class="pb-2 text-right pr-3">Tokens</th>
                <th class="pb-2 text-right">Costo USD</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in resumenPorDia.slice(0, 30)" :key="d.dia" class="border-b border-gray-100 dark:border-gray-700">
                <td class="py-1.5 pr-3 text-gray-700 dark:text-gray-300">{{ d.dia }}</td>
                <td class="py-1.5 text-right pr-3 tabular-nums">{{ d.llamadas }}</td>
                <td class="py-1.5 text-right pr-3 tabular-nums text-gray-600 dark:text-gray-400">{{ formatNum(d.total_tokens) }}</td>
                <td class="py-1.5 text-right font-semibold text-green-700 dark:text-green-400 tabular-nums">{{ formatUSD(d.costo_usd) }}</td>
              </tr>
              <tr v-if="!resumenPorDia.length">
                <td colspan="4" class="py-4 text-center text-gray-400 text-xs">Sin datos aún</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Detalle -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Detalle de llamadas (últimas 200)</h2>
        <button @click="exportarCSV" class="text-xs text-blue-600 hover:underline">Exportar CSV</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
              <th class="pb-2 pr-3">Fecha/hora</th>
              <th class="pb-2 pr-3">Lotes</th>
              <th class="pb-2 pr-3">Corte</th>
              <th class="pb-2 pr-3">Formato</th>
              <th class="pb-2 pr-3">Idioma</th>
              <th class="pb-2 pr-3">Modelo</th>
              <th class="pb-2 text-right pr-3">T. entrada</th>
              <th class="pb-2 text-right pr-3">T. salida</th>
              <th class="pb-2 text-right pr-3">Total</th>
              <th class="pb-2 text-right">Costo USD</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in detalle" :key="r.id"
              class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
            >
              <td class="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{{ formatFecha(r.created_at) }}</td>
              <td class="py-1.5 pr-3 font-mono">{{ r.lotes }}</td>
              <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{{ r.fecha_corte || '—' }}</td>
              <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-400">{{ r.formato || '—' }}</td>
              <td class="py-1.5 pr-3">
                <span class="px-1.5 py-0.5 rounded text-xs" :class="r.idioma === 'pt-BR' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">
                  {{ r.idioma || 'es' }}
                </span>
              </td>
              <td class="py-1.5 pr-3 font-mono text-blue-700 dark:text-blue-300 whitespace-nowrap">{{ r.modelo }}</td>
              <td class="py-1.5 text-right pr-3 tabular-nums text-gray-600 dark:text-gray-400">{{ formatNum(r.tokens_entrada) }}</td>
              <td class="py-1.5 text-right pr-3 tabular-nums text-gray-600 dark:text-gray-400">{{ formatNum(r.tokens_salida) }}</td>
              <td class="py-1.5 text-right pr-3 tabular-nums font-medium">{{ formatNum(r.tokens_total) }}</td>
              <td class="py-1.5 text-right font-semibold text-green-700 dark:text-green-400 tabular-nums">{{ formatUSD(r.costo_usd) }}</td>
            </tr>
            <tr v-if="!detalle.length">
              <td colspan="10" class="py-6 text-center text-gray-400">Sin llamadas registradas aún</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const cargando = ref(false)
const error    = ref(null)
const totales          = ref(null)
const resumenPorDia    = ref([])
const resumenPorModelo = ref([])
const detalle          = ref([])

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const res = await fetch('/api/dashboard/narrativa-costos')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    totales.value          = data.totales
    resumenPorDia.value    = data.resumenPorDia   || []
    resumenPorModelo.value = data.resumenPorModelo || []
    detalle.value          = data.detalle         || []
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

function formatNum(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('es-AR')
}

function formatUSD(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (n === 0) return '$0.000000'
  return '$' + n.toFixed(6)
}

function formatFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function exportarCSV() {
  if (!detalle.value.length) return
  const cols = ['id','created_at','lotes','fecha_corte','formato','idioma','modelo','tokens_entrada','tokens_salida','tokens_total','costo_usd']
  const header = cols.join(',')
  const rows = detalle.value.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `narrativa-costos-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(cargar)
</script>
