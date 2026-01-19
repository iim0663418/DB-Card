# BDD Spec: Fix GET /api/user/cards/:uuid for Revoked Cards

## Scenario: User views revoked card details
- **Given**: A card with UUID exists and is bound to user's email
- **Given**: The card status in uuid_bindings is 'revoked'
- **When**: GET /api/user/cards/:uuid is called with valid OAuth token
- **Then**: Return 200 with full card data (16 fields flattened structure)
- **Then**: Frontend will handle display-only mode based on status

## Technical Requirements:
1. Remove `binding.status !== 'bound'` check (line 520)
2. Change cards query from `status = 'active'` to `status IN ('active', 'deleted')` (line 531)
3. Keep ownership check: `bound_email = ?`
4. Return same 16-field flattened structure regardless of status

## Files to Modify:
- `workers/src/handlers/user/cards.ts` (handleUserGetCard function, lines 520-521, 531)
