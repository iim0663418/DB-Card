/**
 * PerformanceValidator - 效能驗證器
 * 
 * 測量 Core Web Vitals 和效能指標
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * 效能驗證器
 */
export class PerformanceValidator {
    constructor() {
        this.metrics = {};
        this.thresholds = {
            // Core Web Vitals 閾值
            LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
            FID: { good: 100, poor: 300 },   // First Input Delay (ms)
            CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
            
            // 其他效能指標
            FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
            TTI: { good: 3800, poor: 7300 }, // Time to Interactive (ms)
            TBT: { good: 200, poor: 600 },   // Total Blocking Time (ms)
            
            // 資源載入
            domContentLoaded: { good: 1500, poor: 3000 },
            loadComplete: { good: 3000, poor: 5000 }
        };
    }

    /**
     * 執行效能驗證
     * @returns {Promise<Object>} 效能驗證結果
     */
    async validate() {
        try {
            console.log('[PerformanceValidator] 執行效能驗證...');

            const checks = [];
            let passed = 0;

            // 收集效能指標
            await this.collectMetrics();

            // 驗證 Core Web Vitals
            const coreWebVitalsChecks = this.validateCoreWebVitals();
            checks.push(...coreWebVitalsChecks.checks);
            passed += coreWebVitalsChecks.passed;

            // 驗證載入效能
            const loadingChecks = this.validateLoadingPerformance();
            checks.push(...loadingChecks.checks);
            passed += loadingChecks.passed;

            // 驗證資源效能
            const resourceChecks = await this.validateResourcePerformance();
            checks.push(...resourceChecks.checks);
            passed += resourceChecks.passed;

            // 驗證 PWA 效能
            const pwaChecks = await this.validatePWAPerformance();
            checks.push(...pwaChecks.checks);
            passed += pwaChecks.passed;

            return {
                passed,
                total: checks.length,
                checks,
                metrics: this.metrics,
                score: Math.round((passed / checks.length) * 100)
            };

        } catch (error) {
            return {
                passed: 0,
                total: 1,
                checks: [{
                    name: '效能驗證',
                    passed: false,
                    message: `驗證失敗: ${error.message}`
                }],
                metrics: {},
                score: 0
            };
        }
    }

    /**
     * 收集效能指標
     * @returns {Promise<void>}
     */
    async collectMetrics() {
        // 收集 Navigation Timing API 指標
        if (performance.timing) {
            const timing = performance.timing;
            this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
            this.metrics.loadComplete = timing.loadEventEnd - timing.navigationStart;
            this.metrics.domReady = timing.domComplete - timing.navigationStart;
        }

        // 收集 Performance Observer 指標
        if ('PerformanceObserver' in window) {
            await this.collectWebVitals();
        }

        // 收集記憶體使用情況
        if (performance.memory) {
            this.metrics.memoryUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            this.metrics.memoryTotal = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            this.metrics.memoryLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        }

        // 收集網路資訊
        if (navigator.connection) {
            this.metrics.connectionType = navigator.connection.effectiveType;
            this.metrics.downlink = navigator.connection.downlink;
            this.metrics.rtt = navigator.connection.rtt;
        }
    }

    /**
     * 收集 Core Web Vitals
     * @returns {Promise<void>}
     */
    async collectWebVitals() {
        return new Promise((resolve) => {
            const vitalsCollected = { lcp: false, fid: false, cls: false };
            let timeout;

            const checkComplete = () => {
                if (Object.values(vitalsCollected).every(Boolean) || timeout) {
                    resolve();
                }
            };

            // 設置超時
            timeout = setTimeout(() => {
                timeout = true;
                resolve();
            }, 3000);

            try {
                // Largest Contentful Paint
                const lcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    if (entries.length > 0) {
                        this.metrics.LCP = Math.round(entries[entries.length - 1].startTime);
                        vitalsCollected.lcp = true;
                        checkComplete();
                    }
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

                // First Input Delay
                const fidObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    if (entries.length > 0) {
                        this.metrics.FID = Math.round(entries[0].processingStart - entries[0].startTime);
                        vitalsCollected.fid = true;
                        checkComplete();
                    }
                });
                fidObserver.observe({ entryTypes: ['first-input'] });

                // Cumulative Layout Shift
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    this.metrics.CLS = Math.round(clsValue * 1000) / 1000;
                    vitalsCollected.cls = true;
                    checkComplete();
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });

                // First Contentful Paint
                const fcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    if (entries.length > 0) {
                        this.metrics.FCP = Math.round(entries[0].startTime);
                    }
                });
                fcpObserver.observe({ entryTypes: ['paint'] });

            } catch (error) {
                console.warn('[PerformanceValidator] Web Vitals 收集失敗:', error);
                resolve();
            }
        });
    }

    /**
     * 驗證 Core Web Vitals
     * @returns {Object} Core Web Vitals 驗證結果
     */
    validateCoreWebVitals() {
        const checks = [];
        let passed = 0;

        // LCP (Largest Contentful Paint)
        if (this.metrics.LCP !== undefined) {
            const lcpPassed = this.metrics.LCP <= this.thresholds.LCP.good;
            const lcpStatus = this.metrics.LCP <= this.thresholds.LCP.good ? '良好' :
                             this.metrics.LCP <= this.thresholds.LCP.poor ? '需要改進' : '差';
            
            checks.push({
                name: 'Largest Contentful Paint (LCP)',
                passed: lcpPassed,
                message: `${this.metrics.LCP}ms (${lcpStatus})`,
                priority: 'high'
            });
            if (lcpPassed) passed++;
        }

        // FID (First Input Delay)
        if (this.metrics.FID !== undefined) {
            const fidPassed = this.metrics.FID <= this.thresholds.FID.good;
            const fidStatus = this.metrics.FID <= this.thresholds.FID.good ? '良好' :
                             this.metrics.FID <= this.thresholds.FID.poor ? '需要改進' : '差';
            
            checks.push({
                name: 'First Input Delay (FID)',
                passed: fidPassed,
                message: `${this.metrics.FID}ms (${fidStatus})`,
                priority: 'high'
            });
            if (fidPassed) passed++;
        } else {
            checks.push({
                name: 'First Input Delay (FID)',
                passed: true, // 無互動時視為通過
                message: '無使用者互動記錄',
                priority: 'high'
            });
            passed++;
        }

        // CLS (Cumulative Layout Shift)
        if (this.metrics.CLS !== undefined) {
            const clsPassed = this.metrics.CLS <= this.thresholds.CLS.good;
            const clsStatus = this.metrics.CLS <= this.thresholds.CLS.good ? '良好' :
                             this.metrics.CLS <= this.thresholds.CLS.poor ? '需要改進' : '差';
            
            checks.push({
                name: 'Cumulative Layout Shift (CLS)',
                passed: clsPassed,
                message: `${this.metrics.CLS} (${clsStatus})`,
                priority: 'high'
            });
            if (clsPassed) passed++;
        }

        // FCP (First Contentful Paint)
        if (this.metrics.FCP !== undefined) {
            const fcpPassed = this.metrics.FCP <= this.thresholds.FCP.good;
            const fcpStatus = this.metrics.FCP <= this.thresholds.FCP.good ? '良好' :
                             this.metrics.FCP <= this.thresholds.FCP.poor ? '需要改進' : '差';
            
            checks.push({
                name: 'First Contentful Paint (FCP)',
                passed: fcpPassed,
                message: `${this.metrics.FCP}ms (${fcpStatus})`,
                priority: 'medium'
            });
            if (fcpPassed) passed++;
        }

        return { checks, passed };
    }

    /**
     * 驗證載入效能
     * @returns {Object} 載入效能驗證結果
     */
    validateLoadingPerformance() {
        const checks = [];
        let passed = 0;

        // DOM Content Loaded
        if (this.metrics.domContentLoaded !== undefined) {
            const dclPassed = this.metrics.domContentLoaded <= this.thresholds.domContentLoaded.good;
            const dclStatus = this.metrics.domContentLoaded <= this.thresholds.domContentLoaded.good ? '良好' :
                             this.metrics.domContentLoaded <= this.thresholds.domContentLoaded.poor ? '需要改進' : '差';
            
            checks.push({
                name: 'DOM Content Loaded',
                passed: dclPassed,
                message: `${this.metrics.domContentLoaded}ms (${dclStatus})`,
                priority: 'high'
            });
            if (dclPassed) passed++;
        }

        // Load Complete
        if (this.metrics.loadComplete !== undefined) {
            const loadPassed = this.metrics.loadComplete <= this.thresholds.loadComplete.good;
            const loadStatus = this.metrics.loadComplete <= this.thresholds.loadComplete.good ? '良好' :
                              this.metrics.loadComplete <= this.thresholds.loadComplete.poor ? '需要改進' : '差';
            
            checks.push({
                name: 'Load Complete',
                passed: loadPassed,
                message: `${this.metrics.loadComplete}ms (${loadStatus})`,
                priority: 'medium'
            });
            if (loadPassed) passed++;
        }

        // 記憶體使用
        if (this.metrics.memoryUsed !== undefined) {
            const memoryPassed = this.metrics.memoryUsed <= 50; // 50MB 閾值
            
            checks.push({
                name: '記憶體使用',
                passed: memoryPassed,
                message: `${this.metrics.memoryUsed}MB / ${this.metrics.memoryLimit}MB`,
                priority: 'medium'
            });
            if (memoryPassed) passed++;
        }

        return { checks, passed };
    }

    /**
     * 驗證資源效能
     * @returns {Promise<Object>} 資源效能驗證結果
     */
    async validateResourcePerformance() {
        const checks = [];
        let passed = 0;

        try {
            // 檢查資源載入時間
            const resourceEntries = performance.getEntriesByType('resource');
            
            let slowResources = 0;
            let totalResources = 0;
            
            resourceEntries.forEach(entry => {
                if (entry.duration > 1000) { // 超過 1 秒的資源
                    slowResources++;
                }
                totalResources++;
            });

            const resourcePassed = slowResources === 0 || (slowResources / totalResources) < 0.1;
            
            checks.push({
                name: '資源載入效能',
                passed: resourcePassed,
                message: resourcePassed ? 
                    `${totalResources} 個資源載入正常` : 
                    `${slowResources}/${totalResources} 個資源載入緩慢`,
                priority: 'medium'
            });
            if (resourcePassed) passed++;

            // 檢查圖片優化
            const images = document.querySelectorAll('img');
            let unoptimizedImages = 0;
            
            images.forEach(img => {
                // 檢查是否有 loading="lazy" 屬性
                if (!img.loading || img.loading !== 'lazy') {
                    unoptimizedImages++;
                }
            });

            const imagesPassed = images.length === 0 || unoptimizedImages === 0;
            
            checks.push({
                name: '圖片載入優化',
                passed: imagesPassed,
                message: images.length === 0 ? 
                    '無圖片需要優化' : 
                    imagesPassed ? 
                        '所有圖片已優化' : 
                        `${unoptimizedImages}/${images.length} 圖片未使用懶載入`,
                priority: 'low'
            });
            if (imagesPassed) passed++;

        } catch (error) {
            checks.push({
                name: '資源效能檢查',
                passed: false,
                message: `檢查失敗: ${error.message}`,
                priority: 'medium'
            });
        }

        return { checks, passed };
    }

    /**
     * 驗證 PWA 效能
     * @returns {Promise<Object>} PWA 效能驗證結果
     */
    async validatePWAPerformance() {
        const checks = [];
        let passed = 0;

        // 檢查 Service Worker 註冊時間
        if ('serviceWorker' in navigator) {
            const swRegistrationStart = performance.now();
            
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                const swRegistrationTime = performance.now() - swRegistrationStart;
                
                const swPassed = swRegistrationTime <= 500; // 500ms 閾值
                
                checks.push({
                    name: 'Service Worker 註冊',
                    passed: swPassed,
                    message: registration ? 
                        `註冊時間: ${Math.round(swRegistrationTime)}ms` : 
                        'Service Worker 未註冊',
                    priority: 'medium'
                });
                if (swPassed) passed++;
                
            } catch (error) {
                checks.push({
                    name: 'Service Worker 註冊',
                    passed: false,
                    message: 'Service Worker 檢查失敗',
                    priority: 'medium'
                });
            }
        } else {
            checks.push({
                name: 'Service Worker 支援',
                passed: false,
                message: '瀏覽器不支援 Service Worker',
                priority: 'high'
            });
        }

        // 檢查快取效率
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                const hasPWACache = cacheNames.some(name => name.includes('pwa-card-storage'));
                
                checks.push({
                    name: 'PWA 快取',
                    passed: hasPWACache,
                    message: hasPWACache ? 
                        `${cacheNames.length} 個快取已建立` : 
                        '未找到 PWA 快取',
                    priority: 'medium'
                });
                if (hasPWACache) passed++;
                
            } catch (error) {
                checks.push({
                    name: 'PWA 快取',
                    passed: false,
                    message: '快取檢查失敗',
                    priority: 'medium'
                });
            }
        }

        return { checks, passed };
    }

    /**
     * 生成效能建議
     * @param {Array} failedChecks 失敗的檢查
     * @returns {Array} 效能建議
     */
    generatePerformanceRecommendations(failedChecks) {
        const recommendations = [];

        failedChecks.forEach(check => {
            switch (check.name) {
                case 'Largest Contentful Paint (LCP)':
                    recommendations.push({
                        issue: 'LCP 過慢',
                        action: '優化關鍵資源載入、使用 CDN、壓縮圖片',
                        priority: 'high'
                    });
                    break;
                case 'First Input Delay (FID)':
                    recommendations.push({
                        issue: 'FID 過長',
                        action: '減少 JavaScript 執行時間、使用 Web Workers',
                        priority: 'high'
                    });
                    break;
                case 'Cumulative Layout Shift (CLS)':
                    recommendations.push({
                        issue: 'CLS 過高',
                        action: '為圖片和廣告設定尺寸、避免動態插入內容',
                        priority: 'high'
                    });
                    break;
                case '記憶體使用':
                    recommendations.push({
                        issue: '記憶體使用過高',
                        action: '優化 JavaScript 程式碼、清理未使用的變數',
                        priority: 'medium'
                    });
                    break;
                default:
                    recommendations.push({
                        issue: check.name,
                        action: '請檢查相關效能配置',
                        priority: 'medium'
                    });
            }
        });

        return recommendations;
    }

    /**
     * 取得效能分數
     * @returns {number} 效能分數 (0-100)
     */
    getPerformanceScore() {
        const weights = {
            LCP: 0.25,
            FID: 0.25,
            CLS: 0.25,
            FCP: 0.15,
            domContentLoaded: 0.1
        };

        let totalScore = 0;
        let totalWeight = 0;

        Object.entries(weights).forEach(([metric, weight]) => {
            if (this.metrics[metric] !== undefined) {
                const threshold = this.thresholds[metric];
                let score = 100;
                
                if (this.metrics[metric] > threshold.good) {
                    if (this.metrics[metric] <= threshold.poor) {
                        score = 50; // 需要改進
                    } else {
                        score = 0; // 差
                    }
                }
                
                totalScore += score * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }
}

// 提供便利的匯出
export const performanceValidator = new PerformanceValidator();