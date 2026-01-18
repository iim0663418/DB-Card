#!/usr/bin/env node

/**
 * RESOURCE-02 Smoke Test Suite
 * HTML路徑引用更新 - Validation Tests
 * 
 * Tests the HTML path updater functionality and validates
 * that all hardcoded paths have been correctly updated
 * 
 * @version 3.2.0
 */

const fs = require('fs');
const path = require('path');

class Resource02SmokeTest {
    constructor() {
        this.testResults = [];
        this.htmlFile = path.join(__dirname, '../../pwa-card-storage/index.html');
        this.reportFile = path.join(__dirname, '../../deploy/html-path-update-report.json');
        this.backupFile = path.join(__dirname, '../../pwa-card-storage/index.html.backup');
    }

    /**
     * Log test result
     */
    logTest(testName, passed, message = '') {
        const result = {
            test: testName,
            status: passed ? 'PASS' : 'FAIL',
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        console.log(`${passed ? '✅' : '❌'} ${testName}: ${message}`);
        
        return passed;
    }

    /**
     * Test 1: HTML file exists and is readable
     */
    testHtmlFileExists() {
        try {
            const exists = fs.existsSync(this.htmlFile);
            const stats = exists ? fs.statSync(this.htmlFile) : null;
            
            return this.logTest(
                'HTML File Exists',
                exists && stats.size > 0,
                exists ? `File size: ${stats.size} bytes` : 'File not found'
            );
        } catch (error) {
            return this.logTest('HTML File Exists', false, error.message);
        }
    }

    /**
     * Test 2: Report file exists and shows successful completion
     */
    testReportFileValid() {
        try {
            if (!fs.existsSync(this.reportFile)) {
                return this.logTest('Report File Valid', false, 'Report file not found');
            }

            const report = JSON.parse(fs.readFileSync(this.reportFile, 'utf8'));
            const isValid = report.status === 'SUCCESS' && 
                           report.statistics.totalReplacements > 0 &&
                           report.statistics.errorsCount === 0;

            return this.logTest(
                'Report File Valid',
                isValid,
                `Status: ${report.status}, Replacements: ${report.statistics.totalReplacements}, Errors: ${report.statistics.errorsCount}`
            );
        } catch (error) {
            return this.logTest('Report File Valid', false, error.message);
        }
    }

    /**
     * Test 3: No hardcoded ../ paths remain in HTML
     */
    testNoHardcodedPaths() {
        try {
            const htmlContent = fs.readFileSync(this.htmlFile, 'utf8');
            
            // Check for remaining ../ patterns in src and href attributes
            const hardcodedPatterns = [
                /src="[^"]*\.\.[^"]*"/g,
                /href="[^"]*\.\.[^"]*"/g
            ];

            let foundHardcoded = [];
            hardcodedPatterns.forEach((pattern, index) => {
                const matches = htmlContent.match(pattern);
                if (matches) {
                    foundHardcoded = foundHardcoded.concat(matches);
                }
            });

            return this.logTest(
                'No Hardcoded Paths',
                foundHardcoded.length === 0,
                foundHardcoded.length === 0 ? 'All hardcoded paths removed' : `Found ${foundHardcoded.length} hardcoded paths: ${foundHardcoded.slice(0, 3).join(', ')}`
            );
        } catch (error) {
            return this.logTest('No Hardcoded Paths', false, error.message);
        }
    }

    /**
     * Test 4: Security script paths updated correctly
     */
    testSecurityPathsUpdated() {
        try {
            const htmlContent = fs.readFileSync(this.htmlFile, 'utf8');
            
            // Check that security scripts now point to scripts subdirectory
            const securityScriptPattern = /src="\.\/src\/security\/scripts\/[^"]+"/g;
            const securityScripts = htmlContent.match(securityScriptPattern) || [];
            
            // Check for old security paths (should be 0) - paths that don't include /scripts/
            const oldSecurityPattern = /src="\.\/src\/security\/(?!scripts\/)[^"]*"/g;
            const oldSecurityScripts = htmlContent.match(oldSecurityPattern) || [];

            const isValid = securityScripts.length > 0 && oldSecurityScripts.length === 0;

            return this.logTest(
                'Security Paths Updated',
                isValid,
                `New security paths: ${securityScripts.length}, Old paths remaining: ${oldSecurityScripts.length}`
            );
        } catch (error) {
            return this.logTest('Security Paths Updated', false, error.message);
        }
    }

    /**
     * Test 5: Asset paths updated correctly
     */
    testAssetPathsUpdated() {
        try {
            const htmlContent = fs.readFileSync(this.htmlFile, 'utf8');
            
            // Check for updated asset paths
            const expectedAssetPaths = [
                './assets/styles/high-accessibility.css',
                './assets/scripts/bilingual-common.js',
                './assets/scripts/qrcode.min.js',
                './assets/scripts/qr-utils.js'
            ];

            let foundPaths = 0;
            expectedAssetPaths.forEach(expectedPath => {
                if (htmlContent.includes(expectedPath)) {
                    foundPaths++;
                }
            });

            return this.logTest(
                'Asset Paths Updated',
                foundPaths === expectedAssetPaths.length,
                `Found ${foundPaths}/${expectedAssetPaths.length} expected asset paths`
            );
        } catch (error) {
            return this.logTest('Asset Paths Updated', false, error.message);
        }
    }

    /**
     * Test 6: HTML structure integrity
     */
    testHtmlStructureIntegrity() {
        try {
            const htmlContent = fs.readFileSync(this.htmlFile, 'utf8');
            
            // Check essential HTML structure
            const requiredElements = [
                '<!DOCTYPE html>',
                '<html',
                '<head>',
                '<body>',
                '</html>',
                '<script',
                '<link'
            ];

            let missingElements = [];
            requiredElements.forEach(element => {
                if (!htmlContent.includes(element)) {
                    missingElements.push(element);
                }
            });

            // Check for balanced script tags
            const scriptOpenTags = (htmlContent.match(/<script[^>]*>/g) || []).length;
            const scriptCloseTags = (htmlContent.match(/<\/script>/g) || []).length;
            const scriptsBalanced = scriptOpenTags === scriptCloseTags;

            const isValid = missingElements.length === 0 && scriptsBalanced;

            return this.logTest(
                'HTML Structure Integrity',
                isValid,
                missingElements.length === 0 ? 
                    `Structure valid, script tags balanced (${scriptOpenTags}/${scriptCloseTags})` : 
                    `Missing elements: ${missingElements.join(', ')}`
            );
        } catch (error) {
            return this.logTest('HTML Structure Integrity', false, error.message);
        }
    }

    /**
     * Test 7: Backup file created
     */
    testBackupCreated() {
        try {
            const backupExists = fs.existsSync(this.backupFile);
            const backupStats = backupExists ? fs.statSync(this.backupFile) : null;

            return this.logTest(
                'Backup Created',
                backupExists && backupStats.size > 0,
                backupExists ? `Backup size: ${backupStats.size} bytes` : 'Backup file not found'
            );
        } catch (error) {
            return this.logTest('Backup Created', false, error.message);
        }
    }

    /**
     * Run all smoke tests
     */
    async runAllTests() {
        console.log('🧪 Running RESOURCE-02 Smoke Tests...\n');

        const tests = [
            () => this.testHtmlFileExists(),
            () => this.testReportFileValid(),
            () => this.testNoHardcodedPaths(),
            () => this.testSecurityPathsUpdated(),
            () => this.testAssetPathsUpdated(),
            () => this.testHtmlStructureIntegrity(),
            () => this.testBackupCreated()
        ];

        let passedTests = 0;
        for (const test of tests) {
            if (test()) {
                passedTests++;
            }
        }

        // Generate summary
        const totalTests = tests.length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);

        console.log('\n📊 Test Summary:');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${successRate}%`);

        // Save detailed results
        const detailedReport = {
            task: 'RESOURCE-02 (HTML路徑引用更新)',
            timestamp: new Date().toISOString(),
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: parseFloat(successRate)
            },
            results: this.testResults
        };

        const smokeReportFile = path.join(__dirname, '../../deploy/resource-02-smoke-report.json');
        fs.writeFileSync(smokeReportFile, JSON.stringify(detailedReport, null, 2));
        console.log(`\n📄 Detailed report saved: ${smokeReportFile}`);

        // Return overall success
        return failedTests === 0;
    }
}

// Execute if run directly
if (require.main === module) {
    const smokeTest = new Resource02SmokeTest();
    smokeTest.runAllTests()
        .then(success => {
            if (success) {
                console.log('\n✅ All RESOURCE-02 smoke tests passed!');
                process.exit(0);
            } else {
                console.log('\n❌ Some RESOURCE-02 smoke tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Smoke test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = Resource02SmokeTest;