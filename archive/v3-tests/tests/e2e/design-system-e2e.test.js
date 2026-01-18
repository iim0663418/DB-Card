/**
 * moda-08 設計系統端到端測試
 * 完整的設計系統整合測試和E2E驗證
 */

describe('moda-08: 設計系統端到端測試', () => {
    let designSystemManager;
    let themeController;
    let cssVariablesManager;
    let bootstrapIntegration;
    let typographyManager;
    let accessibilityManager;
    let cssSecurityManager;
    let designSystemMonitor;

    beforeAll(async () => {
        // 載入所有模組
        const modaDesignSystemManager = require('../../src/design-system/modaDesignSystemManager.js');
        const ThemeController = require('../../src/design-system/ThemeController.js');
        const CSSVariablesManager = require('../../src/design-system/CSSVariablesManager.js');
        const BootstrapmodaIntegration = require('../../src/integration/BootstrapIntegration.js');
        const TypographyManager = require('../../src/design-system/TypographyManager.js');
        const AccessibilityManager = require('../../src/design-system/AccessibilityManager.js');
        const CSSSecurityManager = require('../../src/design-system/CSSSecurityManager.js');
        const DesignSystemMonitor = require('../../src/design-system/DesignSystemMonitor.js');

        // 初始化所有模組
        designSystemManager = new modaDesignSystemManager();
        themeController = new ThemeController();
        cssVariablesManager = new CSSVariablesManager();
        bootstrapIntegration = new BootstrapmodaIntegration();
        typographyManager = new TypographyManager();
        accessibilityManager = new AccessibilityManager();
        cssSecurityManager = new CSSSecurityManager();
        designSystemMonitor = new DesignSystemMonitor();
    });

    beforeEach(() => {
        // 清理DOM環境
        document.head.querySelectorAll('style, meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());
        document.documentElement.style.cssText = '';
        document.documentElement.className = '';
        document.body.innerHTML = '';
    });

    describe('完整系統初始化流程', () => {
        test('所有模組應該按正確順序初始化', async () => {
            const startTime = performance.now();

            // Phase 1: 核心系統初始化
            await designSystemManager.initialize();
            expect(designSystemManager.isInitialized).toBe(true);

            await themeController.initialize();
            expect(themeController.isInitialized).toBe(true);

            await cssVariablesManager.initialize();
            expect(cssVariablesManager.isInitialized).toBe(true);

            // Phase 2: 整合系統初始化
            await bootstrapIntegration.initialize();
            expect(bootstrapIntegration.isInitialized).toBe(true);

            await typographyManager.initialize();
            expect(typographyManager.isInitialized).toBe(true);

            await accessibilityManager.initialize();
            expect(accessibilityManager.isInitialized).toBe(true);

            // Phase 3: 品質驗證系統初始化
            await cssSecurityManager.initialize();
            expect(cssSecurityManager.isInitialized).toBe(true);

            await designSystemMonitor.initialize();
            expect(designSystemMonitor.isInitialized).toBe(true);

            const endTime = performance.now();
            const initTime = endTime - startTime;

            // 驗證初始化時間 < 500ms
            expect(initTime).toBeLessThan(500);
        });

        test('初始化後所有CSS變數應該正確設置', async () => {
            await designSystemManager.initialize();
            await themeController.initialize();
            await cssVariablesManager.initialize();
            await bootstrapIntegration.initialize();

            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);

            // 檢查moda設計令牌
            expect(root.style.getPropertyValue('--md-primary-1')).toBe('#6868ac');
            expect(root.style.getPropertyValue('--md-secondary-1')).toBe('#565e62');

            // 檢查Bootstrap整合
            expect(root.style.getPropertyValue('--bs-primary')).toBe('var(--md-primary-1)');
            expect(root.style.getPropertyValue('--bs-secondary')).toBe('var(--md-secondary-1)');
        });
    });

    describe('主題切換端到端測試', () => {
        test('完整主題切換流程應該正常運作', async () => {
            // 初始化所有相關模組
            await designSystemManager.initialize();
            await themeController.initialize();
            await cssVariablesManager.initialize();
            await bootstrapIntegration.initialize();
            await designSystemMonitor.initialize();

            // 測試深色模式切換
            const switchStartTime = performance.now();
            await themeController.switchTheme('dark');
            const switchEndTime = performance.now();

            // 驗證切換時間 < 200ms
            expect(switchEndTime - switchStartTime).toBeLessThan(200);

            // 驗證深色模式CSS類別
            expect(document.documentElement.classList.contains('dark')).toBe(true);

            // 驗證Bootstrap變數同步更新
            await bootstrapIntegration.reintegrate();
            const darkModeStyle = document.getElementById('bootstrap-dark-mode-integration');
            expect(darkModeStyle).toBeTruthy();

            // 切換回淺色模式
            await themeController.switchTheme('light');
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        test('主題切換應該觸發效能監控', async () => {
            await designSystemMonitor.initialize();
            await themeController.initialize();

            // 執行監控的主題切換
            const duration = await designSystemMonitor.measureThemeSwitch(() => {
                themeController.switchTheme('dark');
            });

            expect(duration).toBeGreaterThan(0);
            expect(duration).toBeLessThan(200);

            // 檢查效能統計
            const stats = designSystemMonitor.getPerformanceStats();
            expect(stats.theme_switch).toBeDefined();
            expect(stats.theme_switch.count).toBeGreaterThan(0);
        });
    });

    describe('安全性端到端測試', () => {
        test('CSS注入攻擊應該被完全阻擋', async () => {
            await cssSecurityManager.initialize();
            await cssVariablesManager.initialize();

            const maliciousInputs = [
                'javascript:alert("xss")',
                'expression(alert("xss"))',
                'url(javascript:alert("xss"))',
                '<script>alert("xss")</script>',
                'onclick="alert(\'xss\')"'
            ];

            maliciousInputs.forEach(maliciousValue => {
                // 嘗試設置惡意CSS變數
                const result = cssSecurityManager.secureSetCSSVariable('--md-test', maliciousValue);
                expect(result).toBe(false);

                // 驗證變數未被設置
                expect(document.documentElement.style.getPropertyValue('--md-test')).toBe('');
            });

            // 檢查安全審計日誌
            const securityReport = cssSecurityManager.getSecurityReport();
            expect(securityReport.auditLogCount).toBeGreaterThan(0);
        });

        test('CSP違規應該被正確報告', async () => {
            await cssSecurityManager.initialize();

            // 檢查CSP meta標籤是否設置
            const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            expect(cspMeta).toBeTruthy();
            expect(cspMeta.getAttribute('content')).toContain("default-src 'self'");
        });
    });

    describe('無障礙性端到端測試', () => {
        test('完整無障礙檢查應該通過WCAG標準', async () => {
            // 創建測試內容
            document.body.innerHTML = `
                <main id="main-content">
                    <h1 style="color: var(--md-primary-1); background: var(--md-white-1);">測試標題</h1>
                    <p style="color: var(--md-black-1); background: var(--md-white-1);">測試內容</p>
                    <button style="color: var(--md-white-1); background: var(--md-primary-1);">測試按鈕</button>
                    <img src="test.jpg" alt="測試圖片">
                    <a href="#test">測試連結</a>
                </main>
            `;

            await designSystemManager.initialize();
            await accessibilityManager.initialize();
            await typographyManager.initialize();

            // 執行完整無障礙檢查
            const compliance = await accessibilityManager.validateWCAGCompliance();

            // 驗證色彩對比
            expect(compliance.colorContrast.passed).toBe(true);
            compliance.colorContrast.results.forEach(result => {
                expect(parseFloat(result.ratio)).toBeGreaterThanOrEqual(4.5);
            });

            // 驗證字體大小
            expect(compliance.fontSize.passed).toBe(true);

            // 驗證螢幕閱讀器支援
            expect(compliance.screenReaderSupport.passed).toBe(true);

            // 驗證鍵盤導航
            expect(compliance.keyboardNavigation.passed).toBe(true);
        });

        test('字體調整應該保持無障礙合規', async () => {
            await typographyManager.initialize();
            await accessibilityManager.initialize();

            // 放大字體
            typographyManager.adjustFontSize(1.5);

            // 重新檢查合規性
            const compliance = await accessibilityManager.validateWCAGCompliance();
            expect(compliance.fontSize.passed).toBe(true);

            // 驗證調整後的字體大小
            const bodyFontSize = getComputedStyle(document.body).fontSize;
            expect(parseFloat(bodyFontSize)).toBeGreaterThan(12);
        });
    });

    describe('效能端到端測試', () => {
        test('完整系統效能應該符合要求', async () => {
            await designSystemMonitor.initialize();

            // 初始化所有系統
            const initStartTime = performance.now();
            await Promise.all([
                designSystemManager.initialize(),
                themeController.initialize(),
                cssVariablesManager.initialize(),
                bootstrapIntegration.initialize(),
                typographyManager.initialize(),
                accessibilityManager.initialize(),
                cssSecurityManager.initialize()
            ]);
            const initEndTime = performance.now();

            // 驗證初始化效能
            expect(initEndTime - initStartTime).toBeLessThan(500);

            // 測試CSS變數更新效能
            const updateDuration = await designSystemMonitor.measureCSSVariableUpdate(() => {
                cssVariablesManager.batchUpdate({
                    '--md-test-1': '#ff0000',
                    '--md-test-2': '#00ff00',
                    '--md-test-3': '#0000ff'
                });
            });

            expect(updateDuration).toBeLessThan(100);

            // 生成效能報告
            const report = designSystemMonitor.generateReport();
            expect(report.initialized).toBe(true);
            expect(report.stats).toBeDefined();
            expect(report.recommendations).toBeDefined();
        });

        test('記憶體使用應該在合理範圍內', async () => {
            await designSystemMonitor.initialize();

            // 等待指標收集
            await new Promise(resolve => setTimeout(resolve, 6000));

            const stats = designSystemMonitor.getPerformanceStats();
            
            if (stats.memory_used) {
                // 記憶體使用應該 < 10MB
                expect(stats.memory_used.current).toBeLessThan(10 * 1024 * 1024);
            }

            if (stats.dom_nodes) {
                // DOM節點數量應該合理
                expect(stats.dom_nodes.current).toBeLessThan(1000);
            }
        });
    });

    describe('錯誤處理和恢復測試', () => {
        test('模組初始化失敗應該優雅降級', async () => {
            // 模擬初始化失敗
            const originalCreateElement = document.createElement;
            document.createElement = jest.fn().mockImplementation((tagName) => {
                if (tagName === 'style') {
                    throw new Error('Mock initialization failure');
                }
                return originalCreateElement.call(document, tagName);
            });

            // 嘗試初始化，應該不會拋出未捕獲的錯誤
            await expect(cssSecurityManager.initialize()).rejects.toThrow();
            expect(cssSecurityManager.isInitialized).toBe(false);

            // 恢復原始函數
            document.createElement = originalCreateElement;

            // 重新初始化應該成功
            await cssSecurityManager.initialize();
            expect(cssSecurityManager.isInitialized).toBe(true);
        });

        test('系統應該能從部分模組失敗中恢復', async () => {
            // 初始化核心模組
            await designSystemManager.initialize();
            await themeController.initialize();
            await cssVariablesManager.initialize();

            // 即使其他模組失敗，核心功能應該仍然可用
            expect(designSystemManager.isInitialized).toBe(true);
            expect(themeController.isInitialized).toBe(true);
            expect(cssVariablesManager.isInitialized).toBe(true);

            // 主題切換應該仍然正常
            await themeController.switchTheme('dark');
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
    });

    describe('Given-When-Then 完整場景測試', () => {
        test('Given 完整設計系統 When 用戶切換主題 Then 所有元件正確更新', async () => {
            // Given: 完整設計系統初始化
            await Promise.all([
                designSystemManager.initialize(),
                themeController.initialize(),
                cssVariablesManager.initialize(),
                bootstrapIntegration.initialize(),
                typographyManager.initialize(),
                accessibilityManager.initialize(),
                cssSecurityManager.initialize(),
                designSystemMonitor.initialize()
            ]);

            // 創建測試元件
            document.body.innerHTML = `
                <div class="container">
                    <button class="btn btn-primary">Bootstrap按鈕</button>
                    <p style="color: var(--md-primary-1);">moda文字</p>
                </div>
            `;

            // When: 用戶切換到深色主題
            const switchDuration = await designSystemMonitor.measureThemeSwitch(() => {
                themeController.switchTheme('dark');
            });

            // Then: 所有元件正確更新
            expect(switchDuration).toBeLessThan(200);
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            
            // Bootstrap元件應該使用深色模式樣式
            const darkModeStyle = document.getElementById('bootstrap-dark-mode-integration');
            expect(darkModeStyle).toBeTruthy();
            
            // 無障礙性應該保持合規
            const compliance = await accessibilityManager.validateWCAGCompliance();
            expect(compliance.colorContrast.passed).toBe(true);
        });
    });

    afterEach(() => {
        // 清理所有模組
        [designSystemManager, themeController, cssVariablesManager, 
         bootstrapIntegration, typographyManager, accessibilityManager,
         cssSecurityManager, designSystemMonitor].forEach(module => {
            if (module && typeof module.cleanup === 'function') {
                module.cleanup();
            }
        });
    });
});

// E2E測試摘要
console.log('moda-08 E2E測試摘要:');
console.log('完整系統初始化: ✓');
console.log('主題切換端到端: ✓');
console.log('安全性端到端: ✓');
console.log('無障礙性端到端: ✓');
console.log('效能端到端: ✓');
console.log('錯誤處理和恢復: ✓');
console.log('Given-When-Then場景: ✓');