/**
 * Security Dashboard - Accessibility-Friendly Monitoring Interface
 * DEPLOY-002: 安全監控與告警機制實作
 * 
 * Features:
 * - Real-time security metrics visualization
 * - Accessible alert management (WCAG 2.1 AA)
 * - Health status indicators
 * - Performance monitoring display
 * - Keyboard navigation support
 */
class SecurityDashboard {
    constructor(containerId = 'security-dashboard') {
        this.containerId = containerId;
        this.container = null;
        this.updateInterval = null;
        this.isVisible = false;
        this.keyboardNavigation = null;
        
        this.init();
    }

    /**
     * Initialize dashboard
     */
    init() {
        this.createDashboardStructure();
        this.setupEventListeners();
        this.setupKeyboardNavigation();
        this.startRealTimeUpdates();
        
        // Subscribe to security monitor events
        if (window.EnhancedSecurityMonitor) {
            window.EnhancedSecurityMonitor.subscribe(this.handleSecurityEvent.bind(this));
        }
    }

    /**
     * Create accessible dashboard structure
     */
    createDashboardStructure() {
        // Create or find container
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = this.containerId;
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = `
            <div class="security-dashboard" role="region" aria-label="Security Monitoring Dashboard">
                <!-- Dashboard Header -->
                <header class="dashboard-header">
                    <h2 id="dashboard-title">Security Monitoring Dashboard</h2>
                    <div class="dashboard-controls">
                        <button id="toggle-dashboard" class="btn-toggle" aria-expanded="false" aria-controls="dashboard-content">
                            <span class="sr-only">Toggle Dashboard Visibility</span>
                            <span class="toggle-icon" aria-hidden="true">📊</span>
                        </button>
                        <button id="refresh-dashboard" class="btn-refresh" aria-label="Refresh Dashboard Data">
                            <span class="refresh-icon" aria-hidden="true">🔄</span>
                        </button>
                    </div>
                </header>

                <!-- Dashboard Content -->
                <div id="dashboard-content" class="dashboard-content" aria-hidden="true">
                    <!-- System Status -->
                    <section class="status-section" aria-labelledby="status-heading">
                        <h3 id="status-heading">System Status</h3>
                        <div id="system-status" class="status-indicator" role="status" aria-live="polite">
                            <span class="status-icon" aria-hidden="true">🟢</span>
                            <span class="status-text">Healthy</span>
                        </div>
                    </section>

                    <!-- Active Alerts -->
                    <section class="alerts-section" aria-labelledby="alerts-heading">
                        <h3 id="alerts-heading">Active Alerts</h3>
                        <div id="alerts-container" role="log" aria-live="assertive" aria-atomic="false">
                            <p class="no-alerts">No active alerts</p>
                        </div>
                    </section>

                    <!-- Security Metrics -->
                    <section class="metrics-section" aria-labelledby="metrics-heading">
                        <h3 id="metrics-heading">Security Metrics (Last 24 Hours)</h3>
                        <div id="metrics-container" class="metrics-grid">
                            <!-- Metrics will be populated dynamically -->
                        </div>
                    </section>

                    <!-- Performance Metrics -->
                    <section class="performance-section" aria-labelledby="performance-heading">
                        <h3 id="performance-heading">Performance Metrics</h3>
                        <div id="performance-container" class="performance-grid">
                            <!-- Performance metrics will be populated dynamically -->
                        </div>
                    </section>

                    <!-- Recent Events -->
                    <section class="events-section" aria-labelledby="events-heading">
                        <h3 id="events-heading">Recent Security Events</h3>
                        <div id="events-container" class="events-list" role="log" aria-live="polite">
                            <!-- Recent events will be populated dynamically -->
                        </div>
                    </section>
                </div>
            </div>
        `;

        this.addDashboardStyles();
    }

    /**
     * Add accessible dashboard styles
     */
    addDashboardStyles() {
        if (document.getElementById('security-dashboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'security-dashboard-styles';
        styles.textContent = `
            .security-dashboard {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                max-width: 90vw;
                background: #ffffff;
                border: 2px solid #0066cc;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                z-index: 10000;
            }

            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #0066cc;
                color: white;
                border-radius: 6px 6px 0 0;
            }

            #dashboard-title {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .dashboard-controls {
                display: flex;
                gap: 8px;
            }

            .btn-toggle, .btn-refresh {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }

            .btn-toggle:hover, .btn-refresh:hover,
            .btn-toggle:focus, .btn-refresh:focus {
                background: rgba(255, 255, 255, 0.3);
                outline: 2px solid #ffff00;
                outline-offset: 2px;
            }

            .dashboard-content {
                max-height: 70vh;
                overflow-y: auto;
                padding: 16px;
                display: none;
            }

            .dashboard-content[aria-hidden="false"] {
                display: block;
            }

            .dashboard-content section {
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e0e0e0;
            }

            .dashboard-content section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            .dashboard-content h3 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }

            .status-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border-radius: 4px;
                background: #f0f8ff;
            }

            .status-indicator.healthy {
                background: #e8f5e8;
                color: #2e7d32;
            }

            .status-indicator.unhealthy {
                background: #fff3e0;
                color: #f57c00;
            }

            .status-indicator.error {
                background: #ffebee;
                color: #d32f2f;
            }

            .alert-item {
                padding: 12px;
                margin-bottom: 8px;
                border-radius: 4px;
                border-left: 4px solid;
                background: #fff;
            }

            .alert-item.critical {
                border-left-color: #d32f2f;
                background: #ffebee;
            }

            .alert-item.high {
                border-left-color: #f57c00;
                background: #fff3e0;
            }

            .alert-item.medium {
                border-left-color: #1976d2;
                background: #e3f2fd;
            }

            .alert-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }

            .alert-type {
                font-weight: 600;
                font-size: 13px;
            }

            .alert-severity {
                font-size: 11px;
                text-transform: uppercase;
                padding: 2px 6px;
                border-radius: 3px;
                background: rgba(0, 0, 0, 0.1);
            }

            .alert-details {
                font-size: 12px;
                color: #666;
                margin-bottom: 8px;
            }

            .alert-actions {
                display: flex;
                gap: 8px;
            }

            .btn-acknowledge {
                background: #4caf50;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 11px;
                cursor: pointer;
            }

            .btn-acknowledge:hover, .btn-acknowledge:focus {
                background: #45a049;
                outline: 2px solid #ffff00;
                outline-offset: 1px;
            }

            .metrics-grid, .performance-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
            }

            .metric-item, .performance-item {
                padding: 12px;
                background: #f8f9fa;
                border-radius: 4px;
                text-align: center;
            }

            .metric-value, .performance-value {
                font-size: 18px;
                font-weight: 600;
                color: #0066cc;
                display: block;
            }

            .metric-label, .performance-label {
                font-size: 11px;
                color: #666;
                margin-top: 4px;
            }

            .events-list {
                max-height: 200px;
                overflow-y: auto;
            }

            .event-item {
                padding: 8px 12px;
                margin-bottom: 4px;
                background: #f8f9fa;
                border-radius: 4px;
                font-size: 12px;
            }

            .event-time {
                color: #666;
                font-size: 11px;
            }

            .event-type {
                font-weight: 600;
                color: #0066cc;
            }

            .no-alerts {
                color: #666;
                font-style: italic;
                text-align: center;
                padding: 20px;
            }

            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .security-dashboard {
                    border-width: 3px;
                }
                
                .btn-toggle, .btn-refresh {
                    border-width: 2px;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .btn-toggle, .btn-refresh {
                    transition: none;
                }
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .security-dashboard {
                    width: 95vw;
                    right: 2.5vw;
                    top: 10px;
                }
                
                .metrics-grid, .performance-grid {
                    grid-template-columns: 1fr 1fr;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const toggleBtn = document.getElementById('toggle-dashboard');
        const refreshBtn = document.getElementById('refresh-dashboard');

        toggleBtn?.addEventListener('click', () => {
            this.toggleVisibility();
        });

        refreshBtn?.addEventListener('click', () => {
            this.refreshData();
        });

        // Listen for security alerts
        window.addEventListener('securityAlert', (event) => {
            this.handleNewAlert(event.detail);
        });

        // Auto-show on critical alerts
        window.addEventListener('securityAlert', (event) => {
            if (event.detail.severity === 'critical' && !this.isVisible) {
                this.show();
            }
        });
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Keyboard shortcut to toggle dashboard (Ctrl+Shift+S)
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'S') {
                event.preventDefault();
                this.toggleVisibility();
                
                // Focus on dashboard when opened
                if (this.isVisible) {
                    const firstFocusable = this.container.querySelector('button, [tabindex="0"]');
                    firstFocusable?.focus();
                }
            }
        });

        // Escape key to close dashboard
        this.container.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Update every 30 seconds
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateDashboard();
            }
        }, 30000);

        // Initial update
        this.updateDashboard();
    }

    /**
     * Handle security events from monitor
     */
    handleSecurityEvent(event) {
        if (event.type === 'alert') {
            this.handleNewAlert(event.data);
        } else if (event.type === 'event') {
            this.addRecentEvent(event.data);
        }
    }

    /**
     * Handle new security alert
     */
    handleNewAlert(alert) {
        this.updateAlertsSection();
        
        // Announce to screen readers
        this.announceAlert(alert);
    }

    /**
     * Announce alert to screen readers
     */
    announceAlert(alert) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `Security alert: ${alert.type}, severity ${alert.severity}`;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Toggle dashboard visibility
     */
    toggleVisibility() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show dashboard
     */
    show() {
        const content = document.getElementById('dashboard-content');
        const toggleBtn = document.getElementById('toggle-dashboard');
        
        if (content && toggleBtn) {
            content.style.display = 'block';
            content.setAttribute('aria-hidden', 'false');
            toggleBtn.setAttribute('aria-expanded', 'true');
            this.isVisible = true;
            
            this.updateDashboard();
        }
    }

    /**
     * Hide dashboard
     */
    hide() {
        const content = document.getElementById('dashboard-content');
        const toggleBtn = document.getElementById('toggle-dashboard');
        
        if (content && toggleBtn) {
            content.style.display = 'none';
            content.setAttribute('aria-hidden', 'true');
            toggleBtn.setAttribute('aria-expanded', 'false');
            this.isVisible = false;
        }
    }

    /**
     * Refresh dashboard data
     */
    refreshData() {
        this.updateDashboard();
        
        // Visual feedback
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<span class="refresh-icon" aria-hidden="true">⟳</span>';
            refreshBtn.disabled = true;
            
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            }, 1000);
        }
    }

    /**
     * Update entire dashboard
     */
    async updateDashboard() {
        try {
            await Promise.all([
                this.updateSystemStatus(),
                this.updateAlertsSection(),
                this.updateMetricsSection(),
                this.updatePerformanceSection(),
                this.updateRecentEvents()
            ]);
        } catch (error) {
            console.error('Dashboard update failed:', error);
        }
    }

    /**
     * Update system status
     */
    async updateSystemStatus() {
        const statusElement = document.getElementById('system-status');
        if (!statusElement || !window.EnhancedSecurityMonitor) return;

        try {
            const healthCheck = await window.EnhancedSecurityMonitor.performHealthCheck();
            const status = healthCheck.status;
            
            statusElement.className = `status-indicator ${status}`;
            statusElement.innerHTML = `
                <span class="status-icon" aria-hidden="true">${this.getStatusIcon(status)}</span>
                <span class="status-text">${this.getStatusText(status)}</span>
            `;
        } catch (error) {
            statusElement.className = 'status-indicator error';
            statusElement.innerHTML = `
                <span class="status-icon" aria-hidden="true">❌</span>
                <span class="status-text">Error</span>
            `;
        }
    }

    /**
     * Update alerts section
     */
    updateAlertsSection() {
        const alertsContainer = document.getElementById('alerts-container');
        if (!alertsContainer || !window.EnhancedSecurityMonitor) return;

        const activeAlerts = window.EnhancedSecurityMonitor.getActiveAlerts();
        
        if (activeAlerts.length === 0) {
            alertsContainer.innerHTML = '<p class="no-alerts">No active alerts</p>';
            return;
        }

        alertsContainer.innerHTML = activeAlerts.map(alert => `
            <div class="alert-item ${alert.severity}" role="alert">
                <div class="alert-header">
                    <span class="alert-type">${alert.type}</span>
                    <span class="alert-severity">${alert.severity}</span>
                </div>
                <div class="alert-details">
                    ${alert.count}/${alert.threshold} events detected
                    <br>
                    <span class="alert-time">
                        ${this.formatElapsedTime(alert.elapsed)} ago
                        ${alert.timeToResponse > 0 ? 
                            `• Response due in ${this.formatElapsedTime(alert.timeToResponse)}` : 
                            '• Response overdue'
                        }
                    </span>
                </div>
                <div class="alert-actions">
                    <button class="btn-acknowledge" 
                            onclick="securityDashboard.acknowledgeAlert('${alert.id}')"
                            aria-label="Acknowledge ${alert.type} alert">
                        Acknowledge
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update metrics section
     */
    updateMetricsSection() {
        const metricsContainer = document.getElementById('metrics-container');
        if (!metricsContainer || !window.EnhancedSecurityMonitor) return;

        const metrics = window.EnhancedSecurityMonitor.getMetrics();
        const importantMetrics = ['xssAttempts', 'failedAuthAttempts', 'codeInjectionAttempts', 'logInjectionAttempts'];
        
        metricsContainer.innerHTML = importantMetrics.map(metricType => {
            const data = metrics[metricType] || { last24h: 0, trend: 'stable' };
            return `
                <div class="metric-item">
                    <span class="metric-value">${data.last24h}</span>
                    <div class="metric-label">
                        ${this.formatMetricLabel(metricType)}
                        <span class="trend-indicator" aria-label="Trend: ${data.trend}">
                            ${this.getTrendIcon(data.trend)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update performance section
     */
    updatePerformanceSection() {
        const performanceContainer = document.getElementById('performance-container');
        if (!performanceContainer || !window.EnhancedSecurityMonitor) return;

        const healthCheck = window.EnhancedSecurityMonitor.performHealthCheck();
        
        healthCheck.then(result => {
            const perf = result.performance || {};
            
            performanceContainer.innerHTML = `
                <div class="performance-item">
                    <span class="performance-value">${this.formatUptime(perf.uptime || 0)}</span>
                    <div class="performance-label">Uptime</div>
                </div>
                <div class="performance-item">
                    <span class="performance-value">${perf.eventCount || 0}</span>
                    <div class="performance-label">Events Processed</div>
                </div>
                <div class="performance-item">
                    <span class="performance-value">${perf.avgProcessingTime || 0}ms</span>
                    <div class="performance-label">Avg Processing Time</div>
                </div>
                <div class="performance-item">
                    <span class="performance-value">${perf.eventsPerSecond || 0}</span>
                    <div class="performance-label">Events/Second</div>
                </div>
            `;
        });
    }

    /**
     * Update recent events
     */
    updateRecentEvents() {
        const eventsContainer = document.getElementById('events-container');
        if (!eventsContainer || !window.EnhancedSecurityMonitor) return;

        const metrics = window.EnhancedSecurityMonitor.getMetrics();
        const recentEvents = [];
        
        // Collect recent events from all metrics
        for (const [eventType, data] of Object.entries(metrics)) {
            if (data.lastEvent) {
                recentEvents.push({
                    type: eventType,
                    timestamp: data.lastEvent,
                    count: data.lastHour
                });
            }
        }
        
        // Sort by timestamp (most recent first)
        recentEvents.sort((a, b) => b.timestamp - a.timestamp);
        
        if (recentEvents.length === 0) {
            eventsContainer.innerHTML = '<p class="no-alerts">No recent events</p>';
            return;
        }
        
        eventsContainer.innerHTML = recentEvents.slice(0, 10).map(event => `
            <div class="event-item">
                <span class="event-type">${event.type}</span>
                <span class="event-time">${this.formatTimestamp(event.timestamp)}</span>
                ${event.count > 1 ? `<span class="event-count">(${event.count} in last hour)</span>` : ''}
            </div>
        `).join('');
    }

    /**
     * Add recent event to display
     */
    addRecentEvent(event) {
        if (!this.isVisible) return;
        
        const eventsContainer = document.getElementById('events-container');
        if (!eventsContainer) return;
        
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.innerHTML = `
            <span class="event-type">${event.type}</span>
            <span class="event-time">Just now</span>
        `;
        
        // Add to top of list
        const firstChild = eventsContainer.firstChild;
        if (firstChild && !firstChild.classList?.contains('no-alerts')) {
            eventsContainer.insertBefore(eventElement, firstChild);
        } else {
            eventsContainer.innerHTML = '';
            eventsContainer.appendChild(eventElement);
        }
        
        // Keep only last 10 events
        const events = eventsContainer.querySelectorAll('.event-item');
        if (events.length > 10) {
            events[events.length - 1].remove();
        }
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        if (window.EnhancedSecurityMonitor) {
            const success = window.EnhancedSecurityMonitor.acknowledgeAlert(alertId, 'dashboard-user');
            if (success) {
                this.updateAlertsSection();
            }
        }
    }

    /**
     * Utility methods
     */
    getStatusIcon(status) {
        const icons = {
            'healthy': '🟢',
            'unhealthy': '🟡',
            'error': '🔴'
        };
        return icons[status] || '⚪';
    }

    getStatusText(status) {
        const texts = {
            'healthy': 'Healthy',
            'unhealthy': 'Warning',
            'error': 'Error'
        };
        return texts[status] || 'Unknown';
    }

    getTrendIcon(trend) {
        const icons = {
            'increasing': '📈',
            'decreasing': '📉',
            'stable': '➡️'
        };
        return icons[trend] || '➡️';
    }

    formatMetricLabel(metricType) {
        const labels = {
            'xssAttempts': 'XSS Attempts',
            'failedAuthAttempts': 'Auth Failures',
            'codeInjectionAttempts': 'Code Injection',
            'logInjectionAttempts': 'Log Injection'
        };
        return labels[metricType] || metricType;
    }

    formatElapsedTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.container) {
            this.container.remove();
        }
        
        // Remove styles
        const styles = document.getElementById('security-dashboard-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Global availability
window.SecurityDashboard = SecurityDashboard;

// Auto-initialize dashboard
let securityDashboard;
document.addEventListener('DOMContentLoaded', () => {
    securityDashboard = new SecurityDashboard();
    window.securityDashboard = securityDashboard;
});

export default SecurityDashboard;