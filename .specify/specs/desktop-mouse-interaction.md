# BDD Spec: 桌面版鼠標互動效果（強化沉浸感）

## Feature: 桌面版 3D 視差效果與互動

### Scenario 1: 鼠標移動 3D 傾斜效果
**Given**: 用戶在桌面瀏覽器（≥ 1024px）打開名片頁面
**When**: 鼠標在名片上移動
**Then**: 
- 名片根據鼠標位置產生 3D 傾斜效果
- X 軸旋轉：-10deg 到 +10deg
- Y 軸旋轉：-10deg 到 +10deg
- 使用 requestAnimationFrame 優化性能
- 過渡動畫流暢（transition: transform 0.1s ease-out）

### Scenario 2: 鼠標離開恢復原位
**Given**: 名片正在 3D 傾斜狀態
**When**: 鼠標離開名片區域
**Then**: 
- 名片平滑恢復到原始位置（rotateX(0) rotateY(0)）
- 過渡動畫時間：0.5s ease-out

### Scenario 3: Hover 陰影增強
**Given**: 用戶在桌面瀏覽器查看名片
**When**: 鼠標懸停在名片上
**Then**: 
- 陰影增強（第 4 層從 0.2 增加到 0.3）
- 輕微上浮效果（translateY(-4px)）
- 過渡動畫：0.3s ease

### Scenario 4: 翻轉時保持 3D 效果
**Given**: 名片正在翻轉狀態
**When**: 鼠標在名片上移動
**Then**: 
- 3D 傾斜效果仍然生效
- 翻轉變換與傾斜變換正確組合

### Scenario 5: 手機版不受影響
**Given**: 用戶在手機瀏覽器（< 1024px）打開名片頁面
**When**: 觸摸名片
**Then**: 
- 不啟用 3D 傾斜效果
- 保持原有的觸摸翻轉功能

## Technical Requirements

### 檔案修改
1. **workers/public/css/v4-design.css**：添加 hover 樣式與過渡動畫
2. **workers/public/js/main.js**：添加 3D 視差效果 JavaScript

### CSS 實作
```css
/* 桌面版 3D 互動效果 */
@media (min-width: 1024px) {
  .card-inner {
    transition: transform 0.1s ease-out;
  }
  
  .card-inner:hover {
    transform: translateY(-4px) translateZ(0);
  }
  
  .card-inner.is-flipped:hover {
    transform: translateX(-100%) rotateY(-180deg) translateY(-4px) translateZ(0);
  }
  
  .card-inner:hover .card-face {
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.08),
      0 4px 8px rgba(0,0,0,0.08),
      0 16px 32px rgba(0,0,0,0.15),
      0 50px 100px -15px rgba(0,0,0,0.3),
      inset 0 1px 0 0 rgba(255,255,255,0.5);
  }
}
```

### JavaScript 實作
```javascript
// 桌面版 3D 視差效果
function initDesktopParallax() {
  if (window.innerWidth < 1024) return; // 僅桌面版
  
  const cardPerspective = document.querySelector('.card-perspective');
  const cardInner = document.querySelector('.card-inner');
  if (!cardPerspective || !cardInner) return;
  
  let ticking = false;
  let currentRotation = { x: 0, y: 0 };
  
  cardPerspective.addEventListener('mousemove', (e) => {
    if (ticking) return;
    
    requestAnimationFrame(() => {
      const rect = cardPerspective.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      
      currentRotation = { x: -y * 10, y: x * 10 };
      applyCardTransform();
      ticking = false;
    });
    ticking = true;
  });
  
  cardPerspective.addEventListener('mouseleave', () => {
    if (ticking) return;
    
    requestAnimationFrame(() => {
      currentRotation = { x: 0, y: 0 };
      applyCardTransform();
      ticking = false;
    });
    ticking = true;
  });
  
  function applyCardTransform() {
    const isFlipped = cardInner.classList.contains('is-flipped');
    const flipOffset = isFlipped ? ' translateX(-100%) rotateY(-180deg)' : '';
    cardInner.style.transform = `rotateY(${currentRotation.y}deg) rotateX(${currentRotation.x}deg)${flipOffset} translateZ(0)`;
  }
}

// 在 DOMContentLoaded 中調用
document.addEventListener('DOMContentLoaded', () => {
  // ... 現有代碼 ...
  initDesktopParallax();
});
```

## Acceptance Criteria
- [ ] 桌面版鼠標移動產生 3D 傾斜效果
- [ ] 鼠標離開名片平滑恢復原位
- [ ] Hover 時陰影增強與輕微上浮
- [ ] 翻轉時 3D 效果仍然生效
- [ ] 手機版不受影響
- [ ] 性能優化（requestAnimationFrame）
- [ ] 過渡動畫流暢

## Performance Considerations
- 使用 requestAnimationFrame 避免過度渲染
- 使用 ticking flag 防止重複調用
- 僅在桌面版（≥ 1024px）啟用
- CSS transform 使用 GPU 加速

## UX Benefits
- ✅ 強化沉浸感（3D 傾斜跟隨鼠標）
- ✅ 增強擬真感（實體名片的立體感）
- ✅ 提升互動性（即時反饋）
- ✅ 保持性能（優化渲染）
