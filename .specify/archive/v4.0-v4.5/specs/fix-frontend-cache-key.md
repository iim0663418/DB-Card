# Fix: Frontend Cache Key Duplication Issue

## Problem
Current cache key `card:${uuid}:${sessionId}` causes duplicate cache entries for the same card when user refreshes or gets a new session.

## Root Cause
Card data doesn't change between sessions, but including sessionId in cache key creates separate cache entries.

## Solution
Change cache key from `card:${uuid}:${sessionId}` to `card:${uuid}`

### Scenario 1: Same Card, Different Sessions
- **Given**: User views card with session A, then refreshes and gets session B
- **When**: readCard() is called with different sessionIds
- **Then**: Both requests use the same cache entry (keyed by uuid only)

### Scenario 2: Cache Hit Across Sessions
- **Given**: Card data is cached from session A
- **When**: User refreshes and gets session B, calls readCard()
- **Then**: Cache hit occurs, no duplicate entry created

### Scenario 3: Different Cards
- **Given**: User views card A, then card B
- **When**: readCard() is called for both cards
- **Then**: Two separate cache entries exist (card:A and card:B)

## Implementation
**File**: `workers/public/js/api.js`
**Line**: 38
**Change**: 
```javascript
// Before
const cacheKey = `card:${uuid}:${sessionId}`;

// After
const cacheKey = `card:${uuid}`;
```

## Impact
- Reduces sessionStorage usage
- Prevents duplicate cache entries
- Maintains 5-minute TTL behavior
- No functional changes to cache hit/miss logic
