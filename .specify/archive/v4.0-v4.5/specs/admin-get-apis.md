# BDD Spec: Admin GET APIs

## Scenario 1: GET /api/admin/cards - 列出所有名片

### Given: 系統中存在多張名片
### When: Admin 發送 GET /api/admin/cards 請求
### Then: 回傳所有名片列表

**Request:**
```
GET /api/admin/cards
Authorization: Bearer {SETUP_TOKEN}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "card_type": "personal",
        "status": "active",
        "data": {
          "name": { "zh": "王小明", "en": "John Smith" },
          "title": { "zh": "部長", "en": "Minister" },
          "email": "john@example.com",
          "phone": "(02) 2700-0000",
          "department": "數位策略司",
          "mobile": "0912-345-678",
          "avatar_url": "https://...",
          "greetings": { "zh": "你好", "en": "Hello" },
          "address": { "zh": "...", "en": "..." },
          "socialLinks": { ... }
        },
        "created_at": "2026-01-18T10:00:00Z",
        "updated_at": "2026-01-18T10:00:00Z"
      }
    ],
    "total": 100
  }
}
```

**Error Cases:**
- 401: 未授權（無 token 或 token 無效）

---

## Scenario 2: GET /api/admin/cards/:uuid - 取得單一名片

### Given: 系統中存在指定 UUID 的名片
### When: Admin 發送 GET /api/admin/cards/:uuid 請求
### Then: 回傳該名片的完整資料

**Request:**
```
GET /api/admin/cards/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {SETUP_TOKEN}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "card_type": "personal",
    "status": "active",
    "data": {
      "name": { "zh": "王小明", "en": "John Smith" },
      "title": { "zh": "部長", "en": "Minister" },
      "email": "john@example.com",
      "phone": "(02) 2700-0000",
      "department": "數位策略司",
      "mobile": "0912-345-678",
      "avatar_url": "https://...",
      "greetings": { "zh": "你好", "en": "Hello" },
      "address": { "zh": "...", "en": "..." },
      "socialLinks": {
        "email": "mailto:john@example.com",
        "socialNote": "FB: @username\nIG: @username"
      }
    },
    "created_at": "2026-01-18T10:00:00Z",
    "updated_at": "2026-01-18T10:00:00Z"
  }
}
```

**Error Cases:**
- 401: 未授權
- 404: 名片不存在
- 404: 名片已刪除（status = 'deleted'）

---

## Implementation Requirements

### 1. Handler 位置
- 檔案: `workers/src/handlers/admin/cards.ts`
- 新增函數: `handleListCards()`, `handleGetCard()`

### 2. 路由註冊
- 檔案: `workers/src/index.ts`
- 新增路由:
  ```typescript
  if (url.pathname === '/api/admin/cards' && request.method === 'GET') {
    return handleListCards(request, env);
  }
  
  const getCardMatch = url.pathname.match(/^\/api\/admin\/cards\/([a-f0-9-]{36})$/);
  if (getCardMatch && request.method === 'GET') {
    const uuid = getCardMatch[1];
    return handleGetCard(request, env, uuid);
  }
  ```

### 3. 授權驗證
- 使用現有的 `verifyAuth()` middleware
- 兩個端點都需要 SETUP_TOKEN 驗證

### 4. 資料庫查詢
- 列表: `SELECT * FROM cards WHERE status != 'deleted' ORDER BY created_at DESC`
- 單一: `SELECT * FROM cards WHERE uuid = ? AND status != 'deleted'`

### 5. 資料解密
- 使用現有的 `unwrapAndDecrypt()` 函數
- 解密 `encrypted_data` 欄位

### 6. 回傳格式
- 使用現有的 `successResponse()` 函數
- 包含完整的 CardData 結構

### 7. 錯誤處理
- 使用現有的 `errorResponse()` 函數
- 處理 not_found, unauthorized, database_error

---

## Testing Checklist

### GET /api/admin/cards
- [ ] 無 token 回傳 401
- [ ] 錯誤 token 回傳 401
- [ ] 正確 token 回傳名片列表
- [ ] 不包含已刪除的名片
- [ ] 回傳正確的 total 數量
- [ ] 資料正確解密

### GET /api/admin/cards/:uuid
- [ ] 無 token 回傳 401
- [ ] 錯誤 token 回傳 401
- [ ] 不存在的 UUID 回傳 404
- [ ] 已刪除的名片回傳 404
- [ ] 正確 UUID 回傳完整資料
- [ ] 資料正確解密
- [ ] 包含所有欄位（name, title, email, phone, etc.）

---

## Code Structure

```typescript
// workers/src/handlers/admin/cards.ts

/**
 * GET /api/admin/cards - List all cards
 */
export async function handleListCards(request: Request, env: Env): Promise<Response> {
  // 1. Verify auth
  // 2. Query database (exclude deleted)
  // 3. Decrypt each card data
  // 4. Return success response
}

/**
 * GET /api/admin/cards/:uuid - Get single card
 */
export async function handleGetCard(request: Request, env: Env, uuid: string): Promise<Response> {
  // 1. Verify auth
  // 2. Query database by uuid (exclude deleted)
  // 3. Check if card exists
  // 4. Decrypt card data
  // 5. Return success response
}
```

---

## Notes
- 保持與現有 API 的一致性（使用相同的 response 格式）
- 使用現有的 crypto 和 auth 工具函數
- 不需要實作分頁（Phase 2 可選功能）
- 不需要實作搜尋（Phase 2 可選功能）
- 專注於最小可行實作
