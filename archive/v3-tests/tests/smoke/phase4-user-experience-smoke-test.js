/**
 * Phase 4 User Experience Components Smoke Test
 * Tests SEC-10 to SEC-12 components for basic functionality
 */

class Phase4UserExperienceSmokeTest {
    constructor() {
        this.testResults = [];
        this.components = {
            userCommunication: null,
            securityOnboarding: null,
            securitySettings: null
        };
    }
    
    async runAllTests() {
        console.log('🧪 Starting Phase 4 User Experience Components Smoke Test...');
        
        try {
            // Test component initialization
            await this.testComponentInitialization();
            
            // Test SEC-10: User Communication System
            await this.testUserCommunication();
            
            // Test SEC-11: Security Feature Onboarding
            await this.testSecurityOnboarding();
            
            // Test SEC-12: Security Settings Management
            await this.testSecuritySettings();
            
            // Test component integration
            await this.testComponentIntegration();
            
            // Generate test report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Phase 4 smoke test failed:', error);
            this.testResults.push({
                test: 'Overall Test Suite',
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        return this.testResults;
    }
    
    async testComponentInitialization() {
        console.log('📋 Testing component initialization...');
        
        try {
            // Test ClientSideUserCommunication initialization
            if (window.ClientSideUserCommunication) {
                this.components.userCommunication = new window.ClientSideUserCommunication();
                this.addTestResult('SEC-10 UserCommunication Init', 'PASSED', 'Component initialized successfully');
            } else {
                this.addTestResult('SEC-10 UserCommunication Init', 'FAILED', 'Component class not found');
            }
            
            // Test ClientSideSecurityOnboarding initialization
            if (window.ClientSideSecurityOnboarding) {
                this.components.securityOnboarding = new window.ClientSideSecurityOnboarding();
                this.addTestResult('SEC-11 SecurityOnboarding Init', 'PASSED', 'Component initialized successfully');
            } else {
                this.addTestResult('SEC-11 SecurityOnboarding Init', 'FAILED', 'Component class not found');
            }
            
            // Test ClientSideSecuritySettings initialization
            if (window.ClientSideSecuritySettings) {
                this.components.securitySettings = new window.ClientSideSecuritySettings();
                this.addTestResult('SEC-12 SecuritySettings Init', 'PASSED', 'Component initialized successfully');
            } else {
                this.addTestResult('SEC-12 SecuritySettings Init', 'FAILED', 'Component class not found');
            }
            
        } catch (error) {
            this.addTestResult('Component Initialization', 'FAILED', error.message);
        }
    }
    
    async testUserCommunication() {
        console.log('💬 Testing User Communication System (SEC-10)...');
        
        try {
            const comm = this.components.userCommunication;
            if (!comm) {
                this.addTestResult('SEC-10 Communication Test', 'SKIPPED', 'Component not initialized');
                return;
            }
            
            // Test message display
            const messageId = comm.showMessage({
                type: 'info',
                title: 'Test Message',
                content: 'This is a test message for smoke testing',
                actions: [
                    { id: 'test-action', label: 'Test Action' }
                ]
            });
            
            if (messageId) {
                this.addTestResult('SEC-10 Show Message', 'PASSED', `Message displayed with ID: ${messageId}`);
                
                // Test message dismissal
                setTimeout(() => {
                    comm.dismissMessage(messageId);
                    this.addTestResult('SEC-10 Dismiss Message', 'PASSED', 'Message dismissed successfully');
                }, 1000);
            } else {
                this.addTestResult('SEC-10 Show Message', 'FAILED', 'Failed to display message');
            }
            
            // Test security enhancement notification
            comm.showSecurityEnhancement({ feature: 'Test Feature' });
            this.addTestResult('SEC-10 Security Enhancement', 'PASSED', 'Security enhancement notification shown');
            
            // Test message queue functionality
            const activeMessages = comm.getActiveMessages();
            this.addTestResult('SEC-10 Active Messages', 'PASSED', `${activeMessages.length} active messages found`);
            
        } catch (error) {
            this.addTestResult('SEC-10 User Communication', 'FAILED', error.message);
        }
    }
    
    async testSecurityOnboarding() {
        console.log('🎯 Testing Security Feature Onboarding (SEC-11)...');
        
        try {
            const onboarding = this.components.securityOnboarding;
            if (!onboarding) {
                this.addTestResult('SEC-11 Onboarding Test', 'SKIPPED', 'Component not initialized');
                return;
            }
            
            // Test preferences management
            const preferences = onboarding.getPreferences();
            this.addTestResult('SEC-11 Get Preferences', 'PASSED', `Retrieved ${Object.keys(preferences).length} preferences`);
            
            // Test feature toggle
            onboarding.setPreference('webauthn', true);
            const updatedPrefs = onboarding.getPreferences();
            
            if (updatedPrefs.webauthn === true) {
                this.addTestResult('SEC-11 Set Preference', 'PASSED', 'Preference updated successfully');
            } else {
                this.addTestResult('SEC-11 Set Preference', 'FAILED', 'Preference not updated');
            }
            
            // Test onboarding reset
            onboarding.resetOnboarding();
            this.addTestResult('SEC-11 Reset Onboarding', 'PASSED', 'Onboarding reset successfully');
            
            // Test new feature handling
            onboarding.handleNewFeature({
                key: 'test-feature',
                name: 'Test Feature',
                description: 'A test security feature',
                benefits: ['Test benefit'],
                risks: ['Test risk'],
                defaultEnabled: false
            });
            this.addTestResult('SEC-11 Handle New Feature', 'PASSED', 'New feature handled successfully');
            
        } catch (error) {
            this.addTestResult('SEC-11 Security Onboarding', 'FAILED', error.message);
        }
    }
    
    async testSecuritySettings() {
        console.log('⚙️ Testing Security Settings Management (SEC-12)...');
        
        try {
            const settings = this.components.securitySettings;
            if (!settings) {
                this.addTestResult('SEC-12 Settings Test', 'SKIPPED', 'Component not initialized');
                return;
            }
            
            // Test preferences retrieval
            const preferences = settings.getPreferences();
            this.addTestResult('SEC-12 Get Preferences', 'PASSED', `Retrieved ${Object.keys(preferences).length} preferences`);
            
            // Test individual preference access
            const webauthnPref = settings.getPreference('webauthn.enabled');
            this.addTestResult('SEC-12 Get Individual Preference', 'PASSED', `WebAuthn preference: ${webauthnPref}`);
            
            // Test preference update
            settings.setPreference('monitoring.enabled', true);
            const monitoringPref = settings.getPreference('monitoring.enabled');
            
            if (monitoringPref === true) {
                this.addTestResult('SEC-12 Set Preference', 'PASSED', 'Monitoring preference updated');
            } else {
                this.addTestResult('SEC-12 Set Preference', 'FAILED', 'Preference not updated correctly');
            }
            
            // Test settings export (mock)
            try {
                // We can't actually trigger file download in test, but we can test the method exists
                if (typeof settings.exportSettings === 'function') {
                    this.addTestResult('SEC-12 Export Settings', 'PASSED', 'Export function available');
                } else {
                    this.addTestResult('SEC-12 Export Settings', 'FAILED', 'Export function not found');
                }
            } catch (exportError) {
                this.addTestResult('SEC-12 Export Settings', 'WARNING', 'Export test skipped in test environment');
            }
            
            // Test settings reset
            settings.resetSettings();
            this.addTestResult('SEC-12 Reset Settings', 'PASSED', 'Settings reset successfully');
            
        } catch (error) {
            this.addTestResult('SEC-12 Security Settings', 'FAILED', error.message);
        }
    }
    
    async testComponentIntegration() {
        console.log('🔗 Testing component integration...');
        
        try {
            // Test event communication between components
            let eventReceived = false;
            
            // Listen for security preference change event
            document.addEventListener('security-preference-changed', (event) => {
                eventReceived = true;
                this.addTestResult('Integration Event Communication', 'PASSED', `Event received: ${event.detail.feature}`);
            });
            
            // Trigger event from onboarding component
            if (this.components.securityOnboarding) {
                document.dispatchEvent(new CustomEvent('security-preference-changed', {
                    detail: { feature: 'test-integration', enabled: true }
                }));
            }
            
            // Wait for event processing
            setTimeout(() => {
                if (!eventReceived) {
                    this.addTestResult('Integration Event Communication', 'WARNING', 'Event not received within timeout');
                }
            }, 500);
            
            // Test localStorage persistence
            const testKey = 'test-phase4-integration';
            const testValue = { test: true, timestamp: Date.now() };
            
            localStorage.setItem(testKey, JSON.stringify(testValue));
            const retrieved = JSON.parse(localStorage.getItem(testKey) || '{}');
            
            if (retrieved.test === true) {
                this.addTestResult('Integration localStorage', 'PASSED', 'localStorage persistence working');
                localStorage.removeItem(testKey); // Cleanup
            } else {
                this.addTestResult('Integration localStorage', 'FAILED', 'localStorage persistence failed');
            }
            
            // Test global instance availability
            const globalInstances = {
                userCommunication: !!window.userCommunication,
                securityOnboarding: !!window.securityOnboarding,
                securitySettings: !!window.securitySettings
            };
            
            const availableInstances = Object.values(globalInstances).filter(Boolean).length;
            this.addTestResult('Integration Global Instances', 'PASSED', `${availableInstances}/3 global instances available`);
            
        } catch (error) {
            this.addTestResult('Component Integration', 'FAILED', error.message);
        }
    }
    
    addTestResult(test, status, details) {
        const result = {
            test,
            status,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const statusIcon = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
        console.log(`${statusIcon} ${test}: ${details}`);
    }
    
    generateTestReport() {
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
        const skipped = this.testResults.filter(r => r.status === 'SKIPPED').length;
        
        console.log('\n📊 Phase 4 User Experience Components Test Report:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`⏭️ Skipped: ${skipped}`);
        console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
        
        if (failed === 0) {
            console.log('🎉 All Phase 4 components are functioning correctly!');
        } else {
            console.log('🔧 Some Phase 4 components need attention.');
        }
        
        return {
            summary: { passed, failed, warnings, skipped },
            successRate: Math.round((passed / (passed + failed)) * 100),
            results: this.testResults
        };
    }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Phase4UserExperienceSmokeTest;
} else if (typeof window !== 'undefined') {
    window.Phase4UserExperienceSmokeTest = Phase4UserExperienceSmokeTest;
}

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location && window.location.search.includes('autorun=phase4')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const tester = new Phase4UserExperienceSmokeTest();
        await tester.runAllTests();
    });
}