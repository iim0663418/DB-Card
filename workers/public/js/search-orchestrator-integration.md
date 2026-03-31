/**
 * SearchOrchestrator Integration Guide for received-cards.js
 * 
 * Changes needed:
 * 1. Initialize SearchOrchestrator
 * 2. Add IME protection
 * 3. Reduce search limit from 100 to 20
 * 4. Use orchestrator for search
 */

// ============================================
// 1. Add at the top of ReceivedCards class
// ============================================
constructor() {
  // ... existing code ...
  
  // Initialize SearchOrchestrator
  this.searchOrchestrator = new SearchOrchestrator({
    debounceDelay: 300,
    threshold: 3,
    timeout: 60000
  });
  
  this.isComposing = false; // IME protection
}

// ============================================
// 2. Replace searchInput event listeners (around line 863)
// ============================================
// OLD CODE:
/*
searchInput.addEventListener('input', (e) => {
  this.currentKeyword = e.target.value.toLowerCase().trim();
  // ... debounce logic ...
  this.filterCards();
});
*/

// NEW CODE:
searchInput.addEventListener('compositionstart', () => {
  this.isComposing = true;
});

searchInput.addEventListener('compositionend', (e) => {
  this.isComposing = false;
  this.handleSearchInput(e.target.value);
});

searchInput.addEventListener('input', (e) => {
  if (!this.isComposing) {
    this.handleSearchInput(e.target.value);
  }
});

// ============================================
// 3. Add new handleSearchInput method
// ============================================
handleSearchInput(value) {
  this.currentKeyword = value.toLowerCase().trim();
  
  // Show/hide clear button
  const clearBtn = document.getElementById('clearSearch');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !this.currentKeyword);
  }
  
  // Trigger filter
  this.filterCards();
}

// ============================================
// 4. Modify searchCards method (around line 374)
// ============================================
async searchCards(keyword, page = 1, limit = 20) {  // Changed from 100 to 20
  const searchFn = async (query, signal) => {
    const response = await ReceivedCardsAPI.searchCards(
      query.keyword,
      query.page,
      query.limit,
      signal
    );
    return response;
  };

  const fallbackFn = async (query) => {
    // Local filter fallback
    console.info('[ReceivedCards] Using local search fallback');
    return {
      results: this.allCards.filter(card => 
        this.matchesKeyword(card, query.keyword)
      ),
      total: this.allCards.length,
      page: query.page,
      limit: query.limit
    };
  };

  try {
    const result = await this.searchOrchestrator.search(
      { keyword, page, limit },
      searchFn,
      fallbackFn
    );

    if (result.cancelled || result.deduplicated) {
      return null;
    }

    if (result.degraded) {
      // Show one-time notification
      if (!this._degradedNotified) {
        this.showToast('網路不穩定，已切換本地搜尋', 'info');
        this._degradedNotified = true;
      }
    } else {
      this._degradedNotified = false;
    }

    return result;
  } catch (error) {
    console.error('[ReceivedCards] Search failed:', error);
    return fallbackFn({ keyword, page, limit });
  }
}

// ============================================
// 5. Remove old debounce logic from filterCards
// ============================================
// The debounce is now handled by SearchOrchestrator
// Remove any setTimeout/clearTimeout code in filterCards

// ============================================
// 6. Add cleanup in destroy/unmount
// ============================================
destroy() {
  if (this.searchOrchestrator) {
    this.searchOrchestrator.reset();
  }
}
