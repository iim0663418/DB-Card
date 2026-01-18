/**
 * Migration Helper - Backward Compatibility Bridge
 * Provides compatibility layer for existing global object pattern
 * while encouraging migration to ES6 modules
 */

import { 
  initializeSecurity,
  processInput,
  processBusinessCardData,
  storeSecureData,
  retrieveSecureData,
  performSecurityHealthCheck,
  getSecurityInfo,
  validateInput,
  escapeHtml,
  validateEmail,
  validatePhone,
  createSecureStorage
} from './security-core.js';

/**
 * Legacy compatibility wrapper
 * Mimics the old LightweightSecurityCore class interface
 */
class LegacySecurityWrapper {
  static #instance = null;
  static #migrationWarningShown = false;
  
  static getInstance() {
    if (!this.#instance) {
      this.#instance = new LegacySecurityWrapper();
    }
    
    // Show migration warning once
    if (!this.#migrationWarningShown) {
      console.warn(
        '[DEPRECATION WARNING] LightweightSecurityCore global object is deprecated. ' +
        'Please migrate to ES6 modules: import { initializeSecurity } from "./security-core.js"'
      );
      this.#migrationWarningShown = true;
    }
    
    return this.#instance;
  }
  
  constructor() {
    if (LegacySecurityWrapper.#instance) {
      return LegacySecurityWrapper.#instance;
    }
    this.init();
  }
  
  async init() {
    const result = await initializeSecurity();
    if (!result.success) {
      console.error('[LegacyWrapper] Initialization failed:', result.error);
    }
  }
  
  setupCSP() {
    // CSP is now handled automatically in initializeSecurity
    console.warn('[DEPRECATION] setupCSP() is deprecated. CSP is configured automatically.');
  }
  
  static validateInput(input, maxLength) {
    const result = validateInput(input, { maxLength });
    return {
      valid: result.valid,
      sanitized: result.sanitized
    };
  }
  
  static escapeHtml(str) {
    return escapeHtml(str);
  }
  
  setupRateLimit() {
    // Rate limiting is now handled automatically
    console.warn('[DEPRECATION] setupRateLimit() is deprecated. Rate limiting is configured automatically.');
  }
  
  checkRateLimit(operation = 'default') {
    // This would need to be implemented with the new rate limiting system
    console.warn('[DEPRECATION] checkRateLimit() is deprecated. Use checkInputRateLimit() from security-core.js');
    return true; // Allow by default for backward compatibility
  }
  
  static log(level, message, details = {}) {
    // Simple logging for backward compatibility
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: escapeHtml(message),
      source: 'LegacyWrapper',
      details
    };
    
    if (level === 'error') {
      console.error('[Security]', entry);
    } else {
      console.log('[Security]', entry);
    }
  }
}

/**
 * Legacy toggle wrapper
 */
class LegacyToggleWrapper {
  constructor() {
    this.features = {
      csp: true,
      xssProtection: true,
      inputValidation: true,
      rateLimit: true,
      logging: true
    };
    
    console.warn(
      '[DEPRECATION WARNING] StaticHostingSecurityToggle is deprecated. ' +
      'Security features are now managed automatically.'
    );
  }
  
  isEnabled(feature) {
    return this.features[feature] === true;
  }
  
  toggle(feature, enabled) {
    console.warn(`[DEPRECATION] Feature toggling is deprecated. ${feature} is managed automatically.`);
    return false;
  }
  
  getAllFeatures() {
    return { ...this.features };
  }
  
  loadSettings() {
    // No-op for backward compatibility
  }
  
  saveSettings() {
    // No-op for backward compatibility
  }
}

/**
 * Legacy monitor wrapper
 */
class LegacyMonitorWrapper {
  constructor() {
    this.metrics = {
      xssAttempts: 0,
      rateLimitHits: 0,
      invalidInputs: 0,
      errors: 0
    };
    this.alerts = [];
    
    console.warn(
      '[DEPRECATION WARNING] ClientSideSecurityHealthMonitor is deprecated. ' +
      'Use performSecurityHealthCheck() from security-core.js'
    );
  }
  
  recordEvent(eventType, details = {}) {
    if (this.metrics.hasOwnProperty(eventType)) {
      this.metrics[eventType]++;
    }
    
    // Forward to new logging system
    console.log('[Security]', JSON.stringify({
      timestamp: new Date().toISOString(),
      event: eventType,
      details,
      source: 'LegacyMonitor'
    }));
  }
  
  getHealthStatus() {
    // Return simplified health status for backward compatibility
    return {
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(-5),
      timestamp: Date.now(),
      healthy: this.alerts.length === 0
    };
  }
  
  reset() {
    this.metrics = {
      xssAttempts: 0,
      rateLimitHits: 0,
      invalidInputs: 0,
      errors: 0
    };
    this.alerts = [];
  }
}

/**
 * Migration utilities
 */
export const MigrationUtils = {
  /**
   * Check if legacy globals are being used
   */
  detectLegacyUsage() {
    const legacyGlobals = [
      'LightweightSecurityCore',
      'StaticHostingSecurityToggle',
      'ClientSideSecurityHealthMonitor'
    ];
    
    const usage = {};
    legacyGlobals.forEach(global => {
      usage[global] = typeof window[global] !== 'undefined';
    });
    
    return usage;
  },
  
  /**
   * Generate migration guide for current usage
   */
  generateMigrationGuide() {
    const usage = this.detectLegacyUsage();
    const guide = {
      hasLegacyUsage: Object.values(usage).some(Boolean),
      recommendations: []
    };
    
    if (usage.LightweightSecurityCore) {
      guide.recommendations.push({
        from: 'LightweightSecurityCore.validateInput()',
        to: 'import { validateInput } from "./security-core.js"',
        example: 'const result = validateInput(userInput);'
      });
      
      guide.recommendations.push({
        from: 'LightweightSecurityCore.escapeHtml()',
        to: 'import { escapeHtml } from "./security-core.js"',
        example: 'const safe = escapeHtml(userContent);'
      });
    }
    
    if (usage.StaticHostingSecurityToggle) {
      guide.recommendations.push({
        from: 'StaticHostingSecurityToggle feature management',
        to: 'Automatic security feature management',
        example: 'Security features are now enabled automatically'
      });
    }
    
    if (usage.ClientSideSecurityHealthMonitor) {
      guide.recommendations.push({
        from: 'ClientSideSecurityHealthMonitor.getHealthStatus()',
        to: 'import { performSecurityHealthCheck } from "./security-core.js"',
        example: 'const health = performSecurityHealthCheck();'
      });
    }
    
    return guide;
  },
  
  /**
   * Perform automated migration (where possible)
   */
  async performAutomatedMigration() {
    const results = {
      success: false,
      steps: [],
      warnings: [],
      errors: []
    };
    
    try {
      // Initialize new security system
      const initResult = await initializeSecurity();
      if (initResult.success) {
        results.steps.push('✅ New security system initialized');
      } else {
        results.errors.push('❌ Failed to initialize new security system');
        return results;
      }
      
      // Check for data migration needs
      const storageStats = await this.checkStorageMigration();
      if (storageStats.needsMigration) {
        results.warnings.push('⚠️ Storage data migration may be required');
      }
      
      // Verify functionality
      const healthCheck = performSecurityHealthCheck();
      if (healthCheck.status === 'healthy') {
        results.steps.push('✅ Security health check passed');
      } else {
        results.warnings.push(`⚠️ Health check status: ${healthCheck.status}`);
      }
      
      results.success = true;
      results.steps.push('✅ Migration completed successfully');
      
    } catch (error) {
      results.errors.push(`❌ Migration failed: ${error.message}`);
    }
    
    return results;
  },
  
  /**
   * Check if storage migration is needed
   */
  async checkStorageMigration() {
    try {
      // Check for old storage keys
      const oldKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('pwa_secure_')) {
          // This might be old format data
          oldKeys.push(key);
        }
      }
      
      return {
        needsMigration: oldKeys.length > 0,
        oldKeys: oldKeys.slice(0, 10), // Limit for logging
        totalOldKeys: oldKeys.length
      };
    } catch (error) {
      return {
        needsMigration: false,
        error: error.message
      };
    }
  }
};

/**
 * Setup legacy compatibility layer
 */
export function setupLegacyCompatibility() {
  // Only setup if not already present
  if (!window.LightweightSecurityCore) {
    window.LightweightSecurityCore = LegacySecurityWrapper;
  }
  
  if (!window.StaticHostingSecurityToggle) {
    window.StaticHostingSecurityToggle = LegacyToggleWrapper;
  }
  
  if (!window.ClientSideSecurityHealthMonitor) {
    window.ClientSideSecurityHealthMonitor = LegacyMonitorWrapper;
  }
  
  // Add migration helper to window for easy access
  window.SecurityMigrationUtils = MigrationUtils;
  
  console.log(
    '[Migration Helper] Legacy compatibility layer activated. ' +
    'Use SecurityMigrationUtils.generateMigrationGuide() for migration assistance.'
  );
}

/**
 * Remove legacy compatibility (for clean migration)
 */
export function removeLegacyCompatibility() {
  delete window.LightweightSecurityCore;
  delete window.StaticHostingSecurityToggle;
  delete window.ClientSideSecurityHealthMonitor;
  delete window.SecurityMigrationUtils;
  
  console.log('[Migration Helper] Legacy compatibility layer removed.');
}

// Auto-setup legacy compatibility if needed
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Check if legacy globals are expected
    const hasLegacyReferences = document.body.innerHTML.includes('LightweightSecurityCore') ||
                               document.body.innerHTML.includes('StaticHostingSecurityToggle') ||
                               document.body.innerHTML.includes('ClientSideSecurityHealthMonitor');
    
    if (hasLegacyReferences) {
      setupLegacyCompatibility();
    }
  });
}