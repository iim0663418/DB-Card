/**
 * Component Integration Smoke Test - v3.2.0-pwa-deployment-compatibility
 * 驗證 COMP-01, COMP-02, COMP-04 元件整合功能
 */

class ComponentIntegrationSmokeTest {
  constructor() {
    this.testResults = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * 執行所有煙霧測試
   */
  async runAllTests() {
    console.log('[ComponentIntegrationSmokeTest] Starting smoke tests...');
    
    try {
      await this.testSimplifiedLanguageManager();
      await this.testUnifiedComponentRegistry();
      await this.testComponentHealthMonitor();
      await this.testComponentIntegration();
      
      this.printResults();
      return this.getTestReport();
      
    } catch (error) {
      console.error('[ComponentIntegrationSmokeTest] Test execution failed:', error);
      throw error;
    }
  }

  /**
   * 測試簡化語言管理器
   */
  async testSimplifiedLanguageManager() {
    const testName = 'SimplifiedLanguageManager';
    
    try {
      // 檢查類別是否存在
      this.assert(typeof SimplifiedLanguageManager === 'function', 
        `${testName} class should be available`);
      
      // 建立實例
      const manager = new SimplifiedLanguageManager();
      this.assert(manager instanceof SimplifiedLanguageManager, 
        `${testName} instance should be created`);
      
      // 測試初始化
      await manager.initialize();
      this.assert(manager.initialized === true, 
        `${testName} should be initialized`);
      
      // 測試語言切換
      const currentLang = manager.getCurrentLanguage();
      this.assert(['zh-TW', 'en'].includes(currentLang), 
        `${testName} should have valid current language`);
      
      // 測試語言切換功能
      const newLang = await manager.toggleLanguage();
      this.assert(newLang !== currentLang, 
        `${testName} should switch language`);
      
      // 測試翻譯功能
      const text = manager.getText('app-title');
      this.assert(typeof text === 'string' && text.length > 0, 
        `${testName} should return translation text`);
      
      // 測試狀態獲取
      const status = manager.getStatus();
      this.assert(status && typeof status === 'object', 
        `${testName} should return status object`);
      
      // 清理
      manager.cleanup();
      
      this.recordTest(testName, true);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * 測試統一元件註冊器
   */
  async testUnifiedComponentRegistry() {
    const testName = 'UnifiedComponentRegistry';
    
    try {
      // 檢查類別是否存在
      this.assert(typeof UnifiedComponentRegistry === 'function', 
        `${testName} class should be available`);
      
      // 建立實例
      const registry = new UnifiedComponentRegistry();
      this.assert(registry instanceof UnifiedComponentRegistry, 
        `${testName} instance should be created`);
      
      // 建立測試元件
      const testComponent = {
        name: 'TestComponent',
        initialized: false,
        initialize: async function() {
          this.initialized = true;
          return Promise.resolve();
        },
        cleanup: async function() {
          this.initialized = false;
          return Promise.resolve();
        },
        getStatus: function() {
          return { healthy: this.initialized };
        }
      };
      
      // 註冊元件
      registry.register('test-component', testComponent, {
        priority: 5,
        critical: false
      });
      
      // 檢查元件是否已註冊
      const component = registry.getComponent('test-component');
      this.assert(component === testComponent, 
        `${testName} should register and retrieve component`);
      
      // 測試初始化
      const report = await registry.initializeAll();
      this.assert(report.completed > 0, 
        `${testName} should initialize components`);
      
      // 檢查元件是否已初始化
      this.assert(registry.isComponentInitialized('test-component'), 
        `${testName} should mark component as initialized`);
      
      // 測試狀態獲取
      const status = registry.getStatus();
      this.assert(status && status.componentCount > 0, 
        `${testName} should return valid status`);
      
      // 清理
      await registry.cleanup();
      
      this.recordTest(testName, true);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * 測試元件健康監控器
   */
  async testComponentHealthMonitor() {
    const testName = 'ComponentHealthMonitor';
    
    try {
      // 檢查類別是否存在
      this.assert(typeof ComponentHealthMonitor === 'function', 
        `${testName} class should be available`);
      
      // 建立實例
      const monitor = new ComponentHealthMonitor();
      this.assert(monitor instanceof ComponentHealthMonitor, 
        `${testName} instance should be created`);
      
      // 初始化
      await monitor.initialize();
      this.assert(monitor.initialized === true, 
        `${testName} should be initialized`);
      
      // 建立測試元件
      const testComponent = {
        healthy: true,
        getStatus: function() {
          return { healthy: this.healthy };
        }
      };
      
      // 追蹤元件
      monitor.track('test-component', testComponent);
      
      // 執行健康檢查
      await monitor.checkComponentHealth('test-component');
      
      // 獲取健康狀態
      const healthStatus = monitor.getHealthStatus();
      this.assert(healthStatus && healthStatus.componentCount > 0, 
        `${testName} should track components`);
      
      // 測試失敗報告
      monitor.reportFailure('test-component', new Error('Test error'));
      
      // 獲取告警
      const alerts = monitor.getAlerts();
      this.assert(Array.isArray(alerts), 
        `${testName} should return alerts array`);
      
      // 清理
      monitor.cleanup();
      
      this.recordTest(testName, true);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * 測試元件整合
   */
  async testComponentIntegration() {
    const testName = 'ComponentIntegration';
    
    try {
      // 建立語言管理器
      const languageManager = new SimplifiedLanguageManager();
      await languageManager.initialize();
      
      // 建立元件註冊器
      const registry = new UnifiedComponentRegistry();
      
      // 建立健康監控器
      const healthMonitor = new ComponentHealthMonitor();
      await healthMonitor.initialize();
      
      // 註冊語言管理器到註冊器
      registry.register('language-manager', languageManager, {
        priority: 9,
        critical: true
      });
      
      // 註冊健康監控器到註冊器
      registry.register('health-monitor', healthMonitor, {
        priority: 8,
        critical: false
      });
      
      // 初始化所有元件
      const report = await registry.initializeAll();
      this.assert(report.completed >= 2, 
        `${testName} should initialize multiple components`);
      
      // 測試語言管理器是否正常工作
      const currentLang = languageManager.getCurrentLanguage();
      this.assert(['zh-TW', 'en'].includes(currentLang), 
        `${testName} language manager should work after integration`);
      
      // 測試健康監控器是否正常工作
      const healthStatus = healthMonitor.getHealthStatus();
      this.assert(healthStatus.initialized === true, 
        `${testName} health monitor should work after integration`);
      
      // 測試元件間協作
      healthMonitor.track('language-manager', languageManager);
      await healthMonitor.checkComponentHealth('language-manager');
      
      // 清理所有元件
      await registry.cleanup();
      languageManager.cleanup();
      healthMonitor.cleanup();
      
      this.recordTest(testName, true);
      
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  /**
   * 斷言函數
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * 記錄測試結果
   */
  recordTest(testName, passed, error = null) {
    const result = {
      name: testName,
      passed,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    if (passed) {
      this.passed++;
      console.log(`✅ ${testName} - PASSED`);
    } else {
      this.failed++;
      console.error(`❌ ${testName} - FAILED: ${error}`);
    }
  }

  /**
   * 列印測試結果
   */
  printResults() {
    console.log('\n=== Component Integration Smoke Test Results ===');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Success Rate: ${((this.passed / this.testResults.length) * 100).toFixed(2)}%`);
    
    if (this.failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.error}`);
        });
    }
    
    console.log('===============================================\n');
  }

  /**
   * 獲取測試報告
   */
  getTestReport() {
    return {
      summary: {
        total: this.testResults.length,
        passed: this.passed,
        failed: this.failed,
        successRate: (this.passed / this.testResults.length) * 100
      },
      results: this.testResults,
      timestamp: new Date().toISOString()
    };
  }
}

// 瀏覽器環境自動執行
if (typeof window !== 'undefined') {
  window.ComponentIntegrationSmokeTest = ComponentIntegrationSmokeTest;
  
  // 提供全域測試函數
  window.runComponentIntegrationTests = async function() {
    const tester = new ComponentIntegrationSmokeTest();
    return await tester.runAllTests();
  };
}

// Node.js 環境匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentIntegrationSmokeTest;
}