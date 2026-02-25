# Migration Records Fix - 2026-02-25

## Problem
`d1_migrations` table only had 21 records but 34 migration files exist.
Missing records for migrations 0022-0033 (12 migrations).

## Root Cause
Migrations were applied manually using `wrangler d1 execute --file` without updating `d1_migrations` table.

## Solution Applied
Manually inserted missing migration records:

```sql
INSERT INTO d1_migrations (name, applied_at) VALUES
('0022_csp_reports.sql', datetime('now')),
('0023_risc_cross_account_protection.sql', datetime('now')),
('0024_received_cards.sql', datetime('now')),
('0025_temp_uploads.sql', datetime('now')),
('0026_web_search_optional.sql', datetime('now')),
('0027_tags_system.sql', datetime('now')),
('0028_card_thumbnails.sql', datetime('now')),
('0029_bilingual_card_support.sql', datetime('now')),
('0030_organization_extended.sql', datetime('now')),
('0031_shared_cards.sql', datetime('now')),
('0032_idempotency_key.sql', datetime('now')),
('0033_card_deduplication.sql', datetime('now'));
```

## Verification
```bash
$ wrangler d1 execute DB --remote --command "SELECT COUNT(*) FROM d1_migrations"
# Result: 33 records
```

## Current Status
✅ All applied migrations are now tracked
✅ Migration history is complete
✅ No duplicate applications

## Note: Duplicate 0029
There are two migration files numbered 0029:
- `0029_bilingual_card_support.sql`
- `0029_name_org_fields.sql`

Both have been recorded. Consider renumbering one to 0034 in future cleanup.

## Execution Date
2026-02-25 12:20 UTC+8
