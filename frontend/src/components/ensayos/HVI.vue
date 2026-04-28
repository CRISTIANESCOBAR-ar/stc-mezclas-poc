<template>
  <div class="flex flex-col w-full min-h-screen p-4 bg-slate-50">
    <!-- Header / Selector -->
    <div class="mb-4 shrink-0 flex items-center justify-between gap-2">
      <div class="flex flex-col ml-8">
        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span class="p-1.5 bg-blue-100 text-blue-600 rounded-lg">🧬</span>
          {{ t('hvi.title') }}
        </h2>
      </div>
      
      <div class="flex items-center gap-2 flex-1 max-w-2xl justify-end">
        <!-- Acción: Comparación Muestra -->
        <button 
          @click="mostrarComparativa = true"
          v-tippy="{ content: t('hvi.actions.compareTitle'), theme: 'light', placement: 'bottom' }"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <span>{{ t('hvi.actions.compareSamples') }}</span>
        </button>

        <div class="relative flex-1 group max-w-md">
          <input 
            v-model="folderPath"
            type="text" 
            :placeholder="t('hvi.folder.placeholder')"
            class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 group-hover:bg-white"
            @change="saveFolderPath"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h3l2 3h6a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </span>
        </div>

        <button 
          @click="triggerFolderSelector"
          v-tippy="{ content: t('hvi.folder.selectTitle'), theme: 'light', placement: 'bottom' }"
          class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-200 shrink-0 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>

        <button 
          v-if="hasPersistedHandle"
          @click="refreshFolder"
          v-tippy="{ content: t('hvi.folder.refreshTitle'), theme: 'light', placement: 'bottom' }"
          class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-all shrink-0 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button 
          @click="processFiles"
          :disabled="!filesList.length"
          v-tippy="{ content: filesList.length ? t('hvi.actions.processWithCount', { n: filesList.length }) : t('hvi.actions.noFiles'), theme: 'light', placement: 'bottom' }"
          class="p-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg transition-all shadow-lg shadow-green-200 shrink-0 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Table Container -->
    <div class="flex flex-col gap-4">
      <!-- Top Table: TXT Files List -->
      <div class="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        <!-- Radiobutton Filters -->
        <div class="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4 shrink-0">
          <span class="text-[10px] font-bold text-slate-500 uppercase">{{ t('hvi.filters.show') }}</span>
          <div class="flex items-center gap-3">
            <label v-for="opt in filterStatusOptions" :key="opt.value" class="flex items-center gap-1.5 cursor-pointer group">
              <input 
                type="radio" 
                v-model="filterStatus" 
                :value="opt.value" 
                class="w-3 h-3 text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span class="text-[11px] font-medium text-slate-600 group-hover:text-blue-600 transition-colors">{{ opt.label }}</span>
            </label>
          </div>
        </div>

        <div class="overflow-auto flex-1 h-full">
          <table class="w-full text-left border-collapse table-fixed">
            <thead class="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 shadow-sm">
              <tr>
                <th class="w-8 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.table.type') }}</th>
                <th class="w-10 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.table.lot') }}</th>
                <th class="w-30 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.table.provider') }}</th>
                <th class="w-10 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.table.grade') }}</th>
                <th class="w-10 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.table.sample') }}</th>
                <th class="w-8 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider text-center">{{ t('hvi.table.qty') }}</th>
                <th class="w-11 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.table.color') }}</th>
                <th class="w-8 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider text-center">{{ t('hvi.table.cut') }}</th>
                <th class="w-120 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.table.obs') }}</th>
                <th class="w-14 px-1 py-3 text-xs font-bold text-slate-700 tracking-wider text-center">{{ t('hvi.table.action') }}</th>
                <th class="w-10 px-1 py-2 text-xs font-bold text-slate-700 tracking-wider text-center">{{ t('hvi.table.status') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr 
                v-for="(item, index) in filteredFiles" 
                :key="item.fileName" 
                @click="selectFile(item)"
                class="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                :class="{ 'bg-blue-50 border-l-4 border-blue-500': selectedFileName === item.fileName }"
              >
                <td class="px-1 py-2 text-xs">
                  <span 
                    class="px-1.5 py-0.5 rounded-full font-mono"
                    :class="item.tipo === 'Ent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ item.tipo }}
                  </span>
                </td>
                <td class="px-1 py-2 text-xs font-mono text-slate-700">{{ item.loteEntrada }}</td>
                <td class="px-1 py-2 text-xs text-slate-600 truncate" v-tippy="{ content: item.proveedor, theme: 'light', placement: 'top' }">{{ item.proveedor }}</td>
                <td class="px-1 py-2 text-xs text-slate-600 truncate">{{ item.grado }}</td>
                <td class="px-1 py-1 text-xs" @click.stop>
                  <input
                    v-model="item.muestra"
                    type="text"
                    :class="[
                      'w-full px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:opacity-50',
                      selectedFileName === item.fileName ? 'bg-white' : ''
                    ]"
                  />
                </td>
                <td class="px-1 py-1 text-xs text-center" @click.stop>
                  <input 
                    v-model="item.cantidad"
                    type="number" 
                    :readonly="item.tipo === 'Ent'"
                    :class="[ item.tipo === 'Ent' ? 'bg-slate-50 text-blue-700' : '', selectedFileName === item.fileName ? 'bg-white' : '' ]"
                    class="w-full px-1 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none no-spinner text-center"
                  />
                </td>
                <td class="px-1 py-1 text-xs" @click.stop>
                  <select 
                    v-model="item.color"
                    class="w-full px-1 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    <option v-for="c in ['LG', 'BCO', 'LA', 'GRI', 'AMA']" :key="c" :value="c">{{ c }}</option>
                  </select>
                </td>
                <td class="px-1 py-1 text-xs" @click.stop>
                  <select
                    v-model="item.cort"
                    :class="[ 'w-full px-1 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer', selectedFileName === item.fileName ? 'bg-white' : '' ]"
                  >
                    <option value=""></option>
                    <option v-for="n in [1, 2, 3]" :key="n" :value="n">{{ n }}</option>
                  </select>
                </td>
                <td class="px-1 py-1 text-xs" @click.stop>
                  <input 
                    v-model="item.obs"
                    type="text" 
                    :class="[ 'w-full px-1 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none', selectedFileName === item.fileName ? 'bg-white' : '' ]"
                  />
                </td>
                <td class="px-1 py-1 text-xs text-center" @click.stop>
                  <div class="flex items-center justify-center gap-1.5">
                    <!-- Guardar (solo si no procesado) -->
                    <button 
                      v-if="item.estado !== 'Procesado'"
                      @click="handleSaveFromRow(item)"
                      v-tippy="{ content: t('hvi.tooltips.saveTest') }"
                      class="p-1.5 rounded-md transition-all sm:p-1 text-green-600 hover:bg-green-50 active:scale-95 border border-transparent hover:border-green-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    </button>
                    <!-- Re-guardar (solo si ya procesado) -->
                    <button 
                      v-else
                      @click="handleSaveFromRow(item)"
                      v-tippy="{ content: t('hvi.tooltips.resaveTest') }"
                      class="p-1.5 rounded-md transition-all sm:p-1 text-amber-500 hover:bg-amber-50 active:scale-95 border border-transparent hover:border-amber-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button 
                      @click="handleEditFromRow(item)"
                      :disabled="item.estado !== 'Procesado'"
                      v-tippy="{ content: t('hvi.tooltips.editMetadata') }"
                      class="p-1.5 rounded-md transition-all sm:p-1"
                      :class="item.estado !== 'Procesado' ? 'text-slate-200 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50 active:scale-95 border border-transparent hover:border-blue-200'"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="handleDeleteFromRow(item)"
                      v-tippy="{ content: t('hvi.tooltips.deleteTest') }"
                      class="p-1.5 rounded-md transition-all sm:p-1 text-red-600 hover:bg-red-50 active:scale-95 border border-transparent hover:border-red-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td class="px-1 py-2 text-xs text-center">
                  <div v-if="item.estado === 'Procesado'" v-tippy="{ content: t('hvi.status.saved'), theme: 'light', placement: 'left' }" class="flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div v-else v-tippy="{ content: t('hvi.status.pendingSave'), theme: 'light', placement: 'left' }" class="flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </td>
              </tr>
              
              <tr v-if="parsedFiles.length === 0">
                <td colspan="10" class="px-4 py-16 text-center">
                  <p class="text-xs text-slate-400">{{ t('hvi.messages.noFiles') }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Small Footer for Left Table -->
        <div class="bg-slate-50 border-t border-slate-200 px-3 py-2 shrink-0 flex justify-between items-center text-[10px]">
          <span class="text-slate-500">{{ t('hvi.messages.filesCount', { n: parsedFiles.length }) }}</span>
        </div>
      </div>

      <!-- Bottom Table: HVI Detailed Data -->
      <div class="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col min-w-0">
        <div v-if="selectedFileName || hviDetails.length" class="sticky top-0 z-50 bg-white">
          <div v-if="selectedFileName" class="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-4 flex-1 flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ t('hvi.table.type') }}</span>
              <span :class="['px-2 py-0.5 rounded-full text-xs font-bold', selectedFileItem?.tipo === 'Ent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600']">
                {{ selectedFileItem?.tipo ?? '—' }}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ t('hvi.table.lot') }}</span>
              <span class="text-xs font-mono font-bold text-slate-700">{{ selectedFileItem?.loteEntrada ?? '—' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ t('hvi.table.provider') }}</span>
              <span class="text-xs font-medium text-slate-700">{{ selectedFileItem?.proveedor ?? '—' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ t('hvi.table.grade') }}</span>
              <span class="text-xs font-medium text-slate-700">{{ selectedFileItem?.grado ?? '—' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ t('hvi.table.color') }}</span>
              <span class="text-xs font-medium text-slate-700">{{ selectedFileItem?.color ?? '—' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ t('hvi.table.cut') }}</span>
              <span class="text-xs font-medium text-slate-700">{{ selectedFileItem?.cort ?? '—' }}</span>
            </div>
            <div v-if="parseRiskState.level !== 'normal'" class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{{ t('hvi.parseWarnings.riskLabel') }}</span>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full text-[10px] font-bold',
                  parseRiskState.level === 'critical'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                ]"
                v-tippy="{ content: parseRiskState.title, theme: 'light', placement: 'top' }"
              >
                {{ parseRiskState.badgeText }}
              </span>
            </div>
          </div>
          <!-- Botones de Acción -->
          <div class="flex items-center gap-2">
            
            <!-- Botón Exportar Excel -->
            <button 
              v-if="hviDetails.length > 0"
              @click="exportarExcel"
              v-tippy="{ content: t('hvi.actions.exportExcel'), theme: 'light', placement: 'bottom' }"
              class="flex items-center justify-center p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-md active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            <!-- Selector Modelo -->
            <div v-if="hviDetails.length > 0" class="relative group">
              <select v-model="selectedModel" class="appearance-none pl-2 pr-5 py-1.5 text-[10px] uppercase font-bold bg-white border border-indigo-200 rounded-lg text-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-400 transition-colors">
                <option v-for="m in modelOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-indigo-400 group-hover:text-indigo-600">
                <svg class="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            <!-- NUEVO: Botón Análisis IA -->
            <button 
              v-if="hviDetails.length > 0"
              @click="solicitarAnalisisAI"
              :disabled="cargandoAI"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <span v-if="cargandoAI" class="animate-spin text-[10px]">🌀</span>
              <span v-else>{{ t('hvi.actions.aiAnalysis') }}</span>
            </button>

             <!-- NUEVO: Botón Auditoría Contrato -->
            <button 
              v-if="hviDetails.length > 0"
              @click="mostrarVerificarContrato = true"
              :disabled="loadingAudit"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
              v-tippy="{ content: t('hvi.actions.verifyContractTitle'), theme: 'light', placement: 'bottom' }"
            >
              <span v-if="loadingAudit" class="animate-spin text-[10px]">⏳</span>
              <span v-else>{{ t('hvi.actions.verifyContract') }}</span>
            </button>

            <!-- Botón Analizar -->
            <button 
              v-if="hviDetails.length > 0"
              @click="mostrarAnalizador = true"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-all shadow-md active:scale-95"
            >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {{ t('hvi.actions.techAnalysis') }}
          </button>
        </div>
      </div>

        <div v-if="hviDetails.length" class="bg-slate-100 border-b border-slate-300 shadow-sm">
          <div
            ref="detailsHeaderScroller"
            class="overflow-x-auto overflow-y-hidden"
            @scroll="syncDetailsHeaderScroll"
          >
            <table class="w-full text-left border-separate border-spacing-0 table-fixed min-w-300">
              <thead>
                <tr>
                  <th class="w-20 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider">{{ t('hvi.detailTable.bale') }}</th>
                  <th v-tippy="{ content: hviTooltips.SCI, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">SCI <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.MST, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">MST <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.MIC, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">MIC <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.MAT, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">MAT <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.UHML, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">UHML <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.UI, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">UI <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.SF, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">SF <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.STR, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">STR <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.ELG, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">ELG <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.RD, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">RD <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.PLUS_B, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">+b <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.TIPO, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">TIPO <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.TrCNT, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">TrCNT <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.TrAR, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">TrAR <span class="text-teal-400">ⓘ</span></th>
                  <th v-tippy="{ content: hviTooltips.TRID, delay: 0, maxWidth: 420, placement: 'bottom-start', interactive: true }" class="w-16 px-4 py-3 text-xs font-bold text-slate-700 tracking-wider cursor-help">TRID <span class="text-teal-400">ⓘ</span></th>
                </tr>
              </thead>
            </table>
          </div>
        </div>
        </div>

        <div
          ref="detailsBodyScroller"
          class="overflow-x-auto overflow-y-visible relative"
          @scroll="syncDetailsBodyScroll"
        >
          <table class="details-table w-full text-left border-separate border-spacing-0 table-fixed min-w-300">
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(row, idx) in hviDetails" :key="idx" 
                  :id="`hvi-detail-row-${idx + 1}`"
                  :class="[
                    'hover:bg-slate-50 transition-colors',
                    clasificarFila(row).alertas.some(a => a.tipo === 'bandera-roja') ? 'ring-2 ring-red-400 ring-inset' : '',
                    row._parseIssues?.length ? 'bg-amber-50/70 ring-1 ring-amber-300 ring-inset' : ''
                  ]">
                <td class="px-4 py-2 text-xs font-mono text-slate-700 relative">
                  {{ row.fardo }}
                  <span
                    v-if="row._parseIssues?.length"
                    class="ml-1 inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                    v-tippy="{ content: t('hvi.parseWarnings.rowIssueTooltip', { line: row._sourceLine, fields: row._parseIssues.join(', ') }), theme: 'light', placement: 'top' }"
                  >
                    {{ t('hvi.parseWarnings.rowIssueTag') }}
                  </span>
                  <!-- Indicadores de alerta -->
                  <div v-if="clasificarFila(row).alertas.length" class="absolute -right-1 top-0 flex flex-col gap-0.5">
                    <span v-for="(alerta, ai) in clasificarFila(row).alertas" :key="ai"
                          v-tippy="{ content: alerta.mensaje, theme: 'light', placement: 'left' }"
                          :class="[
                            'w-2.5 h-2.5 rounded-full cursor-help',
                            alerta.tipo === 'bandera-roja' ? 'bg-red-500' : '',
                            alerta.tipo === 'riesgo-tenido' ? 'bg-purple-500' : '',
                            alerta.tipo === 'fibra-opaca' ? 'bg-amber-500' : ''
                          ]"></span>
                  </div>
                </td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('sci')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).sci)]">{{ row.sci }}</td>
                <td class="px-4 py-2 text-xs text-slate-600">{{ row.mst }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('mic')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).mic)]">{{ row.mic }}</td>
                <td class="px-4 py-2 text-xs text-slate-600">{{ row.mat }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('uhml')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).uhml)]">{{ row.uhml }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('ui')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).ui)]">{{ row.ui }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('sf')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).sf)]">{{ row.sf }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('str')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).str)]">{{ row.str }}</td>
                <td class="px-4 py-2 text-xs text-slate-600">{{ row.elg }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('rd')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).rd)]">{{ row.rd }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('plusB')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).plusB)]">{{ row.plusB }}</td>
                <td class="px-4 py-2 text-xs text-slate-600">{{ row.tipo }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('trCnt')) ? 'bg-red-500 text-white font-bold' : 'text-slate-600']">{{ row.trCnt }}</td>
                <td :class="['px-4 py-2 text-xs font-medium', isBaleFailed(row.fardo, toAuditKey('trAr')) ? 'bg-red-500 text-white font-bold' : getClaseColor(clasificarFila(row).trAr)]">{{ row.trAr }}</td>
                <td class="px-4 py-2 text-xs text-slate-600">{{ row.trid }}</td>
              </tr>
              <tr v-if="!hviDetails.length">
                <td colspan="16" class="px-4 py-16 text-center">
                  <div class="flex flex-col items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p class="text-sm">{{ t('hvi.messages.selectFileForDetail') }}</p>
                  </div>
                </td>
              </tr>
            </tbody>
            <!-- Footer fijo con promedios -->
            <tfoot v-if="hviDetails.length" class="sticky bottom-0 z-10 bg-blue-50 border-t-2 border-blue-200">
              <tr class="font-bold text-blue-900 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                <td class="px-4 py-3 text-xs bg-blue-100/50">{{ t('hvi.messages.avgRow', { n: hviDetails.length }) }}</td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('sci')), theme: 'light', placement: 'top' }" 
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('sci'), getClaseColor(clasificarMayorMejor(hviAverages.sci, PARAMETROS_HVI_INTERNACIONAL.SCI)))]">
                    {{ hviAverages.sci }}
                </td>
                <td class="px-4 py-3 text-xs">{{ hviAverages.mst }}</td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('mic')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('mic'), getClaseColor(clasificarMIC(hviAverages.mic)))]">
                    {{ hviAverages.mic }}
                </td>
                <td class="px-4 py-3 text-xs">{{ hviAverages.mat }}</td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('uhml')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('uhml'), getClaseColor(clasificarMayorMejor(hviAverages.uhml, PARAMETROS_HVI_INTERNACIONAL.UHML)))]">
                    {{ hviAverages.uhml }}
                </td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('ui')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('ui'), getClaseColor(clasificarMayorMejor(hviAverages.ui, PARAMETROS_HVI_INTERNACIONAL.UI)))]">
                    {{ hviAverages.ui }}
                </td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('sf')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('sf'), getClaseColor(clasificarMenorMejor(hviAverages.sf, PARAMETROS_HVI_INTERNACIONAL.SF)))]">
                    {{ hviAverages.sf }}
                </td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('str')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('str'), getClaseColor(clasificarMayorMejor(hviAverages.str, PARAMETROS_HVI_INTERNACIONAL.STR)))]">
                    {{ hviAverages.str }}
                </td>
                <td class="px-4 py-3 text-xs">{{ hviAverages.elg }}</td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('rd')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('rd'), getClaseColor(clasificarMayorMejor(hviAverages.rd, PARAMETROS_HVI_INTERNACIONAL.RD)))]">
                    {{ hviAverages.rd }}
                </td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('plusB')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('plusB'), getClaseColor(clasificarMenorMejor(hviAverages.plusB, PARAMETROS_HVI_INTERNACIONAL.PLUS_B)))]">
                    {{ hviAverages.plusB }}
                </td>
                <td class="px-4 py-3 text-xs">{{ hviAverages.tipo }}</td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('trCnt')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('trCnt'), '')]">
                    {{ hviAverages.trCnt }}
                </td>
                <td v-tippy="{ content: getAuditTooltip(toAuditKey('trAr')), theme: 'light', placement: 'top' }"
                    :class="['px-4 py-3 text-xs', getAuditClass(toAuditKey('trAr'), getClaseColor(clasificarMenorMejor(hviAverages.trAr, PARAMETROS_HVI_INTERNACIONAL.TRAR)))]">
                    {{ hviAverages.trAr }}
                </td>
                <td class="px-4 py-3 text-xs">{{ hviAverages.trid }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <!-- Leyenda de clasificación HVI -->
        <div v-if="hviDetails.length" class="mt-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
          <div class="flex flex-wrap items-center gap-4 text-xs">
            <span class="font-semibold text-slate-600">{{ t('hvi.legend.classification') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> {{ t('hvi.legend.excellent') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-50 border border-yellow-300"></span> {{ t('hvi.legend.acceptable') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-orange-100 border border-orange-300"></span> {{ t('hvi.legend.critical') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-100 border border-red-300"></span> {{ t('hvi.legend.outOfRange') }}</span>
            <span class="border-l border-slate-300 pl-4 font-semibold text-slate-600">{{ t('hvi.legend.alerts') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500"></span> {{ t('hvi.legend.redFlag') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-purple-500"></span> {{ t('hvi.legend.dyeRisk') }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-amber-500"></span> {{ t('hvi.legend.opaqueFiber') }}</span>
          </div>
          <!-- Resumen de alertas -->
          <div v-if="resumenAlertas.total > 0" class="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-3 text-xs">
            <span v-if="resumenAlertas.banderaRoja" class="px-2 py-1 bg-red-100 text-red-700 rounded font-medium">
              {{ resumenAlertas.banderaRoja }} pacas con Bandera Roja
            </span>
            <span v-if="resumenAlertas.riesgoTenido" class="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
              {{ resumenAlertas.riesgoTenido }} pacas con Riesgo de Teñido
            </span>
            <span v-if="resumenAlertas.fibraOpaca" class="px-2 py-1 bg-amber-100 text-amber-700 rounded font-medium">
              {{ resumenAlertas.fibraOpaca }} pacas con Fibra Opaca
            </span>
          </div>

          <div v-if="detailParseIssueRows.length" class="mt-2 pt-2 border-t border-slate-200">
            <p class="text-xs font-semibold text-amber-800 mb-1">{{ t('hvi.parseWarnings.detailRowsTitle') }}</p>
            <div class="flex flex-wrap gap-2 text-xs">
              <button
                v-for="issue in detailParseIssueRows"
                :key="`issue-${issue.detailRow}`"
                type="button"
                @click="scrollToDetailRow(issue.detailRow)"
                class="px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                v-tippy="{ content: t('hvi.parseWarnings.rowIssueTooltip', { line: issue.sourceLine, fields: issue.fields.join(', ') }), theme: 'light', placement: 'top' }"
              >
                {{ t('hvi.parseWarnings.detailRowItem', { row: issue.detailRow, fardo: issue.fardo }) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden folder input pointer -->
    <input 
      ref="folderInput"
      type="file" 
      webkitdirectory 
      directory 
      multiple 
      class="hidden" 
      @change="handleFolderChange"
    />

    <!-- Modal Analizador HVI -->
    <Teleport to="body">
      <div v-if="mostrarAnalizador" 
           class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           @click.self="mostrarAnalizador = false">
        <div class="relative w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl">
          <!-- Botón cerrar -->
          <button 
            @click="mostrarAnalizador = false"
            class="absolute top-4 right-4 z-10 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <!-- Componente Analizador -->
          <AnalizadorHVI 
            :pacas="hviDetails" 
            :metadata="selectedFileItem"
          />
        </div>
      </div>
    </Teleport>

    <!-- Modal Comparativa -->
    <Teleport to="body">
      <div v-if="mostrarComparativa" class="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-auto relative">
          <button 
            @click="mostrarComparativa = false"
            class="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all active:scale-95"
          >
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <EnsayoHVICompare />
        </div>
      </div>
    </Teleport>

    <!-- Modal Verificar Contrato -->
    <Teleport to="body">
      <div v-if="mostrarVerificarContrato"
             class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
             @click.self="mostrarVerificarContrato = false">
          <div class="relative w-full max-w-7xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl bg-white">
            <!-- Botón cerrar -->
            <button
              @click="mostrarVerificarContrato = false"
              class="absolute top-4 right-4 z-10 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <VerificarContrato
              :pacas="hviDetails"
              :metadata="{
                loteEntrada: selectedFileItem?.loteEntrada || 'Lote Mix',
                proveedor: selectedFileItem?.proveedor || 'N/A',
                grado: selectedFileItem?.grado,
                fecha: selectedFileItem?.fecha,
                color: selectedFileItem?.color,
                cort: selectedFileItem?.cort,
                obs: selectedFileItem?.obs
              }"
            />
          </div>
      </div>
    </Teleport>

    <!-- Modal para el resultado de la IA -->
    <Teleport to="body">
      <div v-if="mostrarModalAI" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <div class="px-6 py-4 bg-linear-to-br from-purple-700 via-indigo-800 to-blue-900 text-white flex justify-between items-center">
            <div>
              <h3 class="font-bold text-base">{{ t('hvi.ai.modalTitle') }}</h3>
              <p class="text-[10px] opacity-80 uppercase tracking-widest font-bold">{{ t('hvi.ai.modalSubtitle') }}</p>
            </div>
            <button @click="mostrarModalAI = false" class="p-1.5 hover:bg-white/10 rounded-full transition-colors">
               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="p-8 overflow-auto bg-slate-50 min-h-75">
            <div v-if="cargandoAI" class="flex flex-col items-center justify-center py-20">
              <div class="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <p class="text-sm text-slate-500 font-medium text-center">{{ t('hvi.ai.loading') }}</p>
            </div>
            <div v-else class="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium italic">
              {{ aiInsight }}
            </div>
          </div>
          <div class="px-6 py-3 bg-white border-t flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>{{ t('hvi.ai.modelTag') }}: {{ selectedModel.toUpperCase() }}</span>
            <span>{{ t('hvi.ai.dataTag') }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import AnalizadorHVI from './AnalizadorHVI.vue'; 
import VerificarContrato from './VerificarContrato.vue'; 
import EnsayoHVICompare from './EnsayoHVICompare.vue';

// (Moved watch/toAuditKey further down to fix initialization error)

// =====================================================
// TOOLTIPS INFORMATIVOS POR VARIABLE HVI
// =====================================================
const hviTooltipsES = {
  SCI: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">SCI - Spinning Consistency Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Fórmula matemática ponderada. La "nota final" del lote.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Excelente: > 140 (Premium)</div></div>
      <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #f59e0b;"><div style="font-size: 11px; color: #92400e; font-weight: 500;">● Estándar: 100-140</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Pobre: < 100 (Riesgoso)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">📊 Ponderación:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Da más peso a STR (resistencia) y UHML (longitud). Resume todas las variables en un solo número.</div></div>
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 6px;">📎 Clasificación Sugerida:</div><div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 3px;">• <strong>SCI > 135:</strong> Lotes para hilos Flame</div><div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 3px;">• <strong>SCI 110-134:</strong> Lotes para Denim estándar</div><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">• <strong>SCI < 110:</strong> Tramas baja exigencia o mezclas</div></div>
    </div>
  `,
  MST: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">MST - Moisture (Humedad)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">El "termómetro de confianza" del análisis. Fibra higroscópica.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Rango estándar HVI: 6.5% - 8.0%</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ MST Bajo (&lt;6%):</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">Fibra muy seca. HVI reportará fibra más corta y débil de lo real. Medición poco confiable.</div></div>
      <div style="background: #fff7ed; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px;">⚠️ MST Alto (&gt;8%):</div><div style="font-size: 11px; color: #9a3412; line-height: 1.5;">Fibra húmeda. Parecerá más fuerte pero será difícil de limpiar en proceso.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Regla:</strong> Por cada 1% de aumento en humedad, STR aumenta ~1 unidad. MST fuera de rango invalida la precisión del HVI.</div></div>
    </div>
  `,
  MIC: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">MIC - Micronaire</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Medida de permeabilidad al aire. Combina finura y madurez.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 3.7 - 4.2 (Ideal Denim)</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 3.4 (Inmadura) o &gt; 4.9 (Gruesa)</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ MIC Bajo (&lt;3.4):</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">Fibra inmadura que colapsa. Forma Neps (puntos blancos que no se tiñen con índigo).</div></div>
      <div style="background: #fff7ed; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px;">⚠️ MIC Alto (&gt;4.9):</div><div style="font-size: 11px; color: #9a3412; line-height: 1.5;">Fibras muy maduras pero gruesas. Menos fibras en sección transversal = hilo más débil.</div></div>
    </div>
  `,
  MAT: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">MAT - Maturity Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Proporción de celulosa en la fibra. Mide desarrollo de pared celular.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &gt; 0.85 (Fibra "llena")</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 0.75 (Inmadura)</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">👖 Impacto Denim:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">MAT bajo = Hilo moteado después del teñido índigo. Fibras inmaduras reflejan luz diferente.</div></div>
    </div>
  `,
  UHML: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">UHML - Upper Half Mean Length</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Longitud promedio de la mitad más larga de las fibras.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &gt; 29mm (1.15")</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 26mm (1.05")</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔧 Aplicación Técnica:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Dicta el ajuste de distancias entre rodillos en la continua de hilar. Un UHML alto permite hilos más finos y resistentes.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 Variación alta entre pacas genera irregularidad de masa (hilo con partes gruesas y delgadas no deseadas).</div></div>
    </div>
  `,
  UI: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">UI - Uniformity Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Mide qué tan cerca está la longitud media de las fibras más largas.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &gt; 83%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 79% (&lt; 78% = roturas en tejeduría)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔍 Diagnóstico:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Un UI bajo indica que el algodón fue maltratado en el desmote, rompiendo fibras.</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Impacto Visual:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">UI &lt; 78% = Hilo "sucio" visualmente + Roturas frecuentes en telar.</div></div>
    </div>
  `,
  SF: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">SF - Short Fiber Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Fibras menores a 12.7 mm. No se enganchan bien en el hilo.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &lt; 6%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 12%</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Mayor Enemigo:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">Genera "fly" (pelusa volando) en la planta, reduce eficiencia y ensucia el ambiente.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Hilos Flame:</strong> SF alto (&gt;10%) hace que el hilo se desintegre en los puntos de transición del efecto flammé.</div></div>
    </div>
  `,
  STR: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">STR - Strength (Tenacidad)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Resistencia a la rotura medida rompiendo un mazo de fibras (bundle).</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &gt; 30 g/tex</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 24 g/tex (&lt; 25 para Denim)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">📊 Regla de Oro:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">La resistencia del hilo es aproximadamente el 50% de la resistencia de la fibra.</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">👖 Impacto Denim:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">El Denim se somete a lavados agresivos (stone wash, enzimas). STR &lt; 25 = prenda pode romper nas costuras.</div></div>
    </div>
  `,
  ELG: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">ELG - Elongation (Elasticidad)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Capacidad de "resorte" de la fibra. Estiramiento antes de rotura.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &gt; 7%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 5%</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🎯 Ventaja Mecánica:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Absorbe mejor los impactos mecánicos en el telar. Reduce roturas.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 Entre dos algodones con mismo STR, el que tenga mayor ELG siempre trabajará mejor.</div></div>
    </div>
  `,
  RD: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">Rd - Reflectance (Brillo)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Mide el brillo: blanco vs gris. Escala de Nickerson-Hunter.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 75 - 80 (Bright)</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 70 (Grisáceo)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🎨 Combinación con +b:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Rd y +b juntos definen el TIPO en carta Nickerson-Hunter. TIPO 41 = Estándar Denim.</div></div>
    </div>
  `,
  PLUS_B: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">+b - Yellowness (Amarillamiento)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Mide degradación: blanco vs amarillo. Indica envejecimiento.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 7 - 9</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 12 (Muy amarillento)</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Causa:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">+b alto = Algodón expuesto a lluvia o calor excesivo en campo. Debilita paredes de fibra.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Impacto Índigo:</strong> +b alto altera el tono final del azul, "ensuciando" el color deseado en Denim.</div></div>
    </div>
  `,
  TIPO: `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="font-weight: 600; font-size: 14px; color: #0f766e; margin-bottom: 8px; border-bottom: 2px solid #14b8a6; padding-bottom: 4px;">TIPO - Cotton Grade</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 8px; line-height: 1.5;">Clasificación comercial basada en color, basura y preparación.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: 11, 21</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 6px;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">● Estándar: 31, 41</div></div>
      <div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 8px;">Grupo: Color y Apariencia</div>
    </div>
  `,
  TrCNT: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">TrCNT - Trash Count (Cantidad)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Número de partículas de basura detectadas en la muestra.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &lt; 15 partículas</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 50 partículas</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔌 Interpretación:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">TrCNT alto + TrAR bajo = Basura muy fragmentada (pimienta), MUY difícil de limpiar en apertura.</div></div>
    </div>
  `,
  TrAR: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">TrAR - Trash Area (Área)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Área superficial cubierta por basura en la muestra (%).</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Óptimo: &lt; 0.20%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 0.60%</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔍 Análisis Combinado:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">TrCNT bajo + TrAR alto = Pocas partículas pero grandes (hojas). Más fácil de limpiar que pimienta.</div></div>
    </div>
  `,
  TRID: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">TRID - Trash ID / Grade</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Clasificación visual del 1 al 7. Basado principalmente en TrAR.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ 1-2: Limpio (Ideal hilos finos)</div></div>
      <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #f59e0b;"><div style="font-size: 11px; color: #92400e; font-weight: 500;">● 4-5: Manejable para Denim</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ 6-7: Muy sucio (Evitar)</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Aplicación:</strong> TRID 4-5 es aceptable para Denim. Para hilos Flame o finos, buscar TRID 1-2.</div></div>
    </div>
  `
};

const hviTooltipsPT = {
  SCI: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">SCI - Spinning Consistency Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Fórmula matemática ponderada. A "nota final" do lote.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Excelente: > 140 (Premium)</div></div>
      <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #f59e0b;"><div style="font-size: 11px; color: #92400e; font-weight: 500;">● Padrão: 100-140</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Fraco: < 100 (Arriscado)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">📊 Ponderação:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Dá mais peso a STR (resistência) e UHML (comprimento). Resume todas as variáveis em um único número.</div></div>
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #374151; font-weight: 600; margin-bottom: 6px;">📎 Classificação Sugerida:</div><div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 3px;">• <strong>SCI > 135:</strong> Lotes para fios Flame</div><div style="font-size: 10px; color: #6b7280; line-height: 1.4; margin-bottom: 3px;">• <strong>SCI 110-134:</strong> Lotes para Denim padrão</div><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">• <strong>SCI < 110:</strong> Tramas de baixa exigência ou misturas</div></div>
    </div>
  `,
  MST: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">MST - Moisture (Umidade)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">O "termômetro de confiança" da análise. Fibra higroscópica.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Faixa padrão HVI: 6,5% - 8,0%</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ MST Baixo (&lt;6%):</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">Fibra muito seca. O HVI reportará fibra mais curta e fraca do que o real. Medição pouco confiável.</div></div>
      <div style="background: #fff7ed; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px;">⚠️ MST Alto (&gt;8%):</div><div style="font-size: 11px; color: #9a3412; line-height: 1.5;">Fibra úmida. Parecerá mais forte mas será difícil de limpar no processo.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Regra:</strong> A cada 1% de aumento na umidade, o STR aumenta ~1 unidade. MST fora da faixa invalida a precisão do HVI.</div></div>
    </div>
  `,
  MIC: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">MIC - Micronaire</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Medida de permeabilidade ao ar. Combina finura e maturidade.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: 3,7 - 4,2 (Ótimo para Denim)</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 3,4 (Imatura) ou &gt; 4,9 (Grossa)</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ MIC Baixo (&lt;3,4):</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">Fibra imatura que colapsa. Forma Neps (pontos brancos que não fixam o índigo).</div></div>
      <div style="background: #fff7ed; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #c2410c; font-weight: 600; margin-bottom: 4px;">⚠️ MIC Alto (&gt;4,9):</div><div style="font-size: 11px; color: #9a3412; line-height: 1.5;">Fibras muito maduras mas grossas. Menos fibras na seção transversal = fio mais fraco.</div></div>
    </div>
  `,
  MAT: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">MAT - Maturity Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Proporção de celulose na fibra. Mede o desenvolvimento da parede celular.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &gt; 0,85 (Fibra "cheia")</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 0,75 (Imatura)</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">👖 Impacto Denim:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">MAT baixo = Fio manchado após o tingimento índigo. Fibras imaturas refletem luz de forma diferente.</div></div>
    </div>
  `,
  UHML: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">UHML - Upper Half Mean Length</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Comprimento médio da metade mais longa das fibras.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &gt; 29mm (1,15")</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 26mm (1,05")</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔧 Aplicação Técnica:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Define o ajuste das distâncias entre rolos na filatória. Um UHML alto permite fios mais finos e resistentes.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 Alta variação entre fardos gera irregularidade de massa (fio com partes grossas e finas indesejadas).</div></div>
    </div>
  `,
  UI: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">UI - Uniformity Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Mede quão próximo está o comprimento médio das fibras mais longas.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &gt; 83%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 79% (&lt; 78% = quebras na tecelagem)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔍 Diagnóstico:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">UI baixo indica que o algodão foi danificado no descaroçamento, quebrando fibras.</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Impacto Visual:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">UI &lt; 78% = Fio "sujo" visualmente + Quebras frequentes no tear.</div></div>
    </div>
  `,
  SF: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">SF - Short Fiber Index</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Fibras menores que 12,7 mm. Não se prendem bem ao fio.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &lt; 6%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 12%</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Maior Inimigo:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">Gera "fly" (penugem voando) na planta, reduz eficiência e suja o ambiente.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Fios Flame:</strong> SF alto (&gt;10%) faz o fio se desfazer nos pontos de transição do efeito flamê.</div></div>
    </div>
  `,
  STR: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">STR - Strength (Tenacidade)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Resistência à ruptura medida rompendo um feixe de fibras (bundle).</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &gt; 30 g/tex</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 24 g/tex (&lt; 25 para Denim)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">📊 Regra de Ouro:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">A resistência do fio é aproximadamente 50% da resistência da fibra.</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">👖 Impacto Denim:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">O Denim é submetido a lavagens agressivas (stone wash, enzimas). STR &lt; 25 = peça pode rasgar nas costuras.</div></div>
    </div>
  `,
  ELG: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">ELG - Elongation (Elasticidade)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Capacidade de "mola" da fibra. Alongamento antes da ruptura.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &gt; 7%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 5%</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🎯 Vantagem Mecânica:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Absorve melhor os impactos mecânicos no tear. Reduz quebras.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 Entre dois algodões com mesmo STR, o de maior ELG sempre trabalhará melhor.</div></div>
    </div>
  `,
  RD: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">Rd - Reflectance (Brilho)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Mede o brilho: branco vs cinza. Escala de Nickerson-Hunter.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: 75 - 80 (Bright)</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &lt; 70 (Acinzentado)</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🎨 Combinação com +b:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">Rd e +b juntos definem o TIPO na carta Nickerson-Hunter. TIPO 41 = Padrão Denim.</div></div>
    </div>
  `,
  PLUS_B: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">+b - Yellowness (Amarelamento)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Mede degradação: branco vs amarelo. Indica envelhecimento.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: 7 - 9</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 12 (Muito amarelado)</div></div>
      <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 8px;"><div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">⚠️ Causa:</div><div style="font-size: 11px; color: #78350f; line-height: 1.5;">+b alto = Algodão exposto à chuva ou calor excessivo no campo. Enfraquece as paredes da fibra.</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Impacto Índigo:</strong> +b alto altera o tom final do azul, "sujando" a cor desejada no Denim.</div></div>
    </div>
  `,
  TIPO: `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="font-weight: 600; font-size: 14px; color: #0f766e; margin-bottom: 8px; border-bottom: 2px solid #14b8a6; padding-bottom: 4px;">TIPO - Cotton Grade</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 8px; line-height: 1.5;">Classificação comercial baseada em cor, impurezas e preparação.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: 11, 21</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 6px;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">● Padrão: 31, 41</div></div>
      <div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 8px;">Grupo: Cor e Aparência</div>
    </div>
  `,
  TrCNT: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">TrCNT - Trash Count (Quantidade)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Número de partículas de impureza detectadas na amostra.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &lt; 15 partículas</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 50 partículas</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔌 Interpretação:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">TrCNT alto + TrAR baixo = Impureza muito fragmentada (pimenta), MUITO difícil de limpar na abertura.</div></div>
    </div>
  `,
  TrAR: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">TrAR - Trash Area (Área)</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Área superficial coberta por impurezas na amostra (%).</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ Ideal: &lt; 0,20%</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ Crítico: &gt; 0,60%</div></div>
      <div style="background: #eff6ff; padding: 10px; border-radius: 6px;"><div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">🔍 Análise Combinada:</div><div style="font-size: 11px; color: #475569; line-height: 1.5;">TrCNT baixo + TrAR alto = Poucas partículas mas grandes (folhas). Mais fácil de limpar do que pimenta.</div></div>
    </div>
  `,
  TRID: `
    <div style="padding: 14px; font-family: system-ui, -apple-system, sans-serif; max-width: 520px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f766e; margin-bottom: 10px; border-bottom: 2px solid #14b8a6; padding-bottom: 6px;">TRID - Trash ID / Grade</div>
      <div style="font-size: 12px; color: #334155; margin-bottom: 10px; line-height: 1.6; font-weight: 600;">Classificação visual de 1 a 7. Baseada principalmente no TrAR.</div>
      <div style="background: #f0fdfa; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #14b8a6;"><div style="font-size: 11px; color: #059669; font-weight: 500;">✓ 1-2: Limpo (Ideal para fios finos)</div></div>
      <div style="background: #fef3c7; padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #f59e0b;"><div style="font-size: 11px; color: #92400e; font-weight: 500;">● 4-5: Aceitável para Denim</div></div>
      <div style="background: #fef2f2; padding: 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #ef4444;"><div style="font-size: 11px; color: #dc2626; font-weight: 500;">✗ 6-7: Muito sujo (Evitar)</div></div>
      <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;"><div style="font-size: 10px; color: #6b7280; line-height: 1.4;">💡 <strong>Aplicação:</strong> TRID 4-5 é aceitável para Denim. Para fios Flame ou finos, buscar TRID 1-2.</div></div>
    </div>
  `
};

const hviTooltips = computed(() =>
  locale.value === 'pt-BR' ? hviTooltipsPT : hviTooltipsES
);

// =====================================================
// =====================================================
// PARÁMETROS HVI INTERNACIONALES PARA CLASIFICACIÓN
// =====================================================
const PARAMETROS_HVI_INTERNACIONAL = {
  // --- Variables de Hilabilidad ---
  SCI:  { min_excelente: 120, min_aceptable: 100, critico: 85 },
  STR:  { min_excelente: 30,  min_aceptable: 27,  critico: 24 }, // g/tex
  SF:   { max_excelente: 7.5, max_aceptable: 11.0, critico: 13.5 }, // %
  UI:   { min_excelente: 83,  min_aceptable: 81,  critico: 79 }, // %
  UHML: { min_excelente: 28.5, min_aceptable: 27.0, critico: 25.5 }, // mm

  // --- Variables de Madurez y Teñido ---
  MIC:  { 
    rango_premium: [3.8, 4.2], 
    rango_aceptable: [3.5, 4.9], 
    descuento_por_madurez: 3.4, // <3.4 Riesgo de neps de teñido
    descuento_por_finura: 5.0    // >5.0 Fibra muy gruesa/tosca
  },
  
  // --- Variables de Color (Daño Climático) ---
  RD:   { min_excelente: 75, min_aceptable: 70, critico: 65 }, // Brillo/Reflectancia
  PLUS_B: { max_excelente: 8.5, max_aceptable: 10.5, critico: 12.0 }, // Amarillez (Daño por calor/hongos)

  // --- Variables de Limpieza ---
  TRAR: { max_excelente: 0.35, max_aceptable: 0.55, critico: 0.80 } // % de Área de basura
};

// =====================================================
// FUNCIONES DE CLASIFICACIÓN HVI
// =====================================================

/**
 * Clasifica un valor "mayor es mejor" (SCI, STR, UI, UHML, RD)
 * Retorna: 'excelente' | 'aceptable' | 'critico' | 'fuera'
 */
function clasificarMayorMejor(valor, params) {
  const v = parseFloat(valor);
  if (isNaN(v)) return 'sin-dato';
  if (v >= params.min_excelente) return 'excelente';
  if (v >= params.min_aceptable) return 'aceptable';
  if (v >= params.critico) return 'critico';
  return 'fuera';
}

/**
 * Clasifica un valor "menor es mejor" (SF, PLUS_B, TRAR)
 * Retorna: 'excelente' | 'aceptable' | 'critico' | 'fuera'
 */
function clasificarMenorMejor(valor, params) {
  const v = parseFloat(valor);
  if (isNaN(v)) return 'sin-dato';
  if (v <= params.max_excelente) return 'excelente';
  if (v <= params.max_aceptable) return 'aceptable';
  if (v <= params.critico) return 'critico';
  return 'fuera';
}

/**
 * Clasifica MIC (dentro de rango es mejor)
 * Retorna: 'premium' | 'aceptable' | 'riesgo-tenido' | 'fibra-gruesa'
 */
function clasificarMIC(valor) {
  const v = parseFloat(valor);
  if (isNaN(v)) return 'sin-dato';
  const p = PARAMETROS_HVI_INTERNACIONAL.MIC;
  
  if (v >= p.rango_premium[0] && v <= p.rango_premium[1]) return 'premium';
  if (v >= p.rango_aceptable[0] && v <= p.rango_aceptable[1]) return 'aceptable';
  if (v < p.descuento_por_madurez) return 'riesgo-tenido';
  if (v > p.descuento_por_finura) return 'fibra-gruesa';
  return 'fuera';
}

/**
 * Evalúa una paca completa y retorna alertas especiales
 */
function evaluarAlertasPaca(row) {
  const alertas = [];
  const str = parseFloat(row.str);
  const sf = parseFloat(row.sf);
  const mic = parseFloat(row.mic);
  const rd = parseFloat(row.rd);
  const sci = parseFloat(row.sci);
  
  // Bandera Roja de Producción: STR o SF críticos (sin importar SCI alto)
  if (!isNaN(str) && str < PARAMETROS_HVI_INTERNACIONAL.STR.critico) {
    alertas.push({ tipo: 'bandera-roja', mensaje: `STR crítico (${str} < ${PARAMETROS_HVI_INTERNACIONAL.STR.critico})` });
  }
  if (!isNaN(sf) && sf > PARAMETROS_HVI_INTERNACIONAL.SF.critico) {
    alertas.push({ tipo: 'bandera-roja', mensaje: `SF crítico (${sf} > ${PARAMETROS_HVI_INTERNACIONAL.SF.critico})` });
  }
  
  // Riesgo de Teñido: MIC fuera del rango aceptable
  if (!isNaN(mic)) {
    const micParams = PARAMETROS_HVI_INTERNACIONAL.MIC;
    if (mic < micParams.rango_aceptable[0] || mic > micParams.rango_aceptable[1]) {
      alertas.push({ tipo: 'riesgo-tenido', mensaje: `MIC fuera de rango (${mic})` });
    }
  }
  
  // Fibra Opaca / Posible daño por humedad: RD < 70
  if (!isNaN(rd) && rd < PARAMETROS_HVI_INTERNACIONAL.RD.min_aceptable) {
    alertas.push({ tipo: 'fibra-opaca', mensaje: `RD bajo (${rd} < 70) - Posible daño por humedad` });
  }
  
  return alertas;
}

/**
 * Obtiene la clase CSS para una celda según su clasificación
 */
function getClaseColor(clasificacion) {
  const clases = {
    'excelente': 'bg-green-100 text-green-800',
    'premium': 'bg-green-100 text-green-800',
    'aceptable': 'bg-yellow-50 text-yellow-800',
    'critico': 'bg-orange-100 text-orange-800',
    'fuera': 'bg-red-100 text-red-800',
    'riesgo-tenido': 'bg-purple-100 text-purple-800',
    'fibra-gruesa': 'bg-orange-100 text-orange-800',
    'sin-dato': 'text-slate-400'
  };
  return clases[clasificacion] || '';
}

/**
 * Clasifica todos los parámetros de una fila
 */
function clasificarFila(row) {
  const P = PARAMETROS_HVI_INTERNACIONAL;
  return {
    sci: clasificarMayorMejor(row.sci, P.SCI),
    str: clasificarMayorMejor(row.str, P.STR),
    sf: clasificarMenorMejor(row.sf, P.SF),
    ui: clasificarMayorMejor(row.ui, P.UI),
    uhml: clasificarMayorMejor(row.uhml, P.UHML),
    mic: clasificarMIC(row.mic),
    rd: clasificarMayorMejor(row.rd, P.RD),
    plusB: clasificarMenorMejor(row.plusB, P.PLUS_B),
    trAr: clasificarMenorMejor(row.trAr, P.TRAR),
    alertas: evaluarAlertasPaca(row)
  };
}

// Helper to map lowercase frontend keys to uppercase backend keys
const toAuditKey = (k) => {
  const map = { 'sci': 'SCI', 'mic': 'MIC', 'mat': 'MAT', 'uhml': 'LEN', 'ui': 'UNF', 'sf': 'SFI', 'str': 'STR', 'elg': 'ELG', 'rd': 'RD', 'plusB': '+b', 'trCnt': 'TRASH' };
  return map[k] || k.toUpperCase();
};

// State
const { t, locale } = useI18n();

const folderPath = ref(localStorage.getItem('hvi_last_folder_path') || '');
const mostrarAnalizador = ref(false);
const mostrarVerificarContrato = ref(false);
const mostrarComparativa = ref(false);
const filesList = ref([]);
const folderInput = ref(null);
const parsedFiles = ref([]);
const hasPersistedHandle = ref(false);

const selectedFileName = ref('');
const selectedFileItem = ref(null);
const hviDetails = ref([]);
const latestParseReport = ref(null);
const filterStatus = ref('No guardados'); // Todos, No guardados, Guardados
const filterStatusOptions = computed(() => [
  { value: 'Todos', label: t('hvi.filters.all') },
  { value: 'No guardados', label: t('hvi.filters.unsaved') },
  { value: 'Guardados', label: t('hvi.filters.saved') },
]);
const detailsHeaderScroller = ref(null);
const detailsBodyScroller = ref(null);

const parseRiskState = computed(() => {
  const report = latestParseReport.value;
  if (!report) {
    return { level: 'normal', badgeText: '', title: '' };
  }

  if (report.skippedRows.length > 0) {
    return {
      level: 'critical',
      badgeText: t('hvi.parseWarnings.badges.critical'),
      title: t('hvi.parseWarnings.badges.criticalTitle', { n: report.skippedRows.length })
    };
  }

  if (report.correctedGradeTokens > 0 || report.fieldWarnings.length > 0) {
    return {
      level: 'warning',
      badgeText: t('hvi.parseWarnings.badges.warning'),
      title: t('hvi.parseWarnings.badges.warningTitle', {
        correctedGrade: report.correctedGradeTokens,
        fieldIssues: report.fieldWarnings.length
      })
    };
  }

  return { level: 'normal', badgeText: '', title: '' };
});

const detailParseIssueRows = computed(() => {
  return hviDetails.value
    .map((row, idx) => ({
      detailRow: idx + 1,
      fardo: row.fardo,
      sourceLine: row._sourceLine,
      fields: row._parseIssues || []
    }))
    .filter((row) => row.fields.length > 0);
});

const scrollToDetailRow = (rowNumber) => {
  const el = document.getElementById(`hvi-detail-row-${rowNumber}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

let isSyncingDetailsScroll = false;

const syncDetailsHeaderScroll = () => {
  if (isSyncingDetailsScroll || !detailsHeaderScroller.value || !detailsBodyScroller.value) return;
  isSyncingDetailsScroll = true;
  detailsBodyScroller.value.scrollLeft = detailsHeaderScroller.value.scrollLeft;
  requestAnimationFrame(() => {
    isSyncingDetailsScroll = false;
  });
};

const syncDetailsBodyScroll = () => {
  if (isSyncingDetailsScroll || !detailsHeaderScroller.value || !detailsBodyScroller.value) return;
  isSyncingDetailsScroll = true;
  detailsHeaderScroller.value.scrollLeft = detailsBodyScroller.value.scrollLeft;
  requestAnimationFrame(() => {
    isSyncingDetailsScroll = false;
  });
};

// Watch for data changes to auto-audit
watch(hviDetails, (newVal) => {
  if (newVal && newVal.length > 0) {
    verificarContrato(false); // Auto-audit, no alerts
  } else {
    auditResult.value = null;
  }
});

// =====================================================
// ESTADOS PARA IA (Gemini 3)
// =====================================================
const aiInsight = ref('');
const selectedModel = ref('gemini-2.0-flash'); // Default rápido y estable
const modelOptions = computed(() => [
  { value: 'gemini-3-pro-preview', label: t('hvi.ai.models.g3pro') },
  { value: 'gemini-3-flash-preview', label: t('hvi.ai.models.g3flash') },
  { value: 'gemini-2.0-flash', label: t('hvi.ai.models.g2flash') },
  { value: 'gemini-2.0-flash-exp', label: t('hvi.ai.models.g2exp') }
]);
const cargandoAI = ref(false);
const mostrarModalAI = ref(false);
const auditResult = ref(null);
const loadingAudit = ref(false);

const verificarContrato = async (isManual = false) => {
  if (!hviDetails.value.length) return;
  
  loadingAudit.value = true;
  auditResult.value = null; // Reset
  
  try {
    const response = await fetch('/api/config/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bales: hviDetails.value.map(b => ({ ...b, LOTE: b.fardo })),
        version_nombre: 'Estándar 2026' // O tomar seleccionada si agregamos selector
      })
    });
    
    const json = await response.json();
    if (json.success) {
      auditResult.value = json.data;
      
      // Feedback visual inmediato si hay rechazo
      if (json.data.overallStatus === 'RECHAZO') {
        const hasDistribFailure = json.data.details.some(d => d.includes('Dispersión Alta'));
        let mensaje = t('hvi.audit.notCompliant');
        
        if (hasDistribFailure) {
            mensaje = t('hvi.audit.mixAlert');
            aiInsight.value = `${mensaje} ${t('hvi.audit.reviewCells')}`;
        } else {
            mensaje = t('hvi.audit.hardCapViolations');
           aiInsight.value = json.data.details.join('\n');
        }

        // Mostrar Swal solo si fue clic manual
        if (isManual === true) { 
             Swal.fire({
               title: t('hvi.audit.rejectedTitle'),
                html: `<div class="text-left text-sm">${json.data.details.map(d => `• ${d}`).join('<br>')}</div>`,
                icon: 'error',
               confirmButtonText: t('hvi.common.understood')
            });
        }
      } else if (json.data.overallStatus === 'ADVERTENCIA') {
          if (isManual === true) {
            Swal.fire({
              title: t('hvi.audit.warningTitle'),
              text: t('hvi.audit.warningText'),
                icon: 'warning'
            });
          }
      } else {
         // Éxito
         if (isManual === true) { 
             Swal.fire({
               title: t('hvi.audit.approvedTitle'),
               text: t('hvi.audit.approvedText'),
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
             });
         }
      }
    }
  } catch (e) {
    console.error("Audit error", e);
    Swal.fire(t('hvi.common.error'), t('hvi.audit.connectionError'), 'error');
  } finally {
    loadingAudit.value = false;
  }
};

const getAuditTooltip = (param) => {
  if (!auditResult.value || !auditResult.value.parameterResults[param]) return null;
  const res = auditResult.value.parameterResults[param];
  let text = `${t('hvi.audit.avgLabel')}: ${res.avg} (${res.status})`;
  if (res.hardCapViolations > 0) text += ` | HARD CAP: ${res.hardCapViolations} ${t('hvi.audit.bales')}`;
  if (res.distribution && res.distribution.outliersPct > 0) {
    text += ` | ${t('hvi.audit.outOfRange')}: ${res.distribution.outliersPct}%`;
  }
  return text;
};

const getAuditClass = (param, originalClass) => {
  if (!auditResult.value || !auditResult.value.parameterResults[param]) return originalClass;
  const status = auditResult.value.parameterResults[param].status;
  if (status === 'RECHAZO') return 'bg-red-600 text-white font-black animate-pulse'; // Carmesí fuerte
  if (status === 'ADVERTENCIA') return 'bg-amber-100 text-amber-800';
  return originalClass;
};

// Check if specific cell failed audit
const isBaleFailed = (rowId, param) => {
  if (!auditResult.value) return false;
  const pRes = auditResult.value.parameterResults[param];
  if (!pRes || !pRes.failedBales) return false;
  // Match rowId (string/int loose check)
  return pRes.failedBales.some(fb => fb.id == rowId);
};

const solicitarAnalisisAI = async () => {
  if (!selectedFileItem.value || !hviDetails.value.length) {
    Swal.fire({
      icon: 'warning',
      title: t('hvi.ai.selectFileTitle'),
      text: t('hvi.ai.selectFileText')
    });
    return;
  }
  
  cargandoAI.value = true;
  mostrarModalAI.value = true;
  aiInsight.value = '';

  try {
    const lote = selectedFileItem.value.loteEntrada;
    const archivosDelLote = parsedFiles.value
      .filter(f => f.loteEntrada === lote)
      .map(f => f.tipo);

    const response = await fetch('/api/hvi/predecir-hilatura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel.value,
        lote,
        proveedor: selectedFileItem.value.proveedor,
        pacas: hviDetails.value,
        metadata: {
          grado: selectedFileItem.value.grado,
          tipo: selectedFileItem.value.tipo
        },
        contexto: archivosDelLote
      })
    });

    const data = await response.json();
    if (data.success) {
      aiInsight.value = data.insight;
    } else {
      aiInsight.value = "Error en el análisis: " + (data.error || "Respuesta inválida");
    }
  } catch (err) {
    console.error("Error al conectar con IA:", err);
    aiInsight.value = "Error crítico al conectar con el servidor de análisis Gemini 3.";
  } finally {
    cargandoAI.value = false;
  }
};

// Propiedad computada para filtrar la lista de archivos
const filteredFiles = computed(() => {
  if (filterStatus.value === 'Todos') return parsedFiles.value;
  if (filterStatus.value === 'Guardados') {
    return parsedFiles.value.filter(f => f.estado === 'Procesado');
  }
  if (filterStatus.value === 'No guardados') {
    return parsedFiles.value.filter(f => f.estado === 'Pendiente');
  }
  return parsedFiles.value;
});

// Propiedad computada para calcular los promedios
const hviAverages = computed(() => {
  if (!hviDetails.value.length) return {};
  
  const keys = ['sci', 'mst', 'mic', 'mat', 'uhml', 'ui', 'sf', 'str', 'elg', 'rd', 'plusB', 'tipo', 'trCnt', 'trAr', 'trid'];
  const sums = {};
  keys.forEach(k => sums[k] = 0);
  
  let validCounts = {};
  keys.forEach(k => validCounts[k] = 0);

  hviDetails.value.forEach(row => {
    keys.forEach(k => {
      const val = parseFloat(row[k]);
      if (!isNaN(val)) {
        sums[k] += val;
        validCounts[k]++;
      }
    });
  });

  const averages = {};
  keys.forEach(k => {
    if (validCounts[k] > 0) {
      const avg = sums[k] / validCounts[k];
      
      // Ajustar precisión según el tipo de campo
      let precision = 2;
      if (['sci', 'mst', 'tipo'].includes(k)) precision = 1;
      if (['trCnt', 'trid'].includes(k)) precision = 0;

      // Para 'tipo' mostramos punto como solicitó el usuario, para el resto seguimos con coma
      if (k === 'tipo') {
        averages[k] = avg.toFixed(precision);
      } else {
        averages[k] = avg.toFixed(precision).replace('.', ',');
      }
    } else {
      averages[k] = '-';
    }
  });
  
  return averages;
});

// Computed que resume las alertas de todas las pacas
const resumenAlertas = computed(() => {
  if (!hviDetails.value.length) return { total: 0, banderaRoja: 0, riesgoTenido: 0, fibraOpaca: 0 };
  
  let banderaRoja = 0;
  let riesgoTenido = 0;
  let fibraOpaca = 0;
  
  hviDetails.value.forEach(row => {
    const alertas = evaluarAlertasPaca(row);
    if (alertas.some(a => a.tipo === 'bandera-roja')) banderaRoja++;
    if (alertas.some(a => a.tipo === 'riesgo-tenido')) riesgoTenido++;
    if (alertas.some(a => a.tipo === 'fibra-opaca')) fibraOpaca++;
  });
  
  return {
    total: banderaRoja + riesgoTenido + fibraOpaca,
    banderaRoja,
    riesgoTenido,
    fibraOpaca
  };
});

// Computed
const counts = computed(() => {
  const total = parsedFiles.value.length;
  const ent = parsedFiles.value.filter(f => f.tipo === 'Ent').length;
  return { total, ent };
});

// IndexedDB helpers for DirectoryHandle persistence
function openDb() {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open('carga-hvi', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDirHandle(handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    const store = tx.objectStore('handles');
    const r = store.put(handle, 'dir');
    r.onsuccess = () => resolve(true);
    r.onerror = () => reject(r.error);
  });
}

async function getDirHandle() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly');
    const store = tx.objectStore('handles');
    const r = store.get('dir');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function verifyPermission(handle) {
  if (!handle) return false;
  try {
    if (await handle.queryPermission({ mode: 'read' }) === 'granted') return true;
    if (await handle.requestPermission({ mode: 'read' }) === 'granted') return true;
  } catch (err) {
    console.warn('verifyPermission error', err);
  }
  return false;
}

// Methods
const saveFolderPath = () => {
  localStorage.setItem('hvi_last_folder_path', folderPath.value);
};

const triggerFolderSelector = async () => {
  // Use File System Access API if available
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await window.showDirectoryPicker();
      await saveDirHandle(handle);
      hasPersistedHandle.value = true;
      folderPath.value = handle.name;
      saveFolderPath();
      await scanDirectory(handle);
      return;
    } catch (err) {
      console.warn('showDirectoryPicker error or cancelled', err);
    }
  }

  // Fallback to hidden input
  if (folderInput.value) {
    folderInput.value.click();
  }
};

async function scanDirectory(dirHandle) {
  const results = [];
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && name.toLowerCase().endsWith('.txt')) {
        results.push(parseFileName(name, handle));
      }
    }
    
    // Verificar estado en la DB antes de mostrar
    if (results.length > 0) {
      try {
        const response = await fetch('/api/hvi/check-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileNames: results.map(f => f.fileName) })
        });
        const result = await response.json();
        if (result.success) {
          // Marcar procesados
          results.forEach(f => {
            if (result.existingNames.includes(f.fileName)) {
              f.estado = 'Procesado';
            }
          });

          // Traer metadatos guardados para los archivos procesados y mezclarlos
          if (result.existingNames.length > 0) {
            try {
              const metaResp = await fetch('/api/hvi/get-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileNames: result.existingNames })
              });
              const metaJson = await metaResp.json();
              if (metaJson.success && metaJson.metadata) {
                      // aplicar metadata a los resultados de forma segura
                      results.forEach(f => {
                        const m = metaJson.metadata[f.fileName];
                        if (m) {
                          if (m.muestra !== undefined && m.muestra !== null) f.muestra = m.muestra;
                          if (m.cantidad !== undefined && m.cantidad !== null) f.cantidad = m.cantidad;
                          if (m.color !== undefined && m.color !== null) f.color = m.color;
                          if (m.cort !== undefined && m.cort !== null) f.cort = m.cort;
                          if (m.obs !== undefined && m.obs !== null) f.obs = m.obs;
                          // normalizar cabecera
                          if (m.tipo !== undefined && m.tipo !== null) f.tipo = m.tipo;
                          if (m.loteEntrada !== undefined && m.loteEntrada !== null) f.loteEntrada = m.loteEntrada;
                          else if (m.lote !== undefined && m.lote !== null) f.loteEntrada = m.lote;
                          if (m.proveedor !== undefined && m.proveedor !== null) f.proveedor = m.proveedor;
                          if (m.grado !== undefined && m.grado !== null) f.grado = m.grado;
                          if (m.fecha !== undefined && m.fecha !== null) f.fecha = m.fecha;
                        }
                      });
              }
            } catch (err) {
              console.warn('Error fetching HVI metadata:', err);
            }
          }
        }
      } catch (err) {
        console.warn('Error checking files status:', err);
      }
    }

    // Merge: enriquecer items ya cargados desde BD con el handle del folder,
    // y agregar los archivos del folder que no estén en parsedFiles
    const existingMap = new Map(parsedFiles.value.map(f => [f.fileName, f]));
    results.forEach(r => {
      if (existingMap.has(r.fileName)) {
        // Enriquecer con handle y estado actualizado
        const existing = existingMap.get(r.fileName);
        existing.handle = r.handle;
        existing.file = r.file;
        if (r.estado === 'Procesado') existing.estado = 'Procesado';
      } else {
        parsedFiles.value.push(r);
      }
    });
    filesList.value = parsedFiles.value.filter(f => f.handle || f.file);
  } catch (err) {
    console.error('Error scanning directory', err);
  }
}

async function refreshFolder() {
  try {
    const handle = await getDirHandle();
    if (!handle) return;
    const ok = await verifyPermission(handle);
    if (ok) {
      await scanDirectory(handle);
    }
  } catch (err) {
    console.warn('refreshFolder error', err);
  }
}

const handleFolderChange = async (event) => {
  const selectedFiles = Array.from(event.target.files);
  const txtFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.txt'));
  
  // Parse names for the table
  const results = txtFiles.map(file => parseFileName(file.name, null, file));

  // Verificar estado en la DB antes de mostrar
  if (results.length > 0) {
    try {
      const response = await fetch('/api/hvi/check-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNames: results.map(f => f.fileName) })
      });
      const result = await response.json();
      if (result.success) {
        // Marcar procesados
        results.forEach(f => {
          if (result.existingNames.includes(f.fileName)) {
            f.estado = 'Procesado';
          }
        });

        // Traer metadatos guardados y mezclarlos
        if (result.existingNames.length > 0) {
          try {
            const metaResp = await fetch('/api/hvi/get-metadata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileNames: result.existingNames })
            });
            const metaJson = await metaResp.json();
            if (metaJson.success && metaJson.metadata) {
              results.forEach(f => {
                const m = metaJson.metadata[f.fileName];
                if (m) {
                  if (m.muestra !== undefined && m.muestra !== null) f.muestra = m.muestra;
                  if (m.cantidad !== undefined && m.cantidad !== null) f.cantidad = m.cantidad;
                  if (m.color !== undefined && m.color !== null) f.color = m.color;
                  if (m.cort !== undefined && m.cort !== null) f.cort = m.cort;
                  if (m.obs !== undefined && m.obs !== null) f.obs = m.obs;
                }
              });
            }
          } catch (err) {
            console.warn('Error fetching HVI metadata:', err);
          }
        }
      }
    } catch (err) {
      console.warn('Error checking files status:', err);
    }
  }

  parsedFiles.value = results;
  filesList.value = results;

  // Intentar extraer el nombre de la carpeta si es posible
  if (txtFiles.length > 0 && txtFiles[0].webkitRelativePath) {
    const parts = txtFiles[0].webkitRelativePath.split('/');
    if (parts.length > 1) {
      folderPath.value = parts[0];
      saveFolderPath();
    }
  }
};

const parseFileName = (fileName, handle = null, file = null) => {
  // Formato esperado: Tipo_Lote_Proveedor_Grado_Fecha.txt
  // Ejemplo: Ent_616_CARAM_C-1-2_21-01-2026.txt
  
  // 1. Quitar extension
  const nameOnly = fileName.replace(/\.txt$/i, "");
  
  // 2. Separar por guiones bajos
  const parts = nameOnly.split('_');
  
  // 3. Extraer según lógica solicitada
  // Tipo: 3 primeras letras (o parte 0) - Normalizar a Título (Ent, Mue)
  let rawTipo = parts[0] ? parts[0].substring(0, 3).toLowerCase() : "???";
  const tipo = rawTipo === 'ent' ? 'Ent' : (rawTipo === 'mue' ? 'Mue' : parts[0]);
  
  // Lote/Entrada: desde el cuarto carácter hasta que aparece un _ (o parte 1)
  const loteEntrada = parts[1] || "";
  
  // Proveedor: desde el segundo _ hasta el proximo _ (parte 2)
  const proveedor = parts[2] || "";
  
  // Lógica revisada para manejar guiones bajos variables en Grado y Fecha
  // El Grado puede tener múltiples segmentos (ej: C_1-2) y la Fecha es el último segmento
  let grado = "";
  let fecha = "";

  if (parts.length > 3) {
    // La fecha es siempre el último segmento del nombre
    fecha = parts[parts.length - 1];
    
    // El grado es todo lo que está entre el proveedor (index 2) y la fecha (el último)
    // Unimos con "-" para cumplir con el formato solicitado (C-1-2)
    let rawGrado = parts.slice(3, -1).join('-');
    
    // Transformar formatos como C-1-2 a C 1/2, D-1-4 a D 1/4, etc.
    // Buscamos el patrón: Letra-Número-Número
    grado = rawGrado.replace(/^([A-Z])-(\d)-(\d)$/, '$1 $2/$3');
  }

  return {
    id: null,
    fileName,
    handle,
    file,
    tipo,
    loteEntrada,
    proveedor,
    grado,
    fecha,
    muestra: "", // Input para el usuario
    cantidad: "", // Cantidad (Nuevo)
    color: "",    // Color (Nuevo)
    cort: "",     // Cort (Nuevo)
    obs: "",      // Observaciones (Nuevo)
    estado: "Pendiente"
  };
};

const selectFile = async (item) => {
  selectedFileName.value = item.fileName;
  selectedFileItem.value = item;
  hviDetails.value = [];
  latestParseReport.value = null;

  try {
    let content = '';
    if (item.handle) {
      // From File System Access API
      const file = await item.handle.getFile();
      content = await file.text();
    } else if (item.file) {
      // From fallback input
      content = await item.file.text();
    }
    
    if (content) {
      const parseReport = parseHviDetails(content);
      latestParseReport.value = parseReport;

      if (parseReport.hasCriticalWarnings) {
        const buildListItems = (arr, formatter) => arr.map(formatter).join('');
        const escapeHtml = (value) => String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        const skippedHtml = parseReport.skippedRows.length
          ? `
            <div style="margin-top:8px;text-align:left;">
              <div style="font-weight:600;margin-bottom:4px;">${t('hvi.parseWarnings.skippedRowsLabel')}</div>
              <ul style="margin:0;padding-left:18px;max-height:180px;overflow:auto;">
                ${buildListItems(parseReport.skippedRows, (row) => `<li>L${row.line}: ${escapeHtml(row.reason)}</li>`) }
              </ul>
            </div>
          `
          : '';

        const fieldHtml = parseReport.fieldWarnings.length
          ? `
            <div style="margin-top:8px;text-align:left;">
              <div style="font-weight:600;margin-bottom:4px;">${t('hvi.parseWarnings.invalidFieldsLabel')}</div>
              <ul style="margin:0;padding-left:18px;max-height:180px;overflow:auto;">
                ${buildListItems(parseReport.fieldWarnings, (row) => `<li>L${row.line} · ${escapeHtml(row.fardo || '-')}: ${escapeHtml(row.fields.join(', '))}</li>`) }
              </ul>
            </div>
          `
          : '';

        Swal.fire({
          icon: 'warning',
          title: t('hvi.parseWarnings.title'),
          html: `
            <div style="text-align:left;line-height:1.45;">
              <p style="margin:0 0 6px 0;">${t('hvi.parseWarnings.summary', {
                parsed: parseReport.parsedRows,
                skipped: parseReport.skippedRows.length,
                correctedGrade: parseReport.correctedGradeTokens,
                fieldIssues: parseReport.fieldWarnings.length
              })}</p>
              ${skippedHtml}
              ${fieldHtml}
            </div>
          `,
          confirmButtonText: t('hvi.common.understood')
        });
      }
      
      // Para TIPO "Ent", autocompletar la cantidad con el número de fardos encontrados
      if (item.tipo === 'Ent' && hviDetails.value.length > 0) {
        item.cantidad = hviDetails.value.length;
      }
    } else {
      latestParseReport.value = null;
      // Sin archivo local: intentar cargar detalles desde la BD
      try {
        const resp = await fetch('/api/hvi/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: item.fileName })
        });
        const json = await resp.json();
        if (json.success && json.details.length > 0) {
          hviDetails.value = json.details.map(d => ({
            ...d,
            sci:  d.sci  !== null ? String(d.sci)  : '',
            mst:  d.mst  !== null ? String(d.mst)  : '',
            mic:  d.mic  !== null ? String(d.mic)  : '',
            mat:  d.mat  !== null ? String(d.mat)  : '',
            uhml: d.uhml !== null ? String(d.uhml) : '',
            ui:   d.ui   !== null ? String(d.ui)   : '',
            sf:   d.sf   !== null ? String(d.sf)   : '',
            str:  d.str  !== null ? String(d.str)  : '',
            elg:  d.elg  !== null ? String(d.elg)  : '',
            rd:   d.rd   !== null ? String(d.rd)   : '',
            plusB: d.plusB !== null ? String(d.plusB) : '',
            trCnt: d.trCnt !== null ? String(d.trCnt) : '',
            trAr:  d.trAr  !== null ? String(d.trAr)  : '',
            trid:  d.trid  !== null ? String(d.trid)  : '',
          }));
        }
      } catch (e) {
        console.error('Error cargando detalles HVI desde BD:', e);
      }
    }
  } catch (err) {
    latestParseReport.value = null;
    console.error('Error reading HVI file', err);
  }
};

const handleSaveFromRow = async (item) => {
  if (selectedFileName.value !== item.fileName) {
    await selectFile(item);
  }
  processFiles();
};

const handleEditFromRow = (item) => {
  // Simplemente selecciona la fila para permitir editar los campos en la tabla
  if (selectedFileName.value !== item.fileName) {
    selectFile(item);
  }
};

const handleDeleteFromRow = async (item) => {
  const confirm = await Swal.fire({
    icon: 'warning',
    title: t('hvi.delete.confirmTitle'),
    text: t('hvi.delete.confirmText', {
      tipo: item.tipo || '-',
      lote: item.loteEntrada || '-',
      proveedor: item.proveedor || '-'
    }),
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    confirmButtonText: t('hvi.delete.confirmButton'),
    cancelButtonText: t('hvi.delete.cancelButton')
  });

  if (!confirm.isConfirmed) return;

  try {
    if (item.estado === 'Procesado' && item.id) {
      const resp = await fetch(`/api/hvi/saved/${item.id}`, { method: 'DELETE' });
      const json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || t('hvi.delete.error'));
      }
    }

    parsedFiles.value = parsedFiles.value.filter(f => f.fileName !== item.fileName);
    filesList.value = filesList.value.filter(f => f.fileName !== item.fileName);

    if (selectedFileName.value === item.fileName) {
      selectedFileName.value = '';
      selectedFileItem.value = null;
      hviDetails.value = [];
      latestParseReport.value = null;
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: t('hvi.delete.success'),
      showConfirmButton: false,
      timer: 2500
    });
  } catch (err) {
    console.error('Error deleting HVI record:', err);
    Swal.fire({
      icon: 'error',
      title: t('hvi.delete.errorTitle'),
      text: err.message || t('hvi.delete.error')
    });
  }
};

const parseHviDetails = (content) => {
  const lines = content.split('\n');
  const detailRows = [];
  const isStrictNumber = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? '').trim());
  const isLikelyBaleId = (v) => /^\d+$/.test(String(v ?? '').trim());
  const report = {
    parsedRows: 0,
    correctedGradeTokens: 0,
    skippedRows: [],
    fieldWarnings: [],
    hasCriticalWarnings: false,
    hasWarnings: false
  };

  const addSkippedRow = (line, reason) => {
    report.skippedRows.push({ line, reason });
  };

  const numericFieldMap = [
    { idx: 1, key: 'SCI' },
    { idx: 2, key: 'MST' },
    { idx: 3, key: 'MIC' },
    { idx: 4, key: 'MAT' },
    { idx: 5, key: 'UHML' },
    { idx: 6, key: 'UI' },
    { idx: 7, key: 'SF' },
    { idx: 8, key: 'STR' },
    { idx: 9, key: 'ELG' },
    { idx: 10, key: 'RD' },
    { idx: 11, key: '+b' },
    { idx: 13, key: 'TrCNT' },
    { idx: 14, key: 'TrAR' },
    { idx: 15, key: 'TRID' }
  ];
  
  // Las informaciones empiezan en la fila 14 (index 13)
  for (let i = 13; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i].trim();
    if (!line) continue;
    
    // Separado por Espacio (múltiples espacios tratados como uno)
    const rawColumns = line.split(/\s+/);
    const columns = [...rawColumns];
    
    // Criterio de validación: Ignorar filas de resumen tipo "Average" o "Q99%"
    // Y detenerse si encontramos 'n' en la primera columna (columna 1 según el usuario)
    const firstCol = columns[0] ? columns[0].toLowerCase() : '';
    
    // Criterio de parada: letra 'n' en la primera columna (marca el inicio de estadísticas)
    if (firstCol === 'n') {
      break;
    }
    
    // Filtrar filas de resumen y encabezados repetidos
    if (firstCol.includes('average') || firstCol.includes('q99%') || firstCol === '+/-' || firstCol === 'bale') {
      continue;
    }

    // Solo validar errores en filas que realmente parecen datos HVI (fardo numérico).
    // Evita falsos positivos en líneas de formato/encabezados del TXT.
    if (!isLikelyBaleId(columns[0])) {
      continue;
    }

    // USTER HVI puede traer un valor "intruso" en Grade (entre SCI y Mst), por ejemplo ".".
    // Si el token después de SCI no es numérico y el siguiente sí lo es, lo descartamos.
    if (columns.length >= 4 && !isStrictNumber(columns[2]) && isStrictNumber(columns[3])) {
      report.correctedGradeTokens += 1;
      columns.splice(2, 1);
    }

    // Criterio de limpieza profunda: La segunda columna (ID/SCI) debe ser un número válido
    const secondColVal = columns[1];
    if (!secondColVal || isNaN(parseFloat(secondColVal))) {
      addSkippedRow(lineNumber, t('hvi.parseWarnings.reasons.invalidSCI'));
      continue;
    }

    // Validación mínima de alineación tras saneamiento (Mst debe ser numérico)
    if (!isStrictNumber(columns[2])) {
      addSkippedRow(lineNumber, t('hvi.parseWarnings.reasons.invalidMSTAfterGrade'));
      continue;
    }

    if (columns.length < 16) {
      addSkippedRow(lineNumber, t('hvi.parseWarnings.reasons.notEnoughColumns', { n: columns.length }));
      continue;
    }

    const invalidFields = numericFieldMap
      .filter(({ idx }) => !isStrictNumber(columns[idx]))
      .map(({ key }) => key);

    if (invalidFields.length > 0) {
      report.fieldWarnings.push({
        line: lineNumber,
        fardo: columns[0],
        fields: invalidFields
      });
    }
    
    // El usuario solicita que en la columna TIPO (grado de color) se cambie el "-" por "."
    // internamente para cálculos, aunque se muestre con coma en la tabla.
    const tipoFormateado = columns[12] ? columns[12].replace('-', '.') : '';
    
    detailRows.push({
      fardo: columns[0],
      sci: columns[1],
      mst: columns[2],
      mic: columns[3],
      mat: columns[4],
      uhml: columns[5],
      ui: columns[6],
      sf: columns[7],
      str: columns[8],
      elg: columns[9],
      rd: columns[10],
      plusB: columns[11], // Corresponde a PLUS_B en DB
      tipo: tipoFormateado,
      trCnt: columns[13],
      trAr: columns[14],
      trid: columns[15],
      _sourceLine: lineNumber,
      _parseIssues: invalidFields
    });
  }

  report.parsedRows = detailRows.length;
  report.hasCriticalWarnings = report.skippedRows.length > 0 || report.fieldWarnings.length > 0;
  report.hasWarnings = report.correctedGradeTokens > 0 || report.skippedRows.length > 0 || report.fieldWarnings.length > 0;
  hviDetails.value = detailRows;
  return report;
};

// -----------------------------------------------------
// Exportar a Excel
// -----------------------------------------------------
const exportarExcel = async () => {
  if (hviDetails.value.length === 0) {
    Swal.fire({
      icon: 'info',
      title: t('hvi.export.noDataTitle'),
      text: t('hvi.export.noDataText')
    });
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos HVI');

    // Configurar columnas con los nombres de la interfaz
    worksheet.columns = [
      { header: 'Fardo', key: 'fardo', width: 14 },
      { header: 'SCI', key: 'sci', width: 8 },
      { header: 'MST', key: 'mst', width: 8 },
      { header: 'MIC', key: 'mic', width: 8 },
      { header: 'MAT', key: 'mat', width: 8 },
      { header: 'UHML', key: 'uhml', width: 8 },
      { header: 'UI', key: 'ui', width: 8 },
      { header: 'SF', key: 'sf', width: 8 },
      { header: 'STR', key: 'str', width: 8 },
      { header: 'ELG', key: 'elg', width: 8 },
      { header: 'Rd', key: 'rd', width: 8 },
      { header: '+b', key: 'plusB', width: 8 },
      { header: 'TIPO', key: 'tipo', width: 10 },
      { header: 'TrCnt', key: 'trCnt', width: 8 },
      { header: 'TrAr', key: 'trAr', width: 8 },
      { header: 'TrID', key: 'trid', width: 8 },
    ];

    // Datos
    hviDetails.value.forEach(row => {
      worksheet.addRow({
        fardo: row.fardo,
        sci: parseFloat(row.sci) || 0,
        mst: parseFloat(row.mst) || 0,
        mic: parseFloat(row.mic) || 0,
        mat: parseFloat(row.mat) || 0,
        uhml: parseFloat(row.uhml) || 0,
        ui: parseFloat(row.ui) || 0,
        sf: parseFloat(row.sf) || 0,
        str: parseFloat(row.str) || 0,
        elg: parseFloat(row.elg) || 0,
        rd: parseFloat(row.rd) || 0,
        plusB: parseFloat(row.plusB) || 0,
        tipo: row.tipo, // String usually
        trCnt: parseFloat(row.trCnt) || 0,
        trAr: parseFloat(row.trAr) || 0,
        trid: parseFloat(row.trid) || 0
      });
    });

    // Estilo de Cabecera (Azul Oscuro, Texto Blanco)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // slate-800 equivalent
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Estilo de datos (Bordes y Centrado)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Formato condicional simple (ejemplo: alternar gris claro)
        if (rowNumber % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' } // slate-50
          };
        }
      });
    });

    // Generar Buffer y Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Crear link temporal
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `HVI_Export_${selectedFileName.value || 'data'}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: t('hvi.export.success'),
      showConfirmButton: false,
      timer: 2000
    });

  } catch (error) {
    console.error('Error exportando Excel:', error);
    Swal.fire({
      icon: 'error',
      title: t('hvi.common.error'),
      text: t('hvi.export.error')
    });
  }
};

const processFiles = async () => {
  if (!selectedFileItem.value || hviDetails.value.length === 0) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: t('hvi.validation.selectFileWithData'),
      showConfirmButton: false,
      timer: 3000
    });
    return;
  }

  // Validación de Color
  if (!selectedFileItem.value.color) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: t('hvi.validation.selectColor'),
      showConfirmButton: false,
      timer: 3000
    });
    return;
  }

  // Validación de Cort (solo para Ent)
  if (selectedFileItem.value.tipo !== 'Mue' && !selectedFileItem.value.cort) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: t('hvi.validation.selectCut'),
      showConfirmButton: false,
      timer: 3000
    });
    return;
  }

  // Validación de cantidad para muestras
  if (selectedFileItem.value.tipo === 'Mue' && (!selectedFileItem.value.cantidad || selectedFileItem.value.cantidad <= 0)) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: t('hvi.validation.enterSampleQty'),
      showConfirmButton: false,
      timer: 3000
    });
    return;
  }

  // Guardia de seguridad: evitar guardar cuando el parseo descartó filas.
  // Este escenario es crítico porque puede dejar el ensayo incompleto en BD.
  if (latestParseReport.value && latestParseReport.value.skippedRows.length > 0) {
    Swal.fire({
      icon: 'error',
      title: t('hvi.save.parseCriticalTitle'),
      html: `<div style="text-align:left;line-height:1.45;">
        <p>${t('hvi.save.parseCriticalText', {
          skipped: latestParseReport.value.skippedRows.length,
          parsed: latestParseReport.value.parsedRows
        })}</p>
      </div>`,
      confirmButtonText: t('hvi.common.understood')
    });
    return;
  }

  // Advertencia de riesgo: permitir continuar solo con confirmación explícita.
  // Aplica cuando hubo correcciones automáticas en Grade o campos no numéricos detectados.
  if (
    latestParseReport.value &&
    (latestParseReport.value.correctedGradeTokens > 0 || latestParseReport.value.fieldWarnings.length > 0)
  ) {
    const riskConfirm = await Swal.fire({
      icon: 'warning',
      title: t('hvi.save.parseRiskTitle'),
      html: `<div style="text-align:left;line-height:1.45;">
        <p>${t('hvi.save.parseRiskText', {
          correctedGrade: latestParseReport.value.correctedGradeTokens,
          fieldIssues: latestParseReport.value.fieldWarnings.length
        })}</p>
      </div>`,
      showCancelButton: true,
      confirmButtonText: t('hvi.save.parseRiskConfirm'),
      cancelButtonText: t('hvi.save.parseRiskCancel'),
      confirmButtonColor: '#b45309'
    });

    if (!riskConfirm.isConfirmed) {
      return;
    }
  }

  // Toast de "Guardando..."
  const loadingToast = Swal.fire({
    title: t('hvi.save.savingTitle'),
    html: t('hvi.save.pleaseWait'),
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const payload = {
      files: [
        {
          metadata: {
            fileName: selectedFileItem.value.fileName,
            tipo: selectedFileItem.value.tipo,
            loteEntrada: selectedFileItem.value.loteEntrada,
            proveedor: selectedFileItem.value.proveedor,
            grado: selectedFileItem.value.grado,
            fecha: selectedFileItem.value.fecha,
            muestra: selectedFileItem.value.muestra,
            cantidad: selectedFileItem.value.cantidad,
            color: selectedFileItem.value.color,
            cort: selectedFileItem.value.cort || null,
            obs: selectedFileItem.value.obs
          },
          details: hviDetails.value
        }
      ]
    };

    const response = await fetch('/api/hvi/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    // Cerrar loading
    Swal.close();

    if (result.success) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: t('hvi.save.success'),
        showConfirmButton: false,
        timer: 3000
      });
      selectedFileItem.value.estado = "Procesado";

      // Si no quedan archivos en la tabla 1 o todos están procesados,
      // limpiar la selección y los detalles (tabla 2) para que no persistan.
      const allProcessed = parsedFiles.value.length === 0 || parsedFiles.value.every(f => f.estado === 'Procesado');
      if (allProcessed) {
        selectedFileName.value = '';
        selectedFileItem.value = null;
        hviDetails.value = [];
        latestParseReport.value = null;
      }
    } else {
      Swal.fire({
        icon: 'error',
        title: t('hvi.save.errorTitle'),
        text: result.error
      });
    }
  } catch (err) {
    Swal.close();
    console.error("Error en processFiles:", err);
    Swal.fire({
      icon: 'error',
      title: t('hvi.save.connectionErrorTitle'),
      text: t('hvi.save.connectionErrorText')
    });
  }
};

onMounted(async () => {
  // 1. Cargar ensayos guardados en la BD
  try {
    const resp = await fetch('/api/hvi/saved');
    const json = await resp.json();
    if (json.success && json.data.length > 0) {
      const savedItems = json.data.map(r => ({
        id: r.id,
        fileName: r.archivo_fuente,
        handle: null,
        file: null,
        tipo: r.tipo || '',
        loteEntrada: r.lote || '',
        proveedor: r.proveedor || '',
        grado: r.grado || '',
        fecha: r.fecha || '',
        muestra: r.muestra || '',
        cantidad: r.cantidad || '',
        color: r.color || '',
        cort: r.cort || '',
        obs: r.obs || '',
        estado: 'Procesado'
      }));
      parsedFiles.value = savedItems;
    }
  } catch (e) {
    console.warn('No se pudieron cargar guardados desde BD:', e);
  }

  // 2. Restaurar carpeta persistida y escanear (enriquece con handles)
  try {
    const handle = await getDirHandle();
    if (handle) {
      hasPersistedHandle.value = true;
      console.log('Carpeta persistida encontrada:', handle.name);
      folderPath.value = handle.name;
      
      // Verificar permisos y escanear automáticamente
      const ok = await verifyPermission(handle);
      if (ok) {
        await scanDirectory(handle);
      }
    }
  } catch (err) {
    console.warn('onMounted getDirHandle error', err);
  }
});
</script>

<style scoped>
/* Estilos para quitar los spinners de los inputs de tipo number */
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.no-spinner {
  -moz-appearance: textfield;
  appearance: textfield;
}

.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.overflow-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.overflow-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

</style>
