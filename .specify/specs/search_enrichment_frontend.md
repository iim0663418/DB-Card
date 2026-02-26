# BDD Spec: Search Result Enrichment - Frontend Display

## Context
- Backend search.ts 已實作 enrichSearchResult()
- SearchResult interface 包含 related_contacts (number) 和 tags (string[])
- 前端 received-cards.js 的 renderCardHTML() 需要顯示這些新欄位

## Scenario: Display Related Contacts Count

**Given**: SearchResult 包含 related_contacts 欄位 (number)
**When**: renderCardHTML() 渲染名片卡片時
**Then**: 
- 若 related_contacts > 0，在名片資訊區塊顯示 "相關聯絡人: X 人"
- 使用 users icon (lucide)
- 樣式與現有 phone/email/website 一致
- 若 related_contacts === 0 或 undefined，不顯示

## Scenario: Display Auto Tags

**Given**: SearchResult 包含 tags 欄位 (string[])
**When**: renderCardHTML() 渲染名片卡片時
**Then**:
- 若 tags.length > 0，在名片底部顯示標籤列表
- 每個標籤使用 badge 樣式 (rounded-full, 小字體)
- 標籤顏色使用 moda-accent 系列
- 若 tags 為空陣列或 undefined，不顯示

## Technical Requirements

### 1. Minimal Code Changes
- 僅修改 renderCardHTML() 函數
- 在現有 phone/email/website 區塊後添加 related_contacts
- 在 note 區塊後、分享開關前添加 tags

### 2. HTML Structure
```html
<!-- Related Contacts (在 phone/email/website 區塊內) -->
${card.related_contacts > 0 ? `
  <div class="flex items-center gap-2">
    <i data-lucide="users" class="w-4 h-4 flex-shrink-0" style="color: var(--moda-accent);"></i>
    <span class="truncate text-xs">相關聯絡人: ${card.related_contacts} 人</span>
  </div>
` : ''}

<!-- Tags (在 note 後、分享開關前) -->
${card.tags && card.tags.length > 0 ? `
  <div class="flex flex-wrap gap-2">
    ${card.tags.map(tag => `
      <span class="px-2 py-1 rounded-full text-xs font-medium" 
            style="background: rgba(104, 104, 172, 0.1); color: var(--moda-accent);">
        ${this.escapeHTML(tag)}
      </span>
    `).join('')}
  </div>
` : ''}
```

### 3. Backward Compatibility
- 若後端未返回 related_contacts 或 tags，不顯示（不報錯）
- 使用 optional chaining 和條件渲染

### 4. Icon Initialization
- 新增的 users icon 會被現有的 window.initIcons() 自動初始化
- 無需額外代碼

## Acceptance Criteria
1. ✅ TypeScript 編譯通過（零錯誤）
2. ✅ ESLint 檢查通過
3. ✅ 手動測試：搜尋結果正確顯示 related_contacts 和 tags
4. ✅ 手動測試：舊資料（無這些欄位）不報錯
5. ✅ UI 樣式與現有設計一致

## Files to Modify
- `/Users/shengfanwu/GitHub/DB-Card/workers/public/js/received-cards.js` (renderCardHTML 函數)

## Estimated Time
- 實作: 10 分鐘
- 測試: 5 分鐘
