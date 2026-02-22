# BDD Spec: Batch Upload API

## Feature: 批次上傳 API - 讓使用者能一次上傳多張名片

### Background
當前問題：
- 只能單張上傳
- 展會收到大量名片時效率低

目標：
- 支援批次上傳（最多 20 張）
- 批次進度查詢
- 非阻塞處理

---

## Scenario 1: 批次上傳 API

### Given: 使用者選擇多張名片圖片
### When: POST /api/user/received-cards/batch-upload
### Then: 回傳 batch_id 和上傳結果

**Request**：
```
POST /api/user/received-cards/batch-upload
Content-Type: multipart/form-data
Authorization: OAuth (Cookie)
X-CSRF-Token: {token}

Body:
  images: File[] (最多 20 張)
```

**Response (Success)**：
```json
{
  "batch_id": "uuid",
  "total": 20,
  "uploads": [
    { "upload_id": "uuid", "filename": "card1.jpg", "status": "uploaded" }
  ]
}
```

**Response (Error)**：
- 400: Too many files (> 20)
- 413: File too large (> 10MB)
- 500: Server error

---

## Scenario 2: 批次進度查詢 API

### Given: 批次上傳已開始
### When: GET /api/user/received-cards/batch/:batch_id
### Then: 回傳批次進度

**Request**：
```
GET /api/user/received-cards/batch/{batch_id}
Authorization: OAuth (Cookie)
```

**Response**：
```json
{
  "batch_id": "uuid",
  "total": 20,
  "completed": 15,
  "failed": 2,
  "processing": 3,
  "results": [
    {
      "upload_id": "uuid",
      "filename": "card1.jpg",
      "status": "completed",
      "card": { /* ReceivedCard */ }
    },
    {
      "upload_id": "uuid",
      "filename": "card2.jpg",
      "status": "failed",
      "error": "OCR failed"
    }
  ]
}
```

---

## Scenario 3: 檔案數量限制

### Given: 使用者選擇超過 20 張圖片
### When: 上傳批次
### Then: 回傳 400 錯誤

**驗證**：
```typescript
if (files.length > 20) {
  return errorResponse('TOO_MANY_FILES', 'Maximum 20 files allowed', 400);
}
```

---

## Scenario 4: 檔案大小限制

### Given: 單張圖片超過 10MB
### When: 上傳批次
### Then: 回傳 413 錯誤

**驗證**：
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
for (const file of files) {
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('FILE_TOO_LARGE', `File ${file.name} exceeds 10MB limit`, 413);
  }
}
```

---

## Scenario 5: 批次 ID 生成

### Given: 批次上傳請求
### When: 創建批次
### Then: 生成唯一的 batch_id

**實作**：
```typescript
const batch_id = crypto.randomUUID();
```

---

## Scenario 6: 上傳到 R2

### Given: 批次上傳的圖片
### When: 儲存到 R2
### Then: 使用統一的路徑格式

**路徑格式**：
```
uploads/{user_email}/{upload_id}
```

**實作**：
```typescript
for (const file of files) {
  const upload_id = crypto.randomUUID();
  const key = `uploads/${user.email}/${upload_id}`;
  await env.R2_BUCKET.put(key, file);
}
```

---

## Scenario 7: 記錄到資料庫

### Given: 圖片已上傳到 R2
### When: 記錄到 temp_uploads
### Then: 包含 batch_id 和 filename

**SQL**：
```sql
INSERT INTO temp_uploads 
  (upload_id, user_email, image_url, batch_id, filename, ocr_status, consumed, expires_at, created_at)
VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
```

---

## Scenario 8: 批次進度計算

### Given: 批次上傳記錄
### When: 查詢進度
### Then: 計算 completed, failed, processing

**邏輯**：
```typescript
const completed = results.filter(r => r.consumed === 1).length;
const failed = results.filter(r => r.ocr_status === 'failed').length;
const processing = total - completed - failed;
```

---

## Scenario 9: 租戶隔離

### Given: 使用者 A 查詢批次進度
### When: 嘗試存取使用者 B 的 batch_id
### Then: 回傳 404

**驗證**：
```sql
SELECT * FROM temp_uploads 
WHERE batch_id = ? AND user_email = ?
```

---

## Scenario 10: 過期時間設定

### Given: 批次上傳
### When: 設定過期時間
### Then: 24 小時後過期

**實作**：
```typescript
const now = Date.now();
const expiresAt = now + (24 * 60 * 60 * 1000); // 24 小時
```

---

## Acceptance Criteria

### API 實作
- [ ] `handleBatchUpload()` 已實作
- [ ] `handleBatchProgress()` 已實作
- [ ] 路由已註冊
- [ ] 檔案數量限制（20 張）
- [ ] 檔案大小限制（10MB）
- [ ] 租戶隔離驗證

### 資料庫
- [ ] batch_id 欄位已使用（Migration 0026 已新增）
- [ ] filename 欄位已使用
- [ ] ocr_status 欄位已使用

### 測試
- [ ] TypeScript 編譯通過
- [ ] 批次上傳測試通過
- [ ] 批次進度查詢測試通過

---

## Implementation Details

### 檔案位置
- **新增**：`workers/src/handlers/user/received-cards/batch.ts`
- **修改**：`workers/src/index.ts`（路由註冊）

### API 端點
```typescript
POST /api/user/received-cards/batch-upload
GET /api/user/received-cards/batch/:batch_id
```

### handleBatchUpload 實作
```typescript
export async function handleBatchUpload(request: Request, env: Env): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  const formData = await request.formData();
  const files = formData.getAll('images') as File[];
  
  // 驗證數量
  if (files.length > 20) {
    return errorResponse('TOO_MANY_FILES', 'Maximum 20 files allowed', 400);
  }
  
  // 驗證單檔大小（10MB）
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('FILE_TOO_LARGE', `File ${file.name} exceeds 10MB limit`, 413);
    }
  }
  
  const batch_id = crypto.randomUUID();
  const uploads = [];
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000);
  
  // 逐一上傳到 R2
  for (const file of files) {
    const upload_id = crypto.randomUUID();
    const key = `uploads/${user.email}/${upload_id}`;
    
    await env.R2_BUCKET.put(key, file);
    
    // 記錄到資料庫
    await env.DB.prepare(`
      INSERT INTO temp_uploads 
        (upload_id, user_email, image_url, batch_id, filename, ocr_status, consumed, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `).bind(upload_id, user.email, key, batch_id, file.name, expiresAt, now).run();
    
    uploads.push({
      upload_id,
      filename: file.name,
      status: 'uploaded'
    });
  }
  
  return jsonResponse({
    batch_id,
    total: files.length,
    uploads
  });
}
```

### handleBatchProgress 實作
```typescript
export async function handleBatchProgress(request: Request, env: Env, batch_id: string): Promise<Response> {
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;

  // 查詢批次進度（租戶隔離）
  const results = await env.DB.prepare(`
    SELECT 
      tu.upload_id,
      tu.filename,
      tu.ocr_status,
      tu.ocr_error,
      tu.consumed
    FROM temp_uploads tu
    WHERE tu.batch_id = ? AND tu.user_email = ?
    ORDER BY tu.created_at
  `).bind(batch_id, user.email).all();
  
  const total = results.results.length;
  const completed = results.results.filter(r => r.consumed === 1).length;
  const failed = results.results.filter(r => r.ocr_status === 'failed').length;
  const processing = total - completed - failed;
  
  return jsonResponse({
    batch_id,
    total,
    completed,
    failed,
    processing,
    results: results.results.map(r => ({
      upload_id: r.upload_id,
      filename: r.filename,
      status: r.consumed === 1 ? 'completed' : (r.ocr_status === 'failed' ? 'failed' : 'processing'),
      error: r.ocr_error
    }))
  });
}
```

---

## Non-Goals (本階段不做)

- ❌ 前端 UI（Week 2）
- ❌ 批次 OCR 處理（使用現有單張邏輯）
- ❌ WebSocket 即時進度（Phase 2）

---

## Technical Notes

1. **非阻塞處理**：
   - 上傳完成後立即回傳
   - OCR 處理由前端輪詢

2. **錯誤處理**：
   - 單張失敗不影響其他
   - 記錄錯誤到 ocr_error 欄位

3. **效能考量**：
   - 20 張圖片約 200MB
   - R2 上傳並發處理
   - 資料庫批次插入

4. **過期清理**：
   - 使用現有 Cron Job
   - 24 小時後自動清理

---

## Estimated Time: 3 hours

- API 實作：2 小時
- 測試與驗證：1 小時
