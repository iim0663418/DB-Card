/**
 * SEC-07: Client-Side Security Rollback System
 * Browser-based instant rollback using localStorage for static hosting
 */

class ClientSideSecurityRollback {
  constructor() {
    this.storageKey = 'db-card-security-rollback';
    this.rollbackHistoryKey = 'db-card-rollback-history';
    this.maxRollbackHistory = 10;
    this.rollbackStates = {
      NORMAL: 'normal',
      ROLLBACK_INITIATED: 'rollback_initiated',
      ROLLBACK_ACTIVE: 'rollback_active',
      ROLLBACK_FAILED: 'rollback_failed'
    };
    this.currentState = this.rollbackStates.NORMAL;
    this.rollbackTriggers = new Set();
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('[SecurityRollback] Initializing client-side rollback system...');
      
      // Load current rollback state
      await this.loadRollbackState();
      
      // Setup rollback triggers
      this.setupRollbackTriggers();
      
      // Setup emergency rollback listener
      this.setupEmergencyRollback();
      
      // Check if we're in rollback mode
      await this.checkRollbackStatus();
      
      this.initialized = true;
      console.log('[SecurityRollback] Client-side rollback system initialized');
      
      return { success: true };
    } catch (error) {
      console.error('[SecurityRollback] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  async loadRollbackState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const rollbackData = JSON.parse(stored);
        this.currentState = rollbackData.state || this.rollbackStates.NORMAL;
        
        // If we're in rollback mode, ensure security features are disabled
        if (this.currentState === this.rollbackStates.ROLLBACK_ACTIVE) {
          await this.enforceRollbackState();
        }
      }
    } catch (error) {
      console.warn('[SecurityRollback] Failed to load rollback state:', error);
      this.currentState = this.rollbackStates.NORMAL;
    }
  }

  setupRollbackTriggers() {
    // Service disruption detection
    this.rollbackTriggers.add('service_disruption');
    this.rollbackTriggers.add('security_module_failure');
    this.rollbackTriggers.add('performance_degradation');
    this.rollbackTriggers.add('user_request');
    this.rollbackTriggers.add('emergency_rollback');
    
    // Setup automatic triggers
    this.setupAutomaticTriggers();
  }

  setupAutomaticTriggers() {
    // Monitor for critical errors
    window.addEventListener('error', (event) => {
      if (this.isCriticalSecurityError(event.error)) {
        this.triggerRollback('critical_error', {
          error: event.error?.message,
          filename: event.filename,
          lineno: event.lineno
        });
      }
    });

    // Monitor for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isCriticalSecurityError(event.reason)) {
        this.triggerRollback('unhandled_rejection', {
          reason: event.reason?.message || String(event.reason)
        });
      }
    });
  }

  setupEmergencyRollback() {
    // Emergency rollback via keyboard shortcut (Ctrl+Shift+R)
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.triggerEmergencyRollback();
      }
    });

    // Emergency rollback via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('emergency_rollback') === 'true') {
      this.triggerEmergencyRollback();
    }
  }

  async checkRollbackStatus() {
    if (this.currentState === this.rollbackStates.ROLLBACK_ACTIVE) {
      console.warn('[SecurityRollback] System is in rollback mode');
      await this.displayRollbackNotification();
    }
  }

  async triggerRollback(reason, context = {}) {
    try {
      if (this.currentState === this.rollbackStates.ROLLBACK_ACTIVE) {
        console.log('[SecurityRollback] Rollback already active');
        return { success: true, alreadyActive: true };
      }

      console.warn(`[SecurityRollback] Triggering rollback: ${reason}`);
      
      // Update state
      this.currentState = this.rollbackStates.ROLLBACK_INITIATED;
      
      // Record rollback event
      const rollbackEvent = {
        id: `rollback_${Date.now()}`,
        timestamp: new Date().toISOString(),
        reason,
        context,
        state: this.currentState,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Execute rollback steps
      const rollbackResult = await this.executeRollback(rollbackEvent);
      
      if (rollbackResult.success) {
        this.currentState = this.rollbackStates.ROLLBACK_ACTIVE;
        rollbackEvent.state = this.currentState;
        rollbackEvent.completedAt = new Date().toISOString();
        
        // Save rollback state
        await this.saveRollbackState(rollbackEvent);
        
        // Record in history
        await this.recordRollbackHistory(rollbackEvent);
        
        // Notify user
        await this.displayRollbackNotification();
        
        console.log('[SecurityRollback] Rollback completed successfully');
        return { success: true, rollbackId: rollbackEvent.id };
      } else {
        this.currentState = this.rollbackStates.ROLLBACK_FAILED;
        rollbackEvent.state = this.currentState;
        rollbackEvent.error = rollbackResult.error;
        
        await this.saveRollbackState(rollbackEvent);
        
        console.error('[SecurityRollback] Rollback failed:', rollbackResult.error);
        return { success: false, error: rollbackResult.error };
      }
    } catch (error) {
      console.error('[SecurityRollback] Rollback trigger failed:', error);
      this.currentState = this.rollbackStates.ROLLBACK_FAILED;
      return { success: false, error: error.message };
    }
  }

  async executeRollback(rollbackEvent) {
    try {
      const rollbackSteps = [];
      
      // Step 1: Disable all security features
      const securityToggleResult = await this.disableSecurityFeatures();
      rollbackSteps.push({ step: 'disable_security', success: securityToggleResult.success });
      
      // Step 2: Clear security-related localStorage
      const clearStorageResult = await this.clearSecurityStorage();
      rollbackSteps.push({ step: 'clear_storage', success: clearStorageResult.success });
      
      // Step 3: Reset to compatibility mode
      const compatibilityResult = await this.enableCompatibilityMode();
      rollbackSteps.push({ step: 'compatibility_mode', success: compatibilityResult.success });
      
      // Step 4: Clear any cached security data
      const clearCacheResult = await this.clearSecurityCache();
      rollbackSteps.push({ step: 'clear_cache', success: clearCacheResult.success });
      
      // Check if all steps succeeded
      const allSucceeded = rollbackSteps.every(step => step.success);
      
      return {
        success: allSucceeded,
        steps: rollbackSteps,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[SecurityRollback] Rollback execution failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async disableSecurityFeatures() {
    try {
      // Get security toggle instance
      const securityToggle = window.StaticHostingSecurityToggle ? 
        new window.StaticHostingSecurityToggle() : null;
      
      if (securityToggle) {
        // Disable all security features
        const features = ['webauthn', 'encryption', 'monitoring', 'inputValidation', 'csp'];
        
        for (const feature of features) {
          try {
            securityToggle.toggle(feature, false);
          } catch (toggleError) {
            console.warn(`[SecurityRollback] Failed to disable ${feature}:`, toggleError);
          }
        }
      }
      
      // Set rollback flag
      localStorage.setItem('db-card-security-rollback-active', 'true');
      
      return { success: true };
    } catch (error) {
      console.error('[SecurityRollback] Failed to disable security features:', error);
      return { success: false, error: error.message };
    }
  }

  async clearSecurityStorage() {
    try {
      const securityKeys = [
        'db-card-security-features',
        'db-card-webauthn-credentials',
        'db-card-security-health',
        'db-card-security-events',
        'db-card-security-performance'
      ];
      
      for (const key of securityKeys) {
        try {
          localStorage.removeItem(key);
        } catch (removeError) {
          console.warn(`[SecurityRollback] Failed to remove ${key}:`, removeError);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('[SecurityRollback] Failed to clear security storage:', error);
      return { success: false, error: error.message };
    }
  }

  async enableCompatibilityMode() {
    try {
      // Set compatibility mode flag
      localStorage.setItem('db-card-compatibility-mode', 'true');
      
      // Disable any advanced features
      localStorage.setItem('db-card-advanced-features', 'false');
      
      return { success: true };
    } catch (error) {
      console.error('[SecurityRollback] Failed to enable compatibility mode:', error);
      return { success: false, error: error.message };
    }
  }

  async clearSecurityCache() {
    try {
      // Clear any cached security-related data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const securityCaches = cacheNames.filter(name => 
          name.includes('security') || name.includes('auth')
        );
        
        for (const cacheName of securityCaches) {
          await caches.delete(cacheName);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('[SecurityRollback] Failed to clear security cache:', error);
      return { success: false, error: error.message };
    }
  }

  async triggerEmergencyRollback() {
    console.warn('[SecurityRollback] Emergency rollback triggered!');
    
    // Immediate rollback without checks
    await this.triggerRollback('emergency_rollback', {
      emergency: true,
      timestamp: Date.now(),
      userInitiated: true
    });
    
    // Force page reload to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  async restoreFromRollback() {
    try {
      if (this.currentState !== this.rollbackStates.ROLLBACK_ACTIVE) {
        return { success: false, error: 'Not in rollback state' };
      }

      console.log('[SecurityRollback] Restoring from rollback...');
      
      // Clear rollback flags
      localStorage.removeItem('db-card-security-rollback-active');
      localStorage.removeItem('db-card-compatibility-mode');
      
      // Reset state
      this.currentState = this.rollbackStates.NORMAL;
      
      // Clear rollback storage
      localStorage.removeItem(this.storageKey);
      
      // Record restoration
      const restorationEvent = {
        timestamp: new Date().toISOString(),
        action: 'restore_from_rollback',
        success: true
      };
      
      await this.recordRollbackHistory(restorationEvent);
      
      console.log('[SecurityRollback] Restoration completed');
      
      // Suggest page reload
      if (confirm('Rollback restored. Reload page to re-enable security features?')) {
        window.location.reload();
      }
      
      return { success: true };
    } catch (error) {
      console.error('[SecurityRollback] Restoration failed:', error);
      return { success: false, error: error.message };
    }
  }

  async saveRollbackState(rollbackEvent) {
    try {
      const rollbackData = {
        state: this.currentState,
        lastRollback: rollbackEvent,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(rollbackData));
    } catch (error) {
      console.error('[SecurityRollback] Failed to save rollback state:', error);
    }
  }

  async recordRollbackHistory(event) {
    try {
      const historyKey = this.rollbackHistoryKey;
      const stored = localStorage.getItem(historyKey);
      const history = stored ? JSON.parse(stored) : [];
      
      // Add new event
      history.unshift(event);
      
      // Keep only recent history
      if (history.length > this.maxRollbackHistory) {
        history.splice(this.maxRollbackHistory);
      }
      
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('[SecurityRollback] Failed to record rollback history:', error);
    }
  }

  async displayRollbackNotification() {
    try {
      // Create rollback notification
      const notification = document.createElement('div');
      notification.id = 'security-rollback-notification';
      notification.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b6b;
        color: white;
        padding: 12px;
        text-align: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      
      notification.innerHTML = `
        <strong>🔒 Security Rollback Active</strong> - 
        Advanced security features have been disabled for system stability.
        <button onclick="this.parentElement.style.display='none'" 
                style="margin-left: 10px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer;">
          Dismiss
        </button>
        <button onclick="window.clientSideSecurityRollback?.restoreFromRollback()" 
                style="margin-left: 5px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer;">
          Restore
        </button>
      `;
      
      // Remove existing notification
      const existing = document.getElementById('security-rollback-notification');
      if (existing) {
        existing.remove();
      }
      
      // Add to page
      document.body.appendChild(notification);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.style.opacity = '0.7';
        }
      }, 10000);
      
    } catch (error) {
      console.error('[SecurityRollback] Failed to display notification:', error);
    }
  }

  isCriticalSecurityError(error) {
    if (!error) return false;
    
    const criticalPatterns = [
      'SecurityAuthHandler',
      'SecurityDataHandler',
      'SecurityInputHandler',
      'WebAuthn',
      'IndexedDB',
      'crypto.subtle',
      'Authentication failed',
      'Encryption failed',
      'Database access denied'
    ];
    
    const errorMessage = error.message || String(error);
    return criticalPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );
  }

  getRollbackStatus() {
    return {
      state: this.currentState,
      isRollbackActive: this.currentState === this.rollbackStates.ROLLBACK_ACTIVE,
      initialized: this.initialized,
      triggers: Array.from(this.rollbackTriggers)
    };
  }

  async getRollbackHistory() {
    try {
      const stored = localStorage.getItem(this.rollbackHistoryKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[SecurityRollback] Failed to get rollback history:', error);
      return [];
    }
  }

  async enforceRollbackState() {
    // Ensure rollback state is properly enforced
    await this.disableSecurityFeatures();
    await this.enableCompatibilityMode();
  }

  cleanup() {
    // Remove event listeners and cleanup
    this.rollbackTriggers.clear();
    this.initialized = false;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ClientSideSecurityRollback = ClientSideSecurityRollback;
  // Create global instance for emergency access
  window.clientSideSecurityRollback = new ClientSideSecurityRollback();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientSideSecurityRollback;
}