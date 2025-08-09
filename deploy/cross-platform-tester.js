/**
 * Cross-Platform Testing Suite
 * 跨平台測試套件 - PWA 靜態托管部署相容性測試
 * 
 * Version: v3.2.0-pwa-deployment-compatibility
 * Created: 2025-08-07
 * Purpose: 自動化測試5個托管平台的功能一致性和效能指標
 * Security: 測試環境隔離、資料保護、敏感資訊過濾
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

class CrossPlatformTester {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.testResults = {
            timestamp: new Date().toISOString(),
            platforms: {},
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                overallScore: 0
            }
        };
        
        // 支援的托管平台配置
        this.platforms = {
            'github-pages': {
                name: 'GitHub Pages',
                baseUrl: 'https://username.github.io/DB-Card',
                pathPrefix: '/DB-Card',
                features: ['pwa', 'https', 'custom-domain'],
                timeout: 10000
            },
            'cloudflare-pages': {
                name: 'Cloudflare Pages',
                baseUrl: 'https://db-card.pages.dev',
                pathPrefix: '',
                features: ['pwa', 'https', 'edge-functions', 'analytics'],
                timeout: 8000
            },
            'netlify': {
                name: 'Netlify',
                baseUrl: 'https://db-card.netlify.app',
                pathPrefix: '',
                features: ['pwa', 'https', 'forms', 'redirects'],
                timeout: 8000
            },
            'vercel': {
                name: 'Vercel',
                baseUrl: 'https://db-card.vercel.app',
                pathPrefix: '',
                features: ['pwa', 'https', 'serverless', 'analytics'],
                timeout: 8000
            },
            'local': {
                name: 'Local Development',
                baseUrl: 'http://localhost:8000',
                pathPrefix: '',
                features: ['pwa', 'development'],
                timeout: 5000
            }
        };
        
        // 測試套件配置
        this.testSuites = [
            'resourceLoading',
            'pwaFeatures', 
            'securityHeaders',
            'performance',
            'functionality',
            'crossBrowser',
            'mobileCompatibility'
        ];
        
        // 效能基準
        this.performanceThresholds = {
            firstContentfulPaint: 3000, // 3秒
            largestContentfulPaint: 4000, // 4秒
            totalLoadTime: 5000, // 5秒
            resourceCount: 50, // 最大資源數
            totalSize: 2048000 // 2MB
        };
    }
    
    /**
     * 執行跨平台測試
     */
    async runCrossPlatformTests(options = {}) {
        console.log('🚀 Starting Cross-Platform Testing Suite...\n');
        
        const {
            platforms = Object.keys(this.platforms),
            testSuites = this.testSuites,
            generateReport = true,
            verbose = false
        } = options;
        
        try {
            // 初始化測試環境
            await this.initializeTestEnvironment();
            
            // 執行平台測試
            for (const platformId of platforms) {
                if (!this.platforms[platformId]) {
                    console.log(`⚠️ Unknown platform: ${platformId}`);
                    continue;
                }
                
                console.log(`📋 Testing platform: ${this.platforms[platformId].name}`);
                await this.testPlatform(platformId, testSuites, verbose);
                console.log(''); // 空行分隔
            }
            
            // 生成測試報告
            if (generateReport) {
                await this.generateTestReport();
            }
            
            // 計算總體分數
            this.calculateOverallScore();
            
            console.log('✅ Cross-platform testing completed');
            return this.testResults;
            
        } catch (error) {
            console.error('❌ Cross-platform testing failed:', error.message);
            throw error;
        }
    }
    
    /**
     * 初始化測試環境
     */
    async initializeTestEnvironment() {
        // 檢查必要檔案
        const requiredFiles = [
            'pwa-card-storage/index.html',
            'pwa-card-storage/manifest.json',
            'pwa-card-storage/sw.js'
        ];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }
        
        // 初始化測試資料
        this.testData = {
            sampleCard: {
                name: 'Test User',
                title: 'Test Title',
                email: 'test@example.com',
                phone: '0912345678'
            }
        };
        
        console.log('✅ Test environment initialized');
    }
    
    /**
     * 測試單一平台
     */
    async testPlatform(platformId, testSuites, verbose = false) {
        const platform = this.platforms[platformId];
        const platformResults = {
            platform: platform.name,
            baseUrl: platform.baseUrl,
            tests: {},
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                score: 0
            },
            performance: {},
            errors: []
        };
        
        try {
            // 執行各項測試套件
            for (const testSuite of testSuites) {
                if (verbose) {
                    console.log(`  🧪 Running ${testSuite} tests...`);
                }
                
                const testResult = await this.runTestSuite(platformId, testSuite);
                platformResults.tests[testSuite] = testResult;
                
                platformResults.summary.totalTests += testResult.totalTests;
                platformResults.summary.passedTests += testResult.passedTests;
                platformResults.summary.failedTests += testResult.failedTests;
                
                if (verbose && testResult.failedTests > 0) {
                    console.log(`    ❌ ${testResult.failedTests} tests failed`);
                }
            }
            
            // 計算平台分數
            platformResults.summary.score = platformResults.summary.totalTests > 0 
                ? Math.round((platformResults.summary.passedTests / platformResults.summary.totalTests) * 100)
                : 0;
                
            console.log(`  📊 Platform score: ${platformResults.summary.score}% (${platformResults.summary.passedTests}/${platformResults.summary.totalTests})`);
            
        } catch (error) {
            platformResults.errors.push({
                type: 'platform_error',
                message: this.sanitizeErrorMessage(error.message),
                timestamp: new Date().toISOString()
            });
            console.log(`  ❌ Platform testing failed: ${error.message}`);
        }
        
        this.testResults.platforms[platformId] = platformResults;
    }
    
    /**
     * 執行測試套件
     */
    async runTestSuite(platformId, testSuite) {
        const testResult = {
            suite: testSuite,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            tests: [],
            duration: 0
        };
        
        const startTime = performance.now();
        
        try {
            switch (testSuite) {
                case 'resourceLoading':
                    await this.testResourceLoading(platformId, testResult);
                    break;
                case 'pwaFeatures':
                    await this.testPwaFeatures(platformId, testResult);
                    break;
                case 'securityHeaders':
                    await this.testSecurityHeaders(platformId, testResult);
                    break;
                case 'performance':
                    await this.testPerformance(platformId, testResult);
                    break;
                case 'functionality':
                    await this.testFunctionality(platformId, testResult);
                    break;
                case 'crossBrowser':
                    await this.testCrossBrowser(platformId, testResult);
                    break;
                case 'mobileCompatibility':
                    await this.testMobileCompatibility(platformId, testResult);
                    break;
                default:
                    throw new Error(`Unknown test suite: ${testSuite}`);
            }
        } catch (error) {
            testResult.tests.push({
                name: `${testSuite}_suite_error`,
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
            testResult.totalTests++;
        }
        
        testResult.duration = Math.round(performance.now() - startTime);
        return testResult;
    }
    
    /**
     * 測試資源載入
     */
    async testResourceLoading(platformId, testResult) {
        const platform = this.platforms[platformId];
        const resources = [
            '/pwa-card-storage/index.html',
            '/pwa-card-storage/manifest.json',
            '/pwa-card-storage/sw.js',
            '/pwa-card-storage/assets/styles/main.css',
            '/pwa-card-storage/src/app.js'
        ];
        
        for (const resource of resources) {
            const testName = `resource_loading_${resource.split('/').pop()}`;
            testResult.totalTests++;
            
            try {
                const url = platform.baseUrl + platform.pathPrefix + resource;
                const response = await this.makeHttpRequest(url, {
                    timeout: platform.timeout,
                    method: 'HEAD'
                });
                
                if (response.statusCode === 200) {
                    testResult.tests.push({
                        name: testName,
                        status: 'passed',
                        url: url,
                        statusCode: response.statusCode
                    });
                    testResult.passedTests++;
                } else {
                    testResult.tests.push({
                        name: testName,
                        status: 'failed',
                        url: url,
                        statusCode: response.statusCode,
                        error: `HTTP ${response.statusCode}`
                    });
                    testResult.failedTests++;
                }
            } catch (error) {
                testResult.tests.push({
                    name: testName,
                    status: 'failed',
                    error: this.sanitizeErrorMessage(error.message)
                });
                testResult.failedTests++;
            }
        }
    }
    
    /**
     * 測試PWA功能
     */
    async testPwaFeatures(platformId, testResult) {
        const platform = this.platforms[platformId];
        
        // 測試Manifest檔案
        testResult.totalTests++;
        try {
            const manifestUrl = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/manifest.json';
            const response = await this.makeHttpRequest(manifestUrl);
            
            if (response.statusCode === 200) {
                const manifest = JSON.parse(response.body);
                
                // 檢查必要欄位
                const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
                const hasAllFields = requiredFields.every(field => manifest[field]);
                
                if (hasAllFields) {
                    testResult.tests.push({
                        name: 'pwa_manifest_valid',
                        status: 'passed',
                        manifest: {
                            name: manifest.name,
                            icons: manifest.icons?.length || 0
                        }
                    });
                    testResult.passedTests++;
                } else {
                    testResult.tests.push({
                        name: 'pwa_manifest_valid',
                        status: 'failed',
                        error: 'Missing required manifest fields'
                    });
                    testResult.failedTests++;
                }
            } else {
                throw new Error(`Manifest not accessible: HTTP ${response.statusCode}`);
            }
        } catch (error) {
            testResult.tests.push({
                name: 'pwa_manifest_valid',
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
        }
        
        // 測試Service Worker
        testResult.totalTests++;
        try {
            const swUrl = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/sw.js';
            const response = await this.makeHttpRequest(swUrl);
            
            if (response.statusCode === 200 && response.body.includes('self.addEventListener')) {
                testResult.tests.push({
                    name: 'pwa_service_worker_valid',
                    status: 'passed',
                    size: response.body.length
                });
                testResult.passedTests++;
            } else {
                testResult.tests.push({
                    name: 'pwa_service_worker_valid',
                    status: 'failed',
                    error: 'Invalid Service Worker content'
                });
                testResult.failedTests++;
            }
        } catch (error) {
            testResult.tests.push({
                name: 'pwa_service_worker_valid',
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
        }
    }
    
    /**
     * 測試安全標頭
     */
    async testSecurityHeaders(platformId, testResult) {
        const platform = this.platforms[platformId];
        const securityHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'strict-transport-security'
        ];
        
        testResult.totalTests++;
        try {
            const url = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/index.html';
            const response = await this.makeHttpRequest(url);
            
            const presentHeaders = securityHeaders.filter(header => 
                response.headers[header] || response.headers[header.toLowerCase()]
            );
            
            const score = Math.round((presentHeaders.length / securityHeaders.length) * 100);
            
            testResult.tests.push({
                name: 'security_headers_present',
                status: score >= 50 ? 'passed' : 'failed',
                score: score,
                presentHeaders: presentHeaders,
                missingHeaders: securityHeaders.filter(h => !presentHeaders.includes(h))
            });
            
            if (score >= 50) {
                testResult.passedTests++;
            } else {
                testResult.failedTests++;
            }
        } catch (error) {
            testResult.tests.push({
                name: 'security_headers_present',
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
        }
    }
    
    /**
     * 測試效能指標
     */
    async testPerformance(platformId, testResult) {
        const platform = this.platforms[platformId];
        
        // 測試載入時間
        testResult.totalTests++;
        try {
            const startTime = performance.now();
            const url = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/index.html';
            const response = await this.makeHttpRequest(url);
            const loadTime = Math.round(performance.now() - startTime);
            
            const passed = loadTime <= this.performanceThresholds.totalLoadTime;
            
            testResult.tests.push({
                name: 'performance_load_time',
                status: passed ? 'passed' : 'failed',
                loadTime: loadTime,
                threshold: this.performanceThresholds.totalLoadTime,
                size: response.body?.length || 0
            });
            
            if (passed) {
                testResult.passedTests++;
            } else {
                testResult.failedTests++;
            }
        } catch (error) {
            testResult.tests.push({
                name: 'performance_load_time',
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
        }
        
        // 測試資源大小
        testResult.totalTests++;
        try {
            const resources = [
                '/pwa-card-storage/index.html',
                '/pwa-card-storage/manifest.json',
                '/pwa-card-storage/sw.js'
            ];
            
            let totalSize = 0;
            for (const resource of resources) {
                try {
                    const url = platform.baseUrl + platform.pathPrefix + resource;
                    const response = await this.makeHttpRequest(url);
                    totalSize += response.body?.length || 0;
                } catch (error) {
                    // 忽略個別資源錯誤
                }
            }
            
            const passed = totalSize <= this.performanceThresholds.totalSize;
            
            testResult.tests.push({
                name: 'performance_resource_size',
                status: passed ? 'passed' : 'failed',
                totalSize: totalSize,
                threshold: this.performanceThresholds.totalSize,
                resourceCount: resources.length
            });
            
            if (passed) {
                testResult.passedTests++;
            } else {
                testResult.failedTests++;
            }
        } catch (error) {
            testResult.tests.push({
                name: 'performance_resource_size',
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
        }
    }
    
    /**
     * 測試功能性
     */
    async testFunctionality(platformId, testResult) {
        const platform = this.platforms[platformId];
        
        // 測試主頁面內容
        testResult.totalTests++;
        try {
            const url = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/index.html';
            const response = await this.makeHttpRequest(url);
            
            const hasRequiredContent = response.body.includes('PWA') && 
                                     response.body.includes('card') &&
                                     response.body.includes('storage');
            
            testResult.tests.push({
                name: 'functionality_main_content',
                status: hasRequiredContent ? 'passed' : 'failed',
                contentLength: response.body?.length || 0
            });
            
            if (hasRequiredContent) {
                testResult.passedTests++;
            } else {
                testResult.failedTests++;
            }
        } catch (error) {
            testResult.tests.push({
                name: 'functionality_main_content',
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
        }
        
        // 測試JavaScript載入
        testResult.totalTests++;
        try {
            const url = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/src/app.js';
            const response = await this.makeHttpRequest(url);
            
            const hasValidJS = response.statusCode === 200 && 
                              response.body.length > 100;
            
            testResult.tests.push({
                name: 'functionality_javascript_loading',
                status: hasValidJS ? 'passed' : 'failed',
                size: response.body?.length || 0
            });
            
            if (hasValidJS) {
                testResult.passedTests++;
            } else {
                testResult.failedTests++;
            }
        } catch (error) {
            testResult.tests.push({
                name: 'functionality_javascript_loading',
                status: 'failed',
                error: this.sanitizeErrorMessage(error.message)
            });
            testResult.failedTests++;
        }
    }
    
    /**
     * 測試跨瀏覽器相容性 (模擬)
     */
    async testCrossBrowser(platformId, testResult) {
        // 模擬不同User-Agent的測試
        const browsers = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/14.1.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
        ];
        
        const platform = this.platforms[platformId];
        
        for (const userAgent of browsers) {
            testResult.totalTests++;
            try {
                const url = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/index.html';
                const response = await this.makeHttpRequest(url, {
                    headers: { 'User-Agent': userAgent }
                });
                
                const browserName = userAgent.includes('Chrome') ? 'Chrome' : 
                                  userAgent.includes('Safari') ? 'Safari' : 'Firefox';
                
                testResult.tests.push({
                    name: `cross_browser_${browserName.toLowerCase()}`,
                    status: response.statusCode === 200 ? 'passed' : 'failed',
                    browser: browserName,
                    statusCode: response.statusCode
                });
                
                if (response.statusCode === 200) {
                    testResult.passedTests++;
                } else {
                    testResult.failedTests++;
                }
            } catch (error) {
                testResult.tests.push({
                    name: `cross_browser_error`,
                    status: 'failed',
                    error: this.sanitizeErrorMessage(error.message)
                });
                testResult.failedTests++;
            }
        }
    }
    
    /**
     * 測試行動裝置相容性 (模擬)
     */
    async testMobileCompatibility(platformId, testResult) {
        const mobileUserAgents = [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
            'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 Chrome/91.0.4472.120 Mobile'
        ];
        
        const platform = this.platforms[platformId];
        
        for (const userAgent of mobileUserAgents) {
            testResult.totalTests++;
            try {
                const url = platform.baseUrl + platform.pathPrefix + '/pwa-card-storage/index.html';
                const response = await this.makeHttpRequest(url, {
                    headers: { 
                        'User-Agent': userAgent,
                        'Viewport': 'width=device-width, initial-scale=1'
                    }
                });
                
                const deviceType = userAgent.includes('iPhone') ? 'iOS' : 'Android';
                
                // 檢查響應式設計標記
                const hasViewportMeta = response.body.includes('viewport') && 
                                       response.body.includes('device-width');
                
                testResult.tests.push({
                    name: `mobile_compatibility_${deviceType.toLowerCase()}`,
                    status: (response.statusCode === 200 && hasViewportMeta) ? 'passed' : 'failed',
                    device: deviceType,
                    hasViewportMeta: hasViewportMeta,
                    statusCode: response.statusCode
                });
                
                if (response.statusCode === 200 && hasViewportMeta) {
                    testResult.passedTests++;
                } else {
                    testResult.failedTests++;
                }
            } catch (error) {
                testResult.tests.push({
                    name: `mobile_compatibility_error`,
                    status: 'failed',
                    error: this.sanitizeErrorMessage(error.message)
                });
                testResult.failedTests++;
            }
        }
    }
    
    /**
     * HTTP請求工具
     */
    async makeHttpRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const {
                method = 'GET',
                headers = {},
                timeout = 10000
            } = options;
            
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'User-Agent': 'PWA-Cross-Platform-Tester/1.0',
                    ...headers
                },
                timeout: timeout
            };
            
            const req = client.request(requestOptions, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout after ${timeout}ms`));
            });
            
            req.end();
        });
    }
    
    /**
     * 計算總體分數
     */
    calculateOverallScore() {
        let totalTests = 0;
        let totalPassed = 0;
        
        Object.values(this.testResults.platforms).forEach(platform => {
            totalTests += platform.summary.totalTests;
            totalPassed += platform.summary.passedTests;
        });
        
        this.testResults.summary.totalTests = totalTests;
        this.testResults.summary.passedTests = totalPassed;
        this.testResults.summary.failedTests = totalTests - totalPassed;
        this.testResults.summary.overallScore = totalTests > 0 
            ? Math.round((totalPassed / totalTests) * 100)
            : 0;
    }
    
    /**
     * 生成測試報告
     */
    async generateTestReport() {
        const reportPath = path.join(__dirname, 'cross-platform-test-report.json');
        
        try {
            // 清理敏感資訊
            const sanitizedResults = this.sanitizeTestResults(this.testResults);
            
            fs.writeFileSync(reportPath, JSON.stringify(sanitizedResults, null, 2));
            console.log(`📊 Test report generated: ${reportPath}`);
            
            // 生成簡化的控制台報告
            this.printConsoleSummary();
            
        } catch (error) {
            console.error('❌ Failed to generate test report:', error.message);
        }
    }
    
    /**
     * 列印控制台摘要
     */
    printConsoleSummary() {
        console.log('\n📊 Cross-Platform Test Summary:');
        console.log('='.repeat(50));
        
        Object.entries(this.testResults.platforms).forEach(([platformId, platform]) => {
            const score = platform.summary.score;
            const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
            
            console.log(`${status} ${platform.platform}: ${score}% (${platform.summary.passedTests}/${platform.summary.totalTests})`);
        });
        
        console.log('='.repeat(50));
        console.log(`🎯 Overall Score: ${this.testResults.summary.overallScore}% (${this.testResults.summary.passedTests}/${this.testResults.summary.totalTests})`);
        
        if (this.testResults.summary.overallScore >= 80) {
            console.log('🎉 Excellent! All platforms performing well.');
        } else if (this.testResults.summary.overallScore >= 60) {
            console.log('⚠️ Good, but some improvements needed.');
        } else {
            console.log('❌ Poor performance. Significant issues detected.');
        }
    }
    
    /**
     * 清理測試結果中的敏感資訊
     */
    sanitizeTestResults(results) {
        const sanitized = JSON.parse(JSON.stringify(results));
        
        // 移除或遮蔽敏感URL
        Object.values(sanitized.platforms).forEach(platform => {
            if (platform.baseUrl && platform.baseUrl.includes('localhost')) {
                // 保留localhost用於開發
            } else {
                // 遮蔽真實域名
                platform.baseUrl = platform.baseUrl.replace(/https?:\/\/[^\/]+/, 'https://[DOMAIN]');
            }
            
            // 清理測試中的敏感資訊
            Object.values(platform.tests).forEach(testSuite => {
                testSuite.tests.forEach(test => {
                    if (test.url) {
                        test.url = test.url.replace(/https?:\/\/[^\/]+/, 'https://[DOMAIN]');
                    }
                });
            });
        });
        
        return sanitized;
    }
    
    /**
     * 清理錯誤訊息
     */
    sanitizeErrorMessage(message) {
        if (!message) return 'Unknown error';
        
        // 移除敏感路徑資訊
        return message
            .replace(/\/Users\/[^\/]+/g, '/Users/[USER]')
            .replace(/\/home\/[^\/]+/g, '/home/[USER]')
            .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\[USER]')
            .substring(0, 200); // 限制長度
    }
}

// 命令列介面
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    // 解析命令列參數
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--platforms':
                options.platforms = args[++i]?.split(',') || [];
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--no-report':
                options.generateReport = false;
                break;
            case '--help':
                console.log(`
Cross-Platform Testing Suite

Usage: node cross-platform-tester.js [options]

Options:
  --platforms <list>    Comma-separated list of platforms to test
                       (github-pages,cloudflare-pages,netlify,vercel,local)
  --verbose            Enable verbose output
  --no-report          Skip generating test report
  --help               Show this help message

Examples:
  node cross-platform-tester.js
  node cross-platform-tester.js --platforms local,github-pages
  node cross-platform-tester.js --verbose --no-report
                `);
                process.exit(0);
                break;
        }
    }
    
    // 執行測試
    const tester = new CrossPlatformTester();
    tester.runCrossPlatformTests(options)
        .then(results => {
            const exitCode = results.summary.overallScore >= 60 ? 0 : 1;
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('❌ Testing failed:', error.message);
            process.exit(1);
        });
}

module.exports = CrossPlatformTester;