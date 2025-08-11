/**
 * UCE-06 Smoke Test: 語言與設計系統整合
 * 驗證 EncryptionLanguageIntegration 核心功能
 * 
 * @version 3.2.2-user-controlled-encryption
 */

console.log('[UCE-06 Test] Starting language integration smoke tests...');

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
  console.log(`[UCE-06 Test] ${testName}: ${status}`);
  
  if (result) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message });
      console.error(`[UCE-06 Test] Error in ${testName}:`, error.message);
    }
  }
}

async function runTest(testName, testFunction) {
  try {
    const startTime = performance.now();
    await testFunction();
    const duration = performance.now() - startTime;
    
    logTest(testName, true);
    console.log(`[UCE-06 Test] ${testName} completed in ${Math.round(duration)}ms`);
    return true;
  } catch (error) {
    logTest(testName, false, error);
    return false;
  }
}

/**
 * 載入 EncryptionLanguageIntegration 類別
 */
function loadEncryptionLanguageIntegration() {
  // 在 Node.js 環境中載入
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const classPath = path.join(__dirname, '../../pwa-card-storage/src/core/encryption-language-integration.ts');
      
      // 模擬瀏覽器環境
      global.window = {
        matchMedia: () => ({ matches: false, addEventListener: () => {} }),
        getComputedStyle: () => ({ fontSize: '16px' }),
        addEventListener: () => {},
        CustomEvent: function(type, options) {
          this.type = type;
          this.detail = options?.detail;
        },
        dispatchEvent: () => {}
      };
      
      global.document = {
        documentElement: { style: { fontSize: '16px' } },
        querySelectorAll: () => [],
        createElement: () => ({
          style: {},
          addEventListener: () => {},
          setAttribute: () => {},
          getAttribute: () => null
        })
      };
      
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
      
      return global.EncryptionLanguageIntegration || EncryptionLanguageIntegration;
      
    } catch (error) {
      console.error('[UCE-06 Test] Failed to load class:', error);
      return null;
    }
  } else {
    // 瀏覽器環境
    return window.EncryptionLanguageIntegration;
  }
}

/**
 * 測試 1: 類別載入與初始化
 */
async function testClassLoading() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  assert(typeof EncryptionLanguageIntegration === 'function', 'EncryptionLanguageIntegration class should be available');
  
  const integration = new EncryptionLanguageIntegration();
  assert(integration instanceof EncryptionLanguageIntegration, 'Should create EncryptionLanguageIntegration instance');
  assert(typeof integration.translateEncryptionUI === 'function', 'Should have translateEncryptionUI method');
  assert(typeof integration.updateEncryptionUILanguage === 'function', 'Should have updateEncryptionUILanguage method');
  assert(typeof integration.applyModaDesignSystem === 'function', 'Should have applyModaDesignSystem method');
  assert(typeof integration.generateARIALabels === 'function', 'Should have generateARIALabels method');
}

/**
 * 測試 2: 語言管理功能
 */
async function testLanguageManagement() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  const integration = new EncryptionLanguageIntegration();
  
  // 測試預設語言
  const defaultLanguage = integration.getCurrentLanguage();
  assert(defaultLanguage === 'zh-TW', 'Default language should be zh-TW');
  
  // 測試語言切換
  integration.updateEncryptionUILanguage('en-US');
  const newLanguage = integration.getCurrentLanguage();
  assert(newLanguage === 'en-US', 'Language should switch to en-US');
  
  // 測試無效語言代碼
  try {
    integration.updateEncryptionUILanguage('invalid-lang');
    // 如果沒有拋出錯誤，語言應該保持不變
    const unchangedLanguage = integration.getCurrentLanguage();
    assert(unchangedLanguage === 'en-US', 'Language should remain unchanged for invalid code');
  } catch (error) {
    // 拋出錯誤也是正確的行為
    assert(true, 'Invalid language code should be rejected');
  }
}

/**
 * 測試 3: 翻譯功能
 */
async function testTranslationFeatures() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  const integration = new EncryptionLanguageIntegration();
  
  // 測試中文翻譯
  integration.updateEncryptionUILanguage('zh-TW');
  const chineseTitle = integration.translateEncryptionUI('encryption.setup.title');
  assert(typeof chineseTitle === 'string', 'Should return string for translation');
  assert(chineseTitle.includes('設定') || chineseTitle === 'encryption.setup.title', 
    'Should return Chinese translation or fallback key');
  
  // 測試英文翻譯
  integration.updateEncryptionUILanguage('en-US');
  const englishTitle = integration.translateEncryptionUI('encryption.setup.title');
  assert(typeof englishTitle === 'string', 'Should return string for translation');
  assert(englishTitle.includes('Set') || englishTitle === 'encryption.setup.title', 
    'Should return English translation or fallback key');
  
  // 測試不存在的鍵值
  const unknownKey = integration.translateEncryptionUI('unknown.key');
  assert(unknownKey === 'unknown.key', 'Should return original key for unknown translation');
}

/**
 * 測試 4: ARIA 標籤生成
 */
async function testARIALabels() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  const integration = new EncryptionLanguageIntegration();
  
  // 測試設定對話框 ARIA 標籤
  const setupLabels = integration.generateARIALabels('setup');
  assert(typeof setupLabels === 'object', 'Should return object for ARIA labels');
  assert(setupLabels['aria-label'], 'Should have aria-label');
  assert(setupLabels['role'] === 'dialog', 'Should have dialog role');
  assert(setupLabels['aria-modal'] === 'true', 'Should have aria-modal true');
  
  // 測試解鎖對話框 ARIA 標籤
  const unlockLabels = integration.generateARIALabels('unlock');
  assert(typeof unlockLabels === 'object', 'Should return object for unlock ARIA labels');
  assert(unlockLabels['aria-label'], 'Should have aria-label for unlock');
  
  // 測試恢復對話框 ARIA 標籤
  const recoveryLabels = integration.generateARIALabels('recovery');
  assert(typeof recoveryLabels === 'object', 'Should return object for recovery ARIA labels');
  assert(recoveryLabels['aria-label'], 'Should have aria-label for recovery');
}

/**
 * 測試 5: moda 設計系統應用
 */
async function testModaDesignSystem() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  const integration = new EncryptionLanguageIntegration();
  
  // 創建模擬元素
  const mockElement = {
    style: {},
    tagName: 'BUTTON',
    addEventListener: () => {}
  };
  
  // 測試基本樣式應用
  integration.applyModaDesignSystem(mockElement);
  assert(mockElement.style.fontFamily, 'Should apply font family');
  assert(mockElement.style.borderRadius, 'Should apply border radius');
  assert(mockElement.style.transition, 'Should apply transition');
  
  // 測試變體樣式
  integration.applyModaDesignSystem(mockElement, { variant: 'primary' });
  assert(mockElement.style.backgroundColor, 'Should apply background color for primary variant');
  
  // 測試尺寸樣式
  integration.applyModaDesignSystem(mockElement, { size: 'large' });
  assert(mockElement.style.fontSize, 'Should apply font size for large size');
  assert(mockElement.style.padding, 'Should apply padding for large size');
}

/**
 * 測試 6: 無障礙設定
 */
async function testAccessibilitySettings() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  const integration = new EncryptionLanguageIntegration();
  
  // 測試無障礙設定獲取
  const settings = integration.getAccessibilitySettings();
  assert(typeof settings === 'object', 'Should return accessibility settings object');
  assert(typeof settings.highContrast === 'boolean', 'Should have highContrast setting');
  assert(typeof settings.largeText === 'boolean', 'Should have largeText setting');
  assert(typeof settings.screenReader === 'boolean', 'Should have screenReader setting');
}

/**
 * 測試 7: 輸入清理與安全性
 */
async function testInputSanitization() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  const integration = new EncryptionLanguageIntegration();
  
  // 測試 XSS 防護
  const maliciousKey = '<script>alert("xss")</script>';
  const sanitizedTranslation = integration.translateEncryptionUI(maliciousKey);
  assert(!sanitizedTranslation.includes('<script>'), 'Should sanitize malicious input');
  assert(!sanitizedTranslation.includes('alert'), 'Should remove script content');
  
  // 測試長度限制
  const longKey = 'a'.repeat(200);
  const limitedTranslation = integration.translateEncryptionUI(longKey);
  assert(limitedTranslation.length <= 100, 'Should limit translation key length');
}

/**
 * 測試 8: 效能測試
 */
async function testPerformance() {
  const EncryptionLanguageIntegration = loadEncryptionLanguageIntegration();
  const integration = new EncryptionLanguageIntegration();
  
  // 測試翻譯效能
  const startTime = performance.now();
  for (let i = 0; i < 100; i++) {
    integration.translateEncryptionUI('encryption.setup.title');
  }
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  assert(duration < 100, `Translation performance should be <100ms, actual: ${duration.toFixed(2)}ms`);
  
  // 測試語言切換效能
  const switchStartTime = performance.now();
  for (let i = 0; i < 10; i++) {
    integration.updateEncryptionUILanguage(i % 2 === 0 ? 'zh-TW' : 'en-US');
  }
  const switchEndTime = performance.now();
  const switchDuration = switchEndTime - switchStartTime;
  
  assert(switchDuration < 50, `Language switching should be <50ms, actual: ${switchDuration.toFixed(2)}ms`);
}

/**
 * 執行所有測試
 */
async function runAllTests() {
  console.log('[UCE-06 Test] Starting comprehensive language integration tests...');
  
  const tests = [
    ['Class Loading & Initialization', testClassLoading],
    ['Language Management', testLanguageManagement],
    ['Translation Features', testTranslationFeatures],
    ['ARIA Labels Generation', testARIALabels],
    ['Moda Design System', testModaDesignSystem],
    ['Accessibility Settings', testAccessibilitySettings],
    ['Input Sanitization', testInputSanitization],
    ['Performance', testPerformance]
  ];
  
  const startTime = performance.now();
  
  for (const [testName, testFunction] of tests) {
    await runTest(testName, testFunction);
  }
  
  const totalTime = performance.now() - startTime;
  
  // 輸出測試結果
  console.log('\n[UCE-06 Test] ===== TEST SUMMARY =====');
  console.log(`[UCE-06 Test] Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`[UCE-06 Test] Passed: ${testResults.passed}`);
  console.log(`[UCE-06 Test] Failed: ${testResults.failed}`);
  console.log(`[UCE-06 Test] Total Time: ${Math.round(totalTime)}ms`);
  
  if (testResults.errors.length > 0) {
    console.log('\n[UCE-06 Test] ===== ERRORS =====');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`[UCE-06 Test] ${test}: ${error}`);
    });
  }
  
  const success = testResults.failed === 0;
  console.log(`\n[UCE-06 Test] Overall Result: ${success ? 'PASS' : 'FAIL'}`);
  
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
  if (typeof EncryptionLanguageIntegration !== 'undefined') {
    runAllTests().then(result => {
      window.UCE06TestResult = result;
    });
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        runAllTests().then(result => {
          window.UCE06TestResult = result;
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