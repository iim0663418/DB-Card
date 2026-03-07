-- Migration 0033: Card Deduplication & Auto-tagging Support
-- 名片去重與自動標籤系統

-- 1. 去重欄位
ALTER TABLE received_cards ADD COLUMN merged_to TEXT;
ALTER TABLE received_cards ADD COLUMN merge_reason TEXT;
ALTER TABLE received_cards ADD COLUMN merge_confidence INTEGER; -- 0-100
ALTER TABLE received_cards ADD COLUMN auto_tagged_at INTEGER;
ALTER TABLE received_cards ADD COLUMN embedding_synced_at INTEGER;

-- 2. Blocking 索引（加速去重查詢）
CREATE INDEX idx_received_cards_email_domain ON received_cards(
  substr(email, instr(email, '@') + 1)
) WHERE email IS NOT NULL;

CREATE INDEX idx_received_cards_phone_normalized ON received_cards(
  replace(replace(replace(phone, '-', ''), ' ', ''), '+', '')
) WHERE phone IS NOT NULL;

CREATE INDEX idx_received_cards_merged ON received_cards(merged_to);
CREATE INDEX idx_received_cards_embedding_synced ON received_cards(embedding_synced_at);

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN merged_to;
-- ALTER TABLE received_cards DROP COLUMN merge_reason;
-- ALTER TABLE received_cards DROP COLUMN merge_confidence;
-- ALTER TABLE received_cards DROP COLUMN auto_tagged_at;
-- ALTER TABLE received_cards DROP COLUMN embedding_synced_at;
-- DROP INDEX idx_received_cards_email_domain;
-- DROP INDEX idx_received_cards_phone_normalized;
-- DROP INDEX idx_received_cards_merged;
-- DROP INDEX idx_received_cards_embedding_synced;
