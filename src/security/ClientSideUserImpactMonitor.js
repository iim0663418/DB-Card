/**
 * SEC-08: Client-Side User Impact Monitoring
 * Monitor user experience metrics during security feature deployment
 */

class ClientSideUserImpactMonitor {
  constructor() {
    this.storageKey = 'db-card-user-impact-metrics';
    this.metricsHistoryKey = 'db-card-metrics-history';
    this.maxHistoryEntries = 100;
    this.monitoringActive = false;
    this.metrics = {
      performance: {},
      interactions: {},
      errors: {},
      accessibility: {}
    };
    this.thresholds = {
      pageLoadTime: 3000, // 3 seconds
      interactionDelay: 100, // 100ms
      errorRate: 0.05, // 5%
      accessibilityScore: 0.8 // 80%
    };
    this.observers = [];
    this.startTime = Date.now();
  }

  async initialize() {
    try {
      console.log('[UserImpactMonitor] Initializing user impact monitoring...');
      
      // Load existing metrics
      await this.loadStoredMetrics();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Setup interaction monitoring
      this.setupInteractionMonitoring();
      
      // Setup error monitoring
      this.setupErrorMonitoring();
      
      // Setup accessibility monitoring
      this.setupAccessibilityMonitoring();
      
      // Start monitoring loop
      this.startMonitoringLoop();
      
      this.monitoringActive = true;
      console.log('[UserImpactMonitor] User impact monitoring initialized');
      
      return { success: true };
    } catch (error) {
      console.error('[UserImpactMonitor] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  async loadStoredMetrics() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const storedMetrics = JSON.parse(stored);
        this.metrics = { ...this.metrics, ...storedMetrics };
      }
    } catch (error) {
      console.warn('[UserImpactMonitor] Failed to load stored metrics:', error);
    }
  }

  setupPerformanceMonitoring() {
    // Monitor page load performance
    if ('performance' in window) {
      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.performance.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.metrics.performance.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        this.metrics.performance.firstPaint = this.getFirstPaint();
      }
      
      // Resource timing
      this.monitorResourceTiming();
      
      // Core Web Vitals
      this.monitorCoreWebVitals();
    }
    
    // Memory usage monitoring
    this.monitorMemoryUsage();
  }

  setupInteractionMonitoring() {
    // Click interactions
    document.addEventListener('click', (event) => {
      this.recordInteraction('click', event);
    });
    
    // Form interactions
    document.addEventListener('input', (event) => {
      this.recordInteraction('input', event);
    });
    
    // Scroll interactions
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.recordInteraction('scroll', { scrollY: window.scrollY });
      }, 100);
    });
    
    // Touch interactions (mobile)
    document.addEventListener('touchstart', (event) => {
      this.recordInteraction('touch', event);
    });
  }

  setupErrorMonitoring() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError('javascript', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });
    
    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('promise_rejection', {
        reason: event.reason?.message || String(event.reason)
      });
    });
    
    // Network errors
    this.monitorNetworkErrors();
  }

  setupAccessibilityMonitoring() {
    // Focus management
    document.addEventListener('focusin', (event) => {
      this.recordAccessibilityEvent('focus', {
        element: event.target.tagName,
        hasTabIndex: event.target.hasAttribute('tabindex'),
        isVisible: this.isElementVisible(event.target)
      });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
        this.recordAccessibilityEvent('keyboard_nav', {
          key: event.key,
          element: event.target.tagName
        });
      }
    });
    
    // Screen reader compatibility
    this.checkScreenReaderCompatibility();
  }

  recordInteraction(type, event) {
    const timestamp = Date.now();
    const interactionData = {
      type,
      timestamp,
      element: event.target?.tagName || 'unknown',
      responseTime: this.calculateResponseTime(event)
    };
    
    if (!this.metrics.interactions[type]) {
      this.metrics.interactions[type] = [];
    }
    
    this.metrics.interactions[type].push(interactionData);
    
    // Keep only recent interactions
    if (this.metrics.interactions[type].length > 50) {
      this.metrics.interactions[type] = this.metrics.interactions[type].slice(-50);
    }
    
    // Check for interaction delays
    if (interactionData.responseTime > this.thresholds.interactionDelay) {
      this.recordPerformanceIssue('slow_interaction', {
        type,
        responseTime: interactionData.responseTime,
        threshold: this.thresholds.interactionDelay
      });
    }
  }

  recordError(type, errorData) {
    const timestamp = Date.now();
    const errorRecord = {
      type,
      timestamp,
      ...errorData,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    if (!this.metrics.errors[type]) {
      this.metrics.errors[type] = [];
    }
    
    this.metrics.errors[type].push(errorRecord);
    
    // Keep only recent errors
    if (this.metrics.errors[type].length > 20) {
      this.metrics.errors[type] = this.metrics.errors[type].slice(-20);
    }
    
    // Check error rate
    this.checkErrorRate();
  }

  recordAccessibilityEvent(type, eventData) {
    const timestamp = Date.now();
    
    if (!this.metrics.accessibility[type]) {
      this.metrics.accessibility[type] = [];
    }
    
    this.metrics.accessibility[type].push({
      timestamp,
      ...eventData
    });
    
    // Keep only recent events
    if (this.metrics.accessibility[type].length > 30) {
      this.metrics.accessibility[type] = this.metrics.accessibility[type].slice(-30);
    }
  }

  recordPerformanceIssue(type, issueData) {
    const timestamp = Date.now();
    
    if (!this.metrics.performance.issues) {
      this.metrics.performance.issues = [];
    }
    
    this.metrics.performance.issues.push({
      type,
      timestamp,
      ...issueData
    });
    
    // Alert if critical performance issue
    if (this.isCriticalPerformanceIssue(type, issueData)) {
      this.alertPerformanceDegradation(type, issueData);
    }
  }

  calculateResponseTime(event) {
    // Simple response time calculation
    const now = performance.now();
    return Math.round(now - (event.timeStamp || now));
  }

  getFirstPaint() {
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      return firstPaint ? firstPaint.startTime : null;
    } catch (error) {
      return null;
    }
  }

  monitorResourceTiming() {
    const resources = performance.getEntriesByType('resource');
    const slowResources = resources.filter(resource => 
      resource.duration > 1000 // Resources taking more than 1 second
    );
    
    if (slowResources.length > 0) {
      this.metrics.performance.slowResources = slowResources.map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize
      }));
    }
  }

  monitorCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.performance.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('[UserImpactMonitor] LCP monitoring failed:', error);
      }
      
      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.metrics.performance.fid = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('[UserImpactMonitor] FID monitoring failed:', error);
      }
    }
  }

  monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.performance.memory = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };
      }, 30000); // Every 30 seconds
    }
  }

  monitorNetworkErrors() {
    // Monitor fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.recordError('network', {
            url: args[0],
            status: response.status,
            statusText: response.statusText
          });
        }
        return response;
      } catch (error) {
        this.recordError('network', {
          url: args[0],
          error: error.message
        });
        throw error;
      }
    };
  }

  checkScreenReaderCompatibility() {
    // Check for ARIA attributes
    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-describedby], [role]');
    const totalInteractiveElements = document.querySelectorAll('button, input, select, textarea, a').length;
    
    this.metrics.accessibility.ariaCompliance = {
      elementsWithAria: elementsWithAria.length,
      totalInteractiveElements,
      complianceRatio: totalInteractiveElements > 0 ? elementsWithAria.length / totalInteractiveElements : 0,
      timestamp: Date.now()
    };
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top >= 0 && rect.left >= 0 &&
           rect.bottom <= window.innerHeight && 
           rect.right <= window.innerWidth;
  }

  checkErrorRate() {
    const totalErrors = Object.values(this.metrics.errors)
      .reduce((sum, errorArray) => sum + errorArray.length, 0);
    
    const totalInteractions = Object.values(this.metrics.interactions)
      .reduce((sum, interactionArray) => sum + interactionArray.length, 0);
    
    if (totalInteractions > 0) {
      const errorRate = totalErrors / totalInteractions;
      
      if (errorRate > this.thresholds.errorRate) {
        this.alertHighErrorRate(errorRate);
      }
    }
  }

  isCriticalPerformanceIssue(type, issueData) {
    const criticalTypes = ['slow_interaction', 'memory_leak', 'high_cpu_usage'];
    return criticalTypes.includes(type) || 
           (issueData.responseTime && issueData.responseTime > 1000);
  }

  alertPerformanceDegradation(type, issueData) {
    console.warn(`[UserImpactMonitor] Performance degradation detected: ${type}`, issueData);
    
    // Trigger rollback if severe degradation
    if (window.ClientSideSecurityRollback && this.isSeverePerformanceDegradation(type, issueData)) {
      const rollback = new window.ClientSideSecurityRollback();
      rollback.triggerRollback('performance_degradation', {
        type,
        issueData,
        timestamp: Date.now()
      });
    }
  }

  alertHighErrorRate(errorRate) {
    console.warn(`[UserImpactMonitor] High error rate detected: ${(errorRate * 100).toFixed(2)}%`);
    
    // Trigger rollback if error rate is extremely high
    if (errorRate > 0.1 && window.ClientSideSecurityRollback) { // 10%
      const rollback = new window.ClientSideSecurityRollback();
      rollback.triggerRollback('high_error_rate', {
        errorRate,
        threshold: this.thresholds.errorRate,
        timestamp: Date.now()
      });
    }
  }

  isSeverePerformanceDegradation(type, issueData) {
    return (
      (type === 'slow_interaction' && issueData.responseTime > 2000) ||
      (type === 'memory_leak' && issueData.memoryIncrease > 50000000) || // 50MB
      (type === 'high_cpu_usage' && issueData.cpuUsage > 80)
    );
  }

  startMonitoringLoop() {
    // Periodic metrics collection and analysis
    setInterval(() => {
      this.collectPeriodicMetrics();
      this.analyzeUserImpact();
      this.saveMetrics();
    }, 60000); // Every minute
  }

  collectPeriodicMetrics() {
    // Collect current performance metrics
    if ('performance' in window) {
      this.metrics.performance.currentMemory = performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : null;
      
      this.metrics.performance.timing = {
        now: performance.now(),
        timestamp: Date.now()
      };
    }
    
    // Collect viewport and device info
    this.metrics.performance.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  analyzeUserImpact() {
    const analysis = {
      timestamp: Date.now(),
      performance: this.analyzePerformanceImpact(),
      interactions: this.analyzeInteractionImpact(),
      errors: this.analyzeErrorImpact(),
      accessibility: this.analyzeAccessibilityImpact()
    };
    
    // Store analysis
    if (!this.metrics.analysis) {
      this.metrics.analysis = [];
    }
    
    this.metrics.analysis.push(analysis);
    
    // Keep only recent analyses
    if (this.metrics.analysis.length > 20) {
      this.metrics.analysis = this.metrics.analysis.slice(-20);
    }
    
    // Generate alerts if needed
    this.generateImpactAlerts(analysis);
  }

  analyzePerformanceImpact() {
    const perf = this.metrics.performance;
    
    return {
      pageLoadScore: perf.pageLoadTime ? 
        Math.max(0, 100 - (perf.pageLoadTime / this.thresholds.pageLoadTime * 100)) : null,
      memoryUsage: perf.memory ? 
        (perf.memory.used / perf.memory.limit * 100) : null,
      issueCount: perf.issues ? perf.issues.length : 0
    };
  }

  analyzeInteractionImpact() {
    const interactions = this.metrics.interactions;
    const totalInteractions = Object.values(interactions)
      .reduce((sum, arr) => sum + arr.length, 0);
    
    const slowInteractions = Object.values(interactions)
      .flat()
      .filter(interaction => interaction.responseTime > this.thresholds.interactionDelay)
      .length;
    
    return {
      totalInteractions,
      slowInteractions,
      responsiveness: totalInteractions > 0 ? 
        ((totalInteractions - slowInteractions) / totalInteractions * 100) : 100
    };
  }

  analyzeErrorImpact() {
    const errors = this.metrics.errors;
    const totalErrors = Object.values(errors)
      .reduce((sum, arr) => sum + arr.length, 0);
    
    const recentErrors = Object.values(errors)
      .flat()
      .filter(error => Date.now() - error.timestamp < 300000) // Last 5 minutes
      .length;
    
    return {
      totalErrors,
      recentErrors,
      stability: Math.max(0, 100 - (recentErrors * 10)) // Each recent error reduces stability by 10%
    };
  }

  analyzeAccessibilityImpact() {
    const a11y = this.metrics.accessibility;
    const ariaCompliance = a11y.ariaCompliance;
    
    return {
      ariaComplianceScore: ariaCompliance ? 
        (ariaCompliance.complianceRatio * 100) : null,
      keyboardNavEvents: a11y.keyboard_nav ? a11y.keyboard_nav.length : 0,
      focusEvents: a11y.focus ? a11y.focus.length : 0
    };
  }

  generateImpactAlerts(analysis) {
    const alerts = [];
    
    // Performance alerts
    if (analysis.performance.pageLoadScore !== null && analysis.performance.pageLoadScore < 50) {
      alerts.push({
        type: 'performance',
        severity: 'high',
        message: `Poor page load performance: ${analysis.performance.pageLoadScore.toFixed(1)}%`
      });
    }
    
    // Interaction alerts
    if (analysis.interactions.responsiveness < 80) {
      alerts.push({
        type: 'interaction',
        severity: 'medium',
        message: `Poor interaction responsiveness: ${analysis.interactions.responsiveness.toFixed(1)}%`
      });
    }
    
    // Error alerts
    if (analysis.errors.stability < 70) {
      alerts.push({
        type: 'error',
        severity: 'high',
        message: `Low system stability: ${analysis.errors.stability.toFixed(1)}%`
      });
    }
    
    // Log alerts
    alerts.forEach(alert => {
      console.warn(`[UserImpactMonitor] ${alert.severity.toUpperCase()}: ${alert.message}`);
    });
    
    return alerts;
  }

  async saveMetrics() {
    try {
      // Save current metrics
      localStorage.setItem(this.storageKey, JSON.stringify(this.metrics));
      
      // Save to history
      const historyEntry = {
        timestamp: Date.now(),
        summary: {
          totalInteractions: Object.values(this.metrics.interactions)
            .reduce((sum, arr) => sum + arr.length, 0),
          totalErrors: Object.values(this.metrics.errors)
            .reduce((sum, arr) => sum + arr.length, 0),
          performanceScore: this.calculateOverallPerformanceScore()
        }
      };
      
      const historyKey = this.metricsHistoryKey;
      const stored = localStorage.getItem(historyKey);
      const history = stored ? JSON.parse(stored) : [];
      
      history.unshift(historyEntry);
      
      // Keep only recent history
      if (history.length > this.maxHistoryEntries) {
        history.splice(this.maxHistoryEntries);
      }
      
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('[UserImpactMonitor] Failed to save metrics:', error);
    }
  }

  calculateOverallPerformanceScore() {
    const analysis = this.metrics.analysis;
    if (!analysis || analysis.length === 0) return 100;
    
    const latest = analysis[analysis.length - 1];
    const scores = [
      latest.performance.pageLoadScore || 100,
      latest.interactions.responsiveness || 100,
      latest.errors.stability || 100,
      latest.accessibility.ariaComplianceScore || 100
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  getMetricsSummary() {
    return {
      monitoring: this.monitoringActive,
      uptime: Date.now() - this.startTime,
      performance: {
        pageLoadTime: this.metrics.performance.pageLoadTime,
        memoryUsage: this.metrics.performance.memory,
        overallScore: this.calculateOverallPerformanceScore()
      },
      interactions: {
        total: Object.values(this.metrics.interactions)
          .reduce((sum, arr) => sum + arr.length, 0),
        types: Object.keys(this.metrics.interactions)
      },
      errors: {
        total: Object.values(this.metrics.errors)
          .reduce((sum, arr) => sum + arr.length, 0),
        types: Object.keys(this.metrics.errors)
      },
      accessibility: {
        ariaCompliance: this.metrics.accessibility.ariaCompliance
      }
    };
  }

  async getDetailedMetrics() {
    return {
      ...this.metrics,
      summary: this.getMetricsSummary(),
      history: await this.getMetricsHistory()
    };
  }

  async getMetricsHistory() {
    try {
      const stored = localStorage.getItem(this.metricsHistoryKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[UserImpactMonitor] Failed to get metrics history:', error);
      return [];
    }
  }

  cleanup() {
    // Disconnect observers
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('[UserImpactMonitor] Failed to disconnect observer:', error);
      }
    });
    
    this.observers = [];
    this.monitoringActive = false;
    
    // Save final metrics
    this.saveMetrics();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ClientSideUserImpactMonitor = ClientSideUserImpactMonitor;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientSideUserImpactMonitor;
}