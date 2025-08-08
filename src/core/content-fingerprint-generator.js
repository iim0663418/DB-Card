/**
 * 內容指紋生成器 - CORE-01
 * 基於 name+email SHA-256 指紋生成與雙語標準化
 */

class ContentFingerprintGenerator {
  constructor() {
    this.algorithm = 'SHA-256';
    this.encoding = 'UTF-8';
  }

  /**
   * 生成名片內容指紋
   * @param {Object} cardData - 名片資料
   * @returns {Promise<string>} - 指紋字串，格式：fingerprint_[64字元hash]
   */
  async generateFingerprint(cardData) {
    try {
      // 1. 標準化姓名（處理雙語格式）
      const normalizedName = this.normalizeName(cardData.name);
      
      // 2. 標準化電子郵件（轉小寫，去空格）
      const normalizedEmail = this.normalizeEmail(cardData.email);
      
      // 3. 組合關鍵欄位
      const fingerprintSource = `${normalizedName}|${normalizedEmail}`;
      
      // 4. 生成 SHA-256 雜湊
      const hash = await this.calculateSHA256(fingerprintSource);
      
      return `fingerprint_${hash}`;
    } catch (error) {
      console.error('[ContentFingerprintGenerator] Generate fingerprint failed:', error);
      // CRS-V31-004: 備用方法
      return this.generateFallbackFingerprint(cardData);
    }
  }

  /**
   * 標準化姓名處理
   * @param {string|Object} name - 姓名資料
   * @returns {string} - 標準化後的姓名
   */
  normalizeName(name) {
    if (!name) return '';
    
    // 處理雙語格式 "蔡孟諭~Tsai Meng-Yu" → "蔡孟諭"
    if (typeof name === 'string') {
      if (name.includes('~')) {
        const [chinese] = name.split('~');
        return chinese.trim();
      }
      return name.trim();
    }
    
    // 處理物件格式 {zh: "蔡孟諭", en: "Tsai Meng-Yu"}
    if (typeof name === 'object' && name !== null) {
      if (name.zh) return String(name.zh).trim();
      if (name.en) return String(name.en).trim();
    }
    
    return String(name || '').trim();
  }

  /**
   * 標準化電子郵件處理
   * @param {string|Object} email - 電子郵件資料
   * @returns {string} - 標準化後的電子郵件
   */
  normalizeEmail(email) {
    if (!email) return '';
    
    let emailStr = '';
    if (typeof email === 'string') {
      emailStr = email;
    } else if (typeof email === 'object' && email !== null) {
      emailStr = email.zh || email.en || String(email);
    } else {
      emailStr = String(email || '');
    }
    
    // 轉小寫，去空格，移除無效字符
    return emailStr.toLowerCase().trim().replace(/\s+/g, '');
  }

  /**
   * 計算 SHA-256 雜湊
   * @param {string} data - 要雜湊的資料
   * @returns {Promise<string>} - 十六進位雜湊字串
   */
  async calculateSHA256(data) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[ContentFingerprintGenerator] SHA-256 calculation failed:', error);
      throw error;
    }
  }

  /**
   * CRS-V31-004: 備用指紋生成方法
   * @param {Object} cardData - 名片資料
   * @returns {string} - 備用指紋
   */
  generateFallbackFingerprint(cardData) {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const nameHash = this.simpleHash(this.normalizeName(cardData.name));
      const emailHash = this.simpleHash(this.normalizeEmail(cardData.email));
      
      return `fingerprint_fallback_${nameHash}_${emailHash}_${timestamp}_${random}`;
    } catch (error) {
      console.error('[ContentFingerprintGenerator] Fallback generation failed:', error);
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      return `fingerprint_emergency_${timestamp}_${random}`;
    }
  }

  /**
   * 簡單雜湊函數（備用）
   * @param {string} str - 要雜湊的字串
   * @returns {string} - 簡單雜湊結果
   */
  simpleHash(str) {
    if (!str) return '0';
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為32位整數
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * 驗證指紋格式
   * @param {string} fingerprint - 指紋字串
   * @returns {boolean} - 是否為有效格式
   */
  isValidFingerprint(fingerprint) {
    if (!fingerprint || typeof fingerprint !== 'string') {
      return false;
    }
    
    // 檢查標準格式：fingerprint_[64字元hex]
    const standardPattern = /^fingerprint_[a-f0-9]{64}$/i;
    if (standardPattern.test(fingerprint)) {
      return true;
    }
    
    // 檢查備用格式
    const fallbackPattern = /^fingerprint_(fallback|emergency)_/i;
    return fallbackPattern.test(fingerprint);
  }

  /**
   * 比較兩個指紋是否相同
   * @param {string} fingerprint1 - 指紋1
   * @param {string} fingerprint2 - 指紋2
   * @returns {boolean} - 是否相同
   */
  compareFingerprints(fingerprint1, fingerprint2) {
    if (!fingerprint1 || !fingerprint2) return false;
    return fingerprint1 === fingerprint2;
  }

  /**
   * 從指紋中提取雜湊部分
   * @param {string} fingerprint - 完整指紋
   * @returns {string} - 雜湊部分
   */
  extractHash(fingerprint) {
    if (!fingerprint || typeof fingerprint !== 'string') {
      return '';
    }
    
    if (fingerprint.startsWith('fingerprint_')) {
      return fingerprint.substring(12); // 移除 "fingerprint_" 前綴
    }
    
    return fingerprint;
  }

  /**
   * 批量生成指紋
   * @param {Array<Object>} cardDataArray - 名片資料陣列
   * @returns {Promise<Array<{cardData: Object, fingerprint: string}>>} - 指紋結果陣列
   */
  async generateBatchFingerprints(cardDataArray) {
    if (!Array.isArray(cardDataArray)) {
      throw new Error('Input must be an array');
    }
    
    const results = [];
    
    for (const cardData of cardDataArray) {
      try {
        const fingerprint = await this.generateFingerprint(cardData);
        results.push({ cardData, fingerprint, success: true });
      } catch (error) {
        console.error('[ContentFingerprintGenerator] Batch generation failed for card:', error);
        results.push({ 
          cardData, 
          fingerprint: null, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentFingerprintGenerator;
} else if (typeof window !== 'undefined') {
  window.ContentFingerprintGenerator = ContentFingerprintGenerator;
}