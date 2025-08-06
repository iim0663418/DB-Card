/**
 * Security Components Language Adapter
 * Handles language updates for security components (UserCommunication and SecurityOnboarding)
 * Provides different update strategies and safe DOM manipulation
 */

class SecurityComponentsLanguageAdapter {
  constructor() {
    this.components = new Map();
    this.updateStrategies = new Map();
    this.translationCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the adapter
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.setupDefaultComponents();
      this.initialized = true;
      console.log('[SecurityComponentsLanguageAdapter] Initialized successfully');
    } catch (error) {
      console.error('[SecurityComponentsLanguageAdapter] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup default security components
   */
  setupDefaultComponents() {
    // Register user communication component
    if (window.userCommunication) {
      this.registerSecurityComponent('user-communication', window.userCommunication, 'dom-update');
    }

    // Register security onboarding component
    if (window.securityOnboarding) {
      this.registerSecurityComponent('security-onboarding', window.securityOnboarding, 'hybrid');
    }
    
    // Register security settings component
    if (window.securitySettings) {
      this.registerSecurityComponent('security-settings', window.securitySettings, 'hybrid');
    }
  }

  /**
   * Register a security component
   * @param {string} componentId - Component ID
   * @param {Object} component - Component instance
   * @param {string} updateStrategy - Update strategy: 'dom-update' | 'recreation' | 'hybrid'
   */
  registerSecurityComponent(componentId, component, updateStrategy = 'dom-update') {
    this.components.set(componentId, component);
    this.updateStrategies.set(componentId, updateStrategy);
    
    console.log(`[SecurityComponentsLanguageAdapter] Registered component: ${componentId} with strategy: ${updateStrategy}`);
  }

  /**
   * Update all security components for language change
   * @param {string} newLanguage - New language code
   * @param {string} previousLanguage - Previous language code
   */
  async updateSecurityComponents(newLanguage, previousLanguage) {
    if (!this.initialized) {
      console.warn('[SecurityComponentsLanguageAdapter] Not initialized, skipping update');
      return;
    }

    const updatePromises = [];

    for (const [componentId, component] of this.components) {
      const strategy = this.updateStrategies.get(componentId);
      
      updatePromises.push(
        this.updateComponent(componentId, component, newLanguage, strategy)
          .catch(error => {
            console.error(`[SecurityComponentsLanguageAdapter] Failed to update ${componentId}:`, error);
            return { componentId, error: error.message };
          })
      );
    }

    const results = await Promise.allSettled(updatePromises);
    const failures = results
      .filter(result => result.status === 'rejected' || result.value?.error)
      .map(result => result.reason || result.value);

    if (failures.length > 0) {
      console.warn(`[SecurityComponentsLanguageAdapter] ${failures.length} components failed to update:`, failures);
    }

    console.log(`[SecurityComponentsLanguageAdapter] Updated ${this.components.size - failures.length}/${this.components.size} components`);
  }

  /**
   * Update a single component
   * @param {string} componentId - Component ID
   * @param {Object} component - Component instance
   * @param {string} language - Target language
   * @param {string} strategy - Update strategy
   */
  async updateComponent(componentId, component, language, strategy) {
    switch (strategy) {
      case 'dom-update':
        return this.updateComponentDOM(componentId, component, language);
      
      case 'recreation':
        return this.recreateComponent(componentId, component, language);
      
      case 'hybrid':
        return this.hybridUpdate(componentId, component, language);
      
      default:
        throw new Error(`Unknown update strategy: ${strategy}`);
    }
  }

  /**
   * DOM update strategy - Update text content without rebuilding DOM
   * @param {string} componentId - Component ID
   * @param {Object} component - Component instance
   * @param {string} language - Target language
   */
  async updateComponentDOM(componentId, component, language) {
    if (componentId === 'user-communication') {
      return this.updateUserCommunicationDOM(component, language);
    } else if (componentId === 'security-onboarding') {
      return this.updateSecurityOnboardingDOM(component, language);
    } else if (componentId === 'security-settings') {
      return this.updateSecuritySettingsDOM(component, language);
    }
    
    // Generic DOM update for other components
    if (component.updateLanguage && typeof component.updateLanguage === 'function') {
      await component.updateLanguage(language);
    }
  }

  /**
   * Update user communication system DOM
   * @param {Object} component - UserCommunication component
   * @param {string} language - Target language
   */
  async updateUserCommunicationDOM(component, language) {
    const container = document.getElementById('user-communication-container');
    if (!container) return;

    try {
      // Update container aria-label
      const containerLabel = this.getTranslation('security.userCommunication.containerLabel', language);
      container.setAttribute('aria-label', containerLabel);

      // Update existing messages
      const messages = container.querySelectorAll('.communication-message');
      messages.forEach(messageEl => {
        this.updateMessageTexts(messageEl, language);
      });

      // Update component internal language state
      if (component.currentLanguage !== undefined) {
        component.currentLanguage = language;
      }

      console.log(`[SecurityComponentsLanguageAdapter] Updated user-communication DOM for language: ${language}`);
    } catch (error) {
      console.error('[SecurityComponentsLanguageAdapter] Failed to update user communication DOM:', error);
      throw error;
    }
  }

  /**
   * Update message texts within user communication
   * @param {Element} messageEl - Message element
   * @param {string} language - Target language
   */
  updateMessageTexts(messageEl, language) {
    // Update close button aria-label
    const closeBtn = messageEl.querySelector('.message-close');
    if (closeBtn) {
      const closeLabel = this.getTranslation('security.userCommunication.actions.close', language);
      closeBtn.setAttribute('aria-label', closeLabel);
    }

    // Update action buttons
    const actionBtns = messageEl.querySelectorAll('.message-action');
    actionBtns.forEach(btn => {
      const actionKey = btn.dataset.actionKey;
      if (actionKey) {
        const actionText = this.getTranslation(`security.userCommunication.actions.${actionKey}`, language);
        if (actionText !== `security.userCommunication.actions.${actionKey}`) {
          btn.textContent = actionText;
        }
      }
    });
  }

  /**
   * Update security onboarding modal DOM
   * @param {Object} component - SecurityOnboarding component
   * @param {string} language - Target language
   */
  async updateSecurityOnboardingDOM(component, language) {
    const modal = document.getElementById('security-onboarding-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    // Store current focus element
    const focusedElement = document.activeElement;
    const focusedElementId = focusedElement?.id;

    try {
      // Update title and subtitle
      const title = modal.querySelector('#onboarding-title');
      const subtitle = modal.querySelector('.onboarding-subtitle');
      
      if (title) {
        title.textContent = this.getTranslation('security.onboarding.title', language);
      }
      if (subtitle) {
        subtitle.textContent = this.getTranslation('security.onboarding.subtitle', language);
      }

      // Update privacy notice
      const privacyNotice = modal.querySelector('.privacy-notice');
      if (privacyNotice) {
        const privacyTitle = this.getTranslation('security.onboarding.privacyTitle', language);
        const privacyText = this.getTranslation('security.onboarding.privacyNotice', language);
        privacyNotice.innerHTML = `<strong>${this.escapeHtml(privacyTitle)}</strong>${this.escapeHtml(privacyText)}`;
      }

      // Update feature cards
      await this.updateFeatureCards(modal, language);

      // Update buttons
      const skipBtn = modal.querySelector('.onboarding-btn.secondary');
      const confirmBtn = modal.querySelector('.onboarding-btn.primary');
      
      if (skipBtn) {
        skipBtn.textContent = this.getTranslation('security.onboarding.actions.skip', language);
      }
      if (confirmBtn) {
        confirmBtn.textContent = this.getTranslation('security.onboarding.actions.confirm', language);
      }

      // Restore focus
      if (focusedElementId) {
        const elementToFocus = document.getElementById(focusedElementId);
        if (elementToFocus && elementToFocus.isConnected) {
          elementToFocus.focus();
        }
      }

      console.log(`[SecurityComponentsLanguageAdapter] Updated security-onboarding DOM for language: ${language}`);

    } catch (error) {
      console.error('[SecurityComponentsLanguageAdapter] Failed to update security onboarding DOM:', error);
      throw error;
    }
  }

  /**
   * Update feature cards content
   * @param {Element} modal - Modal element
   * @param {string} language - Target language
   */
  async updateFeatureCards(modal, language) {
    const featureCards = modal.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
      const featureKey = card.id?.replace('feature-', '');
      if (!featureKey) return;

      // Update feature name
      const nameLabel = card.querySelector('.feature-name');
      if (nameLabel) {
        const featureName = this.getTranslation(`security.onboarding.features.${featureKey}.name`, language);
        if (featureName !== `security.onboarding.features.${featureKey}.name`) {
          nameLabel.textContent = featureName;
        }
      }

      // Update feature description
      const description = card.querySelector('.feature-description');
      if (description) {
        const featureDesc = this.getTranslation(`security.onboarding.features.${featureKey}.description`, language);
        if (featureDesc !== `security.onboarding.features.${featureKey}.description`) {
          description.textContent = featureDesc;
        }
      }

      // Update benefits list
      const benefitsList = card.querySelector('.feature-benefits ul');
      if (benefitsList) {
        const benefits = this.getTranslation(`security.onboarding.features.${featureKey}.benefits`, language);
        if (Array.isArray(benefits)) {
          benefitsList.innerHTML = benefits.map(benefit => `<li>${this.escapeHtml(benefit)}</li>`).join('');
        }
      }

      // Update risks list
      const risksList = card.querySelector('.feature-risks ul');
      if (risksList) {
        const risks = this.getTranslation(`security.onboarding.features.${featureKey}.risks`, language);
        if (Array.isArray(risks)) {
          risksList.innerHTML = risks.map(risk => `<li>${this.escapeHtml(risk)}</li>`).join('');
        }
      }
    });
  }

  /**
   * Hybrid update strategy - Smart update based on visibility
   * @param {string} componentId - Component ID
   * @param {Object} component - Component instance
   * @param {string} language - Target language
   */
  async hybridUpdate(componentId, component, language) {
    const isVisible = this.isComponentVisible(componentId);
    
    if (isVisible) {
      // Visible components get immediate DOM update
      await this.updateComponentDOM(componentId, component, language);
    } else {
      // Invisible components get delayed update
      this.scheduleDelayedUpdate(componentId, component, language);
    }
  }

  /**
   * Update security settings modal DOM
   * @param {Object} component - SecuritySettings component
   * @param {string} language - Target language
   */
  async updateSecuritySettingsDOM(component, language) {
    const modal = document.getElementById('security-settings-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    try {
      // Update component internal language state
      if (component.currentLanguage !== undefined) {
        component.currentLanguage = language;
      }
      
      // Trigger component's own update method
      if (component.updateLanguage && typeof component.updateLanguage === 'function') {
        await component.updateLanguage();
      }

      console.log(`[SecurityComponentsLanguageAdapter] Updated security-settings DOM for language: ${language}`);
    } catch (error) {
      console.error('[SecurityComponentsLanguageAdapter] Failed to update security settings DOM:', error);
      throw error;
    }
  }

  /**
   * Check if component is visible
   * @param {string} componentId - Component ID
   * @returns {boolean} True if component is visible
   */
  isComponentVisible(componentId) {
    const elementMap = {
      'user-communication': 'user-communication-container',
      'security-onboarding': 'security-onboarding-modal',
      'security-settings': 'security-settings-modal'
    };

    const elementId = elementMap[componentId];
    if (!elementId) return false;

    const element = document.getElementById(elementId);
    return element && !element.classList.contains('hidden') && element.style.display !== 'none';
  }

  /**
   * Schedule delayed update for invisible components
   * @param {string} componentId - Component ID
   * @param {Object} component - Component instance
   * @param {string} language - Target language
   */
  scheduleDelayedUpdate(componentId, component, language) {
    const elementMap = {
      'user-communication': 'user-communication-container',
      'security-onboarding': 'security-onboarding-modal',
      'security-settings': 'security-settings-modal'
    };

    const element = document.getElementById(elementMap[componentId]);
    if (!element) return;

    // Create mutation observer to watch for visibility changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
          
          if (this.isComponentVisible(componentId)) {
            this.updateComponentDOM(componentId, component, language);
            observer.disconnect();
          }
        }
      });
    });

    observer.observe(element, { attributes: true });
    
    // Auto-cleanup after 30 seconds
    setTimeout(() => observer.disconnect(), 30000);
  }

  /**
   * Get translation using global language manager
   * @param {string} key - Translation key
   * @param {string} language - Language code
   * @returns {string|Array|Object} Translation value
   */
  getTranslation(key, language) {
    // Use enhanced language manager if available
    if (window.languageManager && window.languageManager.getUnifiedText) {
      return window.languageManager.getUnifiedText(key, language);
    }

    // Fallback to cache or return key
    const cacheKey = `${language}:${key}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    return key;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Recreation strategy - Completely rebuild component
   * @param {string} componentId - Component ID
   * @param {Object} component - Component instance
   * @param {string} language - Target language
   */
  async recreateComponent(componentId, component, language) {
    // This strategy would completely rebuild the component
    // Currently not implemented as DOM update is preferred for performance
    console.warn(`[SecurityComponentsLanguageAdapter] Recreation strategy not implemented for ${componentId}`);
    return this.updateComponentDOM(componentId, component, language);
  }

  /**
   * Get adapter status
   * @returns {Object} Adapter status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      registeredComponents: Array.from(this.components.keys()),
      updateStrategies: Object.fromEntries(this.updateStrategies),
      cacheSize: this.translationCache.size
    };
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
    console.log('[SecurityComponentsLanguageAdapter] Cache cleared');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.components.clear();
    this.updateStrategies.clear();
    this.translationCache.clear();
    this.initialized = false;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityComponentsLanguageAdapter;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
  window.SecurityComponentsLanguageAdapter = SecurityComponentsLanguageAdapter;
}