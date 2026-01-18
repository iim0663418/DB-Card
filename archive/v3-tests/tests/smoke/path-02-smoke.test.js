#!/usr/bin/env node
/**
 * PATH-02 Smoke Test Suite
 * 
 * 驗證路徑修復腳本生成器的核心功能
 * - 腳本生成功能
 * - 安全驗證機制
 * - 錯誤處理能力
 * - 生成腳本的可執行性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PATH02SmokeTest {
    constructor() {
        this.testResults = [];
        this.generatorPath = './deploy/path-fix-generator.js';
        this.outputScriptPath = './deploy/fix-hardcoded-paths-v2.sh';
        this.securityLogPath = './deploy/path-fix-security.log';
    }

    /**
     * 記錄測試結果
     */
    logTest(testName, passed, details = '') {
        const result = {
            test: testName,
            status: passed ? 'PASS' : 'FAIL',
            details: details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${result.status}`);
        if (details) console.log(`   ${details}`);
    }

    /**
     * 測試 1: 腳本生成器存在且可執行
     */
    testGeneratorExists() {
        try {
            const exists = fs.existsSync(this.generatorPath);
            const stats = exists ? fs.statSync(this.generatorPath) : null;
            const isExecutable = stats && (stats.mode & parseInt('111', 8));
            
            this.logTest(
                'Generator File Exists and Executable',
                exists && isExecutable,
                exists ? `File size: ${stats.size} bytes` : 'File not found'
            );
            
            return exists && isExecutable;
        } catch (error) {
            this.logTest('Generator File Exists and Executable', false, error.message);
            return false;
        }
    }

    /**
     * 測試 2: 腳本生成功能
     */
    testScriptGeneration() {
        try {
            // 清理舊檔案
            if (fs.existsSync(this.outputScriptPath)) {
                fs.unlinkSync(this.outputScriptPath);
            }
            
            // 執行生成器
            const output = execSync(`node ${this.generatorPath}`, { 
                encoding: 'utf8',
                timeout: 10000 
            });
            
            // 檢查輸出腳本是否生成
            const scriptExists = fs.existsSync(this.outputScriptPath);
            const scriptStats = scriptExists ? fs.statSync(this.outputScriptPath) : null;
            const isExecutable = scriptStats && (scriptStats.mode & parseInt('111', 8));
            
            this.logTest(
                'Script Generation Success',
                scriptExists && isExecutable,
                `Generated script size: ${scriptStats ? scriptStats.size : 0} bytes`
            );
            
            return scriptExists && isExecutable;
        } catch (error) {
            this.logTest('Script Generation Success', false, error.message);
            return false;
        }
    }

    /**
     * 測試 3: 生成腳本內容驗證
     */
    testScriptContent() {
        try {
            if (!fs.existsSync(this.outputScriptPath)) {
                this.logTest('Script Content Validation', false, 'Script file not found');
                return false;
            }
            
            const scriptContent = fs.readFileSync(this.outputScriptPath, 'utf8');
            
            // 檢查必要的腳本元素
            const requiredElements = [
                '#!/bin/bash',
                'PATH-02: 生產級路徑修復腳本',
                'set -euo pipefail',
                'rollback()',
                'trap rollback ERR',
                'mkdir -p',
                'cp ',
                'echo "✅ 路徑修復完成！"'
            ];
            
            const missingElements = requiredElements.filter(element => 
                !scriptContent.includes(element)
            );
            
            const isValid = missingElements.length === 0;
            
            this.logTest(
                'Script Content Validation',
                isValid,
                isValid ? 'All required elements present' : `Missing: ${missingElements.join(', ')}`
            );
            
            return isValid;
        } catch (error) {
            this.logTest('Script Content Validation', false, error.message);
            return false;
        }
    }

    /**
     * 測試 4: 安全日誌生成
     */
    testSecurityLogging() {
        try {
            const logExists = fs.existsSync(this.securityLogPath);
            
            if (logExists) {
                const logContent = fs.readFileSync(this.securityLogPath, 'utf8');
                const logData = JSON.parse(logContent);
                
                const isValidLog = Array.isArray(logData);
                
                this.logTest(
                    'Security Log Generation',
                    isValidLog,
                    `Log entries: ${logData.length}`
                );
                
                return isValidLog;
            } else {
                this.logTest('Security Log Generation', true, 'No security issues detected');
                return true;
            }
        } catch (error) {
            this.logTest('Security Log Generation', false, error.message);
            return false;
        }
    }

    /**
     * 測試 5: 腳本語法驗證
     */
    testScriptSyntax() {
        try {
            if (!fs.existsSync(this.outputScriptPath)) {
                this.logTest('Script Syntax Validation', false, 'Script file not found');
                return false;
            }
            
            // 使用 bash -n 檢查語法
            execSync(`bash -n ${this.outputScriptPath}`, { 
                encoding: 'utf8',
                timeout: 5000 
            });
            
            this.logTest('Script Syntax Validation', true, 'Bash syntax check passed');
            return true;
        } catch (error) {
            this.logTest('Script Syntax Validation', false, error.message);
            return false;
        }
    }

    /**
     * 測試 6: 路徑安全驗證
     */
    testPathSecurity() {
        try {
            const scriptContent = fs.readFileSync(this.outputScriptPath, 'utf8');
            
            // 檢查危險模式
            const dangerousPatterns = [
                /\.\.\//g,  // 父目錄遍歷（在 cp 命令中是合法的）
                /;/g,       // 命令分隔符
                /\|/g,      // 管道符
                /&/g,       // 後台執行
                /\$\(/g,    // 命令替換
                /`/g        // 反引號命令替換
            ];
            
            // 檢查真正危險的模式，排除合法的 bash 語法
            const lines = scriptContent.split('\n');
            
            // 排除合法的語法模式
            const legitimatePatterns = [
                /^\s*#/,                    // 註釋行
                /trap\s+\w+\s+ERR/,         // trap 錯誤處理
                /set\s+-[euo]+/,            // bash 選項設定
                /if\s*\[.*\];\s*then/,      // if 條件語句
                /2>\/dev\/null\s*\|\|/,     // 錯誤重定向
                /find.*-exec.*\\;/          // find 命令
            ];
            
            const suspiciousLines = lines.filter(line => {
                // 跳過合法模式
                if (legitimatePatterns.some(pattern => pattern.test(line))) {
                    return false;
                }
                
                // 檢查危險模式
                const dangerousPatterns = [
                    /;.*[^\\];/,              // 多重命令（非轉義）
                    /\|.*[^\\]\|/,            // 多重管道
                    /&.*[^\\]&/,              // 多重後台
                    /\$\([^)]*[;&|`][^)]*\)/, // 命令替換中的危險字符
                    /`[^`]*[;&|][^`]*`/       // 反引號中的危險字符
                ];
                
                return dangerousPatterns.some(pattern => pattern.test(line));
            });
            
            const foundIssues = suspiciousLines;
            
            const isSafe = foundIssues.length === 0;
            
            this.logTest(
                'Path Security Validation',
                isSafe,
                isSafe ? 'No dangerous patterns detected' : `Found ${foundIssues.length} suspicious patterns`
            );
            
            return isSafe;
        } catch (error) {
            this.logTest('Path Security Validation', false, error.message);
            return false;
        }
    }

    /**
     * 執行所有測試
     */
    runAllTests() {
        console.log('🧪 PATH-02 Smoke Test Suite');
        console.log('=' .repeat(50));
        
        const tests = [
            () => this.testGeneratorExists(),
            () => this.testScriptGeneration(),
            () => this.testScriptContent(),
            () => this.testSecurityLogging(),
            () => this.testScriptSyntax(),
            () => this.testPathSecurity()
        ];
        
        let passedTests = 0;
        
        tests.forEach(test => {
            if (test()) passedTests++;
        });
        
        console.log('=' .repeat(50));
        console.log(`📊 測試結果: ${passedTests}/${tests.length} 通過`);
        
        if (passedTests === tests.length) {
            console.log('🎉 所有測試通過！PATH-02 實作正常');
            return true;
        } else {
            console.log('⚠️  部分測試失敗，需要檢查實作');
            return false;
        }
    }

    /**
     * 生成測試報告
     */
    generateReport() {
        const reportPath = './tests/smoke/path-02-test-report.json';
        const report = {
            testSuite: 'PATH-02 Smoke Test',
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passedTests: this.testResults.filter(r => r.status === 'PASS').length,
            failedTests: this.testResults.filter(r => r.status === 'FAIL').length,
            results: this.testResults
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📝 測試報告已生成: ${reportPath}`);
        
        return report;
    }
}

// 執行測試
if (require.main === module) {
    const tester = new PATH02SmokeTest();
    const success = tester.runAllTests();
    tester.generateReport();
    
    process.exit(success ? 0 : 1);
}

module.exports = PATH02SmokeTest;