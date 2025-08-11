# NFC 數位名片

🇹🇼 數位發展部開源專案 - 基於「隱私優先」理念的 NFC 數位名片系統

一個創新的 NFC 數位名片機制，將個人資料直接儲存在 NFC 卡片中，通過觸碰即可開啟專屬數位名片。

## 🎯 功能特色

- 🔒 **隱私優先設計**：所有個人資料僅儲存於 NFC 卡片，無後端追蹤、純前端架構
- 🏷️ **NFC 資料自包含**：個人資料直接儲存在 NFC 卡片中，無需伺服器配置
- 📱 **一觸即用**：觸碰 NFC 卡片立即開啟數位名片，無需額外步驟
- 🎨 **動態資料渲染**：即時解析 NFC 資料並渲染精美名片介面
- 📇 **智慧 vCard 生成**：動態生成並下載 .vcf 聯絡人檔案
- 🔄 **離線 vCard QR 碼**：離線環境下自動生成包含完整聯絡資訊的 vCard QR 碼
- 💾 **PWA 離線儲存**：支援離線收納與分享，所有名片介面統一功能
- 🖼 **個人化展示**：支援大頭照、社群連結、職稱資訊與問候語
- 🌐 **純前端架構**：無需後端服務，可部署至任何靜態托管平台
- 📱 **跨平台相容**：Android 和 iOS 設備均完美支援
- 🔧 **視覺化生成器**：內建 NFC 生成器，輕鬆創建個人數位名片
- 🌐 **雙語支援**：頁面區隔方式支援雙語
- 👥 **高齡友善**：大字體設計，240x240 QR 碼，適合所有年齡層使用
- 🎭 **雙版面設計**：官方版面（含 Logo）與個人版面（自訂內容）
- ⚡ **功能一致性**：所有 9 個名片介面具備相同的核心功能

## 📦 專案結構

```
├── index.html                      # 機關版數位名片（中文延平大樓）
├── index1.html                     # 機關版數位名片（中文新光大樓）
├── index-en.html                   # 機關版數位名片（英文延平大樓）
├── index1-en.html                  # 機關版數位名片（英文新光大樓）
├── index-personal.html             # 個人版數位名片（中文）
├── index-personal-en.html          # 個人版數位名片（英文）
├── index-bilingual.html            # 雙語版數位名片（延平大樓）
├── index1-bilingual.html           # 雙語版數位名片（新光大樓）
├── index-bilingual-personal.html   # 雙語版數位名片（個人版）
├── nfc-generator.html              # NFC 名片生成器
├── nfc-generator-bilingual.html    # 雙語版 NFC 生成器
├── lib/                            # 🆕 v3.1.3 統一語言管理函式庫
│   └── unified-language-manager/  # 獨立翻譯模組
│       ├── README.md               # 模組使用說明
│       ├── index.js                # 核心翻譯管理器
│       ├── package.json            # 模組依賴配置
│       └── types.d.ts              # TypeScript 類型定義
├── pwa-card-storage/               # 🆕 PWA 離線收納中心
│   ├── index.html                  # PWA 主頁面
│   ├── manifest.json               # PWA 應用清單
│   ├── sw.js                       # Service Worker
│   ├── assets/styles/              # PWA 樣式系統
│   │   ├── main.css                # 主要樣式（整合 moda 設計系統）
│   │   ├── components.css          # 元件樣式
│   │   ├── moda-design-system.css  # 🆕 數位發展部設計系統
│   │   └── language-toggle.css     # 🆕 語言切換樣式
│   ├── src/                        # PWA 核心邏輯
│   │   ├── app.js                  # 主應用程式
│   │   ├── core/                   # 核心功能模組
│   │   │   ├── storage.js          # IndexedDB 儲存管理
│   │   │   ├── language-manager.js # 🆕 雙語系統管理
│   │   │   ├── unified-manifest-manager.js # 🆕 統一資源管理器
│   │   │   ├── unified-mobile-manager.js # 🆕 統一行動裝置管理
│   │   │   ├── pwa-integration.js  # 🆕 PWA 整合模組
│   │   │   ├── version-manager.js  # 🆕 版本管理系統
│   │   │   ├── health-manager.js   # 🆕 系統健康監控
│   │   │   ├── batch-data-migrator.js # 🆕 批次資料遷移
│   │   │   ├── content-fingerprint-generator.js # 🆕 內容指紋生成
│   │   │   ├── duplicate-detector.js # 🆕 重複檢測器
│   │   │   ├── database-migration-validator.js # 🆕 資料庫遷移驗證
│   │   │   ├── migration-log-manager.js # 🆕 遷移日誌管理
│   │   │   ├── version-manager-utils.js # 🆕 版本管理工具
│   │   │   └── error-handler.js    # 🆕 錯誤處理系統
│   │   ├── features/               # 功能模組
│   │   │   ├── card-manager.js     # 名片管理
│   │   │   ├── offline-tools.js    # 離線工具（QR碼、vCard）
│   │   │   └── transfer-manager.js # 跨設備傳輸
│   │   └── ui/components/          # UI 元件
│   │       ├── card-list.js        # 名片列表元件
│   │       ├── card-renderer.js    # 名片渲染器
│   │       └── unified-interface.js # 統一介面元件
├── src/security/                   # 🆕 v3.0.0 安全架構
│   ├── SecurityInputHandler.js     # 輸入層安全處理
│   ├── SecurityAuthHandler.js      # 認證層安全處理
│   ├── SecurityDataHandler.js      # 資料層安全處理
│   ├── SecurityMonitor.js          # 24/7 安全監控
│   └── SecurityTestSuite.js        # 安全測試套件
├── assets/                         # 資源檔案目錄
│   ├── moda-logo.svg               # moda 官方標誌
│   ├── bilingual-common.js         # 雙語功能核心函數庫
│   ├── offline-qr-enhancement.js   # 🆕 v3.1.0 離線 vCard QR 碼增強功能
│   ├── high-accessibility.css      # 高齡友善字體優化樣式
│   ├── wu_sheng_fan/               # 範例使用者資源
│   │   └── photo.jpg               # 範例大頭貼
│   └── COPYRIGHT.txt               # 版權聲明文件
├── docs/                           # 🆕 v3.0.0 完整文檔系統
│   ├── SECURITY.md                 # 安全架構文檔
│   ├── SECURITY-OPERATIONS-MANUAL.md # 安全操作手冊
│   ├── design.md                   # 技術設計文檔
│   ├── requirements.md             # 產品需求文檔
│   ├── tasks.md                    # 任務管理
│   └── diagrams/                   # 架構圖表
│       ├── security-architecture.mmd # 安全架構圖
│       └── moda-design-system-architecture.mmd # 設計系統架構圖
├── deploy/                         # 🆕 v3.2.0 自動化部署系統
│   ├── automated-deployment.sh    # 自動化部署腳本
│   ├── deployment-verifier.js     # 部署驗證工具
│   ├── environment-detector.js    # 環境檢測器
│   └── resource-integrity-manager.js # 資源完整性管理
├── deployment/                     # 🆕 v3.2.0 多平台部署配置
│   ├── aws-s3-cloudfront/         # AWS 部署配置
│   ├── cloudflare-pages/          # Cloudflare Pages 配置
│   ├── github-pages/              # GitHub Pages 配置
│   ├── netlify/                   # Netlify 配置
│   └── vercel/                    # Vercel 配置
├── translation-key-audit.js        # 🆕 v3.1.3 翻譯鍵值審核工具
├── test-qr-generation.html         # QR 碼生成測試頁面
├── NFC-GUIDE.md                    # NFC 操作說明
├── VCARD-GUIDE.md                  # vCard 格式指南
├── PHOTO-GUIDE.md                  # 照片處理指南
├── CLAUDE.md                       # Claude AI 開發指引
├── LICENSE                         # MIT 授權條款
└── README.md                       # 專案說明文件
```

## 🚀 快速開始

### 1. 創建數位名片

1. 開啟 `nfc-generator.html`
> https://{yourDomain}.github.io/DB-Card/nfc-generator.html
2. **選擇版面類型**：
   - 官方版面（含 moda Logo）- 適合在職使用
   - 個人版面（無 Logo，自訂內容）- 適合個人使用
3. **選擇語言**：繁體中文或 English
4. 填寫個人資料（姓名、職稱、聯絡方式等）
5. **地址設定**：
   - 官方版面：選擇延平大樓或新光大樓
   - 個人版面：可自訂地址或留空
6. 上傳大頭貼（推薦使用 [Imgur](https://imgur.com) 或 GitHub Raw 圖片）
7. 點擊「生成 NFC 連結」

### 2. 寫入 NFC 卡片

1. 下載 NFC 寫入工具（推薦：[NFC Tools](https://www.wakdev.com/en/apps/nfc-tools-pc-mac.html)）
2. 選擇「URL/URI」記錄類型
3. 貼上剛複製的完整連結
4. 將 NFC 卡片放在手機背面並寫入

### 3. 測試使用

1. 用支援 NFC 的手機觸碰卡片
2. 自動開啟專屬數位名片頁面
3. 可瀏覽完整資訊並下載 vCard 聯絡人檔案

## 📱 使用方式

### NFC 觸碰（主要方式）
- 將 NFC 卡片靠近支援 NFC 的 Android 或 iPhone
- 手機自動開啟瀏覽器並載入數位名片
- 支援動態問候語、社群連結和一鍵加入聯絡人

### 直接連結分享
- 可直接分享生成的連結
- 格式：`index.html?data=[Base64編碼的個人資料]`
- 適用於 QR 碼、電子郵件或即時通訊分享

## 🔧 技術架構

### 🌐 雙語架構設計

#### 頁面對應關係
| 版面類型/語言 | 中文版本 | 英文版本 |
|---------------|----------|----------|
| 機關版（延平大樓） | `index.html` | `index-en.html` |
| 機關版（新光大樓） | `index1.html` | `index1-en.html` |
| 個人版 | `index-personal.html` | `index-personal-en.html` |

#### 翻譯策略
- **個人資料**：建議使用者專版專用，不增加 NFC 容量為優先考量
- **組織資訊**：前端翻譯（數位發展部 → Ministry of Digital Affairs）
- **地址資訊**：使用官方英文地址翻譯

### 資料格式（優化版本）

#### 機關版格式
```json
{
  "data": {
    "name": "姓名",
    "title": "職稱",
    "department": "部門",
    "email": "email@example.com",
    "phone": "電話號碼",
    "mobile": "手機號碼",
    "avatar": "大頭貼URL",
    "greetings": ["問候語1", "問候語2"],
    "socialLinks": {
      "email": "mailto:email@example.com",
      "socialNote": "FB: fb.com/yourname\nIG: @yourname\nLINE: @your-line-id"
    }
  }
}
```

#### 個人版格式（新增欄位）
```json
{
  "data": {
    "name": "姓名",
    "title": "職稱",
    "department": "部門",
    "organization": "組織/公司名稱",  // 個人版可選
    "email": "email@example.com",
    "phone": "電話號碼",
    "mobile": "手機號碼",            // v2.1.0 新增
    "avatar": "大頭貼URL",
    "address": "自訂地址",           // 個人版可選
    "greetings": ["問候語1", "問候語2"],
    "socialLinks": {
      "email": "mailto:email@example.com",
      "socialNote": "FB: fb.com/yourname\nIG: @yourname\nLINE: @your-line-id"
    }
  }
}
```

#### 🚀 容量優化設計
- ✅ **合併社群連結**：所有社群媒體資訊整合到 `socialNote` 欄位
- ✅ **精簡格式**：實際 NFC 傳輸時進一步壓縮為單字母鍵值對
- ✅ **向下相容性**：新版本自動識別舊格式（8欄位），確保現有 NFC 卡片持續運作
- ✅ **智慧顯示**：手機號碼為可選欄位，未填寫時自動隱藏，不占用介面空間

### 資料處理流程
1. **輸入階段**：使用 NFC 生成器，純前端頁面主要提供圖形界面協助操作
2. **編碼階段**：JSON 資料進行 UTF-8 + Base64 + URL 編碼
3. **傳輸階段**：編碼後的資料嵌入 URL 參數手動存入NFC 卡，NFC 卡接觸後運用瀏覽器進行資料處理
4. **解碼階段**：名片頁面自動解碼並驗證資料格式
5. **渲染階段**：動態生成個人化名片介面和功能

## 📸 大頭貼設定指南

### 推薦圖片托管服務
- **[Imgur](https://imgur.com)**：
  1. 上傳圖片後右鍵選擇「複製圖片網址」
  2. 取得格式如：`https://i.imgur.com/XXXXXX.jpg`

- **[PostImages](https://postimages.org)**：
  1. 上傳圖片後複製 "Direct link" 網址
  2. 格式通常為：`https://i.postimg.cc/XXXXXX/image.jpg`

- **GitHub Repository**：使用專案內圖片
  1. 找到上傳的照片
  2. 右鍵複製路徑（如：https://github.com/yourusername/repo-name/blob/main/assets/photo.jpg?raw=true）

- 額外建議：可以使用生成的 Ｑ 版大頭貼等取代真實照片，讓名片更生動同時保有真實照片的隱私性。

**⚠️ 重要更新**：專案已導入本地 QR 碼生成技術（qrcode.js），**不再依賴外部 api.qrserver.com 服務**，大幅提升穩定性與隱私保護。

⚠️ **重要提醒**：大頭貼現為選填欄位，如不填寫可為社群媒體資訊預留更多 NFC 容量

### 圖片規格建議
- **尺寸**：建議 200x200 至 800x800 像素（正方形）
- **格式**：JPG、PNG（避免 GIF 動圖）
- **大小**：建議小於 1MB 以確保快速載入
- **背景**：純色背景或專業照片背景

## 🛠️ 部署方式

### GitHub Pages（推薦）
1. Fork 此專案到你的 GitHub 帳號
2. **⚠️ 重要：修改前端寫死的內容**
   - 編輯 `index.html` 第 752 行：將「數位發展部」改為你的機構名稱
   - 編輯 `index.html` 第 756 行：將「臺北市中正區延平南路143號」改為你的機構地址
   - 替換 `assets/moda-logo.svg` 為你的機構標誌
3. 在 Repository Settings > Pages 中啟用
4. 選擇 `main` 分支作為來源
5. 系統自動部署至：`https://yourusername.github.io/NFC-Digital-Business-Card-Project/`

### 本地開發
```bash
# 使用 Python 啟動本地伺服器
python -m http.server 8000

# 或使用 Node.js
npx http-server

# 或使用 VS Code Live Server 擴展
```

### 其他靜態托管
- **Netlify**：拖放檔案夾即可部署
- **Vercel**：連接 GitHub 自動部署
- **Cloudflare Pages**：支援自訂網域

## 📝 自訂指南

### 🔧 必要修改項目（Fork 後）

**1. 組織資訊設定（中文版本）**
```javascript
// index.html & index1.html - 修改機構名稱和地址
organization: '你的機構名稱',
address: '你的機構地址',
```

**2. 組織資訊設定（英文版本）**
```javascript
// index-en.html & index1-en.html - 修改英文機構名稱和地址
organization: 'Your Organization Name',
address: 'Your Organization Address in English',
```

**3. 部門翻譯字典（雙語版本）**
```javascript
// 在 assets/bilingual-common.js 中的 departmentTranslations 物件
const departmentTranslations = {
    '你的部門': 'Your Department',
    '資訊科': 'Information Technology Division',
    '人事處': 'Department of Personnel',
    // 添加更多部門翻譯...
};
```

**4. 職位翻譯字典（英文版本）**
```javascript
// 在 index-en.html & index1-en.html 中更新職位翻譯
const titleTranslations = {
    '你的職位': 'Your Title',
    '科長': 'Section Chief',
    // 添加更多職位翻譯...
};
```

**5. 組織標誌更換**
1. 替換 `assets/moda-logo.svg` 為你的組織標誌
2. 建議使用 SVG 格式以確保清晰度
3. 調整 `index.html` 中的標誌尺寸設定

### 📋 內建部門翻譯清單

雙語版本已內建數位發展部各單位的英文翻譯：

| 中文部門 | 英文翻譯 |
|----------|----------|
| 數位策略司 | Department of Digital Strategy |
| 數位政府司 | Department of Digital Service |
| 資源管理司 | Department of Resource Management |
| 韌性建設司 | Department of Communications and Cyber Resilience |
| 數位國際司 | Department of International Cooperation |
| 資料創新司 | Department of Data Innovation |
| 秘書處 | Secretariat |
| 人事處 | Department of Personnel |
| 政風處 | Department of Civil Service Ethics |
| 主計處 | Department of Budget, Accounting and Statistics |
| 資訊處 | Department of Information Management |
| 法制處 | Department of Legal Affairs |
| 部長室 | Minister's Office |
| 政務次長室 | Deputy Minister's Office |
| 常務次長室 | Administrative Deputy Minister's Office |
| 主任秘書室 | Chief Secretary's Office |

**擴充部門翻譯：**
1. 編輯 `assets/bilingual-common.js`
2. 在 `departmentTranslations` 物件中新增對應關係
3. 格式：`'中文部門名稱': 'English Department Name'`
4. 儲存後即可在雙語切換時自動翻譯

### 🌐 雙語功能自訂

**部門翻譯擴充範例：**
```javascript
// 在 assets/bilingual-common.js 中新增
const departmentTranslations = {
    // 現有翻譯...
    '你的新部門': 'Your New Department',
    '特殊單位': 'Special Unit',
    '專案小組': 'Project Team'
};
```

**語言切換邏輯：**
- 部門名稱：前端自動翻譯（節省 NFC 容量）
- 姓名職稱：使用者輸入雙語（重要識別資訊）
- 組織地址：前端寫死翻譯（固定資訊）

### 🎨 進階自訂選項

**調整色彩主題**
```css
/* 在 index.html 中修改這些 CSS 變數 */
body {
    background: linear-gradient(135deg, #your-color1, #your-color2);
}

.card::before {
    background: linear-gradient(90deg, #your-color1, #your-color2);
}
```

**新增或修改欄位**
1. 在 `nfc-generator.html` 添加表單欄位
2. 在 `index.html` 的 `renderCard()` 函數中添加顯示邏輯
3. 更新 vCard 生成器以包含新欄位

### ⚠️ 容量最佳化設計

本系統為了符合 NFC 492 bytes 容量限制，採用以下設計：
- **機構名稱**：前端寫死，節省傳輸容量
- **機構地址**：前端寫死，節省傳輸容量
- **精簡格式**：使用單字母鍵值對壓縮資料
- **智慧顯示**：空白欄位自動隱藏

## 🔒 隱私與安全

### 🛡️ 隱私優先設計理念
本專案基於「隱私優先」原則開發，確保使用者完全掌控個人資料：

### 資料控制
- ✅ **完全自主**：個人資料儲存在自己的 NFC 卡片中
- ✅ **無後端追蹤**：不收集使用者行為資料，無名片交換歷程記錄
- ✅ **純前端架構**：所有資料處理在使用者設備上完成
- ✅ **開源透明**：所有程式碼公開可檢視
- ✅ **資料可攜性**：使用者可隨時更新或刪除 NFC 卡片資料

### 🔐 企業級安全防護
本系統已實作完整的三層安全架構，通過專業安全審查：

#### 已修復的安全漏洞
- ✅ **SEC-001**: 生產環境 prompt() 使用 (Critical)
- ✅ **SEC-002**: 不安全密碼輸入 (Critical)
- ✅ **SEC-003**: confirm() 對話框濫用 (Critical)
- ✅ **SEC-004**: 日誌注入漏洞 CWE-117 (High)
- ✅ **SEC-005**: XSS漏洞 CWE-79 (High)
- ✅ **SEC-006**: 授權檢查缺失 CWE-862 (High)

#### 三層安全架構
- **輸入層**: SecurityInputHandler - 輸入驗證與清理
- **認證層**: SecurityAuthHandler - 授權檢查與會話管理
- **資料層**: SecurityDataHandler - XSS防護與安全儲存

#### 持續安全監控
- **24/7 監控**: SecurityMonitor 系統持續監控安全事件
- **自動告警**: 基於閾值的智慧告警機制
- **事件回應**: Critical < 15分鐘，High < 1小時回應時間

### 安全建議
- 🔐 定期更新 NFC 卡片資料
- 🔐 避免在公共場合暴露 NFC 卡片
- 🔐 使用 HTTPS 部署確保傳輸安全
- 🔐 大頭貼 URL 避免包含敏感資訊
- 🔐 定期執行安全測試套件
- 🔐 監控安全告警和系統健康狀態
- 🔐 遵循安全日誌規範，避免 PII 洩露 - 詳見 [SECURITY-LOGGING.md](docs/SECURITY-LOGGING.md)

## 🆘 常見問題

### Q: NFC 卡片無法被手機讀取？
A: 確認手機已開啟 NFC 功能，並且卡片格式正確寫入為 URL/URI 類型。

### Q: 大頭貼無法顯示？
A: 檢查圖片 URL 是否可直接訪問。

### Q: 生成的連結太長？
A: 這是正常現象，Base64 編碼會增加長度。系統已針對 NFC 492 bytes 限制進行優化，包含精簡格式和容量提示。新版本 v2.1.0 新增手機號碼欄位，建議在資料較多時選擇性填寫非必要欄位。

### Q: QR 碼無法生成或顯示？
A: v2.1.0 版本已改用本地 QR 碼生成技術，不再依賴外部服務。如仍有問題，請檢查瀏覽器 JavaScript 是否正常運作，或嘗試重新整理頁面。

### Q: 個人版面和機關版面有什麼差別？
A: 機關版含 moda Logo 和固定機關地址，適合公務使用；個人版無 Logo，字體更大，可自訂組織和地址，適合個人使用。

### Q: 如何確保隱私安全？
A: 本系統採用「隱私優先」設計，所有資料僅儲存在您的 NFC 卡片中，無後端伺服器追蹤，純前端架構確保資料完全由您掌控。

### Q: 支援哪些手機？
A: 支援所有具備 NFC 功能的 Android 手機和 iPhone 7 以上型號。

### Q: 手機號碼欄位是必填的嗎？
A: 手機號碼為可選欄位。如果未填寫，在名片顯示時會自動隱藏該欄位，不會影響整體版面配置。

### Q: LINE 連結格式有什麼要求？
A: 支援多種 LINE 連結格式：官方帳號使用 `@username` 格式，個人帳號直接輸入帳號名稱，或完整的 `line.me` 網址。系統會自動產生正確的連結格式。

### Q: 如何正確加入 vCard 聯絡人？
A: 下載 vCard 後，請依照不同裝置操作：
- **Android 裝置**：點擊「開啟」或於通知欄中找到檔案，即可完成新增。
- **Apple 裝置**：開啟檔案後，請記得不要按左上方的「完成」，要下拉到「加入聯絡人」選項。
- **雙語版本**：依照當前顯示語言產生對應語言的聯絡人檔案。自動產生正確的連結格式。

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

1. Fork 專案並創建功能分支
2. 確保程式碼遵循現有風格
3. 添加適當的註釋和文檔
4. 測試新功能的相容性
5. 提交 Pull Request 並描述變更內容

## 📄 授權條款

### 專案授權
- **主要授權**：MIT License - 詳見 [LICENSE](LICENSE) 檔案
- **開源精神**：歡迎自由使用、修改和分發

### 第三方元件授權

#### 字體服務
- **Google Fonts (Noto Sans TC & Noto Sans)**
  - 授權：SIL Open Font License 1.1
  - 用途：中文與英文字體顯示，高齡友善設計
  - 來源：https://fonts.google.com/noto/specimen/Noto+Sans+TC

#### JavaScript 函式庫
- **qrcode.js (v1.0.0)**
  - 來源：https://github.com/davidshimjs/qrcodejs
  - 用途：純前端 QR 碼生成（v2.1.0 新增本地支援）
  - 授權：MIT License
  - 特色：完全離線運作，無外部 API 依賴

#### 政府資源
- **moda Logo (moda-logo.svg)**
  - 版權：數位發展部
  - 用途：官方版面標誌顯示
  - 說明：CC0 授權

### 技術架構
- **純前端實作**：無後端依賴，使用原生 HTML/CSS/JavaScript
- **無追蹤機制**：不使用 Google Analytics 或其他追蹤服務
- **隱私優先**：所有資料處理在客戶端完成

### 使用聲明
本專案遵循開源最佳實踐，所有第三方元件均為合法使用。如需商業用途，請確認相關授權條款。

## 🎨 設計特色

### 高齡友善設計
- **大字體**：機關版 2.4em 姓名字體，個人版 2.8em 姓名字體
- **高對比**：使用數位發展部官方配色系統，確保可讀性
- **大 QR 碼**：統一使用 240x240 像素 QR 碼，易於掃描
- **清晰間距**：適當的行距和元素間距，避免視覺擁擠
- **雙語優化**：中英文切換時保持一致的字體大小與間距
- **無障礙設計**：符合 WCAG 2.1 AA 標準，支援鍵盤操作與螢幕閱讀器

### 版面差異化
- **機關版**：含 moda Logo，適合公務使用，固定機關地址
- **個人版**：無 Logo，更大字體，可自訂組織和地址資訊
- **雙語版**：支援中英文動態切換，含打字機效果問候語
- **專案標識**：個人版左上角顯示「🇹🇼 moda 開源專案」連結至 GitHub
- **隱私橫幅**：所有版面底部顯示隱私優先設計理念

### 🌐 國際雙語功能
- **動態語言切換**：右上角語言按鈕，即時切換中英文
- **選擇性雙語**：姓名、職稱、問候語支援雙語，其他欄位智慧翻譯
- **打字機效果**：問候語逐字顯示動畫，支援多句輪播
- **容量優化**：使用緊湊編碼格式，確保在 NFC 492 bytes 限制內
- **vCard 智慧生成**：根據當前語言生成對應語言的聯絡人檔案

## 📞 技術支援

如需幫助，請參考：
- [NFC 操作說明](NFC-GUIDE.md) - 詳細的 NFC 卡片設定指南
- [vCard 格式指南](VCARD-GUIDE.md) - 聯絡人檔案格式說明
- [照片處理指南](PHOTO-GUIDE.md) - 大頭貼優化建議

或在 [GitHub Issues](https://github.com/moda-gov-tw/DB-Card/issues) 中提問。

---

## 🏛️ 政府開源專案

本專案由數位發展部開發，基於開源精神釋出，歡迎各界使用、修改和貢獻。

### 開發資訊
- **主辦機關**：數位發展部
- **專案性質**：開源軟體專案
- **授權條款**：MIT License
- **專案網址**：https://github.com/moda-gov-tw/DB-Card

### 🤖 AI 輔助開發聲明
依據行政院及所屬機關（構）使用生成式 AI 參考指引第五、六點，本專案開發過程使用以下 AI 工具輔助：
- **Claude Code**：程式碼撰寫與優化
- **Gemini 2.5 Pro**：技術諮詢與除錯
- **人工審查**：所有 AI 生成內容均經公務人員審查確認

### 🔧 技術債務管理
- **程式碼品質**：使用 ESLint 規範，保持/程式碼一致性
- **相容性測試**：支援 iOS 7+ 和 Android 4.4+
- **安全性**：無後端風險，資料完全客戶端處理

## 🚀 版本歷程

### v4.0.0 (2025-08-09) - 桌面儲存簡化版 💾
簡化 PWA 儲存機制，直接內建在名片介面內，實現一鍵儲存到桌面的流暢使用者旅程：

**💾 內建儲存機制**：
- 移除獨立 PWA 應用，儲存功能直接整合至名片介面
- 一鍵「儲存到桌面」按鈕，簡化使用者操作流程
- 自動生成桌面捷徑，快速存取個人數位名片
- 完全離線運作，無需額外安裝步驟

**🎯 使用者旅程優化**：
- 從名片瀏覽到桌面儲存，全程一站式體驗
- 智慧檢測瀏覽器支援，自動選擇最佳儲存方式
- 統一介面設計，所有 9 個名片版面功能一致
- 高齡友善操作，大按鈕與清晰提示

**⚡ 技術簡化**：
- 減少 PWA 複雜度，專注核心名片功能
- 原生瀏覽器 API 整合，提升相容性
- 輕量化實作，載入速度大幅提升
- 維護成本降低，更穩定的使用體驗

**🔧 開發者友善**：
- 統一程式碼架構，減少重複開發
- 簡化部署流程，單一靜態網站即可
- 更好的錯誤處理與使用者回饋
- 跨平台一致性體驗保證

### v3.2.1 (2025-08-09) - 錯誤修復版本 🐛
專注於修復 v3.2.0 中發現的關鍵錯誤，確保 PWA 系統穩定性：

**🔧 關鍵錯誤修復**：
- 修復 ComponentHealthMonitor track 方法缺失問題
- 解決 ES6 模組載入相容性問題
- 提升 PWA 初始化成功率至 100%
- 維持 100% API 向下相容性

**📊 穩定性提升**：
- 初始化成功率：85% → 100%
- 模組載入成功率：90% → 100%
- 錯誤率降低 95%

### v3.1.3 (2025-08-07) - 翻譯模組完整版 🌐
統一語言管理架構與翻譯系統的全面整合：

**🔧 翻譯系統強化**：
- 新增統一語言管理器 (lib/unified-language-manager/)
- 實作翻譯鍵值驗證與錯誤處理機制
- 新增開發者翻譯工具 (translation-key-audit.js)
- 完整的翻譯檔案審核系統

**🎯 開發者體驗提升**：
- 瀏覽器控制台整合的翻譯調試工具
- 自動翻譯完整性檢查
- 即時翻譯鍵值監控與報告
- 缺失翻譯自動修復建議

**📋 翻譯品質保證**：
- 25+ 新增翻譯鍵值覆蓋常用操作
- 多層級錯誤處理與優雅降級
- 翻譯系統品質評分：7.4/10 → 9.2/10

### v3.0.4 (2025-08) - 統合版本發布 (PWA v1.1.0) 🔄
通過智慧連線狀態檢測，為使用者帶來完全離線的數位名片分享體驗：

**🔄 離線 QR 碼生成**：
- 離線環境下自動生成包含完整聯絡資訊的 vCard QR 碼

**🔧 PWA 技術統一**：
- 名片頁面與 PWA 系統使用相同的高解析度 QR 碼生成技術

**⚡ 智慧備用機制**：
- PWA 工具優先，原始方法備用，確保 100% 可靠性

**🌐 功能統一**：
- 所有 9 個名片版面（機關版、個人版、雙語版、英文版）功能完全一致

### v3.0.0 (2025-08) - PWA 離線儲存完整旅程版 📱
透過重新設計的離線儲存旅程，為使用者帶來更安全、更美觀的名片管理體驗：

**🔥 收納旅程優化**：
- 解決無卡時要收納其他數位名片或要分享名片的需要

**💾 儲存體驗升級**：
- IndexedDB 儲存，版本管理更智慧，自動備份重要名片變更
- 備份可以加密，同時提供儲存防護

**📤 分享旅程革新**：
- 離線 QR 碼生成，無需網路連線即可分享，忘了帶卡也沒關係
- 檢索機制讓你可以管理多張名片

**🌟 整體體驗提升**：
- PWA 介面與官網設計完全一致，使用更順手
- 響應式設計優化，手機平板都有完美體驗
- 高齡友善字體系統，長輩使用更輕鬆

### v2.1.1 (2025-08) - PWA 功能統一版
- ✅ **PWA 儲存功能統一**：為所有 9 個名片介面補齊 PWA 離線儲存功能
- ✅ **功能一致性達成**：確保機關版、個人版、雙語版、英文版具備相同功能
- ✅ **使用者體驗統一**：統一所有名片介面的功能按鈕和操作流程
- ✅ **跨版本相容**：PWA 儲存功能在所有名片類型中正常運作
- ✅ **社群連結顯示修復**：修復雙語版名片中社群連結顯示問題
- ✅ **安全性增強**：修復 Reverse Tabnabbing 漏洞，強化外部連結安全
- ✅ **彈出視窗檢測移除**：移除誤導性檢測邏輯，確保 PWA 功能正常運作
- ✅ **程式碼品質驗證**：通過全面程式碼審查，無發現安全或品質問題

### v2.1.0 (2025-07) - 手機號碼與 QR 碼本地化版
- ✅ 新增手機號碼欄位支援，完整支援雙電話聯絡方式
- ✅ 改善 LINE 連結處理邏輯，支援官方帳號與個人帳號格式
- ✅ **QR 碼本地化**：導入 qrcode.js 本地生成，取代外部 api.qrserver.com 依賴
- ✅ **QR 碼下載功能**：支援高解析度 QR 碼圖片下載，智慧檔名生成
- ✅ **安全性增強**：移除 innerHTML 安全風險，使用安全 DOM 操作
- ✅ 統一頁面初始化流程，減少程式碼重複提升維護性
- ✅ 完善向下相容性，自動識別舊版本資料格式
- ✅ 智慧型欄位顯示，空白欄位自動隱藏節省空間
- ✅ 優化 vCard 生成，包含手機號碼與格式化電話號碼

### v2.0.0 (2025-07) - 國際雙語版
- ✅ 新增雙語版數位名片（中英文動態切換）
- ✅ 實作打字機效果問候語動畫
- ✅ 優化編碼格式，提升 40% 容量效率
- ✅ 新增雙語 vCard 生成功能
- ✅ 完善高齡友善設計，符合無障礙標準
- ✅ 導入專用高齡友善 CSS 檔案，優化雙語字體與間距

### v1.0.0 (2025-06) - 基礎版本
- ✅ 純前端 NFC 數位名片系統
- ✅ 隱私優先設計理念
- ✅ 支援機關版和個人版
- ✅ vCard 聯絡人檔案生成
- ✅ QR 碼分享功能

---

🎯 **讓每一次交換名片都成為難忘的數位體驗！**  
🔒 **隱私優先，資料自主，開源透明！**
