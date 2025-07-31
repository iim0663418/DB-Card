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
          'index': '機關版-延平大樓',
          'index1': '機關版-新光大樓',
          'personal': '個人版',
          'bilingual': '雙語版-延平',
          'bilingual1': '雙語版-新光',
          'personal-bilingual': '個人雙語版',
          'en': '英文版-延平',
          'en1': '英文版-新光',
          'personal-en': '個人英文版'
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
          'index': 'Government - Yanping',
          'index1': 'Government - Xinyi',
          'personal': 'Personal',
          'bilingual': 'Bilingual - Yanping',
          'bilingual1': 'Bilingual - Xinyi',
          'personal-bilingual': 'Personal Bilingual',
          'en': 'English - Yanping',
          'en1': 'English - Xinyi',
          'personal-en': 'Personal English'
        }
      }
    };
    
    this.init();
  }

  init() {
    // 檢查是否有現有的 bilingual-common.js
    if (window.bilingualCommon) {
      this.integrateExistingBilingual();
    } else {
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
      
    } catch (error) {
      console.error('[BilingualBridge] Failed to integrate existing bilingual:', error);
    }
  }

  /**
   * 設定當前語言
   */
  setLanguage(language) {
    if (!['zh', 'en'].includes(language)) {
      return false;
    }
    
    this.currentLanguage = language;
    localStorage.setItem('pwa-language', language);
    
    // 觸發語言變更事件
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    }));
    
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
   * PWA-35: 處理雙語名片資料 - 支援所有雙語欄位
   * 保持原始雙語格式，不進行格式轉換
   */
  processBilingualCardData(cardData, targetLanguage = null) {
    const processedData = { ...cardData };
    
    // PWA-35: 擴展支援所有雙語欄位
    const bilingualFields = ['name', 'title', 'department', 'organization', 'socialNote', 'address'];
    
    bilingualFields.forEach(field => {
      // 支援物件格式的雙語資料
      if (typeof processedData[field] === 'object' && processedData[field] && 
          processedData[field].zh && processedData[field].en) {
        // 保留物件格式不變，並提供分離的訪問
        processedData[`${field}Zh`] = processedData[field].zh;
        processedData[`${field}En`] = processedData[field].en;
      }
      // 支援字串格式的雙語資料（向下相容）
      else if (typeof processedData[field] === 'string' && processedData[field].includes('~')) {
        const [chinese, english] = processedData[field].split('~');
        processedData[`${field}Zh`] = chinese.trim();
        processedData[`${field}En`] = english.trim();
      }
    });
    
    // 問候語保持原始格式，不進行任何轉換
    if (processedData.greetings) {
      if (!Array.isArray(processedData.greetings)) {
        processedData.greetings = [processedData.greetings];
      }
      // 確保每個問候語都是字串格式，不轉換為物件
      processedData.greetings = processedData.greetings.map(greeting => {
        if (typeof greeting === 'object' && greeting !== null) {
          // 如果意外收到物件格式，轉回字串格式
          if (greeting.zh && greeting.en) {
            return `${greeting.zh}~${greeting.en}`;
          }
          return String(greeting);
        }
        return String(greeting);
      }).filter(g => g && g.trim());
    }
    
    return processedData;
  }

  /**
   * 標準化問候語格式 - 資料一致性修復版本
   * 保持雙語字串格式，僅在顯示時選擇語言
   */
  normalizeGreetings(greetings, targetLanguage = 'zh') {
    
    // 如果沒有問候語，返回預設雙語格式
    if (!greetings) {
      return ['歡迎認識我！~Nice to meet you!'];
    }
    
    let normalizedArray = [];
    
    if (Array.isArray(greetings)) {
      // 處理陣列格式，保持雙語字串格式
      normalizedArray = greetings
        .map(greeting => this.preserveGreetingFormat(greeting))
        .filter(g => g && typeof g === 'string' && g.trim().length > 0);
    } else if (typeof greetings === 'object' && greetings !== null) {
      // 處理物件格式，轉換為雙語字串格式
      if (greetings.zh && greetings.en) {
        normalizedArray = [`${greetings.zh}~${greetings.en}`];
      } else {
        const firstValue = Object.values(greetings).find(v => v && typeof v === 'string');
        normalizedArray = firstValue ? [firstValue] : [];
      }
    } else if (typeof greetings === 'string') {
      // 處理字串格式，保持原樣
      normalizedArray = [greetings.trim()];
    }
    
    // 確保至少有一個有效的問候語
    if (normalizedArray.length === 0) {
      normalizedArray = ['歡迎認識我！~Nice to meet you!'];
    }
    
    return normalizedArray;
  }

  /**
   * 保持問候語格式 - 不進行語言選擇轉換
   */
  preserveGreetingFormat(greeting) {
    if (!greeting) return null;
    
    if (typeof greeting === 'string') {
      // 保持字串格式不變
      return greeting.trim();
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      // 將物件格式轉換為雙語字串格式
      if (greeting.zh && greeting.en) {
        return `${greeting.zh}~${greeting.en}`;
      }
      
      // 如果只有單一語言，直接返回
      const firstStringValue = Object.values(greeting)
        .find(v => v && typeof v === 'string');
      return firstStringValue ? firstStringValue.trim() : null;
    }
    
    return String(greeting).trim();
  }



  /**
   * PWA-35: 獲取雙語欄位顯示內容 - 通用方法
   */
  getDisplayField(fieldData, language = null) {
    const lang = language || this.currentLanguage;
    
    // 支援物件格式
    if (typeof fieldData === 'object' && fieldData && fieldData.zh && fieldData.en) {
      return lang === 'en' ? fieldData.en : fieldData.zh;
    }
    
    // 支援字串格式（向下相容）
    if (typeof fieldData === 'string' && fieldData.includes('~')) {
      const [chinese, english] = fieldData.split('~');
      return lang === 'en' ? english.trim() : chinese.trim();
    }
    
    return fieldData || '';
  }
  
  /**
   * 獲取名片顯示名稱 - 僅在顯示時選擇語言
   */
  getCardDisplayName(cardData, language = null) {
    return this.getDisplayField(cardData.name, language);
  }
  
  /**
   * PWA-35: 獲取名片顯示職稱
   */
  getCardDisplayTitle(cardData, language = null) {
    return this.getDisplayField(cardData.title, language);
  }
  
  /**
   * PWA-35: 獲取名片顯示部門
   */
  getCardDisplayDepartment(cardData, language = null) {
    return this.getDisplayField(cardData.department, language);
  }
  
  /**
   * PWA-35: 獲取名片顯示組織
   */
  getCardDisplayOrganization(cardData, language = null) {
    return this.getDisplayField(cardData.organization, language);
  }
  
  /**
   * PWA-35: 獲取名片顯示地址
   */
  getCardDisplayAddress(cardData, language = null) {
    return this.getDisplayField(cardData.address, language);
  }
  
  /**
   * PWA-35: 獲取名片顯示社群連結
   */
  getCardDisplaySocialNote(cardData, language = null) {
    return this.getDisplayField(cardData.socialNote, language);
  }

  /**
   * 獲取問候語顯示內容 - 僅在顯示時選擇語言
   */
  getDisplayGreetings(greetings, language = null) {
    const lang = language || this.currentLanguage;
    
    if (!greetings || !Array.isArray(greetings)) {
      return ['歡迎認識我！'];
    }
    
    return greetings.map(greeting => {
      if (typeof greeting === 'string' && greeting.includes('~')) {
        const [chinese, english] = greeting.split('~');
        return lang === 'en' ? english.trim() : chinese.trim();
      }
      return String(greeting);
    }).filter(g => g && g.trim());
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
  
  // 自動更新 DOM
  if (window.bilingualBridge) {
    window.bilingualBridge.updateDOMLanguage();
  }
  
  // 通知其他組件
  if (window.app && typeof window.app.onLanguageChanged === 'function') {
    window.app.onLanguageChanged(event.detail.language);
  }
});

