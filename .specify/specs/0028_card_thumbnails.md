# BDD Spec: Card Thumbnail System (Migration 0028)

## Feature: 名片縮圖系統 - 提升視覺識別度

### Background
當前問題：
- 卡片列表只顯示文字資訊
- 難以快速識別特定名片
- 缺少視覺化預覽

目標：
- 前端生成縮圖（300x200 px, WebP, < 20 KB）
- 後端儲存到 R2
- 卡片列表顯示縮圖

技術限制：
- ⚠️ Cloudflare Workers 不支援 node-canvas
- ✅ 使用瀏覽器 Canvas API 生成縮圖

---

## Scenario 1: 資料庫 Schema 更新

### Given: 現有的 received_cards 表
### When: 執行 Migration 0028
### Then: 
- received_cards 表新增 `thumbnail_url` 欄位（TEXT）
- 新增索引 `idx_received_cards_thumbnail`

---

## Scenario 2: Migration 檔案內容

### Given: 需要創建 Migration 檔案
### When: 創建 `workers/migrations/0028_card_thumbnails.sql`
### Then: 檔案內容應包含：

```sql
-- Migration 0028: Card Thumbnails
-- 名片縮圖系統

-- 新增縮圖欄位到 received_cards 表
ALTER TABLE received_cards ADD COLUMN thumbnail_url TEXT;

-- 新增索引（加速查詢）
CREATE INDEX idx_received_cards_thumbnail ON received_cards(thumbnail_url);

-- 回滾方案（註解）
-- ALTER TABLE received_cards DROP COLUMN thumbnail_url;
-- DROP INDEX idx_received_cards_thumbnail;
```

---

## Scenario 3: 前端縮圖生成

### Given: 使用者選擇了一張名片圖片
### When: 呼叫 `generateThumbnailClient(file)`
### Then:
- 使用 Canvas API 繪製縮圖
- 尺寸：300x200 px（保持比例）
- 格式：WebP
- 品質：80%
- 回傳 Blob 物件

**實作位置**：`workers/public/js/received-cards.js`

**函式簽名**：
```typescript
async function generateThumbnailClient(file: File): Promise<Blob>
```

**邏輯**：
1. 創建 Image 物件
2. 載入圖片
3. 計算縮圖尺寸（保持比例）
4. 創建 Canvas
5. 繪製縮圖
6. 轉換為 WebP Blob

---

## Scenario 4: 後端接收縮圖

### Given: 前端上傳原圖與縮圖
### When: POST /api/user/received-cards/upload
### Then:
- 接收 `image` 和 `thumbnail` 兩個檔案
- 儲存原圖到 R2：`uploads/{user_email}/{upload_id}`
- 儲存縮圖到 R2：`uploads/{user_email}/{upload_id}_thumb`
- 記錄 `thumbnail_url` 到 temp_uploads 表

**實作位置**：`workers/src/api/user/received-cards.ts`

**修改函式**：`handleUpload()`

**邏輯**：
1. 取得 `image` 和 `thumbnail` 檔案
2. 上傳原圖到 R2
3. 若有縮圖，上傳到 R2（加 `_thumb` 後綴）
4. 更新 temp_uploads 表的 `thumbnail_url` 欄位

---

## Scenario 5: 縮圖 API

### Given: 名片已儲存且有縮圖
### When: GET /api/user/received-cards/:uuid/thumbnail
### Then:
- 驗證使用者權限（租戶隔離）
- 從 R2 讀取縮圖
- 回傳 WebP 圖片
- Cache-Control: public, max-age=31536000 (1 年)

**實作位置**：`workers/src/api/user/received-cards.ts`

**新增函式**：`handleGetThumbnail()`

**路由**：
```typescript
if (url.pathname.match(/^\/api\/user\/received-cards\/([^\/]+)\/thumbnail$/)) {
  const uuid = match[1];
  return handleGetThumbnail(request, env, uuid);
}
```

---

## Scenario 6: 儲存名片時複製縮圖

### Given: temp_uploads 有縮圖 URL
### When: 儲存名片到 received_cards
### Then:
- 複製 `thumbnail_url` 到 received_cards 表

**實作位置**：`workers/src/api/user/received-cards.ts`

**修改函式**：`handleSaveCard()`

**邏輯**：
```typescript
// 查詢 temp_uploads
const upload = await env.DB.prepare(`
  SELECT thumbnail_url FROM temp_uploads WHERE upload_id = ?
`).bind(upload_id).first();

// 插入 received_cards
await env.DB.prepare(`
  INSERT INTO received_cards (..., thumbnail_url)
  VALUES (..., ?)
`).bind(..., upload.thumbnail_url).run();
```

---

## Acceptance Criteria

### Migration
- [ ] Migration 檔案已創建：`workers/migrations/0028_card_thumbnails.sql`
- [ ] Migration 可在 Staging 執行
- [ ] `received_cards.thumbnail_url` 欄位已新增
- [ ] `idx_received_cards_thumbnail` 索引已創建

### 前端
- [ ] `generateThumbnailClient()` 函式已實作
- [ ] 上傳時同時生成縮圖
- [ ] 縮圖大小 < 20 KB

### 後端
- [ ] `handleUpload()` 接收並儲存縮圖
- [ ] `handleGetThumbnail()` API 已實作
- [ ] `handleSaveCard()` 複製縮圖 URL
- [ ] 租戶隔離驗證

### 測試
- [ ] TypeScript 編譯通過
- [ ] 本地測試：上傳圖片 → 生成縮圖 → 儲存成功
- [ ] Staging 測試：縮圖 API 回傳 200

---

## Non-Goals (本階段不做)

- ❌ 前端顯示縮圖（Week 2）
- ❌ 既有名片補生成縮圖（Phase 2）
- ❌ Cloudflare Images 整合（Phase 2）

---

## Technical Notes

1. **Canvas API 相容性**：
   - 所有現代瀏覽器支援
   - `canvas.toBlob()` 支援 WebP（Chrome 23+, Firefox 96+）

2. **檔案大小控制**：
   - 300x200 px + 80% 品質 ≈ 10-20 KB
   - 若超過 20 KB，降低品質到 60%

3. **錯誤處理**：
   - 若縮圖生成失敗，仍可儲存名片（thumbnail_url = NULL）
   - 前端顯示預設圖示

4. **效能優化**：
   - 縮圖生成在前端（不佔用 Worker CPU）
   - R2 儲存成本低（$0.015/GB/月）
   - 1 年快取減少重複請求

---

## Estimated Time: 3 hours

- Migration：10 分鐘
- 前端縮圖生成：1 小時
- 後端 API：1.5 小時
- 測試與驗證：30 分鐘
