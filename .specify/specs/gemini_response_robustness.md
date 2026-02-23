# BDD Spec: Gemini Response Robustness

## Scenario: Handle Gemini 2.0 Flash Thinking Mode Response
- **Given**: Gemini API 回傳包含 `thoughtSignature` 的回應
- **When**: 前端嘗試顯示預覽模態框
- **Then**: 
  - 後端正確提取 `parts[0].text` 欄位 ✅ (已實作)
  - 前端安全處理所有 DOM 操作（防止 null reference）
  - `company_summary` 顯示前檢查 DOM 元素存在性

## Scenario: Prevent DOM Null Reference Errors
- **Given**: `showPreviewModal()` 被調用
- **When**: 某個 DOM 元素不存在
- **Then**: 
  - 使用 `safeSetValue` 模式處理所有元素
  - `company_summary` 區塊使用可選鏈操作符
  - 不拋出 TypeError

## Technical Requirements
1. 後端：`unified-extract.ts` 已正確提取 `text` 欄位 ✅
2. 前端：`received-cards.js` 需加強 DOM 安全檢查
3. 錯誤處理：所有 `getElementById` 需檢查 null

## Acceptance Criteria
- ✅ 後端解析 Gemini 回應無錯誤
- ⏳ 前端顯示預覽模態框無崩潰
- ⏳ Console 無 TypeError 錯誤
