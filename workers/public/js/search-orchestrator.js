/**
 * Search Orchestrator with Circuit Breaker
 * Handles debounce, cancellation, deduplication, and circuit breaking
 */

class SearchOrchestrator {
  constructor(options = {}) {
    this.currentController = null;
    this.lastQuery = null;

    // Circuit Breaker
    this.circuitBreaker = {
      state: 'closed',           // closed | open | half-open
      failureCount: 0,
      threshold: options.threshold || 3,
      timeout: options.timeout || 60000,  // 60s
      nextAttempt: 0,
      degradedNotified: false
    };
  }

  /**
   * Search with cancellation, deduplication, and circuit breaking
   */
  async search(query, searchFn, fallbackFn) {
    // Cancel previous request
    if (this.currentController) {
      this.currentController.abort();
    }

    // Deduplication
    const queryKey = JSON.stringify(query);
    if (queryKey === this.lastQuery) {
      return { deduplicated: true };
    }
    this.lastQuery = queryKey;

    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      const now = Date.now();
      if (now < this.circuitBreaker.nextAttempt) {
        // Still in degraded mode
        if (!this.circuitBreaker.degradedNotified) {
          console.warn('[SearchOrchestrator] Network unstable, using local search');
          this.circuitBreaker.degradedNotified = true;
        }
        const result = await fallbackFn(query);
        return { ...result, degraded: true };
      } else {
        // Try half-open
        this.circuitBreaker.state = 'half-open';
      }
    }

    // Execute search
    this.currentController = new AbortController();
    try {
      const result = await searchFn(query, this.currentController.signal);

      // Success - reset circuit breaker
      if (this.circuitBreaker.state === 'half-open') {
        this.close();
      }
      this.circuitBreaker.failureCount = 0;

      return { ...result, degraded: false };
    } catch (error) {
      // Handle failure
      if (error.name === 'AbortError') {
        // User cancelled, don't count as failure
        return { cancelled: true };
      }

      // Only count real network failures (status=0, timeout, 5xx)
      // Don't count 4xx client errors (bad request, validation errors)
      const isNetworkFailure = !error.status || error.status === 0 || error.status >= 500;
      if (isNetworkFailure) {
        this.handleFailure();
      }

      // Fallback to local search
      const result = await fallbackFn(query);
      return { ...result, degraded: isNetworkFailure, error: error.message };
    }
  }

  handleFailure() {
    this.circuitBreaker.failureCount++;
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
      this.open();
    }
  }

  open() {
    this.circuitBreaker.state = 'open';
    this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;
    this.circuitBreaker.degradedNotified = false;
    console.warn(`[SearchOrchestrator] Circuit opened after ${this.circuitBreaker.failureCount} failures`);
  }

  close() {
    this.circuitBreaker.state = 'closed';
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.degradedNotified = false;
    console.info('[SearchOrchestrator] Circuit closed, service recovered');
  }

  reset() {
    if (this.currentController) {
      this.currentController.abort();
    }
    this.lastQuery = null;
  }
}

// Export for use in received-cards.js
window.SearchOrchestrator = SearchOrchestrator;
