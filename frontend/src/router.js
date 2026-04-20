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
