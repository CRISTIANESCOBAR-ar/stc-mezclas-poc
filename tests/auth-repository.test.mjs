import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthRepository } from '../backend/src/security/authRepository.js';

test('cannot disable or demote the last enabled administrator', async () => {
  for (const changes of [{ enabled: false }, { role: 'operador' }]) {
    const statements = [];
    const client = { query: async sql => {
      statements.push(sql);
      if (sql.includes('WHERE id = $1 FOR UPDATE')) return { rows: [{ id: 1, role: 'administrador', enabled: true }] };
      if (sql.includes("AND id <> $1")) return { rows: [], rowCount: 0 };
      return { rows: [] };
    }, release() {} };
    const repository = new AuthRepository({ connect: async () => client });
    await assert.rejects(() => repository.updateUser(1, changes), error => error.statusCode === 409);
    assert.ok(statements.includes('ROLLBACK'));
    assert.ok(!statements.some(sql => sql.startsWith('UPDATE stc_users')));
    assert.ok(statements.some(sql => sql.includes('pg_advisory_xact_lock')));
  }
});
test('user changes revoke sessions and queue backups in the same transaction', async () => {
  const statements = [];
  const client = { query: async sql => {
    statements.push(sql);
    if (sql.includes('WHERE id = $1 FOR UPDATE')) return { rows: [{ id: 1, role: 'operador', enabled: true }] };
    if (sql.startsWith('UPDATE stc_users')) return { rows: [{ id: 1, role: 'consulta', enabled: true }] };
    return { rows: [] };
  }, release() {} };
  await new AuthRepository({ connect: async () => client }).updateUser(1, { role: 'consulta' });
  assert.ok(statements.some(sql => sql.startsWith('DELETE FROM stc_sessions')));
  assert.ok(statements.some(sql => sql.startsWith('UPDATE stc_backup_state')));
  assert.equal(statements.at(-1), 'COMMIT');
});
