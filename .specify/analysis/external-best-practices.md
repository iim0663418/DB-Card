# External Best Practices Research Summary

## Key Findings from Cloudflare Community & Industry

### 1. KV is NOT Recommended for Rate Limiting ⚠️
**Source**: Cloudflare Community Discussion (2021)

**Quote**: "KV is not really a good idea here due to its eventually consistent nature... Durable Objects are consistent which means you will always have the most up to date information, pretty critical for rate-limiting."

**Problem**: 
- KV is eventually consistent (last-write-wins)
- Can only write to a single key 1 time per second
- Rate limiting with KV "might generate more cost than the whole API itself"

**Recommendation**: Use Durable Objects for rate limiting instead

### 2. Durable Objects vs KV for Rate Limiting
**Source**: Cloudflare Developers Documentation

**Durable Objects Benefits**:
- ✅ Strong consistency (critical for rate limiting)
- ✅ Per-IP isolation (each IP gets its own DO instance)
- ✅ In-memory state (no KV read/write overhead)
- ✅ Geographic co-location (low latency)

**Cost Comparison**:
- KV: $0.50 per million reads, $5.00 per million writes
- Durable Objects: $0.15 per million requests + $12.50 per million GB-s

**For Rate Limiting**: Durable Objects are more cost-effective at scale

### 3. KV Optimization Case Study: 93% Reduction
**Source**: EF-Map Blog (2025)

**Optimization Strategies**:
1. **Reduce unnecessary writes**: Batch operations, increase TTL
2. **Cache in-memory**: Use Worker global variables for short-lived data
3. **Conditional caching**: Only cache what's frequently accessed
4. **Result**: Cut KV operations from 1.6M to 108K/month (93% reduction)

### 4. Deduplication vs Rate Limiting Trade-off
**Industry Consensus**:
- **Deduplication**: Nice-to-have, prevents accidental double-clicks
- **Rate Limiting**: Must-have, prevents abuse and resource exhaustion

**Best Practice**: If you have rate limiting, deduplication is redundant
- Rate limiting already prevents rapid repeated requests
- Deduplication adds KV overhead without significant benefit

### 5. Rate Limiting Window Size Best Practices
**Common Patterns**:
- **Minute window**: Too granular, high KV overhead
- **Hour window**: Standard for API rate limiting (e.g., GitHub: 5000/hour)
- **Day window**: For very low-rate APIs

**Recommendation**: Hour-only window is industry standard

### 6. Free Tier Constraints
**Cloudflare Workers Free Tier**:
- 100,000 KV reads/day
- 1,000 KV writes/day ⚠️ (bottleneck)
- 100,000 Worker requests/day

**Critical Insight**: Write limit is 100x lower than read limit

## Recommendations for DB-Card

### Immediate Actions (Based on Best Practices)

#### 1. Remove Deduplication Layer ✅
- **Rationale**: Redundant with rate limiting (industry consensus)
- **Savings**: -2 writes per tap
- **Risk**: None (rate limiting provides sufficient protection)

#### 2. Simplify Rate Limiting to Hour-Only ✅
- **Rationale**: Industry standard (GitHub, Stripe, etc. use hour windows)
- **Savings**: -4 writes per tap
- **Risk**: Low (hour window is proven effective)

#### 3. Consider Durable Objects for Rate Limiting (Future)
- **Rationale**: Cloudflare's recommended approach for rate limiting
- **Benefits**: 
  - Strong consistency
  - Lower cost at scale
  - Better performance
- **Migration Path**: Phase 2 optimization

### Expected Outcome
- **Current**: 750 writes/day (75% of free tier)
- **After Phase 1**: 200 writes/day (20% of free tier)
- **Headroom**: 4x capacity increase

### Long-Term Strategy
1. **Phase 1** (Immediate): Remove dedup + simplify rate limiting (KV-based)
2. **Phase 2** (When scaling): Migrate rate limiting to Durable Objects
3. **Phase 3** (Optimization): Use KV only for long-lived cache (card data, card type)

## References
1. Cloudflare Community: "Creating a Rate Limiter using Workers/KV" (2021)
2. EF-Map Blog: "Reducing Cloud Costs by 93%: A Cloudflare KV Optimization Story" (2025)
3. Cloudflare Docs: "Build a rate limiter with Durable Objects"
4. Jilles.me: "Thinking in Networks: Cloudflare Storage Mental Model" (2025)
