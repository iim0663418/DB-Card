/**
 * PWA 效能監控整合
 * 整合 moda 效能監控到 PWA 中
 */

class PWAPerformance {
    constructor() {
        this.designSystemMonitor = null;
        this.isInitialized = false;
        this.performanceData = new Map();
    }

    /**
     * 初始化效能監控
     */
    async initialize() {
        try {
            if (window.DesignSystemMonitor) {
                this.designSystemMonitor = new window.DesignSystemMonitor();
                await this.designSystemMonitor.initialize();
            }

            // 設定 PWA 專用效能監控
            this.setupPWAPerformanceTracking();
            
            this.isInitialized = true;
            console.log('PWA Performance monitoring initialized successfully');
        } catch (error) {
            console.warn('PWA Performance monitoring initialization failed:', error);
        }
    }

    /**
     * 設定 PWA 專用效能監控
     */
    setupPWAPerformanceTracking() {
        // 監控頁面切換效能
        this.trackPageSwitching();
        
        // 監控名片載入效能
        this.trackCardLoading();
        
        // 監控儲存操作效能
        this.trackStorageOperations();
    }

    /**
     * 監控頁面切換效能
     */
    trackPageSwitching() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const startTime = performance.now();
                
                // 使用 MutationObserver 監控頁面切換完成
                const observer = new MutationObserver(() => {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    this.recordMetric('page_switch', duration);
                    observer.disconnect();
                });
                
                observer.observe(document.getElementById('main-content'), {
                    attributes: true,
                    subtree: true
                });
            });
        });
    }

    /**
     * 監控名片載入效能
     */
    trackCardLoading() {
        // 監控名片列表渲染
        const originalRenderCards = window.renderCards;
        if (originalRenderCards) {
            window.renderCards = (...args) => {
                const startTime = performance.now();
                const result = originalRenderCards.apply(this, args);
                const endTime = performance.now();
                
                this.recordMetric('card_render', endTime - startTime);
                return result;
            };
        }
    }

    /**
     * 監控儲存操作效能
     */
    trackStorageOperations() {
        // 監控 IndexedDB 操作
        const originalStoreCard = window.storeCard;
        if (originalStoreCard) {
            window.storeCard = async (...args) => {
                const startTime = performance.now();
                const result = await originalStoreCard.apply(this, args);
                const endTime = performance.now();
                
                this.recordMetric('storage_write', endTime - startTime);
                return result;
            };
        }
    }

    /**
     * 記錄效能指標
     */
    recordMetric(name, value) {
        if (this.designSystemMonitor) {
            this.designSystemMonitor.recordMetric(name, value);
        } else {
            // 降級方案：本地記錄
            if (!this.performanceData.has(name)) {
                this.performanceData.set(name, []);
            }
            this.performanceData.get(name).push({
                value,
                timestamp: performance.now()
            });
        }
    }

    /**
     * 獲取效能報告
     */
    getPerformanceReport() {
        if (this.designSystemMonitor) {
            return this.designSystemMonitor.generateReport();
        } else {
            // 降級方案：本地報告
            const report = {
                timestamp: new Date().toISOString(),
                metrics: {}
            };
            
            this.performanceData.forEach((values, name) => {
                if (values.length > 0) {
                    const recentValues = values.slice(-10).map(v => v.value);
                    report.metrics[name] = {
                        current: recentValues[recentValues.length - 1],
                        average: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
                        count: values.length
                    };
                }
            });
            
            return report;
        }
    }

    /**
     * 獲取效能狀態
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasDesignSystemMonitor: !!this.designSystemMonitor,
            metricsCount: this.performanceData.size
        };
    }
}

// 全域實例
window.pwaPerformance = new PWAPerformance();

// 自動初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.pwaPerformance.initialize();
    }, 200);
});