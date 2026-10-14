import { mkdir, readFile, writeFile, stat, rename, copyFile, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { runPostgresTool, connectionArgs } from './postgresTools.js';

export async function fileChecksum(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function verifyBackup(config, file, run = runPostgresTool) {
  const manifest = JSON.parse(await readFile(`${file}.json`, 'utf8'));
  if (manifest.format !== 'postgres-custom-v1' || !/^[a-f0-9]{64}$/.test(manifest.sha256) || manifest.file !== path.basename(file)) throw new Error('Manifiesto de backup inválido.');
  const size = (await stat(file)).size;
  if (size <= 0 || size !== manifest.sizeBytes || await fileChecksum(file) !== manifest.sha256) throw new Error('El backup no coincide con su checksum/tamaño.');
  const list = await run(config, 'pg_restore', ['--list'], { inputFile: file });
  if (!list.includes('tb_est_mp') || !list.includes('tb_config_tolerancias')) throw new Error('El backup no contiene el catálogo de origen STC requerido.');
  return manifest;
}

export async function createBackup(config, run = runPostgresTool, { signal } = {}) {
  await mkdir(config.backup.directory, { recursive: true, mode: 0o700 });
  const name = `stc_full_${new Date().toISOString().replace(/[:.]/g, '-')}_${randomUUID().slice(0, 8)}.dump`;
  const file = path.join(config.backup.directory, name);
  const partial = `${file}.partial`;
  const db = { ...config.pg, user: process.env.PG_BACKUP_USER || config.pg.user, password: process.env.PG_BACKUP_PASSWORD || config.pg.password };
  await run(config, 'pg_dump', [...connectionArgs(config, db), '--format=custom', '--no-owner', '--no-privileges', '--exclude-table-data=stc_sessions', '--exclude-table-data=stc_rate_limits', '--dbname', db.database], { outputFile: partial, signal, databaseConfig: db });
  if ((await stat(partial)).size === 0) throw new Error('pg_dump produjo un archivo vacío.');
  const listing = await run(config, 'pg_restore', ['--list'], { inputFile: partial, signal });
  if (!listing.includes('tb_est_mp') || !listing.includes('tb_config_tolerancias')) throw new Error('El catálogo del backup no incluye inventario y estándares.');
  await rename(partial, file);
  const manifest = { format: 'postgres-custom-v1', file: name, sourceDatabase: db.database, createdAt: new Date().toISOString(), sizeBytes: (await stat(file)).size, sha256: await fileChecksum(file) };
  await writeFile(`${file}.json`, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  if (config.backup.mirrorDirectory) {
    await mkdir(config.backup.mirrorDirectory, { recursive: true, mode: 0o700 });
    const destination = path.join(config.backup.mirrorDirectory, name);
    await copyFile(file, `${destination}.partial`);
    if (await fileChecksum(`${destination}.partial`) !== manifest.sha256) throw new Error('El espejo de backup no pasó la verificación.');
    await rename(`${destination}.partial`, destination);
    await copyFile(`${file}.json`, `${destination}.json`);
  }
  return manifest;
}

export async function listBackups(config) {
  const directories = [];
  const proofs = new Map();
  for (const dir of [config.backup.directory, config.backup.mirrorDirectory].filter(Boolean)) {
    const files = [];
    let available = true;
    try {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !/^stc_full_.*\.dump$/.test(entry.name)) continue;
        const info = await stat(path.join(dir, entry.name));
        try {
          const manifest = JSON.parse(await readFile(path.join(dir, `${entry.name}.json`), 'utf8'));
          const proof = JSON.parse(await readFile(path.join(dir, `${entry.name}.restore-test.json`), 'utf8'));
          if (proof.ok && proof.sha256 === manifest.sha256 && manifest.sizeBytes === info.size && proof.file === entry.name) proofs.set(entry.name, proof.checkedAt);
        } catch { /* No successful restoration proof exists for this archive. */ }
        files.push({ name: entry.name, disk: path.parse(dir).root.replace(/[:\\/]/g, '') || 'local', category: 'full', sizeBytes: info.size, modifiedAt: info.mtime.toISOString() });
      }
    } catch (error) { if (error.code === 'ENOENT') available = false; else throw error; }
    directories.push({ dir, disk: path.parse(dir).root.replace(/[:\\/]/g, '') || 'local', available, files });
  }
  const recent = directories.flatMap(directory => directory.files).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, 100);
  const lastRestoreTestAt = [...proofs.values()].sort().at(-1) || null;
  return { directories, recent, latestFull: recent[0] || null, latestFocused: null, lastRestoreTestAt };
}

export async function restoreTest(config, file, run = runPostgresTool, { cleanup = false } = {}) {
  const manifest = await verifyBackup(config, file, run);
  if (manifest.sourceDatabase !== config.pg.database) throw new Error('El backup pertenece a otra base de origen.');
  // The caller cannot choose a production target, even through CLI arguments.
  const target = `stc_restore_test_${randomUUID().replaceAll('-', '')}`;
  if (target === config.pg.database || !/^stc_restore_test_[a-f0-9]{32}$/.test(target)) throw new Error('Destino de restauración inseguro.');
  const maintenance = { ...config.pg, user: process.env.PG_MAINTENANCE_USER || config.pg.user, password: process.env.PG_MAINTENANCE_PASSWORD || config.pg.password };
  const options = { databaseConfig: maintenance };
  await run(config, 'createdb', [...connectionArgs(config, maintenance), '--maintenance-db', 'postgres', target], options);
  let proof;
  try {
    await run(config, 'pg_restore', [...connectionArgs(config, maintenance), '--exit-on-error', '--no-owner', '--no-privileges', '--dbname', target], { ...options, inputFile: file });
    const result = await run(config, 'psql', [...connectionArgs(config, maintenance), '--dbname', target, '--no-psqlrc', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1', '--command', "SELECT CASE WHEN to_regclass('public.tb_est_mp') IS NOT NULL AND to_regclass('public.tb_config_tolerancias') IS NOT NULL THEN 'STC_RESTORE_OK' ELSE 'STC_RESTORE_INCOMPLETE' END;"], options);
    if (!result.includes('STC_RESTORE_OK')) throw new Error(`La restauración ${target} no contiene las tablas de origen requeridas.`);
    proof = { ok: true, target, file: manifest.file, sha256: manifest.sha256, checkedAt: new Date().toISOString(), cleanedUp: cleanup };
  } finally {
    if (cleanup) await run(config, 'dropdb', [...connectionArgs(config, maintenance), '--maintenance-db', 'postgres', target], options);
  }
  await writeFile(`${file}.restore-test.json`, JSON.stringify(proof, null, 2), { mode: 0o600 });
  return proof;
}
