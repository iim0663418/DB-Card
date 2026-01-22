# P1 Security Fixes - BDD Specification

## Feature: CSRF Token Protection
防止跨站請求偽造攻擊

### Scenario 1: Generate CSRF token on login
**Given** 用戶成功登入
**When** 設定 session cookie
**Then** 同時生成 CSRF token 並存入 KV

### Scenario 2: Validate CSRF token on POST/PUT/DELETE
**Given** 用戶發送 POST/PUT/DELETE 請求
**When** 請求包含 X-CSRF-Token header
**Then** 驗證 token 是否匹配 session

### Scenario 3: Reject request without CSRF token
**Given** 用戶發送 POST/PUT/DELETE 請求
**When** 請求缺少 X-CSRF-Token header
**Then** 返回 403 Forbidden

### Scenario 4: GET requests bypass CSRF check
**Given** 用戶發送 GET 請求
**When** 請求不包含 CSRF token
**Then** 正常處理（GET 不需要 CSRF token）

---

## Feature: Session Fixation Attack Prevention
防止會話固定攻擊

### Scenario 1: SETUP_TOKEN login generates new session
**Given** 用戶使用 SETUP_TOKEN 登入
**When** 驗證成功
**Then** 生成新的 session token（不使用 SETUP_TOKEN）

### Scenario 2: Old session token invalidated
**Given** 用戶重新登入
**When** 生成新 session token
**Then** 舊 session token 失效

### Scenario 3: Passkey login already secure
**Given** 用戶使用 Passkey 登入
**When** 驗證成功
**Then** 已使用 crypto.randomUUID()（無需修改）

---

## Feature: Concurrent Session Limit
限制同一帳號的並發會話數

### Scenario 1: Track active sessions
**Given** 用戶登入
**When** 創建新 session
**Then** 記錄到 KV: active_sessions:{email}

### Scenario 2: Enforce session limit (3 sessions)
**Given** 用戶已有 3 個活躍會話
**When** 嘗試第 4 次登入
**Then** 刪除最舊的會話，允許新登入

### Scenario 3: Logout removes session
**Given** 用戶登出
**When** 清除 cookie
**Then** 從 active_sessions 列表移除

### Scenario 4: Expired sessions auto-cleanup
**Given** 會話過期（1 小時）
**When** KV TTL 到期
**Then** 自動從列表移除

---

## Implementation Checklist

### CSRF Token
- [x] utils/csrf.ts: generateCsrfToken(), validateCsrfToken()
- [x] middleware/csrf.ts: CSRF 驗證中介層
- [x] handlers/admin/auth.ts: 登入時生成 CSRF token
- [x] handlers/admin/passkey.ts: 登入時生成 CSRF token
- [x] handlers/oauth.ts: OAuth 登入時生成 CSRF token
- [x] index.ts: 整合 CSRF middleware（POST/PUT/DELETE）

### Session Fixation
- [x] handlers/admin/auth.ts: 使用 crypto.randomUUID() 替代 SETUP_TOKEN

### Concurrent Sessions
- [x] utils/session-limit.ts: addSession(), removeSession(), enforceLimit()
- [x] handlers/admin/auth.ts: 登入時檢查並執行限制
- [x] handlers/admin/passkey.ts: 登入時檢查並執行限制
- [x] handlers/admin/auth.ts: 登出時移除會話

### Frontend
- [x] admin-dashboard.html: 取得並發送 CSRF token
- [x] user-portal.html (user-portal-init.js): 取得並發送 CSRF token

---

## Verification Status

✅ All implementations completed
- TypeScript compilation: Pending manual verification with `npx tsc --noEmit`
- All 3 P1 security fixes implemented:
  1. CSRF Token Protection
  2. Session Fixation Attack Prevention
  3. Concurrent Session Limit (max 3 sessions per user)
