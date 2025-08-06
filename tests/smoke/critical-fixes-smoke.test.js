/**
 * Critical Fixes Smoke Test
 * Tests for v3.1.3-critical-fixes implementation
 */

const { expect, sinon } = require('../setup.js');

describe('Critical Fixes Smoke Test', function() {
  this.timeout(5000);

  describe('FIX-01: PWA UI Language Adapter', function() {
    let PWAUILanguageAdapter;
    
    before(function() {
      // Load the adapter
      PWAUILanguageAdapter = require('../../pwa-card-storage/src/core/pwa-ui-language-adapter.js');
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