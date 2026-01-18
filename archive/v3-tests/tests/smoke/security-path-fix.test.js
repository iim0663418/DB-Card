#!/usr/bin/env node

/**
 * Security Module Path Fix Validation Test
 * 驗證安全模組路徑修復是否成功
 */

const fs = require('fs');
const path = require('path');

class SecurityPathFixValidator {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.pwaSrcPath = path.join(this.projectRoot, 'pwa-card-storage');
        this.securityPath = path.join(this.pwaSrcPath, 'src/security');
        this.htmlPath = path.join(this.pwaSrcPath, 'index.html');
        
        this.testResults = [];
    }

    /**
     * 執行所有驗證測試
     */
    async runAllTests() {
        console.log('🔍 Security Module Path Fix Validation');
        console.log('=====================================\n');

        try {
            await this.testDirectoryStructure();
            await this.testSecurityModulesExist();
            await this.testHtmlReferences();
            await this.testNoScriptsSubdirectory();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * 測試目錄結構是否正確
     */
    async testDirectoryStructure() {
        const testName = 'Directory Structure Validation';
        
        try {
            // 檢查 security 目錄存在
            if (!fs.existsSync(this.securityPath)) {
                throw new Error('Security directory does not exist');
            }

            // 檢查 scripts 子目錄不存在
            const scriptsPath = path.join(this.securityPath, 'scripts');
            if (fs.existsSync(scriptsPath)) {
                throw new Error('Scripts subdirectory should not exist');
            }

            // 檢查安全模組直接在 security 目錄下
            const securityFiles = fs.readdirSync(this.securityPath);
            const expectedFiles = [
                'SecurityInputHandler.js',
                'SecurityDataHandler.js', 
                'SecurityAuthHandler.js',
                'SecurityConfigManager.js',
                'SecurityMonitor.js',
                'StaticHostingCompatibilityLayer.js'
            ];

            for (const file of expectedFiles) {
                if (!securityFiles.includes(file)) {
                    throw new Error(`Missing security module: ${file}`);
                }
            }

            this.addTestResult(testName, true, `All ${expectedFiles.length} security modules in correct location`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * 測試安全模組檔案是否存在且可讀取
     */
    async testSecurityModulesExist() {
        const testName = 'Security Modules Accessibility';
        
        try {
            const coreModules = [
                'SecurityInputHandler.js',
                'SecurityDataHandler.js',
                'SecurityAuthHandler.js'
            ];

            const optionalModules = [
                'SecurityConfigManager.js',
                'SecurityMonitor.js',
                'StaticHostingCompatibilityLayer.js'
            ];

            let accessibleCount = 0;
            const totalModules = coreModules.length + optionalModules.length;

            // 測試核心模組
            for (const module of coreModules) {
                const modulePath = path.join(this.securityPath, module);
                if (fs.existsSync(modulePath) && fs.statSync(modulePath).isFile()) {
                    accessibleCount++;
                } else {
                    throw new Error(`Core module not accessible: ${module}`);
                }
            }

            // 測試可選模組
            for (const module of optionalModules) {
                const modulePath = path.join(this.securityPath, module);
                if (fs.existsSync(modulePath) && fs.statSync(modulePath).isFile()) {
                    accessibleCount++;
                }
            }

            this.addTestResult(testName, true, `${accessibleCount}/${totalModules} modules accessible`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * 測試 HTML 文件中的路徑引用是否正確
     */
    async testHtmlReferences() {
        const testName = 'HTML Path References';
        
        try {
            if (!fs.existsSync(this.htmlPath)) {
                throw new Error('HTML file does not exist');
            }

            const htmlContent = fs.readFileSync(this.htmlPath, 'utf8');

            // 檢查正確的路徑引用
            const correctPaths = [
                './src/security/SecurityInputHandler.js',
                './src/security/SecurityDataHandler.js',
                './src/security/SecurityAuthHandler.js'
            ];

            let correctReferences = 0;
            for (const correctPath of correctPaths) {
                if (htmlContent.includes(correctPath)) {
                    correctReferences++;
                } else {
                    throw new Error(`Missing correct reference: ${correctPath}`);
                }
            }

            // 檢查不應該存在的錯誤路徑
            const incorrectPatterns = [
                './src/security/scripts/SecurityInputHandler.js',
                './src/security/scripts/SecurityDataHandler.js',
                './src/security/scripts/SecurityAuthHandler.js'
            ];

            for (const incorrectPath of incorrectPatterns) {
                if (htmlContent.includes(incorrectPath)) {
                    throw new Error(`Found incorrect reference: ${incorrectPath}`);
                }
            }

            this.addTestResult(testName, true, `${correctReferences}/3 correct references found, no incorrect references`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * 測試確保沒有 scripts 子目錄的殘留引用
     */
    async testNoScriptsSubdirectory() {
        const testName = 'No Scripts Subdirectory References';
        
        try {
            const htmlContent = fs.readFileSync(this.htmlPath, 'utf8');
            
            // 檢查是否有 security/scripts/ 的引用
            const securityScriptsPattern = /src\/security\/scripts\//g;
            const matches = htmlContent.match(securityScriptsPattern);
            
            if (matches && matches.length > 0) {
                throw new Error(`Found ${matches.length} references to security/scripts/ subdirectory`);
            }

            // 檢查 assets/scripts/ 引用是否正常（這些應該保留）
            const assetsScriptsPattern = /assets\/scripts\//g;
            const assetsMatches = htmlContent.match(assetsScriptsPattern);
            const expectedAssetsReferences = 3; // bilingual-common.js, qrcode.min.js, qr-utils.js

            if (!assetsMatches || assetsMatches.length < expectedAssetsReferences) {
                console.warn(`⚠️  Warning: Expected ${expectedAssetsReferences} assets/scripts references, found ${assetsMatches ? assetsMatches.length : 0}`);
            }

            this.addTestResult(testName, true, `No security/scripts references found, ${assetsMatches ? assetsMatches.length : 0} assets/scripts references preserved`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    /**
     * 添加測試結果
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed,
            message
        });
    }

    /**
     * 打印測試結果
     */
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
            console.log('🎉 All tests passed! Security module path fix is successful.');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
            process.exit(1);
        }
    }
}

// 執行測試
if (require.main === module) {
    const validator = new SecurityPathFixValidator();
    validator.runAllTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = SecurityPathFixValidator;