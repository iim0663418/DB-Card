# BDD Spec: Phase 3.0 - Click Tracking Foundation

## Context
Phase 3.1 Learn Layer requires high-quality feedback signals. Click tracking is the prerequisite for personalization.

## Goal
- Log which search results users click
- Track result rank (position in list)
- Enable future CTR analysis and personalization
- Privacy-first: No PII, only UUIDs and hashes

## Architecture

### Data Flow
```
User clicks result → Frontend tracks → POST /api/user/analytics/click → D1 (non-blocking)
                                                                            ↓
                                                                      click_events table
                                                                            ↓
                                                                    Daily cron cleanup (7d)
```

## Database Schema

### click_events Table
```sql
CREATE TABLE click_events (
  event_id TEXT PRIMARY KEY,           -- UUID v4
  user_email TEXT NOT NULL,
  query_hash TEXT NOT NULL,            -- SHA-256 from search response
  result_uuid TEXT NOT NULL,           -- Card UUID
  result_rank INTEGER NOT NULL,        -- 1-based position (1 = top result)
  timestamp INTEGER NOT NULL           -- Unix timestamp (ms)
);

CREATE INDEX idx_click_events_user 
  ON click_events(user_email, timestamp DESC);

CREATE INDEX idx_click_events_query 
  ON click_events(query_hash, timestamp DESC);

CREATE INDEX idx_click_events_result 
  ON click_events(result_uuid, timestamp DESC);
```

**Privacy Design**:
- ✅ No raw query text (only hash)
- ✅ No result content (only UUID)
- ✅ No IP address or user agent
- ✅ 7-day retention (auto-cleanup)

## API Endpoint

### POST /api/user/analytics/click

**Request**:
```json
{
  "query_hash": "be10d5a82e85d857...",
  "result_uuid": "73031709-02f8-4a87-a9b6-b7e2990122f1",
  "result_rank": 3,
  "timestamp": 1710223661000
}
```

**Response**:
```json
{
  "success": true
}
```

**Implementation**:
- Non-blocking (ctx.waitUntil)
- No authentication required (public endpoint)
- Rate limited (100 clicks/hour per user)
- Validates: query_hash format, result_uuid exists, rank > 0

## Frontend Integration

### user-portal.html
```javascript
// Add to search result rendering
function renderSearchResults(results, queryHash) {
  results.forEach((result, index) => {
    const rank = index + 1;
    const card = createResultCard(result);
    
    // Track click
    card.addEventListener('click', () => {
      trackResultClick(queryHash, result.uuid, rank);
    });
    
    resultsContainer.appendChild(card);
  });
}

function trackResultClick(queryHash, resultUuid, rank) {
  // Fire-and-forget (don't block UI)
  fetch('/api/user/analytics/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_hash: queryHash,
      result_uuid: resultUuid,
      result_rank: rank,
      timestamp: Date.now()
    })
  }).catch(() => {});  // Silent failure
}
```

**Key Points**:
- Attach listener to result cards
- Pass query_hash from search response
- 1-based rank (top result = 1)
- Non-blocking (don't await)

## Cron Job: Cleanup Old Events

### Schedule
- **Frequency**: Daily at 04:00 UTC (12:00 Taiwan)
- **Retention**: 7 days
- **Execution**: Non-blocking (ctx.waitUntil)

### Implementation
```typescript
// src/cron/cleanup-click-events.ts
export async function cleanupClickEvents(env: Env): Promise<void> {
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  
  const result = await env.DB.prepare(`
    DELETE FROM click_events
    WHERE timestamp < ?
  `).bind(sevenDaysAgo).run();
  
  console.log(`[Cron] Cleaned up ${result.meta.changes} old click events`);
}
```

## Scenarios

### Scenario 1: User clicks search result
- **Given**: User searches "奧義智慧", gets 6 results
- **When**: User clicks 3rd result (洪健復)
- **Then**:
  - Frontend sends POST /api/user/analytics/click
  - Backend logs: query_hash, result_uuid=73031709, rank=3
  - Response: { success: true }
  - Event stored in click_events table

### Scenario 2: Multiple clicks on same query
- **Given**: User searches "奧義智慧", clicks 2 results
- **When**: User clicks rank 1, then rank 4
- **Then**:
  - 2 separate events logged
  - Same query_hash, different result_uuid and rank
  - Both events have unique event_id

### Scenario 3: Click without search (invalid)
- **Given**: User directly accesses result page
- **When**: Frontend tries to track click without query_hash
- **Then**:
  - Frontend validation fails (no query_hash)
  - No API call made
  - Silent failure (no error shown to user)

### Scenario 4: Rate limit exceeded
- **Given**: User clicks 100+ results in 1 hour
- **When**: 101st click tracked
- **Then**:
  - Backend returns 429 Too Many Requests
  - Frontend silently ignores (fire-and-forget)
  - User experience unaffected

### Scenario 5: Cron cleanup
- **Given**: click_events table has 1000 events (500 old, 500 recent)
- **When**: Daily cron runs at 04:00 UTC
- **Then**:
  - Deletes 500 events older than 7 days
  - Keeps 500 recent events
  - Logs: "Cleaned up 500 old click events"

### Scenario 6: Privacy validation
- **Given**: click_events table has 100 events
- **When**: Admin queries table
- **Then**:
  - No raw query text visible (only hash)
  - No result content visible (only UUID)
  - No IP address or user agent
  - Can join with received_cards to get result details (if needed)

## Implementation Checklist

### Backend (3 hours)
- [ ] Migration 0047: click_events table (30 min)
- [ ] API handler: POST /api/user/analytics/click (1h)
- [ ] Rate limiting: 100 clicks/hour per user (30 min)
- [ ] Cron job: cleanup-click-events.ts (30 min)
- [ ] Wrangler config: Schedule cron (15 min)
- [ ] Testing: Manual API test (15 min)

### Frontend (2 hours)
- [ ] Add trackResultClick() function (30 min)
- [ ] Attach click listeners to result cards (30 min)
- [ ] Pass query_hash from search response (30 min)
- [ ] Testing: Verify clicks logged (30 min)

### Validation (1 hour)
- [ ] Deploy to staging (15 min)
- [ ] Manual test: Search + click (15 min)
- [ ] Verify click_events table (15 min)
- [ ] Run cron manually (15 min)

## Acceptance Criteria

### Functional
- ✅ Click events logged to D1
- ✅ Non-blocking (doesn't slow down UI)
- ✅ Rate limited (100/hour per user)
- ✅ Cron cleanup works (7-day retention)

### Privacy
- ✅ No raw query text stored
- ✅ No result content stored
- ✅ No IP address or user agent
- ✅ 7-day retention enforced

### Performance
- ✅ API latency < 50ms (non-blocking)
- ✅ Frontend overhead < 5ms
- ✅ No impact on search latency

### Observability
- ✅ Logs: Click event created
- ✅ Logs: Cron cleanup count
- ✅ Metrics: Click-through rate (CTR)

## Success Metrics

### Gate for Phase 3.1
- **Target**: 100+ clicks within 1 week
- **Measurement**: `SELECT COUNT(*) FROM click_events`
- **Validation**: CTR > 5% (industry baseline)

### CTR Calculation
```sql
SELECT 
  COUNT(DISTINCT query_hash) as total_queries,
  COUNT(*) as total_clicks,
  ROUND(COUNT(*) * 100.0 / COUNT(DISTINCT query_hash), 2) as ctr_percent
FROM click_events
WHERE timestamp > ?  -- Last 7 days
```

## Future Enhancements (Phase 3.1+)

### Dwell Time Tracking
- Track time spent on result page
- Requires frontend instrumentation (page visibility API)
- Indicates result quality (longer = better)

### Click Position Analysis
- Which ranks get clicked most?
- Validates search quality (top results should be clicked)

### Query Refinement Tracking
- Did user refine query after clicking?
- Indicates result didn't satisfy intent

## Notes

- **Fire-and-forget**: Frontend doesn't wait for API response
- **Privacy-first**: Only UUIDs and hashes, no content
- **Non-blocking**: Uses ctx.waitUntil for D1 writes
- **Rate limited**: Prevents abuse (100/hour per user)
- **7-day retention**: Balances analytics needs with privacy
