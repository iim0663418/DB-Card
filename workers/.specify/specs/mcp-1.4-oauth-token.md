# Spec 1.4: MCP Token Endpoint

## Context
MCP client 用 auth code 交換 access_token + refresh_token。
access_token 為 JWT (1h)，refresh_token 為 opaque (KV, 30d, rotated)。

## Impacted Modules
- **New**: `src/handlers/mcp/oauth-token.ts`
- **Modified**: `src/index.ts` (新增路由)
- **Reuse**: `jose` (SignJWT, jwtVerify), `utils/pkce.ts` (generateCodeChallenge for verification)

## Scenarios

### Scenario 1: authorization_code → token
```
Given MCP client 持有有效 auth code
When POST /mcp/token
  Content-Type: application/x-www-form-urlencoded
  grant_type=authorization_code&
  code={mcp_code}&
  redirect_uri={same_as_authorize}&
  client_id={client_id}&
  code_verifier={original_verifier}&
  resource={same_as_authorize}
Then 從 KV 取出並刪除 mcp_auth_code:{code} (一次性)
And 驗證 client_id 匹配
And 驗證 redirect_uri 匹配
And 驗證 resource 匹配
And 驗證 PKCE: SHA256(code_verifier) == stored code_challenge
And 簽發 JWT access_token:
  { sub: email, email, aud: resource, scope, iss: "{WORKER_URL}", exp: +1h }
  Algorithm: HS256, secret: env.JWT_SECRET
And 生成 opaque refresh_token (UUID), 存入 KV "mcp_refresh:{token}" TTL 30d
And 回傳 HTTP 200:
  {
    "access_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "{uuid}",
    "scope": "received_cards:read"
  }
```

### Scenario 2: refresh_token → new token pair
```
Given MCP client 持有有效 refresh_token
When POST /mcp/token
  grant_type=refresh_token&
  refresh_token={token}&
  client_id={client_id}&
  resource={resource}
Then 從 KV 取出並刪除 mcp_refresh:{token} (rotation)
And 驗證 client_id 匹配
And 簽發新 JWT access_token (同 Scenario 1)
And 生成新 opaque refresh_token, 存入 KV TTL 30d
And 回傳新 token pair
```

### Scenario 3: 失敗 — code 不存在或已過期
```
When POST /mcp/token grant_type=authorization_code&code=invalid
Then 回傳 HTTP 400 { "error": "invalid_grant" }
```

### Scenario 4: 失敗 — PKCE 驗證失敗
```
When code_verifier 的 SHA256 不匹配 stored code_challenge
Then 回傳 HTTP 400 { "error": "invalid_grant" }
```

### Scenario 5: 失敗 — 不支援的 grant_type
```
When POST /mcp/token grant_type=client_credentials
Then 回傳 HTTP 400 { "error": "unsupported_grant_type" }
```

### Scenario 6: 失敗 — refresh_token 不存在
```
When POST /mcp/token grant_type=refresh_token&refresh_token=invalid
Then 回傳 HTTP 400 { "error": "invalid_grant" }
```

## Validation Target
- TypeScript 編譯通過
- JWT 結構正確 (iss, aud, sub, scope, exp)

## Technical Notes
- JWT issuer = env.WORKER_URL (與 AS metadata 的 issuer 一致)
- JWT audience = resource parameter (RFC 8707)
- JWT secret = env.JWT_SECRET (與現有 user JWT 共用 secret，但 issuer 不同可區分)
- refresh_token TTL = 30 天 (2592000 秒)
- Content-Type 接受 application/x-www-form-urlencoded (OAuth 標準)
- 也接受 application/json (部分 MCP client 可能用 JSON)
