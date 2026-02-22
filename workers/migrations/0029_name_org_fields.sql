-- Migration 0029: Name and Organization Fields
-- 新增稱謂、後綴、部門等欄位

-- 1. 新增名字相關欄位
ALTER TABLE received_cards ADD COLUMN name_prefix TEXT; -- Dr., Mr., Mrs.
ALTER TABLE received_cards ADD COLUMN name_suffix TEXT; -- Ph.D., Jr., M.D.

-- 2. 新增組織相關欄位
ALTER TABLE received_cards ADD COLUMN department TEXT; -- 部門

-- 3. 更新索引（如需要）
-- CREATE INDEX idx_received_cards_department ON received_cards(department);

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN name_prefix;
-- ALTER TABLE received_cards DROP COLUMN name_suffix;
-- ALTER TABLE received_cards DROP COLUMN department;
