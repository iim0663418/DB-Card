-- Migration 0050: Partial index for auto-tag cron query optimization
-- 解決 auto_tagged_at IS NULL 查詢全表掃描（792 rows read → LIMIT 數量）

CREATE INDEX idx_received_cards_untagged
ON received_cards(created_at DESC)
WHERE deleted_at IS NULL
  AND merged_to IS NULL
  AND auto_tagged_at IS NULL;

-- 回滾方案（註解）
-- DROP INDEX IF EXISTS idx_received_cards_untagged;
