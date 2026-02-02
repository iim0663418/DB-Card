# KV Optimization Phase 1 - BDD Specification

## Feature: Remove Deduplication Layer & Simplify Rate Limiting
**Purpose**: Reduce KV write operations from 750/day to 200/day (73% reduction)
**Rationale**: Based on Cloudflare best practices and industry standards

---

## Part 1: Remove Deduplication Layer

### Background
- Current: 60s dedup check (1 read + 1 write per tap)
- Issue: Redundant with rate limiting, wastes 2 KV ops per tap
- Industry consensus: Dedup is unnecessary when rate limiting exists

### Scenario 1: Tap Without Dedup Check
- **Given**: User taps NFC card
- **When**: POST /api/nfc/tap is called
- **Then**: 
  - Skip dedup check entirely
  - Proceed directly to rate limiting
  - No `tap:dedup:${uuid}` KV operations
  - Create new session every time (rate limiting prevents abuse)

### Scenario 2: Rapid Repeated Taps (Protected by Rate Limiting)
- **Given**: User taps same card 3 times in 10 seconds
- **When**: Each tap calls POST /api/nfc/tap
- **Then**:
  - All 3 taps create separate sessions
  - Rate limiting (50/hour) still allows this
  - No dedup-related errors
  - User experience unchanged

---

## Part 2: Simplify Rate Limiting to Hour-Only

### Background
- Current: minute (10/min) + hour (50/hour) windows = 8 KV ops per tap
- Proposed: hour-only (50/hour) window = 4 KV ops per tap
- Industry standard: GitHub (5000/hour), Stripe (100/hour) use hour windows

### Scenario 3: Hour-Only Rate Limiting
- **Given**: Rate limiting is configured for hour-only windows
- **When**: User taps NFC card
- **Then**:
  - Check only 2 KV keys:
    1. `ratelimit:card:${uuid}:hour`
    2. `ratelimit:ip:${ip}:hour`
  - No minute window checks
  - Total: 2 reads + 2 writes = 4 KV ops (vs 8 previously)

### Scenario 4: Rate Limit Enforcement (Hour Window)
- **Given**: User has made 49 taps in the last hour
- **When**: User taps the 50th time
- **Then**: Request succeeds (within 50/hour limit)
- **When**: User taps the 51st time
- **Then**: 
  - Return 429 error
  - Error message: "請求過於頻繁，請稍後再試"
  - Include retry_after in response

### Scenario 5: Rate Limit Reset After 1 Hour
- **Given**: User hit 50/hour limit at 10:00 AM
- **When**: User taps again at 11:01 AM (>1 hour later)
- **Then**: 
  - Rate limit counter has decayed
  - Request succeeds
  - New sliding window starts

### Scenario 6: Different Cards, Same IP
- **Given**: User taps Card A 30 times, then Card B 30 times (same hour)
- **When**: Checking rate limits
- **Then**:
  - Card A: 30/50 (allowed)
  - Card B: 30/50 (allowed)
  - IP total: 60/60 (blocked on 61st request)

---

## Implementation Requirements

### Files to Modify

**1. handlers/tap.ts**
- Remove STEP 1 (Dedup Check)
- Update step numbering: STEP 2 → STEP 1, etc.
- Remove dedup KV operations

**2. utils/rate-limit.ts**
- Remove `RateLimitWindow.MINUTE` enum value
- Remove minute window logic from `checkRateLimit()`
- Update `RateLimitConfig` to only include hour limits
- Change limits:
  - Card UUID: 50/hour (remove 10/min)
  - IP: 60/hour (remove 10/min, increase from 50 to 60)

**3. types.ts**
- Remove dedup-related types (if any)
- Update `RateLimitWindow` enum

**4. .specify/specs/tap-dedup-ratelimit.md**
- Archive old spec
- Update to reflect new behavior

### Configuration Changes

**Before**:
```typescript
const RATE_LIMITS = {
  card_uuid: { minute: 10, hour: 50 },
  ip: { minute: 10, hour: 50 }
};
```

**After**:
```typescript
const RATE_LIMITS = {
  card_uuid: { hour: 50 },
  ip: { hour: 60 }
};
```

### Error Messages (Unchanged)
- 429 error: "請求過於頻繁，請稍後再試"
- Include `retry_after` in seconds

---

## Expected KV Savings

### Per Tap Operation
- **Before**: 
  - Dedup: 2 ops
  - Rate Limit: 8 ops (4 dimensions × 2 windows)
  - Total: 10 ops (5 reads + 5 writes)

- **After**:
  - Dedup: 0 ops
  - Rate Limit: 4 ops (2 dimensions × 1 window)
  - Total: 4 ops (2 reads + 2 writes)

- **Savings**: -6 ops per tap (-3 reads, -3 writes)

### Daily Usage (100 taps/day)
- **Before**: 500 writes/day
- **After**: 200 writes/day
- **Reduction**: 60% ✅

---

## Risk Assessment

### Low Risk Changes
- ✅ Remove dedup: Rate limiting provides sufficient protection
- ✅ Hour-only window: Industry standard, proven effective

### User Experience Impact
- ✅ No noticeable change for normal users
- ✅ Rapid repeated taps still prevented by rate limiting
- ✅ Error messages remain clear and actionable

### Security Impact
- ✅ Multi-layer defense still intact:
  - Layer 1: Rate Limiting (hour window)
  - Layer 2: Concurrent Read Limit (max_reads)
  - Layer 3: Session Budget (daily/monthly limits)

---

## Testing Requirements

### Unit Tests
- [ ] Rate limiting with hour-only window
- [ ] Sliding window counter accuracy
- [ ] Rate limit reset after 1 hour
- [ ] Different cards, same IP

### Integration Tests
- [ ] Normal tap flow (no dedup)
- [ ] Rapid repeated taps (rate limited)
- [ ] Rate limit error response (429)

### Performance Tests
- [ ] KV operations count (should be 4 per tap)
- [ ] Response time (should improve slightly)
