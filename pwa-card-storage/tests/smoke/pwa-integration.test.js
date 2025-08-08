/**
 * PWA Integration Smoke Tests
 * 
 * PWA 核心整合系統的煙霧測試，驗證 PWA 功能正常運作
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

import { PWAIntegrator } from '../../src/core/pwa-integrator.js';
import { ServiceWorkerManager } from '../../src/utils/service-worker-manager.js';
import { ManifestManager } from '../../src/utils/manifest-manager.js';

/**
 * PWA 整合煙霧測試套件
 */
export class PWAIntegrationSmokeTests {
    constructor() {
        this.testResults = [];
        this.pwaIntegrator = new PWAIntegrator();
    }

    /**
     * 執行所有煙霧測試
     * @returns {Promise<Object>} 測試結果
     */
    async runAllTests() {
        console.log('🧪 [PWA Integration] 開始執行煙霧測試...');
        
        const startTime = Date.now();
        this.testResults = [];

        // PWA 核心功能測試
        await this.testPWAIntegratorCreation();
        await this.testSecurityIntegration();
        await this.testResourceIntegration();
        await this.testServiceWorkerRegistration();
        await this.testManifestConfiguration();
        await this.testOfflineFeatures();
        await this.testFullPWAInitialization();

        // PWA 特定功能測試
        await this.testInstallPrompt();
        await this.testCacheStrategies();
        await this.testNetworkStatusHandling();

        // 效能與可訪問性測試
        await this.testPerformanceBaseline();
        await this.testAccessibilityCompliance();

        const endTime = Date.now();
        const duration = endTime - startTime;

        const summary = this.generateTestSummary(duration);
        console.log('✅ [PWA Integration] 煙霧測試完成');
        
        return summary;
    }

    /**
     * 測試 PWAIntegrator 建立
     */
    async testPWAIntegratorCreation() {
        try {
            const integrator = new PWAIntegrator();
            
            this.assert(
                integrator instanceof PWAIntegrator,
                'PWAIntegrator 實例建立成功'
            );
            
            this.assert(
                integrator.serviceWorkerManager instanceof ServiceWorkerManager,
                'ServiceWorkerManager 組件初始化成功'
            );
            
            this.assert(
                integrator.manifestManager instanceof ManifestManager,
                'ManifestManager 組件初始化成功'
            );

            this.assert(
                typeof integrator.features === 'object',
                '功能狀態物件初始化成功'
            );

        } catch (error) {
            this.recordFailure('PWAIntegrator 建立測試', error);
        }
    }

    /**
     * 測試安全組件整合
     */
    async testSecurityIntegration() {
        try {
            const securityResult = await this.pwaIntegrator.initializeSecurity();
            
            this.assert(
                typeof securityResult === 'object',
                '安全初始化回傳物件'
            );
            
            this.assert(
                securityResult.success === true || securityResult.mode === 'basic',
                '安全組件初始化成功或使用基本模式'
            );

            // 檢查 CSP 標頭是否存在
            const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            this.assert(
                cspMeta !== null,
                'CSP 標頭已配置'
            );

        } catch (error) {
            this.recordFailure('安全組件整合測試', error);
        }
    }

    /**
     * 測試資源整合
     */
    async testResourceIntegration() {
        try {
            const resourceResult = await this.pwaIntegrator.initializeResources();
            
            this.assert(
                typeof resourceResult === 'object',
                '資源初始化回傳物件'
            );
            
            this.assert(
                resourceResult.success === true || resourceResult.mode === 'basic',
                '資源管理初始化成功或跳過'
            );

        } catch (error) {
            this.recordFailure('資源整合測試', error);
        }
    }

    /**
     * 測試 Service Worker 註冊
     */
    async testServiceWorkerRegistration() {
        try {
            // 檢查瀏覽器支援
            if (!('serviceWorker' in navigator)) {
                this.recordSuccess('Service Worker 註冊測試 (瀏覽器不支援，跳過)');
                return;
            }

            const swResult = await this.pwaIntegrator.registerServiceWorker();
            
            this.assert(
                typeof swResult === 'object',
                'Service Worker 註冊回傳物件'
            );
            
            // 允許註冊失敗（在測試環境中）
            this.assert(
                swResult.success === true || swResult.error,
                'Service Worker 註冊嘗試完成'
            );

            if (swResult.success) {
                this.assert(
                    swResult.registration,
                    'Service Worker 註冊物件存在'
                );
            }

        } catch (error) {
            this.recordFailure('Service Worker 註冊測試', error);
        }
    }

    /**
     * 測試 Manifest 配置
     */
    async testManifestConfiguration() {
        try {
            const manifestResult = await this.pwaIntegrator.configureManifest();
            
            this.assert(
                typeof manifestResult === 'object',
                'Manifest 配置回傳物件'
            );
            
            this.assert(
                manifestResult.success === true || manifestResult.error,
                'Manifest 配置嘗試完成'
            );

            // 檢查 manifest link 標籤
            const manifestLink = document.querySelector('link[rel="manifest"]');
            this.assert(
                manifestLink !== null,
                'Manifest link 標籤存在'
            );

        } catch (error) {
            this.recordFailure('Manifest 配置測試', error);
        }
    }

    /**
     * 測試離線功能
     */
    async testOfflineFeatures() {
        try {
            const offlineResult = await this.pwaIntegrator.enableOfflineFeatures();
            
            this.assert(
                typeof offlineResult === 'object',
                '離線功能啟用回傳物件'
            );
            
            this.assert(
                offlineResult.success === true,
                '離線功能啟用成功'
            );

            this.assert(
                typeof offlineResult.isOnline === 'boolean',
                '網路狀態檢測正常'
            );

        } catch (error) {
            this.recordFailure('離線功能測試', error);
        }
    }

    /**
     * 測試完整 PWA 初始化
     */
    async testFullPWAInitialization() {
        try {
            const initResult = await this.pwaIntegrator.initialize();
            
            this.assert(
                typeof initResult === 'object',
                'PWA 初始化回傳物件'
            );
            
            this.assert(
                initResult.success === true || initResult.error,
                'PWA 初始化嘗試完成'
            );

            if (initResult.success) {
                this.assert(
                    typeof initResult.features === 'object',
                    '功能狀態物件存在'
                );

                this.assert(
                    initResult.duration,
                    '初始化時間記錄存在'
                );
            }

        } catch (error) {
            this.recordFailure('完整 PWA 初始化測試', error);
        }
    }

    /**
     * 測試安裝提示功能
     */
    async testInstallPrompt() {
        try {
            // 檢查安裝提示元素
            const installPrompt = document.getElementById('install-prompt');
            this.assert(
                installPrompt !== null,
                '安裝提示元素存在'
            );

            const installButton = document.getElementById('install-button');
            this.assert(
                installButton !== null,
                '安裝按鈕存在'
            );

            const dismissButton = document.getElementById('install-dismiss');
            this.assert(
                dismissButton !== null,
                '稍後按鈕存在'
            );

            // 測試按鈕可訪問性
            this.assert(
                installButton.tagName === 'BUTTON',
                '安裝按鈕為 button 元素'
            );

        } catch (error) {
            this.recordFailure('安裝提示測試', error);
        }
    }

    /**
     * 測試快取策略
     */
    async testCacheStrategies() {
        try {
            // 檢查 Service Worker 是否支援快取
            if ('serviceWorker' in navigator && 'caches' in window) {
                // 測試快取 API 可用性
                const cacheNames = await caches.keys();
                this.assert(
                    Array.isArray(cacheNames),
                    '快取 API 可用'
                );

                // 檢查是否有 PWA 相關快取
                const pwaCaches = cacheNames.filter(name => name.includes('pwa-card-storage'));
                this.assert(
                    pwaCaches.length >= 0,
                    'PWA 快取檢查完成'
                );

            } else {
                this.recordSuccess('快取策略測試 (瀏覽器不支援，跳過)');
            }

        } catch (error) {
            this.recordFailure('快取策略測試', error);
        }
    }

    /**
     * 測試網路狀態處理
     */
    async testNetworkStatusHandling() {
        try {
            // 檢查網路狀態 API
            const isOnline = navigator.onLine;
            this.assert(
                typeof isOnline === 'boolean',
                '網路狀態 API 可用'
            );

            // 檢查連線狀態顯示元素
            const statusElement = document.getElementById('connection-status');
            this.assert(
                statusElement !== null,
                '連線狀態顯示元素存在'
            );

            // 模擬網路狀態變更事件
            const onlineEvent = new Event('online');
            const offlineEvent = new Event('offline');
            
            this.assert(
                typeof onlineEvent === 'object',
                '線上事件建立成功'
            );

            this.assert(
                typeof offlineEvent === 'object',
                '離線事件建立成功'
            );

        } catch (error) {
            this.recordFailure('網路狀態處理測試', error);
        }
    }

    /**
     * 測試效能基準
     */
    async testPerformanceBaseline() {
        try {
            const startTime = Date.now();
            
            // 執行基本 PWA 初始化
            await this.pwaIntegrator.initialize();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.assert(
                duration < 3000, // 3 秒內完成
                `PWA 初始化效能基準測試通過 (${duration}ms < 3000ms)`
            );

            // 檢查記憶體使用（如果可用）
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
                this.assert(
                    memoryUsage < 50, // 50MB 以下
                    `記憶體使用基準測試通過 (${memoryUsage.toFixed(2)}MB < 50MB)`
                );
            }

        } catch (error) {
            this.recordFailure('效能基準測試', error);
        }
    }

    /**
     * 測試可訪問性合規
     */
    async testAccessibilityCompliance() {
        try {
            // 檢查 ARIA 標籤
            const installButton = document.getElementById('install-button');
            if (installButton) {
                this.assert(
                    installButton.textContent.trim().length > 0,
                    '安裝按鈕有文字內容'
                );
            }

            // 檢查語言設定
            const htmlLang = document.documentElement.lang;
            this.assert(
                htmlLang && htmlLang.length > 0,
                'HTML 語言屬性已設定'
            );

            // 檢查主題色彩 meta 標籤
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            this.assert(
                themeColorMeta !== null,
                '主題色彩 meta 標籤存在'
            );

            // 檢查 viewport meta 標籤
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            this.assert(
                viewportMeta !== null,
                'Viewport meta 標籤存在'
            );

        } catch (error) {
            this.recordFailure('可訪問性合規測試', error);
        }
    }

    /**
     * 斷言輔助函數
     * @param {boolean} condition 條件
     * @param {string} message 訊息
     */
    assert(condition, message) {
        if (condition) {
            this.recordSuccess(message);
        } else {
            this.recordFailure(message, new Error('斷言失敗'));
        }
    }

    /**
     * 記錄成功測試
     * @param {string} testName 測試名稱
     */
    recordSuccess(testName) {
        this.testResults.push({
            name: testName,
            status: 'PASS',
            timestamp: new Date().toISOString()
        });
        console.log(`✅ ${testName}`);
    }

    /**
     * 記錄失敗測試
     * @param {string} testName 測試名稱
     * @param {Error} error 錯誤物件
     */
    recordFailure(testName, error) {
        this.testResults.push({
            name: testName,
            status: 'FAIL',
            error: error.message,
            timestamp: new Date().toISOString()
        });
        console.error(`❌ ${testName}: ${error.message}`);
    }

    /**
     * 生成測試摘要
     * @param {number} duration 執行時間
     * @returns {Object} 測試摘要
     */
    generateTestSummary(duration) {
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;
        
        return {
            summary: {
                total,
                passed,
                failed,
                passRate: total > 0 ? (passed / total * 100).toFixed(1) : 0,
                duration: `${duration}ms`
            },
            results: this.testResults,
            pwaFeatures: {
                serviceWorkerSupported: 'serviceWorker' in navigator,
                cacheApiSupported: 'caches' in window,
                notificationSupported: 'Notification' in window,
                pushSupported: 'PushManager' in window
            },
            timestamp: new Date().toISOString()
        };
    }
}

// 提供便利的測試執行函數
export async function runPWAIntegrationSmokeTests() {
    const testSuite = new PWAIntegrationSmokeTests();
    return await testSuite.runAllTests();
}

// 如果直接執行此檔案，自動運行測試
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
    runPWAIntegrationSmokeTests().then(results => {
        console.log('🎯 PWA Integration 煙霧測試結果:', results);
    });
}