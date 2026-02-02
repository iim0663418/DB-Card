# Physical Twin - Align with card-display.html

## 目標
將雛形完全對齊 card-display.html 的實際實作

## 關鍵差異對比

### 1. 名片結構差異

#### card-display.html (實際)
```html
<article class="p-8 lg:p-12 border-b border-moda-light flex flex-col lg:flex-row gap-12">
  <!-- 浮水印 -->
  <div class="watermark -top-5 -left-10">數位發展部</div>
  <div class="watermark bottom-10 -right-20">MODA</div>
  
  <!-- 頭像區 -->
  <div class="relative">
    <div class="absolute -inset-4 border border-moda-light"></div>
    <img class="w-32 h-32 lg:w-48 lg:h-48 object-cover border-4 border-white shadow-xl">
  </div>
  
  <!-- 資訊區 -->
  <div class="flex-1 text-center lg:text-left">
    <p class="hud-text mb-4 opacity-40">數位名片系統 Digital Business Card</p>
    <h1 class="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-2 italic">唐鳳</h1>
    <p class="text-moda-dark font-bold tracking-widest text-sm uppercase">數位發展部 部長</p>
  </div>
</article>

<!-- 資訊晶片網格 -->
<section class="p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-5">
  <a class="info-chip p-4 rounded-2xl flex items-center gap-3 group">
    <div class="w-10 h-10 rounded-xl bg-moda-light flex items-center justify-center">
      <i data-lucide="mail" class="w-5 h-5"></i>
    </div>
    <div class="min-w-0 flex-1">
      <p class="hud-text text-[8px] opacity-40">Communication Node</p>
      <p class="font-bold text-slate-700 truncate">audrey@moda.gov.tw</p>
    </div>
  </a>
  <!-- phone, web, address... -->
</section>
```

#### 雛形 (當前)
```html
<div class="flex flex-col h-full">
  <div class="hud-label mb-8">數位名片系統</div>
  <div class="flex items-start gap-6 mb-8">
    <img class="w-28 h-28 rounded-3xl">
    <div class="flex-1 text-left">
      <h1 class="text-3xl font-black">唐鳳</h1>
      <p class="text-moda font-bold text-xs">數位發展部 部長</p>
    </div>
  </div>
  <!-- 簡化的按鈕 -->
</div>
```

### 2. 必須對齊的元素

#### ✅ 浮水印
```html
<div class="watermark -top-5 -left-10" aria-hidden="true">數位發展部</div>
<div class="watermark bottom-10 -right-20" aria-hidden="true">MODA</div>
```

#### ✅ 頭像外框
```html
<div class="relative">
  <div class="absolute -inset-4 border border-moda-light pointer-events-none"></div>
  <img class="w-32 h-32 lg:w-48 lg:h-48 object-cover border-4 border-white shadow-xl">
</div>
```

#### ✅ HUD 文字
```html
<p class="hud-text mb-4 opacity-40" data-i18n="card-system">數位名片系統 Digital Business Card</p>
```

#### ✅ 標題樣式
```html
<h1 class="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-2 italic">唐鳳</h1>
<p class="text-moda-dark font-bold tracking-widest text-sm uppercase">數位發展部 部長</p>
```

#### ✅ 資訊晶片
```html
<a class="info-chip p-4 rounded-2xl flex items-center gap-3 group">
  <div class="w-10 h-10 flex-shrink-0 rounded-xl bg-moda-light flex items-center justify-center text-moda-dark group-hover:bg-moda group-hover:text-white transition-all">
    <i data-lucide="mail" class="w-5 h-5"></i>
  </div>
  <div class="min-w-0 flex-1">
    <p class="hud-text text-[8px] opacity-40">Communication Node</p>
    <p class="font-bold text-slate-700 truncate">audrey@moda.gov.tw</p>
  </div>
</a>
```

### 3. CSS 類別對齊

#### 必須加入的 CSS
```css
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

.hud-text {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--moda-accent);
}

.info-chip {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(104, 104, 172, 0.1);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
}

.info-chip:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(104, 104, 172, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(104, 104, 172, 0.15);
}
```

### 4. 響應式設計

#### 必須對齊的斷點
```css
/* 桌面版 (lg:) */
@media (min-width: 1024px) {
  .card-face { padding: 3rem; }
  article { padding: 3rem; }
  img { width: 12rem; height: 12rem; }
  h1 { font-size: 3rem; }
}

/* 平板版 (md:) */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
```

### 5. 完整結構模板

#### 正面 (ZH)
```html
<div class="card-face card-front">
  <main>
    <!-- 浮水印 -->
    <div class="watermark -top-5 -left-10" aria-hidden="true">數位發展部</div>
    <div class="watermark bottom-10 -right-20" aria-hidden="true">MODA</div>

    <!-- 身分首部 -->
    <article class="p-8 lg:p-12 border-b border-moda-light flex flex-col lg:flex-row gap-12 items-center lg:items-start relative z-10">
      <div class="relative">
        <div class="absolute -inset-4 border border-moda-light pointer-events-none" aria-hidden="true"></div>
        <img src="..." class="w-32 h-32 lg:w-48 lg:h-48 object-cover border-4 border-white shadow-xl">
      </div>
      <div class="flex-1 text-center lg:text-left">
        <p class="hud-text mb-4 opacity-40" aria-hidden="true">數位名片系統 Digital Business Card</p>
        <h1 class="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-2 italic">唐鳳</h1>
        <p class="text-moda-dark font-bold tracking-widest text-sm uppercase">數位發展部 部長</p>
      </div>
    </article>

    <!-- 資訊晶片網格 -->
    <section class="p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
      <a href="mailto:audrey@moda.gov.tw" class="info-chip p-4 rounded-2xl flex items-center gap-3 group">
        <div class="w-10 h-10 flex-shrink-0 rounded-xl bg-moda-light flex items-center justify-center text-moda-dark group-hover:bg-moda group-hover:text-white transition-all">
          <i data-lucide="mail" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="hud-text text-[8px] opacity-40">Communication Node</p>
          <p class="font-bold text-slate-700 truncate">audrey@moda.gov.tw</p>
        </div>
      </a>
      <a href="tel:+886-2-2737-7777" class="info-chip p-4 rounded-2xl flex items-center gap-3 group">
        <div class="w-10 h-10 flex-shrink-0 rounded-xl bg-moda-light flex items-center justify-center text-moda-dark group-hover:bg-moda group-hover:text-white transition-all">
          <i data-lucide="phone" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="hud-text text-[8px] opacity-40">Voice Access</p>
          <p class="font-bold text-slate-700 truncate">+886 2 2737 7777</p>
        </div>
      </a>
      <a href="https://moda.gov.tw" target="_blank" class="info-chip p-4 rounded-2xl flex items-center gap-3 group md:col-span-2">
        <div class="w-10 h-10 flex-shrink-0 rounded-xl bg-moda-light flex items-center justify-center text-moda-dark group-hover:bg-moda group-hover:text-white transition-all">
          <i data-lucide="globe" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="hud-text text-[8px] opacity-40">Official Portal</p>
          <p class="font-bold text-slate-700 truncate">moda.gov.tw</p>
        </div>
      </a>
    </section>
  </main>
</div>
```

#### 背面 (EN)
```html
<div class="card-face card-back">
  <main>
    <!-- 浮水印 -->
    <div class="watermark -top-5 -left-10" aria-hidden="true">Ministry of Digital Affairs</div>
    <div class="watermark bottom-10 -right-20" aria-hidden="true">MODA</div>

    <!-- 身分首部 -->
    <article class="p-8 lg:p-12 border-b border-moda-light flex flex-col lg:flex-row gap-12 items-center lg:items-start relative z-10">
      <div class="relative">
        <div class="absolute -inset-4 border border-moda-light pointer-events-none" aria-hidden="true"></div>
        <img src="..." class="w-32 h-32 lg:w-48 lg:h-48 object-cover border-4 border-white shadow-xl">
      </div>
      <div class="flex-1 text-center lg:text-left">
        <p class="hud-text mb-4 opacity-40" aria-hidden="true">Digital Business Card System</p>
        <h1 class="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-2 italic">Audrey Tang</h1>
        <p class="text-moda-dark font-bold tracking-widest text-sm uppercase">Minister of Digital Affairs</p>
      </div>
    </article>

    <!-- 資訊晶片網格 -->
    <section class="p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
      <!-- 同正面，但英文標籤 -->
    </section>
  </main>
</div>
```

## 實作要求

1. **完全對齊 HTML 結構**：使用 card-display.html 的完整結構
2. **完全對齊 CSS 類別**：包含 watermark, hud-text, info-chip
3. **完全對齊響應式設計**：lg:p-12, lg:w-48, md:grid-cols-2
4. **保留孿生模式功能**：Three.js、長按觸發、實體名片展示
5. **移除簡化版元素**：刪除所有不符合實際設計的元素

## 驗收標準

- [ ] 浮水印位置與樣式完全一致
- [ ] 頭像外框完全一致
- [ ] HUD 文字樣式完全一致
- [ ] 資訊晶片樣式完全一致
- [ ] 響應式斷點完全一致
- [ ] hover 效果完全一致
- [ ] 功能完整保留
