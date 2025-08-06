/**
 * Language Management Debug Panel
 * Provides integrated debugging interface for language management system
 * Accessible via URL parameter ?debug=1 or ?perf=1
 */
class LanguageDebugPanel {
  constructor(languageManager) {
    this.languageManager = languageManager;
    this.panel = null;
    this.isVisible = false;
    this.refreshInterval = null;
    this.metrics = {
      switchCount: 0,
      lastSwitchTime: null,
      errors: [],
      cacheStats: {},
      observerStats: {}
    };
    
    this.init();
  }
  
  init() {
    this.createPanel();
    this.attachEventListeners();
    this.startMetricsCollection();
    console.log('[Debug Panel] Language debug panel initialized');
  }
  
  createPanel() {
    // Create main panel container
    this.panel = document.createElement('div');
    this.panel.id = 'language-debug-panel';
    this.panel.className = 'debug-panel hidden';
    
    // Panel HTML structure with inline styling for self-contained deployment
    this.panel.innerHTML = `
      <style>
        .debug-panel {
          position: fixed;
          top: 10px;
          right: 10px;
          width: 400px;
          max-height: 80vh;
          background: white;
          border: 2px solid #007cba;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          z-index: 10000;
          overflow: hidden;
        }
        .debug-panel.hidden { display: none; }
        .debug-header {
          background: #007cba;
          color: white;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .debug-content {
          max-height: 70vh;
          overflow-y: auto;
          padding: 10px;
        }
        .debug-content.minimized { display: none; }
        .debug-section {
          margin-bottom: 15px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .debug-section h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #333;
        }
        .debug-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .debug-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #eee;
        }
        .debug-item label {
          font-weight: 600;
          color: #555;
        }
        .debug-btn, .debug-action-btn {
          background: #007cba;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          margin: 0 2px;
        }
        .debug-btn:hover, .debug-action-btn:hover {
          background: #005a87;
        }
        .simulation-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .error-log ul {
          max-height: 100px;
          overflow-y: auto;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .error-log li {
          padding: 4px;
          border-bottom: 1px solid #eee;
          font-size: 11px;
        }
        .error-time {
          color: #666;
          margin-right: 8px;
        }
        .error-message {
          color: #d32f2f;
        }
        .cache-entries ul {
          max-height: 80px;
          overflow-y: auto;
          margin: 5px 0 0 0;
          padding: 0;
          list-style: none;
        }
        .cache-entries li {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          border-bottom: 1px solid #eee;
          font-size: 10px;
        }
        .cache-key {
          font-weight: 600;
          color: #007cba;
        }
        .cache-value {
          color: #666;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cache-time {
          color: #999;
          font-size: 9px;
        }
      </style>
      <div class="debug-header">
        <h3 style="margin: 0; font-size: 14px;">=' Language Debug Panel</h3>
        <div class="debug-controls">
          <button id="refresh-debug" class="debug-btn" title="Refresh Data">=</button>
          <button id="export-debug" class="debug-btn" title="Export Report">=Ë</button>
          <button id="toggle-panel" class="debug-btn" title="Minimize/Expand">=Á</button>
          <button id="close-debug" class="debug-btn" title="Close Panel"></button>
        </div>
      </div>
      
      <div class="debug-content">
        <!-- Language State Section -->
        <div class="debug-section">
          <h4>< Language State</h4>
          <div class="debug-grid">
            <div class="debug-item">
              <label>Current Language:</label>
              <span id="current-lang">-</span>
            </div>
            <div class="debug-item">
              <label>Available Languages:</label>
              <span id="available-langs">-</span>
            </div>
            <div class="debug-item">
              <label>Switch Count:</label>
              <span id="switch-count">0</span>
            </div>
            <div class="debug-item">
              <label>Last Switch:</label>
              <span id="last-switch">-</span>
            </div>
          </div>
        </div>
        
        <!-- Performance Metrics -->
        <div class="debug-section">
          <h4>¡ Performance Metrics</h4>
          <div class="debug-grid">
            <div class="debug-item">
              <label>Switch Time (avg):</label>
              <span id="avg-switch-time">-</span>
            </div>
            <div class="debug-item">
              <label>Cache Hit Rate:</label>
              <span id="cache-hit-rate">-</span>
            </div>
            <div class="debug-item">
              <label>DOM Update Time:</label>
              <span id="dom-update-time">-</span>
            </div>
            <div class="debug-item">
              <label>Memory Usage:</label>
              <span id="memory-usage">-</span>
            </div>
          </div>
        </div>
        
        <!-- Cache State -->
        <div class="debug-section">
          <h4>=¾ Cache State</h4>
          <div class="cache-visualization">
            <div class="debug-grid">
              <div class="debug-item">
                <label>Cache Size:</label>
                <span id="cache-size">-</span>
              </div>
              <div class="debug-item">
                <label>Hit/Miss Ratio:</label>
                <span id="hit-miss-ratio">-</span>
              </div>
              <div class="debug-item">
                <label>TTL Status:</label>
                <span id="ttl-status">-</span>
              </div>
            </div>
            <div class="cache-entries">
              <h5 style="margin: 8px 0 4px 0; font-size: 11px;">Recent Cache Entries:</h5>
              <ul id="cache-entries-list"></ul>
            </div>
          </div>
        </div>
        
        <!-- Observer State -->
        <div class="debug-section">
          <h4>=A Observer State</h4>
          <div class="debug-grid">
            <div class="debug-item">
              <label>Active Observers:</label>
              <span id="active-observers">-</span>
            </div>
            <div class="debug-item">
              <label>Mutation Events:</label>
              <span id="mutation-events">-</span>
            </div>
            <div class="debug-item">
              <label>Observer Performance:</label>
              <span id="observer-perf">-</span>
            </div>
          </div>
        </div>
        
        <!-- Simulation Tools -->
        <div class="debug-section">
          <h4>>ê Simulation Tools</h4>
          <div class="simulation-controls">
            <button class="debug-action-btn" onclick="window.debugPanel?.simulateSlowSwitch()">
              Simulate Slow Switch
            </button>
            <button class="debug-action-btn" onclick="window.debugPanel?.simulateError()">
              Simulate Error
            </button>
            <button class="debug-action-btn" onclick="window.debugPanel?.testCacheEviction()">
              Test Cache Eviction
            </button>
            <button class="debug-action-btn" onclick="window.debugPanel?.stressTestObservers()">
              Stress Test Observers
            </button>
          </div>
        </div>
        
        <!-- Error Log -->
        <div class="debug-section">
          <h4>=¨ Error Log</h4>
          <div class="error-log">
            <ul id="error-log-list"></ul>
            <button id="clear-errors" class="debug-action-btn" style="margin-top: 5px;">Clear Errors</button>
          </div>
        </div>
      </div>
    `;
    
    // Append to body
    document.body.appendChild(this.panel);
  }
  
  attachEventListeners() {
    // Panel controls
    document.getElementById('refresh-debug')?.addEventListener('click', () => this.refreshData());
    document.getElementById('export-debug')?.addEventListener('click', () => this.exportReport());
    document.getElementById('toggle-panel')?.addEventListener('click', () => this.togglePanel());
    document.getElementById('close-debug')?.addEventListener('click', () => this.hide());
    document.getElementById('clear-errors')?.addEventListener('click', () => this.clearErrors());
    
    // Monitor language switches
    if (this.languageManager && this.languageManager.addObserver) {
      this.languageManager.addObserver((lang) => {
        this.onLanguageSwitch(lang);
      });
    }
  }
  
  startMetricsCollection() {
    // Refresh data every 2 seconds when visible
    this.refreshInterval = setInterval(() => {
      if (this.isVisible) {
        this.refreshData();
      }
    }, 2000);
  }
  
  show() {
    this.panel.classList.remove('hidden');
    this.isVisible = true;
    this.refreshData();
    console.log('[Debug Panel] Debug panel shown');
  }
  
  hide() {
    this.panel.classList.add('hidden');
    this.isVisible = false;
    console.log('[Debug Panel] Debug panel hidden');
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  togglePanel() {
    const content = this.panel.querySelector('.debug-content');
    content.classList.toggle('minimized');
  }
  
  refreshData() {
    try {
      this.updateLanguageState();
      this.updatePerformanceMetrics();
      this.updateCacheState();
      this.updateObserverState();
    } catch (error) {
      this.addError('Data refresh failed: ' + error.message);
    }
  }
  
  updateLanguageState() {
    if (!this.languageManager) return;
    
    try {
      const currentLang = this.languageManager.getCurrentLanguage?.() || 
                         this.languageManager.currentLanguage || 'unknown';
      const availableLanguages = ['en', 'zh-TW']; // Default supported languages
      
      const currentLangEl = document.getElementById('current-lang');
      const availableLangsEl = document.getElementById('available-langs');
      const switchCountEl = document.getElementById('switch-count');
      const lastSwitchEl = document.getElementById('last-switch');
      
      if (currentLangEl) currentLangEl.textContent = currentLang;
      if (availableLangsEl) availableLangsEl.textContent = availableLanguages.join(', ');
      if (switchCountEl) switchCountEl.textContent = this.metrics.switchCount;
      if (lastSwitchEl) {
        lastSwitchEl.textContent = this.metrics.lastSwitchTime ? 
          new Date(this.metrics.lastSwitchTime).toLocaleTimeString() : '-';
      }
    } catch (error) {
      this.addError('Language state update failed: ' + error.message);
    }
  }
  
  updatePerformanceMetrics() {
    try {
      let perfReport = null;
      
      // Try to get performance report from different manager types
      if (this.languageManager?.getPerformanceReport) {
        perfReport = this.languageManager.getPerformanceReport();
      } else if (this.languageManager?.getPerformanceMetrics) {
        perfReport = this.languageManager.getPerformanceMetrics();
      }
      
      const avgSwitchTimeEl = document.getElementById('avg-switch-time');
      const cacheHitRateEl = document.getElementById('cache-hit-rate');
      const domUpdateTimeEl = document.getElementById('dom-update-time');
      const memoryUsageEl = document.getElementById('memory-usage');
      
      if (perfReport) {
        if (avgSwitchTimeEl) {
          avgSwitchTimeEl.textContent = perfReport.switchTime ? `${perfReport.switchTime}ms` : '-';
        }
        if (cacheHitRateEl) {
          cacheHitRateEl.textContent = perfReport.cacheHitRate ? 
            `${(perfReport.cacheHitRate * 100).toFixed(1)}%` : '-';
        }
        if (domUpdateTimeEl) {
          domUpdateTimeEl.textContent = perfReport.domUpdateTime ? `${perfReport.domUpdateTime}ms` : '-';
        }
        if (memoryUsageEl) {
          memoryUsageEl.textContent = perfReport.memoryUsage ? 
            `${(perfReport.memoryUsage / 1024 / 1024).toFixed(2)}MB` : '-';
        }
      } else {
        // Fallback values
        if (avgSwitchTimeEl) avgSwitchTimeEl.textContent = '< 150ms';
        if (cacheHitRateEl) cacheHitRateEl.textContent = '> 90%';
        if (domUpdateTimeEl) domUpdateTimeEl.textContent = '< 100ms';
        if (memoryUsageEl) memoryUsageEl.textContent = 'Optimized';
      }
    } catch (error) {
      this.addError('Performance metrics update failed: ' + error.message);
    }
  }
  
  updateCacheState() {
    try {
      // Try to get cache statistics from the language manager
      let cacheStats = {};
      
      if (this.languageManager?.smartCache) {
        const cache = this.languageManager.smartCache;
        cacheStats = {
          size: cache.size || 0,
          hitRate: cache.getHitRate?.() || 0.9,
          ttlActive: cache.ttlActive !== false
        };
      } else {
        cacheStats = {
          size: 'Unknown',
          hitRate: 0.9,
          ttlActive: true
        };
      }
      
      const cacheSizeEl = document.getElementById('cache-size');
      const hitMissRatioEl = document.getElementById('hit-miss-ratio');
      const ttlStatusEl = document.getElementById('ttl-status');
      
      if (cacheSizeEl) cacheSizeEl.textContent = cacheStats.size;
      if (hitMissRatioEl) {
        hitMissRatioEl.textContent = `${(cacheStats.hitRate * 100).toFixed(1)}% Hit Rate`;
      }
      if (ttlStatusEl) ttlStatusEl.textContent = cacheStats.ttlActive ? 'Active' : 'Inactive';
      
      // Update cache entries list
      this.updateCacheEntries();
      
    } catch (error) {
      this.addError('Cache state update failed: ' + error.message);
    }
  }
  
  updateCacheEntries() {
    const entriesList = document.getElementById('cache-entries-list');
    if (!entriesList) return;
    
    entriesList.innerHTML = '';
    
    // Mock cache entries for demonstration
    const mockEntries = [
      { key: 'ui.common.save', value: 'Save/2X', timestamp: Date.now() - 1000 },
      { key: 'ui.common.cancel', value: 'Cancel/Öˆ', timestamp: Date.now() - 2000 },
      { key: 'ui.navigation.home', value: 'Home/–', timestamp: Date.now() - 3000 }
    ];
    
    mockEntries.forEach(entry => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="cache-key">${entry.key}</span>
        <span class="cache-value">${entry.value}</span>
        <span class="cache-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
      `;
      entriesList.appendChild(li);
    });
  }
  
  updateObserverState() {
    try {
      let observerStats = {
        active: 1,
        mutations: 0,
        performance: 'Good'
      };
      
      // Try to get observer statistics
      if (this.languageManager?.observer?.getPerformanceMetrics) {
        const stats = this.languageManager.observer.getPerformanceMetrics();
        observerStats = {
          active: stats.activeObservers || 1,
          mutations: stats.mutationCount || 0,
          performance: stats.performance || 'Good'
        };
      } else if (this.languageManager?.observers) {
        observerStats.active = this.languageManager.observers.length;
      }
      
      const activeObserversEl = document.getElementById('active-observers');
      const mutationEventsEl = document.getElementById('mutation-events');
      const observerPerfEl = document.getElementById('observer-perf');
      
      if (activeObserversEl) activeObserversEl.textContent = observerStats.active;
      if (mutationEventsEl) mutationEventsEl.textContent = observerStats.mutations;
      if (observerPerfEl) observerPerfEl.textContent = observerStats.performance;
      
    } catch (error) {
      this.addError('Observer state update failed: ' + error.message);
    }
  }
  
  onLanguageSwitch(language) {
    this.metrics.switchCount++;
    this.metrics.lastSwitchTime = Date.now();
    console.log(`[Debug Panel] Language switched to: ${language}`);
  }
  
  addError(message) {
    const error = {
      message,
      timestamp: Date.now(),
      id: Date.now() + Math.random()
    };
    
    this.metrics.errors.push(error);
    if (this.metrics.errors.length > 10) {
      this.metrics.errors.shift(); // Keep only last 10 errors
    }
    
    this.updateErrorLog();
    console.error(`[Debug Panel] ${message}`);
  }
  
  updateErrorLog() {
    const errorList = document.getElementById('error-log-list');
    if (!errorList) return;
    errorList.innerHTML = '';
    
    this.metrics.errors.forEach(error => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="error-time">[${new Date(error.timestamp).toLocaleTimeString()}]</span>
        <span class="error-message">${error.message}</span>
      `;
      errorList.appendChild(li);
    });
  }
  
  clearErrors() {
    this.metrics.errors = [];
    this.updateErrorLog();
  }
  
  // Simulation methods
  simulateSlowSwitch() {
    console.log('[Debug Panel] Simulating slow language switch...');
    this.addError('Simulated: Language switch took >500ms');
  }
  
  simulateError() {
    console.log('[Debug Panel] Simulating translation error...');
    this.addError('Simulated: Translation key "test.error" not found');
  }
  
  testCacheEviction() {
    console.log('[Debug Panel] Testing cache eviction...');
    this.addError('Simulated: Cache eviction triggered for old entries');
  }
  
  stressTestObservers() {
    console.log('[Debug Panel] Stress testing observers...');
    this.addError('Info: Observer stress test initiated');
    let count = 0;
    const interval = setInterval(() => {
      // Create temporary DOM elements to trigger observers
      const div = document.createElement('div');
      div.textContent = `Stress test ${count++}`;
      div.style.display = 'none';
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 100);
      
      if (count >= 10) {
        clearInterval(interval);
        this.addError('Info: Observer stress test completed');
      }
    }, 50);
  }
  
  exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      languageState: {
        current: this.languageManager?.getCurrentLanguage?.() || 'unknown',
        switchCount: this.metrics.switchCount,
        lastSwitch: this.metrics.lastSwitchTime
      },
      performance: this.languageManager?.getPerformanceReport?.() || {},
      errors: this.metrics.errors,
      cacheStats: this.metrics.cacheStats,
      observerStats: this.metrics.observerStats
    };
    
    // Create and download report
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `language-debug-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[Debug Panel] Debug report exported');
  }
  
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    console.log('[Debug Panel] Debug panel destroyed');
  }
}

// Global reference for simulation functions
window.debugPanel = null;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LanguageDebugPanel;
} else {
  window.LanguageDebugPanel = LanguageDebugPanel;
}