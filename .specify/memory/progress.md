# Task: Hide Share Toggle for Non-Owner Cards
## Phase: DEPLOYED ✅
- Status: 已部署到 Staging
- Version: b98e55ca-2c52-4919-85c0-d8333bea0727
- Next Action: 測試分享卡片的 UI 顯示

## Feature Implementation
- **需求 1**: 別人分享的名片不顯示「分享」開關
- **需求 2**: 分享的名片顯示縮圖和原圖（已驗證 ✅）
- **實作**: 條件渲染 `card.source === 'own'`

## UI Logic
```javascript
// Own cards: Show share toggle
card.source === 'own' ? 
  <label>分享給其他使用者 [toggle]</label>
:
  <span>分享者: {shared_by}</span>
```

## Backend Security (Already Implemented)
- share.ts: Ownership check (403 if not owner)
- unshare.ts: Ownership check (403 if not owner)

## Files Modified
1. public/js/received-cards.js (renderCardHTML conditional logic)

## Testing Checklist
- [ ] 登入任意帳號
- [ ] 查看「收到的名片」頁面
- [ ] 自己的卡：顯示分享開關 ✅
- [ ] 別人分享的卡：顯示「分享者: {email}」徽章 ✅
- [ ] 別人分享的卡：隱藏分享開關 ✅
- [ ] 點擊縮圖：顯示原圖預覽 ✅
