-- Migration 0047: Click Events Table (Phase 3.0 - Click Tracking Foundation)
-- Purpose: Privacy-first click tracking for CTR analysis and future personalization
-- Retention: 7 days (enforced by daily cron cleanup)

CREATE TABLE IF NOT EXISTS click_events (
  event_id TEXT PRIMARY KEY,           -- UUID v4
  user_email TEXT NOT NULL,
  query_hash TEXT NOT NULL,            -- SHA-256 of normalized query (privacy-first)
  result_uuid TEXT NOT NULL,           -- Card UUID (no content stored)
  result_rank INTEGER NOT NULL,        -- 1-based position (1 = top result)
  timestamp INTEGER NOT NULL           -- Unix timestamp (ms)
);

-- Index for per-user analytics and rate limiting
CREATE INDEX IF NOT EXISTS idx_click_events_user
  ON click_events(user_email, timestamp DESC);

-- Index for CTR analysis by query
CREATE INDEX IF NOT EXISTS idx_click_events_query
  ON click_events(query_hash, timestamp DESC);

-- Index for result popularity analysis
CREATE INDEX IF NOT EXISTS idx_click_events_result
  ON click_events(result_uuid, timestamp DESC);
