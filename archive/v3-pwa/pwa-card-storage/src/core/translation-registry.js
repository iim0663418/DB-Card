/**
 * Unified Translation Registry
 * Manages all translation resources with dot notation queries and caching
 * Supports security components, PWA UI, and accessibility translations
 */

class TranslationRegistry {
  constructor() {
    this.translations = new Map();
    this.cache = new Map();
    this.fallbackLanguage = 'zh';
    this.supportedLanguages = ['zh', 'en'];
    this.initialized = false;
  }

  /**
   * Initialize translation registry with all translation resources
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load all translation resources
      await this.loadTranslations();
      this.initialized = true;
      console.log('[TranslationRegistry] Initialized with languages:', this.supportedLanguages);
    } catch (error) {
      console.error('[TranslationRegistry] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load all translation resources
   */
  async loadTranslations() {
    try {
      // Load accessibility translations from external files
      const accessibilityZh = await this.loadAccessibilityTranslations('zh');
      const accessibilityEn = await this.loadAccessibilityTranslations('en');

      const translationSources = {
        zh: {
          // PWA core translations (from existing LanguageManager)
          pwa: {
            appTitle: '數位名片收納',
            appSubtitle: '離線儲存中心',
            themeToggle: '主題切換',
            languageToggle: '語言切換',
            backToHome: '回到首頁',
            home: '首頁',
            cards: '名片',
            import: '匯入',
            export: '匯出',
            close: '關閉',
            confirm: '確定',
            cancel: '取消',
            
            // Card list component translations
            cardList: {
              view: '檢視',
              share: '分享',
              download: '下載',
              delete: '刪除',
              emptyTitle: '還沒有儲存任何名片',
              emptyDescription: '匯入您的第一張數位名片，開始建立您的名片收藏',
              emptyAction: '開始匯入名片',
              searchPlaceholder: '搜尋名片...',
              filterAll: '全部',
              loadingCards: '載入名片中...',
              deleteConfirm: '確定要刪除這張名片嗎？此操作無法復原。',
              deleteSuccess: '名片已成功刪除',
              deleteFailed: '刪除失敗'
            },
            
            // Navigation translations
            navigation: {
              home: '首頁',
              cards: '我的名片',
              import: '匯入名片',
              export: '匯出資料',
              settings: '設定'
            },
            
            // Notification translations
            notifications: {
              languageChanged: '語言已切換',
              themeChanged: '主題已切換',
              cardImported: '名片匯入成功',
              cardDeleted: '名片已刪除',
              operationFailed: '操作失敗',
              networkError: '網路連線錯誤'
            },
            
            // Modal and dialog translations
            modals: {
              cardDetails: '名片詳細資訊',
              generateQR: '生成 QR 碼',
              downloadVCard: '下載 vCard',
              copyLink: '複製連結',
              qrCode: 'QR 碼',
              downloadQR: '下載 QR 碼',
              qrTip: '掃描此 QR 碼即可開啟數位名片'
            },
            
            // Form field translations
            fields: {
              name: '姓名',
              title: '職稱',
              email: '電子郵件',
              phone: '電話',
              mobile: '手機',
              address: '地址',
              organization: '組織',
              department: '部門',
              greetings: '問候語',
              social: '社群連結',
              avatar: '大頭貼'
            },
            
            // Card type labels
            cardTypes: {
              index: '機關版-延平大樓',
              index1: '機關版-新光大樓',
              personal: '個人版',
              bilingual: '雙語版-延平',
              bilingual1: '雙語版-新光',
              'personal-bilingual': '個人雙語版',
              en: '英文版-延平',
              en1: '英文版-新光',
              'personal-en': '個人英文版',
              unknown: '未知類型'
            }
          },
          
          // Security components translations
          security: {
            // Direct translation keys for ClientSideSecurityOnboarding compatibility
            benefits: '優點：',
            risks: '注意事項：',
            
            userCommunication: {
              containerLabel: '系統通知',
              messageTypes: {
                securityEnhancement: '安全功能已啟用',
                securityIssue: '安全提醒',
                featureUpdate: '功能更新',
                maintenance: '系統維護',
                success: '成功',
                warning: '警告',
                error: '錯誤',
                info: '資訊'
              },
              actions: {
                close: '關閉',
                dismiss: '忽略',
                learnMore: '了解更多',
                checkSettings: '檢查設定',
                retry: '重試',
                settings: '設定'
              }
            },
            onboarding: {
              title: '安全功能設定',
              subtitle: '選擇適合您的安全功能，隨時可以在設定中修改',
              privacyTitle: '隱私承諾：',
              privacyNotice: '所有安全功能都在您的裝置上運行，不會將資料傳送到外部伺服器。您可以隨時停用這些功能。',
              features: {
                webauthn: {
                  name: 'WebAuthn 生物識別',
                  description: '使用指紋或臉部識別來保護您的名片資料',
                  benefits: ['更安全的身份驗證', '無需記住密碼', '快速便捷的存取'],
                  risks: ['需要支援的裝置', '可能影響載入速度']
                },
                encryption: {
                  name: '資料加密',
                  description: '自動加密儲存在瀏覽器中的名片資料',
                  benefits: ['保護敏感資訊', '防止未授權存取', '符合隱私標準'],
                  risks: ['可能影響效能', '需要額外的儲存空間']
                },
                monitoring: {
                  name: '安全監控',
                  description: '監控系統安全狀態並提供即時警報',
                  benefits: ['即時威脅偵測', '系統健康監控', '自動安全回應'],
                  risks: ['收集使用統計', '可能產生通知']
                }
              },
              actions: {
                skip: '稍後設定',
                confirm: '確認設定'
              }
            }
          },

          // Accessibility translations (loaded from external file)
          accessibility: accessibilityZh
        },

        en: {
          // PWA core translations
          pwa: {
            appTitle: 'Digital Card Hub',
            appSubtitle: 'Offline Storage Center',
            themeToggle: 'Toggle Theme',
            languageToggle: 'Switch Language',
            backToHome: 'Back to Home',
            home: 'Home',
            cards: 'Cards',
            import: 'Import',
            export: 'Export',
            close: 'Close',
            confirm: 'Confirm',
            cancel: 'Cancel',
            
            // Card list component translations
            cardList: {
              view: 'View',
              share: 'Share',
              download: 'Download',
              delete: 'Delete',
              emptyTitle: 'No Cards Saved Yet',
              emptyDescription: 'Import your first digital business card to start building your collection',
              emptyAction: 'Start Importing Cards',
              searchPlaceholder: 'Search cards...',
              filterAll: 'All',
              loadingCards: 'Loading cards...',
              deleteConfirm: 'Are you sure you want to delete this card? This action cannot be undone.',
              deleteSuccess: 'Card deleted successfully',
              deleteFailed: 'Delete failed'
            },
            
            // Navigation translations
            navigation: {
              home: 'Home',
              cards: 'My Cards',
              import: 'Import Cards',
              export: 'Export Data',
              settings: 'Settings'
            },
            
            // Notification translations
            notifications: {
              languageChanged: 'Language switched',
              themeChanged: 'Theme switched',
              cardImported: 'Card imported successfully',
              cardDeleted: 'Card deleted',
              operationFailed: 'Operation failed',
              networkError: 'Network connection error'
            },
            
            // Modal and dialog translations
            modals: {
              cardDetails: 'Card Details',
              generateQR: 'Generate QR Code',
              downloadVCard: 'Download vCard',
              copyLink: 'Copy Link',
              qrCode: 'QR Code',
              downloadQR: 'Download QR Code',
              qrTip: 'Scan this QR code to open the digital business card'
            },
            
            // Form field translations
            fields: {
              name: 'Name',
              title: 'Title',
              email: 'Email',
              phone: 'Phone',
              mobile: 'Mobile',
              address: 'Address',
              organization: 'Organization',
              department: 'Department',
              greetings: 'Greetings',
              social: 'Social Links',
              avatar: 'Avatar'
            },
            
            // Card type labels
            cardTypes: {
              index: 'Official-Yanping',
              index1: 'Official-Xinyi',
              personal: 'Personal',
              bilingual: 'Bilingual-Yanping',
              bilingual1: 'Bilingual-Xinyi',
              'personal-bilingual': 'Personal Bilingual',
              en: 'English-Yanping',
              en1: 'English-Xinyi',
              'personal-en': 'Personal English',
              unknown: 'Unknown Type'
            }
          },

          // Security components translations
          security: {
            // Direct translation keys for ClientSideSecurityOnboarding compatibility
            benefits: 'Benefits:',
            risks: 'Considerations:',
            
            userCommunication: {
              containerLabel: 'System Notifications',
              messageTypes: {
                securityEnhancement: 'Security Feature Enabled',
                securityIssue: 'Security Alert',
                featureUpdate: 'Feature Update',
                maintenance: 'System Maintenance',
                success: 'Success',
                warning: 'Warning',
                error: 'Error',
                info: 'Information'
              },
              actions: {
                close: 'Close',
                dismiss: 'Dismiss',
                learnMore: 'Learn More',
                checkSettings: 'Check Settings',
                retry: 'Retry',
                settings: 'Settings'
              }
            },
            onboarding: {
              title: 'Security Features Setup',
              subtitle: 'Choose security features that suit you, can be modified in settings anytime',
              privacyTitle: 'Privacy Promise:',
              privacyNotice: 'All security features run on your device and do not send data to external servers. You can disable these features at any time.',
              features: {
                webauthn: {
                  name: 'WebAuthn Biometric',
                  description: 'Use fingerprint or face recognition to protect your card data',
                  benefits: ['More secure authentication', 'No passwords to remember', 'Fast and convenient access'],
                  risks: ['Requires supported device', 'May affect loading speed']
                },
                encryption: {
                  name: 'Data Encryption',
                  description: 'Automatically encrypt card data stored in browser',
                  benefits: ['Protect sensitive information', 'Prevent unauthorized access', 'Privacy compliant'],
                  risks: ['May affect performance', 'Requires additional storage']
                },
                monitoring: {
                  name: 'Security Monitoring',
                  description: 'Monitor system security status and provide real-time alerts',
                  benefits: ['Real-time threat detection', 'System health monitoring', 'Automatic security response'],
                  risks: ['Collects usage statistics', 'May generate notifications']
                }
              },
              actions: {
                skip: 'Set up later',
                confirm: 'Confirm Settings'
              }
            }
          },

          // Accessibility translations (loaded from external file)
          accessibility: accessibilityEn
        }
      };

      // Store translations
      for (const [lang, translations] of Object.entries(translationSources)) {
        this.translations.set(lang, translations);
      }
    } catch (error) {
      console.error('[TranslationRegistry] Failed to load translations:', error);
      throw error;
    }
  }

  /**
   * Load accessibility translations from external JSON files
   * @param {string} language - Language code
   * @returns {Object} Accessibility translations
   */
  async loadAccessibilityTranslations(language) {
    // Initialize retry loader if not exists
    if (!this.retryLoader) {
      const TranslationLoaderWithRetry = window.TranslationLoaderWithRetry || require('./translation-loader-with-retry.js');
      this.retryLoader = new TranslationLoaderWithRetry({
        maxRetries: 3,
        baseDelay: 1000,
        timeout: 5000,
        maxRequestsPerMinute: 10
      });
    }

    try {
      const url = `/pwa-card-storage/assets/translations/accessibility-${language}.json`;
      return await this.retryLoader.loadTranslationWithRetry(url, language);
    } catch (error) {
      console.warn(`[TranslationRegistry] Failed to load accessibility translations for ${language}, using fallback:`, error);
      
      // Fallback accessibility translations
      return {
        ariaLabels: {
          systemNotifications: language === 'zh' ? '系統通知' : 'System Notifications',
          closeNotification: language === 'zh' ? '關閉通知' : 'Close Notification',
          closeModal: language === 'zh' ? '關閉對話框' : 'Close Dialog'
        },
        screenReaderTexts: {
          languageChanged: language === 'zh' ? '語言已切換' : 'Language has been changed',
          modalOpened: language === 'zh' ? '對話框已開啟' : 'Dialog has been opened'
        },
        formLabels: {
          searchCards: language === 'zh' ? '搜尋名片' : 'Search Cards',
          filterCards: language === 'zh' ? '篩選名片' : 'Filter Cards'
        },
        placeholders: {},
        validationMessages: {},
        statusMessages: {}
      };
    }
  }



  /**
   * Get translation using dot notation
   * @param {string} language - Language code
   * @param {string} key - Translation key with dot notation (e.g., 'security.userCommunication.containerLabel')
   * @returns {string|Array|Object} Translation value
   */
  getTranslation(language, key) {
    if (!this.supportedLanguages.includes(language)) {
      console.warn(`[TranslationRegistry] Unsupported language: ${language}, using fallback: ${this.fallbackLanguage}`);
      language = this.fallbackLanguage;
    }

    // Check cache first
    const cacheKey = `${language}:${key}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const translations = this.translations.get(language);
      if (!translations) {
        console.warn(`[TranslationRegistry] No translations found for language: ${language}`);
        return key;
      }

      // Parse dot notation
      const keyParts = key.split('.');
      let result = translations;

      for (const part of keyParts) {
        if (result && typeof result === 'object' && part in result) {
          result = result[part];
        } else {
          console.warn(`[TranslationRegistry] Translation key not found: ${key} for language: ${language}`);
          return key; // Return original key as fallback
        }
      }

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error(`[TranslationRegistry] Error retrieving translation for key: ${key}`, error);
      return key;
    }
  }

  /**
   * Check if a translation key exists
   * @param {string} language - Language code
   * @param {string} key - Translation key
   * @returns {boolean} True if key exists
   */
  hasTranslation(language, key) {
    const result = this.getTranslation(language, key);
    return result !== key;
  }

  /**
   * Get all translations for a language
   * @param {string} language - Language code
   * @returns {Object} All translations for the language
   */
  getAllTranslations(language) {
    return this.translations.get(language) || {};
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[TranslationRegistry] Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      languages: this.supportedLanguages,
      initialized: this.initialized
    };
  }

  /**
   * Validate translation completeness
   * @returns {Object} Validation report
   */
  validateTranslations() {
    const report = {
      valid: true,
      missing: [],
      extra: []
    };

    if (this.translations.size < 2) {
      report.valid = false;
      report.missing.push('Insufficient language support');
      return report;
    }

    // Get all keys from the first language as reference
    const [firstLang] = this.supportedLanguages;
    const referenceKeys = this.getAllKeysFlat(this.translations.get(firstLang));

    // Check other languages for missing keys
    for (const lang of this.supportedLanguages.slice(1)) {
      const langKeys = this.getAllKeysFlat(this.translations.get(lang));
      
      for (const key of referenceKeys) {
        if (!langKeys.includes(key)) {
          report.valid = false;
          report.missing.push(`${lang}: ${key}`);
        }
      }
    }

    return report;
  }

  /**
   * Get all keys in flat format from nested object
   * @param {Object} obj - Nested object
   * @param {string} prefix - Key prefix
   * @returns {Array} Flat array of keys
   */
  getAllKeysFlat(obj, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj || {})) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.getAllKeysFlat(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationRegistry;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
  window.TranslationRegistry = TranslationRegistry;
}