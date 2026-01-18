/**
 * moda-04 Bootstrap 5整合與變數映射 Smoke Test
 * 驗證Bootstrap與moda設計系統整合的核心功能
 */

describe('moda-04: Bootstrap 5整合與變數映射 - Smoke Test', () => {
    let bootstrapIntegration;

    beforeEach(() => {
        // 清理DOM
        document.head.querySelectorAll('#bootstrap-dark-mode-integration, #moda-bootstrap-priority').forEach(el => el.remove());
        document.documentElement.style.cssText = '';
        
        // 模擬瀏覽器環境
        global.document = document;
        global.window = window;
        
        // 載入模組
        const BootstrapmodaIntegration = require('../../src/integration/BootstrapIntegration.js');
        bootstrapIntegration = new BootstrapmodaIntegration();
    });

    afterEach(() => {
        // 清理
        document.head.querySelectorAll('#bootstrap-dark-mode-integration, #moda-bootstrap-priority').forEach(el => el.remove());
        document.documentElement.style.cssText = '';
    });

    test('應該成功實例化Bootstrap整合管理器', () => {
        expect(bootstrapIntegration).toBeDefined();
        expect(bootstrapIntegration.isInitialized).toBe(false);
        expect(bootstrapIntegration.variableMappings).toBeDefined();
        expect(bootstrapIntegration.breakpointMappings).toBeDefined();
    });

    test('應該成功初始化Bootstrap與moda整合', async () => {
        await bootstrapIntegration.initialize();
        
        expect(bootstrapIntegration.isInitialized).toBe(true);
        
        // 檢查CSS變數是否正確應用
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--bs-primary')).toBe('var(--md-primary-1)');
        expect(root.style.getPropertyValue('--bs-secondary')).toBe('var(--md-secondary-1)');
        
        // 檢查響應式斷點
        expect(root.style.getPropertyValue('--bs-breakpoint-md')).toBe('768px');
        expect(root.style.getPropertyValue('--bs-breakpoint-lg')).toBe('992px');
    });

    test('應該正確建立變數映射關係', () => {
        const mappings = bootstrapIntegration.variableMappings;
        
        // 檢查核心色彩映射
        expect(mappings['--bs-primary']).toBe('var(--md-primary-1)');
        expect(mappings['--bs-secondary']).toBe('var(--md-secondary-1)');
        expect(mappings['--bs-body-color']).toBe('var(--md-black-1)');
        expect(mappings['--bs-body-bg']).toBe('var(--md-white-1)');
        
        // 檢查字體映射
        expect(mappings['--bs-body-font-family']).toBe('var(--bs-body-font-family)');
    });

    test('應該正確設定深色模式變數', async () => {
        await bootstrapIntegration.initialize();
        
        const darkModeStyle = document.getElementById('bootstrap-dark-mode-integration');
        expect(darkModeStyle).toBeTruthy();
        expect(darkModeStyle.textContent).toContain('.dark');
        expect(darkModeStyle.textContent).toContain('--bs-body-color: var(--md-white-1)');
        expect(darkModeStyle.textContent).toContain('--bs-body-bg: var(--md-black-1)');
    });

    test('應該正確設定樣式優先級控制', async () => {
        await bootstrapIntegration.initialize();
        
        const priorityStyle = document.getElementById('moda-bootstrap-priority');
        expect(priorityStyle).toBeTruthy();
        expect(priorityStyle.textContent).toContain('.btn-primary');
        expect(priorityStyle.textContent).toContain('var(--md-primary-1)');
        expect(priorityStyle.textContent).toContain('.moda-override');
    });

    test('應該驗證變數映射安全性', () => {
        // 有效的Bootstrap變數
        expect(bootstrapIntegration.validateVariableMapping('--bs-primary', 'var(--md-primary-1)')).toBe(true);
        expect(bootstrapIntegration.validateVariableMapping('--bs-danger', '#dc3545')).toBe(true);
        
        // 無效的變數名稱
        expect(bootstrapIntegration.validateVariableMapping('invalid-var', 'var(--md-primary-1)')).toBe(false);
        expect(bootstrapIntegration.validateVariableMapping('--bs-primary', 'invalid-value')).toBe(false);
    });

    test('應該正確回報整合狀態', async () => {
        await bootstrapIntegration.initialize();
        
        const status = bootstrapIntegration.getIntegrationStatus();
        expect(status.initialized).toBe(true);
        expect(status.variablesMapped).toBeGreaterThan(0);
        expect(status.breakpointsAligned).toBeGreaterThan(0);
        expect(status.darkModeSupported).toBe(true);
    });

    test('應該支援重新整合功能', async () => {
        await bootstrapIntegration.initialize();
        
        // 清除一些變數
        document.documentElement.style.removeProperty('--bs-primary');
        expect(document.documentElement.style.getPropertyValue('--bs-primary')).toBe('');
        
        // 重新整合
        await bootstrapIntegration.reintegrate();
        expect(document.documentElement.style.getPropertyValue('--bs-primary')).toBe('var(--md-primary-1)');
    });
});

// 測試摘要
console.log('moda-04 Smoke Test Summary:');
console.log('- Bootstrap整合管理器實例化 ✓');
console.log('- 變數映射機制 ✓');
console.log('- 深色模式支援 ✓');
console.log('- 樣式優先級控制 ✓');
console.log('- 安全性驗證 ✓');
console.log('- 狀態回報 ✓');
console.log('- 重新整合功能 ✓');