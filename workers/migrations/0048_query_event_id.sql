-- Migration 0048: Phase 3.0.5a - Data Pipeline Fix
-- Purpose: Add query_event_id (stable join) and result_source (tool tracking) to click_events
-- Note: Keep query_hash for backward compatibility

ALTER TABLE click_events ADD COLUMN query_event_id TEXT;
ALTER TABLE click_events ADD COLUMN result_source TEXT;

-- Index for efficient one-to-many joins: click_events.query_event_id → query_events.event_id
CREATE INDEX IF NOT EXISTS idx_click_events_query_event
  ON click_events(query_event_id);
