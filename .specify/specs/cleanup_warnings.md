# BDD Spec: Clean Up 71 Unused Variables Warnings

## Scenario: Remove Unused Variables
**Given**: 71 個 no-unused-vars warnings
**When**: 清理未使用的變數
**Then**: 
  - Warnings 降至 < 10
  - 保留有意義的函式（可能被 HTML 調用）
  - 不影響現有功能

## 清理策略

### 1. Catch Block 的 error/e 變數 (30+ 處)
**處理方式**: 改為 `_error` 或 `_e`（表示刻意忽略）
- main.js:720, validation.js:37, 67
- received-cards.js:892, 1190, 1316, 1350, 1427, 1609, 1929, 2124
- social-link-validation.js:79, 130
- user-portal-init.js:1175, 1406
- assets.ts:284, auth.ts:237, cards.ts:292, 562
- monitoring.ts:249, 282, security.ts:215, 514, 613
- analytics.ts:46, 69, consent.ts:204, csp-report.ts:68
- user/cards.ts:123, 304, 705, history.ts:99
- received-cards/enrich.ts:121, ocr.ts:127, unified-extract.ts:161, upload.ts:98
- middleware/auth.ts:119, csrf.ts:89, utils/csrf.ts:64
- social-link-validation.ts:75

### 2. 未使用的函式 (需保留，可能被 HTML 調用)
**處理方式**: 加入 `// eslint-disable-next-line no-unused-vars` 註解
- user-portal-init.js:733 - `closeWebViewWarning`
- user-portal-init.js:740 - `copyCurrentURL`
- user-portal-init.js:778 - `handleGoogleLogin`
- received-cards.js:1948 - `showReceivedCards`
- received-cards.js:1952 - `backToSelection`

### 3. 未使用的函式 (可移除)
**處理方式**: 直接刪除
- main.js:730 - `startTypewriter`
- social-link-integration.js:60 - `validateAllSocialLinksBeforeSubmit`
- user-portal-init.js:1836 - `formatDuration`

### 4. 未使用的變數 (可移除)
**處理方式**: 移除賦值或整行
- received-cards.js:1477, 1478 - `personalContainer`, `personalText`
- received-cards.js:2185 - `total`
- user-portal-init.js:594 - `currentRevokeType`
- user-portal-init.js:1323 - `typeText`
- user-portal-init.js:1515 - `avatar`
- user-portal-init.js:1879 - `reason`
- user-portal-init.js:2026 - `response`

### 5. 未使用的 Import/Type (可移除)
**處理方式**: 移除 import 語句
- assets.ts:7 - `generateR2Key`
- assets.ts:261 - `getCardType`
- auth.ts:5 - `jsonResponse`
- cards.ts:4 - `CardData`
- consent.ts:13 - `DATA_RETENTION_DAYS`
- read.ts:5 - `Card`
- read.ts:85 - `getCorsHeaders`
- tap.ts:5 - `Card`
- user/cards.ts:717 - `anyBinding`
- list-shared.ts:12 - `user`
- vcard.ts:65 - `sanitizeFilename`
- index.ts:37 - `errorResponse`
- index.ts:715 - `ctx` (scheduled handler)
- revocation-rate-limit.ts:5 - `Env`
- twin-status.ts:14 - `TwinStatusRecord`

## Technical Requirements

1. **Catch Block 變數**: 
   - 改為 `_error` 或 `_e` 前綴
   - 表示刻意忽略錯誤（已有其他錯誤處理）

2. **HTML 調用的函式**:
   - 保留函式定義
   - 加入 eslint-disable 註解並說明原因

3. **未使用的函式/變數**:
   - 確認無引用後直接移除
   - 保持代碼簡潔

4. **Import/Type**:
   - 移除未使用的 import
   - 移除未使用的 type 定義

## Acceptance Criteria
- ✅ Warnings 從 71 降至 < 10
- ✅ 所有現有功能正常運作
- ✅ TypeScript 編譯無錯誤
- ✅ 保留必要的函式（HTML 調用）
