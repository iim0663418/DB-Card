# Spec 1.1: MCP OAuth 2.1 Metadata Endpoints

## Context
DB-Card 要暴露收到的名片功能為 MCP (Model Context Protocol) 介面。
MCP spec 2025-06-18 要求 MCP Server 作為 Resource Server 實作 RFC 9728，
並搭配 Authorization Server 實作 RFC 8414。

本 spec 實作兩個 metadata discovery 端點 + 401 WWW-Authenticate 回應模式。

## Impacted Modules
- **New**: `src/handlers/mcp/oauth-metadata.ts`
- **Modified**: `src/index.ts` (新增路由)

## Scenarios

### Scenario 1: Protected Resource Metadata (RFC 9728)
```
Given MCP client 需要發現 DB-Card 的授權需求
When GET /.well-known/oauth-protected-resource
Then 回傳 HTTP 200 with Content-Type: application/json
And body 包含:
  {
    "resource": "{WORKER_URL}",
    "authorization_servers": ["{WORKER_URL}"],
    "scopes_supported": ["received_cards:read", "received_cards:write"],
    "bearer_methods_supported": ["header"]
  }
And Cache-Control: public, max-age=3600
```

### Scenario 2: Authorization Server Metadata (RFC 8414)
```
Given MCP client 需要發現 AS 端點
When GET /.well-known/oauth-authorization-server
Then 回傳 HTTP 200 with Content-Type: application/json
And body 包含:
  {
    "issuer": "{WORKER_URL}",
    "authorization_endpoint": "{WORKER_URL}/mcp/authorize",
    "token_endpoint": "{WORKER_URL}/mcp/token",
    "registration_endpoint": "{WORKER_URL}/mcp/register",
    "scopes_supported": ["received_cards:read", "received_cards:write"],
    "response_types_supported": ["code"],
    "grant_types_supported": ["authorization_code", "refresh_token"],
    "token_endpoint_auth_methods_supported": ["none"],
    "code_challenge_methods_supported": ["S256"],
    "resource_indicators_supported": true
  }
And Cache-Control: public, max-age=3600
```

### Scenario 3: 401 Unauthorized with WWW-Authenticate
```
Given MCP client 對 POST /mcp 發送請求但無 Bearer token
When 請求到達 MCP handler
Then 回傳 HTTP 401
And header WWW-Authenticate: Bearer resource_metadata="{WORKER_URL}/.well-known/oauth-protected-resource"
And body: { "error": "unauthorized" }
```

### Scenario 4: CORS 與安全標頭
```
Given 任何 metadata 端點請求
When 回傳 response
Then 包含 Permissions-Policy header
And 不包含 CSRF 檢查 (metadata 為公開端點)
```

## Validation Target
- `curl` 測試兩個 metadata 端點回傳正確 JSON
- JSON 結構符合 RFC 8414 / RFC 9728 必要欄位
- WORKER_URL 動態替換正確

## Technical Notes
- `WORKER_URL` 從 `env.WORKER_URL` 取得，確保 staging/production 自動適配
- AS 與 Resource Server 同一 Worker，issuer = resource = WORKER_URL
- 未來若分離 AS，只需改 `authorization_servers` 指向
- `token_endpoint_auth_methods_supported: ["none"]` 因為 MCP client 是 public client
- `resource_indicators_supported: true` 表示支援 RFC 8707
