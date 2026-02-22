# BDD Spec: Web Search Optional (Migration 0026)

## Feature: 讓 Web Search 成為可選增強，不阻塞核心流程

### Background
當前問題：
- Web Search 是必經流程，等待時間長（10-30 秒）
- 使用者無法快速歸檔名片
- 展會現場需要快速處理大量名片

目標：
- 預設流程：上傳 → OCR → 編輯 → 儲存（< 30 秒）
- 進階流程：上傳 → OCR → 補齊名片資訊 → 編輯 → 儲存（< 60 秒）

---

## Scenario 1: 資料庫 Schema 更新

### Given: 現有的 received_cards 和 temp_uploads 表
### When: 執行 Migration 0026
### Then: 
- received_cards 表新增 `ai_status` 欄位（TEXT, DEFAULT 'skipped'）
- temp_uploads 表新增以下欄位：
  * `batch_id` (TEXT) - 批次上傳 ID
  * `filename` (TEXT) - 原始檔名
  * `ocr_status` (TEXT, DEFAULT 'pending') - OCR 狀態
  * `ocr_error` (TEXT) - OCR 錯誤訊息
  * `thumbnail_url` (TEXT) - 縮圖 URL
- 新增索引 `idx_temp_uploads_batch`

**ai_status 可能的值**：
- `skipped`: 使用者跳過 AI
- `pending`: 等待 AI 處理
- `completed`: AI 已完成
- `failed`: AI 失敗

---

## Scenario 2: Migration 檔案內容

### Given: 需要創建 Migration 檔案
### When: 創建 `workers/migrations/0026_web_search_optional.sql`
### Then: 檔案內容應包含：

```sql
-- Migration 0026: Web Search Optional
-- 讓 Web Search 成為可選增強，不阻塞核心流程

-- 1. 新增 ai_status 欄位到 received_cards 表
ALTER TABLE received_cards ADD COLUMN ai_status TEXT DEFAULT 'skipped';

-- 可能的值：
-- 'skipped': 使用者跳過 AI
-- 'pending': 等待 AI 處理
-- 'completed': AI 已完成
-- 'failed': AI 失敗

-- 2. 新增批次上傳相關欄位到 temp_uploads 表
ALTER TABLE temp_uploads ADD COLUMN batch_id TEXT;
ALTER TABLE temp_uploads ADD COLUMN filename TEXT;
ALTER TABLE temp_uploads ADD COLUMN ocr_status TEXT DEFAULT 'pending';
ALTER TABLE temp_uploads ADD COLUMN ocr_error TEXT;
ALTER TABLE temp_uploads ADD COLUMN thumbnail_url TEXT;

-- 3. 新增索引
CREATE INDEX idx_temp_uploads_batch ON temp_uploads(batch_id);

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN ai_status;
-- ALTER TABLE temp_uploads DROP COLUMN batch_id;
-- ALTER TABLE temp_uploads DROP COLUMN filename;
-- ALTER TABLE temp_uploads DROP COLUMN ocr_status;
-- ALTER TABLE temp_uploads DROP COLUMN ocr_error;
-- ALTER TABLE temp_uploads DROP COLUMN thumbnail_url;
-- DROP INDEX idx_temp_uploads_batch;
```

---

## Scenario 3: 驗證 Migration

### Given: Migration 已執行
### When: 查詢資料庫 schema
### Then:
- `received_cards` 表應包含 `ai_status` 欄位
- `temp_uploads` 表應包含 5 個新欄位
- `idx_temp_uploads_batch` 索引應存在

**驗證命令**：
```bash
# 檢查 received_cards 欄位
wrangler d1 execute DB --remote --command="PRAGMA table_info(received_cards)" | grep ai_status

# 檢查 temp_uploads 欄位
wrangler d1 execute DB --remote --command="PRAGMA table_info(temp_uploads)" | grep batch_id

# 檢查索引
wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_master WHERE type='index' AND name='idx_temp_uploads_batch'"
```

---

## Scenario 4: 統計 AI 使用率

### Given: 有多張名片，部分跳過 AI，部分使用 AI
### When: 執行統計查詢
### Then: 應回傳各狀態的數量與百分比

**查詢**：
```sql
SELECT 
  ai_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM received_cards), 2) as percentage
FROM received_cards
GROUP BY ai_status;
```

**預期結果**：
```
ai_status | count | percentage
----------|-------|------------
skipped   | 45    | 75.00
completed | 15    | 25.00
```

---

## Acceptance Criteria

- [ ] Migration 檔案已創建：`workers/migrations/0026_web_search_optional.sql`
- [ ] Migration 可在本地執行：`wrangler d1 execute DB --local --file=./migrations/0026_web_search_optional.sql`
- [ ] Migration 可在 Staging 執行：`wrangler d1 execute DB --remote --file=./migrations/0026_web_search_optional.sql`
- [ ] 所有欄位已新增
- [ ] 索引已創建
- [ ] 統計查詢可正常執行
- [ ] TypeScript 編譯通過（無型別錯誤）

---

## Non-Goals (本階段不做)

- ❌ 前端 UI 修改（Week 1 Day 7）
- ❌ API 邏輯修改（Week 1 Day 7）
- ❌ 測試案例（Week 2）

---

## Technical Notes

1. **SQLite 限制**：
   - ALTER TABLE 只能 ADD COLUMN，不能 MODIFY COLUMN
   - 若需修改欄位，需要重建表

2. **預設值**：
   - `ai_status` 預設 'skipped'（符合新設計：預設不使用 AI）
   - `ocr_status` 預設 'pending'（等待 OCR 處理）

3. **索引策略**：
   - `batch_id` 需要索引（批次查詢）
   - 其他欄位暫不需要索引

4. **向後相容**：
   - 既有名片的 `ai_status` 會是 'skipped'（符合預期）
   - 既有 temp_uploads 的新欄位會是 NULL（可接受）

---

## Estimated Time: 30 minutes

- Migration 檔案撰寫：10 分鐘
- 本地測試：5 分鐘
- Staging 部署：5 分鐘
- 驗證：10 分鐘
