# Task: Shared Card Image Access Control
## Phase: DEPLOYED ✅
- Status: 已部署到 Staging
- Version: 75805fd8-fc2d-4ee0-9a8a-afb6e9757ce5
- Next Action: 測試分享卡片的圖片訪問

## Feature Implementation
- **需求**: 分享的名片允許其他用戶查看圖片
- **實作**: SQL 權限檢查改為 (owner OR shared)
- **安全性**: 維持 tenant isolation + deleted_at 檢查

## SQL Logic
```sql
WHERE uuid = ? AND deleted_at IS NULL
  AND (
    user_email = ?              -- Owner
    OR EXISTS (                 -- OR shared
      SELECT 1 FROM shared_cards WHERE card_uuid = ?
    )
  )
```

## Files Modified
1. src/handlers/user/received-cards/thumbnail.ts (SQL WHERE clause)
2. src/handlers/user/received-cards/image.ts (SQL WHERE clause)

## Testing Checklist
- [ ] Owner 可以查看自己的卡片圖片
- [ ] 任何用戶可以查看已分享的卡片圖片
- [ ] 未分享的卡片其他用戶無法查看 (404)
- [ ] 已刪除的卡片無法查看 (404)
