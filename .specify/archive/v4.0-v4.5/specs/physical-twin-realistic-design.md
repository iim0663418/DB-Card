# Physical Twin Realistic Design Specification

## 目標
將 `docs/實體名片孿生雛形.html` 重新設計為擬真展示頁

## Given (當前狀態)
- 雛形包含過多裝飾元素（掃描線、徽章、打字機效果）
- 名片設計與實際 card-display.html 不一致
- 存在雜訊元素影響專業感

## When (設計要求)
重新設計為獨立展示頁，需符合：
1. **擬真設計**：對齊 card-display.html 的實際名片樣式
2. **移除雜訊**：清理不必要的裝飾元素
3. **保留核心**：3D 翻轉、實體孿生模式、雙面展示
4. **真實數據**：使用 MODA 真實範例數據

## Then (產出標準)

### 1. 數位名片設計（對齊實際）

#### 正面 (ZH)
```
┌─────────────────────────────┐
│ 數位名片系統                │
│                             │
│ [頭像]  唐鳳                │
│         數位發展部 部長      │
│                             │
│ ─────────────────────────   │
│                             │
│ 📧 audrey@moda.gov.tw       │
│ 📞 +886 2 2737 7777         │
│ 🌐 moda.gov.tw              │
│                             │
│ ─────────────────────────   │
│ 🛡️ 雲端加密儲存             │
└─────────────────────────────┘
```

#### 背面 (EN)
```
┌─────────────────────────────┐
│ Digital Business Card       │
│                             │
│ [Avatar]  Audrey Tang       │
│           Minister of       │
│           Digital Affairs   │
│                             │
│ ─────────────────────────   │
│                             │
│ 📧 audrey@moda.gov.tw       │
│ 📞 +886 2 2737 7777         │
│ 🌐 moda.gov.tw              │
│                             │
│ ─────────────────────────   │
│ 🛡️ Cloud Encrypted Storage  │
└─────────────────────────────┘
```

### 2. 移除元素清單
- ❌ 掃描線動畫 (`.scan-line`)
- ❌ 徽章圖示 (`.badge-check`)
- ❌ 打字機效果 (`#typewriter-zh`, `#typewriter-en`)
- ❌ 過多浮水印
- ❌ 複雜的 HUD 文字
- ❌ 不必要的動畫效果

### 3. 保留元素清單
- ✅ Three.js 粒子背景
- ✅ 3D 卡片翻轉
- ✅ 長按 5 秒觸發孿生模式
- ✅ 實體名片雙面展示
- ✅ 旋轉功能
- ✅ 分享功能
- ✅ 鍵盤支援 (ESC, 空格)

### 4. 設計規範

#### 顏色
- 主色：`#6868ac` (MODA Purple)
- 背景：`#f0f2f5`
- 文字：`#1e1e3f`, `#64748b`
- 邊框：`rgba(104, 104, 172, 0.15)`

#### 字體
- 標題：`font-black tracking-tight`
- 內文：`font-bold text-xs`
- HUD：`text-[9px] uppercase tracking-widest`

#### 間距
- 卡片內距：`2.5rem`
- 元素間距：`gap-3` ~ `gap-6`
- 圓角：`rounded-2xl` ~ `rounded-3xl`

### 5. 真實數據範例

```javascript
const mockCardData = {
  name_zh: "唐鳳",
  name_en: "Audrey Tang",
  title_zh: "數位發展部 部長",
  title_en: "Minister of Digital Affairs",
  email: "audrey@moda.gov.tw",
  phone: "+886 2 2737 7777",
  website: "https://moda.gov.tw",
  avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
  physical_card_front: "https://i.imgur.com/rN9vL1c.png",
  physical_card_back: "https://i.imgur.com/rN9vL1c.png"
};
```

### 6. 互動行為

#### 數位卡片
- **點擊卡片**: 翻轉中英文
- **空格鍵**: 翻轉卡片
- **長按 5 秒**: 進入孿生模式

#### 實體孿生模式
- **點擊實體名片**: 翻轉正反面
- **旋轉按鈕**: 橫向/縱向切換
- **分享按鈕**: Web Share API
- **ESC 鍵**: 關閉模式
- **點擊背景**: 關閉模式

### 7. 性能要求
- ✅ SRI 完整性驗證
- ✅ 圖片錯誤處理
- ✅ 資源清理 (dispose)
- ✅ GPU 硬體加速
- ✅ 無障礙支援 (ARIA)

### 8. 文件結構

```
docs/實體名片孿生雛形.html
├── <head>
│   ├── CDN (Tailwind, Lucide, Three.js, qr-creator, DOMPurify)
│   └── <style> (精簡 CSS)
├── <body>
│   ├── Three.js Canvas
│   ├── 同步進度環
│   ├── 實體孿生展示層
│   ├── 頂部提示
│   └── 3D 數位卡片
│       ├── 正面 (ZH)
│       └── 背面 (EN)
└── <script> (精簡 JS)
```

## Acceptance Criteria

### ✅ 視覺設計
- [ ] 名片設計與 card-display.html 一致
- [ ] 移除所有雜訊元素
- [ ] 使用真實 MODA 數據
- [ ] 專業簡潔的視覺風格

### ✅ 功能完整
- [ ] 3D 翻轉流暢
- [ ] 長按 5 秒觸發孿生模式
- [ ] 實體名片雙面展示
- [ ] 旋轉功能正常
- [ ] 分享功能正常
- [ ] 鍵盤支援完整

### ✅ 代碼品質
- [ ] SRI 完整性驗證
- [ ] 圖片錯誤處理
- [ ] 資源清理機制
- [ ] 無障礙標籤完整
- [ ] 代碼精簡無冗餘

## Implementation Notes

### 重點修改區域
1. **名片正面** (line ~400-450): 重新設計為左對齊布局
2. **名片背面** (line ~450-500): 重新設計為左對齊布局
3. **CSS 清理** (line ~30-250): 移除不必要的動畫
4. **JS 清理** (line ~500-700): 移除打字機效果

### 保持不變
- Three.js 初始化邏輯
- 孿生模式觸發邏輯
- 實體名片翻轉邏輯
- 錯誤處理機制
