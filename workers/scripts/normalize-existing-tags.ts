/**
 * Normalize existing tags using tag-service logic
 * 重新標準化現有標籤
 */

import { normalizeTag } from '../src/services/tag-service';
import type { TagCategory } from '../src/types/tags';

interface TagRow {
  card_uuid: string;
  category: TagCategory;
  raw_value: string;
  normalized_value: string;
}

async function normalizeExistingTags() {
  console.log('🔄 Starting tag normalization...\n');

  // 模擬查詢（實際需要 D1 連接）
  const sampleTags: TagRow[] = [
    { card_uuid: 'xxx', category: 'industry', raw_value: '軟體與資訊服務業', normalized_value: '軟體與資訊服務業' },
    { card_uuid: 'xxx', category: 'industry', raw_value: '資訊服務業', normalized_value: '資訊服務業' },
    { card_uuid: 'xxx', category: 'industry', raw_value: '資安', normalized_value: '資安' },
    { card_uuid: 'xxx', category: 'location', raw_value: '台北市內湖區', normalized_value: '台北市內湖區' },
    { card_uuid: 'xxx', category: 'location', raw_value: '台北市', normalized_value: '台北市' },
  ];

  console.log('📊 Sample normalization results:\n');
  
  for (const tag of sampleTags) {
    const newNormalized = normalizeTag(tag.category, tag.raw_value);
    const changed = newNormalized !== tag.normalized_value;
    
    console.log(`${changed ? '✏️ ' : '✓ '} ${tag.category}:`);
    console.log(`   Raw: "${tag.raw_value}"`);
    console.log(`   Old: "${tag.normalized_value}"`);
    console.log(`   New: "${newNormalized}"`);
    if (changed) {
      console.log(`   → Will update`);
    }
    console.log('');
  }

  console.log('\n📝 SQL to execute:\n');
  console.log(`
-- Step 1: Update normalized_value for all tags
UPDATE card_tags
SET normalized_value = CASE
  -- Industry mappings
  WHEN category = 'industry' AND raw_value = '軟體與資訊服務業' THEN '資訊服務'
  WHEN category = 'industry' AND raw_value = '資訊服務業' THEN '資訊服務'
  WHEN category = 'industry' AND raw_value = '軟體業' THEN '資訊服務'
  WHEN category = 'industry' AND raw_value = '資訊軟體' THEN '資訊服務'
  WHEN category = 'industry' AND raw_value = '資安' THEN '資訊安全'
  WHEN category = 'industry' AND raw_value = 'Information Security' THEN '資訊安全'
  WHEN category = 'industry' AND raw_value = 'Cybersecurity' THEN '資訊安全'
  WHEN category = 'industry' AND raw_value = '電信與科技' THEN '電信'
  WHEN category = 'industry' AND raw_value = '電信與資訊技術' THEN '電信'
  
  -- Location mappings
  WHEN category = 'location' AND raw_value LIKE '台北市%' THEN '台北'
  WHEN category = 'location' AND raw_value LIKE '新北市%' THEN '新北'
  WHEN category = 'location' AND raw_value LIKE '桃園市%' THEN '桃園'
  WHEN category = 'location' AND raw_value LIKE '台中市%' THEN '台中'
  WHEN category = 'location' AND raw_value LIKE '台南市%' THEN '台南'
  WHEN category = 'location' AND raw_value LIKE '高雄市%' THEN '高雄'
  WHEN category = 'location' AND raw_value = 'Taipei' THEN '台北'
  WHEN category = 'location' AND raw_value = 'Taiwan' THEN '其他'
  
  -- Seniority mappings
  WHEN category = 'seniority' AND (raw_value LIKE '%總%' OR raw_value LIKE '%長%') THEN '高階主管'
  WHEN category = 'seniority' AND raw_value LIKE '%經理%' THEN '中階主管'
  WHEN category = 'seniority' AND (raw_value LIKE '%組長%' OR raw_value LIKE '%主管%') THEN '基層主管'
  
  -- Keep as-is for expertise and unmatched
  ELSE normalized_value
END,
tag = category || ':' || CASE
  -- Same mappings for tag column
  WHEN category = 'industry' AND raw_value = '軟體與資訊服務業' THEN '資訊服務'
  WHEN category = 'industry' AND raw_value = '資訊服務業' THEN '資訊服務'
  WHEN category = 'industry' AND raw_value = '資安' THEN '資訊安全'
  WHEN category = 'location' AND raw_value LIKE '台北市%' THEN '台北'
  WHEN category = 'location' AND raw_value LIKE '新北市%' THEN '新北'
  ELSE normalized_value
END
WHERE category IN ('industry', 'location', 'seniority');

-- Step 2: Mark tag_stats for rebuild
UPDATE tag_stats SET rebuild_at = NULL;
  `);

  console.log('\n✅ Review the SQL above and execute manually in staging first.');
}

normalizeExistingTags().catch(console.error);
