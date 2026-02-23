# BDD Spec: Shared Card Image Access Control

## Scenario 1: Owner can access their card images
- **Given**: User A owns card X
- **When**: User A requests GET /api/user/received-cards/X/thumbnail
- **Then**: Return thumbnail (200 OK)

## Scenario 2: Shared user can access card images
- **Given**: User A shares card X, User B is logged in
- **When**: User B requests GET /api/user/received-cards/X/thumbnail
- **Then**: Return thumbnail (200 OK)

## Scenario 3: Non-shared user cannot access card images
- **Given**: User A owns card X (not shared), User C is logged in
- **When**: User C requests GET /api/user/received-cards/X/thumbnail
- **Then**: Return 404 Not Found

## Technical Requirements
1. **SQL Query**: Check (owner OR shared)
2. **Thumbnail API**: Modify WHERE clause
3. **Image API**: Modify WHERE clause
4. **Security**: Maintain tenant isolation

## SQL Logic
```sql
SELECT thumbnail_url
FROM received_cards
WHERE uuid = ? 
  AND deleted_at IS NULL
  AND (
    user_email = ?  -- Owner
    OR EXISTS (     -- OR shared to anyone
      SELECT 1 FROM shared_cards 
      WHERE card_uuid = ?
    )
  )
```

## Files to Modify
- src/handlers/user/received-cards/thumbnail.ts
- src/handlers/user/received-cards/image.ts

## Acceptance Criteria
- [ ] Owner can view their card images
- [ ] Any user can view shared card images
- [ ] Non-shared users get 404
- [ ] Deleted cards return 404
