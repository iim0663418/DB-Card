/**
 * DeploymentValidator - 部署驗證系統
 * 
 * 提供完整的部署前檢查清單，驗證所有平台的部署狀態，生成驗證報告
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

import { environmentDetector } from './environment-detector.js';
import { pwaIntegrator } from './pwa-integrator.js';
import { resourceManager } from './resource-manager.js';
import { PlatformValidator } from '../utils/platform-validator.js';
import { SecurityValidator } from '../utils/security-validator.js';
import { PerformanceValidator } from '../utils/performance-validator.js';
import { ReportGenerator } from '../utils/report-generator.js';

/**
 * 部署驗證器 - 統籌所有部署驗證流程
 */
export class DeploymentValidator {
    constructor() {
        this.platformValidator = new PlatformValidator();
        this.securityValidator = new SecurityValidator();
        this.performanceValidator = new PerformanceValidator();
        this.reportGenerator = new ReportGenerator();
        this.validationResults = {};
        this.isValidated = false;
    }

    /**
     * 執行完整的部署驗證
     * @returns {Promise<Object>} 驗證結果
     */
    async validateDeployment() {
        try {
            console.log('[DeploymentValidator] 開始部署驗證流程...');
            
            const startTime = Date.now();
            const results = {
                timestamp: new Date().toISOString(),
                platform: await this.detectPlatform(),
                validations: {},
                summary: {},
                recommendations: []
            };

            // 1. 平台驗證
            results.validations.platform = await this.validatePlatform();
            
            // 2. 安全驗證
            results.validations.security = await this.validateSecurity();
            
            // 3. PWA 驗證
            results.validations.pwa = await this.validatePWA();
            
            // 4. 效能驗證
            results.validations.performance = await this.validatePerformance();
            
            // 5. 資源完整性驗證
            results.validations.resources = await this.validateResources();
            
            // 6. 合規性驗證
            results.validations.compliance = await this.validateCompliance();

            // 生成摘要和建議
            results.summary = this.generateSummary(results.validations);
            results.recommendations = this.generateRecommendations(results.validations);
            
            const endTime = Date.now();
            results.duration = `${endTime - startTime}ms`;
            
            this.validationResults = results;
            this.isValidated = true;

            console.log(`[DeploymentValidator] 部署驗證完成 (${results.duration})`);
            return results;

        } catch (error) {
            console.error('[DeploymentValidator] 部署驗證失敗:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 檢測部署平台
     * @returns {Promise<Object>} 平台資訊
     */
    async detectPlatform() {
        try {
            const platform = await environmentDetector.detectEnvironment();
            return {
                name: platform.platform,
                config: platform.config,
                detected: true
            };
        } catch (error) {
            return {
                name: 'unknown',
                detected: false,
                error: error.message
            };
        }
    }

    /**
     * 驗證平台特定配置
     * @returns {Promise<Object>} 平台驗證結果
     */
    async validatePlatform() {
        try {
            console.log('[DeploymentValidator] 執行平台驗證...');
            
            const platformInfo = await this.detectPlatform();
            const validation = await this.platformValidator.validate(platformInfo.name);
            
            return {
                category: 'platform',
                priority: 'high',
                passed: validation.passed,
                total: validation.total,
                checks: validation.checks,
                score: validation.score
            };

        } catch (error) {
            return {
                category: 'platform',
                priority: 'high',
                passed: 0,
                total: 1,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * 驗證安全配置
     * @returns {Promise<Object>} 安全驗證結果
     */
    async validateSecurity() {
        try {
            console.log('[DeploymentValidator] 執行安全驗證...');
            
            const validation = await this.securityValidator.validate();
            
            return {
                category: 'security',
                priority: 'critical',
                passed: validation.passed,
                total: validation.total,
                checks: validation.checks,
                score: validation.score
            };

        } catch (error) {
            return {
                category: 'security',
                priority: 'critical',
                passed: 0,
                total: 1,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * 驗證 PWA 功能
     * @returns {Promise<Object>} PWA 驗證結果
     */
    async validatePWA() {
        try {
            console.log('[DeploymentValidator] 執行 PWA 驗證...');
            
            const checks = [];
            let passed = 0;

            // 檢查 PWA 初始化狀態
            const pwaStatus = pwaIntegrator.getStatus();
            checks.push({
                name: 'PWA 初始化',
                passed: pwaStatus.initialized,
                message: pwaStatus.initialized ? 'PWA 系統已初始化' : 'PWA 系統未初始化'
            });
            if (pwaStatus.initialized) passed++;

            // 檢查 Service Worker
            const swSupported = 'serviceWorker' in navigator;
            checks.push({
                name: 'Service Worker 支援',
                passed: swSupported,
                message: swSupported ? 'Service Worker 支援可用' : '瀏覽器不支援 Service Worker'
            });
            if (swSupported) passed++;

            // 檢查 PWA Manifest
            const manifestLink = document.querySelector('link[rel="manifest"]');
            checks.push({
                name: 'PWA Manifest',
                passed: !!manifestLink,
                message: manifestLink ? 'PWA Manifest 已配置' : 'PWA Manifest 未找到'
            });
            if (manifestLink) passed++;

            // 檢查 HTTPS
            const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
            checks.push({
                name: 'HTTPS 連線',
                passed: isHTTPS,
                message: isHTTPS ? 'HTTPS 連線已啟用' : 'PWA 需要 HTTPS 連線'
            });
            if (isHTTPS) passed++;

            return {
                category: 'pwa',
                priority: 'critical',
                passed,
                total: checks.length,
                checks,
                score: Math.round((passed / checks.length) * 100)
            };

        } catch (error) {
            return {
                category: 'pwa',
                priority: 'critical',
                passed: 0,
                total: 1,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * 驗證效能指標
     * @returns {Promise<Object>} 效能驗證結果
     */
    async validatePerformance() {
        try {
            console.log('[DeploymentValidator] 執行效能驗證...');
            
            const validation = await this.performanceValidator.validate();
            
            return {
                category: 'performance',
                priority: 'high',
                passed: validation.passed,
                total: validation.total,
                checks: validation.checks,
                metrics: validation.metrics,
                score: validation.score
            };

        } catch (error) {
            return {
                category: 'performance',
                priority: 'high',
                passed: 0,
                total: 1,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * 驗證資源完整性
     * @returns {Promise<Object>} 資源驗證結果
     */
    async validateResources() {
        try {
            console.log('[DeploymentValidator] 執行資源完整性驗證...');
            
            const checks = [];
            let passed = 0;

            // 檢查資源管理器狀態
            const resourceStatus = await resourceManager.getStatus();
            checks.push({
                name: '資源管理器',
                passed: resourceStatus.hasManifest,
                message: resourceStatus.hasManifest ? '資源清單已建立' : '資源清單未找到'
            });
            if (resourceStatus.hasManifest) passed++;

            // 檢查資源完整性
            const integrityResult = await resourceManager.validateIntegrity();
            checks.push({
                name: '資源完整性',
                passed: integrityResult.valid,
                message: integrityResult.valid ? 
                    `${integrityResult.validResources}/${integrityResult.totalResources} 資源通過驗證` :
                    '資源完整性驗證失敗'
            });
            if (integrityResult.valid) passed++;

            // 檢查關鍵資源
            const criticalResources = [
                'assets/styles/main.css',
                'src/app.js',
                'manifest.json'
            ];

            for (const resource of criticalResources) {
                try {
                    const response = await fetch(resource, { method: 'HEAD' });
                    const resourcePassed = response.ok;
                    checks.push({
                        name: `關鍵資源: ${resource}`,
                        passed: resourcePassed,
                        message: resourcePassed ? '資源可用' : `HTTP ${response.status}`
                    });
                    if (resourcePassed) passed++;
                } catch (error) {
                    checks.push({
                        name: `關鍵資源: ${resource}`,
                        passed: false,
                        message: '資源載入失敗'
                    });
                }
            }

            return {
                category: 'resources',
                priority: 'high',
                passed,
                total: checks.length,
                checks,
                score: Math.round((passed / checks.length) * 100)
            };

        } catch (error) {
            return {
                category: 'resources',
                priority: 'high',
                passed: 0,
                total: 1,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * 驗證合規性
     * @returns {Promise<Object>} 合規性驗證結果
     */
    async validateCompliance() {
        try {
            console.log('[DeploymentValidator] 執行合規性驗證...');
            
            const checks = [];
            let passed = 0;

            // 檢查 HTML 語言屬性
            const htmlLang = document.documentElement.lang;
            checks.push({
                name: 'HTML 語言屬性',
                passed: !!htmlLang,
                message: htmlLang ? `語言設定: ${htmlLang}` : '缺少語言屬性'
            });
            if (htmlLang) passed++;

            // 檢查 viewport meta 標籤
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            checks.push({
                name: 'Viewport Meta 標籤',
                passed: !!viewportMeta,
                message: viewportMeta ? 'Viewport 已配置' : '缺少 viewport meta 標籤'
            });
            if (viewportMeta) passed++;

            // 檢查主題色彩
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            checks.push({
                name: '主題色彩',
                passed: !!themeColorMeta,
                message: themeColorMeta ? '主題色彩已設定' : '建議設定主題色彩'
            });
            if (themeColorMeta) passed++;

            // 檢查 favicon
            const favicon = document.querySelector('link[rel*="icon"]');
            checks.push({
                name: 'Favicon',
                passed: !!favicon,
                message: favicon ? 'Favicon 已設定' : '建議設定 favicon'
            });
            if (favicon) passed++;

            return {
                category: 'compliance',
                priority: 'medium',
                passed,
                total: checks.length,
                checks,
                score: Math.round((passed / checks.length) * 100)
            };

        } catch (error) {
            return {
                category: 'compliance',
                priority: 'medium',
                passed: 0,
                total: 1,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * 生成驗證摘要
     * @param {Object} validations 驗證結果
     * @returns {Object} 摘要資訊
     */
    generateSummary(validations) {
        const categories = Object.keys(validations);
        let totalPassed = 0;
        let totalChecks = 0;
        let criticalPassed = 0;
        let criticalTotal = 0;

        const categoryScores = {};

        for (const category of categories) {
            const validation = validations[category];
            totalPassed += validation.passed || 0;
            totalChecks += validation.total || 0;
            categoryScores[category] = validation.score || 0;

            if (validation.priority === 'critical') {
                criticalPassed += validation.passed || 0;
                criticalTotal += validation.total || 0;
            }
        }

        const overallScore = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;
        const criticalScore = criticalTotal > 0 ? Math.round((criticalPassed / criticalTotal) * 100) : 100;
        
        const deploymentReady = criticalScore === 100 && overallScore >= 80;

        return {
            deploymentReady,
            overallScore,
            criticalScore,
            totalPassed,
            totalChecks,
            categoryScores,
            passRate: `${totalPassed}/${totalChecks}`,
            status: deploymentReady ? 'ready' : 'needs-attention'
        };
    }

    /**
     * 生成改進建議
     * @param {Object} validations 驗證結果
     * @returns {Array} 建議清單
     */
    generateRecommendations(validations) {
        const recommendations = [];

        for (const [category, validation] of Object.entries(validations)) {
            if (validation.checks) {
                const failedChecks = validation.checks.filter(check => !check.passed);
                
                for (const check of failedChecks) {
                    recommendations.push({
                        category,
                        priority: validation.priority,
                        issue: check.name,
                        message: check.message,
                        action: this.getRecommendationAction(category, check.name)
                    });
                }
            }
        }

        // 按優先級排序
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return recommendations;
    }

    /**
     * 取得特定問題的建議行動
     * @param {string} category 類別
     * @param {string} checkName 檢查名稱
     * @returns {string} 建議行動
     */
    getRecommendationAction(category, checkName) {
        const actions = {
            'PWA 初始化': '檢查 PWA 整合器配置，確保正確初始化',
            'Service Worker 支援': '確保在支援 Service Worker 的瀏覽器中測試',
            'PWA Manifest': '添加 <link rel="manifest" href="manifest.json"> 到 HTML',
            'HTTPS 連線': '部署到支援 HTTPS 的平台或配置 SSL 憑證',
            'CSP 標頭': '配置 Content Security Policy 標頭',
            'SRI 完整性': '為關鍵資源添加 Subresource Integrity 檢查',
            'HTML 語言屬性': '在 <html> 標籤添加 lang 屬性',
            'Viewport Meta 標籤': '添加 <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '主題色彩': '添加 <meta name="theme-color" content="#your-color">',
            'Favicon': '添加 <link rel="icon" href="favicon.ico">'
        };

        return actions[checkName] || '請檢查相關配置並修復問題';
    }

    /**
     * 生成驗證報告
     * @param {string} format 報告格式 ('json' | 'html')
     * @returns {Promise<Object>} 報告內容
     */
    async generateReport(format = 'json') {
        if (!this.isValidated) {
            await this.validateDeployment();
        }

        return await this.reportGenerator.generate(this.validationResults, format);
    }

    /**
     * 取得驗證狀態
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        return {
            isValidated: this.isValidated,
            hasResults: !!this.validationResults,
            deploymentReady: this.validationResults?.summary?.deploymentReady || false,
            overallScore: this.validationResults?.summary?.overallScore || 0,
            timestamp: this.validationResults?.timestamp || null
        };
    }
}

// 提供全域實例
export const deploymentValidator = new DeploymentValidator();

/**
 * 快速執行部署驗證的便利函數
 * @returns {Promise<Object>} 驗證結果
 */
export async function validateDeployment() {
    return await deploymentValidator.validateDeployment();
}

/**
 * 快速生成部署報告的便利函數
 * @param {string} format 報告格式
 * @returns {Promise<Object>} 報告內容
 */
export async function generateDeploymentReport(format = 'json') {
    return await deploymentValidator.generateReport(format);
}