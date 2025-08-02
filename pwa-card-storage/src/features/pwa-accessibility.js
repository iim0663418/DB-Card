/**
 * PWA 無障礙功能整合
 * 整合 moda 無障礙管理器到 PWA 中
 */

class PWAAccessibility {
    constructor() {
        this.accessibilityManager = null;
        this.isInitialized = false;
    }

    /**
     * 初始化無障礙功能
     */
    async initialize() {
        try {
            // 等待 AccessibilityManager 載入
            await this.waitForAccessibilityManager();
            
            if (window.AccessibilityManager && typeof window.AccessibilityManager === 'function') {
                this.accessibilityManager = new window.AccessibilityManager();
                await this.accessibilityManager.initialize();
            } else {
                console.warn('AccessibilityManager not available, using basic accessibility features');
            }

            // 設定 PWA 專用無障礙功能
            this.setupPWAAccessibility();
            
            this.isInitialized = true;
            console.log('PWA Accessibility initialized successfully');
        } catch (error) {
            console.warn('PWA Accessibility initialization failed:', error);
            // 使用基本無障礙功能
            this.setupPWAAccessibility();
            this.isInitialized = true;
        }
    }

    /**
     * 等待 AccessibilityManager 載入
     */
    async waitForAccessibilityManager() {
        const maxWait = 2000; // 2秒超時
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            if (window.AccessibilityManager && typeof window.AccessibilityManager === 'function') {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.warn('AccessibilityManager not loaded within timeout');
    }

    /**
     * 設定 PWA 專用無障礙功能
     */
    setupPWAAccessibility() {
        // 確保主要內容區域有正確的 landmark
        const mainContent = document.getElementById('main-content');
        if (mainContent && !mainContent.hasAttribute('role')) {
            mainContent.setAttribute('role', 'main');
        }

        // 為導航添加 landmark
        const appNav = document.querySelector('.app-nav');
        if (appNav && !appNav.hasAttribute('role')) {
            appNav.setAttribute('role', 'navigation');
            appNav.setAttribute('aria-label', '主要導航');
        }

        // 為頁面標題添加適當的 heading 結構
        const pageHeaders = document.querySelectorAll('.page h2');
        pageHeaders.forEach(header => {
            if (!header.hasAttribute('tabindex')) {
                header.setAttribute('tabindex', '-1');
            }
        });

        // 設定鍵盤導航
        this.setupKeyboardNavigation();
    }

    /**
     * 設定鍵盤導航
     */
    setupKeyboardNavigation() {
        // ESC 鍵關閉模態框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                }
            }
        });

        // Tab 鍵循環導航
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item, index) => {
            item.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const direction = e.key === 'ArrowRight' ? 1 : -1;
                    const nextIndex = (index + direction + navItems.length) % navItems.length;
                    navItems[nextIndex].focus();
                }
            });
        });
    }

    /**
     * 檢查無障礙合規性
     */
    async checkCompliance() {
        if (this.accessibilityManager) {
            return await this.accessibilityManager.validateWCAGCompliance();
        }
        return null;
    }

    /**
     * 獲取無障礙狀態
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasAccessibilityManager: !!this.accessibilityManager
        };
    }
}

// 全域實例
window.pwaAccessibility = new PWAAccessibility();

// 自動初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.pwaAccessibility.initialize();
    }, 100);
});