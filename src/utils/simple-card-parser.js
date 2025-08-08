/**
 * PWA-24 精簡資料解析器
 * 支援兩大生成器格式，最小化處理，零資料遺失
 */

class SimpleCardParser {
  /**
   * PWA-38: 直接解析 URL 資料，根據類型解析
   */
  static parseDirectly(urlData, cardType) {
    try {
      
      // 檢查是否為未編碼的管道分隔格式（測試用）
      if (urlData.includes('|') && !urlData.includes('=') && urlData.length < 200) {
        return this.parsePipeFormat(urlData);
      }
      
      // 檢查是否為未編碼的 JSON 格式（測試用）
      if (urlData.startsWith('{') || urlData.includes('"n":')) {
        return this.parseJSONFormat(urlData);
      }
      
      // 根據名片類別解碼 Base64 資料
      const decoded = this.decodeUrlData(urlData, cardType);
      
      // 根據類型選擇解析方法（優先）
      if (cardType && this.isBilingualType(cardType)) {
        // 雙語類型優先使用管道格式
        if (decoded.includes('|')) {
          return this.parsePipeFormat(decoded);
        }
      }
      
      // 自動識別格式（備用）
      if (decoded.startsWith('{') || decoded.includes('"n":')) {
        // JSON 格式 (nfc-generator.html)
        return this.parseJSONFormat(decoded);
      } else if (decoded.includes('|')) {
        // 管道分隔格式 (nfc-generator-bilingual.html)
        return this.parsePipeFormat(decoded);
      } else {
        return null;
      }
    } catch (error) {
      console.error('[SimpleParser] PWA-38: Parse failed:', error);
      return null;
    }
  }
  
  /**
   * PWA-35: 解析 JSON 格式 (nfc-generator.html) - 支援雙語欄位
   */
  static parseJSONFormat(decoded) {
    try {
      const jsonData = JSON.parse(decoded);
      
      // 處理問候語陣列
      let greetings = [];
      if (Array.isArray(jsonData.g)) {
        greetings = jsonData.g;
      } else if (jsonData.g && typeof jsonData.g === 'string') {
        greetings = [jsonData.g];
      } else {
        greetings = ['歡迎認識我！'];
      }
      
      // PWA-35: 支援所有欄位的雙語解析
      const cardData = {
        name: SimpleCardParser.parseBilingualField(jsonData.n),
        title: SimpleCardParser.parseBilingualField(jsonData.t),
        department: SimpleCardParser.parseBilingualField(jsonData.d),
        organization: SimpleCardParser.parseBilingualField(jsonData.o),
        email: jsonData.e || '',
        phone: jsonData.p || '',
        mobile: jsonData.m || '',
        avatar: jsonData.a || '',
        address: SimpleCardParser.parseBilingualField(jsonData.addr),
        greetings: greetings,
        socialNote: SimpleCardParser.parseBilingualField(jsonData.s)
      };
      
      return cardData;
    } catch (error) {
      console.error('[SimpleParser] PWA-35: JSON parse failed:', error);
      return null;
    }
  }
  
  /**
   * 解析管道分隔格式 (nfc-generator-bilingual.html)
   * PWA-35 版本：支援所有雙語欄位的解析
   */
  static parsePipeFormat(decoded) {
    try {
      const parts = decoded.split('|');
      
      // 修復欄位對應：根據 bilingual-common.js 的實際格式
      // 正確格式：name|title|department|email|phone|mobile|avatar|greetings|socialNote
      const cardData = {
        name: SimpleCardParser.parseBilingualField(parts[0]),           // 0: name (雙語)
        title: SimpleCardParser.parseBilingualField(parts[1]),          // 1: title (雙語)
        department: SimpleCardParser.parseBilingualField(parts[2]),     // 2: department (單語)
        email: parts[3] || '',                                          // 3: email (單語) - 修復
        phone: parts[4] || '',                                          // 4: phone (單語)
        mobile: parts[5] || '',                                         // 5: mobile (單語)
        avatar: parts[6] || '',                                         // 6: avatar (單語) - 修復
        greetings: SimpleCardParser.parseGreetingsField(parts[7]),      // 7: greetings (雙語)
        socialNote: SimpleCardParser.parseBilingualField(parts[8]),     // 8: socialNote (單語) - 修復
        // 組織和地址由前端預設提供，不從 URL 資料中解析
        organization: { zh: '', en: '' },
        address: { zh: '', en: '' }
      };
      
      return cardData;
    } catch (error) {
      console.error('[SimpleParser] PWA-35: Pipe parse failed:', error);
      return null;
    }
  }
  
  /**
   * PWA-35: 解析雙語欄位的通用方法
   */
  static parseBilingualField(value) {
    if (!value || !value.includes('~')) {
      return { zh: value || '', en: value || '' };
    }
    const [zh, en] = value.split('~');
    return { zh: zh || '', en: en || '' };
  }
  
  /**
   * PWA-35: 解析問候語欄位，支援雙語格式
   */
  static parseGreetingsField(greetingStr) {
    if (!greetingStr || !greetingStr.trim()) {
      return ['歡迎認識我！~Nice to meet you!'];
    }
    
    const trimmed = greetingStr.trim();
    
    // 如果包含雙語分隔符，直接使用
    if (trimmed.includes('~')) {
      return [trimmed];
    }
    
    // 單語情況，返回原始字串
    return [trimmed];
  }
  
  /**
   * 根據名片類別選擇最適合的解碼策略
   */
  static decodeUrlData(urlData, cardType = null) {
    
    // 策略 1: 雙語版使用舊版解碼 (保持相容性)
    if (cardType && this.isBilingualType(cardType)) {
      try {
        const padding = '='.repeat((4 - urlData.length % 4) % 4);
        const base64Fixed = urlData.replace(/-/g, '+').replace(/_/g, '/') + padding;
        let decoded = decodeURIComponent(escape(atob(base64Fixed)));
        
        // 檢查是否需要再次 URL 解碼
        if (decoded.includes('%')) {
          decoded = decodeURIComponent(decoded);
        }
        
        return decoded;
      } catch (error) {
      }
    }
    
    // 策略 2: 單語版使用 UTF-8 解碼 (修復中文字符)
    if (cardType && !this.isBilingualType(cardType)) {
      try {
        const padding = '='.repeat((4 - urlData.length % 4) % 4);
        const base64Fixed = urlData.replace(/-/g, '+').replace(/_/g, '/') + padding;
        
        const binaryString = atob(base64Fixed);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoded = new TextDecoder('utf-8').decode(bytes);
        return decoded;
      } catch (error) {
      }
    }
    
    // 策略 3: 未知類別或備用方案 - 智慧嘗試
    
    // 3.1: 先嘗試舊版解碼
    try {
      const padding = '='.repeat((4 - urlData.length % 4) % 4);
      const base64Fixed = urlData.replace(/-/g, '+').replace(/_/g, '/') + padding;
      let decoded = decodeURIComponent(escape(atob(base64Fixed)));
      
      // 檢查是否需要再次 URL 解碼
      if (decoded.includes('%')) {
        decoded = decodeURIComponent(decoded);
      }
      
      if (decoded.includes('|') || decoded.startsWith('{') || decoded.includes('"n":')) {
        return decoded;
      }
    } catch (error) {
      // 繼續嘗試下一種方法
    }
    
    // 3.2: 再嘗試 UTF-8 解碼
    try {
      const padding = '='.repeat((4 - urlData.length % 4) % 4);
      const base64Fixed = urlData.replace(/-/g, '+').replace(/_/g, '/') + padding;
      
      const binaryString = atob(base64Fixed);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decoded = new TextDecoder('utf-8').decode(bytes);
      return decoded;
    } catch (error) {
      throw new Error(`Unable to decode URL data for cardType: ${cardType}`);
    }
  }
  
  /**
   * PWA-38: 檢查是否為雙語類型
   */
  static isBilingualType(cardType) {
    const bilingualTypes = ['bilingual', 'bilingual1', 'personal-bilingual'];
    return bilingualTypes.includes(cardType);
  }
  
  /**
   * 驗證解析結果
   */
  static validateParsedData(cardData) {
    if (!cardData) return false;
    
    // 最小驗證：只檢查必要欄位
    const hasBasicData = cardData.name || cardData.email || cardData.phone;
    
    return hasBasicData;
  }
}

// 全域導出
window.SimpleCardParser = SimpleCardParser;

