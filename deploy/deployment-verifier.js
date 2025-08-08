#!/usr/bin/env node

/**
 * Deployment Verification Tool
 * 
 * Production-grade tool for verifying PWA functionality after deployment.
 * Validates resource loading, configuration management, security features,
 * and cross-platform compatibility across 5 hosting platforms.
 * 
 * Features:
 * - Resource loading verification
 * - Configuration management validation
 * - Security feature testing
 * - Performance metrics collection
 * - Cross-platform compatibility checks
 * - Comprehensive reporting
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class DeploymentVerifier {
    constructor() {
        this.reportPath = path.join(__dirname, 'deploy-01-verification-report.json');
        this.platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
        this.testResults = [];
        this.report = {
            timestamp: new Date().toISOString(),
            tool: 'deployment-verifier',
            version: '1.0.0',
            verificationResults: [],
            performanceMetrics: [],
            securityChecks: [],
            errors: []
        };
    }

    /**
     * Verify deployment for specified URL or local environment
     */
    async verifyDeployment(baseUrl = null, platform = 'local') {
        try {
            console.log(`🚀 Starting deployment verification for ${platform}...`);
            
            // Determine base URL
            const targetUrl = baseUrl || this.getDefaultUrl(platform);
            console.log(`🔍 Verifying deployment at: ${targetUrl}`);
            
            // Initialize verification context
            const verificationContext = {
                platform,
                baseUrl: targetUrl,
                startTime: Date.now(),
                tests: []
            };
            
            // Run verification tests
            await this.verifyResourceLoading(verificationContext);
            await this.verifyConfigurationManagement(verificationContext);
            await this.verifySecurityFeatures(verificationContext);
            await this.verifyPWAFeatures(verificationContext);
            await this.verifyPerformanceMetrics(verificationContext);
            
            // Calculate verification summary
            verificationContext.endTime = Date.now();
            verificationContext.duration = verificationContext.endTime - verificationContext.startTime;
            verificationContext.passedTests = verificationContext.tests.filter(t => t.passed).length;
            verificationContext.totalTests = verificationContext.tests.length;
            verificationContext.successRate = Math.round((verificationContext.passedTests / verificationContext.totalTests) * 100);
            
            this.report.verificationResults.push(verificationContext);
            
            console.log(`✅ Deployment verification completed for ${platform}`);
            console.log(`📊 Results: ${verificationContext.passedTests}/${verificationContext.totalTests} tests passed (${verificationContext.successRate}%)`);
            
            return verificationContext;
            
        } catch (error) {
            console.error(`❌ Deployment verification failed for ${platform}:`, error.message);
            this.report.errors.push({
                platform,
                type: 'verification_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Get default URL for platform
     */
    getDefaultUrl(platform) {
        switch (platform) {
            case 'github-pages':
                return 'https://moda-gov-tw.github.io/DB-Card/pwa-card-storage/';
            case 'cloudflare-pages':
                return 'https://db-card.pages.dev/';
            case 'netlify':
                return 'https://db-card.netlify.app/';
            case 'vercel':
                return 'https://db-card.vercel.app/';
            case 'local':
                return 'http://localhost:8080/pwa-card-storage/';
            default:
                return 'http://localhost:8080/pwa-card-storage/';
        }
    }

    /**
     * Verify resource loading
     */
    async verifyResourceLoading(context) {
        console.log('🔍 Verifying resource loading...');
        
        const resources = [
            { path: '', type: 'html', critical: true },
            { path: 'manifest.json', type: 'json', critical: true },
            { path: 'sw.js', type: 'javascript', critical: true },
            { path: 'assets/moda-logo.svg', type: 'image', critical: false },
            { path: 'src/core/configuration-manager.js', type: 'javascript', critical: true },
            { path: 'src/core/config-validator.js', type: 'javascript', critical: true },
            { path: 'config/github-pages-config.json', type: 'json', critical: false },
            { path: 'config/local-config.json', type: 'json', critical: false }
        ];
        
        for (const resource of resources) {
            try {
                const resourceUrl = `${context.baseUrl}${resource.path}`;
                const result = await this.fetchResource(resourceUrl);
                
                const test = {
                    name: `Resource Loading: ${resource.path}`,
                    type: 'resource_loading',
                    passed: result.status >= 200 && result.status < 400,
                    details: {
                        url: resourceUrl,
                        status: result.status,
                        size: result.size,
                        contentType: result.contentType,
                        critical: resource.critical
                    },
                    timestamp: new Date().toISOString()
                };
                
                context.tests.push(test);
                
                if (test.passed) {
                    console.log(`  ✅ ${resource.path} (${result.status}, ${result.size} bytes)`);
                } else {
                    console.log(`  ❌ ${resource.path} (${result.status})`);
                    if (resource.critical) {
                        console.warn(`    ⚠️  Critical resource failed to load`);
                    }
                }
                
            } catch (error) {
                const test = {
                    name: `Resource Loading: ${resource.path}`,
                    type: 'resource_loading',
                    passed: false,
                    details: {
                        url: `${context.baseUrl}${resource.path}`,
                        error: error.message,
                        critical: resource.critical
                    },
                    timestamp: new Date().toISOString()
                };
                
                context.tests.push(test);
                console.log(`  ❌ ${resource.path} (Error: ${error.message})`);
            }
        }
    }

    /**
     * Verify configuration management
     */
    async verifyConfigurationManagement(context) {
        console.log('🔍 Verifying configuration management...');
        
        try {
            // Test configuration manager loading
            const configManagerUrl = `${context.baseUrl}src/core/configuration-manager.js`;
            const configManagerResult = await this.fetchResource(configManagerUrl);
            
            const configManagerTest = {
                name: 'Configuration Manager Availability',
                type: 'config_management',
                passed: configManagerResult.status === 200,
                details: {
                    url: configManagerUrl,
                    status: configManagerResult.status,
                    hasConfigurationManager: configManagerResult.content?.includes('class ConfigurationManager'),
                    hasUnifiedAPI: configManagerResult.content?.includes('loadConfiguration')
                },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(configManagerTest);
            
            // Test platform-specific configurations
            const platformConfig = `${context.baseUrl}config/${context.platform}-config.json`;
            const configResult = await this.fetchResource(platformConfig);
            
            let configData = null;
            if (configResult.status === 200 && configResult.content) {
                try {
                    configData = JSON.parse(configResult.content);
                } catch (parseError) {
                    console.warn('Failed to parse configuration JSON');
                }
            }
            
            const configTest = {
                name: 'Platform Configuration Availability',
                type: 'config_management',
                passed: configResult.status === 200 && configData !== null,
                details: {
                    url: platformConfig,
                    status: configResult.status,
                    platform: configData?.platform,
                    version: configData?.version,
                    hasRequiredFields: configData && this.validateConfigStructure(configData)
                },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(configTest);
            
            console.log(`  ${configManagerTest.passed ? '✅' : '❌'} Configuration Manager`);
            console.log(`  ${configTest.passed ? '✅' : '❌'} Platform Configuration (${context.platform})`);
            
        } catch (error) {
            const test = {
                name: 'Configuration Management Error',
                type: 'config_management',
                passed: false,
                details: { error: error.message },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(test);
            console.log(`  ❌ Configuration Management (Error: ${error.message})`);
        }
    }

    /**
     * Verify security features
     */
    async verifySecurityFeatures(context) {
        console.log('🔍 Verifying security features...');
        
        try {
            // Test main page for security headers
            const mainPageResult = await this.fetchResource(context.baseUrl, { includeHeaders: true });
            
            const securityHeaders = [
                'X-Content-Type-Options',
                'X-Frame-Options',
                'X-XSS-Protection'
            ];
            
            const headerTests = securityHeaders.map(header => {
                const hasHeader = mainPageResult.headers && mainPageResult.headers[header.toLowerCase()];
                return {
                    name: `Security Header: ${header}`,
                    type: 'security',
                    passed: !!hasHeader,
                    details: {
                        header,
                        value: hasHeader || 'Not present',
                        recommended: this.getRecommendedHeaderValue(header)
                    },
                    timestamp: new Date().toISOString()
                };
            });
            
            context.tests.push(...headerTests);
            
            // Test for CSP in HTML content
            const cspTest = {
                name: 'Content Security Policy',
                type: 'security',
                passed: mainPageResult.content?.includes('Content-Security-Policy') || 
                        (mainPageResult.headers && mainPageResult.headers['content-security-policy']),
                details: {
                    inHTML: mainPageResult.content?.includes('Content-Security-Policy'),
                    inHeaders: !!(mainPageResult.headers && mainPageResult.headers['content-security-policy'])
                },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(cspTest);
            
            // Test security modules availability
            const securityModules = [
                'src/security/SecurityInputHandler.js',
                'src/security/SecurityDataHandler.js',
                'src/security/SecurityAuthHandler.js'
            ];
            
            for (const module of securityModules) {
                try {
                    const moduleUrl = `${context.baseUrl}${module}`;
                    const moduleResult = await this.fetchResource(moduleUrl);
                    
                    const moduleTest = {
                        name: `Security Module: ${path.basename(module)}`,
                        type: 'security',
                        passed: moduleResult.status === 200,
                        details: {
                            url: moduleUrl,
                            status: moduleResult.status,
                            hasSecurityClass: moduleResult.content?.includes('class Security')
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    context.tests.push(moduleTest);
                    
                } catch (error) {
                    const moduleTest = {
                        name: `Security Module: ${path.basename(module)}`,
                        type: 'security',
                        passed: false,
                        details: { error: error.message },
                        timestamp: new Date().toISOString()
                    };
                    
                    context.tests.push(moduleTest);
                }
            }
            
            const securityTestResults = context.tests.filter(t => t.type === 'security');
            const passedSecurity = securityTestResults.filter(t => t.passed).length;
            
            console.log(`  📊 Security Features: ${passedSecurity}/${securityTestResults.length} passed`);
            
        } catch (error) {
            const test = {
                name: 'Security Features Error',
                type: 'security',
                passed: false,
                details: { error: error.message },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(test);
            console.log(`  ❌ Security Features (Error: ${error.message})`);
        }
    }

    /**
     * Verify PWA features
     */
    async verifyPWAFeatures(context) {
        console.log('🔍 Verifying PWA features...');
        
        try {
            // Test manifest.json
            const manifestUrl = `${context.baseUrl}manifest.json`;
            const manifestResult = await this.fetchResource(manifestUrl);
            
            let manifestData = null;
            if (manifestResult.status === 200 && manifestResult.content) {
                try {
                    manifestData = JSON.parse(manifestResult.content);
                } catch (parseError) {
                    console.warn('Failed to parse manifest JSON');
                }
            }
            
            const manifestTest = {
                name: 'PWA Manifest',
                type: 'pwa',
                passed: manifestResult.status === 200 && manifestData !== null,
                details: {
                    url: manifestUrl,
                    status: manifestResult.status,
                    name: manifestData?.name,
                    startUrl: manifestData?.start_url,
                    display: manifestData?.display,
                    hasIcons: manifestData?.icons?.length > 0
                },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(manifestTest);
            
            // Test Service Worker
            const swUrl = `${context.baseUrl}sw.js`;
            const swResult = await this.fetchResource(swUrl);
            
            const swTest = {
                name: 'Service Worker',
                type: 'pwa',
                passed: swResult.status === 200,
                details: {
                    url: swUrl,
                    status: swResult.status,
                    size: swResult.size,
                    hasInstallEvent: swResult.content?.includes('install'),
                    hasFetchEvent: swResult.content?.includes('fetch'),
                    hasCacheStrategy: swResult.content?.includes('cache')
                },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(swTest);
            
            console.log(`  ${manifestTest.passed ? '✅' : '❌'} PWA Manifest`);
            console.log(`  ${swTest.passed ? '✅' : '❌'} Service Worker`);
            
        } catch (error) {
            const test = {
                name: 'PWA Features Error',
                type: 'pwa',
                passed: false,
                details: { error: error.message },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(test);
            console.log(`  ❌ PWA Features (Error: ${error.message})`);
        }
    }

    /**
     * Verify performance metrics
     */
    async verifyPerformanceMetrics(context) {
        console.log('🔍 Collecting performance metrics...');
        
        try {
            const startTime = Date.now();
            const mainPageResult = await this.fetchResource(context.baseUrl);
            const loadTime = Date.now() - startTime;
            
            const performanceMetrics = {
                platform: context.platform,
                loadTime,
                responseSize: mainPageResult.size,
                status: mainPageResult.status,
                timestamp: new Date().toISOString()
            };
            
            this.report.performanceMetrics.push(performanceMetrics);
            
            const performanceTest = {
                name: 'Performance Metrics',
                type: 'performance',
                passed: loadTime < 3000 && mainPageResult.status === 200, // 3 second threshold
                details: performanceMetrics,
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(performanceTest);
            
            console.log(`  📊 Load Time: ${loadTime}ms (${performanceTest.passed ? 'PASS' : 'FAIL'})`);
            console.log(`  📊 Response Size: ${mainPageResult.size} bytes`);
            
        } catch (error) {
            const test = {
                name: 'Performance Metrics Error',
                type: 'performance',
                passed: false,
                details: { error: error.message },
                timestamp: new Date().toISOString()
            };
            
            context.tests.push(test);
            console.log(`  ❌ Performance Metrics (Error: ${error.message})`);
        }
    }

    /**
     * Fetch resource with detailed information
     */
    async fetchResource(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.get(url, (res) => {
                let data = '';
                let size = 0;
                
                res.on('data', (chunk) => {
                    data += chunk;
                    size += chunk.length;
                });
                
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        size,
                        contentType: res.headers['content-type'],
                        headers: options.includeHeaders ? res.headers : null,
                        content: data
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Validate configuration structure
     */
    validateConfigStructure(config) {
        const requiredFields = ['platform', 'version', 'basePath', 'features', 'security', 'cache', 'deployment'];
        return requiredFields.every(field => field in config);
    }

    /**
     * Get recommended security header value
     */
    getRecommendedHeaderValue(header) {
        const recommendations = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
        };
        return recommendations[header] || 'Not specified';
    }

    /**
     * Generate comprehensive verification report
     */
    async generateReport() {
        try {
            // Calculate overall statistics
            const allTests = this.report.verificationResults.flatMap(r => r.tests);
            const totalTests = allTests.length;
            const passedTests = allTests.filter(t => t.passed).length;
            const failedTests = totalTests - passedTests;
            
            // Group tests by type
            const testsByType = allTests.reduce((acc, test) => {
                if (!acc[test.type]) acc[test.type] = [];
                acc[test.type].push(test);
                return acc;
            }, {});
            
            // Calculate performance summary
            const avgLoadTime = this.report.performanceMetrics.length > 0 
                ? Math.round(this.report.performanceMetrics.reduce((sum, m) => sum + m.loadTime, 0) / this.report.performanceMetrics.length)
                : 0;
            
            this.report.summary = {
                totalPlatforms: this.report.verificationResults.length,
                totalTests,
                passedTests,
                failedTests,
                successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
                testsByType: Object.keys(testsByType).map(type => ({
                    type,
                    total: testsByType[type].length,
                    passed: testsByType[type].filter(t => t.passed).length
                })),
                averageLoadTime: `${avgLoadTime}ms`,
                criticalIssues: allTests.filter(t => !t.passed && t.details?.critical).length
            };
            
            // Write report
            fs.writeFileSync(this.reportPath, JSON.stringify(this.report, null, 2), 'utf8');
            console.log(`📊 Generated comprehensive verification report`);
            
            return this.report;
            
        } catch (error) {
            console.error('Failed to generate report:', error.message);
            throw error;
        }
    }

    /**
     * Verify multiple platforms
     */
    async verifyAllPlatforms(platformUrls = {}) {
        console.log('🚀 Starting multi-platform deployment verification...\n');
        
        for (const platform of this.platforms) {
            try {
                const url = platformUrls[platform];
                await this.verifyDeployment(url, platform);
                console.log(''); // Add spacing between platforms
            } catch (error) {
                console.error(`Failed to verify ${platform}:`, error.message);
                console.log(''); // Add spacing between platforms
            }
        }
        
        await this.generateReport();
        
        console.log('🎉 Multi-platform verification completed!');
        console.log(`📊 Report saved to: ${this.reportPath}`);
        
        return this.report;
    }
}

// CLI execution
if (require.main === module) {
    const verifier = new DeploymentVerifier();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const platform = args[0] || 'local';
    const url = args[1];
    
    if (platform === 'all') {
        // Verify all platforms
        verifier.verifyAllPlatforms()
            .then(report => {
                console.log(`\n📊 Overall Results: ${report.summary.passedTests}/${report.summary.totalTests} tests passed (${report.summary.successRate})`);
                process.exit(report.summary.failedTests === 0 ? 0 : 1);
            })
            .catch(error => {
                console.error('\n💥 Multi-platform verification failed:', error.message);
                process.exit(1);
            });
    } else {
        // Verify single platform
        verifier.verifyDeployment(url, platform)
            .then(result => {
                verifier.generateReport().then(() => {
                    console.log(`\n📊 Results: ${result.passedTests}/${result.totalTests} tests passed (${result.successRate}%)`);
                    process.exit(result.passedTests === result.totalTests ? 0 : 1);
                });
            })
            .catch(error => {
                console.error('\n💥 Deployment verification failed:', error.message);
                process.exit(1);
            });
    }
}

module.exports = DeploymentVerifier;