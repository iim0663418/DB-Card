/**
 * Deployment Validation Smoke Tests
 * 
 * 部署驗證系統的煙霧測試，驗證跨平台部署驗證功能
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

import { DeploymentValidator } from '../../src/core/deployment-validator.js';
import { PlatformValidator } from '../../src/utils/platform-validator.js';
import { SecurityValidator } from '../../src/utils/security-validator.js';
import { PerformanceValidator } from '../../src/utils/performance-validator.js';
import { ReportGenerator } from '../../src/utils/report-generator.js';

/**
 * 部署驗證煙霧測試套件
 */
export class DeploymentValidationSmokeTests {
    constructor() {
        this.testResults = [];
        this.deploymentValidator = new DeploymentValidator();
    }

    /**
     * 執行所有煙霧測試
     * @returns {Promise<Object>} 測試結果
     */
    async runAllTests() {
        console.log('🧪 [Deployment Validation] 開始執行煙霧測試...');
        
        const startTime = Date.now();
        this.testResults = [];

        // 核心功能測試
        await this.testDeploymentValidatorCreation();
        await this.testPlatformDetection();
        await this.testPlatformValidation();
        await this.testSecurityValidation();
        await this.testPerformanceValidation();
        await this.testPWAValidation();
        await this.testResourceValidation();
        await this.testComplianceValidation();
        await this.testFullDeploymentValidation();

        // 報告生成測試
        await this.testReportGeneration();
        await this.testJSONReportFormat();
        await this.testHTMLReportFormat();

        // 整合測試
        await this.testCrossValidatorIntegration();
        await this.testRecommendationGeneration();

        const endTime = Date.now();
        const duration = endTime - startTime;

        const summary = this.generateTestSummary(duration);
        console.log('✅ [Deployment Validation] 煙霧測試完成');
        
        return summary;
    }

    /**
     * 測試 DeploymentValidator 建立
     */
    async testDeploymentValidatorCreation() {
        try {
            const validator = new DeploymentValidator();
            
            this.assert(
                validator instanceof DeploymentValidator,
                'DeploymentValidator 實例建立成功'
            );
            
            this.assert(
                validator.platformValidator instanceof PlatformValidator,
                'PlatformValidator 組件初始化成功'
            );
            
            this.assert(
                validator.securityValidator instanceof SecurityValidator,
                'SecurityValidator 組件初始化成功'
            );
            
            this.assert(
                validator.performanceValidator instanceof PerformanceValidator,
                'PerformanceValidator 組件初始化成功'
            );

            this.assert(
                validator.reportGenerator instanceof ReportGenerator,
                'ReportGenerator 組件初始化成功'
            );

        } catch (error) {
            this.recordFailure('DeploymentValidator 建立測試', error);
        }
    }

    /**
     * 測試平台檢測
     */
    async testPlatformDetection() {
        try {
            const platformInfo = await this.deploymentValidator.detectPlatform();
            
            this.assert(
                typeof platformInfo === 'object',
                '平台檢測回傳物件'
            );
            
            this.assert(
                typeof platformInfo.name === 'string',
                '平台名稱為字串'
            );
            
            this.assert(
                typeof platformInfo.detected === 'boolean',
                '檢測狀態為布林值'
            );

        } catch (error) {
            this.recordFailure('平台檢測測試', error);
        }
    }

    /**
     * 測試平台驗證
     */
    async testPlatformValidation() {
        try {
            const platformValidation = await this.deploymentValidator.validatePlatform();
            
            this.assert(
                typeof platformValidation === 'object',
                '平台驗證回傳物件'
            );
            
            this.assert(
                platformValidation.category === 'platform',
                '驗證類別正確'
            );
            
            this.assert(
                typeof platformValidation.passed === 'number',
                '通過數量為數字'
            );
            
            this.assert(
                typeof platformValidation.total === 'number',
                '總檢查數量為數字'
            );

            this.assert(
                Array.isArray(platformValidation.checks),
                '檢查結果為陣列'
            );

        } catch (error) {
            this.recordFailure('平台驗證測試', error);
        }
    }

    /**
     * 測試安全驗證
     */
    async testSecurityValidation() {
        try {
            const securityValidation = await this.deploymentValidator.validateSecurity();
            
            this.assert(
                typeof securityValidation === 'object',
                '安全驗證回傳物件'
            );
            
            this.assert(
                securityValidation.category === 'security',
                '驗證類別正確'
            );
            
            this.assert(
                securityValidation.priority === 'critical',
                '安全驗證為關鍵優先級'
            );

            this.assert(
                Array.isArray(securityValidation.checks),
                '安全檢查結果為陣列'
            );

        } catch (error) {
            this.recordFailure('安全驗證測試', error);
        }
    }

    /**
     * 測試效能驗證
     */
    async testPerformanceValidation() {
        try {
            const performanceValidation = await this.deploymentValidator.validatePerformance();
            
            this.assert(
                typeof performanceValidation === 'object',
                '效能驗證回傳物件'
            );
            
            this.assert(
                performanceValidation.category === 'performance',
                '驗證類別正確'
            );
            
            this.assert(
                typeof performanceValidation.score === 'number',
                '效能分數為數字'
            );

            // 檢查是否包含效能指標
            if (performanceValidation.metrics) {
                this.assert(
                    typeof performanceValidation.metrics === 'object',
                    '效能指標為物件'
                );
            }

        } catch (error) {
            this.recordFailure('效能驗證測試', error);
        }
    }

    /**
     * 測試 PWA 驗證
     */
    async testPWAValidation() {
        try {
            const pwaValidation = await this.deploymentValidator.validatePWA();
            
            this.assert(
                typeof pwaValidation === 'object',
                'PWA 驗證回傳物件'
            );
            
            this.assert(
                pwaValidation.category === 'pwa',
                '驗證類別正確'
            );
            
            this.assert(
                pwaValidation.priority === 'critical',
                'PWA 驗證為關鍵優先級'
            );

            // 檢查 PWA 特定檢查項目
            const checks = pwaValidation.checks || [];
            const pwaChecks = ['PWA 初始化', 'Service Worker 支援', 'PWA Manifest', 'HTTPS 連線'];
            
            for (const checkName of pwaChecks) {
                const hasCheck = checks.some(check => check.name === checkName);
                this.assert(
                    hasCheck,
                    `PWA 檢查包含: ${checkName}`
                );
            }

        } catch (error) {
            this.recordFailure('PWA 驗證測試', error);
        }
    }

    /**
     * 測試資源驗證
     */
    async testResourceValidation() {
        try {
            const resourceValidation = await this.deploymentValidator.validateResources();
            
            this.assert(
                typeof resourceValidation === 'object',
                '資源驗證回傳物件'
            );
            
            this.assert(
                resourceValidation.category === 'resources',
                '驗證類別正確'
            );
            
            this.assert(
                resourceValidation.priority === 'high',
                '資源驗證為高優先級'
            );

            // 檢查關鍵資源檢查
            const checks = resourceValidation.checks || [];
            const hasResourceManagerCheck = checks.some(check => check.name === '資源管理器');
            const hasIntegrityCheck = checks.some(check => check.name === '資源完整性');
            
            this.assert(
                hasResourceManagerCheck,
                '包含資源管理器檢查'
            );
            
            this.assert(
                hasIntegrityCheck,
                '包含資源完整性檢查'
            );

        } catch (error) {
            this.recordFailure('資源驗證測試', error);
        }
    }

    /**
     * 測試合規性驗證
     */
    async testComplianceValidation() {
        try {
            const complianceValidation = await this.deploymentValidator.validateCompliance();
            
            this.assert(
                typeof complianceValidation === 'object',
                '合規性驗證回傳物件'
            );
            
            this.assert(
                complianceValidation.category === 'compliance',
                '驗證類別正確'
            );
            
            this.assert(
                complianceValidation.priority === 'medium',
                '合規性驗證為中等優先級'
            );

            // 檢查合規性檢查項目
            const checks = complianceValidation.checks || [];
            const complianceChecks = ['HTML 語言屬性', 'Viewport Meta 標籤'];
            
            for (const checkName of complianceChecks) {
                const hasCheck = checks.some(check => check.name === checkName);
                this.assert(
                    hasCheck,
                    `合規性檢查包含: ${checkName}`
                );
            }

        } catch (error) {
            this.recordFailure('合規性驗證測試', error);
        }
    }

    /**
     * 測試完整部署驗證
     */
    async testFullDeploymentValidation() {
        try {
            const validationResult = await this.deploymentValidator.validateDeployment();
            
            this.assert(
                typeof validationResult === 'object',
                '完整驗證回傳物件'
            );
            
            this.assert(
                validationResult.timestamp,
                '包含時間戳記'
            );
            
            this.assert(
                validationResult.platform,
                '包含平台資訊'
            );
            
            this.assert(
                validationResult.validations,
                '包含驗證結果'
            );
            
            this.assert(
                validationResult.summary,
                '包含摘要資訊'
            );

            // 檢查摘要內容
            const summary = validationResult.summary;
            this.assert(
                typeof summary.deploymentReady === 'boolean',
                '部署就緒狀態為布林值'
            );
            
            this.assert(
                typeof summary.overallScore === 'number',
                '整體分數為數字'
            );

        } catch (error) {
            this.recordFailure('完整部署驗證測試', error);
        }
    }

    /**
     * 測試報告生成
     */
    async testReportGeneration() {
        try {
            // 先執行驗證以取得結果
            const validationResult = await this.deploymentValidator.validateDeployment();
            
            // 生成報告
            const report = await this.deploymentValidator.generateReport('json');
            
            this.assert(
                typeof report === 'object',
                '報告生成回傳物件'
            );
            
            this.assert(
                report.success === true,
                '報告生成成功'
            );
            
            this.assert(
                report.format === 'json',
                '報告格式正確'
            );
            
            this.assert(
                report.content,
                '報告包含內容'
            );

        } catch (error) {
            this.recordFailure('報告生成測試', error);
        }
    }

    /**
     * 測試 JSON 報告格式
     */
    async testJSONReportFormat() {
        try {
            const reportGenerator = new ReportGenerator();
            const mockValidationResults = {
                timestamp: new Date().toISOString(),
                platform: { name: 'test', detected: true },
                validations: {
                    security: {
                        category: 'security',
                        priority: 'critical',
                        passed: 2,
                        total: 3,
                        score: 67,
                        checks: [
                            { name: 'HTTPS', passed: true, message: 'HTTPS 已啟用' },
                            { name: 'CSP', passed: false, message: 'CSP 未配置' }
                        ]
                    }
                },
                summary: {
                    deploymentReady: false,
                    overallScore: 75,
                    totalChecks: 10,
                    totalPassed: 7
                },
                recommendations: []
            };

            const jsonReport = await reportGenerator.generate(mockValidationResults, 'json');
            
            this.assert(
                jsonReport.success === true,
                'JSON 報告生成成功'
            );
            
            this.assert(
                jsonReport.format === 'json',
                'JSON 報告格式正確'
            );
            
            this.assert(
                jsonReport.content.meta,
                'JSON 報告包含 meta 資訊'
            );
            
            this.assert(
                jsonReport.content.summary,
                'JSON 報告包含摘要'
            );

        } catch (error) {
            this.recordFailure('JSON 報告格式測試', error);
        }
    }

    /**
     * 測試 HTML 報告格式
     */
    async testHTMLReportFormat() {
        try {
            const reportGenerator = new ReportGenerator();
            const mockValidationResults = {
                timestamp: new Date().toISOString(),
                platform: { name: 'test', detected: true },
                validations: {
                    security: {
                        category: 'security',
                        priority: 'critical',
                        passed: 2,
                        total: 3,
                        score: 67,
                        checks: [
                            { name: 'HTTPS', passed: true, message: 'HTTPS 已啟用' }
                        ]
                    }
                },
                summary: {
                    deploymentReady: true,
                    overallScore: 85
                },
                recommendations: []
            };

            const htmlReport = await reportGenerator.generate(mockValidationResults, 'html');
            
            this.assert(
                htmlReport.success === true,
                'HTML 報告生成成功'
            );
            
            this.assert(
                htmlReport.format === 'html',
                'HTML 報告格式正確'
            );
            
            this.assert(
                typeof htmlReport.content === 'string',
                'HTML 報告內容為字串'
            );
            
            this.assert(
                htmlReport.content.includes('<!DOCTYPE html>'),
                'HTML 報告包含有效的 HTML 結構'
            );

        } catch (error) {
            this.recordFailure('HTML 報告格式測試', error);
        }
    }

    /**
     * 測試跨驗證器整合
     */
    async testCrossValidatorIntegration() {
        try {
            // 測試各驗證器是否能正常協作
            const platformValidator = new PlatformValidator();
            const securityValidator = new SecurityValidator();
            const performanceValidator = new PerformanceValidator();

            // 檢查平台驗證器
            const platformResult = await platformValidator.validate('github-pages');
            this.assert(
                typeof platformResult.score === 'number',
                '平台驗證器回傳分數'
            );

            // 檢查安全驗證器
            const securityResult = await securityValidator.validate();
            this.assert(
                Array.isArray(securityResult.checks),
                '安全驗證器回傳檢查結果'
            );

            // 檢查效能驗證器
            const performanceResult = await performanceValidator.validate();
            this.assert(
                typeof performanceResult.score === 'number',
                '效能驗證器回傳分數'
            );

        } catch (error) {
            this.recordFailure('跨驗證器整合測試', error);
        }
    }

    /**
     * 測試建議生成
     */
    async testRecommendationGeneration() {
        try {
            // 執行完整驗證
            const validationResult = await this.deploymentValidator.validateDeployment();
            
            this.assert(
                Array.isArray(validationResult.recommendations),
                '建議為陣列格式'
            );

            // 檢查建議結構
            if (validationResult.recommendations.length > 0) {
                const recommendation = validationResult.recommendations[0];
                
                this.assert(
                    typeof recommendation.category === 'string',
                    '建議包含類別'
                );
                
                this.assert(
                    typeof recommendation.priority === 'string',
                    '建議包含優先級'
                );
                
                this.assert(
                    typeof recommendation.issue === 'string',
                    '建議包含問題描述'
                );
                
                this.assert(
                    typeof recommendation.action === 'string',
                    '建議包含行動建議'
                );
            }

        } catch (error) {
            this.recordFailure('建議生成測試', error);
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
            deploymentFeatures: {
                platformValidation: true,
                securityValidation: true,
                performanceValidation: true,
                pwaValidation: true,
                reportGeneration: true,
                crossPlatformSupport: true
            },
            timestamp: new Date().toISOString()
        };
    }
}

// 提供便利的測試執行函數
export async function runDeploymentValidationSmokeTests() {
    const testSuite = new DeploymentValidationSmokeTests();
    return await testSuite.runAllTests();
}

// 如果直接執行此檔案，自動運行測試
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
    runDeploymentValidationSmokeTests().then(results => {
        console.log('🎯 Deployment Validation 煙霧測試結果:', results);
    });
}