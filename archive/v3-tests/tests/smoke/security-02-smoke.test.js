#!/usr/bin/env node

/**
 * SECURITY-02 Smoke Test Suite
 * 驗證客戶端安全配置功能
 */

const fs = require('fs');
const path = require('path');

class Security02SmokeTest {
    constructor() {
        this.testResults = [];
        this.configDir = path.join(__dirname, '..', '..', 'pwa-card-storage', 'config');
        this.securityDir = path.join(__dirname, '..', '..', 'pwa-card-storage', 'src', 'security');
        this.reportPath = path.join(__dirname, '..', '..', 'deploy', 'security-02-configuration-report.json');
        
        this.expectedConfigFiles = [
            'csp-config.json',
            'xss-protection.json',
            'security-headers.json'
        ];
    }

    async runAllTests() {
        console.log('🧪 SECURITY-02 煙霧測試開始...\n');
        
        try {
            await this.testConfigurationFiles();
            await this.testCSPConfiguration();
            await this.testXSSProtection();
            await this.testSecurityHeaders();
            await this.testSecurityConfigManager();
            await this.testConfigurationValidation();
            await this.testSecurityFeatures();
            await this.testConfigurationReport();
            
            this.printTestSummary();
            return this.testResults.every(test => test.passed);
            
        } catch (error) {
            console.error('❌ 測試執行失敗:', error.message);
            return false;
        }
    }

    async testConfigurationFiles() {
        const testName = '配置檔案創建驗證';
        
        try {
            const missingFiles = [];
            
            for (const file of this.expectedConfigFiles) {
                const filePath = path.join(this.configDir, file);
                if (!fs.existsSync(filePath)) {
                    missingFiles.push(file);
                }
            }
            
            const passed = missingFiles.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有配置檔案已正確創建'
                    : `缺少配置檔案: ${missingFiles.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testCSPConfiguration() {
        const testName = 'CSP 策略配置驗證';
        
        try {
            const cspPath = path.join(this.configDir, 'csp-config.json');
            
            if (!fs.existsSync(cspPath)) {
                this.testResults.push({
                    name: testName,
                    passed: false,
                    message: 'CSP 配置檔案不存在'
                });
                return;
            }
            
            const cspConfig = JSON.parse(fs.readFileSync(cspPath, 'utf8'));
            const issues = [];
            
            // 檢查必要欄位
            if (!cspConfig.policy) {
                issues.push('缺少 policy 欄位');
            }
            
            if (!cspConfig.directives) {
                issues.push('缺少 directives 欄位');
            }
            
            // 檢查重要指令
            const requiredDirectives = ['default-src', 'script-src', 'style-src'];
            if (cspConfig.directives) {
                for (const directive of requiredDirectives) {
                    if (!cspConfig.directives[directive]) {
                        issues.push(`缺少 ${directive} 指令`);
                    }
                }
            }
            
            // 檢查 PWA 相容性
            if (cspConfig.policy && !cspConfig.policy.includes("'unsafe-inline'")) {
                issues.push('可能缺少 PWA 必要的 unsafe-inline 設定');
            }
            
            const passed = issues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? 'CSP 策略配置正確'
                    : `CSP 配置問題: ${issues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testXSSProtection() {
        const testName = 'XSS 防護配置驗證';
        
        try {
            const xssPath = path.join(this.configDir, 'xss-protection.json');
            
            if (!fs.existsSync(xssPath)) {
                this.testResults.push({
                    name: testName,
                    passed: false,
                    message: 'XSS 防護配置檔案不存在'
                });
                return;
            }
            
            const xssConfig = JSON.parse(fs.readFileSync(xssPath, 'utf8'));
            const issues = [];
            
            // 檢查基本設定
            if (xssConfig.enabled !== true) {
                issues.push('XSS 防護未啟用');
            }
            
            if (!xssConfig.sanitization) {
                issues.push('缺少清理設定');
            }
            
            if (!xssConfig.inputValidation) {
                issues.push('缺少輸入驗證設定');
            }
            
            // 檢查清理功能
            if (xssConfig.sanitization) {
                const requiredSanitization = ['htmlEscape', 'attributeEscape', 'jsEscape'];
                for (const feature of requiredSanitization) {
                    if (!xssConfig.sanitization[feature]) {
                        issues.push(`缺少 ${feature} 清理功能`);
                    }
                }
            }
            
            // 檢查原型污染防護
            if (xssConfig.inputValidation && !xssConfig.inputValidation.prototypePollutionProtection) {
                issues.push('缺少原型污染防護');
            }
            
            const passed = issues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? 'XSS 防護配置正確'
                    : `XSS 防護問題: ${issues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testSecurityHeaders() {
        const testName = '安全標頭配置驗證';
        
        try {
            const headersPath = path.join(this.configDir, 'security-headers.json');
            
            if (!fs.existsSync(headersPath)) {
                this.testResults.push({
                    name: testName,
                    passed: false,
                    message: '安全標頭配置檔案不存在'
                });
                return;
            }
            
            const headersConfig = JSON.parse(fs.readFileSync(headersPath, 'utf8'));
            const issues = [];
            
            // 檢查必要標頭
            const requiredHeaders = [
                'X-Content-Type-Options',
                'X-Frame-Options',
                'X-XSS-Protection',
                'Referrer-Policy'
            ];
            
            if (!headersConfig.headers) {
                issues.push('缺少 headers 設定');
            } else {
                for (const header of requiredHeaders) {
                    if (!headersConfig.headers[header]) {
                        issues.push(`缺少 ${header} 標頭`);
                    }
                }
            }
            
            // 檢查靜態托管平台支援
            if (!headersConfig.staticHosting) {
                issues.push('缺少靜態托管平台設定');
            } else {
                const expectedPlatforms = ['netlify', 'vercel', 'cloudflare'];
                for (const platform of expectedPlatforms) {
                    if (!headersConfig.staticHosting[platform]) {
                        issues.push(`缺少 ${platform} 平台設定`);
                    }
                }
            }
            
            const passed = issues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '安全標頭配置正確'
                    : `安全標頭問題: ${issues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testSecurityConfigManager() {
        const testName = '安全配置管理器驗證';
        
        try {
            const managerPath = path.join(this.securityDir, 'SecurityConfigManager.js');
            
            if (!fs.existsSync(managerPath)) {
                this.testResults.push({
                    name: testName,
                    passed: false,
                    message: '安全配置管理器檔案不存在'
                });
                return;
            }
            
            const content = fs.readFileSync(managerPath, 'utf8');
            const issues = [];
            
            // 檢查類別定義
            if (!content.includes('class SecurityConfigManager')) {
                issues.push('缺少 SecurityConfigManager 類別定義');
            }
            
            // 檢查必要方法
            const requiredMethods = [
                'initialize',
                'getCSPPolicy',
                'getXSSConfig',
                'validateInput',
                'encodeOutput'
            ];
            
            for (const method of requiredMethods) {
                if (!content.includes(method)) {
                    issues.push(`缺少 ${method} 方法`);
                }
            }
            
            // 檢查安全功能
            const securityFeatures = [
                '#escapeHtml',
                '#escapeAttribute',
                '#escapeJavaScript',
                '#isPrototypePollutionAttempt'
            ];
            
            for (const feature of securityFeatures) {
                if (!content.includes(feature)) {
                    issues.push(`缺少 ${feature} 安全功能`);
                }
            }
            
            // 檢查全域匯出
            if (!content.includes('window.SecurityConfigManager')) {
                issues.push('缺少全域匯出');
            }
            
            const passed = issues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '安全配置管理器實作完整'
                    : `管理器問題: ${issues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testConfigurationValidation() {
        const testName = '配置驗證功能測試';
        
        try {
            // 檢查所有配置檔案的 JSON 格式
            const validationIssues = [];
            
            for (const file of this.expectedConfigFiles) {
                const filePath = path.join(this.configDir, file);
                
                if (fs.existsSync(filePath)) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        JSON.parse(content);
                    } catch (error) {
                        validationIssues.push(`${file}: JSON 格式錯誤`);
                    }
                } else {
                    validationIssues.push(`${file}: 檔案不存在`);
                }
            }
            
            const passed = validationIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有配置檔案格式正確'
                    : `驗證問題: ${validationIssues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testSecurityFeatures() {
        const testName = '安全功能完整性測試';
        
        try {
            const managerPath = path.join(this.securityDir, 'SecurityConfigManager.js');
            
            if (!fs.existsSync(managerPath)) {
                this.testResults.push({
                    name: testName,
                    passed: false,
                    message: '安全配置管理器不存在'
                });
                return;
            }
            
            const content = fs.readFileSync(managerPath, 'utf8');
            const securityIssues = [];
            
            // 檢查是否有不安全的 eval 使用
            if (content.includes('eval(')) {
                securityIssues.push('包含危險的 eval 使用');
            }
            
            // 檢查是否有不安全的 innerHTML 使用
            const innerHTMLMatches = content.match(/\.innerHTML\s*=/g);
            if (innerHTMLMatches) {
                const hasUnsafeUsage = innerHTMLMatches.some(match => {
                    const matchIndex = content.indexOf(match);
                    const context = content.substring(matchIndex - 50, matchIndex + 50);
                    return !context.includes('Safe innerHTML usage');
                });
                
                if (hasUnsafeUsage) {
                    securityIssues.push('可能存在不安全的 innerHTML 使用');
                }
            }
            
            // 檢查是否有適當的輸入驗證
            if (!content.includes('validateInput')) {
                securityIssues.push('缺少輸入驗證功能');
            }
            
            // 檢查是否有輸出編碼
            if (!content.includes('encodeOutput')) {
                securityIssues.push('缺少輸出編碼功能');
            }
            
            const passed = securityIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有安全功能檢查通過'
                    : `安全問題: ${securityIssues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testConfigurationReport() {
        const testName = '配置報告驗證';
        
        try {
            if (!fs.existsSync(this.reportPath)) {
                this.testResults.push({
                    name: testName,
                    passed: false,
                    message: '配置報告檔案不存在'
                });
                return;
            }
            
            const reportContent = fs.readFileSync(this.reportPath, 'utf8');
            const report = JSON.parse(reportContent);
            
            const reportIssues = [];
            
            // 檢查報告結構
            const requiredFields = [
                'configurations',
                'cspPolicies',
                'xssProtections',
                'securityHeaders',
                'validationResults',
                'summary'
            ];
            
            for (const field of requiredFields) {
                if (!report[field]) {
                    reportIssues.push(`缺少 ${field} 欄位`);
                }
            }
            
            // 檢查摘要資訊
            if (report.summary) {
                if (report.summary.totalConfigurations < 1) {
                    reportIssues.push('配置項目數量異常');
                }
                
                if (!report.summary.allValidationsPassed) {
                    reportIssues.push('存在驗證失敗項目');
                }
            }
            
            const passed = reportIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '配置報告結構和內容正確'
                    : `報告問題: ${reportIssues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    printTestSummary() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n📊 SECURITY-02 煙霧測試結果:');
        console.log(`   總測試數: ${totalTests}`);
        console.log(`   通過: ${passedTests} ✅`);
        console.log(`   失敗: ${failedTests} ❌`);
        console.log(`   成功率: ${Math.round(passedTests / totalTests * 100)}%\n`);
        
        this.testResults.forEach((test, index) => {
            const status = test.passed ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${test.name}`);
            console.log(`   ${test.message}\n`);
        });
    }
}

async function main() {
    const tester = new Security02SmokeTest();
    const success = await tester.runAllTests();
    
    if (success) {
        console.log('🎉 SECURITY-02 煙霧測試全部通過！');
        process.exit(0);
    } else {
        console.log('💥 SECURITY-02 煙霧測試發現問題，請檢查上述結果。');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = Security02SmokeTest;