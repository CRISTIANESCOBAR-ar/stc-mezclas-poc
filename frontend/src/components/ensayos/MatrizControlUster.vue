<template>
  <div class="w-full h-screen flex flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col">
      
      <!-- Panel de control de filtros -->
      <div class="flex flex-col gap-2 mb-3 shrink-0">
        <div class="@container flex items-center gap-2 flex-wrap">
          <h3 class="text-lg font-semibold text-slate-800 whitespace-nowrap">Matriz de Control Uster</h3>

          <div class="ml-0 @[900px]:ml-2 flex items-center gap-2 flex-wrap">
            <input
              v-model="q"
              type="search"
              placeholder="Buscar..."
              aria-label="Buscar en la matriz"
              class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-32 @[1150px]:w-auto"
            />
            
            <CustomDatepicker
              v-model="dateQuery"
              placeholder="Selecciona fecha"
              :show-buttons="true"
            />

            <!-- Control del límite de control de calidad -->
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm">
              <span class="text-slate-600 font-medium">Límite CVm% Máx:</span>
              <input
                v-model.number="cvmLimit"
                type="number"
                step="0.1"
                min="0.1"
                max="20"
                class="w-12 bg-white text-center border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>
            
            <button
              v-if="q || turnoQuery || tipoQuery || dateQuery || cvmLimit !== 4.0"
              @click="clearFilters"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm"
            >
              Limpiar
            </button>
          </div>

          <div class="flex-1 flex items-center justify-end gap-2 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <label class="text-sm text-slate-600">Turno:</label>
              <select v-model="turnoQuery" class="px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 min-w-20">
                <option value="">Todos</option>
                <option v-for="turno in availableTurnos" :key="turno" :value="turno">{{ turno }}</option>
              </select>

              <label class="text-sm text-slate-600">Tipo:</label>
              <select v-model="tipoQuery" class="px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 min-w-40">
                <option value="">Todos</option>
                <option v-for="tipo in availableTipos" :key="tipo" :value="tipo">{{ tipo }}</option>
              </select>
            </div>

            <button
              @click="loadRows"
              class="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md"
            >
              Refrescar
            </button>

            <button
              @click="exportToExcel"
              class="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md"
            >
              Exportar
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500 mt-1 flex-wrap gap-2">
          <div class="flex items-center gap-4">
            <div>{{ filteredPivotedRows.length }} filas en la matriz · {{ rows.length }} ensayos base</div>
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 bg-red-50 border border-red-200 rounded"></span>
              <span>Fuera de Límite (>{{ cvmLimit }}%)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-block px-1 bg-amber-50 border border-amber-200 rounded text-[9px] text-amber-700 font-bold">Re-ensayo</span>
              <span>Fila extra de ajuste</span>
            </div>
          </div>
          <div v-if="rows.length">Actualizado: {{ lastLoadedAt }}</div>
        </div>
      </div>

      <!-- Spinner de Carga -->
      <div v-if="loading" class="text-sm text-slate-600 py-8 text-center flex-1">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-blue-600"></div>
        <p class="mt-2">Procesando y agrupando ensayos...</p>
      </div>

      <!-- Contenido Principal -->
      <div v-else class="flex-1 min-h-0 flex flex-col">
        <div v-if="rows.length === 0" class="text-sm text-slate-600 py-8 text-center">
          No hay ensayos de cardas registrados en el sistema.
        </div>

        <div v-else class="flex-1 min-h-0 flex flex-col">
          <div v-if="filteredPivotedRows.length === 0" class="text-sm text-slate-600 mb-4 py-4 text-center bg-slate-50 rounded-lg shrink-0">
            No hay coincidencias en la matriz para los filtros seleccionados.
          </div>

          <div class="overflow-auto w-full flex-1 min-h-0 rounded-xl border border-slate-200 pb-0">
            <table class="min-w-full w-full table-fixed divide-y divide-slate-200 text-xs">
              <thead class="bg-slate-50 sticky top-0 z-20">
                <tr>
                  <th class="w-20 px-2 py-2 text-center font-bold text-slate-700 border-b border-r border-slate-200 bg-slate-100">Fecha</th>
                  <th class="w-14 px-2 py-2 text-center font-bold text-slate-700 border-b border-r border-slate-200 bg-slate-100">Turno</th>
                  <th class="w-32 px-2 py-2 text-left font-bold text-slate-700 border-b border-r border-slate-200 bg-slate-100">Tipo</th>
                  <th class="w-32 px-2 py-2 text-center font-bold text-slate-700 border-b border-r border-slate-200 bg-slate-100">Rango Horario</th>
                  <!-- Columnas dinámicas de máquinas -->
                  <th
                    v-for="maq in dynamicMaquinas"
                    :key="maq"
                    class="px-1 py-2 text-center font-bold text-slate-700 border-b border-slate-200 bg-slate-50/90"
                  >
                    M-{{ maq }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(row, idx) in pagedPivotedRows"
                  :key="idx"
                  class="hover:bg-slate-50 transition-colors duration-150"
                  :class="row.isReensayo ? 'bg-amber-50/20' : ''"
                >
                  <td class="px-2 py-2 text-center font-medium text-slate-600 border-r border-slate-200">{{ row.Fecha }}</td>
                  <td class="px-2 py-2 text-center font-semibold text-slate-900 border-r border-slate-200">
                    {{ row.Turno }}
                  </td>
                  <td class="px-2 py-2 text-left text-slate-700 border-r border-slate-200 truncate">
                    {{ row.Tipo }}
                  </td>
                  <td class="px-2 py-2 text-center border-r border-slate-200 whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1">
                      <span v-if="row.isReensayo" class="px-1 bg-amber-100 border border-amber-200 rounded text-[9px] text-amber-800 font-bold">
                        Re-ensayo
                      </span>
                      <span>{{ row.rangoHorario }}</span>
                    </div>
                  </td>
                  
                  <!-- Celdas de máquinas (valores de CVm %) -->
                  <td
                    v-for="maq in dynamicMaquinas"
                    :key="maq"
                    class="px-1 py-2 text-center border-l border-slate-100 font-semibold"
                    :class="getCellClass(row.valores[maq])"
                    @click="handleCellClick(row.valores[maq])"
                  >
                    <span
                      v-if="row.valores[maq]"
                      v-tippy="{
                        content: getTooltipContent(row.valores[maq].trial),
                        placement: 'bottom',
                        theme: 'light',
                        allowHTML: true,
                        interactive: true,
                        maxWidth: 540,
                        popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', options: { fallbackPlacements: ['top', 'left', 'right'] } }, { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }] }
                      }"
                      class="cursor-pointer underline decoration-dotted decoration-slate-300 hover:decoration-solid block w-full py-0.5 rounded"
                    >
                      {{ row.valores[maq].cvm }}
                    </span>
                    <span v-else class="text-slate-200 font-normal">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div class="flex items-center justify-between mt-3 shrink-0 gap-3 flex-wrap">
            <div class="text-xs text-slate-500">
              Mostrando {{ startDisplay }}-{{ endDisplay }} de {{ filteredPivotedRows.length }} filas agrupadas
            </div>

            <div class="flex items-center gap-2 text-sm">
              <label class="text-slate-600">Filas:</label>
              <select v-model.number="pageSize" class="px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900">
                <option :value="15">15</option>
                <option :value="30">30</option>
                <option :value="50">50</option>
                <option :value="0">Todas</option>
              </select>
            </div>

            <div class="flex items-center gap-2 text-sm">
              <button @click="page = Math.max(1, page - 1)" :disabled="page <= 1" class="px-2 py-1 border border-slate-200 rounded-lg disabled:opacity-40">Anterior</button>
              <span class="text-slate-600">{{ page }} / {{ totalPages }}</span>
              <button @click="page = Math.min(totalPages, page + 1)" :disabled="page >= totalPages" class="px-2 py-1 border border-slate-200 rounded-lg disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal de detalle de ensayo (idéntico al de ResumenEnsayosCardas) -->
    <div v-if="detailVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" @click.self="closeDetail">
      <div class="w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div>
            <div class="text-lg font-semibold text-slate-800">Ensayo {{ detailRow?.Ensayo || '—' }}</div>
            <div class="text-xs text-slate-500">{{ detailRow?.FechaHora || '' }} · Maq. {{ detailRow?.Maq || '—' }} · {{ detailRow?.Tipo || '—' }}</div>
          </div>
          <button @click="closeDetail" class="px-3 py-1 border border-slate-200 rounded-lg text-sm hover:bg-slate-100">Cerrar</button>
        </div>

        <div class="flex-1 min-h-0 overflow-auto p-4 space-y-4">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><span class="font-semibold">Catalogo:</span> {{ detailRow?.Catalogo || '—' }}</div>
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><span class="font-semibold">Lote:</span> {{ detailRow?.Lote || '—' }}</div>
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><span class="font-semibold">Laboratorista:</span> {{ detailRow?.Laboratorista || '—' }}</div>
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-3"><span class="font-semibold">Style:</span> {{ detailRow?.Style || '—' }}</div>
          </div>

          <div class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-800">Titulos de Cinta</div>
            <div class="p-4 grid grid-cols-2 lg:grid-cols-6 gap-3 text-sm">
              <div class="bg-white border border-slate-200 rounded-lg p-3"><span class="font-semibold">Titulo 1:</span> {{ detailTitulos[0] ?? '—' }}</div>
              <div class="bg-white border border-slate-200 rounded-lg p-3"><span class="font-semibold">Titulo 2:</span> {{ detailTitulos[1] ?? '—' }}</div>
              <div class="bg-white border border-slate-200 rounded-lg p-3"><span class="font-semibold">Titulo 3:</span> {{ detailTitulos[2] ?? '—' }}</div>
              <div class="bg-white border border-slate-200 rounded-lg p-3"><span class="font-semibold">Prom:</span> {{ detailRow?.['Tit. Prom'] || '—' }}</div>
              <div class="bg-white border border-slate-200 rounded-lg p-3"><span class="font-semibold">Desv:</span> {{ detailRow?.['Tit. Desv'] || '—' }}</div>
              <div class="bg-white border border-slate-200 rounded-lg p-3"><span class="font-semibold">CV %:</span> {{ detailRow?.['Tit. CV %'] || '—' }}</div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-800">Detalle TBL</div>
            <div class="overflow-auto max-h-[45vh]">
              <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs">
                <thead class="bg-linear-to-r from-slate-50 to-slate-100 sticky top-0 z-10">
                  <tr>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">Seq</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">No</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">U %</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm %</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm 1m</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm 3m</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm 10m</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">Tit. Uster</th>
                    <th class="px-2 py-2 text-center font-semibold text-slate-700">Tit. Rel %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tblRow in detailTblRows" :key="tblRow.SEQNO" class="border-t border-slate-100">
                    <td class="px-2 py-2 text-center">{{ tblRow.SEQNO }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.NO_ }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.U_PERCENT }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.CVM_PERCENT }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.CVM_1M_PERCENT }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.CVM_3M_PERCENT }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.CVM_10M_PERCENT }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.TITULO_MACHINE }}</td>
                    <td class="px-2 py-2 text-center">{{ tblRow.TITULO_REL_PERC }}</td>
                  </tr>
                  <tr v-if="!detailTblRows.length">
                    <td colspan="9" class="px-3 py-6 text-center text-slate-500">Sin detalle TBL.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Swal from 'sweetalert2'
import ExcelJS from 'exceljs'
import CustomDatepicker from '../CustomDatepicker.vue'

const loading = ref(false)
const rows = ref([])
const allTblRows = ref([])
const q = ref('')
const turnoQuery = ref('')
const tipoQuery = ref('')

function getYesterdayString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const dateQuery = ref(getYesterdayString())
const cvmLimit = ref(4.0)

const page = ref(1)
const pageSize = ref(15)
const lastLoadedAt = ref('')

const detailVisible = ref(false)
const detailRow = ref(null)
const detailTblRows = ref([])
const detailTitulos = ref([])

function parseDateFromRaw(value) {
  if (value == null || value === '') return null
  const raw = String(value).trim()

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw)
    if (!Number.isFinite(numeric)) return null
    const date = new Date(raw.length >= 13 ? numeric : numeric * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (match) {
    let year = Number(match[3])
    if (year < 100) year += 2000
    const date = new Date(year, Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0))
    return Number.isNaN(date.getTime()) ? null : date
  }

  // Handle standard YYYY-MM-DD input date values correctly
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  const date = new Date(parsed)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(date) {
  if (!date) return '—'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

function formatTime(date) {
  if (!date) return '—'
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mi}`
}

function formatDateTime(date) {
  if (!date) return '—'
  return `${formatDate(date)} ${formatTime(date)}`
}

function getTurnoFromDate(date) {
  if (!date) return ''
  const h = date.getHours()
  if (h >= 6 && h <= 13) return 'A'
  if (h >= 14 && h <= 21) return 'B'
  return 'C'
}

function toNumber(value) {
  if (value == null || value === '') return null
  const normalized = String(value).replace(',', '.').replace(/[^0-9.+\-eE]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatMetric(value, decimals = 2) {
  const number = toNumber(value)
  if (number == null) return '—'
  return Number(number.toFixed(decimals)).toString()
}

function calcAvg(rows, field) {
  const values = (rows || []).map((r) => toNumber(r[field])).filter((n) => n != null)
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function formatMachine(value) {
  if (value == null || value === '') return '—'
  const raw = String(value).trim()
  const numeric = Number.parseInt(raw.replace(/\D+/g, ''), 10)
  return Number.isFinite(numeric) ? String(numeric).padStart(3, '0') : raw
}

function machineSortValue(value) {
  const numeric = Number.parseInt(String(value || '').replace(/\D+/g, ''), 10)
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER
}

// Filtros y propiedades computadas basadas en datos base
const availableTurnos = computed(() => {
  return [...new Set(rows.value.map((r) => r.Turno).filter(Boolean))].sort()
})

const availableTipos = computed(() => {
  return [...new Set(rows.value.map((r) => r.Tipo).filter(Boolean))].sort((a, b) => a.localeCompare(b))
})

// Obtiene todas las máquinas únicas ordenadas numéricamente
const dynamicMaquinas = computed(() => {
  const maqs = new Set()
  rows.value.forEach((r) => {
    if (r.Maq && r.Maq !== '—') maqs.add(r.Maq)
  })
  return [...maqs].sort((a, b) => machineSortValue(a) - machineSortValue(b))
})

// Lógica de filtrado y agrupamiento dinámico en la Matriz
const filteredPivotedRows = computed(() => {
  const term = String(q.value || '').trim().toLowerCase()
  const parts = term ? term.split(/\s+/).filter(Boolean) : []

  // 1) Filtrar individualmente los ensayos base
  const filteredBase = rows.value.filter((r) => {
    const matchesSearch = !parts.length || parts.every((part) => {
      return [
        r.Ensayo, r.Fecha, r.Hora, r.Turno, r.Lote, r.Maq, r.Tipo, r.Ne, r.Style
      ].some((field) => String(field ?? '').toLowerCase().includes(part))
    })

    const matchesTurno = !turnoQuery.value || r.Turno === turnoQuery.value
    const matchesTipo = !tipoQuery.value || r.Tipo === tipoQuery.value
    
    // Comparación de fecha exacta
    let matchesDate = true
    if (dateQuery.value) {
      const parsedQueryDate = parseDateFromRaw(dateQuery.value)
      matchesDate = r.Fecha === formatDate(parsedQueryDate)
    }

    return matchesSearch && matchesTurno && matchesTipo && matchesDate
  })

  // 2) Agrupar por Fecha, Turno y Tipo de Máquina
  const groups = {}
  filteredBase.forEach((trial) => {
    const key = `${trial.Fecha}_${trial.Turno}_${trial.Tipo}`
    if (!groups[key]) {
      groups[key] = {
        Fecha: trial.Fecha,
        Turno: trial.Turno,
        Tipo: trial.Tipo,
        trials: []
      }
    }
    groups[key].trials.push(trial)
  })

  // 3) Construir pasadas principales y autogenerar filas extras de re-ensayos
  const result = []
  Object.values(groups).forEach((g) => {
    // Ordenar los ensayos de este grupo por hora/marca de tiempo ascendentemente
    g.trials.sort((a, b) => a._timeMs - b._timeMs)

    const groupPasses = [] // Cada elemento representa una fila en la matriz para este Turno y Tipo
    
    g.trials.forEach((trial) => {
      // Buscar la primera fila del grupo en donde no se haya asignado aún la máquina
      let pass = groupPasses.find((p) => !p.valores[trial.Maq])
      
      // Si ya todas las filas existentes tienen valor para esta máquina, se crea una fila extra de ajuste (re-ensayo)
      if (!pass) {
        pass = {
          Fecha: g.Fecha,
          Turno: g.Turno,
          Tipo: g.Tipo,
          isReensayo: groupPasses.length > 0,
          valores: {},
          times: []
        }
        groupPasses.push(pass)
      }

      // Guardar el valor del CVm % y guardar el objeto del ensayo original para poder ver el detalle
      pass.valores[trial.Maq] = {
        cvm: trial['CVm %'],
        trial: trial
      }
      pass.times.push(trial._timeMs)
    })

    // Calcular el rango horario dinámico de cada fila (pasada)
    groupPasses.forEach((pass) => {
      if (pass.times.length > 0) {
        const minMs = Math.min(...pass.times)
        const maxMs = Math.max(...pass.times)
        const minTime = formatTime(new Date(minMs))
        const maxTime = formatTime(new Date(maxMs))
        pass.rangoHorario = minTime === maxTime ? minTime : `${minTime} a ${maxTime}`
      } else {
        pass.rangoHorario = '—'
      }
      result.push(pass)
    })
  })

  // 4) Ordenar la matriz final por Fecha (descendente), Turno (ascendente), Tipo (ascendente)
  result.sort((a, b) => {
    const timeA = parseDateFromRaw(a.Fecha)?.getTime() || 0
    const timeB = parseDateFromRaw(b.Fecha)?.getTime() || 0
    if (timeB !== timeA) return timeB - timeA
    
    const turnoOrder = a.Turno.localeCompare(b.Turno)
    if (turnoOrder !== 0) return turnoOrder
    
    const tipoOrder = a.Tipo.localeCompare(b.Tipo)
    if (tipoOrder !== 0) return tipoOrder

    // Ensayos principales van primero, re-ensayos extras abajo
    return (a.isReensayo ? 1 : 0) - (b.isReensayo ? 0 : 1)
  })

  return result
})

// Paginación de la matriz pivoteada
const totalPages = computed(() => {
  if (pageSize.value === 0) return 1
  return Math.max(1, Math.ceil(filteredPivotedRows.value.length / pageSize.value))
})

const pagedPivotedRows = computed(() => {
  if (pageSize.value === 0) return filteredPivotedRows.value
  const start = (page.value - 1) * pageSize.value
  return filteredPivotedRows.value.slice(start, start + pageSize.value)
})

const startDisplay = computed(() => {
  if (!filteredPivotedRows.value.length) return 0
  if (pageSize.value === 0) return 1
  return (page.value - 1) * pageSize.value + 1
})

const endDisplay = computed(() => {
  if (!filteredPivotedRows.value.length) return 0
  if (pageSize.value === 0) return filteredPivotedRows.value.length
  return Math.min(filteredPivotedRows.value.length, page.value * pageSize.value)
})

watch([filteredPivotedRows, pageSize], () => {
  page.value = 1
})

function clearFilters() {
  q.value = ''
  turnoQuery.value = ''
  tipoQuery.value = ''
  dateQuery.value = getYesterdayString()
  cvmLimit.value = 4.0
}

// Estilo condicional de celdas basado en el límite de CVm %
function getCellClass(valObj) {
  if (!valObj) return ''
  const val = toNumber(valObj.cvm)
  if (val == null) return ''
  
  if (val > cvmLimit.value) {
    return 'bg-red-50 text-red-700 hover:bg-red-100 transition-colors'
  }
  return 'hover:bg-slate-100 text-slate-800 transition-colors'
}

// Click en celda para abrir detalles del ensayo correspondiente
function handleCellClick(valObj) {
  if (valObj && valObj.trial) {
    openDetail(valObj.trial)
  }
}

// Carga del detalle (títulos y TBL)
async function openDetail(trial) {
  detailRow.value = trial
  detailTblRows.value = (allTblRows.value || []).filter((r) => String(r.TESTNR) === String(trial.Ensayo))
  detailTitulos.value = []
  detailVisible.value = true

  try {
    const response = await fetch(`/api/uster-cardas/titulos?testnr=${encodeURIComponent(trial.Ensayo)}`)
    const data = await response.json()
    detailTitulos.value = Array.isArray(data?.rows) ? data.rows.map((r) => formatMetric(r.TITULO, 3)) : []
  } catch {
    detailTitulos.value = []
  }
}

function closeDetail() {
  detailVisible.value = false
  detailRow.value = null
  detailTblRows.value = []
  detailTitulos.value = []
}

function getTooltipContent(t) {
  if (!t) return ''

  // Estilos reutilizables
  const sLabel = 'color:#6b7280;font-weight:500;padding-right:8px;text-align:left;font-size:10px;'
  const sVal   = 'color:#111827;font-weight:600;text-align:right;font-size:10px;font-variant-numeric:tabular-nums;'
  const sBlock = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;margin-bottom:6px;'
  const sBlockTitle = 'color:#475569;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;'
  const sRow   = 'display:grid;grid-template-columns:1fr auto;gap:2px 8px;'
  const sCols2 = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;'

  const titleColor = t.Tipo === 'MANUAR' ? '#4f46e5' : '#0ea5e9'
  const titleClass = t.Tipo === 'MANUAR' ? 'MANUAR' : 'CARDA'

  const fmt = (val, dec = 2) => {
    if (val == null || val === '') return '—'
    const n = Number(val)
    return Number.isFinite(n) ? n.toFixed(dec) : '—'
  }

  // Generar tabla de detalle TBL de forma dinámica y ultra compacta
  let tblHtml = ''
  if (Array.isArray(t.tblRows) && t.tblRows.length > 0) {
    const rowsHtml = t.tblRows.map(r => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 3px 4px; font-weight: 600; text-align: center;">${r.SEQNO || '—'}</td>
        <td style="padding: 3px 4px; text-align: center;">${r.NO_ || '—'}</td>
        <td style="padding: 3px 4px; text-align: center;">${fmt(r.U_PERCENT, 2)}</td>
        <td style="padding: 3px 4px; text-align: center; font-weight: 700; color: #1e3a8a;">${fmt(r.CVM_PERCENT, 2)}</td>
        <td style="padding: 3px 4px; text-align: center;">${fmt(r.CVM_1M_PERCENT, 2)}</td>
        <td style="padding: 3px 4px; text-align: center;">${fmt(r.CVM_3M_PERCENT, 2)}</td>
        <td style="padding: 3px 4px; text-align: center;">${fmt(r.CVM_10M_PERCENT, 2)}</td>
        <td style="padding: 3px 4px; text-align: center;">${fmt(r.TITULO_MACHINE, 3)}</td>
        <td style="padding: 3px 4px; text-align: center;">${fmt(r.TITULO_REL_PERC, 2)}</td>
      </tr>
    `).join('')

    tblHtml = `
      <div style="${sBlock}margin-bottom:6px;overflow-x:auto;">
        <div style="${sBlockTitle}color:#b91c1c;margin-bottom:6px;">Detalle TBL</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; line-height: 1.2;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #cbd5e1; color: #475569; font-weight: 700;">
              <th style="padding: 3px 4px; text-align: center;">Seq</th>
              <th style="padding: 3px 4px; text-align: center;">No</th>
              <th style="padding: 3px 4px; text-align: center;">U %</th>
              <th style="padding: 3px 4px; text-align: center; color: #1e3a8a;">CVm %</th>
              <th style="padding: 3px 4px; text-align: center;">CVm 1m</th>
              <th style="padding: 3px 4px; text-align: center;">CVm 3m</th>
              <th style="padding: 3px 4px; text-align: center;">CVm 10m</th>
              <th style="padding: 3px 4px; text-align: center;">Tit. Uster</th>
              <th style="padding: 3px 4px; text-align: center;">Tit. Rel %</th>
            </tr>
          </thead>
          <tbody style="color: #334155;">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `
  } else {
    tblHtml = `
      <div style="${sBlock}text-align: center; color: #94a3b8; font-size: 10px; padding: 12px;">
        Sin detalle TBL.
      </div>
    `
  }

  return `
    <div style="min-width:440px;font-size:11px;line-height:1.45;font-family:sans-serif;text-align:left;padding:2px;">
      <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:700;color:${titleColor};font-size:13px;">Ensayo ${t.Ensayo}</div>
          <div style="font-size:10px;color:#94a3b8;font-weight:500;">${t.Fecha} ${t.Hora} · Turno ${t.Turno}</div>
        </div>
        <span style="font-size:9px;font-weight:800;color:${titleColor};background:#f0fdf4;padding:2px 6px;border-radius:4px;border:1px solid #cffafe;">
          ${t.Maq} · ${titleClass}
        </span>
      </div>

      <!-- Identificación del material y lote -->
      <div style="${sBlock}background:#f0f9ff;border-color:#bae6fd;">
        <div style="${sBlockTitle}color:#0369a1;">Identificación y Proceso</div>
        <div style="${sRow}">
          <span style="${sLabel}">Lote</span><span style="${sVal}">${t.Lote}</span>
          <span style="${sLabel}">Familia/Tipo</span><span style="${sVal}">${t.Tipo}</span>
          <span style="${sLabel}">Estilo</span><span style="${sVal}">${t.Style}</span>
          <span style="${sLabel}">Título Ne</span><span style="${sVal}">${t.Ne}</span>
          <span style="${sLabel}">Catálogo</span><span style="${sVal}">${t.Catalogo}</span>
          <span style="${sLabel}">Laboratorista</span><span style="${sVal}">${t.Laboratorista}</span>
        </div>
      </div>

      <div style="${sCols2}">
        <!-- Títulos de cinta -->
        <div style="${sBlock}">
          <div style="${sBlockTitle}">Títulos de Cinta</div>
          <div style="${sRow}">
            <span style="${sLabel}">Título 1</span><span style="${sVal}">${t['Tit. 1'] || '—'}</span>
            <span style="${sLabel}">Título 2</span><span style="${sVal}">${t['Tit. 2'] || '—'}</span>
            <span style="${sLabel}">Título 3</span><span style="${sVal}">${t['Tit. 3'] || '—'}</span>
            <span style="${sLabel}">Promedio</span><span style="${sVal}">${t['Tit. Prom']}</span>
            <span style="${sLabel}">Desviación</span><span style="${sVal}">${t['Tit. Desv']}</span>
            <span style="${sLabel}">CV %</span><span style="${sVal}">${t['Tit. CV %']}</span>
          </div>
        </div>

        <!-- Resultados Uster -->
        <div style="${sBlock}background:#fff5f5;border-color:#feb2b2;">
          <div style="${sBlockTitle}color:#9b2c2c;">Métricas Uster</div>
          <div style="${sRow}">
            <span style="${sLabel};color:#9b2c2c;font-weight:700;">CVm %</span><span style="${sVal};color:#9b2c2c;font-weight:700;">${t['CVm %']} %</span>
            <span style="${sLabel}">U %</span><span style="${sVal}">${t['U %']} %</span>
            <span style="${sLabel}">CVm 1m</span><span style="${sVal}">${t['CVm 1m']} %</span>
            <span style="${sLabel}">CVm 3m</span><span style="${sVal}">${t['CVm 3m']} %</span>
            <span style="${sLabel}">CVm 10m</span><span style="${sVal}">${t['CVm 10m']} %</span>
          </div>
        </div>
      </div>

      <!-- Detalle TBL -->
      ${tblHtml}
      
      <div style="font-size:9px;color:#94a3b8;text-align:center;margin-top:4px;">
        💡 Haz clic en la celda para abrir la trazabilidad detallada
      </div>
    </div>
  `
}

// Carga de datos crudos desde el backend
async function loadRows() {
  loading.value = true
  try {
    const [parResponse, tblResponse] = await Promise.all([
      fetch('/api/uster-cardas/par'),
      fetch('/api/uster-cardas/tbl'),
    ])

    const parData = await parResponse.json()
    const tblData = await tblResponse.json()

    if (!parResponse.ok) throw new Error(parData?.error || 'No se pudo cargar PAR CARDAS')
    if (!tblResponse.ok) throw new Error(tblData?.error || 'No se pudo cargar TBL CARDAS')

    const parRows = Array.isArray(parData?.rows) ? parData.rows : []
    const tblRows = Array.isArray(tblData?.rows) ? tblData.rows : []
    allTblRows.value = tblRows

    const tblByTestnr = new Map()
    for (const row of tblRows) {
      const testnr = String(row.TESTNR || '')
      if (!testnr) continue
      if (!tblByTestnr.has(testnr)) tblByTestnr.set(testnr, [])
      tblByTestnr.get(testnr).push(row)
    }

    const data = parRows.map((row) => {
      const testnr = String(row.TESTNR || '')
      const date = parseDateFromRaw(row.TIME_STAMP)
      const tblList = tblByTestnr.get(testnr) || []

      return {
        Ensayo: testnr,
        FechaHora: formatDateTime(date),
        Fecha: formatDate(date),
        Hora: formatTime(date),
        _timeMs: date ? date.getTime() : 0,
        Turno: getTurnoFromDate(date),
        Lote: row.LOTE || '—',
        Maq: formatMachine(row.MASCHNR),
        Tipo: row.MACHINE_FAMILY || '—',
        Ne: formatMetric(row.NOMCOUNT, 2),
        Catalogo: row.CATALOG || '—',
        Laboratorista: row.LABORANT || '—',
        Style: row.STYLE || '—',
        'Tit. Prom': formatMetric(row.TITULO_AVG, 3),
        'Tit. Desv': formatMetric(row.TITULO_STDDEV, 4),
        'Tit. CV %': formatMetric(row.TITULO_CV, 2),
        'Tit. 1': formatMetric(row.TITULO_1, 3),
        'Tit. 2': formatMetric(row.TITULO_2, 3),
        'Tit. 3': formatMetric(row.TITULO_3, 3),
        'U %': formatMetric(calcAvg(tblList, 'U_PERCENT'), 2),
        'CVm %': formatMetric(calcAvg(tblList, 'CVM_PERCENT'), 2),
        'CVm 1m': formatMetric(calcAvg(tblList, 'CVM_1M_PERCENT'), 2),
        'CVm 3m': formatMetric(calcAvg(tblList, 'CVM_3M_PERCENT'), 2),
        'CVm 10m': formatMetric(calcAvg(tblList, 'CVM_10M_PERCENT'), 2),
        'Tit. Uster': formatMetric(calcAvg(tblList, 'TITULO_MACHINE'), 3),
        'Tit. Rel %': formatMetric(calcAvg(tblList, 'TITULO_REL_PERC'), 2),
        tblRows: tblList,
      }
    })

    rows.value = data
    lastLoadedAt.value = formatDateTime(new Date())
  } catch (err) {
    console.error('Failed to load cardas control matrix data', err)
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los ensayos para la matriz.' })
  } finally {
    loading.value = false
  }
}

// Exportación en limpio de la matriz a un formato Excel adecuado
async function exportToExcel() {
  try {
    if (!filteredPivotedRows.value.length) {
      Swal.fire({ icon: 'warning', title: 'Sin datos', text: 'No hay registros en la matriz para exportar.' })
      return
    }

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Matriz de Control Uster')

    // Definición de columnas fijas + columnas de máquinas
    const headers = ['Fecha', 'Turno', 'Tipo', 'Rango Horario', ...dynamicMaquinas.value.map(m => `M-${m}`)]
    sheet.columns = headers.map(h => ({ header: h, key: h, width: 14 }))

    filteredPivotedRows.value.forEach((row) => {
      const rowData = {
        Fecha: row.Fecha,
        Turno: row.Turno,
        Tipo: row.Tipo,
        'Rango Horario': (row.isReensayo ? '[Re-ensayo] ' : '') + row.rangoHorario
      }
      
      // Llenar celdas de las máquinas
      dynamicMaquinas.value.forEach(maq => {
        rowData[`M-${maq}`] = row.valores[maq] ? Number(row.valores[maq].cvm) : ''
      })

      const addedRow = sheet.addRow(rowData)

      // Estilo visual condicional en el Excel para celdas que superan el límite de CVm %
      dynamicMaquinas.value.forEach((maq, mIdx) => {
        const cellVal = row.valores[maq]
        if (cellVal) {
          const numVal = toNumber(cellVal.cvm)
          if (numVal && numVal > cvmLimit.value) {
            const cell = addedRow.getCell(5 + mIdx) // index 1-based (Fecha=1, Turno=2, Tipo=3, Rango=4, Maqs start at 5)
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFC7CE' } // Rojo claro
            }
            cell.font = {
              color: { argb: 'FF9C0006' }, // Rojo oscuro
              bold: true
            }
          }
        }
      })
    })

    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `matriz-control-uster-${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error exporting control matrix', err)
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo exportar la matriz de control.' })
  }
}

onMounted(() => {
  loadRows()
})
</script>

<style scoped>
/* Optimizaciones minimalistas de scroll y lectura */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
