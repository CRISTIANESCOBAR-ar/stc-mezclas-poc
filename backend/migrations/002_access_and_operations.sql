CREATE TABLE IF NOT EXISTS stc_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE CHECK (username = lower(username)),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('consulta', 'operador', 'administrador')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS stc_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES stc_users(id) ON DELETE CASCADE,
  csrf_token CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stc_sessions_user ON stc_sessions(user_id);
CREATE INDEX IF NOT EXISTS stc_sessions_expiry ON stc_sessions(expires_at);
CREATE TABLE IF NOT EXISTS stc_rate_limits (
  key CHAR(64) PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS stc_audit_log (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  actor_id BIGINT,
  method VARCHAR(8) NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stc_audit_log_created ON stc_audit_log(created_at);
CREATE TABLE IF NOT EXISTS stc_backup_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pending BOOLEAN NOT NULL DEFAULT FALSE,
  last_change_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  request_version BIGINT NOT NULL DEFAULT 0,
  last_file TEXT,
  last_reason TEXT
);
INSERT INTO stc_backup_state (id) VALUES (1) ON CONFLICT DO NOTHING;
