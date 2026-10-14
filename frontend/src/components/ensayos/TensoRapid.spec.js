import { mount,flushPromises } from '@vue/test-utils';
import { expect,it,vi } from 'vitest';
import TensoRapid from './TensoRapid.vue';
vi.mock('sweetalert2',()=>({default:{fire:vi.fn().mockResolvedValue({}),close:vi.fn()}}));
it('recupera mediciones confirmadas y corrige el vínculo sin enviar TBL',async()=>{
  const calls=[];
  vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
    calls.push({url,options});
    return new Response(JSON.stringify(options.method==='PATCH'?{success:true,version:'43'}:{version:'42',par:{TESTNR:'100001',USTER_TESTNR:'00260'},tbl:[{HUSO_NUMBER:101,HUSO_ENSAYOS:'101/5',TENACIDAD:20.5,TIEMPO_ROTURA:0}]}));
  }));
  const wrapper=mount(TensoRapid,{global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();wrapper.vm.filterMode='all';
    wrapper.vm.tensoScanList=[{testnr:'100001',saved:true,usterTestnr:'00260',confirmedUster:'00260',isEditing:false}];
    await wrapper.vm.loadTensoTestFiles('100001');
    expect(wrapper.vm.parsedTblData[0][1]).toBe('101/5');
    expect(wrapper.vm.preparedTblPreview[0].REPETICIONES).toBe(5);
    expect(wrapper.vm.preparedTblPreview[0].HUSO_NUMBER).toBe(101);
    expect(wrapper.vm.preparedTblPreview[0].TIEMPO_ROTURA).toBe('0');
    expect(wrapper.vm.preparedTblPreview[0].TENACIDAD).toBe('20.5');
    const row=wrapper.vm.tensoScanList[0];row.usterTestnr='00261';
    expect(wrapper.vm.hasUnsavedChanges).toBe(true);
    await wrapper.vm.saveToOracle(row);
    const call=calls.at(-1);
    expect(call.url).toBe('/api/tensorapid/tests/100001/link');
    expect(JSON.parse(call.options.body)).toEqual({version:'42',usterTestnr:'00261'});
    expect(wrapper.vm.hasUnsavedChanges).toBe(false);
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});

it('limita el DOM a 50 ensayos y termina la carga aunque el PAR local no responda',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({version:'42',par:{USTER_TESTNR:'00260'},tbl:[{HUSO_NUMBER:101,HUSO_ENSAYOS:5}]}))));
  const wrapper=mount(TensoRapid,{global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();wrapper.vm.filterMode='saved';
    wrapper.vm.tensoScanList=Array.from({length:120},(_,i)=>({testnr:String(100001+i),saved:true,usterTestnr:'00260',confirmedUster:'00260'}));
    wrapper.vm.tensoScanList[0].parHandle={getFile:()=>new Promise(()=>{})};
    expect(wrapper.vm.tensoDisplayList).toHaveLength(50);
    wrapper.vm.scanPage=3;
    expect(wrapper.vm.tensoDisplayList).toHaveLength(20);
    await wrapper.vm.loadTensoTestFiles('100001');
    expect(wrapper.vm.isLoadingSaved).toBe(false);
    expect(wrapper.vm.comparisonLocalLoading).toBe(true);
    expect(wrapper.vm.parsedTblData).toHaveLength(1);
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});
