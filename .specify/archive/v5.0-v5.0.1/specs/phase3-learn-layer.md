# BDD Spec: Phase 3 - Learn Layer (Preference Provider)

## Context
Phase 2 完成了 Sense → Think → Act → Remember 四層架構。Phase 3 加入第五層 **Learn**，但定位為 **Preference Provider**，只影響 planning，不直接改排序。

## Architecture Principle: Stable Boundaries

### Phase 2 (Current)
```
Request → Sense → Think → Act → Remember → Response
                              ↓
                        query_events (log only)
```

### Phase 3 (Target) - Learn as Planning Hint Provider
```
Request → Sense (load profile) → Think (adjust plan) → Act (base search) → Remember → Response
            ↑                                                                    ↓
            └────────────────────── Learn (offline aggregate) ─────────────────┘
                                            ↓
                                    user_profile (stable)
                                    recent_context (ephemeral)
```

**Key Constraint**: Learn 只回饋到下一次 planning，不污染當次排序。

## Design Principles (Revised)

### 1. Learn as Preference Provider (Not Ranker)
- **Pattern**: Provide planning hints, don't touch scores
- **Implementation**: Think layer adjusts tool order, timeout, hybrid threshold
- **Rationale**: Easier to debug, rollback, and validate

### 2. Signal Quality First
- **Pattern**: No personalization without high-quality feedback
- **Implementation**: Require click_events before enabling personalization
- **Rationale**: Query frequency ≠ preference (often反覆查 = 沒找到)

### 3. Privacy-First (Strict)
- **Pattern**: No retained user content in preferences
- **Implementation**: 
  - ❌ No `recent_queries` (normalized query is still readable)
  - ✅ Only `recent_query_features` (type, category, time_bucket)
  - ✅ Aggregated signals only (top categories, not specific queries)

### 4. Stable vs Ephemeral Separation
- **Pattern**: Separate long-term profile from short-term context
- **Implementation**:
  - `user_profile`: Stable (30-day aggregation, tool success rate)
  - `recent_context`: Ephemeral (last 10 sessions, intent distribution)

### 5. Shadow Mode First
- **Pattern**: Validate before applying
- **Implementation**: Return `would_personalize: true/false` + reason, don't change results
- **Rationale**: Measure impact before committing

## Phase 3 Roadmap (Revised)

### Phase 3.0: Click Tracking Foundation (Week 1, 6h)
**Prerequisite**: Must have high-quality feedback before personalization

#### click_events Table
```sql
CREATE TABLE click_events (
  event_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  query_hash TEXT NOT NULL,
  result_uuid TEXT NOT NULL,
  result_rank INTEGER,           -- Position in search results (1-based)
  dwell_time_ms INTEGER,         -- Time spent on result (if tracked)
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_click_events_user ON click_events(user_email, timestamp DESC);
CREATE INDEX idx_click_events_query ON click_events(query_hash);
```

#### Frontend Instrumentation
```javascript
// user-portal.html: Track result clicks
function trackResultClick(resultUuid, rank) {
  fetch('/api/user/analytics/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_hash: currentQueryHash,  // From search response
      result_uuid: resultUuid,
      result_rank: rank,
      timestamp: Date.now()
    })
  }).catch(() => {});  // Fire-and-forget
}
```

**Acceptance**: 
- ✅ Click events logged (non-blocking)
- ✅ 7-day retention (auto-cleanup cron)
- ✅ No PII in events (only UUIDs and hashes)

---

### Phase 3.1: Learn Layer (Preference Provider Only) (Week 2, 8h)
#### user_profile Table (Stable, 30-day aggregation)
```sql
CREATE TABLE user_profile (
  user_email TEXT PRIMARY KEY,
  
  -- Category-level signals (NOT specific queries)
  top_org_categories TEXT,      -- JSON: ["政府", "資安", "科技"] (from tags)
  query_type_dist TEXT,          -- JSON: {"person": 0.3, "company": 0.5, "mixed": 0.2}
  
  -- Tool effectiveness (which tools work for this user)
  tool_success_rate TEXT,        -- JSON: {"semantic": 0.8, "keyword": 0.6, "hybrid": 0.9}
  avg_result_rank_clicked REAL,  -- Average rank of clicked results (lower = better)
  
  -- Behavioral patterns
  avg_query_length REAL,
  prefers_diversity BOOLEAN,     -- Clicks diverse results vs same org
  
  -- Metadata
  total_queries INTEGER,
  total_clicks INTEGER,
  last_updated INTEGER,
  created_at INTEGER
);
```

#### recent_context Table (Ephemeral, last 10 sessions)
```sql
CREATE TABLE recent_context (
  context_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  
  -- Session features (NOT readable queries)
  query_type TEXT,               -- person/company/mixed
  intent TEXT,                   -- exact_match/explore/relationship
  tools_used TEXT,               -- JSON: ["semantic", "keyword"]
  result_count INTEGER,
  clicked BOOLEAN,               -- Did user click any result?
  clicked_rank INTEGER,          -- If clicked, which rank?
  
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_recent_context_user ON recent_context(user_email, timestamp DESC);
```

**Key Changes from Original Spec**:
1. ❌ Removed `recent_queries` (privacy violation)
2. ❌ Removed `top_organizations`, `top_people` (weak signals)
3. ✅ Added `tool_success_rate` (which tools lead to clicks)
4. ✅ Added `avg_result_rank_clicked` (quality metric)
5. ✅ Separated stable profile from ephemeral context

### 5.2 Learn Layer Implementation

#### File: `src/agents/search/learn.ts`
```typescript
export class LearnLayer {
  constructor(private env: Env) {}

  /**
   * Load user preferences (cached in KV for 1 hour)
   * Returns null for new users (cold start)
   */
  async loadPreferences(userEmail: string): Promise<UserPreferences | null> {
    const cacheKey = `user_prefs:${userEmail}`;
    
    // Check KV cache
    const cached = await this.env.KV.get(cacheKey, 'json');
    if (cached) return cached as UserPreferences;
    
    // Query D1
    const row = await this.env.DB.prepare(
      'SELECT * FROM user_preferences WHERE user_email = ?'
    ).bind(userEmail).first();
    
    if (!row) return null;  // Cold start
    
    const prefs: UserPreferences = {
      topOrganizations: JSON.parse(row.top_organizations || '[]'),
      topPeople: JSON.parse(row.top_people || '[]'),
      topTags: JSON.parse(row.top_tags || '[]'),
      recentQueries: JSON.parse(row.recent_queries || '[]'),
      diversityScore: row.diversity_score || 0.5,
      totalQueries: row.total_queries || 0,
      lastUpdated: row.last_updated || 0,
    };
    
    // Cache for 1 hour
    await this.env.KV.put(cacheKey, JSON.stringify(prefs), { expirationTtl: 3600 });
    
    return prefs;
  }
}
```

### 5.3 Integration Points

#### 5.3.1 Sense Layer Enhancement
```typescript
// src/agents/search/sense.ts
interface SenseContext {
  // ... existing fields
  userPreferences: UserPreferences | null;  // NEW
}

export class SenseLayer {
  constructor(
    private env: Env,
    private learn: LearnLayer  // NEW: inject Learn layer
  ) {}

  async perceive(request: SearchRequest): Promise<SenseContext> {
    // ... existing logic
    
    // Load user preferences (non-blocking if fails)
    const userPreferences = await this.learn.loadPreferences(request.userEmail)
      .catch(() => null);
    
    return {
      // ... existing fields
      userPreferences,
    };
  }
}
```

### 3.1.2 Think Layer Integration (Planning Hints Only)

```typescript
// src/agents/search/planner.ts
export class Planner {
  async plan(context: SenseContext): Promise<SearchPlan> {
    const intentResult = await analyzeIntent(context.query, context.userEmail, this.env);
    
    // Base tool selection (Phase 2 logic)
    const baseTools = selectTools(intentResult.intent, intentResult.confidence);
    
    // Apply planning hints from Learn layer (if available)
    const adjustedTools = this.applyPlanningHints(
      baseTools,
      intentResult,
      context.userProfile,      // Stable profile
      context.recentContext     // Ephemeral context
    );
    
    return this.buildPlanFromIntent(intentResult, adjustedTools);
  }

  private applyPlanningHints(
    baseTools: string[],
    intent: IntentAnalysisResult,
    profile: UserProfile | null,
    context: RecentContext | null
  ): string[] {
    if (!profile || !context) return baseTools;  // Cold start
    
    // Hint 1: Tool order based on success rate
    // If semantic has 90% success rate, put it first
    if (profile.tool_success_rate.semantic > 0.85 && baseTools.includes('semantic')) {
      return ['semantic', ...baseTools.filter(t => t !== 'semantic')];
    }
    
    // Hint 2: Force hybrid for low-confidence + diverse users
    // (NOT for high-confidence exact_match - respect user intent)
    if (intent.confidence < 0.7 && profile.prefers_diversity) {
      return ['semantic', 'keyword'];  // Hybrid
    }
    
    // Hint 3: Adjust timeout based on user patience
    // (Not implemented in this phase, but shows the pattern)
    
    return baseTools;  // No adjustment
  }
}
```

**Key Changes**:
1. ✅ Only adjusts tool order and selection
2. ✅ Respects high-confidence intent (no override for exact_match)
3. ✅ Uses tool_success_rate (high-quality signal)
4. ❌ Does NOT touch ranking scores

### 3.1.3 Act Layer (NO Changes in Phase 3.1)

**Critical Decision**: Act layer does NOT apply personalization in Phase 3.1.

**Rationale**:
1. Ranking score space is inconsistent (semantic raw score vs keyword 1.0 vs RRF small values)
2. Additive boost (+0.2) would破壞 RRF balance
3. Need to validate planning hints first before touching ranking

**Future (Phase 3.2+)**: If planning hints prove effective, consider:
- Soft rerank in normalized rank space: `final = base_rank * 0.9 + pref_score * 0.1`
- Second-level sort key (tie-breaker)
- LTR model trained on click data

---

### 3.1.4 Shadow Personalization Mode

```typescript
// src/agents/search/agent.ts
async run(request: SearchRequest): Promise<SearchResponse> {
  // ... existing Sense → Think → Act → Remember
  
  // Shadow personalization: log what would change, don't apply
  if (context.userProfile && env.ENABLE_SHADOW_PERSONALIZATION) {
    const shadowPlan = this.planner.applyPlanningHints(
      plan.tools,
      plan,
      context.userProfile,
      context.recentContext
    );
    
    const wouldPersonalize = JSON.stringify(shadowPlan) !== JSON.stringify(plan.tools);
    
    if (wouldPersonalize) {
      console.log('[Shadow] Would personalize:', {
        original_tools: plan.tools,
        personalized_tools: shadowPlan,
        reason: this.explainPersonalization(context.userProfile)
      });
    }
    
    // Add to meta (for analysis)
    meta.shadow_personalization = {
      would_apply: wouldPersonalize,
      original_tools: plan.tools,
      suggested_tools: shadowPlan
    };
  }
  
  return { results, meta };
}
```

**Acceptance**:
- ✅ Logs personalization decisions without applying
- ✅ Measures potential impact (% of queries affected)
- ✅ Validates profile loading performance

### 5.4 Background Aggregation (Cron Job)

#### File: `src/cron/aggregate-preferences.ts`
```typescript
/**
 * Daily cron job: Aggregate query_events → user_preferences
 * Runs at 03:00 UTC (11:00 Taiwan time)
 */
export async function aggregateUserPreferences(env: Env): Promise<void> {
  const users = await env.DB.prepare(`
    SELECT DISTINCT user_email FROM query_events
    WHERE timestamp > ?
  `).bind(Date.now() - 30 * 86400000).all();  // Last 30 days

  for (const { user_email } of users.results) {
    await aggregateForUser(env, user_email as string);
  }
}

async function aggregateForUser(env: Env, userEmail: string): Promise<void> {
  // 1. Extract top organizations (from normalized_query)
  const topOrgs = await env.DB.prepare(`
    SELECT normalized_query, COUNT(*) as freq
    FROM query_events
    WHERE user_email = ?
      AND timestamp > ?
      AND query_type = 'company'
    GROUP BY normalized_query
    ORDER BY freq DESC
    LIMIT 5
  `).bind(userEmail, Date.now() - 30 * 86400000).all();

  // 2. Calculate diversity score (unique queries / total queries)
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT query_hash) as unique_count
    FROM query_events
    WHERE user_email = ?
      AND timestamp > ?
  `).bind(userEmail, Date.now() - 30 * 86400000).first();

  const diversityScore = stats.unique_count / stats.total;

  // 3. Get recent queries
  const recent = await env.DB.prepare(`
    SELECT normalized_query
    FROM query_events
    WHERE user_email = ?
    ORDER BY timestamp DESC
    LIMIT 10
  `).bind(userEmail).all();

  // 4. Upsert user_preferences
  await env.DB.prepare(`
    INSERT INTO user_preferences (
      user_email, top_organizations, top_people, top_tags,
      recent_queries, diversity_score, total_queries, last_updated, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_email) DO UPDATE SET
      top_organizations = excluded.top_organizations,
      recent_queries = excluded.recent_queries,
      diversity_score = excluded.diversity_score,
      total_queries = excluded.total_queries,
      last_updated = excluded.last_updated
  `).bind(
    userEmail,
    JSON.stringify(topOrgs.results.map(r => r.normalized_query)),
    JSON.stringify([]),  // TODO: extract from result clicks
    JSON.stringify([]),  // TODO: extract from result clicks
    JSON.stringify(recent.results.map(r => r.normalized_query)),
    diversityScore,
    stats.total,
    Date.now(),
    Date.now()
  ).run();

  // 5. Invalidate KV cache
  await env.KV.delete(`user_prefs:${userEmail}`);
}
```

## Scenarios

### Scenario 1: Cold Start (New User)
- **Given**: User has no query_events history
- **When**: Search request arrives
- **Then**: 
  - Learn.loadPreferences() returns null
  - Sense/Think/Act use default behavior (Phase 2)
  - No personalization applied

### Scenario 2: Warm Start (Existing User)
- **Given**: User has 50+ queries in last 30 days
- **When**: Search "智慧"
- **Then**:
  - Learn loads preferences (cached in KV)
  - Think personalizes tool selection
  - Act boosts frequently searched organizations
  - Results show "奧義智慧" higher (if user searched it often)

### Scenario 3: High Diversity User
- **Given**: User has diversity_score > 0.7 (explores widely)
- **When**: Intent = "exact_match"
- **Then**:
  - Think overrides to hybrid search (semantic + keyword)
  - Ensures diverse results even for focused queries

### Scenario 4: Preference Cache Hit
- **Given**: User preferences cached in KV
- **When**: Multiple searches within 1 hour
- **Then**:
  - No D1 queries (KV cache hit)
  - Latency < 5ms for preference loading

### Scenario 5: Background Aggregation
- **Given**: Cron job runs at 03:00 UTC
- **When**: Processing user with 100 queries
- **Then**:
  - Extracts top 5 organizations
  - Calculates diversity score
  - Updates user_preferences table
  - Invalidates KV cache

## Implementation Plan (Revised)

### Phase 3.0: Click Tracking (Week 1, 6h) - PREREQUISITE
1. Migration 0047: click_events table (30 min)
2. Backend API: POST /api/user/analytics/click (1h)
3. Frontend: Track result clicks (2h)
4. Cron: 7-day retention cleanup (30 min)
5. Testing: Verify click logging (1h)
6. Monitoring: Click-through rate dashboard (1h)

**Gate**: Must have 100+ clicks before Phase 3.1

---

### Phase 3.1: Learn Layer (Week 2-3, 12h)
1. Migration 0048: user_profile table (30 min)
2. Migration 0049: recent_context table (30 min)
3. Learn Layer: loadProfile() with KV cache (2h)
4. Sense Integration: Inject profile into context (1h)
5. Think Integration: applyPlanningHints() (3h)
6. Shadow Mode: Log without applying (2h)
7. Cron: Aggregate profile from click_events (3h)
8. Testing: Manual test with mock profile (1h)

**Gate**: Shadow mode shows <5% queries affected, <10ms latency

---

### Phase 3.2: Canary Rollout (Week 4, 4h)
1. Feature flag: ENABLE_PERSONALIZATION (10% users) (1h)
2. Metrics: Compare personalized vs baseline (2h)
3. User feedback: Survey 10 users (1h)

**Gate**: No degradation in CTR, latency, or user satisfaction

---

### Phase 3.3: Soft Rerank (Week 5-6, 8h) - OPTIONAL
Only if Phase 3.1-3.2 prove effective:
1. Normalize rank space (all scores → 0-1) (2h)
2. Implement soft rerank: `final = base * 0.9 + pref * 0.1` (3h)
3. A/B test: Measure CTR improvement (2h)
4. Iterate on weights (1h)

**Total**: 30 hours (vs original 18 hours, but much more stable)

## Acceptance Criteria

### Functional
- ✅ Cold start users: No errors, default behavior
- ✅ Warm start users: Preferences loaded, personalization applied
- ✅ KV cache: Hit rate > 80% (1 hour TTL)
- ✅ Cron job: Runs daily, aggregates all active users
- ✅ Graceful degradation: Preference loading failure → default behavior

### Performance
- ✅ Preference loading: < 10ms (KV cache hit)
- ✅ Preference loading: < 50ms (D1 query)
- ✅ Personalization overhead: < 5ms (ranking boost)
- ✅ Total latency increase: < 10% vs Phase 2

### Privacy
- ✅ No raw queries stored (only query_hash)
- ✅ Aggregated signals only (no individual query tracking)
- ✅ User can delete preferences (GDPR compliance)
- ✅ No cross-user data sharing

### Observability
- ✅ Meta includes: personalization_applied (boolean)
- ✅ Meta includes: preference_source (cache/db/null)
- ✅ Meta includes: boost_applied (number)
- ✅ Logs: Preference loading errors, aggregation stats

## Rollout Strategy

### Phase 3.1: Shadow Mode (Week 1)
- Load preferences but don't apply personalization
- Log what would have changed
- Validate preference loading performance

### Phase 3.2: Canary (Week 2)
- Enable for 10% of users (feature flag)
- Monitor metrics: CTR, latency, error rate
- Collect user feedback

### Phase 3.3: Full Rollout (Week 3)
- Enable for 100% of users
- Monitor for 1 week
- Iterate on boost weights

## Future Enhancements (Phase 4+)

### 4.1 Click-Through Tracking
- Track which results users click
- Use CTR as ranking signal
- Requires frontend instrumentation

### 4.2 Collaborative Filtering
- "Users who searched X also searched Y"
- Requires cross-user aggregation (privacy-preserving)

### 4.3 LLM-based Preference Extraction
- Use Gemini to extract intent from query patterns
- Generate natural language user profiles
- "User is interested in cybersecurity and government tech"

### 4.4 Real-time Learning
- Update preferences immediately after each query
- No need to wait for daily cron
- Requires more complex cache invalidation

## Notes

- **Privacy-first**: All aggregation happens server-side, no client tracking
- **Graceful degradation**: System works without personalization
- **Incremental rollout**: Shadow → Canary → Full
- **Measurable impact**: Track CTR, latency, user satisfaction
- **2026 AI Agent Pattern**: Reflection loop (Remember → Learn → Think)
