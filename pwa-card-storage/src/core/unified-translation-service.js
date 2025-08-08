/**
 * UnifiedTranslationService - 統一翻譯獲取邏輯
 * TRANS-003: 解決翻譯系統雙重依賴問題，提供單一入口點
 * 
 * 功能：
 * - 統一所有翻譯獲取邏輯
 * - 消除重複代碼
 * - 確保翻譯一致性
 * - 提供統一的輸入驗證和輸出清理
 */

class UnifiedTranslationService {
  constructor() {
    this.initialized = false;
    this.translationSources = new Map();
    this.cache = new Map();
    this.config = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      enableInputValidation: true,
      enableOutputSanitization: true,
      logLevel: 'warn'
    };
    
    this.init();
  }

  /**
   * 初始化統一翻譯服務
   */
  init() {
    try {
      // 註冊翻譯來源（按優先級排序）
      this.registerTranslationSources();
      this.initialized = true;
      console.log('[UnifiedTranslationService] Initialized successfully');
    } catch (error) {
      console.error('[UnifiedTranslationService] Initialization failed:', error);
      this.initialized = false;
    }
  }

  /**
   * 註冊翻譯來源
   * @private
   */
  registerTranslationSources() {
    // 優先級 1: SafeTranslationHandler
    this.translationSources.set('safeHandler', {
      priority: 1,
      isAvailable: () => !!window.SafeTranslationHandler,
      getText: (key, lang, options) => {
        return window.SafeTranslationHandler.getTranslation(key, lang, options);
      }
    });

    // 優先級 2: 應用內語言管理器
    this.translationSources.set('appLanguageManager', {
      priority: 2,
      isAvailable: () => !!(window.app && window.app.languageManager && window.app.languageManager.getText),
      getText: (key, lang, options) => {
        return window.app.languageManager.getText(key, lang, options);
      }
    });

    // 優先級 3: 全域語言管理器
    this.translationSources.set('globalLanguageManager', {
      priority: 3,
      isAvailable: () => !!(window.languageManager && window.languageManager.getText),
      getText: (key, lang, options) => {
        return window.languageManager.getText(key, lang, options);
      }
    });

    // 優先級 4: 內建備用字典
    this.translationSources.set('builtinFallback', {
      priority: 4,
      isAvailable: () => true,
      getText: (key, lang, options) => {
        return this.getBuiltinTranslation(key, lang, options);
      }
    });
  }

  /**
   * TRANS-003: 統一翻譯獲取入口點
   * @param {string} key - 翻譯鍵值
   * @param {string|null} lang - 目標語言
   * @param {Object} options - 選項
   * @returns {string} 翻譯文字
   */
  static getText(key, lang = null, options = {}) {
    const instance = UnifiedTranslationService.getInstance();
    return instance.getText(key, lang, options);
  }

  /**
   * 獲取翻譯文字 - 實例方法
   * @param {string} key - 翻譯鍵值
   * @param {string|null} lang - 目標語言
   * @param {Object} options - 選項
   * @returns {string} 翻譯文字
   */
  getText(key, lang = null, options = {}) {
    // 輸入驗證
    if (this.config.enableInputValidation && !this.validateInput(key)) {
      return this.handleInvalidInput(key, options);
    }

    const sanitizedKey = this.sanitizeKey(key);
    const targetLang = this.determineTargetLanguage(lang);
    const cacheKey = `${sanitizedKey}_${targetLang}`;

    // 檢查快取
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
        return cached.value;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    let translatedText = null;
    let usedSource = null;

    try {
      // 按優先級嘗試各個翻譯來源
      const sortedSources = Array.from(this.translationSources.entries())
        .sort(([, a], [, b]) => a.priority - b.priority);

      for (const [sourceName, source] of sortedSources) {
        if (source.isAvailable()) {
          try {
            const result = source.getText(sanitizedKey, targetLang, { 
              ...options, 
              fallback: null 
            });
            
            if (result && result !== sanitizedKey && result.trim() !== '') {
              translatedText = result;
              usedSource = sourceName;
              break;
            }
          } catch (sourceError) {
            console.warn(`[UnifiedTranslationService] Source ${sourceName} failed:`, sourceError);
            continue;
          }
        }
      }

      // 如果所有來源都失敗，使用最終備用
      if (!translatedText) {
        translatedText = options.fallback || this.generateHumanReadableText(sanitizedKey) || sanitizedKey;
        usedSource = 'finalFallback';
      }

      // 輸出清理
      if (this.config.enableOutputSanitization) {
        translatedText = this.sanitizeOutput(translatedText);
      }

      // 快取結果
      if (this.config.enableCache && translatedText) {
        this.cache.set(cacheKey, {
          value: translatedText,
          timestamp: Date.now(),
          source: usedSource
        });
      }

      // 記錄使用情況
      this.logTranslationUsage(sanitizedKey, targetLang, usedSource, translatedText);

      return translatedText;

    } catch (error) {
      console.error('[UnifiedTranslationService] Translation failed:', error);
      return this.getEmergencyFallback(sanitizedKey, options);
    }
  }

  /**
   * 內建備用翻譯
   * @private
   */
  getBuiltinTranslation(key, lang, options) {
    const builtinTranslations = {
      zh: {
        // 基本 UI 標籤
        cardDetails: '名片詳細資訊',
        generateQR: '生成 QR 碼',
        downloadVCard: '下載 vCard',
        versionManagement: '版本管理',
        
        // 操作相關
        operationFailed: '操作失敗',
        loading: '載入中...',
        
        // 主題相關
        'theme-dark': '已切換至深色模式',
        'theme-light': '已切換至淺色模式',
        'theme-failed': '主題切換失敗',
        
        // 應用核心
        'app.initializing': '初始化應用程式...',
        'app.init.failed': '應用程式初始化失敗'
      },
      en: {
        // Basic UI labels
        cardDetails: 'Card Details',
        generateQR: 'Generate QR',
        downloadVCard: 'Download vCard',
        versionManagement: 'Version Management',
        
        // Operations
        operationFailed: 'Operation failed',
        loading: 'Loading...',
        
        // Theme related
        'theme-dark': 'Switched to dark mode',
        'theme-light': 'Switched to light mode',
        'theme-failed': 'Theme switch failed',
        
        // Application core
        'app.initializing': 'Initializing application...',
        'app.init.failed': 'Application initialization failed'
      }
    };

    const langKey = lang === 'en' || lang === 'en-US' ? 'en' : 'zh';
    const dictionary = builtinTranslations[langKey];
    
    if (dictionary && dictionary[key]) {
      return dictionary[key];
    }

    // 嘗試另一種語言作為備用
    const alternateLang = langKey === 'zh' ? 'en' : 'zh';
    const alternateDictionary = builtinTranslations[alternateLang];
    
    if (alternateDictionary && alternateDictionary[key]) {
      return alternateDictionary[key];
    }

    return null;
  }

  /**
   * 生成人性化文字
   * @private
   */
  generateHumanReadableText(key) {
    try {
      if (!key || typeof key !== 'string') {
        return null;
      }

      // 處理點號分隔的鍵值
      let processedKey = key;
      if (key.includes('.')) {
        const parts = key.split('.');
        processedKey = parts[parts.length - 1];
      }

      // 轉換為人性化文字
      return processedKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
    } catch (error) {
      console.warn('[UnifiedTranslationService] Human readable generation failed:', error);
      return null;
    }
  }

  /**
   * 確定目標語言
   * @private
   */
  determineTargetLanguage(lang) {
    if (lang && ['zh', 'en', 'zh-TW', 'en-US'].includes(lang)) {
      return lang;
    }

    // 嘗試從各種來源獲取當前語言
    try {
      // 優先使用應用內語言管理器
      if (window.app && window.app.getCurrentLanguage) {
        return window.app.getCurrentLanguage();
      }
      
      // 使用全域語言管理器
      if (window.languageManager && window.languageManager.getCurrentLanguage) {
        return window.languageManager.getCurrentLanguage();
      }
      
      // 使用瀏覽器語言
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.startsWith('en')) return 'en';
      if (browserLang.startsWith('zh')) return 'zh';
      
    } catch (error) {
      console.warn('[UnifiedTranslationService] Failed to determine language:', error);
    }

    // 預設語言
    return 'zh';
  }

  /**
   * 輸入驗證
   * @private
   */
  validateInput(key) {
    if (typeof key !== 'string') return false;
    if (key.trim() === '') return false;
    if (key.length > 200) return false;
    return true;
  }

  /**
   * 處理無效輸入
   * @private
   */
  handleInvalidInput(key, options) {
    const fallback = options.fallback || 'Invalid Key';
    console.warn('[UnifiedTranslationService] Invalid input key:', key);
    return fallback;
  }

  /**
   * 清理鍵值
   * @private
   */
  sanitizeKey(key) {
    if (typeof key !== 'string') return '';
    return key.replace(/[<>"'&]/g, '').trim();
  }

  /**
   * 輸出清理
   * @private
   */
  sanitizeOutput(text) {
    if (typeof text !== 'string') return text;
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * 緊急備用方案
   * @private
   */
  getEmergencyFallback(key, options) {
    return options.fallback || key || 'Translation Error';
  }

  /**
   * 記錄翻譯使用情況
   * @private
   */
  logTranslationUsage(key, lang, source, result) {
    if (this.config.logLevel === 'debug') {
      console.debug('[UnifiedTranslationService] Translation:', {
        key,
        lang,
        source,
        result: result.substring(0, 50) + (result.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.clear();
    console.log('[UnifiedTranslationService] Cache cleared');
  }

  /**
   * 獲取統計資訊
   */
  getStatistics() {
    const cacheStats = {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        source: value.source,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };

    const sourceStats = Array.from(this.translationSources.entries()).map(([name, source]) => ({
      name,
      priority: source.priority,
      available: source.isAvailable()
    }));

    return {
      initialized: this.initialized,
      cache: cacheStats,
      sources: sourceStats,
      config: this.config
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[UnifiedTranslationService] Configuration updated:', this.config);
  }

  /**
   * 單例模式
   */
  static getInstance() {
    if (!UnifiedTranslationService._instance) {
      UnifiedTranslationService._instance = new UnifiedTranslationService();
    }
    return UnifiedTranslationService._instance;
  }
}

// 全域實例
window.UnifiedTranslationService = UnifiedTranslationService;

// 自動初始化
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedTranslationService;
}