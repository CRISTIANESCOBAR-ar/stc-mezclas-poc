import pool from '../db/pg.js';
import { config } from '../config.js';
import { createBackup } from './backups.js';
import { logEvent } from '../http.js';

export class BackupTrigger {
  constructor(database, settings, runBackup = createBackup) {
    this.pool = database; this.config = settings; this.runBackup = runBackup;
    this.timer = null; this.running = false; this.task = null; this.stopped = true;
  }
  start() {
    if (!this.config.backup.enabled || this.timer) return;
    this.stopped = false;
    this.timer = setInterval(() => this.schedule(), 30000);
    this.timer.unref();
    this.schedule();
  }
  schedule() {
    if (this.stopped || this.running || !this.config.backup.enabled) return false;
    this.task = this.tick().catch(error => logEvent('backup_poll_failed', { code: error.code || 'ERROR' }));
    return true;
  }
  async tick() {
    if (this.running) return false;
    this.running = true;
    this.controller = new AbortController();
    let client;
    let locked = false;
    try {
      client = await this.pool.connect();
      locked = (await client.query("SELECT pg_try_advisory_lock(hashtext('stc_database_backup')) AS locked")).rows[0]?.locked;
      if (!locked) return false;
      const state = (await client.query('SELECT * FROM stc_backup_state WHERE id = 1')).rows[0];
      if (!state) throw new Error('Falta el estado de backups.');
      const now = Date.now();
      const last = state.last_success_at ? new Date(state.last_success_at).getTime() : 0;
      const periodic = now - last >= this.config.backup.periodicMs;
      const quiet = !state.last_change_at || now - new Date(state.last_change_at).getTime() >= this.config.backup.quietMs;
      const retryAllowed = !state.last_error || !state.last_attempt_at || now - new Date(state.last_attempt_at).getTime() >= 300000;
      if (!retryAllowed || (!periodic && (!state.pending || !quiet || now - last < this.config.backup.intervalMs))) return false;
      await client.query('UPDATE stc_backup_state SET last_attempt_at = NOW() WHERE id = 1');
      try {
        const backup = await this.runBackup(this.config, undefined, { signal: this.controller.signal });
        await client.query('UPDATE stc_backup_state SET last_success_at = NOW(), last_file = $1, last_error = NULL, pending = (request_version > $2) WHERE id = 1', [backup.file, state.request_version]);
        logEvent('backup_completed', { file: backup.file });
        return true;
      } catch (error) {
        await client.query('UPDATE stc_backup_state SET pending = TRUE, last_error = $1 WHERE id = 1', ['Falló la creación/verificación del backup.']);
        logEvent('backup_failed', { code: error.code || 'ERROR' });
        return false;
      }
    } finally {
      if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('stc_database_backup'))").catch(() => {});
      client?.release(); this.running = false;
    }
  }
  async stop() {
    this.stopped = true;
    clearInterval(this.timer); this.timer = null;
    this.controller?.abort();
    await this.task;
  }
  async getStatus() {
    const state = (await this.pool.query('SELECT * FROM stc_backup_state WHERE id = 1')).rows[0] || {};
    return {
      enabled: this.config.backup.enabled, running: this.running, pending: Boolean(state.pending),
      quietWindowMs: this.config.backup.quietMs, minIntervalMs: this.config.backup.intervalMs,
      periodicMs: this.config.backup.periodicMs, lastRunAt: state.last_success_at || null,
      lastAttemptAt: state.last_attempt_at || null, lastError: state.last_error || null,
      lastFile: state.last_file || null, lastReason: state.last_reason || null,
    };
  }
}

export const backupTrigger = new BackupTrigger(pool, config);
export function scheduleDatabaseBackup() { return backupTrigger.schedule(); }
