import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ResumenEnsayos from '@/components/ensayos/ResumenEnsayos.vue'

vi.mock('@/services/dataService', () => ({
  getDataSource: () => 'postgresql',
  fetchAllStatsData: vi.fn().mockResolvedValue({ usterPar: [], usterTbl: [], tensorapidPar: [], tensorapidTbl: [], calidadFibra: [] })
}))

describe('ResumenEnsayos', () => {
  it('no debería mostrar Consulta en lenguaje natural', async () => {
    const wrapper = mount(ResumenEnsayos, {
      global: {
        stubs: ['router-link', 'router-view'],
        directives: {
          tippy: () => {}
        }
      }
    })
    
    await flushPromises()
    expect(wrapper.text()).not.toContain('Consulta en lenguaje natural')
    wrapper.unmount()
  })
})
