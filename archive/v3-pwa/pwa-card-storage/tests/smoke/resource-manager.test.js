/**
 * ResourceManager Smoke Tests
 * 
 * 資源管理系統的煙霧測試，驗證核心功能正常運作
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

import { ResourceManager } from '../../src/core/resource-manager.js';
import { ResourceCopier } from '../../src/utils/resource-copier.js';
import { SRIGenerator } from '../../src/utils/sri-generator.js';
import { ResourceManifest } from '../../src/utils/resource-manifest.js';

/**
 * 煙霧測試套件
 */
export class ResourceManagerSmokeTests {
    constructor() {
        this.testResults = [];
        this.resourceManager = new ResourceManager();
    }

    /**
     * 執行所有煙霧測試
     * @returns {Promise<Object>} 測試結果
     */
    async runAllTests() {
        console.log('🧪 [ResourceManager] 開始執行煙霧測試...');
        
        const startTime = Date.now();
        this.testResults = [];

        // 核心功能測試
        await this.testResourceManagerCreation();
        await this.testResourceDiscovery();
        await this.testResourceCopying();
        await this.testSRIGeneration();
        await this.testManifestCreation();
        await this.testIntegrityValidation();
        await this.testFullIntegrationWorkflow();

        // 安全性測試
        await this.testSecurityValidation();
        await this.testPathTraversalPrevention();
        await this.testFileTypeValidation();

        // 效能測試
        await this.testPerformanceBaseline();

        const endTime = Date.now();
        const duration = endTime - startTime;

        const summary = this.generateTestSummary(duration);
        console.log('✅ [ResourceManager] 煙霧測試完成');
        
        return summary;
    }

    /**
     * 測試 ResourceManager 建立
     */
    async testResourceManagerCreation() {
        try {
            const manager = new ResourceManager();
            
            this.assert(
                manager instanceof ResourceManager,
                'ResourceManager 實例建立成功'
            );
            
            this.assert(
                manager.copier instanceof ResourceCopier,
                'ResourceCopier 組件初始化成功'
            );
            
            this.assert(
                manager.sriGenerator instanceof SRIGenerator,
                'SRIGenerator 組件初始化成功'
            );
            
            this.assert(
                manager.manifest instanceof ResourceManifest,
                'ResourceManifest 組件初始化成功'
            );

        } catch (error) {
            this.recordFailure('ResourceManager 建立測試', error);
        }
    }

    /**
     * 測試資源發現功能
     */
    async testResourceDiscovery() {
        try {
            const resources = await this.resourceManager.discoverRequiredResources();
            
            this.assert(
                Array.isArray(resources),
                '資源發現回傳陣列'
            );
            
            this.assert(
                resources.length > 0,
                '發現必要資源'
            );
            
            // 檢查核心資源是否存在
            const coreResources = ['moda-logo.svg', 'bilingual-common.js', 'high-accessibility.css'];
            for (const coreResource of coreResources) {
                const found = resources.some(r => r.source.includes(coreResource));
                this.assert(found, `核心資源存在: ${coreResource}`);
            }

        } catch (error) {
            this.recordFailure('資源發現測試', error);
        }
    }

    /**
     * 測試資源複製功能
     */
    async testResourceCopying() {
        try {
            const copier = new ResourceCopier();
            const mockResources = [
                {
                    source: '../../assets/moda-logo.svg',
                    destination: 'assets/moda-logo.svg',
                    type: 'image',
                    critical: true
                }
            ];
            
            const result = await copier.copyResources(mockResources);
            
            this.assert(
                result.success.length > 0,
                '資源複製成功'
            );
            
            this.assert(
                result.success[0].copiedPath === 'assets/moda-logo.svg',
                '複製路徑正確'
            );

        } catch (error) {
            this.recordFailure('資源複製測試', error);
        }
    }

    /**
     * 測試 SRI Hash 生成
     */
    async testSRIGeneration() {
        try {
            const sriGenerator = new SRIGenerator();
            const mockResources = [
                {
                    destination: 'assets/test-file.js',
                    type: 'script'
                }
            ];
            
            const results = await sriGenerator.generateHashes(mockResources);
            
            this.assert(
                results.length > 0,
                'SRI Hash 生成成功'
            );
            
            this.assert(
                results[0].integrity && results[0].integrity.startsWith('sha384-'),
                'SRI Hash 格式正確'
            );

        } catch (error) {
            this.recordFailure('SRI 生成測試', error);
        }
    }

    /**
     * 測試資源清單建立
     */
    async testManifestCreation() {
        try {
            const manifest = new ResourceManifest();
            const mockResources = [
                {
                    destination: 'assets/test.js',
                    type: 'script',
                    critical: true,
                    integrity: 'sha384-test123',
                    size: 1024
                }
            ];
            
            const result = await manifest.createManifest(mockResources);
            
            this.assert(
                result.success === true,
                '資源清單建立成功'
            );
            
            this.assert(
                result.resourceCount === 1,
                '資源數量正確'
            );

        } catch (error) {
            this.recordFailure('清單建立測試', error);
        }
    }

    /**
     * 測試完整性驗證
     */
    async testIntegrityValidation() {
        try {
            const result = await this.resourceManager.validateIntegrity();
            
            this.assert(
                typeof result.valid === 'boolean',
                '完整性驗證回傳布林值'
            );
            
            this.assert(
                Array.isArray(result.results),
                '驗證結果包含詳細資訊'
            );

        } catch (error) {
            this.recordFailure('完整性驗證測試', error);
        }
    }

    /**
     * 測試完整整合流程
     */
    async testFullIntegrationWorkflow() {
        try {
            const result = await this.resourceManager.integrateResources();
            
            this.assert(
                typeof result.success === 'boolean',
                '整合流程回傳結果'
            );
            
            this.assert(
                result.timestamp,
                '包含時間戳記'
            );
            
            if (result.success) {
                this.assert(
                    result.resourcesProcessed >= 0,
                    '處理資源數量記錄'
                );
            }

        } catch (error) {
            this.recordFailure('完整整合流程測試', error);
        }
    }

    /**
     * 測試安全性驗證
     */
    async testSecurityValidation() {
        try {
            const copier = new ResourceCopier();
            
            // 測試惡意檔案類型
            const maliciousResource = {
                source: '../../malicious.exe',
                destination: 'assets/malicious.exe',
                type: 'executable'
            };
            
            const securityCheck = copier.validateResourceSecurity(maliciousResource);
            
            this.assert(
                !securityCheck.valid,
                '惡意檔案類型被阻擋'
            );

        } catch (error) {
            this.recordFailure('安全性驗證測試', error);
        }
    }

    /**
     * 測試路徑遍歷防護
     */
    async testPathTraversalPrevention() {
        try {
            const copier = new ResourceCopier();
            
            // 測試路徑遍歷攻擊
            const traversalResource = {
                source: '../../../../../../etc/passwd',
                destination: '../../../sensitive.txt',
                type: 'text'
            };
            
            const securityCheck = copier.validateResourceSecurity(traversalResource);
            
            this.assert(
                !securityCheck.valid,
                '路徑遍歷攻擊被阻擋'
            );

        } catch (error) {
            this.recordFailure('路徑遍歷防護測試', error);
        }
    }

    /**
     * 測試檔案類型驗證
     */
    async testFileTypeValidation() {
        try {
            const copier = new ResourceCopier();
            
            // 測試允許的檔案類型
            const validResource = {
                source: '../../assets/test.svg',
                destination: 'assets/test.svg',
                type: 'image'
            };
            
            const validCheck = copier.validateResourceSecurity(validResource);
            
            this.assert(
                validCheck.valid,
                '有效檔案類型通過驗證'
            );

        } catch (error) {
            this.recordFailure('檔案類型驗證測試', error);
        }
    }

    /**
     * 測試效能基準
     */
    async testPerformanceBaseline() {
        try {
            const startTime = Date.now();
            
            // 執行基本整合流程
            await this.resourceManager.integrateResources();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.assert(
                duration < 5000, // 5 秒內完成
                `效能基準測試通過 (${duration}ms < 5000ms)`
            );

        } catch (error) {
            this.recordFailure('效能基準測試', error);
        }
    }

    /**
     * 斷言輔助函數
     * @param {boolean} condition 條件
     * @param {string} message 訊息
     */
    assert(condition, message) {
        if (condition) {
            this.recordSuccess(message);
        } else {
            this.recordFailure(message, new Error('斷言失敗'));
        }
    }

    /**
     * 記錄成功測試
     * @param {string} testName 測試名稱
     */
    recordSuccess(testName) {
        this.testResults.push({
            name: testName,
            status: 'PASS',
            timestamp: new Date().toISOString()
        });
        console.log(`✅ ${testName}`);
    }

    /**
     * 記錄失敗測試
     * @param {string} testName 測試名稱
     * @param {Error} error 錯誤物件
     */
    recordFailure(testName, error) {
        this.testResults.push({
            name: testName,
            status: 'FAIL',
            error: error.message,
            timestamp: new Date().toISOString()
        });
        console.error(`❌ ${testName}: ${error.message}`);
    }

    /**
     * 生成測試摘要
     * @param {number} duration 執行時間
     * @returns {Object} 測試摘要
     */
    generateTestSummary(duration) {
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;
        
        return {
            summary: {
                total,
                passed,
                failed,
                passRate: total > 0 ? (passed / total * 100).toFixed(1) : 0,
                duration: `${duration}ms`
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
    }
}

// 提供便利的測試執行函數
export async function runResourceManagerSmokeTests() {
    const testSuite = new ResourceManagerSmokeTests();
    return await testSuite.runAllTests();
}

// 如果直接執行此檔案，自動運行測試
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
    runResourceManagerSmokeTests().then(results => {
        console.log('🎯 ResourceManager 煙霧測試結果:', results);
    });
}