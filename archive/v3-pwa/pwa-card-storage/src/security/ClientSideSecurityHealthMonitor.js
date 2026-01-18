/**
 * Client Side Security Health Monitor - 客戶端安全健康監控
 * 輕量級監控系統，適合靜態托管環境
 * 
 * ⚠️ DEPRECATION WARNING: This file is deprecated.
 * Use performSecurityHealthCheck() from security-core.js instead
 */
class ClientSideSecurityHealthMonitor {
  constructor() {
    this.metrics = {
      xssAttempts: 0,
      rateLimitHits: 0,
      invalidInputs: 0,
      errors: 0
    };
    this.alerts = [];
    this.thresholds = {
      xssAttempts: 5,
      rateLimitHits: 10,
      invalidInputs: 20
    };
  }

  /**
   * 記錄安全事件
   */
  recordEvent(eventType, details = {}) {
    if (this.metrics.hasOwnProperty(eventType)) {
      this.metrics[eventType]++;
      this.checkThreshold(eventType);
    }
    
    // 簡化日誌記錄
    if (window.LightweightSecurityCore) {
      window.LightweightSecurityCore.log('info', `Security event: ${eventType}`, details);
    }
  }

  /**
   * 檢查閾值告警
   */
  checkThreshold(eventType) {
    const threshold = this.thresholds[eventType];
    if (threshold && this.metrics[eventType] >= threshold) {
      this.triggerAlert(eventType, this.metrics[eventType]);
    }
  }

  /**
   * 觸發告警
   */
  triggerAlert(eventType, count) {
    const alert = {
      id: Date.now(),
      type: eventType,
      count,
      timestamp: Date.now(),
      message: `Security threshold exceeded: ${eventType} (${count})`
    };
    
    this.alerts.push(alert);
    
    if (window.LightweightSecurityCore) {
      window.LightweightSecurityCore.log('warn', alert.message);
    }
    
    // 保持最近 10 個告警
    if (this.alerts.length > 10) {
      this.alerts = this.alerts.slice(-10);
    }
  }

  /**
   * 獲取健康狀態
   */
  getHealthStatus() {
    return {
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(-5),
      timestamp: Date.now(),
      healthy: this.alerts.length === 0
    };
  }

  /**
   * 重置指標
   */
  reset() {
    this.metrics = {
      xssAttempts: 0,
      rateLimitHits: 0,
      invalidInputs: 0,
      errors: 0
    };
    this.alerts = [];
  }
}

// 全域可用 (DEPRECATED)
if (!window.ClientSideSecurityHealthMonitor) {
  window.ClientSideSecurityHealthMonitor = ClientSideSecurityHealthMonitor;
}