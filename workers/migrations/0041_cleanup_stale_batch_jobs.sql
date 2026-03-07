-- Migration 0041: Cleanup Stale Batch Jobs
-- 止血清理：標記卡住的 job 為 dead_letter，釋放 queue

-- 1) 標記超過 48 小時的卡住 job 為 dead_letter（不刪除，保留審計）
UPDATE batch_jobs
SET status = 'dead_letter',
    completed_at = strftime('%s','now') * 1000,
    error_message = 'stale submitted/running job auto-closed'
WHERE job_type = 'auto_tag'
  AND status IN ('submitted','running','processing_results')
  AND created_at < (strftime('%s','now') * 1000 - 48*3600*1000);

-- 2) 釋放卡住的 queue entries，讓卡片可重新入列
UPDATE batch_job_queue
SET status = 'failed',
    processed_at = strftime('%s','now') * 1000,
    error_message = 'stale queue entry released'
WHERE job_type = 'auto_tag'
  AND status IN ('queued','processing')
  AND enqueued_at < (strftime('%s','now') * 1000 - 48*3600*1000);

-- Notes:
-- - 不直接 DELETE，保留審計記錄
-- - 48 小時是 pollAndProcess() 的查詢窗口
-- - 釋放後的卡片會在下次 cron 重新入列
-- - 可安全重複執行（idempotent）

-- Verification:
-- SELECT COUNT(*) FROM batch_jobs WHERE status = 'dead_letter';
-- SELECT COUNT(*) FROM batch_job_queue WHERE status = 'failed' AND error_message LIKE 'stale%';
