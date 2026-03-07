# BDD Spec: OWASP ZAP MEDIUM Risk 修復

## Scenario 1: 移除 CSP style-src unsafe-inline

### Given
- 當前 CSP: `style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com`
- 已有 nonce 機制（用於 script-src）

### When
- 實作 style nonce 支援

### Then
1. CSP header 改為: `style-src 'self' 'nonce-${nonce}' fonts.googleapis.com cdn.tailwindcss.com`
2. 所有 inline `<style>` 標籤加入 `nonce="${nonce}"` attribute
3. 移除 'unsafe-inline'
4. 所有頁面樣式正常顯示

### Implementation Notes
- 修改檔案: `src/index.ts` (CSP header)
- 檢查檔案: `public/*.html` (inline style tags)
- 最小化原則: 只處理 `<style>` 標籤，不處理 style attributes

---

## Scenario 2: 加入 CSRF Token 到所有表單

### Given
- 已有 CSRF middleware (`src/middleware/csrf.ts`)
- 5 個 HTML 表單缺少 CSRF token:
  1. `admin-dashboard.html` - token-login-form
  2. `admin-dashboard.html` - card-form
  3. `admin-dashboard.html` - block-ip-form
  4. `user-portal.html` - editCardForm
  5. `user-portal.html` - edit-form

### When
- 在所有表單加入 CSRF token hidden input

### Then
1. 每個 `<form>` 內加入: `<input type="hidden" name="csrf_token" id="csrf_token" value="">`
2. 前端 JS 在頁面載入時自動填入 token（從 API 取得）
3. 表單提交時包含 CSRF token
4. ZAP 掃描通過 CSRF 檢查

### Implementation Notes
- 修改檔案: `public/admin-dashboard.html`, `public/user-portal.html`
- 修改檔案: `public/js/admin-dashboard.js`, `public/js/user-portal-init.js`
- 最小化原則: 統一使用 `name="csrf_token"` 和 `id="csrf_token"`

---

## Scenario 3: 收緊 CSP img-src wildcard

### Given
- 當前 CSP: `img-src 'self' data: https:`
- `https:` 允許所有 HTTPS 圖片（過於寬鬆）

### When
- 限制為已知 CDN domains

### Then
1. CSP header 改為: `img-src 'self' data: https://cdn.jsdelivr.net https://static.cloudflareinsights.com`
2. 移除 `https:` wildcard
3. 所有圖片正常載入
4. ZAP 掃描通過 wildcard 檢查

### Implementation Notes
- 修改檔案: `src/index.ts` (CSP header)
- 驗證: 檢查所有頁面圖片是否正常載入

---

## Acceptance Criteria

### 功能測試
- [ ] 所有頁面樣式正常顯示
- [ ] 所有表單可以正常提交
- [ ] 所有圖片正常載入
- [ ] CSRF token 自動填入

### 安全測試
- [ ] CSP header 無 'unsafe-inline'
- [ ] 所有表單有 CSRF token
- [ ] img-src 無 wildcard
- [ ] OWASP ZAP 重新掃描: MEDIUM 4 → 0

### 效能測試
- [ ] 頁面載入時間無明顯增加
- [ ] TypeScript 編譯通過
- [ ] 部署成功

---

## Files to Modify

1. `src/index.ts` - CSP headers (2 處修改)
2. `public/admin-dashboard.html` - 加入 CSRF token (3 個表單)
3. `public/user-portal.html` - 加入 CSRF token (2 個表單)
4. `public/js/admin-dashboard.js` - CSRF token 自動填入
5. `public/js/user-portal-init.js` - CSRF token 自動填入

**預估修改行數**: ~30 行
**預估工時**: 1.5-2 小時
