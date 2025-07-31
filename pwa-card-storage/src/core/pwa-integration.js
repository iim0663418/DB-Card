class PWAIntegration {
  constructor() {
    this.STORAGE_KEY = 'pwa_card_source_url';
    this.TEMP_DATA_KEY = 'pwa_temp_card_data';
  }

  storeSourceContext(originalUrl, cardData) {
    try {
      const context = {
        sourceUrl: originalUrl,
        timestamp: Date.now(),
        cardData: cardData,
        userAgent: navigator.userAgent
      };
      
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(context));
      sessionStorage.setItem(this.TEMP_DATA_KEY, JSON.stringify(cardData));
      
      console.log('[PWA Integration] 已暫存來源 URL:', originalUrl);
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
      
      if (Date.now() - context.timestamp > 30 * 60 * 1000) {
        this.clearSourceContext();
        return null;
      }
      
      return context;
    } catch (error) {
      console.error('[PWA Integration] 讀取暫存失敗:', error);
      return null;
    }
  }

  clearSourceContext() {
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.TEMP_DATA_KEY);
  }

  identifyCardTypeEnhanced(data) {
    console.log('[PWA Integration] 開始增強版類型識別');
    
    const sourceContext = this.getSourceContext();
    console.log('[PWA Integration] 暫存上下文:', sourceContext);
    
    if (sourceContext?.sourceUrl) {
      console.log('[PWA Integration] 找到暫存 URL:', sourceContext.sourceUrl);
      const typeFromUrl = this.parseTypeFromUrl(sourceContext.sourceUrl);
      console.log('[PWA Integration] 暫存 URL 識別結果:', typeFromUrl);
      if (typeFromUrl) {
        console.log('[PWA Integration] 使用暫存 URL 識別類型:', typeFromUrl);
        return typeFromUrl;
      }
    }

    if (data.url) {
      console.log('[PWA Integration] 檢查當前 URL:', data.url);
      const typeFromCurrentUrl = this.parseTypeFromUrl(data.url);
      console.log('[PWA Integration] 當前 URL 識別結果:', typeFromCurrentUrl);
      if (typeFromCurrentUrl) {
        return typeFromCurrentUrl;
      }
    }

    console.log('[PWA Integration] 使用資料特徵識別');
    const result = this.identifyByDataFeatures(data);
    console.log('[PWA Integration] 資料特徵識別結果:', result);
    return result;
  }

  parseTypeFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const urlLower = url.toLowerCase().trim();
    
    // 處理 PWA 頁面 URL，從參數中解析原始來源
    if (urlLower.includes('pwa-card-storage')) {
      // 這是 PWA 頁面，無法直接從 URL 判斷類型
      return null;
    }
    
    if (urlLower.includes('index-bilingual-personal.html')) return 'personal-bilingual';
    if (urlLower.includes('index1-bilingual.html')) return 'bilingual1';
    if (urlLower.includes('index-bilingual.html')) return 'bilingual';
    if (urlLower.includes('index-personal-en.html')) return 'personal-en';
    if (urlLower.includes('index1-en.html')) return 'en1';
    if (urlLower.includes('index-en.html')) return 'en';
    if (urlLower.includes('index-personal.html')) return 'personal';
    if (urlLower.includes('index1.html')) return 'index1';
    if (urlLower.includes('index.html')) return 'index';
    
    return null;
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
}

window.PWAIntegration = new PWAIntegration();