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
    <div class="flex items-center gap-3 mb-3">
      <h1 class="text-xl font-bold text-gray-800 shrink-0">{{ t('config.title') }}</h1>
      <span class="text-slate-300 select-none">·</span>
      <p class="text-sm text-gray-500">{{ t('config.subtitle') }}</p>
    </div>

    <!-- Banner -->
    <div v-if="bannerState.text" class="mb-5 rounded-lg px-4 py-3 text-sm font-medium"
         :class="bannerState.ok ? 'bg-green-50 border border-green-300 text-green-800' : 'bg-red-50 border border-red-300 text-red-800'">
      {{ bannerState.text }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-lg shadow p-12 text-center text-slate-400 text-sm">
      {{ t('config.loading') }}
    </div>

    <!-- ── Layout dos columnas ── -->
    <template v-else>
      <div class="flex gap-3 items-stretch">

        <!-- ── COLUMNA IZQUIERDA: Tabla de tolerancias ── -->
        <div class="shrink-0 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div class="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center gap-2">
                <h2 class="font-bold text-slate-700 text-sm">{{ t('config.blendRules') }} — <span class="text-indigo-600">{{ versionActual }}</span></h2>
                <span class="text-xs text-slate-400">{{ tolerancias.length }} {{ t('config.params') }}</span>
              </div>
              <p class="text-xs text-slate-400">{{ t('config.blendRulesSub') }}</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-auto text-left text-sm border-collapse">
              <thead class="bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th class="px-3 py-2 whitespace-nowrap">{{ t('config.param') }}</th>
                  <th class="px-3 py-2 text-center bg-yellow-50 whitespace-nowrap w-24">{{ t('config.tolMin') }}</th>
                  <th class="px-3 py-2 text-center bg-yellow-50 whitespace-nowrap w-24">{{ t('config.tolMax') }}</th>
                  <th class="px-3 py-2 text-center bg-green-50 whitespace-nowrap w-24">{{ t('config.pctIdealMin') }}</th>
                  <th class="px-3 py-2 text-center bg-green-50 whitespace-nowrap w-28">{{ t('config.valIdealMin') }}</th>
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

          <!-- Leyenda + Botón guardar -->
          <div class="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div class="flex flex-wrap gap-3 text-xs text-slate-600">
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300"></span> {{ t('config.legendTol') }}</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-green-100 border border-green-300"></span> {{ t('config.legendIdeal') }}</span>
              <span class="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8h.01" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ t('config.legendHover') }}
              </span>
            </div>
            <button
              @click="guardar"
              :disabled="loading"
              class="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors duration-150 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>
              </svg>
              <span>{{ loading ? t('config.saving') : t('config.saveChanges') }}</span>
            </button>
          </div>
        </div>

        <!-- ── COLUMNA DERECHA: Algoritmos predeterminados ── -->
        <div class="flex-1 min-w-0 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div class="px-3 py-2 bg-slate-50 border-b border-slate-200">
            <h2 class="font-bold text-slate-700 text-sm">{{ t('config.defaultAlgo') }}</h2>
            <p class="text-xs text-slate-400" v-html="t('config.defaultAlgoSub')"></p>
          </div>

          <div class="p-2 grid grid-cols-3 gap-2">
            <label
              v-for="alg in ALGORITHMS"
              :key="alg.key"
              :for="`alg-${alg.key}`"
              class="flex flex-col cursor-pointer rounded-lg border-2 p-2.5 transition-all"
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
              <p class="text-xs text-slate-600 leading-relaxed mb-2 flex-1">{{ alg.description }}</p>
              <!-- Ejemplo -->
              <div class="rounded-md bg-slate-50 border border-slate-200 p-2">
                <p class="text-[11px] font-semibold text-slate-700 mb-0.5">{{ t('config.practicalExample') }}</p>
                <p class="text-[11px] text-slate-500 leading-relaxed">{{ alg.example }}</p>
              </div>
            </label>
          </div>

        </div>

      </div>

      <!-- ── Panel: Código fuente del algoritmo activo ─────────────────────── -->
      <div class="mt-3 rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col" style="height:50vh;">

        <!-- Barra de tabs estilo VS Code -->
        <div class="flex items-stretch bg-slate-100 border-b border-slate-200 shrink-0">
          <!-- Tab activo -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-white border-t-2 border-indigo-500 text-xs text-slate-700 select-none">
            <span
              class="font-bold text-[10px] leading-none px-1 py-0.5 rounded"
              :class="viewMode === 'code' ? 'text-amber-700 bg-amber-100' : 'text-cyan-700 bg-cyan-100'"
            >{{ viewMode === 'code' ? 'JS' : 'TXT' }}</span>
            <span>{{ viewMode === 'code' ? 'optimizer.js' : 'pseudocode.txt' }}</span>
            <span class="text-slate-400 ml-1 cursor-default">×</span>
          </div>
          <div class="flex-1 bg-slate-50"></div>
          <!-- Toggle Código / Pseudocódigo -->
          <div class="flex items-center gap-0 mx-3 my-1.5 rounded overflow-hidden border border-slate-300 bg-slate-200 select-none text-[10px]">
            <button
              @click="viewMode = 'code'"
              :class="viewMode === 'code'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300'"
              class="px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span class="font-mono">&lt;/&gt;</span> {{ t('editor.codeJS') }}
            </button>
            <button
              @click="viewMode = 'pseudo'"
              :class="viewMode === 'pseudo'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-300'"
              class="px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {{ t('editor.pseudocode') }}
            </button>
          </div>
          <div class="flex items-center gap-2 pr-3 text-[10px] text-slate-400 bg-slate-50 select-none">
            <span>{{ viewMode === 'code' ? 'JavaScript' : 'Texto plano' }}</span>
            <span>·</span>
            <span>UTF-8</span>
          </div>
        </div>

        <!-- Breadcrumb estilo VS Code -->
        <div class="flex items-center gap-1 px-3 py-1 bg-white border-b border-slate-200 text-[10px] text-slate-400 shrink-0 select-none">
          <span>services</span>
          <span class="text-slate-300">›</span>
          <span>blend</span>
          <span class="text-slate-300">›</span>
          <span>optimizer.js</span>
          <span class="text-slate-300">›</span>
          <span class="text-indigo-600 font-medium">{{ currentAlgMeta.functionName }}</span>
        </div>

        <!-- Área de código con scroll -->
        <div class="flex-1 overflow-auto bg-white">
          <pre class="m-0 p-0 bg-transparent" style="color:#1e293b;"><code class="hljs-editor text-xs font-mono leading-5 block" style="color:#1e293b; background:white;" v-html="highlightedCode"></code></pre>
        </div>

        <!-- Barra de estado estilo VS Code -->
        <div class="flex items-center justify-between px-3 py-0.5 bg-indigo-700 text-white text-[10px] shrink-0 select-none">
          <div class="flex items-center gap-3">
            <span>⎇ master</span>
            <span>{{ currentAlgMeta.badge }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span>{{ t('editor.lines', { n: currentAlgMeta.lines }) }}</span>
            <span>{{ t('editor.spaces') }}</span>
            <span>JavaScript</span>
          </div>
        </div>

      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

const { t, locale } = useI18n();
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import 'highlight.js/styles/vs.css';

hljs.registerLanguage('javascript', javascript);
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
const ALGORITHMS = computed(() => [
  {
    key: 'standard',
    title: t('algo.standard') + ' (Round Robin)',
    badge: t('algo.sequential'),
    badgeClass: 'bg-slate-100 text-slate-700',
    activeBorder: 'border-slate-400',
    activeBg: 'bg-slate-50',
    activeText: 'text-slate-800',
    description: t('algo.standardDesc'),
    example: t('algo.standardExample')
  },
  {
    key: 'stability',
    title: t('algo.goldenBatch'),
    badge: t('algo.maxN'),
    badgeClass: 'bg-blue-100 text-blue-700',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-800',
    description: t('algo.goldenDesc'),
    example: t('algo.goldenExample')
  },
  {
    key: 'stability-strict',
    title: t('algo.gbNorma'),
    badge: t('algo.normaActive'),
    badgeClass: 'bg-indigo-100 text-indigo-700',
    activeBorder: 'border-indigo-500',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-800',
    description: t('algo.gbNormaDesc'),
    example: t('algo.gbNormaExample')
  }
]);

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

// ── Tooltips HTML (bilingüe ES / PT-BR) ─────────────────────────────────────
const hviTooltips = computed(() => {
  const pt = locale.value === 'pt-BR';

  const mic = {
    desc:      pt ? 'Medida de permeabilidade ao ar. Combina finura e maturidade.'                                           : 'Medida de permeabilidad al aire. Combina finura y madurez.',
    opt:       pt ? '✓ Ótimo: 3,7 – 4,2 (Ideal Denim)'                                                                     : '✓ Óptimo: 3.7 – 4.2 (Ideal Denim)',
    crit:      pt ? '✗ Crítico: &lt; 3,4 (Imatura) ou &gt; 4,9 (Grossa)'                                                   : '✗ Crítico: &lt; 3.4 (Inmadura) o &gt; 4.9 (Gruesa)',
    lowTitle:  pt ? '⚠️ MIC Baixo (&lt;3,4):'                                                                               : '⚠️ MIC Bajo (&lt;3.4):',
    lowBody:   pt ? 'Fibra imatura que colapsa. Forma Neps (pontos brancos que não se tingem com índigo).'                  : 'Fibra inmadura que colapsa. Forma Neps (puntos blancos que no se tiñen con índigo).',
    highTitle: pt ? '⚠️ MIC Alto (&gt;4,9):'                                                                                : '⚠️ MIC Alto (&gt;4.9):',
    highBody:  pt ? 'Fibras grossas = menos fibras na seção transversal = fio mais fraco.'                                  : 'Fibras gruesas = menos fibras en sección transversal = hilo más débil.',
  };
  const len = {
    title:     pt ? 'LEN - Length (Comprimento UHML)'                                                                       : 'LEN - Length (Longitud UHML)',
    desc:      pt ? 'Comprimento médio da metade mais longa das fibras.'                                                     : 'Longitud promedio de la mitad más larga de las fibras.',
    opt:       pt ? '✓ Ótimo: &gt; 29 mm (1,15&quot;)'                                                                      : '✓ Óptimo: &gt; 29 mm (1.15&quot;)',
    crit:      pt ? '✗ Crítico: &lt; 26 mm (1,05&quot;)'                                                                    : '✗ Crítico: &lt; 26 mm (1.05&quot;)',
    techTitle: pt ? '🔧 Aplicação Técnica:'                                                                                  : '🔧 Aplicación Técnica:',
    techBody:  pt ? 'Dita o ajuste dos rolos. UHML alto permite fios mais finos e resistentes.'                             : 'Dicta el ajuste de rodillos. UHML alto permite hilos más finos y resistentes.',
    varTitle:  pt ? '⚠️ Variação:'                                                                                           : '⚠️ Variación:',
    varBody:   pt ? 'Misturar fibras curtas e longas sem controle gera irregularidade de massa.'                             : 'Mezclar fibras cortas y largas sin control genera irregularidad de masa.',
  };
  const str = {
    title:       pt ? 'STR - Strength (Tenacidade)'                                                                         : 'STR - Strength (Tenacidad)',
    desc:        pt ? 'Resistência à ruptura medida rompendo um feixe de fibras (bundle).'                                  : 'Resistencia a la rotura medida rompiendo un mazo de fibras (bundle).',
    opt:         pt ? '✓ Ótimo: &gt; 30 g/tex'                                                                              : '✓ Óptimo: &gt; 30 g/tex',
    crit:        pt ? '✗ Crítico: &lt; 24 g/tex (&lt; 25 para Denim)'                                                      : '✗ Crítico: &lt; 24 g/tex (&lt; 25 para Denim)',
    ruleTitle:   pt ? '📊 Regra de Ouro:'                                                                                    : '📊 Regla de Oro:',
    ruleBody:    pt ? 'Resistência do fio ≈ 50% da resistência da fibra.'                                                   : 'Resistencia del hilo ≈ 50% de la resistencia de la fibra.',
    impactTitle: pt ? '👖 Impacto Denim:'                                                                                    : '👖 Impacto Denim:',
    impactBody:  pt ? 'Denim sofre lavagens agressivas (stone wash, enzimas). STR &lt; 25 = rupturas nas costuras.'         : 'Denim sufre lavados agresivos (stone wash, enzimas). STR &lt; 25 = roturas en costuras.',
  };
  const elg = {
    title:    pt ? 'ELG - Elongation (Elasticidade)'                                                                        : 'ELG - Elongation (Elasticidad)',
    desc:     pt ? 'Capacidade de alongamento antes da ruptura. &quot;Mola&quot; natural da fibra.'                         : 'Capacidad de estiramiento antes de rotura. &quot;Resorte&quot; natural de la fibra.',
    opt:      pt ? '✓ Ótimo: &gt; 7%'                                                                                       : '✓ Óptimo: &gt; 7%',
    crit:     pt ? '✗ Crítico: &lt; 5%'                                                                                     : '✗ Crítico: &lt; 5%',
    advTitle: pt ? '🎯 Vantagem Mecânica:'                                                                                   : '🎯 Ventaja Mecánica:',
    advBody:  pt ? 'Absorve impactos do tear. Entre dois algodões com mesmo STR, o maior ELG trabalha melhor na planta.'    : 'Absorbe impactos del telar. Entre dos algodones con mismo STR, el mayor ELG trabaja mejor en planta.',
  };
  const rd = {
    title:     pt ? 'RD - Reflectance (Brilho)'                                                                             : 'RD - Reflectance (Brillo)',
    desc:      pt ? 'Grau de refletância: branco vs cinza. Escala Nickerson-Hunter.'                                        : 'Grado de reflectancia: blanco vs gris. Escala Nickerson-Hunter.',
    opt:       pt ? '✓ Ótimo: 75 – 80 (Bright)'                                                                             : '✓ Óptimo: 75 – 80 (Bright)',
    crit:      pt ? '✗ Crítico: &lt; 70 (Acinzentado)'                                                                     : '✗ Crítico: &lt; 70 (Grisáceo)',
    combTitle: pt ? '🎨 Combinação com +b:'                                                                                  : '🎨 Combinación con +b:',
    combBody:  pt ? 'RD e +b juntos definem o TIPO na carta Nickerson-Hunter. TIPO 41 = Padrão Denim.'                     : 'RD y +b juntos definen el TIPO en carta Nickerson-Hunter. TIPO 41 = Estándar Denim.',
  };
  const plusB = {
    title:    pt ? '+b - Yellowness (Amarelamento)'                                                                         : '+b - Yellowness (Amarillamiento)',
    desc:     pt ? 'Grau de amarelo. Indica oxidação ou envelhecimento da fibra.'                                           : 'Grado de amarillo. Indica oxidación o envejecimiento de la fibra.',
    opt:      pt ? '✓ Ótimo: 7 – 9 (Branco)'                                                                               : '✓ Óptimo: 7 – 9 (Blanco)',
    crit:     pt ? '✗ Crítico: &gt; 12 (Tingido/Amarelado)'                                                                : '✗ Crítico: &gt; 12 (Tinged/Amarillento)',
    dyeTitle: pt ? '⚠️ Problema de Tingimento:'                                                                              : '⚠️ Problema de Teñido:',
    dyeBody:  pt ? 'Algodão amarelo absorve índigo diferente = barrados no tecido Denim.'                                   : 'Algodón amarillo absorbe índigo diferente = barrados en tela Denim.',
  };

  return {
    MIC: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">MIC - Micronaire</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">${mic.desc}</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">${mic.opt}</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">${mic.crit}</div>
      </div>
      <div style="background:#fef3c7;padding:10px;border-radius:6px;margin-bottom:8px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:4px;">${mic.lowTitle}</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">${mic.lowBody}</div>
      </div>
      <div style="background:#fff7ed;padding:10px;border-radius:6px;">
        <div style="font-size:11px;color:#c2410c;font-weight:600;margin-bottom:4px;">${mic.highTitle}</div>
        <div style="font-size:11px;color:#9a3412;line-height:1.5;">${mic.highBody}</div>
      </div>
    </div>`,
    LEN: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">${len.title}</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">${len.desc}</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">${len.opt}</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">${len.crit}</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;margin-bottom:8px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:4px;">${len.techTitle}</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">${len.techBody}</div>
      </div>
      <div style="background:#fef3c7;padding:8px;border-radius:6px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:2px;">${len.varTitle}</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">${len.varBody}</div>
      </div>
    </div>`,
    STR: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">${str.title}</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">${str.desc}</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">${str.opt}</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">${str.crit}</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;margin-bottom:6px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:4px;">${str.ruleTitle}</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">${str.ruleBody}</div>
      </div>
      <div style="background:#fef3c7;padding:8px;border-radius:6px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:2px;">${str.impactTitle}</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">${str.impactBody}</div>
      </div>
    </div>`,
    ELG: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">${elg.title}</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">${elg.desc}</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">${elg.opt}</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">${elg.crit}</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:2px;">${elg.advTitle}</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">${elg.advBody}</div>
      </div>
    </div>`,
    RD: `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">${rd.title}</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">${rd.desc}</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">${rd.opt}</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">${rd.crit}</div>
      </div>
      <div style="background:#eff6ff;padding:10px;border-radius:6px;">
        <div style="font-size:11px;color:#1e40af;font-weight:600;margin-bottom:2px;">${rd.combTitle}</div>
        <div style="font-size:11px;color:#475569;line-height:1.5;">${rd.combBody}</div>
      </div>
    </div>`,
    '+b': `
    <div style="padding:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-weight:700;font-size:15px;color:#0f766e;margin-bottom:10px;border-bottom:2px solid #14b8a6;padding-bottom:6px;">${plusB.title}</div>
      <div style="font-size:12px;color:#334155;margin-bottom:10px;line-height:1.6;font-weight:600;">${plusB.desc}</div>
      <div style="background:#f0fdfa;padding:8px;border-radius:6px;margin-bottom:6px;border-left:3px solid #14b8a6;">
        <div style="font-size:11px;color:#059669;font-weight:500;">${plusB.opt}</div>
      </div>
      <div style="background:#fef2f2;padding:8px;border-radius:6px;margin-bottom:10px;border-left:3px solid #ef4444;">
        <div style="font-size:11px;color:#dc2626;font-weight:500;">${plusB.crit}</div>
      </div>
      <div style="background:#fef3c7;padding:8px;border-radius:6px;">
        <div style="font-size:11px;color:#92400e;font-weight:600;margin-bottom:2px;">${plusB.dyeTitle}</div>
        <div style="font-size:11px;color:#78350f;line-height:1.5;">${plusB.dyeBody}</div>
      </div>
    </div>`,
  };
});

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

// ── Código fuente de cada algoritmo (extraído de optimizer.js) ────────────────
const ALGORITHM_CODES = {
  standard: `// optimizer.js  ·  optimizeBlendStandard()
// ─────────────────────────────────────────────────────────────────────────────
// Estándar (Round Robin): recorre los lotes en turnos circulares hasta
// completar cada receta, luego la repite tantas veces como el stock permita.
// ─────────────────────────────────────────────────────────────────────────────

function optimizeBlendStandard(stock, rules, supervisionSettings, blendSize) {
  const classifiedStock = classifyStock(stock, rules, supervisionSettings);

  // Verifica si un lote en tolerancia puede sumarse sin exceder el cupo
  const canAddTolerance = (bale, currentRecipe) => {
    if (bale._category === 'A') return true;
    for (const param of bale._toleranceReasons) {
      const rule = activeRules.find(r => r.parametro === param);
      if (!rule) continue;
      const maxTol = Math.floor(
        blendSize * ((100 - (Number(rule.porcentaje_min_ideal) || 100)) / 100)
      );
      const already = currentRecipe.filter(
        b => b._category === 'B' && b._toleranceReasons.includes(param)
      ).length;
      if (already >= maxTol) return false;
    }
    return true;
  };

  // Round-Robin: avanza cíclicamente por lotes hasta completar blendSize
  const buildRecipe = (avail) => {
    avail.sort((a, b) => b._availableCount - a._availableCount);
    let recipe = [], lotIdx = 0, attempts = 0, counts = new Map();

    while (recipe.length < blendSize && attempts < avail.length) {
      const lot  = avail[lotIdx];
      const used = counts.get(lot) || 0;
      if (used < lot._availableCount &&
         (lot._category === 'A' || canAddTolerance(lot, recipe))) {
        recipe.push({ ...lot });
        counts.set(lot, used + 1);
        attempts = 0;
      } else {
        attempts++;
      }
      lotIdx = (lotIdx + 1) % avail.length;
    }
    return recipe.length === blendSize ? recipe : null;
  };

  // Loop principal: repite la receta hasta agotar el stock disponible
  let avail  = classifiedStock.filter(b => b._availableCount > 0);
  let recipe = buildRecipe(avail);

  while (recipe) {
    const rCounts = new Map();
    recipe.forEach(f => {
      const l = classifiedStock.find(x => x.LOTE === f.LOTE && x.PRODUTOR === f.PRODUTOR);
      rCounts.set(l, (rCounts.get(l) || 0) + 1);
    });

    // Cuántas veces se puede repetir sin agotar ningún lote
    let repeats = Infinity;
    for (const [l, c] of rCounts.entries())
      repeats = Math.min(repeats, Math.floor(l._availableCount / c));

    if (repeats === 0 || repeats === Infinity) break;

    for (let i = 0; i < repeats; i++)
      blends.push({ index: blendIndex++, fardos: recipe.map(b => ({ ...b })) });

    for (const [l, c] of rCounts.entries()) {
      l._availableCount -= c * repeats;
      l._usedCount      += c * repeats;
    }

    avail  = classifiedStock.filter(b => b._availableCount > 0);
    recipe = buildRecipe(avail);
  }

  return generateResult(classifiedStock, groupBlends(blends), rules, supervisionSettings);
}`,

  stability: `// optimizer.js  ·  optimizeBlendStability(enforceToleranceCap = false)
// ─────────────────────────────────────────────────────────────────────────────
// Golden Batch: maximiza el horizonte N (corridas consecutivas idénticas)
// mediante búsqueda binaria. Cuantas más corridas, más estable el proceso.
// ─────────────────────────────────────────────────────────────────────────────

  // Búsqueda binaria: ¿cuántas corridas (N) puede sostener la receta actual?
  const findMaxHorizon = (lots) => {
    const total = lots.reduce((sum, l) => sum + l._availableCount, 0);
    let low = 1, high = Math.floor(total / blendSize), best = 0;

    const feasible = (h) =>
      lots.reduce((sum, l) => sum + Math.floor(l._availableCount / h), 0) >= blendSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (feasible(mid)) { best = mid; low  = mid + 1; }
      else               { high = mid - 1; }
    }
    return best; // ← N óptimo (máximo de corridas repetibles)
  };

  // Asignación proporcional al peso de cada lote en el stock total
  const buildRecipeForHorizon = (lots, horizon) => {
    const totalStock = lots.reduce((sum, l) => sum + l._availableCount, 0);

    const candidates = lots.map((lot) => ({
      lot,
      idealShare : (lot._availableCount / totalStock) * blendSize,
      capacity   : Math.floor(lot._availableCount / horizon),
      assigned   : 0,
      remainder  : ((lot._availableCount / totalStock) * blendSize) % 1,
    }));

    // Paso 1: asignación base (parte entera de la proporción ideal)
    let assignedTotal = 0;
    candidates.filter(c => c.capacity >= 1).forEach(c => {
      c.assigned     = Math.min(Math.floor(c.idealShare), c.capacity);
      assignedTotal += c.assigned;
    });

    // Paso 2: distribuir sobrante por mayor fracción decimal (método Hamilton)
    let needed = blendSize - assignedTotal;
    candidates
      .filter(c => c.capacity >= 1)
      .sort((a, b) =>
        (b.capacity - b.assigned) - (a.capacity - a.assigned) || b.remainder - a.remainder
      )
      .forEach(c => {
        if (needed <= 0) return;
        const canAdd   = Math.min(c.capacity - c.assigned, needed);
        c.assigned    += canAdd;
        assignedTotal += canAdd;
        needed = blendSize - assignedTotal;
      });

    return needed > 0 ? null : { rows: candidates.filter(c => c.assigned > 0) };
  };

  // Loop principal
  while (remainingLots.length > 0 && iterations < MAX_ITERATIONS) {
    let blockDuration = findMaxHorizon(remainingLots);   // calcula N óptimo
    if (blockDuration <= 0) break;

    let activeRecipe = null;
    while (blockDuration > 0) {
      const rawRecipe = buildRecipeForHorizon(remainingLots, blockDuration);
      if (!rawRecipe) { blockDuration--; continue; }

      const fail = getRecipeValidationFailure(recipeFardos, activeRules, supervisionSettings, blendSize);
      if (!fail) break;   // receta válida → usar este horizonte
      blockDuration--;    // reducir N e intentar de nuevo
    }

    // Emitir blockDuration mezclas idénticas (el "bloque dorado")
    for (let i = 0; i < blockDuration; i++)
      blends.push({ index: blendIndex++, fardos: buildFardoList(activeRecipe) });

    // Descontar stock consumido por el bloque completo
    activeRecipe.rows.forEach(item => {
      const consumed         = item.assigned * blockDuration;
      item.lot._availableCount -= consumed;
      item.lot._usedCount      += consumed;
    });

    remainingLots = remainingLots.filter(l => l._availableCount > 0);
    iterations++;
  }`,

  'stability-strict': `// optimizer.js  ·  optimizeBlendStability(enforceToleranceCap = true)
// ─────────────────────────────────────────────────────────────────────────────
// GB + Norma: igual que Golden Batch, pero cada receta debe cumplir el cupo
// de lotes en tolerancia definido en los estándares (porcentaje_min_ideal).
// Si no cumple, recorta los lotes zona-amarilla y compensa con zona-verde.
// ─────────────────────────────────────────────────────────────────────────────

  // Recorta lotes en tolerancia (zona amarilla) para cumplir cupo de norma
  const capToleranceInRecipe = (candidates) => {
    const caps = candidates.map(c => ({ ...c }));
    for (const rule of activeRules) {
      const minIdealPct = toOptionalNumber(rule.porcentaje_min_ideal);
      if (minIdealPct === null) continue;

      // Máximo de fardos en zona amarilla (B) admitidos por esta regla
      const maxBCount = Math.floor(blendSize * ((100 - minIdealPct) / 100));
      const bCaps = caps.filter(c =>
        c.lot._category === 'B' &&
        c.lot._toleranceReasons.includes(rule.parametro)
      );
      const currentBCount = bCaps.reduce((sum, c) => sum + c.assigned, 0);

      if (currentBCount <= maxBCount) continue; // dentro del cupo → ok

      // Reducir asignación en lotes B con más fardos asignados
      let toFree = currentBCount - maxBCount;
      bCaps.sort((a, b) => b.assigned - a.assigned);
      for (const bc of bCaps) {
        if (toFree <= 0) break;
        const reduce = Math.min(bc.assigned - 1, toFree);
        if (reduce > 0) { bc.assigned -= reduce; toFree -= reduce; }
      }

      // Compensar con lotes A (zona verde) para mantener blendSize exacto
      const freed = (currentBCount - maxBCount) - toFree;
      const aCaps = caps
        .filter(c => c.lot._category === 'A' && c.assigned < c.capacity)
        .sort((a, b) => (b.capacity - b.assigned) - (a.capacity - a.assigned));
      let toFill = freed;
      for (const ac of aCaps) {
        if (toFill <= 0) break;
        const canAdd  = Math.min(ac.capacity - ac.assigned, toFill);
        ac.assigned  += canAdd;
        toFill       -= canAdd;
      }
      if (toFill > 0) return null; // Sin suficiente zona verde → inviable
    }

    const total = caps.reduce((sum, c) => sum + c.assigned, 0);
    return total === blendSize ? caps.filter(c => c.assigned > 0) : null;
  };

  // Integración en el loop: diff clave respecto a Golden Batch puro
  while (blockDuration > 0) {
    const rawRecipe = buildRecipeForHorizon(remainingLots, blockDuration);
    if (!rawRecipe) { blockDuration--; continue; }

    // ← DIFERENCIA vs Golden Batch: aplicar recorte de tolerancia PRIMERO
    const capped = capToleranceInRecipe(rawRecipe.rows);
    if (!capped) { blockDuration--; continue; } // no cumple norma → reducir N

    activeRecipe = { ...rawRecipe, rows: capped };
    const fail = getRecipeValidationFailure(recipeFardos, activeRules, supervisionSettings, blendSize);
    if (!fail) break;   // receta válida con norma cumplida
    blockDuration--;
  }

  // El resto es idéntico a Golden Batch: emitir bloque + descontar stock`,
};

// ── Modo de vista del panel editor ─────────────────────────────────────────
const viewMode = ref('code'); // 'code' | 'pseudo'

// ── Pseudocódigo por algoritmo ───────────────────────────────────────────────
const ALGORITHM_PSEUDOCODE = {
  standard: `
  ALGORITMO: Estándar — Round Robin
  ═══════════════════════════════════════════════════════════════════════
  Objetivo: armar cada receta recorriendo los lotes en turnos circulares
  y repetirla tantas veces como el stock permita.
  ═══════════════════════════════════════════════════════════════════════

  ENTRADA: stock de fardos, reglas HVI, tamaño de mezcla (blendSize)

  PASO 1 — Clasificar stock
    PARA cada fardo en stock:
      SI incumple límite absoluto (hardCap) → categoría C  (rechazado)
      SINO SI está fuera de rango ideal     → categoría B  (tolerancia)
      SINO                                  → categoría A  (ideal)

  PASO 2 — Construir receta (Round-Robin)
    Ordenar lotes por mayor stock disponible
    Avanzar cíclicamente (1→2→3→…→n→1→2→…):
      SI el lote tiene stock Y pasa el cupo de tolerancia
        → agregar 1 fardo a la receta
    Repetir hasta completar blendSize fardos
    SI no se puede completar → retornar NULL

  PASO 3 — Regla de cupo (lotes B)
    Para cada parámetro en tolerancia:
      maxCupo = blendSize × (100 - %idealMín) / 100
      SI lotes B en receta >= maxCupo → rechazar ese fardo

  PASO 4 — Repetir receta hasta agotar stock
    MIENTRAS receta != NULL:
      repeats = mínimo de (stock_lote ÷ uso_lote) entre todos los lotes
      Emitir 'repeats' mezclas idénticas
      Descontar stock consumido
      Recalcular receta con stock remanente

  PASO 5 — Agrupar y retornar
    Agrupar mezclas consecutivas idénticas → bloques M1, M2-M5, …
    Retornar plan + estadísticas HVI promedio por bloque
`,

  stability: `
  ALGORITMO: Golden Batch
  ═══════════════════════════════════════════════════════════════════════
  Objetivo: maximizar N (corridas idénticas consecutivas) para estabilizar
  el proceso y reducir variación entre mezclas.
  ═══════════════════════════════════════════════════════════════════════

  ENTRADA: stock de fardos, reglas HVI, tamaño de mezcla (blendSize)

  PASO 1 — Clasificar stock  (igual que Estándar)

  PASO 2 — Encontrar horizonte máximo N  [búsqueda binaria]
    Pregunta: ¿cuántas veces seguidas puedo repetir la misma receta?
    Probar N = 1, 2, 4, 8 … (bisección):
      Factible(N) = suma de floor(stock_lote / N) >= blendSize
    RETORNAR el N más alto factible  ←  "el horizonte dorado"

  PASO 3 — Construir receta proporcional para ese N
    proporción_lote = (stock_lote / stock_total) × blendSize
    Asignar parte entera a cada lote, respetando capacidad = floor(stock/N)
    Distribuir sobrante por mayor fracción decimal (método Hamilton)
    SI no cubre blendSize → reducir N en 1 y reintentar

  PASO 4 — Emitir bloque dorado
    Generar N mezclas idénticas con esa receta
    Descontar N × asignación de cada lote
    Lotes agotados salen del pool

  PASO 5 — Repetir hasta agotar stock
    MIENTRAS stock >= blendSize:
      Calcular nuevo N con los lotes remanentes
      Construir nueva receta y emitir nuevo bloque

  PASO 6 — Agrupar y retornar
    Agrupar bloques → retornar plan + estadísticas
`,

  'stability-strict': `
  ALGORITMO: GB + Norma  (Golden Batch con cumplimiento de estándares)
  ═══════════════════════════════════════════════════════════════════════
  Objetivo: igual que Golden Batch, pero CADA receta debe respetar el
  cupo de lotes en tolerancia definido en los estándares de calidad.
  ═══════════════════════════════════════════════════════════════════════

  ENTRADA: stock de fardos, reglas HVI, tamaño de mezcla (blendSize)

  PASOS 1-3: Idénticos a Golden Batch

  PASO 3b — Ajuste de norma  [DIFERENCIA CLAVE]
    PARA cada regla activa con porcentaje_min_ideal definido:
      maxB = floor(blendSize × (100 - %idealMín) / 100)
           → máximo de fardos zona amarilla (B) admitidos
      SI lotes B asignados > maxB:
        Reducir asignación B empezando por el lote con más fardos
        Compensar reducción con lotes A (zona verde) disponibles
        SI no hay suficientes lotes A → receta INVIABLE
          → reducir N en 1 y recalcular desde Paso 2

  PASO 4 — Validar y emitir bloque
    SI receta pasa la norma de cupo:
      Generar N mezclas idénticas
      Descontar stock
    SINO:
      N = N - 1  →  reintentar (puede necesitar más iteraciones que GB puro)

  PASO 5 — Repetir hasta agotar stock

  RESULTADO vs Golden Batch puro:
    ✓ Igual estabilidad de proceso (bloques consecutivos)
    ✓ Garantía de cumplimiento de norma en CADA mezcla
    ✗ N puede ser más bajo si el stock de zona verde es escaso
`,
};

// ── Lógica del panel editor ───────────────────────────────────────────────────
const addLineNumbers = (highlighted) => {
  return highlighted
    .split('\n')
    .map((line, i) =>
      `<span class="code-line"><span class="ln-num">${i + 1}</span>${line}</span>`
    )
    .join('\n');
};

const escapeHtml = (str) =>
  str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const highlightedCode = computed(() => {
  if (viewMode.value === 'pseudo') {
    const pseudo = ALGORITHM_PSEUDOCODE[defaultAlgorithm.value] || '';
    const escaped = escapeHtml(pseudo);
    // colorizar keywords manualmente para pseudocódigo
    const colorized = escaped
      .replace(/\b(FUNCIÓN|ALGORITMO|ENTRADA|PASO \d+[a-z]?|RETORNAR|MIENTRAS|PARA|SINO SI|SINO|SI|Y|O|NO)\b/g,
        '<span style="color:#c586c0;font-weight:600">$1</span>')
      .replace(/(←[^\n]*)/g, '<span style="color:#6a9955">$1</span>')
      .replace(/(✓[^\n]*)/g, '<span style="color:#4ec9b0">$1</span>')
      .replace(/(✗[^\n]*)/g, '<span style="color:#f44747">$1</span>')
      .replace(/(═+)/g, '<span style="color:#3c3c3c">$1</span>')
      .replace(/'([^']+)'/g, '<span style="color:#ce9178">\'$1\'</span>');
    return addLineNumbers(colorized);
  }
  const code = ALGORITHM_CODES[defaultAlgorithm.value] || '';
  const highlighted = hljs.highlight(code, { language: 'javascript' }).value;
  return addLineNumbers(highlighted);
});

const currentAlgMeta = computed(() => {
  const alg = ALGORITHMS.value.find(a => a.key === defaultAlgorithm.value);
  const fnNames = {
    standard:           'optimizeBlendStandard()',
    stability:          'optimizeBlendStability( false )',
    'stability-strict': 'optimizeBlendStability( true )',
  };
  const source = viewMode.value === 'code'
    ? ALGORITHM_CODES[defaultAlgorithm.value]
    : ALGORITHM_PSEUDOCODE[defaultAlgorithm.value];
  return {
    functionName: fnNames[defaultAlgorithm.value] || '',
    badge:        alg?.badge || '',
    lines:        (source || '').split('\n').length,
  };
});
</script>

<style>
/* Base del editor: fondo y color de texto por defecto (vs light theme) */
.hljs,
.hljs-editor {
  background: white !important;
  color: #1e293b !important;
}
/* Tailwind puede poner color:inherit en pre/code — lo anulamos */
.hljs-editor * {
  font-family: 'Consolas', 'Cascadia Code', 'Fira Code', monospace;
}
</style>

<style scoped>
.code-line {
  display: block;
  padding: 0 1rem;
}
.code-line:hover {
  background-color: rgba(0,0,0,0.03);
}
.ln-num {
  display: inline-block;
  min-width: 2.25rem;
  padding-right: 1rem;
  text-align: right;
  color: #94a3b8;
  user-select: none;
  border-right: 1px solid #e2e8f0;
  margin-right: 0.75rem;
  font-size: 0.7rem;
}
</style>

