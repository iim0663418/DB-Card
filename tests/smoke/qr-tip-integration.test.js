/**
 * QR Tip Integration Test
 * 
 * Tests that qrTip is properly integrated with the language management system
 * 
 * @version 3.2.1-qr-tip-integration
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const APP_JS_PATH = path.join(__dirname, '../../pwa-card-storage/src/app.js');

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
 * Test 1: QR Tip Uses Language Management System
 */
function testQRTipUsesLanguageManagement() {
    const content = getFileContent(APP_JS_PATH);
    
    // Check that qrTip uses getLocalizedText instead of hardcoded labels
    if (!content.includes("this.getLocalizedText('qrTip'")) {
        return 'qrTip does not use getLocalizedText method';
    }
    
    // Check that old hardcoded pattern is removed
    if (content.includes("labels.qrTip || '掃描此 QR 碼即可開啟數位名片'")) {
        return 'Old hardcoded qrTip pattern still exists';
    }
    
    return true;
}

/**
 * Test 2: QR Tip Has Proper Fallback
 */
function testQRTipHasProperFallback() {
    const content = getFileContent(APP_JS_PATH);
    
    // Check that qrTip has a proper fallback
    if (!content.includes("getLocalizedText('qrTip', '💡 QR 碼提示')")) {
        return 'qrTip does not have proper fallback text';
    }
    
    return true;
}

/**
 * Test 3: No Hardcoded QR Tip Text in showQRModal
 */
function testNoHardcodedQRTipInModal() {
    const content = getFileContent(APP_JS_PATH);
    
    // Extract showQRModal function
    const showQRModalMatch = content.match(/showQRModal\([^{]*\{[\s\S]*?^\s*}/m);
    if (!showQRModalMatch) {
        return 'showQRModal function not found';
    }
    
    const showQRModalContent = showQRModalMatch[0];
    
    // Check for hardcoded Chinese text
    if (showQRModalContent.includes('掃描此 QR 碼即可開啟數位名片')) {
        return 'Hardcoded Chinese QR tip text found in showQRModal';
    }
    
    // Check for hardcoded English text
    if (showQRModalContent.includes('Scan this QR code to open the digital business card')) {
        return 'Hardcoded English QR tip text found in showQRModal';
    }
    
    return true;
}

/**
 * Test 4: QR Tip Integration in Modal HTML
 */
function testQRTipIntegrationInModalHTML() {
    const content = getFileContent(APP_JS_PATH);
    
    // Check that the modal HTML uses the localized text method
    if (!content.includes('<div class="qr-tip">')) {
        return 'QR tip div not found in modal HTML';
    }
    
    // Check that it uses the correct method call
    const qrTipPattern = /<div class="qr-tip">\s*<p>\$\{this\.getLocalizedText\('qrTip'/;
    if (!qrTipPattern.test(content)) {
        return 'QR tip does not use correct getLocalizedText integration in modal HTML';
    }
    
    return true;
}

/**
 * Test 5: Language Management System Integration
 */
function testLanguageManagementSystemIntegration() {
    const content = getFileContent(APP_JS_PATH);
    
    // Check that getLocalizedText method exists and is properly implemented
    if (!content.includes('getLocalizedText(key, fallback = null)')) {
        return 'getLocalizedText method not found or has incorrect signature';
    }
    
    // Check that it uses SafeTranslationHandler or language manager
    const getLocalizedTextMatch = content.match(/getLocalizedText\([^{]*\{[\s\S]*?^\s*}/m);
    if (!getLocalizedTextMatch) {
        return 'getLocalizedText method implementation not found';
    }
    
    const methodContent = getLocalizedTextMatch[0];
    if (!methodContent.includes('SafeTranslationHandler') && !methodContent.includes('languageManager') && !methodContent.includes('UnifiedTranslationService')) {
        return 'getLocalizedText does not integrate with translation systems';
    }
    
    return true;
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('🧪 QR Tip Integration Tests\n');
    
    runTest('QR Tip Uses Language Management System', testQRTipUsesLanguageManagement);
    runTest('QR Tip Has Proper Fallback', testQRTipHasProperFallback);
    runTest('No Hardcoded QR Tip Text in Modal', testNoHardcodedQRTipInModal);
    runTest('QR Tip Integration in Modal HTML', testQRTipIntegrationInModalHTML);
    runTest('Language Management System Integration', testLanguageManagementSystemIntegration);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`📈 Success Rate: ${Math.round(TEST_RESULTS.passed / (TEST_RESULTS.passed + TEST_RESULTS.failed) * 100)}%`);
    
    if (TEST_RESULTS.failed === 0) {
        console.log('\n🎉 All QR tip integration tests passed!');
        console.log('✅ QR tip properly integrated with language management');
        console.log('✅ No hardcoded text remaining');
        console.log('✅ Proper fallback mechanism in place');
        console.log('✅ Language switching will now work correctly');
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