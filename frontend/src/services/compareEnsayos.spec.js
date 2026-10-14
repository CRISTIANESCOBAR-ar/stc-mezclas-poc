import { expect,it } from 'vitest';
import { compareEnsayos } from './compareEnsayos.js';
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
