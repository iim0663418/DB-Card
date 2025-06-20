# NFC 數位名片

一個創新的 NFC 數位名片機制，將個人資料直接儲存在 NFC 卡片中，通過觸碰即可開啟專屬數位名片。

## 🎯 功能特色

- 🏷️ **NFC 資料自包含**：個人資料直接儲存在 NFC 卡片中，無需伺服器配置
- 📱 **一觸即用**：觸碰 NFC 卡片立即開啟數位名片，無需額外步驟
- 🎨 **動態資料渲染**：即時解析 NFC 資料並渲染精美名片介面
- 📇 **智慧 vCard 生成**：動態生成並下載 .vcf 聯絡人檔案
- 🖼 **個人化展示**：支援大頭照、社群連結、職稱資訊與問候語
- 🌐 **純前端架構**：無需後端服務，可部署至任何靜態托管平台
- 📱 **跨平台相容**：Android 和 iOS 設備均完美支援
- 🔧 **視覺化生成器**：內建 NFC 生成器，輕鬆創建個人數位名片
- 🌐 **雙語支援**：頁面區隔方式支援雙語

## 📦 專案結構

```
├── index.html              # 數位名片顯示頁面（中文延平大樓）
├── index1.html             # 數位名片顯示頁面（中文新光大樓）
├── index-en.html           # 數位名片顯示頁面（英文延平大樓）
├── index1-en.html          # 數位名片顯示頁面（英文新光大樓）
├── nfc-generator.html      # NFC 名片生成器（含雙語選擇）
├── assets/                 # 資源檔案目錄
│   ├── moda-logo.svg       # MODA 官方標誌
│   ├── wu_sheng_fan/       # 範例使用者資源
│   │   └── photo.jpg       # 範例大頭貼
│   └── COPYRIGHT.txt       # 範例版權聲明文件（數位發展部商標圖已 CC0）
├── NFC-GUIDE.md           # NFC 操作說明
├── VCARD-GUIDE.md         # vCard 格式指南
├── PHOTO-GUIDE.md         # 照片處理指南
└── README.md              # 專案說明文件
```

## 🚀 快速開始

### 1. 創建數位名片

1. 開啟 `nfc-generator.html`[範例](https://iim0663418.github.io/DB-Card/nfc-generator.html)
2. **選擇語言**：繁體中文或 English
3. 填寫個人資料（姓名、職稱、聯絡方式等）
4. **選擇辦公地址**：延平大樓或新光大樓
5. 上傳大頭貼（推薦使用 [Imgur](https://imgur.com) 或 GitHub Raw 圖片）
6. 點擊「生成 NFC 連結」

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
| 地址/語言 | 中文版本 | 英文版本 |
|-----------|----------|----------|
| 延平大樓 | `index.html` | `index-en.html` |
| 新光大樓 | `index1.html` | `index1-en.html` |

#### 翻譯策略
- **個人資料**：建議使用者專版專用，不增加 NFC 容量為優先考量
- **組織資訊**：前端翻譯（數位發展部 → Ministry of Digital Affairs）
- **地址資訊**：使用官方英文地址翻譯

### 資料格式
```json
{
  "meta": {
    "userId": "使用者ID",
    "profile": "work"
  },
  "data": {
    "name": "姓名",
    "title": "職稱",
    "department": "部門",
    "organization": "機構",
    "email": "email@example.com",
    "phone": "電話號碼",
    "address": "地址",
    "avatar": "大頭貼URL",
    "greetings": ["問候語1", "問候語2"],
    "socialLinks": {
      "email": "mailto:email@example.com",
      "socialMedia": "社群媒體連結",
      "github": "GitHub連結", 
      "line": "LINE連結"
    }
  }
}
```

### 資料處理流程
1. **輸入階段**：使用 NFC 生成器收集個人資料
2. **編碼階段**：JSON 資料進行 UTF-8 + Base64 + URL 編碼
3. **傳輸階段**：編碼後的資料嵌入 URL 參數
4. **解碼階段**：名片頁面自動解碼並驗證資料格式
5. **渲染階段**：動態生成個人化名片介面和功能

## 📸 大頭貼設定指南

### 推薦圖片托管服務
- **[Imgur](https://imgur.com)**：免費、穩定、支援 HTTPS（推薦）
  1. 上傳圖片後右鍵選擇「複製圖片網址」
  2. 取得格式如：`https://i.imgur.com/XXXXXX.jpg`

- **GitHub Repository**：使用專案內圖片
  1. 找到上傳的照片
  2. 右鍵複製路徑（如：https://github.com/yourusername/repo-name/blob/main/assets/photo.jpg?raw=true）

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
   - 編輯 `index.html` 第 756 行：將「台北市中正區延平南路143號」改為你的機構地址
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

**3. 職位翻譯字典（英文版本）**
```javascript
// 在 index-en.html & index1-en.html 中更新職位翻譯
const titleTranslations = {
    '你的職位': 'Your Title',
    '你的部門': 'Your Department',
    // 添加更多職位翻譯...
};
```

**4. 組織標誌更換**
1. 替換 `assets/moda-logo.svg` 為你的組織標誌
2. 建議使用 SVG 格式以確保清晰度
3. 調整 `index.html` 中的標誌尺寸設定

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

### 資料控制
- ✅ **完全自主**：個人資料儲存在自己的 NFC 卡片中
- ✅ **無追蹤**：不收集使用者行為資料
- ✅ **離線友好**：無需網路即可顯示基本資訊
- ✅ **開源透明**：所有代碼公開可檢視

### 安全建議
- 🔐 定期更新 NFC 卡片資料
- 🔐 避免在公共場合暴露 NFC 卡片
- 🔐 使用 HTTPS 部署確保傳輸安全
- 🔐 大頭貼 URL 避免包含敏感資訊

## 🆘 常見問題

### Q: NFC 卡片無法被手機讀取？
A: 確認手機已開啟 NFC 功能，並且卡片格式正確寫入為 URL/URI 類型。

### Q: 大頭貼無法顯示？
A: 檢查圖片 URL 是否可直接訪問，推薦使用 Imgur 或本地相對路徑。

### Q: 生成的連結太長？
A: 這是正常現象，Base64 編碼會增加長度，但 NFC 卡片容量通常足夠。

### Q: 支援哪些手機？
A: 支援所有具備 NFC 功能的 Android 手機和 iPhone 7 以上型號。

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

1. Fork 專案並創建功能分支
2. 確保代碼遵循現有風格
3. 添加適當的註釋和文檔
4. 測試新功能的相容性
5. 提交 Pull Request 並描述變更內容

## 📄 授權條款

MIT License - 詳見 [LICENSE](LICENSE) 檔案

本專案基於開源精神，歡迎自由使用、修改和分發。

## 📞 技術支援

如需幫助，請參考：
- [NFC 操作說明](NFC-GUIDE.md) - 詳細的 NFC 卡片設定指南
- [vCard 格式指南](VCARD-GUIDE.md) - 聯絡人檔案格式說明
- [照片處理指南](PHOTO-GUIDE.md) - 大頭貼優化建議

或在 [GitHub Issues](https://github.com/your-repo/issues) 中提問。

---

🎯 **讓每一次交換名片都成為難忘的數位體驗！**
