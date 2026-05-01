<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <main class="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <!-- Encabezado -->
      <div class="mb-6">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
              {{ $t('bienvenida.title') }}
            </h1>
            <p class="text-sm text-gray-500 mt-1">
              {{ $t('bienvenida.subtitle') }}
            </p>
          </div>
          <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="checkbox" v-model="hideWelcome" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span>{{ $t('bienvenida.noShow') }}</span>
          </label>
        </div>
      </div>

      <!-- Grid de cards por categoría -->
      <section v-for="cat in categorias" :key="cat.titulo" class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500">{{ cat.titulo }}</span>
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-[10px] text-gray-400">{{ cat.items.length }} {{ cat.items.length === 1 ? $t('bienvenida.view') : $t('bienvenida.views') }}</span>
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
        💡 {{ $t('bienvenida.hint1') }} <code class="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono">/bienvenida</code> {{ $t('bienvenida.hint2') }}
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const STORAGE_KEY = 'stc_hide_welcome';
const { t } = useI18n();

const hideWelcome = ref(localStorage.getItem(STORAGE_KEY) === '1');
watch(hideWelcome, (v) => {
  if (v) localStorage.setItem(STORAGE_KEY, '1');
  else localStorage.removeItem(STORAGE_KEY);
});

const categorias = computed(() => [
  {
    titulo: t('bienvenida.cats.ensayos'),
    items: [
      { path: '/hvi',          icon: '🌿', bg: 'bg-emerald-50 text-emerald-600',
        titulo: t('bienvenida.cards.hvi.titulo'),           descripcion: t('bienvenida.cards.hvi.desc') },
      { path: '/uster',        icon: '🧵', bg: 'bg-blue-50 text-blue-600',
        titulo: t('bienvenida.cards.usterHilo.titulo'),     descripcion: t('bienvenida.cards.usterHilo.desc') },
      { path: '/uster-cardas', icon: '🎛️', bg: 'bg-cyan-50 text-cyan-600',
        titulo: t('bienvenida.cards.usterCardas.titulo'),   descripcion: t('bienvenida.cards.usterCardas.desc') },
      { path: '/tensorapid',   icon: '💪', bg: 'bg-purple-50 text-purple-600',
        titulo: t('bienvenida.cards.tensorapid.titulo'),    descripcion: t('bienvenida.cards.tensorapid.desc') },
    ],
  },
  {
    titulo: t('bienvenida.cats.config'),
    items: [
      { path: '/inventario',               icon: '📦', bg: 'bg-indigo-50 text-indigo-600',
        titulo: t('bienvenida.cards.inventario.titulo'),    descripcion: t('bienvenida.cards.inventario.desc') },
      { path: '/configuracion-estandares', icon: '⚙️', bg: 'bg-slate-50 text-slate-600',
        titulo: t('bienvenida.cards.estandares.titulo'),    descripcion: t('bienvenida.cards.estandares.desc') },
    ],
  },
  {
    titulo: t('bienvenida.cats.traz'),
    items: [
      { path: '/oe-trazabilidad', icon: '🎯', bg: 'bg-amber-50 text-amber-600',
        titulo: t('bienvenida.cards.trazOE.titulo'),        descripcion: t('bienvenida.cards.trazOE.desc') },
      { path: '/dashboard-mezcla', icon: '🧪', bg: 'bg-rose-50 text-rose-600',
        titulo: t('bienvenida.cards.dashMezcla.titulo'),    descripcion: t('bienvenida.cards.dashMezcla.desc') },
      { path: '/stats',            icon: '📈', bg: 'bg-blue-50 text-blue-600',
        titulo: t('bienvenida.cards.graficos.titulo'),      descripcion: t('bienvenida.cards.graficos.desc') },
    ],
  },
  {
    titulo: t('bienvenida.cats.reportes'),
    items: [
      { path: '/resumen',                    icon: '📋', bg: 'bg-teal-50 text-teal-600',
        titulo: t('bienvenida.cards.resumen.titulo'),        descripcion: t('bienvenida.cards.resumen.desc') },
      { path: '/resumen-cardas',             icon: '🗂️', bg: 'bg-cyan-50 text-cyan-600',
        titulo: t('bienvenida.cards.resumenCardas.titulo'),  descripcion: t('bienvenida.cards.resumenCardas.desc') },
      { path: '/resumen-semanal-hilanderia', icon: '📅', bg: 'bg-emerald-50 text-emerald-600',
        titulo: t('bienvenida.cards.resumenSemanal.titulo'), descripcion: t('bienvenida.cards.resumenSemanal.desc') },
      { path: '/resumen-diario',             icon: '☀️', bg: 'bg-amber-50 text-amber-600',
        titulo: t('bienvenida.cards.resumenDiario.titulo'),  descripcion: t('bienvenida.cards.resumenDiario.desc') },
      { path: '/analisis-calidad-fibra',     icon: '🔬', bg: 'bg-lime-50 text-lime-600',
        titulo: t('bienvenida.cards.calidadFibra.titulo'),   descripcion: t('bienvenida.cards.calidadFibra.desc') },
      { path: '/informe-auditoria-lote',     icon: '🧾', bg: 'bg-fuchsia-50 text-fuchsia-600',
        titulo: t('bienvenida.cards.auditoriaLote.titulo'),  descripcion: t('bienvenida.cards.auditoriaLote.desc') },
      { path: '/relato-ia',                  icon: '✨', bg: 'bg-indigo-50 text-indigo-600',
        titulo: t('bienvenida.cards.relatoIA.titulo'),       descripcion: t('bienvenida.cards.relatoIA.desc') },
    ],
  },
]);
</script>
