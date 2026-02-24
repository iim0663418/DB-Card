# BDD Spec: Silent Logout Enhancement

## Scenario 1: Token 過期自動登出（優雅處理）
- **Given**: 用戶的 JWT token 已過期或無效
- **When**: API 回傳 401 或 403 狀態碼
- **Then**: 
  - 靜默清理狀態（isLoggedIn = false, authToken = null）
  - 返回登入頁面（showView('login')）
  - **不顯示** "您的帳號未獲授權" Toast
  - **不顯示** 任何錯誤提示（這是正常的 session 過期）

## Scenario 2: 生產環境日誌清理
- **Given**: 代碼中存在開發用的 console.log
- **When**: 在生產環境運行
- **Then**:
  - 移除上傳流程的 console.log（Retry, Compressing, Compressed, Thumbnail）
  - 保留 console.error（錯誤追蹤仍需要）
  - 保留 console.warn（警告仍需要）

## Target Files:
- `public/js/user-portal-init.js` (Line 90, 150, 180)
- `public/js/received-cards.js` (Line 1-300, 上傳相關日誌)

## Technical Requirements:
1. 移除 401/403 錯誤的 showToast 調用
2. 移除 `console.log('[Upload] ...')` 共 6 處
3. 保持錯誤處理邏輯完整性
4. 不影響其他錯誤類型的提示（429, 500 等）
