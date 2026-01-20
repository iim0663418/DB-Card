# NFC Tap API

## 端點
`POST /api/nfc/tap`

## 描述
NFC 卡片觸碰時創建授權會話 (ReadSession)，實作三層防護機制防止濫用

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
- `card_uuid` (string, required): 名片 UUID（必須為有效的 UUID v4 格式）

## 回應

### 成功 (200 OK)

#### 新會話創建
```json
{
  "session_id": "a1b2c3d4e5f6...",
  "expires_at": "2026-01-21T10:30:00.000Z",
  "max_reads": 20,
  "reads_used": 0,
  "revoked_previous": false,
  "reused": false
}
```

#### 去重命中（60秒內重複請求）
```json
{
  "session_id": "a1b2c3d4e5f6...",
  "expires_at": "2026-01-21T10:30:00.000Z",
  "max_reads": 20,
  "reads_used": 3,
  "reused": true
}
```

### 錯誤回應

#### 無效的 UUID 格式 (400 Bad Request)
```json
{
  "error": "invalid_request",
  "message": "無效的 UUID 格式"
}
```

#### 名片不存在 (404 Not Found)
```json
{
  "error": "card_not_found",
  "message": "名片不存在"
}
```

#### 名片已撤銷 (403 Forbidden)
```json
{
  "error": "card_revoked",
  "message": "名片已撤銷"
}
```

#### 速率限制超限 (429 Too Many Requests)
```json
{
  "error": "rate_limited",
  "message": "請求過於頻繁，請稍後再試",
  "retry_after": 37,
  "limit_scope": "card_uuid",
  "window": "minute",
  "limit": 10,
  "current": 11
}
```

**Headers:**
```
Retry-After: 37
```

## 多層防護機制 (v4.1.0)

### Layer 1: 去重機制 (60秒)
- 60 秒內重複請求返回相同 session
- 減少資源消耗，防止誤觸
- 返回 `reused: true` 標記
- **無繞過機制**（包含管理員查看）

### Layer 2: 速率限制
使用 Sliding Window Counter 算法：

**Card UUID 維度:**
- 10 次/分鐘
- 50 次/小時

**IP 維度:**
- 10 次/分鐘
- 50 次/小時

超限時返回 429 錯誤，包含 `retry_after` 秒數。

### Layer 3: 併發讀取限制
依名片類型限制同時讀取數（在 Read API 檢查）：
- personal: 20
- event_booth: 50
- sensitive: 5

## 行為

### 執行順序
1. **Basic Validation**: 檢查 card_uuid 存在性和格式
2. **Dedup Check**: 檢查 60 秒內是否有重複請求
3. **Rate Limit**: 檢查 4 個維度（card minute/hour, IP minute/hour）
4. **Validate Card**: 檢查名片存在性和撤銷狀態
5. **Retap Revocation**: 自動撤銷舊會話（如符合條件）
6. **Create Session**: 創建新會話並存儲去重記錄

### 自動撤銷（Retap Revocation）
如果符合以下條件，自動撤銷上一個會話：
- 距離上次 tap 不超過 10 分鐘
- 上一個會話讀取次數不超過 2 次

### IP 提取優先順序
1. `CF-Connecting-IP` header（Cloudflare 提供）
2. `X-Forwarded-For` header（取第一個 IP）
3. `'unknown'`（無法取得時）

## 範例

### cURL - 首次觸碰
```bash
curl -X POST https://your-domain/api/nfc/tap \
  -H "Content-Type: application/json" \
  -d '{"card_uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4"}'
```

**回應:**
```json
{
  "session_id": "abc123...",
  "expires_at": "2026-01-21T10:30:00.000Z",
  "max_reads": 20,
  "reads_used": 0,
  "reused": false
}
```

### cURL - 60秒內重複觸碰
```bash
# 30 秒後再次觸碰
curl -X POST https://your-domain/api/nfc/tap \
  -H "Content-Type: application/json" \
  -d '{"card_uuid": "4b3fe124-4dea-4be4-bfad-638c7e6400a4"}'
```

**回應:**
```json
{
  "session_id": "abc123...",
  "expires_at": "2026-01-21T10:30:00.000Z",
  "max_reads": 20,
  "reads_used": 5,
  "reused": true
}
```

### JavaScript
```javascript
async function tapCard(cardUuid) {
  try {
    const response = await fetch('/api/nfc/tap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_uuid: cardUuid })
    });
    
    if (response.status === 429) {
      const error = await response.json();
      console.log(`Rate limited. Retry after ${error.retry_after} seconds`);
      return;
    }
    
    const data = await response.json();
    
    if (data.reused) {
      console.log('Reusing existing session (dedup hit)');
    } else {
      console.log('New session created');
    }
    
    return data;
  } catch (error) {
    console.error('Tap failed:', error);
  }
}
```

## 安全考量

### 防爬蟲保護
- 去重機制防止瞬間爆量
- 速率限制防止持續濫用
- 雙維度限制（UUID + IP）難以繞過

### 資源管理
- 60 秒去重減少不必要的 session 創建
- 併發讀取限制防止 token 外洩濫用
- 自動撤銷機制清理舊會話

### 審計追蹤
所有 tap 請求均記錄審計日誌：
- 成功創建會話
- 去重命中
- 速率限制觸發
- 驗證失敗
- IP 地址（匿名化）

## 相關 API
- [Read API](read.md) - 使用 session 讀取名片資料
- [Admin Revoke API](admin-apis.md#revoke) - 管理員撤銷會話
