/**
 * PWA-18: Security Performance Monitoring
 * Monitor PWA security features performance impact and optimize for UX
 */
class SecurityPerformanceMonitor {
    static #instance = null;
    static #metrics = new Map();
    static #config = {
        sampleRate: 0.1, // 10% sampling
        maxMetrics: 1000,
        alertThresholds: {
            authTime: 5000, // 5s
            encryptionTime: 1000, // 1s
            validationTime: 500, // 500ms
            renderTime: 2000 // 2s
        }
    };

    static getInstance() {
        if (!this.#instance) {
            this.#instance = new SecurityPerformanceMonitor();
        }
        return this.#instance;
    }

    constructor() {
        if (SecurityPerformanceMonitor.#instance) {
            return SecurityPerformanceMonitor.#instance;
        }
        this.initPerformanceObserver();
    }

    /**
     * Measure security operation performance
     */
    static measureSecurityOperation(operationType, operation) {
        if (Math.random() > this.#config.sampleRate) {
            return operation(); // Skip measurement for sampling
        }

        const startTime = performance.now();
        const startMemory = this.#getMemoryUsage();

        try {
            const result = operation();
            
            // Handle both sync and async operations
            if (result && typeof result.then === 'function') {
                return result.then(
                    (value) => {
                        this.#recordMetric(operationType, startTime, startMemory, true);
                        return value;
                    },
                    (error) => {
                        this.#recordMetric(operationType, startTime, startMemory, false);
                        throw error;
                    }
                );
            } else {
                this.#recordMetric(operationType, startTime, startMemory, true);
                return result;
            }
        } catch (error) {
            this.#recordMetric(operationType, startTime, startMemory, false);
            throw error;
        }
    }

    /**
     * Get performance metrics summary
     */
    static getPerformanceMetrics() {
        const summary = {};
        
        for (const [operationType, metrics] of this.#metrics.entries()) {
            const times = metrics.map(m => m.duration);
            const memoryUsages = metrics.map(m => m.memoryDelta).filter(m => m !== null);
            
            summary[operationType] = {
                count: metrics.length,
                avgTime: times.reduce((a, b) => a + b, 0) / times.length,
                maxTime: Math.max(...times),
                minTime: Math.min(...times),
                p95Time: this.#percentile(times, 0.95),
                successRate: metrics.filter(m => m.success).length / metrics.length,
                avgMemoryDelta: memoryUsages.length > 0 ? 
                    memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0
            };
        }
        
        return summary;
    }

    /**
     * Get performance alerts
     */
    static getPerformanceAlerts() {
        const alerts = [];
        const metrics = this.getPerformanceMetrics();
        
        for (const [operationType, stats] of Object.entries(metrics)) {
            const threshold = this.#config.alertThresholds[operationType];
            
            if (threshold && stats.p95Time > threshold) {
                alerts.push({
                    type: 'performance',
                    severity: stats.p95Time > threshold * 2 ? 'high' : 'medium',
                    operation: operationType,
                    message: `${operationType} P95 time (${Math.round(stats.p95Time)}ms) exceeds threshold (${threshold}ms)`,
                    recommendation: this.#getPerformanceRecommendation(operationType, stats)
                });
            }
            
            if (stats.successRate < 0.95) {
                alerts.push({
                    type: 'reliability',
                    severity: stats.successRate < 0.9 ? 'high' : 'medium',
                    operation: operationType,
                    message: `${operationType} success rate (${Math.round(stats.successRate * 100)}%) is below 95%`,
                    recommendation: 'Investigate and fix reliability issues'
                });
            }
        }
        
        return alerts;
    }

    /**
     * Monitor accessibility performance
     */
    static measureAccessibilityImpact(element, operation) {
        const startTime = performance.now();
        
        // Measure before state
        const beforeState = this.#getAccessibilityMetrics(element);
        
        const result = operation();
        
        // Measure after state
        const afterTime = performance.now();
        const afterState = this.#getAccessibilityMetrics(element);
        
        const impact = {
            duration: afterTime - startTime,
            focusChanged: beforeState.hasFocus !== afterState.hasFocus,
            ariaChanged: beforeState.ariaAttributes !== afterState.ariaAttributes,
            tabIndexChanged: beforeState.tabIndex !== afterState.tabIndex
        };
        
        // Log if accessibility impact detected
        if (impact.focusChanged || impact.ariaChanged || impact.tabIndexChanged) {
            this.#recordAccessibilityImpact(impact);
        }
        
        return result;
    }

    /**
     * Generate performance report
     */
    static generatePerformanceReport() {
        const metrics = this.getPerformanceMetrics();
        const alerts = this.getPerformanceAlerts();
        
        const report = {
            timestamp: Date.now(),
            summary: {
                totalOperations: Object.values(metrics).reduce((sum, m) => sum + m.count, 0),
                avgPerformance: this.#calculateOverallPerformance(metrics),
                alertCount: alerts.length
            },
            metrics,
            alerts,
            recommendations: this.#generateOptimizationRecommendations(metrics, alerts)
        };
        
        return report;
    }

    // Private methods
    static #recordMetric(operationType, startTime, startMemory, success) {
        const endTime = performance.now();
        const endMemory = this.#getMemoryUsage();
        
        const metric = {
            timestamp: Date.now(),
            duration: endTime - startTime,
            memoryDelta: endMemory !== null && startMemory !== null ? 
                endMemory - startMemory : null,
            success
        };
        
        if (!this.#metrics.has(operationType)) {
            this.#metrics.set(operationType, []);
        }
        
        const metrics = this.#metrics.get(operationType);
        metrics.push(metric);
        
        // Keep only recent metrics
        if (metrics.length > this.#config.maxMetrics) {
            metrics.shift();
        }
        
        // Check for immediate alerts
        this.#checkImmediateAlert(operationType, metric);
    }

    static #getMemoryUsage() {
        try {
            return performance.memory ? performance.memory.usedJSHeapSize : null;
        } catch {
            return null;
        }
    }

    static #percentile(values, p) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }

    static #checkImmediateAlert(operationType, metric) {
        const threshold = this.#config.alertThresholds[operationType];
        
        if (threshold && metric.duration > threshold * 2) {
            // Critical performance issue
            if (window.OfflineSecurityLogger) {
                window.OfflineSecurityLogger.logSecurityEvent('warn', 
                    'Critical security performance issue', {
                    operation: operationType,
                    duration: Math.round(metric.duration),
                    threshold: threshold
                });
            }
        }
    }

    static #getAccessibilityMetrics(element) {
        if (!element) return {};
        
        return {
            hasFocus: document.activeElement === element,
            ariaAttributes: element.getAttribute('aria-label') || element.getAttribute('aria-describedby') || '',
            tabIndex: element.tabIndex
        };
    }

    static #recordAccessibilityImpact(impact) {
        if (!this.#metrics.has('accessibility')) {
            this.#metrics.set('accessibility', []);
        }
        
        this.#metrics.get('accessibility').push({
            timestamp: Date.now(),
            ...impact
        });
    }

    static #calculateOverallPerformance(metrics) {
        const scores = [];
        
        for (const [operationType, stats] of Object.entries(metrics)) {
            const threshold = this.#config.alertThresholds[operationType] || 1000;
            const score = Math.max(0, 100 - (stats.avgTime / threshold) * 100);
            scores.push(score);
        }
        
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
    }

    static #getPerformanceRecommendation(operationType, stats) {
        const recommendations = {
            authTime: 'Consider caching authentication state or optimizing WebAuthn flow',
            encryptionTime: 'Use Web Workers for encryption or optimize key derivation',
            validationTime: 'Optimize validation rules or use schema caching',
            renderTime: 'Implement virtual scrolling or lazy loading for large datasets'
        };
        
        return recommendations[operationType] || 'Review and optimize operation implementation';
    }

    static #generateOptimizationRecommendations(metrics, alerts) {
        const recommendations = [];
        
        // High-level recommendations based on overall performance
        const avgPerf = this.#calculateOverallPerformance(metrics);
        
        if (avgPerf < 70) {
            recommendations.push('Overall security performance is below acceptable levels - consider major optimizations');
        } else if (avgPerf < 85) {
            recommendations.push('Security performance has room for improvement - review slow operations');
        }
        
        // Specific recommendations based on alerts
        const highSeverityAlerts = alerts.filter(a => a.severity === 'high');
        if (highSeverityAlerts.length > 0) {
            recommendations.push('Address high-severity performance alerts immediately');
        }
        
        // Memory-based recommendations
        const memoryIntensiveOps = Object.entries(metrics)
            .filter(([_, stats]) => stats.avgMemoryDelta > 1024 * 1024) // 1MB
            .map(([op, _]) => op);
            
        if (memoryIntensiveOps.length > 0) {
            recommendations.push(`Optimize memory usage for: ${memoryIntensiveOps.join(', ')}`);
        }
        
        return recommendations;
    }

    initPerformanceObserver() {
        try {
            // Observe long tasks that might affect security operations
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // Long task > 50ms
                            SecurityPerformanceMonitor.#recordLongTask(entry);
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            }
        } catch (error) {
            // Performance Observer not supported or failed
            console.warn('[SecurityPerformanceMonitor] Performance Observer unavailable');
        }
    }

    static #recordLongTask(entry) {
        if (window.OfflineSecurityLogger) {
            window.OfflineSecurityLogger.logSecurityEvent('info', 'Long task detected', {
                duration: Math.round(entry.duration),
                startTime: Math.round(entry.startTime)
            });
        }
    }
}

window.SecurityPerformanceMonitor = SecurityPerformanceMonitor;