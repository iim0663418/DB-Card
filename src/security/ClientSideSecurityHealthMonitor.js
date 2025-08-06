/**
 * Client-Side Security Health Monitor (Enhanced)
 * Real-time monitoring of security module health and performance impact
 */

class ClientSideSecurityHealthMonitor {
  constructor() {
    this.dbName = 'PWASecurityHealth';
    this.dbVersion = 1;
    this.db = null;
    this.monitoring = false;
    this.healthMetrics = {
      modules: new Map(),
      performance: new Map(),
      errors: [],
      alerts: []
    };
    this.thresholds = {
      errorRate: 0.05, // 5% error rate threshold
      responseTime: 1000, // 1 second response time threshold
      memoryUsage: 50 * 1024 * 1024, // 50MB memory threshold
      storageUsage: 0.8 // 80% storage usage threshold
    };
  }

  /**
   * Initialize health monitoring system
   */
  async initialize() {
    try {
      await this._initDatabase();
      await this._loadHealthMetrics();
      this._setupPerformanceMonitoring();
      this._startHealthChecks();
      
      this.monitoring = true;
      
      return { success: true, monitoring: true };
    } catch (error) {
      console.error('[HealthMonitor] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize IndexedDB for health data storage
   */
  async _initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Health metrics store
        if (!db.objectStoreNames.contains('healthMetrics')) {
          const healthStore = db.createObjectStore('healthMetrics', { keyPath: 'id', autoIncrement: true });
          healthStore.createIndex('timestamp', 'timestamp');
          healthStore.createIndex('module', 'module');
          healthStore.createIndex('type', 'type');
        }
        
        // Performance metrics store
        if (!db.objectStoreNames.contains('performanceMetrics')) {
          const perfStore = db.createObjectStore('performanceMetrics', { keyPath: 'id', autoIncrement: true });
          perfStore.createIndex('timestamp', 'timestamp');
          perfStore.createIndex('operation', 'operation');
        }
        
        // Security events store
        if (!db.objectStoreNames.contains('securityEvents')) {
          const eventStore = db.createObjectStore('securityEvents', { keyPath: 'id', autoIncrement: true });
          eventStore.createIndex('timestamp', 'timestamp');
          eventStore.createIndex('severity', 'severity');
          eventStore.createIndex('module', 'module');
        }
      };
    });
  }

  /**
   * Record security module health status
   */
  async recordModuleHealth(moduleName, status, metrics = {}) {
    try {
      const healthRecord = {
        module: moduleName,
        status, // 'healthy', 'degraded', 'failed'
        timestamp: Date.now(),
        metrics: {
          responseTime: metrics.responseTime || 0,
          errorCount: metrics.errorCount || 0,
          successCount: metrics.successCount || 0,
          memoryUsage: metrics.memoryUsage || 0,
          ...metrics
        },
        type: 'module_health'
      };
      
      // Store in IndexedDB
      await this._storeHealthRecord(healthRecord);
      
      // Update in-memory metrics
      this.healthMetrics.modules.set(moduleName, healthRecord);
      
      // Check for alerts
      this._checkHealthAlerts(moduleName, healthRecord);
      
      return { success: true, recorded: true };
    } catch (error) {
      console.error('[HealthMonitor] Failed to record module health:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record performance metrics
   */
  async recordPerformanceMetric(operation, duration, success = true, metadata = {}) {
    try {
      const perfRecord = {
        operation,
        duration,
        success,
        timestamp: Date.now(),
        metadata,
        type: 'performance'
      };
      
      // Store in IndexedDB
      await this._storePerformanceRecord(perfRecord);
      
      // Update in-memory metrics
      const operationMetrics = this.healthMetrics.performance.get(operation) || {
        totalCalls: 0,
        successfulCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
        lastCall: 0
      };
      
      operationMetrics.totalCalls++;
      operationMetrics.totalDuration += duration;
      operationMetrics.averageDuration = operationMetrics.totalDuration / operationMetrics.totalCalls;
      operationMetrics.lastCall = Date.now();
      
      if (success) {
        operationMetrics.successfulCalls++;
      }
      
      this.healthMetrics.performance.set(operation, operationMetrics);
      
      // Check performance alerts
      this._checkPerformanceAlerts(operation, operationMetrics);
      
      return { success: true, recorded: true };
    } catch (error) {
      console.error('[HealthMonitor] Failed to record performance metric:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record security event
   */
  async recordSecurityEvent(eventType, details = {}) {
    try {
      const severity = this._calculateEventSeverity(eventType, details);
      
      const securityEvent = {
        eventType,
        severity, // 'low', 'medium', 'high', 'critical'
        details,
        timestamp: Date.now(),
        module: details.module || 'unknown',
        type: 'security_event'
      };
      
      // Store in IndexedDB
      await this._storeSecurityEvent(securityEvent);
      
      // Add to in-memory errors
      this.healthMetrics.errors.push(securityEvent);
      
      // Keep only last 100 errors in memory
      if (this.healthMetrics.errors.length > 100) {
        this.healthMetrics.errors = this.healthMetrics.errors.slice(-100);
      }
      
      // Generate alert for high/critical events
      if (severity === 'high' || severity === 'critical') {
        await this._generateAlert(securityEvent);
      }
      
      return { success: true, severity, recorded: true };
    } catch (error) {
      console.error('[HealthMonitor] Failed to record security event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current health status
   */
  async getHealthStatus() {
    try {
      const status = {
        overall: 'healthy',
        timestamp: Date.now(),
        modules: {},
        performance: {},
        alerts: this.healthMetrics.alerts.slice(-10),
        recentErrors: this.healthMetrics.errors.slice(-5),
        systemMetrics: await this._getSystemMetrics()
      };
      
      // Module health status
      for (const [module, health] of this.healthMetrics.modules) {
        status.modules[module] = {
          status: health.status,
          lastCheck: health.timestamp,
          metrics: health.metrics
        };
        
        if (health.status === 'failed') {
          status.overall = 'critical';
        } else if (health.status === 'degraded' && status.overall === 'healthy') {
          status.overall = 'degraded';
        }
      }
      
      // Performance status
      for (const [operation, perf] of this.healthMetrics.performance) {
        const errorRate = 1 - (perf.successfulCalls / perf.totalCalls);
        status.performance[operation] = {
          averageDuration: perf.averageDuration,
          errorRate,
          totalCalls: perf.totalCalls,
          lastCall: perf.lastCall,
          healthy: errorRate < this.thresholds.errorRate && 
                  perf.averageDuration < this.thresholds.responseTime
        };
      }
      
      return status;
    } catch (error) {
      console.error('[HealthMonitor] Failed to get health status:', error);
      return { overall: 'unknown', error: error.message };
    }
  }

  /**
   * Setup performance monitoring
   */
  _setupPerformanceMonitoring() {
    // Monitor browser performance
    if (window.performance && window.performance.observer) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.includes('security') || entry.name.includes('pwa')) {
              this.recordPerformanceMetric(
                entry.name,
                entry.duration,
                true,
                { type: 'browser_performance' }
              );
            }
          }
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('[HealthMonitor] Performance observer setup failed:', error);
      }
    }
    
    // Monitor memory usage
    if (window.performance && window.performance.memory) {
      setInterval(() => {
        const memory = window.performance.memory;
        this.recordPerformanceMetric(
          'memory_usage',
          memory.usedJSHeapSize,
          memory.usedJSHeapSize < this.thresholds.memoryUsage,
          {
            totalHeapSize: memory.totalJSHeapSize,
            heapSizeLimit: memory.jsHeapSizeLimit
          }
        );
      }, 60000); // Every minute
    }
  }

  /**
   * Start periodic health checks
   */
  _startHealthChecks() {
    // Module health checks every 5 minutes
    setInterval(async () => {
      await this._performModuleHealthChecks();
    }, 300000);
    
    // System health checks every 2 minutes
    setInterval(async () => {
      await this._performSystemHealthCheck();
    }, 120000);
    
    // Cleanup old records every hour
    setInterval(async () => {
      await this._cleanupOldRecords();
    }, 3600000);
  }

  /**
   * Perform health checks on all modules
   */
  async _performModuleHealthChecks() {
    const modules = ['webauthn', 'encryption', 'monitoring', 'inputValidation', 'csp'];
    
    for (const module of modules) {
      try {
        const startTime = performance.now();
        const isHealthy = await this._testModuleHealth(module);
        const duration = performance.now() - startTime;
        
        await this.recordModuleHealth(module, isHealthy ? 'healthy' : 'failed', {
          responseTime: duration,
          lastCheck: Date.now()
        });
      } catch (error) {
        await this.recordModuleHealth(module, 'failed', {
          error: error.message,
          lastCheck: Date.now()
        });
      }
    }
  }

  /**
   * Test individual module health
   */
  async _testModuleHealth(moduleName) {
    const healthTests = {
      webauthn: () => {
        return navigator.credentials && 
               typeof navigator.credentials.create === 'function' &&
               window.PublicKeyCredential;
      },
      encryption: () => {
        return window.crypto && 
               window.crypto.subtle && 
               typeof window.crypto.subtle.encrypt === 'function';
      },
      monitoring: () => {
        return typeof indexedDB !== 'undefined' && this.db;
      },
      inputValidation: () => {
        return window.DOMParser && document.createElement;
      },
      csp: () => {
        return document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
      }
    };
    
    const test = healthTests[moduleName];
    return test ? test() : false;
  }

  /**
   * Perform system health check
   */
  async _performSystemHealthCheck() {
    try {
      const systemMetrics = await this._getSystemMetrics();
      
      // Check storage usage
      if (systemMetrics.storageUsage > this.thresholds.storageUsage) {
        await this.recordSecurityEvent('storage_quota_exceeded', {
          usage: systemMetrics.storageUsage,
          threshold: this.thresholds.storageUsage
        });
      }
      
      // Check error rates
      const recentErrors = this.healthMetrics.errors.filter(
        error => Date.now() - error.timestamp < 300000 // Last 5 minutes
      );
      
      if (recentErrors.length > 10) {
        await this.recordSecurityEvent('high_error_rate', {
          errorCount: recentErrors.length,
          timeWindow: '5_minutes'
        });
      }
      
    } catch (error) {
      console.error('[HealthMonitor] System health check failed:', error);
    }
  }

  /**
   * Get system metrics
   */
  async _getSystemMetrics() {
    const metrics = {
      timestamp: Date.now(),
      storageUsage: 0,
      memoryUsage: 0,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        online: navigator.onLine
      }
    };
    
    // Calculate storage usage
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        metrics.storageUsage = estimate.usage / estimate.quota;
      }
    } catch (error) {
      console.warn('[HealthMonitor] Storage estimation failed:', error);
    }
    
    // Get memory usage
    if (window.performance && window.performance.memory) {
      metrics.memoryUsage = window.performance.memory.usedJSHeapSize;
    }
    
    return metrics;
  }

  /**
   * Check for health alerts
   */
  _checkHealthAlerts(moduleName, healthRecord) {
    const alerts = [];
    
    // Check response time
    if (healthRecord.metrics.responseTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'slow_response',
        module: moduleName,
        value: healthRecord.metrics.responseTime,
        threshold: this.thresholds.responseTime
      });
    }
    
    // Check error rate
    const errorRate = healthRecord.metrics.errorCount / 
                     (healthRecord.metrics.errorCount + healthRecord.metrics.successCount);
    
    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        module: moduleName,
        value: errorRate,
        threshold: this.thresholds.errorRate
      });
    }
    
    // Generate alerts
    alerts.forEach(alert => this._generateAlert(alert));
  }

  /**
   * Check performance alerts
   */
  _checkPerformanceAlerts(operation, metrics) {
    if (metrics.averageDuration > this.thresholds.responseTime) {
      this._generateAlert({
        type: 'performance_degradation',
        operation,
        averageDuration: metrics.averageDuration,
        threshold: this.thresholds.responseTime
      });
    }
  }

  /**
   * Calculate event severity
   */
  _calculateEventSeverity(eventType, details) {
    const severityMap = {
      'module_failure': 'high',
      'authentication_failure': 'high',
      'encryption_failure': 'critical',
      'storage_quota_exceeded': 'medium',
      'high_error_rate': 'high',
      'performance_degradation': 'medium',
      'security_violation': 'critical'
    };
    
    return severityMap[eventType] || 'low';
  }

  /**
   * Generate alert
   */
  async _generateAlert(alertData) {
    const alert = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      acknowledged: false,
      ...alertData
    };
    
    this.healthMetrics.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.healthMetrics.alerts.length > 50) {
      this.healthMetrics.alerts = this.healthMetrics.alerts.slice(-50);
    }
    
    // Store alert in localStorage for UI display
    const storedAlerts = JSON.parse(localStorage.getItem('pwa-health-alerts') || '[]');
    storedAlerts.push(alert);
    localStorage.setItem('pwa-health-alerts', JSON.stringify(storedAlerts.slice(-20)));
    
    console.warn('[HealthMonitor] Alert generated:', alert);
  }

  /**
   * Store health record in IndexedDB
   */
  async _storeHealthRecord(record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['healthMetrics'], 'readwrite');
      const store = transaction.objectStore('healthMetrics');
      const request = store.add(record);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store performance record in IndexedDB
   */
  async _storePerformanceRecord(record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['performanceMetrics'], 'readwrite');
      const store = transaction.objectStore('performanceMetrics');
      const request = store.add(record);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store security event in IndexedDB
   */
  async _storeSecurityEvent(event) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['securityEvents'], 'readwrite');
      const store = transaction.objectStore('securityEvents');
      const request = store.add(event);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load health metrics from IndexedDB
   */
  async _loadHealthMetrics() {
    try {
      // Load recent health records
      const healthRecords = await this._getRecentRecords('healthMetrics', 100);
      healthRecords.forEach(record => {
        this.healthMetrics.modules.set(record.module, record);
      });
      
      // Load recent performance records
      const perfRecords = await this._getRecentRecords('performanceMetrics', 100);
      perfRecords.forEach(record => {
        const existing = this.healthMetrics.performance.get(record.operation) || {
          totalCalls: 0, successfulCalls: 0, totalDuration: 0, averageDuration: 0
        };
        existing.totalCalls++;
        existing.totalDuration += record.duration;
        existing.averageDuration = existing.totalDuration / existing.totalCalls;
        if (record.success) existing.successfulCalls++;
        
        this.healthMetrics.performance.set(record.operation, existing);
      });
      
      // Load recent security events
      const securityEvents = await this._getRecentRecords('securityEvents', 50);
      this.healthMetrics.errors = securityEvents;
      
    } catch (error) {
      console.warn('[HealthMonitor] Failed to load health metrics:', error);
    }
  }

  /**
   * Get recent records from IndexedDB
   */
  async _getRecentRecords(storeName, limit = 100) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore('storeName');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const records = [];
      let count = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && count < limit) {
          records.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(records);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old records
   */
  async _cleanupOldRecords() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const stores = ['healthMetrics', 'performanceMetrics', 'securityEvents'];
    
    for (const storeName of stores) {
      try {
        await this._deleteOldRecords(storeName, oneWeekAgo);
      } catch (error) {
        console.warn(`[HealthMonitor] Failed to cleanup ${storeName}:`, error);
      }
    }
  }

  /**
   * Delete old records from IndexedDB
   */
  async _deleteOldRecords(storeName, cutoffTime) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus() {
    return {
      monitoring: this.monitoring,
      database: !!this.db,
      moduleCount: this.healthMetrics.modules.size,
      performanceMetricCount: this.healthMetrics.performance.size,
      errorCount: this.healthMetrics.errors.length,
      alertCount: this.healthMetrics.alerts.length
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      this.monitoring = false;
      
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      this.healthMetrics = {
        modules: new Map(),
        performance: new Map(),
        errors: [],
        alerts: []
      };
    } catch (error) {
      console.error('[HealthMonitor] Cleanup failed:', error);
    }
  }
}

// Export for static hosting
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientSideSecurityHealthMonitor;
} else if (typeof window !== 'undefined') {
  window.ClientSideSecurityHealthMonitor = ClientSideSecurityHealthMonitor;
}