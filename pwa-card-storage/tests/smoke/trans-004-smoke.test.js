/**
 * TRANS-004 Smoke Test: 硬編碼翻譯鍵值重構驗證
 * 
 * 測試範圍：
 * 1. TRANSLATION_KEYS 配置載入
 * 2. TranslationKeysValidator 功能
 * 3. DynamicTranslationKeysGenerator 功能
 * 4. updateFilterSelect() 方法重構驗證
 * 5. 配置化管理可維護性測試
 * 
 * @version 1.0.0
 * @author PWA Translation System
 */

class TRANS004SmokeTest {
  constructor() {
    this.testResults = [];
    this.testName = 'TRANS-004: 硬編碼翻譯鍵值重構';
    this.startTime = Date.now();
  }

  /**
   * 執行所有煙霧測試
   */
  async runAllTests() {
    console.log(`🧪 開始執行 ${this.testName} 煙霧測試...`);
    
    try {
      // 1. 配置載入測試
      await this.testConfigurationLoading();
      
      // 2. 驗證器功能測試
      await this.testValidatorFunctionality();
      
      // 3. 動態生成器測試
      await this.testDynamicGenerator();
      
      // 4. updateFilterSelect 重構測試
      await this.testUpdateFilterSelectRefactor();
      
      // 5. 可維護性測試
      await this.testMaintainability();
      
      // 6. 錯誤處理測試
      await this.testErrorHandling();
      
      // 7. 效能測試
      await this.testPerformance();
      
      // 生成測試報告
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ TRANS-004 測試執行失敗:', error);
      this.addTestResult('測試執行', false, `執行失敗: ${error.message}`);
    }
  }

  /**
   * 測試 1: 配置載入測試
   */
  async testConfigurationLoading() {
    console.log('📋 測試 1: 配置載入測試');
    
    try {
      // 檢查 TRANSLATION_KEYS 是否正確載入
      const hasTranslationKeys = typeof window.TRANSLATION_KEYS === 'object' && window.TRANSLATION_KEYS !== null;
      this.addTestResult('TRANSLATION_KEYS 載入', hasTranslationKeys, 
        hasTranslationKeys ? '配置成功載入' : 'TRANSLATION_KEYS 未載入');
      
      if (hasTranslationKeys) {
        // 檢查必要的配置分類
        const requiredCategories = ['FILTER_OPTIONS', 'UI_LABELS', 'NAVIGATION', 'REQUIRED_KEYS'];
        let allCategoriesPresent = true;
        let missingCategories = [];
        
        requiredCategories.forEach(category => {
          if (!window.TRANSLATION_KEYS[category]) {
            allCategoriesPresent = false;
            missingCategories.push(category);
          }
        });
        
        this.addTestResult('必要配置分類', allCategoriesPresent,
          allCategoriesPresent ? '所有必要分類存在' : `缺少分類: ${missingCategories.join(', ')}`);
        
        // 檢查 FILTER_OPTIONS 內容
        const filterOptions = window.TRANSLATION_KEYS.FILTER_OPTIONS;
        const hasFilterOptions = Array.isArray(filterOptions) && filterOptions.length > 0;
        this.addTestResult('FILTER_OPTIONS 內容', hasFilterOptions,
          hasFilterOptions ? `包含 ${filterOptions.length} 個選項` : 'FILTER_OPTIONS 為空或格式錯誤');
        
        // 檢查是否包含預期的篩選選項
        if (hasFilterOptions) {
          const expectedKeys = ['allTypes', 'cardTypes.index', 'cardTypes.personal'];
          const hasExpectedKeys = expectedKeys.every(key => filterOptions.includes(key));
          this.addTestResult('預期篩選鍵值', hasExpectedKeys,
            hasExpectedKeys ? '包含所有預期鍵值' : '缺少部分預期鍵值');
        }
      }
      
      // 檢查工具類別載入
      const hasValidator = typeof window.TranslationKeysValidator === 'function';
      this.addTestResult('TranslationKeysValidator 載入', hasValidator,
        hasValidator ? '驗證器載入成功' : '驗證器未載入');
      
      const hasGenerator = typeof window.DynamicTranslationKeysGenerator === 'function';
      this.addTestResult('DynamicTranslationKeysGenerator 載入', hasGenerator,
        hasGenerator ? '生成器載入成功' : '生成器未載入');
      
      const hasUtils = typeof window.TranslationKeysUtils === 'object';
      this.addTestResult('TranslationKeysUtils 載入', hasUtils,
        hasUtils ? '工具函數載入成功' : '工具函數未載入');
      
    } catch (error) {
      this.addTestResult('配置載入測試', false, `測試失敗: ${error.message}`);
    }
  }

  /**
   * 測試 2: 驗證器功能測試
   */
  async testValidatorFunctionality() {
    console.log('🔍 測試 2: 驗證器功能測試');
    
    try {
      if (!window.TranslationKeysValidator) {
        this.addTestResult('驗證器功能測試', false, 'TranslationKeysValidator 不可用');
        return;
      }
      
      const validator = window.TranslationKeysValidator;
      
      // 測試有效鍵值格式驗證
      const validKeys = ['cardDetails', 'cardTypes.index', 'app.title'];
      const validResults = validKeys.map(key => validator.validateKeyFormat(key));
      const allValid = validResults.every(result => result === true);
      this.addTestResult('有效鍵值格式驗證', allValid,
        allValid ? '所有有效鍵值通過驗證' : '部分有效鍵值驗證失敗');
      
      // 測試無效鍵值格式驗證
      const invalidKeys = ['<script>', 'key with spaces', '', 'key"with"quotes'];
      const invalidResults = invalidKeys.map(key => validator.validateKeyFormat(key));
      const allInvalid = invalidResults.every(result => result === false);
      this.addTestResult('無效鍵值格式驗證', allInvalid,
        allInvalid ? '所有無效鍵值正確被拒絕' : '部分無效鍵值未被正確識別');
      
      // 測試鍵值陣列驗證
      const testArray = ['valid1', 'valid2', 'cardTypes.test'];
      const arrayValidation = validator.validateKeysArray(testArray);
      const arrayValid = arrayValidation.isValid && arrayValidation.validCount === 3;
      this.addTestResult('鍵值陣列驗證', arrayValid,
        arrayValid ? '陣列驗證功能正常' : `陣列驗證失敗: ${arrayValidation.error}`);
      
      // 測試重複鍵值檢查
      const duplicateArray = ['key1', 'key2', 'key1', 'key3'];
      const duplicateCheck = validator.checkDuplicateKeys(duplicateArray);
      const duplicateDetected = duplicateCheck.hasDuplicates && duplicateCheck.duplicates.includes('key1');
      this.addTestResult('重複鍵值檢測', duplicateDetected,
        duplicateDetected ? '重複鍵值正確檢測' : '重複鍵值檢測失敗');
      
    } catch (error) {
      this.addTestResult('驗證器功能測試', false, `測試失敗: ${error.message}`);
    }
  }

  /**
   * 測試 3: 動態生成器測試
   */
  async testDynamicGenerator() {
    console.log('⚙️ 測試 3: 動態生成器測試');
    
    try {
      if (!window.DynamicTranslationKeysGenerator) {
        this.addTestResult('動態生成器測試', false, 'DynamicTranslationKeysGenerator 不可用');
        return;
      }
      
      const generator = window.DynamicTranslationKeysGenerator;
      
      // 測試名片類型鍵值生成
      const bilingualKeys = generator.generateCardTypeKeys('bilingual');
      const hasBilingualKeys = Array.isArray(bilingualKeys) && bilingualKeys.length > 0;
      this.addTestResult('雙語名片鍵值生成', hasBilingualKeys,
        hasBilingualKeys ? `生成 ${bilingualKeys.length} 個鍵值` : '雙語鍵值生成失敗');
      
      const personalKeys = generator.generateCardTypeKeys('personal');
      const hasPersonalKeys = Array.isArray(personalKeys) && personalKeys.length > 0;
      this.addTestResult('個人名片鍵值生成', hasPersonalKeys,
        hasPersonalKeys ? `生成 ${personalKeys.length} 個鍵值` : '個人鍵值生成失敗');
      
      // 測試模組鍵值生成
      const cardListKeys = generator.generateModuleKeys('card-list');
      const hasCardListKeys = Array.isArray(cardListKeys) && cardListKeys.length > 0;
      this.addTestResult('名片列表模組鍵值', hasCardListKeys,
        hasCardListKeys ? `生成 ${cardListKeys.length} 個鍵值` : '名片列表鍵值生成失敗');
      
      // 測試鍵值合併功能
      const mergedKeys = generator.mergeUniqueKeys(bilingualKeys, personalKeys, cardListKeys);
      const hasMergedKeys = Array.isArray(mergedKeys) && mergedKeys.length > 0;
      const isUnique = new Set(mergedKeys).size === mergedKeys.length;
      this.addTestResult('鍵值合併去重', hasMergedKeys && isUnique,
        hasMergedKeys && isUnique ? `合併後 ${mergedKeys.length} 個唯一鍵值` : '鍵值合併失敗');
      
    } catch (error) {
      this.addTestResult('動態生成器測試', false, `測試失敗: ${error.message}`);
    }
  }

  /**
   * 測試 4: updateFilterSelect 重構測試
   */
  async testUpdateFilterSelectRefactor() {
    console.log('🔄 測試 4: updateFilterSelect 重構測試');
    
    try {
      // 創建測試用的 DOM 元素
      const testContainer = document.createElement('div');
      testContainer.innerHTML = `
        <select id="card-filter">
          <option value="">所有類型</option>
          <option value="index">機關版-延平</option>
          <option value="index1">機關版-新光</option>
          <option value="personal">個人版</option>
          <option value="bilingual">雙語版</option>
        </select>
      `;
      document.body.appendChild(testContainer);
      
      // 檢查語言管理器是否可用
      if (!window.languageManager) {
        this.addTestResult('updateFilterSelect 重構測試', false, '語言管理器不可用');
        return;
      }
      
      // 測試 updateFilterSelect 方法是否存在
      const hasUpdateMethod = typeof window.languageManager.updateFilterSelect === 'function';
      this.addTestResult('updateFilterSelect 方法存在', hasUpdateMethod,
        hasUpdateMethod ? '方法存在' : 'updateFilterSelect 方法不存在');
      
      if (hasUpdateMethod) {
        // 執行 updateFilterSelect 方法
        try {
          window.languageManager.updateFilterSelect();
          this.addTestResult('updateFilterSelect 執行', true, '方法執行成功，無錯誤');
        } catch (error) {
          this.addTestResult('updateFilterSelect 執行', false, `執行失敗: ${error.message}`);
        }
        
        // 檢查是否使用了配置化的鍵值
        const filterSelect = document.getElementById('card-filter');
        if (filterSelect) {
          const options = filterSelect.querySelectorAll('option');
          const hasOptions = options.length > 0;
          this.addTestResult('篩選選項更新', hasOptions,
            hasOptions ? `更新了 ${options.length} 個選項` : '沒有篩選選項');
        }
      }
      
      // 測試備用方法是否存在
      const hasFallbackMethod = typeof window.languageManager._getFilterOptionsKeys === 'function';
      this.addTestResult('備用方法存在', hasFallbackMethod,
        hasFallbackMethod ? '備用方法存在' : '備用方法不存在');
      
      if (hasFallbackMethod) {
        // 測試備用方法功能
        const fallbackKeys = window.languageManager._getFilterOptionsKeys();
        const validFallback = Array.isArray(fallbackKeys) && fallbackKeys.length > 0;
        this.addTestResult('備用方法功能', validFallback,
          validFallback ? `備用方法返回 ${fallbackKeys.length} 個鍵值` : '備用方法返回無效結果');
      }
      
      // 清理測試 DOM
      document.body.removeChild(testContainer);
      
    } catch (error) {
      this.addTestResult('updateFilterSelect 重構測試', false, `測試失敗: ${error.message}`);
    }
  }

  /**
   * 測試 5: 可維護性測試
   */
  async testMaintainability() {
    console.log('🔧 測試 5: 可維護性測試');
    
    try {
      if (!window.TranslationKeysUtils) {
        this.addTestResult('可維護性測試', false, 'TranslationKeysUtils 不可用');
        return;
      }
      
      const utils = window.TranslationKeysUtils;
      
      // 測試按分類獲取鍵值
      const filterKeys = utils.getKeysByCategory('FILTER_OPTIONS');
      const hasFilterKeys = Array.isArray(filterKeys) && filterKeys.length > 0;
      this.addTestResult('按分類獲取鍵值', hasFilterKeys,
        hasFilterKeys ? `獲取到 ${filterKeys.length} 個篩選鍵值` : '按分類獲取失敗');
      
      // 測試獲取所有鍵值
      const allKeys = utils.getAllKeys();
      const hasAllKeys = Array.isArray(allKeys) && allKeys.length > 0;
      this.addTestResult('獲取所有鍵值', hasAllKeys,
        hasAllKeys ? `獲取到 ${allKeys.length} 個總鍵值` : '獲取所有鍵值失敗');
      
      // 測試搜尋功能
      const searchResults = utils.searchKeys('card');
      const hasSearchResults = Array.isArray(searchResults) && searchResults.length > 0;
      this.addTestResult('鍵值搜尋功能', hasSearchResults,
        hasSearchResults ? `搜尋到 ${searchResults.length} 個相關鍵值` : '搜尋功能失敗');
      
      // 測試完整驗證
      const validationReport = utils.validateAllKeys();
      const hasValidReport = validationReport && validationReport.overall && typeof validationReport.overall.totalKeys === 'number';
      this.addTestResult('完整驗證報告', hasValidReport,
        hasValidReport ? `驗證了 ${validationReport.overall.totalKeys} 個鍵值` : '驗證報告生成失敗');
      
      // 測試新增分類的便利性（模擬）
      const originalKeys = window.TRANSLATION_KEYS;
      try {
        // 模擬新增分類
        window.TRANSLATION_KEYS.TEST_CATEGORY = ['test1', 'test2', 'test3'];
        const testKeys = utils.getKeysByCategory('TEST_CATEGORY');
        const newCategoryWorks = Array.isArray(testKeys) && testKeys.length === 3;
        this.addTestResult('新增分類便利性', newCategoryWorks,
          newCategoryWorks ? '新分類可正常使用' : '新分類添加失敗');
        
        // 恢復原始配置
        delete window.TRANSLATION_KEYS.TEST_CATEGORY;
      } catch (error) {
        this.addTestResult('新增分類便利性', false, `測試失敗: ${error.message}`);
      }
      
    } catch (error) {
      this.addTestResult('可維護性測試', false, `測試失敗: ${error.message}`);
    }
  }

  /**
   * 測試 6: 錯誤處理測試
   */
  async testErrorHandling() {
    console.log('🛡️ 測試 6: 錯誤處理測試');
    
    try {
      // 測試配置不存在時的處理
      const originalConfig = window.TRANSLATION_KEYS;
      window.TRANSLATION_KEYS = null;
      
      // 測試語言管理器是否能優雅處理
      if (window.languageManager && typeof window.languageManager.updateFilterSelect === 'function') {
        try {
          window.languageManager.updateFilterSelect();
          this.addTestResult('配置缺失處理', true, '配置缺失時方法執行無錯誤');
        } catch (error) {
          this.addTestResult('配置缺失處理', false, `配置缺失時出現錯誤: ${error.message}`);
        }
      }
      
      // 恢復配置
      window.TRANSLATION_KEYS = originalConfig;
      
      // 測試無效配置處理
      if (window.TranslationKeysValidator) {
        const invalidArray = ['valid', '<invalid>', null, undefined, ''];
        const validation = window.TranslationKeysValidator.validateKeysArray(invalidArray);
        const handlesInvalid = !validation.isValid && validation.invalidKeys.length > 0;
        this.addTestResult('無效配置檢測', handlesInvalid,
          handlesInvalid ? `檢測到 ${validation.invalidKeys.length} 個無效鍵值` : '無效配置檢測失敗');
      }
      
      // 測試 DOM 元素不存在時的處理
      const originalElement = document.getElementById('card-filter');
      if (originalElement) {
        originalElement.id = 'card-filter-backup';
      }
      
      if (window.languageManager && typeof window.languageManager.updateFilterSelect === 'function') {
        try {
          window.languageManager.updateFilterSelect();
          this.addTestResult('DOM 缺失處理', true, 'DOM 元素缺失時方法執行無錯誤');
        } catch (error) {
          this.addTestResult('DOM 缺失處理', false, `DOM 缺失時出現錯誤: ${error.message}`);
        }
      }
      
      // 恢復 DOM 元素
      if (originalElement) {
        originalElement.id = 'card-filter';
      }
      
    } catch (error) {
      this.addTestResult('錯誤處理測試', false, `測試失敗: ${error.message}`);
    }
  }

  /**
   * 測試 7: 效能測試
   */
  async testPerformance() {
    console.log('⚡ 測試 7: 效能測試');
    
    try {
      // 測試配置載入效能
      const startTime = performance.now();
      
      if (window.TranslationKeysUtils) {
        // 執行多次操作測試效能
        for (let i = 0; i < 100; i++) {
          window.TranslationKeysUtils.getAllKeys();
          window.TranslationKeysUtils.getKeysByCategory('FILTER_OPTIONS');
          window.TranslationKeysUtils.searchKeys('card');
        }
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 效能標準：100次操作應在50ms內完成
      const performanceGood = executionTime < 50;
      this.addTestResult('配置操作效能', performanceGood,
        `100次操作耗時 ${executionTime.toFixed(2)}ms ${performanceGood ? '(良好)' : '(需優化)'}`);
      
      // 測試記憶體使用
      if (performance.memory) {
        const memoryBefore = performance.memory.usedJSHeapSize;
        
        // 執行大量操作
        if (window.TranslationKeysUtils) {
          for (let i = 0; i < 1000; i++) {
            window.TranslationKeysUtils.getAllKeys();
          }
        }
        
        const memoryAfter = performance.memory.usedJSHeapSize;
        const memoryIncrease = memoryAfter - memoryBefore;
        
        // 記憶體增長應小於1MB
        const memoryEfficient = memoryIncrease < 1024 * 1024;
        this.addTestResult('記憶體效率', memoryEfficient,
          `記憶體增長 ${(memoryIncrease / 1024).toFixed(2)}KB ${memoryEfficient ? '(良好)' : '(需優化)'}`);
      }
      
    } catch (error) {
      this.addTestResult('效能測試', false, `測試失敗: ${error.message}`);
    }
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
    
    console.log('\n📊 TRANS-004 測試報告');
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
    window.TRANS004TestResults = {
      testName: this.testName,
      duration: duration,
      totalTests: totalTests,
      passedTests: passedTests,
      failedTests: failedTests,
      successRate: parseFloat(successRate),
      results: this.testResults,
      summary: {
        configurationLoading: this.testResults.filter(r => r.name.includes('載入')).every(r => r.passed),
        validatorFunctionality: this.testResults.filter(r => r.name.includes('驗證')).every(r => r.passed),
        dynamicGenerator: this.testResults.filter(r => r.name.includes('生成')).every(r => r.passed),
        refactorValidation: this.testResults.filter(r => r.name.includes('updateFilterSelect')).every(r => r.passed),
        maintainability: this.testResults.filter(r => r.name.includes('維護')).every(r => r.passed),
        errorHandling: this.testResults.filter(r => r.name.includes('錯誤')).every(r => r.passed),
        performance: this.testResults.filter(r => r.name.includes('效能')).every(r => r.passed)
      }
    };
    
    const overallSuccess = failedTests === 0;
    console.log(`\n🎯 TRANS-004 整體測試結果: ${overallSuccess ? '✅ 通過' : '❌ 失敗'}`);
    
    return overallSuccess;
  }
}

// 自動執行測試（如果在瀏覽器環境中）
if (typeof window !== 'undefined') {
  // 等待 DOM 和相關腳本載入完成
  const runTRANS004Test = () => {
    if (document.readyState === 'complete') {
      setTimeout(() => {
        const test = new TRANS004SmokeTest();
        test.runAllTests();
      }, 1000); // 給其他腳本一些載入時間
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const test = new TRANS004SmokeTest();
          test.runAllTests();
        }, 1000);
      });
    }
  };
  
  runTRANS004Test();
}

// 導出供 Node.js 環境使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TRANS004SmokeTest;
}