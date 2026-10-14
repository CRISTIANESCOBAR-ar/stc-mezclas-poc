<template>
  <div class="md:hidden p-4">
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 text-sm">
      Esta pagina de carga (Uster Cardas) esta disponible solo en escritorio.
    </div>
  </div>

  <div class="hidden md:flex w-full h-screen flex-col p-1">
    <main class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col overflow-y-auto cardas-component">
      <div class="shrink-0 mb-3 flex flex-wrap items-center gap-3 cardas-toolbar">
        <div class="text-2xl font-semibold text-slate-800 mr-4 inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 4h16v4H4z"/>
            <path d="M4 12h16v8H4z"/>
            <path d="M9 8v4"/>
            <path d="M15 8v4"/>
          </svg>
          <span>Datos de Cardas y Manuares</span>
        </div>
        <label class="text-sm font-semibold text-slate-700 mr-2 shrink-0">Carpeta Uster Cardas:</label>

        <div class="flex-1 min-w-0">
          <div
            class="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 truncate shadow-sm"
            v-tippy="{ content: folderPathFull, allowHTML: false, theme: 'light' }"
          >
            {{ folderPathFull || selectedFolderName || (initialLoadBannerState === 'checking-folder' ? 'Comprobando carpeta recordada...' : 'Ninguna carpeta seleccionada') }}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            :disabled="initialLoadBannerState === 'checking-folder' || initialLoadBannerState === 'loading' || isSaving || batchImporting" @click="selectFolder"
            v-tippy="{ content: 'Seleccionar carpeta de ensayos', theme: 'light', placement: 'bottom' }"
            class="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h3l2 3h9a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            Seleccionar
          </button>

          <button
            v-if="hasPersistedHandle"
            @click="refreshFolder"
            v-tippy="{ content: 'Actualizar lectura de la carpeta', theme: 'light', placement: 'bottom' }"
            class="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>

          <button
            v-if="pendingBatchCount > 0"
            @click="batchImportPending"
            :disabled="batchImporting"
            class="inline-flex items-center gap-2 px-3 py-1 border border-emerald-400 bg-emerald-50 text-emerald-800 rounded-md text-sm font-semibold hover:bg-emerald-100 transition-colors duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span v-if="batchImporting">Importando {{ batchProgress }}/{{ batchTotal }}...</span>
            <span v-else>⬆ Importar en lote ({{ pendingBatchCount }})</span>
          </button>

          <input ref="folderInput" type="file" webkitdirectory directory multiple class="hidden" @change="onFolderInputChange" />
        </div>
      </div>

      <Teleport to="body">
        <div class="fixed bottom-4 right-4 z-[150] max-w-[min(360px,calc(100vw-2rem))] pointer-events-none text-sm">
          <div v-if="loadError" role="alert" class="pointer-events-auto flex gap-3 rounded-xl border border-red-400 bg-red-950 p-4 text-white shadow-2xl ring-2 ring-white/80">
            <ExclamationTriangleIcon class="h-6 w-6 shrink-0 text-red-300" aria-hidden="true"/>
            <div><p class="font-semibold">No se pudo completar la carga</p><p class="mt-1 text-xs">{{ loadError }}</p><p class="mt-1 text-xs">Volvé a seleccionar el ensayo o actualizar la carpeta.</p></div>
          </div>
          <div v-else-if="isLoadingSaved" role="status" class="flex gap-3 rounded-xl border border-blue-300 bg-blue-100 p-4 text-blue-900 shadow-2xl ring-2 ring-white/80">
            <ArrowPathIcon class="h-6 w-6 shrink-0 animate-spin motion-reduce:animate-none text-blue-600" aria-hidden="true"/>
            <div><p class="font-semibold">Abriendo {{ selectedTestnr }}</p><p class="mt-1 text-xs">Recuperando mediciones y títulos guardados.</p></div>
          </div>
          <div v-else-if="hasUnsavedChanges" role="status" class="pointer-events-auto flex gap-3 rounded-xl border border-amber-400 bg-amber-950 p-4 text-white shadow-2xl ring-2 ring-white/80">
            <PencilSquareIcon class="h-6 w-6 shrink-0 text-amber-300" aria-hidden="true"/>
            <div><p class="font-semibold">{{ selectedTestnr }} · edición pendiente</p><p class="mt-1 text-xs">Tus títulos todavía no están guardados.</p>
              <button :disabled="isSaving" @click="discardChanges" v-tippy="{ content:'Restaurar títulos anteriores a esta edición',theme:'light' }" class="mt-2 underline">Descartar cambios</button></div>
          </div>
        </div>
      </Teleport>
      <div class="grid cardas-grid">
        <div class="flex flex-col gap-3 min-h-0">
          <div class="bg-slate-50 rounded-lg border border-slate-200 p-3 flex items-center gap-4 text-sm">
            <label class="flex items-center gap-2">
              <input type="radio" :checked="filterMode === 'not'" @change="changeFilter('not')" />
              <span>No guardados</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" :checked="filterMode === 'saved'" @change="changeFilter('saved')" />
              <span>Guardados</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" :checked="filterMode === 'all'" @change="changeFilter('all')" />
              <span>Todos</span>
            </label>
          </div>

          <div v-if="initialLoadBanner" :class="initialLoadBanner.containerClass" class="rounded-xl px-4 py-3 text-sm shadow-sm">
            <div class="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" :class="initialLoadBanner.iconClass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              <div>
                <div class="font-semibold">{{ initialLoadBanner.title }}</div>
                <div :class="initialLoadBanner.messageClass">{{ initialLoadBanner.message }}</div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 overflow-auto bg-white cardas-scan-list">
            <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs cardas-scan-table">
              <thead>
                <tr class="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-10 shadow-sm">
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Ensayo</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">.PAR</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">.TBL</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Estado</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Ne</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Maq.</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">F/Hora</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Turno</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Tipo</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredScanList"
                  :key="item.recordKey"
                  class="hover:bg-blue-50 cursor-pointer transition-colors"
                  :class="{ 'bg-blue-50': selectedTestnr === item.recordKey }"
                  @click="selectRow(item.recordKey)"
                >
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ item.testnr }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ item.hasPar ? 'OK' : '' }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ item.hasTbl ? 'OK' : '' }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">
                    <span :class="item.imp ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'">
                      {{ item.imp ? 'Guardado' : 'Pendiente' }}
                    </span>
                  </td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ item.nomcount || '' }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ item.maschnr || '' }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center whitespace-nowrap">{{ item.parTimeDisplay || '-' }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center font-semibold">{{ item.turno || '-' }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ item.machineFamily || '' }}</td>
                </tr>
                <tr v-if="!filteredScanList.length">
                  <td colspan="9" class="px-2 py-4 text-center text-slate-500">No hay ensayos para el filtro actual.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="text-sm text-slate-600">{{ scanStatus }}</div>
        </div>

        <div class="flex flex-col gap-3 min-h-0">
          <div class="rounded-xl border border-slate-200 bg-white p-3 space-y-2 cardas-detail">
            <div class="text-lg font-semibold text-slate-800">Datos Ensayo Cinta</div>
            <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span class="font-semibold">TESTNR:</span> {{ selectedTestnrLabel || '-' }}</div>
              <div><span class="font-semibold">Catalogo:</span> {{ parData.CATALOG || '-' }}</div>
              <div><span class="font-semibold">Lote:</span> {{ parData.LOTE || '-' }}</div>
              <div><span class="font-semibold">Fecha/Hora:</span> {{ formatDateTime(parData.TIME) }}</div>
              <div><span class="font-semibold">Maquina:</span> {{ parData.MASCHNR || '-' }}</div>
              <div><span class="font-semibold">Style:</span> {{ parData.STYLE || '-' }}</div>
              <div><span class="font-semibold">Tipo Carda:</span> {{ machineFamily || '-' }}</div>
              <div><span class="font-semibold">Laboratorista:</span> {{ parData.LABORANT || '-' }}</div>
              <div class="cardas-observations"><span class="font-semibold">Observaciones:</span> {{ parData.OBS || '—' }}</div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-3 space-y-2 cardas-detail">
            <div class="text-lg font-semibold text-slate-800">Titulos de Cinta (3 repeticiones)</div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-slate-600">Titulo 1</label>
                <input
                  ref="tituloInput1"
                  v-model="tituloInputs[0]"
                  :disabled="!selectedTestnr || isLoadingSaved || isSaving || !!loadError || batchImporting"
                  inputmode="decimal"
                  autocomplete="off"
                  @input="onTituloInput(0, $event)"
                  @blur="onTituloBlur(0)"
                  @keydown.enter.prevent="focusNextTitulo(0)"
                  @keydown.down.prevent="focusNextTitulo(0)"
                  @keydown.up.prevent="focusPrevTitulo(0)"
                  class="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label class="text-xs text-slate-600">Titulo 2</label>
                <input
                  ref="tituloInput2"
                  v-model="tituloInputs[1]"
                  :disabled="!selectedTestnr || isLoadingSaved || isSaving || !!loadError || batchImporting"
                  inputmode="decimal"
                  autocomplete="off"
                  @input="onTituloInput(1, $event)"
                  @blur="onTituloBlur(1)"
                  @keydown.enter.prevent="focusNextTitulo(1)"
                  @keydown.down.prevent="focusNextTitulo(1)"
                  @keydown.up.prevent="focusPrevTitulo(1)"
                  class="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label class="text-xs text-slate-600">Titulo 3</label>
                <input
                  ref="tituloInput3"
                  v-model="tituloInputs[2]"
                  :disabled="!selectedTestnr || isLoadingSaved || isSaving || !!loadError || batchImporting"
                  inputmode="decimal"
                  autocomplete="off"
                  @input="onTituloInput(2, $event)"
                  @blur="onTituloBlur(2)"
                  @keydown.enter.prevent="focusNextTitulo(2)"
                  @keydown.down.prevent="focusNextTitulo(2)"
                  @keydown.up.prevent="focusPrevTitulo(2)"
                  class="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 text-sm bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div><span class="font-semibold">Promedio:</span> {{ fmtNum(tituloStats.avg, 3) }}</div>
              <div><span class="font-semibold">Desvio:</span> {{ fmtNum(tituloStats.stddev, 4) }}</div>
              <div><span class="font-semibold">CV %:</span> {{ fmtNum(tituloStats.cv, 2) }}</div>
            </div>

            <div class="flex gap-2">
              <button
                ref="saveButton"
                @click="saveCurrentTest" v-tippy="{ content: 'Guardar títulos del ensayo seleccionado', theme: 'light' }"
                :disabled="!canSave || isSaving"
                @keydown.enter.prevent="handleSaveButtonEnter"
                @keydown.up.prevent="focusLastTitulo"
                class="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSaving ? 'Guardando...' : 'Guardar' }}
              </button>

              <button
                v-if="can('administrador')" @click="deleteCurrentTest" v-tippy="{ content: 'Eliminar el ensayo guardado', theme: 'light' }"
                :disabled="!isTestSaved || isDeleting"
                class="inline-flex items-center gap-2 px-3 py-1 border border-red-300 bg-white text-red-700 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white overflow-auto min-h-0 cardas-measurements">
            <table class="w-full text-xs table-auto divide-y divide-slate-200 cardas-measurements-table">
              <thead>
                <tr class="bg-gradient-to-r from-slate-50 to-slate-100">
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">SEQ</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">No</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">U%</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm%</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm 1m</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm 3m</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">CVm 10m</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Titulo Uster</th>
                  <th class="px-2 py-2 text-center font-semibold text-slate-700">Titulo Rel%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in tblData" :key="row.SEQNO">
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.SEQNO }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.NO_ }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.U_PERCENT }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.CVM_PERCENT }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.CVM_1M_PERCENT }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.CVM_3M_PERCENT }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.CVM_10M_PERCENT }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.TITULO_MACHINE }}</td>
                  <td class="px-2 py-2 border-t border-slate-100 text-center">{{ row.TITULO_REL_PERC }}</td>
                </tr>
                <tr v-if="!tblData.length">
                  <td colspan="9" class="px-2 py-4 text-center text-slate-500">Sin datos TBL parseados.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { apiFetch, can } from '@/services/authSession.js';
import { requestJson } from '@/services/apiClient.js';
import { scanUsterFiles } from '@/services/usterScan.js';
import { ArrowPathIcon, ExclamationTriangleIcon, PencilSquareIcon } from '@heroicons/vue/24/outline';
import { onBeforeRouteLeave } from 'vue-router';

import { optionalNumber } from '@shared/numbers.js'
import { computed, nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import Swal from 'sweetalert2'

const folderInput = ref(null)
const selectedFolderName = ref('')
const folderPathFull = ref('')
const hasPersistedHandle = ref(false)
const scanStatus = ref('')
const initialLoadBannerState = ref('checking-folder')
const isLoadingSaved = ref(false)
const loadError = ref('')
const savedVersion = ref(null)
const confirmedTitles = ref(null)
const scanProgress = ref({ completed: 0, total: 0, detected: 0, verified: false })
const hasUnsavedChanges = computed(() => confirmedTitles.value !== null && JSON.stringify(tituloInputs.value) !== JSON.stringify(confirmedTitles.value))
function allowDiscard() { return !hasUnsavedChanges.value || window.confirm('Hay títulos sin guardar. ¿Descartarlos?') }
function discardChanges() { if (confirmedTitles.value && !isSaving.value) tituloInputs.value = [...confirmedTitles.value] }
function changeFilter(mode) {
  if (isSaving.value || batchImporting.value || isLoadingSaved.value || !allowDiscard()) return
  confirmedTitles.value = null; filterMode.value = mode; clearSelection()
}
function beforeUnload(e) { if (hasUnsavedChanges.value || isSaving.value || batchImporting.value) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(() => !isSaving.value && !batchImporting.value && allowDiscard())

const scanList = ref([])
const selectedTestnr = ref('')
const fileText = ref('')
const tblText = ref('')
const parData = ref({})
const tblData = ref([])
const machineFamily = ref('')

const filterMode = ref('not')
const tituloInputs = ref(['', '', ''])
const tituloInput1 = ref(null)
const tituloInput2 = ref(null)
const tituloInput3 = ref(null)
const saveButton = ref(null)

const isSaving = ref(false)
const isDeleting = ref(false)
const batchImporting = ref(false)
const batchProgress = ref(0)
const batchTotal = ref(0)

function getTestnrFromName(name) {
  if (!name) return null
  const m = String(name).match(/STC\d+[_-]?(\d{5})/i)
  return m ? m[1] : null
}

function getPrefixFromName(name) {
  if (!name) return ''
  const m = String(name).match(/^(STC\d+)/i)
  return m ? m[1].toUpperCase() : ''
}

function normalizeTestnr(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.replace(/^0+/, '') || '0'
}

function makeRecordKey(testnr, sourcePrefix) {
  return `${String(sourcePrefix || '').trim().toUpperCase()}::${normalizeTestnr(testnr)}`
}

function extractTsvCell(text, rowIndex, colIndex) {
  if (!text) return ''
  const lines = String(text).split(/\r?\n/)
  if (rowIndex - 1 >= lines.length) return ''
  const cols = String(lines[rowIndex - 1] || '').split('\t')
  if (colIndex - 1 >= cols.length) return ''
  return String(cols[colIndex - 1] || '').trim()
}

function parseDateFromRaw(value) {
  if (value == null || value === '') return null

  const raw = String(value).trim()

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw)
    if (!Number.isFinite(numeric)) return null
    const date = new Date(raw.length >= 13 ? numeric : numeric * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  // Soporte para formato YYYY-MM-DD (datepicker) en hora local
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (ymdMatch) {
    const year = Number(ymdMatch[1])
    const month = Number(ymdMatch[2]) - 1
    const day = Number(ymdMatch[3])
    const date = new Date(year, month, day, Number(ymdMatch[4] || 0), Number(ymdMatch[5] || 0), Number(ymdMatch[6] || 0))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (match) {
    let year = Number(match[3])
    if (year < 100) year += 2000
    const date = new Date(year, Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  const date = new Date(parsed)
  return Number.isNaN(date.getTime()) ? null : date
}

function getTurnoFromDate(date) {
  if (!date) return ''
  const h = date.getHours()
  if (h >= 6 && h <= 13) return 'A'
  if (h >= 14 && h <= 21) return 'B'
  return 'C'
}

function formatDateTimeFromDate(date) {
  if (!date) return '-'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

function detectMachineFamily(style, prefix, maschnr) {
  const s = String(style || '').toUpperCase()
  const p = String(prefix || '').toUpperCase()
  const m = Number.parseInt(String(maschnr || '').replace(/\D+/g, ''), 10)

  if (s.includes('MANUAR')) return 'MANUAR'
  if (Number.isFinite(m) && m >= 1 && m <= 3 && !s.includes('TRUTZSCHLER') && !s.includes('RIETER')) return 'MANUAR'
  if (s.includes('TRUTZSCHLER')) return 'TRUTZSCHLER'
  if (s.includes('RIETER')) return 'CARDA RIETER'
  if (p.startsWith('STC02') || p.startsWith('STC002')) return 'TRUTZSCHLER'
  if (p.startsWith('STC01') || p.startsWith('STC001')) return 'CARDA RIETER'
  return 'NO DEFINIDO'
}

function parseParText(text, filename, sourcePath = '') {
  const prefix = getPrefixFromName(filename)
  
  // Robust key-value map parsing
  const lines = String(text || '').split(/\r?\n/)
  const keyMap = {}
  let catalogVal = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.toUpperCase().startsWith('CATALOG')) {
      catalogVal = trimmed.replace(/^CATALOG\s+/i, '').trim()
    }
    const cols = line.split('\t').map(c => c.trim())
    if (cols.length >= 2) {
      const key1 = cols[0].toUpperCase()
      const key2 = cols[2] ? cols[2].toUpperCase() : ''
      const val = cols[4] !== undefined ? cols[4] : cols[cols.length - 1]
      if (key1) keyMap[key1] = val
      if (key2) keyMap[key2] = val
    }
  }

  const getVal = (key, lineNum, colNum) => {
    if (keyMap[key] !== undefined && keyMap[key] !== '') return keyMap[key]
    return extractTsvCell(text, lineNum, colNum)
  }

  const rawTime = getVal('TIME', 9, 5)
  const timeDate = parseDateFromRaw(rawTime)
  
  const out = {
    TESTNR: getVal('TESTNR', 8, 5),
    TIME: rawTime,
    LOTE: getVal('LOTE', 10, 5),
    SORTIMENT: keyMap['SORTIMENT'] || extractTsvCell(text, 11, 3),
    STYLE: keyMap['STYLE'] || extractTsvCell(text, 11, 5),
    MASCHNR: getVal('MASCHNR', 13, 5),
    MATCLASS: getVal('MATCLASS', 14, 8),
    NOMCOUNT: getVal('NOMCOUNT', 15, 5),
    LABORANT: getVal('LABORANT', 21, 5),
    OBS: getVal('OBS', 22, 5),
    CATALOG: catalogVal || extractTsvCell(text, 3, 1).replace(/^CATALOG\s+/i, ''),
    SOURCE_PREFIX: prefix,
    SOURCE_PATH: sourcePath || filename,
    TIME_MS: timeDate ? timeDate.getTime() : null,
    TIME_DISPLAY: timeDate ? formatDateTimeFromDate(timeDate) : (rawTime || ''),
    TURNO: getTurnoFromDate(timeDate),
  }
  
  const filenameHasManuar = String(filename || '').toUpperCase().includes('MANUAR')

  // Look for MANUAR only in specific 'alimentacion'-like keys parsed into keyMap,
  // avoid scanning the whole file text which can contain unrelated mentions.
  const alimentKeys = ['ALIMENTACION', 'ALIMENT', 'CADENA_ALIMENTACION', 'CHAIN_FEED', 'ALIMENTATION']
  const alimentacionVal = alimentKeys.map(k => String(keyMap[k] || '')).join(' ').toUpperCase()
  const hasManuarInAliment = alimentacionVal.includes('MANUAR')

  // If filename explicitly references MANUAR, or STYLE is empty and alimentacion indicates MANUAR, set STYLE.
  if (filenameHasManuar || ((!out.STYLE || out.STYLE === '') && hasManuarInAliment)) {
    if (!out.STYLE || out.STYLE === '') out.STYLE = 'MANUAR'
  }

  const openEndJoined = [
    out.STYLE,
    out.SORTIMENT,
    out.MATCLASS,
    out.OBS,
    out.CATALOG,
    out.SOURCE_PREFIX,
    out.SOURCE_PATH,
  ]
    .map((v) => String(v || '').toUpperCase())
    .join(' ')

  const hasExplicitOpenEnd =
    openEndJoined.includes('OPEN END') ||
    openEndJoined.includes('OPENEND') ||
    openEndJoined.includes('ROTOR') ||
    /(^|[^A-Z0-9])OE([^A-Z0-9]|$)/.test(openEndJoined)

  out.MACHINE_FAMILY = hasExplicitOpenEnd
    ? 'OPEN END'
    : detectMachineFamily(out.STYLE, prefix, out.MASCHNR)

  // Only force MACHINE_FAMILY to MANUAR when STYLE explicitly indicates MANUAR or filename does,
  // or when alimentacion indicates MANUAR but STYLE is absent. Explicit STYLE (e.g. 'OPEN END') wins.
  const styleUpper = String(out.STYLE || '').toUpperCase()
  if (!hasExplicitOpenEnd && (styleUpper.includes('MANUAR') || filenameHasManuar || (hasManuarInAliment && (!styleUpper || styleUpper === '')))) {
    out.MACHINE_FAMILY = 'MANUAR'
  }

  return out
}

function hasOpenEndHints(par) {
  if (!par || typeof par !== 'object') return false

  // If STYLE contains MANUAR or family is MANUAR, it is a MANUAR trial (preparation), NOT rotor / Open End!
  const style = String(par.STYLE || '').toUpperCase()
  const family = String(par.MACHINE_FAMILY || '').toUpperCase()
  if (style.includes('MANUAR') || family === 'MANUAR') return false

  const joined = [
    par.STYLE,
    par.SORTIMENT,
    par.MATCLASS,
    par.OBS,
    par.CATALOG,
    par.SOURCE_PREFIX,
    par.SOURCE_PATH,
  ]
    .map((v) => String(v || '').toUpperCase())
    .join(' ')

  if (joined.includes('OPEN END') || joined.includes('OPENEND') || joined.includes('ROTOR')) return true
  if (/(^|[^A-Z0-9])OE([^A-Z0-9]|$)/.test(joined)) return true

  const prefix = String(par.SOURCE_PREFIX || '').toUpperCase()
  if (prefix.startsWith('STC03') || prefix.startsWith('STC003')) return true

  return false
}

function isCardasPar(par) {
  if (!par || typeof par !== 'object') return false

  if (hasOpenEndHints(par)) return false

  const family = String(par.MACHINE_FAMILY || '').toUpperCase()
  if (family === 'MANUAR' || family === 'TRUTZSCHLER' || family === 'CARDA RIETER') return true

  const style = String(par.STYLE || '').toUpperCase()
  if (style.includes('MANUAR') || style.includes('TRUTZSCHLER') || style.includes('RIETER')) return true

  const prefix = String(par.SOURCE_PREFIX || '').toUpperCase()
  if (prefix.startsWith('STC01') || prefix.startsWith('STC001') || prefix.startsWith('STC02') || prefix.startsWith('STC002')) return true

  // If the file starts with STC03 but is actually MANUAR, it is Cardas!
  if ((prefix.startsWith('STC03') || prefix.startsWith('STC003')) && (style.includes('MANUAR') || family === 'MANUAR')) return true

  return false
}

function getMachineSortValue(machine) {
  const numeric = Number.parseInt(String(machine || '').replace(/\D+/g, ''), 10)
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER
}

function getMachineSequence(item) {
  const machine = getMachineSortValue(item?.maschnr)
  const family = String(item?.machineFamily || '').toUpperCase()
  const isManuar = family === 'MANUAR' || (family === 'NO DEFINIDO' && machine >= 1 && machine <= 3)

  if (!Number.isFinite(machine) || machine === Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER
  if (isManuar) return 100 + machine
  return machine
}

function getTurnoSortValue(turno) {
  if (turno === 'A') return 0
  if (turno === 'B') return 1
  if (turno === 'C') return 2
  return 3
}

function sortShiftItems(items) {
  const chronological = [...items].sort((a, b) => {
    const ta = Number.isFinite(a.parTimeMs) ? a.parTimeMs : Number.MAX_SAFE_INTEGER
    const tb = Number.isFinite(b.parTimeMs) ? b.parTimeMs : Number.MAX_SAFE_INTEGER
    if (ta !== tb) return ta - tb
    return String(a.testnr || '').localeCompare(String(b.testnr || ''))
  })

  let round = 1
  let prevSeq = null
  const enriched = chronological.map((item) => {
    const seq = getMachineSequence(item)
    if (prevSeq != null && seq < prevSeq) {
      const isManuarToMidCarda = prevSeq >= 100 && seq >= 8
      if (!isManuarToMidCarda) round += 1
    }
    prevSeq = seq
    return { ...item, _round: round, _seq: seq }
  })

  return enriched.sort((a, b) => {
    if (a._round !== b._round) return a._round - b._round
    if (a._seq !== b._seq) return a._seq - b._seq

    const ta = Number.isFinite(a.parTimeMs) ? a.parTimeMs : Number.MAX_SAFE_INTEGER
    const tb = Number.isFinite(b.parTimeMs) ? b.parTimeMs : Number.MAX_SAFE_INTEGER
    if (ta !== tb) return ta - tb
    return String(a.testnr || '').localeCompare(String(b.testnr || ''))
  })
}

function sortScanItems(items) {
  const groups = new Map()
  for (const item of items) {
    const key = item.turno || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  const sortedTurnos = [...groups.keys()].sort((a, b) => getTurnoSortValue(a) - getTurnoSortValue(b))
  const output = []
  for (const turno of sortedTurnos) {
    output.push(...sortShiftItems(groups.get(turno) || []))
  }

  return output
}

function parseTblText(text, testnr) {
  const out = []
  const lines = String(text || '').split(/\r?\n/)

  for (let i = 5; i < lines.length; i++) {
    const line = String(lines[i] || '')
    if (!line.trim()) continue

    const cols = line.split('\t').map((c) => String(c || '').trim())
    const token = cols[0] || ''
    if (!/^\d+$/.test(token)) continue

    out.push({
      TESTNR: testnr,
      SEQNO: out.length + 1,
      NO_: cols[0] || null,
      U_PERCENT: cols[1] || null,
      CVM_PERCENT: cols[2] || null,
      CVM_1M_PERCENT: cols[3] || null,
      CVM_3M_PERCENT: cols[4] || null,
      CVM_10M_PERCENT: cols[5] || null,
      TITULO_MACHINE: cols[6] || null,
      TITULO_REL_PERC: cols[7] || null,
    })
  }

  return out
}

const filteredScanList = computed(() => {
  const list = Array.isArray(scanList.value) ? scanList.value : []
  if (filterMode.value === 'all') return list
  if (filterMode.value === 'saved') return list.filter((i) => i.imp === true)
  return list.filter((i) => i.imp !== true)
})

const pendingBatchCount = computed(() =>
  scanList.value.filter((i) => !i.imp && i.hasPar && i.hasTbl).length
)

const selectedScanItem = computed(() =>
  scanList.value.find((x) => x.recordKey === selectedTestnr.value) || null
)

const selectedTestnrLabel = computed(() => selectedScanItem.value?.testnr || '')

const isTestSaved = computed(() => {
  return Boolean(selectedScanItem.value?.imp)
})

const tituloStats = computed(() => {
  const values = tituloInputs.value
    .map((v) => optionalNumber(v))
    .filter((v) => Number.isFinite(v))

  if (!values.length) return { avg: null, stddev: null, cv: null }

  const avg = values.reduce((a, b) => a + b, 0) / values.length
  if (values.length < 2 || avg === 0) return { avg, stddev: 0, cv: 0 }

  const variance = values.reduce((acc, v) => acc + ((v - avg) ** 2), 0) / (values.length - 1)
  const stddev = Math.sqrt(variance)
  const cv = (stddev / avg) * 100
  return { avg, stddev, cv }
})

const canSave = computed(() => {
  if (!selectedTestnr.value || isLoadingSaved.value || loadError.value || batchImporting.value) return false
  if (!tblData.value.length) return false
  const validTitulos = tituloInputs.value
    .map((v) => optionalNumber(v))
    .filter((v) => Number.isFinite(v))
  return validTitulos.length === 3
})

function fmtNum(val, digits = 2) {
  if (val == null || !Number.isFinite(val)) return '-'
  return Number(val).toFixed(digits)
}

function sanitizeTituloRaw(rawValue) {
  const raw = String(rawValue ?? '').replace(/\s+/g, '')
  let out = ''
  let hasSeparator = false

  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      out += ch
      continue
    }
    if ((ch === '.' || ch === ',') && !hasSeparator) {
      out += '.'
      hasSeparator = true
    }
  }

  return out
}

function normalizeTituloAt(index) {
  let value = sanitizeTituloRaw(tituloInputs.value[index])
  if (value.startsWith('.')) value = `0${value}`
  if (value.endsWith('.')) value = value.slice(0, -1)
  tituloInputs.value[index] = value
}

function onTituloInput(index, event) {
  const cleaned = sanitizeTituloRaw(event?.target?.value ?? tituloInputs.value[index])
  tituloInputs.value[index] = cleaned
  if (event?.target && event.target.value !== cleaned) {
    event.target.value = cleaned
  }
}

function onTituloBlur(index) {
  normalizeTituloAt(index)
}

function focusTituloInput(index) {
  const refs = [tituloInput1.value, tituloInput2.value, tituloInput3.value]
  const el = refs[index]
  if (!el) return
  el.focus()
  if (typeof el.select === 'function') el.select()
}

function focusNextTitulo(index) {
  if (!selectedTestnr.value) return
  normalizeTituloAt(index)

  if (index < 2) {
    focusTituloInput(index + 1)
    return
  }

  if (canSave.value && saveButton.value) {
    saveButton.value.focus()
  }
}

function focusPrevTitulo(index) {
  if (!selectedTestnr.value) return
  normalizeTituloAt(index)
  if (index <= 0) return
  focusTituloInput(index - 1)
}

function focusLastTitulo() {
  if (!selectedTestnr.value) return
  focusTituloInput(2)
}

function handleSaveButtonEnter() {
  if (!canSave.value || isSaving.value) return
  saveCurrentTest()
}

function formatDateTime(value) {
  if (value == null || value === '') return '-'
  const date = parseDateFromRaw(value)
  if (!date) return String(value)
  return formatDateTimeFromDate(date)
}

async function checkExistingTests(entries) {
  if (!entries.length) return []
  const data = await requestJson('/uster-cardas/status', { method: 'POST', body: { entries } })
  if (!Array.isArray(data.existing)) throw new Error('No se pudo verificar el estado de los ensayos.')
  return data.existing
}
async function scanEntries(entries) {
  loadError.value = ''
  scanProgress.value = { completed: 0, total: 0, detected: entries.filter(f => /\.(par|tbl)$/i.test(f.name)).length, verified: false }
  const items = await scanUsterFiles(entries, {
    getTestnr: name => { const id=getTestnrFromName(name); return id ? makeRecordKey(id, getPrefixFromName(name)) : null },
    readHeader: (text, name) => {
      const par=parseParText(text,name,name)
      if (!isCardasPar(par)) return null
      const testnr=getTestnrFromName(name), sourcePrefix=String(par.SOURCE_PREFIX || getPrefixFromName(name)).toUpperCase()
      return { testnr, sourcePrefix, recordKey: makeRecordKey(testnr,sourcePrefix), nomcount: par.NOMCOUNT,
        maschnr: par.MASCHNR, machineFamily: par.MACHINE_FAMILY,
        parTimeMs: Number.isFinite(par.TIME_MS) ? par.TIME_MS : null, parTimeDisplay: par.TIME_DISPLAY || '', turno: par.TURNO || '' }
    },
    onProgress: ({ completed,total }) => { scanProgress.value.completed=completed; scanProgress.value.total=total }
  })
  const existing=new Set(await checkExistingTests(items.map(i => ({ testnr:i.testnr,sourcePrefix:i.sourcePrefix }))))
  scanProgress.value.verified=true
  scanList.value=sortScanItems(items.map(item => ({ ...item, imp:existing.has(item.recordKey) })))
  const saved=scanList.value.filter(item=>item.imp).length
  scanStatus.value=`${items.length} ensayos · ${saved} guardados · ${items.length-saved} no guardados`
}
async function scanDirectory(dirHandle) {
  initialLoadBannerState.value='loading'
  selectedFolderName.value=dirHandle.name || 'Carpeta seleccionada'
  folderPathFull.value=selectedFolderName.value
  try {
    const entries=[]
    for await (const [name,handle] of dirHandle.entries()) if (handle.kind==='file' && /\.(par|tbl)$/i.test(name)) entries.push(handle)
    await scanEntries(entries)
  } catch(error) { loadError.value=error.message; scanList.value=[] }
  finally { initialLoadBannerState.value='hidden' }
}

function clearSelection() {
  confirmedTitles.value=null; savedVersion.value=null; loadError.value=''
  selectedTestnr.value = ''
  fileText.value = ''
  tblText.value = ''
  parData.value = {}
  tblData.value = []
  machineFamily.value = ''
  tituloInputs.value = ['', '', '']
}

async function readFileFromHandle(handle) {
  if (!handle) return ''
  if (typeof handle.text === 'function') return handle.text()
  if (typeof handle.getFile === 'function') {
    const f = await handle.getFile()
    return f.text()
  }
  return ''
}

async function selectRow(recordKey) {
  if (isSaving.value || batchImporting.value || isLoadingSaved.value || !allowDiscard()) return
  const item=scanList.value.find(x=>x.recordKey===recordKey)
  if (!item) return
  confirmedTitles.value=null; savedVersion.value=null; loadError.value=''; isLoadingSaved.value=true
  selectedTestnr.value=recordKey
  try {
    fileText.value=item.parHandle ? await readFileFromHandle(item.parHandle) : ''
    tblText.value=item.tblHandle ? await readFileFromHandle(item.tblHandle) : ''
    parData.value=parseParText(fileText.value,item.parHandle?.name || '')
    machineFamily.value=parData.value.MACHINE_FAMILY || item.machineFamily || ''
    tblData.value=parseTblText(tblText.value,recordKey)
    tituloInputs.value=['','','']
    if (item.imp) {
      const saved=await requestJson(`/uster-cardas/tests/${encodeURIComponent(item.sourcePrefix)}/${encodeURIComponent(item.testnr)}`)
      if (tblData.value.length !== saved.tbl.length || tblData.value.some((row,i)=>Number(row.NO_)!==Number(saved.tbl[i].NO_))) throw new Error('Las mediciones del TBL no coinciden con el ensayo guardado.')
      parData.value={ ...saved.par, TIME:saved.par.TIME_STAMP }
      machineFamily.value=saved.par.MACHINE_FAMILY || ''
      tblData.value=saved.tbl
      tituloInputs.value=[1,2,3].map(rep=>saved.titulos.find(row=>Number(row.REPNO)===rep)?.TITULO ?? '')
      savedVersion.value=saved.version
    }
    confirmedTitles.value=[...tituloInputs.value]
  } catch(error) { loadError.value=error.message }
  finally { isLoadingSaved.value=false }
  await nextTick(); if (!loadError.value) focusTituloInput(0)
}

async function saveCurrentTest() {
  if (!canSave.value || isSaving.value) return
  isSaving.value = true

  try {
    const item = selectedScanItem.value
    if (!item) throw new Error('No hay ensayo seleccionado')
    const par = {
      TESTNR: item.testnr,
      SOURCE_PREFIX: parData.value.SOURCE_PREFIX || item.sourcePrefix || getPrefixFromName(item?.parHandle?.name || ''),
      CATALOG: parData.value.CATALOG || null,
      SORTIMENT: parData.value.SORTIMENT || null,
      STYLE: parData.value.STYLE || null,
      MACHINE_FAMILY: machineFamily.value || null,
      NOMCOUNT: parData.value.NOMCOUNT || null,
      MASCHNR: parData.value.MASCHNR || null,
      LOTE: parData.value.LOTE || null,
      LABORANT: parData.value.LABORANT || null,
      TIME_STAMP: parData.value.TIME || null,
      MATCLASS: parData.value.MATCLASS || null,
      OBS: parData.value.OBS || null,
    }

    const titulos = tituloInputs.value.map((v, idx) => ({
      REPNO: idx + 1,
      TITULO: v,
    }))

    const data = savedVersion.value
      ? await requestJson(`/uster-cardas/tests/${encodeURIComponent(item.sourcePrefix)}/${encodeURIComponent(item.testnr)}/manual`, { method:'PATCH',body:{ version:savedVersion.value,titulos } })
      : await requestJson('/uster-cardas/upload',{ method:'POST',body:{ par,tbl:tblData.value,titulos } })
    if (data.version) savedVersion.value=data.version
    confirmedTitles.value=[...tituloInputs.value]
    isSaving.value=false

    const current = selectedScanItem.value
    if (current) current.imp = true

    const previousRecordKey = selectedTestnr.value

    if (filterMode.value === 'not') {
      const nextUnsaved = filteredScanList.value.find((x) => x.recordKey !== previousRecordKey)
      if (nextUnsaved?.recordKey) {
        await selectRow(nextUnsaved.recordKey)
      } else {
        clearSelection()
      }
    }

    await Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Ensayo ${item.sourcePrefix}-${item.testnr} guardado`,
      showConfirmButton: false,
      timer: 2400,
      timerProgressBar: true,
    })
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: String(err?.message || err),
    })
  } finally {
    isSaving.value = false
  }
}

async function deleteCurrentTest() {
  if (initialLoadBannerState.value==='checking-folder' || isSaving.value || isLoadingSaved.value || batchImporting.value || !allowDiscard()) return
  discardChanges()
  if (!selectedTestnr.value || !isTestSaved.value || isDeleting.value) return

  const item = selectedScanItem.value
  if (!item) return

  const confirm = await Swal.fire({
    title: 'Eliminar ensayo guardado?',
    text: `Se eliminara ${item.sourcePrefix}-${item.testnr} de la base de datos.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
  })
  if (!confirm.isConfirmed) return

  isDeleting.value = true
  try {
    const resp = await apiFetch(`/api/uster-cardas/delete/${encodeURIComponent(item.testnr)}?source_prefix=${encodeURIComponent(item.sourcePrefix)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)

    item.imp = false

    await Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Ensayo ${item.sourcePrefix}-${item.testnr} eliminado`,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
    })
  } catch (err) {
    await Swal.fire({ icon: 'error', title: 'Error al eliminar', text: String(err?.message || err) })
  } finally {
    isDeleting.value = false
  }
}

async function batchImportPending() {
  if (initialLoadBannerState.value==='checking-folder' || isSaving.value || isLoadingSaved.value || batchImporting.value || !allowDiscard()) return
  discardChanges()
  const pending = scanList.value.filter((i) => !i.imp && i.hasPar && i.hasTbl)
  if (!pending.length) {
    await Swal.fire({ icon: 'info', title: 'Sin pendientes', text: 'No hay ensayos con PAR y TBL sin guardar.' })
    return
  }

  const confirm = await Swal.fire({
    title: `Importar ${pending.length} ensayo(s) en lote`,
    text: 'Se guardarán los datos de cada archivo .PAR y .TBL. Los títulos manuales se pueden agregar después.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Importar',
    cancelButtonText: 'Cancelar',
  })
  if (!confirm.isConfirmed) return

  batchImporting.value = true
  batchProgress.value = 0
  batchTotal.value = pending.length
  const errors = []

  for (const item of pending) {
    try {
      const parText = item.parHandle ? await readFileFromHandle(item.parHandle) : ''
      const tblText = item.tblHandle ? await readFileFromHandle(item.tblHandle) : ''
      const parsedPar = parseParText(parText, item.parHandle?.name || '')
      const parsedTbl = parseTblText(tblText, item.testnr)

      const par = {
        TESTNR: item.testnr,
        SOURCE_PREFIX: parsedPar.SOURCE_PREFIX || item.sourcePrefix || getPrefixFromName(item.parHandle?.name || ''),
        CATALOG: parsedPar.CATALOG || null,
        SORTIMENT: parsedPar.SORTIMENT || null,
        STYLE: parsedPar.STYLE || null,
        MACHINE_FAMILY: parsedPar.MACHINE_FAMILY || item.machineFamily || null,
        NOMCOUNT: parsedPar.NOMCOUNT || null,
        MASCHNR: parsedPar.MASCHNR || null,
        LOTE: parsedPar.LOTE || null,
        LABORANT: parsedPar.LABORANT || null,
        TIME_STAMP: parsedPar.TIME || null,
        MATCLASS: parsedPar.MATCLASS || null,
        OBS: parsedPar.OBS || null,
      }

      const resp = await apiFetch('/api/uster-cardas/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ par, tbl: parsedTbl }),
        credentials: 'include',
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`)
      item.imp = true
    } catch (err) {
      errors.push({ testnr: `${item.sourcePrefix}-${item.testnr}`, error: String(err?.message || err) })
    }
    batchProgress.value++
  }

  batchImporting.value = false

  if (errors.length) {
    const errorList = errors.map((e) => `${e.testnr}: ${e.error}`).join('\n')
    await Swal.fire({
      icon: 'warning',
      title: `${pending.length - errors.length} importado(s), ${errors.length} con error`,
      text: errorList,
    })
  } else {
    await Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `${pending.length} ensayo(s) importados correctamente`,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open('carga-uster-cardas')
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveDirHandleToIDB(dirHandle) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite')
    const store = tx.objectStore('handles')
    const req = store.put(dirHandle, 'dir')
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

async function getDirHandleFromIDB() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly')
    const store = tx.objectStore('handles')
    const req = store.get('dir')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function verifyPermission(handle, mode = 'read') {
  if (!handle) return false
  const opts = { mode }
  if (await handle.queryPermission(opts) === 'granted') return true
  if (await handle.requestPermission(opts) === 'granted') return true
  return false
}

async function selectFolder() {
  if (initialLoadBannerState.value==='checking-folder' || isSaving.value || isLoadingSaved.value || batchImporting.value || !allowDiscard()) return
  discardChanges()
  try {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      const dirHandle = await window.showDirectoryPicker()
      await saveDirHandleToIDB(dirHandle)
      hasPersistedHandle.value = true
      await scanDirectory(dirHandle)
      initialLoadBannerState.value = 'hidden'
      return
    }
  } catch {
    // fallback to input
  }
  folderInput.value?.click()
}

async function refreshFolder() {
  if (initialLoadBannerState.value==='checking-folder' || isSaving.value || isLoadingSaved.value || batchImporting.value || !allowDiscard()) return
  discardChanges()
  initialLoadBannerState.value = 'loading'
  const dirHandle = await getDirHandleFromIDB()
  if (!dirHandle) {
    initialLoadBannerState.value = 'needs-folder'
    return
  }
  const ok = await verifyPermission(dirHandle, 'read')
  if (!ok) {
    initialLoadBannerState.value = 'needs-permission'
    return
  }
  await scanDirectory(dirHandle)
  initialLoadBannerState.value = 'hidden'
}

async function onFolderInputChange(event) {
  initialLoadBannerState.value='loading'
  const files=Array.from(event?.target?.files || [])
  selectedFolderName.value=files[0]?.webkitRelativePath?.split('/')[0] || 'Carpeta local seleccionada'
  folderPathFull.value=selectedFolderName.value; hasPersistedHandle.value=false
  try { await scanEntries(files) } catch(error) { loadError.value=error.message; scanList.value=[] }
  finally { initialLoadBannerState.value='hidden' }
}

const initialLoadBanner = computed(() => {
  if (initialLoadBannerState.value==='checking-folder') return { title:'Comprobando carpeta recordada...',message:'Comprobando si este navegador tiene una carpeta seleccionada.',containerClass:'border border-slate-200 bg-slate-50 text-slate-900',messageClass:'text-slate-700',iconClass:'h-5 w-5 animate-spin text-slate-500' }
  if (initialLoadBannerState.value === 'loading') {
    return {
      title: 'Recopilando datos de Cardas y Manuares...',
      message: `PAR leídos: ${scanProgress.value.completed} de ${scanProgress.value.total}. ${scanProgress.value.verified ? 'Estado verificado en la base.' : 'Verificando cuáles están guardados...'}`,
      containerClass: 'border border-blue-200 bg-blue-50 text-blue-900',
      messageClass: 'text-blue-800/80',
      iconClass: 'h-5 w-5 animate-spin text-blue-600'
    }
  }

  if (initialLoadBannerState.value === 'needs-permission') {
    return {
      title: 'Se requiere reautorizar la carpeta de Cardas y Manuares',
      message: 'La carpeta guardada existe, pero el navegador ya no tiene permisos de lectura. Vuelve a seleccionarla para cargar los ensayos pendientes.',
      containerClass: 'border border-amber-200 bg-amber-50 text-amber-900',
      messageClass: 'text-amber-800/80',
      iconClass: 'h-5 w-5 text-amber-600'
    }
  }

  if (initialLoadBannerState.value === 'needs-folder') {
    return {
      title: 'Selecciona una carpeta para cargar Cardas y Manuares',
      message: 'Aún no hay una carpeta autorizada en esta sesión. Cuando la selecciones, la vista recopilará automáticamente los ensayos no guardados.',
      containerClass: 'border border-slate-200 bg-slate-50 text-slate-900',
      messageClass: 'text-slate-700/80',
      iconClass: 'h-5 w-5 text-slate-500'
    }
  }

  return null
})

onMounted(async () => {
  try {
    const dirHandle = await getDirHandleFromIDB()
    if (!dirHandle) {
      initialLoadBannerState.value = 'needs-folder'
      return
    }
    selectedFolderName.value=dirHandle.name || 'Carpeta recordada'; folderPathFull.value=selectedFolderName.value
    const ok = await verifyPermission(dirHandle, 'read')
    if (!ok) {
      initialLoadBannerState.value = 'needs-permission'
      return
    }
    hasPersistedHandle.value = true
    await scanDirectory(dirHandle)
    initialLoadBannerState.value = 'hidden'
  } catch {
    // ignore load errors
  } finally {
    if (initialLoadBannerState.value === 'checking-folder') initialLoadBannerState.value = 'needs-folder'
    else if (initialLoadBannerState.value === 'loading') initialLoadBannerState.value = 'hidden'
  }
})
</script>

<style scoped>
.cardas-component { container-type: inline-size; }
.cardas-grid { grid-template-columns: minmax(400px, 560px) minmax(340px, 620px); gap:16px; width:100%; max-width:1196px; align-items:start; }
.cardas-toolbar > .flex-1 { min-width:180px; }
.cardas-scan-list { max-height:calc(100dvh - 200px); min-height:220px; }
.cardas-scan-table th, .cardas-scan-table td { padding:6px 4px; }
.cardas-scan-table td:nth-child(7) { white-space:normal; font-size:10px; }
.cardas-measurements { max-height:320px; }
.cardas-measurements-table { min-width:540px; }
.cardas-observations { grid-column:1/-1; min-height:56px; white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.4; }
@container (max-width:1400px) { .cardas-grid { grid-template-columns:minmax(360px,500px) minmax(320px,540px); max-width:1052px; gap:12px; } }
@container (max-width:780px) {
  .cardas-grid { grid-template-columns:minmax(300px,1fr) minmax(310px,1fr); gap:8px; max-width:736px; }
  .cardas-detail { padding:10px; }
  .cardas-detail .grid { column-gap:8px; }
  .cardas-detail .text-lg { font-size:15px; }
  .cardas-detail .text-sm { font-size:12px; }
  .cardas-scan-table th,.cardas-scan-table td { padding-left:2px; padding-right:2px; }
}
@container (max-width:630px) { .cardas-grid { grid-template-columns:1fr; max-width:540px; } }
</style>
