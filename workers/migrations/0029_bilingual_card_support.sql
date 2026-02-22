-- Migration 0029: Bilingual Card Support
-- 依賴：0026 (ai_status), 0028 (thumbnail_url)
-- SQLite 相容版本

-- 1. 新增反面圖片欄位
ALTER TABLE received_cards ADD COLUMN back_image_url TEXT;
ALTER TABLE received_cards ADD COLUMN back_thumbnail_url TEXT;

-- 2. 新增雙語欄位
ALTER TABLE received_cards ADD COLUMN name_zh TEXT;
ALTER TABLE received_cards ADD COLUMN name_en TEXT;
ALTER TABLE received_cards ADD COLUMN title_zh TEXT;
ALTER TABLE received_cards ADD COLUMN title_en TEXT;
ALTER TABLE received_cards ADD COLUMN organization_zh TEXT;
ALTER TABLE received_cards ADD COLUMN organization_en TEXT;
ALTER TABLE received_cards ADD COLUMN address_zh TEXT;
ALTER TABLE received_cards ADD COLUMN address_en TEXT;

-- 3. 新增 AI 追蹤欄位
ALTER TABLE received_cards ADD COLUMN ai_confidence REAL DEFAULT 0.0;
ALTER TABLE received_cards ADD COLUMN data_source TEXT DEFAULT 'manual';

-- 4. Backfill 既有資料
UPDATE received_cards 
SET name_zh = full_name,
    organization_zh = organization,
    title_zh = title,
    address_zh = address,
    data_source = 'backfill'
WHERE full_name IS NOT NULL 
  AND name_zh IS NULL 
  AND deleted_at IS NULL;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_received_cards_name_zh ON received_cards(name_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_name_en ON received_cards(name_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_zh ON received_cards(organization_zh) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_org_en ON received_cards(organization_en) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_received_cards_back_image ON received_cards(back_image_url) WHERE back_image_url IS NOT NULL;

-- 注意：
-- 1. 此 migration 依賴 0026 (ai_status) 和 0028 (thumbnail_url)
-- 2. 如果重複執行會失敗（SQLite 不支援 IF NOT EXISTS for columns）
-- 3. 生產環境執行前請先在 staging 驗證
