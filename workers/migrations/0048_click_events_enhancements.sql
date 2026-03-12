-- Migration 0048: Add query_event_id and result_source to click_events
-- Phase 3.0.5a: Data Pipeline Fix

-- Add query_event_id for stable joins (not hash-based)
ALTER TABLE click_events ADD COLUMN query_event_id TEXT;

-- Add result_source for accurate tool success tracking
ALTER TABLE click_events ADD COLUMN result_source TEXT;

-- Index for efficient joins with query_events
CREATE INDEX IF NOT EXISTS idx_click_events_query_event 
  ON click_events(query_event_id);

-- Note: Keep query_hash for backward compatibility with old clients
