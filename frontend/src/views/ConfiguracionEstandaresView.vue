<template>
  <div class="p-3 bg-gray-50 min-h-screen" @click.self="hideTooltip">

    <!-- ── Tooltip flotante HVI (fixed, mismo estilo que proyecto base) ── -->
    <div
      v-if="tooltipVisible"
      :style="{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        transform: tooltipPlacement === 'top'    ? 'translate(-50%, -100%)' :
                   tooltipPlacement === 'bottom' ? 'translate(-50%, 0)'     :
                   tooltipPlacement === 'left'   ? 'translate(-100%, 0)'    : 'translate(0, 0)'
      }"
      class="fixed z-50 w-[320px] bg-white text-slate-700 rounded-lg shadow-2xl border border-slate-200 pointer-events-none"
    >
      <div v-html="hviTooltips[tooltipVisible]"></div>
      <div v-if="tooltipPlacement === 'top'"
           class="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white drop-shadow-sm"></div>
      <div v-if="tooltipPlacement === 'bottom'"
           class="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px border-8 border-transparent border-b-white drop-shadow-sm"></div>

    </div>

    <!-- Header -->
    <div class="flex items-start justify-between mb-3 gap-4">
      <div class="shrink-0">
        <h1 class="text-2xl font-bold text-gray-800">⚙️ Configuración de Estándares</h1>
        <p class="text-sm text-gray-500 mt-1">Tolerancias y límites para el optimizador de mezclas · fuente: PostgreSQL</p>
      </div>

    </div>

    <!-- Banner -->
    <div v-if="bannerState.text" class="mb-5 rounded-lg px-4 py-3 text-sm font-medium"
         :class="bannerState.ok ? 'bg-green-50 border border-green-300 text-green-800' : 'bg-red-50 border border-red-300 text-red-800'">
      {{ bannerState.text }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-lg shadow p-12 text-center text-slate-400 text-sm">
      Cargando estándares…
    </div>

    <!-- ── Layout dos columnas ── -->
    <template v-else>
      <div class="flex gap-3 items-start">

        <!-- ── COLUMNA IZQUIERDA: Tabla de tolerancias ── -->
        <div class="shrink-0 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="font-bold text-slate-700 text-sm">Reglas de Mezcla — <span class="text-indigo-600">{{ versionActual }}</span></h2>
              <span class="text-xs text-slate-400">{{ tolerancias.length }} parámetros</span>
            </div>
            <button
              @click="guardar"
              :disabled="loading"
              class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-md shadow-sm transition-all active:scale-95"
            >
              <span v-if="loading">Guardando…</span>
              <span v-else>💾 Guardar cambios</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-auto text-left text-sm border-collapse">
              <thead class="bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th class="px-3 py-2 whitespace-nowrap">Parámetro</th>
                  <th class="px-3 py-2 text-center bg-yellow-50 whitespace-nowrap w-24">Tol. Min</th>
                  <th class="px-3 py-2 text-center bg-yellow-50 whitespace-nowrap w-24">Tol. Max</th>
                  <th class="px-3 py-2 text-center bg-green-50 whitespace-nowrap w-24">% Ideal Min</th>
                  <th class="px-3 py-2 text-center bg-green-50 whitespace-nowrap w-28">Val. Ideal Min</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(row, i) in tolerancias" :key="row.parametro"
                    class="hover:bg-indigo-50/30 transition-colors">
                  <td class="px-3 py-1">
                    <div class="flex items-center gap-1">
                      <span class="font-mono font-bold text-indigo-700 text-xs">{{ row.parametro }}</span>
                      <div
                        v-if="hviTooltips[row.parametro]"
                        class="relative inline-flex items-center justify-center"
                        @mouseenter="showTooltip($event, row.parametro)"
                        @mouseleave="hideTooltip"
                        @click="showTooltip($event, row.parametro)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-400 hover:text-emerald-600 cursor-help transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round" />
                          <path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-1 text-center bg-yellow-50/30">
                    <input v-model.number="tolerancias[i].rango_tol_min" type="number" step="0.01"
                      class="w-16 text-center border border-yellow-200 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />
                  </td>
                  <td class="px-3 py-1 text-center bg-yellow-50/30">
                    <input v-model.number="tolerancias[i].rango_tol_max" type="number" step="0.01"
                      class="w-16 text-center border border-yellow-200 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-yellow-400 bg-yellow-50" />
                  </td>
                  <td class="px-3 py-1 text-center bg-green-50/30">
                    <input v-model.number="tolerancias[i].porcentaje_min_ideal" type="number" step="0.1"
                      class="w-16 text-center border border-green-200 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-green-400 bg-green-50" />
                  </td>
                  <td class="px-3 py-1 text-center bg-green-50/30">
                    <input v-model.number="tolerancias[i].valor_ideal_min" type="number" step="0.01"
                      class="w-16 text-center border border-green-200 rounded px-1 py-1 text-xs focus:ring-2 focus:ring-green-400 bg-green-50" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Leyenda -->
          <div class="px-3 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3 text-xs text-slate-600">
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300"></span> Tolerancia</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-green-100 border border-green-300"></span> Zona ideal</span>
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Hover para definición HVI
            </span>
          </div>
        </div>

        <!-- ── COLUMNA DERECHA: Algoritmos predeterminados ── -->
        <div class="flex-1 min-w-0 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-3 py-2 bg-slate-50 border-b border-slate-200">
            <h2 class="font-bold text-slate-700 text-sm">Algoritmo Predeterminado</h2>
            <p class="text-xs text-slate-400">Se cargará al abrir Inventario</p>
          </div>

          <div class="p-2 grid grid-cols-3 gap-2">
            <label
              v-for="alg in ALGORITHMS"
              :key="alg.key"
              :for="`alg-${alg.key}`"
              class="block cursor-pointer rounded-lg border-2 p-2.5 transition-all"
              :class="defaultAlgorithm === alg.key
                ? `${alg.activeBorder} ${alg.activeBg}`
                : 'border-slate-200 bg-white hover:border-slate-300'"
            >
              <!-- Radio + título + badge -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <input
                    type="radio"
                    :id="`alg-${alg.key}`"
                    name="defaultAlgorithm"
                    :value="alg.key"
                    v-model="defaultAlgorithm"
                    @change="saveDefaultAlgorithm"
                    class="accent-indigo-600"
                  />
                  <span class="text-sm font-bold" :class="defaultAlgorithm === alg.key ? alg.activeText : 'text-slate-700'">
                    {{ alg.title }}
                  </span>
                </div>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="alg.badgeClass">
                  {{ alg.badge }}
                </span>
              </div>
              <!-- Descripción -->
              <p class="text-xs text-slate-600 leading-relaxed mb-2">{{ alg.description }}</p>
              <!-- Ejemplo -->
              <div class="rounded-md bg-slate-50 border border-slate-200 p-2">
                <p class="text-[11px] font-semibold text-slate-700 mb-0.5">Ejemplo práctico</p>
                <p class="text-[11px] text-slate-500 leading-relaxed">{{ alg.example }}</p>
              </div>
            </label>
          </div>

          <div class="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-teal-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Guardado en tu navegador. En Inventario podés cambiar el algoritmo para una optimización puntual.
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { useStandardsStore } from '../stores/standards.js';

const store = useStandardsStore();
const { versionActual, tolerancias, loading } = storeToRefs(store);
store.fetch();

const bannerState = reactive({ text: '', ok: true });

// ── LocalStorage: mismo key que InventarioView ───────────────────────────────
const USER_PREFS_KEY = 'inventoryManagerUserPrefs_v1';

const defaultAlgorithm = ref('stability');

const loadDefaultAlgorithm = () => {
  try {
    const raw = localStorage.getItem(USER_PREFS_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);
    const allowed = ['standard', 'stability', 'stability-strict'];
    if (allowed.includes(prefs?.blendAlgorithm)) {
      defaultAlgorithm.value = prefs.blendAlgorithm;
    }
  } catch { /* ignore */ }
};

const saveDefaultAlgorithm = () => {
  try {
    const raw = localStorage.getItem(USER_PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    prefs.blendAlgorithm = defaultAlgorithm.value;
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
};

loadDefaultAlgorithm();

// ── Definiciones de algoritmos (mismos textos que el tooltip de /inventario) ─
const ALGORITHMS = [
  {
    key: 'standard',
    title: 'Estándar (Round Robin)',
    badge: 'Secuencial',
    badgeClass: 'bg-slate-100 text-slate-700',
    activeBorder: 'border-slate-400',
    activeBg: 'bg-slate-50',
    activeText: 'text-slate-800',
    description: 'Arma la mezcla en rondas entre lotes disponibles para completar rápido la receta y mantener consumo equilibrado.',
    example: 'Si pides 20 fardos y tienes 4 lotes compatibles, reparte en turnos (1-1-1-1...) hasta completar 20.'
  },
  {
    key: 'stability',
    title: 'Golden Batch',
    badge: 'Máx. N',
    badgeClass: 'bg-blue-100 text-blue-700',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-800',
    description: 'Prioriza repetir la misma receta por más corridas (N alto) para estabilizar proceso y reducir variación entre mezclas consecutivas.',
    example: 'Si la mejor receta permite 12 corridas iguales, genera ese bloque primero y luego recalcula con el stock remanente.'
  },
  {
    key: 'stability-strict',
    title: 'GB + Norma',
    badge: 'Norma activa',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    activeBorder: 'border-indigo-500',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-800',
    description: 'Mantiene la lógica Golden Batch pero obliga el cumplimiento de cupo de tolerancia de calidad en cada receta.',
    example: 'Si la receta ideal supera el % permitido de lotes en tolerancia, recorta ese cupo y reduce N para cumplir norma.'
  }
];

// ── Tooltip flotante HVI ──────────────────────────────────────────────────────
const tooltipVisible  = ref(null);
const tooltipPosition = ref({ top: '0px', left: '0px' });
const tooltipPlacement = ref('top');

const showTooltip = (event, paramId) => {
  tooltipVisible.value = paramId;
  const rect = event.target.getBoundingClientRect();
  const tooltipW = 320;
  const tooltipH = 270;
  const gap = 10;

  // Posición horizontal: centrada sobre el botón pero siempre dentro de la pantalla
  const rawLeft = rect.left + rect.width / 2;
  const clampedLeft = Math.min(
    Math.max(rawLeft, tooltipW / 2 + 8),
    window.innerWidth - tooltipW / 2 - 8
  );

  if (rect.top > tooltipH + gap) {
    // Cabe arriba
    tooltipPlacement.value = 'top';
    tooltipPosition.value = {
      top:  `${rect.top - gap}px`,
      left: `${clampedLeft}px`
    };
  } else {
    // Siempre abajo como fallback (nunca a la izquierda fuera de pantalla)
    tooltipPlacement.value = 'bottom';
    tooltipPosition.value = {
      top:  `${rect.bottom + gap}px`,
      left: `${clampedLeft}px`
    };
  }
};

const hideTooltip = () => { tooltipVisible.value = null; };

// ── Tooltips HTML (mismo estilo que proyecto base) ───────────────────────────
const hviTooltips = {
  MIC: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">MIC - Micronaire</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">Medida de permeabilidad al aire. Combina finura y madurez.</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">✓ Óptimo: 3.7 – 4.2 (Ideal Denim)</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">✗ Crítico: &lt; 3.4 (Inmadura) o &gt; 4.9 (Gruesa)</div>
      </div>
      <div style="background:#fef3c7;padding:10px;border-radius:6px;margin-bottom:8px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:4px;">⚠️ MIC Bajo (&lt;3.4):</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">Fibra inmadura que colapsa. Forma Neps (puntos blancos que no se tiñen con índigo).</div>
      </div>
      <div style="background:#fff7ed;padding:10px;border-radius:6px;">
        <div style="font-size:11px;color:#c2410c;font-weight:600;margin-bottom:4px;">⚠️ MIC Alto (&gt;4.9):</div>
        <div style="font-size:11px;color:#9a3412;line-height:1.5;">Fibras gruesas = menos fibras en sección transversal = hilo más débil.</div>
      </div>
    </div>`,
  LEN: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">LEN - Length (Longitud UHML)</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">Longitud promedio de la mitad más larga de las fibras.</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">✓ Óptimo: &gt; 29 mm (1.15")</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">✗ Crítico: &lt; 26 mm (1.05")</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;margin-bottom:8px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:4px;">🔧 Aplicación Técnica:</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">Dicta el ajuste de rodillos. UHML alto permite hilos más finos y resistentes.</div>
      </div>
      <div style="background:#fef3c7;padding:8px;border-radius:6px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:2px;">⚠️ Variación:</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">Mezclar fibras cortas y largas sin control genera irregularidad de masa.</div>
      </div>
    </div>`,
  STR: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">STR - Strength (Tenacidad)</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">Resistencia a la rotura medida rompiendo un mazo de fibras (bundle).</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">✓ Óptimo: &gt; 30 g/tex</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">✗ Crítico: &lt; 24 g/tex (&lt; 25 para Denim)</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;margin-bottom:6px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:4px;">📊 Regla de Oro:</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">Resistencia del hilo ≈ 50% de la resistencia de la fibra.</div>
      </div>
      <div style="background:#fef3c7;padding:8px;border-radius:6px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:2px;">👖 Impacto Denim:</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">Denim sufre lavados agresivos (stone wash, enzimas). STR &lt; 25 = roturas en costuras.</div>
      </div>
    </div>`,
  ELG: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">ELG - Elongation (Elasticidad)</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">Capacidad de estiramiento antes de rotura. "Resorte" natural de la fibra.</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">✓ Óptimo: &gt; 7%</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">✗ Crítico: &lt; 5%</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:2px;">🎯 Ventaja Mecánica:</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">Absorbe impactos del telar. Entre dos algodones con mismo STR, el mayor ELG trabaja mejor en planta.</div>
      </div>
    </div>`,
  RD: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">RD - Reflectance (Brillo)</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">Grado de reflectancia: blanco vs gris. Escala Nickerson-Hunter.</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">✓ Óptimo: 75 – 80 (Bright)</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">✗ Crítico: &lt; 70 (Grisáceo)</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:2px;">🎨 Combinación con +b:</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">RD y +b juntos definen el TIPO en carta Nickerson-Hunter. TIPO 41 = Estándar Denim.</div>
      </div>
    </div>`,
  '+b': `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">+b - Yellowness (Amarillamiento)</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">Grado de amarillo. Indica oxidación o envejecimiento de la fibra.</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">✓ Óptimo: 7 – 9 (Blanco)</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">✗ Crítico: &gt; 12 (Tinged/Amarillento)</div>
      </div>
      <div style="background:#fef3c7;padding:8px;border-radius:6px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:2px;">⚠️ Problema de Teñido:</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">Algodón amarillo absorbe índigo diferente = barrados en tela Denim.</div>
      </div>
    </div>`
};

// ── Guardar ───────────────────────────────────────────────────────────────────
const showBanner = (text, ok = true) => {
  bannerState.text = text;
  bannerState.ok   = ok;
  setTimeout(() => { bannerState.text = ''; }, 4000);
};

const guardar = async () => {
  try {
    const msg = await store.save();
    showBanner('✅ ' + msg, true);
  } catch (e) {
    showBanner('❌ Error al guardar: ' + e.message, false);
  }
};
</script>

