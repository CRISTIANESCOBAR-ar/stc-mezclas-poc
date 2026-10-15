<template>
  <section class="mt-3 w-full min-w-0 shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-xs tenso-cross-check">
    <div class="flex items-center gap-2">
      <h3 class="font-semibold text-sm text-slate-800">Control cruzado · TensoRapid {{ testnr }}</h3>
      <button type="button" aria-label="Origen de los datos comparados" class="shrink-0 rounded-full text-slate-500 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500"
        v-tippy="{ content: 'TensoRapid: PAR/TBL locales si están disponibles, con datos guardados como respaldo. Uster: datos guardados desde PAR/TBL.', allowHTML: false, theme: 'light', trigger: 'mouseenter focus', placement: 'bottom' }">
        <QuestionMarkCircleIcon class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <p v-if="sourceWarning" class="mt-2 text-amber-800">{{ sourceWarning }}</p>
    <p v-if="loading" role="status" class="mt-2 text-blue-700">Consultando ensayo Uster {{ usterTestnr }}...</p>
    <p v-else-if="error" role="alert" class="mt-2 text-red-700">{{ error }}</p>
    <p v-else-if="!uster" class="mt-2 text-slate-600">Ingresá un número Uster de cinco dígitos para comparar.</p>
    <div class="mt-2 overflow-x-auto">
      <table class="w-full border-collapse text-left">
        <thead><tr class="bg-slate-50"><th class="p-2">Dato</th><th class="p-2">TensoRapid</th><th class="p-2">Uster {{ usterTestnr }}</th><th class="p-2">Control</th></tr></thead>
        <tbody><tr v-for="row in rows" :key="row.label" class="border-t border-slate-100">
          <th class="p-2 align-top font-medium">{{ row.label }}</th>
          <td class="p-2 align-top break-words">{{ row.tenso === '' ? '—' : row.tenso }}</td>
          <td class="p-2 align-top break-words">{{ row.uster === '' ? '—' : row.uster }}</td>
          <td class="p-2 align-top"><span class="inline-flex items-center gap-1" :class="row.status === 'Coincide' ? 'text-emerald-700' : row.status === 'Difiere' ? 'text-amber-800' : 'text-slate-500'"
            :aria-label="row.status" tabindex="0" v-tippy="{ content: row.status, allowHTML: false, theme: 'light', trigger: 'mouseenter focus' }">
            <CheckCircleIcon v-if="row.status === 'Coincide'" class="h-4 w-4 shrink-0" aria-hidden="true"/>
            <ExclamationTriangleIcon v-else-if="row.status === 'Difiere'" class="h-4 w-4 shrink-0" aria-hidden="true"/>
            <span :class="{ 'match-status-text': row.status === 'Coincide' }">{{ row.status }}</span></span></td>
        </tr></tbody>
      </table>
    </div>
    <p v-if="comparisonRows.some(row => row.label === 'Husos' && row.status === 'Difiere')" class="mt-2 rounded bg-amber-50 p-2 text-amber-900">Los números de huso difieren. Puede deberse a cómo se identificaron en cada equipo; esta comparación no establece una correspondencia física ni reasigna husos.</p>
    <p class="mt-2 text-slate-500 tenso-comparison-footer">La coincidencia indica compatibilidad de datos; no identifica por sí sola una pareja única de ensayos.</p>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { CheckCircleIcon,ExclamationTriangleIcon,QuestionMarkCircleIcon } from '@heroicons/vue/24/outline';
import { compareEnsayos } from '@/services/compareEnsayos.js';
const props=defineProps({testnr:String,usterTestnr:String,tenso:{type:Object,default:()=>({})},uster:Object,tensoHusos:{type:Array,default:()=>[]},usterHusos:{type:Array,default:()=>[]},loading:Boolean,error:String,sourceWarning:String});
const comparisonRows=computed(()=>compareEnsayos(props.tenso,props.uster || {},props.tensoHusos,props.usterHusos));
const rows=computed(()=>comparisonRows.value.filter(row=>row.label!=='Husos'));
</script>
<style scoped>
.tenso-cross-check { display:flex;flex-direction:column;position:relative; box-sizing:border-box; overflow-wrap:anywhere; container: tenso-comparison / inline-size; }
.tenso-cross-check > *{flex-shrink:0;}
.tenso-comparison-footer{margin-top:auto;padding-top:8px;}
.tenso-cross-check table { table-layout:fixed; }
.tenso-cross-check th:first-child { width:25%; }
.tenso-cross-check th:last-child { width:22%; }
.tenso-cross-check th,.tenso-cross-check td { overflow-wrap:anywhere; }
@container tenso-comparison (max-width:480px) {
  .match-status-text { display:none; }
}
</style>
