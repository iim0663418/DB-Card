# GitHub-based 數位名片

一個可部署於 GitHub Pages 的網頁名片系統，支援 NFC 和 QR 碼快速開啟，並自動觸發 .vcf 聯絡人下載。

## 🎯 功能特色

- 📱 **行動裝置優化**：支援 NFC 或 QR 碼快速開啟
- 📇 **自動下載聯絡人**：一鍵下載 .vcf 檔案並加入聯絡人
- 🖼 **個人化展示**：大頭照、社群連結、職稱資訊與動態個人簡介
- 🌐 **GitHub Pages 部署**：無需伺服器，直接部署至 GitHub Pages
- 📱 **跨平台相容**：Android 和 iOS 均可正常使用

## 📦 專案結構

```
├── index.html              # 主網頁入口
├── wu-shengfan.vcf         # vCard 聯絡人檔案
├── assets/
│   ├── photo.png           # 個人頭像
│   ├── moda-logo.svg       # MODA 官方標誌
│   └── COPYRIGHT.txt       # 版權聲明文件
├── NFC-GUIDE.md            # NFC 設定使用指南
└── README.md               # 專案說明文件
```

## 🚀 部署方式

1. Fork 此專案
2. 在 GitHub Repository 設定中開啟 GitHub Pages
3. 選擇 main branch 作為來源
4. 訪問 `https://yourusername.github.io/repository-name/`

## 📱 使用方式

1. **網頁訪問**：直接開啟 GitHub Pages 網址
2. **NFC 卡片**：將網址寫入 NFC 卡片，靠近手機即可開啟
3. **QR 碼掃描**：名片頁面自動生成 QR 碼，用手機相機掃描即可快速開啟
4. **下載聯絡人**：點擊「加入聯絡人」按鈕下載 .vcf 檔案

## 📟 NFC 設定指南

### 支援規格
- **Android**: NFC Forum Type 2-4, ISO14443 Type A/B
- **iOS**: NFC Forum Type 2-5, ISO14443 Type A (iPhone 7+)
- **建議晶片**: NTAG213/215/216
- **記錄格式**: NDEF (NFC Data Exchange Format)

### 快速設定
1. 下載 NFC Tools App (Android/iOS)
2. 選擇「寫入」→「URL」
3. 輸入您的 GitHub Pages 網址
4. 將 NFC 卡片靠近手機完成寫入

詳細設定步驟請參考 [NFC-GUIDE.md](NFC-GUIDE.md)
### 🏷️ NFC 內容產生工具\n使用內建的 [NFC 產生器](nfc-generator.html) 可以：\n- 自動產生標準的 NFC 寫入內容\n- 提供 NDEF 記錄格式\n- 計算容量需求與晶片建議\n- 一鍵複製到剪貼簿

## 🔧 自訂設定

1. 替換 `assets/photo.png` 為您的頭像
2. 修改 `index.html` 中的個人資訊
3. 更新 `.vcf` 檔案中的聯絡資訊

## 📧 聯絡資訊

如有問題或建議，歡迎開啟 Issue 或 Pull Request。
