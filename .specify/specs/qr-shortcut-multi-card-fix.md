# BDD Spec: QR 快速捷徑多名片支援修復

## Feature: 支援安裝多張名片到主畫面
作為使用者，我希望可以將多張名片分別安裝到主畫面，並且能夠清楚區分每張名片。

## Background
- 當前實作的 `scope: '/'` 導致無法安裝多個 PWA
- 缺少名稱參數導致無法區分不同名片
- 需要修改 2 個文件，共 2 行代碼

---

## Scenario 1: 修正 Manifest Scope 參數
**Given** Manifest API 當前使用 `scope: '/'`  
**When** 修改為 `scope: '/qr-quick.html?uuid=${uuid}'`  
**Then** 每個名片有獨立的 Scope  
**And** 不會與其他名片的 PWA 安裝衝突

### 實作要求
- 文件：`workers/src/handlers/manifest.ts`
- 位置：約 Line 30
- 修改：`scope: '/',` → `scope: '/qr-quick.html?uuid=${uuid}',`

---

## Scenario 2: 傳遞名稱參數到 Manifest API
**Given** 前端調用 Manifest API 時沒有傳遞名稱  
**When** 修改為 `const manifestUrl = '/api/manifest/${uuid}?name=${encodeURIComponent(displayName)}'`  
**Then** Manifest API 收到名稱參數  
**And** 生成的 PWA 名稱為「{名稱}的名片 QR」

### 實作要求
- 文件：`workers/public/user-portal.html`
- 位置：約 Line 800（`createQRShortcut` 函數內）
- 修改：`const manifestUrl = '/api/manifest/${uuid}';` → `const manifestUrl = '/api/manifest/${uuid}?name=${encodeURIComponent(displayName)}';`

---

## Scenario 3: 安裝單一名片
**Given** 使用者有一張名片「王小明」  
**When** 點擊「加到主畫面」並完成安裝  
**Then** 主畫面顯示圖示「王小明的名片 QR」  
**And** 點擊圖示顯示王小明的 QR Code

---

## Scenario 4: 安裝多張名片
**Given** 使用者有三張名片：「王小明」、「2026 開發者大會」、「機密專案」  
**When** 分別點擊「加到主畫面」並完成安裝  
**Then** 主畫面顯示 3 個圖示  
**And** 圖示名稱分別為：
  - 「王小明的名片 QR」
  - 「2026 開發者大會的名片 QR」
  - 「機密專案的名片 QR」  
**And** 點擊各自圖示顯示對應的 QR Code

---

## Scenario 5: 無名稱名片的 Fallback
**Given** 使用者有一張名片但沒有填寫名稱  
**And** 名片類型為「personal」  
**When** 點擊「加到主畫面」並完成安裝  
**Then** 主畫面顯示圖示「個人名片的名片 QR」  
**And** 點擊圖示顯示該名片的 QR Code

---

## Technical Constraints
1. **最小化修改**：僅修改 2 行代碼
2. **向後相容**：不影響現有功能
3. **TypeScript 編譯**：必須通過 `npm run build`
4. **符合規範**：遵循 Web.dev PWA 最佳實踐

---

## Acceptance Criteria
- [ ] `manifest.ts` 的 `scope` 參數修改為 `/qr-quick.html?uuid=${uuid}`
- [ ] `user-portal.html` 的 `manifestUrl` 添加 `name` 參數
- [ ] TypeScript 編譯通過（無錯誤）
- [ ] 可以安裝多張名片到主畫面
- [ ] 每張名片的圖示名稱正確顯示
- [ ] 點擊圖示顯示對應的 QR Code

---

## Definition of Done
- 代碼修改完成並通過編譯
- 部署到 Staging 環境
- 手動測試通過（單一名片 + 多張名片）
- 更新 progress.md 記錄
