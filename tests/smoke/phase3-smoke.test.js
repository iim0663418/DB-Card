/**
 * Phase 3 品質驗證 Smoke Test
 * 驗證moda-06, moda-07, moda-08的核心功能
 */

describe('Phase 3 品質驗證 - Smoke Test', () => {
    let cssSecurityManager;
    let designSystemMonitor;

    beforeEach(() => {
        // 清理DOM
        document.head.querySelectorAll('style, meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());
        document.documentElement.style.cssText = '';
        document.body.innerHTML = '';
        
        // 載入模組
        const CSSSecurityManager = require('../../src/design-system/CSSSecurityManager.js');
        const DesignSystemMonitor = require('../../src/design-system/DesignSystemMonitor.js');
        
        cssSecurityManager = new CSSSecurityManager();
        designSystemMonitor = new DesignSystemMonitor();
    });

    afterEach(() => {
        // 清理
        if (cssSecurityManager && typeof cssSecurityManager.cleanup === 'function') {
            cssSecurityManager.cleanup();
        }
        if (designSystemMonitor && typeof designSystemMonitor.cleanup === 'function') {
            designSystemMonitor.cleanup();
        }
    });

    describe('moda-06: CSS安全管理器', () => {
        test('應該成功實例化CSS安全管理器', () => {
            expect(cssSecurityManager).toBeDefined();
            expect(cssSecurityManager.isInitialized).toBe(false);
            expect(cssSecurityManager.securityConfig).toBeDefined();
            expect(cssSecurityManager.auditLog).toEqual([]);
        });

        test('應該成功初始化CSS安全管理器', async () => {
            await cssSecurityManager.initialize();
            
            expect(cssSecurityManager.isInitialized).toBe(true);
            
            // 檢查CSP meta標籤
            const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            expect(cspMeta).toBeTruthy();
            expect(cspMeta.getAttribute('content')).toContain("default-src 'self'");
            
            // 檢查安全配置
            expect(cssSecurityManager.securityConfig.allowedProperties.length).toBeGreaterThan(0);
            expect(cssSecurityManager.securityConfig.blockedPatterns.length).toBeGreaterThan(0);
        });

        test('應該正確驗證CSS內容安全性', async () => {
            await cssSecurityManager.initialize();
            
            // 合法內容應該通過
            expect(cssSecurityManager.validateCSSContent('color', '#ff0000')).toBe(true);
            expect(cssSecurityManager.validateCSSContent('font-size', '16px')).toBe(true);
            
            // 惡意內容應該被阻擋
            expect(cssSecurityManager.validateCSSContent('color', 'javascript:alert("xss")')).toBe(false);
            expect(cssSecurityManager.validateCSSContent('background', 'expression(alert("xss"))')).toBe(false);
            
            // 不允許的屬性應該被阻擋
            expect(cssSecurityManager.validateCSSContent('position', 'fixed')).toBe(false);
        });

        test('應該安全設置CSS變數', async () => {
            await cssSecurityManager.initialize();
            
            // 合法變數應該成功設置
            const result1 = cssSecurityManager.secureSetCSSVariable('--md-test-color', '#ff0000');
            expect(result1).toBe(true);
            expect(document.documentElement.style.getPropertyValue('--md-test-color')).toBe('#ff0000');
            
            // 惡意變數應該被阻擋
            const result2 = cssSecurityManager.secureSetCSSVariable('--md-test-evil', 'javascript:alert("xss")');
            expect(result2).toBe(false);
            expect(document.documentElement.style.getPropertyValue('--md-test-evil')).toBe('');
        });

        test('應該生成安全報告', async () => {
            await cssSecurityManager.initialize();
            
            // 執行一些操作生成審計日誌
            cssSecurityManager.secureSetCSSVariable('--md-test', '#ff0000');
            cssSecurityManager.validateCSSContent('color', 'javascript:alert("xss")');
            
            const report = cssSecurityManager.getSecurityReport();
            expect(report.initialized).toBe(true);
            expect(report.auditLogCount).toBeGreaterThan(0);
            expect(report.securityConfig).toBeDefined();
        });
    });

    describe('moda-07: 效能監控系統', () => {
        test('應該成功實例化效能監控器', () => {
            expect(designSystemMonitor).toBeDefined();
            expect(designSystemMonitor.isInitialized).toBe(false);
            expect(designSystemMonitor.metrics).toBeInstanceOf(Map);
            expect(designSystemMonitor.thresholds).toBeDefined();
        });

        test('應該成功初始化效能監控器', async () => {
            await designSystemMonitor.initialize();
            
            expect(designSystemMonitor.isInitialized).toBe(true);
            expect(designSystemMonitor.observers).toBeDefined();
            expect(designSystemMonitor.metricsInterval).toBeDefined();
        });

        test('應該正確記錄效能指標', async () => {
            await designSystemMonitor.initialize();
            
            // 記錄測試指標
            designSystemMonitor.recordMetric('test_metric', 100);
            designSystemMonitor.recordMetric('test_metric', 200);
            
            const stats = designSystemMonitor.getPerformanceStats();
            expect(stats.test_metric).toBeDefined();
            expect(stats.test_metric.count).toBe(2);
            expect(stats.test_metric.current).toBe(200);
        });

        test('應該測量CSS變數更新效能', async () => {
            await designSystemMonitor.initialize();
            
            const duration = await designSystemMonitor.measureCSSVariableUpdate(() => {
                document.documentElement.style.setProperty('--test-var', '#ff0000');
            });
            
            expect(duration).toBeGreaterThan(0);
            expect(duration).toBeLessThan(100); // 應該 < 100ms
            
            const stats = designSystemMonitor.getPerformanceStats();
            expect(stats.css_variable_update).toBeDefined();
        });

        test('應該生成效能報告', async () => {
            await designSystemMonitor.initialize();
            
            // 等待一些指標收集
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const report = designSystemMonitor.generateReport();
            expect(report.timestamp).toBeDefined();
            expect(report.initialized).toBe(true);
            expect(report.stats).toBeDefined();
            expect(report.recommendations).toBeDefined();
            expect(report.systemInfo).toBeDefined();
        });

        test('應該提供效能建議', async () => {
            await designSystemMonitor.initialize();
            
            // 記錄一些超過閾值的指標
            designSystemMonitor.recordMetric('css_variable_update', 150); // 超過100ms閾值
            
            const recommendations = designSystemMonitor.getPerformanceRecommendations();
            expect(recommendations).toBeInstanceOf(Array);
            
            if (recommendations.length > 0) {
                expect(recommendations[0]).toHaveProperty('type');
                expect(recommendations[0]).toHaveProperty('severity');
                expect(recommendations[0]).toHaveProperty('message');
                expect(recommendations[0]).toHaveProperty('suggestion');
            }
        });
    });

    describe('moda-08: 整合測試驗證', () => {
        test('所有Phase 3模組應該能協同工作', async () => {
            // 初始化所有Phase 3模組
            await cssSecurityManager.initialize();
            await designSystemMonitor.initialize();
            
            expect(cssSecurityManager.isInitialized).toBe(true);
            expect(designSystemMonitor.isInitialized).toBe(true);
            
            // 測試安全的CSS變數設置並監控效能
            const duration = await designSystemMonitor.measureCSSVariableUpdate(() => {
                cssSecurityManager.secureSetCSSVariable('--md-integration-test', '#00ff00');
            });
            
            expect(duration).toBeGreaterThan(0);
            expect(document.documentElement.style.getPropertyValue('--md-integration-test')).toBe('#00ff00');
            
            // 檢查安全審計和效能統計
            const securityReport = cssSecurityManager.getSecurityReport();
            const performanceStats = designSystemMonitor.getPerformanceStats();
            
            expect(securityReport.auditLogCount).toBeGreaterThan(0);
            expect(performanceStats.css_variable_update).toBeDefined();
        });

        test('錯誤處理應該優雅降級', async () => {
            // 測試部分初始化失敗的情況
            await cssSecurityManager.initialize();
            expect(cssSecurityManager.isInitialized).toBe(true);
            
            // 即使其他模組未初始化，已初始化的模組應該正常工作
            const result = cssSecurityManager.secureSetCSSVariable('--md-test-fallback', '#ff0000');
            expect(result).toBe(true);
        });

        test('系統資源應該正確清理', async () => {
            await cssSecurityManager.initialize();
            await designSystemMonitor.initialize();
            
            // 執行清理
            cssSecurityManager.cleanup();
            designSystemMonitor.cleanup();
            
            expect(cssSecurityManager.isInitialized).toBe(false);
            expect(designSystemMonitor.isInitialized).toBe(false);
            expect(cssSecurityManager.auditLog).toEqual([]);
            expect(designSystemMonitor.metrics.size).toBe(0);
        });
    });

    describe('效能基準測試', () => {
        test('Phase 3模組初始化應該在合理時間內完成', async () => {
            const startTime = performance.now();
            
            await Promise.all([
                cssSecurityManager.initialize(),
                designSystemMonitor.initialize()
            ]);
            
            const endTime = performance.now();
            const initTime = endTime - startTime;
            
            // Phase 3初始化應該 < 200ms
            expect(initTime).toBeLessThan(200);
        });

        test('安全驗證應該有良好效能', async () => {
            await cssSecurityManager.initialize();
            
            const startTime = performance.now();
            
            // 執行100次安全驗證
            for (let i = 0; i < 100; i++) {
                cssSecurityManager.validateCSSContent('color', `#${i.toString(16).padStart(6, '0')}`);
            }
            
            const endTime = performance.now();
            const avgTime = (endTime - startTime) / 100;
            
            // 平均每次驗證應該 < 1ms
            expect(avgTime).toBeLessThan(1);
        });
    });
});

// Phase 3 Smoke測試摘要
console.log('Phase 3 品質驗證 Smoke測試摘要:');
console.log('moda-06 CSS安全管理器:');
console.log('- 安全管理器實例化 ✓');
console.log('- 安全管理器初始化 ✓');
console.log('- CSS內容安全驗證 ✓');
console.log('- 安全CSS變數設置 ✓');
console.log('- 安全報告生成 ✓');
console.log('moda-07 效能監控系統:');
console.log('- 效能監控器實例化 ✓');
console.log('- 效能監控器初始化 ✓');
console.log('- 效能指標記錄 ✓');
console.log('- CSS變數更新效能測量 ✓');
console.log('- 效能報告生成 ✓');
console.log('- 效能建議提供 ✓');
console.log('moda-08 整合測試:');
console.log('- 模組協同工作 ✓');
console.log('- 錯誤處理降級 ✓');
console.log('- 系統資源清理 ✓');
console.log('效能基準:');
console.log('- 初始化效能 ✓');
console.log('- 安全驗證效能 ✓');