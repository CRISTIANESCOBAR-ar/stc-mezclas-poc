import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../backend/src/db/pg.js';
import { backupTrigger } from '../backend/src/services/backupTrigger.js';
import { validateTestImport, validateHviFiles, validateRawHvi } from '../backend/src/helpers/importValidation.js';

// Route tests isolate persistence completely: no connection to the real DB,
// schema changes, or external backup process can occur.
pool.query = async () => ({ rows: [], rowCount: 0 });
backupTrigger.schedule = () => true;
const modules = await Promise.all(['usterRoutes', 'tensorapidRoutes', 'usterCardasRoutes', 'hviRoutes', 'hviCrudoRoutes']
  .map(name => import(`../backend/src/routes/${name}.js`)));
const routes = modules.map(module => module.default);
const payloads = [
  { par: { TESTNR: '001' }, tbl: [{ NO_: 1, CVM_PERCENT: '12,5' }] },
  { par: { TESTNR: '001' }, tbl: [{ HUSO_NUMBER: 62, HUSO_ENSAYOS: '62/5', TENACIDAD: '16,5' }] },
  { par: { TESTNR: '001', SOURCE_PREFIX: 'cb' }, tbl: [{ NO_: 1, CVM_PERCENT: '12,5' }] },
  { files: [{ metadata: { loteEntrada: '123', proveedor: 'TEST', fileName: 'test.txt', fecha: '13/10/2026' }, details: [{ fardo: '01', str: '30,5' }] }] },
  { filename: 'test.txt', data: [{ Lote: '123', Proveedor: 'TEST', Fecha: '2026-10-13', Bale_ID: '01', Str: '30,5' }] }
];

async function invoke(index, body) {
  const endpoint = index === 3 ? '/save' : '/upload';
  const layer = routes[index].stack.find(layer => layer.route?.path === endpoint && layer.route.methods.post);
  const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await layer.route.stack[0].handle({ body }, response);
  return response;
}

for (let index = 0; index < routes.length; index++) {
  const name = ['Uster', 'TensoRapid', 'Cardas', 'HVI', 'HVI crudo'][index];
  test(`${name}: rejects incomplete replacement before acquiring a connection`, async () => {
    let connected = false;
    pool.connect = async () => { connected = true; throw new Error('Should not connect'); };
    const body = structuredClone(payloads[index]);
    if (index < 3) body.tbl = [];
    else if (index === 3) body.files[0].details = [];
    else body.data = [];
    const result = await invoke(index, body);
    assert.equal(result.code, 400);
    assert.equal(connected, false);
  });

  test(`${name}: rejects malformed numbers before deleting any existing data`, async () => {
    let connected = false;
    pool.connect = async () => { connected = true; throw new Error('Should not connect'); };
    const body = structuredClone(payloads[index]);
    if (index === 0 || index === 2) body.tbl[0].CVM_PERCENT = '12abc';
    else if (index === 1) body.tbl[0].TENACIDAD = '16abc';
    else if (index === 3) body.files[0].details[0].str = '30abc';
    else body.data[0].Str = '30abc';
    const result = await invoke(index, body);
    assert.equal(result.code, 400);
    assert.equal(connected, false);
  });

  test(`${name}: normalizes input and commits a complete replacement atomically`, async () => {
    const statements = [];
    let released = false;
    pool.connect = async () => ({
      query: async (sql, params) => {
        statements.push({ sql: sql.trim(), params });
        return { rows: /RETURNING id/.test(sql) ? [{ id: 1 }] : [], rowCount: 1 };
      },
      release: () => { released = true; }
    });
    const result = await invoke(index, structuredClone(payloads[index]));
    assert.equal(result.code, 200);
    assert.equal(result.data.success, true);
    assert.equal(statements[0].sql, 'BEGIN');
    assert.equal(statements.at(-1).sql, 'COMMIT');
    const value = index === 1 ? 16.5 : index < 3 ? 12.5 : 30.5;
    assert.ok(statements.some(statement => statement.params?.includes(value)));
    assert.equal(released, true);
    if (index === 2) assert.ok(!statements.some(statement => statement.sql.startsWith('DELETE FROM tb_uster_carda_titulo_tbl')));
    if (index === 1) assert.ok(statements.some(statement => statement.params?.includes(5)));
  });

  test(`${name}: rolls back and releases the connection after an insertion error`, async () => {
    const statements = [];
    let released = false;
    pool.connect = async () => ({
      query: async sql => {
        statements.push(sql.trim());
        if (/INSERT INTO tb_(?:uster_tbl|tensorapid_tbl|uster_carda_tbl|hvi_detalles|hvi_crudo_datos)/.test(sql)) throw new Error('Simulated DB failure');
        return { rows: /RETURNING id|SELECT id FROM tb_hvi_ensayos/.test(sql) ? [{ id: 1 }] : [] };
      },
      release: () => { released = true; }
    });
    const result = await invoke(index, structuredClone(payloads[index]));
    assert.equal(result.code, 500);
    assert.equal(statements.at(-1), 'ROLLBACK');
    assert.ok(statements.some(sql => sql.startsWith('DELETE FROM')));
    assert.ok(!statements.includes('COMMIT'));
    assert.equal(released, true);
  });
}

test('HVI batch validation checks every file before starting a transaction', async () => {
  let connected = false;
  pool.connect = async () => { connected = true; };
  const body = structuredClone(payloads[3]);
  body.files.push({ metadata: { loteEntrada: '456' }, details: [] });
  assert.equal((await invoke(3, body)).code, 400);
  assert.equal(connected, false);
});

test('Cardas distinguishes omitted manual counts from explicit deletion', () => {
  assert.equal(validateTestImport(payloads[2], 'carda').titulos, undefined);
  assert.deepEqual(validateTestImport({ ...payloads[2], titulos: [] }, 'carda').titulos, []);
  assert.throws(() => validateTestImport({ ...payloads[2], titulos: [{ REPNO: 1, TITULO: '12abc' }] }, 'carda'), /inválido/);
});

test('TensoRapid validates spindle/repetition notation and rejects disagreement', () => {
  const result = validateTestImport(payloads[1], 'tenso');
  assert.equal(result.tbl[0].HUSO_ENSAYOS, 5);
  const body = structuredClone(payloads[1]);
  body.tbl[0].HUSO_ENSAYOS = '63/5';
  assert.throws(() => validateTestImport(body, 'tenso'), /no coincide/);
});

test('HVI rejects duplicate bales and invalid dates', () => {
  const classic = structuredClone(payloads[3]);
  classic.files[0].details.push(classic.files[0].details[0]);
  assert.throws(() => validateHviFiles(classic), /duplicados/);
  const raw = structuredClone(payloads[4]);
  raw.data[0].Fecha = '2026-02-30';
  assert.throws(() => validateRawHvi(raw), /fecha inválida/);
});
