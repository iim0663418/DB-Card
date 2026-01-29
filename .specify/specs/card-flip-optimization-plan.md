# 卡片翻轉動畫優化規劃

**規劃日期**: 2026-01-29  
**目標**: 修復 Safari 翻轉失效 + 提升實體感

---

## 🔍 問題診斷

### 1. Safari 翻轉失效的真正原因

#### 問題 A: pointer-events 阻止點擊
```css
/* 當前設計 */
.card-face {
  pointer-events: none; /* ⚠️ Safari 阻止事件冒泡 */
}

.card-face > * {
  pointer-events: auto;
}
```

**結果**: 點擊 `.card-inner` 時，事件被 `.card-face` 的 `pointer-events: none` 阻止

#### 問題 B: 缺少 GPU 加速提示
```css
/* 當前設計 */
.card-inner {
  transform-style: preserve-3d;
  /* ❌ 缺少 translateZ(0) */
}
```

**結果**: Safari 不啟用 GPU，動畫卡頓或失效

---

## 🎯 優化方案

### Phase 1: 修復 Safari 點擊問題（關鍵）

#### 方案 A: 移除 pointer-events: none（推薦）
```css
.card-face {
  /* pointer-events: none; 移除 */
}

.card-face > * {
  /* pointer-events: auto; 不需要了 */
}
```

**優點**: 
- ✅ 簡單直接
- ✅ Safari 相容
- ✅ 無副作用

**缺點**:
- ⚠️ 需要確認原本為何設定 `pointer-events: none`

---

#### 方案 B: 改變事件綁定
```javascript
// 從 card-inner 改為 card-perspective
document.querySelector('.card-perspective').addEventListener('click', toggleFlip);
```

**優點**:
- ✅ 不改 CSS
- ✅ 事件在更外層

**缺點**:
- ⚠️ 需要修改 JavaScript
- ⚠️ 可能影響其他功能

---

### Phase 2: 添加 GPU 加速（必須）

```css
.card-inner {
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  
  /* ⭐ 強制 GPU 加速 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.card-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  
  /* ⭐ 強制 GPU 加速 */
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

.card-front {
  transform: rotateY(0deg) translateZ(1px);
  -webkit-transform: rotateY(0deg) translateZ(1px);
}

.card-back {
  transform: rotateY(180deg) translateZ(1px);
  -webkit-transform: rotateY(180deg) translateZ(1px);
}
```

---

### Phase 3: Glassmorphism 優化（視覺）

```css
.card-face {
  /* 漸層背景 */
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.8) 0%, 
    rgba(255, 255, 255, 0.6) 100%);
  
  /* 增強模糊 */
  backdrop-filter: blur(40px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(110%);
  
  /* 雙層陰影 + 內陰影 */
  box-shadow: 
    0 8px 32px 0 rgba(104, 104, 172, 0.1), 
    inset 0 1px 0 0 rgba(255, 255, 255, 0.5);
  
  /* 實體標準圓角 */
  border-radius: 1rem; /* 16px ≈ 6mm */
  
  /* 細緻色帶 */
  border-top: 4px solid var(--moda-accent);
}
```

---

### Phase 4: 響應式翻轉（穩定性）

```css
/* 手機：中心翻轉 */
.card-inner.is-flipped {
  transform: rotateY(180deg) translateZ(0);
  -webkit-transform: rotateY(180deg) translateZ(0);
}

/* 桌面：側邊翻轉（可選） */
@media (min-width: 1024px) {
  .card-inner {
    transform-origin: center right;
  }
  
  .card-inner.is-flipped {
    transform: translateX(-100%) rotateY(-180deg) translateZ(0);
    -webkit-transform: translateX(-100%) rotateY(-180deg) translateZ(0);
  }
}
```

---

## 📋 實作優先級

### 🔴 P0: 修復 Safari 點擊（必須）
- [ ] 移除 `.card-face` 的 `pointer-events: none`
- [ ] 測試點擊事件是否正常

**預期時間**: 10 分鐘

---

### 🔴 P0: 添加 GPU 加速（必須）
- [ ] `.card-inner` 添加 `translateZ(0)`
- [ ] `.card-front/back` 添加 `translateZ(1px)`
- [ ] 添加 `-webkit-` 前綴

**預期時間**: 15 分鐘

---

### 🟡 P1: Glassmorphism 優化（重要）
- [ ] 更新背景漸層
- [ ] 增強 backdrop-filter
- [ ] 優化陰影系統
- [ ] 調整圓角和色帶

**預期時間**: 30 分鐘

---

### 🟢 P2: 響應式翻轉（可選）
- [ ] 手機使用中心翻轉
- [ ] 桌面使用側邊翻轉
- [ ] 添加 `prefers-reduced-motion`

**預期時間**: 20 分鐘

---

## 🔧 實作步驟

### Step 1: 修復 pointer-events（立即）

```css
/* workers/public/css/v4-design.css */

.card-face {
  /* 移除這行 */
  /* pointer-events: none; */
}

/* 移除這個規則 */
/* .card-face > * {
    pointer-events: auto;
} */
```

---

### Step 2: 添加 GPU 加速（立即）

```css
.card-inner {
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  
  /* 新增 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  will-change: transform;
}

/* 更新翻轉狀態 */
.card-inner.is-flipped {
  transform: rotateY(180deg) translateZ(0);
  -webkit-transform: rotateY(180deg) translateZ(0);
}

/* 新增正反面初始 transform */
.card-front {
  z-index: 2;
  transform: rotateY(0deg) translateZ(1px);
  -webkit-transform: rotateY(0deg) translateZ(1px);
}

.card-back {
  transform: rotateY(180deg) translateZ(1px);
  -webkit-transform: rotateY(180deg) translateZ(1px);
}
```

---

### Step 3: Glassmorphism 優化（次要）

```css
.card-face {
  /* 背景 */
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.8) 0%, 
    rgba(255, 255, 255, 0.6) 100%);
  
  /* 模糊 */
  backdrop-filter: blur(40px) saturate(180%) brightness(110%);
  -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(110%);
  
  /* 陰影 */
  box-shadow: 
    0 8px 32px 0 rgba(104, 104, 172, 0.1), 
    inset 0 1px 0 0 rgba(255, 255, 255, 0.5);
  
  /* 圓角 */
  border-radius: 1rem;
  
  /* 色帶 */
  border-top: 4px solid var(--moda-accent);
}
```

---

## 📊 預期效果

| 項目 | 當前 | 優化後 |
|------|------|--------|
| Safari 點擊 | ❌ 失效 | ✅ 正常 |
| 動畫流暢度 | ⚠️ 卡頓 | ✅ 流暢 |
| 實體感 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 跨瀏覽器 | ⚠️ 不一致 | ✅ 一致 |

---

## ⚠️ 風險評估

### P0 修復（低風險）
- ✅ 移除 `pointer-events: none` - 低風險
- ✅ 添加 `translateZ` - 零風險（視覺無變化）

### P1 優化（中風險）
- ⚠️ Glassmorphism - 需要測試視覺效果

---

## 🚀 建議執行順序

1. **立即執行 P0**（修復 Safari）
2. **測試確認**（所有瀏覽器）
3. **執行 P1**（視覺優化）
4. **再次測試**
5. **部署 Staging**

---

## 📝 測試清單

### Safari iOS
- [ ] 點擊卡片能觸發翻轉
- [ ] 翻轉動畫流暢
- [ ] 正反面正確顯示

### 其他瀏覽器
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari 桌面版

---

## 結論

**核心問題**: `pointer-events: none` 阻止 Safari 點擊事件

**解決方案**: 
1. 移除 `pointer-events: none`（P0）
2. 添加 `translateZ(0)` GPU 加速（P0）
3. 優化 Glassmorphism（P1）

**預期總時間**: 1 小時
