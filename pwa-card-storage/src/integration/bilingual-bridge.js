/**
 * PWA-04: 雙語支援整合橋接器
 * 整合現有 bilingual-common.js，實作語言切換與翻譯功能
 */

class BilingualBridge {
  constructor() {
    this.currentLanguage = 'zh';
    this.translations = {
      zh: {
        // 基本 UI 標籤
        home: '首頁',
        cards: '名片管理',
        import: '匯入名片',
        export: '匯出資料',
        settings: '設定',
        
        // 名片欄位
        name: '姓名',
        title: '職稱',
        department: '部門',
        organization: '組織',
        email: '電子郵件',
        phone: '電話',
        mobile: '手機',
        address: '地址',
        avatar: '大頭貼',
        greetings: '問候語',
        socialNote: '社群連結',
        
        // 操作按鈕
        save: '儲存',
        cancel: '取消',
        delete: '刪除',
        edit: '編輯',
        view: '檢視',
        download: '下載',
        share: '分享',
        generateQR: '生成 QR 碼',
        exportVCard: '匯出 vCard',
        
        // 狀態訊息
        loading: '載入中...',
        success: '操作成功',
        error: '操作失敗',
        warning: '警告',
        info: '資訊',
        
        // 名片類型
        cardTypes: {
          'gov-yp': '機關版-延平大樓',
          'gov-sg': '機關版-新光大樓',
          'personal': '個人版',
          'bilingual': '雙語版',
          'personal-bilingual': '個人雙語版',
          'en': '英文版',
          'personal-en': '個人英文版',
          'gov-yp-en': '機關版延平英文',
          'gov-sg-en': '機關版新光英文'
        }
      },
      en: {
        // 基本 UI 標籤
        home: 'Home',
        cards: 'Cards',
        import: 'Import',
        export: 'Export',
        settings: 'Settings',
        
        // 名片欄位
        name: 'Name',
        title: 'Title',
        department: 'Department',
        organization: 'Organization',
        email: 'Email',
        phone: 'Phone',
        mobile: 'Mobile',
        address: 'Address',
        avatar: 'Avatar',
        greetings: 'Greetings',
        socialNote: 'Social Links',
        
        // 操作按鈕
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        download: 'Download',
        share: 'Share',
        generateQR: 'Generate QR',
        exportVCard: 'Export vCard',
        
        // 狀態訊息
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info',
        
        // 名片類型
        cardTypes: {
          'gov-yp': 'Government - Yanping',
          'gov-sg': 'Government - Xinyi',
          'personal': 'Personal',
          'bilingual': 'Bilingual',
          'personal-bilingual': 'Personal Bilingual',
          'en': 'English',
          'personal-en': 'Personal English',
          'gov-yp-en': 'Government Yanping English',
          'gov-sg-en': 'Government Xinyi English'
        }
      }
    };
    
    this.init();
  }

  init() {
    // 檢查是否有現有的 bilingual-common.js
    if (window.bilingualCommon) {
      console.log('[BilingualBridge] Found existing bilingual-common.js');
      this.integrateExistingBilingual();
    } else {
      console.log('[BilingualBridge] Using built-in bilingual support');
    }
    
    // 從 localStorage 載入語言偏好
    const savedLanguage = localStorage.getItem('pwa-language');
    if (savedLanguage && ['zh', 'en'].includes(savedLanguage)) {
      this.currentLanguage = savedLanguage;
    }
  }

  /**
   * 整合現有的 bilingual-common.js 功能
   */
  integrateExistingBilingual() {
    try {
      // 如果存在現有的雙語功能，整合其翻譯資料
      if (window.bilingualCommon && window.bilingualCommon.translations) {
        // 合併翻譯資料
        Object.keys(window.bilingualCommon.translations).forEach(lang => {
          if (this.translations[lang]) {
            this.translations[lang] = {
              ...this.translations[lang],
              ...window.bilingualCommon.translations[lang]
            };
          } else {
            this.translations[lang] = window.bilingualCommon.translations[lang];
          }
        });
      }
      
      console.log('[BilingualBridge] Successfully integrated existing bilingual support');
    } catch (error) {
      console.error('[BilingualBridge] Failed to integrate existing bilingual:', error);
    }
  }

  /**
   * 設定當前語言
   */
  setLanguage(language) {
    if (!['zh', 'en'].includes(language)) {
      console.warn('[BilingualBridge] Invalid language:', language);
      return false;
    }
    
    this.currentLanguage = language;
    localStorage.setItem('pwa-language', language);
    
    // 觸發語言變更事件
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    }));
    
    console.log('[BilingualBridge] Language changed to:', language);
    return true;
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
  toggleLanguage() {
    const newLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
    return this.setLanguage(newLanguage);
  }

  /**
   * 翻譯文字
   */
  translate(key, language = null) {
    const lang = language || this.currentLanguage;
    const translations = this.translations[lang] || this.translations.zh;
    
    // 支援巢狀鍵值 (例如: 'cardTypes.personal')
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (result && typeof result === 'object' && result[k] !== undefined) {
        result = result[k];
      } else {
        // 如果找不到翻譯，返回原始鍵值
        console.warn('[BilingualBridge] Translation not found:', key, 'for language:', lang);
        return key;
      }
    }
    
    return result;
  }

  /**
   * 批次翻譯
   */
  translateBatch(keys, language = null) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.translate(key, language);
    });
    return result;
  }

  /**
   * 處理雙語名片資料 - 修復 greetings [object Object] 問題
   */
  processBilingualCardData(cardData, targetLanguage = null) {
    const lang = targetLanguage || this.currentLanguage;
    const processedData = { ...cardData };
    
    console.log('[BilingualBridge] Processing card data:', {
      originalGreetings: cardData.greetings,
      greetingsType: typeof cardData.greetings,
      isArray: Array.isArray(cardData.greetings),
      targetLanguage: lang
    });
    
    // 處理雙語格式的欄位 (格式: "中文~English")
    const bilingualFields = ['name', 'title', 'department', 'organization'];
    
    bilingualFields.forEach(field => {
      if (processedData[field] && processedData[field].includes('~')) {
        const [chinese, english] = processedData[field].split('~');
        processedData[field] = lang === 'en' ? english.trim() : chinese.trim();
        
        // 保留原始雙語資料
        processedData[`${field}Zh`] = chinese.trim();
        processedData[`${field}En`] = english.trim();
      }
    });
    
    // 處理問候語陣列 - 修復 [object Object] 問題（增強版）
    processedData.greetings = this.normalizeGreetings(processedData.greetings, lang);
    
    return processedData;
  }

  /**
   * 標準化問候語格式 - 統一處理所有可能的格式
   */
  normalizeGreetings(greetings, targetLanguage = 'zh') {
    console.log('[BilingualBridge] Normalizing greetings:', {
      input: greetings,
      type: typeof greetings,
      isArray: Array.isArray(greetings),
      targetLanguage
    });
    
    // 如果沒有問候語，返回預設值
    if (!greetings) {
      return ['歡迎認識我！'];
    }
    
    let normalizedArray = [];
    
    if (Array.isArray(greetings)) {
      // 處理陣列格式
      normalizedArray = greetings
        .map(greeting => this.processGreetingItem(greeting, targetLanguage))
        .filter(g => g && typeof g === 'string' && g.trim().length > 0);
    } else if (typeof greetings === 'object' && greetings !== null) {
      // 處理物件格式
      normalizedArray = this.extractGreetingsFromObject(greetings, targetLanguage);
    } else if (typeof greetings === 'string') {
      // 處理字串格式
      const processed = this.processGreetingItem(greetings, targetLanguage);
      normalizedArray = processed ? [processed] : [];
    }
    
    // 確保至少有一個有效的問候語
    if (normalizedArray.length === 0) {
      normalizedArray = ['歡迎認識我！'];
    }
    
    console.log('[BilingualBridge] Normalized greetings result:', normalizedArray);
    return normalizedArray;
  }

  /**
   * 處理單個問候語項目
   */
  processGreetingItem(greeting, targetLanguage) {
    if (!greeting) return null;
    
    if (typeof greeting === 'string') {
      // 處理雙語格式 "中文~English"
      if (greeting.includes('~')) {
        const [chinese, english] = greeting.split('~');
        return targetLanguage === 'en' ? english.trim() : chinese.trim();
      }
      return greeting.trim();
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      // 處理物件格式 {zh: "中文", en: "English"}
      if (greeting.zh || greeting.en) {
        const target = greeting[targetLanguage] || greeting.zh || greeting.en;
        return typeof target === 'string' ? target.trim() : null;
      }
      
      // 嘗試提取第一個字串值
      const firstStringValue = Object.values(greeting)
        .find(v => v && typeof v === 'string');
      return firstStringValue ? firstStringValue.trim() : null;
    }
    
    return null;
  }

  /**
   * 從物件中提取問候語
   */
  extractGreetingsFromObject(greetingsObj, targetLanguage) {
    const extracted = [];
    
    // 優先處理標準雙語格式
    if (greetingsObj.zh || greetingsObj.en) {
      const targetGreetings = greetingsObj[targetLanguage] || greetingsObj.zh || greetingsObj.en;
      
      if (Array.isArray(targetGreetings)) {
        targetGreetings.forEach(g => {
          const processed = this.processGreetingItem(g, targetLanguage);
          if (processed) extracted.push(processed);
        });
      } else if (typeof targetGreetings === 'string') {
        const processed = this.processGreetingItem(targetGreetings, targetLanguage);
        if (processed) extracted.push(processed);
      }
    } else {
      // 處理其他物件格式，提取所有字串值
      Object.values(greetingsObj).forEach(value => {
        const processed = this.processGreetingItem(value, targetLanguage);
        if (processed) extracted.push(processed);
      });
    }
    
    return extracted;
  }

  /**
   * 獲取名片顯示名稱
   */
  getCardDisplayName(cardData, language = null) {
    const lang = language || this.currentLanguage;
    
    if (cardData.nameZh && cardData.nameEn) {
      return lang === 'en' ? cardData.nameEn : cardData.nameZh;
    }
    
    if (cardData.name && cardData.name.includes('~')) {
      const [chinese, english] = cardData.name.split('~');
      return lang === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.name || '';
  }

  /**
   * 獲取名片顯示職稱
   */
  getCardDisplayTitle(cardData, language = null) {
    const lang = language || this.currentLanguage;
    
    if (cardData.titleZh && cardData.titleEn) {
      return lang === 'en' ? cardData.titleEn : cardData.titleZh;
    }
    
    if (cardData.title && cardData.title.includes('~')) {
      const [chinese, english] = cardData.title.split('~');
      return lang === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.title || '';
  }

  /**
   * 更新 DOM 元素的語言
   */
  updateDOMLanguage() {
    // 更新所有具有 data-i18n 屬性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.translate(key);
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });
    
    // 更新 HTML lang 屬性
    document.documentElement.lang = this.currentLanguage;
    
    console.log('[BilingualBridge] DOM language updated to:', this.currentLanguage);
  }

  /**
   * 格式化日期
   */
  formatDate(date, language = null) {
    const lang = language || this.currentLanguage;
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (lang === 'en') {
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } else {
      return dateObj.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    }
  }

  /**
   * 格式化時間
   */
  formatTime(date, language = null) {
    const lang = language || this.currentLanguage;
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 獲取語言選項
   */
  getLanguageOptions() {
    return [
      { value: 'zh', label: '中文', nativeLabel: '中文' },
      { value: 'en', label: 'English', nativeLabel: 'English' }
    ];
  }

  /**
   * 檢查是否為雙語資料
   */
  isBilingualData(text) {
    return typeof text === 'string' && text.includes('~');
  }

  /**
   * 分離雙語資料
   */
  splitBilingualData(text) {
    if (!this.isBilingualData(text)) {
      return { zh: text, en: text };
    }
    
    const [chinese, english] = text.split('~');
    return {
      zh: chinese.trim(),
      en: english.trim()
    };
  }

  /**
   * 合併雙語資料
   */
  mergeBilingualData(zhText, enText) {
    if (!zhText && !enText) return '';
    if (!zhText) return enText;
    if (!enText) return zhText;
    if (zhText === enText) return zhText;
    
    return `${zhText}~${enText}`;
  }
}

// 全域實例
window.bilingualBridge = new BilingualBridge();

// 語言變更事件監聽器
window.addEventListener('languageChanged', (event) => {
  console.log('[BilingualBridge] Language changed event:', event.detail.language);
  
  // 自動更新 DOM
  if (window.bilingualBridge) {
    window.bilingualBridge.updateDOMLanguage();
  }
  
  // 通知其他組件
  if (window.app && typeof window.app.onLanguageChanged === 'function') {
    window.app.onLanguageChanged(event.detail.language);
  }
});

console.log('[BilingualBridge] Bilingual bridge initialized');