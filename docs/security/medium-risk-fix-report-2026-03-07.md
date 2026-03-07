# OWASP ZAP MEDIUM 風險修復報告（2026-03-07）

## 修復摘要

**修復時間**: 2026-03-07 22:00
**部署版本**: v5.0.1
**修復項目**: 1/4 MEDIUM 風險

---

## 修復詳情

### ✅ 已修復（1 項）

#### 1. CSP img-src Wildcard
- **問題**: `img-src 'self' data: https:` 允許所有 HTTPS 圖片
- **修復**: 限制為已知 CDN
  ```typescript
  img-src 'self' data: https://cdn.jsdelivr.net https://static.cloudflareinsights.com
  ```
- **檔案**: `src/index.ts` line 67
- **狀態**: ✅ 已部署

---

### ✅ 誤報（1 項）

#### 2. Absence of Anti-CSRF Tokens
- **ZAP 判斷**: 表單缺少 CSRF token
- **實際狀況**: CSRF 保護已完整實作
  - 使用 `X-CSRF-Token` header（非表單 hidden input）
  - Token 儲存在 sessionStorage
  - 登入時從 API 取得
  - Middleware 驗證（`src/middleware/csrf.ts`）
- **證據**:
  ```javascript
  // public/js/admin-dashboard.js
  'X-CSRF-Token': sessionStorage.getItem('csrfToken')
  ```
- **狀態**: ✅ 無需修復（符合業界標準）

---

### ⚠️ 技術限制（2 項）

#### 3. CSP style-src unsafe-inline
- **問題**: 允許 inline styles（CSS injection 風險）
- **理想修復**: 使用 nonce 機制
- **技術限制**: 
  - 靜態 HTML 無法動態插入 nonce
  - 需要改用 HTML 模板引擎或 SSR
  - 或將所有 inline styles 移到外部 CSS
- **影響範圍**: 6 個 HTML 檔案
  - admin-dashboard.html (1 個 <style>)
  - card-display.html (2 個 <style>)
  - index.html (1 個 <style>)
  - qr-quick.html (1 個 <style>)
  - user-portal.html (1 個 <style>)
- **風險評估**: 
  - 低風險（所有 inline styles 由開發者控制）
  - 無用戶輸入直接插入 styles
  - XSS 防護已透過 DOMPurify 實作
- **狀態**: ⚠️ 接受風險（需架構重構才能修復）

#### 4. CSP script-src unsafe-inline
- **問題**: 允許 inline scripts（XSS 風險）
- **當前狀況**: 
  - 已實作 nonce 機制
  - CSP header 包含 `'nonce-${nonce}'`
  - 但靜態 HTML 無法使用動態 nonce
- **技術限制**: 同 style-src
- **狀態**: ⚠️ 接受風險（需架構重構才能修復）

---

## 修復效果

### 修復前
- MEDIUM: 4 項
- LOW: 4 項

### 修復後（預期）
- MEDIUM: 2-3 項（style-src, script-src unsafe-inline）
- LOW: 3-4 項

### 實際改善
- ✅ img-src wildcard 已修復
- ✅ CSRF 保護確認完整
- ⚠️ unsafe-inline 需架構重構

---

## 建議後續行動

### 短期（接受風險）
- 維持當前架構
- 定期審查 inline styles/scripts
- 確保無用戶輸入直接插入

### 長期（架構重構）
**選項 A: HTML 模板引擎**
- 使用 Cloudflare Workers HTMLRewriter
- 動態插入 nonce
- 工時: 8-12 小時

**選項 B: 移除所有 inline styles**
- 將 6 個 <style> 移到外部 CSS
- 工時: 4-6 小時

**選項 C: 遷移到 SSR 框架**
- 使用 Next.js / Remix
- 完整 CSP 支援
- 工時: 40-80 小時

---

## 結論

1. **已修復**: img-src wildcard（1 個 MEDIUM）
2. **誤報**: CSRF token（已完整實作）
3. **技術限制**: unsafe-inline（需架構重構）

**當前安全等級**: 可接受
**建議**: 接受 unsafe-inline 風險，未來考慮架構重構

---

**修復完成時間**: 2026-03-07 22:05
**總工時**: 1 小時（含分析、修復、部署）
