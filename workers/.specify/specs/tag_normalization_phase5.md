# Tag Normalization - Phase 5: Frontend Updates

## BDD Specification

### Scenario 1: Parse new tag format
**Given**: API 回傳 `tags: [{ category, raw, normalized }]`
**When**: 前端接收資料
**Then**: 
- 篩選器使用 `normalized` 聚合
- 卡片顯示使用 `raw`
- 按 `category` 分組

### Scenario 2: Tag filter aggregation
**Given**: 多張卡片有相同 normalized 但不同 raw
**When**: 初始化標籤篩選器
**Then**: 
- 按 `category` 和 `normalized` 聚合
- 顯示計數正確

### Scenario 3: Card display shows raw value
**Given**: 卡片有標籤 `{ raw: "軟體與資訊服務業", normalized: "資訊服務" }`
**When**: 顯示卡片詳情
**Then**: 
- 顯示 "軟體與資訊服務業"（raw）
- Tooltip 顯示 "分類: 資訊服務"（normalized）

## Acceptance Criteria
- ✅ received-cards.js 解析新格式
- ✅ 篩選器使用 normalized
- ✅ 顯示使用 raw
- ✅ 向後相容（處理空 tags）
