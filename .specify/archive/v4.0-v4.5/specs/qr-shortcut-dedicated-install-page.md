# BDD Spec: QR 快速捷徑獨立安裝頁面

## Feature: 每張名片有獨立的安裝頁面
作為使用者，我希望點擊「加到主畫面」時，能夠正確安裝對應的名片，而不會被其他名片干擾。

## Background
- 當前實作的 Manifest 是全域共享，導致多張名片安裝衝突
- 瀏覽器限制：Manifest 變更需要頁面導航才會生效
- `beforeinstallprompt` 事件只能調用一次
- 業界最佳實踐：每個 PWA 安裝流程使用獨立頁面

---

## Scenario 1: 點擊按鈕導航到安裝頁面
**Given** 使用者在名片列表頁面  
**And** 有一張名片「王小明」（uuid=abc123）  
**When** 點擊「加到主畫面」按鈕  
**Then** 導航到 `/card-install.html?uuid=abc123&name=王小明`  
**And** 頁面載入安裝引導

---

## Scenario 2: 安裝頁面動態注入 Manifest
**Given** 使用者訪問 `/card-install.html?uuid=abc123&name=王小明`  
**When** 頁面載入  
**Then** 從 URL 參數讀取 `uuid` 和 `name`  
**And** 動態注入 `<link rel="manifest" href="/api/manifest/abc123?name=王小明">`  
**And** Manifest 包含正確的 `scope` 和 `start_url`

---

## Scenario 3: iOS 平台顯示安裝引導
**Given** 使用者在 iOS Safari 訪問安裝頁面  
**When** 頁面載入完成  
**Then** 顯示 iOS 安裝引導 Modal  
**And** 引導內容包含：
  - 標題：「加到主畫面」
  - 副標題：「隨時打開，立即分享」
  - 步驟：「點選 [分享圖示] → 加入主畫面 → 完成」

---

## Scenario 4: Android Chrome 自動觸發安裝
**Given** 使用者在 Android Chrome 訪問安裝頁面  
**And** 瀏覽器觸發 `beforeinstallprompt` 事件  
**When** 使用者點擊「安裝」按鈕  
**Then** 調用 `deferredPrompt.prompt()`  
**And** 顯示原生安裝對話框  
**And** 安裝完成後顯示成功訊息

---

## Scenario 5: Desktop 平台提示使用手機
**Given** 使用者在桌面瀏覽器訪問安裝頁面  
**When** 頁面載入完成  
**Then** 顯示提示訊息：「請使用手機瀏覽器開啟此頁面，以加到主畫面。」

---

## Scenario 6: 安裝完成返回名片列表
**Given** 使用者完成 PWA 安裝  
**When** 點擊「返回」或「完成」按鈕  
**Then** 導航回 `/user-portal.html`  
**And** 顯示名片列表

---

## Scenario 7: 多張名片獨立安裝（核心場景）
**Given** 使用者有三張名片：
  - 「王小明」（uuid=abc123）
  - 「2026 開發者大會」（uuid=def456）
  - 「機密專案」（uuid=ghi789）  
**When** 依序點擊每張名片的「加到主畫面」  
**Then** 每次導航到不同的安裝頁面：
  - `/card-install.html?uuid=abc123&name=王小明`
  - `/card-install.html?uuid=def456&name=2026 開發者大會`
  - `/card-install.html?uuid=ghi789&name=機密專案`  
**And** 每個頁面注入對應的 Manifest  
**And** 安裝後主畫面有 3 個圖示：
  - 「王小明的名片 QR」
  - 「2026 開發者大會的名片 QR」
  - 「機密專案的名片 QR」  
**And** 點擊各自圖示顯示對應的 QR Code

---

## Technical Requirements

### 1. card-install.html
- **極簡設計**：< 150 行 HTML
- **URL 參數**：讀取 `uuid` 和 `name`
- **動態 Manifest**：`<link rel="manifest" id="dynamic-manifest">`
- **平台偵測**：iOS / Android / Desktop
- **安裝引導**：複用 user-portal.html 的 Modal UI
- **返回按鈕**：導航回 `/user-portal.html`

### 2. user-portal.html 修改
- **簡化 createQRShortcut()**：
  ```javascript
  function createQRShortcut(uuid, cardName, cardType) {
      const displayName = cardName || typeLabels[cardType] || '數位名片';
      window.location.href = `/card-install.html?uuid=${uuid}&name=${encodeURIComponent(displayName)}`;
  }
  ```
- **移除 Modal 代碼**：不再需要 Modal HTML 和相關函數

### 3. 設計原則
- ✅ **完全隔離**：每個安裝流程獨立
- ✅ **符合瀏覽器行為**：頁面導航觸發 Manifest 重新解析
- ✅ **極簡實作**：最小化代碼量
- ✅ **複用 UI**：使用現有 Modal 結構

---

## Acceptance Criteria
- [ ] `card-install.html` 創建完成（< 150 行）
- [ ] 從 URL 參數讀取 `uuid` 和 `name`
- [ ] 動態注入 Manifest
- [ ] iOS 平台顯示安裝引導
- [ ] Android 平台自動觸發安裝
- [ ] Desktop 平台顯示提示
- [ ] `user-portal.html` 的 `createQRShortcut()` 簡化為導航
- [ ] 移除 `user-portal.html` 的 Modal 代碼
- [ ] 多張名片可以獨立安裝（不衝突）
- [ ] 安裝完成可以返回名片列表

---

## Definition of Done
- 代碼實作完成
- TypeScript 編譯通過
- 部署到 Staging 環境
- 手動測試通過（單一名片 + 多張名片）
- 更新 progress.md 記錄
