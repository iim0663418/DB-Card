# DB-Card 第三方元件授權清單

**最後更新**: 2026-01-22  
**專案版本**: v4.3.0

---

## 📋 總覽

本專案使用以下第三方元件與素材，所有元件均為開源或免費商用授權。

---

## 🎨 前端框架與工具庫

### 1. Tailwind CSS
- **版本**: Latest (CDN)
- **來源**: https://cdn.tailwindcss.com
- **授權**: MIT License
- **用途**: CSS 框架，用於快速構建響應式介面
- **授權連結**: https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE
- **合規性**: ✅ 可商用、可修改、可分發

### 2. Three.js
- **版本**: r128
- **來源**: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
- **授權**: MIT License
- **用途**: 3D 背景動畫效果
- **授權連結**: https://github.com/mrdoob/three.js/blob/dev/LICENSE
- **合規性**: ✅ 可商用、可修改、可分發

### 3. Lucide Icons
- **版本**: 0.562.0
- **來源**: https://unpkg.com/lucide@0.562.0
- **授權**: ISC License
- **用途**: 圖示庫（UI 圖標）
- **授權連結**: https://github.com/lucide-icons/lucide/blob/main/LICENSE
- **合規性**: ✅ 可商用、可修改、可分發

### 4. QRious
- **版本**: 4.0.2
- **來源**: https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js
- **授權**: MIT License
- **用途**: 離線 QR Code 生成（替換 QRCode.js）
- **授權連結**: https://github.com/neocotic/qrious/blob/master/LICENSE.md
- **合規性**: ✅ 可商用、可修改、可分發

### 5. DOMPurify
- **版本**: 3.2.7
- **來源**: https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js
- **授權**: Apache License 2.0 / MPL 2.0 (雙授權)
- **用途**: XSS 防護，清理 HTML 輸入
- **授權連結**: https://github.com/cure53/DOMPurify/blob/main/LICENSE
- **合規性**: ✅ 可商用、可修改、可分發

### 6. Chart.js
- **版本**: 4.5.1
- **來源**: https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js
- **授權**: MIT License
- **用途**: 安全監控儀表板圖表
- **授權連結**: https://github.com/chartjs/Chart.js/blob/master/LICENSE.md
- **合規性**: ✅ 可商用、可修改、可分發

### 7. SimpleWebAuthn
- **版本**: 13.0.0
- **來源**: https://unpkg.com/@simplewebauthn/browser@13.0.0/dist/bundle/index.umd.min.js
- **授權**: MIT License
- **用途**: Passkey (WebAuthn/FIDO2) 認證
- **授權連結**: https://github.com/MasterKale/SimpleWebAuthn/blob/master/LICENSE.md
- **合規性**: ✅ 可商用、可修改、可分發

---

## 🔤 字體

### 1. Google Fonts - Outfit
- **來源**: https://fonts.googleapis.com/css2?family=Outfit
- **授權**: SIL Open Font License 1.1
- **用途**: 英文主要字體
- **授權連結**: https://scripts.sil.org/OFL
- **合規性**: ✅ 可商用、可嵌入、可修改

### 2. Google Fonts - Noto Sans TC
- **來源**: https://fonts.googleapis.com/css2?family=Noto+Sans+TC
- **授權**: SIL Open Font License 1.1
- **用途**: 繁體中文字體
- **授權連結**: https://scripts.sil.org/OFL
- **合規性**: ✅ 可商用、可嵌入、可修改

### 3. Google Fonts - Inter
- **來源**: https://fonts.googleapis.com/css2?family=Inter
- **授權**: SIL Open Font License 1.1
- **用途**: 管理後台介面字體
- **授權連結**: https://scripts.sil.org/OFL
- **合規性**: ✅ 可商用、可嵌入、可修改

---

## 🔧 後端依賴 (Node.js)

### 1. jose
- **版本**: ^6.1.3
- **來源**: npm
- **授權**: MIT License
- **用途**: JWT token 處理（Google OAuth）
- **授權連結**: https://github.com/panva/jose/blob/main/LICENSE.md
- **合規性**: ✅ 可商用、可修改、可分發

---

## 🛠️ 開發工具 (DevDependencies)

### 1. Cloudflare Wrangler
- **版本**: ^4.59.2
- **授權**: MIT License / Apache 2.0
- **用途**: Cloudflare Workers 部署工具
- **合規性**: ✅ 開發工具，不影響最終產品授權

### 2. Vitest
- **版本**: ~3.2.0
- **授權**: MIT License
- **用途**: 單元測試框架
- **合規性**: ✅ 開發工具，不影響最終產品授權

### 3. TypeScript
- **版本**: ^5.5.2
- **授權**: Apache License 2.0
- **用途**: 類型檢查與編譯
- **合規性**: ✅ 開發工具，不影響最終產品授權

### 4. Tailwind CSS (npm)
- **版本**: ^4.1.18
- **授權**: MIT License
- **用途**: CSS 構建工具
- **合規性**: ✅ 開發工具，不影響最終產品授權

### 5. PostCSS & Autoprefixer
- **版本**: ^8.5.6 / ^10.4.23
- **授權**: MIT License
- **用途**: CSS 後處理工具
- **合規性**: ✅ 開發工具，不影響最終產品授權

---

## 🖼️ 圖示與素材

### 1. Favicon (favicon.png / favicon.ico)
- **來源**: 專案自製
- **授權**: MIT License (隨專案授權)
- **用途**: 網站圖示
- **合規性**: ✅ 專案原創素材

---

## ☁️ 雲端服務

### 1. Cloudflare Workers
- **服務**: 無伺服器運算平台
- **授權**: 商業服務（按使用量計費）
- **用途**: 後端 API 託管
- **合規性**: ✅ 商業服務，符合服務條款

### 2. Cloudflare D1
- **服務**: SQLite 相容資料庫
- **授權**: 商業服務（按使用量計費）
- **用途**: 資料儲存
- **合規性**: ✅ 商業服務，符合服務條款

### 3. Cloudflare KV
- **服務**: Key-Value 儲存
- **授權**: 商業服務（按使用量計費）
- **用途**: 快取層
- **合規性**: ✅ 商業服務，符合服務條款

---

## 📊 授權總結

| 授權類型 | 元件數量 | 商用許可 | 修改許可 | 分發許可 |
|---------|---------|---------|---------|---------|
| MIT License | 8 | ✅ | ✅ | ✅ |
| ISC License | 1 | ✅ | ✅ | ✅ |
| Apache 2.0 | 2 | ✅ | ✅ | ✅ |
| SIL OFL 1.1 | 3 | ✅ | ✅ | ✅ |
| 商業服務 | 3 | ✅ | N/A | N/A |

---

## ✅ 合規聲明

1. **所有前端依賴均為開源授權**，允許商業使用、修改與分發
2. **所有字體均為 SIL OFL 授權**，可自由嵌入與商用
3. **雲端服務符合 Cloudflare 服務條款**
4. **專案本身採用 MIT License**，與所有依賴授權相容
5. **無版權風險**，所有元件均已確認授權合規

---

## 📝 歸屬聲明 (Attribution)

根據各授權條款，本專案在此聲明使用以下開源軟體：

- Tailwind CSS © Tailwind Labs Inc.
- Three.js © Ricardo Cabello (mrdoob)
- Lucide Icons © Lucide Contributors
- QRCode.js © David Shim
- DOMPurify © Cure53
- Chart.js © Chart.js Contributors
- Google Fonts © Google Inc.
- jose © Filip Skokan

---

## 🔄 更新政策

本文件將隨專案依賴更新而同步維護。如有新增或移除第三方元件，將即時更新此清單。

**維護責任人**: DB-Card Project Team  
**聯絡方式**: privacy@db-card.example.com

---

**最後審查日期**: 2026-01-19  
**審查結果**: ✅ 所有元件授權合規，無版權風險
