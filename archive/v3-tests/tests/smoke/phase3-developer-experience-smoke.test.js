/**
 * Phase 3 Developer Experience - 煙霧測試
 * 驗證調試面板、API 文件和可重用函式庫的完整性
 * 
 * 測試範圍：
 * - DEV-01: 內建調試面板功能
 * - DEV-02: API 文件完整性
 * - DEV-03: 可重用函式庫封裝
 */

const fs = require('fs');
const path = require('path');

class Phase3DeveloperExperienceSmokeTest {
    constructor() {
        this.testResults = [];
        this.errors = [];
    }

    // 主要測試執行器
    async runAllTests() {
        console.log('🧪 Phase 3 Developer Experience - 煙霧測試開始...\n');

        try {
            await this.testDebugPanelImplementation();
            await this.testAPIDocumentation();
            await this.testReusableLibraryPackage();
            await this.testIntegrationCompleteness();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ 測試執行失敗:', error);
            process.exit(1);
        }
    }

    // DEV-01: 測試調試面板實作
    async testDebugPanelImplementation() {
        console.log('🐛 測試調試面板實作...');

        const debugPanelTests = [
            {
                name: '調試面板 JavaScript 檔案存在',
                test: () => {
                    const filePath = 'pwa-card-storage/src/debug/language-debug-panel.js';
                    return this.fileExists(filePath);
                }
            },
            {
                name: '調試面板 CSS 檔案存在',
                test: () => {
                    const filePath = 'pwa-card-storage/src/debug/debug-panel-styles.css';
                    return this.fileExists(filePath);
                }
            },
            {
                name: '調試面板類別定義正確',
                test: () => {
                    const filePath = 'pwa-card-storage/src/debug/language-debug-panel.js';
                    const content = this.readFile(filePath);
                    return content && content.includes('class LanguageDebugPanel');
                }
            },
            {
                name: '調試面板包含所需功能',
                test: () => {
                    const filePath = 'pwa-card-storage/src/debug/language-debug-panel.js';
                    const content = this.readFile(filePath);
                    const requiredFeatures = [
                        'shouldShowDebugPanel',
                        'createPanelHTML',
                        'updateOverview',
                        'updatePerformanceTab',
                        'exportDebugReport'
                    ];
                    return requiredFeatures.every(feature => content.includes(feature));
                }
            },
            {
                name: '調試面板樣式包含響應式設計',
                test: () => {
                    const filePath = 'pwa-card-storage/src/debug/debug-panel-styles.css';
                    const content = this.readFile(filePath);
                    return content && content.includes('@media (max-width: 768px)');
                }
            },
            {
                name: '調試面板支援無障礙功能',
                test: () => {
                    const filePath = 'pwa-card-storage/src/debug/debug-panel-styles.css';
                    const content = this.readFile(filePath);
                    const a11yFeatures = [
                        'role="complementary"',
                        'aria-label',
                        'prefers-reduced-motion',
                        'prefers-contrast'
                    ];
                    return a11yFeatures.some(feature => content.includes(feature));
                }
            }
        ];

        await this.runTestSuite('調試面板實作', debugPanelTests);
    }

    // DEV-02: 測試 API 文件
    async testAPIDocumentation() {
        console.log('📖 測試 API 文件完整性...');

        const apiDocTests = [
            {
                name: 'API 文件檔案存在',
                test: () => {
                    return this.fileExists('docs/api/language-management-api.md');
                }
            },
            {
                name: '最佳實踐指南存在',
                test: () => {
                    return this.fileExists('docs/guides/language-best-practices.md');
                }
            },
            {
                name: 'API 文件包含所有核心方法',
                test: () => {
                    const content = this.readFile('docs/api/language-management-api.md');
                    const coreMethods = [
                        'getText',
                        'switchLanguage',
                        'applyTranslations',
                        'getCurrentLanguage',
                        'getSupportedLanguages',
                        'validateTranslations'
                    ];
                    return coreMethods.every(method => content.includes(method));
                }
            },
            {
                name: 'API 文件包含 TypeScript 範例',
                test: () => {
                    const content = this.readFile('docs/api/language-management-api.md');
                    return content.includes('```typescript');
                }
            },
            {
                name: '最佳實踐包含安全指導',
                test: () => {
                    const content = this.readFile('docs/guides/language-best-practices.md');
                    const securityTopics = [
                        'XSS 防護',
                        'textContent',
                        'innerHTML',
                        'sanitize'
                    ];
                    return securityTopics.some(topic => content.includes(topic));
                }
            },
            {
                name: '最佳實踐包含效能指導',
                test: () => {
                    const content = this.readFile('docs/guides/language-best-practices.md');
                    const perfTopics = [
                        '效能優化',
                        '快取',
                        'DOM 更新',
                        '記憶體'
                    ];
                    return perfTopics.some(topic => content.includes(topic));
                }
            }
        ];

        await this.runTestSuite('API 文件', apiDocTests);
    }

    // DEV-03: 測試可重用函式庫封裝
    async testReusableLibraryPackage() {
        console.log('📦 測試可重用函式庫封裝...');

        const libraryTests = [
            {
                name: '函式庫 package.json 存在',
                test: () => {
                    return this.fileExists('lib/unified-language-manager/package.json');
                }
            },
            {
                name: '函式庫主要入口檔案存在',
                test: () => {
                    return this.fileExists('lib/unified-language-manager/index.js');
                }
            },
            {
                name: 'TypeScript 定義檔案存在',
                test: () => {
                    return this.fileExists('lib/unified-language-manager/types.d.ts');
                }
            },
            {
                name: '函式庫 README 存在',
                test: () => {
                    return this.fileExists('lib/unified-language-manager/README.md');
                }
            },
            {
                name: 'package.json 包含正確的元資料',
                test: () => {
                    const packageJson = this.readJsonFile('lib/unified-language-manager/package.json');
                    return packageJson && 
                           packageJson.name && 
                           packageJson.version && 
                           packageJson.main &&
                           packageJson.types;
                }
            },
            {
                name: '函式庫支援 CommonJS 和 ESM',
                test: () => {
                    const packageJson = this.readJsonFile('lib/unified-language-manager/package.json');
                    return packageJson && 
                           packageJson.main &&
                           packageJson.module;
                }
            },
            {
                name: '主要類別正確匯出',
                test: () => {
                    const content = this.readFile('lib/unified-language-manager/index.js');
                    const exports = [
                        'exports.UnifiedLanguageManager',
                        'exports.SmartCache',
                        'exports.TranslationValidator',
                        'exports.PerformanceMonitor'
                    ];
                    return exports.every(exp => content.includes(exp));
                }
            },
            {
                name: 'TypeScript 定義完整',
                test: () => {
                    const content = this.readFile('lib/unified-language-manager/types.d.ts');
                    const typeDefinitions = [
                        'export type LanguageCode',
                        'export interface TranslationData',
                        'export declare class UnifiedLanguageManager',
                        'export interface PerformanceMetrics'
                    ];
                    return typeDefinitions.every(def => content.includes(def));
                }
            },
            {
                name: '框架整合支援',
                test: () => {
                    const content = this.readFile('lib/unified-language-manager/index.js');
                    const frameworks = [
                        'useLanguageManager',
                        'useLanguageManagerVue',
                        'createAngularService'
                    ];
                    return frameworks.every(fw => content.includes(fw));
                }
            }
        ];

        await this.runTestSuite('可重用函式庫', libraryTests);
    }

    // 整合完整性測試
    async testIntegrationCompleteness() {
        console.log('🔗 測試整合完整性...');

        const integrationTests = [
            {
                name: 'index.html 包含調試面板腳本',
                test: () => {
                    const content = this.readFile('pwa-card-storage/index.html');
                    return content.includes('src/debug/language-debug-panel.js');
                }
            },
            {
                name: 'index.html 包含調試面板樣式',
                test: () => {
                    const content = this.readFile('pwa-card-storage/index.html');
                    return content.includes('src/debug/debug-panel-styles.css');
                }
            },
            {
                name: '所有 Phase 1-3 組件都存在',
                test: () => {
                    const components = [
                        // Phase 1
                        'pwa-card-storage/src/core/language-manager.d.ts',
                        'pwa-card-storage/src/core/enhanced-language-manager.d.ts',
                        'pwa-card-storage/src/core/translation-validator.js',
                        // Phase 2
                        'pwa-card-storage/src/core/performance-metrics-collector.js',
                        'pwa-card-storage/src/core/smart-cache-manager.js',
                        'pwa-card-storage/src/core/incremental-dom-updater.js',
                        // Phase 3
                        'pwa-card-storage/src/debug/language-debug-panel.js',
                        'docs/api/language-management-api.md',
                        'lib/unified-language-manager/index.js'
                    ];
                    
                    return components.every(component => this.fileExists(component));
                }
            },
            {
                name: '文件結構符合預期',
                test: () => {
                    const expectedDirs = [
                        'pwa-card-storage/src/debug',
                        'docs/api',
                        'docs/guides',
                        'lib/unified-language-manager'
                    ];
                    
                    return expectedDirs.every(dir => this.directoryExists(dir));
                }
            }
        ];

        await this.runTestSuite('整合完整性', integrationTests);
    }

    // 輔助方法
    async runTestSuite(suiteName, tests) {
        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                const result = await test.test();
                if (result) {
                    console.log(`  ✅ ${test.name}`);
                    passed++;
                } else {
                    console.log(`  ❌ ${test.name}`);
                    failed++;
                    this.errors.push(`${suiteName}: ${test.name}`);
                }
            } catch (error) {
                console.log(`  ❌ ${test.name} - 錯誤: ${error.message}`);
                failed++;
                this.errors.push(`${suiteName}: ${test.name} - ${error.message}`);
            }
        }

        this.testResults.push({
            suite: suiteName,
            passed,
            failed,
            total: tests.length
        });

        console.log(`  📊 ${suiteName}: ${passed}/${tests.length} 通過\n`);
    }

    fileExists(filePath) {
        try {
            return fs.existsSync(path.resolve(filePath));
        } catch {
            return false;
        }
    }

    directoryExists(dirPath) {
        try {
            const stats = fs.statSync(path.resolve(dirPath));
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    readFile(filePath) {
        try {
            return fs.readFileSync(path.resolve(filePath), 'utf8');
        } catch {
            return null;
        }
    }

    readJsonFile(filePath) {
        try {
            const content = this.readFile(filePath);
            return content ? JSON.parse(content) : null;
        } catch {
            return null;
        }
    }

    printResults() {
        console.log('📋 Phase 3 煙霧測試結果總結:');
        console.log('='.repeat(50));

        let totalPassed = 0;
        let totalTests = 0;

        this.testResults.forEach(result => {
            totalPassed += result.passed;
            totalTests += result.total;
            
            const passRate = ((result.passed / result.total) * 100).toFixed(1);
            const status = result.failed === 0 ? '✅' : '⚠️';
            
            console.log(`${status} ${result.suite}: ${result.passed}/${result.total} (${passRate}%)`);
        });

        const overallPassRate = ((totalPassed / totalTests) * 100).toFixed(1);
        console.log('='.repeat(50));
        console.log(`🎯 整體結果: ${totalPassed}/${totalTests} (${overallPassRate}%)`);

        if (this.errors.length > 0) {
            console.log('\n❌ 失敗的測試:');
            this.errors.forEach(error => console.log(`   - ${error}`));
        }

        if (totalPassed === totalTests) {
            console.log('\n🎉 所有測試通過！Phase 3 開發者體驗實作完成。');
        } else {
            console.log(`\n⚠️ ${this.errors.length} 個測試失敗，請檢查上述項目。`);
        }

        console.log('\n📈 Phase 3 功能狀態:');
        console.log('  🐛 DEV-01: 內建調試面板 - ' + (this.testResults[0]?.failed === 0 ? '✅ 完成' : '❌ 需修復'));
        console.log('  📖 DEV-02: API 文件 - ' + (this.testResults[1]?.failed === 0 ? '✅ 完成' : '❌ 需修復'));
        console.log('  📦 DEV-03: 可重用函式庫 - ' + (this.testResults[2]?.failed === 0 ? '✅ 完成' : '❌ 需修復'));
        console.log('  🔗 整合完整性 - ' + (this.testResults[3]?.failed === 0 ? '✅ 完成' : '❌ 需修復'));

        // 返回測試是否完全通過
        return totalPassed === totalTests;
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    const tester = new Phase3DeveloperExperienceSmokeTest();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = Phase3DeveloperExperienceSmokeTest;