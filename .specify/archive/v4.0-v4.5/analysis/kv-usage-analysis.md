# Cloudflare Workers KV Usage Analysis & Optimization

## Current KV Usage (Based on Code Review)

### 1. Tap API - Deduplication (Layer 1)
- **Key Pattern**: `tap:dedup:${card_uuid}`
- **TTL**: 60 seconds
- **Operations**: 1 read + 1 write per tap
- **Frequency**: Every NFC tap (high frequency)
- **Impact**: HIGH (每次 tap 都會產生 2 次 KV 操作)

### 2. Tap API - Rate Limiting (Layer 2)
- **Key Patterns**: 
  - `ratelimit:card:${uuid}:minute` (120s TTL)
  - `ratelimit:card:${uuid}:hour` (7200s TTL)
  - `ratelimit:ip:${ip}:minute` (120s TTL)
  - `ratelimit:ip:${ip}:hour` (7200s TTL)
- **Operations**: 4 reads + 4 writes per tap (worst case)
- **Frequency**: Every NFC tap
- **Impact**: VERY HIGH (每次 tap 最多 8 次 KV 操作)

### 3. Retap Revocation Cache
- **Key Pattern**: `last_session:${card_uuid}`
- **TTL**: 3600 seconds (1 hour)
- **Operations**: 1 read per tap, 1 write per session creation
- **Frequency**: Every tap
- **Impact**: MEDIUM

### 4. Card Type Cache
- **Key Pattern**: `card_type:${card_uuid}`
- **TTL**: 86400 seconds (24 hours)
- **Operations**: 1 read per tap/read, 1 write per cache miss
- **Frequency**: High (but good cache hit rate)
- **Impact**: MEDIUM

### 5. Read API - Card Data Cache
- **Key Pattern**: `card_data:${card_uuid}`
- **TTL**: 60 seconds (personal/event), 0 seconds (sensitive)
- **Operations**: 1 read per card read, 1 write per cache miss
- **Frequency**: Every card read
- **Impact**: HIGH

## Total KV Operations Per User Flow

### Scenario: Normal NFC Tap + Read
1. Tap API:
   - Dedup: 1 read + 1 write = 2 ops
   - Rate Limit: 4 reads + 4 writes = 8 ops
   - Retap Cache: 1 read + 1 write = 2 ops
   - Card Type: 1 read + 0-1 write = 1-2 ops
   - **Subtotal: 13-14 KV ops**

2. Read API:
   - Card Data: 1 read + 0-1 write = 1-2 ops
   - **Subtotal: 1-2 KV ops**

**Total: 14-16 KV operations per user interaction**

### Daily Usage Estimation
- Assume 100 card views/day
- Total KV ops: 100 × 15 = 1,500 operations/day
- Free tier: 100,000 reads + 1,000 writes
- **Write bottleneck: ~750 writes/day (75% of limit)** ⚠️

## Problem: Write Limit is the Bottleneck
- Free tier: 1,000 writes/day
- Current: ~750 writes/day (100 users × 7.5 writes each)
- **Only 33% headroom before hitting limit!**

## Optimization Strategies

### Strategy 1: Remove Dedup Layer (RECOMMENDED)
- Dedup is nice-to-have, not critical
- Rate limiting already prevents abuse
- **Savings**: -2 writes per tap

### Strategy 2: Simplify Rate Limiting to Hour-Only
- Current: minute + hour windows (4 KV keys)
- Proposed: Only hour window (2 KV keys)
- **Savings**: -4 writes per tap

### Strategy 3: Increase Card Data Cache TTL
- Current: 60s
- Proposed: 300s (5 minutes)
- **Savings**: -0.8 writes per read

### Strategy 4: Conditional Card Type Cache
- Only cache for non-sensitive cards
- **Savings**: -0.5 writes per tap

## Recommended Implementation: Phase 1 Quick Wins

### Remove Dedup + Simplify Rate Limiting
**Total Savings**: 6 writes per tap
**New Daily Usage**: 100 × (7.5 - 6) = **150 writes/day** ✅
**Headroom**: 85% remaining

### Risk Assessment
- ✅ Low Risk: Rate limiting still protects against abuse
- ✅ User Experience: No noticeable impact
- ✅ Security: Multi-layer defense still intact (rate limit + max reads)
