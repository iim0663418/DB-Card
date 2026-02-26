# BDD Spec: 搜尋欄位擴充 P0 + P1

## Scenario 1: Vectorize Embedding 欄位擴充

**Given**: 當前 Embedding 包含 10 個欄位
**When**: 新增 website, address, note 到 Embedding 生成
**Then**: 
- Embedding text 包含 13 個欄位
- 順序: full_name, organization, organization_en, organization_alias, department, title, company_summary, personal_summary, email, phone, website, address, note
- SQL SELECT 包含 website, address, note
- 空值欄位自動過濾 (filter(Boolean))

**File**: `src/cron/sync-card-embeddings.ts`
**Lines**: 13-40

---

## Scenario 2: 後端關鍵字搜尋欄位擴充

**Given**: 當前 SQL WHERE 包含 10 個欄位
**When**: 新增 website, address, note 到 SQL 查詢
**Then**:
- COUNT 查詢包含 13 個 LIKE 條件
- SELECT 查詢包含 13 個 LIKE 條件
- 每個查詢綁定 13 個參數 (user_email + 12 個 searchPattern)
- 參數順序與 WHERE 條件一致

**File**: `src/handlers/user/received-cards/search.ts`
**Lines**: 195-280

**COUNT Query**:
```sql
WHERE (
  full_name LIKE ? OR
  organization LIKE ? OR
  organization_en LIKE ? OR
  organization_alias LIKE ? OR
  department LIKE ? OR
  title LIKE ? OR
  company_summary LIKE ? OR
  personal_summary LIKE ? OR
  email LIKE ? OR
  phone LIKE ? OR
  website LIKE ? OR
  address LIKE ? OR
  note LIKE ?
)
```

**SELECT Query**: 同上

---

## Scenario 3: 前端客戶端過濾欄位擴充

**Given**: 當前前端過濾包含 12 個欄位
**When**: 新增 note 到前端過濾邏輯
**Then**:
- filterCards() 包含 13 個欄位檢查
- 使用 optional chaining (?.) 和 toLowerCase()
- 最後一個條件不加 ||

**File**: `workers/public/js/received-cards.js`
**Lines**: ~1180-1195

```javascript
card.note?.toLowerCase().includes(this.currentKeyword)
```

---

## Acceptance Criteria

1. ✅ TypeScript 編譯通過 (npm run typecheck)
2. ✅ 三個文件都正確修改
3. ✅ 參數數量正確 (13 個)
4. ✅ 欄位順序一致
5. ✅ 搜尋「延平」可以找到地址
6. ✅ 搜尋「example.com」可以找到網站
7. ✅ 搜尋備註內容可以找到名片

---

## Technical Notes

- Embedding 長度增加 30% (10 → 13 欄位)
- SQL 查詢參數從 11 增加到 14 (user_email + 13 個 searchPattern)
- 前端過濾從 12 增加到 13 個條件
- 需要清空 embedding_synced_at 重新同步
