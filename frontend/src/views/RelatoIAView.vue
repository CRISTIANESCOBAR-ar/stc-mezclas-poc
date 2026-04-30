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

              <div class="pt-1">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Exportar</p>
                <div class="flex flex-col gap-1">
                  <button @click="exportarImagen" :disabled="!!exporting"
                    class="w-full px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                    :class="exporting === 'png' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                    {{ exporting === 'png' ? '⏳ Generando…' : '🖼 Imagen (.png)' }}
                  </button>
                  <button @click="exportarPDF" :disabled="!!exporting"
                    class="w-full px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                    :class="exporting === 'pdf' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                    {{ exporting === 'pdf' ? '⏳ Generando…' : '📄 PDF A4 (.pdf)' }}
                  </button>
                  <button @click="exportarDOCX" :disabled="!!exporting"
                    class="w-full px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                    :class="exporting === 'docx' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                    {{ exporting === 'docx' ? '⏳ Generando…' : '📝 Word (.docx)' }}
                  </button>
                </div>
              </div>
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
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, TableRow, TableCell, Table,
  WidthType, ShadingType,
} from 'docx'

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
const fuenteBanner = computed(() => {
  const f = fuente.value
  if (f === 'gemini') {
    const m = modelo.value ? ` <span style="opacity:.75">· ${modelo.value.replace('gemini-', '')}</span>` : ''
    return `<div class="fuente-banner fuente-gemini" role="note">✨ <strong>Análisis generado por IA</strong> — Google Gemini${m}</div>`
  }
  if (f === 'cache') {
    return `<div class="fuente-banner fuente-cache" role="note">💾 <strong>Análisis recuperado del caché</strong> — generado previamente por Gemini</div>`
  }
  if (f === 'local') {
    return `<div class="fuente-banner fuente-local" role="note">⚡ <strong>Fallback local (sin IA)</strong> — Gemini no disponible. Generado por reglas internas.</div>`
  }
  return ''
})

const narrativaHtml = computed(() => {
  if (!narrativa.value) return ''
  try {
    const body = DOMPurify.sanitize(marked.parse(narrativa.value), { ADD_ATTR: ['role'] })
    return fuenteBanner.value + body
  } catch { return '' }
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

const exporting = ref('')  // '' | 'png' | 'pdf' | 'docx'

function baseFilename() {
  return `informe-${lotesInput.value.replace(/[^0-9,]/g, '').replace(/,/g, '-')}-${fechaInput.value}`
}

async function exportarImagen() {
  if (!docRef.value) return
  exporting.value = 'png'
  try {
    const dataUrl = await toPng(docRef.value, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      style: { borderRadius: '0' },
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${baseFilename()}.png`
    a.click()
  } catch (e) {
    alert('Error al generar imagen: ' + e.message)
  } finally {
    exporting.value = ''
  }
}

async function exportarPDF() {
  if (!docRef.value) return
  exporting.value = 'pdf'
  try {
    const dataUrl = await toPng(docRef.value, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      style: { borderRadius: '0' },
    })
    const img = new Image()
    img.src = dataUrl
    await new Promise(resolve => { img.onload = resolve })

    // A4 en puntos: 595 x 842
    const A4_W = 595
    const A4_H = 842
    const MARGIN = 28  // ~10mm en puntos
    const usableW = A4_W - MARGIN * 2

    const imgW = img.naturalWidth
    const imgH = img.naturalHeight
    const scale = usableW / imgW
    const scaledH = imgH * scale

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    let y = MARGIN
    let remaining = scaledH

    while (remaining > 0) {
      const pageH = A4_H - MARGIN * 2
      const sliceH = Math.min(remaining, pageH)
      // srcY en píxeles de la imagen original correspondiente a este slice
      const srcY = (scaledH - remaining) / scale
      const srcSliceH = sliceH / scale

      // Canvas temporal para recortar el slice
      const canvas = document.createElement('canvas')
      canvas.width = imgW
      canvas.height = Math.ceil(srcSliceH)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, -srcY)
      const sliceUrl = canvas.toDataURL('image/png')

      pdf.addImage(sliceUrl, 'PNG', MARGIN, y, usableW, sliceH)
      remaining -= sliceH
      if (remaining > 0) {
        pdf.addPage()
        y = MARGIN
      }
    }

    pdf.save(`${baseFilename()}.pdf`)
  } catch (e) {
    alert('Error al generar PDF: ' + e.message)
  } finally {
    exporting.value = ''
  }
}

async function exportarDOCX() {
  if (!docRef.value) return
  exporting.value = 'docx'
  try {
    const el = docRef.value
    const children = []

    function runFromSpan(span) {
      const text = span.textContent || ''
      const bold = span.style.fontWeight === 'bold' || span.tagName === 'STRONG'
      const italic = span.style.fontStyle === 'italic' || span.tagName === 'EM'
      const code = span.tagName === 'CODE'
      return new TextRun({
        text,
        bold: bold || code,
        italics: italic,
        font: code ? 'Courier New' : 'Calibri',
        size: code ? 18 : 22,
        color: code ? 'BE185D' : undefined,
      })
    }

    function nodeToRuns(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        if (!text) return []
        return [new TextRun({ text, font: 'Calibri', size: 22 })]
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return []
      const tag = node.tagName
      if (tag === 'STRONG' || tag === 'B')
        return [new TextRun({ text: node.textContent || '', bold: true, font: 'Calibri', size: 22 })]
      if (tag === 'EM' || tag === 'I')
        return [new TextRun({ text: node.textContent || '', italics: true, font: 'Calibri', size: 22 })]
      if (tag === 'CODE')
        return [new TextRun({ text: node.textContent || '', font: 'Courier New', size: 18, color: 'BE185D' })]
      return Array.from(node.childNodes).flatMap(nodeToRuns)
    }

    function parseParagraph(node) {
      const runs = Array.from(node.childNodes).flatMap(nodeToRuns)
      return new Paragraph({ children: runs, spacing: { after: 100 }, style: 'Normal' })
    }

    function parseTable(tableEl) {
      const rows = Array.from(tableEl.querySelectorAll('tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map(td => {
          const isHeader = td.tagName === 'TH'
          return new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: td.textContent?.trim() || '',
                bold: isHeader,
                font: 'Calibri',
                size: isHeader ? 18 : 20,
                color: isHeader ? '334155' : undefined,
              })],
            })],
            shading: isHeader ? { type: ShadingType.SOLID, color: 'F1F5F9' } : undefined,
          })
        })
        return new TableRow({ children: cells })
      })
      return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          left:   { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          right:  { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          insideH:{ style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          insideV:{ style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        },
      })
    }

    function walkNode(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const tag = node.tagName

      if (tag === 'H1') {
        children.push(new Paragraph({
          text: node.textContent?.trim() || '',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 120 },
        }))
      } else if (tag === 'H2') {
        children.push(new Paragraph({
          text: node.textContent?.trim() || '',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        }))
      } else if (tag === 'H3') {
        children.push(new Paragraph({
          text: node.textContent?.trim() || '',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        }))
      } else if (tag === 'P') {
        children.push(parseParagraph(node))
      } else if (tag === 'BLOCKQUOTE') {
        children.push(new Paragraph({
          children: [new TextRun({ text: node.textContent?.trim() || '', italics: true, color: '4F46E5', font: 'Calibri', size: 20 })],
          indent: { left: 400 },
          spacing: { before: 80, after: 80 },
          border: { left: { style: BorderStyle.THICK, size: 6, color: '6366F1' } },
        }))
      } else if (tag === 'UL' || tag === 'OL') {
        Array.from(node.querySelectorAll(':scope > li')).forEach((li, idx) => {
          const bullet = tag === 'OL' ? `${idx + 1}. ` : '• '
          children.push(new Paragraph({
            children: [new TextRun({ text: bullet + (li.textContent?.trim() || ''), font: 'Calibri', size: 22 })],
            indent: { left: 400 },
            spacing: { after: 60 },
          }))
        })
      } else if (tag === 'TABLE') {
        children.push(parseTable(node))
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }))
      } else if (tag === 'HR') {
        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' } },
          spacing: { before: 100, after: 100 },
          text: '',
        }))
      } else {
        // div, article, section, etc. — recursar
        Array.from(node.childNodes).forEach(walkNode)
      }
    }

    Array.from(el.childNodes).forEach(walkNode)

    const doc = new Document({
      styles: {
        default: {
          document: { run: { font: 'Calibri', size: 22 } },
        },
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },   // A4 en twentieths of a point
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },  // ~2cm
          },
        },
        children,
      }],
    })

    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseFilename()}.docx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Error al generar DOCX: ' + e.message)
  } finally {
    exporting.value = ''
  }
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
.narrativa-prose :deep(.fuente-banner) {
  display: block; margin: 0 0 1.25rem; padding: .75rem 1rem;
  border-radius: .5rem; font-size: 13px; font-weight: 500;
  border-left: 4px solid currentColor;
}
.narrativa-prose :deep(.fuente-banner strong) { font-weight: 700; }
.narrativa-prose :deep(.fuente-gemini) { background: #f5f3ff; color: #6d28d9; border-color: #8b5cf6; }
.narrativa-prose :deep(.fuente-cache)  { background: #ecfdf5; color: #047857; border-color: #10b981; }
.narrativa-prose :deep(.fuente-local)  { background: #fef3c7; color: #92400e; border-color: #f59e0b; }
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
