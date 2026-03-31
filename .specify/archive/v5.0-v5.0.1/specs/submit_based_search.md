# BDD Spec: Submit-based Search (A+ Implementation - Final)

## Scenario 1: Form-based Search Submission
**Given**: User types search query in input field  
**When**: User presses Enter or clicks "搜尋名片" button  
**Then**:
- Form submit event is triggered
- Query is trimmed at submission time (not during input)
- API call is made with trimmed query
- Button shows "搜尋中..." with aria-busy="true" and aria-disabled="true"
- Result count shows "搜尋中..." with aria-live="polite" and blue pulse animation
- No inline event handlers (use addEventListener)

## Scenario 2: Successful Search Results
**Given**: API returns search results  
**When**: Results are rendered  
**Then**:
- Button text returns to "搜尋名片" with aria-busy="false" and aria-disabled="false"
- Result count shows "{count} (智慧搜尋)" with normal color
- Pulse animation stops
- Cards are rendered with new results
- Request token ensures old responses don't override new results

## Scenario 3: Clear Search Behavior (Enhanced)
**Given**: User has search results displayed  
**When**: User clicks clear button (✕)  
**Then**:
- Input field is cleared
- currentKeyword is reset to empty string
- Clear button is hidden
- Result count text and classes are reset (remove animate-pulse, blue color)
- **No API call is made** (important: don't auto-search)
- Return to default list (page 1, all cards)

## Scenario 4: Empty Query Handling (Consistent)
**Given**: User submits empty or whitespace-only query  
**When**: Form is submitted  
**Then**:
- No API call is made
- Return to default list (page 1, all cards)
- Result count shows total card count
- No loading state is shown

## Scenario 5: Search Error Handling (Observable)
**Given**: API call fails or times out  
**When**: Error occurs  
**Then**:
- Button is re-enabled with original text
- Result count shows error message: "搜尋失敗，已使用本地結果" (yellow)
- Fallback to local filter results
- Error is logged to console
- User can retry by submitting again

## Scenario 6: Race Condition Prevention (Request Token)
**Given**: User submits search A, then quickly submits search B  
**When**: Response A arrives after response B  
**Then**:
- Response A is discarded (stale request)
- Only response B results are displayed
- Request token/ID ensures correct ordering

## Scenario 7: Circuit Breaker Protection (Preserved)
**Given**: API fails 3 times within 60 seconds  
**When**: Circuit breaker opens  
**Then**:
- Fallback to local filter
- Result count shows "{count} (本地搜尋)" with yellow color
- One-time notification about degraded mode
- Search continues to work with local data

## Scenario 8: Pagination Integration
**Given**: User has pagination state (currentPage, pageSize)  
**When**: Search is submitted  
**Then**:
- Use existing currentPage and pageSize (don't hardcode 1, 20)
- Preserve pagination behavior
- Reset to page 1 only on new search keyword

## Technical Requirements

### HTML Structure (Accessibility Enhanced)
```html
<form id="searchForm" class="...">
  <input id="searchInput" type="text" placeholder="搜尋名片..." 
         aria-label="搜尋名片" />
  <button type="submit" id="searchButton" 
          aria-busy="false" aria-disabled="false">
    搜尋名片
  </button>
  <button type="button" id="clearSearch" class="hidden" 
          aria-label="清除搜尋">
    ✕
  </button>
</form>
<div id="resultCount" aria-live="polite" aria-atomic="true"></div>
```

### JavaScript Implementation (10 Enhancements)

#### 1. currentKeyword: Don't trim during input
```javascript
searchInput.addEventListener('input', (e) => {
  this.currentKeyword = e.target.value; // Keep original, trim at submit
  clearBtn.classList.toggle('hidden', !this.currentKeyword.trim());
});
```

#### 2. Clear: Reset all UI state
```javascript
clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  this.currentKeyword = '';
  clearBtn.classList.add('hidden');
  
  // Reset result count UI
  const resultCount = document.getElementById('resultCount');
  if (resultCount) {
    resultCount.textContent = '';
    resultCount.className = ''; // Remove animate-pulse, text-blue-600
  }
  
  // Return to default list (page 1)
  this.currentPage = 1;
  this.filterCards();
});
```

#### 3. Empty query: Consistent behavior
```javascript
submitSearch() {
  const keyword = this.currentKeyword.trim(); // Trim at submit
  
  if (!keyword) {
    // Return to default list (page 1, all cards)
    this.currentPage = 1;
    this.filterCards();
    return;
  }
  // ...
}
```

#### 4. Fallback: Normalize for better matching
```javascript
const fallbackFn = (query) => {
  const normalized = query.normalize('NFKC').toLowerCase();
  const results = this.allCards.filter(card => {
    const fields = [
      card.full_name, card.full_name_en, 
      card.organization, card.email, card.phone
    ].map(f => f?.normalize('NFKC').toLowerCase() || '');
    
    return fields.some(f => f.includes(normalized));
  });
  return Promise.resolve({ results, degraded: true });
};
```

#### 5. Result structure: Unified format
```javascript
// searchFn returns: { results, meta? }
// fallbackFn returns: { results, degraded: true }
// Both have same structure for consistent handling
```

#### 6. Loading state: Accessibility
```javascript
// Start loading
btn.disabled = true;
btn.setAttribute('aria-busy', 'true');
btn.setAttribute('aria-disabled', 'true');
btn.textContent = '搜尋中...';

resultCount.setAttribute('aria-live', 'polite');
resultCount.textContent = '搜尋中...';
resultCount.className = 'text-blue-600 animate-pulse';

// End loading
btn.disabled = false;
btn.setAttribute('aria-busy', 'false');
btn.setAttribute('aria-disabled', 'false');
btn.textContent = '搜尋名片';
```

#### 7. Race condition: Request token
```javascript
submitSearch() {
  // Generate request token
  this.currentSearchToken = Date.now();
  const requestToken = this.currentSearchToken;
  
  this.searchOrchestrator.search(keyword, searchFn, fallbackFn)
    .then(result => {
      // Discard stale responses
      if (requestToken !== this.currentSearchToken) {
        console.log('Discarding stale search response');
        return;
      }
      
      if (result.results) {
        this._applySearchResults(result.results, result.degraded);
      }
    });
}
```

#### 8. Error handling: Observable UI
```javascript
this.searchOrchestrator.search(keyword, searchFn, fallbackFn)
  .then(result => {
    // ... success handling
  })
  .catch(error => {
    console.error('Search failed:', error);
    
    // Show error message
    if (resultCount) {
      resultCount.textContent = '搜尋失敗，已使用本地結果';
      resultCount.className = 'text-yellow-600';
    }
    
    // Fallback to local filter
    const localResults = this.allCards.filter(/* ... */);
    this._applySearchResults(localResults, true);
  })
  .finally(() => {
    // Always restore button state
    btn.disabled = false;
    btn.setAttribute('aria-busy', 'false');
    btn.setAttribute('aria-disabled', 'false');
    btn.textContent = '搜尋名片';
  });
```

#### 9. Pagination: Use existing state
```javascript
const searchFn = (query, signal) => 
  ReceivedCardsAPI.searchCards(
    query, 
    this.currentPage || 1,      // Use existing page
    this.pageSize || 20,         // Use existing size
    signal
  );
```

#### 10. SearchOrchestrator: Preserve timeout + abort
```javascript
// Keep in SearchOrchestrator:
- AbortController for request cancellation
- Timeout protection (default 10s)
- Circuit breaker (failure detection)
- Request deduplication (in-flight check)

// Remove from SearchOrchestrator:
- Debounce logic (not needed for submit-based)
- IME protection (not needed for submit-based)
```

## Code Changes Summary

### Additions (~80 lines)
- Form submit handler
- Request token for race condition prevention
- Enhanced error handling with UI feedback
- Accessibility attributes (aria-busy, aria-live)
- String normalization for better matching
- Clear button UI reset logic

### Removals (~115 lines)
- Input event listener for auto-search
- Debounce logic
- IME protection (compositionstart/end)
- Redundant loading state code

### Net Change: -35 lines (simpler + more robust)

## Acceptance Criteria

### Functional
1. ✅ Enter key submits search
2. ✅ Button click submits search
3. ✅ Clear button resets all UI state
4. ✅ Empty query returns to default list
5. ✅ Pagination state preserved
6. ✅ Race conditions prevented (request token)
7. ✅ Errors shown with fallback results

### Accessibility
1. ✅ aria-busy on button during loading
2. ✅ aria-live on result count
3. ✅ aria-label on form controls
4. ✅ Screen reader friendly

### Defensive
1. ✅ Circuit breaker preserved
2. ✅ Timeout + abort preserved
3. ✅ Request deduplication preserved
4. ✅ String normalization for matching
5. ✅ Stale response discarding

### Observable
1. ✅ Error messages visible to user
2. ✅ Loading state clear and accessible
3. ✅ Degraded mode indicated (yellow label)
4. ✅ Console logs for debugging

## Implementation Order
1. HTML structure (form + accessibility)
2. Clear button behavior (UI reset)
3. Submit handler (with request token)
4. Error handling (catch + UI feedback)
5. Pagination integration
6. String normalization
7. SearchOrchestrator cleanup (remove debounce)
8. Testing (TypeScript + manual)
9. Deployment
