# Spec 1.2: MCP Dynamic Client Registration (RFC 7591)

## Context
MCP clients 需要在首次連線時自動註冊取得 client_id。
RFC 7591 定義了 Dynamic Client Registration 協議。
MCP client 為 public client (無 client_secret)，PKCE 提供安全保障。

## Impacted Modules
- **New**: `src/handlers/mcp/oauth-register.ts`
- **Modified**: `src/index.ts` (新增路由)

## Scenarios

### Scenario 1: 成功註冊
```
Given MCP client 首次連線
When POST /mcp/register
  Content-Type: application/json
  {
    "client_name": "Claude Desktop",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "token_endpoint_auth_method": "none"
  }
Then 回傳 HTTP 201
And body:
  {
    "client_id": "<uuid-v4>",
    "client_name": "Claude Desktop",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "token_endpoint_auth_method": "none"
  }
And client 資料存入 KV key "mcp_client:{client_id}"
```

### Scenario 2: 最小註冊 (只有必要欄位)
```
Given MCP client 只提供 client_name 和 redirect_uris
When POST /mcp/register { "client_name": "My Agent", "redirect_uris": ["http://localhost:8080/cb"] }
Then grant_types 預設為 ["authorization_code", "refresh_token"]
And token_endpoint_auth_method 預設為 "none"
And 回傳 HTTP 201
```

### Scenario 3: 驗證失敗 — 缺少必要欄位
```
Given 請求缺少 client_name 或 redirect_uris
When POST /mcp/register { "client_name": "Test" }
Then 回傳 HTTP 400 { "error": "invalid_client_metadata" }
```

### Scenario 4: 驗證失敗 — redirect_uri 格式
```
Given redirect_uris 包含非 localhost 且非 HTTPS 的 URI
When POST /mcp/register { "client_name": "X", "redirect_uris": ["http://evil.com/cb"] }
Then 回傳 HTTP 400 { "error": "invalid_redirect_uri" }
```

### Scenario 5: 只接受 public client
```
Given token_endpoint_auth_method 不是 "none"
When POST /mcp/register { ..., "token_endpoint_auth_method": "client_secret_basic" }
Then 回傳 HTTP 400 { "error": "invalid_client_metadata" }
```

## Validation Target
- TypeScript 編譯通過
- KV 寫入正確 key 格式

## Technical Notes
- redirect_uris 驗證: localhost (任何 port) 或 HTTPS
- client_id 使用 crypto.randomUUID()
- KV 無 TTL (永久，除非手動清除)
- 不需要 rate limit (Phase 1 簡化)
