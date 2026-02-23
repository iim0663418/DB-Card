-- Migration 0026: Web Search Optional
-- 讓 Web Search 成為可選增強，不阻塞核心流程

-- 1. 新增 ai_status 欄位到 received_cards 表
ALTER TABLE received_cards ADD COLUMN ai_status TEXT DEFAULT 'skipped';

-- 可能的值：
-- 'skipped': 使用者跳過 AI
-- 'pending': 等待 AI 處理
-- 'completed': AI 已完成
-- 'failed': AI 失敗

-- 2. 新增批次上傳相關欄位到 temp_uploads 表
ALTER TABLE temp_uploads ADD COLUMN batch_id TEXT;
ALTER TABLE temp_uploads ADD COLUMN filename TEXT;
ALTER TABLE temp_uploads ADD COLUMN ocr_status TEXT DEFAULT 'pending';
ALTER TABLE temp_uploads ADD COLUMN ocr_error TEXT;
ALTER TABLE temp_uploads ADD COLUMN thumbnail_url TEXT;

-- 3. 新增索引
CREATE INDEX idx_temp_uploads_batch ON temp_uploads(batch_id);

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN ai_status;
-- ALTER TABLE temp_uploads DROP COLUMN batch_id;
-- ALTER TABLE temp_uploads DROP COLUMN filename;
-- ALTER TABLE temp_uploads DROP COLUMN ocr_status;
-- ALTER TABLE temp_uploads DROP COLUMN ocr_error;
-- ALTER TABLE temp_uploads DROP COLUMN thumbnail_url;
-- DROP INDEX idx_temp_uploads_batch;
