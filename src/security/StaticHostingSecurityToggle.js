/**
 * Static Hosting Security Feature Toggle System
 * Client-side feature management using localStorage for GitHub Pages/Cloudflare Pages
 */

class StaticHostingSecurityToggle {
  constructor() {
    this.storageKey = 'db-card-security-features';
    this.defaults = {
      webauthn: { enabled: false, fallback: 'pin-auth' },
      encryption: { enabled: false, fallback: 'plain-storage' },
      monitoring: { enabled: false, fallback: 'basic-logging' },
      inputValidation: { enabled: true, fallback: 'basic-validation' },
      csp: { enabled: false, fallback: 'basic-headers' }
    };
    this.observers = new Set();
  }

  /**
   * Check if a security feature is enabled
   */
  isEnabled(feature) {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const features = stored ? JSON.parse(stored) : this.defaults;
      return features[feature]?.enabled || false;
    } catch (error) {
      console.warn('[SecurityToggle] Failed to check feature status:', error);
      return this.defaults[feature]?.enabled || false;
    }
  }

  /**
   * Toggle a security feature on/off
   */
  toggle(feature, enabled, options = {}) {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const features = stored ? JSON.parse(stored) : { ...this.defaults };
      
      if (!features[feature]) {
        features[feature] = { ...this.defaults[feature] };
      }
      
      features[feature].enabled = enabled;
      features[feature].lastToggled = Date.now();
      
      if (options.reason) {
        features[feature].reason = options.reason;
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(features));
      
      // Notify observers
      this.notifyObservers(feature, enabled);
      
      // Auto-reload for static hosting if requested
      if (options.autoReload !== false) {
        setTimeout(() => window.location.reload(), 100);
      }
      
      return true;
    } catch (error) {
      console.error('[SecurityToggle] Failed to toggle feature:', error);
      return false;
    }
  }

  /**
   * Get all feature statuses
   */
  getAllFeatures() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const features = stored ? JSON.parse(stored) : { ...this.defaults };
      
      return Object.keys(this.defaults).reduce((result, feature) => {
        result[feature] = {
          enabled: features[feature]?.enabled || false,
          fallback: features[feature]?.fallback || this.defaults[feature].fallback,
          lastToggled: features[feature]?.lastToggled || null
        };
        return result;
      }, {});
    } catch (error) {
      console.error('[SecurityToggle] Failed to get all features:', error);
      return this.defaults;
    }
  }

  /**
   * Reset all features to defaults
   */
  resetToDefaults() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.defaults));
      this.notifyObservers('*', 'reset');
      return true;
    } catch (error) {
      console.error('[SecurityToggle] Failed to reset features:', error);
      return false;
    }
  }

  /**
   * Add observer for feature changes
   */
  addObserver(callback) {
    this.observers.add(callback);
  }

  /**
   * Remove observer
   */
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  /**
   * Notify all observers of feature changes
   */
  notifyObservers(feature, enabled) {
    this.observers.forEach(callback => {
      try {
        callback(feature, enabled);
      } catch (error) {
        console.warn('[SecurityToggle] Observer callback failed:', error);
      }
    });
  }

  /**
   * Get feature configuration for debugging
   */
  getDebugInfo() {
    return {
      storageKey: this.storageKey,
      features: this.getAllFeatures(),
      observerCount: this.observers.size,
      storageSize: localStorage.getItem(this.storageKey)?.length || 0
    };
  }
}

// Export for static hosting
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StaticHostingSecurityToggle;
} else if (typeof window !== 'undefined') {
  window.StaticHostingSecurityToggle = StaticHostingSecurityToggle;
}