/**
 * moda 設計系統效能監控器
 * 負責監控設計系統效能指標，提供效能優化建議
 */

class DesignSystemMonitor {
    constructor() {
        this.isInitialized = false;
        this.metrics = new Map();
        this.thresholds = this.createThresholds();
        this.observers = [];
    }

    /**
     * 初始化效能監控器
     */
    async initialize() {
        try {
            this.setupPerformanceObservers();
            this.startMetricsCollection();
            this.isInitialized = true;
            this.recordMetric('monitor_initialized', performance.now());
        } catch (error) {
            throw new Error(`Design System Monitor initialization failed: ${error.message}`);
        }
    }

    /**
     * 建立效能閾值
     */
    createThresholds() {
        return {
            cssVariableUpdate: 100, // ms
            themeSwitch: 200, // ms
            initialization: 500, // ms
            memoryUsage: 10 * 1024 * 1024, // 10MB
            domNodes: 1000,
            cssRules: 500
        };
    }

    /**
     * 設定效能觀察器
     */
    setupPerformanceObservers() {
        // 監控長任務
        if ('PerformanceObserver' in window) {
            const longTaskObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.duration > 50) {
                        this.recordMetric('long_task', entry.duration);
                    }
                });
            });

            try {
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.push(longTaskObserver);
            } catch (e) {
                // longtask 不被支援時忽略
            }

            // 監控佈局偏移
            const layoutShiftObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.value > 0.1) {
                        this.recordMetric('layout_shift', entry.value);
                    }
                });
            });

            try {
                layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.push(layoutShiftObserver);
            } catch (e) {
                // layout-shift 不被支援時忽略
            }
        }
    }

    /**
     * 開始指標收集
     */
    startMetricsCollection() {
        // 每5秒收集一次系統指標
        this.metricsInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 5000);
    }

    /**
     * 收集系統指標
     */
    collectSystemMetrics() {
        // 記憶體使用
        if (performance.memory) {
            this.recordMetric('memory_used', performance.memory.usedJSHeapSize);
            this.recordMetric('memory_total', performance.memory.totalJSHeapSize);
        }

        // DOM節點數量
        this.recordMetric('dom_nodes', document.querySelectorAll('*').length);

        // CSS規則數量
        let cssRulesCount = 0;
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const sheet = document.styleSheets[i];
                if (sheet.cssRules) {
                    cssRulesCount += sheet.cssRules.length;
                }
            } catch (e) {
                // 跨域樣式表無法訪問時忽略
            }
        }
        this.recordMetric('css_rules', cssRulesCount);
    }

    /**
     * 記錄效能指標
     */
    recordMetric(name, value, timestamp = performance.now()) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const metricArray = this.metrics.get(name);
        metricArray.push({ value, timestamp });

        // 保持最近100個記錄
        if (metricArray.length > 100) {
            metricArray.shift();
        }

        // 檢查是否超過閾值
        this.checkThreshold(name, value);
    }

    /**
     * 檢查閾值
     */
    checkThreshold(name, value) {
        const threshold = this.thresholds[name];
        if (threshold && value > threshold) {
            console.warn(`[Design System Monitor] ${name} exceeded threshold: ${value} > ${threshold}`);
            this.recordMetric('threshold_exceeded', 1);
        }
    }

    /**
     * 測量CSS變數更新效能
     */
    measureCSSVariableUpdate(updateFunction) {
        const startTime = performance.now();
        
        return new Promise((resolve) => {
            updateFunction();
            
            requestAnimationFrame(() => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                this.recordMetric('css_variable_update', duration);
                resolve(duration);
            });
        });
    }

    /**
     * 測量主題切換效能
     */
    measureThemeSwitch(switchFunction) {
        const startTime = performance.now();
        
        return new Promise((resolve) => {
            switchFunction();
            
            // 等待動畫完成
            setTimeout(() => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                this.recordMetric('theme_switch', duration);
                resolve(duration);
            }, 250);
        });
    }

    /**
     * 獲取效能統計
     */
    getPerformanceStats() {
        const stats = {};
        
        this.metrics.forEach((values, name) => {
            if (values.length > 0) {
                const recentValues = values.slice(-10).map(v => v.value);
                stats[name] = {
                    current: recentValues[recentValues.length - 1],
                    average: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
                    min: Math.min(...recentValues),
                    max: Math.max(...recentValues),
                    count: values.length,
                    threshold: this.thresholds[name] || null
                };
            }
        });

        return stats;
    }

    /**
     * 獲取效能建議
     */
    getPerformanceRecommendations() {
        const stats = this.getPerformanceStats();
        const recommendations = [];

        // CSS變數更新效能建議
        if (stats.css_variable_update && stats.css_variable_update.average > this.thresholds.cssVariableUpdate) {
            recommendations.push({
                type: 'performance',
                severity: 'medium',
                message: `CSS變數更新平均時間 ${stats.css_variable_update.average.toFixed(2)}ms 超過建議值 ${this.thresholds.cssVariableUpdate}ms`,
                suggestion: '考慮使用批次更新或減少變數數量'
            });
        }

        // 主題切換效能建議
        if (stats.theme_switch && stats.theme_switch.average > this.thresholds.themeSwitch) {
            recommendations.push({
                type: 'performance',
                severity: 'medium',
                message: `主題切換平均時間 ${stats.theme_switch.average.toFixed(2)}ms 超過建議值 ${this.thresholds.themeSwitch}ms`,
                suggestion: '優化CSS transition或減少需要更新的元素'
            });
        }

        // 記憶體使用建議
        if (stats.memory_used && stats.memory_used.current > this.thresholds.memoryUsage) {
            recommendations.push({
                type: 'memory',
                severity: 'high',
                message: `記憶體使用 ${(stats.memory_used.current / 1024 / 1024).toFixed(2)}MB 超過建議值 ${this.thresholds.memoryUsage / 1024 / 1024}MB`,
                suggestion: '檢查是否有記憶體洩漏或過多的DOM節點'
            });
        }

        // DOM節點數量建議
        if (stats.dom_nodes && stats.dom_nodes.current > this.thresholds.domNodes) {
            recommendations.push({
                type: 'dom',
                severity: 'medium',
                message: `DOM節點數量 ${stats.dom_nodes.current} 超過建議值 ${this.thresholds.domNodes}`,
                suggestion: '考慮虛擬化或延遲載入部分內容'
            });
        }

        return recommendations;
    }

    /**
     * 生成效能報告
     */
    generateReport() {
        return {
            timestamp: new Date().toISOString(),
            initialized: this.isInitialized,
            stats: this.getPerformanceStats(),
            recommendations: this.getPerformanceRecommendations(),
            thresholds: this.thresholds,
            systemInfo: {
                userAgent: navigator.userAgent,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null,
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink
                } : null
            }
        };
    }

    /**
     * 清理資源
     */
    cleanup() {
        // 停止觀察器
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        // 清理定時器
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }

        // 清理數據
        this.metrics.clear();
        this.isInitialized = false;
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DesignSystemMonitor;
} else if (typeof window !== 'undefined') {
    window.DesignSystemMonitor = DesignSystemMonitor;
}