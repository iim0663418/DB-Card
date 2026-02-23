# BDD Spec: Hide Edit/Delete Buttons for Non-Owner Cards

## Scenario 1: Own card shows all action buttons
- **Given**: User views a card with source='own'
- **When**: Card is rendered
- **Then**: Display all buttons (view, edit, export, delete)

## Scenario 2: Shared card shows limited action buttons
- **Given**: User views a card with source='shared'
- **When**: Card is rendered
- **Then**: Display only view and export buttons (hide edit and delete)

## Technical Requirements
1. **Frontend**: Check `card.source` in `renderCardHTML()`
2. **Edit Button**: Only render if `source === 'own'`
3. **Delete Button**: Only render if `source === 'own'`
4. **View/Export**: Always visible (read-only actions)

## UI Logic
```javascript
// Own cards: 3 buttons (view, edit, export) + delete
source === 'own' ? 
  <button edit>...</button>
: 
  '' // Hide edit button

// Delete button same logic
source === 'own' ? 
  <button delete>...</button>
: 
  '' // Hide delete button
```

## Files to Modify
- public/js/received-cards.js (renderCardHTML button rendering)

## Acceptance Criteria
- [ ] Own cards show all 4 buttons (view, edit, export, delete)
- [ ] Shared cards show only 2 buttons (view, export)
- [ ] Edit button hidden for shared cards
- [ ] Delete button hidden for shared cards
