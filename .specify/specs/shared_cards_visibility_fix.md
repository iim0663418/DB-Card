# BDD Spec: Shared Cards Visibility Fix

## Scenario: User can see cards shared by others
- **Given**: iim0663418 has set received_card_uuid=X with is_shared=1
- **When**: user@example.com calls GET /api/user/shared-cards
- **Then**: Response includes card X with shared_by=iim0663418

## Scenario: User can see their own shared cards
- **Given**: user@example.com has set received_card_uuid=Y with is_shared=1
- **When**: user@example.com calls GET /api/user/shared-cards
- **Then**: Response includes card Y with shared_by=user@example.com

## Technical Requirements
1. SQL Query: Remove `sc.owner_email != ?` filter
2. JOIN: shared_cards → received_cards (only is_shared=1)
3. ORDER BY: sc.shared_at DESC
4. Response: Include shared_by field

## Files to Modify
- src/handlers/user/received-cards/list-shared.ts
