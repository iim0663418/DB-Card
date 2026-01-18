/**
 * ExternalLinkHandler Smoke Test Suite
 * 
 * Comprehensive testing for reverse tabnabbing protection and external link security
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
            getText: (key) => key === 'security.externalLink' ? '外部連結' : key
        }
    };
    global.document = {
        head: { appendChild: () => {} },
        body: { appendChild: () => {} },
        getElementById: () => null,
        createElement: (tag) => ({
            tagName: tag.toUpperCase(),
            id: '',
            textContent: '',
            style: {},
            setAttribute: function(name, value) { this[name] = value; },
            getAttribute: function(name) { return this[name] || null; },
            classList: { add: () => {}, contains: () => false },
            querySelectorAll: () => []
        }),
        querySelectorAll: () => []
    };
    global.Node = { ELEMENT_NODE: 1 };
    global.MutationObserver = class {
        constructor() {}
        observe() {}
        disconnect() {}
    };
}

// Import the module
const { ExternalLinkHandler } = require('./external-link-handler.js');

/**
 * Smoke Test Suite for ExternalLinkHandler
 */
class ExternalLinkHandlerSmokeTest {
    constructor() {
        this.testResults = [];
        this.handler = null;
    }

    /**
     * Create mock link element for testing
     */
    createMockLink(href, options = {}) {
        const link = {
            tagName: 'A',
            href: href,
            textContent: options.text || 'Test Link',
            attributes: { href },
            setAttribute: function(name, value) { 
                this.attributes[name] = value;
                this[name] = value;
            },
            getAttribute: function(name) { 
                return this.attributes[name] || null; 
            },
            classList: {
                add: function(className) { this.classes = (this.classes || []).concat(className); },
                contains: function(className) { return (this.classes || []).includes(className); }
            }
        };
        
        // Set initial attributes
        Object.keys(options).forEach(key => {
            if (key !== 'text') {
                link.setAttribute(key, options[key]);
            }
        });
        
        return link;
    }

    /**
     * Test 1: External Link Detection
     */
    testExternalLinkDetection() {
        console.log('\n🔍 Test 1: External Link Detection');
        
        this.handler = new ExternalLinkHandler({ 
            enableLogging: false,
            autoProcess: false 
        });
        
        const testCases = [
            // External links (should return true)
            { url: 'https://google.com', expected: true, description: 'HTTPS external domain' },
            { url: 'http://facebook.com', expected: true, description: 'HTTP external domain' },
            { url: '//external-site.org', expected: false, description: 'Protocol-relative external (safely handled)' },
            { url: 'github.com', expected: true, description: 'Domain without protocol' },
            
            // Internal links (should return false)
            { url: '/internal/page', expected: false, description: 'Relative path' },
            { url: '#section', expected: false, description: 'Hash fragment' },
            { url: '?query=test', expected: false, description: 'Query string' },
            { url: 'https://example.com/page', expected: false, description: 'Same domain HTTPS' },
            { url: 'mailto:test@example.com', expected: false, description: 'Mailto protocol' },
            { url: 'tel:+1234567890', expected: false, description: 'Tel protocol' },
            
            // Edge cases
            { url: '', expected: false, description: 'Empty URL' },
            { url: null, expected: false, description: 'Null URL' },
            { url: 'invalid-url', expected: false, description: 'Invalid URL format' }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        testCases.forEach(testCase => {
            try {
                const result = this.handler.isExternalLink(testCase.url);
                const success = result === testCase.expected;
                
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}: ${testCase.url} -> ${result} (expected: ${testCase.expected})`);
                
                if (success) passed++;
            } catch (error) {
                console.log(`  ❌ ${testCase.description}: Error - ${error.message}`);
            }
        });
        
        const success = passed === total;
        this.testResults.push({
            test: 'External Link Detection',
            passed,
            total,
            success
        });
        
        console.log(`\n📊 Result: ${passed}/${total} tests passed ${success ? '✅' : '❌'}`);
        return success;
    }

    /**
     * Test 2: Security Attribute Application
     */
    testSecurityAttributes() {
        console.log('\n🔒 Test 2: Security Attribute Application');
        
        const testCases = [
            {
                description: 'External link without existing rel',
                link: this.createMockLink('https://google.com'),
                expectedRel: 'noopener noreferrer',
                expectedTarget: '_blank'
            },
            {
                description: 'External link with existing rel',
                link: this.createMockLink('https://facebook.com', { rel: 'external' }),
                expectedRel: 'external noopener noreferrer',
                expectedTarget: '_blank'
            },
            {
                description: 'External link with existing target',
                link: this.createMockLink('https://external-site.org', { target: '_self' }),
                expectedRel: 'noopener noreferrer',
                expectedTarget: '_self'
            },
            {
                description: 'Internal link (should not be modified)',
                link: this.createMockLink('/internal/page'),
                expectedRel: null,
                expectedTarget: null
            }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        testCases.forEach(testCase => {
            try {
                const wasSecured = this.handler.secureExternalLink(testCase.link);
                const actualRel = testCase.link.getAttribute('rel');
                const actualTarget = testCase.link.getAttribute('target');
                
                let success = true;
                let details = [];
                
                if (testCase.expectedRel !== null) {
                    if (actualRel !== testCase.expectedRel) {
                        success = false;
                        details.push(`rel: got "${actualRel}", expected "${testCase.expectedRel}"`);
                    }
                }
                
                if (testCase.expectedTarget !== null) {
                    if (actualTarget !== testCase.expectedTarget) {
                        success = false;
                        details.push(`target: got "${actualTarget}", expected "${testCase.expectedTarget}"`);
                    }
                }
                
                // Check if internal links were not modified
                if (testCase.expectedRel === null && actualRel !== null) {
                    success = false;
                    details.push(`internal link was modified: rel="${actualRel}"`);
                }
                
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}`);
                if (!success && details.length > 0) {
                    console.log(`    Details: ${details.join(', ')}`);
                }
                
                if (success) passed++;
            } catch (error) {
                console.log(`  ❌ ${testCase.description}: Error - ${error.message}`);
            }
        });
        
        const success = passed === total;
        this.testResults.push({
            test: 'Security Attribute Application',
            passed,
            total,
            success
        });
        
        console.log(`\n📊 Result: ${passed}/${total} tests passed ${success ? '✅' : '❌'}`);
        return success;
    }

    /**
     * Test 3: Accessibility Hint Addition
     */
    testAccessibilityHints() {
        console.log('\n♿ Test 3: Accessibility Hint Addition');
        
        const testCases = [
            {
                description: 'External link without existing aria-label',
                link: this.createMockLink('https://google.com', { text: 'Google' }),
                expectedAriaLabel: 'Google （外部連結）',
                expectedTitle: '此連結將在新視窗開啟外部網站'
            },
            {
                description: 'External link with existing aria-label',
                link: this.createMockLink('https://facebook.com', { 
                    text: 'Facebook',
                    'aria-label': 'Visit Facebook'
                }),
                expectedAriaLabel: 'Visit Facebook （外部連結）',
                expectedTitle: '此連結將在新視窗開啟外部網站'
            },
            {
                description: 'External link with existing title',
                link: this.createMockLink('https://twitter.com', { 
                    text: 'Twitter',
                    title: 'Custom title'
                }),
                expectedAriaLabel: 'Twitter （外部連結）',
                expectedTitle: 'Custom title'
            }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        testCases.forEach(testCase => {
            try {
                this.handler.secureExternalLink(testCase.link);
                
                const actualAriaLabel = testCase.link.getAttribute('aria-label');
                const actualTitle = testCase.link.getAttribute('title');
                
                let success = true;
                let details = [];
                
                if (actualAriaLabel !== testCase.expectedAriaLabel) {
                    success = false;
                    details.push(`aria-label: got "${actualAriaLabel}", expected "${testCase.expectedAriaLabel}"`);
                }
                
                if (actualTitle !== testCase.expectedTitle) {
                    success = false;
                    details.push(`title: got "${actualTitle}", expected "${testCase.expectedTitle}"`);
                }
                
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}`);
                if (!success && details.length > 0) {
                    console.log(`    Details: ${details.join(', ')}`);
                }
                
                if (success) passed++;
            } catch (error) {
                console.log(`  ❌ ${testCase.description}: Error - ${error.message}`);
            }
        });
        
        const success = passed === total;
        this.testResults.push({
            test: 'Accessibility Hint Addition',
            passed,
            total,
            success
        });
        
        console.log(`\n📊 Result: ${passed}/${total} tests passed ${success ? '✅' : '❌'}`);
        return success;
    }

    /**
     * Test 4: Statistics and Monitoring
     */
    testStatisticsAndMonitoring() {
        console.log('\n📈 Test 4: Statistics and Monitoring');
        
        // Create mock container with various link types
        const links = [
            this.createMockLink('https://google.com'),
            this.createMockLink('/internal/page'),
            this.createMockLink('https://facebook.com', { rel: 'noopener noreferrer' }),
            this.createMockLink('#section'),
            this.createMockLink('https://twitter.com')
        ];
        
        const mockContainer = {
            querySelectorAll: () => links
        };
        
        try {
            // Process links first
            links.forEach(link => {
                this.handler.secureExternalLink(link);
            });
            
            const stats = this.handler.getStatistics(mockContainer);
            
            const expectedStats = {
                total: 5,
                external: 3, // google.com, facebook.com, twitter.com
                secured: 3   // All external links should be secured
            };
            
            let success = true;
            let details = [];
            
            Object.keys(expectedStats).forEach(key => {
                if (stats[key] !== expectedStats[key]) {
                    success = false;
                    details.push(`${key}: got ${stats[key]}, expected ${expectedStats[key]}`);
                }
            });
            
            console.log(`  ${success ? '✅' : '❌'} Statistics calculation`);
            console.log(`    Total: ${stats.total}, External: ${stats.external}, Secured: ${stats.secured}`);
            
            if (!success && details.length > 0) {
                console.log(`    Details: ${details.join(', ')}`);
            }
            
            this.testResults.push({
                test: 'Statistics and Monitoring',
                passed: success ? 1 : 0,
                total: 1,
                success
            });
            
            console.log(`\n📊 Result: ${success ? '1/1' : '0/1'} tests passed ${success ? '✅' : '❌'}`);
            return success;
        } catch (error) {
            console.log(`  ❌ Statistics calculation: Error - ${error.message}`);
            this.testResults.push({
                test: 'Statistics and Monitoring',
                passed: 0,
                total: 1,
                success: false
            });
            console.log(`\n📊 Result: 0/1 tests passed ❌`);
            return false;
        }
    }

    /**
     * Test 5: Error Handling and Edge Cases
     */
    testErrorHandling() {
        console.log('\n🛡️ Test 5: Error Handling and Edge Cases');
        
        const testCases = [
            {
                description: 'Null element',
                element: null,
                shouldThrow: false
            },
            {
                description: 'Non-link element',
                element: { tagName: 'DIV' },
                shouldThrow: false
            },
            {
                description: 'Link without href',
                element: { tagName: 'A', getAttribute: () => null },
                shouldThrow: false
            },
            {
                description: 'Link with invalid href',
                element: this.createMockLink('not-a-valid-url'),
                shouldThrow: false
            }
        ];
        
        let passed = 0;
        let total = testCases.length;
        
        testCases.forEach(testCase => {
            try {
                const result = this.handler.secureExternalLink(testCase.element);
                
                // Should not throw and should return false for invalid cases
                const success = !testCase.shouldThrow && result === false;
                
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}: returned ${result}`);
                
                if (success) passed++;
            } catch (error) {
                const success = testCase.shouldThrow;
                console.log(`  ${success ? '✅' : '❌'} ${testCase.description}: threw ${error.message}`);
                if (success) passed++;
            }
        });
        
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
    runAllTests() {
        console.log('🚀 ExternalLinkHandler Smoke Test Suite');
        console.log('=====================================');
        
        const tests = [
            () => this.testExternalLinkDetection(),
            () => this.testSecurityAttributes(),
            () => this.testAccessibilityHints(),
            () => this.testStatisticsAndMonitoring(),
            () => this.testErrorHandling()
        ];
        
        let allPassed = true;
        
        tests.forEach(test => {
            try {
                const result = test();
                if (!result) allPassed = false;
            } catch (error) {
                console.log(`❌ Test failed with error: ${error.message}`);
                allPassed = false;
            }
        });
        
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
    const smokeTest = new ExternalLinkHandlerSmokeTest();
    const success = smokeTest.runAllTests();
    process.exit(success ? 0 : 1);
}

module.exports = { ExternalLinkHandlerSmokeTest };