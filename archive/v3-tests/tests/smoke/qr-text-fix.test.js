/**
 * QR Text Formatting Fix Test
 * 
 * Tests the fix for inconsistent QR code text formatting
 * 
 * @version 3.2.1-qr-text-fix
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const LANGUAGE_MANAGER_PATH = path.join(__dirname, '../../pwa-card-storage/src/core/language-manager.js');

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
 * Test 1: Chinese QR Text Consistency
 */
function testChineseQRTextConsistency() {
    const content = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check for consistent QR code formatting in Chinese
    if (!content.includes("qrCode: 'QR 碼'")) {
        return 'Chinese qrCode translation not found or incorrect';
    }
    
    if (!content.includes("downloadQR: '下載 QR 碼'")) {
        return 'Chinese downloadQR translation not found or incorrect';
    }
    
    if (!content.includes("qrTip: '💡 QR 碼提示'")) {
        return 'Chinese qrTip translation not found or updated correctly';
    }
    
    return true;
}

/**
 * Test 2: English QR Text Consistency
 */
function testEnglishQRTextConsistency() {
    const content = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check for consistent QR code formatting in English
    if (!content.includes("qrCode: 'QR Code'")) {
        return 'English qrCode translation not found or incorrect';
    }
    
    if (!content.includes("downloadQR: 'Download QR Code'")) {
        return 'English downloadQR translation not found or incorrect';
    }
    
    if (!content.includes("qrTip: '💡 QR Tip'")) {
        return 'English qrTip translation not found or updated correctly';
    }
    
    return true;
}

/**
 * Test 3: No Inconsistent Spacing
 */
function testNoInconsistentSpacing() {
    const content = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check that there are no inconsistent QR spacing patterns
    if (content.includes("'Download Q R'") || content.includes("'下載 Q R'")) {
        return 'Found inconsistent QR spacing with extra spaces';
    }
    
    if (content.includes("'Qr Tip'") && !content.includes("'💡 QR Tip'")) {
        return 'Found inconsistent QR capitalization';
    }
    
    return true;
}

/**
 * Test 4: Translation Key Completeness
 */
function testTranslationKeyCompleteness() {
    const content = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check that all QR-related keys exist in both languages
    const requiredKeys = ['qrCode', 'downloadQR', 'copyLink', 'qrTip'];
    
    for (const key of requiredKeys) {
        // Check Chinese section
        const chinesePattern = new RegExp(`${key}:\\s*'[^']*'`, 'g');
        const chineseMatches = content.match(chinesePattern);
        if (!chineseMatches || chineseMatches.length < 1) {
            return `Missing Chinese translation for key: ${key}`;
        }
        
        // Check English section
        const englishMatches = content.match(chinesePattern);
        if (!englishMatches || englishMatches.length < 2) {
            return `Missing English translation for key: ${key}`;
        }
    }
    
    return true;
}

/**
 * Test 5: Icon Consistency
 */
function testIconConsistency() {
    const content = getFileContent(LANGUAGE_MANAGER_PATH);
    
    // Check that both languages use the same icon for qrTip
    const chineseQrTip = content.match(/qrTip:\s*'💡 QR 碼提示'/);
    const englishQrTip = content.match(/qrTip:\s*'💡 QR Tip'/);
    
    if (!chineseQrTip) {
        return 'Chinese qrTip does not use consistent icon';
    }
    
    if (!englishQrTip) {
        return 'English qrTip does not use consistent icon';
    }
    
    return true;
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('🧪 QR Text Formatting Fix Tests\n');
    
    runTest('Chinese QR Text Consistency', testChineseQRTextConsistency);
    runTest('English QR Text Consistency', testEnglishQRTextConsistency);
    runTest('No Inconsistent Spacing', testNoInconsistentSpacing);
    runTest('Translation Key Completeness', testTranslationKeyCompleteness);
    runTest('Icon Consistency', testIconConsistency);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`📈 Success Rate: ${Math.round(TEST_RESULTS.passed / (TEST_RESULTS.passed + TEST_RESULTS.failed) * 100)}%`);
    
    if (TEST_RESULTS.failed === 0) {
        console.log('\n🎉 All QR text formatting tests passed!');
        console.log('✅ Text consistency fixed');
        console.log('✅ No spacing issues');
        console.log('✅ Icon consistency maintained');
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