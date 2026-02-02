# 沉浸式圖片查看器最佳實踐研究

**研究日期**: 2026-01-28  
**目的**: 為實體名片孿生功能尋找穩定的圖片查看器解決方案

---

## 📊 業界標準庫比較

### 1. PhotoSwipe v5 ⭐ (推薦)

**官網**: https://photoswipe.com/  
**GitHub Stars**: 24,961  
**授權**: MIT  
**維護狀態**: 活躍（2024 更新）

#### 核心優勢
- ✅ **零依賴**: 純 JavaScript，無需 jQuery
- ✅ **ES6 模組**: 支援動態 import，不阻塞頁面渲染
- ✅ **性能優化**: 改進的動畫和手勢引擎
- ✅ **響應式圖片**: 內建 srcset 支援，動態載入大圖
- ✅ **觸控友善**: Pinch-to-zoom、滑動切換
- ✅ **無障礙**: WCAG 2.1 相容
- ✅ **輕量級**: 單一 CSS 檔案，動態生成圖示

#### 核心功能
```javascript
import Lightbox from './photoswipe-lightbox.esm.js';

const lightbox = new Lightbox({
  gallery: '#my-gallery',
  children: 'a',
  pswpModule: () => import('./photoswipe.esm.js')
});

lightbox.init();
```

#### 手勢支援
- Pinch-to-zoom（雙指縮放）
- Pan（拖曳平移）
- Swipe（滑動切換）
- Double-tap zoom（雙擊縮放）

#### 插件生態
- **Dynamic Caption**: 動態定位標題
- **Deep Zoom**: 超大圖片分塊載入（實驗性）

---

### 2. Panzoom

**GitHub**: @panzoom/panzoom  
**授權**: MIT  
**特點**: 專注於縮放和平移

#### 優勢
- ✅ 輕量級（~5KB gzipped）
- ✅ 支援觸控和滑鼠
- ✅ 可配置的縮放限制
- ✅ 平滑動畫

#### 限制
- ⚠️ 無內建 Lightbox 功能
- ⚠️ 需要自行處理全螢幕

---

### 3. LightGallery

**官網**: https://www.lightgalleryjs.com/  
**授權**: GPLv3（商業授權需付費）  
**特點**: 功能豐富

#### 優勢
- ✅ 支援圖片、影片、YouTube
- ✅ 縮圖導航
- ✅ 全螢幕模式

#### 限制
- ❌ 商業使用需付費
- ⚠️ 較重（~50KB）

---

## 🎯 針對實體名片孿生的建議

### 當前實作分析

**現有方案**:
- Three.js 粒子背景（裝飾性）
- 自訂 Pinch Zoom 類別
- 手動處理手勢

**問題**:
- 複雜度高
- 維護成本高
- 可能有邊緣案例未處理

---

### 推薦方案：PhotoSwipe v5

#### 為什麼選擇 PhotoSwipe？

1. **穩定性** ⭐⭐⭐⭐⭐
   - 24,961 GitHub stars
   - 業界標準（被 Medium、Unsplash 等使用）
   - 活躍維護（2024 更新）

2. **性能** ⭐⭐⭐⭐⭐
   - 改進的動畫引擎
   - 硬體加速
   - 懶加載支援

3. **手勢處理** ⭐⭐⭐⭐⭐
   - 經過實戰驗證的 Pinch Zoom
   - 流暢的觸控體驗
   - 跨裝置相容

4. **無障礙** ⭐⭐⭐⭐⭐
   - WCAG 2.1 相容
   - 鍵盤導航
   - 螢幕閱讀器支援

5. **輕量級** ⭐⭐⭐⭐
   - 零依賴
   - 單一 CSS 檔案
   - 動態 import 支援

---

## 🔧 實作建議

### 選項 A：完全替換為 PhotoSwipe（推薦）

**優點**:
- ✅ 穩定可靠
- ✅ 維護成本低
- ✅ 功能完整

**缺點**:
- ⚠️ 需要重構現有代碼
- ⚠️ 失去 Three.js 粒子背景

**實作步驟**:
1. 移除自訂 PinchZoom 類別
2. 移除 Three.js 粒子系統（可選）
3. 整合 PhotoSwipe
4. 保留 3D 翻轉功能

---

### 選項 B：混合方案

**保留**:
- Three.js 粒子背景（裝飾性）
- 3D 翻轉動畫

**替換**:
- 使用 PhotoSwipe 處理圖片縮放和手勢

**優點**:
- ✅ 保留視覺特色
- ✅ 提升手勢穩定性

**缺點**:
- ⚠️ 複雜度較高
- ⚠️ 需要整合兩個系統

---

### 選項 C：保持現狀 + 優化

**優點**:
- ✅ 無需重構
- ✅ 保留完整控制

**缺點**:
- ❌ 維護成本高
- ❌ 可能有未知 bug

**建議**:
- 僅在時間緊迫時選擇
- 長期應考慮遷移到 PhotoSwipe

---

## 📐 Three.js 粒子系統評估

### 當前用途
- 純裝飾性背景
- 不影響核心功能

### 性能考量
- ⚠️ 低階裝置可能卡頓
- ⚠️ 增加電池消耗
- ⚠️ 複雜度高

### 建議
1. **保留但優化**:
   - 減少粒子數量（1000 → 500）
   - 降低更新頻率
   - 加入性能檢測（自動降級）

2. **替換為 CSS 動畫**:
   - 使用 CSS `backdrop-filter`
   - 漸層動畫
   - 更輕量

3. **完全移除**:
   - 簡化代碼
   - 提升性能
   - 保持專注於核心功能

---

## 🎯 最終建議

### 短期（當前版本）
- ✅ 保持現狀
- ✅ 完成功能整合
- ✅ 記錄已知問題

### 中期（v4.6.0）
- ✅ 遷移到 PhotoSwipe
- ✅ 移除自訂 PinchZoom
- ✅ 優化 Three.js 粒子（或移除）

### 長期（v5.0.0）
- ✅ 完全基於 PhotoSwipe
- ✅ 簡化代碼庫
- ✅ 提升維護性

---

## 📚 參考資源

### PhotoSwipe
- 官網: https://photoswipe.com/
- GitHub: https://github.com/dimsemenov/photoswipe
- 文檔: https://photoswipe.com/getting-started/

### 其他資源
- LightGallery: https://www.lightgalleryjs.com/
- Panzoom: https://github.com/timmywil/panzoom
- Three.js 最佳實踐: https://threejs.org/manual/#en/optimize

---

## 結論

**當前階段**: 保持現有實作，完成功能整合  
**下一版本**: 考慮遷移到 PhotoSwipe v5  
**理由**: 穩定性、維護性、性能優化

PhotoSwipe 是業界標準，經過實戰驗證，能大幅降低維護成本並提升用戶體驗。
