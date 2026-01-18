# NFC Tap API

## 端點
`POST /api/nfc/tap`

## 描述
NFC 卡片觸碰時創建授權會話 (ReadSession)

## 請求

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "card_uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4"
}
```

### 參數
- `card_uuid` (string, required): 名片 UUID

## 回應

### 成功 (200 OK)
```json
{
  "success": true,
  "data": {
    "session": "a1b2c3d4e5f6...",
    "expires_at": "2026-01-19T10:30:00.000Z",
    "card_type": "personal"
  }
}
```

### 錯誤回應

#### 名片不存在 (404 Not Found)
```json
{
  "success": false,
  "error": "Card not found"
}
```

#### 名片已刪除 (410 Gone)
```json
{
  "success": false,
  "error": "Card has been deleted"
}
```

#### 請求過於頻繁 (429 Too Many Requests)
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

## 行為

### 會話創建
- 生成 32 bytes 隨機 session token
- 根據 card_type 設定 TTL 和 max_reads
- 記錄審計日誌

### 自動撤銷
如果符合以下條件，自動撤銷上一個會話：
- 距離上次 tap 不超過 10 分鐘
- 上一個會話讀取次數不超過 2 次

### 速率限制
- 每個 card_uuid: 10 次/分鐘
- 每個 IP: 100 次/分鐘

## 範例

### cURL
```bash
curl -X POST https://your-domain/api/nfc/tap \
  -H "Content-Type: application/json" \
  -d '{"card_uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4"}'
```

### JavaScript
```javascript
const response = await fetch('/api/nfc/tap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ card_uuid: '4b3fe124-4dea-4be4-bfad-638c7e6400a4' })
});
const data = await response.json();
```

## 相關 API
- [Read API](read.md) - 使用 session 讀取名片資料
