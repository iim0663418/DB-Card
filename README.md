# 多使用者動態數位名片系統

一個基於 GitHub Pages 的數位名片系統，支援多使用者管理、Token 驗證、NFC 和 QR 碼快速開啟，並動態生成 .vcf 聯絡人檔案。

## 🎯 功能特色

- 🔐 **Token 驗證**：使用無意義 Token 確保訪問有一點小門檻
- 👥 **多使用者支援**：統一系統管理多位使用者的數位名片
- 📱 **行動裝置優化**：響應式設計，移動設備滿版顯示
- 🎨 **動態資料渲染**：JSON 驅動，即時反映資料變更
- 📇 **智能 vCard 生成**：前端動態組裝，遵循 iOS 相容格式
- 🖼 **個人化展示**：大頭照、社群連結、職稱資訊與動態個人簡介
- 🌐 **GitHub Pages 部署**：無需伺服器，直接部署至 GitHub Pages
- 📱 **跨平台相容**：Android 和 iOS 均可正常使用

## 📦 專案結構

```
├── index.html              # 動態名片模板
├── token_map.json          # Token 對應表
├── configs/                # 使用者設定檔目錄
│   ├── wu_sheng_fan.json   # 吳勝繙的設定檔
│   └── chen_da_ming.json   # 陳大明的設定檔（範例）
├── assets/                 # 資源檔案目錄
│   ├── wu_sheng_fan/       # 吳勝繙的資源
│   │   └── photo.jpg       # 個人頭像
│   ├── chen_da_ming/       # 陳大明的資源
│   │   └── photo.jpg       # 個人頭像
│   ├── moda-logo.svg       # MODA 官方標誌
│   └── COPYRIGHT.txt       # 版權聲明文件
├── nfc-generator.html      # NFC 內容產生工具
├── NFC-GUIDE.md            # NFC 設定使用指南
├── PHOTO-GUIDE.md          # 大頭貼優化指南
├── VCARD-GUIDE.md          # vCard 編碼相容性指南
├── CLAUDE.md               # Claude Code 專案指引
└── README.md               # 專案說明文件
```

## 🚀 部署方式

1. Fork 此專案
2. 在 GitHub Repository 設定中開啟 GitHub Pages
3. 選擇 main branch 作為來源
4. 系統會自動部署到 `https://yourusername.github.io/repository-name/`

## 🔑 Token 系統

### 訪問格式
```
https://yourusername.github.io/repository-name/?token=YOUR_TOKEN
```

### 預設 Token
- **吳勝繙**: `A7g3K9zPq`
- **陳大明**: `LpW2xR8vN` (範例用戶)

### 錯誤處理
- 無 Token 或錯誤 Token：顯示「訪問權限不足」畫面
- 系統會自動顯示具體錯誤訊息

## 👥 多使用者管理

### 新增使用者

1. **建立使用者資源資料夾**：
   ```bash
   mkdir assets/new_user_id
   ```

2. **放置使用者頭像**：
   ```
   assets/new_user_id/photo.jpg
   ```

3. **建立 JSON 設定檔** (`configs/new_user_id.json`)：
   ```json
   {
     "meta": {
       "userId": "new_user_id",
       "profile": "work"
     },
     "data": {
       "name": "使用者姓名",
       "title": "職稱",
       "department": "部門",
       "avatar": "assets/new_user_id/photo.jpg",
       "email": "user@example.com",
       "phone": "02-1234-5678",
       "organization": "組織名稱",
       "address": "地址",
       "greetings": [
         "問候語 1",
         "問候語 2",
         "問候語 3"
       ],
       "socialLinks": {
         "email": "mailto:user@example.com",
         "linkedin": "https://linkedin.com/in/username",
         "github": "https://github.com/username",
         "nfcTool": "nfc-generator.html"
       }
     }
   }
   ```

4. **更新 Token 對應表** (`token_map.json`)：
   ```json
   {
     "A7g3K9zPq": "configs/wu_sheng_fan.json",
     "LpW2xR8vN": "configs/chen_da_ming.json",
     "NEW_TOKEN": "configs/new_user_id.json"
   }
   ```

5. **生成新 Token**：建議使用 9 位隨機英數字組合

## 📱 使用方式

1. **網頁訪問**：使用完整 Token URL 開啟
2. **NFC 卡片**：將 Token URL 寫入 NFC 卡片，靠近手機即可開啟
3. **QR 碼掃描**：名片頁面自動生成 QR 碼，包含當前 Token 參數
4. **加入聯絡人**：點擊「加入聯絡人」按鈕，系統動態生成並下載 .vcf 檔案

## 🔧 技術特點

### 前端動態生成 vCard
- **零 .vcf 檔案**：完全由 JavaScript 動態組裝
- **iOS 相容格式**：遵循 VCARD-GUIDE.md 的最佳實踐
- **動態照片 URL**：自動適應部署環境
- **智能欄位處理**：自動格式化電話號碼、過濾空欄位

### 響應式設計優化
- **移動設備滿版**：在 480px 以下達到 98% 寬度
- **漸進式優化**：針對不同螢幕尺寸的細緻調整
- **觸控友好**：適當的按鈕大小和間距

### 資料驅動架構
- **單一真實來源**：JSON 設定檔是唯一資料來源
- **兩段式載入**：Token Map → 個人設定檔
- **完整錯誤處理**：友善的錯誤訊息顯示

## 📟 NFC 設定指南

### 支援規格
- **Android**: NFC Forum Type 2-4, ISO14443 Type A/B
- **iOS**: NFC Forum Type 2-5, ISO14443 Type A (iPhone 7+)
- **建議晶片**: NTAG213/215/216
- **記錄格式**: NDEF (NFC Data Exchange Format)

### 快速設定
1. 下載 NFC Tools App (Android/iOS)
2. 選擇「新增記錄」→「URL/URI」
3. **重要**: 輸入完整 Token URL：`https://yourusername.github.io/repository-name/?token=YOUR_TOKEN`
4. 將 NFC 卡片靠近手機完成寫入
5. 測試確認能正確開啟瀏覽器並顯示對應使用者名片

詳細設定步驟請參考 [NFC-GUIDE.md](NFC-GUIDE.md)

### 🏷️ NFC 內容產生工具
使用內建的 [NFC 產生器](nfc-generator.html) 可以：
- **自動產生正確格式**: 自動添加 `https://` 協議和 Token 參數
- **支援多種 App**: NFC Tools 和 TagWriter 專用格式
- **容量分析**: 計算需求與晶片建議
- **一鍵複製**: 直接複製到 NFC App 使用

## ⚠️ 重要提醒

- **Token**：建議亂數
- **URL 格式**：NFC 卡片寫入時必須包含完整 Token 參數
- **iOS 中文相容**：系統已自動優化 vCard 格式，確保中文正確顯示
- **環境適應性**：照片 URL 會自動適應部署環境（GitHub Pages/自定義域名）
- **測試驗證**：每次新增使用者或修改設定後，請測試對應的 Token URL
- **JSON 格式**：確保所有 JSON 檔案格式正確，避免語法錯誤

## 📧 聯絡資訊

如有問題或建議，歡迎開啟 Issue 或 Pull Request。

---

*這是一個基於現代前端技術的數位名片解決方案，提供相對防君子、靈活且易於維護的多使用者管理體驗。*