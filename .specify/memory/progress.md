# Task: Hide Edit/Delete Buttons for Non-Owner Cards
## Phase: DEPLOYED ✅
- Status: 已部署到 Staging
- Version: 25c2cd58-a3a6-4395-a595-4e6f8933b94a
- Next Action: 測試分享卡片的按鈕顯示

## Feature Implementation
- **需求**: 分享的名片不顯示編輯/刪除按鈕
- **實作**: 條件渲染 `card.source === 'own'`
- **UI 調整**: 動態 grid-cols (own=3, shared=2)

## UI Logic
```javascript
// Own cards: 3 buttons + delete
grid-cols-3: [查看] [編輯] [匯出]
[刪除]

// Shared cards: 2 buttons only
grid-cols-2: [查看] [匯出]
(no edit, no delete)
```

## Files Modified
1. public/js/received-cards.js (renderCardHTML button rendering)

## Testing Checklist
- [ ] 自己的卡：顯示 4 個按鈕（查看、編輯、匯出、刪除）
- [ ] 分享的卡：只顯示 2 個按鈕（查看、匯出）
- [ ] 分享的卡：隱藏編輯按鈕 ✅
- [ ] 分享的卡：隱藏刪除按鈕 ✅
- [ ] Grid 佈局正確（3 欄 vs 2 欄）
