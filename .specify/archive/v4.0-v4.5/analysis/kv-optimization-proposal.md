# KV Usage Optimization Proposal

## 🚨 Current Situation
- **Alert**: 50% of daily KV free tier limit used
- **Free Tier**: 100,000 reads + 1,000 writes per day
- **Bottleneck**: Write operations (1,000/day limit)

## 📊 Current KV Usage Per User Interaction

### NFC Tap (POST /api/nfc/tap)
1. **Dedup Check**: 1 read + 1 write = 2 ops
2. **Rate Limiting** (4 dimensions):
   - Card UUID minute: 1 read + 1 write
   - Card UUID hour: 1 read + 1 write
   - IP minute: 1 read + 1 write
   - IP hour: 1 read + 1 write
   - **Subtotal**: 4 reads + 4 writes = 8 ops
3. **Retap Cache**: 1 read + 1 write = 2 ops
4. **Card Type Cache**: 1 read + 0-1 write = 1-2 ops

**Tap Total**: 7-8 reads + 7-8 writes = **14-16 KV ops**

### Card Read (GET /api/read)
1. **Card Data Cache**: 1 read + 0-1 write = 1-2 ops

**Read Total**: 1-2 KV ops

### Per User Flow (Tap + Read)
- **Total**: 8-10 reads + 7-9 writes
- **Critical**: ~8 writes per user

## 💡 Optimization Strategies

### Option 1: Remove Dedup Layer (Quick Win) ⭐
**Impact**: -2 writes per tap
**Rationale**: 
- Dedup is redundant with rate limiting
- Rate limiting already prevents rapid repeated taps
- 60s dedup window is too short to be meaningful

**Risk**: Low (rate limiting provides sufficient protection)

### Option 2: Simplify Rate Limiting (High Impact) ⭐⭐
**Current**: minute + hour windows (4 KV keys)
**Proposed**: hour-only windows (2 KV keys)

**Impact**: -4 writes per tap
**Rationale**:
- Minute window is overly granular
- Hour window sufficient for abuse prevention
- Current limits: 10/min, 50/hour → Proposed: 50/hour only

**Risk**: Medium (less granular protection, but still effective)

### Option 3: Increase Cache TTLs (Moderate Impact)
**Current**: 
- Card Data: 60s
- Card Type: 86400s (already optimal)

**Proposed**:
- Card Data: 300s (5 minutes)

**Impact**: -0.8 writes per read (fewer cache misses)
**Risk**: Low (5min stale data acceptable)

### Option 4: Conditional Caching (Low Impact)
- Skip card type cache for sensitive cards (low volume)
- **Impact**: -0.3 writes per tap
- **Risk**: Very Low

## 🎯 Recommended Implementation

### Phase 1: Immediate (Target: 85% reduction)
1. ✅ **Remove Dedup Layer** (-2 writes/tap)
2. ✅ **Simplify Rate Limiting** to hour-only (-4 writes/tap)

**Total Savings**: 6 writes per tap
**New Usage**: 100 users/day × 2 writes = **200 writes/day**
**Headroom**: 80% remaining ✅

### Phase 2: If Needed (Target: 90% reduction)
3. ✅ **Increase Card Data Cache TTL** to 300s (-0.8 writes/read)

**Total Savings**: 6.8 writes per interaction
**New Usage**: **150 writes/day**
**Headroom**: 85% remaining ✅

## 📋 Implementation Checklist

### Step 1: Remove Dedup Layer
- [ ] Remove dedup check from `handlers/tap.ts`
- [ ] Update BDD spec `tap-dedup-ratelimit.md`
- [ ] Remove dedup-related types from `types.ts`

### Step 2: Simplify Rate Limiting
- [ ] Update `utils/rate-limit.ts` to remove minute windows
- [ ] Change limits from `10/min, 50/hour` to `50/hour` only
- [ ] Update error messages
- [ ] Update BDD spec

### Step 3: Increase Cache TTL (Optional)
- [ ] Update `handlers/read.ts` cache TTL from 60s to 300s
- [ ] Update backend cache spec

## 🔍 Monitoring Plan
After implementation:
- Monitor KV usage in Cloudflare dashboard
- Track error rates (ensure rate limiting still effective)
- Verify user experience unchanged

## 📈 Expected Outcome
- **Before**: ~750 writes/day (75% of limit)
- **After Phase 1**: ~200 writes/day (20% of limit)
- **Headroom**: 5x capacity increase (500 users/day → 2,500 users/day)
