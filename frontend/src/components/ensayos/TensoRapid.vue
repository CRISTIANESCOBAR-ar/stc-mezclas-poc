<template>
	<!-- Mensaje móvil: deshabilitado en pantallas pequeñas -->
	<div class="md:hidden p-4">
		<div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 text-sm">
			Esta página de carga (TensoRapid) está disponible solo en escritorio (pantallas medianas o mayores).
		</div>
	</div>
	<div class="hidden md:flex w-full h-screen flex-col p-1 tenso-component">
		<main
			:class="{ 'tenso-empty-workspace': !filteredTensoItems.length }"
			class="w-full flex-1 min-h-0 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-200 flex flex-col overflow-y-auto tenso-workspace">
			<!-- Selector de carpeta (con título principal delante) -->
			<div class="shrink-0 mb-3 flex items-center gap-3 tenso-toolbar">
				<div class="text-2xl font-semibold text-slate-800 inline-flex items-center gap-2 tenso-toolbar-title">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
					</svg>
					<span>Datos TensoRapid</span>
				</div>
				<label class="text-sm font-semibold text-slate-700 shrink-0 tenso-toolbar-label">Carpeta TensoRapid:</label>
				<div class="min-w-0 flex-1 tenso-toolbar-path">
					<div class="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-800 truncate"
						v-tippy="{content:tensoFolderPathFull,allowHTML:false,theme:'light'}">
						{{ tensoFolderPathFull || (initialLoadBannerState === 'checking-folder' ? 'Comprobando carpeta recordada...' : 'Ninguna carpeta seleccionada') }}
					</div>
				</div>
				<div class="flex items-center gap-2 shrink-0 tenso-toolbar-actions">
					<button :disabled="initialLoadBannerState === 'checking-folder' || isScanning || isSaving" @click="selectTensoFolder" aria-label="Seleccionar carpeta TensoRapid" v-tippy="{content:'Seleccionar carpeta TensoRapid',theme:'light'}"
						class="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
							stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M3 7a2 2 0 012-2h3l2 3h6a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
						</svg>
						<span class="tenso-action-label">Seleccionar</span>
					</button>
					<button :disabled="isScanning || isSaving" @click="refreshTensoFolder" aria-label="Actualizar carpeta TensoRapid" v-tippy="{content:'Actualizar archivos y estado de guardados',theme:'light'}"
						class="inline-flex items-center gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
							stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span class="tenso-action-label">Actualizar</span>
					</button>
					<input ref="tensoFolderInputLocal" type="file" webkitdirectory directory multiple class="hidden"
						@change="onTensoFolderInputChangeLocal" />
				</div>
			</div>

			<!-- Avisos flotantes fuera del flujo de tablas -->
      <Teleport to="body">
        <div class="fixed bottom-4 right-4 z-[150] max-w-[min(360px,calc(100vw-2rem))] pointer-events-none text-sm">
          <div v-if="loadError" role="alert" class="pointer-events-auto flex gap-3 rounded-xl border border-red-400 bg-red-950 p-4 text-white shadow-2xl ring-2 ring-white/80">
            <ExclamationTriangleIcon class="h-6 w-6 shrink-0 text-red-300" aria-hidden="true"/><div><p class="font-semibold">No se pudo completar la operación</p><p class="mt-1 text-xs">{{loadError}}</p><button @click="loadError='';loadTensoTestFiles(selectedTensoTestnr)" v-tippy="{content:'Recuperar nuevamente el ensayo seleccionado',theme:'light'}" class="mt-2 underline">Reintentar carga</button></div>
          </div>
          <div v-else-if="isLoadingSaved" role="status" class="flex gap-3 rounded-xl border border-blue-300 bg-blue-100 p-4 text-blue-900 shadow-2xl ring-2 ring-white/80">
            <ArrowPathIcon class="h-6 w-6 shrink-0 animate-spin motion-reduce:animate-none text-blue-600" aria-hidden="true"/><div><p class="font-semibold">Abriendo ensayo {{selectedTensoTestnr}}</p><p class="mt-1 text-xs">Recuperando las mediciones guardadas.</p></div>
          </div>
          <div v-else-if="hasUnsavedChanges" role="status" class="pointer-events-auto flex gap-3 rounded-xl border border-amber-400 bg-amber-950 p-4 text-white shadow-2xl ring-2 ring-white/80">
            <PencilSquareIcon class="h-6 w-6 shrink-0 text-amber-300" aria-hidden="true"/><div><p class="font-semibold">Vínculos Uster pendientes</p><p class="mt-1 text-xs">Tus cambios todavía no están guardados.</p><button :disabled="isSaving" @click="discardChanges" class="mt-2 underline" v-tippy="{content:'Restaurar vínculos anteriores a la edición',theme:'light'}">Descartar cambios</button></div>
          </div>
        </div>
      </Teleport>
      <!-- Contenedor que agrupa filtros, tablas y estado -->
			<div class="flex flex-col shrink-0 mt-2 bg-white rounded-xl p-2 border border-slate-200 min-w-0 tenso-tables-container">
				<!-- Top row: filtros a la izquierda y título Datos .TBL a la derecha (si hay datos) -->
				<div class="shrink-0 mt-2 flex items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<label class="inline-flex items-center text-sm cursor-pointer">
							<input type="radio" name="tenso-filter" :checked="filterMode === 'all'" @change="changeFilter('all')"
								class="mr-2 text-indigo-600 focus:ring-indigo-500" />
							<span class="text-slate-700 font-medium">Todos</span>
						</label>
						<label class="inline-flex items-center text-sm cursor-pointer">
							<input type="radio" name="tenso-filter" :checked="filterMode === 'not'" @change="changeFilter('not')"
								class="mr-2 text-indigo-600 focus:ring-indigo-500" />
							<span class="text-slate-700 font-medium">No guardados</span>
						</label>
						<label class="inline-flex items-center text-sm cursor-pointer">
							<input type="radio" name="tenso-filter" :checked="filterMode === 'saved'" @change="changeFilter('saved')"
								class="mr-2 text-indigo-600 focus:ring-indigo-500" />
							<span class="text-slate-700 font-medium">Guardados</span>
						</label>
					</div>
				</div>

				<div v-if="initialLoadBanner" :class="initialLoadBanner.containerClass" class="mt-4 rounded-xl px-4 py-3 text-sm shadow-sm">
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

				<!-- Grid de dos columnas: tabla de ensayos a la izquierda y datos TBL a la derecha -->
				<!-- Left column fixed, right column flexible to avoid TBL dropping below -->
				<div class="flex-1 min-h-0 mt-1 flex flex-col xl:flex-row gap-4 tenso-grid">
						<!-- Columna izquierda: Tabla de ensayos encontrados -->
						<div class="flex flex-col h-full min-h-0 xl:w-[60%] shrink-0">
						<div class="flex-1 min-h-0 overflow-auto _minimal-scroll tenso-scan-scroll">
							<table class="text-xs border-collapse fixed-table scan-table w-full">
								<colgroup>
									<col class="col-ensayo" />
									<col class="col-par" />
									<col class="col-tbl" />
									<col class="col-imp" />
									<col class="col-ne" />
									<col class="col-maq" />
									<col style="width: 72px" />
									<!-- Acción increased by ~15% (212px -> 244px) -->
									<col class="col-accion" />
								</colgroup>
								<thead>
									<tr>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											Ensayo</th>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											.PAR</th>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											.TBL</th>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											Estado</th>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											Ne</th>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											Maq.</th>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											USTER</th>
										<th
											class="px-2 py-1 border border-slate-200 text-xs text-center font-semibold text-slate-700">
											Acción</th>
									</tr>
								</thead>
								<tbody>
                  <tr v-if="!filteredTensoItems.length" class="tenso-empty-row">
                    <td colspan="8" class="text-center text-slate-500">
                      <div class="flex flex-col items-center justify-center gap-2 p-6">
                        <InboxIcon class="h-8 w-8 text-slate-400" aria-hidden="true" />
                        <span class="text-sm font-medium">{{isScanning ? 'Buscando ensayos...' : filterMode==='not' ? 'No hay ensayos pendientes de guardar' : 'No hay ensayos en esta lista'}}</span>
                      </div>
                    </td>
                  </tr>
									<tr v-for="(item, idx) in tensoDisplayList" :key="idx"
										class="hover:bg-blue-50/30 cursor-pointer transition-colors duration-150"
										:class="{ 'bg-blue-50': selectedTensoTestnr === item.testnr }"
										@click="loadTensoTestFiles(item.testnr)">
										<td
											class="px-2 py-[0.3rem] border border-slate-200 text-xs text-center text-slate-700">
											{{
												item.testnr || '' }}</td>
										<td class="px-2 py-[0.3rem] border border-slate-200 text-center text-xs"><input
												type="checkbox" disabled :checked="item.hasPar" /></td>
										<td class="px-2 py-[0.3rem] border border-slate-200 text-center text-xs"><input
												type="checkbox" disabled :checked="item.hasTbl" /></td>
										<td class="px-2 py-[0.3rem] border border-slate-200 text-center text-xs">
											<span v-if="item.saved === true" v-tippy="{content:'Guardado en la base de datos',theme:'light'}">
												<svg xmlns="http://www.w3.org/2000/svg"
													class="h-4 w-4 text-green-600 mx-auto" fill="none"
													viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
													<path stroke-linecap="round" stroke-linejoin="round"
														d="M5 13l4 4L19 7" />
												</svg>
											</span>
										</td>
										<td
											class="px-2 py-[0.3rem] border border-slate-200 text-center text-xs font-mono text-slate-700">
											{{ item.nomcount || '' }}</td>
										<td
											class="px-2 py-[0.3rem] border border-slate-200 text-center text-xs font-mono text-slate-700">
											{{ item.maschnr || '' }}</td>
										<td class="px-2 py-[0.3rem] border border-slate-200 text-center text-xs"
											@click.stop>
											<input v-if="item.testnr" type="text" v-model="item.usterTestnr" :disabled="isScanning || isSaving || isLoadingSaved || !!loadError" v-tippy="{content:'Número del ensayo Uster vinculado',theme:'light'}"
												:placeholder="''" maxlength="5"
												inputmode="numeric" :readonly="item.saved && !item.isEditing"
												:ref="el => setInputRef(el, item.testnr)"
												@focus="handleUsterInputFocus(item)"
												@input="formatUsterTestnr(item, $event)"
												@keydown.enter="focusActionButtons(item)"
												@keydown.right.prevent="focusActionButtons(item)" :class="[
													'w-full px-2 py-1 text-xs text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono transition-colors',
													item.saved && !item.isEditing ? 'bg-slate-100 text-slate-900 cursor-default' : 'text-slate-900',
													selectedTensoTestnr === item.testnr ? 'bg-yellow-50 ring-2 ring-yellow-400' : 'hover:bg-slate-50 focus:bg-yellow-50'
												]" />
										</td>
										<td class="px-2 py-[0.3rem] border border-slate-200 text-center text-xs"
											@click.stop>
											<!-- Botón Editar (solo si está guardado y no está editando) -->
											<transition name="fade" mode="out-in">
												<div v-if="item.testnr && item.saved && !item.isEditing"
													class="flex items-center gap-1 justify-center">
													<button @click.stop="startEditing(item)" :disabled="isSaving || isLoadingSaved || !!loadError" v-tippy="{content:'Corregir vínculo Uster sin reimportar mediciones',theme:'light'}"
														:ref="el => setEditButtonRef(el, item.testnr)"
														@keydown.left.prevent="focusUsterInput(item)"
														@keydown.right.prevent="focusDeleteButton(item)"
														class="inline-flex items-center justify-center w-28 gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"
															fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round"
																stroke-width="2"
																d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
														</svg>
														Editar
													</button>
													<button v-if="!item.isEditing && can('administrador')" @click.stop="deleteTensorapid(item)" v-tippy="{content:'Eliminar ensayo TensoRapid',theme:'light'}"
														:disabled="isDeleting"
														:ref="el => setDeleteButtonRef(el, item.testnr)"
														@keydown.left.prevent="focusEditButton(item)"
														class="inline-flex items-center justify-center w-28 gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md disabled:opacity-50">
														<svg xmlns="http://www.w3.org/2000/svg"
															class="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24"
															stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" />
														</svg>
														{{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
													</button>
												</div>
												<!-- Botones Guardar y Cancelar (si está editando o no está guardado) -->
												<div v-else-if="item.testnr && (item.isEditing || item.usterTestnr)"
													class="flex gap-1 justify-center">
													<button @click="saveToOracle(item)" :disabled="isSaving"
														:ref="el => setSaveButtonRef(el, item.testnr)"
														@keydown.left.prevent="focusUsterInput(item)"
														@keydown.right.prevent="focusCancelButton(item)"
														class="inline-flex items-center justify-center w-28 gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md disabled:opacity-50">
														<svg xmlns="http://www.w3.org/2000/svg"
															class="h-4 w-4 text-indigo-600" fill="none"
															viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round"
																stroke-width="2" d="M5 13l4 4L19 7" />
														</svg>
														<span>{{ isSaving ? 'Guardando...' : 'Guardar' }}</span>
													</button>
													<button @click="cancelEditing(item)"
														:ref="el => cancelButtonRefs[item.testnr] = el"
														@keydown.left.prevent="focusSaveButton(item)"
														:disabled="isSaving"
														class="inline-flex items-center justify-center w-28 gap-2 px-3 py-1 border border-slate-200 bg-white text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md disabled:opacity-50">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"
															fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round"
																stroke-width="2" d="M6 18L18 6M6 6l12 12" />
														</svg>
														Cancelar
													</button>
												</div>
											</transition>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div class="tenso-pagination-shell mt-3 shrink-0">
              <div class="tenso-pagination-row text-sm font-medium text-slate-700">
                <span class="tenso-pagination-status" v-tippy="{content:tensoScanStatus,theme:'light'}"><span class="tenso-status-full">{{tensoScanStatus}}</span><span class="tenso-status-compact">{{tensoScanList.length}} ensayos · {{tensoScanList.filter(item=>item.saved).length}} guardados</span></span>
                <ArrowPathIcon v-if="isScanning" class="h-4 w-4 shrink-0 animate-spin" aria-label="Escaneando" />
                <nav v-if="scanPageCount>1" class="tenso-pagination-controls" aria-label="Páginas de ensayos TensoRapid">
                  <template v-for="(action,index) in [
                    {label:'Inicio',icon:ChevronDoubleLeftIcon,page:1,disabled:scanPage===1},
                    {label:'Anterior',icon:ChevronLeftIcon,page:scanPage-1,disabled:scanPage===1},
                    {label:'Siguiente',icon:ChevronRightIcon,page:scanPage+1,disabled:scanPage===scanPageCount},
                    {label:'Final',icon:ChevronDoubleRightIcon,page:scanPageCount,disabled:scanPage===scanPageCount}
                  ]" :key="action.label">
                    <span v-if="index===2" class="whitespace-nowrap" aria-live="polite"><span class="tenso-page-word">Página </span>{{scanPage}}<span class="tenso-page-word"> de </span><span class="tenso-page-slash">/</span>{{scanPageCount}}</span>
                    <button :disabled="action.disabled || isSaving" @click="scanPage=action.page" :aria-label="action.label" v-tippy="{content:action.label,theme:'light'}" class="tenso-page-button">
                      <component :is="action.icon" class="tenso-page-icon h-4 w-4" aria-hidden="true" />
                      <span class="tenso-page-label">{{action.label}}</span>
                    </button>
                  </template>
                </nav>
              </div>
            </div>
          </div>
          <!-- Fin columna izquierda -->

					<!-- Columna derecha: Tabla TBL (sin contenedor exterior) -->
						<div v-show="parsedTblData.length" class="flex flex-col min-w-0 tenso-detail-column">
              <div v-if="parsedParData.COMMENT_TEXT || parsedParData.COMMENT" class="mb-2 rounded border border-slate-200 bg-slate-50 p-2 text-xs leading-relaxed whitespace-pre-wrap wrap-anywhere"><span class="font-semibold">Observaciones:</span> {{ parsedParData.COMMENT_TEXT || parsedParData.COMMENT }}</div>
						<div class="overflow-x-auto overflow-y-auto _minimal-scroll max-h-96 min-w-0">
							<table class="min-w-full text-sm border-collapse tbl-centered">
								<colgroup>
									<!-- Reduced by 40% from 40px -> 24px -->
									<col style="width:24px" />
									<!-- Reduced Test column by 40% (was 68px -> now ~41px) -->
									<col class="tbl-col-test" />
									<col style="width:48px" />
									<col style="width:48px" />
									<col style="width:52px" />
									<col class="tbl-col-tiempo" />
									<col style="width:44px" />
									<col style="width:32px" />
									<col style="width:40px" />
									<col style="width:40px" />
								</colgroup>
								<thead class="sticky top-0 bg-linear-to-r from-slate-50 to-slate-100">
									<tr>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">#
										</th>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">
											Test
										</th>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">No.
										</th>
										<th
											class="p-2 border border-slate-200 text-xs font-semibold text-slate-700 bg-blue-50">
											Huso</th>
                    <th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700 bg-emerald-50" tabindex="0"
                      v-tippy="{ content: 'Husos del ensayo Uster ' + comparisonUsterId + ', mostrados en el orden de su TBL. Compartir una fila no confirma equivalencia física; no se reasignan husos.', allowHTML: false, theme: 'light', trigger: 'mouseenter focus' }">Huso Uster</th>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">
											Tiempo Rotura</th>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">
											Fuerza B
										</th>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">
											Elong.
										</th>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">
											Tenac.
										</th>
										<th class="p-2 border border-slate-200 text-xs font-semibold text-slate-700">
											Trabajo
										</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(row, ri) in preparedTblPreview" :key="ri"
										class="hover:bg-blue-50/30 transition-colors duration-150">
										<td class="p-1.5 border border-slate-200 text-xs text-center text-slate-700">{{
											ri +
											1 }}</td>
										<td class="p-1.5 border border-slate-200 text-xs font-mono text-slate-700">{{
											row.TESTNR || '' }}</td>
										<td class="p-1.5 border border-slate-200 text-xs font-mono text-slate-700">{{
											row.REPETICIONES ?? '' }}</td>
										<td
											class="p-1.5 border border-slate-200 text-xs font-mono bg-blue-50 text-center font-semibold text-slate-700">
											{{ row.HUSO_NUMBER }}</td>
                    <td class="p-1.5 border border-slate-200 text-xs font-mono text-center font-semibold"
                      :class="comparisonUster?.tbl?.[ri]?.NO_ != null ? (Number(comparisonUster.tbl[ri].NO_) === Number(row.HUSO_NUMBER) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900') : 'text-slate-400'">{{ comparisonUster?.tbl?.[ri]?.NO_ ?? '—' }}</td>
										<td
											class="p-1.5 border border-slate-200 text-xs font-mono text-right text-slate-700 tbl-td-tiempo">
											{{ row.TIEMPO_ROTURA || '' }}</td>
										<td
											class="p-1.5 border border-slate-200 text-xs font-mono text-right text-slate-700">
											{{ row.FUERZA_B || '' }}</td>
										<td
											class="p-1.5 border border-slate-200 text-xs font-mono text-right text-slate-700">
											{{ row.ELONGACION || '' }}</td>
										<td
											class="p-1.5 border border-slate-200 text-xs font-mono text-right text-slate-700">
											{{ row.TENACIDAD || '' }}</td>
										<td
											class="p-1.5 border border-slate-200 text-xs font-mono text-right text-slate-700">
											{{ row.TRABAJO || '' }}</td>
									</tr>
								</tbody>
							</table>
						</div>
              <TensoUsterComparison :testnr="selectedTensoTestnr" :uster-testnr="comparisonUsterId" :tenso="comparisonTensoHeader" :uster="comparisonUster?.par" :tenso-husos="comparisonTensoHusos" :source-warning="comparisonLocalLoading ? 'Leyendo PAR/TBL locales para el control cruzado...' : comparisonSourceWarning" :uster-husos="comparisonUster?.tbl?.map(row => row.NO_) || []" :loading="comparisonLoading" :error="comparisonError" />
					</div>
					<!-- Fin columna derecha -->

				</div>
				<!-- Cierre del contenedor que agrupa filtros y tablas -->
			</div>
			<!-- Fin grid dos columnas -->

		</main>
		<!-- Fin main -->

	</div>
	<!-- Fin contenedor principal tenso-component -->
</template>

<script setup>
import { confirmDiscard } from '@/services/confirmDiscard.js';
import { apiFetch, can } from '@/services/authSession.js';
import { requestJson } from '@/services/apiClient.js';
import { scanUsterFiles } from '@/services/usterScan.js';
import { ArrowPathIcon, ExclamationTriangleIcon, PencilSquareIcon, ChevronDoubleLeftIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleRightIcon, InboxIcon } from '@heroicons/vue/24/outline';
import { onBeforeRouteLeave } from 'vue-router';
import TensoUsterComparison from './TensoUsterComparison.vue';
import { formatStoredSpindle } from '@/services/tensorapidFormat.js';

import { ref, shallowRef, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { compareEnsayos } from '../../services/compareEnsayos.js'
import Swal from 'sweetalert2'

// UI state
const tensoFolderInputLocal = ref(null)
const tensoFolderPathFull = ref('')
const tensoHasPersistedHandle = ref(false)
const tensoScanList = ref([])
const selectedTensoTestnr = ref('')
const tensoScanStatus = ref('')
const initialLoadBannerState = ref('checking-folder')
const isLoadingSaved=ref(false)
const loadError=ref('')
const comparisonTensoHeader=ref({})
const comparisonTensoHusos=ref([])
const comparisonSourceWarning=ref('')
const comparisonUster=ref(null)
const comparisonLoading=ref(false)
const comparisonError=ref('')
const comparisonUsterId=computed(()=>String(tensoScanList.value.find(item=>item.testnr===selectedTensoTestnr.value)?.usterTestnr || ''))
let comparisonTimer, comparisonRevision=0
watch([comparisonUsterId,selectedTensoTestnr,isLoadingSaved],([id,testnr,loading])=>{
  clearTimeout(comparisonTimer);const revision=++comparisonRevision
  comparisonUster.value=null;comparisonError.value='';comparisonLoading.value=false
  if(loading || !testnr || !/^\d{5}$/.test(id))return
  comparisonLoading.value=true
  comparisonTimer=setTimeout(async()=>{
    try{const data=await requestJson(`/uster/tests/${encodeURIComponent(id)}`);if(revision===comparisonRevision)comparisonUster.value=data}
    catch(error){if(revision===comparisonRevision)comparisonError.value=error.message || 'No se pudo consultar Uster.'}
    finally{if(revision===comparisonRevision)comparisonLoading.value=false}
  },250)
})
onUnmounted(()=>{clearTimeout(comparisonTimer);comparisonRevision++})
const scanProgress=ref({completed:0,total:0,detected:0,verified:false})
const hasUnsavedChanges=computed(()=>tensoScanList.value.some(item=>String(item.usterTestnr || '')!==String(item.confirmedUster || '')))
async function allowDiscard(){return !hasUnsavedChanges.value || confirmDiscard('Hay vínculos Uster sin guardar. ¿Descartarlos?')}
function discardChanges(){if(!isSaving.value) tensoScanList.value.forEach(item=>{item.usterTestnr=item.confirmedUster || '';item.isEditing=false})}
async function changeFilter(mode){
  if(isSaving.value || isLoadingSaved.value || isScanning.value || (hasUnsavedChanges.value && !(await allowDiscard()))) return
  discardChanges();filterMode.value=mode;recalcStatus()
  if(!filteredTensoItems.value.some(item=>item.testnr===selectedTensoTestnr.value)) clearSelectedTest()
}
function clearSelectedTest(){
  localReadRevision++;comparisonRevision++;clearTimeout(comparisonTimer)
  selectedTensoTestnr.value='';fileText.value='';tblText.value='';selectedTblName.value='';tblTestnr.value=''
  parsedParData.value={};parsedTblData.value=[];loadError.value=''
  comparisonTensoHeader.value={};comparisonTensoHusos.value=[];comparisonUster.value=null
  comparisonLoading.value=false;comparisonLocalLoading.value=false;comparisonError.value='';comparisonSourceWarning.value=''
}
function beforeUnload(e){if(hasUnsavedChanges.value || isSaving.value){e.preventDefault();e.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload))
onUnmounted(()=>window.removeEventListener('beforeunload',beforeUnload))
onBeforeRouteLeave(async ()=>!isSaving.value && allowDiscard())
const isScanning = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const maxRows = 10
const scanPage=ref(1)
const scanPageSize=50
const filteredTensoItems=computed(()=>tensoScanList.value.filter(item=>filterMode.value==='all' || (filterMode.value==='saved'?item.saved:!item.saved)))
const scanPageCount=computed(()=>Math.max(1,Math.ceil(filteredTensoItems.value.length/scanPageSize)))

const comparisonLocalLoading=ref(false)
let localReadRevision=0
function readWithDeadline(promise){
  let timer
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('La lectura local no respondió en 10 segundos.')),10000)})]).finally(()=>clearTimeout(timer))
}

// Bandera de ciclo de vida para cancelar operaciones async al desmontar
let _mounted = true

// filtro UI: 'all' | 'saved' | 'not'
// Por defecto enfocamos en los ensayos no guardados para que el usuario cargue/guarde rápidamente
const filterMode = ref('not')
watch([filterMode,()=>tensoScanList.value.length],()=>{scanPage.value=Math.min(scanPage.value,scanPageCount.value)})
watch(filterMode,()=>{scanPage.value=1})

// Refs para inputs y botones (para auto-focus)
// DOM refs are imperative handles, not screen data. Mutating these maps must
// not schedule another render while Vue replaces function refs during a patch.
const inputRefs = shallowRef({})
const saveButtonRefs = shallowRef({})
const editButtonRefs = shallowRef({})
const deleteButtonRefs = shallowRef({})
const cancelButtonRefs = shallowRef({})

// compute display list padded to maxRows and filtered by checkboxes
const tensoDisplayList = computed(() => {
	const src = Array.isArray(tensoScanList.value) ? tensoScanList.value.slice() : []

	// aplicar filtros
	let filtered = []
	if (src.length === 0) {
		filtered = []
	} else if (filterMode.value === 'all') {
		filtered = src
	} else {
		const showSaved = filterMode.value === 'saved'
		const showNot = filterMode.value === 'not'
		// si no hay ninguna opción seleccionada, mostrar todo
		if (!showSaved && !showNot) {
			filtered = src
		} else {
			filtered = src.filter(item => {
				const saved = !!item.saved
				return (saved && showSaved) || (!saved && showNot)
			})
		}
	}

	const out = []
	if (filtered.length === 0) {
		return out
	}

	if (filtered.length >= maxRows) return filtered.slice((scanPage.value-1)*scanPageSize,scanPage.value*scanPageSize)
	out.push(...filtered)
	while (out.length < maxRows) out.push({ testnr: '', hasPar: false, hasTbl: false, nomcount: '', maschnr: '' })
	return out
})

// Handlers para mantener comportamiento de filtros
// filtros manejados por filterMode (radio)

// (extractHusoNumber removed — logic inlined where needed)

// Formatea el texto de estado según total, savedCount y modo de filtro
function formatScanStatus(total, savedCount, mode) {
	if (!total || total === 0) return 'No se encontraron archivos .PAR/.TBL válidos en la carpeta seleccionada'
	if (mode === 'all') return `Encontrados ${total} ensayos (mostrando todos)`
	// si no tenemos savedCount, mostrar 'mostrando' genérico
	if (savedCount == null) {
		if (mode === 'saved') return `Encontrados ${total} ensayos (mostrando guardados)`
		if (mode === 'not') return `Encontrados ${total} ensayos (mostrando no guardados)`
	}
	const notSaved = total - (savedCount || 0)
	if (mode === 'saved') return `Encontrados ${total} ensayos (${savedCount} guardados)`
	if (mode === 'not') return `Encontrados ${total} ensayos (${notSaved} no guardados)`
	return `Encontrados ${total} ensayos`
}

// Recalcula y actualiza el texto de estado según la lista actual y el modo de filtro
function recalcStatus() {
	const total = Array.isArray(tensoScanList.value) ? tensoScanList.value.length : 0
	// detectar si tenemos información de saved en la lista
	const hasSavedInfo = Array.isArray(tensoScanList.value) && tensoScanList.value.some(it => typeof it.saved !== 'undefined')
	const savedCount = hasSavedInfo ? tensoScanList.value.reduce((acc, it) => acc + (it.saved ? 1 : 0), 0) : null
	tensoScanStatus.value = formatScanStatus(total, savedCount, filterMode.value)
}

const initialLoadBanner = computed(() => {
  if(initialLoadBannerState.value==='checking-folder') return {title:'Comprobando carpeta recordada...',message:'Comprobando si este navegador tiene una carpeta TensoRapid seleccionada.',containerClass:'border border-slate-200 bg-slate-50 text-slate-900',messageClass:'text-slate-700',iconClass:'h-5 w-5 animate-spin text-slate-500'}
	if (initialLoadBannerState.value === 'loading') {
		return {
			title: 'Recopilando datos de TensoRapid...',
			message: `PAR leídos: ${scanProgress.value.completed} de ${scanProgress.value.total}. ${scanProgress.value.verified ? 'Estado verificado en la base.' : 'Consultando cuáles están guardados...'}`,
			containerClass: 'border border-blue-200 bg-blue-50 text-blue-900',
			messageClass: 'text-blue-800/80',
			iconClass: 'h-5 w-5 animate-spin text-blue-600'
		}
	}

	if (initialLoadBannerState.value === 'needs-permission') {
		return {
			title: 'Se requiere reautorizar la carpeta de TensoRapid',
			message: 'La carpeta guardada existe, pero el navegador ya no tiene permisos de lectura. Vuelve a seleccionarla para cargar los ensayos pendientes.',
			containerClass: 'border border-amber-200 bg-amber-50 text-amber-900',
			messageClass: 'text-amber-800/80',
			iconClass: 'h-5 w-5 text-amber-600'
		}
	}

	if (initialLoadBannerState.value === 'needs-folder') {
		return {
			title: 'Selecciona una carpeta para cargar TensoRapid',
			message: 'Aún no hay una carpeta autorizada en esta sesión. Cuando la selecciones, la vista recopilará automáticamente los ensayos no guardados.',
			containerClass: 'border border-slate-200 bg-slate-50 text-slate-900',
			messageClass: 'text-slate-700/80',
			iconClass: 'h-5 w-5 text-slate-500'
		}
	}

	return null
})

// Cuando cambia el modo de filtro o el tamaño de la lista, actualizar el label
watch(filterMode, () => { recalcStatus() })
watch(() => tensoScanList.value.length, () => recalcStatus())

// **VALIDACIÓN 1: Verificar que el ensayo Uster existe en la base de datos**
async function validateUsterExists(usterTestnr) {
	try {
		const backendUrl = ''
		const endpoint = '/api/uster/status'
		
		const resp = await apiFetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ testnrs: [usterTestnr] }),
			credentials: 'include'
		})
		
		if (!resp.ok) {
			return false
		}
		
		const data = await resp.json()
		// Si existing incluye el testnr, significa que existe
		return data && Array.isArray(data.existing) && data.existing.includes(usterTestnr)
	} catch (err) {
		return false
	}
}

// **VALIDACIÓN 2: Verificar que los números de Huso coincidan entre Uster y TensoRapid**
async function validateHusoMatch(usterTestnr, tensoTblData) {
	try {
		// Obtener los números de Huso del ensayo Uster desde la BD
		const backendUrl = ''
		const endpoint = '/api/uster/husos'
		
		const resp = await apiFetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ testnr: usterTestnr }),
			credentials: 'include'
		})
		
		if (!resp.ok) {
			const errorData = await resp.json().catch(() => null)
			const errorMsg = errorData && errorData.error ? errorData.error : `HTTP ${resp.status}`
			return { valid: false, error: `No se pudo verificar la coincidencia de Husos: ${errorMsg}` }
		}
		
		const data = await resp.json()
		
		if (!data || !Array.isArray(data.husos)) {
			return { valid: false, error: 'No se encontraron datos de Husos para el ensayo Uster' }
		}
		
		if (data.husos.length === 0) {
			return { valid: false, error: `El ensayo Uster ${usterTestnr} no tiene husos registrados en USTER_TBL` }
		}
		
		// Extraer números de Huso del TBL de TensoRapid
		const tensoHusos = tensoTblData
			.map(row => {
				const husoEnsayos = row[1] && row[1].trim() !== '' ? row[1].trim() : null
				if (husoEnsayos) {
					const match = husoEnsayos.match(/^(\d+)\//)
					if (match && match[1]) {
						return parseInt(match[1], 10)
					}
				}
				return null
			})
			.filter(h => h !== null)
		
		if (tensoHusos.length === 0) {
			return { valid: false, error: 'No se pudieron extraer números de Huso del archivo TensoRapid' }
		}
		
		// Verificar coincidencia entre ambos conjuntos
		const usterHusos = data.husos.map(h => parseInt(h, 10))
		const husosInTensoNotInUster = tensoHusos.filter(h => !usterHusos.includes(h))
		const husosInUsterNotInTenso = usterHusos.filter(h => !tensoHusos.includes(h))
		
		// Si hay discrepancias, retornar información detallada para que el usuario decida
		if (husosInTensoNotInUster.length > 0 || husosInUsterNotInTenso.length > 0) {
			return {
				valid: false,
				hasDiscrepancies: true,
				usterHusos,
				tensoHusos,
				husosInTensoNotInUster,
				husosInUsterNotInTenso,
				canAutoFix: true
			}
		}
		
		return { valid: true }
	} catch (err) {
		return { valid: false, error: 'Error al validar coincidencia de Husos: ' + (err.message || String(err)) }
	}
}

// Función para cargar archivos al hacer clic en una fila
async function loadTensoTestFiles(testnr){
  if(!testnr || isSaving.value || isLoadingSaved.value) return
  selectedTensoTestnr.value=testnr;loadError.value='';isLoadingSaved.value=true;comparisonTensoHeader.value={};localReadRevision++;comparisonLocalLoading.value=false
  try{
    const item=tensoScanList.value.find(row=>row.testnr===testnr)
    if(item?.saved){
      const saved=await requestJson(`/tensorapid/tests/${encodeURIComponent(testnr)}`, { signal: AbortSignal.timeout(15000) })
      const freshLink=padUsterTestnr(saved.par.USTER_TESTNR || '')
      const pending=String(item.usterTestnr || '')!==String(item.confirmedUster || '')
      if(pending && freshLink!==String(item.confirmedUster || '')) throw new Error('Otro guardado cambió el vínculo Uster. Descarta o revisa tus cambios antes de continuar.')
      if(!pending){item.usterTestnr=freshLink;item.confirmedUster=freshLink}
      item.version=saved.version
      parsedParData.value=saved.par;tblTestnr.value=testnr
      parsedTblData.value=saved.tbl.map(row=>[testnr,formatStoredSpindle(row.HUSO_NUMBER,row.HUSO_ENSAYOS),...['TIEMPO_ROTURA','FUERZA_B','ELONGACION','TENACIDAD','TRABAJO'].map(key=>row[key]==null?'':String(row[key]))])
    }else await loadSelectedTensoFiles(testnr)
    comparisonTensoHeader.value={...parsedParData.value}
    comparisonTensoHusos.value=preparedTblPreview.value.map(row=>row.HUSO_NUMBER)
    comparisonSourceWarning.value=''
    if(item?.saved) {
      // The database view is already ready. Local provenance must not block editing or resizing.
      isLoadingSaved.value=false
      void readComparisonFiles(item,++localReadRevision)
    } else {
      comparisonTensoHeader.value={...parsedParData.value}
      comparisonTensoHusos.value=preparedTblPreview.value.map(row=>row.HUSO_NUMBER)
    }
  }catch(error){loadError.value=error.message}
  finally{isLoadingSaved.value=false}
}

async function readComparisonFiles(item,revision){
  comparisonLocalLoading.value=true
  try {
    const header={...comparisonTensoHeader.value};let husos=[...comparisonTensoHusos.value]
    const parHandle=item.parHandle || item.parFile
    if(parHandle){const file=typeof parHandle.getFile==='function'?await readWithDeadline(parHandle.getFile()):parHandle;Object.assign(header,parseParText(await readWithDeadline(file.text())))}
    const tblHandle=item.tblHandle || item.tblFile
    if(tblHandle){const file=typeof tblHandle.getFile==='function'?await readWithDeadline(tblHandle.getFile()):tblHandle;const text=await readWithDeadline(file.text());husos=text.split(/\r?\n/).slice(5).map(line=>Number(line.split('\t')[0].trim().split('/')[0])).filter(value=>Number.isInteger(value)&&value>0)}
    if(revision===localReadRevision){comparisonTensoHeader.value=header;comparisonTensoHusos.value=husos}
  }catch(error){if(revision===localReadRevision)comparisonSourceWarning.value=error.message+' Se muestran los datos guardados como respaldo.'}
  finally{if(revision===localReadRevision)comparisonLocalLoading.value=false}
}
onUnmounted(()=>{localReadRevision++})

async function confirmCrossCheck(item,header,husos) {
  // Read the requested assay now; the debounced preview may still show another link.
  const uster=await requestJson(`/uster/tests/${encodeURIComponent(item.usterTestnr)}`)
  if(!uster.par || !Array.isArray(uster.tbl) || !uster.tbl.length) throw new Error('No se pudo verificar el ensayo Uster o no tiene husos registrados.')
  const rows=compareEnsayos(header,uster.par,husos,uster.tbl.map(row=>row.NO_))
  const differences=rows.filter(row=>row.status!=='Coincide')
  if(!differences.length) return true
  const blocked=item.saved && rows.find(row=>row.label==='Husos').status!=='Coincide'
  const result=await Swal.fire({
    icon:'warning',title:'Revisar vínculo con Uster',
    text:`TensoRapid ${item.testnr} · Uster ${item.usterTestnr}\n\n`+
      differences.map(row=>`${row.label} (${row.status}):\nTensoRapid: ${row.tenso || 'Sin dato'}\nUster: ${row.uster || 'Sin dato'}`).join('\n\n')+
      (blocked?'\n\nNo se puede cambiar un vínculo guardado con husos diferentes. Revisa el ensayo Uster.':'\n\nConfirma solo si corresponden al mismo hilo y máquina. Se conservarán los husos originales de cada equipo.'),
    showConfirmButton:!blocked,showCancelButton:true,confirmButtonText:'Guardar de todas formas',cancelButtonText:'Volver a revisar',
    focusCancel:true,allowEnterKey:false,width:650,
    didOpen:()=>{const content=Swal.getHtmlContainer?.();if(content){content.style.whiteSpace='pre-wrap';content.style.textAlign='left'}}
  })
  if(result.isConfirmed && !blocked) return true
  isSaving.value=false
  await nextTick()
  focusUsterInput(item)
  return false
}

async function saveToOracle(item) {
	if (!item || !item.testnr || !item.usterTestnr) return
	if (isSaving.value || isLoadingSaved.value || isScanning.value || loadError.value) return
  if(item.saved){
    isSaving.value=true
    try{
      if(!item.version){
        const saved=await requestJson(`/tensorapid/tests/${encodeURIComponent(item.testnr)}`)
        if(padUsterTestnr(saved.par.USTER_TESTNR || '')!==String(item.confirmedUster || '')) throw new Error('El vínculo cambió. Recarga antes de guardar.')
        item.version=saved.version
      }
      const savedTest=await requestJson(`/tensorapid/tests/${encodeURIComponent(item.testnr)}`)
      if(!await confirmCrossCheck(item,savedTest.par,savedTest.tbl.map(row=>row.HUSO_NUMBER))) return
      const data=await requestJson(`/tensorapid/tests/${encodeURIComponent(item.testnr)}/link`,{method:'PATCH',body:{version:item.version,usterTestnr:item.usterTestnr}})
      item.version=data.version;item.confirmedUster=item.usterTestnr;item.isEditing=false
      await Swal.fire({toast:true,position:'top-end',icon:'success',title: 'Vínculo Uster actualizado',showConfirmButton:false,timer:2400})
    }catch(error){loadError.value=error.message}
    finally{isSaving.value=false}
    return
  }
	isSaving.value = true
	try {
		// Cargar archivos PAR y TBL para este ensayo
		await loadSelectedTensoFiles(item.testnr)

		// Verificar que tengamos datos PAR y TBL
		if (!parsedParData.value || Object.keys(parsedParData.value).length === 0) {
			throw new Error('No se pudieron cargar los datos del archivo .PAR')
		}
		if (!parsedTblData.value || parsedTblData.value.length === 0) {
			throw new Error('No se pudieron cargar los datos del archivo .TBL')
		}

		if(!await confirmCrossCheck(item,parsedParData.value,preparedTblPreview.value.map(row=>row.HUSO_NUMBER))) return

		// Agregar el TESTNR de USTER a los datos PAR
		const parDataToSave = {
			...parsedParData.value,
			USTER_TESTNR: item.usterTestnr
		}

		// Preparar datos TBL - extraer número de huso de la columna Ne (ej: "62/5" -> 62)
		const tblDataToSave = parsedTblData.value
			.map((row, index) => {
				// Extraer número de huso de la columna 1 (formato "62/5", "320/5", etc)
				const husoEnsayos = row[1] && row[1].trim() !== '' ? row[1].trim() : null
				let husoNumber = null
				if (husoEnsayos) {
					const match = husoEnsayos.match(/^(\d+)\//)
					if (match && match[1]) {
						husoNumber = parseInt(match[1], 10)
					}
				}
				// Si no se puede extraer, usar índice+1 como fallback
				if (!husoNumber || isNaN(husoNumber)) {
					husoNumber = index + 1
				}

				return {
					TESTNR: row[0] || parDataToSave.TESTNR,
					HUSO_ENSAYOS: husoEnsayos,
					HUSO_NUMBER: husoNumber,
					TIEMPO_ROTURA: row[2] && row[2].trim() !== '' ? row[2] : null,
					FUERZA_B: row[3] && row[3].trim() !== '' ? row[3] : null,
					ELONGACION: row[4] && row[4].trim() !== '' ? row[4] : null,
					TENACIDAD: row[5] && row[5].trim() !== '' ? row[5] : null,
					TRABAJO: row[6] && row[6].trim() !== '' ? row[6] : null
				}
			})

		// Toast de progreso
		Swal.fire({
			toast: true,
			position: 'top-end',
			icon: 'info',
			title: 'Guardando...',
			showConfirmButton: false,
			timer: 30000,
			timerProgressBar: true
		})

		// Determinar URL del backend
		const backendUrl = ''
		const endpoint = '/api/tensorapid/upload'

		// Enviar datos al backend
		const response = await apiFetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				par: parDataToSave,
				tbl: tblDataToSave
			}),
			credentials: 'include'
		})

		let data = null
		try { data = await response.json() } catch { data = null }

		if (!response.ok) {
			throw new Error(data && data.error ? data.error : (data && data.message) || `HTTP ${response.status}`)
		}

		// Marcar como guardado en la lista y salir del modo edición
		item.saved = true
		if(data.version) item.version=data.version
		item.confirmedUster=item.usterTestnr
		item.isEditing = false
		recalcStatus()

		// Toast de éxito
		Swal.fire({
			toast: true,
			position: 'top-end',
			icon: 'success',
			title: `Ensayo ${item.testnr} guardado`,
			text: `Vinculado con USTER ${item.usterTestnr}`,
			showConfirmButton: false,
			timer: 3000,
			timerProgressBar: true
		})

		// Enable the next field before focusing it: disabled inputs cannot receive focus.
		isSaving.value = false
		await focusNextEmptyUster(item.testnr)
	} catch (err) {
		// Cerrar toast de "Guardando..." si existe
		Swal.close()
		// Modal de error (no toast, para que el usuario pueda leerlo bien)
		await Swal.fire({
			icon: 'error',
			title: 'Error al guardar',
			text: String(err && err.message ? err.message : err),
			confirmButtonText: 'Entendido',
			confirmButtonColor: '#3b82f6',
			width: '500px'
		})
		
		// Después del error, regresar el foco al input USTER y seleccionar el contenido
		await nextTick()
		const input = inputRefs.value[item.testnr]
		if (input && typeof input.focus === 'function') {
			input.focus()
			try {
				if (typeof input.select === 'function') {
					input.select()
				}
			} catch (e) {
				/* ignore */
			}
		}
	} finally {
		isSaving.value = false
	}
}

// Eliminar ensayo de TENSORAPID_PAR y TENSORAPID_TBL
async function deleteTensorapid(item) {
  if(isSaving.value || isLoadingSaved.value || isScanning.value || (hasUnsavedChanges.value && !(await allowDiscard()))) return
  discardChanges()
	if (!item || !item.testnr) return
	if (!item.saved) return
	// Confirmación
	const res = await Swal.fire({
		title: `Eliminar ensayo ${item.testnr}?`,
		text: 'Esto eliminará los registros en TENSORAPID_PAR y TENSORAPID_TBL. Esta acción no afecta USTER.',
		icon: 'warning',
		showCancelButton: true,
		confirmButtonText: 'Eliminar',
		cancelButtonText: 'Cancelar'
	})
	if (!res.isConfirmed) return
	if (isDeleting.value) return
	isDeleting.value = true
	try {
		const backendUrl = ''
		const endpoint = '/api/tensorapid/delete'
		const resp = await apiFetch(endpoint, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ testnr: item.testnr }),
			credentials: 'include'
		})
		const data = await resp.json().catch(() => null)
		if (!resp.ok) throw new Error(data && data.error ? data.error : `HTTP ${resp.status}`)

		// Remove from scan list and clear parsed data if currently selected
		tensoScanList.value = (tensoScanList.value || []).filter(i => i.testnr !== item.testnr)
		if (selectedTensoTestnr.value === item.testnr) {
			parsedTblData.value = []
			parsedParData.value = {}
			selectedTensoTestnr.value = ''
		}

		Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Ensayo ${item.testnr} eliminado`, showConfirmButton: false, timer: 3000 })
	} catch (err) {
		console.error('deleteTensorapid error', err)
		await Swal.fire({ icon: 'error', title: 'Error al eliminar', text: String(err && err.message ? err.message : err), confirmButtonText: 'Cerrar' })
	} finally {
		isDeleting.value = false
	}
}

// Iniciar edición de un ensayo guardado
function startEditing(item) {
  if(isSaving.value || isLoadingSaved.value || isScanning.value) return
	if (!item) return
	// Guardar el valor original por si se cancela
	item.originalUsterTestnr = item.usterTestnr
	item.isEditing = true
}

// Cancelar edición y restaurar valor original
async function cancelEditing(item) {
  if(isSaving.value || isLoadingSaved.value) return
	if (!item) return
	// Restaurar el valor original
	item.usterTestnr = item.saved ? (item.confirmedUster ?? item.originalUsterTestnr ?? '') : ''
	item.isEditing = false
	item.originalUsterTestnr = undefined
	await nextTick()
	focusUsterInput(item)
}

function focusCancelButton(item) {
  cancelButtonRefs.value[item?.testnr]?.focus()
}

// Guardar referencia al input para poder enfocarlo
function setInputRef(el, testnr) {
	if (el) {
		inputRefs.value[testnr] = el
	}
}

// Guardar referencia al botón Guardar para poder enfocarlo
function setSaveButtonRef(el, testnr) {
	if (el) {
		saveButtonRefs.value[testnr] = el
	}
}

// Guardar referencia al botón Editar
function setEditButtonRef(el, testnr) {
	if (el) {
		editButtonRefs.value[testnr] = el
	}
}

// Guardar referencia al botón Eliminar para poder enfocarlo
function setDeleteButtonRef(el, testnr) {
	if (el) {
		deleteButtonRefs.value[testnr] = el
	}
}

// Enfocar el input USTER
function focusUsterInput(item) {
	if (!item || !item.testnr) return
	const input = inputRefs.value[item.testnr]
	if (input && typeof input.focus === 'function') {
		input.focus()
	}
}

// Enfocar el botón Eliminar
function focusDeleteButton(item) {
	if (!item || !item.testnr) return
	// Solo intentar enfocar si no está editando (porque si edita, el botón eliminar no está o es Cancelar)
	if (item.isEditing) return 
	
	const button = deleteButtonRefs.value[item.testnr]
	if (button && typeof button.focus === 'function') {
		button.focus()
	}
}

// Manejar focus en el input USTER: cargar archivos .TBL automáticamente
async function handleUsterInputFocus(item){if(item?.testnr && selectedTensoTestnr.value!==item.testnr) await loadTensoTestFiles(item.testnr)}

// Formatear USTER_TESTNR con padding de ceros (5 dígitos) y solo números
async function formatUsterTestnr(item, event) {
	if (!item) return

	// Extraer solo números
	let value = (event.target.value || '').replace(/\D/g, '')

	// Limitar a 5 caracteres
	if (value.length > 5) {
		value = value.slice(0, 5)
	}

	// Actualizar el valor (sin padding mientras escribe)
	item.usterTestnr = value

	// Si llegó a 5 dígitos, aplicar padding y enfocar botón Guardar
	if (value.length === 5) {
		// Padding con ceros a la izquierda
		item.usterTestnr = value.padStart(5, '0')
		// Enfocar botón Guardar después de un pequeño delay para que se actualice el DOM
		setTimeout(() => focusSaveButton(item), 100)
	}
}

// Enfocar el botón Guardar para un ensayo específico
function focusSaveButton(item) {
	if (!item || !item.testnr) return
	const button = saveButtonRefs.value[item.testnr]
	if (button && typeof button.focus === 'function') {
		button.focus()
	}
}

// Enfocar el botón Editar
function focusEditButton(item) {
	if (!item || !item.testnr) return
	const button = editButtonRefs.value[item.testnr]
	if (button && typeof button.focus === 'function') {
		button.focus()
	}
}

// Decidir qué botón enfocar (Guardar o Editar) según el estado
function focusActionButtons(item) {
	if (!item) return
	if (item.saved && !item.isEditing) {
		focusEditButton(item)
	} else {
		focusSaveButton(item)
	}
}

// Focus the next input in the USTER column that is empty (after saving current)
async function focusNextEmptyUster(currentTestnr) {
	try {
		// wait a tick so any reactive changes (saved flag, filters) are applied
		await nextTick()
		const full = Array.isArray(tensoScanList.value) ? tensoScanList.value : []
		if (full.length === 0) return false

		// Build candidate list (testnr) in the same order as full list, respecting current filter
		const candidates = full
			.filter(it => it && it.testnr)
			.filter(it => {
				if (filterMode.value === 'not') return !it.saved
				if (filterMode.value === 'saved') return !!it.saved
				return true
			})
			.filter(it => !it.saved)
			.map(it => String(it.testnr))

		if (candidates.length === 0) {
			// No hay más ensayos sin USTER - limpiar la tabla "Datos .TBL"
			parsedTblData.value = []
			selectedTensoTestnr.value = ''
			await nextTick()
			return false
		}

		// Find position of currentTestnr in full list
		const currentPos = full.findIndex(it => String(it.testnr) === String(currentTestnr))
		// If currentTestnr itself is a candidate, just pick the next candidate in candidates order
		const curIdxInCandidates = candidates.indexOf(String(currentTestnr))
		let targetTestnr = null
		if (curIdxInCandidates >= 0) {
			// next candidate (wrap)
			targetTestnr = candidates[(curIdxInCandidates + 1) % candidates.length]
		} else {
			// find first candidate whose index in full list is greater than currentPos
			let found = null
			for (const cand of candidates) {
				const pos = full.findIndex(it => String(it.testnr) === String(cand))
				if (pos > currentPos) { found = cand; break }
			}
			if (!found) found = candidates[0]
			targetTestnr = found
		}

		if (!targetTestnr) return false
    const targetIndex=filteredTensoItems.value.findIndex(item=>String(item.testnr)===targetTestnr)
    if(targetIndex>=0)scanPage.value=Math.floor(targetIndex/scanPageSize)+1
		// allow DOM to settle if the row was removed/changed due to filtering
		await nextTick()

		// Cargar los datos del .TBL del siguiente ensayo para actualizar la tabla
		try {
			await loadTensoTestFiles(targetTestnr)
		} catch (e) {
			console.warn('Failed to load files for next test', targetTestnr, e)
		}

		await nextTick()
		if (loadError.value) return false
		const input = inputRefs.value[targetTestnr]
		if (input && typeof input.focus === 'function') {
			input.focus()
			input.select()
			try { input.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch { /* ignore */ }
			// add temporary highlight class
			try {
				input.classList.add('focus-highlight')
				setTimeout(() => {
					try { input.classList.remove('focus-highlight') } catch { /* ignore */ }
				}, 600)
			} catch { /* ignore */ }
			return true
		}
	} catch (err) {
		console.warn('focusNextEmptyUster error', err)
	}
	return false
}

// Helper: formatear USTER_TESTNR a 5 dígitos con padding
function padUsterTestnr(value) {
	if (!value) return ''
	const numStr = String(value).replace(/\D/g, '').slice(0, 5)
	return numStr ? numStr.padStart(5, '0') : ''
}

// load .PAR and .TBL for a given testnr using the persisted handle (or fallback input files)
async function loadSelectedTensoFiles(testnr) {
	try {
		fileText.value = ''
		tblText.value = ''
		parsedParData.value = {}
		// Do not clear parsedTblData here to avoid UI flicker when switching between rows.
		// parsedTblData will be replaced only after new data is parsed.
		selectedTblName.value = ''
		tblTestnr.value = testnr

		// Try to read from the in-memory scan list first (these entries may include file handles)
		const item = Array.isArray(tensoScanList.value) ? tensoScanList.value.find(x => x.testnr === testnr) : null
		if (item) {
			// If scan stored handles, use them (faster and less chance of missing files)
			try {
				if (item.parHandle && typeof item.parHandle.getFile === 'function') {
					const pf = await item.parHandle.getFile()
					fileText.value = await pf.text()
					// Parse PAR data
					parsedParData.value = parseParText(fileText.value)
				}
			} catch (err) {
				console.warn('reading .PAR from scan-list handles failed', err)
			}

			// Fallback: if the scan came from the input element, a File object may be attached
			if (!fileText.value && item.parFile && typeof item.parFile.text === 'function') {
				try {
					fileText.value = await item.parFile.text()
					parsedParData.value = parseParText(fileText.value)
				} catch (err) { console.warn('reading .PAR from input file fallback', err) }
			}
			try {
				if (item.tblHandle && typeof item.tblHandle.getFile === 'function') {
					const tf = await item.tblHandle.getFile()
					tblText.value = await tf.text()
					selectedTblName.value = tf.name || ''
					parseTblText(tblText.value)
				}
			} catch (err) {
				console.warn('reading .TBL from scan-list handles failed', err)
			}

			// Fallback: use File object stored from input selection
			if (!tblText.value && item.tblFile && typeof item.tblFile.text === 'function') {
				try {
					tblText.value = await item.tblFile.text()
					selectedTblName.value = item.tblFile.name || ''
					parseTblText(tblText.value)
				} catch (err) { console.warn('reading .TBL from input file fallback', err) }
			}
			// if we got anything, return early
			if (fileText.value || tblText.value) return
		}

		// Fallback: read from the persisted directory handle (if any)
		const dh = await getDirHandleFromIDB('dir-tenso')
		if (!dh) {
			tensoScanStatus.value = 'No hay acceso directo a la carpeta (fallback). Usa Seleccionar para elegir carpeta.'
			return
		}
		const ok = await verifyPermission(dh, 'read')
		if (!ok) {
			tensoScanStatus.value = 'Permiso denegado para leer la carpeta. Vuelve a seleccionar la carpeta.'
			return
		}

		for await (const [name, handle] of dh.entries()) {
			try {
				if (!handle || handle.kind !== 'file') continue
				const ln = String(name || '').toLowerCase()
				if (!String(name).includes(testnr)) continue
				if (ln.endsWith('.par')) {
					try {
						const f = await handle.getFile()
						fileText.value = await f.text()
						// Parse PAR data
						parsedParData.value = parseParText(fileText.value)
					} catch (err) {
						console.warn('reading .PAR selected', err)
					}
				}
				if (ln.endsWith('.tbl')) {
					try {
						const f = await handle.getFile()
						tblText.value = await f.text()
						selectedTblName.value = f.name || ''
						parseTblText(tblText.value)
					} catch (err) {
						console.warn('reading .TBL selected', err)
					}
				}
			} catch (err) {
				// Protect the loop from unexpected handle errors
				console.warn('error iterating directory entries', err)
			}
		}
	} catch (err) { console.warn('loadSelectedTensoFiles error', err); tensoScanStatus.value = 'Error al cargar archivos seleccionados: ' + (err && err.message ? err.message : String(err)) }
}

function parseTblText(text) {
	tblText.value = text || ''
	if (!text) return
	const lines = text.split(/\r?\n/)
	// startIndex 5 => line 6 (1-based rows: 6..)
	const startIndex = 5

	// derive TESTNR from selectedTblName (chars 7..12 -> slice(6,12)), fallback to provided tblTestnr
	let testnrFromName = tensoId(selectedTblName.value) || ''
	if (!testnrFromName && tblTestnr.value) testnrFromName = tblTestnr.value

	// build rows locally to avoid mutating the reactive array until ready
	const rows = []
	for (let i = startIndex; i < lines.length; i++) {
		const row = lines[i]
		const cleanRow = row && row.charCodeAt(0) === 0xFEFF ? row.slice(1) : row
		if (!cleanRow || cleanRow.trim() === '') break
		const cols = cleanRow.split('\t').map(c => (c || '').trim())
		// Build row as [TESTNR, NO., TIEMPO_ROTURA, FUERZA_B, ELONGACION, TENACIDAD, TRABAJO]
		const rowData = [testnrFromName]
		// columns 1..6 map to cols[0]..cols[5]
		for (let ci = 0; ci < 6; ci++) {
			rowData.push(cols[ci] || '')
		}
		rows.push(rowData)
	}
	// Replace reactive array in one assignment to minimize reactivity churn
	parsedTblData.value = rows
}

const fileText = ref('')
const tblText = ref('')
const selectedTblName = ref('')
const tblTestnr = ref('')
const parsedTblData = ref([])
const parsedParData = ref({})

// Computed property para formatear la fecha del campo TIME a dd/mm/yyyy
const formattedTimeDate = computed(() => {
	if (!parsedParData.value || !parsedParData.value.TIME) return ''
	const timeStr = parsedParData.value.TIME.trim()
	if (!timeStr) return ''
	
	// El formato TIME de TensoRapid .PAR es "dd.mm.yyyy" (columna 8 de la línea TIME)
	try {
		const parts = timeStr.split('.')
		
		if (parts.length === 3) {
			const day = parts[0].padStart(2, '0')
			const month = parts[1].padStart(2, '0')
			const year = parts[2]
			return `${day}/${month}/${year}`
		}
	} catch (err) {
		console.warn('Error formateando fecha TIME:', err)
	}
	return ''
})

// Prepared TBL data as it will be sent to the backend (matching saveToOracle mapping)
const preparedTblPreview = computed(() => {
	try {
		return (parsedTblData.value || []).map((row, index) => {
			const husoEnsayos = row[1] && row[1].trim() !== '' ? row[1].trim() : ''
			let husoNumber = null
			if (husoEnsayos) {
				const match = husoEnsayos.match(/^(\d+)\//)
				if (match && match[1]) husoNumber = parseInt(match[1], 10)
			}
			if (!husoNumber || isNaN(husoNumber)) husoNumber = index + 1

			return {
				TESTNR: row[0] || tblTestnr.value,
				HUSO_ENSAYOS: husoEnsayos,
				REPETICIONES: /^(\d+)\/(\d+)$/.test(husoEnsayos) ? Number(husoEnsayos.split('/')[1]) : null,
				HUSO_NUMBER: husoNumber,
				TIEMPO_ROTURA: row[2] && row[2].trim() !== '' ? row[2] : '',
				FUERZA_B: row[3] && row[3].trim() !== '' ? row[3] : '',
				ELONGACION: row[4] && row[4].trim() !== '' ? row[4] : '',
				TENACIDAD: row[5] && row[5].trim() !== '' ? row[5] : '',
				TRABAJO: row[6] && row[6].trim() !== '' ? row[6] : ''
			}
		})
	} catch (err) {
		console.warn('preparedTblPreview compute error', err)
		return []
	}
})

// TensoRapid .PAR file field mapping (row, column as specified)
const tensoParFields = [
	{ field: 'CATALOG', row: 3, col: 1 },
	{ field: 'TESTNR', row: 8, col: 5 },
	{ field: 'TIME', row: 9, col: 8 },
	{ field: 'SORTIMENT', row: 10, col: 5 },
	{ field: 'ARTICLE', row: 11, col: 5 },
	{ field: 'MASCHNR', row: 12, col: 5 },
	{ field: 'MATCLASS', row: 13, col: 8 },
	{ field: 'NOMCOUNT', row: 14, col: 5 },
	{ field: 'NOMTWIST', row: 15, col: 5 },
	{ field: 'USCODE', row: 17, col: 8 },
	{ field: 'LABORANT', row: 18, col: 5 },
	{ field: 'COMMENT', row: 19, col: 5 },
	{ field: 'LOTE', row: 20, col: 5 },
	{ field: 'TUNAME', row: 24, col: 5 },
	{ field: 'GROUPS', row: 25, col: 5 },
	{ field: 'WITHIN', row: 26, col: 5 },
	{ field: 'TOTAL', row: 27, col: 5 },
	{ field: 'UNSPOOLGROUPS', row: 29, col: 5 },
	{ field: 'LENGTH', row: 30, col: 5 },
	{ field: 'EXTSPEED', row: 31, col: 5 },
	{ field: 'PRETENSION', row: 32, col: 5 },
	{ field: 'CLAMPPRESSURE', row: 33, col: 5 },
	{ field: 'CYCLEFORCELL', row: 34, col: 5 },
	{ field: 'CYCLEFORCEUL', row: 35, col: 5 },
	{ field: 'NMBOFFORCECYCLES', row: 36, col: 5 },
	{ field: 'CYCLELONGLL', row: 37, col: 5 },
	{ field: 'CYCLELONGUL', row: 38, col: 5 },
	{ field: 'NMBOFELONGCYCLES', row: 39, col: 5 },
	{ field: 'FORCEF1REL', row: 40, col: 5 },
	{ field: 'ELONGATIONE1REL', row: 41, col: 5 },
	{ field: 'EVALTIMEREL', row: 42, col: 5 },
	{ field: 'PRELOADCYCLESREL', row: 43, col: 5 },
	{ field: 'FORCEF1RET', row: 44, col: 5 },
	{ field: 'ELONGATIONE1RET', row: 45, col: 5 },
	{ field: 'EVALTIMERET', row: 46, col: 5 },
	{ field: 'PRELOADCYCLESRET', row: 47, col: 5 }
]

// Parse .PAR file and extract all fields according to tensoParFields mapping
function parseParText(text) {
	const data = {}
	if (!text) return data

	for (const fieldDef of tensoParFields) {
		const value = extractTsvCell(text, fieldDef.row, fieldDef.col)
		data[fieldDef.field] = value != null ? String(value).trim() : ''
	}

	return data
}

// IndexedDB helpers (store handles)
function openDb() {
	return new Promise((resolve, reject) => {
		// Open without explicit version so we don't attempt to open with a lower version than
		// the one already present in the browser (which throws VersionError).
		const r = window.indexedDB.open('carga-uster')
		r.onupgradeneeded = () => {
			const db = r.result
			if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles')
		}
		r.onsuccess = () => resolve(r.result)
		r.onerror = () => reject(r.error)
	})
}
async function saveDirHandleToIDB(dirHandle, key = 'dir-tenso') {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction('handles', 'readwrite')
		const store = tx.objectStore('handles')
		const req = store.put(dirHandle, key)
		req.onsuccess = () => resolve(true)
		req.onerror = () => reject(req.error)
	})
}
async function getDirHandleFromIDB(key = 'dir-tenso') {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const tx = db.transaction('handles', 'readonly')
		const store = tx.objectStore('handles')
		const req = store.get(key)
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
	})
}
async function verifyPermission(handle, mode = 'read') {
	if (!handle) return false
	try {
		const opts = { mode }
		if (await handle.queryPermission(opts) === 'granted') return true
		if (await handle.requestPermission(opts) === 'granted') return true
	} catch (err) { console.warn('verifyPermission error', err) }
	return false
}

// extract cell from TSV-like .PAR (1-based rows/cols)
function extractTsvCell(text, rowIndex, colIndex) {
	if (text == null) return null
	const lines = text.split(/\r?\n/)
	if (lines.length < rowIndex) return null
	let row = lines[rowIndex - 1]
	if (row && row.charCodeAt(0) === 0xFEFF) row = row.slice(1)
	const cols = row.split('\t')
	if (colIndex - 1 >= cols.length) return null
	return cols[colIndex - 1]
}

// scan directory handle for .PAR/.TBL files
function tensoId(name){const raw=String(name || '').slice(6,12);return /^\d{4,6}$/.test(raw)?raw:String(name || '').match(/\d{5}/)?.[0] || null}
async function scanEntries(entries){
  loadError.value=''
  scanProgress.value={completed:0,total:0,detected:entries.length,verified:false}
  const ids=[...new Set(entries.map(file=>/\.(par|tbl)$/i.test(file.name)&&tensoId(file.name)).filter(Boolean))]
  const [items,status]=await Promise.all([
    scanUsterFiles(entries,{getTestnr:tensoId,readHeader:text=>({nomcount:extractTsvCell(text,14,5),maschnr:extractTsvCell(text,12,5)}),onProgress:({completed,total})=>{scanProgress.value.completed=completed;scanProgress.value.total=total}}),
    ids.length?requestJson('/tensorapid/status',{method:'POST',body:{testnrs:ids}}):Promise.resolve({existing:[],details:{}})
  ])
  if(!Array.isArray(status.existing)) throw new Error('No se pudo verificar el estado de los ensayos.')
  const existing=new Set(status.existing.map(String))
  tensoScanList.value=items.sort((a,b)=>Number(b.testnr)-Number(a.testnr)).map(item=>{const link=padUsterTestnr(status.details?.[item.testnr]?.usterTestnr || '');return {...item,version:status.details?.[item.testnr]?.version,saved:existing.has(item.testnr),usterTestnr:link,confirmedUster:link,isEditing:false,parFile:item.parHandle,tblFile:item.tblHandle}})
  scanPage.value=1
  scanProgress.value.verified=true;recalcStatus()
}
async function scanTensoDirectory(dirHandle){
  isScanning.value=true;initialLoadBannerState.value='loading';tensoFolderPathFull.value=dirHandle.name || 'Carpeta seleccionada'
  try{const entries=[];for await(const [name,handle] of dirHandle.entries()) if(handle.kind==='file' && /\.(par|tbl)$/i.test(name)) entries.push(handle);await scanEntries(entries)}
  catch(error){loadError.value=error.message;tensoScanList.value=[]}
  finally{isScanning.value=false;initialLoadBannerState.value='hidden'}
  await selectFirstPending()
}

async function selectFirstPending(){
  if(selectedTensoTestnr.value || loadError.value) return
  const firstPending=tensoScanList.value.find(item=>!item.saved)
  if(!firstPending) return
  filterMode.value='not';scanPage.value=1
  await loadTensoTestFiles(firstPending.testnr)
  if(loadError.value) return
  await nextTick()
  focusUsterInput(firstPending)
}

// Select folder (File System Access API) or fallback to hidden input
async function selectTensoFolder() {
  if(initialLoadBannerState.value==='checking-folder' || isSaving.value || isLoadingSaved.value || isScanning.value || (hasUnsavedChanges.value && !(await allowDiscard()))) return
  discardChanges()
	try {
		if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
			const dh = await window.showDirectoryPicker()
			if (!dh) return
			await saveDirHandleToIDB(dh, 'dir-tenso')
			tensoHasPersistedHandle.value = true
			tensoFolderPathFull.value = dh.name || ''
			await scanTensoDirectory(dh)
			initialLoadBannerState.value = 'hidden'
			return
		}
		// fallback to input (scan only, do not persist files)
		if (tensoFolderInputLocal && tensoFolderInputLocal.value) tensoFolderInputLocal.value.click()
	} catch (err) { console.warn('selectTensoFolder error', err) }
}

async function refreshTensoFolder() {
  if(initialLoadBannerState.value==='checking-folder' || isSaving.value || isLoadingSaved.value || isScanning.value || (hasUnsavedChanges.value && !(await allowDiscard()))) return
  discardChanges()
	try {
		initialLoadBannerState.value = 'loading'
		const dh = await getDirHandleFromIDB('dir-tenso')
		if (!dh) {
			initialLoadBannerState.value = 'needs-folder'
			return selectTensoFolder()
		}
		const ok = await verifyPermission(dh, 'read')
		if (!ok) {
			initialLoadBannerState.value = 'needs-permission'
			return selectTensoFolder()
		}
		tensoHasPersistedHandle.value = true
		tensoFolderPathFull.value = dh.name || ''
		await scanTensoDirectory(dh)
		initialLoadBannerState.value = 'hidden'
	} catch (err) { console.warn('refreshTensoFolder error', err) }
}

async function onTensoFolderInputChangeLocal(e){
  isScanning.value=true;initialLoadBannerState.value='loading'
  const files=Array.from(e?.target?.files || [])
  tensoFolderPathFull.value=files[0]?.webkitRelativePath?.split('/')[0] || 'Carpeta local seleccionada';tensoHasPersistedHandle.value=false
  try{await scanEntries(files)}catch(error){loadError.value=error.message;tensoScanList.value=[]}
  finally{isScanning.value=false;initialLoadBannerState.value='hidden'}
  await selectFirstPending()
}

onMounted(() => {
	if (typeof window !== 'undefined' && typeof window.document !== 'undefined') window.document.title = 'TensoRapid'
	// Ensure preview pane is empty on first render (no preloaded file/tbl data)
	try {
		fileText.value = ''
		tblText.value = ''
		parsedTblData.value = []
		selectedTblName.value = ''
		tblTestnr.value = ''
	} catch { /* noop */ }

	// try to auto-load persisted dir handle 'dir-tenso' and scan it
	; (async () => {
		try {
			const dh = await getDirHandleFromIDB('dir-tenso')
			if (!dh) {
				initialLoadBannerState.value = 'needs-folder'
				return
			}
			tensoFolderPathFull.value=dh.name || 'Carpeta recordada'
			const ok = await verifyPermission(dh, 'read')
			if (!ok) {
				console.warn('No permission to access persisted dir-tenso')
				initialLoadBannerState.value = 'needs-permission'
				return
			}
			tensoHasPersistedHandle.value = true
			tensoFolderPathFull.value = dh.name || ''
			await scanTensoDirectory(dh)
			initialLoadBannerState.value = 'hidden'
		} catch (err) {
			console.warn('auto-load dir-tenso failed', err)
		} finally {
			if (initialLoadBannerState.value === 'checking-folder') initialLoadBannerState.value = 'needs-folder'
      else if (initialLoadBannerState.value === 'loading') initialLoadBannerState.value = 'hidden'
		}
	})()
})
onUnmounted(() => {
  _mounted = false
})

</script>

<style scoped>
.focus-highlight {
	box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.4);
	/* soft yellow halo */
	background-color: #fff8db;
	/* light yellow background */
	transition: box-shadow 200ms ease, background-color 200ms ease;
}
</style>

<style scoped>
.scan-container {
	max-height: 16rem;
	overflow-y: auto;
	overflow-x: hidden;
	/* Allow fluid width so the table can expand to its container instead of being fixed */
	width: auto;
}

/* Force fixed table layout so col widths from global CSS (col-ensayo, col-par, etc.) are respected */
.scan-table {
	table-layout: fixed;
	width: 100%;
}

/* Column classes for TBL preview */
.tbl-col-test {
	/* Reduced by 40% per request: 68px -> 41px */
	width: 41px;
}

.tbl-col-tiempo {
	/* Reduced by 50% (halved) per request */
	width: 35px;
}

.tbl-td-tiempo {
	/* Allow breaking when the cell can't fit in one line */
	white-space: normal;
	word-break: break-word;
}

/* Grid: left column fixed on xl and above, right column flexible. Moved from inline style to CSS. */
.tenso-grid {
	/* default single-column (mobile) kept by Tailwind grid-cols-1 */
	grid-template-columns: 1fr;
}

@media (min-width: 1280px) {
	.tenso-grid {
		grid-template-columns: 672px 1fr;
	}
}

/* Acción column width handled via class on <col> */
.col-accion {
	width: 244px;
}

/* Center table content horizontally and vertically for Datos .TBL */
.tbl-centered th,
.tbl-centered td {
	text-align: center;
	vertical-align: middle;
}

/* Fade transition for action buttons */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 180ms ease, transform 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}

.fade-enter-to,
.fade-leave-from {
	opacity: 1;
	transform: translateY(0);
}
</style>

<style scoped>
.tenso-workspace{container-type:inline-size;scrollbar-gutter:stable;}
.tenso-pagination-shell{container:tenso-pagination / inline-size;min-width:0;}
.tenso-pagination-row{display:flex;align-items:center;gap:8px;white-space:nowrap;min-width:0;}
.tenso-pagination-status{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;}
.tenso-pagination-controls{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.tenso-page-button{
  display:inline-flex;align-items:center;justify-content:center;min-width:30px;min-height:30px;
  padding:4px 8px;border:1px solid transparent;border-radius:8px;background:#f8fafc;
  color:#475569;font:inherit;cursor:pointer;
  transition:background-color 150ms,border-color 150ms,box-shadow 150ms;
}
.tenso-page-button:hover:not(:disabled){background:#eff6ff;border-color:#bfdbfe;color:#2563eb;box-shadow:0 2px 6px rgb(15 23 42 / 12%);}
.tenso-page-button:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;}
.tenso-page-button:active:not(:disabled){background:#dbeafe;box-shadow:inset 0 1px 2px rgb(15 23 42 / 10%);}
.tenso-page-button:disabled{opacity:.35;cursor:default;}
.tenso-page-icon,.tenso-page-slash{display:none;}
.tenso-status-compact{display:none;}
@container tenso-pagination (max-width:680px){
  .tenso-status-full{display:none;}
  .tenso-status-compact{display:inline;}
  .tenso-page-label,.tenso-page-word{display:none;}
  .tenso-page-icon{display:block;}
  .tenso-page-slash{display:inline;}
  .tenso-pagination-controls{gap:4px;}
  .tenso-pagination-controls button{padding:5px;}
}
.tenso-toolbar { flex-wrap:nowrap; min-width:0; }
.tenso-toolbar-title { flex-shrink:0; white-space:nowrap; }
.tenso-toolbar-path { max-width:480px; }
.tenso-toolbar-path > div { width:100%; }
.tenso-toolbar-actions button { flex-shrink:0; white-space:nowrap; }
@container (max-width:1050px) {
  .tenso-toolbar-actions .tenso-action-label { display:none; }
  .tenso-toolbar-actions button { width:34px; height:34px; padding:0; justify-content:center; }
  .tenso-toolbar-actions button svg { width:18px; height:18px; }
  .tenso-toolbar { gap:8px; }
  .tenso-toolbar-title { font-size:20px; gap:6px; }
  .tenso-toolbar-title > svg { width:24px; height:24px; }
}
@container (max-width:780px) {
  .tenso-toolbar-label { font-size:12px; }
  .tenso-toolbar-title { font-size:18px; }
  .tenso-toolbar-path > div { padding:7px 8px; font-size:12px; }
}
@container (max-width:600px) {
  .tenso-toolbar-label { display:none; }
  .tenso-toolbar-title { font-size:16px; }
}
.tenso-workspace .tenso-grid{display:grid;grid-template-columns:minmax(440px,620px) minmax(330px,480px);gap:12px;max-width:1112px;width:100%;align-items:stretch;}
.tenso-workspace .tenso-grid { flex:none; min-height:auto; }
.tenso-workspace .tenso-grid > div { width:100%; min-width:0; height:auto; }
.tenso-workspace .tenso-scan-scroll { max-height:calc(100dvh - 210px); }
.tenso-workspace .tenso-scan-scroll {
  position:relative;isolation:isolate;border:1px solid #cbd5e1;
  background:#fff;border-radius:4px;
  scrollbar-width:thin;
  scrollbar-color:rgba(99,102,241,.35) transparent;
}
.tenso-scan-scroll::-webkit-scrollbar{width:8px;}
.tenso-scan-scroll::-webkit-scrollbar-track{background:transparent;}
.tenso-scan-scroll::-webkit-scrollbar-thumb{
  background:rgba(99,102,241,.35);border-radius:999px;border:2px solid transparent;
  background-clip:padding-box;box-shadow:0 0 8px rgba(99,102,241,.14);
  transition:background 160ms linear,box-shadow 160ms linear;
}
.tenso-scan-scroll::-webkit-scrollbar-thumb:hover{background:rgba(99,102,241,.65);box-shadow:0 0 12px rgba(99,102,241,.24);}
.tenso-scan-scroll::-webkit-scrollbar-thumb:active{box-shadow:0 0 16px rgba(99,102,241,.28);}
.tenso-workspace .scan-table { border-collapse:separate;border-spacing:0; }
.tenso-workspace .scan-table th,.tenso-workspace .scan-table td {
  border-width:0 1px 1px 0;
}
.tenso-workspace .scan-table th:last-child,.tenso-workspace .scan-table td:last-child { border-right-width:0; }
.tenso-workspace .scan-table thead th {
  position:sticky;top:0;z-index:2;background:#f1f5f9;
  box-shadow:inset 0 -1px 0 #cbd5e1;
}
.tenso-workspace .scan-container{max-height:calc(100dvh - 210px);overflow-x:auto;}
.tenso-workspace .scan-table{min-width:440px;}
.tenso-workspace .scan-table th,.tenso-workspace .scan-table td{padding-left:3px;padding-right:3px;}
.tenso-workspace .scan-table col.col-ensayo{width:65px;}
.tenso-workspace .scan-table col.col-par,.tenso-workspace .scan-table col.col-tbl{width:28px;}
.tenso-workspace .scan-table col.col-imp{width:42px;}
.tenso-workspace .scan-table col.col-ne,.tenso-workspace .scan-table col.col-maq{width:45px;}
.tenso-workspace .scan-table col.col-accion{width:160px;}
.tenso-workspace .scan-table button.w-28{width:auto;min-width:60px;padding:4px 6px;font-size:12px;gap:4px;}
.tenso-workspace .scan-table td:last-child .flex{flex-wrap:wrap;}
.tenso-workspace .tbl-centered{min-width:472px;}
.tenso-tables-container { flex-shrink:0; }
.tenso-empty-workspace .tenso-tables-container{flex:1;min-height:360px;}
.tenso-empty-workspace .tenso-grid{flex:1;min-height:0;align-items:stretch;}
.tenso-empty-workspace .tenso-grid > div{height:100%;min-height:0;}
.tenso-empty-workspace .tenso-scan-scroll{flex:1;max-height:none;}
.tenso-empty-workspace .scan-table{height:100%;}
.tenso-empty-workspace .scan-table thead{height:30px;}
.tenso-empty-row td{vertical-align:middle;border-bottom:0;}
.tenso-detail-column{width:100%;min-height:0;}
.tenso-detail-column > * { flex-shrink:0; max-width:100%; }
.tenso-detail-column :deep(.tenso-cross-check){flex:1 0 auto;}
@container(max-width:1400px){.tenso-workspace .tenso-grid{grid-template-columns:minmax(440px,550px) minmax(330px,440px);max-width:1002px;}}
@container(max-width:850px){.tenso-workspace .tenso-grid{grid-template-columns:minmax(0,1fr);max-width:736px;}.tenso-workspace .scan-container{max-height:260px;}.tenso-detail-column :deep(.tenso-cross-check){flex:0 0 auto;}}
</style>
