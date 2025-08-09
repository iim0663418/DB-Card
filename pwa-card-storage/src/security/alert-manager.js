/**
 * Alert Manager - Advanced Alert Processing & Notification System
 * DEPLOY-002: 安全監控與告警機制實作
 * 
 * Features:
 * - Multi-channel alert notifications
 * - Alert correlation and deduplication
 * - Escalation policies
 * - Notification preferences management
 * - Alert history and audit trail
 */
class AlertManager {
    static #instance = null;
    static #alertHistory = [];
    static #notificationChannels = new Map();
    static #escalationPolicies = new Map();
    static #alertCorrelation = new Map();
    static #userPreferences = {
        browserNotifications: true,
        consoleAlerts: true,
        dashboardAlerts: true,
        soundAlerts: false,
        emailAlerts: false // Would require backend integration
    };

    static getInstance() {
        if (!this.#instance) {
            this.#instance = new AlertManager();
        }
        return this.#instance;
    }

    constructor() {
        if (AlertManager.#instance) {
            return AlertManager.#instance;
        }
        this.#initializeAlertManager();
    }

    /**
     * Initialize alert manager
     */
    #initializeAlertManager() {
        this.#setupNotificationChannels();
        this.#setupEscalationPolicies();
        this.#requestNotificationPermission();
        this.#startCorrelationEngine();
        
        // Subscribe to security monitor alerts
        if (window.EnhancedSecurityMonitor) {
            window.EnhancedSecurityMonitor.subscribe(this.#handleSecurityEvent.bind(this));
        }
        
        this.#secureLog('info', 'Alert manager initialized', {
            channels: this.#notificationChannels.size,
            policies: this.#escalationPolicies.size
        });
    }

    /**
     * Setup notification channels
     */
    #setupNotificationChannels() {
        // Console notification channel
        this.#notificationChannels.set('console', {
            name: 'Console Alerts',
            enabled: AlertManager.#userPreferences.consoleAlerts,
            handler: this.#sendConsoleNotification.bind(this),
            priority: 1
        });

        // Browser notification channel
        this.#notificationChannels.set('browser', {
            name: 'Browser Notifications',
            enabled: AlertManager.#userPreferences.browserNotifications,
            handler: this.#sendBrowserNotification.bind(this),
            priority: 2
        });

        // Dashboard notification channel
        this.#notificationChannels.set('dashboard', {
            name: 'Dashboard Alerts',
            enabled: AlertManager.#userPreferences.dashboardAlerts,
            handler: this.#sendDashboardNotification.bind(this),
            priority: 3
        });

        // Sound notification channel
        this.#notificationChannels.set('sound', {
            name: 'Sound Alerts',
            enabled: AlertManager.#userPreferences.soundAlerts,
            handler: this.#sendSoundNotification.bind(this),
            priority: 4
        });
    }

    /**
     * Setup escalation policies
     */
    #setupEscalationPolicies() {
        // Critical alerts escalation
        this.#escalationPolicies.set('critical', {
            initialDelay: 0, // Immediate
            escalationSteps: [
                { delay: 0, channels: ['console', 'browser', 'dashboard', 'sound'] },
                { delay: 5 * 60 * 1000, channels: ['console', 'browser'] }, // 5 minutes
                { delay: 15 * 60 * 1000, channels: ['console'] } // 15 minutes
            ],
            maxEscalations: 3
        });

        // High severity alerts escalation
        this.#escalationPolicies.set('high', {
            initialDelay: 0,
            escalationSteps: [
                { delay: 0, channels: ['console', 'dashboard'] },
                { delay: 30 * 60 * 1000, channels: ['console', 'browser'] }, // 30 minutes
                { delay: 60 * 60 * 1000, channels: ['console'] } // 1 hour
            ],
            maxEscalations: 2
        });

        // Medium severity alerts escalation
        this.#escalationPolicies.set('medium', {
            initialDelay: 0,
            escalationSteps: [
                { delay: 0, channels: ['dashboard'] },
                { delay: 2 * 60 * 60 * 1000, channels: ['console'] } // 2 hours
            ],
            maxEscalations: 1
        });

        // Low severity alerts (no escalation)
        this.#escalationPolicies.set('low', {
            initialDelay: 0,
            escalationSteps: [
                { delay: 0, channels: ['dashboard'] }
            ],
            maxEscalations: 0
        });
    }

    /**
     * Request browser notification permission
     */
    #requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.#secureLog('info', 'Browser notification permission granted', {});
                } else {
                    this.#secureLog('warn', 'Browser notification permission denied', {});
                    AlertManager.#userPreferences.browserNotifications = false;
                }
            });
        }
    }

    /**
     * Start correlation engine
     */
    #startCorrelationEngine() {
        // Run correlation analysis every 2 minutes
        setInterval(() => {
            this.#performAlertCorrelation();
        }, 2 * 60 * 1000);

        // Cleanup old correlation data every 10 minutes
        setInterval(() => {
            this.#cleanupCorrelationData();
        }, 10 * 60 * 1000);
    }

    /**
     * Handle security events from monitor
     */
    #handleSecurityEvent(event) {
        if (event.type === 'alert') {
            this.processAlert(event.data);
        } else if (event.type === 'escalation') {
            this.handleEscalation(event.data);
        }
    }

    /**
     * Process incoming alert
     */
    static processAlert(alert) {
        const instance = this.getInstance();
        return instance.#processAlertInternal(alert);
    }

    #processAlertInternal(alert) {
        try {
            // Add to history
            AlertManager.#alertHistory.push({
                ...alert,
                processedAt: Date.now(),
                correlationId: this.#generateCorrelationId(alert)
            });

            // Check for correlation
            const correlatedAlert = this.#checkAlertCorrelation(alert);
            if (correlatedAlert) {
                this.#handleCorrelatedAlert(alert, correlatedAlert);
                return;
            }

            // Process new alert
            this.#executeAlertNotification(alert);
            
            // Setup escalation if needed
            this.#setupAlertEscalation(alert);
            
            this.#secureLog('info', 'Alert processed', {
                alertId: alert.id,
                type: alert.type,
                severity: alert.severity
            });

        } catch (error) {
            this.#secureLog('error', 'Alert processing failed', {
                alertId: alert.id || 'unknown',
                error: error.message
            });
        }
    }

    /**
     * Execute alert notification through configured channels
     */
    #executeAlertNotification(alert) {
        const policy = AlertManager.#escalationPolicies.get(alert.severity);
        if (!policy) return;

        const initialStep = policy.escalationSteps[0];
        if (initialStep) {
            this.#sendNotificationThroughChannels(alert, initialStep.channels);
        }
    }

    /**
     * Send notification through specified channels
     */
    #sendNotificationThroughChannels(alert, channelNames) {
        channelNames.forEach(channelName => {
            const channel = AlertManager.#notificationChannels.get(channelName);
            if (channel && channel.enabled) {
                try {
                    channel.handler(alert);
                } catch (error) {
                    this.#secureLog('error', 'Notification channel failed', {
                        channel: channelName,
                        alertId: alert.id
                    });
                }
            }
        });
    }

    /**
     * Console notification handler
     */
    #sendConsoleNotification(alert) {
        const message = `[ALERT-MANAGER] ${alert.type}: ${alert.count}/${alert.threshold} events`;
        const data = {
            id: alert.id,
            severity: alert.severity,
            timestamp: alert.timestamp,
            responseTime: alert.responseTime
        };

        switch (alert.severity) {
            case 'critical':
                console.error(message, data);
                break;
            case 'high':
                console.warn(message, data);
                break;
            default:
                console.log(message, data);
        }
    }

    /**
     * Browser notification handler
     */
    #sendBrowserNotification(alert) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = `Security Alert: ${alert.type}`;
            const body = `${alert.count} events detected (${alert.severity} severity)`;
            const options = {
                body,
                icon: '/assets/icons/icon-32x32.png',
                tag: `alert-${alert.id}`,
                requireInteraction: alert.severity === 'critical',
                data: { alertId: alert.id, severity: alert.severity },
                actions: alert.severity === 'critical' ? [
                    { action: 'acknowledge', title: 'Acknowledge' },
                    { action: 'view', title: 'View Details' }
                ] : []
            };

            const notification = new Notification(title, options);
            
            notification.onclick = () => {
                // Focus window and show dashboard
                window.focus();
                if (window.securityDashboard) {
                    window.securityDashboard.show();
                }
                notification.close();
            };

            // Auto-close after 10 seconds for non-critical alerts
            if (alert.severity !== 'critical') {
                setTimeout(() => notification.close(), 10000);
            }
        }
    }

    /**
     * Dashboard notification handler
     */
    #sendDashboardNotification(alert) {
        // Dispatch custom event for dashboard
        window.dispatchEvent(new CustomEvent('alertManagerNotification', {
            detail: {
                type: 'alert',
                alert,
                timestamp: Date.now()
            }
        }));
    }

    /**
     * Sound notification handler
     */
    #sendSoundNotification(alert) {
        try {
            // Create audio context for sound alerts
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Generate different tones based on severity
            const frequencies = {
                'critical': [800, 1000, 800], // Urgent pattern
                'high': [600, 800],           // Warning pattern
                'medium': [400],              // Simple tone
                'low': [300]                  // Low tone
            };

            const pattern = frequencies[alert.severity] || frequencies.low;
            this.#playAlertTone(audioContext, pattern);
            
        } catch (error) {
            // Silent fail for audio errors
            this.#secureLog('warn', 'Sound notification failed', {});
        }
    }

    /**
     * Play alert tone pattern
     */
    #playAlertTone(audioContext, frequencies) {
        let delay = 0;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }, delay);
            
            delay += 400; // 400ms between tones
        });
    }

    /**
     * Setup alert escalation
     */
    #setupAlertEscalation(alert) {
        const policy = AlertManager.#escalationPolicies.get(alert.severity);
        if (!policy || policy.escalationSteps.length <= 1) return;

        // Schedule escalation steps
        policy.escalationSteps.slice(1).forEach((step, index) => {
            setTimeout(() => {
                // Check if alert is still active
                if (this.#isAlertStillActive(alert.id)) {
                    this.#sendNotificationThroughChannels(alert, step.channels);
                    
                    this.#secureLog('warn', 'Alert escalated', {
                        alertId: alert.id,
                        escalationLevel: index + 2,
                        channels: step.channels
                    });
                }
            }, step.delay);
        });
    }

    /**
     * Check if alert is still active
     */
    #isAlertStillActive(alertId) {
        if (window.EnhancedSecurityMonitor) {
            const activeAlerts = window.EnhancedSecurityMonitor.getActiveAlerts();
            return activeAlerts.some(alert => alert.id === alertId);
        }
        return false;
    }

    /**
     * Handle escalation events
     */
    static handleEscalation(alert) {
        const instance = this.getInstance();
        instance.#handleEscalationInternal(alert);
    }

    #handleEscalationInternal(alert) {
        // Enhanced notification for escalated alerts
        this.#sendNotificationThroughChannels(alert, ['console', 'browser']);
        
        // Log escalation
        this.#secureLog('error', 'Alert escalation triggered', {
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity
        });
    }

    /**
     * Check alert correlation
     */
    #checkAlertCorrelation(alert) {
        const correlationWindow = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        
        // Look for similar alerts in recent history
        const recentAlerts = AlertManager.#alertHistory.filter(histAlert => 
            histAlert.type === alert.type &&
            histAlert.severity === alert.severity &&
            (now - histAlert.timestamp) < correlationWindow
        );
        
        return recentAlerts.length > 0 ? recentAlerts[0] : null;
    }

    /**
     * Handle correlated alert
     */
    #handleCorrelatedAlert(newAlert, existingAlert) {
        // Update correlation data
        const correlationId = existingAlert.correlationId;
        if (!AlertManager.#alertCorrelation.has(correlationId)) {
            AlertManager.#alertCorrelation.set(correlationId, {
                originalAlert: existingAlert,
                correlatedAlerts: [],
                totalCount: existingAlert.count
            });
        }
        
        const correlation = AlertManager.#alertCorrelation.get(correlationId);
        correlation.correlatedAlerts.push(newAlert);
        correlation.totalCount += newAlert.count;
        
        // Send correlated alert notification (reduced frequency)
        if (correlation.correlatedAlerts.length % 3 === 0) { // Every 3rd correlated alert
            this.#sendCorrelatedAlertNotification(correlation);
        }
        
        this.#secureLog('info', 'Alert correlated', {
            correlationId,
            newAlertId: newAlert.id,
            totalCorrelated: correlation.correlatedAlerts.length
        });
    }

    /**
     * Send correlated alert notification
     */
    #sendCorrelatedAlertNotification(correlation) {
        const alert = {
            ...correlation.originalAlert,
            id: 'corr_' + correlation.originalAlert.id,
            count: correlation.totalCount,
            correlatedCount: correlation.correlatedAlerts.length
        };
        
        this.#sendNotificationThroughChannels(alert, ['console', 'dashboard']);
    }

    /**
     * Perform alert correlation analysis
     */
    #performAlertCorrelation() {
        // Analyze patterns in alert history
        const recentAlerts = AlertManager.#alertHistory.filter(alert => 
            Date.now() - alert.timestamp < 60 * 60 * 1000 // Last hour
        );
        
        // Group by type and analyze frequency
        const alertGroups = new Map();
        recentAlerts.forEach(alert => {
            if (!alertGroups.has(alert.type)) {
                alertGroups.set(alert.type, []);
            }
            alertGroups.get(alert.type).push(alert);
        });
        
        // Detect patterns
        alertGroups.forEach((alerts, type) => {
            if (alerts.length >= 5) { // 5 or more alerts of same type
                this.#detectAlertPattern(type, alerts);
            }
        });
    }

    /**
     * Detect alert patterns
     */
    #detectAlertPattern(alertType, alerts) {
        const intervals = [];
        for (let i = 1; i < alerts.length; i++) {
            intervals.push(alerts[i].timestamp - alerts[i-1].timestamp);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // If alerts are coming at regular intervals, it might be a pattern
        if (avgInterval < 10 * 60 * 1000 && intervals.length >= 3) { // Less than 10 minutes apart
            this.#reportAlertPattern(alertType, alerts.length, avgInterval);
        }
    }

    /**
     * Report detected alert pattern
     */
    #reportAlertPattern(alertType, count, avgInterval) {
        const patternAlert = {
            id: 'pattern_' + Date.now(),
            type: 'alertPattern',
            severity: 'medium',
            count: count,
            threshold: 5,
            timestamp: Date.now(),
            details: {
                originalType: alertType,
                avgInterval: Math.round(avgInterval / 1000), // seconds
                patternDetected: true
            }
        };
        
        this.#executeAlertNotification(patternAlert);
        
        this.#secureLog('warn', 'Alert pattern detected', {
            alertType,
            count,
            avgInterval: Math.round(avgInterval / 1000)
        });
    }

    /**
     * Cleanup correlation data
     */
    #cleanupCorrelationData() {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const cutoff = Date.now() - maxAge;
        
        // Clean alert history
        AlertManager.#alertHistory = AlertManager.#alertHistory.filter(alert => 
            alert.timestamp > cutoff
        );
        
        // Clean correlation data
        for (const [correlationId, correlation] of AlertManager.#alertCorrelation.entries()) {
            if (correlation.originalAlert.timestamp < cutoff) {
                AlertManager.#alertCorrelation.delete(correlationId);
            }
        }
    }

    /**
     * Get alert statistics
     */
    static getAlertStatistics() {
        const now = Date.now();
        const last24h = AlertManager.#alertHistory.filter(alert => 
            now - alert.timestamp < 24 * 60 * 60 * 1000
        );
        
        const stats = {
            total: AlertManager.#alertHistory.length,
            last24h: last24h.length,
            bySeverity: {},
            byType: {},
            correlations: AlertManager.#alertCorrelation.size
        };
        
        // Group by severity
        last24h.forEach(alert => {
            stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
            stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * Update user preferences
     */
    static updatePreferences(preferences) {
        Object.assign(AlertManager.#userPreferences, preferences);
        
        // Update channel enabled status
        for (const [channelName, channel] of AlertManager.#notificationChannels.entries()) {
            const prefKey = channelName + 'Alerts';
            if (preferences.hasOwnProperty(prefKey)) {
                channel.enabled = preferences[prefKey];
            }
        }
        
        this.getInstance().#secureLog('info', 'Alert preferences updated', {
            preferences: Object.keys(preferences)
        });
    }

    /**
     * Get current preferences
     */
    static getPreferences() {
        return { ...AlertManager.#userPreferences };
    }

    /**
     * Utility methods
     */
    #generateCorrelationId(alert) {
        return `${alert.type}_${alert.severity}_${Math.floor(alert.timestamp / (5 * 60 * 1000))}`;
    }

    #secureLog(level, message, details) {
        if (window.SecurityDataHandler && window.SecurityDataHandler.secureLog) {
            window.SecurityDataHandler.secureLog(level, message, details);
        }
    }

    /**
     * Cleanup
     */
    static destroy() {
        if (this.#instance) {
            // Clear all intervals and timeouts would be handled by garbage collection
            this.#alertHistory = [];
            this.#alertCorrelation.clear();
            this.#notificationChannels.clear();
            this.#escalationPolicies.clear();
            this.#instance = null;
        }
    }
}

// Global availability
window.AlertManager = AlertManager;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    AlertManager.getInstance();
});

export default AlertManager;