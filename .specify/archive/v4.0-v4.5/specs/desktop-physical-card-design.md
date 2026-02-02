# 桌面版名片實體化設計方案 v2

## 現況分析

### 已實作功能 ✅
1. **3D 翻轉動畫**：
   - 手機：中心翻轉
   - 桌面：側邊翻轉（`transform-origin: center right`）
2. **Glassmorphism 效果**：
   - 漸層背景：`linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)`
   - 增強模糊：`backdrop-filter: blur(40px) saturate(180%) brightness(110%)`
   - 多層陰影 + 內陰影高光
3. **實體名片圓角**：`border-radius: 1rem` (16px ≈ 6mm)
4. **GPU 加速**：`translateZ(0)`
5. **MODA 色帶**：`border-top: 4px solid var(--moda-accent)`

### 缺少功能 ❌
1. **實體名片比例**：
   - 現況：全寬佈局（`max-width: 56rem`）
   - 目標：桌面版呈現實體名片比例（橫向 9:16）
2. **實體質感**：
   - 缺少：白色邊框（8px）
   - 缺少：紙張紋理
   - 缺少：光澤效果
   - 缺少：4 層陰影系統（現有 3 層）
3. **桌面版旋轉**：
   - 缺少：`rotate(90deg)` 讓直立名片變橫向

## 重新設計方案

### Phase 1: 桌面版實體名片比例 (P0)
**目標**：桌面版顯示實體名片的真實比例與方向

#### 1.1 實體名片容器
```css
@media (min-width: 1024px) {
  .card-perspective {
    max-width: 340px;        /* 實體名片寬度 */
    aspect-ratio: 9 / 16;    /* 直立比例 */
    transform: rotate(90deg) scale(0.72); /* 旋轉成橫向 */
    margin: 4rem auto;       /* 置中 */
  }
}
```

#### 1.2 白色邊框（實體名片質感）
```css
@media (min-width: 1024px) {
  .card-face {
    border: 8px solid #fff;  /* 白色邊框 */
  }
}
```

#### 1.3 4 層陰影系統（增強立體感）
```css
@media (min-width: 1024px) {
  .card-face {
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.05),          /* 邊緣線 */
      0 2px 4px rgba(0,0,0,0.05),          /* 近距陰影 */
      0 8px 16px rgba(0,0,0,0.1),          /* 中距陰影 */
      0 30px 60px -10px rgba(0,0,0,0.2),   /* 遠距陰影 */
      inset 0 1px 0 0 rgba(255,255,255,0.5); /* 內陰影高光 */
  }
}
```

### Phase 2: 紙張質感 (P1)
**目標**：增加實體紙張的視覺與觸感

#### 2.1 紙張紋理
```css
@media (min-width: 1024px) {
  .card-face::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.04;
    pointer-events: none;
    z-index: 5;
  }
}
```

#### 2.2 光澤效果
```css
@media (min-width: 1024px) {
  .card-face::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, 
      rgba(255,255,255,0.1) 0%, 
      transparent 50%, 
      rgba(0,0,0,0.02) 100%);
    pointer-events: none;
    z-index: 6;
  }
}
```

### Phase 3: 互動優化 (P2)
**目標**：桌面版 Hover 效果

#### 3.1 Hover 上浮
```css
@media (min-width: 1024px) {
  .card-inner:hover {
    transform: translateY(-4px) translateZ(0);
  }
  
  .card-inner.is-flipped:hover {
    transform: translateX(-100%) rotateY(-180deg) translateY(-4px) translateZ(0);
  }
}
```

#### 3.2 Hover 陰影增強
```css
@media (min-width: 1024px) {
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

## 實作清單

### 檔案修改
- **v4-design.css**：新增桌面版實體名片樣式

### 驗收標準

#### P0（必須）- 30 分鐘
- [ ] 桌面版實體名片比例（340px 寬，9:16 直立 → 旋轉 90 度）
- [ ] 白色邊框 8px
- [ ] 4 層陰影系統
- [ ] 手機版不受影響

#### P1（重要）- 15 分鐘
- [ ] 紙張紋理（SVG noise）
- [ ] 光澤效果（gradient overlay）

#### P2（可選）- 15 分鐘
- [ ] Hover 上浮效果
- [ ] Hover 陰影增強

## 時間估算
- P0：30 分鐘
- P1：15 分鐘
- P2：15 分鐘
- **總計**：1 小時

## 關鍵差異
與現有實作的主要差異：
1. **比例**：從全寬 → 實體名片比例（340px）
2. **方向**：旋轉 90 度（直立 → 橫向）
3. **質感**：白色邊框 + 紙張紋理 + 光澤
4. **陰影**：3 層 → 4 層

## 風險評估
- **低風險**：純 CSS 修改，僅影響桌面版
- **響應式測試**：需要測試 1024px 以上螢幕
- **向後相容**：手機版完全不受影響

