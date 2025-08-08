#!/usr/bin/env node

/**
 * RESOURCE-04 Smoke Test Suite: Resource Loading Validation
 * 
 * Validates comprehensive resource loading validation, SRI checks,
 * error handling, and user-friendly error messages.
 * 
 * @version 3.2.0-resource-04-smoke
 */

const fs = require('fs');
const path = require('path');

class Resource04SmokeTest {
    constructor() {
        this.projectRoot = process.cwd();
        this.pwaRoot = path.join(this.projectRoot, 'pwa-card-storage');
        this.indexPath = path.join(this.pwaRoot, 'index.html');
        this.reportPath = path.join(this.projectRoot, 'deploy', 'resource-04-validation-report.json');
        this.results = [];
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🧪 RESOURCE-04 Smoke Tests: Resource Loading Validation\n');

        const tests = [
            () => this.testResourceValidationSystem(),
            () => this.testSRIIntegrityChecks(),
            () => this.testErrorHandlingImplementation(),
            () => this.testLoadingProgressMonitoring(),
            () => this.testUserFriendlyErrorMessages(),
            () => this.testFallbackResourceLoading(),
            () => this.testSecurityEnhancements(),
            () => this.testValidationReport()
        ];

        for (let i = 0; i < tests.length; i++) {
            try {
                await tests[i]();
                this.results.push({ test: i + 1, status: 'PASS' });
            } catch (error) {
                this.results.push({ test: i + 1, status: 'FAIL', error: error.message });
                console.error(`❌ Test ${i + 1} failed:`, error.message);
            }
        }

        this.printSummary();
        return this.results;
    }

    /**
     * Test 1: Resource Validation System
     */
    async testResourceValidationSystem() {
        console.log('🔍 Test 1: Resource Validation System');

        if (!fs.existsSync(this.indexPath)) {
            throw new Error('Enhanced HTML file not found');
        }

        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');

        // Check for resource validation class
        if (!htmlContent.includes('ResourceLoadingValidator')) {
            throw new Error('ResourceLoadingValidator class not found');
        }

        // Check for validation methods
        const requiredMethods = [
            'validateResource',
            'validateCriticalResources',
            'monitorResourceLoading',
            'setupGlobalErrorHandlers'
        ];

        for (const method of requiredMethods) {
            if (!htmlContent.includes(method)) {
                throw new Error(`Missing validation method: ${method}`);
            }
        }

        // Check for critical resource definitions
        if (!htmlContent.includes('criticalResources')) {
            throw new Error('Critical resources not defined');
        }

        // Check for backup file
        const backupPath = `${this.indexPath}.resource-04-backup`;
        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not created');
        }

        console.log('✅ Resource validation system implemented');
    }

    /**
     * Test 2: SRI Integrity Checks
     */
    async testSRIIntegrityChecks() {
        console.log('🔍 Test 2: SRI Integrity Checks');

        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');

        // Check for SRI hash generation
        if (!htmlContent.includes('generateSRIHash') && !htmlContent.includes('integrity=')) {
            throw new Error('SRI integrity checks not implemented');
        }

        // Check for content type validation
        if (!htmlContent.includes('isValidContentType')) {
            throw new Error('Content type validation not found');
        }

        // Check for crossorigin attributes
        const sriPattern = /integrity=["']sha384-[A-Za-z0-9+/=]+["']/;
        if (!sriPattern.test(htmlContent)) {
            console.warn('⚠️ No SRI hashes found in HTML (may be generated dynamically)');
        }

        console.log('✅ SRI integrity checks implemented');
    }

    /**
     * Test 3: Error Handling Implementation
     */
    async testErrorHandlingImplementation() {
        console.log('🔍 Test 3: Error Handling Implementation');

        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');

        // Check for error handling methods
        const errorHandlingMethods = [
            'handleResourceError',
            'handleLoadingTimeout',
            'showCriticalResourceError',
            'showUserFriendlyError'
        ];

        for (const method of errorHandlingMethods) {
            if (!htmlContent.includes(method)) {
                throw new Error(`Missing error handling method: ${method}`);
            }
        }

        // Check for global error handlers
        if (!htmlContent.includes('addEventListener(\'error\'') ||
            !htmlContent.includes('addEventListener(\'unhandledrejection\'')) {
            throw new Error('Global error handlers not set up');
        }

        // Check for error styling
        if (!htmlContent.includes('resource-error') ||
            !htmlContent.includes('notification')) {
            throw new Error('Error handling styles not found');
        }

        console.log('✅ Error handling implementation validated');
    }

    /**
     * Test 4: Loading Progress Monitoring
     */
    async testLoadingProgressMonitoring() {
        console.log('🔍 Test 4: Loading Progress Monitoring');

        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');

        // Check for progress monitoring methods
        const progressMethods = [
            'updateLoadingProgress',
            'monitorResourceLoading',
            'loadingTimeout'
        ];

        for (const method of progressMethods) {
            if (!htmlContent.includes(method)) {
                throw new Error(`Missing progress monitoring method: ${method}`);
            }
        }

        // Check for loading overlay elements
        if (!htmlContent.includes('loading-overlay') ||
            !htmlContent.includes('loading-spinner') ||
            !htmlContent.includes('loading-text')) {
            throw new Error('Loading progress elements not found');
        }

        // Check for timeout handling
        if (!htmlContent.includes('setTimeout') ||
            !htmlContent.includes('30000')) {
            throw new Error('Loading timeout not configured');
        }

        console.log('✅ Loading progress monitoring validated');
    }

    /**
     * Test 5: User-Friendly Error Messages
     */
    async testUserFriendlyErrorMessages() {
        console.log('🔍 Test 5: User-Friendly Error Messages');

        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');

        // Check for message sanitization
        if (!htmlContent.includes('sanitizeMessage')) {
            throw new Error('Message sanitization not implemented');
        }

        // Check for XSS protection in sanitization
        const sanitizationChecks = [
            'replace(/</g, \'&lt;\')',
            'replace(/>/g, \'&gt;\')',
            'replace(/"/g, \'&quot;\')'
        ];

        for (const check of sanitizationChecks) {
            if (!htmlContent.includes(check)) {
                throw new Error(`Missing XSS protection: ${check}`);
            }
        }

        // Check for notification system
        if (!htmlContent.includes('notification-content') ||
            !htmlContent.includes('notification-message') ||
            !htmlContent.includes('notification-close')) {
            throw new Error('Notification system not found');
        }

        // Check for Chinese error messages
        if (!htmlContent.includes('部分功能可能無法正常運作') ||
            !htmlContent.includes('關鍵資源載入失敗')) {
            throw new Error('Localized error messages not found');
        }

        console.log('✅ User-friendly error messages validated');
    }

    /**
     * Test 6: Fallback Resource Loading
     */
    async testFallbackResourceLoading() {
        console.log('🔍 Test 6: Fallback Resource Loading');

        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');

        // Check for fallback methods
        const fallbackMethods = [
            'loadFallbackResource',
            'retryCriticalResource',
            'isCriticalResource'
        ];

        for (const method of fallbackMethods) {
            if (!htmlContent.includes(method)) {
                throw new Error(`Missing fallback method: ${method}`);
            }
        }

        // Check for fallback resource definitions
        if (!htmlContent.includes('fallbacks') ||
            !htmlContent.includes('fallback.css') ||
            !htmlContent.includes('app-minimal.js')) {
            throw new Error('Fallback resources not defined');
        }

        // Check for retry logic
        if (!htmlContent.includes('retryAttempts') ||
            !htmlContent.includes('retryDelay')) {
            throw new Error('Retry logic not configured');
        }

        // Check for UI degradation handling
        if (!htmlContent.includes('updateUIForMissingResource') ||
            !htmlContent.includes('disabled = true')) {
            throw new Error('UI degradation handling not found');
        }

        console.log('✅ Fallback resource loading validated');
    }

    /**
     * Test 7: Security Enhancements
     */
    async testSecurityEnhancements() {
        console.log('🔍 Test 7: Security Enhancements');

        // Check validation report
        if (!fs.existsSync(this.reportPath)) {
            throw new Error('Validation report not found');
        }

        const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));

        // Validate security enhancements
        if (!report.security || report.security.length < 3) {
            throw new Error('Insufficient security enhancements documented');
        }

        const securityTypes = report.security.map(s => s.type);
        if (!securityTypes.includes('sri_validation')) {
            throw new Error('SRI validation not documented in security enhancements');
        }

        // Check for security features in HTML
        const htmlContent = fs.readFileSync(this.indexPath, 'utf8');
        
        // Validate CSP compatibility
        if (!htmlContent.includes('Content-Security-Policy')) {
            throw new Error('CSP header not found');
        }

        // Check for secure error handling
        if (!htmlContent.includes('sanitizeMessage') ||
            !htmlContent.includes('XSS protection')) {
            throw new Error('Secure error handling not implemented');
        }

        console.log('✅ Security enhancements validated');
    }

    /**
     * Test 8: Validation Report
     */
    async testValidationReport() {
        console.log('🔍 Test 8: Validation Report');

        const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));

        // Validate report structure
        const requiredFields = ['timestamp', 'task', 'validation', 'enhancements', 'security', 'summary'];
        for (const field of requiredFields) {
            if (!report[field]) {
                throw new Error(`Missing report field: ${field}`);
            }
        }

        // Validate summary statistics
        if (!report.summary.features || report.summary.features.length < 7) {
            throw new Error('Insufficient features documented in summary');
        }

        const expectedFeatures = [
            'Resource loading validation',
            'SRI integrity checks',
            'Error handling and recovery',
            'Loading progress monitoring',
            'User-friendly error messages'
        ];

        for (const feature of expectedFeatures) {
            if (!report.summary.features.includes(feature)) {
                throw new Error(`Missing expected feature: ${feature}`);
            }
        }

        // Validate enhancement count
        if (report.summary.totalEnhancements < 3) {
            throw new Error('Insufficient enhancements documented');
        }

        // Validate security feature count
        if (report.summary.securityFeatures < 3) {
            throw new Error('Insufficient security features documented');
        }

        console.log('✅ Validation report structure validated');
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n📊 RESOURCE-04 Smoke Test Summary:');
        console.log('=' .repeat(50));

        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;

        console.log(`✅ Passed: ${passed}/${this.results.length}`);
        console.log(`❌ Failed: ${failed}/${this.results.length}`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`   Test ${r.test}: ${r.error}`));
        }

        console.log(`\n🎯 Success Rate: ${Math.round(passed / this.results.length * 100)}%`);
        
        if (passed === this.results.length) {
            console.log('🎉 All RESOURCE-04 resource loading validation tests passed!');
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new Resource04SmokeTest();
    
    tester.runAllTests()
        .then(results => {
            const passed = results.filter(r => r.status === 'PASS').length;
            process.exit(passed === results.length ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Smoke test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = Resource04SmokeTest;