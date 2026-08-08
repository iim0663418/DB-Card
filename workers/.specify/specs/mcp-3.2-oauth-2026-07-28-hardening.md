# Spec 3.2: MCP OAuth 2026-07-28 Security Hardening

## Context
MCP 2026-07-28 spec 對 OAuth 授權做了以下強化：
1. Authorization server SHOULD include `iss` parameter in authorization responses (RFC 9207)
2. Client ID Metadata Documents (CIMD) 取代 Dynamic Client Registration (DCR)
3. DCR 被 deprecated（removal deadline: 2027 夏）
4. `application_type` 在 registration 中變為建議欄位

DB-Card 現有 OAuth 實作：完整 DCR (mcp-1.2) + OAuth 2.1 code flow + PKCE + refresh。
本 spec 實作 RFC 9207 issuer identification 和 CIMD 支援，DCR 保留不動（deprecation window）。

## Impacted Modules
- **Modified**: `src/handlers/mcp/oauth-metadata.ts` (metadata 新增欄位)
- **Modified**: `src/handlers/mcp/oauth-authorize.ts` (authorize response 加 iss)
- **New**: `src/handlers/mcp/oauth-client-metadata.ts` (CIMD resolver)
- **Modified**: `src/handlers/mcp/oauth-register.ts` (接受 application_type)
- **Modified**: `src/index.ts` (路由：可能新增 CIMD 相關)

## Scenarios

### Scenario 1: Authorization Server Metadata 新增欄位
```
Given MCP client 查詢 AS metadata
When GET /.well-known/oauth-authorization-server
Then response body 新增:
  {
    ...existing fields...,
    "authorization_response_iss_parameter_supported": true
  }
And 其餘欄位不變
```

### Scenario 2: Authorization response 含 iss parameter
```
Given user 完成 Google OIDC 登入，callback 觸發 code 產生
When server redirect 回 client 的 redirect_uri
Then redirect URL query params 包含:
  ?code={auth_code}&state={state}&iss={issuer_url}
Where iss = getBaseUrl(request, env) (與 metadata 的 issuer 一致)
```

### Scenario 3: Client ID Metadata Document (CIMD) — 支援預註冊 client
```
Given MCP client 帶有 client_id = "https://claude.ai/.well-known/mcp-client.json"
When client 發起 authorize request with client_id = CIMD URL
Then server fetch CIMD URL 取得 client metadata:
  {
    "client_id": "https://claude.ai/.well-known/mcp-client.json",
    "client_name": "Claude",
    "redirect_uris": ["https://claude.ai/oauth/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "token_endpoint_auth_method": "none"
  }
And 驗證 redirect_uri 在 CIMD 的 redirect_uris 中
And 不需要先呼叫 /mcp/register（bypass DCR）
```

### Scenario 4: CIMD fetch 失敗 — fallback to KV lookup
```
Given client_id 是 URL 格式（https://...）
When server fetch CIMD URL 超時或回傳非 200
Then fallback 查詢 KV key "mcp_client:{client_id}"（可能是之前 DCR 註冊的）
And 如果 KV 也無 → 回傳 400 { "error": "invalid_client" }
```

### Scenario 5: CIMD 安全驗證
```
Given CIMD document fetched successfully
When 驗證 CIMD 內容
Then 檢查:
  - client_id 欄位 == 請求中的 client_id（自我引用一致）
  - redirect_uris 至少包含本次請求的 redirect_uri
  - CIMD URL 必須是 HTTPS
  - Content-Type 必須是 application/json
And 通過驗證後，cache CIMD 到 KV (TTL 1h) 避免重複 fetch
```

### Scenario 6: DCR 新增 application_type 欄位（optional）
```
Given MCP client 註冊時帶 application_type
When POST /mcp/register {
  "client_name": "My Agent",
  "redirect_uris": ["http://localhost:3000/cb"],
  "application_type": "native"
}
Then 接受並存入 KV（不做限制，僅記錄）
And 合法值: "web" | "native"（預設 "web" if omitted）
```

### Scenario 7: Token endpoint resource indicator 驗證
```
Given client 請求 token 時帶 resource parameter
When POST /mcp/token with body:
  grant_type=authorization_code&code=...&resource=https://db-card.sfan-tech.com/mcp
Then 驗證 resource 值與 server 自身 resource URI 一致
And 如果不一致 → 400 { "error": "invalid_target" }
And 如果未帶 resource → 仍接受（向後相容）
```

## Validation Target
- TypeScript 編譯通過
- 既有 OAuth 流程不破壞（DCR client、已註冊 client 正常使用）
- 新增 tests:
  - AS metadata 含 `authorization_response_iss_parameter_supported`
  - Authorize redirect 含 `iss` query param
  - CIMD URL 格式 client_id 能成功 authorize
  - CIMD fetch 失敗時 fallback KV

## Technical Notes
- CIMD fetch 用 `fetch()` with timeout (5s)，cache 用 KV TTL 3600
- client_id 判斷邏輯：
  - 以 `https://` 開頭 → CIMD 模式（fetch metadata document）
  - 否則 → legacy DCR 模式（KV lookup `mcp_client:{id}`）
- CIMD cache KV key: `mcp_cimd:{sha256(client_id)}` TTL 3600s
- iss parameter: 直接用 `getBaseUrl(request, env)` 的值
- resource indicator: `new URL(request.url).origin + '/mcp'` 或 env.WORKER_URL + '/mcp'
- Phase 4 移除 DCR 時需通知 Cursor 團隊（他們是主要 DCR 用戶）
