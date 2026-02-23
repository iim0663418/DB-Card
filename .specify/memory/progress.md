# Task: Merged Cards Display (Own + Shared)
## Phase: DEPLOYED ✅
- Status: 已部署到 Staging
- Version: 0c126129-7eb4-4647-b571-f771a984b72f
- Next Action: 測試「收到的名片」頁面是否顯示合併清單

## Feature Implementation
- **需求**: 在「收到的名片」混合顯示自己與別人分享的卡
- **實作**: UNION ALL 查詢合併兩個來源
- **新增欄位**: source ('own'/'shared'), shared_by (email/null)

## SQL Logic
```sql
-- Own cards (user_email = ?)
SELECT ..., 'own' as source, NULL as shared_by
FROM received_cards
WHERE user_email = ? AND deleted_at IS NULL

UNION ALL

-- Shared cards (excluding own cards)
SELECT ..., 'shared' as source, sc.owner_email as shared_by
FROM shared_cards sc
INNER JOIN received_cards rc ON sc.card_uuid = rc.uuid
WHERE rc.deleted_at IS NULL AND rc.user_email != ?

ORDER BY updated_at DESC
```

## Files Modified
1. src/handlers/user/received-cards/crud.ts (handleListCards)

## Testing Checklist
- [ ] 登入任意帳號
- [ ] 查看「收到的名片」頁面
- [ ] 確認顯示自己的卡 (source='own')
- [ ] 確認顯示別人分享的卡 (source='shared', shared_by=email)
- [ ] 確認無重複卡片
