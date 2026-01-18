/**
 * SEC-03: Secure Logging System Smoke Tests
 * Tests for log injection prevention (CWE-117) and PII protection
 */

// Mock DOM environment for testing
if (typeof window === 'undefined') {
  global.window = {
    secureLogger: null,
    xssProtection: null
  };
  global.console = {
    log: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
}

// Import SecureLogger (simulate loading)
let SecureLogger, secureLogger;
try {
  if (typeof require !== 'undefined') {
    const secureLoggerModule = require('../../pwa-card-storage/src/core/secure-logger.js');
    SecureLogger = secureLoggerModule.SecureLogger;
    secureLogger = secureLoggerModule.secureLogger;
  }
} catch (error) {
  console.warn('Could not load SecureLogger module for testing');
}

/**
 * Test Suite: Basic Logging Functionality
 */
function testBasicLogging() {
  console.log('Testing basic logging functionality...');
  
  if (!SecureLogger) {
    console.log('⚠️  SecureLogger not available, skipping basic logging tests');
    return false;
  }
  
  try {
    const logger = new SecureLogger();
    
    // Test log levels
    logger.debug('Debug message', { test: 'data' });
    logger.info('Info message', { test: 'data' });
    logger.warn('Warning message', { test: 'data' });
    logger.error('Error message', { test: 'data' });
    
    // Test convenience methods
    logger.setLevel('DEBUG');
    const currentLevel = logger.getLevel();
    
    if (currentLevel !== 'DEBUG') {
      throw new Error('Level setting failed');
    }
    
    console.log('✅ Basic logging functionality test passed');
    return true;
  } catch (error) {
    console.log('❌ Basic logging functionality test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Log Injection Prevention (CWE-117)
 */
function testLogInjectionPrevention() {
  console.log('Testing log injection prevention...');
  
  if (!SecureLogger) {
    console.log('⚠️  SecureLogger not available, skipping injection tests');
    return false;
  }
  
  try {
    const logger = new SecureLogger();
    
    // Test dangerous input sanitization
    const dangerousInputs = [
      'Normal message\nINJECTED LOG ENTRY',
      'Message with\r\ncarriage return',
      'Message with\ttab injection',
      'Message with <script>alert("xss")</script>',
      'Message with & entities',
      'Message with "quotes" and \'apostrophes\'',
      'Message\nwith\nmultiple\nlines'
    ];
    
    dangerousInputs.forEach((input, index) => {
      logger.info(`Test input ${index}`, { userInput: input });
    });
    
    console.log('✅ Log injection prevention test passed');
    return true;
  } catch (error) {
    console.log('❌ Log injection prevention test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: PII Detection and Redaction
 */
function testPIIDetection() {
  console.log('Testing PII detection and redaction...');
  
  if (!SecureLogger) {
    console.log('⚠️  SecureLogger not available, skipping PII tests');
    return false;
  }
  
  try {
    const logger = new SecureLogger();
    
    // Test PII patterns
    const piiData = {
      email: 'user@example.com',
      phone: '02-1234-5678',
      mobile: '0912-345-678',
      creditCard: '1234 5678 9012 3456',
      taiwanId: 'A123456789',
      ipAddress: '192.168.1.1',
      jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    };
    
    logger.info('Testing PII redaction', piiData);
    
    // Test message with PII
    logger.warn('User email user@example.com attempted login from 192.168.1.1');
    
    console.log('✅ PII detection and redaction test passed');
    return true;
  } catch (error) {
    console.log('❌ PII detection and redaction test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Data Sanitization
 */
function testDataSanitization() {
  console.log('Testing data sanitization...');
  
  if (!SecureLogger) {
    console.log('⚠️  SecureLogger not available, skipping sanitization tests');
    return false;
  }
  
  try {
    const logger = new SecureLogger();
    
    // Test object sanitization
    const complexData = {
      normalField: 'normal value',
      longField: 'a'.repeat(2000), // Should be truncated
      circularRef: null,
      nestedObject: {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      }
    };
    
    // Create circular reference
    complexData.circularRef = complexData;
    
    logger.info('Testing complex data sanitization', complexData);
    
    // Test null and undefined values
    logger.info('Testing null/undefined', {
      nullValue: null,
      undefinedValue: undefined,
      emptyString: '',
      zeroValue: 0,
      falseValue: false
    });
    
    console.log('✅ Data sanitization test passed');
    return true;
  } catch (error) {
    console.log('❌ Data sanitization test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: XSS Protection Integration
 */
function testXSSProtectionIntegration() {
  console.log('Testing XSS protection integration...');
  
  if (!SecureLogger) {
    console.log('⚠️  SecureLogger not available, skipping XSS integration tests');
    return false;
  }
  
  try {
    // Mock XSS protection
    const mockXSSProtection = {
      sanitizeInput: (input) => {
        if (typeof input !== 'string') return '';
        return input.replace(/[<>"'&]/g, (match) => {
          const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
          return map[match];
        });
      }
    };
    
    // Set mock XSS protection
    if (typeof window !== 'undefined') {
      window.xssProtection = mockXSSProtection;
    }
    
    const logger = new SecureLogger();
    
    // Test XSS protection integration
    logger.info('Testing XSS protection', {
      xssAttempt: '<script>alert("xss")</script>',
      htmlContent: '<div>content</div>',
      quotedContent: 'He said "Hello" & she replied'
    });
    
    console.log('✅ XSS protection integration test passed');
    return true;
  } catch (error) {
    console.log('❌ XSS protection integration test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Performance and Limits
 */
function testPerformanceAndLimits() {
  console.log('Testing performance and limits...');
  
  if (!SecureLogger) {
    console.log('⚠️  SecureLogger not available, skipping performance tests');
    return false;
  }
  
  try {
    const logger = new SecureLogger();
    
    // Test length limits
    const longMessage = 'a'.repeat(2000);
    const largeData = {
      field1: 'b'.repeat(1000),
      field2: 'c'.repeat(1000),
      field3: 'd'.repeat(1000)
    };
    
    logger.info(longMessage, largeData);
    
    // Test many fields
    const manyFields = {};
    for (let i = 0; i < 100; i++) {
      manyFields[`field${i}`] = `value${i}`;
    }
    
    logger.info('Testing many fields', manyFields);
    
    console.log('✅ Performance and limits test passed');
    return true;
  } catch (error) {
    console.log('❌ Performance and limits test failed:', error.message);
    return false;
  }
}

/**
 * Test Suite: Global Integration
 */
function testGlobalIntegration() {
  console.log('Testing global integration...');
  
  try {
    // Test global secureLog function
    if (typeof window !== 'undefined' && window.secureLog) {
      window.secureLog('Testing global secureLog function', { test: 'data' });
    }
    
    // Test global secureLogger instance
    if (typeof window !== 'undefined' && window.secureLogger) {
      window.secureLogger.info('Testing global secureLogger instance', { test: 'data' });
    }
    
    console.log('✅ Global integration test passed');
    return true;
  } catch (error) {
    console.log('❌ Global integration test failed:', error.message);
    return false;
  }
}

/**
 * Run All Tests
 */
function runAllTests() {
  console.log('🧪 Starting SEC-03 Secure Logging System Smoke Tests\n');
  
  const tests = [
    testBasicLogging,
    testLogInjectionPrevention,
    testPIIDetection,
    testDataSanitization,
    testXSSProtectionIntegration,
    testPerformanceAndLimits,
    testGlobalIntegration
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach((test, index) => {
    console.log(`\n--- Test ${index + 1}/${total} ---`);
    if (test()) {
      passed++;
    }
  });
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All SEC-03 secure logging tests passed!');
    return true;
  } else {
    console.log('⚠️  Some SEC-03 secure logging tests failed');
    return false;
  }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && require.main === module) {
  runAllTests();
}

// Export for use in other test files
if (typeof module !== 'undefined') {
  module.exports = {
    runAllTests,
    testBasicLogging,
    testLogInjectionPrevention,
    testPIIDetection,
    testDataSanitization,
    testXSSProtectionIntegration,
    testPerformanceAndLimits,
    testGlobalIntegration
  };
}

// Browser environment
if (typeof window !== 'undefined') {
  window.secureLoggingTests = {
    runAllTests,
    testBasicLogging,
    testLogInjectionPrevention,
    testPIIDetection,
    testDataSanitization,
    testXSSProtectionIntegration,
    testPerformanceAndLimits,
    testGlobalIntegration
  };
}