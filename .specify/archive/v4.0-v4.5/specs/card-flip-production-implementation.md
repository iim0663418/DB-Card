# BDD Specification: 數位名片顯示頁面 - 3D 翻面雙語切換（生產環境實作）

**Version**: v1.0.0  
**Date**: 2026-01-23  
**Status**: SPEC_READY  
**Prototype**: `docs/數位名片顯示頁面翻頁雛形-最佳實踐版.html` (已驗證)

---

## Feature: 3D Card Flip with Bilingual Support

**As a** 名片接收者  
**I want to** 點擊卡片翻面查看中英文資訊  
**So that** 我可以選擇最適合的語言閱讀名片內容

---

## Background

**Given** 雛形已驗證符合以下標準：
- ✅ Glassmorphism 參數對齊線上版本
- ✅ Safari backface-visibility 修復
- ✅ 滾動條隱藏（跨瀏覽器）
- ✅ WCAG 2.1 Level AA 合規
- ✅ 動態高度匹配
- ✅ 浮動提示自動隱藏

**And** 現有系統狀態：
- 檔案：`workers/public/card-display.html`
- JS：`workers/public/js/main.js` (renderCard 函數)
- CSS：`workers/public/css/v4-design.css`
- 資料來源：`/api/read?session={sessionId}`

---

## Scenario 1: 首次載入顯示中文正面

**Given** 用戶首次訪問名片頁面  
**And** sessionStorage 無 'hint-seen' 記錄  
**When** 頁面載入完成  
**Then** 應該顯示中文正面  
**And** 應該顯示浮動提示「中文 ⇄ English / 點擊翻面」  
**And** 浮動提示應該在 3 秒後淡出  
**And** sessionStorage 應該設定 'hint-seen' = 'true'

---

## Scenario 2: 點擊卡片翻面到英文

**Given** 卡片顯示中文正面  
**When** 用戶點擊卡片任意位置  
**Then** 卡片應該翻轉 180 度（0.8 秒動畫）  
**And** 應該顯示英文背面  
**And** 翻轉期間（0.8 秒）應該防止重複點擊  
**And** 翻轉完成後應該可以再次點擊

---

## Scenario 3: 動態高度匹配

**Given** 正反面內容長度不同  
**When** 頁面載入或視窗 resize  
**Then** 卡片高度應該等於 max(正面 scrollHeight, 背面 scrollHeight, 600px)  
**And** 正反面內容應該完整顯示  
**And** 不應該出現內容裁切或溢出

---

## Scenario 4: 浮動提示自動隱藏（同一 session）

**Given** 用戶已看過浮動提示（sessionStorage 有 'hint-seen'）  
**When** 重新整理頁面  
**Then** 浮動提示應該直接隱藏  
**And** 不應該顯示 3 秒動畫

---

## Scenario 5: Safari 相容性驗證

**Given** 使用 Safari 瀏覽器  
**When** 翻轉卡片  
**Then** 不應該出現 backface-visibility 閃爍  
**And** 文字應該清晰不模糊  
**And** 滾動條應該正常隱藏  
**And** 翻轉動畫應該流暢

---

## Scenario 6: 鍵盤無障礙操作

**Given** 用戶使用鍵盤導航  
**When** Tab 鍵聚焦到卡片  
**Then** 應該顯示焦點框（focus-visible）  
**When** 按下 Enter 或 Space  
**Then** 卡片應該翻轉

---

## Scenario 7: 響應式設計

**Given** 不同裝置尺寸  
**When** 在手機（< 640px）、平板（640-1024px）、桌面（> 1024px）查看  
**Then** 卡片寬度應該適應螢幕  
**And** 內容應該完整顯示  
**And** 翻轉動畫應該正常運作

---

## Technical Implementation Details

### Phase 1: HTML 結構重構 (30 分鐘)

**目標檔案**: `workers/public/card-display.html`

**變更內容**:
1. 包裝現有內容為 3D 結構：
   ```html
   <div class="card-perspective">
       <div id="card" class="card-inner" tabindex="0" role="button" 
            aria-label="點擊翻面切換語言" onclick="toggleFlip()">
           <div class="card-face card-front">
               <!-- 現有中文內容 -->
           </div>
           <div class="card-face card-back">
               <!-- 複製為英文內容 -->
           </div>
       </div>
   </div>
   ```

2. 加入浮動提示：
   ```html
   <div id="hint-badge" class="fixed top-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-6 transition-opacity duration-300">
       <button class="pointer-events-auto group" onclick="toggleFlip()">
           <!-- 提示內容 -->
       </button>
   </div>
   ```

3. WCAG 屬性：
   - `role="button"`
   - `aria-label="點擊翻面切換語言"`
   - `tabindex="0"`

---

### Phase 2: CSS 整合 (20 分鐘)

**目標檔案**: `workers/public/css/v4-design.css`

**新增樣式**:
```css
/* 3D 翻轉核心 */
.card-perspective {
    perspective: 2000px;
    max-width: 56rem;
    padding: 0 1rem;
}

.card-inner {
    position: relative;
    width: 100%;
    min-height: 600px;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
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
    overflow-y: auto;
    scrollbar-width: none;
    scrollbar-gutter: stable both-edges;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translateZ(0);
}

.card-face::-webkit-scrollbar {
    display: none;
}

.card-front { z-index: 2; }
.card-back { 
    z-index: 1; 
    transform: rotateY(180deg) translateZ(0);
}

/* 焦點指示器 */
.card-inner:focus { outline: none; }
.card-inner:focus-visible {
    outline: 2px solid var(--moda-accent);
    outline-offset: 4px;
    border-radius: 1rem;
}

/* 浮動提示 */
#hint-badge {
    animation: float 3s ease-in-out infinite;
}

@keyframes float { 
    0%, 100% { transform: translateY(0); } 
    50% { transform: translateY(-8px); } 
}
```

---

### Phase 3: JS 邏輯整合 (35 分鐘)

**目標檔案**: `workers/public/js/main.js`

**新增函數**:

1. **toggleFlip()** - 翻轉控制（防抖）
```javascript
let isFlipping = false;
function toggleFlip() {
    if (isFlipping) return;
    isFlipping = true;
    document.getElementById('card').classList.toggle('is-flipped');
    setTimeout(() => { isFlipping = false; }, 800);
}
```

2. **matchCardHeight()** - 動態高度匹配
```javascript
function matchCardHeight() {
    const front = document.querySelector('.card-front');
    const back = document.querySelector('.card-back');
    if (!front || !back) return;
    const maxHeight = Math.max(front.scrollHeight, back.scrollHeight, 600);
    document.getElementById('card').style.height = `${maxHeight}px`;
}
```

3. **renderGreeting()** - 雙語問候語
```javascript
function renderGreeting(lang = 'zh') {
    const greetings = {
        zh: '您好',
        en: 'Hello'
    };
    return greetings[lang] || greetings.zh;
}
```

4. **initHintBadge()** - 浮動提示自動隱藏
```javascript
function initHintBadge() {
    const hintBadge = document.getElementById('hint-badge');
    const hintSeen = sessionStorage.getItem('hint-seen');
    
    if (!hintSeen && hintBadge) {
        setTimeout(() => {
            hintBadge.style.opacity = '0';
            setTimeout(() => {
                hintBadge.style.display = 'none';
                sessionStorage.setItem('hint-seen', 'true');
            }, 300);
        }, 3000);
    } else if (hintSeen && hintBadge) {
        hintBadge.style.display = 'none';
    }
}
```

5. **修改 renderCard()** - 支援雙面渲染
```javascript
// 在現有 renderCard() 函數中：
// 1. 渲染中文到 .card-front
// 2. 渲染英文到 .card-back
// 3. 呼叫 matchCardHeight()
```

**初始化**:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // 現有初始化邏輯...
    
    // 新增：
    setTimeout(matchCardHeight, 100);
    initHintBadge();
    
    // 監聽 resize
    window.addEventListener('resize', matchCardHeight);
});
```

---

### Phase 4: 測試與驗證 (30 分鐘)

**測試清單**:

1. **功能測試**
   - [ ] 首次載入顯示中文
   - [ ] 點擊翻面到英文
   - [ ] 再次點擊翻回中文
   - [ ] 防抖機制生效
   - [ ] 浮動提示 3 秒後隱藏
   - [ ] 重新整理後提示不再顯示

2. **跨瀏覽器測試**
   - [ ] Chrome (最新版)
   - [ ] Safari (最新版)
   - [ ] Firefox (最新版)
   - [ ] Edge (最新版)

3. **響應式測試**
   - [ ] 手機 (< 640px)
   - [ ] 平板 (640-1024px)
   - [ ] 桌面 (> 1024px)

4. **無障礙性測試**
   - [ ] Tab 鍵導航
   - [ ] Enter/Space 翻轉
   - [ ] 焦點框顯示
   - [ ] 螢幕閱讀器

5. **性能測試**
   - [ ] 翻轉動畫流暢 (60fps)
   - [ ] 無記憶體洩漏
   - [ ] 無 console 錯誤

---

## Acceptance Criteria

### 必須符合 (MUST)
- ✅ 點擊卡片可翻面切換中英文
- ✅ 翻轉動畫流暢（0.8 秒）
- ✅ 防抖機制防止快速點擊
- ✅ 動態高度匹配正反面
- ✅ Safari 無 backface-visibility 問題
- ✅ 滾動條隱藏（跨瀏覽器）
- ✅ WCAG 2.1 Level AA 合規
- ✅ 浮動提示 3 秒後自動隱藏
- ✅ sessionStorage 記錄提示狀態

### 應該符合 (SHOULD)
- ✅ 響應式設計（手機、平板、桌面）
- ✅ 鍵盤無障礙操作
- ✅ 焦點指示器清晰可見
- ✅ 翻轉動畫使用 cubic-bezier

### 可以符合 (COULD)
- ⚪ 翻轉音效（可選）
- ⚪ 手勢滑動翻轉（可選）

---

## Dependencies

**現有系統**:
- `workers/public/card-display.html` (主要修改)
- `workers/public/js/main.js` (renderCard 函數)
- `workers/public/css/v4-design.css` (新增樣式)

**外部依賴**:
- Tailwind CSS (已存在)
- Lucide Icons (已存在)
- Three.js (背景動畫，已存在)

**瀏覽器 API**:
- sessionStorage (浮動提示狀態)
- ResizeObserver (可選，用於高度匹配)

---

## Risks & Mitigations

| 風險 | 影響 | 緩解措施 |
|:---|:---|:---|
| Safari backface-visibility 閃爍 | 高 | 使用 translateZ(0) 修復 |
| 內容溢出裁切 | 中 | 動態高度匹配 + overflow-y: auto |
| 快速點擊導致動畫錯亂 | 中 | 防抖機制（800ms） |
| 滾動條顯示不一致 | 低 | 跨瀏覽器隱藏 + scrollbar-gutter |
| 焦點框影響美觀 | 低 | 使用 focus-visible 而非 focus |

---

## Rollback Plan

**如果實作失敗**:
1. 保留現有 `card-display.html` 為 `card-display.backup.html`
2. Git revert 到實作前的 commit
3. 回報問題到 `.specify/memory/progress.md`

**回滾條件**:
- 跨瀏覽器測試失敗 > 2 項
- 無障礙性測試失敗 > 1 項
- 性能測試 FPS < 30

---

## Estimated Timeline

| Phase | 工時 | 累計 |
|:---|:---:|:---:|
| Phase 1: HTML 重構 | 30 分鐘 | 0.5 小時 |
| Phase 2: CSS 整合 | 20 分鐘 | 0.83 小時 |
| Phase 3: JS 邏輯 | 35 分鐘 | 1.42 小時 |
| Phase 4: 測試 | 30 分鐘 | 1.92 小時 |
| **總計** | **1.92 小時** | **~2 小時** |

---

## HANDOFF Message

```
[HANDOFF: SPEC_READY]
BDD Specification v1.0.0 完成
- 7 個 Scenario 完整定義
- 4 個 Phase 實作計畫
- 總工時: 1.92 小時
- 下一步: Phase 1 HTML 重構

準備開始實作。
```
