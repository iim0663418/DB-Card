/**
 * AuthorizationHandler Smoke Test Suite
 * Tests CWE-862 missing authorization protection
 */

// Import AuthorizationHandler
const { AuthorizationHandler } = require('./authorization-handler.js');

// Mock DOM for testing
global.document = {
    createElement: (tag) => ({
        className: '',
        style: { cssText: '' },
        setAttribute: () => {},
        appendChild: () => {},
        textContent: '',
        onclick: null,
        focus: () => {}
    }),
    body: {
        appendChild: () => {},
        removeChild: () => {},
        contains: () => false
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};

function runSmokeTests() {
    console.log('🔒 Starting AuthorizationHandler CWE-862 Protection Tests...\n');
    
    const mockLogger = {
        info: (msg, ctx) => console.log(`INFO: ${msg}`, ctx),
        error: (msg, ctx) => console.log(`ERROR: ${msg}`, ctx)
    };
    
    const authHandler = new AuthorizationHandler({ 
        logger: mockLogger,
        confirmationTimeout: 1000 // Short timeout for testing
    });
    
    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Sensitive operation detection
    totalTests++;
    console.log('Test 1: Sensitive Operation Detection');
    const requiresConfirm = authHandler.requiresConfirmation('delete', { itemCount: 5 });
    
    if (requiresConfirm) {
        console.log('✅ PASS: Sensitive operation detected');
        passedTests++;
    } else {
        console.log('❌ FAIL: Sensitive operation not detected');
    }

    // Test 2: Non-sensitive operation
    totalTests++;
    console.log('\nTest 2: Non-sensitive Operation');
    const noConfirmNeeded = !authHandler.requiresConfirmation('view', { itemCount: 1 });
    
    if (noConfirmNeeded) {
        console.log('✅ PASS: Non-sensitive operation correctly identified');
        passedTests++;
    } else {
        console.log('❌ FAIL: Non-sensitive operation incorrectly flagged');
    }

    // Test 3: Bulk operation detection
    totalTests++;
    console.log('\nTest 3: Bulk Operation Detection');
    const bulkRequiresConfirm = authHandler.requiresConfirmation('update', { itemCount: 15 });
    
    if (bulkRequiresConfirm) {
        console.log('✅ PASS: Bulk operation detected');
        passedTests++;
    } else {
        console.log('❌ FAIL: Bulk operation not detected');
    }

    // Test 4: Confirmation message generation
    totalTests++;
    console.log('\nTest 4: Confirmation Message Generation');
    const deleteMessage = authHandler.generateConfirmationMessage('delete', { itemCount: 3 });
    
    if (deleteMessage.includes('3') && deleteMessage.includes('刪除')) {
        console.log('✅ PASS: Appropriate confirmation message generated');
        passedTests++;
    } else {
        console.log('❌ FAIL: Confirmation message not appropriate');
    }

    // Test 5: Authorization validation (mock)
    totalTests++;
    console.log('\nTest 5: Authorization Validation Logic');
    
    // Test non-sensitive operation
    authHandler.validateOperation('view', {}).then(result => {
        if (result.authorized && !result.confirmed) {
            console.log('✅ PASS: Non-sensitive operation authorized without confirmation');
            passedTests++;
        } else {
            console.log('❌ FAIL: Non-sensitive operation handling incorrect');
        }
        
        // Summary after async test
        setTimeout(() => {
            console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
            
            if (passedTests === totalTests) {
                console.log('🎉 All CWE-862 protection tests PASSED!');
            } else {
                console.log('⚠️  Some tests FAILED - review implementation');
            }
        }, 100);
    }).catch(error => {
        console.log('❌ FAIL: Authorization validation error:', error.message);
        
        setTimeout(() => {
            console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
            console.log('⚠️  Some tests FAILED - review implementation');
        }, 100);
    });

    return passedTests === totalTests;
}

// Run tests if called directly
if (require.main === module) {
    runSmokeTests();
}

module.exports = { runSmokeTests };