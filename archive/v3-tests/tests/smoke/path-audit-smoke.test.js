/**
 * PATH-01 硬編碼路徑審計工具煙霧測試
 * 驗證路徑審計工具的核心功能
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const PWAPathAuditor = require('../../deploy/path-audit.js');

describe('PATH-01: 硬編碼路徑審計工具', function() {
  let auditor;
  let projectRoot;

  before(function() {
    projectRoot = path.resolve(__dirname, '../..');
    auditor = new PWAPathAuditor(projectRoot);
  });

  describe('基本功能測試', function() {
    it('應該能夠創建審計工具實例', function() {
      assert(auditor instanceof PWAPathAuditor);
      assert.strictEqual(typeof auditor.auditProject, 'function');
    });

    it('應該能夠識別路徑模式', function() {
      assert(auditor.patterns.upwardReference);
      assert(auditor.patterns.assetReference);
      assert(auditor.patterns.srcSecurityReference);
      assert(auditor.patterns.manifestIconReference);
    });

    it('應該能夠安全驗證路徑', function() {
      // 測試正常路徑
      const safePath = auditor.sanitizePath(projectRoot);
      assert(safePath.includes('DB-Card'));

      // 測試路徑遍歷攻擊防護
      try {
        auditor.sanitizePath('../../etc/passwd');
        assert.fail('應該拋出路徑遍歷錯誤');
      } catch (error) {
        assert(error.message.includes('Path traversal detected'));
      }
    });
  });

  describe('掃描功能測試', function() {
    it('應該能夠執行完整專案掃描', async function() {
      this.timeout(10000); // 增加超時時間

      const results = await auditor.auditProject();
      
      // 驗證結果結構
      assert(typeof results === 'object');
      assert(typeof results.totalFiles === 'number');
      assert(Array.isArray(results.affectedFiles));
      assert(Array.isArray(results.pathIssues));
      assert(Array.isArray(results.fixSuggestions));
      assert(typeof results.summary === 'object');
    });

    it('應該能夠識別已知的硬編碼路徑問題', async function() {
      this.timeout(10000);

      const results = await auditor.auditProject();
      
      // 驗證找到了預期的問題
      assert(results.summary.totalIssues > 0, '應該找到硬編碼路徑問題');
      assert(results.affectedFiles.length > 0, '應該有受影響的檔案');
      
      // 驗證找到了 PWA index.html 中的問題
      const indexHtmlIssues = results.affectedFiles.find(
        file => file.filePath.includes('pwa-card-storage/index.html')
      );
      assert(indexHtmlIssues, '應該找到 index.html 中的問題');
      assert(indexHtmlIssues.issues.length > 0, 'index.html 應該有硬編碼路徑問題');
    });

    it('應該能夠生成修復建議', async function() {
      this.timeout(10000);

      const results = await auditor.auditProject();
      
      assert(results.fixSuggestions.length > 0, '應該生成修復建議');
      
      // 驗證修復建議包含資源複製
      const copyResourceSuggestion = results.fixSuggestions.find(
        suggestion => suggestion.action === 'copy-resource'
      );
      assert(copyResourceSuggestion, '應該包含資源複製建議');
      assert(Array.isArray(copyResourceSuggestion.command), '複製命令應該是陣列');
    });
  });

  describe('修復腳本生成測試', function() {
    it('應該能夠生成修復腳本', async function() {
      this.timeout(10000);

      const results = await auditor.auditProject();
      const fixScript = auditor.generateFixScript(results);
      
      assert(typeof fixScript === 'string');
      assert(fixScript.includes('#!/bin/bash'), '應該包含 bash shebang');
      assert(fixScript.includes('mkdir -p'), '應該包含目錄創建命令');
      assert(fixScript.includes('cp ../assets/'), '應該包含資源複製命令');
    });
  });

  describe('安全性測試', function() {
    it('應該防止路徑遍歷攻擊', function() {
      try {
        new PWAPathAuditor('../../../etc');
        assert.fail('應該拋出安全錯誤');
      } catch (error) {
        assert(error.message.includes('Path traversal detected'));
      }
    });

    it('應該安全處理檔案讀取錯誤', async function() {
      // 創建一個指向不存在檔案的審計器
      const tempAuditor = new PWAPathAuditor(projectRoot);
      tempAuditor.targetFiles = ['non-existent-file.html'];
      
      const results = await tempAuditor.auditProject();
      
      // 應該優雅處理錯誤，不會崩潰
      assert(typeof results === 'object');
      assert(results.totalFiles === 0);
    });
  });

  describe('報告格式測試', function() {
    it('應該生成結構化的審計結果', async function() {
      this.timeout(10000);

      const results = await auditor.auditProject();
      
      // 驗證結果包含所有必要欄位
      assert(results.timestamp);
      assert(typeof results.totalFiles === 'number');
      assert(typeof results.summary.totalFiles === 'number');
      assert(typeof results.summary.affectedFiles === 'number');
      assert(typeof results.summary.totalIssues === 'number');
      
      // 驗證問題詳情格式
      if (results.pathIssues.length > 0) {
        const issue = results.pathIssues[0];
        assert(typeof issue.lineNumber === 'number');
        assert(typeof issue.issueType === 'string');
        assert(typeof issue.originalPath === 'string');
        assert(typeof issue.severity === 'string');
      }
    });
  });
});

// 如果直接執行此測試檔案
if (require.main === module) {
  // 使用簡單的測試執行器
  const { execSync } = require('child_process');
  try {
    console.log('🧪 執行 PATH-01 煙霧測試...');
    execSync('npm test -- --grep "PATH-01"', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ 所有測試通過！');
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    process.exit(1);
  }
}