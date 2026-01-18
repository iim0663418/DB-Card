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

### 6.1 設計參考

本頁面設計參考 `docs/v4.0名片顯示設計.html`，採用 **Governance Portal Light v3.1** 設計語言：

**設計特色**:
- ✅ 晶體卡片（Crystal Container）- 毛玻璃效果
- ✅ 3D 背景場域（Three.js 光纖網格）
- ✅ HUD 風格文字（Share Tech Mono 字體）
- ✅ 資訊晶片（Info Chips）- 懸浮互動效果
- ✅ 打字機效果問候語
- ✅ 社群連結聚落（Social Cluster）
- ✅ 載入動畫門戶
- ✅ QR Code 彈窗
- ✅ Session 資訊顯示

**色彩系統**:
```css
:root {
    --moda-accent: #6868ac;
    --moda-glow: rgba(104, 104, 172, 0.2);
    --crystal-bg: rgba(255, 255, 255, 0.5);
    --ui-text: #1e1e3f;
}
```

**字體系統**:
- 英文: Outfit (300, 400, 700)
- 中文: Noto Sans TC (300, 500, 900)
- HUD: Share Tech Mono

---

### 6.2 HTML 結構

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

### 7.1 整合 v4.0 設計

參考 `docs/v4.0名片顯示設計.html` 的實作，整合後端 API：

```javascript
// 主流程（整合 v4.0 設計 + 後端 API）
async function init() {
  try {
    // 1. 初始化 Three.js 背景
    initThree();
    
    // 2. 解析 URL 參數
    const params = parseURLParams();
    const { uuid, lang = 'zh', layout = 'official' } = params;
    
    if (!uuid) throw new Error('Missing UUID parameter');
    
    // 3. 顯示載入動畫
    showLoading();
    
    // 4. 呼叫 Tap API
    const tapResult = await tapCard(uuid);
    await saveSession({ ...tapResult, card_uuid: uuid, created_at: Date.now() });
    
    // 5. 呼叫 Read API
    const readResult = await readCard(uuid, tapResult.session_id);
    await saveToCache(uuid, readResult.data);
    
    // 6. 隱藏載入動畫
    hideLoading();
    
    // 7. 渲染名片（v4.0 風格）
    renderCardV4(readResult.data, { language: lang, layout });
    
    // 8. 顯示 Session 資訊
    renderSessionInfo(readResult.session_info, lang);
    
    // 9. 啟動打字機效果
    startTypewriter(readResult.data.greetings, lang);
    
    // 10. 顯示操作按鈕
    showActions();
    
  } catch (error) {
    hideLoading();
    await handleError(error, { uuid, language: lang });
  }
}

// v4.0 風格渲染函數
function renderCardV4(cardData, options = {}) {
  const { language = 'zh', layout = 'official' } = options;
  
  // 1. 渲染姓名（支援雙語）
  const name = getLocalizedText(cardData.name, language);
  document.getElementById('user-name').innerText = name;
  
  // 2. 渲染職稱（支援雙語）
  const title = getLocalizedText(cardData.title, language);
  document.getElementById('user-title').innerText = title;
  
  // 3. 渲染大頭貼
  if (cardData.avatar) {
    document.getElementById('user-avatar').src = cardData.avatar;
  }
  
  // 4. 渲染聯絡資訊
  document.getElementById('user-email').innerText = cardData.email;
  document.getElementById('email-link').href = `mailto:${cardData.email}`;
  
  if (cardData.phone) {
    document.getElementById('user-phone').innerText = cardData.phone;
    document.getElementById('phone-link').href = `tel:${cardData.phone.replace(/ /g,'')}`;
  }
  
  // 5. 渲染社群連結（使用 v4.0 的 SocialHandler）
  if (cardData.socialLinks && cardData.socialLinks.socialNote) {
    SocialHandler.parse(cardData.socialLinks.socialNote);
  }
  
  // 6. 顯示主容器
  document.getElementById('main-container').classList.remove('hidden');
}

// 打字機效果（v4.0 風格）
function startTypewriter(greetings, language = 'zh') {
  const el = document.getElementById('typewriter');
  const phrases = Array.isArray(greetings) 
    ? greetings 
    : (greetings[language] || greetings.zh || greetings.en || []);
  
  let i = 0, j = 0, isDel = false;
  
  const type = () => {
    const curr = phrases[i];
    el.textContent = isDel ? curr.substring(0, j--) : curr.substring(0, j++);
    
    if (!isDel && j > curr.length) {
      isDel = true;
      setTimeout(type, 2000);
    } else if (isDel && j === 0) {
      isDel = false;
      i = (i + 1) % phrases.length;
      setTimeout(type, 500);
    } else {
      setTimeout(type, isDel ? 30 : 80);
    }
  };
  
  type();
}

// Three.js 背景初始化（v4.0 風格）
function initThree() {
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f7f9);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 10);
  
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // 數據網格
  const gridGeo = new THREE.PlaneGeometry(150, 150, 45, 45);
  const gridMat = new THREE.MeshBasicMaterial({ 
    color: 0x6868ac, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.05 
  });
  grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2.2;
  grid.position.y = -6;
  scene.add(grid);
  
  // 粒子系統
  const starCount = 2000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPos[i] = (Math.random() - 0.5) * 50;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ 
    size: 0.05, 
    color: 0x6868ac, 
    transparent: true, 
    opacity: 0.3
  });
  mesh = new THREE.Points(starGeo, starMat);
  scene.add(mesh);
  
  animate();
}

// 頁面載入時執行
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


---

## 11. Avatar（大頭貼）處理指南

### 11.1 支援的圖片托管服務

#### 方案 1: Google Drive（推薦）

**優點**:
- ✅ 免費 15GB 儲存空間
- ✅ 整合 Google 帳號
- ✅ 穩定可靠
- ✅ 支援大檔案

**使用步驟**:
1. 上傳圖片到 Google Drive
2. 右鍵點擊圖片 → 「取得連結」
3. 設定為「知道連結的任何人」
4. 複製連結 ID（例如：`1a2b3c4d5e6f7g8h9i0j`）
5. 轉換為直接連結格式：
   ```
   https://drive.google.com/uc?export=view&id={FILE_ID}
   ```

**範例**:
```
原始連結: https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view?usp=sharing
直接連結: https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j
```

---

#### 方案 2: Imgur

**使用步驟**:
1. 上傳圖片到 https://imgur.com
2. 右鍵選擇「複製圖片網址」
3. 取得格式：`https://i.imgur.com/XXXXXX.jpg`

---

#### 方案 3: GitHub Repository

**使用步驟**:
1. 上傳圖片到 GitHub Repository
2. 開啟圖片，點擊「Raw」按鈕
3. 複製 URL：
   ```
   https://raw.githubusercontent.com/username/repo/main/assets/photo.jpg
   ```

---

#### 方案 4: PostImages

**使用步驟**:
1. 上傳圖片到 https://postimages.org
2. 複製 "Direct link" 網址
3. 格式：`https://i.postimg.cc/XXXXXX/image.jpg`

---

### 11.2 圖片規格建議

| 項目 | 建議值 | 說明 |
|------|--------|------|
| 尺寸 | 200x200 至 800x800 像素 | 正方形，適合圓形裁切 |
| 格式 | JPG、PNG | 避免 GIF 動圖 |
| 大小 | < 1MB | 確保快速載入 |
| 背景 | 純色或專業背景 | 提升視覺效果 |
| 長寬比 | 1:1 | 正方形 |

---

### 11.3 前端處理邏輯

#### 渲染大頭貼
```javascript
function createAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  
  const container = document.createElement('div');
  container.className = 'avatar-container';
  
  const img = document.createElement('img');
  img.src = avatarUrl;
  img.alt = 'Avatar';
  img.className = 'avatar';
  
  // 圖片載入失敗時顯示預設頭像
  img.onerror = function() {
    this.src = '/assets/default-avatar.svg';
  };
  
  container.appendChild(img);
  return container;
}
```

#### CSS 樣式
```css
.avatar-container {
  width: 120px;
  height: 120px;
  margin: 0 auto 20px;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

---

### 11.4 管理介面（nfc-generator.html）

#### HTML 表單
```html
<div class="form-group">
  <label for="avatar">大頭貼 URL（選填）</label>
  <input type="url" 
         id="avatar" 
         placeholder="https://drive.google.com/uc?export=view&id=..."
         class="form-control">
  
  <div class="help-text">
    <p>支援的圖片托管服務：</p>
    <ul>
      <li><strong>Google Drive</strong>（推薦）: 
        <a href="#" onclick="showGoogleDriveGuide()">查看教學</a>
      </li>
      <li><strong>Imgur</strong>: https://imgur.com</li>
      <li><strong>GitHub</strong>: 使用 Raw URL</li>
    </ul>
  </div>
  
  <div id="avatar-preview" style="display:none">
    <img id="preview-img" class="avatar-preview">
  </div>
</div>
```

#### JavaScript 預覽
```javascript
// 即時預覽大頭貼
document.getElementById('avatar').addEventListener('input', function(e) {
  const url = e.target.value;
  const preview = document.getElementById('avatar-preview');
  const img = document.getElementById('preview-img');
  
  if (url) {
    img.src = url;
    preview.style.display = 'block';
    
    img.onerror = function() {
      preview.style.display = 'none';
      alert('圖片 URL 無效或無法訪問');
    };
  } else {
    preview.style.display = 'none';
  }
});

// Google Drive 教學彈窗
function showGoogleDriveGuide() {
  alert(`Google Drive 使用步驟：
  
1. 上傳圖片到 Google Drive
2. 右鍵點擊圖片 → 「取得連結」
3. 設定為「知道連結的任何人」
4. 複製連結 ID（例如：1a2b3c4d5e6f7g8h9i0j）
5. 轉換為直接連結格式：
   https://drive.google.com/uc?export=view&id={FILE_ID}

範例：
原始: https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view
直接: https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j`);
}
```

---

### 11.5 注意事項

#### 安全性
- ⚠️ 確保圖片 URL 使用 HTTPS
- ⚠️ Google Drive 連結需設定為「知道連結的任何人」
- ⚠️ 避免使用包含個人資訊的檔名

#### 隱私性
- ⚠️ 大頭貼為選填欄位，可選擇不提供
- ⚠️ 建議使用 Q 版頭像或專業照片
- ⚠️ 避免使用包含敏感資訊的背景

#### 效能
- ⚠️ 圖片大小建議 < 1MB
- ⚠️ 使用適當的圖片壓縮
- ⚠️ 考慮使用 WebP 格式（更小的檔案大小）

#### 相容性
- ⚠️ 測試圖片在不同裝置上的顯示效果
- ⚠️ 確保圖片在圓形裁切後仍清晰
- ⚠️ 提供載入失敗的備用方案

---

**END OF PRD**


---

## 12. v4.0 設計系統整合

### 12.1 設計參考

本頁面設計參考 `docs/v4.0名片顯示設計.html`，採用 **Governance Portal Light v3.1** 設計語言。

#### 設計特色
- ✅ 晶體卡片（Crystal Container）- 毛玻璃效果
- ✅ 3D 背景場域（Three.js 光纖網格）
- ✅ HUD 風格文字（Share Tech Mono 字體）
- ✅ 資訊晶片（Info Chips）- 懸浮互動效果
- ✅ 打字機效果問候語
- ✅ 社群連結聚落（Social Cluster）
- ✅ 載入動畫門戶
- ✅ QR Code 彈窗
- ✅ Session 資訊顯示

---

### 12.2 色彩系統

```css
:root {
  --moda-accent: #6868ac;
  --moda-glow: rgba(104, 104, 172, 0.2);
  --crystal-bg: rgba(255, 255, 255, 0.5);
  --ui-text: #1e1e3f;
}
```

---

### 12.3 字體系統

```css
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Outfit:wght@300;400;700&family=Noto+Sans+TC:wght@300;500;900&display=swap');

body {
  font-family: 'Outfit', 'Noto Sans TC', sans-serif;
}

.hud-text {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
}
```

---

### 12.4 核心元件

#### 晶體卡片
```css
.crystal-container {
  background: var(--crystal-bg);
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
  border: 1px solid rgba(104, 104, 172, 0.1);
  border-top: 5px solid var(--moda-accent);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}
```

#### 資訊晶片
```css
.info-chip {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(104, 104, 172, 0.05);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.info-chip:hover {
  background: #ffffff;
  border-color: var(--moda-accent);
  transform: translateY(-4px);
  box-shadow: 0 15px 30px -10px rgba(104, 104, 172, 0.15);
}
```

#### 社群連結節點
```css
.social-node {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(104, 104, 172, 0.1);
  color: var(--moda-accent);
  width: 48px;
  height: 48px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.social-node:hover {
  background: var(--moda-accent);
  color: #ffffff;
  transform: scale(1.15) rotate(5deg);
}
```

---

### 12.5 Three.js 背景實作

```javascript
function initThree() {
  const canvas = document.getElementById('three-canvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f7f9);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 10);
  
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // 數據網格
  const gridGeo = new THREE.PlaneGeometry(150, 150, 45, 45);
  const gridMat = new THREE.MeshBasicMaterial({ 
    color: 0x6868ac, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.05 
  });
  grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2.2;
  grid.position.y = -6;
  scene.add(grid);
  
  // 粒子系統
  const starCount = 2000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPos[i] = (Math.random() - 0.5) * 50;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ 
    size: 0.05, 
    color: 0x6868ac, 
    transparent: true, 
    opacity: 0.3
  });
  mesh = new THREE.Points(starGeo, starMat);
  scene.add(mesh);
  
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (mesh) mesh.rotation.y += 0.0003;
  if (grid) {
    grid.position.z += 0.012;
    if (grid.position.z > 5) grid.position.z = 0;
  }
  renderer.render(scene, camera);
}
```

---

### 12.6 社群連結解析器

```javascript
const SocialHandler = {
  parse(text) {
    const cluster = document.getElementById('social-cluster');
    cluster.innerHTML = '';
    
    const platforms = [
      { key: 'FB', icon: 'facebook', url: u => `https://fb.com/${u.replace('@','')}` },
      { key: 'IG', icon: 'instagram', url: u => `https://instagram.com/${u.replace('@','')}` },
      { key: 'GitHub', icon: 'github', url: u => `https://github.com/${u}` },
      { key: 'LinkedIn', icon: 'linkedin', url: u => `https://linkedin.com/in/${u}` },
      { key: 'X', icon: 'twitter', url: u => `https://twitter.com/${u.replace('@','')}` },
      { key: 'YouTube', icon: 'youtube', url: u => `https://youtube.com/@${u.replace('@','')}` },
      { key: 'Discord', icon: 'hash', url: u => `https://discord.gg/${u}` }
    ];
    
    if (!text) return;
    
    text.split('\n').forEach(line => {
      platforms.forEach(p => {
        const reg = new RegExp(`${p.key}:\\s*([\\w\\.-@\\/]+)`, 'i');
        const m = line.match(reg);
        if (m) {
          const node = document.createElement('a');
          node.href = p.url(m[1]);
          node.target = '_blank';
          node.className = "social-node flex items-center justify-center";
          node.innerHTML = `<i data-lucide="${p.icon}" class="w-5 h-5"></i>`;
          cluster.appendChild(node);
        }
      });
    });
    
    lucide.createIcons();
  }
};
```

---

### 12.7 打字機效果

```javascript
function startTypewriter(greetings, language = 'zh') {
  const el = document.getElementById('typewriter');
  const phrases = Array.isArray(greetings) 
    ? greetings 
    : (greetings[language] || greetings.zh || greetings.en || []);
  
  let i = 0, j = 0, isDel = false;
  
  const type = () => {
    const curr = phrases[i];
    el.textContent = isDel ? curr.substring(0, j--) : curr.substring(0, j++);
    
    if (!isDel && j > curr.length) {
      isDel = true;
      setTimeout(type, 2000);
    } else if (isDel && j === 0) {
      isDel = false;
      i = (i + 1) % phrases.length;
      setTimeout(type, 500);
    } else {
      setTimeout(type, isDel ? 30 : 80);
    }
  };
  
  type();
}
```

---

### 12.8 依賴項目

#### CDN 資源
```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest"></script>

<!-- Three.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Outfit:wght@300;400;700&family=Noto+Sans+TC:wght@300;500;900&display=swap" rel="stylesheet">
```

---

### 12.9 完整 HTML 結構（v4.0 風格）

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>數位名片 | Governance Portal Light v3.1</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Outfit:wght@300;400;700&family=Noto+Sans+TC:wght@300;500;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/v4-design.css">
</head>
<body>
  <!-- 背景 3D 光纖場域 -->
  <canvas id="three-canvas"></canvas>

  <!-- 載入動畫門戶 -->
  <div id="loading" class="fixed inset-0 bg-[#f8fafd] z-[100] flex flex-col items-center justify-center">
    <div class="relative w-32 h-32">
      <div class="absolute inset-0 border-2 border-indigo-100 rounded-full animate-ping"></div>
      <div class="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
      <div class="absolute inset-0 flex items-center justify-center text-indigo-500">
        <i data-lucide="shield-check" class="w-10 h-10 animate-pulse"></i>
      </div>
    </div>
    <p class="mt-8 hud-text animate-pulse">Synchronizing Secure Identity...</p>
  </div>

  <!-- UI 工具列 -->
  <div id="ui-header" class="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-start">
    <div class="space-y-1">
      <p class="hud-text opacity-40">IDENTITY_NODE_V4</p>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <span class="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Authenticated Session</span>
      </div>
    </div>
    <button id="lang-switch" class="px-5 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm transition-all uppercase tracking-widest">
      繁中 / EN
    </button>
  </div>

  <!-- 主容器 -->
  <div id="main-container" class="relative z-10 w-full max-w-4xl px-4 py-24 hidden reveal">
    <main class="crystal-container rounded-3xl overflow-hidden shadow-2xl">
      <!-- 背景浮水印 -->
      <div class="watermark -top-5 -left-10">AUTHENTIC</div>
      <div class="watermark bottom-10 -right-20">VERIFIED</div>

      <!-- 身分首部 -->
      <div class="p-10 lg:p-20 border-b border-indigo-50 flex flex-col lg:flex-row gap-12 items-center lg:items-start relative z-10">
        <div class="relative">
          <div class="absolute -inset-4 border border-indigo-100 pointer-events-none"></div>
          <img id="user-avatar" src="" class="w-48 h-48 lg:w-60 lg:h-60 object-cover border-4 border-white shadow-xl">
          <div class="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-xl shadow-lg">
            <i data-lucide="badge-check" class="w-6 h-6"></i>
          </div>
        </div>

        <div class="flex-1 text-center lg:text-left">
          <p class="hud-text mb-4 opacity-40">Digital Identity Protocol</p>
          <h1 id="user-name" class="text-5xl lg:text-7xl font-black tracking-tighter text-slate-900 mb-2 italic">---</h1>
          <p id="user-title" class="text-indigo-600 font-bold tracking-widest text-sm uppercase">---</p>
          
          <div class="mt-8 pt-8 border-t border-indigo-50">
            <p class="hud-text mb-4 opacity-40">Dynamic Transmission Feed</p>
            <p id="typewriter" class="text-slate-600 font-medium italic min-h-[1.5em] text-lg cursor"></p>
          </div>
        </div>
      </div>

      <!-- 資訊晶片網格 -->
      <div class="p-8 lg:p-14 grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        <a id="email-link" href="#" class="info-chip p-6 rounded-2xl flex items-center gap-6 group">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <i data-lucide="mail" class="w-5 h-5"></i>
          </div>
          <div>
            <p class="hud-text text-[8px] opacity-40">Communication Node</p>
            <p id="user-email" class="font-bold text-slate-700">---</p>
          </div>
        </a>
        
        <a id="phone-link" href="#" class="info-chip p-6 rounded-2xl flex items-center gap-6 group">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <i data-lucide="phone" class="w-5 h-5"></i>
          </div>
          <div>
            <p class="hud-text text-[8px] opacity-40">Voice Access</p>
            <p id="user-phone" class="font-bold text-slate-700">---</p>
          </div>
        </a>
      </div>

      <!-- 社群連結聚落 -->
      <div id="social-cluster" class="px-10 lg:px-14 pb-14 flex flex-wrap gap-4 justify-center lg:justify-start relative z-10">
        <!-- 由 SocialHandler.parse() 動態注入 -->
      </div>
    </main>

    <!-- 頁尾控制 -->
    <div class="mt-10 w-full flex flex-col md:flex-row gap-6">
      <button id="save-vcard" class="flex-1 bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.3em] py-5 px-8 rounded-2xl hover:bg-indigo-600 shadow-xl transition-all flex items-center justify-center gap-4">
        <i data-lucide="user-plus" class="w-4 h-4"></i>
        Sync Identity
      </button>
      <button id="open-qr" class="bg-white border border-slate-200 text-slate-700 px-8 py-5 rounded-2xl hover:bg-slate-50 shadow-sm transition-all">
        <i data-lucide="qr-code" class="w-6 h-6"></i>
      </button>
    </div>

    <!-- Session 資訊 -->
    <div id="token-info" class="mt-12 opacity-40 text-center space-y-2">
      <p id="session-expiry" class="hud-text text-[8px] text-slate-400">SESSION EXPIRES: --</p>
      <p id="session-reads" class="hud-text text-[8px] text-slate-400">ATTEMPTS REMAINING: --</p>
    </div>
  </div>

  <!-- JavaScript 模組 -->
  <script src="js/config.js"></script>
  <script src="js/api.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/renderer-v4.js"></script>
  <script src="js/error-handler.js"></script>
  <script src="js/main-v4.js"></script>
</body>
</html>
```

---

### 12.10 整合要點

#### 1. 保留 v4.0 視覺設計
- Three.js 3D 背景
- 晶體卡片效果
- HUD 風格文字
- 資訊晶片互動

#### 2. 整合後端 API
- 替換 MOCK_DATA 為 API 呼叫
- 新增錯誤處理
- 新增 IndexedDB 儲存
- 新增離線快取

#### 3. 支援雙語
- 使用 getLocalizedText() 處理雙語欄位
- 語言切換按鈕整合
- 打字機效果支援雙語陣列

#### 4. Session 資訊顯示
- 顯示有效期限（expires_at）
- 顯示剩餘次數（reads_remaining）
- HUD 風格呈現

---

**END OF PRD**
