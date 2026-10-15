import { expect,it } from 'vitest';
import { assayTimestamp } from './assayTimestamp.js';
it('interpreta la fecha del ensayo en segundos y milisegundos sin perder segundos',()=>{
  expect(assayTimestamp('1791988223')).toBe(1791988223000);
  expect(assayTimestamp('1791988223000')).toBe(1791988223000);
});
it('interpreta calendario y hora y rechaza fechas inválidas',()=>{
  expect(assayTimestamp('14/10/2026 09:35:01')).toBe(Date.UTC(2026,9,14,9,35,1));
  expect(assayTimestamp('31/02/2026')).toBe(null);
  expect(assayTimestamp('14/10/2026 25:00')).toBe(null);
  expect(assayTimestamp('')).toBe(null);
});
