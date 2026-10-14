import { tokenHash } from './passwords.js';
import { withTransaction } from '../db/transaction.js';
import { recordBackupRequest } from '../services/backupRequests.js';

export class AuthRepository {
  constructor(pool) { this.pool = pool; }
  async findUser(username) {
    return (await this.pool.query('SELECT id, username, password_hash, role, enabled FROM stc_users WHERE username = $1', [username])).rows[0];
  }
  async createSession(userId, token, csrfToken, expiresAt) {
    await this.pool.query('INSERT INTO stc_sessions (token_hash, user_id, csrf_token, expires_at) VALUES ($1, $2, $3, $4)', [tokenHash(token), userId, csrfToken, expiresAt]);
  }
  async session(token, idleMs) {
    const result = await this.pool.query(`
      UPDATE stc_sessions s SET last_seen_at = NOW()
      FROM stc_users u WHERE s.token_hash = $1 AND s.user_id = u.id
        AND u.enabled = TRUE AND s.expires_at > NOW()
        AND s.last_seen_at > NOW() - ($2 * INTERVAL '1 millisecond')
      RETURNING u.id, u.username, u.role, s.csrf_token, s.expires_at
    `, [tokenHash(token), idleMs]);
    return result.rows[0];
  }
  async revokeSession(token) { await this.pool.query('DELETE FROM stc_sessions WHERE token_hash = $1', [tokenHash(token)]); }
  async limit(key, windowMs, maximum) {
    const result = await this.pool.query(`
      INSERT INTO stc_rate_limits (key, count, reset_at) VALUES ($1, 1, NOW() + ($2 * INTERVAL '1 millisecond'))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN stc_rate_limits.reset_at <= NOW() THEN 1 ELSE stc_rate_limits.count + 1 END,
        reset_at = CASE WHEN stc_rate_limits.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE stc_rate_limits.reset_at END
      RETURNING count, reset_at
    `, [tokenHash(key), windowMs]);
    return Number(result.rows[0].count) <= maximum;
  }
  async listUsers() {
    return (await this.pool.query('SELECT id, username, role, enabled, created_at FROM stc_users ORDER BY username')).rows;
  }
  async createUser(username, passwordHash, role) {
    return withTransaction(this.pool, async client => {
      const user = (await client.query('INSERT INTO stc_users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, enabled', [username, passwordHash, role])).rows[0];
      await recordBackupRequest(client, 'user-created');
      return user;
    });
  }
  async updateUser(id, changes) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize administrator changes so two concurrent updates cannot
      // both disable/demote the last remaining administrator.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('stc_user_admin_changes'))");
      const current = (await client.query('SELECT id, role, enabled FROM stc_users WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!current) throw Object.assign(new Error('Usuario no encontrado.'), { statusCode: 404 });
      if (current.enabled && current.role === 'administrador' && (changes.enabled === false || (changes.role && changes.role !== 'administrador'))) {
        const other = await client.query("SELECT id FROM stc_users WHERE enabled AND role = 'administrador' AND id <> $1", [id]);
        if (!other.rowCount) throw Object.assign(new Error('Debe quedar al menos un administrador habilitado.'), { statusCode: 409 });
      }
      const result = await client.query(`UPDATE stc_users SET role = COALESCE($2, role), enabled = COALESCE($3, enabled), password_hash = COALESCE($4, password_hash), updated_at = NOW() WHERE id = $1 RETURNING id, username, role, enabled`, [id, changes.role ?? null, changes.enabled ?? null, changes.passwordHash ?? null]);
      await client.query('DELETE FROM stc_sessions WHERE user_id = $1', [id]);
      await recordBackupRequest(client, 'user-updated');
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async cleanup() {
    await this.pool.query('DELETE FROM stc_sessions WHERE expires_at <= NOW()');
    await this.pool.query("DELETE FROM stc_rate_limits WHERE reset_at < NOW() - INTERVAL '1 day'");
  }
}
