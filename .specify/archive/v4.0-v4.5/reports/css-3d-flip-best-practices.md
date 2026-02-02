# CSS 3D 卡片翻轉最佳實踐

**研究日期**: 2026-01-29  
**目的**: 優化 digital-card-flip-preview.html 的翻轉動畫

---

## 📊 核心技術要點

### 1. `backface-visibility: hidden`

#### 用途
- 隱藏元素的背面（旋轉 180° 後）
- 防止翻轉時看到鏡像內容

#### 最佳實踐
```css
.card-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden; /* Safari */
}
```

#### 為什麼兩面都需要？
- **正面**: 翻轉後隱藏（避免透過背面看到）
- **背面**: 初始狀態隱藏（已旋轉 180°）

---

### 2. `transform-style: preserve-3d`

#### 用途
- 建立 3D 渲染上下文
- 讓子元素共享同一個 3D 空間

#### 最佳實踐
```css
.card-inner {
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d; /* Safari */
}
```

#### 關鍵理解
- **沒有 `preserve-3d`**: 子元素被「壓平」到父元素平面
- **有 `preserve-3d`**: 子元素保持 3D 位置，旋轉時正確顯示

---

### 3. `perspective`

#### 用途
- 增加 3D 深度感
- 讓旋轉更真實

#### 兩種使用方式

##### 方式 A: 在父容器（推薦）
```css
.card-perspective {
  perspective: 1000px;
}
```

##### 方式 B: 在 transform 函數
```css
.card-inner:hover {
  transform: perspective(1000px) rotateY(180deg);
}
```

#### 數值建議
- **400px-600px**: 強烈 3D 效果（戲劇性）
- **1000px-1500px**: 中等 3D 效果（推薦）
- **2000px+**: 微妙 3D 效果（優雅）

---

### 4. 初始旋轉設定

#### 背面必須預先旋轉
```css
.card-back {
  transform: rotateY(180deg);
}
```

#### 為什麼？
- 初始狀態：正面顯示，背面隱藏
- 翻轉後：正面隱藏，背面顯示

---

### 5. Hover 問題修復

#### 問題
```css
/* ❌ 錯誤：hover 在旋轉元素上 */
.card-inner:hover {
  transform: rotateY(180deg);
}
```

**問題**: 旋轉時滑鼠離開卡片區域 → 動畫中斷

#### 解決方案
```html
<!-- ✅ 正確：分離 hover 和旋轉 -->
<div class="card-container">
  <div class="card-inner">...</div>
</div>
```

```css
.card-container:hover .card-inner {
  transform: rotateY(180deg);
}
```

---

## 🎯 完整最佳實踐範例

### HTML 結構
```html
<div class="card-container">
  <div class="card-inner">
    <div class="card-front">正面</div>
    <div class="card-back">背面</div>
  </div>
</div>
```

### CSS 最佳實踐
```css
/* 1. 外層容器：設定 perspective */
.card-container {
  perspective: 1000px;
  width: 300px;
  height: 400px;
}

/* 2. 翻轉容器：preserve-3d + transition */
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

/* 3. Hover 觸發翻轉 */
.card-container:hover .card-inner {
  transform: rotateY(180deg);
}

/* 4. 卡片面：backface-visibility */
.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* 5. 正面：預設顯示 */
.card-front {
  z-index: 2;
}

/* 6. 背面：預先旋轉 180° */
.card-back {
  transform: rotateY(180deg);
}
```

---

## ⚡ 性能優化

### 1. 使用 `will-change`
```css
.card-inner {
  will-change: transform;
}
```

**注意**: 僅在需要時使用，過度使用會消耗記憶體

### 2. 硬體加速
```css
.card-face {
  transform: translateZ(0);
}
```

### 3. 避免動畫 paint 屬性
```css
/* ❌ 避免 */
transition: background-color 0.6s;

/* ✅ 推薦 */
transition: transform 0.6s, opacity 0.6s;
```

---

## 🔧 瀏覽器相容性

### Safari 特殊處理
```css
.card-inner {
  -webkit-transform-style: preserve-3d;
  -webkit-backface-visibility: hidden;
}
```

### Firefox 31+ 修復
```css
.card-front {
  transform: rotateY(0deg); /* 明確設定 */
}
```

---

## ♿ 無障礙考量

### 1. 減少動畫（尊重用戶偏好）
```css
@media (prefers-reduced-motion: reduce) {
  .card-inner {
    transition: none;
  }
}
```

### 2. 鍵盤操作
```html
<div class="card-container" tabindex="0" role="button">
  ...
</div>
```

```css
.card-container:focus .card-inner {
  transform: rotateY(180deg);
}
```

### 3. ARIA 標籤
```html
<div class="card-front" aria-label="名片正面">
  ...
</div>
<div class="card-back" aria-label="名片背面">
  ...
</div>
```

---

## 📐 常見錯誤

### ❌ 錯誤 1: 忘記 `preserve-3d`
```css
/* 結果：翻轉不正確 */
.card-inner {
  /* transform-style: preserve-3d; 缺少！ */
}
```

### ❌ 錯誤 2: 背面未預先旋轉
```css
/* 結果：背面顯示鏡像 */
.card-back {
  /* transform: rotateY(180deg); 缺少！ */
}
```

### ❌ 錯誤 3: Hover 在錯誤元素
```css
/* 結果：動畫中斷 */
.card-inner:hover {
  transform: rotateY(180deg);
}
```

---

## 🎯 針對 digital-card-flip-preview.html 的優化建議

### 當前問題
1. ⚠️ Hover 在 `.card-inner` 上（應該在外層）
2. ⚠️ 缺少 `-webkit-` 前綴（Safari 相容性）
3. ⚠️ 缺少 `prefers-reduced-motion`（無障礙）
4. ⚠️ 缺少鍵盤操作支援

### 建議修改

#### 1. 修復 Hover 問題
```html
<!-- 新增外層容器 -->
<div class="card-container">
  <div class="card-perspective">
    <div class="card-inner">...</div>
  </div>
</div>
```

```css
/* 改為點擊觸發（已有 onclick） */
.card-inner.is-flipped {
  transform: rotateY(180deg);
}
```

#### 2. 新增 Safari 前綴
```css
.card-inner {
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
}

.card-face {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
```

#### 3. 新增無障礙支援
```css
@media (prefers-reduced-motion: reduce) {
  .card-inner {
    transition: none;
  }
}
```

#### 4. 優化 perspective 數值
```css
.card-perspective {
  perspective: 1500px; /* 從 2000px 降低，增加深度感 */
}
```

---

## 📚 參考資源

### 技術文章
- [How to Create a Flip Card Using CSS - CodeGuage](https://dev.to/codeguage/how-to-create-a-flip-card-using-css-10k6)
- [CSS 3D Transformations - W3Docs](https://www.w3docs.com/snippets/css/how-to-create-a-3d-flipping-animation-on-a-box-card-with-css.html)

### MDN 文檔
- `backface-visibility`
- `transform-style`
- `perspective`

---

## 結論

**核心三要素**:
1. `backface-visibility: hidden` - 隱藏背面
2. `transform-style: preserve-3d` - 3D 上下文
3. `perspective` - 深度感

**最佳實踐**:
- 分離 hover 和旋轉元素
- 背面預先旋轉 180°
- 新增 Safari 前綴
- 考慮無障礙需求
