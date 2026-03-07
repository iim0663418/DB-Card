# BDD Spec: Phase 0 - Merged Cards Filtering Implementation

## Objective
Add `AND merged_to IS NULL` filter to all SQL queries that select from `received_cards` table to prevent displaying merged (duplicate) cards to users.

## Files to Modify

### 1. workers/src/handlers/user/received-cards/crud.ts
**Location 1**: Line ~298 (handleListCards - own cards query)
```sql
-- BEFORE
WHERE user_email = ? AND deleted_at IS NULL

-- AFTER
WHERE user_email = ? AND deleted_at IS NULL AND merged_to IS NULL
```

**Location 2**: Line ~312 (handleListCards - shared cards query)
```sql
-- BEFORE
WHERE rc.deleted_at IS NULL

-- AFTER
WHERE rc.deleted_at IS NULL AND rc.merged_to IS NULL
```

### 2. workers/src/handlers/user/received-cards/search.ts
**Location 1**: Line ~46 (enrichSearchResult - related contacts count)
```sql
-- BEFORE
WHERE user_email = ? AND organization = ? AND deleted_at IS NULL AND uuid != ?

-- AFTER
WHERE user_email = ? AND organization = ? AND deleted_at IS NULL AND merged_to IS NULL AND uuid != ?
```

**Location 2**: Line ~142 (semanticSearch - card details fetch)
```sql
-- BEFORE
WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL

-- AFTER
WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL AND merged_to IS NULL
```

**Location 3**: Line ~240 & ~272 (keywordSearch - two queries)
```sql
-- BEFORE
WHERE user_email = ? AND deleted_at IS NULL AND (...)

-- AFTER
WHERE user_email = ? AND deleted_at IS NULL AND merged_to IS NULL AND (...)
```

### 3. workers/src/handlers/user/received-cards/vcard.ts
**Location**: Line ~142 (handleExportVCard)
```sql
-- BEFORE
WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL

-- AFTER
WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL AND merged_to IS NULL
```

**Error Handling Enhancement**:
After the query, if card is not found, check if it's merged:
```typescript
if (!card) {
  // Check if card was merged
  const merged = await env.DB.prepare(`
    SELECT merged_to FROM received_cards
    WHERE uuid = ? AND deleted_at IS NULL
  `).bind(uuid).first();
  
  if (merged?.merged_to) {
    return errorResponse(
      'CARD_MERGED',
      `This card has been merged to ${merged.merged_to}`,
      410  // Gone
    );
  }
  
  return errorResponse('NOT_FOUND', 'Card not found', 404);
}
```

### 4. workers/src/handlers/user/received-cards/image.ts
**Location**: Line ~31 (handleGetImage)
```sql
-- BEFORE
WHERE uuid = ? AND deleted_at IS NULL

-- AFTER
WHERE uuid = ? AND deleted_at IS NULL AND merged_to IS NULL
```

### 5. workers/src/handlers/user/received-cards/thumbnail.ts
**Location**: Line ~31 (handleGetThumbnail)
```sql
-- BEFORE
WHERE uuid = ? AND deleted_at IS NULL

-- AFTER
WHERE uuid = ? AND deleted_at IS NULL AND merged_to IS NULL
```

### 6. workers/src/handlers/user/received-cards/share.ts
**Location**: Line ~29 (handleShareCard)
```sql
-- BEFORE
WHERE uuid = ? AND deleted_at IS NULL

-- AFTER
WHERE uuid = ? AND deleted_at IS NULL AND merged_to IS NULL
```

### 7. workers/src/handlers/user/received-cards/unshare.ts
**Location**: Line ~29 (handleUnshareCard)
```sql
-- BEFORE
WHERE uuid = ? AND deleted_at IS NULL

-- AFTER
WHERE uuid = ? AND deleted_at IS NULL AND merged_to IS NULL
```

### 8. workers/src/handlers/user/received-cards/enrich.ts
**Location**: Line ~166 (handleEnrichCard)
```sql
-- BEFORE
WHERE uuid = ? AND deleted_at IS NULL

-- AFTER
WHERE uuid = ? AND deleted_at IS NULL AND merged_to IS NULL
```

## Acceptance Criteria
- [ ] All 10 SQL queries include `AND merged_to IS NULL` filter
- [ ] vcard.ts includes enhanced error handling for merged cards
- [ ] TypeScript compiles with zero errors
- [ ] No breaking changes to existing functionality
- [ ] Merged cards are no longer visible to users

## Testing
After implementation:
1. Run `npm run typecheck` - should pass with zero errors
2. Deploy to staging
3. Manual test: Create 2 cards, mark one as merged, verify only 1 shows in list
4. Manual test: Try to access merged card via vcard endpoint, verify 410 error

## Notes
- The `merged_to` column already exists (added in migration 0033)
- Index `idx_received_cards_merged` already exists for performance
- This is a pure filtering change, no data modification
