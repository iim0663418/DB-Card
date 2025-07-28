/**
 * PWA 核心功能模組
 * 提供統一的 PWA 初始化與配置管理
 */
class PWACore {
  static config = {
    basePath: null,
    isGitHubPages: false,
    pageType: null,
    dataFormat: null
  };

  /**
   * 初始化 PWA 核心功能 - 優化版本
   */
  static async init(pageType = 'single', dataFormat = 'legacy') {
    const startTime = performance.now();
    console.log(`PWA Core initializing: ${pageType}/${dataFormat}`);
    
    this.config.pageType = pageType;
    this.config.dataFormat = dataFormat;
    this.detectEnvironment();
    
    // 並行初始化以提升效能
    await Promise.all([
      this.registerServiceWorker(),
      this.updateManifestPaths(),
      this.initCollectionFeature()
    ]);
    
    const endTime = performance.now();
    console.log(`PWA Core initialization complete in ${(endTime - startTime).toFixed(2)}ms`);
  }

  /**
   * 檢測部署環境
   */
  static detectEnvironment() {
    this.config.isGitHubPages = location.hostname.includes('github.io');
    this.config.isCloudflarePages = location.hostname.includes('.pages.dev');
    this.config.basePath = this.getBasePath();
    
    const envType = this.config.isGitHubPages ? 'GitHub Pages' : 
                   this.config.isCloudflarePages ? 'Cloudflare Pages' : 'Self-hosted';
    console.log(`Environment: ${envType}`);
    console.log(`Base path: ${this.config.basePath}`);
  }

  /**
   * 取得基礎路徑
   */
  static getBasePath() {
    // GitHub Pages 子目錄部署
    if (this.config.isGitHubPages) {
      const pathSegments = location.pathname.split('/').filter(Boolean);
      return pathSegments.length > 0 ? `/${pathSegments[0]}/` : '/';
    }
    
    // 其他環境（包含 Cloudflare Pages、自訂網域）使用根路徑
    return '/';
  }

  /**
   * 註冊 Service Worker
   */
  static async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      const swPath = `${this.config.basePath}sw.js`;
      const registration = await navigator.serviceWorker.register(swPath);
      
      console.log('Service Worker registered:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * 動態更新 manifest 路徑
   */
  static async updateManifestPaths() {
    // 只有 GitHub Pages 子目錄部署需要更新路徑
    if (!this.config.isGitHubPages || this.config.basePath === '/') return;

    try {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        const currentHref = manifestLink.getAttribute('href');
        if (!currentHref.startsWith(this.config.basePath)) {
          manifestLink.setAttribute('href', `${this.config.basePath}manifest.json`);
          console.log('Manifest path updated for GitHub Pages subdirectory');
        }
      }
    } catch (error) {
      console.error('Failed to update manifest paths:', error);
    }
  }

  /**
   * 初始化收藏功能 - 優化版本
   */
  static async initCollectionFeature() {
    // 批量載入模組以提升效能
    const modulesToLoad = [];
    
    if (typeof FormatParser === 'undefined') {
      modulesToLoad.push('format-parser.js');
    }
    
    if (typeof window.pwaStorage === 'undefined') {
      modulesToLoad.push('pwa-storage.js');
    }
    
    // 並行載入模組
    if (modulesToLoad.length > 0) {
      await Promise.all(modulesToLoad.map(module => this.loadModule(module)));
    }
    
    window.saveToCollection = this.createUniversalSaveFunction();
    
    console.log('Collection feature initialized');
  }

  /**
   * 創建通用收藏函數
   */
  static createUniversalSaveFunction() {
    return async function saveToCollection() {
      try {
        console.log('Universal save to collection triggered');
        
        const cardData = PWACore.extractCardData();
        
        if (!cardData) {
          throw new Error('No card data found on current page');
        }
        
        const normalizedData = FormatParser.normalize(cardData.data, cardData.format);
        
        if (!window.pwaStorage) {
          window.pwaStorage = new PWAStorage();
        }
        await window.pwaStorage.init();
        
        const existingCard = await window.pwaStorage.findCard(normalizedData.email || normalizedData.name);
        
        if (existingCard) {
          const shouldUpdate = await PWACore.showUpdateDialog(existingCard, normalizedData);
          if (!shouldUpdate) return;
          
          await window.pwaStorage.updateCard(existingCard.id, normalizedData);
          PWACore.showSuccessMessage('名片已更新');
        } else {
          await window.pwaStorage.saveCard(normalizedData, 'NFC');
          PWACore.showSuccessMessage('名片已收藏');
        }
        
        PWACore.showActionDialog();
        
      } catch (error) {
        console.error('Save to collection failed:', error);
        PWACore.showErrorMessage('收藏失敗: ' + error.message);
      }
    };
  }

  /**
   * 從當前頁面提取名片數據
   */
  static extractCardData() {
    // 檢查全域變數 (單語版)
    if (typeof currentData !== 'undefined' && currentData) {
      return { source: 'global', data: currentData, format: 'legacy' };
    }
    
    // 檢查雙語版全域變數
    if (typeof window.cardData !== 'undefined' && window.cardData) {
      return { source: 'bilingual', data: window.cardData, format: 'bilingual' };
    }
    
    // 從 URL 參數解析
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data') || urlParams.get('c');
    
    if (dataParam) {
      try {
        const decoded = FormatParser.decodeFromURL(dataParam);
        return { source: 'url', data: decoded, format: 'url' };
      } catch (error) {
        console.warn('Failed to parse URL data:', error);
      }
    }
    
    // 從 DOM 提取
    const nameElement = document.querySelector('.name, .card-name, h1, h2');
    if (nameElement) {
      return { 
        source: 'dom', 
        data: PWACore.extractFromDOM(), 
        format: 'dom' 
      };
    }
    
    return null;
  }

  /**
   * 從 DOM 提取基本資訊
   */
  static extractFromDOM() {
    const name = document.querySelector('.name, .card-name, h1, h2')?.textContent?.trim();
    const title = document.querySelector('.title, .card-title, .job-title')?.textContent?.trim();
    const email = document.querySelector('a[href^="mailto:"]')?.href?.replace('mailto:', '');
    const phone = document.querySelector('a[href^="tel:"]')?.href?.replace('tel:', '');
    
    return {
      name: name || '',
      title: title || '',
      email: email || '',
      phone: phone || '',
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * 顯示更新確認對話框 - 安全版本
   */
  static async showUpdateDialog(existingCard, newCard) {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      
      const title = document.createElement('h3');
      title.textContent = '名片已存在';
      
      const desc = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = existingCard.name;
      desc.appendChild(strong);
      desc.appendChild(document.createTextNode(' 的名片已在收藏中。'));
      
      const question = document.createElement('p');
      question.textContent = '是否要更新為新的資訊？';
      
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-cancel';
      cancelBtn.textContent = '取消';
      
      const updateBtn = document.createElement('button');
      updateBtn.className = 'btn-update';
      updateBtn.textContent = '更新';
      
      actions.appendChild(cancelBtn);
      actions.appendChild(updateBtn);
      
      content.appendChild(title);
      content.appendChild(desc);
      content.appendChild(question);
      content.appendChild(actions);
      
      const modal = PWACore.createModal(content);
      
      cancelBtn.onclick = () => {
        modal.remove();
        resolve(false);
      };
      
      updateBtn.onclick = () => {
        modal.remove();
        resolve(true);
      };
    });
  }

  /**
   * 顯示後續操作選項 - 安全版本
   */
  static showActionDialog() {
    const content = document.createElement('div');
    
    const title = document.createElement('h3');
    title.textContent = '收藏成功！';
    
    const desc = document.createElement('p');
    desc.textContent = '您希望接下來要做什麼？';
    
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    
    const collectionBtn = document.createElement('button');
    collectionBtn.className = 'btn-collection';
    collectionBtn.textContent = '查看收藏';
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn-continue';
    continueBtn.textContent = '繼續掃描';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-close';
    closeBtn.textContent = '關閉';
    
    actions.appendChild(collectionBtn);
    actions.appendChild(continueBtn);
    actions.appendChild(closeBtn);
    
    content.appendChild(title);
    content.appendChild(desc);
    content.appendChild(actions);
    
    const modal = PWACore.createModal(content);
    
    collectionBtn.onclick = () => {
      window.location.href = `${PWACore.config.basePath}collection.html`;
    };
    
    continueBtn.onclick = () => {
      modal.remove();
      if (typeof startScanning === 'function') {
        startScanning();
      }
    };
    
    closeBtn.onclick = () => {
      modal.remove();
    };
    
    setTimeout(() => {
      if (modal.parentNode) modal.remove();
    }, 3000);
  }

  /**
   * 創建安全模態框
   */
  static createModal(content) {
    const modal = document.createElement('div');
    modal.className = 'pwa-modal';
    
    const overlay = document.createElement('div');
    overlay.className = 'pwa-modal-overlay';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'pwa-modal-content';
    
    // 安全地設置內容
    if (typeof content === 'string') {
      contentDiv.innerHTML = SecurityUtils.sanitizeText(content);
    } else if (content instanceof HTMLElement) {
      contentDiv.appendChild(content);
    }
    
    overlay.appendChild(contentDiv);
    modal.appendChild(overlay);
    
    if (!document.getElementById('pwa-modal-styles')) {
      const styles = document.createElement('style');
      styles.id = 'pwa-modal-styles';
      styles.textContent = `
        .pwa-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pwa-modal-overlay {
          background: rgba(0,0,0,0.5);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .pwa-modal-content {
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          color: #333;
        }
        .modal-actions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .modal-actions button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }
        .btn-update, .btn-collection {
          background: #6868ac;
          color: white;
          border-color: #6868ac;
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    return modal;
  }

  /**
   * 顯示成功訊息
   */
  static showSuccessMessage(message) {
    PWACore.showToast(message, 'success');
  }

  /**
   * 顯示錯誤訊息
   */
  static showErrorMessage(message) {
    PWACore.showToast(message, 'error');
  }

  /**
   * 顯示提示訊息
   */
  static showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `pwa-toast pwa-toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10001;
      animation: slideInRight 0.3s ease-out;
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#6868ac'};
    `;
    toast.textContent = message;
    
    if (!document.getElementById('pwa-toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'pwa-toast-styles';
      styles.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 安全動態載入模組
   */
  static async loadModule(modulePath) {
    // 路徑安全檢查
    const safePath = SecurityUtils.sanitizePath(modulePath);
    if (!safePath) {
      throw new Error(`Invalid module path: ${modulePath}`);
    }
    
    // 檢查是否已載入
    const existingScript = document.querySelector(`script[src*="${safePath}"]`);
    if (existingScript) {
      console.log(`Module ${safePath} already loaded`);
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${this.config.basePath}${safePath}`;
      script.async = true;
      script.onload = () => {
        console.log(`Module ${safePath} loaded successfully`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`Failed to load module ${safePath}:`, error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }
}

// 頁面類型檢測
PWACore.detectPageType = function() {
  const url = window.location.pathname;
  if (url.includes('bilingual')) return 'bilingual';
  if (url.includes('personal')) return 'personal';
  return 'single';
};

// 數據格式檢測
PWACore.detectDataFormat = function() {
  if (typeof window.cardData !== 'undefined') return 'bilingual';
  if (document.querySelector('[data-format="vcard"]')) return 'vcard';
  return 'legacy';
};