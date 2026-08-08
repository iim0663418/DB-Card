-- Migration 0052: Field History for Write Provenance
-- Purpose: Track field-level changes for audit trail and undo capability
-- Date: 2026-08-08

CREATE TABLE IF NOT EXISTS field_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'card' | 'organization'
  entity_uuid TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  source_type TEXT NOT NULL,  -- 'mcp_agent' | 'user_manual' | 'ocr' | 'inherited' | 'web_ui'
  client_id TEXT,             -- MCP client registration ID (nullable for non-MCP writes)
  user_email TEXT NOT NULL,
  changed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_field_history_entity ON field_history(entity_type, entity_uuid, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_history_user ON field_history(user_email, changed_at DESC);
