# BDD Spec: Merged Cards Filtering (去重名片過濾)

## 背景 (Background)

**問題**: 去重功能已實作（Cron Job + FileSearchStore），資料庫已正確標記 `merged_to`，但使用者介面仍顯示已合併的舊名片。

**影響**: 
- 使用者看到重複名片
- 去重功能形同虛設
- FileSearchStore 的協同價值無法傳遞給使用者

**根本原因**: 所有 `SELECT FROM received_cards` 查詢缺少 `AND merged_to IS NULL` 條件。

---

## Scenario 1: 列表查詢應過濾已合併名片

**Given**: 
- 使用者 A 有 2 張名片：
  - card-old (張三, ABC 公司, merged_to = card-new)
  - card-new (張三, XYZ 公司, merged_to = NULL)
- Cron Job 已執行去重，標記 card-old.merged_to = card-new

**When**: 使用者 A 呼叫 `GET /api/user/received-cards`

**Then**:
- 回傳 1 張名片（card-new）
- 不回傳 card-old（已合併）
- SQL 包含 `AND merged_to IS NULL`

---

## Scenario 2: 搜尋查詢應過濾已合併名片

**Given**:
- 使用者 A 有 3 張名片：
  - card-1 (李四, DEF 公司, merged_to = NULL)
  - card-2 (王五, GHI 公司, merged_to = card-3)
  - card-3 (王五, JKL 公司, merged_to = NULL)

**When**: 使用者 A 搜尋 "王五"

**Then**:
- 回傳 1 張名片（card-3）
- 不回傳 card-2（已合併）
- Semantic search 和 keyword search 都過濾 merged_to

---

## Scenario 3: 相關聯絡人計數應排除已合併名片

**Given**:
- 使用者 A 有 5 張「ABC 公司」名片：
  - card-A (張三, merged_to = NULL)
  - card-B (李四, merged_to = NULL)
  - card-C (王五, merged_to = card-D) ← 已合併
  - card-D (王五, merged_to = NULL)
  - card-E (趙六, merged_to = NULL)

**When**: 搜尋結果顯示 card-A 的 related_contacts

**Then**:
- related_contacts = 3（李四、王五、趙六）
- 不計入 card-C（已合併）

---

## Scenario 4: 單張名片查詢應拒絕已合併名片

**Given**:
- card-old (uuid = abc-123, merged_to = xyz-789)
- card-new (uuid = xyz-789, merged_to = NULL)

**When**: 使用者嘗試存取 `GET /api/user/received-cards/abc-123/vcard`

**Then**:
- 回傳 404 Not Found
- 錯誤訊息: "Card has been merged to another card"
- 建議: 使用 xyz-789 代替

---

## Scenario 5: 去重 Cron Job 不應處理已合併名片

**Given**:
- card-A (merged_to = NULL)
- card-B (merged_to = card-A) ← 已合併
- card-C (merged_to = NULL)

**When**: Cron Job 執行去重

**Then**:
- 只比較 card-A 和 card-C
- 跳過 card-B（已合併）
- 避免重複處理

---

## Scenario 6: 自動標籤 Cron Job 不應處理已合併名片

**Given**:
- card-A (merged_to = NULL, auto_tagged_at = NULL)
- card-B (merged_to = card-A, auto_tagged_at = NULL) ← 已合併

**When**: Cron Job 執行自動標籤

**Then**:
- 只處理 card-A
- 跳過 card-B（已合併）

---

## Scenario 7: Embedding 同步不應處理已合併名片

**Given**:
- card-A (merged_to = NULL, embedding_synced_at = NULL)
- card-B (merged_to = card-A, embedding_synced_at = NULL) ← 已合併

**When**: Cron Job 同步 Vectorize embeddings

**Then**:
- 只同步 card-A
- 跳過 card-B（已合併）

---

## Scenario 8: 清理 Cron Job 應刪除舊的已合併名片

**Given**:
- card-old (merged_to = card-new, updated_at = 90 天前)
- card-new (merged_to = NULL, updated_at = 今天)

**When**: Cron Job 清理 60 天以上的已合併名片

**Then**:
- 刪除 card-old（已合併 + 超過 60 天）
- 保留 card-new

---

## 實施計畫 (Implementation Plan)

### Phase 1: 使用者可見查詢（P0 - 立即修復）

| 文件 | 函數 | 行數 | 修改 |
|------|------|------|------|
| `crud.ts` | `handleListCards` | 298, 312 | 新增 `AND merged_to IS NULL` |
| `search.ts` | `enrichSearchResult` | 46 | 新增 `AND merged_to IS NULL` |
| `search.ts` | `semanticSearch` | 142 | 新增 `AND merged_to IS NULL` |
| `search.ts` | `keywordSearch` | 240, 272 | 新增 `AND merged_to IS NULL` |
| `vcard.ts` | `handleExportVCard` | 142 | 新增 `AND merged_to IS NULL` + 錯誤訊息 |
| `image.ts` | `handleGetImage` | 31 | 新增 `AND merged_to IS NULL` |
| `thumbnail.ts` | `handleGetThumbnail` | 31 | 新增 `AND merged_to IS NULL` |
| `share.ts` | `handleShareCard` | 29 | 新增 `AND merged_to IS NULL` |
| `unshare.ts` | `handleUnshareCard` | 29 | 新增 `AND merged_to IS NULL` |
| `enrich.ts` | `handleEnrichCard` | 166 | 新增 `AND merged_to IS NULL` |

### Phase 2: 背景作業優化（P1 - 效能改善）

| 文件 | 函數 | 行數 | 修改 |
|------|------|------|------|
| `deduplicate-cards.ts` | `deduplicateCards` | 14, 20 | 新增 `AND merged_to IS NULL` |
| `auto-tag-cards.ts` | `autoTagCards` | 27 | 新增 `AND merged_to IS NULL` |
| `sync-card-embeddings.ts` | `syncCardEmbeddings` | 17 | 新增 `AND merged_to IS NULL` |

### Phase 3: 清理機制（P2 - 資料庫維護）

| 文件 | 函數 | 修改 |
|------|------|------|
| `cleanup-received-cards.ts` | `cleanupReceivedCards` | 新增清理已合併名片邏輯 |

---

## 測試策略 (Testing Strategy)

### 1. 單元測試
- 每個修改的查詢都需要測試 `merged_to IS NULL` 條件
- 驗證已合併名片不出現在結果中

### 2. 整合測試
- 創建測試資料：2 張名片，1 張已合併
- 呼叫所有 API 端點
- 驗證只回傳未合併名片

### 3. 端對端測試
- 模擬完整去重流程：
  1. 上傳 2 張重複名片
  2. 執行 Cron Job 去重
  3. 驗證使用者只看到 1 張名片

---

## 風險評估 (Risk Assessment)

### 高風險
- ❌ **無** - 這是純粹的過濾邏輯，不影響資料寫入

### 中風險
- ⚠️ **效能影響** - 新增 `merged_to IS NULL` 條件可能影響查詢效能
  - **緩解**: 已有索引 `idx_received_cards_merged`（Migration 0033）

### 低風險
- ✅ **向後相容** - 現有名片 `merged_to = NULL`，不受影響
- ✅ **資料完整性** - 不修改資料，只修改查詢

---

## 驗收標準 (Acceptance Criteria)

### 功能驗收
- [ ] 使用者列表不顯示已合併名片
- [ ] 搜尋結果不包含已合併名片
- [ ] 相關聯絡人計數正確（排除已合併）
- [ ] 單張名片查詢拒絕已合併名片（404）

### 效能驗收
- [ ] 查詢時間增加 < 10%
- [ ] 索引正確使用（EXPLAIN QUERY PLAN）

### 資料驗收
- [ ] 現有名片不受影響
- [ ] 去重功能正常運作
- [ ] 清理機制正確刪除舊名片

---

## 部署計畫 (Deployment Plan)

### 1. Staging 部署
- 部署修改後的代碼
- 執行整合測試
- 驗證去重功能

### 2. Production 部署
- 無需 Migration（欄位已存在）
- 直接部署代碼
- 監控查詢效能

### 3. 回滾計畫
- 若發現問題，回滾到上一版本
- 去重資料不受影響（只是查詢邏輯）

---

## 預期影響 (Expected Impact)

### 使用者體驗
- ✅ 不再看到重複名片
- ✅ 去重功能真正生效
- ✅ FileSearchStore 協同價值可見

### 系統效能
- ⚠️ 查詢增加 1 個條件（已有索引，影響極小）
- ✅ 背景作業減少處理量（跳過已合併名片）

### 資料庫
- ✅ 無需 Migration
- ✅ 索引已存在（Migration 0033）
- ✅ 未來可清理舊的已合併名片

---

## 後續優化 (Future Enhancements)

### 1. 合併提示 (P3)
- 當使用者嘗試存取已合併名片時
- 顯示「此名片已合併至新名片」
- 提供跳轉連結

### 2. 合併歷史 (P3)
- 在名片詳情頁顯示「合併自 X 張舊名片」
- 提供查看合併歷史的功能

### 3. 手動去重 (P4)
- 使用者可手動標記重複名片
- 觸發合併流程

---

## 結論 (Conclusion)

**當前狀態**: 去重功能已實作，但使用者看不到效果。

**修復目標**: 在所有查詢中過濾 `merged_to IS NULL`，讓使用者真正受益於去重功能。

**預期結果**: 使用者體驗大幅改善，FileSearchStore 的協同價值得以體現。

**實施時間**: Phase 1 (P0) 約 2 小時，Phase 2-3 約 1 小時。
