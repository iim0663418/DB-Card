/**
 * moda 字體系統管理器
 * 負責字體載入、字體大小管理和字體相關的無障礙功能
 */

class TypographyManager {
    constructor() {
        this.isInitialized = false;
        this.fontConfig = this.createFontConfiguration();
        this.loadedFonts = new Set();
    }

    /**
     * 初始化字體系統
     */
    async initialize() {
        try {
            // 嘗試載入字體，但不因失敗而阻斷初始化
            await this.loadFontsWithFallback();
            this.applyTypographyVariables();
            this.setupFontFallbacks();
            this.isInitialized = true;
            console.log('Typography Manager initialized successfully');
        } catch (error) {
            console.warn('Typography initialization had issues, using fallback:', error);
            // 使用降級機制繼續初始化
            this.applyTypographyVariables();
            this.setupFontFallbacks();
            this.isInitialized = true;
        }
    }

    /**
     * 建立字體配置
     */
    createFontConfiguration() {
        return {
            fontFamily: {
                primary: "'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
            },
            fontWeights: {
                light: 300,
                normal: 400,
                medium: 500,
                semibold: 600
            },
            fontSize: {
                base: '0.875rem',
                scale: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    md: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    '2xl': '1.5rem',
                    '3xl': '1.875rem'
                }
            },
            lineHeight: {
                tight: 1.25,
                normal: 1.5,
                relaxed: 1.75
            }
        };
    }

    /**
     * 載入字體（帶降級機制）
     */
    async loadFontsWithFallback() {
        // 直接載入 Google Fonts Noto Sans TC（對齊 moda.gov.tw）
        try {
            await this.loadGoogleFont('Noto Sans TC', [300, 400, 500, 700]);
            console.log('Successfully loaded Noto Sans TC from Google Fonts');
        } catch (error) {
            console.info('Noto Sans TC not available, using system fallback');
            // 使用系統字體作為降級
            this.loadedFonts.add('system-fallback');
        }
    }

    /**
     * 檢查字體是否可用
     */
    isFontAvailable(fontName) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // 使用不同字體渲染相同文字，比較寬度
        context.font = '12px monospace';
        const baseWidth = context.measureText('測試').width;
        
        context.font = `12px "${fontName}", monospace`;
        const testWidth = context.measureText('測試').width;
        
        return baseWidth !== testWidth;
    }

    /**
     * 載入Google字體
     */
    async loadGoogleFont(fontFamily, weights = [400]) {
        return new Promise((resolve, reject) => {
            // 對齊 moda.gov.tw 的字體載入策略
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@${weights.join(';')}&display=swap`;
            
            // 先加入 preload
            document.head.appendChild(link);
            
            // 再創建實際的 stylesheet
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = link.href;
            
            styleLink.onload = () => {
                this.loadedFonts.add(fontFamily);
                console.log(`Successfully loaded ${fontFamily}`);
                resolve();
            };
            
            styleLink.onerror = () => {
                console.info(`Font ${fontFamily} not available, using system fallback`);
                reject(new Error(`Font load failed: ${fontFamily}`));
            };
            
            // 設定超時機制
            setTimeout(() => {
                if (!this.loadedFonts.has(fontFamily)) {
                    console.info(`Font loading timeout: ${fontFamily}, using fallback`);
                    reject(new Error(`Font load timeout: ${fontFamily}`));
                }
            }, 5000); // 增加超時時間
            
            if (!document.querySelector(`link[rel="stylesheet"][href="${styleLink.href}"]`)) {
                document.head.appendChild(styleLink);
            } else {
                resolve();
            }
        });
    }

    /**
     * 應用字體變數
     */
    applyTypographyVariables() {
        const root = document.documentElement;
        const { fontFamily, fontWeights, fontSize, lineHeight } = this.fontConfig;

        // 設定字體家族
        root.style.setProperty('--bs-body-font-family', fontFamily.primary);
        
        // 設定字體重量
        Object.entries(fontWeights).forEach(([weight, value]) => {
            root.style.setProperty(`--font-weight-${weight}`, value);
        });

        // 設定字體大小
        root.style.setProperty('--bs-body-font-size', fontSize.base);
        Object.entries(fontSize.scale).forEach(([size, value]) => {
            root.style.setProperty(`--font-size-${size}`, value);
        });

        // 設定行高
        Object.entries(lineHeight).forEach(([height, value]) => {
            root.style.setProperty(`--line-height-${height}`, value);
        });
    }

    /**
     * 設定字體降級機制
     */
    setupFontFallbacks() {
        const fallbackStyle = document.createElement('style');
        fallbackStyle.id = 'typography-fallbacks';
        fallbackStyle.textContent = `
            /* 字體降級機制 */
            body, .typography-primary {
                font-family: ${this.fontConfig.fontFamily.primary};
                font-weight: ${this.fontConfig.fontWeights.normal};
                font-size: ${this.fontConfig.fontSize.base};
                line-height: ${this.fontConfig.lineHeight.normal};
            }
            
            /* 確保中文字體正確顯示 */
            .chinese-text {
                font-family: 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif;
            }
            
            /* 字體大小工具類 */
            .text-xs { font-size: var(--font-size-xs); }
            .text-sm { font-size: var(--font-size-sm); }
            .text-md { font-size: var(--font-size-md); }
            .text-lg { font-size: var(--font-size-lg); }
            .text-xl { font-size: var(--font-size-xl); }
            .text-2xl { font-size: var(--font-size-2xl); }
            .text-3xl { font-size: var(--font-size-3xl); }
        `;
        
        if (!document.getElementById('typography-fallbacks')) {
            document.head.appendChild(fallbackStyle);
        }
    }

    /**
     * 調整字體大小（無障礙功能）
     */
    adjustFontSize(scale = 1) {
        if (scale < 0.8 || scale > 2) {
            console.warn('Font scale should be between 0.8 and 2');
            return;
        }

        const root = document.documentElement;
        const baseSize = parseFloat(this.fontConfig.fontSize.base);
        const newSize = `${baseSize * scale}rem`;
        
        root.style.setProperty('--bs-body-font-size', newSize);
        
        // 同步調整所有字體大小
        Object.entries(this.fontConfig.fontSize.scale).forEach(([size, value]) => {
            const scaledValue = `${parseFloat(value) * scale}rem`;
            root.style.setProperty(`--font-size-${size}`, scaledValue);
        });
    }

    /**
     * 檢查字體載入狀態
     */
    getFontLoadStatus() {
        return {
            initialized: this.isInitialized,
            loadedFonts: Array.from(this.loadedFonts),
            primaryFontAvailable: this.isFontAvailable('PingFang TC') || this.isFontAvailable('Noto Sans TC'),
            fallbacksConfigured: document.getElementById('typography-fallbacks') !== null
        };
    }

    /**
     * 重置字體設定
     */
    resetTypography() {
        this.adjustFontSize(1);
        this.applyTypographyVariables();
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TypographyManager };
} else if (typeof window !== 'undefined') {
    window.TypographyManager = TypographyManager;
}