import { mount,flushPromises } from '@vue/test-utils';
import { expect,it,vi } from 'vitest';
import TensoRapid from './TensoRapid.vue';
import Swal from 'sweetalert2';
vi.mock('sweetalert2',()=>({default:{fire:vi.fn().mockResolvedValue({isConfirmed:true}),close:vi.fn()}}));
it('ordena Tensorapid por fecha del PAR y deja al final las fechas ausentes',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({existing:['000071','000072','000073'],details:{}}))));
  const wrapper=mount(TensoRapid,{global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();
    const files=[['000071','14.10.2026'],['000072','13.10.2026'],['000073','']].map(([id,date])=>{
      const rows=Array.from({length:34},()=>Array(12).fill(''));
      rows[8][7]=date;
      return {name:`STC03_${id}.PAR`,text:async()=>rows.map(row=>row.join('\t')).join('\n')};
    });
    await wrapper.vm.onTensoFolderInputChangeLocal({target:{files}});
    expect(wrapper.vm.tensoScanList.map(row=>row.testnr)).toEqual(['000071','000072','000073']);
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});
it('limpia y oculta el detalle cuando el filtro excluye el ensayo seleccionado',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({version:'42',par:{TESTNR:'000071',USTER_TESTNR:'00260'},tbl:[{HUSO_NUMBER:2,HUSO_ENSAYOS:5}]}))));
  const wrapper=mount(TensoRapid,{global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();
    wrapper.vm.tensoScanList=[{testnr:'000071',saved:true,usterTestnr:'00260',confirmedUster:'00260'}];
    wrapper.vm.changeFilter('saved');
    await wrapper.vm.loadTensoTestFiles('000071');
    wrapper.vm.changeFilter('all');
    expect(wrapper.vm.selectedTensoTestnr).toBe('000071');
    wrapper.vm.changeFilter('not');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.selectedTensoTestnr).toBe('');
    expect(wrapper.vm.parsedTblData).toEqual([]);
    expect(wrapper.vm.parsedParData).toEqual({});
    expect(wrapper.vm.comparisonUster).toBe(null);
    expect(wrapper.find('.tenso-detail-column').isVisible()).toBe(false);
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});
it('reúne todas las discrepancias y requiere confirmación explícita',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({par:{NOMCOUNT:20,LOTE:'B',MASCHNR:'02'},tbl:[{NO_:4}]}))));
  const wrapper=mount(TensoRapid,{global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();
    Swal.fire.mockClear();
    Swal.fire.mockResolvedValueOnce({isDismissed:true});
    const item={testnr:'000071',usterTestnr:'00260',saved:false};
    expect(await wrapper.vm.confirmCrossCheck(item,{NOMCOUNT:10,LOTE:'A',MASCHNR:'01'},[2])).toBe(false);
    const options=Swal.fire.mock.calls[0][0];
    for(const label of ['Título (Ne)','Lote','Máquina','Husos'])expect(options.text).toContain(label);
    expect(options.allowEnterKey).toBe(false);
    Swal.fire.mockResolvedValueOnce({isConfirmed:true});
    expect(await wrapper.vm.confirmCrossCheck(item,{NOMCOUNT:10,LOTE:'A',MASCHNR:'01'},[2])).toBe(true);
    expect(fetch.mock.calls.every(([url])=>!url.endsWith('/upload'))).toBe(true);
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});
it('un ensayo pendiente permite cancelar el número Uster y oculta sus acciones',async()=>{
  const wrapper=mount(TensoRapid,{attachTo:document.body,global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();
    wrapper.vm.tensoScanList=[{testnr:'000071',saved:false,usterTestnr:'00260',confirmedUster:'',isEditing:false}];
    await wrapper.vm.$nextTick();
    const buttons=()=>wrapper.findAll('button');
    expect(buttons().some(button=>button.text()==='Guardar')).toBe(true);
    expect(buttons().some(button=>button.text()==='Eliminar')).toBe(false);
    await buttons().find(button=>button.text()==='Cancelar').trigger('click');
    await flushPromises();
    expect(wrapper.vm.tensoScanList[0].usterTestnr).toBe('');
    expect(buttons().some(button=>['Guardar','Cancelar'].includes(button.text()))).toBe(false);
    expect(document.activeElement).toBe(wrapper.vm.$.setupState.inputRefs['000071']);
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});
it('al guardar habilita y enfoca el campo Uster del siguiente pendiente',async()=>{
  vi.stubGlobal('fetch',vi.fn(async url=>new Response(JSON.stringify(
    url.startsWith('/api/uster/tests/')?{par:{},tbl:[{NO_:2}]}:
    url.endsWith('/status')?{existing:['00260']}:
    url.endsWith('/husos')?{husos:[2]}:
    {success:true,version:'43'}
  ))));
  const wrapper=mount(TensoRapid,{attachTo:document.body,global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();
    const par=Array.from({length:34},()=>Array(12).fill('').join('\t')).join('\n');
    const tbl='\n'.repeat(5)+'2/5\t0.5\t1000\t9\t16\t20';
    wrapper.vm.tensoScanList=['000071','000072'].map(testnr=>({testnr,saved:false,usterTestnr:testnr==='000071'?'00260':'',confirmedUster:'',
      parFile:{text:async()=>par},tblFile:{name:`STC03_${testnr}.TBL`,text:async()=>tbl}}));
    await wrapper.vm.loadTensoTestFiles('000071');
    await wrapper.vm.saveToOracle(wrapper.vm.tensoScanList[0]);
    expect(wrapper.vm.tensoScanList[0].saved).toBe(true);
    expect(wrapper.vm.selectedTensoTestnr).toBe('000072');
    const input=wrapper.vm.$.setupState.inputRefs['000072'];
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(wrapper.vm.tblTestnr).toBe('000072');
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});
it('selecciona el primer pendiente y enfoca su número Uster después del escaneo',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({existing:['000071'],details:{}}))));
  const wrapper=mount(TensoRapid,{attachTo:document.body,global:{directives:{tippy:()=>{}}}});
  try{
    await flushPromises();
    const par=Array.from({length:34},()=>Array(12).fill('').join('\t')).join('\n');
    const files=['000071','000072','000073'].flatMap(id=>[
      {name:`STC03_${id}.PAR`,text:async()=>par},
      {name:`STC03_${id}.TBL`,text:async()=>''},
    ]);
    await wrapper.vm.onTensoFolderInputChangeLocal({target:{files}});
    expect(wrapper.vm.tensoScanList.map(row=>row.testnr)).toEqual(['000073','000072','000071']);
    expect(wrapper.vm.selectedTensoTestnr).toBe('000073');
    expect(document.activeElement).toBe(wrapper.vm.$.setupState.inputRefs['000073']);
    await wrapper.vm.loadTensoTestFiles('000072');
    await wrapper.vm.selectFirstPending();
    expect(wrapper.vm.selectedTensoTestnr).toBe('000072');
  }finally{wrapper.unmount();vi.unstubAllGlobals()}
});
it('recupera mediciones confirmadas y corrige el vínculo sin enviar TBL',async()=>{
  const calls=[];
  vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
    calls.push({url,options});
    if(url.startsWith('/api/uster/tests/'))return new Response(JSON.stringify({par:{},tbl:[{NO_:101}]}));
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
