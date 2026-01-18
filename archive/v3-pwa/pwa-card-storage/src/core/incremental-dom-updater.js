/**
 * Incremental DOM Updater
 * Smart incremental updates for language switching instead of full page reloads
 * Optimized for static hosting with accessibility support
 * 
 * @version 3.2.1-security-enhanced
 * @security Fixed CWE-94 code injection vulnerability
 */

// Import security modules for CWE-94 protection
let CodeInjectionProtection;
try {
  if (typeof require !== 'undefined') {
    ({ CodeInjectionProtection } = require('../security/code-injection-protection.js'));
  } else if (typeof window !== 'undefined') {
    CodeInjectionProtection = window.CodeInjectionProtection;
  }
} catch (error) {
  console.warn('[IncrementalDOMUpdater] Security modules not available, using fallback protection');
}

class IncrementalDOMUpdater {
  constructor(config = {}) {
    this.config = {
      batchUpdateDelay: config.batchUpdateDelay || 16, // 1 frame at 60fps
      maxBatchSize: config.maxBatchSize || 50, // Max elements per batch
      enableAccessibility: config.enableAccessibility !== false,
      enableAnimations: config.enableAnimations !== false,
      trackChanges: config.trackChanges !== false,
      updateTimeout: config.updateTimeout || 100, // ms SLA for updates
      ...config
    };
    
    // Initialize code injection protection
    this.codeInjectionProtection = CodeInjectionProtection ? new CodeInjectionProtection() : null;

    this.pendingUpdates = new Map();
    this.updateQueue = [];
    this.batchTimer = null;
    this.performanceCollector = null;
    this.lastTranslations = new Map();
    this.changedKeys = new Set();
    this.updateInProgress = false;
    
    // Track DOM elements and their translation keys
    this.elementRegistry = new WeakMap();
    this.keyToElements = new Map();
    
    this.initializeObserver();
  }

  /**
   * Set performance collector for metrics
   */
  setPerformanceCollector(collector) {
    this.performanceCollector = collector;
  }

  /**
   * Initialize mutation observer for tracking DOM changes
   */
  initializeObserver() {
    if (!window.MutationObserver) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      this.processMutations(mutations);
    });

    // Start observing after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.startObserving();
      });
    } else {
      this.startObserving();
    }
  }

  /**
   * Start observing DOM changes
   */
  startObserving() {
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-i18n', 'data-i18n-attr', 'aria-label', 'title', 'placeholder']
    });
  }

  /**
   * Process DOM mutations to track translation elements
   */
  processMutations(mutations) {
    if (this.updateInProgress) return; // Skip during our own updates

    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.registerTranslationElements(node);
          }
        });

        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.unregisterTranslationElements(node);
          }
        });
      }
    });
  }

  /**
   * Register translation elements in the registry
   */
  registerTranslationElements(element) {
    // Register self if it has translation key
    const i18nKey = element.getAttribute('data-i18n');
    if (i18nKey) {
      this.registerElement(element, i18nKey);
    }

    // Register children with translation keys
    const translationElements = element.querySelectorAll('[data-i18n]');
    translationElements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        this.registerElement(el, key);
      }
    });
  }

  /**
   * Unregister translation elements from the registry
   */
  unregisterTranslationElements(element) {
    // Unregister self
    this.unregisterElement(element);

    // Unregister children
    const translationElements = element.querySelectorAll('[data-i18n]');
    translationElements.forEach(el => {
      this.unregisterElement(el);
    });
  }

  /**
   * Register a single element with its translation key
   */
  registerElement(element, key) {
    this.elementRegistry.set(element, key);
    
    if (!this.keyToElements.has(key)) {
      this.keyToElements.set(key, new Set());
    }
    this.keyToElements.get(key).add(element);
  }

  /**
   * Unregister a single element
   */
  unregisterElement(element) {
    const key = this.elementRegistry.get(element);
    if (key && this.keyToElements.has(key)) {
      this.keyToElements.get(key).delete(element);
      if (this.keyToElements.get(key).size === 0) {
        this.keyToElements.delete(key);
      }
    }
    this.elementRegistry.delete(element);
  }

  /**
   * Update translations incrementally
   */
  async updateTranslations(newTranslations, fromLanguage, toLanguage) {
    const startTime = performance.now();
    
    try {
      this.updateInProgress = true;

      // Find changed translation keys
      const changedKeys = this.findChangedKeys(newTranslations);
      this.changedKeys = new Set([...this.changedKeys, ...changedKeys]);

      // Batch update elements
      const updateResults = await this.batchUpdateElements(newTranslations, changedKeys);
      
      // Update stored translations
      this.lastTranslations = new Map(Object.entries(newTranslations));
      
      const duration = performance.now() - startTime;
      
      // Record performance metrics
      if (this.performanceCollector) {
        this.performanceCollector.recordDOMUpdateMetric(
          updateResults.updatedElementCount,
          duration,
          `language-switch-${fromLanguage}-${toLanguage}`
        );
      }

      // Announce changes for accessibility
      if (this.config.enableAccessibility) {
        this.announceLanguageChange(fromLanguage, toLanguage, updateResults.updatedElementCount);
      }

      return {
        success: true,
        duration,
        changedKeys: changedKeys.length,
        updatedElements: updateResults.updatedElementCount,
        batches: updateResults.batchCount,
        meetsSLA: duration <= this.config.updateTimeout
      };

    } catch (error) {
      console.error('[IncrementalDOMUpdater] Update failed:', error);
      return {
        success: false,
        error: error.message,
        duration: performance.now() - startTime
      };
    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Find translation keys that have changed
   */
  findChangedKeys(newTranslations) {
    const changedKeys = [];
    
    Object.entries(newTranslations).forEach(([key, value]) => {
      const oldValue = this.lastTranslations.get(key);
      if (oldValue !== value) {
        changedKeys.push(key);
      }
    });

    return changedKeys;
  }

  /**
   * Batch update DOM elements
   */
  async batchUpdateElements(translations, changedKeys) {
    const elementsToUpdate = [];
    
    // Collect elements that need updates
    changedKeys.forEach(key => {
      const elements = this.keyToElements.get(key);
      if (elements) {
        elements.forEach(element => {
          if (document.contains(element)) { // Element still in DOM
            elementsToUpdate.push({ element, key, value: translations[key] });
          }
        });
      }
    });

    return this.processBatchedUpdates(elementsToUpdate);
  }

  /**
   * Process batched DOM updates
   */
  async processBatchedUpdates(updates) {
    let updatedElementCount = 0;
    let batchCount = 0;

    // Split updates into batches
    for (let i = 0; i < updates.length; i += this.config.maxBatchSize) {
      const batch = updates.slice(i, i + this.config.maxBatchSize);
      
      await new Promise(resolve => {
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
          this.processBatch(batch);
          updatedElementCount += batch.length;
          batchCount++;
          resolve();
        });
      });

      // Small delay between batches to prevent blocking
      if (i + this.config.maxBatchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, this.config.batchUpdateDelay));
      }
    }

    return { updatedElementCount, batchCount };
  }

  /**
   * Process a single batch of updates
   */
  processBatch(batch) {
    // Group updates by element type for better performance
    const textUpdates = [];
    const attributeUpdates = [];

    batch.forEach(({ element, key, value }) => {
      if (!value) return;

      const updateType = this.determineUpdateType(element);
      
      if (updateType === 'text') {
        textUpdates.push({ element, value });
      } else if (updateType === 'attribute') {
        attributeUpdates.push({ element, key, value });
      }
    });

    // Process text updates
    textUpdates.forEach(({ element, value }) => {
      this.updateElementText(element, value);
    });

    // Process attribute updates
    attributeUpdates.forEach(({ element, key, value }) => {
      this.updateElementAttributes(element, key, value);
    });
  }

  /**
   * Determine how to update an element
   */
  determineUpdateType(element) {
    const attrInfo = element.getAttribute('data-i18n-attr');
    return attrInfo ? 'attribute' : 'text';
  }

  /**
   * Update element text content
   */
  updateElementText(element, value) {
    if (this.config.enableAnimations) {
      this.animateTextChange(element, value);
    } else {
      element.textContent = value;
    }
  }

  /**
   * Update element attributes - SEC-002: 代碼注入防護增強版 + CWE-94 防護
   */
  updateElementAttributes(element, key, value) {
    const attrInfo = element.getAttribute('data-i18n-attr');
    if (!attrInfo) return;

    try {
      // SEC-002: 使用 CodeInjectionProtection 進行安全 JSON 解析
      let attributes;
      if (this.codeInjectionProtection) {
        attributes = this.codeInjectionProtection.safeJSONParse(attrInfo, {
          allowedKeys: ['title', 'alt', 'aria-label', 'aria-describedby', 'placeholder', 'data-tooltip', 'lang'],
          maxDepth: 2,
          preventPrototypePollution: true
        });
      } else {
        // 備用安全解析
        attributes = this.fallbackSafeJSONParse(attrInfo);
      }
      
      if (!attributes || typeof attributes !== 'object') {
        console.warn('[IncrementalDOMUpdater] Invalid attribute configuration');
        return;
      }
      
      // SEC-002: 屬性名稱白名單驗證
      const allowedAttributes = [
        'title', 'alt', 'aria-label', 'aria-describedby', 
        'placeholder', 'data-tooltip', 'lang'
      ];
      
      Object.entries(attributes).forEach(([attrName, translationKey]) => {
        if (translationKey === key) {
          // 驗證屬性名稱是否在白名單中
          if (allowedAttributes.includes(attrName)) {
            // 使用 CodeInjectionProtection 清理屬性值
            const sanitizedValue = this.sanitizeAttributeValue(value);
            element.setAttribute(attrName, sanitizedValue);
          } else {
            console.warn(`[IncrementalDOMUpdater] Blocked unsafe attribute: ${attrName}`);
          }
        }
      });
    } catch (error) {
      console.warn('[IncrementalDOMUpdater] Failed to parse attribute info:', attrInfo, error.message);
    }
  }

  /**
   * 備用安全 JSON 解析 - CWE-94 防護
   */
  fallbackSafeJSONParse(jsonString) {
    try {
      return JSON.parse(jsonString, (parseKey, parseValue) => {
        // 阻止危險的屬性名稱
        if (parseKey === '__proto__' || parseKey === 'constructor' || parseKey === 'prototype') {
          return undefined;
        }
        
        // 阻止函數字串和事件處理器
        if (typeof parseValue === 'string' && (
          parseValue.includes('javascript:') ||
          parseValue.includes('data:') ||
          parseValue.includes('vbscript:') ||
          parseValue.startsWith('on') || // 事件處理器
          parseValue.includes('function(') ||
          parseValue.includes('eval(') ||
          parseValue.includes('Function(') ||
          parseValue.includes('setTimeout(') ||
          parseValue.includes('setInterval(')
        )) {
          return '[BLOCKED]';
        }
        
        return parseValue;
      });
    } catch (error) {
      console.warn('[IncrementalDOMUpdater] JSON parse failed:', error.message);
      return null;
    }
  }

  /**
   * 安全清理屬性值 - CWE-94 防護
   */
  sanitizeAttributeValue(value) {
    if (this.codeInjectionProtection) {
      return this.codeInjectionProtection.sanitizeInput(String(value), {
        allowHTML: false,
        maxLength: 500
      });
    } else {
      // 備用清理
      return String(value)
        .replace(/[<>"'&]/g, (match) => {
          const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
          return entities[match] || match;
        })
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        .substring(0, 500);
    }
  }

  /**
   * Animate text change for better UX
   */
  animateTextChange(element, newValue) {
    const originalText = element.textContent;
    
    if (originalText === newValue) return;

    // Fade out
    element.style.transition = 'opacity 0.15s ease-out';
    element.style.opacity = '0.5';
    
    setTimeout(() => {
      element.textContent = newValue;
      element.style.opacity = '1';
      
      // Clean up after animation
      setTimeout(() => {
        element.style.transition = '';
        element.style.opacity = '';
      }, 150);
    }, 75);
  }

  /**
   * Announce language change for accessibility
   */
  announceLanguageChange(fromLanguage, toLanguage, elementCount) {
    // Create or update ARIA live region
    let announcer = document.getElementById('language-change-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'language-change-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(announcer);
    }

    // Announce the change
    const message = `Language changed from ${fromLanguage} to ${toLanguage}. ${elementCount} elements updated.`;
    announcer.textContent = message;

    // Clear announcement after a delay
    setTimeout(() => {
      announcer.textContent = '';
    }, 3000);
  }

  /**
   * Force scan and register all translation elements
   */
  scanAndRegisterAll() {
    // Clear existing registry
    this.keyToElements.clear();
    
    // Scan all elements with data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        this.registerElement(element, key);
      }
    });

    return elements.length;
  }

  /**
   * Get update statistics
   */
  getStatistics() {
    return {
      registeredKeys: this.keyToElements.size,
      totalElements: Array.from(this.keyToElements.values()).reduce((sum, set) => sum + set.size, 0),
      changedKeysInLastUpdate: this.changedKeys.size,
      updateInProgress: this.updateInProgress
    };
  }

  /**
   * Get elements by translation key
   */
  getElementsByKey(key) {
    return Array.from(this.keyToElements.get(key) || []);
  }

  /**
   * Check if element has translation key
   */
  hasTranslationKey(element, key) {
    return this.elementRegistry.get(element) === key;
  }

  /**
   * Clear changed keys tracking
   */
  clearChangedKeys() {
    this.changedKeys.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Clear registries
    this.keyToElements.clear();
    this.lastTranslations.clear();
    this.changedKeys.clear();

    // Remove accessibility announcer
    const announcer = document.getElementById('language-change-announcer');
    if (announcer) {
      announcer.remove();
    }
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export for both CommonJS and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IncrementalDOMUpdater;
} else {
  window.IncrementalDOMUpdater = IncrementalDOMUpdater;
}