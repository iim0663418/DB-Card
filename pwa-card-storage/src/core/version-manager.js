/**
 * 版本管理器 - CORE-02
 * 支援版本遞增、歷史管理與版本清理
 */

class VersionManager {
  constructor(storage) {
    this.storage = storage;
    this.versionFormat = 'semantic'; // semantic: 1.0, 1.1, 1.2
  }

  /**
   * 自動遞增版本號
   * @param {string} cardId - 名片ID
   * @returns {Promise<string>} - 新版本號
   */
  async incrementVersion(cardId) {
    try {
      const card = await this.storage.getCard(cardId);
      if (!card) {
        throw new Error('Card not found');
      }

      const currentVersion = card.currentVersion || 1;
      const newVersion = this.calculateNextVersion(currentVersion);
      
      return newVersion;
    } catch (error) {
      console.error('[VersionManager] Increment version failed:', error);
      throw error;
    }
  }

  /**
   * 計算下一個版本號
   */
  calculateNextVersion(currentVersion) {
    if (typeof currentVersion === 'number') {
      // 語義化版本: 1.0 -> 1.1 -> 1.2
      const major = Math.floor(currentVersion);
      const minor = Math.round((currentVersion - major) * 10);
      const nextMinor = minor + 1;
      
      if (nextMinor >= 10) {
        return major + 1.0;
      } else {
        return parseFloat(`${major}.${nextMinor}`);
      }
    }
    
    // 備用方案：簡單遞增
    return (parseFloat(currentVersion) || 1) + 0.1;
  }

  /**
   * 建立版本快照
   * @param {string} cardId - 名片ID
   * @param {Object} data - 名片資料
   * @param {string} changeType - 變更類型
   * @param {string} description - 變更描述
   * @returns {Promise<Object>} - 版本快照
   */
  async createVersionSnapshot(cardId, data, changeType = 'update', description = '') {
    try {
      return await this.storage.createVersionSnapshot(cardId, data, changeType, description);
    } catch (error) {
      console.error('[VersionManager] Create version snapshot failed:', error);
      throw error;
    }
  }

  /**
   * 獲取版本歷史
   * @param {string} cardId - 名片ID
   * @returns {Promise<Object>} - 版本歷史
   */
  async getVersionHistory(cardId) {
    try {
      return await this.storage.getVersionHistory(cardId);
    } catch (error) {
      console.error('[VersionManager] Get version history failed:', error);
      throw error;
    }
  }

  /**
   * 還原到指定版本
   * @param {string} cardId - 名片ID
   * @param {number} targetVersion - 目標版本
   * @returns {Promise<Object>} - 還原結果
   */
  async restoreToVersion(cardId, targetVersion) {
    try {
      const result = await this.storage.restoreVersion(cardId, targetVersion);
      
      if (result.success) {
        // 建立還原操作的版本快照
        await this.createVersionSnapshot(
          cardId,
          result.data,
          'restore',
          `Restored to version ${targetVersion}`
        );
      }
      
      return result;
    } catch (error) {
      console.error('[VersionManager] Restore to version failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 比較版本差異
   * @param {string} cardId - 名片ID
   * @param {number} version1 - 版本1
   * @param {number} version2 - 版本2
   * @returns {Promise<Object>} - 比較結果
   */
  async compareVersions(cardId, version1, version2) {
    try {
      return await this.storage.compareVersions(cardId, version1, version2);
    } catch (error) {
      console.error('[VersionManager] Compare versions failed:', error);
      throw error;
    }
  }

  /**
   * 清理舊版本
   * @param {string} cardId - 名片ID (可選，不提供則清理所有)
   * @param {number} keepCount - 保留版本數量
   * @returns {Promise<number>} - 清理的版本數量
   */
  async cleanupOldVersions(cardId = null, keepCount = 10) {
    try {
      if (cardId) {
        // 清理特定名片的舊版本
        const history = await this.getVersionHistory(cardId);
        const versionsToDelete = history.versions.slice(keepCount);
        
        let deletedCount = 0;
        for (const version of versionsToDelete) {
          try {
            await this.deleteVersion(cardId, version.version);
            deletedCount++;
          } catch (error) {
            console.warn(`Failed to delete version ${version.version}:`, error);
          }
        }
        
        return deletedCount;
      } else {
        // 清理所有名片的舊版本
        const cards = await this.storage.listCards();
        let totalDeleted = 0;
        
        for (const card of cards) {
          const deleted = await this.cleanupOldVersions(card.id, keepCount);
          totalDeleted += deleted;
        }
        
        return totalDeleted;
      }
    } catch (error) {
      console.error('[VersionManager] Cleanup old versions failed:', error);
      return 0;
    }
  }

  /**
   * 刪除特定版本
   */
  async deleteVersion(cardId, version) {
    try {
      const versionId = `${cardId}_v${version}`;
      
      const transaction = this.storage.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(versionId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[VersionManager] Delete version failed:', error);
      throw error;
    }
  }

  /**
   * 獲取版本統計
   * @param {string} cardId - 名片ID (可選)
   * @returns {Promise<Object>} - 版本統計
   */
  async getVersionStats(cardId = null) {
    try {
      return await this.storage.getVersionStats(cardId);
    } catch (error) {
      console.error('[VersionManager] Get version stats failed:', error);
      throw error;
    }
  }

  /**
   * 匯出版本歷史
   * @param {string} cardId - 名片ID
   * @returns {Promise<Object>} - 匯出結果
   */
  async exportVersionHistory(cardId) {
    try {
      return await this.storage.exportVersionHistory(cardId);
    } catch (error) {
      console.error('[VersionManager] Export version history failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 版本衝突檢測
   * @param {string} cardId - 名片ID
   * @param {number} expectedVersion - 預期版本
   * @returns {Promise<boolean>} - 是否有衝突
   */
  async detectVersionConflict(cardId, expectedVersion) {
    try {
      const card = await this.storage.getCard(cardId);
      if (!card) return false;
      
      const currentVersion = card.currentVersion || 1;
      return currentVersion !== expectedVersion;
    } catch (error) {
      console.error('[VersionManager] Detect version conflict failed:', error);
      return true; // 保守處理，假設有衝突
    }
  }

  /**
   * 合併版本變更
   * @param {string} cardId - 名片ID
   * @param {Object} changes - 變更內容
   * @param {number} baseVersion - 基礎版本
   * @returns {Promise<Object>} - 合併結果
   */
  async mergeVersionChanges(cardId, changes, baseVersion) {
    try {
      // 檢測版本衝突
      const hasConflict = await this.detectVersionConflict(cardId, baseVersion);
      
      if (hasConflict) {
        return {
          success: false,
          conflict: true,
          message: 'Version conflict detected'
        };
      }
      
      // 應用變更
      await this.storage.updateCard(cardId, changes);
      
      // 建立版本快照
      const card = await this.storage.getCard(cardId);
      await this.createVersionSnapshot(cardId, card.data, 'merge', 'Merged changes');
      
      return {
        success: true,
        conflict: false,
        newVersion: card.currentVersion
      };
    } catch (error) {
      console.error('[VersionManager] Merge version changes failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VersionManager;
} else if (typeof window !== 'undefined') {
  window.VersionManager = VersionManager;
}