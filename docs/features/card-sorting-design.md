# 收到的名片排序功能設計

## 現況分析

### 當前排序邏輯

**後端（crud.ts）**：
```sql
ORDER BY updated_at DESC  -- 固定：最近更新優先
```

**前端（received-cards.js）**：
- 無排序控制
- 直接顯示後端回傳順序
- 搜尋結果按 RRF score 排序

### 使用者需求

**常見排序需求**：
1. **時間排序**：
   - 最近收到（created_at DESC）
   - 最早收到（created_at ASC）
   - 最近更新（updated_at DESC）
   - 最早更新（updated_at ASC）

2. **字母排序**：
   - 姓名 A-Z（full_name ASC）
   - 姓名 Z-A（full_name DESC）
   - 公司 A-Z（organization ASC）
   - 公司 Z-A（organization DESC）

3. **其他排序**：
   - 職稱（title）
   - 相關聯絡人數量（related_contacts DESC）

---

## 設計方案

### 方案 A: 前端排序（推薦）

**概念**：後端回傳所有資料，前端動態排序

**優點**：
- ✅ 實作簡單（純前端）
- ✅ 即時響應（無 API 延遲）
- ✅ 支援多種排序組合
- ✅ 可儲存使用者偏好（localStorage）

**缺點**：
- ⚠️ 大量資料時效能較差（> 1000 張）
- ⚠️ 無法跨頁排序（如果有分頁）

**適用場景**：
- 當前使用者卡片數 < 500 張
- 無分頁或使用虛擬滾動

**工時**：2-3 小時

---

### 方案 B: 後端排序

**概念**：API 支援 `sort` 參數

**API 設計**：
```
GET /api/user/received-cards?sort=created_at&order=desc
```

**優點**：
- ✅ 支援大量資料
- ✅ 支援分頁排序
- ✅ 資料庫索引優化

**缺點**：
- ⚠️ 需要後端修改
- ⚠️ API 延遲（每次切換需請求）
- ⚠️ 需要新增索引

**適用場景**：
- 使用者卡片數 > 1000 張
- 有分頁需求

**工時**：4-6 小時

---

### 方案 C: 混合排序

**概念**：前端排序 + 後端預設排序

**流程**：
1. 後端預設 `updated_at DESC`
2. 前端載入後可切換排序
3. 重新載入時恢復後端預設

**優點**：
- ✅ 平衡效能與彈性
- ✅ 前端實作簡單
- ✅ 後端無需修改

**缺點**：
- ⚠️ 排序不持久（重新載入會重置）

**適用場景**：
- 當前階段（< 500 張卡片）
- 快速實作

**工時**：2-3 小時

---

## 推薦方案：方案 A（前端排序）

### 理由

1. **當前規模**：
   - 使用者平均 < 100 張卡片
   - 前端排序效能足夠

2. **使用者體驗**：
   - 即時響應（無 API 延遲）
   - 可儲存偏好（localStorage）

3. **開發成本**：
   - 純前端實作（2-3 小時）
   - 無需後端修改
   - 無需資料庫索引

4. **未來擴展**：
   - 如果卡片數 > 500 張
   - 可升級到方案 B（後端排序）

---

## UI/UX 設計

### 1. 排序選單位置

**選項 A: 搜尋框旁邊**（推薦）
```
┌─────────────────────────────────────────┐
│ [搜尋框]  [排序: 最近更新 ▼]  [篩選器] │
└─────────────────────────────────────────┘
```

**選項 B: 卡片列表上方**
```
┌─────────────────────────────────────────┐
│ 共 85 張名片                             │
│ 排序: [最近更新 ▼]                      │
└─────────────────────────────────────────┘
```

### 2. 排序選項

**基礎版本**（推薦）：
```
排序:
- 最近更新（預設）
- 最近收到
- 最早收到
- 姓名 A-Z
- 姓名 Z-A
- 公司 A-Z
- 公司 Z-A
```

**進階版本**：
```
排序:
- 最近更新（預設）
- 最近收到
- 最早收到
- 姓名 A-Z
- 姓名 Z-A
- 公司 A-Z
- 公司 Z-A
- 職稱 A-Z
- 相關聯絡人（多→少）
```

### 3. 儲存偏好

**localStorage**：
```javascript
localStorage.setItem('cardSortPreference', 'created_at_desc');
```

**恢復偏好**：
```javascript
const savedSort = localStorage.getItem('cardSortPreference') || 'updated_at_desc';
```

---

## 技術實作

### 前端排序邏輯

```javascript
// 排序函式
function sortCards(cards, sortBy) {
  const sorted = [...cards]; // 不修改原陣列
  
  switch (sortBy) {
    case 'updated_at_desc':
      return sorted.sort((a, b) => b.updated_at - a.updated_at);
    
    case 'created_at_desc':
      return sorted.sort((a, b) => b.created_at - a.created_at);
    
    case 'created_at_asc':
      return sorted.sort((a, b) => a.created_at - b.created_at);
    
    case 'name_asc':
      return sorted.sort((a, b) => 
        (a.full_name || '').localeCompare(b.full_name || '', 'zh-TW')
      );
    
    case 'name_desc':
      return sorted.sort((a, b) => 
        (b.full_name || '').localeCompare(a.full_name || '', 'zh-TW')
      );
    
    case 'organization_asc':
      return sorted.sort((a, b) => 
        (a.organization || '').localeCompare(b.organization || '', 'zh-TW')
      );
    
    case 'organization_desc':
      return sorted.sort((a, b) => 
        (b.organization || '').localeCompare(a.organization || '', 'zh-TW')
      );
    
    default:
      return sorted;
  }
}
```

### UI 元件

```html
<select id="sortSelect" class="sort-select">
  <option value="updated_at_desc">最近更新</option>
  <option value="created_at_desc">最近收到</option>
  <option value="created_at_asc">最早收到</option>
  <option value="name_asc">姓名 A-Z</option>
  <option value="name_desc">姓名 Z-A</option>
  <option value="organization_asc">公司 A-Z</option>
  <option value="organization_desc">公司 Z-A</option>
</select>
```

### 整合到現有流程

```javascript
// 1. 初始化時載入偏好
initSortControl() {
  const savedSort = localStorage.getItem('cardSortPreference') || 'updated_at_desc';
  this.currentSort = savedSort;
  
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.value = savedSort;
  
  sortSelect.addEventListener('change', (e) => {
    this.currentSort = e.target.value;
    localStorage.setItem('cardSortPreference', this.currentSort);
    this.filterCards(); // 重新渲染
  });
}

// 2. filterCards 時套用排序
async filterCards(signal = null) {
  // ... 現有邏輯 ...
  
  // 套用排序
  const sortedCards = this.sortCards(filteredCards, this.currentSort);
  
  // 渲染
  this.renderCards(sortedCards, this.currentKeyword);
}
```

---

## 效能考量

### 當前規模
- 平均使用者：< 100 張卡片
- 排序時間：< 10ms
- 使用者無感

### 效能優化
1. **虛擬滾動**（如果 > 500 張）
2. **Web Worker**（如果 > 1000 張）
3. **升級到後端排序**（如果 > 2000 張）

---

## 國際化考量

### 中文排序
```javascript
.localeCompare(b.full_name, 'zh-TW')  // 台灣中文
```

### 多語言支援
```javascript
const locale = navigator.language || 'zh-TW';
.localeCompare(b.full_name, locale)
```

---

## 測試場景

1. **基本排序**：
   - 切換排序選項
   - 驗證順序正確

2. **搜尋 + 排序**：
   - 搜尋後切換排序
   - 驗證搜尋結果排序

3. **篩選 + 排序**：
   - 標籤篩選後切換排序
   - 驗證篩選結果排序

4. **偏好儲存**：
   - 切換排序
   - 重新整理頁面
   - 驗證排序保持

5. **空值處理**：
   - 姓名為空的卡片
   - 公司為空的卡片
   - 驗證排序不出錯

---

## 建議實作順序

### Phase 1: 基礎排序（2 小時）
1. 新增排序選單 UI
2. 實作 7 種基本排序
3. 整合到 filterCards

### Phase 2: 偏好儲存（30 分鐘）
1. localStorage 儲存
2. 頁面載入時恢復

### Phase 3: 測試與優化（30 分鐘）
1. 測試 5 種場景
2. 修復 edge cases
3. 效能測試

**總工時**：3 小時

---

## 問題討論

### 1. 排序選項數量
- **基礎版**（7 個選項）：足夠日常使用
- **進階版**（9+ 個選項）：可能太複雜

**建議**：先實作基礎版，根據使用者反饋擴展

### 2. UI 位置
- **搜尋框旁邊**：更顯眼，但可能擁擠
- **卡片列表上方**：更清晰，但需要滾動

**建議**：搜尋框旁邊（桌面版），卡片列表上方（手機版）

### 3. 預設排序
- **最近更新**：符合當前後端邏輯
- **最近收到**：更符合「收到的名片」語意

**建議**：保持「最近更新」（向後相容）

### 4. 搜尋結果排序
- **選項 A**：搜尋結果固定按 RRF score
- **選項 B**：搜尋結果也可排序

**建議**：選項 A（搜尋結果按相關性，不可排序）

---

## 你的意見？

1. **方案選擇**：同意方案 A（前端排序）嗎？
2. **排序選項**：基礎版 7 個選項夠用嗎？
3. **UI 位置**：搜尋框旁邊 or 卡片列表上方？
4. **預設排序**：保持「最近更新」嗎？
5. **搜尋結果**：固定按相關性，不可排序？

請告訴我你的想法，我們再調整設計！
