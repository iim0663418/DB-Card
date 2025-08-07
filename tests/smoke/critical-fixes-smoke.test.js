/**
 * Critical Translation Fixes - Smoke Test
 * Tests Phase 1 translation fixes (FIX-01 to FIX-04)
 * Version: v3.1.3-translation-key-fixes
 */

const { expect, sinon } = require('../setup.js');

// Test environment setup
const isNode = typeof window === 'undefined';
let LanguageManager, TranslationValidator, TranslationFileAuditor, TranslationDebugReporter;

if (isNode) {
  // Node.js environment - load modules from relative paths
  const path = require('path');
  const fs = require('fs');
  
  // Check if files exist and load them
  const basePath = path.join(__dirname, '../../pwa-card-storage/src/core/');
  
  try {
    const validatorPath = path.join(basePath, 'translation-validator.js');
    const auditorPath = path.join(basePath, 'translation-file-auditor.js');
    const reporterPath = path.join(basePath, 'translation-debug-reporter.js');
    
    if (fs.existsSync(validatorPath)) {
      // Read and evaluate the JavaScript files manually for browser-style classes
      const validatorCode = fs.readFileSync(validatorPath, 'utf8');
      eval(validatorCode);
      if (typeof TranslationValidator !== 'undefined') {
        // TranslationValidator is now available
      }
    }
    
    if (fs.existsSync(auditorPath)) {
      const auditorCode = fs.readFileSync(auditorPath, 'utf8');
      eval(auditorCode);
    }
    
    if (fs.existsSync(reporterPath)) {
      const reporterCode = fs.readFileSync(reporterPath, 'utf8');
      eval(reporterCode);
    }
    
  } catch (error) {
    console.warn('Could not load translation modules:', error.message);
  }
  
  // Mock DOM globals for Node.js
  if (typeof global !== 'undefined') {
    global.window = { 
      location: { hostname: 'localhost' },
      addEventListener: () => {},
      dispatchEvent: () => {}
    };
    global.console = console;
    global.performance = { now: () => Date.now() };
    global.fetch = () => Promise.reject(new Error('Fetch not available in test'));
    global.document = {
      createElement: () => ({ click: () => {}, href: '', download: '' }),
      body: { appendChild: () => {}, removeChild: () => {} }
    };
    global.URL = {
      createObjectURL: () => 'mock-url',
      revokeObjectURL: () => {}
    };
    global.Blob = class MockBlob {
      constructor(data, options) {
        this.data = data;
        this.type = options?.type || '';
      }
    };
  }
}

describe('Critical Translation Fixes Smoke Tests', function() {
  this.timeout(10000);

  let mockTranslations;

  beforeEach(function() {
    mockTranslations = {
      zh: {
        ariaLabels: {
          button: '按鈕',
          dialog: '對話框',
          navigation: '導航'
        },
        screenReaderTexts: {
          loading: '載入中',
          error: '錯誤'
        }
      },
      en: {
        ariaLabels: {
          button: 'Button',
          dialog: 'Dialog'
          // Missing 'navigation' key intentionally
        },
        screenReaderTexts: {
          loading: 'Loading',
          error: 'Error'
        }
      }
    };
  });

  describe('FIX-01: Translation Completeness Validation System', function() {
    
    it('should have TranslationValidator available', function() {
      expect(typeof TranslationValidator).to.not.equal('undefined');
      if (typeof TranslationValidator !== 'undefined') {
        expect(typeof TranslationValidator).to.equal('function');
      } else {
        this.skip('TranslationValidator not loaded - skipping validation tests');
      }
    });

    it('should validate translation completeness', function() {
      if (typeof TranslationValidator === 'undefined') {
        this.skip('TranslationValidator not available');
      }

      const validator = new TranslationValidator({
        logLevel: 'none',
        supportedLanguages: ['zh', 'en']
      });

      const result = validator.validateCompleteness(mockTranslations);
      
      expect(result).to.be.an('object');
      expect(result.isValid).to.equal(false); // Should fail due to missing keys
      expect(result.missingKeys).to.be.an('object');
      expect(result.completenessScore).to.be.an('object');
      expect(result.suggestions).to.be.an('array');
    });

    it('should detect missing keys correctly', function() {
      if (typeof TranslationValidator === 'undefined') {
        this.skip('TranslationValidator not available');
      }

      const validator = new TranslationValidator({
        logLevel: 'none',
        supportedLanguages: ['zh', 'en']
      });

      const result = validator.validateCompleteness(mockTranslations);
      
      expect(result.missingKeys.en).to.include('ariaLabels.navigation');
      expect(result.completenessScore.en).to.be.lessThan(100);
      expect(result.completenessScore.zh).to.equal(100);
    });
    });
    
    it('should create PWAUILanguageAdapter instance', function() {
      expect(PWAUILanguageAdapter).to.be.a('function');
      
      const adapter = new PWAUILanguageAdapter();
      expect(adapter).to.be.an('object');
      expect(adapter.initialize).to.be.a('function');
      expect(adapter.registerComponent).to.be.a('function');
      expect(adapter.updatePWAComponents).to.be.a('function');
    });

    it('should initialize without errors', async function() {
      const adapter = new PWAUILanguageAdapter();
      
      // Should not throw
      await adapter.initialize();
      
      expect(adapter.initialized).to.be.true;
      expect(adapter.registeredComponents).to.be.instanceOf(Map);
    });

    it('should register components dynamically', function() {
      const adapter = new PWAUILanguageAdapter();
      
      const success = adapter.registerComponent('test-component', {
        selector: '.test-selector',
        updateMethod: sinon.stub(),
        priority: 5
      });
      
      expect(success).to.be.true;
      expect(adapter.registeredComponents.has('test-component')).to.be.true;
    });
  });

  describe('FIX-02: Test Framework Configuration', function() {
    it('should have working test environment', function() {
      expect(global.window).to.exist;
      expect(global.document).to.exist;
      expect(global.navigator).to.exist;
    });

    it('should have required test utilities', function() {
      expect(expect).to.be.a('function');
      expect(sinon).to.be.an('object');
      expect(global.testUtils).to.be.an('object');
    });

    it('should have mocked Web APIs', function() {
      expect(global.localStorage).to.exist;
      expect(global.fetch).to.exist;
      expect(global.ResizeObserver).to.exist;
      expect(global.MutationObserver).to.exist;
    });
  });

  describe('FIX-03: PerformanceOptimizer Dependency', function() {
    let EnhancedLanguageManager;
    
    before(function() {
      // Load enhanced language manager
      EnhancedLanguageManager = require('../../pwa-card-storage/src/core/enhanced-language-manager.js');
    });
    
    it('should handle missing PerformanceOptimizer gracefully', async function() {
      const manager = new EnhancedLanguageManager();
      
      // Should not throw even without PerformanceOptimizer
      await manager.initialize();
      
      expect(manager.initialized).to.be.true;
      expect(manager.performanceOptimizer).to.exist;
    });

    it('should provide fallback performance tracking', async function() {
      const manager = new EnhancedLanguageManager();
      await manager.initialize();
      
      // Should have fallback performance tracker
      expect(manager.performanceOptimizer).to.exist;
      expect(manager.performanceOptimizer.recordLanguageSwitchTime).to.be.a('function');
      expect(manager.performanceOptimizer.getPerformanceReport).to.be.a('function');
      
      // Test recording performance
      manager.recordLanguageSwitchPerformance(250);
      
      const report = manager.getPerformanceReport();
      expect(report).to.exist;
    });
  });

  describe('FIX-04: Dynamic Component Registration', function() {
    let PWAUILanguageAdapter;
    
    before(function() {
      PWAUILanguageAdapter = require('../../pwa-card-storage/src/core/pwa-ui-language-adapter.js');
    });
    
    it('should register dynamic components', function() {
      const adapter = new PWAUILanguageAdapter();
      
      const success = adapter.registerDynamicComponent('dynamic-test', {
        element: global.document.createElement('div'),
        updateMethod: sinon.stub()
      });
      
      expect(success).to.be.true;
    });

    it('should detect dynamic components in DOM', function() {
      const adapter = new PWAUILanguageAdapter();
      
      // Create test element
      const element = global.document.createElement('div');
      element.classList.add('security-onboarding');
      
      const detected = adapter.detectAndRegisterDynamicComponents(element);
      expect(detected).to.be.an('array');
      expect(detected.length).to.be.greaterThan(0);
    });

    it('should provide component status information', function() {
      const adapter = new PWAUILanguageAdapter();
      
      // Register some components
      adapter.registerComponent('test1', { selector: '.test1', updateMethod: sinon.stub() });
      adapter.registerDynamicComponent('test2', { element: global.document.createElement('div') });
      
      const status = adapter.getStatus();
      expect(status).to.be.an('object');
      expect(status.registeredComponents).to.be.a('number');
      expect(status.componentsByType).to.be.an('object');
      expect(status.initialized).to.be.a('boolean');
    });
  });

  describe('Integration Test', function() {
    let PWAUILanguageAdapter, EnhancedLanguageManager;
    
    before(function() {
      PWAUILanguageAdapter = require('../../pwa-card-storage/src/core/pwa-ui-language-adapter.js');
      EnhancedLanguageManager = require('../../pwa-card-storage/src/core/enhanced-language-manager.js');
    });
    
    it('should work together without conflicts', async function() {
      // Test that all components can be loaded and initialized together
      const adapter = new PWAUILanguageAdapter();
      const manager = new EnhancedLanguageManager();
      
      await adapter.initialize();
      await manager.initialize();
      
      expect(adapter.initialized).to.be.true;
      expect(manager.initialized).to.be.true;
      
      // Test language switching
      const newLang = await manager.switchLanguage('en');
      expect(newLang).to.equal('en');
    });
  });

  afterEach(function() {
    // Clean up global state
    if (global.testCleanup) {
      global.testCleanup();
    }
  });
});