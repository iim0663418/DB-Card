/**
 * STORAGE-03: IndexedDB 遷移日誌管理
 * 新增 migration_log ObjectStore 與遷移狀態追蹤
 */

class MigrationLogManager {
  constructor(storage) {
    this.storage = storage;
    this.maxLogEntries = 100; // 最大日誌條目數
  }

  /**
   * 建立遷移日誌條目
   * @param {number} migrationVersion - 遷移版本號
   * @param {Object} options - 遷移選項
   * @returns {Promise<string>} 日誌ID
   */
  async createMigrationLog(migrationVersion, options = {}) {
    try {
      const logId = `migration_${migrationVersion}_${Date.now()}`;
      const logEntry = {
        id: logId,
        migrationVersion,
        startTime: new Date(),
        endTime: null,
        status: 'pending',
        affectedCards: options.affectedCards || 0,
        processedCards: 0,
        errors: [],
        checksums: {
          beforeMigration: options.beforeChecksum || '',
          afterMigration: ''
        },
        rollbackData: null,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          dbVersion: this.storage.dbVersion,
          reason: options.reason || 'Unknown'
        }
      };

      await this.storage.safeTransaction(['migration_log'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('migration_log');
        
        return new Promise((resolve, reject) => {
          const request = store.put(logEntry);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(`Failed to create migration log: ${request.error?.message || 'Unknown error'}`));
        });
      });

      console.log(`[MigrationLogManager] Created migration log: ${logId}`);
      return logId;
    } catch (error) {
      console.error('[MigrationLogManager] Create migration log failed:', error);
      throw error;
    }
  }

  /**
   * 更新遷移日誌狀態
   * @param {string} logId - 日誌ID
   * @param {Object} updates - 更新資料
   * @returns {Promise<boolean>} 更新結果
   */
  async updateMigrationLog(logId, updates) {
    try {
      await this.storage.safeTransaction(['migration_log'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('migration_log');
        
        // 獲取現有日誌
        const existingLog = await new Promise((resolve, reject) => {
          const request = store.get(logId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        if (!existingLog) {
          throw new Error(`Migration log ${logId} not found`);
        }

        // 合併更新
        const updatedLog = {
          ...existingLog,
          ...updates,
          lastUpdated: new Date()
        };

        // 特殊處理錯誤陣列
        if (updates.errors && Array.isArray(updates.errors)) {
          updatedLog.errors = [...(existingLog.errors || []), ...updates.errors];
        }

        // 儲存更新
        return new Promise((resolve, reject) => {
          const request = store.put(updatedLog);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      return true;
    } catch (error) {
      console.error('[MigrationLogManager] Update migration log failed:', error);
      return false;
    }
  }

  /**
   * 完成遷移日誌
   * @param {string} logId - 日誌ID
   * @param {string} status - 最終狀態 ('completed', 'failed', 'rollback')
   * @param {Object} finalData - 最終資料
   * @returns {Promise<boolean>} 完成結果
   */
  async completeMigrationLog(logId, status, finalData = {}) {
    try {
      const updates = {
        status,
        endTime: new Date(),
        ...finalData
      };

      const result = await this.updateMigrationLog(logId, updates);
      
      if (result) {
        console.log(`[MigrationLogManager] Migration log ${logId} completed with status: ${status}`);
        
        // 記錄到安全日誌
        if (window.SecurityDataHandler) {
          window.SecurityDataHandler.secureLog('info', 'Migration log completed', {
            logId,
            status,
            operation: 'completeMigrationLog'
          });
        }
      }

      return result;
    } catch (error) {
      console.error('[MigrationLogManager] Complete migration log failed:', error);
      return false;
    }
  }

  /**
   * 記錄遷移錯誤
   * @param {string} logId - 日誌ID
   * @param {string} cardId - 名片ID
   * @param {Error} error - 錯誤物件
   * @returns {Promise<boolean>} 記錄結果
   */
  async logMigrationError(logId, cardId, error) {
    try {
      const errorEntry = {
        cardId,
        error: error.message,
        timestamp: new Date(),
        stack: error.stack?.substring(0, 500) // 限制堆疊追蹤長度
      };

      return await this.updateMigrationLog(logId, {
        errors: [errorEntry]
      });
    } catch (logError) {
      console.error('[MigrationLogManager] Log migration error failed:', logError);
      return false;
    }
  }

  /**
   * 獲取遷移日誌
   * @param {string} logId - 日誌ID
   * @returns {Promise<Object|null>} 日誌資料
   */
  async getMigrationLog(logId) {
    try {
      return await this.storage.safeTransaction(['migration_log'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('migration_log');
        
        return new Promise((resolve, reject) => {
          const request = store.get(logId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('[MigrationLogManager] Get migration log failed:', error);
      return null;
    }
  }

  /**
   * 列出遷移日誌
   * @param {Object} options - 查詢選項
   * @returns {Promise<Array>} 日誌列表
   */
  async listMigrationLogs(options = {}) {
    try {
      const limit = options.limit || 50;
      const status = options.status;
      const migrationVersion = options.migrationVersion;

      return await this.storage.safeTransaction(['migration_log'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('migration_log');
        let cursor;

        // 根據查詢條件選擇索引
        if (migrationVersion) {
          const index = store.index('migrationVersion');
          cursor = index.openCursor(IDBKeyRange.only(migrationVersion));
        } else if (status) {
          const index = store.index('status');
          cursor = index.openCursor(IDBKeyRange.only(status));
        } else {
          cursor = store.openCursor(null, 'prev'); // 最新的在前
        }

        const logs = [];
        let count = 0;

        return new Promise((resolve, reject) => {
          cursor.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && count < limit) {
              const log = cursor.value;
              
              // 應用額外篩選
              if (this.matchesLogFilter(log, options)) {
                logs.push(log);
                count++;
              }
              
              cursor.continue();
            } else {
              resolve(logs);
            }
          };
          cursor.onerror = () => reject(cursor.error);
        });
      });
    } catch (error) {
      console.error('[MigrationLogManager] List migration logs failed:', error);
      return [];
    }
  }

  /**
   * 獲取遷移統計
   * @returns {Promise<Object>} 統計資料
   */
  async getMigrationStats() {
    try {
      const logs = await this.listMigrationLogs({ limit: 1000 });
      
      const stats = {
        totalMigrations: logs.length,
        completedMigrations: 0,
        failedMigrations: 0,
        pendingMigrations: 0,
        rollbackMigrations: 0,
        totalProcessedCards: 0,
        totalErrors: 0,
        averageDuration: 0,
        lastMigration: null,
        migrationsByVersion: {},
        errorsByType: {}
      };

      let totalDuration = 0;
      let completedCount = 0;

      logs.forEach(log => {
        // 狀態統計
        switch (log.status) {
          case 'completed':
            stats.completedMigrations++;
            break;
          case 'failed':
            stats.failedMigrations++;
            break;
          case 'pending':
            stats.pendingMigrations++;
            break;
          case 'rollback':
            stats.rollbackMigrations++;
            break;
        }

        // 處理卡片統計
        stats.totalProcessedCards += log.processedCards || 0;
        stats.totalErrors += (log.errors || []).length;

        // 持續時間統計
        if (log.endTime && log.startTime) {
          const duration = new Date(log.endTime) - new Date(log.startTime);
          totalDuration += duration;
          completedCount++;
        }

        // 版本統計
        const version = log.migrationVersion;
        stats.migrationsByVersion[version] = (stats.migrationsByVersion[version] || 0) + 1;

        // 錯誤類型統計
        if (log.errors && log.errors.length > 0) {
          log.errors.forEach(error => {
            const errorType = this.categorizeError(error.error);
            stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
          });
        }

        // 最後遷移
        if (!stats.lastMigration || new Date(log.startTime) > new Date(stats.lastMigration.startTime)) {
          stats.lastMigration = log;
        }
      });

      // 計算平均持續時間
      if (completedCount > 0) {
        stats.averageDuration = Math.round(totalDuration / completedCount);
      }

      return stats;
    } catch (error) {
      console.error('[MigrationLogManager] Get migration stats failed:', error);
      return {
        totalMigrations: 0,
        error: error.message
      };
    }
  }

  /**
   * 清理舊的遷移日誌
   * @param {Object} options - 清理選項
   * @returns {Promise<Object>} 清理結果
   */
  async cleanupOldLogs(options = {}) {
    try {
      const daysOld = options.daysOld || 90;
      const keepMinimum = options.keepMinimum || 10;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const allLogs = await this.listMigrationLogs({ limit: 1000 });
      
      // 按時間排序，最新的在前
      allLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      
      // 保留最新的指定數量，其餘的檢查是否過期
      const logsToKeep = allLogs.slice(0, keepMinimum);
      const candidatesForDeletion = allLogs.slice(keepMinimum);
      
      const logsToDelete = candidatesForDeletion.filter(log => 
        new Date(log.startTime) < cutoffDate
      );

      if (logsToDelete.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: '無需清理的日誌'
        };
      }

      // 執行刪除
      let deletedCount = 0;
      await this.storage.safeTransaction(['migration_log'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('migration_log');
        
        for (const log of logsToDelete) {
          try {
            await new Promise((resolve, reject) => {
              const request = store.delete(log.id);
              request.onsuccess = () => {
                deletedCount++;
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            console.warn(`[MigrationLogManager] Failed to delete log ${log.id}:`, error);
          }
        }
      });

      console.log(`[MigrationLogManager] Cleaned up ${deletedCount} old migration logs`);
      
      return {
        success: true,
        deletedCount,
        totalLogs: allLogs.length,
        remainingLogs: allLogs.length - deletedCount
      };
    } catch (error) {
      console.error('[MigrationLogManager] Cleanup old logs failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 工具方法：檢查日誌是否符合篩選條件
   */
  matchesLogFilter(log, options) {
    // 日期範圍篩選
    if (options.startDate && new Date(log.startTime) < options.startDate) {
      return false;
    }
    if (options.endDate && new Date(log.startTime) > options.endDate) {
      return false;
    }

    // 錯誤數量篩選
    if (options.hasErrors !== undefined) {
      const hasErrors = (log.errors || []).length > 0;
      if (options.hasErrors !== hasErrors) {
        return false;
      }
    }

    return true;
  }

  /**
   * 工具方法：分類錯誤類型
   */
  categorizeError(errorMessage) {
    if (!errorMessage) return 'unknown';
    
    const message = errorMessage.toLowerCase();
    
    if (message.includes('fingerprint')) return 'fingerprint_error';
    if (message.includes('checksum')) return 'checksum_error';
    if (message.includes('transaction')) return 'transaction_error';
    if (message.includes('timeout')) return 'timeout_error';
    if (message.includes('storage') || message.includes('quota')) return 'storage_error';
    if (message.includes('network')) return 'network_error';
    
    return 'general_error';
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MigrationLogManager;
} else if (typeof window !== 'undefined') {
  window.MigrationLogManager = MigrationLogManager;
}