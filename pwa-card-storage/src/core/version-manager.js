/**
 * VERSION-01: 版本管理器實作
 * 語義化版本計算與版本快照建立
 */

class VersionManager {
  constructor(storage) {
    this.storage = storage;
    this.maxVersions = 10; // 每張名片最大版本數
    this.semanticVersionPattern = /^(\d+)\.(\d+)$/; // 支援 "1.0", "1.1" 格式
  }

  /**
   * 建立版本快照
   * @param {string} cardId - 名片ID
   * @param {Object} data - 名片資料
   * @param {string} changeType - 變更類型 ('create', 'update', 'restore')
   * @param {string} description - 變更描述
   * @returns {Promise<Object>} 版本快照物件
   */
  async createVersionSnapshot(cardId, data, changeType = 'update', description = '') {
    try {
      // 輸入驗證
      if (!cardId || !data) {
        throw new Error('CardId and data are required');
      }

      // 獲取當前名片資訊
      const card = await this.storage.getCard(cardId);
      const currentVersion = card ? card.currentVersion : 1;
      
      // 計算語義化版本號
      const semanticVersion = await this.calculateNextSemanticVersion(cardId, changeType);
      
      // 生成版本快照
      const versionId = `${cardId}_v${currentVersion}`;
      const fingerprint = await this.storage.generateFingerprintSafe(data);
      
      const versionSnapshot = {
        id: versionId,
        cardId,
        version: currentVersion,
        semanticVersion,
        data: JSON.parse(JSON.stringify(data)), // 深度複製
        timestamp: new Date(),
        changeType,
        description: description || this.generateChangeDescription(changeType, data),
        fingerprint,
        checksum: await this.storage.calculateChecksum(data),
        migrationChecksum: await this.calculateMigrationChecksum(data)
      };

      // 儲存版本快照
      await this.storage.safeTransaction(['versions'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('versions');
        
        return new Promise((resolve, reject) => {
          const request = store.put(versionSnapshot);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(`Failed to create version snapshot: ${request.error?.message || 'Unknown error'}`));
        });
      });

      // 清理舊版本
      await this.cleanupOldVersions(cardId);
      
      // 安全日誌
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('info', 'Version snapshot created', {
          cardId,
          version: currentVersion,
          semanticVersion,
          changeType,
          operation: 'createVersionSnapshot'
        });
      }

      return versionSnapshot;
    } catch (error) {
      console.error('[VersionManager] Create version snapshot failed:', error);
      
      // 安全日誌記錄錯誤
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('error', 'Version snapshot creation failed', {
          cardId,
          error: error.message,
          operation: 'createVersionSnapshot'
        });
      }
      
      throw error;
    }
  }

  /**
   * 計算下一個語義化版本號
   * @param {string} cardId - 名片ID
   * @param {string} changeType - 變更類型
   * @returns {Promise<string>} 語義化版本號
   */
  async calculateNextSemanticVersion(cardId, changeType) {
    try {
      const history = await this.getVersionHistory(cardId);
      
      if (history.versions.length === 0) {
        return '1.0'; // 初始版本
      }

      // 獲取最新版本號
      const latestVersion = history.versions[0].semanticVersion || '1.0';
      const match = latestVersion.match(this.semanticVersionPattern);
      
      if (!match) {
        console.warn(`[VersionManager] Invalid semantic version format: ${latestVersion}, using 1.0`);
        return '1.0';
      }

      let major = parseInt(match[1]);
      let minor = parseInt(match[2]);

      // 根據變更類型決定版本遞增策略
      switch (changeType) {
        case 'create':
          return '1.0';
        case 'restore':
          // 還原操作增加主版本號
          major += 1;
          minor = 0;
          break;
        case 'update':
        default:
          // 一般更新增加次版本號
          minor += 1;
          // 次版本號達到10時，主版本號+1，次版本號歸零
          if (minor >= 10) {
            major += 1;
            minor = 0;
          }
          break;
      }

      return `${major}.${minor}`;
    } catch (error) {
      console.error('[VersionManager] Calculate semantic version failed:', error);
      return '1.0'; // 備用版本號
    }
  }

  /**
   * VERSION-02: 擴展版本歷史查詢與比較
   * @param {string} cardId - 名片ID
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>} 增強的版本歷史物件
   */
  async getVersionHistory(cardId, options = {}) {
    try {
      if (!this.storage.db) {
        throw new Error('Database not initialized');
      }

      // 資料過濾：不洩露刪除版本
      const includeDeleted = options.includeDeleted === true;
      const limit = options.limit || this.maxVersions;
      const startDate = options.startDate;
      const endDate = options.endDate;

      const versions = await this.storage.safeTransaction(['versions'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('versions');
        const index = store.index('cardId');
        
        return new Promise((resolve, reject) => {
          const request = index.getAll(cardId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      // 應用過濾條件
      let filteredVersions = versions.filter(version => {
        // 過濾刪除版本
        if (!includeDeleted && version.deleted) {
          return false;
        }
        
        // 日期範圍過濾
        if (startDate && version.timestamp < startDate) {
          return false;
        }
        if (endDate && version.timestamp > endDate) {
          return false;
        }
        
        return true;
      });

      // 按版本號排序（最新的在前）
      filteredVersions.sort((a, b) => b.version - a.version);
      
      // 應用數量限制
      if (limit > 0) {
        filteredVersions = filteredVersions.slice(0, limit);
      }

      // VERSION-02: 計算版本統計與分析
      const versionStats = this.calculateVersionStats(filteredVersions);
      const changeFrequency = this.calculateChangeFrequency(filteredVersions);
      const versionTrends = this.analyzeVersionTrends(filteredVersions);

      return {
        cardId,
        versions: filteredVersions,
        currentVersion: filteredVersions.length > 0 ? filteredVersions[0].version : 0,
        totalVersions: filteredVersions.length,
        maxVersions: this.maxVersions,
        latestSemanticVersion: filteredVersions.length > 0 ? filteredVersions[0].semanticVersion : '1.0',
        
        // VERSION-02: 新增的分析功能
        statistics: versionStats,
        changeFrequency,
        trends: versionTrends,
        
        // 查詢元資料
        query: {
          includeDeleted,
          limit,
          startDate,
          endDate,
          executedAt: new Date()
        }
      };
    } catch (error) {
      console.error('[VersionManager] Get version history failed:', error);
      return {
        cardId,
        versions: [],
        currentVersion: 0,
        totalVersions: 0,
        maxVersions: this.maxVersions,
        latestSemanticVersion: '1.0',
        statistics: null,
        changeFrequency: null,
        trends: null,
        error: error.message
      };
    }
  }

  /**
   * 還原到指定版本
   * @param {string} cardId - 名片ID
   * @param {number} targetVersion - 目標版本號
   * @returns {Promise<Object>} 還原結果
   */
  async restoreToVersion(cardId, targetVersion) {
    try {
      // 版本驗證：防止版本回滾攻擊
      if (!cardId || !targetVersion || targetVersion < 1) {
        throw new Error('Invalid cardId or targetVersion');
      }

      // 授權檢查
      if (window.SecurityAuthHandler) {
        const authResult = window.SecurityAuthHandler.validateAccess('version-control', 'restore', {
          userId: 'current-user',
          resourceId: cardId,
          targetVersion,
          timestamp: Date.now()
        });
        
        if (authResult && !authResult.authorized) {
          const getText = (key, fallback) => {
            if (window.languageManager && window.languageManager.getText) {
              return window.languageManager.getText(key, null, { fallback });
            }
            return fallback;
          };
          throw new Error(`${getText('version.restore.denied', '版本還原被拒絕')}: ${authResult.reason}`);
        }
      }

      // 獲取目標版本快照
      const versionSnapshot = await this.getVersionSnapshot(cardId, targetVersion);
      if (!versionSnapshot) {
        throw new Error(`Version ${targetVersion} not found for card ${cardId}`);
      }

      // 資料完整性驗證：校驗和驗證
      const calculatedChecksum = await this.storage.calculateChecksum(versionSnapshot.data);
      if (calculatedChecksum !== versionSnapshot.checksum) {
        console.warn('[VersionManager] Version checksum mismatch, data may be corrupted');
        // 不阻斷還原，但記錄警告
      }

      // 執行還原操作
      await this.storage.updateCard(cardId, versionSnapshot.data);

      // 建立還原版本快照
      const getText = (key, fallback) => {
        if (window.languageManager && window.languageManager.getText) {
          return window.languageManager.getText(key, null, { fallback });
        }
        return fallback;
      };
      
      await this.createVersionSnapshot(
        cardId, 
        versionSnapshot.data, 
        'restore', 
        `${getText('version.restored.to', 'Restored to version')} ${targetVersion} (${versionSnapshot.semanticVersion})`
      );

      // 安全日誌
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('info', 'Version restored successfully', {
          cardId,
          targetVersion,
          semanticVersion: versionSnapshot.semanticVersion,
          operation: 'restoreToVersion'
        });
      }

      return {
        success: true,
        restoredVersion: targetVersion,
        semanticVersion: versionSnapshot.semanticVersion,
        data: versionSnapshot.data,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[VersionManager] Restore version failed:', error);
      
      // 安全日誌記錄錯誤
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('error', 'Version restore failed', {
          cardId,
          targetVersion,
          error: error.message,
          operation: 'restoreToVersion'
        });
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * VERSION-02: 增強版本比較與差異計算
   * @param {string} cardId - 名片ID
   * @param {number} version1 - 版本1
   * @param {number} version2 - 版本2
   * @param {Object} options - 比較選項
   * @returns {Promise<Object>} 增強的版本比較結果
   */
  async compareVersions(cardId, version1, version2, options = {}) {
    try {
      const snapshot1 = await this.getVersionSnapshot(cardId, version1);
      const snapshot2 = await this.getVersionSnapshot(cardId, version2);
      
      if (!snapshot1 || !snapshot2) {
        throw new Error('One or both versions not found');
      }

      // VERSION-02: 增強的差異計算
      const differences = this.calculateEnhancedDifferences(snapshot1.data, snapshot2.data, options);
      const similarity = this.calculateSimilarity(snapshot1.data, snapshot2.data);
      const impactAnalysis = this.analyzeChangeImpact(differences);
      
      return {
        cardId,
        version1: {
          number: version1,
          semantic: snapshot1.semanticVersion,
          timestamp: snapshot1.timestamp,
          changeType: snapshot1.changeType,
          description: snapshot1.description
        },
        version2: {
          number: version2,
          semantic: snapshot2.semanticVersion,
          timestamp: snapshot2.timestamp,
          changeType: snapshot2.changeType,
          description: snapshot2.description
        },
        
        // 基本比較結果
        differences,
        totalChanges: differences.length,
        changeTypes: [...new Set(differences.map(d => d.changeType))],
        
        // VERSION-02: 新增的分析功能
        similarity: {
          score: similarity,
          level: this.getSimilarityLevel(similarity)
        },
        impact: impactAnalysis,
        
        // 時間分析
        timespan: {
          duration: snapshot2.timestamp - snapshot1.timestamp,
          durationHuman: this.formatDuration(snapshot2.timestamp - snapshot1.timestamp)
        },
        
        // 比較元資料
        comparison: {
          direction: version2 > version1 ? 'forward' : 'backward',
          versionGap: Math.abs(version2 - version1),
          comparedAt: new Date(),
          options
        }
      };
    } catch (error) {
      console.error('[VersionManager] Compare versions failed:', error);
      throw error;
    }
  }

  /**
   * 清理舊版本
   * @param {string} cardId - 名片ID
   */
  async cleanupOldVersions(cardId) {
    try {
      const history = await this.getVersionHistory(cardId);
      
      if (history.versions.length <= this.maxVersions) {
        return; // 不需要清理
      }

      // 保留最新的指定數量版本
      const versionsToDelete = history.versions.slice(this.maxVersions);

      await this.storage.safeTransaction(['versions'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('versions');
        
        const deletePromises = versionsToDelete.map(version => {
          return new Promise((resolve, reject) => {
            const request = store.delete(version.id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        });

        await Promise.all(deletePromises);
      });

      console.log(`[VersionManager] Cleaned up ${versionsToDelete.length} old versions for card ${cardId}`);
    } catch (error) {
      console.error('[VersionManager] Cleanup old versions failed:', error);
      // 不拋出錯誤，清理失敗不應影響主要操作
    }
  }

  /**
   * 獲取版本快照
   * @param {string} cardId - 名片ID
   * @param {number} version - 版本號
   * @returns {Promise<Object|null>} 版本快照
   */
  async getVersionSnapshot(cardId, version) {
    try {
      if (!this.storage.db) return null;
      
      return await this.storage.safeTransaction(['versions'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('versions');
        
        return new Promise((resolve, reject) => {
          const request = store.get(`${cardId}_v${version}`);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('[VersionManager] Get version snapshot failed:', error);
      return null;
    }
  }

  /**
   * VERSION-02: 增強的差異計算
   * @param {Object} data1 - 版本1資料
   * @param {Object} data2 - 版本2資料
   * @param {Object} options - 比較選項
   * @returns {Array} 增強的差異陣列
   */
  calculateEnhancedDifferences(data1, data2, options = {}) {
    const differences = [];
    const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    const ignoreFields = options.ignoreFields || [];
    const includeMetadata = options.includeMetadata !== false;
    
    for (const key of allKeys) {
      // 跳過忽略欄位
      if (ignoreFields.includes(key)) {
        continue;
      }
      
      const value1 = data1[key];
      const value2 = data2[key];
      
      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        const difference = {
          field: key,
          oldValue: value1,
          newValue: value2,
          changeType: !value1 ? 'added' : !value2 ? 'removed' : 'modified'
        };
        
        // VERSION-02: 新增詳細分析
        if (includeMetadata) {
          difference.analysis = this.analyzeFieldChange(key, value1, value2);
          difference.importance = this.getFieldImportance(key);
          difference.displayName = this.getFieldDisplayName(key);
        }
        
        differences.push(difference);
      }
    }
    
    // 按重要性排序
    if (includeMetadata) {
      differences.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    }
    
    return differences;
  }
  
  /**
   * 計算版本相似度
   */
  calculateSimilarity(data1, data2) {
    const keys1 = Object.keys(data1);
    const keys2 = Object.keys(data2);
    const allKeys = new Set([...keys1, ...keys2]);
    
    let matchingFields = 0;
    let totalFields = allKeys.size;
    
    for (const key of allKeys) {
      if (JSON.stringify(data1[key]) === JSON.stringify(data2[key])) {
        matchingFields++;
      }
    }
    
    return totalFields > 0 ? matchingFields / totalFields : 1;
  }
  
  /**
   * 分析變更影響
   */
  analyzeChangeImpact(differences) {
    const impact = {
      level: 'low',
      score: 0,
      criticalChanges: [],
      recommendations: []
    };
    
    const criticalFields = ['name', 'email', 'phone', 'mobile'];
    const importantFields = ['title', 'department', 'organization'];
    
    differences.forEach(diff => {
      if (criticalFields.includes(diff.field)) {
        impact.score += 3;
        impact.criticalChanges.push(diff.field);
      } else if (importantFields.includes(diff.field)) {
        impact.score += 2;
      } else {
        impact.score += 1;
      }
    });
    
    // 判斷影響等級
    if (impact.score >= 6) {
      impact.level = 'high';
      impact.recommendations.push('建議通知相關人員更新聯絡資訊');
    } else if (impact.score >= 3) {
      impact.level = 'medium';
      impact.recommendations.push('建議檢查變更內容是否正確');
    } else {
      impact.recommendations.push('變更影響輕微，無需特別處理');
    }
    
    return impact;
  }
  
  /**
   * 計算版本統計
   */
  calculateVersionStats(versions) {
    if (!versions || versions.length === 0) {
      return null;
    }
    
    const changeTypes = {};
    const monthlyActivity = {};
    let totalChanges = 0;
    
    versions.forEach(version => {
      // 變更類型統計
      const changeType = version.changeType || 'unknown';
      changeTypes[changeType] = (changeTypes[changeType] || 0) + 1;
      
      // 月度活動統計
      const monthKey = version.timestamp.toISOString().substring(0, 7); // YYYY-MM
      monthlyActivity[monthKey] = (monthlyActivity[monthKey] || 0) + 1;
      
      totalChanges++;
    });
    
    return {
      totalVersions: versions.length,
      changeTypes,
      monthlyActivity,
      averageChangesPerMonth: this.calculateAverageChangesPerMonth(monthlyActivity),
      mostActiveMonth: this.getMostActiveMonth(monthlyActivity),
      oldestVersion: versions[versions.length - 1],
      newestVersion: versions[0]
    };
  }
  
  /**
   * 計算變更頻率
   */
  calculateChangeFrequency(versions) {
    if (!versions || versions.length < 2) {
      return null;
    }
    
    const intervals = [];
    for (let i = 0; i < versions.length - 1; i++) {
      const interval = versions[i].timestamp - versions[i + 1].timestamp;
      intervals.push(interval);
    }
    
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    return {
      averageInterval,
      averageIntervalHuman: this.formatDuration(averageInterval),
      frequency: this.getFrequencyLevel(averageInterval),
      intervals: intervals.map(interval => ({
        duration: interval,
        durationHuman: this.formatDuration(interval)
      }))
    };
  }
  
  /**
   * 分析版本趋勢
   */
  analyzeVersionTrends(versions) {
    if (!versions || versions.length < 3) {
      return null;
    }
    
    const recentVersions = versions.slice(0, 5); // 最近5個版本
    const changeTypes = recentVersions.map(v => v.changeType);
    
    return {
      recentActivity: this.getActivityTrend(recentVersions),
      dominantChangeType: this.getDominantChangeType(changeTypes),
      stabilityScore: this.calculateStabilityScore(versions),
      prediction: this.predictNextChange(versions)
    };
  }

  /**
   * 生成變更描述
   * @param {string} changeType - 變更類型
   * @param {Object} data - 名片資料
   * @returns {string} 變更描述
   */
  generateChangeDescription(changeType, data) {
    const cardName = data.name || 'Unknown';
    
    // 使用統一語言管理器獲取本地化文字
    const getText = (key, fallback) => {
      if (window.languageManager && window.languageManager.getText) {
        return window.languageManager.getText(key, null, { fallback });
      }
      return fallback;
    };
    
    switch (changeType) {
      case 'create':
        return `${getText('version.create', '建立名片')}: ${cardName}`;
      case 'update':
        return `${getText('version.update', '更新名片')}: ${cardName}`;
      case 'restore':
        return `${getText('version.restore', '還原名片')}: ${cardName}`;
      default:
        return `${getText('version.modify', '修改名片')}: ${cardName}`;
    }
  }

  /**
   * 計算遷移校驗和
   * @param {Object} data - 名片資料
   * @returns {Promise<string>} 遷移校驗和
   */
  async calculateMigrationChecksum(data) {
    try {
      // 使用特定欄位計算遷移校驗和，用於版本驗證
      const migrationData = {
        name: data.name,
        email: data.email,
        timestamp: Date.now()
      };
      
      return await this.storage.calculateChecksum(migrationData);
    } catch (error) {
      console.error('[VersionManager] Calculate migration checksum failed:', error);
      return '';
    }
  }

  /**
   * VERSION-02: 增強的版本統計
   * @param {string} cardId - 名片ID（可選）
   * @param {Object} options - 統計選項
   * @returns {Promise<Object>} 增強的版本統計
   */
  async getVersionStats(cardId = null, options = {}) {
    try {
      if (cardId) {
        // 單一名片統計
        const history = await this.getVersionHistory(cardId, options);
        const card = await this.storage.getCard(cardId);
        
        return {
          cardId,
          totalVersions: history.totalVersions,
          currentVersion: history.currentVersion,
          latestSemanticVersion: history.latestSemanticVersion,
          lastModified: card?.modified,
          storageUsed: this.calculateStorageUsage(history.versions),
          
          // VERSION-02: 新增的統計資訊
          statistics: history.statistics,
          changeFrequency: history.changeFrequency,
          trends: history.trends,
          
          // 效能指標
          performance: {
            queryTime: history.query?.executedAt ? Date.now() - history.query.executedAt.getTime() : null,
            cacheHit: false // TODO: 實作快取機制
          }
        };
      } else {
        // VERSION-02: 增強的全域統計
        const cards = await this.storage.listCards();
        const allVersions = await this.getAllVersions();
        
        const totalCards = cards.length;
        const totalVersions = allVersions.length;
        const avgVersionsPerCard = totalCards > 0 ? totalVersions / totalCards : 0;
        
        // 分析全域趋勢
        const globalTrends = this.analyzeGlobalTrends(allVersions);
        const topActiveCards = this.getTopActiveCards(cards, allVersions);
        
        return {
          totalCards,
          totalVersions,
          avgVersionsPerCard: Math.round(avgVersionsPerCard * 100) / 100,
          maxVersionsPerCard: this.maxVersions,
          
          // VERSION-02: 新增的全域分析
          globalTrends,
          topActiveCards,
          systemHealth: {
            storageEfficiency: this.calculateStorageEfficiency(allVersions),
            cleanupRecommendations: this.generateCleanupRecommendations(allVersions)
          }
        };
      }
    } catch (error) {
      console.error('[VersionManager] Get version stats failed:', error);
      throw error;
    }
  }

  /**
   * 獲取所有版本記錄
   * @returns {Promise<Array>} 所有版本記錄
   */
  async getAllVersions() {
    try {
      if (!this.storage.db) return [];
      
      return await this.storage.safeTransaction(['versions'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('versions');
        
        return new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('[VersionManager] Get all versions failed:', error);
      return [];
    }
  }

  /**
   * 計算儲存使用量
   * @param {Array} versions - 版本陣列
   * @returns {Object} 儲存使用量統計
   */
  calculateStorageUsage(versions) {
    const totalSize = versions.reduce((sum, version) => {
      return sum + JSON.stringify(version).length;
    }, 0);
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024 * 100) / 100,
      mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * VERSION-03: 版本清理與合併
   * @param {string} cardId - 名片ID
   * @param {Object} options - 清理選項
   * @returns {Promise<Object>} 清理結果
   */
  async cleanupOldVersions(cardId, options = {}) {
    try {
      const maxVersions = options.maxVersions || this.maxVersions;
      const daysOld = options.daysOld || 30;
      const createBackup = options.createBackup !== false;
      
      // 獲取版本歷史
      const history = await this.getVersionHistory(cardId);
      
      if (history.versions.length <= maxVersions) {
        const getText = (key, fallback) => {
          if (window.languageManager && window.languageManager.getText) {
            return window.languageManager.getText(key, null, { fallback });
          }
          return fallback;
        };
        
        return {
          success: true,
          message: getText('version.cleanup.not.needed', '無需清理版本'),
          deletedCount: 0,
          backupCreated: false
        };
      }
      
      // 建立備份（如果需要）
      let backupId = null;
      if (createBackup) {
        const backupResult = await this.createVersionBackup(cardId, history.versions);
        if (backupResult.success) {
          backupId = backupResult.backupId;
        }
      }
      
      // 確定要刪除的版本
      const versionsToDelete = this.selectVersionsForDeletion(history.versions, {
        maxVersions,
        daysOld
      });
      
      if (versionsToDelete.length === 0) {
        const getText = (key, fallback) => {
          if (window.languageManager && window.languageManager.getText) {
            return window.languageManager.getText(key, null, { fallback });
          }
          return fallback;
        };
        
        return {
          success: true,
          message: getText('version.cleanup.no.match', '無符合清理條件的版本'),
          deletedCount: 0,
          backupCreated: !!backupId
        };
      }
      
      // 執行清理
      let deletedCount = 0;
      const errors = [];
      
      await this.storage.safeTransaction(['versions'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('versions');
        
        for (const version of versionsToDelete) {
          try {
            await new Promise((resolve, reject) => {
              const request = store.delete(version.id);
              request.onsuccess = () => {
                deletedCount++;
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            errors.push({
              versionId: version.id,
              error: error.message
            });
          }
        }
      });
      
      // 記錄清理操作
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('info', 'Version cleanup completed', {
          cardId: cardId.substring(0, 8) + '...',
          deletedCount,
          backupId,
          operation: 'cleanupOldVersions'
        });
      }
      
      return {
        success: true,
        deletedCount,
        errors,
        backupId,
        backupCreated: !!backupId,
        canUndo: !!backupId
      };
    } catch (error) {
      console.error('[VersionManager] Cleanup old versions failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * VERSION-03: 版本合併建議
   * @param {string} cardId - 名片ID
   * @returns {Promise<Object>} 合併建議
   */
  async suggestVersionMerging(cardId) {
    try {
      const history = await this.getVersionHistory(cardId);
      
      if (history.versions.length < 3) {
        return {
          shouldMerge: false,
          reason: '版本數量不足，無需合併'
        };
      }
      
      const suggestions = [];
      const versions = history.versions;
      
      // 分析相似版本
      for (let i = 0; i < versions.length - 1; i++) {
        for (let j = i + 1; j < versions.length; j++) {
          const similarity = this.calculateSimilarity(versions[i].data, versions[j].data);
          
          if (similarity > 0.95) {
            suggestions.push({
              type: 'similar_versions',
              version1: versions[i].version,
              version2: versions[j].version,
              similarity,
              recommendation: '考慮合併相似版本'
            });
          }
        }
      }
      
      // 分析頻繁小改動
      const recentVersions = versions.slice(0, 5);
      const smallChanges = recentVersions.filter(v => {
        const nextVersion = versions.find(nv => nv.version === v.version + 1);
        if (!nextVersion) return false;
        
        const differences = this.calculateEnhancedDifferences(v.data, nextVersion.data);
        return differences.length <= 2; // 小於等於2個欄位變更
      });
      
      if (smallChanges.length >= 3) {
        suggestions.push({
          type: 'frequent_small_changes',
          affectedVersions: smallChanges.map(v => v.version),
          recommendation: '考慮合併頻繁的小改動'
        });
      }
      
      return {
        shouldMerge: suggestions.length > 0,
        suggestions,
        totalVersions: versions.length,
        analysisDate: new Date()
      };
    } catch (error) {
      console.error('[VersionManager] Suggest version merging failed:', error);
      return {
        shouldMerge: false,
        error: error.message
      };
    }
  }
  
  /**
   * VERSION-03: 建立版本備份
   */
  async createVersionBackup(cardId, versions) {
    try {
      const backupId = `version_backup_${cardId}_${Date.now()}`;
      const backupData = {
        id: backupId,
        cardId,
        timestamp: new Date(),
        versions: versions.map(v => ({
          id: v.id,
          version: v.version,
          semanticVersion: v.semanticVersion,
          data: v.data,
          timestamp: v.timestamp,
          changeType: v.changeType,
          description: v.description,
          checksum: v.checksum
        })),
        backupChecksum: await this.calculateBackupChecksum(versions)
      };
      
      await this.storage.safeTransaction(['backups'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('backups');
        
        return new Promise((resolve, reject) => {
          const request = store.put(backupData);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      return {
        success: true,
        backupId,
        versionsCount: versions.length
      };
    } catch (error) {
      console.error('[VersionManager] Create version backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * VERSION-03: 選擇要刪除的版本
   */
  selectVersionsForDeletion(versions, options) {
    const { maxVersions, daysOld } = options;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // 按版本號排序（最新的在前）
    const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
    
    const toDelete = [];
    
    // 保留最新的 maxVersions 個版本
    const excessVersions = sortedVersions.slice(maxVersions);
    
    // 在超出數量的版本中，選擇舊的版本刪除
    for (const version of excessVersions) {
      if (version.timestamp < cutoffDate) {
        toDelete.push(version);
      }
    }
    
    return toDelete;
  }
  
  /**
   * VERSION-03: 計算備份校驗和
   */
  async calculateBackupChecksum(versions) {
    try {
      const content = versions.map(v => `${v.id}:${v.checksum}`).join('|');
      return await this.storage.calculateChecksum({ content });
    } catch (error) {
      console.error('[VersionManager] Calculate backup checksum failed:', error);
      return '';
    }
  }
  
  /**
   * VERSION-03: 撤銷清理操作
   * @param {string} backupId - 備份ID
   * @returns {Promise<Object>} 撤銷結果
   */
  async undoCleanup(backupId) {
    try {
      // 獲取備份資料
      const backup = await this.storage.safeTransaction(['backups'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('backups');
        
        return new Promise((resolve, reject) => {
          const request = store.get(backupId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      
      if (!backup) {
        throw new Error('備份不存在或已過期');
      }
      
      // 驗證備份完整性
      const calculatedChecksum = await this.calculateBackupChecksum(backup.versions);
      if (calculatedChecksum !== backup.backupChecksum) {
        console.warn('[VersionManager] Backup checksum mismatch, proceeding with caution');
      }
      
      // 還原版本
      let restoredCount = 0;
      await this.storage.safeTransaction(['versions'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('versions');
        
        for (const version of backup.versions) {
          try {
            await new Promise((resolve, reject) => {
              const request = store.put(version);
              request.onsuccess = () => {
                restoredCount++;
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            console.warn(`[VersionManager] Failed to restore version ${version.id}:`, error);
          }
        }
      });
      
      // 記錄撤銷操作
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('info', 'Cleanup undo completed', {
          backupId,
          restoredCount,
          operation: 'undoCleanup'
        });
      }
      
      return {
        success: true,
        restoredCount,
        cardId: backup.cardId
      };
    } catch (error) {
      console.error('[VersionManager] Undo cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 匯出版本歷史
   * @param {string} cardId - 名片ID
   * @returns {Promise<Object>} 匯出結果
   */
  async exportVersionHistory(cardId) {
    try {
      const history = await this.getVersionHistory(cardId);
      const exportData = {
        cardId,
        exportDate: new Date().toISOString(),
        maxVersions: this.maxVersions,
        versions: history.versions.map(v => ({
          version: v.version,
          semanticVersion: v.semanticVersion,
          timestamp: v.timestamp,
          changeType: v.changeType,
          description: v.description,
          checksum: v.checksum,
          migrationChecksum: v.migrationChecksum,
          data: v.data
        }))
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      return {
        success: true,
        file: blob,
        filename: `card-versions-${cardId}-${Date.now()}.json`
      };
    } catch (error) {
      console.error('[VersionManager] Export version history failed:', error);
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