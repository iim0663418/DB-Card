/**
 * Phase 2 Security Integration Smoke Test
 * Tests LANG-06, LANG-07, LANG-08 implementation
 * Validates security component integration with unified language management
 */

// Mock DOM environment for Node.js testing
if (typeof window === 'undefined') {
  global.window = {
    languageManager: null,
    userCommunication: null,
    securityOnboarding: null,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    document: {
      createElement: () => ({ 
        setAttribute: () => {}, 
        appendChild: () => {},
        innerHTML: '',
        textContent: '',
        classList: { add: () => {}, remove: () => {}, contains: () => false }
      }),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      head: { appendChild: () => {} },
      body: { appendChild: () => {} },
      documentElement: { lang: 'zh' },
      addEventListener: () => {},
      dispatchEvent: () => {}
    },
    navigator: { language: 'zh-TW' },
    console: console
  };
  global.document = global.window.document;
  global.localStorage = global.window.localStorage;
  global.navigator = global.window.navigator;
}

// Test suite
class Phase2SecurityIntegrationSmokeTest {
  constructor() {
    this.testResults = [];
    this.mockLanguageManager = null;
    this.mockUserCommunication = null;
    this.mockSecurityOnboarding = null;
  }

  /**
   * Run all smoke tests
   */
  async runAllTests() {
    console.log('🧪 Starting Phase 2 Security Integration Smoke Tests...\n');

    try {
      await this.setupMocks();
      await this.testUserCommunicationIntegration();
      await this.testSecurityOnboardingIntegration();
      await this.testPWAUIAdapterIntegration();
      await this.testLanguageSwitchingFlow();
      await this.testErrorHandling();
      
      this.printResults();
      return this.testResults.every(result => result.passed);
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return false;
    }
  }

  /**
   * Setup mock objects
   */
  async setupMocks() {
    // Mock Enhanced Language Manager
    this.mockLanguageManager = {
      currentLanguage: 'zh',
      observers: new Map(),
      
      getCurrentLanguage() { return this.currentLanguage; },
      
      getUnifiedText(key, lang) {
        const translations = {
          zh: {
            'security.userCommunication.containerLabel': '系統通知',
            'security.userCommunication.actions.close': '關閉通知',
            'security.onboarding.title': '安全功能設定',
            'pwa.appTitle': '數位名片收納'
          },
          en: {
            'security.userCommunication.containerLabel': 'System Notifications',
            'security.userCommunication.actions.close': 'Close Notification',
            'security.onboarding.title': 'Security Features Setup',
            'pwa.appTitle': 'Digital Card Hub'
          }
        };
        return translations[lang || this.currentLanguage]?.[key] || key;
      },
      
      registerObserver(id, observer) {
        this.observers.set(id, observer);
      },
      
      unregisterObserver(id) {
        this.observers.delete(id);
      },
      
      async switchLanguage(lang) {
        const oldLang = this.currentLanguage;
        this.currentLanguage = lang;
        
        // Notify observers
        for (const [id, observer] of this.observers) {
          if (observer.updateCallback) {
            await observer.updateCallback(lang, oldLang);
          }
        }
        return lang;
      }
    };

    window.languageManager = this.mockLanguageManager;

    this.addTestResult('Setup Mocks', true, 'Mock language manager created successfully');
  }

  /**
   * Test user communication integration (LANG-06)
   */
  async testUserCommunicationIntegration() {
    try {
      // Load UserCommunication class
      const UserCommunicationClass = require('../../src/security/ClientSideUserCommunication.js');
      
      // Create instance
      const userComm = new UserCommunicationClass();
      
      // Test language detection
      const detectedLang = userComm.detectLanguage();
      this.addTestResult('User Communication - Language Detection', 
        detectedLang === 'zh', 
        `Detected language: ${detectedLang}`);

      // Test localized text retrieval
      const containerLabel = userComm.getLocalizedText('containerLabel');
      this.addTestResult('User Communication - Localized Text', 
        containerLabel === '系統通知', 
        `Container label: ${containerLabel}`);

      // Test language observer setup
      userComm.setupLanguageObserver();
      const hasObserver = this.mockLanguageManager.observers.has('user-communication');
      this.addTestResult('User Communication - Observer Registration', 
        hasObserver, 
        `Observer registered: ${hasObserver}`);

      // Test language switching
      await this.mockLanguageManager.switchLanguage('en');
      const englishLabel = userComm.getLocalizedText('containerLabel');
      this.addTestResult('User Communication - Language Switch', 
        englishLabel === 'System Notifications', 
        `English label: ${englishLabel}`);

      this.mockUserCommunication = userComm;

    } catch (error) {
      this.addTestResult('User Communication Integration', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test security onboarding integration (LANG-07)
   */
  async testSecurityOnboardingIntegration() {
    try {
      // Load SecurityOnboarding class
      const SecurityOnboardingClass = require('../../src/security/ClientSideSecurityOnboarding.js');
      
      // Create instance
      const securityOnboarding = new SecurityOnboardingClass();
      
      // Test language detection
      const detectedLang = securityOnboarding.detectLanguage();
      this.addTestResult('Security Onboarding - Language Detection', 
        detectedLang === 'en', // Should be 'en' from previous test
        `Detected language: ${detectedLang}`);

      // Test localized features
      const features = securityOnboarding.getLocalizedFeatures();
      const hasWebAuthn = features.webauthn && features.webauthn.name;
      this.addTestResult('Security Onboarding - Localized Features', 
        hasWebAuthn, 
        `WebAuthn feature name: ${features.webauthn?.name}`);

      // Test localized text
      const title = securityOnboarding.getLocalizedText('title');
      this.addTestResult('Security Onboarding - Localized Text', 
        title === 'Security Features Setup', 
        `Title: ${title}`);

      // Test language switching without modal visible
      securityOnboarding.currentLanguage = 'zh';
      securityOnboarding.updateLanguage();
      const chineseTitle = securityOnboarding.getLocalizedText('title');
      this.addTestResult('Security Onboarding - Language Switch', 
        chineseTitle === '安全功能設定', 
        `Chinese title: ${chineseTitle}`);

      this.mockSecurityOnboarding = securityOnboarding;

    } catch (error) {
      this.addTestResult('Security Onboarding Integration', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test PWA UI adapter integration (LANG-08)
   */
  async testPWAUIAdapterIntegration() {
    try {
      // Load PWA UI Adapter class
      const PWAUIAdapterClass = require('../../../pwa-card-storage/src/core/pwa-ui-language-adapter.js');
      
      // Create instance
      const pwaAdapter = new PWAUIAdapterClass();
      
      // Test initialization
      await pwaAdapter.initialize();
      this.addTestResult('PWA UI Adapter - Initialization', 
        pwaAdapter.initialized, 
        `Initialized: ${pwaAdapter.initialized}`);

      // Test component registration
      const status = pwaAdapter.getStatus();
      const hasComponents = status.registeredComponents.length > 0;
      this.addTestResult('PWA UI Adapter - Component Registration', 
        hasComponents, 
        `Registered components: ${status.registeredComponents.join(', ')}`);

      // Test translation retrieval
      const translation = pwaAdapter.getTranslation('pwa.appTitle', 'zh');
      this.addTestResult('PWA UI Adapter - Translation Retrieval', 
        translation === '數位名片收納', 
        `Translation: ${translation}`);

      // Test component update (mock)
      await pwaAdapter.updatePWAComponents('en', 'zh');
      this.addTestResult('PWA UI Adapter - Component Update', 
        true, 
        'Component update completed without errors');

    } catch (error) {
      this.addTestResult('PWA UI Adapter Integration', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test complete language switching flow
   */
  async testLanguageSwitchingFlow() {
    try {
      // Test unified language switching
      await this.mockLanguageManager.switchLanguage('zh');
      
      // Verify all components updated
      const userCommLang = this.mockUserCommunication?.currentLanguage;
      const onboardingLang = this.mockSecurityOnboarding?.currentLanguage;
      
      this.addTestResult('Language Switching Flow - User Communication', 
        userCommLang === 'zh', 
        `User communication language: ${userCommLang}`);

      this.addTestResult('Language Switching Flow - Security Onboarding', 
        onboardingLang === 'zh', 
        `Security onboarding language: ${onboardingLang}`);

      // Test English switch
      await this.mockLanguageManager.switchLanguage('en');
      
      const userCommLangEn = this.mockUserCommunication?.currentLanguage;
      this.addTestResult('Language Switching Flow - English Switch', 
        userCommLangEn === 'en', 
        `User communication English: ${userCommLangEn}`);

    } catch (error) {
      this.addTestResult('Language Switching Flow', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    try {
      // Test invalid language
      await this.mockLanguageManager.switchLanguage('invalid');
      this.addTestResult('Error Handling - Invalid Language', 
        this.mockLanguageManager.currentLanguage !== 'invalid', 
        `Language after invalid switch: ${this.mockLanguageManager.currentLanguage}`);

      // Test missing translation
      const missingTranslation = this.mockLanguageManager.getUnifiedText('nonexistent.key', 'zh');
      this.addTestResult('Error Handling - Missing Translation', 
        missingTranslation === 'nonexistent.key', 
        `Missing translation fallback: ${missingTranslation}`);

      // Test cleanup
      if (this.mockUserCommunication?.cleanup) {
        this.mockUserCommunication.cleanup();
      }
      if (this.mockSecurityOnboarding?.cleanup) {
        this.mockSecurityOnboarding.cleanup();
      }
      
      this.addTestResult('Error Handling - Cleanup', 
        true, 
        'Component cleanup completed successfully');

    } catch (error) {
      this.addTestResult('Error Handling', false, `Error: ${error.message}`);
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n📊 Phase 2 Security Integration Test Results:');
    console.log('=' .repeat(60));

    let passed = 0;
    let failed = 0;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      
      if (result.passed) passed++;
      else failed++;
    });

    console.log('=' .repeat(60));
    console.log(`📈 Summary: ${passed} passed, ${failed} failed`);
    console.log(`🎯 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('🎉 All Phase 2 security integration tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new Phase2SecurityIntegrationSmokeTest();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = Phase2SecurityIntegrationSmokeTest;