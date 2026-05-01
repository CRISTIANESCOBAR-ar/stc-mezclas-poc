<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-6">

    <!-- Encabezado + Filtros combinados -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 mb-5">

      <!-- Título + controles en una línea -->
      <div class="flex flex-wrap items-center gap-3 md:gap-4">

        <!-- Título -->
        <div class="flex items-center gap-2 mr-auto">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          <div>
            <div class="text-2xl font-semibold text-slate-800 leading-tight">{{ $t('oe.title') }}</div>
            <div class="text-[11px] text-gray-400 mt-0.5">{{ $t('oe.subtitle') }}</div>
          </div>
        </div>

        <!-- Filtros inline -->
        <div class="flex flex-wrap items-end gap-2">

          <!-- Fecha -->
          <div class="flex flex-col gap-0.5">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ $t('oe.date') }}</label>
            <CustomDatepicker
              v-model="filtros.fecha"
              placeholder="Selecciona fecha"
              :show-buttons="false"
            />
          </div>

          <!-- Lote -->
          <div class="flex flex-col gap-0.5">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ $t('oe.lot') }}</label>
            <input
              v-model="filtros.lote"
              type="text"
              placeholder="ej. 112"
              class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          <!-- Ne -->
          <div class="flex flex-col gap-0.5">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ $t('oe.ne') }}</label>
            <input
              v-model="filtros.ne"
              type="text"
              placeholder="ej. 20"
              class="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>

          <!-- Botones de acción -->
          <div class="flex items-center gap-1.5 pb-0.5">

            <!-- Día anterior -->
            <button
              v-tippy="{ content: $t('oe.prev'), placement: 'top', theme: 'light' }"
              @click="moverFecha(-1)"
              :disabled="!filtros.fecha || loading"
              class="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>

            <!-- Consultar -->
            <button
              v-tippy="{ content: $t('oe.consult'), placement: 'top', theme: 'light' }"
              @click="cargar"
              :disabled="!filtros.fecha || loading"
              class="h-9 px-3.5 flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg v-if="!loading" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span class="hidden sm:inline">{{ loading ? $t('oe.loading') : $t('oe.consult') }}</span>
            </button>

            <!-- Día siguiente -->
            <button
              v-tippy="{ content: $t('oe.next'), placement: 'top', theme: 'light' }"
              @click="moverFecha(1)"
              :disabled="!filtros.fecha || loading"
              class="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>

            <!-- Limpiar -->
            <button
              v-if="data"
              v-tippy="{ content: $t('oe.clear'), placement: 'top', theme: 'light' }"
              @click="limpiar"
              class="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

          </div>
        </div>
      </div>

      <p v-if="error" class="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</p>
      <div
        v-if="data && hayDesfaseTensorapid"
        class="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
      >
        {{ $t('oe.tensorapidDesfase') }}
      </div>
    </div>

    <!-- Resumen cards eliminados — integrados en el header de la tabla -->

    <!-- Tabla OE principal -->
    <div v-if="data && data.rows.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 border-b border-gray-100">
        <!-- Título + contadores -->
        <div class="flex items-center gap-3">
          <h2 class="text-sm font-bold text-gray-700">{{ $t('oe.tableTitle') }}</h2>
          <span class="text-xs text-gray-400">{{ grupos.length }} grupos · {{ data.rows.length }} registros</span>
        </div>
        <!-- Stats inline -->
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ $t('oe.stats.machines') }}</span>
            <span class="text-sm font-black text-gray-700">{{ data.resumen.maquinas_oe }}</span>
          </div>
          <div class="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ $t('oe.stats.lots') }}</span>
            <span class="text-sm font-black text-gray-700">{{ data.resumen.lotes }}</span>
          </div>
          <div class="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ $t('oe.stats.ne') }}</span>
            <span class="text-sm font-black text-gray-700">{{ data.resumen.titulos }}</span>
          </div>
          <div class="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ $t('oe.stats.cardCoverage') }}</span>
            <span class="text-sm font-black"
              :class="Number(resumenCoberturaCarda.split('/')[0]) >= Number(resumenCoberturaCarda.split('/')[1]) ? 'text-emerald-600' : 'text-amber-600'">
              {{ resumenCoberturaCarda }}
            </span>
          </div>
        </div>
      </div>
      <div class="px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-[11px] text-blue-800" v-html="$t('oe.tableInfo')"></div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs oe-table">
          <thead>
            <!-- Fila superior: bandas de sección -->
            <tr class="bg-slate-100 border-b border-slate-200">
              <th colspan="5" class="text-left px-2 py-1 text-[10px] font-bold text-slate-600 tracking-wide border-r border-slate-200">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>{{ $t('oe.sections.id') }}
                </span>
              </th>
              <th colspan="7" class="text-left px-2 py-1 text-[10px] font-bold text-blue-700 tracking-wide bg-blue-50/60 border-r border-blue-200">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>{{ $t('oe.sections.oe') }}
                </span>
              </th>
              <th colspan="5" class="text-left px-2 py-1 text-[10px] font-bold text-emerald-700 tracking-wide bg-emerald-50/60 border-r border-emerald-200">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{{ $t('oe.sections.cards') }}
                </span>
              </th>
              <th colspan="3" class="text-left px-2 py-1 text-[10px] font-bold text-purple-700 tracking-wide bg-purple-50/60 border-r border-purple-200">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>{{ $t('oe.sections.tensor') }}
                </span>
              </th>
              <th class="text-left px-2 py-1 text-[10px] font-bold text-amber-700 tracking-wide bg-amber-50/60">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{{ $t('oe.sections.alerts') }}
                </span>
              </th>
            </tr>
            <!-- Fila inferior: nombres de columna -->
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="text-left px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.maq') }}</th>
              <th class="text-left px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.lot') }}</th>
              <th class="text-left px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.ne') }}</th>
              <th class="text-left px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.alim') }}</th>
              <th class="text-left px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap border-r border-slate-200">{{ $t('oe.cols.shifts') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.rpm') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">α<sub class="text-[8px]">e</sub></th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.efic') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.cortNat') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap" title="Cortes cortos = CCp + CCm">{{ $t('oe.cols.cc') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap" title="Empalmes = JP + JM">{{ $t('oe.cols.j') }}</th>
              <th class="text-center px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap border-r border-blue-200">+</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap" title="Producción promedio Kg/h de las cardas que alimentan este turno">{{ $t('oe.cols.kgh') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.cvm') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.neps') }}</th>
              <th class="text-center px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.samples') }}</th>
              <th class="text-center px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap border-r border-emerald-200">+</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.tenac') }}</th>
              <th class="text-right px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.elong') }}</th>
              <th class="text-center px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap border-r border-purple-200">+</th>
              <th class="text-left px-2 py-1.5 font-semibold text-gray-600 whitespace-nowrap">{{ $t('oe.cols.detail') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <template v-for="grupo in grupos" :key="grupo.key">
              <!-- ── Fila resumen del grupo ── -->
              <tr
                class="hover:bg-indigo-50/30 cursor-pointer transition-colors select-none"
                :class="expandedGroups[grupo.key] ? 'bg-indigo-50/60' : 'bg-white'"
                @click="toggleGrupo(grupo.key)"
              >
                <td class="px-3 py-2.5 font-mono font-bold text-gray-800 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 transition-transform duration-150"
                      :class="expandedGroups[grupo.key] ? 'rotate-90' : ''"
                      fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                    {{ grupo.s.maquina_label }}
                  </div>
                </td>
                <td class="px-3 py-2.5 font-mono text-gray-700">{{ grupo.s.lote }}</td>
                <td class="px-3 py-2.5 font-mono text-gray-700">{{ grupo.s.ne ?? '–' }}</td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="alimentacionClass(grupo.s.alimentacion)">
                    {{ grupo.s.alimentacion || 'N/D' }}
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex gap-0.5 flex-wrap">
                    <span v-for="t in grupo.s.turnos" :key="t"
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      {{ t }}
                    </span>
                    <span v-if="!grupo.s.turnos.length" class="text-[10px] text-gray-400">–</span>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ fmt(grupo.s.rpm, 0) }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ fmt(grupo.s.alfa, 1) }}</td>
                <td class="px-3 py-2.5 text-right font-mono" :class="eficClass(grupo.s.efic_min)">
                  {{ grupo.s.efic_avg != null ? fmt(grupo.s.efic_avg) : '–' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="cortNatClass(grupo.s.cort_nat_avg)">
                  {{ fmt(grupo.s.cort_nat_avg) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="ccClass(grupo.s.cc_sum)">{{ grupo.s.cc_sum != null ? grupo.s.cc_sum : '–' }}</td>
                <td class="px-3 py-2.5 text-right font-mono" :class="jClass(grupo.s.j_sum)">{{ grupo.s.j_sum != null ? grupo.s.j_sum : '–' }}</td>
                <td class="px-3 py-2.5 text-center" @click.stop>
                  <button
                    v-tippy="{ content: tooltipOEHtml(grupo.s, true), placement: 'left', theme: 'light', maxWidth: 360, interactive: true, popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', options: { fallbackPlacements: ['right', 'top', 'bottom'] } }, { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }] } }"
                    class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 text-[10px] font-bold transition-colors"
                    aria-label="Ver detalle Open End"
                  >ⓘ</button>
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="kghCardaClass(grupo.s.prod_kgh_carda_avg)">
                  {{ grupo.s.prod_kgh_carda_avg != null ? fmt(grupo.s.prod_kgh_carda_avg, 1) : '–' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="cvmClass(grupo.s.cvm)">
                  {{ grupo.s.cvm != null ? grupo.s.cvm : '–' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="nepsClass(grupo.s.neps_200)">
                  {{ grupo.s.neps_200 != null ? grupo.s.neps_200 : '–' }}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    :class="grupo.s.muestras_exp ? (grupo.s.muestras_obs >= grupo.s.muestras_exp ? 'bg-emerald-100 text-emerald-700' : grupo.s.muestras_obs > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-600'">
                    {{ grupo.s.muestras_exp ? `${grupo.s.muestras_obs}/${grupo.s.muestras_exp}` : 'N/D' }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center" @click.stop>
                  <button
                    v-tippy="{ content: tooltipCardaHtml(grupo.s, true), placement: 'left', theme: 'light', maxWidth: 480, interactive: true, popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', options: { fallbackPlacements: ['right', 'top', 'bottom'] } }, { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }] } }"
                    class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 text-[10px] font-bold transition-colors"
                    aria-label="Ver detalle Cardas + Uster"
                  >ⓘ</button>
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="tenacClass(grupo.s.tenacidad, grupo.s.ne)">
                  {{ grupo.s.tenacidad != null ? grupo.s.tenacidad : '–' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono" :class="elongClass(grupo.s.elongacion)">
                  {{ grupo.s.elongacion != null ? grupo.s.elongacion : '–' }}
                </td>
                <td class="px-3 py-2.5 text-center" @click.stop>
                  <button
                    v-tippy="{ content: tooltipTensorapidHtml(grupo.s, true), placement: 'left', theme: 'light', maxWidth: 360, interactive: true, popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', options: { fallbackPlacements: ['right', 'top', 'bottom'] } }, { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }] } }"
                    class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 text-[10px] font-bold transition-colors"
                    aria-label="Ver detalle Tensorapid"
                  >ⓘ</button>
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex flex-wrap items-center gap-1">
                    <span v-for="alerta in grupo.s.alertas" :key="alerta.code"
                      class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      :class="alerta.severity === 'alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
                      {{ alerta.severity === 'alta' ? '⚠' : '·' }} {{ labelAlerta(alerta.code) }}
                    </span>
                    <span v-if="!grupo.s.alertas.length" class="text-[10px] text-emerald-600 font-semibold">✓</span>
                    <button @click.stop="abrirDiagnostico(grupo.s, true)"
                      v-tippy="{ content: 'Ver diagnóstico operativo (análisis local + IA bajo demanda)', placement: 'left', theme: 'light' }"
                      class="ml-1 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 hover:text-amber-800 text-base shadow-sm transition-colors border border-amber-200">
                      ⚕️
                    </button>
                  </div>
                </td>
              </tr>

              <!-- ── Filas de detalle por turno (expandibles) ── -->
              <template v-if="expandedGroups[grupo.key]">
                <template v-for="(row, ridx) in grupo.rows" :key="`${grupo.key}_${ridx}`">
                  <tr
                    class="bg-slate-50/80 hover:bg-indigo-50/40 cursor-pointer transition-colors border-l-4 border-l-indigo-200"
                    :class="expandedDetail === `${grupo.key}_${ridx}` ? 'bg-indigo-50/50' : ''"
                    @click.stop="toggleDetail(grupo.key, ridx)"
                  >
                    <td class="px-3 py-2 whitespace-nowrap">
                      <div class="pl-5">
                        <span class="text-xs font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">T{{ row.turno || '?' }}</span>
                      </div>
                    </td>
                    <td class="px-3 py-2 font-mono text-gray-500 text-xs">{{ row.lote }}</td>
                    <td class="px-3 py-2 font-mono text-gray-500 text-xs">{{ row.ne ?? '–' }}</td>
                    <td class="px-3 py-2 whitespace-nowrap">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold" :class="alimentacionClass(row.alimentacion)">
                        {{ row.alimentacion || 'N/D' }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-xs text-gray-500">{{ row.turno || '–' }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs text-gray-600">{{ fmt(row.rpm, 0) }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs text-gray-600">{{ fmt(row.alfa, 1) }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="eficClass(row.efic_informada)">{{ fmt(row.efic_informada) }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="cortNatClass(row.cort_nat)">{{ fmt(row.cort_nat) }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="ccClass(ccTotal(row))">{{ ccTotal(row) ?? '–' }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="jClass(jTotal(row))">{{ jTotal(row) ?? '–' }}</td>
                    <td class="px-3 py-2 text-center" @click.stop>
                      <button
                        v-tippy="{ content: tooltipOEHtml(row, false), placement: 'left', theme: 'light', maxWidth: 360, interactive: true, popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', options: { fallbackPlacements: ['right', 'top', 'bottom'] } }, { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }] } }"
                        class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 text-[10px] font-bold transition-colors"
                        aria-label="Ver detalle Open End del turno"
                      >ⓘ</button>
                    </td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="kghCardaClass(row.prod_kgh_carda_turno)">{{ row.prod_kgh_carda_turno != null ? fmt(row.prod_kgh_carda_turno, 1) : '–' }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="cvmClass(row.cvm)">{{ row.cvm != null ? row.cvm : '–' }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="nepsClass(row.neps_200)">{{ row.neps_200 != null ? row.neps_200 : '–' }}</td>
                    <td class="px-3 py-2 text-center">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold" :class="coberturaCardaClass(row)">
                        {{ muestrasCardaLabel(row) }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-center" @click.stop>
                      <button
                        v-tippy="{ content: tooltipCardaHtml(row, false), placement: 'left', theme: 'light', maxWidth: 480, interactive: true, popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', options: { fallbackPlacements: ['right', 'top', 'bottom'] } }, { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }] } }"
                        class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 text-[10px] font-bold transition-colors"
                        aria-label="Ver detalle Cardas + Uster del turno"
                      >ⓘ</button>
                    </td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="tenacClass(row.tenacidad, row.ne)">{{ row.tenacidad != null ? row.tenacidad : '–' }}</td>
                    <td class="px-3 py-2 text-right font-mono text-xs" :class="elongClass(row.elongacion)">{{ row.elongacion != null ? row.elongacion : '–' }}</td>
                    <td class="px-3 py-2 text-center" @click.stop>
                      <button
                        v-tippy="{ content: tooltipTensorapidHtml(row, false), placement: 'left', theme: 'light', maxWidth: 360, interactive: true, popperOptions: { strategy: 'fixed', modifiers: [{ name: 'flip', options: { fallbackPlacements: ['right', 'top', 'bottom'] } }, { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } }] } }"
                        class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 text-[10px] font-bold transition-colors"
                        aria-label="Ver detalle Tensorapid del turno"
                      >ⓘ</button>
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex flex-wrap items-center gap-1">
                        <span v-for="alerta in row.alertas" :key="alerta.code"
                          class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                          :class="alerta.severity === 'alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
                          {{ alerta.severity === 'alta' ? '⚠' : '·' }} {{ labelAlerta(alerta.code) }}
                        </span>
                        <span v-if="!row.alertas.length" class="text-[10px] text-emerald-600 font-semibold">✓</span>
                        <button @click.stop="abrirDiagnostico(row, false)"
                          v-tippy="{ content: 'Diagnóstico del turno (análisis local + IA bajo demanda)', placement: 'left', theme: 'light' }"
                          class="ml-1 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 hover:text-amber-800 text-base shadow-sm transition-colors border border-amber-200">
                          ⚕️
                        </button>
                      </div>
                    </td>
                  </tr>
                  <!-- Panel detalle del turno (laboratorio + alertas) -->
                  <tr v-if="expandedDetail === `${grupo.key}_${ridx}`" class="bg-indigo-50/40">
                    <td colspan="21" class="px-4 py-3">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Laboratorio -->
                        <div>
                          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{{ $t('oe.detail.lab') }}</div>
                          <div class="grid grid-cols-3 gap-2">
                            <div v-for="item in labItems(row)" :key="item.label" class="bg-white rounded-lg p-2 border border-gray-100">
                              <div class="text-[9px] text-gray-400 uppercase tracking-wider">{{ item.label }}</div>
                              <div class="font-bold text-gray-800 text-sm mt-0.5">
                                {{ item.value ?? '–' }} <span class="text-[10px] font-normal text-gray-400">{{ item.unit }}</span>
                              </div>
                            </div>
                          </div>
                          <div class="mt-2 text-[10px] text-gray-500">
                            {{ $t('oe.detail.usterTests') }} <strong>{{ row.ensayos_uster ?? 0 }}</strong>
                            <span v-if="row.maquinas_uster"> · {{ $t('oe.detail.usterMachines') }} <strong>{{ row.maquinas_uster }}</strong></span>
                          </div>
                          <div class="mt-3 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2.5 text-xs text-sky-900 space-y-1">
                            <div>
                              {{ $t('oe.detail.feedInferred') }} <strong>{{ row.cadena_alimentacion || 'N/D' }}</strong>
                              <span v-if="row.passador"> · {{ $t('oe.detail.passer') }} <strong>{{ String(row.passador).toUpperCase() }}</strong></span>
                            </div>
                            <div>
                              {{ $t('oe.detail.cardShift') }} ({{ row.turno || '–' }}): {{ $t('oe.detail.cvmProm') }} <strong>{{ row.cvm_carda_turno ?? '–' }}</strong>
                              <span class="mx-1">|</span>
                              {{ $t('oe.detail.samples') }} <strong>{{ muestrasCardaLabel(row) }}</strong>
                            </div>
                            <div class="text-[11px] text-sky-700">
                              {{ $t('oe.detail.cardRule') }}
                            </div>
                          </div>
                        </div>
                        <!-- Alertas + recomendación -->
                        <div>
                          <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{{ $t('oe.detail.alerts') }}</div>
                          <ul v-if="row.alertas.length" class="space-y-1 mb-3">
                            <li v-for="alerta in row.alertas" :key="alerta.code" class="text-xs flex items-start gap-2">
                              <span :class="alerta.severity === 'alta' ? 'text-red-500' : 'text-amber-500'" class="mt-0.5 shrink-0">
                                {{ alerta.severity === 'alta' ? '⚠' : '◦' }}
                              </span>
                              <span class="text-gray-700">{{ alerta.message }}</span>
                            </li>
                          </ul>
                          <p v-else class="text-xs text-emerald-700 mb-3">{{ $t('oe.detail.noAlerts') }}</p>
                          <div class="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2.5">
                            <div class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">{{ $t('oe.detail.recommendation') }}</div>
                            <p class="text-xs text-indigo-800">{{ row.recomendacion }}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sin datos -->
    <div v-if="data && !data.rows.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm mb-5">
      {{ $t('oe.noData') }}
    </div>

    <!-- ── Modal Diagnóstico (local + IA) ───────────────────────────── -->
    <div v-if="diagOpen" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3" @click.self="cerrarDiagnostico">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="text-base font-bold text-gray-800 flex items-center gap-2">
              <span class="text-amber-500">⚕️</span> {{ $t('oe.diag.title') }}
            </div>
            <div class="text-xs text-gray-500">
              {{ diagFila?.maquina_label || '–' }} · Lote {{ diagFila?.lote || '–' }} · Ne {{ diagFila?.ne || '–' }}
              <span v-if="diagIsGroup">· {{ $t('oe.diag.group') }}</span>
              <span v-else>· {{ $t('oe.diag.shift') }} {{ diagFila?.turno || '?' }}</span>
            </div>
          </div>
          <button @click="cerrarDiagnostico" class="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2">×</button>
        </div>

        <div class="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <!-- Análisis local -->
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
            <div class="flex items-center justify-between mb-1.5">
              <div class="text-xs font-bold text-emerald-700 uppercase tracking-wide">{{ $t('oe.diag.local') }}</div>
              <span class="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">{{ $t('oe.diag.localBadge') }}</span>
            </div>
            <div class="text-sm text-gray-700 leading-snug" v-html="mdToHtml(diagnosticoLocal(diagFila))"></div>
          </div>

          <!-- Análisis IA -->
          <div class="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3">
            <div class="flex items-center justify-between mb-2 gap-2">
              <div class="text-xs font-bold text-indigo-700 uppercase tracking-wide whitespace-nowrap">{{ $t('oe.diag.ia') }}</div>
              <div class="flex items-center gap-2">
                <select v-model="diagIAModel" class="text-[11px] rounded-lg border border-indigo-200 bg-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="gemini-2.5-flash">2.5 Flash (rápido · barato)</option>
                  <option value="gemini-2.5-pro">2.5 Pro (más potente)</option>
                  <option value="gemini-2.0-flash">2.0 Flash (mínimo costo)</option>
                </select>
                <button
                  @click="generarDiagnosticoIA"
                  :disabled="diagIALoading"
                  class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {{ diagIALoading ? $t('oe.diag.iaGenerating') : (diagIA ? $t('oe.diag.iaRegenerate') : $t('oe.diag.iaGenerate')) }}
                </button>
              </div>
            </div>

            <div v-if="diagIALoading" class="text-sm text-indigo-600 italic">{{ $t('oe.diag.iaQuerying') }}</div>
            <div v-else-if="diagIAError" class="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
              ⚠ {{ diagIAError }}
            </div>
            <div v-else-if="diagIA">
              <div class="text-sm text-gray-700 leading-snug mb-2" v-html="mdToHtml(diagIA.texto)"></div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[10px] pt-2 border-t border-indigo-200">
                <div class="bg-white rounded-lg px-2 py-1 border border-indigo-100">
                  <div class="text-gray-500 font-medium">{{ $t('oe.diag.latency') }}</div>
                  <div class="text-indigo-700 font-bold">{{ diagIA.latencia_ms }} ms</div>
                </div>
                <div class="bg-white rounded-lg px-2 py-1 border border-indigo-100">
                  <div class="text-gray-500 font-medium">{{ $t('oe.diag.tokens') }}</div>
                  <div class="text-indigo-700 font-bold">{{ diagIA.tokens_in }} / {{ diagIA.tokens_out }}</div>
                </div>
                <div class="bg-white rounded-lg px-2 py-1 border border-indigo-100">
                  <div class="text-gray-500 font-medium">{{ $t('oe.diag.cost') }}</div>
                  <div class="text-indigo-700 font-bold">${{ diagIA.costo_usd.toFixed(6) }}</div>
                </div>
                <div class="bg-white rounded-lg px-2 py-1 border border-indigo-100">
                  <div class="text-gray-500 font-medium">{{ $t('oe.diag.cache') }}</div>
                  <div class="text-indigo-700 font-bold">{{ diagIA.cache_hit ? 'HIT' : 'MISS' }}</div>
                </div>
              </div>
              <div class="text-[10px] text-gray-400 mt-1">{{ $t('oe.diag.model') }} {{ diagIA.model }}</div>
            </div>
            <div v-else class="text-xs text-gray-500" v-html="$t('oe.diag.iaClick')"></div>
          </div>
        </div>

        <div class="flex justify-end gap-3 px-5 py-2.5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <span class="text-[10px] text-gray-400 self-center mr-auto">{{ $t('oe.diag.escHint') }} <kbd class="px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-600 font-mono text-[10px]">Esc</kbd> {{ $t('oe.diag.escClose') }}</span>
          <button @click="cerrarDiagnostico" class="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm font-medium transition-colors">
            {{ $t('oe.diag.close') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import CustomDatepicker from '../CustomDatepicker.vue';

const { t: $t } = useI18n();

const filtros = reactive({
  fecha: new Date().toISOString().slice(0, 10),
  lote: '',
  ne: ''
});

const loading = ref(false);
const error = ref(null);
const data = ref(null);
const expandedGroups = ref({});
const expandedDetail = ref(null);

// ─── Modal Diagnóstico (local + IA) ──────────────────────────────────────────
const diagOpen = ref(false);
const diagFila = ref(null);
const diagIsGroup = ref(false);
const diagIA = ref(null); // { texto, tokens_in, tokens_out, costo_usd, latencia_ms, model, cache_hit }
const diagIALoading = ref(false);
const diagIAError = ref(null);
const diagIAModel = ref('gemini-2.5-flash');

function abrirDiagnostico(fila, isGroup) {
  diagFila.value = fila;
  diagIsGroup.value = isGroup;
  diagIA.value = null;
  diagIAError.value = null;
  diagOpen.value = true;
}
function cerrarDiagnostico() {
  diagOpen.value = false;
}

// Cerrar modal con tecla ESC
function onKeyDownDiag(e) {
  if (e.key === 'Escape' && diagOpen.value) {
    cerrarDiagnostico();
  }
}
onMounted(() => window.addEventListener('keydown', onKeyDownDiag));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDownDiag));
async function generarDiagnosticoIA() {
  if (!diagFila.value) return;
  diagIALoading.value = true;
  diagIAError.value = null;
  diagIA.value = null;
  try {
    const res = await fetch('/api/oe/diagnostico-ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fila: diagFila.value,
        alertas: diagFila.value.alertas || [],
        model: diagIAModel.value,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error desconocido');
    diagIA.value = json;
  } catch (e) {
    diagIAError.value = e.message;
  } finally {
    diagIALoading.value = false;
  }
}

// Análisis local instantáneo basado en reglas. Devuelve markdown.
function diagnosticoLocal(d) {
  if (!d) return '';
  const alertas = d.alertas || [];
  const num = (v) => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
  const efic = num(d.efic_avg ?? d.efic_informada);
  const cortNat = num(d.cort_nat_avg ?? d.cort_nat);
  const ccp = num(d.ccp_sum ?? d.ccp);
  const ccm = num(d.ccm_sum ?? d.ccm);
  const jp = num(d.jp_sum ?? d.jp);
  const jm = num(d.jm_sum ?? d.jm);
  const cc = (ccp || 0) + (ccm || 0);
  const j = (jp || 0) + (jm || 0);
  const cvm = num(d.cvm);
  const neps = num(d.neps_200);
  const tenac = num(d.tenacidad);
  const elong = num(d.elongacion);
  const kghMin = num(d.prod_kgh_carda_min);
  const kghMax = num(d.prod_kgh_carda_max);
  // Robots empalmadores: promedio de eficiencia (NO suma).
  const robValsLoc = [d.rob_01, d.rob_02, d.rob_03, d.rob_01_avg, d.rob_02_avg, d.rob_03_avg]
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v > 0);
  const robotsAvgLoc = robValsLoc.length ? (robValsLoc.slice(0, 3).reduce((s, v) => s + v, 0) / Math.min(robValsLoc.length, 3)) : null;

  const hallazgos = [];
  const causas = [];
  const acciones = [];
  let prioridad = 'baja';

  if (efic != null && efic < 60) {
    hallazgos.push(`Eficiencia crítica ${efic.toFixed(1)}%.`);
    causas.push('Detenciones largas (rotor parado, falta de alimentación o atascos).');
    acciones.push('Ir a la máquina y verificar estado del rotor, navetes y alimentación de mecha.');
    prioridad = 'alta';
  } else if (efic != null && efic < 85) {
    hallazgos.push(`Eficiencia baja ${efic.toFixed(1)}% (esperado ≥85%).`);
    causas.push('Microparadas frecuentes o cambios de bobina lentos.');
    acciones.push('Cronometrar tiempos muertos del turno y revisar cambios automáticos.');
    if (prioridad === 'baja') prioridad = 'media';
  }

  if (cortNat != null && cortNat > 200) {
    hallazgos.push(`Cortes naturales altos (${cortNat.toFixed(0)}).`);
    causas.push('Algodón inestable, rotor sucio o variación de cinta.');
    acciones.push('Inspeccionar limpieza del rotor y revisar cobertura USTER de la carda alimentadora.');
    prioridad = prioridad === 'alta' ? 'alta' : 'media';
  }

  if (cc > 50) {
    hallazgos.push(`Cortes cortos elevados (CC=${cc}).`);
    causas.push('Rotor con suciedad o cinta con neps/impurezas.');
    acciones.push('Programar limpieza profunda del rotor; revisar último ensayo USTER de cinta.');
    prioridad = prioridad === 'alta' ? 'alta' : 'media';
  }

  if (j > 25) {
    hallazgos.push(`Empalmes elevados (J=${j}).`);
    causas.push('Roturas frecuentes por tensión, mecha débil o navetes desgastados.');
    acciones.push('Verificar tensión de bobinado y estado de navetes; inspeccionar mecha entrante.');
    prioridad = 'alta';
  }

  if (cvm != null && cvm > 13) {
    hallazgos.push(`CVm hilo alto (${cvm.toFixed(2)}%).`);
    causas.push('Irregularidad en cinta o rotor desbalanceado.');
    acciones.push('Cruzar con CVm carda del turno; si también está alto, investigar carda alimentadora.');
    if (prioridad === 'baja') prioridad = 'media';
  }

  if (neps != null && neps > 60) {
    hallazgos.push(`Neps +200 altos (${neps.toFixed(1)}/km).`);
    causas.push('Algodón con impurezas o cardado deficiente.');
    acciones.push('Revisar guarniciones de carda y calidad de fardos en proceso.');
    if (prioridad === 'baja') prioridad = 'media';
  }

  if (tenac != null && tenac < 14.5) {
    hallazgos.push(`Tenacidad crítica (${tenac.toFixed(2)} cN/tex).`);
    causas.push('Mezcla de fibra débil o torsión insuficiente para el título.');
    acciones.push('Validar α₍e₎ y verificar que la mezcla de fibras cumple el SCI mínimo.');
    prioridad = 'alta';
  } else if (tenac != null && tenac < 16 && d.ne && Number(d.ne) >= 10) {
    hallazgos.push(`Tenacidad baja para urdimbre (${tenac.toFixed(2)} cN/tex).`);
    if (prioridad === 'baja') prioridad = 'media';
  }

  if (elong != null && elong < 6) {
    hallazgos.push(`Elongación baja (${elong.toFixed(2)}%).`);
    causas.push('Falta de elasticidad en hilo: posible torsión excesiva o fibra corta.');
    acciones.push('Revisar α₍e₎ y largo de fibra promedio del lote.');
  }

  if (kghMin != null && kghMax != null && (kghMax - kghMin) > 15) {
    hallazgos.push(`Desbalance de cardas (Δ Kg/h ${(kghMax - kghMin).toFixed(1)}).`);
    causas.push('Cardas alimentadoras trabajando a velocidades muy distintas.');
    acciones.push('Igualar velocidades de las cardas que alimentan esta máquina o aislar la más lenta.');
    if (prioridad === 'baja') prioridad = 'media';
  }

  if (robotsAvgLoc != null && robotsAvgLoc < 85) {
    hallazgos.push(`Eficiencia promedio Robots empalmadores baja (${robotsAvgLoc.toFixed(1)}%).`);
    causas.push('Robots no logran empalmar: roturas excesivas, mecha mala o falla mecánica del propio Robot.');
    acciones.push('Verificar funcionamiento de los 3 Robots empalmadores y registrar cuál está con menor performance.');
    prioridad = 'alta';
  } else if (robotsAvgLoc != null && robotsAvgLoc < 90) {
    hallazgos.push(`Eficiencia promedio Robots empalmadores en seguimiento (${robotsAvgLoc.toFixed(1)}%).`);
    if (prioridad === 'baja') prioridad = 'media';
  }

  if (!hallazgos.length) {
    return `**Diagnóstico:** Sin desviaciones relevantes detectadas en este turno.\n\n**Prioridad:** 🟢 Baja — Operación dentro de parámetros.`;
  }

  if (!causas.length) causas.push('Revisar histórico de la máquina y comparar con turnos anteriores.');
  if (!acciones.length) acciones.push('Documentar hallazgo en planilla de turno.');

  const prioIcon = prioridad === 'alta' ? '🔴' : prioridad === 'media' ? '🟡' : '🟢';
  const prioLabel = prioridad === 'alta' ? 'Alta' : prioridad === 'media' ? 'Media' : 'Baja';

  return `**Diagnóstico:** ${hallazgos.join(' ')}

**Causas probables:**
${causas.map(c => `- ${c}`).join('\n')}

**Acciones recomendadas:**
${acciones.map(a => `- ${a}`).join('\n')}

**Prioridad:** ${prioIcon} ${prioLabel}`;
}

// Markdown muy básico → HTML (negritas, listas y saltos)
function mdToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>))/g, '<ul class="list-disc pl-5 my-1 space-y-0.5">$1</ul>$2');
  // colapsa <ul> consecutivos
  html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

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

// ─── Grupos: agrupación por maquina + lote + ne ───────────────────────────────
const grupos = computed(() => {
  if (!data.value?.rows?.length) return [];
  const map = new Map();
  data.value.rows.forEach(row => {
    const key = `${row.maquina_label}|${row.lote}|${row.ne}`;
    if (!map.has(key)) map.set(key, { key, rows: [] });
    map.get(key).rows.push(row);
  });
  return [...map.values()].map(g => {
    g.rows.sort((a, b) => String(a.turno || '').localeCompare(String(b.turno || '')));
    const rows = g.rows;
    const avg = (field) => {
      const vals = rows.map(r => r[field]).filter(v => v != null && !isNaN(Number(v))).map(Number);
      return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
    };
    // Promedio que ignora ceros y no pre-redondea (para parámetros operativos
    // como T.Bob o RPM Card, donde un turno sin producción metería 0 en la media).
    const avgNonZero = (field) => {
      const vals = rows.map(r => r[field])
        .filter(v => v != null && !isNaN(Number(v)) && Number(v) !== 0)
        .map(Number);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const sum = (field) => {
      const vals = rows.map(r => r[field]).filter(v => v != null && !isNaN(Number(v))).map(Number);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    };
    const minVal = (field) => {
      const vals = rows.map(r => r[field]).filter(v => v != null && !isNaN(Number(v))).map(Number);
      return vals.length ? Math.min(...vals) : null;
    };
    const firstVal = (field) => { const f = rows.find(r => r[field] != null); return f ? f[field] : null; };
    const muestrasObs = rows.reduce((s, r) => s + (Number(r.muestras_carda_turno) || 0), 0);
    const muestrasExp = rows.reduce((s, r) => s + (Number(r.muestras_carda_esperadas) || 0), 0);
    const ccpSum = sum('ccp');
    const ccmSum = sum('ccm');
    const jpSum = sum('jp');
    const jmSum = sum('jm');
    const alertasMap = new Map();
    rows.forEach(r => (r.alertas || []).forEach(a => alertasMap.set(a.code, a)));
    const turnos = [...new Set(rows.map(r => r.turno).filter(Boolean))].sort();
    return {
      ...g,
      s: {
        maquina_label: rows[0].maquina_label,
        lote: rows[0].lote,
        ne: rows[0].ne,
        alimentacion: rows[0].alimentacion,
        rpm: rows[0].rpm,
        prod_kg_hr: rows[0].prod_kg_hr,
        alfa: avg('alfa'),
        efic_avg: avg('efic_informada'),
        efic_min: minVal('efic_informada'),
        cort_nat_avg: avg('cort_nat'),
        rob_01_avg: avg('rob_01'),
        rob_02_avg: avg('rob_02'),
        rob_03_avg: avg('rob_03'),
        // Sumatorios de paradas
        ccp_sum: ccpSum,
        ccm_sum: ccmSum,
        cc_sum: (ccpSum != null || ccmSum != null) ? (Number(ccpSum) || 0) + (Number(ccmSum) || 0) : null,
        jp_sum: jpSum,
        jm_sum: jmSum,
        j_sum: (jpSum != null || jmSum != null) ? (Number(jpSum) || 0) + (Number(jmSum) || 0) : null,
        cp_sum: sum('cp'),
        cm_sum: sum('cm'),
        mo_sum: sum('mo'),
        oe_cvp_sum: sum('oe_cvp'),
        oe_cvm_sum: sum('oe_cvm'),
        clm_n_sum: sum('clm_n'),
        clm_s_sum: sum('clm_s'),
        clm_l_sum: sum('clm_l'),
        clm_t_sum: sum('clm_t'),
        t_bob_avg: avgNonZero('t_bob'),
        rpm_card_avg: avgNonZero('rpm_card'),
        // Uster + tensorapid
        cvm: firstVal('cvm'),
        cvm_carda_avg: avg('cvm_carda_turno'),
        cvm_carda_max: avg('cvm_carda_max_turno'),
        prod_kgh_carda_avg: avgNonZero('prod_kgh_carda_turno'),
        prod_kgh_carda_min: minVal('prod_kgh_carda_min'),
        prod_kgh_carda_max: avg('prod_kgh_carda_max'),
        muestras_obs: muestrasObs,
        muestras_exp: muestrasExp,
        neps_140: firstVal('neps_140'),
        neps_200: firstVal('neps_200'),
        vellosidad: firstVal('vellosidad'),
        thin_30: firstVal('thin_30'),
        thin_40: firstVal('thin_40'),
        thin_50: firstVal('thin_50'),
        thick_35: firstVal('thick_35'),
        thick_50: firstVal('thick_50'),
        ensayos_uster: firstVal('ensayos_uster'),
        maquinas_uster: firstVal('maquinas_uster'),
        passador: firstVal('passador'),
        cadena_alimentacion: firstVal('cadena_alimentacion'),
        tenacidad: firstVal('tenacidad'),
        elongacion: firstVal('elongacion'),
        fuerza_b: firstVal('fuerza_b'),
        trabajo_b: firstVal('trabajo_b'),
        tensor_obs: firstVal('tensor_obs'),
        alertas: [...alertasMap.values()],
        turnos,
        // Detalle por turno: lista de cardas con su CVm individual,
        // junto con el tipo de alimentación (MANUAR / CARDA RIETER).
        detalle_cardas_por_turno: rows.map(r => ({
          turno: r.turno,
          alim: r.alimentacion,
          cvm_avg: r.cvm_carda_turno,
          cvm_max: r.cvm_carda_max_turno,
          items: Array.isArray(r.detalle_cardas_turno) ? r.detalle_cardas_turno : [],
        })),
      },
    };
  })
  // Ordenar por número de máquina ascendente (3 LP, 3 LI, 7 U, 8 U, …, 10 U).
  // Empate por número → suborden alfabético del sufijo (LI antes que LP, U al final).
  .sort((a, b) => {
    const parse = (lbl) => {
      const m = String(lbl || '').trim().match(/^(\d+)\s*(.*)$/);
      return m ? { n: Number(m[1]), suf: (m[2] || '').trim() } : { n: 9999, suf: String(lbl || '') };
    };
    const A = parse(a.s.maquina_label);
    const B = parse(b.s.maquina_label);
    if (A.n !== B.n) return A.n - B.n;
    return A.suf.localeCompare(B.suf);
  });
});

function toggleGrupo(key) {
  expandedGroups.value = { ...expandedGroups.value, [key]: !expandedGroups.value[key] };
  expandedDetail.value = null;
}

function toggleDetail(key, ridx) {
  const id = `${key}_${ridx}`;
  expandedDetail.value = expandedDetail.value === id ? null : id;
}

async function cargar() {
  if (!filtros.fecha) return;
  loading.value = true;
  error.value = null;
  data.value = null;
  expandedGroups.value = {};
  expandedDetail.value = null;
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
  expandedGroups.value = {};
  expandedDetail.value = null;
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

function robotsAvg(row) {
  // Eficiencia promedio de los Robots empalmadores (NO suma).
  const vals = [row.rob_01, row.rob_02, row.rob_03]
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v > 0);
  return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) : null;
}

function fmtRobots(row) {
  const a = robotsAvg(row);
  return a == null ? '–' : a.toFixed(1);
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

function robotsClass(avg) {
  // Eficiencia: más alto = mejor. <85 alta, <90 media.
  if (avg == null) return 'text-gray-400';
  if (avg < 85) return 'text-red-600 font-bold';
  if (avg < 90) return 'text-amber-600 font-semibold';
  return 'text-emerald-700';
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

function ccTotal(row) {
  const a = row?.ccp != null ? Number(row.ccp) : null;
  const b = row?.ccm != null ? Number(row.ccm) : null;
  if (a == null && b == null) return null;
  return (a || 0) + (b || 0);
}
function jTotal(row) {
  const a = row?.jp != null ? Number(row.jp) : null;
  const b = row?.jm != null ? Number(row.jm) : null;
  if (a == null && b == null) return null;
  return (a || 0) + (b || 0);
}
function ccClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n > 30) return 'text-red-600 font-bold';
  if (n > 15) return 'text-amber-600 font-semibold';
  return 'text-gray-700';
}
function jClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n > 25) return 'text-red-600 font-bold';
  if (n > 15) return 'text-amber-600 font-semibold';
  return 'text-gray-700';
}

// Kg/h carda — menor producción suele dar mejor calidad de cinta.
// Umbrales referenciales: < 90 muy cuidado · < 105 normal · ≥ 105 forzado
function kghCardaClass(val) {
  if (val == null) return 'text-gray-400';
  const n = Number(val);
  if (n >= 110) return 'text-red-600 font-bold';
  if (n >= 100) return 'text-amber-600 font-semibold';
  return 'text-emerald-700';
}

// Tooltip HTML con desglose completo de Open End por turno o agregado por grupo.
// `isGroup` cambia las claves a las versiones sumadas/promediadas.
function tooltipOEHtml(d, isGroup = false) {
  const fmtN = (v, dec = 0) => (v == null || v === '' || isNaN(Number(v))) ? '–' : Number(v).toFixed(dec);
  const k = isGroup
    ? { tbob: d.t_bob_avg, rpmCard: d.rpm_card_avg, mo: d.mo_sum, cp: d.cp_sum, cm: d.cm_sum,
        ccp: d.ccp_sum, ccm: d.ccm_sum, jp: d.jp_sum, jm: d.jm_sum,
        cvp: d.oe_cvp_sum, cvmOe: d.oe_cvm_sum,
        n: d.clm_n_sum, s: d.clm_s_sum, l: d.clm_l_sum, t: d.clm_t_sum,
        rob1: d.rob_01_avg, rob2: d.rob_02_avg, rob3: d.rob_03_avg }
    : { tbob: d.t_bob, rpmCard: d.rpm_card, mo: d.mo, cp: d.cp, cm: d.cm,
        ccp: d.ccp, ccm: d.ccm, jp: d.jp, jm: d.jm,
        cvp: d.oe_cvp, cvmOe: d.oe_cvm,
        n: d.clm_n, s: d.clm_s, l: d.clm_l, t: d.clm_t,
        rob1: d.rob_01, rob2: d.rob_02, rob3: d.rob_03 };

  // Datos del header contextual
  const maquina = d.maquina_label || '–';
  const ne = d.ne || '–';
  const lote = d.lote || '–';
  const turnoTxt = isGroup
    ? (Array.isArray(d.turnos) && d.turnos.length ? d.turnos.join(' · ') : '–')
    : (d.turno ? String(d.turno) : '–');

  // Estilos reutilizables
  const sLabel = 'color:#6b7280;font-weight:500;padding-right:8px;text-align:left;';
  const sVal   = 'color:#111827;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;';
  const sBlock = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;';
  const sBlockTitle = 'color:#475569;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;';
  const sRow   = 'display:grid;grid-template-columns:1fr auto;gap:2px 8px;';
  const sCols2 = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;';
  const sub = isGroup
    ? '<div style="font-size:10px;color:#94a3b8;font-weight:500;margin-bottom:6px;">Promedios y sumatorios del grupo</div>'
    : '<div style="font-size:10px;color:#94a3b8;font-weight:500;margin-bottom:6px;">Detalle del turno</div>';

  // Helper para construir un bloque (título + N filas label/valor en columna única)
  const block = (title, rows) => `
    <div style="${sBlock}">
      <div style="${sBlockTitle}">${title}</div>
      <div style="${sRow}">
        ${rows.map(([lab, val]) => `<span style="${sLabel}">${lab}</span><span style="${sVal}">${val}</span>`).join('')}
      </div>
    </div>`;

  const robotsAvgVal = (() => {
    const vals = [k.rob1, k.rob2, k.rob3].map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  })();
  const blockRobos = block('% Robots empalmadores', [
    ['Rob 1', fmtN(k.rob1, 1)],
    ['Rob 2', fmtN(k.rob2, 1)],
    ['Rob 3', fmtN(k.rob3, 1)],
    ['Promedio', fmtN(robotsAvgVal, 1)],
  ]);
  const blockMaquina = block('Máquina', [
    ['T.Bob',    fmtN(k.tbob, 3)],
    ['RPM Card', fmtN(k.rpmCard, 0)],
    ['MO',       fmtN(k.mo, 0)],
  ]);
  const blockCortes = block('Cortes cortos', [
    ['CCp (C+)', fmtN(k.ccp, 0)],
    ['CCm (C−)', fmtN(k.ccm, 0)],
  ]);
  const blockEmpalmes = block('Empalmes', [
    ['JP (P+)', fmtN(k.jp, 0)],
    ['JM (P−)', fmtN(k.jm, 0)],
  ]);
  const blockVariacion = block('Variación', [
    ['CP (V+)', fmtN(k.cp, 0)],
    ['CM (V−)', fmtN(k.cm, 0)],
  ]);
  const blockCV = block('CV', [
    ['CVP', fmtN(k.cvp, 0)],
    ['CVM', fmtN(k.cvmOe, 0)],
  ]);
  const blockClassimat = block('Classimat', [
    ['N', fmtN(k.n, 0)],
    ['S', fmtN(k.s, 0)],
    ['L', fmtN(k.l, 0)],
    ['T', fmtN(k.t, 0)],
  ]);

  return `
    <div style="min-width:300px;font-size:11px;line-height:1.45;">
      <div style="margin-bottom:8px;">
        <div style="font-weight:700;color:#3730a3;font-size:12px;">Detalle Open End</div>
        <div style="font-size:10px;color:#94a3b8;font-weight:500;">${isGroup ? 'Promedios y sumatorios del grupo' : 'Detalle del turno'}</div>
      </div>
      <div style="${sBlock}margin-bottom:6px;background:#eef2ff;border-color:#c7d2fe;">
        <div style="${sBlockTitle}color:#3730a3;">Identificación</div>
        <div style="${sRow}">
          <span style="${sLabel}">Máquina</span><span style="${sVal}">${maquina}</span>
          <span style="${sLabel}">Lote</span><span style="${sVal}">${lote}</span>
          <span style="${sLabel}">Título Ne</span><span style="${sVal}">${ne}</span>
          <span style="${sLabel}">Turno</span><span style="${sVal}">${turnoTxt}</span>
        </div>
      </div>
      <div style="${sCols2}">
        ${blockMaquina}
        ${blockRobos}
        ${blockCortes}
        ${blockEmpalmes}
        ${blockVariacion}
        ${blockCV}
      </div>
      <div style="margin-top:6px;">${blockClassimat}</div>
    </div>
  `;
}

// Tooltip Cardas + Uster Hilo — separa origen (cardas) y resultado (uster).
function tooltipCardaHtml(d, isGroup = false) {
  const fmtN = (v, dec = 1) => (v == null || v === '' || isNaN(Number(v))) ? '–' : Number(v).toFixed(dec);
  const k = isGroup
    ? {
        kgh:   d.prod_kgh_carda_avg, kghMin: d.prod_kgh_carda_min, kghMax: d.prod_kgh_carda_max,
        cvmH:  d.cvm,
        cvmC:  d.cvm_carda_avg, cvmCmax: d.cvm_carda_max,
        muestrasObs: d.muestras_obs, muestrasExp: d.muestras_exp,
        h:     d.vellosidad,
        thin30: d.thin_30, thin40: d.thin_40, thin50: d.thin_50,
        thick35: d.thick_35, thick50: d.thick_50,
        neps140: d.neps_140, neps200: d.neps_200,
        cad:   d.cadena_alimentacion, pas: d.passador,
      }
    : {
        kgh:   d.prod_kgh_carda_turno, kghMin: d.prod_kgh_carda_min, kghMax: d.prod_kgh_carda_max,
        cvmH:  d.cvm,
        cvmC:  d.cvm_carda_turno, cvmCmax: d.cvm_carda_max_turno,
        muestrasObs: d.muestras_carda_turno, muestrasExp: d.muestras_carda_esperadas,
        h:     d.vellosidad,
        thin30: d.thin_30, thin40: d.thin_40, thin50: d.thin_50,
        thick35: d.thick_35, thick50: d.thick_50,
        neps140: d.neps_140, neps200: d.neps_200,
        cad:   d.cadena_alimentacion, pas: d.passador,
      };

  const maquina = d.maquina_label || '–';
  const ne = d.ne || '–';
  const lote = d.lote || '–';
  const turnoTxt = isGroup
    ? (Array.isArray(d.turnos) && d.turnos.length ? d.turnos.join(' · ') : '–')
    : (d.turno ? String(d.turno) : '–');

  const sLabel = 'color:#6b7280;font-weight:500;padding-right:8px;text-align:left;';
  const sVal   = 'color:#111827;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;';
  const sBlock = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;';
  const sBlockTitle = 'color:#475569;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;';
  const sRow   = 'display:grid;grid-template-columns:1fr auto;gap:2px 8px;';
  const sCols2 = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;';

  const block = (title, rows, color) => `
    <div style="${sBlock}">
      <div style="${sBlockTitle}${color ? `color:${color};` : ''}">${title}</div>
      <div style="${sRow}">
        ${rows.map(([lab, val]) => `<span style="${sLabel}">${lab}</span><span style="${sVal}">${val}</span>`).join('')}
      </div>
    </div>`;

  const blockProd = block('Producción Carda', [
    ['Kg/h prom', fmtN(k.kgh, 1)],
    ['Kg/h mín',  fmtN(k.kghMin, 1)],
    ['Kg/h máx',  fmtN(k.kghMax, 1)],
  ]);
  const blockCvm = block('CVm (uniformidad)', [
    ['CVm Hilo',     fmtN(k.cvmH, 2) + ' %'],
    ['CVm Carda',    fmtN(k.cvmC, 2) + ' %'],
    ['CVm Carda máx', fmtN(k.cvmCmax, 2) + ' %'],
  ]);
  const blockNeps = block('Neps', [
    ['Neps +140', fmtN(k.neps140, 0) + '/km'],
    ['Neps +200', fmtN(k.neps200, 0) + '/km'],
  ]);
  const blockThin = block('Adelgazamientos', [
    ['Thin −30 %', fmtN(k.thin30, 0) + '/km'],
    ['Thin −40 %', fmtN(k.thin40, 0) + '/km'],
    ['Thin −50 %', fmtN(k.thin50, 0) + '/km'],
  ]);
  const blockThick = block('Engrosamientos', [
    ['Thick +35 %', fmtN(k.thick35, 0) + '/km'],
    ['Thick +50 %', fmtN(k.thick50, 0) + '/km'],
  ]);
  const blockOtros = block('Otros', [
    ['Vellosidad H', fmtN(k.h, 2)],
    ['Muestras',     k.muestrasExp ? `${Number(k.muestrasObs) || 0}/${k.muestrasExp}` : 'N/D'],
    ['Pasador',      k.pas ? String(k.pas).toUpperCase() : '–'],
  ]);

  // ── Detalle de CVm por carda (laboratorio) ─────────────────────────────
  // Para grupo: muestra una mini-tabla por cada turno con sus cardas y CVm.
  // Para fila turno: usa directamente d.detalle_cardas_turno.
  const cvmCardaClass = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '#9ca3af';
    if (n > 4.0) return '#dc2626';   // rojo
    if (n > 3.5) return '#d97706';   // ámbar
    return '#047857';                // verde
  };
  const renderDetalleTurno = (turno, alim, items, cvmAvg, cvmMax) => {
    const safeItems = (items || []).filter(it => it && it.cvm != null);
    if (!safeItems.length) return '';
    const chips = safeItems.map(it => `
      <span style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:6px;background:#fff;border:1px solid #e2e8f0;font-size:10px;">
        <span style="color:#6b7280;font-weight:500;">${it.carda != null ? `C${String(it.carda).padStart(2,'0')}` : '?'}</span>
        <span style="color:${cvmCardaClass(it.cvm)};font-weight:700;font-variant-numeric:tabular-nums;">${Number(it.cvm).toFixed(2)}</span>
      </span>
    `).join('');
    return `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="color:#047857;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;">
            Turno ${turno || '?'} · ${alim || 'N/D'} · ${safeItems.length} carda${safeItems.length === 1 ? '' : 's'}
          </span>
          <span style="font-size:9px;color:#475569;font-variant-numeric:tabular-nums;">
            μ ${cvmAvg != null ? Number(cvmAvg).toFixed(2) : '–'} · máx ${cvmMax != null ? Number(cvmMax).toFixed(2) : '–'}
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div>
      </div>
    `;
  };

  let blockDetalleCardas = '';
  if (isGroup && Array.isArray(d.detalle_cardas_por_turno) && d.detalle_cardas_por_turno.length) {
    const html = d.detalle_cardas_por_turno
      .map(t => renderDetalleTurno(t.turno, t.alim, t.items, t.cvm_avg, t.cvm_max))
      .filter(Boolean)
      .join('');
    if (html) {
      blockDetalleCardas = `
        <div style="grid-column:1/-1;display:flex;flex-direction:column;gap:4px;">
          <div style="${sBlockTitle}color:#047857;">CVm por carda · detalle del laboratorio</div>
          ${html}
        </div>`;
    }
  } else if (!isGroup && Array.isArray(d.detalle_cardas_turno) && d.detalle_cardas_turno.length) {
    const html = renderDetalleTurno(d.turno, d.alimentacion, d.detalle_cardas_turno, d.cvm_carda_turno, d.cvm_carda_max_turno);
    if (html) {
      blockDetalleCardas = `
        <div style="grid-column:1/-1;display:flex;flex-direction:column;gap:4px;">
          <div style="${sBlockTitle}color:#047857;">CVm por carda · detalle del laboratorio</div>
          ${html}
        </div>`;
    }
  }

  return `
    <div style="min-width:300px;font-size:11px;line-height:1.45;">
      <div style="margin-bottom:8px;">
        <div style="font-weight:700;color:#047857;font-size:12px;">Detalle Cardas + Uster Hilo</div>
        <div style="font-size:10px;color:#94a3b8;font-weight:500;">${isGroup ? 'Promedios del grupo' : 'Detalle del turno'}${k.cad ? ` · Alim.: ${k.cad}` : ''}</div>
      </div>
      <div style="${sBlock}margin-bottom:6px;background:#ecfdf5;border-color:#a7f3d0;">
        <div style="${sBlockTitle}color:#047857;">Identificación</div>
        <div style="${sRow}">
          <span style="${sLabel}">Máquina</span><span style="${sVal}">${maquina}</span>
          <span style="${sLabel}">Lote</span><span style="${sVal}">${lote}</span>
          <span style="${sLabel}">Título Ne</span><span style="${sVal}">${ne}</span>
          <span style="${sLabel}">Turno</span><span style="${sVal}">${turnoTxt}</span>
        </div>
      </div>
      <div style="${sCols2}">
        ${blockProd}
        ${blockCvm}
        ${blockNeps}
        ${blockOtros}
        ${blockThin}
        ${blockThick}
        ${blockDetalleCardas}
      </div>
    </div>
  `;
}

// Tooltip Tensorapid — fuerza, elongación, tenacidad, trabajo + observaciones.
function tooltipTensorapidHtml(d, isGroup = false) {
  const fmtN = (v, dec = 2) => (v == null || v === '' || isNaN(Number(v))) ? '–' : Number(v).toFixed(dec);
  const maquina = d.maquina_label || '–';
  const ne = d.ne || '–';
  const lote = d.lote || '–';
  const turnoTxt = isGroup
    ? (Array.isArray(d.turnos) && d.turnos.length ? d.turnos.join(' · ') : '–')
    : (d.turno ? String(d.turno) : '–');
  const obs = (d.tensor_obs || '').toString().trim();

  const sLabel = 'color:#6b7280;font-weight:500;padding-right:8px;text-align:left;';
  const sVal   = 'color:#111827;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;';
  const sBlock = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;';
  const sBlockTitle = 'color:#475569;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;';
  const sRow   = 'display:grid;grid-template-columns:1fr auto;gap:2px 8px;';
  const sCols2 = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;';

  const block = (title, rows) => `
    <div style="${sBlock}">
      <div style="${sBlockTitle}">${title}</div>
      <div style="${sRow}">
        ${rows.map(([lab, val]) => `<span style="${sLabel}">${lab}</span><span style="${sVal}">${val}</span>`).join('')}
      </div>
    </div>`;

  const blockResist = block('Resistencia', [
    ['Fuerza B', fmtN(d.fuerza_b, 2) + ' cN'],
    ['Tenac.',   fmtN(d.tenacidad, 2) + ' cN/tex'],
  ]);
  const blockDuct = block('Ductilidad', [
    ['Elong. %', fmtN(d.elongacion, 2) + ' %'],
    ['Trabajo B', fmtN(d.trabajo_b, 2) + ' cN·cm'],
  ]);

  const blockObs = obs
    ? `<div style="${sBlock}grid-column:1/-1;">
        <div style="${sBlockTitle}">Observaciones</div>
        <div style="color:#111827;font-size:10.5px;line-height:1.4;white-space:pre-wrap;">${obs.replace(/</g, '&lt;')}</div>
      </div>`
    : '';

  return `
    <div style="min-width:280px;font-size:11px;line-height:1.45;">
      <div style="margin-bottom:8px;">
        <div style="font-weight:700;color:#7e22ce;font-size:12px;">Detalle Tensorapid</div>
        <div style="font-size:10px;color:#94a3b8;font-weight:500;">${isGroup ? 'Promedios del grupo' : 'Detalle del turno'}</div>
      </div>
      <div style="${sBlock}margin-bottom:6px;background:#faf5ff;border-color:#e9d5ff;">
        <div style="${sBlockTitle}color:#7e22ce;">Identificación</div>
        <div style="${sRow}">
          <span style="${sLabel}">Máquina</span><span style="${sVal}">${maquina}</span>
          <span style="${sLabel}">Lote</span><span style="${sVal}">${lote}</span>
          <span style="${sLabel}">Título Ne</span><span style="${sVal}">${ne}</span>
          <span style="${sLabel}">Turno</span><span style="${sVal}">${turnoTxt}</span>
        </div>
      </div>
      <div style="${sCols2}">
        ${blockResist}
        ${blockDuct}
        ${blockObs}
      </div>
    </div>
  `;
}

function labelAlerta(code) {
  const map = {
    eficiencia: 'Efic',
    corte_nat: 'Cort',
    cortes_cortos: 'CC',
    empalmes: 'J',
    robots: 'Robots',
    robos: 'Robots',
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

<style scoped>
/* Tabla compacta — reduce el padding global de todas las celdas del tbody
   para ganar densidad sin tocar cada <td>. */
.oe-table tbody td {
  padding-left: 0.5rem !important;   /* px-2 */
  padding-right: 0.5rem !important;
  padding-top: 0.375rem !important;  /* py-1.5 */
  padding-bottom: 0.375rem !important;
}

/* Separadores verticales entre secciones (1-based: 5, 12, 17, 19) */
.oe-table thead th:nth-child(5),
.oe-table tbody td:nth-child(5)  { border-right: 1px solid #e2e8f0; }
.oe-table thead tr:last-child th:nth-child(12),
.oe-table tbody td:nth-child(12) { border-right: 1px solid #bfdbfe; }
.oe-table thead tr:last-child th:nth-child(17),
.oe-table tbody td:nth-child(17) { border-right: 1px solid #a7f3d0; }
.oe-table thead tr:last-child th:nth-child(20),
.oe-table tbody td:nth-child(20) { border-right: 1px solid #ddd6fe; }

/* La fila expandida con colspan no debe heredar los bordes verticales */
.oe-table tbody tr td[colspan] {
  border-right: none !important;
}
</style>
