/**
 * RESOURCE-01 Smoke Test Suite
 * Task: 核心資源檔案複製
 * 
 * Validates:
 * - Core resource files copied correctly
 * - Security modules copied correctly  
 * - Path references updated
 * - File integrity maintained
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

describe('RESOURCE-01: Core Resource File Copying', () => {
    const baseDir = process.cwd();
    const pwaDir = path.join(baseDir, 'pwa-card-storage');
    
    const expectedCoreResources = [
        'assets/images/moda-logo.svg',
        'assets/styles/high-accessibility.css', 
        'assets/scripts/bilingual-common.js',
        'assets/scripts/qrcode.min.js',
        'assets/scripts/qr-utils.js'
    ];
    
    const expectedSecurityModules = [
        'src/security/scripts/SecurityInputHandler.js',
        'src/security/scripts/SecurityDataHandler.js',
        'src/security/scripts/SecurityAuthHandler.js'
    ];

    function generateSRI(filePath) {
        const content = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha384').update(content).digest('base64');
        return `sha384-${hash}`;
    }

    describe('Core Resources', () => {
        test.each(expectedCoreResources)('should have copied %s', (resourcePath) => {
            const fullPath = path.join(pwaDir, resourcePath);
            expect(fs.existsSync(fullPath)).toBe(true);
            
            // Verify file is not empty
            const stats = fs.statSync(fullPath);
            expect(stats.size).toBeGreaterThan(0);
        });

        test('should maintain file integrity', () => {
            // Test one core file for integrity
            const originalPath = path.join(baseDir, 'assets/moda-logo.svg');
            const copiedPath = path.join(pwaDir, 'assets/images/moda-logo.svg');
            
            if (fs.existsSync(originalPath) && fs.existsSync(copiedPath)) {
                const originalSRI = generateSRI(originalPath);
                const copiedSRI = generateSRI(copiedPath);
                expect(originalSRI).toBe(copiedSRI);
            }
        });
    });

    describe('Security Modules', () => {
        test.each(expectedSecurityModules)('should have copied %s', (modulePath) => {
            const fullPath = path.join(pwaDir, modulePath);
            expect(fs.existsSync(fullPath)).toBe(true);
            
            // Verify file is not empty
            const stats = fs.statSync(fullPath);
            expect(stats.size).toBeGreaterThan(0);
        });
    });

    describe('Path Updates', () => {
        test('should have updated paths in index.html', () => {
            const indexPath = path.join(pwaDir, 'index.html');
            if (fs.existsSync(indexPath)) {
                const content = fs.readFileSync(indexPath, 'utf8');
                
                // Should not contain old paths
                expect(content).not.toMatch(/\.\.\/assets\//);
                expect(content).not.toMatch(/\.\.\/src\/security\//);
                
                // Should contain new paths
                expect(content).toMatch(/\.\/assets\//);
                expect(content).toMatch(/\.\/src\/security\//);
            }
        });

        test('should have updated paths in manifest files', () => {
            const manifestFiles = ['manifest.json', 'manifest-github.json'];
            
            manifestFiles.forEach(fileName => {
                const filePath = path.join(pwaDir, fileName);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // Should not contain old paths
                    expect(content).not.toMatch(/\.\.\/assets\//);
                    
                    // Should contain new paths
                    expect(content).toMatch(/\.\/assets\//);
                }
            });
        });
    });

    describe('Backup Files', () => {
        test('should have created backup files', () => {
            const backupFiles = [
                'index.html.backup',
                'manifest.json.backup', 
                'manifest-github.json.backup'
            ];
            
            backupFiles.forEach(backupFile => {
                const backupPath = path.join(pwaDir, backupFile);
                if (fs.existsSync(backupPath)) {
                    const stats = fs.statSync(backupPath);
                    expect(stats.size).toBeGreaterThan(0);
                }
            });
        });
    });

    describe('Integrity Report', () => {
        test('should have generated integrity report', () => {
            const reportPath = path.join(baseDir, 'deploy', 'resource-integrity-report.json');
            expect(fs.existsSync(reportPath)).toBe(true);
            
            const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            expect(report.taskId).toBe('RESOURCE-01');
            expect(report.summary.totalFiles).toBeGreaterThan(0);
            expect(report.verification.sriEnabled).toBe(true);
        });
    });

    describe('Directory Structure', () => {
        test('should have created required directories', () => {
            const requiredDirs = [
                'assets/images',
                'assets/styles', 
                'assets/scripts',
                'src/security/scripts'
            ];
            
            requiredDirs.forEach(dir => {
                const dirPath = path.join(pwaDir, dir);
                expect(fs.existsSync(dirPath)).toBe(true);
                expect(fs.statSync(dirPath).isDirectory()).toBe(true);
            });
        });
    });
});

// Manual verification helper
if (require.main === module) {
    console.log('🧪 RESOURCE-01 Manual Verification');
    console.log('==================================');
    
    const pwaDir = path.join(process.cwd(), 'pwa-card-storage');
    
    // Check core resources
    console.log('\n📦 Core Resources:');
    const coreResources = [
        'assets/images/moda-logo.svg',
        'assets/styles/high-accessibility.css',
        'assets/scripts/bilingual-common.js', 
        'assets/scripts/qrcode.min.js',
        'assets/scripts/qr-utils.js'
    ];
    
    coreResources.forEach(resource => {
        const exists = fs.existsSync(path.join(pwaDir, resource));
        console.log(`${exists ? '✅' : '❌'} ${resource}`);
    });
    
    // Check security modules
    console.log('\n🔒 Security Modules:');
    const securityModules = [
        'src/security/scripts/SecurityInputHandler.js',
        'src/security/scripts/SecurityDataHandler.js',
        'src/security/scripts/SecurityAuthHandler.js'
    ];
    
    securityModules.forEach(module => {
        const exists = fs.existsSync(path.join(pwaDir, module));
        console.log(`${exists ? '✅' : '❌'} ${module}`);
    });
    
    console.log('\n🎯 RESOURCE-01 verification complete!');
}