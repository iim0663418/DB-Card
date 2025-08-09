/**
 * Translation Placeholder Fix Test
 * Tests that PWA homepage elements are properly translated and no placeholder text remains
 */

class TranslationPlaceholderFixTest {
  constructor() {
    this.testResults = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Run all translation placeholder tests
   */
  async runTests() {
    console.log('[Translation Test] Starting translation placeholder fix tests...');
    
    try {
      await this.testBasicTranslations();
      await this.testLanguageToggle();
      await this.testDOMUpdates();
      await this.testPlaceholderTexts();
      
      this.printResults();
      return this.failed === 0;
    } catch (error) {
      console.error('[Translation Test] Test suite failed:', error);
      return false;
    }
  }

  /**
   * Test basic translation functionality
   */
  async testBasicTranslations() {
    console.log('[Translation Test] Testing basic translations...');
    
    // Test Chinese translations
    this.assert(
      this.hasTranslation('zh-TW', 'welcome-title', '歡迎使用離線名片儲存'),
      'Chinese welcome title translation exists'
    );
    
    this.assert(
      this.hasTranslation('zh-TW', 'welcome-desc', '安全地儲存和管理您的數位名片，完全離線運作'),
      'Chinese welcome description translation exists'
    );
    
    // Test English translations
    this.assert(
      this.hasTranslation('en', 'welcome-title', 'Welcome to Offline Card Storage'),
      'English welcome title translation exists'
    );
    
    this.assert(
      this.hasTranslation('en', 'welcome-desc', 'Securely store and manage your digital cards, completely offline'),
      'English welcome description translation exists'
    );
  }

  /**
   * Test language toggle functionality
   */
  async testLanguageToggle() {
    console.log('[Translation Test] Testing language toggle...');
    
    if (window.SimplifiedLanguageManager) {
      const manager = new window.SimplifiedLanguageManager();
      await manager.initialize();
      
      // Test initial language
      const initialLang = manager.getCurrentLanguage();
      this.assert(
        ['zh-TW', 'en'].includes(initialLang),
        `Initial language is valid: ${initialLang}`
      );
      
      // Test language toggle
      const newLang = await manager.toggleLanguage();
      this.assert(
        newLang !== initialLang,
        `Language toggled from ${initialLang} to ${newLang}`
      );
      
      // Test toggle back
      const backLang = await manager.toggleLanguage();
      this.assert(
        backLang === initialLang,
        `Language toggled back to ${backLang}`
      );
    } else {
      this.assert(false, 'SimplifiedLanguageManager not available');
    }
  }

  /**
   * Test DOM element updates
   */
  async testDOMUpdates() {
    console.log('[Translation Test] Testing DOM updates...');
    
    // Create test DOM elements
    const testElements = [
      { id: 'welcome-title', expectedKey: 'welcome-title' },
      { id: 'welcome-desc', expectedKey: 'welcome-desc' },
      { id: 'app-title', expectedKey: 'app-title' },
      { id: 'app-subtitle', expectedKey: 'app-subtitle' }
    ];
    
    // Create temporary DOM elements for testing
    const testContainer = document.createElement('div');
    testContainer.id = 'translation-test-container';
    testContainer.style.display = 'none';
    
    testElements.forEach(({ id }) => {
      const element = document.createElement('div');
      element.id = id;
      element.textContent = 'Placeholder Text'; // This should be replaced
      testContainer.appendChild(element);
    });
    
    document.body.appendChild(testContainer);
    
    try {
      if (window.SimplifiedLanguageManager) {
        const manager = new window.SimplifiedLanguageManager();
        await manager.initialize();
        
        // Test DOM update
        manager.updateDOMElements('zh-TW');
        
        // Check if elements were updated
        testElements.forEach(({ id, expectedKey }) => {
          const element = document.getElementById(id);
          const hasPlaceholder = element.textContent === 'Placeholder Text';
          this.assert(
            !hasPlaceholder,
            `Element ${id} was updated from placeholder text`
          );
          
          const hasTranslation = element.textContent.length > 0 && 
                                element.textContent !== expectedKey;
          this.assert(
            hasTranslation,
            `Element ${id} has proper translation content`
          );
        });
        
        // Test English update
        manager.updateDOMElements('en');
        
        testElements.forEach(({ id }) => {
          const element = document.getElementById(id);
          const hasPlaceholder = element.textContent === 'Placeholder Text';
          this.assert(
            !hasPlaceholder,
            `Element ${id} was updated for English`
          );
        });
      } else {
        this.assert(false, 'SimplifiedLanguageManager not available for DOM testing');
      }
    } finally {
      // Cleanup test elements
      document.body.removeChild(testContainer);
    }
  }

  /**
   * Test placeholder text handling
   */
  async testPlaceholderTexts() {
    console.log('[Translation Test] Testing placeholder text handling...');
    
    // Create test input elements
    const testInputs = [
      { id: 'import-url', expectedKey: 'import-url-placeholder' },
      { id: 'card-search', expectedKey: 'card-search' }
    ];
    
    const testContainer = document.createElement('div');
    testContainer.id = 'placeholder-test-container';
    testContainer.style.display = 'none';
    
    testInputs.forEach(({ id }) => {
      const input = document.createElement('input');
      input.id = id;
      input.placeholder = 'Default Placeholder';
      testContainer.appendChild(input);
    });
    
    document.body.appendChild(testContainer);
    
    try {
      if (window.SimplifiedLanguageManager) {
        const manager = new window.SimplifiedLanguageManager();
        await manager.initialize();
        
        // Test placeholder update
        manager.updateDOMElements('zh-TW');
        
        testInputs.forEach(({ id }) => {
          const input = document.getElementById(id);
          const hasDefaultPlaceholder = input.placeholder === 'Default Placeholder';
          this.assert(
            !hasDefaultPlaceholder,
            `Input ${id} placeholder was updated from default`
          );
        });
      } else {
        this.assert(false, 'SimplifiedLanguageManager not available for placeholder testing');
      }
    } finally {
      // Cleanup test elements
      document.body.removeChild(testContainer);
    }
  }

  /**
   * Check if a translation exists
   */
  hasTranslation(language, key, expectedText) {
    if (window.SimplifiedLanguageManager) {
      const manager = new window.SimplifiedLanguageManager();
      const translations = manager.translations.get(language);
      
      if (translations && translations[key]) {
        return translations[key] === expectedText;
      }
    }
    return false;
  }

  /**
   * Assert a condition and record the result
   */
  assert(condition, message) {
    if (condition) {
      this.passed++;
      console.log(`✅ ${message}`);
    } else {
      this.failed++;
      console.error(`❌ ${message}`);
    }
    
    this.testResults.push({
      passed: condition,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n[Translation Test] Test Results Summary:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Total: ${this.passed + this.failed}`);
    console.log(`🎯 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(result => !result.passed)
        .forEach(result => console.log(`  - ${result.message}`));
    }
  }
}

// Auto-run tests if in browser environment
if (typeof window !== 'undefined') {
  window.TranslationPlaceholderFixTest = TranslationPlaceholderFixTest;
  
  // Run tests when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      const test = new TranslationPlaceholderFixTest();
      await test.runTests();
    });
  } else {
    // DOM is already ready
    setTimeout(async () => {
      const test = new TranslationPlaceholderFixTest();
      await test.runTests();
    }, 1000);
  }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationPlaceholderFixTest;
}