/**
 * TRANS-001 Smoke Test - SafeTranslationHandler
 * 驗證統一錯誤處理機制的基本功能
 */

// Mock DOM environment for testing
if (typeof window === 'undefined') {
  global.window = {
    languageManager: null,
    app: null,
    SafeTranslationHandler: null
  };
  global.console = console;
}

// Load SafeTranslationHandler
const fs = require('fs');
const path = require('path');

// Read and evaluate SafeTranslationHandler
const handlerPath = path.join(__dirname, '../../src/core/safe-translation-handler.js');
const handlerCode = fs.readFileSync(handlerPath, 'utf8');

// Remove module.exports for browser environment simulation
const browserCode = handlerCode.replace(/if \(typeof module.*\n.*module\.exports.*\n}/, '');
eval(browserCode);

// Test Suite
describe('TRANS-001: SafeTranslationHandler Smoke Tests', () => {
  let handler;

  beforeEach(() => {
    // Reset global state
    window.languageManager = null;
    window.app = null;
    
    // Create fresh handler instance
    handler = new SafeTranslationHandler({
      logLevel: 'none' // Suppress logs during testing
    });
    window.SafeTranslationHandler = SafeTranslationHandler;
  });

  test('Should create SafeTranslationHandler instance', () => {
    expect(handler).toBeDefined();
    expect(handler.constructor.name).toBe('SafeTranslationHandler');
  });

  test('Should handle missing translation keys gracefully', () => {
    const result = handler.getTranslation('nonexistent.key');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('Should return built-in translations for known keys', () => {
    const result = handler.getTranslation('app.initializing');
    expect(result).toBe('初始化應用程式...');
    
    const resultEn = handler.getTranslation('app.initializing', 'en');
    expect(resultEn).toBe('Initializing application...');
  });

  test('Should generate human-readable text for unknown keys', () => {
    const result = handler.getTranslation('someUnknownKey');
    expect(result).toBe('Some Unknown Key');
    
    const dotResult = handler.getTranslation('app.someFeature');
    expect(dotResult).toBe('Some Feature');
  });

  test('Should validate input and handle invalid keys', () => {
    expect(handler.getTranslation('')).toBe('Invalid Key');
    expect(handler.getTranslation(null)).toBe('Invalid Key');
    expect(handler.getTranslation(123)).toBe('Invalid Key');
  });

  test('Should sanitize potentially dangerous input', () => {
    const maliciousKey = '<script>alert("xss")</script>';
    const result = handler.getTranslation(maliciousKey);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  test('Should use language manager when available', () => {
    // Mock language manager
    window.languageManager = {
      getText: jest.fn().mockReturnValue('Mocked Translation'),
      getCurrentLanguage: jest.fn().mockReturnValue('zh')
    };

    const result = handler.getTranslation('test.key');
    expect(window.languageManager.getText).toHaveBeenCalledWith(
      'test.key', 
      'zh', 
      { fallback: null, escapeHtml: false }
    );
    expect(result).toBe('Mocked Translation');
  });

  test('Should fallback when language manager fails', () => {
    // Mock failing language manager
    window.languageManager = {
      getText: jest.fn().mockImplementation(() => {
        throw new Error('Language manager error');
      }),
      getCurrentLanguage: jest.fn().mockReturnValue('zh')
    };

    const result = handler.getTranslation('app.initializing');
    expect(result).toBe('初始化應用程式...'); // Should use built-in dictionary
  });

  test('Should track fallback usage statistics', () => {
    handler.getTranslation('app.initializing'); // Built-in dictionary
    handler.getTranslation('unknownKey'); // Human readable
    
    const stats = handler.getStatistics();
    expect(stats.fallbackUsage.builtinDict).toBeGreaterThan(0);
    expect(stats.fallbackUsage.humanReadable).toBeGreaterThan(0);
  });

  test('Should handle XSS protection', () => {
    const maliciousText = '<img src="x" onerror="alert(1)">';
    const sanitized = handler._sanitizeOutput(maliciousText);
    expect(sanitized).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
  });

  test('Should provide emergency fallback', () => {
    const result = handler._getEmergencyFallback('test.key', { fallback: 'Emergency Text' });
    expect(result).toBe('Emergency Text');
    
    const resultNoFallback = handler._getEmergencyFallback('test.key', {});
    expect(resultNoFallback).toBe('test.key');
  });

  test('Should support singleton pattern', () => {
    const instance1 = SafeTranslationHandler.getInstance();
    const instance2 = SafeTranslationHandler.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('Should handle static method calls', () => {
    const result = SafeTranslationHandler.getTranslation('app.initializing');
    expect(result).toBe('初始化應用程式...');
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🧪 Running TRANS-001 Smoke Tests...\n');
  
  // Simple test runner
  const tests = [
    () => {
      const handler = new SafeTranslationHandler({ logLevel: 'none' });
      const result = handler.getTranslation('app.initializing');
      console.log('✅ Built-in translation test:', result === '初始化應用程式...');
    },
    () => {
      const handler = new SafeTranslationHandler({ logLevel: 'none' });
      const result = handler.getTranslation('unknownKey');
      console.log('✅ Human readable generation test:', result === 'Unknown Key');
    },
    () => {
      const handler = new SafeTranslationHandler({ logLevel: 'none' });
      const result = handler.getTranslation('');
      console.log('✅ Invalid input handling test:', result === 'Invalid Key');
    },
    () => {
      const handler = new SafeTranslationHandler({ logLevel: 'none' });
      const malicious = '<script>alert("xss")</script>';
      const result = handler._sanitizeOutput(malicious);
      console.log('✅ XSS protection test:', !result.includes('<script>'));
    },
    () => {
      const instance1 = SafeTranslationHandler.getInstance();
      const instance2 = SafeTranslationHandler.getInstance();
      console.log('✅ Singleton pattern test:', instance1 === instance2);
    }
  ];
  
  tests.forEach((test, index) => {
    try {
      test();
    } catch (error) {
      console.log(`❌ Test ${index + 1} failed:`, error.message);
    }
  });
  
  console.log('\n🎯 TRANS-001 Smoke Tests Completed');
}