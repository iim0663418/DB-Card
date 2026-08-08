-- Migration 0053: Organizations table
-- Purpose: Independent organization profiles for MCP-native company info management
-- Date: 2026-08-08

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  name_normalized TEXT NOT NULL,
  aliases TEXT,              -- JSON array of known aliases
  industry TEXT,
  summary TEXT,              -- max 5000 chars
  source_url TEXT,
  metadata_json TEXT,        -- extensible metadata (JSON)
  review_flag TEXT,          -- NULL | 'review_needed'
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_user_normalized ON organizations(user_email, name_normalized);
CREATE INDEX IF NOT EXISTS idx_org_user_email ON organizations(user_email);
CREATE INDEX IF NOT EXISTS idx_org_name_en ON organizations(name_en);
