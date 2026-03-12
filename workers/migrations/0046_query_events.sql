-- Migration 0046: Query Events Table (Remember Layer)
-- Phase 2: Four-Layer Agent Architecture
-- Purpose: Event-sourced query logging for future personalization

CREATE TABLE IF NOT EXISTS query_events (
  event_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  query_hash TEXT NOT NULL,        -- SHA-256 (privacy-first)
  normalized_query TEXT,            -- For debugging only
  query_type TEXT,                  -- person/company/mixed/unknown
  plan_goal TEXT,                   -- exact_match/explore/relationship
  tools_used TEXT,                  -- JSON array: ["semantic","keyword"]
  result_count INTEGER,
  latency_ms INTEGER,
  timestamp INTEGER NOT NULL
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_query_events_user 
  ON query_events(user_email, timestamp DESC);

-- Index for query analysis
CREATE INDEX IF NOT EXISTS idx_query_events_hash 
  ON query_events(query_hash, timestamp DESC);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_query_events_latency 
  ON query_events(latency_ms DESC, timestamp DESC);
