import test from 'node:test';
import assert from 'node:assert/strict';
import { updateManual, validateManual } from '../backend/src/services/usterManual.js';
import { minimumRole } from '../backend/src/security/access.js';

const body = { version: '42', estiraje: '', pasador: '', matclass: 'Hilo', titulos: [{ huso: 101, titulo: '' }, { huso: 102, titulo: '20,50' }] };
function database(version = '42') {
  const calls = [];
  const client = { release() {}, async query(sql, args) {
    calls.push({ sql, args });
    if (sql.startsWith('SELECT xmin')) return { rows: [{ version }] };
    if (sql.startsWith('SELECT no_')) return { rows: [{ no_: 101 }, { no_: 102 }] };
    if (sql.startsWith('UPDATE tb_uster_par')) return { rows: [{ version: '43' }] };
    return { rows: [] };
  } };
  return { calls, pool: { connect: async () => client } };
}
test('manual correction clears explicit blanks and preserves all equipment measurements', async () => {
  const { calls, pool } = database();
  assert.equal((await updateManual(pool, '00260', body)).version, '43');
  const writes = calls.filter(call => call.sql.startsWith('UPDATE tb_uster_'));
  assert.equal(writes.length, 3);
  assert.deepEqual(writes[0].args, ['00260', null, null, 'Hilo']);
  assert.deepEqual(writes[1].args, ['00260', 101, null]);
  assert.deepEqual(writes[2].args, ['00260', 102, 20.5]);
  assert.ok(writes.slice(1).every(call => call.sql === 'UPDATE tb_uster_tbl SET titulo=$3 WHERE testnr=$1 AND no_=$2'));
  assert.equal(calls.at(-1).sql, 'COMMIT');
});
test('stale versions roll back without changing manual data', async () => {
  const { calls, pool } = database('99');
  await assert.rejects(updateManual(pool, '00260', body), error => error.statusCode === 409);
  assert.ok(!calls.some(call => call.sql.startsWith('UPDATE')));
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
});
test('manual validation rejects duplicate spindles, invalid material and invalid title', () => {
  assert.throws(() => validateManual({ ...body, titulos: [{ huso: 1, titulo: 20 }, { huso: 1, titulo: 20 }] }));
  assert.throws(() => validateManual({ ...body, matclass: 'unknown' }));
  assert.throws(() => validateManual({ ...body, titulos: [{ huso: 1, titulo: 'broken' }] }));
  assert.equal(minimumRole('PATCH', '/uster/tests/00260/manual'), 'operador');
});
