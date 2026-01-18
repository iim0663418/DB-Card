class PWAIntegration {
  constructor() {
    this.STORAGE_KEY = 'pwa_card_source_url';
    this.TEMP_DATA_KEY = 'pwa_temp_card_data';
    this.EXPIRY_TIME = 30 * 60 * 1000; // 30分鐘
  }

  storeSourceContext(originalUrl, cardData) {
    try {
      const context = {
        sourceUrl: originalUrl,
        timestamp: Date.now(),
        cardData: cardData,
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };
      
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(context));
      sessionStorage.setItem(this.TEMP_DATA_KEY, JSON.stringify(cardData));
      
      return true;
    } catch (error) {
      console.error('[PWA Integration] 暫存失敗:', error);
      return false;
    }
  }

  getSourceContext() {
    try {
      const contextStr = sessionStorage.getItem(this.STORAGE_KEY);
      if (!contextStr) return null;
      
      const context = JSON.parse(contextStr);
      
      // PWA-38: 檢查是否過期，但不自動清除（由手動控制）
      if (Date.now() - context.timestamp > this.EXPIRY_TIME) {
        // 不自動清除，讓手動控制
        return null;
      }
      
      return context;
    } catch (error) {
      console.error('[PWA Integration] 讀取暫存失敗:', error);
      return null;
    }
  }

  clearSourceContext() {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.TEMP_DATA_KEY);
    } catch (error) {
      console.warn('[PWA Integration] 清除暫存失敗:', error);
    }
  }

  // 新增：手動清除方法
  manualClearContext() {
    this.clearSourceContext();
  }

  identifyCardTypeEnhanced(data) {
    const sourceContext = this.getSourceContext();
    
    // 只使用暫存的來源 URL 識別
    if (sourceContext?.sourceUrl) {
      const typeFromUrl = this.parseTypeFromUrl(sourceContext.sourceUrl);
      if (typeFromUrl) {
        // 不清除暫存！讓 App.js 控制清除時機
        return typeFromUrl;
      }
    }

    // 如果沒有暫存 URL，返回 null 讓其他系統處理
    return null;
  }

  parseTypeFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const urlLower = url.toLowerCase().trim();
    
    // 處理 PWA 頁面 URL，嘗試從參數中解析
    if (urlLower.includes('pwa-card-storage')) {
      return this.parseTypeFromPWAUrl(url);
    }
    
    // 精確匹配名片頁面（含 .html）
    if (urlLower.includes('index-bilingual-personal.html')) return 'personal-bilingual';
    if (urlLower.includes('index1-bilingual.html')) return 'bilingual1';
    if (urlLower.includes('index-bilingual.html')) return 'bilingual';
    if (urlLower.includes('index-personal-en.html')) return 'personal-en';
    if (urlLower.includes('index1-en.html')) return 'en1';
    if (urlLower.includes('index-en.html')) return 'en';
    if (urlLower.includes('index-personal.html')) return 'personal';
    if (urlLower.includes('index1.html')) return 'index1';
    if (urlLower.includes('index.html')) return 'index';
    
    // 處理不帶 .html 的 URL
    if (urlLower.includes('index-bilingual-personal?') || urlLower.includes('index-bilingual-personal&') || urlLower.endsWith('index-bilingual-personal')) return 'personal-bilingual';
    if (urlLower.includes('index1-bilingual?') || urlLower.includes('index1-bilingual&') || urlLower.endsWith('index1-bilingual')) return 'bilingual1';
    if (urlLower.includes('index-bilingual?') || urlLower.includes('index-bilingual&') || urlLower.endsWith('index-bilingual')) return 'bilingual';
    
    return null;
  }

  parseTypeFromPWAUrl(url) {
    try {
      const urlObj = new URL(url);
      const cardParam = urlObj.searchParams.get('c') || urlObj.searchParams.get('data');
      
      if (cardParam) {
        // 嘗試多種解碼方式
        const decodedData = this.safeDecodeCardData(cardParam);
        if (decodedData && decodedData.url) {
          return this.parseTypeFromUrl(decodedData.url);
        }
      }
      
      // 檢查 hash 參數
      if (urlObj.hash) {
        if (urlObj.hash.startsWith('#c=')) {
          const hashData = urlObj.hash.substring(3);
          const decodedData = this.safeDecodeCardData(hashData);
          if (decodedData && decodedData.url) {
            return this.parseTypeFromUrl(decodedData.url);
          }
        }
      }
    } catch (error) {
      console.warn('[PWA Integration] PWA URL 解析失敗:', error);
    }
    
    return null;
  }

  // 安全解碼名片資料，支援多種編碼格式
  safeDecodeCardData(encodedData) {
    if (!encodedData) return null;
    
    // 方法1: 直接 Base64 解碼
    try {
      const decoded = atob(encodedData);
      const jsonData = JSON.parse(decodeURIComponent(decoded));
      return jsonData;
    } catch (error) {
      // 繼續嘗試其他方法
    }
    
    // 方法2: URL 解碼 + Base64 解碼
    try {
      const urlDecoded = decodeURIComponent(encodedData);
      const base64Decoded = atob(urlDecoded);
      const jsonData = JSON.parse(decodeURIComponent(base64Decoded));
      return jsonData;
    } catch (error) {
      // 繼續嘗試其他方法
    }
    
    // 方法3: 雙層 URL 解碼 + Base64
    try {
      const doubleDecoded = decodeURIComponent(decodeURIComponent(encodedData));
      const base64Decoded = atob(doubleDecoded);
      const jsonData = JSON.parse(base64Decoded);
      return jsonData;
    } catch (error) {
      // 繼續嘗試其他方法
    }
    
    // 方法4: 直接 JSON 解析（備用）
    try {
      const jsonData = JSON.parse(decodeURIComponent(encodedData));
      return jsonData;
    } catch (error) {
      console.warn('[PWA Integration] 所有解碼方法均失敗:', error);
      return null;
    }
  }

  parseTypeFromReferrer() {
    if (typeof window === 'undefined' || !document.referrer) {
      return null;
    }
    
    const referrer = document.referrer;
    
    // 避免循環引用：如果 referrer 也是 PWA 頁面，則跳過
    if (referrer.includes('pwa-card-storage')) {
      return null;
    }
    
    return this.parseTypeFromUrl(referrer);
  }

  identifyByDataFeatures(data) {
    // 檢查雙語格式：字串格式 "zh~en" 或物件格式 {zh: '', en: ''}
    const isBilingual = 
      (typeof data.name === 'string' && data.name.includes('~')) ||
      (typeof data.title === 'string' && data.title.includes('~')) ||
      (typeof data.name === 'object' && data.name && data.name.zh && data.name.en) ||
      (typeof data.title === 'object' && data.title && data.title.zh && data.title.en);
      
    const isGov = data.organization && data.department;
    const isShinGuang = (typeof data.address === 'string') && 
                       (data.address.includes('新光') || data.address.includes('松仁路'));
    
    if (isBilingual) {
      return isGov ? (isShinGuang ? 'bilingual1' : 'bilingual') : 'personal-bilingual';
    }
    
    return isGov ? (isShinGuang ? 'index1' : 'index') : 'personal';
  }

  preparePWATransition(cardData, currentUrl) {
    // 確保暫存當前頁面的 URL
    this.storeSourceContext(currentUrl, cardData);
    
    const pwaUrl = this.buildPWAUrl(cardData);
    
    return {
      pwaUrl,
      success: true,
      message: '已準備 PWA 跳轉'
    };
  }

  buildPWAUrl(cardData) {
    const baseUrl = window.location.origin + '/pwa-card-storage/';
    const encodedData = btoa(encodeURIComponent(JSON.stringify(cardData)));
    return `${baseUrl}?c=${encodedData}`;
  }

  // 新增：手動觸發暫存（用於名片頁面的儲存按鈕）
  triggerContextStorage() {
    if (typeof window !== 'undefined' && window.location) {
      const currentUrl = window.location.href;
      
      // 檢查是否為名片頁面
      if (currentUrl.includes('index') && !currentUrl.includes('pwa-card-storage')) {
        // 手動觸發上下文暫存
        
        // 暫存當前 URL 作為來源
        const context = {
          sourceUrl: currentUrl,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          triggered: 'manual'
        };
        
        try {
          sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(context));
          return true;
        } catch (error) {
          console.error('[PWA Integration] 手動暫存失敗:', error);
          return false;
        }
      }
    }
    
    return false;
  }
}

window.PWAIntegration = new PWAIntegration();