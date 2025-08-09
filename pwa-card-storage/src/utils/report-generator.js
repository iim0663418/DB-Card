/**
 * ReportGenerator - 部署驗證報告生成器
 * 
 * 生成 JSON 和 HTML 格式的部署驗證報告
 * 
 * @version 1.0.0
 * @author DB-Card PWA Team
 */

/**
 * 報告生成器
 */
export class ReportGenerator {
    constructor() {
        this.reportTemplate = null;
    }

    /**
     * 生成部署驗證報告
     * @param {Object} validationResults 驗證結果
     * @param {string} format 報告格式 ('json' | 'html')
     * @returns {Promise<Object>} 報告內容
     */
    async generate(validationResults, format = 'json') {
        try {
            console.log(`[ReportGenerator] 生成 ${format.toUpperCase()} 格式報告...`);

            switch (format.toLowerCase()) {
                case 'json':
                    return this.generateJSONReport(validationResults);
                case 'html':
                    return this.generateHTMLReport(validationResults);
                default:
                    throw new Error(`不支援的報告格式: ${format}`);
            }

        } catch (error) {
            console.error('[ReportGenerator] 報告生成失敗:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 生成 JSON 格式報告
     * @param {Object} validationResults 驗證結果
     * @returns {Object} JSON 報告
     */
    generateJSONReport(validationResults) {
        const report = {
            meta: {
                reportType: 'deployment-validation',
                version: '1.0.0',
                generatedAt: new Date().toISOString(),
                generator: 'DB-Card DeploymentValidator'
            },
            summary: {
                deploymentReady: validationResults.summary?.deploymentReady || false,
                overallScore: validationResults.summary?.overallScore || 0,
                criticalScore: validationResults.summary?.criticalScore || 0,
                totalChecks: validationResults.summary?.totalChecks || 0,
                passedChecks: validationResults.summary?.totalPassed || 0,
                status: validationResults.summary?.status || 'unknown'
            },
            platform: validationResults.platform || {},
            validations: this.processValidations(validationResults.validations || {}),
            recommendations: validationResults.recommendations || [],
            metrics: this.extractMetrics(validationResults),
            execution: {
                duration: validationResults.duration || 'unknown',
                timestamp: validationResults.timestamp
            }
        };

        return {
            success: true,
            format: 'json',
            content: report,
            size: JSON.stringify(report).length
        };
    }

    /**
     * 生成 HTML 格式報告
     * @param {Object} validationResults 驗證結果
     * @returns {Object} HTML 報告
     */
    generateHTMLReport(validationResults) {
        const htmlContent = this.buildHTMLReport(validationResults);
        
        return {
            success: true,
            format: 'html',
            content: htmlContent,
            size: htmlContent.length
        };
    }

    /**
     * 處理驗證結果
     * @param {Object} validations 原始驗證結果
     * @returns {Object} 處理後的驗證結果
     */
    processValidations(validations) {
        const processed = {};

        Object.entries(validations).forEach(([category, validation]) => {
            processed[category] = {
                category: validation.category || category,
                priority: validation.priority || 'medium',
                score: validation.score || 0,
                passed: validation.passed || 0,
                total: validation.total || 0,
                passRate: validation.total > 0 ? 
                    Math.round((validation.passed / validation.total) * 100) : 0,
                checks: (validation.checks || []).map(check => ({
                    name: check.name,
                    passed: check.passed,
                    message: check.message,
                    priority: check.priority || validation.priority || 'medium'
                })),
                error: validation.error || null
            };
        });

        return processed;
    }

    /**
     * 提取效能指標
     * @param {Object} validationResults 驗證結果
     * @returns {Object} 效能指標
     */
    extractMetrics(validationResults) {
        const metrics = {};

        // 提取效能驗證中的指標
        if (validationResults.validations?.performance?.metrics) {
            metrics.performance = validationResults.validations.performance.metrics;
        }

        // 提取平台資訊
        if (validationResults.platform) {
            metrics.platform = {
                name: validationResults.platform.name,
                detected: validationResults.platform.detected
            };
        }

        // 提取執行資訊
        metrics.execution = {
            duration: validationResults.duration,
            timestamp: validationResults.timestamp
        };

        return metrics;
    }

    /**
     * 建立 HTML 報告
     * @param {Object} validationResults 驗證結果
     * @returns {string} HTML 內容
     */
    buildHTMLReport(validationResults) {
        const summary = validationResults.summary || {};
        const validations = validationResults.validations || {};
        const recommendations = validationResults.recommendations || [];

        return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>部署驗證報告 - ${new Date().toLocaleDateString()}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>🚀 部署驗證報告</h1>
            <div class="report-meta">
                <span>生成時間: ${new Date(validationResults.timestamp).toLocaleString()}</span>
                <span>執行時間: ${validationResults.duration}</span>
                <span>平台: ${validationResults.platform?.name || 'unknown'}</span>
            </div>
        </header>

        <section class="summary-section">
            <h2>📊 驗證摘要</h2>
            <div class="summary-grid">
                <div class="summary-card ${summary.deploymentReady ? 'success' : 'warning'}">
                    <h3>部署狀態</h3>
                    <div class="summary-value">${summary.deploymentReady ? '✅ 就緒' : '⚠️ 需要注意'}</div>
                </div>
                <div class="summary-card">
                    <h3>整體分數</h3>
                    <div class="summary-value">${summary.overallScore || 0}%</div>
                </div>
                <div class="summary-card">
                    <h3>關鍵檢查</h3>
                    <div class="summary-value">${summary.criticalScore || 0}%</div>
                </div>
                <div class="summary-card">
                    <h3>通過率</h3>
                    <div class="summary-value">${summary.passedChecks || 0}/${summary.totalChecks || 0}</div>
                </div>
            </div>
        </section>

        <section class="validations-section">
            <h2>🔍 詳細驗證結果</h2>
            ${this.buildValidationsHTML(validations)}
        </section>

        ${recommendations.length > 0 ? `
        <section class="recommendations-section">
            <h2>💡 改進建議</h2>
            ${this.buildRecommendationsHTML(recommendations)}
        </section>
        ` : ''}

        <footer class="report-footer">
            <p>報告由 DB-Card DeploymentValidator 生成</p>
            <p>版本: v3.2.0 | 生成時間: ${new Date().toISOString()}</p>
        </footer>
    </div>
</body>
</html>`;
    }

    /**
     * 建立驗證結果 HTML
     * @param {Object} validations 驗證結果
     * @returns {string} HTML 內容
     */
    buildValidationsHTML(validations) {
        return Object.entries(validations).map(([category, validation]) => {
            const priorityClass = this.getPriorityClass(validation.priority);
            const scoreClass = this.getScoreClass(validation.score);

            return `
            <div class="validation-category">
                <div class="category-header ${priorityClass}">
                    <h3>${this.getCategoryTitle(category)}</h3>
                    <div class="category-score ${scoreClass}">${validation.score || 0}%</div>
                </div>
                <div class="category-content">
                    <div class="category-stats">
                        <span>通過: ${validation.passed || 0}</span>
                        <span>總計: ${validation.total || 0}</span>
                        <span>優先級: ${this.getPriorityText(validation.priority)}</span>
                    </div>
                    <div class="checks-list">
                        ${(validation.checks || []).map(check => `
                            <div class="check-item ${check.passed ? 'passed' : 'failed'}">
                                <div class="check-status">${check.passed ? '✅' : '❌'}</div>
                                <div class="check-content">
                                    <div class="check-name">${check.name}</div>
                                    <div class="check-message">${check.message}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${validation.error ? `
                        <div class="validation-error">
                            <strong>錯誤:</strong> ${validation.error}
                        </div>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    }

    /**
     * 建立建議 HTML
     * @param {Array} recommendations 建議清單
     * @returns {string} HTML 內容
     */
    buildRecommendationsHTML(recommendations) {
        const groupedRecommendations = this.groupRecommendationsByPriority(recommendations);

        return Object.entries(groupedRecommendations).map(([priority, items]) => `
            <div class="recommendations-group">
                <h3 class="priority-${priority}">${this.getPriorityText(priority)} 優先級</h3>
                <div class="recommendations-list">
                    ${items.map(rec => `
                        <div class="recommendation-item priority-${priority}">
                            <div class="recommendation-issue">${rec.issue}</div>
                            <div class="recommendation-action">${rec.action}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * 按優先級分組建議
     * @param {Array} recommendations 建議清單
     * @returns {Object} 分組後的建議
     */
    groupRecommendationsByPriority(recommendations) {
        const grouped = { critical: [], high: [], medium: [], low: [] };
        
        recommendations.forEach(rec => {
            const priority = rec.priority || 'medium';
            if (grouped[priority]) {
                grouped[priority].push(rec);
            }
        });

        // 移除空的優先級組
        Object.keys(grouped).forEach(priority => {
            if (grouped[priority].length === 0) {
                delete grouped[priority];
            }
        });

        return grouped;
    }

    /**
     * 取得類別標題
     * @param {string} category 類別名稱
     * @returns {string} 標題
     */
    getCategoryTitle(category) {
        const titles = {
            platform: '🏗️ 平台配置',
            security: '🔒 安全檢查',
            pwa: '📱 PWA 功能',
            performance: '⚡ 效能指標',
            resources: '📦 資源完整性',
            compliance: '✅ 合規性檢查'
        };
        return titles[category] || category;
    }

    /**
     * 取得優先級文字
     * @param {string} priority 優先級
     * @returns {string} 優先級文字
     */
    getPriorityText(priority) {
        const texts = {
            critical: '關鍵',
            high: '高',
            medium: '中',
            low: '低'
        };
        return texts[priority] || '中';
    }

    /**
     * 取得優先級 CSS 類別
     * @param {string} priority 優先級
     * @returns {string} CSS 類別
     */
    getPriorityClass(priority) {
        return `priority-${priority || 'medium'}`;
    }

    /**
     * 取得分數 CSS 類別
     * @param {number} score 分數
     * @returns {string} CSS 類別
     */
    getScoreClass(score) {
        if (score >= 90) return 'score-excellent';
        if (score >= 70) return 'score-good';
        if (score >= 50) return 'score-fair';
        return 'score-poor';
    }

    /**
     * 取得報告樣式
     * @returns {string} CSS 樣式
     */
    getReportStyles() {
        return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }

        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }

        .report-header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .report-meta {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            opacity: 0.9;
        }

        .summary-section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #6c757d;
        }

        .summary-card.success {
            border-left-color: #28a745;
            background: #d4edda;
        }

        .summary-card.warning {
            border-left-color: #ffc107;
            background: #fff3cd;
        }

        .summary-card h3 {
            font-size: 1.1em;
            margin-bottom: 10px;
            color: #666;
        }

        .summary-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }

        .validations-section, .recommendations-section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .validation-category {
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }

        .category-header {
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
        }

        .priority-critical { background: #f8d7da; }
        .priority-high { background: #fff3cd; }
        .priority-medium { background: #d1ecf1; }
        .priority-low { background: #d4edda; }

        .category-score {
            font-size: 1.2em;
            padding: 5px 10px;
            border-radius: 4px;
            color: white;
        }

        .score-excellent { background: #28a745; }
        .score-good { background: #17a2b8; }
        .score-fair { background: #ffc107; }
        .score-poor { background: #dc3545; }

        .category-content {
            padding: 20px;
        }

        .category-stats {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #666;
        }

        .checks-list {
            space-y: 10px;
        }

        .check-item {
            display: flex;
            align-items: flex-start;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 8px;
        }

        .check-item.passed {
            background: #d4edda;
            border-left: 3px solid #28a745;
        }

        .check-item.failed {
            background: #f8d7da;
            border-left: 3px solid #dc3545;
        }

        .check-status {
            margin-right: 10px;
            font-size: 1.2em;
        }

        .check-content {
            flex: 1;
        }

        .check-name {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .check-message {
            font-size: 0.9em;
            color: #666;
        }

        .validation-error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 10px;
            border-radius: 4px;
            margin-top: 15px;
            color: #721c24;
        }

        .recommendations-group {
            margin-bottom: 25px;
        }

        .recommendations-group h3 {
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 15px;
        }

        .recommendations-list {
            space-y: 10px;
        }

        .recommendation-item {
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid;
            margin-bottom: 10px;
        }

        .recommendation-item.priority-critical {
            background: #f8d7da;
            border-left-color: #dc3545;
        }

        .recommendation-item.priority-high {
            background: #fff3cd;
            border-left-color: #ffc107;
        }

        .recommendation-item.priority-medium {
            background: #d1ecf1;
            border-left-color: #17a2b8;
        }

        .recommendation-item.priority-low {
            background: #d4edda;
            border-left-color: #28a745;
        }

        .recommendation-issue {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .recommendation-action {
            font-size: 0.9em;
            color: #666;
        }

        .report-footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .report-container {
                padding: 10px;
            }
            
            .report-meta {
                flex-direction: column;
                gap: 10px;
            }
            
            .summary-grid {
                grid-template-columns: 1fr;
            }
        }
        `;
    }

    /**
     * 匯出報告到檔案
     * @param {Object} report 報告內容
     * @param {string} filename 檔案名稱
     * @returns {void}
     */
    exportToFile(report, filename) {
        try {
            const content = report.format === 'json' ? 
                JSON.stringify(report.content, null, 2) : 
                report.content;
            
            const mimeType = report.format === 'json' ? 
                'application/json' : 
                'text/html';
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`[ReportGenerator] 報告已匯出: ${filename}`);
            
        } catch (error) {
            console.error('[ReportGenerator] 報告匯出失敗:', error);
        }
    }
}

// 提供便利的匯出
export const reportGenerator = new ReportGenerator();

/**
 * 快速生成報告的便利函數
 * @param {Object} validationResults 驗證結果
 * @param {string} format 報告格式
 * @returns {Promise<Object>} 報告內容
 */
export async function generateReport(validationResults, format = 'json') {
    return await reportGenerator.generate(validationResults, format);
}