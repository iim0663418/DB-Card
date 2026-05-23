# API 參考

## 公開 API

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/nfc/tap` | NFC 觸碰創建會話 |
| GET | `/api/read` | 讀取名片資料 |
| GET | `/health` | 系統健康檢查 |
| GET | `/api/oauth/config` | OAuth 配置（clientId） |
| GET | `/api/oauth/init` | OAuth 初始化 |
| GET | `/oauth/callback` | OAuth 回調 |

## MCP API (OAuth 2.1 認證)

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/.well-known/oauth-protected-resource` | Resource Metadata (RFC 9728) |
| GET | `/.well-known/oauth-authorization-server` | AS Metadata (RFC 8414) |
| POST | `/mcp/register` | Dynamic Client Registration (RFC 7591) |
| GET | `/mcp/authorize` | 授權端點 → Google OIDC |
| GET | `/mcp/callback` | Google OAuth 回調 |
| POST | `/mcp/token` | Token 端點 |
| POST | `/mcp` | MCP JSON-RPC 2.0 |

## 管理 API (需認證)

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/admin/login` | 登入 |
| POST | `/api/admin/logout` | 登出 |
| GET | `/api/admin/cards` | 列出所有名片 |
| POST | `/api/admin/cards` | 創建名片 |
| PUT | `/api/admin/cards/:uuid` | 更新名片 |
| DELETE | `/api/admin/cards/:uuid` | 刪除名片 |
| POST | `/api/admin/revoke` | 撤銷會話 |
| POST | `/api/admin/kek/rotate` | KEK 輪換 |

## 使用者 API (需 OIDC 認證)

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/user/upload` | 上傳名片圖片 |
| POST | `/api/user/cards/extract-draft` | 自建名片 OCR 草稿 |
| GET | `/api/user/received-cards` | 列出收到的名片 |
| DELETE | `/api/user/received-cards/:id` | 刪除收到的名片 |

## OIDC 認證流程

1. 使用者點擊 Google 登入
2. 前端呼叫 `/api/oauth/init` 取得 state + nonce
3. 重定向到 Google OAuth（含 PKCE code_challenge）
4. Google 回傳 authorization code
5. 後端驗證 state、交換 ID Token
6. 驗證 ID Token (iss/aud/exp/iat/sub/nonce) + JWKS 簽章
7. 設定 HttpOnly Cookie
8. 登入成功

### 安全特性
- State Parameter (CSRF, 600s TTL)
- Nonce (Anti-Replay, 一次性)
- PKCE S256
- ID Token JWKS 驗證
- Clock Skew ±60s
