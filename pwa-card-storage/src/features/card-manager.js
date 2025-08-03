/**
 * PWA 名片管理器
 * 負責名片的業務邏輯處理、類型識別和資料轉換
 */

class PWACardManager {
  constructor(storage) {
    this.storage = storage;
    this.importCallbacks = new Map(); // 匯入狀態回饋
    this.language = this.detectLanguage(); // 語言設定
    this.cardTypes = {
      'index': {
        name: '機關版-延平大樓',
        organization: '數位發展部',
        address: '臺北市中正區延平南路143號',
        logo: true,
        template: 'government',
        page: 'index.html'
      },
      'index1': {
        name: '機關版-新光大樓',
        organization: '數位發展部',
        address: '臺北市信義區松仁路99號',
        logo: true,
        template: 'government',
        page: 'index1.html'
      },
      'personal': {
        name: '個人版',
        organization: null,
        address: null,
        logo: false,
        template: 'personal',
        page: 'index-personal.html'
      },
      'bilingual': {
        name: '雙語版-延平',
        organization: '數位發展部',
        address: '臺北市中正區延平南路143號',
        logo: true,
        template: 'bilingual',
        page: 'index-bilingual.html'
      },
      'bilingual1': {
        name: '雙語版-新光',
        organization: '數位發展部',
        address: '臺北市信義區松仁路99號',
        logo: true,
        template: 'bilingual',
        page: 'index1-bilingual.html'
      },
      'personal-bilingual': {
        name: '個人雙語版',
        organization: null,
        address: null,
        logo: false,
        template: 'personal-bilingual',
        page: 'index-bilingual-personal.html'
      },
      'en': {
        name: '英文版-延平',
        organization: 'Ministry of Digital Affairs',
        address: '143 Yanping S. Rd., Zhongzheng Dist., Taipei City',
        logo: true,
        template: 'english',
        page: 'index-en.html'
      },
      'en1': {
        name: '英文版-新光',
        organization: 'Ministry of Digital Affairs',
        address: '99 Songren Rd., Xinyi Dist., Taipei City',
        logo: true,
        template: 'english',
        page: 'index1-en.html'
      },
      'personal-en': {
        name: '個人英文版',
        organization: null,
        address: null,
        logo: false,
        template: 'personal-english',
        page: 'index-personal-en.html'
      }
    };
  }

  async initialize() {
    
    if (!this.storage) {
      throw new Error('Storage instance required');
    }
    
    // 載入現有的 bilingual-common.js 功能
    await this.loadBilingualSupport();
    
  }

  async loadBilingualSupport() {
    try {
      // 載入雙語翻譯字典
      this.translations = {
        departments: {
          '數位策略司': 'Department of Digital Strategy',
          '數位政府司': 'Department of Digital Service', 
          '資源管理司': 'Department of Resource Management',
          '韌性建設司': 'Department of Communications and Cyber Resilience',
          '數位國際司': 'Department of International Cooperation',
          '資料創新司': 'Department of Data Innovation',
          '秘書處': 'Secretariat',
          '人事處': 'Department of Personnel',
          '政風處': 'Department of Civil Service Ethics',
          '主計處': 'Department of Budget, Accounting and Statistics',
          '資訊處': 'Department of Information Management',
          '法制處': 'Department of Legal Affairs'
        },
        titles: {
          '部長': 'Minister',
          '政務次長': 'Deputy Minister',
          '常務次長': 'Administrative Deputy Minister',
          '主任秘書': 'Chief Secretary',
          '司長': 'Director General',
          '副司長': 'Deputy Director General',
          '處長': 'Director',
          '副處長': 'Deputy Director',
          '科長': 'Section Chief',
          '副科長': 'Deputy Section Chief',
          '專門委員': 'Senior Specialist',
          '簡任技正': 'Senior Technical Specialist',
          '科員': 'Section Officer'
        },
        organizations: {
          '數位發展部': 'Ministry of Digital Affairs'
        },
        addresses: {
          '臺北市中正區延平南路143號': '143 Yanping S. Rd., Zhongzheng Dist., Taipei City',
          '臺北市信義區松仁路99號': '99 Songren Rd., Xinyi Dist., Taipei City'
        }
      };
      
    } catch (error) {
      console.error('[CardManager] Failed to load bilingual support:', error);
    }
  }

  /**
   * 標準化名片類型識別 - 使用全域標準邏輯
   * @param {Object} cardData - 名片資料
   * @returns {string} 名片類型
   */
  detectCardType(cardData) {
    try {
      // 使用標準化識別邏輯
      return this.identifyCardType(cardData);
    } catch (error) {
      console.error('[CardManager] Card type detection failed:', error);
      return 'personal';
    }
  }
  
  /**
   * 標準化名片類型識別 - 全域通用（與 storage.js 同步修復）
   */
  identifyCardType(data) {
    if (typeof data === 'string') data = { url: data };
    
    // PWA-36 修復：整合 PWA 暫存機制
    if (window.PWAIntegration) {
      const enhancedType = window.PWAIntegration.identifyCardTypeEnhanced(data);
      if (enhancedType) {
        return enhancedType;
      }
    }
    
    // 1. 最高優先級：檢查資料中的 URL 欄位（絕對優先）
    if (data.url && typeof data.url === 'string') {
      const url = data.url.toLowerCase().trim();
      
      // PWA-36 修復：處理 PWA 頁面 URL
      if (url.includes('pwa-card-storage')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const cardParam = urlParams.get('c');
        if (cardParam) {
          try {
            const decodedData = JSON.parse(decodeURIComponent(atob(cardParam)));
            return this.identifyCardType(decodedData);
          } catch (error) {
            // 繼續其他方法
          }
        }
      }
      
      // 精確匹配，按長度排序避免誤判
      if (url.includes('index-bilingual-personal.html')) {
        return 'personal-bilingual';
      }
      if (url.includes('index1-bilingual.html')) {
        return 'bilingual1';
      }
      if (url.includes('index-bilingual.html')) {
        return 'bilingual';
      }
      // 修復：處理不帶 .html 的 URL
      if (url.includes('index-bilingual-personal?') || url.includes('index-bilingual-personal&') || url.endsWith('index-bilingual-personal')) {
        return 'personal-bilingual';
      }
      if (url.includes('index1-bilingual?') || url.includes('index1-bilingual&') || url.endsWith('index1-bilingual')) {
        return 'bilingual1';
      }
      if (url.includes('index-bilingual?') || url.includes('index-bilingual&') || url.endsWith('index-bilingual')) {
        return 'bilingual';
      }
      if (url.includes('index-personal-en.html')) {
        return 'personal-en';
      }
      if (url.includes('index1-en.html')) {
        return 'en1';
      }
      if (url.includes('index-en.html')) {
        return 'en';
      }
      if (url.includes('index-personal.html')) {
        return 'personal';
      }
      if (url.includes('index1.html')) {
        return 'index1';
      }
      if (url.includes('index.html')) {
        return 'index';
      }
    }
    
    // 2. 最後備用：資料特徵識別（僅在無 URL 時使用）
    const isBilingual = data.name?.includes('~') || data.title?.includes('~');
    const isGov = data.organization && data.department;
    const isShinGuang = data.address?.includes('新光') || data.address?.includes('松仁路');
    
    if (isBilingual) {
      return isGov ? (isShinGuang ? 'bilingual1' : 'bilingual') : 'personal-bilingual';
    }
    
    return isGov ? (isShinGuang ? 'index1' : 'index') : 'personal';
  }

  /**
   * 檢查是否為政府機關名片
   * 支援所有可能的政府機關識別標誌
   */
  isGovernmentCard(cardData) {
    const govIndicators = [
      // 中文組織名稱
      '數位發展部',
      // 英文組織名稱
      'Ministry of Digital Affairs',
      'moda',
      // 地址標誌
      '延平南路143號',
      '松仁路99號', 
      '忠孝西路一段66號',
      '忠孝西路',
      'Yanping S. Rd.',
      'Songren Rd.',
      'Zhongxiao W. Rd.',
      '143',
      '66',
      '99',
      // 電子郵件標誌
      '@moda.gov.tw',
      'moda.gov.tw',
      // 部門標誌
      '數位策略司',
      '數位政府司',
      '資源管理司',
      '韌性建設司',
      '數位國際司',
      '資料創新司',
      '秘書處',
      '人事處',
      '政風處',
      '主計處',
      '資訊處',
      '法制處'
    ];

    // 檢查所有欄位，包括雙語格式
    const fieldsToCheck = [
      cardData.organization,
      cardData.department,
      cardData.address,
      cardData.email,
      cardData.name,
      cardData.title
    ];
    
    // 處理雙語格式，提取中英文部分
    const textParts = [];
    fieldsToCheck.forEach(field => {
      if (field && typeof field === 'string') {
        if (field.includes('~')) {
          // 雙語格式，分別檢查中英文
          const [chinese, english] = field.split('~');
          if (chinese) textParts.push(chinese.trim());
          if (english) textParts.push(english.trim());
        } else {
          textParts.push(field);
        }
      }
    });
    
    const textToCheck = textParts.join(' ').toLowerCase();
    
    console.log('[CardManager] 政府機關檢查:', {
      textToCheck,
      organization: cardData.organization,
      department: cardData.department,
      email: cardData.email
    });

    const isGov = govIndicators.some(indicator => 
      textToCheck.includes(indicator.toLowerCase())
    );
    
    console.log('[CardManager] 政府機關檢查結果:', isGov);
    return isGov;
  }

  /**
   * 檢查是否為雙語名片 - 修復版本
   * 增強雙語檢測邏輯，確保準確識別
   */
  isBilingualCard(cardData) {
    console.log('[CardManager] 檢查雙語特徵:', {
      name: cardData.name,
      title: cardData.title,
      greetings: cardData.greetings
    });
    
    // 檢查姓名是否包含 ~ 分隔符
    if (cardData.name && typeof cardData.name === 'string' && cardData.name.includes('~')) {
      console.log('[CardManager] 發現雙語姓名:', cardData.name);
      return true;
    }
    
    // 檢查職稱是否包含 ~ 分隔符
    if (cardData.title && typeof cardData.title === 'string' && cardData.title.includes('~')) {
      console.log('[CardManager] 發現雙語職稱:', cardData.title);
      return true;
    }
    
    // 檢查問候語是否為雙語格式
    if (cardData.greetings) {
      
      // 確保是陣列格式
      const greetingsArray = Array.isArray(cardData.greetings) ? cardData.greetings : [cardData.greetings];
      
      const hasBilingualGreeting = greetingsArray.some(greeting => {
        if (typeof greeting === 'object' && greeting !== null && greeting.zh && greeting.en) {
          return true;
        }
        if (typeof greeting === 'string' && greeting.includes('~')) {
          return true;
        }
        return false;
      });
      
      if (hasBilingualGreeting) {
        return true;
      }
    }
    
    // 檢查部門和組織欄位
    if (cardData.department && typeof cardData.department === 'string' && cardData.department.includes('~')) {
      return true;
    }
    
    if (cardData.organization && typeof cardData.organization === 'string' && cardData.organization.includes('~')) {
      return true;
    }
    
    // 檢查來源 URL 是否為雙語版本
    if (typeof window !== 'undefined' && window.location) {
      const isBilingualUrl = window.location.pathname.includes('bilingual');
      if (isBilingualUrl) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 檢查是否為英文名片
   */
  isEnglishCard(cardData) {
    // 檢查組織名稱
    if (cardData.organization && typeof cardData.organization === 'string' && cardData.organization.includes('Ministry of Digital Affairs')) {
      return true;
    }

    // 檢查地址格式
    if (cardData.address && typeof cardData.address === 'string' && /\d+\s+\w+\s+(Rd\.|St\.|Ave\.)/.test(cardData.address)) {
      return true;
    }

    // 檢查姓名是否主要為英文（不包含雙語格式）
    if (cardData.name && typeof cardData.name === 'string' && /^[A-Za-z\s\-\.]+$/.test(cardData.name) && !cardData.name.includes('~')) {
      return true;
    }
    
    // 檢查來源 URL 是否為英文版本
    if (typeof window !== 'undefined' && window.location) {
      const isEnglishUrl = window.location.pathname.includes('-en.html') || 
                          window.location.pathname.includes('/en/');
      if (isEnglishUrl) {
        return true;
      }
    }

    return false;
  }
  
  /**
   * 檢查是否為新光大樓
   * 支援所有可能的新光大樓識別標誌
   */
  isShinGuangBuilding(cardData) {
    // 檢查地址資訊
    if (cardData.address && typeof cardData.address === 'string') {
      const addressChecks = [
        cardData.address.includes('新光'),
        cardData.address.includes('松仁路'),
        cardData.address.includes('Songren'),
        cardData.address.includes('99'),
        cardData.address.includes('忠孝西路'),
        cardData.address.includes('Zhongxiao'),
        cardData.address.includes('66號'),
        cardData.address.includes('17樓'),
        cardData.address.includes('19樓'),
        cardData.address.includes('17F'),
        cardData.address.includes('19F')
      ];
      
      if (addressChecks.some(check => check)) {
        return true;
      }
    }
    
    // 檢查來源 URL（如果有的話）
    if (typeof window !== 'undefined' && window.location) {
      const urlChecks = [
        window.location.pathname.includes('index1'),
        window.location.pathname.includes('xinyi'),
        window.location.pathname.includes('sg'),
        window.location.search.includes('building=xinyi')
      ];
      
      if (urlChecks.some(check => check)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 根據類型套用樣式和預設值 - 增強日誌版本
   */
  applyCardTypeDefaults(cardData, detectedType) {
    console.log(`[CardManager] 套用類型預設值: ${detectedType}`);
    
    const typeConfig = this.cardTypes[detectedType];
    if (!typeConfig) {
      console.warn(`[CardManager] 未找到類型配置: ${detectedType}`);
      return cardData;
    }

    // 確保深度複製以避免修改原始物件
    const enhancedData = JSON.parse(JSON.stringify(cardData));

    // 套用組織預設值
    if (typeConfig.organization && !enhancedData.organization) {
      console.log(`[CardManager] 套用組織預設值: ${typeConfig.organization}`);
      enhancedData.organization = typeConfig.organization;
    }

    // 套用地址預設值
    if (typeConfig.address && !enhancedData.address) {
      console.log(`[CardManager] 套用地址預設值: ${typeConfig.address}`);
      enhancedData.address = typeConfig.address;
    }

    // 處理雙語資料
    if (detectedType === 'bilingual' || detectedType === 'bilingual1' || detectedType === 'personal-bilingual') {
      return this.processBilingualData(enhancedData);
    }

    console.log(`[CardManager] 類型預設值套用完成:`, {
      type: detectedType,
      organization: enhancedData.organization,
      address: enhancedData.address
    });
    
    return enhancedData;
  }

  /**
   * 處理雙語資料 - 資料一致性修復版本
   * 僅分離雙語欄位，不改變原始格式
   */
  processBilingualData(cardData) {
    const processed = { ...cardData };

    // 處理雙語姓名 - 保持原始格式
    if (processed.name && typeof processed.name === 'string' && processed.name.includes('~')) {
      const [chinese, english] = processed.name.split('~');
      processed.nameZh = chinese.trim();
      processed.nameEn = english.trim();
      // 保持 processed.name 為 "中文~English" 格式
    }

    // 處理雙語職稱 - 保持原始格式
    if (processed.title && typeof processed.title === 'string' && processed.title.includes('~')) {
      const [chinese, english] = processed.title.split('~');
      processed.titleZh = chinese.trim();
      processed.titleEn = english.trim();
      // 保持 processed.title 為 "中文~English" 格式
    }

    // 問候語保持原始雙語字串格式，不進行任何轉換
    // 確保是陣列格式
    if (processed.greetings && !Array.isArray(processed.greetings)) {
      processed.greetings = [processed.greetings];
    }

    return processed;
  }

  /**
   * 從 URL 匯入名片
   */
  async importFromUrl(url) {
    try {

      // 解析 URL 參數
      const cardData = this.parseCardUrl(url);
      if (!cardData) {
        return { success: false, error: '無法解析名片連結' };
      }

      // 自動識別類型
      const cardType = this.detectCardType(cardData);
      
      // 套用類型預設值
      const enhancedData = this.applyCardTypeDefaults(cardData, cardType);

      // 儲存名片
      const cardId = await this.storage.storeCard(enhancedData);

      return { 
        success: true, 
        cardId, 
        type: cardType,
        data: enhancedData 
      };
    } catch (error) {
      console.error('[CardManager] Import from URL failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 解析名片 URL
   */
  parseCardUrl(url) {
    try {
      // 使用新的 UTF-8 解析方法
      const result = this.parseCardUrlWithUTF8(url);
      if (result) return result;
      
      // 備用：使用 legacy adapter
      if (window.legacyAdapter) {
        const urlObj = new URL(url);
        const data = urlObj.searchParams.get('data') || urlObj.searchParams.get('c');
        if (data) {
          return window.legacyAdapter.parseCompactFormat(data);
        }
      }
      
      return null;
    } catch (error) {
      console.error('[CardManager] URL parsing failed:', error);
      return null;
    }
  }
  
  convertCompactFormat(data) {
    const fieldMap = {
      'n': 'name',
      't': 'title', 
      'd': 'department',
      'o': 'organization',
      'e': 'email',
      'p': 'phone',
      'm': 'mobile',
      'a': 'address',
      'v': 'avatar',
      'g': 'greetings',
      's': 'socialNote'
    };
    
    const converted = {};
    for (const [key, value] of Object.entries(data)) {
      const standardKey = fieldMap[key] || key;
      converted[standardKey] = value;
    }
    
    return converted;
  }
  
  parseCardUrlWithUTF8(url) {
    try {
      const urlObj = new URL(url);
      const data = urlObj.searchParams.get('data') || urlObj.searchParams.get('c');
      
      if (!data) return null;

      // 雙語版使用不同的編碼方式
      if (urlObj.pathname.includes('bilingual')) {
        return this.parseBilingualFormat(data);
      } else {
        return this.parseStandardFormat(data);
      }
    } catch (error) {
      console.error('[CardManager] URL parsing failed:', error);
      return null;
    }
  }
  
  parseBilingualFormat(data) {
    try {
      // 雙語版編碼方式：Base64 + URL 編碼
      // 第一步：Base64 解碼（先處理 URL 安全字符）
      const padding = '='.repeat((4 - data.length % 4) % 4);
      const base64Fixed = data.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const compact = atob(base64Fixed);
      
      // 第二步：URL 解碼
      const urlDecoded = decodeURIComponent(compact);
      
      // 第三步：解析管道分隔格式
      const fields = urlDecoded.split('|');
      
      console.log('[CardManager] 雙語版解析 - 原始資料:', data);
      console.log('[CardManager] 雙語版解析 - URL解碼後:', urlDecoded);
      console.log('[CardManager] 雙語版解析 - 欄位分割:', {
        fieldsLength: fields.length,
        field0_name: fields[0],
        field1_title: fields[1], 
        field2_department: fields[2],
        field3_email: fields[3],
        field4_phone: fields[4],
        field5_mobile: fields[5],
        field6_avatar: fields[6],
        field7_greetings: fields[7],
        field8_socialNote: fields[8]
      });
      
      // 修復欄位對應錯誤：根據 bilingual-common.js 中的 encodeCompact 函數正確對應
      // 實際格式：name|title|department|email|phone|mobile|avatar|greetings|socialNote
      const result = {
        name: fields[0] || '',           // 0: name (雙語)
        title: fields[1] || '',          // 1: title (雙語) 
        department: fields[2] || '',     // 2: department (單語)
        email: fields[3] || '',          // 3: email (單語)
        phone: fields[4] || '',          // 4: phone (單語)
        mobile: fields[5] || '',         // 5: mobile (單語)
        avatar: fields[6] || '',         // 6: avatar (單語)
        greetings: fields[7] ? fields[7].split(',') : [], // 7: greetings (雙語)
        socialNote: fields[8] || '',     // 8: socialNote (單語)
        // 組織和地址由 applyCardTypeDefaults 方法提供，不從 URL 資料中解析
        organization: '',
        address: ''
      };
      
      console.log('[CardManager] 雙語版最終結果:', result);
      console.log('[CardManager] 修復後檢查:', {
        email: result.email,
        socialNote: result.socialNote,
        organization: result.organization,
        address: result.address
      });
      return result;
    } catch (error) {
      console.error('[CardManager] Bilingual format parsing failed:', error);
      return null;
    }
  }
  
  parseStandardFormat(data) {
    try {
      // 標準版編碼方式：JSON + Base64 + UTF-8
      const decoded = decodeURIComponent(data);
      const binaryString = atob(decoded);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const jsonString = new TextDecoder('utf-8').decode(bytes);
      const parsedData = JSON.parse(jsonString);
      
      return this.convertCompactFormat(parsedData);
    } catch (error) {
      console.error('[CardManager] Standard format parsing failed:', error);
      return null;
    }
  }

  /**
   * 設定匯入狀態回饋
   */
  setImportCallback(operationId, callback) {
    if (typeof callback === 'function') {
      this.importCallbacks.set(operationId, callback);
    }
  }

  /**
   * 更新匯入狀態
   */
  updateImportStatus(operationId, status, progress = 0, message = '') {
    const callback = this.importCallbacks.get(operationId);
    if (callback) {
      callback({
        status,
        progress,
        message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 偵測語言
   */
  detectLanguage() {
    if (typeof navigator !== 'undefined') {
      const lang = navigator.language || navigator.userLanguage;
      return lang.startsWith('en') ? 'en' : 'zh';
    }
    return 'zh';
  }

  /**
   * 取得多語言訊息
   */
  getMessage(key, params = {}) {
    const messages = {
      zh: {
        importing: '正在匯入...',
        validating: '正在驗證檔案...',
        processing: '正在處理資料...',
        complete: '匯入完成',
        error: '匯入失敗',
        invalid_format: '檔案格式不正確',
        file_too_large: '檔案過大',
        permission_denied: '沒有權限',
        card_imported: '已匯入 {count} 張名片',
        card_skipped: '跳過 {count} 張名片'
      },
      en: {
        importing: 'Importing...',
        validating: 'Validating file...',
        processing: 'Processing data...',
        complete: 'Import complete',
        error: 'Import failed',
        invalid_format: 'Invalid file format',
        file_too_large: 'File too large',
        permission_denied: 'Permission denied',
        card_imported: 'Imported {count} cards',
        card_skipped: 'Skipped {count} cards'
      }
    };

    const langMessages = messages[this.language] || messages.zh;
    let message = langMessages[key] || key;
    
    // 替換參數
    Object.keys(params).forEach(param => {
      message = message.replace(`{${param}}`, params[param]);
    });
    
    return message;
  }

  /**
   * 增強的名片類型檢測 - 支援更多格式
   */
  detectCardTypeEnhanced(cardData) {
    try {
      // 檢查是否有明確的類型標記
      if (cardData.cardType) {
        return cardData.cardType;
      }

      // 檢查是否為政府機關
      const isGovernment = cardData.organization && 
        (cardData.organization.includes('數位發展部') || 
         cardData.organization.includes('Ministry of Digital Affairs'));

      // 檢查是否為雙語版
      const isBilingual = cardData.greetings && Array.isArray(cardData.greetings) && 
        cardData.greetings.length > 1;

      // 檢查地址判斷是否為新光大樓
      const isShinGuang = cardData.address && 
        (cardData.address.includes('松仁路') || 
         cardData.address.includes('Songren'));

      if (isGovernment) {
        if (isBilingual) {
          return isShinGuang ? 'bilingual1' : 'bilingual';
        } else {
          // 檢查語言
          const isEnglish = cardData.organization === 'Ministry of Digital Affairs';
          if (isEnglish) {
            return isShinGuang ? 'en1' : 'en';
          } else {
            return isShinGuang ? 'index1' : 'index';
          }
        }
      } else {
        // 個人版
        if (isBilingual) {
          return 'personal-bilingual';
        } else {
          const isEnglish = cardData.name && /^[A-Za-z\s]+$/.test(cardData.name);
          return isEnglish ? 'personal-en' : 'personal';
        }
      }
    } catch (error) {
      console.error('[CardManager] Enhanced card type detection failed:', error);
      return 'personal';
    }
  }

  /**
   * 從檔案匯入名片 - 安全修復版本（增強 UX）
   */
  async importFromFile(file, options = {}) {
    const operationId = options.operationId || 'import_card_' + Date.now();
    try {
      this.updateImportStatus(operationId, 'validating', 5, this.getMessage('validating'));

      // SEC-PWA-001: 緊急停用檢查
      if (window.EMERGENCY_DISABLE_IMPORT) {
        return { 
          success: false, 
          error: this.getMessage('permission_denied'),
          operationId 
        };
      }

      // SEC-PWA-003: 授權檢查
      if (window.SecurityAuthHandler && !window.SecurityAuthHandler.hasPermission('import')) {
        return { 
          success: false, 
          error: this.getMessage('permission_denied'),
          operationId 
        };
      }

      this.updateImportStatus(operationId, 'validating', 15, '正在檢查檔案格式...');

      // SEC-PWA-001: 檔案類型和大小驗證
      const allowedTypes = ['application/json', 'text/vcard'];
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.json') && !file.name.endsWith('.vcf')) {
        return { 
          success: false, 
          error: this.getMessage('invalid_format'),
          operationId 
        };
      }

      if (file.size > 10 * 1024 * 1024) {
        return { 
          success: false, 
          error: this.getMessage('file_too_large'),
          operationId 
        };
      }

      this.updateImportStatus(operationId, 'processing', 25, this.getMessage('processing'));

      // SEC-PWA-005: 安全的檔案讀取
      const fileContent = await this.secureReadFile(file);
      let importData;

      // 根據檔案類型處理
      if (file.name.endsWith('.json')) {
        // SEC-PWA-002: 安全的 JSON 解析
        importData = this.secureJSONParse(fileContent);
        
        // 檢查是否為標準匯出檔案格式（包含 cards 陣列）
        if (importData.cards && Array.isArray(importData.cards)) {
          return await this.importFromExportFormat(importData);
        }
      } else if (file.name.endsWith('.vcf')) {
        importData = this.parseVCard(fileContent);
      } else {
        return { success: false, error: '不支援的檔案格式' };
      }

      // SEC-PWA-006: 輸入資料清理
      const sanitizedData = this.sanitizeCardData(importData);
      if (!sanitizedData) {
        return { success: false, error: '無效的資料格式' };
      }

      let importedCount = 0;
      const errors = [];

      // 處理單一名片或名片陣列（非標準匯出格式）
      const cards = Array.isArray(sanitizedData) ? sanitizedData : [sanitizedData];

      for (const cardData of cards) {
        try {
          // SEC-PWA-007: 驗證每張名片
          if (!this.validateSingleCardData(cardData)) {
            errors.push('名片資料格式錯誤');
            continue;
          }

          const cardType = this.detectCardType(cardData);
          const enhancedData = this.applyCardTypeDefaults(cardData, cardType);
          await this.storage.storeCard(enhancedData);
          importedCount++;
        } catch (error) {
          // SEC-PWA-004: 不洩露敏感資料
          errors.push('名片匯入失敗');
        }
      }

      return {
        success: importedCount > 0,
        count: importedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      // SEC-PWA-008: 安全的錯誤處理
      return this.handleSecureError(error, 'import_from_file');
    }
  }

  /**
   * 從標準匯出檔案格式匯入 - 安全修復版本
   */
  async importFromExportFormat(exportData) {
    try {
      // SEC-PWA-006: 輸入資料清理和驗證
      const sanitizedData = this.sanitizeExportData(exportData);
      if (!sanitizedData || !Array.isArray(sanitizedData.cards)) {
        return { success: false, error: '無效的匯出檔案格式' };
      }

      // SEC-PWA-007: 限制名片數量
      if (sanitizedData.cards.length > 1000) {
        return { success: false, error: '名片數量超過限制 (1000)' };
      }

      let importedCount = 0;
      const errors = [];
      
      for (const cardItem of sanitizedData.cards) {
        try {
          // SEC-PWA-007: 驗證每張名片
          if (!this.validateExportCardItem(cardItem)) {
            errors.push('名片資料格式錯誤');
            continue;
          }

          // 使用匯出檔案中的類型資訊（優先級最高）
          const cardType = cardItem.type || this.detectCardType(cardItem.data);
          
          // 根據類型套用預設值（比照 vCard 生成邏輯）
          const enhancedData = this.applyCardTypeDefaults(cardItem.data, cardType);
          
          // 儲存增強後的資料
          await this.storage.storeCard(enhancedData);
          importedCount++;
        } catch (error) {
          // SEC-PWA-004: 不洩露敏感資料
          errors.push('名片匯入失敗');
        }
      }
      
      return {
        success: importedCount > 0,
        count: importedCount,
        total: sanitizedData.cards.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      // SEC-PWA-008: 安全的錯誤處理
      return this.handleSecureError(error, 'import_from_export_format');
    }
  }
  
  // SEC-PWA-005: 安全的檔案讀取
  secureReadFile(file) {
    return new Promise((resolve, reject) => {
      // 檔案名稱驗證
      if (!file.name || file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        reject(new Error('不安全的檔案名稱'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          if (content.length > 50 * 1024 * 1024) {
            reject(new Error('檔案內容過大'));
            return;
          }
          resolve(content);
        } catch (error) {
          reject(new Error('檔案內容處理失敗'));
        }
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsText(file);
    });
  }

  // 保持向下相容性
  readFile(file) {
    return this.secureReadFile(file);
  }

  // SEC-PWA-002: 安全的 JSON 解析
  secureJSONParse(jsonString) {
    try {
      return JSON.parse(jsonString, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (error) {
      throw new Error('JSON 格式錯誤');
    }
  }

  // SEC-PWA-006: 名片資料清理
  sanitizeCardData(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    return {
      name: String(data.name || '').slice(0, 100),
      title: String(data.title || '').slice(0, 100),
      department: String(data.department || '').slice(0, 100),
      organization: String(data.organization || '').slice(0, 100),
      email: String(data.email || '').slice(0, 100),
      phone: String(data.phone || '').slice(0, 30),
      mobile: String(data.mobile || '').slice(0, 30),
      address: String(data.address || '').slice(0, 200),
      avatar: String(data.avatar || '').slice(0, 500),
      socialNote: String(data.socialNote || '').slice(0, 500),
      greetings: Array.isArray(data.greetings) ? 
        data.greetings.map(g => String(g || '').slice(0, 200)).slice(0, 10) : []
    };
  }

  // SEC-PWA-006: 匯出資料清理
  sanitizeExportData(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const sanitized = {
      version: String(data.version || '').slice(0, 10),
      timestamp: data.timestamp,
      cards: []
    };

    if (Array.isArray(data.cards)) {
      sanitized.cards = data.cards.map(card => {
        if (!card || typeof card !== 'object') {
          return null;
        }
        return {
          id: String(card.id || '').slice(0, 50),
          type: String(card.type || '').slice(0, 30),
          data: this.sanitizeCardData(card.data),
          created: card.created,
          modified: card.modified,
          version: String(card.version || '').slice(0, 10)
        };
      }).filter(Boolean);
    }

    return sanitized;
  }

  // SEC-PWA-007: 單張名片驗證
  validateSingleCardData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    if (!data.name || typeof data.name !== 'string' || data.name.length > 100) {
      return false;
    }

    return true;
  }

  // SEC-PWA-007: 匯出名片項目驗證
  validateExportCardItem(item) {
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    if (!item.id || !item.type || !item.data) {
      return false;
    }

    return this.validateSingleCardData(item.data);
  }

  // SEC-PWA-008: 安全的錯誤處理
  handleSecureError(error, context) {
    // 記錄內部錯誤（不包含敏感資料）
    if (window.SecurityMonitor) {
      window.SecurityMonitor.logSecurityEvent('error_occurred', {
        context,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: false,
      error: '操作失敗，請稍後再試'
    };
  }

  /**
   * 解析 vCard 格式
   */
  parseVCard(vcardContent) {
    const lines = vcardContent.split('\n');
    const cardData = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('FN:')) {
        cardData.name = trimmedLine.substring(3);
      } else if (trimmedLine.startsWith('TITLE:')) {
        cardData.title = trimmedLine.substring(6);
      } else if (trimmedLine.startsWith('EMAIL:')) {
        cardData.email = trimmedLine.substring(6);
      } else if (trimmedLine.startsWith('TEL:')) {
        cardData.phone = trimmedLine.substring(4);
      } else if (trimmedLine.startsWith('ORG:')) {
        cardData.organization = trimmedLine.substring(4);
      }
    }

    return cardData;
  }

  /**
   * 匯出名片 - 完整版本，支援多種格式和進度追蹤
   */
  async exportCards(options = {}) {
    const operationId = options.operationId || 'export_' + Date.now();
    const format = options.format || 'json'; // json, vcard, both
    
    try {
      this.updateImportStatus(operationId, 'preparing', 10, 
        this.getMessage('preparing_export', { format }));

      const cards = options.exportAll 
        ? await this.storage.listCards()
        : await this.getSelectedCards(options.cardIds);

      if (cards.length === 0) {
        return { 
          success: false, 
          error: this.getMessage('no_cards_to_export'),
          operationId 
        };
      }

      this.updateImportStatus(operationId, 'processing', 30, 
        this.getMessage('processing_cards', { count: cards.length }));

      // 準備匯出資料 - 增強版本，確保類型資訊完整
      const exportData = {
        version: '3.0.2',
        timestamp: new Date().toISOString(),
        exportedBy: 'PWA Card Storage v3.0.2',
        totalCards: cards.length,
        format: format,
        cards: cards.map(card => {
          // 確保每張名片都有正確的類型資訊
          const cardType = card.type || this.detectCardType(card.data);
          
          return {
            id: card.id,
            type: cardType,
            data: card.data,
            created: card.created,
            modified: card.modified,
            version: card.version || '1.0'
          };
        })
      };

      this.updateImportStatus(operationId, 'generating', 60, 
        this.getMessage('generating_files'));

      // 包含版本歷史（如果需要）
      if (options.includeVersions) {
        for (const card of exportData.cards) {
          card.versions = await this.getCardVersions(card.id);
        }
      }

      const results = [];
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

      // JSON 格式匯出
      if (format === 'json' || format === 'both') {
        const jsonContent = JSON.stringify(exportData, null, 2);
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
        
        results.push({
          format: 'json',
          file: jsonBlob,
          filename: `cards-export-${timestamp}.json`,
          size: jsonBlob.size,
          count: cards.length
        });
      }

      // vCard 格式匯出
      if (format === 'vcard' || format === 'both') {
        const vCardResult = await this.exportVCardBatch(cards, {
          operationId,
          language: options.language || 'zh',
          includeBothLanguages: options.includeBothLanguages || false
        });
        
        if (vCardResult.success) {
          results.push({
            format: 'vcard',
            file: vCardResult.file,
            filename: vCardResult.filename,
            size: vCardResult.file.size,
            count: cards.length
          });
        }
      }

      this.updateImportStatus(operationId, 'completed', 100, 
        this.getMessage('export_completed'));

      // 自動下載檔案（如果啟用）
      if (options.autoDownload !== false) {
        for (const result of results) {
          await this.downloadFile(result.file, result.filename);
        }
      }

      return {
        success: true,
        files: results,
        count: cards.length,
        operationId,
        exportData: format === 'json' ? exportData : undefined
      };
    } catch (error) {
      console.error('[CardManager] Export failed:', error);
      const friendlyError = this.getUserFriendlyError(error, 'export');
      return { 
        success: false, 
        error: friendlyError.message,
        code: friendlyError.code,
        operationId 
      };
    }
  }

  /**
   * 批量匯出 vCard 格式
   */
  async exportVCardBatch(cards, options = {}) {
    try {
      const { language = 'zh', includeBothLanguages = false } = options;
      let vCardContent = '';
      
      for (const card of cards) {
        const cardData = card.data;
        const cardType = card.type || this.detectCardType(cardData);
        
        if (includeBothLanguages) {
          // 雙語版本
          const zhCard = this.processBilingualCardData(cardData, 'zh');
          const enCard = this.processBilingualCardData(cardData, 'en');
          
          vCardContent += this.generateVCardContent(zhCard, 'zh', cardType) + '\n';
          vCardContent += this.generateVCardContent(enCard, 'en', cardType) + '\n';
        } else {
          // 單語版本
          const processedData = this.processBilingualCardData(cardData, language);
          vCardContent += this.generateVCardContent(processedData, language, cardType) + '\n';
        }
      }
      
      const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const langSuffix = includeBothLanguages ? 'bilingual' : language;
      const filename = `cards-${langSuffix}-${timestamp}.vcf`;
      
      return {
        success: true,
        file: blob,
        filename,
        content: vCardContent,
        count: cards.length
      };
    } catch (error) {
      console.error('[CardManager] vCard batch export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成 vCard 內容
   */
  generateVCardContent(cardData, language = 'zh', cardType = 'personal') {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    
    // 安全字串化函數
    const safeString = (field) => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        return field[language] || field.zh || field.en || Object.values(field)[0] || '';
      }
      return String(field);
    };
    
    // 基本資訊
    if (cardData.name) lines.push(`FN:${safeString(cardData.name)}`);
    if (cardData.title) lines.push(`TITLE:${safeString(cardData.title)}`);
    if (cardData.organization) lines.push(`ORG:${safeString(cardData.organization)}`);
    if (cardData.department) lines.push(`X-DEPARTMENT:${safeString(cardData.department)}`);
    
    // 聯絡資訊
    if (cardData.email) lines.push(`EMAIL:${safeString(cardData.email)}`);
    if (cardData.phone) lines.push(`TEL;TYPE=WORK:${safeString(cardData.phone)}`);
    if (cardData.mobile) lines.push(`TEL;TYPE=CELL:${safeString(cardData.mobile)}`);
    if (cardData.address) lines.push(`ADR;TYPE=WORK:;;${safeString(cardData.address)};;;`);
    
    // 網站和社交
    if (cardData.website) lines.push(`URL:${safeString(cardData.website)}`);
    if (cardData.socialNote) lines.push(`NOTE:${safeString(cardData.socialNote)}`);
    
    // 問候語（作為備註）
    if (cardData.greetings && Array.isArray(cardData.greetings) && cardData.greetings.length > 0) {
      const greetings = cardData.greetings.map(g => safeString(g)).filter(Boolean);
      if (greetings.length > 0) {
        lines.push(`X-GREETINGS:${greetings.join('; ')}`);
      }
    }
    
    // 添加卡片類型資訊
    lines.push(`X-CARD-TYPE:${cardType}`);
    lines.push(`X-LANGUAGE:${language}`);
    
    lines.push('END:VCARD');
    return lines.join('\n');
  }

  /**
   * 統一的檔案下載處理器
   */
  async downloadFile(blob, filename, options = {}) {
    try {
      // 檔案大小檢查和警告
      const sizeWarning = this.checkFileSizeWarning(blob.size);
      if (sizeWarning.level === 'error') {
        throw new Error(sizeWarning.message);
      }
      
      // 創建下載連結
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // 添加到文檔並點擊
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      return { success: true, filename, size: blob.size };
    } catch (error) {
      console.error('[CardManager] File download failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 檔案大小警告檢查
   */
  checkFileSizeWarning(size) {
    const MB = 1024 * 1024;
    
    if (size > 50 * MB) {
      return {
        level: 'error',
        message: this.getMessage('file_too_large', { size: Math.round(size / MB) })
      };
    } else if (size > 10 * MB) {
      return {
        level: 'warning',
        message: this.getMessage('file_large_warning', { size: Math.round(size / MB) })
      };
    } else if (size > 5 * MB) {
      return {
        level: 'info',
        message: this.getMessage('file_size_info', { size: Math.round(size / MB) })
      };
    }
    
    return { level: 'ok', message: '' };
  }

  /**
   * 取得選中的名片
   */
  async getSelectedCards(cardIds) {
    if (!cardIds || !Array.isArray(cardIds)) {
      return [];
    }
    
    const cards = [];
    for (const cardId of cardIds) {
      try {
        const card = await this.storage.getCard(cardId);
        if (card) {
          cards.push(card);
        }
      } catch (error) {
        console.warn(`[CardManager] Failed to get card ${cardId}:`, error);
      }
    }
    
    return cards;
  }

  /**
   * 取得名片版本歷史（預留功能）
   */
  async getCardVersions(cardId) {
    // 目前版本暫時返回空陣列，未來可擴展版本控制功能
    return [];
  }

  /**
   * 快速匯出功能 - 提供簡化的匯出選項
   */
  async quickExport(format = 'json', options = {}) {
    const exportOptions = {
      exportAll: true,
      format: format,
      autoDownload: true,
      ...options
    };
    
    return await this.exportCards(exportOptions);
  }

  /**
   * 匯出單張名片
   */
  async exportSingleCard(cardId, format = 'vcard', options = {}) {
    try {
      const card = await this.storage.getCard(cardId);
      if (!card) {
        return { success: false, error: this.getMessage('card_not_found') };
      }

      const exportOptions = {
        cardIds: [cardId],
        format: format,
        autoDownload: options.autoDownload !== false,
        language: options.language || 'zh',
        includeBothLanguages: options.includeBothLanguages || false,
        ...options
      };

      return await this.exportCards(exportOptions);
    } catch (error) {
      console.error('[CardManager] Single card export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 取得匯出預覽
   */
  async getExportPreview(cardIds, format = 'json') {
    try {
      const cards = cardIds ? await this.getSelectedCards(cardIds) : await this.storage.listCards();
      
      if (cards.length === 0) {
        return { success: false, error: this.getMessage('no_cards_to_export') };
      }

      const preview = {
        totalCards: cards.length,
        cardTypes: {},
        estimatedSizes: {},
        cards: cards.map(card => ({
          id: card.id,
          name: card.data.name,
          type: card.type || this.detectCardType(card.data),
          size: JSON.stringify(card).length
        }))
      };

      // 統計名片類型
      preview.cards.forEach(card => {
        preview.cardTypes[card.type] = (preview.cardTypes[card.type] || 0) + 1;
      });

      // 估算不同格式的檔案大小
      if (format === 'json' || format === 'both') {
        const jsonSize = JSON.stringify({
          version: '3.0.2',
          cards: cards
        }).length;
        preview.estimatedSizes.json = jsonSize;
      }

      if (format === 'vcard' || format === 'both') {
        let vCardSize = 0;
        for (const card of cards) {
          const vCardContent = this.generateVCardContent(card.data, 'zh', card.type);
          vCardSize += vCardContent.length;
        }
        preview.estimatedSizes.vcard = vCardSize;
      }

      return { success: true, preview };
    } catch (error) {
      console.error('[CardManager] Export preview failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成 QR 碼 - PWA-09A 修復版本，使用原生成器邏輯
   */
  async generateQRCode(cardId, options = {}) {
    try {
      
      const card = await this.storage.getCard(cardId);
      if (!card) {
        throw new Error('名片不存在');
      }

      // 使用原生成器邏輯生成 URL
      const cardUrl = this.generateCardUrl(card.data, card.type);
      
      // 檢查 URL 長度（使用更寬鬆的限制，因為原生成器已經過優化）
      if (cardUrl.length > 2500) {
        return {
          success: false,
          error: `URL 太長（${cardUrl.length} 字元），請減少資料內容`
        };
      }
      
      // 優先使用統一 QR 工具
      if (window.qrUtils) {
        const result = await window.qrUtils.generateHighResQRCode(cardUrl, {
          size: options.size || 800,
          colorDark: options.colorDark || '#6b7280',
          colorLight: options.colorLight || '#ffffff'
        });

        if (result.success) {
          return {
            success: true,
            dataUrl: result.dataUrl,
            url: cardUrl,
            size: result.size
          };
        } else {
        }
      }
      
      // 備用方案：直接使用 QRCode.js（與原生成器一致）
      if (window.QRCode) {
        return await this.generateQRCodeFallback(cardUrl, options);
      }
      
      throw new Error('QR 碼生成工具未載入');
    } catch (error) {
      console.error('[CardManager] QR code generation failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * QR 碼生成備用方案（直接使用 QRCode.js）
   */
  async generateQRCodeFallback(url, options = {}) {
    return new Promise((resolve) => {
      try {
        // 創建臨時容器
        const tempContainer = document.createElement('div');
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);
        
        // 使用與原生成器相同的設定
        const qr = new window.QRCode(tempContainer, {
          text: url,
          width: options.size || 800,
          height: options.size || 800,
          colorDark: options.colorDark || '#6b7280',
          colorLight: options.colorLight || '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.H
        });
        
        // 等待生成完成
        setTimeout(() => {
          try {
            const img = tempContainer.querySelector('img');
            if (img && img.src) {
              const dataUrl = img.src;
              document.body.removeChild(tempContainer);
              resolve({
                success: true,
                dataUrl,
                url,
                size: options.size || 800
              });
            } else {
              document.body.removeChild(tempContainer);
              resolve({ success: false, error: 'QR 碼圖片生成失敗' });
            }
          } catch (error) {
            document.body.removeChild(tempContainer);
            resolve({ success: false, error: error.message });
          }
        }, 200);
      } catch (error) {
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * 生成名片 URL - PWA-22 修復：確保資料完整性
   */
  generateCardUrl(cardData, cardType) {
    try {
      
      // 根據原始來源格式選擇生成器，而非根據資料內容
      const isFromBilingualGenerator = this.isFromBilingualGenerator(cardData, cardType);
      
      if (isFromBilingualGenerator) {
        // 使用雙語生成器的完全相同邏輯（PWA-22 修復版）
        return this.generateBilingualUrl(cardData, cardType);
      } else {
        // 使用標準生成器的完全相同邏輯
        return this.generateStandardUrl(cardData, cardType);
      }
    } catch (error) {
      console.error('[CardManager] PWA-22: URL generation failed:', error);
      throw error;
    }
  }
  
  /**
   * 使用標準生成器的完全相同邏輯（nfc-generator.html）
   */
  generateStandardUrl(cardData, cardType) {
    
    // 完全複製 nfc-generator.html 的邏輯
    const compactData = {
      n: safeMonolingualStringify(cardData.name),
      t: safeMonolingualStringify(cardData.title),
      d: safeMonolingualStringify(cardData.department),
      e: safeMonolingualStringify(cardData.email),
      p: safeMonolingualStringify(cardData.phone),
      m: safeMonolingualStringify(cardData.mobile),
      a: safeMonolingualStringify(cardData.avatar),
      g: Array.isArray(cardData.greetings) ? cardData.greetings : [],
      s: safeMonolingualStringify(cardData.socialNote)
    };
    
    // 安全字串化函數
    function safeMonolingualStringify(field) {
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        return firstValue || '';
      }
      const stringValue = String(field || '');
      return stringValue === '[object Object]' ? '' : stringValue;
    }
    
    // 個人版本新增組織和地址欄位（與原生成器一致）
    if (cardType === 'personal' || cardType === 'personal-en') {
      compactData.o = cardData.organization || '';
      compactData.addr = cardData.address || '';
    }
    
    // 移除空值（與原生成器一致）
    Object.keys(compactData).forEach(key => {
      if (!compactData[key] || (Array.isArray(compactData[key]) && compactData[key].length === 0)) {
        delete compactData[key];
      }
    });
    
    // 使用與原生成器完全相同的編碼方式
    const jsonString = JSON.stringify(compactData);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    
    return this.buildStandardUrl(encoded, cardType);
  }
  
  /**
   * 使用雙語生成器的完全相同邏輯（nfc-generator-bilingual.html）
   * PWA-23 終極修復：確保雙語問候語完整保持
   */
  generateBilingualUrl(cardData, cardType) {
    
    // PWA-23 修復：確保所有欄位都有值，特別是 socialNote
    const safeCardData = {
      name: cardData.name || '',
      title: cardData.title || '',
      department: cardData.department || '',
      email: cardData.email || '',
      phone: cardData.phone || '',
      mobile: cardData.mobile || '',
      avatar: cardData.avatar || '',
      greetings: cardData.greetings || [],
      socialNote: cardData.socialNote || '' // PWA-23: 確保 socialNote 不為 null/undefined
    };
    
    
    // PWA-23 終極修復：雙語問候語處理邏輯 - 保持原始格式
    let greetingsArray = [];
    
    if (Array.isArray(safeCardData.greetings)) {
      greetingsArray = safeCardData.greetings.map((g, index) => {
        
        if (typeof g === 'string') {
          // 已經是字串格式，直接保持（可能包含雙語格式）
          return g;
        } else if (g && typeof g === 'object' && g.zh && g.en) {
          // 將物件格式轉回雙語字串格式
          const result = `${g.zh}~${g.en}`;
          return result;
        } else if (g && typeof g === 'object') {
          // 修復：安全處理物件，避免 [object Object]
          const firstValue = Object.values(g).find(v => v && typeof v === 'string');
          if (firstValue) {
            return String(firstValue);
          }
          // 如果沒有有效值，返回預設問候語而不是 [object Object]
          return '歡迎認識我！~Nice to meet you!';
        }
        
        // 其他情況轉為字串
        const result = String(g || '');
        return result;
      }).filter(g => {
        const isValid = g && g.trim() && g !== '[object Object]';
        if (!isValid) {
        }
        return isValid;
      });
    } else if (typeof safeCardData.greetings === 'string') {
      greetingsArray = [safeCardData.greetings];
    } else if (safeCardData.greetings && typeof safeCardData.greetings === 'object') {
      if (safeCardData.greetings.zh && safeCardData.greetings.en) {
        greetingsArray = [`${safeCardData.greetings.zh}~${safeCardData.greetings.en}`];
      } else {
        const firstValue = Object.values(safeCardData.greetings).find(v => v && typeof v === 'string');
        greetingsArray = firstValue ? [String(firstValue)] : ['歡迎認識我！~Nice to meet you!'];
      }
    }
    
    // 如果沒有有效問候語，設定雙語預設值
    if (greetingsArray.length === 0) {
      greetingsArray = ['歡迎認識我！~Nice to meet you!'];
    }
    
    
    // PWA-23 修復：區分雙語欄位和單語欄位
    const safeBilingualStringify = (field) => {
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        if (field.zh && field.en) return `${field.zh}~${field.en}`;
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        return firstValue || '';
      }
      return String(field || '');
    };
    
    const safeMonolingualStringify = (field) => {
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        return firstValue || '';
      }
      return String(field || '');
    };
    
    const compactFields = [
      safeBilingualStringify(safeCardData.name),     // 0: name (雙語)
      safeBilingualStringify(safeCardData.title),    // 1: title (雙語)
      safeMonolingualStringify(safeCardData.department), // 2: department (單語)
      safeMonolingualStringify(safeCardData.email),     // 3: email (單語)
      safeMonolingualStringify(safeCardData.phone),     // 4: phone (單語)
      safeMonolingualStringify(safeCardData.mobile),    // 5: mobile (單語)
      safeMonolingualStringify(safeCardData.avatar),    // 6: avatar (單語)
      greetingsArray.join(','),                         // 7: greetings (雙語，已處理)
      safeMonolingualStringify(safeCardData.socialNote) // 8: socialNote (單語)
    ];
    
    const compact = compactFields.join('|');
    
    
    // 使用與雙語生成器完全相同的編碼方式
    const encoded = btoa(encodeURIComponent(compact))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    
    return this.buildBilingualUrl(encoded, cardType);
  }
  
  /**
   * 建立標準生成器 URL（與 nfc-generator.html 一致）
   */
  buildStandardUrl(encoded, cardType) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/pwa-card-storage.*$/, '');
    
    // 直接從 cardTypes 中獲取對應的頁面文件名
    const typeConfig = this.cardTypes[cardType];
    const targetPage = typeConfig ? typeConfig.page : 'index.html';
    
    // 使用與原生成器完全相同的 URL 編碼方式
    const url = `${baseUrl}${targetPage}?c=${encodeURIComponent(encoded)}`;
    return url;
  }
  
  /**
   * 建立雙語生成器 URL（與 nfc-generator-bilingual.html 一致）
   */
  buildBilingualUrl(encoded, cardType) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/pwa-card-storage.*$/, '');
    
    // 直接從 cardTypes 中獲取對應的頁面文件名
    const typeConfig = this.cardTypes[cardType];
    const targetPage = typeConfig ? typeConfig.page : 'index-bilingual.html';
    
    // 使用與雙語生成器完全相同的 URL 編碼方式
    const url = `${baseUrl}${targetPage}?data=${encodeURIComponent(encoded)}`;
    return url;
  }

  /**
   * 匯出 vCard - 修復版本，使用正確的名片類型
   */
  async exportVCard(cardId, language = 'zh') {
    try {
      const card = await this.storage.getCard(cardId);
      if (!card) {
        throw new Error('名片不存在');
      }

      // 重要修復：傳遞名片類型給 vCard 生成器
      const vCardContent = this.generateVCard(card.data, language, card.type);
      const blob = new Blob([vCardContent], { type: 'text/vcard' });
      
      const name = this.getDisplayName(card.data, language);
      const filename = `${name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}.vcf`;

      return {
        success: true,
        file: blob,
        filename
      };
    } catch (error) {
      console.error('[CardManager] vCard export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成 vCard 內容 - 修復版本，使用名片類型邏輯
   */
  generateVCard(cardData, language = 'zh', cardType = 'personal') {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

    // 安全字串化函數 - 修復 [object Object] 問題
    const safeStringify = (field) => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        // 處理雙語物件格式
        if (field.zh && field.en) {
          return language === 'en' ? field.en : field.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      // 其他類型轉字串，但避免 [object Object]
      const stringValue = String(field);
      return stringValue === '[object Object]' ? '' : stringValue;
    };

    // 姓名
    const name = safeStringify(this.getDisplayName(cardData, language));
    if (name) {
      lines.push(`FN:${name}`);
      lines.push(`N:${name};;;;`);
    }

    // 職稱
    const title = safeStringify(this.getDisplayTitle(cardData, language));
    if (title) {
      lines.push(`TITLE:${title}`);
    }

    // 組織 - 根據名片類型處理
    const organization = this.getCorrectOrganizationForVCard(cardData, cardType, language);
    if (organization) {
      lines.push(`ORG:${organization}`);
    }

    // 電子郵件
    const email = safeStringify(cardData.email);
    if (email) {
      lines.push(`EMAIL:${email}`);
    }

    // 電話
    const phone = safeStringify(cardData.phone);
    if (phone) {
      lines.push(`TEL:${phone}`);
    }

    // 手機
    const mobile = safeStringify(cardData.mobile);
    if (mobile) {
      lines.push(`TEL;TYPE=CELL:${mobile}`);
    }

    // 地址 - 根據名片類型處理
    const address = this.getCorrectAddressForVCard(cardData, cardType, language);
    if (address) {
      lines.push(`ADR:;;${address};;;;`);
    }

    // 頭像
    const avatar = safeStringify(cardData.avatar);
    if (avatar) {
      lines.push(`PHOTO;VALUE=URL:${avatar}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  /**
   * 根據名片類型獲取正確的組織名稱（用於 vCard）
   */
  getCorrectOrganizationForVCard(cardData, cardType, language = 'zh') {
    // 對於政府機關版本，強制使用預設組織名稱
    if (cardType === 'index' || cardType === 'index1' || cardType === 'bilingual' || cardType === 'bilingual1') {
      return language === 'en' ? 'Ministry of Digital Affairs' : '數位發展部';
    } else if (cardType === 'en' || cardType === 'en1') {
      return 'Ministry of Digital Affairs';
    }
    
    // 個人版使用實際的組織資訊
    if (cardData.organization) {
      const org = language === 'en' && cardData.organization === '數位發展部' 
        ? 'Ministry of Digital Affairs' 
        : cardData.organization;
      return org;
    }
    
    return '';
  }

  /**
   * 根據名片類型獲取正確的地址（用於 vCard）
   */
  getCorrectAddressForVCard(cardData, cardType, language = 'zh') {
    // 對於政府機關版本，強制使用預設地址
    if (cardType === 'index' || cardType === 'bilingual') {
      // 延平大樓
      return language === 'en' ? 
        '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan' :
        '臺北市中正區延平南路143號';
    } else if (cardType === 'index1' || cardType === 'bilingual1') {
      // 新光大樓
      return language === 'en' ? 
        '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)' :
        '臺北市中正區忠孝西路一段６６號（１７、１９樓）';
    } else if (cardType === 'en') {
      return '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan';
    } else if (cardType === 'en1') {
      return '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)';
    }
    
    // 個人版使用實際的地址資訊
    if (cardData.address) {
      return cardData.address;
    }
    
    return '';
  }

  /**
   * 檢查是否來自雙語生成器
   */
  isFromBilingualGenerator(cardData, cardType) {
    // 只有明確的雙語類型才使用雙語生成器
    const bilingualTypes = ['bilingual', 'bilingual1', 'personal-bilingual'];
    return bilingualTypes.includes(cardType);
  }

  /**
   * 獲取顯示名稱 - 修復 [object Object] 問題
   */
  getDisplayName(cardData, language = 'zh') {
    try {
      if (cardData.nameZh && cardData.nameEn) {
        return language === 'en' ? cardData.nameEn : cardData.nameZh;
      }
      
      if (cardData.name) {
        // 處理物件格式
        if (typeof cardData.name === 'object' && cardData.name !== null) {
          if (cardData.name.zh && cardData.name.en) {
            return language === 'en' ? cardData.name.en : cardData.name.zh;
          }
          // 提取第一個有效字串值
          const firstValue = Object.values(cardData.name).find(v => v && typeof v === 'string');
          if (firstValue) return firstValue;
          // 避免 [object Object]
          return '';
        }
        
        // 處理字串格式
        if (typeof cardData.name === 'string') {
          if (cardData.name.indexOf('~') !== -1) {
            const parts = cardData.name.split('~');
            const chinese = parts[0] ? parts[0].trim() : '';
            const english = parts[1] ? parts[1].trim() : '';
            return language === 'en' ? english : chinese;
          }
          return cardData.name;
        }
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * 獲取顯示職稱 - 修復 [object Object] 問題
   */
  getDisplayTitle(cardData, language = 'zh') {
    if (cardData.titleZh && cardData.titleEn) {
      return language === 'en' ? cardData.titleEn : cardData.titleZh;
    }
    
    if (cardData.title) {
      // 處理物件格式
      if (typeof cardData.title === 'object' && cardData.title !== null) {
        if (cardData.title.zh && cardData.title.en) {
          return language === 'en' ? cardData.title.en : cardData.title.zh;
        }
        // 提取第一個有效字串值
        const firstValue = Object.values(cardData.title).find(v => v && typeof v === 'string');
        if (firstValue) return firstValue;
        // 避免 [object Object]
        return '';
      }
      
      // 處理字串格式
      if (typeof cardData.title === 'string') {
        if (cardData.title.includes('~')) {
          const [chinese, english] = cardData.title.split('~');
          return language === 'en' ? english.trim() : chinese.trim();
        }
        return cardData.title;
      }
    }
    
    return '';
  }

  /**
   * 獲取統計資訊
   */
  async getStats() {
    try {
      const storageStats = await this.storage.getStorageStats();
      const lastHealthCheck = await this.storage.getSetting('lastHealthCheck');
      
      return {
        totalCards: storageStats.totalCards,
        storageUsed: storageStats.storageUsedPercent,
        lastSync: lastHealthCheck ? 
          new Date(lastHealthCheck.timestamp).toLocaleDateString() : 
          '從未',
        healthStatus: lastHealthCheck?.status || 'unknown'
      };
    } catch (error) {
      console.error('[CardManager] Get stats failed:', error);
      return {
        totalCards: 0,
        storageUsed: 0,
        lastSync: '從未',
        healthStatus: 'error'
      };
    }
  }

  /**
   * 新增名片 (PWA-05 CRUD 操作) - 修復問候語處理
   */
  async addCard(cardData) {
    try {
      
      // 預處理問候語格式
      const preprocessedData = this.preprocessCardData(cardData);
      
      // 自動識別類型
      const cardType = this.detectCardType(preprocessedData);
      
      // 套用類型預設值
      const enhancedData = this.applyCardTypeDefaults(preprocessedData, cardType);
      
      // 儲存到 IndexedDB
      const cardId = await this.storage.storeCard(enhancedData);
      
      return { 
        success: true, 
        id: cardId,
        type: cardType,
        data: enhancedData 
      };
    } catch (error) {
      console.error('[CardManager] Add card failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 預處理名片資料 - PWA-23 終極修復：確保雙語問候語完整保持
   * 保持原始雙語格式，不進行語言選擇
   */
  preprocessCardData(cardData) {
    
    // PWA-23 修復：區分雙語欄位和單語欄位
    const safeBilingualStringify = (field) => {
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        if (field.zh && field.en) return `${field.zh}~${field.en}`;
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        return firstValue || '';
      }
      return String(field || '');
    };
    
    const safeMonolingualStringify = (field) => {
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        // 先檢查是否為雙語物件格式
        if (field.zh && field.en) {
          return field.zh; // 單語欄位優先使用中文
        }
        const firstValue = Object.values(field).find(v => v && typeof v === 'string');
        return firstValue || '';
      }
      // 確保不會返回 [object Object]
      const stringValue = field ? String(field) : '';
      return stringValue === '[object Object]' ? '' : stringValue;
    };
    
    const processed = {
      name: String(safeBilingualStringify(cardData.name) || ''),        // 雙語
      title: String(safeBilingualStringify(cardData.title) || ''),      // 雙語
      department: String(safeMonolingualStringify(cardData.department) || ''), // 單語
      email: String(safeMonolingualStringify(cardData.email) || ''),    // 單語
      phone: String(safeMonolingualStringify(cardData.phone) || ''),    // 單語
      mobile: String(safeMonolingualStringify(cardData.mobile) || ''),  // 單語
      avatar: String(safeMonolingualStringify(cardData.avatar) || ''),  // 單語
      greetings: cardData.greetings || [],               // 雙語，單獨處理
      socialNote: String(safeMonolingualStringify(cardData.socialNote) || ''), // 單語
      organization: String(safeMonolingualStringify(cardData.organization) || ''), // 單語
      address: String(safeMonolingualStringify(cardData.address) || '') // 單語
    };
    
    
    // PWA-23 終極修復：雙語問候語處理邏輯
    if (processed.greetings) {
      // 確保是陣列格式
      if (!Array.isArray(processed.greetings)) {
        processed.greetings = [processed.greetings];
      }
      
      
      // 保持雙語字串格式，不進行語言選擇
      processed.greetings = processed.greetings.map((greeting, index) => {
        
        if (typeof greeting === 'object' && greeting !== null) {
          // 將物件格式轉回雙語字串格式
          if (greeting.zh && greeting.en) {
            const result = `${greeting.zh}~${greeting.en}`;
            return result;
          }
          // 修復：安全處理物件，避免 [object Object]
          const firstValue = Object.values(greeting).find(v => v && typeof v === 'string');
          if (firstValue) {
            return String(firstValue);
          }
          // 如果沒有有效值，返回預設問候語而不是 [object Object]
          return '歡迎認識我！~Nice to meet you!';
        }
        
        // 已經是字串格式，直接保持
        const result = String(greeting);
        // 防止 [object Object] 問題
        if (result === '[object Object]') {
          return '歡迎認識我！~Nice to meet you!';
        }
        return result;
      }).filter(g => {
        const isValid = g && g.trim() && g !== '[object Object]';
        if (!isValid) {
        }
        return isValid;
      });
    }
    
    // 如果沒有有效問候語，設定預設值
    if (!processed.greetings || processed.greetings.length === 0) {
      processed.greetings = ['歡迎認識我！~Nice to meet you!'];
    }
    
    
    return processed;
  }

  /**
   * 列出名片 - 保持原始資料格式
   */
  async listCards(filter = {}) {
    const cards = await this.storage.listCards(filter);
    
    // 不進行格式轉換，保持原始資料
    // 僅在顯示時才進行語言選擇
    return cards;
  }

  /**
   * 獲取名片版本歷史
   */
  async getCardVersions(cardId) {
    try {
      if (window.app && window.app.versionManager) {
        const versionHistory = await window.app.versionManager.getVersionHistory(cardId);
        return window.app.versionManager.formatVersionHistory(versionHistory);
      }
      return [];
    } catch (error) {
      console.error('[CardManager] Get card versions failed:', error);
      return [];
    }
  }

  /**
   * 獲取選中的名片 - 保持原始資料格式
   */
  async getSelectedCards(cardIds) {
    if (!cardIds || cardIds.length === 0) {
      return [];
    }

    const cards = [];
    for (const cardId of cardIds) {
      const card = await this.storage.getCard(cardId);
      if (card) {
        // 不進行格式轉換，保持原始資料
        cards.push(card);
      }
    }
    return cards;
  }

  /**
   * PWA-04: 雙語支援功能
   */
  translateText(text, category, targetLang = 'en') {
    if (!text || !this.translations || targetLang === 'zh') {
      return text;
    }

    const translations = this.translations[category];
    if (translations && translations[text]) {
      return translations[text];
    }

    return text;
  }

  getBilingualName(cardData, language = 'zh') {
    try {
      if (cardData.nameZh && cardData.nameEn) {
        return language === 'en' ? cardData.nameEn : cardData.nameZh;
      }
      
      if (cardData.name) {
        // 處理物件格式
        if (typeof cardData.name === 'object' && cardData.name !== null) {
          return language === 'en' ? (cardData.name.en || cardData.name.zh || '') : (cardData.name.zh || cardData.name.en || '');
        }
        
        // 處理字串格式
        if (typeof cardData.name === 'string' && cardData.name.indexOf('~') !== -1) {
          const parts = cardData.name.split('~');
          const chinese = parts[0] ? parts[0].trim() : '';
          const english = parts[1] ? parts[1].trim() : '';
          return language === 'en' ? english : chinese;
        }
        
        // 純字串格式
        if (typeof cardData.name === 'string') {
          return cardData.name;
        }
      }
      
      return String(cardData.name || '');
    } catch (error) {
      return '';
    }
  }

  getBilingualTitle(cardData, language = 'zh') {
    try {
      if (cardData.titleZh && cardData.titleEn) {
        return language === 'en' ? cardData.titleEn : cardData.titleZh;
      }
      
      if (cardData.title) {
        // 處理物件格式
        if (typeof cardData.title === 'object' && cardData.title !== null) {
          return language === 'en' ? (cardData.title.en || cardData.title.zh || '') : (cardData.title.zh || cardData.title.en || '');
        }
        
        // 處理字串格式
        if (typeof cardData.title === 'string' && cardData.title.indexOf('~') !== -1) {
          const parts = cardData.title.split('~');
          const chinese = parts[0] ? parts[0].trim() : '';
          const english = parts[1] ? parts[1].trim() : '';
          return language === 'en' ? english : chinese;
        }
        
        // 純字串格式
        if (typeof cardData.title === 'string') {
          if (language === 'en') {
            return this.translateText(cardData.title, 'titles', 'en');
          }
          return cardData.title;
        }
      }
      
      return String(cardData.title || '');
    } catch (error) {
      return '';
    }
  }

  getBilingualCardData(cardData, language = 'zh') {
    // 安全處理所有欄位，支援物件和字串格式
    const safeGetField = (field) => {
      try {
        if (!field) return '';
        
        // 處理物件格式
        if (typeof field === 'object' && field !== null) {
          // 檢查是否為雙語物件格式
          if (field.zh || field.en) {
            if (language === 'en') {
              return field.en || field.zh || '';
            } else {
              return field.zh || field.en || '';
            }
          }
          
          // 其他物件格式，嘗試提取第一個有效值
          const values = Object.values(field).filter(v => v && typeof v === 'string');
          if (values.length > 0) {
            return values[0];
          }
          
          // 最後手段：返回空字串而不是 [object Object]
          return '';
        }
        
        // 處理字串格式
        if (typeof field === 'string') {
          if (field.indexOf('~') !== -1) {
            const parts = field.split('~');
            return language === 'en' ? (parts[1] || parts[0] || '') : (parts[0] || '');
          }
          return field;
        }
        
        // 其他類型轉字串
        return String(field || '');
      } catch (error) {
        return '';
      }
    };
    
    // 處理問候語
    let processedGreetings = cardData.greetings || [];
    if (!Array.isArray(processedGreetings)) {
      processedGreetings = [processedGreetings];
    }
    
    processedGreetings = processedGreetings.map(greeting => {
      if (typeof greeting === 'object' && greeting !== null) {
        if (greeting.zh && greeting.en) {
          return `${greeting.zh}~${greeting.en}`;
        }
        return String(greeting);
      }
      return String(greeting);
    }).filter(g => g && g.trim() && g !== '[object Object]');
    
    if (processedGreetings.length === 0) {
      processedGreetings = ['歡迎認識我！~Nice to meet you!'];
    }
    
    return {
      name: this.getBilingualName(cardData, language),
      title: this.getBilingualTitle(cardData, language),
      department: safeGetField(cardData.department),
      organization: safeGetField(cardData.organization),
      address: safeGetField(cardData.address),
      email: String(cardData.email || '').trim(),
      phone: String(cardData.phone || '').trim(),
      mobile: String(cardData.mobile || '').trim(),
      avatar: cardData.avatar || '',
      greetings: processedGreetings,
      socialNote: String(safeGetField(cardData.socialNote) || '').trim()
    };
  }

  /**
   * 獲取顯示用問候語 - 僅在顯示時選擇語言
   * 不改變原始資料格式
   */
  getDisplayGreetings(greetings, language = 'zh') {
    if (!greetings) return ['歡迎認識我！'];
    
    if (Array.isArray(greetings)) {
      const processed = greetings
        .map(g => {
          if (typeof g === 'string') {
            // 處理雙語格式，根據語言選擇
            if (g.includes('~')) {
              const [chinese, english] = g.split('~');
              return language === 'en' ? english.trim() : chinese.trim();
            }
            return g.trim();
          }
          return String(g).trim();
        })
        .filter(g => g && g !== '[object Object]');
      return processed.length > 0 ? processed : ['歡迎認識我！'];
    }
    
    if (typeof greetings === 'string') {
      // 處理雙語格式
      if (greetings.includes('~')) {
        const [chinese, english] = greetings.split('~');
        return [language === 'en' ? english.trim() : chinese.trim()];
      }
      return [greetings.trim()];
    }
    
    return ['歡迎認識我！'];
  }

  /**
   * 獲取單個問候語的顯示內容 - 僅在顯示時選擇語言
   */
  getGreetingDisplayText(greeting, language = 'zh') {
    if (!greeting) return null;
    
    if (typeof greeting === 'string') {
      // 處理雙語格式 "中文~English"
      if (greeting.includes('~')) {
        const [chinese, english] = greeting.split('~');
        return language === 'en' ? english.trim() : chinese.trim();
      }
      return greeting.trim();
    }
    
    return String(greeting).trim();
  }
}

// 確保類別正確導出到全域
window.PWACardManager = PWACardManager;

