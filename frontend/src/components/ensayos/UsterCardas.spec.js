import { mount, flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import UsterCardas from './UsterCardas.vue'
import { validateTestImport } from '../../../../backend/src/helpers/importValidation.js'

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({}) } }))

it('no permite títulos con un prefijo numérico seguido de texto', async () => {
  const wrapper = mount(UsterCardas)
  await flushPromises()
  wrapper.vm.selectedTestnr = 'CB::001'
  wrapper.vm.tblData = [{ NO_: 1, CVM_PERCENT: '12,5' }]
  wrapper.vm.tituloInputs = ['1,5', '2', '12abc']
  expect(wrapper.vm.canSave).toBe(false)
  wrapper.unmount()
})

it('envía títulos completos y el servidor interpreta sus decimales con coma', async () => {
  let payload
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    expect(url).toBe('/api/uster-cardas/upload')
    payload = JSON.parse(options.body)
    const normalized = validateTestImport(payload, 'carda')
    expect(normalized.titulos.map(row => row.TITULO)).toEqual([1.5, 2, 2.5])
    return { ok: true, json: async () => ({ success: true }) }
  }))
  const wrapper = mount(UsterCardas)
  try {
    await flushPromises()
    wrapper.vm.scanList = [{ recordKey: 'CB::001', testnr: '001', sourcePrefix: 'CB' }]
    wrapper.vm.selectedTestnr = 'CB::001'
    wrapper.vm.tblData = [{ NO_: 1, CVM_PERCENT: '12,5' }]
    wrapper.vm.tituloInputs = ['1,5', '2', '2,5']
    expect(wrapper.vm.canSave).toBe(true)
    await wrapper.vm.saveCurrentTest()
    expect(payload.titulos.map(row => row.TITULO)).toEqual(['1,5', '2', '2,5'])
  } finally {
    wrapper.unmount()
    vi.unstubAllGlobals()
  }
})

it('recupera tres títulos por equipo y número y corrige sin reimportar las mediciones', async () => {
  const calls=[]
  vi.stubGlobal('fetch',vi.fn(async (url,options) => {
    calls.push({url,options})
    return new Response(JSON.stringify(options.method==='PATCH'
      ? { success:true,version:'43' }
      : { version:'42',par:{ TESTNR:'001',SOURCE_PREFIX:'CB',MACHINE_FAMILY:'TRUTZSCHLER',TIME_STAMP:'',OBS:'Observación extensa' },
        tbl:[{ NO_:1,SEQNO:1,CVM_PERCENT:12.5 }],
        titulos:[{ REPNO:1,TITULO:1.5 },{ REPNO:2,TITULO:2 },{ REPNO:3,TITULO:2.5 }] }))
  }))
  const wrapper=mount(UsterCardas,{global:{directives:{tippy:()=>{}}}})
  try {
    await flushPromises()
    wrapper.vm.filterMode='all'
    wrapper.vm.scanList=[{ recordKey:'CB::1',testnr:'001',sourcePrefix:'CB',imp:true,
      parHandle:{ name:'STC01_00001.PAR',text:async()=>'' },
      tblHandle:{ name:'STC01_00001.TBL',text:async()=>['header','header','header','header','header','1\t0\t99'].join('\n') } }]
    await wrapper.vm.selectRow('CB::1')
    expect(wrapper.vm.tituloInputs).toEqual([1.5,2,2.5])
    expect(wrapper.vm.tblData[0].CVM_PERCENT).toBe(12.5)
    wrapper.vm.tituloInputs[0]='1.75'
    expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    wrapper.vm.discardChanges()
    expect(wrapper.vm.tituloInputs[0]).toBe(1.5)
    wrapper.vm.tituloInputs[0]='1.75'
    await wrapper.vm.saveCurrentTest()
    const call=calls.at(-1)
    expect(call.url).toBe('/api/uster-cardas/tests/CB/001/manual')
    expect(call.options.method).toBe('PATCH')
    expect(JSON.parse(call.options.body)).not.toHaveProperty('tbl')
    expect(JSON.parse(call.options.body).version).toBe('42')
    expect(wrapper.vm.hasUnsavedChanges).toBe(false)
  } finally { wrapper.unmount();vi.unstubAllGlobals() }
})
