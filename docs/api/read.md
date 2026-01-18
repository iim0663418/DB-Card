# Read API

## 端點
`GET /api/read`

## 描述
使用授權會話讀取名片資料

## 請求

### Query Parameters
- `session` (string, required): 由 NFC Tap API 返回的 session token

### 範例
```
GET /api/read?session=a1b2c3d4e5f6...
```

## 回應

### 成功 (200 OK)
```json
{
  "success": true,
  "data": {
    "name": "吳昇帆",
    "name_en": "Sheng-Fan Wu",
    "title": "數位發展部 數位產業署",
    "title_en": "Administration for Digital Industries, Ministry of Digital Affairs",
    "email": "shengfan.wu@moda.gov.tw",
    "phone": "+886-2-2375-7396",
    "mobile": "+886-912-345-678",
    "address": "臺北市中正區延平南路 143 號",
    "address_en": "No. 143, Yanping S. Rd., Zhongzheng Dist., Taipei City",
    "department": "數位產業署",
    "avatar": "https://example.com/avatar.jpg",
    "greetings": ["很高興認識您", "期待未來合作"],
    "social": {
      "linkedin": "https://linkedin.com/in/example",
      "github": "https://github.com/example"
    }
  }
}
```

### 錯誤回應

#### 會話無效 (401 Unauthorized)
```json
{
  "success": false,
  "error": "Invalid or expired session"
}
```

#### 會話已撤銷 (403 Forbidden)
```json
{
  "success": false,
  "error": "Session has been revoked"
}
```

#### 超過讀取次數 (403 Forbidden)
```json
{
  "success": false,
  "error": "Maximum read count exceeded"
}
```

## 行為

### 會話驗證
1. 檢查 session token 是否存在
2. 驗證 TTL 是否過期
3. 檢查是否已撤銷
4. 檢查讀取次數是否超過限制

### 解密流程
1. 從資料庫取得 encrypted_dek 和 ciphertext
2. 使用 KEK 解密 DEK
3. 使用 DEK 解密名片資料
4. 增加 read_count

### 審計日誌
記錄以下資訊：
- 操作: READ_CARD
- card_uuid
- session_token
- IP 地址（匿名化）
- 時間戳記

## 範例

### cURL
```bash
curl "https://your-domain/api/read?session=a1b2c3d4e5f6..."
```

### JavaScript
```javascript
const session = new URLSearchParams(window.location.search).get('session');
const response = await fetch(`/api/read?session=${session}`);
const data = await response.json();
```

## 相關 API
- [NFC Tap API](nfc-tap.md) - 創建授權會話
