import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeBlend } from '../../backend/src/services/blend/optimizer.js';

const algorithms = ['standard', 'stability', 'stability-strict'];
const lot = (id, count, weight, str, extras = {}) => ({ _lotId: id, PRODUTOR: 'TEST', LOTE: id, QTDE_ESTOQUE: count, PESO: count * weight, STR: str, ...extras });
const run = (stock, rules = [], settings = {}, size = 2, algorithm = 'standard') => optimizeBlend(stock, rules, settings, size, algorithm);

for (const algorithm of algorithms) {
  test(`${algorithm}: never consumes a rejected lot`, () => {
    const result = run([lot('bad', 4, 200, 10), lot('good', 4, 200, 30)],
      [{ parametro: 'STR', limite_min_absoluto: 25 }], { STR: { hardCap: true } }, 2, algorithm);
    const rejected = result.plan.find(row => row.LOTE === 'bad');
    assert.equal(rejected.Categoria, 'C');
    assert.equal(rejected.Usados, 0);
    assert.equal(rejected.Sobrante, 4);
    assert.ok(result.columnasMezcla.length);
  });

  test(`${algorithm}: search, validation and reporting agree on mass weighting`, () => {
    // Simple average = 30 (passes). Mass average = 25 (fails). A feasible
    // solution replaces the heavy low-quality bale using real spare stock.
    const result = run([lot('heavy', 4, 300, 20), lot('light', 4, 100, 40)],
      [{ parametro: 'STR', valor_ideal_min: 30 }], { STR: { target: true } }, 2, algorithm);
    assert.ok(result.columnasMezcla.length);
    for (const id of result.columnasMezcla) {
      const mass = result.plan.reduce((sum, row) => sum + (row.mezclas[id] || 0) * (row.LOTE === 'heavy' ? 300 : 100), 0);
      const expected = result.plan.reduce((sum, row) => sum + (row.mezclas[id] || 0) * (row.LOTE === 'heavy' ? 300 : 100) * row.STR, 0) / mass;
      assert.equal(result.estadisticas[id].variables.STR.promedioGeneral, expected);
      assert.ok(expected >= 30);
      assert.equal(result.estadisticas[id].pesoPorMezcla, mass);
    }
    result.plan.forEach(row => assert.equal(row.Stock, row.Usados + row.Sobrante));
  });

  test(`${algorithm}: rejects an infeasible weighted target without consuming stock`, () => {
    const result = run([lot('heavy', 1, 300, 20), lot('light', 1, 100, 40)],
      [{ parametro: 'STR', valor_ideal_min: 30 }], { STR: { target: true } }, 2, algorithm);
    assert.deepEqual(result.columnasMezcla, []);
    assert.equal(result.diagnostics.code, 'NO_FEASIBLE_BLOCK');
    assert.ok(result.plan.every(row => row.Usados === 0));
  });

  test(`${algorithm}: missing active measurement or mass excludes the lot`, () => {
    const result = run([lot('missing', 2, 200, null), lot('weightless', 2, 0, 35), lot('good', 2, 200, 35)],
      [{ parametro: 'STR', valor_ideal_min: 30 }], { STR: { target: true } }, 2, algorithm);
    assert.equal(result.plan.find(row => row.LOTE === 'missing').Usados, 0);
    assert.equal(result.plan.find(row => row.LOTE === 'weightless').Usados, 0);
    assert.equal(result.plan.find(row => row.LOTE === 'good').Usados, 2);
  });
}

test('weighted reporting excludes missing unmonitored values instead of treating them as zero', () => {
  const result = run([lot('a', 1, 300, 20, { MIC: 4 }), lot('b', 1, 100, 40, { MIC: null })]);
  assert.equal(result.estadisticas.M1.variables.STR.promedioGeneral, 25);
  assert.equal(result.estadisticas.M1.variables.MIC.promedioGeneral, 4);
  assert.equal(result.estadisticas.M1.variables.ELG.promedioGeneral, null);
});

test('zero upper bound is enforced and locale numbers are normalized', () => {
  const result = run([lot('a', 2, 200, '0', { PLUS_B: '1,2' })],
    [{ parametro: 'STR', promedio_objetivo_max: 0 }], { STR: { target: true } });
  assert.equal(result.estadisticas['M1'].variables.STR.promedioGeneral, 0);
  assert.throws(() => run([lot('a', 2, 200, 30)], [{ parametro: 'STR', valor_ideal_min: '30x' }]), /inválido/);
});

test('tolerance cup is by bale count, including a valid zero minimum ideal percentage', () => {
  for (const algorithm of ['standard', 'stability-strict']) {
    const result = run([lot('a', 4, 200, 25)],
      [{ parametro: 'STR', rango_tol_min: 24, rango_tol_max: 26, porcentaje_min_ideal: 0 }],
      { STR: { tolerance: true } }, 2, algorithm);
    assert.equal(result.plan[0].Usados, 4);
    assert.equal(result.estadisticas['M1-M2'].variables.STR.promedioTolerancia, 25);
  }
});

test('rejects fractional sizes, duplicate IDs and invalid stock without mutating inputs', () => {
  const stock = [lot('a', 4, 200, 30)];
  const before = structuredClone(stock);
  run(stock);
  assert.deepEqual(stock, before);
  assert.throws(() => run(stock, [], {}, 1.5), /entero/);
  assert.throws(() => run([...stock, ...stock]), /duplicados/);
  assert.throws(() => run([lot('x', 'oops', 200, 30)]), /inválido/);
});

test('replacement releases the original lot capacity across multiple target adjustments', () => {
  const result = run([lot('a', 3, 300, 20), lot('b', 3, 100, 40), lot('c', 2, 200, 35)],
    [{ parametro: 'STR', valor_ideal_min: 34, promedio_objetivo_max: 38 }], { STR: { target: true } });
  assert.ok(result.columnasMezcla.length);
  for (const row of result.plan) {
    assert.ok(row.Usados <= row.Stock);
    assert.equal(row.Stock, row.Usados + row.Sobrante);
  }
  for (const stats of Object.values(result.estadisticas)) assert.ok(stats.variables.STR.promedioGeneral >= 34 && stats.variables.STR.promedioGeneral <= 38);
});

test('disabled target is not enforced and stability keeps tolerance informational', () => {
  const rules = [{ parametro: 'STR', valor_ideal_min: 40, rango_tol_min: 20, rango_tol_max: 30, porcentaje_min_ideal: 100 }];
  const stock = [lot('a', 4, 200, 25)];
  assert.equal(run(stock, rules, { STR: { hardCap: true } }).plan[0].Usados, 4);
  assert.equal(run(stock, rules, { STR: { tolerance: true } }, 2, 'stability').plan[0].Usados, 4);
  assert.equal(run(stock, rules, { STR: { tolerance: true } }, 2, 'stability-strict').plan[0].Usados, 0);
});

test('all active targets must be satisfied simultaneously', () => {
  for (const algorithm of algorithms) {
    const result = run([
      lot('a', 2, 300, 20, { MIC: 3 }),
      lot('b', 2, 100, 40, { MIC: 6 }),
      lot('c', 2, 200, 35, { MIC: 4 }),
    ], [{ parametro: 'STR', valor_ideal_min: 34 }, { parametro: 'MIC', promedio_objetivo_max: 4.2 }],
    { STR: { target: true }, MIC: { target: true } }, 2, algorithm);
    assert.ok(result.columnasMezcla.length);
    for (const stats of Object.values(result.estadisticas)) {
      assert.ok(stats.variables.STR.promedioGeneral >= 34);
      assert.ok(stats.variables.MIC.promedioGeneral <= 4.2);
    }
  }
});
