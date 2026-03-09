-- Migration 0045: Learning Metrics Aggregation
-- Purpose: Daily metrics to reduce D1 writes (cost control)
-- Date: 2026-03-09

CREATE TABLE IF NOT EXISTS learning_metrics (
  date TEXT PRIMARY KEY,  -- YYYY-MM-DD format
  learned_count INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_date_desc ON learning_metrics(date DESC);
