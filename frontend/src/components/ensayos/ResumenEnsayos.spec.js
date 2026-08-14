import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ResumenEnsayos from '@/components/ensayos/ResumenEnsayos.vue'

describe('ResumenEnsayos', () => {
  it('no debería mostrar Consulta en lenguaje natural', () => {
    const wrapper = mount(ResumenEnsayos, {
      global: {
        stubs: ['router-link', 'router-view'],
        directives: {
          tippy: () => {}
        }
      }
    })
    
    expect(wrapper.text()).not.toContain('Consulta en lenguaje natural')
  })
})
