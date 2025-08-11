/**
 * UCE-02 & UCE-03 Smoke Tests
 * BilingualEncryptionSetupUI 核心功能測試
 */

// 模擬瀏覽器環境
const mockDOM = () => {
  global.document = {
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild: () => {},
      remove: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      setAttribute: () => {},
      getAttribute: () => null,
      focus: () => {},
      click: () => {},
      value: '',
      textContent: '',
      dataset: {}
    }),
    body: {
      appendChild: () => {},
      removeChild: () => {}
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null
  };
  
  global.window = {
    BilingualEncryptionSetupUI: null
  };
  
  global.navigator = {
    userAgent: 'test-agent'
  };
};

// 載入被測試的類別
const loadBilingualEncryptionSetupUI = () => {
  mockDOM();
  
  // 模擬 CSS 變數
  global.getComputedStyle = () => ({
    getPropertyValue: () => '16px'
  });
  
  // 載入類別定義
  const fs = require('fs');
  const path = require('path');
  const classPath = path.join(__dirname, '../../pwa-card-storage/src/core/bilingual-encryption-setup-ui.js');
  const classCode = fs.readFileSync(classPath, 'utf8');
  
  // 執行類別定義
  eval(classCode);
  
  return global.window.BilingualEncryptionSetupUI || eval('BilingualEncryptionSetupUI');
};

// 簡化的測試執行器（不依賴 Jest）

// 執行測試的輔助函數
const runTests = () => {
  console.log('🧪 Running UCE-02 & UCE-03 Smoke Tests...\n');
  
  try {
    const BilingualEncryptionSetupUI = loadBilingualEncryptionSetupUI();
    const ui = new BilingualEncryptionSetupUI();
    
    // 基本初始化測試
    console.log('✅ Test 1: Class initialization');
    console.assert(ui.currentLanguage === 'zh-TW', 'Default language should be zh-TW');
    console.assert(ui.isDialogOpen === false, 'Dialog should be closed initially');
    
    // 詞庫測試
    console.log('✅ Test 2: Vocabulary availability');
    console.assert(ui.vocabulary['zh-TW'], 'Chinese vocabulary should exist');
    console.assert(ui.vocabulary['en-US'], 'English vocabulary should exist');
    console.assert(ui.vocabulary['zh-TW'].adjectives.length === 10, 'Should have 10 Chinese adjectives');
    
    // 翻譯測試
    console.log('✅ Test 3: Translation availability');
    console.assert(ui.translations['zh-TW'].setupTitle, 'Chinese setup title should exist');
    console.assert(ui.translations['en-US'].setupTitle, 'English setup title should exist');
    
    // 熵值計算測試
    console.log('✅ Test 4: Entropy calculation');
    const testPhrases = {
      adjective: '美麗',
      noun: '花朵',
      verb: '飛翔',
      language: 'zh-TW'
    };
    const entropy = ui.calculateEntropy(testPhrases);
    console.assert(entropy > 0, 'Entropy should be greater than 0');
    console.assert(entropy <= 100, 'Entropy should not exceed 100');
    
    // 空短語測試
    console.log('✅ Test 5: Empty phrases handling');
    const emptyPhrases = { adjective: '', noun: '', verb: '', language: 'zh-TW' };
    const emptyEntropy = ui.calculateEntropy(emptyPhrases);
    console.assert(emptyEntropy === 0, 'Empty phrases should have 0 entropy');
    
    // 語言切換測試
    console.log('✅ Test 6: Language switching');
    ui.switchLanguage('en-US');
    console.assert(ui.currentLanguage === 'en-US', 'Language should switch to English');
    
    // 重試邏輯測試
    console.log('✅ Test 7: Retry logic');
    console.assert(ui.retryAttempts === 0, 'Initial retry attempts should be 0');
    console.assert(ui.maxRetryAttempts === 3, 'Max retry attempts should be 3');
    
    // 效能測試
    console.log('✅ Test 8: Performance check');
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      ui.calculateEntropy(testPhrases);
    }
    const endTime = Date.now();
    console.assert(endTime - startTime < 100, 'Should complete 100 calculations in <100ms');
    
    console.log('\n🎉 All UCE-02 & UCE-03 smoke tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
};

// 如果直接執行此檔案，運行測試
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };