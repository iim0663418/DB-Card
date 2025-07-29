# PWA 名片離線儲存服務 - 部署指南

## 🚀 快速部署

### 1. 本地測試

```bash
# 啟動本地伺服器
python -m http.server 8000

# 或使用 Node.js
npx http-server

# 訪問應用程式
open http://localhost:8000/pwa-card-storage/
```

### 2. GitHub Pages 部署

1. **Fork 專案**
   ```bash
   git clone https://github.com/moda-gov-tw/DB-Card.git
   cd DB-Card
   ```

2. **啟用 GitHub Pages**
   - 前往 Repository Settings > Pages
   - 選擇 `main` 分支作為來源
   - 應用程式將部署至：`https://yourusername.github.io/DB-Card/pwa-card-storage/`

3. **自訂設定**（可選）
   - 修改 `manifest.json` 中的應用程式名稱
   - 更新 `index.html` 中的組織資訊
   - 替換 `assets/moda-logo.svg` 為您的組織標誌

### 3. 其他平台部署

**Netlify**
```bash
# 拖放 pwa-card-storage 資料夾到 Netlify
# 或連接 GitHub 自動部署
```

**Vercel**
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
cd pwa-card-storage
vercel
```

**Cloudflare Pages**
- 連接 GitHub repository
- 設定建置目錄為 `pwa-card-storage`
- 無需建置指令（純靜態檔案）

## 🔧 設定需求

### 必要條件

- **HTTPS**：PWA 需要 HTTPS 才能正常運作
- **Service Worker 支援**：現代瀏覽器均支援
- **IndexedDB 支援**：用於本地資料儲存

### 瀏覽器相容性

| 瀏覽器 | 最低版本 | PWA 安裝 | 離線功能 |
|--------|----------|----------|----------|
| Chrome | 88+ | ✅ | ✅ |
| Firefox | 85+ | ✅ | ✅ |
| Safari | 14+ | ✅ | ✅ |
| Edge | 88+ | ✅ | ✅ |

### 行動裝置支援

| 平台 | 最低版本 | PWA 安裝 | 離線功能 |
|------|----------|----------|----------|
| iOS | 12+ | ✅ | ✅ |
| Android | 8+ | ✅ | ✅ |

## 📁 檔案結構

```
pwa-card-storage/
├── index.html              # 主應用程式
├── manifest.json           # PWA 設定
├── sw.js                   # Service Worker
├── 
├── src/
│   ├── core/
│   │   └── storage.js      # 資料庫核心
│   ├── features/
│   │   ├── card-manager.js # 名片管理
│   │   └── offline-tools.js # 離線工具
│   ├── integration/
│   │   └── legacy-adapter.js # 相容性適配
│   └── ui/
│       └── components/
│           └── card-list.js # UI 元件
├── 
└── assets/
    └── styles/
        ├── main.css        # 主要樣式
        └── components.css  # 元件樣式
```

## ⚙️ 自訂設定

### 1. 應用程式資訊

編輯 `manifest.json`：
```json
{
  "name": "您的組織名片儲存",
  "short_name": "名片儲存",
  "description": "您的組織 NFC 數位名片離線儲存服務"
}
```

### 2. 組織資訊

編輯 `src/features/card-manager.js`：
```javascript
this.cardTypes = {
  'gov-yp': {
    name: '您的組織-地點A',
    organization: '您的組織名稱',
    address: '您的組織地址'
  }
}
```

### 3. 樣式主題

編輯 `assets/styles/main.css`：
```css
:root {
  --primary-color: #your-color;
  --primary-light: #your-light-color;
  --primary-dark: #your-dark-color;
}
```

## 🔒 安全設定

### 1. Content Security Policy

已在 `index.html` 中設定：
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self';
  worker-src 'self';
  manifest-src 'self';
">
```

### 2. HTTPS 強制

確保部署平台支援 HTTPS：
- GitHub Pages：自動支援
- Netlify：自動支援
- Vercel：自動支援
- Cloudflare Pages：自動支援

### 3. 資料隱私

- 所有資料僅儲存在使用者本地設備
- 無後端伺服器，無資料追蹤
- 完全符合 GDPR 和隱私法規

## 📊 效能優化

### 1. Service Worker 快取

已設定離線優先策略：
```javascript
// 預先快取關鍵資源
const STATIC_RESOURCES = [
  '/pwa-card-storage/',
  '/pwa-card-storage/index.html',
  // ... 其他資源
];
```

### 2. 資源壓縮

建議在生產環境中：
- 壓縮 CSS 和 JavaScript 檔案
- 優化圖片大小
- 啟用 gzip 壓縮

### 3. 載入效能

- 首次載入時間 < 3 秒
- 離線啟動時間 < 1 秒
- 支援漸進式載入

## 🧪 測試驗證

### 1. 功能測試

訪問 `test.html` 執行完整測試：
```
https://yourdomain.com/pwa-card-storage/test.html
```

### 2. PWA 檢查

使用 Chrome DevTools：
1. 開啟 F12 開發者工具
2. 前往 Application > Manifest
3. 檢查 PWA 設定是否正確
4. 測試 Service Worker 功能

### 3. 離線測試

1. 開啟應用程式
2. 在 DevTools 中啟用離線模式
3. 重新整理頁面
4. 驗證所有功能正常運作

## 🔄 更新部署

### 自動更新

Service Worker 會自動檢查更新：
```javascript
// 在 sw.js 中
self.addEventListener('install', (event) => {
  // 自動更新快取
  event.waitUntil(updateCache());
});
```

### 手動更新

1. 修改程式碼
2. 更新 `sw.js` 中的 `CACHE_NAME`
3. 重新部署
4. 使用者下次訪問時自動更新

## 📞 故障排除

### 常見問題

1. **PWA 無法安裝**
   - 確認使用 HTTPS
   - 檢查 `manifest.json` 格式
   - 驗證 Service Worker 註冊

2. **離線功能異常**
   - 檢查 Service Worker 狀態
   - 清除瀏覽器快取
   - 重新註冊 Service Worker

3. **資料無法儲存**
   - 確認 IndexedDB 支援
   - 檢查儲存空間限制
   - 驗證資料格式

### 除錯工具

- Chrome DevTools > Application
- Firefox Developer Tools > Storage
- Safari Web Inspector > Storage

## 📈 監控與維護

### 效能監控

```javascript
// 在 app.js 中已包含基本監控
const performanceObserver = new PerformanceObserver((list) => {
  // 監控載入時間
});
```

### 錯誤追蹤

```javascript
// 全域錯誤處理
window.addEventListener('error', (event) => {
  console.error('[PWA] Global error:', event.error);
});
```

### 定期維護

- 每月檢查瀏覽器相容性
- 定期更新依賴庫
- 監控使用者回饋

---

🎯 **部署完成後，您的 PWA 名片離線儲存服務就可以為使用者提供完整的離線名片管理體驗！**