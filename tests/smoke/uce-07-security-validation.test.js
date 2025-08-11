/**
 * UCE-07 Smoke Test: 安全測試與驗證
 * 驗證 EncryptionSecurityTestSuite 核心功能
 * 
 * @version 3.2.2-user-controlled-encryption
 */

console.log('[UCE-07 Test] Starting security validation smoke tests...');

// 測試結果收集器
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * 測試工具函數
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function logTest(testName, result, error = null) {
  const status = result ? 'PASS' : 'FAIL';
  console.log(`[UCE-07 Test] ${testName}: ${status}`);
  
  if (result) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message });
      console.error(`[UCE-07 Test] Error in ${testName}:`, error.message);
    }
  }
}

async function runTest(testName, testFunction) {
  try {
    const startTime = performance.now();
    await testFunction();
    const duration = performance.now() - startTime;
    
    logTest(testName, true);
    console.log(`[UCE-07 Test] ${testName} completed in ${Math.round(duration)}ms`);
    return true;
  } catch (error) {
    logTest(testName, false, error);
    return false;
  }
}

/**
 * 載入 EncryptionSecurityTestSuite 類別
 */
function loadEncryptionSecurityTestSuite() {
  // 在 Node.js 環境中載入
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const classPath = path.join(__dirname, '../../pwa-card-storage/src/core/encryption-security-test-suite.ts');
      
      // 模擬瀏覽器環境
      global.window = {
        crypto: {
          subtle: {
            importKey: () => Promise.resolve({}),
            deriveKey: () => Promise.resolve({}),
            encrypt: () => Promise.resolve(new ArrayBuffer(32)),
            decrypt: () => Promise.resolve(new ArrayBuffer(16)),
            digest: () => Promise.resolve(new ArrayBuffer(32))
          },
          getRandomValues: (arr) => {
            for (let i = 0; i < arr.length; i++) {
              arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
          }
        },
        performance: global.performance || { now: () => Date.now() }
      };
      
      global.performance = global.performance || { now: () => Date.now() };
      
      // 讀取並執行 TypeScript 檔案（簡化版本）
      const classCode = fs.readFileSync(classPath, 'utf8');
      
      // 移除 TypeScript 語法並執行
      const jsCode = classCode
        .replace(/interface\s+\w+\s*{[^}]*}/g, '')
        .replace(/:\s*\w+(\[\])?/g, '')
        .replace(/export\s+/g, '')
        .replace(/private\s+/g, '')
        .replace(/public\s+/g, '')
        .replace(/\?\s*:/g, ':');
      
      eval(jsCode);
      
      return global.EncryptionSecurityTestSuite || EncryptionSecurityTestSuite;
      
    } catch (error) {
      console.error('[UCE-07 Test] Failed to load class:', error);
      return null;
    }
  } else {
    // 瀏覽器環境
    return window.EncryptionSecurityTestSuite;
  }
}

/**
 * 創建模擬 UserKeyManager
 */
function createMockUserKeyManager() {
  return {
    async generateDeterministicKey(phrases) {
      // 模擬金鑰生成時間
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      return {
        key: { type: 'mock-key' },
        keyId: 'test_key_' + Math.random().toString(36).substring(2, 8),
        salt: new Uint8Array(32)
      };
    },
    
    async setUserPassphrase(phrases) {
      return {
        success: true,
        keyId: 'test_key_123',
        entropy: 65
      };
    },
    
    async verifyUserPassphrase(phrases) {
      // 模擬失敗的驗證（用於測試鎖定機制）
      if (phrases.adjective === '錯誤') {
        return {
          success: false,
          error: phrases.adjective === '錯誤' && this.failCount >= 3 ? 'Account locked' : 'Invalid passphrase',
          remainingAttempts: Math.max(0, 3 - (this.failCount || 0))
        };
      }
      return { success: true, keyId: 'test_key_123' };
    },
    
    validatePassphraseStructure(phrases) {
      if (!phrases.adjective || phrases.adjective.length < 2) {
        return { valid: false, entropy: 0 };
      }
      return { 
        valid: true, 
        entropy: phrases.adjective === 'a' ? 10 : 65 // 模擬弱密碼
      };
    },
    
    async clearMemory() {
      this.hasActiveKey = false;
      this.cacheSize = 0;
    },
    
    getStatus() {
      return {
        hasActiveKey: this.hasActiveKey !== false,
        cacheSize: this.cacheSize || 0
      };
    },
    
    failCount: 0
  };
}

/**
 * 創建模擬 KeyRecoveryManager
 */
function createMockKeyRecoveryManager() {
  return {
    async triggerRecovery(reason) {
      return {
        recoveryId: 'recovery_' + Date.now(),
        hints: ['請確認您的三短語組合是否正確', '檢查是否有大小寫或拼寫錯誤']
      };
    },
    
    async performHealthCheck() {
      return {
        keyIntegrity: true,
        dataIntegrity: true,
        recommendations: []
      };
    }
  };
}

/**
 * 測試 1: 類別載入與初始化
 */
async function testClassLoading() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  assert(typeof EncryptionSecurityTestSuite === 'function', 'EncryptionSecurityTestSuite class should be available');
  
  const testSuite = new EncryptionSecurityTestSuite();
  assert(testSuite instanceof EncryptionSecurityTestSuite, 'Should create EncryptionSecurityTestSuite instance');
  assert(typeof testSuite.runFullSecuritySuite === 'function', 'Should have runFullSecuritySuite method');
  assert(typeof testSuite.getTestResults === 'function', 'Should have getTestResults method');
  assert(typeof testSuite.getThreatModelStatus === 'function', 'Should have getThreatModelStatus method');
  assert(typeof testSuite.generateSecurityReport === 'function', 'Should have generateSecurityReport method');
}

/**
 * 測試 2: 威脅模型初始化
 */
async function testThreatModelInitialization() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  const testSuite = new EncryptionSecurityTestSuite();
  
  const threatModels = testSuite.getThreatModelStatus();
  assert(Array.isArray(threatModels), 'Should return array of threat models');
  assert(threatModels.length === 5, 'Should have 5 threat models (T001-T005)');
  
  // 檢查威脅模型結構
  const t001 = threatModels.find(t => t.id === 'T001');
  assert(t001, 'Should have T001 threat model');
  assert(t001.category === 'T001', 'T001 should have correct category');
  assert(t001.description.includes('PBKDF2'), 'T001 should describe PBKDF2 timing attacks');
  assert(t001.severity === 'High', 'T001 should have High severity');
  assert(t001.mitigated === false, 'T001 should initially be unmitigated');
}

/**
 * 測試 3: 配置選項
 */
async function testConfigurationOptions() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  
  // 測試預設配置
  const defaultSuite = new EncryptionSecurityTestSuite();
  assert(defaultSuite.config, 'Should have default configuration');
  
  // 測試自訂配置
  const customConfig = {
    enableTimingAttacks: false,
    enableMemoryLeakage: true,
    enableBruteForce: false,
    enableOWASPTop10: true
  };
  
  const customSuite = new EncryptionSecurityTestSuite(customConfig);
  assert(customSuite.config.enableTimingAttacks === false, 'Should apply custom timing attacks setting');
  assert(customSuite.config.enableMemoryLeakage === true, 'Should apply custom memory leakage setting');
  assert(customSuite.config.enableBruteForce === false, 'Should apply custom brute force setting');
  assert(customSuite.config.enableOWASPTop10 === true, 'Should apply custom OWASP setting');
}

/**
 * 測試 4: 基本安全測試執行
 */
async function testBasicSecurityTesting() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  const testSuite = new EncryptionSecurityTestSuite();
  
  const mockUserKeyManager = createMockUserKeyManager();
  const mockKeyRecoveryManager = createMockKeyRecoveryManager();
  
  // 執行安全測試套件
  const result = await testSuite.runFullSecuritySuite(mockUserKeyManager, mockKeyRecoveryManager);
  
  // 檢查結果結構
  assert(typeof result === 'object', 'Should return result object');
  assert(['PASS', 'FAIL'].includes(result.overallResult), 'Should have valid overall result');
  assert(typeof result.totalTests === 'number', 'Should have total tests count');
  assert(typeof result.passedTests === 'number', 'Should have passed tests count');
  assert(typeof result.failedTests === 'number', 'Should have failed tests count');
  assert(typeof result.criticalIssues === 'number', 'Should have critical issues count');
  assert(Array.isArray(result.testResults), 'Should have test results array');
  assert(Array.isArray(result.threatModelStatus), 'Should have threat model status array');
  
  // 檢查測試結果
  assert(result.totalTests > 0, 'Should have executed some tests');
  assert(result.passedTests + result.failedTests === result.totalTests, 'Passed + failed should equal total');
}

/**
 * 測試 5: 測試結果結構
 */
async function testResultStructure() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  const testSuite = new EncryptionSecurityTestSuite();
  
  const mockUserKeyManager = createMockUserKeyManager();
  
  // 執行部分測試
  await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
  
  const testResults = testSuite.getTestResults();
  assert(Array.isArray(testResults), 'Should return array of test results');
  
  if (testResults.length > 0) {
    const firstResult = testResults[0];
    assert(typeof firstResult.testId === 'string', 'Test result should have testId');
    assert(typeof firstResult.testName === 'string', 'Test result should have testName');
    assert(typeof firstResult.passed === 'boolean', 'Test result should have passed boolean');
    assert(typeof firstResult.details === 'string', 'Test result should have details');
    assert(typeof firstResult.timestamp === 'number', 'Test result should have timestamp');
    assert(['Info', 'Low', 'Medium', 'High', 'Critical'].includes(firstResult.severity), 
      'Test result should have valid severity');
  }
}

/**
 * 測試 6: 安全報告生成
 */
async function testSecurityReportGeneration() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  const testSuite = new EncryptionSecurityTestSuite();
  
  const mockUserKeyManager = createMockUserKeyManager();
  
  // 執行測試
  await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
  
  // 生成報告
  const report = testSuite.generateSecurityReport();
  assert(typeof report === 'string', 'Should return string report');
  assert(report.includes('Security Test Report'), 'Should include report title');
  assert(report.includes('Total Tests:'), 'Should include total tests count');
  assert(report.includes('Passed:'), 'Should include passed tests count');
  assert(report.includes('Failed:'), 'Should include failed tests count');
  assert(report.includes('Critical Issues:'), 'Should include critical issues count');
  assert(report.includes('Overall Status:'), 'Should include overall status');
}

/**
 * 測試 7: 錯誤處理
 */
async function testErrorHandling() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  const testSuite = new EncryptionSecurityTestSuite();
  
  // 測試空參數
  const result = await testSuite.runFullSecuritySuite(null, null);
  assert(result.overallResult === 'FAIL', 'Should fail with null parameters');
  assert(result.criticalIssues > 0, 'Should report critical issues for null parameters');
  
  // 測試無效 UserKeyManager
  const invalidManager = {};
  const result2 = await testSuite.runFullSecuritySuite(invalidManager, null);
  assert(result2.overallResult === 'FAIL', 'Should fail with invalid manager');
}

/**
 * 測試 8: 效能測試
 */
async function testPerformance() {
  const EncryptionSecurityTestSuite = loadEncryptionSecurityTestSuite();
  const testSuite = new EncryptionSecurityTestSuite();
  
  const mockUserKeyManager = createMockUserKeyManager();
  
  // 測試執行時間
  const startTime = performance.now();
  await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // 安全測試應該在合理時間內完成（< 10 秒）
  assert(duration < 10000, `Security testing should complete in <10s, actual: ${duration.toFixed(0)}ms`);
  
  // 測試報告生成效能
  const reportStartTime = performance.now();
  testSuite.generateSecurityReport();
  const reportEndTime = performance.now();
  const reportDuration = reportEndTime - reportStartTime;
  
  assert(reportDuration < 100, `Report generation should be <100ms, actual: ${reportDuration.toFixed(2)}ms`);
}

/**
 * 執行所有測試
 */
async function runAllTests() {
  console.log('[UCE-07 Test] Starting comprehensive security validation tests...');
  
  const tests = [
    ['Class Loading & Initialization', testClassLoading],
    ['Threat Model Initialization', testThreatModelInitialization],
    ['Configuration Options', testConfigurationOptions],
    ['Basic Security Testing', testBasicSecurityTesting],
    ['Test Result Structure', testResultStructure],
    ['Security Report Generation', testSecurityReportGeneration],
    ['Error Handling', testErrorHandling],
    ['Performance', testPerformance]
  ];
  
  const startTime = performance.now();
  
  for (const [testName, testFunction] of tests) {
    await runTest(testName, testFunction);
  }
  
  const totalTime = performance.now() - startTime;
  
  // 輸出測試結果
  console.log('\n[UCE-07 Test] ===== TEST SUMMARY =====');
  console.log(`[UCE-07 Test] Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`[UCE-07 Test] Passed: ${testResults.passed}`);
  console.log(`[UCE-07 Test] Failed: ${testResults.failed}`);
  console.log(`[UCE-07 Test] Total Time: ${Math.round(totalTime)}ms`);
  
  if (testResults.errors.length > 0) {
    console.log('\n[UCE-07 Test] ===== ERRORS =====');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`[UCE-07 Test] ${test}: ${error}`);
    });
  }
  
  const success = testResults.failed === 0;
  console.log(`\n[UCE-07 Test] Overall Result: ${success ? 'PASS' : 'FAIL'}`);
  
  return {
    success,
    passed: testResults.passed,
    failed: testResults.failed,
    totalTime: Math.round(totalTime),
    errors: testResults.errors
  };
}

// 自動執行測試
if (typeof window !== 'undefined') {
  // 瀏覽器環境
  if (typeof EncryptionSecurityTestSuite !== 'undefined') {
    runAllTests().then(result => {
      window.UCE07TestResult = result;
    });
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        runAllTests().then(result => {
          window.UCE07TestResult = result;
        });
      }, 1000);
    });
  }
} else {
  // Node.js 環境
  if (require.main === module) {
    runAllTests().then(result => {
      process.exit(result.success ? 0 : 1);
    });
  }
}

// Node.js 環境匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testResults };
}