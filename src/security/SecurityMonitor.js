/**
 * SecurityMonitor - 安全監控與告警系統
 * 提供持續安全監控和自動告警功能
 */
class SecurityMonitor {
    static #instance = null;
    static #metrics = new Map();
    static #alerts = [];
    static #config = {
        failedAuthAttempts: { threshold: 5, window: 5 * 60 * 1000 },
        suspiciousInputs: { threshold: 10, window: 60 * 60 * 1000 },
        sessionAnomalies: { threshold: 3, window: 10 * 60 * 1000 },
        logInjectionAttempts: { threshold: 1, window: 60 * 1000 }
    };

    static getInstance() {
        if (!this.#instance) {
            this.#instance = new SecurityMonitor();
        }
        return this.#instance;
    }

    constructor() {
        if (SecurityMonitor.#instance) {
            return SecurityMonitor.#instance;
        }
        this.startMonitoring();
    }

    /**
     * 開始安全監控
     */
    startMonitoring() {
        // 每分鐘檢查一次指標
        setInterval(() => {
            this.checkMetrics();
        }, 60 * 1000);

        // 每5分鐘清理過期資料
        setInterval(() => {
            this.cleanupExpiredData();
        }, 5 * 60 * 1000);

        console.log('[SecurityMonitor] 安全監控已啟動');
    }

    /**
     * 記錄安全事件
     */
    static recordEvent(eventType, details = {}) {
        const timestamp = Date.now();
        const event = {
            type: eventType,
            timestamp,
            details: this.#sanitizeDetails(details)
        };

        // 更新指標
        if (!this.#metrics.has(eventType)) {
            this.#metrics.set(eventType, []);
        }
        
        this.#metrics.get(eventType).push(event);
        
        // 檢查是否觸發告警
        this.#checkAlert(eventType);
        
        // 記錄到安全日誌
        if (window.SecurityDataHandler) {
            window.SecurityDataHandler.secureLog('info', `Security event: ${eventType}`, details);
        }
    }

    /**
     * 檢查告警條件
     */
    static #checkAlert(eventType) {
        const config = this.#config[eventType];
        if (!config) return;

        const events = this.#metrics.get(eventType) || [];
        const windowStart = Date.now() - config.window;
        const recentEvents = events.filter(e => e.timestamp > windowStart);

        if (recentEvents.length >= config.threshold) {
            this.#triggerAlert(eventType, recentEvents.length, config);
        }
    }

    /**
     * 觸發安全告警
     */
    static #triggerAlert(eventType, count, config) {
        const alert = {
            id: this.#generateAlertId(),
            type: eventType,
            severity: this.#getSeverity(eventType),
            count,
            threshold: config.threshold,
            window: config.window,
            timestamp: Date.now(),
            status: 'active'
        };

        this.#alerts.push(alert);
        
        // 發送告警通知
        this.#sendAlert(alert);
        
        console.warn(`[SecurityMonitor] 安全告警觸發: ${eventType} (${count}/${config.threshold})`);
    }

    /**
     * 發送告警通知
     */
    static #sendAlert(alert) {
        // 控制台告警
        const message = `🚨 安全告警: ${alert.type} - 檢測到 ${alert.count} 次事件 (閾值: ${alert.threshold})`;
        
        if (alert.severity === 'critical') {
            console.error(message);
        } else if (alert.severity === 'high') {
            console.warn(message);
        } else {
            console.log(message);
        }

        // 可擴展：發送到外部告警系統
        this.#sendToExternalSystem(alert);
    }

    /**
     * 獲取安全指標
     */
    static getMetrics() {
        const summary = {};
        
        for (const [eventType, events] of this.#metrics.entries()) {
            const last24h = events.filter(e => 
                e.timestamp > Date.now() - 24 * 60 * 60 * 1000
            );
            
            summary[eventType] = {
                total: events.length,
                last24h: last24h.length,
                lastEvent: events.length > 0 ? events[events.length - 1].timestamp : null
            };
        }
        
        return summary;
    }

    /**
     * 獲取活躍告警
     */
    static getActiveAlerts() {
        return this.#alerts.filter(alert => alert.status === 'active');
    }

    /**
     * 確認告警
     */
    static acknowledgeAlert(alertId) {
        const alert = this.#alerts.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'acknowledged';
            alert.acknowledgedAt = Date.now();
            return true;
        }
        return false;
    }

    /**
     * 執行安全健康檢查
     */
    static async performHealthCheck() {
        const results = {
            timestamp: Date.now(),
            status: 'healthy',
            checks: {}
        };

        try {
            // 檢查安全模組
            results.checks.securityModules = this.#checkSecurityModules();
            
            // 檢查告警狀態
            results.checks.alerts = this.#checkAlertStatus();
            
            // 檢查指標異常
            results.checks.metrics = this.#checkMetricsAnomalies();
            
            // 檢查系統資源
            results.checks.resources = await this.#checkSystemResources();
            
            // 計算整體狀態
            const hasErrors = Object.values(results.checks).some(check => !check.healthy);
            results.status = hasErrors ? 'unhealthy' : 'healthy';
            
        } catch (error) {
            results.status = 'error';
            results.error = error.message;
        }

        return results;
    }

    /**
     * 檢查安全模組狀態
     */
    static #checkSecurityModules() {
        const modules = [
            'SecurityInputHandler',
            'SecurityDataHandler', 
            'SecurityAuthHandler'
        ];
        
        const results = {
            healthy: true,
            modules: {}
        };
        
        for (const module of modules) {
            const available = typeof window[module] !== 'undefined';
            results.modules[module] = available;
            if (!available) {
                results.healthy = false;
            }
        }
        
        return results;
    }

    /**
     * 檢查告警狀態
     */
    static #checkAlertStatus() {
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
        
        return {
            healthy: criticalAlerts.length === 0,
            activeAlerts: activeAlerts.length,
            criticalAlerts: criticalAlerts.length
        };
    }

    /**
     * 檢查指標異常
     */
    static #checkMetricsAnomalies() {
        const metrics = this.getMetrics();
        const anomalies = [];
        
        // 檢查異常高的事件頻率
        for (const [eventType, data] of Object.entries(metrics)) {
            if (data.last24h > 100) { // 24小時內超過100次
                anomalies.push(`${eventType}: ${data.last24h} events in 24h`);
            }
        }
        
        return {
            healthy: anomalies.length === 0,
            anomalies
        };
    }

    /**
     * 檢查系統資源
     */
    static async #checkSystemResources() {
        const results = {
            healthy: true,
            storage: {},
            memory: {}
        };
        
        try {
            // 檢查儲存空間
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const usagePercent = estimate.quota ? 
                    Math.round((estimate.usage / estimate.quota) * 100) : 0;
                
                results.storage = {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    usagePercent
                };
                
                if (usagePercent > 90) {
                    results.healthy = false;
                }
            }
            
            // 檢查記憶體使用（如果可用）
            if (performance.memory) {
                const memUsage = performance.memory.usedJSHeapSize;
                const memLimit = performance.memory.jsHeapSizeLimit;
                const memPercent = Math.round((memUsage / memLimit) * 100);
                
                results.memory = {
                    used: memUsage,
                    limit: memLimit,
                    usagePercent: memPercent
                };
                
                if (memPercent > 85) {
                    results.healthy = false;
                }
            }
            
        } catch (error) {
            results.healthy = false;
            results.error = error.message;
        }
        
        return results;
    }

    /**
     * 清理過期資料
     */
    checkMetrics() {
        // 由實例方法調用靜態方法
        SecurityMonitor.#performMetricsCheck();
    }

    static #performMetricsCheck() {
        // 檢查各種指標是否異常
        const metrics = this.getMetrics();
        
        for (const [eventType, data] of Object.entries(metrics)) {
            if (data.last24h > 50) { // 24小時內超過50次事件
                this.recordEvent('highEventFrequency', { 
                    eventType, 
                    count: data.last24h 
                });
            }
        }
    }

    cleanupExpiredData() {
        SecurityMonitor.#cleanupExpiredData();
    }

    static #cleanupExpiredData() {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        // 清理過期的指標資料
        for (const [eventType, events] of this.#metrics.entries()) {
            const validEvents = events.filter(e => e.timestamp > oneDayAgo);
            this.#metrics.set(eventType, validEvents);
        }
        
        // 清理過期的告警
        this.#alerts = this.#alerts.filter(alert => 
            alert.timestamp > oneDayAgo || alert.status === 'active'
        );
    }

    /**
     * 工具方法
     */
    static #sanitizeDetails(details) {
        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            if (typeof value === 'string') {
                sanitized[key] = value.substring(0, 200); // 限制長度
            } else if (typeof value === 'object') {
                sanitized[key] = '[Object]';
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    static #generateAlertId() {
        return 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    static #getSeverity(eventType) {
        const severityMap = {
            failedAuthAttempts: 'high',
            suspiciousInputs: 'medium',
            sessionAnomalies: 'high',
            logInjectionAttempts: 'critical',
            xssAttempts: 'high',
            unauthorizedAccess: 'critical'
        };
        
        return severityMap[eventType] || 'low';
    }

    static #sendToExternalSystem(alert) {
        // 預留接口：發送到外部監控系統
        // 例如：Slack、Email、SIEM 系統等
        if (window.externalAlertHandler) {
            window.externalAlertHandler(alert);
        }
    }
}

// 全域可用
window.SecurityMonitor = SecurityMonitor;

// 自動啟動監控
document.addEventListener('DOMContentLoaded', () => {
    SecurityMonitor.getInstance();
});