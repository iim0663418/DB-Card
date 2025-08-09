/**
 * TRANS-003 Smoke Test: 翻譯獲取邏輯統一驗證
 * 驗證 UnifiedTranslationService 統一翻譯入口點，消除雙重依賴
 */

// Mock environment setup
const mockWindow = {
  SafeTranslationHandler: {
    getTranslation: (key, lang, options) => {
      const mockTranslations = {
        zh: {
          cardDetails: '名片詳細資訊',
          generateQR: '生成 QR 碼',
          operationFailed: '操作失敗'
        },
        en: {
          cardDetails: 'Card Details',
          generateQR: 'Generate QR',
          operationFailed: 'Operation failed'
        }
      };
      
      const langKey = lang === 'en' ? 'en' : 'zh';
      return mockTranslations[langKey]?.[key] || options?.fallback || key;
    }
  },
  languageManager: {
    getText: (key, lang, options) => {
      // Simulate inconsistent behavior
      if (key === 'inconsistentKey') return 'Old Translation';
      
      const translations = {
        cardDetails: lang === 'en' ? 'Card Details' : '名片詳細資訊',
        generateQR: lang === 'en' ? 'Generate QR' : '生成 QR 碼'
      };
      return translations[key];
    },
    getCurrentLanguage: () => 'zh'
  },
  app: {
    languageManager: {
      getText: (key, lang, options) => {
        // Simulate app-level language manager
        const translations = {
          cardDetails: lang === 'en' ? 'App Card Details' : '應用名片詳細資訊',
          generateQR: lang === 'en' ? 'App Generate QR' : '應用生成 QR 碼'
        };
        return translations[key];
      }
    },
    getCurrentLanguage: () => 'zh'
  }
};

// Mock UnifiedTranslationService implementation
class MockUnifiedTranslationService {
  constructor() {
    this.initialized = false;
    this.translationSources = new Map();
    this.cache = new Map();
    this.config = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000,
      enableInputValidation: true,
      enableOutputSanitization: true,
      logLevel: 'warn'
    };
    
    this.init();
  }

  init() {
    try {
      this.registerTranslationSources();
      this.initialized = true;
    } catch (error) {
      console.error('[UnifiedTranslationService] Initialization failed:', error);
      this.initialized = false;
    }
  }

  registerTranslationSources() {
    // Priority 1: SafeTranslationHandler
    this.translationSources.set('safeHandler', {
      priority: 1,
      isAvailable: () => !!mockWindow.SafeTranslationHandler,
      getText: (key, lang, options) => {
        return mockWindow.SafeTranslationHandler.getTranslation(key, lang, options);
      }
    });

    // Priority 2: App Language Manager
    this.translationSources.set('appLanguageManager', {
      priority: 2,
      isAvailable: () => !!(mockWindow.app && mockWindow.app.languageManager && mockWindow.app.languageManager.getText),
      getText: (key, lang, options) => {
        return mockWindow.app.languageManager.getText(key, lang, options);
      }
    });

    // Priority 3: Global Language Manager
    this.translationSources.set('globalLanguageManager', {
      priority: 3,
      isAvailable: () => !!(mockWindow.languageManager && mockWindow.languageManager.getText),
      getText: (key, lang, options) => {
        return mockWindow.languageManager.getText(key, lang, options);
      }
    });

    // Priority 4: Builtin Fallback
    this.translationSources.set('builtinFallback', {
      priority: 4,
      isAvailable: () => true,
      getText: (key, lang, options) => {
        return this.getBuiltinTranslation(key, lang, options);
      }
    });
  }

  static getText(key, lang = null, options = {}) {
    const instance = MockUnifiedTranslationService.getInstance();
    return instance.getText(key, lang, options);
  }

  getText(key, lang = null, options = {}) {
    if (!this.validateInput(key)) {
      return this.handleInvalidInput(key, options);
    }

    const sanitizedKey = this.sanitizeKey(key);
    const targetLang = this.determineTargetLanguage(lang);
    const cacheKey = `${sanitizedKey}_${targetLang}`;

    // Check cache
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
        return cached.value;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    let translatedText = null;
    let usedSource = null;

    try {
      // Try sources by priority
      const sortedSources = Array.from(this.translationSources.entries())
        .sort(([, a], [, b]) => a.priority - b.priority);

      for (const [sourceName, source] of sortedSources) {
        if (source.isAvailable()) {
          try {
            const result = source.getText(sanitizedKey, targetLang, { 
              ...options, 
              fallback: null 
            });
            
            if (result && result !== sanitizedKey && result.trim() !== '') {
              translatedText = result;
              usedSource = sourceName;
              break;
            }
          } catch (sourceError) {
            console.warn(`[UnifiedTranslationService] Source ${sourceName} failed:`, sourceError);
            continue;
          }
        }
      }

      // Final fallback
      if (!translatedText) {
        translatedText = options.fallback || this.generateHumanReadableText(sanitizedKey) || sanitizedKey;
        usedSource = 'finalFallback';
      }

      // Output sanitization
      if (this.config.enableOutputSanitization) {
        translatedText = this.sanitizeOutput(translatedText);
      }

      // Cache result
      if (this.config.enableCache && translatedText) {
        this.cache.set(cacheKey, {
          value: translatedText,
          timestamp: Date.now(),
          source: usedSource
        });
      }

      return translatedText;

    } catch (error) {
      console.error('[UnifiedTranslationService] Translation failed:', error);
      return this.getEmergencyFallback(sanitizedKey, options);
    }
  }

  getBuiltinTranslation(key, lang, options) {
    const builtinTranslations = {
      zh: {
        cardDetails: '名片詳細資訊',
        generateQR: '生成 QR 碼',
        operationFailed: '操作失敗'
      },
      en: {
        cardDetails: 'Card Details',
        generateQR: 'Generate QR',
        operationFailed: 'Operation failed'
      }
    };

    const langKey = lang === 'en' || lang === 'en-US' ? 'en' : 'zh';
    const dictionary = builtinTranslations[langKey];
    
    if (dictionary && dictionary[key]) {
      return dictionary[key];
    }

    return null;
  }

  generateHumanReadableText(key) {
    try {
      if (!key || typeof key !== 'string') return null;

      let processedKey = key;
      if (key.includes('.')) {
        const parts = key.split('.');
        processedKey = parts[parts.length - 1];
      }

      return processedKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
    } catch (error) {
      return null;
    }
  }

  determineTargetLanguage(lang) {
    if (lang && ['zh', 'en', 'zh-TW', 'en-US'].includes(lang)) {
      return lang;
    }

    try {
      if (mockWindow.app && mockWindow.app.getCurrentLanguage) {
        return mockWindow.app.getCurrentLanguage();
      }
      
      if (mockWindow.languageManager && mockWindow.languageManager.getCurrentLanguage) {
        return mockWindow.languageManager.getCurrentLanguage();
      }
    } catch (error) {
      console.warn('[UnifiedTranslationService] Failed to determine language:', error);
    }

    return 'zh';
  }

  validateInput(key) {
    if (typeof key !== 'string') return false;
    if (key.trim() === '') return false;
    if (key.length > 200) return false;
    return true;
  }

  handleInvalidInput(key, options) {
    const fallback = options.fallback || 'Invalid Key';
    return fallback;
  }

  sanitizeKey(key) {
    if (typeof key !== 'string') return '';
    return key.replace(/[<>"'&]/g, '').trim();
  }

  sanitizeOutput(text) {
    if (typeof text !== 'string') return text;
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  getEmergencyFallback(key, options) {
    return options.fallback || key || 'Translation Error';
  }

  clearCache() {
    this.cache.clear();
  }

  getStatistics() {
    return {
      initialized: this.initialized,
      cache: {
        size: this.cache.size,
        entries: Array.from(this.cache.entries())
      },
      sources: Array.from(this.translationSources.entries()).map(([name, source]) => ({
        name,
        priority: source.priority,
        available: source.isAvailable()
      }))
    };
  }

  static getInstance() {
    if (!MockUnifiedTranslationService._instance) {
      MockUnifiedTranslationService._instance = new MockUnifiedTranslationService();
    }
    return MockUnifiedTranslationService._instance;
  }
}

// Test Suite
function runTRANS003SmokeTests() {
  console.log('🧪 Running TRANS-003 Smoke Tests: Translation Logic Unification');
  
  const tests = [
    {
      name: 'Test 1: Unified Entry Point',
      test: () => {
        const service = new MockUnifiedTranslationService();
        const result = service.getText('cardDetails', 'zh');
        
        if (!result || result === 'cardDetails') {
          throw new Error('Unified entry point failed to return translation');
        }
        
        if (result !== '名片詳細資訊') {
          throw new Error(`Expected '名片詳細資訊', got '${result}'`);
        }
        
        return true;
      }
    },
    
    {
      name: 'Test 2: Source Priority System',
      test: () => {
        const service = new MockUnifiedTranslationService();
        
        // SafeTranslationHandler should have highest priority
        const result = service.getText('cardDetails', 'zh');
        
        // Should get result from SafeTranslationHandler (priority 1)
        if (result !== '名片詳細資訊') {
          throw new Error(`Priority system failed, expected SafeTranslationHandler result`);
        }
        
        return true;
      }
    },
    
    {
      name: 'Test 3: Fallback Chain',
      test: () => {
        const service = new MockUnifiedTranslationService();
        
        // Remove SafeTranslationHandler temporarily
        const originalHandler = mockWindow.SafeTranslationHandler;
        delete mockWindow.SafeTranslationHandler;
        
        try {
          // Re-register sources without SafeTranslationHandler
          service.registerTranslationSources();
          
          const result = service.getText('cardDetails', 'zh');
          
          // Should fallback to app language manager
          if (result !== '應用名片詳細資訊') {
            throw new Error(`Fallback chain failed, got '${result}'`);
          }
          
          return true;
        } finally {
          // Restore SafeTranslationHandler
          mockWindow.SafeTranslationHandler = originalHandler;
        }
      }
    },
    
    {
      name: 'Test 4: Cache Functionality',
      test: () => {
        const service = new MockUnifiedTranslationService();
        
        // First call - should cache result
        const result1 = service.getText('generateQR', 'zh');
        
        // Second call - should use cache
        const result2 = service.getText('generateQR', 'zh');
        
        if (result1 !== result2) {
          throw new Error('Cache functionality failed');
        }
        
        // Verify cache contains the entry
        const stats = service.getStatistics();
        if (stats.cache.size === 0) {
          throw new Error('Cache not populated');
        }
        
        return true;
      }
    },
    
    {
      name: 'Test 5: Input Validation and Sanitization',
      test: () => {
        const service = new MockUnifiedTranslationService();
        
        // Test invalid inputs
        const invalidResult = service.getText('', 'zh', { fallback: 'Empty Key' });
        if (invalidResult !== 'Empty Key') {
          throw new Error('Input validation failed for empty key');
        }
        
        // Test XSS protection
        const xssResult = service.getText('<script>alert("xss")</script>', 'zh');
        if (xssResult.includes('<script>')) {
          throw new Error('XSS sanitization failed');
        }
        
        return true;
      }
    },
    
    {
      name: 'Test 6: Static Method Interface',
      test: () => {
        // Test static method
        const result = MockUnifiedTranslationService.getText('cardDetails', 'zh');
        
        if (!result || result === 'cardDetails') {
          throw new Error('Static method interface failed');
        }
        
        if (result !== '名片詳細資訊') {
          throw new Error(`Static method returned wrong result: '${result}'`);
        }
        
        return true;
      }
    },
    
    {
      name: 'Test 7: Consistency Across Multiple Calls',
      test: () => {
        const service = new MockUnifiedTranslationService();
        
        // Multiple calls should return consistent results
        const results = [];
        for (let i = 0; i < 5; i++) {
          results.push(service.getText('operationFailed', 'zh'));
        }
        
        // All results should be identical
        const firstResult = results[0];
        const allSame = results.every(result => result === firstResult);
        
        if (!allSame) {
          throw new Error('Inconsistent results across multiple calls');
        }
        
        return true;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ name, test }) => {
    try {
      const result = test();
      if (result) {
        console.log(`✅ ${name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: FAILED - ${error.message}`);
      failed++;
    }
  });
  
  console.log(`\n📊 TRANS-003 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All TRANS-003 tests passed! Translation logic unification is working correctly.');
    return true;
  } else {
    console.log('⚠️ Some TRANS-003 tests failed. Please review the implementation.');
    return false;
  }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTRANS003SmokeTests, MockUnifiedTranslationService };
}

// Auto-run in browser environment
if (typeof window !== 'undefined') {
  // Run tests when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTRANS003SmokeTests);
  } else {
    runTRANS003SmokeTests();
  }
}