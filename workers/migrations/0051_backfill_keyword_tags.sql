-- Migration 0051: Backfill auto_keyword tags missing category/normalized_value
-- 修復 extractTagsFromOrganization 寫入的 tag 缺少 category/raw_value/normalized_value

UPDATE card_tags
SET category = 'keyword',
    raw_value = tag,
    normalized_value = tag
WHERE tag_source = 'auto_keyword'
  AND category IS NULL;

-- 修復英文 key → 中文可讀標籤
UPDATE card_tags SET tag = '政府機關', raw_value = '政府機關', normalized_value = '政府機關' WHERE tag = 'government' AND tag_source = 'auto_keyword';
UPDATE card_tags SET tag = '企業法人', raw_value = '企業法人', normalized_value = '企業法人' WHERE tag = 'listed' AND tag_source = 'auto_keyword';
UPDATE card_tags SET tag = '新創公司', raw_value = '新創公司', normalized_value = '新創公司' WHERE tag = 'startup' AND tag_source = 'auto_keyword';
UPDATE card_tags SET tag = '非營利組織', raw_value = '非營利組織', normalized_value = '非營利組織' WHERE tag = 'ngo' AND tag_source = 'auto_keyword';

-- tag_stats 也需要更新
UPDATE tag_stats SET tag = '政府機關' WHERE tag = 'government';
UPDATE tag_stats SET tag = '企業法人' WHERE tag = 'listed';
UPDATE tag_stats SET tag = '新創公司' WHERE tag = 'startup';
UPDATE tag_stats SET tag = '非營利組織' WHERE tag = 'ngo';

-- 回滾方案（註解）
-- UPDATE card_tags SET tag = 'government', raw_value = 'government', normalized_value = 'government' WHERE tag = '政府機關' AND tag_source = 'auto_keyword';
-- UPDATE card_tags SET tag = 'listed', raw_value = 'listed', normalized_value = 'listed' WHERE tag = '企業法人' AND tag_source = 'auto_keyword';
-- UPDATE card_tags SET tag = 'startup', raw_value = 'startup', normalized_value = 'startup' WHERE tag = '新創公司' AND tag_source = 'auto_keyword';
-- UPDATE card_tags SET tag = 'ngo', raw_value = 'ngo', normalized_value = 'ngo' WHERE tag = '非營利組織' AND tag_source = 'auto_keyword';
