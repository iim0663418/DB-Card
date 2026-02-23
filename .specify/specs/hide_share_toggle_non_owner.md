# BDD Spec: Hide Share Toggle for Non-Owner Cards

## Scenario 1: Own card shows share toggle
- **Given**: User views a card with source='own'
- **When**: Card is rendered
- **Then**: Display share toggle (enabled)

## Scenario 2: Shared card hides share toggle
- **Given**: User views a card with source='shared'
- **When**: Card is rendered
- **Then**: Hide share toggle, show "分享者: {email}" badge

## Scenario 3: Backend prevents unauthorized sharing
- **Given**: User tries to share a card they don't own
- **When**: POST /api/user/received-cards/:uuid/share
- **Then**: Return 403 Forbidden

## Technical Requirements
1. **Frontend**: Check `card.source` in `renderCardHTML()`
2. **Frontend**: Only render share toggle if `source === 'own'`
3. **Frontend**: Show "分享者" badge if `source === 'shared'`
4. **Backend**: Verify ownership in share/unshare handlers

## Files to Modify
- public/js/received-cards.js (renderCardHTML conditional logic)
- src/handlers/user/received-cards/share.ts (add ownership check)
- src/handlers/user/received-cards/unshare.ts (add ownership check)

## Acceptance Criteria
- [ ] Own cards show share toggle
- [ ] Shared cards hide share toggle
- [ ] Shared cards show "分享者: {email}" badge
- [ ] Backend rejects unauthorized share/unshare (403)
- [ ] Images (thumbnail + original) display correctly for both types
