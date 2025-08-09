/**
 * DEPLOY-01: Path Auditor for Static Hosting Compatibility
 * Identifies and fixes hardcoded paths that break static hosting
 */

const fs = require('fs');
const path = require('path');

class PathAuditor {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../');
    this.issues = [];
    this.fixes = [];
    
    // Dangerous path patterns
    this.dangerousPatterns = [
      /\.\.\//g,                    // Parent directory references
      /\/\.\.\//g,                  // Absolute parent references
      /file:\/\//g,                 // File protocol
      /\.\.\\\\?/g,                 // Windows parent references
    ];
    
    // Safe path replacements
    this.pathReplacements = [
      { pattern: /\.\.\/assets\//g, replacement: './assets/' },
      { pattern: /\.\.\/src\//g, replacement: './src/' },
      { pattern: /\.\.\/pwa-card-storage\//g, replacement: './' },
    ];
  }

  /**
   * Audit all files for path issues
   */
  async auditPaths() {
    console.log('[PathAuditor] Starting path audit...');
    
    this.issues = [];
    this.fixes = [];
    
    const filesToAudit = await this.getFilesToAudit();
    
    for (const filePath of filesToAudit) {
      await this.auditFile(filePath);
    }
    
    console.log(`[PathAuditor] Audit complete: ${this.issues.length} issues found`);
    
    return {
      success: this.issues.length === 0,
      issues: this.issues,
      fixes: this.fixes
    };
  }

  /**
   * Get list of files to audit
   */
  async getFilesToAudit() {
    const extensions = ['.html', '.js', '.json', '.css'];
    const excludeDirs = ['node_modules', '.git', 'tests'];
    
    const files = [];
    
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.rootDir, fullPath);
        
        if (entry.isDirectory()) {
          if (!excludeDirs.some(exclude => relativePath.includes(exclude))) {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    scanDir(this.rootDir);
    return files;
  }

  /**
   * Audit individual file
   */
  async auditFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.rootDir, filePath);
      
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        this.dangerousPatterns.forEach(pattern => {
          const matches = [...line.matchAll(pattern)];
          
          matches.forEach(match => {
            this.issues.push({
              file: relativePath,
              line: index + 1,
              column: match.index + 1,
              pattern: pattern.source,
              matchedText: match[0],
              fullLine: line.trim(),
              severity: this.getSeverity(pattern, match[0])
            });
          });
        });
      });
      
      // Generate fixes for this file
      this.generateFixesForFile(filePath, content);
      
    } catch (error) {
      console.error(`[PathAuditor] Error auditing ${filePath}:`, error.message);
    }
  }

  /**
   * Generate fixes for a file
   */
  generateFixesForFile(filePath, content) {
    const relativePath = path.relative(this.rootDir, filePath);
    let hasChanges = false;
    let fixedContent = content;
    
    this.pathReplacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        fixedContent = fixedContent.replace(pattern, replacement);
        hasChanges = true;
        
        this.fixes.push({
          file: relativePath,
          type: 'path_replacement',
          pattern: pattern.source,
          replacement,
          description: `Replace ${pattern.source} with ${replacement}`
        });
      }
    });
    
    if (hasChanges) {
      this.fixes.push({
        file: relativePath,
        type: 'file_update',
        action: 'write_fixed_content',
        content: fixedContent
      });
    }
  }

  /**
   * Get severity level for pattern match
   */
  getSeverity(pattern, match) {
    // Path traversal attempts are critical
    if (pattern.source.includes('\\.\\.')) {
      return 'Critical';
    }
    
    // File protocol is high risk
    if (pattern.source.includes('file:')) {
      return 'High';
    }
    
    // Parent directory references are medium risk
    if (pattern.source.includes('\\.\\.')) {
      return 'Medium';
    }
    
    return 'Low';
  }

  /**
   * Apply fixes automatically
   */
  async applyFixes() {
    console.log('[PathAuditor] Applying fixes...');
    
    let appliedCount = 0;
    let errorCount = 0;
    
    // Group fixes by file
    const fixesByFile = {};
    this.fixes.forEach(fix => {
      if (!fixesByFile[fix.file]) {
        fixesByFile[fix.file] = [];
      }
      fixesByFile[fix.file].push(fix);
    });
    
    for (const [file, fileFixes] of Object.entries(fixesByFile)) {
      try {
        const filePath = path.join(this.rootDir, file);
        
        // Find the content fix
        const contentFix = fileFixes.find(f => f.type === 'file_update');
        if (contentFix) {
          // Create backup
          const backupPath = filePath + '.backup';
          if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
          }
          
          // Apply fix
          fs.writeFileSync(filePath, contentFix.content, 'utf8');
          console.log(`[PathAuditor] Fixed: ${file}`);
          appliedCount++;
        }
      } catch (error) {
        console.error(`[PathAuditor] Error applying fix to ${file}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`[PathAuditor] Fixes applied: ${appliedCount} success, ${errorCount} errors`);
    
    return {
      success: errorCount === 0,
      applied: appliedCount,
      errors: errorCount
    };
  }

  /**
   * Generate audit report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        totalFixes: this.fixes.length,
        severityBreakdown: this.getSeverityBreakdown(),
        fileBreakdown: this.getFileBreakdown()
      },
      issues: this.issues,
      fixes: this.fixes,
      recommendations: this.getRecommendations()
    };
    
    const reportPath = path.join(this.rootDir, 'deploy/path-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('[PathAuditor] Audit report generated');
    return report;
  }

  /**
   * Get severity breakdown
   */
  getSeverityBreakdown() {
    const breakdown = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    this.issues.forEach(issue => {
      breakdown[issue.severity] = (breakdown[issue.severity] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Get file breakdown
   */
  getFileBreakdown() {
    const breakdown = {};
    this.issues.forEach(issue => {
      breakdown[issue.file] = (breakdown[issue.file] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Get recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.issues.some(i => i.severity === 'Critical')) {
      recommendations.push({
        priority: 'High',
        action: 'Fix critical path traversal vulnerabilities immediately',
        description: 'Critical security issues found that could allow unauthorized file access'
      });
    }
    
    if (this.issues.some(i => i.pattern.includes('\\.\\.'))) {
      recommendations.push({
        priority: 'Medium',
        action: 'Replace all parent directory references with relative paths',
        description: 'Use ./assets/ instead of ./assets/ for static hosting compatibility'
      });
    }
    
    if (this.fixes.length > 0) {
      recommendations.push({
        priority: 'Low',
        action: 'Apply automated fixes',
        description: `${this.fixes.length} automated fixes available`
      });
    }
    
    return recommendations;
  }

  /**
   * Validate paths are secure
   */
  validatePathSecurity(filePath) {
    // Check for path traversal attempts
    if (filePath.includes('..')) {
      return false;
    }
    
    // Check for absolute paths outside project
    if (path.isAbsolute(filePath) && !filePath.startsWith(this.rootDir)) {
      return false;
    }
    
    // Check for dangerous protocols
    if (filePath.startsWith('file://') || filePath.startsWith('ftp://')) {
      return false;
    }
    
    return true;
  }
}

// CLI usage
if (require.main === module) {
  const auditor = new PathAuditor();
  
  (async () => {
    try {
      const auditResult = await auditor.auditPaths();
      const report = auditor.generateReport();
      
      console.log('\n=== DEPLOY-01 Path Audit Summary ===');
      console.log(`Total issues: ${auditResult.issues.length}`);
      console.log(`Critical: ${report.summary.severityBreakdown.Critical || 0}`);
      console.log(`High: ${report.summary.severityBreakdown.High || 0}`);
      console.log(`Medium: ${report.summary.severityBreakdown.Medium || 0}`);
      console.log(`Low: ${report.summary.severityBreakdown.Low || 0}`);
      console.log(`Fixes available: ${auditResult.fixes.length}`);
      
      if (process.argv.includes('--fix')) {
        const fixResult = await auditor.applyFixes();
        console.log(`Fixes applied: ${fixResult.applied}`);
        console.log(`Fix errors: ${fixResult.errors}`);
      }
      
      process.exit(auditResult.success ? 0 : 1);
    } catch (error) {
      console.error('[PathAuditor] Fatal error:', error);
      process.exit(1);
    }
  })();
}

module.exports = PathAuditor;