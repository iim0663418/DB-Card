# Frontend Migration PRD - 完全遷移到後端架構

**Version**: 1.0.0  
**Date**: 2026-01-18  
**Status**: READY FOR IMPLEMENTATION  
**Owner**: Frontend Team  
**Backend API**: ✅ Phase 2 & 3 Complete (fbb4d89, de6ac7b)

---

## 1. Executive Summary

### 1.1 目標
完全遷移到後端加密架構，放棄原始純前端 Base64 模式，實現：
- 名片資料後端加密儲存
- ReadSession 授權機制
- 名片撤銷與讀取次數控制
- 管理員介面整合

### 1.2 影響範圍
- 🔴 **破壞性變更**: 所有現有 NFC 卡片需重新寫入
- 🔴 **架構變更**: 從純前端改為前後端分離
- 🔴 **功能移除**: 離線 Base64 解析模式

---

## 2. API 端點規格

### 2.1 使用者端 API

#### 2.1.1 POST /api/nfc/tap
**用途**: NFC 碰卡簽發 ReadSession

**Request**:
```http
POST /api/nfc/tap
Content-Type: application/json

{
  "uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200)**:
```json
{
  "session_id": "sess_a1b2c3d4e5f6",
  "expires_at": "2026-01-19T13:38:18.763Z",
  "reads_remaining": 20,
  "card_type": "personal"
}
```

**Error Cases**:
- 404: card_not_found - 名片不存在
- 403: card_inactive - 名片已停用
- 429: rate_limit_exceeded - 請求過於頻繁（10 req/min）

---

#### 2.1.2 GET /api/read
**用途**: 讀取名片資料（需有效 ReadSession）

**Request**:
```http
GET /api/read?uuid=550e8400-e29b-41d4-a716-446655440000&session=sess_a1b2c3d4e5f6
```

**Response (200)**:
```json
{
  "data": {
    "name": "吳昇凡",
    "title": "數位策略司 司長",
    "department": "數位策略司",
    "email": "example@moda.gov.tw",
    "phone": "+886-2-2311-2345",
    "mobile": "+886-912-345-678",
    "avatar": "https://i.imgur.com/example.jpg",
    "greetings": ["很高興認識您！", "歡迎交流數位政策議題"],
    "socialLinks": {
      "email": "mailto:example@moda.gov.tw",
      "socialNote": "FB: fb.com/example\nIG: @example\nGitHub: github.com/example"
    }
  },
  "session": {
    "session_id": "sess_a1b2c3d4e5f6",
    "expires_at": "2026-01-19T13:38:18.763Z",
    "reads_remaining": 19,
    "card_type": "personal"
  }
}
```

**Error Cases**:
- 403: session_expired - 請再次碰卡以重新取得授權
- 403: session_revoked - 此授權已被撤銷
- 403: max_reads_exceeded - 已達讀取次數上限
- 404: session_not_found - Session 不存在

---

### 2.2 管理員 API

#### 2.2.1 POST /api/admin/cards
**用途**: 創建新名片

**Request**:
```http
POST /api/admin/cards
Authorization: Bearer 53d4bebc35f60d47f323b2d6ef764d3176e119db6406d0268028405522c26921
Content-Type: application/json

{
  "cardType": "personal",
  "data": {
    "name": "吳昇凡",
    "title": "數位策略司 司長",
    "department": "數位策略司",
    "email": "example@moda.gov.tw",
    "phone": "+886-2-2311-2345",
    "mobile": "+886-912-345-678",
    "avatar": "https://i.imgur.com/example.jpg",
    "greetings": ["很高興認識您！", "歡迎交流數位政策議題"],
    "socialLinks": {
      "email": "mailto:example@moda.gov.tw",
      "socialNote": "FB: fb.com/example\nIG: @example"
    }
  }
}
```

**Response (201)**:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "cardType": "personal",
  "created_at": "2026-01-18T13:38:18.763Z"
}
```

**Error Cases**:
- 401: unauthorized - 缺少授權 Token
- 403: forbidden - 無效的授權 Token（使用 timing-safe 比對）
- 400: invalid_request - 缺少必要欄位（name, email）
- 400: invalid_card_type - cardType 無效（須為 personal/event_booth/sensitive）
- 400: field_too_long - 欄位超過長度限制（name: 100, title: 100, email: 255）

---

#### 2.2.2 PUT /api/admin/cards/:uuid
**用途**: 更新名片資料

**Request**:
```http
PUT /api/admin/cards/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer 53d4bebc35f60d47f323b2d6ef764d3176e119db6406d0268028405522c26921
Content-Type: application/json

{
  "data": {
    "name": "吳昇凡",
    "title": "數位策略司 司長（更新）",
    "department": "數位策略司",
    "email": "new-email@moda.gov.tw",
    "phone": "+886-2-2311-2345",
    "mobile": "+886-912-345-678",
    "avatar": "https://i.imgur.com/new-photo.jpg",
    "greetings": ["更新後的問候語"],
    "socialLinks": {
      "email": "mailto:new-email@moda.gov.tw",
      "socialNote": "FB: fb.com/new"
    }
  }
}
```

**Response (200)**:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "updated_at": "2026-01-18T14:00:00.000Z",
  "sessions_revoked": 1
}
```

**說明**:
- 更新名片後會自動撤銷所有現有 ReadSession
- 使用者需重新碰卡取得新授權


---

#### 2.2.3 DELETE /api/admin/cards/:uuid
**用途**: 刪除名片（軟刪除）

**Request**:
```http
DELETE /api/admin/cards/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer 53d4bebc35f60d47f323b2d6ef764d3176e119db6406d0268028405522c26921
```

**Response (200)**:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "deleted_at": "2026-01-18T14:00:00.000Z",
  "sessions_revoked": 0
}
```

**說明**:
- 軟刪除：設定 `deleted_at` 時間戳，不實際刪除資料
- 撤銷所有現有 ReadSession
- 刪除後的名片無法再被讀取
- 支援冪等性：重複刪除回傳相同結果


---

## 3. 前端架構設計

### 3.1 NFC URL 格式（固定）

```
https://db-card.example.com/tap?uuid={UUID}
```

**範例**:
```
https://db-card.example.com/tap?uuid=550e8400-e29b-41d4-a716-446655440000
```

**長度**: 76 字元（符合 NTAG213 136 字元限制）

**說明**:
- UUID 為後端生成的唯一識別碼
- 不包含任何個人資料
- 支援 NFC 卡片重複寫入（UUID 不變）

---

### 3.2 前端流程設計

#### 3.2.1 NFC 碰卡流程

```mermaid
sequenceDiagram
    participant NFC as NFC 卡片
    participant Browser as 瀏覽器
    participant Frontend as 前端頁面
    participant API as 後端 API
    participant IDB as IndexedDB

    NFC->>Browser: 觸發 URL (uuid)
    Browser->>Frontend: 載入頁面
    Frontend->>API: POST /api/nfc/tap {uuid}
    API-->>Frontend: {session_id, expires_at, reads_remaining}
    Frontend->>IDB: 儲存 session 資訊
    Frontend->>API: GET /api/read?uuid&session
    API-->>Frontend: {data, session}
    Frontend->>IDB: 儲存名片資料
    Frontend->>Browser: 渲染名片介面
```

**關鍵步驟**:
1. 解析 URL 取得 `uuid`
2. 呼叫 `/api/nfc/tap` 取得 `session_id`
3. 使用 `session_id` 呼叫 `/api/read` 取得名片資料
4. 儲存至 IndexedDB 供離線使用
5. 渲染名片介面

#### 3.2.2 session_id 傳遞策略

**不使用 URL Fragment** (簡化設計):
- ❌ 原規格:  (ADR-003)
- ✅ 新設計: 直接從  API 回應取得 session_id
- ✅ 理由: 簡化前端邏輯，session_id 不需在 URL 中傳遞

---

### 3.3 IndexedDB Schema

#### 3.3.1 active_sessions (授權層)

**用途**: 儲存當前有效的 ReadSession

**資料結構**:
```typescript
interface ActiveSession {
  uuid: string;              // 名片 UUID
  session_id: string;        // Session ID
  expires_at: string;        // ISO 8601 格式
  reads_remaining: number;   // 剩餘讀取次數
  card_type: string;         // personal | event_booth | sensitive
  created_at: string;        // 本地建立時間
}
```

**索引**:
- Primary Key: `uuid`
- Index: `session_id`

**清理策略**:
- 每次啟動時清理過期 session
- 讀取次數歸零時自動刪除


---

#### 3.3.2 exchange_history (名片快取層)

**用途**: 快取已讀取的名片資料供離線使用

**資料結構**:
```typescript
interface ExchangeHistory {
  uuid: string;              // 名片 UUID (Primary Key)
  data: CardData;            // 完整名片資料
  cached_at: string;         // 快取時間
  last_accessed: string;     // 最後存取時間
  access_count: number;      // 存取次數
}

interface CardData {
  name: string;
  title?: string;
  department?: string;
  email: string;
  phone?: string;
  mobile?: string;
  avatar?: string;
  greetings?: string[];
  socialLinks?: {
    email?: string;
    socialNote?: string;
  };
}
```

**保留策略**:
- 最多保留 200 筆
- 保留 7 天
- 超過限制時刪除最舊的記錄（依 `last_accessed` 排序）

**清理邏輯**:
```javascript
async function cleanupCache() {
  const records = await db.exchange_history.toArray();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  // 刪除超過 7 天的記錄
  const expired = records.filter(r => now - new Date(r.cached_at).getTime() > sevenDays);
  await db.exchange_history.bulkDelete(expired.map(r => r.uuid));
  
  // 保留最近 200 筆
  const remaining = await db.exchange_history.orderBy('last_accessed').reverse().toArray();
  if (remaining.length > 200) {
    const toDelete = remaining.slice(200);
    await db.exchange_history.bulkDelete(toDelete.map(r => r.uuid));
  }
}
```

---

### 3.4 錯誤處理設計

#### 3.4.1 網路錯誤

```javascript
async function handleNetworkError(error) {
  // 檢查是否有快取資料
  const cached = await db.exchange_history.get(uuid);
  
  if (cached) {
    // 顯示快取資料 + 離線標籤
    renderCard(cached.data, { offline: true });
    showNotification('目前為離線模式，顯示快取資料', 'warning');
  } else {
    // 無快取資料，顯示錯誤
    showError('網路連線失敗，且無快取資料可顯示');
    showRetryButton();
  }
}
```

#### 3.4.2 Session 過期

```javascript
async function handleSessionExpired(uuid) {
  // 顯示友善提示
  showNotification('授權已過期，請重新碰卡', 'info');
  
  // 清理過期 session
  await db.active_sessions.delete(uuid);
  
  // 檢查是否有快取資料
  const cached = await db.exchange_history.get(uuid);
  if (cached) {
    renderCard(cached.data, { offline: true, expired: true });
  } else {
    showRetapPrompt(); // 顯示重新碰卡提示
  }
}
```

#### 3.4.3 讀取次數用盡

```javascript
async function handleMaxReadsExceeded(uuid) {
  // 顯示友善提示
  showNotification('已達讀取次數上限，請重新碰卡取得新授權', 'warning');
  
  // 清理 session
  await db.active_sessions.delete(uuid);
  
  // 顯示快取資料（如果有）
  const cached = await db.exchange_history.get(uuid);
  if (cached) {
    renderCard(cached.data, { offline: true, maxReadsExceeded: true });
    showRetapPrompt(); // 顯示重新碰卡按鈕
  }
}
```

---

## 4. 頁面改造需求

### 4.1 名片顯示頁面 (index*.html)

#### 4.1.1 移除功能
- ❌ Base64 解析邏輯
- ❌ URL  參數支援
- ❌ 純前端資料渲染

#### 4.1.2 新增功能
- ✅ UUID 參數解析
- ✅ POST /api/nfc/tap 呼叫
- ✅ GET /api/read 呼叫
- ✅ IndexedDB 儲存
- ✅ 錯誤處理與重試
- ✅ 離線快取顯示

#### 4.1.3 核心 JavaScript 邏輯

```javascript
// main.js - 主要邏輯
const API_BASE = 'https://db-card-api-staging.csw30454.workers.dev';

async function init() {
  const params = new URLSearchParams(window.location.search);
  const uuid = params.get('uuid');
  
  if (!uuid) {
    showError('無效的名片連結');
    return;
  }
  
  try {
    // Step 1: 檢查是否有有效 session
    let session = await db.active_sessions.get(uuid);
    
    if (!session || isExpired(session)) {
      // Step 2: 呼叫 /api/nfc/tap 取得新 session
      const tapRes = await fetch(`${API_BASE}/api/nfc/tap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid })
      });
      
      if (!tapRes.ok) {
        throw new Error(await tapRes.text());
      }
      
      session = await tapRes.json();
      await db.active_sessions.put({ uuid, ...session, created_at: new Date().toISOString() });
    }
    
    // Step 3: 呼叫 /api/read 取得名片資料
    const readRes = await fetch(
      `${API_BASE}/api/read?uuid=${uuid}&session=${session.session_id}`
    );
    
    if (!readRes.ok) {
      const error = await readRes.json();
      if (error.error === 'session_expired') {
        return handleSessionExpired(uuid);
      }
      if (error.error === 'max_reads_exceeded') {
        return handleMaxReadsExceeded(uuid);
      }
      throw new Error(error.message);
    }
    
    const result = await readRes.json();
    
    // Step 4: 更新 session 資訊
    await db.active_sessions.put({
      uuid,
      session_id: result.session.session_id,
      expires_at: result.session.expires_at,
      reads_remaining: result.session.reads_remaining,
      card_type: result.session.card_type,
      created_at: session.created_at
    });
    
    // Step 5: 快取名片資料
    await db.exchange_history.put({
      uuid,
      data: result.data,
      cached_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      access_count: (await db.exchange_history.get(uuid))?.access_count + 1 || 1
    });
    
    // Step 6: 渲染名片
    renderCard(result.data, { 
      session: result.session,
      offline: false 
    });
    
  } catch (error) {
    console.error('Error:', error);
    handleNetworkError(error);
  }
}

function isExpired(session) {
  return new Date(session.expires_at) < new Date() || session.reads_remaining <= 0;
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', init);
```

---

### 4.2 NFC 生成器 (nfc-generator.html)

#### 4.2.1 移除功能
- ❌ Base64 編碼生成
- ❌ 純前端 URL 生成

#### 4.2.2 新增功能
- ✅ SETUP_TOKEN 輸入欄位
- ✅ POST /api/admin/cards 呼叫
- ✅ UUID 回傳與顯示
- ✅ NFC URL 生成（含 UUID）
- ✅ 錯誤處理

#### 4.2.3 核心邏輯

```javascript
// nfc-generator.js
const API_BASE = 'https://db-card-api-staging.csw30454.workers.dev';

async function createCard() {
  const setupToken = document.getElementById('setup-token').value;
  const cardType = document.getElementById('card-type').value;
  
  // 收集表單資料
  const data = {
    name: document.getElementById('name').value,
    title: document.getElementById('title').value,
    department: document.getElementById('department').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    mobile: document.getElementById('mobile').value,
    avatar: document.getElementById('avatar').value,
    greetings: document.getElementById('greetings').value.split('\n').filter(g => g.trim()),
    socialLinks: {
      email: `mailto:${document.getElementById('email').value}`,
      socialNote: document.getElementById('social-note').value
    }
  };
  
  try {
    const res = await fetch(`${API_BASE}/api/admin/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${setupToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cardType, data })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || '創建失敗');
    }
    
    const result = await res.json();
    
    // 生成 NFC URL
    const nfcUrl = `https://db-card.example.com/tap?uuid=${result.uuid}`;
    
    // 顯示結果
    document.getElementById('result-uuid').textContent = result.uuid;
    document.getElementById('result-url').textContent = nfcUrl;
    document.getElementById('result-container').classList.remove('hidden');
    
    // 生成 QR Code
    generateQRCode(nfcUrl);
    
    showNotification('名片創建成功！請將 URL 寫入 NFC 卡片', 'success');
    
  } catch (error) {
    console.error('Error:', error);
    showError(error.message);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showNotification('已複製到剪貼簿', 'success');
}

// 表單提交
document.getElementById('create-form').addEventListener('submit', (e) => {
  e.preventDefault();
  createCard();
});
```

---

### 4.3 PWA 離線收納 (pwa-card-storage/)

#### 4.3.1 調整策略
- ✅ 保留 IndexedDB 儲存
- ✅ 快取已讀取的名片資料
- ⚠️ 離線模式僅顯示快取資料（標註「離線模式」）
- ⚠️ 線上時檢查 ReadSession 有效性

#### 4.3.2 核心功能調整

**storage.js**:
```javascript
// 新增 API 整合
async function syncWithBackend(uuid) {
  const session = await db.active_sessions.get(uuid);
  
  if (!session || isExpired(session)) {
    return { success: false, reason: 'session_expired' };
  }
  
  try {
    const res = await fetch(
      `${API_BASE}/api/read?uuid=${uuid}&session=${session.session_id}`
    );
    
    if (!res.ok) {
      return { success: false, reason: 'api_error' };
    }
    
    const result = await res.json();
    
    // 更新快取
    await db.exchange_history.put({
      uuid,
      data: result.data,
      cached_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      access_count: (await db.exchange_history.get(uuid))?.access_count + 1 || 1
    });
    
    return { success: true, data: result.data };
    
  } catch (error) {
    return { success: false, reason: 'network_error' };
  }
}
```

**offline-tools.js**:
```javascript
// 離線 QR 碼生成（使用快取資料）
async function generateOfflineQR(uuid) {
  const cached = await db.exchange_history.get(uuid);
  
  if (!cached) {
    showError('無快取資料可生成 QR 碼');
    return;
  }
  
  // 生成 vCard 格式
  const vcard = generateVCard(cached.data);
  
  // 使用 qrcode.js 生成 QR 碼
  const qr = new QRCode(document.getElementById('qr-container'), {
    text: vcard,
    width: 240,
    height: 240
  });
  
  showNotification('已生成離線 QR 碼（vCard 格式）', 'info');
}
```


---

## 5. 環境配置

### 5.1 API Base URL

**Staging**:
```javascript
const API_BASE = 'https://db-card-api-staging.csw30454.workers.dev';
```

**Production** (待部署):
```javascript
const API_BASE = 'https://api.db-card.moda.gov.tw';
```

**環境檢測**:
```javascript
const API_BASE = window.location.hostname === 'localhost'
  ? 'https://db-card-api-staging.csw30454.workers.dev'
  : 'https://api.db-card.moda.gov.tw';
```


### 5.2 SETUP_TOKEN 管理

**開發環境**:
- 儲存在 localStorage (僅限開發)
- 提供輸入介面

**生產環境**:
- 建議使用獨立管理介面
- 不在前端暴露 Token

---

## 6. 雙語支援整合

### 6.1 雙語資料格式

後端支援兩種格式：

**單語格式**:
```json
{
  "name": "吳昇凡",
  "title": "數位策略司 司長",
  "greetings": ["很高興認識您！"]
}
```

**雙語格式**:
```json
{
  "name": { "zh": "吳昇凡", "en": "Wu Sheng-Fan" },
  "title": { "zh": "數位策略司 司長", "en": "Director General, Department of Digital Strategy" },
  "greetings": {
    "zh": ["很高興認識您！"],
    "en": ["Nice to meet you!"]
  }
}
```

---

### 6.2 前端處理邏輯

```javascript
// utils/bilingual.js
function getLocalizedText(value, language = 'zh') {
  if (!value) return '';
  
  // 單語格式
  if (typeof value === 'string') {
    return value;
  }
  
  // 雙語格式
  if (typeof value === 'object' && (value.zh || value.en)) {
    return value[language] || value.zh || value.en || '';
  }
  
  return '';
}

function getLocalizedArray(value, language = 'zh') {
  if (!value) return [];
  
  // 單語陣列
  if (Array.isArray(value)) {
    return value;
  }
  
  // 雙語陣列
  if (typeof value === 'object' && (value.zh || value.en)) {
    return value[language] || value.zh || value.en || [];
  }
  
  return [];
}
```

---

### 6.3 渲染範例

```javascript
function renderCard(data, options = {}) {
  const language = options.language || 'zh';
  
  // 姓名
  document.getElementById('user-name').textContent = 
    getLocalizedText(data.name, language);
  
  // 職稱
  document.getElementById('user-title').textContent = 
    getLocalizedText(data.title, language);
  
  // 問候語（打字機效果）
  const greetings = getLocalizedArray(data.greetings, language);
  if (greetings.length > 0) {
    startTypewriter(greetings, language);
  }
  
  // 其他欄位（不支援雙語）
  document.getElementById('user-email').textContent = data.email;
  document.getElementById('user-phone').textContent = data.phone || '';
}
```

---

### 6.4 語言切換

```javascript
let currentLanguage = 'zh';

function toggleLanguage() {
  currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
  
  // 重新渲染名片
  const cachedData = getCurrentCardData();
  renderCard(cachedData, { language: currentLanguage });
  
  // 更新按鈕文字
  document.getElementById('lang-switch').textContent = 
    currentLanguage === 'zh' ? 'EN' : '繁中';
}

document.getElementById('lang-switch').addEventListener('click', toggleLanguage);
```

---

### 6.1 功能測試

- [ ] NFC 碰卡流程完整測試
- [ ] Session 過期處理
- [ ] 讀取次數限制測試
- [ ] 網路錯誤處理
- [ ] 離線快取顯示
- [ ] 管理員創建名片
- [ ] 管理員更新名片
- [ ] 管理員刪除名片

### 6.2 相容性測試

- [ ] iOS Safari (iPhone 7+)
- [ ] Android Chrome
- [ ] Desktop Chrome/Firefox/Safari

### 6.3 效能測試

- [ ] API 回應時間 < 500ms
- [ ] 名片渲染時間 < 200ms
- [ ] IndexedDB 讀寫效能

---

## 7. 遷移計畫

### 7.1 Phase 1: 前端改造 (Week 1)
- [ ] 改造 index*.html (9 個檔案)
- [ ] 改造 nfc-generator.html
- [ ] 實作 IndexedDB 管理
- [ ] 實作錯誤處理

### 7.2 Phase 2: PWA 調整 (Week 2)
- [ ] 調整 storage.js
- [ ] 調整 offline-tools.js
- [ ] 實作離線快取策略
- [ ] 測試離線功能

### 7.3 Phase 3: 測試與部署 (Week 3)
- [ ] 完整功能測試
- [ ] 相容性測試
- [ ] 效能測試
- [ ] 生產環境部署

### 7.4 Phase 4: NFC 卡片遷移 (Week 4+)
- [ ] 通知使用者重新寫入 NFC 卡片
- [ ] 提供遷移工具
- [ ] 逐步淘汰舊格式

---

## 8. 風險與緩解

### 8.1 風險

1. **所有現有 NFC 卡片失效**
   - 影響: 高
   - 緩解: 提供遷移工具與通知

2. **離線功能受限**
   - 影響: 中
   - 緩解: 實作快取策略

3. **網路依賴增加**
   - 影響: 中
   - 緩解: 優化 API 效能，實作重試機制

### 8.2 回滾計畫

- 保留原始 v3.x 版本程式碼
- 提供舊版本 URL 供緊急使用
- 資料庫備份與還原機制

---

## 9. 附錄

### 9.1 CardData 完整欄位

```typescript
interface CardData {
  // 必填欄位
  name: string;              // 姓名（最大 100 字元）
  email: string;             // Email（最大 255 字元）
  
  // 選填欄位
  title?: string;            // 職稱（最大 100 字元）
  department?: string;       // 部門（最大 100 字元）
  phone?: string;            // 電話（最大 50 字元）
  mobile?: string;           // 手機（最大 50 字元）
  avatar?: string;           // 大頭貼 URL（最大 500 字元）
  greetings?: string[];      // 問候語陣列（每項最大 200 字元）
  
  // 社群連結
  socialLinks?: {
    email?: string;          // Email 連結
    socialNote?: string;     // 社群媒體資訊（最大 500 字元）
  };
}
```

**雙語支援**:
```typescript
// 支援雙語格式
type BilingualString = string | { zh: string; en: string };
type BilingualStringArray = string[] | { zh: string[]; en: string[] };

interface CardDataBilingual {
  name: BilingualString;
  title?: BilingualString;
  department?: string;       // 不支援雙語（前端翻譯）
  email: string;
  phone?: string;
  mobile?: string;
  avatar?: string;
  greetings?: BilingualStringArray;
  socialLinks?: {
    email?: string;
    socialNote?: string;
  };
}
```

### 9.2 CardType 枚舉

```typescript
enum CardType {
  PERSONAL = 'personal',       // 個人名片
  EVENT_BOOTH = 'event_booth', // 活動攤位
  SENSITIVE = 'sensitive'      // 敏感資料
}
```

**對應 Policy**:
| CardType | max_reads | ttl | 說明 |
|----------|-----------|-----|------|
| personal | 20 | 24h | 一般個人名片，適合日常交換 |
| event_booth | 50 | 24h | 活動攤位，高頻率交換 |
| sensitive | 5 | 24h | 敏感資料，限制讀取次數 |

**Policy 實作** (後端):
```typescript
const CARD_TYPE_POLICIES = {
  personal: { max_reads: 20, ttl_hours: 24 },
  event_booth: { max_reads: 50, ttl_hours: 24 },
  sensitive: { max_reads: 5, ttl_hours: 24 }
};
```

---

**END OF PRD**


---

## 10. v4.0 設計系統整合

### 10.1 設計參考

參考 `docs/CARD-DISPLAY-PAGE-PRD.md` 第 12 節，採用 **Governance Portal Light v3.1** 設計語言。

**核心元件**:
- ✅ Three.js 3D 背景（光纖網格 + 粒子系統）
- ✅ 晶體卡片（毛玻璃效果）
- ✅ HUD 風格文字（Share Tech Mono）
- ✅ 資訊晶片（懸浮互動）
- ✅ 社群連結聚落
- ✅ 打字機效果問候語
- ✅ Session 資訊顯示

---

### 10.2 Session 資訊顯示

```javascript
function renderSessionInfo(session) {
  // 有效期限
  const expiryDate = new Date(session.expires_at);
  document.getElementById('session-expiry').textContent = 
    `SESSION EXPIRES: ${expiryDate.toLocaleString('zh-TW')}`;
  
  // 剩餘次數
  document.getElementById('session-reads').textContent = 
    `ATTEMPTS REMAINING: ${session.reads_remaining}/${getMaxReads(session.card_type)}`;
  
  // 顯示 Session 資訊區塊
  document.getElementById('token-info').classList.remove('hidden');
}

function getMaxReads(cardType) {
  const policies = {
    personal: 20,
    event_booth: 50,
    sensitive: 5
  };
  return policies[cardType] || 20;
}
```

---

### 10.3 離線模式標籤

```javascript
function renderCard(data, options = {}) {
  // ... 原有渲染邏輯 ...
  
  // 離線模式標籤
  if (options.offline) {
    const badge = document.createElement('div');
    badge.className = 'offline-badge hud-text';
    badge.textContent = 'OFFLINE MODE';
    badge.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 165, 0, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 10px;
      letter-spacing: 2px;
    `;
    document.querySelector('.crystal-container').appendChild(badge);
  }
  
  // Session 過期標籤
  if (options.expired) {
    showNotification('授權已過期，顯示快取資料', 'warning');
  }
}
```

---

### 10.4 載入動畫整合

```javascript
async function init() {
  // 顯示載入動畫
  document.getElementById('loading').classList.remove('hidden');
  
  try {
    // ... API 呼叫邏輯 ...
    
    // 隱藏載入動畫
    document.getElementById('loading').classList.add('hidden');
    
    // 顯示主容器（帶動畫）
    const container = document.getElementById('main-container');
    container.classList.remove('hidden');
    container.classList.add('reveal');
    
  } catch (error) {
    document.getElementById('loading').classList.add('hidden');
    showError(error.message);
  }
}
```

---

### 10.5 完整整合範例

參考 `docs/CARD-DISPLAY-PAGE-PRD.md` 第 12.9 節的完整 HTML 結構，整合以下功能：

1. **Three.js 背景** - 使用 `initThree()` 初始化
2. **API 整合** - 替換 MOCK_DATA 為實際 API 呼叫
3. **IndexedDB 儲存** - 快取名片資料與 Session
4. **錯誤處理** - 網路錯誤、Session 過期、讀取次數用盡
5. **雙語支援** - 使用 `getLocalizedText()` 處理雙語欄位
6. **Session 顯示** - 顯示有效期限與剩餘次數

**整合步驟**:
```javascript
// 1. 初始化 Three.js 背景
document.addEventListener('DOMContentLoaded', () => {
  initThree();
  init(); // 主要邏輯
});

// 2. 主要邏輯（整合 API）
async function init() {
  const params = new URLSearchParams(window.location.search);
  const uuid = params.get('uuid');
  
  if (!uuid) {
    showError('無效的名片連結');
    return;
  }
  
  document.getElementById('loading').classList.remove('hidden');
  
  try {
    // 取得 Session
    let session = await db.active_sessions.get(uuid);
    
    if (!session || isExpired(session)) {
      const tapRes = await fetch(`${API_BASE}/api/nfc/tap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid })
      });
      
      if (!tapRes.ok) throw new Error(await tapRes.text());
      
      session = await tapRes.json();
      await db.active_sessions.put({ uuid, ...session, created_at: new Date().toISOString() });
    }
    
    // 讀取名片資料
    const readRes = await fetch(
      `${API_BASE}/api/read?uuid=${uuid}&session=${session.session_id}`
    );
    
    if (!readRes.ok) {
      const error = await readRes.json();
      if (error.error === 'session_expired') return handleSessionExpired(uuid);
      if (error.error === 'max_reads_exceeded') return handleMaxReadsExceeded(uuid);
      throw new Error(error.message);
    }
    
    const result = await readRes.json();
    
    // 更新 Session
    await db.active_sessions.put({
      uuid,
      session_id: result.session.session_id,
      expires_at: result.session.expires_at,
      reads_remaining: result.session.reads_remaining,
      card_type: result.session.card_type,
      created_at: session.created_at
    });
    
    // 快取名片資料
    await db.exchange_history.put({
      uuid,
      data: result.data,
      cached_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      access_count: (await db.exchange_history.get(uuid))?.access_count + 1 || 1
    });
    
    // 隱藏載入動畫
    document.getElementById('loading').classList.add('hidden');
    
    // 顯示主容器
    const container = document.getElementById('main-container');
    container.classList.remove('hidden');
    container.classList.add('reveal');
    
    // 渲染名片（v4.0 風格）
    renderCard(result.data, { 
      session: result.session,
      offline: false,
      language: 'zh'
    });
    
    // 顯示 Session 資訊
    renderSessionInfo(result.session);
    
    // 初始化社群連結
    SocialHandler.parse(result.data.socialLinks?.socialNote);
    
    // 啟動打字機效果
    const greetings = getLocalizedArray(result.data.greetings, 'zh');
    if (greetings.length > 0) {
      startTypewriter(greetings, 'zh');
    }
    
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('loading').classList.add('hidden');
    handleNetworkError(error);
  }
}
```

---

## 11. 實作優先順序

### Phase 1: 核心功能（Week 1）
1. ✅ 實作 API 整合邏輯（main.js）
2. ✅ 實作 IndexedDB 管理（storage.js）
3. ✅ 實作錯誤處理（error-handler.js）
4. ✅ 改造 index.html（單一版本測試）

### Phase 2: v4.0 設計整合（Week 2）
1. ✅ 整合 Three.js 背景
2. ✅ 實作晶體卡片樣式
3. ✅ 實作 Session 資訊顯示
4. ✅ 實作離線模式標籤
5. ✅ 測試完整流程

### Phase 3: 全面部署（Week 3）
1. ✅ 改造所有 9 個名片頁面
2. ✅ 改造 NFC 生成器
3. ✅ 調整 PWA 系統
4. ✅ 完整測試與驗收

### Phase 4: 生產部署（Week 4）
1. ✅ 生產環境配置
2. ✅ NFC 卡片遷移計畫
3. ✅ 使用者通知與教育
4. ✅ 監控與維護

---

**END OF PRD - READY FOR IMPLEMENTATION**
