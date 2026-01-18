# NFC Generator Page PRD

**Version**: 1.0.0  
**Date**: 2026-01-18  
**Status**: READY FOR DESIGN  
**Owner**: Frontend Team  
**Dependencies**: Backend API (Phase 3 Complete)

---

## 1. Executive Summary

### 1.1 目標
創建一個管理員介面，用於生成新的數位名片並產生 NFC 寫入 URL。

### 1.2 核心功能
- 📝 名片資料表單（支援單語/雙語）
- 🎨 即時預覽
- 🔐 SETUP_TOKEN 驗證
- 📱 NFC URL 生成與 QR Code
- 💾 歷史記錄管理

---

## 2. 頁面規格

### 2.1 URL 路徑
```
/nfc-generator
```

### 2.2 頁面結構

```
┌─────────────────────────────────────────┐
│  🇹🇼 moda NFC 名片生成器                │
├─────────────────────────────────────────┤
│  [SETUP_TOKEN 輸入區]                   │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  表單區域    │  │   即時預覽區     │  │
│  │             │  │                 │  │
│  │  - 姓名      │  │  [名片預覽]      │  │
│  │  - 職稱      │  │                 │  │
│  │  - 部門      │  │  [Session 資訊]  │  │
│  │  - Email    │  │                 │  │
│  │  - 電話      │  │                 │  │
│  │  - 手機      │  │                 │  │
│  │  - 大頭貼    │  │                 │  │
│  │  - 問候語    │  │                 │  │
│  │  - 社群連結  │  │                 │  │
│  │             │  │                 │  │
│  │  [生成按鈕]  │  │                 │  │
│  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│  [生成結果區]                           │
│  - UUID                                │
│  - NFC URL                             │
│  - QR Code                             │
│  - 複製按鈕                             │
└─────────────────────────────────────────┘
```

---

## 3. 功能需求

### 3.1 SETUP_TOKEN 驗證

**位置**: 頁面頂部固定區域

**UI 元件**:
```html
<div class="token-input-section">
  <label>SETUP_TOKEN (管理員權限)</label>
  <input type="password" id="setup-token" placeholder="請輸入管理員 Token">
  <button id="verify-token">驗證</button>
  <span id="token-status">未驗證</span>
</div>
```

**驗證邏輯**:
- 輸入後點擊「驗證」
- 呼叫 `/health` 端點測試（不消耗配額）
- 驗證成功：顯示綠色勾勾，啟用表單
- 驗證失敗：顯示紅色叉叉，禁用表單

---

### 3.2 名片資料表單

#### 3.2.1 基本資訊

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| 姓名 | 文字 | ✅ | 支援雙語 (zh/en) |
| 職稱 | 文字 | ❌ | 支援雙語 (zh/en) |
| 部門 | 文字 | ❌ | 單語（前端翻譯） |
| Email | Email | ✅ | 單語 |
| 電話 | 文字 | ❌ | 單語 |
| 手機 | 文字 | ❌ | 單語 |

#### 3.2.2 雙語輸入模式

**切換按鈕**: 
```
[單語模式] / [雙語模式]
```

**單語模式**:
```html
<input type="text" placeholder="姓名">
```

**雙語模式**:
```html
<div class="bilingual-input">
  <input type="text" placeholder="姓名 (中文)">
  <input type="text" placeholder="Name (English)">
</div>
```

#### 3.2.3 大頭貼

**輸入方式**: URL 輸入框

```html
<input type="url" placeholder="https://i.imgur.com/example.jpg">
<small>建議使用 Imgur、GitHub 或 Google Drive</small>
```

**預覽**: 即時顯示圖片

#### 3.2.4 問候語

**輸入方式**: Textarea（支援多行）

**單語模式**:
```html
<textarea placeholder="很高興認識您！&#10;歡迎交流數位政策議題"></textarea>
```

**雙語模式**:
```html
<textarea placeholder="問候語 (中文)"></textarea>
<textarea placeholder="Greetings (English)"></textarea>
```

**處理邏輯**: 
- 按換行符分割為陣列
- 單語: `["問候語1", "問候語2"]`
- 雙語: `{zh: ["問候語1"], en: ["Greeting1"]}`

#### 3.2.5 社群連結

**輸入方式**: Textarea

```html
<textarea placeholder="FB: fb.com/example&#10;IG: @example&#10;GitHub: github.com/example"></textarea>
```

**格式說明**:
```
支援格式：
FB: fb.com/username
IG: @username
GitHub: github.com/username
LinkedIn: linkedin.com/in/username
X: @username
YouTube: @username
Discord: discord.gg/invite
```

#### 3.2.6 名片類型

**選項**:
```html
<select id="card-type">
  <option value="personal">個人名片 (20 次讀取)</option>
  <option value="event_booth">活動攤位 (50 次讀取)</option>
  <option value="sensitive">敏感資料 (5 次讀取)</option>
</select>
```

---

### 3.3 即時預覽

**位置**: 表單右側

**功能**:
- 即時顯示名片外觀（使用 v4.0 設計）
- 顯示 Session 資訊（預估）
- 支援語言切換預覽

**實作方式**:
```javascript
// 監聽表單變化
document.querySelectorAll('input, textarea, select').forEach(el => {
  el.addEventListener('input', updatePreview);
});

function updatePreview() {
  const formData = collectFormData();
  renderPreviewCard(formData);
}
```

---

### 3.4 生成結果

**觸發**: 點擊「生成名片」按鈕

**API 呼叫**:
```javascript
const response = await fetch(`${API_BASE}/api/admin/cards`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${setupToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cardType: selectedType,
    cardData: formData
  })
});
```

**成功回應處理**:
```javascript
const { uuid } = await response.json();

// 生成 NFC URL
const nfcUrl = `${window.location.origin}/card-display?uuid=${uuid}`;

// 顯示結果
document.getElementById('result-uuid').textContent = uuid;
document.getElementById('result-url').textContent = nfcUrl;

// 生成 QR Code
new QRCode(document.getElementById('qr-result'), {
  text: nfcUrl,
  width: 200,
  height: 200
});
```

**顯示內容**:
```
✅ 名片已成功創建！

UUID: 550e8400-e29b-41d4-a716-446655440000
[複製]

NFC URL: https://db-card.example.com/card-display?uuid=550e8400-e29b-41d4-a716-446655440000
[複製]

[QR Code 圖片]
[下載 QR Code]

📝 下一步：
1. 使用 NFC Tools 寫入 URL 到 NFC 卡片
2. 或掃描 QR Code 測試名片
```

---

## 4. 設計規格

### 4.1 色彩系統

沿用 v4.0 設計：
```css
:root {
  --moda-accent: #6868ac;
  --moda-glow: rgba(104, 104, 172, 0.2);
  --crystal-bg: rgba(255, 255, 255, 0.5);
  --ui-text: #1e1e3f;
}
```

### 4.2 表單樣式

**輸入框**:
```css
.form-input {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(104, 104, 172, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.form-input:focus {
  border-color: var(--moda-accent);
  box-shadow: 0 0 0 3px var(--moda-glow);
}
```

**按鈕**:
```css
.btn-primary {
  background: var(--moda-accent);
  color: white;
  padding: 14px 32px;
  border-radius: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--moda-glow);
}
```

### 4.3 響應式設計

**桌面版** (>1024px):
- 左右分欄（表單 50% + 預覽 50%）

**平板版** (768px - 1024px):
- 左右分欄（表單 60% + 預覽 40%）

**手機版** (<768px):
- 上下排列
- 預覽區可摺疊

---

## 5. 錯誤處理

### 5.1 表單驗證

**必填欄位檢查**:
```javascript
function validateForm() {
  const errors = [];
  
  if (!formData.name) {
    errors.push('姓名為必填欄位');
  }
  
  if (!formData.email) {
    errors.push('Email 為必填欄位');
  }
  
  if (formData.email && !isValidEmail(formData.email)) {
    errors.push('Email 格式不正確');
  }
  
  return errors;
}
```

**即時驗證**:
- 輸入時顯示錯誤提示
- 紅色邊框標示錯誤欄位

### 5.2 API 錯誤

**401/403 - 授權失敗**:
```
❌ 授權失敗
SETUP_TOKEN 無效或已過期，請重新輸入。
```

**400 - 資料驗證失敗**:
```
❌ 資料驗證失敗
- 姓名長度超過 100 字元
- Email 格式不正確
```

**500 - 伺服器錯誤**:
```
❌ 伺服器錯誤
請稍後再試，或聯繫系統管理員。
```

---

## 6. 進階功能（可選）

### 6.1 歷史記錄

**功能**: 顯示最近創建的 10 張名片

**儲存方式**: LocalStorage

```javascript
const history = JSON.parse(localStorage.getItem('card-history') || '[]');
history.unshift({
  uuid,
  name: formData.name,
  createdAt: new Date().toISOString()
});
localStorage.setItem('card-history', JSON.stringify(history.slice(0, 10)));
```

**顯示**:
```
📋 最近創建的名片

1. 吳昇凡 - 2026-01-18 14:30
   UUID: 550e8400-e29b-41d4-a716-446655440000
   [查看] [複製 URL]

2. 測試用戶 - 2026-01-18 13:20
   ...
```

### 6.2 批次生成

**功能**: 上傳 CSV 批次創建名片

**CSV 格式**:
```csv
name,title,department,email,phone,mobile
吳昇凡,司長,數位策略司,test@moda.gov.tw,02-2311-2345,0912-345-678
```

### 6.3 範本功能

**功能**: 儲存常用設定為範本

**範本內容**:
- 部門
- 社群連結格式
- 問候語

---

## 7. 技術規格

### 7.1 檔案結構

```
workers/public/
├── nfc-generator.html
├── css/
│   └── generator.css
└── js/
    ├── generator.js
    └── form-validator.js
```

### 7.2 依賴項目

**已有**:
- Tailwind CSS (CDN)
- Lucide Icons
- QRCode.js

**新增**:
- 表單驗證庫（可選）

### 7.3 API 整合

**使用端點**:
- POST /api/admin/cards - 創建名片
- GET /health - Token 驗證（可選）

---

## 8. 測試需求

### 8.1 功能測試

- [ ] SETUP_TOKEN 驗證
- [ ] 單語模式表單提交
- [ ] 雙語模式表單提交
- [ ] 必填欄位驗證
- [ ] Email 格式驗證
- [ ] 即時預覽更新
- [ ] QR Code 生成
- [ ] URL 複製功能
- [ ] 錯誤處理顯示

### 8.2 UI 測試

- [ ] 響應式設計（手機/平板/桌面）
- [ ] 表單樣式一致性
- [ ] 按鈕 hover 效果
- [ ] 載入動畫
- [ ] 成功/錯誤提示

---

## 9. 交付物

### 9.1 設計稿

請提供：
1. **桌面版設計** (1920x1080)
2. **平板版設計** (768x1024)
3. **手機版設計** (375x812)

### 9.2 設計規範

- 色彩代碼
- 字體規格
- 間距規範
- 元件狀態（normal, hover, focus, error）

### 9.3 互動原型（可選）

- Figma / Sketch 原型
- 互動流程說明

---

## 10. 時程規劃

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 設計 | UI/UX 設計稿 | 2-3 天 |
| 開發 | 前端實作 | 3-4 天 |
| 測試 | 功能測試 | 1 天 |
| 部署 | Staging 部署 | 0.5 天 |

**總計**: 約 1 週

---

## 11. 參考資料

### 11.1 現有頁面
- `card-display.html` - v4.0 設計參考
- `docs/v4.0名片顯示設計.html` - 設計語言

### 11.2 API 文檔
- `docs/FRONTEND-MIGRATION-PRD.md` - API 規格
- `workers/src/handlers/admin/cards.ts` - 後端實作

---

**END OF PRD - READY FOR DESIGN** 🎨
