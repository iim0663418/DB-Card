/**
 * Language Debug Panel - 語言管理調試面板
 * 提供開發者友善的調試介面，可視化語言切換狀態和效能指標
 * 
 * 功能特色：
 * - 實時語言切換視覺化
 * - 效能指標顯示
 * - 翻譯快取狀態檢視
 * - 觀察者生命週期監控
 * - 錯誤模擬和測試工具
 * 
 * 使用方式：在 URL 加上 ?debug=1 參數啟用
 * 
 * @version 1.0.0
 * @author Language Management Team
 */

class LanguageDebugPanel {
    constructor() {
        this.isVisible = false;
        this.panelElement = null;
        this.updateInterval = null;
        this.eventListeners = [];
        
        // 調試數據收集
        this.debugData = {
            languageHistory: [],
            performanceMetrics: [],
            cacheOperations: [],
            observerEvents: []
        };
        
        // 初始化面板
        this.init();
    }
    
    // 初始化調試面板
    init() {
        // 檢查是否啟用調試模式
        if (!this.shouldShowDebugPanel()) {
            return;
        }
        
        console.log('[LanguageDebugPanel] Initializing debug panel...');
        
        try {
            this.createPanelHTML();
            this.attachEventListeners();
            this.startDataCollection();
            this.show();
            
            console.log('[LanguageDebugPanel] Debug panel initialized successfully');
        } catch (error) {
            console.error('[LanguageDebugPanel] Failed to initialize debug panel:', error);
        }
    }
    
    // 檢查是否應顯示調試面板
    shouldShowDebugPanel() {
        const urlParams = new URLSearchParams(window.location.search);
        const isDebugMode = urlParams.get('debug') === '1' || urlParams.get('perf') === '1';
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname === '';
        
        return isDebugMode && (isDevelopment || window.location.search.includes('force-debug=1'));
    }
    
    // 創建面板 HTML 結構
    createPanelHTML() {
        const panelHTML = `
            <div id="language-debug-panel" class="debug-panel" role="complementary" aria-label="語言管理調試面板">
                <div class="debug-header">
                    <h3>🐛 Language Debug Panel</h3>
                    <div class="debug-controls">
                        <button id="debug-minimize" aria-label="最小化">−</button>
                        <button id="debug-close" aria-label="關閉">×</button>
                    </div>
                </div>
                
                <div class="debug-content">
                    <div class="debug-tabs">
                        <button class="debug-tab active" data-tab="overview">總覽</button>
                        <button class="debug-tab" data-tab="performance">效能</button>
                        <button class="debug-tab" data-tab="cache">快取</button>
                        <button class="debug-tab" data-tab="events">事件</button>
                        <button class="debug-tab" data-tab="tools">工具</button>
                    </div>
                    
                    <div id="debug-tab-overview" class="debug-tab-content active">
                        <div class="debug-section">
                            <h4>語言狀態</h4>
                            <div class="status-grid">
                                <div class="status-item">
                                    <span class="status-label">目前語言:</span>
                                    <span id="current-language" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">可用語言:</span>
                                    <span id="available-languages" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">載入狀態:</span>
                                    <span id="loading-status" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">切換次數:</span>
                                    <span id="switch-count" class="status-value">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="debug-section">
                            <h4>組件狀態</h4>
                            <div id="component-status" class="component-list"></div>
                        </div>
                    </div>
                    
                    <div id="debug-tab-performance" class="debug-tab-content">
                        <div class="debug-section">
                            <h4>效能指標</h4>
                            <div id="performance-metrics" class="metrics-container"></div>
                        </div>
                        
                        <div class="debug-section">
                            <h4>效能圖表</h4>
                            <canvas id="performance-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                    
                    <div id="debug-tab-cache" class="debug-tab-content">
                        <div class="debug-section">
                            <h4>快取統計</h4>
                            <div id="cache-stats" class="cache-info"></div>
                        </div>
                        
                        <div class="debug-section">
                            <h4>快取內容</h4>
                            <div id="cache-contents" class="cache-list"></div>
                        </div>
                    </div>
                    
                    <div id="debug-tab-events" class="debug-tab-content">
                        <div class="debug-section">
                            <h4>事件日誌</h4>
                            <div class="event-controls">
                                <button id="clear-events">清除日誌</button>
                                <button id="export-events">匯出事件</button>
                            </div>
                            <div id="event-log" class="event-list"></div>
                        </div>
                    </div>
                    
                    <div id="debug-tab-tools" class="debug-tab-content">
                        <div class="debug-section">
                            <h4>測試工具</h4>
                            <div class="tool-group">
                                <button id="simulate-lang-switch">模擬語言切換</button>
                                <button id="simulate-cache-miss">模擬快取失效</button>
                                <button id="simulate-memory-pressure">模擬記憶體壓力</button>
                                <button id="force-cleanup">強制清理</button>
                            </div>
                        </div>
                        
                        <div class="debug-section">
                            <h4>診斷工具</h4>
                            <div class="tool-group">
                                <button id="validate-translations">驗證翻譯完整性</button>
                                <button id="check-memory-leaks">檢查記憶體洩漏</button>
                                <button id="benchmark-performance">效能基準測試</button>
                                <button id="export-debug-report">匯出調試報告</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 插入面板到頁面
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        this.panelElement = document.getElementById('language-debug-panel');
        
        // 綁定面板控制事件
        this.bindPanelControls();
    }
    
    // 綁定面板控制事件
    bindPanelControls() {
        // 標籤切換
        const tabs = this.panelElement.querySelectorAll('.debug-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // 最小化/關閉按鈕
        const minimizeBtn = this.panelElement.querySelector('#debug-minimize');
        const closeBtn = this.panelElement.querySelector('#debug-close');
        
        minimizeBtn.addEventListener('click', () => this.minimize());
        closeBtn.addEventListener('click', () => this.hide());
        
        // 工具按鈕
        this.bindToolButtons();
        
        // 事件控制
        this.bindEventControls();
    }
    
    // 綁定工具按鈕事件
    bindToolButtons() {
        const tools = {
            'simulate-lang-switch': () => this.simulateLanguageSwitch(),
            'simulate-cache-miss': () => this.simulateCacheMiss(),
            'simulate-memory-pressure': () => this.simulateMemoryPressure(),
            'force-cleanup': () => this.forceCleanup(),
            'validate-translations': () => this.validateTranslations(),
            'check-memory-leaks': () => this.checkMemoryLeaks(),
            'benchmark-performance': () => this.benchmarkPerformance(),
            'export-debug-report': () => this.exportDebugReport()
        };
        
        Object.entries(tools).forEach(([id, handler]) => {
            const button = this.panelElement.querySelector(`#${id}`);
            if (button) {
                button.addEventListener('click', handler);
            }
        });
    }
    
    // 綁定事件控制
    bindEventControls() {
        const clearEventsBtn = this.panelElement.querySelector('#clear-events');
        const exportEventsBtn = this.panelElement.querySelector('#export-events');
        
        if (clearEventsBtn) {
            clearEventsBtn.addEventListener('click', () => this.clearEventLog());
        }
        
        if (exportEventsBtn) {
            exportEventsBtn.addEventListener('click', () => this.exportEventLog());
        }
    }
    
    // 附加語言管理器事件監聽器
    attachEventListeners() {
        // 語言變更事件
        const languageChangeHandler = (event) => {
            this.logEvent('Language Changed', {
                from: event.detail.previousLanguage,
                to: event.detail.language,
                timestamp: event.detail.timestamp
            });
            
            this.debugData.languageHistory.push({
                language: event.detail.language,
                timestamp: Date.now()
            });
            
            this.updateOverview();
        };
        
        document.addEventListener('languageChanged', languageChangeHandler);
        this.eventListeners.push(['languageChanged', languageChangeHandler]);
        
        // 效能事件
        if (window.performanceMetricsCollector) {
            const performanceHandler = (data) => {
                this.debugData.performanceMetrics.push(data);
                this.updatePerformanceTab();
            };
            
            // 假設效能收集器有事件機制
            if (window.performanceMetricsCollector.on) {
                window.performanceMetricsCollector.on('metrics', performanceHandler);
            }
        }
    }
    
    // 開始數據收集
    startDataCollection() {
        this.updateInterval = setInterval(() => {
            this.updateAllTabs();
        }, 1000); // 每秒更新
    }
    
    // 切換標籤
    switchTab(tabName) {
        // 移除所有活動標籤
        this.panelElement.querySelectorAll('.debug-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        this.panelElement.querySelectorAll('.debug-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 啟用選中標籤
        this.panelElement.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        this.panelElement.querySelector(`#debug-tab-${tabName}`).classList.add('active');
        
        // 更新標籤內容
        this.updateTabContent(tabName);
    }
    
    // 更新標籤內容
    updateTabContent(tabName) {
        switch (tabName) {
            case 'overview':
                this.updateOverview();
                break;
            case 'performance':
                this.updatePerformanceTab();
                break;
            case 'cache':
                this.updateCacheTab();
                break;
            case 'events':
                this.updateEventLog();
                break;
            case 'tools':
                // 工具頁面不需要動態更新
                break;
        }
    }
    
    // 更新總覽頁面
    updateOverview() {
        if (!window.languageManager) return;
        
        const currentLang = window.languageManager.getCurrentLanguage();
        const supportedLangs = window.languageManager.getSupportedLanguages();
        const loadingStatus = window.languageManager.isLoading ? '載入中' : '就緒';
        
        // 更新狀態顯示
        const updates = {
            'current-language': currentLang,
            'available-languages': supportedLangs.join(', '),
            'loading-status': loadingStatus,
            'switch-count': this.debugData.languageHistory.length
        };
        
        Object.entries(updates).forEach(([id, value]) => {
            const element = this.panelElement.querySelector(`#${id}`);
            if (element) {
                element.textContent = value;
            }
        });
        
        // 更新組件狀態
        this.updateComponentStatus();
    }
    
    // 更新組件狀態
    updateComponentStatus() {
        const componentStatus = this.panelElement.querySelector('#component-status');
        if (!componentStatus) return;
        
        const components = [
            {
                name: 'LanguageManager',
                status: window.languageManager ? '✅ 可用' : '❌ 不可用',
                instance: window.languageManager
            },
            {
                name: 'EnhancedLanguageManager', 
                status: window.EnhancedLanguageManager ? '✅ 可用' : '❌ 不可用',
                instance: window.EnhancedLanguageManager
            },
            {
                name: 'PerformanceMetricsCollector',
                status: window.performanceMetricsCollector ? '✅ 可用' : '❌ 不可用',
                instance: window.performanceMetricsCollector
            },
            {
                name: 'SmartCacheManager',
                status: window.smartCacheManager ? '✅ 可用' : '❌ 不可用',
                instance: window.smartCacheManager
            }
        ];
        
        componentStatus.innerHTML = components.map(comp => `
            <div class="component-item">
                <span class="component-name">${comp.name}</span>
                <span class="component-status">${comp.status}</span>
            </div>
        `).join('');
    }
    
    // 更新效能標籤
    updatePerformanceTab() {
        if (!window.performanceMetricsCollector) return;
        
        const metricsContainer = this.panelElement.querySelector('#performance-metrics');
        if (!metricsContainer) return;
        
        // 獲取最新效能指標
        const metrics = window.performanceMetricsCollector.getLatestMetrics();
        
        metricsContainer.innerHTML = `
            <div class="metric-item">
                <span class="metric-label">語言切換時間:</span>
                <span class="metric-value">${metrics.languageSwitchTime || 'N/A'}ms</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">記憶體使用:</span>
                <span class="metric-value">${this.formatMemory(metrics.memoryUsage || 0)}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">快取命中率:</span>
                <span class="metric-value">${metrics.cacheHitRate || 'N/A'}%</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">DOM 更新時間:</span>
                <span class="metric-value">${metrics.domUpdateTime || 'N/A'}ms</span>
            </div>
        `;
        
        // 更新效能圖表
        this.updatePerformanceChart();
    }
    
    // 更新快取標籤
    updateCacheTab() {
        if (!window.smartCacheManager) return;
        
        const cacheStats = this.panelElement.querySelector('#cache-stats');
        const cacheContents = this.panelElement.querySelector('#cache-contents');
        
        if (cacheStats) {
            const stats = window.smartCacheManager.getStats();
            cacheStats.innerHTML = `
                <div class="cache-stat">
                    <span class="stat-label">快取大小:</span>
                    <span class="stat-value">${stats.size || 0}</span>
                </div>
                <div class="cache-stat">
                    <span class="stat-label">命中次數:</span>
                    <span class="stat-value">${stats.hits || 0}</span>
                </div>
                <div class="cache-stat">
                    <span class="stat-label">錯失次數:</span>
                    <span class="stat-value">${stats.misses || 0}</span>
                </div>
                <div class="cache-stat">
                    <span class="stat-label">命中率:</span>
                    <span class="stat-value">${stats.hitRate || 0}%</span>
                </div>
            `;
        }
        
        if (cacheContents) {
            const contents = window.smartCacheManager.getContents();
            cacheContents.innerHTML = contents.map(item => `
                <div class="cache-item">
                    <span class="cache-key">${item.key}</span>
                    <span class="cache-age">${this.formatAge(item.age)}</span>
                    <span class="cache-size">${this.formatSize(item.size)}</span>
                </div>
            `).join('');
        }
    }
    
    // 記錄事件
    logEvent(type, data) {
        const event = {
            type,
            data,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.debugData.observerEvents.unshift(event);
        
        // 限制事件日誌大小
        if (this.debugData.observerEvents.length > 100) {
            this.debugData.observerEvents = this.debugData.observerEvents.slice(0, 100);
        }
        
        this.updateEventLog();
    }
    
    // 更新事件日誌
    updateEventLog() {
        const eventLog = this.panelElement.querySelector('#event-log');
        if (!eventLog) return;
        
        eventLog.innerHTML = this.debugData.observerEvents.map(event => `
            <div class="event-item" data-event-id="${event.id}">
                <div class="event-header">
                    <span class="event-type">${event.type}</span>
                    <span class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="event-data">${JSON.stringify(event.data, null, 2)}</div>
            </div>
        `).join('');
    }
    
    // 工具方法
    simulateLanguageSwitch() {
        if (window.languageManager) {
            const currentLang = window.languageManager.getCurrentLanguage();
            const targetLang = currentLang === 'zh-TW' ? 'en-US' : 'zh-TW';
            
            this.logEvent('Simulated Language Switch', { from: currentLang, to: targetLang });
            window.languageManager.switchLanguage(targetLang);
        }
    }
    
    simulateCacheMiss() {
        if (window.smartCacheManager) {
            window.smartCacheManager.clear();
            this.logEvent('Simulated Cache Miss', { action: 'cache_cleared' });
        }
    }
    
    simulateMemoryPressure() {
        // 創建大型陣列模擬記憶體壓力
        const bigArray = new Array(1000000).fill('memory-pressure-test');
        this.logEvent('Simulated Memory Pressure', { arraySize: bigArray.length });
        
        setTimeout(() => {
            // 清理
            bigArray.length = 0;
            this.logEvent('Memory Pressure Released', { action: 'cleanup' });
        }, 2000);
    }
    
    forceCleanup() {
        // 強制執行所有清理操作
        if (window.languageManager && window.languageManager.cleanup) {
            window.languageManager.cleanup();
        }
        
        if (window.EnhancedLanguageManager && window.EnhancedLanguageManager.cleanup) {
            window.EnhancedLanguageManager.cleanup();
        }
        
        if (window.smartCacheManager) {
            window.smartCacheManager.optimize();
        }
        
        this.logEvent('Force Cleanup Executed', { timestamp: Date.now() });
    }
    
    // 輔助方法
    formatMemory(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    formatAge(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h`;
    }
    
    formatSize(size) {
        return typeof size === 'number' ? this.formatMemory(size) : size || 'N/A';
    }
    
    // 面板顯示控制
    show() {
        if (this.panelElement) {
            this.panelElement.style.display = 'block';
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.panelElement) {
            this.panelElement.style.display = 'none';
            this.isVisible = false;
        }
        this.cleanup();
    }
    
    minimize() {
        if (this.panelElement) {
            const content = this.panelElement.querySelector('.debug-content');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                this.panelElement.querySelector('#debug-minimize').textContent = '−';
            } else {
                content.style.display = 'none';
                this.panelElement.querySelector('#debug-minimize').textContent = '+';
            }
        }
    }
    
    // 更新所有標籤
    updateAllTabs() {
        const activeTab = this.panelElement.querySelector('.debug-tab.active');
        if (activeTab) {
            this.updateTabContent(activeTab.dataset.tab);
        }
    }
    
    // 清理資源
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // 移除事件監聽器
        this.eventListeners.forEach(([event, handler]) => {
            document.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
    
    // 匯出調試報告
    exportDebugReport() {
        const report = {
            timestamp: new Date().toISOString(),
            languageHistory: this.debugData.languageHistory,
            performanceMetrics: this.debugData.performanceMetrics,
            eventLog: this.debugData.observerEvents,
            systemInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                url: window.location.href
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `language-debug-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.logEvent('Debug Report Exported', { filename: a.download });
    }
}

// 全域化調試面板
window.LanguageDebugPanel = LanguageDebugPanel;

// 自動初始化（如果符合條件）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.languageDebugPanel = new LanguageDebugPanel();
    });
} else {
    window.languageDebugPanel = new LanguageDebugPanel();
}

console.log('[LanguageDebugPanel] Language Debug Panel loaded');