-- Migration 0009: Revocation Rate Limits Table
-- Purpose: Track user-initiated card revocations for rate limiting
-- Author: Amazon Q Dev CLI Isolation Architect
-- Date: 2026-01-19

CREATE TABLE IF NOT EXISTS revocation_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  window_type TEXT NOT NULL CHECK(window_type IN ('hourly', 'daily')),
  window_start INTEGER NOT NULL, -- Unix timestamp
  revocation_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, window_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window
ON revocation_rate_limits(user_id, window_type, window_start);

-- Cleanup old records (keep 48 hours)
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
ON revocation_rate_limits(window_start);
