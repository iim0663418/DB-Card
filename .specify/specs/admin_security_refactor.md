# BDD Spec: Admin Dashboard 安全重構（務實版 v2）

## 背景：實況分析（校正後）
- **35 個 inline handlers** (admin-dashboard.html 實掃：onclick 約 32)
- **3 個外部 CDN 無 SRI** (line 17, 18, 27)
- **DOMPurify 反模式** - `ADD_ATTR: ['onclick']` 抵消防護
- **CSP 偏寬** - `'unsafe-inline'` + unpkg.com + cdn.jsdelivr.net
- **Scope**: admin-dashboard.html only（其他頁面下階段）

---

## P0-1: CDN → 本地 vendor + SRI（最快降風險）
**Given**: 3 個外部 CDN 依賴（line 17, 18, 27）  
**When**: 下載到 `/vendor` 並鎖定版本  
**Then**:
- 下載檔案：
  ```bash
  curl -o workers/public/vendor/panzoom.min.js \
    https://unpkg.com/@panzoom/panzoom@4.6.1/dist/panzoom.min.js
  
  curl -o workers/public/vendor/simplewebauthn.min.js \
    https://unpkg.com/@simplewebauthn/browser@13.0.0/dist/bundle/index.umd.min.js
  
  curl -o workers/public/vendor/chart.min.js \
    https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js
  ```
- 生成 SRI hash：
  ```bash
  openssl dgst -sha384 -binary FILE | openssl base64 -A
  ```
- 更新 admin-dashboard.html (line 17-27)：
  ```html
  <script src="/vendor/panzoom.min.js" 
          integrity="sha384-{HASH}" 
          crossorigin="anonymous" 
          defer></script>
  <script src="/vendor/simplewebauthn.min.js" 
          integrity="sha384-{HASH}" 
          crossorigin="anonymous" 
          defer></script>
  <script src="/vendor/chart.min.js" 
          integrity="sha384-{HASH}" 
          crossorigin="anonymous" 
          defer></script>
  ```

**驗證**:
- [ ] 3 個檔案存在於 `/vendor`
- [ ] SRI hash 正確
- [ ] Admin Dashboard 功能正常（圖表、Passkey、Pan/Zoom）

---

## P0-2: 移除 35 個 inline handlers（解決 CSP inline 壓力）
**Given**: admin-dashboard.html 有 35 個 `on*=` 屬性  
**When**: 使用事件委派重構  
**Then**:
- 所有 `onclick="func()"` 改為 `data-action="func"`
- 新增統一事件處理器（放在 `<script>` 區塊末尾）：
  ```javascript
  // Event Delegation for all click actions
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const handlers = {
      'loadCards': loadCards,
      'retryLoadCards': retryLoadCards,
      'loginWithPasskey': loginWithPasskey,
      'switchTab': () => switchTab(btn.dataset.tab),
      'registerPasskey': registerPasskey,
      'handleLogout': handleLogout,
      'cancelEdit': cancelEdit,
      'clearPreview': clearPreview,
      'uploadAsset': uploadAsset,
      'exportSecurityEvents': exportSecurityEvents,
      'loadSecurityEvents': () => loadSecurityEvents(parseInt(btn.dataset.page)),
      'showRotationGuide': showRotationGuide,
      'closeRotationGuide': closeRotationGuide,
      'checkCDNHealth': checkCDNHealth,
      'closeModal': closeModal,
      'closeIPDetailModal': closeIPDetailModal,
      'handleUnblockIP': handleUnblockIP,
      // ... 其他 handlers
    };
    
    if (handlers[action]) {
      e.preventDefault();
      handlers[action](e, btn);
    }
  });
  ```
- 範例轉換：
  ```html
  <!-- 舊 (line 307) -->
  <button onclick="switchTab('list')" id="tab-list">列表</button>
  
  <!-- 新 -->
  <button data-action="switchTab" data-tab="list" id="tab-list">列表</button>
  ```

**驗證**:
- [ ] 35 個 `on*=` 全部移除
- [ ] 所有按鈕功能正常
- [ ] Console 無錯誤

---

## P0-3: 替換高風險 innerHTML（與 P0-2 並行分批）
**Given**: 大量 innerHTML 用於動態內容  
**When**: 優先處理 modal 與字串插值  
**Then**:
- **移除 DOMPurify ADD_ATTR**：
  ```javascript
  // 舊
  DOMPurify.sanitize(html, { ADD_ATTR: ['onclick'] })
  
  // 新
  DOMPurify.sanitize(html)  // 預設不允許 onclick
  ```
- **純文字內容**：
  ```javascript
  // 舊
  element.innerHTML = text;
  
  // 新
  element.textContent = text;
  ```
- **結構化內容**：
  ```javascript
  // 舊
  element.innerHTML = `<div>${data}</div>`;
  
  // 新
  const div = document.createElement('div');
  div.textContent = data;
  element.appendChild(div);
  ```
- **優先處理位置**：
  - Modal 動態內容
  - Assets table (line 4214)
  - 任何字串插值組 HTML 的地方 (line 4256)

**驗證**:
- [ ] DOMPurify 不含 ADD_ATTR
- [ ] 高風險 innerHTML 已替換
- [ ] 功能正常

---

## P1-1: 抽離 inline script 到外部 JS
**Given**: admin-dashboard.html 有大量 `<script>` 內聯程式碼  
**When**: 抽離到 `/js/admin-dashboard.js`  
**Then**:
- 創建 `/js/admin-dashboard.js`
- 移動所有 `<script>` 內容到外部檔案
- HTML 改為：
  ```html
  <script src="/js/admin-dashboard.js" defer></script>
  ```

---

## P1-2: CSP Report-Only 觀測
**Given**: 當前 CSP 使用 `'unsafe-inline'`  
**When**: 先啟用 Report-Only 模式  
**Then**:
- 更新 `_headers`：
  ```
  /admin-dashboard
    Content-Security-Policy-Report-Only: script-src 'self'; report-uri /api/csp-report
  ```
- 實作 `/api/csp-report` 端點（記錄到 D1）
- 觀測 24 小時，確認無合法腳本被阻擋

---

## P1-3: 移除 'unsafe-inline' 並清理白名單
**Given**: Report-Only 確認無誤  
**When**: 切換到 enforce 模式  
**Then**:
- `_headers` 更新：
  ```
  /admin-dashboard
    Content-Security-Policy: script-src 'self'; object-src 'none'; base-src 'self'
  ```
- 移除 `unpkg.com`, `cdn.jsdelivr.net` 白名單
- 移除 `'unsafe-inline'`

---

## P1-4: CI 規則防回歸（制度化）
**Given**: 目前無 eval/new Function  
**When**: 加入 ESLint 規則  
**Then**:
- `.eslintrc.json` 新增：
  ```json
  {
    "rules": {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error"
    }
  }
  ```
- GitHub Actions 加入 `npm run lint`

---

## Acceptance Criteria
- [ ] P0-1: 3 個 CDN 改為本地 + SRI
- [ ] P0-2: 35 個 inline handlers 改為事件委派
- [ ] P0-3: DOMPurify 不含 ADD_ATTR，高風險 innerHTML 已替換
- [ ] P1-1: inline script 抽離到外部 JS
- [ ] P1-2: CSP Report-Only 運行 24 小時無誤
- [ ] P1-3: CSP enforce 模式，無 'unsafe-inline'
- [ ] P1-4: ESLint 規則已加入
- [ ] OWASP ZAP 掃描：WARN < 10

## 時程規劃（校正後）
- **Day 1**: P0-1 (CDN → vendor + SRI)
- **Day 2-4**: P0-2 (35 個 inline handlers)
- **Day 5-6**: P0-3 (innerHTML + DOMPurify)
- **Day 7-8**: P1-1 (抽離 inline script)
- **Day 9-10**: P1-2 (CSP Report-Only)
- **Day 11-12**: P1-3 (CSP enforce)
- **Day 13-14**: P1-4 (CI 規則) + 整體驗證

## KPI 追蹤（僅 admin-dashboard.html）
- Inline handlers: 35 → 0
- External CDN: 3 → 0
- DOMPurify ADD_ATTR: Yes → No
- CSP 'unsafe-inline': Yes → No
- OWASP ZAP WARN: 16 → < 10

