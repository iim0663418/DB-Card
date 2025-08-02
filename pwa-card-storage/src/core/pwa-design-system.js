/**
 * PWA 設計系統初始化器
 * 整合 moda 設計系統到 PWA 中
 */

class PWADesignSystem {
    constructor() {
        this.isInitialized = false;
        this.currentTheme = 'light';
        this.modaIntegration = null;
    }

    /**
     * 初始化 PWA 設計系統
     */
    async initialize() {
        try {
            console.log('[PWA Design System] Starting initialization...');
            
            // 等待 moda 整合模組
            if (window.modaIntegration) {
                this.modaIntegration = window.modaIntegration;
                
                // 如果 moda 整合尚未初始化，等待其完成
                if (!this.modaIntegration.isInitialized) {
                    const result = await this.modaIntegration.initialize();
                    if (!result.success) {
                        console.warn('[PWA Design System] moda integration failed:', result.error);
                    }
                }
            }

            // 設定主題切換功能
            this.setupThemeToggle();
            
            // 檢測系統主題偏好
            this.detectSystemTheme();
            
            this.isInitialized = true;
            console.log('[PWA Design System] Initialization completed');
        } catch (error) {
            console.warn('[PWA Design System] Initialization failed:', error);
            // 優雅降級，不影響 PWA 核心功能
        }
    }

    /**
     * 設定主題切換功能
     */
    setupThemeToggle() {
        // 不再擴展語言切換按鈕，由應用層處理
        console.log('[PWA Design System] Theme toggle setup delegated to app layer');
    }

    /**
     * 切換主題
     */
    async toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        await this.switchTheme(newTheme);
    }

    /**
     * 切換到指定主題
     */
    async switchTheme(theme) {
        try {
            // 使用 moda 整合模組切換主題
            if (this.modaIntegration) {
                await this.modaIntegration.handleThemeChange(theme);
            } else {
                // 降級方案
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
            
            this.currentTheme = theme;
            this.updateThemeToggleIcon();
            
            // 儲存主題偏好
            localStorage.setItem('pwa-theme', theme);
        } catch (error) {
            console.warn('[PWA Design System] Theme switch failed:', error);
        }
    }

    /**
     * 更新主題切換按鈕圖示
     */
    updateThemeToggleIcon() {
        // 不再直接修改按鈕，由應用層處理
        console.log('[PWA Design System] Theme icon update delegated to app layer');
    }

    /**
     * 檢測系統主題偏好
     */
    detectSystemTheme() {
        // 檢查儲存的偏好
        const savedTheme = localStorage.getItem('pwa-theme');
        if (savedTheme) {
            this.switchTheme(savedTheme);
            return;
        }

        // 檢測系統偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.switchTheme('dark');
        }

        // 監聽系統主題變更
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('pwa-theme')) {
                    this.switchTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * 獲取設計系統狀態
     */
    getStatus() {
        const baseStatus = {
            initialized: this.isInitialized,
            currentTheme: this.currentTheme,
            hasmodaIntegration: !!this.modaIntegration
        };
        
        // 如果有 moda 整合，獲取其詳細狀態
        if (this.modaIntegration) {
            return {
                ...baseStatus,
                modaIntegrationStatus: this.modaIntegration.getStatus()
            };
        }
        
        return baseStatus;
    }

    /**
     * 獲取效能報告
     */
    getPerformanceReport() {
        const reports = {};
        
        // PWA 效能報告
        if (window.pwaPerformance) {
            reports.pwa = window.pwaPerformance.getPerformanceReport();
        }
        
        // moda 整合效能報告
        if (this.modaIntegration) {
            reports.moda = this.modaIntegration.getPerformanceReport();
        }
        
        return Object.keys(reports).length > 0 ? reports : null;
    }

    /**
     * 獲取無障礙合規報告
     */
    async getAccessibilityReport() {
        if (this.modaIntegration && this.modaIntegration.accessibilityManager) {
            return await this.modaIntegration.accessibilityManager.validateWCAGCompliance();
        }
        return null;
    }
}

// 全域實例
window.pwaDesignSystem = new PWADesignSystem();

// 自動初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化以確保 moda 整合模組載入
    setTimeout(() => {
        window.pwaDesignSystem.initialize();
    }, 300); // 增加延遲以確保 moda 整合完成
});