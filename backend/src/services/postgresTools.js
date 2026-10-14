import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const tools = new Set(['pg_dump', 'pg_restore', 'createdb', 'dropdb', 'psql']);
export async function runPostgresTool(config, tool, args, { inputFile, outputFile, signal, databaseConfig = config.pg, spawnProcess = spawn } = {}) {
  if (!tools.has(tool)) throw new Error('Herramienta PostgreSQL no permitida.');
  const podman = config.backup.toolMode === 'podman';
  const binary = podman ? 'podman' : process.env.STC_PG_BIN_DIR ? path.join(process.env.STC_PG_BIN_DIR, tool) : tool;
  const commandArgs = podman ? ['exec', '-i', '--env', 'PGPASSWORD', config.backup.container, tool, ...args] : args;
  const environment = {};
  for (const key of ['PATH', 'PATHEXT', 'SystemRoot', 'WINDIR', 'COMSPEC', 'USERPROFILE', 'USERDOMAIN', 'USERNAME', 'HOME', 'TEMP', 'TMP', 'APPDATA', 'LOCALAPPDATA', 'XDG_RUNTIME_DIR', 'XDG_CONFIG_HOME', 'PGSSLROOTCERT', 'PGSSLCERT', 'PGSSLKEY']) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  environment.PGPASSWORD = databaseConfig.password;
  environment.PGSSLMODE = databaseConfig.ssl ? 'verify-full' : 'prefer';
  const child = spawnProcess(binary, commandArgs, {
    shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: environment,
  });
  const stop = () => child.kill();
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) stop();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; stop(); }, config.backup.timeoutMs);
  let text = '';
  child.stderr.on('data', () => {}); // Do not print tool stderr containing connection/data details.
  const closed = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => code === 0 && !timedOut && !signal?.aborted ? resolve() : reject(new Error(timedOut ? 'La herramienta PostgreSQL agotó su tiempo máximo.' : `La herramienta ${tool} falló (código ${code}).`)));
  });
  const io = [];
  if (outputFile) io.push(pipeline(child.stdout, createWriteStream(outputFile, { flags: 'wx', mode: 0o600 })));
  else child.stdout.on('data', chunk => { if (text.length < 65536) text += chunk.toString(); });
  if (inputFile) io.push(pipeline(createReadStream(inputFile), child.stdin).catch(error => {
    // pg_restore --list reads only the archive catalog and may exit before
    // consuming the data section. Podman on Windows then reports write EOF.
    // Only accept an expected closed input pipe; the command must still exit 0.
    if (tool === 'pg_restore' && args.includes('--list') && ['EOF', 'EPIPE', 'ECONNRESET', 'ERR_STREAM_PREMATURE_CLOSE'].includes(error.code)) return;
    throw error;
  }));
  else child.stdin.end();
  try { await Promise.all([closed, ...io]); return text; }
  finally { clearTimeout(timeout); signal?.removeEventListener('abort', stop); if (child.exitCode === null) stop(); }
}

export function connectionArgs(config, db = config.pg) {
  const podman = config.backup.toolMode === 'podman';
  return ['--host', podman ? '127.0.0.1' : db.host, '--port', String(podman ? Number(process.env.STC_PG_CONTAINER_PORT || 5432) : db.port), '--username', db.user];
}
