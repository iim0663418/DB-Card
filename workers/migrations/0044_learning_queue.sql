-- Migration 0044: Learning Queue for Failed Character Learning
-- Purpose: Retry failed character learning with exponential backoff
-- Date: 2026-03-09

CREATE TABLE IF NOT EXISTS learning_queue (
  char TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  next_retry_at INTEGER NOT NULL,
  last_error TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_next_retry ON learning_queue(next_retry_at, status);
CREATE INDEX IF NOT EXISTS idx_status ON learning_queue(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON learning_queue(created_at DESC);
