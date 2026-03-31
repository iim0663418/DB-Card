# Claude Code Implementation Instructions - Phase 2

## Context
You are implementing Phase 2 of the Agent Search Migration. Phase 1 has extracted SearchAgent from HTTP handler. Now split SearchAgent into four layers: Sense → Think → Act → Remember.

## BDD Specification
Read: `.specify/specs/four-layer-agent.md`

## Current State
- `src/agents/search/agent.ts` (434 lines) - Contains all business logic
- `src/agents/search/types.ts` (43 lines) - Basic types

## Target State
Split agent.ts into modular layers while preserving ALL existing logic.

## Implementation Steps

### Step 1: Expand types.ts
Add interfaces for all four layers:
```typescript
// SenseContext, SearchPlan, ExecutionResult, etc.
// See BDD spec for complete interface definitions
```

### Step 2: Create Sense Layer (sense.ts)
Extract from agent.ts:
- Query normalization logic (uses existing chinese-converter)
- Query type detection (rule-based heuristics)
- Budget calculation (retrievalLimit = Math.min(100, limit * page))

**Key**: No extra LLM calls, deterministic only.

### Step 3: Create Think Layer (planner.ts)
Extract from agent.ts:
- Intent analysis (reuse existing analyzeIntent)
- Tool selection logic (selectTools function)
- Output SearchPlan (not just tools)

**Key**: Preserve existing intent-analyzer integration.

### Step 4: Create Act Layer Modules

#### 4a. Create retrievers/
- `retrievers/semantic.ts` - Extract semanticSearch method
- `retrievers/keyword.ts` - Extract keywordSearch method
- `retrievers/hybrid.ts` - Extract hybridSearch method

#### 4b. Create rankers/
- `rankers/rrf.ts` - Extract mergeAndRerank method

#### 4c. Create enrichers/
- `enrichers/contact-metadata.ts` - Extract enrichSearchResult method

#### 4d. Create executor.ts
Orchestrate: retrieval → ranking → enrichment

### Step 5: Create Remember Layer (memory.ts)
- Event logging (non-blocking with ctx.waitUntil)
- Query hash (SHA-256 for privacy)
- Database: query_events table (see migration below)

### Step 6: Update agent.ts
Refactor to orchestrate four layers:
```typescript
async run(request: SearchRequest): Promise<SearchResponse> {
  const context = await this.sense.perceive(request);
  const plan = await this.planner.plan(context);
  const result = await this.executor.execute(plan, context);
  this.memory.record(context, plan, result);  // non-blocking
  return this.formatResponse(result, request.pagination);
}
```

### Step 7: Create Database Migration
File: `migrations/0044_query_events.sql`
```sql
CREATE TABLE IF NOT EXISTS query_events (
  event_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  query_hash TEXT NOT NULL,
  normalized_query TEXT,
  query_type TEXT,
  plan_goal TEXT,
  tools_used TEXT,
  result_count INTEGER,
  latency_ms INTEGER,
  timestamp INTEGER NOT NULL
);
CREATE INDEX idx_query_events_user_time ON query_events(user_email, timestamp DESC);
```

## Critical Requirements

### 1. Preserve ALL Existing Logic
- ✅ Phase 0 pagination fix (retrievalLimit)
- ✅ 6-layer defense (search-helpers.ts)
- ✅ RRF ranking (mergeAndRerank)
- ✅ Enrichment (related contacts + tags)
- ✅ Shadow mode
- ✅ Agent mode
- ✅ Baseline mode

### 2. No Functional Changes
- Same input → same output
- Same API response format
- Same latency (±10%)

### 3. Minimal Implementation
- Extract existing code, don't rewrite
- Preserve all error handling
- Keep all console.log statements
- Maintain all type safety

### 4. Remember Layer Constraints
- Non-blocking only (ctx.waitUntil)
- Event-sourced (no direct preference writes)
- Privacy-first (query hash, not raw query)
- No ranking influence

## Verification Checklist
- [ ] TypeScript compilation passes (npm run typecheck)
- [ ] All files created as per structure
- [ ] agent.ts < 150 lines (orchestrator only)
- [ ] Each layer independently testable
- [ ] No breaking changes to API contract

## Testing After Implementation
```bash
# 1. TypeScript check
npm run typecheck

# 2. Deploy to staging
npx wrangler deploy

# 3. Health check
curl https://db-card-staging.csw30454.workers.dev/health

# 4. Test search (page 1)
# (requires authentication)

# 5. Test search (page 2) - verify Phase 0 fix
# (requires authentication)
```

## Notes
- Use existing imports (don't add new dependencies)
- Preserve all existing comments
- Keep error messages unchanged
- Maintain backward compatibility

## Start Implementation
Begin with Step 1 (types.ts), then proceed sequentially through Steps 2-7.
