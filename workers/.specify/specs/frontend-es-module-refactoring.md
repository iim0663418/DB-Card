# Spec: user-portal-init.js ES Module Refactoring

## Context
user-portal-init.js（2987 行）是單一 monolithic file，所有函數在同一 scope。
需重構為 ES modules 才能被 Vite 正確 bundle。

核心約束：
- 函數互相引用（如 handleLogout 呼叫 apiCall、fetchUserCards、showView）
- 不能一次全拆（會破壞功能）
- 需要漸進式遷移策略

## Strategy: Facade Pattern（漸進遷移）

保留 user-portal-init.js 為「facade」（暫時），逐步把邏輯搬到獨立 ES module 中。
Facade import 所有 modules 並在 DOMContentLoaded 中 orchestrate。

```
Phase 2.0: 建立 module 基礎設施（不改行為）
Phase 2.1: 抽出 i18n（純資料，0 互相依賴）
Phase 2.2: 抽出 particles（Three.js，只被 DOMContentLoaded 呼叫）
Phase 2.3: 抽出 api layer（apiCall + getHeaders — 被所有模組依賴）
Phase 2.4: 抽出 auth（login + logout + session）
Phase 2.5: 抽出 consent（同意管理）
Phase 2.6: 抽出 cards（CRUD + UI）
Phase 2.7: 抽出 ocr（SelfCardOCR）
Phase 2.8: facade → entry orchestrator（移除 facade）
```

## Phase 2.0: Module Infrastructure

### Scenario 1: 建立模組目錄結構
```
Given 新目錄 public/js/modules/
When 建立空的 module 檔案
Then 結構如下：
  public/js/modules/
  ├── i18n.js          — translations + applyTranslations
  ├── api.js           — apiCall, getHeadersWithCSRF, validateSession
  ├── auth.js          — handleGoogleLogin, handleLogout, WebView detection
  ├── cards.js         — fetchUserCards, handleFormSubmit, renderSelection
  ├── consent.js       — all consent management functions
  ├── ocr.js           — SelfCardOCR module
  ├── ui.js            — showView, updatePreview, modals, toast
  ├── particles.js     — Three.js init
  └── state.js         — CardStateManager, ErrorHandler, app state
And 每個檔案開頭有 export，結尾有 // end marker
And user-portal-init.js 暫不改動
```

### Scenario 2: user-portal.html 改為 module entry
```
Given user-portal.html 目前用 <script src="/js/user-portal-init.js">
When 改為 <script type="module" src="/js/modules/main.js">
Then main.js 是 orchestrator：
  import { i18n, currentLang, applyTranslations } from './i18n.js'
  import { initParticles } from './particles.js'
  import { handleGoogleLogin, handleLogout } from './auth.js'
  import { ... } from './cards.js'
  import { ... } from './consent.js'
  import { ... } from './ui.js'
  
  document.addEventListener('DOMContentLoaded', async () => {
    applyTranslations(currentLang)
    // ... orchestration logic (from original DOMContentLoaded)
  })
  
  // Event delegation
  document.addEventListener('click', (e) => { ... })
And user-portal-init.js 不再被引用（可刪除）
And 所有 inline onclick 改為 data-action
```

## 漸進遷移驗證方式
每個 Phase 完成後：
1. 在瀏覽器 `wrangler dev` 開啟 user-portal.html
2. 測試核心流程：登入 → 名片列表 → 編輯 → 收到的名片 → OCR → consent
3. 無 console error
4. 功能不迴歸

## Technical Notes
- ES modules 可直接在瀏覽器 <script type="module"> 載入（dev mode 不需 Vite）
- 每個 module 用 named exports
- 模組間 shared state 用 state.js 管理（export mutable state object）
- apiCall 是幾乎所有模組都依賴的 — 第一個抽出
- DOMContentLoaded 只在 main.js 中（不在子模組中）
- inline onclick 在最後一步統一改為 event delegation（Phase 2.8）
