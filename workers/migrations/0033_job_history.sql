-- Migration 0033: Job History Tracking
-- 職位歷史追蹤 - 記錄職位變動和公司轉職

-- 1. 添加職位歷史欄位到 received_cards
ALTER TABLE received_cards ADD COLUMN job_history TEXT;

-- job_history 格式：JSON array
-- [
--   {
--     "organization": "台新金控",
--     "title": "資訊長",
--     "department": "IT",
--     "date": 1640995200000,
--     "type": "promotion" | "transfer" | "duplicate"
--   }
-- ]

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN job_history;
