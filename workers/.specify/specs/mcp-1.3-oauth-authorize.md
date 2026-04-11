# Spec 1.3: MCP Authorization Endpoint + Google OIDC Delegation

## Context
MCP client 透過 OAuth 2.1 authorization_code + PKCE 取得授權。
DB-Card AS 收到 authorize 請求後，委託 Google OIDC 進行使用者認證，
認證完成後生成 MCP auth code 回傳給 MCP client。

## Impacted Modules
- **New**: `src/handlers/mcp/oauth-authorize.ts`
- **Modified**: `src/index.ts` (新增 2 個路由: /mcp/authorize, /mcp/callback)
- **Reuse**: `utils/pkce.ts`, `utils/oauth-state.ts`, `utils/oidc-validator.ts`, `middleware/oauth.ts` (checkEmailAllowed pattern)

## Scenarios

### Scenario 1: 成功發起授權
```
Given 已註冊的 MCP client (client_id 存在於 KV)
When GET /mcp/authorize?
  response_type=code&
  client_id={valid_id}&
  redirect_uri=http://localhost:3000/callback&
  code_challenge={S256_hash}&
  code_challenge_method=S256&
  scope=received_cards:read&
  state={client_state}&
  resource=https://db-card-staging.csw30454.workers.dev
Then 驗證 client_id 存在 (KV lookup mcp_client:{client_id})
And 驗證 redirect_uri 精確匹配 client 註冊的 redirect_uris
And 驗證 code_challenge_method 為 S256
And 儲存 MCP auth session 到 KV key "mcp_auth_state:{google_state}":
  { client_id, redirect_uri, code_challenge, scope, resource, client_state }
And 重導向到 Google OAuth:
  https://accounts.google.com/o/oauth2/v2/auth?
    client_id={GOOGLE_CLIENT_ID}&
    redirect_uri={WORKER_URL}/mcp/callback&
    response_type=code&
    scope=openid email profile&
    state={google_state}&
    code_challenge={google_code_challenge}&
    code_challenge_method=S256&
    nonce={nonce}
```

### Scenario 2: 驗證失敗 — client_id 不存在
```
When GET /mcp/authorize?client_id=nonexistent&...
Then 回傳 HTTP 400 { "error": "invalid_client" }
```

### Scenario 3: 驗證失敗 — redirect_uri 不匹配
```
When GET /mcp/authorize?redirect_uri=http://evil.com/cb&...
Then 回傳 HTTP 400 { "error": "invalid_redirect_uri" }
(不重導向到 redirect_uri，直接回傳錯誤)
```

### Scenario 4: 驗證失敗 — 缺少 PKCE
```
When GET /mcp/authorize 缺少 code_challenge 或 code_challenge_method 不是 S256
Then 回傳 HTTP 400 { "error": "invalid_request", "error_description": "PKCE S256 required" }
```

### Scenario 5: Google 回調成功
```
Given Google 認證完成，回調到 /mcp/callback?code={google_code}&state={google_state}
When GET /mcp/callback
Then 從 KV 取出並消費 mcp_auth_state:{google_state}
And 用 google_code 向 Google 交換 token (重用 oauth.ts 的 token exchange 邏輯)
And 驗證 Google ID Token (重用 oidc-validator.ts)
And 檢查 email allowlist (重用 checkEmailAllowed SQL)
And 生成 MCP auth code (opaque, crypto.randomUUID)
And 存入 KV key "mcp_auth_code:{code}":
  { client_id, email, scope, code_challenge, redirect_uri, resource }
  TTL 600 秒
And 重導向到 MCP client: {redirect_uri}?code={mcp_code}&state={client_state}
```

### Scenario 6: Google 回調失敗
```
Given Google 回傳 error 參數
When GET /mcp/callback?error=access_denied&state={google_state}
Then 從 KV 取出 mcp_auth_state 取得 redirect_uri 和 client_state
And 重導向到 MCP client: {redirect_uri}?error=access_denied&state={client_state}
```

### Scenario 7: Google 回調 — email 不在 allowlist
```
Given Google 認證成功但 email 不在 allowlist
When 驗證 email
Then 重導向到 MCP client: {redirect_uri}?error=access_denied&state={client_state}
```

## Validation Target
- TypeScript 編譯通過
- 授權流程的 KV 讀寫正確

## Technical Notes
- Google OAuth redirect_uri 固定為 {WORKER_URL}/mcp/callback (與現有 /oauth/callback 分開)
- 兩層 state: google_state (DB-Card ↔ Google) 和 client_state (MCP client ↔ DB-Card)
- 兩層 PKCE: google_code_verifier (DB-Card ↔ Google) 和 client code_challenge (MCP client ↔ DB-Card)
- MCP auth code TTL 600s (10 分鐘)
- email allowlist 查詢重用現有 SQL pattern (domain OR individual email)
- Upsert user to users table (重用 oauth.ts 的 pattern)
