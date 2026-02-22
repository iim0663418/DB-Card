# Implementation Plan: AI-First Card Capture
## Version: 1.0 (2026-02-22)
## Strategy: Atomic Incremental Deployment

---

## 總覽

**目標**：實作 User Portal 的 AI-First 名片管理功能  
**規格來源**：
- `.specify/specs/received_cards_ai_first.md` (v3.3 Final)
- `.specify/specs/user_portal_integration.md` (v2.2)

**實作策略**：
- ✅ 原子化部署（每個 Phase 獨立可測試）
- ✅ 漸進式整合（先後端再前端）
- ✅ 快速回滾（每個 Phase 可獨立回滾）

**預估時間**：16 小時  
**回滾時間**：每個 Phase < 5 分鐘

---

## Phase 1: Database Schema (30 分鐘)

### 目標
創建資料庫結構，支援名片儲存與臨時上傳管理。

### 任務清單
- [ ] 創建 `workers/migrations/0024_received_cards.sql`
- [ ] 創建 `workers/migrations/0025_temp_uploads.sql`
- [ ] 本地測試 migration
- [ ] 部署到 Staging

### 驗收標準
```bash
# 驗證 tables 存在
wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('received_cards', 'temp_uploads')"

# 驗證 indexes 存在
wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('received_cards', 'temp_uploads')"
```

### 回滾方案
```bash
# 刪除 tables
wrangler d1 execute DB --remote --command "DROP TABLE IF EXISTS temp_uploads"
wrangler d1 execute DB --remote --command "DROP TABLE IF EXISTS received_cards"
```

---

## Phase 2: R2 Storage Setup (30 分鐘)

### 目標
設定 R2 Bucket 與 Lifecycle Rules，支援圖片上傳與自動清理。

### 任務清單
- [ ] 創建 R2 Bucket（若不存在）
- [ ] 設定 Lifecycle Rules（temp/ 目錄 1 小時過期）
- [ ] 更新 `wrangler.toml` 綁定
- [ ] 測試上傳與讀取

### 驗收標準
```bash
# 驗證 Bucket 存在
wrangler r2 bucket list | grep "received-cards"

# 測試上傳
echo "test" > test.txt
wrangler r2 object put received-cards/temp/test.txt --file=test.txt

# 測試讀取
wrangler r2 object get received-cards/temp/test.txt
```

### 回滾方案
```bash
# 刪除測試檔案
wrangler r2 object delete received-cards/temp/test.txt
```

---

## Phase 3: Backend API - Upload Endpoint (1 小時)

### 目標
實作圖片上傳 API，支援 Base64 編碼與 R2 儲存。

### 任務清單
- [ ] 創建 `workers/src/api/user/received-cards/upload.ts`
- [ ] 實作 Base64 解碼（chunked 8KB）
- [ ] 實作 R2 上傳邏輯
- [ ] 實作 temp_uploads 記錄創建
- [ ] 加入 CSRF 驗證
- [ ] 加入 JWT 驗證
- [ ] 單元測試

### API 規格
```typescript
POST /api/user/received-cards/upload
Content-Type: application/json
X-CSRF-Token: <token>

Request:
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ...",
  "filename": "card.jpg"
}

Response (200):
{
  "upload_id": "upload_abc123",
  "image_url": "https://r2.../temp/abc123.jpg",
  "expires_at": 1708588800000
}
```

### 驗收標準
```bash
# 測試上傳（需先登入取得 JWT）
curl -X POST https://staging.../api/user/received-cards/upload \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -H "Cookie: session=<jwt>" \
  -d '{"image_base64":"data:image/jpeg;base64,/9j/4AAQ...","filename":"test.jpg"}'
```

### 回滾方案
```typescript
// 註解掉路由
// router.post('/api/user/received-cards/upload', handleUpload);
```

---

## Phase 4: Backend API - OCR Endpoint (2 小時)

### 目標
整合 Gemini Vision API，實作 OCR 文字辨識。

### 任務清單
- [ ] 創建 `workers/src/api/user/received-cards/ocr.ts`
- [ ] 實作 Gemini Vision API 呼叫
- [ ] 實作 upload_id 驗證（consumed=0）
- [ ] 實作結構化資料解析（JSON）
- [ ] 加入錯誤處理（API 失敗、解析失敗）
- [ ] 單元測試

### API 規格
```typescript
POST /api/user/received-cards/ocr
Content-Type: application/json

Request:
{
  "upload_id": "upload_abc123"
}

Response (200):
{
  "full_name": "張三",
  "organization": "ABC 公司",
  "title": "技術總監",
  "phone": "+886-2-1234-5678",
  "email": "zhang@abc.com",
  "website": "https://abc.com",
  "address": "台北市信義區...",
  "ocr_raw_text": "原始 OCR 文字..."
}
```

### 驗收標準
```bash
# 測試 OCR（使用 Phase 3 的 upload_id）
curl -X POST https://staging.../api/user/received-cards/ocr \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<jwt>" \
  -d '{"upload_id":"upload_abc123"}'
```

### 回滾方案
```typescript
// 註解掉路由
// router.post('/api/user/received-cards/ocr', handleOCR);
```

---

## Phase 5: Backend API - Enrich Endpoint (2 小時)

### 目標
整合 Gemini Grounding API，實作公司資訊補充。

### 任務清單
- [ ] 創建 `workers/src/api/user/received-cards/enrich.ts`
- [ ] 實作 Gemini Grounding API 呼叫（含 Google Search）
- [ ] 實作 upload_id 驗證
- [ ] 實作結構化資料解析
- [ ] 加入錯誤處理（API 失敗時返回空值）
- [ ] 單元測試

### API 規格
```typescript
POST /api/user/received-cards/enrich
Content-Type: application/json

Request:
{
  "upload_id": "upload_abc123",
  "full_name": "張三",
  "organization": "ABC 公司"
}

Response (200):
{
  "company_summary": "ABC 公司成立於...",
  "personal_summary": "張三擁有 15 年...",
  "sources": [
    {"uri": "https://abc.com", "title": "ABC 公司官網"}
  ]
}
```

### 驗收標準
```bash
# 測試 Enrichment
curl -X POST https://staging.../api/user/received-cards/enrich \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<jwt>" \
  -d '{"upload_id":"upload_abc123","full_name":"張三","organization":"ABC 公司"}'
```

### 回滾方案
```typescript
// 註解掉路由
// router.post('/api/user/received-cards/enrich', handleEnrich);
```

---

## Phase 6: Backend API - CRUD Endpoints (2 小時)

### 目標
實作名片的創建、讀取、更新、刪除功能。

### 任務清單
- [ ] 創建 `workers/src/api/user/received-cards/crud.ts`
- [ ] 實作 POST /api/user/received-cards（儲存名片）
- [ ] 實作 GET /api/user/received-cards（列表）
- [ ] 實作 PUT /api/user/received-cards/:uuid（更新）
- [ ] 實作 DELETE /api/user/received-cards/:uuid（軟刪除）
- [ ] 實作原子性 upload_id 消費邏輯
- [ ] 實作 null safety 檢查
- [ ] 單元測試

### API 規格
```typescript
// 儲存名片
POST /api/user/received-cards
Request: { upload_id, full_name, organization, ... }
Response: { uuid, message: "Card saved successfully" }

// 列表
GET /api/user/received-cards
Response: [{ uuid, full_name, organization, ... }]

// 更新
PUT /api/user/received-cards/:uuid
Request: { full_name, organization, ... }
Response: { message: "Card updated successfully" }

// 刪除
DELETE /api/user/received-cards/:uuid
Response: 204 No Content
```

### 驗收標準
```bash
# 測試完整流程
# 1. 上傳 → 2. OCR → 3. Enrich → 4. 儲存 → 5. 列表 → 6. 更新 → 7. 刪除
```

### 回滾方案
```typescript
// 註解掉所有 CRUD 路由
```

---

## Phase 7: Frontend Integration (4 小時)

### 目標
整合前端 UI，實作完整的使用者流程。

### 任務清單
- [ ] 在 `user-portal.html` 新增 `view-received-cards` section
- [ ] 在 `view-selection` 新增入口按鈕
- [ ] 創建 `workers/public/js/received-cards.js`
- [ ] 實作 `ReceivedCardsAPI` helper
- [ ] 實作 `CardUploadStateMachine`
- [ ] 實作 `ReceivedCards` namespace
- [ ] 實作 Preview Modal
- [ ] 實作 Delete Confirm Modal
- [ ] 實作贊助提示邏輯
- [ ] 加入 32 個 i18n keys
- [ ] 實作無障礙功能（鍵盤操作、ARIA）

### 驗收標準
```bash
# 手動測試完整流程
1. 登入 User Portal
2. 點擊「收到的名片」
3. 拖放上傳名片照片
4. 等待 AI 處理（進度提示）
5. 預覽並編輯資料
6. 儲存名片
7. 查看名片列表
8. 編輯名片
9. 刪除名片（含確認對話框）
10. 第 5 次儲存時看到贊助提示
```

### 回滾方案
```html
<!-- 隱藏入口按鈕 -->
<button id="received-cards-btn" style="display:none">收到的名片</button>

<!-- 隱藏 view -->
<section id="view-received-cards" style="display:none">...</section>
```

---

## Phase 8: Cron Job - Temp File Cleanup (30 分鐘)

### 目標
實作定時清理過期臨時檔案的 Cron Job。

### 任務清單
- [ ] 創建 `workers/src/cron/cleanup-temp-uploads.ts`
- [ ] 實作過期檔案查詢（expires_at < now）
- [ ] 實作 R2 批次刪除
- [ ] 實作 DB 記錄刪除
- [ ] 更新 `wrangler.toml` 加入 Cron Trigger
- [ ] 測試執行

### Cron 配置
```toml
[triggers]
crons = ["0 * * * *"]  # 每小時執行一次
```

### 驗收標準
```bash
# 手動觸發 Cron
wrangler dev --test-scheduled

# 驗證過期檔案已刪除
wrangler d1 execute DB --remote --command "SELECT COUNT(*) FROM temp_uploads WHERE expires_at < $(date +%s)000"
```

### 回滾方案
```toml
# 移除 Cron Trigger
# [triggers]
# crons = ["0 * * * *"]
```

---

## Phase 9: Infrastructure Setup (30 分鐘)

### 目標
設定 Cloudflare Secrets 與環境變數。

### 任務清單
- [ ] 設定 `GEMINI_API_KEY` secret
- [ ] 驗證 R2 Bucket 綁定
- [ ] 驗證 D1 Database 綁定
- [ ] 更新 README.md 文檔

### 驗收標準
```bash
# 驗證 Secrets
wrangler secret list

# 驗證綁定
wrangler dev --remote
```

### 回滾方案
```bash
# 刪除 Secret
wrangler secret delete GEMINI_API_KEY
```

---

## Phase 10: End-to-End Testing (2 小時)

### 目標
完整測試所有功能與錯誤處理。

### 測試清單
- [ ] 正常流程：上傳 → OCR → Enrich → 儲存
- [ ] 跳過 AI：上傳 → OCR → 跳過 → 儲存
- [ ] 手動新增：直接填寫表單 → 儲存
- [ ] 錯誤處理：網路失敗、API 失敗、超時
- [ ] 並發測試：同時上傳多張名片
- [ ] 無障礙測試：鍵盤操作、螢幕閱讀器
- [ ] 效能測試：5MB 圖片上傳
- [ ] 贊助提示：第 5、10、15 次儲存

### 驗收標準
所有測試通過，無 Critical Bug。

---

## Phase 11: Production Deployment (30 分鐘)

### 目標
部署到生產環境。

### 任務清單
- [ ] 執行 Staging 完整測試
- [ ] 執行 Production Migrations
- [ ] 設定 Production Secrets
- [ ] 部署 Worker 到 Production
- [ ] 驗證 Production 健康狀態
- [ ] 更新 CHANGELOG.md

### 驗收標準
```bash
# Production 健康檢查
curl https://db-card.csw30454.workers.dev/health

# 測試完整流程（Production）
```

### 回滾方案
參考 Phase 1-8 的個別回滾方案，依序執行。

---

## 總結

**總預估時間**：16 小時  
**Phase 數量**：11 個  
**回滾時間**：每個 Phase < 5 分鐘  
**部署策略**：Staging → Testing → Production

**下一步**：確認計畫後，開始執行 Phase 1。
