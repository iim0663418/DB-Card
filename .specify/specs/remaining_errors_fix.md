# BDD Spec: Fix Remaining 43 ESLint Errors

## Scenario 1: Fix Undefined Functions (11 errors)

### 1.1 admin-dashboard.js
**Given**: 以下函式未定義或未宣告為全域
**When**: ESLint 掃描代碼
**Then**: 
  - Line 811: `activeTab` → 移除此行（已在 line 45 被移除，但 line 811 仍在使用）
  - Line 875: `api` → 加入 globals 或改用 `window.api`
  - Line 2937, 3127: `clearPreview` → 加入 globals
  - Line 3128: `uploadAsset` → 加入 globals
  - Line 3143: `viewAsset` → 加入 globals

### 1.2 main.js
**Given**: Line 1190 使用 `QrCreator` 但未定義
**When**: ESLint 掃描代碼
**Then**: 加入 `QrCreator` 到 globals（已有 QRCreator，可能是大小寫問題）

### 1.3 received-cards.js
**Given**: Line 437 使用 `originalText` 但未定義
**When**: ESLint 掃描代碼
**Then**: 檢查上下文，可能需要宣告變數或移除使用

### 1.4 social-link-integration.js
**Given**: Line 24, 78 使用 `getSocialLinkError`，Line 98 使用 `showToast`
**When**: ESLint 掃描代碼
**Then**: 加入這些函式到 globals 或檢查是否應從其他模組匯入

## Scenario 2: Fix Regex Escape Characters (8 errors)

**Given**: 以下檔案有不必要的 regex 轉義字元
**When**: ESLint 掃描 regex 模式
**Then**: 移除不必要的反斜線
  - admin-dashboard.js:1989 - `\/` 和 `\?`
  - main.js:449, 1092 - `\/` 和 `\?`
  - validation.js:67, 81 - `\/`
  - validation.js:95 - `\+`, `\(`, `\)`
  - share.ts:17, unshare.ts:17 - `\/`

## Scenario 3: Fix Duplicate Keys (6 errors)

**Given**: user-portal-init.js:354-359 有重複的 i18n keys
**When**: ESLint 掃描物件字面值
**Then**: 移除或重命名重複的 keys

## Scenario 4: Fix Other Errors (18 errors)

### 4.1 Empty Block Statement
**Given**: received-cards.js:82 有空的 block statement
**When**: ESLint 掃描代碼
**Then**: 補充錯誤處理或加上註解說明

### 4.2 Script URL
**Given**: social-link-validation.js:27, 98 使用 `javascript:void(0)`
**When**: ESLint 掃描代碼
**Then**: 替換為 `#` 或移除

### 4.3 Duplicate else-if
**Given**: image-validator.ts:88 有重複的 else-if 條件
**When**: ESLint 掃描代碼
**Then**: 移除重複的條件分支

## Technical Requirements

1. **Globals 新增**（在 eslint.config.js）:
   ```javascript
   api: 'readonly',
   clearPreview: 'readonly',
   uploadAsset: 'readonly',
   viewAsset: 'readonly',
   QrCreator: 'readonly',
   getSocialLinkError: 'readonly',
   showToast: 'readonly'
   ```

2. **Regex 修復原則**:
   - `/` 在 regex 中不需要轉義（除非在 `//` 註解中）
   - `?` 在 regex 中不需要轉義
   - `+`, `(`, `)` 在字元類別外需要轉義，但在 URL pattern 中通常不需要

3. **最小化修改**:
   - 優先使用 globals 而非修改代碼邏輯
   - 只修復 ESLint 錯誤，不重構功能

## Acceptance Criteria
- ✅ `npm run lint` 顯示 0 errors
- ✅ Warnings 保持在合理範圍（< 80）
- ✅ 所有現有功能不受影響
- ✅ TypeScript 編譯無錯誤
