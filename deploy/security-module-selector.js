#!/usr/bin/env node

/**
 * Security Module Selector - SECURITY-01 Implementation
 * 從12個安全模組中選擇3-5個核心模組，適合PWA靜態托管環境
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityModuleSelector {
    constructor() {
        this.sourceDir = path.join(__dirname, '..', 'src', 'security');
        this.targetDir = path.join(__dirname, '..', 'pwa-card-storage', 'src', 'security');
        this.scriptsDir = path.join(this.targetDir, 'scripts');
        
        // 核心模組配置 - 必須保留的3個模組
        this.coreModules = [
            'SecurityInputHandler.js',
            'SecurityDataHandler.js', 
            'SecurityAuthHandler.js'
        ];
        
        // 可選模組配置 - 根據PWA需求選擇2個
        this.optionalModules = [
            {
                name: 'SecurityMonitor.js',
                priority: 'high',
                reason: '24/7安全監控，適合PWA環境',
                dependencies: []
            },
            {
                name: 'StaticHostingCompatibilityLayer.js',
                priority: 'high', 
                reason: '靜態托管相容性，PWA核心需求',
                dependencies: []
            },
            {
                name: 'PWASecurityHeaders.js',
                priority: 'medium',
                reason: 'PWA安全標頭設定',
                dependencies: []
            },
            {
                name: 'OfflineSecurityLogger.js',
                priority: 'medium',
                reason: '離線安全日誌，PWA離線功能支援',
                dependencies: []
            },
            {
                name: 'InputValidationSchema.js',
                priority: 'low',
                reason: '輸入驗證架構，可由InputHandler替代',
                dependencies: ['SecurityInputHandler.js']
            }
        ];
        
        this.selectionReport = {
            timestamp: new Date().toISOString(),
            selectedModules: [],
            skippedModules: [],
            copyResults: [],
            integrityChecks: [],
            totalSize: 0
        };
    }

    /**
     * 執行安全模組選擇與複製
     */
    async execute() {
        try {
            console.log('🔒 SECURITY-01: 安全模組選擇與複製開始...\n');
            
            // 1. 驗證源目錄
            await this.validateSourceDirectory();
            
            // 2. 創建目標目錄
            await this.createTargetDirectories();
            
            // 3. 分析現有模組
            const availableModules = await this.analyzeAvailableModules();
            
            // 4. 選擇核心模組
            const selectedModules = await this.selectModules(availableModules);
            
            // 5. 複製選定模組
            await this.copySelectedModules(selectedModules);
            
            // 6. 驗證功能完整性
            await this.validateFunctionality();
            
            // 7. 生成選擇報告
            await this.generateSelectionReport();
            
            console.log('✅ SECURITY-01 任務完成！');
            return this.selectionReport;
            
        } catch (error) {
            console.error('❌ SECURITY-01 執行失敗:', error.message);
            throw error;
        }
    }

    /**
     * 驗證源目錄結構
     */
    async validateSourceDirectory() {
        if (!fs.existsSync(this.sourceDir)) {
            throw new Error(`源安全目錄不存在: ${this.sourceDir}`);
        }
        
        // 檢查核心模組是否存在
        for (const module of this.coreModules) {
            const modulePath = path.join(this.sourceDir, module);
            if (!fs.existsSync(modulePath)) {
                throw new Error(`核心模組不存在: ${module}`);
            }
        }
        
        console.log('✓ 源目錄驗證通過');
    }

    /**
     * 創建目標目錄結構
     */
    async createTargetDirectories() {
        // 確保目標目錄存在
        if (!fs.existsSync(this.targetDir)) {
            fs.mkdirSync(this.targetDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.scriptsDir)) {
            fs.mkdirSync(this.scriptsDir, { recursive: true });
        }
        
        console.log('✓ 目標目錄結構創建完成');
    }

    /**
     * 分析可用的安全模組
     */
    async analyzeAvailableModules() {
        const files = fs.readdirSync(this.sourceDir);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        
        const modules = [];
        for (const file of jsFiles) {
            const filePath = path.join(this.sourceDir, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            modules.push({
                name: file,
                path: filePath,
                size: stats.size,
                isCore: this.coreModules.includes(file),
                dependencies: this.extractDependencies(content),
                complexity: this.calculateComplexity(content)
            });
        }
        
        console.log(`✓ 分析完成: 發現 ${modules.length} 個安全模組`);
        return modules;
    }

    /**
     * 選擇要複製的模組
     */
    async selectModules(availableModules) {
        const selected = [];
        
        // 1. 必選核心模組
        for (const coreModule of this.coreModules) {
            const module = availableModules.find(m => m.name === coreModule);
            if (module) {
                selected.push({
                    ...module,
                    selectionReason: '核心安全模組 - 必須保留'
                });
                this.selectionReport.selectedModules.push(coreModule);
            }
        }
        
        // 2. 選擇2個可選模組 (基於優先級和PWA適用性)
        const highPriorityOptional = this.optionalModules
            .filter(opt => opt.priority === 'high')
            .slice(0, 2); // 選擇前2個高優先級模組
        
        for (const optModule of highPriorityOptional) {
            const module = availableModules.find(m => m.name === optModule.name);
            if (module) {
                selected.push({
                    ...module,
                    selectionReason: optModule.reason
                });
                this.selectionReport.selectedModules.push(optModule.name);
            } else {
                this.selectionReport.skippedModules.push({
                    name: optModule.name,
                    reason: '模組檔案不存在'
                });
            }
        }
        
        // 記錄跳過的模組
        const allModuleNames = availableModules.map(m => m.name);
        const selectedNames = selected.map(s => s.name);
        const skipped = allModuleNames.filter(name => !selectedNames.includes(name));
        
        for (const skippedName of skipped) {
            this.selectionReport.skippedModules.push({
                name: skippedName,
                reason: '非核心模組，PWA環境不需要'
            });
        }
        
        console.log(`✓ 模組選擇完成: ${selected.length} 個模組被選中`);
        return selected;
    }

    /**
     * 複製選定的模組
     */
    async copySelectedModules(selectedModules) {
        for (const module of selectedModules) {
            try {
                // 決定目標路徑 (核心模組放在scripts子目錄)
                const isScriptModule = this.coreModules.includes(module.name);
                const targetPath = isScriptModule 
                    ? path.join(this.scriptsDir, module.name)
                    : path.join(this.targetDir, module.name);
                
                // 讀取源檔案
                const sourceContent = fs.readFileSync(module.path, 'utf8');
                
                // 計算完整性雜湊
                const hash = crypto.createHash('sha384').update(sourceContent).digest('hex');
                
                // 寫入目標檔案
                fs.writeFileSync(targetPath, sourceContent, 'utf8');
                
                // 驗證複製結果
                const copiedContent = fs.readFileSync(targetPath, 'utf8');
                const copiedHash = crypto.createHash('sha384').update(copiedContent).digest('hex');
                
                if (hash !== copiedHash) {
                    throw new Error(`檔案完整性檢查失敗: ${module.name}`);
                }
                
                const copyResult = {
                    module: module.name,
                    sourcePath: module.path,
                    targetPath: targetPath,
                    size: module.size,
                    hash: hash,
                    status: 'success',
                    reason: module.selectionReason
                };
                
                this.selectionReport.copyResults.push(copyResult);
                this.selectionReport.totalSize += module.size;
                
                console.log(`✓ 複製完成: ${module.name} (${module.size} bytes)`);
                
            } catch (error) {
                const copyResult = {
                    module: module.name,
                    status: 'failed',
                    error: error.message
                };
                
                this.selectionReport.copyResults.push(copyResult);
                console.error(`❌ 複製失敗: ${module.name} - ${error.message}`);
                throw error;
            }
        }
    }

    /**
     * 驗證功能完整性
     */
    async validateFunctionality() {
        const validationResults = [];
        
        // 檢查核心模組是否都已複製
        for (const coreModule of this.coreModules) {
            const targetPath = path.join(this.scriptsDir, coreModule);
            const exists = fs.existsSync(targetPath);
            
            validationResults.push({
                module: coreModule,
                check: 'file_exists',
                passed: exists,
                message: exists ? '檔案存在' : '檔案不存在'
            });
            
            if (exists) {
                // 檢查檔案內容完整性
                const content = fs.readFileSync(targetPath, 'utf8');
                const hasClass = content.includes(`class ${coreModule.replace('.js', '')}`);
                const hasExport = content.includes(`window.${coreModule.replace('.js', '')}`);
                
                validationResults.push({
                    module: coreModule,
                    check: 'class_definition',
                    passed: hasClass,
                    message: hasClass ? '類別定義正確' : '類別定義缺失'
                });
                
                validationResults.push({
                    module: coreModule,
                    check: 'global_export',
                    passed: hasExport,
                    passed: hasExport,
                    message: hasExport ? '全域匯出正確' : '全域匯出缺失'
                });
            }
        }
        
        this.selectionReport.integrityChecks = validationResults;
        
        const failedChecks = validationResults.filter(r => !r.passed);
        if (failedChecks.length > 0) {
            console.warn(`⚠️  發現 ${failedChecks.length} 個完整性問題`);
            failedChecks.forEach(check => {
                console.warn(`   - ${check.module}: ${check.message}`);
            });
        } else {
            console.log('✓ 功能完整性驗證通過');
        }
    }

    /**
     * 生成選擇報告
     */
    async generateSelectionReport() {
        const reportPath = path.join(__dirname, 'security-module-selection-report.json');
        
        // 添加摘要資訊
        this.selectionReport.summary = {
            totalModulesAnalyzed: this.selectionReport.selectedModules.length + this.selectionReport.skippedModules.length,
            selectedCount: this.selectionReport.selectedModules.length,
            skippedCount: this.selectionReport.skippedModules.length,
            totalSizeKB: Math.round(this.selectionReport.totalSize / 1024 * 100) / 100,
            coreModulesIncluded: this.coreModules.every(core => 
                this.selectionReport.selectedModules.includes(core)
            )
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(this.selectionReport, null, 2));
        
        console.log('\n📊 選擇報告摘要:');
        console.log(`   - 分析模組: ${this.selectionReport.summary.totalModulesAnalyzed} 個`);
        console.log(`   - 選中模組: ${this.selectionReport.summary.selectedCount} 個`);
        console.log(`   - 跳過模組: ${this.selectionReport.summary.skippedCount} 個`);
        console.log(`   - 總大小: ${this.selectionReport.summary.totalSizeKB} KB`);
        console.log(`   - 核心模組完整: ${this.selectionReport.summary.coreModulesIncluded ? '✓' : '✗'}`);
        console.log(`   - 詳細報告: ${reportPath}`);
    }

    /**
     * 提取模組依賴關係
     */
    extractDependencies(content) {
        const dependencies = [];
        
        // 尋找 window.SecurityXXX 引用
        const windowRefs = content.match(/window\.Security\w+/g) || [];
        dependencies.push(...windowRefs.map(ref => ref.replace('window.', '') + '.js'));
        
        // 尋找直接類別引用
        const classRefs = content.match(/Security\w+\./g) || [];
        dependencies.push(...classRefs.map(ref => ref.replace('.', '') + '.js'));
        
        return [...new Set(dependencies)]; // 去重
    }

    /**
     * 計算程式碼複雜度 (簡化版本)
     */
    calculateComplexity(content) {
        const lines = content.split('\n').length;
        const functions = (content.match(/function|=>/g) || []).length;
        const classes = (content.match(/class\s+\w+/g) || []).length;
        const conditionals = (content.match(/if|switch|for|while/g) || []).length;
        
        return {
            lines,
            functions,
            classes,
            conditionals,
            score: Math.round((functions * 2 + classes * 5 + conditionals * 1.5) / lines * 100)
        };
    }

    /**
     * 清理輸入以防止路徑遍歷攻擊
     */
    sanitizePath(inputPath) {
        return path.normalize(inputPath).replace(/^(\.\.[\/\\])+/, '');
    }
}

// 主執行函數
async function main() {
    try {
        const selector = new SecurityModuleSelector();
        const report = await selector.execute();
        
        console.log('\n🎉 SECURITY-01 安全模組選擇與複製任務成功完成！');
        process.exit(0);
        
    } catch (error) {
        console.error('\n💥 SECURITY-01 任務執行失敗:', error.message);
        process.exit(1);
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    main();
}

module.exports = SecurityModuleSelector;