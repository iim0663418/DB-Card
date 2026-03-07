# Batch API Migration - BDD Specification

## Feature: Migrate Cron Jobs to Gemini Batch API

### Background
- Current: Cron jobs use synchronous Gemini API (blocking, expensive)
- Goal: Migrate to Batch API (50% cost reduction, non-blocking)
- Risk: Prevent duplicate enqueue, infinite retry, race conditions

---

## Scenario 1: Prevent Duplicate Enqueue

**Given** a card with uuid "card-123" needs auto-tagging  
**And** the card is not yet tagged (auto_tagged_at IS NULL)  
**When** Cron job runs and creates a batch job  
**Then** the card should be inserted into batch_job_queue with status "queued"  
**And** the card should have a unique constraint on (entity_type, entity_id, job_type)  
**When** Cron job runs again before the batch completes  
**Then** the card should NOT be enqueued again (UNIQUE constraint violation)  
**And** the query should exclude cards with status IN ('queued', 'processing')

---

## Scenario 2: Retry Chain Tracking

**Given** a batch job fails with job_id=1, attempt=1, max_attempts=3  
**When** handleFailure is called  
**Then** a new retry job should be created with:
  - root_job_id = 1 (or parent's root_job_id)
  - parent_job_id = 1
  - attempt = 2
  - max_attempts = 3 (inherited)
**And** the original job status should be "failed" (not "cancelled")  

**When** the retry job (attempt=2) also fails  
**Then** another retry job should be created with attempt=3  

**When** the final retry (attempt=3) fails  
**Then** NO new retry job should be created  
**And** the job status should be "dead_letter"  
**And** the queue status should be "failed"

---

## Scenario 3: Concurrent Processing Protection

**Given** two Cron workers (A and B) run simultaneously  
**And** a batch job with id=1, status="submitted", leased_until=NULL  
**When** Worker A calls processJob(job)  
**Then** Worker A should atomically set leased_until = now + 5min  
**When** Worker B calls processJob(job) 1 second later  
**Then** Worker B should fail to acquire the lease (UPDATE returns 0 rows)  
**And** Worker B should skip processing this job  
**When** Worker A completes processing  
**Then** leased_until should be set to NULL (released)

---

## Scenario 4: Result Mapping by Key

**Given** a batch job with 3 cards: ["uuid-1", "uuid-2", "uuid-3"]  
**And** Gemini returns results in order: [uuid-3, uuid-1] (uuid-2 missing)  
**When** processAutoTagResults is called  
**Then** results should be mapped by key:
  - uuid-1 → save tags, queue status = "completed"
  - uuid-2 → no result, queue status = "failed", error = "No result returned"
  - uuid-3 → save tags, queue status = "completed"
**And** the mapping should NOT rely on array index

---

## Scenario 5: Partial Failure Handling

**Given** a batch job with 10 requests  
**And** Gemini returns 7 successful responses and 3 errors  
**When** handleSuccess is called  
**Then** succeeded_requests should be 7  
**And** failed_requests should be 3  
**And** job status should be "partial_failed"  
**And** 3 error records should be inserted into batch_job_errors  
**And** each error should have: batch_job_id, entity_id, error_code, error_message

---

## Scenario 6: Backlog Control

**Given** 3 batch jobs with status IN ('queued', 'submitted', 'running')  
**And** MAX_IN_FLIGHT = 3  
**When** Cron job runs  
**Then** pollAndProcess should be called first  
**And** checkBacklog should return count = 3  
**And** NO new batch job should be created  
**And** log message should be "In-flight limit reached (3/3)"

**Given** 2 batch jobs in-flight  
**When** Cron job runs  
**Then** a new batch job CAN be created (2 < 3)

---

## Scenario 7: SQLite Schema Correctness

**Given** Migration 0038 is executed  
**Then** the following tables should exist:
  - batch_job_queue
  - batch_jobs
  - batch_job_errors
**And** the following indexes should exist:
  - idx_queue_status
  - idx_queue_batch
  - idx_jobs_status
  - idx_jobs_root
  - idx_jobs_lease
  - idx_errors_job
**And** UNIQUE constraint should exist on batch_job_queue(entity_type, entity_id, job_type)
**And** FOREIGN KEY constraints should exist:
  - batch_job_queue.batch_job_id → batch_jobs.id
  - batch_jobs.root_job_id → batch_jobs.id
  - batch_jobs.parent_job_id → batch_jobs.id
  - batch_job_errors.batch_job_id → batch_jobs.id

---

## Non-Functional Requirements

1. **Atomicity**: All enqueue operations must be atomic (UNIQUE constraint)
2. **Idempotency**: Re-running Cron should not create duplicate jobs
3. **Observability**: All state transitions must be logged
4. **Performance**: Lease lock acquisition must be < 10ms
5. **Cost**: 50% reduction vs synchronous API
