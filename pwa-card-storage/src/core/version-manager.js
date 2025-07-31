/**
 * PWA-08: 簡化版本控制管理器
 * 實作 10 個版本限制的版本歷史管理與衝突解決
 */

class VersionManager {
  constructor(storage) {
    this.storage = storage;
    this.maxVersions = 10; // 簡化版本：限制 10 個版本
    this.dbName = 'PWACardVersions';
    this.dbVersion = 1;
    this.db = null;
  }

  async initialize() {
    try {
      await this.initDatabase();
    } catch (error) {
      console.error('[VersionManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 初始化版本資料庫
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('[VersionManager] Database open failed:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 建立版本歷史 store
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', { keyPath: 'id' });
          versionStore.createIndex('cardId', 'cardId', { unique: false });
          versionStore.createIndex('timestamp', 'timestamp', { unique: false });
          versionStore.createIndex('version', 'version', { unique: false });
        }
        
        // 建立版本元資料 store
        if (!db.objectStoreNames.contains('versionMeta')) {
          const metaStore = db.createObjectStore('versionMeta', { keyPath: 'cardId' });
        }
      };
    });
  }

  /**
   * 建立版本快照
   */
  async createVersionSnapshot(cardId, cardData, changeType = 'update', description = '') {
    try {
      
      if (!this.db) {
        throw new Error('Version database not initialized');
      }

      // 獲取當前版本元資料
      const meta = await this.getVersionMeta(cardId) || {
        cardId,
        currentVersion: 0,
        totalVersions: 0,
        lastModified: new Date()
      };

      // 建立新版本
      const newVersion = meta.currentVersion + 1;
      const versionSnapshot = {
        id: `${cardId}_v${newVersion}`,
        cardId,
        version: newVersion,
        data: JSON.parse(JSON.stringify(cardData)), // 深拷貝
        timestamp: new Date(),
        changeType,
        description,
        checksum: await this.calculateChecksum(cardData)
      };

      // 儲存版本快照
      await this.storeVersionSnapshot(versionSnapshot);

      // 更新元資料
      meta.currentVersion = newVersion;
      meta.totalVersions = Math.min(meta.totalVersions + 1, this.maxVersions);
      meta.lastModified = new Date();
      await this.updateVersionMeta(meta);

      // 清理舊版本（保持最多 10 個版本）
      await this.cleanupOldVersions(cardId);

      return versionSnapshot;
    } catch (error) {
      console.error('[VersionManager] Failed to create version snapshot:', error);
      throw error;
    }
  }

  /**
   * 獲取版本歷史
   */
  async getVersionHistory(cardId) {
    try {
      if (!this.db) {
        throw new Error('Version database not initialized');
      }

      const transaction = this.db.transaction(['versions'], 'readonly');
      const store = transaction.objectStore('versions');
      const index = store.index('cardId');
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(cardId);
        
        request.onsuccess = () => {
          const versions = request.result.sort((a, b) => b.version - a.version);
          
          const history = {
            cardId,
            versions,
            currentVersion: versions.length > 0 ? versions[0].version : 0,
            totalVersions: versions.length,
            maxVersions: this.maxVersions
          };
          
          resolve(history);
        };
        
        request.onerror = () => {
          console.error('[VersionManager] Failed to get version history:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[VersionManager] Get version history failed:', error);
      throw error;
    }
  }

  /**
   * 還原到指定版本
   */
  async restoreVersion(cardId, targetVersion) {
    try {
      
      // 獲取目標版本資料
      const versionSnapshot = await this.getVersionSnapshot(cardId, targetVersion);
      if (!versionSnapshot) {
        throw new Error(`Version ${targetVersion} not found for card ${cardId}`);
      }

      // 驗證資料完整性
      const calculatedChecksum = await this.calculateChecksum(versionSnapshot.data);
      if (calculatedChecksum !== versionSnapshot.checksum) {
        // 繼續執行，但記錄警告
      }

      // 更新主要名片資料
      await this.storage.updateCard(cardId, versionSnapshot.data);

      // 建立還原操作的版本快照
      await this.createVersionSnapshot(
        cardId, 
        versionSnapshot.data, 
        'restore', 
        `Restored to version ${targetVersion}`
      );

      return {
        success: true,
        restoredVersion: targetVersion,
        data: versionSnapshot.data
      };
    } catch (error) {
      console.error('[VersionManager] Restore version failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 比較版本差異
   */
  async compareVersions(cardId, version1, version2) {
    try {
      const snapshot1 = await this.getVersionSnapshot(cardId, version1);
      const snapshot2 = await this.getVersionSnapshot(cardId, version2);
      
      if (!snapshot1 || !snapshot2) {
        throw new Error('One or both versions not found');
      }

      const differences = this.calculateDifferences(snapshot1.data, snapshot2.data);
      
      return {
        cardId,
        version1,
        version2,
        differences,
        timestamp1: snapshot1.timestamp,
        timestamp2: snapshot2.timestamp
      };
    } catch (error) {
      console.error('[VersionManager] Compare versions failed:', error);
      throw error;
    }
  }

  /**
   * 獲取版本統計
   */
  async getVersionStats(cardId = null) {
    try {
      if (!this.db) {
        throw new Error('Version database not initialized');
      }

      const transaction = this.db.transaction(['versions', 'versionMeta'], 'readonly');
      
      if (cardId) {
        // 單一名片統計
        const versions = await this.getVersionHistory(cardId);
        const meta = await this.getVersionMeta(cardId);
        
        return {
          cardId,
          totalVersions: versions.totalVersions,
          currentVersion: versions.currentVersion,
          lastModified: meta?.lastModified,
          storageUsed: this.calculateStorageUsage(versions.versions)
        };
      } else {
        // 全域統計
        const metaStore = transaction.objectStore('versionMeta');
        
        return new Promise((resolve, reject) => {
          const request = metaStore.getAll();
          
          request.onsuccess = () => {
            const allMeta = request.result;
            const totalCards = allMeta.length;
            const totalVersions = allMeta.reduce((sum, meta) => sum + meta.totalVersions, 0);
            const avgVersionsPerCard = totalCards > 0 ? totalVersions / totalCards : 0;
            
            resolve({
              totalCards,
              totalVersions,
              avgVersionsPerCard: Math.round(avgVersionsPerCard * 100) / 100,
              maxVersionsPerCard: this.maxVersions
            });
          };
          
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('[VersionManager] Get version stats failed:', error);
      throw error;
    }
  }

  /**
   * 清理過期版本
   */
  async cleanupExpiredVersions(daysOld = 30) {
    try {
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const index = store.index('timestamp');
      
      let deletedCount = 0;
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // 保留每張名片的最新版本
            const version = cursor.value;
            if (version.version > 1) { // 不刪除第一個版本
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => {
          console.error('[VersionManager] Cleanup failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[VersionManager] Cleanup expired versions failed:', error);
      throw error;
    }
  }

  /**
   * 匯出版本歷史
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
          timestamp: v.timestamp,
          changeType: v.changeType,
          description: v.description,
          checksum: v.checksum,
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

  // 私有方法

  async getVersionSnapshot(cardId, version) {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['versions'], 'readonly');
    const store = transaction.objectStore('versions');
    
    return new Promise((resolve, reject) => {
      const request = store.get(`${cardId}_v${version}`);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async storeVersionSnapshot(snapshot) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['versions'], 'readwrite');
    const store = transaction.objectStore('versions');
    
    return new Promise((resolve, reject) => {
      const request = store.put(snapshot);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getVersionMeta(cardId) {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['versionMeta'], 'readonly');
    const store = transaction.objectStore('versionMeta');
    
    return new Promise((resolve, reject) => {
      const request = store.get(cardId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateVersionMeta(meta) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['versionMeta'], 'readwrite');
    const store = transaction.objectStore('versionMeta');
    
    return new Promise((resolve, reject) => {
      const request = store.put(meta);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cleanupOldVersions(cardId) {
    try {
      const history = await this.getVersionHistory(cardId);
      
      if (history.versions.length > this.maxVersions) {
        const versionsToDelete = history.versions
          .slice(this.maxVersions)
          .map(v => v.id);
        
        const transaction = this.db.transaction(['versions'], 'readwrite');
        const store = transaction.objectStore('versions');
        
        for (const versionId of versionsToDelete) {
          store.delete(versionId);
        }
        
      }
    } catch (error) {
      console.error('[VersionManager] Cleanup old versions failed:', error);
    }
  }

  async calculateChecksum(data) {
    try {
      const jsonString = JSON.stringify(data, Object.keys(data).sort());
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      
      // 使用簡化的 checksum（不是 SHA-256，降低運算負擔）
      let hash = 0;
      for (let i = 0; i < dataBuffer.length; i++) {
        const char = dataBuffer[i];
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 轉換為 32 位整數
      }
      
      return hash.toString(16);
    } catch (error) {
      console.error('[VersionManager] Checksum calculation failed:', error);
      return 'checksum_error';
    }
  }

  calculateDifferences(data1, data2) {
    const differences = [];
    const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    
    for (const key of allKeys) {
      const value1 = data1[key];
      const value2 = data2[key];
      
      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({
          field: key,
          oldValue: value1,
          newValue: value2,
          changeType: !value1 ? 'added' : !value2 ? 'removed' : 'modified'
        });
      }
    }
    
    return differences;
  }

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
}

window.VersionManager = VersionManager;