/**
 * Performance Optimizer for Unified Language Switching Architecture (LANG-12)
 * Optimizes language switching performance and memory management
 * 
 * @version 3.1.4-language-architecture
 * @author code-executor
 * @since 2025-08-06
 */

class PerformanceOptimizer {
  constructor() {
    this.performanceMetrics = {
      languageSwitchTimes: [],
      componentUpdateTimes: [],
      memoryUsage: [],
      cacheHitRates: new Map(),
      errorRecoveryTimes: []
    };
    
    this.optimizationConfig = {
      maxCacheSize: 100,
      batchUpdateDelay: 16, // ~60fps
      memoryCleanupThreshold: 50, // MB
      performanceMonitoringInterval: 5000, // 5 seconds
      maxRetryAttempts: 3
    };
    
    this.performanceMonitor = null;
    this.isOptimizing = false;
  }

  /**
   * Initialize performance optimizer
   */
  initialize(enhancedLanguageManager) {
    this.enhancedLanguageManager = enhancedLanguageManager;
    this.startPerformanceMonitoring();
    this.optimizeTranslationCache();
    this.setupBatchUpdateOptimization();
    this.initializeMemoryManagement();
    
    console.log('🚀 Performance Optimizer initialized');
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }

    this.performanceMonitor = setInterval(() => {
      this.collectPerformanceMetrics();
      this.analyzePerformance();
      this.applyOptimizations();
    }, this.optimizationConfig.performanceMonitoringInterval);
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics() {
    try {
      // Collect memory usage (simulated for client-side)
      const memoryUsage = this.estimateMemoryUsage();
      this.performanceMetrics.memoryUsage.push({
        timestamp: Date.now(),
        usage: memoryUsage
      });

      // Keep only recent metrics (last 100 entries)
      if (this.performanceMetrics.memoryUsage.length > 100) {
        this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-100);
      }

      // Collect cache hit rates
      if (this.enhancedLanguageManager?.translationRegistry) {
        const cacheStats = this.enhancedLanguageManager.translationRegistry.getCacheStats();
        this.performanceMetrics.cacheHitRates.set(Date.now(), cacheStats);
      }

    } catch (error) {
      console.warn('Performance metrics collection failed:', error);
    }
  }

  /**
   * Analyze performance and identify bottlenecks
   */
  analyzePerformance() {
    const analysis = {
      avgLanguageSwitchTime: this.calculateAverageLanguageSwitchTime(),
      memoryTrend: this.analyzeMemoryTrend(),
      cacheEfficiency: this.analyzeCacheEfficiency(),
      errorRate: this.calculateErrorRate()
    };

    // Log performance warnings
    if (analysis.avgLanguageSwitchTime > 300) {
      console.warn(`⚠️ Language switching performance degraded: ${analysis.avgLanguageSwitchTime.toFixed(2)}ms`);
    }

    if (analysis.memoryTrend > 10) {
      console.warn(`⚠️ Memory usage increasing: ${analysis.memoryTrend.toFixed(2)}MB trend`);
    }

    if (analysis.cacheEfficiency < 0.8) {
      console.warn(`⚠️ Cache efficiency low: ${(analysis.cacheEfficiency * 100).toFixed(1)}%`);
    }

    return analysis;
  }

  /**
   * Apply performance optimizations
   */
  applyOptimizations() {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;

    try {
      // Optimize translation cache
      this.optimizeTranslationCache();
      
      // Clean up memory if needed
      this.performMemoryCleanup();
      
      // Optimize observer updates
      this.optimizeObserverUpdates();
      
    } catch (error) {
      console.error('Performance optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize translation cache
   */
  optimizeTranslationCache() {
    if (!this.enhancedLanguageManager?.translationRegistry) return;

    const registry = this.enhancedLanguageManager.translationRegistry;
    
    // Implement LRU cache optimization
    if (registry.optimizeCache) {
      registry.optimizeCache(this.optimizationConfig.maxCacheSize);
    }

    // Preload frequently used translations
    this.preloadFrequentTranslations();
  }

  /**
   * Preload frequently used translations
   */
  preloadFrequentTranslations() {
    const frequentKeys = [
      'pwa.cardList.title',
      'pwa.cardList.searchPlaceholder',
      'security.userCommunication.containerLabel',
      'accessibility.ariaLabels.systemNotifications',
      'accessibility.screenReaderTexts.languageChanged'
    ];

    const languages = ['zh', 'en'];
    
    if (this.enhancedLanguageManager?.translationRegistry) {
      languages.forEach(lang => {
        frequentKeys.forEach(key => {
          // Preload by accessing (will cache)
          this.enhancedLanguageManager.translationRegistry.getTranslation(lang, key);
        });
      });
    }
  }

  /**
   * Setup batch update optimization
   */
  setupBatchUpdateOptimization() {
    if (!this.enhancedLanguageManager?.unifiedObserver) return;

    const observer = this.enhancedLanguageManager.unifiedObserver;
    
    // Override notifyLanguageChange with batched version
    const originalNotify = observer.notifyLanguageChange.bind(observer);
    let batchTimeout = null;
    let pendingUpdates = [];

    observer.notifyLanguageChange = (oldLang, newLang) => {
      pendingUpdates.push({ oldLang, newLang, timestamp: Date.now() });

      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }

      batchTimeout = setTimeout(async () => {
        if (pendingUpdates.length > 0) {
          const latestUpdate = pendingUpdates[pendingUpdates.length - 1];
          pendingUpdates = [];
          
          const startTime = performance.now();
          await originalNotify(latestUpdate.oldLang, latestUpdate.newLang);
          const endTime = performance.now();
          
          this.recordComponentUpdateTime(endTime - startTime);
        }
      }, this.optimizationConfig.batchUpdateDelay);
    };
  }

  /**
   * Initialize memory management
   */
  initializeMemoryManagement() {
    // Setup periodic memory cleanup
    setInterval(() => {
      this.performMemoryCleanup();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    const currentMemory = this.estimateMemoryUsage();
    
    if (currentMemory > this.optimizationConfig.memoryCleanupThreshold) {
      console.log('🧹 Performing memory cleanup...');
      
      // Clean up old performance metrics
      this.cleanupOldMetrics();
      
      // Clean up translation cache
      if (this.enhancedLanguageManager?.translationRegistry?.clearOldCache) {
        this.enhancedLanguageManager.translationRegistry.clearOldCache();
      }
      
      // Clean up observer references
      this.cleanupObserverReferences();
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      }
    }
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const maxAge = 300000; // 5 minutes
    const now = Date.now();

    // Clean up memory usage metrics
    this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage
      .filter(metric => now - metric.timestamp < maxAge);

    // Clean up cache hit rates
    for (const [timestamp] of this.performanceMetrics.cacheHitRates) {
      if (now - timestamp > maxAge) {
        this.performanceMetrics.cacheHitRates.delete(timestamp);
      }
    }

    // Keep only recent performance times
    if (this.performanceMetrics.languageSwitchTimes.length > 50) {
      this.performanceMetrics.languageSwitchTimes = 
        this.performanceMetrics.languageSwitchTimes.slice(-50);
    }

    if (this.performanceMetrics.componentUpdateTimes.length > 50) {
      this.performanceMetrics.componentUpdateTimes = 
        this.performanceMetrics.componentUpdateTimes.slice(-50);
    }
  }

  /**
   * Clean up observer references
   */
  cleanupObserverReferences() {
    if (this.enhancedLanguageManager?.unifiedObserver) {
      const observer = this.enhancedLanguageManager.unifiedObserver;
      
      // Remove inactive observers
      if (observer.cleanupInactiveObservers) {
        observer.cleanupInactiveObservers();
      }
    }
  }

  /**
   * Optimize observer updates
   */
  optimizeObserverUpdates() {
    if (!this.enhancedLanguageManager?.unifiedObserver) return;

    const observer = this.enhancedLanguageManager.unifiedObserver;
    
    // Implement smart update scheduling
    if (observer.optimizeUpdateScheduling) {
      observer.optimizeUpdateScheduling();
    }
  }

  /**
   * Record language switch time
   */
  recordLanguageSwitchTime(duration) {
    this.performanceMetrics.languageSwitchTimes.push({
      duration,
      timestamp: Date.now()
    });

    // Keep only recent measurements
    if (this.performanceMetrics.languageSwitchTimes.length > 100) {
      this.performanceMetrics.languageSwitchTimes = 
        this.performanceMetrics.languageSwitchTimes.slice(-100);
    }
  }

  /**
   * Record component update time
   */
  recordComponentUpdateTime(duration) {
    this.performanceMetrics.componentUpdateTimes.push({
      duration,
      timestamp: Date.now()
    });

    // Keep only recent measurements
    if (this.performanceMetrics.componentUpdateTimes.length > 100) {
      this.performanceMetrics.componentUpdateTimes = 
        this.performanceMetrics.componentUpdateTimes.slice(-100);
    }
  }

  /**
   * Calculate average language switch time
   */
  calculateAverageLanguageSwitchTime() {
    if (this.performanceMetrics.languageSwitchTimes.length === 0) return 0;

    const recentTimes = this.performanceMetrics.languageSwitchTimes
      .slice(-20) // Last 20 measurements
      .map(metric => metric.duration);

    return recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
  }

  /**
   * Analyze memory trend
   */
  analyzeMemoryTrend() {
    if (this.performanceMetrics.memoryUsage.length < 2) return 0;

    const recent = this.performanceMetrics.memoryUsage.slice(-10);
    const first = recent[0].usage;
    const last = recent[recent.length - 1].usage;

    return last - first;
  }

  /**
   * Analyze cache efficiency
   */
  analyzeCacheEfficiency() {
    if (this.performanceMetrics.cacheHitRates.size === 0) return 1;

    const recentStats = Array.from(this.performanceMetrics.cacheHitRates.values()).slice(-5);
    
    if (recentStats.length === 0) return 1;

    const totalHits = recentStats.reduce((sum, stats) => sum + (stats.hits || 0), 0);
    const totalRequests = recentStats.reduce((sum, stats) => sum + (stats.requests || 1), 0);

    return totalRequests > 0 ? totalHits / totalRequests : 1;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    if (this.performanceMetrics.errorRecoveryTimes.length === 0) return 0;

    const recentErrors = this.performanceMetrics.errorRecoveryTimes.slice(-20);
    const totalOperations = this.performanceMetrics.languageSwitchTimes.length;

    return totalOperations > 0 ? recentErrors.length / totalOperations : 0;
  }

  /**
   * Estimate memory usage (client-side approximation)
   */
  estimateMemoryUsage() {
    // Simulate memory usage calculation
    let estimatedUsage = 10; // Base usage

    // Add translation cache size
    if (this.enhancedLanguageManager?.translationRegistry) {
      estimatedUsage += 5; // Estimated cache size
    }

    // Add observer overhead
    if (this.enhancedLanguageManager?.unifiedObserver) {
      const observerCount = this.enhancedLanguageManager.unifiedObserver.getObserverCount?.() || 0;
      estimatedUsage += observerCount * 0.1;
    }

    // Add metrics overhead
    estimatedUsage += this.performanceMetrics.languageSwitchTimes.length * 0.001;
    estimatedUsage += this.performanceMetrics.memoryUsage.length * 0.001;

    return estimatedUsage;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      metrics: {
        avgLanguageSwitchTime: this.calculateAverageLanguageSwitchTime(),
        memoryTrend: this.analyzeMemoryTrend(),
        cacheEfficiency: this.analyzeCacheEfficiency(),
        errorRate: this.calculateErrorRate(),
        currentMemoryUsage: this.estimateMemoryUsage()
      },
      recommendations: this.generateOptimizationRecommendations(),
      config: this.optimizationConfig,
      isOptimizing: this.isOptimizing
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations() {
    const recommendations = [];
    const avgSwitchTime = this.calculateAverageLanguageSwitchTime();
    const memoryTrend = this.analyzeMemoryTrend();
    const cacheEfficiency = this.analyzeCacheEfficiency();

    if (avgSwitchTime > 300) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Language switching performance is degraded. Consider reducing observer count or optimizing update logic.',
        action: 'optimize_observers'
      });
    }

    if (memoryTrend > 10) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'Memory usage is increasing. Consider more frequent cleanup or reducing cache size.',
        action: 'increase_cleanup_frequency'
      });
    }

    if (cacheEfficiency < 0.8) {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        message: 'Cache efficiency is low. Consider preloading more frequently used translations.',
        action: 'optimize_cache_strategy'
      });
    }

    return recommendations;
  }

  /**
   * Apply optimization recommendation
   */
  applyRecommendation(recommendation) {
    switch (recommendation.action) {
      case 'optimize_observers':
        this.optimizeObserverUpdates();
        break;
      case 'increase_cleanup_frequency':
        this.optimizationConfig.memoryCleanupThreshold *= 0.8;
        break;
      case 'optimize_cache_strategy':
        this.optimizeTranslationCache();
        this.preloadFrequentTranslations();
        break;
      default:
        console.warn('Unknown optimization recommendation:', recommendation.action);
    }
  }

  /**
   * Cleanup and stop performance optimizer
   */
  cleanup() {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = null;
    }

    // Clear metrics
    this.performanceMetrics = {
      languageSwitchTimes: [],
      componentUpdateTimes: [],
      memoryUsage: [],
      cacheHitRates: new Map(),
      errorRecoveryTimes: []
    };

    this.enhancedLanguageManager = null;
    this.isOptimizing = false;

    console.log('🧹 Performance Optimizer cleaned up');
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceOptimizer;
} else if (typeof window !== 'undefined') {
  window.PerformanceOptimizer = PerformanceOptimizer;
}