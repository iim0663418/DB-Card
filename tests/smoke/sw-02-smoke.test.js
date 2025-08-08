#!/usr/bin/env node

/**
 * SW-02 Smoke Test Suite: Cache Strategy Standardization
 * 
 * Validates enhanced PWA caching strategies, resource validation,
 * and storage quota management functionality.
 * 
 * @version 3.2.0-sw-02-smoke
 */

const fs = require('fs');
const path = require('path');

class SW02SmokeTest {
    constructor() {
        this.projectRoot = process.cwd();
        this.swPath = path.join(this.projectRoot, 'pwa-card-storage', 'sw.js');
        this.reportPath = path.join(this.projectRoot, 'deploy', 'sw-02-cache-standardization-report.json');
        this.results = [];
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🧪 SW-02 Smoke Tests: Cache Strategy Standardization\n');

        const tests = [
            () => this.testServiceWorkerStructure(),
            () => this.testCacheStrategies(),
            () => this.testResourceValidation(),
            () => this.testStorageQuotaManagement(),
            () => this.testEnhancedErrorHandling(),
            () => this.testPlatformCompatibility(),
            () => this.testSecurityEnhancements(),
            () => this.testPerformanceOptimizations()
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
     * Test 1: Service Worker Structure
     */
    async testServiceWorkerStructure() {
        console.log('🔍 Test 1: Service Worker Structure');

        if (!fs.existsSync(this.swPath)) {
            throw new Error('Service Worker file not found');
        }

        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Check for enhanced cache structure
        const requiredElements = [
            'STATIC_CACHE',
            'DYNAMIC_CACHE', 
            'RUNTIME_CACHE',
            'STORAGE_QUOTA',
            'RESOURCE_PATTERNS',
            'cacheFirstStrategy',
            'networkFirstStrategy',
            'staleWhileRevalidateStrategy'
        ];

        for (const element of requiredElements) {
            if (!swContent.includes(element)) {
                throw new Error(`Missing required element: ${element}`);
            }
        }

        // Check for backup file
        const backupPath = `${this.swPath}.sw-02-backup`;
        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not created');
        }

        console.log('✅ Service Worker structure validated');
    }

    /**
     * Test 2: Cache Strategies Implementation
     */
    async testCacheStrategies() {
        console.log('🔍 Test 2: Cache Strategies Implementation');

        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Validate cache strategy functions
        const strategies = [
            'cacheFirstStrategy',
            'networkFirstStrategy', 
            'staleWhileRevalidateStrategy',
            'networkOnlyStrategy'
        ];

        for (const strategy of strategies) {
            if (!swContent.includes(`async function ${strategy}`)) {
                throw new Error(`Missing cache strategy: ${strategy}`);
            }
        }

        // Check strategy selection logic
        if (!swContent.includes('getCacheStrategy')) {
            throw new Error('Missing cache strategy selection logic');
        }

        // Validate resource pattern matching
        if (!swContent.includes('RESOURCE_PATTERNS.STATIC') ||
            !swContent.includes('RESOURCE_PATTERNS.DYNAMIC') ||
            !swContent.includes('RESOURCE_PATTERNS.RUNTIME')) {
            throw new Error('Missing resource pattern classification');
        }

        console.log('✅ Cache strategies implementation validated');
    }

    /**
     * Test 3: Resource Validation
     */
    async testResourceValidation() {
        console.log('🔍 Test 3: Resource Validation');

        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Check for resource validation functions
        const validationFunctions = [
            'validateResource',
            'validateCachedResource',
            'cacheWithQuotaCheck'
        ];

        for (const func of validationFunctions) {
            if (!swContent.includes(func)) {
                throw new Error(`Missing validation function: ${func}`);
            }
        }

        // Check for security validations
        if (!swContent.includes('eval(')) {
            throw new Error('Missing script security validation');
        }

        if (!swContent.includes('content-type')) {
            throw new Error('Missing content type validation');
        }

        console.log('✅ Resource validation implementation validated');
    }

    /**
     * Test 4: Storage Quota Management
     */
    async testStorageQuotaManagement() {
        console.log('🔍 Test 4: Storage Quota Management');

        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Check for quota management functions
        const quotaFunctions = [
            'checkStorageQuota',
            'cleanupCacheByLRU',
            'optimizeCacheStorage',
            'getCacheSize',
            'getResponseSize'
        ];

        for (const func of quotaFunctions) {
            if (!swContent.includes(func)) {
                throw new Error(`Missing quota management function: ${func}`);
            }
        }

        // Check for storage limits
        if (!swContent.includes('STORAGE_QUOTA')) {
            throw new Error('Missing storage quota configuration');
        }

        // Validate quota limits
        const quotaMatch = swContent.match(/STATIC:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
        if (!quotaMatch || parseInt(quotaMatch[1]) !== 50) {
            throw new Error('Invalid static cache quota limit');
        }

        console.log('✅ Storage quota management validated');
    }

    /**
     * Test 5: Enhanced Error Handling
     */
    async testEnhancedErrorHandling() {
        console.log('🔍 Test 5: Enhanced Error Handling');

        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Check for enhanced error handling
        const errorHandlers = [
            'getEnhancedOfflineFallback',
            'createOfflineResponse',
            'SW_ERROR',
            'SW_UNHANDLED_REJECTION'
        ];

        for (const handler of errorHandlers) {
            if (!swContent.includes(handler)) {
                throw new Error(`Missing error handler: ${handler}`);
            }
        }

        // Check for structured error responses
        if (!swContent.includes('application/json') || 
            !swContent.includes('offline: true')) {
            throw new Error('Missing structured error responses');
        }

        console.log('✅ Enhanced error handling validated');
    }

    /**
     * Test 6: Platform Compatibility
     */
    async testPlatformCompatibility() {
        console.log('🔍 Test 6: Platform Compatibility');

        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Check for platform detection
        const platforms = [
            '.github.io',
            '.pages.dev',
            '.netlify.app', 
            '.vercel.app',
            'localhost'
        ];

        for (const platform of platforms) {
            if (!swContent.includes(platform)) {
                throw new Error(`Missing platform support: ${platform}`);
            }
        }

        // Check BASE_PATH logic
        if (!swContent.includes('getBasePath')) {
            throw new Error('Missing BASE_PATH detection logic');
        }

        console.log('✅ Platform compatibility validated');
    }

    /**
     * Test 7: Security Enhancements
     */
    async testSecurityEnhancements() {
        console.log('🔍 Test 7: Security Enhancements');

        // Check standardization report
        if (!fs.existsSync(this.reportPath)) {
            throw new Error('Standardization report not found');
        }

        const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));

        // Validate security enhancements
        if (!report.security || report.security.length < 3) {
            throw new Error('Insufficient security enhancements documented');
        }

        const securityTypes = report.security.map(s => s.type);
        const requiredSecurity = [
            'resource_validation',
            'content_security', 
            'cache_validation'
        ];

        for (const security of requiredSecurity) {
            if (!securityTypes.includes(security)) {
                throw new Error(`Missing security enhancement: ${security}`);
            }
        }

        console.log('✅ Security enhancements validated');
    }

    /**
     * Test 8: Performance Optimizations
     */
    async testPerformanceOptimizations() {
        console.log('🔍 Test 8: Performance Optimizations');

        const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));

        // Validate performance improvements
        if (!report.performance || report.performance.length < 3) {
            throw new Error('Insufficient performance improvements documented');
        }

        const performanceTypes = report.performance.map(p => p.type);
        const requiredPerformance = [
            'quota_management',
            'lru_cleanup',
            'cache_optimization'
        ];

        for (const perf of requiredPerformance) {
            if (!performanceTypes.includes(perf)) {
                throw new Error(`Missing performance optimization: ${perf}`);
            }
        }

        // Check summary statistics
        if (!report.summary || !report.summary.cacheStrategies) {
            throw new Error('Missing performance summary statistics');
        }

        const strategies = report.summary.cacheStrategies;
        if (!strategies.includes('cache-first') || 
            !strategies.includes('network-first') ||
            !strategies.includes('stale-while-revalidate')) {
            throw new Error('Missing required cache strategies in summary');
        }

        console.log('✅ Performance optimizations validated');
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n📊 SW-02 Smoke Test Summary:');
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
            console.log('🎉 All SW-02 cache strategy standardization tests passed!');
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new SW02SmokeTest();
    
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

module.exports = SW02SmokeTest;