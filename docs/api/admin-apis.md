# Admin APIs

管理後台 API，需要 SETUP_TOKEN 認證

## 認證

### 登入
`POST /api/admin/login`

#### 請求
```json
{
  "token": "your-setup-token"
}
```

#### 回應
```json
{
  "success": true,
  "message": "Login successful"
}
```

設定 HttpOnly Cookie: `admin_token`

### 登出
`POST /api/admin/logout`

清除 HttpOnly Cookie

---

## 名片管理

### 列出所有名片
`GET /api/admin/cards`

#### 回應
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4",
        "card_type": "personal",
        "status": "active",
        "data": { "name": "吳昇帆", ... },
        "created_at": "2026-01-18T10:00:00.000Z",
        "updated_at": "2026-01-18T10:00:00.000Z"
      }
    ],
    "total": 42
  }
}
```

### 取得單一名片
`GET /api/admin/cards/:uuid`

#### 回應
```json
{
  "success": true,
  "data": {
    "uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4",
    "card_type": "personal",
    "status": "active",
    "data": { "name": "吳昇帆", ... },
    "created_at": "2026-01-18T10:00:00.000Z",
    "updated_at": "2026-01-18T10:00:00.000Z"
  }
}
```

### 創建名片
`POST /api/admin/cards`

#### 請求
```json
{
  "card_type": "personal",
  "data": {
    "name": "吳昇帆",
    "name_en": "Sheng-Fan Wu",
    "title": "數位發展部 數位產業署",
    "email": "shengfan.wu@moda.gov.tw",
    "phone": "+886-2-2375-7396",
    "address": "臺北市中正區延平南路 143 號"
  }
}
```

#### 回應
```json
{
  "success": true,
  "data": {
    "uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4",
    "card_url": "https://your-domain/card-display.html?card=4b3fe124-4dea-4be4-bfad-638c7e6400a4"
  }
}
```

### 更新名片
`PUT /api/admin/cards/:uuid`

#### 請求
```json
{
  "data": {
    "phone": "+886-2-2375-7777"
  }
}
```

#### 回應
```json
{
  "success": true,
  "message": "Card updated successfully"
}
```

### 刪除名片
`DELETE /api/admin/cards/:uuid`

軟刪除，設定 `deleted_at` 時間戳記

#### 回應
```json
{
  "success": true,
  "message": "Card deleted successfully"
}
```

---

## 撤銷機制

### 撤銷單一名片會話
`POST /api/admin/revoke`

#### 請求
```json
{
  "card_uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4"
}
```

#### 回應
```json
{
  "success": true,
  "data": {
    "revoked_sessions": 3
  }
}
```

### 全域撤銷
`POST /api/admin/revoke`

#### 請求
```json
{
  "global": true
}
```

#### 回應
```json
{
  "success": true,
  "data": {
    "revoked_sessions": 156,
    "new_token_version": 2
  }
}
```

---

## KEK 管理

### KEK 輪換
`POST /api/admin/kek/rotate`

#### 請求
```json
{
  "new_kek": "0123456789abcdef..."
}
```

#### 回應
```json
{
  "success": true,
  "data": {
    "old_version": 1,
    "new_version": 2,
    "rewrapped_cards": 42
  }
}
```

---

## 錯誤回應

### 未認證 (401 Unauthorized)
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 權限不足 (403 Forbidden)
```json
{
  "success": false,
  "error": "Invalid token"
}
```

### 資源不存在 (404 Not Found)
```json
{
  "success": false,
  "error": "Card not found"
}
```

## 認證方式

支援兩種認證方式（向下相容）：

### 1. HttpOnly Cookie（推薦）
```bash
curl -X GET https://your-domain/api/admin/cards \
  --cookie "admin_token=your-token"
```

### 2. Authorization Header
```bash
curl -X GET https://your-domain/api/admin/cards \
  -H "Authorization: Bearer your-token"
```
