import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalNumber, requiredNumber, weightedAverage } from '../shared/numbers.js';
import { CottonBale } from '../frontend/src/models/CottonBale.js';
import { MixingRuleDTO } from '../backend/src/repositories/standardsRepository.js';
import { withStockQuantity, aggregateStock, expandStockGroups } from '../shared/blendStock.js';

test('normalizes complete decimal values and preserves zero', () => {
  for (const [input, expected] of [['1.234,56', 1234.56], ['1,234.56', 1234.56], ['4,34', 4.34], ['1.234', 1.234], ['1.234.567', 1234567], ['0', 0], ['-0,5', -0.5], [0, 0]]) assert.equal(optionalNumber(input), expected);
});
test('missing or malformed values never become zero or a truncated prefix', () => {
  for (const input of [null, undefined, '', ' ', '-', '12abc', 'Infinity', Infinity, NaN, false, [], '1.23,4']) assert.equal(optionalNumber(input), null);
  assert.throws(() => requiredNumber('12abc', 'dato'), /inválido/);
  assert.equal(requiredNumber('', 'dato', { optional: true }), null);
});
test('weighted average uses only positive known masses and known measurements', () => {
  const rows = [{ value: 20, mass: 300 }, { value: 40, mass: 100 }, { value: null, mass: 1000 }];
  assert.equal(weightedAverage(rows, r => r.value, r => r.mass), 25);
  assert.equal(weightedAverage([], r => r.value, r => r.mass), null);
});
test('frontend stock model preserves missing measurements and rule DTO preserves numeric zeros', () => {
  const bale = new CottonBale({ MIC: '', STR: '30,5', PESO: '1.234,56' });
  assert.equal(bale.MIC, null);
  assert.equal(bale.STR, 30.5);
  assert.equal(bale.PESO, 1234.56);
  assert.equal(new MixingRuleDTO({ limite_min_absoluto: 0 }).limite_min_absoluto, 0);
});

test('available stock scales mass and groups preserve original lots', () => {
  const original = { QTDE_ESTOQUE: 10, PESO: 3000, STR: 20 };
  const available = withStockQuantity(original, 2);
  assert.equal(available.PESO, 600);
  assert.equal(available.PESO_MEDIO, 300);
  const lots = [available, { QTDE_ESTOQUE: 2, PESO: 200, STR: 40 }];
  const group = aggregateStock(lots, ['STR', 'PESO_MEDIO']);
  assert.equal(group.STR, 25);
  assert.equal(group.PESO, 800);
  assert.equal(group.PESO_MEDIO, 200);
  assert.deepEqual(expandStockGroups([{ ...group, _sourceLots: lots }]), lots);
  assert.equal(original.PESO, 3000);
});
