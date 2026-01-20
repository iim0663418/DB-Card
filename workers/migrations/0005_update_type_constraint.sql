-- Migration: Update uuid_bindings type constraint
-- Date: 2026-01-19

-- SQLite doesn't support ALTER TABLE ... DROP CONSTRAINT
-- We need to recreate the table

-- Step 1: Create new table with updated constraint
CREATE TABLE uuid_bindings_new (
  uuid TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('personal', 'event', 'sensitive')),
  status TEXT NOT NULL DEFAULT 'bound' CHECK(status IN ('bound', 'revoked', 'quarantine')),
  bound_email TEXT,
  bound_at INTEGER,
  created_ip TEXT,
  created_user_agent TEXT,
  revoked_at INTEGER,
  revoke_reason TEXT,
  quarantine_until INTEGER,
  UNIQUE(bound_email, type)
);

-- Step 2: Copy data (map old types to new types)
INSERT INTO uuid_bindings_new (uuid, type, status, bound_email, bound_at, created_ip, created_user_agent, revoked_at, revoke_reason, quarantine_until)
SELECT 
  uuid,
  CASE 
    WHEN type = 'official' THEN 'personal'
    WHEN type = 'temporary' THEN 'sensitive'
    ELSE type
  END as type,
  status,
  bound_email,
  bound_at,
  created_ip,
  created_user_agent,
  revoked_at,
  revoke_reason,
  quarantine_until
FROM uuid_bindings;

-- Step 3: Drop old table
DROP TABLE uuid_bindings;

-- Step 4: Rename new table
ALTER TABLE uuid_bindings_new RENAME TO uuid_bindings;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_email ON uuid_bindings(bound_email);
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_status ON uuid_bindings(status);

-- Step 6: Sync cards.card_type with uuid_bindings.type (if column exists)
-- This step is optional and will be skipped if card_type column doesn't exist
-- The column will be removed in migration 0007 anyway

