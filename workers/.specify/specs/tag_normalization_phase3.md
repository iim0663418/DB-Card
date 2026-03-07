# Tag Normalization - Phase 3: Integrate Auto-Tag

## BDD Specification

### Scenario 1: AI extraction without normalization
**Given**: 20 張未標籤的名片
**When**: 呼叫 `generateTagsBatch(env, cards)`
**Then**: 
- Gemini 回傳 TagExtractionResult[]
- 只抽取，不標準化
- industry/location/seniority 為原始字串

### Scenario 2: Use unified tag service
**Given**: TagExtractionResult from AI
**When**: 呼叫 `saveTags(env, cardUuid, userEmail, tags)`
**Then**: 
- 標籤寫入包含 category, raw_value, normalized_value
- 標準化由 tag-service 處理
- tag_stats 標記為需要重建

### Scenario 3: Auto-tag cron integration
**Given**: auto-tag-cards.ts 使用舊的 saveTags()
**When**: 修改為使用新的 tag-service
**Then**: 
- 移除舊的 saveTags() 函式
- 使用 import { saveTags } from '../services/tag-service'
- 保持相同的批次處理邏輯

## Acceptance Criteria
- ✅ AI prompt 簡化（只抽取）
- ✅ 使用統一 tag-service
- ✅ 移除重複的標籤寫入邏輯
- ✅ TypeScript 零錯誤
- ✅ 向後相容（auto_tagged_at 仍正常更新）
