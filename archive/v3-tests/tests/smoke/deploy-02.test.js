/**
 * DEPLOY-02 Smoke Tests: Service Worker Simplification
 * 
 * Tests simplified SW architecture and static hosting compatibility
 * 
 * @version 3.2.1-simplified
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const SW_PATH = path.join(__dirname, '../../pwa-card-storage/sw.js');
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
 * Read and parse Service Worker content
 */
function getServiceWorkerContent() {
    if (!fs.existsSync(SW_PATH)) {
        throw new Error('Service Worker file not found');
    }
    return fs.readFileSync(SW_PATH, 'utf8');
}

/**
 * Test 1: Simplified BASE_PATH Logic
 */
function testSimplifiedBasePath() {
    const content = getServiceWorkerContent();
    
    // Check for simplified getBasePath function
    if (!content.includes('function getBasePath()')) {
        return 'getBasePath function not found';
    }
    
    // Should not contain complex pathname parsing
    if (content.includes('pathname.split') || content.includes('pathParts')) {
        return 'Complex pathname parsing still exists';
    }
    
    // Should contain fixed platform paths
    const requiredPlatforms = [
        '.github.io',
        '.pages.dev', 
        '.netlify.app',
        '.vercel.app'
    ];
    
    for (const platform of requiredPlatforms) {
        if (!content.includes(platform)) {
            return `Missing platform support: ${platform}`;
        }
    }
    
    // Should use fixed return values
    if (!content.includes("return '/DB-Card'") || !content.includes("return ''")) {
        return 'Fixed path configuration not found';
    }
    
    return true;
}

/**
 * Test 2: Fixed Cache Strategies
 */
function testFixedCacheStrategies() {
    const content = getServiceWorkerContent();
    
    // Check for CACHE_STRATEGIES object
    if (!content.includes('CACHE_STRATEGIES')) {
        return 'CACHE_STRATEGIES object not found';
    }
    
    // Should contain basic strategies
    const requiredStrategies = [
        'cache-first',
        'network-first'
    ];
    
    for (const strategy of requiredStrategies) {
        if (!content.includes(strategy)) {
            return `Missing cache strategy: ${strategy}`;
        }
    }
    
    // Should NOT contain complex stale-while-revalidate
    if (content.includes('stale-while-revalidate')) {
        return 'Complex stale-while-revalidate strategy still exists';
    }
    
    return true;
}

/**
 * Test 3: Simplified Resource Classification
 */
function testSimplifiedResourceClassification() {
    const content = getServiceWorkerContent();
    
    // Should have simple getResourceType function
    if (!content.includes('function getResourceType')) {
        return 'getResourceType function not found';
    }
    
    // Should NOT contain complex RESOURCE_PATTERNS
    if (content.includes('RESOURCE_PATTERNS')) {
        return 'Complex RESOURCE_PATTERNS still exists';
    }
    
    // Should use simple file extension matching
    if (!content.includes('.match(') || !content.includes('pathname.toLowerCase()')) {
        return 'Simple file extension matching not found';
    }
    
    return true;
}

/**
 * Test 4: Removed Complex Features
 */
function testRemovedComplexFeatures() {
    const content = getServiceWorkerContent();
    
    // Features that should be removed
    const removedFeatures = [
        'validateResource',
        'validateCachedResource', 
        'STORAGE_QUOTA',
        'cleanupCacheByLRU',
        'getCacheSize',
        'optimizeCacheStorage',
        'checkStorageQuota'
    ];
    
    for (const feature of removedFeatures) {
        if (content.includes(feature)) {
            return `Complex feature still exists: ${feature}`;
        }
    }
    
    return true;
}

/**
 * Test 5: Security Controls Maintained
 */
function testSecurityControlsMaintained() {
    const content = getServiceWorkerContent();
    
    // Essential security features that should remain
    const requiredSecurity = [
        'isSameOrigin',
        'Origin policy check',
        'event.request.method !== \'GET\'',
        'event.request.url.startsWith(\'http\')'
    ];
    
    for (const security of requiredSecurity) {
        if (!content.includes(security)) {
            return `Missing security control: ${security}`;
        }
    }
    
    return true;
}

/**
 * Test 6: Simplified Install/Activate Events
 */
function testSimplifiedEvents() {
    const content = getServiceWorkerContent();
    
    // Install event should be simplified
    if (!content.includes("addEventListener('install'")) {
        return 'Install event not found';
    }
    
    // Should not contain complex validation in install
    if (content.includes('validateResource') || content.includes('Promise.allSettled')) {
        return 'Complex validation still in install event';
    }
    
    // Activate event should be simplified
    if (!content.includes("addEventListener('activate'")) {
        return 'Activate event not found';
    }
    
    // Should contain basic cache cleanup
    if (!content.includes('caches.keys()') || !content.includes('caches.delete')) {
        return 'Basic cache cleanup not found';
    }
    
    return true;
}

/**
 * Test 7: Platform Support Verification
 */
function testPlatformSupport() {
    const content = getServiceWorkerContent();
    
    // Should support all 5 platforms
    const platforms = [
        'GitHub Pages',
        'Cloudflare Pages', 
        'Netlify',
        'Vercel',
        'Firebase'
    ];
    
    for (const platform of platforms) {
        if (!content.includes(platform)) {
            return `Missing platform: ${platform}`;
        }
    }
    
    // Should have getPlatform function
    if (!content.includes('function getPlatform')) {
        return 'getPlatform function not found';
    }
    
    return true;
}

/**
 * Test 8: Code Simplification Metrics
 */
function testCodeSimplification() {
    const content = getServiceWorkerContent();
    const lines = content.split('\n').length;
    
    // Should be significantly smaller than complex version
    if (lines > 400) {
        return `Service Worker too complex: ${lines} lines (should be < 400)`;
    }
    
    // Should not contain excessive comments
    const commentLines = content.split('\n').filter(line => 
        line.trim().startsWith('//') || line.trim().startsWith('*')
    ).length;
    
    if (commentLines > lines * 0.3) {
        return 'Too many comment lines, code may be over-documented';
    }
    
    return true;
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('🧪 DEPLOY-02: Service Worker Simplification Tests\n');
    
    runTest('Simplified BASE_PATH Logic', testSimplifiedBasePath);
    runTest('Fixed Cache Strategies', testFixedCacheStrategies);
    runTest('Simplified Resource Classification', testSimplifiedResourceClassification);
    runTest('Removed Complex Features', testRemovedComplexFeatures);
    runTest('Security Controls Maintained', testSecurityControlsMaintained);
    runTest('Simplified Install/Activate Events', testSimplifiedEvents);
    runTest('Platform Support Verification', testPlatformSupport);
    runTest('Code Simplification Metrics', testCodeSimplification);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`📈 Success Rate: ${Math.round(TEST_RESULTS.passed / (TEST_RESULTS.passed + TEST_RESULTS.failed) * 100)}%`);
    
    if (TEST_RESULTS.failed === 0) {
        console.log('\n🎉 All DEPLOY-02 tests passed! Service Worker simplified successfully.');
        console.log('✅ Ready for static hosting deployment');
        console.log('✅ SW registration success rate should be ≥ 95%');
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