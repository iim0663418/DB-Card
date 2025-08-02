/**
 * 設計系統模組載入器
 * 負責動態載入和初始化所有設計系統模組
 */

class DesignSystemLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadPromises = new Map();
    }

    /**
     * 載入所有設計系統模組
     */
    async loadAllModules() {
        const modules = [
            { name: 'modaDesignSystemManager', path: '../../../src/design-system/MODADesignSystemManager.js' },
            { name: 'ThemeController', path: '../../../src/design-system/ThemeController.js' },
            { name: 'CSSVariablesManager', path: '../../../src/design-system/CSSVariablesManager.js' },
            { name: 'BootstrapmodaIntegration', path: '../../../src/integration/BootstrapIntegration.js' },
            { name: 'TypographyManager', path: '../../../src/design-system/TypographyManager.js' },
            { name: 'AccessibilityManager', path: '../../../src/design-system/AccessibilityManager.js' }
        ];

        const loadPromises = modules.map(module => this.loadModule(module));
        
        try {
            await Promise.allSettled(loadPromises);
            console.log('[Design System Loader] All modules loaded');
        } catch (error) {
            console.warn('[Design System Loader] Some modules failed to load:', error);
        }
    }

    /**
     * 載入單個模組
     */
    async loadModule({ name, path }) {
        if (this.loadedModules.has(name)) {
            return this.loadedModules.get(name);
        }

        if (this.loadPromises.has(name)) {
            return this.loadPromises.get(name);
        }

        const loadPromise = this._loadModuleImpl(name, path);
        this.loadPromises.set(name, loadPromise);

        try {
            const module = await loadPromise;
            this.loadedModules.set(name, module);
            window[name] = module;
            console.log(`[Design System Loader] ${name} loaded successfully`);
            return module;
        } catch (error) {
            console.warn(`[Design System Loader] Failed to load ${name}:`, error);
            this.loadPromises.delete(name);
            return null;
        }
    }

    /**
     * 實際載入模組實作
     */
    async _loadModuleImpl(name, path) {
        try {
            // 嘗試動態導入
            const module = await import(path);
            
            // 根據模組名稱獲取正確的導出
            let exportedClass;
            if (module[name]) {
                exportedClass = module[name];
            } else if (module.default) {
                exportedClass = module.default;
            } else {
                // 檢查是否有同名的導出
                const keys = Object.keys(module);
                const matchingKey = keys.find(key => key.toLowerCase().includes(name.toLowerCase()));
                if (matchingKey) {
                    exportedClass = module[matchingKey];
                } else {
                    throw new Error(`No matching export found for ${name}`);
                }
            }
            
            // 確保是構造函數
            if (typeof exportedClass !== 'function') {
                throw new Error(`${name} is not a constructor function`);
            }
            
            return exportedClass;
        } catch (error) {
            // 如果動態導入失敗，嘗試從全域變數獲取
            if (window[name] && typeof window[name] === 'function') {
                return window[name];
            }
            throw error;
        }
    }

    /**
     * 檢查模組是否已載入
     */
    isModuleLoaded(name) {
        return this.loadedModules.has(name) || window[name];
    }

    /**
     * 獲取已載入的模組
     */
    getModule(name) {
        return this.loadedModules.get(name) || window[name];
    }

    /**
     * 獲取載入狀態
     */
    getLoadStatus() {
        const modules = [
            'modaDesignSystemManager',
            'ThemeController', 
            'CSSVariablesManager',
            'BootstrapmodaIntegration',
            'TypographyManager',
            'AccessibilityManager'
        ];

        return modules.reduce((status, name) => {
            status[name] = this.isModuleLoaded(name);
            return status;
        }, {});
    }
}

// 全域實例
window.designSystemLoader = new DesignSystemLoader();

// 自動載入
document.addEventListener('DOMContentLoaded', () => {
    window.designSystemLoader.loadAllModules();
});

export default DesignSystemLoader;