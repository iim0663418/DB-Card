-- Migration 0015: Fix assets foreign key reference
-- Created: 2026-01-28
-- Purpose: Change assets.card_uuid foreign key from cards(uuid) to uuid_bindings(uuid)

-- Drop existing foreign key constraint by recreating the table
-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate

-- Step 1: Create new assets table with correct foreign key
CREATE TABLE IF NOT EXISTS assets_new (
  asset_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('twin_front', 'twin_back', 'avatar')),
  current_version INTEGER NOT NULL DEFAULT 1,
  r2_key_prefix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'stale', 'error')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_uuid) REFERENCES uuid_bindings(uuid) ON DELETE CASCADE
);

-- Step 2: Copy data from old table (if any)
INSERT OR IGNORE INTO assets_new 
SELECT * FROM assets;

-- Step 3: Drop old table
DROP TABLE IF EXISTS assets;

-- Step 4: Rename new table
ALTER TABLE assets_new RENAME TO assets;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_assets_card_uuid ON assets(card_uuid);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- Step 6: Fix twin_status foreign key as well
CREATE TABLE IF NOT EXISTS twin_status_new (
  card_uuid TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'ready', 'stale', 'error')),
  last_rebuild_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (card_uuid) REFERENCES uuid_bindings(uuid) ON DELETE CASCADE
);

INSERT OR IGNORE INTO twin_status_new 
SELECT * FROM twin_status;

DROP TABLE IF EXISTS twin_status;

ALTER TABLE twin_status_new RENAME TO twin_status;

CREATE INDEX IF NOT EXISTS idx_twin_status_enabled 
  ON twin_status(enabled) 
  WHERE enabled = TRUE;

-- Migration complete
