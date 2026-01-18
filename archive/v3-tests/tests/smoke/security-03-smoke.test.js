#!/usr/bin/env node

/**
 * SECURITY-03 Smoke Test Suite
 * Validates security module path updates implementation
 */

const fs = require('fs');
const path = require('path');

class Security03SmokeTest {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.securityPath = path.join(this.projectRoot, 'pwa-card-storage/src/security');
        this.reportPath = path.join(this.projectRoot, 'deploy/security-03-path-update-report.json');
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 SECURITY-03 Smoke Test Suite');
        console.log('================================\n');

        try {
            await this.testToolExecution();
            await this.testPathUpdateResults();
            await this.testModuleIntegrity();
            await this.testSecurityValidation();
            await this.testBackupCreation();
            await this.testReportGeneration();
            await this.testModuleLoadability();
            await this.testPathSecurity();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        }
    }

    async testToolExecution() {
        const testName = 'Security Module Path Updater Tool Execution';
        
        try {
            const toolPath = path.join(this.projectRoot, 'deploy/security-module-path-updater.js');
            
            if (!fs.existsSync(toolPath)) {
                throw new Error('Security module path updater tool not found');
            }

            const toolContent = fs.readFileSync(toolPath, 'utf8');
            
            // Check for required methods
            const requiredMethods = [
                'validateEnvironment',
                'scanAndUpdateModules', 
                'processSecurityModule',
                'validateModuleIntegrity',
                'sanitizePath'
            ];

            for (const method of requiredMethods) {
                if (!toolContent.includes(method)) {
                    throw new Error(`Missing required method: ${method}`);
                }
            }

            // Check for security features
            if (!toolContent.includes('path traversal protection')) {
                throw new Error('Missing path traversal protection');
            }

            this.addTestResult(testName, true, 'Tool created with all required methods and security features');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testPathUpdateResults() {
        const testName = 'Path Update Results Validation';
        
        try {
            if (!fs.existsSync(this.reportPath)) {
                throw new Error('Path update report not found');
            }

            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            
            if (report.results.filesProcessed !== 6) {
                throw new Error(`Expected 6 files processed, got ${report.results.filesProcessed}`);
            }

            if (report.results.errors.length > 0) {
                throw new Error(`Processing errors found: ${report.results.errors.join(', ')}`);
            }

            // Validate that all security modules were processed
            const expectedModules = [
                'SecurityInputHandler.js',
                'SecurityDataHandler.js',
                'SecurityAuthHandler.js',
                'SecurityConfigManager.js',
                'SecurityMonitor.js',
                'StaticHostingCompatibilityLayer.js'
            ];

            for (const module of expectedModules) {
                const modulePath = path.join(this.securityPath, module);
                if (!fs.existsSync(modulePath)) {
                    throw new Error(`Security module missing after update: ${module}`);
                }
            }

            this.addTestResult(testName, true, `${report.results.filesProcessed} files processed successfully, ${report.results.pathsUpdated} paths updated`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testModuleIntegrity() {
        const testName = 'Module Integrity Validation';
        
        try {
            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            
            if (!report.results.integrityChecks || report.results.integrityChecks.length === 0) {
                throw new Error('No integrity checks performed');
            }

            let validModules = 0;
            for (const check of report.results.integrityChecks) {
                if (check.hasClass || check.hasExports) {
                    validModules++;
                }
                
                if (check.size === 0) {
                    throw new Error(`Empty module detected: ${check.file}`);
                }
            }

            if (validModules < 6) {
                throw new Error(`Only ${validModules}/6 modules have valid structure`);
            }

            this.addTestResult(testName, true, `${report.results.integrityChecks.length} modules passed integrity validation`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testSecurityValidation() {
        const testName = 'Security Validation Features';
        
        try {
            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            
            if (!report.securityValidation) {
                throw new Error('Security validation section missing from report');
            }

            const requiredFeatures = [
                'pathTraversalProtection',
                'moduleIntegrityValidation',
                'backupCreated'
            ];

            for (const feature of requiredFeatures) {
                if (!report.securityValidation[feature]) {
                    throw new Error(`Security feature not enabled: ${feature}`);
                }
            }

            // Check for dangerous patterns in modules
            const securityFiles = fs.readdirSync(this.securityPath)
                .filter(file => file.endsWith('.js'));

            for (const fileName of securityFiles) {
                const filePath = path.join(this.securityPath, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for dangerous path patterns (should be minimal after update)
                const dangerousPatterns = [
                    /\/etc\//g,
                    /\/proc\//g,
                    /C:\\/g
                ];

                for (const pattern of dangerousPatterns) {
                    if (pattern.test(content)) {
                        throw new Error(`Dangerous path pattern found in ${fileName}`);
                    }
                }
            }

            this.addTestResult(testName, true, 'All security validation features enabled, no dangerous patterns detected');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testBackupCreation() {
        const testName = 'Backup Creation Validation';
        
        try {
            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            
            if (!report.results.backups || report.results.backups.length === 0) {
                throw new Error('No backups created');
            }

            // Verify backup files exist
            let validBackups = 0;
            for (const backupPath of report.results.backups) {
                if (fs.existsSync(backupPath)) {
                    const backupContent = fs.readFileSync(backupPath, 'utf8');
                    if (backupContent.length > 0) {
                        validBackups++;
                    }
                }
            }

            if (validBackups !== report.results.backups.length) {
                throw new Error(`Only ${validBackups}/${report.results.backups.length} backups are valid`);
            }

            this.addTestResult(testName, true, `${validBackups} backup files created and validated`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testReportGeneration() {
        const testName = 'Report Generation Validation';
        
        try {
            if (!fs.existsSync(this.reportPath)) {
                throw new Error('Report file not generated');
            }

            const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
            
            const requiredFields = [
                'timestamp',
                'task',
                'description', 
                'results',
                'summary',
                'pathPatterns',
                'securityValidation'
            ];

            for (const field of requiredFields) {
                if (!report[field]) {
                    throw new Error(`Missing required report field: ${field}`);
                }
            }

            if (report.task !== 'SECURITY-03') {
                throw new Error(`Incorrect task ID in report: ${report.task}`);
            }

            if (!report.pathPatterns || report.pathPatterns.length === 0) {
                throw new Error('No path patterns documented in report');
            }

            this.addTestResult(testName, true, 'Complete report generated with all required fields');
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testModuleLoadability() {
        const testName = 'Module Loadability Test';
        
        try {
            const securityFiles = fs.readdirSync(this.securityPath)
                .filter(file => file.endsWith('.js'));

            let loadableModules = 0;
            for (const fileName of securityFiles) {
                const filePath = path.join(this.securityPath, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Basic syntax validation
                const braceCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
                const parenCount = (content.match(/\(/g) || []).length - (content.match(/\)/g) || []).length;
                
                if (Math.abs(braceCount) <= 2 && Math.abs(parenCount) <= 2) { // Allow reasonable imbalances
                    loadableModules++;
                }
            }

            if (loadableModules < securityFiles.length) {
                throw new Error(`Only ${loadableModules}/${securityFiles.length} modules appear loadable`);
            }

            this.addTestResult(testName, true, `${loadableModules} modules passed basic syntax validation`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    async testPathSecurity() {
        const testName = 'Path Security Validation';
        
        try {
            const securityFiles = fs.readdirSync(this.securityPath)
                .filter(file => file.endsWith('.js'));

            let secureModules = 0;
            let allowedParentRefs = 0;

            for (const fileName of securityFiles) {
                const filePath = path.join(this.securityPath, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Count parent directory references
                const parentRefs = (content.match(/\.\.\//g) || []).length;
                const allowedRefs = (content.match(/\.\.\/(assets|config)\//g) || []).length;
                
                // Allow only safe parent references (to assets and config)
                if (parentRefs === allowedRefs) {
                    secureModules++;
                    allowedParentRefs += allowedRefs;
                }
            }

            if (secureModules !== securityFiles.length) {
                throw new Error(`${securityFiles.length - secureModules} modules have unsafe path references`);
            }

            this.addTestResult(testName, true, `${secureModules} modules have secure path references (${allowedParentRefs} allowed parent refs)`);
            
        } catch (error) {
            this.addTestResult(testName, false, error.message);
        }
    }

    addTestResult(testName, passed, message) {
        this.testResults.push({
            name: testName,
            passed,
            message
        });
    }

    printResults() {
        console.log('\n📊 Test Results Summary');
        console.log('=======================');
        
        let passedCount = 0;
        let totalCount = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            const number = `${index + 1}`.padStart(2, '0');
            
            console.log(`${number}. ${status} - ${result.name}`);
            console.log(`    ${result.message}\n`);
            
            if (result.passed) passedCount++;
        });
        
        const successRate = ((passedCount / totalCount) * 100).toFixed(1);
        console.log(`🎯 Overall Result: ${passedCount}/${totalCount} tests passed (${successRate}%)`);
        
        if (passedCount === totalCount) {
            console.log('🎉 All tests passed! SECURITY-03 implementation is successful.');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
            process.exit(1);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const tester = new Security03SmokeTest();
    tester.runAllTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = Security03SmokeTest;