-- Migration 0028: Card Thumbnails
-- 名片縮圖系統

-- 新增縮圖欄位到 received_cards 表
-- 注意：temp_uploads.thumbnail_url 已在 Migration 0026 新增
ALTER TABLE received_cards ADD COLUMN thumbnail_url TEXT;

-- 新增索引（加速查詢）
CREATE INDEX idx_received_cards_thumbnail ON received_cards(thumbnail_url);

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN thumbnail_url;
-- DROP INDEX idx_received_cards_thumbnail;
