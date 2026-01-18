/**
 * MutationObserver Performance Optimizer
 * Implements debouncing and throttling for DOM mutation observations
 * Prevents excessive CPU usage during frequent DOM changes
 */

class MutationObserverOptimizer {
  constructor(options = {}) {
    this.debounceDelay = options.debounceDelay || 100; // 100ms debounce
    this.throttleDelay = options.throttleDelay || 50;   // 50ms throttle
    this.maxBatchSize = options.maxBatchSize || 50;     // Max mutations per batch
    
    this.observers = new Map();
    this.debounceTimers = new Map();
    this.throttleTimers = new Map();
    this.mutationQueue = new Map();
    this.isProcessing = false;
    
    // Performance metrics
    this.metrics = {
      totalMutations: 0,
      processedBatches: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0,
      skippedMutations: 0
    };
  }

  /**
   * Create optimized MutationObserver with debouncing and throttling
   * @param {Function} callback - Original callback function
   * @param {Object} options - Observer options
   * @returns {MutationObserver} Optimized observer
   */
  createOptimizedObserver(callback, options = {}) {
    const observerId = this.generateObserverId();
    
    // Create optimized callback with debouncing and throttling
    const optimizedCallback = this.createOptimizedCallback(observerId, callback);
    
    // Create MutationObserver with optimized callback
    const observer = new MutationObserver(optimizedCallback);
    
    // Store observer configuration
    this.observers.set(observerId, {
      observer,
      originalCallback: callback,
      options,
      isActive: false,
      mutationCount: 0,
      lastActivity: Date.now()
    });
    
    return {
      observer,
      observerId,
      observe: (target, config) => {
        observer.observe(target, config);
        this.observers.get(observerId).isActive = true;
      },
      disconnect: () => {
        this.disconnectObserver(observerId);
      },
      takeRecords: () => observer.takeRecords()
    };
  }

  /**
   * Create optimized callback with debouncing and throttling
   * @param {string} observerId - Observer ID
   * @param {Function} originalCallback - Original callback
   * @returns {Function} Optimized callback
   */
  createOptimizedCallback(observerId, originalCallback) {
    return (mutations, observer) => {
      this.metrics.totalMutations += mutations.length;
      
      // Add mutations to queue
      if (!this.mutationQueue.has(observerId)) {
        this.mutationQueue.set(observerId, []);
      }
      
      const queue = this.mutationQueue.get(observerId);
      queue.push(...mutations);
      
      // Update observer stats
      const observerConfig = this.observers.get(observerId);
      if (observerConfig) {
        observerConfig.mutationCount += mutations.length;
        observerConfig.lastActivity = Date.now();
      }
      
      // Apply debouncing
      this.debounceCallback(observerId, originalCallback, observer);
    };
  }

  /**
   * Apply debouncing to callback execution
   * @param {string} observerId - Observer ID
   * @param {Function} callback - Original callback
   * @param {MutationObserver} observer - Observer instance
   */
  debounceCallback(observerId, callback, observer) {
    // Clear existing debounce timer
    if (this.debounceTimers.has(observerId)) {
      clearTimeout(this.debounceTimers.get(observerId));
    }
    
    // Set new debounce timer
    const timer = setTimeout(() => {
      this.throttleCallback(observerId, callback, observer);
      this.debounceTimers.delete(observerId);
    }, this.debounceDelay);
    
    this.debounceTimers.set(observerId, timer);
  }

  /**
   * Apply throttling to callback execution
   * @param {string} observerId - Observer ID
   * @param {Function} callback - Original callback
   * @param {MutationObserver} observer - Observer instance
   */
  throttleCallback(observerId, callback, observer) {
    // Check if throttle is active
    if (this.throttleTimers.has(observerId)) {
      return; // Skip execution, throttle is active
    }
    
    // Set throttle timer
    const timer = setTimeout(() => {
      this.throttleTimers.delete(observerId);
    }, this.throttleDelay);
    
    this.throttleTimers.set(observerId, timer);
    
    // Process mutations
    this.processMutations(observerId, callback, observer);
  }

  /**
   * Process queued mutations in batches
   * @param {string} observerId - Observer ID
   * @param {Function} callback - Original callback
   * @param {MutationObserver} observer - Observer instance
   */
  async processMutations(observerId, callback, observer) {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }
    
    this.isProcessing = true;
    const startTime = performance.now();
    
    try {
      const queue = this.mutationQueue.get(observerId) || [];
      if (queue.length === 0) {
        return;
      }
      
      // Process mutations in batches
      const batches = this.createMutationBatches(queue);
      
      for (const batch of batches) {
        try {
          await callback(batch, observer);
        } catch (error) {
          console.error('[MutationObserverOptimizer] Callback execution failed:', error);
        }
      }
      
      // Clear processed mutations
      this.mutationQueue.set(observerId, []);
      this.metrics.processedBatches++;
      
    } catch (error) {
      console.error('[MutationObserverOptimizer] Mutation processing failed:', error);
    } finally {
      this.isProcessing = false;
      
      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.metrics.lastProcessingTime = processingTime;
      this.metrics.averageProcessingTime = this.metrics.averageProcessingTime === 0
        ? processingTime
        : (this.metrics.averageProcessingTime + processingTime) / 2;
    }
  }

  /**
   * Create mutation batches to prevent overwhelming the callback
   * @param {Array} mutations - Array of mutations
   * @returns {Array} Array of mutation batches
   */
  createMutationBatches(mutations) {
    const batches = [];
    
    for (let i = 0; i < mutations.length; i += this.maxBatchSize) {
      const batch = mutations.slice(i, i + this.maxBatchSize);
      batches.push(batch);
    }
    
    return batches;
  }

  /**
   * Disconnect observer and cleanup resources
   * @param {string} observerId - Observer ID
   */
  disconnectObserver(observerId) {
    const observerConfig = this.observers.get(observerId);
    if (!observerConfig) return;
    
    // Disconnect observer
    observerConfig.observer.disconnect();
    observerConfig.isActive = false;
    
    // Clear timers
    if (this.debounceTimers.has(observerId)) {
      clearTimeout(this.debounceTimers.get(observerId));
      this.debounceTimers.delete(observerId);
    }
    
    if (this.throttleTimers.has(observerId)) {
      clearTimeout(this.throttleTimers.get(observerId));
      this.throttleTimers.delete(observerId);
    }
    
    // Clear mutation queue
    this.mutationQueue.delete(observerId);
    
    // Remove observer
    this.observers.delete(observerId);
    
    console.log(`[MutationObserverOptimizer] Observer ${observerId} disconnected and cleaned up`);
  }

  /**
   * Generate unique observer ID
   * @returns {string} Observer ID
   */
  generateObserverId() {
    return `observer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const activeObservers = Array.from(this.observers.values()).filter(obs => obs.isActive);
    
    return {
      ...this.metrics,
      activeObservers: activeObservers.length,
      totalObservers: this.observers.size,
      queuedMutations: Array.from(this.mutationQueue.values())
        .reduce((total, queue) => total + queue.length, 0),
      memoryUsage: this.estimateMemoryUsage(),
      cpuEfficiency: this.calculateCPUEfficiency()
    };
  }

  /**
   * Estimate memory usage
   * @returns {Object} Memory usage estimation
   */
  estimateMemoryUsage() {
    const queueSize = Array.from(this.mutationQueue.values())
      .reduce((total, queue) => total + queue.length, 0);
    
    return {
      estimatedBytes: queueSize * 100, // Rough estimate: 100 bytes per mutation
      queuedMutations: queueSize,
      activeTimers: this.debounceTimers.size + this.throttleTimers.size
    };
  }

  /**
   * Calculate CPU efficiency based on processing metrics
   * @returns {number} Efficiency score (0-100)
   */
  calculateCPUEfficiency() {
    if (this.metrics.totalMutations === 0) return 100;
    
    const processedRatio = this.metrics.processedBatches / this.metrics.totalMutations;
    const avgProcessingTime = this.metrics.averageProcessingTime;
    
    // Lower processing time and higher processed ratio = better efficiency
    const timeEfficiency = Math.max(0, 100 - (avgProcessingTime / 10));
    const batchEfficiency = processedRatio * 100;
    
    return Math.round((timeEfficiency + batchEfficiency) / 2);
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    // Disconnect all observers
    for (const observerId of this.observers.keys()) {
      this.disconnectObserver(observerId);
    }
    
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.throttleTimers.values()) {
      clearTimeout(timer);
    }
    
    // Clear all data structures
    this.observers.clear();
    this.debounceTimers.clear();
    this.throttleTimers.clear();
    this.mutationQueue.clear();
    
    // Reset metrics
    this.metrics = {
      totalMutations: 0,
      processedBatches: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0,
      skippedMutations: 0
    };
    
    console.log('[MutationObserverOptimizer] All resources cleaned up');
  }

  /**
   * Configure optimization parameters
   * @param {Object} config - Configuration options
   */
  configure(config) {
    if (config.debounceDelay !== undefined) {
      this.debounceDelay = Math.max(10, config.debounceDelay);
    }
    if (config.throttleDelay !== undefined) {
      this.throttleDelay = Math.max(10, config.throttleDelay);
    }
    if (config.maxBatchSize !== undefined) {
      this.maxBatchSize = Math.max(1, config.maxBatchSize);
    }
    
    console.log('[MutationObserverOptimizer] Configuration updated:', {
      debounceDelay: this.debounceDelay,
      throttleDelay: this.throttleDelay,
      maxBatchSize: this.maxBatchSize
    });
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MutationObserverOptimizer;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
  window.MutationObserverOptimizer = MutationObserverOptimizer;
}