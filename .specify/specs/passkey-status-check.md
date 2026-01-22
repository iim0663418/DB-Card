# Passkey Status Check API

## Scenario 1: 管理員已註冊 Passkey
- **Given**: 管理員已登入且 passkey_enabled = 1
- **When**: GET /api/admin/passkey/status
- **Then**: 回傳 200 { hasPasskey: true }

## Scenario 2: 管理員未註冊 Passkey
- **Given**: 管理員已登入但 passkey_enabled = 0
- **When**: GET /api/admin/passkey/status
- **Then**: 回傳 200 { hasPasskey: false }

## Scenario 3: 未登入
- **Given**: 無有效 session
- **When**: GET /api/admin/passkey/status
- **Then**: 回傳 401 Unauthorized

## Implementation Requirements
1. 新增 `handlePasskeyStatus()` 到 `workers/src/handlers/admin/passkey.ts`
2. 註冊路由 `GET /api/admin/passkey/status` 到 `workers/src/index.ts`
3. 前端移除 localStorage，改用此 API (`workers/public/admin-dashboard.html`)
