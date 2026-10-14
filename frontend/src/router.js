import { loadSession, can } from './services/authSession.js';
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/ingresar', name: 'ingresar', component: () => import('./views/LoginView.vue'), meta: { title: 'Ingresar', public: true } },
  { path: '/usuarios', name: 'usuarios', component: () => import('./views/UsersView.vue'), meta: { title: 'Usuarios', role: 'administrador' } },
  { path: '/sin-permiso', component: () => import('./views/AccessDeniedView.vue'), meta: { title: 'Acceso restringido' } },
  {
    path: '/',
    redirect: () => (localStorage.getItem('stc_hide_welcome') === '1' ? '/inventario' : '/bienvenida'),
  },
  {
    path: '/bienvenida',
    name: 'bienvenida',
    component: () => import('./views/BienvenidaView.vue'),
    meta: { title: 'Bienvenido' },
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
    meta: { role: 'administrador', title: 'Configuración Estándares y Mezclas' }
  },
  {
    path: '/hvi',
    name: 'hvi',
    component: () => import('./views/HVIView.vue'),
    meta: { role: 'operador', title: 'Carga de Archivos HVI' }
  },
  {
    path: '/uster',
    name: 'uster',
    component: () => import('./views/UsterView.vue'),
    meta: { role: 'operador', title: 'Carga de Archivos Uster' }
  },
  {
    path: '/uster-cardas',
    name: 'uster-cardas',
    component: () => import('./views/UsterCardasView.vue'),
    meta: { role: 'operador', title: 'Carga de Archivos Uster Cardas' }
  },
  {
    path: '/hvi-crudo',
    name: 'hvi-crudo',
    component: () => import('./views/HviCrudoImport.vue'),
    meta: { role: 'operador', title: 'Carga HVI Crudo' }
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
    meta: { role: 'operador', title: 'Carga de Archivos TensoRapid' }
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
    path: '/matriz-control-uster',
    name: 'matriz-control-uster',
    component: () => import('./components/ensayos/MatrizControlUster.vue'),
    meta: { title: 'Matriz Control Uster' }
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
  },
  {
    path: '/narrativa-costos',
    name: 'narrativa-costos',
    component: () => import('./views/NarrativaCostosView.vue'),
    meta: { role: 'administrador', title: 'Reporte Costos IA' }
  },
  {
    path: '/backups',
    name: 'backups',
    component: () => import('./views/BackupsView.vue'),
    meta: { role: 'administrador', title: 'Visibilidad de Backups' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  document.title = to.meta.title ? to.meta.title + ' - STC' : 'STC';
  if (to.meta.public) return true;
  try {
    if (!await loadSession()) return { path: '/ingresar', query: { next: to.fullPath } };
  } catch { return { path: '/ingresar', query: { unavailable: '1', next: to.fullPath } }; }
  if (to.meta.role && !can(to.meta.role)) return '/sin-permiso';
  return true;
});

export default router
