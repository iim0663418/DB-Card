-- Migration: Optimize scheduled cleanup query performance
-- Date: 2026-01-20
-- Purpose: Add composite index for revoked card cleanup query

-- Create partial index for efficient cleanup queries
-- This index optimizes: SELECT * FROM uuid_bindings WHERE status = 'revoked' AND revoked_at < ?
CREATE INDEX IF NOT EXISTS idx_uuid_bindings_revoked_cleanup 
ON uuid_bindings(status, revoked_at) 
WHERE status = 'revoked';
