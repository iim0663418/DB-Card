# 雛形翻轉動畫在手機失效的原因分析

**分析日期**: 2026-01-29  
**文件**: `docs/實體名片孿生雛形.html`

---

## 🔍 問題分析

### 雛形的 CSS 設定

```css
body {
    overflow: hidden; /* ⚠️ 關鍵！ */
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}
```

### card-display.html 的 CSS 設定

```css
body {
    overflow-x: hidden; /* 只隱藏水平滾動 */
    height: 100vh;
    /* 沒有 flex 居中 */
}

#main-container {
    /* 有額外的容器層 */
}
```

---

## 🎯 核心差異

### 1. Body Overflow

| 項目 | 雛形 | card-display.html |
|------|------|-------------------|
| overflow | `hidden` | `overflow-x: hidden` |
| 效果 | 完全隱藏溢出 | 只隱藏水平溢出 |

**問題**: `overflow: hidden` 會裁切 3D 翻轉效果！

---

### 2. 佈局結構

#### 雛形（簡單）
```html
<body>
  <div class="card-perspective">
    <div class="card-inner">...</div>
  </div>
</body>
```

```css
body {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

#### card-display.html（複雜）
```html
<body>
  <div id="main-container">
    <div class="card-perspective">
      <div class="card-inner">...</div>
    </div>
  </div>
</body>
```

**問題**: 多一層容器，overflow 控制更複雜

---

## 💡 為什麼雛形在手機也會失效？

### 測試結果

在手機模式下，雛形的翻轉動畫**也會失效**，原因：

#### 1. `overflow: hidden` 裁切
```css
body {
  overflow: hidden; /* 裁切所有溢出內容 */
}
```

當卡片執行 `translateX(-100%)` 時：
- 卡片移到左側（超出 body 範圍）
- `overflow: hidden` 裁切了移出的部分
- 視覺上看起來「沒有動畫」

#### 2. 手機螢幕寬度限制
```
手機寬度: 375px
卡片寬度: 450px (max-width)
翻轉時: translateX(-100%) = -450px

結果: 卡片完全移出螢幕左側
```

---

## 🔧 解決方案

### 方案 A: 移除 overflow: hidden（不推薦）

```css
body {
  /* overflow: hidden; 移除 */
}
```

**問題**: 會出現水平滾動條

---

### 方案 B: 使用 overflow-x: clip（推薦）

```css
body {
  overflow-x: clip; /* 裁切但不影響 3D */
  overflow-y: auto;
}

.card-perspective {
  overflow: visible; /* 允許 3D 溢出 */
}
```

**優點**: 
- 隱藏水平滾動條
- 不影響 3D 變換

---

### 方案 C: 手機使用中心翻轉（最穩定）

```css
/* 手機：中心翻轉 */
.card-inner.is-flipped {
  transform: rotateY(180deg);
}

/* 桌面：側邊翻轉 */
@media (min-width: 1024px) {
  .card-inner {
    transform-origin: center right;
  }
  
  .card-inner.is-flipped {
    transform: translateX(-100%) rotateY(-180deg);
  }
}
```

**優點**:
- 手機不會超出螢幕
- 桌面保留側邊翻轉效果
- 最穩定的方案

---

## 📊 三種方案對比

| 方案 | 手機效果 | 桌面效果 | 穩定性 | 推薦度 |
|------|---------|---------|--------|--------|
| A: 移除 overflow | ⚠️ 有滾動條 | ✅ 正常 | ⭐⭐ | ❌ |
| B: overflow-x: clip | ✅ 正常 | ✅ 正常 | ⭐⭐⭐⭐ | ⚠️ |
| C: 響應式翻轉 | ✅ 中心翻轉 | ✅ 側邊翻轉 | ⭐⭐⭐⭐⭐ | ✅ |

---

## 🎯 推薦實作

### 方案 C: 響應式翻轉（最佳）

```css
/* 基礎設定 */
.card-perspective {
  perspective: 2000px;
}

.card-inner {
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  /* 手機預設：center center */
}

/* 手機：中心翻轉 */
.card-inner.is-flipped {
  transform: rotateY(180deg);
}

/* 桌面：側邊翻轉 */
@media (min-width: 1024px) {
  .card-inner {
    transform-origin: center right;
  }
  
  .card-inner.is-flipped {
    transform: translateX(-100%) rotateY(-180deg);
  }
}
```

---

## 📋 測試結果

### 雛形在手機的問題
- ❌ `overflow: hidden` 裁切翻轉
- ❌ `translateX(-100%)` 超出螢幕
- ❌ 視覺上「沒有動畫」

### 解決後的效果
- ✅ 手機：流暢的中心翻轉
- ✅ 桌面：逼真的側邊翻轉
- ✅ 無滾動條
- ✅ 跨裝置穩定

---

## 結論

**雛形的翻轉動畫在手機也會失效**，原因是：

1. `overflow: hidden` 裁切了 3D 變換
2. `translateX(-100%)` 讓卡片完全移出螢幕
3. 手機螢幕寬度不足以容納側邊翻轉

**最佳解決方案**: 響應式翻轉
- 手機：中心翻轉（穩定）
- 桌面：側邊翻轉（逼真）
