/**
 * PWA 名片支援核心函數
 * 支援 9 種名片類型及兩大生成器的資料解析與處理
 */

class PWACardSupport {
  constructor(storage, cardManager) {
    this.storage = storage;
    this.cardManager = cardManager;
  }

  /**
   * 統一的名片資料解析器 - 支援兩大生成器
   * 1. nfc-generator-bilingual.html (管道分隔格式)
   * 2. nfc-generator.html (JSON 格式)
   */
  getCardDataFromNFC(cardDataParam) {
    if (!cardDataParam) return null;
    
    
    try {
      // 優先級 1: 管道分隔格式（雙語版本）
      const pipeResult = this.parsePipeFormat(cardDataParam);
      if (pipeResult) {
        return pipeResult;
      }
      
      // 優先級 2: JSON 格式（單語版本）
      const jsonResult = this.parseJSONFormat(cardDataParam);
      if (jsonResult) {
        return jsonResult;
      }
      
      // 優先級 3: Legacy 格式（向下相容）
      const legacyResult = this.parseLegacyFormat(cardDataParam);
      if (legacyResult) {
        return legacyResult;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析管道分隔格式（雙語生成器）
   * 格式: name|title|department|email|phone|mobile|avatar|greetings|socialNote
   */
  parsePipeFormat(cardDataParam) {
    try {
      // URL-safe Base64 解碼
      const padding = '='.repeat((4 - cardDataParam.length % 4) % 4);
      const base64Fixed = cardDataParam.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const compact = decodeURIComponent(atob(base64Fixed));
      
      const parts = compact.split('|');
      
      // 支援舊版本（8欄位）和新版本（9欄位）
      let parsedData;
      if (parts.length === 8) {
        // 舊版本格式（沒有手機號碼）
        const greetings = parts[6] ? parts[6].split(',').map(g => g.trim()).filter(g => g) : ['歡迎認識我！'];
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: '',
          avatar: parts[5] || '',
          greetings: greetings,
          socialNote: parts[7] || ''
        };
      } else if (parts.length >= 9) {
        // 新版本格式（包含手機號碼）
        const greetings = parts[7] ? parts[7].split(',').map(g => g.trim()).filter(g => g) : ['歡迎認識我！'];
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: parts[5] || '',
          avatar: parts[6] || '',
          greetings: greetings,
          socialNote: parts[8] || ''
        };
      } else {
        throw new Error(`Invalid pipe format: ${parts.length} parts`);
      }
      
      return { data: parsedData };
    } catch (error) {
      // 備用方案：標準 Base64 解碼
      try {
        const decoded = decodeURIComponent(atob(cardDataParam));
        const parts = decoded.split('|');
        
        if (parts.length < 8) return null;
        
        const greetings = parts[parts.length >= 9 ? 7 : 6] ? 
          parts[parts.length >= 9 ? 7 : 6].split(',').map(g => g.trim()).filter(g => g) : 
          ['歡迎認識我！'];
        
        const parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: parts.length >= 9 ? parts[5] || '' : '',
          avatar: parts[parts.length >= 9 ? 6 : 5] || '',
          greetings: greetings,
          socialNote: parts[parts.length >= 9 ? 8 : 7] || ''
        };
        
        return { data: parsedData };
      } catch (standardError) {
        return null;
      }
    }
  }

  /**
   * 解析 JSON 格式（單語生成器）
   * 格式: {n: name, t: title, d: department, ...}
   */
  parseJSONFormat(cardDataParam) {
    try {
      // 標準 Base64 解碼
      const decoded = decodeURIComponent(atob(cardDataParam));
      const jsonData = JSON.parse(decoded);
      
      // 處理問候語
      let greetings = [];
      if (Array.isArray(jsonData.g)) {
        greetings = jsonData.g;
      } else if (Array.isArray(jsonData.greetings)) {
        greetings = jsonData.greetings;
      } else if (jsonData.g && typeof jsonData.g === 'string') {
        greetings = [jsonData.g];
      } else if (jsonData.greetings && typeof jsonData.greetings === 'string') {
        greetings = [jsonData.greetings];
      } else {
        greetings = ['歡迎認識我！'];
      }
      
      return {
        data: {
          name: jsonData.n || jsonData.name || '',
          title: jsonData.t || jsonData.title || '',
          department: jsonData.d || jsonData.department || '',
          organization: jsonData.o || jsonData.organization || '',
          email: jsonData.e || jsonData.email || '',
          phone: jsonData.p || jsonData.phone || '',
          mobile: jsonData.m || jsonData.mobile || '',
          avatar: jsonData.a || jsonData.avatar || '',
          address: jsonData.addr || jsonData.address || '',
          greetings: greetings,
          socialNote: jsonData.s || jsonData.socialNote || ''
        }
      };
    } catch (error) {
      // 備用方案：UTF-8 解碼
      try {
        const fixedBase64 = cardDataParam
          .replace(/\s/g, '+')
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .trim();
        
        const binaryString = atob(fixedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const jsonString = new TextDecoder('utf-8').decode(bytes);
        const jsonData = JSON.parse(jsonString);
        
        let greetings = [];
        if (Array.isArray(jsonData.g)) {
          greetings = jsonData.g;
        } else if (jsonData.g && typeof jsonData.g === 'string') {
          greetings = [jsonData.g];
        } else {
          greetings = ['歡迎認識我！'];
        }
        
        return {
          data: {
            name: jsonData.n || jsonData.name || '',
            title: jsonData.t || jsonData.title || '',
            department: jsonData.d || jsonData.department || '',
            organization: jsonData.o || jsonData.organization || '',
            email: jsonData.e || jsonData.email || '',
            phone: jsonData.p || jsonData.phone || '',
            mobile: jsonData.m || jsonData.mobile || '',
            avatar: jsonData.a || jsonData.avatar || '',
            address: jsonData.addr || jsonData.address || '',
            greetings: greetings,
            socialNote: jsonData.s || jsonData.socialNote || ''
          }
        };
      } catch (utf8Error) {
        return null;
      }
    }
  }

  /**
   * 解析 Legacy 格式（向下相容）
   */
  parseLegacyFormat(cardDataParam) {
    try {
      const decoded = atob(cardDataParam);
      const jsonData = JSON.parse(decoded);
      
      if (jsonData.data && jsonData.data.name) {
        return jsonData;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 確保資料完整性 - PWA-23 根本性修復：完全保持雙語格式
   * 直接使用儲存層的標準化邏輯，不做任何額外處理
   */
  ensureDataCompleteness(cardData) {
    
    // PWA-23 根本性修復：直接使用儲存層的標準化方法
    if (this.storage && typeof this.storage.normalizeCardDataForStorage === 'function') {
      const result = this.storage.normalizeCardDataForStorage(cardData);
      return result;
    }
    
    // PWA-23 根本性修復：備用方案 - 最小化處理，保持原始資料
    
    // 深度複製以避免修改原始資料
    const enhanced = JSON.parse(JSON.stringify(cardData));
    
    // PWA-23 修復：確保所有 9 個欄位都存在
    const requiredFields = {
      name: '',
      title: '',
      department: '',
      organization: '',
      email: '',
      phone: '',
      mobile: '',
      avatar: '',
      address: '',
      socialNote: '',
      greetings: ['歡迎認識我！~Nice to meet you!']
    };
    
    // 確保所有欄位都存在
    Object.keys(requiredFields).forEach(field => {
      if (enhanced[field] === undefined || enhanced[field] === null) {
        enhanced[field] = requiredFields[field];
      }
    });
    
    // PWA-23 根本性修復：特別處理 greetings，但不改變格式
    if (enhanced.greetings) {
      
      if (Array.isArray(enhanced.greetings)) {
        // 過濾空值但保持雙語格式
        const validGreetings = enhanced.greetings.filter(g => {
          if (typeof g === 'string') {
            const trimmed = g.trim();
            return trimmed && trimmed !== '[object Object]' && trimmed !== 'undefined' && trimmed !== 'null';
          }
          if (typeof g === 'object' && g !== null) {
            return (g.zh && typeof g.zh === 'string') || (g.en && typeof g.en === 'string');
          }
          return false;
        });
        
        if (validGreetings.length > 0) {
          enhanced.greetings = validGreetings;
        } else {
          enhanced.greetings = requiredFields.greetings;
        }
      } else if (typeof enhanced.greetings === 'string') {
        const trimmed = enhanced.greetings.trim();
        if (trimmed && trimmed !== '[object Object]') {
          enhanced.greetings = [trimmed];
        } else {
          enhanced.greetings = requiredFields.greetings;
        }
      } else {
        enhanced.greetings = requiredFields.greetings;
      }
    }
    
    // PWA-23 修復：確保字串欄位是字串類型
    const stringFields = ['name', 'title', 'department', 'organization', 'email', 'phone', 'mobile', 'avatar', 'address', 'socialNote'];
    stringFields.forEach(field => {
      if (typeof enhanced[field] !== 'string') {
        if (enhanced[field] === null || enhanced[field] === undefined) {
          enhanced[field] = '';
        } else {
          enhanced[field] = String(enhanced[field]);
        }
      }
    });
    
    
    return enhanced;
  }

  /**
   * 自動識別名片類型（9種類型）
   */
  detectCardType(cardData) {
    if (this.cardManager && typeof this.cardManager.detectCardType === 'function') {
      return this.cardManager.detectCardType(cardData);
    }
    
    // 備用方案：簡化識別
    const isGov = this.isGovernmentCard(cardData);
    const isEn = this.isEnglishCard(cardData);
    const isBilingual = this.isBilingualCard(cardData);
    const isShinGuang = this.isShinGuangBuilding(cardData);
    
    if (isBilingual) {
      return isGov ? (isShinGuang ? 'gov-sg-bilingual' : 'gov-yp-bilingual') : 'personal-bilingual';
    }
    
    if (isEn) {
      return isGov ? (isShinGuang ? 'gov-sg-en' : 'gov-yp-en') : 'personal-en';
    }
    
    if (isGov) {
      return isShinGuang ? 'gov-sg' : 'gov-yp';
    }
    
    return 'personal';
  }

  /**
   * 檢查是否為政府機關名片
   */
  isGovernmentCard(cardData) {
    const govIndicators = [
      '數位發展部', 'Ministry of Digital Affairs', 'moda',
      '延平南路143號', '松仁路99號', '忠孝西路一段66號',
      '@moda.gov.tw', 'moda.gov.tw'
    ];

    const textToCheck = [
      cardData.organization, cardData.department, 
      cardData.address, cardData.email, cardData.name, cardData.title
    ].filter(Boolean).join(' ').toLowerCase();

    return govIndicators.some(indicator => 
      textToCheck.includes(indicator.toLowerCase())
    );
  }

  /**
   * 檢查是否為雙語名片 - 增強檢測
   */
  isBilingualCard(cardData) {
    // 檢查姓名和職稱
    if (cardData.name && cardData.name.includes('~')) return true;
    if (cardData.title && cardData.title.includes('~')) return true;
    
    // 檢查問候語
    if (cardData.greetings && Array.isArray(cardData.greetings)) {
      return cardData.greetings.some(greeting => {
        if (typeof greeting === 'object' && greeting.zh && greeting.en) return true;
        if (typeof greeting === 'string' && greeting.includes('~')) return true;
        return false;
      });
    }
    
    // 檢查單一問候語字串
    if (typeof cardData.greetings === 'string' && cardData.greetings.includes('~')) {
      return true;
    }
    
    return false;
  }

  /**
   * 檢查是否為英文名片
   */
  isEnglishCard(cardData) {
    if (cardData.organization && cardData.organization.includes('Ministry of Digital Affairs')) return true;
    if (cardData.address && /\d+\s+\w+\s+(Rd\.|St\.|Ave\.)/.test(cardData.address)) return true;
    if (cardData.name && /^[A-Za-z\s\-\.]+$/.test(cardData.name) && !cardData.name.includes('~')) return true;
    
    return false;
  }

  /**
   * 檢查是否為新光大樓
   */
  isShinGuangBuilding(cardData) {
    if (!cardData.address) return false;
    
    const addressChecks = [
      cardData.address.includes('新光'),
      cardData.address.includes('松仁路'),
      cardData.address.includes('Songren'),
      cardData.address.includes('99'),
      cardData.address.includes('忠孝西路'),
      cardData.address.includes('Zhongxiao'),
      cardData.address.includes('66號')
    ];
    
    return addressChecks.some(check => check);
  }

  /**
   * 套用名片類型預設值
   */
  applyCardTypeDefaults(cardData, cardType) {
    if (this.cardManager && typeof this.cardManager.applyCardTypeDefaults === 'function') {
      return this.cardManager.applyCardTypeDefaults(cardData, cardType);
    }
    
    // 備用方案：基本預設值
    const enhanced = { ...cardData };
    
    // 政府機關預設值
    if (cardType.includes('gov')) {
      if (!enhanced.organization) {
        enhanced.organization = '數位發展部';
      }
      if (!enhanced.address) {
        enhanced.address = cardType.includes('sg') ? 
          '臺北市信義區松仁路99號' : 
          '臺北市中正區延平南路143號';
      }
    }
    
    return enhanced;
  }

  /**
   * 從複雜的問候語格式中提取字串 - PWA-23 修復：支援雙語切換
   */
  extractStringFromGreeting(greeting, language = 'zh') {
    
    if (!greeting) {
      return '';
    }
    
    if (typeof greeting === 'string') {
      const trimmed = greeting.trim();
      if (!trimmed || trimmed === '[object Object]') {
        return '';
      }
      
      // 處理雙語格式 "中文~English"
      if (trimmed.includes('~')) {
        const [chinese, english] = trimmed.split('~').map(s => s.trim());
        const result = language === 'en' ? (english || chinese) : (chinese || english);
        return result;
      }
      
      return trimmed;
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      if (language === 'en' && greeting.en && typeof greeting.en === 'string') {
        const trimmed = greeting.en.trim();
        if (trimmed && trimmed !== '[object Object]') {
          return trimmed;
        }
      }
      if (greeting.zh && typeof greeting.zh === 'string') {
        const trimmed = greeting.zh.trim();
        if (trimmed && trimmed !== '[object Object]') {
          return trimmed;
        }
      }
      if (greeting.en && typeof greeting.en === 'string') {
        const trimmed = greeting.en.trim();
        if (trimmed && trimmed !== '[object Object]') {
          return trimmed;
        }
      }
    }
    
    return '';
  }

  /**
   * 處理雙語問候語顯示 - 新增方法
   */
  processBilingualGreetings(greetings, language = 'zh') {
    if (!greetings || greetings.length === 0) {
      return language === 'en' ? ['Nice to meet you!'] : ['歡迎認識我！'];
    }
    
    // 確保輸入是陣列
    if (!Array.isArray(greetings)) {
      greetings = [greetings];
    }
    
    return greetings.map(greeting => {
      return this.extractStringFromGreeting(greeting, language);
    }).filter(g => g && g.trim());
  }
}

// 全域實例
window.PWACardSupport = PWACardSupport;

// 全域輔助函數 - 支援雙語問候語處理
window.processBilingualGreetingsForDisplay = function(greetings, language = 'zh') {
  const cardSupport = new PWACardSupport();
  return cardSupport.processBilingualGreetings(greetings, language);
};

window.extractBilingualGreeting = function(greeting, language = 'zh') {
  const cardSupport = new PWACardSupport();
  return cardSupport.extractStringFromGreeting(greeting, language);
};

