<template>
  <div class="p-4 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">
        💾 Visibilidad de Backups
      </h1>
      <button
        @click="cargar"
        :disabled="cargando"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {{ cargando ? 'Cargando…' : '↺ Actualizar' }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{{ error }}</div>

    <div v-if="data" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Trigger</p>
          <p class="text-xl font-bold" :class="data.trigger.enabled ? 'text-emerald-600' : 'text-red-600'">
            {{ data.trigger.enabled ? 'Habilitado' : 'Deshabilitado' }}
          </p>
          <p class="text-xs text-gray-400 mt-2 break-all">{{ data.trigger.scriptPath }}</p>
        </div>

        <div class="bg-white rounded-xl shadow p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Estado actual</p>
          <p class="text-xl font-bold" :class="triggerStateClass">
            {{ triggerStateLabel }}
          </p>
          <p class="text-xs text-gray-400 mt-2">Último motivo: {{ data.trigger.lastReason || '—' }}</p>
        </div>

        <div class="bg-white rounded-xl shadow p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Último full</p>
          <p class="text-lg font-bold text-slate-800">{{ data.latestFull?.name || '—' }}</p>
          <p class="text-xs text-gray-400 mt-2">{{ fileMeta(data.latestFull) }}</p>
        </div>

        <div class="bg-white rounded-xl shadow p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Último enfocado</p>
          <p class="text-lg font-bold text-slate-800">{{ data.latestFocused?.name || '—' }}</p>
          <p class="text-xs text-gray-400 mt-2">{{ fileMeta(data.latestFocused) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="dir in data.directories"
          :key="dir.disk"
          class="bg-white rounded-xl shadow p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Disco {{ dir.disk }}
            </h2>
            <span
              class="px-2 py-0.5 rounded-full text-xs font-semibold"
              :class="dir.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
            >
              {{ dir.available ? 'Disponible' : 'No accesible' }}
            </span>
          </div>
          <p class="text-xs text-gray-500 break-all mb-3">{{ dir.dir }}</p>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div class="rounded-lg bg-slate-50 px-3 py-2">
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Full</p>
              <p class="font-bold text-slate-700">{{ countByCategory(dir.files, 'full') }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Enfocados</p>
              <p class="font-bold text-slate-700">{{ countByCategory(dir.files, 'focused') }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
              <p class="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Otros</p>
              <p class="font-bold text-slate-700">{{ dir.files.length - countByCategory(dir.files, 'full') - countByCategory(dir.files, 'focused') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Backups recientes</h2>
          <span class="text-xs text-gray-400">Mostrando {{ data.recent.length }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-left text-gray-500 border-b border-gray-200 whitespace-nowrap">
                <th class="pb-2 pr-3">Fecha/hora</th>
                <th class="pb-2 pr-3">Archivo</th>
                <th class="pb-2 pr-3">Tipo</th>
                <th class="pb-2 pr-3">Disco</th>
                <th class="pb-2 text-right">Tamaño</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="file in data.recent"
                :key="`${file.disk}-${file.fullPath}`"
                class="border-b border-gray-100 hover:bg-gray-50"
              >
                <td class="py-2 pr-3 text-gray-500 whitespace-nowrap">{{ formatFecha(file.modifiedAt) }}</td>
                <td class="py-2 pr-3 font-mono text-[11px] text-slate-700">{{ file.name }}</td>
                <td class="py-2 pr-3">
                  <span class="px-1.5 py-0.5 rounded text-[11px] font-semibold" :class="categoryClass(file.category)">
                    {{ categoryLabel(file.category) }}
                  </span>
                </td>
                <td class="py-2 pr-3 font-semibold text-slate-600">{{ file.disk }}:</td>
                <td class="py-2 text-right tabular-nums text-slate-700">{{ formatSize(file.sizeBytes) }}</td>
              </tr>
              <tr v-if="!data.recent.length">
                <td colspan="5" class="py-6 text-center text-gray-400">Sin backups detectados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const cargando = ref(false)
const error = ref(null)
const data = ref(null)

const triggerStateLabel = computed(() => {
  if (!data.value?.trigger) return '—'
  if (data.value.trigger.running) return 'Ejecutando'
  if (data.value.trigger.pending) return 'Pendiente'
  return 'En espera'
})

const triggerStateClass = computed(() => {
  if (!data.value?.trigger) return 'text-slate-600'
  if (data.value.trigger.running) return 'text-amber-600'
  if (data.value.trigger.pending) return 'text-blue-600'
  return 'text-slate-700'
})

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const res = await fetch('/api/dashboard/backups')
    const payload = await res.json()
    if (!res.ok || !payload.ok) throw new Error(payload.error || `HTTP ${res.status}`)
    data.value = payload
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    cargando.value = false
  }
}

function countByCategory(files, category) {
  return (files || []).filter((file) => file.category === category).length
}

function categoryLabel(category) {
  if (category === 'full') return 'Full'
  if (category === 'focused') return 'Enfocado'
  if (category === 'legacy-uster') return 'Legacy Uster'
  return 'Otro'
}

function categoryClass(category) {
  if (category === 'full') return 'bg-indigo-100 text-indigo-700'
  if (category === 'focused') return 'bg-emerald-100 text-emerald-700'
  if (category === 'legacy-uster') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-700'
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatSize(bytes) {
  const num = Number(bytes)
  if (!Number.isFinite(num)) return '—'
  if (num >= 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(2)} MB`
  return `${(num / 1024).toFixed(1)} KB`
}

function fileMeta(file) {
  if (!file) return '—'
  return `${file.disk}: · ${formatFecha(file.modifiedAt)} · ${formatSize(file.sizeBytes)}`
}

onMounted(cargar)
</script>