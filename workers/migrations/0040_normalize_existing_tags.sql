-- Migration 0040: Prepare for Tag Re-normalization
-- 準備重新標準化標籤

-- Strategy: Mark all cards for re-tagging, let auto-tag cron regenerate with new logic

-- Step 1: Clear auto_tagged_at to trigger re-tagging
UPDATE received_cards 
SET auto_tagged_at = NULL 
WHERE deleted_at IS NULL AND merged_to IS NULL;

-- Step 2: Mark all tag_stats for rebuild
UPDATE tag_stats SET rebuild_at = NULL;

-- Notes:
-- - This will cause auto-tag cron to re-process all cards
-- - New tags will use normalized values from tag-service.ts
-- - Old tags will be replaced (INSERT OR REPLACE)
-- - Estimated time: ~5 minutes for 85 cards (20 per batch)
-- - No data loss: raw_value is preserved

-- Rollback (if needed):
-- Set auto_tagged_at back to created_at for all cards
