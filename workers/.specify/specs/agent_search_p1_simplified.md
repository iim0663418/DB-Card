# P1 Implementation: Intent Analyzer + Rule-Based Routing (Simplified)

## Deployment Strategy: Staging Direct Productization (No Gradual Rollout)

### Timeline
- Week 1: Implementation (6-8h) + Shadow Mode (3 days)
- Week 2: Staging Agent Enabled (validation)
- Week 3: Production Deployment (direct, no gradual rollout)

### Feature Flags (Simplified)
```toml
# Staging: Always show meta for debugging
AGENT_SHADOW_MODE = "true" → "false"
ENABLE_AGENT_SEARCH = "false" → "true"
ENABLE_AGENT_META = "true" (always)

# Production: Hide meta by default
ENABLE_AGENT_SEARCH = "true"
ENABLE_AGENT_META = "false"
```

## Implementation Phases

### Phase 1: Intent Analyzer (2-3 hours) - NOW
- File: `src/handlers/user/received-cards/intent-analyzer.ts`
- Gemini Structured Output (full version: classification + entity extraction)
- KV cache: 10 min TTL
- Timeout: 2s
- Fallback: explore intent

### Phase 2: Tool Router (1-2 hours)
- File: `src/handlers/user/received-cards/search.ts` (modify)
- Confidence gate: < 0.7 → explore
- Tool map: exact_match/explore/relationship

### Phase 3: Shadow Mode (1 hour)
- Non-blocking telemetry logging
- No impact on search results

### Phase 4: Metrics (1 hour)
- File: `src/utils/agent-metrics.ts`
- Migration: `0043_agent_search_metrics.sql`
- 6 key metrics tracking

## Acceptance Criteria (18 items from full spec)
- Functional: 5 ✅
- Performance: 3 ✅
- Reliability: 5 ✅
- Observability: 3 ✅
- Compatibility: 2 ✅

## Questions Answered
1. Start Phase 1 now: ✅ YES
2. Gemini prompt: ✅ Full version (classification + entities)
3. Shadow observation: ✅ 3 days (fast validation)
4. Migration indexes: ✅ timestamp + intent

---

Ready to implement Phase 1: Intent Analyzer.
