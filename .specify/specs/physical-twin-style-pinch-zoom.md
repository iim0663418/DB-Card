# Physical Twin - Style Alignment & Pinch Zoom

## 問題 1: 樣式未完全仿製

### 缺失的 CSS 類別

#### 1. `.watermark` 樣式
```css
.watermark {
    position: absolute;
    font-size: 8rem;           /* 當前可能缺失 */
    font-weight: 900;
    color: rgba(104, 104, 172, 0.02);  /* 極淡的紫色 */
    pointer-events: none;
    user-select: none;
    z-index: 1;
    letter-spacing: -0.05em;   /* 緊密字距 */
}
```

#### 2. `.info-chip` hover 效果
```css
.info-chip {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(104, 104, 172, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.info-chip:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(104, 104, 172, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(104, 104, 172, 0.15);
}
```

#### 3. `.text-moda-dark` 顏色
```css
.text-moda-dark {
    color: #4a4a8a !important;  /* 深紫色 */
}
```

#### 4. 響應式字體大小
```css
/* 當前可能缺失 lg: 斷點 */
@media (min-width: 1024px) {
    .card-face {
        padding: 3rem;
    }
    h1 {
        font-size: 3rem;  /* text-5xl */
    }
    img {
        width: 12rem;     /* w-48 */
        height: 12rem;    /* h-48 */
    }
}
```

---

## 問題 2: 手勢縮放實作

### 最佳實踐（基於 MDN 官方文檔）

#### 核心邏輯
```javascript
// 全域狀態
const evCache = [];
let prevDiff = -1;
let currentScale = 1;
let currentX = 0;
let currentY = 0;

// 註冊事件
const replica = document.getElementById('replica-inner');
replica.addEventListener('pointerdown', handlePointerDown);
replica.addEventListener('pointermove', handlePointerMove);
replica.addEventListener('pointerup', handlePointerUp);
replica.addEventListener('pointercancel', handlePointerUp);

function handlePointerDown(ev) {
    evCache.push(ev);
}

function handlePointerMove(ev) {
    // 更新快取
    const index = evCache.findIndex(e => e.pointerId === ev.pointerId);
    evCache[index] = ev;
    
    // 雙指檢測
    if (evCache.length === 2) {
        // 計算兩指距離
        const curDiff = Math.hypot(
            evCache[0].clientX - evCache[1].clientX,
            evCache[0].clientY - evCache[1].clientY
        );
        
        if (prevDiff > 0) {
            // 計算縮放比例
            const scaleDelta = curDiff / prevDiff;
            currentScale *= scaleDelta;
            
            // 限制縮放範圍
            currentScale = Math.max(0.5, Math.min(3, currentScale));
            
            // 計算中心點
            const centerX = (evCache[0].clientX + evCache[1].clientX) / 2;
            const centerY = (evCache[0].clientY + evCache[1].clientY) / 2;
            
            // 應用變換
            replica.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
        }
        
        prevDiff = curDiff;
    }
}

function handlePointerUp(ev) {
    const index = evCache.findIndex(e => e.pointerId === ev.pointerId);
    evCache.splice(index, 1);
    
    if (evCache.length < 2) {
        prevDiff = -1;
    }
}
```

### 進階優化

#### 1. 防止預設觸控行為
```css
#replica-inner {
    touch-action: none;  /* 關鍵：防止瀏覽器預設縮放 */
}
```

#### 2. 平滑動畫
```css
#replica-inner {
    transition: transform 0.1s ease-out;
    will-change: transform;
}

#replica-inner.pinching {
    transition: none;  /* 縮放時移除過渡 */
}
```

#### 3. 重置功能
```javascript
function resetZoom() {
    currentScale = 1;
    currentX = 0;
    currentY = 0;
    replica.style.transform = 'scale(1) translate(0, 0)';
}

// 雙擊重置
replica.addEventListener('dblclick', resetZoom);
```

---

## 完整實作規格

### HTML 結構調整
```html
<!-- 實體孿生展示層 -->
<div id="reality-overlay">
    <div class="replica-wrapper">
        <!-- 控制按鈕組 -->
        <div class="absolute -right-4 -top-4 z-50 flex flex-col gap-3">
            <button onclick="toggleRotation(event)" class="overlay-tool-btn">
                <i data-lucide="rotate-cw"></i>
            </button>
            <button onclick="sharePhysicalTwin()" class="overlay-tool-btn">
                <i data-lucide="share-2"></i>
            </button>
            <button onclick="resetZoom()" class="overlay-tool-btn">
                <i data-lucide="maximize-2"></i>
            </button>
        </div>
        
        <!-- 可縮放容器 -->
        <div id="replica-inner" class="replica-inner">
            <!-- 正反面 -->
        </div>
    </div>
</div>
```

### CSS 完整補充
```css
/* 1. 浮水印完整樣式 */
.watermark {
    position: absolute;
    font-size: 8rem;
    font-weight: 900;
    color: rgba(104, 104, 172, 0.02);
    pointer-events: none;
    user-select: none;
    z-index: 1;
    letter-spacing: -0.05em;
}

/* 2. 資訊晶片完整樣式 */
.info-chip {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(104, 104, 172, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.info-chip:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(104, 104, 172, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(104, 104, 172, 0.15);
}

/* 3. 縮放容器 */
#replica-inner {
    touch-action: none;
    transition: transform 0.1s ease-out;
    will-change: transform;
    transform-origin: center center;
}

#replica-inner.pinching {
    transition: none;
}

/* 4. 響應式斷點 */
@media (min-width: 1024px) {
    .card-face {
        padding: 3rem;
    }
    .card-face h1 {
        font-size: 3rem;
        line-height: 1;
    }
    .card-face img {
        width: 12rem;
        height: 12rem;
    }
}
```

### JavaScript 完整實作
```javascript
// 手勢縮放系統
class PinchZoom {
    constructor(element) {
        this.element = element;
        this.evCache = [];
        this.prevDiff = -1;
        this.scale = 1;
        this.posX = 0;
        this.posY = 0;
        
        this.init();
    }
    
    init() {
        this.element.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.element.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.element.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.element.addEventListener('pointercancel', this.onPointerUp.bind(this));
        this.element.addEventListener('dblclick', this.reset.bind(this));
    }
    
    onPointerDown(ev) {
        this.evCache.push(ev);
        if (this.evCache.length === 2) {
            this.element.classList.add('pinching');
        }
    }
    
    onPointerMove(ev) {
        const index = this.evCache.findIndex(e => e.pointerId === ev.pointerId);
        if (index === -1) return;
        this.evCache[index] = ev;
        
        if (this.evCache.length === 2) {
            const curDiff = Math.hypot(
                this.evCache[0].clientX - this.evCache[1].clientX,
                this.evCache[0].clientY - this.evCache[1].clientY
            );
            
            if (this.prevDiff > 0) {
                const delta = curDiff / this.prevDiff;
                this.scale *= delta;
                this.scale = Math.max(0.5, Math.min(3, this.scale));
                this.updateTransform();
            }
            
            this.prevDiff = curDiff;
        }
    }
    
    onPointerUp(ev) {
        const index = this.evCache.findIndex(e => e.pointerId === ev.pointerId);
        this.evCache.splice(index, 1);
        
        if (this.evCache.length < 2) {
            this.prevDiff = -1;
            this.element.classList.remove('pinching');
        }
    }
    
    updateTransform() {
        this.element.style.transform = `scale(${this.scale})`;
    }
    
    reset() {
        this.scale = 1;
        this.posX = 0;
        this.posY = 0;
        this.updateTransform();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const replicaInner = document.getElementById('replica-inner');
    if (replicaInner) {
        window.pinchZoom = new PinchZoom(replicaInner);
    }
});

// 全域重置函數
function resetZoom() {
    if (window.pinchZoom) {
        window.pinchZoom.reset();
    }
}
```

---

## 驗收標準

### 樣式對齊
- [ ] 浮水印字體 8rem + 2% 不透明度
- [ ] 資訊晶片 hover 上浮 2px
- [ ] 響應式斷點 lg:text-5xl, lg:w-48
- [ ] `.text-moda-dark` 顏色 #4a4a8a

### 手勢縮放
- [ ] 雙指縮放流暢（0.5x ~ 3x）
- [ ] 防止瀏覽器預設行為
- [ ] 雙擊重置功能
- [ ] 重置按鈕（maximize-2 圖示）

### 性能
- [ ] `touch-action: none` 防止衝突
- [ ] `will-change: transform` 硬體加速
- [ ] 縮放時移除 transition

---

## 參考資料

1. **MDN Pinch Zoom Gestures** (官方文檔)
   - https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures
   - 使用 Pointer Events API
   - Math.hypot() 計算距離

2. **最佳實踐**
   - 使用 `touch-action: none` 防止預設行為
   - 限制縮放範圍 (0.5x ~ 3x)
   - 雙擊重置為標準 UX

3. **性能優化**
   - `will-change: transform`
   - 縮放時移除 transition
   - 使用 CSS transform 而非 width/height
