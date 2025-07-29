/**
 * PWA-14: 跨平台相容性測試工具
 * 檢測不同平台和瀏覽器的功能支援度
 */

class CrossPlatformTester {
  constructor() {
    this.testResults = {};
    this.platformInfo = this.detectPlatform();
  }

  /**
   * 偵測平台資訊
   */
  detectPlatform() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    return {
      userAgent,
      platform,
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      isAndroid: /Android/.test(userAgent),
      isMobile: /Mobi|Android/i.test(userAgent),
      isChrome: /Chrome/.test(userAgent),
      isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
      isFirefox: /Firefox/.test(userAgent),
      version: this.extractVersion(userAgent)
    };
  }

  extractVersion(userAgent) {
    if (this.platformInfo?.isIOS) {
      const match = userAgent.match(/OS (\d+)_(\d+)/);
      return match ? `${match[1]}.${match[2]}` : 'unknown';
    }
    if (this.platformInfo?.isAndroid) {
      const match = userAgent.match(/Android (\d+\.?\d*)/);
      return match ? match[1] : 'unknown';
    }
    return 'unknown';
  }

  /**
   * 執行完整跨平台測試
   */
  async runFullTest() {
    console.log('[CrossPlatform] Starting cross-platform compatibility test...');
    
    const tests = [
      this.testPWASupport(),
      this.testIndexedDBSupport(),
      this.testServiceWorkerSupport(),
      this.testCryptoSupport(),
      this.testStorageAPI(),
      this.testOfflineCapability(),
      this.testInstallPrompt(),
      this.testNotificationSupport()
    ];

    const results = await Promise.allSettled(tests);
    
    this.testResults = {
      platform: this.platformInfo,
      timestamp: new Date().toISOString(),
      tests: results.map((result, index) => ({
        name: this.getTestName(index),
        status: result.status,
        result: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      })),
      overallScore: this.calculateScore(results)
    };

    console.log('[CrossPlatform] Test completed. Score:', this.testResults.overallScore);
    return this.testResults;
  }

  getTestName(index) {
    const names = [
      'PWA Support',
      'IndexedDB Support', 
      'Service Worker Support',
      'Crypto API Support',
      'Storage API Support',
      'Offline Capability',
      'Install Prompt',
      'Notification Support'
    ];
    return names[index] || `Test ${index}`;
  }

  /**
   * 測試 PWA 基本支援
   */
  async testPWASupport() {
    const support = {
      manifest: 'manifest' in window,
      serviceWorker: 'serviceWorker' in navigator,
      installPrompt: 'onbeforeinstallprompt' in window,
      standalone: window.matchMedia('(display-mode: standalone)').matches
    };

    return {
      supported: Object.values(support).some(Boolean),
      details: support,
      score: Object.values(support).filter(Boolean).length / 4
    };
  }

  /**
   * 測試 IndexedDB 支援
   */
  async testIndexedDBSupport() {
    if (!window.indexedDB) {
      return { supported: false, score: 0, error: 'IndexedDB not available' };
    }

    try {
      // 測試基本 IndexedDB 操作
      const testDB = await new Promise((resolve, reject) => {
        const request = indexedDB.open('test-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          db.createObjectStore('test', { keyPath: 'id' });
        };
      });

      // 測試寫入和讀取
      const transaction = testDB.transaction(['test'], 'readwrite');
      const store = transaction.objectStore('test');
      
      await new Promise((resolve, reject) => {
        const request = store.add({ id: 1, data: 'test' });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      testDB.close();
      indexedDB.deleteDatabase('test-db');

      return { supported: true, score: 1, details: 'Full IndexedDB support' };
    } catch (error) {
      return { supported: false, score: 0, error: error.message };
    }
  }

  /**
   * 測試 Service Worker 支援
   */
  async testServiceWorkerSupport() {
    if (!('serviceWorker' in navigator)) {
      return { supported: false, score: 0, error: 'Service Worker not available' };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      return {
        supported: true,
        score: 1,
        details: {
          registered: !!registration,
          active: !!registration?.active,
          scope: registration?.scope
        }
      };
    } catch (error) {
      return { supported: false, score: 0, error: error.message };
    }
  }

  /**
   * 測試 Crypto API 支援
   */
  async testCryptoSupport() {
    if (!window.crypto || !window.crypto.subtle) {
      return { supported: false, score: 0, error: 'Crypto API not available' };
    }

    try {
      // 測試 AES-GCM 加密
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const data = new TextEncoder().encode('test');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      // 測試 PBKDF2
      const password = new TextEncoder().encode('password');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        password,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 1000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      return {
        supported: true,
        score: 1,
        details: {
          aesGcm: true,
          pbkdf2: true,
          sha256: true
        }
      };
    } catch (error) {
      return { supported: false, score: 0, error: error.message };
    }
  }

  /**
   * 測試 Storage API 支援
   */
  async testStorageAPI() {
    const support = {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      storageEstimate: !!(navigator.storage && navigator.storage.estimate)
    };

    let estimate = null;
    if (support.storageEstimate) {
      try {
        estimate = await navigator.storage.estimate();
      } catch (error) {
        console.warn('[CrossPlatform] Storage estimate failed:', error);
      }
    }

    return {
      supported: support.localStorage && support.sessionStorage,
      score: Object.values(support).filter(Boolean).length / 3,
      details: { ...support, estimate }
    };
  }

  /**
   * 測試離線功能
   */
  async testOfflineCapability() {
    const support = {
      onlineStatus: 'onLine' in navigator,
      cacheAPI: 'caches' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
    };

    // 測試 Cache API
    let cacheTest = false;
    if (support.cacheAPI) {
      try {
        const cache = await caches.open('test-cache');
        await cache.put('/test', new Response('test'));
        const response = await cache.match('/test');
        cacheTest = !!response;
        await caches.delete('test-cache');
      } catch (error) {
        console.warn('[CrossPlatform] Cache API test failed:', error);
      }
    }

    return {
      supported: support.cacheAPI && cacheTest,
      score: (Object.values(support).filter(Boolean).length + (cacheTest ? 1 : 0)) / 4,
      details: { ...support, cacheTest }
    };
  }

  /**
   * 測試安裝提示
   */
  async testInstallPrompt() {
    const support = {
      beforeInstallPrompt: 'onbeforeinstallprompt' in window,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      webAppCapable: window.navigator.standalone !== undefined
    };

    return {
      supported: support.beforeInstallPrompt || support.webAppCapable,
      score: Object.values(support).filter(Boolean).length / 3,
      details: support
    };
  }

  /**
   * 測試通知支援
   */
  async testNotificationSupport() {
    if (!('Notification' in window)) {
      return { supported: false, score: 0, error: 'Notification API not available' };
    }

    const permission = Notification.permission;
    const support = {
      api: true,
      permission: permission !== 'denied',
      serviceWorkerNotification: 'serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype
    };

    return {
      supported: support.api,
      score: Object.values(support).filter(Boolean).length / 3,
      details: { ...support, currentPermission: permission }
    };
  }

  /**
   * 計算總分
   */
  calculateScore(results) {
    const scores = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value.score || 0);
    
    return scores.length > 0 ? 
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0;
  }

  /**
   * 生成測試報告
   */
  generateReport() {
    if (!this.testResults) {
      return 'No test results available. Run runFullTest() first.';
    }

    const { platform, tests, overallScore } = this.testResults;
    
    let report = `# PWA 跨平台相容性測試報告\n\n`;
    report += `**平台資訊:**\n`;
    report += `- 作業系統: ${platform.platform}\n`;
    report += `- 瀏覽器: ${platform.userAgent}\n`;
    report += `- 版本: ${platform.version}\n`;
    report += `- 行動裝置: ${platform.isMobile ? '是' : '否'}\n\n`;
    
    report += `**整體評分: ${overallScore}/100**\n\n`;
    
    report += `## 測試結果\n\n`;
    
    tests.forEach(test => {
      const status = test.status === 'fulfilled' && test.result?.supported ? '✅' : '❌';
      const score = test.result?.score ? Math.round(test.result.score * 100) : 0;
      
      report += `### ${status} ${test.name} (${score}%)\n`;
      
      if (test.error) {
        report += `**錯誤:** ${test.error}\n`;
      }
      
      if (test.result?.details) {
        report += `**詳細資訊:**\n`;
        Object.entries(test.result.details).forEach(([key, value]) => {
          report += `- ${key}: ${JSON.stringify(value)}\n`;
        });
      }
      
      report += `\n`;
    });
    
    return report;
  }

  /**
   * 獲取建議修復項目
   */
  getRecommendations() {
    if (!this.testResults) return [];

    const recommendations = [];
    const { platform, tests } = this.testResults;

    tests.forEach(test => {
      if (test.status !== 'fulfilled' || !test.result?.supported) {
        switch (test.name) {
          case 'IndexedDB Support':
            recommendations.push('考慮使用 localStorage 作為備用儲存方案');
            break;
          case 'Service Worker Support':
            recommendations.push('提供非 PWA 版本的備用方案');
            break;
          case 'Crypto API Support':
            recommendations.push('使用第三方加密庫作為備用方案');
            break;
          case 'Offline Capability':
            recommendations.push('簡化離線功能或提供線上模式');
            break;
          case 'Install Prompt':
            recommendations.push('提供手動安裝指引');
            break;
          case 'Notification Support':
            recommendations.push('使用其他提醒機制');
            break;
        }
      }
    });

    // 平台特定建議
    if (platform.isIOS && parseFloat(platform.version) < 12) {
      recommendations.push('iOS 12 以下版本 PWA 支援有限，建議升級提示');
    }
    
    if (platform.isAndroid && parseFloat(platform.version) < 8) {
      recommendations.push('Android 8 以下版本功能受限，建議升級提示');
    }

    return recommendations;
  }
}

window.CrossPlatformTester = CrossPlatformTester;