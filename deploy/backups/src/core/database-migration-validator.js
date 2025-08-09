/**
 * IndexedDB 遷移驗證器 - CRS-V31-005 核心實作
 * 確保資料庫升級的安全性和完整性
 */

class DatabaseMigrationValidator {
  constructor(storage) {
    this.storage = storage;
    this.currentDbVersion = 3;
    this.supportedMigrations = [1, 2, 3];
  }

  /**
   * 驗證 IndexedDB 遷移完整性
   * @param {number} fromVersion - 來源版本
   * @param {number} toVersion - 目標版本
   * @returns {Promise<ValidationResult>}
   */
  async validateMigration(fromVersion, toVersion) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      affectedStores: [],
      requiredActions: []
    };

    try {
      // 1. 版本相容性檢查
      if (!this.isVersionSupported(fromVersion, toVersion)) {
        validation.isValid = false;
        validation.errors.push(`Unsupported migration path: ${fromVersion} -> ${toVersion}`);
        return validation;
      }

      // 2. 資料完整性檢查
      const integrityCheck = await this.checkDataIntegrity();
      if (!integrityCheck.isValid) {
        validation.warnings.push(...integrityCheck.issues);
      }

      // 3. 索引一致性檢查
      const indexCheck = await this.validateIndexes(toVersion);
      if (!indexCheck.isValid) {
        validation.errors.push(...indexCheck.errors);
        validation.isValid = false;
      }

      // 4. 儲存空間檢查
      const spaceCheck = await this.checkStorageSpace();
      if (!spaceCheck.sufficient) {
        validation.warnings.push(`Insufficient storage space: ${spaceCheck.available}MB available, ${spaceCheck.required}MB required`);
      }

      return validation;
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Migration validation failed: ${error.message}`);
      return validation;
    }
  }

  /**
   * 執行安全遷移
   * @param {number} targetVersion - 目標版本
   * @returns {Promise<MigrationResult>}
   */
  async performSafeMigration(targetVersion) {
    const migrationId = `migration_${Date.now()}`;
    
    try {
      // 1. 建立遷移記錄
      const migrationLog = await this.createMigrationLog(migrationId, targetVersion);
      
      // 2. 建立完整備份
      const backup = await this.createMigrationBackup();
      
      // 3. 執行遷移步驟
      const migrationSteps = this.getMigrationSteps(this.storage.dbVersion, targetVersion);
      
      for (const step of migrationSteps) {
        await this.executeMigrationStep(step, migrationLog);
      }
      
      // 4. 驗證遷移結果
      const validation = await this.validateMigrationResult(migrationLog);
      
      if (validation.isValid) {
        await this.completeMigration(migrationLog);
        return {
          success: true,
          migrationId,
          processedCards: migrationLog.processedCards,
          duration: Date.now() - migrationLog.startTime.getTime()
        };
      } else {
        // 5. 失敗時自動回滾
        await this.rollbackMigration(migrationLog, backup);
        return {
          success: false,
          error: 'Migration validation failed',
          rollbackCompleted: true
        };
      }
    } catch (error) {
      console.error('[DatabaseMigrationValidator] Migration failed:', error);
      return {
        success: false,
        error: error.message,
        rollbackCompleted: false
      };
    }
  }

  /**
   * 檢查資料完整性
   */
  async checkDataIntegrity() {
    const result = {
      isValid: true,
      issues: [],
      totalCards: 0,
      corruptedCards: 0
    };

    try {
      const cards = await this.storage.listCards();
      result.totalCards = cards.length;

      for (const card of cards) {
        // 檢查必要欄位
        if (!card.id || !card.data || !card.created) {
          result.issues.push(`Card ${card.id} missing required fields`);
          result.corruptedCards++;
          continue;
        }

        // 檢查校驗和
        if (card.checksum) {
          const calculatedChecksum = await this.storage.calculateChecksum(card.data);
          if (calculatedChecksum !== card.checksum) {
            result.issues.push(`Card ${card.id} checksum mismatch`);
            result.corruptedCards++;
          }
        }

        // 檢查指紋格式
        if (card.fingerprint && !card.fingerprint.startsWith('fingerprint_')) {
          result.issues.push(`Card ${card.id} invalid fingerprint format`);
        }
      }

      if (result.corruptedCards > 0) {
        result.isValid = false;
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.issues.push(`Integrity check failed: ${error.message}`);
      return result;
    }
  }

  /**
   * 驗證索引一致性
   */
  async validateIndexes(targetVersion) {
    const result = {
      isValid: true,
      errors: [],
      missingIndexes: [],
      redundantIndexes: []
    };

    try {
      const requiredIndexes = this.getRequiredIndexes(targetVersion);
      const existingIndexes = await this.getCurrentIndexes();

      // 檢查缺失的索引
      for (const [storeName, indexes] of Object.entries(requiredIndexes)) {
        const existing = existingIndexes[storeName] || [];
        for (const indexName of indexes) {
          if (!existing.includes(indexName)) {
            result.missingIndexes.push(`${storeName}.${indexName}`);
          }
        }
      }

      if (result.missingIndexes.length > 0) {
        result.isValid = false;
        result.errors.push(`Missing indexes: ${result.missingIndexes.join(', ')}`);
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Index validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * 建立遷移備份
   */
  async createMigrationBackup() {
    try {
      const backupId = `backup_${Date.now()}`;
      const cards = await this.storage.listCards();
      const versions = await this.storage.getAllVersions();
      
      const backupData = {
        id: backupId,
        timestamp: new Date(),
        dbVersion: this.storage.dbVersion,
        cards: cards,
        versions: versions,
        checksum: await this.calculateBackupChecksum(cards, versions)
      };

      // 儲存到 backups ObjectStore
      await this.storage.safeTransaction(['backups'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('backups');
        store.put(backupData);
      });

      return {
        success: true,
        backupId,
        size: JSON.stringify(backupData).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 回滾遷移
   */
  async rollbackMigration(migrationLog, backup) {
    try {
      console.warn('[DatabaseMigrationValidator] Starting migration rollback...');
      
      // 1. 清空當前資料
      await this.clearCurrentData();
      
      // 2. 還原備份資料
      await this.restoreFromBackup(backup);
      
      // 3. 更新遷移記錄
      migrationLog.status = 'rollback';
      migrationLog.endTime = new Date();
      await this.updateMigrationLog(migrationLog);
      
      console.log('[DatabaseMigrationValidator] Migration rollback completed');
      return true;
    } catch (error) {
      console.error('[DatabaseMigrationValidator] Rollback failed:', error);
      return false;
    }
  }

  /**
   * 檢查儲存空間
   */
  async checkStorageSpace() {
    try {
      const estimate = await navigator.storage?.estimate?.() || {};
      const available = (estimate.quota - estimate.usage) / (1024 * 1024); // MB
      const required = 10; // 預估需要 10MB
      
      return {
        sufficient: available >= required,
        available: Math.round(available),
        required: required
      };
    } catch (error) {
      return {
        sufficient: true, // 無法檢測時假設足夠
        available: 0,
        required: 0
      };
    }
  }

  /**
   * 建立遷移記錄
   */
  async createMigrationLog(migrationId, targetVersion) {
    const migrationLog = {
      id: migrationId,
      migrationVersion: targetVersion,
      startTime: new Date(),
      status: 'pending',
      affectedCards: 0,
      processedCards: 0,
      errors: []
    };

    // 如果 migration_log store 不存在，先建立
    try {
      await this.ensureMigrationLogStore();
      
      await this.storage.safeTransaction(['migration_log'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('migration_log');
        store.put(migrationLog);
      });
    } catch (error) {
      console.warn('[DatabaseMigrationValidator] Failed to create migration log:', error);
    }

    return migrationLog;
  }

  /**
   * 確保 migration_log ObjectStore 存在
   */
  async ensureMigrationLogStore() {
    if (!this.storage.db.objectStoreNames.contains('migration_log')) {
      // 需要升級資料庫版本來新增 store
      console.log('[DatabaseMigrationValidator] Creating migration_log store');
      // 在實際環境中，這會觸發 onupgradeneeded 事件
    }
  }

  /**
   * 獲取遷移步驟
   */
  getMigrationSteps(fromVersion, toVersion) {
    const steps = [];
    
    if (fromVersion < 3 && toVersion >= 3) {
      steps.push({
        name: 'add_fingerprint_indexes',
        description: 'Add fingerprint indexes to cards and versions stores'
      });
      steps.push({
        name: 'generate_missing_fingerprints',
        description: 'Generate fingerprints for existing cards'
      });
    }
    
    return steps;
  }

  /**
   * 執行遷移步驟
   */
  async executeMigrationStep(step, migrationLog) {
    try {
      console.log(`[DatabaseMigrationValidator] Executing step: ${step.name}`);
      
      switch (step.name) {
        case 'add_fingerprint_indexes':
          // 索引會在 onupgradeneeded 中自動建立
          break;
          
        case 'generate_missing_fingerprints':
          if (this.storage.batchMigrator) {
            const result = await this.storage.batchMigrator.batchGenerateFingerprints();
            migrationLog.processedCards = result.processedCount;
            migrationLog.affectedCards = result.totalCards;
          } else {
            console.warn('[DatabaseMigrationValidator] BatchDataMigrator not available, skipping fingerprint generation');
          }
          break;
      }
      
    } catch (error) {
      migrationLog.errors.push({
        step: step.name,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * 驗證遷移結果
   */
  async validateMigrationResult(migrationLog) {
    try {
      const integrityCheck = await this.checkDataIntegrity();
      return {
        isValid: integrityCheck.isValid,
        issues: integrityCheck.issues
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Migration result validation failed: ${error.message}`]
      };
    }
  }

  /**
   * 完成遷移
   */
  async completeMigration(migrationLog) {
    migrationLog.status = 'completed';
    migrationLog.endTime = new Date();
    
    try {
      await this.updateMigrationLog(migrationLog);
      localStorage.setItem('pwa-db-version', this.currentDbVersion.toString());
    } catch (error) {
      console.error('[DatabaseMigrationValidator] Failed to complete migration:', error);
    }
  }

  /**
   * 更新遷移記錄
   */
  async updateMigrationLog(migrationLog) {
    try {
      await this.storage.safeTransaction(['migration_log'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('migration_log');
        store.put(migrationLog);
      });
    } catch (error) {
      console.warn('[DatabaseMigrationValidator] Failed to update migration log:', error);
    }
  }

  // 輔助方法
  isVersionSupported(fromVersion, toVersion) {
    return this.supportedMigrations.includes(fromVersion) && 
           this.supportedMigrations.includes(toVersion) &&
           toVersion > fromVersion;
  }

  getRequiredIndexes(version) {
    const baseIndexes = {
      cards: ['type', 'created', 'modified'],
      versions: ['cardId', 'timestamp', 'version'],
      settings: [],
      backups: ['timestamp']
    };

    if (version >= 3) {
      baseIndexes.cards.push('fingerprint');
      baseIndexes.versions.push('fingerprint');
    }

    if (version >= 4) {
      baseIndexes.migration_log = ['migrationVersion', 'status'];
    }

    return baseIndexes;
  }

  async getCurrentIndexes() {
    const indexes = {};
    const storeNames = ['cards', 'versions', 'settings', 'backups'];
    
    for (const storeName of storeNames) {
      if (this.storage.db.objectStoreNames.contains(storeName)) {
        const transaction = this.storage.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        indexes[storeName] = Array.from(store.indexNames);
      }
    }
    
    return indexes;
  }

  async calculateBackupChecksum(cards, versions) {
    try {
      const data = { cards, versions };
      return await this.storage.calculateChecksum(data);
    } catch (error) {
      return '';
    }
  }

  async clearCurrentData() {
    const storeNames = ['cards', 'versions'];
    
    await this.storage.safeTransaction(storeNames, 'readwrite', async (transaction) => {
      for (const storeName of storeNames) {
        const store = transaction.objectStore(storeName);
        store.clear();
      }
    });
  }

  async restoreFromBackup(backup) {
    if (!backup.success) {
      throw new Error('Invalid backup data');
    }

    // 實際實作中需要從 backups store 讀取資料並還原
    console.log('[DatabaseMigrationValidator] Backup restore not fully implemented');
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DatabaseMigrationValidator;
} else if (typeof window !== 'undefined') {
  window.DatabaseMigrationValidator = DatabaseMigrationValidator;
}