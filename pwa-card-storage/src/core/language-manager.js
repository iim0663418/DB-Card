/**
 * PWA 語言管理器
 * 負責處理介面語言切換、文字翻譯和語言偏好儲存
 */

class LanguageManager {
  constructor() {
    this.currentLanguage = this.detectBrowserLanguage();
    this.translations = this.initializeTranslations();
    this.observers = [];
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
        appTitle: 'NFC 數位名片',
        appSubtitle: '離線儲存服務',
        themeToggle: '主題切換',
        languageToggle: '語言切換',
        syncData: '同步資料',
        settings: '設定',

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
        lastSync: '最後同步',
        quickActions: '快速操作',
        addCard: '新增名片',
        addCardDesc: '從 URL 或檔案新增',
        importFile: '匯入檔案',
        importFileDesc: '批次匯入名片',
        backupData: '備份資料',
        backupDataDesc: '匯出所有名片',

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
        appTitle: 'NFC Digital Card',
        appSubtitle: 'Offline Storage Service',
        themeToggle: 'Toggle Theme',
        languageToggle: 'Switch Language',
        syncData: 'Sync Data',
        settings: 'Settings',

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
        lastSync: 'Last Sync',
        quickActions: 'Quick Actions',
        addCard: 'Add Card',
        addCardDesc: 'Add from URL or file',
        importFile: 'Import File',
        importFileDesc: 'Batch import cards',
        backupData: 'Backup Data',
        backupDataDesc: 'Export all cards',

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
  switchLanguage(lang) {
    if (!['zh', 'en'].includes(lang)) {
      console.warn('[LanguageManager] Invalid language:', lang);
      return;
    }

    this.currentLanguage = lang;
    
    // 更新 HTML 語言屬性
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
    
    // 儲存使用者語言偏好
    localStorage.setItem('pwa-language', lang);
    
    // 更新所有 UI 元素
    this.updateAllUIElements();
    
    // 通知觀察者
    this.notifyObservers(lang);
    
    return lang;
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
  getText(key, lang = null) {
    const targetLang = lang || this.currentLanguage;
    const translation = this.translations[targetLang];
    
    if (!translation) {
      console.warn('[LanguageManager] Language not found:', targetLang);
      return key;
    }
    
    if (!translation[key]) {
      console.warn('[LanguageManager] Translation key not found:', key);
      return key;
    }
    
    return translation[key];
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
    this.updateButtonTitle('sync-button', 'syncData');
    this.updateButtonTitle('settings-button', 'settings');
    
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
      { id: 'stat-last-sync', key: 'lastSync' }
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
      { titleId: 'action-backup-all', descId: 'action-backup-all-desc', titleKey: 'backupData', descKey: 'backupDataDesc' }
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

    exportLabels.forEach(({ id, key }) => {
      this.updateElement(id, key);
    });
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

  /**
   * 初始化語言管理器
   */
  initialize() {
    // 設定初始語言
    document.documentElement.lang = this.currentLanguage === 'zh' ? 'zh-TW' : 'en';
    
    // 延遲更新 UI，確保 DOM 已載入
    setTimeout(() => {
      this.updateAllUIElements();
    }, 100);
    
    console.log('[LanguageManager] Initialized with language:', this.currentLanguage);
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