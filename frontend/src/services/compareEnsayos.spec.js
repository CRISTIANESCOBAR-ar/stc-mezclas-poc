import { expect,it } from 'vitest';
import { compareEnsayos } from './compareEnsayos.js';
it('tolera guiones repetidos del operador sin ocultar diferencias reales del lote',()=>{
  const compare=(left,right)=>compareEnsayos({LOTE:left},{LOTE:right},[],[])[1];
  expect(compare('HD-141--26','HD-141-26').status).toBe('Coincide');
  expect(compare('HD-141---26','HD-142-26').status).toBe('Difiere');
  expect(compare('HD-0141--26','HD-141-26').status).toBe('Difiere');
  expect(compare('HD-141--26','HD-141-26').tenso).toBe('HD-141--26');
});
it('compara hilo, lote y máquina sin exigir igualdad del número de ensayo',()=>{
  const rows=compareEnsayos({TESTNR:'100001',NOMCOUNT:'30,00',LOTE:' abc ',MASCHNR:'01'},{TESTNR:'00260',NOMCOUNT:30,LOTE:'ABC',MASCHNR:'1'},[102,101,101],[101,102]);
  expect(rows.map(row=>row.status)).toEqual(['Coincide','Coincide','Coincide','Coincide']);
});
it('distingue discrepancias de husos y campos ausentes, sin asignar equivalencias físicas',()=>{
  const rows=compareEnsayos({NOMCOUNT:30,LOTE:'A',MASCHNR:'1'},{NOMCOUNT:30,LOTE:'B'},[101,102],[1,2]);
  expect(rows.map(row=>row.status)).toEqual(['Coincide','Difiere','Sin dato','Difiere']);
  expect(rows[3].tenso).toBe('101, 102');
  expect(rows[3].uster).toBe('1, 2');
});
