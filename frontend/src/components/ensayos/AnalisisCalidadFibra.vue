<template>
  <div class="flex flex-col h-full overflow-hidden bg-linear-to-br from-slate-50 to-blue-50 p-4">
    <!-- Header unificado -->
    <div class="flex items-center justify-between gap-4 mb-4 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-slate-200 relative z-100">
      <!-- Título -->
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xl">🧬</span>
        <h1 class="text-lg font-bold bg-linear-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
          Análisis Calidad Fibra
        </h1>
      </div>
      
      <!-- Barra separadora -->
      <div class="h-6 w-px bg-slate-300 shrink-0"></div>
      
      <!-- Radio buttons para agrupación -->
      <div class="flex items-center gap-3 shrink-0">
        <label class="text-sm font-semibold text-slate-700">Agrupación:</label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            v-model="groupMode"
            value="detailed"
            class="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500"
          />
          <span class="text-sm text-slate-700">MISTURA + SEQ</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            v-model="groupMode"
            value="aggregated"
            class="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500"
          />
          <span class="text-sm text-slate-700">Solo MISTURA</span>
        </label>
      </div>

      <!-- Barra separadora -->
      <div class="h-6 w-px bg-slate-300 shrink-0"></div>

      <!-- Datepickers -->
      <div class="flex items-center gap-3 shrink-0">
        <CustomDatepicker v-model="startDate" label="Desde" :show-buttons="false" />
        <CustomDatepicker v-model="endDate" label="Hasta" :show-buttons="false" />
      </div>
      
      <!-- Botones de acción -->
      <div class="flex items-center gap-2 ml-auto shrink-0">
        <button
          @click="loadData"
          :disabled="loading"
          v-tippy="{ content: 'Refrescar datos', placement: 'bottom' }"
          class="w-9 h-9 flex items-center justify-center bg-linear-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
        >
          <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-3-6.7" stroke-linecap="round" stroke-linejoin="round"></path>
            <polyline points="21 3 21 9 15 9" stroke-linecap="round" stroke-linejoin="round"></polyline>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
          </svg>
        </button>
        
        <button
          @click="exportToExcel"
          :disabled="loading || filteredRows.length === 0"
          v-tippy="{ content: 'Exportar a Excel', placement: 'bottom' }"
          class="w-9 h-9 flex items-center justify-center bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
        >
          <span class="text-lg">📊</span>
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p class="text-slate-600">Cargando datos...</p>
      </div>
    </div>

    <div v-else-if="filteredRows.length === 0" class="flex-1 flex items-center justify-center">
      <p class="text-slate-600 text-sm">No hay datos para el rango seleccionado.</p>
    </div>

    <div v-else class="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-md">
      <table class="min-w-full w-full table-auto divide-y divide-slate-200 text-xs">
        <thead class="bg-linear-to-r from-emerald-50 to-teal-50 sticky top-0 z-5">
          <!-- Fila de Grupos -->
          <tr class="border-b border-slate-300">
            <th colspan="4" class="px-2 py-1.5 text-center text-[10px] font-medium text-slate-500 bg-slate-50/50 border-r-2 border-slate-300"></th>
            <th colspan="2" class="px-2 py-1.5 text-center text-[10px] font-semibold text-teal-700 bg-teal-50 border-r-2 border-slate-300">
              <div class="flex items-center justify-center gap-1">
                <span>Gestión y Cálculo</span>
                <button
                  v-tippy="{ content: groupTooltips.gestion, delay: 0, allowHTML: true, maxWidth: 500, placement: 'bottom', interactive: true, theme: 'light' }"
                  class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold text-teal-600 bg-white/90 rounded-full cursor-help border border-teal-300 hover:bg-teal-50 hover:border-teal-400 transition-colors shadow-sm"
                >i</button>
              </div>
            </th>
            <th colspan="2" class="px-2 py-1.5 text-center text-[10px] font-semibold text-amber-700 bg-amber-50 border-r-2 border-slate-300">
              <div class="flex items-center justify-center gap-1">
                <span>Madurez y Finura</span>
                <button
                  v-tippy="{ content: groupTooltips.madurez, delay: 0, allowHTML: true, maxWidth: 500, placement: 'bottom', interactive: true, theme: 'light' }"
                  class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold text-amber-600 bg-white/90 rounded-full cursor-help border border-amber-300 hover:bg-amber-50 hover:border-amber-400 transition-colors shadow-sm"
                >i</button>
              </div>
            </th>
            <th colspan="5" class="px-2 py-1.5 text-center text-[10px] font-semibold text-blue-700 bg-blue-50 border-r-2 border-slate-300">
              <div class="flex items-center justify-center gap-1">
                <span>Variables Físicas</span>
                <button
                  v-tippy="{ content: groupTooltips.fisicas, delay: 0, allowHTML: true, maxWidth: 500, placement: 'bottom', interactive: true, theme: 'light' }"
                  class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold text-blue-600 bg-white/90 rounded-full cursor-help border border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm"
                >i</button>
              </div>
            </th>
            <th colspan="3" class="px-2 py-1.5 text-center text-[10px] font-semibold text-purple-700 bg-purple-50 border-r-2 border-slate-300">
              <div class="flex items-center justify-center gap-1">
                <span>Color y Apariencia</span>
                <button
                  v-tippy="{ content: groupTooltips.color, delay: 0, allowHTML: true, maxWidth: 500, placement: 'bottom', interactive: true, theme: 'light' }"
                  class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold text-purple-600 bg-white/90 rounded-full cursor-help border border-purple-300 hover:bg-purple-50 hover:border-purple-400 transition-colors shadow-sm"
                >i</button>
              </div>
            </th>
            <th colspan="3" class="px-2 py-1.5 text-center text-[10px] font-semibold text-orange-700 bg-orange-50">
              <div class="flex items-center justify-center gap-1">
                <span>Impurezas (Trash)</span>
                <button
                  v-tippy="{ content: groupTooltips.trash, delay: 0, allowHTML: true, maxWidth: 500, placement: 'bottom', interactive: true, theme: 'light' }"
                  class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold text-orange-600 bg-white/90 rounded-full cursor-help border border-orange-300 hover:bg-orange-50 hover:border-orange-400 transition-colors shadow-sm"
                >i</button>
              </div>
            </th>
          </tr>
          <!-- Fila de Encabezados -->
          <tr>
            <th class="px-3 py-2 text-center font-semibold text-slate-700 border-b-2 border-b-slate-200">Fecha/Hora</th>
            <th class="px-3 py-2 text-center font-semibold text-slate-700 border-b-2 border-b-slate-200">MISTURA</th>
            <th class="px-3 py-2 text-center font-semibold text-slate-700 border-b-2 border-b-slate-200">
              {{ groupMode === 'detailed' ? 'SEQ' : 'SEQ Count' }}
            </th>
            <th class="px-3 py-2 text-center font-semibold text-slate-700 border-b-2 border-b-slate-200 border-r-2 border-r-slate-300">LOTE_FIAC</th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>SCI</span>
                <button
                  v-tippy="{ content: hviTooltips.SCI, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200 border-r-2 border-r-slate-300"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>MST</span>
                <button
                  v-tippy="{ content: hviTooltips.MST, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>MIC</span>
                <button
                  v-tippy="{ content: hviTooltips.MIC, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200 border-r-2 border-r-slate-300"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>MAT</span>
                <button
                  v-tippy="{ content: hviTooltips.MAT, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>UHML</span>
                <button
                  v-tippy="{ content: hviTooltips.UHML, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>UI</span>
                <button
                  v-tippy="{ content: hviTooltips.UI, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>SF</span>
                <button
                  v-tippy="{ content: hviTooltips.SF, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>STR</span>
                <button
                  v-tippy="{ content: hviTooltips.STR, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200 border-r-2 border-r-slate-300"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>ELG</span>
                <button
                  v-tippy="{ content: hviTooltips.ELG, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>RD</span>
                <button
                  v-tippy="{ content: hviTooltips.RD, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>+b</span>
                <button
                  v-tippy="{ content: hviTooltips.PLUS_B, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200 border-r-2 border-r-slate-300"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>TIPO</span>
                <button
                  v-tippy="{ content: hviTooltips.TIPO, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>TrCNT</span>
                <button
                  v-tippy="{ content: hviTooltips.TrCNT, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>TrAR</span>
                <button
                  v-tippy="{ content: hviTooltips.TrAR, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
            <th 
              class="px-3 py-2 text-center font-semibold text-emerald-700 border-b-2 border-b-slate-200"
            >
              <div class="flex flex-col items-center gap-0.5">
                <span>TRID</span>
                <button
                  v-tippy="{ content: hviTooltips.TRID, delay: 0, allowHTML: true, maxWidth: 400, placement: 'bottom' }"
                  class="inline-flex items-center text-emerald-400 hover:text-emerald-600 cursor-help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="row.key"
            class="border-t border-slate-100 hover:bg-emerald-50/30 transition-colors duration-150"
          >
            <td class="px-3 py-2 text-center text-slate-700 text-xs">{{ row.fechaHora }}</td>
            <td class="px-3 py-2 text-center text-slate-700 font-medium">{{ row.mistura }}</td>
            <td class="px-3 py-2 text-center text-slate-700">{{ row.seq }}</td>
            <td class="px-3 py-2 text-center text-slate-700 border-r-2 border-r-slate-200">{{ row.loteFiac }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.SCI, 'SCI')">{{ row.SCI }}</td>
            <td class="px-3 py-2 text-center border-r-2 border-r-slate-200 transition-colors" :class="getColorClass(row.MST, 'MST')">{{ row.MST }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.MIC, 'MIC')">{{ row.MIC }}</td>
            <td class="px-3 py-2 text-center border-r-2 border-r-slate-200 transition-colors" :class="getColorClass(row.MAT, 'MAT')">{{ row.MAT }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.UHML, 'UHML')">{{ row.UHML }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.UI, 'UI')">{{ row.UI }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.SF, 'SF')">{{ row.SF }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.STR, 'STR')">{{ row.STR }}</td>
            <td class="px-3 py-2 text-center border-r-2 border-r-slate-200 transition-colors" :class="getColorClass(row.ELG, 'ELG')">{{ row.ELG }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.RD, 'RD')">{{ row.RD }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.PLUS_B, 'PLUS_B')">{{ row.PLUS_B }}</td>
            <td class="px-3 py-2 text-center text-emerald-700 border-r-2 border-r-slate-200">{{ row.TIPO }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.TRCNT, 'TRCNT')">{{ row.TRCNT }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.TRAR, 'TRAR')">{{ row.TRAR }}</td>
            <td class="px-3 py-2 text-center transition-colors" :class="getColorClass(row.TRID, 'TRID')">{{ row.TRID }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchCalidadFibra } from '../../services/dataService'
import ExcelJS from 'exceljs'
import CustomDatepicker from '../CustomDatepicker.vue'

const loading = ref(false)
const groupMode = ref('detailed') // 'detailed' o 'aggregated'
const startDate = ref('')
const endDate = ref('')
const rawData = ref([])
const parametrosHVI = ref(new Map()) // Almacena parámetros por código

// Información de tooltips para variables HVI
const hviTooltips = {
  UHML: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        UHML - Upper Half Mean Length
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Longitud promedio de la mitad más larga de las fibras.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: > 29mm (1.15")</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: < 26mm (1.05")</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔧 Aplicación Técnica:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">Dicta el ajuste de distancias entre rodillos en la continua de hilar. Un UHML alto permite hilos más finos y resistentes.</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Punto Crítico:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Variación alta entre pacas genera irregularidad de masa (hilo con partes gruesas y delgadas no deseadas).</div>
      </div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Ejemplo:</strong> Para Denim Ne 7, UHML 1.10" es aceptable, pero para Ne 12.5, si baja de 1.08", el hilo perderá resistencia.</div>
      </div>
    </div>
  `,
  UI: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        UI - Uniformity Index
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Mide qué tan cerca está la longitud media de las fibras más largas.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: > 83%</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: < 79% (< 78% = roturas en tejeduría)</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔍 Diagnóstico:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">Un UI bajo indica que el algodón fue maltratado en el desmote, rompiendo fibras.</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Impacto Visual:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">UI < 78% = Hilo "sucio" visualmente + Roturas frecuentes en telar.</div>
      </div>
    </div>
  `,
  SF: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        SF - Short Fiber Index
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Fibras menores a 12.7 mm. No se enganchan bien en el hilo.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: < 6%</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: > 12%</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Mayor Enemigo:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Genera "fly" (pelusa volando) en la planta, reduce eficiencia y ensucia el ambiente.</div>
      </div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Hilos Flame:</strong> SF alto (>10%) hace que el hilo se desintegre en los puntos de transición del efecto flammé.</div>
      </div>
    </div>
  `,
  STR: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        STR - Strength (Tenacidad)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Resistencia a la rotura medida rompiendo un mazo de fibras (bundle).
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: > 30 g/tex</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: < 24 g/tex (< 25 para Denim)</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">📊 Regla de Oro:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">La resistencia del hilo es aproximadamente el 50% de la resistencia de la fibra.</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">👖 Impacto Denim:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">El Denim se somete a lavados agresivos (stone wash, enzimas). STR < 25 = prenda puede romperse en costuras.</div>
      </div>
    </div>
  `,
  ELG: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        ELG - Elongation (Elasticidad)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Capacidad de "resorte" de la fibra. Estiramiento antes de rotura.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: > 7%</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: < 5%</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🎯 Ventaja Mecánica:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">Absorbe mejor los impactos mecánicos en el telar. Reduce roturas.</div>
      </div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Factor Decisivo:</strong> Entre dos algodones con mismo STR, el que tenga mayor ELG siempre trabajará mejor.</div>
      </div>
    </div>
  `,
  MIC: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        MIC - Micronaire
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Medida de permeabilidad al aire. Combina finura y madurez.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 3.7 - 4.2 (Ideal Denim)</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: < 3.4 (Inmadura) o > 4.9 (Gruesa)</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ MIC Bajo (<3.4):</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Fibra inmadura que colapsa. Forma Neps (puntos blancos que no se tiñen con índigo).</div>
      </div>
      <div style="background: #fff7ed; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px;">⚠️ MIC Alto (>4.9):</div>
        <div style="font-size: 11px; color: #9a3412; line-height: 1.5;">Fibras muy maduras pero gruesas. Menos fibras en sección transversal = hilo más débil.</div>
      </div>
    </div>
  `,
  MAT: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        MAT - Maturity Index
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Proporción de celulosa en la fibra. Mide desarrollo de pared celular.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: > 0.85 (Fibra "llena")</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: < 0.75 (Inmadura)</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">👖 Impacto Denim:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">MAT bajo = Hilo moteado después del teñido índigo. Fibras inmaduras reflejan luz diferente.</div>
      </div>
    </div>
  `,
  RD: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        Rd - Reflectance (Brillo)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Mide el brillo: blanco vs gris. Escala de Nickerson-Hunter.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 75 - 80 (Bright)</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: < 70 (Grisáceo)</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🎨 Combinación con +b:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">Rd y +b juntos definen el TIPO en carta Nickerson-Hunter. TIPO 41 = Estándar Denim.</div>
      </div>
    </div>
  `,
  PLUS_B: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        +b - Yellowness (Amarillamiento)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Mide degradación: blanco vs amarillo. Indica envejecimiento.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 7 - 9</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: > 12 (Muy amarillento)</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Causa:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">+b alto = Algodón expuesto a lluvia o calor excesivo en campo. Debilita paredes de fibra.</div>
      </div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Impacto Índigo:</strong> +b alto altera tono final del azul, "ensuciando" el color deseado en Denim.</div>
      </div>
    </div>
  `,
  TIPO: `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="font-weight: 600; font-size: 14px; color: #0f766e; margin-bottom: 8px; border-bottom: 2px solid #14b8a6; padding-bottom: 4px;">
        TIPO - Cotton Grade
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 8px; line-height: 1.5;">
        Clasificación comercial basada en color, basura y preparación.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 11, 21</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 6px;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Estándar: 31, 41</div>
      </div>
      <div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 8px;">
        Grupo: Color y Apariencia
      </div>
    </div>
  `,
  TrCNT: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        TrCNT - Trash Count (Cantidad)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Número de partículas de basura detectadas en la muestra.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: < 15 partículas</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: > 50 partículas</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔌 Interpretación:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">TrCNT alto + TrAR bajo = Basura muy fragmentada (pimienta), MUY difícil de limpiar en apertura.</div>
      </div>
    </div>
  `,
  TrAR: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        TrAR - Trash Area (Área)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Área superficial cubierta por basura en la muestra (%).
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: < 0.20%</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: > 0.60%</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔍 Análisis Combinado:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">TrCNT bajo + TrAR alto = Pocas partículas pero grandes (hojas). Más fácil de limpiar que pimienta.</div>
      </div>
    </div>
  `,
  TRID: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 500px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        TRID - Trash ID / Grade
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Clasificación visual del 1 al 7. Basado principalmente en TrAR.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ 1-2: Limpio (Ideal hilos finos)</div>
      </div>
      <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #f59e0b;">
        <div style="font-size: 11px; color: #92400e; font-weight: 500;">● 4-5: Manejable para Denim</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ 6-7: Muy sucio (Evitar)</div>
      </div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Aplicación:</strong> TRID 4-5 es aceptable para Denim. Para hilos Flame o finos, buscar TRID 1-2.</div>
      </div>
    </div>
  `,
  SCI: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        SCI - Spinning Consistency Index
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Fórmula matemática ponderada. La "nota final" del lote.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Excelente: > 140 (Premium)</div>
      </div>
      <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #f59e0b;">
        <div style="font-size: 11px; color: #92400e; font-weight: 500;">● Estándar: 100-140</div>
      </div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
        <div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Pobre: < 100 (Riesgoso)</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">📊 Ponderación:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">Da más peso a STR (resistencia) y UHML (longitud). Resume todas las variables en un solo número.</div>
      </div>
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
        <div style="font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 6px;">📎 Clasificación Sugerida en Almacén:</div>
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 3px;">• <strong>SCI > 135:</strong> Lotes para hilos Flame (perfección requerida)</div>
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 3px;">• <strong>SCI 110-134:</strong> Lotes para Denim estándar</div>
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">• <strong>SCI < 110:</strong> Tramas baja exigencia o mezclas</div>
      </div>
    </div>
  `,
  MST: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        MST - Moisture (Humedad)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        El "termómetro de confianza" del análisis. Fibra higroscópica.
      </div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Rango estándar HVI: 6.5% - 8.0%</div>
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">💧 Propiedad Clave:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">El algodón es higroscópico. Sus propiedades físicas cambian con el agua.</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ MST Bajo (<6%):</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Fibra muy seca. HVI reportará fibra más corta y débil de lo real. Medición poco confiable.</div>
      </div>
      <div style="background: #fff7ed; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px;">⚠️ MST Alto (>8%):</div>
        <div style="font-size: 11px; color: #9a3412; line-height: 1.5;">Fibra húmeda. Parecerá más fuerte pero será difícil de limpiar en proceso.</div>
      </div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
        <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Regla:</strong> Por cada 1% de aumento en humedad, STR aumenta ~1 unidad. MST fuera de rango invalida precisión del HVI.</div>
      </div>
    </div>
  `
}

// Tooltips para los grupos de variables
const groupTooltips = {
  fisicas: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 450px;">
      <div style="font-weight: 700; font-size: 14px; color: #1e40af; margin-bottom: 10px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px;">
        Variables Físicas (Dimensiones y Resistencia)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Son el "esqueleto" de la fibra. Determinan qué tan fuerte será el hilo y qué tan eficiente será el proceso de hilatura.
      </div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #3b82f6;">
        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">📏 Qué miden:</div>
        <div style="font-size: 11px; color: #475569; line-height: 1.5;">Longitud (UHML), uniformidad (UI), presencia de fibras cortas (SF), fuerza de rotura (STR) y elasticidad (ELG).</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚡ Impacto en Denim/Flame:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Cruciales para evitar roturas en el telar. Si la uniformidad es baja, el hilo tendrá puntos débiles que fallarán durante el proceso de engomado o tejido.</div>
      </div>
    </div>
  `,
  madurez: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 450px;">
      <div style="font-weight: 700; font-size: 14px; color: #b45309; margin-bottom: 10px; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">
        Variables de Madurez y Finura
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Determinan el comportamiento de la fibra frente a los químicos y el tacto final.
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #f59e0b;">
        <div style="font-size: 11px; color: #b45309; font-weight: 600; margin-bottom: 4px;">🔬 Qué miden:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">El grosor y desarrollo de la pared celular de la fibra (MIC y MAT).</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚡ Impacto en Denim/Flame:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Un Micronaire fuera de rango causa "neps" (pequeños nudos) que no absorben bien el colorante Índigo, provocando puntos blancos o teñidos desiguales en la tela.</div>
      </div>
    </div>
  `,
  color: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 450px;">
      <div style="font-weight: 700; font-size: 14px; color: #7c3aed; margin-bottom: 10px; border-bottom: 2px solid #a78bfa; padding-bottom: 6px;">
        Variables de Color y Apariencia
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Definen la estética y el valor comercial de la paca.
      </div>
      <div style="background: #f5f3ff; padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #a78bfa;">
        <div style="font-size: 11px; color: #6d28d9; font-weight: 600; margin-bottom: 4px;">🎨 Qué miden:</div>
        <div style="font-size: 11px; color: #5b21b6; line-height: 1.5;">El brillo (Rd), el tono amarillento (+b) y la clasificación comercial (TIPO).</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚡ Impacto en Denim/Flame:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Un algodón muy amarillento (+b alto) puede alterar el tono final del azul Índigo, "ensuciando" el color deseado.</div>
      </div>
    </div>
  `,
  trash: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 450px;">
      <div style="font-weight: 700; font-size: 14px; color: #c2410c; margin-bottom: 10px; border-bottom: 2px solid #fb923c; padding-bottom: 6px;">
        Variables de Impurezas (Trash)
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Indican qué tan "limpio" llega el algodón del campo y el desmote.
      </div>
      <div style="background: #ffedd5; padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #fb923c;">
        <div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px;">🔍 Qué miden:</div>
        <div style="font-size: 11px; color: #9a3412; line-height: 1.5;">Cantidad de partículas (TrCNT), área que ocupan (TrAR) y grado de basura (TRID).</div>
      </div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚡ Impacto en Denim/Flame:</div>
        <div style="font-size: 11px; color: #78350f; line-height: 1.5;">Mucha basura causa roturas de hilo en máquinas Open-End. En hilos Flame, una mota de basura puede confundirse con un defecto del efecto flammé, restando calidad visual.</div>
      </div>
    </div>
  `,
  gestion: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 450px;">
      <div style="font-weight: 700; font-size: 14px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">
        Variables de Gestión y Cálculo
      </div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">
        Son indicadores de control de calidad y fiabilidad del test.
      </div>
      <div style="background: #f0fdfa; padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #0f766e; font-weight: 600; margin-bottom: 4px;">📊 SCI (Spinning Consistency Index):</div>
        <div style="font-size: 11px; color: #115e59; line-height: 1.5; margin-bottom: 6px;">Es la "nota final" del lote. Resume todo en un número.</div>
        <div style="font-size: 10px; color: #0d9488; font-weight: 500;">• Uso: Clasificación rápida de pacas en el almacén</div>
        <div style="font-size: 10px; color: #0d9488; font-weight: 500;">• Valores: > 140 (Premium), 100-140 (Estándar), < 100 (Riesgoso)</div>
      </div>
      <div style="background: #f0fdfa; padding: 10px; border-radius: 6px; border-left: 3px solid #14b8a6;">
        <div style="font-size: 11px; color: #0f766e; font-weight: 600; margin-bottom: 4px;">💧 MST (Moisture):</div>
        <div style="font-size: 11px; color: #115e59; line-height: 1.5; margin-bottom: 6px;">El termómetro de confianza del análisis.</div>
        <div style="font-size: 10px; color: #0d9488; font-weight: 500; line-height: 1.4;">• Importancia: Si el algodón está muy seco (<6%), el HVI dirá que la fibra es más corta y débil de lo que realmente es. Si está muy húmedo, parecerá más fuerte pero será difícil de limpiar.</div>
      </div>
    </div>
  `
}

// Funciones para determinar color de las celdas según rangos dinámicos
const getColorClass = (value, variable) => {
  if (!value || value === '—' || value === '') return ''
  const numValue = parseFloat(String(value).replace(',', '.'))
  if (isNaN(numValue)) return ''
  
  // Buscar parámetro en el mapa cargado desde BD
  const param = parametrosHVI.value.get(variable)
  
  // Si no hay parámetros cargados, no aplicar color
  if (!param || !param.activo) return ''
  
  // Evaluar si está en rango óptimo
  const enRangoOptimo = evaluarRango(
    numValue,
    param.optimo_min,
    param.optimo_max
  )
  
  if (enRangoOptimo) {
    return 'bg-green-100 text-green-800 font-semibold'
  }
  
  // Evaluar si está en rango crítico
  const enRangoCritico = evaluarRango(
    numValue,
    param.critico_min,
    param.critico_max
  )
  
  if (enRangoCritico) {
    return 'bg-red-100 text-red-800 font-semibold'
  }
  
  // Evaluar si está en rango aceptable
  const enRangoAceptable = evaluarRango(
    numValue,
    param.aceptable_min,
    param.aceptable_max
  )
  
  if (enRangoAceptable) {
    return 'bg-yellow-50 text-yellow-800'
  }
  
  // Si no está en ningún rango definido, sin color
  return ''
}

// Función auxiliar para evaluar si un valor está en un rango
const evaluarRango = (valor, min, max) => {
  // Si ambos límites están definidos
  if (min !== null && max !== null) {
    return valor >= min && valor <= max
  }
  // Solo mínimo definido
  if (min !== null && max === null) {
    return valor >= min
  }
  // Solo máximo definido
  if (min === null && max !== null) {
    return valor <= max
  }
  // Ningún límite definido
  return false
}

// Función para quitar ceros a la izquierda
const removeLeadingZeros = (value) => {
  if (!value) return ''
  const num = parseInt(String(value), 10)
  return isNaN(num) ? value : String(num)
}

// Función para parsear fecha en formato DD/MM/YYYY
const parseDate = (dateStr) => {
  if (!dateStr) return null
  const parts = String(dateStr).split('/')
  if (parts.length !== 3) return null
  // DD/MM/YYYY -> YYYY-MM-DD
  const [day, month, year] = parts
  const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  return isNaN(date.getTime()) ? null : date
}

// Función para formatear fecha y hora
const formatDateTime = (fecha, hora) => {
  if (!fecha) return '—'
  const date = parseDate(fecha)
  if (!date) return '—'
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  
  let timeStr = '00:00'
  if (hora) {
    // Manejar diferentes formatos de hora
    let horaStr = String(hora).trim()
    
    // Si ya tiene formato HH:MM, usarlo directamente
    if (horaStr.includes(':')) {
      const parts = horaStr.split(':')
      const hh = parts[0].padStart(2, '0')
      const mm = (parts[1] || '00').padStart(2, '0')
      timeStr = `${hh}:${mm}`
    } else {
      // Si es número, convertir (ej: 205 -> 02:05, 2005 -> 20:05)
      horaStr = horaStr.padStart(4, '0')
      const hh = horaStr.slice(0, 2)
      const mm = horaStr.slice(2, 4)
      timeStr = `${hh}:${mm}`
    }
  }
  
  return `${day}/${month}/${year} ${timeStr}`
}

// Función para parsear números en formato europeo (1.234,56 -> 1234.56)
const parseEuropeanNumber = (str) => {
  if (!str) return 0
  // Remover puntos de miles y reemplazar coma decimal por punto
  const normalized = String(str).replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized)
}

// Función para calcular promedio ponderado
const calcWeightedAvg = (records, field) => {
  let totalPeso = 0
  let sumaPonderada = 0
  
  records.forEach(rec => {
    const peso = parseEuropeanNumber(rec.PESO)
    const valor = parseEuropeanNumber(rec[field])
    if (!isNaN(peso) && !isNaN(valor) && peso > 0 && valor !== 0) {
      totalPeso += peso
      sumaPonderada += valor * peso
    }
  })
  
  if (totalPeso === 0) return '—'
  const avg = sumaPonderada / totalPeso
  return avg.toFixed(2)
}

// Función para obtener el valor más común o concatenar múltiples
const getTipoValue = (records) => {
  if (!records || records.length === 0) return '—'
  const tipos = records.map(r => r.TIPO).filter(t => t)
  if (tipos.length === 0) return '—'
  
  // Obtener el más frecuente
  const freq = {}
  tipos.forEach(t => freq[t] = (freq[t] || 0) + 1)
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
}

// Datos filtrados y agrupados
const filteredRows = computed(() => {
  console.log('🔄 Recalculando filteredRows...')
  console.log('📊 rawData.value.length:', rawData.value.length)
  console.log('📅 startDate:', startDate.value, 'endDate:', endDate.value)
  console.log('🔧 groupMode:', groupMode.value)
  
  if (!rawData.value || rawData.value.length === 0) return []
  
  // Filtrar por fechas si están definidas
  let filtered = rawData.value
  if (startDate.value || endDate.value) {
    filtered = filtered.filter(row => {
      const fecha = parseDate(row.DT_ENTRADA_PROD)
      if (!fecha) return false
      
      if (startDate.value) {
        const desde = new Date(startDate.value)
        desde.setHours(0, 0, 0, 0)
        if (fecha < desde) return false
      }
      if (endDate.value) {
        const hasta = new Date(endDate.value)
        hasta.setHours(23, 59, 59, 999)
        if (fecha > hasta) return false
      }
      return true
    })
  }
  
  console.log('✅ Después del filtro de fechas:', filtered.length, 'registros')
  if (filtered.length > 0) {
    console.log('📦 Primer registro filtrado:', filtered[0])
  }
  
  if (groupMode.value === 'detailed') {
    console.log('📋 Modo DETALLADO: agrupando por MISTURA + SEQ')
    // Modo detallado: agrupar por MISTURA + SEQ
    const groups = new Map()
    
    filtered.forEach(row => {
      // Manejar casos donde MISTURA o SEQ no existen
      if (!row.MISTURA || !row.SEQ) {
        console.warn('⚠️ Registro sin MISTURA o SEQ:', row)
        return
      }
      
      const mistura = removeLeadingZeros(row.MISTURA)
      const seq = removeLeadingZeros(row.SEQ)
      const key = `${mistura}_${seq}`
      
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(row)
    })
    
    console.log('🗂️ Grupos MISTURA+SEQ creados:', groups.size)
    const results = []
    groups.forEach((records, key) => {
      const firstRecord = records[0]
      const mistura = removeLeadingZeros(firstRecord.MISTURA)
      const seq = removeLeadingZeros(firstRecord.SEQ)
      
      // Obtener LOTE_FIAC únicos
      const lotes = [...new Set(records.map(r => removeLeadingZeros(r.LOTE_FIAC)).filter(l => l))]
      
      results.push({
        key,
        fechaHora: formatDateTime(firstRecord.DT_ENTRADA_PROD, firstRecord.HR_ENTRADA_PROD),
        mistura,
        seq,
        loteFiac: lotes.join(', ') || '—',
        SCI: calcWeightedAvg(records, 'SCI'),
        MST: calcWeightedAvg(records, 'MST'),
        MIC: calcWeightedAvg(records, 'MIC'),
        MAT: calcWeightedAvg(records, 'MAT'),
        UHML: calcWeightedAvg(records, 'UHML'),
        UI: calcWeightedAvg(records, 'UI'),
        SF: calcWeightedAvg(records, 'SF'),
        STR: calcWeightedAvg(records, 'STR'),
        ELG: calcWeightedAvg(records, 'ELG'),
        RD: calcWeightedAvg(records, 'RD'),
        PLUS_B: calcWeightedAvg(records, 'PLUS_B'),
        TIPO: getTipoValue(records),
        TRCNT: calcWeightedAvg(records, 'TRCNT'),
        TRAR: calcWeightedAvg(records, 'TRAR'),
        TRID: calcWeightedAvg(records, 'TRID')
      })
    })
    
    console.log('✅ Resultados modo detallado:', results.length)
    // Ordenar por MISTURA y SEQ
    return results.sort((a, b) => {
      const mistA = parseInt(a.mistura) || 0
      const mistB = parseInt(b.mistura) || 0
      if (mistA !== mistB) return mistA - mistB
      const seqA = parseInt(a.seq) || 0
      const seqB = parseInt(b.seq) || 0
      return seqA - seqB
    })
    
  } else {
    console.log('📊 Modo AGREGADO: agrupando solo por MISTURA')
    // Modo agregado: agrupar solo por MISTURA
    const groups = new Map()
    
    filtered.forEach(row => {
      // Manejar casos donde MISTURA no existe
      if (!row.MISTURA) {
        console.warn('⚠️ Registro sin MISTURA:', row)
        return
      }
      
      const mistura = removeLeadingZeros(row.MISTURA)
      if (!groups.has(mistura)) groups.set(mistura, [])
      groups.get(mistura).push(row)
    })
    
    console.log('🗂️ Grupos MISTURA creados:', groups.size)
    const results = []
    groups.forEach((records, mistura) => {
      const firstRecord = records[0]
      
      // Contar SEQ únicos
      const seqUnicos = new Set(records.map(r => removeLeadingZeros(r.SEQ)).filter(s => s))
      
      // Obtener LOTE_FIAC únicos
      const lotes = [...new Set(records.map(r => removeLeadingZeros(r.LOTE_FIAC)).filter(l => l))]
      
      results.push({
        key: mistura,
        fechaHora: formatDateTime(firstRecord.DT_ENTRADA_PROD, firstRecord.HR_ENTRADA_PROD),
        mistura,
        seq: seqUnicos.size,
        loteFiac: lotes.join(', ') || '—',
        SCI: calcWeightedAvg(records, 'SCI'),
        MST: calcWeightedAvg(records, 'MST'),
        MIC: calcWeightedAvg(records, 'MIC'),
        MAT: calcWeightedAvg(records, 'MAT'),
        UHML: calcWeightedAvg(records, 'UHML'),
        UI: calcWeightedAvg(records, 'UI'),
        SF: calcWeightedAvg(records, 'SF'),
        STR: calcWeightedAvg(records, 'STR'),
        ELG: calcWeightedAvg(records, 'ELG'),
        RD: calcWeightedAvg(records, 'RD'),
        PLUS_B: calcWeightedAvg(records, 'PLUS_B'),
        TIPO: getTipoValue(records),
        TRCNT: calcWeightedAvg(records, 'TRCNT'),
        TRAR: calcWeightedAvg(records, 'TRAR'),
        TRID: calcWeightedAvg(records, 'TRID')
      })
    })
    
    console.log('✅ Resultados modo agregado:', results.length)
    // Ordenar por MISTURA
    return results.sort((a, b) => {
      const mistA = parseInt(a.mistura) || 0
      const mistB = parseInt(b.mistura) || 0
      return mistA - mistB
    })
  }
})

// Cargar parámetros HVI desde la API
async function cargarParametrosHVI() {
  try {
    console.log('⚙️ Cargando parámetros HVI...')
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    const response = await fetch(`${API_URL}/parametros-hvi?activo=true`)
    const data = await response.json()
    
    if (data.success && data.parametros) {
      // Convertir array a Map para acceso rápido por código
      parametrosHVI.value = new Map(
        data.parametros.map(p => [p.codigo, p])
      )
      console.log('✅ Parámetros HVI cargados:', parametrosHVI.value.size, 'parámetros')
    } else {
      console.warn('⚠️ No se pudieron cargar parámetros HVI')
    }
  } catch (error) {
    console.error('❌ Error cargando parámetros HVI:', error)
  }
}

async function loadData() {
  loading.value = true
  try {
    console.log('🔌 Iniciando carga de datos de calidad fibra...')
    const result = await fetchCalidadFibra()
    console.log('✅ fetchCalidadFibra completado. Resultado:', result)
    rawData.value = result.rows || result || []
    console.log('📦 Datos cargados:', rawData.value.length, 'registros')
    if (rawData.value.length > 0) {
      console.log('📦 Primer registro:', rawData.value[0])
      console.log('📦 Campos disponibles:', Object.keys(rawData.value[0]))
    } else {
      console.warn('⚠️ No se recibieron registros desde el backend')
    }
  } catch (error) {
    console.error('❌ Error cargando datos:', error)
    console.error('❌ Error completo:', error.message, error.stack)
    rawData.value = []
  } finally {
    loading.value = false
  }
}

async function exportToExcel() {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Calidad Fibra')
  
  const headers = [
    'Fecha/Hora', 'MISTURA', groupMode.value === 'detailed' ? 'SEQ' : 'SEQ Count', 'LOTE_FIAC',
    'SCI', 'MST', 'MIC', 'MAT', 'UHML', 'UI', 'SF', 'STR', 'ELG', 'RD', '+b', 'TIPO', 'TRCNT', 'TRAR', 'TRID'
  ]
  
  worksheet.addRow(headers)
  
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    }
  })
  
  filteredRows.value.forEach(row => {
    worksheet.addRow([
      row.fechaHora, row.mistura, row.seq, row.loteFiac,
      row.SCI, row.MST, row.MIC, row.MAT, row.UHML, row.UI, row.SF,
      row.STR, row.ELG, row.RD, row.PLUS_B, row.TIPO, row.TRCNT, row.TRAR, row.TRID
    ])
  })
  
  worksheet.columns.forEach((col, idx) => {
    col.width = idx === 0 ? 14 : 10
  })
  
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  link.download = `Analisis_Calidad_Fibra_${timestamp}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}

onMounted(async () => {
  // Establecer fechas por defecto - últimos 30 días
  const hoy = new Date()
  endDate.value = hoy.toISOString().split('T')[0]
  const hace30Dias = new Date(hoy)
  hace30Dias.setDate(hace30Dias.getDate() - 30)
  startDate.value = hace30Dias.toISOString().split('T')[0]
  
  // Cargar parámetros HVI primero para el resaltado
  await cargarParametrosHVI()
  
  // Luego cargar los datos
  loadData()
})
</script>
