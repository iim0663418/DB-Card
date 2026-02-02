# BDD Spec: User Card Update - Address & Social Media Fix

## Scenario 1: Update address (partial language)
**Given**: User has existing card with address `{ zh: "台北市", en: "Taipei" }`
**When**: User updates only `address_zh` to "新北市" (address_en remains empty in form)
**Then**: 
- Address should update to `{ zh: "新北市", en: "Taipei" }` (preserve existing en)
- API returns 200 with updated card data

## Scenario 2: Clear address
**Given**: User has existing card with address `{ zh: "台北市", en: "Taipei" }`
**When**: User clears both `address_zh` and `address_en` (empty strings)
**Then**: 
- Address should update to empty string `""`
- API returns 200

## Scenario 3: Update social media (add new)
**Given**: User has existing card with `social_github: ""`
**When**: User adds `social_github: "https://github.com/user"`
**Then**: 
- `social_github` should update to "https://github.com/user"
- Other social fields remain unchanged
- API returns 200

## Scenario 4: Clear social media
**Given**: User has existing card with `social_line: "line_id_123"`
**When**: User clears `social_line` (empty string)
**Then**: 
- `social_line` should update to `""`
- API returns 200

## Technical Requirements:
1. Support partial language updates (zh only, en only, or both)
2. Treat empty string `""` as valid update (clear field)
3. Use `body.field !== undefined` to detect field presence
4. Preserve existing values when field is not in request body
5. Handle address as object `{ zh, en }` or string based on input

## Files to modify:
- `workers/src/handlers/user/cards.ts` (handleUserUpdateCard function)
