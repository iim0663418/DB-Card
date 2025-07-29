/**
 * Legacy 系統適配器
 * 負責與現有 bilingual-common.js 系統的整合
 */

class LegacyAdapter {
  constructor() {
    this.bilingualCommon = null;
    this.initialized = false;
    
    this.init();
  }

  async init() {
    try {
      console.log('[LegacyAdapter] Initializing legacy adapter...');
      
      // 等待 bilingual-common.js 載入
      await this.waitForBilingualCommon();
      
      // 初始化適配器
      this.setupAdapterMethods();
      
      this.initialized = true;
      console.log('[LegacyAdapter] Legacy adapter initialized successfully');
    } catch (error) {
      console.error('[LegacyAdapter] Initialization failed:', error);
    }
  }

  /**
   * 等待 bilingual-common.js 載入
   */
  waitForBilingualCommon() {
    return new Promise((resolve) => {
      // 簡化：直接使用備用方法，不等待外部庫
      console.log('[LegacyAdapter] Using built-in parsing methods');
      resolve();
    });
  }

  /**
   * 設定適配器方法
   */
  setupAdapterMethods() {
    // 如果沒有找到 bilingual-common.js，提供備用實作
    if (!this.bilingualCommon) {
      this.bilingualCommon = {
        parseUrlData: this.fallbackParseUrlData.bind(this),
        encodeCardData: this.fallbackEncodeCardData.bind(this),
        generateCardUrl: this.fallbackGenerateCardUrl.bind(this),
        detectCardType: this.fallbackDetectCardType.bind(this),
        validateCardData: this.fallbackValidateCardData.bind(this)
      };
    }
  }

  /**
   * 統一的資料解析入口 - 支援所有現有格式
   */
  parseCardData(dataParam) {
    if (!dataParam) return null;
    
    console.log('[LegacyAdapter] Parsing data, length:', dataParam.length);
    
    // 1. 嘗試 JSON 格式（nfc-generator.html）
    const jsonResult = this.parseJSONFormat(dataParam);
    if (jsonResult) {
      console.log('[LegacyAdapter] Successfully parsed JSON format');
      return jsonResult;
    }
    
    // 2. 嘗試管道分隔格式（nfc-generator-bilingual.html）
    const pipeResult = this.parsePipeFormat(dataParam);
    if (pipeResult) {
      console.log('[LegacyAdapter] Successfully parsed pipe format');
      return pipeResult;
    }
    
    // 3. 嘗試 Legacy 格式
    const legacyResult = this.parseLegacyFormat(dataParam);
    if (legacyResult) {
      console.log('[LegacyAdapter] Successfully parsed legacy format');
      return legacyResult;
    }
    
    console.error('[LegacyAdapter] All parsing methods failed');
    return null;
  }
  
  /**
   * 解析 JSON 格式（nfc-generator.html）
   */
  parseJSONFormat(dataParam) {
    try {
      const fixedBase64 = dataParam
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
      
      return {
        data: {
          name: jsonData.n || '',
          title: jsonData.t || '',
          department: jsonData.d || '',
          organization: jsonData.o || '',
          email: jsonData.e || '',
          phone: jsonData.p || '',
          mobile: jsonData.m || '',
          avatar: jsonData.a || '',
          address: jsonData.addr || '',
          greetings: Array.isArray(jsonData.g) ? jsonData.g : (jsonData.g ? [jsonData.g] : []),
          socialNote: jsonData.s || ''
        }
      };
    } catch (error) {
      console.log('[LegacyAdapter] JSON format parsing failed:', error.message);
      return null;
    }
  }
  
  /**
   * 解析管道分隔格式（nfc-generator-bilingual.html）
   */
  parsePipeFormat(dataParam) {
    try {
      const padding = '='.repeat((4 - dataParam.length % 4) % 4);
      const base64Fixed = dataParam.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const compact = decodeURIComponent(atob(base64Fixed));
      
      const parts = compact.split('|');
      
      let parsedData;
      if (parts.length === 8) {
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: '',
          avatar: parts[5] || '',
          greetings: parts[6] ? parts[6].split(',').filter(g => g.trim()) : [],
          socialNote: parts[7] || ''
        };
      } else if (parts.length >= 9) {
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: parts[5] || '',
          avatar: parts[6] || '',
          greetings: parts[7] ? parts[7].split(',').filter(g => g.trim()) : [],
          socialNote: parts[8] || ''
        };
      } else {
        throw new Error(`Invalid pipe format: ${parts.length} parts`);
      }
      
      return { data: parsedData };
    } catch (error) {
      console.log('[LegacyAdapter] Pipe format parsing failed:', error.message);
      return null;
    }
  }
  
  /**
   * 解析 Legacy 格式
   */
  parseLegacyFormat(dataParam) {
    try {
      const decoded = atob(dataParam);
      const jsonData = JSON.parse(decoded);
      
      if (jsonData.data && jsonData.data.name) {
        return jsonData;
      }
      
      throw new Error('Invalid legacy format');
    } catch (error) {
      console.log('[LegacyAdapter] Legacy format parsing failed:', error.message);
      return null;
    }
  }
  
  /**
   * 解析 NFC URL 資料
   */
  parseNFCUrl(url) {
    try {
      const urlObj = new URL(url);
      const data = urlObj.searchParams.get('data') || urlObj.searchParams.get('c');
      
      if (!data) return null;
      
      return this.parseCardData(data);
    } catch (error) {
      console.error('[LegacyAdapter] Parse NFC URL failed:', error);
      return null;
    }
  }

  /**
   * 生成名片 URL
   */
  generateCardUrl(cardData, cardType) {
    try {
      if (this.bilingualCommon?.generateCardUrl) {
        return this.bilingualCommon.generateCardUrl(cardData, cardType);
      }
      
      return this.fallbackGenerateCardUrl(cardData, cardType);
    } catch (error) {
      console.error('[LegacyAdapter] Generate card URL failed:', error);
      throw error;
    }
  }

  /**
   * 編碼名片資料
   */
  encodeCardData(cardData) {
    try {
      if (this.bilingualCommon?.encodeCardData) {
        return this.bilingualCommon.encodeCardData(cardData);
      }
      
      return this.fallbackEncodeCardData(cardData);
    } catch (error) {
      console.error('[LegacyAdapter] Encode card data failed:', error);
      throw error;
    }
  }

  /**
   * 檢測名片類型
   */
  detectCardType(cardData) {
    try {
      if (this.bilingualCommon?.detectCardType) {
        return this.bilingualCommon.detectCardType(cardData);
      }
      
      return this.fallbackDetectCardType(cardData);
    } catch (error) {
      console.error('[LegacyAdapter] Detect card type failed:', error);
      return 'personal';
    }
  }

  // 備用實作方法

  /**
   * 解析緊湊格式資料 - 修復 Base64 解析
   */
  parseCompactFormat(data) {
    try {
      // 使用與 bilingual-common.js 相同的解碼邏輯
      const padding = '='.repeat((4 - data.length % 4) % 4);
      const compact = decodeURIComponent(atob(
        data.replace(/-/g, '+').replace(/_/g, '/') + padding
      ));
      
      const parts = compact.split('|');
      
      // 檢查是否為舊版本格式（8個欄位，沒有手機號碼）
      let parsedData;
      if (parts.length === 8) {
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: '', // 舊版本沒有手機號碼
          avatar: parts[5] || '',
          greetings: parts[6] ? parts[6].split(',') : [],
          socialNote: parts[7] || ''
        };
      } else {
        // 新版本格式（9個欄位，包含手機號碼）
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: parts[5] || '',
          avatar: parts[6] || '',
          greetings: parts[7] ? parts[7].split(',') : [],
          socialNote: parts[8] || ''
        };
      }
      
      console.log('[LegacyAdapter] Parsed compact data:', parsedData);
      return parsedData;
    } catch (error) {
      console.error('[LegacyAdapter] Parse compact format failed:', error);
      console.error('[LegacyAdapter] Raw data:', data);
      return null;
    }
  }
  
  /**
   * 轉換精簡格式為完整格式（優化版本）- 與 app.js 完全相同
   */
  convertCompactToFull(compactData) {
    // 預設為延平大樓，後續由 detectCardType 自動識別修正
    return {
      data: {
        name: compactData.n || '',
        title: compactData.t || '',
        department: compactData.d || '',
        organization: compactData.o || '數位發展部',
        email: compactData.e || '',
        phone: compactData.p || '',
        mobile: compactData.m || '',
        avatar: compactData.a || '',
        address: compactData.addr || '100057臺北市中正區延平南路143號',
        greetings: compactData.g || ['歡迎認識我！'],
        socialLinks: {
          email: compactData.e ? `mailto:${compactData.e}` : '',
          socialNote: compactData.s || ''
        }
      }
    };
  }
  

  

  
  /**
   * 備用：解析 URL 資料
   */
  fallbackParseUrlData(data) {
    return this.parseCompactFormat(data);
  }

  /**
   * 備用：編碼名片資料
   */
  fallbackEncodeCardData(cardData) {
    try {
      const jsonString = JSON.stringify(cardData);
      const encoded = btoa(jsonString);
      return encodeURIComponent(encoded);
    } catch (error) {
      console.error('[LegacyAdapter] Fallback encode card data failed:', error);
      throw error;
    }
  }

  /**
   * 備用：生成名片 URL
   */
  fallbackGenerateCardUrl(cardData, cardType) {
    try {
      const encodedData = this.fallbackEncodeCardData(cardData);
      const baseUrl = window.location.origin;
      
      // 根據類型選擇對應的頁面
      const pageMap = {
        'gov-yp': '/index.html',
        'gov-sg': '/index1.html',
        'personal': '/index-personal.html',
        'bilingual': '/index-bilingual.html',
        'personal-bilingual': '/index-bilingual-personal.html',
        'en': '/index-en.html',
        'personal-en': '/index-personal-en.html',
        'gov-yp-en': '/index-en.html',
        'gov-sg-en': '/index1-en.html'
      };

      const page = pageMap[cardType] || '/index-personal.html';
      return `${baseUrl}${page}?data=${encodedData}`;
    } catch (error) {
      console.error('[LegacyAdapter] Fallback generate card URL failed:', error);
      throw error;
    }
  }

  /**
   * 備用：檢測名片類型
   */
  fallbackDetectCardType(cardData) {
    // 檢查是否為雙語名片
    if (cardData.name && cardData.name.includes('~')) {
      if (this.isGovernmentCard(cardData)) {
        return 'bilingual';
      }
      return 'personal-bilingual';
    }

    // 檢查是否為英文版本
    if (this.isEnglishCard(cardData)) {
      if (this.isGovernmentCard(cardData)) {
        if (cardData.address && cardData.address.includes('Songren')) {
          return 'gov-sg-en';
        }
        return 'gov-yp-en';
      }
      return 'personal-en';
    }

    // 檢查是否為政府機關版本
    if (this.isGovernmentCard(cardData)) {
      if (cardData.address && (cardData.address.includes('新光') || cardData.address.includes('松仁路'))) {
        return 'gov-sg';
      }
      return 'gov-yp';
    }

    return 'personal';
  }

  /**
   * 檢查是否為政府機關名片
   */
  isGovernmentCard(cardData) {
    const govIndicators = [
      '數位發展部',
      'Ministry of Digital Affairs',
      'moda',
      '延平南路143號',
      '松仁路99號',
      'Yanping S. Rd.',
      'Songren Rd.'
    ];

    const textToCheck = [
      cardData.organization,
      cardData.department,
      cardData.address,
      cardData.email
    ].filter(Boolean).join(' ').toLowerCase();

    return govIndicators.some(indicator => 
      textToCheck.includes(indicator.toLowerCase())
    );
  }

  /**
   * 檢查是否為英文名片
   */
  isEnglishCard(cardData) {
    // 檢查組織名稱
    if (cardData.organization && cardData.organization.includes('Ministry of Digital Affairs')) {
      return true;
    }

    // 檢查地址格式
    if (cardData.address && /\d+\s+\w+\s+(Rd\.|St\.|Ave\.)/.test(cardData.address)) {
      return true;
    }

    // 檢查姓名是否主要為英文
    if (cardData.name && /^[A-Za-z\s\-\.]+$/.test(cardData.name)) {
      return true;
    }

    return false;
  }

  /**
   * 備用：驗證名片資料
   */
  fallbackValidateCardData(cardData) {
    if (!cardData || typeof cardData !== 'object') {
      return false;
    }

    // 檢查必要欄位
    if (!cardData.name || typeof cardData.name !== 'string') {
      return false;
    }

    // 檢查電子郵件格式（如果有的話）
    if (cardData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardData.email)) {
      return false;
    }

    return true;
  }

  /**
   * 轉換舊格式資料到新格式
   */
  convertLegacyData(legacyData) {
    try {
      // 如果已經是新格式，直接返回
      if (legacyData.version || legacyData.data) {
        return legacyData;
      }

      // 轉換舊格式到新格式
      const convertedData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: { ...legacyData }
      };

      // 處理特殊欄位
      if (legacyData.socialLinks) {
        convertedData.data.socialNote = this.convertSocialLinks(legacyData.socialLinks);
        delete convertedData.data.socialLinks;
      }

      return convertedData;
    } catch (error) {
      console.error('[LegacyAdapter] Convert legacy data failed:', error);
      return legacyData;
    }
  }

  /**
   * 轉換社群連結格式
   */
  convertSocialLinks(socialLinks) {
    if (!socialLinks || typeof socialLinks !== 'object') {
      return '';
    }

    const notes = [];
    
    if (socialLinks.facebook) {
      notes.push(`FB: ${socialLinks.facebook}`);
    }
    
    if (socialLinks.instagram) {
      notes.push(`IG: ${socialLinks.instagram}`);
    }
    
    if (socialLinks.line) {
      notes.push(`LINE: ${socialLinks.line}`);
    }
    
    if (socialLinks.twitter) {
      notes.push(`Twitter: ${socialLinks.twitter}`);
    }

    return notes.join('\n');
  }

  /**
   * 獲取適配器狀態
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasBilingualCommon: !!this.bilingualCommon,
      availableMethods: this.bilingualCommon ? Object.keys(this.bilingualCommon) : []
    };
  }

  /**
   * 測試適配器功能
   */
  async testAdapter() {
    const testResults = {
      parseUrlData: false,
      encodeCardData: false,
      generateCardUrl: false,
      detectCardType: false
    };

    try {
      // 測試資料
      const testCardData = {
        name: '測試使用者',
        title: '測試職稱',
        email: 'test@example.com',
        organization: '數位發展部'
      };

      // 測試編碼
      const encoded = this.encodeCardData(testCardData);
      testResults.encodeCardData = !!encoded;

      // 測試解碼
      const decoded = this.fallbackParseUrlData(encoded);
      testResults.parseUrlData = decoded && decoded.name === testCardData.name;

      // 測試 URL 生成
      const url = this.generateCardUrl(testCardData, 'gov-yp');
      testResults.generateCardUrl = url && url.includes('data=');

      // 測試類型檢測
      const cardType = this.detectCardType(testCardData);
      testResults.detectCardType = cardType === 'gov-yp';

      console.log('[LegacyAdapter] Test results:', testResults);
      return testResults;
    } catch (error) {
      console.error('[LegacyAdapter] Test failed:', error);
      return testResults;
    }
  }
}

// 建立全域實例
const legacyAdapter = new LegacyAdapter();
window.legacyAdapter = legacyAdapter;

// 匯出供其他模組使用
window.LegacyAdapter = LegacyAdapter;