/**
 * 批量資料遷移器 - CRS-V31-005 核心實作
 * 瀏覽器環境批量處理與進度監控
 */

class BatchDataMigrator {
  constructor(storage, validator) {
    this.storage = storage;
    this.validator = validator;
    this.batchSize = 50; // 批次處理大小
    this.maxRetries = 3; // 最大重試次數
    
    // Initialize SecureLogger for CWE-117 protection
    if (typeof window !== 'undefined' && window.SecureLogger) {
      this.secureLogger = new window.SecureLogger({ logLevel: 'INFO', enableMasking: true });
    } else {
      // Fallback to console logging with basic sanitization
      this.secureLogger = {
        info: (msg, ctx) => console.log(`[BatchDataMigrator] ${msg}`, ctx),
        warn: (msg, ctx) => console.warn(`[BatchDataMigrator] ${msg}`, ctx),
        error: (msg, ctx) => console.error(`[BatchDataMigrator] ${msg}`, ctx)
      };
    }
  }

  /**
   * 批量生成指紋
   * @param {Array} cards - 名片陣列
   * @returns {Promise<MigrationResult>}
   */
  async batchGenerateFingerprints(cards = null) {
    try {
      const cardsToProcess = cards || await this.storage.listCards();
      const totalCards = cardsToProcess.length;
      let processedCount = 0;
      let errorCount = 0;
      const errors = [];

      this.secureLogger.info('Starting fingerprint generation', { totalCards, component: 'BatchDataMigrator' });

      // 分批處理
      for (let i = 0; i < cardsToProcess.length; i += this.batchSize) {
        const batch = cardsToProcess.slice(i, i + this.batchSize);
        
        try {
          await this.processFingerprintBatch(batch);
          processedCount += batch.length;
          
          // 進度回報
          const progress = Math.round((processedCount / totalCards) * 100);
          this.secureLogger.info('Batch processing progress', { 
            progress, 
            processedCount, 
            totalCards, 
            component: 'BatchDataMigrator' 
          });
          
          // 避免阻塞 UI
          await this.sleep(10);
        } catch (batchError) {
          this.secureLogger.error('Batch processing failed', { 
            error: batchError.message, 
            batchIndex: i / this.batchSize + 1,
            component: 'BatchDataMigrator' 
          });
          errorCount += batch.length;
          errors.push({
            batch: i / this.batchSize + 1,
            error: batchError.message,
            affectedCards: batch.map(c => c.id)
          });
        }
      }

      return {
        success: errorCount === 0,
        totalCards,
        processedCount,
        errorCount,
        errors,
        duration: Date.now()
      };
    } catch (error) {
      this.secureLogger.error('Batch migration failed', { 
        error: error.message, 
        component: 'BatchDataMigrator' 
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 處理指紋生成批次
   */
  async processFingerprintBatch(batch) {
    const promises = batch.map(async (card) => {
      let retries = 0;
      
      while (retries < this.maxRetries) {
        try {
          // 檢查是否已有指紋
          if (card.fingerprint && card.fingerprint.startsWith('fingerprint_')) {
            return; // 跳過已有指紋的名片
          }

          // 生成指紋
          const fingerprint = await this.storage.generateFingerprintSafe(card.data);
          
          // 更新名片
          await this.storage.safeTransaction(['cards'], 'readwrite', async (transaction) => {
            const store = transaction.objectStore('cards');
            card.fingerprint = fingerprint;
            card.migrationStatus = 'completed';
            card.migrationVersion = this.storage.dbVersion;
            store.put(card);
          });

          return;
        } catch (error) {
          retries++;
          if (retries >= this.maxRetries) {
            throw new Error(`Failed to process card ${card.id} after ${this.maxRetries} retries: ${error.message}`);
          }
          await this.sleep(100 * retries); // 指數退避
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * 驗證遷移結果
   */
  async validateMigrationResult() {
    try {
      const cards = await this.storage.listCards();
      const result = {
        isValid: true,
        totalCards: cards.length,
        cardsWithFingerprints: 0,
        cardsWithoutFingerprints: 0,
        invalidFingerprints: 0,
        issues: []
      };

      for (const card of cards) {
        if (card.fingerprint) {
          if (card.fingerprint.startsWith('fingerprint_') && card.fingerprint.length === 75) {
            result.cardsWithFingerprints++;
          } else {
            result.invalidFingerprints++;
            result.issues.push(`Card ${card.id} has invalid fingerprint format`);
          }
        } else {
          result.cardsWithoutFingerprints++;
          result.issues.push(`Card ${card.id} missing fingerprint`);
        }
      }

      if (result.cardsWithoutFingerprints > 0 || result.invalidFingerprints > 0) {
        result.isValid = false;
      }

      return result;
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * 批量處理進度監控
   */
  async monitorBatchProgress(totalItems, processedItems) {
    const progress = Math.round((processedItems / totalItems) * 100);
    
    // 發送進度事件（如果有監聽器）
    if (this.onProgress) {
      this.onProgress({
        total: totalItems,
        processed: processedItems,
        percentage: progress,
        timestamp: new Date()
      });
    }
    
    return progress;
  }

  /**
   * 設定進度回調
   */
  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  /**
   * 批量處理錯誤恢復
   */
  async recoverFromBatchError(failedBatch, error) {
    this.secureLogger.warn('Recovering from batch error', { 
      error: error.message, 
      component: 'BatchDataMigrator' 
    });
    
    // 嘗試單個處理失敗的批次
    const recoveredCards = [];
    const permanentFailures = [];
    
    for (const card of failedBatch) {
      try {
        await this.processFingerprintBatch([card]);
        recoveredCards.push(card.id);
      } catch (singleError) {
        permanentFailures.push({
          cardId: card.id,
          error: singleError.message
        });
      }
    }
    
    return {
      recovered: recoveredCards.length,
      failed: permanentFailures.length,
      failures: permanentFailures
    };
  }

  /**
   * 估算批量處理時間
   */
  estimateProcessingTime(cardCount) {
    const cardsPerSecond = 50; // 目標效能
    const estimatedSeconds = Math.ceil(cardCount / cardsPerSecond);
    
    return {
      estimatedSeconds,
      estimatedMinutes: Math.ceil(estimatedSeconds / 60),
      cardCount,
      batchCount: Math.ceil(cardCount / this.batchSize)
    };
  }

  /**
   * 清理遷移暫存資料
   */
  async cleanupMigrationData() {
    try {
      // 清理暫存的遷移狀態
      const cards = await this.storage.listCards();
      let cleanedCount = 0;
      
      for (const card of cards) {
        if (card.migrationStatus === 'pending') {
          delete card.migrationStatus;
          await this.storage.updateCard(card.id, card.data);
          cleanedCount++;
        }
      }
      
      this.secureLogger.info('Migration cleanup completed', { 
        cleanedCount, 
        component: 'BatchDataMigrator' 
      });
      return cleanedCount;
    } catch (error) {
      this.secureLogger.error('Migration cleanup failed', { 
        error: error.message, 
        component: 'BatchDataMigrator' 
      });
      return 0;
    }
  }

  // 輔助方法
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchDataMigrator;
} else if (typeof window !== 'undefined') {
  window.BatchDataMigrator = BatchDataMigrator;
}