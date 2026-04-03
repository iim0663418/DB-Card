-- Migration 0049: Add flow and extract_schema_version to temp_uploads
-- Purpose: Isolate upload flows (received vs own_card) and track schema versions

ALTER TABLE temp_uploads ADD COLUMN flow TEXT DEFAULT 'received';
ALTER TABLE temp_uploads ADD COLUMN extract_schema_version TEXT;

CREATE INDEX IF NOT EXISTS idx_temp_uploads_flow
  ON temp_uploads(user_email, flow, consumed);
