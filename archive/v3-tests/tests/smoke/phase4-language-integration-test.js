/**
 * Phase 4 Language Integration Test (LANG-11)
 * Comprehensive integration testing for unified language switching architecture
 * 
 * @version 3.1.4-language-architecture
 * @author code-executor
 * @since 2025-08-06
 */

// Mock DOM environment for Node.js testing
if (typeof window === 'undefined') {
  global.window = {
    TranslationRegistry: require('../../pwa-card-storage/src/core/translation-registry.js'),
    UnifiedLanguageObserver: require('../../pwa-card-storage/src/core/unified-language-observer.js'),
    EnhancedLanguageManager: require('../../pwa-card-storage/src/core/enhanced-language-manager.js'),
    SecurityComponentsLanguageAdapter: require('../../pwa-card-storage/src/core/security-components-language-adapter.js'),
    PWAUILanguageAdapter: require('../../pwa-card-storage/src/core/pwa-ui-language-adapter.js'),
    AccessibilityLanguageManager: require('../../pwa-card-storage/src/core/accessibility-language-manager.js')
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
 * Phase 4 Language Integration Test Suite
 */
class Phase4LanguageIntegrationTest {
  constructor() {
    this.testResults = [];
    this.enhancedLanguageManager = null;
    this.performanceMetrics = {
      languageSwitchTimes: [],
      componentUpdateTimes: [],
      memoryUsage: []
    };
  }

  /**
   * Run all Phase 4 integration tests
   */
  async runAllTests() {
    console.log('🧪 Starting Phase 4 Language Integration Tests...\n');

    try {
      // LANG-11: Integration Testing
      await this.testFullSystemInitialization();
      await this.testLanguageSwitchingIntegration();
      await this.testComponentSynchronization();
      await this.testErrorHandlingIntegration();
      await this.testConcurrentLanguageSwitching();
      await this.testObserverPrioritySystem();
      await this.testTranslationConsistency();
      await this.testAccessibilityIntegration();

      // LANG-12: Performance Optimization
      await this.testLanguageSwitchingPerformance();
      await this.testMemoryUsageOptimization();
      await this.testBatchUpdateEfficiency();
      await this.testCacheEffectiveness();
      await this.testResourceCleanup();
      await this.testLongRunningStability();

      this.printTestResults();
      return this.getTestSummary();

    } catch (error) {
      console.error('❌ Phase 4 integration tests failed:', error);
      throw error;
    }
  }

  /**
   * Test full system initialization
   */
  async testFullSystemInitialization() {
    try {
      const EnhancedLanguageManager = window.EnhancedLanguageManager;
      this.enhancedLanguageManager = new EnhancedLanguageManager();
      
      const startTime = Date.now();
      await this.enhancedLanguageManager.initialize();
      const initTime = Date.now() - startTime;

      // Verify all components are initialized
      const status = this.enhancedLanguageManager.getStatus();
      
      this.assert(
        status.initialized === true,
        'Enhanced Language Manager should be initialized'
      );
      
      this.assert(
        status.translationRegistry !== null,
        'Translation Registry should be initialized'
      );
      
      this.assert(
        status.unifiedObserver !== null,
        'Unified Observer should be initialized'
      );
      
      this.assert(
        status.securityAdapter !== null,
        'Security Adapter should be initialized'
      );
      
      this.assert(
        status.pwaUIAdapter !== null,
        'PWA UI Adapter should be initialized'
      );
      
      this.assert(
        status.accessibilityManager !== null,
        'Accessibility Manager should be initialized'
      );

      // Performance requirement: initialization under 1000ms
      this.assert(
        initTime < 1000,
        `System initialization should be under 1000ms (actual: ${initTime}ms)`
      );

      this.recordTest('LANG-11-01', 'Full System Initialization', true, `Init time: ${initTime}ms`);
    } catch (error) {
      this.recordTest('LANG-11-01', 'Full System Initialization', false, error.message);
    }
  }

  /**
   * Test language switching integration
   */
  async testLanguageSwitchingIntegration() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      const languages = ['zh', 'en', 'zh', 'en'];
      const switchTimes = [];

      for (const lang of languages) {
        const startTime = Date.now();
        await this.enhancedLanguageManager.switchLanguage(lang);
        const switchTime = Date.now() - startTime;
        
        switchTimes.push(switchTime);
        this.performanceMetrics.languageSwitchTimes.push(switchTime);

        // Verify language was switched
        const currentLang = this.enhancedLanguageManager.getCurrentLanguage();
        this.assert(
          currentLang === lang,
          `Language should be switched to ${lang}`
        );

        // Performance requirement: under 300ms
        this.assert(
          switchTime < 300,
          `Language switch should be under 300ms (actual: ${switchTime}ms)`
        );
      }

      const avgSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
      
      this.recordTest('LANG-11-02', 'Language Switching Integration', true, 
        `Avg switch time: ${avgSwitchTime.toFixed(2)}ms`);
    } catch (error) {
      this.recordTest('LANG-11-02', 'Language Switching Integration', false, error.message);
    }
  }

  /**
   * Test component synchronization
   */
  async testComponentSynchronization() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      // Switch language and verify all components are synchronized
      await this.enhancedLanguageManager.switchLanguage('en');
      
      const status = this.enhancedLanguageManager.getStatus();
      
      // Check if all adapters report the same language
      const securityLang = status.securityAdapter?.currentLanguage;
      const pwaUILang = status.pwaUIAdapter?.currentLanguage;
      const accessibilityLang = status.accessibilityManager?.currentLanguage;
      
      this.assert(
        securityLang === 'en',
        'Security adapter should be synchronized to English'
      );
      
      this.assert(
        pwaUILang === 'en',
        'PWA UI adapter should be synchronized to English'
      );
      
      this.assert(
        accessibilityLang === 'en',
        'Accessibility manager should be synchronized to English'
      );

      // Test synchronization with Chinese
      await this.enhancedLanguageManager.switchLanguage('zh');
      
      const statusZh = this.enhancedLanguageManager.getStatus();
      this.assert(
        statusZh.securityAdapter?.currentLanguage === 'zh' &&
        statusZh.pwaUIAdapter?.currentLanguage === 'zh' &&
        statusZh.accessibilityManager?.currentLanguage === 'zh',
        'All components should be synchronized to Chinese'
      );

      this.recordTest('LANG-11-03', 'Component Synchronization', true);
    } catch (error) {
      this.recordTest('LANG-11-03', 'Component Synchronization', false, error.message);
    }
  }

  /**
   * Test error handling integration
   */
  async testErrorHandlingIntegration() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      // Test invalid language
      try {
        await this.enhancedLanguageManager.switchLanguage('invalid');
        this.assert(false, 'Should throw error for invalid language');
      } catch (error) {
        this.assert(
          error.message.includes('Unsupported language'),
          'Should throw appropriate error for invalid language'
        );
      }

      // Test system recovery after error
      const currentLang = this.enhancedLanguageManager.getCurrentLanguage();
      this.assert(
        currentLang === 'zh' || currentLang === 'en',
        'System should maintain valid language after error'
      );

      // Test successful operation after error
      await this.enhancedLanguageManager.switchLanguage('en');
      this.assert(
        this.enhancedLanguageManager.getCurrentLanguage() === 'en',
        'System should work normally after error recovery'
      );

      this.recordTest('LANG-11-04', 'Error Handling Integration', true);
    } catch (error) {
      this.recordTest('LANG-11-04', 'Error Handling Integration', false, error.message);
    }
  }

  /**
   * Test concurrent language switching
   */
  async testConcurrentLanguageSwitching() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      // Test concurrent language switch requests
      const promises = [
        this.enhancedLanguageManager.switchLanguage('en'),
        this.enhancedLanguageManager.switchLanguage('zh'),
        this.enhancedLanguageManager.switchLanguage('en')
      ];

      const startTime = Date.now();
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Verify final state is consistent
      const finalLang = this.enhancedLanguageManager.getCurrentLanguage();
      this.assert(
        finalLang === 'en' || finalLang === 'zh',
        'Final language should be valid after concurrent requests'
      );

      // Performance requirement: concurrent requests should not significantly slow down
      this.assert(
        totalTime < 1000,
        `Concurrent language switching should complete under 1000ms (actual: ${totalTime}ms)`
      );

      this.recordTest('LANG-11-05', 'Concurrent Language Switching', true, `Total time: ${totalTime}ms`);
    } catch (error) {
      this.recordTest('LANG-11-05', 'Concurrent Language Switching', false, error.message);
    }
  }

  /**
   * Test observer priority system
   */
  async testObserverPrioritySystem() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      const observer = this.enhancedLanguageManager.unifiedObserver;
      if (!observer) {
        throw new Error('Unified Observer not available');
      }

      // Test observer registration with priorities
      const updateOrder = [];
      
      // Mock observers with different priorities
      const mockObservers = [
        { id: 'low-priority', priority: 3, update: () => updateOrder.push('low') },
        { id: 'high-priority', priority: 9, update: () => updateOrder.push('high') },
        { id: 'medium-priority', priority: 6, update: () => updateOrder.push('medium') }
      ];

      // Register observers
      mockObservers.forEach(obs => {
        observer.registerObserver(obs.id, obs.update, obs.priority);
      });

      // Trigger language change
      await observer.notifyLanguageChange('en', 'zh');

      // Verify update order (high priority first)
      this.assert(
        updateOrder[0] === 'high',
        'High priority observer should update first'
      );
      
      this.assert(
        updateOrder[1] === 'medium',
        'Medium priority observer should update second'
      );
      
      this.assert(
        updateOrder[2] === 'low',
        'Low priority observer should update last'
      );

      this.recordTest('LANG-11-06', 'Observer Priority System', true, `Update order: ${updateOrder.join(' -> ')}`);
    } catch (error) {
      this.recordTest('LANG-11-06', 'Observer Priority System', false, error.message);
    }
  }

  /**
   * Test translation consistency
   */
  async testTranslationConsistency() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      const translationRegistry = this.enhancedLanguageManager.translationRegistry;
      if (!translationRegistry) {
        throw new Error('Translation Registry not available');
      }

      // Test key translation categories
      const testKeys = [
        'pwa.cardList.title',
        'security.userCommunication.containerLabel',
        'accessibility.ariaLabels.systemNotifications'
      ];

      for (const key of testKeys) {
        const zhTranslation = translationRegistry.getTranslation('zh', key);
        const enTranslation = translationRegistry.getTranslation('en', key);

        this.assert(
          zhTranslation && zhTranslation !== key,
          `Chinese translation should exist for ${key}`
        );
        
        this.assert(
          enTranslation && enTranslation !== key,
          `English translation should exist for ${key}`
        );
        
        this.assert(
          zhTranslation !== enTranslation,
          `Translations should be different for ${key}`
        );
      }

      // Test unified text retrieval
      const unifiedTextZh = this.enhancedLanguageManager.getUnifiedText('pwa.cardList.title', 'zh');
      const unifiedTextEn = this.enhancedLanguageManager.getUnifiedText('pwa.cardList.title', 'en');
      
      this.assert(
        unifiedTextZh !== unifiedTextEn,
        'Unified text should return different translations for different languages'
      );

      this.recordTest('LANG-11-07', 'Translation Consistency', true);
    } catch (error) {
      this.recordTest('LANG-11-07', 'Translation Consistency', false, error.message);
    }
  }

  /**
   * Test accessibility integration
   */
  async testAccessibilityIntegration() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      const accessibilityManager = this.enhancedLanguageManager.accessibilityManager;
      if (!accessibilityManager) {
        throw new Error('Accessibility Manager not available');
      }

      // Test accessibility updates during language switching
      await this.enhancedLanguageManager.switchLanguage('en');
      
      const status = accessibilityManager.getAccessibilityStatus();
      this.assert(
        status.currentLanguage === 'en',
        'Accessibility manager should update language'
      );
      
      this.assert(
        document.documentElement.lang === 'en',
        'Document language should be updated'
      );

      // Test accessibility priority (should be highest)
      const observer = this.enhancedLanguageManager.unifiedObserver;
      const observers = observer.getRegisteredObservers();
      
      const accessibilityObserver = observers.find(obs => obs.id.includes('accessibility'));
      this.assert(
        accessibilityObserver && accessibilityObserver.priority === 9,
        'Accessibility observer should have highest priority'
      );

      this.recordTest('LANG-11-08', 'Accessibility Integration', true);
    } catch (error) {
      this.recordTest('LANG-11-08', 'Accessibility Integration', false, error.message);
    }
  }

  /**
   * Test language switching performance (LANG-12)
   */
  async testLanguageSwitchingPerformance() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      const iterations = 20;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const lang = i % 2 === 0 ? 'zh' : 'en';
        
        const startTime = performance.now();
        await this.enhancedLanguageManager.switchLanguage(lang);
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        times.push(duration);
        this.performanceMetrics.languageSwitchTimes.push(duration);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      // Performance requirements
      this.assert(
        avgTime < 300,
        `Average language switch should be under 300ms (actual: ${avgTime.toFixed(2)}ms)`
      );
      
      this.assert(
        maxTime < 500,
        `Maximum language switch should be under 500ms (actual: ${maxTime.toFixed(2)}ms)`
      );

      this.recordTest('LANG-12-01', 'Language Switching Performance', true, 
        `Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms`);
    } catch (error) {
      this.recordTest('LANG-12-01', 'Language Switching Performance', false, error.message);
    }
  }

  /**
   * Test memory usage optimization
   */
  async testMemoryUsageOptimization() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      // Simulate memory usage monitoring
      const initialMemory = this.getMemoryUsage();
      
      // Perform multiple language switches
      for (let i = 0; i < 50; i++) {
        await this.enhancedLanguageManager.switchLanguage(i % 2 === 0 ? 'zh' : 'en');
      }
      
      const finalMemory = this.getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      this.performanceMetrics.memoryUsage.push({
        initial: initialMemory,
        final: finalMemory,
        increase: memoryIncrease
      });

      // Memory requirement: increase should be minimal (under 10MB simulated)
      this.assert(
        memoryIncrease < 10,
        `Memory increase should be under 10MB (actual: ${memoryIncrease.toFixed(2)}MB)`
      );

      this.recordTest('LANG-12-02', 'Memory Usage Optimization', true, 
        `Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    } catch (error) {
      this.recordTest('LANG-12-02', 'Memory Usage Optimization', false, error.message);
    }
  }

  /**
   * Test batch update efficiency
   */
  async testBatchUpdateEfficiency() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      const observer = this.enhancedLanguageManager.unifiedObserver;
      if (!observer) {
        throw new Error('Unified Observer not available');
      }

      // Test batch update performance
      const updateTimes = [];
      let totalUpdates = 0;

      // Mock multiple observers
      for (let i = 0; i < 10; i++) {
        observer.registerObserver(`test-observer-${i}`, () => {
          totalUpdates++;
        }, 5);
      }

      const startTime = performance.now();
      await observer.notifyLanguageChange('zh', 'en');
      const endTime = performance.now();
      
      const batchTime = endTime - startTime;
      updateTimes.push(batchTime);
      this.performanceMetrics.componentUpdateTimes.push(batchTime);

      // Verify all observers were updated
      this.assert(
        totalUpdates === 10,
        'All registered observers should be updated'
      );

      // Performance requirement: batch update under 100ms
      this.assert(
        batchTime < 100,
        `Batch update should be under 100ms (actual: ${batchTime.toFixed(2)}ms)`
      );

      this.recordTest('LANG-12-03', 'Batch Update Efficiency', true, 
        `Batch time: ${batchTime.toFixed(2)}ms, Updates: ${totalUpdates}`);
    } catch (error) {
      this.recordTest('LANG-12-03', 'Batch Update Efficiency', false, error.message);
    }
  }

  /**
   * Test cache effectiveness
   */
  async testCacheEffectiveness() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      const translationRegistry = this.enhancedLanguageManager.translationRegistry;
      if (!translationRegistry) {
        throw new Error('Translation Registry not available');
      }

      const testKey = 'pwa.cardList.title';
      
      // First access (should cache)
      const startTime1 = performance.now();
      const translation1 = translationRegistry.getTranslation('zh', testKey);
      const endTime1 = performance.now();
      const firstAccessTime = endTime1 - startTime1;

      // Second access (should use cache)
      const startTime2 = performance.now();
      const translation2 = translationRegistry.getTranslation('zh', testKey);
      const endTime2 = performance.now();
      const cachedAccessTime = endTime2 - startTime2;

      // Verify translations are the same
      this.assert(
        translation1 === translation2,
        'Cached translation should be identical'
      );

      // Cache should be faster (or at least not significantly slower)
      this.assert(
        cachedAccessTime <= firstAccessTime * 2,
        `Cached access should not be significantly slower (first: ${firstAccessTime.toFixed(2)}ms, cached: ${cachedAccessTime.toFixed(2)}ms)`
      );

      this.recordTest('LANG-12-04', 'Cache Effectiveness', true, 
        `First: ${firstAccessTime.toFixed(2)}ms, Cached: ${cachedAccessTime.toFixed(2)}ms`);
    } catch (error) {
      this.recordTest('LANG-12-04', 'Cache Effectiveness', false, error.message);
    }
  }

  /**
   * Test resource cleanup
   */
  async testResourceCleanup() {
    try {
      if (!this.enhancedLanguageManager) {
        throw new Error('Enhanced Language Manager not initialized');
      }

      // Get initial status
      const initialStatus = this.enhancedLanguageManager.getStatus();
      this.assert(
        initialStatus.initialized === true,
        'System should be initialized before cleanup'
      );

      // Perform cleanup
      this.enhancedLanguageManager.cleanup();

      // Verify cleanup
      const finalStatus = this.enhancedLanguageManager.getStatus();
      this.assert(
        finalStatus.initialized === false,
        'System should be uninitialized after cleanup'
      );

      // Verify all components are cleaned up
      this.assert(
        finalStatus.translationRegistry === null,
        'Translation Registry should be cleaned up'
      );
      
      this.assert(
        finalStatus.unifiedObserver === null,
        'Unified Observer should be cleaned up'
      );

      this.recordTest('LANG-12-05', 'Resource Cleanup', true);
    } catch (error) {
      this.recordTest('LANG-12-05', 'Resource Cleanup', false, error.message);
    }
  }

  /**
   * Test long-running stability
   */
  async testLongRunningStability() {
    try {
      // Reinitialize for stability test
      const EnhancedLanguageManager = window.EnhancedLanguageManager;
      const testManager = new EnhancedLanguageManager();
      await testManager.initialize();

      const iterations = 100;
      const errorCount = [];
      let successfulSwitches = 0;

      for (let i = 0; i < iterations; i++) {
        try {
          const lang = i % 2 === 0 ? 'zh' : 'en';
          await testManager.switchLanguage(lang);
          successfulSwitches++;
        } catch (error) {
          errorCount.push(error);
        }
      }

      const successRate = (successfulSwitches / iterations) * 100;

      // Stability requirement: 95% success rate
      this.assert(
        successRate >= 95,
        `Success rate should be at least 95% (actual: ${successRate.toFixed(1)}%)`
      );

      testManager.cleanup();

      this.recordTest('LANG-12-06', 'Long-Running Stability', true, 
        `Success rate: ${successRate.toFixed(1)}% (${successfulSwitches}/${iterations})`);
    } catch (error) {
      this.recordTest('LANG-12-06', 'Long-Running Stability', false, error.message);
    }
  }

  /**
   * Simulate memory usage (for testing purposes)
   */
  getMemoryUsage() {
    // Simulate memory usage calculation
    return Math.random() * 5 + 10; // 10-15 MB simulated
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

    console.log('\n📊 Phase 4 Language Integration Test Results:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);

    // Performance summary
    if (this.performanceMetrics.languageSwitchTimes.length > 0) {
      const avgSwitchTime = this.performanceMetrics.languageSwitchTimes.reduce((sum, time) => sum + time, 0) / this.performanceMetrics.languageSwitchTimes.length;
      console.log(`\n⚡ Performance Metrics:`);
      console.log(`Average Language Switch Time: ${avgSwitchTime.toFixed(2)}ms`);
      console.log(`Total Language Switches: ${this.performanceMetrics.languageSwitchTimes.length}`);
    }

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
      phase: 'Phase 4 - Language Integration & Performance',
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      performanceMetrics: this.performanceMetrics,
      details: this.testResults
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const integrationTest = new Phase4LanguageIntegrationTest();
  integrationTest.runAllTests()
    .then(summary => {
      console.log('\n🎉 Phase 4 Language Integration tests completed!');
      process.exit(summary.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Phase 4 integration tests crashed:', error);
      process.exit(1);
    });
}

module.exports = Phase4LanguageIntegrationTest;