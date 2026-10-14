import { expect, it } from 'vitest';
import { restoreSavedUster } from './usterSaved.js';

it.each([10, 20])('recupera %i husos con títulos y mediciones confirmados, sin recuperar nulos del archivo', count => {
  const local = Array.from({ length: count }, (_, i) => ({ NO: String(i + 101), TITULO: '99', H: '8' }));
  const saved = local.map((row, i) => ({ NO_: Number(row.NO), TITULO: i === 0 ? null : 20.5, H: null, U_PERCENT: 0 }));
  const result = restoreSavedUster(local, saved);
  expect(result).toHaveLength(count);
  expect(result[0]).toMatchObject({ NO: '101', TITULO: '', H: '', 'U%_%': 0 });
  expect(result[1].TITULO).toBe(20.5);
  expect(local[0].TITULO).toBe('99');
});

it('bloquea archivos con cantidad u orden de husos diferentes', () => {
  expect(() => restoreSavedUster([{ NO: '1' }, { NO: '2' }], [{ NO_: 2 }, { NO_: 1 }])).toThrow('no coinciden');
  expect(() => restoreSavedUster([{ NO: '1' }], [])).toThrow('no coinciden');
});
