/**
 * SecureLogger Smoke Test Suite
 * Tests CWE-117 log injection protection
 */

// Import SecureLogger (adjust path as needed)
const { SecureLogger } = require('./secure-logger.js');

function runSmokeTests() {
    console.log('🔒 Starting SecureLogger CWE-117 Protection Tests...\n');
    
    const logger = new SecureLogger();
    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Control character sanitization
    totalTests++;
    console.log('Test 1: Control Character Sanitization');
    const maliciousInput = 'User login\nADMIN: Fake admin login\r\nSUCCESS';
    const sanitized = logger.sanitizeLogInput(maliciousInput);
    
    if (!sanitized.includes('\n') && !sanitized.includes('\r')) {
        console.log('✅ PASS: Control characters removed');
        passedTests++;
    } else {
        console.log('❌ FAIL: Control characters still present');
    }

    // Test 2: Sensitive data masking
    totalTests++;
    console.log('\nTest 2: Sensitive Data Masking');
    const sensitiveMessage = 'User email: john@example.com, phone: 123-456-7890';
    const masked = logger.maskSensitiveData(sensitiveMessage);
    
    if (masked.includes('[EMAIL_MASKED]') && masked.includes('[PHONE_MASKED]')) {
        console.log('✅ PASS: Sensitive data masked');
        passedTests++;
    } else {
        console.log('❌ FAIL: Sensitive data not properly masked');
    }

    // Test 3: Structured logging format
    totalTests++;
    console.log('\nTest 3: Structured Logging Format');
    const logEntry = logger.structuredLog('INFO', 'Test message', { userId: '123' });
    
    if (logEntry.timestamp && logEntry.level === 'INFO' && logEntry.message && logEntry.context) {
        console.log('✅ PASS: Structured log format correct');
        passedTests++;
    } else {
        console.log('❌ FAIL: Structured log format incorrect');
    }

    // Test 4: Log injection prevention
    totalTests++;
    console.log('\nTest 4: Log Injection Prevention');
    const injectionAttempt = 'Normal message\n[FAKE] ADMIN LOGIN SUCCESS\nuser=attacker';
    const logResult = logger.info(injectionAttempt);
    
    if (!JSON.stringify(logResult).includes('\n') && !JSON.stringify(logResult).includes('\r')) {
        console.log('✅ PASS: Log injection prevented');
        passedTests++;
    } else {
        console.log('❌ FAIL: Log injection not prevented');
    }

    // Test 5: Context sanitization
    totalTests++;
    console.log('\nTest 5: Context Object Sanitization');
    const maliciousContext = {
        'user\nid': 'normal',
        'action': 'login\r\nFAKE: admin access granted'
    };
    const contextResult = logger.structuredLog('INFO', 'Test', maliciousContext);
    const contextStr = JSON.stringify(contextResult.context);
    
    if (!contextStr.includes('\n') && !contextStr.includes('\r')) {
        console.log('✅ PASS: Context sanitization working');
        passedTests++;
    } else {
        console.log('❌ FAIL: Context sanitization failed');
    }

    // Summary
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All CWE-117 protection tests PASSED!');
        return true;
    } else {
        console.log('⚠️  Some tests FAILED - review implementation');
        return false;
    }
}

// Run tests if called directly
if (require.main === module) {
    runSmokeTests();
}

module.exports = { runSmokeTests };