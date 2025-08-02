/**
 * PWA 名片管理器
 * 負責名片的業務邏輯處理、類型識別和資料轉換
 */

class PWACardManager {
  constructor(storage) {
    this.storage = storage;
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
    
    console.log('[CardManager] 開始類型識別，輸入資料:', {
      hasUrl: !!data.url,
      url: data.url,
      name: data.name,
      hasNameTilde: data.name?.includes?.('~'),
      hasTitleTilde: data.title?.includes?.('~')
    });
    
    // PWA-36 修復：整合 PWA 暫存機制
    if (window.PWAIntegration) {
      const enhancedType = window.PWAIntegration.identifyCardTypeEnhanced(data);
      if (enhancedType) {
        console.log('[CardManager] ✅ PWA 整合識別類型:', enhancedType);
        return enhancedType;
      }
    }
    
    // 1. 最高優先級：檢查資料中的 URL 欄位（絕對優先）
    if (data.url && typeof data.url === 'string') {
      const url = data.url.toLowerCase().trim();
      console.log('[CardManager] URL 檢測模式，URL:', url);
      
      // PWA-36 修復：處理 PWA 頁面 URL
      if (url.includes('pwa-card-storage')) {
        console.log('[CardManager] 檢測到 PWA 頁面，嘗試從參數解析');
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const cardParam = urlParams.get('c');
        if (cardParam) {
          try {
            const decodedData = JSON.parse(decodeURIComponent(atob(cardParam)));
            return this.identifyCardType(decodedData);
          } catch (error) {
            console.log('[CardManager] PWA 參數解析失敗，繼續其他方法');
          }
        }
      }
      
      // 精確匹配，按長度排序避免誤判
      if (url.includes('index-bilingual-personal.html')) {
        console.log('[CardManager] ✅ URL 匹配: index-bilingual-personal.html -> personal-bilingual');
        return 'personal-bilingual';
      }
      if (url.includes('index1-bilingual.html')) {
        console.log('[CardManager] ✅ URL 匹配: index1-bilingual.html -> bilingual1');
        return 'bilingual1';
      }
      if (url.includes('index-bilingual.html')) {
        console.log('[CardManager] ✅ URL 匹配: index-bilingual.html -> bilingual');
        return 'bilingual';
      }
      // 修復：處理不帶 .html 的 URL
      if (url.includes('index-bilingual-personal?') || url.includes('index-bilingual-personal&') || url.endsWith('index-bilingual-personal')) {
        console.log('[CardManager] ✅ URL 匹配: index-bilingual-personal (無副檔名) -> personal-bilingual');
        return 'personal-bilingual';
      }
      if (url.includes('index1-bilingual?') || url.includes('index1-bilingual&') || url.endsWith('index1-bilingual')) {
        console.log('[CardManager] ✅ URL 匹配: index1-bilingual (無副檔名) -> bilingual1');
        return 'bilingual1';
      }
      if (url.includes('index-bilingual?') || url.includes('index-bilingual&') || url.endsWith('index-bilingual')) {
        console.log('[CardManager] ✅ URL 匹配: index-bilingual (無副檔名) -> bilingual');
        return 'bilingual';
      }
      if (url.includes('index-personal-en.html')) {
        console.log('[CardManager] ✅ URL 匹配: index-personal-en.html -> personal-en');
        return 'personal-en';
      }
      if (url.includes('index1-en.html')) {
        console.log('[CardManager] ✅ URL 匹配: index1-en.html -> en1');
        return 'en1';
      }
      if (url.includes('index-en.html')) {
        console.log('[CardManager] ✅ URL 匹配: index-en.html -> en');
        return 'en';
      }
      if (url.includes('index-personal.html')) {
        console.log('[CardManager] ✅ URL 匹配: index-personal.html -> personal');
        return 'personal';
      }
      if (url.includes('index1.html')) {
        console.log('[CardManager] ✅ URL 匹配: index1.html -> index1');
        return 'index1';
      }
      if (url.includes('index.html')) {
        console.log('[CardManager] ✅ URL 匹配: index.html -> index');
        return 'index';
      }
      
      console.log('[CardManager] ⚠️ URL 存在但無匹配模式，URL:', url);
    }
    
    // 2. 最後備用：資料特徵識別（僅在無 URL 時使用）
    console.log('[CardManager] ⚠️ 使用資料特徵識別（備用方案）');
    const isBilingual = data.name?.includes('~') || data.title?.includes('~');
    const isGov = data.organization && data.department;
    const isShinGuang = data.address?.includes('新光') || data.address?.includes('松仁路');
    
    console.log('[CardManager] 資料特徵分析:', { isBilingual, isGov, isShinGuang });
    
    if (isBilingual) {
      const result = isGov ? (isShinGuang ? 'bilingual1' : 'bilingual') : 'personal-bilingual';
      console.log('[CardManager] 🔄 雙語版識別結果:', result);
      return result;
    }
    
    const result = isGov ? (isShinGuang ? 'index1' : 'index') : 'personal';
    console.log('[CardManager] 🔄 非雙語版識別結果:', result);
    return result;
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
   * 根據類型套用樣式和預設值
   */
  applyCardTypeDefaults(cardData, detectedType) {
    const typeConfig = this.cardTypes[detectedType];
    if (!typeConfig) return cardData;

    // 確保深度複製以避免修改原始物件
    const enhancedData = JSON.parse(JSON.stringify(cardData));

    // 套用組織預設值
    if (typeConfig.organization && !enhancedData.organization) {
      enhancedData.organization = typeConfig.organization;
    }

    // 套用地址預設值
    if (typeConfig.address && !enhancedData.address) {
      enhancedData.address = typeConfig.address;
    }

    // 處理雙語資料
    if (detectedType === 'bilingual' || detectedType === 'bilingual1' || detectedType === 'personal-bilingual') {
      return this.processBilingualData(enhancedData);
    }

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
   * 從檔案匯入名片
   */
  async importFromFile(file) {
    try {

      const fileContent = await this.readFile(file);
      let importData;

      // 根據檔案類型處理
      if (file.name.endsWith('.json')) {
        importData = JSON.parse(fileContent);
      } else if (file.name.endsWith('.vcf')) {
        importData = this.parseVCard(fileContent);
      } else {
        return { success: false, error: '不支援的檔案格式' };
      }

      let importedCount = 0;
      const errors = [];

      // 處理單一名片或名片陣列
      const cards = Array.isArray(importData) ? importData : [importData];

      for (const cardData of cards) {
        try {
          const cardType = this.detectCardType(cardData);
          const enhancedData = this.applyCardTypeDefaults(cardData, cardType);
          await this.storage.storeCard(enhancedData);
          importedCount++;
        } catch (error) {
          errors.push(`匯入失敗: ${error.message}`);
        }
      }

      return {
        success: importedCount > 0,
        count: importedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('[CardManager] Import from file failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 讀取檔案內容
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('檔案讀取失敗'));
      reader.readAsText(file);
    });
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
   * 匯出名片
   */
  async exportCards(options = {}) {
    try {

      const cards = options.exportAll 
        ? await this.storage.listCards()
        : await this.getSelectedCards(options.cardIds);

      if (cards.length === 0) {
        return { success: false, error: '沒有可匯出的名片' };
      }

      // 準備匯出資料
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        cards: cards.map(card => ({
          id: card.id,
          type: card.type,
          data: card.data,
          created: card.created,
          modified: card.modified
        }))
      };

      // 包含版本歷史（如果需要）
      if (options.includeVersions) {
        for (const card of exportData.cards) {
          card.versions = await this.getCardVersions(card.id);
        }
      }

      // 建立檔案
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `cards-export-${timestamp}.json`;

      return {
        success: true,
        file: blob,
        filename,
        count: cards.length
      };
    } catch (error) {
      console.error('[CardManager] Export failed:', error);
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
   * 匯出 vCard
   */
  async exportVCard(cardId, language = 'zh') {
    try {
      const card = await this.storage.getCard(cardId);
      if (!card) {
        throw new Error('名片不存在');
      }

      const vCardContent = this.generateVCard(card.data, language);
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
   * 生成 vCard 內容
   */
  generateVCard(cardData, language = 'zh') {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

    // 姓名
    const name = this.getDisplayName(cardData, language);
    lines.push(`FN:${name}`);
    lines.push(`N:${name};;;;`);

    // 職稱
    const title = this.getDisplayTitle(cardData, language);
    if (title) {
      lines.push(`TITLE:${title}`);
    }

    // 組織
    if (cardData.organization) {
      const org = language === 'en' && cardData.organization === '數位發展部' 
        ? 'Ministry of Digital Affairs' 
        : cardData.organization;
      lines.push(`ORG:${org}`);
    }

    // 電子郵件
    if (cardData.email) {
      lines.push(`EMAIL:${cardData.email}`);
    }

    // 電話
    if (cardData.phone) {
      lines.push(`TEL:${cardData.phone}`);
    }

    // 手機
    if (cardData.mobile) {
      lines.push(`TEL;TYPE=CELL:${cardData.mobile}`);
    }

    // 地址
    if (cardData.address) {
      lines.push(`ADR:;;${cardData.address};;;;`);
    }

    // 頭像
    if (cardData.avatar) {
      lines.push(`PHOTO;VALUE=URL:${cardData.avatar}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
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
   * 獲取顯示名稱
   */
  getDisplayName(cardData, language = 'zh') {
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

  /**
   * 獲取顯示職稱
   */
  getDisplayTitle(cardData, language = 'zh') {
    if (cardData.titleZh && cardData.titleEn) {
      return language === 'en' ? cardData.titleEn : cardData.titleZh;
    }
    
    if (cardData.title && typeof cardData.title === 'string' && cardData.title.includes('~')) {
      const [chinese, english] = cardData.title.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.title || '';
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

