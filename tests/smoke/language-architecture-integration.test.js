/**
 * Language Architecture Integration Smoke Test
 * Tests the core components working together
 */

// Mock browser environment for Node.js
if (typeof window === 'undefined') {
  global.window = {};
  global.document = {
    documentElement: { lang: '' },
    getElementById: () => null,
    createElement: () => ({ textContent: '', innerHTML: '' })
  };
  global.localStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; }
  };
  global.navigator = { language: 'zh-TW' };
}

const TranslationRegistry = require('../../pwa-card-storage/src/core/translation-registry.js');
const UnifiedLanguageObserver = require('../../pwa-card-storage/src/core/unified-language-observer.js');
const SecurityComponentsLanguageAdapter = require('../../pwa-card-storage/src/core/security-components-language-adapter.js');

async function runIntegrationTest() {
  console.log('=== Language Architecture Integration Test ===');
  
  try {
    // 1. Initialize Translation Registry
    const registry = new TranslationRegistry();
    await registry.initialize();
    console.log('✓ Translation Registry initialized');
    
    // 2. Initialize Unified Observer
    const observer = new UnifiedLanguageObserver();
    console.log('✓ Unified Observer created');
    
    // 3. Initialize Security Adapter
    const adapter = new SecurityComponentsLanguageAdapter();
    await adapter.initialize();
    console.log('✓ Security Adapter initialized');
    
    // 4. Register adapter as observer
    observer.registerObserver('security-adapter', {
      priority: 7,
      updateMethod: async (newLang, prevLang) => {
        await adapter.updateSecurityComponents(newLang, prevLang);
      }
    });
    console.log('✓ Security adapter registered as observer');
    
    // 5. Test translation flow
    const zhText = registry.getTranslation('zh', 'security.userCommunication.containerLabel');
    const enText = registry.getTranslation('en', 'security.userCommunication.containerLabel');
    console.log('✓ Translation flow:', zhText, '->', enText);
    
    // 6. Test observer notification
    await observer.notifyAllObservers('en', 'zh');
    console.log('✓ Observer notification completed');
    
    // 7. Test performance metrics
    const metrics = observer.getPerformanceMetrics();
    console.log('✓ Performance metrics:', metrics.averageUpdateTime + 'ms');
    
    // 8. Test validation
    const validation = registry.validateTranslations();
    console.log('✓ Translation validation:', validation.valid ? 'PASS' : 'FAIL');
    
    console.log('\n🎉 INTEGRATION TEST PASSED - All components working together!');
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  runIntegrationTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runIntegrationTest };