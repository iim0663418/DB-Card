# Email Allowlist 實際使用分析報告

## 發現：雙重驗證機制（冗餘設計）

### 1. OAuth Callback 階段（硬編碼驗證）
**位置**: `src/handlers/oauth.ts:133-140`

```typescript
// ⚠️ SECURITY: Validate email domain whitelist
const allowedDomains = ['@moda.gov.tw'];
const allowedEmails = ['chingw@acs.gov.tw'];
const isAllowedDomain = allowedDomains.some(domain => userInfo.email?.endsWith(domain)) ||
                       allowedEmails.includes(userInfo.email);

if (!isAllowedDomain) {
  return Response.redirect(`${url.origin}/user-portal.html?login=error&error=unauthorized_domain`, 302);
}
```

**特性**:
- ✅ 在 JWT 生成前就阻擋
- ✅ 硬編碼在代碼中
- ❌ 無法動態調整（需要重新部署）

---

### 2. API 請求階段（資料庫驗證）
**位置**: `src/middleware/oauth.ts:23-31`

```typescript
async function checkEmailDomain(db: D1Database, email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;

  const result = await db.prepare(`
    SELECT domain FROM email_allowlist WHERE domain = ?
  `).bind(domain).first<{ domain: string }>();

  return result !== null;
}
```

**使用位置**:
- `src/middleware/oauth.ts:77-80` (verifyOAuth 函數)
- 被以下 API 調用：
  - `/api/user/cards` (GET/POST/PUT/DELETE)
  - `/api/user/history` (GET)

**特性**:
- ✅ 每次 API 請求都驗證
- ✅ 可動態調整（修改資料庫即可）
- ❌ 額外的資料庫查詢開銷

---

## 結論

### 當前狀態
1. **email_allowlist 有實際作用** ✅
   - 在所有需要認證的 User API 中被使用
   - 提供動態的 email 域名控制

2. **存在冗餘設計** ⚠️
   - OAuth Callback 已經硬編碼驗證 `@moda.gov.tw`
   - 理論上不符合 allowlist 的 email 無法通過 OAuth 階段
   - 但 API 層仍然再次驗證

### 建議

#### 選項 A: 保留雙重驗證（防禦深度）
- 優點: 多層防護，即使 OAuth 邏輯被繞過仍有保護
- 缺點: 性能開銷，維護兩處邏輯

#### 選項 B: 統一使用 email_allowlist
- 移除 `oauth.ts` 中的硬編碼
- 改為查詢 `email_allowlist` 表
- 優點: 單一真相來源，動態調整
- 缺點: 增加 OAuth 流程的資料庫依賴

#### 選項 C: 移除 API 層驗證
- 信任 OAuth 階段的驗證
- 移除 `verifyOAuth` 中的 `checkEmailDomain`
- 優點: 減少資料庫查詢
- 缺點: 降低防禦深度

### 推薦方案
**選項 B** - 統一使用 email_allowlist

理由:
1. 符合 "單一真相來源" 原則
2. 提供動態調整能力（無需重新部署）
3. 保持防禦深度（OAuth + API 雙重驗證）
4. 資料庫查詢可透過 KV 快取優化
