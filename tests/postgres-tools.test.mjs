import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { runPostgresTool } from '../backend/src/services/postgresTools.js';
import { readConfig } from '../backend/src/config.js';

function earlyExit(code) {
  return () => {
    const child = new EventEmitter();
    child.exitCode = null;
    child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.stdin = new Writable({ write(chunk, encoding, callback) { callback(Object.assign(new Error('write EOF'), { code: 'EOF' })); } });
    child.kill = () => {};
    setTimeout(() => {
      child.stdout.end('TABLE public tb_est_mp\nTABLE public tb_config_tolerancias');
      child.exitCode = code;
      child.emit('close', code);
    }, 30);
    return child;
  };
}
const config = readConfig({ NODE_ENV: 'test' });
const inputFile = new URL('../backend/migrations/001_existing_ensayos.sql', import.meta.url);

test('catalog inspection accepts a closed input pipe only when pg_restore succeeds', async () => {
  const result = await runPostgresTool(config, 'pg_restore', ['--list'], { inputFile, spawnProcess: earlyExit(0) });
  assert.match(result, /tb_est_mp/);
  await assert.rejects(() => runPostgresTool(config, 'pg_restore', ['--list'], { inputFile, spawnProcess: earlyExit(1) }), /falló/);
});
test('a closed input pipe during actual restoration remains an error', async () => {
  await assert.rejects(() => runPostgresTool(config, 'pg_restore', ['--dbname', 'stc_restore_test_demo'], { inputFile, spawnProcess: earlyExit(0) }), /write EOF/);
});
