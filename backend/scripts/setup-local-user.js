import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, rename, access } from 'node:fs/promises';
import path from 'node:path';
import { config, backendRoot, requireDatabaseConfig } from '../src/config.js';
import pool from '../src/db/pg.js';
import { requireReadyDatabase } from '../src/db/migrations.js';
import { AuthRepository } from '../src/security/authRepository.js';
import { hashPassword } from '../src/security/passwords.js';

const directory = path.join(backendRoot, 'data');
const credentials = path.join(directory, 'acceso-local.txt');
try {
  if (config.production || !['127.0.0.1', 'localhost', '::1'].includes(config.host) || !['127.0.0.1', 'localhost', '::1'].includes(config.pg.host)) throw new Error('Esta herramienta solo admite desarrollo con servidor y PostgreSQL locales.');
  requireDatabaseConfig(config);
  await requireReadyDatabase(pool);
  const repository = new AuthRepository(pool);
  if (await repository.findUser('desarrollo')) {
    await access(credentials);
    console.log(JSON.stringify({ username: 'desarrollo', credentialsFile: credentials, created: false }));
  } else {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const password = randomBytes(24).toString('base64url');
    await writeFile(`${credentials}.pending`, `Acceso de desarrollo local STC\n\nURL: http://127.0.0.1:5173/ingresar\nUsuario: desarrollo\nContraseña: ${password}\n\nNo compartir ni subir este archivo al repositorio.\n`, { flag: 'wx', mode: 0o600 });
    await repository.createUser('desarrollo', await hashPassword(password), 'administrador');
    await rename(`${credentials}.pending`, credentials);
    console.log(JSON.stringify({ username: 'desarrollo', credentialsFile: credentials, created: true }));
  }
} catch (error) {
  console.error(error.code ? `No se pudo preparar la cuenta local (${error.code}).` : error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
