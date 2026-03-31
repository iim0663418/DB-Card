# BDD Spec: Search LIKE Pattern Complexity Fix (Enhanced)

## Problem Statement
Search API returns 500 when enrichSearchResult() generates overly complex LIKE patterns from organization_alias data.

## Root Cause
1. organization_alias format inconsistent (JSON array vs CSV string)
2. No length/count limits on LIKE pattern terms
3. Special characters (%/_) not escaped properly
4. Any enrich query failure crashes entire search API
5. No query complexity budget (conditions/timeout)
6. Legacy data not normalized

## Solution Design (6-Layer Defense)

### Layer 1: LIKE Escaping (Not Filtering)
**Given**: organization_alias contains special LIKE characters (%, _)
**When**: Building LIKE pattern for enrich query
**Then**: 
- Use escapeLike(term) to escape % → \%, _ → \_
- SQL query uses `LIKE ? ESCAPE '\'`
- Preserve legitimate company names with special chars
- Example: "50%_Off" → "50\%\_Off"

### Layer 2: JSON-Aware Query (Reduce Pattern Explosion)
**Given**: organization_alias stored as JSON array
**When**: Enriching search results with related contacts
**Then**:
- **Primary**: Use `json_each(organization_alias)` for exact match
  ```sql
  SELECT COUNT(*) FROM received_cards
  WHERE user_email != ? 
  AND EXISTS (
    SELECT 1 FROM json_each(organization_alias) 
    WHERE value = ?
  )
  ```
- **Fallback**: Use LIKE only if json_each fails (malformed JSON)
- Limit: Maximum 10 terms per enrich query

### Layer 3: Fail-Open Architecture (Enrich Isolation)
**Given**: Enrich query fails (timeout, DB error, LIKE too complex)
**When**: enrichSearchResult() processes search results
**Then**:
- Wrap each enrich in try-catch (not Promise.all crash)
- Failed enrich → set `related_contacts = 0, tags = []`
- Log warning: `card_uuid`, `error.message`, `alias_length`
- Main search returns 200 OK with partial enrichment
- **Budget**: Enrich max 50 results (skip rest)

### Layer 4: Query Complexity Budget
**Given**: Enrich query may be slow or complex
**When**: Executing enrich queries
**Then**:
- **Term limits**: 50 chars/term, 10 terms max
- **Condition limit**: Max 10 OR clauses in LIKE fallback
- **Timeout**: 100ms per enrich query (D1 statement timeout)
- **Batch limit**: Enrich first 50 results only
- Exceeded budget → skip enrich, log warning

### Layer 5: Write Normalization (Not Rejection)
**Given**: Saving card with organization_alias in various formats
**When**: crud.ts processes organization_alias field
**Then**:
- **Array input**: `JSON.stringify(array)` directly
- **CSV string**: Split by comma → trim → filter empty → `JSON.stringify()`
- **Malformed**: Store `[]`, log warning with `card_uuid`
- **Never reject**: Always normalize to valid JSON array
- Example transforms:
  - `["A", "B"]` → `'["A","B"]'`
  - `"A, B, "` → `'["A","B"]'`
  - `null` → `'[]'`

### Layer 6: Data Migration (Backfill)
**Given**: Existing cards have CSV or malformed organization_alias
**When**: Running migration 0042
**Then**:
- Scan all `received_cards.organization_alias`
- Parse each: try JSON.parse() → fallback split(',')
- Update to JSON array format
- Log: `{total_cards, migrated_count, failed_count}`
- **Idempotent**: Safe to re-run

## Implementation Checklist

### Core Logic
- [ ] `escapeLike(term: string): string` in search-helpers.ts
- [ ] `parseOrganizationAlias(raw: string): string[]` in search-helpers.ts
- [ ] `normalizeOrganizationAlias(input: any): string` in search-helpers.ts
- [ ] Update enrichSearchResult() with json_each() primary path
- [ ] Add LIKE ESCAPE '\' to fallback queries
- [ ] Wrap enrich in try-catch per result (not Promise.all)
- [ ] Add enrich budget: 50 results max, 100ms timeout
- [ ] Update crud.ts to normalize on write

### Data Migration
- [ ] Create migration 0042_normalize_organization_alias.sql
- [ ] Backfill script with progress logging
- [ ] Verify idempotency (safe re-run)

### Monitoring
- [ ] Log enrich failures: card_uuid, error, alias_length
- [ ] Log normalization warnings: card_uuid, original_format
- [ ] Log migration stats: total/success/fail counts

## Acceptance Criteria

### Functional
1. ✅ Search with `q=資` returns 200 even if enrich fails
2. ✅ organization_alias with `50%_Off` can be searched (not filtered)
3. ✅ 100+ char alias doesn't crash (truncated to 50/term)
4. ✅ More than 10 aliases only uses first 10
5. ✅ Malformed alias data degrades gracefully (related_contacts=0)

### Architectural
6. ✅ LIKE special chars escaped, not filtered
7. ✅ json_each() used for JSON arrays (primary path)
8. ✅ Enrich timeout/error doesn't crash main search (200 OK)
9. ✅ Old data (CSV/malformed) searchable before/after backfill
10. ✅ Write path normalizes all formats (never rejects)

### Performance
11. ✅ Enrich limited to 50 results max
12. ✅ Each enrich query < 100ms (timeout enforced)
13. ✅ Max 10 OR conditions in LIKE fallback

## Files to Modify

### Backend
- `workers/src/handlers/user/received-cards/search.ts` (enrich logic)
- `workers/src/handlers/user/received-cards/crud.ts` (write normalization)
- `workers/src/utils/search-helpers.ts` (new: escapeLike, parse, normalize)

### Database
- `workers/migrations/0042_normalize_organization_alias.sql` (backfill)

### Testing
- `workers/src/handlers/user/received-cards/search.test.ts` (unit tests)
- Manual test: Search with special chars, malformed data

## Testing Strategy

### Unit Tests
1. `escapeLike()`: Test %, _, \, normal chars
2. `parseOrganizationAlias()`: Test JSON, CSV, malformed
3. `normalizeOrganizationAlias()`: Test all input formats

### Integration Tests
1. Search with organization_alias containing `%`, `_`
2. Search with 100+ char alias (should truncate)
3. Search with malformed alias (should degrade)
4. Enrich timeout simulation (should return 200)

### Manual Tests
1. Search `q=資` with existing data (before/after backfill)
2. Save card with CSV alias → verify JSON stored
3. Save card with malformed alias → verify [] stored
4. Check logs for enrich failures and normalization warnings

## Migration Execution Plan

```bash
# 1. Deploy code with normalization logic
wrangler deploy

# 2. Run backfill migration
wrangler d1 execute DB --remote --file=migrations/0042_normalize_organization_alias.sql

# 3. Verify migration
wrangler d1 execute DB --remote --command="
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN organization_alias LIKE '[%' THEN 1 ELSE 0 END) as json_format
  FROM received_cards 
  WHERE organization_alias IS NOT NULL
"

# 4. Monitor logs for 24h
wrangler tail --format=pretty | grep -E 'enrich|normalize'
```

## Rollback Plan
If migration causes issues:
1. Code rollback: Previous deployment still handles both formats
2. Data rollback: Not needed (normalization is additive)
3. Monitoring: Check error rate in logs

## Success Metrics
- Search 500 errors: 0 (current: sporadic)
- Enrich degradation rate: < 1% (logged)
- Migration success rate: > 99%
- Search latency p95: < 500ms (unchanged)
