/**
 * PWA 名片管理器
 * 負責名片的業務邏輯處理、類型識別和資料轉換
 */

class PWACardManager {
  constructor(storage) {
    this.storage = storage;
    this.cardTypes = {
      'gov-yp': {
        name: '機關版-延平大樓',
        organization: '數位發展部',
        address: '臺北市中正區延平南路143號',
        logo: true,
        template: 'government'
      },
      'gov-sg': {
        name: '機關版-新光大樓',
        organization: '數位發展部',
        address: '臺北市信義區松仁路99號',
        logo: true,
        template: 'government'
      },
      'personal': {
        name: '個人版',
        organization: null,
        address: null,
        logo: false,
        template: 'personal'
      },
      'bilingual': {
        name: '雙語版',
        organization: '數位發展部',
        address: '臺北市中正區延平南路143號',
        logo: true,
        template: 'bilingual'
      },
      'personal-bilingual': {
        name: '個人雙語版',
        organization: null,
        address: null,
        logo: false,
        template: 'personal-bilingual'
      },
      'en': {
        name: 'English Version',
        organization: 'Ministry of Digital Affairs',
        address: '143 Yanping S. Rd., Zhongzheng Dist., Taipei City',
        logo: true,
        template: 'english'
      },
      'personal-en': {
        name: 'Personal English',
        organization: null,
        address: null,
        logo: false,
        template: 'personal-english'
      },
      'gov-yp-en': {
        name: 'Government English - Yanping',
        organization: 'Ministry of Digital Affairs',
        address: '143 Yanping S. Rd., Zhongzheng Dist., Taipei City',
        logo: true,
        template: 'government-english'
      },
      'gov-sg-en': {
        name: 'Government English - Xinyi',
        organization: 'Ministry of Digital Affairs',
        address: '99 Songren Rd., Xinyi Dist., Taipei City',
        logo: true,
        template: 'government-english'
      }
    };
  }

  async initialize() {
    console.log('[CardManager] Initializing...');
    
    if (!this.storage) {
      throw new Error('Storage instance required');
    }
    
    // 載入現有的 bilingual-common.js 功能
    await this.loadBilingualSupport();
    
    console.log('[CardManager] Initialized successfully');
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
      
      console.log('[CardManager] Bilingual support loaded with translations');
    } catch (error) {
      console.error('[CardManager] Failed to load bilingual support:', error);
    }
  }

  /**
   * 自動識別名片類型 - 支援 9 種類型
   * 完全相容兩大生成器的所有輸出格式
   * @param {Object} cardData - 名片資料
   * @returns {string} 名片類型
   */
  detectCardType(cardData) {
    try {
      console.log('[CardManager] Detecting card type for:', cardData);
      
      const isGov = this.isGovernmentCard(cardData);
      const isEn = this.isEnglishCard(cardData);
      const isBilingual = this.isBilingualCard(cardData);
      const isShinGuang = this.isShinGuangBuilding(cardData);
      
      console.log('[CardManager] Detection flags:', { isGov, isEn, isBilingual, isShinGuang });
      
      // 雙語版本判斷（最高優先級）
      if (isBilingual) {
        if (isGov) {
          const type = isShinGuang ? 'gov-sg-bilingual' : 'gov-yp-bilingual';
          console.log('[CardManager] Detected bilingual government type:', type);
          return type;
        }
        console.log('[CardManager] Detected personal bilingual type');
        return 'personal-bilingual';
      }
      
      // 英文版本判斷（中優先級）
      if (isEn) {
        if (isGov) {
          const type = isShinGuang ? 'gov-sg-en' : 'gov-yp-en';
          console.log('[CardManager] Detected English government type:', type);
          return type;
        }
        console.log('[CardManager] Detected personal English type');
        return 'personal-en';
      }
      
      // 中文版本判斷（基礎優先級）
      if (isGov) {
        const type = isShinGuang ? 'gov-sg' : 'gov-yp';
        console.log('[CardManager] Detected Chinese government type:', type);
        return type;
      }
      
      console.log('[CardManager] Detected personal type');
      return 'personal';
    } catch (error) {
      console.error('[CardManager] Card type detection failed:', error);
      return 'personal';
    }
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

    const textToCheck = [
      cardData.organization,
      cardData.department,
      cardData.address,
      cardData.email,
      cardData.name,
      cardData.title
    ].filter(Boolean).join(' ').toLowerCase();

    const isGov = govIndicators.some(indicator => 
      textToCheck.includes(indicator.toLowerCase())
    );
    
    if (isGov) {
      console.log('[CardManager] Detected government card from indicators:', textToCheck);
    }
    
    return isGov;
  }

  /**
   * 檢查是否為雙語名片
   */
  isBilingualCard(cardData) {
    // 檢查姓名是否包含 ~ 分隔符
    if (cardData.name && cardData.name.includes('~')) {
      console.log('[CardManager] Detected bilingual from name:', cardData.name);
      return true;
    }
    
    // 檢查職稱是否包含 ~ 分隔符
    if (cardData.title && cardData.title.includes('~')) {
      console.log('[CardManager] Detected bilingual from title:', cardData.title);
      return true;
    }
    
    // 檢查問候語是否為雙語格式
    if (cardData.greetings && Array.isArray(cardData.greetings)) {
      const hasBilingualGreeting = cardData.greetings.some(greeting => {
        if (typeof greeting === 'object' && greeting.zh && greeting.en) {
          return true;
        }
        if (typeof greeting === 'string' && greeting.includes('~')) {
          return true;
        }
        return false;
      });
      
      if (hasBilingualGreeting) {
        console.log('[CardManager] Detected bilingual from greetings');
        return true;
      }
    }
    
    // 檢查來源 URL 是否為雙語版本
    if (typeof window !== 'undefined' && window.location) {
      const isBilingualUrl = window.location.pathname.includes('bilingual');
      if (isBilingualUrl) {
        console.log('[CardManager] Detected bilingual from URL path');
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
    if (cardData.organization && cardData.organization.includes('Ministry of Digital Affairs')) {
      console.log('[CardManager] Detected English from organization:', cardData.organization);
      return true;
    }

    // 檢查地址格式
    if (cardData.address && /\d+\s+\w+\s+(Rd\.|St\.|Ave\.)/.test(cardData.address)) {
      console.log('[CardManager] Detected English from address format:', cardData.address);
      return true;
    }

    // 檢查姓名是否主要為英文（不包含雙語格式）
    if (cardData.name && /^[A-Za-z\s\-\.]+$/.test(cardData.name) && !cardData.name.includes('~')) {
      console.log('[CardManager] Detected English from name format:', cardData.name);
      return true;
    }
    
    // 檢查來源 URL 是否為英文版本
    if (typeof window !== 'undefined' && window.location) {
      const isEnglishUrl = window.location.pathname.includes('-en.html') || 
                          window.location.pathname.includes('/en/');
      if (isEnglishUrl) {
        console.log('[CardManager] Detected English from URL path');
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
    if (cardData.address) {
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
        console.log('[CardManager] Detected Shin Guang building from address:', cardData.address);
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
        console.log('[CardManager] Detected Shin Guang building from URL path');
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
    if (detectedType.includes('bilingual')) {
      return this.processBilingualData(enhancedData);
    }

    return enhancedData;
  }

  /**
   * 處理雙語資料
   */
  processBilingualData(cardData) {
    const processed = { ...cardData };

    // 處理雙語姓名
    if (processed.name && processed.name.includes('~')) {
      const [chinese, english] = processed.name.split('~');
      processed.nameZh = chinese.trim();
      processed.nameEn = english.trim();
    }

    // 處理雙語職稱
    if (processed.title && processed.title.includes('~')) {
      const [chinese, english] = processed.title.split('~');
      processed.titleZh = chinese.trim();
      processed.titleEn = english.trim();
    }

    // 處理雙語問候語
    if (processed.greetings && Array.isArray(processed.greetings)) {
      processed.greetings = processed.greetings.map(greeting => {
        if (greeting.includes('~')) {
          const [chinese, english] = greeting.split('~');
          return {
            zh: chinese.trim(),
            en: english.trim()
          };
        }
        return greeting;
      });
    }

    return processed;
  }

  /**
   * 從 URL 匯入名片
   */
  async importFromUrl(url) {
    try {
      console.log('[CardManager] Importing from URL:', url);

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
      console.error('[CardManager] UTF-8 URL parsing failed:', error);
      return null;
    }
  }

  /**
   * 從檔案匯入名片
   */
  async importFromFile(file) {
    try {
      console.log('[CardManager] Importing from file:', file.name);

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
      console.log('[CardManager] Exporting cards with options:', options);

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
      console.log('[CardManager] PWA-09A: Starting QR code generation with original generator logic');
      
      const card = await this.storage.getCard(cardId);
      if (!card) {
        throw new Error('名片不存在');
      }

      // 使用原生成器邏輯生成 URL
      const cardUrl = this.generateCardUrl(card.data, card.type);
      console.log('[CardManager] Generated QR URL:', cardUrl, 'Length:', cardUrl.length);
      
      // 檢查 URL 長度（使用更寬鬆的限制，因為原生成器已經過優化）
      if (cardUrl.length > 2500) {
        console.warn('[CardManager] URL too long for QR code:', cardUrl.length);
        return {
          success: false,
          error: `URL 太長（${cardUrl.length} 字元），請減少資料內容`
        };
      }
      
      // 優先使用統一 QR 工具
      if (window.qrUtils) {
        console.log('[CardManager] Using unified QR utils');
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
          console.warn('[CardManager] Unified QR utils failed, trying fallback:', result.error);
        }
      }
      
      // 備用方案：直接使用 QRCode.js（與原生成器一致）
      if (window.QRCode) {
        console.log('[CardManager] Using QRCode.js fallback');
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
   * 生成名片 URL - PWA-09A 修復：直接使用原生成器的 encodeCompact 函數
   */
  generateCardUrl(cardData, cardType) {
    try {
      console.log('[CardManager] PWA-09A: Using original generator logic');
      
      // 檢測是否為雙語版本
      const isBilingual = cardType.includes('bilingual') || this.isBilingualCard(cardData);
      
      if (isBilingual) {
        // 使用雙語生成器的完全相同邏輯
        return this.generateBilingualUrl(cardData, cardType);
      } else {
        // 使用標準生成器的完全相同邏輯
        return this.generateStandardUrl(cardData, cardType);
      }
    } catch (error) {
      console.error('[CardManager] URL generation failed:', error);
      throw error;
    }
  }
  
  /**
   * 使用標準生成器的完全相同邏輯（nfc-generator.html）
   */
  generateStandardUrl(cardData, cardType) {
    console.log('[CardManager] Using standard generator logic');
    
    // 完全複製 nfc-generator.html 的邏輯
    const compactData = {
      n: cardData.name || '',
      t: cardData.title || '',
      d: cardData.department || '',
      e: cardData.email || '',
      p: cardData.phone || '',
      m: cardData.mobile || '',
      a: cardData.avatar || '',
      g: Array.isArray(cardData.greetings) ? cardData.greetings : [],
      s: cardData.socialNote || ''
    };
    
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
   */
  generateBilingualUrl(cardData, cardType) {
    console.log('[CardManager] Using bilingual generator logic - PIPE FORMAT');
    console.log('[CardManager] Input cardData:', cardData);
    
    // 處理 greetings 格式，確保能還原雙語格式
    let greetingsArray = [];
    if (Array.isArray(cardData.greetings)) {
      greetingsArray = cardData.greetings.map(g => {
        if (typeof g === 'string') {
          return g;
        } else if (g && typeof g === 'object' && g.zh && g.en) {
          // 將物件格式轉回雙語字串格式
          return `${g.zh}~${g.en}`;
        } else if (g && typeof g === 'object' && g.zh) {
          return g.zh;
        } else if (g && typeof g === 'object' && g.en) {
          return g.en;
        }
        return String(g || '');
      }).filter(g => g && g.trim());
    } else if (typeof cardData.greetings === 'string') {
      greetingsArray = [cardData.greetings];
    } else if (cardData.greetings && typeof cardData.greetings === 'object') {
      if (cardData.greetings.zh && cardData.greetings.en) {
        greetingsArray = [`${cardData.greetings.zh}~${cardData.greetings.en}`];
      } else {
        const values = Object.values(cardData.greetings).filter(v => v && typeof v === 'string');
        greetingsArray = values.length > 0 ? values : ['歡迎認識我！'];
      }
    }
    
    if (greetingsArray.length === 0) {
      greetingsArray = ['歡迎認識我！'];
    }
    
    console.log('[CardManager] Processed greetings:', greetingsArray);
    
    // 使用與 bilingual-common.js 中 encodeCompact 完全相同的管道分隔格式
    const compact = [
      cardData.name || '',
      cardData.title || '',
      cardData.department || '',
      cardData.email || '',
      cardData.phone || '',
      cardData.mobile || '',
      cardData.avatar || '',
      greetingsArray.join(','),
      cardData.socialNote || ''
    ].join('|');
    
    console.log('[CardManager] Compact data:', compact);
    
    // 使用與雙語生成器完全相同的編碼方式
    const encoded = btoa(encodeURIComponent(compact))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    console.log('[CardManager] Encoded data:', encoded);
    
    return this.buildBilingualUrl(encoded, cardType);
  }
  
  /**
   * 建立標準生成器 URL（與 nfc-generator.html 一致）
   */
  buildStandardUrl(encoded, cardType) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/pwa-card-storage.*$/, '');
    let targetPage;
    
    if (cardType === 'personal' || cardType === 'personal-en') {
      targetPage = cardType === 'personal-en' ? 'index-personal-en.html' : 'index-personal.html';
    } else {
      const isShinGuang = cardType.includes('sg') || cardType.includes('新光');
      if (cardType.includes('en')) {
        targetPage = isShinGuang ? 'index1-en.html' : 'index-en.html';
      } else {
        targetPage = isShinGuang ? 'index1.html' : 'index.html';
      }
    }
    
    // 使用與原生成器完全相同的 URL 編碼方式
    const url = `${baseUrl}${targetPage}?c=${encodeURIComponent(encoded)}`;
    console.log(`[CardManager] Standard URL generated, length: ${url.length}`);
    return url;
  }
  
  /**
   * 建立雙語生成器 URL（與 nfc-generator-bilingual.html 一致）
   */
  buildBilingualUrl(encoded, cardType) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/pwa-card-storage.*$/, '');
    let targetPage;
    
    if (cardType === 'personal-bilingual') {
      targetPage = 'index-bilingual-personal.html';
    } else if (cardType.includes('sg') || cardType.includes('新光')) {
      targetPage = 'index1-bilingual.html';
    } else {
      targetPage = 'index-bilingual.html';
    }
    
    // 使用與雙語生成器完全相同的 URL 編碼方式
    const url = `${baseUrl}${targetPage}?data=${encodeURIComponent(encoded)}`;
    console.log(`[CardManager] Bilingual URL generated, length: ${url.length}`);
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
   * 獲取顯示名稱
   */
  getDisplayName(cardData, language = 'zh') {
    if (cardData.nameZh && cardData.nameEn) {
      return language === 'en' ? cardData.nameEn : cardData.nameZh;
    }
    
    if (cardData.name && cardData.name.includes('~')) {
      const [chinese, english] = cardData.name.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.name || '';
  }

  /**
   * 獲取顯示職稱
   */
  getDisplayTitle(cardData, language = 'zh') {
    if (cardData.titleZh && cardData.titleEn) {
      return language === 'en' ? cardData.titleEn : cardData.titleZh;
    }
    
    if (cardData.title && cardData.title.includes('~')) {
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
      console.log('[CardManager] Adding card:', cardData);
      
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
   * 預處理名片資料，確保問候語格式正確
   */
  preprocessCardData(cardData) {
    const processed = { ...cardData };
    
    // 使用 BilingualBridge 處理問候語
    if (window.bilingualBridge && typeof window.bilingualBridge.normalizeGreetings === 'function') {
      processed.greetings = window.bilingualBridge.normalizeGreetings(cardData.greetings, 'zh');
    } else {
      processed.greetings = this.fallbackNormalizeGreetings(cardData.greetings, 'zh');
    }
    
    console.log('[CardManager] Preprocessed card data:', {
      originalGreetings: cardData.greetings,
      processedGreetings: processed.greetings
    });
    
    return processed;
  }

  /**
   * 列出名片 - 修復問候語顯示
   */
  async listCards(filter = {}) {
    const cards = await this.storage.listCards(filter);
    
    // 後處理每張名片的問候語格式
    return cards.map(card => {
      if (card.data && card.data.greetings) {
        const processedCard = { ...card };
        processedCard.data = { ...card.data };
        
        // 使用 BilingualBridge 標準化問候語
        if (window.bilingualBridge && typeof window.bilingualBridge.normalizeGreetings === 'function') {
          processedCard.data.greetings = window.bilingualBridge.normalizeGreetings(card.data.greetings, 'zh');
        } else {
          processedCard.data.greetings = this.fallbackNormalizeGreetings(card.data.greetings, 'zh');
        }
        
        return processedCard;
      }
      return card;
    });
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
   * 獲取選中的名片 - 修復問候語顯示
   */
  async getSelectedCards(cardIds) {
    if (!cardIds || cardIds.length === 0) {
      return [];
    }

    const cards = [];
    for (const cardId of cardIds) {
      const card = await this.storage.getCard(cardId);
      if (card) {
        // 修復問候語格式
        const processedCard = { ...card };
        if (card.data && card.data.greetings) {
          processedCard.data = { ...card.data };
          if (window.bilingualBridge && typeof window.bilingualBridge.normalizeGreetings === 'function') {
            processedCard.data.greetings = window.bilingualBridge.normalizeGreetings(card.data.greetings, 'zh');
          } else {
            processedCard.data.greetings = this.fallbackNormalizeGreetings(card.data.greetings, 'zh');
          }
        }
        cards.push(processedCard);
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
    if (cardData.nameZh && cardData.nameEn) {
      return language === 'en' ? cardData.nameEn : cardData.nameZh;
    }
    
    if (cardData.name && cardData.name.includes('~')) {
      const [chinese, english] = cardData.name.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    return cardData.name || '';
  }

  getBilingualTitle(cardData, language = 'zh') {
    if (cardData.titleZh && cardData.titleEn) {
      return language === 'en' ? cardData.titleEn : cardData.titleZh;
    }
    
    if (cardData.title && cardData.title.includes('~')) {
      const [chinese, english] = cardData.title.split('~');
      return language === 'en' ? english.trim() : chinese.trim();
    }
    
    if (language === 'en' && cardData.title) {
      return this.translateText(cardData.title, 'titles', 'en');
    }
    
    return cardData.title || '';
  }

  getBilingualCardData(cardData, language = 'zh') {
    // 使用 BilingualBridge 的標準化方法處理問候語
    let processedGreetings = [];
    
    if (window.bilingualBridge && typeof window.bilingualBridge.normalizeGreetings === 'function') {
      processedGreetings = window.bilingualBridge.normalizeGreetings(cardData.greetings, language);
    } else {
      // 備用方案：本地處理
      processedGreetings = this.fallbackNormalizeGreetings(cardData.greetings, language);
    }
    
    console.log('[CardManager] Processed greetings:', {
      original: cardData.greetings,
      processed: processedGreetings,
      language
    });
    
    return {
      name: this.getBilingualName(cardData, language),
      title: this.getBilingualTitle(cardData, language),
      department: language === 'en' ? this.translateText(cardData.department, 'departments', 'en') : cardData.department,
      organization: language === 'en' ? this.translateText(cardData.organization, 'organizations', 'en') : cardData.organization,
      address: language === 'en' ? this.translateText(cardData.address, 'addresses', 'en') : cardData.address,
      email: cardData.email || '',
      phone: cardData.phone || '',
      mobile: cardData.mobile || '',
      avatar: cardData.avatar || '',
      greetings: processedGreetings,
      socialNote: cardData.socialNote || ''
    };
  }

  /**
   * 備用的問候語標準化方法
   */
  fallbackNormalizeGreetings(greetings, language = 'zh') {
    if (!greetings) {
      return ['歡迎認識我！'];
    }
    
    let processedGreetings = [];
    
    if (Array.isArray(greetings)) {
      processedGreetings = greetings
        .map(g => this.processGreetingItem(g, language))
        .filter(g => g && typeof g === 'string' && g.trim().length > 0);
    } else if (typeof greetings === 'object' && greetings !== null) {
      // 處理物件格式的 greetings
      if (greetings.zh || greetings.en) {
        const targetGreetings = greetings[language] || greetings.zh || greetings.en;
        if (Array.isArray(targetGreetings)) {
          processedGreetings = targetGreetings
            .map(g => this.processGreetingItem(g, language))
            .filter(g => g && typeof g === 'string');
        } else if (typeof targetGreetings === 'string') {
          const processed = this.processGreetingItem(targetGreetings, language);
          if (processed) processedGreetings = [processed];
        }
      } else {
        // 提取所有字串值
        const values = Object.values(greetings)
          .map(v => this.processGreetingItem(v, language))
          .filter(v => v && typeof v === 'string');
        processedGreetings = values.length > 0 ? values : [];
      }
    } else if (typeof greetings === 'string') {
      const processed = this.processGreetingItem(greetings, language);
      if (processed) processedGreetings = [processed];
    }
    
    // 確保至少有一個問候語
    if (processedGreetings.length === 0) {
      processedGreetings = ['歡迎認識我！'];
    }
    
    return processedGreetings;
  }

  /**
   * 處理單個問候語項目
   */
  processGreetingItem(greeting, language) {
    if (!greeting) return null;
    
    if (typeof greeting === 'string') {
      // 處理雙語格式 "中文~English"
      if (greeting.includes('~')) {
        const [chinese, english] = greeting.split('~');
        return language === 'en' ? english.trim() : chinese.trim();
      }
      return greeting.trim();
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      // 處理物件格式 {zh: "中文", en: "English"}
      if (greeting.zh || greeting.en) {
        const target = greeting[language] || greeting.zh || greeting.en;
        return typeof target === 'string' ? target.trim() : null;
      }
      
      // 嘗試提取第一個字串值
      const firstStringValue = Object.values(greeting)
        .find(v => v && typeof v === 'string');
      return firstStringValue ? firstStringValue.trim() : null;
    }
    
    return null;
  }
}

// 確保類別正確導出到全域
window.PWACardManager = PWACardManager;

console.log('[CardManager] PWACardManager class exported to global scope');