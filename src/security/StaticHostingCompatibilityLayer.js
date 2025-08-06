/**
 * Static Hosting Compatibility Layer
 * Provides fallback mechanisms and graceful degradation for security features
 */

class StaticHostingCompatibilityLayer {
  constructor(existingStorage = null) {
    this.toggle = new StaticHostingSecurityToggle();
    this.fallbackStorage = existingStorage; // Use passed storage instead of creating new one
    this.secureStorage = null;
    this.initializationPromise = null;
    this.healthStatus = { healthy: true, issues: [] };
  }

  /**
   * Initialize compatibility layer with progressive enhancement
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  async _performInitialization() {
    try {
      // Only initialize fallback storage if not provided
      if (!this.fallbackStorage && window.PWACardStorage) {
        this.fallbackStorage = new window.PWACardStorage();
        await this.fallbackStorage.initialize();
      }

      // Conditionally load security modules based on feature toggles
      await this._loadSecurityModules();

      // Setup health monitoring
      this._setupHealthMonitoring();

      return { success: true, mode: 'compatibility' };
    } catch (error) {
      console.error('[CompatibilityLayer] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Dynamically load security modules if enabled
   */
  async _loadSecurityModules() {
    const loadPromises = [];

    // Load encryption module if enabled
    if (this.toggle.isEnabled('encryption')) {
      loadPromises.push(this._loadEncryptionModule());
    }

    // Load WebAuthn module if enabled
    if (this.toggle.isEnabled('webauthn')) {
      loadPromises.push(this._loadWebAuthnModule());
    }

    // Load monitoring module if enabled
    if (this.toggle.isEnabled('monitoring')) {
      loadPromises.push(this._loadMonitoringModule());
    }

    // Wait for all modules to load (with error handling)
    const results = await Promise.allSettled(loadPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn('[CompatibilityLayer] Module load failed:', result.reason);
        this.healthStatus.issues.push(`Module ${index} load failed: ${result.reason.message}`);
      }
    });
  }

  async _loadEncryptionModule() {
    try {
      // Dynamic import for static hosting
      if (window.SecurityDataHandler) {
        this.secureStorage = {
          encrypt: window.SecurityDataHandler.encryptData,
          decrypt: window.SecurityDataHandler.decryptData
        };
      }
    } catch (error) {
      console.warn('[CompatibilityLayer] Encryption module not available:', error);
      throw error;
    }
  }

  async _loadWebAuthnModule() {
    try {
      if (window.SecurityAuthHandler) {
        this.authHandler = window.SecurityAuthHandler;
      }
    } catch (error) {
      console.warn('[CompatibilityLayer] WebAuthn module not available:', error);
      throw error;
    }
  }

  async _loadMonitoringModule() {
    try {
      if (window.SecurityMonitor) {
        this.monitor = new window.SecurityMonitor();
        await this.monitor.initialize();
      }
    } catch (error) {
      console.warn('[CompatibilityLayer] Monitoring module not available:', error);
      throw error;
    }
  }

  /**
   * Store card with automatic fallback
   */
  async storeCard(cardData) {
    try {
      // Try secure storage first if available
      if (this.toggle.isEnabled('encryption') && this.secureStorage) {
        try {
          const encryptedData = await this.secureStorage.encrypt(cardData);
          return await this.fallbackStorage.storeCard(encryptedData);
        } catch (secureError) {
          console.warn('[CompatibilityLayer] Secure storage failed, falling back:', secureError);
          this._handleSecurityFailure('encryption', secureError);
        }
      }

      // Fallback to standard storage
      return await this.fallbackStorage.storeCard(cardData);
    } catch (error) {
      console.error('[CompatibilityLayer] Store card failed:', error);
      throw error;
    }
  }

  /**
   * Get card with automatic decryption
   */
  async getCard(cardId) {
    try {
      const card = await this.fallbackStorage.getCard(cardId);
      
      if (!card) return null;

      // Try to decrypt if encryption is enabled and data appears encrypted
      if (this.toggle.isEnabled('encryption') && this.secureStorage && this._isEncrypted(card.data)) {
        try {
          card.data = await this.secureStorage.decrypt(card.data);
        } catch (decryptError) {
          console.warn('[CompatibilityLayer] Decryption failed:', decryptError);
          this._handleSecurityFailure('encryption', decryptError);
        }
      }

      return card;
    } catch (error) {
      console.error('[CompatibilityLayer] Get card failed:', error);
      throw error;
    }
  }

  /**
   * Validate access with fallback to basic validation
   */
  async validateAccess(operation, resourceType, context = {}) {
    try {
      // Try WebAuthn validation if enabled
      if (this.toggle.isEnabled('webauthn') && this.authHandler) {
        try {
          return await this.authHandler.validateAccess(resourceType, operation, context);
        } catch (authError) {
          console.warn('[CompatibilityLayer] WebAuthn validation failed, using fallback:', authError);
          this._handleSecurityFailure('webauthn', authError);
        }
      }

      // Fallback to basic validation
      return this._basicAccessValidation(operation, resourceType, context);
    } catch (error) {
      console.error('[CompatibilityLayer] Access validation failed:', error);
      return { authorized: false, reason: 'Validation failed' };
    }
  }

  /**
   * Basic access validation for fallback
   */
  _basicAccessValidation(operation, resourceType, context) {
    // Simple rate limiting check
    const rateLimitKey = `rateLimit_${operation}`;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    try {
      const rateLimitData = JSON.parse(localStorage.getItem(rateLimitKey) || '{"operations":[]}');
      rateLimitData.operations = rateLimitData.operations.filter(timestamp => timestamp > oneMinuteAgo);
      
      const maxOperations = { read: 100, write: 50, delete: 10 }[operation] || 20;
      
      if (rateLimitData.operations.length >= maxOperations) {
        return { authorized: false, reason: 'Rate limit exceeded' };
      }
      
      rateLimitData.operations.push(now);
      localStorage.setItem(rateLimitKey, JSON.stringify(rateLimitData));
      
      return { authorized: true, method: 'basic' };
    } catch (error) {
      console.warn('[CompatibilityLayer] Basic validation failed:', error);
      return { authorized: true, method: 'permissive' };
    }
  }

  /**
   * Handle security feature failures
   */
  _handleSecurityFailure(feature, error) {
    console.warn(`[CompatibilityLayer] Security feature ${feature} failed:`, error);
    
    // Auto-disable failing feature
    this.toggle.toggle(feature, false, { 
      reason: `Auto-disabled due to failure: ${error.message}`,
      autoReload: false 
    });
    
    // Record health issue
    this.healthStatus.issues.push({
      feature,
      error: error.message,
      timestamp: Date.now(),
      action: 'auto-disabled'
    });
    
    // Notify monitoring if available
    if (this.monitor) {
      this.monitor.recordSecurityEvent('feature_failure', { feature, error: error.message });
    }
  }

  /**
   * Check if data appears to be encrypted
   */
  _isEncrypted(data) {
    return data && typeof data === 'object' && 
           (data.encrypted === true || data.algorithm || data.iv);
  }

  /**
   * Setup health monitoring
   */
  _setupHealthMonitoring() {
    // Periodic health check
    setInterval(() => {
      this._performHealthCheck();
    }, 300000); // Every 5 minutes

    // Monitor localStorage quota
    this._monitorStorageQuota();
  }

  /**
   * Perform health check
   */
  async _performHealthCheck() {
    try {
      const healthData = {
        timestamp: Date.now(),
        features: this.toggle.getAllFeatures(),
        storage: {
          available: !!this.fallbackStorage,
          secure: !!this.secureStorage
        },
        issues: this.healthStatus.issues.slice(-10) // Keep last 10 issues
      };

      // Test basic operations
      if (this.fallbackStorage) {
        try {
          await this.fallbackStorage.performHealthCheck();
          healthData.storage.healthy = true;
        } catch (error) {
          healthData.storage.healthy = false;
          healthData.storage.error = error.message;
        }
      }

      // Store health data
      localStorage.setItem('pwa-security-health', JSON.stringify(healthData));
      
      return healthData;
    } catch (error) {
      console.error('[CompatibilityLayer] Health check failed:', error);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Monitor localStorage quota usage
   */
  _monitorStorageQuota() {
    try {
      const usage = JSON.stringify(localStorage).length;
      const quota = 5 * 1024 * 1024; // Assume 5MB quota for localStorage
      const usagePercent = (usage / quota) * 100;

      if (usagePercent > 80) {
        console.warn('[CompatibilityLayer] localStorage usage high:', usagePercent + '%');
        this.healthStatus.issues.push({
          type: 'storage_quota',
          usage: usagePercent,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('[CompatibilityLayer] Storage quota monitoring failed:', error);
    }
  }

  /**
   * Get compatibility status
   */
  getStatus() {
    return {
      initialized: !!this.initializationPromise,
      fallbackAvailable: !!this.fallbackStorage,
      secureStorageAvailable: !!this.secureStorage,
      authHandlerAvailable: !!this.authHandler,
      monitorAvailable: !!this.monitor,
      features: this.toggle.getAllFeatures(),
      health: this.healthStatus
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      if (this.fallbackStorage && typeof this.fallbackStorage.cleanup === 'function') {
        this.fallbackStorage.cleanup();
      }
      
      if (this.monitor && typeof this.monitor.cleanup === 'function') {
        this.monitor.cleanup();
      }
    } catch (error) {
      console.error('[CompatibilityLayer] Cleanup failed:', error);
    }
  }
}

// Export for static hosting
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StaticHostingCompatibilityLayer;
} else if (typeof window !== 'undefined') {
  window.StaticHostingCompatibilityLayer = StaticHostingCompatibilityLayer;
}