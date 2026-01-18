-- Migration: Add blocked_ips table for IP blocking feature
-- Date: 2026-01-18

CREATE TABLE IF NOT EXISTS blocked_ips (
  ip_address TEXT PRIMARY KEY,
  blocked_until TEXT,  -- NULL for permanent block
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_until ON blocked_ips(blocked_until);
