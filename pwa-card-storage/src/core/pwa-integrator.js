/**
 * PWAIntegrator - PWA 核心整合系統
 * 
 * 統籌 PWA 初始化，整合安全組件，管理 Service Worker 和 manifest
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

import { securityCore, initializeSecurity } from '../security/security-core.js';
import { resourceManager } from './resource-manager.js';
import { ServiceWorkerManager } from '../utils/service-worker-manager.js';
import { ManifestManager } from '../utils/manifest-manager.js';

/**
 * PWA 整合器 - 統籌所有 PWA 功能
 */
export class PWAIntegrator {
    constructor() {
        this.serviceWorkerManager = new ServiceWorkerManager();
        this.manifestManager = new ManifestManager();
        this.isInitialized = false;
        this.initializationPromise = null;
        this.features = {
            serviceWorker: false,
            manifest: false,
            security: false,
            resources: false,
            offline: false
        };
    }

    /**
     * 初始化 PWA 系統
     * @returns {Promise<Object>} 初始化結果
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    /**
     * 執行 PWA 初始化流程
     * @private
     * @returns {Promise<Object>} 初始化結果
     */
    async _performInitialization() {
        try {
            console.log('[PWAIntegrator] 開始 PWA 系統初始化...');
            
            const startTime = Date.now();
            const results = {};

            // 1. 安全組件初始化
            results.security = await this.initializeSecurity();
            this.features.security = results.security.success;

            // 2. 資源管理初始化
            results.resources = await this.initializeResources();
            this.features.resources = results.resources.success;

            // 3. Service Worker 註冊
            results.serviceWorker = await this.registerServiceWorker();
            this.features.serviceWorker = results.serviceWorker.success;

            // 4. Manifest 配置
            results.manifest = await this.configureManifest();
            this.features.manifest = results.manifest.success;

            // 5. 離線功能啟用
            results.offline = await this.enableOfflineFeatures();
            this.features.offline = results.offline.success;

            const endTime = Date.now();
            const duration = endTime - startTime;

            this.isInitialized = true;

            const summary = {
                success: true,
                duration: `${duration}ms`,
                features: this.features,
                results,
                timestamp: new Date().toISOString()
            };

            console.log(`[PWAIntegrator] PWA 初始化完成 (${duration}ms)`);
            this.notifyInitializationComplete(summary);

            return summary;

        } catch (error) {
            console.error('[PWAIntegrator] PWA 初始化失敗:', error);
            
            return {
                success: false,
                error: error.message,
                features: this.features,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 初始化安全組件
     * @returns {Promise<Object>} 安全初始化結果
     */
    async initializeSecurity() {
        try {
            console.log('[PWAIntegrator] 初始化安全組件...');

            // 檢查安全組件是否可用
            if (typeof securityCore === 'undefined') {
                console.warn('[PWAIntegrator] 安全組件未載入，使用基本安全設定');
                return {
                    success: true,
                    mode: 'basic',
                    message: '使用基本安全設定'
                };
            }

            // 初始化安全核心
            const securityResult = await securityCore.initialize();
            
            // 配置 CSP 標頭
            this.configureCSP();

            return {
                success: true,
                mode: 'enhanced',
                securityResult,
                message: '安全組件初始化完成'
            };

        } catch (error) {
            console.error('[PWAIntegrator] 安全組件初始化失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 初始化資源管理
     * @returns {Promise<Object>} 資源初始化結果
     */
    async initializeResources() {
        try {
            console.log('[PWAIntegrator] 初始化資源管理...');

            // 檢查資源管理器是否可用
            if (typeof resourceManager === 'undefined') {
                console.warn('[PWAIntegrator] 資源管理器未載入，跳過資源整合');
                return {
                    success: true,
                    mode: 'basic',
                    message: '跳過資源整合'
                };
            }

            // 執行資源整合
            const resourceResult = await resourceManager.integrateResources();

            return {
                success: resourceResult.success,
                resourceResult,
                message: resourceResult.success ? '資源整合完成' : '資源整合失敗'
            };

        } catch (error) {
            console.error('[PWAIntegrator] 資源管理初始化失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 註冊 Service Worker
     * @returns {Promise<Object>} Service Worker 註冊結果
     */
    async registerServiceWorker() {
        try {
            console.log('[PWAIntegrator] 註冊 Service Worker...');

            const registration = await this.serviceWorkerManager.register();
            
            return {
                success: true,
                registration,
                message: 'Service Worker 註冊成功'
            };

        } catch (error) {
            console.error('[PWAIntegrator] Service Worker 註冊失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 配置 PWA Manifest
     * @returns {Promise<Object>} Manifest 配置結果
     */
    async configureManifest() {
        try {
            console.log('[PWAIntegrator] 配置 PWA Manifest...');

            const manifestResult = await this.manifestManager.configure();
            
            // 設置安裝提示
            this.setupInstallPrompt();

            return {
                success: true,
                manifestResult,
                message: 'PWA Manifest 配置完成'
            };

        } catch (error) {
            console.error('[PWAIntegrator] Manifest 配置失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 啟用離線功能
     * @returns {Promise<Object>} 離線功能啟用結果
     */
    async enableOfflineFeatures() {
        try {
            console.log('[PWAIntegrator] 啟用離線功能...');

            // 檢查離線狀態
            const isOnline = navigator.onLine;
            
            // 設置離線事件監聽
            this.setupOfflineHandlers();

            // 預載關鍵資源（僅在需要時）
            if (navigator.onLine) {
                await this.preloadCriticalResources();
            }

            return {
                success: true,
                isOnline,
                message: '離線功能啟用完成'
            };

        } catch (error) {
            console.error('[PWAIntegrator] 離線功能啟用失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 配置 Content Security Policy
     * @private
     */
    configureCSP() {
        // 檢查是否已有 CSP 標頭
        const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (existingCSP) {
            console.log('[PWAIntegrator] CSP 標頭已存在，跳過配置');
            return;
        }

        // 動態添加 CSP 標頭（僅在必要時）
        const cspMeta = document.createElement('meta');
        cspMeta.httpEquiv = 'Content-Security-Policy';
        cspMeta.content = `
            default-src 'self';
            script-src 'self' 'unsafe-inline';
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            font-src 'self' https://fonts.gstatic.com;
            img-src 'self' data: https:;
            connect-src 'self' https:;
            worker-src 'self';
            manifest-src 'self';
        `.replace(/\s+/g, ' ').trim();

        document.head.appendChild(cspMeta);
        console.log('[PWAIntegrator] CSP 標頭已配置');
    }

    /**
     * 設置 PWA 安裝提示
     * @private
     */
    setupInstallPrompt() {
        let deferredPrompt = null;

        // 監聽 beforeinstallprompt 事件
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('[PWAIntegrator] PWA 安裝提示可用');
            
            // 阻止預設的安裝提示
            event.preventDefault();
            deferredPrompt = event;

            // 顯示自訂安裝提示
            this.showInstallPrompt(deferredPrompt);
        });

        // 監聽 appinstalled 事件
        window.addEventListener('appinstalled', () => {
            console.log('[PWAIntegrator] PWA 已安裝');
            this.hideInstallPrompt();
            deferredPrompt = null;
        });
    }

    /**
     * 顯示安裝提示
     * @private
     * @param {Event} deferredPrompt 延遲的安裝提示事件
     */
    showInstallPrompt(deferredPrompt) {
        const installPrompt = document.getElementById('install-prompt');
        const installButton = document.getElementById('install-button');
        const dismissButton = document.getElementById('install-dismiss');

        if (!installPrompt) return;

        // 顯示安裝提示
        installPrompt.classList.remove('hidden');

        // 安裝按鈕事件
        installButton.onclick = async () => {
            try {
                // 顯示安裝提示
                deferredPrompt.prompt();
                
                // 等待使用者選擇
                const { outcome } = await deferredPrompt.userChoice;
                
                console.log(`[PWAIntegrator] 使用者選擇: ${outcome}`);
                
                if (outcome === 'accepted') {
                    console.log('[PWAIntegrator] 使用者接受安裝');
                } else {
                    console.log('[PWAIntegrator] 使用者拒絕安裝');
                }

                this.hideInstallPrompt();
                
            } catch (error) {
                console.error('[PWAIntegrator] 安裝提示錯誤:', error);
            }
        };

        // 稍後按鈕事件
        dismissButton.onclick = () => {
            this.hideInstallPrompt();
        };
    }

    /**
     * 隱藏安裝提示
     * @private
     */
    hideInstallPrompt() {
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) {
            installPrompt.classList.add('hidden');
        }
    }

    /**
     * 設置離線事件處理
     * @private
     */
    setupOfflineHandlers() {
        // 線上狀態變更監聽
        window.addEventListener('online', () => {
            console.log('[PWAIntegrator] 網路連線恢復');
            this.updateConnectionStatus(true);
        });

        window.addEventListener('offline', () => {
            console.log('[PWAIntegrator] 網路連線中斷');
            this.updateConnectionStatus(false);
        });

        // 初始狀態設定
        this.updateConnectionStatus(navigator.onLine);
    }

    /**
     * 更新連線狀態顯示
     * @private
     * @param {boolean} isOnline 是否線上
     */
    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = isOnline ? '線上模式' : '離線模式';
            statusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }
    }

    /**
     * 預載關鍵資源
     * @private
     * @returns {Promise<void>}
     */
    async preloadCriticalResources() {
        const criticalResources = [
            'assets/styles/main.css',
            'assets/styles/components.css'
            // 移除 src/app.js，因為已在 HTML 中載入
        ];

        const preloadPromises = criticalResources.map(resource => {
            return new Promise((resolve) => {
                // 檢查資源是否已存在
                const existing = document.querySelector(`link[href="${resource}"]`);
                if (existing) {
                    resolve(true);
                    return;
                }

                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = resource;
                link.as = resource.endsWith('.css') ? 'style' : 'script';
                link.onload = () => resolve(true);
                link.onerror = () => resolve(false);
                document.head.appendChild(link);
            });
        });

        const results = await Promise.all(preloadPromises);
        const successCount = results.filter(Boolean).length;
        
        console.log(`[PWAIntegrator] 預載完成: ${successCount}/${criticalResources.length} 個資源`);
    }

    /**
     * 通知初始化完成
     * @private
     * @param {Object} summary 初始化摘要
     */
    notifyInitializationComplete(summary) {
        // 發送自訂事件
        const event = new CustomEvent('pwa-initialized', {
            detail: summary
        });
        window.dispatchEvent(event);

        // 更新 UI 狀態
        this.updateUIStatus(summary);
    }

    /**
     * 更新 UI 狀態
     * @private
     * @param {Object} summary 初始化摘要
     */
    updateUIStatus(summary) {
        // 更新版本資訊
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            versionElement.textContent = 'v3.2.0';
        }

        // 更新載入狀態
        const loadingOverlay = document.getElementById('loading');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }

        // 顯示功能狀態
        console.log('[PWAIntegrator] 功能狀態:', summary.features);
    }

    /**
     * 取得 PWA 狀態
     * @returns {Object} PWA 狀態資訊
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            features: this.features,
            serviceWorker: this.serviceWorkerManager.getStatus(),
            manifest: this.manifestManager.getStatus(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 重新初始化 PWA
     * @returns {Promise<Object>} 重新初始化結果
     */
    async reinitialize() {
        console.log('[PWAIntegrator] 重新初始化 PWA...');
        
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // 重置功能狀態
        Object.keys(this.features).forEach(key => {
            this.features[key] = false;
        });

        return await this.initialize();
    }
}

// 提供全域實例
export const pwaIntegrator = new PWAIntegrator();

/**
 * 快速初始化 PWA 的便利函數
 * @returns {Promise<Object>} 初始化結果
 */
export async function initializePWA() {
    return await pwaIntegrator.initialize();
}

/**
 * 取得 PWA 狀態的便利函數
 * @returns {Object} PWA 狀態
 */
export function getPWAStatus() {
    return pwaIntegrator.getStatus();
}