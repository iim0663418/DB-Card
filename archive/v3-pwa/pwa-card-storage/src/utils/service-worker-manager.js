/**
 * ServiceWorkerManager - Service Worker 管理器
 * 
 * 管理 Service Worker 註冊、更新和生命週期
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * Service Worker 管理器
 */
export class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isRegistered = false;
        this.updateAvailable = false;
        this.swPath = './sw.js';
        this.scope = './';
    }

    /**
     * 註冊 Service Worker
     * @returns {Promise<Object>} 註冊結果
     */
    async register() {
        try {
            // 檢查瀏覽器支援
            if (!('serviceWorker' in navigator)) {
                throw new Error('瀏覽器不支援 Service Worker');
            }

            console.log('[ServiceWorkerManager] 開始註冊 Service Worker...');

            // 註冊 Service Worker
            this.registration = await navigator.serviceWorker.register(this.swPath, {
                scope: this.scope,
                updateViaCache: 'none' // 確保 SW 檔案不被快取
            });

            console.log(`[ServiceWorkerManager] Service Worker 註冊成功: ${this.registration.scope}`);

            // 設置事件監聽
            this.setupEventListeners();

            // 檢查更新
            await this.checkForUpdates();

            this.isRegistered = true;

            return {
                success: true,
                registration: this.registration,
                scope: this.registration.scope,
                state: this.getWorkerState()
            };

        } catch (error) {
            console.error('[ServiceWorkerManager] Service Worker 註冊失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 設置事件監聽器
     * @private
     */
    setupEventListeners() {
        if (!this.registration) return;

        // 監聽 Service Worker 狀態變更
        this.registration.addEventListener('updatefound', () => {
            console.log('[ServiceWorkerManager] 發現 Service Worker 更新');
            
            const newWorker = this.registration.installing;
            if (newWorker) {
                this.handleWorkerUpdate(newWorker);
            }
        });

        // 監聽來自 Service Worker 的訊息
        navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleWorkerMessage(event);
        });

        // 監聽控制器變更
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[ServiceWorkerManager] Service Worker 控制器已變更');
            this.notifyControllerChange();
        });
    }

    /**
     * 處理 Service Worker 更新
     * @private
     * @param {ServiceWorker} newWorker 新的 Service Worker
     */
    handleWorkerUpdate(newWorker) {
        newWorker.addEventListener('statechange', () => {
            console.log(`[ServiceWorkerManager] 新 Service Worker 狀態: ${newWorker.state}`);
            
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // 有舊的 Service Worker，顯示更新提示
                    this.updateAvailable = true;
                    this.showUpdatePrompt();
                } else {
                    // 首次安裝
                    console.log('[ServiceWorkerManager] Service Worker 首次安裝完成');
                    this.notifyInstallComplete();
                }
            }
        });
    }

    /**
     * 處理來自 Service Worker 的訊息
     * @private
     * @param {MessageEvent} event 訊息事件
     */
    handleWorkerMessage(event) {
        const { type, payload } = event.data || {};
        
        console.log(`[ServiceWorkerManager] 收到 SW 訊息: ${type}`, payload);

        switch (type) {
            case 'CACHE_UPDATED':
                this.handleCacheUpdate(payload);
                break;
            case 'OFFLINE_READY':
                this.handleOfflineReady(payload);
                break;
            case 'ERROR':
                this.handleWorkerError(payload);
                break;
            default:
                console.log('[ServiceWorkerManager] 未知的 SW 訊息類型:', type);
        }
    }

    /**
     * 處理快取更新
     * @private
     * @param {Object} payload 訊息內容
     */
    handleCacheUpdate(payload) {
        console.log('[ServiceWorkerManager] 快取已更新:', payload);
        
        // 通知應用程式快取已更新
        this.dispatchEvent('cache-updated', payload);
    }

    /**
     * 處理離線就緒
     * @private
     * @param {Object} payload 訊息內容
     */
    handleOfflineReady(payload) {
        console.log('[ServiceWorkerManager] 離線功能就緒:', payload);
        
        // 更新 UI 狀態
        this.updateOfflineStatus(true);
        this.dispatchEvent('offline-ready', payload);
    }

    /**
     * 處理 Service Worker 錯誤
     * @private
     * @param {Object} payload 錯誤內容
     */
    handleWorkerError(payload) {
        console.error('[ServiceWorkerManager] Service Worker 錯誤:', payload);
        
        // 顯示錯誤通知
        this.showErrorNotification(payload.message || '服務工作者發生錯誤');
    }

    /**
     * 檢查 Service Worker 更新
     * @returns {Promise<boolean>} 是否有更新
     */
    async checkForUpdates() {
        if (!this.registration) return false;

        try {
            console.log('[ServiceWorkerManager] 檢查 Service Worker 更新...');
            
            await this.registration.update();
            
            return this.updateAvailable;
            
        } catch (error) {
            console.error('[ServiceWorkerManager] 更新檢查失敗:', error);
            return false;
        }
    }

    /**
     * 應用 Service Worker 更新
     * @returns {Promise<boolean>} 更新結果
     */
    async applyUpdate() {
        if (!this.updateAvailable || !this.registration) {
            return false;
        }

        try {
            const waitingWorker = this.registration.waiting;
            if (waitingWorker) {
                // 發送跳過等待訊息
                waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                
                // 等待控制器變更
                await new Promise((resolve) => {
                    navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
                });

                console.log('[ServiceWorkerManager] Service Worker 更新已應用');
                this.updateAvailable = false;
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('[ServiceWorkerManager] 應用更新失敗:', error);
            return false;
        }
    }

    /**
     * 顯示更新提示
     * @private
     */
    showUpdatePrompt() {
        // 創建更新提示 UI
        const updatePrompt = document.createElement('div');
        updatePrompt.id = 'sw-update-prompt';
        updatePrompt.className = 'sw-update-prompt';
        updatePrompt.innerHTML = `
            <div class="update-content">
                <h3>應用程式更新</h3>
                <p>有新版本可用，是否立即更新？</p>
                <div class="update-actions">
                    <button id="sw-update-apply" class="btn btn-primary">立即更新</button>
                    <button id="sw-update-dismiss" class="btn btn-secondary">稍後</button>
                </div>
            </div>
        `;

        document.body.appendChild(updatePrompt);

        // 設置事件監聽
        document.getElementById('sw-update-apply').onclick = async () => {
            const success = await this.applyUpdate();
            if (success) {
                // 重新載入頁面以使用新版本
                window.location.reload();
            }
        };

        document.getElementById('sw-update-dismiss').onclick = () => {
            updatePrompt.remove();
        };

        // 添加樣式
        this.addUpdatePromptStyles();
    }

    /**
     * 添加更新提示樣式
     * @private
     */
    addUpdatePromptStyles() {
        if (document.getElementById('sw-update-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'sw-update-styles';
        styles.textContent = `
            .sw-update-prompt {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10001;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 350px;
                animation: slideIn 0.3s ease;
            }
            
            .update-content {
                padding: 20px;
            }
            
            .update-content h3 {
                margin: 0 0 10px 0;
                font-size: 18px;
                color: #333;
            }
            
            .update-content p {
                margin: 0 0 15px 0;
                color: #666;
                line-height: 1.4;
            }
            
            .update-actions {
                display: flex;
                gap: 10px;
            }
            
            .update-actions .btn {
                flex: 1;
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .update-actions .btn-primary {
                background: #1976d2;
                color: white;
            }
            
            .update-actions .btn-secondary {
                background: #f5f5f5;
                color: #333;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * 通知安裝完成
     * @private
     */
    notifyInstallComplete() {
        this.dispatchEvent('install-complete', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 通知控制器變更
     * @private
     */
    notifyControllerChange() {
        this.dispatchEvent('controller-change', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 更新離線狀態
     * @private
     * @param {boolean} isReady 是否就緒
     */
    updateOfflineStatus(isReady) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement && !navigator.onLine) {
            statusElement.textContent = isReady ? '離線就緒' : '離線模式';
        }
    }

    /**
     * 顯示錯誤通知
     * @private
     * @param {string} message 錯誤訊息
     */
    showErrorNotification(message) {
        // 使用現有的通知系統
        if (window.resourceValidator && window.resourceValidator.showUserFriendlyError) {
            window.resourceValidator.showUserFriendlyError(
                `Service Worker 錯誤: ${message}`,
                'error'
            );
        } else {
            console.error('[ServiceWorkerManager] 錯誤通知:', message);
        }
    }

    /**
     * 發送自訂事件
     * @private
     * @param {string} type 事件類型
     * @param {Object} detail 事件詳情
     */
    dispatchEvent(type, detail) {
        const event = new CustomEvent(`sw-${type}`, { detail });
        window.dispatchEvent(event);
    }

    /**
     * 取得 Service Worker 狀態
     * @returns {string} 狀態描述
     */
    getWorkerState() {
        if (!this.registration) return 'unregistered';

        if (this.registration.active) return 'active';
        if (this.registration.waiting) return 'waiting';
        if (this.registration.installing) return 'installing';
        
        return 'unknown';
    }

    /**
     * 發送訊息給 Service Worker
     * @param {Object} message 訊息內容
     * @returns {Promise<void>}
     */
    async postMessage(message) {
        if (!this.registration || !this.registration.active) {
            console.warn('[ServiceWorkerManager] Service Worker 未就緒，無法發送訊息');
            return;
        }

        try {
            this.registration.active.postMessage(message);
        } catch (error) {
            console.error('[ServiceWorkerManager] 發送訊息失敗:', error);
        }
    }

    /**
     * 取得管理器狀態
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        return {
            isRegistered: this.isRegistered,
            updateAvailable: this.updateAvailable,
            workerState: this.getWorkerState(),
            scope: this.registration?.scope || null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 註銷 Service Worker
     * @returns {Promise<boolean>} 註銷結果
     */
    async unregister() {
        if (!this.registration) return false;

        try {
            const success = await this.registration.unregister();
            
            if (success) {
                console.log('[ServiceWorkerManager] Service Worker 已註銷');
                this.registration = null;
                this.isRegistered = false;
                this.updateAvailable = false;
            }
            
            return success;
            
        } catch (error) {
            console.error('[ServiceWorkerManager] 註銷失敗:', error);
            return false;
        }
    }
}

// 提供便利的匯出
export const serviceWorkerManager = new ServiceWorkerManager();