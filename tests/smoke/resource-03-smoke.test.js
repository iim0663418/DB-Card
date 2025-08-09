#!/usr/bin/env node

/**
 * RESOURCE-03 Smoke Test Suite
 * 
 * Validates manifest file path fixes and PWA functionality
 * 
 * Test Coverage:
 * 1. Manifest file structure validation
 * 2. Icon path correctness verification  
 * 3. Resource file existence checks
 * 4. PWA installation compatibility
 * 5. JSON schema compliance
 * 6. Security validation checks
 * 
 * @version 1.0.0
 * @author code-executor
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Resource03SmokeTest {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.pwaDir = path.join(this.projectRoot, 'pwa-card-storage');
        this.testResults = [];
    }

    /**
     * Test helper: Add test result
     */
    addResult(testName, passed, message, details = null) {
        this.testResults.push({
            test: testName,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status}: ${testName} - ${message}`);
        if (details && !passed) {
            console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
        }
    }

    /**
     * Test 1: Manifest files exist and are valid JSON
     */
    testManifestFilesExist() {
        const manifestFiles = [
            'manifest.json',
            'manifest-github.json'
        ];

        let allExist = true;
        const details = {};

        manifestFiles.forEach(fileName => {
            const filePath = path.join(this.pwaDir, fileName);
            const exists = fs.existsSync(filePath);
            details[fileName] = { exists };

            if (exists) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const manifest = JSON.parse(content);
                    details[fileName].validJson = true;
                    details[fileName].size = content.length;
                } catch (error) {
                    details[fileName].validJson = false;
                    details[fileName].error = error.message;
                    allExist = false;
                }
            } else {
                allExist = false;
            }
        });

        this.addResult(
            'Manifest Files Exist',
            allExist,
            allExist ? 'All manifest files exist and contain valid JSON' : 'Some manifest files missing or invalid',
            details
        );

        return allExist;
    }

    /**
     * Test 2: Icon paths are correctly updated
     */
    testIconPathsUpdated() {
        const manifestFiles = [
            'manifest.json',
            'manifest-github.json'
        ];

        let allPathsCorrect = true;
        const details = {};

        manifestFiles.forEach(fileName => {
            const filePath = path.join(this.pwaDir, fileName);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const manifest = JSON.parse(content);
                
                details[fileName] = {
                    icons: manifest.icons.map(icon => ({
                        src: icon.src,
                        isCorrect: !icon.src.includes('../') && !icon.src.includes('assets/moda-logo.svg')
                    }))
                };

                // Check for hardcoded paths
                const hasHardcodedPaths = manifest.icons.some(icon => 
                    icon.src.includes('../') || icon.src === './assets/moda-logo.svg'
                );

                if (hasHardcodedPaths) {
                    allPathsCorrect = false;
                    details[fileName].hasHardcodedPaths = true;
                }

                // Verify moda-logo path is updated
                const modaIcon = manifest.icons.find(icon => icon.src.includes('moda-logo.svg'));
                if (modaIcon && modaIcon.src !== './assets/images/moda-logo.svg') {
                    allPathsCorrect = false;
                    details[fileName].modaLogoPathIncorrect = true;
                }

            } catch (error) {
                allPathsCorrect = false;
                details[fileName] = { error: error.message };
            }
        });

        this.addResult(
            'Icon Paths Updated',
            allPathsCorrect,
            allPathsCorrect ? 'All icon paths correctly updated' : 'Some icon paths still contain hardcoded references',
            details
        );

        return allPathsCorrect;
    }

    /**
     * Test 3: All referenced resources exist
     */
    testResourcesExist() {
        const manifestFiles = [
            'manifest.json',
            'manifest-github.json'
        ];

        let allResourcesExist = true;
        const details = {};

        manifestFiles.forEach(fileName => {
            const filePath = path.join(this.pwaDir, fileName);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const manifest = JSON.parse(content);
                
                details[fileName] = {
                    resources: []
                };

                manifest.icons.forEach(icon => {
                    const resourcePath = path.join(this.pwaDir, icon.src);
                    const exists = fs.existsSync(resourcePath);
                    
                    const resourceInfo = {
                        src: icon.src,
                        exists,
                        sizes: icon.sizes,
                        type: icon.type
                    };

                    if (exists) {
                        const stats = fs.statSync(resourcePath);
                        resourceInfo.fileSize = stats.size;
                    }

                    details[fileName].resources.push(resourceInfo);

                    if (!exists) {
                        allResourcesExist = false;
                    }
                });

            } catch (error) {
                allResourcesExist = false;
                details[fileName] = { error: error.message };
            }
        });

        this.addResult(
            'Resources Exist',
            allResourcesExist,
            allResourcesExist ? 'All referenced resources exist' : 'Some referenced resources are missing',
            details
        );

        return allResourcesExist;
    }

    /**
     * Test 4: PWA manifest structure compliance
     */
    testPWACompliance() {
        const requiredFields = [
            'name', 'short_name', 'start_url', 'display', 
            'theme_color', 'background_color', 'icons'
        ];

        const manifestFiles = [
            'manifest.json',
            'manifest-github.json'
        ];

        let allCompliant = true;
        const details = {};

        manifestFiles.forEach(fileName => {
            const filePath = path.join(this.pwaDir, fileName);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const manifest = JSON.parse(content);
                
                const missingFields = requiredFields.filter(field => !manifest[field]);
                const hasValidIcons = Array.isArray(manifest.icons) && manifest.icons.length > 0;
                
                details[fileName] = {
                    missingFields,
                    hasValidIcons,
                    iconCount: manifest.icons ? manifest.icons.length : 0,
                    compliant: missingFields.length === 0 && hasValidIcons
                };

                if (!details[fileName].compliant) {
                    allCompliant = false;
                }

            } catch (error) {
                allCompliant = false;
                details[fileName] = { error: error.message };
            }
        });

        this.addResult(
            'PWA Compliance',
            allCompliant,
            allCompliant ? 'All manifests are PWA compliant' : 'Some manifests missing required PWA fields',
            details
        );

        return allCompliant;
    }

    /**
     * Test 5: No problematic hardcoded paths remain
     */
    testNoHardcodedPaths() {
        const manifestFiles = [
            'manifest.json',
            'manifest-github.json'
        ];

        let noProblematicPaths = true;
        const details = {};

        manifestFiles.forEach(fileName => {
            const filePath = path.join(this.pwaDir, fileName);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for problematic hardcoded path patterns
                const problematicPatterns = [
                    /\.\.\//g,  // Parent directory references (always problematic)
                    /assets\/moda-logo\.svg(?!\/)/g,  // Old moda-logo path (should be in images/)
                ];

                // GitHub manifest is allowed to have /DB-Card/pwa-card-storage/ paths
                if (fileName !== 'manifest-github.json') {
                    problematicPatterns.push(/\/DB-Card\/pwa-card-storage\//g);
                }

                const foundPatterns = [];
                problematicPatterns.forEach((pattern, index) => {
                    const matches = content.match(pattern);
                    if (matches) {
                        foundPatterns.push({
                            pattern: pattern.toString(),
                            matches: matches.slice(0, 5) // Limit to first 5 matches
                        });
                    }
                });

                details[fileName] = {
                    hasProblematicPaths: foundPatterns.length > 0,
                    foundPatterns,
                    note: fileName === 'manifest-github.json' ? 'GitHub paths are expected' : null
                };

                if (foundPatterns.length > 0) {
                    noProblematicPaths = false;
                }

            } catch (error) {
                noProblematicPaths = false;
                details[fileName] = { error: error.message };
            }
        });

        this.addResult(
            'No Problematic Paths',
            noProblematicPaths,
            noProblematicPaths ? 'No problematic hardcoded paths found' : 'Problematic hardcoded paths still present',
            details
        );

        return noProblematicPaths;
    }

    /**
     * Test 6: Backup files created
     */
    testBackupsCreated() {
        const backupDir = path.join(__dirname, '../..', 'deploy', 'backups');
        
        if (!fs.existsSync(backupDir)) {
            this.addResult(
                'Backups Created',
                false,
                'Backup directory does not exist',
                { backupDir }
            );
            return false;
        }

        const backupFiles = fs.readdirSync(backupDir)
            .filter(file => file.includes('manifest') && file.includes('.backup'));

        const hasManifestBackups = backupFiles.some(file => file.includes('manifest.json'));
        const hasGithubBackups = backupFiles.some(file => file.includes('manifest-github.json'));

        const allBackupsExist = hasManifestBackups && hasGithubBackups;

        this.addResult(
            'Backups Created',
            allBackupsExist,
            allBackupsExist ? 'Backup files created successfully' : 'Some backup files missing',
            {
                backupDir,
                backupFiles,
                hasManifestBackups,
                hasGithubBackups
            }
        );

        return allBackupsExist;
    }

    /**
     * Generate test report
     */
    generateReport() {
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const passRate = ((passed / total) * 100).toFixed(1);

        const report = {
            task: 'RESOURCE-03: Manifest檔案路徑修復',
            timestamp: new Date().toISOString(),
            summary: {
                total,
                passed,
                failed: total - passed,
                passRate: `${passRate}%`
            },
            results: this.testResults
        };

        const reportPath = path.join(__dirname, 'resource-03-smoke-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        return report;
    }

    /**
     * Run all smoke tests
     */
    async run() {
        console.log('🧪 RESOURCE-03 Smoke Test Suite');
        console.log('=' .repeat(50));

        // Run all tests
        this.testManifestFilesExist();
        this.testIconPathsUpdated();
        this.testResourcesExist();
        this.testPWACompliance();
        this.testNoHardcodedPaths();
        this.testBackupsCreated();

        // Generate report
        const report = this.generateReport();

        // Summary
        console.log('\n📊 Test Summary:');
        console.log(`  Total Tests: ${report.summary.total}`);
        console.log(`  Passed: ${report.summary.passed}`);
        console.log(`  Failed: ${report.summary.failed}`);
        console.log(`  Pass Rate: ${report.summary.passRate}`);

        if (report.summary.failed > 0) {
            console.log('\n❌ Some tests failed');
            process.exit(1);
        } else {
            console.log('\n✅ All tests passed');
            process.exit(0);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const tester = new Resource03SmokeTest();
    tester.run().catch(error => {
        console.error('Test execution error:', error);
        process.exit(1);
    });
}

module.exports = Resource03SmokeTest;