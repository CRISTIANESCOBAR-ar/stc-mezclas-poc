<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Toolbar superior -->
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
      <div class="max-w-6xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 mr-auto">
          <span class="text-2xl">🧶</span>
          <div>
            <h1 class="text-base md:text-lg font-bold text-slate-800 leading-tight">Informe Estratégico de Hilandería</h1>
            <p class="text-[11px] text-slate-500 leading-tight">Análisis IA · Cruce Fibra ↔ Hilo ↔ Producción OE</p>
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Lotes</label>
            <input v-model="lotesInput" placeholder="113, 114, 115"
              class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fecha</label>
            <CustomDatepicker v-model="fechaInput" :show-buttons="false" />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Formato</label>
            <select v-model="formato" class="rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
              <option value="actual">Actual</option>
              <option value="estrategico">Estratégico</option>
            </select>
          </div>
          <button @click="cargar(false)" :disabled="loading"
            class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {{ loading ? 'Generando…' : (narrativa ? '↺ Recargar' : '✨ Generar') }}
          </button>
          <button v-if="narrativa" @click="cargar(true)" :disabled="loading"
            class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
            title="Regenerar ignorando caché">
            ⟲ Forzar IA
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <!-- Estado vacío -->
      <div v-if="!narrativa && !loading && !error" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div class="text-5xl mb-3">📑</div>
        <h2 class="text-lg font-bold text-slate-700">Generá tu informe</h2>
        <p class="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Indicá los lotes a auditar y la fecha. La IA cruzará Fibra (HVI), Hilo (Uster · Tensorapid) y Producción OE.
        </p>
        <p class="text-xs text-slate-400 mt-3">Ejemplo: <code class="bg-gray-100 px-2 py-0.5 rounded">113, 114, 115</code></p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div class="inline-block animate-spin text-3xl">⟳</div>
        <p class="text-sm text-slate-500 mt-3">Procesando datos y generando narrativa…</p>
        <p class="text-[11px] text-slate-400 mt-1">Si la respuesta ya estaba en caché, será instantánea.</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
        ⚠️ {{ error }}
      </div>

      <!-- Aviso (cuota, fallback local, etc.) -->
      <div v-if="aviso" class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-4">
        ⚠️ {{ aviso }}
      </div>

      <!-- Layout documento técnico: TOC + contenido -->
      <div v-if="narrativa" class="grid lg:grid-cols-[220px_1fr] gap-6">
        <!-- TOC sticky -->
        <aside class="hidden lg:block">
          <div class="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contenido</p>
            <nav class="space-y-1">
              <a v-for="t in toc" :key="t.id" :href="`#${t.id}`"
                @click.prevent="scrollTo(t.id)"
                class="block text-xs px-2 py-1.5 rounded-md transition-colors"
                :class="activeId === t.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'">
                {{ t.title }}
              </a>
            </nav>

            <div class="mt-4 pt-3 border-t border-gray-100 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-slate-400 uppercase">Fuente</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  :class="fuenteBadgeClass">{{ fuenteLabel }}</span>
              </div>
              <button @click="copiarTodo"
                class="w-full px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                :class="copiado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                {{ copiado ? '✓ Copiado' : '📋 Copiar todo' }}
              </button>
              <button @click="descargarMarkdown"
                class="w-full px-2 py-1.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                ⬇ Descargar .md
              </button>
            </div>
          </div>
        </aside>

        <!-- Documento -->
        <article ref="docRef" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 narrativa-prose"
          v-html="narrativaHtml"></article>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import CustomDatepicker from '@/components/CustomDatepicker.vue'

marked.setOptions({ gfm: true, breaks: true })

const route = useRoute()
const router = useRouter()

function defaultYesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ── Estado ──
const lotesInput = ref(String(route.query.lotes || ''))
const fechaInput = ref(String(route.query.fecha || defaultYesterdayISO()))
const formato = ref(String(route.query.formato || 'actual'))
const loading = ref(false)
const error = ref('')
const aviso = ref('')
const narrativa = ref('')
const fuente = ref('')   // 'gemini' | 'cache' | 'local'
const modelo = ref('')
const copiado = ref(false)
const docRef = ref(null)
const activeId = ref('')

// ── Render Markdown ──
const narrativaHtml = computed(() => {
  if (!narrativa.value) return ''
  try { return DOMPurify.sanitize(marked.parse(narrativa.value)) } catch { return '' }
})

// ── TOC: extrae H1/H2 después de renderizar ──
const toc = ref([])
let scrollEl = null // contenedor con scroll real (main.overflow-auto) o window

function findScrollParent(el) {
  let p = el?.parentElement
  while (p && p !== document.body) {
    const s = getComputedStyle(p)
    if (/(auto|scroll|overlay)/.test(s.overflowY)) return p
    p = p.parentElement
  }
  return window
}

function buildToc() {
  if (!docRef.value) return
  // (Re)detectar el contenedor con scroll real ahora que el artículo existe
  const newScrollEl = findScrollParent(docRef.value)
  if (newScrollEl !== scrollEl) {
    if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
    scrollEl = newScrollEl
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
  }
  const headings = docRef.value.querySelectorAll('h1, h2')
  toc.value = Array.from(headings).map((h, idx) => {
    if (!h.id) h.id = `sec-${idx}-${(h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
    return { id: h.id, title: h.textContent.trim(), level: h.tagName }
  })
}

function scrollTo(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (scrollEl && scrollEl !== window) {
    const top = el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop - 80
    scrollEl.scrollTo({ top, behavior: 'smooth' })
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'smooth' })
  }
  activeId.value = id
}

function onScroll() {
  if (!toc.value.length || !scrollEl) return
  const containerTop = scrollEl === window ? 0 : scrollEl.getBoundingClientRect().top
  const threshold = containerTop + 130
  let current = toc.value[0].id
  for (const t of toc.value) {
    const el = document.getElementById(t.id)
    if (el && el.getBoundingClientRect().top <= threshold) current = t.id
  }
  activeId.value = current
}

// ── Badges ──
const fuenteLabel = computed(() => {
  if (fuente.value === 'gemini') return `✨ Gemini${modelo.value ? ' · ' + modelo.value.replace('gemini-', '') : ''}`
  if (fuente.value === 'cache') return '💾 Caché'
  if (fuente.value === 'local') return '⚡ Local'
  return '—'
})
const fuenteBadgeClass = computed(() => {
  if (fuente.value === 'gemini') return 'bg-purple-100 text-purple-700'
  if (fuente.value === 'cache') return 'bg-emerald-100 text-emerald-700'
  if (fuente.value === 'local') return 'bg-slate-100 text-slate-600'
  return 'bg-slate-100 text-slate-500'
})

// ── Acciones ──
async function copiarTodo() {
  try {
    await navigator.clipboard.writeText(narrativa.value)
    copiado.value = true
    setTimeout(() => { copiado.value = false }, 2000)
  } catch { /* fallback omitido */ }
}

function descargarMarkdown() {
  const blob = new Blob([narrativa.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `informe-${lotesInput.value.replace(/\s+/g, '')}-${fechaInput.value}.md`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Carga: 1) trae rows del dashboard 2) llama narrativa ──
async function cargar(force = false) {
  if (!lotesInput.value.trim() || !fechaInput.value) {
    error.value = 'Indicá lotes y fecha.'
    return
  }
  loading.value = true
  error.value = ''
  aviso.value = ''
  narrativa.value = ''

  // sync URL para que sea compartible
  router.replace({ query: { lotes: lotesInput.value, fecha: fechaInput.value, formato: formato.value } })

  try {
    const lotesClean = lotesInput.value.replace(/[^0-9,]/g, '').replace(/,+/g, ',').replace(/^,|,$/g, '')
    const params = new URLSearchParams({ lotes: lotesClean, fecha: fechaInput.value })
    const dashRes = await fetch(`/api/dashboard/mezcla-lotes?${params}`)
    const dashData = await dashRes.json()
    if (!dashRes.ok) throw new Error(dashData.error || 'Error al obtener datos del dashboard')

    const rowsData = dashData.rows || []
    if (!rowsData.length) {
      error.value = 'No hay datos para esos lotes en la fecha indicada.'
      return
    }

    const narrRes = await fetch('/api/dashboard/narrativa-lotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: rowsData,
        proveedores: dashData.proveedores || [],
        cardas: dashData.cardas || null,
        fecha: fechaInput.value,
        formato: formato.value,
        forceRefresh: force,
      })
    })
    const narrData = await narrRes.json()
    if (!narrData.success) throw new Error(narrData.error || 'No se pudo generar el informe')

    narrativa.value = narrData.narrativa || ''
    fuente.value = narrData.fuente || ''
    modelo.value = narrData.modelo || ''
    aviso.value = narrData.avisoModelo || narrData.aviso || ''

    await nextTick()
    buildToc()
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

// ── Auto-cargar si vienen query params ──
onMounted(() => {
  // Detectar contenedor con scroll real (en este shell es <main class="overflow-auto">)
  scrollEl = findScrollParent(docRef.value)
  scrollEl.addEventListener('scroll', onScroll, { passive: true })
  if (lotesInput.value.trim() && fechaInput.value) {
    cargar(false)
  }
})
onBeforeUnmount(() => {
  if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
})

// Reaccionar si cambian query params externos
watch(() => route.query, (q) => {
  if (q.lotes && q.lotes !== lotesInput.value) lotesInput.value = String(q.lotes)
  if (q.fecha && q.fecha !== fechaInput.value) fechaInput.value = String(q.fecha)
  if (q.formato && q.formato !== formato.value) formato.value = String(q.formato)
})
</script>

<style scoped>
.narrativa-prose { color: #334155; line-height: 1.65; font-size: 15px; }
.narrativa-prose :deep(h1) {
  font-size: 1.65rem; font-weight: 800; color: #0f172a; margin: 0 0 .8rem;
  letter-spacing: -.01em; padding-bottom: .5rem; border-bottom: 2px solid #e2e8f0;
}
.narrativa-prose :deep(h2) {
  font-size: 1.2rem; font-weight: 700; color: #1e293b; margin: 1.6rem 0 .7rem;
  padding-bottom: .35rem; border-bottom: 1px solid #e2e8f0; scroll-margin-top: 100px;
}
.narrativa-prose :deep(h3) {
  font-size: 1rem; font-weight: 700; color: #334155; margin: 1.1rem 0 .45rem; scroll-margin-top: 100px;
}
.narrativa-prose :deep(p) { margin: .5rem 0; }
.narrativa-prose :deep(ul), .narrativa-prose :deep(ol) { margin: .5rem 0 .8rem 1.2rem; }
.narrativa-prose :deep(li) { margin: .25rem 0; }
.narrativa-prose :deep(strong) { color: #0f172a; font-weight: 700; }
.narrativa-prose :deep(em) { color: #475569; font-style: italic; }
.narrativa-prose :deep(code) {
  background: #f1f5f9; padding: .1rem .4rem; border-radius: .35rem;
  font-size: .88em; color: #be185d; font-family: ui-monospace, 'SF Mono', monospace;
}
.narrativa-prose :deep(blockquote) {
  margin: .8rem 0; padding: .65rem 1rem; border-left: 3px solid #6366f1;
  background: linear-gradient(90deg, rgba(99,102,241,.08), rgba(99,102,241,.01));
  color: #334155; border-radius: .5rem; font-style: italic;
}
.narrativa-prose :deep(table) {
  width: 100%; border-collapse: collapse; margin: .9rem 0; font-size: .85rem;
  border: 1px solid #e2e8f0; border-radius: .6rem; overflow: hidden;
}
.narrativa-prose :deep(thead) { background: #f1f5f9; }
.narrativa-prose :deep(th), .narrativa-prose :deep(td) {
  padding: .55rem .75rem; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top;
}
.narrativa-prose :deep(th) {
  font-weight: 700; color: #334155; font-size: .75rem;
  text-transform: uppercase; letter-spacing: .03em;
}
.narrativa-prose :deep(tr:last-child td) { border-bottom: 0; }
.narrativa-prose :deep(tr:nth-child(even) td) { background: #fafafa; }
.narrativa-prose :deep(hr) { border: 0; border-top: 1px dashed #cbd5e1; margin: 1.2rem 0; }
.narrativa-prose :deep(a) { color: #4f46e5; text-decoration: underline; text-decoration-color: rgba(99,102,241,.3); }
</style>
