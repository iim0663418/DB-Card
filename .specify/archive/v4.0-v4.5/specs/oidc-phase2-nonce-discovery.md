# OIDC Phase 2: Nonce & Discovery Endpoint

## 目標
實作 Nonce 防重放攻擊與 Discovery Endpoint 動態配置

## 優先級
**P1 - 安全強化**

---

## Feature 1: Nonce (Anti-Replay Protection)

### Scenario 1: 生成並儲存 nonce
- **Given**: 使用者點擊 Google 登入按鈕
- **When**: 前端呼叫 `/api/oauth/init`
- **Then**: 
  - ✅ 生成隨機 nonce (crypto.randomUUID)
  - ✅ 儲存到 KV: `oauth_nonce:{nonce}` -> timestamp
  - ✅ TTL = 600 秒 (10 分鐘)
  - ✅ 回傳 state 和 nonce 給前端

### Scenario 2: 驗證有效的 nonce
- **Given**: ID Token 包含 nonce claim
- **When**: 驗證 ID Token
- **Then**: 
  - ✅ 從 KV 讀取 `oauth_nonce:{nonce}`
  - ✅ 比對 ID Token 的 nonce 與儲存的 nonce
  - ✅ 驗證成功後刪除 nonce (一次性使用)
  - ✅ 繼續正常登入流程

### Scenario 3: 拒絕無效的 nonce
- **Given**: ID Token 的 nonce 不在 KV 中
- **When**: 驗證 ID Token
- **Then**: 
  - ❌ 拋出錯誤 'Invalid nonce'
  - ❌ 拒絕登入

### Scenario 4: 拒絕缺少的 nonce
- **Given**: ID Token 不包含 nonce claim
- **When**: 驗證 ID Token
- **Then**: 
  - ⚠️ 記錄警告 (向後相容)
  - ✅ 繼續驗證 (不強制要求 nonce)

### Scenario 5: 過期的 nonce 自動清理
- **Given**: Nonce 儲存超過 10 分鐘
- **When**: KV TTL 過期
- **Then**: 
  - ✅ Nonce 自動從 KV 刪除
  - ❌ 後續使用該 nonce 會被拒絕

---

## Feature 2: Discovery Endpoint

### Scenario 6: 取得 Google OIDC Discovery 配置
- **Given**: 系統啟動或快取過期
- **When**: 呼叫 `https://accounts.google.com/.well-known/openid-configuration`
- **Then**: 
  - ✅ 取得 discovery 配置
  - ✅ 提取 authorization_endpoint
  - ✅ 提取 token_endpoint
  - ✅ 提取 jwks_uri
  - ✅ 提取 userinfo_endpoint
  - ✅ 快取到 KV，TTL = 86400 秒 (24 小時)

### Scenario 7: 使用快取的 Discovery 配置
- **Given**: KV 中存在有效的 discovery 配置
- **When**: 需要 OIDC 端點
- **Then**: 
  - ✅ 從 KV 讀取配置
  - ✅ 不呼叫 Google API
  - ✅ 回傳端點 URL

### Scenario 8: Discovery 快取過期後自動更新
- **Given**: KV 中的 discovery 配置已過期
- **When**: 需要 OIDC 端點
- **Then**: 
  - ✅ 重新從 Google 取得配置
  - ✅ 更新 KV 快取
  - ✅ 回傳端點 URL

### Scenario 9: Discovery 取得失敗的降級處理
- **Given**: Google Discovery endpoint 無法連線
- **When**: 需要 OIDC 端點
- **Then**: 
  - ✅ 使用舊的快取配置 (如果存在)
  - ⚠️ 記錄錯誤日誌
  - ❌ 如果無快取，使用硬編碼端點 (最後手段)

---

## Implementation Requirements

### 新增檔案
1. `workers/src/utils/oauth-nonce.ts` - Nonce 管理工具
2. `workers/src/utils/oidc-discovery.ts` - Discovery 配置管理

### 修改檔案
1. `workers/src/handlers/oauth-init.ts` - 新增 nonce 生成
2. `workers/src/utils/oidc-validator.ts` - 新增 nonce 驗證
3. `workers/src/handlers/oauth.ts` - 使用 Discovery 端點
4. `workers/public/js/user-portal-init.js` - 前端傳遞 nonce

---

## 實作細節

### Nonce 儲存格式
```typescript
// KV Key: oauth_nonce:{nonce}
// KV Value: timestamp (string)
// TTL: 600 seconds
```

### Discovery 配置結構
```typescript
interface OIDCDiscoveryConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint: string;
  // ... 其他欄位
}
```

### Discovery 快取策略
- **Key**: `oidc_discovery:google`
- **TTL**: 86400 秒 (24 小時)
- **格式**: JSON string

---

## 前端整合

### OAuth Init Flow
```javascript
// 1. 呼叫 /api/oauth/init 取得 state 和 nonce
const { state, nonce } = await fetch('/api/oauth/init').then(r => r.json());

// 2. 儲存 nonce 到 sessionStorage
sessionStorage.setItem('oauth_nonce', nonce);

// 3. 在 OAuth URL 中加入 nonce
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('nonce', nonce);
authUrl.searchParams.set('state', state);
```

---

## 測試清單

### Nonce 測試
- [ ] 生成並儲存 nonce
- [ ] 驗證有效的 nonce
- [ ] 拒絕無效的 nonce
- [ ] 拒絕缺少的 nonce (向後相容)
- [ ] 過期 nonce 自動清理

### Discovery 測試
- [ ] 取得 Discovery 配置
- [ ] 使用快取配置
- [ ] 快取過期自動更新
- [ ] 降級到硬編碼端點

---

## 成功標準

1. ✅ 所有 9 個 BDD scenarios 通過
2. ✅ TypeScript 編譯無錯誤
3. ✅ 整合測試通過
4. ✅ 向後相容 (nonce 為可選)
5. ✅ Discovery 正常運作

---

## 預估工期
**6 小時** (4 小時 Nonce + 2 小時 Discovery)

---

## 參考資料
- [OpenID Connect Core 1.0 - Nonce](https://openid.net/specs/openid-connect-core-1_0.html#NonceNotes)
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [Google OIDC Discovery](https://accounts.google.com/.well-known/openid-configuration)
