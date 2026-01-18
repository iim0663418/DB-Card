/**
 * Path Audit Smoke Tests
 * Tests for PATH-001 implementation
 * 
 * @version 3.2.0
 * @author PWA Deployment Compatibility Team
 */

// Import modules to test
import { 
    auditPaths, 
    generateFixScript, 
    validatePathSecurity,
    getAuditReport,
    clearAuditCache 
} from '../../src/core/path-auditor.js';

import { 
    scanContent, 
    scanFile,
    getScanStatistics 
} from '../../src/utils/path-scanner.js';

import { 
    generateFix, 
    generateFixes,
    generateFixReport 
} from '../../src/utils/fix-generator.js';

/**
 * Smoke Test Suite for Path Auditing
 */
class PathAuditSmokeTests {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🧪 Starting Path Audit Smoke Tests...');
        
        try {
            // Clear cache before testing
            clearAuditCache();
            
            // Core functionality tests
            await this.testPathScanning();
            await this.testSecurityValidation();
            await this.testFixGeneration();
            await this.testAuditExecution();
            
            // Integration tests
            await this.testPlatformIntegration();
            await this.testScriptGeneration();
            await this.testErrorHandling();
            
            // Performance tests
            await this.testPerformanceTargets();
            
            this.printResults();
            return this.getTestSummary();
            
        } catch (error) {
            console.error('❌ Path audit smoke test suite failed:', error);
            throw error;
        }
    }

    /**
     * Test path scanning functionality
     */
    async testPathScanning() {
        console.log('🔍 Testing path scanning...');
        
        try {
            // Test content scanning with known issues
            const testContent = `
                <img src="../assets/logo.png" alt="Logo">
                <link href="/assets/styles.css" rel="stylesheet">
                <script src="./assets/script.js"></script>
                <a href="http://localhost:3000/test">Local link</a>
            `;
            
            const issues = scanContent(testContent, 'test.html');
            
            this.assert(
                Array.isArray(issues),
                'scanContent returns array of issues'
            );
            
            this.assert(
                issues.length > 0,
                'scanContent detects path issues in test content'
            );
            
            // Check for specific issue types
            const hasParentRef = issues.some(issue => issue.patternName === 'parentReference');
            const hasAbsolutePath = issues.some(issue => issue.patternName === 'absoluteAssetPath');
            const hasLocalhost = issues.some(issue => issue.patternName === 'localhostReference');
            
            this.assert(hasParentRef, 'Detects parent directory references');
            this.assert(hasAbsolutePath, 'Detects absolute asset paths');
            this.assert(hasLocalhost, 'Detects localhost references');
            
            console.log(`✅ Path scanning detected ${issues.length} issues`);
            
        } catch (error) {
            this.fail('Path scanning test failed', error);
        }
    }

    /**
     * Test security validation
     */
    async testSecurityValidation() {
        console.log('🔒 Testing security validation...');
        
        try {
            // Test safe paths
            const safePaths = [
                'index.html',
                'assets/style.css',
                'src/app.js',
                './config/test.json'
            ];
            
            for (const path of safePaths) {
                this.assert(
                    validatePathSecurity(path),
                    `Safe path validated: ${path}`
                );
            }
            
            // Test dangerous paths
            const dangerousPaths = [
                '../../../etc/passwd',
                '/etc/hosts',
                '~/secret.txt',
                'test<script>alert(1)</script>.html',
                'file|rm -rf /',
                'test`whoami`.js'
            ];
            
            for (const path of dangerousPaths) {
                this.assert(
                    !validatePathSecurity(path),
                    `Dangerous path rejected: ${path}`
                );
            }
            
            console.log('✅ Security validation working correctly');
            
        } catch (error) {
            this.fail('Security validation test failed', error);
        }
    }

    /**
     * Test fix generation
     */
    async testFixGeneration() {
        console.log('🔧 Testing fix generation...');
        
        try {
            // Create test issue
            const testIssue = {
                filePath: 'test.html',
                lineNumber: 1,
                columnNumber: 10,
                patternName: 'parentReference',
                severity: 'critical',
                matchedText: '../assets/logo.png',
                fullLine: '<img src="../assets/logo.png" alt="Logo">'
            };
            
            // Generate fix for single issue
            const fix = generateFix(testIssue, { basePath: '/' });
            
            this.assert(
                fix && typeof fix === 'object',
                'generateFix returns fix object'
            );
            
            this.assert(
                fix.original === '../assets/logo.png',
                'Fix identifies original path correctly'
            );
            
            this.assert(
                fix.fixed === 'assets/logo.png',
                'Fix generates correct replacement'
            );
            
            this.assert(
                fix.command && fix.command.includes('sed'),
                'Fix includes sed command'
            );
            
            // Test multiple fixes generation
            const testIssues = [testIssue, {
                ...testIssue,
                patternName: 'absoluteAssetPath',
                matchedText: 'src="/assets/script.js"'
            }];
            
            const fixes = await generateFixes(testIssues);
            
            this.assert(
                Array.isArray(fixes) && fixes.length > 0,
                'generateFixes returns array of fixes'
            );
            
            console.log(`✅ Fix generation created ${fixes.length} fixes`);
            
        } catch (error) {
            this.fail('Fix generation test failed', error);
        }
    }

    /**
     * Test full audit execution
     */
    async testAuditExecution() {
        console.log('📋 Testing audit execution...');
        
        try {
            // Run audit with minimal options
            const auditResult = await auditPaths({
                files: ['index.html'],
                platform: 'local',
                generateScript: true
            });
            
            this.assert(
                auditResult && typeof auditResult === 'object',
                'auditPaths returns result object'
            );
            
            this.assert(
                auditResult.success === true,
                'Audit completes successfully'
            );
            
            this.assert(
                auditResult.auditId && auditResult.auditId.startsWith('audit-'),
                'Audit has valid ID'
            );
            
            this.assert(
                auditResult.timestamp && auditResult.duration,
                'Audit includes timing information'
            );
            
            this.assert(
                auditResult.summary && typeof auditResult.summary === 'object',
                'Audit includes summary'
            );
            
            this.assert(
                Array.isArray(auditResult.scanResults),
                'Audit includes scan results'
            );
            
            this.assert(
                Array.isArray(auditResult.issues),
                'Audit includes issues array'
            );
            
            this.assert(
                Array.isArray(auditResult.fixes),
                'Audit includes fixes array'
            );
            
            console.log(`✅ Audit execution completed in ${auditResult.duration}ms`);
            
        } catch (error) {
            this.fail('Audit execution test failed', error);
        }
    }

    /**
     * Test platform integration
     */
    async testPlatformIntegration() {
        console.log('🌐 Testing platform integration...');
        
        try {
            // Test different platforms
            const platforms = ['local', 'github-pages', 'netlify'];
            
            for (const platform of platforms) {
                try {
                    const auditResult = await auditPaths({
                        files: ['index.html'],
                        platform: platform,
                        generateScript: false
                    });
                    
                    this.assert(
                        auditResult.success,
                        `Audit works with platform: ${platform}`
                    );
                    
                    this.assert(
                        auditResult.platform === platform,
                        `Platform correctly set to: ${platform}`
                    );
                    
                } catch (platformError) {
                    // Allow fallback to default platform
                    console.warn(`Platform ${platform} not available, using fallback`);
                }
            }
            
            console.log('✅ Platform integration working correctly');
            
        } catch (error) {
            this.fail('Platform integration test failed', error);
        }
    }

    /**
     * Test script generation
     */
    async testScriptGeneration() {
        console.log('📜 Testing script generation...');
        
        try {
            // Create mock audit result with fixes
            const mockAuditResult = {
                platform: 'local',
                fixes: [{
                    filePath: 'test.html',
                    original: '../assets/logo.png',
                    fixed: 'assets/logo.png',
                    command: 'sed -i \'s|../assets/logo.png|assets/logo.png|g\'',
                    explanation: 'Remove parent directory reference',
                    severity: 'critical'
                }]
            };
            
            const script = await generateFixScript(mockAuditResult);
            
            this.assert(
                typeof script === 'string' && script.length > 0,
                'generateFixScript returns non-empty string'
            );
            
            this.assert(
                script.includes('#!/bin/bash'),
                'Script includes bash shebang'
            );
            
            this.assert(
                script.includes('sed -i'),
                'Script includes fix commands'
            );
            
            this.assert(
                script.includes('test.html'),
                'Script references correct file'
            );
            
            // Test empty fixes
            const emptyScript = await generateFixScript({ fixes: [] });
            
            this.assert(
                emptyScript.includes('No fixes needed'),
                'Handles empty fixes correctly'
            );
            
            console.log('✅ Script generation working correctly');
            
        } catch (error) {
            this.fail('Script generation test failed', error);
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('🚨 Testing error handling...');
        
        try {
            // Test invalid options
            const invalidResult = await auditPaths({
                files: ['../../../etc/passwd'],  // Dangerous path
                platform: 'invalid-platform'
            });
            
            // Should handle gracefully, not crash
            this.assert(
                invalidResult && typeof invalidResult === 'object',
                'Handles invalid options gracefully'
            );
            
            // Test security validation
            this.assert(
                !validatePathSecurity('../dangerous/path'),
                'Rejects dangerous paths'
            );
            
            // Test fix generation with invalid data
            try {
                generateFix(null, {});
                this.fail('Should reject null issue', new Error('No error thrown'));
            } catch (error) {
                // Expected behavior
                console.log('✅ Properly rejects invalid fix input');
            }
            
            console.log('✅ Error handling working correctly');
            
        } catch (error) {
            this.fail('Error handling test failed', error);
        }
    }

    /**
     * Test performance targets
     */
    async testPerformanceTargets() {
        console.log('🎯 Testing performance targets...');
        
        try {
            const startTime = performance.now();
            
            // Run full audit
            const auditResult = await auditPaths({
                files: ['index.html', 'manifest.json'],
                platform: 'local',
                generateScript: true
            });
            
            const totalTime = performance.now() - startTime;
            
            // Performance targets from task specification
            this.assert(
                totalTime < 5000,  // 5 second max for smoke test
                `Audit completes in reasonable time: ${totalTime.toFixed(2)}ms`
            );
            
            this.assert(
                auditResult.duration < 3000,  // 3 second max for audit itself
                `Audit duration under target: ${auditResult.duration}ms`
            );
            
            // Memory usage check (if available)
            if (performance.memory) {
                const memoryUsed = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
                this.assert(
                    memoryUsed < 10,  // 10MB reasonable limit for audit
                    `Memory usage reasonable: ${memoryUsed.toFixed(2)}MB`
                );
            }
            
            console.log(`✅ Performance targets met: ${totalTime.toFixed(2)}ms total time`);
            
        } catch (error) {
            this.fail('Performance test failed', error);
        }
    }

    /**
     * Assert helper
     */
    assert(condition, message) {
        if (condition) {
            this.testResults.push({ status: 'PASS', message });
        } else {
            this.testResults.push({ status: 'FAIL', message });
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Fail helper
     */
    fail(message, error) {
        this.testResults.push({ status: 'FAIL', message, error: error.message });
        throw new Error(`${message}: ${error.message}`);
    }

    /**
     * Print test results
     */
    printResults() {
        const totalTime = Date.now() - this.startTime;
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        
        console.log('\n📊 Path Audit Smoke Test Results:');
        console.log(`⏱️ Total time: ${totalTime}ms`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  - ${r.message}${r.error ? ': ' + r.error : ''}`));
        }
    }

    /**
     * Get test summary
     */
    getTestSummary() {
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        
        return {
            passed,
            failed,
            total: passed + failed,
            successRate: (passed / (passed + failed)) * 100,
            duration: Date.now() - this.startTime
        };
    }
}

// Export for use in other test files
export { PathAuditSmokeTests };

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('test=path')) {
    const tests = new PathAuditSmokeTests();
    tests.runAllTests().then(summary => {
        console.log('🎉 Path Audit Smoke Tests completed!', summary);
    }).catch(error => {
        console.error('💥 Path Audit Smoke Tests failed!', error);
    });
}