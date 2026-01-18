/**
 * TRANS-004: 翻譯鍵值配置常數
 * 統一管理所有翻譯鍵值，支援動態擴展和維護
 * 
 * @version 1.0.0
 * @author PWA Translation System
 */

/**
 * 翻譯鍵值配置常數
 * 將硬編碼的翻譯鍵值陣列重構為可配置的常數管理
 */
const TRANSLATION_KEYS = {
  /**
   * 篩選選項相關翻譯鍵值
   * 用於 updateFilterSelect() 方法
   */
  FILTER_OPTIONS: [
    'allTypes',
    'cardTypes.index',
    'cardTypes.index1', 
    'cardTypes.personal',
    'cardTypes.bilingual',
    'cardTypes.bilingual1',
    'cardTypes.personal-bilingual',
    'cardTypes.en',
    'cardTypes.en1',
    'cardTypes.personal-en'
  ],

  /**
   * UI 標籤相關翻譯鍵值
   * 用於 getUILabels() 方法
   */
  UI_LABELS: [
    'cardDetails',
    'avatar',
    'email',
    'phone',
    'mobile',
    'address',
    'greetings',
    'social',
    'generateQR',
    'downloadVCard',
    'qrCode',
    'downloadQR',
    'copyLink',
    'qrTip',
    'versionManagement'
  ],

  /**
   * 導航相關翻譯鍵值
   */
  NAVIGATION: [
    'home',
    'cards',
    'import',
    'export'
  ],

  /**
   * 統計標籤翻譯鍵值
   */
  STATS_LABELS: [
    'totalCards',
    'storageUsed',
    'appVersion'
  ],

  /**
   * 快速操作翻譯鍵值
   */
  QUICK_ACTIONS: [
    'quickActions',
    'addCard',
    'addCardDesc',
    'importFile',
    'importFileDesc',
    'backupData',
    'backupDataDesc',
    'securitySettings',
    'securitySettingsDesc'
  ],

  /**
   * 頁面標題翻譯鍵值
   */
  PAGE_TITLES: [
    'myCards',
    'importCards',
    'exportCards'
  ],

  /**
   * 按鈕文字翻譯鍵值
   */
  BUTTON_TEXTS: [
    'import',
    'chooseFile',
    'startExport'
  ],

  /**
   * 匯入/匯出標題翻譯鍵值
   */
  IMPORT_EXPORT_TITLES: [
    'importFromUrl',
    'importFromFile',
    'exportOptions'
  ],

  /**
   * 匯出選項翻譯鍵值
   */
  EXPORT_OPTIONS: [
    'exportAll',
    'includeVersions',
    'encryptFile',
    'exportFormat',
    'jsonFormat',
    'vcardFormat',
    'bothFormats'
  ],

  /**
   * 必要翻譯鍵值（用於驗證）
   */
  REQUIRED_KEYS: [
    'appTitle',
    'appSubtitle',
    'themeToggle',
    'languageToggle',
    'cardSaved',
    'cardImported',
    'cardExported',
    'qrGenerated',
    'home',
    'cards',
    'import',
    'export',
    'searchCards',
    'onlineMode',
    'offlineMode',
    'storageOk',
    'storageLow',
    'loadingCards',
    'emptyTitle',
    'emptyDescription',
    'emptyAction',
    'view',
    'share',
    'download',
    'languageChanged',
    'operationFailed',
    'themeFailed',
    'switchedToChinese',
    'switchedToEnglish',
    'backToHomeSuccess'
  ]
};

/**
 * 翻譯鍵值驗證器
 * 提供格式驗證和完整性檢查功能
 */
class TranslationKeysValidator {
  /**
   * 驗證翻譯鍵值格式
   * @param {string} key - 翻譯鍵值
   * @returns {boolean} 是否為有效格式
   */
  static validateKeyFormat(key) {
    if (typeof key !== 'string' || key.trim() === '') {
      return false;
    }

    // 檢查是否包含危險字符
    const dangerousChars = /[<>\"'&]/;
    if (dangerousChars.test(key)) {
      return false;
    }

    // 檢查格式：允許字母、數字、點號、連字符、底線
    const validFormat = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
    return validFormat.test(key);
  }

  /**
   * 驗證翻譯鍵值陣列
   * @param {Array<string>} keys - 翻譯鍵值陣列
   * @returns {Object} 驗證結果
   */
  static validateKeysArray(keys) {
    if (!Array.isArray(keys)) {
      return {
        isValid: false,
        error: 'Keys must be an array',
        invalidKeys: []
      };
    }

    const invalidKeys = keys.filter(key => !this.validateKeyFormat(key));
    
    return {
      isValid: invalidKeys.length === 0,
      error: invalidKeys.length > 0 ? `Invalid keys found: ${invalidKeys.join(', ')}` : null,
      invalidKeys: invalidKeys,
      validCount: keys.length - invalidKeys.length,
      totalCount: keys.length
    };
  }

  /**
   * 檢查重複鍵值
   * @param {Array<string>} keys - 翻譯鍵值陣列
   * @returns {Object} 重複檢查結果
   */
  static checkDuplicateKeys(keys) {
    const seen = new Set();
    const duplicates = [];

    keys.forEach(key => {
      if (seen.has(key)) {
        duplicates.push(key);
      } else {
        seen.add(key);
      }
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates,
      uniqueCount: seen.size,
      totalCount: keys.length
    };
  }
}

/**
 * 動態翻譯鍵值生成器
 * 支援運行時動態生成和擴展翻譯鍵值
 */
class DynamicTranslationKeysGenerator {
  /**
   * 根據名片類型生成對應的翻譯鍵值
   * @param {string} cardType - 名片類型
   * @returns {Array<string>} 對應的翻譯鍵值陣列
   */
  static generateCardTypeKeys(cardType) {
    const baseKeys = ['cardDetails', 'generateQR', 'downloadVCard'];
    
    // 根據名片類型添加特定鍵值
    if (cardType.includes('bilingual')) {
      baseKeys.push('languageToggle', 'switchLanguage');
    }
    
    if (cardType.includes('personal')) {
      baseKeys.push('personalInfo', 'customOrganization');
    }
    
    return baseKeys;
  }

  /**
   * 根據功能模組生成翻譯鍵值
   * @param {string} module - 功能模組名稱
   * @returns {Array<string>} 對應的翻譯鍵值陣列
   */
  static generateModuleKeys(module) {
    const moduleKeyMaps = {
      'card-list': ['loadingCards', 'emptyTitle', 'emptyDescription', 'view', 'share', 'download'],
      'import': ['importCards', 'importFromUrl', 'importFromFile', 'chooseFile'],
      'export': ['exportCards', 'exportOptions', 'exportAll', 'startExport'],
      'security': ['securitySettings', 'securityTitle', 'securityEnabled'],
      'version': ['versionManagement', 'versionHistory', 'createVersion']
    };

    return moduleKeyMaps[module] || [];
  }

  /**
   * 合併多個翻譯鍵值陣列並去重
   * @param {...Array<string>} keyArrays - 多個翻譯鍵值陣列
   * @returns {Array<string>} 合併後的唯一鍵值陣列
   */
  static mergeUniqueKeys(...keyArrays) {
    const allKeys = keyArrays.flat();
    return [...new Set(allKeys)];
  }
}

/**
 * 翻譯鍵值工具函數
 */
const TranslationKeysUtils = {
  /**
   * 獲取指定分類的翻譯鍵值
   * @param {string} category - 分類名稱
   * @returns {Array<string>} 翻譯鍵值陣列
   */
  getKeysByCategory(category) {
    const upperCategory = category.toUpperCase();
    return TRANSLATION_KEYS[upperCategory] || [];
  },

  /**
   * 獲取所有翻譯鍵值（扁平化）
   * @returns {Array<string>} 所有翻譯鍵值的扁平陣列
   */
  getAllKeys() {
    return Object.values(TRANSLATION_KEYS).flat();
  },

  /**
   * 搜尋包含特定關鍵字的翻譯鍵值
   * @param {string} keyword - 搜尋關鍵字
   * @returns {Array<string>} 匹配的翻譯鍵值陣列
   */
  searchKeys(keyword) {
    const allKeys = this.getAllKeys();
    const lowerKeyword = keyword.toLowerCase();
    
    return allKeys.filter(key => 
      key.toLowerCase().includes(lowerKeyword)
    );
  },

  /**
   * 驗證所有配置的翻譯鍵值
   * @returns {Object} 完整的驗證報告
   */
  validateAllKeys() {
    const report = {
      categories: {},
      overall: {
        totalCategories: 0,
        totalKeys: 0,
        validKeys: 0,
        invalidKeys: 0,
        duplicates: []
      }
    };

    // 驗證每個分類
    Object.entries(TRANSLATION_KEYS).forEach(([category, keys]) => {
      const validation = TranslationKeysValidator.validateKeysArray(keys);
      const duplicateCheck = TranslationKeysValidator.checkDuplicateKeys(keys);
      
      report.categories[category] = {
        ...validation,
        ...duplicateCheck
      };
      
      report.overall.totalCategories++;
      report.overall.totalKeys += keys.length;
      report.overall.validKeys += validation.validCount;
      report.overall.invalidKeys += validation.invalidKeys.length;
      
      if (duplicateCheck.hasDuplicates) {
        report.overall.duplicates.push(...duplicateCheck.duplicates);
      }
    });

    // 檢查跨分類重複
    const allKeys = this.getAllKeys();
    const globalDuplicateCheck = TranslationKeysValidator.checkDuplicateKeys(allKeys);
    report.overall.globalDuplicates = globalDuplicateCheck.duplicates;

    return report;
  }
};

// 導出配置和工具
if (typeof module !== 'undefined' && module.exports) {
  // Node.js 環境
  module.exports = {
    TRANSLATION_KEYS,
    TranslationKeysValidator,
    DynamicTranslationKeysGenerator,
    TranslationKeysUtils
  };
} else {
  // 瀏覽器環境
  window.TRANSLATION_KEYS = TRANSLATION_KEYS;
  window.TranslationKeysValidator = TranslationKeysValidator;
  window.DynamicTranslationKeysGenerator = DynamicTranslationKeysGenerator;
  window.TranslationKeysUtils = TranslationKeysUtils;
}