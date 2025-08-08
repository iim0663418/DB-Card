/**
 * 無障礙語言管理器 (AccessibilityLanguageManager)
 * 處理 ARIA 標籤、螢幕閱讀器文字、表單標籤雙語支援
 * 
 * @version 3.1.4-language-architecture
 * @author code-executor
 * @since 2025-08-06
 */

class AccessibilityLanguageManager {
  constructor() {
    this.ariaLabelMap = new Map();
    this.screenReaderTextMap = new Map();
    this.formLabelMap = new Map();
    this.accessibilityObserver = null;
    this.isInitialized = false;
    this.currentLanguage = 'zh';
    this.translationRegistry = null;
  }

  /**
   * 初始化無障礙語言管理器
   * @param {Object} translationRegistry - 翻譯註冊表實例
   */
  async initialize(translationRegistry) {
    try {
      this.translationRegistry = translationRegistry;
      this.currentLanguage = document.documentElement.lang?.startsWith('en') ? 'en' : 'zh';
      
      // 自動註冊現有的無障礙元素
      await this.autoRegisterAccessibilityElements();
      
      // 設置 DOM 變更觀察者
      this.setupAccessibilityObserver();
      
      this.isInitialized = true;
      console.log('[AccessibilityLanguageManager] Initialized successfully');
      
    } catch (error) {
      console.error('[AccessibilityLanguageManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 更新無障礙屬性
   * @param {string} language - 目標語言
   */
  async updateAccessibilityAttributes(language) {
    if (!this.isInitialized || !this.translationRegistry) {
      console.warn('[AccessibilityLanguageManager] Not initialized, skipping update');
      return;
    }

    try {
      this.currentLanguage = language;
      
      // 更新 ARIA 標籤
      await this.updateAriaLabels(language);
      
      // 更新螢幕閱讀器文字
      await this.updateScreenReaderTexts(language);
      
      // 更新表單標籤
      await this.updateFormLabels(language);
      
      // 更新文檔語言屬性
      this.updateDocumentLanguage(language);
      
      console.log(`[AccessibilityLanguageManager] Updated accessibility attributes for language: ${language}`);
      
    } catch (error) {
      console.error('[AccessibilityLanguageManager] Failed to update accessibility attributes:', error);
      throw error;
    }
  }

  /**
   * 更新 ARIA 標籤
   */
  async updateAriaLabels(language) {
    const ariaElements = document.querySelectorAll('[aria-label]');
    
    for (const element of ariaElements) {
      const labelKey = this.getAriaLabelKey(element);
      if (labelKey) {
        const newLabel = this.translationRegistry.getTranslation(language, `accessibility.ariaLabels.${labelKey}`);
        if (newLabel && newLabel !== labelKey) {
          element.setAttribute('aria-label', newLabel);
        }
      }
    }

    // 更新 aria-labelledby 引用的元素
    const labelledByElements = document.querySelectorAll('[aria-labelledby]');
    for (const element of labelledByElements) {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        const labelKey = this.getTextContentKey(labelElement);
        if (labelKey) {
          const newText = this.translationRegistry.getTranslation(language, `accessibility.ariaLabels.${labelKey}`);
          if (newText && newText !== labelKey) {
            labelElement.textContent = newText;
          }
        }
      }
    }
  }

  /**
   * 獲取 ARIA 標籤鍵值
   */
  getAriaLabelKey(element) {
    const elementId = element.id;
    const elementClass = element.className;
    const elementRole = element.getAttribute('role');
    
    // 基於 ID 的映射
    if (elementId) {
      const idMappings = {
        'user-communication-container': 'systemNotifications',
        'security-onboarding-modal': 'securityOnboardingModal',
        'card-list-container': 'cardListContainer',
        'duplicate-dialog': 'duplicateDialog',
        'language-toggle': 'languageToggle',
        'search-input': 'searchInput',
        'filter-select': 'filterSelect',
        'import-button': 'importButton',
        'export-button': 'exportButton'
      };
      
      if (idMappings[elementId]) {
        return idMappings[elementId];
      }
    }
    
    // 基於類別的映射
    if (elementClass) {
      if (elementClass.includes('message-close')) return 'closeNotification';
      if (elementClass.includes('modal-close')) return 'closeModal';
      if (elementClass.includes('nav-item')) return 'navigationItem';
      if (elementClass.includes('card-item')) return 'cardItem';
      if (elementClass.includes('action-button')) return 'actionButton';
    }
    
    // 基於角色的映射
    if (elementRole) {
      const roleMappings = {
        'button': 'button',
        'dialog': 'dialog',
        'navigation': 'navigation',
        'main': 'mainContent',
        'complementary': 'sidebar',
        'banner': 'header',
        'contentinfo': 'footer'
      };
      
      if (roleMappings[elementRole]) {
        return roleMappings[elementRole];
      }
    }
    
    return null;
  }

  /**
   * 更新螢幕閱讀器文字
   */
  async updateScreenReaderTexts(language) {
    const srElements = document.querySelectorAll('.sr-only, .screen-reader-text, [data-sr-text]');
    
    for (const element of srElements) {
      const textKey = element.dataset.textKey || element.dataset.srText;
      if (textKey) {
        const newText = this.translationRegistry.getTranslation(language, `accessibility.screenReaderTexts.${textKey}`);
        if (newText && newText !== textKey) {
          element.textContent = newText;
        }
      } else {
        // 嘗試從內容推斷鍵值
        const inferredKey = this.inferScreenReaderTextKey(element);
        if (inferredKey) {
          const newText = this.translationRegistry.getTranslation(language, `accessibility.screenReaderTexts.${inferredKey}`);
          if (newText && newText !== inferredKey) {
            element.textContent = newText;
            element.dataset.textKey = inferredKey; // 記錄以供下次使用
          }
        }
      }
    }
  }

  /**
   * 推斷螢幕閱讀器文字鍵值
   */
  inferScreenReaderTextKey(element) {
    const currentText = element.textContent.trim();
    const parent = element.parentElement;
    
    // 基於當前文字內容推斷
    const textMappings = {
      '系統通知': 'systemNotifications',
      'System Notifications': 'systemNotifications',
      '關閉': 'close',
      'Close': 'close',
      '開啟': 'open',
      'Open': 'open',
      '選單': 'menu',
      'Menu': 'menu',
      '搜尋': 'search',
      'Search': 'search',
      '篩選': 'filter',
      'Filter': 'filter',
      '匯入': 'import',
      'Import': 'import',
      '匯出': 'export',
      'Export': 'export'
    };
    
    if (textMappings[currentText]) {
      return textMappings[currentText];
    }
    
    // 基於父元素推斷
    if (parent) {
      const parentId = parent.id;
      const parentClass = parent.className;
      
      if (parentId?.includes('button')) return 'buttonAction';
      if (parentId?.includes('link')) return 'linkAction';
      if (parentClass?.includes('nav')) return 'navigationAction';
      if (parentClass?.includes('card')) return 'cardAction';
    }
    
    return null;
  }

  /**
   * 更新表單標籤
   */
  async updateFormLabels(language) {
    const labels = document.querySelectorAll('label[for]');
    
    for (const label of labels) {
      const forId = label.getAttribute('for');
      const labelKey = this.getFormLabelKey(forId, label);
      
      if (labelKey) {
        const newText = this.translationRegistry.getTranslation(language, `accessibility.formLabels.${labelKey}`);
        if (newText && newText !== labelKey) {
          label.textContent = newText;
        }
      }
    }

    // 更新 placeholder 文字
    const inputsWithPlaceholder = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    for (const input of inputsWithPlaceholder) {
      const placeholderKey = this.getPlaceholderKey(input);
      if (placeholderKey) {
        const newPlaceholder = this.translationRegistry.getTranslation(language, `accessibility.placeholders.${placeholderKey}`);
        if (newPlaceholder && newPlaceholder !== placeholderKey) {
          input.setAttribute('placeholder', newPlaceholder);
        }
      }
    }
  }

  /**
   * 獲取表單標籤鍵值
   */
  getFormLabelKey(forId, labelElement) {
    const labelKeyMap = {
      'card-search': 'searchCards',
      'card-filter': 'filterCards',
      'import-url': 'importUrl',
      'export-format': 'exportFormat',
      'card-name': 'cardName',
      'card-title': 'cardTitle',
      'card-email': 'cardEmail',
      'card-phone': 'cardPhone',
      'language-select': 'languageSelect'
    };
    
    if (labelKeyMap[forId]) {
      return labelKeyMap[forId];
    }
    
    // 基於標籤文字內容推斷
    const currentText = labelElement.textContent.trim();
    const textMappings = {
      '搜尋名片': 'searchCards',
      'Search Cards': 'searchCards',
      '篩選': 'filterCards',
      'Filter': 'filterCards',
      '匯入網址': 'importUrl',
      'Import URL': 'importUrl',
      '匯出格式': 'exportFormat',
      'Export Format': 'exportFormat',
      '姓名': 'cardName',
      'Name': 'cardName',
      '職稱': 'cardTitle',
      'Title': 'cardTitle',
      '電子郵件': 'cardEmail',
      'Email': 'cardEmail',
      '電話': 'cardPhone',
      'Phone': 'cardPhone'
    };
    
    return textMappings[currentText] || null;
  }

  /**
   * 獲取 placeholder 鍵值
   */
  getPlaceholderKey(inputElement) {
    const inputId = inputElement.id;
    const inputName = inputElement.name;
    const inputType = inputElement.type;
    
    const keyMappings = {
      'card-search': 'searchPlaceholder',
      'import-url': 'importUrlPlaceholder',
      'card-name': 'namePlaceholder',
      'card-title': 'titlePlaceholder',
      'card-email': 'emailPlaceholder',
      'card-phone': 'phonePlaceholder'
    };
    
    if (keyMappings[inputId]) {
      return keyMappings[inputId];
    }
    
    if (keyMappings[inputName]) {
      return keyMappings[inputName];
    }
    
    // 基於輸入類型推斷
    const typeMappings = {
      'search': 'searchPlaceholder',
      'email': 'emailPlaceholder',
      'tel': 'phonePlaceholder',
      'url': 'urlPlaceholder',
      'text': 'textPlaceholder'
    };
    
    return typeMappings[inputType] || null;
  }

  /**
   * 更新文檔語言屬性
   */
  updateDocumentLanguage(language) {
    const langCode = language === 'zh' ? 'zh-TW' : 'en';
    document.documentElement.lang = langCode;
    
    // 更新 dir 屬性（未來支援 RTL 語言時使用）
    document.documentElement.dir = 'ltr';
  }

  /**
   * 自動註冊現有的無障礙元素
   */
  async autoRegisterAccessibilityElements() {
    // 註冊 ARIA 標籤元素
    const ariaElements = document.querySelectorAll('[aria-label]');
    ariaElements.forEach(element => {
      const labelKey = this.getAriaLabelKey(element);
      if (labelKey) {
        this.registerAccessibilityElement(element.id || this.generateElementId(element), labelKey, 'aria-label');
      }
    });

    // 註冊螢幕閱讀器文字元素
    const srElements = document.querySelectorAll('.sr-only, .screen-reader-text');
    srElements.forEach(element => {
      const textKey = element.dataset.textKey || this.inferScreenReaderTextKey(element);
      if (textKey) {
        this.registerAccessibilityElement(element.id || this.generateElementId(element), textKey, 'screen-reader');
      }
    });

    // 註冊表單標籤
    const labels = document.querySelectorAll('label[for]');
    labels.forEach(label => {
      const forId = label.getAttribute('for');
      const labelKey = this.getFormLabelKey(forId, label);
      if (labelKey) {
        this.registerAccessibilityElement(forId, labelKey, 'form-label');
      }
    });
  }

  /**
   * 註冊無障礙元素
   * @param {string} elementId - 元素ID
   * @param {string} labelKey - 標籤鍵值
   * @param {string} type - 類型: 'aria-label' | 'screen-reader' | 'form-label'
   */
  registerAccessibilityElement(elementId, labelKey, type = 'aria-label') {
    const element = document.getElementById(elementId);
    if (!element && type !== 'form-label') {
      console.warn(`[AccessibilityLanguageManager] Element not found: ${elementId}`);
      return;
    }

    switch (type) {
      case 'aria-label':
        this.ariaLabelMap.set(elementId, labelKey);
        break;
      case 'screen-reader':
        this.screenReaderTextMap.set(elementId, labelKey);
        if (element) {
          element.dataset.textKey = labelKey;
        }
        break;
      case 'form-label':
        this.formLabelMap.set(elementId, labelKey);
        break;
    }

    console.log(`[AccessibilityLanguageManager] Registered ${type} element: ${elementId} -> ${labelKey}`);
  }

  /**
   * 生成元素 ID
   */
  generateElementId(element) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    const id = `accessibility-${timestamp}-${random}`;
    element.id = id;
    return id;
  }

  /**
   * 設置 DOM 變更觀察者
   */
  setupAccessibilityObserver() {
    if (this.accessibilityObserver) {
      this.accessibilityObserver.disconnect();
    }

    this.accessibilityObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // 檢查新增的節點是否包含無障礙元素
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const hasAriaLabel = node.hasAttribute?.('aria-label') || node.querySelector?.('[aria-label]');
              const hasSrText = node.classList?.contains('sr-only') || node.querySelector?.('.sr-only, .screen-reader-text');
              const hasFormLabel = node.tagName === 'LABEL' || node.querySelector?.('label');
              
              if (hasAriaLabel || hasSrText || hasFormLabel) {
                shouldUpdate = true;
              }
            }
          });
        } else if (mutation.type === 'attributes') {
          // 檢查屬性變更是否影響無障礙
          const relevantAttributes = ['aria-label', 'aria-labelledby', 'role', 'lang'];
          if (relevantAttributes.includes(mutation.attributeName)) {
            shouldUpdate = true;
          }
        }
      });

      if (shouldUpdate) {
        // 延遲更新，避免頻繁觸發
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
          this.autoRegisterAccessibilityElements();
          this.updateAccessibilityAttributes(this.currentLanguage);
        }, 100);
      }
    });

    // 觀察整個文檔的變更
    this.accessibilityObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'role', 'lang', 'class']
    });
  }

  /**
   * 獲取文字內容鍵值
   */
  getTextContentKey(element) {
    const text = element.textContent.trim();
    const textMappings = {
      '系統通知': 'systemNotifications',
      'System Notifications': 'systemNotifications',
      '安全設定': 'securitySettings',
      'Security Settings': 'securitySettings',
      '名片列表': 'cardList',
      'Card List': 'cardList'
    };
    
    return textMappings[text] || null;
  }

  /**
   * 清理資源
   */
  cleanup() {
    if (this.accessibilityObserver) {
      this.accessibilityObserver.disconnect();
      this.accessibilityObserver = null;
    }

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    this.ariaLabelMap.clear();
    this.screenReaderTextMap.clear();
    this.formLabelMap.clear();
    this.isInitialized = false;

    console.log('[AccessibilityLanguageManager] Cleaned up resources');
  }

  /**
   * 獲取無障礙狀態
   */
  getAccessibilityStatus() {
    return {
      isInitialized: this.isInitialized,
      currentLanguage: this.currentLanguage,
      registeredElements: {
        ariaLabels: this.ariaLabelMap.size,
        screenReaderTexts: this.screenReaderTextMap.size,
        formLabels: this.formLabelMap.size
      },
      hasObserver: !!this.accessibilityObserver
    };
  }
}

// 導出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityLanguageManager;
} else if (typeof window !== 'undefined') {
  window.AccessibilityLanguageManager = AccessibilityLanguageManager;
}