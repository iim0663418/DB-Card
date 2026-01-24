# BDD Specification: 3D Card Flip with Bilingual Integration

**Version**: v4.3.3  
**Date**: 2026-01-23  
**Author**: Commander (Architect)  
**Status**: SPEC_READY

---

## Feature Overview

整合 `docs/數位名片顯示頁面翻頁雛形.html` 的 3D 翻面設計到 `workers/public/card-display.html`，實現：
- **正面 (Front)**: 中文內容
- **背面 (Back)**: 英文內容
- **翻面觸發**: 點擊卡片主體
- **按鈕保留**: 右上角語系切換按鈕作為快捷方式
- **雙向同步**: 翻面 ↔ 按鈕點擊互相同步

---

## Scenario 1: User flips card to switch language (ZH → EN)

**Given**:
- 用戶在名片顯示頁面
- 當前語言為中文 (localStorage: 'zh')
- 卡片處於正面狀態 (`.card-inner` 無 `.is-flipped` class)

**When**:
- 用戶點擊卡片主體 (`.card-inner`)

**Then**:
- 卡片應以 3D 動畫翻轉 180 度 (`.card-inner.is-flipped`)
- 翻轉時間為 0.8 秒
- 使用 `cubic-bezier(0.175, 0.885, 0.32, 1.275)` 緩動
- 背面顯示英文內容
- `localStorage.setItem('language', 'en')`
- 右上角按鈕文字更新為 "EN / 繁中"

---

## Scenario 2: User flips card back to Chinese (EN → ZH)

**Given**:
- 卡片處於背面狀態 (`.card-inner.is-flipped`)
- 當前語言為英文 (localStorage: 'en')

**When**:
- 用戶點擊卡片主體

**Then**:
- 卡片翻轉回正面 (移除 `.is-flipped` class)
- 正面顯示中文內容
- `localStorage.setItem('language', 'zh')`
- 右上角按鈕文字更新為 "繁中 / EN"

---

## Scenario 3: Language switch button triggers flip

**Given**:
- 卡片處於正面 (中文)

**When**:
- 用戶點擊右上角語系切換按鈕 (`#lang-switch`)

**Then**:
- 卡片應翻轉到背面 (`.card-inner.is-flipped`)
- 背面顯示英文內容
- `localStorage.setItem('language', 'en')`

**And**:
- 反向操作（背面點按鈕）應翻轉回正面

---

## Scenario 4: Dynamic data renders on both sides

**Given**:
- API 返回名片資料 (name, title, email, phone, etc.)

**When**:
- 頁面載入完成

**Then**:
- 正面應顯示中文欄位 (name_zh, title_zh, greeting_zh)
- 背面應顯示英文欄位 (name_en, title_en, greeting_en)
- 所有動態內容經過 `DOMPurify.sanitize()`
- 照片、Email、電話等共用欄位在正反面相同

---

## Scenario 5: Static greeting display (Updated)

**Given**:
- 名片資料包含 greeting_zh 和 greeting_en

**When**:
- 頁面載入完成

**Then**:
- 正面應靜態顯示 greeting_zh[0]（第一條問候語）
- 背面應靜態顯示 greeting_en[0]（第一條問候語）
- 無打字機動畫效果
- 如果 greetings 為空，隱藏 greeting 區塊

---

## Scenario 6: Accessibility support

**Given**:
- 用戶使用鍵盤導航

**When**:
- 卡片主體獲得焦點 (`:focus`)
- 用戶按下 Space 或 Enter 鍵

**Then**:
- 應觸發翻轉動作
- 等同於點擊行為

**And**:
- 卡片應有 `tabindex="0"` 屬性
- 應有 `aria-label="點擊翻面切換語言"` 屬性
- 翻轉時應有 `aria-live="polite"` 通知

---

## Scenario 7: Safari backface-visibility fix

**Given**:
- 用戶使用 Safari 瀏覽器

**When**:
- 卡片翻轉時

**Then**:
- 正反面不應同時可見（閃爍問題）
- CSS 應包含 `-webkit-backface-visibility: hidden`
- 應使用 `translateZ(1px)` hack 確保層級

---

## Technical Requirements

### CSS Architecture (Updated - Best Practices Integrated)
```css
/* 3D 翻轉架構（融合最佳實踐） */
.card-perspective {
    perspective: 2000px;
    width: 100%;
    max-width: 56rem; /* 896px，符合現有設計 */
    padding: 0 1rem;
    z-index: 10;
}

.card-inner {
    position: relative;
    width: 100%;
    min-height: 600px;
    /* height 由 JS 動態設定（防止翻轉跳動） */
    
    /* ✅ 3D 上下文（Safari 必須） */
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
    
    /* ✅ 流暢動畫 */
    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    will-change: transform;
    cursor: pointer;
}

.card-inner.is-flipped {
    transform: rotateY(180deg);
}

.card-face {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    min-height: 100%;
    
    /* ✅ 隱藏滾動條（跨瀏覽器標準） */
    overflow-y: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
    -webkit-overflow-scrolling: touch; /* iOS 平滑滾動 */
    
    /* ✅ 防止佈局跳動（現代瀏覽器） */
    scrollbar-gutter: stable both-edges;
    
    /* ✅ Safari backface-visibility 修復 */
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0); /* Safari 必須為 0 */
    -webkit-transform: translateZ(0);
    
    /* ✅ 防止文字模糊 */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* ✅ 隱藏 Webkit 滾動條 */
.card-face::-webkit-scrollbar {
    display: none;
}

/* ✅ 焦點指示器（WCAG 2.4.7 合規） */
.card-inner:focus {
    outline: 3px solid #4c9aff;
    outline-offset: 2px;
}

.card-front {
    z-index: 2;
}

.card-back {
    z-index: 1;
    transform: rotateY(180deg) translateZ(0);
}

/* 保留現有 Glassmorphism 樣式 */
.card-face .crystal-container {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px) saturate(180%);
    -webkit-backdrop-filter: blur(10px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-top: 5px solid var(--moda-accent);
    box-shadow: 0 8px 32px rgba(104, 104, 172, 0.12);
    border-radius: 1rem;
}

/* 響應式調整 */
@media (max-width: 1024px) {
    .card-perspective {
        max-width: 48rem;
    }
}

@media (max-width: 768px) {
    .card-perspective {
        max-width: 100%;
    }
    
    .card-inner {
        min-height: 500px;
    }
}
```

**關鍵最佳實踐**:
1. ✅ `translateZ(0)` 而非 `translateZ(1px)` (Safari 標準)
2. ✅ `scrollbar-gutter: stable both-edges` (防止佈局跳動)
3. ✅ `-webkit-font-smoothing: antialiased` (防止文字模糊)
4. ✅ `scrollbar-width: none` (Firefox 標準屬性)
5. ✅ 焦點指示器 (WCAG 合規)

### HTML Structure (Updated - WCAG Compliant)
```html
<!-- 包裝現有結構，保留完整資訊架構 -->
<div class="card-perspective px-4">
    <div class="card-inner" 
         id="card" 
         tabindex="0" 
         role="region"
         aria-label="點擊翻面切換語言"
         aria-live="polite">
        
        <!-- 正面 (中文) - 保留現有完整結構 -->
        <div class="card-face card-front">
            <main id="main-content-zh" class="crystal-container rounded-2xl overflow-hidden shadow-2xl">
                <!-- 背景浮水印 -->
                <div class="watermark -top-5 -left-10" aria-hidden="true">數位發展部</div>
                <div class="watermark bottom-10 -right-20" aria-hidden="true">MODA</div>

                <!-- 身分首部 -->
                <article class="p-8 lg:p-12 border-b border-moda-light flex flex-col lg:flex-row gap-12 items-center lg:items-start relative z-10">
                    <!-- 頭像 -->
                    <div class="relative">
                        <div class="absolute -inset-4 border border-moda-light pointer-events-none" aria-hidden="true"></div>
                        <img id="user-avatar-zh" src="" alt="名片大頭貼" class="w-32 h-32 lg:w-48 lg:h-48 object-cover border-4 border-white shadow-xl">
                    </div>

                    <!-- 身分資訊 -->
                    <div class="flex-1 text-center lg:text-left">
                        <p class="hud-text mb-4 opacity-40" aria-hidden="true">數位名片系統 Digital Business Card</p>
                        <h1 id="user-name-zh" class="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-2 italic">---</h1>
                        <p id="user-title-zh" class="text-moda-dark font-bold tracking-widest text-sm uppercase">---</p>
                        <p id="user-department-zh" class="text-sm text-slate-500 mt-1 flex items-center gap-1 justify-center lg:justify-start" style="display:none;">
                            <i data-lucide="briefcase" class="w-3 h-3 flex-shrink-0"></i>
                            <span id="user-department-text-zh" class="truncate max-w-[250px] lg:max-w-none">---</span>
                        </p>

                        <!-- 靜態 Greeting -->
                        <div id="greeting-section-zh" class="mt-8 pt-8 border-t border-moda-light hidden">
                            <p class="hud-text mb-4 opacity-40" aria-hidden="true">Dynamic Transmission Feed</p>
                            <p id="greeting-zh" class="text-slate-600 font-medium italic text-lg">---</p>
                        </div>
                    </div>
                </article>

                <!-- 資訊晶片網格 -->
                <section class="p-6 lg:p-10 grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10" aria-label="聯絡資訊">
                    <!-- Email, Phone, Website, Address -->
                    <!-- 保留現有完整結構 -->
                </section>

                <!-- 社群連結聚落 -->
                <nav id="social-cluster-zh" class="px-6 lg:px-10 pb-10 flex flex-wrap gap-4 justify-center lg:justify-start relative z-10" aria-label="社群媒體連結">
                    <!-- 由 JS 動態注入 -->
                </nav>
            </main>
        </div>
        
        <!-- 背面 (英文) - 複製正面結構 -->
        <div class="card-face card-back">
            <main id="main-content-en" class="crystal-container rounded-2xl overflow-hidden shadow-2xl">
                <!-- 完整複製正面結構，ID 改為 -en 後綴 -->
            </main>
        </div>
        
    </div>
</div>
```

**WCAG 合規性**:
1. ✅ `role="region"` - 標識可滾動區域
2. ✅ `aria-label` - 提供上下文
3. ✅ `aria-live="polite"` - 翻轉時通知螢幕閱讀器
4. ✅ `tabindex="0"` - 鍵盤可聚焦
5. ✅ 所有 ID 加上 -zh / -en 後綴區分正反面

### JavaScript Functions (Updated - Best Practices)
```javascript
// ✅ 動態高度匹配（防止翻轉跳動）
function matchCardHeight() {
    const front = document.querySelector('.card-front');
    const back = document.querySelector('.card-back');
    
    if (!front || !back) return;
    
    // 計算實際內容高度
    const frontHeight = front.scrollHeight;
    const backHeight = back.scrollHeight;
    const maxHeight = Math.max(frontHeight, backHeight, 600); // 最小 600px
    
    // 統一設定高度
    const cardInner = document.getElementById('card');
    if (cardInner) {
        cardInner.style.height = `${maxHeight}px`;
    }
}

// 1. 翻轉控制（極簡版，無打字機）
let isFlipping = false;

function toggleFlip() {
    if (isFlipping) return; // 防抖
    
    const cardInner = document.getElementById('card');
    const isFlipped = cardInner.classList.contains('is-flipped');
    
    isFlipping = true;
    
    // 1. CSS 動畫
    cardInner.classList.toggle('is-flipped');
    
    // 2. 狀態同步
    const newLang = isFlipped ? 'zh' : 'en';
    currentLanguage = newLang;
    localStorage.setItem('language', newLang);
    
    // 3. 更新按鈕文字
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) {
        langSwitch.textContent = newLang === 'zh' ? 'EN' : '繁中';
    }
    
    // 4. 更新 HTML lang 屬性（無障礙）
    document.documentElement.lang = newLang === 'zh' ? 'zh-TW' : 'en';
    
    // 5. 解除鎖定
    setTimeout(() => {
        isFlipping = false;
    }, 800);
}

// 2. 靜態顯示 Greeting
function renderGreeting(cardData, lang, elementId, sectionId) {
    const greetings = getLocalizedArray(cardData.greetings, lang);
    const element = document.getElementById(elementId);
    const section = document.getElementById(sectionId);
    
    if (greetings && greetings.length > 0 && element && section) {
        element.textContent = greetings[0];
        section.classList.remove('hidden');
    } else if (section) {
        section.classList.add('hidden');
    }
}

// 3. 鍵盤支援（WCAG 2.1.1）
document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('card');
    if (card) {
        card.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggleFlip();
            }
        });
    }
});

// 4. 按鈕同步
document.getElementById('lang-switch').addEventListener('click', (e) => {
    e.stopPropagation(); // 防止觸發卡片點擊
    toggleFlip();
});

// 5. 卡片點擊
document.getElementById('card').addEventListener('click', toggleFlip);

// 6. 視窗大小改變時重新計算高度
window.addEventListener('resize', () => {
    matchCardHeight();
});

// 7. 在 loadCard 完成後執行高度匹配
async function loadCard(uuid) {
    // ... 現有邏輯
    
    if (cardData) {
        currentCardData = cardData;
        
        // 渲染雙面
        renderCardFace(cardData, sessionData, 'zh', 'main-content-zh');
        renderCardFace(cardData, sessionData, 'en', 'main-content-en');
        
        // 靜態顯示 greeting
        renderGreeting(cardData, 'zh', 'greeting-zh', 'greeting-section-zh');
        renderGreeting(cardData, 'en', 'greeting-en', 'greeting-section-en');
        
        hideLoading();
        document.getElementById('main-container').classList.remove('hidden');
        
        // ✅ 等待 DOM 渲染完成後匹配高度
        setTimeout(() => {
            matchCardHeight();
        }, 100);
    }
}
```

**最佳實踐整合**:
1. ✅ 動態高度匹配（防止翻轉跳動）
2. ✅ 防抖機制（800ms 鎖定）
3. ✅ 鍵盤支援（Space/Enter）
4. ✅ HTML lang 屬性更新（無障礙）
5. ✅ 視窗 resize 時重新計算高度

---

## Data Mapping

| 欄位 | 正面 (ZH) | 背面 (EN) |
|:---|:---|:---|
| 姓名 | `name_zh` | `name_en` |
| 職稱 | `title_zh` | `title_en` |
| 部門 | `department_zh` | `department_en` |
| 問候語 | `greeting_zh` | `greeting_en` |
| Email | `email` (共用) | `email` (共用) |
| 電話 | `phone` (共用) | `phone` (共用) |
| 網站 | `website` (共用) | `website` (共用) |
| 照片 | `photo` (共用) | `photo` (共用) |

---

## Security Compliance

1. **DOMPurify**: 所有動態內容必須經過 `DOMPurify.sanitize()`
2. **CSP Nonce**: 確保 inline styles 符合 nonce 規範
3. **XSS Prevention**: 避免直接使用 `innerHTML`，優先使用 `textContent`

---

## Performance Optimization

1. **DocumentFragment**: 使用批次 DOM 更新
2. **CSS Transform**: 使用 GPU 加速的 `transform` 而非 `left/top`
3. **Debounce**: 翻轉動畫期間禁用重複點擊

---

## Acceptance Criteria

- [ ] 點擊卡片主體可翻轉
- [ ] 正面顯示中文，背面顯示英文
- [ ] 右上角按鈕點擊觸發翻轉
- [ ] localStorage 正確儲存語言設定
- [ ] 打字機效果在翻轉時重啟
- [ ] Safari/Chrome/Firefox 無閃爍問題
- [ ] 鍵盤 Space/Enter 可觸發翻轉
- [ ] 所有動態內容經過 DOMPurify
- [ ] 翻轉動畫流暢 (60fps)
- [ ] 無 console errors

---

## Files to Modify

1. `workers/public/card-display.html`
   - 加入 `.card-perspective` 結構
   - 複製 `<main>` 為正反面
   - 加入 CSS 樣式

2. `workers/public/js/main.js`
   - 實作 `toggleFlip()` 函數
   - 整合現有 `switchLanguage()` 函數
   - 加入鍵盤事件監聽
   - 修改 `renderCard()` 函數支援雙面渲染

3. `workers/public/css/v4-design.css` (如需要)
   - 加入 3D 翻轉相關樣式

---

## Estimated Effort

- **CSS 架構**: 30 分鐘
- **HTML 重構**: 45 分鐘
- **JS 邏輯整合**: 60 分鐘
- **測試與修復**: 45 分鐘
- **總計**: 3 小時

---

**[HANDOFF: SPEC_READY]** BDD Spec has been drafted by Architect.


---

## Estimated Effort (Final - Best Practices Integrated)

**Phase 1: CSS 架構** (57 分鐘)
- 加入 3D 翻轉樣式 (30 分鐘)
- 解決寬度/高度/溢出衝突 (12 分鐘)
- 整合最佳實踐 (15 分鐘)
  * translateZ(0) 修正
  * scrollbar-gutter
  * font-smoothing
  * 焦點指示器

**Phase 2: HTML 重構** (30 分鐘)
- 包裝現有結構為 .card-perspective
- 複製正面為背面（ID 改為 -en 後綴）
- 加入 WCAG 合規屬性（role, aria-label, aria-live）

**Phase 3: JS 邏輯整合** (55 分鐘)
- 實作 toggleFlip() 函數 (15 分鐘)
- 實作 renderGreeting() 函數 (10 分鐘)
- 實作 matchCardHeight() 函數 (10 分鐘)
- 修改 renderCard() 支援雙面渲染 (10 分鐘)
- 修改 #lang-switch 事件 (5 分鐘)
- 加入鍵盤事件監聽 (5 分鐘)

**Phase 4: 測試與修復** (30 分鐘)
- Safari/Chrome/Firefox 測試
- 響應式測試（手機/平板/桌面）
- 滾動行為測試
- 無障礙性測試（鍵盤導航、螢幕閱讀器）
- 高度匹配測試

**總計**: 2.87 小時 (172 分鐘)

---

## Best Practices Integration Summary

| 最佳實踐 | 來源 | 實作 | 效益 |
|:---|:---|:---|:---|
| **translateZ(0)** | Stack Overflow | ✅ | Safari 相容性 |
| **scrollbar-gutter** | LogRocket 2025 | ✅ | 防止佈局跳動 |
| **font-smoothing** | 業界標準 | ✅ | 防止文字模糊 |
| **動態高度匹配** | CodePen 範例 | ✅ | 防止翻轉跳動 |
| **WCAG 合規** | LogRocket WCAG | ✅ | 無障礙性 |
| **scrollbar-width** | MDN 標準 | ✅ | Firefox 支援 |

---

## Design Consistency Verification

### ✅ **保留的現有設計元素**

1. **Glassmorphism 風格**
   - `background: rgba(255, 255, 255, 0.1)`
   - `backdrop-filter: blur(10px) saturate(180%)`
   - `border: 1px solid rgba(255, 255, 255, 0.18)`

2. **MODA 品牌色**
   - `--moda-accent: #6868ac`
   - `border-top: 5px solid var(--moda-accent)`

3. **完整資訊架構**
   - 頭像 (avatar)
   - 身分資訊 (name, title, department)
   - 資訊晶片 (email, phone, website, address)
   - 社群連結 (GitHub, LinkedIn, Facebook, etc.)

4. **響應式佈局**
   - `lg:` breakpoint (1024px)
   - `md:` breakpoint (768px)
   - 手機版垂直排列

5. **Three.js 背景動畫**
   - 保持不變

6. **無障礙性**
   - `aria-label`, `aria-live`, `tabindex`
   - 鍵盤支援 (Space/Enter)

### ✅ **整合的雛形元素**

1. **3D 翻轉邏輯**
   - `perspective: 2000px`
   - `transform-style: preserve-3d`
   - `backface-visibility: hidden`

2. **翻轉動畫**
   - `transition: transform 0.8s cubic-bezier(...)`
   - `transform: rotateY(180deg)`

3. **性能優化**
   - `will-change: transform`
   - `transform: translateZ(0)`

### ⚠️ **移除的元素**

1. ❌ 打字機效果 (startTypewriter)
2. ❌ 雛形的簡化資訊架構
3. ❌ 雛形的固定尺寸限制

---

**移除打字機效果後的性能提升**:
1. **無 setTimeout 循環**: 減少 CPU 使用
2. **無 DOM 更新**: 減少重繪/重排
3. **無狀態管理**: 簡化代碼邏輯
4. **翻面流暢度**: 純 CSS transform，60fps 保證

**保留的優化**:
1. **DocumentFragment**: 使用批次 DOM 更新
2. **CSS Transform**: 使用 GPU 加速的 `transform` 而非 `left/top`
3. **Debounce**: 翻轉動畫期間禁用重複點擊（`isFlipping` 鎖定）
4. **Hardware Acceleration**: `will-change: transform` + `translateZ(0)`

---

## Acceptance Criteria (Final - Best Practices)

- [ ] 點擊卡片主體可翻轉
- [ ] 正面顯示中文，背面顯示英文
- [ ] 右上角按鈕點擊觸發翻轉
- [ ] localStorage 正確儲存語言設定
- [ ] Greeting 靜態顯示（如果有資料）
- [ ] Safari/Chrome/Firefox 無閃爍問題
- [ ] 鍵盤 Space/Enter 可觸發翻轉
- [ ] 所有動態內容經過 DOMPurify
- [ ] 翻面動畫流暢 (60fps)
- [ ] 無 console errors
- [ ] ✅ **正反面高度一致（無跳動）**
- [ ] ✅ **滾動條隱藏但保持可滾動**
- [ ] ✅ **無佈局跳動（scrollbar-gutter）**
- [ ] ✅ **WCAG 2.1 Level AA 合規**
- [ ] ✅ **螢幕閱讀器正常運作**

---

## Files to Modify (Updated)

1. `workers/public/card-display.html`
   - 加入 `.card-perspective` 結構
   - 複製 `<main>` 為正反面
   - ~~移除打字機相關 HTML~~ (改為靜態 greeting)
   - 加入 CSS 樣式

2. `workers/public/js/main.js`
   - 實作 `toggleFlip()` 函數
   - ~~移除 `startTypewriter()` 函數~~ (改為 `renderGreeting()`)
   - 加入鍵盤事件監聽
   - 修改 `renderCard()` 函數支援雙面渲染
   - 修改 `#lang-switch` 事件（移除頁面重載）

3. `workers/public/css/v4-design.css` (如需要)
   - 加入 3D 翻轉相關樣式

---

**[HANDOFF: SPEC_FINAL_V4]** BDD Spec v4.0 - Best Practices Integrated, Production Ready.

**Key Updates (v4.0)**:
1. ✅ 整合外部最佳實踐（LogRocket, Stack Overflow, MDN）
2. ✅ Safari backface-visibility 修復（translateZ(0)）
3. ✅ 防止佈局跳動（scrollbar-gutter）
4. ✅ 動態高度匹配（matchCardHeight 函數）
5. ✅ WCAG 2.1 Level AA 合規（role, aria-label, aria-live）
6. ✅ 跨瀏覽器滾動條隱藏（scrollbar-width, -webkit-scrollbar）
7. ✅ 防止文字模糊（font-smoothing）
8. ✅ 總工時: 2.87 小時

**External References**:
- LogRocket: "How to use CSS to hide scrollbars without impacting scrolling" (2025)
- Stack Overflow: Multiple high-voted answers on Safari backface-visibility
- MDN: CSS backface-visibility standard documentation

**Ready for Implementation**: All conflicts resolved, best practices integrated, WCAG compliant.
