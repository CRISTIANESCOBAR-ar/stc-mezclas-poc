import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readMigrations, applyMigrations, migrationStatus, requireReadyDatabase } from '../backend/src/db/migrations.js';
import { createBackup, verifyBackup, restoreTest } from '../backend/src/services/backups.js';
import { BackupTrigger } from '../backend/src/services/backupTrigger.js';
import { readConfig } from '../backend/src/config.js';

test('migrations apply once with checksums, transactions and a shared lock', async () => {
  const migrations = await readMigrations();
  const applied = [], statements = [];
  const client = { query: async (sql, args) => {
    statements.push(sql);
    if (sql.startsWith('SELECT name')) return { rows: applied };
    if (sql.startsWith('INSERT INTO stc_schema_migrations')) applied.push({ name: args[0], checksum: args[1] });
    return { rows: [] };
  }, release() {} };
  const pool = { connect: async () => client };
  assert.deepEqual(await applyMigrations(pool), migrations.map(migration => migration.name));
  assert.deepEqual(await applyMigrations(pool), []);
  assert.equal(statements.filter(sql => sql === 'COMMIT').length, migrations.length);
  assert.match(statements[0], /pg_advisory_lock/);
});
test('migration failures roll back and do not register a partial migration', async () => {
  const statements = [];
  const client = { query: async sql => {
    statements.push(sql);
    if (sql.startsWith('-- Baseline')) throw new Error('Simulated DDL failure');
    return { rows: [] };
  }, release() {} };
  await assert.rejects(() => applyMigrations({ connect: async () => client }), /DDL failure/);
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(!statements.includes('COMMIT'));
});
test('startup readiness rejects missing or modified migrations', async () => {
  const migrations = await readMigrations();
  const empty = { query: async () => ({ rows: [] }) };
  await assert.rejects(() => requireReadyDatabase(empty), /Migraciones pendientes/);
  const mismatch = { query: async sql => ({ rows: sql.includes('to_regclass') ? [{ table_name: 'exists' }] : [{ name: migrations[0].name, checksum: 'bad' }] }) };
  await assert.rejects(() => migrationStatus(mismatch), /modificada/);
});

const workspace = fileURLToPath(new URL('../', import.meta.url));
async function fixture(action) {
  const dir = await mkdtemp(path.join(workspace, '.test-backups-'));
  try {
    const config = readConfig({ NODE_ENV: 'test', STC_BACKUP_DIR: dir, PG_DATABASE: 'source', PG_USER: 'test', PG_PASSWORD: 'test-only' });
    const calls = [];
    const run = async (settings, tool, args, options = {}) => {
      calls.push({ tool, args, options });
      if (options.outputFile) await writeFile(options.outputFile, 'simulated PostgreSQL archive');
      if (tool === 'pg_restore' && args.includes('--list')) return 'TABLE public tb_est_mp\nTABLE public tb_config_tolerancias';
      if (tool === 'psql') return 'STC_RESTORE_OK';
      return '';
    };
    await action(config, run, calls, dir);
  } finally {
    // Only the freshly created fixture directory directly inside this workspace
    // can be recursively removed. Never accept a configured backup path here.
    const target = path.resolve(dir);
    if (path.dirname(target) !== path.resolve(workspace) || !path.basename(target).startsWith('.test-backups-')) throw new Error('Unsafe fixture cleanup');
    await rm(target, { recursive: true, force: true });
  }
}
test('backups use custom format, exclude active sessions and verify checksum/catalog', async () => fixture(async (config, run, calls, dir) => {
  const manifest = await createBackup(config, run);
  const file = path.join(dir, manifest.file);
  assert.deepEqual(await verifyBackup(config, file, run), manifest);
  assert.ok(calls[0].args.includes('--format=custom'));
  assert.ok(calls[0].args.includes('--exclude-table-data=stc_sessions'));
  await writeFile(file, 'tampered data');
  await assert.rejects(() => verifyBackup(config, file, run), /checksum/);
}));
test('restore-test cannot target production and checks the restored source tables', async () => fixture(async (config, run, calls, dir) => {
  const manifest = await createBackup(config, run);
  const result = await restoreTest(config, path.join(dir, manifest.file), run, { cleanup: true });
  assert.equal(result.ok, true);
  assert.match(result.target, /^stc_restore_test_[a-f0-9]{32}$/);
  assert.notEqual(result.target, config.pg.database);
  const restore = calls.find(call => call.tool === 'pg_restore' && call.args.includes('--dbname'));
  assert.ok(restore.args.includes('--exit-on-error'));
  assert.ok(restore.args.includes(result.target));
  assert.ok(calls.some(call => call.tool === 'dropdb' && call.args.includes(result.target)));
}));
test('a failed restore is never reported as verified', async () => fixture(async (config, run, calls, dir) => {
  const manifest = await createBackup(config, run);
  const failing = async (...args) => {
    if (args[1] === 'pg_restore' && args[2].includes('--dbname')) throw new Error('Restore failed');
    return run(...args);
  };
  await assert.rejects(() => restoreTest(config, path.join(dir, manifest.file), failing), /Restore failed/);
}));
test('a new worker resumes durable backup requests and preserves changes made during backup', async () => {
  const config = readConfig({ NODE_ENV: 'test' });
  const state = { pending: true, last_change_at: new Date(0), last_success_at: new Date(0), request_version: 1 };
  let released = false;
  const client = { query: async (sql, args) => {
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
    if (sql.startsWith('SELECT *')) return { rows: [{ ...state }] };
    if (sql.includes('last_success_at = NOW()')) { state.pending = state.request_version > args[1]; state.last_success_at = new Date(); }
    return { rows: [] };
  }, release: () => { released = true; } };
  const worker = new BackupTrigger({ connect: async () => client }, config, async () => { state.request_version++; return { file: 'test.dump' }; });
  assert.equal(await worker.tick(), true);
  assert.equal(state.pending, true);
  assert.equal(released, true);
});
test('failed backups retain the pending request for retry', async () => {
  const config = readConfig({ NODE_ENV: 'test' });
  const statements = [];
  const client = { query: async sql => {
    statements.push(sql);
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
    if (sql.startsWith('SELECT *')) return { rows: [{ pending: true, last_change_at: new Date(0), request_version: 1 }] };
    return { rows: [] };
  }, release() {} };
  const worker = new BackupTrigger({ connect: async () => client }, config, async () => { throw new Error('Backup failed'); });
  assert.equal(await worker.tick(), false);
  assert.ok(statements.some(sql => sql.includes('pending = TRUE')));
  assert.ok(!statements.some(sql => sql.includes('last_success_at = NOW()')));
});
