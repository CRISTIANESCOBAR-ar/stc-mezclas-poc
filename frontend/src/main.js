import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueTippy from 'vue-tippy'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import './style.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n/index.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(VueTippy, {
  directive: 'tippy',
  defaultProps: {
    placement: 'top',
    allowHTML: true,
    theme: 'light',
    appendTo: () => document.body,
    popperOptions: {
      strategy: 'fixed'
    }
  }
})

app.mount('#app')
