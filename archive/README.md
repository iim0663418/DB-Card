# DB-Card v3.X Archive

本目錄包含 DB-Card v3.X 版本的完整實作，已於 v4.0 重構後封存。

## 封存日期
2026-01-18

## 封存原因
v4.0 採用全新架構（Cloudflare Workers + D1 + IndexedDB），v3.X 的純前端實作已不再使用。

## 目錄結構

### v3-frontend/
v3.X 的前端 HTML 檔案：
- 9 個名片顯示頁面（機關版、個人版、雙語版）
- 2 個 NFC 生成器（單語、雙語）

**特色**：
- 純前端架構
- Base64 編碼資料
- 無後端依賴

### v3-docs/
v3.X 的使用文檔：
- NFC-GUIDE.md - NFC 操作說明
- VCARD-GUIDE.md - vCard 格式指南
- PHOTO-GUIDE.md - 照片處理指南
- 部署測試報告

### v3-assets/
v3.X 的資源檔案：
- assets/ - 圖片、樣式、腳本
- lib/ - 統一語言管理函式庫

**特色**：
- 完整的雙語系統
- 高齡友善設計
- 離線 QR 碼生成

### v3-pwa/
v3.X 的 PWA 離線收納系統：
- 完整的 PWA 應用
- Service Worker
- IndexedDB 儲存（4 個 Object Stores）
- 版本控制系統
- 跨設備傳輸

**特色**：
- 完整的 CRUD 操作
- 安全性防護（XSS、CWE-117）
- 資料加密選項
- 重複檢測（fingerprint）

### v3-deployment/
v3.X 的部署工具：
- deploy/ - 自動化部署腳本
- deployment/ - 多平台配置（AWS、Cloudflare、GitHub Pages、Netlify、Vercel）

**特色**：
- 自動化部署驗證
- 環境檢測
- 資源完整性管理

### v3-tests/
v3.X 的測試套件：
- 安全性測試
- 翻譯系統測試
- PWA 整合測試

## v3.X vs v4.0 主要差異

| 特性 | v3.X | v4.0 |
|------|------|------|
| 架構 | 純前端 | Cloudflare Workers + D1 |
| 資料儲存 | Base64 in URL | 加密資料庫 |
| 授權機制 | 無 | ReadSession (24h, 20 reads) |
| 管理介面 | 無 | Admin Dashboard |
| 安全性 | 基本 | Envelope Encryption + KEK |
| 離線支援 | PWA (完整) | IndexedDB (快取) |
| 部署 | 靜態托管 | Cloudflare Workers |

## 參考價值

### 可借鑒的部分
1. **PWA 架構** (v3-pwa/)
   - 完整的 IndexedDB 實作
   - 版本控制系統
   - 重複檢測機制
   - 安全日誌（SecureLogger）

2. **雙語系統** (v3-assets/lib/)
   - 統一語言管理
   - 翻譯鍵值系統

3. **部署工具** (v3-deployment/)
   - 多平台配置
   - 自動化驗證

### 不建議使用的部分
- Base64 編碼方式（已改用加密資料庫）
- 純前端架構（已改用 Workers）
- 無授權機制（已實作 ReadSession）

## 如何使用封存內容

### 查看 v3.X 實作
```bash
cd archive/v3-frontend/
# 開啟任一 HTML 檔案查看
```

### 參考 PWA 架構
```bash
cd archive/v3-pwa/pwa-card-storage/
# 查看 src/core/storage.js
```

### 參考部署配置
```bash
cd archive/v3-deployment/deployment/
# 查看各平台配置檔案
```

## 注意事項

1. **不建議直接使用**：v3.X 已過時，建議使用 v4.0
2. **僅供參考**：可參考架構設計和實作細節
3. **安全性考量**：v3.X 的安全性不如 v4.0
4. **維護狀態**：v3.X 不再維護和更新

## 相關連結

- [v4.0 README](../README.md)
- [v4.0 安全性評估](../docs/SECURITY-ASSESSMENT-ADMIN-TOKEN.md)
- [v4.0 開發記憶](../.specify/memory/)

---

**封存版本**：v3.2.1  
**最後更新**：2025-08-09  
**封存時間**：2026-01-18
