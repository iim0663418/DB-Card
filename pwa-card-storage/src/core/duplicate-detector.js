/**
 * 重複檢測器 - CORE-02
 * 基於指紋的重複名片檢測與處理
 */

class DuplicateDetector {
  constructor(storage) {
    this.storage = storage;
    this.fingerprintGenerator = null;
  }

  /**
   * 初始化檢測器
   */
  async initialize() {
    try {
      if (typeof window !== 'undefined' && window.ContentFingerprintGenerator) {
        this.fingerprintGenerator = new window.ContentFingerprintGenerator();
      }
      return true;
    } catch (error) {
      console.error('[DuplicateDetector] Initialize failed:', error);
      return false;
    }
  }

  /**
   * 檢測重複名片
   * @param {Object} cardData - 待檢測的名片資料
   * @returns {Promise<Object>} - 檢測結果
   */
  async detectDuplicates(cardData) {
    try {
      // 生成指紋
      const fingerprint = await this.generateFingerprint(cardData);
      
      // 查詢相同指紋的名片
      const existingCards = await this.storage.findCardsByFingerprint(fingerprint);
      
      const result = {
        isDuplicate: existingCards.length > 0,
        fingerprint,
        duplicateCount: existingCards.length,
        existingCards: existingCards.map(card => ({
          id: card.id,
          name: this.extractDisplayName(card.data),
          created: card.created,
          modified: card.modified,
          version: card.currentVersion || 1
        })),
        recommendation: this.getRecommendation(existingCards.length)
      };

      return result;
    } catch (error) {
      console.error('[DuplicateDetector] Detect duplicates failed:', error);
      return {
        isDuplicate: false,
        fingerprint: null,
        duplicateCount: 0,
        existingCards: [],
        recommendation: 'create',
        error: error.message
      };
    }
  }

  /**
   * 批量檢測重複
   * @param {Array} cardDataArray - 名片資料陣列
   * @returns {Promise<Array>} - 檢測結果陣列
   */
  async batchDetectDuplicates(cardDataArray) {
    const results = [];
    
    for (const cardData of cardDataArray) {
      try {
        const result = await this.detectDuplicates(cardData);
        results.push({
          cardData,
          detection: result,
          index: results.length
        });
      } catch (error) {
        results.push({
          cardData,
          detection: {
            isDuplicate: false,
            error: error.message
          },
          index: results.length
        });
      }
    }
    
    return results;
  }

  /**
   * 處理重複名片
   * @param {Object} cardData - 名片資料
   * @param {string} action - 處理動作: 'skip', 'overwrite', 'version'
   * @param {string} existingCardId - 現有名片ID (用於 overwrite 和 version)
   * @returns {Promise<Object>} - 處理結果
   */
  async handleDuplicate(cardData, action, existingCardId = null) {
    try {
      switch (action) {
        case 'skip':
          return {
            success: true,
            action: 'skip',
            message: '跳過重複名片'
          };

        case 'overwrite':
          if (!existingCardId) {
            throw new Error('Overwrite action requires existing card ID');
          }
          
          await this.storage.updateCard(existingCardId, cardData);
          return {
            success: true,
            action: 'overwrite',
            cardId: existingCardId,
            message: '覆蓋現有名片'
          };

        case 'version':
          const newCardId = await this.storage.storeCard(cardData);
          return {
            success: true,
            action: 'version',
            cardId: newCardId,
            message: '建立新版本'
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('[DuplicateDetector] Handle duplicate failed:', error);
      return {
        success: false,
        action,
        error: error.message
      };
    }
  }

  /**
   * 生成指紋
   */
  async generateFingerprint(cardData) {
    if (this.fingerprintGenerator) {
      return await this.fingerprintGenerator.generateFingerprint(cardData);
    }
    
    // 備用方案
    return await this.storage.generateFingerprint(cardData);
  }

  /**
   * 提取顯示名稱
   */
  extractDisplayName(cardData) {
    if (!cardData.name) return 'Unknown';
    
    if (typeof cardData.name === 'string') {
      return cardData.name.includes('~') ? cardData.name.split('~')[0] : cardData.name;
    }
    
    if (typeof cardData.name === 'object' && cardData.name.zh) {
      return cardData.name.zh;
    }
    
    return String(cardData.name);
  }

  /**
   * 獲取處理建議
   */
  getRecommendation(duplicateCount) {
    if (duplicateCount === 0) return 'create';
    if (duplicateCount === 1) return 'overwrite';
    return 'version';
  }

  /**
   * 獲取重複統計
   */
  async getDuplicateStats() {
    try {
      const allCards = await this.storage.listCards();
      const fingerprintMap = new Map();
      
      // 統計指紋分布
      for (const card of allCards) {
        const fingerprint = card.fingerprint;
        if (fingerprint) {
          if (!fingerprintMap.has(fingerprint)) {
            fingerprintMap.set(fingerprint, []);
          }
          fingerprintMap.get(fingerprint).push(card);
        }
      }
      
      // 計算重複統計
      const duplicateGroups = Array.from(fingerprintMap.entries())
        .filter(([_, cards]) => cards.length > 1);
      
      const totalDuplicates = duplicateGroups.reduce((sum, [_, cards]) => sum + cards.length - 1, 0);
      
      return {
        totalCards: allCards.length,
        uniqueFingerprints: fingerprintMap.size,
        duplicateGroups: duplicateGroups.length,
        totalDuplicates,
        duplicateRate: allCards.length > 0 ? Math.round((totalDuplicates / allCards.length) * 100) : 0
      };
    } catch (error) {
      console.error('[DuplicateDetector] Get duplicate stats failed:', error);
      return {
        totalCards: 0,
        uniqueFingerprints: 0,
        duplicateGroups: 0,
        totalDuplicates: 0,
        duplicateRate: 0,
        error: error.message
      };
    }
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DuplicateDetector;
} else if (typeof window !== 'undefined') {
  window.DuplicateDetector = DuplicateDetector;
}