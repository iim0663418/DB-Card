# Tag Normalization - Phase 1: Schema Stabilization

## Context
實作標籤標準化系統，採用「抽取與標準化分離」架構。

## BDD Specification

### Scenario 1: Add category column to card_tags
**Given**: card_tags 表只有 tag 欄位（格式：`category:value`）
**When**: 執行 Migration 0039
**Then**: 
- card_tags 新增 category, raw_value, normalized_value 欄位
- 現有資料正確 backfill（處理無 `:` 情況）
- 建立複合索引 (category, normalized_value)

### Scenario 2: Add rebuild_at to tag_stats
**Given**: tag_stats 使用 count+1 累加邏輯
**When**: 執行 Migration 0039
**Then**: 
- tag_stats 新增 rebuild_at 欄位
- 所有記錄標記為需要重建（rebuild_at = NULL）

### Scenario 3: TypeScript types updated
**Given**: 舊的 CardTag 類型
**When**: 更新 types/tags.ts
**Then**: 
- 新增 TagCategory 類型
- CardTag 包含 category, raw_value, normalized_value
- 定義標準化常數（INDUSTRY_CATEGORIES 等）

## Acceptance Criteria
- ✅ Migration 0039 可執行且可回滾
- ✅ 現有 446 個標籤成功 backfill
- ✅ TypeScript 零錯誤
- ✅ 索引建立成功
