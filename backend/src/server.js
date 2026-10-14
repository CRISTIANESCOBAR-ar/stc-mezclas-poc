import { config, requireDatabaseConfig } from './config.js';
import pool from './db/pg.js';
import { requireReadyDatabase } from './db/migrations.js';
import { AuthRepository } from './security/authRepository.js';
import { backupTrigger } from './services/backupTrigger.js';
import { createApp } from './app.js';
import { logEvent } from './http.js';

let server;
let available = false;
let shuttingDown = false;
let maintenance;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true; available = false;
  logEvent('shutdown_started');
  const deadline = setTimeout(() => { server?.closeAllConnections(); process.exit(1); }, 20000);
  deadline.unref();
  clearInterval(maintenance);
  try {
    await Promise.all([server ? new Promise(resolve => server.close(resolve)) : Promise.resolve(), backupTrigger.stop()]);
    await pool.end();
    clearTimeout(deadline);
    logEvent('shutdown_completed');
  } catch (error) { logEvent('shutdown_failed', { code: error.code || 'ERROR' }); process.exitCode = 1; }
}

try {
  requireDatabaseConfig(config);
  await requireReadyDatabase(pool);
  const administrators = await pool.query("SELECT id FROM stc_users WHERE enabled AND role = 'administrador' LIMIT 1");
  if (!administrators.rowCount) throw new Error('Falta un administrador habilitado. Use create-user.ps1 antes de iniciar.');
  if (config.production) {
    const privileges = (await pool.query("SELECT rolsuper, rolcreatedb, rolcreaterole, has_schema_privilege(current_user, 'public', 'CREATE') AS ddl FROM pg_roles WHERE rolname = current_user")).rows[0];
    if (!privileges || privileges.rolsuper || privileges.rolcreatedb || privileges.rolcreaterole || privileges.ddl) throw new Error('La cuenta de producción debe ser un usuario de aplicación sin permisos DDL, superusuario, CREATEDB ni CREATEROLE.');
    const ownership = (await pool.query("SELECT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND pg_has_role(current_user, c.relowner, 'MEMBER')) AS owns_tables")).rows[0];
    if (ownership?.owns_tables) throw new Error('La cuenta de aplicación no debe ser propietaria de tablas ni miembro de su rol propietario.');
  }
  const authRepository = new AuthRepository(pool);
  const app = createApp({ config, pool, authRepository, backup: backupTrigger, ready: () => available });
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(config.port, config.host, () => resolve(listener));
    listener.once('error', reject);
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 120000;
  available = true;
  backupTrigger.start();
  maintenance = setInterval(() => authRepository.cleanup().catch(error => logEvent('maintenance_failed', { code: error.code || 'ERROR' })), 3600000);
  maintenance.unref();
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  logEvent('server_started', { host: config.host, port: config.port, authentication: true });
} catch (error) {
  console.error(error.code === 'EADDRINUSE'
    ? `No se pudo iniciar: el puerto ${config.port} en ${config.host} ya está ocupado. El backend puede estar ejecutándose en otra terminal.`
    : `No se pudo iniciar: ${error.code ? `base de datos (${error.code})` : error.message}`);
  await pool.end();
  process.exitCode = 1;
}
