#!/usr/bin/env node
/**
 * Path Updater for PWA Deployment Compatibility
 * Task: RESOURCE-01 (Path Update Phase)
 * 
 * Updates hardcoded paths in PWA files after resource copying
 */

const fs = require('fs');
const path = require('path');

class PathUpdater {
    constructor() {
        this.baseDir = process.cwd();
        this.pwaDir = path.join(this.baseDir, 'pwa-card-storage');
        this.filesToUpdate = [
            'index.html',
            'manifest.json', 
            'manifest-github.json'
        ];
        this.pathMappings = [
            { from: '../assets/', to: './assets/' },
            { from: '../src/security/', to: './src/security/' }
        ];
    }

    updateFileContent(filePath, content) {
        let updatedContent = content;
        let changeCount = 0;
        
        for (const mapping of this.pathMappings) {
            const regex = new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = updatedContent.match(regex);
            if (matches) {
                updatedContent = updatedContent.replace(regex, mapping.to);
                changeCount += matches.length;
                console.log(`  📝 ${matches.length} occurrences of "${mapping.from}" → "${mapping.to}"`);
            }
        }
        
        return { content: updatedContent, changes: changeCount };
    }

    updateFile(fileName) {
        const filePath = path.join(this.pwaDir, fileName);
        
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  File not found: ${fileName}`);
                return { success: false, changes: 0 };
            }
            
            const originalContent = fs.readFileSync(filePath, 'utf8');
            const { content: updatedContent, changes } = this.updateFileContent(filePath, originalContent);
            
            if (changes > 0) {
                // Create backup
                const backupPath = `${filePath}.backup`;
                fs.writeFileSync(backupPath, originalContent);
                
                // Write updated content
                fs.writeFileSync(filePath, updatedContent);
                
                console.log(`✅ Updated ${fileName}: ${changes} path references fixed`);
                return { success: true, changes, backup: backupPath };
            } else {
                console.log(`ℹ️  No path updates needed for ${fileName}`);
                return { success: true, changes: 0 };
            }
            
        } catch (error) {
            console.error(`❌ Failed to update ${fileName}:`, error.message);
            return { success: false, changes: 0, error: error.message };
        }
    }

    updateAllFiles() {
        console.log('🔧 Starting path updates in PWA files...\n');
        
        const results = [];
        let totalChanges = 0;
        
        for (const fileName of this.filesToUpdate) {
            console.log(`📄 Processing ${fileName}:`);
            const result = this.updateFile(fileName);
            results.push({ file: fileName, ...result });
            totalChanges += result.changes || 0;
            console.log('');
        }
        
        console.log(`🎯 Path update summary: ${totalChanges} total changes across ${results.length} files`);
        
        return {
            results,
            totalChanges,
            success: results.every(r => r.success)
        };
    }
}

// Main execution
if (require.main === module) {
    const updater = new PathUpdater();
    
    try {
        const result = updater.updateAllFiles();
        
        if (result.success) {
            console.log('\n🎉 Path updates completed successfully!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Path updates completed with errors');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Critical error during path updates:', error.message);
        process.exit(1);
    }
}

module.exports = PathUpdater;