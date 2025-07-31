/**
 * PWA-24 精簡資料解析器
 * 支援兩大生成器格式，最小化處理，零資料遺失
 */

class SimpleCardParser {
  /**
   * 直接解析 URL 資料，自動識別兩種格式
   */
  static parseDirectly(urlData) {
    try {
      
      // 檢查是否為未編碼的管道分隔格式（測試用）
      if (urlData.includes('|') && !urlData.includes('=') && urlData.length < 200) {
        return this.parsePipeFormat(urlData);
      }
      
      // 檢查是否為未編碼的 JSON 格式（測試用）
      if (urlData.startsWith('{') || urlData.includes('"n":')) {
        return this.parseJSONFormat(urlData);
      }
      
      // 嘗試解碼 Base64 資料
      const decoded = this.decodeUrlData(urlData);
      
      // 自動識別格式
      if (decoded.startsWith('{') || decoded.includes('"n":')) {
        // JSON 格式 (nfc-generator.html)
        return this.parseJSONFormat(decoded);
      } else if (decoded.includes('|')) {
        // 管道分隔格式 (nfc-generator-bilingual.html)
        return this.parsePipeFormat(decoded);
      } else {
        console.error('[SimpleParser] PWA-24: Unknown format');
        return null;
      }
    } catch (error) {
      console.error('[SimpleParser] PWA-24: Parse failed:', error);
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
      
      // PWA-35: 完整的欄位映射，支援所有雙語欄位
      const cardData = {
        name: SimpleCardParser.parseBilingualField(parts[0]),           // 雙語支援
        title: SimpleCardParser.parseBilingualField(parts[1]),          // 雙語支援
        department: SimpleCardParser.parseBilingualField(parts[2]),     // 雙語支援
        organization: SimpleCardParser.parseBilingualField(parts[3]),   // 雙語支援
        email: parts[4] || '',                              // 單語言
        phone: parts[5] || '',                              // 單語言
        mobile: parts[6] || '',                             // 單語言
        avatar: '',                                         // 單語言
        address: SimpleCardParser.parseBilingualField(parts[8]),        // 雙語支援
        greetings: SimpleCardParser.parseGreetingsField(parts[7]),      // 特殊處理
        socialNote: SimpleCardParser.parseBilingualField(parts[9])      // 雙語支援
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
   * 直接解碼 URL 資料，支援多種編碼格式
   */
  static decodeUrlData(urlData) {
    try {
      // 方法 1: URL-safe Base64 解碼 (雙語生成器)
      const padding = '='.repeat((4 - urlData.length % 4) % 4);
      const base64Fixed = urlData.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const decoded = decodeURIComponent(atob(base64Fixed));
      
      return decoded;
    } catch (error) {
      
      try {
        // 方法 2: 標準 Base64 解碼 (單語生成器)
        const decoded = decodeURIComponent(atob(urlData));
        return decoded;
      } catch (standardError) {
        
        try {
          // 方法 3: UTF-8 解碼 (備用方案)
          const fixedBase64 = urlData.replace(/\s/g, '+').replace(/-/g, '+').replace(/_/g, '/').trim();
          const binaryString = atob(fixedBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const decoded = new TextDecoder('utf-8').decode(bytes);
          return decoded;
        } catch (utf8Error) {
          throw new Error('Unable to decode URL data');
        }
      }
    }
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

