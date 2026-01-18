# PRD: DB-Card Landing Page (index.html)

## 專案資訊
- **版本**: v1.0.0
- **優先級**: P1 (Phase 1 基礎版)
- **預估時間**: 1-2 小時
- **目標**: 建立專業的系統首頁與導航中心

---

## 一、設計目標

### 1.1 核心定位
- **Landing Page**: 展示系統特性與品牌形象
- **導航中心**: 提供清晰的功能入口
- **狀態展示**: 即時系統健康監控

### 1.2 設計原則
- ✅ 視覺統一（與其他頁面一致）
- ✅ 簡潔專業（避免過度設計）
- ✅ 響應式設計（手機/桌面）
- ✅ 快速載入（最小依賴）

---

## 二、視覺設計規範

### 2.1 設計系統
```css
/* 配色 */
--moda-purple: #6868ac;
--bg-gradient: linear-gradient(135deg, rgba(244,247,249,0.3), rgba(230,235,240,0.4));
--glass-bg: rgba(255, 255, 255, 0.7);
--text-primary: #1e293b;
--text-secondary: #64748b;

/* 字體 */
font-family: 'Outfit', 'Noto Sans TC', sans-serif;

/* 圓角 */
border-radius: 2rem (卡片), 1rem (按鈕)

/* 陰影 */
box-shadow: 0 8px 32px rgba(104, 104, 172, 0.1);
```

### 2.2 背景效果
- Three.js 星空 (2000 粒子, opacity: 0.3)
- Three.js 網格 (150x150, opacity: 0.08)
- Canvas opacity: 0.6

---

## 三、頁面結構

### 3.1 Layout
```
┌─────────────────────────────────────┐
│         Hero Section                │
│  - Logo/Title                       │
│  - Tagline                          │
│  - Version Badge                    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│      功能入口 (3 Cards)             │
│  [使用者門戶] [管理後台] [系統健康] │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│      核心特性 (4 Icons)             │
│  [信封加密] [授權會話]              │
│  [審計日誌] [即時撤銷]              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│           Footer                    │
│  Version | GitHub | License         │
└─────────────────────────────────────┘
```

### 3.2 響應式斷點
- Mobile: < 768px (單欄)
- Tablet: 768px - 1024px (雙欄)
- Desktop: > 1024px (三欄)

---

## 四、內容規格

### 4.1 Hero Section
```
標題: DB-Card 數位名片系統
副標題: 企業級安全 | 隱私優先 | 全球邊緣運算
版本: v4.0.0
```

### 4.2 功能入口卡片

#### Card 1: 使用者門戶
- **圖標**: `user` (Lucide)
- **標題**: 使用者門戶
- **描述**: Google OAuth 登入，管理個人數位名片
- **按鈕**: 前往門戶 →
- **連結**: `/user-portal.html`
- **顏色**: Blue (#3b82f6)

#### Card 2: 管理後台
- **圖標**: `shield` (Lucide)
- **標題**: 管理後台
- **描述**: 完整 CRUD 操作與安全監控儀表板
- **按鈕**: 管理系統 →
- **連結**: `/admin-dashboard.html`
- **顏色**: Purple (#6868ac)

#### Card 3: 系統健康
- **圖標**: `activity` (Lucide)
- **標題**: 系統健康
- **描述**: 即時查詢系統狀態與 KEK 版本資訊
- **按鈕**: 查看狀態 →
- **連結**: `/health`
- **顏色**: Green (#10b981)
- **特殊**: 即時 API 查詢，顯示 badge

### 4.3 核心特性

#### Feature 1: 信封加密
- **圖標**: `lock` (Lucide)
- **標題**: 信封加密
- **描述**: 每張名片獨立 DEK，KEK 定期輪換

#### Feature 2: 授權會話
- **圖標**: `clock` (Lucide)
- **標題**: 授權會話
- **描述**: 24 小時 TTL，可撤銷、可限制讀取次數

#### Feature 3: 審計日誌
- **圖標**: `file-text` (Lucide)
- **標題**: 審計日誌
- **描述**: 完整記錄所有存取行為，IP 匿名化

#### Feature 4: 即時撤銷
- **圖標**: `x-circle` (Lucide)
- **標題**: 即時撤銷
- **描述**: NFC 重新觸碰即可撤銷上一個會話

### 4.4 Footer
```
DB-Card v4.0.0 | MIT License
GitHub: https://github.com/iim0663418/DB-Card
Powered by Cloudflare Workers
```

---

## 五、互動規格

### 5.1 卡片懸停效果
```css
.card:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 48px rgba(104, 104, 172, 0.15);
  transition: all 0.3s ease;
}
```

### 5.2 按鈕互動
```css
.button:hover {
  background: linear-gradient(135deg, #6868ac, #8b5cf6);
  transform: translateY(-2px);
}
```

### 5.3 系統健康即時查詢
```javascript
// 頁面載入時查詢 /health
fetch('/health')
  .then(res => res.json())
  .then(data => {
    // 顯示 KEK 版本 badge
    // 顯示活躍卡片數
    // 更新系統狀態指示器
  });
```

---

## 六、技術規格

### 6.1 依賴項
```html
<!-- CDN -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

### 6.2 檔案結構
```
public/
├── index.html          # 主頁面 (本次實作)
├── js/
│   └── landing.js      # 互動邏輯 (可選，或內嵌)
└── css/
    └── landing.css     # 樣式 (可選，或內嵌)
```

### 6.3 效能要求
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

---

## 七、開發檢查清單

### Phase 1 - 基礎實作
- [ ] HTML 結構搭建
- [ ] Three.js 背景初始化
- [ ] Hero Section 實作
- [ ] 3 個功能入口卡片
- [ ] 4 個核心特性展示
- [ ] Footer 實作
- [ ] 響應式佈局測試
- [ ] 移除 Tailwind CDN 警告

### Phase 1.5 - 增強功能 (可選)
- [ ] /health API 即時查詢
- [ ] 系統狀態 badge 顯示
- [ ] 平滑滾動動畫
- [ ] 載入動畫

### 驗收標準
- [ ] 視覺與其他頁面一致
- [ ] 手機/桌面響應式正常
- [ ] 所有連結可點擊
- [ ] 無 console 錯誤
- [ ] 載入時間 < 3 秒

---

## 八、參考資源

### 8.1 現有頁面參考
- `card-display.html` - 背景效果
- `user-portal.html` - 卡片設計
- `admin-dashboard.html` - 配色方案

### 8.2 設計靈感
- Glassmorphism: https://glassmorphism.com
- Lucide Icons: https://lucide.dev
- Tailwind CSS: https://tailwindcss.com

---

## 九、未來擴展 (Phase 2/3)

### Phase 2 - 增強版
- 系統統計視覺化 (Chart.js)
- 技術架構圖
- 使用流程動畫

### Phase 3 - 完整版
- API 文檔連結
- 使用說明/教學
- 多語言切換 (i18n)
- 暗色模式

---

## 十、注意事項

### 10.1 安全考量
- ❌ 不包含任何敏感資訊
- ❌ 不暴露內部 API 結構
- ✅ 僅展示公開功能入口

### 10.2 SEO 優化
```html
<meta name="description" content="DB-Card 企業級 NFC 數位名片系統 - 信封加密、授權會話、審計日誌">
<meta name="keywords" content="NFC, 數位名片, 企業級, 安全, Cloudflare Workers">
```

### 10.3 可訪問性
- WCAG AAA 對比度 (7.8:1)
- 語義化 HTML
- Keyboard navigation
- Screen reader 友好

---

**PRD 版本**: v1.0.0  
**最後更新**: 2026-01-19  
**負責人**: Design Team
