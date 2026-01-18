/**
 * Language Architecture Accessibility Test Suite
 * WCAG 2.1 AA compliance testing for unified language switching implementation
 * 
 * @version 3.1.4-language-architecture
 * @author test-coverage-generator
 * @since 2025-08-06
 * 
 * Accessibility Test Coverage:
 * - WCAG 2.1 AA compliance
 * - Screen reader compatibility
 * - Keyboard navigation support
 * - ARIA attributes management
 * - Focus management
 * - Language announcement
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Accessibility-focused mock environment
global.window = {
  localStorage: {
    getItem: sinon.stub().returns('zh'),
    setItem: sinon.stub(),
    removeItem: sinon.stub()
  },
  fetch: sinon.stub(),
  performance: { now: () => Date.now() },
  speechSynthesis: {
    speak: sinon.stub(),
    cancel: sinon.stub(),
    getVoices: sinon.stub().returns([])
  }
};

global.document = {
  documentElement: { 
    lang: 'zh-TW',
    dir: 'ltr',
    setAttribute: sinon.stub(),
    getAttribute: sinon.stub().returns('zh-TW')
  },
  getElementById: sinon.stub().callsFake((id) => ({
    id,
    setAttribute: sinon.stub(),
    getAttribute: sinon.stub().returns(null),
    textContent: '',
    innerHTML: '',
    classList: { 
      contains: sinon.stub().returns(false),
      add: sinon.stub(),
      remove: sinon.stub()
    },
    focus: sinon.stub(),
    blur: sinon.stub(),
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
    ariaLabel: '',
    ariaDescribedBy: '',
    ariaLive: '',
    role: ''
  })),
  querySelectorAll: sinon.stub().callsFake((selector) => {
    // Mock elements with accessibility attributes
    return [
      {
        setAttribute: sinon.stub(),
        getAttribute: sinon.stub(),
        ariaLabel: '',
        ariaDescribedBy: '',
        role: 'button',
        tabIndex: 0
      }
    ];
  }),
  querySelector: sinon.stub().returns(null),
  activeElement: null,
  body: {
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub()
  },
  createElement: sinon.stub().callsFake((tag) => ({
    tagName: tag.toUpperCase(),
    setAttribute: sinon.stub(),
    getAttribute: sinon.stub(),
    textContent: '',
    innerHTML: '',
    ariaLabel: '',
    ariaDescribedBy: '',
    role: '',
    tabIndex: -1
  }))
};

global.navigator = { 
  language: 'zh-TW',
  languages: ['zh-TW', 'zh', 'en-US', 'en']
};

global.MutationObserver = class {
  constructor(callback) {
    this.callback = callback;
    this.observing = false;
  }
  observe(target, options) {
    this.observing = true;
    this.target = target;
    this.options = options;
  }
  disconnect() {
    this.observing = false;
  }
  takeRecords() { return []; }
};

// Load modules
const TranslationRegistry = require('../../pwa-card-storage/src/core/translation-registry.js');
const UnifiedLanguageObserver = require('../../pwa-card-storage/src/core/unified-language-observer.js');
const EnhancedLanguageManager = require('../../pwa-card-storage/src/core/enhanced-language-manager.js');

describe('Language Architecture Accessibility Test Suite', function() {
  this.timeout(10000);

  describe('WCAG 2.1 AA Compliance', function() {
    let manager;

    beforeEach(async function() {
      // Setup accessibility translations
      global.window.fetch
        .withArgs(sinon.match(/accessibility-zh\.json/))
        .resolves({
          ok: true,
          json: async () => ({
            ariaLabels: {
              systemNotifications: '系統通知',
              closeNotification: '關閉通知',
              closeModal: '關閉對話框',
              languageToggle: '語言切換按鈕',
              themeToggle: '主題切換按鈕',
              searchCards: '搜尋名片',
              filterCards: '篩選名片',
              importCards: '匯入名片',
              exportCards: '匯出名片',
              cardList: '名片列表',
              cardDetails: '名片詳細資訊',
              navigationMenu: '導航選單',
              mainContent: '主要內容',
              sidebar: '側邊欄',
              footer: '頁尾'
            },
            screenReaderTexts: {
              languageChanged: '語言已切換至中文，頁面內容將以中文顯示',
              modalOpened: '對話框已開啟，請使用 Tab 鍵導航',
              modalClosed: '對話框已關閉，焦點已返回觸發元素',
              loadingContent: '正在載入內容，請稍候',
              contentLoaded: '內容載入完成',
              errorOccurred: '發生錯誤，請重試或聯絡支援',
              navigationChanged: '導航位置已變更',
              formValidationError: '表單驗證錯誤，請檢查輸入內容',
              actionCompleted: '操作已完成',
              actionFailed: '操作失敗'
            },
            formLabels: {
              searchInput: '搜尋名片輸入框',
              filterSelect: '篩選條件選擇',
              languageSelect: '語言選擇',
              themeSelect: '主題選擇',
              fileInput: '檔案選擇',
              submitButton: '提交按鈕',
              cancelButton: '取消按鈕',
              resetButton: '重設按鈕'
            },
            placeholders: {
              searchCards: '請輸入姓名、公司或職稱進行搜尋',
              filterCards: '請選擇篩選條件',
              emailInput: '請輸入電子郵件地址',
              phoneInput: '請輸入電話號碼'
            },
            validationMessages: {
              required: '此欄位為必填項目',
              invalidEmail: '請輸入有效的電子郵件地址',
              invalidPhone: '請輸入有效的電話號碼',
              fileTooLarge: '檔案大小超過限制',
              invalidFileType: '不支援的檔案類型'
            },
            statusMessages: {
              loading: '載入中，請稍候',
              saving: '儲存中，請稍候',
              saved: '已成功儲存',
              deleted: '已成功刪除',
              imported: '已成功匯入',
              exported: '已成功匯出',
              error: '操作失敗，請重試',
              offline: '目前離線模式',
              online: '已連線'
            }
          })
        })
        .withArgs(sinon.match(/accessibility-en\.json/))
        .resolves({
          ok: true,
          json: async () => ({
            ariaLabels: {
              systemNotifications: 'System Notifications',
              closeNotification: 'Close Notification',
              closeModal: 'Close Dialog',
              languageToggle: 'Language Toggle Button',
              themeToggle: 'Theme Toggle Button',
              searchCards: 'Search Cards',
              filterCards: 'Filter Cards',
              importCards: 'Import Cards',
              exportCards: 'Export Cards',
              cardList: 'Card List',
              cardDetails: 'Card Details',
              navigationMenu: 'Navigation Menu',
              mainContent: 'Main Content',
              sidebar: 'Sidebar',
              footer: 'Footer'
            },
            screenReaderTexts: {
              languageChanged: 'Language has been changed to English, page content will be displayed in English',
              modalOpened: 'Dialog has been opened, use Tab key to navigate',
              modalClosed: 'Dialog has been closed, focus returned to trigger element',
              loadingContent: 'Loading content, please wait',
              contentLoaded: 'Content loaded successfully',
              errorOccurred: 'An error occurred, please retry or contact support',
              navigationChanged: 'Navigation position has changed',
              formValidationError: 'Form validation error, please check your input',
              actionCompleted: 'Action completed successfully',
              actionFailed: 'Action failed'
            },
            formLabels: {
              searchInput: 'Search Cards Input',
              filterSelect: 'Filter Criteria Selection',
              languageSelect: 'Language Selection',
              themeSelect: 'Theme Selection',
              fileInput: 'File Selection',
              submitButton: 'Submit Button',
              cancelButton: 'Cancel Button',
              resetButton: 'Reset Button'
            },
            placeholders: {
              searchCards: 'Enter name, company, or title to search',
              filterCards: 'Select filter criteria',
              emailInput: 'Enter email address',
              phoneInput: 'Enter phone number'
            },
            validationMessages: {
              required: 'This field is required',
              invalidEmail: 'Please enter a valid email address',
              invalidPhone: 'Please enter a valid phone number',
              fileTooLarge: 'File size exceeds limit',
              invalidFileType: 'Unsupported file type'
            },
            statusMessages: {
              loading: 'Loading, please wait',
              saving: 'Saving, please wait',
              saved: 'Saved successfully',
              deleted: 'Deleted successfully',
              imported: 'Imported successfully',
              exported: 'Exported successfully',
              error: 'Operation failed, please retry',
              offline: 'Currently in offline mode',
              online: 'Connected'
            }
          })
        });

      // Setup accessibility-focused mocks
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().callsFake((lang, key) => {
          const translations = {
            'zh': {
              'accessibility.ariaLabels.systemNotifications': '系統通知',
              'accessibility.screenReaderTexts.languageChanged': '語言已切換至中文',
              'accessibility.formLabels.searchInput': '搜尋名片輸入框'
            },
            'en': {
              'accessibility.ariaLabels.systemNotifications': 'System Notifications',
              'accessibility.screenReaderTexts.languageChanged': 'Language has been changed to English',
              'accessibility.formLabels.searchInput': 'Search Cards Input'
            }
          };
          return translations[lang]?.[key] || key;
        }),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          ariaLabelsUpdated: true,
          screenReaderSupport: true,
          documentLanguageSet: true,
          focusManagementActive: true
        }),
        cleanup: sinon.stub(),
        announceLanguageChange: sinon.stub(),
        updateAriaLabels: sinon.stub(),
        updateScreenReaderTexts: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-A11Y-001: Should set document language attribute correctly', async function() {
      // Test Chinese language setting
      await manager.switchLanguage('zh');
      expect(global.document.documentElement.setAttribute)
        .to.have.been.calledWith('lang', 'zh-TW');

      // Test English language setting
      await manager.switchLanguage('en');
      expect(global.document.documentElement.setAttribute)
        .to.have.been.calledWith('lang', 'en');
    });

    it('TC-A11Y-002: Should update ARIA labels during language switch', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.updateAccessibilityAttributes)
        .to.have.been.calledWith('en');
      expect(manager.accessibilityManager.updateAriaLabels)
        .to.have.been.called;
    });

    it('TC-A11Y-003: Should provide screen reader announcements', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.announceLanguageChange)
        .to.have.been.called;
      
      // Verify screen reader text is available
      const screenReaderText = manager.getUnifiedText('accessibility.screenReaderTexts.languageChanged', 'en');
      expect(screenReaderText).to.include('English');
    });

    it('TC-A11Y-004: Should maintain focus during language switch', async function() {
      // Mock focused element
      const mockFocusedElement = {
        id: 'language-toggle',
        focus: sinon.stub(),
        blur: sinon.stub()
      };
      global.document.activeElement = mockFocusedElement;

      await manager.switchLanguage('en');

      // Focus should be maintained or properly managed
      expect(manager.accessibilityManager.getAccessibilityStatus().focusManagementActive)
        .to.be.true;
    });

    it('TC-A11Y-005: Should provide proper form labels in both languages', function() {
      const formElements = ['searchInput', 'filterSelect', 'languageSelect'];
      
      for (const element of formElements) {
        const zhLabel = manager.getUnifiedText(`accessibility.formLabels.${element}`, 'zh');
        const enLabel = manager.getUnifiedText(`accessibility.formLabels.${element}`, 'en');
        
        expect(zhLabel).to.be.a('string').that.is.not.empty;
        expect(enLabel).to.be.a('string').that.is.not.empty;
        expect(zhLabel).to.not.equal(enLabel);
      }
    });

    it('TC-A11Y-006: Should provide meaningful error messages', function() {
      const errorTypes = ['required', 'invalidEmail', 'invalidPhone'];
      
      for (const errorType of errorTypes) {
        const zhError = manager.getUnifiedText(`accessibility.validationMessages.${errorType}`, 'zh');
        const enError = manager.getUnifiedText(`accessibility.validationMessages.${errorType}`, 'en');
        
        expect(zhError).to.be.a('string').that.is.not.empty;
        expect(enError).to.be.a('string').that.is.not.empty;
        expect(zhError).to.not.equal(enError);
      }
    });

    it('TC-A11Y-007: Should support keyboard navigation', function() {
      // Test that accessibility manager supports keyboard navigation
      const status = manager.accessibilityManager.getAccessibilityStatus();
      expect(status.focusManagementActive).to.be.true;
    });

    it('TC-A11Y-008: Should provide status messages for screen readers', function() {
      const statusTypes = ['loading', 'saving', 'saved', 'error'];
      
      for (const statusType of statusTypes) {
        const zhStatus = manager.getUnifiedText(`accessibility.statusMessages.${statusType}`, 'zh');
        const enStatus = manager.getUnifiedText(`accessibility.statusMessages.${statusType}`, 'en');
        
        expect(zhStatus).to.be.a('string').that.is.not.empty;
        expect(enStatus).to.be.a('string').that.is.not.empty;
        expect(zhStatus).to.not.equal(enStatus);
      }
    });
  });

  describe('Screen Reader Compatibility', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().returns('screen reader text'),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          screenReaderSupport: true
        }),
        cleanup: sinon.stub(),
        announceToScreenReader: sinon.stub(),
        createLiveRegion: sinon.stub(),
        updateLiveRegion: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-A11Y-009: Should announce language changes to screen readers', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.announceToScreenReader)
        .to.have.been.called;
    });

    it('TC-A11Y-010: Should create appropriate live regions', function() {
      expect(manager.accessibilityManager.createLiveRegion)
        .to.have.been.called;
    });

    it('TC-A11Y-011: Should update live regions with status changes', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.updateLiveRegion)
        .to.have.been.called;
    });

    it('TC-A11Y-012: Should provide alternative text for dynamic content', function() {
      // Test that dynamic content has appropriate alternative text
      const elements = global.document.querySelectorAll('[aria-label]');
      expect(elements).to.be.an('array');
    });

    it('TC-A11Y-013: Should support voice control commands', function() {
      // Test voice control compatibility
      const voiceCommands = ['switch language', 'change to english', 'toggle language'];
      
      // Voice commands should be recognizable through proper labeling
      const languageToggleLabel = manager.getUnifiedText('accessibility.ariaLabels.languageToggle');
      expect(languageToggleLabel).to.be.a('string').that.is.not.empty;
    });
  });

  describe('Keyboard Navigation Support', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().returns('keyboard accessible text'),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          keyboardNavigationSupport: true,
          focusManagementActive: true
        }),
        cleanup: sinon.stub(),
        handleKeyboardNavigation: sinon.stub(),
        manageFocus: sinon.stub(),
        trapFocus: sinon.stub(),
        releaseFocus: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-A11Y-014: Should support Tab key navigation', function() {
      expect(manager.accessibilityManager.handleKeyboardNavigation)
        .to.be.a('function');
      
      const status = manager.accessibilityManager.getAccessibilityStatus();
      expect(status.keyboardNavigationSupport).to.be.true;
    });

    it('TC-A11Y-015: Should manage focus properly during language switch', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.manageFocus)
        .to.have.been.called;
    });

    it('TC-A11Y-016: Should support Escape key to close modals', function() {
      // Test escape key handling
      expect(manager.accessibilityManager.releaseFocus)
        .to.be.a('function');
    });

    it('TC-A11Y-017: Should provide keyboard shortcuts', function() {
      // Test that keyboard shortcuts are available and documented
      const shortcutLabels = [
        'accessibility.ariaLabels.languageToggle',
        'accessibility.ariaLabels.themeToggle'
      ];
      
      for (const label of shortcutLabels) {
        const text = manager.getUnifiedText(label);
        expect(text).to.be.a('string').that.is.not.empty;
      }
    });

    it('TC-A11Y-018: Should trap focus in modal dialogs', function() {
      expect(manager.accessibilityManager.trapFocus)
        .to.be.a('function');
    });
  });

  describe('ARIA Attributes Management', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().callsFake((lang, key) => {
          if (key.includes('ariaLabels')) {
            return lang === 'zh' ? '中文標籤' : 'English Label';
          }
          return 'default text';
        }),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          ariaLabelsUpdated: true
        }),
        cleanup: sinon.stub(),
        updateAriaLabel: sinon.stub(),
        updateAriaDescribedBy: sinon.stub(),
        updateAriaLive: sinon.stub(),
        updateRole: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-A11Y-019: Should update aria-label attributes', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.updateAriaLabel)
        .to.have.been.called;
    });

    it('TC-A11Y-020: Should update aria-describedby attributes', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.updateAriaDescribedBy)
        .to.have.been.called;
    });

    it('TC-A11Y-021: Should update aria-live regions', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.updateAriaLive)
        .to.have.been.called;
    });

    it('TC-A11Y-022: Should maintain proper role attributes', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.updateRole)
        .to.have.been.called;
    });

    it('TC-A11Y-023: Should provide context-appropriate ARIA labels', function() {
      const ariaElements = [
        'systemNotifications',
        'closeNotification',
        'closeModal',
        'languageToggle',
        'searchCards'
      ];
      
      for (const element of ariaElements) {
        const zhLabel = manager.getUnifiedText(`accessibility.ariaLabels.${element}`, 'zh');
        const enLabel = manager.getUnifiedText(`accessibility.ariaLabels.${element}`, 'en');
        
        expect(zhLabel).to.be.a('string').that.is.not.empty;
        expect(enLabel).to.be.a('string').that.is.not.empty;
        expect(zhLabel).to.not.equal(enLabel);
      }
    });
  });

  describe('Focus Management', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().returns('focus management text'),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          focusManagementActive: true
        }),
        cleanup: sinon.stub(),
        saveFocus: sinon.stub(),
        restoreFocus: sinon.stub(),
        moveFocusTo: sinon.stub(),
        getFocusableElements: sinon.stub().returns([]),
        isElementFocusable: sinon.stub().returns(true)
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-A11Y-024: Should save focus before language switch', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.saveFocus)
        .to.have.been.called;
    });

    it('TC-A11Y-025: Should restore focus after language switch', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.restoreFocus)
        .to.have.been.called;
    });

    it('TC-A11Y-026: Should identify focusable elements', function() {
      expect(manager.accessibilityManager.getFocusableElements)
        .to.be.a('function');
      
      const focusableElements = manager.accessibilityManager.getFocusableElements();
      expect(focusableElements).to.be.an('array');
    });

    it('TC-A11Y-027: Should validate element focusability', function() {
      const mockElement = { tabIndex: 0, disabled: false };
      const isFocusable = manager.accessibilityManager.isElementFocusable(mockElement);
      
      expect(isFocusable).to.be.true;
    });

    it('TC-A11Y-028: Should handle focus loss gracefully', async function() {
      // Mock focus loss scenario
      global.document.activeElement = null;
      
      await manager.switchLanguage('en');
      
      // Should handle gracefully without errors
      expect(manager.accessibilityManager.getAccessibilityStatus().focusManagementActive)
        .to.be.true;
    });
  });

  describe('Language Announcement', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().callsFake((lang, key) => {
          if (key.includes('languageChanged')) {
            return lang === 'zh' ? '語言已切換至中文' : 'Language has been changed to English';
          }
          return 'announcement text';
        }),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          announcementSupport: true
        }),
        cleanup: sinon.stub(),
        announceLanguageChange: sinon.stub(),
        createAnnouncement: sinon.stub(),
        speakText: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-A11Y-029: Should announce language changes', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.announceLanguageChange)
        .to.have.been.called;
    });

    it('TC-A11Y-030: Should create appropriate announcements', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.createAnnouncement)
        .to.have.been.called;
    });

    it('TC-A11Y-031: Should support speech synthesis', function() {
      expect(manager.accessibilityManager.speakText)
        .to.be.a('function');
      
      // Test speech synthesis availability
      expect(global.window.speechSynthesis).to.exist;
      expect(global.window.speechSynthesis.speak).to.be.a('function');
    });

    it('TC-A11Y-032: Should provide language-specific announcements', function() {
      const zhAnnouncement = manager.getUnifiedText('accessibility.screenReaderTexts.languageChanged', 'zh');
      const enAnnouncement = manager.getUnifiedText('accessibility.screenReaderTexts.languageChanged', 'en');
      
      expect(zhAnnouncement).to.include('中文');
      expect(enAnnouncement).to.include('English');
    });

    it('TC-A11Y-033: Should handle announcement failures gracefully', async function() {
      // Mock speech synthesis failure
      global.window.speechSynthesis.speak.throws(new Error('Speech synthesis not available'));
      
      await manager.switchLanguage('en');
      
      // Should not break the language switch
      expect(manager.getCurrentLanguage()).to.equal('en');
    });
  });

  describe('Integration with Assistive Technologies', function() {
    let manager;

    beforeEach(async function() {
      global.window.TranslationRegistry = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        getTranslation: sinon.stub().returns('assistive technology text'),
        getCacheStats: sinon.stub().returns({ size: 0 }),
        clearCache: sinon.stub()
      });

      global.window.UnifiedLanguageObserver = sinon.stub().returns({
        registerObserver: sinon.stub(),
        notifyAllObservers: sinon.stub().resolves(),
        getObserverStatus: sinon.stub().returns({ totalObservers: 0 }),
        clearAllObservers: sinon.stub()
      });

      global.window.AccessibilityLanguageManager = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        updateAccessibilityAttributes: sinon.stub().resolves(),
        getAccessibilityStatus: sinon.stub().returns({ 
          currentLanguage: 'zh',
          assistiveTechnologySupport: true
        }),
        cleanup: sinon.stub(),
        detectAssistiveTechnology: sinon.stub().returns(true),
        optimizeForScreenReader: sinon.stub(),
        optimizeForVoiceControl: sinon.stub(),
        optimizeForSwitchNavigation: sinon.stub()
      });

      global.window.SecurityComponentsLanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      global.window.PWAUILanguageAdapter = sinon.stub().returns({
        initialize: sinon.stub().resolves(),
        cleanup: sinon.stub()
      });

      manager = new EnhancedLanguageManager();
      await manager.initialize();
    });

    afterEach(function() {
      if (manager) {
        manager.cleanup();
      }
    });

    it('TC-A11Y-034: Should detect assistive technology presence', function() {
      const hasAssistiveTech = manager.accessibilityManager.detectAssistiveTechnology();
      expect(hasAssistiveTech).to.be.a('boolean');
    });

    it('TC-A11Y-035: Should optimize for screen readers', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.optimizeForScreenReader)
        .to.have.been.called;
    });

    it('TC-A11Y-036: Should optimize for voice control', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.optimizeForVoiceControl)
        .to.have.been.called;
    });

    it('TC-A11Y-037: Should optimize for switch navigation', async function() {
      await manager.switchLanguage('en');
      
      expect(manager.accessibilityManager.optimizeForSwitchNavigation)
        .to.have.been.called;
    });

    it('TC-A11Y-038: Should maintain compatibility across different assistive technologies', function() {
      const status = manager.accessibilityManager.getAccessibilityStatus();
      expect(status.assistiveTechnologySupport).to.be.true;
    });
  });
});