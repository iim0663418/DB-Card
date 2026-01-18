/**
 * Fix Generator Utility Module
 * Generate automated fixes for path issues
 * 
 * @version 3.2.0
 * @author PWA Deployment Compatibility Team
 */

import { loadConfig } from '../core/config-manager.js';

// Fix strategy templates
const FIX_STRATEGIES = {
    parentReference: {
        priority: 1,
        description: 'Convert parent directory references to relative paths',
        generateFix: (issue, config) => {
            const basePath = config.basePath || '/';
            const cleanPath = issue.matchedText.replace(/\.\.\//g, '');
            
            return {
                original: issue.matchedText,
                fixed: cleanPath,
                command: `sed -i 's|${escapeForSed(issue.matchedText)}|${escapeForSed(cleanPath)}|g'`,
                explanation: `Remove parent directory reference: ${issue.matchedText} → ${cleanPath}`
            };
        }
    },
    
    absoluteAssetPath: {
        priority: 2,
        description: 'Convert absolute paths to relative paths with basePath',
        generateFix: (issue, config) => {
            const basePath = config.basePath || '/';
            const match = issue.matchedText.match(/(src|href|url)\s*=\s*["']\/([^"']+)["']/);
            
            if (match) {
                const [fullMatch, attribute, path] = match;
                const relativePath = basePath === '/' ? `./${path}` : `${basePath}${path}`;
                const fixed = fullMatch.replace(`"/${path}"`, `"${relativePath}"`);
                
                return {
                    original: fullMatch,
                    fixed: fixed,
                    command: `sed -i 's|${escapeForSed(fullMatch)}|${escapeForSed(fixed)}|g'`,
                    explanation: `Convert absolute to relative path: ${fullMatch} → ${fixed}`
                };
            }
            
            return null;
        }
    },
    
    relativeAssetPath: {
        priority: 3,
        description: 'Normalize relative paths',
        generateFix: (issue, config) => {
            const normalized = issue.matchedText.replace(/\.\//g, '');
            
            return {
                original: issue.matchedText,
                fixed: normalized,
                command: `sed -i 's|${escapeForSed(issue.matchedText)}|${escapeForSed(normalized)}|g'`,
                explanation: `Normalize relative path: ${issue.matchedText} → ${normalized}`
            };
        }
    },
    
    localhostReference: {
        priority: 4,
        description: 'Remove hardcoded localhost references',
        generateFix: (issue, config) => {
            const fixed = issue.matchedText.replace(/https?:\/\/localhost[:\d]*/, '');
            
            return {
                original: issue.matchedText,
                fixed: fixed,
                command: `sed -i 's|${escapeForSed(issue.matchedText)}|${escapeForSed(fixed)}|g'`,
                explanation: `Remove localhost reference: ${issue.matchedText} → ${fixed}`
            };
        }
    },
    
    mixedSeparators: {
        priority: 5,
        description: 'Normalize path separators to forward slashes',
        generateFix: (issue, config) => {
            const fixed = issue.matchedText.replace(/\\/g, '/');
            
            return {
                original: issue.matchedText,
                fixed: fixed,
                command: `sed -i 's|${escapeForSed(issue.matchedText)}|${escapeForSed(fixed)}|g'`,
                explanation: `Normalize path separators: ${issue.matchedText} → ${fixed}`
            };
        }
    }
};

/**
 * Escape string for use in sed command
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeForSed(str) {
    return str.replace(/[\/&]/g, '\\$&');
}

/**
 * Validate fix safety
 * @param {Object} fix - Fix object to validate
 * @returns {boolean} True if fix is safe
 */
function validateFix(fix) {
    if (!fix || typeof fix !== 'object') {
        return false;
    }
    
    // Check required fields
    if (!fix.original || !fix.fixed || !fix.command) {
        return false;
    }
    
    // Prevent dangerous commands
    const dangerousPatterns = [
        /rm\s+-rf/,
        />\s*\/dev\/null/,
        /sudo/,
        /chmod\s+777/,
        /eval/,
        /exec/
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(fix.command)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Generate fixes for a single issue
 * @param {Object} issue - Issue object from path scanner
 * @param {Object} config - Platform configuration
 * @returns {Object|null} Fix object or null if no fix available
 */
export function generateFix(issue, config) {
    const strategy = FIX_STRATEGIES[issue.patternName];
    
    if (!strategy) {
        console.warn(`[FixGenerator] No strategy found for pattern: ${issue.patternName}`);
        return null;
    }
    
    try {
        const fix = strategy.generateFix(issue, config);
        
        if (fix && validateFix(fix)) {
            return {
                ...fix,
                issueId: `${issue.filePath}:${issue.lineNumber}:${issue.columnNumber}`,
                filePath: issue.filePath,
                lineNumber: issue.lineNumber,
                severity: issue.severity,
                strategy: issue.patternName,
                priority: strategy.priority,
                timestamp: Date.now()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error(`[FixGenerator] Error generating fix for ${issue.patternName}:`, error);
        return null;
    }
}

/**
 * Generate fixes for multiple issues
 * @param {Array} issues - Array of issues from path scanner
 * @param {string} platform - Target platform
 * @returns {Promise<Array>} Array of fix objects
 */
export async function generateFixes(issues, platform = null) {
    try {
        // Load platform configuration
        const config = await loadConfig(platform);
        const fixes = [];
        
        // Group issues by file for better organization
        const issuesByFile = {};
        for (const issue of issues) {
            if (!issuesByFile[issue.filePath]) {
                issuesByFile[issue.filePath] = [];
            }
            issuesByFile[issue.filePath].push(issue);
        }
        
        // Generate fixes for each file
        for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
            // Sort issues by line number and column for consistent processing
            fileIssues.sort((a, b) => {
                if (a.lineNumber !== b.lineNumber) {
                    return a.lineNumber - b.lineNumber;
                }
                return a.columnNumber - b.columnNumber;
            });
            
            for (const issue of fileIssues) {
                const fix = generateFix(issue, config);
                if (fix) {
                    fixes.push(fix);
                }
            }
        }
        
        // Sort fixes by priority and file path
        fixes.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return a.filePath.localeCompare(b.filePath);
        });
        
        return fixes;
        
    } catch (error) {
        console.error('[FixGenerator] Error generating fixes:', error);
        return [];
    }
}

/**
 * Generate shell script for applying fixes
 * @param {Array} fixes - Array of fix objects
 * @param {Object} options - Script generation options
 * @returns {string} Shell script content
 */
export function generateFixScript(fixes, options = {}) {
    const {
        scriptName = 'pwa-path-fix.sh',
        backupFiles = true,
        dryRun = false,
        verbose = true
    } = options;
    
    const lines = [
        '#!/bin/bash',
        `# PWA Path Fix Script - Generated ${new Date().toISOString()}`,
        `# Total fixes: ${fixes.length}`,
        '',
        'set -e  # Exit on error',
        '',
        '# Configuration',
        `BACKUP_FILES=${backupFiles ? 'true' : 'false'}`,
        `DRY_RUN=${dryRun ? 'true' : 'false'}`,
        `VERBOSE=${verbose ? 'true' : 'false'}`,
        '',
        '# Helper functions',
        'log() {',
        '    if [ "$VERBOSE" = "true" ]; then',
        '        echo "[$(date)] $1"',
        '    fi',
        '}',
        '',
        'backup_file() {',
        '    if [ "$BACKUP_FILES" = "true" ] && [ -f "$1" ]; then',
        '        cp "$1" "$1.backup.$(date +%s)"',
        '        log "Backed up $1"',
        '    fi',
        '}',
        '',
        'apply_fix() {',
        '    local file="$1"',
        '    local command="$2"',
        '    local description="$3"',
        '    ',
        '    if [ ! -f "$file" ]; then',
        '        log "Warning: File not found: $file"',
        '        return 1',
        '    fi',
        '    ',
        '    log "Applying fix to $file: $description"',
        '    ',
        '    if [ "$DRY_RUN" = "true" ]; then',
        '        log "DRY RUN: $command $file"',
        '    else',
        '        backup_file "$file"',
        '        eval "$command $file"',
        '    fi',
        '}',
        '',
        'log "Starting PWA path fixes..."',
        ''
    ];
    
    // Group fixes by file
    const fixesByFile = {};
    for (const fix of fixes) {
        if (!fixesByFile[fix.filePath]) {
            fixesByFile[fix.filePath] = [];
        }
        fixesByFile[fix.filePath].push(fix);
    }
    
    // Generate fix commands
    for (const [filePath, fileFixes] of Object.entries(fixesByFile)) {
        lines.push(`# Fixes for ${filePath}`);
        
        for (const fix of fileFixes) {
            lines.push(`apply_fix "${fix.filePath}" "${fix.command}" "${fix.explanation}"`);
        }
        
        lines.push('');
    }
    
    lines.push(
        'log "PWA path fixes completed!"',
        '',
        'if [ "$DRY_RUN" = "true" ]; then',
        '    log "This was a dry run. No files were modified."',
        '    log "Run with DRY_RUN=false to apply changes."',
        'fi'
    );
    
    return lines.join('\n');
}

/**
 * Generate fix report
 * @param {Array} fixes - Array of fix objects
 * @returns {Object} Fix report
 */
export function generateFixReport(fixes) {
    const report = {
        totalFixes: fixes.length,
        fixesByFile: {},
        fixesBySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        },
        fixesByStrategy: {},
        estimatedImpact: 'low',
        recommendations: []
    };
    
    // Analyze fixes
    for (const fix of fixes) {
        // Group by file
        if (!report.fixesByFile[fix.filePath]) {
            report.fixesByFile[fix.filePath] = [];
        }
        report.fixesByFile[fix.filePath].push(fix);
        
        // Count by severity
        report.fixesBySeverity[fix.severity]++;
        
        // Count by strategy
        report.fixesByStrategy[fix.strategy] = 
            (report.fixesByStrategy[fix.strategy] || 0) + 1;
    }
    
    // Determine impact level
    if (report.fixesBySeverity.critical > 0) {
        report.estimatedImpact = 'high';
    } else if (report.fixesBySeverity.high > 0) {
        report.estimatedImpact = 'medium';
    }
    
    // Generate recommendations
    if (report.fixesBySeverity.critical > 0) {
        report.recommendations.push('Critical path issues found - immediate fix recommended');
    }
    
    if (report.totalFixes > 10) {
        report.recommendations.push('Many fixes needed - consider reviewing path structure');
    }
    
    if (report.fixesByStrategy.parentReference > 0) {
        report.recommendations.push('Consider copying assets to PWA directory to avoid parent references');
    }
    
    return report;
}

// Export strategy definitions for external use
export { FIX_STRATEGIES };