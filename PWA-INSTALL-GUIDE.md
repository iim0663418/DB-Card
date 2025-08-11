# PWA 桌面安裝指南

## 🚀 功能概述

現在每個數位名片都可以直接安裝到桌面，成為獨立的桌面應用程式！

## 📱 支援的名片類型

系統支援 9 種名片類型的 PWA 安裝：

1. **機關版 - 延平大樓** (`index.html`)
2. **機關版 - 新光大樓** (`index1.html`)
3. **機關版 - 延平大樓 (英文)** (`index-en.html`)
4. **機關版 - 新光大樓 (英文)** (`index1-en.html`)
5. **個人版** (`index-personal.html`)
6. **個人版 (英文)** (`index-personal-en.html`)
7. **雙語版 - 延平大樓** (`index-bilingual.html`)
8. **雙語版 - 新光大樓** (`index1-bilingual.html`)
9. **雙語版 - 個人版** (`index-bilingual-personal.html`)

## 🔧 安裝方式

### 方法一：從名片頁面直接安裝

1. 開啟任何一個名片頁面
2. 等待頁面完全載入
3. 點擊「📱 安裝到桌面」按鈕（如果出現）
4. 確認安裝提示

### 方法二：瀏覽器安裝提示

1. 開啟名片頁面
2. 瀏覽器會自動顯示安裝提示
3. 點擊「安裝」或「加入主畫面」

## 🌐 瀏覽器支援

### Chrome/Edge (推薦)
- ✅ 完整支援 PWA 安裝
- ✅ 桌面圖示和獨立視窗
- ✅ 離線功能

### Safari (iOS/macOS)
- ✅ 支援「加入主畫面」
- ⚠️ 功能略有限制

### Firefox
- ⚠️ 部分支援 PWA 功能
- ✅ 基本離線功能

## 📋 安裝後功能

### 桌面應用程式特性
- 🖥️ 獨立視窗運行
- 📱 桌面圖示
- ⚡ 快速啟動
- 🔄 離線瀏覽

### 保留的功能
- 📱 vCard 聯絡人下載
- 💾 PWA 離線儲存
- 📷 QR 碼生成
- 🔗 社群連結處理

## 🛠️ 技術實作

### 檔案結構
```
├── sw.js                           # 通用 Service Worker
├── manifest-index.json             # 機關版-延平 PWA 設定
├── manifest-index1.json            # 機關版-新光 PWA 設定
├── manifest-personal.json          # 個人版 PWA 設定
├── manifest-bilingual.json         # 雙語版-延平 PWA 設定
├── assets/pwa-install.js           # PWA 安裝腳本
└── [各名片頁面].html               # 已整合 PWA 功能
```

### Service Worker 功能
- 📦 基本資源快取
- 🔄 離線瀏覽支援
- ⚡ 快速載入

## 🔍 故障排除

### 安裝按鈕未出現
1. 確認瀏覽器支援 PWA
2. 檢查是否已安裝該名片
3. 重新整理頁面

### 安裝失敗
1. 檢查網路連線
2. 清除瀏覽器快取
3. 嘗試不同瀏覽器

### 離線功能異常
1. 確認 Service Worker 已註冊
2. 檢查瀏覽器開發者工具
3. 重新安裝 PWA

## 📞 技術支援

如需協助，請參考：
- [主要專案文檔](README.md)
- [GitHub Issues](https://github.com/moda-gov-tw/DB-Card/issues)

---

**🏛️ 數位發展部開源專案**  
**🔒 隱私優先 • 資料自主 • 開源透明**