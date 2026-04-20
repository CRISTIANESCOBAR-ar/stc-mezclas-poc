<template>
  <div class="h-screen flex flex-row bg-gray-100 overflow-hidden font-sans">

    <!-- Sidebar izquierdo -->
    <aside class="flex-none w-12 flex flex-col items-center bg-gray-100 border-r border-gray-200 py-3 z-50 shadow-sm select-none">

      <!-- Logo -->
      <div class="mb-4 flex flex-col items-center">
        <img src="/LogoSantana.jpg" alt="Santana Textiles" class="w-8 h-8 object-contain rounded" />
      </div>

      <!-- Separador -->
      <div class="w-5 h-px bg-gray-300 mb-2"></div>

      <!-- Navegación -->
      <nav class="flex flex-col items-center gap-1 w-full px-1.5">

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
          class="absolute left-full bottom-0 ml-3 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-[150px]"
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
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const $route = useRoute();
const { t, locale } = useI18n();

const currentLocale = locale;
const langOpen = ref(false);

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
</style>

