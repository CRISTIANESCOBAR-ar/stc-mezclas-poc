<template>
  <div class="h-screen flex flex-col bg-gray-50 overflow-hidden font-sans">
    <!-- Header -->
    <header class="flex-none h-10 bg-blue-900 flex items-center px-4 shadow-md z-50">
      <div class="flex items-center gap-4">
        <h1 class="text-white font-bold text-sm tracking-wide uppercase">STC PoC</h1>
        <nav class="flex gap-4 ml-6">
          <router-link 
            to="/inventario" 
            class="text-blue-100/70 hover:text-white text-xs font-semibold px-2 py-1 rounded transition-colors"
            active-class="text-white bg-blue-800"
          >
            INVENTARIO
          </router-link>
          <router-link 
            to="/configuracion-estandares" 
            class="text-blue-100/70 hover:text-white text-xs font-semibold px-2 py-1 rounded transition-colors"
            active-class="text-white bg-blue-800"
          >
            CONFIGURACIÓN
          </router-link>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto bg-gray-100">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// Layout base para la PoC reducida
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
