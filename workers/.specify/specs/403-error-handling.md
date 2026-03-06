# 403 錯誤處理重構 - BDD 規格

## Scenario 1: 統一錯誤處理架構

**Given** 三層架構已創建：
- api-client.js (傳輸層)
- error-policy.js (決策層)  
- feature-api.js (業務層)

**When** 整合到 received-cards.js

**Then** 應該：
1. 保持向後相容（ReceivedCardsAPI 介面不變）
2. 所有 API 呼叫使用 FeatureAPI.call()
3. 移除重複的錯誤處理邏輯
4. response.json() 只在 APIClient 讀取一次

---

## Scenario 2: CSRF Token 重試機制

**Given** CSRF token 失效（403 CSRF_INVALID）

**When** 發送 POST/PUT/PATCH/DELETE 請求

**Then** 應該：
1. ErrorPolicy 檢測到 CSRF_INVALID
2. 呼叫 refreshCSRFToken()
3. 若成功，回傳 {action: 'retry'}
4. FeatureAPI 自動重試一次（maxRetries=1）
5. 若失敗，重定向到登入頁

---

## Scenario 3: Rate Limiting 處理

**Given** 超過 API 請求限制（429）

**When** 收到 429 回應

**Then** 應該：
1. 解析 Retry-After header
2. 顯示 toast 訊息（含倒數秒數）
3. 回傳 retryAfter 給上層
4. 不自動重試（讓上層決定）

---

## Scenario 4: OAuth WebView 阻擋

**Given** 使用 in-app browser 訪問 OAuth

**When** 收到 403 WEBVIEW_BLOCKED

**Then** 應該：
1. ErrorPolicy 檢測 context='oauth' 或 code='WEBVIEW_BLOCKED'
2. 回傳 {action: 'modal', modalType: 'webview-error'}
3. FeatureAPI 顯示 WebView 錯誤 modal
4. 不重定向

---

## Scenario 5: 向後相容性

**Given** 現有代碼使用 ReceivedCardsAPI.call()

**When** 整合新架構

**Then** 應該：
1. ReceivedCardsAPI.call() 仍然可用
2. 內部委託給 FeatureAPI.call()
3. 所有現有功能正常運作
4. 錯誤處理自動升級

---

## 實作要求

### 檔案修改清單

1. **received-cards.js**
   - 移除舊的 ReceivedCardsAPI.call() 實作
   - 改為委託給 FeatureAPI
   - 保持所有其他方法不變
   - 確保 uploadImage, unifiedExtract 等使用新架構

2. **user-portal.html**
   - 加入新 JS 檔案載入（正確順序）
   - 確保在 received-cards.js 之前載入

3. **測試驗證**
   - 手動測試上傳流程
   - 驗證 403 錯誤顯示正確訊息
   - 驗證 CSRF retry 機制

### 代碼品質要求

- TypeScript 零錯誤（如果適用）
- ESLint 零錯誤
- 保持現有代碼風格
- 最小化變更範圍
- 向後相容

### 不要修改

- 不要改變 HTML 結構
- 不要修改 CSS
- 不要改變現有 API 端點
- 不要修改後端代碼
