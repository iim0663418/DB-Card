/**
 * Bootstrap 5 與 moda 設計系統整合模組
 * 負責變數映射、響應式斷點對齊和樣式優先級管理
 */

class BootstrapmodaIntegration {
    constructor() {
        this.isInitialized = false;
        this.variableMappings = this.createVariableMappings();
        this.breakpointMappings = this.createBreakpointMappings();
    }

    /**
     * 初始化Bootstrap與moda整合
     */
    async initialize() {
        try {
            await this.integrateBootstrapVariables();
            await this.alignResponsiveBreakpoints();
            this.setupStylePriorityControl();
            this.isInitialized = true;
            console.log('Bootstrap moda Integration initialized successfully');
        } catch (error) {
            console.error('Bootstrap integration failed:', error);
            throw new Error(`Bootstrap integration initialization failed: ${error.message}`);
        }
    }

    /**
     * 建立Bootstrap與moda變數映射關係
     */
    createVariableMappings() {
        return {
            // 色彩系統映射
            '--bs-primary': 'var(--md-primary-1)',
            '--bs-secondary': 'var(--md-secondary-1)',
            '--bs-success': 'var(--md-primary-3)',
            '--bs-info': 'var(--md-primary-4)',
            '--bs-warning': 'var(--md-secondary-2)',
            '--bs-danger': '#dc3545',
            
            // 字體系統映射
            '--bs-body-font-family': "'PingFang TC', 'Noto Sans TC', sans-serif",
            '--bs-body-font-size': '0.875rem',
            '--bs-body-font-weight': '400',
            '--bs-body-color': 'var(--md-black-1)',
            '--bs-body-bg': 'var(--md-white-1)',
            
            // 邊框和間距
            '--bs-border-color': 'var(--md-neutral-9)',
            '--bs-border-radius': '0.375rem',
            '--bs-link-color': 'var(--md-primary-1)',
            '--bs-link-hover-color': 'var(--md-primary-3)'
        };
    }

    /**
     * 建立響應式斷點映射
     */
    createBreakpointMappings() {
        return {
            '--bs-breakpoint-xs': '0',
            '--bs-breakpoint-sm': '576px',
            '--bs-breakpoint-md': '768px',
            '--bs-breakpoint-lg': '992px',
            '--bs-breakpoint-xl': '1200px',
            '--bs-breakpoint-xxl': '1400px'
        };
    }

    /**
     * 整合Bootstrap變數與moda設計系統
     */
    async integrateBootstrapVariables() {
        const root = document.documentElement;
        
        // 批次應用變數映射
        Object.entries(this.variableMappings).forEach(([bsVar, modaVar]) => {
            if (this.validateVariableMapping(bsVar, modaVar)) {
                root.style.setProperty(bsVar, modaVar);
            }
        });

        // 確保深色模式變數同步
        this.setupDarkModeVariables();
    }

    /**
     * 設定深色模式變數映射
     */
    setupDarkModeVariables() {
        const darkModeStyle = document.createElement('style');
        darkModeStyle.id = 'bootstrap-dark-mode-integration';
        darkModeStyle.textContent = `
            .dark {
                --bs-body-color: var(--md-white-1);
                --bs-body-bg: var(--md-black-1);
                --bs-border-color: var(--md-neutral-2);
                --bs-link-color: var(--md-primary-1);
            }
        `;
        
        if (!document.getElementById('bootstrap-dark-mode-integration')) {
            document.head.appendChild(darkModeStyle);
        }
    }

    /**
     * 對齊響應式斷點
     */
    async alignResponsiveBreakpoints() {
        const root = document.documentElement;
        
        Object.entries(this.breakpointMappings).forEach(([breakpoint, value]) => {
            root.style.setProperty(breakpoint, value);
        });
    }

    /**
     * 設定樣式優先級控制
     */
    setupStylePriorityControl() {
        const priorityStyle = document.createElement('style');
        priorityStyle.id = 'moda-bootstrap-priority';
        priorityStyle.textContent = `
            /* moda設計系統優先級控制 */
            .moda-override {
                color: var(--md-primary-1) !important;
                background-color: var(--md-white-1) !important;
            }
            
            /* Bootstrap元件moda化 */
            .btn-primary {
                background-color: var(--md-primary-1);
                border-color: var(--md-primary-1);
            }
            
            .btn-primary:hover {
                background-color: var(--md-primary-3);
                border-color: var(--md-primary-3);
            }
            
            .navbar-brand {
                color: var(--md-primary-1) !important;
            }
        `;
        
        if (!document.getElementById('moda-bootstrap-priority')) {
            document.head.appendChild(priorityStyle);
        }
    }

    /**
     * 驗證變數映射安全性
     */
    validateVariableMapping(bsVar, modaVar) {
        // 檢查Bootstrap變數名稱格式
        if (!bsVar.startsWith('--bs-')) {
            console.warn(`Invalid Bootstrap variable name: ${bsVar}`);
            return false;
        }

        // 檢查變數引用格式（允許多種格式）
        const validFormats = [
            modaVar.includes('var(--md-'),  // moda 變數
            modaVar.includes('var(--bs-'),  // Bootstrap 變數
            modaVar.startsWith('#'),        // 十六進制顏色
            modaVar.includes('rem'),        // rem 單位
            modaVar.includes('px'),         // px 單位
            modaVar.includes('"'),          // 字體名稱
            modaVar.includes("'"),          // 字體名稱
            /^\d+$/.test(modaVar)           // 純數字
        ];
        
        if (!validFormats.some(format => format)) {
            console.warn(`Invalid variable reference: ${modaVar}`);
            return false;
        }

        return true;
    }

    /**
     * 檢查整合狀態
     */
    getIntegrationStatus() {
        return {
            initialized: this.isInitialized,
            variablesMapped: Object.keys(this.variableMappings).length,
            breakpointsAligned: Object.keys(this.breakpointMappings).length,
            darkModeSupported: document.getElementById('bootstrap-dark-mode-integration') !== null
        };
    }

    /**
     * 重新整合（用於主題切換後）
     */
    async reintegrate() {
        if (!this.isInitialized) {
            await this.initialize();
        } else {
            await this.integrateBootstrapVariables();
        }
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BootstrapmodaIntegration };
} else if (typeof window !== 'undefined') {
    window.BootstrapmodaIntegration = BootstrapmodaIntegration;
}