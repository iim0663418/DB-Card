# Card Display 實體孿生整合 - 深度分析與規劃

**任務等級**: 🔴 HIGH RISK  
**影響範圍**: 核心用戶體驗  
**預估時間**: 4-6 小時  
**創建時間**: 2026-01-28T16:06:00+08:00

---

## 📊 風險評估矩陣

| 風險類別 | 嚴重度 | 可能性 | 風險等級 | 緩解策略 |
|---------|--------|--------|---------|---------|
| 破壞現有翻轉功能 | 高 | 中 | 🔴 高 | 最小侵入設計 + 完整測試 |
| 性能退化 | 中 | 高 | 🟡 中 | 懶加載 + 快取策略 |
| 圖片載入失敗 | 中 | 中 | 🟡 中 | 優雅降級 + 錯誤處理 |
| 響應式佈局破壞 | 中 | 低 | 🟢 低 | 獨立容器 + Flexbox |
| API 安全性 | 高 | 低 | 🟡 中 | 速率限制 + 審計日誌 |
| 快取一致性 | 低 | 中 | 🟢 低 | Cache-Control headers |

---

## 🎯 整合目標

### 核心需求
1. **顯示實體名片圖片**（twin_front/twin_back）
2. **不破壞現有功能**（3D 翻轉、雙語切換）
3. **優雅降級**（無圖片時不顯示）
4. **響應式設計**（桌面/平板/手機）
5. **性能優化**（懶加載、快取）

### 非功能需求
- 載入時間 < 2 秒
- 圖片大小 < 5 MB
- 支援 JPEG/PNG/WebP
- WCAG 2.1 AA 無障礙標準

---

## 🏗️ 架構設計

### 外部最佳實踐研究（2026-01-28）

#### Before/After Slider 業界標準
根據 CodeCanel 和 Cloudinary 的最佳實踐指南：

1. **標籤清晰度** ✅
   - 必須有可見的「正面」/「背面」標籤
   - 支援多語言（中英文）
   - 不依賴顏色或位置暗示

2. **鍵盤操作性** ✅
   - Tab 導航
   - 方向鍵控制
   - 可見的 focus 指示器
   - 符合 WCAG 2.1.1

3. **無障礙標準** ✅
   - 描述性 alt text
   - ARIA labels (aria-label, aria-describedby)
   - 螢幕閱讀器相容
   - 符合 WCAG 2.2 AA

4. **性能優化** ✅
   - 防止 Layout Shift (CLS < 0.1)
   - 固定圖片尺寸 (width/height 或 aspect-ratio)
   - 懶加載非關鍵圖片
   - Eager-load 首屏圖片
   - WebP/AVIF 格式
   - LCP < 2.5s

5. **響應式設計** ✅
   - 觸控目標 ≥ 44×44px (WCAG 2.5.8)
   - 高對比度 (≥ 3:1)
   - 跨裝置測試

6. **倫理與合規** ✅
   - 真實圖片（無誇大）
   - 用戶同意（GDPR/HIPAA）
   - 免責聲明

#### Digital Twin 顯示模式

根據 Maxon Digital Twin 和業界實踐：

1. **並排比較模式** (推薦) ✅
   - 數位與實體並列顯示
   - 清晰的視覺對比
   - 易於理解

2. **漸進式增強** ✅
   - 核心功能優先（數位名片）
   - 實體孿生為增強功能
   - 無圖片時優雅降級

3. **性能優先** ✅
   - 首次載入 < 2s
   - 快取策略
   - CDN 分發

### 選項分析

#### 選項 A：獨立區塊（推薦）✅
```
┌─────────────────────────┐
│   數位名片（3D 翻轉）    │
│   ┌─────────────────┐   │
│   │  Card Front/Back │   │
│   └─────────────────┘   │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│   實體孿生（獨立區塊）   │
│   ┌─────┐   ┌─────┐    │
│   │Front│   │Back │    │
│   └─────┘   └─────┘    │
└─────────────────────────┘
```

**優點**：
- ✅ 最小侵入（不修改現有翻轉邏輯）
- ✅ 獨立錯誤處理
- ✅ 易於測試
- ✅ 漸進式增強

**缺點**：
- ⚠️ 頁面變長（需滾動）
- ⚠️ 視覺分離感

#### 選項 B：整合到翻轉 ❌
```
正面：數位資料
背面：實體圖片
```

**優點**：
- ✅ 視覺統一

**缺點**：
- ❌ 高風險（需重構翻轉邏輯）
- ❌ 破壞雙語功能
- ❌ 複雜度高

#### 選項 C：Tab 切換 ⚠️
```
[數位名片] [實體孿生]
```

**優點**：
- ✅ 完全獨立

**缺點**：
- ⚠️ UX 不佳（需額外點擊）
- ⚠️ 不符合「孿生」概念

### 最終決策：選項 A（獨立區塊）

---

## 📐 技術設計

### 1. API 設計

#### 新增 API 端點
```typescript
GET /api/assets/:card_uuid/twin
```

**返回結構**：
```json
{
  "twin_enabled": true,
  "assets": [
    {
      "asset_type": "twin_front",
      "asset_id": "uuid",
      "version": 1,
      "url": "/api/assets/:id/content?variant=detail"
    },
    {
      "asset_type": "twin_back",
      "asset_id": "uuid",
      "version": 1,
      "url": "/api/assets/:id/content?variant=detail"
    }
  ]
}
```

#### 安全性考量
- ✅ 公開 API（無需認證）
- ✅ 速率限制：100 req/min per IP
- ✅ Cache-Control: public, max-age=3600
- ✅ 審計日誌：記錄訪問

### 2. 前端設計

#### HTML 結構（基於最佳實踐）
```html
<!-- 在 card-perspective 之後 -->
<section id="physical-twin-section" 
         class="hidden" 
         aria-label="實體名片孿生"
         role="region">
  <div class="twin-container">
    <h2 class="hud-text text-center mb-8" data-i18n="physical-twin-title">
      實體名片孿生 Physical Card Twin
    </h2>
    
    <div class="twin-grid">
      <!-- 正面 -->
      <figure class="twin-card" role="img" aria-labelledby="twin-front-label">
        <img src="..." 
             alt="實體名片正面" 
             loading="lazy"
             decoding="async"
             width="600"
             height="400"
             style="aspect-ratio: 3/2;">
        <figcaption id="twin-front-label" class="twin-label">
          <span data-i18n="twin-front">正面 Front</span>
        </figcaption>
      </figure>
      
      <!-- 背面 -->
      <figure class="twin-card" role="img" aria-labelledby="twin-back-label">
        <img src="..." 
             alt="實體名片背面" 
             loading="lazy"
             decoding="async"
             width="600"
             height="400"
             style="aspect-ratio: 3/2;">
        <figcaption id="twin-back-label" class="twin-label">
          <span data-i18n="twin-back">背面 Back</span>
        </figcaption>
      </figure>
    </div>
    
    <!-- 點擊放大提示 -->
    <p class="text-center text-sm text-slate-500 mt-4" data-i18n="twin-hint">
      點擊圖片可放大查看 Click to enlarge
    </p>
  </div>
</section>
```

#### CSS 策略（符合 WCAG 2.2 AA）
```css
.twin-container {
  max-width: 56rem; /* 與 card-perspective 一致 */
  margin: 2rem auto;
  padding: 0 1rem;
}

.twin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.twin-card {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.twin-card:hover,
.twin-card:focus-within {
  transform: translateY(-4px);
}

.twin-card img {
  width: 100%;
  height: auto;
  object-fit: contain; /* 保持比例 */
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(104, 104, 172, 0.12);
}

.twin-label {
  margin-top: 1rem;
  text-align: center;
  font-weight: 700;
  color: var(--moda-accent);
  font-size: 0.875rem;
  letter-spacing: 0.05em;
}

/* 鍵盤 focus 指示器 (WCAG 2.4.7) */
.twin-card:focus {
  outline: 2px solid var(--moda-accent);
  outline-offset: 4px;
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .twin-card img {
    border: 2px solid currentColor;
  }
}

/* 減少動畫模式 */
@media (prefers-reduced-motion: reduce) {
  .twin-card {
    transition: none;
  }
}
```

#### JavaScript 邏輯（漸進式增強）
```javascript
async function loadPhysicalTwin(cardUuid) {
  const section = document.getElementById('physical-twin-section');
  if (!section) return;
  
  // 檢查 sessionStorage 快取
  const cacheKey = `twin_${cardUuid}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const data = JSON.parse(cached);
      renderPhysicalTwin(data);
      return;
    } catch (e) {
      sessionStorage.removeItem(cacheKey);
    }
  }
  
  // 從 API 載入
  try {
    const response = await fetch(`/api/assets/${cardUuid}/twin`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      // 優雅降級：不顯示錯誤
      console.info('Physical twin not available');
      return;
    }
    
    const data = await response.json();
    
    if (!data.twin_enabled || !data.assets || data.assets.length === 0) {
      return; // 無圖片，不顯示區塊
    }
    
    // 快取結果
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    
    renderPhysicalTwin(data);
  } catch (error) {
    console.warn('Failed to load physical twin:', error);
    // 不顯示錯誤給用戶（優雅降級）
  }
}

function renderPhysicalTwin(data) {
  const section = document.getElementById('physical-twin-section');
  const grid = section.querySelector('.twin-grid');
  
  // 清空現有內容
  grid.innerHTML = '';
  
  // 渲染圖片
  data.assets.forEach(asset => {
    const figure = document.createElement('figure');
    figure.className = 'twin-card';
    figure.setAttribute('role', 'img');
    figure.setAttribute('tabindex', '0');
    
    const labelId = `twin-${asset.asset_type}-label`;
    figure.setAttribute('aria-labelledby', labelId);
    
    const img = document.createElement('img');
    img.src = asset.url;
    img.alt = asset.asset_type === 'twin_front' ? '實體名片正面' : '實體名片背面';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 600;
    img.height = 400;
    img.style.aspectRatio = '3/2';
    
    // 點擊放大
    img.onclick = () => openLightbox(asset.url, img.alt);
    img.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(asset.url, img.alt);
      }
    };
    
    const figcaption = document.createElement('figcaption');
    figcaption.id = labelId;
    figcaption.className = 'twin-label';
    
    const span = document.createElement('span');
    span.setAttribute('data-i18n', asset.asset_type === 'twin_front' ? 'twin-front' : 'twin-back');
    span.textContent = asset.asset_type === 'twin_front' ? '正面 Front' : '背面 Back';
    
    figcaption.appendChild(span);
    figure.appendChild(img);
    figure.appendChild(figcaption);
    grid.appendChild(figure);
  });
  
  // 顯示區塊
  section.classList.remove('hidden');
  
  // 更新 i18n
  if (typeof updateI18n === 'function') {
    updateI18n();
  }
}

function openLightbox(url, alt) {
  // 簡單的 lightbox 實作（可使用現有 modal 邏輯）
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', alt);
  
  modal.innerHTML = `
    <div class="relative max-w-7xl max-h-[90vh] bg-white rounded-2xl p-4">
      <button onclick="this.closest('.fixed').remove()" 
              class="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-slate-100"
              aria-label="關閉">
        <i data-lucide="x" class="w-6 h-6"></i>
      </button>
      <img src="${url}" 
           alt="${alt}" 
           class="max-w-full max-h-[80vh] w-auto h-auto object-contain">
    </div>
  `;
  
  // ESC 關閉
  modal.onkeydown = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
    }
  };
  
  // 點擊背景關閉
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  
  document.body.appendChild(modal);
  
  // 初始化 Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // Focus trap
  modal.querySelector('button').focus();
}
```

### 3. 性能優化

#### 懶加載策略
```html
<img src="..." loading="lazy" decoding="async">
```

#### 快取策略
```javascript
// 前端快取（sessionStorage）
const cacheKey = `twin_${cardUuid}`;
const cached = sessionStorage.getItem(cacheKey);
if (cached) {
  renderPhysicalTwin(JSON.parse(cached));
  return;
}
```

#### 後端快取
```typescript
// KV Cache: 1 hour TTL
const cacheKey = `twin:${card_uuid}`;
await env.KV.put(cacheKey, JSON.stringify(result), {
  expirationTtl: 3600
});
```

---

## 🔄 實作流程

### Phase 1: 後端 API（1-2 小時）
1. ✅ 創建 `/api/assets/:card_uuid/twin` 端點
2. ✅ 實作速率限制
3. ✅ 實作 KV 快取
4. ✅ 實作審計日誌
5. ✅ 單元測試

### Phase 2: 前端整合（2-3 小時）
1. ✅ 新增 HTML 結構
2. ✅ 新增 CSS 樣式
3. ✅ 實作 JavaScript 邏輯
4. ✅ 實作懶加載
5. ✅ 實作錯誤處理
6. ✅ 響應式測試

### Phase 3: 測試與優化（1 小時）
1. ✅ 功能測試（有圖/無圖）
2. ✅ 性能測試（載入時間）
3. ✅ 響應式測試（桌面/平板/手機）
4. ✅ 無障礙測試（鍵盤導航、螢幕閱讀器）
5. ✅ 錯誤場景測試

---

## 🧪 測試計畫

### 測試場景

#### 場景 1：有實體孿生圖片
- **Given**: 名片有 twin_front 和 twin_back
- **When**: 載入 Card Display
- **Then**: 顯示實體孿生區塊，兩張圖片正常顯示

#### 場景 2：無實體孿生圖片
- **Given**: 名片沒有實體孿生
- **When**: 載入 Card Display
- **Then**: 不顯示實體孿生區塊，不影響其他功能

#### 場景 3：只有一張圖片
- **Given**: 名片只有 twin_front
- **When**: 載入 Card Display
- **Then**: 只顯示正面圖片

#### 場景 4：圖片載入失敗
- **Given**: 圖片 URL 無效
- **When**: 載入 Card Display
- **Then**: 顯示佔位符或隱藏該圖片

#### 場景 5：網路慢速
- **Given**: 網路速度慢
- **When**: 載入 Card Display
- **Then**: 數位名片先顯示，實體孿生懶加載

### 測試清單

- [ ] 功能測試
  - [ ] 有圖片顯示
  - [ ] 無圖片隱藏
  - [ ] 單張圖片顯示
  - [ ] 圖片載入失敗處理
- [ ] 性能測試
  - [ ] 首次載入 < 2s
  - [ ] 快取命中 < 200ms
  - [ ] 懶加載正常
- [ ] 響應式測試
  - [ ] 桌面（1920×1080）
  - [ ] 平板（1024×768）
  - [ ] 手機（375×667）
- [ ] 無障礙測試
  - [ ] 鍵盤導航
  - [ ] 螢幕閱讀器
  - [ ] Alt text
- [ ] 相容性測試
  - [ ] Chrome/Edge
  - [ ] Safari
  - [ ] Firefox
  - [ ] Mobile Safari

---

## 🚨 回滾計畫

### 觸發條件
- 載入時間 > 5 秒
- 錯誤率 > 5%
- 現有功能破壞

### 回滾步驟
1. 移除 `#physical-twin-section` HTML
2. 移除相關 CSS
3. 移除 JavaScript 邏輯
4. 保留後端 API（不影響其他功能）

---

## 📝 檢查清單

### 開發前
- [ ] 確認現有功能正常（3D 翻轉、雙語切換）
- [ ] 備份 card-display.html
- [ ] 創建 feature branch

### 開發中
- [ ] 遵循最小侵入原則
- [ ] 每個階段提交 Git
- [ ] 持續測試現有功能

### 開發後
- [ ] 完整測試所有場景
- [ ] 性能測試通過
- [ ] 無障礙測試通過
- [ ] Code Review
- [ ] 部署到 Staging
- [ ] 用戶驗收測試

---

## 🎯 成功標準

1. ✅ 實體孿生圖片正常顯示
2. ✅ 現有功能無破壞（3D 翻轉、雙語切換）
3. ✅ 載入時間 < 2 秒
4. ✅ 優雅降級（無圖片時不顯示）
5. ✅ 響應式設計正常
6. ✅ 無障礙標準符合 WCAG 2.1 AA
7. ✅ 錯誤率 < 1%

---

## 📚 參考資料

- [ADR-002: 信封加密架構](../../docs/adr/ADR-002-envelope-encryption.md)
- [實體孿生後端設計](../specs/physical-twin-backend-design-final.md)
- [Asset Upload API](../specs/asset-upload-api.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**下一步**: 創建 BDD 規格並開始實作 Phase 1（後端 API）
