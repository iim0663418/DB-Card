# 技術分析：Merged Cards Filtering 實施計畫

## 執行摘要

**問題**: 去重功能已實作但使用者看不到效果
**根因**: SQL 查詢缺少 `merged_to IS NULL` 過濾條件
**影響範圍**: 12 個文件，20 處 SQL 查詢
**修復時間**: 3 小時（P0: 2h, P1: 0.5h, P2: 0.5h）
**風險等級**: 低（純查詢邏輯，不影響資料寫入）

---

## 1. 影響範圍分析

### 1.1 使用者可見端點（P0 - 必須修復）

#### A. 列表查詢 (`crud.ts`)
```typescript
// 當前代碼 (Line 290-298)
SELECT * FROM received_cards
WHERE user_email = ? AND deleted_at IS NULL

// 修正後
SELECT * FROM received_cards
WHERE user_email = ? 
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
```

**影響**:
- 使用者看到重複名片 → 修正後只看到最新名片
- 命中率: 100%（所有使用者都會呼叫此 API）

#### B. 搜尋查詢 (`search.ts`)

**3 處需要修改**:

1. **enrichSearchResult** (Line 46)
```sql
-- 計算相關聯絡人時，排除已合併名片
SELECT COUNT(*) FROM received_cards
WHERE user_email = ? 
  AND organization = ?
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
```

2. **semanticSearch** (Line 142)
```sql
-- Vectorize 語意搜尋結果驗證
SELECT * FROM received_cards
WHERE uuid = ? 
  AND user_email = ? 
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
```

3. **keywordSearch** (Line 240, 272)
```sql
-- 關鍵字搜尋（姓名、組織）
SELECT * FROM received_cards
WHERE user_email = ?
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
  AND (full_name LIKE ? OR organization LIKE ?)
```

**影響**:
- 搜尋結果包含重複名片 → 修正後只顯示最新名片
- related_contacts 計數錯誤 → 修正後準確

#### C. 單張名片查詢（5 個端點）

| 端點 | 文件 | 行數 | 用途 |
|------|------|------|------|
| `/vcard` | `vcard.ts` | 142 | 匯出 vCard |
| `/image` | `image.ts` | 31 | 取得原始圖片 |
| `/thumbnail` | `thumbnail.ts` | 31 | 取得縮圖 |
| `share` | `share.ts` | 29 | 分享名片 |
| `unshare` | `unshare.ts` | 29 | 取消分享 |
| `enrich` | `enrich.ts` | 166 | 補充資訊 |

**修正策略**:
```sql
-- 統一修改模式
SELECT * FROM received_cards
WHERE uuid = ? 
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
```

**錯誤處理增強** (vcard.ts 範例):
```typescript
if (!card) {
  // 檢查是否為已合併名片
  const merged = await env.DB.prepare(`
    SELECT merged_to FROM received_cards
    WHERE uuid = ? AND deleted_at IS NULL
  `).bind(uuid).first();
  
  if (merged?.merged_to) {
    return errorResponse(
      'CARD_MERGED',
      `This card has been merged to ${merged.merged_to}`,
      410  // Gone
    );
  }
  
  return errorResponse('NOT_FOUND', 'Card not found', 404);
}
```

---

### 1.2 背景作業（P1 - 效能優化）

#### A. 去重 Cron Job (`deduplicate-cards.ts`)

**2 處需要修改**:

1. **主查詢** (Line 14)
```sql
-- 取得所有待去重名片
SELECT * FROM received_cards
WHERE user_email = ?
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增（避免重複處理）
ORDER BY created_at DESC
```

2. **Blocking 查詢** (Line 20)
```sql
-- Email domain blocking
SELECT * FROM received_cards
WHERE user_email = ?
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
  AND substr(email, instr(email, '@') + 1) = ?
```

**效能影響**:
- 當前: 處理所有名片（包括已合併）
- 修正後: 只處理未合併名片
- **預期改善**: 減少 10-20% 處理量（假設 10-20% 名片已合併）

#### B. 自動標籤 Cron Job (`auto-tag-cards.ts`)

```sql
-- Line 27
SELECT uuid, organization, title, department
FROM received_cards
WHERE user_email = ?
  AND deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
  AND auto_tagged_at IS NULL
```

**效能影響**:
- 減少不必要的 Gemini API 呼叫
- 節省 API 費用

#### C. Embedding 同步 (`sync-card-embeddings.ts`)

```sql
-- Line 17
SELECT uuid, full_name, organization, title, department
FROM received_cards
WHERE deleted_at IS NULL
  AND merged_to IS NULL  -- ✅ 新增
  AND (embedding_synced_at IS NULL OR embedding_synced_at < ?)
```

**效能影響**:
- 減少 Vectorize 寫入次數
- 節省 Vectorize 儲存空間

---

### 1.3 清理機制（P2 - 資料庫維護）

#### 新增：清理舊的已合併名片

**文件**: `cleanup-received-cards.ts`

**新增邏輯**:
```typescript
// 刪除 60 天以上的已合併名片
const MERGED_RETENTION_DAYS = 60;
const cutoffTime = Date.now() - (MERGED_RETENTION_DAYS * 24 * 60 * 60 * 1000);

const deleteMerged = await env.DB.prepare(`
  DELETE FROM received_cards
  WHERE merged_to IS NOT NULL
    AND updated_at < ?
`).bind(cutoffTime).run();

console.log(`[Cleanup] Deleted ${deleteMerged.meta.changes} merged cards older than ${MERGED_RETENTION_DAYS} days`);
```

**資料保留策略**:
- 已合併名片保留 60 天（供審計/回滾）
- 60 天後自動刪除（節省儲存空間）
- 最新名片永久保留

---

## 2. 索引分析

### 2.1 現有索引（Migration 0033）

```sql
CREATE INDEX idx_received_cards_merged ON received_cards(merged_to);
```

**效能分析**:
- ✅ 支援 `WHERE merged_to IS NULL` 查詢
- ✅ B-Tree 索引，NULL 值可索引
- ✅ 查詢計畫會使用此索引

**驗證方法**:
```sql
EXPLAIN QUERY PLAN
SELECT * FROM received_cards
WHERE user_email = ? 
  AND deleted_at IS NULL
  AND merged_to IS NULL;

-- 預期結果:
-- SEARCH TABLE received_cards USING INDEX idx_received_cards_merged (merged_to=?)
```

### 2.2 複合索引優化（選用）

**當前索引**:
- `idx_received_cards_user_email` (user_email)
- `idx_received_cards_deleted` (deleted_at)
- `idx_received_cards_merged` (merged_to)

**優化建議**（P3 - 未來優化）:
```sql
-- 複合索引（覆蓋最常見查詢）
CREATE INDEX idx_received_cards_active ON received_cards(
  user_email, deleted_at, merged_to
) WHERE deleted_at IS NULL AND merged_to IS NULL;
```

**效能提升**:
- 當前: 3 個索引查找
- 優化後: 1 個索引查找
- **預期改善**: 查詢時間減少 20-30%

---

## 3. 資料一致性分析

### 3.1 現有資料狀態

**查詢當前資料分佈**:
```sql
-- 統計已合併名片數量
SELECT 
  COUNT(*) as total_cards,
  SUM(CASE WHEN merged_to IS NULL THEN 1 ELSE 0 END) as active_cards,
  SUM(CASE WHEN merged_to IS NOT NULL THEN 1 ELSE 0 END) as merged_cards
FROM received_cards
WHERE deleted_at IS NULL;
```

**預期結果**（Staging）:
- total_cards: 28
- active_cards: 28（假設尚未執行去重）
- merged_cards: 0

### 3.2 向後相容性

**場景 1: 現有名片**
- 所有現有名片 `merged_to = NULL`
- 新增 `AND merged_to IS NULL` 條件不影響現有查詢結果
- ✅ 100% 向後相容

**場景 2: 未來去重**
- Cron Job 執行後，部分名片 `merged_to = <uuid>`
- 查詢自動過濾已合併名片
- ✅ 符合預期行為

---

## 4. 錯誤處理策略

### 4.1 使用者友善錯誤訊息

**場景**: 使用者嘗試存取已合併名片

**當前行為**:
```json
{
  "error": "NOT_FOUND",
  "message": "Card not found"
}
```

**改善後**:
```json
{
  "error": "CARD_MERGED",
  "message": "This card has been merged to a newer version",
  "merged_to": "xyz-789",
  "redirect_url": "/api/user/received-cards/xyz-789"
}
```

### 4.2 前端處理

**建議前端邏輯**:
```javascript
// 當收到 410 Gone 錯誤
if (response.status === 410 && response.data.merged_to) {
  // 自動跳轉到新名片
  window.location.href = `/cards/${response.data.merged_to}`;
}
```

---

## 5. 測試計畫

### 5.1 單元測試

**測試案例 1: 列表查詢過濾**
```typescript
test('handleListCards filters merged cards', async () => {
  // Setup: 2 cards, 1 merged
  await createCard({ uuid: 'card-old', merged_to: 'card-new' });
  await createCard({ uuid: 'card-new', merged_to: null });
  
  // Execute
  const response = await handleListCards(request, env);
  const cards = await response.json();
  
  // Assert
  expect(cards.length).toBe(1);
  expect(cards[0].uuid).toBe('card-new');
});
```

**測試案例 2: 搜尋過濾**
```typescript
test('search filters merged cards', async () => {
  await createCard({ uuid: 'card-old', full_name: '張三', merged_to: 'card-new' });
  await createCard({ uuid: 'card-new', full_name: '張三', merged_to: null });
  
  const response = await handleSearchCards(request, env);
  const results = await response.json();
  
  expect(results.results.length).toBe(1);
  expect(results.results[0].uuid).toBe('card-new');
});
```

### 5.2 整合測試

**測試流程**:
1. 上傳 2 張重複名片（相同 Email）
2. 執行去重 Cron Job
3. 驗證資料庫狀態（1 張 merged_to 不為 NULL）
4. 呼叫列表 API
5. 驗證只回傳 1 張名片

### 5.3 效能測試

**測試場景**:
- 1000 張名片，200 張已合併
- 測量查詢時間（修改前 vs 修改後）
- 驗證索引使用（EXPLAIN QUERY PLAN）

**預期結果**:
- 查詢時間增加 < 5%
- 索引正確使用

---

## 6. 部署檢查清單

### 6.1 部署前

- [ ] 所有單元測試通過
- [ ] 整合測試通過
- [ ] TypeScript 編譯無錯誤
- [ ] 代碼審查完成
- [ ] BDD 規格文檔完成

### 6.2 Staging 部署

- [ ] 部署到 Staging 環境
- [ ] 執行端對端測試
- [ ] 驗證去重功能
- [ ] 檢查查詢效能
- [ ] 驗證錯誤處理

### 6.3 Production 部署

- [ ] Staging 驗證通過
- [ ] 部署到 Production
- [ ] 監控錯誤率（前 1 小時）
- [ ] 監控查詢效能（前 24 小時）
- [ ] 使用者回饋收集

### 6.4 回滾計畫

**觸發條件**:
- 錯誤率增加 > 10%
- 查詢時間增加 > 50%
- 使用者回報重大問題

**回滾步驟**:
1. 回滾到上一版本（Git revert）
2. 重新部署
3. 驗證系統恢復正常
4. 分析問題根因

---

## 7. 監控指標

### 7.1 功能指標

| 指標 | 當前 | 目標 | 監控方式 |
|------|------|------|---------|
| 重複名片顯示率 | 100% | 0% | 使用者回報 |
| 去重成功率 | 0% | 90%+ | Cron Job 日誌 |
| 合併名片存取錯誤 | 0 | < 10/天 | 410 錯誤計數 |

### 7.2 效能指標

| 指標 | 當前 | 目標 | 監控方式 |
|------|------|------|---------|
| 列表查詢時間 | 50ms | < 60ms | Workers Analytics |
| 搜尋查詢時間 | 200ms | < 220ms | Workers Analytics |
| Cron Job 執行時間 | 30s | < 27s | Cron 日誌 |

### 7.3 資料指標

| 指標 | 監控方式 |
|------|---------|
| 已合併名片數量 | 每日統計 |
| 合併準確率 | 人工抽查 |
| 清理名片數量 | Cleanup Cron 日誌 |

---

## 8. 風險緩解

### 8.1 查詢效能風險

**風險**: 新增條件可能影響查詢效能

**緩解措施**:
1. ✅ 索引已存在（Migration 0033）
2. ✅ 效能測試驗證
3. ✅ 複合索引優化（P3）
4. ✅ 監控查詢時間

### 8.2 資料一致性風險

**風險**: 去重邏輯錯誤導致誤合併

**緩解措施**:
1. ✅ 保留 60 天合併歷史（可回滾）
2. ✅ merge_confidence 記錄信心度
3. ✅ merge_reason 記錄合併原因
4. ✅ 人工審查機制（未來）

### 8.3 使用者體驗風險

**風險**: 使用者不理解為何名片「消失」

**緩解措施**:
1. ✅ 友善錯誤訊息（410 Gone）
2. ✅ 提供跳轉連結
3. ✅ 未來：合併歷史顯示
4. ✅ 未來：手動去重功能

---

## 9. 成本效益分析

### 9.1 開發成本

| 階段 | 時間 | 人力 |
|------|------|------|
| Phase 1 (P0) | 2 小時 | 1 人 |
| Phase 2 (P1) | 0.5 小時 | 1 人 |
| Phase 3 (P2) | 0.5 小時 | 1 人 |
| 測試 | 1 小時 | 1 人 |
| **總計** | **4 小時** | **1 人** |

### 9.2 效益

**使用者體驗**:
- ✅ 不再看到重複名片
- ✅ 搜尋結果更準確
- ✅ 去重功能真正生效

**系統效能**:
- ✅ 背景作業減少 10-20% 處理量
- ✅ 節省 Gemini API 費用
- ✅ 節省 Vectorize 儲存空間

**協同價值**:
- ✅ FileSearchStore 知識共享生效
- ✅ 使用者受益於他人上傳的資料
- ✅ 網絡效應啟動

### 9.3 ROI 計算

**假設**:
- 100 個使用者，每人 50 張名片 = 5000 張
- 去重率 15% = 750 張合併
- 每次 API 呼叫節省 10ms

**年度節省**:
- API 呼叫: 750 張 × 100 次/年 = 75,000 次
- 時間節省: 75,000 × 10ms = 750 秒 = 12.5 分鐘
- Gemini API 費用: 750 張 × $0.001 = $0.75

**結論**: 雖然直接成本節省不大，但使用者體驗改善顯著，值得投資。

---

## 10. 結論與建議

### 10.1 立即執行（P0）

✅ **強烈建議立即修復**

**理由**:
1. 去重功能已實作但無效果（浪費開發成本）
2. 使用者體驗差（看到重複名片）
3. FileSearchStore 協同價值無法體現
4. 修復成本低（2 小時）
5. 風險低（純查詢邏輯）

### 10.2 後續優化（P1-P3）

**P1 - 背景作業優化**（0.5 小時）:
- 減少不必要的處理
- 節省 API 費用

**P2 - 清理機制**（0.5 小時）:
- 節省儲存空間
- 維護資料庫健康

**P3 - 使用者功能增強**（未來）:
- 合併歷史顯示
- 手動去重功能
- 複合索引優化

### 10.3 最終建議

**立即開始 Phase 1 (P0) 實施**，預計 2 小時完成，立即改善使用者體驗。

Phase 2-3 可在 Phase 1 驗證成功後進行。
