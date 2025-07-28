/**
 * PWA 功能注入器
 * 非侵入式地為既有頁面添加 PWA 功能
 */
class PWAInjector {
  
  /**
   * 主要注入方法
   */
  static async inject(options = {}) {
    const config = {
      injectManifest: true,
      injectServiceWorker: true,
      injectCollectionButton: true,
      injectPWAPrompt: true,
      ...options
    };
    
    console.log('PWA Injector starting...', config);
    
    try {
      if (config.injectManifest) {
        this.injectManifestLink();
      }
      
      if (config.injectServiceWorker) {
        await this.injectServiceWorkerRegistration();
      }
      
      if (config.injectCollectionButton) {
        this.injectCollectionButton();
      }
      
      if (config.injectPWAPrompt) {
        this.setupPWAPrompt();
      }
      
      console.log('PWA Injector completed successfully');
      
    } catch (error) {
      console.error('PWA Injector failed:', error);
    }
  }

  /**
   * 注入 manifest 連結
   */
  static injectManifestLink() {
    if (document.querySelector('link[rel="manifest"]')) {
      console.log('Manifest link already exists');
      return;
    }
    
    const basePath = PWACore.config.basePath || PWACore.getBasePath();
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = `${basePath}manifest.json`;
    
    if (!document.querySelector('meta[name="theme-color"]')) {
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#6868ac';
      document.head.appendChild(themeColor);
    }
    
    document.head.appendChild(manifestLink);
    console.log('Manifest link injected');
  }

  /**
   * 注入 Service Worker 註冊
   */
  static async injectServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported, skipping injection');
      return;
    }
    
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      console.log('Service Worker already registered');
      return;
    }
    
    const basePath = PWACore.config.basePath || PWACore.getBasePath();
    
    try {
      const registration = await navigator.serviceWorker.register(`${basePath}sw.js`);
      console.log('Service Worker injected and registered:', registration.scope);
    } catch (error) {
      console.error('Service Worker injection failed:', error);
    }
  }

  /**
   * 注入收藏按鈕
   */
  static injectCollectionButton() {
    if (document.querySelector('.save-to-collection, .collection-btn')) {
      console.log('Collection button already exists');
      return;
    }
    
    if (!this.hasCardData()) {
      console.log('No card data detected, skipping collection button');
      return;
    }
    
    const insertionPoint = this.findCollectionButtonInsertionPoint();
    if (!insertionPoint) {
      console.warn('No suitable insertion point found for collection button');
      return;
    }
    
    const collectionButton = this.createCollectionButton();
    insertionPoint.appendChild(collectionButton);
    
    console.log('Collection button injected');
  }

  /**
   * 檢查是否有名片資料
   */
  static hasCardData() {
    if (typeof currentData !== 'undefined' && currentData) return true;
    if (typeof window.cardData !== 'undefined' && window.cardData) return true;
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('data') || urlParams.get('c')) return true;
    
    if (document.querySelector('.name, .card-name, h1, h2')) return true;
    
    return false;
  }

  /**
   * 尋找收藏按鈕的最佳插入位置
   */
  static findCollectionButtonInsertionPoint() {
    let container = document.querySelector('.actions, .buttons, .card-actions, .btn-container');
    if (container) return container;
    
    const qrContainer = document.querySelector('.qr-container, .qr-code, #qrcode');
    if (qrContainer) {
      container = document.createElement('div');
      container.className = 'collection-actions';
      qrContainer.parentNode.insertBefore(container, qrContainer.nextSibling);
      return container;
    }
    
    const cardContainer = document.querySelector('.card, .business-card, .name-card');
    if (cardContainer) {
      container = document.createElement('div');
      container.className = 'collection-actions';
      cardContainer.appendChild(container);
      return container;
    }
    
    container = document.createElement('div');
    container.className = 'collection-actions';
    container.style.textAlign = 'center';
    container.style.margin = '20px 0';
    document.body.appendChild(container);
    return container;
  }

  /**
   * 建立收藏按鈕
   */
  static createCollectionButton() {
    const button = document.createElement('button');
    button.className = 'collection-btn save-to-collection';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      <span>收藏此名片</span>
    `;
    
    this.injectCollectionButtonStyles();
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      
      if (typeof window.saveToCollection === 'function') {
        await window.saveToCollection();
      } else {
        console.error('saveToCollection function not found');
        PWACore.showErrorMessage('收藏功能尚未就緒，請稍後再試');
      }
    });
    
    return button;
  }

  /**
   * 注入收藏按鈕樣式
   */
  static injectCollectionButtonStyles() {
    if (document.getElementById('collection-btn-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'collection-btn-styles';
    styles.textContent = `
      .collection-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #6868ac;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 8px;
        box-shadow: 0 2px 4px rgba(104, 104, 172, 0.2);
      }
      
      .collection-btn:hover {
        background: #5757a3;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(104, 104, 172, 0.3);
      }
      
      .collection-btn:active {
        transform: translateY(0);
      }
      
      .collection-btn svg {
        flex-shrink: 0;
      }
      
      .collection-actions {
        text-align: center;
        margin: 16px 0;
      }
      
      @media (max-width: 480px) {
        .collection-btn {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * 設置 PWA 安裝提示
   */
  static setupPWAPrompt() {
    let deferredPrompt = null;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      this.showInstallPrompt(deferredPrompt);
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      PWACore.showSuccessMessage('應用程式已安裝到您的設備');
      deferredPrompt = null;
    });
  }

  /**
   * 顯示安裝提示
   */
  static showInstallPrompt(deferredPrompt) {
    const installPromptDismissed = localStorage.getItem('pwa-install-dismissed');
    if (installPromptDismissed) return;
    
    setTimeout(() => {
      const promptBar = this.createInstallPromptBar(deferredPrompt);
      document.body.appendChild(promptBar);
    }, 3000);
  }

  /**
   * 建立安裝提示條
   */
  static createInstallPromptBar(deferredPrompt) {
    const promptBar = document.createElement('div');
    promptBar.className = 'pwa-install-prompt';
    promptBar.innerHTML = `
      <div class="install-prompt-content">
        <div class="install-prompt-text">
          <strong>安裝名片收藏應用</strong>
          <span>快速存取您的數位名片收藏</span>
        </div>
        <div class="install-prompt-actions">
          <button class="install-btn">安裝</button>
          <button class="dismiss-btn">×</button>
        </div>
      </div>
    `;
    
    this.injectInstallPromptStyles();
    
    promptBar.querySelector('.install-btn').addEventListener('click', async () => {
      try {
        await deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        console.log('Install prompt result:', result);
        promptBar.remove();
      } catch (error) {
        console.error('Install prompt failed:', error);
      }
    });
    
    promptBar.querySelector('.dismiss-btn').addEventListener('click', () => {
      promptBar.remove();
      localStorage.setItem('pwa-install-dismissed', 'true');
    });
    
    return promptBar;
  }

  /**
   * 注入安裝提示樣式
   */
  static injectInstallPromptStyles() {
    if (document.getElementById('install-prompt-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'install-prompt-styles';
    styles.textContent = `
      .pwa-install-prompt {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #6868ac 0%, #4e4e81 100%);
        color: white;
        z-index: 1000;
        transform: translateY(100%);
        animation: slideUp 0.3s ease-out forwards;
      }
      
      .install-prompt-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        max-width: 600px;
        margin: 0 auto;
      }
      
      .install-prompt-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .install-prompt-text strong {
        font-size: 14px;
        font-weight: 600;
      }
      
      .install-prompt-text span {
        font-size: 12px;
        opacity: 0.9;
      }
      
      .install-prompt-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .install-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .install-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .dismiss-btn {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        padding: 4px 8px;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }
      
      .dismiss-btn:hover {
        opacity: 1;
      }
      
      @keyframes slideUp {
        to { transform: translateY(0); }
      }
      
      @media (max-width: 480px) {
        .install-prompt-content {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }
        
        .install-prompt-actions {
          justify-content: space-between;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
}