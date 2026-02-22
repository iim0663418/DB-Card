# API Migration Strategy: Bilingual Card Upload

## 決策：方案 A - 保留舊 API，新增 v2

### 理由
1. 不破壞既有前端和測試
2. 漸進式遷移
3. 向後相容

---

## API 端點對照

### 舊 API（保留）
```
POST /api/user/received-cards/upload
- 單張圖片上傳
- 使用 temp_uploads 流程
- 回傳 upload_id
```

### 新 API（新增）
```
POST /api/user/received-cards/upload-bilingual
- 正反面圖片上傳
- 直接創建 received_cards
- 回傳 card_uuid
```

---

## 新 API 規格

### Request
```
POST /api/user/received-cards/upload-bilingual
Content-Type: multipart/form-data
Authorization: OAuth (Cookie)
X-CSRF-Token: {token}

Body:
  front_image: File (必填, max 10MB, image/jpeg|png|webp)
  back_image: File (可選, max 10MB, image/jpeg|png|webp)
```

### Response (Success)
```json
{
  "card_uuid": "uuid",
  "front_image_url": "uploads/{user_email}/{uuid}-front",
  "back_image_url": "uploads/{user_email}/{uuid}-back",
  "front_thumbnail_url": "thumbnails/{user_email}/{uuid}-front",
  "back_thumbnail_url": "thumbnails/{user_email}/{uuid}-back"
}
```

### Response (Error)
```json
{
  "error": "INVALID_FILE_TYPE",
  "message": "Only JPEG, PNG, WebP images are allowed",
  "code": 400
}
```

---

## 安全驗證

### 檔案驗證
```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 1. MIME 類型檢查
if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  return errorResponse('INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP images are allowed', 400);
}

// 2. 檔案大小檢查
if (file.size > MAX_FILE_SIZE) {
  return errorResponse('FILE_TOO_LARGE', 'File size must be less than 10MB', 413);
}

// 3. 魔術位元檢查（防止偽造 MIME）
const buffer = await file.arrayBuffer();
const header = new Uint8Array(buffer.slice(0, 12));
if (!isValidImageHeader(header)) {
  return errorResponse('INVALID_FILE_FORMAT', 'File is not a valid image', 400);
}

function isValidImageHeader(header: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return true;
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return true;
  
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) return true;
  
  return false;
}
```

### 租戶隔離
```typescript
// 1. OAuth 驗證
const userResult = await verifyOAuth(request, env);
if (userResult instanceof Response) return userResult;
const user = userResult;

// 2. 檔案路徑綁定使用者
const card_uuid = crypto.randomUUID();
const frontKey = `uploads/${user.email}/${card_uuid}-front`;
const backKey = back_image ? `uploads/${user.email}/${card_uuid}-back` : null;

// 3. 資料庫記錄綁定使用者
await env.DB.prepare(`
  INSERT INTO received_cards (card_uuid, user_email, image_url, back_image_url, ...)
  VALUES (?, ?, ?, ?, ...)
`).bind(card_uuid, user.email, frontKey, backKey, ...).run();
```

### URL 安全
```typescript
// 不直接回傳 R2 URL，使用內部 key
// 前端透過 API 存取：GET /api/user/received-cards/:uuid/image
// 後端驗證租戶權限後才回傳圖片
```

---

## 檔案生命週期管理

### 上傳成功
```typescript
// 1. 上傳到 R2
await env.R2_BUCKET.put(frontKey, front_image);
if (back_image) {
  await env.R2_BUCKET.put(backKey, back_image);
}

// 2. 生成縮圖
const frontThumbnail = await generateThumbnail(front_image);
const backThumbnail = back_image ? await generateThumbnail(back_image) : null;

// 3. 上傳縮圖
await env.R2_BUCKET.put(frontThumbnailKey, frontThumbnail);
if (backThumbnail) {
  await env.R2_BUCKET.put(backThumbnailKey, backThumbnail);
}

// 4. 記錄到資料庫（原子性）
await env.DB.prepare(`...`).run();
```

### 上傳失敗（補償流程）
```typescript
try {
  // 上傳流程...
} catch (error) {
  // 清理已上傳的檔案
  await env.R2_BUCKET.delete(frontKey);
  if (backKey) await env.R2_BUCKET.delete(backKey);
  await env.R2_BUCKET.delete(frontThumbnailKey);
  if (backThumbnailKey) await env.R2_BUCKET.delete(backThumbnailKey);
  
  throw error;
}
```

### 刪除名片
```typescript
// 軟刪除：標記 deleted_at
await env.DB.prepare(`
  UPDATE received_cards 
  SET deleted_at = ?
  WHERE card_uuid = ? AND user_email = ?
`).bind(Date.now(), card_uuid, user.email).run();

// 定期清理（Cron Job）
// 刪除 30 天後的檔案
const deletedCards = await env.DB.prepare(`
  SELECT image_url, back_image_url, thumbnail_url, back_thumbnail_url
  FROM received_cards
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < ?
`).bind(Date.now() - 30 * 24 * 60 * 60 * 1000).all();

for (const card of deletedCards.results) {
  await env.R2_BUCKET.delete(card.image_url);
  if (card.back_image_url) await env.R2_BUCKET.delete(card.back_image_url);
  await env.R2_BUCKET.delete(card.thumbnail_url);
  if (card.back_thumbnail_url) await env.R2_BUCKET.delete(card.back_thumbnail_url);
}

// 永久刪除資料庫記錄
await env.DB.prepare(`
  DELETE FROM received_cards
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < ?
`).bind(Date.now() - 30 * 24 * 60 * 60 * 1000).run();
```

### 替換上傳
```typescript
// 1. 查詢舊檔案
const oldCard = await env.DB.prepare(`
  SELECT image_url, back_image_url, thumbnail_url, back_thumbnail_url
  FROM received_cards
  WHERE card_uuid = ? AND user_email = ?
`).bind(card_uuid, user.email).first();

// 2. 上傳新檔案
const newFrontKey = `uploads/${user.email}/${card_uuid}-front-${Date.now()}`;
await env.R2_BUCKET.put(newFrontKey, new_front_image);

// 3. 更新資料庫
await env.DB.prepare(`
  UPDATE received_cards
  SET image_url = ?, updated_at = ?
  WHERE card_uuid = ? AND user_email = ?
`).bind(newFrontKey, Date.now(), card_uuid, user.email).run();

// 4. 刪除舊檔案（非同步）
ctx.waitUntil(env.R2_BUCKET.delete(oldCard.image_url));
```

---

## 遷移清單

### 前端修改
- [ ] 新增「正反面上傳」UI
- [ ] 呼叫新 API `/upload-bilingual`
- [ ] 保留舊上傳流程（向後相容）

### 後端修改
- [ ] 創建 `handlers/user/received-cards/upload-bilingual.ts`
- [ ] 實作檔案驗證（MIME + 魔術位元）
- [ ] 實作補償流程
- [ ] 註冊新路由

### 測試
- [ ] 單元測試：檔案驗證
- [ ] 整合測試：上傳流程
- [ ] 安全測試：租戶隔離
- [ ] 失敗測試：補償流程

---

## 時程
- Migration 0029：30 分鐘
- 後端 API：2 小時
- 前端 UI：2 小時
- 測試：1 小時
- **總計：5.5 小時**
