# BDD Spec: P1 - Intent Analysis + Rule-Based Routing (Risk-Reduced)

## Problem Statement
Current search is fixed-pipeline (semantic + keyword → RRF). Need minimal agent capability:
- Understand user intent
- Route to appropriate tools
- Maintain stability & backward compatibility

## Design Principles
1. **Stability First**: No degradation in recall/precision
2. **Graceful Degradation**: AI failure → fallback to hybrid search
3. **Observable**: Comprehensive metrics for validation
4. **Gradual Rollout**: Shadow mode → Feature flag → Full deployment

## Solution Design (8 Key Adjustments)

### Adjustment 1: Layered SLO
**Given**: Search request with/without AI intent analysis
**When**: Measuring latency
**Then**:
- **With AI** (ENABLE_AGENT_SEARCH=true): p95 < 500ms
- **Without AI** (ENABLE_AGENT_SEARCH=false): p95 < 200ms
- **Rationale**: Cross-network Gemini call cannot reliably hit 200ms

### Adjustment 2: Relationship Routing (No New Tools)
**Given**: Intent = `relationship`
**When**: Selecting tools
**Then**:
- Tools = `["keyword", "semantic"]` (existing)
- Enrich with `related_contacts` (existing enrichSearchResult)
- **Defer**: graphSearch() to P2 (avoid scope creep)

### Adjustment 3: Confidence Gate
**Given**: Intent analysis returns confidence < 0.7
**When**: Routing decision
**Then**:
- Override intent to `explore`
- Use hybrid search (semantic + keyword)
- Log: `intent_overridden_low_confidence`
- **Rationale**: Prevent misclassification from reducing recall

### Adjustment 4: Intent Cache
**Given**: Same user + normalized query within 5-15 minutes
**When**: Intent analysis requested
**Then**:
- Check KV cache: `intent_cache:{user_email}:{normalized_query_hash}`
- TTL: 600s (10 minutes, configurable)
- Cache hit → skip Gemini call (save cost & latency)
- Cache miss → call Gemini + store result

### Adjustment 5: Two-Layer Feature Flags
**Given**: Deployment environment
**When**: Configuring agent behavior
**Then**:
- **Flag 1**: `ENABLE_AGENT_SEARCH` (routing decision)
  - `false`: Use hybrid search (baseline)
  - `true`: Use agent routing
- **Flag 2**: `ENABLE_AGENT_META` (response metadata)
  - `false`: Omit `meta` field (backward compatible)
  - `true`: Include `meta.intent`, `meta.tools_used`, etc.
- **Rationale**: Independent control for gradual rollout & fast rollback

### Adjustment 6: Shadow Mode (3-7 Days Observation)
**Given**: Shadow mode enabled (`AGENT_SHADOW_MODE=true`)
**When**: Search request
**Then**:
- Execute intent analysis in background (ctx.waitUntil)
- **Do NOT** change search results (use hybrid search)
- Log telemetry:
  - `predicted_intent`
  - `selected_tools`
  - `confidence`
  - `analysis_latency_ms`
  - `would_have_changed_results` (boolean)
- **Rationale**: Zero-risk validation before affecting users

### Adjustment 7: Comprehensive Metrics
**Given**: Agent search in production
**When**: Monitoring performance
**Then**: Track 6 key metrics:
1. **Intent Accuracy**: Manual validation on sample queries
2. **Search Success Rate**: % of queries with results > 0
3. **Zero Result Rate**: % of queries with 0 results
4. **Fallback Rate**: % of queries using fallback (AI failure)
5. **AI Timeout Rate**: % of Gemini calls exceeding 2s
6. **p95 Latency**: 95th percentile response time

### Adjustment 8: Non-Degradation Acceptance
**Given**: ENABLE_AGENT_SEARCH=true
**When**: Comparing agent vs baseline (hybrid)
**Then**:
- **Result Count**: Agent results ≥ 90% of baseline (±10% tolerance)
- **Top-3 Overlap**: At least 2/3 top results match baseline
- **Zero Result Rate**: Not increase by > 5%
- **Rationale**: Ensure agent doesn't harm recall

## Implementation Plan

### Phase 1: Intent Analyzer (2-3 hours)
**File**: `src/handlers/user/received-cards/intent-analyzer.ts`

```typescript
interface IntentAnalysisResult {
  intent: 'exact_match' | 'explore' | 'relationship';
  entities: {
    person?: string;
    organization?: string;
    title?: string;
    location?: string;
  };
  confidence: number;
  cached: boolean;
  latency_ms: number;
}

async function analyzeIntent(
  query: string,
  userEmail: string,
  env: Env
): Promise<IntentAnalysisResult>
```

**Features**:
- Gemini Structured Output (JSON Schema)
- KV cache: 10 min TTL
- Timeout: 2s (fast fail)
- Fallback: `{ intent: "explore", confidence: 0.5 }`

---

### Phase 2: Tool Router (1-2 hours)
**File**: `src/handlers/user/received-cards/search.ts` (modify)

```typescript
function selectTools(intent: string, confidence: number): string[] {
  // Confidence gate
  if (confidence < 0.7) {
    return ['semantic', 'keyword']; // explore fallback
  }
  
  const toolMap = {
    exact_match: ['keyword'],
    explore: ['semantic', 'keyword'],
    relationship: ['keyword', 'semantic'] // No new graphSearch
  };
  return toolMap[intent] || ['semantic', 'keyword'];
}
```

---

### Phase 3: Shadow Mode (1 hour)
**File**: `src/handlers/user/received-cards/search.ts` (modify)

```typescript
export async function searchCards(request: Request, env: Env) {
  // ... existing code ...
  
  const shadowMode = env.AGENT_SHADOW_MODE === 'true';
  
  if (shadowMode) {
    // Non-blocking intent analysis
    ctx.waitUntil(
      analyzeIntent(query, userEmail, env)
        .then(result => logShadowTelemetry(env, query, result))
        .catch(err => console.warn('[shadow] intent analysis failed', err))
    );
    // Use baseline hybrid search
    return hybridSearch(env, userEmail, query, limit);
  }
  
  // Normal agent mode (after shadow validation)
  const useAgent = env.ENABLE_AGENT_SEARCH === 'true';
  // ...
}
```

---

### Phase 4: Metrics & Monitoring (1 hour)
**File**: `src/utils/agent-metrics.ts` (new)

```typescript
interface AgentMetrics {
  timestamp: number;
  query_hash: string; // SHA256(normalized_query)
  intent: string;
  confidence: number;
  tools_used: string[];
  result_count: number;
  latency_ms: number;
  fallback_used: boolean;
  ai_timeout: boolean;
}

async function logAgentMetrics(env: Env, metrics: AgentMetrics) {
  // Store in D1 for analysis (30-day TTL)
  await env.DB.prepare(`
    INSERT INTO agent_search_metrics (...)
    VALUES (...)
  `).bind(...).run();
}
```

**Migration**: `0043_agent_search_metrics.sql`

---

## Feature Flag Configuration

### Staging (Initial)
```toml
[env.staging.vars]
AGENT_SHADOW_MODE = "true"          # Shadow mode: observe only
ENABLE_AGENT_SEARCH = "false"       # Not routing yet
ENABLE_AGENT_META = "false"         # Not exposing meta
```

### Staging (After 3-7 days validation)
```toml
[env.staging.vars]
AGENT_SHADOW_MODE = "false"         # Exit shadow mode
ENABLE_AGENT_SEARCH = "true"        # Enable routing
ENABLE_AGENT_META = "true"          # Expose meta for debugging
```

### Production (Gradual rollout)
```toml
[env.production.vars]
AGENT_SHADOW_MODE = "false"
ENABLE_AGENT_SEARCH = "false"       # Start with false
ENABLE_AGENT_META = "false"         # Start with false
```

---

## Acceptance Criteria (Enhanced)

### Functional (5)
1. ✅ Intent analysis correctly classifies 3 types (accuracy > 80%)
2. ✅ Confidence gate works (< 0.7 → explore fallback)
3. ✅ KV cache reduces Gemini calls (hit rate > 30%)
4. ✅ Shadow mode logs telemetry without affecting results
5. ✅ Feature flags independently control routing & meta

### Performance (3)
6. ✅ With AI: p95 latency < 500ms
7. ✅ Without AI: p95 latency < 200ms (unchanged)
8. ✅ Cache hit: latency < 50ms

### Reliability (5)
9. ✅ Gemini timeout → fallback to hybrid (no user impact)
10. ✅ AI failure rate < 5%
11. ✅ Fallback rate logged and monitored
12. ✅ Zero result rate not increase > 5%
13. ✅ Result count ≥ 90% of baseline

### Observability (3)
14. ✅ 6 metrics tracked: accuracy, success rate, zero result, fallback, timeout, latency
15. ✅ Shadow mode telemetry complete (intent, tools, latency)
16. ✅ Metrics stored in D1 with 30-day TTL

### Compatibility (2)
17. ✅ API response backward compatible (meta optional)
18. ✅ Existing frontend works without changes

---

## Testing Strategy

### Unit Tests
- `intent-analyzer.ts`: Mock Gemini responses
- `selectTools()`: Confidence gate logic
- Cache hit/miss scenarios

### Integration Tests
- End-to-end agent search flow
- Shadow mode telemetry logging
- Feature flag combinations

### Shadow Mode Validation (3-7 days)
- Sample 100 queries manually
- Compare predicted intent vs actual user behavior (click-through)
- Validate confidence scores distribution

### A/B Test (Optional, P2)
- 10% traffic → agent search
- 90% traffic → hybrid search
- Compare: result count, zero result rate, CTR

---

## Rollout Plan

### Week 1: Shadow Mode (Staging)
- Deploy with `AGENT_SHADOW_MODE=true`
- Collect 1000+ queries telemetry
- Validate intent accuracy > 80%

### Week 2: Agent Routing (Staging)
- Enable `ENABLE_AGENT_SEARCH=true`
- Monitor 6 metrics for 3 days
- Confirm no degradation (±10% result count)

### Week 3: Production Shadow
- Deploy to production with shadow mode
- Collect 10,000+ queries telemetry
- Final validation before routing

### Week 4: Production Gradual Rollout
- Day 1-2: 10% traffic (feature flag or A/B)
- Day 3-4: 50% traffic
- Day 5-7: 100% traffic (if metrics pass)

---

## Rollback Plan

### Fast Rollback (< 5 minutes)
```bash
# Disable agent routing immediately
wrangler secret put ENABLE_AGENT_SEARCH --env production
# Enter: false

# Verify
curl https://api/health | jq '.agent_enabled'
```

### Metrics Triggers for Rollback
- Zero result rate increase > 10%
- p95 latency > 600ms
- Fallback rate > 20%
- Search success rate drop > 5%

---

## Files to Create/Modify

### New Files
- `src/handlers/user/received-cards/intent-analyzer.ts` (Intent analysis)
- `src/utils/agent-metrics.ts` (Metrics logging)
- `migrations/0043_agent_search_metrics.sql` (Metrics table)

### Modified Files
- `src/handlers/user/received-cards/search.ts` (Agent routing)
- `src/types.ts` (Add env vars)
- `wrangler.toml` (Feature flags)

### Documentation
- `docs/agent-search-p1.md` (Architecture)
- `docs/agent-metrics.md` (Metrics guide)

---

## Success Metrics (30 Days Post-Rollout)

### Primary
- Intent accuracy: > 80%
- Search success rate: ≥ baseline
- Zero result rate: ≤ baseline + 5%

### Secondary
- Cache hit rate: > 30%
- Fallback rate: < 10%
- p95 latency: < 500ms (with AI)

### Cost
- Gemini API calls: Reduced by 30% (due to cache)
- D1 queries: No significant increase

---

## Risk Mitigation Summary

| Risk | Mitigation | Validation |
|:---|:---|:---|
| AI延遲過高 | 分層 SLO (500ms) + 快取 | Shadow mode 觀察 |
| 誤分類降低召回 | Confidence gate (0.7) | ±10% 結果數驗收 |
| Scope 膨脹 | 不新增 graphSearch | P1 只用現有工具 |
| 成本爆炸 | KV 快取 (10 min) | 監控 cache hit rate |
| 灰度困難 | 雙層 feature flag | 獨立控制路由與 meta |
| 未知風險 | Shadow mode (3-7 天) | 零風險觀察 |
| 監控盲區 | 6 個關鍵指標 | D1 metrics table |
| 召回退化 | 不退化驗收 (±10%) | 自動化測試 |

---

## Next Steps

1. ✅ Review & approve this spec
2. 🚀 Implement Phase 1: Intent Analyzer (2-3 hours)
3. 🚀 Implement Phase 2: Tool Router (1-2 hours)
4. 🚀 Implement Phase 3: Shadow Mode (1 hour)
5. 🚀 Implement Phase 4: Metrics (1 hour)
6. 🧪 Deploy to staging with shadow mode
7. 📊 Collect 3-7 days telemetry
8. ✅ Validate & enable agent routing

**Total Estimated Time**: 6-8 hours implementation + 3-7 days validation
