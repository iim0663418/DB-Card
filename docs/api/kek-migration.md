# KEK Migration API

## Overview

KEK (Key Encryption Key) migration API 允許管理員安全地輪替加密金鑰，並自動重新加密所有現有名片的 DEK (Data Encryption Key)。

## Endpoint

```
POST /api/admin/kek/rotate
```

## Authentication

需要管理員權限（HttpOnly Cookie 或 Authorization header）

## Use Cases

### Case 1: 標準 KEK 輪替（使用環境變數）

當 KEK 已經在環境變數中配置時，直接調用 API 即可。

**前置條件：**
- `KEK` 環境變數已設定（新 KEK）
- `OLD_KEK` 環境變數已設定（舊 KEK，可選）

**Request:**
```bash
curl -X POST https://your-domain/api/admin/kek/rotate \
  -H "Cookie: admin_token=YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "old_version": 1,
    "new_version": 2,
    "cards_rewrapped": 42,
    "rotated_at": 1768738461021
  }
}
```

### Case 2: 從外部 KEK 遷移（動態傳入舊 KEK）

當需要從外部系統或舊環境遷移時，可以在請求中傳入舊 KEK。

**前置條件：**
- `KEK` 環境變數已設定（新 KEK）
- 舊 KEK 以 base64 格式準備好

**Request:**
```bash
curl -X POST https://your-domain/api/admin/kek/rotate \
  -H "Cookie: admin_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_kek": "Wuw72K0lYclQReZNvCM3x+H7UXyS54LC/65gmTD/aZA="
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "old_version": 2,
    "new_version": 3,
    "cards_rewrapped": 5,
    "rotated_at": 1768738461021
  }
}
```

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| old_kek | string | No | Base64 編碼的舊 KEK，用於解密現有資料 |

## Response

### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "old_version": 1,
    "new_version": 2,
    "cards_rewrapped": 42,
    "rotated_at": 1768738461021
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid KEK Format
```json
{
  "success": false,
  "error": {
    "code": "invalid_kek_format",
    "message": "old_kek 必須是 base64 格式"
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```

#### 500 Internal Server Error - KEK Not Configured
```json
{
  "success": false,
  "error": {
    "code": "kek_not_configured",
    "message": "KEK 未配置"
  }
}
```

## Migration Workflow

### Scenario 1: 定期 KEK 輪替

```bash
# 1. 生成新 KEK (256-bit)
openssl rand -hex 32 | xxd -r -p | base64
# Output: w5uLFAyKMcIlf2/nXKAfLo5ncP7QEwXcd2iLkyroGDg=

# 2. 設定環境變數
echo "w5uLFAyKMcIlf2/nXKAfLo5ncP7QEwXcd2iLkyroGDg=" | \
  wrangler secret put KEK --env production

# 3. 執行輪替
curl -X POST https://your-domain/api/admin/kek/rotate \
  -H "Cookie: admin_token=YOUR_TOKEN"

# 4. 驗證
curl https://your-domain/health | jq '.data.kek_version'
```

### Scenario 2: 從外部系統遷移

```bash
# 1. 準備新 KEK
NEW_KEK=$(openssl rand -hex 32 | xxd -r -p | base64)
echo "New KEK: $NEW_KEK"

# 2. 設定新 KEK 到環境變數
echo "$NEW_KEK" | wrangler secret put KEK --env production

# 3. 執行遷移（傳入舊 KEK）
curl -X POST https://your-domain/api/admin/kek/rotate \
  -H "Cookie: admin_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"old_kek\": \"$OLD_KEK_BASE64\"}"

# 4. 驗證遷移結果
curl https://your-domain/api/admin/cards \
  -H "Cookie: admin_token=YOUR_TOKEN" | jq '.data | length'
```

## Security Considerations

### KEK Format

- **必須使用 base64 編碼**
- 原始 KEK 長度：256 bits (32 bytes)
- Base64 長度：44 characters

### KEK 優先級

API 按以下優先級選擇舊 KEK：

1. Request body 中的 `old_kek` 參數（最高優先級）
2. 環境變數 `OLD_KEK`
3. 環境變數 `KEK`（用於同 KEK 測試）

### Best Practices

1. **定期輪替**：建議每 90 天輪替一次 KEK
2. **審計日誌**：所有 KEK 輪替操作都會記錄到 `audit_logs` 表
3. **備份驗證**：輪替前確保資料庫已備份
4. **測試環境**：先在 staging 環境測試遷移流程
5. **監控告警**：輪替後監控系統健康狀態

### KEK 生成

```bash
# 方法 1: OpenSSL (推薦)
openssl rand -hex 32 | xxd -r -p | base64

# 方法 2: /dev/urandom
head -c 32 /dev/urandom | base64

# 方法 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Troubleshooting

### 問題：cards_rewrapped = 0 但資料庫有名片

**原因：** 舊 KEK 不正確，無法解密現有 DEK

**解決方案：**
1. 確認舊 KEK 格式正確（base64）
2. 檢查 KEK 是否與加密時使用的相同
3. 查看 worker logs 確認錯誤訊息

### 問題：部分名片遷移失敗

**原因：** 某些名片的 DEK 損壞或使用不同版本的 KEK

**解決方案：**
1. API 會繼續處理其他名片（不會全部失敗）
2. 檢查 `audit_logs` 表找出失敗的名片
3. 手動處理失敗的名片或刪除後重建

### 問題：KEK 輪替後無法讀取名片

**原因：** 新 KEK 未正確設定到環境變數

**解決方案：**
```bash
# 驗證 KEK 配置
curl https://your-domain/health | jq '.data.kek'

# 重新設定 KEK
echo "YOUR_NEW_KEK_BASE64" | wrangler secret put KEK --env production
```

## Related APIs

- [Health Check API](./health.md) - 查看 KEK 版本和狀態
- [Admin Cards API](./admin-cards.md) - 管理名片資料
- [Audit Logs](./audit.md) - 查看 KEK 輪替歷史

## Version History

- **v1.0.0** (2026-01-18): 初始版本，支援環境變數 KEK 輪替
- **v1.1.0** (2026-01-18): 新增動態 old_kek 參數，支援外部遷移
