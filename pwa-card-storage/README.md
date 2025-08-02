# PWA 名片離線儲存服務

基於現有 NFC 數位名片系統的 PWA 離線儲存服務，提供完全離線的名片管理功能。

## 🎯 功能特色

- 🔒 **隱私優先設計**：完全本地儲存，無後端追蹤
- 📱 **PWA 支援**：可安裝到桌面，支援離線使用
- 🗄️ **IndexedDB 儲存**：可靠的本地資料庫，支援大量資料
- 🔐 **AES-256 加密**：本地資料加密保護
- 🔄 **版本控制**：自動版本快照，支援回滾
- 📇 **9種名片類型**：完整支援現有名片格式
- 🌐 **雙語支援**：整合現有 bilingual-common.js
- 📤 **匯入匯出**：支援 JSON、vCard 格式
- 📱 **QR 碼生成**：完全離線的 QR 碼生成
- 🔍 **智慧搜尋**：支援姓名、職稱、組織搜尋

## 📦 專案結構

```
pwa-card-storage/
├── index.html                 # PWA 主頁面
├── manifest.json              # Web App Manifest
├── sw.js                      # Service Worker
├── 
├── src/
│   ├── core/
│   │   └── storage.js         # IndexedDB 儲存核心
│   ├── features/
│   │   └── card-manager.js    # 名片管理業務邏輯
│   ├── ui/
│   │   └── components/
│   │       └── card-list.js   # 名片列表 UI 元件
│   └── app.js                 # 主應用程式控制器
├── 
├── assets/
│   └── styles/
│       └── main.css           # 主要樣式
└── 
└── README.md                  # 專案說明
```

## 🚀 快速開始

### 1. 本地開發

```bash
# 啟動本地伺服器
python -m http.server 8000

# 或使用 Node.js
npx http-server

# 訪問 PWA
open http://localhost:8000/pwa-card-storage/
```

### 2. PWA 安裝

1. 在支援的瀏覽器中訪問 PWA
2. 點擊瀏覽器的「安裝」提示
3. 或使用瀏覽器選單中的「安裝應用程式」選項

### 3. 基本使用

1. **新增名片**：從 URL 或檔案匯入名片
2. **離線瀏覽**：完全離線查看已儲存的名片
3. **生成 QR 碼**：為任何名片生成 QR 碼
4. **匯出 vCard**：下載標準聯絡人檔案
5. **資料備份**：匯出所有名片資料

## 🔧 技術架構

### 核心技術

- **PWA**：Service Worker + Web App Manifest
- **儲存**：IndexedDB + localStorage 備份
- **加密**：Web Crypto API (AES-256-GCM)
- **UI**：Vanilla JavaScript + CSS Grid/Flexbox
- **QR 碼**：qrcode.js 本地生成
- **相容性**：整合現有 bilingual-common.js

### 支援的名片類型

1. **gov-yp** - 機關版延平大樓
2. **gov-sg** - 機關版新光大樓
3. **personal** - 個人版
4. **bilingual** - 雙語版
5. **personal-bilingual** - 個人雙語版
6. **en** - 英文版
7. **personal-en** - 個人英文版
8. **gov-yp-en** - 機關版延平英文
9. **gov-sg-en** - 機關版新光英文

### 資料格式

```typescript
interface StoredCard {
  id: string;
  type: CardType;
  data: CardData;
  created: Date;
  modified: Date;
  version: number;
  checksum: string;
  encrypted: boolean;
  tags: string[];
  isFavorite: boolean;
}
```

## 📱 功能說明

### 名片管理

- **自動類型識別**：根據資料內容自動判斷名片類型
- **智慧搜尋**：支援姓名、職稱、組織等欄位搜尋
- **類型篩選**：按名片類型快速篩選
- **收藏功能**：標記重要名片
- **批次操作**：支援多選操作

### 離線功能

- **完全離線**：所有核心功能無需網路連線
- **QR 碼生成**：使用 qrcode.js 本地生成
- **vCard 匯出**：生成標準聯絡人檔案
- **資料備份**：匯出加密的備份檔案

### 資料安全

- **本地加密**：使用 AES-256-GCM 加密儲存
- **版本控制**：自動建立版本快照（保留 10 個版本）
- **完整性檢查**：定期檢查資料完整性
- **健康監控**：自動偵測和修復損壞資料

## 🔒 隱私與安全

### 隱私保護

- ✅ **完全本地儲存**：所有資料僅存在使用者設備
- ✅ **無後端追蹤**：不收集任何使用者行為資料
- ✅ **資料自主**：使用者完全控制自己的資料
- ✅ **開源透明**：所有程式碼公開可檢視

### 安全措施

- 🔐 **AES-256 加密**：本地資料加密保護
- 🔐 **CSP 政策**：防止 XSS 攻擊
- 🔐 **輸入驗證**：嚴格的資料驗證和清理
- 🔐 **HTTPS 強制**：所有連線使用 HTTPS

## 📊 開發進度

### ✅ 已完成任務

- **PWA-01**: PWA 基礎架構建置
  - ✅ Service Worker 實作
  - ✅ Web App Manifest 設定
  - ✅ 基本 PWA 功能
  - ✅ 安裝提示和離線支援

- **PWA-02**: IndexedDB 資料庫設計
  - ✅ 資料庫結構設計
  - ✅ 加密儲存實作
  - ✅ 健康檢查機制
  - ✅ 版本控制基礎

- **PWA-03**: 名片類型自動識別
  - ✅ 9種名片類型識別
  - ✅ 自動類型偵測邏輯
  - ✅ 雙語資料處理
  - ✅ 樣式套用機制

- **PWA-05**: 名片 CRUD 操作
  - ✅ 基本 CRUD 功能
  - ✅ 名片列表 UI 元件
  - ✅ 搜尋和篩選功能
  - ✅ 收藏和操作選單

### 🚧 進行中任務

- **PWA-06**: 離線名片瀏覽介面
- **PWA-09**: 離線 QR 碼生成
- **PWA-11**: 加密檔案匯出功能
- **PWA-13**: PWA 使用者介面整合

### 📋 待完成任務

- **PWA-04**: 雙語支援整合
- **PWA-07**: 資料健康檢查機制
- **PWA-08**: 簡化版本控制
- **PWA-10**: 離線 vCard 匯出
- **PWA-12**: 資料匯入與衝突解決
- **PWA-14**: 跨平台相容性測試
- **PWA-15**: 部署與效能優化

## 🧪 測試

### 功能測試

```bash
# 開啟測試頁面
open http://localhost:8000/pwa-card-storage/

# 測試項目
1. PWA 安裝功能
2. 離線模式運作
3. 名片 CRUD 操作
4. 搜尋和篩選功能
5. QR 碼生成
6. vCard 匯出
```

### 相容性測試

- **桌面瀏覽器**：Chrome 88+, Firefox 85+, Safari 14+
- **行動瀏覽器**：Chrome Mobile, Safari Mobile, Samsung Internet
- **作業系統**：Windows 10+, macOS 10.15+, iOS 12+, Android 8+

## 📄 授權條款

MIT License - 詳見 [LICENSE](../LICENSE) 檔案

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📞 技術支援

如需幫助，請參考：
- [主專案 README](../README.md)
- [GitHub Issues](https://github.com/moda-gov-tw/DB-Card/issues)

---

🇹🇼 **數位發展部開源專案** | **隱私優先，資料自主，開源透明**