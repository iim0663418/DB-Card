# BDD Spec: CI Lint Errors Fix

## Scenario 1: Restore Missing loadCards Function
**Given**: admin-dashboard.js 有 10 處調用 `loadCards()` 但函式未定義
**When**: ESLint 執行靜態分析
**Then**: 
  - 定義 `async function loadCards()` 函式
  - 函式應從 API 獲取名片列表並渲染
  - 處理錯誤並顯示載入失敗訊息
  - 所有調用處能正確執行

## Scenario 2: Remove Unused Variables (Warnings)
**Given**: 以下未使用的變數存在：
  - main.js:38 - `isMobileDevice`
  - api.js:76, 52 - `e` (catch block)
  - admin-dashboard.js:2929, 1442 - `result`
  - admin-dashboard.js:2380 - `truncate`
  - admin-dashboard.js:2331 - `e`
  - admin-dashboard.js:956 - `maxPct`
  - admin-dashboard.js:45 - `activeTab`
  - admin-dashboard.js:2 - `SOCIAL_PLATFORMS`

**When**: ESLint 執行靜態分析
**Then**: 
  - 移除所有未使用的變數宣告
  - 保留必要的 catch block 但使用 `_` 前綴或移除參數
  - CI lint 通過 (0 errors, 0 warnings)

## Technical Requirements
1. `loadCards` 函式應：
   - 使用 `await api.getCards()` 獲取資料
   - 調用 `renderCardsList(cards)` 渲染
   - 錯誤處理使用 `showLoadingError()`
   - 成功後隱藏載入畫面

2. 變數清理原則：
   - 完全未使用 → 刪除
   - catch block 的 e → 改為 `_e` 或移除
   - 賦值但未讀取 → 刪除賦值語句

## Acceptance Criteria
- ✅ `npm run lint` 通過 (0 errors, 0 warnings)
- ✅ TypeScript 編譯無錯誤
- ✅ 所有 loadCards 調用處功能正常
