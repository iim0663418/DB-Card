/**
 * PWA 語言管理器
 * 負責處理介面語言切換、文字翻譯和語言偏好儲存
 */

class LanguageManager {
  constructor(config = {}) {
    this.currentLanguage = this.detectBrowserLanguage();
    this.translations = this.initializeTranslations();
    this.observers = [];
    
    // Performance optimization components
    this.performanceCollector = null;
    this.smartCache = null;
    this.domUpdater = null;
    this.performanceConfig = {
      enablePerformanceMetrics: config.enablePerformanceMetrics !== false,
      enableSmartCache: config.enableSmartCache !== false,
      enableIncrementalUpdates: config.enableIncrementalUpdates !== false,
      ...config.performance
    };
    
    // Initialize translation validator if available
    this.translationValidator = null;
    this.securityConfig = {
      enableXssProtection: config.enableXssProtection !== false,
      enableInputValidation: config.enableInputValidation !== false,
      logSecurityEvents: config.logSecurityEvents !== false,
      ...config.security
    };

    // Initialize performance components
    this.initializePerformanceComponents();

    // Initialize validator if TranslationValidator is available
    if (typeof TranslationValidator !== 'undefined') {
      this.translationValidator = new TranslationValidator({
        enableXssProtection: this.securityConfig.enableXssProtection,
        logLevel: config.logLevel || 'warn'
      });
      
      // Run initial validation if configured
      if (config.validateOnInit !== false) {
        this._runInitialValidation();
      }
    }

    // Security audit logging
    if (this.securityConfig.logSecurityEvents) {
      console.info('[LanguageManager] Initialized with security config:', {
        xssProtection: this.securityConfig.enableXssProtection,
        inputValidation: this.securityConfig.enableInputValidation,
        validatorAvailable: !!this.translationValidator,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Initialize performance optimization components
   * @private
   */
  initializePerformanceComponents() {
    try {
      // Initialize Performance Metrics Collector
      if (this.performanceConfig.enablePerformanceMetrics && window.PerformanceMetricsCollector) {
        this.performanceCollector = new window.PerformanceMetricsCollector({
          slaTarget: 150, // 150ms language switching target
          enableDashboard: true
        });
      }

      // Initialize Smart Cache Manager
      if (this.performanceConfig.enableSmartCache && window.SmartCacheManager) {
        this.smartCache = new window.SmartCacheManager({
          maxSize: 50, // Max 50 translation sets
          maxMemoryMB: 5, // Max 5MB for translations
          defaultTTL: 10 * 60 * 1000, // 10 minutes TTL for translations
          targetHitRate: 0.9 // 90% target hit rate
        });

        // Connect performance collector to cache
        if (this.performanceCollector) {
          this.smartCache.setPerformanceCollector(this.performanceCollector);
        }
      }

      // Initialize Incremental DOM Updater
      if (this.performanceConfig.enableIncrementalUpdates && window.IncrementalDOMUpdater) {
        this.domUpdater = new window.IncrementalDOMUpdater({
          updateTimeout: 100, // 100ms SLA for DOM updates
          enableAccessibility: true,
          enableAnimations: true
        });

        // Connect performance collector to DOM updater
        if (this.performanceCollector) {
          this.domUpdater.setPerformanceCollector(this.performanceCollector);
        }

        // Scan and register existing translation elements
        setTimeout(() => {
          if (this.domUpdater) {
            const elementCount = this.domUpdater.scanAndRegisterAll();
            console.info(`[LanguageManager] Registered ${elementCount} translation elements for incremental updates`);
          }
        }, 100);
      }

    } catch (error) {
      console.warn('[LanguageManager] Failed to initialize performance components:', error);
    }
  }

  /**
   * Run initial translation validation
   * @private
   */
  _runInitialValidation() {
    if (!this.translationValidator) return;

    try {
      const validationResult = this.translationValidator.validateTranslationCompleteness(
        this.translations,
        this._getRequiredTranslationKeys()
      );

      if (!validationResult.isValid && this.securityConfig.logSecurityEvents) {
        console.warn('[LanguageManager] Translation validation failed:', {
          missingKeys: validationResult.missingKeys,
          warnings: validationResult.warnings,
          errors: validationResult.errors
        });
      }

      return validationResult;
    } catch (error) {
      console.error('[LanguageManager] Validation error:', error);
      return null;
    }
  }

  /**
   * Get required translation keys for validation
   * @private
   * @returns {Array<string>} Required keys
   */
  _getRequiredTranslationKeys() {
    return [
      'appTitle', 'appSubtitle', 'themeToggle', 'languageToggle',
      'cardSaved', 'cardImported', 'cardExported', 'qrGenerated',
      'home', 'cards', 'import', 'export', 'searchCards',
      'onlineMode', 'offlineMode', 'storageOk', 'storageLow'
    ];
  }

  /**
   * 偵測瀏覽器語言偏好
   */
  detectBrowserLanguage() {
    // 檢查是否有儲存的使用者偏好
    const savedLang = localStorage.getItem('pwa-language');
    if (savedLang && ['zh', 'en'].includes(savedLang)) {
      return savedLang;
    }
    
    // 否則偵測瀏覽器語言
    const userLang = (navigator.language || navigator.userLanguage || navigator.browserLanguage || '').toLowerCase();
    const detectedLang = /^en(-[a-z]{2})?$/.test(userLang) ? 'en' : 'zh';
    
    return detectedLang;
  }

  /**
   * 初始化翻譯字典
   */
  initializeTranslations() {
    return {
      zh: {
        // 標題列
        appTitle: '數位名片收納',
        appSubtitle: '離線儲存中心',
        themeToggle: '主題切換',
        languageToggle: '語言切換',
        backToHome: '回到首頁',

        // 導航
        home: '首頁',
        cards: '名片',
        import: '匯入',
        export: '匯出',

        // 首頁
        welcomeTitle: '歡迎使用離線名片儲存',
        welcomeDesc: '安全地儲存和管理您的數位名片，完全離線運作',
        totalCards: '已儲存名片',
        storageUsed: '儲存空間',
        appVersion: '應用版本',
        quickActions: '快速操作',
        addCard: '新增名片',
        addCardDesc: '從 URL 或檔案新增',
        importFile: '匯入檔案',
        importFileDesc: '批次匯入名片',
        backupData: '備份資料',
        backupDataDesc: '匯出所有名片',
        securitySettings: '安全設定',
        securitySettingsDesc: '管理安全功能與隱私',

        // 名片頁面
        myCards: '我的名片',
        searchCards: '搜尋名片...',
        allTypes: '所有類型',
        govYanping: '機關版-延平',
        govShinGuang: '機關版-新光',
        personal: '個人版',
        bilingual: '雙語版',

        // 匯入頁面
        importCards: '匯入名片',
        importFromUrl: '從 URL 匯入',
        urlPlaceholder: '貼上名片連結...',
        importFromFile: '從檔案匯入',
        chooseFile: '選擇檔案',
        import: '匯入',

        // 匯出頁面
        exportCards: '匯出名片',
        exportOptions: '匯出選項',
        exportAll: '匯出所有名片',
        includeVersions: '包含版本歷史',
        encryptFile: '加密匯出檔案',
        exportFormat: '匯出格式',
        jsonFormat: 'JSON 格式',
        vcardFormat: 'vCard 格式',
        bothFormats: '兩種格式',
        startExport: '開始匯出',

        // 名片詳細資訊
        cardDetails: '名片詳細資訊',
        avatar: '大頭貼',
        email: '電子郵件',
        phone: '電話',
        mobile: '手機',
        address: '地址',
        greetings: '問候語',
        social: '社群連結',
        generateQR: '生成 QR 碼',
        downloadVCard: '下載 vCard',

        // QR 碼
        qrCode: 'QR 碼',
        downloadQR: '下載 QR 碼',
        copyLink: '複製連結',
        qrTip: '掃描此 QR 碼即可開啟數位名片',

        // 狀態
        onlineMode: '線上模式',
        offlineMode: '離線模式',
        storageOk: '儲存空間充足',
        storageLow: '儲存空間不足',
        never: '從未',
        synced: '已同步',

        // 通知訊息
        cardSaved: '名片已儲存',
        cardImported: '名片匯入成功',
        cardExported: '匯出成功',
        qrGenerated: 'QR 碼已生成',
        qrDownloaded: 'QR 碼已下載',
        linkCopied: '連結已複製到剪貼簿',
        vcardDownloaded: 'vCard 已下載',
        switchedToChinese: '已切換至中文',
        switchedToLight: '已切換至淺色模式',
        switchedToDark: '已切換至深色模式',

        // 錯誤訊息
        importFailed: '匯入失敗',
        exportFailed: '匯出失敗',
        qrFailed: 'QR 碼生成失敗',
        copyFailed: '複製失敗',
        initFailed: '應用程式初始化失敗',
        cardNotFound: '名片不存在',
        invalidUrl: '請輸入名片連結',

        // 重複處理對話框
        duplicateFound: '發現重複名片',
        duplicateDetected: '檢測到',
        similarCards: '張相似名片',
        batchProcessing: '批量處理模式',
        existingCard: '現有名片',
        newCard: '新名片',
        createdTime: '建立時間',
        version: '版本',
        aboutToImport: '即將匯入',
        skip: '跳過',
        skipDesc: '保留現有名片，不匯入新名片',
        overwrite: '覆蓋',
        overwriteDesc: '用新名片資料覆蓋現有名片',
        createVersion: '新版本',
        createVersionDesc: '建立新版本，保留兩張名片',
        applyToAll: '將此選擇套用到所有重複項目',
        applyToAllBtn: '套用到全部',
        selectAction: '請先選擇一個處理方式',
        closeDialog: '關閉對話框',
        unknown: '未知',

        // 安全組件翻譯
        'security.benefits': '優點：',
        'security.risks': '注意事項：',
        'security.title': '安全設定',
        'security.closeLabel': '關閉設定',
        'security.restartNotice': '⚠️ 某些設定需要重新載入頁面才能生效',
        'security.exportButton': '匯出設定',
        'security.resetButton': '重設為預設值',
        'security.saveButton': '儲存並關閉',

        // 其他
        processing: '處理中...',
        loading: '載入中...',
        close: '關閉',
        confirm: '確定',
        cancel: '取消',
        delete: '刪除',
        edit: '編輯',
        save: '儲存',
        openSource: 'moda 開源專案'
      },
      en: {
        // Header
        appTitle: 'Digital Card Hub',
        appSubtitle: 'Offline Storage Center',
        themeToggle: 'Toggle Theme',
        languageToggle: 'Switch Language',
        backToHome: 'Back to Home',

        // Navigation
        home: 'Home',
        cards: 'Cards',
        import: 'Import',
        export: 'Export',

        // Home Page
        welcomeTitle: 'Welcome to Offline Card Storage',
        welcomeDesc: 'Securely store and manage your digital business cards, completely offline',
        totalCards: 'Stored Cards',
        storageUsed: 'Storage Used',
        appVersion: 'App Version',
        quickActions: 'Quick Actions',
        addCard: 'Add Card',
        addCardDesc: 'Add from URL or file',
        importFile: 'Import File',
        importFileDesc: 'Batch import cards',
        backupData: 'Backup Data',
        backupDataDesc: 'Export all cards',
        securitySettings: 'Security Settings',
        securitySettingsDesc: 'Manage security and privacy',

        // Cards Page
        myCards: 'My Cards',
        searchCards: 'Search cards...',
        allTypes: 'All Types',
        govYanping: 'Gov-Yanping',
        govShinGuang: 'Gov-ShinGuang',
        personal: 'Personal',
        bilingual: 'Bilingual',

        // Import Page
        importCards: 'Import Cards',
        importFromUrl: 'Import from URL',
        urlPlaceholder: 'Paste card link...',
        importFromFile: 'Import from File',
        chooseFile: 'Choose File',
        import: 'Import',

        // Export Page
        exportCards: 'Export Cards',
        exportOptions: 'Export Options',
        exportAll: 'Export all cards',
        includeVersions: 'Include version history',
        encryptFile: 'Encrypt export file',
        exportFormat: 'Export Format',
        jsonFormat: 'JSON Format',
        vcardFormat: 'vCard Format',
        bothFormats: 'Both Formats',
        startExport: 'Start Export',

        // Card Details
        cardDetails: 'Card Details',
        avatar: 'Avatar',
        email: 'Email',
        phone: 'Phone',
        mobile: 'Mobile',
        address: 'Address',
        greetings: 'Greetings',
        social: 'Social Links',
        generateQR: 'Generate QR',
        downloadVCard: 'Download vCard',

        // QR Code
        qrCode: 'QR Code',
        downloadQR: 'Download QR Code',
        copyLink: 'Copy Link',
        qrTip: 'Scan this QR code to open the digital business card',

        // Status
        onlineMode: 'Online Mode',
        offlineMode: 'Offline Mode',
        storageOk: 'Storage Available',
        storageLow: 'Storage Low',
        never: 'Never',
        synced: 'Synced',

        // Notifications
        cardSaved: 'Card saved',
        cardImported: 'Card imported successfully',
        cardExported: 'Export successful',
        qrGenerated: 'QR code generated',
        qrDownloaded: 'QR code downloaded',
        linkCopied: 'Link copied to clipboard',
        vcardDownloaded: 'vCard downloaded',
        switchedToEnglish: 'Switched to English',
        switchedToLight: 'Switched to light mode',
        switchedToDark: 'Switched to dark mode',

        // Error Messages
        importFailed: 'Import failed',
        exportFailed: 'Export failed',
        qrFailed: 'QR code generation failed',
        copyFailed: 'Copy failed',
        initFailed: 'Application initialization failed',
        cardNotFound: 'Card not found',
        invalidUrl: 'Please enter card link',

        // Duplicate Dialog
        duplicateFound: 'Duplicate Card Found',
        duplicateDetected: 'Detected',
        similarCards: 'similar cards',
        batchProcessing: 'Batch Processing Mode',
        existingCard: 'Existing Card',
        newCard: 'New Card',
        createdTime: 'Created',
        version: 'Version',
        aboutToImport: 'About to import',
        skip: 'Skip',
        skipDesc: 'Keep existing card, do not import new card',
        overwrite: 'Overwrite',
        overwriteDesc: 'Replace existing card with new card data',
        createVersion: 'New Version',
        createVersionDesc: 'Create new version, keep both cards',
        applyToAll: 'Apply this choice to all duplicate items',
        applyToAllBtn: 'Apply to All',
        selectAction: 'Please select an action first',
        closeDialog: 'Close Dialog',
        unknown: 'Unknown',

        // Security components translations
        'security.benefits': 'Benefits:',
        'security.risks': 'Considerations:',
        'security.title': 'Security Settings',
        'security.closeLabel': 'Close Settings',
        'security.restartNotice': '⚠️ Some settings require page reload to take effect',
        'security.exportButton': 'Export Settings',
        'security.resetButton': 'Reset to Defaults',
        'security.saveButton': 'Save and Close',

        // Others
        processing: 'Processing...',
        loading: 'Loading...',
        close: 'Close',
        confirm: 'Confirm',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        save: 'Save',
        openSource: 'moda Open Source'
      }
    };
  }

  /**
   * 獲取當前語言
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * 切換語言
   */
  async switchLanguage(lang) {
    if (!['zh', 'en'].includes(lang)) {
      console.warn('[LanguageManager] Invalid language:', lang);
      return;
    }

    const fromLanguage = this.currentLanguage;
    let performanceMarker = null;

    // Start performance measurement
    if (this.performanceCollector) {
      performanceMarker = this.performanceCollector.startLanguageSwitching(fromLanguage, lang);
    }

    try {
      this.currentLanguage = lang;
      
      // Record memory usage before switch
      if (this.performanceCollector) {
        this.performanceCollector.recordMemoryMetric('before-language-switch');
      }
      
      // Check cache for translations first
      let translations = null;
      if (this.smartCache) {
        translations = this.smartCache.get(`translations-${lang}`);
      }
      
      // If not in cache, get from memory/storage
      if (!translations) {
        translations = this.translations[lang] || {};
        
        // Cache the translations
        if (this.smartCache) {
          this.smartCache.set(`translations-${lang}`, translations, 10 * 60 * 1000); // 10 min TTL
        }
      }
      
      // 更新 HTML 語言屬性
      document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
      
      // 儲存使用者語言偏好
      localStorage.setItem('pwa-language', lang);
      
      // Use incremental DOM updates if available, otherwise fallback to full update
      if (this.domUpdater) {
        const updateResult = await this.domUpdater.updateTranslations(translations, fromLanguage, lang);
        
        if (!updateResult.success) {
          console.warn('[LanguageManager] Incremental update failed, falling back to full update:', updateResult.error);
          this.updateAllUIElements();
        }
      } else {
        // 更新所有 UI 元素 (fallback)
        this.updateAllUIElements();
      }
      
      // Record memory usage after switch
      if (this.performanceCollector) {
        this.performanceCollector.recordMemoryMetric('after-language-switch');
      }
      
      // 通知觀察者
      this.notifyObservers(lang);
      
      // Complete performance measurement
      if (performanceMarker) {
        performanceMarker.complete({
          cacheHit: translations ? true : false,
          updateMethod: this.domUpdater ? 'incremental' : 'full'
        });
      }
      
      return lang;
      
    } catch (error) {
      console.error('[LanguageManager] Language switch failed:', error);
      
      // Complete performance measurement with error
      if (performanceMarker) {
        performanceMarker.complete({
          error: error.message,
          success: false
        });
      }
      
      throw error;
    }
  }

  /**
   * 切換語言（中英文互換）
   */
  toggleLanguage() {
    const newLang = this.currentLanguage === 'zh' ? 'en' : 'zh';
    return this.switchLanguage(newLang);
  }

  /**
   * 獲取翻譯文字
   */
  getText(key, lang = null, options = {}) {
    // Input validation and sanitization for security
    if (typeof key !== 'string' || key.trim() === '') {
      console.warn('[LanguageManager] Invalid translation key:', key);
      return options.fallback || key || '';
    }

    // Sanitize key to prevent injection attacks
    const sanitizedKey = key.replace(/[<>\"'&]/g, '').trim();
    if (sanitizedKey !== key) {
      console.warn('[LanguageManager] Key sanitized from:', key, 'to:', sanitizedKey);
    }

    const targetLang = lang || this.currentLanguage;
    
    // Validate language code
    if (!['zh', 'en'].includes(targetLang)) {
      console.warn('[LanguageManager] Invalid language code:', targetLang);
      return options.fallback || sanitizedKey;
    }

    const translation = this.translations[targetLang];
    
    if (!translation) {
      console.warn('[LanguageManager] Language not found:', targetLang);
      return options.fallback || sanitizedKey;
    }
    
    if (!translation[sanitizedKey]) {
      console.warn('[LanguageManager] Translation key not found:', sanitizedKey);
      return options.fallback || sanitizedKey;
    }
    
    let translatedText = translation[sanitizedKey];
    
    // XSS prevention - sanitize output if enabled
    if (options.escapeHtml !== false) {
      translatedText = this._sanitizeTranslationOutput(translatedText);
    }

    // String interpolation if provided
    if (options.interpolation && typeof options.interpolation === 'object') {
      Object.keys(options.interpolation).forEach(placeholder => {
        const value = this._sanitizeTranslationOutput(options.interpolation[placeholder]);
        translatedText = translatedText.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value);
      });
    }
    
    return translatedText;
  }

  /**
   * Sanitize translation output to prevent XSS attacks
   * @param {string} text - Raw translation text
   * @returns {string} Sanitized text
   */
  _sanitizeTranslationOutput(text) {
    if (typeof text !== 'string') {
      return text;
    }

    // Basic HTML encoding for XSS prevention
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * 更新所有 UI 元素
   */
  updateAllUIElements() {
    // 更新標題列
    this.updateElement('app-title', 'appTitle');
    this.updateElement('app-subtitle', 'appSubtitle');
    
    // 更新按鈕標題
    this.updateButtonTitle('theme-toggle', 'themeToggle');
    this.updateButtonTitle('lang-toggle', 'languageToggle');
    this.updateButtonTitle('settings-button', 'backToHome');
    
    // 更新導航
    this.updateNavigation();
    
    // 更新當前頁面內容
    this.updateCurrentPageContent();
    
    // 更新語言切換按鈕
    this.updateLanguageButton();
    
    // 更新狀態列
    this.updateStatusBar();
  }

  /**
   * 更新導航標籤
   */
  updateNavigation() {
    const navItems = [
      { id: 'nav-home', key: 'home' },
      { id: 'nav-cards', key: 'cards' },
      { id: 'nav-import', key: 'import' },
      { id: 'nav-export', key: 'export' }
    ];

    navItems.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element) {
        const label = element.querySelector('.nav-label');
        if (label) {
          label.textContent = this.getText(key);
        }
      }
    });
  }

  /**
   * 更新當前頁面內容
   */
  updateCurrentPageContent() {
    // 首頁
    this.updateElement('welcome-title', 'welcomeTitle', 'h2');
    this.updateElement('welcome-desc', 'welcomeDesc', 'p');
    
    // 統計標籤
    this.updateStatLabels();
    
    // 快速操作
    this.updateQuickActions();
    
    // 頁面標題
    this.updatePageTitles();
    
    // 表單元素
    this.updateFormElements();
  }

  /**
   * 更新統計標籤
   */
  updateStatLabels() {
    const statElements = [
      { id: 'stat-total-cards', key: 'totalCards' },
      { id: 'stat-storage-used', key: 'storageUsed' },
      { id: 'stat-app-version', key: 'appVersion' }
    ];
    
    statElements.forEach(({ id, key }) => {
      this.updateElement(id, key);
    });
  }

  /**
   * 更新快速操作
   */
  updateQuickActions() {
    // 快速操作標題
    this.updateElement('quick-actions-title', 'quickActions');

    // 操作卡片
    const actionElements = [
      { titleId: 'action-add-card', descId: 'action-add-card-desc', titleKey: 'addCard', descKey: 'addCardDesc' },
      { titleId: 'action-import-file', descId: 'action-import-file-desc', titleKey: 'importFile', descKey: 'importFileDesc' },
      { titleId: 'action-backup-all', descId: 'action-backup-all-desc', titleKey: 'backupData', descKey: 'backupDataDesc' },
      { titleId: 'action-security-settings', descId: 'action-security-settings-desc', titleKey: 'securitySettings', descKey: 'securitySettingsDesc' }
    ];

    actionElements.forEach(({ titleId, descId, titleKey, descKey }) => {
      this.updateElement(titleId, titleKey);
      this.updateElement(descId, descKey);
    });
  }

  /**
   * 更新頁面標題
   */
  updatePageTitles() {
    const pageTitles = [
      { id: 'page-cards-title', key: 'myCards' },
      { id: 'page-import-title', key: 'importCards' },
      { id: 'page-export-title', key: 'exportCards' }
    ];

    pageTitles.forEach(({ id, key }) => {
      this.updateElement(id, key);
    });
  }

  /**
   * 更新表單元素
   */
  updateFormElements() {
    // 搜尋輸入框
    const searchInput = document.getElementById('card-search');
    if (searchInput) {
      searchInput.placeholder = this.getText('searchCards');
    }

    // URL 輸入框
    const urlInput = document.getElementById('import-url');
    if (urlInput) {
      urlInput.placeholder = this.getText('urlPlaceholder');
    }

    // 篩選選擇器
    this.updateFilterSelect();

    // 按鈕文字
    this.updateButtonTexts();

    // 匯入/匯出標題
    this.updateImportExportTitles();

    // 匯出選項
    this.updateExportOptions();
  }

  /**
   * 更新篩選選擇器
   */
  updateFilterSelect() {
    const filterSelect = document.getElementById('card-filter');
    if (filterSelect) {
      const options = filterSelect.querySelectorAll('option');
      const keys = ['allTypes', 'govYanping', 'govShinGuang', 'personal', 'bilingual'];
      
      options.forEach((option, index) => {
        if (keys[index]) {
          option.textContent = this.getText(keys[index]);
        }
      });
    }
  }

  /**
   * 更新按鈕文字
   */
  updateButtonTexts() {
    const buttons = [
      { id: 'import-url-btn', key: 'import' },
      { id: 'import-file-btn', key: 'chooseFile' },
      { id: 'export-btn', key: 'startExport' }
    ];

    buttons.forEach(({ id, key }) => {
      this.updateElement(id, key);
    });
  }

  /**
   * 更新匯入/匯出標題
   */
  updateImportExportTitles() {
    const titles = [
      { id: 'import-url-title', key: 'importFromUrl' },
      { id: 'import-file-title', key: 'importFromFile' },
      { id: 'export-options-title', key: 'exportOptions' }
    ];

    titles.forEach(({ id, key }) => {
      this.updateElement(id, key);
    });
  }

  /**
   * 更新匯出選項
   */
  updateExportOptions() {
    const exportLabels = [
      { id: 'export-all-label', key: 'exportAll' },
      { id: 'export-versions-label', key: 'includeVersions' },
      { id: 'export-encrypt-label', key: 'encryptFile' }
    ];
    
    // 更新格式選擇選項
    this.updateSelectOptions();

    exportLabels.forEach(({ id, key }) => {
      this.updateElement(id, key);
    });
  }

  /**
   * 更新選擇框選項
   */
  updateSelectOptions() {
    const formatSelect = document.getElementById('export-format');
    if (formatSelect) {
      const options = formatSelect.querySelectorAll('option');
      if (options.length >= 3) {
        options[0].textContent = this.getText('jsonFormat');
        options[1].textContent = this.getText('vcardFormat');
        options[2].textContent = this.getText('bothFormats');
      }
    }
    
    // 更新格式選擇標籤
    const formatLabel = document.querySelector('label[for="export-format"]');
    if (formatLabel) {
      formatLabel.textContent = this.getText('exportFormat') + ':';
    }
  }

  /**
   * 更新語言切換按鈕
   */
  updateLanguageButton() {
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      const icon = langToggle.querySelector('.icon');
      if (icon) {
        icon.textContent = this.currentLanguage === 'zh' ? 'EN' : '中';
      }
      langToggle.title = this.getText('languageToggle');
      
      // 添加切換動畫效果
      langToggle.classList.add('switching');
      setTimeout(() => {
        langToggle.classList.remove('switching');
      }, 600);
    }
  }

  /**
   * 更新狀態列
   */
  updateStatusBar() {
    // 連線狀態
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
      const isOnline = connectionStatus.classList.contains('online');
      connectionStatus.textContent = this.getText(isOnline ? 'onlineMode' : 'offlineMode');
    }

    // 儲存狀態
    const storageStatus = document.getElementById('storage-status');
    if (storageStatus) {
      const isLow = storageStatus.classList.contains('text-warning');
      storageStatus.textContent = this.getText(isLow ? 'storageLow' : 'storageOk');
    }

    // 開源專案連結
    const openSourceLink = document.querySelector('.app-info span');
    if (openSourceLink) {
      openSourceLink.textContent = `🇹🇼 ${this.getText('openSource')}`;
    }
  }

  /**
   * 更新單個元素
   */
  updateElement(id, key, tagName = null) {
    let element = document.getElementById(id);
    
    // 如果沒有找到 ID，嘗試用標籤名稱查找
    if (!element && tagName) {
      const elements = document.querySelectorAll(tagName);
      element = Array.from(elements).find(el => el.textContent.includes(this.getText(key, 'zh')) || el.textContent.includes(this.getText(key, 'en')));
    }
    
    if (element) {
      element.textContent = this.getText(key);
    }
  }

  /**
   * 更新按鈕標題
   */
  updateButtonTitle(id, key) {
    const button = document.getElementById(id);
    if (button) {
      button.title = this.getText(key);
    }
  }

  /**
   * 註冊語言變更觀察者
   */
  addObserver(callback) {
    if (typeof callback === 'function') {
      this.observers.push(callback);
    }
  }

  /**
   * 移除語言變更觀察者
   */
  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * 通知所有觀察者
   */
  notifyObservers(language) {
    this.observers.forEach(callback => {
      try {
        callback(language);
      } catch (error) {
        console.error('[LanguageManager] Observer callback error:', error);
      }
    });
  }

  /**
   * 獲取本地化的通知訊息
   */
  getNotificationMessage(type, data = {}) {
    const messages = {
      cardSaved: () => this.getText('cardSaved'),
      cardImported: () => this.getText('cardImported'),
      cardExported: () => this.getText('cardExported'),
      qrGenerated: () => this.getText('qrGenerated'),
      qrDownloaded: () => this.getText('qrDownloaded'),
      linkCopied: () => this.getText('linkCopied'),
      vcardDownloaded: () => this.getText('vcardDownloaded'),
      languageChanged: () => this.getText(this.currentLanguage === 'zh' ? 'switchedToChinese' : 'switchedToEnglish'),
      themeChanged: (isDark) => this.getText(isDark ? 'switchedToDark' : 'switchedToLight'),
      importFailed: () => this.getText('importFailed'),
      exportFailed: () => this.getText('exportFailed'),
      qrFailed: () => this.getText('qrFailed'),
      copyFailed: () => this.getText('copyFailed'),
      initFailed: () => this.getText('initFailed'),
      cardNotFound: () => this.getText('cardNotFound'),
      invalidUrl: () => this.getText('invalidUrl')
    };

    const messageFunc = messages[type];
    if (messageFunc) {
      return messageFunc(data);
    }
    
    return type; // 回傳原始訊息作為備用
  }

  initialize() {
    document.documentElement.lang = this.currentLanguage === 'zh' ? 'zh-TW' : 'en';
    setTimeout(() => this.updateAllUIElements(), 50);
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics() {
    const metrics = {
      performanceCollector: null,
      smartCache: null,
      domUpdater: null
    };

    if (this.performanceCollector) {
      metrics.performanceCollector = this.performanceCollector.getPerformanceSummary();
    }

    if (this.smartCache) {
      metrics.smartCache = this.smartCache.getStatistics();
    }

    if (this.domUpdater) {
      metrics.domUpdater = this.domUpdater.getStatistics();
    }

    return metrics;
  }

  /**
   * Optimize performance components
   */
  optimizePerformance() {
    const results = {};

    if (this.smartCache) {
      results.cache = this.smartCache.optimize();
    }

    if (this.performanceCollector) {
      results.metrics = this.performanceCollector.getPerformanceSummary();
    }

    return results;
  }

  /**
   * Cleanup resources and observers for proper memory management
   */
  cleanup() {
    try {
      // Clean up observers
      this.observers.forEach(observer => {
        if (typeof observer.disconnect === 'function') {
          observer.disconnect();
        } else if (typeof observer.cleanup === 'function') {
          observer.cleanup();
        }
      });
      this.observers = [];

      // Clean up performance components
      if (this.performanceCollector) {
        this.performanceCollector.cleanup();
        this.performanceCollector = null;
      }

      if (this.smartCache) {
        this.smartCache.cleanup();
        this.smartCache = null;
      }

      if (this.domUpdater) {
        this.domUpdater.cleanup();
        this.domUpdater = null;
      }

      // Clear references for garbage collection
      this.translations = null;
      this.translationValidator = null;

      console.info('[LanguageManager] Cleanup completed');
    } catch (error) {
      console.error('[LanguageManager] Cleanup failed:', error);
    }
  }
}

// 全域實例
window.languageManager = new LanguageManager();

// 自動初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.languageManager.initialize();
  });
} else {
  window.languageManager.initialize();
}