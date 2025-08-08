/**
 * PWA UI Language Adapter
 * Manages language updates for PWA UI components including card lists, dialogs, and notifications
 * Integrates with existing PWA components to provide unified language switching
 */

class PWAUILanguageAdapter {
  constructor() {
    this.initialized = false;
    this.registeredComponents = new Map();
    this.dynamicComponents = new Set();
    this.updateQueue = [];
    this.isUpdating = false;
  }

  /**
   * Initialize the PWA UI language adapter
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Register existing PWA components
      this.registerExistingComponents();
      
      // Setup dynamic component detection
      this.setupDynamicComponentDetection();
      
      this.initialized = true;
      console.log('[PWAUILanguageAdapter] Initialized successfully');
    } catch (error) {
      console.error('[PWAUILanguageAdapter] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register existing PWA components for language updates
   */
  registerExistingComponents() {
    // Register card list component
    if (window.CardListComponent) {
      this.registerComponent('card-list', {
        selector: '.card-list-container',
        updateMethod: this.updateCardListLanguage.bind(this),
        priority: 5
      });
    }

    // Register duplicate dialog
    if (window.DuplicateDialog) {
      this.registerComponent('duplicate-dialog', {
        selector: '.duplicate-dialog-overlay',
        updateMethod: this.updateDuplicateDialogLanguage.bind(this),
        priority: 8
      });
    }

    // Register notification system
    this.registerComponent('notifications', {
      selector: '.notification-container',
      updateMethod: this.updateNotificationLanguage.bind(this),
      priority: 3
    });

    // Register main navigation
    this.registerComponent('navigation', {
      selector: '.pwa-navigation',
      updateMethod: this.updateNavigationLanguage.bind(this),
      priority: 7
    });

    // Register toolbar
    this.registerComponent('toolbar', {
      selector: '.pwa-toolbar',
      updateMethod: this.updateToolbarLanguage.bind(this),
      priority: 6
    });
  }

  /**
   * Setup dynamic component detection for components loaded after initialization
   */
  setupDynamicComponentDetection() {
    // Use MutationObserver to detect new PWA components
    if (typeof MutationObserver !== 'undefined') {
      this.componentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.detectAndRegisterDynamicComponents(node);
            }
          });
        });
      });

      this.componentObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * Detect and register dynamic components
   */
  detectAndRegisterDynamicComponents(element) {
    const detectedComponents = [];
    
    // Check for security components
    if (element.classList?.contains('security-onboarding') || 
        element.querySelector?.('.security-onboarding')) {
      const id = this.registerDynamicComponentByElement('security-onboarding', element);
      if (id) detectedComponents.push({ type: 'security-onboarding', id });
    }

    // Check for modal dialogs
    if (element.classList?.contains('modal-dialog') || 
        element.querySelector?.('.modal-dialog')) {
      const id = this.registerDynamicComponentByElement('modal-dialog', element);
      if (id) detectedComponents.push({ type: 'modal-dialog', id });
    }

    // Check for form components
    if (element.classList?.contains('pwa-form') || 
        element.querySelector?.('.pwa-form')) {
      const id = this.registerDynamicComponentByElement('pwa-form', element);
      if (id) detectedComponents.push({ type: 'pwa-form', id });
    }
    
    // Check for duplicate dialog
    if (element.classList?.contains('duplicate-dialog-overlay') || 
        element.querySelector?.('.duplicate-dialog-overlay')) {
      const id = this.registerDynamicComponentByElement('duplicate-dialog', element);
      if (id) detectedComponents.push({ type: 'duplicate-dialog', id });
    }
    
    // Check for notification components
    if (element.classList?.contains('notification-item') || 
        element.querySelector?.('.notification-item')) {
      const id = this.registerDynamicComponentByElement('notification', element);
      if (id) detectedComponents.push({ type: 'notification', id });
    }
    
    if (detectedComponents.length > 0) {
      console.log(`[PWAUILanguageAdapter] Detected ${detectedComponents.length} dynamic components:`, 
        detectedComponents.map(c => c.type));
    }
    
    return detectedComponents;
  }

  /**
   * Register a PWA component for language updates
   */
  registerComponent(id, config) {
    // Validate component registration
    if (!id || typeof id !== 'string') {
      console.warn('[PWAUILanguageAdapter] Invalid component ID:', id);
      return false;
    }
    
    if (!config || (!config.selector && !config.element)) {
      console.warn('[PWAUILanguageAdapter] Component must have selector or element:', id);
      return false;
    }
    
    this.registeredComponents.set(id, {
      id,
      selector: config.selector,
      element: config.element || null,
      updateMethod: config.updateMethod,
      priority: config.priority || 5,
      lastUpdate: null,
      registeredAt: Date.now(),
      dynamic: config.dynamic || false
    });
    
    console.log(`[PWAUILanguageAdapter] Registered component: ${id}`);
    return true;
  }
  
  /**
   * Register component dynamically (for components loaded after initialization)
   */
  registerDynamicComponent(id, config) {
    const success = this.registerComponent(id, {
      ...config,
      dynamic: true,
      priority: config.priority || 4
    });
    
    if (success) {
      // Immediately update with current language if available
      const currentLang = this.getCurrentLanguage();
      if (currentLang) {
        this.updateComponent(this.registeredComponents.get(id), currentLang, null)
          .catch(error => {
            console.error(`[PWAUILanguageAdapter] Failed to update dynamic component ${id}:`, error);
          });
      }
    }
    
    return success;
  }
  
  /**
   * Get current language from language manager
   */
  getCurrentLanguage() {
    if (window.languageManager && window.languageManager.getCurrentLanguage) {
      return window.languageManager.getCurrentLanguage();
    }
    if (window.EnhancedLanguageManager && window.enhancedLanguageManager) {
      return window.enhancedLanguageManager.getCurrentLanguage();
    }
    return localStorage.getItem('pwa-language') || 'zh';
  }

  /**
   * Register a dynamic component by type and element
   */
  registerDynamicComponentByElement(type, element) {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.dynamicComponents.add(id);
    
    const success = this.registerComponent(id, {
      type,
      element,
      updateMethod: this.updateDynamicComponentLanguage.bind(this),
      priority: 4,
      dynamic: true
    });
    
    if (success) {
      console.log(`[PWAUILanguageAdapter] Registered dynamic component: ${type} (${id})`);
    }
    
    return success ? id : null;
  }

  /**
   * Update PWA components language
   */
  async updatePWAComponents(newLanguage, previousLanguage) {
    if (this.isUpdating) {
      this.updateQueue.push({ newLanguage, previousLanguage });
      return;
    }

    this.isUpdating = true;

    try {
      // Sort components by priority (higher priority first)
      const sortedComponents = Array.from(this.registeredComponents.values())
        .sort((a, b) => b.priority - a.priority);

      // Update each component
      for (const component of sortedComponents) {
        try {
          await this.updateComponent(component, newLanguage, previousLanguage);
        } catch (error) {
          console.error(`[PWAUILanguageAdapter] Failed to update component ${component.id}:`, error);
        }
      }

      // Process queued updates
      await this.processUpdateQueue();

    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update individual component
   */
  async updateComponent(component, newLanguage, previousLanguage) {
    // Find element if not cached
    if (!component.element && component.selector) {
      component.element = document.querySelector(component.selector);
    }

    // Skip if element not found
    if (!component.element && !component.selector) {
      return;
    }

    // Call update method
    if (component.updateMethod) {
      await component.updateMethod(component, newLanguage, previousLanguage);
      component.lastUpdate = Date.now();
    }
  }

  /**
   * Update card list language
   */
  async updateCardListLanguage(component, newLanguage, previousLanguage) {
    // Try to update through CardListComponent if available
    if (window.cardList && typeof window.cardList.updateLanguage === 'function') {
      await window.cardList.updateLanguage(newLanguage);
      return;
    }
    
    // Fallback to direct DOM updates
    const elements = document.querySelectorAll('.card-list-container, .card-item');
    
    elements.forEach(element => {
      // Update action button texts
      const actionButtons = element.querySelectorAll('.action-btn .action-text');
      actionButtons.forEach(button => {
        const action = button.closest('.action-btn')?.dataset.action;
        if (action) {
          button.textContent = this.getActionText(action, newLanguage);
        }
      });

      // Update empty state texts
      const emptyState = element.querySelector('.empty-state');
      if (emptyState) {
        this.updateEmptyStateLanguage(emptyState, newLanguage);
      }

      // Update type labels
      const typeLabels = element.querySelectorAll('.type-label');
      typeLabels.forEach(label => {
        const cardItem = label.closest('.card-item');
        if (cardItem) {
          const cardId = cardItem.dataset.cardId;
          // Update type label based on card type
          label.textContent = this.getTypeLabel(cardId, newLanguage);
        }
      });
      
      // Update loading text
      const loadingText = element.querySelector('.loading-state p');
      if (loadingText) {
        loadingText.textContent = this.getText('cardList.loadingCards', newLanguage);
      }
      
      // Update saved date text
      const cardDates = element.querySelectorAll('.card-date');
      cardDates.forEach(dateElement => {
        const text = dateElement.textContent;
        if (text.includes('儲存於') || text.includes('Saved on')) {
          const dateMatch = text.match(/\d{4}\/\d{1,2}\/\d{1,2}.*/);
          if (dateMatch) {
            const savedAtText = newLanguage === 'en' ? 'Saved on' : '儲存於';
            dateElement.textContent = `${savedAtText} ${dateMatch[0]}`;
          }
        }
      });
    });
  }

  /**
   * Update duplicate dialog language
   */
  async updateDuplicateDialogLanguage(component, newLanguage, previousLanguage) {
    const dialog = document.querySelector('.duplicate-dialog-overlay');
    if (!dialog) return;

    // Update dialog title
    const title = dialog.querySelector('#duplicate-dialog-title');
    if (title) {
      title.textContent = this.getText('duplicateFound', newLanguage);
    }

    // Update action buttons
    const actionButtons = dialog.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
      const action = button.dataset.action;
      const textSpan = button.querySelector('.text');
      const descSpan = button.querySelector('.desc');
      
      if (textSpan && action) {
        textSpan.textContent = this.getText(action, newLanguage);
      }
      if (descSpan && action) {
        descSpan.textContent = this.getText(`${action}Desc`, newLanguage);
      }
    });

    // Update other dialog texts
    const labels = ['existingCard', 'newCard', 'createdTime', 'version', 'cancel'];
    labels.forEach(label => {
      const elements = dialog.querySelectorAll(`[data-label="${label}"]`);
      elements.forEach(element => {
        element.textContent = this.getText(label, newLanguage);
      });
    });
  }

  /**
   * Update notification language
   */
  async updateNotificationLanguage(component, newLanguage, previousLanguage) {
    // Update active notifications
    const notifications = document.querySelectorAll('.notification-item, .notification');
    
    notifications.forEach(notification => {
      const messageType = notification.dataset.messageType;
      if (messageType) {
        const message = notification.querySelector('.notification-message');
        if (message) {
          // Re-generate notification message in new language
          const data = JSON.parse(notification.dataset.messageData || '{}');
          message.textContent = this.getNotificationMessage(messageType, data, newLanguage);
        }
      }
      
      // Update close button text if present
      const closeBtn = notification.querySelector('.notification-close');
      if (closeBtn && closeBtn.textContent.trim() === '×') {
        closeBtn.setAttribute('title', this.getText('close', newLanguage));
      }
    });
    
    // Update notification container label if present
    const notificationContainer = document.querySelector('.notification-container');
    if (notificationContainer) {
      const containerLabel = notificationContainer.querySelector('.container-label');
      if (containerLabel) {
        containerLabel.textContent = this.getText('security.userCommunication.containerLabel', newLanguage);
      }
    }
  }

  /**
   * Update navigation language
   */
  async updateNavigationLanguage(component, newLanguage, previousLanguage) {
    const navItems = document.querySelectorAll('.nav-item, .nav-link');
    
    navItems.forEach(item => {
      const page = item.dataset.page || item.dataset.navKey;
      if (page) {
        const textElement = item.querySelector('.nav-text') || item;
        const currentText = textElement.textContent.trim();
        
        // Update navigation text based on page
        const navTexts = {
          zh: {
            home: '首頁',
            cards: '我的名片',
            import: '匯入名片',
            export: '匯出資料',
            settings: '設定'
          },
          en: {
            home: 'Home',
            cards: 'My Cards',
            import: 'Import Cards',
            export: 'Export Data',
            settings: 'Settings'
          }
        };
        
        const newText = navTexts[newLanguage]?.[page];
        if (newText && newText !== currentText) {
          textElement.textContent = newText;
        }
      }
    });
    
    // Update language toggle button
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      const langText = langToggle.querySelector('.lang-text');
      if (langText) {
        langText.textContent = newLanguage === 'zh' ? 'EN' : '中';
      }
      langToggle.setAttribute('title', 
        newLanguage === 'zh' ? 'Switch to English' : '切換到中文'
      );
    }
  }

  /**
   * Update toolbar language
   */
  async updateToolbarLanguage(component, newLanguage, previousLanguage) {
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    
    toolbarButtons.forEach(button => {
      const action = button.dataset.action;
      if (action) {
        const textElement = button.querySelector('.btn-text');
        const titleAttr = button.getAttribute('title');
        
        if (textElement) {
          textElement.textContent = this.getText(`toolbar.${action}`, newLanguage);
        }
        if (titleAttr) {
          button.setAttribute('title', this.getText(`toolbar.${action}Tooltip`, newLanguage));
        }
      }
    });
  }

  /**
   * Update dynamic component language
   */
  async updateDynamicComponentLanguage(component, newLanguage, previousLanguage) {
    if (!component.element) return;

    // Update all text nodes with data-i18n attributes
    const i18nElements = component.element.querySelectorAll('[data-i18n]');
    i18nElements.forEach(element => {
      const key = element.dataset.i18n;
      if (key) {
        element.textContent = this.getText(key, newLanguage);
      }
    });

    // Update form labels and placeholders
    const formElements = component.element.querySelectorAll('input, textarea, select');
    formElements.forEach(element => {
      const placeholderKey = element.dataset.placeholderI18n;
      const labelKey = element.dataset.labelI18n;
      
      if (placeholderKey) {
        element.setAttribute('placeholder', this.getText(placeholderKey, newLanguage));
      }
      
      if (labelKey) {
        const label = element.closest('.form-group')?.querySelector('label');
        if (label) {
          label.textContent = this.getText(labelKey, newLanguage);
        }
      }
    });
  }

  /**
   * Update empty state language
   */
  updateEmptyStateLanguage(emptyState, newLanguage) {
    const title = emptyState.querySelector('h3');
    const description = emptyState.querySelector('p');
    const button = emptyState.querySelector('.btn');
    const clearFiltersBtn = emptyState.querySelector('[data-action="clear-filters"]');
    const tipsTitle = emptyState.querySelector('h4');
    const tipsList = emptyState.querySelectorAll('li');

    if (title) {
      title.textContent = this.getText('cardList.emptyTitle', newLanguage);
    }
    if (description) {
      description.textContent = this.getText('cardList.emptyDescription', newLanguage);
    }
    if (button) {
      button.textContent = this.getText('cardList.emptyAction', newLanguage);
    }
    if (clearFiltersBtn) {
      clearFiltersBtn.textContent = newLanguage === 'en' ? 'Clear Filters' : '清除篩選條件';
    }
    if (tipsTitle) {
      tipsTitle.textContent = newLanguage === 'en' ? '💡 Tips' : '💡 小提示';
    }
    
    // Update tips list
    if (tipsList.length >= 2) {
      tipsList[0].textContent = newLanguage === 'en' ? 
        'Import cards from URL links' : '支援從 URL 連結匯入名片';
      tipsList[1].textContent = newLanguage === 'en' ? 
        'Import JSON and vCard files' : '支援匯入 JSON 和 vCard 檔案';
    }
  }

  /**
   * Process queued updates
   */
  async processUpdateQueue() {
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift();
      await this.updatePWAComponents(update.newLanguage, update.previousLanguage);
    }
  }

  /**
   * Get localized text
   */
  getText(key, language) {
    // Try to get text from translation registry
    if (window.TranslationRegistry) {
      try {
        const registry = new window.TranslationRegistry();
        return registry.getTranslation(language, `pwa.${key}`);
      } catch (error) {
        // Fallback to language manager
      }
    }

    // Fallback to language manager
    if (window.languageManager) {
      return window.languageManager.getText(key, language);
    }

    // Default fallback
    return this.getDefaultText(key, language);
  }

  /**
   * Get default text for common UI elements
   */
  getDefaultText(key, language) {
    const texts = {
      zh: {
        'view': '檢視',
        'qr': '分享',
        'vcard': '下載',
        'delete': '刪除',
        'duplicateFound': '發現重複名片',
        'skip': '跳過',
        'overwrite': '覆蓋',
        'version': '新版本',
        'cancel': '取消',
        'existingCard': '現有名片',
        'newCard': '新名片',
        'createdTime': '建立時間',
        'emptyState.title': '還沒有儲存任何名片',
        'emptyState.description': '匯入您的第一張數位名片，開始建立您的名片收藏',
        'emptyState.action': '開始匯入名片'
      },
      en: {
        'view': 'View',
        'qr': 'Share',
        'vcard': 'Download',
        'delete': 'Delete',
        'duplicateFound': 'Duplicate Card Found',
        'skip': 'Skip',
        'overwrite': 'Overwrite',
        'version': 'New Version',
        'cancel': 'Cancel',
        'existingCard': 'Existing Card',
        'newCard': 'New Card',
        'createdTime': 'Created Time',
        'emptyState.title': 'No Cards Saved Yet',
        'emptyState.description': 'Import your first digital business card to start building your collection',
        'emptyState.action': 'Start Importing Cards'
      }
    };

    return texts[language]?.[key] || key;
  }

  /**
   * Get action text
   */
  getActionText(action, language) {
    return this.getText(action, language);
  }

  /**
   * Get type label
   */
  getTypeLabel(cardId, language) {
    // This would need to be implemented based on card data
    // For now, return a placeholder
    return this.getText('cardType', language);
  }

  /**
   * Get notification message
   */
  getNotificationMessage(type, data, language) {
    return this.getText(`notification.${type}`, language);
  }

  /**
   * Unregister component
   */
  unregisterComponent(id) {
    const component = this.registeredComponents.get(id);
    if (component) {
      console.log(`[PWAUILanguageAdapter] Unregistering component: ${id}`);
      this.registeredComponents.delete(id);
      this.dynamicComponents.delete(id);
      return true;
    }
    return false;
  }
  
  /**
   * Unregister components by type
   */
  unregisterComponentsByType(type) {
    const toRemove = [];
    
    for (const [id, component] of this.registeredComponents.entries()) {
      if (component.type === type) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.unregisterComponent(id));
    
    if (toRemove.length > 0) {
      console.log(`[PWAUILanguageAdapter] Unregistered ${toRemove.length} components of type: ${type}`);
    }
    
    return toRemove.length;
  }
  
  /**
   * Get registered components by type
   */
  getComponentsByType(type) {
    const components = [];
    
    for (const [id, component] of this.registeredComponents.entries()) {
      if (component.type === type) {
        components.push({ id, ...component });
      }
    }
    
    return components;
  }

  /**
   * Get adapter status
   */
  getStatus() {
    const componentsByType = {};
    const dynamicComponentsList = [];
    
    for (const [id, component] of this.registeredComponents.entries()) {
      const type = component.type || 'unknown';
      if (!componentsByType[type]) {
        componentsByType[type] = 0;
      }
      componentsByType[type]++;
      
      if (component.dynamic) {
        dynamicComponentsList.push({
          id,
          type,
          registeredAt: component.registeredAt,
          lastUpdate: component.lastUpdate
        });
      }
    }
    
    return {
      initialized: this.initialized,
      registeredComponents: this.registeredComponents.size,
      dynamicComponents: this.dynamicComponents.size,
      componentsByType,
      dynamicComponentsList,
      isUpdating: this.isUpdating,
      queuedUpdates: this.updateQueue.length,
      currentLanguage: this.getCurrentLanguage()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.componentObserver) {
      this.componentObserver.disconnect();
      this.componentObserver = null;
    }

    this.registeredComponents.clear();
    this.dynamicComponents.clear();
    this.updateQueue.length = 0;
    this.initialized = false;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAUILanguageAdapter;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
  window.PWAUILanguageAdapter = PWAUILanguageAdapter;
}