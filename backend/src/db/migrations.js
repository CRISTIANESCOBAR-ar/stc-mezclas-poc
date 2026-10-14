import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = fileURLToPath(new URL('../../migrations/', import.meta.url));
export async function readMigrations() {
  const files = (await readdir(directory)).filter(file => /^\d{3}_[a-z0-9_]+\.sql$/.test(file)).sort();
  return Promise.all(files.map(async name => {
    const sql = (await readFile(path.join(directory, name), 'utf8')).replaceAll('\r\n', '\n');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

function checkApplied(migrations, applied) {
  const known = new Map(migrations.map(migration => [migration.name, migration]));
  for (const row of applied) {
    if (!known.has(row.name)) throw new Error(`Migración desconocida en la base: ${row.name}. Use la versión correcta del proyecto.`);
    if (known.get(row.name).checksum !== row.checksum) throw new Error(`La migración aplicada fue modificada: ${row.name}.`);
  }
}

export async function migrationStatus(pool) {
  const migrations = await readMigrations();
  const exists = await pool.query("SELECT to_regclass('public.stc_schema_migrations') AS table_name");
  const applied = exists.rows[0]?.table_name ? (await pool.query('SELECT name, checksum FROM stc_schema_migrations ORDER BY name')).rows : [];
  checkApplied(migrations, applied);
  const names = new Set(applied.map(row => row.name));
  return { applied: applied.map(row => row.name), pending: migrations.filter(migration => !names.has(migration.name)).map(migration => migration.name) };
}

export async function requireReadyDatabase(pool) {
  await pool.query('SELECT 1');
  const status = await migrationStatus(pool);
  if (status.pending.length) throw new Error(`Migraciones pendientes: ${status.pending.join(', ')}. Ejecute npm run db:migrate con el backend detenido.`);
  const source = await pool.query("SELECT to_regclass('public.tb_est_mp') AS stock, to_regclass('public.tb_config_tolerancias') AS standards, has_table_privilege(current_user, to_regclass('public.tb_est_mp'), 'SELECT') AS stock_read, has_table_privilege(current_user, to_regclass('public.tb_config_tolerancias'), 'SELECT') AS standards_read");
  if (!source.rows[0]?.stock || !source.rows[0]?.standards) throw new Error('Faltan las tablas de origen de inventario/estándares. Restaure la base STC antes de iniciar.');
  if (!source.rows[0].stock_read || !source.rows[0].standards_read) throw new Error('La cuenta de aplicación no puede leer inventario/estándares. Revise grant-runtime.sql.');
  return status;
}

export async function applyMigrations(pool) {
  const migrations = await readMigrations();
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('stc_schema_migrations'))");
    await client.query('CREATE TABLE IF NOT EXISTS stc_schema_migrations (name TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const applied = (await client.query('SELECT name, checksum FROM stc_schema_migrations ORDER BY name')).rows;
    checkApplied(migrations, applied);
    const names = new Set(applied.map(row => row.name));
    const completed = [];
    for (const migration of migrations) {
      if (names.has(migration.name)) continue;
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO stc_schema_migrations (name, checksum) VALUES ($1, $2)', [migration.name, migration.checksum]);
        await client.query('COMMIT');
        completed.push(migration.name);
      } catch (error) {
        await client.query('ROLLBACK');
        error.migrationName = migration.name;
        throw error;
      }
    }
    return completed;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('stc_schema_migrations'))").catch(() => {});
    client.release();
  }
}
