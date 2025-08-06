/**
 * Client-Side Graceful Security Degradation System
 * Handles security module failures with graceful fallback for static hosting
 */

class ClientSideGracefulDegradation {
  constructor() {
    this.toggle = new StaticHostingSecurityToggle();
    this.degradationState = {
      level: 'normal', // normal, degraded, minimal, emergency
      failedModules: new Set(),
      fallbacksActive: new Map(),
      lastDegradation: null
    };
    this.degradationLevels = {
      normal: { security: 100, features: 100 },
      degraded: { security: 70, features: 95 },
      minimal: { security: 40, features: 85 },
      emergency: { security: 20, features: 75 }
    };
  }

  /**
   * Initialize degradation system
   */
  async initialize() {
    try {
      // Load degradation state from localStorage
      this._loadDegradationState();
      
      // Setup error handlers
      this._setupGlobalErrorHandlers();
      
      // Monitor module health
      this._startHealthMonitoring();
      
      return { success: true, level: this.degradationState.level };
    } catch (error) {
      console.error('[GracefulDegradation] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle security module failure
   */
  async handleModuleFailure(moduleName, error, context = {}) {
    try {
      console.warn(`[GracefulDegradation] Module ${moduleName} failed:`, error);
      
      // Record failure
      this.degradationState.failedModules.add(moduleName);
      this.degradationState.lastDegradation = {
        module: moduleName,
        error: error.message,
        timestamp: Date.now(),
        context
      };
      
      // Determine new degradation level
      const newLevel = this._calculateDegradationLevel();
      
      // Apply degradation
      await this._applyDegradation(newLevel, moduleName);
      
      // Notify user if significant degradation
      if (this._isSignificantDegradation(newLevel)) {
        this._notifyUserOfDegradation(newLevel, moduleName);
      }
      
      // Save state
      this._saveDegradationState();
      
      return { success: true, newLevel, fallback: this.degradationState.fallbacksActive.get(moduleName) };
    } catch (degradationError) {
      console.error('[GracefulDegradation] Failed to handle module failure:', degradationError);
      return { success: false, error: degradationError.message };
    }
  }

  /**
   * Calculate appropriate degradation level
   */
  _calculateDegradationLevel() {
    const failedCount = this.degradationState.failedModules.size;
    const criticalModules = ['webauthn', 'encryption'];
    const hasCriticalFailure = Array.from(this.degradationState.failedModules)
      .some(module => criticalModules.includes(module));
    
    if (failedCount === 0) return 'normal';
    if (hasCriticalFailure && failedCount >= 2) return 'emergency';
    if (hasCriticalFailure || failedCount >= 3) return 'minimal';
    if (failedCount >= 2) return 'degraded';
    return 'degraded';
  }

  /**
   * Apply degradation measures
   */
  async _applyDegradation(level, failedModule) {
    try {
      this.degradationState.level = level;
      
      // Disable failed module
      this.toggle.toggle(failedModule, false, { 
        reason: `Auto-disabled due to failure`,
        autoReload: false 
      });
      
      // Apply level-specific measures
      switch (level) {
        case 'degraded':
          await this._applyDegradedMode(failedModule);
          break;
        case 'minimal':
          await this._applyMinimalMode();
          break;
        case 'emergency':
          await this._applyEmergencyMode();
          break;
      }
      
      // Setup fallback for failed module
      this._setupModuleFallback(failedModule);
      
    } catch (error) {
      console.error('[GracefulDegradation] Failed to apply degradation:', error);
    }
  }

  /**
   * Apply degraded mode (single module failure)
   */
  async _applyDegradedMode(failedModule) {
    const fallbacks = {
      webauthn: () => this._enablePinFallback(),
      encryption: () => this._enablePlainStorageFallback(),
      monitoring: () => this._enableBasicLoggingFallback(),
      inputValidation: () => this._enableBasicValidationFallback()
    };
    
    if (fallbacks[failedModule]) {
      await fallbacks[failedModule]();
      this.degradationState.fallbacksActive.set(failedModule, 'degraded');
    }
  }

  /**
   * Apply minimal mode (multiple failures)
   */
  async _applyMinimalMode() {
    // Disable non-essential features
    this.toggle.toggle('monitoring', false, { autoReload: false });
    
    // Enable basic fallbacks for all
    await this._enablePinFallback();
    await this._enablePlainStorageFallback();
    await this._enableBasicLoggingFallback();
    
    this.degradationState.fallbacksActive.set('system', 'minimal');
  }

  /**
   * Apply emergency mode (critical failures)
   */
  async _applyEmergencyMode() {
    // Disable all security features except basic validation
    ['webauthn', 'encryption', 'monitoring'].forEach(feature => {
      this.toggle.toggle(feature, false, { autoReload: false });
    });
    
    // Enable emergency fallbacks
    await this._enableEmergencyFallbacks();
    
    this.degradationState.fallbacksActive.set('system', 'emergency');
    
    // Show emergency notice
    this._showEmergencyNotice();
  }

  /**
   * Setup module-specific fallback
   */
  _setupModuleFallback(moduleName) {
    const fallbackConfig = {
      webauthn: {
        method: 'pin-auth',
        message: 'Using PIN authentication as fallback'
      },
      encryption: {
        method: 'plain-storage',
        message: 'Data stored without encryption'
      },
      monitoring: {
        method: 'basic-logging',
        message: 'Using basic console logging'
      }
    };
    
    const config = fallbackConfig[moduleName];
    if (config) {
      this.degradationState.fallbacksActive.set(moduleName, config.method);
      console.info(`[GracefulDegradation] ${config.message}`);
    }
  }

  /**
   * Enable PIN authentication fallback
   */
  async _enablePinFallback() {
    try {
      // Store fallback auth method
      localStorage.setItem('pwa-auth-fallback', JSON.stringify({
        method: 'pin',
        enabled: true,
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'pin' };
    } catch (error) {
      console.error('[GracefulDegradation] PIN fallback setup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable plain storage fallback
   */
  async _enablePlainStorageFallback() {
    try {
      // Mark storage as unencrypted
      localStorage.setItem('pwa-storage-fallback', JSON.stringify({
        encrypted: false,
        reason: 'encryption-module-failed',
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'plain' };
    } catch (error) {
      console.error('[GracefulDegradation] Plain storage fallback failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable basic logging fallback
   */
  async _enableBasicLoggingFallback() {
    try {
      // Setup console-only logging
      window.basicLogger = {
        log: (level, message, data) => console[level](`[BasicLogger] ${message}`, data),
        error: (message, error) => console.error(`[BasicLogger] ${message}`, error),
        warn: (message, data) => console.warn(`[BasicLogger] ${message}`, data)
      };
      
      return { success: true, method: 'console' };
    } catch (error) {
      console.error('[GracefulDegradation] Basic logging fallback failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable basic validation fallback
   */
  async _enableBasicValidationFallback() {
    try {
      // Setup minimal input validation
      window.basicValidator = {
        sanitize: (input) => String(input).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
        validate: (input, type) => input != null && String(input).length < 10000
      };
      
      return { success: true, method: 'basic' };
    } catch (error) {
      console.error('[GracefulDegradation] Basic validation fallback failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable emergency fallbacks
   */
  async _enableEmergencyFallbacks() {
    await Promise.all([
      this._enablePinFallback(),
      this._enablePlainStorageFallback(),
      this._enableBasicLoggingFallback(),
      this._enableBasicValidationFallback()
    ]);
  }

  /**
   * Setup global error handlers
   */
  _setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this._isSecurityModuleError(event.reason)) {
        this._handleSecurityError(event.reason);
        event.preventDefault();
      }
    });
    
    // Handle general errors
    window.addEventListener('error', (event) => {
      if (this._isSecurityModuleError(event.error)) {
        this._handleSecurityError(event.error);
      }
    });
  }

  /**
   * Check if error is from security module
   */
  _isSecurityModuleError(error) {
    if (!error) return false;
    
    const securityKeywords = ['webauthn', 'encryption', 'security', 'auth', 'crypto'];
    const errorMessage = error.message || error.toString();
    
    return securityKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );
  }

  /**
   * Handle security-related errors
   */
  async _handleSecurityError(error) {
    try {
      // Determine which module failed
      const moduleName = this._identifyFailedModule(error);
      
      if (moduleName) {
        await this.handleModuleFailure(moduleName, error, { source: 'global-handler' });
      }
    } catch (handlerError) {
      console.error('[GracefulDegradation] Error handler failed:', handlerError);
    }
  }

  /**
   * Identify which module failed from error
   */
  _identifyFailedModule(error) {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('webauthn') || errorMessage.includes('credential')) return 'webauthn';
    if (errorMessage.includes('encrypt') || errorMessage.includes('crypto')) return 'encryption';
    if (errorMessage.includes('monitor') || errorMessage.includes('logging')) return 'monitoring';
    if (errorMessage.includes('validation') || errorMessage.includes('sanitize')) return 'inputValidation';
    
    return null;
  }

  /**
   * Start health monitoring
   */
  _startHealthMonitoring() {
    // Check module health every 2 minutes
    setInterval(() => {
      this._performHealthCheck();
    }, 120000);
  }

  /**
   * Perform health check on modules
   */
  async _performHealthCheck() {
    try {
      const modules = ['webauthn', 'encryption', 'monitoring', 'inputValidation'];
      
      for (const module of modules) {
        if (this.toggle.isEnabled(module) && !this.degradationState.failedModules.has(module)) {
          try {
            await this._testModuleHealth(module);
          } catch (error) {
            console.warn(`[GracefulDegradation] Health check failed for ${module}:`, error);
            await this.handleModuleFailure(module, error, { source: 'health-check' });
          }
        }
      }
    } catch (error) {
      console.error('[GracefulDegradation] Health check failed:', error);
    }
  }

  /**
   * Test individual module health
   */
  async _testModuleHealth(moduleName) {
    const healthTests = {
      webauthn: () => navigator.credentials && typeof navigator.credentials.create === 'function',
      encryption: () => window.crypto && window.crypto.subtle,
      monitoring: () => typeof indexedDB !== 'undefined',
      inputValidation: () => true // Always available
    };
    
    const test = healthTests[moduleName];
    if (test && !test()) {
      throw new Error(`${moduleName} module health check failed`);
    }
  }

  /**
   * Check if degradation is significant
   */
  _isSignificantDegradation(level) {
    const currentSecurity = this.degradationLevels[this.degradationState.level]?.security || 100;
    const newSecurity = this.degradationLevels[level]?.security || 0;
    
    return (currentSecurity - newSecurity) >= 30;
  }

  /**
   * Notify user of degradation
   */
  _notifyUserOfDegradation(level, moduleName) {
    const messages = {
      degraded: `Security feature "${moduleName}" is temporarily unavailable. Using fallback method.`,
      minimal: 'Multiple security features are unavailable. Operating in minimal security mode.',
      emergency: 'Critical security features failed. Operating in emergency mode with basic protection.'
    };
    
    const message = messages[level];
    if (message) {
      // Store notification for UI display
      localStorage.setItem('pwa-degradation-notice', JSON.stringify({
        level,
        message,
        timestamp: Date.now(),
        acknowledged: false
      }));
      
      // Show console warning
      console.warn(`[GracefulDegradation] ${message}`);
    }
  }

  /**
   * Show emergency notice
   */
  _showEmergencyNotice() {
    const notice = {
      type: 'emergency',
      title: 'Security System Emergency Mode',
      message: 'Critical security features have failed. The system is operating with minimal protection. Please refresh the page or contact support if issues persist.',
      timestamp: Date.now(),
      actions: ['refresh', 'contact-support']
    };
    
    localStorage.setItem('pwa-emergency-notice', JSON.stringify(notice));
    console.error('[GracefulDegradation] EMERGENCY MODE ACTIVATED:', notice.message);
  }

  /**
   * Load degradation state from localStorage
   */
  _loadDegradationState() {
    try {
      const stored = localStorage.getItem('pwa-degradation-state');
      if (stored) {
        const state = JSON.parse(stored);
        this.degradationState = {
          ...this.degradationState,
          level: state.level || 'normal',
          failedModules: new Set(state.failedModules || []),
          fallbacksActive: new Map(state.fallbacksActive || []),
          lastDegradation: state.lastDegradation
        };
      }
    } catch (error) {
      console.warn('[GracefulDegradation] Failed to load degradation state:', error);
    }
  }

  /**
   * Save degradation state to localStorage
   */
  _saveDegradationState() {
    try {
      const state = {
        level: this.degradationState.level,
        failedModules: Array.from(this.degradationState.failedModules),
        fallbacksActive: Array.from(this.degradationState.fallbacksActive.entries()),
        lastDegradation: this.degradationState.lastDegradation,
        timestamp: Date.now()
      };
      
      localStorage.setItem('pwa-degradation-state', JSON.stringify(state));
    } catch (error) {
      console.error('[GracefulDegradation] Failed to save degradation state:', error);
    }
  }

  /**
   * Get current degradation status
   */
  getStatus() {
    return {
      level: this.degradationState.level,
      security: this.degradationLevels[this.degradationState.level]?.security || 0,
      features: this.degradationLevels[this.degradationState.level]?.features || 0,
      failedModules: Array.from(this.degradationState.failedModules),
      fallbacksActive: Object.fromEntries(this.degradationState.fallbacksActive),
      lastDegradation: this.degradationState.lastDegradation
    };
  }

  /**
   * Reset degradation state
   */
  async resetDegradation() {
    try {
      this.degradationState = {
        level: 'normal',
        failedModules: new Set(),
        fallbacksActive: new Map(),
        lastDegradation: null
      };
      
      // Clear localStorage
      ['pwa-degradation-state', 'pwa-degradation-notice', 'pwa-emergency-notice'].forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Re-enable all features
      this.toggle.resetToDefaults();
      
      return { success: true, level: 'normal' };
    } catch (error) {
      console.error('[GracefulDegradation] Reset failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export for static hosting
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientSideGracefulDegradation;
} else if (typeof window !== 'undefined') {
  window.ClientSideGracefulDegradation = ClientSideGracefulDegradation;
}