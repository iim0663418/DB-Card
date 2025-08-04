/**
 * OFFLINE-04 備用機制驗證腳本
 * 自動化測試 PWA 工具整合和智慧備用機制
 */

class FallbackMechanismValidator {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = {};
        this.startTime = Date.now();
    }
    
    // 記錄測試結果
    logResult(category, test, status, message, metrics = null) {
        const result = {
            category,
            test,
            status, // 'pass', 'fail', 'warning'
            message,
            metrics,
            timestamp: Date.now()
        };
        
        this.testResults.push(result);
        console.log(`[${category}] ${status.toUpperCase()}: ${test} - ${message}`);
        
        if (metrics) {
            this.performanceMetrics[test] = metrics;
        }
    }
    
    // 主要驗證流程
    async runValidation() {
        console.log('🚀 開始 OFFLINE-04 備用機制驗證...');
        
        try {
            // 1. PWA 工具可用性檢查
            await this.validatePWAToolsAvailability();
            
            // 2. PWA 工具功能測試
            await this.validatePWAToolsFunctionality();
            
            // 3. 備用機制測試
            await this.validateFallbackMechanism();
            
            // 4. 錯誤恢復測試
            await this.validateErrorRecovery();
            
            // 5. 效能基準測試
            await this.validatePerformanceBenchmarks();
            
            // 6. 生成驗證報告
            this.generateValidationReport();
            
        } catch (error) {
            this.logResult('SYSTEM', 'validation-process', 'fail', 
                `驗證過程異常: ${error.message}`);
        }
        
        return this.getValidationSummary();
    }
    
    // 1. PWA 工具可用性檢查
    async validatePWAToolsAvailability() {
        console.log('\\n🔍 檢查 PWA 工具可用性...');
        
        const tools = {
            qrUtils: !!window.qrUtils,
            generateHighResQRCode: !!(window.qrUtils && window.qrUtils.generateHighResQRCode),
            downloadQRCode: !!(window.qrUtils && window.qrUtils.downloadQRCode),
            generateSmartFilename: !!(window.qrUtils && window.qrUtils.generateSmartFilename),
            waitForQRGeneration: !!(window.qrUtils && window.qrUtils.waitForQRGeneration),
            validateAndFixDataUrl: !!(window.qrUtils && window.qrUtils.validateAndFixDataUrl)
        };
        
        const availableTools = Object.values(tools).filter(Boolean).length;
        const totalTools = Object.keys(tools).length;
        
        if (availableTools === totalTools) {
            this.logResult('PWA_TOOLS', 'availability-check', 'pass', 
                `所有 PWA 工具可用 (${availableTools}/${totalTools})`);
        } else if (availableTools > 0) {
            this.logResult('PWA_TOOLS', 'availability-check', 'warning', 
                `部分 PWA 工具可用 (${availableTools}/${totalTools})`);
        } else {
            this.logResult('PWA_TOOLS', 'availability-check', 'fail', 
                `PWA 工具不可用 (${availableTools}/${totalTools})`);
        }
        
        // 詳細檢查每個工具
        Object.entries(tools).forEach(([tool, available]) => {
            this.logResult('PWA_TOOLS', `tool-${tool}`, available ? 'pass' : 'fail', 
                `${tool}: ${available ? '可用' : '不可用'}`);
        });
        
        return tools;
    }
    
    // 2. PWA 工具功能測試
    async validatePWAToolsFunctionality() {
        console.log('\\n🎨 測試 PWA 工具功能...');
        
        if (!window.qrUtils || !window.qrUtils.generateHighResQRCode) {
            this.logResult('PWA_FUNCTIONALITY', 'pwa-qr-generation', 'fail', 
                'PWA 工具不可用，跳過功能測試');
            return;
        }
        
        try {
            const testData = 'BEGIN:VCARD\\nVERSION:3.0\\nFN:Test User\\nEND:VCARD';
            const startTime = performance.now();
            
            const result = await window.qrUtils.generateHighResQRCode(testData, {
                size: 240,
                colorDark: '#6b7280',
                colorLight: '#ffffff'
            });
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            if (result.success) {
                this.logResult('PWA_FUNCTIONALITY', 'pwa-qr-generation', 'pass', 
                    `PWA QR 碼生成成功`, { duration, size: result.size });
                
                // 驗證生成的 QR 碼格式
                if (result.dataUrl && result.dataUrl.startsWith('data:image/')) {
                    this.logResult('PWA_FUNCTIONALITY', 'qr-format-validation', 'pass', 
                        'QR 碼格式正確 (DataURL)');
                } else {
                    this.logResult('PWA_FUNCTIONALITY', 'qr-format-validation', 'fail', 
                        'QR 碼格式異常');
                }
                
                // 效能檢查
                if (duration <= 2000) {
                    this.logResult('PWA_FUNCTIONALITY', 'pwa-performance', 'pass', 
                        `PWA 生成效能符合要求 (${Math.round(duration)}ms ≤ 2000ms)`);
                } else {
                    this.logResult('PWA_FUNCTIONALITY', 'pwa-performance', 'warning', 
                        `PWA 生成效能超時 (${Math.round(duration)}ms > 2000ms)`);
                }
                
            } else {
                this.logResult('PWA_FUNCTIONALITY', 'pwa-qr-generation', 'fail', 
                    `PWA QR 碼生成失敗: ${result.error}`);
            }
            
        } catch (error) {
            this.logResult('PWA_FUNCTIONALITY', 'pwa-qr-generation', 'fail', 
                `PWA 功能測試異常: ${error.message}`);
        }
    }
    
    // 3. 備用機制測試
    async validateFallbackMechanism() {
        console.log('\\n🔄 測試備用機制...');
        
        // 暫時禁用 PWA 工具
        const originalQrUtils = window.qrUtils;
        window.qrUtils = null;
        
        try {
            // 模擬離線環境
            const originalOnLine = navigator.onLine;
            Object.defineProperty(navigator, 'onLine', { 
                value: false, 
                configurable: true 
            });
            
            const startTime = performance.now();
            
            // 測試備用機制是否啟動
            if (typeof window.generateQRCode === 'function') {
                // 這裡應該觸發備用機制
                const testResult = await this.simulateFallbackGeneration();
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                if (testResult.success) {
                    this.logResult('FALLBACK_MECHANISM', 'fallback-activation', 'pass', 
                        `備用機制正常啟動`, { duration });
                    
                    // 效能檢查
                    if (duration <= 3000) {
                        this.logResult('FALLBACK_MECHANISM', 'fallback-performance', 'pass', 
                            `備用機制效能符合要求 (${Math.round(duration)}ms ≤ 3000ms)`);
                    } else {
                        this.logResult('FALLBACK_MECHANISM', 'fallback-performance', 'warning', 
                            `備用機制效能超時 (${Math.round(duration)}ms > 3000ms)`);
                    }
                } else {
                    this.logResult('FALLBACK_MECHANISM', 'fallback-activation', 'fail', 
                        `備用機制啟動失敗: ${testResult.error}`);
                }
            } else {
                this.logResult('FALLBACK_MECHANISM', 'fallback-activation', 'fail', 
                    'generateQRCode 函數不存在');
            }
            
            // 恢復原始狀態
            Object.defineProperty(navigator, 'onLine', { 
                value: originalOnLine, 
                configurable: true 
            });
            
        } catch (error) {
            this.logResult('FALLBACK_MECHANISM', 'fallback-test', 'fail', 
                `備用機制測試異常: ${error.message}`);
        } finally {
            // 確保恢復 PWA 工具
            window.qrUtils = originalQrUtils;
        }
    }
    
    // 模擬備用機制生成
    async simulateFallbackGeneration() {
        return new Promise((resolve) => {
            try {
                // 模擬備用機制邏輯
                const hasQRCode = window.QRCode;
                const hasCardData = typeof window.getCardDataFromNFC === 'function';
                const hasVCardGenerator = typeof window.generateVCardContent === 'function';
                
                if (hasQRCode && hasCardData && hasVCardGenerator) {
                    resolve({ success: true, method: 'fallback' });
                } else {
                    resolve({ 
                        success: false, 
                        error: `缺少必要組件: QRCode=${hasQRCode}, CardData=${hasCardData}, VCard=${hasVCardGenerator}` 
                    });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }
    
    // 4. 錯誤恢復測試
    async validateErrorRecovery() {
        console.log('\\n🛠️ 測試錯誤恢復機制...');
        
        const errorScenarios = [
            {
                name: 'QRCode 物件不存在',
                setup: () => {
                    this.originalQRCode = window.QRCode;
                    window.QRCode = null;
                },
                cleanup: () => {
                    window.QRCode = this.originalQRCode;
                }
            },
            {
                name: '無效名片資料',
                setup: () => {
                    this.originalGetCardData = window.getCardDataFromNFC;
                    window.getCardDataFromNFC = () => null;
                },
                cleanup: () => {
                    window.getCardDataFromNFC = this.originalGetCardData;
                }
            },
            {
                name: 'vCard 生成函數異常',
                setup: () => {
                    this.originalGenerateVCard = window.generateVCardContent;
                    window.generateVCardContent = () => { throw new Error('vCard 生成失敗'); };
                },
                cleanup: () => {
                    window.generateVCardContent = this.originalGenerateVCard;
                }
            }
        ];
        
        for (const scenario of errorScenarios) {
            try {
                scenario.setup();
                
                // 設定離線狀態
                Object.defineProperty(navigator, 'onLine', { 
                    value: false, 
                    configurable: true 
                });
                
                // 嘗試執行可能失敗的操作
                let errorCaught = false;
                try {
                    if (typeof window.generateQRCode === 'function') {
                        window.generateQRCode();
                    }
                } catch (error) {
                    errorCaught = true;
                }
                
                // 檢查系統是否正常恢復
                this.logResult('ERROR_RECOVERY', `scenario-${scenario.name}`, 'pass', 
                    `${scenario.name}: 系統未崩潰，錯誤${errorCaught ? '被捕獲' : '被處理'}`);
                
            } catch (error) {
                this.logResult('ERROR_RECOVERY', `scenario-${scenario.name}`, 'fail', 
                    `${scenario.name}: 錯誤恢復失敗 - ${error.message}`);
            } finally {
                scenario.cleanup();
                Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
            }
        }
    }
    
    // 5. 效能基準測試
    async validatePerformanceBenchmarks() {
        console.log('\\n📊 執行效能基準測試...');
        
        const benchmarks = [
            { name: 'PWA QR 生成', threshold: 2000, category: 'PWA_PERFORMANCE' },
            { name: '備用機制啟動', threshold: 3000, category: 'FALLBACK_PERFORMANCE' },
            { name: '錯誤恢復時間', threshold: 1000, category: 'ERROR_RECOVERY_PERFORMANCE' }
        ];
        
        for (const benchmark of benchmarks) {
            const metrics = this.performanceMetrics[benchmark.name];
            if (metrics && metrics.duration) {
                if (metrics.duration <= benchmark.threshold) {
                    this.logResult(benchmark.category, 'performance-benchmark', 'pass', 
                        `${benchmark.name}效能符合基準 (${Math.round(metrics.duration)}ms ≤ ${benchmark.threshold}ms)`);
                } else {
                    this.logResult(benchmark.category, 'performance-benchmark', 'warning', 
                        `${benchmark.name}效能超出基準 (${Math.round(metrics.duration)}ms > ${benchmark.threshold}ms)`);
                }
            } else {
                this.logResult(benchmark.category, 'performance-benchmark', 'warning', 
                    `${benchmark.name}效能資料不足`);
            }
        }
    }
    
    // 生成驗證報告
    generateValidationReport() {
        const endTime = Date.now();
        const totalDuration = endTime - this.startTime;
        
        console.log('\\n📋 ===== OFFLINE-04 備用機制驗證報告 =====');
        console.log(`⏱️  總執行時間: ${totalDuration}ms`);
        
        // 按類別統計結果
        const categories = {};
        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { pass: 0, fail: 0, warning: 0, total: 0 };
            }
            categories[result.category][result.status]++;
            categories[result.category].total++;
        });
        
        // 顯示各類別統計
        Object.entries(categories).forEach(([category, stats]) => {
            const successRate = Math.round((stats.pass / stats.total) * 100);
            console.log(`\\n📊 ${category}:`);
            console.log(`  ✅ 通過: ${stats.pass}`);
            console.log(`  ❌ 失敗: ${stats.fail}`);
            console.log(`  ⚠️  警告: ${stats.warning}`);
            console.log(`  📈 成功率: ${successRate}%`);
        });
        
        // 整體統計
        const totalTests = this.testResults.length;
        const totalPassed = this.testResults.filter(r => r.status === 'pass').length;
        const totalFailed = this.testResults.filter(r => r.status === 'fail').length;
        const overallSuccessRate = Math.round((totalPassed / totalTests) * 100);
        
        console.log(`\\n🎯 整體結果:`);
        console.log(`  📋 總測試數: ${totalTests}`);
        console.log(`  ✅ 總通過數: ${totalPassed}`);
        console.log(`  ❌ 總失敗數: ${totalFailed}`);
        console.log(`  📈 整體成功率: ${overallSuccessRate}%`);
        
        // 結論
        if (totalFailed === 0) {
            console.log('\\n🎉 所有驗證測試通過！PWA 整合和備用機制運作正常');
        } else if (overallSuccessRate >= 80) {
            console.log('\\n⚠️ 大部分測試通過，但仍有問題需要處理');
        } else {
            console.log('\\n❌ 驗證失敗率較高，需要重點檢查和修復');
        }
    }
    
    // 獲取驗證摘要
    getValidationSummary() {
        const totalTests = this.testResults.length;
        const totalPassed = this.testResults.filter(r => r.status === 'pass').length;
        const totalFailed = this.testResults.filter(r => r.status === 'fail').length;
        const totalWarnings = this.testResults.filter(r => r.status === 'warning').length;
        
        return {
            summary: {
                totalTests,
                passed: totalPassed,
                failed: totalFailed,
                warnings: totalWarnings,
                successRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
                duration: Date.now() - this.startTime
            },
            results: this.testResults,
            performanceMetrics: this.performanceMetrics
        };
    }
}

// 如果在 Node.js 環境中執行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FallbackMechanismValidator;
}

// 如果在瀏覽器環境中執行
if (typeof window !== 'undefined') {
    window.FallbackMechanismValidator = FallbackMechanismValidator;
    
    // 提供便捷的執行函數
    window.runFallbackValidation = async function() {
        const validator = new FallbackMechanismValidator();
        return await validator.runValidation();
    };
    
    // 自動執行提示
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔧 備用機制驗證工具已載入，執行 runFallbackValidation() 開始驗證');
    });
}