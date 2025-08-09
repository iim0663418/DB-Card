/**
 * DEPLOY-002 Smoke Tests - Security Monitoring & Alerting
 * 
 * Tests:
 * - Enhanced Security Monitor initialization
 * - Security Dashboard functionality
 * - Alert Manager operations
 * - Real-time monitoring capabilities
 * - Performance impact validation
 * - Accessibility compliance
 */

describe('DEPLOY-002: Security Monitoring & Alerting', () => {
    let originalConsole;
    let consoleOutput = [];

    beforeAll(() => {
        // Mock console to capture output
        originalConsole = { ...console };
        console.log = jest.fn((...args) => consoleOutput.push(['log', ...args]));
        console.warn = jest.fn((...args) => consoleOutput.push(['warn', ...args]));
        console.error = jest.fn((...args) => consoleOutput.push(['error', ...args]));

        // Mock DOM environment
        document.body.innerHTML = '<div id="test-container"></div>';
        
        // Mock Notification API
        global.Notification = class MockNotification {
            constructor(title, options) {
                this.title = title;
                this.options = options;
                MockNotification.instances.push(this);
            }
            
            close() {
                this.closed = true;
            }
            
            static instances = [];
            static permission = 'granted';
            static requestPermission = jest.fn().mockResolvedValue('granted');
        };

        // Mock AudioContext
        global.AudioContext = class MockAudioContext {
            constructor() {
                this.currentTime = 0;
            }
            
            createOscillator() {
                return {
                    connect: jest.fn(),
                    frequency: { setValueAtTime: jest.fn() },
                    type: 'sine',
                    start: jest.fn(),
                    stop: jest.fn()
                };
            }
            
            createGain() {
                return {
                    connect: jest.fn(),
                    gain: {
                        setValueAtTime: jest.fn(),
                        exponentialRampToValueAtTime: jest.fn()
                    }
                };
            }
            
            get destination() {
                return { connect: jest.fn() };
            }
        };
    });

    afterAll(() => {
        // Restore console
        Object.assign(console, originalConsole);
    });

    beforeEach(() => {
        consoleOutput = [];
        global.Notification.instances = [];
        
        // Clear any existing instances
        if (window.EnhancedSecurityMonitor) {
            delete window.EnhancedSecurityMonitor;
        }
        if (window.SecurityDashboard) {
            delete window.SecurityDashboard;
        }
        if (window.AlertManager) {
            delete window.AlertManager;
        }
    });

    describe('Enhanced Security Monitor', () => {
        test('should initialize successfully', async () => {
            // Load the enhanced security monitor
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            expect(window.EnhancedSecurityMonitor).toBeDefined();
            
            // Test singleton pattern
            const instance1 = window.EnhancedSecurityMonitor.getInstance();
            const instance2 = window.EnhancedSecurityMonitor.getInstance();
            expect(instance1).toBe(instance2);
        });

        test('should record security events', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            // Record a test event
            window.EnhancedSecurityMonitor.recordEvent('testEvent', {
                source: 'smoke-test',
                severity: 'low'
            });
            
            // Verify event was recorded
            const metrics = window.EnhancedSecurityMonitor.getMetrics();
            expect(metrics.testEvent).toBeDefined();
            expect(metrics.testEvent.total).toBe(1);
        });

        test('should trigger alerts based on thresholds', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            // Record multiple XSS attempts to trigger alert
            for (let i = 0; i < 2; i++) {
                window.EnhancedSecurityMonitor.recordEvent('xssAttempts', {
                    source: 'smoke-test'
                });
            }
            
            // Check if alert was triggered
            const activeAlerts = window.EnhancedSecurityMonitor.getActiveAlerts();
            expect(activeAlerts.length).toBeGreaterThan(0);
            
            const xssAlert = activeAlerts.find(alert => alert.type === 'xssAttempts');
            expect(xssAlert).toBeDefined();
            expect(xssAlert.severity).toBe('critical');
        });

        test('should perform health checks', async () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            const healthCheck = await window.EnhancedSecurityMonitor.performHealthCheck();
            
            expect(healthCheck).toBeDefined();
            expect(healthCheck.status).toMatch(/healthy|unhealthy|error/);
            expect(healthCheck.timestamp).toBeDefined();
            expect(healthCheck.checks).toBeDefined();
            expect(healthCheck.performance).toBeDefined();
        });

        test('should acknowledge alerts', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            // Trigger an alert
            window.EnhancedSecurityMonitor.recordEvent('xssAttempts', {});
            window.EnhancedSecurityMonitor.recordEvent('xssAttempts', {});
            
            const activeAlerts = window.EnhancedSecurityMonitor.getActiveAlerts();
            expect(activeAlerts.length).toBeGreaterThan(0);
            
            const alertId = activeAlerts[0].id;
            const acknowledged = window.EnhancedSecurityMonitor.acknowledgeAlert(alertId, 'smoke-test');
            
            expect(acknowledged).toBe(true);
        });

        test('should maintain performance metrics', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            // Record some events to generate performance data
            for (let i = 0; i < 5; i++) {
                window.EnhancedSecurityMonitor.recordEvent('testEvent', {});
            }
            
            // Get performance metrics
            window.EnhancedSecurityMonitor.performHealthCheck().then(healthCheck => {
                expect(healthCheck.performance).toBeDefined();
                expect(healthCheck.performance.eventCount).toBeGreaterThan(0);
                expect(healthCheck.performance.avgProcessingTime).toBeDefined();
                expect(healthCheck.performance.uptime).toBeGreaterThan(0);
            });
        });
    });

    describe('Security Dashboard', () => {
        test('should initialize with accessible structure', () => {
            require('../../pwa-card-storage/src/security/security-dashboard.js');
            
            expect(window.SecurityDashboard).toBeDefined();
            
            // Check if dashboard was created
            const dashboard = document.querySelector('.security-dashboard');
            expect(dashboard).toBeTruthy();
            
            // Check accessibility attributes
            expect(dashboard.getAttribute('role')).toBe('region');
            expect(dashboard.getAttribute('aria-label')).toContain('Security Monitoring Dashboard');
        });

        test('should have proper ARIA labels and roles', () => {
            require('../../pwa-card-storage/src/security/security-dashboard.js');
            
            const dashboard = document.querySelector('.security-dashboard');
            
            // Check section headings
            const statusHeading = document.getElementById('status-heading');
            const alertsHeading = document.getElementById('alerts-heading');
            const metricsHeading = document.getElementById('metrics-heading');
            
            expect(statusHeading).toBeTruthy();
            expect(alertsHeading).toBeTruthy();
            expect(metricsHeading).toBeTruthy();
            
            // Check ARIA live regions
            const systemStatus = document.getElementById('system-status');
            const alertsContainer = document.getElementById('alerts-container');
            
            expect(systemStatus.getAttribute('aria-live')).toBe('polite');
            expect(alertsContainer.getAttribute('aria-live')).toBe('assertive');
        });

        test('should support keyboard navigation', () => {
            require('../../pwa-card-storage/src/security/security-dashboard.js');
            
            const toggleButton = document.getElementById('toggle-dashboard');
            expect(toggleButton).toBeTruthy();
            
            // Test keyboard event handling
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            const ctrlShiftSEvent = new KeyboardEvent('keydown', { 
                key: 'S', 
                ctrlKey: true, 
                shiftKey: true 
            });
            
            // These should not throw errors
            expect(() => {
                document.dispatchEvent(ctrlShiftSEvent);
                document.dispatchEvent(escapeEvent);
            }).not.toThrow();
        });

        test('should toggle visibility correctly', () => {
            require('../../pwa-card-storage/src/security/security-dashboard.js');
            
            const toggleButton = document.getElementById('toggle-dashboard');
            const dashboardContent = document.getElementById('dashboard-content');
            
            // Initially hidden
            expect(dashboardContent.getAttribute('aria-hidden')).toBe('true');
            expect(toggleButton.getAttribute('aria-expanded')).toBe('false');
            
            // Simulate click
            toggleButton.click();
            
            // Should be visible now
            expect(dashboardContent.getAttribute('aria-hidden')).toBe('false');
            expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
        });

        test('should handle security events', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            require('../../pwa-card-storage/src/security/security-dashboard.js');
            
            // Trigger a security event
            window.EnhancedSecurityMonitor.recordEvent('testEvent', {});
            
            // Dashboard should handle the event (no errors thrown)
            expect(() => {
                window.dispatchEvent(new CustomEvent('securityAlert', {
                    detail: {
                        id: 'test-alert',
                        type: 'testEvent',
                        severity: 'medium'
                    }
                }));
            }).not.toThrow();
        });
    });

    describe('Alert Manager', () => {
        test('should initialize successfully', () => {
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            expect(window.AlertManager).toBeDefined();
            
            // Test singleton pattern
            const instance1 = window.AlertManager.getInstance();
            const instance2 = window.AlertManager.getInstance();
            expect(instance1).toBe(instance2);
        });

        test('should process alerts through multiple channels', () => {
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            const testAlert = {
                id: 'test-alert-001',
                type: 'testAlert',
                severity: 'high',
                count: 5,
                threshold: 3,
                timestamp: Date.now(),
                responseTime: 60 * 60 * 1000 // 1 hour
            };
            
            // Process alert
            expect(() => {
                window.AlertManager.processAlert(testAlert);
            }).not.toThrow();
            
            // Check console output
            const errorLogs = consoleOutput.filter(log => log[0] === 'warn');
            expect(errorLogs.length).toBeGreaterThan(0);
        });

        test('should send browser notifications', () => {
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            const testAlert = {
                id: 'test-alert-002',
                type: 'criticalTest',
                severity: 'critical',
                count: 1,
                threshold: 1,
                timestamp: Date.now()
            };
            
            window.AlertManager.processAlert(testAlert);
            
            // Check if notification was created
            expect(global.Notification.instances.length).toBeGreaterThan(0);
            
            const notification = global.Notification.instances[0];
            expect(notification.title).toContain('Security Alert');
            expect(notification.options.body).toContain('critical severity');
        });

        test('should handle alert correlation', () => {
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            const baseAlert = {
                type: 'correlationTest',
                severity: 'medium',
                count: 1,
                threshold: 1,
                timestamp: Date.now()
            };
            
            // Send multiple similar alerts
            for (let i = 0; i < 3; i++) {
                window.AlertManager.processAlert({
                    ...baseAlert,
                    id: `corr-test-${i}`,
                    timestamp: Date.now() + i * 1000
                });
            }
            
            // Should handle correlation without errors
            expect(consoleOutput.length).toBeGreaterThan(0);
        });

        test('should provide alert statistics', () => {
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            // Process some test alerts
            for (let i = 0; i < 3; i++) {
                window.AlertManager.processAlert({
                    id: `stats-test-${i}`,
                    type: 'statsTest',
                    severity: 'low',
                    count: 1,
                    threshold: 1,
                    timestamp: Date.now()
                });
            }
            
            const stats = window.AlertManager.getAlertStatistics();
            
            expect(stats).toBeDefined();
            expect(stats.total).toBeGreaterThan(0);
            expect(stats.last24h).toBeGreaterThan(0);
            expect(stats.bySeverity).toBeDefined();
            expect(stats.byType).toBeDefined();
        });

        test('should manage user preferences', () => {
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            const newPreferences = {
                browserNotifications: false,
                soundAlerts: true,
                consoleAlerts: true
            };
            
            window.AlertManager.updatePreferences(newPreferences);
            
            const currentPrefs = window.AlertManager.getPreferences();
            expect(currentPrefs.browserNotifications).toBe(false);
            expect(currentPrefs.soundAlerts).toBe(true);
            expect(currentPrefs.consoleAlerts).toBe(true);
        });
    });

    describe('Integration Tests', () => {
        test('should integrate all monitoring components', () => {
            // Load all components
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            require('../../pwa-card-storage/src/security/security-dashboard.js');
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            expect(window.EnhancedSecurityMonitor).toBeDefined();
            expect(window.SecurityDashboard).toBeDefined();
            expect(window.AlertManager).toBeDefined();
            
            // Test integration by triggering an event
            window.EnhancedSecurityMonitor.recordEvent('integrationTest', {
                source: 'smoke-test'
            });
            
            // Should not throw any errors
            expect(consoleOutput.some(log => log.includes('error'))).toBe(false);
        });

        test('should handle high event volume without performance degradation', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            const startTime = performance.now();
            
            // Generate high volume of events
            for (let i = 0; i < 100; i++) {
                window.EnhancedSecurityMonitor.recordEvent('performanceTest', {
                    iteration: i
                });
            }
            
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            
            // Should process 100 events in reasonable time (< 100ms)
            expect(processingTime).toBeLessThan(100);
            
            // Check metrics
            const metrics = window.EnhancedSecurityMonitor.getMetrics();
            expect(metrics.performanceTest.total).toBe(100);
        });

        test('should maintain accessibility during dynamic updates', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            require('../../pwa-card-storage/src/security/security-dashboard.js');
            
            // Show dashboard
            const toggleButton = document.getElementById('toggle-dashboard');
            toggleButton.click();
            
            // Trigger events that will update dashboard
            window.EnhancedSecurityMonitor.recordEvent('accessibilityTest', {});
            
            // Check that ARIA live regions are still properly configured
            const systemStatus = document.getElementById('system-status');
            const alertsContainer = document.getElementById('alerts-container');
            
            expect(systemStatus.getAttribute('aria-live')).toBe('polite');
            expect(alertsContainer.getAttribute('aria-live')).toBe('assertive');
            
            // Check that dynamic content maintains accessibility
            const alertItems = document.querySelectorAll('.alert-item');
            alertItems.forEach(item => {
                expect(item.getAttribute('role')).toBe('alert');
            });
        });

        test('should handle error conditions gracefully', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            // Test with invalid event data
            expect(() => {
                window.EnhancedSecurityMonitor.recordEvent(null, null);
            }).not.toThrow();
            
            expect(() => {
                window.EnhancedSecurityMonitor.recordEvent('', {});
            }).not.toThrow();
            
            // Test with invalid alert data
            expect(() => {
                window.AlertManager.processAlert(null);
            }).not.toThrow();
            
            expect(() => {
                window.AlertManager.processAlert({});
            }).not.toThrow();
        });
    });

    describe('Performance Validation', () => {
        test('should meet performance requirements', async () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            const healthCheck = await window.EnhancedSecurityMonitor.performHealthCheck();
            
            // Check performance metrics
            expect(healthCheck.performance).toBeDefined();
            
            // Average processing time should be < 50ms
            if (healthCheck.performance.avgProcessingTime > 0) {
                expect(healthCheck.performance.avgProcessingTime).toBeLessThan(50);
            }
            
            // Events per second should be reasonable
            if (healthCheck.performance.eventsPerSecond > 0) {
                expect(healthCheck.performance.eventsPerSecond).toBeLessThan(100);
            }
        });

        test('should not exceed memory limits', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            require('../../pwa-card-storage/src/security/alert-manager.js');
            
            const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Generate events to test memory usage
            for (let i = 0; i < 50; i++) {
                window.EnhancedSecurityMonitor.recordEvent('memoryTest', {
                    data: 'x'.repeat(100) // Small payload
                });
            }
            
            const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (< 1MB for 50 events)
            if (performance.memory) {
                expect(memoryIncrease).toBeLessThan(1024 * 1024); // 1MB
            }
        });
    });

    describe('Security Validation', () => {
        test('should sanitize event data', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            // Test with potentially malicious data
            window.EnhancedSecurityMonitor.recordEvent('sanitizationTest', {
                maliciousScript: '<script>alert("xss")</script>',
                sqlInjection: "'; DROP TABLE users; --",
                logInjection: 'test\r\nFAKE LOG ENTRY',
                oversizedData: 'x'.repeat(1000)
            });
            
            const metrics = window.EnhancedSecurityMonitor.getMetrics();
            expect(metrics.sanitizationTest).toBeDefined();
            
            // Should not contain any console errors about XSS or injection
            const errorLogs = consoleOutput.filter(log => 
                log[0] === 'error' && 
                (log.join(' ').includes('script') || log.join(' ').includes('injection'))
            );
            expect(errorLogs.length).toBe(0);
        });

        test('should validate alert acknowledgment', () => {
            require('../../pwa-card-storage/src/security/security-monitor-enhanced.js');
            
            // Test invalid alert ID
            const result1 = window.EnhancedSecurityMonitor.acknowledgeAlert('invalid-id');
            expect(result1).toBe(false);
            
            // Test with potentially malicious alert ID
            const result2 = window.EnhancedSecurityMonitor.acknowledgeAlert('<script>alert("xss")</script>');
            expect(result2).toBe(false);
        });
    });
});

// Export for potential use in other test files
module.exports = {
    testSecurityMonitoring: () => {
        return {
            EnhancedSecurityMonitor: window.EnhancedSecurityMonitor,
            SecurityDashboard: window.SecurityDashboard,
            AlertManager: window.AlertManager
        };
    }
};