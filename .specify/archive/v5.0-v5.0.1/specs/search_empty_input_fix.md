# Search Empty Input Prevention & Circuit Breaker Fix

## Problem Statement
- IME compositionend triggers search unconditionally (even with empty string)
- _triggerSearch() has no empty string guard
- Circuit Breaker counts 400 errors as failures → false "network unstable" warnings

## BDD Specifications

### Scenario 1: IME Empty Input Prevention
**Given**: User finishes IME composition with empty string  
**When**: compositionend event fires  
**Then**: 
- Should call `filterCards('')` to show all cards
- Should return early without calling `_triggerSearch()`
- Should NOT trigger any API request

**Implementation Target**: `workers/public/received-cards.js` lines 863-868

### Scenario 2: Trigger Search Guard
**Given**: `_triggerSearch()` is called with empty/whitespace keyword  
**When**: Function executes  
**Then**: 
- Should return early at function start
- Should NOT call SearchOrchestrator
- Should NOT trigger any API request

**Implementation Target**: `workers/public/received-cards.js` line 986

### Scenario 3: Circuit Breaker 4xx Tolerance
**Given**: API returns 400/422 (client error - bad request)  
**When**: SearchOrchestrator processes the response  
**Then**: 
- Should NOT increment failure counter
- Circuit should stay closed
- Only count failures for: status=0, timeout, 5xx errors

**Implementation Target**: `workers/public/search-orchestrator.js` lines 95-108

## Acceptance Criteria
1. ✅ Typing then clearing search box → No `/search?q=` request
2. ✅ IME composition ending with empty string → No API call
3. ✅ DevTools shows no "Query parameter 'q' is required" 400 errors
4. ✅ Circuit Breaker does NOT open due to empty searches
5. ✅ "Network unstable" warning only appears for real network issues

## Files to Modify
- `workers/public/received-cards.js` (2 locations)
- `workers/public/search-orchestrator.js` (1 location)

## Testing Plan
1. Manual: Type in search box, clear it → verify no API call
2. Manual: Use Chinese IME, finish with empty → verify no API call  
3. Manual: Trigger 3 empty searches → verify circuit stays closed
4. DevTools: Verify no 400 errors from empty searches
