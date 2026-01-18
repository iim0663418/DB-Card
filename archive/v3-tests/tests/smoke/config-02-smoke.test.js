#!/usr/bin/env node

/**
 * CONFIG-02 Smoke Test Suite
 * 
 * Comprehensive smoke tests for multi-environment configuration files generation.
 * Validates configuration file creation, JSON schema compliance, platform-specific
 * settings, security configurations, and feature completeness.
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

const fs = require('fs');
const path = require('path');

class Config02SmokeTest {
    constructor() {
        this.configDir = path.join(__dirname, '../../pwa-card-storage/config');
        this.reportPath = path.join(__dirname, '../../deploy/config-02-generation-report.json');
        this.platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🧪 Starting CONFIG-02 smoke tests...\n');

        // Test 1: Configuration files existence
        await this.testConfigFilesExistence();

        // Test 2: JSON schema validation
        await this.testJsonSchemaValidation();

        // Test 3: Platform-specific settings validation
        await this.testPlatformSpecificSettings();

        // Test 4: Security configuration validation
        await this.testSecurityConfiguration();

        // Test 5: Feature completeness validation
        await this.testFeatureCompleteness();

        // Test 6: Generation report validation
        await this.testGenerationReport();

        // Test 7: Configuration integrity validation
        await this.testConfigurationIntegrity();

        // Test 8: Cross-platform consistency validation
        await this.testCrossPlatformConsistency();

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
     * Test 1: Configuration files existence
     */
    async testConfigFilesExistence() {
        const testName = 'Configuration Files Existence';
        console.log(`🔍 Test 1: ${testName}`);

        try {
            // Check if config directory exists
            if (!fs.existsSync(this.configDir)) {
                throw new Error('Config directory does not exist');
            }

            // Check each platform configuration file
            const missingFiles = [];
            for (const platform of this.platforms) {
                const configPath = path.join(this.configDir, `${platform}-config.json`);
                if (!fs.existsSync(configPath)) {
                    missingFiles.push(`${platform}-config.json`);
                }
            }

            if (missingFiles.length > 0) {
                throw new Error(`Missing configuration files: ${missingFiles.join(', ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} configuration files exist`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 2: JSON schema validation
     */
    async testJsonSchemaValidation() {
        const testName = 'JSON Schema Validation';
        console.log(`🔍 Test 2: ${testName}`);

        try {
            const invalidConfigs = [];

            for (const platform of this.platforms) {
                const configPath = path.join(this.configDir, `${platform}-config.json`);
                const content = fs.readFileSync(configPath, 'utf8');
                
                try {
                    const config = JSON.parse(content);
                    
                    // Validate required fields
                    const requiredFields = ['platform', 'version', 'basePath', 'features', 'security', 'cache', 'deployment'];
                    const missingFields = requiredFields.filter(field => !config[field]);
                    
                    if (missingFields.length > 0) {
                        invalidConfigs.push(`${platform}: missing fields ${missingFields.join(', ')}`);
                    }

                    // Validate platform name consistency
                    if (config.platform !== platform) {
                        invalidConfigs.push(`${platform}: platform name mismatch`);
                    }

                } catch (parseError) {
                    invalidConfigs.push(`${platform}: invalid JSON format`);
                }
            }

            if (invalidConfigs.length > 0) {
                throw new Error(`Invalid configurations: ${invalidConfigs.join('; ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} configurations have valid JSON schema`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 3: Platform-specific settings validation
     */
    async testPlatformSpecificSettings() {
        const testName = 'Platform-Specific Settings Validation';
        console.log(`🔍 Test 3: ${testName}`);

        try {
            const settingsValidation = [];

            for (const platform of this.platforms) {
                const configPath = path.join(this.configDir, `${platform}-config.json`);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                // Validate platform-specific settings
                switch (platform) {
                    case 'github-pages':
                        if (!config.basePath.includes('/DB-Card/pwa-card-storage')) {
                            settingsValidation.push(`${platform}: incorrect basePath for GitHub Pages`);
                        }
                        if (config.features.pushNotifications !== false) {
                            settingsValidation.push(`${platform}: push notifications should be disabled`);
                        }
                        break;

                    case 'cloudflare-pages':
                        if (!config.features.edgeFunctions) {
                            settingsValidation.push(`${platform}: edge functions should be enabled`);
                        }
                        if (config.security.level !== 'enhanced') {
                            settingsValidation.push(`${platform}: should have enhanced security level`);
                        }
                        break;

                    case 'netlify':
                        if (!config.features.serverlessFunctions) {
                            settingsValidation.push(`${platform}: serverless functions should be enabled`);
                        }
                        if (!config.deployment.redirects) {
                            settingsValidation.push(`${platform}: redirects should be enabled`);
                        }
                        break;

                    case 'vercel':
                        if (!config.features.edgeConfig) {
                            settingsValidation.push(`${platform}: edge config should be enabled`);
                        }
                        if (!config.deployment.analytics) {
                            settingsValidation.push(`${platform}: analytics should be enabled`);
                        }
                        break;

                    case 'local':
                        if (config.environment !== 'development') {
                            settingsValidation.push(`${platform}: should be development environment`);
                        }
                        if (!config.features.devTools) {
                            settingsValidation.push(`${platform}: dev tools should be enabled`);
                        }
                        break;
                }
            }

            if (settingsValidation.length > 0) {
                throw new Error(`Platform settings issues: ${settingsValidation.join('; ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} platforms have correct specific settings`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 4: Security configuration validation
     */
    async testSecurityConfiguration() {
        const testName = 'Security Configuration Validation';
        console.log(`🔍 Test 4: ${testName}`);

        try {
            const securityIssues = [];

            for (const platform of this.platforms) {
                const configPath = path.join(this.configDir, `${platform}-config.json`);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                // Validate security configuration
                if (!config.security || !config.security.level) {
                    securityIssues.push(`${platform}: missing security level`);
                }

                if (config.security.csp) {
                    if (!config.security.csp.directives) {
                        securityIssues.push(`${platform}: CSP enabled but no directives`);
                    }

                    // Check for essential CSP directives
                    const requiredDirectives = ['default-src', 'script-src', 'style-src'];
                    const missingDirectives = requiredDirectives.filter(
                        directive => !config.security.csp.directives[directive]
                    );

                    if (missingDirectives.length > 0) {
                        securityIssues.push(`${platform}: missing CSP directives: ${missingDirectives.join(', ')}`);
                    }
                }

                if (!config.security.headers) {
                    securityIssues.push(`${platform}: missing security headers`);
                } else {
                    // Check for essential security headers
                    const requiredHeaders = ['X-Content-Type-Options'];
                    const missingHeaders = requiredHeaders.filter(
                        header => !config.security.headers[header]
                    );

                    if (missingHeaders.length > 0) {
                        securityIssues.push(`${platform}: missing security headers: ${missingHeaders.join(', ')}`);
                    }
                }

                // Production platforms should have HTTPS enforcement
                if (platform !== 'local' && !config.deployment.httpsOnly) {
                    securityIssues.push(`${platform}: HTTPS should be enforced for production`);
                }
            }

            if (securityIssues.length > 0) {
                throw new Error(`Security configuration issues: ${securityIssues.join('; ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} platforms have proper security configuration`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 5: Feature completeness validation
     */
    async testFeatureCompleteness() {
        const testName = 'Feature Completeness Validation';
        console.log(`🔍 Test 5: ${testName}`);

        try {
            const featureIssues = [];

            for (const platform of this.platforms) {
                const configPath = path.join(this.configDir, `${platform}-config.json`);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                // Validate core features
                const coreFeatures = ['serviceWorker', 'offlineSupport'];
                const missingCoreFeatures = coreFeatures.filter(
                    feature => config.features[feature] !== true
                );

                if (missingCoreFeatures.length > 0) {
                    featureIssues.push(`${platform}: missing core features: ${missingCoreFeatures.join(', ')}`);
                }

                // Validate cache configuration
                if (!config.cache || !config.cache.strategy) {
                    featureIssues.push(`${platform}: missing cache strategy`);
                }

                // Validate deployment configuration
                if (!config.deployment || !config.deployment.buildCommand) {
                    featureIssues.push(`${platform}: missing build command`);
                }

                // Check feature count (should have reasonable number of features)
                const featureCount = Object.keys(config.features).length;
                if (featureCount < 3) {
                    featureIssues.push(`${platform}: insufficient features configured (${featureCount})`);
                }
            }

            if (featureIssues.length > 0) {
                throw new Error(`Feature completeness issues: ${featureIssues.join('; ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} platforms have complete feature configuration`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 6: Generation report validation
     */
    async testGenerationReport() {
        const testName = 'Generation Report Validation';
        console.log(`🔍 Test 6: ${testName}`);

        try {
            if (!fs.existsSync(this.reportPath)) {
                throw new Error('Generation report file does not exist');
            }

            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));

            // Validate report structure
            const requiredFields = ['timestamp', 'tool', 'version', 'platforms', 'totalConfigs', 'validationResults', 'summary'];
            const missingFields = requiredFields.filter(field => !report[field]);

            if (missingFields.length > 0) {
                throw new Error(`Report missing fields: ${missingFields.join(', ')}`);
            }

            // Validate platform count
            if (report.totalConfigs !== this.platforms.length) {
                throw new Error(`Expected ${this.platforms.length} configs, got ${report.totalConfigs}`);
            }

            // Validate all platforms are included
            const reportPlatforms = report.platforms.map(p => p.platform);
            const missingPlatforms = this.platforms.filter(p => !reportPlatforms.includes(p));

            if (missingPlatforms.length > 0) {
                throw new Error(`Missing platforms in report: ${missingPlatforms.join(', ')}`);
            }

            // Validate success rate
            if (report.summary.successRate !== '100%') {
                throw new Error(`Expected 100% success rate, got ${report.summary.successRate}`);
            }

            this.recordTestResult(testName, true, `Generation report is complete with ${report.totalConfigs} configurations`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 7: Configuration integrity validation
     */
    async testConfigurationIntegrity() {
        const testName = 'Configuration Integrity Validation';
        console.log(`🔍 Test 7: ${testName}`);

        try {
            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            const integrityIssues = [];

            for (const platformInfo of report.platforms) {
                const configPath = platformInfo.path;
                
                if (!fs.existsSync(configPath)) {
                    integrityIssues.push(`${platformInfo.platform}: config file missing`);
                    continue;
                }

                const content = fs.readFileSync(configPath, 'utf8');
                const actualSize = content.length;

                // Validate file size
                if (actualSize !== platformInfo.size) {
                    integrityIssues.push(`${platformInfo.platform}: size mismatch (expected ${platformInfo.size}, got ${actualSize})`);
                }

                // Validate file hash
                const crypto = require('crypto');
                const actualHash = crypto.createHash('sha256').update(content).digest('hex');
                
                if (actualHash !== platformInfo.hash) {
                    integrityIssues.push(`${platformInfo.platform}: hash mismatch`);
                }

                // Validate security level
                const config = JSON.parse(content);
                if (config.security.level !== platformInfo.securityLevel) {
                    integrityIssues.push(`${platformInfo.platform}: security level mismatch`);
                }
            }

            if (integrityIssues.length > 0) {
                throw new Error(`Integrity issues: ${integrityIssues.join('; ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} configurations passed integrity validation`);

        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test 8: Cross-platform consistency validation
     */
    async testCrossPlatformConsistency() {
        const testName = 'Cross-Platform Consistency Validation';
        console.log(`🔍 Test 8: ${testName}`);

        try {
            const configs = {};
            const consistencyIssues = [];

            // Load all configurations
            for (const platform of this.platforms) {
                const configPath = path.join(this.configDir, `${platform}-config.json`);
                configs[platform] = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }

            // Check version consistency
            const versions = Object.values(configs).map(c => c.version);
            const uniqueVersions = [...new Set(versions)];
            if (uniqueVersions.length > 1) {
                consistencyIssues.push(`Version inconsistency: ${uniqueVersions.join(', ')}`);
            }

            // Check core features consistency (serviceWorker and offlineSupport should be true for all)
            const coreFeatures = ['serviceWorker', 'offlineSupport'];
            for (const feature of coreFeatures) {
                const featureValues = Object.entries(configs).map(([platform, config]) => ({
                    platform,
                    value: config.features[feature]
                }));

                const inconsistentPlatforms = featureValues.filter(f => f.value !== true);
                if (inconsistentPlatforms.length > 0) {
                    consistencyIssues.push(`${feature} inconsistency: ${inconsistentPlatforms.map(p => p.platform).join(', ')}`);
                }
            }

            // Check asset path consistency
            const assetPaths = Object.entries(configs).map(([platform, config]) => ({
                platform,
                path: config.assetPath
            }));

            const uniqueAssetPaths = [...new Set(assetPaths.map(a => a.path))];
            if (uniqueAssetPaths.length > 1) {
                consistencyIssues.push(`Asset path inconsistency: ${uniqueAssetPaths.join(', ')}`);
            }

            if (consistencyIssues.length > 0) {
                throw new Error(`Consistency issues: ${consistencyIssues.join('; ')}`);
            }

            this.recordTestResult(testName, true, `All ${this.platforms.length} platforms maintain proper consistency`);

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
        
        console.log('📊 CONFIG-02 Smoke Test Summary');
        console.log('================================');
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.totalTests - this.passedTests}`);
        console.log(`Success Rate: ${successRate}%`);
        
        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 All CONFIG-02 smoke tests passed successfully!');
        } else {
            console.log('\n⚠️  Some CONFIG-02 smoke tests failed. Please review the results above.');
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new Config02SmokeTest();
    
    tester.runAllTests()
        .then(result => {
            process.exit(result.passedTests === result.totalTests ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Smoke test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = Config02SmokeTest;