-- Migration 0038: Batch API Job Queue System
-- Purpose: Enable async Gemini Batch API processing with retry chain tracking
-- Risk Mitigation:
--   1. Prevent duplicate enqueue (UNIQUE constraint)
--   2. Track retry chain (root_job_id, attempt)
--   3. Concurrent processing protection (leased_until)
--   4. Partial failure handling (batch_job_errors)

-- Table 1: Job Queue (Prevent Duplicate Enqueue)
CREATE TABLE IF NOT EXISTS batch_job_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,              -- 'card' | 'card_pair'
  entity_id TEXT NOT NULL,                -- card.uuid or 'uuid1|uuid2'
  job_type TEXT NOT NULL,                 -- 'auto_tag' | 'deduplicate'
  status TEXT NOT NULL,                   -- 'queued' | 'processing' | 'completed' | 'failed'
  batch_job_id INTEGER,                   -- FK to batch_jobs.id
  enqueued_at INTEGER NOT NULL,
  processed_at INTEGER,
  error_message TEXT,
  
  UNIQUE(entity_type, entity_id, job_type),  -- Critical: Prevent duplicate enqueue
  FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id)
);

CREATE INDEX idx_queue_status ON batch_job_queue(status, job_type);
CREATE INDEX idx_queue_batch ON batch_job_queue(batch_job_id);

-- Table 2: Batch Jobs (Retry Chain Tracking)
CREATE TABLE IF NOT EXISTS batch_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT UNIQUE,                   -- batches/abc123 (Gemini Job ID)
  job_type TEXT NOT NULL,                 -- 'auto_tag' | 'deduplicate'
  status TEXT NOT NULL,                   -- 'queued' | 'submitted' | 'running' | 'processing_results' | 'succeeded' | 'partial_failed' | 'failed' | 'dead_letter'
  
  -- Retry Chain Tracking (Critical: Prevent infinite retry)
  root_job_id INTEGER,                    -- First job in retry chain (self-reference if root)
  parent_job_id INTEGER,                  -- Previous retry job
  attempt INTEGER NOT NULL DEFAULT 1,     -- Current attempt (1-based, cumulative across chain)
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  
  -- Concurrent Processing Protection
  leased_until INTEGER,                   -- NULL = available, timestamp = locked until
  
  -- Error Tracking
  error_message TEXT,
  
  -- Job Configuration (JSON)
  config_json TEXT,                       -- Serialized job config
  
  -- Result Statistics
  total_requests INTEGER,
  succeeded_requests INTEGER,
  failed_requests INTEGER,
  
  FOREIGN KEY (root_job_id) REFERENCES batch_jobs(id),
  FOREIGN KEY (parent_job_id) REFERENCES batch_jobs(id)
);

CREATE INDEX idx_jobs_status ON batch_jobs(status);
CREATE INDEX idx_jobs_type ON batch_jobs(job_type);
CREATE INDEX idx_jobs_root ON batch_jobs(root_job_id);
CREATE INDEX idx_jobs_lease ON batch_jobs(leased_until);

-- Table 3: Job Errors (Partial Failure Tracking)
CREATE TABLE IF NOT EXISTS batch_job_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_job_id INTEGER NOT NULL,
  entity_id TEXT NOT NULL,                -- card.uuid or pair key
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id)
);

CREATE INDEX idx_errors_job ON batch_job_errors(batch_job_id);
CREATE INDEX idx_errors_entity ON batch_job_errors(entity_id);
