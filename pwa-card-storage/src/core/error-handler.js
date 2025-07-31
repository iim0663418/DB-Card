/**
 * PWA 錯誤處理和初始化診斷工具
 */

class PWAErrorHandler {
  constructor() {
    this.errors = [];
    this.initializationSteps = [];
    this.isDebugMode = localStorage.getItem('pwa-debug') === 'true';
  }

  logStep(step, status, details = null) {
    const stepInfo = {
      step,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.initializationSteps.push(stepInfo);
    
  }

  logError(error, context = 'Unknown') {
    const errorInfo = {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    this.errors.push(errorInfo);
    console.error(`[PWA-Error] ${context}:`, error);
  }

  async diagnoseInitializationFailure() {
    const diagnosis = {
      browser: this.getBrowserInfo(),
      features: this.checkBrowserFeatures(),
      storage: await this.checkStorageAvailability(),
      scripts: this.checkScriptLoading(),
      errors: this.errors,
      steps: this.initializationSteps
    };

    return diagnosis;
  }

  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  checkBrowserFeatures() {
    return {
      indexedDB: !!window.indexedDB,
      serviceWorker: 'serviceWorker' in navigator,
      webCrypto: !!window.crypto?.subtle,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      fetch: !!window.fetch,
      promise: !!window.Promise,
      webGL: !!window.WebGLRenderingContext
    };
  }

  async checkStorageAvailability() {
    const result = {
      indexedDB: false,
      localStorage: false,
      estimate: null
    };

    try {
      // Test IndexedDB
      const testDB = indexedDB.open('test-db', 1);
      await new Promise((resolve, reject) => {
        testDB.onsuccess = () => {
          result.indexedDB = true;
          testDB.result.close();
          indexedDB.deleteDatabase('test-db');
          resolve();
        };
        testDB.onerror = reject;
        testDB.onblocked = reject;
      });
    } catch (error) {
    }

    try {
      // Test localStorage
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      result.localStorage = true;
    } catch (error) {
    }

    try {
      // Get storage estimate
      if (navigator.storage?.estimate) {
        result.estimate = await navigator.storage.estimate();
      }
    } catch (error) {
    }

    return result;
  }

  checkScriptLoading() {
    const scripts = Array.from(document.scripts);
    return scripts.map(script => ({
      src: script.src,
      loaded: !script.onerror,
      async: script.async,
      defer: script.defer
    }));
  }

  showDiagnosticModal(diagnosis) {
    const modal = document.createElement('div');
    modal.className = 'modal diagnostic-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>🔧 應用程式初始化診斷</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="diagnostic-section">
            <h3>瀏覽器支援</h3>
            <ul>
              <li>IndexedDB: ${diagnosis.features.indexedDB ? '✅' : '❌'}</li>
              <li>Service Worker: ${diagnosis.features.serviceWorker ? '✅' : '❌'}</li>
              <li>Web Crypto: ${diagnosis.features.webCrypto ? '✅' : '❌'}</li>
              <li>Local Storage: ${diagnosis.features.localStorage ? '✅' : '❌'}</li>
            </ul>
          </div>
          
          <div class="diagnostic-section">
            <h3>儲存狀態</h3>
            <ul>
              <li>IndexedDB 可用: ${diagnosis.storage.indexedDB ? '✅' : '❌'}</li>
              <li>Local Storage 可用: ${diagnosis.storage.localStorage ? '✅' : '❌'}</li>
              ${diagnosis.storage.estimate ? `<li>可用空間: ${Math.round(diagnosis.storage.estimate.quota / 1024 / 1024)} MB</li>` : ''}
            </ul>
          </div>

          ${diagnosis.errors.length > 0 ? `
            <div class="diagnostic-section">
              <h3>錯誤記錄</h3>
              <div class="error-list">
                ${diagnosis.errors.map(error => `
                  <div class="error-item">
                    <strong>${error.context}:</strong> ${error.error}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="diagnostic-actions">
            <button id="retry-init" class="btn btn-primary">重新初始化</button>
            <button id="clear-data" class="btn btn-secondary">清除資料</button>
            <button id="download-log" class="btn btn-secondary">下載診斷記錄</button>
          </div>
        </div>
      </div>
    `;

    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const retryBtn = modal.querySelector('#retry-init');
    const clearBtn = modal.querySelector('#clear-data');
    const downloadBtn = modal.querySelector('#download-log');

    const closeModal = () => modal.remove();

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    
    retryBtn.addEventListener('click', () => {
      closeModal();
      window.location.reload();
    });

    clearBtn.addEventListener('click', async () => {
      if (confirm('確定要清除所有本地資料嗎？這將刪除所有儲存的名片。')) {
        try {
          localStorage.clear();
          sessionStorage.clear();
          
          if (window.indexedDB) {
            const databases = await indexedDB.databases();
            for (const db of databases) {
              indexedDB.deleteDatabase(db.name);
            }
          }
          
          alert('資料已清除，頁面將重新載入');
          window.location.reload();
        } catch (error) {
          alert('清除資料失敗：' + error.message);
        }
      }
    });

    downloadBtn.addEventListener('click', () => {
      const logData = JSON.stringify(diagnosis, null, 2);
      const blob = new Blob([logData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pwa-diagnostic-${new Date().toISOString().slice(0, 19)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.body.appendChild(modal);
  }

  enableDebugMode() {
    localStorage.setItem('pwa-debug', 'true');
    this.isDebugMode = true;
  }

  disableDebugMode() {
    localStorage.removeItem('pwa-debug');
    this.isDebugMode = false;
  }
}

// 全域錯誤處理器
window.pwaErrorHandler = new PWAErrorHandler();

// 全域錯誤捕獲
window.addEventListener('error', (event) => {
  window.pwaErrorHandler.logError(event.error, 'Global Error');
});

window.addEventListener('unhandledrejection', (event) => {
  window.pwaErrorHandler.logError(new Error(event.reason), 'Unhandled Promise Rejection');
});

