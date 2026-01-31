-- Migration 0016: Add actor fields to audit_logs
-- Created: 2026-01-28
-- Purpose: Add actor_type and actor_id columns for better audit tracking

-- Add actor_type column (admin, user, system)
ALTER TABLE audit_logs ADD COLUMN actor_type TEXT;

-- Add actor_id column (email or identifier)
ALTER TABLE audit_logs ADD COLUMN actor_id TEXT;

-- Create index for actor queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);

-- Migration complete
