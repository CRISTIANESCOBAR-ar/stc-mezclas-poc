import { mount } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import Uster from './Uster.vue';
import Swal from 'sweetalert2';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({}) } }));
let wrapper;
afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); });

it('ordena por fecha del PAR descendente aunque el número de ensayo sea menor',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({existing:['00999','00001','00002']}))));
  wrapper=mount(Uster,{global:{directives:{tippy:()=>{}}}});
  const files=[['00999','1700000000'],['00001','1791988223'],['00002','fecha inválida']].map(([id,time])=>{
    const rows=Array.from({length:34},()=>Array(12).fill(''));
    rows[8][4]=time;
    return {name:`STC03_${id}.PAR`,text:async()=>rows.map(row=>row.join('\t')).join('\n')};
  });
  await wrapper.vm.scanEntries(files);
  wrapper.vm.filterShowNotSaved=false;wrapper.vm.filterShowAll=true;
  expect(wrapper.vm.scanDisplayList.filter(row=>row.testnr).map(row=>row.testnr)).toEqual(['00001','00999','00002']);
});

it('navega con flechas sin reescribir títulos ni actualizar tooltips de 1449 ensayos', async () => {
  const updated=vi.fn();
  wrapper=mount(Uster,{attachTo:document.body,global:{directives:{tippy:{mounted:()=>{},updated}}}});
  wrapper.vm.filterShowNotSaved=false;wrapper.vm.filterShowAll=true;
  wrapper.vm.scanList=Array.from({length:1449},(_,i)=>({testnr:String(i+1).padStart(5,'0'),imp:true}));
  wrapper.vm.selectedTestnr='00001';
  wrapper.vm.savedPar={NOMCOUNT:20};
  wrapper.vm.tblData=Array.from({length:10},(_,i)=>({TESTNR:'00001',NO:i+1,TITULO:20.5}));
  wrapper.vm.pasador='No';
  wrapper.vm.confirmedDraft=structuredClone(wrapper.vm.manualDraft());
  await wrapper.vm.$nextTick();
  wrapper.vm.focusPasadorAndSelectSi();
  await wrapper.vm.$nextTick();
  expect(wrapper.vm.pasador).toBe('No');
  expect(wrapper.vm.hasUnsavedChanges).toBe(false);
  updated.mockClear();
  const first=wrapper.find('#titulo-input-0').element;
  expect(first.closest('td').dataset.tolerance).toBe('thinner');
  first.focus();
  await wrapper.find('#titulo-input-0').trigger('keydown',{key:'ArrowDown'});
  expect(document.activeElement.id).toBe('titulo-input-1');
  await wrapper.find('#titulo-input-1').trigger('keydown',{key:'ArrowUp'});
  expect(document.activeElement.id).toBe('titulo-input-0');
  expect(wrapper.vm.tblData.every(row=>row.TITULO===20.5)).toBe(true);
  expect(wrapper.vm.hasUnsavedChanges).toBe(false);
  expect(updated.mock.calls.filter(([element])=>element.closest('.scan-table'))).toHaveLength(0);
});

it('selecciona el primer pendiente al escanear y enfoca Estiraje', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ existing: ['00259'] }))));
  wrapper = mount(Uster, { attachTo: document.body, global: { directives: { tippy: () => {} } } });
  const par = Array.from({ length: 34 }, () => Array(12).fill('').join('\t')).join('\n');
  const files = ['00259', '00260', '00261'].flatMap(id => [
    { name: `STC03_${id}.PAR`, text: async () => par },
    { name: `STC03_${id}.TBL`, text: async () => '' },
  ]);
  await wrapper.vm.onFolderInputChange({ target: { files } });
  expect(wrapper.vm.selectedTestnr).toBe('00260');
  expect(document.activeElement).toBe(wrapper.vm.$.setupState.estirajeInput);
  await wrapper.vm.selectRow('00261');
  await wrapper.vm.scanEntries(files);
  expect(wrapper.vm.selectedTestnr).toBe('00261');
});

it('el selector alternativo aplica el estado remoto y permite filtrar guardados', async () => {
  const rows = Array.from({ length: 34 }, () => Array(12).fill(''));
  rows[12][4] = '12';
  rows[14][4] = '30';
  const par = rows.map(row => row.join('\t')).join('\n');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ existing: ['00260'] }) }));
  wrapper = mount(Uster, { global: { directives: { tippy: () => {} } } });
  const files = [
    { name: 'STC03_00260.PAR', webkitRelativePath: 'Uster/STC03_00260.PAR', text: async () => par },
    { name: 'STC03_00260.TBL', webkitRelativePath: 'Uster/STC03_00260.TBL', text: async () => '' },
  ];
  await wrapper.vm.onFolderInputChange({ target: { files } });
  expect(wrapper.vm.scanList).toMatchObject([{ testnr: '00260', hasPar: true, hasTbl: true, imp: true }]);
  wrapper.vm.filterShowNotSaved = false;
  wrapper.vm.filterShowSaved = true;
  expect(wrapper.vm.scanDisplayList.filter(item => item.testnr).map(item => item.testnr)).toEqual(['00260']);
});

it('al reabrir recupera Estiraje, Pasador y títulos de la base, aunque el TBL sea antiguo', async () => {
  const parRows = Array.from({ length: 34 }, () => Array(12).fill(''));
  parRows[14][4] = '30';
  const lines = Array.from({ length: 5 }, () => 'encabezado');
  for (let i = 0; i < 10; i++) {
    const row = Array(28).fill(''); row[0] = String(101 + i); row[8] = '99';
    lines.push(row.join('\t'));
  }
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify({
    version: '42', par: { TESTNR: '00260', ESTIRAJE: '1.25', PASADOR: 'No', MATCLASS: 'Hilo', NOMCOUNT: '30' },
    tbl: Array.from({ length: 10 }, (_, i) => ({ NO_: i + 101, TITULO: 20.5 })),
  }))));
  wrapper = mount(Uster, { global: { directives: { tippy: () => {} } } });
  wrapper.vm.scanList = [{ testnr: '00260', imp: true,
    parHandle: { name: 'STC03_00260.PAR', text: async () => parRows.map(row => row.join('\t')).join('\n') },
    tblHandle: { name: 'STC03_00260.TBL', text: async () => lines.join('\n') },
  }];
  wrapper.vm.filterShowNotSaved = false;
  wrapper.vm.filterShowAll = true;
  await wrapper.vm.selectRow('00260');
  expect(wrapper.vm.estiraje).toBe('1.25');
  expect(wrapper.vm.pasador).toBe('No');
  expect(wrapper.vm.tblData.map(row => row.TITULO)).toEqual(Array(10).fill(20.5));
  expect(wrapper.vm.savedLoadError).toBe('');
  expect(wrapper.vm.canSave).toBeTruthy();
  await wrapper.find('#titulo-input-0').trigger('focus');
  expect(wrapper.vm.hasUnsavedChanges).toBe(false);
  await wrapper.find('#titulo-input-0').trigger('blur');
  expect(Number(wrapper.vm.tblData[0].TITULO)).toBe(20.5);
  expect(wrapper.vm.hasUnsavedChanges).toBe(false);
  wrapper.vm.tblData[0].TITULO='20.50';
  expect(wrapper.vm.hasUnsavedChanges).toBe(false);
  wrapper.vm.tblData[0].TITULO='20.51';
  expect(wrapper.vm.hasUnsavedChanges).toBe(true);
  wrapper.vm.tblData[0].TITULO=20.5;
  wrapper.vm.estiraje = '2.00';
  wrapper.vm.tblData[0].TITULO = '';
  expect(wrapper.vm.hasUnsavedChanges).toBe(true);
  Swal.fire.mockResolvedValueOnce({ isDismissed: true });
  await wrapper.vm.selectRow('another');
  expect(wrapper.vm.selectedTestnr).toBe('00260');
  expect(wrapper.vm.estiraje).toBe('2.00');
  expect(wrapper.vm.savedPar.ESTIRAJE).toBe('1.25');
  wrapper.vm.discardChanges();
  expect(wrapper.vm.estiraje).toBe('1.25');
  expect(wrapper.vm.tblData[0].TITULO).toBe(20.5);
  expect(wrapper.vm.hasUnsavedChanges).toBe(false);
  wrapper.vm.estiraje = '';
  await wrapper.vm.saveCurrentTest();
  const [url, options] = fetch.mock.calls.at(-1);
  expect(url).toBe('/api/uster/tests/00260/manual');
  expect(options.method).toBe('PATCH');
  expect(JSON.parse(options.body)).toMatchObject({ version: '42', estiraje: '', pasador: 'No' });
  expect(JSON.parse(options.body)).not.toHaveProperty('tbl');
});
