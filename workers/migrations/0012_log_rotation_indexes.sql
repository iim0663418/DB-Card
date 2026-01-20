-- Migration: Add indexes for log rotation
-- Date: 2026-01-20
-- Purpose: Optimize audit_logs and security_events deletion queries

-- Optimize audit_logs rotation (365 days retention)
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs(timestamp);

-- Optimize security_events rotation (90 days retention)
CREATE INDEX IF NOT EXISTS idx_security_events_created_at 
ON security_events(created_at);
