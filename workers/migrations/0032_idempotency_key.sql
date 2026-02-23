-- Migration 0032: Add idempotency_key for upload deduplication
-- Purpose: Prevent duplicate uploads on retry (atomic + tenant-isolated)
-- Version: v4.6.0 (2026-02-23)

ALTER TABLE temp_uploads ADD COLUMN idempotency_key TEXT;

-- Cross-tenant isolation: UNIQUE(user_email, idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_temp_uploads_idempotency 
  ON temp_uploads(user_email, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
