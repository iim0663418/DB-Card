/**
 * Simplified Language Manager - v3.2.0-pwa-deployment-compatibility
 * COMP-01: 簡化複雜的語言管理器，移除多重回退路徑
 * 
 * 設計原則：
 * - 單一回退策略：zh-TW -> en
 * - 移除複雜的多重回退邏輯
 * - 保持核心功能完整
 * - 提升初始化性能
 */

class SimplifiedLanguageManager {
  constructor() {
    this.currentLanguage = 'zh-TW';
    this.fallbackLanguage = 'en';
    this.translations = new Map();
    this.observers = new Set();
    this.initialized = false;
    this.isUpdating = false;
    
    // 簡化的性能追蹤
    this.metrics = {
      switchCount: 0,
      lastSwitchTime: 0,
      averageSwitchTime: 0
    };
    
    // 安全的翻譯快取
    this.translationCache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * 初始化語言管理器 - 簡化版本
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // 檢測瀏覽器語言偏好
      this.currentLanguage = this.detectBrowserLanguage();
      
      // 載入當前語言翻譯
      await this.loadTranslations(this.currentLanguage);
      
      // 設定 DOM 語言屬性
      this.updateDocumentLanguage();
      
      this.initialized = true;
      console.log(`[SimplifiedLanguageManager] Initialized with language: ${this.currentLanguage}`);
      
    } catch (error) {
      console.error('[SimplifiedLanguageManager] Initialization failed:', error);
      
      // 簡單回退：載入英文翻譯
      try {
        await this.loadTranslations(this.fallbackLanguage);
        this.currentLanguage = this.fallbackLanguage;
        this.updateDocumentLanguage();
        this.initialized = true;
        console.warn('[SimplifiedLanguageManager] Initialized with fallback language');
      } catch (fallbackError) {
        console.error('[SimplifiedLanguageManager] Fallback initialization failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * 檢測瀏覽器語言偏好 - 簡化邏輯
   */
  detectBrowserLanguage() {
    // 1. 檢查本地儲存
    const savedLang = localStorage.getItem('pwa-language');
    if (savedLang && this.isValidLanguage(savedLang)) {
      return savedLang;
    }
    
    // 2. 檢查瀏覽器語言
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    
    // 3. 簡單映射：中文相關 -> zh-TW，其他 -> en
    if (browserLang.startsWith('zh')) {
      return 'zh-TW';
    }
    
    return 'en';
  }

  /**
   * 驗證語言代碼
   */
  isValidLanguage(lang) {
    return ['zh-TW', 'en'].includes(lang);
  }

  /**
   * 載入翻譯資料 - 簡化版本
   */
  async loadTranslations(language) {
    if (this.translations.has(language)) {
      return; // 已載入
    }

    try {
      // 基本翻譯資料
      const translations = await this.fetchTranslations(language);
      this.translations.set(language, translations);
      
      console.log(`[SimplifiedLanguageManager] Loaded translations for: ${language}`);
      
    } catch (error) {
      console.error(`[SimplifiedLanguageManager] Failed to load translations for ${language}:`, error);
      
      // 如果不是回退語言，則拋出錯誤讓上層處理
      if (language !== this.fallbackLanguage) {
        throw error;
      }
    }
  }

  /**
   * 正規化語言代碼用於檔案路徑
   */
  normalizeLanguageCode(language) {
    // 將 zh-TW 映射到 zh 以符合檔案命名
    if (language === 'zh-TW') {
      return 'zh';
    }
    return language;
  }

  /**
   * 獲取翻譯資料 - 簡化的資料來源
   */
  async fetchTranslations(language) {
    // 內建基本翻譯，避免網路依賴
    const basicTranslations = {
      'zh-TW': {
        'app-title': '數位名片收納',
        'app-subtitle': '離線儲存中心',
        'welcome-title': '歡迎使用離線名片儲存',
        'welcome-desc': '安全地儲存和管理您的數位名片，完全離線運作',
        'loading': '載入中...',
        'error': '發生錯誤',
        'success': '操作成功',
        'cancel': '取消',
        'confirm': '確認',
        'close': '關閉',
        'theme-dark': '已切換至深色模式',
        'theme-light': '已切換至淺色模式',
        'theme-failed': '主題切換失敗',
        'cardList.emptyTitle': '尚未儲存任何名片',
        'cardList.emptyDescription': '開始建立您的數位名片收藏',
        'cardList.emptyAction': '新增第一張名片',
        'cardList.view': '檢視',
        'cardList.share': '分享',
        'cardList.download': '下載',
        'cardList.delete': '刪除',
        'cardList.loadingCards': '載入名片中...',
        'cardList.deleteConfirm': '確定要刪除這張名片嗎？此操作無法復原。',
        'cardList.deleteSuccess': '名片已成功刪除',
        'cardList.deleteFailed': '刪除失敗',
        'app.initializing': '初始化應用程式...',
        'cardSaved': '名片已成功儲存到離線收納',
        'cardImported': '名片匯入成功',
        'cardExported': '匯出成功',
        'versionManagement': '版本管理',
        'versionHistory': '版本歷史',
        'cleanupVersions': '清理版本',
        'exportVersions': '匯出版本',
        'mergeSuggestions': '合併建議',
        'viewVersion': '檢視版本',
        'compareVersion': '比較版本',
        'restoreVersion': '還原版本',
        'deleteVersion': '刪除版本',
        'modalClose': '關閉',
        'modalCancel': '取消',
        'modalConfirm': '確認',
        'versionDetails': '版本詳細資訊',
        'createdAt': '建立時間',
        'modifiedAt': '修改時間',
        'versionSize': '版本大小',
        'versionChanges': '版本變更',
        'noVersionsFound': '未找到版本',
        'versionRestored': '版本已還原',
        'versionDeleted': '版本已刪除'
      },
      'en': {
        'app-title': 'Digital Card Storage',
        'app-subtitle': 'Offline Storage Center',
        'welcome-title': 'Welcome to Offline Card Storage',
        'welcome-desc': 'Securely store and manage your digital cards, completely offline',
        'loading': 'Loading...',
        'error': 'Error occurred',
        'success': 'Operation successful',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'close': 'Close',
        'theme-dark': 'Switched to dark mode',
        'theme-light': 'Switched to light mode',
        'theme-failed': 'Theme switch failed',
        'cardList.emptyTitle': 'No cards stored yet',
        'cardList.emptyDescription': 'Start building your digital card collection',
        'cardList.emptyAction': 'Add your first card',
        'cardList.view': 'View',
        'cardList.share': 'Share',
        'cardList.download': 'Download',
        'cardList.delete': 'Delete',
        'cardList.loadingCards': 'Loading cards...',
        'cardList.deleteConfirm': 'Are you sure you want to delete this card? This action cannot be undone.',
        'cardList.deleteSuccess': 'Card deleted successfully',
        'cardList.deleteFailed': 'Delete failed',
        'app.initializing': 'Initializing application...',
        'cardSaved': 'Card saved to offline storage',
        'cardImported': 'Card imported successfully',
        'cardExported': 'Export successful',
        'versionManagement': 'Version Management',
        'versionHistory': 'Version History',
        'cleanupVersions': 'Cleanup Versions',
        'exportVersions': 'Export Versions',
        'mergeSuggestions': 'Merge Suggestions',
        'viewVersion': 'View Version',
        'compareVersion': 'Compare Version',
        'restoreVersion': 'Restore Version',
        'deleteVersion': 'Delete Version',
        'modalClose': 'Close',
        'modalCancel': 'Cancel',
        'modalConfirm': 'Confirm',
        'versionDetails': 'Version Details',
        'createdAt': 'Created At',
        'modifiedAt': 'Modified At',
        'versionSize': 'Version Size',
        'versionChanges': 'Version Changes',
        'noVersionsFound': 'No Versions Found',
        'versionRestored': 'Version Restored',
        'versionDeleted': 'Version Deleted'
      }
    };

    // 嘗試從檔案載入更多翻譯
    try {
      const normalizedLang = this.normalizeLanguageCode(language);
      const response = await fetch(`assets/translations/accessibility-${normalizedLang}.json`);
      if (response.ok) {
        const fileTranslations = await response.json();
        return { ...basicTranslations[language], ...fileTranslations };
      }
    } catch (error) {
      console.warn(`[SimplifiedLanguageManager] Could not load translation file for ${language}, using basic translations`);
    }

    return basicTranslations[language] || basicTranslations['en'];
  }

  /**
   * 切換語言 - 簡化版本
   */
  async switchLanguage(targetLanguage) {
    if (!this.isValidLanguage(targetLanguage)) {
      console.warn(`[SimplifiedLanguageManager] Invalid language: ${targetLanguage}`);
      return this.currentLanguage;
    }

    if (this.currentLanguage === targetLanguage) {
      return this.currentLanguage; // 無需切換
    }

    if (this.isUpdating) {
      console.warn('[SimplifiedLanguageManager] Language switch already in progress');
      return this.currentLanguage;
    }

    this.isUpdating = true;
    const startTime = performance.now();
    const previousLanguage = this.currentLanguage;

    try {
      // 載入目標語言翻譯
      await this.loadTranslations(targetLanguage);
      
      // 更新當前語言
      this.currentLanguage = targetLanguage;
      
      // 更新 DOM 和儲存
      this.updateDocumentLanguage();
      localStorage.setItem('pwa-language', targetLanguage);
      
      // 清理翻譯快取
      this.translationCache.clear();
      
      // 通知觀察者
      this.notifyObservers(targetLanguage, previousLanguage);
      
      // 記錄性能指標
      const duration = performance.now() - startTime;
      this.updateMetrics(duration);
      
      console.log(`[SimplifiedLanguageManager] Language switched: ${previousLanguage} -> ${targetLanguage} (${duration.toFixed(2)}ms)`);
      
      return targetLanguage;
      
    } catch (error) {
      console.error('[SimplifiedLanguageManager] Language switch failed:', error);
      
      // 簡單回退：保持原語言
      this.currentLanguage = previousLanguage;
      throw error;
      
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 切換語言（中英文互換）
   */
  async toggleLanguage() {
    const newLanguage = this.currentLanguage === 'zh-TW' ? 'en' : 'zh-TW';
    return this.switchLanguage(newLanguage);
  }

  /**
   * 獲取翻譯文字 - 簡化版本
   */
  getText(key, language = null, options = {}) {
    const targetLanguage = language || this.currentLanguage;
    
    // 輸入驗證
    if (typeof key !== 'string' || !key.trim()) {
      console.warn('[SimplifiedLanguageManager] Invalid translation key:', key);
      return options.fallback || key || '';
    }

    // 安全清理 key
    const sanitizedKey = this.sanitizeKey(key);
    
    // 檢查快取
    const cacheKey = `${targetLanguage}:${sanitizedKey}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    // 獲取翻譯
    let translation = this.getTranslationFromMap(sanitizedKey, targetLanguage);
    
    // 回退策略：如果找不到翻譯且不是回退語言，嘗試回退語言
    if (translation === sanitizedKey && targetLanguage !== this.fallbackLanguage) {
      translation = this.getTranslationFromMap(sanitizedKey, this.fallbackLanguage);
    }
    
    // 最終回退
    if (translation === sanitizedKey && options.fallback) {
      translation = options.fallback;
    }

    // 快取結果
    this.cacheTranslation(cacheKey, translation);
    
    return translation;
  }

  /**
   * 從翻譯映射中獲取翻譯
   */
  getTranslationFromMap(key, language) {
    const translations = this.translations.get(language);
    if (!translations) {
      return key;
    }

    // 支援點記法 (如: 'menu.home')
    if (key.includes('.')) {
      return this.getNestedTranslation(translations, key) || key;
    }

    return translations[key] || key;
  }

  /**
   * 獲取嵌套翻譯（支援點記法）
   */
  getNestedTranslation(translations, key) {
    const keys = key.split('.');
    let current = translations;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return typeof current === 'string' ? current : null;
  }

  /**
   * 安全清理翻譯鍵
   */
  sanitizeKey(key) {
    return key.replace(/[<>\"'&]/g, '').trim();
  }

  /**
   * 快取翻譯結果
   */
  cacheTranslation(cacheKey, translation) {
    // 限制快取大小
    if (this.translationCache.size >= this.maxCacheSize) {
      const firstKey = this.translationCache.keys().next().value;
      this.translationCache.delete(firstKey);
    }
    
    this.translationCache.set(cacheKey, translation);
  }

  /**
   * 更新文檔語言屬性
   */
  updateDocumentLanguage() {
    document.documentElement.lang = this.currentLanguage;
    document.documentElement.setAttribute('data-language', this.currentLanguage);
  }

  /**
   * 註冊觀察者
   */
  addObserver(callback) {
    if (typeof callback === 'function') {
      this.observers.add(callback);
    }
  }

  /**
   * 移除觀察者
   */
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  /**
   * 通知所有觀察者
   */
  notifyObservers(newLanguage, previousLanguage) {
    this.observers.forEach(callback => {
      try {
        callback(newLanguage, previousLanguage);
      } catch (error) {
        console.error('[SimplifiedLanguageManager] Observer callback failed:', error);
      }
    });
  }

  /**
   * 更新性能指標
   */
  updateMetrics(duration) {
    this.metrics.switchCount++;
    this.metrics.lastSwitchTime = duration;
    
    // 計算平均時間（簡單移動平均）
    if (this.metrics.switchCount === 1) {
      this.metrics.averageSwitchTime = duration;
    } else {
      this.metrics.averageSwitchTime = 
        (this.metrics.averageSwitchTime * 0.8) + (duration * 0.2);
    }
  }

  /**
   * 獲取當前語言
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * 獲取系統狀態
   */
  getStatus() {
    return {
      currentLanguage: this.currentLanguage,
      fallbackLanguage: this.fallbackLanguage,
      initialized: this.initialized,
      isUpdating: this.isUpdating,
      loadedLanguages: Array.from(this.translations.keys()),
      observerCount: this.observers.size,
      cacheSize: this.translationCache.size,
      metrics: { ...this.metrics }
    };
  }

  /**
   * 清理資源
   */
  cleanup() {
    this.observers.clear();
    this.translations.clear();
    this.translationCache.clear();
    this.initialized = false;
    this.isUpdating = false;
    
    // 重置指標
    this.metrics = {
      switchCount: 0,
      lastSwitchTime: 0,
      averageSwitchTime: 0
    };
    
    console.log('[SimplifiedLanguageManager] Cleaned up resources');
  }

  /**
   * 驗證翻譯完整性
   */
  validateTranslations() {
    const report = {
      valid: true,
      languages: [],
      missingKeys: [],
      errors: []
    };

    try {
      for (const [language, translations] of this.translations) {
        report.languages.push({
          language,
          keyCount: Object.keys(translations).length,
          hasBasicKeys: this.hasBasicTranslationKeys(translations)
        });
      }
    } catch (error) {
      report.valid = false;
      report.errors.push(error.message);
    }

    return report;
  }

  /**
   * 檢查是否有基本翻譯鍵
   */
  hasBasicTranslationKeys(translations) {
    const basicKeys = ['app-title', 'loading', 'error', 'success'];
    return basicKeys.every(key => key in translations);
  }
}

// 模組匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimplifiedLanguageManager;
}

// 瀏覽器全域
if (typeof window !== 'undefined') {
  window.SimplifiedLanguageManager = SimplifiedLanguageManager;
}