# BDD Spec: QR 快速捷徑正確架構重構

## Feature: qr-quick.html 同時支援安裝引導和 QR 顯示
作為使用者，我希望點擊「加到主畫面」後，能在同一個頁面完成安裝，並且安裝後點擊主畫面圖示能直接顯示 QR Code。

## Background
- 當前架構錯誤：card-install.html 被安裝為 PWA，導致點擊主畫面圖示打開安裝頁面
- 正確架構：qr-quick.html 應該被安裝為 PWA，點擊主畫面圖示打開 QR Code
- 解決方案：合併 card-install.html 和 qr-quick.html，根據 standalone 模式顯示不同內容

---

## Scenario 1: 未安裝時顯示安裝引導
**Given** 使用者在瀏覽器訪問 `/qr-quick.html?uuid=abc123&name=王小明&type=personal`  
**And** 尚未安裝為 PWA（非 standalone 模式）  
**When** 頁面載入  
**Then** 顯示安裝引導 UI  
**And** 根據平台顯示對應引導（iOS/Android/Desktop）  
**And** 動態注入 Manifest（start_url 指向自己）

---

## Scenario 2: 已安裝時顯示 QR Code
**Given** 使用者從主畫面點擊圖示  
**And** 以 PWA 模式啟動（standalone 模式）  
**When** 頁面載入  
**Then** 隱藏安裝引導 UI  
**And** 顯示 QR Code  
**And** QR Code 內容為 `https://domain/card-display.html?uuid=abc123`

---

## Scenario 3: iOS Safari 安裝流程
**Given** 使用者在 iOS Safari 訪問 qr-quick.html  
**When** 看到安裝引導  
**And** 點擊分享按鈕 → 加入主畫面  
**Then** iOS 將 qr-quick.html 安裝為 PWA  
**And** 主畫面顯示圖示「王小明」  
**When** 點擊主畫面圖示  
**Then** 打開 qr-quick.html（standalone 模式）  
**And** 顯示 QR Code

---

## Scenario 4: Android Chrome 安裝流程
**Given** 使用者在 Android Chrome 訪問 qr-quick.html  
**When** 看到安裝引導  
**And** 點擊「安裝」按鈕  
**Then** 觸發原生安裝對話框  
**And** 安裝完成後主畫面顯示圖示「王小明」  
**When** 點擊主畫面圖示  
**Then** 打開 qr-quick.html（standalone 模式）  
**And** 顯示 QR Code

---

## Scenario 5: 多張名片獨立安裝
**Given** 使用者有三張名片：
  - 「王小明」（personal）
  - 「王小明」（event）
  - 「王小明」（sensitive）  
**When** 依序訪問並安裝：
  - `/qr-quick.html?uuid=abc&name=王小明&type=personal`
  - `/qr-quick.html?uuid=def&name=王小明&type=event`
  - `/qr-quick.html?uuid=ghi&name=王小明&type=sensitive`  
**Then** 主畫面有 3 個圖示：
  - 「王小明」
  - 「王小明（活動）」
  - 「王小明（敏感）」  
**And** 點擊各自圖示顯示對應的 QR Code

---

## Technical Requirements

### 1. qr-quick.html 重構
- **讀取 URL 參數**：uuid, name, type
- **動態注入 Manifest**：`<link rel="manifest" id="dynamic-manifest">`
- **Standalone 偵測**：
  ```javascript
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  ```
- **條件渲染**：
  - 未安裝：顯示安裝引導（複用 card-install.html 的 UI）
  - 已安裝：顯示 QR Code（現有邏輯）

### 2. user-portal.html 修改
- **修改導航目標**：
  ```javascript
  window.location.href = `/qr-quick.html?uuid=${uuid}&name=${name}&type=${type}`;
  ```

### 3. 刪除 card-install.html
- 不再需要

### 4. Manifest API（不變）
- start_url: `/qr-quick.html?uuid=${uuid}`
- scope: `/qr-quick.html?uuid=${uuid}`

---

## Acceptance Criteria
- [ ] qr-quick.html 讀取 URL 參數（uuid, name, type）
- [ ] qr-quick.html 動態注入 Manifest
- [ ] 未安裝時顯示安裝引導
- [ ] 已安裝時顯示 QR Code
- [ ] iOS Safari 安裝流程正確
- [ ] Android Chrome 安裝流程正確
- [ ] Desktop 顯示提示訊息
- [ ] user-portal.html 導航到 qr-quick.html
- [ ] card-install.html 已刪除
- [ ] 多張名片可以獨立安裝
- [ ] 點擊主畫面圖示顯示 QR Code（不是安裝頁面）

---

## Definition of Done
- 代碼實作完成
- TypeScript 編譯通過
- 部署到 Staging 環境
- 手動測試通過（iOS/Android）
- 驗證點擊主畫面圖示顯示 QR Code
- 更新 progress.md 記錄
