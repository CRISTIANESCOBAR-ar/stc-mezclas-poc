import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const DEFAULT_SCRIPT_PATH = 'C:\\stc-produccion-v2\\backup-database.ps1'
const QUIET_WINDOW_MS = Number.parseInt(process.env.STC_BACKUP_QUIET_WINDOW_MS || '', 10) || (15 * 60 * 1000)
const MIN_INTERVAL_MS = Number.parseInt(process.env.STC_BACKUP_MIN_INTERVAL_MS || '', 10) || (2 * 60 * 60 * 1000)

class BackupTrigger {
  constructor() {
    this.scriptPath = process.env.STC_BACKUP_SCRIPT || DEFAULT_SCRIPT_PATH
    this.timer = null
    this.running = false
    this.pending = false
    this.lastRunAt = 0
    this.lastReason = ''
    this.pendingReasons = new Set()
  }

  isEnabled() {
    return existsSync(this.scriptPath)
  }

  schedule(reason) {
    if (!this.isEnabled()) {
      console.warn(`[backup-trigger] Script no disponible: ${this.scriptPath}`)
      return false
    }

    this.pending = true
    if (reason) this.pendingReasons.add(reason)

    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.flush().catch((error) => {
        console.error('[backup-trigger] Error ejecutando backup:', error)
      })
    }, QUIET_WINDOW_MS)

    console.log(`[backup-trigger] Backup programado en ${Math.round(QUIET_WINDOW_MS / 60000)} min por: ${Array.from(this.pendingReasons).join(', ')}`)
    return true
  }

  async flush() {
    if (!this.pending) return false

    const now = Date.now()
    const elapsed = now - this.lastRunAt
    if (this.running) return false

    if (this.lastRunAt && elapsed < MIN_INTERVAL_MS) {
      const waitMs = MIN_INTERVAL_MS - elapsed
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.timer = null
        this.flush().catch((error) => {
          console.error('[backup-trigger] Error reintentando backup:', error)
        })
      }, waitMs)
      console.log(`[backup-trigger] Backup diferido ${Math.round(waitMs / 60000)} min por cooldown`)
      return false
    }

    return this.runNow()
  }

  async runNow() {
    if (!this.pending || this.running) return false

    this.running = true
    this.pending = false
    this.lastReason = Array.from(this.pendingReasons).join(', ') || 'manual'
    this.pendingReasons.clear()

    try {
      await new Promise((resolve, reject) => {
        const child = spawn('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-File', this.scriptPath,
          '-Mode', 'Focused',
          '-Reason', this.lastReason,
        ], {
          windowsHide: true,
          detached: false,
          cwd: path.dirname(this.scriptPath),
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        let stderr = ''
        child.stderr.on('data', (chunk) => {
          stderr += String(chunk)
        })

        child.on('error', reject)
        child.on('close', (code) => {
          if (code === 0) return resolve()
          reject(new Error(stderr.trim() || `backup-database.ps1 finalizó con código ${code}`))
        })
      })

      this.lastRunAt = Date.now()
      console.log(`[backup-trigger] Backup completado por: ${this.lastReason}`)
      return true
    } finally {
      this.running = false
      if (this.pending && !this.timer) {
        this.schedule('post-run-pending')
      }
    }
  }

  getStatus() {
    return {
      enabled: this.isEnabled(),
      running: this.running,
      pending: this.pending,
      scriptPath: this.scriptPath,
      quietWindowMs: QUIET_WINDOW_MS,
      minIntervalMs: MIN_INTERVAL_MS,
      lastRunAt: this.lastRunAt ? new Date(this.lastRunAt).toISOString() : null,
      lastReason: this.lastReason || null,
      pendingReasons: Array.from(this.pendingReasons),
    }
  }
}

export const backupTrigger = new BackupTrigger()

export function scheduleDatabaseBackup(reason) {
  return backupTrigger.schedule(reason)
}