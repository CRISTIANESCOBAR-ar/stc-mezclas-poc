import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { 
    path: '/', 
    redirect: '/inventario' 
  },
  { 
    path: '/inventario', 
    name: 'inventario',
    component: () => import('./views/InventarioView.vue'),
    meta: { title: 'Gestión de Inventario (MP)' } 
  },
  { 
    path: '/configuracion-estandares', 
    name: 'configuracion-estandares',
    component: () => import('./views/ConfiguracionEstandaresView.vue'),
    meta: { title: 'Configuración Estándares y Mezclas' } 
  },
  { 
    path: '/hvi', 
    name: 'hvi',
    component: () => import('./views/HVIView.vue'),
    meta: { title: 'Carga de Archivos HVI' } 
  },
  {
    path: '/uster',
    name: 'uster',
    component: () => import('./views/UsterView.vue'),
    meta: { title: 'Carga de Archivos Uster' }
  },
  {
    path: '/uster-cardas',
    name: 'uster-cardas',
    component: () => import('./views/UsterCardasView.vue'),
    meta: { title: 'Carga de Archivos Uster Cardas' }
  },
  {
    path: '/oe-trazabilidad',
    name: 'oe-trazabilidad',
    component: () => import('./views/OETrazabilidadView.vue'),
    meta: { title: 'Trazabilidad OE' }
  },
  {
    path: '/tensorapid',
    name: 'tensorapid',
    component: () => import('./views/TensoRapidView.vue'),
    meta: { title: 'Carga de Archivos TensoRapid' }
  },
  {
    path: '/relato-ia',
    name: 'relato-ia',
    component: () => import('./views/RelatoIAView.vue'),
    meta: { title: 'Relato Integral IA' }
  },
  // NUEVAS RUTAS DE REPORTES
  {
    path: '/resumen',
    name: 'resumen',
    component: () => import('./components/ensayos/ResumenEnsayos.vue'),
    meta: { title: 'Resumen Ensayos' }
  },
  {
    path: '/resumen-cardas',
    name: 'resumen-cardas',
    component: () => import('./components/ensayos/ResumenEnsayosCardas.vue'),
    meta: { title: 'Resumen Ensayos Cardas' }
  },
  {
    path: '/resumen-semanal-hilanderia',
    name: 'resumen-semanal-hilanderia',
    component: () => import('./components/ensayos/ResumenSemanalHilanderia.vue'),
    meta: { title: 'Resumen Semanal Hilanderia' }
  },
  {
    path: '/analisis-calidad-fibra',
    name: 'analisis-calidad-fibra',
    component: () => import('./components/ensayos/AnalisisCalidadFibra.vue'),
    meta: { title: 'Análisis Calidad Fibra' }
  },
  {
    path: '/informe-auditoria-lote',
    name: 'informe-auditoria-lote',
    component: () => import('./components/ensayos/InformeAuditoriaLote.vue'),
    meta: { title: 'Informe Auditoría Lote' }
  },
  {
    path: '/resumen-diario',
    name: 'resumen-diario',
    component: () => import('./components/ensayos/ResumenDiario.vue'),
    meta: { title: 'Resumen Diario' }
  },
  {
    path: '/dashboard-mezcla',
    name: 'dashboard-mezcla',
    component: () => import('./components/ensayos/DashboardMezclaHilo.vue'),
    meta: { title: 'Dashboard Mezcla' }
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('./components/UsterStatsPage.vue'),
    meta: { title: 'Gráficos Ensayos' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title 
    ? `${to.meta.title} - STC PoC` 
    : 'STC PoC'
  next()
})

export default router
