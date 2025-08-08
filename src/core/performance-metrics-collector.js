/**
 * Performance Metrics Collector
 * Client-side performance monitoring using browser Performance API
 * Tracks language switching times, memory usage, and cache performance
 */

class PerformanceMetricsCollector {
  constructor(config = {}) {
    this.config = {
      maxStorageSize: config.maxStorageSize || 1024 * 1024, // 1MB
      slaTarget: config.slaTarget || 150, // ms for language switching
      enableDashboard: config.enableDashboard !== false,
      storageKey: config.storageKey || 'pwa-perf-metrics',
      retentionDays: config.retentionDays || 7,
      ...config
    };
    
    this.metrics = new Map();
    this.observers = [];
    this.sessionStart = performance.now();
    this.isDashboardVisible = false;
    
    this.initializePerformanceObserver();
    this.loadStoredMetrics();
    this.setupDashboard();
  }

  /**
   * Initialize Performance Observer for automatic metrics collection
   */
  initializePerformanceObserver() {
    if (!('PerformanceObserver' in window)) {
      console.warn('[PerformanceMetricsCollector] PerformanceObserver not supported');
      return;
    }

    try {
      // Observe navigation and resource timings
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordPerformanceEntry(entry);
        });
      });
      
      observer.observe({ entryTypes: ['navigation', 'resource', 'measure', 'mark'] });
      this.observers.push(observer);
      
      // Observe memory usage if available
      if ('memory' in performance) {
        this.startMemoryMonitoring();
      }
    } catch (error) {
      console.warn('[PerformanceMetricsCollector] Failed to initialize PerformanceObserver:', error);
    }
  }

  /**
   * Start language switching performance measurement
   */
  startLanguageSwitching(fromLang, toLang) {
    const markName = `language-switch-start-${Date.now()}`;
    performance.mark(markName);
    
    return {
      markName,
      startTime: performance.now(),
      fromLanguage: fromLang,
      toLanguage: toLang,
      complete: (additionalData = {}) => {
        const endTime = performance.now();
        const duration = endTime - performance.now();
        const endMarkName = `language-switch-end-${Date.now()}`;
        
        performance.mark(endMarkName);
        performance.measure(`language-switch-${fromLang}-${toLang}`, markName, endMarkName);
        
        this.recordLanguageSwitchMetric({
          fromLanguage: fromLang,
          toLanguage: toLang,
          duration: endTime - this.getMarkTime(markName),
          timestamp: Date.now(),
          meetsSLA: duration <= this.config.slaTarget,
          ...additionalData
        });
      }
    };
  }

  /**
   * Record cache performance metrics
   */
  recordCacheMetric(operation, key, hit, duration = 0) {
    const metric = {
      operation, // 'get', 'set', 'evict'
      key: this.sanitizeKey(key),
      hit,
      duration,
      timestamp: Date.now()
    };
    
    this.addMetric('cache', metric);
    
    // Update cache hit rate
    this.updateCacheHitRate(hit);
  }

  /**
   * Record memory usage metrics
   */
  recordMemoryMetric(context = 'general') {
    if (!('memory' in performance)) return;
    
    const memory = performance.memory;
    const metric = {
      context,
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };
    
    this.addMetric('memory', metric);
  }

  /**
   * Record DOM update performance
   */
  recordDOMUpdateMetric(elementCount, duration, context = 'general') {
    const metric = {
      context,
      elementCount,
      duration,
      timestamp: Date.now(),
      meetsSLA: duration <= 100 // 100ms SLA for DOM updates
    };
    
    this.addMetric('dom-update', metric);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      session: {
        startTime: this.sessionStart,
        duration: performance.now() - this.sessionStart
      },
      languageSwitching: this.getLanguageSwitchingSummary(),
      cache: this.getCacheSummary(),
      memory: this.getMemorySummary(),
      domUpdates: this.getDOMUpdateSummary()
    };
    
    return summary;
  }

  /**
   * Setup performance dashboard (accessible via /?perf=1)
   */
  setupDashboard() {
    if (!this.config.enableDashboard) return;
    
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('perf') === '1') {
      this.showDashboard();
    }
  }

  /**
   * Show performance dashboard
   */
  showDashboard() {
    if (this.isDashboardVisible) return;
    
    const dashboard = this.createDashboardElement();
    document.body.appendChild(dashboard);
    this.isDashboardVisible = true;
    
    // Update dashboard every 5 seconds
    const updateInterval = setInterval(() => {
      if (!this.isDashboardVisible) {
        clearInterval(updateInterval);
        return;
      }
      this.updateDashboard(dashboard);
    }, 5000);
  }

  /**
   * Create dashboard DOM element
   */
  createDashboardElement() {
    const dashboard = document.createElement('div');
    dashboard.id = 'performance-dashboard';
    dashboard.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 400px;
      max-height: 500px;
      overflow-y: auto;
      background: #1a1a1a;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 15px;
      border: 2px solid #00ff00;
      border-radius: 5px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 255, 0, 0.3);
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: none;
      border: none;
      color: #ff0000;
      font-size: 18px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => this.closeDashboard();
    dashboard.appendChild(closeBtn);
    
    // Content container
    const content = document.createElement('div');
    content.id = 'dashboard-content';
    dashboard.appendChild(content);
    
    this.updateDashboard(dashboard);
    return dashboard;
  }

  /**
   * Update dashboard content
   */
  updateDashboard(dashboard) {
    const content = dashboard.querySelector('#dashboard-content');
    const summary = this.getPerformanceSummary();
    
    content.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #00ff00;">=Ê Performance Metrics</h3>
      
      <div style="margin-bottom: 10px;">
        <strong>Session:</strong> ${Math.round(summary.session.duration / 1000)}s
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Language Switching (SLA: ${this.config.slaTarget}ms):</strong><br>
        " Count: ${summary.languageSwitching.totalCount}<br>
        " Avg: ${summary.languageSwitching.averageDuration.toFixed(1)}ms<br>
        " SLA: ${summary.languageSwitching.slaCompliance.toFixed(1)}%<br>
        " Status: ${summary.languageSwitching.averageDuration <= this.config.slaTarget ? '' : 'L'}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Cache Performance:</strong><br>
        " Hit Rate: ${summary.cache.hitRate.toFixed(1)}%<br>
        " Total Ops: ${summary.cache.totalOperations}<br>
        " Status: ${summary.cache.hitRate >= 90 ? '' : 'L'}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Memory Usage:</strong><br>
        " Current: ${(summary.memory.currentUsage / 1024 / 1024).toFixed(1)} MB<br>
        " Peak: ${(summary.memory.peakUsage / 1024 / 1024).toFixed(1)} MB<br>
        " Growth: ${summary.memory.growthFromBaseline.toFixed(1)} MB
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>DOM Updates (SLA: 100ms):</strong><br>
        " Count: ${summary.domUpdates.totalCount}<br>
        " Avg: ${summary.domUpdates.averageDuration.toFixed(1)}ms<br>
        " SLA: ${summary.domUpdates.slaCompliance.toFixed(1)}%
      </div>
    `;
  }

  // Helper methods for metrics processing
  getLanguageSwitchingSummary() {
    const metrics = this.metrics.get('language-switch') || [];
    if (metrics.length === 0) return { totalCount: 0, averageDuration: 0, slaCompliance: 100 };
    
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const slaCompliant = metrics.filter(m => m.meetsSLA).length;
    
    return {
      totalCount: metrics.length,
      averageDuration: totalDuration / metrics.length,
      slaCompliance: (slaCompliant / metrics.length) * 100
    };
  }

  getCacheSummary() {
    const metrics = this.metrics.get('cache') || [];
    if (metrics.length === 0) return { hitRate: 100, totalOperations: 0 };
    
    const hits = metrics.filter(m => m.hit).length;
    
    return {
      hitRate: (hits / metrics.length) * 100,
      totalOperations: metrics.length
    };
  }

  getMemorySummary() {
    const metrics = this.metrics.get('memory') || [];
    if (metrics.length === 0) return { currentUsage: 0, peakUsage: 0, growthFromBaseline: 0 };
    
    const latest = metrics[metrics.length - 1];
    const baseline = metrics[0];
    const peak = Math.max(...metrics.map(m => m.usedJSHeapSize));
    
    return {
      currentUsage: latest.usedJSHeapSize,
      peakUsage: peak,
      growthFromBaseline: (latest.usedJSHeapSize - baseline.usedJSHeapSize) / 1024 / 1024
    };
  }

  getDOMUpdateSummary() {
    const metrics = this.metrics.get('dom-update') || [];
    if (metrics.length === 0) return { totalCount: 0, averageDuration: 0, slaCompliance: 100 };
    
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const slaCompliant = metrics.filter(m => m.meetsSLA).length;
    
    return {
      totalCount: metrics.length,
      averageDuration: totalDuration / metrics.length,
      slaCompliance: (slaCompliant / metrics.length) * 100
    };
  }

  // Utility methods
  addMetric(type, metric) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    
    const typeMetrics = this.metrics.get(type);
    typeMetrics.push(metric);
    
    // Limit metrics to prevent memory bloat
    if (typeMetrics.length > 1000) {
      typeMetrics.shift();
    }
    
    this.persistMetrics();
  }

  recordLanguageSwitchMetric(metric) {
    this.addMetric('language-switch', metric);
  }

  updateCacheHitRate(hit) {
    // This is handled in recordCacheMetric
  }

  startMemoryMonitoring() {
    const monitorInterval = setInterval(() => {
      this.recordMemoryMetric('periodic');
    }, 10000); // Every 10 seconds
    
    // Store interval for cleanup
    this.memoryMonitorInterval = monitorInterval;
  }

  sanitizeKey(key) {
    // Remove sensitive information from cache keys for logging
    return String(key).substring(0, 50);
  }

  getMarkTime(markName) {
    const entries = performance.getEntriesByName(markName, 'mark');
    return entries.length > 0 ? entries[0].startTime : performance.now();
  }

  recordPerformanceEntry(entry) {
    if (entry.name.startsWith('language-switch')) {
      // Already handled by manual measurement
      return;
    }
    
    // Record other performance entries as needed
  }

  persistMetrics() {
    try {
      const data = Object.fromEntries(this.metrics);
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
        sessionStart: this.sessionStart
      });
      
      // Check storage size
      if (serialized.length > this.config.maxStorageSize) {
        this.compactMetrics();
        return;
      }
      
      localStorage.setItem(this.config.storageKey, serialized);
    } catch (error) {
      console.warn('[PerformanceMetricsCollector] Failed to persist metrics:', error);
    }
  }

  loadStoredMetrics() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;
      
      const parsed = JSON.parse(stored);
      const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      // Filter out old metrics
      Object.entries(parsed.data).forEach(([type, metrics]) => {
        const filtered = metrics.filter(m => m.timestamp > cutoff);
        if (filtered.length > 0) {
          this.metrics.set(type, filtered);
        }
      });
    } catch (error) {
      console.warn('[PerformanceMetricsCollector] Failed to load stored metrics:', error);
    }
  }

  compactMetrics() {
    // Keep only recent metrics to stay within storage limits
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 1 day
    
    this.metrics.forEach((metrics, type) => {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(type, filtered.slice(-500)); // Keep max 500 per type
    });
    
    this.persistMetrics();
  }

  closeDashboard() {
    const dashboard = document.getElementById('performance-dashboard');
    if (dashboard) {
      dashboard.remove();
      this.isDashboardVisible = false;
    }
  }

  cleanup() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Clean up memory monitoring
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    // Close dashboard
    this.closeDashboard();
  }
}

// Export for both CommonJS and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMetricsCollector;
} else {
  window.PerformanceMetricsCollector = PerformanceMetricsCollector;
}