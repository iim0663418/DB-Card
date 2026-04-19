# BDD Spec: Frontend progressive loading for received-cards

## Context
Phase 1 added cursor-based pagination to `GET /api/user/received-cards?limit=50&cursor=<token>`. The frontend currently calls the endpoint without params (gets all cards at once). This spec adds progressive loading: fetch first page fast, then "load more" to accumulate cards for client-side filtering.

## Impacted Files
- `public/js/received-cards.js` — `ReceivedCardsAPI.loadCards`, `ReceivedCards.loadCards`, `ReceivedCards` state, `ReceivedCards.renderCards`

## Behavioral Unit
Progressive loading with "load more" button. First page loads instantly, subsequent pages append on demand. Client-side filtering works on accumulated cards.

---

## Scenario 1: Initial load fetches first page only

**Given** user opens received-cards view
**When** `loadCards()` is called
**Then** API is called with `?limit=50`
**And** first 50 cards render immediately
**And** result count shows "50+ 張名片" (indicating more exist)
**And** a "載入更多" button appears below the card grid

## Scenario 2: Load more appends next page

**Given** first 50 cards are displayed with "載入更多" button
**When** user clicks "載入更多"
**Then** API is called with `?limit=50&cursor=<nextCursor>`
**And** next 50 cards append to the grid (not replace)
**And** `allCards` accumulates to 100 cards
**And** tag filters update to include new cards' tags
**And** result count updates to "100+ 張名片"

## Scenario 3: All cards loaded (no more pages)

**Given** user has loaded all pages (hasMore=false)
**When** last page loads
**Then** "載入更多" button disappears
**And** result count shows exact count "101 張名片"
**And** `allCards` contains all 101 cards

## Scenario 4: Client-side filtering works on accumulated cards

**Given** user has loaded 100 of 101 cards
**When** user selects a tag filter
**Then** filtering applies to the 100 accumulated cards
**And** result count reflects filtered count from loaded cards

## Scenario 5: Backward compat — after full load, filtering works as before

**Given** all cards are loaded (hasMore=false)
**When** user uses keyword search or tag filter
**Then** behavior is identical to current (all cards available for filtering)

---

## Implementation Constraints

### API layer change
```javascript
// ReceivedCardsAPI.loadCards — add pagination params
async loadCards(limit = 50, cursor = null) {
  let url = '/api/user/received-cards?limit=' + limit;
  if (cursor) url += '&cursor=' + encodeURIComponent(cursor);
  return await this.call(url);
}
```

### State additions to ReceivedCards namespace
```javascript
nextCursor: null,    // cursor for next page
hasMore: false,      // whether more pages exist
isLoadingMore: false // prevent double-click
```

### loadCards changes
- First call: `loadCards()` fetches `?limit=50`, stores cards + nextCursor + hasMore
- Sets `allCards` to first page results
- Calls `renderCards` + shows "load more" button if hasMore

### New: loadMoreCards method
- Fetches next page using stored `nextCursor`
- Appends to `allCards` (not replace)
- Appends new card HTML to grid (not re-render all)
- Updates tag filters with new cards
- Updates result count
- If !hasMore, removes "load more" button

### renderCards changes
- After rendering cards, if `hasMore`, append "load more" button div below grid
- Button: `<button onclick="ReceivedCards.loadMoreCards()">載入更多</button>`

### Shared cards query
- The shared-cards query (`/api/user/shared-cards`) runs once on initial load
- `sharedUuids` Set is stored and reused for subsequent pages

### Tag filter re-initialization
- `initTagFilters()` already reads from `this.allCards`
- After appending new cards, call `initTagFilters()` again to update sidebar

### Result count display
- While `hasMore`: show `${allCards.length}+ 張名片`
- When `!hasMore`: show `${allCards.length} 張名片`

---

## What NOT to change
- `renderCardHTML` — unchanged
- `filterCards` — unchanged (already works on `allCards`)
- `searchCards` API — unchanged (server-side search is separate)
- `initFromURL` — unchanged
- Card upload flow — unchanged
- Edit/delete/share flows — unchanged

## Validation
- Manual test: open received-cards, verify 50 cards load, click "load more", verify 50 more append, click again, verify last 1 card loads and button disappears
- Verify tag filters update after each page load
- Verify client-side keyword filtering works on accumulated cards
