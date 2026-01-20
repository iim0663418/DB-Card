# Unify Frontend Cache System

## Problem
Two separate cache systems exist:
1. **api.js**: `card:${uuid}` (5min TTL) - for readCard() API calls
2. **cache-helper.js**: `card_cache_${uuid}_${sessionId}` (1hr TTL) - for renderCard() display

This causes:
- Duplicate cache entries for the same card
- Inconsistent TTL (5min vs 1hr)
- Confusion about which cache is authoritative

## Root Cause Analysis
- api.js was updated in v4.2.1 to use `card:${uuid}` (removed sessionId)
- cache-helper.js still uses old pattern `card_cache_${uuid}_${sessionId}`
- main.js uses cache-helper.js for display caching

## Solution: Unify to Single Cache System

### Option A: Use api.js cache only (RECOMMENDED)
- Remove cache-helper.js entirely
- main.js calls api.readCard() which handles caching
- Single source of truth: `card:${uuid}` with 5min TTL

### Option B: Update cache-helper.js to match api.js
- Change getCacheKey() to return `card:${uuid}` (remove sessionId)
- Align TTL to 5 minutes
- Keep cache-helper.js for abstraction

## Recommended Implementation: Option A

### Changes Required

**1. Remove cache-helper.js usage from main.js**
```javascript
// Before (lines 275-290)
const cached = getCachedCard(uuid, sessionId);
if (cached) {
    return cached;
}
const result = await readCard(uuid, sessionId);
setCachedCard(uuid, sessionId, { data: cardData, sessionData });

// After
const result = await readCard(uuid, sessionId); // readCard() handles caching internally
```

**2. Delete cache-helper.js** (optional cleanup)
- File is no longer needed
- api.js provides all caching functionality

**3. Remove import from main.js**
```javascript
// Remove line 3
import { getCachedCard, setCachedCard, clearExpiredCache } from './cache-helper.js';
```

### Benefits
- Single cache system (api.js)
- Consistent cache key format (`card:${uuid}`)
- Unified 5-minute TTL
- Simpler codebase (one less file)
- No duplicate entries

### Migration
- Old cache entries (`card_cache_*`) will naturally expire
- New entries use `card:*` format
- No data loss or breaking changes
