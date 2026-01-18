-- Migration: Add deleted_cards audit table
-- Date: 2026-01-19
-- Purpose: Archive revoked cards before deletion for audit trail

CREATE TABLE deleted_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL,
  type TEXT NOT NULL,
  bound_email TEXT,
  bound_at INTEGER,
  revoked_at INTEGER,
  deleted_at INTEGER NOT NULL,
  deleted_reason TEXT DEFAULT 'auto_cleanup',
  card_data_snapshot TEXT,
  UNIQUE(uuid, deleted_at)
);

CREATE INDEX idx_deleted_cards_email ON deleted_cards(bound_email);
CREATE INDEX idx_deleted_cards_deleted_at ON deleted_cards(deleted_at);
