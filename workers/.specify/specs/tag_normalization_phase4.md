# Tag Normalization - Phase 4: API Response Format

## BDD Specification

### Scenario 1: List API returns tag objects
**Given**: 名片有標籤 industry:資訊服務 (raw: 軟體與資訊服務業)
**When**: 呼叫 GET /api/user/received-cards
**Then**: 
```json
{
  "tags": [
    {
      "category": "industry",
      "raw": "軟體與資訊服務業",
      "normalized": "資訊服務"
    }
  ]
}
```

### Scenario 2: Search API returns enriched tags
**Given**: 搜尋結果包含標籤
**When**: 呼叫 POST /api/user/received-cards/search
**Then**: tags 為物件陣列，包含 category/raw/normalized

### Scenario 3: Backward compatibility
**Given**: 前端可能仍使用舊格式 (string[])
**When**: API 回傳新格式
**Then**: 前端需同步更新，或提供相容層

## Acceptance Criteria
- ✅ crud.ts listCards 回傳新格式
- ✅ search.ts enrichSearchResult 回傳新格式
- ✅ TypeScript 類型更新
- ✅ 向後相容性考量
