# BDD Spec: Phase 3.0.5a - Data Pipeline Fix

## Context
Phase 3.0 Click Tracking 已部署，但資料鏈路有三個問題：
1. query_hash 多對多配對（不穩定）
2. result_source 未追蹤（tool success rate 失真）
3. Cache 無即時失效（5 分鐘延遲）

## Goal
修復資料品質問題，為 Phase 3.0.5b Realtime Hints 奠定基礎。

## Architecture

### Before (Phase 3.0)
```
Search → query_events (query_hash)
Click  → click_events (query_hash)
Join   → query_hash (多對多，不穩定)
```

### After (Phase 3.0.5a)
```
Search → query_events (event_id) → Return event_id to frontend
Click  → click_events (query_event_id) → Direct reference
Join   → query_event_id (一對多，穩定)
```

## Database Schema Changes

### Migration 0048
```sql
-- Add query_event_id to click_events
ALTER TABLE click_events ADD COLUMN query_event_id TEXT;
ALTER TABLE click_events ADD COLUMN result_source TEXT;

-- Index for efficient joins
CREATE INDEX idx_click_events_query_event 
  ON click_events(query_event_id);

-- Note: Keep query_hash for backward compatibility
```

## Implementation Details

### 1. query_event_id Tracking

#### Backend: Return event_id
```typescript
// src/agents/search/memory.ts
private async writeQueryEvent(...): Promise<string> {
  const eventId = crypto.randomUUID();
  
  await this.env.DB.prepare(`
    INSERT INTO query_events (event_id, user_email, query_hash, ...)
    VALUES (?, ?, ?, ...)
  `).bind(eventId, ...).run();
  
  return eventId;  // NEW: Return to caller
}

// src/agents/search/agent.ts
async run(request: SearchRequest): Promise<SearchResponse> {
  // ... Sense → Think → Act
  
  // Remember: Get event_id back
  let queryEventId: string | undefined;
  if (context.enableAgent || context.shadowMode) {
    queryEventId = await this.memory.record(context, plan, result)
      .catch(() => undefined);
  }
  
  return {
    results: enrichedResults,
    total,
    page,
    limit,
    query_hash: queryHash,
    query_event_id: queryEventId,  // NEW
    meta
  };
}
```

#### Frontend: Store and pass event_id
```javascript
// public/js/received-cards.js
const ReceivedCards = {
  currentSearchQueryHash: null,
  currentSearchQueryEventId: null,  // NEW
  
  _applySearchResults(data) {
    this.currentSearchQueryHash = data.query_hash;
    this.currentSearchQueryEventId = data.query_event_id;  // NEW
    
    this.bindSearchResultClickEvents(
      data.query_event_id,  // Pass event_id
      data.query_hash,
      data.results
    );
  },
  
  bindSearchResultClickEvents(queryEventId, queryHash, results) {
    results.forEach((result, index) => {
      const card = document.querySelector(`[data-uuid="${result.uuid}"]`);
      if (card) {
        card.addEventListener('click', () => {
          this.trackResultClick(
            queryEventId,      // NEW: Direct reference
            queryHash,         // Keep for backward compat
            result.uuid,
            index + 1,
            result.result_source  // NEW
          );
        });
      }
    });
  },
  
  trackResultClick(queryEventId, queryHash, resultUuid, rank, resultSource) {
    if (!queryEventId && !queryHash) return;  // Guard
    
    fetch('/api/user/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_event_id: queryEventId,  // NEW: Primary key
        query_hash: queryHash,         // Fallback
        result_uuid: resultUuid,
        result_rank: rank,
        result_source: resultSource,   // NEW
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
};
```

### 2. result_source Tracking

#### Retrievers: Mark source
```typescript
// src/agents/search/retrievers/semantic.ts
export async function semanticSearch(...): Promise<SearchResult[]> {
  return results.map(card => ({
    uuid: card.uuid,
    full_name: card.full_name,
    organization: card.organization,
    title: card.title,
    email: card.email,
    phone: card.phone,
    thumbnail_url: card.thumbnail_url,
    score: match.score,
    match_reason: 'semantic match',
    result_source: 'semantic'  // NEW
  }));
}

// src/agents/search/retrievers/keyword.ts
export async function keywordSearch(...): Promise<SearchResult[]> {
  return results.map((card: any) => ({
    uuid: card.uuid,
    full_name: card.full_name,
    organization: card.organization,
    title: card.title,
    email: card.email,
    phone: card.phone,
    thumbnail_url: card.thumbnail_url,
    score: 1.0,
    match_reason: 'keyword match',
    result_source: 'keyword'  // NEW
  }));
}
```

#### Ranker: Mark hybrid
```typescript
// src/agents/search/rankers/rrf.ts
export function mergeAndRerank(
  semanticResults: SearchResult[],
  keywordResults: SearchResult[]
): SearchResult[] {
  // ... existing RRF logic
  
  return merged.map(result => ({
    ...result,
    result_source: 'hybrid'  // NEW: Both sources contributed
  }));
}
```

#### Types: Add field
```typescript
// src/agents/search/types.ts
export interface SearchResult {
  uuid: string;
  full_name: string;
  organization: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  thumbnail_url: string | null;
  score: number;
  match_reason: string;
  result_source: 'semantic' | 'keyword' | 'hybrid';  // NEW
  tags?: Array<{ category: string; raw_value: string; normalized_value: string }>;
  related_contacts?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query_hash: string;
  query_event_id?: string;  // NEW
  meta?: SearchMeta;
}
```

### 3. Cache Invalidation on Click

```typescript
// src/handlers/user/analytics-click.ts
export async function handleAnalyticsClick(
  request: Request,
  env: Env,
  ctx?: ExecutionContext
): Promise<Response> {
  // ... existing validation and D1 write
  
  // NEW: Invalidate realtime signals cache
  const cacheKey = `realtime_signals:${userEmail}`;
  await env.KV.delete(cacheKey).catch(() => {});
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Scenarios

### Scenario 1: query_event_id tracking
- **Given**: User searches "奧義智慧"
- **When**: Search completes
- **Then**:
  - query_events has event_id = "uuid-123"
  - Response includes query_event_id = "uuid-123"
  - Frontend stores query_event_id

### Scenario 2: Click with query_event_id
- **Given**: User clicks 3rd result
- **When**: Frontend tracks click
- **Then**:
  - POST body includes query_event_id = "uuid-123"
  - click_events.query_event_id = "uuid-123"
  - Can join directly: click_events.query_event_id = query_events.event_id

### Scenario 3: result_source tracking
- **Given**: Hybrid search returns 6 results
- **When**: Results rendered
- **Then**:
  - All results have result_source = 'hybrid'
  - Frontend passes result_source to click API
  - click_events.result_source = 'hybrid'

### Scenario 4: Accurate tool success rate
- **Given**: User clicks 5 results (3 keyword, 2 semantic)
- **When**: Calculate tool success rate
- **Then**:
  - Query: `SELECT result_source, COUNT(*) FROM click_events WHERE user_email = ? GROUP BY result_source`
  - keyword: 3, semantic: 2
  - keyword_success_rate = 60%, semantic_success_rate = 40%

### Scenario 5: Cache invalidation
- **Given**: User clicks result
- **When**: Click API processes
- **Then**:
  - KV.delete('realtime_signals:user@example.com')
  - Next search loads fresh signals (<1s delay)

### Scenario 6: Backward compatibility
- **Given**: Old frontend without query_event_id
- **When**: Click tracked with only query_hash
- **Then**:
  - click_events.query_event_id = NULL
  - click_events.query_hash = "hash-abc"
  - System still works (degraded mode)

## Acceptance Criteria

### Functional
- ✅ query_event_id returned in search response
- ✅ query_event_id stored in click_events
- ✅ result_source tracked for all results
- ✅ Cache invalidated on click (<1s)
- ✅ Backward compatible (query_hash fallback)

### Data Quality
- ✅ No hash-based joins (use query_event_id)
- ✅ Accurate tool success tracking
- ✅ One-to-many relationship (stable)

### Performance
- ✅ No latency increase (<5ms overhead)
- ✅ Cache invalidation non-blocking
- ✅ Migration backward compatible

## Implementation Checklist

### Backend (45 min)
- [ ] Migration 0048: Add columns + index (10 min)
- [ ] memory.ts: Return event_id from writeQueryEvent (10 min)
- [ ] agent.ts: Pass event_id to response (5 min)
- [ ] retrievers: Add result_source (10 min)
- [ ] rankers: Mark hybrid (5 min)
- [ ] analytics-click.ts: Invalidate cache (5 min)

### Frontend (15 min)
- [ ] Store query_event_id (5 min)
- [ ] Pass query_event_id + result_source to click API (10 min)

### Testing (10 min)
- [ ] Deploy to staging (5 min)
- [ ] Manual test: Search + click (5 min)
- [ ] Verify click_events has query_event_id + result_source

## Notes

- **Backward compatible**: Keep query_hash for old clients
- **Non-blocking**: Cache invalidation doesn't block response
- **Stable joins**: query_event_id eliminates multi-match issues
- **Accurate signals**: result_source enables tool-level analysis
