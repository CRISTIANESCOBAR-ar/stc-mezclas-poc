import pg from 'pg';
import { config, requireDatabaseConfig } from '../src/config.js';
import { applyMigrations, migrationStatus } from '../src/db/migrations.js';

requireDatabaseConfig(config);
const pool = new pg.Pool({ ...config.pg,
  user: process.env.PG_MIGRATION_USER || config.pg.user,
  password: process.env.PG_MIGRATION_PASSWORD || config.pg.password,
});
try {
  if (process.argv.includes('--status')) console.log(JSON.stringify(await migrationStatus(pool), null, 2));
  else console.log(JSON.stringify({ applied: await applyMigrations(pool) }, null, 2));
} catch (error) {
  console.error(`Migración fallida${error.migrationName ? ` en ${error.migrationName}` : ''}: ${error.code || error.message}`);
  process.exitCode = 1;
} finally { await pool.end(); }
