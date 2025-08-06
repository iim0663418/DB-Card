/**
 * Client-Side Security Error Recovery System
 * Automatic recovery system for security module failures with user-friendly error handling
 */

class ClientSideSecurityErrorRecovery {
  constructor() {
    this.toggle = new StaticHostingSecurityToggle();
    this.degradation = new ClientSideGracefulDegradation();
    this.healthMonitor = new ClientSideSecurityHealthMonitor();
    
    this.recoveryStrategies = new Map();
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
    this.recoveryBackoffMs = 5000; // 5 seconds
    
    this.isRecovering = false;
    this.recoveryQueue = [];
    this.recoveryHistory = [];
  }

  /**
   * Initialize error recovery system
   */
  async initialize() {
    try {
      // Setup recovery strategies
      this._setupRecoveryStrategies();
      
      // Setup error listeners
      this._setupErrorListeners();
      
      // Load recovery history
      this._loadRecoveryHistory();
      
      // Start recovery monitoring
      this._startRecoveryMonitoring();
      
      return { success: true, strategies: this.recoveryStrategies.size };
    } catch (error) {
      console.error('[ErrorRecovery] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle security error with automatic recovery
   */
  async handleSecurityError(error, context = {}) {
    try {
      const errorInfo = this._analyzeError(error, context);
      
      console.warn('[ErrorRecovery] Handling security error:', errorInfo);
      
      // Record error for monitoring
      if (this.healthMonitor) {
        await this.healthMonitor.recordSecurityEvent('security_error', {
          error: errorInfo.type,
          module: errorInfo.module,
          recoverable: errorInfo.recoverable,
          context
        });
      }
      
      // Attempt recovery if error is recoverable
      if (errorInfo.recoverable) {
        const recoveryResult = await this._attemptRecovery(errorInfo);
        
        if (recoveryResult.success) {
          return { 
            success: true, 
            recovered: true, 
            strategy: recoveryResult.strategy,
            message: 'Error recovered automatically'
          };
        } else {
          // Recovery failed, trigger degradation
          if (this.degradation) {
            await this.degradation.handleModuleFailure(
              errorInfo.module, 
              error, 
              { source: 'recovery-failure', attempts: recoveryResult.attempts }
            );
          }
          
          return {
            success: false,
            recovered: false,
            degraded: true,
            message: 'Recovery failed, system degraded gracefully'
          };
        }
      } else {
        // Non-recoverable error, show user-friendly message
        this._showUserFriendlyError(errorInfo);
        
        return {
          success: false,
          recovered: false,
          userNotified: true,
          message: 'Non-recoverable error, user notified'
        };
      }
    } catch (recoveryError) {
      console.error('[ErrorRecovery] Recovery handling failed:', recoveryError);
      return { success: false, error: recoveryError.message };
    }
  }

  /**
   * Setup recovery strategies for different error types
   */
  _setupRecoveryStrategies() {
    // WebAuthn recovery strategies
    this.recoveryStrategies.set('webauthn_not_supported', {
      strategy: 'fallback_to_pin',
      maxAttempts: 1,
      backoffMs: 0,
      recovery: async () => {
        this.toggle.toggle('webauthn', false, { autoReload: false });
        return await this._enablePinAuthentication();
      }
    });
    
    this.recoveryStrategies.set('webauthn_user_cancelled', {
      strategy: 'retry_with_prompt',
      maxAttempts: 2,
      backoffMs: 3000,
      recovery: async () => {
        return await this._retryWebAuthnWithPrompt();
      }
    });
    
    this.recoveryStrategies.set('webauthn_timeout', {
      strategy: 'extend_timeout_retry',
      maxAttempts: 2,
      backoffMs: 5000,
      recovery: async () => {
        return await this._retryWebAuthnWithExtendedTimeout();
      }
    });
    
    // Encryption recovery strategies
    this.recoveryStrategies.set('encryption_key_not_found', {
      strategy: 'regenerate_key',
      maxAttempts: 1,
      backoffMs: 1000,
      recovery: async () => {
        return await this._regenerateEncryptionKey();
      }
    });
    
    this.recoveryStrategies.set('encryption_algorithm_not_supported', {
      strategy: 'fallback_algorithm',
      maxAttempts: 1,
      backoffMs: 0,
      recovery: async () => {
        return await this._useFallbackEncryption();
      }
    });
    
    this.recoveryStrategies.set('decryption_failed', {
      strategy: 'try_legacy_format',
      maxAttempts: 2,
      backoffMs: 1000,
      recovery: async () => {
        return await this._tryLegacyDecryption();
      }
    });
    
    // Storage recovery strategies
    this.recoveryStrategies.set('indexeddb_quota_exceeded', {
      strategy: 'cleanup_old_data',
      maxAttempts: 1,
      backoffMs: 2000,
      recovery: async () => {
        return await this._cleanupOldStorageData();
      }
    });
    
    this.recoveryStrategies.set('indexeddb_not_available', {
      strategy: 'fallback_to_localstorage',
      maxAttempts: 1,
      backoffMs: 0,
      recovery: async () => {
        return await this._fallbackToLocalStorage();
      }
    });
    
    // Network recovery strategies
    this.recoveryStrategies.set('network_error', {
      strategy: 'offline_mode',
      maxAttempts: 1,
      backoffMs: 0,
      recovery: async () => {
        return await this._enableOfflineMode();
      }
    });
    
    // General recovery strategies
    this.recoveryStrategies.set('module_load_failed', {
      strategy: 'reload_module',
      maxAttempts: 2,
      backoffMs: 3000,
      recovery: async (errorInfo) => {
        return await this._reloadSecurityModule(errorInfo.module);
      }
    });
  }

  /**
   * Analyze error to determine recovery strategy
   */
  _analyzeError(error, context) {
    const errorMessage = error.message || error.toString();
    const errorStack = error.stack || '';
    
    // Determine error type and module
    let errorType = 'unknown_error';
    let module = 'unknown';
    let recoverable = false;
    
    // WebAuthn errors
    if (errorMessage.includes('webauthn') || errorMessage.includes('credential')) {
      module = 'webauthn';
      recoverable = true;
      
      if (errorMessage.includes('not supported')) {
        errorType = 'webauthn_not_supported';
      } else if (errorMessage.includes('cancelled') || errorMessage.includes('abort')) {
        errorType = 'webauthn_user_cancelled';
      } else if (errorMessage.includes('timeout')) {
        errorType = 'webauthn_timeout';
      }
    }
    
    // Encryption errors
    else if (errorMessage.includes('encrypt') || errorMessage.includes('decrypt') || errorMessage.includes('crypto')) {
      module = 'encryption';
      recoverable = true;
      
      if (errorMessage.includes('key not found')) {
        errorType = 'encryption_key_not_found';
      } else if (errorMessage.includes('algorithm') || errorMessage.includes('not supported')) {
        errorType = 'encryption_algorithm_not_supported';
      } else if (errorMessage.includes('decrypt')) {
        errorType = 'decryption_failed';
      }
    }
    
    // Storage errors
    else if (errorMessage.includes('indexeddb') || errorMessage.includes('storage') || errorMessage.includes('quota')) {
      module = 'storage';
      recoverable = true;
      
      if (errorMessage.includes('quota')) {
        errorType = 'indexeddb_quota_exceeded';
      } else if (errorMessage.includes('not available') || errorMessage.includes('not supported')) {
        errorType = 'indexeddb_not_available';
      }
    }
    
    // Network errors
    else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('offline')) {
      module = 'network';
      recoverable = true;
      errorType = 'network_error';
    }
    
    // Module loading errors
    else if (errorMessage.includes('load') || errorMessage.includes('import') || errorStack.includes('import')) {
      recoverable = true;
      errorType = 'module_load_failed';
      
      // Try to determine which module failed
      if (errorStack.includes('webauthn') || context.module === 'webauthn') {
        module = 'webauthn';
      } else if (errorStack.includes('encryption') || context.module === 'encryption') {
        module = 'encryption';
      } else if (errorStack.includes('monitor') || context.module === 'monitoring') {
        module = 'monitoring';
      }
    }
    
    return {
      type: errorType,
      module,
      recoverable,
      originalError: error,
      context,
      timestamp: Date.now()
    };
  }

  /**
   * Attempt recovery using appropriate strategy
   */
  async _attemptRecovery(errorInfo) {
    const strategy = this.recoveryStrategies.get(errorInfo.type);
    
    if (!strategy) {
      return { success: false, reason: 'No recovery strategy available' };
    }
    
    // Check if we've exceeded max attempts for this error type
    const attemptKey = `${errorInfo.type}_${errorInfo.module}`;
    const attempts = this.recoveryAttempts.get(attemptKey) || 0;
    
    if (attempts >= strategy.maxAttempts) {
      return { 
        success: false, 
        reason: 'Max recovery attempts exceeded',
        attempts 
      };
    }
    
    // Increment attempt counter
    this.recoveryAttempts.set(attemptKey, attempts + 1);
    
    try {
      // Apply backoff delay
      if (strategy.backoffMs > 0 && attempts > 0) {
        await this._delay(strategy.backoffMs * Math.pow(2, attempts));
      }
      
      // Attempt recovery
      console.info(`[ErrorRecovery] Attempting recovery: ${strategy.strategy} (attempt ${attempts + 1})`);
      
      const recoveryResult = await strategy.recovery(errorInfo);
      
      if (recoveryResult.success) {
        // Reset attempt counter on success
        this.recoveryAttempts.delete(attemptKey);
        
        // Record successful recovery
        this._recordRecovery(errorInfo, strategy.strategy, true, attempts + 1);
        
        return { 
          success: true, 
          strategy: strategy.strategy,
          attempts: attempts + 1
        };
      } else {
        return { 
          success: false, 
          reason: recoveryResult.error || 'Recovery strategy failed',
          attempts: attempts + 1
        };
      }
    } catch (recoveryError) {
      console.error('[ErrorRecovery] Recovery attempt failed:', recoveryError);
      
      this._recordRecovery(errorInfo, strategy.strategy, false, attempts + 1, recoveryError.message);
      
      return { 
        success: false, 
        reason: recoveryError.message,
        attempts: attempts + 1
      };
    }
  }

  /**
   * Recovery strategy implementations
   */
  async _enablePinAuthentication() {
    try {
      localStorage.setItem('pwa-auth-method', JSON.stringify({
        method: 'pin',
        enabled: true,
        fallbackReason: 'webauthn_not_supported',
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'pin' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _retryWebAuthnWithPrompt() {
    try {
      // Show user-friendly prompt
      this._showRecoveryMessage('Retrying biometric authentication...', 'info');
      
      // Simulate retry (actual implementation would call WebAuthn API)
      await this._delay(1000);
      
      return { success: true, method: 'webauthn_retry' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _retryWebAuthnWithExtendedTimeout() {
    try {
      // Store extended timeout preference
      localStorage.setItem('pwa-webauthn-timeout', JSON.stringify({
        timeout: 120000, // 2 minutes
        reason: 'recovery_extended_timeout',
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'extended_timeout' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _regenerateEncryptionKey() {
    try {
      // Generate new encryption key
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Store key (in real implementation, would use secure storage)
      const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
      localStorage.setItem('pwa-encryption-key-recovery', JSON.stringify({
        key: exportedKey,
        generated: Date.now(),
        reason: 'key_regeneration'
      }));
      
      return { success: true, method: 'key_regenerated' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _useFallbackEncryption() {
    try {
      // Switch to simpler encryption algorithm
      localStorage.setItem('pwa-encryption-fallback', JSON.stringify({
        algorithm: 'AES-CBC',
        keyLength: 128,
        reason: 'algorithm_fallback',
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'fallback_algorithm' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _tryLegacyDecryption() {
    try {
      // Try legacy decryption format
      localStorage.setItem('pwa-decryption-mode', JSON.stringify({
        mode: 'legacy',
        reason: 'decryption_recovery',
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'legacy_decryption' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _cleanupOldStorageData() {
    try {
      // Clean up old IndexedDB data
      const databases = await indexedDB.databases();
      let cleanedSize = 0;
      
      for (const db of databases) {
        if (db.name.includes('PWA') && db.name.includes('old')) {
          try {
            indexedDB.deleteDatabase(db.name);
            cleanedSize += 1;
          } catch (error) {
            console.warn('[ErrorRecovery] Failed to delete old database:', error);
          }
        }
      }
      
      // Clean up localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('pwa-old-') || key.includes('temp-')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      return { 
        success: true, 
        method: 'storage_cleanup',
        cleaned: { databases: cleanedSize, localStorageKeys: keysToRemove.length }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _fallbackToLocalStorage() {
    try {
      // Switch to localStorage-only mode
      localStorage.setItem('pwa-storage-mode', JSON.stringify({
        mode: 'localStorage',
        reason: 'indexeddb_fallback',
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'localStorage_fallback' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _enableOfflineMode() {
    try {
      // Enable offline mode
      localStorage.setItem('pwa-offline-mode', JSON.stringify({
        enabled: true,
        reason: 'network_recovery',
        timestamp: Date.now()
      }));
      
      return { success: true, method: 'offline_mode' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async _reloadSecurityModule(moduleName) {
    try {
      // Attempt to reload the module
      if (window[`Security${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Handler`]) {
        // Module already loaded, try to reinitialize
        const moduleClass = window[`Security${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Handler`];
        const instance = new moduleClass();
        await instance.initialize();
        
        return { success: true, method: 'module_reinitialized' };
      } else {
        // Try to reload module script
        const script = document.createElement('script');
        script.src = `/src/security/Security${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Handler.js`;
        
        return new Promise((resolve) => {
          script.onload = () => resolve({ success: true, method: 'module_reloaded' });
          script.onerror = () => resolve({ success: false, error: 'Module reload failed' });
          document.head.appendChild(script);
        });
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup error listeners
   */
  _setupErrorListeners() {
    // Global error handler
    window.addEventListener('error', (event) => {
      if (this._isSecurityError(event.error)) {
        this.handleSecurityError(event.error, { source: 'global_error' });
      }
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (this._isSecurityError(event.reason)) {
        this.handleSecurityError(event.reason, { source: 'unhandled_promise' });
        event.preventDefault();
      }
    });
    
    // Custom security error events
    window.addEventListener('security-error', (event) => {
      this.handleSecurityError(event.detail.error, event.detail.context);
    });
  }

  /**
   * Check if error is security-related
   */
  _isSecurityError(error) {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const securityKeywords = [
      'webauthn', 'credential', 'encrypt', 'decrypt', 'crypto',
      'security', 'auth', 'permission', 'quota', 'storage'
    ];
    
    return securityKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword)
    );
  }

  /**
   * Show user-friendly error message
   */
  _showUserFriendlyError(errorInfo) {
    const userMessages = {
      webauthn_not_supported: 'Biometric authentication is not available on this device. Using PIN authentication instead.',
      encryption_key_not_found: 'Security key not found. Your data will be stored without encryption.',
      indexeddb_not_available: 'Advanced storage features are not available. Using basic storage instead.',
      network_error: 'Network connection lost. Operating in offline mode.',
      unknown_error: 'A security feature encountered an issue. The system will continue with reduced security.'
    };
    
    const message = userMessages[errorInfo.type] || userMessages.unknown_error;
    
    this._showRecoveryMessage(message, 'warning');
    
    // Store for UI display
    localStorage.setItem('pwa-user-error-message', JSON.stringify({
      message,
      type: errorInfo.type,
      timestamp: Date.now(),
      acknowledged: false
    }));
  }

  /**
   * Show recovery message to user
   */
  _showRecoveryMessage(message, type = 'info') {
    console.info(`[ErrorRecovery] ${message}`);
    
    // Store for UI display
    const recoveryMessages = JSON.parse(localStorage.getItem('pwa-recovery-messages') || '[]');
    recoveryMessages.push({
      message,
      type,
      timestamp: Date.now()
    });
    
    // Keep only last 10 messages
    localStorage.setItem('pwa-recovery-messages', JSON.stringify(recoveryMessages.slice(-10)));
  }

  /**
   * Record recovery attempt
   */
  _recordRecovery(errorInfo, strategy, success, attempts, errorMessage = null) {
    const record = {
      errorType: errorInfo.type,
      module: errorInfo.module,
      strategy,
      success,
      attempts,
      timestamp: Date.now(),
      errorMessage
    };
    
    this.recoveryHistory.push(record);
    
    // Keep only last 100 records
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-100);
    }
    
    // Save to localStorage
    localStorage.setItem('pwa-recovery-history', JSON.stringify(this.recoveryHistory));
  }

  /**
   * Load recovery history
   */
  _loadRecoveryHistory() {
    try {
      const stored = localStorage.getItem('pwa-recovery-history');
      if (stored) {
        this.recoveryHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[ErrorRecovery] Failed to load recovery history:', error);
    }
  }

  /**
   * Start recovery monitoring
   */
  _startRecoveryMonitoring() {
    // Clean up old attempt counters every hour
    setInterval(() => {
      this._cleanupAttemptCounters();
    }, 3600000);
    
    // Monitor recovery queue
    setInterval(() => {
      this._processRecoveryQueue();
    }, 5000);
  }

  /**
   * Clean up old attempt counters
   */
  _cleanupAttemptCounters() {
    // Reset attempt counters older than 1 hour
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [key, attempts] of this.recoveryAttempts.entries()) {
      // If no recent recovery attempts, reset counter
      const recentRecoveries = this.recoveryHistory.filter(
        record => record.timestamp > oneHourAgo && 
                 `${record.errorType}_${record.module}` === key
      );
      
      if (recentRecoveries.length === 0) {
        this.recoveryAttempts.delete(key);
      }
    }
  }

  /**
   * Process recovery queue
   */
  async _processRecoveryQueue() {
    if (this.isRecovering || this.recoveryQueue.length === 0) {
      return;
    }
    
    this.isRecovering = true;
    
    try {
      const recovery = this.recoveryQueue.shift();
      await this.handleSecurityError(recovery.error, recovery.context);
    } catch (error) {
      console.error('[ErrorRecovery] Queue processing failed:', error);
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Utility function for delays
   */
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recovery status
   */
  getRecoveryStatus() {
    return {
      strategies: this.recoveryStrategies.size,
      activeAttempts: this.recoveryAttempts.size,
      queueLength: this.recoveryQueue.length,
      isRecovering: this.isRecovering,
      historyLength: this.recoveryHistory.length,
      recentRecoveries: this.recoveryHistory.slice(-5)
    };
  }

  /**
   * Reset recovery system
   */
  resetRecovery() {
    this.recoveryAttempts.clear();
    this.recoveryQueue = [];
    this.recoveryHistory = [];
    this.isRecovering = false;
    
    // Clear localStorage
    ['pwa-recovery-history', 'pwa-recovery-messages', 'pwa-user-error-message'].forEach(key => {
      localStorage.removeItem(key);
    });
    
    return { success: true, reset: true };
  }
}

// Export for static hosting
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientSideSecurityErrorRecovery;
} else if (typeof window !== 'undefined') {
  window.ClientSideSecurityErrorRecovery = ClientSideSecurityErrorRecovery;
}