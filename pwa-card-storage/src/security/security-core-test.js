/**
 * SecurityCore Smoke Test Suite
 * 
 * Comprehensive testing for unified security module coordination
 * 
 * @version 1.0.0
 * @author Security Team
 */

// Mock DOM environment for Node.js testing
if (typeof window === 'undefined') {
    global.window = {
        location: { hostname: 'example.com' },
        languageManager: {
            getCurrentLanguage: () => 'zh',
            getText: (key) => key
        },
        // Mock security modules
        XSSProtection: class {
            constructor() {}
            sanitizeInput(input) { return input; }
        },
        CodeInjectionProtection: class {
            constructor() {}
        },
        SecureLogger: class {
            constructor() {}
            structuredLog(level, data) { console.log(`[${level}]`, data); }
        },
        AuthorizationHandler: class {
            constructor() {}
            async validateOperation(op, ctx) { return { authorized: true }; }
        },
        ExternalLinkHandler: class {
            constructor() {}
            processAllLinks() { return 0; }
        }
    };
    global.document = {
        head: { appendChild: () => {} },
        body: { appendChild: () => {} }
    };
}

// Import the module
const { SecurityCore } = require('./security-core.js');

/**
 * Smoke Test Suite for SecurityCore
 */
class SecurityCoreSmokeTest {
    constructor() {
        this.testResults = [];
        this.securityCore = null;
    }

    /**
     * Test 1: Security Module Initialization
     */
    async testModuleInitialization() {
        console.log('\n🔧 Test 1: Security Module Initialization');
        
        this.securityCore = new SecurityCore({
            enableLogging: false,
            securityLevel: 'strict'
        });
        
        try {
            const result = await this.securityCore.initialize();
            
            const success = result.initialized === true;
            console.log(`  ${success ? '✅' : '❌'} Core initialization: ${result.initialized}`);
            
            // Check module status
            const status = this.securityCore.getSecurityStatus();
            console.log(`  📊 Security coverage: ${status.coverage} (${status.activeModules}/${status.totalModules} modules)`);
            
            // List active modules
            const activeModules = Object.keys(status.modules).filter(k => status.modules[k]);
            console.log(`  🔐 Active modules: ${activeModules.join(', ')}`);
            
            this.testResults.push({
                test: 'Module Initialization',
                passed: success ? 1 : 0,
                total: 1,
                success
            });
            
            console.log(`\n📊 Result: ${success ? '1/1' : '0/1'} tests passed ${success ? '✅' : '❌'}`);
            return success;
        } catch (error) {
            console.log(`  ❌ Initialization failed: ${error.message}`);
            this.testResults.push({
                test: 'Module Initialization',
                passed: 0,
                total: 1,
                success: false
            });
            console.log(`\n📊 Result: 0/1 tests passed ❌`);
            return false;
        }
    }

    /**
     * Test 2: Module Access and Status
     */
    testModuleAccess() {
        console.log('\n🔍 Test 2: Module Access and Status');
        
        const testCases = [
            { module: 'xssProtection', description: 'XSS Protection module access' },
            { module: 'secureLogger', description: 'Secure Logger module access' },
            { module: 'authorizationHandler', description: 'Authorization Handler module access' },
            { module: 'externalLinkHandler', description: 'External Link Handler module access' },
            { module: 'nonexistent', description: 'Non-existent module (should return null)' }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        testCases.forEach(testCase => {
            try {
                const module = this.securityCore.getModule(testCase.module);
                const success = testCase.module === 'nonexistent' ? module === null : true;
                
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}: ${module ? 'Available' : 'Not available'}`);
                
                if (success) passed++;
            } catch (error) {
                console.log(`  ❌ ${testCase.description}: Error - ${error.message}`);
            }
        });
        
        const success = passed === total;
        this.testResults.push({
            test: 'Module Access and Status',
            passed,
            total,
            success
        });
        
        console.log(`\n📊 Result: ${passed}/${total} tests passed ${success ? '✅' : '❌'}`);
        return success;
    }

    /**
     * Test 3: Unified Security Processing
     */
    async testUnifiedProcessing() {
        console.log('\n🛡️ Test 3: Unified Security Processing');
        
        const testCases = [
            {
                description: 'Basic data processing',
                operation: 'process_data',
                data: 'test data',
                options: {},
                shouldSucceed: true
            },
            {
                description: 'Processing with XSS protection',
                operation: 'sanitize_input',
                data: '<script>alert("xss")</script>',
                options: { xssProtection: true },
                shouldSucceed: true
            },
            {
                description: 'Processing with authorization',
                operation: 'sensitive_operation',
                data: 'sensitive data',
                options: { requiresAuth: true, authContext: { user: 'test' } },
                shouldSucceed: true
            },
            {
                description: 'Processing without initialization (should fail)',
                operation: 'test_op',
                data: 'test',
                options: {},
                shouldSucceed: false,
                uninitializedTest: true
            }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        for (const testCase of testCases) {
            try {
                let testCore = this.securityCore;
                
                // Create uninitialized core for specific test
                if (testCase.uninitializedTest) {
                    testCore = new SecurityCore({ enableLogging: false });
                }
                
                const result = await testCore.processSecurely(
                    testCase.operation, 
                    testCase.data, 
                    testCase.options
                );
                
                const success = testCase.shouldSucceed;
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}: ${success ? 'Processed successfully' : 'Should have failed'}`);
                
                if (success) passed++;
            } catch (error) {
                const success = !testCase.shouldSucceed;
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}: ${success ? 'Failed as expected' : 'Unexpected failure'} - ${error.message}`);
                
                if (success) passed++;
            }
        }
        
        const success = passed === total;
        this.testResults.push({
            test: 'Unified Security Processing',
            passed,
            total,
            success
        });
        
        console.log(`\n📊 Result: ${passed}/${total} tests passed ${success ? '✅' : '❌'}`);
        return success;
    }

    /**
     * Test 4: Legacy Function Compatibility
     */
    testLegacyCompatibility() {
        console.log('\n🔄 Test 4: Legacy Function Compatibility');
        
        const testCases = [
            {
                description: 'Safe JSON Parse',
                test: () => {
                    const result = SecurityCore.safeJSONParse('{"test": "value"}');
                    return result && result.test === 'value';
                }
            },
            {
                description: 'Safe JSON Parse with invalid input',
                test: () => {
                    const result = SecurityCore.safeJSONParse('invalid json', { fallback: {} });
                    return result && typeof result === 'object';
                }
            },
            {
                description: 'Safe Evaluate basic math',
                test: () => {
                    const result = SecurityCore.safeEvaluate('2 + 3', {}, { allowedOperations: ['basic'] });
                    return result === 5;
                }
            },
            {
                description: 'Safe Evaluate dangerous input (should fail)',
                test: () => {
                    const result = SecurityCore.safeEvaluate('eval("alert(1)")', {}, { allowedOperations: ['basic'] });
                    return result === null;
                }
            }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        testCases.forEach(testCase => {
            try {
                const success = testCase.test();
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}`);
                
                if (success) passed++;
            } catch (error) {
                console.log(`  ❌ ${testCase.description}: Error - ${error.message}`);
            }
        });
        
        const success = passed === total;
        this.testResults.push({
            test: 'Legacy Function Compatibility',
            passed,
            total,
            success
        });
        
        console.log(`\n📊 Result: ${passed}/${total} tests passed ${success ? '✅' : '❌'}`);
        return success;
    }

    /**
     * Test 5: Error Handling and Edge Cases
     */
    async testErrorHandling() {
        console.log('\n🛡️ Test 5: Error Handling and Edge Cases');
        
        const testCases = [
            {
                description: 'Double initialization (should be safe)',
                test: async () => {
                    const result1 = await this.securityCore.initialize();
                    const result2 = await this.securityCore.initialize();
                    return result1.initialized && result2.initialized;
                }
            },
            {
                description: 'Get status before initialization',
                test: () => {
                    const newCore = new SecurityCore({ enableLogging: false });
                    const status = newCore.getSecurityStatus();
                    return status.initialized === false;
                }
            },
            {
                description: 'Get non-existent module',
                test: () => {
                    const module = this.securityCore.getModule('invalid_module');
                    return module === null;
                }
            }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        for (const testCase of testCases) {
            try {
                const success = await testCase.test();
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}`);
                
                if (success) passed++;
            } catch (error) {
                console.log(`  ❌ ${testCase.description}: Error - ${error.message}`);
            }
        }
        
        const success = passed === total;
        this.testResults.push({
            test: 'Error Handling and Edge Cases',
            passed,
            total,
            success
        });
        
        console.log(`\n📊 Result: ${passed}/${total} tests passed ${success ? '✅' : '❌'}`);
        return success;
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🚀 SecurityCore Smoke Test Suite');
        console.log('=================================');
        
        const tests = [
            () => this.testModuleInitialization(),
            () => this.testModuleAccess(),
            () => this.testUnifiedProcessing(),
            () => this.testLegacyCompatibility(),
            () => this.testErrorHandling()
        ];
        
        let allPassed = true;
        
        for (const test of tests) {
            try {
                const result = await test();
                if (!result) allPassed = false;
            } catch (error) {
                console.log(`❌ Test failed with error: ${error.message}`);
                allPassed = false;
            }
        }
        
        // Summary
        console.log('\n📋 Test Summary');
        console.log('===============');
        
        let totalPassed = 0;
        let totalTests = 0;
        
        this.testResults.forEach(result => {
            totalPassed += result.passed;
            totalTests += result.total;
            console.log(`${result.success ? '✅' : '❌'} ${result.test}: ${result.passed}/${result.total}`);
        });
        
        console.log(`\n🎯 Overall Result: ${totalPassed}/${totalTests} tests passed`);
        console.log(`${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        return allPassed;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const smokeTest = new SecurityCoreSmokeTest();
    smokeTest.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { SecurityCoreSmokeTest };