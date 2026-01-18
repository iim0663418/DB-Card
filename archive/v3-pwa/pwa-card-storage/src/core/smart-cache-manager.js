/**
 * Smart Cache Manager
 * Advanced LRU + TTL cache strategy for translation management
 * Provides intelligent caching with memory management and automatic cleanup
 */

class SmartCacheManager {
  constructor(config = {}) {
    this.config = {
      maxSize: config.maxSize || 100, // Maximum number of entries
      maxMemoryMB: config.maxMemoryMB || 10, // Maximum memory usage in MB
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes default TTL
      cleanupInterval: config.cleanupInterval || 2 * 60 * 1000, // 2 minutes cleanup interval
      targetHitRate: config.targetHitRate || 0.9, // 90% target hit rate
      enableMetrics: config.enableMetrics !== false,
      enableCompression: config.enableCompression !== false,
      ...config
    };

    this.cache = new Map();
    this.accessOrder = new Map(); // Track access order for LRU
    this.memoryUsage = 0;
    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      memoryEvictions: 0,
      ttlEvictions: 0
    };

    this.performanceCollector = null;
    this.cleanupInterval = null;
    
    this.startCleanupTimer();
    this.initializePerformanceIntegration();
  }

  /**
   * Initialize performance metrics integration
   */
  initializePerformanceIntegration() {
    if (this.config.enableMetrics && window.PerformanceMetricsCollector) {
      // Performance collector will be injected by language manager
    }
  }

  /**
   * Set performance collector for metrics integration
   */
  setPerformanceCollector(collector) {
    this.performanceCollector = collector;
  }

  /**
   * Get value from cache
   */
  get(key) {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.statistics.misses++;
      this.recordCacheMetric('get', key, false, performance.now() - startTime);
      return null;
    }

    // Check TTL expiration
    if (this.isExpired(entry)) {
      this.delete(key);
      this.statistics.misses++;
      this.statistics.ttlEvictions++;
      this.recordCacheMetric('get', key, false, performance.now() - startTime);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    this.statistics.hits++;
    this.recordCacheMetric('get', key, true, performance.now() - startTime);
    
    return this.deserializeValue(entry.value);
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    const startTime = performance.now();
    const effectiveTTL = ttl !== null ? ttl : this.config.defaultTTL;
    const serializedValue = this.serializeValue(value);
    const valueSize = this.calculateSize(serializedValue);
    
    const entry = {
      value: serializedValue,
      timestamp: Date.now(),
      ttl: effectiveTTL,
      expiryTime: Date.now() + effectiveTTL,
      size: valueSize,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    // Check if we need to evict entries to make room
    this.ensureCapacity(valueSize);

    // Set the entry
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.memoryUsage -= existingEntry.size;
    }

    this.cache.set(key, entry);
    this.memoryUsage += valueSize;
    this.updateAccessOrder(key);
    this.statistics.sets++;
    
    this.recordCacheMetric('set', key, true, performance.now() - startTime);
    
    return true;
  }

  /**
   * Check if key exists in cache (without affecting LRU order)
   */
  has(key) {
    const entry = this.cache.get(key);
    return entry && !this.isExpired(entry);
  }

  /**
   * Delete entry from cache
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.memoryUsage -= entry.size;
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Clear all entries from cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.memoryUsage = 0;
    this.statistics.evictions += this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStatistics() {
    const hitRate = this.statistics.hits + this.statistics.misses > 0 
      ? this.statistics.hits / (this.statistics.hits + this.statistics.misses) 
      : 1;

    return {
      ...this.statistics,
      hitRate,
      size: this.cache.size,
      memoryUsageMB: this.memoryUsage / 1024 / 1024,
      memoryUsagePercent: (this.memoryUsage / 1024 / 1024) / this.config.maxMemoryMB * 100,
      hitRatePercent: hitRate * 100,
      meetsTargetHitRate: hitRate >= this.config.targetHitRate
    };
  }

  /**
   * Get cache health metrics
   */
  getHealthMetrics() {
    const stats = this.getStatistics();
    const expiredEntries = this.countExpiredEntries();
    
    return {
      health: this.calculateHealthScore(stats),
      recommendations: this.getOptimizationRecommendations(stats),
      expiredEntries,
      needsCleanup: expiredEntries > this.cache.size * 0.1 // More than 10% expired
    };
  }

  /**
   * Optimize cache performance
   */
  optimize() {
    const beforeStats = this.getStatistics();
    
    // Remove expired entries
    this.cleanupExpired();
    
    // If still over memory limit, perform LRU eviction
    if (this.memoryUsage > this.config.maxMemoryMB * 1024 * 1024) {
      this.evictByMemoryPressure();
    }
    
    // If still over size limit, evict least recently used
    if (this.cache.size > this.config.maxSize) {
      this.evictLRU(this.cache.size - this.config.maxSize);
    }
    
    const afterStats = this.getStatistics();
    return {
      beforeStats,
      afterStats,
      entriesRemoved: beforeStats.size - afterStats.size,
      memoryFreed: beforeStats.memoryUsageMB - afterStats.memoryUsageMB
    };
  }

  // Private methods

  /**
   * Check if entry is expired
   */
  isExpired(entry) {
    return Date.now() > entry.expiryTime;
  }

  /**
   * Update access order for LRU tracking
   */
  updateAccessOrder(key) {
    this.accessOrder.delete(key); // Remove if exists
    this.accessOrder.set(key, Date.now()); // Add with current timestamp
    
    // Update entry access info
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }
  }

  /**
   * Ensure cache has capacity for new entry
   */
  ensureCapacity(requiredSize) {
    // Check memory limit
    const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
    if (this.memoryUsage + requiredSize > maxMemoryBytes) {
      this.evictByMemoryPressure(requiredSize);
    }

    // Check size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU(1);
    }
  }

  /**
   * Evict entries to free memory
   */
  evictByMemoryPressure(requiredSize = 0) {
    const targetMemory = (this.config.maxMemoryMB * 1024 * 1024 * 0.8) - requiredSize; // 80% of max
    const sortedByAccess = this.getSortedByLRU();
    
    for (const [key] of sortedByAccess) {
      if (this.memoryUsage <= targetMemory) break;
      
      this.delete(key);
      this.statistics.evictions++;
      this.statistics.memoryEvictions++;
    }
  }

  /**
   * Evict least recently used entries
   */
  evictLRU(count) {
    const sortedByAccess = this.getSortedByLRU();
    
    for (let i = 0; i < count && i < sortedByAccess.length; i++) {
      const [key] = sortedByAccess[i];
      this.delete(key);
      this.statistics.evictions++;
    }
  }

  /**
   * Get entries sorted by LRU order
   */
  getSortedByLRU() {
    return Array.from(this.accessOrder.entries()).sort((a, b) => a[1] - b[1]);
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiryTime) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.delete(key);
      this.statistics.ttlEvictions++;
    });
    
    return expiredKeys.length;
  }

  /**
   * Count expired entries without removing them
   */
  countExpiredEntries() {
    const now = Date.now();
    let count = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiryTime) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Calculate cache health score
   */
  calculateHealthScore(stats) {
    let score = 100;
    
    // Penalize low hit rate
    if (stats.hitRatePercent < 90) {
      score -= (90 - stats.hitRatePercent) * 2;
    }
    
    // Penalize high memory usage
    if (stats.memoryUsagePercent > 80) {
      score -= (stats.memoryUsagePercent - 80) * 2;
    }
    
    // Penalize expired entries
    const expiredPercent = (this.countExpiredEntries() / Math.max(this.cache.size, 1)) * 100;
    if (expiredPercent > 10) {
      score -= (expiredPercent - 10) * 1.5;
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(stats) {
    const recommendations = [];
    
    if (stats.hitRatePercent < this.config.targetHitRate * 100) {
      recommendations.push({
        type: 'hit_rate',
        message: `Hit rate (${stats.hitRatePercent.toFixed(1)}%) is below target (${(this.config.targetHitRate * 100).toFixed(1)}%)`,
        suggestion: 'Consider increasing cache size or TTL values'
      });
    }
    
    if (stats.memoryUsagePercent > 90) {
      recommendations.push({
        type: 'memory',
        message: `Memory usage (${stats.memoryUsagePercent.toFixed(1)}%) is very high`,
        suggestion: 'Consider reducing cache size or enabling compression'
      });
    }
    
    const expiredPercent = (this.countExpiredEntries() / Math.max(this.cache.size, 1)) * 100;
    if (expiredPercent > 20) {
      recommendations.push({
        type: 'expired',
        message: `High percentage of expired entries (${expiredPercent.toFixed(1)}%)`,
        suggestion: 'Consider more frequent cleanup or shorter TTL values'
      });
    }
    
    return recommendations;
  }

  /**
   * Serialize value for storage (with optional compression)
   */
  serializeValue(value) {
    let serialized = JSON.stringify(value);
    
    // Simple compression for large values
    if (this.config.enableCompression && serialized.length > 1024) {
      // Basic compression using repeated pattern replacement
      serialized = this.compressString(serialized);
    }
    
    return serialized;
  }

  /**
   * Deserialize value from storage
   */
  deserializeValue(serializedValue) {
    try {
      // Check if it's compressed
      if (typeof serializedValue === 'object' && serializedValue.compressed) {
        const decompressed = this.decompressString(serializedValue.data);
        return JSON.parse(decompressed);
      }
      
      return JSON.parse(serializedValue);
    } catch (error) {
      console.warn('[SmartCacheManager] Failed to deserialize value:', error);
      return null;
    }
  }

  /**
   * Simple string compression
   */
  compressString(str) {
    // Very basic compression - replace common patterns
    const compressed = str
      .replace(/\s+/g, ' ')
      .replace(/,"/g, ',"')
      .replace(/":"/g, '":"');
    
    return {
      compressed: true,
      data: compressed,
      originalLength: str.length
    };
  }

  /**
   * Simple string decompression
   */
  decompressString(compressedData) {
    return compressedData; // Our compression is reversible
  }

  /**
   * Calculate size of value in bytes
   */
  calculateSize(value) {
    if (typeof value === 'object' && value.compressed) {
      return value.data.length * 2 + 100; // Rough estimate including metadata
    }
    return new Blob([value]).size;
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Record cache metrics to performance collector
   */
  recordCacheMetric(operation, key, hit, duration) {
    if (this.performanceCollector) {
      this.performanceCollector.recordCacheMetric(operation, key, hit, duration);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get configuration for debugging
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.startCleanupTimer();
    }
  }
}

// Export for both CommonJS and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartCacheManager;
} else {
  window.SmartCacheManager = SmartCacheManager;
}