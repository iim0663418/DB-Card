# BDD Spec: Search and Tag Filter UI (Week 2 Day 3)

## Feature: 搜尋 + 標籤篩選 UI - 快速找到目標名片

### Background
當前問題：
- 名片列表無法搜尋
- 無法按標籤篩選
- 名片多時難以找到目標

目標：
- 即時搜尋（姓名、公司、職稱）
- 標籤多選篩選
- 前端過濾（無需 API）
- 搜尋結果高亮

---

## Scenario 1: 搜尋框 UI

### Given: 使用者進入名片列表
### When: 顯示搜尋框
### Then: 可以輸入關鍵字搜尋

**UI 元素**：
```html
<div class="mb-4">
  <div class="relative">
    <input 
      type="text" 
      id="searchInput"
      placeholder="搜尋姓名、公司、職稱..."
      class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    >
    <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400">
      <!-- Search icon -->
    </svg>
  </div>
</div>
```

---

## Scenario 2: 即時搜尋

### Given: 使用者輸入關鍵字
### When: 輸入框內容改變
### Then: 即時過濾名片列表

**實作**：
```javascript
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase().trim();
  filterCards(keyword, selectedTags);
});

function filterCards(keyword, tags) {
  const filtered = allCards.filter(card => {
    // 搜尋過濾
    const matchKeyword = !keyword || 
      card.name?.toLowerCase().includes(keyword) ||
      card.company?.toLowerCase().includes(keyword) ||
      card.title?.toLowerCase().includes(keyword) ||
      card.email?.toLowerCase().includes(keyword);
    
    // 標籤過濾
    const matchTags = tags.length === 0 || 
      tags.some(tag => card.tags?.includes(tag));
    
    return matchKeyword && matchTags;
  });
  
  renderCards(filtered);
}
```

---

## Scenario 3: 標籤篩選 UI

### Given: 系統有多個標籤
### When: 顯示標籤篩選器
### Then: 可以多選標籤

**UI 元素**：
```html
<div class="mb-4">
  <div class="flex flex-wrap gap-2" id="tagFilters">
    <!-- 動態生成標籤按鈕 -->
  </div>
</div>
```

**標籤按鈕**：
```html
<button 
  class="tag-filter px-3 py-1 rounded-full text-sm border transition-colors"
  data-tag="government"
>
  政府機關
</button>
```

---

## Scenario 4: 標籤多選邏輯

### Given: 使用者點擊標籤
### When: 切換標籤選中狀態
### Then: 更新篩選結果

**實作**：
```javascript
let selectedTags = [];

function initTagFilters() {
  // 從所有名片中提取唯一標籤
  const allTags = new Set();
  allCards.forEach(card => {
    card.tags?.forEach(tag => allTags.add(tag));
  });
  
  // 渲染標籤按鈕
  const tagFilters = document.getElementById('tagFilters');
  tagFilters.innerHTML = Array.from(allTags).map(tag => `
    <button 
      class="tag-filter px-3 py-1 rounded-full text-sm border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
      data-tag="${tag}"
    >
      ${getTagLabel(tag)}
    </button>
  `).join('');
  
  // 綁定點擊事件
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      
      // 切換選中狀態
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
        btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
        btn.classList.add('border-gray-300', 'text-gray-700');
      } else {
        selectedTags.push(tag);
        btn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
        btn.classList.remove('border-gray-300', 'text-gray-700');
      }
      
      // 更新篩選
      const keyword = searchInput.value.toLowerCase().trim();
      filterCards(keyword, selectedTags);
    });
  });
}

function getTagLabel(tag) {
  const labels = {
    'government': '政府機關',
    'listed': '上市公司',
    'startup': '新創公司',
    'ngo': '非營利組織'
  };
  return labels[tag] || tag;
}
```

---

## Scenario 5: 搜尋結果高亮

### Given: 使用者輸入關鍵字
### When: 顯示搜尋結果
### Then: 高亮匹配的文字

**實作**：
```javascript
function highlightText(text, keyword) {
  if (!keyword || !text) return text;
  
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

function renderCardHTML(card, keyword) {
  return `
    <div class="card-item">
      <h3>${highlightText(card.name, keyword)}</h3>
      <p>${highlightText(card.title, keyword)} @ ${highlightText(card.company, keyword)}</p>
    </div>
  `;
}
```

---

## Scenario 6: 清除搜尋

### Given: 使用者已輸入關鍵字
### When: 點擊清除按鈕
### Then: 清空搜尋框並顯示所有名片

**UI 元素**：
```html
<div class="relative">
  <input type="text" id="searchInput" />
  <button 
    id="clearSearch"
    class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
  >
    <svg class="w-5 h-5"><!-- X icon --></svg>
  </button>
</div>
```

**實作**：
```javascript
document.getElementById('clearSearch').addEventListener('click', () => {
  searchInput.value = '';
  filterCards('', selectedTags);
});
```

---

## Scenario 7: 清除所有篩選

### Given: 使用者已選擇標籤
### When: 點擊「清除篩選」按鈕
### Then: 取消所有標籤選擇並顯示所有名片

**UI 元素**：
```html
<button 
  id="clearFilters"
  class="text-sm text-blue-600 hover:text-blue-800"
>
  清除篩選
</button>
```

**實作**：
```javascript
document.getElementById('clearFilters').addEventListener('click', () => {
  // 清除標籤選擇
  selectedTags = [];
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
    btn.classList.add('border-gray-300', 'text-gray-700');
  });
  
  // 清除搜尋
  searchInput.value = '';
  
  // 顯示所有名片
  filterCards('', []);
});
```

---

## Scenario 8: 顯示篩選結果數量

### Given: 使用者進行搜尋或篩選
### When: 更新名片列表
### Then: 顯示結果數量

**UI 元素**：
```html
<div class="text-sm text-gray-600 mb-2">
  顯示 <span id="resultCount">0</span> 張名片
</div>
```

**實作**：
```javascript
function filterCards(keyword, tags) {
  const filtered = allCards.filter(/* ... */);
  
  // 更新結果數量
  document.getElementById('resultCount').textContent = filtered.length;
  
  renderCards(filtered);
}
```

---

## Scenario 9: 無搜尋結果提示

### Given: 搜尋或篩選無結果
### When: 顯示名片列表
### Then: 顯示友善的提示訊息

**實作**：
```javascript
function renderCards(cards) {
  const container = document.getElementById('cardsContainer');
  
  if (cards.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-4"><!-- Empty icon --></svg>
        <p>找不到符合條件的名片</p>
        <button 
          onclick="clearAllFilters()"
          class="mt-4 text-blue-600 hover:text-blue-800"
        >
          清除篩選
        </button>
      </div>
    `;
    return;
  }
  
  // 渲染名片...
}
```

---

## Scenario 10: 標籤數量顯示

### Given: 標籤按鈕
### When: 顯示標籤
### Then: 顯示該標籤的名片數量

**實作**：
```javascript
function initTagFilters() {
  const tagCounts = {};
  allCards.forEach(card => {
    card.tags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  const tagFilters = document.getElementById('tagFilters');
  tagFilters.innerHTML = Object.entries(tagCounts).map(([tag, count]) => `
    <button class="tag-filter" data-tag="${tag}">
      ${getTagLabel(tag)} <span class="text-xs opacity-75">(${count})</span>
    </button>
  `).join('');
}
```

---

## Scenario 11: 從 API 載入標籤

### Given: 名片列表已載入
### When: 解析名片資料
### Then: 提取標籤資訊

**API 回應**：
```json
{
  "cards": [
    {
      "card_uuid": "uuid",
      "name": "王小明",
      "company": "台北市政府",
      "tags": ["government"]
    }
  ]
}
```

**實作**：
```javascript
async function loadReceivedCards() {
  const response = await ReceivedCardsAPI.call('/api/user/received-cards');
  const data = await response.json();
  
  // 儲存到全域變數
  allCards = data.cards;
  
  // 初始化標籤篩選器
  initTagFilters();
  
  // 顯示所有名片
  renderCards(allCards);
}
```

---

## Scenario 12: URL 參數支援

### Given: URL 包含搜尋參數
### When: 頁面載入
### Then: 自動套用搜尋和篩選

**實作**：
```javascript
function initFromURL() {
  const params = new URLSearchParams(window.location.search);
  const keyword = params.get('q') || '';
  const tags = params.get('tags')?.split(',').filter(Boolean) || [];
  
  // 設定搜尋框
  searchInput.value = keyword;
  
  // 設定標籤選擇
  selectedTags = tags;
  tags.forEach(tag => {
    const btn = document.querySelector(`[data-tag="${tag}"]`);
    if (btn) {
      btn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
      btn.classList.remove('border-gray-300', 'text-gray-700');
    }
  });
  
  // 執行篩選
  filterCards(keyword, tags);
}

// 更新 URL（不重新載入頁面）
function updateURL(keyword, tags) {
  const params = new URLSearchParams();
  if (keyword) params.set('q', keyword);
  if (tags.length > 0) params.set('tags', tags.join(','));
  
  const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', newURL);
}
```

---

## Acceptance Criteria

### 前端實作
- [ ] 搜尋框 UI
- [ ] 即時搜尋（input 事件）
- [ ] 標籤篩選 UI
- [ ] 標籤多選邏輯
- [ ] 搜尋結果高亮
- [ ] 清除搜尋按鈕
- [ ] 清除所有篩選按鈕
- [ ] 結果數量顯示
- [ ] 無結果提示

### 篩選邏輯
- [ ] 關鍵字搜尋（姓名、公司、職稱、Email）
- [ ] 標籤篩選（多選 OR 邏輯）
- [ ] 搜尋 + 標籤組合（AND 邏輯）

### UX 優化
- [ ] 標籤數量顯示
- [ ] URL 參數支援
- [ ] 響應式設計

---

## Implementation Details

### 檔案位置
- **修改**：`workers/public/js/received-cards.js`（搜尋和篩選邏輯）
- **修改**：`workers/public/user-portal.html`（搜尋框和標籤篩選 UI）

### 全域變數
```javascript
let allCards = [];        // 所有名片
let selectedTags = [];    // 選中的標籤
```

### 核心函式
```javascript
filterCards(keyword, tags)     // 篩選名片
initTagFilters()               // 初始化標籤篩選器
highlightText(text, keyword)   // 高亮文字
updateURL(keyword, tags)       // 更新 URL
```

---

## Non-Goals (本階段不做)

- ❌ 後端搜尋 API（使用前端過濾）
- ❌ 進階搜尋（日期範圍、自訂欄位）
- ❌ 搜尋歷史記錄
- ❌ 標籤管理（新增、刪除、重命名）

---

## Technical Notes

1. **前端過濾**：
   - 所有名片已載入到記憶體
   - 使用 Array.filter() 即時過濾
   - 無需額外 API 呼叫

2. **搜尋邏輯**：
   - 不區分大小寫（toLowerCase）
   - 支援部分匹配（includes）
   - 搜尋多個欄位（name, company, title, email）

3. **標籤邏輯**：
   - 多選 OR 邏輯（任一標籤匹配即可）
   - 搜尋 + 標籤 AND 邏輯（同時滿足）

4. **效能考量**：
   - 使用 debounce 避免過度渲染（可選）
   - 標籤數量通常不多（<10 個）

---

## Estimated Time: 3 hours

- UI 實作：1.5 小時
- 邏輯實作：1 小時
- 測試與優化：0.5 小時
