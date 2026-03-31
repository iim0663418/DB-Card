# BDD Spec: Search Pagination Bug Fix

## Context
Current implementation has a critical pagination bug where `retrievalLimit` and `responseLimit` are conflated, causing page 2+ to return empty or incomplete results.

## Bug Analysis
```typescript
// ❌ Current (buggy)
const merged = await hybridSearch(env, userEmail, query, limit);  // limit=20
const start = (page - 1) * limit;  // page=2 → start=20
const paginatedResults = merged.slice(start, start + limit);  // [20:40] but merged.length=20 → []
```

## Scenarios

### Scenario 1: First page retrieval (no bug)
- **Given**: User searches "奧義智慧" with page=1, limit=20
- **When**: Search executes
- **Then**: 
  - Should retrieve up to 100 results from hybrid search
  - Should slice [0:20] for response
  - Should return 20 results

### Scenario 2: Second page retrieval (BUG)
- **Given**: User searches "奧義智慧" with page=2, limit=20
- **When**: Search executes with current implementation
- **Then**: 
  - ❌ Retrieves only 20 results (limit=20)
  - ❌ Slices [20:40] from 20 results → empty array
  - ❌ Returns 0 results (incorrect)

### Scenario 3: Second page retrieval (FIXED)
- **Given**: User searches "奧義智慧" with page=2, limit=20
- **When**: Search executes with fixed implementation
- **Then**: 
  - ✅ Retrieves 40 results (retrievalLimit = limit * page)
  - ✅ Slices [20:40] from 40 results → 20 results
  - ✅ Returns 20 results (correct)

### Scenario 4: Large page number (budget constraint)
- **Given**: User searches "奧義智慧" with page=10, limit=20
- **When**: Search executes
- **Then**: 
  - Should cap retrievalLimit at 100 (budget constraint)
  - Should retrieve 100 results
  - Should slice [180:200] → may return fewer than 20 results
  - Should set hasMore=false if total < 200

## Implementation Requirements

### 1. Separate retrieval and response limits
```typescript
const retrievalLimit = Math.min(100, limit * page);  // Retrieve up to current page
const responseLimit = limit;  // Response size per page
```

### 2. Update all search functions
- `hybridSearch(env, userEmail, query, retrievalLimit)`
- `agentSearch(env, userEmail, query, retrievalLimit)`
- `semanticSearch(env, userEmail, query, retrievalLimit)`
- `keywordSearch(env, userEmail, query, retrievalLimit)`

### 3. Correct pagination logic
```typescript
const merged = await hybridSearch(env, userEmail, query, retrievalLimit);
const total = merged.length;
const start = (page - 1) * responseLimit;
const paginatedResults = merged.slice(start, start + responseLimit);
const hasMore = total > page * responseLimit;
```

### 4. Update enrichment budget
```typescript
// Only enrich up to 50 results (not all retrieved results)
const toEnrich = paginatedResults.slice(0, 50);
```

## Acceptance Criteria
- ✅ Page 1 returns correct results (no regression)
- ✅ Page 2+ returns correct results (bug fixed)
- ✅ retrievalLimit capped at 100 (budget constraint)
- ✅ hasMore flag correctly reflects availability
- ✅ Enrichment only processes paginated results (not all retrieved)
- ✅ TypeScript compilation passes
- ✅ No breaking changes to API response format

## Files to Modify
- `src/handlers/user/received-cards/search.ts` (main handler)

## Testing Strategy
1. Manual test: Search with page=1, verify 20 results
2. Manual test: Search with page=2, verify 20 results (not empty)
3. Manual test: Search with page=5, verify results or empty with hasMore=false
4. Check logs: Verify retrievalLimit calculation
