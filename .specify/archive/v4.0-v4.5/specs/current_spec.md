# BDD Spec: 優化 3D 旋轉動畫性能

## 問題分析
- 當前問題：旋轉動畫有延遲
- 根本原因：CSS transition 與 JavaScript transform 衝突

## 解決方案

### 方案 1: 使用 CSS 變數（推薦）
- JavaScript 只更新 CSS 變數
- CSS 使用變數進行 transform
- 避免直接操作 style.transform

### 方案 2: 移除 transition
- 3D 傾斜不使用 transition（即時響應）
- Hover 效果保留 transition

### 方案 3: 分離 transform
- 使用不同的元素處理不同的 transform
- 避免多個 transform 衝突

## 實作方案（方案 1 + 2）

### CSS 修改
```css
@media (min-width: 1024px) {
  .card-inner {
    /* 移除 transition，讓 3D 傾斜即時響應 */
    /* transition: transform 0.1s ease-out; */
    
    /* 使用 CSS 變數 */
    --rotate-x: 0deg;
    --rotate-y: 0deg;
    transform: rotateY(var(--rotate-y)) rotateX(var(--rotate-x)) translateZ(0);
  }
  
  .card-inner.is-flipped {
    transform: translateX(-100%) rotateY(calc(var(--rotate-y) - 180deg)) rotateX(var(--rotate-x)) translateZ(0);
  }
  
  /* Hover 效果使用獨立的 pseudo-element */
  .card-inner:hover {
    /* 移除 translateY，避免與 3D 傾斜衝突 */
  }
  
  /* 陰影 transition 保留 */
  .card-face {
    transition: box-shadow 0.3s ease;
  }
}
```

### JavaScript 修改
```javascript
function applyCardTransform() {
  // 使用 CSS 變數，避免直接操作 transform
  cardInner.style.setProperty('--rotate-x', `${currentRotation.x}deg`);
  cardInner.style.setProperty('--rotate-y', `${currentRotation.y}deg`);
}
```

## Acceptance Criteria
- [ ] 3D 傾斜即時響應（無延遲）
- [ ] Hover 陰影效果保留
- [ ] 翻轉動畫不受影響
- [ ] 性能優化（60 FPS）
