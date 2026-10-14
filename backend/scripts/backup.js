import path from 'node:path';
import { config, requireDatabaseConfig } from '../src/config.js';
import { createBackup, verifyBackup, restoreTest } from '../src/services/backups.js';

requireDatabaseConfig(config);
const action = process.argv[2];
const fileArg = process.argv.indexOf('--file');
const file = fileArg >= 0 && process.argv[fileArg + 1] ? path.resolve(process.argv[fileArg + 1]) : null;
try {
  if (action === 'create') console.log(JSON.stringify(await createBackup(config), null, 2));
  else if (action === 'verify' && file) console.log(JSON.stringify(await verifyBackup(config, file), null, 2));
  else if (action === 'restore-test' && file) console.log(JSON.stringify(await restoreTest(config, file, undefined, { cleanup: process.argv.includes('--cleanup') }), null, 2));
  else throw new Error('Use create, verify --file <archivo.dump> o restore-test --file <archivo.dump> [--cleanup].');
} catch (error) { console.error(error.message); process.exitCode = 1; }
