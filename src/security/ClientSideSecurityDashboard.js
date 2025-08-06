/**
 * SEC-09: Client-Side Security Dashboard
 * Browser-based monitoring dashboard using IndexedDB for static hosting
 */

class ClientSideSecurityDashboard {
  constructor() {
    this.dbName = 'SecurityDashboard';
    this.dbVersion = 1;
    this.db = null;
    this.dashboardContainer = null;
    this.refreshInterval = null;
    this.isVisible = false;
    this.components = {
      healthMonitor: null,
      userImpactMonitor: null,
      rollbackSystem: null,
      securityToggle: null
    };
  }

  async initialize() {
    try {
      console.log('[SecurityDashboard] Initializing client-side dashboard...');
      
      // Initialize IndexedDB
      await this.initializeDatabase();
      
      // Load security components
      this.loadSecurityComponents();
      
      // Create dashboard UI
      this.createDashboardUI();
      
      // Setup keyboard shortcut (Ctrl+Shift+D)
      this.setupKeyboardShortcut();
      
      // Start data refresh
      this.startDataRefresh();
      
      console.log('[SecurityDashboard] Dashboard initialized');
      return { success: true };
    } catch (error) {
      console.error('[SecurityDashboard] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Dashboard metrics store
        if (!db.objectStoreNames.contains('dashboard_metrics')) {
          const metricsStore = db.createObjectStore('dashboard_metrics', { keyPath: 'id' });
          metricsStore.createIndex('timestamp', 'timestamp', { unique: false });
          metricsStore.createIndex('type', 'type', { unique: false });
        }
        
        // Dashboard events store
        if (!db.objectStoreNames.contains('dashboard_events')) {
          const eventsStore = db.createObjectStore('dashboard_events', { keyPath: 'id' });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventsStore.createIndex('severity', 'severity', { unique: false });
        }
      };
    });
  }

  loadSecurityComponents() {
    // Load available security components
    if (window.ClientSideSecurityHealthMonitor) {
      this.components.healthMonitor = window.ClientSideSecurityHealthMonitor;
    }
    
    if (window.ClientSideUserImpactMonitor) {
      this.components.userImpactMonitor = window.ClientSideUserImpactMonitor;
    }
    
    if (window.ClientSideSecurityRollback) {
      this.components.rollbackSystem = window.ClientSideSecurityRollback;
    }
    
    if (window.StaticHostingSecurityToggle) {
      this.components.securityToggle = window.StaticHostingSecurityToggle;
    }
  }

  createDashboardUI() {
    // Create dashboard container
    this.dashboardContainer = document.createElement('div');
    this.dashboardContainer.id = 'security-dashboard';
    this.dashboardContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      background: #1a1a1a;
      color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      font-size: 12px;
      z-index: 10001;
      display: none;
      overflow: hidden;
      border: 1px solid #333;
    `;
    
    // Create dashboard content
    this.dashboardContainer.innerHTML = this.generateDashboardHTML();
    
    // Add to page
    document.body.appendChild(this.dashboardContainer);
    
    // Setup event listeners
    this.setupDashboardEvents();
  }

  generateDashboardHTML() {
    return `
      <div class="dashboard-header" style="background: #2d2d2d; padding: 12px; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 14px; color: #4CAF50;">🔒 Security Dashboard</h3>
        <div>
          <button id="dashboard-refresh" style="background: #333; border: 1px solid #555; color: #fff; padding: 4px 8px; border-radius: 3px; margin-right: 5px; cursor: pointer;">↻</button>
          <button id="dashboard-close" style="background: #f44336; border: none; color: #fff; padding: 4px 8px; border-radius: 3px; cursor: pointer;">✕</button>
        </div>
      </div>
      
      <div class="dashboard-content" style="padding: 12px; max-height: calc(80vh - 60px); overflow-y: auto;">
        <div id="system-status" class="dashboard-section">
          <h4 style="margin: 0 0 8px 0; color: #4CAF50; font-size: 13px;">System Status</h4>
          <div id="status-indicators" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
            <div class="status-card" style="background: #2d2d2d; padding: 8px; border-radius: 4px; border-left: 3px solid #4CAF50;">
              <div style="font-weight: bold;">Security</div>
              <div id="security-status">Loading...</div>
            </div>
            <div class="status-card" style="background: #2d2d2d; padding: 8px; border-radius: 4px; border-left: 3px solid #2196F3;">
              <div style="font-weight: bold;">Performance</div>
              <div id="performance-status">Loading...</div>
            </div>
          </div>
        </div>
        
        <div id="security-features" class="dashboard-section">
          <h4 style="margin: 0 0 8px 0; color: #FF9800; font-size: 13px;">Security Features</h4>
          <div id="feature-toggles" style="margin-bottom: 12px;">
            <!-- Feature toggles will be populated here -->
          </div>
        </div>
        
        <div id="metrics-overview" class="dashboard-section">
          <h4 style="margin: 0 0 8px 0; color: #9C27B0; font-size: 13px;">Metrics Overview</h4>
          <div id="metrics-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
            <!-- Metrics will be populated here -->
          </div>
        </div>
        
        <div id="recent-events" class="dashboard-section">
          <h4 style="margin: 0 0 8px 0; color: #F44336; font-size: 13px;">Recent Events</h4>
          <div id="events-list" style="max-height: 150px; overflow-y: auto;">
            <!-- Events will be populated here -->
          </div>
        </div>
        
        <div id="quick-actions" class="dashboard-section">
          <h4 style="margin: 0 0 8px 0; color: #607D8B; font-size: 13px;">Quick Actions</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="action-rollback" style="background: #f44336; border: none; color: #fff; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 11px;">Emergency Rollback</button>
            <button id="action-export" style="background: #2196F3; border: none; color: #fff; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 11px;">Export Data</button>
            <button id="action-clear" style="background: #FF9800; border: none; color: #fff; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 11px;">Clear Logs</button>
          </div>
        </div>
      </div>
    `;
  }

  setupDashboardEvents() {
    // Close button
    const closeBtn = this.dashboardContainer.querySelector('#dashboard-close');
    closeBtn?.addEventListener('click', () => this.hideDashboard());
    
    // Refresh button
    const refreshBtn = this.dashboardContainer.querySelector('#dashboard-refresh');
    refreshBtn?.addEventListener('click', () => this.refreshDashboard());
    
    // Quick actions
    const rollbackBtn = this.dashboardContainer.querySelector('#action-rollback');
    rollbackBtn?.addEventListener('click', () => this.triggerEmergencyRollback());
    
    const exportBtn = this.dashboardContainer.querySelector('#action-export');
    exportBtn?.addEventListener('click', () => this.exportDashboardData());
    
    const clearBtn = this.dashboardContainer.querySelector('#action-clear');
    clearBtn?.addEventListener('click', () => this.clearDashboardLogs());
  }

  setupKeyboardShortcut() {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.toggleDashboard();
      }
    });
  }

  toggleDashboard() {
    if (this.isVisible) {
      this.hideDashboard();
    } else {
      this.showDashboard();
    }
  }

  showDashboard() {
    if (this.dashboardContainer) {
      this.dashboardContainer.style.display = 'block';
      this.isVisible = true;
      this.refreshDashboard();
    }
  }

  hideDashboard() {
    if (this.dashboardContainer) {
      this.dashboardContainer.style.display = 'none';
      this.isVisible = false;
    }
  }

  async refreshDashboard() {
    try {
      // Update system status
      await this.updateSystemStatus();
      
      // Update security features
      await this.updateSecurityFeatures();
      
      // Update metrics
      await this.updateMetricsOverview();
      
      // Update recent events
      await this.updateRecentEvents();
      
      // Record dashboard access
      await this.recordDashboardEvent('dashboard_refresh', {
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('[SecurityDashboard] Refresh failed:', error);
    }
  }

  async updateSystemStatus() {
    const securityStatusEl = this.dashboardContainer.querySelector('#security-status');
    const performanceStatusEl = this.dashboardContainer.querySelector('#performance-status');
    
    // Security status
    let securityStatus = 'Unknown';
    let securityColor = '#666';
    
    if (this.components.healthMonitor) {
      try {
        const healthData = await this.getHealthMonitorData();
        if (healthData.healthy) {
          securityStatus = 'Healthy';
          securityColor = '#4CAF50';
        } else {
          securityStatus = 'Issues Detected';
          securityColor = '#FF9800';
        }
      } catch (error) {
        securityStatus = 'Error';
        securityColor = '#F44336';
      }
    }
    
    if (securityStatusEl) {
      securityStatusEl.textContent = securityStatus;
      securityStatusEl.style.color = securityColor;
    }
    
    // Performance status
    let performanceStatus = 'Unknown';
    let performanceColor = '#666';
    
    if (this.components.userImpactMonitor) {
      try {
        const impactData = await this.getUserImpactData();
        const score = impactData.performance?.overallScore || 0;
        
        if (score >= 80) {
          performanceStatus = 'Good';
          performanceColor = '#4CAF50';
        } else if (score >= 60) {
          performanceStatus = 'Fair';
          performanceColor = '#FF9800';
        } else {
          performanceStatus = 'Poor';
          performanceColor = '#F44336';
        }
      } catch (error) {
        performanceStatus = 'Error';
        performanceColor = '#F44336';
      }
    }
    
    if (performanceStatusEl) {
      performanceStatusEl.textContent = performanceStatus;
      performanceStatusEl.style.color = performanceColor;
    }
  }

  async updateSecurityFeatures() {
    const featureTogglesEl = this.dashboardContainer.querySelector('#feature-toggles');
    if (!featureTogglesEl) return;
    
    const features = ['webauthn', 'encryption', 'monitoring', 'inputValidation', 'csp'];
    let togglesHTML = '';
    
    if (this.components.securityToggle) {
      const toggle = new this.components.securityToggle();
      
      for (const feature of features) {
        const isEnabled = toggle.isEnabled(feature);
        const statusColor = isEnabled ? '#4CAF50' : '#666';
        const statusText = isEnabled ? 'ON' : 'OFF';
        
        togglesHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #333;">
            <span style="text-transform: capitalize;">${feature}</span>
            <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
          </div>
        `;
      }
    } else {
      togglesHTML = '<div style="color: #666;">Security toggle not available</div>';
    }
    
    featureTogglesEl.innerHTML = togglesHTML;
  }

  async updateMetricsOverview() {
    const metricsGridEl = this.dashboardContainer.querySelector('#metrics-grid');
    if (!metricsGridEl) return;
    
    let metricsHTML = '';
    
    // Health metrics
    if (this.components.healthMonitor) {
      try {
        const healthData = await this.getHealthMonitorData();
        metricsHTML += this.createMetricCard('Health Score', 
          healthData.healthy ? '100%' : '⚠️', 
          healthData.healthy ? '#4CAF50' : '#FF9800');
      } catch (error) {
        metricsHTML += this.createMetricCard('Health Score', 'Error', '#F44336');
      }
    }
    
    // Performance metrics
    if (this.components.userImpactMonitor) {
      try {
        const impactData = await this.getUserImpactData();
        const score = impactData.performance?.overallScore || 0;
        metricsHTML += this.createMetricCard('Performance', 
          `${Math.round(score)}%`, 
          score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336');
      } catch (error) {
        metricsHTML += this.createMetricCard('Performance', 'Error', '#F44336');
      }
    }
    
    // Rollback status
    if (this.components.rollbackSystem) {
      try {
        const rollback = new this.components.rollbackSystem();
        const status = rollback.getRollbackStatus();
        metricsHTML += this.createMetricCard('Rollback', 
          status.isRollbackActive ? 'ACTIVE' : 'Normal', 
          status.isRollbackActive ? '#F44336' : '#4CAF50');
      } catch (error) {
        metricsHTML += this.createMetricCard('Rollback', 'Error', '#F44336');
      }
    }
    
    // Storage usage
    try {
      const storageEstimate = await navigator.storage?.estimate?.() || {};
      const usagePercent = storageEstimate.quota ? 
        Math.round((storageEstimate.usage / storageEstimate.quota) * 100) : 0;
      metricsHTML += this.createMetricCard('Storage', 
        `${usagePercent}%`, 
        usagePercent < 80 ? '#4CAF50' : usagePercent < 90 ? '#FF9800' : '#F44336');
    } catch (error) {
      metricsHTML += this.createMetricCard('Storage', 'Unknown', '#666');
    }
    
    metricsGridEl.innerHTML = metricsHTML;
  }

  createMetricCard(title, value, color) {
    return `
      <div class="metric-card" style="background: #2d2d2d; padding: 8px; border-radius: 4px; text-align: center;">
        <div style="font-size: 10px; color: #999; margin-bottom: 4px;">${title}</div>
        <div style="font-weight: bold; color: ${color};">${value}</div>
      </div>
    `;
  }

  async updateRecentEvents() {
    const eventsListEl = this.dashboardContainer.querySelector('#events-list');
    if (!eventsListEl) return;
    
    try {
      const recentEvents = await this.getRecentEvents(10);
      
      if (recentEvents.length === 0) {
        eventsListEl.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No recent events</div>';
        return;
      }
      
      let eventsHTML = '';
      for (const event of recentEvents) {
        const timeAgo = this.formatTimeAgo(event.timestamp);
        const severityColor = this.getSeverityColor(event.severity);
        
        eventsHTML += `
          <div style="padding: 6px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: bold; color: ${severityColor};">${event.type}</div>
              <div style="font-size: 10px; color: #999;">${event.message || 'No message'}</div>
            </div>
            <div style="font-size: 10px; color: #666;">${timeAgo}</div>
          </div>
        `;
      }
      
      eventsListEl.innerHTML = eventsHTML;
    } catch (error) {
      eventsListEl.innerHTML = '<div style="color: #F44336;">Failed to load events</div>';
    }
  }

  async getHealthMonitorData() {
    // Get health monitor data from localStorage or component
    const healthKey = 'db-card-security-health';
    const stored = localStorage.getItem(healthKey);
    
    if (stored) {
      return JSON.parse(stored);
    }
    
    return { healthy: true, timestamp: Date.now() };
  }

  async getUserImpactData() {
    // Get user impact data from localStorage or component
    const impactKey = 'db-card-user-impact-metrics';
    const stored = localStorage.getItem(impactKey);
    
    if (stored) {
      const data = JSON.parse(stored);
      return {
        performance: {
          overallScore: this.calculateOverallScore(data)
        }
      };
    }
    
    return { performance: { overallScore: 100 } };
  }

  calculateOverallScore(impactData) {
    // Simple scoring algorithm
    let score = 100;
    
    // Deduct for errors
    const totalErrors = Object.values(impactData.errors || {})
      .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    score -= Math.min(totalErrors * 5, 50);
    
    // Deduct for slow interactions
    const interactions = impactData.interactions || {};
    const slowInteractions = Object.values(interactions)
      .flat()
      .filter(i => i.responseTime > 100).length;
    score -= Math.min(slowInteractions * 2, 30);
    
    return Math.max(0, score);
  }

  async getRecentEvents(limit = 10) {
    try {
      if (!this.db) return [];
      
      const transaction = this.db.transaction(['dashboard_events'], 'readonly');
      const store = transaction.objectStore('dashboard_events');
      const index = store.index('timestamp');
      
      return new Promise((resolve, reject) => {
        const events = [];
        const request = index.openCursor(null, 'prev'); // Newest first
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && events.length < limit) {
            events.push(cursor.value);
            cursor.continue();
          } else {
            resolve(events);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[SecurityDashboard] Failed to get recent events:', error);
      return [];
    }
  }

  async recordDashboardEvent(type, data) {
    try {
      if (!this.db) return;
      
      const event = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type,
        timestamp: Date.now(),
        severity: data.severity || 'info',
        message: data.message || '',
        data: data
      };
      
      const transaction = this.db.transaction(['dashboard_events'], 'readwrite');
      const store = transaction.objectStore('dashboard_events');
      
      await new Promise((resolve, reject) => {
        const request = store.add(event);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[SecurityDashboard] Failed to record event:', error);
    }
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  getSeverityColor(severity) {
    const colors = {
      info: '#2196F3',
      warning: '#FF9800',
      error: '#F44336',
      critical: '#9C27B0'
    };
    return colors[severity] || '#666';
  }

  async triggerEmergencyRollback() {
    if (confirm('Are you sure you want to trigger an emergency rollback? This will disable all security features.')) {
      try {
        if (this.components.rollbackSystem) {
          const rollback = new this.components.rollbackSystem();
          await rollback.triggerEmergencyRollback();
          
          await this.recordDashboardEvent('emergency_rollback', {
            severity: 'critical',
            message: 'Emergency rollback triggered from dashboard',
            userInitiated: true
          });
          
          alert('Emergency rollback initiated. The page will reload shortly.');
        } else {
          alert('Rollback system not available');
        }
      } catch (error) {
        console.error('[SecurityDashboard] Emergency rollback failed:', error);
        alert('Emergency rollback failed: ' + error.message);
      }
    }
  }

  async exportDashboardData() {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        systemStatus: {
          security: await this.getHealthMonitorData(),
          performance: await this.getUserImpactData()
        },
        recentEvents: await this.getRecentEvents(50),
        localStorage: this.exportLocalStorageData()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-dashboard-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await this.recordDashboardEvent('data_export', {
        severity: 'info',
        message: 'Dashboard data exported'
      });
    } catch (error) {
      console.error('[SecurityDashboard] Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  }

  exportLocalStorageData() {
    const securityKeys = [
      'db-card-security-features',
      'db-card-security-health',
      'db-card-user-impact-metrics',
      'db-card-security-rollback',
      'db-card-rollback-history'
    ];
    
    const data = {};
    for (const key of securityKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = JSON.parse(value);
        }
      } catch (error) {
        data[key] = localStorage.getItem(key); // Store as string if not JSON
      }
    }
    
    return data;
  }

  async clearDashboardLogs() {
    if (confirm('Are you sure you want to clear all dashboard logs? This action cannot be undone.')) {
      try {
        // Clear IndexedDB events
        if (this.db) {
          const transaction = this.db.transaction(['dashboard_events'], 'readwrite');
          const store = transaction.objectStore('dashboard_events');
          await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
        
        // Clear localStorage logs
        const logKeys = [
          'db-card-security-health',
          'db-card-user-impact-metrics',
          'db-card-rollback-history',
          'db-card-metrics-history'
        ];
        
        for (const key of logKeys) {
          localStorage.removeItem(key);
        }
        
        await this.recordDashboardEvent('logs_cleared', {
          severity: 'warning',
          message: 'All dashboard logs cleared'
        });
        
        alert('Dashboard logs cleared successfully');
        this.refreshDashboard();
      } catch (error) {
        console.error('[SecurityDashboard] Clear logs failed:', error);
        alert('Clear logs failed: ' + error.message);
      }
    }
  }

  startDataRefresh() {
    // Refresh dashboard data every 30 seconds if visible
    this.refreshInterval = setInterval(() => {
      if (this.isVisible) {
        this.refreshDashboard();
      }
    }, 30000);
  }

  cleanup() {
    // Clear refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Remove dashboard from DOM
    if (this.dashboardContainer && this.dashboardContainer.parentElement) {
      this.dashboardContainer.parentElement.removeChild(this.dashboardContainer);
    }
    
    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ClientSideSecurityDashboard = ClientSideSecurityDashboard;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientSideSecurityDashboard;
}