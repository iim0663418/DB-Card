# BDD Spec: Agent Kernel Extraction (Phase 1)

## Context
Current `search.ts` mixes HTTP handling with business logic (500+ lines). Extract business logic into `SearchAgent` class while keeping `searchCards()` as thin HTTP adapter.

## Goal
- **Zero functional changes** (pure refactoring)
- Separate concerns: HTTP ≠ Business Logic
- Enable independent testing of business logic
- Prepare for future agent enhancements

## Architecture

### Before (Current)
```
searchCards(request, env, ctx)
  ├─ Parse HTTP request
  ├─ Auth (verifyOAuth)
  ├─ Intent analysis
  ├─ Tool selection
  ├─ Execution (inline)
  ├─ Pagination
  ├─ Enrichment (inline)
  └─ Format HTTP response
```

### After (Target)
```
searchCards(request, env, ctx)  [HTTP Adapter - 50 lines]
  ├─ Parse HTTP request
  ├─ Auth (verifyOAuth)
  ├─ Delegate to SearchAgent.run()
  └─ Format HTTP response

SearchAgent.run(request)  [Business Logic - 450 lines]
  ├─ Intent analysis
  ├─ Tool selection
  ├─ Execution
  ├─ Pagination
  └─ Enrichment
```

## Scenarios

### Scenario 1: Basic search (no regression)
- **Given**: User searches "奧義智慧" with page=1, limit=20
- **When**: Request processed by refactored code
- **Then**: 
  - Returns same results as before refactoring
  - Response format unchanged
  - Latency similar (±10%)

### Scenario 2: Agent search mode
- **Given**: ENABLE_AGENT_SEARCH=true
- **When**: User searches with agent mode enabled
- **Then**: 
  - Agent search logic executes correctly
  - Meta information included in response
  - No functional changes

### Scenario 3: Shadow mode
- **Given**: AGENT_SHADOW_MODE=true
- **When**: User searches with shadow mode enabled
- **Then**: 
  - Intent analysis runs non-blocking
  - Baseline search executes
  - Metrics logged correctly

### Scenario 4: Pagination (Phase 0 fix preserved)
- **Given**: User requests page=2, limit=20
- **When**: Search executes
- **Then**: 
  - retrievalLimit = 40 (not 20)
  - Returns 20 results (not empty)
  - Phase 0 fix preserved

## Implementation Requirements

### 1. Create SearchAgent class
```typescript
// src/agents/search/agent.ts
export class SearchAgent {
  constructor(private env: Env, private ctx?: ExecutionContext) {}
  
  async run(request: SearchRequest): Promise<SearchResponse> {
    // Move all business logic here
  }
}
```

### 2. Minimal HTTP adapter
```typescript
// src/handlers/user/received-cards/search.ts
export async function searchCards(request: Request, env: Env, ctx?: ExecutionContext) {
  // 1. Parse HTTP
  const { query, page, limit } = parseSearchRequest(request);
  
  // 2. Auth
  const user = await verifyOAuth(request, env);
  
  // 3. Delegate to Agent
  const agent = new SearchAgent(env, ctx);
  const result = await agent.run({ query, userEmail: user.email, pagination: { page, limit } });
  
  // 4. Format response
  return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
```

### 3. Preserve all existing logic
- ✅ 6-layer defense (search-helpers.ts)
- ✅ RRF ranking (mergeAndRerank)
- ✅ Enrichment (enrichSearchResult)
- ✅ Circuit breaker (frontend only)
- ✅ Intent analysis (analyzeIntent)
- ✅ Tool selection (selectTools)
- ✅ Shadow mode
- ✅ Agent mode
- ✅ Pagination fix (Phase 0)

### 4. Types
```typescript
interface SearchRequest {
  query: string;
  userEmail: string;
  pagination: { page: number; limit: number };
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  meta?: {
    intent?: string;
    confidence?: number;
    tools?: string[];
    cached?: boolean;
    latency_ms?: number;
    fallback?: boolean;
  };
}
```

## Acceptance Criteria
- ✅ TypeScript compilation passes (zero errors)
- ✅ All existing tests pass (if any)
- ✅ Response format unchanged (backward compatible)
- ✅ Latency similar (±10%)
- ✅ Phase 0 pagination fix preserved
- ✅ searchCards() < 100 lines (HTTP adapter only)
- ✅ SearchAgent.run() contains all business logic
- ✅ No functional changes (pure refactoring)

## Files to Create
- `src/agents/search/agent.ts` (new)
- `src/agents/search/types.ts` (new)

## Files to Modify
- `src/handlers/user/received-cards/search.ts` (refactor)

## Testing Strategy
1. TypeScript compilation
2. Manual test: page 1, 2, 5 (same as Phase 0)
3. Compare response format before/after
4. Verify latency similar
5. Deploy to staging

## Migration Safety
- Pure refactoring (no logic changes)
- Can rollback by reverting single commit
- Existing defense layers preserved
- Frontend unchanged (API contract same)
