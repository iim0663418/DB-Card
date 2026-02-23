# BDD Spec: Merged Display - Own + Shared Cards

## Scenario: Display own cards and shared cards together
- **Given**: User has uploaded 5 cards, and 3 cards are shared by others
- **When**: User visits "收到的名片" page
- **Then**: Display all 8 cards with source badge ("我的" or "分享者: {email}")

## Technical Requirements
1. **API**: Modify GET /api/user/received-cards to include shared cards
2. **SQL**: UNION query (own cards + shared cards)
3. **Response**: Add `source` field ("own" or "shared")
4. **Response**: Add `shared_by` field (null for own cards)
5. **Frontend**: Display source badge on each card

## SQL Logic
```sql
-- Own cards
SELECT *, 'own' as source, NULL as shared_by
FROM received_cards
WHERE user_email = ? AND deleted_at IS NULL

UNION ALL

-- Shared cards
SELECT rc.*, 'shared' as source, sc.owner_email as shared_by
FROM shared_cards sc
INNER JOIN received_cards rc ON sc.card_uuid = rc.uuid
WHERE rc.deleted_at IS NULL
  AND rc.user_email != ?  -- Exclude own cards from shared list
```

## Files to Modify
- src/handlers/user/received-cards/list.ts (add UNION query)
- public/js/received-cards.js (display source badge)

## Acceptance Criteria
- [ ] API returns merged list (own + shared)
- [ ] Each card has source field
- [ ] Frontend displays source badge
- [ ] No duplicate cards
