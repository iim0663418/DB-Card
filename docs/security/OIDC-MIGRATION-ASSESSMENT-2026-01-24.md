# OIDC 遷移成本評估報告
**日期**: 2026-01-24  
**專案**: DB-Card v4.3.2  
**當前狀態**: OAuth 2.0 with Google

---

## 🎯 核心發現：你已經「半隻腳在 OIDC」

### ✅ 已符合 OIDC 的部分

#### 1. Scope 配置 ✅
**檔案**: `workers/public/js/user-portal-init.js:328`

```javascript
const scope = 'openid email profile';
```

**評估**: ✅ **已包含 `openid`**，符合 OIDC 最低要求

---

#### 2. Authorization Code Flow ✅
**檔案**: `workers/src/handlers/oauth.ts:70-79`

```typescript
body: new URLSearchParams({
  code,
  client_id: env.GOOGLE_CLIENT_ID,
  client_secret: env.GOOGLE_CLIENT_SECRET,
  redirect_uri: `${url.origin}/oauth/callback`,
  grant_type: 'authorization_code'
})
```

**評估**: ✅ **使用 Authorization Code Flow**，符合 OIDC 安全最佳實踐

---

#### 3. State Parameter (CSRF Protection) ✅
**檔案**: `workers/src/utils/oauth-state.ts`

```typescript
export function generateOAuthState(): string {
  return crypto.randomUUID();
}
```

**評估**: ✅ **已實作 state parameter**，符合 RFC 6749 Section 10.12

---

#### 4. Google OIDC Certified Provider ✅
**端點**: `https://accounts.google.com`

**評估**: ✅ Google OAuth 2.0 已通過 **OpenID Certified**，天然支援 OIDC

---

## ❌ 缺少的 OIDC 核心要素

### 1. ID Token 驗證 ❌ (核心工程 1)
**當前狀態**: 使用 Access Token 呼叫 UserInfo API

```typescript
// ❌ 當前做法：用 Access Token 取 UserInfo
const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
  headers: { Authorization: `Bearer ${tokens.access_token}` }
});
```

**OIDC 標準做法**:
```typescript
// ✅ 應該做：驗證 ID Token
const idToken = tokens.id_token;
const { payload } = await jwtVerify(idToken, JWKS, {
  issuer: 'https://accounts.google.com',
  audience: env.GOOGLE_CLIENT_ID
});

// 驗證 claims
if (payload.iss !== 'https://accounts.google.com') throw new Error('Invalid issuer');
if (payload.aud !== env.GOOGLE_CLIENT_ID) throw new Error('Invalid audience');
if (payload.exp < Date.now() / 1000) throw new Error('Token expired');
```

**遷移成本**: 🟡 **中等**
- 需要實作 JWKS 公鑰驗證
- 需要快取 JWKS 並處理 key rotation
- 需要驗證 iss/aud/exp/iat/sub

---

### 2. Nonce (重放防護) ❌ (核心工程 2)
**當前狀態**: 無 nonce

**OIDC 標準做法**:
```typescript
// 前端生成 nonce
const nonce = crypto.randomUUID();
sessionStorage.setItem('oauth_nonce', nonce);

// 後端驗證 nonce
const storedNonce = await env.KV.get(`oauth_nonce:${sessionId}`);
if (payload.nonce !== storedNonce) {
  throw new Error('Nonce mismatch');
}
```

**遷移成本**: 🟢 **低**
- 類似現有 state parameter 實作
- 前端生成、後端驗證、一次性使用

---

### 3. Discovery Endpoint ❌ (核心工程 3)
**當前狀態**: 硬編碼端點

```typescript
// ❌ 硬編碼
const tokenEndpoint = 'https://oauth2.googleapis.com/token';
const userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
```

**OIDC 標準做法**:
```typescript
// ✅ 使用 Discovery
const discoveryUrl = 'https://accounts.google.com/.well-known/openid-configuration';
const config = await fetch(discoveryUrl).then(r => r.json());

const tokenEndpoint = config.token_endpoint;
const jwksUri = config.jwks_uri;
const userInfoEndpoint = config.userinfo_endpoint;
```

**遷移成本**: 🟢 **低**
- 一次性工程
- 長期降低維運風險

---

## 📊 遷移成本分級

### 🟢 低成本項目 (1-2 天)

| 項目 | 工作量 | 優先級 |
|------|--------|--------|
| Nonce 實作 | 4 小時 | P1 |
| Discovery 導入 | 2 小時 | P1 |
| Sub 作為主鍵 | 2 小時 | P2 |

### 🟡 中成本項目 (3-5 天)

| 項目 | 工作量 | 優先級 |
|------|--------|--------|
| ID Token 驗證 | 1 天 | P0 |
| JWKS 快取與輪替 | 1 天 | P0 |
| Claims 對應與 Session 管理 | 1 天 | P1 |

### 🔴 高成本項目 (不適用)

| 項目 | 狀態 | 說明 |
|------|------|------|
| 前端庫遷移 | ✅ 不需要 | 已使用標準 OAuth 2.0 流程 |
| Flow 改寫 | ✅ 不需要 | 已使用 Authorization Code Flow |
| Implicit Flow 遷移 | ✅ 不需要 | 未使用 Implicit Flow |

---

## 🎯 遷移檢核清單

| 項目 | 當前狀態 | OIDC 要求 | 成本 |
|------|---------|----------|------|
| ✅ Scope: openid | ✅ 已實作 | ✅ 符合 | - |
| ✅ Authorization Code Flow | ✅ 已實作 | ✅ 符合 | - |
| ✅ State Parameter | ✅ 已實作 | ✅ 符合 | - |
| ❌ ID Token 驗證 | ❌ 缺少 | ⚠️ 必須 | 🟡 中 |
| ❌ JWKS 簽章驗證 | ❌ 缺少 | ⚠️ 必須 | 🟡 中 |
| ❌ Nonce | ❌ 缺少 | ⚠️ 建議 | 🟢 低 |
| ❌ Discovery | ❌ 缺少 | ⚠️ 建議 | 🟢 低 |
| ⚠️ Sub 作為主鍵 | ⚠️ 使用 email | ⚠️ 建議 | 🟢 低 |
| ✅ PKCE | ✅ 不需要 | ⚠️ 建議 | - |

---

## 💰 總成本估算

### 最小可行遷移 (MVP)
**工期**: 2-3 天  
**範圍**: ID Token 驗證 + JWKS

### 完整 OIDC 合規
**工期**: 5-7 天  
**範圍**: MVP + Nonce + Discovery + Sub 主鍵

### 風險評估
- 🟢 **低風險**: 現有流程不需大改
- 🟢 **向後相容**: 可漸進式遷移
- 🟡 **測試成本**: 需要完整的 ID Token 驗證測試

---

## 🚀 建議遷移路徑

### Phase 1: 核心 OIDC (P0) - 3 天
1. ✅ 實作 ID Token 驗證 (iss/aud/exp/iat/sub)
2. ✅ 實作 JWKS 公鑰驗證與快取
3. ✅ 改用 ID Token 作為身份來源

### Phase 2: 安全強化 (P1) - 2 天
4. ✅ 實作 Nonce 防重放
5. ✅ 導入 Discovery Endpoint
6. ✅ 改用 sub 作為使用者主鍵

### Phase 3: 最佳化 (P2) - 1 天
7. ✅ JWKS 快取更新策略
8. ✅ Clock skew 容忍
9. ✅ Token revoke 流程

---

## 📚 實作參考

### Google OIDC Discovery
```
https://accounts.google.com/.well-known/openid-configuration
```

### Google JWKS Endpoint
```
https://www.googleapis.com/oauth2/v3/certs
```

### 推薦函式庫
- ✅ `jose` (已使用) - JWT 驗證與 JWKS
- ✅ Cloudflare Workers KV - JWKS 快取

---

## 🎯 結論

### 當前狀態
您的實作已經 **60% 符合 OIDC**：
- ✅ Scope 包含 openid
- ✅ Authorization Code Flow
- ✅ State Parameter
- ✅ Google OIDC Certified Provider

### 遷移成本
**🟡 中等成本** (5-7 天完整遷移)

### 核心缺口
1. **ID Token 驗證** (最關鍵)
2. **JWKS 公鑰驗證**
3. **Nonce 防重放**

### 建議
✅ **建議遷移**，因為：
1. 成本可控（5-7 天）
2. 安全性大幅提升
3. 符合業界標準
4. Google 官方推薦

---

**評估完成，建議優先實作 Phase 1 (ID Token 驗證)** 🎯
