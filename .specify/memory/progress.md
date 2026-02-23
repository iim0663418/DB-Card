# Task: Shared Cards Visibility Fix
## Phase: DEPLOYED ✅
- Status: 已部署到 Staging
- Version: a0f6d57a-8f11-46b9-a062-7372b6f04077
- Next Action: 測試其他帳號是否能看到 iim0663418 分享的名片

## Bug Fix
- **問題**: list-shared.ts 錯誤過濾 `sc.owner_email != ?`
- **修復**: 移除該條件，顯示所有 is_shared=1 的名片
- **邏輯**: 分享清單應包含所有人分享的卡（含自己）

## Files Modified
1. src/handlers/user/received-cards/list-shared.ts (SQL 查詢簡化)

## Testing Checklist
- [ ] 登入非 iim0663418 帳號
- [ ] 查看 shared-cards 頁面
- [ ] 確認能看到 iim0663418 分享的名片
- [ ] 確認 shared_by 欄位正確顯示
