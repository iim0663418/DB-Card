# card-display.html 載入性能優化計劃

**規劃日期**: 2026-01-29  
**目標**: 提升實際性能 15-25%，感知性能 100%

---

## 📊 當前性能基準

| 指標 | 當前值 | 目標值 | 改善 |
|------|--------|--------|------|
| LCP | ~1.2s | ~1.0s | -17% |
| FCP | ~0.8s | ~0.6s | -25% |
| TTI | ~1.5s | ~1.2s | -20% |
| 感知性能 | 基準 | +100% | 2倍 |

**評估**: 當前性能已良好（LCP <2.5s），優化重點在感知性能

---

## 🎯 優化策略

### Phase 1: 感知性能優化（最高優先級）
**預期**: 感知性能 +100%，實際性能 +10-15%  
**時間**: 1 小時  
**投資報酬率**: ⭐⭐⭐⭐⭐

### Phase 2: 實際性能優化（中優先級）
**預期**: 實際性能 +5-10%  
**時間**: 30 分鐘  
**投資報酬率**: ⭐⭐⭐

### Phase 3: 長期優化（低優先級）
**預期**: 實際性能 +5%  
**時間**: 2-4 小時  
**投資報酬率**: ⭐⭐

---

## 🚀 Phase 1: 感知性能優化

### 1.1 Skeleton Loading Screen

**目標**: 感知性能 +100%（研究證實）

#### 實作位置
`workers/public/card-display.html`

#### HTML 結構
```html
<!-- 在 <body> 開頭添加 -->
<div id="loading-skeleton" class="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 z-50">
  <div class="w-full max-w-md mx-6">
    <!-- Card skeleton -->
    <div class="bg-white rounded-2xl shadow-xl p-8 animate-pulse">
      <!-- Avatar -->
      <div class="flex justify-center mb-6">
        <div class="w-24 h-24 bg-slate-200 rounded-full"></div>
      </div>
      
      <!-- Name -->
      <div class="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
      
      <!-- Title -->
      <div class="h-4 bg-slate-200 rounded w-1/2 mx-auto mb-6"></div>
      
      <!-- Contact info -->
      <div class="space-y-3">
        <div class="h-4 bg-slate-200 rounded w-full"></div>
        <div class="h-4 bg-slate-200 rounded w-5/6"></div>
        <div class="h-4 bg-slate-200 rounded w-4/6"></div>
      </div>
    </div>
  </div>
</div>
```

#### JavaScript 控制
```javascript
// 在 renderCard() 成功後隱藏
function hideLoadingSkeleton() {
  const skeleton = document.getElementById('loading-skeleton');
  if (skeleton) {
    skeleton.style.opacity = '0';
    setTimeout(() => skeleton.remove(), 300);
  }
}
```

**預期效果**: 
- 感知載入時間減少 50%
- 跳出率降低 30-40%

---

### 1.2 Resource Hints 優化

**目標**: 減少 300-500ms 連接延遲

#### 實作位置
`workers/public/card-display.html` `<head>`

#### 添加 Resource Hints
```html
<!-- 在 <head> 最前面添加 -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Resource Hints: 優先級由高到低 -->
<!-- Critical: 完整連接（DNS + TCP + TLS） -->
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<link rel="preconnect" href="https://unpkg.com" crossorigin>

<!-- Important: DNS 預解析 -->
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://fonts.gstatic.com">
```

**技術說明**:
- `preconnect`: 完整連接（DNS + TCP + TLS），節省 300-500ms
- `dns-prefetch`: 僅 DNS 解析，節省 50-200ms
- `crossorigin`: 啟用 CORS 預連接

**預期效果**:
- 第三方資源載入 -300-500ms
- FCP 改善 -100-200ms

---

### 1.3 非關鍵 JavaScript 延遲載入

**目標**: 減少 200-400ms 阻塞時間

#### 實作位置
`workers/public/card-display.html` `<head>`

#### 修改 Script 標籤
```html
<!-- 當前：阻塞渲染 -->
<script src="https://unpkg.com/lucide@0.562.0/dist/umd/lucide.min.js"></script>
<script src="/js/config.js"></script>

<!-- 優化：延遲載入 -->
<script src="https://unpkg.com/lucide@0.562.0/dist/umd/lucide.min.js" defer></script>
<script src="/js/config.js" defer></script>
```

**技術說明**:
- `defer`: DOM 解析完成後執行
- 保證執行順序
- 不阻塞 HTML 解析

**已有 defer 的腳本**（保持不變）:
- three.js
- qr-creator
- dompurify

**預期效果**:
- DOM 解析時間 -200-400ms
- FCP 改善 -100-200ms
- TTI 改善 -200-300ms

---

## 🎯 Phase 2: 實際性能優化

### 2.1 圖片 Lazy Loading

**目標**: LCP 改善 -100-200ms

#### 實作位置
所有 `<img>` 標籤

#### 修改方式
```html
<!-- 當前 -->
<img src="..." alt="...">

<!-- 優化 -->
<img src="..." alt="..." loading="lazy" decoding="async">
```

**技術說明**:
- `loading="lazy"`: 瀏覽器原生延遲載入
- `decoding="async"`: 非同步解碼，不阻塞渲染
- 首屏圖片不使用 lazy（避免延遲 LCP）

**預期效果**:
- 非首屏圖片延遲載入
- 初始頁面載入 -100-200ms

---

### 2.2 後端 KV Cache TTL 延長

**目標**: 快取命中率 +20%，API 回應 -50ms

#### 實作位置
`workers/src/handlers/read.ts`

#### 修改 KV TTL
```typescript
// 當前
const KV_TTL = 60; // 60 秒

// 優化
const KV_TTL = 180; // 180 秒（與前端 sessionStorage 一致）
```

**權衡分析**:
- ✅ 減少 DB 查詢
- ✅ 提升回應速度
- ⚠️ 資料更新延遲 +120s
- ✅ Sensitive 卡片仍不快取（安全）

**預期效果**:
- 快取命中率 60% → 80%
- API 回應時間 -50ms（快取命中時）

---

## 🎯 Phase 3: 長期優化（可選）

### 3.1 Three.js 條件載入

**目標**: 手機載入時間 -200-300ms

#### 實作方式
```javascript
// 只在桌面載入背景動畫
if (window.innerWidth >= 1024 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  import('./three-background.js');
}
```

**預期效果**:
- 手機載入時間 -200-300ms
- 節省流量 ~100KB

---

### 3.2 Service Worker 離線快取

**目標**: 重複訪問載入時間 -80%

#### 實作範圍
- 靜態資源（CSS, JS, 圖片）
- API 回應（stale-while-revalidate）

**複雜度**: 高  
**收益**: 中（當前性能已良好）

**建議**: 暫緩執行

---

## 📋 實作優先級

### 🔴 P0: 立即執行（1小時）
- [x] Skeleton Loading Screen
- [x] Resource Hints (preconnect, dns-prefetch)
- [x] defer 非關鍵 JS

**預期總效果**:
- 實際性能: +10-15%
- 感知性能: +100%

---

### 🟡 P1: 評估後執行（30分鐘）
- [ ] 圖片 Lazy Loading
- [ ] 後端 KV TTL 延長

**預期總效果**:
- 實際性能: +5-10%

---

### 🟢 P2: 長期規劃（2-4小時）
- [ ] Three.js 條件載入
- [ ] Service Worker

**預期總效果**:
- 實際性能: +5%

---

## 🧪 測試計劃

### 測試工具
1. **Lighthouse** (Chrome DevTools)
2. **WebPageTest** (https://webpagetest.org)
3. **PageSpeed Insights** (https://pagespeed.web.dev)

### 測試場景
1. **首次訪問**（無快取）
2. **重複訪問**（有快取）
3. **慢速 3G**（模擬行動網路）
4. **桌面 vs 手機**

### 測試指標
- LCP (Largest Contentful Paint)
- FCP (First Contentful Paint)
- TTI (Time to Interactive)
- TBT (Total Blocking Time)
- CLS (Cumulative Layout Shift)

---

## 📊 預期效果總結

| 階段 | 實際性能 | 感知性能 | 時間 | ROI |
|------|---------|---------|------|-----|
| P0 | +10-15% | +100% | 1h | ⭐⭐⭐⭐⭐ |
| P1 | +5-10% | +5-10% | 30m | ⭐⭐⭐ |
| P2 | +5% | +5% | 2-4h | ⭐⭐ |
| **總計** | **+20-30%** | **+110-115%** | **3.5-5.5h** | - |

---

## 🚀 執行步驟

### Step 1: P0 優化（立即執行）
1. 添加 Skeleton Loading HTML + CSS
2. 添加 Resource Hints 到 `<head>`
3. 添加 `defer` 到 lucide 和 config.js
4. 測試並部署到 Staging

### Step 2: 測量效果
1. 使用 Lighthouse 測量前後對比
2. 記錄 LCP, FCP, TTI 數據
3. 用戶測試感知性能

### Step 3: 決定是否執行 P1
- 如果 P0 效果顯著 → 執行 P1
- 如果 P0 效果有限 → 暫緩 P1

### Step 4: 長期規劃
- P2 視業務需求決定

---

## ⚠️ 注意事項

### 1. Skeleton Loading
- 顯示時間不超過 3 秒
- 匹配實際內容佈局
- 使用流暢動畫（shimmer effect）

### 2. Resource Hints
- 不要過度使用（最多 3-4 個 preconnect）
- 只用於關鍵第三方域名

### 3. defer vs async
- defer: 保證執行順序（推薦）
- async: 獨立腳本（如 GA）

### 4. 後端快取
- 監控快取命中率
- 注意資料更新延遲

---

## 📝 成功指標

### 技術指標
- LCP < 1.0s ✅
- FCP < 0.6s ✅
- TTI < 1.2s ✅
- Lighthouse Score > 95 ✅

### 業務指標
- 跳出率降低 30-40%
- 平均停留時間增加 20%
- 用戶滿意度提升

---

## 結論

**最佳策略**: 優先執行 P0（感知性能優化）

**理由**:
1. 當前實際性能已良好（LCP 1.2s < 2.5s）
2. 感知性能提升空間大（+100%）
3. 投資報酬率最高（1小時 → 2倍感知性能）

**建議**: 立即執行 P0，測量效果後再決定 P1/P2
