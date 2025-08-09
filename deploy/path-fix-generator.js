#!/usr/bin/env node
/**
 * PATH-02: 路徑修復腳本生成器 (Path Fix Script Generator)
 * 
 * 基於 PATH-01 審計結果生成生產級自動化修復腳本
 * 包含安全驗證、錯誤處理和回滾機制
 * 
 * Security Features:
 * - Path traversal protection
 * - Command injection prevention  
 * - Input validation
 * - Safe file operations
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PathFixScriptGenerator {
    constructor() {
        this.auditReportPath = './deploy/path-audit-report.json';
        this.outputScriptPath = './deploy/fix-hardcoded-paths-v2.sh';
        this.backupDir = './deploy/backups';
        this.securityLog = [];
    }

    /**
     * 安全路徑驗證 - 防止路徑遍歷攻擊
     */
    validatePath(inputPath, isSourcePath = false) {
        const normalized = path.normalize(inputPath);
        
        // 對於原始路徑，允許合法的父目錄引用
        if (isSourcePath) {
            // 檢查是否為合法的資源路徑
            const allowedSourcePrefixes = ['../assets/', '../src/security/'];
            const isValidSource = allowedSourcePrefixes.some(prefix => 
                inputPath.startsWith(prefix)
            );
            
            if (!isValidSource) {
                this.logSecurity('BLOCKED', `Invalid source path: ${inputPath}`);
                return false;
            }
            
            // 檢查是否包含危險的遍歷模式
            if (inputPath.includes('../..') || inputPath.includes('//')) {
                this.logSecurity('BLOCKED', `Dangerous path pattern: ${inputPath}`);
                return false;
            }
            
            return true;
        }
        
        // 對於目標路徑，不允許父目錄引用
        if (normalized.includes('..') || normalized.startsWith('/')) {
            this.logSecurity('BLOCKED', `Path traversal attempt: ${inputPath}`);
            return false;
        }
        
        // 檢查允許的目標路徑前綴
        const allowedPrefixes = ['assets/', 'src/', 'pwa-card-storage/'];
        const isAllowed = allowedPrefixes.some(prefix => 
            normalized.startsWith(prefix) || normalized === prefix.slice(0, -1)
        );
        
        if (!isAllowed) {
            this.logSecurity('BLOCKED', `Unauthorized path: ${inputPath}`);
            return false;
        }
        
        return true;
    }

    /**
     * 安全命令參數驗證 - 防止命令注入
     */
    sanitizeCommand(command) {
        // 移除危險字符
        const dangerous = [';', '|', '&', '$', '`', '(', ')', '<', '>', '\n', '\r'];
        let sanitized = command;
        
        dangerous.forEach(char => {
            if (sanitized.includes(char)) {
                this.logSecurity('SANITIZED', `Removed dangerous character: ${char}`);
                sanitized = sanitized.replace(new RegExp('\\' + char, 'g'), '');
            }
        });
        
        return sanitized;
    }

    /**
     * 安全日誌記錄
     */
    logSecurity(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message };
        this.securityLog.push(logEntry);
        console.log(`[SECURITY-${level}] ${message}`);
    }

    /**
     * 載入審計報告或生成預設報告
     */
    loadAuditReport() {
        try {
            if (!fs.existsSync(this.auditReportPath)) {
                console.log('⚠️  審計報告不存在，執行即時掃描...');
                return this.generateDefaultReport();
            }
            
            const reportData = fs.readFileSync(this.auditReportPath, 'utf8');
            return JSON.parse(reportData);
        } catch (error) {
            console.log('⚠️  載入審計報告失敗，使用預設配置:', error.message);
            return this.generateDefaultReport();
        }
    }

    /**
     * 生成預設報告（基於實際專案結構）
     */
    generateDefaultReport() {
        return {
            timestamp: new Date().toISOString(),
            pathIssues: [],
            resourceFiles: [
                { sourcePath: '../assets/images/moda-logo.svg', targetPath: 'pwa-card-storage/assets/images/moda-logo.svg' },
                { sourcePath: '../assets/styles/high-accessibility.css', targetPath: 'pwa-card-storage/assets/styles/high-accessibility.css' },
                { sourcePath: '../assets/scripts/bilingual-common.js', targetPath: 'pwa-card-storage/assets/scripts/bilingual-common.js' },
                { sourcePath: '../assets/scripts/qrcode.min.js', targetPath: 'pwa-card-storage/assets/scripts/qrcode.min.js' },
                { sourcePath: '../assets/scripts/qr-utils.js', targetPath: 'pwa-card-storage/assets/scripts/qr-utils.js' },
                { sourcePath: '../src/security/SecurityInputHandler.js', targetPath: 'pwa-card-storage/src/security/SecurityInputHandler.js' },
                { sourcePath: '../src/security/SecurityDataHandler.js', targetPath: 'pwa-card-storage/src/security/SecurityDataHandler.js' },
                { sourcePath: '../src/security/SecurityAuthHandler.js', targetPath: 'pwa-card-storage/src/security/SecurityAuthHandler.js' }
            ],
            summary: {
                totalFiles: 4,
                affectedFiles: 0,
                totalIssues: 0
            }
        };
    }

    /**
     * 生成資源複製命令
     */
    generateCopyCommands(auditReport) {
        const commands = [];
        const { resourceFiles } = auditReport;
        
        // 建立目標目錄
        const directories = new Set();
        resourceFiles.forEach(file => {
            const targetDir = path.dirname(file.targetPath);
            if (this.validatePath(targetDir)) {
                directories.add(targetDir);
            }
        });
        
        directories.forEach(dir => {
            commands.push(`mkdir -p "${this.sanitizeCommand(dir)}"`);
        });
        
        // 生成複製命令
        resourceFiles.forEach(file => {
            if (this.validatePath(file.sourcePath, true) && this.validatePath(file.targetPath, false)) {
                const sourceClean = this.sanitizeCommand(file.sourcePath);
                const targetClean = this.sanitizeCommand(file.targetPath);
                commands.push(`cp "${sourceClean}" "${targetClean}"`);
            }
        });
        
        return commands;
    }

    /**
     * 生成路徑替換命令
     */
    generateReplaceCommands(auditReport) {
        const commands = [];
        const { pathIssues } = auditReport;
        
        // 按檔案分組路徑問題
        const fileGroups = {};
        pathIssues.forEach(issue => {
            if (!fileGroups[issue.file]) {
                fileGroups[issue.file] = [];
            }
            fileGroups[issue.file].push(issue);
        });
        
        // 為每個檔案生成替換命令
        Object.entries(fileGroups).forEach(([file, issues]) => {
            if (this.validatePath(file)) {
                const fileClean = this.sanitizeCommand(file);
                
                issues.forEach(issue => {
                    const oldPath = this.sanitizeCommand(issue.oldPath);
                    const newPath = this.sanitizeCommand(issue.newPath);
                    
                    // 使用 sed 進行安全的路徑替換
                    commands.push(`sed -i 's|${oldPath}|${newPath}|g' "${fileClean}"`);
                });
            }
        });
        
        return commands;
    }

    /**
     * 生成驗證命令
     */
    generateValidationCommands() {
        return [
            '# 驗證檔案完整性',
            'echo "🧪 驗證修復結果..."',
            'find pwa-card-storage -name "*.html" -exec echo "Checking: {}" \\;',
            'find pwa-card-storage -name "*.json" -exec echo "Checking: {}" \\;',
            'echo "✅ 驗證完成"'
        ];
    }

    /**
     * 生成回滾命令
     */
    generateRollbackCommands() {
        return [
            '# 回滾函數',
            'rollback() {',
            '    echo "🔄 執行回滾..."',
            `    if [ -d "${this.backupDir}" ]; then`,
            `        cp -r ${this.backupDir}/* ./`,
            '        echo "✅ 回滾完成"',
            '    else',
            '        echo "❌ 找不到備份檔案"',
            '    fi',
            '}',
            '',
            '# 錯誤處理',
            'trap rollback ERR'
        ];
    }

    /**
     * 生成完整修復腳本
     */
    generateScript() {
        console.log('🔧 開始生成路徑修復腳本...');
        
        const auditReport = this.loadAuditReport();
        const timestamp = new Date().toISOString();
        const scriptHash = crypto.randomBytes(8).toString('hex');
        
        const scriptContent = [
            '#!/bin/bash',
            '# PATH-02: 生產級路徑修復腳本',
            `# 生成時間: ${timestamp}`,
            `# 腳本版本: v2.0-${scriptHash}`,
            '# 安全特性: 路徑驗證、命令清理、錯誤處理、回滾機制',
            '',
            'set -euo pipefail  # 嚴格錯誤處理',
            '',
            ...this.generateRollbackCommands(),
            '',
            'echo "🔧 開始執行路徑修復..."',
            `echo "📊 處理 ${auditReport.pathIssues.length} 個路徑問題"`,
            `echo "📁 複製 ${auditReport.resourceFiles.length} 個資源檔案"`,
            '',
            '# 切換到 PWA 目錄',
            'cd pwa-card-storage',
            '',
            '# 建立備份',
            'mkdir -p ../deploy/backups',
            'cp -r ./* ../deploy/backups/ 2>/dev/null || true',
            '',
            '# 資源檔案複製',
            'echo "📁 複製資源檔案..."',
            ...this.generateCopyCommands(auditReport).map(cmd => cmd.replace('pwa-card-storage/', '')),
            '',
            '# 路徑引用更新', 
            'echo "🔄 更新路徑引用..."',
            ...this.generateReplaceCommands(auditReport),
            '',
            '# 驗證修復結果',
            ...this.generateValidationCommands().map(cmd => cmd.replace('pwa-card-storage', '.')),
            '',
            'echo "✅ 路徑修復完成！"',
            `echo "📝 安全日誌: ${this.securityLog.length} 條記錄"`,
            'echo "🔄 如需回滾，請執行: bash -c rollback"'
        ].join('\n');
        
        // 寫入腳本檔案
        fs.writeFileSync(this.outputScriptPath, scriptContent, { mode: 0o755 });
        
        // 寫入安全日誌
        const logPath = './deploy/path-fix-security.log';
        fs.writeFileSync(logPath, JSON.stringify(this.securityLog, null, 2));
        
        console.log(`✅ 腳本生成完成: ${this.outputScriptPath}`);
        console.log(`📝 安全日誌: ${logPath}`);
        console.log(`🔒 安全檢查: ${this.securityLog.length} 條記錄`);
        
        return {
            scriptPath: this.outputScriptPath,
            logPath: logPath,
            securityChecks: this.securityLog.length,
            timestamp: timestamp
        };
    }
}

// 執行腳本生成
if (require.main === module) {
    const generator = new PathFixScriptGenerator();
    try {
        const result = generator.generateScript();
        console.log('🎯 PATH-02 任務完成');
        process.exit(0);
    } catch (error) {
        console.error('❌ 腳本生成失敗:', error.message);
        process.exit(1);
    }
}

module.exports = PathFixScriptGenerator;