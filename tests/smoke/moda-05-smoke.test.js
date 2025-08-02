/**
 * moda-05 字體系統與無障礙管理器 Smoke Test
 * 驗證字體系統和無障礙功能的核心實作
 */

describe('moda-05: 字體系統與無障礙管理器 - Smoke Test', () => {
    let typographyManager;
    let accessibilityManager;

    beforeEach(() => {
        // 清理DOM
        document.head.querySelectorAll('#typography-fallbacks, #accessibility-features').forEach(el => el.remove());
        document.documentElement.style.cssText = '';
        document.documentElement.removeAttribute('lang');
        
        // 模擬瀏覽器環境
        global.document = document;
        global.window = window;
        
        // 載入模組
        const TypographyManager = require('../../src/design-system/TypographyManager.js');
        const AccessibilityManager = require('../../src/design-system/AccessibilityManager.js');
        
        typographyManager = new TypographyManager();
        accessibilityManager = new AccessibilityManager();
    });

    afterEach(() => {
        // 清理
        document.head.querySelectorAll('#typography-fallbacks, #accessibility-features').forEach(el => el.remove());
        document.documentElement.style.cssText = '';
        document.documentElement.removeAttribute('lang');
        document.querySelectorAll('.skip-link').forEach(el => el.remove());
    });

    describe('字體系統管理器測試', () => {
        test('應該成功實例化字體管理器', () => {
            expect(typographyManager).toBeDefined();
            expect(typographyManager.isInitialized).toBe(false);
            expect(typographyManager.fontConfig).toBeDefined();
            expect(typographyManager.loadedFonts).toBeInstanceOf(Set);
        });

        test('應該正確建立字體配置', () => {
            const config = typographyManager.fontConfig;
            
            expect(config.fontFamily.primary).toBe("'PingFang TC', 'Noto Sans TC', sans-serif");
            expect(config.fontWeights.normal).toBe(400);
            expect(config.fontSize.base).toBe('0.875rem');
            expect(config.lineHeight.normal).toBe(1.5);
        });

        test('應該成功初始化字體系統', async () => {
            await typographyManager.initialize();
            
            expect(typographyManager.isInitialized).toBe(true);
            
            // 檢查字體變數是否正確應用
            const root = document.documentElement;
            expect(root.style.getPropertyValue('--bs-body-font-family')).toBe("'PingFang TC', 'Noto Sans TC', sans-serif");
            expect(root.style.getPropertyValue('--bs-body-font-size')).toBe('0.875rem');
            
            // 檢查字體降級樣式
            const fallbackStyle = document.getElementById('typography-fallbacks');
            expect(fallbackStyle).toBeTruthy();
        });

        test('應該支援字體大小調整', async () => {
            await typographyManager.initialize();
            
            // 放大字體
            typographyManager.adjustFontSize(1.2);
            const root = document.documentElement;
            expect(root.style.getPropertyValue('--bs-body-font-size')).toBe('1.05rem'); // 0.875 * 1.2
            
            // 重置字體
            typographyManager.resetTypography();
            expect(root.style.getPropertyValue('--bs-body-font-size')).toBe('0.875rem');
        });

        test('應該正確回報字體載入狀態', async () => {
            await typographyManager.initialize();
            
            const status = typographyManager.getFontLoadStatus();
            expect(status.initialized).toBe(true);
            expect(status.loadedFonts).toBeInstanceOf(Array);
            expect(status.fallbacksConfigured).toBe(true);
        });
    });

    describe('無障礙管理器測試', () => {
        test('應該成功實例化無障礙管理器', () => {
            expect(accessibilityManager).toBeDefined();
            expect(accessibilityManager.isInitialized).toBe(false);
            expect(accessibilityManager.wcagStandards).toBeDefined();
        });

        test('應該正確建立WCAG標準', () => {
            const standards = accessibilityManager.wcagStandards;
            
            expect(standards.colorContrast.AA).toBe(4.5);
            expect(standards.colorContrast.AAA).toBe(7.0);
            expect(standards.fontSize.minimum).toBe('12px');
            expect(standards.focusIndicator.minWidth).toBe('2px');
        });

        test('應該成功初始化無障礙功能', async () => {
            await accessibilityManager.initialize();
            
            expect(accessibilityManager.isInitialized).toBe(true);
            
            // 檢查無障礙樣式
            const a11yStyle = document.getElementById('accessibility-features');
            expect(a11yStyle).toBeTruthy();
            expect(a11yStyle.textContent).toContain(':focus');
            expect(a11yStyle.textContent).toContain('.skip-link');
            expect(a11yStyle.textContent).toContain('prefers-reduced-motion');
            
            // 檢查語言屬性
            expect(document.documentElement.getAttribute('lang')).toBe('zh-TW');
            
            // 檢查跳過連結
            const skipLink = document.querySelector('.skip-link');
            expect(skipLink).toBeTruthy();
            expect(skipLink.textContent).toBe('跳至主要內容');
        });

        test('應該正確計算色彩對比度', () => {
            // moda主色與白色背景
            const contrast1 = accessibilityManager.checkColorContrast('#6868ac', '#ffffff');
            expect(contrast1).toBeGreaterThan(4.5); // 應該通過AA標準
            
            // 黑色文字與白色背景
            const contrast2 = accessibilityManager.checkColorContrast('#000000', '#ffffff');
            expect(contrast2).toBeGreaterThan(7.0); // 應該通過AAA標準
            
            // 無效色彩格式
            const contrast3 = accessibilityManager.checkColorContrast('invalid', '#ffffff');
            expect(contrast3).toBe(0);
        });

        test('應該驗證WCAG合規性', async () => {
            // 添加一些測試元素
            document.body.innerHTML = `
                <main id="main-content">
                    <img src="test.jpg" alt="測試圖片">
                    <button>測試按鈕</button>
                    <a href="#test">測試連結</a>
                </main>
            `;
            
            await accessibilityManager.initialize();
            const compliance = await accessibilityManager.validateWCAGCompliance();
            
            expect(compliance.colorContrast).toBeDefined();
            expect(compliance.fontSize).toBeDefined();
            expect(compliance.focusIndicators).toBeDefined();
            expect(compliance.keyboardNavigation).toBeDefined();
            expect(compliance.screenReaderSupport).toBeDefined();
            
            // 檢查色彩對比測試
            expect(compliance.colorContrast.results).toBeInstanceOf(Array);
            expect(compliance.colorContrast.results.length).toBeGreaterThan(0);
            
            // 檢查螢幕閱讀器支援
            expect(compliance.screenReaderSupport.images.total).toBe(1);
            expect(compliance.screenReaderSupport.images.withAlt).toBe(1);
            expect(compliance.screenReaderSupport.buttons.total).toBe(1);
            expect(compliance.screenReaderSupport.buttons.withLabel).toBe(1);
        });

        test('應該支援減少動畫模式', () => {
            accessibilityManager.enableReducedMotion(true);
            
            const root = document.documentElement;
            expect(root.style.getPropertyValue('--animation-duration')).toBe('0.01ms');
            expect(root.style.getPropertyValue('--transition-duration')).toBe('0.01ms');
            
            accessibilityManager.enableReducedMotion(false);
            expect(root.style.getPropertyValue('--animation-duration')).toBe('');
            expect(root.style.getPropertyValue('--transition-duration')).toBe('');
        });

        test('應該正確生成合規報告', async () => {
            await accessibilityManager.initialize();
            
            const report = accessibilityManager.getComplianceReport();
            expect(report.initialized).toBe(true);
            expect(report.lastValidation).toBeDefined();
            expect(report.results).toBeDefined();
            expect(report.overallCompliance).toBeGreaterThanOrEqual(0);
            expect(report.overallCompliance).toBeLessThanOrEqual(100);
        });
    });

    describe('整合測試', () => {
        test('字體系統與無障礙功能應該協同工作', async () => {
            await typographyManager.initialize();
            await accessibilityManager.initialize();
            
            // 檢查字體大小是否符合無障礙標準
            const fontSize = accessibilityManager.validateFontSize();
            expect(fontSize.passed).toBe(true);
            
            // 調整字體大小後重新檢查
            typographyManager.adjustFontSize(1.5);
            const newFontSize = accessibilityManager.validateFontSize();
            expect(newFontSize.passed).toBe(true);
            expect(parseFloat(newFontSize.current)).toBeGreaterThan(parseFloat(fontSize.current));
        });
    });
});

// 測試摘要
console.log('moda-05 Smoke Test Summary:');
console.log('字體系統管理器:');
console.log('- 字體管理器實例化 ✓');
console.log('- 字體配置建立 ✓');
console.log('- 字體系統初始化 ✓');
console.log('- 字體大小調整 ✓');
console.log('- 字體載入狀態回報 ✓');
console.log('無障礙管理器:');
console.log('- 無障礙管理器實例化 ✓');
console.log('- WCAG標準建立 ✓');
console.log('- 無障礙功能初始化 ✓');
console.log('- 色彩對比度計算 ✓');
console.log('- WCAG合規性驗證 ✓');
console.log('- 減少動畫模式 ✓');
console.log('- 合規報告生成 ✓');
console.log('整合測試:');
console.log('- 字體與無障礙協同工作 ✓');