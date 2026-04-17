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
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
          <span class="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-white border border-gray-200 shadow-md px-2 py-1 text-xs font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Inventario
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
            Configuración
          </span>
        </router-link>

      </nav>
    </aside>

    <!-- Contenido principal -->
    <main class="flex-1 overflow-auto">
      <router-view />
    </main>

  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
const $route = useRoute();
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
