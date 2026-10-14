// Called inside the same transaction as the data change. Rollback cancels
// both the mutation and its backup request; process restarts cannot lose it.
export async function recordBackupRequest(client, reason) {
  await client.query(`UPDATE stc_backup_state SET pending = TRUE, last_change_at = NOW(), request_version = request_version + 1, last_reason = $1 WHERE id = 1`, [reason.slice(0, 200)]);
}
