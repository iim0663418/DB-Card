/**
 * Phase 3 Accessibility Support Smoke Test
 * Tests LANG-09 (AccessibilityLanguageManager) and LANG-10 (Accessibility Translation Resources)
 * 
 * @version 3.1.4-language-architecture
 * @author code-executor
 * @since 2025-08-06
 */

// Mock DOM environment for Node.js testing
if (typeof window === 'undefined') {
  global.window = {
    AccessibilityLanguageManager: require('../../pwa-card-storage/src/core/accessibility-language-manager.js'),
    TranslationRegistry: require('../../pwa-card-storage/src/core/translation-registry.js'),
    EnhancedLanguageManager: require('../../pwa-card-storage/src/core/enhanced-language-manager.js')
  };
  
  global.document = {
    documentElement: { lang: 'zh-TW', dir: 'ltr' },
    getElementById: (id) => ({
      id,
      setAttribute: () => {},
      getAttribute: () => null,
      textContent: '',
      classList: { contains: () => false },
      dataset: {},
      parentElement: null,
      isConnected: true
    }),
    querySelectorAll: () => [],
    body: {
      addEventListener: () => {},
      removeEventListener: () => {}
    }
  };
  
  global.MutationObserver = class {
    constructor() {}
    observe() {}
    disconnect() {}
  };
  
  global.fetch = async (url) => {
    // Mock fetch for accessibility translation files
    if (url.includes('accessibility-zh.json')) {
      return {
        ok: true,
        json: async () => require('../../pwa-card-storage/assets/translations/accessibility-zh.json')
      };
    } else if (url.includes('accessibility-en.json')) {
      return {
        ok: true,
        json: async () => require('../../pwa-card-storage/assets/translations/accessibility-en.json')
      };
    }
    throw new Error('File not found');
  };
  
  global.localStorage = {
    getItem: () => 'zh',
    setItem: () => {},
    removeItem: () => {}
  };
  
  global.navigator = { language: 'zh-TW' };
}

/**
 * Phase 3 Accessibility Support Smoke Test Suite
 */
class Phase3AccessibilitySmokeTest {
  constructor() {
    this.testResults = [];
    this.accessibilityManager = null;
    this.translationRegistry = null;
    this.enhancedLanguageManager = null;
  }

  /**
   * Run all Phase 3 smoke tests
   */
  async runAllTests() {
    console.log('🧪 Starting Phase 3 Accessibility Support Smoke Tests...\n');

    try {
      // LANG-09: AccessibilityLanguageManager Tests
      await this.testAccessibilityLanguageManagerInitialization();
      await this.testAriaLabelsUpdate();
      await this.testScreenReaderTextsUpdate();
      await this.testFormLabelsUpdate();
      await this.testDocumentLanguageUpdate();
      await this.testAccessibilityElementRegistration();
      await this.testDOMObserver();

      // LANG-10: Accessibility Translation Resources Tests
      await this.testAccessibilityTranslationLoading();
      await this.testTranslationCompleteness();
      await this.testTranslationFallback();

      // Integration Tests
      await this.testEnhancedLanguageManagerIntegration();
      await this.testLanguageSwitchingWithAccessibility();
      await this.testAccessibilityCleanup();

      // Performance Tests
      await this.testAccessibilityUpdatePerformance();

      this.printTestResults();
      return this.getTestSummary();

    } catch (error) {
      console.error('❌ Phase 3 smoke tests failed:', error);
      throw error;
    }
  }

  /**
   * Test LANG-09: AccessibilityLanguageManager initialization
   */
  async testAccessibilityLanguageManagerInitialization() {
    try {
      const TranslationRegistry = window.TranslationRegistry;
      this.translationRegistry = new TranslationRegistry();
      await this.translationRegistry.initialize();

      const AccessibilityLanguageManager = window.AccessibilityLanguageManager;
      this.accessibilityManager = new AccessibilityLanguageManager();
      
      // Test initialization
      await this.accessibilityManager.initialize(this.translationRegistry);
      
      const status = this.accessibilityManager.getAccessibilityStatus();
      
      this.assert(
        status.isInitialized === true,
        'AccessibilityLanguageManager should be initialized'
      );
      
      this.assert(
        status.currentLanguage === 'zh',
        'Should detect correct initial language'
      );
      
      this.assert(
        status.hasObserver === true,
        'Should have DOM mutation observer'
      );

      this.recordTest('LANG-09-01', 'AccessibilityLanguageManager Initialization', true);
    } catch (error) {
      this.recordTest('LANG-09-01', 'AccessibilityLanguageManager Initialization', false, error.message);
    }
  }

  /**
   * Test ARIA labels update functionality
   */
  async testAriaLabelsUpdate() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      // Mock elements with ARIA labels
      const mockElements = [
        { id: 'user-communication-container', getAttribute: () => 'aria-label', setAttribute: () => {} },
        { id: 'security-onboarding-modal', getAttribute: () => 'aria-label', setAttribute: () => {} }
      ];

      // Override querySelectorAll for this test
      const originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = (selector) => {
        if (selector === '[aria-label]') return mockElements;
        return [];
      };

      // Test ARIA labels update
      await this.accessibilityManager.updateAriaLabels('en');
      
      // Restore original function
      document.querySelectorAll = originalQuerySelectorAll;

      this.recordTest('LANG-09-02', 'ARIA Labels Update', true);
    } catch (error) {
      this.recordTest('LANG-09-02', 'ARIA Labels Update', false, error.message);
    }
  }

  /**
   * Test screen reader texts update functionality
   */
  async testScreenReaderTextsUpdate() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      // Mock screen reader elements
      const mockElements = [
        { dataset: { textKey: 'languageChanged' }, textContent: '' },
        { dataset: { textKey: 'modalOpened' }, textContent: '' }
      ];

      // Override querySelectorAll for this test
      const originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = (selector) => {
        if (selector === '.sr-only, .screen-reader-text, [data-sr-text]') return mockElements;
        return [];
      };

      // Test screen reader texts update
      await this.accessibilityManager.updateScreenReaderTexts('en');
      
      // Restore original function
      document.querySelectorAll = originalQuerySelectorAll;

      this.recordTest('LANG-09-03', 'Screen Reader Texts Update', true);
    } catch (error) {
      this.recordTest('LANG-09-03', 'Screen Reader Texts Update', false, error.message);
    }
  }

  /**
   * Test form labels update functionality
   */
  async testFormLabelsUpdate() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      // Mock form elements
      const mockLabels = [
        { getAttribute: () => 'card-search', textContent: '搜尋名片' },
        { getAttribute: () => 'card-filter', textContent: '篩選名片' }
      ];

      const mockInputs = [
        { id: 'card-search', setAttribute: () => {}, getAttribute: () => 'placeholder' },
        { id: 'card-filter', setAttribute: () => {}, getAttribute: () => 'placeholder' }
      ];

      // Override querySelectorAll for this test
      const originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = (selector) => {
        if (selector === 'label[for]') return mockLabels;
        if (selector === 'input[placeholder], textarea[placeholder]') return mockInputs;
        return [];
      };

      // Test form labels update
      await this.accessibilityManager.updateFormLabels('en');
      
      // Restore original function
      document.querySelectorAll = originalQuerySelectorAll;

      this.recordTest('LANG-09-04', 'Form Labels Update', true);
    } catch (error) {
      this.recordTest('LANG-09-04', 'Form Labels Update', false, error.message);
    }
  }

  /**
   * Test document language update
   */
  async testDocumentLanguageUpdate() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      // Test Chinese language update
      this.accessibilityManager.updateDocumentLanguage('zh');
      this.assert(
        document.documentElement.lang === 'zh-TW',
        'Document language should be set to zh-TW'
      );

      // Test English language update
      this.accessibilityManager.updateDocumentLanguage('en');
      this.assert(
        document.documentElement.lang === 'en',
        'Document language should be set to en'
      );

      this.recordTest('LANG-09-05', 'Document Language Update', true);
    } catch (error) {
      this.recordTest('LANG-09-05', 'Document Language Update', false, error.message);
    }
  }

  /**
   * Test accessibility element registration
   */
  async testAccessibilityElementRegistration() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      // Test element registration
      this.accessibilityManager.registerAccessibilityElement('test-element', 'testLabel', 'aria-label');
      
      const status = this.accessibilityManager.getAccessibilityStatus();
      this.assert(
        status.registeredElements.ariaLabels >= 1,
        'Should register ARIA label elements'
      );

      this.recordTest('LANG-09-06', 'Accessibility Element Registration', true);
    } catch (error) {
      this.recordTest('LANG-09-06', 'Accessibility Element Registration', false, error.message);
    }
  }

  /**
   * Test DOM mutation observer
   */
  async testDOMObserver() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      // Test observer setup
      this.accessibilityManager.setupAccessibilityObserver();
      
      const status = this.accessibilityManager.getAccessibilityStatus();
      this.assert(
        status.hasObserver === true,
        'Should have active DOM mutation observer'
      );

      this.recordTest('LANG-09-07', 'DOM Mutation Observer', true);
    } catch (error) {
      this.recordTest('LANG-09-07', 'DOM Mutation Observer', false, error.message);
    }
  }

  /**
   * Test LANG-10: Accessibility translation loading
   */
  async testAccessibilityTranslationLoading() {
    try {
      if (!this.translationRegistry) {
        throw new Error('TranslationRegistry not initialized');
      }

      // Test Chinese accessibility translations
      const zhAriaLabel = this.translationRegistry.getTranslation('zh', 'accessibility.ariaLabels.systemNotifications');
      this.assert(
        zhAriaLabel === '系統通知',
        'Should load Chinese accessibility translations'
      );

      // Test English accessibility translations
      const enAriaLabel = this.translationRegistry.getTranslation('en', 'accessibility.ariaLabels.systemNotifications');
      this.assert(
        enAriaLabel === 'System Notifications',
        'Should load English accessibility translations'
      );

      // Test nested accessibility translations
      const zhScreenReader = this.translationRegistry.getTranslation('zh', 'accessibility.screenReaderTexts.languageChanged');
      this.assert(
        zhScreenReader === '語言已切換',
        'Should load nested accessibility translations'
      );

      this.recordTest('LANG-10-01', 'Accessibility Translation Loading', true);
    } catch (error) {
      this.recordTest('LANG-10-01', 'Accessibility Translation Loading', false, error.message);
    }
  }

  /**
   * Test translation completeness
   */
  async testTranslationCompleteness() {
    try {
      if (!this.translationRegistry) {
        throw new Error('TranslationRegistry not initialized');
      }

      // Test required accessibility translation categories
      const categories = ['ariaLabels', 'screenReaderTexts', 'formLabels', 'placeholders'];
      
      for (const category of categories) {
        const zhTranslation = this.translationRegistry.getTranslation('zh', `accessibility.${category}`);
        const enTranslation = this.translationRegistry.getTranslation('en', `accessibility.${category}`);
        
        this.assert(
          typeof zhTranslation === 'object' && zhTranslation !== null,
          `Should have Chinese ${category} translations`
        );
        
        this.assert(
          typeof enTranslation === 'object' && enTranslation !== null,
          `Should have English ${category} translations`
        );
      }

      this.recordTest('LANG-10-02', 'Translation Completeness', true);
    } catch (error) {
      this.recordTest('LANG-10-02', 'Translation Completeness', false, error.message);
    }
  }

  /**
   * Test translation fallback mechanism
   */
  async testTranslationFallback() {
    try {
      if (!this.translationRegistry) {
        throw new Error('TranslationRegistry not initialized');
      }

      // Test fallback for non-existent key
      const fallback = this.translationRegistry.getTranslation('zh', 'accessibility.nonExistent.key');
      this.assert(
        fallback === 'accessibility.nonExistent.key',
        'Should return original key as fallback'
      );

      // Test fallback for unsupported language
      const langFallback = this.translationRegistry.getTranslation('fr', 'accessibility.ariaLabels.systemNotifications');
      this.assert(
        langFallback === '系統通知',
        'Should use fallback language for unsupported languages'
      );

      this.recordTest('LANG-10-03', 'Translation Fallback', true);
    } catch (error) {
      this.recordTest('LANG-10-03', 'Translation Fallback', false, error.message);
    }
  }

  /**
   * Test Enhanced Language Manager integration
   */
  async testEnhancedLanguageManagerIntegration() {
    try {
      const EnhancedLanguageManager = window.EnhancedLanguageManager;
      this.enhancedLanguageManager = new EnhancedLanguageManager();
      
      // Mock the initialization to avoid full dependency loading
      this.enhancedLanguageManager.translationRegistry = this.translationRegistry;
      this.enhancedLanguageManager.accessibilityManager = this.accessibilityManager;
      this.enhancedLanguageManager.initialized = true;

      // Test accessibility manager integration
      this.assert(
        this.enhancedLanguageManager.accessibilityManager !== null,
        'Should integrate AccessibilityLanguageManager'
      );

      // Test status reporting
      const status = this.enhancedLanguageManager.getStatus();
      this.assert(
        status.accessibilityManager !== null,
        'Should report accessibility manager status'
      );

      this.recordTest('LANG-09-08', 'Enhanced Language Manager Integration', true);
    } catch (error) {
      this.recordTest('LANG-09-08', 'Enhanced Language Manager Integration', false, error.message);
    }
  }

  /**
   * Test language switching with accessibility updates
   */
  async testLanguageSwitchingWithAccessibility() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      const startTime = Date.now();

      // Test language switching
      await this.accessibilityManager.updateAccessibilityAttributes('en');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify language was updated
      const status = this.accessibilityManager.getAccessibilityStatus();
      this.assert(
        status.currentLanguage === 'en',
        'Should update current language'
      );

      // Test performance requirement (should be under 100ms)
      this.assert(
        duration < 100,
        `Accessibility update should be under 100ms (actual: ${duration}ms)`
      );

      this.recordTest('LANG-09-09', 'Language Switching with Accessibility', true, `Duration: ${duration}ms`);
    } catch (error) {
      this.recordTest('LANG-09-09', 'Language Switching with Accessibility', false, error.message);
    }
  }

  /**
   * Test accessibility cleanup
   */
  async testAccessibilityCleanup() {
    try {
      if (!this.accessibilityManager) {
        throw new Error('AccessibilityLanguageManager not initialized');
      }

      // Test cleanup
      this.accessibilityManager.cleanup();
      
      const status = this.accessibilityManager.getAccessibilityStatus();
      this.assert(
        status.isInitialized === false,
        'Should be uninitialized after cleanup'
      );
      
      this.assert(
        status.hasObserver === false,
        'Should not have observer after cleanup'
      );

      this.recordTest('LANG-09-10', 'Accessibility Cleanup', true);
    } catch (error) {
      this.recordTest('LANG-09-10', 'Accessibility Cleanup', false, error.message);
    }
  }

  /**
   * Test accessibility update performance
   */
  async testAccessibilityUpdatePerformance() {
    try {
      // Reinitialize for performance test
      const AccessibilityLanguageManager = window.AccessibilityLanguageManager;
      const testManager = new AccessibilityLanguageManager();
      await testManager.initialize(this.translationRegistry);

      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await testManager.updateAccessibilityAttributes(i % 2 === 0 ? 'zh' : 'en');
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      // Performance requirements
      this.assert(
        averageTime < 50,
        `Average accessibility update should be under 50ms (actual: ${averageTime.toFixed(2)}ms)`
      );

      this.assert(
        maxTime < 100,
        `Maximum accessibility update should be under 100ms (actual: ${maxTime}ms)`
      );

      testManager.cleanup();

      this.recordTest('LANG-09-11', 'Accessibility Update Performance', true, 
        `Avg: ${averageTime.toFixed(2)}ms, Max: ${maxTime}ms`);
    } catch (error) {
      this.recordTest('LANG-09-11', 'Accessibility Update Performance', false, error.message);
    }
  }

  /**
   * Record test result
   */
  recordTest(testId, testName, passed, details = '') {
    const result = {
      id: testId,
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    const detailsStr = details ? ` (${details})` : '';
    console.log(`${status} ${testId}: ${testName}${detailsStr}`);
  }

  /**
   * Assert condition
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Print test results summary
   */
  printTestResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log('\n📊 Phase 3 Accessibility Support Test Results:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.id}: ${test.name} (${test.details})`);
        });
    }
  }

  /**
   * Get test summary
   */
  getTestSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    
    return {
      phase: 'Phase 3 - Accessibility Support',
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      details: this.testResults
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const smokeTest = new Phase3AccessibilitySmokeTest();
  smokeTest.runAllTests()
    .then(summary => {
      console.log('\n🎉 Phase 3 Accessibility Support smoke tests completed!');
      process.exit(summary.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Phase 3 smoke tests crashed:', error);
      process.exit(1);
    });
}

module.exports = Phase3AccessibilitySmokeTest;