import { config, requireDatabaseConfig } from '../src/config.js';
import pool from '../src/db/pg.js';
import { requireReadyDatabase } from '../src/db/migrations.js';
import { AuthRepository } from '../src/security/authRepository.js';
import { hashPassword, normalizeUsername } from '../src/security/passwords.js';
import { ROLE_LEVEL } from '../src/security/access.js';

try {
  requireDatabaseConfig(config);
  await requireReadyDatabase(pool);
  const username = normalizeUsername(process.argv[2]);
  const role = process.argv[3] || 'consulta';
  if (!Object.hasOwn(ROLE_LEVEL, role)) throw new Error('Rol inválido.');
  const password = process.env.STC_USER_PASSWORD;
  delete process.env.STC_USER_PASSWORD;
  const user = await new AuthRepository(pool).createUser(username, await hashPassword(password), role);
  console.log(JSON.stringify({ id: user.id, username: user.username, role: user.role }));
} catch (error) { console.error(error.code === '23505' ? 'El usuario ya existe.' : error.code ? `No se pudo crear el usuario (${error.code}).` : error.message); process.exitCode = 1; }
finally { await pool.end(); }
