# BDD Spec: Fix Final 12 ESLint Errors

## Scenario 1: Fix showToast Redeclaration
**Given**: social-link-validation.js:5 定義了 showToast，但 globals 也有
**When**: ESLint 掃描代碼
**Then**: 從 globals 移除 showToast（保留函式定義）

## Scenario 2: Fix Script URL (3 處)
**Given**: 以下檔案使用 `javascript:void(0)`
**When**: ESLint 掃描代碼
**Then**: 替換為 `#` 或使用 event.preventDefault()
  - public/js/social-link-validation.js:27, 98
  - src/utils/social-link-validation.ts:26

## Scenario 3: Fix icons.js Missing Globals
**Given**: src/icons.js 使用 document, console, window 但未定義
**When**: ESLint 掃描代碼
**Then**: 這是 browser-side script，應該已有 globals，檢查配置

## Scenario 4: Fix Regex Escape in index.ts
**Given**: src/index.ts:410, 415 有不必要的 `\/` 轉義
**When**: ESLint 掃描代碼
**Then**: 移除反斜線

## Scenario 5: Fix Control Character in vcard.ts
**Given**: src/handlers/user/received-cards/vcard.ts:66 regex 包含控制字元
**When**: ESLint 掃描代碼
**Then**: 使用 eslint-disable-next-line 或重寫 regex

## Scenario 6: Fix ESLint Env Comment
**Given**: received-cards.js:4 使用舊的 /* eslint-env */ 語法
**When**: ESLint 掃描代碼
**Then**: 移除此註解（globals 已在配置中定義）

## Acceptance Criteria
- ✅ `npm run lint` 顯示 0 errors
- ✅ Warnings < 75
- ✅ 所有功能正常運作
