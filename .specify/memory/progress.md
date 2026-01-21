# DB-Card Project Progress
## Current Phase: SECURITY_FIXES_IN_PROGRESS 🔒
- Status: SRI 實作完成，準備下一個修復
- Commit: 740ccaf
- Version: v4.2.1
- Last Update: 2026-01-21T14:02:00+08:00
- Next Action: 修復第二個嚴重問題（localStorage → HttpOnly cookies）

## 已完成安全修復

### 🔴 Critical Fix 1: Subresource Integrity (SRI) ✅ COMPLETE
- ✅ Three.js: 加入 SRI (cdnjs.com)
- ✅ QRCode.js: 加入 SRI (cdnjs.com)
- ⚠️ Lucide: 無 SRI（unpkg.com 無 CORS 支援）
- ✅ 版本固定：Lucide 0.263.0
- ✅ SRI 覆蓋率：67% (2/3 scripts)
- ✅ 適用性聲明：已建立 SRI-APPLICABILITY-STATEMENT.md
- ✅ Lucide 載入問題：已修復（版本號錯誤）

**Commits**:
- 2bfeecc: 初始 SRI 實作
- eb6045c: 修復 CORS 錯誤（切換到 jsdelivr）
- 46fa2a7: 移除 Lucide SRI（務實方案）
- 9e259ce: 移除 defer 屬性
- e5fe054: 加入 Lucide 等待邏輯
- 740ccaf: 修正版本號 0.263.1 → 0.263.0
- 84615f4: 建立 SRI 適用性聲明

## 待修復問題

### 🔴 Critical Fix 2: User Tokens in localStorage (NEXT)
**優先級**: 🔴 CRITICAL
**工時**: 2 小時
**影響**: 使用者 token 可被 XSS 竊取

**問題**:
- user-portal.html 使用 localStorage 儲存 auth_token
- localStorage 可被 JavaScript 存取（XSS 風險）
- 應使用 HttpOnly cookies（後端已支援）

**需要變更**:
1. **後端** (OAuth handler):
   - 在 OAuth callback 設定 HttpOnly cookie
   - 移除回傳 token 到前端

2. **前端** (user-portal.html):
   - 移除 localStorage.setItem('auth_token')
   - 移除 localStorage.getItem('auth_token')
   - 使用 credentials: 'include' 自動送出 cookie

**檔案**:
- workers/src/handlers/oauth.ts
- workers/public/user-portal.html

### 🟡 High Priority Fixes (After Critical)

#### 3. Add DOMPurify for XSS Protection
- 工時: 2 小時
- 加入 DOMPurify 函式庫
- 消毒所有 innerHTML 呼叫

#### 4. Remove 'unsafe-inline' from CSP
- 工時: 4 小時
- 提取 inline scripts 到外部檔案
- 實作 nonce-based CSP

#### 5. Validate Social Link URLs
- 工時: 1 小時
- 阻擋 javascript: URI
- 驗證 URL 格式

### 🟢 Medium Priority Fixes

#### 6. Update Outdated Dependencies
- 工時: 2 小時
- 更新 Three.js 到最新版
- 替換 QRCode.js 為現代函式庫

## 部門欄位功能（已完成）

### Department Field Bilingual Support (2026-01-21) ✅
- ✅ 新增第二個輸入框（英文部門名稱）
- ✅ 智慧儲存邏輯（兩者都填 → object，單一 → string）
- ✅ 編輯預填處理（string 和 object 兩種格式）
- ✅ 顯示邏輯更新（支援雙語物件和字串）
- ✅ 向下相容（舊資料繼續運作）

### Preview Display Alignment (2026-01-21) ✅
- ✅ 新增 prev-department HTML 元素
- ✅ 新增 ORG_DEPT_MAPPING 常數
- ✅ 更新 updatePreview() 函數
- ✅ 對齊 card-display.html 顯示邏輯

### Department Field RWD Fix (2026-01-21) ✅
- ✅ 修復 Mobile 對齊問題
- ✅ 新增文字截斷
- ✅ 圖示穩定性

### KV Optimization Phase 1 (2026-01-21) ✅
- ✅ 移除 Deduplication Layer
- ✅ 簡化 Rate Limiting 為 Hour-Only
- ✅ KV 用量降至 20%

## 安全評級

**修復前**: 🟡 中等 (0% SRI, tokens in localStorage)
**修復後 (SRI)**: 🟢 良好 (67% SRI)
**目標 (完成所有修復)**: 🟢 高 (9/10)

## 下一步

1. **立即**: 修復 localStorage → HttpOnly cookies (2 小時)
2. **本週**: 加入 DOMPurify (2 小時)
3. **本週**: 驗證社群連結 URL (1 小時)
4. **下週**: 移除 CSP 'unsafe-inline' (4 小時)
5. **下週**: 更新依賴套件 (2 小時)

**總預估工時**: 11 小時
**預計完成**: 2 週內
