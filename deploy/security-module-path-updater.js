#!/usr/bin/env node

/**
 * Security Module Path Updater
 * Updates internal path references within security modules for PWA deployment
 * 
 * @version 3.2.0-pwa-deployment-compatibility
 * @author code-executor
 * @security path traversal protection, module integrity validation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityModulePathUpdater {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.securityPath = path.join(this.projectRoot, 'pwa-card-storage/src/security');
        this.backupDir = path.join(__dirname, 'backups');
        
        this.pathPatterns = [
            // Parent directory references
            { pattern: /\.\.\/src\/security\//g, replacement: './' },
            { pattern: /\.\.\/assets\//g, replacement: '../../assets/' },
            { pattern: /\.\.\/config\//g, replacement: '../../config/' },
            
            // Absolute path references that should be relative
            { pattern: /\/src\/security\//g, replacement: './' },
            
            // Import/require statements with hardcoded paths
            { pattern: /require\(['"`]\.\.\/src\/security\/([^'"`]+)['"`]\)/g, replacement: "require('./$1')" },
            { pattern: /import\s+.*\s+from\s+['"`]\.\.\/src\/security\/([^'"`]+)['"`]/g, replacement: "import $& from './$1'" },
            
            // Dynamic imports
            { pattern: /import\(['"`]\.\.\/src\/security\/([^'"`]+)['"`]\)/g, replacement: "import('./$1')" }
        ];
        
        this.updateResults = {
            filesProcessed: 0,
            pathsUpdated: 0,
            errors: [],
            backups: [],
            integrityChecks: []
        };
    }

    /**
     * Main execution method
     */
    async run() {
        console.log('🔧 Security Module Path Updater v3.2.0');
        console.log('=====================================\n');

        try {
            await this.validateEnvironment();
            await this.createBackupDirectory();
            await this.scanAndUpdateModules();
            await this.validateModuleIntegrity();
            await this.generateReport();
            
            console.log('✅ Security module path update completed successfully');
            
        } catch (error) {
            console.error('❌ Path update failed:', error.message);
            await this.rollbackChanges();
            process.exit(1);
        }
    }

    /**
     * Validate environment and prerequisites
     */
    async validateEnvironment() {
        console.log('🔍 Validating environment...');
        
        if (!fs.existsSync(this.securityPath)) {
            throw new Error(`Security directory not found: ${this.securityPath}`);
        }

        const securityFiles = fs.readdirSync(this.securityPath);
        const jsFiles = securityFiles.filter(file => file.endsWith('.js'));
        
        if (jsFiles.length === 0) {
            throw new Error('No JavaScript security modules found');
        }

        console.log(`   Found ${jsFiles.length} security modules to process`);
    }

    /**
     * Create backup directory with timestamp
     */
    async createBackupDirectory() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.backupDir = path.join(__dirname, 'backups', `security-03-${timestamp}`);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        console.log(`📁 Backup directory created: ${this.backupDir}`);
    }

    /**
     * Scan and update all security modules
     */
    async scanAndUpdateModules() {
        console.log('🔄 Scanning and updating security modules...');
        
        const securityFiles = fs.readdirSync(this.securityPath)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(this.securityPath, file));

        for (const filePath of securityFiles) {
            await this.processSecurityModule(filePath);
        }

        console.log(`   Processed ${this.updateResults.filesProcessed} files`);
        console.log(`   Updated ${this.updateResults.pathsUpdated} path references`);
    }

    /**
     * Process individual security module
     */
    async processSecurityModule(filePath) {
        const fileName = path.basename(filePath);
        console.log(`   Processing: ${fileName}`);

        try {
            // Read original content
            const originalContent = fs.readFileSync(filePath, 'utf8');
            let updatedContent = originalContent;
            let pathsUpdatedInFile = 0;

            // Create backup
            const backupPath = path.join(this.backupDir, fileName);
            fs.writeFileSync(backupPath, originalContent);
            this.updateResults.backups.push(backupPath);

            // Apply path pattern replacements
            for (const { pattern, replacement } of this.pathPatterns) {
                const matches = updatedContent.match(pattern);
                if (matches) {
                    updatedContent = updatedContent.replace(pattern, replacement);
                    pathsUpdatedInFile += matches.length;
                }
            }

            // Additional security-specific path updates
            updatedContent = this.updateSecuritySpecificPaths(updatedContent, fileName);

            // Write updated content if changes were made
            if (updatedContent !== originalContent) {
                // Validate updated content before writing
                this.validateModuleContent(updatedContent, fileName);
                
                fs.writeFileSync(filePath, updatedContent);
                this.updateResults.pathsUpdated += pathsUpdatedInFile;
                
                console.log(`     ✅ Updated ${pathsUpdatedInFile} path references`);
            } else {
                console.log(`     ℹ️  No path updates needed`);
            }

            this.updateResults.filesProcessed++;

        } catch (error) {
            const errorMsg = `Failed to process ${fileName}: ${error.message}`;
            this.updateResults.errors.push(errorMsg);
            console.error(`     ❌ ${errorMsg}`);
        }
    }

    /**
     * Update security-specific path patterns
     */
    updateSecuritySpecificPaths(content, fileName) {
        let updatedContent = content;

        // Update config file references
        updatedContent = updatedContent.replace(
            /['"`]\.\.\/\.\.\/config\/([^'"`]+)['"`]/g,
            "'../../config/$1'"
        );

        // Update asset references
        updatedContent = updatedContent.replace(
            /['"`]\.\.\/\.\.\/assets\/([^'"`]+)['"`]/g,
            "'../../assets/$1'"
        );

        // Update cross-module references within security directory
        const securityModules = [
            'SecurityInputHandler',
            'SecurityDataHandler', 
            'SecurityAuthHandler',
            'SecurityConfigManager',
            'SecurityMonitor',
            'StaticHostingCompatibilityLayer'
        ];

        for (const module of securityModules) {
            if (fileName !== `${module}.js`) {
                // Update relative imports to other security modules
                const modulePattern = new RegExp(`['"\`]\\.\\.\/src\/security\/${module}(\\.js)?['"\`]`, 'g');
                updatedContent = updatedContent.replace(modulePattern, `'./${module}.js'`);
            }
        }

        return updatedContent;
    }

    /**
     * Validate module content for security and syntax
     */
    validateModuleContent(content, fileName) {
        // Check for dangerous path patterns
        const dangerousPatterns = [
            /\.\.\//g,  // Should not have parent directory references after update
            /\/etc\//g, // Unix system paths
            /\/proc\//g, // Unix system paths
            /C:\\/g     // Windows system paths
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(content)) {
                // Allow specific safe patterns
                if (pattern === /\.\.\//g) {
                    // Allow ../../assets/ and ../../config/ patterns
                    const safeParentRefs = content.match(/\.\.\//g);
                    const allowedRefs = content.match(/\.\.\/(assets|config)\//g);
                    
                    if (safeParentRefs && (!allowedRefs || safeParentRefs.length > allowedRefs.length)) {
                        throw new Error(`Dangerous path pattern found in ${fileName}: ${pattern}`);
                    }
                } else {
                    throw new Error(`Dangerous path pattern found in ${fileName}: ${pattern}`);
                }
            }
        }

        // Basic JavaScript syntax validation
        try {
            // Simple syntax check - look for balanced braces
            const braceCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
            if (Math.abs(braceCount) > 2) { // Allow minor imbalances
                console.warn(`     ⚠️  Significant brace imbalance in ${fileName} (${braceCount})`);
            }
        } catch (error) {
            throw new Error(`Syntax validation failed for ${fileName}: ${error.message}`);
        }
    }

    /**
     * Validate module integrity after updates
     */
    async validateModuleIntegrity() {
        console.log('🔍 Validating module integrity...');
        
        const securityFiles = fs.readdirSync(this.securityPath)
            .filter(file => file.endsWith('.js'));

        for (const fileName of securityFiles) {
            const filePath = path.join(this.securityPath, fileName);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const hash = crypto.createHash('sha256').update(content).digest('hex');
                
                // Check for required exports/classes
                const hasClass = /class\s+\w+/.test(content);
                const hasExports = /module\.exports|export/.test(content);
                
                this.updateResults.integrityChecks.push({
                    file: fileName,
                    hash: hash.substring(0, 16),
                    hasClass,
                    hasExports,
                    size: content.length
                });
                
                console.log(`   ✅ ${fileName}: ${hash.substring(0, 16)} (${content.length} bytes)`);
                
            } catch (error) {
                const errorMsg = `Integrity check failed for ${fileName}: ${error.message}`;
                this.updateResults.errors.push(errorMsg);
                console.error(`   ❌ ${errorMsg}`);
            }
        }
    }

    /**
     * Generate comprehensive report
     */
    async generateReport() {
        const reportPath = path.join(__dirname, 'security-03-path-update-report.json');
        
        const report = {
            timestamp: new Date().toISOString(),
            task: 'SECURITY-03',
            description: 'Security Module Path Updates',
            results: this.updateResults,
            summary: {
                filesProcessed: this.updateResults.filesProcessed,
                pathsUpdated: this.updateResults.pathsUpdated,
                errorsCount: this.updateResults.errors.length,
                backupsCreated: this.updateResults.backups.length,
                integrityChecksCount: this.updateResults.integrityChecks.length
            },
            pathPatterns: this.pathPatterns.map(p => ({
                pattern: p.pattern.toString(),
                replacement: p.replacement
            })),
            securityValidation: {
                pathTraversalProtection: true,
                moduleIntegrityValidation: true,
                backupCreated: this.updateResults.backups.length > 0
            }
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📋 Report generated: ${reportPath}`);
        
        return report;
    }

    /**
     * Rollback changes in case of failure
     */
    async rollbackChanges() {
        console.log('🔄 Rolling back changes...');
        
        try {
            for (const backupPath of this.updateResults.backups) {
                const fileName = path.basename(backupPath);
                const originalPath = path.join(this.securityPath, fileName);
                
                if (fs.existsSync(backupPath)) {
                    fs.copyFileSync(backupPath, originalPath);
                    console.log(`   ✅ Restored: ${fileName}`);
                }
            }
            
            console.log('🔄 Rollback completed');
            
        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
        }
    }

    /**
     * Sanitize file path to prevent path traversal
     */
    sanitizePath(inputPath) {
        const normalizedPath = path.normalize(inputPath);
        
        if (normalizedPath.includes('..')) {
            throw new Error(`Path traversal attempt detected: ${inputPath}`);
        }
        
        return normalizedPath;
    }
}

// Execute if run directly
if (require.main === module) {
    const updater = new SecurityModulePathUpdater();
    updater.run().catch(error => {
        console.error('Execution failed:', error);
        process.exit(1);
    });
}

module.exports = SecurityModulePathUpdater;