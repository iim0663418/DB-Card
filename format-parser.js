/**
 * 統一格式解析器
 * 支援多種名片數據格式的解析與標準化
 */
class FormatParser {
  
  /**
   * 自動檢測並解析任何格式
   * @param {any} data - 原始數據
   * @param {string} formatHint - 格式提示
   */
  static parseAnyFormat(data, formatHint = 'auto') {
    console.log('Parsing format:', formatHint, data);
    
    if (formatHint === 'auto') {
      formatHint = this.detectFormat(data);
    }
    
    switch (formatHint) {
      case 'bilingual':
        return this.parseBilingual(data);
      case 'legacy':
        return this.parseLegacy(data);
      case 'url':
        return this.parseFromURL(data);
      case 'compact':
        return this.parseCompact(data);
      default:
        throw new Error(`Unsupported format: ${formatHint}`);
    }
  }

  /**
   * 自動檢測數據格式
   */
  static detectFormat(data) {
    if (typeof data === 'string') {
      // 檢查是否為 Base64 編碼的緊湊格式
      if (this.isBase64Like(data) && !data.includes('http')) {
        return 'compact';
      }
      // 檢查是否包含分隔符
      if (data.includes('|')) return 'compact';
      return 'url';
    }
    
    if (typeof data === 'object' && data !== null) {
      if (data.name && typeof data.name === 'string' && data.name.includes('~')) return 'bilingual';
      if (data.data) return 'legacy';
      return 'legacy';
    }
    
    return 'legacy';
  }

  /**
   * 解析雙語格式 (bilingual-common.js)
   */
  static parseBilingual(data) {
    return {
      name: this.parseBilingualField(data.name),
      title: this.parseBilingualField(data.title),
      department: data.department || '',
      email: data.email || '',
      phone: data.phone || '',
      mobile: data.mobile || '',
      avatar: data.avatar || '',
      greetings: data.greetings || [],
      socialNote: data.socialNote || '',
      originalData: data
    };
  }

  /**
   * 解析雙語字段
   */
  static parseBilingualField(value) {
    if (!value) return '';
    if (value.includes('~')) {
      const [zh, en] = value.split('~').map(s => s.trim());
      return zh || en || '';
    }
    return value;
  }

  /**
   * 解析傳統格式
   */
  static parseLegacy(data) {
    const actualData = data.data || data;
    return {
      name: actualData.name || '',
      title: actualData.title || '',
      department: actualData.department || '',
      organization: actualData.organization || '',
      email: actualData.email || '',
      phone: actualData.phone || '',
      mobile: actualData.mobile || '',
      avatar: actualData.avatar || '',
      address: actualData.address || '',
      greetings: actualData.greetings || [],
      socialNote: actualData.socialLinks?.socialNote || actualData.socialNote || '',
      originalData: data
    };
  }

  /**
   * 解析緊湊格式 (bilingual-common.js encodeCompact)
   */
  static parseCompact(encoded) {
    try {
      let processedData = encoded;
      
      // 先嘗試 URL 解碼
      try {
        processedData = decodeURIComponent(encoded);
      } catch (e) {
        processedData = encoded;
      }
      
      // 如果已經是分隔符格式，直接解析
      if (processedData.includes('|')) {
        const parts = processedData.split('|');
        return this.parseCompactParts(parts);
      }
      
      // Base64 解碼
      const padding = '='.repeat((4 - processedData.length % 4) % 4);
      const base64Fixed = processedData.replace(/-/g, '+').replace(/_/g, '/') + padding;
      
      let compact;
      try {
        compact = decodeURIComponent(atob(base64Fixed));
      } catch (e) {
        compact = atob(base64Fixed);
      }
      
      const parts = compact.split('|');
      return this.parseCompactParts(parts);
      
    } catch (error) {
      console.error('Compact format parsing failed:', error);
      throw new Error(`Invalid compact format: ${error.message}`);
    }
  }
  
  /**
   * 解析緊湊格式的分隔部分
   */
  static parseCompactParts(parts) {
    // 檢查是否為舊版本格式（8個欄位）
    if (parts.length === 8) {
      return {
        name: parts[0] || '',
        title: parts[1] || '',
        department: parts[2] || '',
        email: parts[3] || '',
        phone: parts[4] || '',
        mobile: '',
        avatar: parts[5] || '',
        greetings: parts[6] ? parts[6].split(',') : [],
        socialNote: parts[7] || ''
      };
    }
    
    // 新版本格式（9個欄位）
    return {
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

  /**
   * 從 URL 參數解析
   */
  static parseFromURL(urlParam) {
    try {
      let dataParam = urlParam;
      
      // 如果是完整 URL，提取 data 參數
      if (urlParam.startsWith('http')) {
        const urlObj = new URL(urlParam);
        dataParam = urlObj.searchParams.get('data');
        if (!dataParam) {
          throw new Error('No data parameter found in URL');
        }
      }
      
      // 解碼 URL 參數
      const decoded = this.decodeFromURL(dataParam);
      return this.parseAnyFormat(decoded);
    } catch (error) {
      console.error('URL parsing failed:', error);
      throw new Error('Invalid URL data format');
    }
  }

  /**
   * URL 解碼邏輯
   */
  static decodeFromURL(encoded) {
    try {
      // 處理多層編碼
      let decoded = encoded;
      
      // URL 解碼
      try {
        decoded = decodeURIComponent(decoded);
      } catch (e) {
        // 如果 URL 解碼失敗，繼續使用原始字串
      }
      
      // Base64 解碼
      if (this.isBase64(decoded)) {
        try {
          decoded = atob(decoded);
        } catch (e) {
          console.warn('Base64 decode failed:', e);
        }
      }
      
      // 安全 JSON 解析
      if (decoded.startsWith('{')) {
        return SecurityUtils.safeJSONParse(decoded);
      }
      
      // 檢查是否為緊湊格式
      if (this.isBase64Like(encoded) || decoded.includes('|')) {
        return this.parseCompact(encoded);
      }
      
      // 安全 JSON 解析原始編碼
      try {
        const jsonData = SecurityUtils.safeJSONParse(atob(encoded));
        return jsonData || this.parseCompact(encoded);
      } catch (e) {
        // 最後嘗試解析為緊湊格式
        return this.parseCompact(encoded);
      }
      
    } catch (error) {
      throw new Error(`Failed to decode URL parameter: ${error.message}`);
    }
  }

  /**
   * 標準化為內部格式
   */
  static normalize(rawData, formatType = 'auto') {
    const parsed = this.parseAnyFormat(rawData, formatType);
    
    return {
      id: this.generateId(parsed),
      name: this.cleanText(parsed.name),
      title: this.cleanText(parsed.title),
      department: this.cleanText(parsed.department),
      organization: this.cleanText(parsed.organization || parsed.department),
      email: this.cleanEmail(parsed.email),
      phone: this.cleanPhone(parsed.phone),
      mobile: this.cleanPhone(parsed.mobile),
      avatar: parsed.avatar || '',
      address: parsed.address || '',
      greetings: Array.isArray(parsed.greetings) ? parsed.greetings : [],
      socialNote: this.cleanText(parsed.socialNote),
      tags: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: formatType,
      originalData: parsed.originalData || rawData
    };
  }

  /**
   * 產生唯一 ID
   */
  static generateId(data) {
    const key = data.email || data.name || Date.now().toString();
    return 'card_' + btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * 清理文字 - 安全版本
   */
  static cleanText(text) {
    if (!text) return '';
    const cleaned = text.toString().trim().replace(/\s+/g, ' ');
    return SecurityUtils.sanitizeText(cleaned);
  }

  /**
   * 清理 Email
   */
  static cleanEmail(email) {
    if (!email) return '';
    const cleaned = email.toString().trim().toLowerCase();
    return cleaned.includes('@') ? cleaned : '';
  }

  /**
   * 清理電話
   */
  static cleanPhone(phone) {
    if (!phone) return '';
    return phone.toString().replace(/[^\d+()-\s]/g, '').trim();
  }

  /**
   * 檢查是否為 Base64
   */
  static isBase64(str) {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }
  
  /**
   * 檢查是否像 Base64 格式
   */
  static isBase64Like(str) {
    if (!str || typeof str !== 'string') return false;
    // Base64 字符集檢查
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(str) && str.length > 10;
  }

  /**
   * 格式驗證
   */
  static validate(data) {
    const errors = [];
    
    if (!data.name && !data.email) {
      errors.push('Name or email is required');
    }
    
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Email 格式驗證
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}