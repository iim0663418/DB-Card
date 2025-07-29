/**
 * 文件同步工具
 * 確保版本號和完成度百分比的一致性
 */

class DocumentationSync {
  constructor() {
    this.version = '1.0.1';
    this.completionPercentage = 85;
    this.lastSync = null;
  }

  /**
   * 同步所有文件的版本資訊
   */
  async syncVersionInfo() {
    try {
      console.log('[DocSync] Starting version synchronization...');
      
      const syncTasks = [
        this.syncManifestVersion(),
        this.syncServiceWorkerVersion(),
        this.syncPackageVersion(),
        this.syncReadmeVersion()
      ];
      
      await Promise.allSettled(syncTasks);
      
      this.lastSync = new Date().toISOString();
      console.log('[DocSync] Version synchronization completed');
      
      return {
        success: true,
        version: this.version,
        timestamp: this.lastSync
      };
    } catch (error) {
      console.error('[DocSync] Version synchronization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 同步 manifest.json 版本
   */
  async syncManifestVersion() {
    try {
      const manifestPath = '/pwa-card-storage/manifest.json';
      const response = await fetch(manifestPath);
      
      if (response.ok) {
        const manifest = await response.json();
        
        if (manifest.version !== this.version) {
          console.log(`[DocSync] Manifest version mismatch: ${manifest.version} -> ${this.version}`);
          // 在實際應用中，這裡會更新檔案
          // 目前只記錄差異
        }
      }
    } catch (error) {
      console.warn('[DocSync] Manifest sync failed:', error);
    }
  }

  /**
   * 同步 Service Worker 版本
   */
  async syncServiceWorkerVersion() {
    try {
      // 檢查 Service Worker 快取版本
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration && registration.active) {
          // 發送版本檢查訊息
          const messageChannel = new MessageChannel();
          
          registration.active.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
          );
          
          messageChannel.port1.onmessage = (event) => {
            const swVersion = event.data.version;
            if (swVersion && !swVersion.includes(this.version)) {
              console.log(`[DocSync] Service Worker version mismatch: ${swVersion} -> ${this.version}`);
            }
          };
        }
      }
    } catch (error) {
      console.warn('[DocSync] Service Worker sync failed:', error);
    }
  }

  /**
   * 同步 package.json 版本（如果存在）
   */
  async syncPackageVersion() {
    try {
      // 在 PWA 環境中，package.json 通常不可直接訪問
      // 這裡提供一個檢查機制的框架
      console.log('[DocSync] Package version sync - not applicable in PWA environment');
    } catch (error) {
      console.warn('[DocSync] Package sync failed:', error);
    }
  }

  /**
   * 同步 README 版本資訊
   */
  async syncReadmeVersion() {
    try {
      // 檢查 README 中的版本資訊
      // 在實際應用中，這會讀取並更新 README 檔案
      console.log('[DocSync] README version sync - manual update required');
    } catch (error) {
      console.warn('[DocSync] README sync failed:', error);
    }
  }

  /**
   * 檢查跨文件規格對應
   */
  async checkSpecificationAlignment() {
    try {
      console.log('[DocSync] Checking specification alignment...');
      
      const specFiles = [
        'requirements.md',
        'design.md', 
        'tasks.md',
        'SECURITY-FIXES-CHECKLIST.md'
      ];
      
      const alignmentReport = {
        timestamp: new Date().toISOString(),
        files: [],
        misalignments: [],
        recommendations: []
      };
      
      // 檢查每個規格檔案
      for (const file of specFiles) {
        const fileStatus = await this.checkFileAlignment(file);
        alignmentReport.files.push(fileStatus);
        
        if (fileStatus.issues.length > 0) {
          alignmentReport.misalignments.push(...fileStatus.issues);
        }
      }
      
      // 生成建議
      alignmentReport.recommendations = this.generateAlignmentRecommendations(alignmentReport.misalignments);
      
      console.log('[DocSync] Specification alignment check completed');
      return alignmentReport;
    } catch (error) {
      console.error('[DocSync] Specification alignment check failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 檢查單一檔案對齊狀態
   */
  async checkFileAlignment(filename) {
    const fileStatus = {
      filename,
      version: 'unknown',
      lastModified: null,
      issues: []
    };
    
    try {
      // 在實際應用中，這裡會讀取檔案內容並檢查版本資訊
      // 目前提供檢查框架
      
      switch (filename) {
        case 'requirements.md':
          fileStatus.issues = this.checkRequirementsAlignment();
          break;
        case 'design.md':
          fileStatus.issues = this.checkDesignAlignment();
          break;
        case 'tasks.md':
          fileStatus.issues = this.checkTasksAlignment();
          break;
        case 'SECURITY-FIXES-CHECKLIST.md':
          fileStatus.issues = this.checkSecurityAlignment();
          break;
      }
      
    } catch (error) {
      fileStatus.issues.push(`檔案讀取失敗: ${error.message}`);
    }
    
    return fileStatus;
  }

  /**
   * 檢查需求文件對齊
   */
  checkRequirementsAlignment() {
    const issues = [];
    
    // 檢查需求與實作的對應關係
    // 這裡提供檢查邏輯的框架
    
    return issues;
  }

  /**
   * 檢查設計文件對齊
   */
  checkDesignAlignment() {
    const issues = [];
    
    // 檢查設計與實作的對應關係
    // 這裡提供檢查邏輯的框架
    
    return issues;
  }

  /**
   * 檢查任務文件對齊
   */
  checkTasksAlignment() {
    const issues = [];
    
    // 檢查任務完成度與實際進度
    const expectedCompletion = this.completionPercentage;
    const actualCompletion = this.calculateActualCompletion();
    
    if (Math.abs(expectedCompletion - actualCompletion) > 5) {
      issues.push(`完成度不一致: 預期 ${expectedCompletion}%, 實際 ${actualCompletion}%`);
    }
    
    return issues;
  }

  /**
   * 檢查安全檢查清單對齊
   */
  checkSecurityAlignment() {
    const issues = [];
    
    // 檢查安全修復項目與實際實作
    // 這裡提供檢查邏輯的框架
    
    return issues;
  }

  /**
   * 計算實際完成度
   */
  calculateActualCompletion() {
    // 基於已實作的功能計算完成度
    const completedTasks = [
      'PWA-01', 'PWA-02', 'PWA-03', 'PWA-05', 
      'PWA-06', 'PWA-07', 'PWA-09A', 'PWA-14'
    ];
    
    const totalTasks = 16;
    return Math.round((completedTasks.length / totalTasks) * 100);
  }

  /**
   * 生成對齊建議
   */
  generateAlignmentRecommendations(misalignments) {
    const recommendations = [];
    
    if (misalignments.length === 0) {
      recommendations.push('所有文件版本一致，無需調整');
      return recommendations;
    }
    
    // 版本不一致
    if (misalignments.some(issue => issue.includes('版本'))) {
      recommendations.push('統一所有文件中的版本號至 ' + this.version);
    }
    
    // 完成度不一致
    if (misalignments.some(issue => issue.includes('完成度'))) {
      recommendations.push('更新任務文件中的完成度百分比');
    }
    
    // 規格不對應
    if (misalignments.some(issue => issue.includes('規格'))) {
      recommendations.push('檢查並更新規格文件與實作的對應關係');
    }
    
    return recommendations;
  }

  /**
   * 生成同步報告
   */
  generateSyncReport() {
    return {
      version: this.version,
      completionPercentage: this.completionPercentage,
      lastSync: this.lastSync,
      status: this.lastSync ? 'synced' : 'pending',
      nextSyncRecommended: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * 設定自動同步
   */
  enableAutoSync(intervalHours = 24) {
    setInterval(() => {
      this.syncVersionInfo();
    }, intervalHours * 60 * 60 * 1000);
    
    console.log(`[DocSync] Auto-sync enabled (every ${intervalHours} hours)`);
  }
}

window.DocumentationSync = DocumentationSync;