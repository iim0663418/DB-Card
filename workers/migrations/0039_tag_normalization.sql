-- Migration 0039: Tag Normalization (Schema Stabilization)
-- 標籤標準化 - 抽取與標準化分離架構

-- 1. Add new columns to card_tags
ALTER TABLE card_tags ADD COLUMN category TEXT;           -- industry/location/expertise/seniority
ALTER TABLE card_tags ADD COLUMN raw_value TEXT;          -- AI 原始輸出
ALTER TABLE card_tags ADD COLUMN normalized_value TEXT;   -- 標準化值

-- 2. Backfill existing data (safe extraction with null handling)
UPDATE card_tags 
SET category = CASE 
    WHEN tag LIKE 'industry:%' THEN 'industry'
    WHEN tag LIKE 'location:%' THEN 'location'
    WHEN tag LIKE 'expertise:%' THEN 'expertise'
    WHEN tag LIKE 'seniority:%' THEN 'seniority'
    ELSE NULL
  END,
  raw_value = CASE 
    WHEN INSTR(tag, ':') > 0 THEN SUBSTR(tag, INSTR(tag, ':') + 1)
    ELSE tag
  END,
  normalized_value = CASE 
    WHEN INSTR(tag, ':') > 0 THEN SUBSTR(tag, INSTR(tag, ':') + 1)
    ELSE tag
  END
WHERE tag IS NOT NULL;

-- 3. Create composite index for filtering (category + normalized_value)
CREATE INDEX idx_card_tags_category_normalized ON card_tags(category, normalized_value);
CREATE INDEX idx_card_tags_card_category ON card_tags(card_uuid, category);

-- 4. Add rebuild_at to tag_stats (for cache invalidation)
ALTER TABLE tag_stats ADD COLUMN rebuild_at INTEGER;

-- 5. Mark tag_stats for rebuild
UPDATE tag_stats SET rebuild_at = NULL;

-- Notes:
-- - 'tag' column kept for backward compatibility
-- - 'category' avoids string parsing, enables efficient queries
-- - 'raw_value' preserves AI output (e.g., "軟體與資訊服務業")
-- - 'normalized_value' for filtering (e.g., "資訊服務")
-- - tag_stats.rebuild_at tracks last rebuild time
-- - Composite index (category, normalized_value) for filter queries

-- Rollback (if needed):
-- ALTER TABLE card_tags DROP COLUMN category;
-- ALTER TABLE card_tags DROP COLUMN raw_value;
-- ALTER TABLE card_tags DROP COLUMN normalized_value;
-- ALTER TABLE tag_stats DROP COLUMN rebuild_at;
-- DROP INDEX IF EXISTS idx_card_tags_category_normalized;
-- DROP INDEX IF EXISTS idx_card_tags_card_category;
