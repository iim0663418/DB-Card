/**
 * moda 無障礙管理器
 * 負責WCAG 2.1 AA合規檢查、色彩對比驗證和無障礙功能管理
 */

class AccessibilityManager {
    constructor() {
        this.isInitialized = false;
        this.wcagStandards = this.createWCAGStandards();
        this.complianceResults = {};
    }

    /**
     * 初始化無障礙管理器
     */
    async initialize() {
        try {
            this.setupAccessibilityFeatures();
            await this.validateWCAGCompliance();
            this.setupKeyboardNavigation();
            this.setupScreenReaderSupport();
            this.isInitialized = true;
            console.log('Accessibility Manager initialized successfully');
        } catch (error) {
            console.error('Accessibility initialization failed:', error);
            throw new Error(`Accessibility initialization failed: ${error.message}`);
        }
    }

    /**
     * 建立WCAG標準配置
     */
    createWCAGStandards() {
        return {
            colorContrast: {
                AA: 4.5,
                AAA: 7.0,
                largeText: 3.0
            },
            fontSize: {
                minimum: '12px',
                recommended: '14px',
                large: '18px'
            },
            focusIndicator: {
                minWidth: '2px',
                color: 'var(--md-primary-1)',
                style: 'solid'
            }
        };
    }

    /**
     * 設定無障礙功能
     */
    setupAccessibilityFeatures() {
        const a11yStyle = document.createElement('style');
        a11yStyle.id = 'accessibility-features';
        a11yStyle.textContent = `
            /* 焦點指示器 */
            *:focus {
                outline: ${this.wcagStandards.focusIndicator.minWidth} ${this.wcagStandards.focusIndicator.style} ${this.wcagStandards.focusIndicator.color};
                outline-offset: 2px;
            }
            
            /* 跳過連結 */
            .skip-link {
                position: absolute;
                top: -40px;
                left: 6px;
                background: var(--md-primary-1);
                color: var(--md-white-1);
                padding: 8px;
                text-decoration: none;
                z-index: 9999;
            }
            
            .skip-link:focus {
                top: 6px;
            }
            
            /* 減少動畫支援 */
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
            
            /* 高對比模式支援 */
            @media (prefers-contrast: high) {
                :root {
                    --md-primary-1: #000080;
                    --md-black-1: #000000;
                    --md-white-1: #ffffff;
                }
            }
            
            /* 螢幕閱讀器專用內容 */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
        
        if (!document.getElementById('accessibility-features')) {
            document.head.appendChild(a11yStyle);
        }
    }

    /**
     * 檢查色彩對比度
     */
    checkColorContrast(foreground, background) {
        const fgRgb = this.hexToRgb(foreground);
        const bgRgb = this.hexToRgb(background);
        
        if (!fgRgb || !bgRgb) {
            console.warn('Invalid color format for contrast check');
            return 0;
        }
        
        const fgLuminance = this.calculateLuminance(fgRgb);
        const bgLuminance = this.calculateLuminance(bgRgb);
        
        const lighter = Math.max(fgLuminance, bgLuminance);
        const darker = Math.min(fgLuminance, bgLuminance);
        
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * 將十六進位色彩轉換為RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * 計算相對亮度
     */
    calculateLuminance(rgb) {
        const { r, g, b } = rgb;
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    /**
     * 驗證WCAG合規性
     */
    async validateWCAGCompliance() {
        const results = {
            colorContrast: this.validateColorContrast(),
            fontSize: this.validateFontSize(),
            focusIndicators: this.validateFocusIndicators(),
            keyboardNavigation: this.validateKeyboardNavigation(),
            screenReaderSupport: this.validateScreenReaderSupport()
        };
        
        this.complianceResults = results;
        return results;
    }

    /**
     * 驗證色彩對比
     */
    validateColorContrast() {
        const testCases = [
            { fg: '#6868ac', bg: '#ffffff', context: 'Primary on white' },
            { fg: '#ffffff', bg: '#6868ac', context: 'White on primary' },
            { fg: '#1a1a1a', bg: '#ffffff', context: 'Text on white' },
            { fg: '#ffffff', bg: '#1a1a1a', context: 'White on dark' }
        ];
        
        const results = testCases.map(test => {
            const ratio = this.checkColorContrast(test.fg, test.bg);
            return {
                ...test,
                ratio: ratio.toFixed(2),
                passAA: ratio >= this.wcagStandards.colorContrast.AA,
                passAAA: ratio >= this.wcagStandards.colorContrast.AAA
            };
        });
        
        return {
            passed: results.every(r => r.passAA),
            results: results
        };
    }

    /**
     * 驗證字體大小
     */
    validateFontSize() {
        const bodyFontSize = getComputedStyle(document.body).fontSize;
        const fontSizePx = parseFloat(bodyFontSize);
        
        return {
            current: bodyFontSize,
            meetsMinimum: fontSizePx >= 12,
            meetsRecommended: fontSizePx >= 14,
            passed: fontSizePx >= 12
        };
    }

    /**
     * 驗證焦點指示器
     */
    validateFocusIndicators() {
        const focusableElements = document.querySelectorAll(
            'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        
        return {
            totalElements: focusableElements.length,
            hasGlobalFocusStyle: document.getElementById('accessibility-features') !== null,
            passed: document.getElementById('accessibility-features') !== null
        };
    }

    /**
     * 驗證鍵盤導航
     */
    validateKeyboardNavigation() {
        const interactiveElements = document.querySelectorAll(
            'a, button, input, textarea, select'
        );
        
        let accessibleCount = 0;
        interactiveElements.forEach(element => {
            if (!element.hasAttribute('tabindex') || element.getAttribute('tabindex') !== '-1') {
                accessibleCount++;
            }
        });
        
        return {
            totalInteractive: interactiveElements.length,
            keyboardAccessible: accessibleCount,
            passed: accessibleCount === interactiveElements.length
        };
    }

    /**
     * 驗證螢幕閱讀器支援
     */
    validateScreenReaderSupport() {
        const images = document.querySelectorAll('img');
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        
        let imagesWithAlt = 0;
        let buttonsWithLabel = 0;
        let linksWithText = 0;
        
        images.forEach(img => {
            if (img.hasAttribute('alt')) imagesWithAlt++;
        });
        
        buttons.forEach(btn => {
            if (btn.textContent.trim() || btn.hasAttribute('aria-label')) {
                buttonsWithLabel++;
            }
        });
        
        links.forEach(link => {
            if (link.textContent.trim() || link.hasAttribute('aria-label')) {
                linksWithText++;
            }
        });
        
        return {
            images: { total: images.length, withAlt: imagesWithAlt },
            buttons: { total: buttons.length, withLabel: buttonsWithLabel },
            links: { total: links.length, withText: linksWithText },
            passed: imagesWithAlt === images.length && 
                   buttonsWithLabel === buttons.length && 
                   linksWithText === links.length
        };
    }

    /**
     * 設定鍵盤導航
     */
    setupKeyboardNavigation() {
        // 添加跳過連結
        if (!document.querySelector('.skip-link')) {
            const skipLink = document.createElement('a');
            skipLink.href = '#main-content';
            skipLink.className = 'skip-link';
            skipLink.textContent = '跳至主要內容';
            document.body.insertBefore(skipLink, document.body.firstChild);
        }
        
        // 確保主要內容區域有ID
        const mainContent = document.querySelector('main') || document.querySelector('.main-content');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main-content';
        }
    }

    /**
     * 設定螢幕閱讀器支援
     */
    setupScreenReaderSupport() {
        // 為頁面添加語言屬性
        if (!document.documentElement.hasAttribute('lang')) {
            document.documentElement.setAttribute('lang', 'zh-TW');
        }
        
        // 為主要區域添加landmark roles
        const main = document.querySelector('main');
        if (main && !main.hasAttribute('role')) {
            main.setAttribute('role', 'main');
        }
    }

    /**
     * 啟用減少動畫模式
     */
    enableReducedMotion(enabled = true) {
        const root = document.documentElement;
        if (enabled) {
            root.style.setProperty('--animation-duration', '0.01ms');
            root.style.setProperty('--transition-duration', '0.01ms');
        } else {
            root.style.removeProperty('--animation-duration');
            root.style.removeProperty('--transition-duration');
        }
    }

    /**
     * 獲取合規報告
     */
    getComplianceReport() {
        return {
            initialized: this.isInitialized,
            lastValidation: new Date().toISOString(),
            results: this.complianceResults,
            overallCompliance: this.calculateOverallCompliance()
        };
    }

    /**
     * 計算整體合規性
     */
    calculateOverallCompliance() {
        if (!this.complianceResults || Object.keys(this.complianceResults).length === 0) {
            return 0;
        }
        
        const passedTests = Object.values(this.complianceResults).filter(result => result.passed).length;
        const totalTests = Object.keys(this.complianceResults).length;
        
        return Math.round((passedTests / totalTests) * 100);
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AccessibilityManager };
} else if (typeof window !== 'undefined') {
    window.AccessibilityManager = AccessibilityManager;
}