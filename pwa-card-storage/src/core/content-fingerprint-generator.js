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
   * @returns {Promise<string>} - fingerprint_[64字元hash] 格式指紋
   */
  async generateFingerprint(cardData) {
    try {
      // 輸入驗證與清理
      const cleanedData = this.sanitizeInput(cardData);
      
      // 雙語標準化
      const normalizedData = this.normalizeBilingualContent(cleanedData);
      
      // 提取核心識別欄位 (name + email)
      const coreContent = this.extractCoreContent(normalizedData);
      
      // 生成 SHA-256 指紋
      const hash = await this.computeHash(coreContent);
      
      return `fingerprint_${hash}`;
    } catch (error) {
      console.error('[ContentFingerprintGenerator] Generate fingerprint failed:', error);
      // 備用算法
      return this.generateFallbackFingerprint(cardData);
    }
  }

  /**
   * 輸入驗證與清理
   */
  sanitizeInput(cardData) {
    if (!cardData || typeof cardData !== 'object') {
      throw new Error('Invalid card data');
    }

    const cleaned = {};
    
    // 清理 name 欄位
    if (cardData.name) {
      cleaned.name = this.cleanString(cardData.name);
    }
    
    // 清理 email 欄位
    if (cardData.email) {
      cleaned.email = this.cleanString(cardData.email).toLowerCase();
    }

    if (!cleaned.name && !cleaned.email) {
      throw new Error('Missing required fields: name or email');
    }

    return cleaned;
  }

  /**
   * 清理字串，移除特殊字元和空值
   */
  cleanString(input) {
    if (typeof input === 'string') {
      return input.trim().replace(/[\x00-\x1F\x7F]/g, '');
    }
    
    if (typeof input === 'object' && input !== null) {
      // 處理雙語物件格式
      if (input.zh || input.en) {
        const zh = input.zh ? String(input.zh).trim() : '';
        const en = input.en ? String(input.en).trim() : '';
        return zh && en ? `${zh}~${en}` : (zh || en);
      }
    }
    
    return String(input || '').trim();
  }

  /**
   * 雙語內容標準化
   */
  normalizeBilingualContent(data) {
    const normalized = { ...data };

    // 標準化 name 欄位
    if (normalized.name) {
      normalized.name = this.normalizeBilingualField(normalized.name);
    }

    // 標準化 email 欄位 (通常不需要雙語處理，但保持一致性)
    if (normalized.email) {
      normalized.email = this.normalizeBilingualField(normalized.email);
    }

    return normalized;
  }

  /**
   * 標準化雙語欄位
   */
  normalizeBilingualField(field) {
    if (typeof field === 'string') {
      // 處理 "中文~English" 格式
      if (field.includes('~')) {
        const [zh, en] = field.split('~').map(s => s.trim());
        return zh && en ? `${zh}~${en}` : field;
      }
      return field;
    }
    
    if (typeof field === 'object' && field !== null) {
      // 處理 {zh: "中文", en: "English"} 格式
      if (field.zh && field.en) {
        return `${field.zh.trim()}~${field.en.trim()}`;
      }
      return field.zh || field.en || '';
    }
    
    return String(field || '');
  }

  /**
   * 提取核心內容用於指紋生成
   */
  extractCoreContent(data) {
    const parts = [];
    
    if (data.name) {
      parts.push(`name:${data.name}`);
    }
    
    if (data.email) {
      parts.push(`email:${data.email}`);
    }
    
    return parts.join('|');
  }

  /**
   * 計算 SHA-256 雜湊值
   */
  async computeHash(content) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[ContentFingerprintGenerator] SHA-256 computation failed:', error);
      throw error;
    }
  }

  /**
   * 備用指紋生成算法
   */
  generateFallbackFingerprint(cardData) {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2);
      const name = cardData?.name || 'unknown';
      const email = cardData?.email || 'unknown';
      
      // 簡單雜湊算法作為備用
      const content = `${name}|${email}|${timestamp}|${random}`;
      let hash = 0;
      
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 轉換為 32 位整數
      }
      
      const fallbackHash = Math.abs(hash).toString(16).padStart(8, '0');
      return `fingerprint_fallback_${fallbackHash}_${timestamp}`;
    } catch (error) {
      console.error('[ContentFingerprintGenerator] Fallback generation failed:', error);
      return `fingerprint_error_${Date.now()}`;
    }
  }

  /**
   * 驗證指紋格式
   */
  validateFingerprint(fingerprint) {
    if (typeof fingerprint !== 'string') {
      return false;
    }
    
    // 標準格式: fingerprint_[64字元hex]
    const standardPattern = /^fingerprint_[a-f0-9]{64}$/i;
    if (standardPattern.test(fingerprint)) {
      return true;
    }
    
    // 備用格式: fingerprint_fallback_[8字元hex]_[timestamp]
    const fallbackPattern = /^fingerprint_fallback_[a-f0-9]{8}_\d+$/i;
    if (fallbackPattern.test(fingerprint)) {
      return true;
    }
    
    // 錯誤格式: fingerprint_error_[timestamp]
    const errorPattern = /^fingerprint_error_\d+$/i;
    return errorPattern.test(fingerprint);
  }

  /**
   * 比較兩個指紋是否相同
   */
  compareFingerprints(fingerprint1, fingerprint2) {
    if (!this.validateFingerprint(fingerprint1) || !this.validateFingerprint(fingerprint2)) {
      return false;
    }
    
    return fingerprint1 === fingerprint2;
  }

  /**
   * 從指紋中提取雜湊值
   */
  extractHashFromFingerprint(fingerprint) {
    if (!this.validateFingerprint(fingerprint)) {
      return null;
    }
    
    // 標準格式
    const standardMatch = fingerprint.match(/^fingerprint_([a-f0-9]{64})$/i);
    if (standardMatch) {
      return standardMatch[1];
    }
    
    // 備用格式
    const fallbackMatch = fingerprint.match(/^fingerprint_fallback_([a-f0-9]{8})_\d+$/i);
    if (fallbackMatch) {
      return fallbackMatch[1];
    }
    
    return null;
  }

  /**
   * 批量生成指紋
   */
  async generateBatchFingerprints(cardDataArray) {
    const results = [];
    
    for (const cardData of cardDataArray) {
      try {
        const fingerprint = await this.generateFingerprint(cardData);
        results.push({
          success: true,
          fingerprint,
          cardData
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          cardData
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