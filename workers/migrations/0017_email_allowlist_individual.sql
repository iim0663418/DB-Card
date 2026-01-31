-- migrations/0017_email_allowlist_individual.sql
-- Email Allowlist: Individual Email Support (Single Table Design)
-- Created: 2026-01-31
-- BDD: Support both domain-based and individual email whitelist validation

-- Step 1: Add type column to distinguish domain vs individual email
-- Default to 'domain' for backward compatibility
-- Use ALTER COLUMN with CASE to set existing values
-- Note: SQLite doesn't support ALTER COLUMN ADD with DEFAULT in all versions,
-- so we use a two-step approach for idempotency

-- Check if type column exists, if not add it
-- SQLite ALTER TABLE is limited, so we:
-- 1. Create new table with desired schema
-- 2. Copy data from old table (if exists)
-- 3. Drop old table
-- 4. Rename new table

-- Create new table with type column
CREATE TABLE IF NOT EXISTS email_allowlist_new (
  domain TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'domain' CHECK (type IN ('domain', 'email')),
  added_at INTEGER NOT NULL,
  added_by TEXT NOT NULL
);

-- Copy existing data if old table exists (all as 'domain' type)
INSERT OR IGNORE INTO email_allowlist_new (domain, type, added_at, added_by)
SELECT domain, 'domain', added_at, added_by
FROM email_allowlist
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='email_allowlist');

-- Drop old table only if it exists
DROP TABLE IF EXISTS email_allowlist;

-- Rename new table to final name
ALTER TABLE email_allowlist_new RENAME TO email_allowlist;

-- Step 2: Insert individual email whitelist entry (idempotent)
INSERT OR IGNORE INTO email_allowlist (domain, type, added_at, added_by)
VALUES ('chingw@acs.gov.tw', 'email', unixepoch(), 'system');

-- Verify migration result
-- After this migration:
-- 1. 'moda.gov.tw' exists with type='domain'
-- 2. 'chingw@acs.gov.tw' exists with type='email'
-- 3. Future queries can use: WHERE (type='domain' AND domain=?) OR (type='email' AND domain=?)
