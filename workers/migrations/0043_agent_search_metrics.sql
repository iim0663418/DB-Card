-- Phase 4: Agent Search Metrics
-- Stores anonymized telemetry for intent analysis observability.
-- query_hash = SHA256(normalized_query) — raw query is never stored.

CREATE TABLE IF NOT EXISTS agent_search_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  query_hash TEXT NOT NULL,  -- SHA256(normalized_query)
  intent TEXT NOT NULL,
  confidence REAL NOT NULL,
  tools_used TEXT NOT NULL,  -- JSON array: ["semantic", "keyword"]
  result_count INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  fallback_used INTEGER NOT NULL,  -- 0 or 1
  ai_timeout INTEGER NOT NULL,     -- 0 or 1
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_agent_metrics_timestamp ON agent_search_metrics(timestamp);
CREATE INDEX idx_agent_metrics_intent ON agent_search_metrics(intent);
