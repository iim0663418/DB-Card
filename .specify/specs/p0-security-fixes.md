# P0 Security Fixes - BDD Specification

## Feature: Login API Rate Limiting
防止暴力破解 SETUP_TOKEN 和 Passkey 登入

### Scenario 1: Successful login within rate limit
**Given** 用戶在 15 分鐘內嘗試登入少於 5 次
**When** 提交正確的登入憑證
**Then** 登入成功，返回 200

### Scenario 2: Failed login increments counter
**Given** 用戶提交錯誤的登入憑證
**When** 登入失敗
**Then** 失敗計數器 +1，返回 401

### Scenario 3: Rate limit exceeded
**Given** 用戶在 15 分鐘內失敗 5 次
**When** 再次嘗試登入
**Then** 返回 429，錯誤訊息包含 retry_after

### Scenario 4: Rate limit resets after 15 minutes
**Given** 用戶被速率限制
**When** 等待 15 分鐘後
**Then** 可以再次嘗試登入

### Scenario 5: Successful login resets counter
**Given** 用戶有失敗記錄
**When** 登入成功
**Then** 失敗計數器歸零

---

## Feature: Email Format Validation
防止 SQL 注入和特殊字元攻擊

### Scenario 1: Valid email format
**Given** 用戶輸入 "admin@example.com"
**When** 提交登入請求
**Then** 通過驗證，繼續處理

### Scenario 2: Invalid email format - no @
**Given** 用戶輸入 "adminexample.com"
**When** 提交登入請求
**Then** 返回 400，錯誤訊息 "Invalid email format"

### Scenario 3: Invalid email format - special chars
**Given** 用戶輸入 "admin'; DROP TABLE--@example.com"
**When** 提交登入請求
**Then** 返回 400，錯誤訊息 "Invalid email format"

### Scenario 4: Empty email
**Given** 用戶輸入空字串
**When** 提交登入請求
**Then** 返回 400，錯誤訊息 "Email is required"

---

## Feature: Production Console.log Removal
防止敏感資訊洩漏

### Scenario 1: Development environment
**Given** 環境變數 ENVIRONMENT = "development"
**When** 執行 debug logging
**Then** console.log 正常輸出

### Scenario 2: Production environment
**Given** 環境變數 ENVIRONMENT = "production"
**When** 執行 debug logging
**Then** console.log 不輸出（靜默）

### Scenario 3: Error logging always works
**Given** 任何環境
**When** 發生錯誤
**Then** console.error 正常輸出

---

## Implementation Checklist

### Backend
- [ ] utils/rate-limit.ts: checkLoginRateLimit()
- [ ] utils/validation.ts: validateEmail()
- [ ] handlers/admin/auth.ts: 整合速率限制和驗證
- [ ] handlers/admin/passkey.ts: 整合速率限制和驗證

### Frontend
- [ ] admin-dashboard.html: 條件式 console.log
- [ ] user-portal.html: 條件式 console.log
- [ ] card-display.html: 條件式 console.log
- [ ] js/api.js: 條件式 console.log
- [ ] js/main.js: 條件式 console.log

### Testing
- [ ] 測試速率限制（5 次失敗）
- [ ] 測試 Email 驗證（各種格式）
- [ ] 測試生產環境無 console.log
