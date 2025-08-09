#!/usr/bin/env node

/**
 * CONFIG-03 Smoke Test Suite
 * 
 * Comprehensive smoke tests for unified configuration management interface.
 * Validates configuration manager implementation, validator functionality,
 * cache management, API completeness, and security features.
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

const fs = require('fs');
const path = require('path');

class Config03SmokeTest {
    constructor() {
        this.coreDir = path.join(__dirname, '../../pwa-card-storage/src/core');
        this.configDir = path.join(__dirname, '../../pwa-card-storage/config');
        this.reportPath = path.join(__dirname, '../../deploy/config-03-generation-report.json');
        this.expectedFiles = [
            'configuration-manager.js',
            'config-validator.js',
            'config-cache-manager.js'
        ];
        this.platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🧪 Starting CONFIG-03 smoke tests...\n');

        // Test 1: Configuration manager files existence
        await this.testConfigManagerFilesExistence();

        // Test 2: Configuration manager API completeness
        await this.testConfigManagerAPI();

        // Test 3: Configuration validator functionality
        await this.testConfigValidator();

        // Test 4: Cache manager functionality
        await this.testCacheManager();

        // Test 5: Platform configuration loading
        await this.testPlatformConfigLoading();

        // Test 6: Security features validation
        await this.testSecurityFeatures();

        // Test 7: Error handling and fallback mechanisms
        await this.testErrorHandling();

        // Test 8: Generation report validation
        await this.testGenerationReport();

        // Generate summary
        this.generateTestSummary();

        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            failedTests: this.totalTests - this.passedTests,
            successRate: Math.round((this.passedTests / this.totalTests) * 100)
        };
    }

    /**
     * Test 1: Configuration manager files existence
     */
    async testConfigManagerFilesExistence() {
        const testName = 'Configuration Manager Files Existence';
        console.log(`🔍 Test 1: ${testName}`);

        try {
            // Check if core directory exists
            if (!fs.existsSync(this.coreDir)) {
                throw new Error('Core directory does not exist');
            }

            // Check each expected file
            const missingFiles = [];
            for (const fileName of this.expectedFiles) {
                const filePath = path.join(this.coreDir, fileName);
                if (!fs.existsSync(filePath)) {
                    missingFiles.push(fileName);
                }
            }

            if (missingFiles.length > 0) {
                throw new Error(`Missing files: ${missingFiles.join(', ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.expectedFiles.length} configuration manager files exist`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 2: Configuration manager API completeness
     */
    async testConfigManagerAPI() {
        const testName = 'Configuration Manager API Completeness';
        console.log(`🔍 Test 2: ${testName}`);

        try {
            const configManagerPath = path.join(this.coreDir, 'configuration-manager.js');
            const content = fs.readFileSync(configManagerPath, 'utf8');

            // Check for required methods
            const requiredMethods = [
                'loadConfiguration',
                'getCurrentConfig',
                'getCurrentPlatform',
                'getConfigValue',
                'isFeatureEnabled',
                'getSecurityConfig',
                'getCacheConfig',
                'getDeploymentConfig',
                'getBasePath',
                'getPublicPath',
                'getAssetPath',
                'reloadConfiguration',
                'clearCache',
                'getConfigSummary'
            ];

            const missingMethods = [];
            for (const method of requiredMethods) {
                if (!content.includes(method)) {
                    missingMethods.push(method);
                }
            }

            if (missingMethods.length > 0) {
                throw new Error(`Missing API methods: ${missingMethods.join(', ')}`);
            }

            // Check for class definition
            if (!content.includes('class ConfigurationManager')) {
                throw new Error('ConfigurationManager class not found');
            }

            // Check for proper exports
            if (!content.includes('module.exports') && !content.includes('window.ConfigurationManager')) {
                throw new Error('Missing export statements');
            }

            this.recordTestResult(testName, true, `All ${requiredMethods.length} API methods are present`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 3: Configuration validator functionality
     */
    async testConfigValidator() {
        const testName = 'Configuration Validator Functionality';
        console.log(`🔍 Test 3: ${testName}`);

        try {
            const validatorPath = path.join(this.coreDir, 'config-validator.js');
            const content = fs.readFileSync(validatorPath, 'utf8');

            // Check for required validation methods
            const requiredMethods = [
                'validateConfig',
                'validateBasicStructure',
                'validatePlatformConsistency',
                'validateSecurityConfig',
                'validateFeatures',
                'validateCacheConfig',
                'validateDeploymentConfig',
                'validatePaths',
                'sanitizeConfig'
            ];

            const missingMethods = [];
            for (const method of requiredMethods) {
                if (!content.includes(method)) {
                    missingMethods.push(method);
                }
            }

            if (missingMethods.length > 0) {
                throw new Error(`Missing validation methods: ${missingMethods.join(', ')}`);
            }

            // Check for security validation features
            const securityFeatures = [
                'requiredFields',
                'securityLevels',
                'cacheStrategies',
                'sanitizePath'
            ];

            const missingFeatures = [];
            for (const feature of securityFeatures) {
                if (!content.includes(feature)) {
                    missingFeatures.push(feature);
                }
            }

            if (missingFeatures.length > 0) {
                throw new Error(`Missing security features: ${missingFeatures.join(', ')}`);
            }

            // Check for class definition
            if (!content.includes('class ConfigValidator')) {
                throw new Error('ConfigValidator class not found');
            }

            this.recordTestResult(testName, true, `All ${requiredMethods.length} validation methods and ${securityFeatures.length} security features are present`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 4: Cache manager functionality
     */
    async testCacheManager() {
        const testName = 'Cache Manager Functionality';
        console.log(`🔍 Test 4: ${testName}`);

        try {
            const cacheManagerPath = path.join(this.coreDir, 'config-cache-manager.js');
            const content = fs.readFileSync(cacheManagerPath, 'utf8');

            // Check for required cache methods
            const requiredMethods = [
                'get',
                'set',
                'delete',
                'has',
                'clear',
                'getStats',
                'cleanup',
                'evictLeastRecentlyUsed',
                'loadFromPersistentStorage',
                'saveToPersistentStorage'
            ];

            const missingMethods = [];
            for (const method of requiredMethods) {
                if (!content.includes(method)) {
                    missingMethods.push(method);
                }
            }

            if (missingMethods.length > 0) {
                throw new Error(`Missing cache methods: ${missingMethods.join(', ')}`);
            }

            // Check for cache features
            const cacheFeatures = [
                'defaultTTL',
                'maxCacheSize',
                'persistentStorage',
                'calculateSize',
                'calculateHitRate'
            ];

            const missingFeatures = [];
            for (const feature of cacheFeatures) {
                if (!content.includes(feature)) {
                    missingFeatures.push(feature);
                }
            }

            if (missingFeatures.length > 0) {
                throw new Error(`Missing cache features: ${missingFeatures.join(', ')}`);
            }

            // Check for class definition
            if (!content.includes('class ConfigCacheManager')) {
                throw new Error('ConfigCacheManager class not found');
            }

            this.recordTestResult(testName, true, `All ${requiredMethods.length} cache methods and ${cacheFeatures.length} cache features are present`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 5: Platform configuration loading
     */
    async testPlatformConfigLoading() {
        const testName = 'Platform Configuration Loading';
        console.log(`🔍 Test 5: ${testName}`);

        try {
            // Check if all platform configuration files exist
            const missingConfigs = [];
            for (const platform of this.platforms) {
                const configPath = path.join(this.configDir, `${platform}-config.json`);
                if (!fs.existsSync(configPath)) {
                    missingConfigs.push(`${platform}-config.json`);
                }
            }

            if (missingConfigs.length > 0) {
                throw new Error(`Missing platform configurations: ${missingConfigs.join(', ')}`);
            }

            // Check configuration manager has platform support
            const configManagerPath = path.join(this.coreDir, 'configuration-manager.js');
            const content = fs.readFileSync(configManagerPath, 'utf8');

            // Check for platform array
            if (!content.includes("'github-pages'") || !content.includes("'cloudflare-pages'") || 
                !content.includes("'netlify'") || !content.includes("'vercel'") || !content.includes("'local'")) {
                throw new Error('Not all platforms are supported in configuration manager');
            }

            // Check for loadConfigFromFile method
            if (!content.includes('loadConfigFromFile')) {
                throw new Error('Configuration loading method not found');
            }

            // Check for fallback mechanism
            if (!content.includes('fallbackPlatformDetection')) {
                throw new Error('Fallback platform detection not implemented');
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} platform configurations are supported with fallback mechanisms`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 6: Security features validation
     */
    async testSecurityFeatures() {
        const testName = 'Security Features Validation';
        console.log(`🔍 Test 6: ${testName}`);

        try {
            const securityIssues = [];

            // Check configuration manager security
            const configManagerPath = path.join(this.coreDir, 'configuration-manager.js');
            const configManagerContent = fs.readFileSync(configManagerPath, 'utf8');

            if (!configManagerContent.includes('validator.validateConfig')) {
                securityIssues.push('Configuration validation not enforced');
            }

            if (!configManagerContent.includes('sanitizeConfig')) {
                securityIssues.push('Configuration sanitization not implemented');
            }

            // Check validator security features
            const validatorPath = path.join(this.coreDir, 'config-validator.js');
            const validatorContent = fs.readFileSync(validatorPath, 'utf8');

            const securityChecks = [
                { pattern: 'sanitizepath', name: 'sanitize path' },
                { pattern: 'prototypepollution', name: 'prototype pollution' },
                { pattern: 'dangerouspatterns', name: 'dangerous patterns' },
                { pattern: 'pathtraversal', name: 'path traversal' }
            ];

            for (const check of securityChecks) {
                if (!validatorContent.toLowerCase().replace(/[\s-_]/g, '').includes(check.pattern)) {
                    securityIssues.push(`Missing security check: ${check.name}`);
                }
            }

            // Check cache manager security
            const cacheManagerPath = path.join(this.coreDir, 'config-cache-manager.js');
            const cacheManagerContent = fs.readFileSync(cacheManagerPath, 'utf8');

            if (!cacheManagerContent.includes('maxCacheSize')) {
                securityIssues.push('Cache size limits not implemented');
            }

            if (!cacheManagerContent.includes('TTL') && !cacheManagerContent.includes('expiry')) {
                securityIssues.push('Cache TTL not implemented');
            }

            if (securityIssues.length > 0) {
                throw new Error(`Security issues: ${securityIssues.join('; ')}`);
            }

            this.recordTestResult(testName, true, `All security features are properly implemented`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 7: Error handling and fallback mechanisms
     */
    async testErrorHandling() {
        const testName = 'Error Handling and Fallback Mechanisms';
        console.log(`🔍 Test 7: ${testName}`);

        try {
            const configManagerPath = path.join(this.coreDir, 'configuration-manager.js');
            const content = fs.readFileSync(configManagerPath, 'utf8');

            // Check for error handling patterns
            const errorHandlingFeatures = [
                'try {',
                'catch (error)',
                'throw new Error',
                'console.error',
                'console.warn',
                'fallback'
            ];

            const missingFeatures = [];
            for (const feature of errorHandlingFeatures) {
                if (!content.includes(feature)) {
                    missingFeatures.push(feature);
                }
            }

            if (missingFeatures.length > 0) {
                throw new Error(`Missing error handling features: ${missingFeatures.join(', ')}`);
            }

            // Check for specific fallback mechanisms
            const fallbackFeatures = [
                'fallbackPlatformDetection',
                'loadConfiguration(\'local\')',
                'defaultValue'
            ];

            const missingFallbacks = [];
            for (const fallback of fallbackFeatures) {
                if (!content.includes(fallback)) {
                    missingFallbacks.push(fallback);
                }
            }

            if (missingFallbacks.length > 0) {
                throw new Error(`Missing fallback mechanisms: ${missingFallbacks.join(', ')}`);
            }

            // Check for graceful degradation
            if (!content.includes('getConfigValue') || !content.includes('defaultValue')) {
                throw new Error('Graceful degradation not implemented');
            }

            this.recordTestResult(testName, true, `All ${errorHandlingFeatures.length} error handling features and ${fallbackFeatures.length} fallback mechanisms are present`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 8: Generation report validation
     */
    async testGenerationReport() {
        const testName = 'Generation Report Validation';
        console.log(`🔍 Test 8: ${testName}`);

        try {
            if (!fs.existsSync(this.reportPath)) {
                throw new Error('Generation report file does not exist');
            }

            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));

            // Validate report structure
            const requiredFields = ['timestamp', 'tool', 'version', 'generatedFiles', 'validationResults', 'securityFeatures', 'summary'];
            const missingFields = requiredFields.filter(field => !report[field]);

            if (missingFields.length > 0) {
                throw new Error(`Report missing fields: ${missingFields.join(', ')}`);
            }

            // Validate generated files count
            if (report.generatedFiles.length !== this.expectedFiles.length) {
                throw new Error(`Expected ${this.expectedFiles.length} files, got ${report.generatedFiles.length}`);
            }

            // Validate file types
            const expectedTypes = ['main_manager', 'validator', 'cache_manager'];
            const actualTypes = report.generatedFiles.map(f => f.type);
            const missingTypes = expectedTypes.filter(type => !actualTypes.includes(type));

            if (missingTypes.length > 0) {
                throw new Error(`Missing file types: ${missingTypes.join(', ')}`);
            }

            // Validate security features
            if (!report.securityFeatures || report.securityFeatures.length < 5) {
                throw new Error('Insufficient security features documented');
            }

            // Validate summary
            if (!report.summary || !report.summary.platformsSupported || report.summary.platformsSupported !== 5) {
                throw new Error('Summary missing or incomplete');
            }

            this.recordTestResult(testName, true, `Generation report is complete with ${report.generatedFiles.length} files and ${report.securityFeatures.length} security features`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Record test result
     */
    recordTestResult(testName, passed, message) {
        this.totalTests++;
        if (passed) {
            this.passedTests++;
            console.log(`✅ ${testName}: ${message}\n`);
        } else {
            console.log(`❌ ${testName}: ${message}\n`);
        }

        this.testResults.push({
            test: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate test summary
     */
    generateTestSummary() {
        const successRate = Math.round((this.passedTests / this.totalTests) * 100);
        
        console.log('📊 CONFIG-03 Smoke Test Summary');
        console.log('================================');
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.totalTests - this.passedTests}`);
        console.log(`Success Rate: ${successRate}%`);
        
        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 All CONFIG-03 smoke tests passed successfully!');
        } else {
            console.log('\n⚠️  Some CONFIG-03 smoke tests failed. Please review the results above.');
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new Config03SmokeTest();
    
    tester.runAllTests()
        .then(result => {
            process.exit(result.passedTests === result.totalTests ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Smoke test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = Config03SmokeTest;