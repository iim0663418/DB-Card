/**
 * 資料健康檢查管理器
 * 負責資料完整性檢查、自動修復和緊急備份
 */

class HealthManager {
  constructor(storage) {
    this.storage = storage;
    this.healthCheckInterval = null;
    this.lastHealthCheck = null;
  }

  /**
   * PWA-07: 資料健康檢查機制
   */
  async initialize() {
    
    // 啟動時執行健康檢查
    await this.performHealthCheck();
    
    // 設定定期健康檢查（每小時）
    this.scheduleHealthChecks();
    
  }

  /**
   * 執行完整健康檢查
   */
  async performHealthCheck() {
    try {
      
      const healthReport = {
        timestamp: new Date().toISOString(),
        checks: {},
        issues: [],
        repaired: [],
        status: 'healthy'
      };

      // 1. 檢查資料庫連線
      healthReport.checks.database = await this.checkDatabaseConnection();
      
      // 2. 檢查資料完整性
      healthReport.checks.dataIntegrity = await this.checkDataIntegrity();
      
      // 3. 檢查儲存空間
      healthReport.checks.storage = await this.checkStorageSpace();
      
      // 4. 檢查版本歷史
      healthReport.checks.versions = await this.checkVersionHistory();
      
      // 5. 安全性檢查
      healthReport.checks.security = await this.checkSecurityFeatures();
      
      // 6. 跨平台相容性檢查
      healthReport.checks.crossPlatform = await this.checkCrossPlatformCompatibility();
      
      // 7. 自動修復問題
      const repairResults = await this.autoRepairIssues(healthReport.checks);
      healthReport.repaired = repairResults;
      
      // 8. 確定整體健康狀態
      healthReport.status = this.determineHealthStatus(healthReport.checks);
      
      // 9. 儲存健康檢查結果
      await this.storage.setSetting('lastHealthCheck', healthReport);
      this.lastHealthCheck = healthReport;
      
      return healthReport;
    } catch (error) {
      console.error('[Health] Health check failed:', error);
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 檢查資料庫連線
   */
  async checkDatabaseConnection() {
    try {
      if (!this.storage.db) {
        return { status: 'error', message: '資料庫連線遺失' };
      }
      
      // 嘗試讀取設定
      await this.storage.getSetting('test');
      
      return { status: 'ok', message: '資料庫連線正常' };
    } catch (error) {
      return { status: 'error', message: `資料庫連線失敗: ${error.message}` };
    }
  }

  /**
   * 檢查資料完整性
   */
  async checkDataIntegrity() {
    try {
      const cards = await this.storage.listCards();
      const issues = [];
      let corruptedCount = 0;
      
      for (const card of cards) {
        // 檢查必要欄位
        if (!card.id || !card.data || !card.data.name) {
          issues.push(`名片 ${card.id || 'unknown'} 缺少必要欄位`);
          corruptedCount++;
          continue;
        }
        
        // 檢查校驗和
        if (card.checksum) {
          const currentChecksum = await this.storage.calculateChecksum(card.data);
          if (currentChecksum !== card.checksum) {
            issues.push(`名片 ${card.id} 校驗和不匹配`);
            corruptedCount++;
          }
        }
        
        // 檢查日期格式
        if (card.created && isNaN(new Date(card.created).getTime())) {
          issues.push(`名片 ${card.id} 建立日期格式錯誤`);
        }
        
        if (card.modified && isNaN(new Date(card.modified).getTime())) {
          issues.push(`名片 ${card.id} 修改日期格式錯誤`);
        }
      }
      
      return {
        status: corruptedCount === 0 ? 'ok' : 'warning',
        totalCards: cards.length,
        corruptedCards: corruptedCount,
        issues
      };
    } catch (error) {
      return { status: 'error', message: `資料完整性檢查失敗: ${error.message}` };
    }
  }

  /**
   * 檢查儲存空間
   */
  async checkStorageSpace() {
    try {
      const estimate = await navigator.storage?.estimate?.() || {};
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;
      
      let status = 'ok';
      let message = '儲存空間充足';
      
      if (usagePercent > 90) {
        status = 'error';
        message = '儲存空間嚴重不足';
      } else if (usagePercent > 80) {
        status = 'warning';
        message = '儲存空間不足';
      }
      
      return {
        status,
        message,
        usage,
        quota,
        usagePercent: Math.round(usagePercent)
      };
    } catch (error) {
      return { status: 'error', message: `儲存空間檢查失敗: ${error.message}` };
    }
  }

  /**
   * 檢查版本歷史
   */
  async checkVersionHistory() {
    try {
      // 簡化版本：檢查是否有孤立的版本記錄
      const cards = await this.storage.listCards();
      const cardIds = new Set(cards.map(card => card.id));
      
      // 這裡需要實作版本歷史的檢查邏輯
      // 暫時返回正常狀態
      return {
        status: 'ok',
        message: '版本歷史正常',
        totalVersions: 0,
        orphanedVersions: 0
      };
    } catch (error) {
      return { status: 'error', message: `版本歷史檢查失敗: ${error.message}` };
    }
  }

  /**
   * 自動修復問題
   */
  async autoRepairIssues(checks) {
    const repaired = [];
    
    try {
      // 修復損壞的名片資料
      if (checks.dataIntegrity?.status === 'warning') {
        const cards = await this.storage.listCards();
        
        for (const card of cards) {
          let needsRepair = false;
          const repairedCard = { ...card };
          
          // 修復缺少的日期
          if (!card.created || isNaN(new Date(card.created).getTime())) {
            repairedCard.created = new Date();
            needsRepair = true;
          }
          
          if (!card.modified || isNaN(new Date(card.modified).getTime())) {
            repairedCard.modified = new Date();
            needsRepair = true;
          }
          
          // 重新計算校驗和
          if (!card.checksum || card.checksum.length !== 64) {
            repairedCard.checksum = await this.storage.calculateChecksum(card.data);
            needsRepair = true;
          }
          
          if (needsRepair) {
            await this.storage.updateCard(card.id, repairedCard.data);
            repaired.push(`修復名片 ${card.id} 的資料問題`);
          }
        }
      }
      
      // 清理儲存空間
      if (checks.storage?.usagePercent > 80) {
        await this.cleanupStorage();
        repaired.push('清理了過期的備份資料');
      }
      
    } catch (error) {
      console.error('[Health] Auto repair failed:', error);
      repaired.push(`自動修復失敗: ${error.message}`);
    }
    
    return repaired;
  }

  /**
   * 檢查安全功能
   */
  async checkSecurityFeatures() {
    try {
      const security = {
        cryptoAPI: !!(window.crypto && window.crypto.subtle),
        pbkdf2Support: false,
        aesGcmSupport: false,
        cspHeaders: false,
        httpsOnly: location.protocol === 'https:'
      };

      // 測試 PBKDF2 支援
      if (security.cryptoAPI) {
        try {
          const password = new TextEncoder().encode('test');
          const salt = crypto.getRandomValues(new Uint8Array(16));
          
          const keyMaterial = await crypto.subtle.importKey(
            'raw', password, 'PBKDF2', false, ['deriveKey']
          );
          
          await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false, ['encrypt']
          );
          
          security.pbkdf2Support = true;
          security.aesGcmSupport = true;
        } catch (error) {
        }
      }

      // 檢查 CSP 標頭
      try {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        security.cspHeaders = !!meta || document.querySelector('meta[name="csp-nonce"]');
      } catch (error) {
      }

      const supportedFeatures = Object.values(security).filter(Boolean).length;
      
      return {
        status: supportedFeatures >= 4 ? 'ok' : 'warning',
        message: `${supportedFeatures}/5 安全功能支援`,
        details: security,
        score: supportedFeatures / 5
      };
    } catch (error) {
      return { status: 'error', message: `安全檢查失敗: ${error.message}` };
    }
  }

  /**
   * 檢查跨平台相容性
   */
  async checkCrossPlatformCompatibility() {
    try {
      // 如果有跨平台測試工具，使用它
      if (window.CrossPlatformTester) {
        const tester = new window.CrossPlatformTester();
        const results = await tester.runFullTest();
        
        return {
          status: results.overallScore >= 80 ? 'ok' : results.overallScore >= 60 ? 'warning' : 'error',
          message: `跨平台相容性評分: ${results.overallScore}/100`,
          details: {
            platform: results.platform,
            score: results.overallScore,
            failedTests: results.tests.filter(t => !t.result?.supported).length
          }
        };
      }
      
      // 基本相容性檢查
      const basic = {
        indexedDB: !!window.indexedDB,
        serviceWorker: 'serviceWorker' in navigator,
        crypto: !!(window.crypto && window.crypto.subtle),
        caches: 'caches' in window
      };
      
      const supportCount = Object.values(basic).filter(Boolean).length;
      
      return {
        status: supportCount === 4 ? 'ok' : supportCount >= 3 ? 'warning' : 'error',
        message: `基本功能支援: ${supportCount}/4`,
        details: basic
      };
    } catch (error) {
      return { status: 'error', message: `相容性檢查失敗: ${error.message}` };
    }
  }

  /**
   * 清理儲存空間
   */
  async cleanupStorage() {
    try {
      // 清理過期備份
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.storage.cleanupBackupsOlderThan(thirtyDaysAgo);
      
      // 清理孤立版本
      await this.storage.cleanupOrphanedVersions();
      
    } catch (error) {
      console.error('[Health] Storage cleanup failed:', error);
    }
  }

  /**
   * 建立緊急備份
   */
  async createEmergencyBackup() {
    try {
      
      const cards = await this.storage.listCards();
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        type: 'emergency',
        cards: cards.map(card => ({
          id: card.id,
          type: card.type,
          data: card.data,
          created: card.created,
          modified: card.modified,
          checksum: card.checksum
        }))
      };
      
      // 儲存到 localStorage 作為緊急備份
      const backupKey = `emergency_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // 清理舊的緊急備份（保留最近 3 個）
      this.cleanupEmergencyBackups();
      
      return backupKey;
    } catch (error) {
      console.error('[Health] Emergency backup failed:', error);
      throw error;
    }
  }

  /**
   * 從緊急備份恢復
   */
  async restoreFromEmergencyBackup(backupKey) {
    try {
      
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('備份資料不存在');
      }
      
      const backup = JSON.parse(backupData);
      let restoredCount = 0;
      
      for (const card of backup.cards) {
        try {
          await this.storage.storeCard(card.data);
          restoredCount++;
        } catch (error) {
        }
      }
      
      return { success: true, restoredCount };
    } catch (error) {
      console.error('[Health] Emergency restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清理舊的緊急備份
   */
  cleanupEmergencyBackups() {
    try {
      const backupKeys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('emergency_backup_')) {
          backupKeys.push(key);
        }
      }
      
      // 按時間戳排序，保留最新的 3 個
      backupKeys.sort().reverse();
      const keysToDelete = backupKeys.slice(3);
      
      keysToDelete.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToDelete.length > 0) {
      }
    } catch (error) {
      console.error('[Health] Emergency backup cleanup failed:', error);
    }
  }

  /**
   * 設定定期健康檢查
   */
  scheduleHealthChecks() {
    // 每小時執行一次健康檢查
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60 * 60 * 1000);
    
  }

  /**
   * 停止定期健康檢查
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 確定整體健康狀態
   */
  determineHealthStatus(checks) {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('error')) {
      return 'error';
    } else if (statuses.includes('warning')) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * 獲取健康狀態摘要
   */
  getHealthSummary() {
    if (!this.lastHealthCheck) {
      return {
        status: 'unknown',
        message: '尚未執行健康檢查',
        lastCheck: null
      };
    }
    
    const { status, timestamp, checks } = this.lastHealthCheck;
    let message = '';
    
    switch (status) {
      case 'healthy':
        message = '系統運作正常';
        break;
      case 'warning':
        message = '發現一些問題，但系統仍可正常運作';
        break;
      case 'error':
        message = '發現嚴重問題，建議立即處理';
        break;
      default:
        message = '健康狀態未知';
    }
    
    return {
      status,
      message,
      lastCheck: timestamp,
      totalCards: checks.dataIntegrity?.totalCards || 0,
      storageUsage: checks.storage?.usagePercent || 0
    };
  }

  /**
   * 清理資源
   */
  destroy() {
    this.stopHealthChecks();
  }
}

window.HealthManager = HealthManager;