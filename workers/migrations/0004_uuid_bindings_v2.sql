-- migrations/0004_uuid_bindings_v2.sql
-- User Self-Service v2.0 - UUID Bindings & Email Allowlist
-- Created: 2026-01-18
-- Modified: 2026-01-20 (Made idempotent)

-- 1. UUID Bindings Table (Self-Service Model)
CREATE TABLE IF NOT EXISTS uuid_bindings (
  uuid TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('official', 'temporary', 'event')),
  status TEXT NOT NULL CHECK (status IN ('bound', 'revoked', 'quarantine')),
  bound_email TEXT,
  bound_at INTEGER,
  created_ip TEXT,
  created_user_agent TEXT,
  revoked_at INTEGER,
  revoke_reason TEXT,
  quarantine_until INTEGER
);

-- Enforce 1+1+1 binding limit (one card per type per email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_uuid_bindings_email_type
  ON uuid_bindings(bound_email, type)
  WHERE status = 'bound';

CREATE INDEX IF NOT EXISTS idx_uuid_bindings_email ON uuid_bindings(bound_email);
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_status ON uuid_bindings(status);
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_type ON uuid_bindings(type);

-- 2. Email Allowlist Table (Domain-based Authorization)
CREATE TABLE IF NOT EXISTS email_allowlist (
  domain TEXT PRIMARY KEY,
  added_at INTEGER NOT NULL,
  added_by TEXT NOT NULL
);

-- Insert default authorized domain (idempotent)
INSERT OR IGNORE INTO email_allowlist (domain, added_at, added_by)
VALUES ('moda.gov.tw', unixepoch(), 'system');
