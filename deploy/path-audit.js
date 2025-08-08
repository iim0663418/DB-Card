#!/usr/bin/env node

/**
 * PWA 硬編碼路徑審計工具 v3.2.0
 * 專門掃描 PWA 專案中的硬編碼路徑問題，生成詳細修復建議
 * 
 * 功能：
 * - 識別所有 `../` 向上引用
 * - 掃描 HTML、JSON、JS 檔案中的硬編碼路徑
 * - 生成具體的修復命令
 * - 提供安全驗證和錯誤處理
 */

const fs = require('fs');
const path = require('path');

class PWAPathAuditor {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = this.sanitizePath(projectRoot);
    this.pwaDirPath = path.join(this.projectRoot, 'pwa-card-storage');
    
    // 路徑模式定義
    this.patterns = {
      upwardReference: /\.\.\//g,
      assetReference: /\.\.\/assets\/[^\s"']+/g,
      srcSecurityReference: /\.\.\/src\/security\/[^\s"']+/g,
      manifestIconReference: /"src":\s*"[^"]*\.\.\//g,
      scriptSrcReference: /<script[^>]+src=["'][^"']*\.\.\//g,
      linkHrefReference: /<link[^>]+href=["'][^"']*\.\.\//g
    };

    // 已知問題的目標檔案
    this.targetFiles = [
      'pwa-card-storage/index.html',
      'pwa-card-storage/manifest.json',
      'pwa-card-storage/manifest-github.json',
      'pwa-card-storage/sw.js'
    ];
  }

  /**
   * 路徑安全驗證，防止路徑遍歷攻擊
   */
  sanitizePath(inputPath) {
    const resolved = path.resolve(inputPath);
    if (!resolved.startsWith(process.cwd())) {
      throw new Error('Invalid path: Path traversal detected');
    }
    return resolved;
  }

  /**
   * 執行完整的路徑審計
   */
  async auditProject() {
    console.log('🔍 PWA 硬編碼路徑審計工具 v3.2.0');
    console.log('=' .repeat(50));
    console.log(`專案根目錄: ${this.projectRoot}`);
    console.log(`PWA 目錄: ${this.pwaDirPath}`);
    console.log();

    const auditResult = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      affectedFiles: [],
      pathIssues: [],
      fixSuggestions: [],
      summary: {
        upwardReferences: 0,
        hardcodedPaths: 0,
        securityModules: 0,
        manifestIssues: 0
      }
    };

    try {
      // 掃描目標檔案
      for (const targetFile of this.targetFiles) {
        const filePath = path.join(this.projectRoot, targetFile);
        if (fs.existsSync(filePath)) {
          auditResult.totalFiles++;
          await this.scanFile(filePath, auditResult);
        }
      }

      // 生成修復建議
      this.generateFixSuggestions(auditResult);
      
      // 生成摘要
      this.generateSummary(auditResult);

      return auditResult;
    } catch (error) {
      console.error('❌ 審計過程發生錯誤:', error.message);
      throw error;
    }
  }

  /**
   * 掃描單一檔案
   */
  async scanFile(filePath, auditResult) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);
      const fileExtension = path.extname(filePath);
      
      const affectedFile = {
        filePath: relativePath,
        fileType: this.getFileType(fileExtension),
        issues: []
      };

      const lines = content.split('\n');

      // 掃描各種路徑模式
      for (const [patternName, pattern] of Object.entries(this.patterns)) {
        let match;
        const globalPattern = new RegExp(pattern.source, 'g');
        
        while ((match = globalPattern.exec(content)) !== null) {
          const lineNumber = this.getLineNumber(content, match.index);
          const columnNumber = match.index - content.lastIndexOf('\n', match.index) - 1;
          
          const issue = {
            lineNumber: lineNumber,
            columnNumber: columnNumber,
            issueType: this.getIssueType(patternName),
            originalPath: match[0],
            suggestedPath: this.generateSuggestedPath(match[0], relativePath),
            severity: this.getSeverity(patternName),
            context: lines[lineNumber - 1]?.trim() || ''
          };

          affectedFile.issues.push(issue);
          auditResult.pathIssues.push({
            ...issue,
            filePath: relativePath
          });

          // 更新統計
          this.updateSummary(auditResult.summary, patternName);
        }
      }

      if (affectedFile.issues.length > 0) {
        auditResult.affectedFiles.push(affectedFile);
      }

    } catch (error) {
      console.warn(`⚠️  無法掃描檔案 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 獲取檔案類型
   */
  getFileType(extension) {
    const typeMap = {
      '.html': 'html',
      '.js': 'js', 
      '.json': 'json',
      '.css': 'css'
    };
    return typeMap[extension] || 'unknown';
  }

  /**
   * 獲取行號
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 獲取問題類型
   */
  getIssueType(patternName) {
    const typeMap = {
      upwardReference: 'upward-reference',
      assetReference: 'hardcoded-path',
      srcSecurityReference: 'hardcoded-path',
      manifestIconReference: 'manifest-icon',
      scriptSrcReference: 'hardcoded-path',
      linkHrefReference: 'hardcoded-path'
    };
    return typeMap[patternName] || 'unknown';
  }

  /**
   * 生成建議路徑
   */
  generateSuggestedPath(originalPath, filePath) {
    if (originalPath.includes('../assets/')) {
      return originalPath.replace('../assets/', './assets/');
    }
    if (originalPath.includes('../src/security/')) {
      return originalPath.replace('../src/security/', './src/security/');
    }
    return originalPath.replace('../', './');
  }

  /**
   * 獲取嚴重程度
   */
  getSeverity(patternName) {
    const severityMap = {
      upwardReference: 'high',
      assetReference: 'critical',
      srcSecurityReference: 'critical',
      manifestIconReference: 'high',
      scriptSrcReference: 'critical',
      linkHrefReference: 'medium'
    };
    return severityMap[patternName] || 'low';
  }

  /**
   * 更新統計摘要
   */
  updateSummary(summary, patternName) {
    if (patternName.includes('upward')) {
      summary.upwardReferences++;
    }
    if (patternName.includes('asset') || patternName.includes('src')) {
      summary.hardcodedPaths++;
    }
    if (patternName.includes('security')) {
      summary.securityModules++;
    }
    if (patternName.includes('manifest')) {
      summary.manifestIssues++;
    }
  }

  /**
   * 生成修復建議
   */
  generateFixSuggestions(auditResult) {
    const suggestions = [];
    const resourcesToCopy = new Set();
    const securityModulesToCopy = new Set();

    // 分析需要複製的資源
    auditResult.pathIssues.forEach(issue => {
      if (issue.originalPath.includes('../assets/')) {
        const resourcePath = issue.originalPath.replace('../assets/', '');
        resourcesToCopy.add(resourcePath);
      }
      if (issue.originalPath.includes('../src/security/')) {
        const modulePath = issue.originalPath.replace('../src/security/', '');
        securityModulesToCopy.add(modulePath);
      }
    });

    // 資源複製建議
    if (resourcesToCopy.size > 0) {
      suggestions.push({
        action: 'copy-resource',
        source: '../assets/',
        target: 'assets/',
        command: this.generateCopyCommands(Array.from(resourcesToCopy), '../assets/', 'assets/'),
        description: '複製核心資源檔案到 PWA 目錄'
      });
    }

    // 安全模組複製建議
    if (securityModulesToCopy.size > 0) {
      suggestions.push({
        action: 'copy-security-modules',
        source: '../src/security/',
        target: 'src/security/',
        command: this.generateCopyCommands(Array.from(securityModulesToCopy), '../src/security/', 'src/security/'),
        description: '複製核心安全模組到 PWA 目錄'
      });
    }

    // 路徑更新建議
    if (auditResult.pathIssues.length > 0) {
      suggestions.push({
        action: 'update-paths',
        source: 'various',
        target: 'various',
        command: this.generatePathUpdateCommands(auditResult.affectedFiles),
        description: '更新檔案中的硬編碼路徑引用'
      });
    }

    auditResult.fixSuggestions = suggestions;
  }

  /**
   * 生成複製命令
   */
  generateCopyCommands(resources, sourcePrefix, targetPrefix) {
    return resources.map(resource => {
      const sourcePath = sourcePrefix + resource;
      const targetPath = targetPrefix + this.getTargetPath(resource);
      return `cp ${sourcePath} ${targetPath}`;
    });
  }

  /**
   * 獲取目標路徑
   */
  getTargetPath(resource) {
    // 根據資源類型決定目標路徑
    if (resource.endsWith('.svg') || resource.endsWith('.png') || resource.endsWith('.jpg')) {
      return 'images/' + path.basename(resource);
    }
    if (resource.endsWith('.js')) {
      return 'scripts/' + path.basename(resource);
    }
    if (resource.endsWith('.css')) {
      return 'styles/' + path.basename(resource);
    }
    return resource;
  }

  /**
   * 生成路徑更新命令
   */
  generatePathUpdateCommands(affectedFiles) {
    return affectedFiles.map(file => {
      return `sed -i 's|\\.\\.\/assets\/|\.\/assets\/|g' ${file.filePath} && sed -i 's|\\.\\.\/src\/security\/|\.\/src\/security\/|g' ${file.filePath}`;
    });
  }

  /**
   * 生成最終摘要
   */
  generateSummary(auditResult) {
    auditResult.summary.totalFiles = auditResult.totalFiles;
    auditResult.summary.affectedFiles = auditResult.affectedFiles.length;
    auditResult.summary.totalIssues = auditResult.pathIssues.length;
  }

  /**
   * 列印詳細報告
   */
  printDetailedReport(auditResult) {
    console.log('📊 硬編碼路徑審計報告');
    console.log('=' .repeat(50));
    console.log(`掃描檔案總數: ${auditResult.summary.totalFiles}`);
    console.log(`受影響檔案: ${auditResult.summary.affectedFiles}`);
    console.log(`問題總數: ${auditResult.summary.totalIssues}`);
    console.log();

    if (auditResult.summary.totalIssues > 0) {
      console.log('🔍 受影響的檔案:');
      auditResult.affectedFiles.forEach(file => {
        console.log(`  📄 ${file.filePath} (${file.issues.length} 個問題)`);
        file.issues.forEach(issue => {
          console.log(`    ⚠️  Line ${issue.lineNumber}: ${issue.originalPath}`);
        });
        console.log();
      });

      console.log('🛠️  修復建議:');
      auditResult.fixSuggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.description}`);
        if (Array.isArray(suggestion.command)) {
          suggestion.command.slice(0, 5).forEach(cmd => {
            console.log(`   ${cmd}`);
          });
          if (suggestion.command.length > 5) {
            console.log(`   ... 還有 ${suggestion.command.length - 5} 個命令`);
          }
        } else {
          console.log(`   ${suggestion.command}`);
        }
        console.log();
      });

      console.log('💡 執行審計工具:');
      console.log('   cd pwa-card-storage && node ../deploy/path-audit.js');
      console.log();
      console.log('🔧 生成修復腳本:');
      console.log('   node ../deploy/path-audit.js --fix');
      console.log('   bash fix-hardcoded-paths.sh');
    } else {
      console.log('✅ 未發現硬編碼路徑問題！');
    }
  }

  /**
   * 生成修復腳本
   */
  generateFixScript(auditResult) {
    const scriptLines = [
      '#!/bin/bash',
      '# 自動生成的路徑修復腳本',
      '# 生成時間: ' + new Date().toISOString(),
      '',
      'echo "🔧 開始修復硬編碼路徑問題..."',
      '',
      '# 建立目標目錄',
      'mkdir -p assets/images assets/scripts assets/styles src/security',
      ''
    ];

    auditResult.fixSuggestions.forEach(suggestion => {
      scriptLines.push(`# ${suggestion.description}`);
      if (Array.isArray(suggestion.command)) {
        scriptLines.push(...suggestion.command);
      } else {
        scriptLines.push(suggestion.command);
      }
      scriptLines.push('');
    });

    scriptLines.push('echo "✅ 路徑修復完成！"');
    scriptLines.push('echo "🧪 請執行測試驗證修復結果"');

    return scriptLines.join('\n');
  }
}

/**
 * 主執行函數
 */
async function main() {
  const args = process.argv.slice(2);
  const generateFix = args.includes('--fix');

  try {
    const auditor = new PWAPathAuditor();
    const results = await auditor.auditProject();
    
    auditor.printDetailedReport(results);

    if (generateFix && results.summary.totalIssues > 0) {
      const fixScript = auditor.generateFixScript(results);
      const scriptPath = path.join(process.cwd(), 'fix-hardcoded-paths.sh');
      fs.writeFileSync(scriptPath, fixScript, { mode: 0o755 });
      console.log(`🔧 修復腳本已生成: ${scriptPath}`);
    }

    // 返回適當的退出碼
    process.exit(results.summary.totalIssues > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = PWAPathAuditor;