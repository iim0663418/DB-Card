-- Migration 0042: Normalize organization_alias to JSON array format
-- Purpose: Backfill legacy CSV/plain-string values to ["item1","item2"] format
--          so that json_each() queries work correctly.
-- Idempotent: safe to run multiple times; already-valid JSON arrays are untouched.

-- Step 1: Clear whitespace-only values (treat as no alias)
UPDATE received_cards
SET organization_alias = NULL
WHERE organization_alias IS NOT NULL
  AND TRIM(organization_alias) = '';

-- Step 2: Wrap valid JSON non-array scalars (e.g. `"Zeroflare"`) into an array
--   json_valid() = 1 confirms it's valid JSON; json_type() != 'array' means it's not yet an array.
UPDATE received_cards
SET organization_alias = json_array(json_extract(organization_alias, '$'))
WHERE organization_alias IS NOT NULL
  AND json_valid(organization_alias) = 1
  AND json_type(organization_alias) != 'array';

-- Step 3: Convert CSV / plain strings to JSON arrays
--   We use a json_each trick: replace each ',' with '","' to build a
--   temporary JSON array string, then re-parse with json_each() and
--   rebuild with json_group_array() to get clean trimmed values.
--   This handles:
--     "Zeroflare"            → ["Zeroflare"]
--     "零曜科技, Zeroflare"  → ["零曜科技","Zeroflare"]
--     "A, B, C"              → ["A","B","C"]
--   Note: assumes alias values do not themselves contain double-quote characters.
UPDATE received_cards
SET organization_alias = (
  SELECT json_group_array(TRIM(je.value))
  FROM json_each(
    '["' || REPLACE(TRIM(organization_alias), ',', '","') || '"]'
  ) AS je
  WHERE TRIM(je.value) != ''
)
WHERE organization_alias IS NOT NULL
  AND json_valid(organization_alias) = 0;

-- Step 4: Normalize already-valid JSON arrays: trim whitespace inside each element
--   Handles arrays that may have been stored with padded strings like [" foo ", " bar "].
UPDATE received_cards
SET organization_alias = (
  SELECT json_group_array(TRIM(je.value))
  FROM json_each(organization_alias) AS je
  WHERE TRIM(je.value) != ''
)
WHERE organization_alias IS NOT NULL
  AND json_valid(organization_alias) = 1
  AND json_type(organization_alias) = 'array'
  AND organization_alias != (
    SELECT json_group_array(TRIM(je2.value))
    FROM json_each(organization_alias) AS je2
    WHERE TRIM(je2.value) != ''
  );

-- Step 5: Set empty JSON arrays back to NULL for consistency
UPDATE received_cards
SET organization_alias = NULL
WHERE organization_alias = '[]';

-- Verification queries (run manually to confirm):
-- SELECT COUNT(*) FROM received_cards WHERE organization_alias IS NOT NULL AND json_valid(organization_alias) = 0;
-- → Should be 0 after migration
-- SELECT COUNT(*) FROM received_cards WHERE organization_alias IS NOT NULL AND json_type(organization_alias) != 'array';
-- → Should be 0 after migration
