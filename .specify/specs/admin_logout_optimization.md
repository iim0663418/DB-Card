# BDD Spec: Admin Dashboard 登出行為優化

## Scenario 1: 登出時不應拋出 lucide 錯誤

**Given**: 
- Admin 已登入 Dashboard
- Passkey 按鈕已存在於 DOM

**When**: 
- Admin 點擊登出按鈕

**Then**: 
- 不應拋出 `lucide is not defined` 錯誤
- 不需要重新初始化 icon（icon 已存在於 HTML）
- 移除不必要的 `lucide.createIcons()` 調用

## Scenario 2: 登出後不應呼叫需認證的 API

**Given**: 
- Admin 已登入 Dashboard
- 頁面正在載入監控數據

**When**: 
- Admin 點擊登出
- Session 被清除

**Then**: 
- 不應出現 401 錯誤
- 監控數據載入應在登出時停止

## Technical Requirements

1. **Line 311 修復** - 移除 lucide.createIcons() 調用:
   ```javascript
   // Before (錯誤 - lucide 未定義)
   passkeyBtn.innerHTML = '<i data-lucide="fingerprint" ...></i>...';
   lucide.createIcons({ nameAttr: 'data-lucide' });  // ← 移除這行
   
   // After (正確)
   passkeyBtn.innerHTML = '<i data-lucide="fingerprint" ...></i>...';
   // icon 已在頁面載入時初始化，不需要重新 createIcons
   ```

2. **保留必要的按鈕重置**:
   - 保留 `passkeyBtn.disabled = false`
   - 保留 `passkeyBtn.innerHTML = '...'`（恢復按鈕內容）
   - 只移除 `lucide.createIcons()` 這一行

## Acceptance Criteria

- ✅ 登出時無 JavaScript 錯誤
- ✅ 不依賴 lucide 全域變數
- ✅ 登出流程順暢無卡頓
- ✅ 代碼更簡潔（移除不必要的 DOM 操作）
