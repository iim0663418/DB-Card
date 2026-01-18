/**
 * 重複檢測器 - CORE-02
 * 包含 detectDuplicates() 和修正的 handleDuplicate() 方法
 */

class DuplicateDetector {
  constructor(storage) {
    this.storage = storage;
    this.fingerprintGenerator = null;
    
    // Initialize SecureLogger for CWE-117 protection
    if (typeof window !== 'undefined' && window.SecureLogger) {
      this.secureLogger = new window.SecureLogger({ logLevel: 'INFO', enableMasking: true });
    } else {
      // Fallback to console logging with basic sanitization
      this.secureLogger = {
        info: (msg, ctx) => console.log(`[DuplicateDetector] ${msg}`, ctx),
        warn: (msg, ctx) => console.warn(`[DuplicateDetector] ${msg}`, ctx),
        error: (msg, ctx) => console.error(`[DuplicateDetector] ${msg}`, ctx)
      };
    }
  }

  /**
   * 初始化重複檢測器
   */
  async initialize() {
    try {
      // 初始化指紋生成器
      if (typeof ContentFingerprintGenerator !== 'undefined') {
        this.fingerprintGenerator = new ContentFingerprintGenerator();
      } else {
        this.secureLogger.warn('ContentFingerprintGenerator not available', { 
          component: 'DuplicateDetector' 
        });
      }
    } catch (error) {
      this.secureLogger.error('Initialization failed', { 
        error: error.message, 
        component: 'DuplicateDetector' 
      });
    }
  }

  /**
   * 檢測重複名片
   * @param {Object} cardData - 名片資料
   * @returns {Promise<Object>} - 重複檢測結果
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
        existingCards,
        duplicateCount: existingCards.length,
        suggestions: this.generateSuggestions(existingCards)
      };
      
      return result;
    } catch (error) {
      this.secureLogger.error('Detect duplicates failed', { 
        error: error.message, 
        component: 'DuplicateDetector' 
      });
      return {
        isDuplicate: false,
        fingerprint: null,
        existingCards: [],
        duplicateCount: 0,
        error: error.message
      };
    }
  }

  /**
   * CRS-V31-007: 修正重複處理邏輯
   * @param {Object} cardData - 名片資料
   * @param {string} action - 處理動作：'skip', 'overwrite', 'version'
   * @param {string} existingCardId - 現有名片ID（可選）
   * @returns {Promise<Object>} - 處理結果
   */
  async handleDuplicate(cardData, action, existingCardId = null) {
    try {
      switch (action) {
        case 'skip':
          return {
            success: true,
            action: 'skip',
            message: '跳過重複名片',
            cardId: existingCardId
          };

        case 'overwrite':
          if (!existingCardId) {
            throw new Error('Overwrite action requires existing card ID');
          }
          
          // 更新現有名片
          await this.storage.updateCard(existingCardId, cardData);
          
          return {
            success: true,
            action: 'overwrite',
            message: '已覆蓋現有名片',
            cardId: existingCardId
          };

        case 'version':
          // CRS-V31-008: 修正版本建立邏輯
          if (existingCardId) {
            // 更新現有名片並建立新版本
            await this.storage.updateCard(existingCardId, cardData);
            return {
              success: true,
              action: 'version',
              message: '已建立新版本',
              cardId: existingCardId
            };
          } else {
            // 建立新名片
            const newCardId = await this.storage.storeCard(cardData);
            return {
              success: true,
              action: 'version',
              message: '已建立新名片',
              cardId: newCardId
            };
          }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.secureLogger.error('Handle duplicate failed', { 
        action, 
        error: error.message, 
        component: 'DuplicateDetector' 
      });
      return {
        success: false,
        action,
        error: error.message
      };
    }
  }

  /**
   * 生成指紋（使用專用生成器或備用方案）
   * @param {Object} cardData - 名片資料
   * @returns {Promise<string>} - 指紋字串
   */
  async generateFingerprint(cardData) {
    try {
      if (this.fingerprintGenerator) {
        return await this.fingerprintGenerator.generateFingerprint(cardData);
      }
      
      // 備用方案：簡單指紋生成
      const name = this.normalizeName(cardData.name);
      const email = this.normalizeEmail(cardData.email);
      const content = `${name}|${email}`;
      
      // 使用 storage 的 calculateChecksum 方法
      const hash = await this.storage.calculateChecksum({ content });
      return `fingerprint_${hash.substring(0, 16)}`;
    } catch (error) {
      this.secureLogger.error('Generate fingerprint failed', { 
        error: error.message, 
        component: 'DuplicateDetector' 
      });
      // 最終備用方案
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      return `fingerprint_fallback_${timestamp}_${random}`;
    }
  }

  /**
   * 標準化姓名
   * @param {string|Object} name - 姓名資料
   * @returns {string} - 標準化後的姓名
   */
  normalizeName(name) {
    if (!name) return '';
    
    if (typeof name === 'string') {
      if (name.includes('~')) {
        const [chinese] = name.split('~');
        return chinese.trim();
      }
      return name.trim();
    }
    
    if (typeof name === 'object' && name !== null) {
      if (name.zh) return String(name.zh).trim();
      if (name.en) return String(name.en).trim();
    }
    
    return String(name || '').trim();
  }

  /**
   * 標準化電子郵件
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
    
    return emailStr.toLowerCase().trim().replace(/\s+/g, '');
  }

  /**
   * 生成重複處理建議
   * @param {Array} existingCards - 現有名片陣列
   * @returns {Array} - 建議陣列
   */
  generateSuggestions(existingCards) {
    if (!existingCards || existingCards.length === 0) {
      return [];
    }

    const suggestions = [];

    // 基本建議
    suggestions.push({
      action: 'skip',
      title: '跳過重複',
      description: '保持現有名片不變',
      recommended: existingCards.length === 1
    });

    suggestions.push({
      action: 'overwrite',
      title: '覆蓋現有',
      description: '用新資料替換現有名片',
      recommended: false
    });

    suggestions.push({
      action: 'version',
      title: '建立新版本',
      description: '保留歷史版本，建立新版本',
      recommended: existingCards.length > 0
    });

    return suggestions;
  }

  /**
   * 批量重複檢測
   * @param {Array<Object>} cardDataArray - 名片資料陣列
   * @returns {Promise<Array<Object>>} - 檢測結果陣列
   */
  async detectBatchDuplicates(cardDataArray) {
    if (!Array.isArray(cardDataArray)) {
      throw new Error('Input must be an array');
    }

    const results = [];
    
    for (const cardData of cardDataArray) {
      try {
        const result = await this.detectDuplicates(cardData);
        results.push({ cardData, ...result, success: true });
      } catch (error) {
        this.secureLogger.error('Batch detection failed for card', { 
          error: error.message, 
          component: 'DuplicateDetector' 
        });
        results.push({
          cardData,
          success: false,
          error: error.message,
          isDuplicate: false,
          existingCards: []
        });
      }
    }

    return results;
  }

  /**
   * 獲取重複統計
   * @returns {Promise<Object>} - 重複統計資訊
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
      let duplicateGroups = 0;
      let duplicateCards = 0;
      
      for (const [fingerprint, cards] of fingerprintMap) {
        if (cards.length > 1) {
          duplicateGroups++;
          duplicateCards += cards.length - 1; // 減去原始名片
        }
      }
      
      return {
        totalCards: allCards.length,
        uniqueFingerprints: fingerprintMap.size,
        duplicateGroups,
        duplicateCards,
        duplicateRate: allCards.length > 0 ? (duplicateCards / allCards.length * 100).toFixed(2) : 0
      };
    } catch (error) {
      this.secureLogger.error('Get duplicate stats failed', { 
        error: error.message, 
        component: 'DuplicateDetector' 
      });
      return {
        totalCards: 0,
        uniqueFingerprints: 0,
        duplicateGroups: 0,
        duplicateCards: 0,
        duplicateRate: 0,
        error: error.message
      };
    }
  }

  /**
   * 清理重複名片
   * @param {Object} options - 清理選項
   * @returns {Promise<Object>} - 清理結果
   */
  async cleanupDuplicates(options = {}) {
    try {
      const {
        keepLatest = true,
        dryRun = false,
        maxDuplicates = 5
      } = options;

      const allCards = await this.storage.listCards();
      const fingerprintMap = new Map();
      
      // 分組相同指紋的名片
      for (const card of allCards) {
        const fingerprint = card.fingerprint;
        if (fingerprint) {
          if (!fingerprintMap.has(fingerprint)) {
            fingerprintMap.set(fingerprint, []);
          }
          fingerprintMap.get(fingerprint).push(card);
        }
      }
      
      const cleanupResults = [];
      let totalCleaned = 0;
      
      for (const [fingerprint, cards] of fingerprintMap) {
        if (cards.length > 1) {
          // 排序名片（最新的在前）
          cards.sort((a, b) => new Date(b.modified) - new Date(a.modified));
          
          // 決定要保留和刪除的名片
          const toKeep = cards.slice(0, 1); // 保留最新的
          const toDelete = cards.slice(1, maxDuplicates); // 刪除其餘的，但限制數量
          
          if (!dryRun) {
            // 實際刪除重複名片
            for (const card of toDelete) {
              try {
                await this.storage.deleteCard(card.id);
                totalCleaned++;
              } catch (error) {
                this.secureLogger.error('Failed to delete duplicate card', { 
                  cardId: card.id, 
                  error: error.message, 
                  component: 'DuplicateDetector' 
                });
              }
            }
          }
          
          cleanupResults.push({
            fingerprint,
            totalCards: cards.length,
            kept: toKeep.length,
            deleted: toDelete.length,
            cards: dryRun ? cards : toKeep
          });
        }
      }
      
      return {
        success: true,
        dryRun,
        totalCleaned,
        duplicateGroups: cleanupResults.length,
        results: cleanupResults
      };
    } catch (error) {
      this.secureLogger.error('Cleanup duplicates failed', { 
        error: error.message, 
        component: 'DuplicateDetector' 
      });
      return {
        success: false,
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