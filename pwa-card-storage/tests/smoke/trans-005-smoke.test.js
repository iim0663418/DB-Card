/**
 * TRANS-005 Smoke Test: 翻譯系統測試與驗證
 * 
 * 快速驗證翻譯系統整體功能是否正常運作
 * 
 * @version 1.0.0
 * @author PWA Translation System
 */

class TRANS005SmokeTest {
  constructor() {
    this.testResults = [];
    this.testName = 'TRANS-005: 翻譯系統測試與驗證';
    this.startTime = Date.now();
  }

  /**
   * 執行煙霧測試
   */
  async runSmokeTests() {
    console.log(`🧪 開始執行 ${this.testName} 煙霧測試...`);
    
    try {
      // 1. 系統可用性檢查
      await this.testSystemAvailability();
      
      // 2. 核心功能驗證
      await this.testCoreFunctionality();
      
      // 3. 錯誤處理驗證
      await this.testErrorHandling();
      
      // 4. 效能基準測試
      await this.testPerformanceBaseline();
      
      // 5. 整合測試套件可用性
      await this.testIntegrationSuiteAvailability();
      
      // 生成測試報告
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ TRANS-005 煙霧測試執行失敗:', error);
      this.addTestResult('煙霧測試執行', false, `執行失敗: ${error.message}`);
    }
  }

  /**
   * 測試 1: 系統可用性檢查
   */
  async testSystemAvailability() {
    console.log('🔍 測試 1: 系統可用性檢查');
    
    // 檢查所有 TRANS 組件是否可用
    const components = [
      { name: 'SafeTranslationHandler', obj: window.SafeTranslationHandler },
      { name: 'UnifiedTranslationService', obj: window.UnifiedTranslationService },
      { name: 'TRANSLATION_KEYS', obj: window.TRANSLATION_KEYS },
      { name: 'TranslationKeysValidator', obj: window.TranslationKeysValidator }
    ];
    
    let availableComponents = 0;
    components.forEach(({ name, obj }) => {
      const isAvailable = obj !== undefined && obj !== null;
      this.addTestResult(`${name} 可用性`, isAvailable, 
        isAvailable ? '組件可用' : '組件不可用');
      if (isAvailable) availableComponents++;
    });
    
    this.addTestResult('系統組件完整性', availableComponents === components.length,
      `${availableComponents}/${components.length} 個組件可用`);
  }

  /**
   * 測試 2: 核心功能驗證
   */
  async testCoreFunctionality() {
    console.log('⚙️ 測試 2: 核心功能驗證');
    
    // 測試翻譯功能
    if (window.SafeTranslationHandler) {
      const result = window.SafeTranslationHandler.getTranslation('cardDetails', 'zh');
      this.addTestResult('基本翻譯功能', 
        result && result !== 'cardDetails',
        `翻譯結果: ${result}`);
    }
    
    // 測試 UI 標籤功能
    if (window.app && typeof window.app.getUILabels === 'function') {
      const labels = window.app.getUILabels();
      const hasValidLabels = labels && Object.keys(labels).length > 0;
      this.addTestResult('UI 標籤功能', hasValidLabels,
        hasValidLabels ? `獲得 ${Object.keys(labels).length} 個標籤` : 'UI 標籤獲取失敗');
    }
    
    // 測試統一翻譯服務
    if (window.UnifiedTranslationService) {
      const result = window.UnifiedTranslationService.getText('home');
      this.addTestResult('統一翻譯服務', 
        result && result !== 'home',
        `統一服務結果: ${result}`);
    }
  }

  /**
   * 測試 3: 錯誤處理驗證
   */
  async testErrorHandling() {
    console.log('🛡️ 測試 3: 錯誤處理驗證');
    
    // 測試不存在的鍵值處理
    if (window.SafeTranslationHandler) {
      const result = window.SafeTranslationHandler.getTranslation('nonexistent.key.test', 'zh');
      this.addTestResult('不存在鍵值處理', 
        result && result !== 'nonexistent.key.test',
        `錯誤處理結果: ${result}`);
    }
    
    // 測試無效輸入處理
    if (window.TranslationKeysValidator) {
      const isValid = window.TranslationKeysValidator.validateKeyFormat('<script>');
      this.addTestResult('無效輸入處理', !isValid,
        isValid ? '安全檢查失敗' : '無效輸入被正確拒絕');
    }
  }

  /**
   * 測試 4: 效能基準測試
   */
  async testPerformanceBaseline() {
    console.log('⚡ 測試 4: 效能基準測試');
    
    if (window.SafeTranslationHandler) {
      const iterations = 100;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        window.SafeTranslationHandler.getTranslation('cardDetails', 'zh');
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      // 基準：平均每次翻譯應在 2ms 內完成
      const performanceOk = avgTime < 2;
      this.addTestResult('翻譯效能基準', performanceOk,
        `平均翻譯時間: ${avgTime.toFixed(3)}ms ${performanceOk ? '(符合基準)' : '(超出基準)'}`);
    }
  }

  /**
   * 測試 5: 整合測試套件可用性
   */
  async testIntegrationSuiteAvailability() {
    console.log('🔗 測試 5: 整合測試套件可用性');
    
    // 檢查整合測試類別是否可用
    const hasIntegrationTest = typeof TranslationSystemIntegrationTest !== 'undefined';
    this.addTestResult('整合測試套件', hasIntegrationTest,
      hasIntegrationTest ? '整合測試套件可用' : '整合測試套件不可用');
    
    // 檢查之前的煙霧測試結果
    const previousTests = ['TRANS001TestResults', 'TRANS002TestResults', 'TRANS003TestResults', 'TRANS004TestResults'];
    let availableResults = 0;
    
    previousTests.forEach(testResult => {
      if (window[testResult]) {
        availableResults++;
      }
    });
    
    this.addTestResult('之前測試結果', availableResults > 0,
      `${availableResults}/${previousTests.length} 個之前的測試結果可用`);
  }

  /**
   * 添加測試結果
   */
  addTestResult(testName, passed, details) {
    const result = {
      name: testName,
      passed: passed,
      details: details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${details}`);
  }

  /**
   * 生成測試報告
   */
  generateTestReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
    
    console.log('\n📊 TRANS-005 煙霧測試報告');
    console.log('='.repeat(50));
    console.log(`測試名稱: ${this.testName}`);
    console.log(`執行時間: ${duration}ms`);
    console.log(`總測試數: ${totalTests}`);
    console.log(`通過測試: ${passedTests}`);
    console.log(`失敗測試: ${failedTests}`);
    console.log(`成功率: ${successRate}%`);
    console.log('='.repeat(50));
    
    if (failedTests > 0) {
      console.log('\n❌ 失敗的測試:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  • ${result.name}: ${result.details}`);
        });
    }
    
    // 將結果存儲到全域變量供外部訪問
    window.TRANS005SmokeTestResults = {
      testName: this.testName,
      duration: duration,
      totalTests: totalTests,
      passedTests: passedTests,
      failedTests: failedTests,
      successRate: parseFloat(successRate),
      results: this.testResults,
      summary: {
        systemAvailability: this.testResults.filter(r => r.name.includes('可用性')).every(r => r.passed),
        coreFunctionality: this.testResults.filter(r => r.name.includes('功能')).every(r => r.passed),
        errorHandling: this.testResults.filter(r => r.name.includes('處理')).every(r => r.passed),
        performance: this.testResults.filter(r => r.name.includes('效能')).every(r => r.passed),
        integrationSuite: this.testResults.filter(r => r.name.includes('整合')).every(r => r.passed)
      }
    };
    
    const overallSuccess = failedTests === 0;
    console.log(`\n🎯 TRANS-005 煙霧測試結果: ${overallSuccess ? '✅ 通過' : '❌ 失敗'}`);
    
    return overallSuccess;
  }
}

// 自動執行測試（如果在瀏覽器環境中）
if (typeof window !== 'undefined') {
  const runTRANS005SmokeTest = () => {
    if (document.readyState === 'complete') {
      setTimeout(() => {
        const test = new TRANS005SmokeTest();
        test.runSmokeTests();
      }, 1500); // 給其他腳本載入時間
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const test = new TRANS005SmokeTest();
          test.runSmokeTests();
        }, 1500);
      });
    }
  };
  
  runTRANS005SmokeTest();
}

// 導出供 Node.js 環境使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TRANS005SmokeTest;
}