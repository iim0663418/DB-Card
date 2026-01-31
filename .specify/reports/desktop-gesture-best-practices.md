# 桌面端圖片查看器手勢最佳實踐

**研究日期**: 2026-01-28  
**目的**: 為實體名片孿生功能設計穩定的桌面端交互

---

## 📊 業界標準操作

### 1. 滑鼠滾輪（Mouse Wheel）

#### 標準行為
- **向上滾動** → 放大（Zoom In）
- **向下滾動** → 縮小（Zoom Out）
- **Ctrl + 滾輪** → 翻頁（可選）

#### 來源
- Windows Photos
- macOS Preview
- Google Photos
- Adobe Lightroom
- Picview

#### 實作建議
```javascript
element.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY;
  
  if (delta < 0) {
    // 向上滾動 → 放大
    zoomIn();
  } else {
    // 向下滾動 → 縮小
    zoomOut();
  }
});
```

---

### 2. 滑鼠拖曳（Mouse Drag）

#### 標準行為
- **左鍵拖曳** → 平移圖片（Pan）
- **圖片小於視窗** → 不可拖曳
- **圖片大於視窗** → 可拖曳

#### 游標樣式
```css
.zoomable-image {
  cursor: grab;
}

.zoomable-image:active {
  cursor: grabbing;
}

.zoomable-image.fit {
  cursor: default; /* 圖片完整顯示時 */
}
```

---

### 3. 雙擊（Double Click）

#### 標準行為（三選一）
1. **切換縮放** - 1:1 ↔ 適應視窗（推薦）
2. **全螢幕** - 進入/退出全螢幕
3. **放大** - 以點擊位置為中心放大

#### 業界標準
- **Windows Photos**: 切換縮放
- **macOS Preview**: 切換縮放
- **Google Photos**: 放大
- **Lightroom**: 1:1 縮放

#### 推薦
```javascript
element.addEventListener('dblclick', (e) => {
  if (isZoomed) {
    fitToWindow(); // 適應視窗
  } else {
    zoomTo100(); // 1:1 原始大小
  }
});
```

---

### 4. 鍵盤快捷鍵

#### 標準快捷鍵
| 按鍵 | 功能 |
|------|------|
| `+` / `=` | 放大 |
| `-` | 縮小 |
| `0` / `1` | 1:1 原始大小 |
| `Esc` | 關閉/退出 |
| `←` / `→` | 上一張/下一張 |
| `Space` | 下一張 |
| `Shift + Space` | 上一張 |

#### 實作建議
```javascript
document.addEventListener('keydown', (e) => {
  switch(e.key) {
    case '+':
    case '=':
      zoomIn();
      break;
    case '-':
      zoomOut();
      break;
    case '0':
    case '1':
      zoomTo100();
      break;
    case 'Escape':
      closeViewer();
      break;
  }
});
```

---

## 🎯 針對實體名片孿生的建議

### 當前問題
- ❌ 自訂手勢在 PC 上不穩定
- ❌ 缺少滑鼠滾輪支援
- ❌ 缺少鍵盤快捷鍵
- ❌ 雙擊行為不明確

---

### 推薦方案：PhotoSwipe v5 + 標準控制

#### PhotoSwipe 內建支援
- ✅ 滑鼠滾輪縮放
- ✅ 拖曳平移
- ✅ 雙擊縮放
- ✅ 鍵盤導航
- ✅ 觸控手勢（移動端）

#### 配置範例
```javascript
const lightbox = new PhotoSwipeLightbox({
  gallery: '#replica-wrapper',
  children: '.replica-face',
  pswpModule: () => import('./photoswipe.esm.js'),
  
  // 桌面端優化
  bgOpacity: 1,
  showHideAnimationType: 'fade',
  
  // 縮放設定
  zoom: true,
  maxZoomLevel: 3,
  initialZoomLevel: 'fit',
  secondaryZoomLevel: 1, // 雙擊縮放到 1:1
  
  // 關閉手勢
  pinchToClose: false,
  closeOnVerticalDrag: false,
  
  // 鍵盤支援
  escKey: true,
  arrowKeys: true
});

lightbox.init();
```

---

## 📐 交互設計建議

### 桌面端（Desktop）

#### 主要操作
1. **滑鼠滾輪** → 縮放（最常用）
2. **拖曳** → 平移
3. **雙擊** → 切換 1:1 / 適應視窗
4. **Esc** → 關閉

#### 次要操作
- `+` / `-` → 縮放
- `0` → 重置
- `←` / `→` → 翻頁（正反面）

---

### 移動端（Mobile）

#### 主要操作
1. **雙指捏合** → 縮放
2. **單指拖曳** → 平移
3. **雙擊** → 切換縮放
4. **單擊** → 翻頁（正反面）

---

## 🔧 實作步驟

### Step 1: 移除自訂手勢
```javascript
// ❌ 移除
class PinchZoom { ... }

// ✅ 使用 PhotoSwipe
import PhotoSwipeLightbox from 'photoswipe-lightbox.esm.js';
```

### Step 2: 配置 PhotoSwipe
```javascript
const lightbox = new PhotoSwipeLightbox({
  // 基本配置
  gallery: '#replica-wrapper',
  children: '.replica-face',
  
  // 桌面端優化
  zoom: true,
  maxZoomLevel: 3,
  initialZoomLevel: 'fit',
  secondaryZoomLevel: 1,
  
  // 穩定性
  pinchToClose: false,
  closeOnVerticalDrag: false
});
```

### Step 3: 添加鍵盤支援
```javascript
lightbox.on('uiRegister', () => {
  lightbox.pswp.keyboard.registerKeys([
    { keyCode: 187, fn: () => lightbox.pswp.zoomTo(lightbox.pswp.currSlide.zoomLevels.max) }, // +
    { keyCode: 189, fn: () => lightbox.pswp.zoomTo(lightbox.pswp.currSlide.zoomLevels.min) }, // -
    { keyCode: 48, fn: () => lightbox.pswp.zoomTo(1) } // 0
  ]);
});
```

---

## 📊 對比分析

| 功能 | 自訂實作 | PhotoSwipe v5 |
|------|---------|---------------|
| 滑鼠滾輪 | ❌ 無 | ✅ 內建 |
| 拖曳平移 | ⚠️ 不穩定 | ✅ 穩定 |
| 雙擊縮放 | ❌ 無 | ✅ 內建 |
| 鍵盤支援 | ❌ 無 | ✅ 內建 |
| 觸控手勢 | ⚠️ 不穩定 | ✅ 穩定 |
| 跨瀏覽器 | ⚠️ 需測試 | ✅ 已驗證 |
| 維護成本 | 高 | 低 |

---

## 🎯 最終建議

### 立即執行
1. ✅ 使用 PhotoSwipe v5（已整合）
2. ✅ 移除自訂 PinchZoom（已完成）
3. ✅ 測試桌面端操作

### 驗證清單
- [ ] 滑鼠滾輪縮放
- [ ] 拖曳平移
- [ ] 雙擊切換縮放
- [ ] Esc 關閉
- [ ] 鍵盤快捷鍵
- [ ] 觸控手勢（移動端）

---

## 📚 參考資源

### 業界標準
- Windows Photos: 滑鼠滾輪縮放
- macOS Preview: 雙擊切換縮放
- Google Photos: 拖曳平移
- Adobe Lightroom: 鍵盤快捷鍵
- Picview: 完整手勢支援

### 技術文檔
- PhotoSwipe: https://photoswipe.com/
- UX Stack Exchange: Zoom UI Best Practices
- Eagle: Focus Zoom Revolution

---

## 結論

**PhotoSwipe v5 已經實作了所有桌面端最佳實踐**：
- ✅ 滑鼠滾輪縮放
- ✅ 拖曳平移
- ✅ 雙擊切換
- ✅ 鍵盤支援
- ✅ 跨平台穩定

**無需額外開發，直接使用即可！**
