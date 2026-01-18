#!/usr/bin/env node

/**
 * SECURITY-01 Smoke Test Suite
 * 驗證安全模組選擇與複製功能
 */

const fs = require('fs');
const path = require('path');

class Security01SmokeTest {
    constructor() {
        this.testResults = [];
        this.pwaSrcDir = path.join(__dirname, '..', '..', 'pwa-card-storage', 'src', 'security');
        this.scriptsDir = path.join(this.pwaSrcDir, 'scripts');
        this.reportPath = path.join(__dirname, '..', '..', 'deploy', 'security-module-selection-report.json');
        
        this.expectedCoreModules = [
            'SecurityInputHandler.js',
            'SecurityDataHandler.js', 
            'SecurityAuthHandler.js'
        ];
        
        this.expectedOptionalModules = [
            'SecurityMonitor.js',
            'StaticHostingCompatibilityLayer.js'
        ];
    }

    async runAllTests() {
        console.log('🧪 SECURITY-01 煙霧測試開始...\n');
        
        try {
            await this.testModuleSelection();
            await this.testCoreModulesCopied();
            await this.testOptionalModulesCopied();
            await this.testFileIntegrity();
            await this.testModuleFunctionality();
            await this.testSecurityFeatures();
            await this.testDependencyResolution();
            await this.testSelectionReport();
            
            this.printTestSummary();
            return this.testResults.every(test => test.passed);
            
        } catch (error) {
            console.error('❌ 測試執行失敗:', error.message);
            return false;
        }
    }

    async testModuleSelection() {
        const testName = '模組選擇邏輯驗證';
        
        try {
            const totalSelected = this.expectedCoreModules.length + this.expectedOptionalModules.length;
            const actualFiles = this.getAllSecurityFiles();
            
            const passed = actualFiles.length === totalSelected;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? `正確選擇了 ${totalSelected} 個模組`
                    : `期望 ${totalSelected} 個模組，實際 ${actualFiles.length} 個`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testCoreModulesCopied() {
        const testName = '核心模組複製驗證';
        
        try {
            const missingModules = [];
            
            for (const module of this.expectedCoreModules) {
                const modulePath = path.join(this.scriptsDir, module);
                if (!fs.existsSync(modulePath)) {
                    missingModules.push(module);
                }
            }
            
            const passed = missingModules.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有核心模組已正確複製到 scripts 目錄'
                    : `缺少核心模組: ${missingModules.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testOptionalModulesCopied() {
        const testName = '可選模組複製驗證';
        
        try {
            const missingModules = [];
            
            for (const module of this.expectedOptionalModules) {
                const modulePath = path.join(this.pwaSrcDir, module);
                if (!fs.existsSync(modulePath)) {
                    missingModules.push(module);
                }
            }
            
            const passed = missingModules.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有可選模組已正確複製'
                    : `缺少可選模組: ${missingModules.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testFileIntegrity() {
        const testName = '檔案完整性驗證';
        
        try {
            const integrityIssues = [];
            const allModules = [...this.expectedCoreModules, ...this.expectedOptionalModules];
            
            for (const module of allModules) {
                const isCore = this.expectedCoreModules.includes(module);
                const modulePath = isCore 
                    ? path.join(this.scriptsDir, module)
                    : path.join(this.pwaSrcDir, module);
                
                if (fs.existsSync(modulePath)) {
                    const content = fs.readFileSync(modulePath, 'utf8');
                    
                    const className = module.replace('.js', '');
                    const hasClass = content.includes(`class ${className}`);
                    const hasExport = content.includes(`window.${className}`);
                    
                    if (!hasClass) {
                        integrityIssues.push(`${module}: 缺少類別定義`);
                    }
                    if (!hasExport) {
                        integrityIssues.push(`${module}: 缺少全域匯出`);
                    }
                }
            }
            
            const passed = integrityIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有模組檔案完整性正確'
                    : `完整性問題: ${integrityIssues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testModuleFunctionality() {
        const testName = '模組功能性驗證';
        
        try {
            const functionalityIssues = [];
            
            const inputHandlerPath = path.join(this.scriptsDir, 'SecurityInputHandler.js');
            if (fs.existsSync(inputHandlerPath)) {
                const content = fs.readFileSync(inputHandlerPath, 'utf8');
                if (!content.includes('validateAndSanitize')) {
                    functionalityIssues.push('SecurityInputHandler: 缺少 validateAndSanitize 方法');
                }
                if (!content.includes('securePrompt')) {
                    functionalityIssues.push('SecurityInputHandler: 缺少 securePrompt 方法');
                }
            }
            
            const dataHandlerPath = path.join(this.scriptsDir, 'SecurityDataHandler.js');
            if (fs.existsSync(dataHandlerPath)) {
                const content = fs.readFileSync(dataHandlerPath, 'utf8');
                if (!content.includes('sanitizeOutput')) {
                    functionalityIssues.push('SecurityDataHandler: 缺少 sanitizeOutput 方法');
                }
                if (!content.includes('secureStorage')) {
                    functionalityIssues.push('SecurityDataHandler: 缺少 secureStorage 方法');
                }
            }
            
            const authHandlerPath = path.join(this.scriptsDir, 'SecurityAuthHandler.js');
            if (fs.existsSync(authHandlerPath)) {
                const content = fs.readFileSync(authHandlerPath, 'utf8');
                if (!content.includes('validateAccess')) {
                    functionalityIssues.push('SecurityAuthHandler: 缺少 validateAccess 方法');
                }
                if (!content.includes('authenticateWithWebAuthn')) {
                    functionalityIssues.push('SecurityAuthHandler: 缺少 authenticateWithWebAuthn 方法');
                }
            }
            
            const passed = functionalityIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有模組核心功能完整'
                    : `功能問題: ${functionalityIssues.join(', ')}`
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
        const testName = '安全特性驗證';
        
        try {
            const securityIssues = [];
            const allModules = [...this.expectedCoreModules, ...this.expectedOptionalModules];
            
            for (const module of allModules) {
                const isCore = this.expectedCoreModules.includes(module);
                const modulePath = isCore 
                    ? path.join(this.scriptsDir, module)
                    : path.join(this.pwaSrcDir, module);
                
                if (fs.existsSync(modulePath)) {
                    const content = fs.readFileSync(modulePath, 'utf8');
                    
                    const innerHTMLMatches = content.match(/\.innerHTML\s*=/g);
                    if (innerHTMLMatches) {
                        const hasUnsafeUsage = innerHTMLMatches.some(match => {
                            const matchIndex = content.indexOf(match);
                            const contextBefore = content.substring(Math.max(0, matchIndex - 100), matchIndex);
                            const contextAfter = content.substring(matchIndex, matchIndex + 100);
                            const context = contextBefore + contextAfter;
                            return !context.includes('Safe innerHTML usage');
                        });
                        
                        if (hasUnsafeUsage) {
                            securityIssues.push(`${module}: 可能存在不安全的 innerHTML 使用`);
                        }
                    }
                    
                    if (content.includes('eval(')) {
                        securityIssues.push(`${module}: 包含危險的 eval 使用`);
                    }
                    
                    if (module === 'SecurityInputHandler.js' && !content.includes('sanitizeInput')) {
                        securityIssues.push(`${module}: 缺少輸入清理功能`);
                    }
                }
            }
            
            const passed = securityIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有安全特性檢查通過'
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

    async testDependencyResolution() {
        const testName = '依賴解析驗證';
        
        try {
            const dependencyIssues = [];
            
            for (const module of this.expectedCoreModules) {
                const modulePath = path.join(this.scriptsDir, module);
                if (fs.existsSync(modulePath)) {
                    const content = fs.readFileSync(modulePath, 'utf8');
                    
                    const otherModules = this.expectedCoreModules.filter(m => m !== module);
                    for (const otherModule of otherModules) {
                        const className = otherModule.replace('.js', '');
                        if (content.includes(`window.${className}`) || content.includes(`${className}.`)) {
                            const referencedPath = path.join(this.scriptsDir, otherModule);
                            if (!fs.existsSync(referencedPath)) {
                                dependencyIssues.push(`${module} 引用了不存在的模組 ${otherModule}`);
                            }
                        }
                    }
                }
            }
            
            const passed = dependencyIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '所有模組依賴正確解析'
                    : `依賴問題: ${dependencyIssues.join(', ')}`
            });
            
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                message: `測試失敗: ${error.message}`
            });
        }
    }

    async testSelectionReport() {
        const testName = '選擇報告驗證';
        
        try {
            if (!fs.existsSync(this.reportPath)) {
                this.testResults.push({
                    name: testName,
                    passed: false,
                    message: '選擇報告檔案不存在'
                });
                return;
            }
            
            const reportContent = fs.readFileSync(this.reportPath, 'utf8');
            const report = JSON.parse(reportContent);
            
            const reportIssues = [];
            
            if (!report.selectedModules || !Array.isArray(report.selectedModules)) {
                reportIssues.push('缺少 selectedModules 陣列');
            }
            
            if (!report.copyResults || !Array.isArray(report.copyResults)) {
                reportIssues.push('缺少 copyResults 陣列');
            }
            
            if (!report.summary || typeof report.summary !== 'object') {
                reportIssues.push('缺少 summary 物件');
            }
            
            if (report.selectedModules) {
                for (const coreModule of this.expectedCoreModules) {
                    if (!report.selectedModules.includes(coreModule)) {
                        reportIssues.push(`報告中缺少核心模組: ${coreModule}`);
                    }
                }
            }
            
            if (report.summary) {
                if (report.summary.selectedCount !== 5) {
                    reportIssues.push(`期望選擇 5 個模組，報告顯示 ${report.summary.selectedCount} 個`);
                }
                
                if (!report.summary.coreModulesIncluded) {
                    reportIssues.push('報告顯示核心模組不完整');
                }
            }
            
            const passed = reportIssues.length === 0;
            
            this.testResults.push({
                name: testName,
                passed,
                message: passed 
                    ? '選擇報告結構和內容正確'
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

    getAllSecurityFiles() {
        const files = [];
        
        if (fs.existsSync(this.scriptsDir)) {
            const scriptFiles = fs.readdirSync(this.scriptsDir)
                .filter(file => file.endsWith('.js'));
            files.push(...scriptFiles);
        }
        
        if (fs.existsSync(this.pwaSrcDir)) {
            const mainFiles = fs.readdirSync(this.pwaSrcDir)
                .filter(file => file.endsWith('.js'));
            files.push(...mainFiles);
        }
        
        return files;
    }

    printTestSummary() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n📊 SECURITY-01 煙霧測試結果:');
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
    const tester = new Security01SmokeTest();
    const success = await tester.runAllTests();
    
    if (success) {
        console.log('🎉 SECURITY-01 煙霧測試全部通過！');
        process.exit(0);
    } else {
        console.log('💥 SECURITY-01 煙霧測試發現問題，請檢查上述結果。');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = Security01SmokeTest;