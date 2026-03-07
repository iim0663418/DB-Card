# Tag Normalization - Phase 2: Unified Write Layer

## BDD Specification

### Scenario 1: Normalize industry tags
**Given**: AI 抽取結果 `"軟體與資訊服務業"`
**When**: 呼叫 `normalizeTag('industry', '軟體與資訊服務業')`
**Then**: 回傳 `"資訊服務"`

### Scenario 2: Normalize location tags
**Given**: AI 抽取結果 `"台北市內湖區"`
**When**: 呼叫 `normalizeTag('location', '台北市內湖區')`
**Then**: 回傳 `"台北"`

### Scenario 3: Preserve expertise diversity
**Given**: AI 抽取結果 `"雲端架構"`
**When**: 呼叫 `normalizeTag('expertise', '雲端架構')`
**Then**: 回傳 `"雲端架構"` (不標準化)

### Scenario 4: Unified tag writing
**Given**: TagExtractionResult with industry/location/expertise/seniority
**When**: 呼叫 `saveTags(env, cardUuid, userEmail, tags)`
**Then**: 
- card_tags 寫入包含 category, raw_value, normalized_value
- tag_stats 標記為需要重建 (rebuild_at = NULL)
- 使用 INSERT OR REPLACE 避免重複

### Scenario 5: Rebuild tag_stats
**Given**: tag_stats 標記為需要重建
**When**: 呼叫 `rebuildTagStats(env, userEmail)`
**Then**: 
- 刪除舊統計
- 從 card_tags 重新計算 COUNT(*)
- 設定 rebuild_at = now

## Acceptance Criteria
- ✅ 標準化邏輯正確（industry/location/seniority）
- ✅ expertise 不標準化
- ✅ saveTags() 統一寫入
- ✅ rebuildTagStats() 可重建
- ✅ TypeScript 零錯誤
