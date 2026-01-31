# BDD Specification: Rate Limiting Migration to Durable Objects

**Feature**: Migrate Rate Limiting from KV to Durable Objects
**Version**: Phase 3 Complete Migration
**Date**: 2026-01-30

---

## Background

Current implementation uses Cloudflare Workers KV for rate limiting, which has fundamental issues:
- ❌ Eventually consistent (up to 60s propagation delay)
- ❌ Can be bypassed by attacking from different edge locations
- ❌ Write limit: 1 write/second per key
- ❌ Not suitable for counters (Cloudflare official guidance)

Durable Objects provide:
- ✅ Strong consistency
- ✅ <5ms latency
- ✅ 10x free tier (1M requests/day vs 100K writes/day)
- ✅ Recommended by Cloudflare for rate limiting

---

## Scenario 1: Create Rate Limiting Utility Function

**Given** Durable Objects are deployed and available
**When** I create `utils/rate-limit-do.ts`
**Then** It should provide a clean API to check rate limits
**And** It should handle DO instance creation
**And** It should support both card_uuid and ip dimensions
**And** It should use 24-hour window (500/day for card_uuid, 600/day for ip)

### Acceptance Criteria
```typescript
// utils/rate-limit-do.ts
export async function checkRateLimitDO(
  env: Env,
  dimension: 'card_uuid' | 'ip',
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }>;
```

**Implementation Requirements**:
1. Create DO instance using `idFromName(identifier)`
2. Call `checkAndIncrement()` with correct window and limit
3. Return result in consistent format
4. Handle errors gracefully

---

## Scenario 2: Update Tap Handler to Use Durable Objects

**Given** Rate limiting utility function exists
**When** I modify `handlers/tap.ts`
**Then** It should replace KV rate limiting with DO rate limiting
**And** It should maintain the same error response format
**And** It should preserve audit logging
**And** It should remove all KV rate limiting code

### Acceptance Criteria

**Before** (KV):
```typescript
const rateLimitChecks = await Promise.all([
  checkRateLimit(env.KV, 'card_uuid', card_uuid, 'day'),
  checkRateLimit(env.KV, 'ip', clientIP, 'day')
]);

await Promise.all([
  incrementRateLimit(env.KV, 'card_uuid', card_uuid, 'day'),
  incrementRateLimit(env.KV, 'ip', clientIP, 'day'),
  incrementSessionBudget(env, card_uuid)
]);
```

**After** (DO):
```typescript
const rateLimitChecks = await Promise.all([
  checkRateLimitDO(env, 'card_uuid', card_uuid),
  checkRateLimitDO(env, 'ip', clientIP)
]);

// No separate increment needed (DO does it atomically)
await incrementSessionBudget(env, card_uuid);
```

**Changes Required**:
1. Replace `checkRateLimit()` calls with `checkRateLimitDO()`
2. Remove `incrementRateLimit()` calls (DO does it atomically)
3. Update imports
4. Preserve error handling and audit logging

---

## Scenario 3: Remove Old KV Rate Limiting Code

**Given** Tap handler is using Durable Objects
**When** I clean up old code
**Then** `utils/rate-limit.ts` should be deleted
**And** `types.ts` should remove KV-related rate limit types
**And** No references to old KV rate limiting should remain

### Files to Delete
- `workers/src/utils/rate-limit.ts`

### Types to Remove from `types.ts`
- `RateLimitWindow` (no longer needed)
- `RateLimitDimension` (keep, still used)
- `RateLimitData` (remove)
- `RateLimitResult` (keep, still used)
- `RateLimitConfig` (remove)

---

## Scenario 4: Verify Deployment and Functionality

**Given** All code changes are complete
**When** I deploy to Staging
**Then** TypeScript compilation should pass
**And** Worker should start successfully
**And** Health check should return 200 OK
**And** Rate limiting should work correctly
**And** No KV writes should occur for rate limiting

### Test Cases

**Test 1: Normal Request**
```bash
curl -X POST https://db-card-staging.csw30454.workers.dev/api/nfc/tap \
  -H "Content-Type: application/json" \
  -d '{"card_uuid": "test-uuid"}'
```
Expected: 200 OK (or appropriate error if card doesn't exist)

**Test 2: Rate Limit Exceeded**
```bash
# Send 501 requests rapidly
for i in {1..501}; do
  curl -X POST https://db-card-staging.csw30454.workers.dev/api/nfc/tap \
    -H "Content-Type: application/json" \
    -d '{"card_uuid": "test-uuid"}'
done
```
Expected: 429 Rate Limited after 500 requests

**Test 3: Different IPs Not Affected**
```bash
# Request from different IP should work
curl -X POST https://db-card-staging.csw30454.workers.dev/api/nfc/tap \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 1.2.3.4" \
  -d '{"card_uuid": "test-uuid"}'
```
Expected: 200 OK (independent rate limit)

---

## Scenario 5: Performance Verification

**Given** Durable Objects rate limiting is deployed
**When** I measure response times
**Then** Average latency should be <5ms for rate limit checks
**And** P95 latency should be <10ms
**And** P99 latency should be <20ms

### Monitoring
- Use Cloudflare Dashboard to monitor DO requests
- Verify KV writes drop to 0 for rate limiting
- Confirm DO requests are within free tier (1M/month)

---

## Implementation Checklist

### Phase 3.1: Create Utility Function
- [ ] Create `workers/src/utils/rate-limit-do.ts`
- [ ] Implement `checkRateLimitDO()` function
- [ ] Add proper error handling
- [ ] Add TypeScript types

### Phase 3.2: Update Tap Handler
- [ ] Modify `workers/src/handlers/tap.ts`
- [ ] Replace KV calls with DO calls
- [ ] Remove increment calls (DO does it atomically)
- [ ] Update imports
- [ ] Preserve audit logging

### Phase 3.3: Cleanup Old Code
- [ ] Delete `workers/src/utils/rate-limit.ts`
- [ ] Remove unused types from `workers/src/types.ts`
- [ ] Search for any remaining references

### Phase 3.4: Deploy and Verify
- [ ] Run `npx tsc --noEmit` (should pass)
- [ ] Deploy to Staging
- [ ] Run health check
- [ ] Test rate limiting functionality
- [ ] Monitor KV usage (should drop)
- [ ] Monitor DO usage (should increase)

---

## Success Criteria

✅ TypeScript compilation passes
✅ Worker deploys successfully
✅ Health check returns 200 OK
✅ Rate limiting works correctly (429 after limit)
✅ KV writes for rate limiting = 0
✅ DO requests within free tier
✅ Average latency <5ms
✅ No security vulnerabilities (strong consistency)

---

## Rollback Plan

If issues occur:
1. Revert `handlers/tap.ts` to use KV
2. Restore `utils/rate-limit.ts`
3. Redeploy previous version
4. KV rate limiting will resume immediately

---

## Notes

- DO instances are created per identifier (card_uuid or ip)
- Each DO instance maintains its own state
- DO automatically handles geographic distribution
- Free tier: 1M requests/month (sufficient for our use case)
- Estimated usage: 126,000 requests/month (12.6% of free tier)
