/**
 * SafeTranslationHandler - 統一翻譯錯誤處理機制
 * 提供多層備用機制確保翻譯系統穩定性
 * 
 * 備用策略：
 * 1. 語言管理器翻譯
 * 2. 內建字典備用
 * 3. 人性化鍵值生成
 * 4. 最終備用文字
 */

class SafeTranslationHandler {
  constructor(config = {}) {
    this.config = {
      enableXssProtection: config.enableXssProtection !== false,
      enableInputValidation: config.enableInputValidation !== false,
      logSecurityEvents: config.logSecurityEvents !== false,
      logLevel: config.logLevel || 'warn',
      ...config
    };

    // 內建翻譯字典 - 核心翻譯備用
    this.builtinTranslations = {
      zh: {
        // 應用核心
        'app.initializing': '初始化應用程式...',
        'app.init.failed': '應用程式初始化失敗',
        
        // 基本操作
        cardDetails: '名片詳細資訊',
        generateQR: '生成 QR 碼',
        downloadVCard: '下載 vCard',
        cardSaved: '名片已成功儲存',
        versionCreated: '已建立名片新版本',
        
        // 主題相關
        'theme-dark': '已切換至深色模式',
        'theme-light': '已切換至淺色模式',
        'theme-failed': '主題切換失敗',
        
        // 錯誤處理
        operationFailed: '操作失敗',
        systemNotReady: '系統初始化未完成，請稍後再試',
        
        // 版本管理
        versionManagement: '版本管理'
      },
      en: {
        // Application core
        'app.initializing': 'Initializing application...',
        'app.init.failed': 'Application initialization failed',
        
        // Basic operations
        cardDetails: 'Card Details',
        generateQR: 'Generate QR',
        downloadVCard: 'Download vCard',
        cardSaved: 'Card successfully saved',
        versionCreated: 'New card version created',
        
        // Theme related
        'theme-dark': 'Switched to dark mode',
        'theme-light': 'Switched to light mode',
        'theme-failed': 'Theme switch failed',
        
        // Error handling
        operationFailed: 'Operation failed',
        systemNotReady: 'System initialization incomplete, please try again later',
        
        // Version management
        versionManagement: 'Version Management'
      }
    };

    // 錯誤追蹤
    this.errorLog = new Map();
    this.fallbackUsageStats = {
      languageManager: 0,
      builtinDict: 0,
      humanReadable: 0,
      finalFallback: 0
    };
  }

  /**
   * 統一翻譯獲取方法 - 多層備用機制
   * @param {string} key - 翻譯鍵值
   * @param {string|null} lang - 目標語言
   * @param {Object} options - 選項
   * @returns {string} 翻譯文字
   */
  static getTranslation(key, lang = null, options = {}) {
    const instance = SafeTranslationHandler.getInstance();
    return instance.getTranslation(key, lang, options);
  }

  /**
   * 獲取翻譯文字 - 實例方法
   * @param {string} key - 翻譯鍵值
   * @param {string|null} lang - 目標語言
   * @param {Object} options - 選項
   * @returns {string} 翻譯文字
   */
  getTranslation(key, lang = null, options = {}) {
    // 輸入驗證
    if (!this._validateInput(key)) {
      return this._handleInvalidInput(key, options);
    }

    const sanitizedKey = this._sanitizeKey(key);
    const targetLang = this._determineTargetLanguage(lang);
    
    let translatedText = null;
    let fallbackStrategy = null;

    try {
      // 策略 1: 嘗試語言管理器
      translatedText = this._tryLanguageManager(sanitizedKey, targetLang, options);
      if (translatedText && translatedText !== sanitizedKey) {
        fallbackStrategy = 'languageManager';
        this.fallbackUsageStats.languageManager++;
      }

      // 策略 2: 使用內建字典
      if (!translatedText) {
        translatedText = this._tryBuiltinDictionary(sanitizedKey, targetLang);
        if (translatedText) {
          fallbackStrategy = 'builtinDict';
          this.fallbackUsageStats.builtinDict++;
        }
      }

      // 策略 3: 生成人性化文字
      if (!translatedText) {
        translatedText = this._generateHumanReadableText(sanitizedKey);
        fallbackStrategy = 'humanReadable';
        this.fallbackUsageStats.humanReadable++;
      }

      // 策略 4: 最終備用
      if (!translatedText) {
        translatedText = options.fallback || sanitizedKey;
        fallbackStrategy = 'finalFallback';
        this.fallbackUsageStats.finalFallback++;
      }

      // 記錄使用情況
      this._logTranslationUsage(sanitizedKey, targetLang, fallbackStrategy, translatedText);

      // XSS 防護
      if (this.config.enableXssProtection) {
        translatedText = this._sanitizeOutput(translatedText);
      }

      return translatedText;

    } catch (error) {
      this._logError(sanitizedKey, targetLang, error);
      return this._getEmergencyFallback(sanitizedKey, options);
    }
  }

  /**
   * 策略 1: 嘗試語言管理器
   * @private
   */
  _tryLanguageManager(key, lang, options) {
    try {
      // 嘗試全域語言管理器
      if (window.languageManager && typeof window.languageManager.getText === 'function') {
        const result = window.languageManager.getText(key, lang, { 
          fallback: null,
          escapeHtml: false,
          _fromSafeHandler: true  // Prevent recursion
        });
        if (result && result !== key) {
          return result;
        }
      }

      // 嘗試應用內語言管理器
      if (window.app && window.app.languageManager && typeof window.app.languageManager.getText === 'function') {
        const result = window.app.languageManager.getText(key, lang, { 
          fallback: null,
          escapeHtml: false,
          _fromSafeHandler: true  // Prevent recursion
        });
        if (result && result !== key) {
          return result;
        }
      }

      return null;
    } catch (error) {
      console.warn('[SafeTranslationHandler] Language manager access failed:', error);
      return null;
    }
  }

  /**
   * 策略 2: 使用內建字典
   * @private
   */
  _tryBuiltinDictionary(key, lang) {
    try {
      const langKey = lang === 'en' || lang === 'en-US' ? 'en' : 'zh';
      const dictionary = this.builtinTranslations[langKey];
      
      if (dictionary && dictionary[key]) {
        return dictionary[key];
      }

      // 嘗試另一種語言作為備用
      const alternateLang = langKey === 'zh' ? 'en' : 'zh';
      const alternateDictionary = this.builtinTranslations[alternateLang];
      
      if (alternateDictionary && alternateDictionary[key]) {
        return alternateDictionary[key];
      }

      return null;
    } catch (error) {
      console.warn('[SafeTranslationHandler] Builtin dictionary access failed:', error);
      return null;
    }
  }

  /**
   * 策略 3: 生成人性化文字
   * @private
   */
  _generateHumanReadableText(key) {
    try {
      if (!key || typeof key !== 'string') {
        return null;
      }

      // 處理點號分隔的鍵值 (如 app.initializing)
      let processedKey = key;
      if (key.includes('.')) {
        const parts = key.split('.');
        processedKey = parts[parts.length - 1]; // 取最後一部分
      }

      // 轉換為人性化文字
      return processedKey
        .replace(/([A-Z])/g, ' $1') // 在大寫字母前加空格
        .replace(/[-_]/g, ' ') // 替換連字符和下劃線
        .toLowerCase() // 轉小寫
        .replace(/\b\w/g, l => l.toUpperCase()) // 首字母大寫
        .trim(); // 去除多餘空格
    } catch (error) {
      console.warn('[SafeTranslationHandler] Human readable generation failed:', error);
      return null;
    }
  }

  /**
   * 輸入驗證
   * @private
   */
  _validateInput(key) {
    if (typeof key !== 'string') {
      return false;
    }
    if (key.trim() === '') {
      return false;
    }
    if (key.length > 200) { // 防止過長的鍵值
      return false;
    }
    return true;
  }

  /**
   * 處理無效輸入
   * @private
   */
  _handleInvalidInput(key, options) {
    const fallback = options.fallback || 'Invalid Key';
    this._logError(key, null, new Error('Invalid input key'));
    return fallback;
  }

  /**
   * 清理鍵值
   * @private
   */
  _sanitizeKey(key) {
    if (typeof key !== 'string') {
      return '';
    }
    
    // 移除潛在的危險字符
    return key.replace(/[<>\"'&]/g, '').trim();
  }

  /**
   * 確定目標語言
   * @private
   */
  _determineTargetLanguage(lang) {
    if (lang && ['zh', 'en', 'zh-TW', 'en-US'].includes(lang)) {
      return lang;
    }

    // 嘗試從語言管理器獲取當前語言
    try {
      if (window.languageManager && typeof window.languageManager.getCurrentLanguage === 'function') {
        return window.languageManager.getCurrentLanguage();
      }
      if (window.app && window.app.getCurrentLanguage) {
        return window.app.getCurrentLanguage();
      }
    } catch (error) {
      console.warn('[SafeTranslationHandler] Failed to determine language:', error);
    }

    // 預設語言
    return 'zh';
  }

  /**
   * 輸出清理 (XSS 防護)
   * @private
   */
  _sanitizeOutput(text) {
    if (typeof text !== 'string') {
      return text;
    }

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * 記錄翻譯使用情況
   * @private
   */
  _logTranslationUsage(key, lang, strategy, result) {
    if (this.config.logLevel === 'debug') {
      console.debug('[SafeTranslationHandler] Translation:', {
        key,
        lang,
        strategy,
        result: result.substring(0, 50) + (result.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 記錄錯誤
   * @private
   */
  _logError(key, lang, error) {
    const errorKey = `${key}_${lang}`;
    
    if (!this.errorLog.has(errorKey)) {
      this.errorLog.set(errorKey, {
        count: 0,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        error: error.message
      });
    }

    const errorInfo = this.errorLog.get(errorKey);
    errorInfo.count++;
    errorInfo.lastOccurrence = new Date();

    if (this.config.logLevel !== 'none') {
      console.warn('[SafeTranslationHandler] Translation error:', {
        key,
        lang,
        error: error.message,
        count: errorInfo.count
      });
    }
  }

  /**
   * 緊急備用方案
   * @private
   */
  _getEmergencyFallback(key, options) {
    return options.fallback || key || 'Translation Error';
  }

  /**
   * 獲取統計資訊
   */
  getStatistics() {
    return {
      fallbackUsage: { ...this.fallbackUsageStats },
      errorCount: this.errorLog.size,
      errors: Array.from(this.errorLog.entries()).map(([key, info]) => ({
        key,
        count: info.count,
        firstOccurrence: info.firstOccurrence,
        lastOccurrence: info.lastOccurrence,
        error: info.error
      }))
    };
  }

  /**
   * 清理統計資訊
   */
  clearStatistics() {
    this.errorLog.clear();
    this.fallbackUsageStats = {
      languageManager: 0,
      builtinDict: 0,
      humanReadable: 0,
      finalFallback: 0
    };
  }

  /**
   * 單例模式
   */
  static getInstance(config = {}) {
    if (!SafeTranslationHandler._instance) {
      SafeTranslationHandler._instance = new SafeTranslationHandler(config);
    }
    return SafeTranslationHandler._instance;
  }
}

// 全域實例
window.SafeTranslationHandler = SafeTranslationHandler;

// 自動初始化
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeTranslationHandler;
}