#!/usr/bin/env node

/**
 * CONFIG-01 Smoke Test Suite
 * Validates environment detection implementation
 */

const fs = require('fs');
const path = require('path');

class Config01SmokeTest {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.configPath = path.join(this.projectRoot, 'pwa-card-storage/config');
        this.detectorPath = path.join(this.projectRoot, 'pwa-card-storage/src/core/environment-detector.js');
        this.reportPath = path.join(this.projectRoot, 'deploy/config-01-environment-detection-report.json');
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 CONFIG-01 Smoke Test Suite');
        console.log('==============================\n');

        try {
            await this.testDetectorImplementation();
            await this.testPlatformConfigurations();
            await this.testConfigurationValidation();
            await this.testEnvironmentDetection();
            await this.testSecurityFeatures();
            await this.testFallbackHandling();
            await this.testReportGeneration();
            await this.testPlatformSupport();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        }
    }

    async testDetectorImplementation() {
        const testName = 'Environment Detector Implementation';
        
        try {
            if (!fs.existsSync(this.detectorPath)) {
                throw new Error('Environment detector module not found');
            }

            const detectorContent = fs.readFileSync(this.detectorPath, 'utf8');
            
            // Check for required methods
            const requiredMethods = [
                'detectPlatform',
                'loadConfiguration',
                'validateConfiguration',
                'getCurrentEnvironment',
                'initialize'
            ];

            for (const method of requiredMethods) {
                if (!detectorContent.includes(method)) {
                    throw new Error(`Missing required method: ${method}`);
                }
            }

            // Check for platform patterns
            const expectedPlatforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
            for (const platform of expectedPlatforms) {
                if (!detectorContent.includes(platform)) {
                    throw new Error(`Missing platform support: ${platform}`);
                }
            }

            // Check for security features
            if (!detectorContent.includes('validateConfiguration')) {
                throw new Error('Missing configuration validation');
            }

            this.addTestResult(testName, true, 'Environment detector implemented with all required methods and platform support');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testPlatformConfigurations() {
        const testName = 'Platform Configuration Files';
        
        try {
            if (!fs.existsSync(this.configPath)) {
                throw new Error('Config directory not found');
            }

            const expectedConfigs = [
                'github-pages-config.json',
                'cloudflare-pages-config.json',
                'netlify-config.json',
                'vercel-config.json',
                'local-config.json'
            ];

            const configFiles = fs.readdirSync(this.configPath);
            let validConfigs = 0;

            for (const configFile of expectedConfigs) {
                if (!configFiles.includes(configFile)) {
                    throw new Error(`Missing configuration file: ${configFile}`);
                }

                const configPath = path.join(this.configPath, configFile);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                // Validate required fields
                const requiredFields = ['platform', 'basePath', 'features', 'security'];
                for (const field of requiredFields) {
                    if (!config[field]) {
                        throw new Error(`Missing field ${field} in ${configFile}`);
                    }
                }

                validConfigs++;
            }

            this.addTestResult(testName, true, `${validConfigs} platform configuration files created and validated`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testConfigurationValidation() {
        const testName = 'Configuration Validation Logic';
        
        try {
            const configFiles = fs.readdirSync(this.configPath)
                .filter(file => file.endsWith('-config.json'));

            let validatedConfigs = 0;
            for (const configFile of configFiles) {
                const configPath = path.join(this.configPath, configFile);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                // Test required fields validation
                const requiredFields = ['platform', 'basePath', 'features', 'security'];
                for (const field of requiredFields) {
                    if (!config[field]) {
                        throw new Error(`Configuration validation failed for ${configFile}: missing ${field}`);
                    }
                }

                // Test domain validation
                if (config.allowedDomains) {
                    if (!Array.isArray(config.allowedDomains)) {
                        throw new Error(`Invalid allowedDomains format in ${configFile}`);
                    }
                    
                    for (const domain of config.allowedDomains) {
                        if (typeof domain !== 'string' || domain.length === 0) {
                            throw new Error(`Invalid domain format in ${configFile}: ${domain}`);
                        }
                    }
                }

                // Test CSP validation
                if (config.security.csp) {
                    if (typeof config.security.csp !== 'string') {
                        throw new Error(`Invalid CSP format in ${configFile}`);
                    }
                }

                validatedConfigs++;
            }

            this.addTestResult(testName, true, `${validatedConfigs} configurations passed validation logic`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testEnvironmentDetection() {
        const testName = 'Environment Detection Logic';
        
        try {
            const detectorContent = fs.readFileSync(this.detectorPath, 'utf8');

            // Test platform pattern definitions
            const platformPatterns = [
                '\\.github\\.io$',
                '\\.pages\\.dev$',
                '\\.netlify\\.app$',
                '\\.vercel\\.app$',
                'localhost'
            ];

            for (const pattern of platformPatterns) {
                if (!detectorContent.includes(pattern)) {
                    throw new Error(`Missing platform pattern: ${pattern}`);
                }
            }

            // Test confidence calculation
            if (!detectorContent.includes('calculateConfidence')) {
                throw new Error('Missing confidence calculation logic');
            }

            // Test fallback handling
            if (!detectorContent.includes('getFallbackConfiguration')) {
                throw new Error('Missing fallback configuration logic');
            }

            this.addTestResult(testName, true, 'Environment detection logic implemented with pattern matching and confidence calculation');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testSecurityFeatures() {
        const testName = 'Security Features Implementation';
        
        try {
            const configFiles = fs.readdirSync(this.configPath)
                .filter(file => file.endsWith('-config.json'));

            let secureConfigs = 0;
            for (const configFile of configFiles) {
                const configPath = path.join(this.configPath, configFile);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                // Test CSP implementation
                if (!config.security.csp) {
                    throw new Error(`Missing CSP in ${configFile}`);
                }

                // Test domain validation
                if (!config.allowedDomains || !Array.isArray(config.allowedDomains)) {
                    throw new Error(`Missing or invalid allowedDomains in ${configFile}`);
                }

                // Test HTTPS configuration
                if (typeof config.security.https !== 'boolean') {
                    throw new Error(`Invalid HTTPS configuration in ${configFile}`);
                }

                secureConfigs++;
            }

            // Test detector security features
            const detectorContent = fs.readFileSync(this.detectorPath, 'utf8');
            if (!detectorContent.includes('validateConfiguration')) {
                throw new Error('Missing configuration validation in detector');
            }

            this.addTestResult(testName, true, `${secureConfigs} configurations have security features, detector has validation`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testFallbackHandling() {
        const testName = 'Fallback Handling Implementation';
        
        try {
            const detectorContent = fs.readFileSync(this.detectorPath, 'utf8');

            // Test fallback configuration method
            if (!detectorContent.includes('getFallbackConfiguration')) {
                throw new Error('Missing fallback configuration method');
            }

            // Test unknown platform handling
            if (!detectorContent.includes('Unknown platform, defaulting to local')) {
                throw new Error('Missing unknown platform fallback logic');
            }

            // Test config loading fallback
            if (!detectorContent.includes('Failed to load config')) {
                throw new Error('Missing config loading fallback');
            }

            // Test fallback configuration structure
            const fallbackPattern = /getFallbackConfiguration.*?\{[\s\S]*?platform:[\s\S]*?basePath:[\s\S]*?features:[\s\S]*?\}/;
            if (!fallbackPattern.test(detectorContent)) {
                throw new Error('Fallback configuration structure incomplete');
            }

            this.addTestResult(testName, true, 'Fallback handling implemented for unknown platforms and config loading failures');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testReportGeneration() {
        const testName = 'Report Generation Validation';
        
        try {
            if (!fs.existsSync(this.reportPath)) {
                throw new Error('Report file not generated');
            }

            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            
            const requiredFields = [
                'timestamp',
                'task',
                'description',
                'implementation',
                'platforms',
                'security',
                'testing'
            ];

            for (const field of requiredFields) {
                if (!report[field]) {
                    throw new Error(`Missing required report field: ${field}`);
                }
            }

            if (report.task !== 'CONFIG-01') {
                throw new Error(`Incorrect task ID in report: ${report.task}`);
            }

            if (!report.platforms || report.platforms.length !== 5) {
                throw new Error(`Expected 5 platforms in report, got ${report.platforms?.length || 0}`);
            }

            if (!report.implementation.configFilesGenerated || report.implementation.configFilesGenerated.length !== 5) {
                throw new Error('Incorrect number of config files in report');
            }

            this.addTestResult(testName, true, 'Complete report generated with all required fields and correct platform count');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testPlatformSupport() {
        const testName = 'Platform Support Completeness';
        
        try {
            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            
            const expectedPlatforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
            const reportedPlatforms = report.platforms.map(p => p.name);

            for (const platform of expectedPlatforms) {
                if (!reportedPlatforms.includes(platform)) {
                    throw new Error(`Missing platform support: ${platform}`);
                }
            }

            // Test platform-specific features
            const githubConfig = JSON.parse(fs.readFileSync(path.join(this.configPath, 'github-pages-config.json'), 'utf8'));
            if (!githubConfig.features.jekyllProcessing) {
                throw new Error('Missing GitHub Pages specific feature: jekyllProcessing');
            }

            const cloudflareConfig = JSON.parse(fs.readFileSync(path.join(this.configPath, 'cloudflare-pages-config.json'), 'utf8'));
            if (!cloudflareConfig.features.edgeFunctions) {
                throw new Error('Missing Cloudflare Pages specific feature: edgeFunctions');
            }

            const netlifyConfig = JSON.parse(fs.readFileSync(path.join(this.configPath, 'netlify-config.json'), 'utf8'));
            if (!netlifyConfig.features.functions) {
                throw new Error('Missing Netlify specific feature: functions');
            }

            const vercelConfig = JSON.parse(fs.readFileSync(path.join(this.configPath, 'vercel-config.json'), 'utf8'));
            if (!vercelConfig.features.serverlessFunctions) {
                throw new Error('Missing Vercel specific feature: serverlessFunctions');
            }

            const localConfig = JSON.parse(fs.readFileSync(path.join(this.configPath, 'local-config.json'), 'utf8'));
            if (!localConfig.features.debugMode) {
                throw new Error('Missing Local specific feature: debugMode');
            }

            this.addTestResult(testName, true, '5 platforms fully supported with platform-specific features');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    addTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed,
            message
        });
    }

    printResults() {
        console.log('\n📊 Test Results Summary');
        console.log('=======================');
        
        let passedCount = 0;
        let totalCount = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            const number = `${index + 1}`.padStart(2, '0');
            
            console.log(`${number}. ${status} - ${result.name}`);
            console.log(`    ${result.message}\n`);
            
            if (result.passed) passedCount++;
        });
        
        const successRate = ((passedCount / totalCount) * 100).toFixed(1);
        console.log(`🎯 Overall Result: ${passedCount}/${totalCount} tests passed (${successRate}%)`);
        
        if (passedCount === totalCount) {
            console.log('🎉 All tests passed! CONFIG-01 implementation is successful.');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
            process.exit(1);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const tester = new Config01SmokeTest();
    tester.runAllTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = Config01SmokeTest;