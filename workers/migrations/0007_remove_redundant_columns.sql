-- Migration: Remove redundant columns from cards table
-- Date: 2026-01-19
-- Purpose: cards.card_type and cards.status are redundant with uuid_bindings

-- SQLite doesn't support DROP COLUMN, need to recreate table

-- Step 1: Create new cards table without redundant columns
CREATE TABLE cards_new (
  uuid TEXT PRIMARY KEY,
  encrypted_payload TEXT NOT NULL,
  wrapped_dek TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Step 2: Copy data
INSERT INTO cards_new (uuid, encrypted_payload, wrapped_dek, key_version, created_at, updated_at)
SELECT uuid, encrypted_payload, wrapped_dek, key_version, created_at, updated_at
FROM cards
WHERE status = 'active';

-- Step 3: Drop old table
DROP TABLE cards;

-- Step 4: Rename new table
ALTER TABLE cards_new RENAME TO cards;

-- Step 5: Recreate indexes
CREATE INDEX idx_cards_created_at ON cards(created_at);
CREATE INDEX idx_cards_key_version ON cards(key_version);
