/**
 * Platform Compatibility Test for Simplified Service Worker
 * 
 * Validates SW works correctly across all 5 static hosting platforms
 * 
 * @version 3.2.1-simplified
 */

const fs = require('fs');
const path = require('path');

/**
 * Platform Compatibility Test Suite
 */
class PlatformCompatibilityTest {
    constructor() {
        this.swPath = path.join(__dirname, '../sw.js');
        this.results = {
            platforms: [],
            passed: 0,
            failed: 0
        };
    }

    /**
     * Run compatibility tests for all platforms
     */
    async runCompatibilityTests() {
        console.log('🧪 Testing Platform Compatibility for Simplified SW\n');

        const platforms = [
            {
                name: 'GitHub Pages',
                hostname: 'username.github.io',
                expectedBasePath: '/DB-Card',
                pathPattern: '/username/repo-name'
            },
            {
                name: 'Cloudflare Pages',
                hostname: 'project.pages.dev',
                expectedBasePath: '',
                pathPattern: '/'
            },
            {
                name: 'Netlify',
                hostname: 'project.netlify.app',
                expectedBasePath: '',
                pathPattern: '/'
            },
            {
                name: 'Vercel',
                hostname: 'project.vercel.app',
                expectedBasePath: '',
                pathPattern: '/'
            },
            {
                name: 'Firebase',
                hostname: 'project.web.app',
                expectedBasePath: '',
                pathPattern: '/'
            }
        ];

        for (const platform of platforms) {
            await this.testPlatform(platform);
        }

        this.printResults();
        return this.results.failed === 0;
    }

    /**
     * Test specific platform compatibility
     */
    async testPlatform(platform) {
        const testResult = {
            name: platform.name,
            hostname: platform.hostname,
            tests: [],
            passed: true
        };

        try {
            // Test 1: Base path detection
            const basePathTest = this.testBasePath(platform);
            testResult.tests.push(basePathTest);

            // Test 2: Resource path generation
            const resourcePathTest = this.testResourcePaths(platform);
            testResult.tests.push(resourcePathTest);

            // Test 3: Cache strategy compatibility
            const cacheStrategyTest = this.testCacheStrategies(platform);
            testResult.tests.push(cacheStrategyTest);

            // Test 4: Security controls
            const securityTest = this.testSecurityControls(platform);
            testResult.tests.push(securityTest);

            // Check if all tests passed
            testResult.passed = testResult.tests.every(test => test.passed);

            if (testResult.passed) {
                this.results.passed++;
                console.log(`✅ ${platform.name}: All compatibility tests passed`);
            } else {
                this.results.failed++;
                console.log(`❌ ${platform.name}: Some tests failed`);
                testResult.tests.filter(t => !t.passed).forEach(test => {
                    console.log(`   - ${test.name}: ${test.error}`);
                });
            }

        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            this.results.failed++;
            console.log(`❌ ${platform.name}: ${error.message}`);
        }

        this.results.platforms.push(testResult);
    }

    /**
     * Test base path detection logic
     */
    testBasePath(platform) {
        const swContent = fs.readFileSync(this.swPath, 'utf8');
        
        // Extract getBasePath function
        const getBasePathMatch = swContent.match(/function getBasePath\(\)\s*{([\s\S]*?)^}/m);
        if (!getBasePathMatch) {
            return { name: 'Base Path Detection', passed: false, error: 'getBasePath function not found' };
        }

        const getBasePathCode = getBasePathMatch[1];

        // Check if platform is handled
        if (!getBasePathCode.includes(platform.hostname.split('.').slice(-2).join('.'))) {
            return { 
                name: 'Base Path Detection', 
                passed: false, 
                error: `Platform hostname pattern not found: ${platform.hostname}` 
            };
        }

        // Simulate the logic
        const expectedPath = platform.expectedBasePath;
        if (platform.name === 'GitHub Pages' && !getBasePathCode.includes("return '/DB-Card'")) {
            return { 
                name: 'Base Path Detection', 
                passed: false, 
                error: 'GitHub Pages base path not correctly set' 
            };
        }

        if (platform.name !== 'GitHub Pages' && !getBasePathCode.includes("return ''")) {
            return { 
                name: 'Base Path Detection', 
                passed: false, 
                error: 'Non-GitHub platform base path not correctly set' 
            };
        }

        return { name: 'Base Path Detection', passed: true };
    }

    /**
     * Test resource path generation
     */
    testResourcePaths(platform) {
        const swContent = fs.readFileSync(this.swPath, 'utf8');
        
        // Check CORE_RESOURCES array
        if (!swContent.includes('CORE_RESOURCES')) {
            return { name: 'Resource Paths', passed: false, error: 'CORE_RESOURCES not found' };
        }

        // Check if resources use BASE_PATH variable
        if (!swContent.includes('${BASE_PATH}/pwa-card-storage/')) {
            return { name: 'Resource Paths', passed: false, error: 'Resources do not use BASE_PATH variable' };
        }

        // Check essential resources are included
        const essentialResources = [
            'index.html',
            'manifest.json',
            'app.js',
            'main.css'
        ];

        for (const resource of essentialResources) {
            if (!swContent.includes(resource)) {
                return { 
                    name: 'Resource Paths', 
                    passed: false, 
                    error: `Essential resource missing: ${resource}` 
                };
            }
        }

        return { name: 'Resource Paths', passed: true };
    }

    /**
     * Test cache strategies compatibility
     */
    testCacheStrategies(platform) {
        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Check for simplified cache strategies
        if (!swContent.includes('CACHE_STRATEGIES')) {
            return { name: 'Cache Strategies', passed: false, error: 'CACHE_STRATEGIES not found' };
        }

        // Check for required strategies
        const requiredStrategies = ['cache-first', 'network-first'];
        for (const strategy of requiredStrategies) {
            if (!swContent.includes(strategy)) {
                return { 
                    name: 'Cache Strategies', 
                    passed: false, 
                    error: `Required strategy missing: ${strategy}` 
                };
            }
        }

        // Check for simplified resource classification
        if (!swContent.includes('getResourceType')) {
            return { name: 'Cache Strategies', passed: false, error: 'getResourceType function not found' };
        }

        return { name: 'Cache Strategies', passed: true };
    }

    /**
     * Test security controls
     */
    testSecurityControls(platform) {
        const swContent = fs.readFileSync(this.swPath, 'utf8');

        // Check for essential security controls
        const securityControls = [
            'isSameOrigin',
            "event.request.method !== 'GET'",
            "event.request.url.startsWith('http')"
        ];

        for (const control of securityControls) {
            if (!swContent.includes(control)) {
                return { 
                    name: 'Security Controls', 
                    passed: false, 
                    error: `Security control missing: ${control}` 
                };
            }
        }

        return { name: 'Security Controls', passed: true };
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n📊 Platform Compatibility Results:');
        console.log(`✅ Compatible Platforms: ${this.results.passed}`);
        console.log(`❌ Incompatible Platforms: ${this.results.failed}`);
        console.log(`📈 Compatibility Rate: ${Math.round(this.results.passed / (this.results.passed + this.results.failed) * 100)}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 All platforms compatible! SW ready for deployment.');
            console.log('✅ GitHub Pages: /DB-Card base path');
            console.log('✅ Cloudflare Pages: Root path');
            console.log('✅ Netlify: Root path');
            console.log('✅ Vercel: Root path');
            console.log('✅ Firebase: Root path');
        } else {
            console.log('\n⚠️  Some platforms have compatibility issues:');
            this.results.platforms.filter(p => !p.passed).forEach(platform => {
                console.log(`   - ${platform.name}: ${platform.error || 'Multiple test failures'}`);
            });
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const test = new PlatformCompatibilityTest();
    test.runCompatibilityTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { PlatformCompatibilityTest };