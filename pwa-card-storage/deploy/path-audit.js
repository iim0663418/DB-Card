/**
 * Path Audit Tool - v3.2.0-pwa-deployment-compatibility
 * 掃描並修復硬編碼路徑問題
 */

class PathAuditor {
    constructor() {
        this.patterns = {
            upwardReference: /\.\.\//g,
            assetPath: /\/assets\/[^\s"']+/g,
            srcPath: /\/src\/[^\s"']+/g,
            manifestIcon: /"src":\s*"[^"]*\.\.\//g,
            relativeAsset: /href="\.\/assets\//g,
            relativeSrc: /src="\.\/assets\//g
        };
        
        this.results = {
            totalFiles: 0,
            affectedFiles: [],
            pathIssues: [],
            fixSuggestions: [],
            summary: {
                upwardReferences: 0,
                hardcodedPaths: 0,
                manifestIssues: 0,
                relativeIssues: 0
            }
        };
    }

    /**
     * 執行路徑審計
     */
    async auditProject() {
        console.log('[Path Audit] Starting project audit...');
        
        // 掃描 HTML 檔案
        await this.scanFile('index.html', 'html');
        
        // 掃描 Manifest 檔案
        await this.scanFile('manifest.json', 'json');
        await this.scanFile('manifest-github.json', 'json');
        
        // 掃描 Service Worker
        await this.scanFile('sw.js', 'js');
        
        // 生成修復建議
        this.generateFixSuggestions();
        
        return this.results;
    }

    /**
     * 掃描單一檔案
     */
    async scanFile(filePath, fileType) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                console.warn(`[Path Audit] Cannot read ${filePath}: ${response.status}`);
                return;
            }
            
            const content = await response.text();
            const lines = content.split('\n');
            const issues = [];
            
            lines.forEach((line, index) => {
                // 檢查向上引用
                const upwardMatches = line.match(this.patterns.upwardReference);
                if (upwardMatches) {
                    issues.push({
                        lineNumber: index + 1,
                        columnNumber: line.indexOf('../'),
                        issueType: 'upward-reference',
                        originalPath: upwardMatches[0],
                        suggestedPath: this.fixUpwardReference(upwardMatches[0]),
                        severity: 'critical'
                    });
                    this.results.summary.upwardReferences++;
                }
                
                // 檢查相對路徑問題
                const relativeAssetMatches = line.match(this.patterns.relativeAsset);
                if (relativeAssetMatches) {
                    issues.push({
                        lineNumber: index + 1,
                        columnNumber: line.indexOf('./assets/'),
                        issueType: 'relative-asset-path',
                        originalPath: relativeAssetMatches[0],
                        suggestedPath: relativeAssetMatches[0].replace('./assets/', 'assets/'),
                        severity: 'medium'
                    });
                    this.results.summary.relativeIssues++;
                }
                
                const relativeSrcMatches = line.match(this.patterns.relativeSrc);
                if (relativeSrcMatches) {
                    issues.push({
                        lineNumber: index + 1,
                        columnNumber: line.indexOf('./assets/'),
                        issueType: 'relative-src-path',
                        originalPath: relativeSrcMatches[0],
                        suggestedPath: relativeSrcMatches[0].replace('./assets/', 'assets/'),
                        severity: 'medium'
                    });
                    this.results.summary.relativeIssues++;
                }
            });
            
            if (issues.length > 0) {
                this.results.affectedFiles.push({
                    filePath,
                    fileType,
                    issues
                });
                this.results.pathIssues.push(...issues);
            }
            
            this.results.totalFiles++;
            
        } catch (error) {
            console.error(`[Path Audit] Error scanning ${filePath}:`, error);
        }
    }

    /**
     * 修復向上引用
     */
    fixUpwardReference(path) {
        return path.replace(/\.\.\//g, '');
    }

    /**
     * 生成修復建議
     */
    generateFixSuggestions() {
        const suggestions = [];
        
        // 資源複製建議
        if (this.results.summary.upwardReferences > 0) {
            suggestions.push({
                action: 'copy-resource',
                source: './assets/',
                target: './assets/',
                command: 'cp -r ./assets/* ./assets/',
                description: '複製根目錄資源到 PWA 目錄'
            });
        }
        
        // 路徑更新建議
        this.results.pathIssues.forEach(issue => {
            if (issue.issueType === 'upward-reference') {
                suggestions.push({
                    action: 'update-path',
                    source: issue.originalPath,
                    target: issue.suggestedPath,
                    command: `sed -i 's|${issue.originalPath}|${issue.suggestedPath}|g' ${this.results.affectedFiles.find(f => f.issues.includes(issue))?.filePath}`,
                    description: `更新 ${issue.originalPath} 為 ${issue.suggestedPath}`
                });
            }
        });
        
        this.results.fixSuggestions = suggestions;
    }

    /**
     * 生成修復腳本
     */
    generateFixScript() {
        const commands = [
            '#!/bin/bash',
            '# PWA 路徑修復腳本 - v3.2.0-pwa-deployment-compatibility',
            '# 自動生成於 ' + new Date().toISOString(),
            '',
            'echo "開始修復 PWA 路徑問題..."',
            ''
        ];
        
        // 資源複製命令
        const copyCommands = this.results.fixSuggestions
            .filter(fix => fix.action === 'copy-resource')
            .map(fix => fix.command);
        
        if (copyCommands.length > 0) {
            commands.push('# 複製資源檔案');
            commands.push(...copyCommands);
            commands.push('');
        }
        
        // 路徑更新命令
        const updateCommands = this.results.fixSuggestions
            .filter(fix => fix.action === 'update-path')
            .map(fix => fix.command);
        
        if (updateCommands.length > 0) {
            commands.push('# 更新路徑引用');
            commands.push(...updateCommands);
            commands.push('');
        }
        
        commands.push('echo "路徑修復完成！"');
        
        return commands.join('\n');
    }

    /**
     * 輸出審計報告
     */
    printReport() {
        console.log('\n=== PWA 路徑審計報告 ===');
        console.log(`掃描檔案數: ${this.results.totalFiles}`);
        console.log(`受影響檔案: ${this.results.affectedFiles.length}`);
        console.log(`向上引用問題: ${this.results.summary.upwardReferences}`);
        console.log(`相對路徑問題: ${this.results.summary.relativeIssues}`);
        console.log(`修復建議數: ${this.results.fixSuggestions.length}`);
        
        if (this.results.affectedFiles.length > 0) {
            console.log('\n受影響的檔案:');
            this.results.affectedFiles.forEach(file => {
                console.log(`  ${file.filePath} (${file.issues.length} 個問題)`);
                file.issues.forEach(issue => {
                    console.log(`    Line ${issue.lineNumber}: ${issue.originalPath} → ${issue.suggestedPath}`);
                });
            });
        }
        
        return this.results;
    }
}

// 如果在瀏覽器環境中運行
if (typeof window !== 'undefined') {
    window.PathAuditor = PathAuditor;
    
    // 提供全域函數供控制台使用
    window.runPathAudit = async function() {
        const auditor = new PathAuditor();
        const results = await auditor.auditProject();
        auditor.printReport();
        
        // 生成修復腳本
        const fixScript = auditor.generateFixScript();
        console.log('\n=== 修復腳本 ===');
        console.log(fixScript);
        
        // 提供下載修復腳本的功能
        const blob = new Blob([fixScript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pwa-path-fix.sh';
        a.textContent = '下載修復腳本';
        a.style.cssText = 'display: block; margin: 10px 0; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; width: fit-content;';
        document.body.appendChild(a);
        
        return results;
    };
}

// Node.js 環境支援
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PathAuditor;
}