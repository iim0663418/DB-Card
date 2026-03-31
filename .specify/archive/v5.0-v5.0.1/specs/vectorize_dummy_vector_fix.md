# BDD Spec: Vectorize Metadata-Only Query Fix

## Context
- **Error**: `VECTOR_QUERY_ERROR (code = 40006): invalid query vector, expected 768 dimensions, and got 0 dimensions`
- **Root Cause**: `checkCompanyRelationship()` passes empty array `[]` to Vectorize query
- **Impact**: Cron job (18:00 daily) fails during deduplication phase

## Scenario: Metadata-Only Vectorize Query with Dummy Vector

### Given
- Vectorize API requires 768-dimensional query vector (even for metadata-only queries)
- `checkCompanyRelationship()` only uses `filter` parameter, not semantic similarity
- Empty array `[]` causes API rejection

### When
- `checkCompanyRelationship(env, orgA, orgB)` is called during deduplication
- Function needs to query Vectorize with metadata filter only

### Then
- Should create a dummy 768-dimensional zero vector: `new Array(768).fill(0)`
- Should pass dummy vector as first argument to `env.VECTORIZE.query()`
- Should preserve existing `filter` logic: `{ organization_normalized: orgA }`
- Should NOT call Gemini embedding API (zero cost, zero latency)
- Should return same result structure: `{ isSameCompany: boolean, reason: string }`

### And
- Error handling should remain unchanged (catch block returns `{ isSameCompany: false, reason: 'Query error' }`)
- Console logging should remain unchanged

## Implementation Requirements

**File**: `workers/src/cron/deduplicate-cards.ts`

**Function**: `checkCompanyRelationship()` (line ~285)

**Change**:
```typescript
// Before (line 285):
const matches = await env.VECTORIZE.query(
  [],  // ❌ Empty array causes error
  { topK: 50, returnMetadata: 'all', filter: { organization_normalized: orgA } }
);

// After:
const dummyVector = new Array(768).fill(0);  // ✅ Valid 768-dim vector
const matches = await env.VECTORIZE.query(
  dummyVector,
  { topK: 50, returnMetadata: 'all', filter: { organization_normalized: orgA } }
);
```

## Acceptance Criteria

1. ✅ TypeScript compiles without errors
2. ✅ Cron job completes without `VECTOR_QUERY_ERROR`
3. ✅ Deduplication logic produces same results as before
4. ✅ Zero additional Gemini API calls
5. ✅ Function signature unchanged (no breaking changes)

## Rationale

- **Why dummy vector?**: Vectorize API design requires query vector even for metadata-only queries
- **Why zeros?**: Simplest valid vector; semantic similarity is ignored when using `filter`
- **Why not real embedding?**: Unnecessary cost (~$0.0001/call) and latency (~200ms) for unused feature
