-- Migration 0030: Organization Extended Fields
-- 新增公司英文名稱和別名欄位

ALTER TABLE received_cards ADD COLUMN organization_en TEXT;
ALTER TABLE received_cards ADD COLUMN organization_alias TEXT;

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN organization_en;
-- ALTER TABLE received_cards DROP COLUMN organization_alias;
