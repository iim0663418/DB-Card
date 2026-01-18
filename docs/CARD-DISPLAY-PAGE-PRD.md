# Card Display Page PRD - 名片顯示頁面產品需求文件

**Version**: 1.0.0  
**Date**: 2026-01-18  
**Status**: READY FOR DEVELOPMENT  
**Priority**: P0 (最高優先級)

---

## 1. 產品目標

### 1.1 核心目標
實作統一的名片顯示頁面，支援：
- NFC 碰卡後自動載入名片資料
- 多語言支援（中文/英文/雙語切換）
- 多版面支援（機關版/個人版）
- 離線快取與錯誤處理

### 1.2 成功指標
- 頁面載入時間 < 500ms
- API 回應時間 < 300ms
- 離線快取命中率 > 80%
- 錯誤處理覆蓋率 100%

---

## 2. 使用者流程

### 2.1 主要流程（Happy Path）

1. 使用者觸碰 NFC 卡片
2. 手機開啟 URL: https://db-card.example.com/tap?uuid={uuid}
3. 頁面載入，顯示 Loading 動畫
4. JavaScript 自動執行：
   - 解析 URL 參數 uuid
   - 呼叫 POST /api/nfc/tap
   - 取得 session_id
   - 儲存到 IndexedDB
5. 呼叫 GET /api/read?uuid={uuid}&session={session_id}
6. 渲染名片介面
7. 顯示 Session 資訊（有效期限、剩餘次數）
8. 儲存名片資料到快取

### 2.2 錯誤流程

#### 2.2.1 網路錯誤
- API 呼叫失敗
- 顯示錯誤訊息：「網路連線失敗」
- 嘗試從快取載入
- 如有快取：顯示快取資料 + 「離線模式」標籤
- 如無快取：顯示重試按鈕

#### 2.2.2 Session 過期
- GET /api/read 回傳 403 session_expired
- 顯示訊息：「授權已過期，請再次碰卡」
- 提供「重新碰卡」按鈕

#### 2.2.3 讀取次數用盡
- GET /api/read 回傳 403 max_reads_exceeded
- 顯示訊息：「已達讀取次數上限」
- 從快取載入資料（如有）

---

## 3. 檔案結構

```
/
├── card-display.html          # 主頁面
├── js/
│   ├── api.js                 # API 呼叫模組
│   ├── storage.js             # IndexedDB 管理
│   ├── renderer.js            # 名片渲染
│   ├── error-handler.js       # 錯誤處理
│   └── config.js              # 配置檔案
├── css/
│   ├── card-display.css       # 主樣式
│   └── loading.css            # Loading 動畫
└── assets/
    └── moda-logo.svg          # Logo（機關版使用）
```

---

## 4. URL 參數規格

**必要參數**:
- uuid: 名片 UUID（UUID v4 格式）

**選填參數**:
- lang: 語言（zh/en/auto，預設 auto）
- layout: 版面（official/personal，預設 official）

**範例**:
- https://db-card.example.com/tap?uuid=550e8400-e29b-41d4-a716-446655440000
- https://db-card.example.com/tap?uuid=550e8400-e29b-41d4-a716-446655440000&lang=en

---

## 5. 共用模組規格

### 5.1 api.js - API 呼叫模組

#### tapCard(uuid)
- 功能: 呼叫 NFC Tap API 簽發 ReadSession
- 參數: uuid (string)
- 回傳: { session_id, expires_at, max_reads, reads_used, revoked_previous }
- 錯誤: NetworkError, APIError

#### readCard(uuid, sessionId)
- 功能: 呼叫 Read API 讀取名片資料
- 參數: uuid (string), sessionId (string)
- 回傳: { data: {...}, session_info: {...} }
- 錯誤: NetworkError, SessionExpiredError, SessionRevokedError, MaxReadsExceededError

---

### 5.2 storage.js - IndexedDB 管理模組

#### 資料庫結構
- 資料庫名稱: db-card-storage
- 版本: 1
- Object Stores:
  1. active_sessions (keyPath: session_id)
  2. exchange_history (keyPath: id, autoIncrement)

#### saveSession(session)
- 功能: 儲存 ReadSession 到 IndexedDB
- 參數: session 物件

#### getValidSession(cardUuid)
- 功能: 取得有效的 ReadSession
- 參數: cardUuid (string)
- 回傳: Session 物件或 null

#### saveToCache(cardUuid, cardData)
- 功能: 儲存名片資料到快取
- 參數: cardUuid (string), cardData (object)
- 保留策略: 最多 200 筆，保留 7 天

#### loadFromCache(cardUuid)
- 功能: 從快取載入名片資料
- 參數: cardUuid (string)
- 回傳: 快取資料或 null

---

### 5.3 renderer.js - 名片渲染模組

#### renderCard(cardData, options)
- 功能: 渲染名片介面
- 參數: 
  - cardData (object): 名片資料
  - options (object): { language, layout, isOffline }
- 渲染內容: Logo, 大頭貼, 基本資訊, 聯絡資訊, 社群連結, 問候語

#### renderSessionInfo(sessionInfo, language)
- 功能: 渲染 Session 資訊
- 參數: sessionInfo (object), language (string)
- 顯示: 有效期限, 剩餘回看次數

---

### 5.4 error-handler.js - 錯誤處理模組

#### handleError(error, context)
- 功能: 統一錯誤處理入口
- 參數: error (Error), context (object)
- 處理類型: NetworkError, SessionExpiredError, MaxReadsExceededError, CardNotFoundError

#### showError(message, options)
- 功能: 顯示錯誤訊息
- 參數: message (string), options (object)
- 選項: action (retry/retap/none), fallback (loadFromCache)

---

### 5.5 config.js - 配置檔案

```javascript
// API 配置
const API_BASE_URL = 'https://db-card-api-staging.csw30454.workers.dev';

// IndexedDB 配置
const DB_NAME = 'db-card-storage';
const DB_VERSION = 1;

// 快取配置
const CACHE_MAX_ITEMS = 200;
const CACHE_MAX_AGE_DAYS = 7;

// 語言配置
const LANGUAGES = {
  zh: { loading: '載入中...', error_network: '網路連線失敗', ... },
  en: { loading: 'Loading...', error_network: 'Network connection failed', ... }
};

// 版面配置
const LAYOUTS = {
  official: { showLogo: true, organization: '數位發展部', ... },
  personal: { showLogo: false, organization: null, ... }
};
```

---

### 5.6 utils.js - 工具函數

#### getLocalizedText()

**功能**: 取得本地化文字（支援單語和雙語）

**函數簽名**:
```javascript
function getLocalizedText(text, language = 'zh')
```

**參數**:
- text (string | object): 單語字串或雙語物件
- language (string): 語言代碼（zh/en）

**回傳**:
- 本地化後的字串

**實作範例**:
```javascript
function getLocalizedText(text, language = 'zh') {
  // 單語模式
  if (typeof text === 'string') {
    return text;
  }
  
  // 雙語模式
  if (typeof text === 'object' && text !== null) {
    return text[language] || text.zh || text.en || '';
  }
  
  return '';
}

// 使用範例
const name = getLocalizedText(cardData.name, 'en');
// 單語: "吳昇凡"
// 雙語: "Wu Sheng-Fan"
```

---

## 6. 主頁面結構 (card-display.html)

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>數位名片</title>
  <link rel="stylesheet" href="css/card-display.css">
  <link rel="stylesheet" href="css/loading.css">
</head>
<body>
  <div id="loading" class="loading-container">
    <div class="spinner"></div>
    <p>載入中...</p>
  </div>
  
  <div id="error-container" class="error-container hidden"></div>
  <div id="session-info" class="session-info hidden"></div>
  <div id="card-container" class="card-container"></div>
  
  <div id="actions" class="actions hidden">
    <button id="save-vcard" class="btn">儲存聯絡人</button>
    <button id="share" class="btn">分享</button>
  </div>
  
  <script src="js/config.js"></script>
  <script src="js/api.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/renderer.js"></script>
  <script src="js/error-handler.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

---

## 7. 主邏輯 (main.js)

```javascript
async function init() {
  try {
    const params = parseURLParams();
    const { uuid, lang = 'zh', layout = 'official' } = params;
    
    if (!uuid) throw new Error('Missing UUID parameter');
    
    showLoading();
    
    const tapResult = await tapCard(uuid);
    await saveSession({ ...tapResult, card_uuid: uuid, created_at: Date.now() });
    
    const readResult = await readCard(uuid, tapResult.session_id);
    await saveToCache(uuid, readResult.data);
    
    hideLoading();
    
    renderCard(readResult.data, { language: lang, layout });
    renderSessionInfo(readResult.session_info, lang);
    showActions();
    
  } catch (error) {
    hideLoading();
    await handleError(error, { uuid, language: lang });
  }
}

document.addEventListener('DOMContentLoaded', init);
```

---

## 8. 測試需求

### 8.1 單元測試
- api.js 所有函數
- storage.js 所有函數
- renderer.js 所有函數
- error-handler.js 所有函數

### 8.2 整合測試
- 完整流程：Tap → Read → Render
- 錯誤流程：網路錯誤 → 快取載入
- 錯誤流程：Session 過期 → 重新碰卡

### 8.3 UI 測試
- 響應式設計（手機/平板/桌面）
- Loading 動畫
- 錯誤訊息顯示
- 名片渲染正確

---

## 9. 交付清單

### 9.1 檔案清單
- card-display.html
- js/config.js
- js/api.js
- js/storage.js
- js/renderer.js
- js/error-handler.js
- js/main.js
- css/card-display.css
- css/loading.css

### 9.2 文件清單
- API 整合文件
- IndexedDB Schema 文件
- 錯誤處理文件
- 測試報告

---

## 10. 開發時程

### Week 1: 共用模組開發
- Day 1-2: api.js + storage.js
- Day 3-4: renderer.js + error-handler.js
- Day 5: 單元測試

### Week 2: 主頁面開發
- Day 1-2: card-display.html + main.js
- Day 3-4: CSS 樣式
- Day 5: 整合測試

### Week 3: 測試與優化
- Day 1-2: UI 測試
- Day 3-4: 效能優化
- Day 5: 文件撰寫

---

**END OF PRD**
