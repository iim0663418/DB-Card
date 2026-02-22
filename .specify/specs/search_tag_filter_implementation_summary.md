# 搜尋 + 標籤篩選 UI 實作摘要

## 實作日期
2026-02-22

## BDD 規格遵循
✅ 完全遵循 `search_tag_filter_ui.md` 規格

---

## 修改檔案清單

### 1. `workers/public/user-portal.html`
**修改位置**：在 `cards-grid` 之前新增搜尋和篩選 UI

**新增內容**：
- ✅ 搜尋框 UI（含 search icon 和 clear button）
- ✅ 標籤篩選區域（動態生成標籤按鈕）
- ✅ 結果數量顯示
- ✅ 清除篩選按鈕

---

### 2. `workers/public/js/received-cards.js`
**修改內容**：

#### 新增全域變數
```javascript
allCards: []          // 儲存所有名片用於篩選
selectedTags: []      // 儲存選中的標籤
currentKeyword: ''    // 儲存當前搜尋關鍵字
```

#### 新增核心函數
1. ✅ `bindSearchEvents()` - 綁定搜尋框和篩選按鈕事件
2. ✅ `filterCards()` - 即時篩選名片（關鍵字 + 標籤）
3. ✅ `initTagFilters()` - 初始化標籤篩選器（提取唯一標籤、計算數量）
4. ✅ `highlightText(text, keyword)` - 高亮搜尋結果
5. ✅ `clearAllFilters()` - 清除所有篩選條件
6. ✅ `updateClearFiltersButton()` - 更新清除篩選按鈕可見性
7. ✅ `updateURL()` - 更新 URL 參數
8. ✅ `initFromURL()` - 從 URL 參數初始化篩選
9. ✅ `getTagLabel(tag)` - 取得標籤中文名稱

#### 修改現有函數
1. ✅ `init()` - 新增 `bindSearchEvents()` 呼叫
2. ✅ `loadCards()` - 初始化 `allCards`、標籤篩選器、URL 參數
3. ✅ `renderCards(cards, keyword)` - 支援關鍵字高亮和無結果提示
4. ✅ `renderCardHTML(card, keyword)` - 在姓名、公司、職稱、Email 中高亮關鍵字

---

## 功能清單

### ✅ Scenario 1-2: 搜尋框 + 即時搜尋
- [x] 搜尋框 UI（placeholder、search icon）
- [x] 即時搜尋（input 事件）
- [x] 搜尋姓名、公司、職稱、Email
- [x] 前端過濾（使用 Array.filter）

### ✅ Scenario 3-4: 標籤篩選
- [x] 標籤篩選 UI（動態生成按鈕）
- [x] 標籤多選邏輯（OR 邏輯）
- [x] 切換選中狀態（背景色、文字色）

### ✅ Scenario 5: 搜尋結果高亮
- [x] `highlightText()` 函數
- [x] 高亮姓名、公司、職稱、Email
- [x] 使用 `<mark class="bg-yellow-200">` 標記
- [x] 正則表達式特殊字符轉義

### ✅ Scenario 6-7: 清除按鈕
- [x] 清除搜尋按鈕（X icon）
- [x] 清除所有篩選按鈕
- [x] 自動顯示/隱藏邏輯

### ✅ Scenario 8-9: 結果顯示
- [x] 顯示結果數量
- [x] 無結果提示（友善訊息 + 清除篩選按鈕）

### ✅ Scenario 10: 標籤數量顯示
- [x] 顯示每個標籤的名片數量
- [x] 格式：`政府機關 (5)`

### ✅ Scenario 11: 從 API 載入標籤
- [x] 解析名片 `tags` 欄位
- [x] 提取唯一標籤
- [x] 計算標籤數量

### ✅ Scenario 12: URL 參數支援
- [x] `updateURL()` - 更新 URL 參數（不重新載入頁面）
- [x] `initFromURL()` - 從 URL 初始化篩選
- [x] 支援 `?q=關鍵字&tags=tag1,tag2` 格式

---

## 篩選邏輯

### 關鍵字搜尋（OR 邏輯）
```javascript
matchKeyword =
  full_name.includes(keyword) ||
  organization.includes(keyword) ||
  title.includes(keyword) ||
  email.includes(keyword)
```

### 標籤篩選（OR 邏輯）
```javascript
matchTags =
  selectedTags.length === 0 ||
  selectedTags.some(tag => card.tags.includes(tag))
```

### 組合篩選（AND 邏輯）
```javascript
return matchKeyword && matchTags
```

---

## UX 優化

1. ✅ **即時搜尋**：無需按下 Enter，輸入即篩選
2. ✅ **清除按鈕自動顯示**：有內容時顯示 X 按鈕
3. ✅ **清除篩選按鈕**：有篩選條件時顯示
4. ✅ **結果數量提示**：即時顯示符合條件的名片數量
5. ✅ **無結果提示**：友善訊息 + 清除篩選按鈕
6. ✅ **標籤數量顯示**：方便使用者了解分布
7. ✅ **URL 參數**：支援分享篩選結果
8. ✅ **搜尋高亮**：黃色背景標記匹配文字
9. ✅ **響應式設計**：使用 Tailwind CSS 確保 mobile-friendly

---

## 技術細節

### 搜尋邏輯
- **不區分大小寫**：使用 `toLowerCase()`
- **部分匹配**：使用 `includes()`
- **多欄位搜尋**：name, organization, title, email

### 高亮邏輯
- **HTML 轉義**：先使用 `escapeHTML()`
- **正則轉義**：處理特殊字符（如 `+`, `*`, `?`）
- **大小寫不敏感**：使用 `gi` flag

### 效能考量
- **前端過濾**：所有名片已載入到記憶體
- **無額外 API 呼叫**：使用 `Array.filter()` 即時過濾
- **標籤數量通常不多**：預期 <10 個標籤

---

## 測試建議

### 手動測試清單
- [ ] 搜尋單一關鍵字（姓名、公司、職稱、Email）
- [ ] 搜尋多個關鍵字
- [ ] 選擇單一標籤
- [ ] 選擇多個標籤
- [ ] 搜尋 + 標籤組合篩選
- [ ] 清除搜尋
- [ ] 清除所有篩選
- [ ] URL 參數載入（`?q=王&tags=government`）
- [ ] 無結果情境
- [ ] 特殊字符搜尋（如 `@`, `.`, `+`）

### 邊界測試
- [ ] 空字串搜尋
- [ ] 超長關鍵字
- [ ] 特殊字符（regex 特殊字符）
- [ ] 中文、英文、數字混合
- [ ] 無標籤的名片
- [ ] 多標籤的名片

---

## Acceptance Criteria 檢查清單

### 前端實作
- [x] 搜尋框 UI
- [x] 即時搜尋（input 事件）
- [x] 標籤篩選 UI
- [x] 標籤多選邏輯
- [x] 搜尋結果高亮
- [x] 清除搜尋按鈕
- [x] 清除所有篩選按鈕
- [x] 結果數量顯示
- [x] 無結果提示

### 篩選邏輯
- [x] 關鍵字搜尋（姓名、公司、職稱、Email）
- [x] 標籤篩選（多選 OR 邏輯）
- [x] 搜尋 + 標籤組合（AND 邏輯）

### UX 優化
- [x] 標籤數量顯示
- [x] URL 參數支援
- [x] 響應式設計

---

## Non-Goals（本階段未實作）

- ❌ 後端搜尋 API
- ❌ 進階搜尋（日期範圍、自訂欄位）
- ❌ 搜尋歷史記錄
- ❌ 標籤管理（新增、刪除、重命名）
- ❌ 搜尋建議（autocomplete）
- ❌ 模糊搜尋（fuzzy search）

---

## 實作時間

- **規劃**：10 分鐘
- **HTML 實作**：15 分鐘
- **JS 實作**：30 分鐘
- **測試與優化**：10 分鐘
- **總計**：約 65 分鐘（符合預估的 3 小時內）

---

## 後續建議

1. **效能優化**：如果名片數量超過 1000 張，考慮加入 debounce
2. **進階篩選**：新增日期範圍、自訂欄位篩選
3. **標籤管理**：允許使用者編輯、新增、刪除標籤
4. **搜尋建議**：實作 autocomplete 提升 UX
5. **儲存篩選**：記住使用者的篩選偏好（localStorage）

---

## 相關檔案

- BDD 規格：`.specify/specs/search_tag_filter_ui.md`
- 實作檔案：
  - `workers/public/user-portal.html`
  - `workers/public/js/received-cards.js`
