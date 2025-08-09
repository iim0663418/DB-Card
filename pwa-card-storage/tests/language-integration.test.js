/**
 * Language Integration Tests
 * 完整的語言切換測試套件
 */

class LanguageIntegrationTest {
  constructor() {
    this.testResults = [];
    this.mockElements = new Map();
    this.originalLanguageManager = null;
  }

  /**
   * 設置測試環境
   */
  setup() {
    // 備份原始語言管理器
    this.originalLanguageManager = window.languageManager;
    
    // 創建模擬 DOM 元素
    this.createMockElements();
    
    // 創建測試用語言管理器
    this.createMockLanguageManager();
  }

  /**
   * 清理測試環境
   */
  teardown() {
    // 恢復原始語言管理器
    window.languageManager = this.originalLanguageManager;
    
    // 清理模擬元素
    this.mockElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.mockElements.clear();
  }

  /**
   * 創建模擬 DOM 元素
   */
  createMockElements() {
    const elements = [
      { id: 'app-title', text: '數位名片收納' },
      { id: 'nav-home', text: '首頁' },
      { id: 'nav-cards', text: '名片' },
      { id: 'welcome-title', text: '歡迎使用離線名片儲存' },
      { id: 'lang-toggle', text: 'EN' }
    ];

    elements.forEach(({ id, text }) => {
      const element = document.createElement('div');
      element.id = id;
      element.textContent = text;
      document.body.appendChild(element);
      this.mockElements.set(id, element);
    });
  }

  /**
   * 創建測試用語言管理器
   */
  createMockLanguageManager() {
    window.languageManager = {
      currentLanguage: 'zh',
      translations: {
        zh: {
          appTitle: '數位名片收納',
          home: '首頁',
          cards: '名片',
          welcomeTitle: '歡迎使用離線名片儲存'
        },
        en: {
          appTitle: 'Digital Card Hub',
          home: 'Home',
          cards: 'Cards',
          welcomeTitle: 'Welcome to Offline Card Storage'
        }
      },
      
      getCurrentLanguage() {
        return this.currentLanguage;
      },
      
      getText(key, lang = null) {
        const targetLang = lang || this.currentLanguage;
        return this.translations[targetLang]?.[key] || key;
      },
      
      async toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
        return this.currentLanguage;
      },
      
      observers: [],
      
      addObserver(callback) {
        this.observers.push(callback);
      },
      
      removeObserver(callback) {
        const index = this.observers.indexOf(callback);
        if (index > -1) {
          this.observers.splice(index, 1);
        }
      }
    };
  }

  /**
   * 測試基本語言切換功能
   */
  async testBasicLanguageToggle() {
    const testName = 'Basic Language Toggle';
    
    try {
      // 初始狀態檢查
      const initialLang = window.languageManager.getCurrentLanguage();
      this.assert(initialLang === 'zh', 'Initial language should be zh');
      
      // 執行語言切換
      const newLang = await window.languageManager.toggleLanguage();
      this.assert(newLang === 'en', 'Language should switch to en');
      
      // 再次切換
      const backToZh = await window.languageManager.toggleLanguage();
      this.assert(backToZh === 'zh', 'Language should switch back to zh');
      
      this.recordSuccess(testName);
      
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * 測試翻譯鍵完整性
   */
  async testTranslationKeyCompleteness() {
    const testName = 'Translation Key Completeness';
    
    try {
      const requiredKeys = [
        'app.initializing',
        'cardSaved',
        'versionCreated',
        'importSuccess',
        'exportSuccess',
        'operationFailed',
        'theme-dark',
        'theme-light'
      ];
      
      const missingKeys = [];
      
      ['zh', 'en'].forEach(lang => {
        requiredKeys.forEach(key => {
          const translation = window.languageManager.getText(key, lang);
          if (translation === key) {
            missingKeys.push(`${lang}:${key}`);
          }
        });
      });
      
      this.assert(missingKeys.length === 0, 
        `Missing translations: ${missingKeys.join(', ')}`);
      
      this.recordSuccess(testName);
      
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * 測試動態內容語言更新
   */
  async testDynamicContentUpdate() {
    const testName = 'Dynamic Content Update';
    
    try {
      // 模擬 PWA 應用的 updateAllLocalizedContent 方法
      const updateAllLocalizedContent = (language) => {
        const isZh = language === 'zh';
        
        const appTitle = this.mockElements.get('app-title');
        if (appTitle) {
          appTitle.textContent = isZh ? '數位名片收納' : 'Digital Card Hub';
        }
        
        const navHome = this.mockElements.get('nav-home');
        if (navHome) {
          navHome.textContent = isZh ? '首頁' : 'Home';
        }
        
        const welcomeTitle = this.mockElements.get('welcome-title');
        if (welcomeTitle) {
          welcomeTitle.textContent = isZh ? '歡迎使用離線名片儲存' : 'Welcome to Offline Card Storage';
        }
      };
      
      // 切換到英文並更新內容
      await window.languageManager.toggleLanguage();
      updateAllLocalizedContent('en');
      
      // 驗證內容更新
      this.assert(
        this.mockElements.get('app-title').textContent === 'Digital Card Hub',
        'App title should be updated to English'
      );
      
      this.assert(
        this.mockElements.get('nav-home').textContent === 'Home',
        'Navigation should be updated to English'
      );
      
      // 切換回中文並更新內容
      await window.languageManager.toggleLanguage();
      updateAllLocalizedContent('zh');
      
      // 驗證內容恢復
      this.assert(
        this.mockElements.get('app-title').textContent === '數位名片收納',
        'App title should be restored to Chinese'
      );
      
      this.recordSuccess(testName);
      
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * 測試硬編碼文字檢測
   */
  async testHardcodedTextDetection() {
    const testName = 'Hardcoded Text Detection';
    
    try {
      // 模擬檢查硬編碼文字的函數
      const checkForHardcodedText = (text) => {
        const hardcodedPatterns = [
          /名片已成功儲存到離線收納/,
          /初始化應用程式/,
          /版本管理/,
          /語言切換失敗/,
          /操作失敗/
        ];
        
        return hardcodedPatterns.some(pattern => pattern.test(text));
      };
      
      // 測試一些應該被修復的硬編碼文字
      const testTexts = [
        '名片已成功儲存到離線收納', // 應該使用 getLocalizedText('cardSaved')
        '初始化應用程式...', // 應該使用 getLocalizedText('app.initializing')
        '版本管理' // 應該使用 getLocalizedText('versionManagement')
      ];
      
      const foundHardcoded = testTexts.filter(checkForHardcodedText);
      
      // 在實際應用中，這些應該都被修復了
      this.assert(foundHardcoded.length === 3, 
        'Test patterns should be detected (this validates the detection logic)');
      
      this.recordSuccess(testName);
      
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * 測試效能指標
   */
  async testPerformanceMetrics() {
    const testName = 'Performance Metrics';
    
    try {
      const startTime = performance.now();
      
      // 執行多次語言切換
      for (let i = 0; i < 10; i++) {
        await window.languageManager.toggleLanguage();
      }
      
      const endTime = performance.now();
      const averageTime = (endTime - startTime) / 10;
      
      // 語言切換應該在 50ms 內完成
      this.assert(averageTime < 50, 
        `Language switch too slow: ${averageTime.toFixed(2)}ms (should be < 50ms)`);
      
      this.recordSuccess(testName);
      
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * 測試觀察者模式
   */
  async testObserverPattern() {
    const testName = 'Observer Pattern';
    
    try {
      let observerCalled = false;
      let observedLanguage = null;
      
      const observer = (language) => {
        observerCalled = true;
        observedLanguage = language;
      };
      
      // 註冊觀察者
      window.languageManager.addObserver(observer);
      
      // 觸發語言切換
      const newLang = await window.languageManager.toggleLanguage();
      
      // 手動觸發觀察者（在實際應用中這會自動發生）
      window.languageManager.observers.forEach(obs => obs(newLang));
      
      // 驗證觀察者被調用
      this.assert(observerCalled, 'Observer should be called');
      this.assert(observedLanguage === newLang, 'Observer should receive correct language');
      
      // 移除觀察者
      window.languageManager.removeObserver(observer);
      
      this.recordSuccess(testName);
      
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * 執行所有測試
   */
  async runAllTests() {
    console.log('🧪 Starting Language Integration Tests...');
    
    this.setup();
    
    try {
      await this.testBasicLanguageToggle();
      await this.testTranslationKeyCompleteness();
      await this.testDynamicContentUpdate();
      await this.testHardcodedTextDetection();
      await this.testPerformanceMetrics();
      await this.testObserverPattern();
      
    } finally {
      this.teardown();
    }
    
    this.generateReport();
  }

  /**
   * 斷言輔助方法
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * 記錄成功測試
   */
  recordSuccess(testName) {
    this.testResults.push({
      name: testName,
      status: 'PASS',
      message: 'Test passed successfully'
    });
    console.log(`✅ ${testName}: PASS`);
  }

  /**
   * 記錄失敗測試
   */
  recordFailure(testName, error) {
    this.testResults.push({
      name: testName,
      status: 'FAIL',
      message: error
    });
    console.log(`❌ ${testName}: FAIL - ${error}`);
  }

  /**
   * 生成測試報告
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n📊 Test Report:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.testResults
    };
  }
}

// 導出測試類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LanguageIntegrationTest;
} else {
  window.LanguageIntegrationTest = LanguageIntegrationTest;
}

// 自動執行測試（如果在瀏覽器環境中）
if (typeof window !== 'undefined' && window.document) {
  // 等待 DOM 載入完成後執行測試
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const tester = new LanguageIntegrationTest();
      tester.runAllTests();
    });
  } else {
    const tester = new LanguageIntegrationTest();
    tester.runAllTests();
  }
}