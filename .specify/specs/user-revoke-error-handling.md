# BDD Spec: User Revoke Error Handling Fix

## Scenario 1: 403 Forbidden - Clear Error Message
**Given**: User attempts to revoke a card they don't own
**When**: POST /api/user/cards/:uuid/revoke returns 403
**Then**: 
- Frontend displays: "You do not have permission to revoke this card"
- NOT: "Error: [object Object]"

## Scenario 2: Error Response Parsing
**Given**: Backend returns JSON error response
**When**: `response.ok === false`
**Then**:
- Parse `data.message` first
- Fallback to `data.error` if message is missing
- Never throw raw object into Error constructor

## Implementation Requirements:
1. Fix line ~1300 in user-portal-init.js
2. Ensure error message extraction handles all cases:
   - `data.message` (string)
   - `data.error` (string or object)
   - Fallback: 'Unknown error'
3. No changes to backend (already correct)
