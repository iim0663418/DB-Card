# OIDC Phase 1: ID Token Validation & JWKS

## 目標
將當前的 Access Token + UserInfo API 模式遷移到標準 OIDC ID Token 驗證

## 優先級
**P0 - 核心安全要求**

---

## Feature 1: ID Token 驗證

### Scenario 1: 成功驗證有效的 ID Token
- **Given**: OAuth callback 收到包含 id_token 的 token response
- **When**: 驗證 ID Token
- **Then**: 
  - ✅ 驗證 issuer = 'https://accounts.google.com'
  - ✅ 驗證 audience = GOOGLE_CLIENT_ID
  - ✅ 驗證 exp > 當前時間
  - ✅ 驗證 iat <= 當前時間
  - ✅ 驗證簽章使用 JWKS 公鑰
  - ✅ 提取 sub, email, name, picture claims

### Scenario 2: 拒絕無效的 issuer
- **Given**: ID Token 的 iss 不是 'https://accounts.google.com'
- **When**: 驗證 ID Token
- **Then**: 拋出錯誤 'Invalid issuer'

### Scenario 3: 拒絕無效的 audience
- **Given**: ID Token 的 aud 不是 GOOGLE_CLIENT_ID
- **When**: 驗證 ID Token
- **Then**: 拋出錯誤 'Invalid audience'

### Scenario 4: 拒絕過期的 token
- **Given**: ID Token 的 exp < 當前時間
- **When**: 驗證 ID Token
- **Then**: 拋出錯誤 'Token expired'

### Scenario 5: 拒絕簽章無效的 token
- **Given**: ID Token 的簽章無法用 JWKS 公鑰驗證
- **When**: 驗證 ID Token
- **Then**: 拋出錯誤 'Invalid signature'

---

## Feature 2: JWKS 公鑰管理

### Scenario 6: 從 Google 取得 JWKS
- **Given**: 系統啟動或 JWKS 快取過期
- **When**: 呼叫 https://www.googleapis.com/oauth2/v3/certs
- **Then**: 
  - ✅ 取得 JWKS (JSON Web Key Set)
  - ✅ 快取到 KV，TTL = 3600 秒 (1 小時)
  - ✅ 儲存格式: `jwks:google` -> JSON string

### Scenario 7: 使用快取的 JWKS
- **Given**: KV 中存在有效的 JWKS 快取
- **When**: 驗證 ID Token
- **Then**: 
  - ✅ 從 KV 讀取 JWKS
  - ✅ 不呼叫 Google API
  - ✅ 使用快取的公鑰驗證簽章

### Scenario 8: JWKS 快取過期後自動更新
- **Given**: KV 中的 JWKS 快取已過期
- **When**: 驗證 ID Token
- **Then**: 
  - ✅ 重新從 Google 取得 JWKS
  - ✅ 更新 KV 快取
  - ✅ 使用新的公鑰驗證簽章

### Scenario 9: JWKS 取得失敗的降級處理
- **Given**: Google JWKS endpoint 無法連線
- **When**: 驗證 ID Token
- **Then**: 
  - ✅ 使用舊的快取 JWKS (如果存在)
  - ✅ 記錄錯誤日誌
  - ❌ 如果無快取，拋出錯誤 'JWKS unavailable'

---

## Feature 3: 向後相容遷移

### Scenario 10: 優先使用 ID Token，降級到 UserInfo API
- **Given**: Token response 包含 id_token
- **When**: 處理 OAuth callback
- **Then**: 
  - ✅ 優先驗證 ID Token
  - ✅ 從 ID Token 提取使用者資訊
  - ❌ 不呼叫 UserInfo API

### Scenario 11: ID Token 缺少時降級到 UserInfo API (向後相容)
- **Given**: Token response 不包含 id_token (不應發生，但防禦性編程)
- **When**: 處理 OAuth callback
- **Then**: 
  - ⚠️ 記錄警告日誌
  - ✅ 降級到 Access Token + UserInfo API
  - ✅ 正常完成登入流程

---

## Implementation Requirements

### 新增檔案
1. `workers/src/utils/oidc-validator.ts` - ID Token 驗證工具
2. `workers/src/utils/jwks-manager.ts` - JWKS 快取管理

### 修改檔案
1. `workers/src/handlers/oauth.ts` - 改用 ID Token 驗證

### 依賴函式庫
- ✅ `jose` (已安裝) - JWT 驗證與 JWKS 支援

---

## 實作細節

### ID Token Claims 結構
```typescript
interface GoogleIDTokenPayload {
  iss: string;              // 'https://accounts.google.com'
  aud: string;              // GOOGLE_CLIENT_ID
  sub: string;              // 使用者唯一 ID (未來作為主鍵)
  email: string;            // 使用者 email
  email_verified: boolean;  // Email 是否已驗證
  name: string;             // 使用者姓名
  picture: string;          // 使用者頭像
  iat: number;              // 發行時間 (Unix timestamp)
  exp: number;              // 過期時間 (Unix timestamp)
}
```

### JWKS 快取策略
- **Key**: `jwks:google`
- **TTL**: 3600 秒 (1 小時)
- **格式**: JSON string
- **更新策略**: TTL 過期後自動重新取得

### Clock Skew 容忍
- **容忍範圍**: ±60 秒
- **原因**: 防止伺服器時鐘偏移導致驗證失敗

---

## 測試清單

### 單元測試
- [ ] ID Token 驗證 (iss/aud/exp/iat)
- [ ] JWKS 公鑰驗證
- [ ] JWKS 快取讀取/寫入
- [ ] Clock skew 容忍

### 整合測試
- [ ] 完整 OAuth 流程 (含 ID Token)
- [ ] JWKS 快取過期自動更新
- [ ] 降級到 UserInfo API (向後相容)

### 安全測試
- [ ] 竄改 ID Token 被拒絕
- [ ] 過期 ID Token 被拒絕
- [ ] 錯誤 audience 被拒絕
- [ ] 錯誤 issuer 被拒絕

---

## 成功標準

1. ✅ 所有 11 個 BDD scenarios 通過
2. ✅ TypeScript 編譯無錯誤
3. ✅ 整合測試通過
4. ✅ 安全測試通過
5. ✅ 向後相容 (不破壞現有流程)

---

## 預估工期
**3 天** (1 天實作 + 1 天測試 + 1 天修復)

---

## 參考資料
- [Google OIDC Documentation](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google JWKS Endpoint](https://www.googleapis.com/oauth2/v3/certs)
- [RFC 7519 - JWT](https://datatracker.ietf.org/doc/html/rfc7519)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
