/**
 * moda 設計系統與 PWA 整合模組
 * 負責將主專案的 moda 設計系統完整整合到 PWA 中
 */

class modaIntegration {
    constructor() {
        this.isInitialized = false;
        this.designSystemManager = null;
        this.themeController = null;
        this.cssVariablesManager = null;
        this.bootstrapIntegration = null;
        this.typographyManager = null;
        this.accessibilityManager = null;
    }

    /**
     * 初始化 moda 設計系統整合
     */
    async initialize() {
        console.log('[moda Integration] Starting initialization...');
        
        try {
            // 等待主專案的設計系統模組載入
            await this.waitForDesignSystemModules();
        } catch (error) {
            console.warn('[moda Integration] Module loading had issues:', error);
        }
        
        // 初始化各個管理器（不因單一失敗而中斷）
        await this.initializeManagers();
        
        // 應用 moda 設計系統到 PWA（不因單一失敗而中斷）
        await this.applymodaDesignSystem();
        
        // 設置主題同步
        try {
            this.setupThemeSync();
        } catch (error) {
            console.warn('[moda Integration] Theme sync setup failed:', error);
        }
        
        this.isInitialized = true;
        console.log('[moda Integration] Initialization completed');
        
        return { success: true };
    }

    /**
     * 等待設計系統模組載入
     */
    async waitForDesignSystemModules() {
        // 先嘗試載入設計系統模組
        if (window.designSystemLoader) {
            await window.designSystemLoader.loadAllModules();
        } else {
            // 降級方案：手動載入模組
            await this.loadDesignSystemModulesManually();
        }

        const modules = [
            'modaDesignSystemManager',
            'ThemeController', 
            'CSSVariablesManager',
            'BootstrapmodaIntegration',
            'TypographyManager',
            'AccessibilityManager'
        ];

        const loadedCount = modules.filter(module => window[module]).length;
        console.log(`[moda Integration] ${loadedCount}/${modules.length} design system modules loaded`);
    }

    /**
     * 手動載入設計系統模組（降級方案）
     */
    async loadDesignSystemModulesManually() {
        // 嘗試載入核心模組
        try {
            if (!window.modaDesignSystemManager) {
                const { modaDesignSystemManager } = await import('../../../src/design-system/MODADesignSystemManager.js');
                window.modaDesignSystemManager = modaDesignSystemManager;
            }
        } catch (error) {
            console.warn('[moda Integration] Failed to load modaDesignSystemManager:', error);
        }

        try {
            if (!window.ThemeController) {
                const { ThemeController } = await import('../../../src/design-system/ThemeController.js');
                window.ThemeController = ThemeController;
            }
        } catch (error) {
            console.warn('[moda Integration] Failed to load ThemeController:', error);
        }

        try {
            if (!window.CSSVariablesManager) {
                const { CSSVariablesManager } = await import('../../../src/design-system/CSSVariablesManager.js');
                window.CSSVariablesManager = CSSVariablesManager;
            }
        } catch (error) {
            console.warn('[moda Integration] Failed to load CSSVariablesManager:', error);
        }
    }

    /**
     * 初始化各個管理器
     */
    async initializeManagers() {
        const managers = [
            { name: 'designSystemManager', class: 'modaDesignSystemManager', required: false },
            { name: 'themeController', class: 'ThemeController', required: false },
            { name: 'cssVariablesManager', class: 'CSSVariablesManager', required: false },
            { name: 'bootstrapIntegration', class: 'BootstrapmodaIntegration', required: true },
            { name: 'typographyManager', class: 'TypographyManager', required: true },
            { name: 'accessibilityManager', class: 'AccessibilityManager', required: false }
        ];

        for (const manager of managers) {
            try {
                if (window[manager.class]) {
                    // 特殊處理：某些模組需要依賴參數
                    if (manager.name === 'themeController' || manager.name === 'cssVariablesManager') {
                        this[manager.name] = new window[manager.class](this.designSystemManager);
                    } else {
                        this[manager.name] = new window[manager.class]();
                    }
                    
                    await this[manager.name].initialize();
                    console.log(`[moda Integration] ${manager.name} initialized successfully`);
                } else {
                    const message = `[moda Integration] ${manager.class} not available, skipping`;
                    if (manager.required) {
                        console.warn(message);
                    } else {
                        console.log(message);
                    }
                }
            } catch (error) {
                console.warn(`[moda Integration] Failed to initialize ${manager.name}:`, error);
                // 繼續初始化其他管理器，不因單一失敗而中斷
            }
        }
    }

    /**
     * 應用 moda 設計系統到 PWA
     */
    async applymodaDesignSystem() {
        const tasks = [
            {
                name: 'CSS Variables',
                manager: this.cssVariablesManager,
                method: 'batchUpdate',
                args: [{ '--md-primary-1': '#6868ac' }] // 基本 CSS 變數更新
            },
            {
                name: 'Bootstrap Integration', 
                manager: this.bootstrapIntegration,
                method: 'reintegrate'
            },
            {
                name: 'Typography System',
                manager: this.typographyManager,
                method: 'resetTypography'
            }
        ];

        for (const task of tasks) {
            try {
                if (task.manager && typeof task.manager[task.method] === 'function') {
                    if (task.args) {
                        await task.manager[task.method](...task.args);
                    } else {
                        await task.manager[task.method]();
                    }
                    console.log(`[moda Integration] ${task.name} applied successfully`);
                } else {
                    console.warn(`[moda Integration] ${task.name} not available or method missing`);
                }
            } catch (error) {
                console.warn(`[moda Integration] Failed to apply ${task.name}:`, error);
            }
        }

        // 檢查無障礙合規性（非阻斷）
        try {
            if (this.accessibilityManager && typeof this.accessibilityManager.validateWCAGCompliance === 'function') {
                const compliance = await this.accessibilityManager.validateWCAGCompliance();
                console.log('[moda Integration] Accessibility compliance:', compliance);
            }
        } catch (error) {
            console.warn('[moda Integration] Accessibility check failed:', error);
        }
    }

    /**
     * 設置主題同步
     */
    setupThemeSync() {
        // 監聽主題變更事件
        document.addEventListener('themeChanged', (event) => {
            this.handleThemeChange(event.detail.theme);
        });

        // 檢測系統主題偏好
        this.detectSystemTheme();
    }

    /**
     * 處理主題變更
     */
    async handleThemeChange(theme) {
        try {
            if (this.themeController) {
                await this.themeController.switchTheme(theme);
            }

            // 重新整合 Bootstrap
            if (this.bootstrapIntegration) {
                await this.bootstrapIntegration.reintegrate();
            }

            // 更新 PWA 特定樣式
            this.updatePWATheme(theme);

            console.log(`[moda Integration] Theme switched to: ${theme}`);
        } catch (error) {
            console.error('[moda Integration] Theme change failed:', error);
        }
    }

    /**
     * 更新 PWA 特定樣式
     */
    updatePWATheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // 更新 PWA 特定元件
        this.updatePWAComponents(theme);
    }

    /**
     * 更新 PWA 元件樣式
     */
    updatePWAComponents(theme) {
        // 更新導航列
        const appNav = document.querySelector('.app-nav');
        if (appNav) {
            appNav.style.backgroundColor = theme === 'dark' ? 
                'var(--md-neutral-10)' : 'var(--md-neutral-10)';
        }

        // 更新卡片樣式
        const cards = document.querySelectorAll('.card, .stat-card, .action-card');
        cards.forEach(card => {
            card.style.backgroundColor = theme === 'dark' ? 
                'var(--md-neutral-10)' : 'var(--md-white-1)';
            card.style.color = theme === 'dark' ? 
                'var(--md-black-1)' : 'var(--md-black-1)';
        });
        
        // 確保不影響按鈕內容
        // 不要修改按鈕的 icon 內容，那是應用層的責任
    }

    /**
     * 檢測系統主題偏好
     */
    detectSystemTheme() {
        // 檢查儲存的偏好
        const savedTheme = localStorage.getItem('pwa-theme');
        if (savedTheme) {
            this.handleThemeChange(savedTheme);
            return;
        }

        // 檢測系統偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.handleThemeChange('dark');
        } else {
            // 確保預設為淺色模式
            this.handleThemeChange('light');
        }

        // 監聽系統主題變更
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('pwa-theme')) {
                    this.handleThemeChange(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * 獲取整合狀態
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasDesignSystemManager: !!this.designSystemManager,
            hasThemeController: !!this.themeController,
            hasCSSVariablesManager: !!this.cssVariablesManager,
            hasBootstrapIntegration: !!this.bootstrapIntegration,
            hasTypographyManager: !!this.typographyManager,
            hasAccessibilityManager: !!this.accessibilityManager
        };
    }

    /**
     * 手動切換主題
     */
    async toggleTheme() {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        await this.handleThemeChange(newTheme);
        localStorage.setItem('pwa-theme', newTheme);
        
        return newTheme;
    }

    /**
     * 獲取效能報告
     */
    getPerformanceReport() {
        const report = {
            initialized: this.isInitialized,
            managers: this.getStatus(),
            timestamp: new Date().toISOString()
        };

        if (this.designSystemManager && this.designSystemManager.getPerformanceMetrics) {
            report.designSystemMetrics = this.designSystemManager.getPerformanceMetrics();
        }

        return report;
    }
}

// 全域實例
window.modaIntegration = new modaIntegration();

// 自動初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延遲初始化以確保所有模組載入
    setTimeout(async () => {
        const result = await window.modaIntegration.initialize();
        if (result.success) {
            console.log('[moda Integration] Successfully integrated with PWA');
        } else {
            console.warn('[moda Integration] Integration failed:', result.error);
        }
    }, 200);
});