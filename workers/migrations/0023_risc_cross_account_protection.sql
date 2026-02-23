-- Migration: RISC Cross-Account Protection
-- Purpose: Store security events and user disabled status for Google RISC integration
-- Created: 2026-02-14

-- Track user security status (email-based identity)
CREATE TABLE IF NOT EXISTS user_security_status (
  email TEXT PRIMARY KEY,
  is_disabled INTEGER NOT NULL DEFAULT 0 CHECK (is_disabled IN (0, 1)),
  disabled_reason TEXT,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_security_disabled
  ON user_security_status(is_disabled);

-- Store received RISC events for audit and troubleshooting
CREATE TABLE IF NOT EXISTS risc_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  issuer TEXT NOT NULL,
  audience TEXT,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  raw_token_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_risc_events_subject ON risc_events(subject);
CREATE INDEX IF NOT EXISTS idx_risc_events_type ON risc_events(event_type);
CREATE INDEX IF NOT EXISTS idx_risc_events_status ON risc_events(status);
