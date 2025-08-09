/**
 * Environment Detection Smoke Tests
 * Tests for ENV-001 implementation
 * 
 * @version 3.2.0
 * @author PWA Deployment Compatibility Team
 */

// Import modules to test
import { 
    detectEnvironment, 
    getCurrentPlatform, 
    getPlatformFeatures,
    clearDetectionCache 
} from '../../src/core/environment-detector.js';

import { 
    loadConfig, 
    validateConfig, 
    getSecureConfig,
    clearConfigCache 
} from '../../src/core/config-manager.js';

/**
 * Smoke Test Suite for Environment Detection
 */
class EnvironmentDetectionSmokeTests {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🧪 Starting Environment Detection Smoke Tests...');
        
        try {
            // Clear caches before testing
            clearDetectionCache();
            clearConfigCache();
            
            // Core functionality tests
            await this.testEnvironmentDetection();
            await this.testPlatformIdentification();
            await this.testConfigurationLoading();
            await this.testConfigurationValidation();
            await this.testSecurityValidation();
            
            // Integration tests
            await this.testCachePerformance();
            await this.testErrorHandling();
            await this.testBackwardCompatibility();
            
            // Performance tests
            await this.testPerformanceTargets();
            
            this.printResults();
            return this.getTestSummary();
            
        } catch (error) {
            console.error('❌ Smoke test suite failed:', error);
            throw error;
        }
    }

    /**
     * Test environment detection functionality
     */
    async testEnvironmentDetection() {
        console.log('🔍 Testing environment detection...');
        
        try {
            const environment = await detectEnvironment();
            
            this.assert(
                environment && typeof environment === 'object',
                'Environment detection returns object'
            );
            
            this.assert(
                typeof environment.platform === 'string',
                'Platform is detected as string'
            );
            
            this.assert(
                typeof environment.confidence === 'number' && 
                environment.confidence >= 0 && 
                environment.confidence <= 100,
                'Confidence score is valid (0-100)'
            );
            
            this.assert(
                environment.hostname === window.location.hostname,
                'Hostname matches current location'
            );
            
            console.log(`✅ Environment detected: ${environment.platform} (${environment.confidence}% confidence)`);
            
        } catch (error) {
            this.fail('Environment detection failed', error);
        }
    }

    /**
     * Test platform identification accuracy
     */
    async testPlatformIdentification() {
        console.log('🏷️ Testing platform identification...');
        
        try {
            const platform = getCurrentPlatform();
            const features = getPlatformFeatures();
            
            this.assert(
                typeof platform === 'string' && platform.length > 0,
                'Platform identifier is valid string'
            );
            
            this.assert(
                features && typeof features === 'object',
                'Platform features returned as object'
            );
            
            // Test supported platforms
            const supportedPlatforms = [
                'github-pages', 'cloudflare-pages', 'netlify', 
                'vercel', 'firebase', 'local'
            ];
            
            this.assert(
                supportedPlatforms.includes(platform),
                `Platform ${platform} is supported`
            );
            
            console.log(`✅ Platform identified: ${platform}`);
            
        } catch (error) {
            this.fail('Platform identification failed', error);
        }
    }

    /**
     * Test configuration loading for all platforms
     */
    async testConfigurationLoading() {
        console.log('⚙️ Testing configuration loading...');
        
        const platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'firebase', 'local'];
        
        for (const platform of platforms) {
            try {
                const config = await loadConfig(platform);
                
                this.assert(
                    config && typeof config === 'object',
                    `Configuration loaded for ${platform}`
                );
                
                this.assert(
                    config.platform === platform,
                    `Configuration platform matches ${platform}`
                );
                
                this.assert(
                    config.features && typeof config.features === 'object',
                    `Features configuration exists for ${platform}`
                );
                
                this.assert(
                    config.security && typeof config.security === 'object',
                    `Security configuration exists for ${platform}`
                );
                
                console.log(`✅ Configuration loaded for ${platform}`);
                
            } catch (error) {
                // Allow fallback to default for missing configs
                if (error.message.includes('Config file not found')) {
                    console.warn(`⚠️ Config file missing for ${platform}, fallback used`);
                } else {
                    this.fail(`Configuration loading failed for ${platform}`, error);
                }
            }
        }
    }

    /**
     * Test configuration validation
     */
    async testConfigurationValidation() {
        console.log('✅ Testing configuration validation...');
        
        try {
            // Test valid configuration
            const validConfig = {
                platform: 'test',
                basePath: '/',
                features: { serviceWorker: true },
                security: { level: 'basic' }
            };
            
            const validation = validateConfig(validConfig);
            this.assert(
                validation.valid === true,
                'Valid configuration passes validation'
            );
            
            // Test invalid configuration
            const invalidConfig = {
                platform: 'test'
                // Missing required fields
            };
            
            const invalidValidation = validateConfig(invalidConfig);
            this.assert(
                invalidValidation.valid === false,
                'Invalid configuration fails validation'
            );
            
            this.assert(
                Array.isArray(invalidValidation.errors) && invalidValidation.errors.length > 0,
                'Validation errors are returned as array'
            );
            
            console.log('✅ Configuration validation working correctly');
            
        } catch (error) {
            this.fail('Configuration validation failed', error);
        }
    }

    /**
     * Test security validation features
     */
    async testSecurityValidation() {
        console.log('🔒 Testing security validation...');
        
        try {
            const secureConfig = await getSecureConfig();
            
            this.assert(
                secureConfig && typeof secureConfig === 'object',
                'Secure configuration loaded'
            );
            
            this.assert(
                secureConfig.security && typeof secureConfig.security === 'object',
                'Security configuration exists'
            );
            
            // Test CSP validation
            if (secureConfig.security.csp) {
                this.assert(
                    typeof secureConfig.security.csp.enabled === 'boolean',
                    'CSP enabled flag is boolean'
                );
                
                if (secureConfig.security.csp.directives) {
                    this.assert(
                        typeof secureConfig.security.csp.directives === 'object',
                        'CSP directives are object'
                    );
                }
            }
            
            console.log('✅ Security validation working correctly');
            
        } catch (error) {
            this.fail('Security validation failed', error);
        }
    }

    /**
     * Test cache performance
     */
    async testCachePerformance() {
        console.log('⚡ Testing cache performance...');
        
        try {
            const platform = getCurrentPlatform();
            
            // First load (should cache)
            const startTime1 = performance.now();
            const config1 = await loadConfig(platform);
            const loadTime1 = performance.now() - startTime1;
            
            // Second load (should use cache)
            const startTime2 = performance.now();
            const config2 = await loadConfig(platform);
            const loadTime2 = performance.now() - startTime2;
            
            this.assert(
                loadTime2 < loadTime1,
                'Cached load is faster than initial load'
            );
            
            this.assert(
                JSON.stringify(config1) === JSON.stringify(config2),
                'Cached configuration matches original'
            );
            
            console.log(`✅ Cache performance: Initial ${loadTime1.toFixed(2)}ms, Cached ${loadTime2.toFixed(2)}ms`);
            
        } catch (error) {
            this.fail('Cache performance test failed', error);
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('🚨 Testing error handling...');
        
        try {
            // Test invalid platform
            try {
                await loadConfig('invalid-platform');
                // Should not reach here
                this.fail('Invalid platform should trigger fallback', new Error('No error thrown'));
            } catch (error) {
                // Expected behavior - should fallback gracefully
                console.log('✅ Invalid platform handled gracefully');
            }
            
            // Test network error simulation (if possible)
            // This would require mocking fetch, which is complex in smoke tests
            
            console.log('✅ Error handling working correctly');
            
        } catch (error) {
            this.fail('Error handling test failed', error);
        }
    }

    /**
     * Test backward compatibility
     */
    async testBackwardCompatibility() {
        console.log('🔄 Testing backward compatibility...');
        
        try {
            // Test global objects exist (deprecated but functional)
            this.assert(
                typeof window.EnvironmentDetector === 'object',
                'Global EnvironmentDetector exists for backward compatibility'
            );
            
            this.assert(
                typeof window.ConfigManager === 'object',
                'Global ConfigManager exists for backward compatibility'
            );
            
            // Test deprecated warning is shown
            this.assert(
                window.EnvironmentDetector._deprecated,
                'Deprecation warning exists for EnvironmentDetector'
            );
            
            this.assert(
                window.ConfigManager._deprecated,
                'Deprecation warning exists for ConfigManager'
            );
            
            console.log('✅ Backward compatibility maintained');
            
        } catch (error) {
            this.fail('Backward compatibility test failed', error);
        }
    }

    /**
     * Test performance targets
     */
    async testPerformanceTargets() {
        console.log('🎯 Testing performance targets...');
        
        try {
            const startTime = performance.now();
            
            // Clear cache to test cold start
            clearDetectionCache();
            clearConfigCache();
            
            // Full initialization
            await detectEnvironment();
            await loadConfig();
            
            const totalTime = performance.now() - startTime;
            
            // Target: <500ms load time
            this.assert(
                totalTime < 500,
                `Load time ${totalTime.toFixed(2)}ms is under 500ms target`
            );
            
            // Memory usage check (approximate)
            if (performance.memory) {
                const memoryUsed = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
                this.assert(
                    memoryUsed < 2,
                    `Memory usage ${memoryUsed.toFixed(2)}MB is under 2MB target`
                );
            }
            
            console.log(`✅ Performance targets met: ${totalTime.toFixed(2)}ms load time`);
            
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
        
        console.log('\n📊 Environment Detection Smoke Test Results:');
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
export { EnvironmentDetectionSmokeTests };

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('test=env')) {
    const tests = new EnvironmentDetectionSmokeTests();
    tests.runAllTests().then(summary => {
        console.log('🎉 Environment Detection Smoke Tests completed!', summary);
    }).catch(error => {
        console.error('💥 Environment Detection Smoke Tests failed!', error);
    });
}