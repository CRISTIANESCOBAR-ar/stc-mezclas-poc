<template>
  <div class="h-screen flex flex-row bg-gray-100 overflow-hidden font-sans">

    <!-- Sidebar izquierdo -->
    <aside class="relative z-[120] flex-none w-12 flex flex-col items-center bg-gray-100 border-r border-gray-200 py-3 shadow-sm select-none">

      <!-- Separador -->
      <div class="w-5 h-px bg-gray-300 mb-2"></div>

      <!-- Navegación -->
      <nav class="flex flex-col items-center gap-1 w-full px-1.5">

        <!-- Bienvenida -->
        <router-link
          to="/bienvenida"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/bienvenida'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9.5L12 3l9 6.5"/>
            <path d="M5 9v11h14V9"/>
            <path d="M9 20v-6h6v6"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Inicio
          </span>
        </router-link>

        <!-- Inventario -->
        <router-link
          to="/inventario"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/inventario'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {{ t('nav.inventory') }}
          </span>
        </router-link>

        <!-- Configuración -->
        <router-link
          to="/configuracion-estandares"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/configuracion-estandares'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {{ t('nav.settings') }}
          </span>
        </router-link>

        <!-- HVI -->
        <router-link
          to="/hvi"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/hvi'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            HVI
          </span>
        </router-link>

        <!-- Uster -->
        <router-link
          to="/uster"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/uster'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h16"/>
            <path d="M4 12h16"/>
            <path d="M4 17h10"/>
            <circle cx="18" cy="17" r="2"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Uster
          </span>
        </router-link>

        <!-- Uster Cardas -->
        <router-link
          to="/uster-cardas"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/uster-cardas'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16v4H4z"/>
            <path d="M4 12h16v8H4z"/>
            <path d="M9 8v4"/>
            <path d="M15 8v4"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Uster Cardas
          </span>
        </router-link>

        <!-- TensoRapid -->
        <router-link
          to="/tensorapid"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/tensorapid'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            TensoRapid
          </span>
        </router-link>

        <!-- Trazabilidad OE -->
        <router-link
          to="/oe-trazabilidad"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/oe-trazabilidad'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Trazabilidad OE
          </span>
        </router-link>

        <!-- Relato IA -->
        <router-link
          to="/relato-ia"
          class="group relative w-full flex items-center justify-center h-10 rounded-lg transition-all"
          :class="$route.path === '/relato-ia'
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18h6"/>
            <path d="M10 22h4"/>
            <path d="M12 2a7 7 0 00-4 12.75c.75.5 1.25 1.25 1.4 2.1h5.2c.15-.85.65-1.6 1.4-2.1A7 7 0 0012 2z"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Relato IA
          </span>
        </router-link>

        <!-- Separador Reportes -->
        <div class="w-5 h-px bg-gray-300 my-1"></div>

        <!-- Grupo Reportes -->
        <div class="relative w-full flex items-center justify-center px-1.5 h-10" ref="reportsAnchor">
          <button
            @click="toggleReports"
            class="group w-full h-full flex items-center justify-center rounded-lg transition-all relative"
            :class="isReportRoute ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'"
            title="Reportes y Dashboards"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span v-if="!reportsOpen" class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
              Reportes
            </span>
          </button>

          <!-- Dropdown Reportes -->
                      <div
              v-if="reportsOpen"
              class="reports-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-[130] w-64 flex flex-col py-1"
              :style="reportsDropdownStyle"
            >
              <div class="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1" style="display:flex; justify-content: space-between; align-items: center;">
                Reportes y Dashboards
                <button @click.stop="reportsOpen = false" class="text-gray-400 hover:text-gray-600 md:hidden">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <router-link to="/resumen" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Resumen Ensayos
              </router-link>
              <router-link to="/resumen-cardas" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Resumen Ensayos Cardas
              </router-link>
              <router-link to="/resumen-semanal-hilanderia" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                Resumen Semanal Hil.
              </router-link>
              <router-link to="/analisis-calidad-fibra" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                Análisis Calidad Fibra
              </router-link>
              <router-link to="/informe-auditoria-lote" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Informe Auditoría Lote
              </router-link>
              <router-link to="/resumen-diario" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Resumen Diario
              </router-link>
              <router-link to="/dashboard-mezcla" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                Dashboard Mezcla → Hilo
              </router-link>
              <router-link to="/stats" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                Gráficos Ensayos
              </router-link>
              <div class="border-t border-gray-100 my-1"></div>
              <router-link to="/narrativa-costos" @click="reportsOpen = false" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Costos Análisis IA
              </router-link>
            </div>
          </div>

      </nav>

      <!-- Espaciador -->
      <div class="flex-1"></div>

      <!-- Selector de idioma -->
      <div class="group relative w-full flex items-center justify-center px-1.5 mb-1">
        <button
          @click="langOpen = !langOpen"
          class="w-full flex items-center justify-center h-10 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-all"
          :title="t('lang.select')"
        >
          <span class="text-[11px] font-bold leading-none">{{ currentLocale === 'pt-BR' ? 'PT' : 'ES' }}</span>
        </button>

        <!-- Dropdown idiomas -->
        <div
          v-if="langOpen"
          class="absolute left-full bottom-0 ml-3 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-[130] min-w-[150px]"
        >
          <div class="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
            {{ t('lang.select') }}
          </div>
          <button
            v-for="opt in LANG_OPTIONS"
            :key="opt.code"
            @click="setLocale(opt.code)"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors"
            :class="currentLocale === opt.code ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-700'"
          >
            <span>{{ opt.flag }}</span>
            <span>{{ opt.label }}</span>
            <svg v-if="currentLocale === opt.code" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 ml-auto text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>

    </aside>

    <!-- Contenido principal -->
    <main class="flex-1 overflow-auto" @click="langOpen = false">
      <router-view />
    </main>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const $route = useRoute();
const { t, locale } = useI18n();

const currentLocale = locale;
const langOpen = ref(false);
  const reportsOpen = ref(false);
  const reportsAnchor = ref(null);
  const reportsDropdownStyle = ref({});
  const reportRoutes = ['/resumen', '/resumen-cardas', '/resumen-semanal-hilanderia', '/analisis-calidad-fibra', '/informe-auditoria-lote', '/resumen-diario', '/dashboard-mezcla', '/stats'];
  const isReportRoute = computed(() => reportRoutes.includes($route.path));

  const DROPDOWN_HEIGHT = 360; // approx: header + 8 items
  const VIEWPORT_MARGIN = 8;

  function computeReportsPosition() {
    const el = reportsAnchor.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const left = rect.right + 12; // ml-3
    const spaceBelow = vh - rect.top;
    let top;
    if (spaceBelow >= DROPDOWN_HEIGHT + VIEWPORT_MARGIN) {
      top = rect.top;
    } else {
      // anchor near bottom of viewport, leaving margin
      top = Math.max(VIEWPORT_MARGIN, vh - DROPDOWN_HEIGHT - VIEWPORT_MARGIN);
    }
    reportsDropdownStyle.value = { top: `${top}px`, left: `${left}px`, maxHeight: `${vh - top - VIEWPORT_MARGIN}px`, overflowY: 'auto' };
  }

  async function toggleReports() {
    reportsOpen.value = !reportsOpen.value;
    if (reportsOpen.value) {
      await nextTick();
      computeReportsPosition();
    }
  }

  function onWindowResize() {
    if (reportsOpen.value) computeReportsPosition();
  }
  onMounted(() => {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('scroll', onWindowResize, true);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('scroll', onWindowResize, true);
  });

  const LANG_OPTIONS = [
  { code: 'es',    flag: '🇦🇷', label: 'Español' },
  { code: 'pt-BR', flag: '🇧🇷', label: 'Português (BR)' },
];

const setLocale = (code) => {
  locale.value = code;
  localStorage.setItem('stc_locale', code);
  langOpen.value = false;
};
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Item activo dentro del dropdown de Reportes */
.reports-dropdown a.router-link-active {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.10), rgba(99, 102, 241, 0.02));
  color: #4338ca;
  font-weight: 600;
  box-shadow: inset 3px 0 0 0 #6366f1, 0 1px 2px rgba(99, 102, 241, 0.08);
}
.reports-dropdown a.router-link-active svg {
  color: #6366f1;
}
</style>


