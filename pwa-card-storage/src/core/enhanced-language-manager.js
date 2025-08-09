/**
 * Enhanced Language Manager
 * Extends existing LanguageManager with unified translation support and security component integration
 * Maintains backward compatibility while adding new unified language management capabilities
 */

// Import SecureLogger for CWE-117 protection
import { SecureLogger } from '../security/secure-logger.js';

class EnhancedLanguageManager {
  constructor(existingLanguageManager = null) {
    // Use existing language manager if provided, otherwise create basic state
    this.baseManager = existingLanguageManager || {
      currentLanguage: this.detectBrowserLanguage(),
      translations: new Map()
    };
    
    this.translationRegistry = null;
    this.unifiedObserver = null;
    this.isUpdating = false;
    this.updateQueue = [];
    this.initialized = false;
    this.secureLogger = new SecureLogger({ logLevel: 'INFO', enableMasking: true });

    // Inherit performance components from base manager if available
    this.performanceCollector = this.baseManager?.performanceCollector || null;
    this.smartCache = this.baseManager?.smartCache || null;
    this.domUpdater = this.baseManager?.domUpdater || null;
  }

  /**
   * Initialize enhanced language manager
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize translation registry
      const TranslationRegistry = window.TranslationRegistry || require('./translation-registry.js');
      this.translationRegistry = new TranslationRegistry();
      await this.translationRegistry.initialize();

      // Initialize unified observer
      const UnifiedLanguageObserver = window.UnifiedLanguageObserver || require('./unified-language-observer.js');
      this.unifiedObserver = new UnifiedLanguageObserver();

      // Initialize accessibility language manager
      const AccessibilityLanguageManager = window.AccessibilityLanguageManager || require('./accessibility-language-manager.js');
      this.accessibilityManager = new AccessibilityLanguageManager();
      await this.accessibilityManager.initialize(this.translationRegistry);

      // Initialize security components adapter
      const SecurityComponentsLanguageAdapter = window.SecurityComponentsLanguageAdapter || require('./security-components-language-adapter.js');
      this.securityAdapter = new SecurityComponentsLanguageAdapter();
      await this.securityAdapter.initialize();

      // Initialize PWA UI adapter
      const PWAUILanguageAdapter = window.PWAUILanguageAdapter || require('./pwa-ui-language-adapter.js');
      this.pwaAdapter = new PWAUILanguageAdapter();
      await this.pwaAdapter.initialize();

      // Register adapters with unified observer
      this.registerAdapters();
      
      // Initialize performance optimizer (LANG-12)
      this.initializePerformanceOptimizer();

      this.initialized = true;
      this.secureLogger.info('Initialized successfully with adapters and accessibility manager', { 
        component: 'EnhancedLanguageManager' 
      });
    } catch (error) {
      this.secureLogger.error('Initialization failed', { 
        error: error.message, 
        component: 'EnhancedLanguageManager' 
      });
      throw error;
    }
  }

  /**
   * Detect browser language preference
   */
  detectBrowserLanguage() {
    const savedLang = localStorage.getItem('pwa-language');
    if (savedLang && ['zh', 'en'].includes(savedLang)) {
      return savedLang;
    }
    
    const userLang = (navigator.language || navigator.userLanguage || navigator.browserLanguage || '').toLowerCase();
    return /^en(-[a-z]{2})?$/.test(userLang) ? 'en' : 'zh';
  }

  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.baseManager.currentLanguage;
  }

  /**
   * Enhanced language switching with unified observer support
   * @param {string} lang - Target language code
   * @returns {Promise<string>} Switched language code
   */
  async switchLanguage(lang) {
    if (!['zh', 'en'].includes(lang)) {
      this.secureLogger.warn('Invalid language code provided', { 
        invalidLanguage: lang, 
        component: 'EnhancedLanguageManager' 
      });
      return this.baseManager.currentLanguage;
    }

    if (this.isUpdating) {
      this.secureLogger.info('Language update in progress, queuing request', { 
        requestedLanguage: lang, 
        component: 'EnhancedLanguageManager' 
      });
      return this.queueLanguageUpdate(lang);
    }

    this.isUpdating = true;
    const previousLanguage = this.baseManager.currentLanguage;
    const startTime = performance.now(); // LANG-12: Performance tracking

    try {
      // 1. Update core language state
      this.baseManager.currentLanguage = lang;
      document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
      localStorage.setItem('pwa-language', lang);

      // 2. Update accessibility attributes
      if (this.accessibilityManager) {
        await this.accessibilityManager.updateAccessibilityAttributes(lang);
      }

      // 3. Notify unified observer if available
      if (this.unifiedObserver) {
        await this.unifiedObserver.notifyAllObservers(lang, previousLanguage);
      }

      // 4. Update base manager UI if it exists
      if (this.baseManager.updateAllUIElements) {
        this.baseManager.updateAllUIElements();
      }

      // 5. Notify base manager observers if they exist
      if (this.baseManager.notifyObservers) {
        this.baseManager.notifyObservers(lang);
      }

      // 6. Process queued updates
      await this.processUpdateQueue();

      // LANG-12: Record performance metrics
      const duration = performance.now() - startTime;
      this.recordLanguageSwitchPerformance(duration);

      this.secureLogger.info('Language switched successfully', { 
        previousLanguage, 
        newLanguage: lang, 
        duration: duration.toFixed(2) + 'ms', 
        component: 'EnhancedLanguageManager' 
      });
      return lang;

    } catch (error) {
      this.secureLogger.error('Language switch failed', { 
        targetLanguage: lang, 
        previousLanguage, 
        error: error.message, 
        component: 'EnhancedLanguageManager' 
      });
      
      // Rollback to previous language
      this.baseManager.currentLanguage = previousLanguage;
      document.documentElement.lang = previousLanguage === 'zh' ? 'zh-TW' : 'en';
      
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Toggle language (Chinese <-> English)
   * @returns {Promise<string>} New language code
   */
  async toggleLanguage() {
    const newLang = this.baseManager.currentLanguage === 'zh' ? 'en' : 'zh';
    return this.switchLanguage(newLang);
  }

  /**
   * Get unified translation text with dot notation support
   * @param {string} key - Translation key with dot notation
   * @param {string} lang - Language code (optional, uses current language if not provided)
   * @returns {string|Array|Object} Translation value
   */
  getUnifiedText(key, lang = null) {
    const targetLang = lang || this.baseManager.currentLanguage;
    
    if (!this.translationRegistry) {
      console.warn('[EnhancedLanguageManager] Translation registry not initialized');
      return key;
    }

    try {
      return this.translationRegistry.getTranslation(targetLang, key);
    } catch (error) {
      console.error('[EnhancedLanguageManager] Translation retrieval failed:', error);
      return key;
    }
  }

  /**
   * Get text using base manager (backward compatibility)
   * @param {string} key - Translation key
   * @param {string} lang - Language code
   * @returns {string} Translation text
   */
  getText(key, lang = null, options = {}) {
    // Enhanced security validation and sanitization
    if (typeof key !== 'string' || key.trim() === '') {
      console.warn('[EnhancedLanguageManager] Invalid translation key:', key);
      return options.fallback || key || '';
    }

    // Sanitize key for security
    const sanitizedKey = key.replace(/[<>\"'&]/g, '').trim();
    
    // Try unified text first with security options
    if (this.translationRegistry) {
      try {
        const unifiedText = this.getUnifiedText(`pwa.${sanitizedKey}`, lang, options);
        if (unifiedText !== `pwa.${sanitizedKey}`) {
          return unifiedText;
        }
      } catch (error) {
        console.error('[EnhancedLanguageManager] Unified text retrieval error:', error);
      }
    }

    // Fallback to base manager with enhanced options
    if (this.baseManager.getText) {
      return this.baseManager.getText(sanitizedKey, lang, options);
    }

    return options.fallback || sanitizedKey;
  }

  /**
   * Register language observer with unified observer
   * @param {string} id - Observer ID
   * @param {Object} observer - Observer configuration
   */
  registerObserver(id, observer) {
    if (!this.unifiedObserver) {
      console.warn('[EnhancedLanguageManager] Unified observer not initialized');
      return;
    }

    this.unifiedObserver.registerObserver(id, observer);
  }

  /**
   * Unregister language observer
   * @param {string} id - Observer ID
   */
  unregisterObserver(id) {
    if (!this.unifiedObserver) {
      console.warn('[EnhancedLanguageManager] Unified observer not initialized');
      return;
    }

    this.unifiedObserver.unregisterObserver(id);
  }

  /**
   * Add observer to base manager (backward compatibility)
   * @param {Function} callback - Observer callback
   */
  addObserver(callback) {
    if (this.baseManager.addObserver) {
      this.baseManager.addObserver(callback);
    }
  }

  /**
   * Remove observer from base manager (backward compatibility)
   * @param {Function} callback - Observer callback
   */
  removeObserver(callback) {
    if (this.baseManager.removeObserver) {
      this.baseManager.removeObserver(callback);
    }
  }

  /**
   * Queue language update request
   * @param {string} lang - Target language
   * @returns {Promise<string>} Promise that resolves with language code
   */
  async queueLanguageUpdate(lang) {
    return new Promise((resolve) => {
      this.updateQueue.push({
        language: lang,
        resolve: resolve,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Process queued update requests
   */
  async processUpdateQueue() {
    while (this.updateQueue.length > 0) {
      const request = this.updateQueue.shift();
      if (request.language !== this.baseManager.currentLanguage) {
        // Recursively process different language requests
        await this.switchLanguage(request.language);
      }
      request.resolve(this.baseManager.currentLanguage);
    }
  }

  /**
   * Get notification message (backward compatibility)
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {string} Localized message
   */
  getNotificationMessage(type, data = {}) {
    if (this.baseManager.getNotificationMessage) {
      return this.baseManager.getNotificationMessage(type, data);
    }
    return type;
  }

  /**
   * Get system status
   * @returns {Object} System status
   */
  getStatus() {
    return {
      currentLanguage: this.baseManager.currentLanguage,
      initialized: this.initialized,
      isUpdating: this.isUpdating,
      queuedUpdates: this.updateQueue.length,
      translationRegistry: this.translationRegistry ? this.translationRegistry.getCacheStats() : null,
      unifiedObserver: this.unifiedObserver ? this.unifiedObserver.getObserverStatus() : null,
      accessibilityManager: this.accessibilityManager ? this.accessibilityManager.getAccessibilityStatus() : null,
      performanceOptimizer: this.performanceOptimizer ? this.getPerformanceReport() : null
    };
  }

  /**
   * Validate translation completeness
   * @returns {Object} Validation report
   */
  validateTranslations() {
    if (!this.translationRegistry) {
      return { valid: false, error: 'Translation registry not initialized' };
    }
    
    return this.translationRegistry.validateTranslations();
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    if (this.translationRegistry) {
      this.translationRegistry.clearCache();
    }
  }

  /**
   * Initialize with existing language manager
   * @param {Object} existingManager - Existing language manager instance
   */
  static async createFromExisting(existingManager) {
    const enhanced = new EnhancedLanguageManager(existingManager);
    await enhanced.initialize();
    return enhanced;
  }

  /**
   * Register adapters with unified observer
   */
  registerAdapters() {
    if (!this.unifiedObserver) return;

    // Register accessibility manager (highest priority)
    if (this.accessibilityManager) {
      this.unifiedObserver.registerObserver('accessibility', {
        id: 'accessibility',
        priority: 9,
        updateMethod: async (newLanguage, previousLanguage) => {
          await this.accessibilityManager.updateAccessibilityAttributes(newLanguage);
        },
        dependencies: []
      });
    }

    // Register security components adapter
    if (this.securityAdapter) {
      this.unifiedObserver.registerObserver('security-components', {
        id: 'security-components',
        priority: 8,
        updateMethod: async (newLanguage, previousLanguage) => {
          await this.securityAdapter.updateSecurityComponents(newLanguage, previousLanguage);
        },
        dependencies: ['accessibility']
      });
    }

    // Register PWA UI adapter
    if (this.pwaAdapter) {
      this.unifiedObserver.registerObserver('pwa-ui', {
        id: 'pwa-ui',
        priority: 7,
        updateMethod: async (newLanguage, previousLanguage) => {
          await this.pwaAdapter.updatePWAComponents(newLanguage, previousLanguage);
        },
        dependencies: ['accessibility']
      });
    }
  }

  /**
   * Initialize performance optimizer (LANG-12)
   * Gracefully handles missing PerformanceOptimizer dependency
   */
  initializePerformanceOptimizer() {
    try {
      const PerformanceOptimizer = window.PerformanceOptimizer;
      if (PerformanceOptimizer) {
        this.performanceOptimizer = new PerformanceOptimizer();
        this.performanceOptimizer.initialize(this);
        console.log('🚀 Performance Optimizer integrated');
      } else {
        // Create lightweight fallback performance tracker
        this.performanceOptimizer = this.createFallbackPerformanceTracker();
        console.log('📊 Using fallback performance tracker');
      }
    } catch (error) {
      console.warn('Performance Optimizer initialization failed, using fallback:', error);
      this.performanceOptimizer = this.createFallbackPerformanceTracker();
    }
  }

  /**
   * Create fallback performance tracker when PerformanceOptimizer is not available
   */
  createFallbackPerformanceTracker() {
    return {
      initialized: true,
      metrics: {
        languageSwitchTimes: [],
        averageSwitchTime: 0,
        totalSwitches: 0
      },
      
      initialize: () => {
        console.log('Fallback performance tracker initialized');
      },
      
      recordLanguageSwitchTime: (duration) => {
        this.performanceOptimizer.metrics.languageSwitchTimes.push(duration);
        this.performanceOptimizer.metrics.totalSwitches++;
        
        // Keep only last 10 measurements
        if (this.performanceOptimizer.metrics.languageSwitchTimes.length > 10) {
          this.performanceOptimizer.metrics.languageSwitchTimes.shift();
        }
        
        // Calculate average
        const times = this.performanceOptimizer.metrics.languageSwitchTimes;
        this.performanceOptimizer.metrics.averageSwitchTime = 
          times.reduce((sum, time) => sum + time, 0) / times.length;
      },
      
      getPerformanceReport: () => {
        return {
          type: 'fallback',
          metrics: this.performanceOptimizer.metrics,
          recommendations: this.generatePerformanceRecommendations()
        };
      },
      
      cleanup: () => {
        this.performanceOptimizer.metrics = {
          languageSwitchTimes: [],
          averageSwitchTime: 0,
          totalSwitches: 0
        };
      }
    };
  }

  /**
   * Generate performance recommendations based on metrics
   */
  generatePerformanceRecommendations() {
    const metrics = this.performanceOptimizer?.metrics;
    if (!metrics) return [];
    
    const recommendations = [];
    
    if (metrics.averageSwitchTime > 500) {
      recommendations.push({
        type: 'warning',
        message: 'Language switching is slower than recommended (>500ms)',
        suggestion: 'Consider reducing the number of UI components or optimizing update methods'
      });
    }
    
    if (metrics.totalSwitches > 50) {
      recommendations.push({
        type: 'info',
        message: 'High language switching activity detected',
        suggestion: 'Consider implementing caching for frequently accessed translations'
      });
    }
    
    return recommendations;
  }

  /**
   * Get performance report (LANG-12)
   */
  getPerformanceReport() {
    if (this.performanceOptimizer) {
      return this.performanceOptimizer.getPerformanceReport();
    }
    return {
      type: 'unavailable',
      message: 'Performance optimizer not available'
    };
  }

  /**
   * Record language switch performance (LANG-12)
   */
  recordLanguageSwitchPerformance(duration) {
    if (this.performanceOptimizer && this.performanceOptimizer.recordLanguageSwitchTime) {
      this.performanceOptimizer.recordLanguageSwitchTime(duration);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.performanceOptimizer) {
      this.performanceOptimizer.cleanup();
      this.performanceOptimizer = null;
    }
    
    if (this.unifiedObserver) {
      this.unifiedObserver.clearAllObservers();
    }
    
    if (this.translationRegistry) {
      this.translationRegistry.clearCache();
    }

    if (this.accessibilityManager) {
      this.accessibilityManager.cleanup();
    }

    if (this.securityAdapter) {
      this.securityAdapter.cleanup();
    }

    if (this.pwaAdapter) {
      this.pwaAdapter.cleanup();
    }
    
    this.updateQueue.length = 0;
    this.initialized = false;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedLanguageManager;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
  window.EnhancedLanguageManager = EnhancedLanguageManager;
}