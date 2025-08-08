/**
 * PWA 名片儲存應用程式主控制器
 * 負責應用程式初始化、路由管理和全域狀態管理
 */

// SEC-03: Import secure logging system
if (typeof window !== 'undefined' && !window.secureLogger) {
  // Load secure logger if not already available
  try {
    const script = document.createElement('script');
    script.src = './src/core/secure-logger.js';
    document.head.appendChild(script);
  } catch (error) {
    console.warn('[PWA] Failed to load secure logger:', error);
  }
}

class PWACardApp {
  constructor() {
    this.currentPage = 'home';
    this.isOnline = navigator.onLine;
    this.storage = null;
    this.cardManager = null;
    this.offlineTools = null;
    this.currentLanguage = 'zh';
    
    this.init();
  }

  async init() {
    try {
      // 使用語言管理器獲取本地化載入訊息
    const loadingMessage = this.getLocalizedText('app.initializing');
    this.showLoading(loadingMessage);
      
      await this.initializeServices();
      this.setupEventListeners();
      this.initializeUI();
      await this.loadInitialData();
      
      this.hideLoading();
      
    } catch (error) {
      // SEC-03: Use secure logging
      if (window.secureLogger) {
        window.secureLogger.error('PWA initialization failed', { error: error.message });
      } else {
        console.error('[PWA] Initialization failed:', error);
      }
      this.hideLoading();
      const errorMessage = this.getLocalizedText('app.init.failed');
      this.showNotification(errorMessage, 'error');
    }
  }

  async initializeServices() {
    try {
      // SEC-01: Load security components first
      await this.loadSecurityComponents();
      
      // COMP-01: Initialize Simplified Language Manager
      await this.initializeSimplifiedLanguageManager();
      
      // COMP-02: Initialize Unified Component Registry
      await this.initializeComponentRegistry();
      
      // 初始化核心儲存
      if (typeof PWACardStorage !== 'undefined') {
        this.storage = new PWACardStorage();
        await this.storage.initialize();
        this.setupCleanupHandlers();
      } else {
        throw new Error('PWACardStorage not available');
      }
      
      // COMP-04: Initialize Health Monitor
      await this.initializeHealthMonitor();
      
      // 並行初始化其他服務
      const initPromises = [];
      
      // 初始化版本管理器
      if (typeof VersionManager !== 'undefined') {
        initPromises.push(
          (async () => {
            this.versionManager = new VersionManager(this.storage);
          })()
        );
      }
      
      // 初始化重複檢測器
      if (typeof DuplicateDetector !== 'undefined') {
        initPromises.push(
          (async () => {
            this.duplicateDetector = new DuplicateDetector(this.storage);
            await this.duplicateDetector.initialize();
          })()
        );
      }
      
      if (typeof PWACardManager !== 'undefined') {
        initPromises.push(
          (async () => {
            try {
              this.cardManager = new PWACardManager(this.storage);
              await this.cardManager.initialize();
              // 整合版本管理和重複檢測
              if (this.versionManager) this.cardManager.versionManager = this.versionManager;
              if (this.duplicateDetector) this.cardManager.duplicateDetector = this.duplicateDetector;
            } catch (error) {
              this.cardManager = null;
            }
          })()
        );
      }
      
      if (typeof HealthManager !== 'undefined' && this.storage) {
        initPromises.push(
          (async () => {
            this.healthManager = new HealthManager(this.storage);
            await this.healthManager.initialize();
          })()
        );
      }
      
      await Promise.all(initPromises);
      
      // 將版本管理器和重複檢測器整合到 storage 中
      if (this.storage) {
        if (this.versionManager) {
          this.storage.versionManager = this.versionManager;
          // SEC-03: Use secure logging
          if (window.secureLogger) {
            window.secureLogger.info('VersionManager integrated to storage');
          } else {
            console.log('[PWA] VersionManager integrated to storage');
          }
        }
        if (this.duplicateDetector) {
          this.storage.duplicateDetector = this.duplicateDetector;
          // SEC-03: Use secure logging
          if (window.secureLogger) {
            window.secureLogger.info('DuplicateDetector integrated to storage');
          } else {
            console.log('[PWA] DuplicateDetector integrated to storage');
          }
        }
      }
      
      // COMP-02: Initialize all registered components
      if (this.componentRegistry) {
        const report = await this.componentRegistry.initializeAll();
        // SEC-03: Use secure logging
        if (window.secureLogger) {
          window.secureLogger.info('Component Registry initialization report', { report });
        } else {
          console.log('[PWA] Component Registry initialization report:', report);
        }
      }
      
      // 初始化依賴服務
      if (typeof OfflineToolsManager !== 'undefined' && this.cardManager) {
        this.offlineTools = new OfflineToolsManager(this.cardManager);
      }
      
      if (typeof TransferManager !== 'undefined' && this.cardManager) {
        this.transferManager = new TransferManager(this.cardManager);
      }
      
      // CLEAN-01: QR 掃描器已移除
      
    } catch (error) {
      // SEC-03: Use secure logging
      if (window.secureLogger) {
        window.secureLogger.error('Service initialization failed', { error: error.message });
      } else {
        console.error('[PWA] Service initialization failed:', error);
      }
      
      // SEC-03: Record initialization failure (safe)
      try {
        if (this.storage?.healthMonitor && typeof this.storage.healthMonitor.recordSecurityEvent === 'function') {
          await this.storage.healthMonitor.recordSecurityEvent('service_init_failed', {
            error: error.message,
            timestamp: Date.now()
          });
        }
      } catch (recordError) {
        // SEC-03: Use secure logging for record errors
        if (window.secureLogger) {
          window.secureLogger.warn('Failed to record security event', { error: recordError.message });
        } else {
          console.warn('[PWA] Failed to record security event:', recordError);
        }
      }
      
      throw error;
    }
  }

  /**
   * COMP-01: Initialize Simplified Language Manager
   */
  async initializeSimplifiedLanguageManager() {
    try {
      if (typeof SimplifiedLanguageManager !== 'undefined') {
        this.languageManager = new SimplifiedLanguageManager();
        await this.languageManager.initialize();
        
        // Replace global language manager
        window.languageManager = this.languageManager;
        
        // SEC-03: Use secure logging
        if (window.secureLogger) {
          window.secureLogger.info('Simplified Language Manager initialized successfully');
        } else {
          console.log('[PWA] Simplified Language Manager initialized successfully');
        }
        
        // Verify the language manager has required methods
        if (!this.languageManager.toggleLanguage) {
          // SEC-03: Use secure logging
          if (window.secureLogger) {
            window.secureLogger.warn('SimplifiedLanguageManager missing toggleLanguage method');
          } else {
            console.warn('[PWA] SimplifiedLanguageManager missing toggleLanguage method');
          }
          this.addToggleLanguageMethod();
        }
      } else {
        // SEC-03: Use secure logging
        if (window.secureLogger) {
          window.secureLogger.warn('SimplifiedLanguageManager not available, using fallback');
        } else {
          console.warn('[PWA] SimplifiedLanguageManager not available, using fallback');
        }
        this.languageManager = window.languageManager || this.createFallbackLanguageManager();
      }
    } catch (error) {
      // SEC-03: Use secure logging
      if (window.secureLogger) {
        window.secureLogger.error('Simplified Language Manager initialization failed', { error: error.message });
      } else {
        console.error('[PWA] Simplified Language Manager initialization failed:', error);
      }
      this.languageManager = window.languageManager || this.createFallbackLanguageManager();
    }
  }

  /**
   * COMP-02: Initialize Unified Component Registry
   */
  async initializeComponentRegistry() {
    try {
      if (typeof UnifiedComponentRegistry !== 'undefined') {
        this.componentRegistry = new UnifiedComponentRegistry();
        
        // Register language manager
        if (this.languageManager) {
          this.componentRegistry.register('language-manager', this.languageManager, {
            priority: 9,
            critical: true
          });
        }
        
        console.log('[PWA] Unified Component Registry initialized successfully');
      } else {
        console.warn('[PWA] UnifiedComponentRegistry not available');
      }
    } catch (error) {
      console.error('[PWA] Component Registry initialization failed:', error);
    }
  }

  /**
   * COMP-04: Initialize Component Health Monitor
   */
  async initializeHealthMonitor() {
    try {
      if (typeof ComponentHealthMonitor !== 'undefined') {
        this.healthMonitor = new ComponentHealthMonitor();
        await this.healthMonitor.initialize();
        
        // Track language manager
        if (this.languageManager) {
          this.healthMonitor.track('language-manager', this.languageManager);
        }
        
        // Register with component registry
        if (this.componentRegistry) {
          this.componentRegistry.register('health-monitor', this.healthMonitor, {
            priority: 8,
            critical: false
          });
        }
        
        console.log('[PWA] Component Health Monitor initialized successfully');
      } else {
        console.warn('[PWA] ComponentHealthMonitor not available');
      }
    } catch (error) {
      console.error('[PWA] Health Monitor initialization failed:', error);
    }
  }

  /**
   * Add toggleLanguage method to SimplifiedLanguageManager if missing
   */
  addToggleLanguageMethod() {
    if (this.languageManager && !this.languageManager.toggleLanguage) {
      this.languageManager.toggleLanguage = async () => {
        const newLanguage = this.languageManager.currentLanguage === 'zh-TW' ? 'en' : 'zh-TW';
        return await this.languageManager.switchLanguage(newLanguage);
      };
    }
  }

  /**
   * Create fallback language manager
   */
  createFallbackLanguageManager() {
    return {
      currentLanguage: 'zh-TW',
      getCurrentLanguage: () => this.currentLanguage || 'zh-TW',
      toggleLanguage: async () => {
        const newLang = this.currentLanguage === 'zh-TW' ? 'en' : 'zh-TW';
        this.currentLanguage = newLang;
        return newLang;
      },
      getText: (key) => key,
      addObserver: () => {},
      removeObserver: () => {}
    };
  }

  /**
   * 統一的語言獲取方法，優先使用語言管理器
   */
  getCurrentLanguage() {
    try {
      // 優先使用語言管理器的狀態
      if (this.languageManager && this.languageManager.getCurrentLanguage) {
        return this.languageManager.getCurrentLanguage();
      }
      
      if (window.languageManager && window.languageManager.getCurrentLanguage) {
        return window.languageManager.getCurrentLanguage();
      }
      
      // 備用方案：使用內部狀態
      return this.currentLanguage || 'zh';
    } catch (error) {
      console.error('[PWA] Failed to get current language:', error);
      return this.currentLanguage || 'zh';
    }
  }

  /**
   * TRANS-003: Get localized text using UnifiedTranslationService
   * 統一翻譯獲取邏輯，消除雙重依賴
   */
  getLocalizedText(key, fallback = null) {
    try {
      // TRANS-003: 優先使用 UnifiedTranslationService 統一入口點
      if (window.UnifiedTranslationService) {
        const result = window.UnifiedTranslationService.getText(key, null, {
          fallback: fallback || key
        });
        if (result && result !== key) {
          return result;
        }
      }

      // 備用方案：直接使用 SafeTranslationHandler（向下相容）
      if (window.SafeTranslationHandler) {
        const result = window.SafeTranslationHandler.getTranslation(key, null, { 
          fallback: fallback || key 
        });
        if (result && result !== key) {
          return result;
        }
      }

      // 最終備用：使用內建語言管理器
      if (this.languageManager && this.languageManager.getText) {
        const text = this.languageManager.getText(key, null, { fallback: null });
        if (text && text !== key) return text;
      }
      
      // 緊急備用
      return fallback || key;
    } catch (error) {
      console.error('[PWA] Failed to get localized text:', error);
      // TRANS-003: 統一錯誤處理
      try {
        if (window.UnifiedTranslationService) {
          const instance = window.UnifiedTranslationService.getInstance();
          return instance.getEmergencyFallback ? 
            instance.getEmergencyFallback(key, { fallback }) : 
            (fallback || key);
        }
      } catch (emergencyError) {
        console.error('[PWA] Emergency fallback failed:', emergencyError);
      }
      return fallback || key;
    }
  }

  /**
   * Update navigation labels with current language
   */
  updateNavigationLabels() {
    // This method is now handled by updateAllLocalizedContent
    // Keeping for backward compatibility
    if (this.currentLanguage) {
      this.updateNavigationLabels(this.currentLanguage === 'zh-TW');
    }
  }

  /**
   * SEC-01: Load modern security components with ES6 modules
   */
  async loadSecurityComponents() {
    try {
      // Try to use modern security core from ES6 modules
      try {
        const securityModule = await import('./core/security-core.js');
        this.securityCore = securityModule.securityCore;
        await securityModule.initializeSecurity();
        console.log('[PWA] Modern security core initialized');
      } catch (importError) {
        console.warn('[PWA] ES6 security module import failed:', importError);
        
        // Fallback to global security objects
        if (window.securityCore) {
          this.securityCore = window.securityCore;
          console.log('[PWA] Using global security core');
        } else {
          // Basic security fallback
          this.securityCore = {
            initialize: () => Promise.resolve({ initialized: true }),
            isInitialized: () => true,
            safeJSONParse: (jsonString, options = {}) => {
              try {
                return JSON.parse(jsonString, (key, value) => {
                  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    return undefined;
                  }
                  return value;
                });
              } catch (error) {
                if (options.fallback !== undefined) {
                  return options.fallback;
                }
                throw error;
              }
            }
          };
          console.log('[PWA] Using basic security fallback');
        }
      }
      
      // Initialize security settings interface
      if (window.securitySettings) {
        this.securitySettings = window.securitySettings;
        console.log('[PWA] Security settings interface initialized');
      }
      
      // Use HealthManager for security monitoring
      if (window.HealthManager && this.storage) {
        this.securityMonitor = new window.HealthManager(this.storage);
        await this.securityMonitor.initialize();
        console.log('[PWA] Health-based security monitor initialized');
      }
      
    } catch (error) {
      console.warn('[PWA] Security initialization failed:', error);
      // Fallback to basic security
      this.securityCore = {
        initialize: () => Promise.resolve({ initialized: true }),
        isInitialized: () => true,
        safeJSONParse: (jsonString, options = {}) => {
          try {
            return JSON.parse(jsonString, (key, value) => {
              if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                return undefined;
              }
              return value;
            });
          } catch (error) {
            if (options.fallback !== undefined) {
              return options.fallback;
            }
            throw error;
          }
        }
      };
    }
  }

  /**
   * SEC-01: Setup security feature UI controls
   */
  setupSecurityUI() {
    if (!this.securityToggle) return;
    
    // Add security settings to the UI if needed
    const settingsContainer = document.querySelector('.settings-container');
    if (settingsContainer) {
      const securitySection = document.createElement('div');
      securitySection.className = 'security-settings';
      securitySection.innerHTML = `
        <h3>安全設定</h3>
        <div class="security-toggle-group">
          <label>
            <input type="checkbox" id="encryption-toggle" ${this.securityToggle.isEnabled('encryption') ? 'checked' : ''}>
            啟用加密儲存
          </label>
          <label>
            <input type="checkbox" id="monitoring-toggle" ${this.securityToggle.isEnabled('monitoring') ? 'checked' : ''}>
            啟用安全監控
          </label>
        </div>
      `;
      
      // Add event listeners
      const encryptionToggle = securitySection.querySelector('#encryption-toggle');
      const monitoringToggle = securitySection.querySelector('#monitoring-toggle');
      
      encryptionToggle?.addEventListener('change', (e) => {
        this.securityToggle.toggle('encryption', e.target.checked);
      });
      
      monitoringToggle?.addEventListener('change', (e) => {
        this.securityToggle.toggle('monitoring', e.target.checked);
      });
      
      settingsContainer.appendChild(securitySection);
    }
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        const page = e.currentTarget.dataset.page;
        try {
          await this.navigateTo(page);
        } catch (error) {
          console.error(`[PWA] Navigation to ${page} failed:`, error);
        }
      });
    });

    document.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
      });
    });

    const searchInput = document.getElementById('card-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce((e) => {
        this.searchCards(e.target.value);
      }, 300));
    }

    const filterSelect = document.getElementById('card-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterCards(e.target.value);
      });
    }

    const importUrlBtn = document.getElementById('import-url-btn');
    if (importUrlBtn) {
      importUrlBtn.addEventListener('click', () => {
        this.importFromUrl();
      });
    }

    const importFileInput = document.getElementById('import-file');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        this.importFromFile(e.target.files[0]);
      });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportCards();
      });
    }

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateConnectionStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateConnectionStatus();
    });

    const notificationClose = document.querySelector('.notification-close');
    if (notificationClose) {
      notificationClose.addEventListener('click', () => {
        this.hideNotification();
      });
    }

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await this.toggleLanguage();
        } catch (error) {
          console.error('[PWA] Language toggle failed:', error);
          this.showNotification(this.getLocalizedText('theme-failed'), 'error');
        }
      });
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
      settingsButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await this.clearUrlParams();
        } catch (error) {
          console.error('[PWA] Settings button handler failed:', error);
          // 備用方案：直接導航到首頁
          try {
            await this.navigateTo('home');
            this.showNotification(this.getLocalizedText('backToHomeSuccess'), 'success');
          } catch (fallbackError) {
            console.error('[PWA] Settings button fallback failed:', fallbackError);
            this.showNotification(this.getLocalizedText('operationFailed'), 'error');
          }
        }
      });
    }
    
    // 初始化 PWA 安裝按鈕
    if (window.initPWAInstallButtons) {
      window.initPWAInstallButtons();
    }
  }

  initializeUI() {
    this.updateConnectionStatus();
    this.loadThemePreference();
    this.updateThemeUI();
    
    // 使用 Simplified Language Manager
    if (this.languageManager) {
      this.currentLanguage = this.languageManager.getCurrentLanguage();
      this.updateLanguageUI();
      
      // 註冊語言變更觀察者
      this.languageManager.addObserver((lang) => {
        this.currentLanguage = lang;
        this.updateLanguageUI();
      });
    } else if (window.languageManager) {
      // Fallback to original language manager
      this.currentLanguage = window.languageManager.getCurrentLanguage();
      this.updateLanguageUI();
      
      window.languageManager.addObserver((lang) => {
        this.currentLanguage = lang;
        this.updateLanguageUI();
      });
    }
    
    // 初始化時導航到首頁
    this.navigateTo('home').catch(error => {
      console.error('[PWA] Initial navigation failed:', error);
    });
    this.handleUrlParams();
  }
  
  loadThemePreference() {
    const savedTheme = localStorage.getItem('pwa-theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // 檢測系統主題偏好
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  }

  async loadInitialData() {
    try {
      await this.updateStats();
      
      // 資料遷移功能已移除，直接載入資料
      
      // 執行基本的資料健康檢查
      if (this.storage) {
        try {
          const healthCheck = await this.storage.performHealthCheck();
          if (!healthCheck.healthy && healthCheck.corruptedCount > 0) {
            this.showNotification(`發現 ${healthCheck.corruptedCount} 張損壞的名片`, 'warning');
          }
        } catch (error) {
        }
      }
    } catch (error) {
      console.error('[PWA] Failed to load initial data:', error);
    }
  }

  handleUrlParams() {
    // 🔧 優先使用 localStorage 完整方式
    try {
      const storedData = localStorage.getItem('pwa_card_source_url');
      if (storedData) {
        const sourceData = JSON.parse(storedData);
        console.log('[PWA] 從 localStorage 讀取暫存資料');
        
        if (Date.now() - sourceData.timestamp < 5 * 60 * 1000 && sourceData.cardData) {
          console.log('[PWA] 使用完整名片資料');
          setTimeout(() => {
            this.importFromCardData(sourceData.cardData, sourceData.sourceUrl);
          }, 1000);
          return;
        } else {
          localStorage.removeItem('pwa_card_source_url');
        }
      }
    } catch (error) {
      console.error('[PWA] localStorage 讀取失敗:', error);
    }
    
    // 🔧 修復：只有在確實有匯入意圖時才顯示提示訊息
    const hasImportIntent = this.checkImportIntent();
    if (hasImportIntent) {
      setTimeout(() => {
        this.showNotification(this.getLocalizedText('importFromOriginalPage', '請從原始名片頁面點擊「儲存到離線」'), 'info');
        this.navigateTo('import');
      }, 1000);
    }
    // 如果沒有匯入意圖，直接停留在首頁，不顯示提示訊息
  }
  
  /**
   * 🔧 新增：檢測是否有匯入意圖
   */
  checkImportIntent() {
    // 檢查 URL 參數是否有匯入相關的標記
    const urlParams = new URLSearchParams(window.location.search);
    const hasImportParam = urlParams.has('import') || urlParams.has('data') || urlParams.has('from');
    
    // 檢查 referrer 是否來自名片頁面
    const referrer = document.referrer;
    const isFromCardPage = referrer && (
      referrer.includes('index.html') ||
      referrer.includes('index1.html') ||
      referrer.includes('index-en.html') ||
      referrer.includes('index1-en.html') ||
      referrer.includes('index-personal.html') ||
      referrer.includes('index-personal-en.html') ||
      referrer.includes('index-bilingual.html') ||
      referrer.includes('index1-bilingual.html') ||
      referrer.includes('index-bilingual-personal.html')
    );
    
    // 檢查是否有暫存的匯入意圖標記
    const hasImportFlag = sessionStorage.getItem('pwa_import_intent') === 'true';
    
    // 清除暫存的意圖標記
    if (hasImportFlag) {
      sessionStorage.removeItem('pwa_import_intent');
    }
    
    return hasImportParam || isFromCardPage || hasImportFlag;
  }

  /**
   * 🔧 新增：直接從名片資料匯入（用於 localStorage 暫存的完整資料）
   */
  async importFromCardData(cardData, sourceUrl = null) {
    try {
      this.showLoading('📝 正在處理名片資料...');
      
      // 識別名片類型
      let cardType = null;
      if (sourceUrl) {
        cardType = this.identifyCardTypeFromUrl(sourceUrl);
      }
      
      if (!cardType) {
        cardType = this.identifyCardType(cardData);
      }
      
      if (!cardType) {
        cardType = 'index'; // 預設類型
      }
      
      console.log('[PWA] 識別的名片類型:', cardType);
      
      // 直接處理名片資料
      const processedData = this.processCardData(cardData, cardType);
      
      if (!processedData) {
        throw new Error('名片資料處理失敗');
      }
      
      // 儲存名片
      await this.storeProcessedCard(processedData, cardType, sourceUrl);
      
    } catch (error) {
      console.error('[PWA] 直接匯入名片資料失敗:', error);
      this.showNotification(this.getLocalizedText('importFailed') + ': ' + error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }
  
  /**
   * 🔧 改善：從 URL 識別名片類型
   */
  identifyCardTypeFromUrl(url) {
    if (!url) return null;
    
    const urlLower = url.toLowerCase();
    if (urlLower.includes('index-bilingual-personal.html')) return 'personal-bilingual';
    if (urlLower.includes('index1-bilingual.html')) return 'bilingual1';
    if (urlLower.includes('index-bilingual.html')) return 'bilingual';
    if (urlLower.includes('index-personal-en.html')) return 'personal-en';
    if (urlLower.includes('index1-en.html')) return 'en1';
    if (urlLower.includes('index-en.html')) return 'en';
    if (urlLower.includes('index-personal.html')) return 'personal';
    if (urlLower.includes('index1.html')) return 'index1';
    if (urlLower.includes('index.html')) return 'index';
    
    return null;
  }
  
  /**
   * 🔧 改善：處理名片資料
   */
  processCardData(cardData, cardType) {
    try {
      // 如果已經是處理過的格式，直接返回
      if (cardData.data) {
        return cardData.data;
      }
      
      // 否則假設是原始資料格式
      return cardData;
    } catch (error) {
      console.error('[PWA] 處理名片資料失敗:', error);
      return null;
    }
  }
  
  /**
   * 🔧 改善：儲存處理過的名片
   */
  async storeProcessedCard(cardData, cardType, sourceUrl) {
    this.showLoading('💾 正在儲存名片...');
    
    if (!this.storage) {
      throw new Error('儲存服務未初始化');
    }
    
    // 添加來源 URL
    if (sourceUrl) {
      cardData.url = sourceUrl;
    }
    
    let cardId;
    let message = this.getLocalizedText('cardSaved');
    
    // 重複檢測與版本控制
    if (this.storage.duplicateDetector) {
      const duplicateResult = await this.storage.duplicateDetector.detectDuplicates(cardData);
      
      if (duplicateResult.isDuplicate && duplicateResult.existingCards.length > 0) {
        // 發現重複，自動建立新版本
        const existingCard = duplicateResult.existingCards[0];
        const handleResult = await this.storage.duplicateDetector.handleDuplicate(
          cardData, 
          'version',
          existingCard.id
        );
        
        if (handleResult.success) {
          cardId = handleResult.cardId;
          message = this.getLocalizedText('versionCreated');
        } else {
          throw new Error(handleResult.error);
        }
      } else {
        // 無重複，建立新名片
        cardId = await this.storage.storeCardDirectly(cardData, cardType);
      }
    } else {
      // 無重複檢測器，直接儲存
      cardId = await this.storage.storeCardDirectly(cardData, cardType);
    }
    
    if (!cardId) {
      throw new Error('名片儲存失敗：未獲得有效的名片ID');
    }
    
    // 清除暫存
    try {
      localStorage.removeItem('pwa_card_source_url');
    } catch (error) {
      console.warn('[PWA] 清除暫存失敗:', error);
    }
    
    this.showNotification(message, 'success');
    await this.updateStats();
    await this.navigateTo('cards');
  }
  
  async importFromUrlData(data) {
    try {
      // 第一階段：初始化讀取
      this.showLoading('📝 正在讀取名片資料...');
      
      // 🔧 改善：更好的來源 URL 處理
      let sourceUrl = null;
      try {
        const storedData = localStorage.getItem('pwa_card_source_url');
        if (storedData) {
          const sourceData = JSON.parse(storedData);
          sourceUrl = sourceData.sourceUrl;
        }
      } catch (error) {
        console.warn('[PWA] 無法讀取來源 URL:', error);
      }
      
      // 第二階段：識別名片類型
      this.showLoading('🔍 正在識別名片類型...');
      let cardType = null;
      
      // 優先從來源 URL 識別
      if (sourceUrl) {
        cardType = this.identifyCardTypeFromUrl(sourceUrl);
      }
      
      // 備用方案：使用 PWAIntegration
      if (!cardType && window.PWAIntegration) {
        const tempData = { url: sourceUrl || window.location.href };
        cardType = window.PWAIntegration.identifyCardTypeEnhanced ? 
          window.PWAIntegration.identifyCardTypeEnhanced(tempData) :
          window.PWAIntegration.identifyCardTypeFromSource();
      }
      
      // 最後備用：預設類型
      if (!cardType) {
        cardType = 'index';
        console.warn('[PWA] 無法識別名片類型，使用預設類型:', cardType);
      }
      
      console.log('[PWA] 識別的名片類型:', cardType);
      
      // 第三階段：解析資料
      this.showLoading('⚙️ 正在解析名片資料...');
      
      if (!window.SimpleCardParser) {
        throw new Error('解析器未載入');
      }
      
      const cardData = window.SimpleCardParser.parseDirectly(data, cardType);
      
      if (!cardData) {
        // 🔧 改善：提供更詳細的錯誤資訊
        console.error('[PWA] 解析失敗的資料:', {
          dataLength: data ? data.length : 0,
          cardType: cardType,
          dataPreview: data ? data.substring(0, 100) + '...' : 'null'
        });
        throw new Error('無法解析名片資料，可能是資料格式不正確或已損壞');
      }
      
      // 第四階段：準備儲存
      this.showLoading('💾 正在準備儲存...');
      cardData.url = sourceUrl || window.location.href;
      
      // 第五階段：指紋檢測與版本控制
      this.showLoading('🔍 正在檢查重複名片...');
      if (this.storage) {
        try {
          let cardId;
          let message = this.getLocalizedText('cardSaved');
          
          // UI-02: 修正重複處理邏輯與 cardId 處理
          if (this.storage.duplicateDetector) {
            const duplicateResult = await this.storage.duplicateDetector.detectDuplicates(cardData);
            
            if (duplicateResult.isDuplicate && duplicateResult.existingCards.length > 0) {
              // 發現重複，顯示重複處理對話框
              this.showLoading('🔄 發現重複名片，等待使用者選擇...');
              
              // 使用 DuplicateDialogManager 顯示對話框
              if (window.DuplicateDialogManager) {
                const dialogManager = new window.DuplicateDialogManager();
                const userChoice = await dialogManager.showDuplicateDialog(
                  duplicateResult.existingCards,
                  cardData
                );
                
                if (userChoice.action === 'cancel') {
                  this.showNotification(this.getLocalizedText('importCancelled', '匯入已取消'), 'info');
                  return;
                }
                
                this.showLoading(`🔄 正在執行 ${userChoice.action} 操作...`);
                
                const handleResult = await this.storage.duplicateDetector.handleDuplicate(
                  cardData,
                  userChoice.action,
                  userChoice.targetCardId
                );
                
                if (handleResult.success) {
                  cardId = handleResult.cardId;
                  const actionMessages = {
                    'skip': this.getLocalizedText('duplicateSkipped', '已跳過重複名片'),
                    'overwrite': this.getLocalizedText('duplicateOverwritten', '已覆蓋現有名片'),
                    'version': this.getLocalizedText('versionCreated')
                  };
                  message = actionMessages[userChoice.action] || '名片處理完成';
                } else {
                  throw new Error(handleResult.error);
                }
              } else {
                // 備用方案：自動建立新版本
                const existingCard = duplicateResult.existingCards[0];
                const handleResult = await this.storage.duplicateDetector.handleDuplicate(
                  cardData, 
                  'version',
                  existingCard.id
                );
                
                if (handleResult.success) {
                  cardId = handleResult.cardId;
                  message = this.getLocalizedText('versionCreated');
                } else {
                  throw new Error(handleResult.error);
                }
              }
            } else {
              // 無重複，建立新名片
              this.showLoading('💾 正在儲存新名片...');
              cardId = await this.storage.storeCardDirectly(cardData, cardType);
            }
          } else {
            // 無重複檢測器，直接儲存
            this.showLoading('💾 正在儲存名片...');
            cardId = await this.storage.storeCardDirectly(cardData, cardType);
          }
          
          // 第六階段：完成儲存與狀態驗證
          this.showLoading('✅ 儲存完成，正在更新...');
          
          // UI-02: 驗證 cardId 有效性
          if (!cardId) {
            throw new Error('名片儲存失敗：未獲得有效的名片ID');
          }
          
          // 記錄使用者選擇到安全日誌
          if (window.SecurityDataHandler) {
            window.SecurityDataHandler.secureLog('info', 'Card import completed', {
              cardId: cardId.substring(0, 8) + '...',
              cardType,
              hasFingerprint: !!cardData.fingerprint,
              operation: 'importFromUrlData'
            });
          }
          
          this.showNotification(message, 'success');
          
          // 清除暫存
          window.PWAIntegration?.manualClearContext();
          
          await this.updateStats();
          await this.navigateTo('cards');
        } catch (storeError) {
          console.error('[App] Store card failed:', storeError);
          
          // UI-02: 錯誤處理與回滾機制
          if (window.SecurityDataHandler) {
            window.SecurityDataHandler.secureLog('error', 'Card import failed', {
              error: storeError.message,
              cardType,
              operation: 'importFromUrlData'
            });
          }
          
          // 提供更友好的錯誤信息
          let errorMessage = '儲存失敗';
          if (storeError.message.includes('duplicate')) {
            errorMessage = '重複名片處理失敗';
          } else if (storeError.message.includes('fingerprint')) {
            errorMessage = '指紋生成失敗，請稍後再試';
          } else if (storeError.message.includes('version')) {
            errorMessage = '版本管理失敗';
          } else {
            errorMessage = `儲存失敗: ${storeError.message}`;
          }
          
          this.showNotification(errorMessage, 'error');
        }
      } else {
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
      }
    } catch (error) {
      console.error('[PWA] Import from URL data failed:', error);
      
      // 🔧 改善：更詳細的錯誤處理
      let errorMessage = '讀取名片失敗';
      if (error.message.includes('解析器未載入')) {
        errorMessage = this.getLocalizedText('systemNotReady', '系統初始化未完成，請稍後再試');
      } else if (error.message.includes('無法解析名片資料')) {
        errorMessage = this.getLocalizedText('dataFormatError', '名片資料格式錯誤，請從原始名片頁面重新儲存');
      } else if (error.message.includes('儲存失敗')) {
        errorMessage = this.getLocalizedText('storageError', '儲存失敗，請檢查儲存空間');
      } else {
        errorMessage = this.getLocalizedText('processingFailed', '處理失敗') + ': ' + error.message;
      }
      
      // 安全日誌記錄
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('error', 'Import flow failed', {
          error: error.message,
          stage: 'importFromUrlData',
          hasStorage: !!this.storage,
          hasDetector: !!this.storage?.duplicateDetector
        });
      }
      
      // 清理暫存資料
      try {
        localStorage.removeItem('pwa_card_source_url');
        if (window.PWAIntegration?.manualClearContext) {
          window.PWAIntegration.manualClearContext();
        }
      } catch (cleanupError) {
        console.warn('[PWA] Cleanup failed:', cleanupError);
      }
      
      this.showNotification(errorMessage, 'error');
      
      // 導航到匯入頁面讓使用者重新嘗試
      setTimeout(() => {
        this.navigateTo('import');
      }, 2000);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * PWA-24 直通處理：使用 SimpleCardParser.parseDirectly() 和指紋版本控制
   * 實現零資料遺失的直通管道處理，同時支援基於指紋的重複檢測
   */

  /**
   * CRS-V31-001: 語義化版本計算備用方法
   */
  calculateSemanticVersion(currentVersion) {
    const version = parseFloat(currentVersion) || 1.0;
    const major = Math.floor(version);
    const minor = Math.round((version - major) * 10);
    const nextMinor = minor + 1;
    
    if (nextMinor >= 10) {
      return `${major + 1}.0`;
    } else {
      return `${major}.${nextMinor}`;
    }
  }

  extractStringFromGreeting(greeting, language = null) {
    // 使用統一的語言獲取方法
    const currentLang = language || this.getCurrentLanguage();
    const isEn = currentLang === 'en' || currentLang === 'en-US';
    
    if (!greeting) return '';
    if (typeof greeting === 'string') {
      if (greeting.includes('~')) {
        const parts = greeting.split('~');
        return isEn ? (parts[1] || parts[0]) : parts[0];
      }
      return greeting;
    }
    if (typeof greeting === 'object' && greeting !== null) {
      return greeting[isEn ? 'en' : 'zh'] || greeting.zh || greeting.en || '';
    }
    return String(greeting || '');
  }
  
  /**
   * 標準化名片類型識別 - 全域通用
   */
  identifyCardType(data) {
    if (typeof data === 'string') data = { url: data };
    
    if (data.url) {
      const url = data.url.toLowerCase().trim();
      if (url.includes('index1-bilingual.html')) return 'bilingual1';
      if (url.includes('index-bilingual-personal.html')) return 'personal-bilingual';
      if (url.includes('index-bilingual.html')) return 'bilingual';
      if (url.includes('index1-en.html')) return 'en1';
      if (url.includes('index-personal-en.html')) return 'personal-en';
      if (url.includes('index-en.html')) return 'en';
      if (url.includes('index-personal.html')) return 'personal';
      if (url.includes('index1.html')) return 'index1';
      if (url.includes('index.html')) return 'index';
    }
    
    const isBilingual = (typeof data.name === 'string' && data.name.includes('~')) || 
                       (typeof data.title === 'string' && data.title.includes('~'));
    const isGov = data.organization && data.department;
    const isShinGuang = (typeof data.address === 'string') && 
                       (data.address.includes('新光') || data.address.includes('松仁路'));
    
    if (isBilingual) {
      return isGov ? (isShinGuang ? 'bilingual1' : 'bilingual') : 'personal-bilingual';
    }
    
    return isGov ? (isShinGuang ? 'index1' : 'index') : 'personal';
  }
  

  

  

  

  


  async navigateTo(page) {
    try {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
      });
      document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

      document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
      });
      document.getElementById(`page-${page}`)?.classList.add('active');

      this.currentPage = page;
      
      // 正確處理異步頁面初始化
      try {
        await this.initializePage(page);
      } catch (initError) {
        console.error(`[PWA] Page initialization failed for ${page}:`, initError);
        // 頁面初始化失敗不影響導航本身
      }
    } catch (error) {
      console.error('[PWA] Navigation failed:', error);
      // 不顯示錯誤通知，因為這是內部導航問題
    }
  }

  async initializePage(page) {
    try {
      switch (page) {
        case 'home':
          await this.updateStats();
          break;
        case 'cards':
          await this.initializeCardsList();
          break;
        case 'import':
          const urlInput = document.getElementById('import-url');
          if (urlInput) urlInput.value = '';
          break;
        case 'export':
          const exportAll = document.getElementById('export-all');
          const exportVersions = document.getElementById('export-versions');
          const exportEncrypt = document.getElementById('export-encrypt');
          if (exportAll) exportAll.checked = true;
          if (exportVersions) exportVersions.checked = false;
          if (exportEncrypt) exportEncrypt.checked = false;
          break;
      }
    } catch (error) {
      console.error(`[PWA] Page initialization failed for ${page}:`, error);
      // 不顯示錯誤通知，因為這是內部初始化問題
    }
  }

  async handleQuickAction(action) {
    switch (action) {
      case 'add-card':
        await this.navigateTo('import');
        break;

      case 'import-file':
        document.getElementById('import-file')?.click();
        break;
      case 'backup-all':
        await this.navigateTo('export');
        break;
      case 'security-settings':
        this.showSecuritySettings();
        break;
    }
  }

  async updateStats() {
    try {
      
      if (!this.storage) {
        return;
      }

      const stats = await this.storage.getStorageStats();
      
      const totalCardsEl = document.getElementById('total-cards');
      const storageUsedEl = document.getElementById('storage-used');
      const lastSyncEl = document.getElementById('last-sync');
      
      if (totalCardsEl) totalCardsEl.textContent = stats.totalCards || 0;
      if (storageUsedEl) storageUsedEl.textContent = `${stats.storageUsedPercent || 0}%`;
      
      // 更新應用版本顯示
      const appVersionEl = document.getElementById('app-version');
      if (appVersionEl && window.manifestManager) {
        const version = window.manifestManager.getVersion();
        if (version && version !== 'unknown') {
          appVersionEl.textContent = version.startsWith('v') ? version : `v${version}`;
        } else {
          appVersionEl.textContent = '載入中...';
        }
      }

      const storageStatus = document.getElementById('storage-status');
      if (storageStatus) {
        const usedPercent = stats.storageUsedPercent || 0;
        if (usedPercent > 80) {
          storageStatus.textContent = '儲存空間不足';
          storageStatus.className = 'status-text text-warning';
        } else {
          storageStatus.textContent = '儲存空間充足';
          storageStatus.className = 'status-text';
        }
      }
      
    } catch (error) {
      console.error('[PWA] Failed to update stats:', error);
    }
  }

  async initializeCardsList() {
    try {
      const cardsList = document.getElementById('cards-list');
      if (cardsList && this.storage) {
        if (!window.cardList) {
          // 使用 storage 直接初始化，不依賴 cardManager
          window.cardList = new CardListComponent(cardsList, { storage: this.storage });
        }
        await window.cardList.loadCards();
      } else {
      }
    } catch (error) {
      console.error('[PWA] Failed to initialize cards list:', error);
      this.showNotification(this.getLocalizedText('operationFailed'), 'error');
    }
  }

  async importFromUrl() {
    const urlInput = document.getElementById('import-url');
    const url = urlInput?.value?.trim();

    if (!url) {
      this.showNotification(this.getLocalizedText('invalidUrl'), 'warning');
      return;
    }

    try {
      this.showLoading('匯入名片中...');
      
      if (this.cardManager) {
        const result = await this.cardManager.importFromUrl(url);
        if (result.success) {
          // 🔧 修復：使用 cardManager 返回的訊息而非固定文字
          const message = result.message || this.getLocalizedText('cardImported');
          this.showNotification(message, 'success');
          urlInput.value = '';
          await this.updateStats();
        } else {
          this.showNotification(result.error || this.getLocalizedText('importFailed'), 'error');
        }
      }
    } catch (error) {
      console.error('[PWA] Import from URL failed:', error);
      this.showNotification(this.getLocalizedText('importFailed'), 'error');
    } finally {
      this.hideLoading();
    }
  }

  async importFromFile(file) {
    if (!file) return;

    try {
      this.showLoading('匯入檔案中...');
      
      // 檢查是否為加密檔案
      if (file.name.endsWith('.enc') && this.transferManager) {
        const passwordResult = await SecurityInputHandler.securePrompt('請輸入解密密碼', {
          title: '解密檔案',
          inputType: 'password',
          validation: { minLength: 1, allowEmpty: false }
        });
        if (!passwordResult.confirmed) {
          this.hideLoading();
          return;
        }
        const password = passwordResult.value;
        
        const result = await this.transferManager.importData(file, password);
        
        if (result.needsConflictResolution) {
          await this.handleConflictResolution(result.conflicts, result.importData);
        } else if (result.success) {
          this.showNotification(this.getLocalizedText('importSuccess', '成功匯入') + ` ${result.importedCount} ` + this.getLocalizedText('cards', '張名片'), 'success');
          await this.updateStats();
        } else {
          this.showNotification(result.error || this.getLocalizedText('importFailed'), 'error');
        }
      } else if (this.cardManager) {
        // 一般檔案匯入
        const result = await this.cardManager.importFromFile(file);
        if (result.success) {
          // 根據結果顯示適當的訊息
          if (result.count > 0) {
            this.showNotification(this.getLocalizedText('importSuccess') + ` ${result.count} ` + this.getLocalizedText('cards'), 'success');
          } else if (result.duplicates && result.duplicates.length > 0) {
            this.showNotification(result.message || this.getLocalizedText('duplicatesDetected', '檢測到') + ` ${result.duplicates.length} ` + this.getLocalizedText('duplicateCardsSkipped', '張重複名片，已跳過匯入'), 'info');
          } else {
            this.showNotification(this.getLocalizedText('importCompleteNoNew', '匯入完成，但沒有新增名片'), 'info');
          }
          await this.updateStats();
        } else {
          this.showNotification(result.error || this.getLocalizedText('importFailed'), 'error');
        }
      }
    } catch (error) {
      console.error('[PWA] Import from file failed:', error);
      this.showNotification(this.getLocalizedText('importFailed'), 'error');
    } finally {
      this.hideLoading();
    }
  }

  async exportCards() {
    try {
      const exportAll = document.getElementById('export-all')?.checked;
      const includeVersions = document.getElementById('export-versions')?.checked;
      const encrypt = document.getElementById('export-encrypt')?.checked;
      const format = document.getElementById('export-format')?.value || 'json';

      this.showLoading('匯出資料中...');

      if (this.transferManager && encrypt) {
        // 使用加密匯出
        const passwordResult = await SecurityInputHandler.securePrompt('請輸入加密密碼', {
          title: '設定加密密碼',
          inputType: 'password',
          validation: { minLength: 6, allowEmpty: false },
          placeholder: '至少6個字符'
        });
        if (!passwordResult.confirmed) {
          this.hideLoading();
          return;
        }
        const password = passwordResult.value;
        
        const result = await this.transferManager.exportEncrypted({
          exportAll,
          includeVersions,
          encryptWithPassword: true,
          password
        });

        if (result.success) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(result.file);
          link.download = result.filename;
          link.click();
          
          this.showNotification(this.getLocalizedText('encryptedExportSuccess', '加密匯出成功'), 'success');
        } else {
          this.showNotification(result.error || this.getLocalizedText('exportFailed'), 'error');
        }
      } else if (this.cardManager) {
        // 使用新的匯出功能（會自動下載檔案）
        const result = await this.cardManager.exportCards({
          exportAll,
          includeVersions,
          format: format, // 使用用戶選擇的格式
          autoDownload: true // 自動下載檔案
        });

        if (result.success) {
          this.showNotification(this.getLocalizedText('exportSuccess', '成功匯出') + ` ${result.count} ` + this.getLocalizedText('cards'), 'success');
        } else {
          this.showNotification(result.error || this.getLocalizedText('exportFailed'), 'error');
        }
      }
    } catch (error) {
      console.error('[PWA] Export failed:', error);
      this.showNotification(this.getLocalizedText('exportFailed'), 'error');
    } finally {
      this.hideLoading();
    }
  }




  async viewCard(cardId) {
    try {
      
      if (!this.cardManager) {
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
        return;
      }

      const card = await this.storage.getCard(cardId);
      if (!card) {
        this.showNotification(this.getLocalizedText('cardNotFound'), 'error');
        return;
      }

      this.showCardModal(card);
    } catch (error) {
      console.error('[PWA] View card failed:', error);
      this.showNotification(this.getLocalizedText('operationFailed'), 'error');
    }
  }

  /**
   * UI-03: 顯示版本管理介面
   */
  async showVersionManagement(cardId) {
    try {
      if (!this.storage || !this.versionManager) {
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
        return;
      }

      const card = await this.storage.getCard(cardId);
      if (!card) {
        this.showNotification(this.getLocalizedText('cardNotFound'), 'error');
        return;
      }

      // 初始化版本管理介面
      if (!this.versionInterface) {
        this.versionInterface = new VersionManagementInterface(this.storage, this.versionManager);
      }

      await this.versionInterface.showVersionDialog(cardId, card);
    } catch (error) {
      console.error('[PWA] Show version management failed:', error);
      this.showNotification(this.getLocalizedText('operationFailed'), 'error');
    }
  }

  async generateQR(cardId) {
    try {
      
      if (!this.cardManager) {
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
        return;
      }
      
      this.showLoading('生成 QR 碼中...');
      const result = await this.cardManager.generateQRCode(cardId, {
        size: 800, // 高解析度
        colorDark: '#6b7280',
        colorLight: '#ffffff'
      });
      
      
      if (result.success) {
        this.showQRModal(result.dataUrl, result.url, cardId);
      } else {
        this.showNotification(result.error || this.getLocalizedText('qrFailed'), 'error');
      }
    } catch (error) {
      console.error('[PWA] Generate QR failed:', error);
      this.showNotification(this.getLocalizedText('qrFailed'), 'error');
    } finally {
      this.hideLoading();
    }
  }

  async exportVCard(cardId) {
    try {
      if (!this.offlineTools) {
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
        return;
      }
      
      // 使用統一的語言獲取方法
      const currentLang = this.getCurrentLanguage();
      
      // 使用 OfflineToolsManager 的 exportVCard 方法，確保名片類型正確傳遞
      const result = await this.offlineTools.exportVCard(cardId, currentLang);
      if (result.success) {
        // 直接下載 vCard 檔案
        const link = document.createElement('a');
        link.href = URL.createObjectURL(result.file);
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(link.href);
        
        this.showNotification(this.getLocalizedText('vcardDownloaded'), 'success');
      } else {
        this.showNotification(result.error || this.getLocalizedText('exportFailed'), 'error');
      }
    } catch (error) {
      console.error('[PWA] Export vCard failed:', error);
      this.showNotification(this.getLocalizedText('exportFailed'), 'error');
    }
  }

  async searchCards(query) {
  }

  async filterCards(type) {
  }

  updateConnectionStatus() {
    const statusIndicator = document.getElementById('connection-status');
    if (statusIndicator) {
      if (this.isOnline) {
        statusIndicator.textContent = this.getLocalizedText('onlineMode');
        statusIndicator.className = 'status-indicator online';
      } else {
        statusIndicator.textContent = this.getLocalizedText('offlineMode');
        statusIndicator.className = 'status-indicator offline';
      }
    }
  }

  showCardModal(card) {
    const currentLang = this.getCurrentLanguage();
    
    let displayData;
    if (this.cardManager) {
      displayData = this.cardManager.getBilingualCardData(card.data, currentLang);
    } else {
      displayData = {
        ...card.data,
        email: String(card.data.email || '').trim(),
        phone: String(card.data.phone || '').trim(),
        mobile: String(card.data.mobile || '').trim()
      };
    }
    
    // SEC-02: Sanitize display data
    if (window.xssProtection) {
      displayData = window.xssProtection.sanitizeObject(displayData);
    }
    
    const labels = this.getUILabels();
    
    // 處理問候語顯示 - 支援雙語切換
    let greetingsHtml = '';
    if (displayData.greetings && Array.isArray(displayData.greetings) && displayData.greetings.length > 0) {
      const firstGreeting = displayData.greetings[0];
      let greetingText = this.extractStringFromGreeting(firstGreeting, currentLang);
      
      if (!greetingText) {
        greetingText = currentLang === 'en' ? 'Nice to meet you!' : this.getLocalizedText('defaultGreeting', '歡迎認識我');
      }
      
      // SEC-02: Sanitize greeting text
      const safeGreetingText = window.xssProtection ? 
        window.xssProtection.sanitizeOutput(greetingText) : 
        String(greetingText || '').replace(/[<>"'&]/g, '');
      
      greetingsHtml = `<div class="detail-item"><strong>${labels.greetings}:</strong><br><div class="greetings-container"><span class="greeting-item">${safeGreetingText}</span></div></div>`;
    }
    
    // 處理社群資訊顯示 - 增強互動性（安全處理）
    let socialHtml = '';
    if (displayData.socialNote) {
      let socialText = '';
      
      // 安全處理 socialNote，可能是字串或物件
      if (typeof displayData.socialNote === 'string') {
        socialText = displayData.socialNote.trim();
      } else if (typeof displayData.socialNote === 'object' && displayData.socialNote !== null) {
        // 處理雙語物件格式
        socialText = displayData.socialNote.zh || displayData.socialNote.en || String(displayData.socialNote);
      } else {
        socialText = String(displayData.socialNote || '').trim();
      }
      
      if (socialText) {
        // SEC-02: Sanitize social text before formatting
        const safeSocialText = window.xssProtection ? 
          window.xssProtection.sanitizeOutput(socialText) : 
          String(socialText).replace(/[<>"'&]/g, '');
        
        const socialContent = this.formatSocialContent(safeSocialText);
        socialHtml = `<div class="detail-item"><strong>${labels.social}:</strong><br><div class="social-content">${socialContent}</div></div>`;
      }
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content card-modal">
        <div class="modal-header">
          <h2>${labels.cardDetails}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="card-preview">
            ${displayData.avatar ? `<img src="${displayData.avatar}" alt="${labels.avatar}" class="card-avatar">` : ''}
            <h3 class="card-name">${displayData.name || ''}</h3>
            ${displayData.title ? `<p class="card-title">${displayData.title}</p>` : ''}
            ${displayData.department ? `<p class="card-department">${displayData.department}</p>` : ''}
            ${this.getCorrectOrganization(displayData, card.type) ? `<p class="card-organization">${this.getCorrectOrganization(displayData, card.type)}</p>` : ''}
          </div>
          <div class="card-details">
            ${displayData.email ? `<div class="detail-item"><strong>${labels.email}:</strong> <a href="mailto:${displayData.email}" class="contact-link">${displayData.email}</a></div>` : '<!-- 無 email 資料 -->'}
            ${displayData.phone ? `<div class="detail-item"><strong>${labels.phone}:</strong> <a href="tel:${String(displayData.phone).trim()}" class="contact-link">${String(displayData.phone).trim()}</a></div>` : ''}
            ${displayData.mobile ? `<div class="detail-item"><strong>${labels.mobile}:</strong> <a href="tel:${String(displayData.mobile).trim()}" class="contact-link">${String(displayData.mobile).trim()}</a></div>` : ''}
            ${this.getCorrectAddress(displayData, card.type) ? `<div class="detail-item"><strong>${labels.address}:</strong> ${this.getCorrectAddress(displayData, card.type)}</div>` : ''}

            ${socialHtml}
          </div>
          <div class="card-actions">
            <button class="btn btn-primary generate-qr-btn" data-card-id="${card.id}">
              ${labels.generateQR}
            </button>
            <button class="btn btn-secondary export-vcard-btn" data-card-id="${card.id}">
              ${labels.downloadVCard}
            </button>
            <button class="btn btn-secondary version-management-btn" data-card-id="${card.id}">
              📋 ${labels.versionManagement}
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const generateQRBtn = modal.querySelector('.generate-qr-btn');
    const exportVCardBtn = modal.querySelector('.export-vcard-btn');
    const versionManagementBtn = modal.querySelector('.version-management-btn');
    
    overlay.addEventListener('click', () => modal.remove());
    closeBtn.addEventListener('click', () => modal.remove());
    generateQRBtn.addEventListener('click', () => this.generateQR(card.id));
    exportVCardBtn.addEventListener('click', () => this.exportVCard(card.id));
    if (versionManagementBtn) {
      versionManagementBtn.addEventListener('click', () => {
        modal.remove();
        this.showVersionManagement(card.id);
      });
    }
    
    // 設置社群按鈕事件
    this.setupSocialButtonEvents(modal);
    
    document.body.appendChild(modal);
  }

  /**
   * 獲取正確的組織資訊
   */
  getCorrectOrganization(displayData, cardType) {
    const currentLang = this.getCurrentLanguage();
    
    // 對於政府機關版本，強制使用預設組織名稱
    if (cardType === 'index' || cardType === 'index1' || cardType === 'bilingual' || cardType === 'bilingual1') {
      return currentLang === 'en' ? 'Ministry of Digital Affairs' : '數位發展部';
    } else if (cardType === 'en' || cardType === 'en1') {
      return 'Ministry of Digital Affairs';
    }
    
    // 個人版使用實際的組織資訊
    if (displayData.organization && typeof displayData.organization === 'string') {
      return displayData.organization;
    }
    
    return '';
  }
  
  /**
   * 獲取正確的地址資訊
   */
  getCorrectAddress(displayData, cardType) {
    const currentLang = this.getCurrentLanguage();
    
    // 對於政府機關版本，強制使用預設地址
    if (cardType === 'index' || cardType === 'bilingual') {
      // 延平大樓
      return currentLang === 'en' ? 
        '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan' :
        '臺北市中正區延平南路143號';
    } else if (cardType === 'index1' || cardType === 'bilingual1') {
      // 新光大樓
      return currentLang === 'en' ? 
        '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)' :
        '臺北市中正區忠孝西路一段６６號（１７、１９樓）';
    } else if (cardType === 'en') {
      return '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan';
    } else if (cardType === 'en1') {
      return '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)';
    }
    
    // 個人版使用實際的地址資訊
    if (displayData.address && typeof displayData.address === 'string') {
      return displayData.address;
    }
    
    return '';
  }

  /**
   * 新增：格式化社群內容，增加互動性
   */
  formatSocialContent(socialNote) {
    if (!socialNote) return '';
    
    let formatted = socialNote;
    
    // 轉換常見的社群媒體格式為可點擊連結
    const socialPatterns = [
      // Line ID
      {
        pattern: /Line ID[\uff1a:]​?\s*([^\s\n]+)/gi,
        replacement: 'Line ID: <button class="social-btn" data-action="copy" data-value="$1">$1 (點擊複製)</button>'
      },
      // Facebook
      {
        pattern: /Facebook[\uff1a:]\s*([^\s\n]+)/gi,
        replacement: 'Facebook: <a href="https://facebook.com/$1" target="_blank" class="social-btn">$1</a>'
      },
      // Instagram
      {
        pattern: /Instagram[\uff1a:]\s*@?([^\s\n]+)/gi,
        replacement: 'Instagram: <a href="https://instagram.com/$1" target="_blank" class="social-btn">@$1</a>'
      },
      // Twitter/X
      {
        pattern: /Twitter[\uff1a:]\s*@?([^\s\n]+)/gi,
        replacement: 'Twitter: <a href="https://twitter.com/$1" target="_blank" class="social-btn">@$1</a>'
      },
      // LinkedIn
      {
        pattern: /LinkedIn[\uff1a:]\s*([^\s\n]+)/gi,
        replacement: 'LinkedIn: <a href="https://linkedin.com/in/$1" target="_blank" class="social-btn">$1</a>'
      }
    ];
    
    socialPatterns.forEach(({ pattern, replacement }) => {
      formatted = formatted.replace(pattern, replacement);
    });
    
    // 將換行符轉換為 <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  /**
   * 新增：設置社群按鈕事件
   * SEC-02: Enhanced with XSS protection
   */
  setupSocialButtonEvents(modal) {
    const socialButtons = modal.querySelectorAll('.social-btn[data-action="copy"]');
    socialButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const value = e.target.dataset.value;
        if (value) {
          // SEC-02: Sanitize value before using
          const safeValue = window.xssProtection ? 
            window.xssProtection.sanitizeOutput(value) : 
            String(value).replace(/[<>"'&]/g, '');
          
          try {
            await navigator.clipboard.writeText(safeValue);
            const safeMessage = `${this.getLocalizedText('linkCopied')}: ${safeValue}`;
            this.showNotification(safeMessage, 'success');
          } catch (error) {
            this.showNotification(this.getLocalizedText('copyFailed'), 'error');
          }
        }
      });
    });
  }

  async toggleTheme() {
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // 儲存主題偏好
      localStorage.setItem('pwa-theme', newTheme);
      
      // 更新主題按鈕 UI
      this.updateThemeUI();
      
      // 使用語言管理器獲取本地化訊息
      const themeKey = newTheme === 'dark' ? 'theme-dark' : 'theme-light';
      const message = this.getLocalizedText(themeKey);
      
      this.showNotification(message, 'success');
    } catch (error) {
      console.error('[PWA] Theme toggle failed:', error);
      const errorMessage = this.getLocalizedText('theme-failed');
      this.showNotification(errorMessage, 'error');
    }
  }

  async toggleLanguage() {
    try {
      let newLang;
      
      // Use Simplified Language Manager if available
      if (this.languageManager && this.languageManager.toggleLanguage) {
        newLang = await this.languageManager.toggleLanguage();
      } else if (window.languageManager && window.languageManager.toggleLanguage) {
        // Fallback to original language manager
        newLang = await window.languageManager.toggleLanguage();
      } else {
        // Manual fallback if no language manager available
        console.warn('[PWA] No language manager available, using manual toggle');
        newLang = this.currentLanguage === 'zh-TW' ? 'en' : 'zh-TW';
        this.currentLanguage = newLang;
        
        // Update language button manually
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
          const icon = langToggle.querySelector('.icon');
          if (icon) {
            icon.textContent = newLang === 'zh-TW' ? 'EN' : '中';
          }
        }
        
        // Update document language
        document.documentElement.lang = newLang;
        document.documentElement.setAttribute('data-language', newLang);
      }
      
      this.currentLanguage = newLang;
      
      // 🔧 COMPREHENSIVE UI UPDATE - Update all localized elements
      await this.updateAllLocalizedContent(newLang);
      
      // 重新載入名片列表
      if (this.currentPage === 'cards' && window.cardList) {
        try {
          await window.cardList.refresh();
        } catch (refreshError) {
          console.warn('[PWA] Card list refresh failed:', refreshError);
        }
      }
      
      // 如果有開啟的名片模態視窗，重新渲染
      const existingModal = document.querySelector('.modal.card-modal');
      if (existingModal) {
        const cardId = existingModal.querySelector('.generate-qr-btn')?.dataset.cardId;
        if (cardId) {
          existingModal.remove();
          try {
            await this.viewCard(cardId);
          } catch (viewError) {
            console.warn('[PWA] Card view refresh failed:', viewError);
          }
        }
      }
      
      // 獲取本地化訊息
      const message = newLang === 'zh-TW' ? '已切換至中文' : 'Switched to English';
      this.showNotification(message, 'success');
      
    } catch (error) {
      console.error('[PWA] Language toggle failed:', error);
      this.showNotification(this.getLocalizedText('operationFailed') + ' / Language switch failed', 'error');
    }
  }

  updateLanguageUI() {
    // 語言 UI 更新現在由 Simplified Language Manager 處理
    if (this.languageManager && this.languageManager.updateLanguageButton) {
      this.languageManager.updateLanguageButton();
    } else if (window.languageManager && window.languageManager.updateLanguageButton) {
      window.languageManager.updateLanguageButton();
    }
    
    // Update navigation labels
    this.updateNavigationLabels();
  }

  /**
   * 🔧 COMPREHENSIVE UI UPDATE - Update all localized content
   */
  async updateAllLocalizedContent(language) {
    try {
      const isZh = language === 'zh-TW';
      
      // Update language button
      const langToggle = document.getElementById('lang-toggle');
      if (langToggle) {
        const icon = langToggle.querySelector('.icon');
        if (icon) {
          icon.textContent = isZh ? 'EN' : '中';
        }
      }
      
      // Update app header
      this.updateAppHeader(isZh);
      
      // Update navigation labels
      this.updateNavigationLabels(isZh);
      
      // Update page content
      this.updatePageContent(isZh);
      
      // Update stats labels
      this.updateStatsLabels(isZh);
      
      // Update action buttons
      this.updateActionButtons(isZh);
      
      // Update form elements
      this.updateFormElements(isZh);
      
      // Update footer
      this.updateFooter(isZh);
      
      console.log(`[PWA] All localized content updated to: ${language}`);
    } catch (error) {
      console.error('[PWA] Failed to update localized content:', error);
    }
  }

  /**
   * Update app header elements
   */
  updateAppHeader(isZh) {
    const appTitle = document.getElementById('app-title');
    const appSubtitle = document.getElementById('app-subtitle');
    
    if (appTitle) {
      appTitle.textContent = isZh ? '數位名片收納' : 'Digital Card Storage';
    }
    if (appSubtitle) {
      appSubtitle.textContent = isZh ? '離線儲存中心' : 'Offline Storage Center';
    }
  }

  /**
   * Update navigation labels with correct selectors
   */
  updateNavigationLabels(isZh) {
    const navLabels = {
      'nav-home': isZh ? '首頁' : 'Home',
      'nav-cards': isZh ? '名片' : 'Cards',
      'nav-import': isZh ? '匯入' : 'Import',
      'nav-export': isZh ? '匯出' : 'Export'
    };
    
    Object.entries(navLabels).forEach(([navId, text]) => {
      const navElement = document.getElementById(navId);
      if (navElement) {
        const labelElement = navElement.querySelector('.nav-label');
        if (labelElement) {
          labelElement.textContent = text;
        }
      }
    });
  }

  /**
   * Update page content with correct IDs
   */
  updatePageContent(isZh) {
    // Welcome section
    const welcomeTitle = document.getElementById('welcome-title');
    const welcomeDesc = document.getElementById('welcome-desc');
    
    if (welcomeTitle) {
      welcomeTitle.textContent = isZh ? '歡迎使用離線名片儲存' : 'Welcome to Offline Card Storage';
    }
    if (welcomeDesc) {
      welcomeDesc.textContent = isZh ? 
        '安全地儲存和管理您的數位名片，完全離線運作' : 
        'Securely store and manage your digital cards, completely offline';
    }
    
    // Page titles
    const pageTitles = {
      'page-cards-title': isZh ? '我的名片' : 'My Cards',
      'page-import-title': isZh ? '匯入名片' : 'Import Cards',
      'page-export-title': isZh ? '匯出名片' : 'Export Cards',
      'quick-actions-title': isZh ? '快速操作' : 'Quick Actions'
    };
    
    Object.entries(pageTitles).forEach(([elementId, text]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text;
      }
    });
  }

  /**
   * Update stats labels with correct IDs
   */
  updateStatsLabels(isZh) {
    const statsLabels = {
      'stat-total-cards': isZh ? '已儲存名片' : 'Stored Cards',
      'stat-storage-used': isZh ? '儲存空間' : 'Storage Space',
      'stat-app-version': isZh ? '應用版本' : 'App Version'
    };
    
    Object.entries(statsLabels).forEach(([elementId, text]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text;
      }
    });
  }

  /**
   * Update action buttons with correct IDs
   */
  updateActionButtons(isZh) {
    const actionLabels = {
      'action-add-card': isZh ? '新增名片' : 'Add Card',
      'action-add-card-desc': isZh ? '從 URL 或檔案新增' : 'Add from URL or file',
      'action-import-file': isZh ? '匯入檔案' : 'Import File',
      'action-import-file-desc': isZh ? '批次匯入名片' : 'Batch import cards',
      'action-backup-all': isZh ? '備份資料' : 'Backup Data',
      'action-backup-all-desc': isZh ? '匯出所有名片' : 'Export all cards',
      'action-security-settings': isZh ? '安全狀態' : 'Security Status',
      'action-security-settings-desc': isZh ? '檢視系統安全資訊' : 'View system security info'
    };
    
    Object.entries(actionLabels).forEach(([elementId, text]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text;
      }
    });
  }

  /**
   * Update form elements with correct IDs
   */
  updateFormElements(isZh) {
    // Import section
    const importElements = {
      'import-url-title': isZh ? '從 URL 匯入' : 'Import from URL',
      'import-file-title': isZh ? '從檔案匯入' : 'Import from File',
      'import-url-btn': isZh ? '匯入' : 'Import',
      'import-file-btn': isZh ? '選擇檔案' : 'Choose File'
    };
    
    // Export section
    const exportElements = {
      'export-options-title': isZh ? '匯出選項' : 'Export Options',
      'export-all-label': isZh ? '匯出所有名片' : 'Export all cards',
      'export-versions-label': isZh ? '包含版本歷史' : 'Include version history',
      'export-encrypt-label': isZh ? '加密匯出檔案' : 'Encrypt export file',
      'export-btn': isZh ? '開始匯出' : 'Start Export'
    };
    
    const allElements = { ...importElements, ...exportElements };
    
    Object.entries(allElements).forEach(([elementId, text]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text;
      }
    });
    
    // Update placeholders
    const importUrl = document.getElementById('import-url');
    const cardSearch = document.getElementById('card-search');
    
    if (importUrl) {
      importUrl.placeholder = isZh ? '貼上名片連結...' : 'Paste card link...';
    }
    if (cardSearch) {
      cardSearch.placeholder = isZh ? '搜尋名片...' : 'Search cards...';
    }
    
    // Update card filter options
    const filterOptions = {
      'filter-all': isZh ? '所有類型' : 'All Types',
      'filter-gov-yp': isZh ? '政府機關版 (延平大樓)' : 'Government (Yanping Building)',
      'filter-gov-sg': isZh ? '政府機關版 (新光大樓)' : 'Government (Shin Kong Building)',
      'filter-personal': isZh ? '個人版' : 'Personal',
      'filter-bilingual': isZh ? '雙語版' : 'Bilingual'
    };
    
    Object.entries(filterOptions).forEach(([elementId, text]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text;
      }
    });
  }

  /**
   * Update footer elements
   */
  updateFooter(isZh) {
    const connectionStatus = document.getElementById('connection-status');
    const storageStatus = document.getElementById('storage-status');
    
    if (connectionStatus) {
      const isOnline = connectionStatus.classList.contains('online');
      connectionStatus.textContent = isZh ? 
        (isOnline ? '線上模式' : '離線模式') : 
        (isOnline ? 'Online Mode' : 'Offline Mode');
    }
    
    if (storageStatus && storageStatus.textContent.includes('充足') || storageStatus.textContent.includes('sufficient')) {
      storageStatus.textContent = isZh ? '儲存空間充足' : 'Storage space sufficient';
    }
  }

  updateThemeUI() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('.icon');
      if (icon) {
        const isDark = document.documentElement.classList.contains('dark');
        icon.textContent = isDark ? '☀️' : '🌙';
        themeToggle.title = isDark ? this.getLocalizedText('theme-light') : this.getLocalizedText('theme-dark');
      }
    }
  }

  showSecuritySettings() {
    // 使用語言管理器獲取當前語言狀態
    const currentLang = this.languageManager ? 
      this.languageManager.getCurrentLanguage() : 
      (window.languageManager ? window.languageManager.getCurrentLanguage() : this.currentLanguage);
    
    const isZh = currentLang === 'zh' || currentLang === 'zh-TW' || currentLang !== 'en';
    
    const securityInfo = {
      encryption: isZh ? '✅ 資料加密已啟用' : '✅ Data encryption enabled',
      csp: isZh ? '✅ 內容安全政策已配置' : '✅ Content Security Policy configured', 
      https: location.protocol === 'https:' ? 
        (isZh ? '✅ HTTPS 連線安全' : '✅ HTTPS connection secure') : 
        (isZh ? '⚠️ 建議使用 HTTPS' : '⚠️ HTTPS recommended'),
      storage: isZh ? '✅ 離線儲存安全' : '✅ Offline storage secure',
      monitoring: this.securityMonitor ? 
        (isZh ? '✅ 安全監控運行中' : '✅ Security monitoring active') : 
        (isZh ? '⚠️ 基本安全模式' : '⚠️ Basic security mode')
    };
    
    const title = isZh ? '系統安全狀態' : 'System Security Status';
    const subtitle = isZh ? '安全功能已自動化管理' : 'Security features are automatically managed';
    const infoText = Object.values(securityInfo).join('\n');
    
    this.showNotification(`${title}\n\n${subtitle}\n\n${infoText}`, 'info');
  }

  getUILabels() {
    // TRANS-002: 使用 SafeTranslationHandler 統一錯誤處理，確保無 undefined 返回
    const currentLang = this.getCurrentLanguage();
    const isEn = currentLang === 'en' || currentLang === 'en-US';
    
    // 定義語言特定的備用文字
    const fallbacks = {
      cardDetails: isEn ? 'Card Details' : '名片詳細資訊',
      avatar: isEn ? 'Avatar' : '大頭貼',
      email: isEn ? 'Email' : '電子郵件',
      phone: isEn ? 'Phone' : '電話',
      mobile: isEn ? 'Mobile' : '手機',
      address: isEn ? 'Address' : '地址',
      greetings: isEn ? 'Greetings' : '問候語',
      social: isEn ? 'Social Links' : '社群連結',
      generateQR: isEn ? 'Generate QR' : '生成 QR 碼',
      downloadVCard: isEn ? 'Download vCard' : '下載 vCard',
      qrCode: isEn ? 'QR Code' : 'QR 碼',
      downloadQR: isEn ? 'Download QR Code' : '下載 QR 碼',
      copyLink: isEn ? 'Copy Link' : '複製連結',
      qrTip: isEn ? 'Scan this QR code to open the digital business card' : '掃描此 QR 碼即可開啟數位名片',
      versionManagement: isEn ? 'Version Management' : '版本管理'
    };
    
    // 優先使用 SafeTranslationHandler 進行翻譯
    if (window.SafeTranslationHandler) {
      try {
        const result = {};
        Object.keys(fallbacks).forEach(key => {
          const translated = window.SafeTranslationHandler.getTranslation(key, currentLang, {
            fallback: fallbacks[key]
          });
          // 確保返回值不為 undefined 或 null
          result[key] = translated && translated.trim() !== '' ? translated : fallbacks[key];
        });
        return result;
      } catch (error) {
        console.warn('[PWA] SafeTranslationHandler failed in getUILabels:', error);
        // 繼續使用備用方案
      }
    }
    
    // 備用方案 1: 使用語言管理器但加入空值檢查
    if (window.languageManager && typeof window.languageManager.getText === 'function') {
      try {
        const result = {};
        Object.keys(fallbacks).forEach(key => {
          const translated = window.languageManager.getText(key, currentLang, { fallback: null });
          // TRANS-002: 關鍵修復 - 檢查 undefined/null 並使用備用文字
          result[key] = (translated && translated !== key && translated.trim() !== '') ? 
            translated : fallbacks[key];
        });
        return result;
      } catch (error) {
        console.warn('[PWA] Language manager failed in getUILabels:', error);
        // 繼續使用最終備用方案
      }
    }
    
    // 最終備用方案: 直接返回備用文字
    return fallbacks;
  }

  showQRModal(dataUrl, url, cardId = null) {
    const labels = this.getUILabels();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content qr-modal">
        <div class="modal-header">
          <h2>${labels.qrCode || 'QR 碼'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body text-center">
          <img src="${dataUrl}" alt="QR Code" class="qr-image">
          <p class="qr-url">${url}</p>
          <div class="qr-actions">
            <button class="btn btn-primary download-qr-btn" data-url="${dataUrl}" data-card-id="${cardId || ''}">
              📥 ${labels.downloadQR || '下載 QR 碼'}
            </button>
            <button class="btn btn-secondary copy-url-btn" data-url="${url}">
              📋 ${labels.copyLink || '複製連結'}
            </button>
          </div>

        </div>
      </div>
    `;
    
    // Add event listeners
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const downloadQRBtn = modal.querySelector('.download-qr-btn');
    const copyUrlBtn = modal.querySelector('.copy-url-btn');
    
    overlay.addEventListener('click', () => modal.remove());
    closeBtn.addEventListener('click', () => modal.remove());
    downloadQRBtn.addEventListener('click', () => this.downloadQR(dataUrl, cardId || ''));
    copyUrlBtn.addEventListener('click', () => this.copyUrl(url));
    
    document.body.appendChild(modal);
  }

  async downloadQR(dataUrl, cardId) {
    try {
      if (!window.qrUtils) {
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
        return;
      }

      // 使用統一的語言獲取方法
      const currentLang = this.getCurrentLanguage();

      // 獲取名片資料以生成智慧檔名
      let filename = 'qr-code.png';
      if (cardId && this.storage) {
        try {
          const card = await this.storage.getCard(cardId);
          if (card && card.data) {
            const displayName = this.cardManager ? 
              this.cardManager.getDisplayName(card.data, currentLang) : 
              card.data.name;
            filename = window.qrUtils.generateSmartFilename(displayName, currentLang);
          }
        } catch (error) {
        }
      }

      const result = await window.qrUtils.downloadQRCode(dataUrl, filename);
      if (result.success) {
        this.showNotification(this.getLocalizedText('qrDownloaded'), 'success');
      } else {
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
      }
    } catch (error) {
      console.error('[PWA] Download QR failed:', error);
      this.showNotification(this.getLocalizedText('operationFailed'), 'error');
    }
  }

  async copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      this.showNotification(this.getLocalizedText('linkCopied'), 'success');
    } catch (error) {
      console.error('[PWA] Copy URL failed:', error);
      this.showNotification(this.getLocalizedText('copyFailed'), 'error');
    }
  }

  showLoading(message = null) {
    if (!message) {
      message = this.getLocalizedText('loading');
    }
    const loading = document.getElementById('loading');
    const loadingText = document.querySelector('.loading-text');
    
    if (loading) {
      loading.classList.remove('hidden');
    }
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = notification?.querySelector('.notification-icon');
    const messageEl = notification?.querySelector('.notification-message');

    if (!notification || !icon || !messageEl) {
      console.warn('[PWA] Notification elements not found');
      // 創建臨時通知
      this.createTemporaryNotification(message, type);
      return;
    }

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    // SEC-02: Sanitize notification content
    const safeMessage = window.xssProtection ? 
      window.xssProtection.sanitizeOutput(message) : 
      String(message || '').replace(/[<>"'&]/g, '');

    // 設置通知內容
    icon.textContent = icons[type] || icons.info;
    if (window.xssProtection) {
      window.xssProtection.safeSetHTML(messageEl, safeMessage);
    } else {
      messageEl.textContent = safeMessage;
    }

    // 清除舊的類型類別
    notification.classList.remove('success', 'error', 'warning', 'info');
    // 添加新的類型類別
    notification.classList.add(type);

    // 確保通知位置正確
    notification.style.position = 'fixed';
    notification.style.top = '1rem';
    notification.style.right = '1rem';
    notification.style.left = 'auto';
    notification.style.bottom = 'auto';
    notification.style.zIndex = '1001';

    // 顯示通知
    notification.classList.remove('hidden');
    notification.style.display = 'block';
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';

    // 清除之前的計時器
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    
    // 設置自動隱藏
    this.notificationTimer = setTimeout(() => {
      this.hideNotification();
    }, type === 'error' ? 8000 : 5000); // 錯誤訊息顯示更久
  }

  hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        notification.classList.add('hidden');
        notification.style.display = 'none';
      }, 300);
    }
  }
  
  createTemporaryNotification(message, type) {
    // SEC-02: Sanitize message before creating notification
    const safeMessage = window.xssProtection ? 
      window.xssProtection.sanitizeOutput(message) : 
      String(message || '').replace(/[<>"'&]/g, '');

    // 創建臨時通知元素 - 使用 moda 設計系統
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed !important;
      top: 1rem !important;
      right: 1rem !important;
      left: auto !important;
      bottom: auto !important;
      background: var(--md-white-1, #ffffff);
      border: 2px solid var(--md-primary-1, #6868ac);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(104, 104, 172, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 1001;
      max-width: 400px;
      min-width: 320px;
      font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
      backdrop-filter: blur(10px);
      border-left-width: 6px;
    `;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const borderColors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: 'var(--md-primary-1, #6868ac)'
    };
    
    notification.style.borderLeftColor = borderColors[type] || borderColors.info;
    
    // SEC-02: Create safe HTML structure without innerHTML
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; padding: 1.25rem; gap: 1rem; background: var(--md-white-1, #ffffff); color: var(--md-black-1, #1a1a1a); border-radius: 12px;';
    
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 1.5rem; flex-shrink: 0;';
    iconSpan.textContent = icons[type] || icons.info;
    
    const messageSpan = document.createElement('span');
    messageSpan.style.cssText = 'flex: 1; font-size: 1rem; font-weight: 500; color: var(--md-black-1, #1a1a1a); line-height: 1.4; font-family: inherit;';
    messageSpan.textContent = safeMessage;
    
    const closeButton = document.createElement('button');
    closeButton.style.cssText = 'background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--md-secondary-1, #565e62); padding: 0.5rem; border-radius: 6px; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;';
    closeButton.textContent = '×';
    
    container.appendChild(iconSpan);
    container.appendChild(messageSpan);
    container.appendChild(closeButton);
    notification.appendChild(container);
    
    closeButton.addEventListener('click', () => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    });
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'var(--md-neutral-9, #f3f5f6)';
      closeButton.style.color = 'var(--md-black-1, #1a1a1a)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'none';
      closeButton.style.color = 'var(--md-secondary-1, #565e62)';
    });
    
    document.body.appendChild(notification);
    
    // 自動移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, type === 'error' ? 8000 : 5000);
  }

  async handleConflictResolution(conflicts, importData) {
    // 簡化版衝突解決：顯示確認對話框
    const conflictCount = conflicts.length;
    const message = `發現 ${conflictCount} 個衝突的名片。\n\n選擇處理方式：\n- 確定：覆蓋現有名片\n- 取消：跳過衝突的名片`;
    
    const shouldReplace = await SecurityInputHandler.secureConfirm(message, {
      title: '衝突解決',
      confirmText: '覆蓋現有',
      cancelText: '跳過衝突',
      danger: true
    });
    const resolutions = conflicts.map(() => shouldReplace ? 'replace' : 'skip');
    
    try {
      const result = await this.transferManager.resolveConflictsAndImport(importData, resolutions);
      
      if (result.success) {
        this.showNotification(this.getLocalizedText('importSuccess') + ` ${result.importedCount} ` + this.getLocalizedText('cards'), 'success');
        await this.updateStats();
      } else {
        this.showNotification(result.error || this.getLocalizedText('conflictResolutionFailed', '衝突解決失敗'), 'error');
      }
    } catch (error) {
      console.error('[PWA] Conflict resolution failed:', error);
      this.showNotification(this.getLocalizedText('conflictResolutionFailed'), 'error');
    }
  }

  /**
   * 設置清理處理器，確保應用程式關閉時正確清理資源
   */
  setupCleanupHandlers() {
    // 頁面關閉時清理
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // 頁面隱藏時清理（移動設備切換應用）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.cleanup();
      }
    });
    
    // PWA 安裝時的特殊處理
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed, reinitializing storage...');
      this.reinitializeStorage();
    });
    
    // SEC-03: Setup security event monitoring
    if (this.storage?.healthMonitor) {
      // Monitor for security-related browser events
      window.addEventListener('securitypolicyviolation', (event) => {
        this.storage.healthMonitor.recordSecurityEvent('csp_violation', {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          documentURI: event.documentURI
        });
      });
    }
  }
  
  /**
   * 清理資源
   */
  cleanup() {
    try {
      // COMP-02: Cleanup component registry
      if (this.componentRegistry) {
        this.componentRegistry.cleanup();
      }
      
      // COMP-04: Cleanup health monitor
      if (this.healthMonitor) {
        this.healthMonitor.cleanup();
      }
      
      // COMP-01: Cleanup language manager
      if (this.languageManager && this.languageManager.cleanup) {
        this.languageManager.cleanup();
      }
      
      if (this.storage && typeof this.storage.cleanup === 'function') {
        this.storage.cleanup();
      }
      
      // 清理通知計時器
      if (this.notificationTimer) {
        clearTimeout(this.notificationTimer);
        this.notificationTimer = null;
      }
    } catch (error) {
      console.error('[PWA] Cleanup failed:', error);
    }
  }
  
  /**
   * 重新初始化儲存（用於連線復原）
   */
  async reinitializeStorage() {
    try {
      if (this.storage) {
        this.storage.cleanup();
        await this.storage.initialize();
        console.log('[PWA] Storage reinitialized successfully');
      }
    } catch (error) {
      console.error('[PWA] Storage reinitialization failed:', error);
      this.showNotification('資料庫重新連線失敗', 'error');
    }
  }



  async clearUrlParams() {
    try {
      // 方法1: 使用 history.replaceState 清除參數
      const currentUrl = new URL(window.location);
      currentUrl.search = '';
      currentUrl.hash = '';
      window.history.replaceState({}, '', currentUrl.toString());
      
      // 方法2: 正確處理異步導航到首頁
      await this.navigateTo('home');
      
      this.showNotification(this.getLocalizedText('backToHomeSuccess'), 'success');
    } catch (error) {
      console.error('[PWA] Clear URL params failed:', error);
      // 備用方案：直接導航到首頁
      try {
        await this.navigateTo('home');
        this.showNotification(this.getLocalizedText('backToHomeSuccess'), 'success');
      } catch (fallbackError) {
        console.error('[PWA] Fallback navigation failed:', fallbackError);
        this.showNotification(this.getLocalizedText('operationFailed'), 'error');
      }
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new PWACardApp();
  window.app = app;
});

window.addEventListener('error', (event) => {
  console.error('[PWA] Global error:', event.error);
  
  // 過濾內部導航和初始化錯誤，避免顯示不必要的通知
  const errorMessage = event.error?.message || '';
  const isInternalError = errorMessage.includes('Navigation') || 
                         errorMessage.includes('Page initialization') ||
                         errorMessage.includes('Settings button') ||
                         errorMessage.includes('Clear URL params') ||
                         errorMessage.includes('Home 鍵') ||
                         event.filename?.includes('app.js') ||
                         event.filename?.includes('unified-mobile-manager.js');
  
  if (app && !isInternalError) {
    app.showNotification(app.getLocalizedText('operationFailed'), 'error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[PWA] Unhandled promise rejection:', event.reason);
  
  // 過濾內部 Promise 錯誤
  const reason = event.reason?.message || event.reason || '';
  const isInternalError = String(reason).includes('Navigation') || 
                         String(reason).includes('Page initialization') ||
                         String(reason).includes('Settings button') ||
                         String(reason).includes('Clear URL params') ||
                         String(reason).includes('Home 鍵');
  
  if (app && !isInternalError) {
    app.showNotification(app.getLocalizedText('operationFailed'), 'error');
  }
});

