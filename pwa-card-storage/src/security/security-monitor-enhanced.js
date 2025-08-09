/**
 * Enhanced Security Monitor - Production Security Monitoring & Alerting
 * DEPLOY-002: 安全監控與告警機制實作
 * 
 * Features:
 * - Real-time security event monitoring
 * - Threshold-based alerting (Critical < 15min, High < 1hr)
 * - Performance monitoring (<5% overhead)
 * - Accessibility-friendly interface
 * - Integration with existing security handlers
 */
class EnhancedSecurityMonitor {
    static #instance = null;
    static #metrics = new Map();
    static #alerts = [];
    static #subscribers = new Set();
    static #performanceMetrics = {
        startTime: Date.now(),
        eventCount: 0,
        processingTime: 0
    };

    // Enhanced configuration with production-ready thresholds
    static #config = {
        failedAuthAttempts: { threshold: 3, window: 5 * 60 * 1000, severity: 'high' },
        xssAttempts: { threshold: 1, window: 60 * 1000, severity: 'critical' },
        codeInjectionAttempts: { threshold: 1, window: 60 * 1000, severity: 'critical' },
        logInjectionAttempts: { threshold: 1, window: 60 * 1000, severity: 'high' },
        unauthorizedAccess: { threshold: 1, window: 60 * 1000, severity: 'critical' },
        suspiciousInputs: { threshold: 10, window: 60 * 60 * 1000, severity: 'medium' },
        tabnabbingAttempts: { threshold: 5, window: 10 * 60 * 1000, severity: 'medium' },
        performanceDegradation: { threshold: 1, window: 5 * 60 * 1000, severity: 'high' }
    };

    static getInstance() {
        if (!this.#instance) {
            this.#instance = new EnhancedSecurityMonitor();
        }
        return this.#instance;
    }

    constructor() {
        if (EnhancedSecurityMonitor.#instance) {
            return EnhancedSecurityMonitor.#instance;
        }
        this.#initializeMonitoring();
    }

    /**
     * Initialize monitoring system
     */
    #initializeMonitoring() {
        // Start monitoring intervals
        this.#startPeriodicChecks();
        
        // Initialize performance monitoring
        this.#initializePerformanceMonitoring();
        
        // Register with existing security handlers
        this.#registerWithSecurityHandlers();
        
        // Log initialization
        this.#secureLog('info', 'Enhanced security monitoring initialized', {
            thresholds: Object.keys(EnhancedSecurityMonitor.#config).length,
            timestamp: Date.now()
        });
    }

    /**
     * Start periodic monitoring checks
     */
    #startPeriodicChecks() {
        // Real-time metrics check every 30 seconds
        setInterval(() => {
            this.#checkMetrics();
        }, 30 * 1000);

        // Cleanup expired data every 5 minutes
        setInterval(() => {
            this.#cleanupExpiredData();
        }, 5 * 60 * 1000);

        // Performance health check every minute
        setInterval(() => {
            this.#checkPerformanceHealth();
        }, 60 * 1000);

        // Alert status review every 2 minutes
        setInterval(() => {
            this.#reviewAlertStatus();
        }, 2 * 60 * 1000);
    }

    /**
     * Initialize performance monitoring
     */
    #initializePerformanceMonitoring() {
        // Monitor processing overhead
        const originalRecordEvent = this.recordEvent;
        this.recordEvent = function(eventType, details = {}) {
            const startTime = performance.now();
            const result = originalRecordEvent.call(this, eventType, details);
            const processingTime = performance.now() - startTime;
            
            EnhancedSecurityMonitor.#performanceMetrics.processingTime += processingTime;
            EnhancedSecurityMonitor.#performanceMetrics.eventCount++;
            
            // Check for performance degradation
            const avgProcessingTime = EnhancedSecurityMonitor.#performanceMetrics.processingTime / 
                                    EnhancedSecurityMonitor.#performanceMetrics.eventCount;
            
            if (avgProcessingTime > 50) { // >50ms average processing time
                EnhancedSecurityMonitor.recordEvent('performanceDegradation', {
                    avgProcessingTime: Math.round(avgProcessingTime),
                    eventCount: EnhancedSecurityMonitor.#performanceMetrics.eventCount
                });
            }
            
            return result;
        };
    }

    /**
     * Register with existing security handlers
     */
    #registerWithSecurityHandlers() {
        // Register as event listener for security handlers
        if (window.SecurityInputHandler) {
            window.SecurityInputHandler.addEventListener?.(this.#handleSecurityEvent.bind(this));
        }
        
        if (window.SecurityAuthHandler) {
            window.SecurityAuthHandler.addEventListener?.(this.#handleSecurityEvent.bind(this));
        }
        
        if (window.SecurityDataHandler) {
            window.SecurityDataHandler.addEventListener?.(this.#handleSecurityEvent.bind(this));
        }
    }

    /**
     * Handle security events from other handlers
     */
    #handleSecurityEvent(event) {
        if (event && event.type) {
            this.recordEvent(event.type, event.details || {});
        }
    }

    /**
     * Record security event with enhanced processing
     */
    static recordEvent(eventType, details = {}) {
        const timestamp = Date.now();
        const sanitizedEventType = this.#sanitizeEventType(eventType);
        const sanitizedDetails = this.#sanitizeDetails(details);
        
        const event = {
            type: sanitizedEventType,
            timestamp,
            details: sanitizedDetails,
            id: this.#generateEventId()
        };

        // Update metrics
        if (!this.#metrics.has(sanitizedEventType)) {
            this.#metrics.set(sanitizedEventType, []);
        }
        
        this.#metrics.get(sanitizedEventType).push(event);
        
        // Check for immediate alerts
        this.#checkAlert(sanitizedEventType);
        
        // Notify subscribers
        this.#notifySubscribers('event', event);
        
        // Secure logging
        this.#secureLog('info', 'Security event recorded', {
            eventType: sanitizedEventType,
            timestamp: timestamp,
            eventId: event.id
        });
    }

    /**
     * Subscribe to monitoring events
     */
    static subscribe(callback) {
        if (typeof callback === 'function') {
            this.#subscribers.add(callback);
            return () => this.#subscribers.delete(callback);
        }
        return null;
    }

    /**
     * Notify subscribers of events
     */
    static #notifySubscribers(type, data) {
        this.#subscribers.forEach(callback => {
            try {
                callback({ type, data, timestamp: Date.now() });
            } catch (error) {
                this.#secureLog('error', 'Subscriber notification failed', {});
            }
        });
    }

    /**
     * Check alert conditions with enhanced logic
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
     * Trigger enhanced alert with multiple notification channels
     */
    static #triggerAlert(eventType, count, config) {
        const alert = {
            id: this.#generateAlertId(),
            type: eventType,
            severity: config.severity,
            count,
            threshold: config.threshold,
            window: config.window,
            timestamp: Date.now(),
            status: 'active',
            responseTime: this.#getResponseTime(config.severity)
        };

        this.#alerts.push(alert);
        
        // Multiple notification channels
        this.#sendConsoleAlert(alert);
        this.#sendBrowserNotification(alert);
        this.#sendDashboardAlert(alert);
        
        // Notify subscribers
        this.#notifySubscribers('alert', alert);
        
        // Secure logging
        this.#secureLog('warn', 'Security alert triggered', {
            eventType: this.#sanitizeEventType(eventType),
            severity: config.severity,
            count: parseInt(count) || 0,
            alertId: alert.id
        });
    }

    /**
     * Send console alert with proper formatting
     */
    static #sendConsoleAlert(alert) {
        const message = `[SECURITY-ALERT] ${alert.type}: ${alert.count}/${alert.threshold} events (${alert.severity})`;
        
        switch (alert.severity) {
            case 'critical':
                console.error(message, { alertId: alert.id, timestamp: alert.timestamp });
                break;
            case 'high':
                console.warn(message, { alertId: alert.id, timestamp: alert.timestamp });
                break;
            default:
                console.log(message, { alertId: alert.id, timestamp: alert.timestamp });
        }
    }

    /**
     * Send browser notification (if permitted)
     */
    static #sendBrowserNotification(alert) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(`Security Alert: ${alert.type}`, {
                    body: `${alert.count} events detected (${alert.severity} severity)`,
                    icon: '/assets/icons/icon-32x32.png',
                    tag: `security-alert-${alert.type}`,
                    requireInteraction: alert.severity === 'critical'
                });
            } catch (error) {
                // Silent fail for notification errors
            }
        }
    }

    /**
     * Send dashboard alert
     */
    static #sendDashboardAlert(alert) {
        // Dispatch custom event for dashboard
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('securityAlert', {
                detail: alert
            }));
        }
    }

    /**
     * Get response time based on severity
     */
    static #getResponseTime(severity) {
        const responseTimes = {
            'critical': 15 * 60 * 1000, // 15 minutes
            'high': 60 * 60 * 1000,     // 1 hour
            'medium': 4 * 60 * 60 * 1000, // 4 hours
            'low': 24 * 60 * 60 * 1000    // 24 hours
        };
        return responseTimes[severity] || responseTimes.low;
    }

    /**
     * Check metrics for anomalies
     */
    #checkMetrics() {
        const metrics = EnhancedSecurityMonitor.getMetrics();
        
        // Check for unusual patterns
        for (const [eventType, data] of Object.entries(metrics)) {
            // Spike detection
            if (data.lastHour > data.avgHourly * 3 && data.avgHourly > 0) {
                EnhancedSecurityMonitor.recordEvent('anomalyDetected', {
                    eventType,
                    currentHour: data.lastHour,
                    average: data.avgHourly,
                    spike: Math.round(data.lastHour / data.avgHourly * 100) / 100
                });
            }
        }
    }

    /**
     * Check performance health
     */
    #checkPerformanceHealth() {
        const metrics = EnhancedSecurityMonitor.#performanceMetrics;
        const uptime = Date.now() - metrics.startTime;
        const avgProcessingTime = metrics.eventCount > 0 ? 
            metrics.processingTime / metrics.eventCount : 0;
        
        // Performance degradation check
        if (avgProcessingTime > 50) { // >50ms average
            EnhancedSecurityMonitor.recordEvent('performanceDegradation', {
                avgProcessingTime: Math.round(avgProcessingTime),
                eventCount: metrics.eventCount,
                uptime: Math.round(uptime / 1000)
            });
        }
    }

    /**
     * Review alert status and handle escalations
     */
    #reviewAlertStatus() {
        const now = Date.now();
        
        EnhancedSecurityMonitor.#alerts.forEach(alert => {
            if (alert.status === 'active') {
                const elapsed = now - alert.timestamp;
                
                // Check if response time exceeded
                if (elapsed > alert.responseTime) {
                    alert.status = 'overdue';
                    
                    EnhancedSecurityMonitor.#secureLog('error', 'Alert response time exceeded', {
                        alertId: alert.id,
                        eventType: alert.type,
                        elapsed: Math.round(elapsed / 1000),
                        responseTime: Math.round(alert.responseTime / 1000)
                    });
                    
                    // Escalate critical alerts
                    if (alert.severity === 'critical') {
                        this.#escalateAlert(alert);
                    }
                }
            }
        });
    }

    /**
     * Escalate critical alerts
     */
    #escalateAlert(alert) {
        // Enhanced notification for escalated alerts
        console.error('[ESCALATED-ALERT]', {
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
            elapsed: Date.now() - alert.timestamp
        });
        
        // Notify subscribers of escalation
        EnhancedSecurityMonitor.#notifySubscribers('escalation', alert);
    }

    /**
     * Get enhanced metrics with trend analysis
     */
    static getMetrics() {
        const summary = {};
        const now = Date.now();
        
        for (const [eventType, events] of this.#metrics.entries()) {
            const last24h = events.filter(e => e.timestamp > now - 24 * 60 * 60 * 1000);
            const lastHour = events.filter(e => e.timestamp > now - 60 * 60 * 1000);
            const last7Days = events.filter(e => e.timestamp > now - 7 * 24 * 60 * 60 * 1000);
            
            summary[eventType] = {
                total: events.length,
                last24h: last24h.length,
                lastHour: lastHour.length,
                last7Days: last7Days.length,
                avgDaily: Math.round(last7Days.length / 7 * 10) / 10,
                avgHourly: Math.round(last24h.length / 24 * 10) / 10,
                lastEvent: events.length > 0 ? events[events.length - 1].timestamp : null,
                trend: this.#calculateTrend(events)
            };
        }
        
        return summary;
    }

    /**
     * Calculate trend for events
     */
    static #calculateTrend(events) {
        if (events.length < 2) return 'stable';
        
        const now = Date.now();
        const recent = events.filter(e => e.timestamp > now - 2 * 60 * 60 * 1000).length;
        const previous = events.filter(e => 
            e.timestamp > now - 4 * 60 * 60 * 1000 && 
            e.timestamp <= now - 2 * 60 * 60 * 1000
        ).length;
        
        if (recent > previous * 1.5) return 'increasing';
        if (recent < previous * 0.5) return 'decreasing';
        return 'stable';
    }

    /**
     * Get active alerts with enhanced information
     */
    static getActiveAlerts() {
        return this.#alerts
            .filter(alert => alert.status === 'active' || alert.status === 'overdue')
            .map(alert => ({
                ...alert,
                elapsed: Date.now() - alert.timestamp,
                timeToResponse: Math.max(0, alert.responseTime - (Date.now() - alert.timestamp))
            }));
    }

    /**
     * Acknowledge alert
     */
    static acknowledgeAlert(alertId, acknowledgedBy = 'system') {
        const alert = this.#alerts.find(a => a.id === alertId);
        if (alert && alert.status !== 'acknowledged') {
            alert.status = 'acknowledged';
            alert.acknowledgedAt = Date.now();
            alert.acknowledgedBy = String(acknowledgedBy).substring(0, 50);
            
            this.#secureLog('info', 'Alert acknowledged', {
                alertId: alertId,
                acknowledgedBy: alert.acknowledgedBy
            });
            
            this.#notifySubscribers('acknowledgment', alert);
            return true;
        }
        return false;
    }

    /**
     * Cleanup expired data
     */
    #cleanupExpiredData() {
        const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
        const cutoff = Date.now() - retentionPeriod;
        
        // Clean metrics
        for (const [eventType, events] of EnhancedSecurityMonitor.#metrics.entries()) {
            const validEvents = events.filter(e => e.timestamp > cutoff);
            EnhancedSecurityMonitor.#metrics.set(eventType, validEvents);
        }
        
        // Clean alerts (keep acknowledged alerts for audit)
        EnhancedSecurityMonitor.#alerts = EnhancedSecurityMonitor.#alerts.filter(alert => 
            alert.timestamp > cutoff || alert.status === 'acknowledged'
        );
    }

    /**
     * Perform comprehensive health check
     */
    static async performHealthCheck() {
        const results = {
            timestamp: Date.now(),
            status: 'healthy',
            checks: {},
            performance: this.#getPerformanceMetrics()
        };

        try {
            results.checks.securityModules = this.#checkSecurityModules();
            results.checks.alerts = this.#checkAlertStatus();
            results.checks.metrics = this.#checkMetricsHealth();
            results.checks.performance = this.#checkPerformanceStatus();
            
            const hasErrors = Object.values(results.checks).some(check => !check.healthy);
            results.status = hasErrors ? 'unhealthy' : 'healthy';
            
        } catch (error) {
            results.status = 'error';
            results.error = error.message;
        }

        return results;
    }

    /**
     * Get performance metrics
     */
    static #getPerformanceMetrics() {
        const metrics = this.#performanceMetrics;
        const uptime = Date.now() - metrics.startTime;
        
        return {
            uptime: Math.round(uptime / 1000),
            eventCount: metrics.eventCount,
            avgProcessingTime: metrics.eventCount > 0 ? 
                Math.round(metrics.processingTime / metrics.eventCount * 100) / 100 : 0,
            eventsPerSecond: metrics.eventCount > 0 ? 
                Math.round(metrics.eventCount / (uptime / 1000) * 100) / 100 : 0
        };
    }

    /**
     * Check security modules status
     */
    static #checkSecurityModules() {
        const modules = [
            'SecurityInputHandler',
            'SecurityDataHandler', 
            'SecurityAuthHandler',
            'EnhancedSecurityMonitor'
        ];
        
        const results = { healthy: true, modules: {} };
        
        for (const module of modules) {
            const available = typeof window[module] !== 'undefined';
            results.modules[module] = available;
            if (!available) results.healthy = false;
        }
        
        return results;
    }

    /**
     * Check alert status
     */
    static #checkAlertStatus() {
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
        const overdueAlerts = activeAlerts.filter(a => a.status === 'overdue');
        
        return {
            healthy: criticalAlerts.length === 0 && overdueAlerts.length === 0,
            activeAlerts: activeAlerts.length,
            criticalAlerts: criticalAlerts.length,
            overdueAlerts: overdueAlerts.length
        };
    }

    /**
     * Check metrics health
     */
    static #checkMetricsHealth() {
        const metrics = this.getMetrics();
        const anomalies = [];
        
        for (const [eventType, data] of Object.entries(metrics)) {
            if (data.trend === 'increasing' && data.lastHour > 20) {
                anomalies.push(`${eventType}: ${data.lastHour} events/hour (increasing)`);
            }
        }
        
        return {
            healthy: anomalies.length === 0,
            anomalies,
            totalEventTypes: Object.keys(metrics).length
        };
    }

    /**
     * Check performance status
     */
    static #checkPerformanceStatus() {
        const perf = this.#getPerformanceMetrics();
        const issues = [];
        
        if (perf.avgProcessingTime > 50) {
            issues.push(`High processing time: ${perf.avgProcessingTime}ms`);
        }
        
        if (perf.eventsPerSecond > 10) {
            issues.push(`High event rate: ${perf.eventsPerSecond}/sec`);
        }
        
        return {
            healthy: issues.length === 0,
            issues,
            metrics: perf
        };
    }

    /**
     * Utility methods
     */
    static #sanitizeEventType(eventType) {
        return String(eventType)
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .substring(0, 50);
    }

    static #sanitizeDetails(details) {
        const sanitized = {};
        if (!details || typeof details !== 'object') return {};
        
        for (const [key, value] of Object.entries(details)) {
            const cleanKey = String(key).replace(/[^\w-]/g, '').substring(0, 50);
            
            if (typeof value === 'string') {
                sanitized[cleanKey] = value.replace(/[<>\"'&\r\n\t]/g, '').substring(0, 200);
            } else if (typeof value === 'number') {
                sanitized[cleanKey] = isNaN(value) ? 0 : Number(value);
            } else if (typeof value === 'boolean') {
                sanitized[cleanKey] = Boolean(value);
            }
        }
        return sanitized;
    }

    static #generateEventId() {
        return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    static #generateAlertId() {
        return 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    static #secureLog(level, message, details) {
        if (window.SecurityDataHandler && window.SecurityDataHandler.secureLog) {
            window.SecurityDataHandler.secureLog(level, message, details);
        }
    }
}

// Global availability
window.EnhancedSecurityMonitor = EnhancedSecurityMonitor;

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    EnhancedSecurityMonitor.getInstance();
});

export default EnhancedSecurityMonitor;