# BDD Spec: 移除 IndexedDB 快取機制

## 背景
根據 ADR-003 決策，移除客戶端快取機制，回歸純 API 架構。

---

## Scenario 1: 頁面載入（無快取）
**Given**: 使用者訪問名片頁面，URL 包含有效的 uuid 和 session  
**When**: 頁面初始化  
**Then**: 直接從 API 讀取名片資料  
**And**: 不嘗試從 IndexedDB 讀取  
**And**: 顯示 loading 狀態直到 API 返回  

---

## Scenario 2: Session 過期（無降級）
**Given**: 使用者訪問名片頁面  
**And**: Session 已過期  
**When**: API 返回 403 錯誤  
**Then**: 顯示錯誤訊息：「授權已過期，請重新觸碰 NFC 卡片」  
**And**: 不嘗試從快取讀取  
**And**: 不顯示過期的名片資料  

---

## Scenario 3: 網路錯誤（無降級）
**Given**: 使用者訪問名片頁面  
**And**: 網路連線失敗  
**When**: API 請求失敗  
**Then**: 顯示錯誤訊息：「網路連線失敗，請檢查網路後重試」  
**And**: 不嘗試從快取讀取  
**And**: 提供「重試」按鈕  

---

## Scenario 4: 語系切換（重新載入）
**Given**: 使用者正在查看名片  
**And**: URL 包含 `?uuid=xxx&session=yyy`  
**When**: 點擊語系切換按鈕  
**Then**: 頁面重新載入，URL 變更為 `?uuid=xxx&session=yyy&lang=en`  
**And**: 重新從 API 讀取名片資料  
**And**: 以新語言顯示名片  

---

## Scenario 5: vCard 下載（需有效 session）
**Given**: 使用者正在查看名片  
**And**: Session 仍然有效  
**When**: 點擊「下載名片」按鈕  
**Then**: 使用當前顯示的名片資料生成 vCard  
**And**: 觸發下載  

---

## 技術要求

### 移除的檔案
- `public/js/storage.js`
- `public/js/error-handler.js`

### 修改的檔案
- `public/js/main.js`:
  - 移除 `import storage.js`
  - 移除 `import error-handler.js`
  - 移除 `cleanupCache()` 調用
  - 移除 `getStorageStats()` 調用
  - 簡化 `loadCard()` 函數
  - 重構語系切換邏輯

- `public/card-display.html`:
  - 移除離線模式相關 UI
  - 簡化錯誤訊息

### 新增功能
- 語系切換改為 URL 參數 + 頁面重新載入
- 統一錯誤處理（無降級邏輯）

---

## 驗收標準

### 功能測試
- [ ] 有效 session 可正常顯示名片
- [ ] Session 過期顯示正確錯誤訊息
- [ ] 網路錯誤顯示正確錯誤訊息
- [ ] 語系切換正常運作（重新載入）
- [ ] vCard 下載功能正常
- [ ] 無 console 錯誤

### 代碼品質
- [ ] 移除所有 IndexedDB 相關代碼
- [ ] 移除所有快取降級邏輯
- [ ] 簡化錯誤處理流程
- [ ] 代碼行數減少 ~300 行

### 效能測試
- [ ] 首次載入時間 < 2 秒
- [ ] 語系切換時間 < 1 秒
- [ ] API 請求延遲 < 500ms（Cloudflare Workers）

---

## 實作順序

1. **Phase 1**: 移除 storage.js 和 error-handler.js
2. **Phase 2**: 簡化 main.js 的 loadCard 函數
3. **Phase 3**: 重構語系切換邏輯
4. **Phase 4**: 更新錯誤訊息 UI
5. **Phase 5**: 測試所有場景
