/**
 * Language Switching End-to-End Test Suite
 * Complete workflow testing for unified language switching architecture
 * 
 * @version 3.1.4-language-architecture
 * @author test-coverage-generator
 * @since 2025-08-06
 * 
 * E2E Test Coverage:
 * - Complete language switching workflows
 * - Cross-component integration
 * - Real-world usage scenarios
 * - Performance under load
 * - Error recovery scenarios
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Mock complete browser environment for E2E testing
global.window = {
  localStorage: {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; },
    clear: function() { this.data = {}; }
  },
  fetch: sinon.stub(),
  performance: { 
    now: () => Date.now(),
    mark: sinon.stub(),
    measure: sinon.stub()
  },
  requestAnimationFrame: (callback) => setTimeout(callback, 16),
  cancelAnimationFrame: clearTimeout
};

global.document = {
  documentElement: { 
    lang: 'zh-TW', 
    dir: 'ltr',
    setAttribute: function(attr, value) { this[attr] = value; }
  },
  getElementById: sinon.stub().callsFake((id) => ({
    id,
    setAttribute: sinon.stub(),
    getAttribute: sinon.stub().returns(null),
    textContent: '',
    innerHTML: '',
    classList: { 
      contains: sinon.stub().returns(false),
      add: sinon.stub(),
      remove: sinon.stub()
    },
    dataset: {},
    parentElement: null,
    isConnected: true,
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub()
  })),
  querySelectorAll: sinon.stub().returns([]),
  querySelector: sinon.stub().returns(null),
  body: {
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub()
  },
  createElement: sinon.stub().callsFake((tag) => ({
    tagName: tag.toUpperCase(),
    setAttribute: sinon.stub(),
    getAttribute: sinon.stub(),
    appendChild: sinon.stub(),
    removeChild: sinon.stub(),
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add: sinon.stub(),
      remove: sinon.stub(),
      contains: sinon.stub().returns(false)
    }
  }))
};

global.navigator = { 
  language: 'zh-TW',
  languages: ['zh-TW', 'zh', 'en-US', 'en']
};

global.MutationObserver = class {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Load modules
const TranslationRegistry = require('../../pwa-card-storage/src/core/translation-registry.js');
const UnifiedLanguageObserver = require('../../pwa-card-storage/src/core/unified-language-observer.js');
const EnhancedLanguageManager = require('../../pwa-card-storage/src/core/enhanced-language-manager.js');

describe('Language Switching E2E Test Suite', function() {
  this.timeout(15000);

  let testEnvironment;

  beforeEach(async function() {
    // Reset global state
    global.window.localStorage.clear();
    global.window.fetch.reset();
    
    // Setup fetch mocks for accessibility translations
    global.window.fetch
      .withArgs(sinon.match(/accessibility-zh\.json/))
      .resolves({
        ok: true,
        json: async () => ({
          ariaLabels: {
            systemNotifications: '系統通知',
            closeNotification: '關閉通知',
            closeModal: '關閉對話框',
            languageToggle: '語言切換',
            themeToggle: '主題切換'
          },
          screenReaderTexts: {
            languageChanged: '語言已切換至中文',
            modalOpened: '對話框已開啟',
            modalClosed: '對話框已關閉'
          },
          formLabels: {
            searchCards: '搜尋名片',
            filterCards: '篩選名片',
            importCards: '匯入名片'
          },
          placeholders: {
            searchInput: '請輸入搜尋關鍵字',
            filterInput: '請輸入篩選條件'
          },
          validationMessages: {
            required: '此欄位為必填',
            invalidFormat: '格式不正確'
          },
          statusMessages: {
            loading: '載入中',
            saving: '儲存中',
            saved: '已儲存',
            error: '發生錯誤'
          }
        })
      })
      .withArgs(sinon.match(/accessibility-en\.json/))
      .resolves({
        ok: true,
        json: async () => ({
          ariaLabels: {
            systemNotifications: 'System Notifications',
            closeNotification: 'Close Notification',
            closeModal: 'Close Dialog',
            languageToggle: 'Language Toggle',
            themeToggle: 'Theme Toggle'
          },
          screenReaderTexts: {
            languageChanged: 'Language has been changed to English',
            modalOpened: 'Dialog has been opened',
            modalClosed: 'Dialog has been closed'
          },
          formLabels: {
            searchCards: 'Search Cards',
            filterCards: 'Filter Cards',
            importCards: 'Import Cards'
          },
          placeholders: {
            searchInput: 'Enter search keywords',
            filterInput: 'Enter filter criteria'
          },
          validationMessages: {
            required: 'This field is required',
            invalidFormat: 'Invalid format'
          },
          statusMessages: {
            loading: 'Loading',
            saving: 'Saving',
            saved: 'Saved',
            error: 'Error occurred'
          }
        })
      });

    // Create test environment
    testEnvironment = new E2ETestEnvironment();
    await testEnvironment.setup();
  });

  afterEach(async function() {
    if (testEnvironment) {
      await testEnvironment.teardown();
    }
  });

  describe('Complete Language Switching Workflows', function() {
    it('TC-E2E-001: Should complete full application language switch', async function() {
      const { languageManager, mockComponents } = testEnvironment;

      // Initial state verification
      expect(languageManager.getCurrentLanguage()).to.equal('zh');
      expect(global.document.documentElement.lang).to.equal('zh-TW');

      // Perform language switch
      const result = await languageManager.switchLanguage('en');

      // Verify switch result
      expect(result).to.equal('en');
      expect(languageManager.getCurrentLanguage()).to.equal('en');
      expect(global.document.documentElement.lang).to.equal('en');

      // Verify all components were updated
      expect(mockComponents.securityAdapter.updateSecurityComponents).to.have.been.calledWith('en', 'zh');
      expect(mockComponents.pwaAdapter.updatePWAComponents).to.have.been.calledWith('en', 'zh');
      expect(mockComponents.accessibilityManager.updateAccessibilityAttributes).to.have.been.calledWith('en');

      // Verify persistence
      expect(global.window.localStorage.getItem('pwa-language')).to.equal('en');
    });

    it('TC-E2E-002: Should handle rapid language switching', async function() {
      const { languageManager } = testEnvironment;
      const switchSequence = ['en', 'zh', 'en', 'zh', 'en'];
      const results = [];

      for (const lang of switchSequence) {
        const result = await languageManager.switchLanguage(lang);
        results.push(result);
        
        // Verify immediate state consistency
        expect(languageManager.getCurrentLanguage()).to.equal(lang);
        expect(global.document.documentElement.lang).to.equal(lang === 'zh' ? 'zh-TW' : 'en');
      }

      // Verify all switches were successful
      expect(results).to.deep.equal(switchSequence);
    });

    it('TC-E2E-003: Should maintain state consistency across page reload simulation', async function() {
      const { languageManager } = testEnvironment;

      // Switch to English
      await languageManager.switchLanguage('en');
      expect(global.window.localStorage.getItem('pwa-language')).to.equal('en');

      // Simulate page reload by creating new manager
      const newEnvironment = new E2ETestEnvironment();
      await newEnvironment.setup();

      // Verify language is restored from localStorage
      expect(newEnvironment.languageManager.getCurrentLanguage()).to.equal('en');
      
      await newEnvironment.teardown();
    });

    it('TC-E2E-004: Should handle concurrent user interactions', async function() {
      const { languageManager } = testEnvironment;

      // Simulate concurrent operations
      const operations = [
        languageManager.switchLanguage('en'),
        languageManager.getUnifiedText('pwa.appTitle'),
        languageManager.toggleLanguage(),
        languageManager.getUnifiedText('security.userCommunication.containerLabel'),
        languageManager.switchLanguage('zh')
      ];

      const results = await Promise.allSettled(operations);

      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result.status).to.equal('fulfilled', `Operation ${index} failed: ${result.reason}`);
      });

      // Final state should be consistent
      expect(languageManager.getCurrentLanguage()).to.be.oneOf(['zh', 'en']);
    });
  });

  describe('Cross-Component Integration', function() {
    it('TC-E2E-005: Should synchronize all UI components', async function() {
      const { languageManager, mockComponents } = testEnvironment;

      // Switch language and verify all components are updated
      await languageManager.switchLanguage('en');

      // Verify security components
      expect(mockComponents.securityAdapter.updateSecurityComponents).to.have.been.called;
      
      // Verify PWA UI components
      expect(mockComponents.pwaAdapter.updatePWAComponents).to.have.been.called;
      
      // Verify accessibility components
      expect(mockComponents.accessibilityManager.updateAccessibilityAttributes).to.have.been.called;

      // Verify component states are synchronized
      const status = languageManager.getStatus();
      expect(status.currentLanguage).to.equal('en');
    });

    it('TC-E2E-006: Should handle component update failures gracefully', async function() {
      const { languageManager, mockComponents } = testEnvironment;

      // Mock one component to fail
      mockComponents.securityAdapter.updateSecurityComponents.rejects(new Error('Security update failed'));

      // Language switch should still succeed for other components
      const result = await languageManager.switchLanguage('en');
      expect(result).to.equal('en');

      // Other components should still be updated
      expect(mockComponents.pwaAdapter.updatePWAComponents).to.have.been.called;
      expect(mockComponents.accessibilityManager.updateAccessibilityAttributes).to.have.been.called;
    });

    it('TC-E2E-007: Should maintain translation consistency across components', async function() {
      const { languageManager } = testEnvironment;

      // Test translations in different categories
      const testKeys = [
        'pwa.appTitle',
        'security.userCommunication.containerLabel',
        'accessibility.ariaLabels.systemNotifications'
      ];

      for (const lang of ['zh', 'en']) {
        await languageManager.switchLanguage(lang);

        for (const key of testKeys) {
          const translation = languageManager.getUnifiedText(key);
          
          expect(translation).to.be.a('string');
          expect(translation.length).to.be.greaterThan(0);
          expect(translation).to.not.equal(key); // Should not return key as fallback
        }
      }
    });
  });

  describe('Real-World Usage Scenarios', function() {
    it('TC-E2E-008: Should handle user workflow: Browse -> Switch Language -> Continue', async function() {
      const { languageManager } = testEnvironment;

      // Step 1: User browsing in Chinese (default)
      expect(languageManager.getCurrentLanguage()).to.equal('zh');
      let appTitle = languageManager.getUnifiedText('pwa.appTitle');
      expect(appTitle).to.equal('數位名片收納');

      // Step 2: User switches to English
      await languageManager.switchLanguage('en');
      appTitle = languageManager.getUnifiedText('pwa.appTitle');
      expect(appTitle).to.equal('Digital Card Hub');

      // Step 3: User continues browsing in English
      const containerLabel = languageManager.getUnifiedText('security.userCommunication.containerLabel');
      expect(containerLabel).to.equal('System Notifications');

      // Step 4: User switches back to Chinese
      await languageManager.switchLanguage('zh');
      const zhContainerLabel = languageManager.getUnifiedText('security.userCommunication.containerLabel');
      expect(zhContainerLabel).to.equal('系統通知');
    });

    it('TC-E2E-009: Should handle accessibility user workflow', async function() {
      const { languageManager } = testEnvironment;

      // Accessibility user switches language
      await languageManager.switchLanguage('en');

      // Verify accessibility attributes are updated
      expect(global.document.documentElement.lang).to.equal('en');

      // Verify screen reader texts are available
      const screenReaderText = languageManager.getUnifiedText('accessibility.screenReaderTexts.languageChanged');
      expect(screenReaderText).to.include('English');

      // Verify ARIA labels are updated
      const ariaLabel = languageManager.getUnifiedText('accessibility.ariaLabels.systemNotifications');
      expect(ariaLabel).to.equal('System Notifications');
    });

    it('TC-E2E-010: Should handle mobile device simulation', async function() {
      const { languageManager } = testEnvironment;

      // Simulate mobile viewport constraints
      global.window.innerWidth = 375;
      global.window.innerHeight = 667;

      // Test language switching on mobile
      await languageManager.switchLanguage('en');
      expect(languageManager.getCurrentLanguage()).to.equal('en');

      // Test touch interactions (simulated)
      await languageManager.toggleLanguage();
      expect(languageManager.getCurrentLanguage()).to.equal('zh');

      // Verify mobile-specific translations
      const mobileText = languageManager.getUnifiedText('pwa.languageToggle');
      expect(mobileText).to.be.a('string');
    });
  });

  describe('Performance Under Load', function() {
    it('TC-E2E-011: Should maintain performance with multiple rapid switches', async function() {
      const { languageManager } = testEnvironment;
      const iterations = 50;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const lang = i % 2 === 0 ? 'zh' : 'en';
        
        const startTime = Date.now();
        await languageManager.switchLanguage(lang);
        const endTime = Date.now();
        
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      // Performance should not degrade significantly
      expect(avgTime).to.be.lessThan(300, `Average time ${avgTime}ms exceeds threshold`);
      expect(maxTime).to.be.lessThan(1000, `Maximum time ${maxTime}ms exceeds threshold`);

      // Performance should be consistent (no significant outliers)
      const outliers = times.filter(time => time > avgTime * 3);
      expect(outliers.length).to.be.lessThan(iterations * 0.1, 'Too many performance outliers');
    });

    it('TC-E2E-012: Should handle memory pressure simulation', async function() {
      const { languageManager } = testEnvironment;

      // Simulate memory pressure by creating many objects
      const memoryPressure = [];
      for (let i = 0; i < 1000; i++) {
        memoryPressure.push(new Array(1000).fill(`data-${i}`));
      }

      // Language switching should still work under memory pressure
      const startTime = Date.now();
      await languageManager.switchLanguage('en');
      const endTime = Date.now();

      expect(languageManager.getCurrentLanguage()).to.equal('en');
      expect(endTime - startTime).to.be.lessThan(1000, 'Language switch too slow under memory pressure');

      // Cleanup
      memoryPressure.length = 0;
    });

    it('TC-E2E-013: Should handle concurrent user sessions simulation', async function() {
      const sessions = [];

      // Create multiple "user sessions"
      for (let i = 0; i < 5; i++) {
        const session = new E2ETestEnvironment();
        await session.setup();
        sessions.push(session);
      }

      // Each session switches language independently
      const promises = sessions.map(async (session, index) => {
        const lang = index % 2 === 0 ? 'en' : 'zh';
        return session.languageManager.switchLanguage(lang);
      });

      const results = await Promise.all(promises);

      // All sessions should complete successfully
      results.forEach((result, index) => {
        const expectedLang = index % 2 === 0 ? 'en' : 'zh';
        expect(result).to.equal(expectedLang);
      });

      // Cleanup sessions
      for (const session of sessions) {
        await session.teardown();
      }
    });
  });

  describe('Error Recovery Scenarios', function() {
    it('TC-E2E-014: Should recover from translation loading failures', async function() {
      const { languageManager } = testEnvironment;

      // Mock translation loading failure
      global.window.fetch.withArgs(sinon.match(/accessibility-en\.json/)).rejects(new Error('Network error'));

      // Language switch should still work with fallback
      const result = await languageManager.switchLanguage('en');
      expect(result).to.equal('en');

      // Should use fallback translations
      const fallbackText = languageManager.getUnifiedText('accessibility.ariaLabels.systemNotifications');
      expect(fallbackText).to.be.a('string');
    });

    it('TC-E2E-015: Should handle localStorage corruption', async function() {
      const { languageManager } = testEnvironment;

      // Corrupt localStorage
      global.window.localStorage.setItem('pwa-language', 'invalid-language');

      // Create new manager (simulates page reload)
      const newEnvironment = new E2ETestEnvironment();
      await newEnvironment.setup();

      // Should fallback to browser language detection
      expect(newEnvironment.languageManager.getCurrentLanguage()).to.be.oneOf(['zh', 'en']);

      await newEnvironment.teardown();
    });

    it('TC-E2E-016: Should recover from component initialization failures', async function() {
      // Mock component initialization failure
      const originalAccessibilityManager = global.window.AccessibilityLanguageManager;
      global.window.AccessibilityLanguageManager = sinon.stub().throws(new Error('Init failed'));

      try {
        const failingEnvironment = new E2ETestEnvironment();
        await failingEnvironment.setup();
        
        // Should still be able to switch languages
        const result = await failingEnvironment.languageManager.switchLanguage('en');
        expect(result).to.equal('en');

        await failingEnvironment.teardown();
      } finally {
        // Restore original
        global.window.AccessibilityLanguageManager = originalAccessibilityManager;
      }
    });

    it('TC-E2E-017: Should handle browser API unavailability', async function() {
      // Mock missing browser APIs
      const originalLocalStorage = global.window.localStorage;
      delete global.window.localStorage;

      try {
        const environment = new E2ETestEnvironment();
        await environment.setup();

        // Should still work without localStorage
        const result = await environment.languageManager.switchLanguage('en');
        expect(result).to.equal('en');

        await environment.teardown();
      } finally {
        // Restore localStorage
        global.window.localStorage = originalLocalStorage;
      }
    });
  });

  describe('Integration with External Systems', function() {
    it('TC-E2E-018: Should integrate with PWA service worker', async function() {
      const { languageManager } = testEnvironment;

      // Mock service worker
      global.navigator.serviceWorker = {
        ready: Promise.resolve({
          postMessage: sinon.stub()
        })
      };

      await languageManager.switchLanguage('en');

      // Verify service worker integration (if implemented)
      expect(languageManager.getCurrentLanguage()).to.equal('en');
    });

    it('TC-E2E-019: Should handle offline scenarios', async function() {
      const { languageManager } = testEnvironment;

      // Mock offline state
      global.navigator.onLine = false;
      global.window.fetch.rejects(new Error('Network unavailable'));

      // Language switching should still work offline
      const result = await languageManager.switchLanguage('en');
      expect(result).to.equal('en');

      // Should use cached translations
      const cachedText = languageManager.getUnifiedText('pwa.appTitle');
      expect(cachedText).to.be.a('string');

      // Restore online state
      global.navigator.onLine = true;
    });
  });
});

/**
 * E2E Test Environment Helper Class
 */
class E2ETestEnvironment {
  constructor() {
    this.languageManager = null;
    this.mockComponents = {};
  }

  async setup() {
    // Setup mock components
    this.mockComponents = {
      translationRegistry: {
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().callsFake((lang, key) => {
          // Return realistic translations based on key
          const translations = {
            'zh': {
              'pwa.appTitle': '數位名片收納',
              'pwa.languageToggle': '語言切換',
              'security.userCommunication.containerLabel': '系統通知',
              'accessibility.ariaLabels.systemNotifications': '系統通知',
              'accessibility.screenReaderTexts.languageChanged': '語言已切換至中文'
            },
            'en': {
              'pwa.appTitle': 'Digital Card Hub',
              'pwa.languageToggle': 'Language Toggle',
              'security.userCommunication.containerLabel': 'System Notifications',
              'accessibility.ariaLabels.systemNotifications': 'System Notifications',
              'accessibility.screenReaderTexts.languageChanged': 'Language has been changed to English'
            }
          };
          return translations[lang]?.[key] || key;
        }),
        getCacheStats: sinon.stub().returns({ size: 10 }),
        clearCache: sinon.stub(),
        validateTranslations: sinon.stub().returns({ valid: true, missing: [] })
      },

      unifiedObserver: {
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 3 }),
        clearAllObservers: sinon.stub(),
        getPerformanceMetrics: sinon.stub().returns({ averageUpdateTime: 50 })
      },

      accessibilityManager: {
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          ariaLabelsUpdated: true,
          screenReaderSupport: true
        }),
        cleanup: sinon.stub()
      },

      securityAdapter: {
        initialize: sinon.stub().resolves(),
        updateSecurityComponents: sinon.stub().resolves(),
        cleanup: sinon.stub()
      },

      pwaAdapter: {
        initialize: sinon.stub().resolves(),
        updatePWAComponents: sinon.stub().resolves(),
        cleanup: sinon.stub()
      }
    };

    // Setup global constructors
    global.window.TranslationRegistry = sinon.stub().returns(this.mockComponents.translationRegistry);
    global.window.UnifiedLanguageObserver = sinon.stub().returns(this.mockComponents.unifiedObserver);
    global.window.AccessibilityLanguageManager = sinon.stub().returns(this.mockComponents.accessibilityManager);
    global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns(this.mockComponents.securityAdapter);
    global.window.PWAUILanguageAdapter = sinon.stub().returns(this.mockComponents.pwaAdapter);

    // Create and initialize language manager
    this.languageManager = new EnhancedLanguageManager();
    await this.languageManager.initialize();
  }

  async teardown() {
    if (this.languageManager) {
      this.languageManager.cleanup();
      this.languageManager = null;
    }

    // Reset mocks
    Object.values(this.mockComponents).forEach(component => {
      Object.values(component).forEach(method => {
        if (typeof method.reset === 'function') {
          method.reset();
        }
      });
    });

    this.mockComponents = {};
  }
}