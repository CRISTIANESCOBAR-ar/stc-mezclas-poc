import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const backendRoot = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(backendRoot, '.env') });

function integer(env, name, fallback, min, max) {
  const raw = env[name] ?? String(fallback);
  if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max) throw new Error(`Configuración inválida: ${name}.`);
  return Number(raw);
}
function flag(env, name, fallback) {
  const raw = env[name] ?? String(fallback);
  if (!['true', 'false'].includes(raw)) throw new Error(`Configuración inválida: ${name} debe ser true/false.`);
  return raw === 'true';
}
function origin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_ORIGIN/CORS_ORIGINS debe contener orígenes sin rutas.');
  return url.origin;
}

export function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  if (!['development', 'test', 'production'].includes(env.NODE_ENV || 'development')) throw new Error('NODE_ENV inválido.');
  const port = integer(env, 'PORT', 3005, 1, 65535);
  const appOrigin = origin(env.APP_ORIGIN || (production ? '' : 'http://localhost:5173'));
  const origins = [...new Set([appOrigin, ...(env.CORS_ORIGINS || (production ? '' : 'http://127.0.0.1:5173')).split(',').filter(Boolean).map(value => origin(value.trim()))])];
  if (production && origins.some(value => !value.startsWith('https://'))) throw new Error('Producción requiere HTTPS en APP_ORIGIN y CORS_ORIGINS.');
  const trustProxy = env.STC_TRUST_PROXY || 'false';
  if (!['false', 'loopback'].includes(trustProxy)) throw new Error('STC_TRUST_PROXY admite false o loopback.');
  const pg = {
    host: env.PG_HOST || '127.0.0.1', port: integer(env, 'PG_PORT', 5433, 1, 65535),
    database: env.PG_DATABASE, user: env.PG_USER, password: env.PG_PASSWORD,
    connectionTimeoutMillis: integer(env, 'PG_CONNECT_TIMEOUT_MS', 5000, 100, 60000),
    statement_timeout: integer(env, 'PG_STATEMENT_TIMEOUT_MS', 120000, 1000, 600000),
    max: integer(env, 'PG_POOL_MAX', 10, 1, 100),
    options: '-c search_path=public',
    ssl: flag(env, 'PG_SSL', false) ? { rejectUnauthorized: true, ...(env.PG_SSL_CA ? { ca: env.PG_SSL_CA } : {}) } : false,
  };
  const backupDir = path.resolve(env.STC_BACKUP_DIR || path.join(backendRoot, 'backups'));
  if (production && !['127.0.0.1', 'localhost', '::1'].includes(pg.host) && !pg.ssl) throw new Error('Una base remota en producción requiere PG_SSL=true.');
  return {
    production, port, host: env.HOST || '127.0.0.1', origins, appOrigin, trustProxy: trustProxy === 'false' ? false : trustProxy,
    pg, jsonLimit: '50mb',
    sessionMs: integer(env, 'STC_SESSION_HOURS', 8, 1, 72) * 3600000,
    idleMs: integer(env, 'STC_SESSION_IDLE_MINUTES', 30, 1, 1440) * 60000,
    backup: {
      enabled: flag(env, 'STC_BACKUP_ENABLED', true), directory: backupDir,
      mirrorDirectory: env.STC_BACKUP_MIRROR_DIR ? path.resolve(env.STC_BACKUP_MIRROR_DIR) : null,
      quietMs: integer(env, 'STC_BACKUP_QUIET_WINDOW_MS', 900000, 1000, 86400000),
      intervalMs: integer(env, 'STC_BACKUP_MIN_INTERVAL_MS', 7200000, 1000, 86400000),
      periodicMs: integer(env, 'STC_BACKUP_PERIODIC_MS', 86400000, 60000, 604800000),
      timeoutMs: integer(env, 'STC_BACKUP_TIMEOUT_MS', 600000, 1000, 3600000),
      toolMode: env.STC_PG_TOOL_MODE || 'podman', container: env.STC_PG_CONTAINER || 'stc_postgres',
    },
    frontendDist: path.resolve(backendRoot, '../frontend/dist'),
  };
}

export function requireDatabaseConfig(config) {
  for (const key of ['database', 'user', 'password']) if (typeof config.pg[key] !== 'string' || !config.pg[key].trim()) throw new Error(`Falta PG_${key.toUpperCase()} en backend/.env.`);
  if (!['native', 'podman'].includes(config.backup.toolMode)) throw new Error('STC_PG_TOOL_MODE debe ser native o podman.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(config.backup.container)) throw new Error('STC_PG_CONTAINER inválido.');
  if (config.backup.mirrorDirectory === config.backup.directory) throw new Error('El espejo de backups debe ser una carpeta distinta.');
}

export const config = readConfig();
