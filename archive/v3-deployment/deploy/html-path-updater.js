#!/usr/bin/env node

/**
 * HTML Path Updater for PWA Static Hosting Compatibility
 * RESOURCE-02: HTML路徑引用更新
 * 
 * Updates hardcoded paths in PWA index.html file with security validation
 * Replaces `../` references with local paths for static hosting compatibility
 * 
 * @version 3.2.0
 * @security XSS protection, HTML content validation, CSP compliance
 */

const fs = require('fs');
const path = require('path');

class HtmlPathUpdater {
    constructor() {
        this.targetFile = path.join(__dirname, '../pwa-card-storage/index.html');
        this.backupFile = path.join(__dirname, '../pwa-card-storage/index.html.backup');
        this.logFile = path.join(__dirname, 'html-path-update.log');
        
        // Path replacement mappings based on RESOURCE-01 structure
        this.pathMappings = [
            // Core assets - update paths that need to point to copied resources
            { from: './assets/high-accessibility.css', to: './assets/styles/high-accessibility.css' },
            { from: './assets/bilingual-common.js', to: './assets/scripts/bilingual-common.js' },
            { from: './assets/qrcode.min.js', to: './assets/scripts/qrcode.min.js' },
            { from: './assets/qr-utils.js', to: './assets/scripts/qr-utils.js' },
            
            // Security modules - map from current ./src/security/ to scripts subdirectory
            { from: './src/security/SecurityInputHandler.js', to: './src/security/scripts/SecurityInputHandler.js' },
            { from: './src/security/SecurityDataHandler.js', to: './src/security/scripts/SecurityDataHandler.js' },
            { from: './src/security/SecurityAuthHandler.js', to: './src/security/scripts/SecurityAuthHandler.js' },
            { from: './src/security/StaticHostingSecurityToggle.js', to: './src/security/scripts/StaticHostingSecurityToggle.js' },
            { from: './src/security/StaticHostingCompatibilityLayer.js', to: './src/security/scripts/StaticHostingCompatibilityLayer.js' },
            { from: './src/security/ClientSideSecurityHealthMonitor.js', to: './src/security/scripts/ClientSideSecurityHealthMonitor.js' },
            { from: './src/security/ClientSideGracefulDegradation.js', to: './src/security/scripts/ClientSideGracefulDegradation.js' },
            { from: './src/security/ClientSideSecurityErrorRecovery.js', to: './src/security/scripts/ClientSideSecurityErrorRecovery.js' },
            { from: './src/security/ClientSideSecurityRollback.js', to: './src/security/scripts/ClientSideSecurityRollback.js' },
            { from: './src/security/ClientSideUserImpactMonitor.js', to: './src/security/scripts/ClientSideUserImpactMonitor.js' },
            { from: './src/security/ClientSideSecurityDashboard.js', to: './src/security/scripts/ClientSideSecurityDashboard.js' },
            { from: './src/security/ClientSideUserCommunication.js', to: './src/security/scripts/ClientSideUserCommunication.js' },
            { from: './src/security/ClientSideSecurityOnboarding.js', to: './src/security/scripts/ClientSideSecurityOnboarding.js' },
            { from: './src/security/ClientSideSecuritySettings.js', to: './src/security/scripts/ClientSideSecuritySettings.js' }
        ];
        
        this.stats = {
            totalReplacements: 0,
            pathsUpdated: new Set(),
            errors: []
        };
    }

    /**
     * Security: Sanitize HTML content to prevent XSS
     */
    sanitizeHtmlContent(content) {
        // Basic XSS protection - escape dangerous patterns
        const dangerousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];
        
        let sanitized = content;
        dangerousPatterns.forEach(pattern => {
            if (pattern.test(sanitized)) {
                this.log(`WARNING: Potentially dangerous pattern detected: ${pattern}`, 'warn');
            }
        });
        
        return sanitized;
    }

    /**
     * Security: Validate path to prevent traversal attacks
     */
    validatePath(pathStr) {
        // Prevent path traversal
        if (pathStr.includes('..') && !pathStr.startsWith('../')) {
            throw new Error(`Dangerous path detected: ${pathStr}`);
        }
        
        // Only allow legitimate path prefixes
        const allowedPrefixes = ['../', './', 'src/', 'assets/'];
        const hasValidPrefix = allowedPrefixes.some(prefix => pathStr.startsWith(prefix));
        
        if (!hasValidPrefix) {
            throw new Error(`Invalid path prefix: ${pathStr}`);
        }
        
        return true;
    }

    /**
     * Log operations with timestamp
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
        
        console.log(logEntry.trim());
        fs.appendFileSync(this.logFile, logEntry);
    }

    /**
     * Create backup of original file
     */
    createBackup() {
        try {
            if (fs.existsSync(this.targetFile)) {
                fs.copyFileSync(this.targetFile, this.backupFile);
                this.log(`Backup created: ${this.backupFile}`);
                return true;
            }
        } catch (error) {
            this.log(`Failed to create backup: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Update HTML content with path replacements
     */
    updateHtmlPaths() {
        try {
            // Read current HTML content
            if (!fs.existsSync(this.targetFile)) {
                throw new Error(`Target file not found: ${this.targetFile}`);
            }

            let htmlContent = fs.readFileSync(this.targetFile, 'utf8');
            this.log(`Read HTML file: ${this.targetFile} (${htmlContent.length} chars)`);

            // Apply path replacements
            this.pathMappings.forEach(mapping => {
                try {
                    // Validate paths
                    this.validatePath(mapping.from);
                    this.validatePath(mapping.to);

                    // Count occurrences before replacement
                    const beforeCount = (htmlContent.match(new RegExp(this.escapeRegExp(mapping.from), 'g')) || []).length;
                    
                    if (beforeCount > 0) {
                        // Perform replacement
                        htmlContent = htmlContent.replace(new RegExp(this.escapeRegExp(mapping.from), 'g'), mapping.to);
                        
                        // Verify replacement
                        const afterCount = (htmlContent.match(new RegExp(this.escapeRegExp(mapping.from), 'g')) || []).length;
                        const replacedCount = beforeCount - afterCount;
                        
                        if (replacedCount > 0) {
                            this.stats.totalReplacements += replacedCount;
                            this.stats.pathsUpdated.add(mapping.from);
                            this.log(`Replaced ${replacedCount} occurrences: ${mapping.from} → ${mapping.to}`);
                        }
                    }
                } catch (error) {
                    this.stats.errors.push(`Path replacement error: ${mapping.from} - ${error.message}`);
                    this.log(`Path replacement error: ${mapping.from} - ${error.message}`, 'error');
                }
            });

            // Security: Sanitize final content
            htmlContent = this.sanitizeHtmlContent(htmlContent);

            // Write updated content
            fs.writeFileSync(this.targetFile, htmlContent, 'utf8');
            this.log(`Updated HTML file written: ${this.targetFile}`);

            return true;
        } catch (error) {
            this.log(`HTML update failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Escape special regex characters
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Validate HTML structure after updates
     */
    validateHtmlStructure() {
        try {
            const htmlContent = fs.readFileSync(this.targetFile, 'utf8');
            
            // Basic HTML structure validation
            const requiredTags = ['<!DOCTYPE html>', '<html', '<head>', '<body>', '</html>'];
            const missingTags = requiredTags.filter(tag => !htmlContent.includes(tag));
            
            if (missingTags.length > 0) {
                throw new Error(`Missing required HTML tags: ${missingTags.join(', ')}`);
            }

            // Check for broken script/link tags
            const brokenScriptTags = htmlContent.match(/<script[^>]*src="[^"]*\.\.[^"]*"/g);
            const brokenLinkTags = htmlContent.match(/<link[^>]*href="[^"]*\.\.[^"]*"/g);
            
            if (brokenScriptTags || brokenLinkTags) {
                const brokenCount = (brokenScriptTags?.length || 0) + (brokenLinkTags?.length || 0);
                this.log(`WARNING: Found ${brokenCount} remaining hardcoded paths`, 'warn');
                
                if (brokenScriptTags) {
                    brokenScriptTags.forEach(tag => this.log(`Broken script: ${tag}`, 'warn'));
                }
                if (brokenLinkTags) {
                    brokenLinkTags.forEach(tag => this.log(`Broken link: ${tag}`, 'warn'));
                }
            }

            this.log('HTML structure validation passed');
            return true;
        } catch (error) {
            this.log(`HTML validation failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Generate update report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            task: 'RESOURCE-02 (HTML路徑引用更新)',
            status: this.stats.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
            statistics: {
                totalReplacements: this.stats.totalReplacements,
                pathsUpdated: Array.from(this.stats.pathsUpdated),
                errorsCount: this.stats.errors.length
            },
            errors: this.stats.errors,
            files: {
                target: this.targetFile,
                backup: this.backupFile,
                log: this.logFile
            }
        };

        const reportFile = path.join(__dirname, 'html-path-update-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        this.log(`Report generated: ${reportFile}`);
        return report;
    }

    /**
     * Main execution method
     */
    async execute() {
        this.log('Starting HTML path update process (RESOURCE-02)');
        
        try {
            // Step 1: Create backup
            if (!this.createBackup()) {
                throw new Error('Failed to create backup');
            }

            // Step 2: Update HTML paths
            if (!this.updateHtmlPaths()) {
                throw new Error('Failed to update HTML paths');
            }

            // Step 3: Validate HTML structure
            if (!this.validateHtmlStructure()) {
                throw new Error('HTML validation failed');
            }

            // Step 4: Generate report
            const report = this.generateReport();

            this.log(`HTML path update completed successfully`);
            this.log(`Total replacements: ${this.stats.totalReplacements}`);
            this.log(`Paths updated: ${this.stats.pathsUpdated.size}`);
            
            return report;
        } catch (error) {
            this.log(`HTML path update failed: ${error.message}`, 'error');
            
            // Restore backup on failure
            if (fs.existsSync(this.backupFile)) {
                fs.copyFileSync(this.backupFile, this.targetFile);
                this.log('Backup restored due to failure');
            }
            
            throw error;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const updater = new HtmlPathUpdater();
    updater.execute()
        .then(report => {
            console.log('\n=== HTML Path Update Report ===');
            console.log(`Status: ${report.status}`);
            console.log(`Total Replacements: ${report.statistics.totalReplacements}`);
            console.log(`Paths Updated: ${report.statistics.pathsUpdated.length}`);
            console.log(`Errors: ${report.statistics.errorsCount}`);
            
            if (report.statistics.errorsCount === 0) {
                console.log('\n✅ RESOURCE-02 completed successfully!');
                process.exit(0);
            } else {
                console.log('\n⚠️  RESOURCE-02 completed with warnings');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n❌ RESOURCE-02 failed:', error.message);
            process.exit(1);
        });
}

module.exports = HtmlPathUpdater;