/**
 * Component Health Monitor - v3.2.0-pwa-deployment-compatibility
 * COMP-04: 元件健康監控機制 - 實作自動錯誤恢復
 * 
 * 設計原則：
 * - 持續健康檢查
 * - 自動錯誤檢測
 * - 智慧恢復策略
 * - 性能監控
 */

class ComponentHealthMonitor {
  constructor() {
    this.trackedComponents = new Map();
    this.healthStatus = new Map();
    this.recoveryStrategies = new Map();
    this.monitoringInterval = null;
    this.initialized = false;
    
    // 配置
    this.config = {
      checkInterval: 5000, // 5秒檢查一次
      healthTimeout: 3000, // 3秒健康檢查超時
      maxRecoveryAttempts: 3,
      recoveryDelay: 2000, // 2秒恢復延遲
      alertThreshold: 3, // 連續失敗3次後告警
      enableAutoRecovery: true
    };
    
    // 統計資料
    this.stats = {
      totalChecks: 0,
      healthyChecks: 0,
      unhealthyChecks: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
    
    // 告警系統
    this.alerts = [];
    this.maxAlerts = 50;
  }

  /**
   * 初始化健康監控器
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 註冊預設恢復策略
      this.registerDefaultRecoveryStrategies();
      
      // 開始監控
      this.startMonitoring();
      
      this.initialized = true;
      console.log('[ComponentHealthMonitor] Initialized successfully');
      
    } catch (error) {
      console.error('[ComponentHealthMonitor] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 追蹤元件
   * @param {string} componentName - 元件名稱
   * @param {Object} component - 元件實例
   * @param {Object} options - 追蹤選項
   */
  track(componentName, component, options = {}) {
    if (!componentName || !component) {
      throw new Error('Component name and instance are required');
    }

    const trackingConfig = {
      name: componentName,
      instance: component,
      healthCheckMethod: options.healthCheckMethod || 'getStatus',
      critical: options.critical || false,
      recoveryStrategy: options.recoveryStrategy || 'restart',
      lastHealthCheck: null,
      consecutiveFailures: 0,
      totalFailures: 0,
      lastFailure: null,
      recoveryAttempts: 0,
      isRecovering: false,
      enabled: true
    };

    this.trackedComponents.set(componentName, trackingConfig);
    this.healthStatus.set(componentName, 'unknown');
    
    console.log(`[ComponentHealthMonitor] Now tracking component: ${componentName}`);
    
    // 立即執行一次健康檢查
    this.checkComponentHealth(componentName);
  }

  /**
   * 停止追蹤元件
   */
  untrack(componentName) {
    this.trackedComponents.delete(componentName);
    this.healthStatus.delete(componentName);
    console.log(`[ComponentHealthMonitor] Stopped tracking component: ${componentName}`);
  }

  /**
   * 開始監控
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);
    
    console.log(`[ComponentHealthMonitor] Started monitoring (interval: ${this.config.checkInterval}ms)`);
  }

  /**
   * 停止監控
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[ComponentHealthMonitor] Stopped monitoring');
    }
  }

  /**
   * 執行所有元件的健康檢查
   */
  async performHealthChecks() {
    const checkPromises = Array.from(this.trackedComponents.keys()).map(name => 
      this.checkComponentHealth(name)
    );
    
    await Promise.allSettled(checkPromises);
  }

  /**
   * 檢查單個元件健康狀態
   */
  async checkComponentHealth(componentName) {
    const config = this.trackedComponents.get(componentName);
    if (!config || !config.enabled) {
      return;
    }

    this.stats.totalChecks++;
    const startTime = performance.now();

    try {
      // 執行健康檢查
      const healthResult = await this.executeHealthCheck(config);
      
      // 更新狀態
      this.updateHealthStatus(componentName, 'healthy', healthResult);
      
      // 重置失敗計數
      config.consecutiveFailures = 0;
      config.lastHealthCheck = new Date();
      
      this.stats.healthyChecks++;
      
      const duration = performance.now() - startTime;
      console.debug(`[ComponentHealthMonitor] Health check passed for ${componentName} (${duration.toFixed(2)}ms)`);
      
    } catch (error) {
      // 記錄失敗
      this.handleHealthCheckFailure(componentName, error);
      this.stats.unhealthyChecks++;
      
      console.warn(`[ComponentHealthMonitor] Health check failed for ${componentName}:`, error.message);
    }
  }

  /**
   * 執行健康檢查
   */
  async executeHealthCheck(config) {
    const component = config.instance;
    const healthMethod = config.healthCheckMethod;
    
    // 檢查方法是否存在
    if (typeof component[healthMethod] !== 'function') {
      // 如果沒有健康檢查方法，檢查基本屬性
      return this.performBasicHealthCheck(component);
    }

    // 設定超時
    const healthPromise = component[healthMethod]();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), this.config.healthTimeout);
    });

    const result = await Promise.race([healthPromise, timeoutPromise]);
    
    // 驗證健康檢查結果
    if (result && typeof result === 'object') {
      if (result.healthy === false || result.status === 'error') {
        throw new Error(result.message || 'Component reported unhealthy status');
      }
    }
    
    return result;
  }

  /**
   * 執行基本健康檢查
   */
  performBasicHealthCheck(component) {
    // 檢查元件是否仍然存在且可訪問
    if (!component) {
      throw new Error('Component instance is null or undefined');
    }
    
    // 檢查是否有初始化標記
    if (component.initialized === false) {
      throw new Error('Component is not initialized');
    }
    
    // 檢查是否有錯誤狀態
    if (component.hasError === true) {
      throw new Error('Component has error flag set');
    }
    
    return { healthy: true, type: 'basic' };
  }

  /**
   * 處理健康檢查失敗
   */
  async handleHealthCheckFailure(componentName, error) {
    const config = this.trackedComponents.get(componentName);
    if (!config) return;

    // 更新失敗狀態
    config.consecutiveFailures++;
    config.totalFailures++;
    config.lastFailure = {
      error: error.message,
      timestamp: new Date()
    };

    this.updateHealthStatus(componentName, 'unhealthy', { error: error.message });

    // 檢查是否需要告警
    if (config.consecutiveFailures >= this.config.alertThreshold) {
      this.createAlert(componentName, 'consecutive_failures', {
        failures: config.consecutiveFailures,
        error: error.message
      });
    }

    // 嘗試自動恢復
    if (this.config.enableAutoRecovery && !config.isRecovering) {
      await this.attemptRecovery(componentName);
    }
  }

  /**
   * 嘗試恢復元件
   */
  async attemptRecovery(componentName) {
    const config = this.trackedComponents.get(componentName);
    if (!config || config.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      return false;
    }

    config.isRecovering = true;
    config.recoveryAttempts++;
    this.stats.recoveryAttempts++;

    console.log(`[ComponentHealthMonitor] Attempting recovery for ${componentName} (attempt ${config.recoveryAttempts})`);

    try {
      // 等待恢復延遲
      await new Promise(resolve => setTimeout(resolve, this.config.recoveryDelay));
      
      // 執行恢復策略
      const strategy = this.recoveryStrategies.get(config.recoveryStrategy);
      if (strategy) {
        await strategy.recover(config.instance, config);
      } else {
        await this.executeDefaultRecovery(config);
      }
      
      // 驗證恢復是否成功
      await this.checkComponentHealth(componentName);
      
      if (this.healthStatus.get(componentName) === 'healthy') {
        this.stats.successfulRecoveries++;
        this.createAlert(componentName, 'recovery_success', {
          attempt: config.recoveryAttempts
        });
        
        console.log(`[ComponentHealthMonitor] Recovery successful for ${componentName}`);
        return true;
      }
      
    } catch (error) {
      console.error(`[ComponentHealthMonitor] Recovery failed for ${componentName}:`, error);
      this.createAlert(componentName, 'recovery_failed', {
        attempt: config.recoveryAttempts,
        error: error.message
      });
    } finally {
      config.isRecovering = false;
    }

    this.stats.failedRecoveries++;
    return false;
  }

  /**
   * 執行預設恢復策略
   */
  async executeDefaultRecovery(config) {
    const component = config.instance;
    
    // 嘗試重新初始化
    if (typeof component.initialize === 'function') {
      await component.initialize();
    }
    
    // 重置錯誤狀態
    if (component.hasError !== undefined) {
      component.hasError = false;
    }
    
    // 重置初始化狀態
    if (component.initialized !== undefined) {
      component.initialized = true;
    }
  }

  /**
   * 註冊預設恢復策略
   */
  registerDefaultRecoveryStrategies() {
    // 重啟策略
    this.recoveryStrategies.set('restart', {
      name: 'restart',
      recover: async (component, config) => {
        // 清理後重新初始化
        if (typeof component.cleanup === 'function') {
          await component.cleanup();
        }
        if (typeof component.initialize === 'function') {
          await component.initialize();
        }
      }
    });

    // 重置策略
    this.recoveryStrategies.set('reset', {
      name: 'reset',
      recover: async (component, config) => {
        // 重置內部狀態
        if (typeof component.reset === 'function') {
          await component.reset();
        } else if (typeof component.initialize === 'function') {
          await component.initialize();
        }
      }
    });

    // 重新載入策略
    this.recoveryStrategies.set('reload', {
      name: 'reload',
      recover: async (component, config) => {
        // 重新載入資源
        if (typeof component.reload === 'function') {
          await component.reload();
        }
      }
    });
  }

  /**
   * 註冊自訂恢復策略
   */
  registerRecoveryStrategy(name, strategy) {
    if (!name || !strategy || typeof strategy.recover !== 'function') {
      throw new Error('Invalid recovery strategy');
    }
    
    this.recoveryStrategies.set(name, strategy);
    console.log(`[ComponentHealthMonitor] Registered recovery strategy: ${name}`);
  }

  /**
   * 更新健康狀態
   */
  updateHealthStatus(componentName, status, details = null) {
    this.healthStatus.set(componentName, status);
    
    // 更新元件配置中的詳細資訊
    const config = this.trackedComponents.get(componentName);
    if (config) {
      config.lastHealthCheck = new Date();
      config.lastHealthDetails = details;
    }
  }

  /**
   * 建立告警
   */
  createAlert(componentName, type, details = {}) {
    const alert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      componentName,
      type,
      details,
      timestamp: new Date(),
      severity: this.getAlertSeverity(type, details)
    };

    this.alerts.unshift(alert);
    
    // 限制告警數量
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }
    
    console.log(`[ComponentHealthMonitor] Alert created: ${type} for ${componentName}`, details);
    
    // 觸發告警事件
    this.dispatchAlertEvent(alert);
  }

  /**
   * 獲取告警嚴重程度
   */
  getAlertSeverity(type, details) {
    switch (type) {
      case 'consecutive_failures':
        return details.failures >= 5 ? 'critical' : 'high';
      case 'recovery_failed':
        return 'high';
      case 'recovery_success':
        return 'info';
      default:
        return 'medium';
    }
  }

  /**
   * 派發告警事件
   */
  dispatchAlertEvent(alert) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('componentHealthAlert', {
        detail: alert
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * 報告元件失敗
   */
  reportFailure(componentName, error) {
    console.error(`[ComponentHealthMonitor] Component failure reported: ${componentName}`, error);
    
    this.createAlert(componentName, 'manual_failure_report', {
      error: error.message || error
    });
    
    // 立即檢查健康狀態
    this.checkComponentHealth(componentName);
  }

  /**
   * 獲取健康狀態報告
   */
  getHealthStatus() {
    const components = Array.from(this.trackedComponents.entries()).map(([name, config]) => ({
      name,
      status: this.healthStatus.get(name),
      consecutiveFailures: config.consecutiveFailures,
      totalFailures: config.totalFailures,
      recoveryAttempts: config.recoveryAttempts,
      isRecovering: config.isRecovering,
      lastHealthCheck: config.lastHealthCheck,
      lastFailure: config.lastFailure,
      critical: config.critical
    }));

    return {
      initialized: this.initialized,
      monitoring: this.monitoringInterval !== null,
      componentCount: this.trackedComponents.size,
      components,
      stats: { ...this.stats },
      recentAlerts: this.alerts.slice(0, 10),
      config: this.config
    };
  }

  /**
   * 獲取告警歷史
   */
  getAlerts(limit = 20) {
    return this.alerts.slice(0, limit);
  }

  /**
   * 清除告警
   */
  clearAlerts() {
    this.alerts = [];
    console.log('[ComponentHealthMonitor] Alerts cleared');
  }

  /**
   * 清理資源
   */
  cleanup() {
    this.stopMonitoring();
    this.trackedComponents.clear();
    this.healthStatus.clear();
    this.recoveryStrategies.clear();
    this.alerts = [];
    this.initialized = false;
    
    // 重置統計
    this.stats = {
      totalChecks: 0,
      healthyChecks: 0,
      unhealthyChecks: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
    
    console.log('[ComponentHealthMonitor] Cleanup completed');
  }
}

// 模組匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentHealthMonitor;
}

// 瀏覽器全域
if (typeof window !== 'undefined') {
  window.ComponentHealthMonitor = ComponentHealthMonitor;
}