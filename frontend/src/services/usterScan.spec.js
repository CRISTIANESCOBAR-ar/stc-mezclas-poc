import { expect, it } from 'vitest';
import { scanUsterFiles } from './usterScan.js';

it('lee PAR en paralelo con un límite y conserva parejas, exclusiones y orden', async () => {
  let active = 0, peak = 0, reads = 0;
  const entries = [];
  for (let i = 20; i > 0; i--) {
    entries.push({ name: `${i}.PAR`, async text() {
      active++; reads++; peak = Math.max(peak, active);
      await Promise.resolve(); active--; return String(i);
    } });
    entries.push({ name: `${i}.TBL`, text() { throw Error('TBL no debe leerse durante el escaneo'); } });
  }
  const result = await scanUsterFiles(entries, {
    getTestnr: name => name.split('.')[0].padStart(5, '0'),
    readHeader: text => text === '3' ? null : { nomcount: '30' },
  });
  expect(peak).toBe(8);
  expect(reads).toBe(20);
  expect(result).toHaveLength(19);
  expect(result[0]).toMatchObject({ testnr: '00001', hasPar: true, hasTbl: true });
  expect(result.some(row => row.testnr === '00003')).toBe(false);
});
