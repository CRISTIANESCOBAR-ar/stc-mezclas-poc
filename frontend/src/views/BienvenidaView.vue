<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <main class="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <!-- Encabezado -->
      <div class="mb-6">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
              👋 Bienvenido al Optimizador STC
            </h1>
            <p class="text-sm text-gray-500 mt-1">
              Selecciona una vista para comenzar. Cada tarjeta describe brevemente qué información encontrarás.
            </p>
          </div>
          <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="checkbox" v-model="hideWelcome" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span>No mostrar al iniciar</span>
          </label>
        </div>
      </div>

      <!-- Grid de cards por categoría -->
      <section v-for="cat in categorias" :key="cat.titulo" class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500">{{ cat.titulo }}</span>
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-[10px] text-gray-400">{{ cat.items.length }} {{ cat.items.length === 1 ? 'vista' : 'vistas' }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <router-link
            v-for="item in cat.items"
            :key="item.path"
            :to="item.path"
            class="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-4 flex gap-3 items-start"
          >
            <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              :class="item.bg">
              {{ item.icon }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
                  {{ item.titulo }}
                </h3>
                <svg class="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
              <p class="text-xs text-gray-500 mt-1 leading-snug">{{ item.descripcion }}</p>
            </div>
          </router-link>
        </div>
      </section>

      <div class="text-center text-[11px] text-gray-400 mt-8">
        💡 Podés volver a esta pantalla escribiendo <code class="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">/bienvenida</code> en la URL.
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const STORAGE_KEY = 'stc_hide_welcome';

const hideWelcome = ref(localStorage.getItem(STORAGE_KEY) === '1');
watch(hideWelcome, (v) => {
  if (v) localStorage.setItem(STORAGE_KEY, '1');
  else localStorage.removeItem(STORAGE_KEY);
});

const categorias = [
  {
    titulo: 'Carga de ensayos',
    items: [
      { path: '/hvi',           icon: '🌿', bg: 'bg-emerald-50 text-emerald-600',
        titulo: 'HVI',                descripcion: 'Carga de archivos HVI con calidad de fibra de algodón (Mic, Long, Resist, etc.).' },
      { path: '/uster',         icon: '🧵', bg: 'bg-blue-50 text-blue-600',
        titulo: 'Uster Hilo',         descripcion: 'Carga de ensayos USTER de hilo: CVm, neps, vellosidad, adelgazamientos y engrosamientos.' },
      { path: '/uster-cardas',  icon: '🎛️', bg: 'bg-cyan-50 text-cyan-600',
        titulo: 'Uster Cardas',       descripcion: 'Carga de ensayos USTER de cinta de carda (CVm, A%CV, U%, etc.).' },
      { path: '/tensorapid',    icon: '💪', bg: 'bg-purple-50 text-purple-600',
        titulo: 'TensoRapid',         descripcion: 'Carga de ensayos de resistencia: tenacidad, elongación, fuerza y trabajo de rotura.' },
    ],
  },
  {
    titulo: 'Configuración y maestros',
    items: [
      { path: '/inventario',                icon: '📦', bg: 'bg-indigo-50 text-indigo-600',
        titulo: 'Inventario MP',            descripcion: 'Gestión del stock de fardos de algodón (materia prima) por lote y origen.' },
      { path: '/configuracion-estandares',  icon: '⚙️', bg: 'bg-slate-50 text-slate-600',
        titulo: 'Estándares y Mezclas',     descripcion: 'Definición de límites de calidad y composición de mezclas por título y producto.' },
    ],
  },
  {
    titulo: 'Trazabilidad y producción',
    items: [
      { path: '/oe-trazabilidad', icon: '🎯', bg: 'bg-amber-50 text-amber-600',
        titulo: 'Trazabilidad OE',  descripcion: 'Producción Open End por máquina/turno + USTER + TensoRapid + cardas alimentadoras + alertas y diagnóstico operativo IA.' },
      { path: '/dashboard-mezcla', icon: '🧪', bg: 'bg-rose-50 text-rose-600',
        titulo: 'Dashboard Mezcla', descripcion: 'Tablero de mezcla de hilo: comparación entre títulos y máquinas con criterio Aprobado / Condicional / Rechazado.' },
      { path: '/stats',            icon: '📈', bg: 'bg-blue-50 text-blue-600',
        titulo: 'Gráficos Ensayos', descripcion: 'Gráficos de control estadístico por título (LCL/UCL, media global, evolución diaria).' },
    ],
  },
  {
    titulo: 'Reportes',
    items: [
      { path: '/resumen',                       icon: '📋', bg: 'bg-teal-50 text-teal-600',
        titulo: 'Resumen Ensayos',              descripcion: 'Resumen consolidado de ensayos USTER de hilo en un rango de fechas.' },
      { path: '/resumen-cardas',                icon: '🗂️', bg: 'bg-cyan-50 text-cyan-600',
        titulo: 'Resumen Ensayos Cardas',       descripcion: 'Resumen de ensayos USTER de cinta de carda por máquina y alimentación.' },
      { path: '/resumen-semanal-hilanderia',    icon: '📅', bg: 'bg-emerald-50 text-emerald-600',
        titulo: 'Resumen Semanal Hilandería',   descripcion: 'Vista semanal con KPIs operativos y de calidad de toda la hilandería.' },
      { path: '/resumen-diario',                icon: '☀️', bg: 'bg-amber-50 text-amber-600',
        titulo: 'Resumen Diario',               descripcion: 'Vista diaria con producción, calidad y alertas del día seleccionado.' },
      { path: '/analisis-calidad-fibra',        icon: '🔬', bg: 'bg-lime-50 text-lime-600',
        titulo: 'Análisis Calidad Fibra',       descripcion: 'Análisis HVI con histogramas y métricas por origen del algodón.' },
      { path: '/informe-auditoria-lote',        icon: '🧾', bg: 'bg-fuchsia-50 text-fuchsia-600',
        titulo: 'Informe Auditoría Lote',       descripcion: 'Informe de auditoría completo de un lote: HVI + USTER + TensoRapid + producción + dictamen.' },
      { path: '/relato-ia',                     icon: '✨', bg: 'bg-indigo-50 text-indigo-600',
        titulo: 'Relato Integral IA',           descripcion: 'Narrativa generada por IA con interpretación de los indicadores del día/lote.' },
    ],
  },
];
</script>
