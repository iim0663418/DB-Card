/**
 * Unified Language Observer
 * Manages language change notifications with priority-based updates and dependency handling
 * Coordinates all components for consistent language switching
 */

class UnifiedLanguageObserver {
  constructor() {
    this.observers = new Map();
    this.updateInProgress = false;
    this.updateQueue = [];
    this.errorHandlers = new Map();
    this.performanceThreshold = 300; // 300ms performance target
    
    // Initialize MutationObserver optimizer
    this.initializeMutationOptimizer();
  }

  /**
   * Initialize MutationObserver optimizer for DOM change monitoring
   */
  initializeMutationOptimizer() {
    try {
      const MutationObserverOptimizer = window.MutationObserverOptimizer || require('./mutation-observer-optimizer.js');
      this.mutationOptimizer = new MutationObserverOptimizer({
        debounceDelay: 100,
        throttleDelay: 50,
        maxBatchSize: 50
      });
      console.log('[UnifiedLanguageObserver] MutationObserver optimizer initialized');
    } catch (error) {
      console.warn('[UnifiedLanguageObserver] MutationObserver optimizer not available:', error);
      this.mutationOptimizer = null;
    }
  }

  /**
   * Register a language observer
   * @param {string} id - Unique observer ID
   * @param {Object} observer - Observer configuration
   */
  registerObserver(id, observer) {
    if (this.observers.has(id)) {
      console.warn(`[UnifiedLanguageObserver] Observer ${id} already registered, updating...`);
    }

    // Validate observer configuration
    if (!observer.updateMethod || typeof observer.updateMethod !== 'function') {
      throw new Error(`Observer ${id} must have a valid updateMethod`);
    }

    const observerConfig = {
      id,
      priority: observer.priority || 5,
      updateMethod: observer.updateMethod,
      errorHandler: observer.errorHandler || this.defaultErrorHandler.bind(this),
      dependencies: observer.dependencies || [],
      lastUpdate: null,
      updateCount: 0,
      averageUpdateTime: 0
    };

    this.observers.set(id, observerConfig);
    console.log(`[UnifiedLanguageObserver] Registered observer: ${id} (priority: ${observerConfig.priority})`);
  }

  /**
   * Unregister a language observer
   * @param {string} id - Observer ID
   */
  unregisterObserver(id) {
    if (this.observers.has(id)) {
      this.observers.delete(id);
      console.log(`[UnifiedLanguageObserver] Unregistered observer: ${id}`);
    }
  }

  /**
   * Notify all observers of language change
   * @param {string} newLanguage - New language code
   * @param {string} previousLanguage - Previous language code
   */
  async notifyAllObservers(newLanguage, previousLanguage) {
    if (this.updateInProgress) {
      console.warn('[UnifiedLanguageObserver] Update already in progress, queuing request...');
      return this.queueUpdate(newLanguage, previousLanguage);
    }

    this.updateInProgress = true;
    const startTime = Date.now();

    try {
      console.log(`[UnifiedLanguageObserver] Starting language update: ${previousLanguage} -> ${newLanguage}`);
      
      // Create update batches based on dependencies and priorities
      const batches = this.createUpdateBatches();
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[UnifiedLanguageObserver] Processing batch ${i + 1}/${batches.length} with ${batch.length} observers`);
        
        await this.processBatch(batch, newLanguage, previousLanguage);
      }

      const duration = Date.now() - startTime;
      console.log(`[UnifiedLanguageObserver] Language update completed in ${duration}ms`);

      // Check performance threshold
      if (duration > this.performanceThreshold) {
        console.warn(`[UnifiedLanguageObserver] Update took ${duration}ms, exceeding threshold of ${this.performanceThreshold}ms`);
      }

      // Process queued updates
      await this.processUpdateQueue();

    } catch (error) {
      console.error('[UnifiedLanguageObserver] Language update failed:', error);
      throw error;
    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Create update batches based on dependencies and priorities
   * @returns {Array<Array>} Array of observer batches
   */
  createUpdateBatches() {
    const observers = Array.from(this.observers.values());
    const batches = [];
    const processed = new Set();
    const remaining = [...observers];

    // Sort by priority (higher priority first) - descending order
    remaining.sort((a, b) => b.priority - a.priority);

    while (remaining.length > 0) {
      const batch = [];
      
      // Find observers with no unmet dependencies
      for (let i = remaining.length - 1; i >= 0; i--) {
        const observer = remaining[i];
        const unmetDependencies = observer.dependencies.filter(dep => !processed.has(dep));
        
        if (unmetDependencies.length === 0) {
          batch.push(observer);
          processed.add(observer.id);
          remaining.splice(i, 1);
        }
      }

      // Handle circular dependencies
      if (batch.length === 0 && remaining.length > 0) {
        console.warn('[UnifiedLanguageObserver] Circular dependency detected, processing remaining observers');
        batch.push(...remaining);
        remaining.forEach(obs => processed.add(obs.id));
        remaining.length = 0;
      }

      if (batch.length > 0) {
        batches.push(batch);
      }
    }

    return batches;
  }

  /**
   * Process a batch of observers
   * @param {Array} batch - Observer batch
   * @param {string} newLanguage - New language
   * @param {string} previousLanguage - Previous language
   */
  async processBatch(batch, newLanguage, previousLanguage) {
    // Sort batch by priority (higher priority first) within the batch
    batch.sort((a, b) => b.priority - a.priority);
    
    const promises = batch.map(async (observer) => {
      const updateStart = Date.now();
      
      try {
        await observer.updateMethod(newLanguage, previousLanguage);
        
        const updateDuration = Date.now() - updateStart;
        observer.lastUpdate = new Date();
        observer.updateCount++;
        
        // Update average update time
        observer.averageUpdateTime = observer.averageUpdateTime === 0 
          ? updateDuration 
          : (observer.averageUpdateTime + updateDuration) / 2;
        
        console.log(`[UnifiedLanguageObserver] Observer ${observer.id} updated in ${updateDuration}ms`);
        
        return { success: true, observer: observer.id, duration: updateDuration };
        
      } catch (error) {
        console.error(`[UnifiedLanguageObserver] Observer ${observer.id} update failed:`, error);
        
        try {
          await observer.errorHandler(error, newLanguage, previousLanguage);
        } catch (handlerError) {
          console.error(`[UnifiedLanguageObserver] Error handler for ${observer.id} failed:`, handlerError);
        }
        
        return { success: false, observer: observer.id, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    
    // Log batch results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    if (failed > 0) {
      console.warn(`[UnifiedLanguageObserver] Batch completed: ${successful} successful, ${failed} failed`);
    }
  }

  /**
   * Queue an update request
   * @param {string} newLanguage - New language
   * @param {string} previousLanguage - Previous language
   * @returns {Promise} Promise that resolves when update is processed
   */
  queueUpdate(newLanguage, previousLanguage) {
    return new Promise((resolve, reject) => {
      this.updateQueue.push({
        newLanguage,
        previousLanguage,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Process queued updates
   */
  async processUpdateQueue() {
    while (this.updateQueue.length > 0) {
      const request = this.updateQueue.shift();
      
      try {
        await this.notifyAllObservers(request.newLanguage, request.previousLanguage);
        request.resolve();
      } catch (error) {
        request.reject(error);
      }
    }
  }

  /**
   * Default error handler
   * @param {Error} error - Error object
   * @param {string} newLanguage - New language
   * @param {string} previousLanguage - Previous language
   */
  defaultErrorHandler(error, newLanguage, previousLanguage) {
    console.error('[UnifiedLanguageObserver] Default error handler:', {
      error: error.message,
      newLanguage,
      previousLanguage,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get observer status and statistics
   * @returns {Object} Observer status
   */
  getObserverStatus() {
    const observers = Array.from(this.observers.values());
    
    return {
      totalObservers: observers.length,
      updateInProgress: this.updateInProgress,
      queuedUpdates: this.updateQueue.length,
      performanceThreshold: this.performanceThreshold,
      mutationObserverMetrics: this.getMutationObserverMetrics(),
      observers: observers.map(obs => ({
        id: obs.id,
        priority: obs.priority,
        dependencies: obs.dependencies,
        lastUpdate: obs.lastUpdate,
        updateCount: obs.updateCount,
        averageUpdateTime: Math.round(obs.averageUpdateTime)
      }))
    };
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const observers = Array.from(this.observers.values());
    const updateTimes = observers
      .filter(obs => obs.averageUpdateTime > 0)
      .map(obs => obs.averageUpdateTime);
    
    if (updateTimes.length === 0) {
      return { averageUpdateTime: 0, slowestObserver: null, fastestObserver: null };
    }
    
    const avgTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
    const slowest = observers.reduce((prev, curr) => 
      curr.averageUpdateTime > prev.averageUpdateTime ? curr : prev
    );
    const fastest = observers.reduce((prev, curr) => 
      curr.averageUpdateTime < prev.averageUpdateTime ? curr : prev
    );
    
    return {
      averageUpdateTime: Math.round(avgTime),
      slowestObserver: { id: slowest.id, time: Math.round(slowest.averageUpdateTime) },
      fastestObserver: { id: fastest.id, time: Math.round(fastest.averageUpdateTime) }
    };
  }

  /**
   * Clear all observers (for cleanup)
   */
  clearAllObservers() {
    this.observers.clear();
    this.updateQueue.length = 0;
    
    // Cleanup mutation optimizer
    if (this.mutationOptimizer) {
      this.mutationOptimizer.cleanup();
    }
    
    console.log('[UnifiedLanguageObserver] All observers cleared');
  }

  /**
   * Create optimized MutationObserver for DOM monitoring
   * @param {Function} callback - Mutation callback
   * @param {Object} options - Observer options
   * @returns {Object} Optimized observer wrapper
   */
  createOptimizedMutationObserver(callback, options = {}) {
    if (this.mutationOptimizer) {
      return this.mutationOptimizer.createOptimizedObserver(callback, options);
    } else {
      // Fallback to regular MutationObserver
      const observer = new MutationObserver(callback);
      return {
        observer,
        observe: (target, config) => observer.observe(target, config),
        disconnect: () => observer.disconnect(),
        takeRecords: () => observer.takeRecords()
      };
    }
  }

  /**
   * Get mutation observer performance metrics
   * @returns {Object} Performance metrics
   */
  getMutationObserverMetrics() {
    if (this.mutationOptimizer) {
      return this.mutationOptimizer.getPerformanceMetrics();
    }
    return { available: false, message: 'MutationObserver optimizer not available' };
  }

  /**
   * Set performance threshold
   * @param {number} threshold - Threshold in milliseconds
   */
  setPerformanceThreshold(threshold) {
    this.performanceThreshold = threshold;
    console.log(`[UnifiedLanguageObserver] Performance threshold set to ${threshold}ms`);
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedLanguageObserver;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
  window.UnifiedLanguageObserver = UnifiedLanguageObserver;
}