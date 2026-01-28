-- Migration 0014: Physical Card Twin Support
-- Created: 2026-01-28
-- Purpose: Add database schema for physical card twin assets and status management

-- ============================================================================
-- Table: assets
-- Purpose: Store physical card asset metadata (images)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
  asset_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('twin_front', 'twin_back', 'avatar')),
  current_version INTEGER NOT NULL DEFAULT 1,
  r2_key_prefix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'stale', 'error')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE
);

-- Indexes for assets table
CREATE INDEX IF NOT EXISTS idx_assets_card_uuid ON assets(card_uuid);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- ============================================================================
-- Table: asset_versions
-- Purpose: Track version history of assets (for rollback and cleanup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS asset_versions (
  asset_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  size_original INTEGER,
  size_detail INTEGER,
  size_thumb INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  soft_deleted_at TIMESTAMP,
  PRIMARY KEY (asset_id, version),
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);

-- Index for soft-deleted versions (for cleanup cron)
CREATE INDEX IF NOT EXISTS idx_asset_versions_soft_deleted 
  ON asset_versions(soft_deleted_at) 
  WHERE soft_deleted_at IS NOT NULL;

-- ============================================================================
-- Table: twin_status
-- Purpose: Manage physical twin feature status per card
-- ============================================================================
CREATE TABLE IF NOT EXISTS twin_status (
  card_uuid TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'ready', 'stale', 'error')),
  last_rebuild_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE
);

-- Index for enabled twins (for quick lookup)
CREATE INDEX IF NOT EXISTS idx_twin_status_enabled 
  ON twin_status(enabled) 
  WHERE enabled = TRUE;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables created: assets, asset_versions, twin_status
-- Indexes created: 5 indexes
-- Foreign keys: 3 CASCADE DELETE constraints
-- Check constraints: 3 constraints
