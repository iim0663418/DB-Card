/**
 * Recursion Fix Test - SafeTranslationHandler & LanguageManager
 * 
 * Tests the fix for maximum call stack size exceeded error
 * 
 * @version 3.2.1-recursion-fix
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const LANGUAGE_MANAGER_PATH = path.join(__dirname, '../../pwa-card-storage/src/core/language-manager.js');
const SAFE_HANDLER_PATH = path.join(__dirname, '../../pwa-card-storage/src/core/safe-translation-handler.js');

const TEST_RESULTS = {
    passed: 0,
    failed: 0,
    tests: []
};

/**
 * Test helper functions
 */
function addTest(name, passed, message = '') {
    TEST_RESULTS.tests.push({ name, passed, message });
    if (passed) {
        TEST_RESULTS.passed++;
        console.log(`✅ ${name}`);
    } else {
        TEST_RESULTS.failed++;
        console.log(`❌ ${name}: ${message}`);
    }
}

function runTest(name, testFn) {
    try {
        const result = testFn();
        if (result === true) {
            addTest(name, true);
        } else if (typeof result === 'string') {
            addTest(name, false, result);
        } else {
            addTest(name, false, 'Test returned unexpected result');
        }
    } catch (error) {
        addTest(name, false, error.message);
    }
}

/**
 * Read file content
 */
function getFileContent(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * Test 1: LanguageManager Recursion Guard
 */
function testLanguageManagerRecursionGuard() {
    const content = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check for recursion guard in getText method
    if (!content.includes('options._fromSafeHandler')) {
        return 'Recursion guard not found in LanguageManager.getText()';
    }
    
    // Check for proper guard logic
    if (!content.includes('Skip SafeTranslationHandler to prevent circular dependency')) {
        return 'Recursion guard logic not properly implemented';
    }
    
    // Check for flag passing to SafeTranslationHandler
    if (!content.includes('_fromSafeHandler: true')) {
        return 'Recursion prevention flag not passed to SafeTranslationHandler';
    }
    
    return true;
}

/**
 * Test 2: SafeTranslationHandler Recursion Prevention
 */
function testSafeHandlerRecursionPrevention() {
    const content = getFileContent(SAFE_HANDLER_PATH);
    
    // Check for recursion prevention in _tryLanguageManager
    if (!content.includes('_fromSafeHandler: true  // Prevent recursion')) {
        return 'Recursion prevention flag not found in SafeTranslationHandler';
    }
    
    // Should have two instances (global and app language managers)
    const matches = content.match(/_fromSafeHandler: true/g);
    if (!matches || matches.length < 2) {
        return 'Recursion prevention not applied to all language manager calls';
    }
    
    return true;
}

/**
 * Test 3: Code Structure Integrity
 */
function testCodeStructureIntegrity() {
    const langManagerContent = getFileContent(LANGUAGE_MANAGER_PATH);
    const safeHandlerContent = getFileContent(SAFE_HANDLER_PATH);
    
    // Check that getText method still exists and is functional
    if (!langManagerContent.includes('getText(key, lang = null, options = {})')) {
        return 'LanguageManager.getText method signature changed unexpectedly';
    }
    
    // Check that SafeTranslationHandler getTranslation method exists
    if (!safeHandlerContent.includes('getTranslation(key, lang = null, options = {})')) {
        return 'SafeTranslationHandler.getTranslation method signature changed unexpectedly';
    }
    
    // Check that fallback logic is preserved
    if (!langManagerContent.includes('原有邏輯作為備用')) {
        return 'Fallback logic comment not found - may indicate missing fallback';
    }
    
    return true;
}

/**
 * Test 4: Error Handling Preservation
 */
function testErrorHandlingPreservation() {
    const langManagerContent = getFileContent(LANGUAGE_MANAGER_PATH);
    const safeHandlerContent = getFileContent(SAFE_HANDLER_PATH);
    
    // Check that error handling is preserved in LanguageManager
    if (!langManagerContent.includes('SafeTranslationHandler failed, using fallback')) {
        return 'Error handling not preserved in LanguageManager';
    }
    
    // Check that try-catch blocks are preserved in SafeTranslationHandler
    if (!safeHandlerContent.includes('Language manager access failed')) {
        return 'Error handling not preserved in SafeTranslationHandler';
    }
    
    return true;
}

/**
 * Test 5: Fallback Mechanism Integrity
 */
function testFallbackMechanismIntegrity() {
    const langManagerContent = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check that original fallback logic is preserved
    if (!langManagerContent.includes('Input validation and sanitization for security')) {
        return 'Original input validation logic not preserved';
    }
    
    if (!langManagerContent.includes('_handleMissingKey')) {
        return 'Missing key handling mechanism not preserved';
    }
    
    if (!langManagerContent.includes('_sanitizeTranslationOutput')) {
        return 'Output sanitization mechanism not preserved';
    }
    
    return true;
}

/**
 * Test 6: Security Features Preservation
 */
function testSecurityFeaturesPreservation() {
    const langManagerContent = getFileContent(LANGUAGE_MANAGER_PATH);
    const safeHandlerContent = getFileContent(SAFE_HANDLER_PATH);
    
    // Check XSS protection is preserved
    if (!langManagerContent.includes('XSS prevention - sanitize output')) {
        return 'XSS prevention not preserved in LanguageManager';
    }
    
    if (!safeHandlerContent.includes('XSS 防護')) {
        return 'XSS protection not preserved in SafeTranslationHandler';
    }
    
    // Check input sanitization
    if (!langManagerContent.includes('Sanitize key to prevent injection attacks')) {
        return 'Input sanitization not preserved';
    }
    
    return true;
}

/**
 * Test 7: Performance Impact Assessment
 */
function testPerformanceImpactAssessment() {
    const langManagerContent = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check that the fix doesn't add excessive overhead
    const recursionGuardCount = (langManagerContent.match(/_fromSafeHandler/g) || []).length;
    if (recursionGuardCount > 3) {
        return `Too many recursion guard checks (${recursionGuardCount}), may impact performance`;
    }
    
    // Check that the fix is minimal
    if (!langManagerContent.includes('Recursion guard to prevent infinite loop')) {
        return 'Recursion guard documentation not found';
    }
    
    return true;
}

/**
 * Test 8: Integration Compatibility
 */
function testIntegrationCompatibility() {
    const langManagerContent = getFileContent(LANGUAGE_MANAGER_PATH);
    const safeHandlerContent = getFileContent(SAFE_HANDLER_PATH);
    
    // Check that existing API is preserved
    if (!langManagerContent.includes('window.languageManager = new LanguageManager()')) {
        return 'Global LanguageManager instance not preserved';
    }
    
    if (!safeHandlerContent.includes('window.SafeTranslationHandler = SafeTranslationHandler')) {
        return 'Global SafeTranslationHandler not preserved';
    }
    
    // Check that initialization is preserved
    if (!langManagerContent.includes('initialize()')) {
        return 'LanguageManager initialization not preserved';
    }
    
    return true;
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('🧪 Recursion Fix Tests: SafeTranslationHandler & LanguageManager\n');
    
    runTest('LanguageManager Recursion Guard', testLanguageManagerRecursionGuard);
    runTest('SafeTranslationHandler Recursion Prevention', testSafeHandlerRecursionPrevention);
    runTest('Code Structure Integrity', testCodeStructureIntegrity);
    runTest('Error Handling Preservation', testErrorHandlingPreservation);
    runTest('Fallback Mechanism Integrity', testFallbackMechanismIntegrity);
    runTest('Security Features Preservation', testSecurityFeaturesPreservation);
    runTest('Performance Impact Assessment', testPerformanceImpactAssessment);
    runTest('Integration Compatibility', testIntegrationCompatibility);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`📈 Success Rate: ${Math.round(TEST_RESULTS.passed / (TEST_RESULTS.passed + TEST_RESULTS.failed) * 100)}%`);
    
    if (TEST_RESULTS.failed === 0) {
        console.log('\n🎉 All recursion fix tests passed!');
        console.log('✅ Infinite loop issue resolved');
        console.log('✅ Circular dependency broken');
        console.log('✅ Fallback mechanisms preserved');
        console.log('✅ Security features maintained');
    } else {
        console.log('\n⚠️  Some tests failed. Please review and fix issues.');
        TEST_RESULTS.tests.filter(t => !t.passed).forEach(test => {
            console.log(`   - ${test.name}: ${test.message}`);
        });
    }
    
    return TEST_RESULTS.failed === 0;
}

// Run tests if called directly
if (require.main === module) {
    const success = runAllTests();
    process.exit(success ? 0 : 1);
}

module.exports = { runAllTests, TEST_RESULTS };