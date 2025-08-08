/**
 * Path Auditor ES6 Module
 * Hardcoded path detection and fix generation for PWA deployment compatibility
 * 
 * @version 3.2.0
 * @author PWA Deployment Compatibility Team
 */

import { scanFiles, getScanStatistics } from '../utils/path-scanner.js';
import { generateFixes, generateFixScript, generateFixReport } from '../utils/fix-generator.js';
import { detectEnvironment } from './environment-detector.js';
import { loadConfig } from './config-manager.js';

// Default files to scan in PWA directory
const DEFAULT_SCAN_FILES = [
    'index.html',
    'manifest.json',
    'manifest-github.json',
    'sw.js',
    'src/app.js',
    'src/pwa-init.js',
    'assets/styles/main.css'
];

// Audit cache for performance
let auditCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate audit options for security
 * @param {Object} options - Audit options
 * @returns {Object} Validated options
 */
function validateAuditOptions(options = {}) {
    const validated = {
        files: DEFAULT_SCAN_FILES,
        platform: null,
        baseUrl: './',
        concurrency: 3,
        includeTests: false,
        generateScript: true,
        ...options
    };
    
    // Validate files array
    if (Array.isArray(validated.files)) {
        validated.files = validated.files.filter(file => 
            typeof file === 'string' && 
            file.length > 0 && 
            !file.includes('..') &&
            !file.startsWith('/')
        );
    } else {
        validated.files = DEFAULT_SCAN_FILES;
    }
    
    // Validate concurrency
    validated.concurrency = Math.max(1, Math.min(validated.concurrency, 10));
    
    // Validate baseUrl
    if (typeof validated.baseUrl !== 'string' || validated.baseUrl.includes('..')) {
        validated.baseUrl = './';
    }
    
    return validated;
}

/**
 * Get cached audit result if available
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached result or null
 */
function getCachedAudit(cacheKey) {
    const cached = auditCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
    }
    
    // Clean expired cache
    if (cached) {
        auditCache.delete(cacheKey);
    }
    
    return null;
}

/**
 * Cache audit result
 * @param {string} cacheKey - Cache key
 * @param {Object} result - Result to cache
 */
function setCachedAudit(cacheKey, result) {
    auditCache.set(cacheKey, {
        result,
        timestamp: Date.now()
    });
}

/**
 * Audit paths in PWA project
 * @param {Object} options - Audit options
 * @returns {Promise<Object>} Audit results
 */
export async function auditPaths(options = {}) {
    const startTime = Date.now();
    const validatedOptions = validateAuditOptions(options);
    
    try {
        console.log('[PathAuditor] Starting path audit...');
        
        // Generate cache key
        const cacheKey = JSON.stringify({
            files: validatedOptions.files,
            platform: validatedOptions.platform,
            baseUrl: validatedOptions.baseUrl
        });
        
        // Check cache first
        const cachedResult = getCachedAudit(cacheKey);
        if (cachedResult) {
            console.log('[PathAuditor] Using cached audit result');
            return cachedResult;
        }
        
        // Detect environment if platform not specified
        let platform = validatedOptions.platform;
        if (!platform) {
            const environment = await detectEnvironment();
            platform = environment.platform;
        }
        
        // Load platform configuration
        const config = await loadConfig(platform);
        
        // Scan files for path issues
        const scanResults = await scanFiles(
            validatedOptions.files,
            validatedOptions.baseUrl,
            validatedOptions.concurrency
        );
        
        // Get scan statistics
        const statistics = getScanStatistics(scanResults);
        
        // Collect all issues
        const allIssues = [];
        for (const result of scanResults) {
            if (result.success && result.issues.length > 0) {
                allIssues.push(...result.issues);
            }
        }
        
        // Generate fixes
        const fixes = await generateFixes(allIssues, platform);
        
        // Generate fix script if requested
        let fixScript = null;
        if (validatedOptions.generateScript && fixes.length > 0) {
            fixScript = generateFixScript(fixes, {
                backupFiles: true,
                dryRun: false,
                verbose: true
            });
        }
        
        // Generate fix report
        const fixReport = generateFixReport(fixes);
        
        // Compile final results
        const auditResult = {
            // Metadata
            auditId: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            platform,
            
            // Configuration
            config: {
                basePath: config.basePath,
                platform: config.platform,
                environment: config.environment
            },
            
            // Scan results
            scanResults,
            statistics,
            
            // Issues and fixes
            issues: allIssues,
            fixes,
            fixScript,
            fixReport,
            
            // Summary
            summary: {
                totalFiles: statistics.totalFiles,
                affectedFiles: statistics.affectedFiles,
                totalIssues: statistics.totalIssues,
                totalFixes: fixes.length,
                criticalIssues: statistics.issuesBySeverity.critical,
                highIssues: statistics.issuesBySeverity.high,
                estimatedImpact: fixReport.estimatedImpact,
                recommendations: fixReport.recommendations
            },
            
            // Status
            success: true,
            hasIssues: allIssues.length > 0,
            needsAttention: statistics.issuesBySeverity.critical > 0 || 
                           statistics.issuesBySeverity.high > 0
        };
        
        // Cache the result
        setCachedAudit(cacheKey, auditResult);
        
        console.log(`[PathAuditor] Audit completed in ${auditResult.duration}ms`);
        console.log(`[PathAuditor] Found ${allIssues.length} issues, generated ${fixes.length} fixes`);
        
        return auditResult;
        
    } catch (error) {
        console.error('[PathAuditor] Audit failed:', error);
        
        return {
            auditId: `audit-error-${Date.now()}`,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
            platform: validatedOptions.platform || 'unknown',
            error: error.message,
            success: false,
            hasIssues: false,
            needsAttention: true,
            summary: {
                totalFiles: 0,
                affectedFiles: 0,
                totalIssues: 0,
                totalFixes: 0,
                criticalIssues: 0,
                highIssues: 0,
                estimatedImpact: 'unknown',
                recommendations: ['Fix audit errors before proceeding']
            }
        };
    }
}

/**
 * Generate fix script for audit results
 * @param {Object} auditResults - Results from auditPaths
 * @param {string} platform - Target platform
 * @param {Object} scriptOptions - Script generation options
 * @returns {Promise<string>} Fix script content
 */
export async function generateFixScript(auditResults, platform = null, scriptOptions = {}) {
    try {
        if (!auditResults || !auditResults.fixes) {
            throw new Error('Invalid audit results provided');
        }
        
        const targetPlatform = platform || auditResults.platform;
        const fixes = auditResults.fixes;
        
        if (fixes.length === 0) {
            return [
                '#!/bin/bash',
                '# PWA Path Fix Script - No fixes needed',
                `# Generated ${new Date().toISOString()}`,
                '',
                'echo "No path fixes required - all paths are already compliant!"',
                'exit 0'
            ].join('\n');
        }
        
        const script = generateFixScript(fixes, {
            scriptName: `pwa-path-fix-${targetPlatform}.sh`,
            backupFiles: true,
            dryRun: false,
            verbose: true,
            ...scriptOptions
        });
        
        return script;
        
    } catch (error) {
        console.error('[PathAuditor] Error generating fix script:', error);
        throw error;
    }
}

/**
 * Validate path security to prevent traversal attacks
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if path is secure
 */
export function validatePathSecurity(filePath) {
    if (typeof filePath !== 'string') {
        return false;
    }
    
    // Prevent path traversal
    if (filePath.includes('..') || filePath.includes('~')) {
        return false;
    }
    
    // Ensure path doesn't start with /
    if (filePath.startsWith('/')) {
        return false;
    }
    
    // Check for dangerous characters
    const dangerousChars = ['<', '>', '|', '&', ';', '`', '$'];
    for (const char of dangerousChars) {
        if (filePath.includes(char)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Get audit report in human-readable format
 * @param {Object} auditResults - Results from auditPaths
 * @returns {string} Formatted audit report
 */
export function getAuditReport(auditResults) {
    if (!auditResults || !auditResults.success) {
        return `
PWA Path Audit Report - FAILED
==============================
Error: ${auditResults?.error || 'Unknown error'}
Timestamp: ${auditResults?.timestamp || 'Unknown'}
`;
    }
    
    const { summary, statistics, platform, duration } = auditResults;
    
    const report = [
        'PWA Path Audit Report',
        '=====================',
        `Platform: ${platform}`,
        `Audit Duration: ${duration}ms`,
        `Timestamp: ${auditResults.timestamp}`,
        '',
        'Summary:',
        `  Total Files Scanned: ${summary.totalFiles}`,
        `  Files with Issues: ${summary.affectedFiles}`,
        `  Total Issues Found: ${summary.totalIssues}`,
        `  Fixes Generated: ${summary.totalFixes}`,
        '',
        'Issues by Severity:',
        `  Critical: ${summary.criticalIssues}`,
        `  High: ${summary.highIssues}`,
        `  Medium: ${statistics.issuesBySeverity.medium}`,
        `  Low: ${statistics.issuesBySeverity.low}`,
        '',
        `Estimated Impact: ${summary.estimatedImpact.toUpperCase()}`,
        '',
        'Recommendations:'
    ];
    
    for (const recommendation of summary.recommendations) {
        report.push(`  - ${recommendation}`);
    }
    
    if (summary.needsAttention) {
        report.push('', '⚠️  ATTENTION REQUIRED: Critical or high-severity issues found!');
    } else if (summary.hasIssues) {
        report.push('', '✅ Issues found but low impact - fixes recommended');
    } else {
        report.push('', '🎉 No path issues found - project is deployment ready!');
    }
    
    return report.join('\n');
}

/**
 * Clear audit cache
 */
export function clearAuditCache() {
    auditCache.clear();
    console.log('[PathAuditor] Audit cache cleared');
}

// Backward compatibility - deprecated
if (typeof window !== 'undefined') {
    window.PathAuditor = {
        auditPaths,
        generateFixScript,
        validatePathSecurity,
        getAuditReport,
        clearAuditCache,
        // Deprecated warning
        _deprecated: 'Use ES6 imports: import { auditPaths } from "./path-auditor.js"'
    };
    
    console.warn('[PathAuditor] Global PathAuditor is deprecated. Use ES6 imports instead.');
}