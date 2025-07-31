/**
 * PWA 名片儲存應用程式主控制器
 * 負責應用程式初始化、路由管理和全域狀態管理
 */

class PWACardApp {
  constructor() {
    this.currentPage = 'home';
    this.isOnline = navigator.onLine;
    this.storage = null;
    this.cardManager = null;
    this.offlineTools = null;
    this.currentLanguage = 'zh';
    
    this.init();
  }

  async init() {
    try {
      window.pwaErrorHandler?.logStep('App Init Start', 'STARTED');
      
      this.showLoading('初始化應用程式...');
      
      window.pwaErrorHandler?.logStep('Initialize Services', 'STARTING');
      await this.initializeServices();
      window.pwaErrorHandler?.logStep('Initialize Services', 'COMPLETED');
      
      window.pwaErrorHandler?.logStep('Setup Event Listeners', 'STARTING');
      this.setupEventListeners();
      window.pwaErrorHandler?.logStep('Setup Event Listeners', 'COMPLETED');
      
      window.pwaErrorHandler?.logStep('Initialize UI', 'STARTING');
      this.initializeUI();
      window.pwaErrorHandler?.logStep('Initialize UI', 'COMPLETED');
      
      window.pwaErrorHandler?.logStep('Load Initial Data', 'STARTING');
      await this.loadInitialData();
      window.pwaErrorHandler?.logStep('Load Initial Data', 'COMPLETED');
      
      this.hideLoading();
      window.pwaErrorHandler?.logStep('App Init Complete', 'SUCCESS');
      
    } catch (error) {
      console.error('[PWA] Initialization failed:', error);
      window.pwaErrorHandler?.logError(error, 'App Initialization');
      
      this.hideLoading();
      
      // 顯示診斷介面
      if (window.pwaErrorHandler) {
        const diagnosis = await window.pwaErrorHandler.diagnoseInitializationFailure();
        window.pwaErrorHandler.showDiagnosticModal(diagnosis);
      } else {
        this.showNotification('應用程式初始化失敗', 'error');
      }
    }
  }

  async initializeServices() {
    try {
      window.pwaErrorHandler?.logStep('Check PWACardStorage', 'CHECKING');
      
      // 初始化核心儲存
      if (typeof PWACardStorage !== 'undefined') {
        window.pwaErrorHandler?.logStep('PWACardStorage Found', 'SUCCESS');
        
        window.pwaErrorHandler?.logStep('Create Storage Instance', 'STARTING');
        this.storage = new PWACardStorage();
        window.pwaErrorHandler?.logStep('Create Storage Instance', 'SUCCESS');
        
        window.pwaErrorHandler?.logStep('Storage Initialize', 'STARTING');
        await this.storage.initialize();
        window.pwaErrorHandler?.logStep('Storage Initialize', 'SUCCESS');
        
      } else {
        window.pwaErrorHandler?.logStep('PWACardStorage Check', 'FAILED', 'PWACardStorage class not found');
        throw new Error('PWACardStorage not available');
      }
      
      // 初始化名片管理器
      if (typeof PWACardManager !== 'undefined') {
        try {
          this.cardManager = new PWACardManager(this.storage);
          await this.cardManager.initialize();
        } catch (error) {
          console.error('[PWA] Card manager initialization failed:', error);
          this.cardManager = null;
        }
      } else {
        this.cardManager = null;
      }
      
      // 初始化健康管理器
      if (typeof HealthManager !== 'undefined' && this.storage) {
        this.healthManager = new HealthManager(this.storage);
        await this.healthManager.initialize();
      }
      
      // 版本管理功能現在已整合到 storage 中
      
      // 資料遷移功能已移除
      
      // 初始化離線工具
      if (typeof OfflineToolsManager !== 'undefined' && this.cardManager) {
        this.offlineTools = new OfflineToolsManager(this.cardManager);
      }
      
      // 初始化傳輸管理器
      if (typeof TransferManager !== 'undefined' && this.cardManager) {
        this.transferManager = new TransferManager(this.cardManager);
      }
      
      // 初始化 QR 掃描器（優雅降級）
      if (typeof QRScannerManager !== 'undefined' && this.cardManager) {
        try {
          this.qrScanner = new QRScannerManager(this.cardManager);
          await this.qrScanner.initialize();
        } catch (error) {
          this.qrScanner = null;
          // 不拋出錯誤，讓應用程式繼續運行
        }
      }
      
    } catch (error) {
      console.error('[PWA] Service initialization failed:', error);
      throw error;
    }
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        this.navigateTo(page);
      });
    });

    document.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
      });
    });

    const searchInput = document.getElementById('card-search');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce((e) => {
        this.searchCards(e.target.value);
      }, 300));
    }

    const filterSelect = document.getElementById('card-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterCards(e.target.value);
      });
    }

    const importUrlBtn = document.getElementById('import-url-btn');
    if (importUrlBtn) {
      importUrlBtn.addEventListener('click', () => {
        this.importFromUrl();
      });
    }

    const importFileInput = document.getElementById('import-file');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        this.importFromFile(e.target.files[0]);
      });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportCards();
      });
    }

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateConnectionStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateConnectionStatus();
    });

    const notificationClose = document.querySelector('.notification-close');
    if (notificationClose) {
      notificationClose.addEventListener('click', () => {
        this.hideNotification();
      });
    }

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        this.toggleLanguage();
      });
    }
  }

  initializeUI() {
    this.updateConnectionStatus();
    this.updateLanguageUI();
    this.navigateTo('home');
    this.handleUrlParams();
  }

  async loadInitialData() {
    try {
      await this.updateStats();
      
      // 資料遷移功能已移除，直接載入資料
      
      // 執行基本的資料健康檢查
      if (this.storage) {
        try {
          const healthCheck = await this.storage.performHealthCheck();
          if (!healthCheck.healthy && healthCheck.corruptedCount > 0) {
            this.showNotification(`發現 ${healthCheck.corruptedCount} 張損壞的名片`, 'warning');
          }
        } catch (error) {
        }
      }
    } catch (error) {
      console.error('[PWA] Failed to load initial data:', error);
    }
  }

  handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    let data = urlParams.get('data') || urlParams.get('c');
    
    // 處理 URL hash 中的參數
    if (!data && window.location.hash) {
      const hashParams = window.location.hash.substring(1);
      if (hashParams.startsWith('c=')) {
        data = hashParams.substring(2);
      } else if (hashParams.startsWith('data=')) {
        data = hashParams.substring(5);
      }
    }


    if (data) {
      // 自動匯入名片資料
      setTimeout(() => {
        this.importFromUrlData(data);
      }, 1000); // 等待初始化完成
    } else if (action === 'browse') {
      this.navigateTo('cards');
    }
  }
  
  async importFromUrlData(data) {
    try {
      this.showLoading('讀取名片資料...');
      
      // PWA-36 修復：確保 URL 資訊正確傳遞
      const currentUrl = window.location.href;
      console.log('[App] 當前 URL:', currentUrl);
      console.log('[App] 輸入資料:', data);
      
      // PWA-24 直通管道：使用精簡解析器
      if (!window.SimpleCardParser) {
        this.showNotification('精簡解析器未載入', 'error');
        return;
      }
      
      const cardData = window.SimpleCardParser.parseDirectly(data);
      
      if (!cardData) {
        this.showNotification('無法解析名片資料', 'error');
        return;
      }
      
      // PWA-36 修復：將 URL 資訊添加到名片資料中
      cardData.url = currentUrl;
      
      // PWA-36 修復：從 referrer 或 URL 參數中推斷原始來源
      const referer = document.referrer;
      console.log('[App] 檢查 referrer:', referer);
      
      if (referer && !referer.includes('pwa-card-storage')) {
        // referrer 不是 PWA 頁面，可能是原始來源
        console.log('[App] 使用 referrer 作為原始來源:', referer);
        window.PWAIntegration?.storeSourceContext(referer, cardData);
      } else {
        console.log('[App] 無有效 referrer，依賴資料特徵識別');
      }
      
      console.log('[App] 添加 URL 後的資料:', cardData);
      
      // 驗證解析結果
      if (!window.SimpleCardParser.validateParsedData(cardData)) {
        this.showNotification('名片資料驗證失敗', 'error');
        return;
      }
      
      // PWA-24 直接儲存，跳過所有中間處理
      if (this.storage) {
        try {
          // 確保使用直通儲存方法，不經過任何標準化處理
          if (typeof this.storage.storeCardDirectly !== 'function') {
            this.showNotification('直通儲存方法未載入', 'error');
            return;
          }
          
          const cardId = await this.storage.storeCardDirectly(cardData);
          
          this.showNotification('名片已儲存', 'success');
          
          await this.updateStats();
          this.navigateTo('cards');
        } catch (storeError) {
          this.showNotification(`儲存失敗: ${storeError.message}`, 'error');
        }
      } else {
        this.showNotification('儲存服務未初始化', 'error');
      }
    } catch (error) {
      console.error('[App] Import from URL data failed:', error);
      this.showNotification('讀取名片失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * PWA-24 直通處理：舊的複雜處理方法已移除
   * 現在使用 SimpleCardParser.parseDirectly() 和 storage.storeCardDirectly()
   * 實現零資料遺失的直通管道處理
   */

  /**
   * 簡化的問候語字串提取 - 用於顯示
   */
  extractStringFromGreeting(greeting, language = 'zh') {
    if (!greeting) return '';
    
    if (typeof greeting === 'string') {
      // PWA-24: 直接使用字串，支援雙語格式 "中文~English"
      if (greeting.includes('~')) {
        const parts = greeting.split('~');
        return language === 'en' ? (parts[1] || parts[0]) : parts[0];
      }
      return greeting;
    }
    
    // 物件格式處理
    if (typeof greeting === 'object' && greeting !== null) {
      return greeting[language] || greeting.zh || greeting.en || '';
    }
    
    return String(greeting || '');
  }
  
  /**
   * 標準化名片類型識別 - 全域通用
   */
  identifyCardType(data) {
    if (typeof data === 'string') data = { url: data };
    
    if (data.url) {
      const url = data.url.toLowerCase().trim();
      if (url.includes('index1-bilingual.html')) return 'bilingual1';
      if (url.includes('index-bilingual-personal.html')) return 'personal-bilingual';
      if (url.includes('index-bilingual.html')) return 'bilingual';
      if (url.includes('index1-en.html')) return 'en1';
      if (url.includes('index-personal-en.html')) return 'personal-en';
      if (url.includes('index-en.html')) return 'en';
      if (url.includes('index-personal.html')) return 'personal';
      if (url.includes('index1.html')) return 'index1';
      if (url.includes('index.html')) return 'index';
    }
    
    const isBilingual = (typeof data.name === 'string' && data.name.includes('~')) || 
                       (typeof data.title === 'string' && data.title.includes('~'));
    const isGov = data.organization && data.department;
    const isShinGuang = (typeof data.address === 'string') && 
                       (data.address.includes('新光') || data.address.includes('松仁路'));
    
    if (isBilingual) {
      return isGov ? (isShinGuang ? 'bilingual1' : 'bilingual') : 'personal-bilingual';
    }
    
    return isGov ? (isShinGuang ? 'index1' : 'index') : 'personal';
  }
  

  

  

  

  


  navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });
    document.getElementById(`page-${page}`)?.classList.add('active');

    this.currentPage = page;
    this.initializePage(page);
  }

  async initializePage(page) {
    switch (page) {
      case 'home':
        await this.updateStats();
        break;
      case 'cards':
        await this.initializeCardsList();
        break;
      case 'import':
        const urlInput = document.getElementById('import-url');
        if (urlInput) urlInput.value = '';
        break;
      case 'export':
        document.getElementById('export-all').checked = true;
        document.getElementById('export-versions').checked = false;
        document.getElementById('export-encrypt').checked = false;
        break;
    }
  }

  async handleQuickAction(action) {
    switch (action) {
      case 'add-card':
        this.navigateTo('import');
        break;
      case 'scan-qr':
        await this.scanQRCode();
        break;
      case 'import-file':
        document.getElementById('import-file')?.click();
        break;
      case 'backup-all':
        this.navigateTo('export');
        break;
    }
  }

  async updateStats() {
    try {
      
      if (!this.storage) {
        return;
      }

      const stats = await this.storage.getStorageStats();
      
      const totalCardsEl = document.getElementById('total-cards');
      const storageUsedEl = document.getElementById('storage-used');
      const lastSyncEl = document.getElementById('last-sync');
      
      if (totalCardsEl) totalCardsEl.textContent = stats.totalCards || 0;
      if (storageUsedEl) storageUsedEl.textContent = `${stats.storageUsedPercent || 0}%`;
      
      // 獲取版本統計資訊
      try {
        const versionStats = await this.storage.getVersionStats();
        if (lastSyncEl) {
          lastSyncEl.textContent = versionStats.totalVersions > 0 ? '已同步' : '從未';
        }
      } catch (error) {
        if (lastSyncEl) lastSyncEl.textContent = '從未';
      }

      const storageStatus = document.getElementById('storage-status');
      if (storageStatus) {
        const usedPercent = stats.storageUsedPercent || 0;
        if (usedPercent > 80) {
          storageStatus.textContent = '儲存空間不足';
          storageStatus.className = 'status-text text-warning';
        } else {
          storageStatus.textContent = '儲存空間充足';
          storageStatus.className = 'status-text';
        }
      }
      
    } catch (error) {
      console.error('[PWA] Failed to update stats:', error);
    }
  }

  async initializeCardsList() {
    try {
      const cardsList = document.getElementById('cards-list');
      if (cardsList && this.storage) {
        if (!window.cardList) {
          // 使用 storage 直接初始化，不依賴 cardManager
          window.cardList = new CardListComponent(cardsList, { storage: this.storage });
        }
        await window.cardList.loadCards();
      } else {
      }
    } catch (error) {
      console.error('[PWA] Failed to initialize cards list:', error);
      this.showNotification('初始化名片列表失敗', 'error');
    }
  }

  async importFromUrl() {
    const urlInput = document.getElementById('import-url');
    const url = urlInput?.value?.trim();

    if (!url) {
      this.showNotification('請輸入名片連結', 'warning');
      return;
    }

    try {
      this.showLoading('匯入名片中...');
      
      if (this.cardManager) {
        const result = await this.cardManager.importFromUrl(url);
        if (result.success) {
          this.showNotification('名片匯入成功', 'success');
          urlInput.value = '';
          await this.updateStats();
        } else {
          this.showNotification(result.error || '匯入失敗', 'error');
        }
      }
    } catch (error) {
      console.error('[PWA] Import from URL failed:', error);
      this.showNotification('匯入失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  async importFromFile(file) {
    if (!file) return;

    try {
      this.showLoading('匯入檔案中...');
      
      // 檢查是否為加密檔案
      if (file.name.endsWith('.enc') && this.transferManager) {
        const password = prompt('請輸入解密密碼：');
        if (!password) {
          this.hideLoading();
          return;
        }
        
        const result = await this.transferManager.importData(file, password);
        
        if (result.needsConflictResolution) {
          await this.handleConflictResolution(result.conflicts, result.importData);
        } else if (result.success) {
          this.showNotification(`成功匯入 ${result.importedCount} 張名片`, 'success');
          await this.updateStats();
        } else {
          this.showNotification(result.error || '匯入失敗', 'error');
        }
      } else if (this.cardManager) {
        // 一般檔案匯入
        const result = await this.cardManager.importFromFile(file);
        if (result.success) {
          this.showNotification(`成功匯入 ${result.count} 張名片`, 'success');
          await this.updateStats();
        } else {
          this.showNotification(result.error || '匯入失敗', 'error');
        }
      }
    } catch (error) {
      console.error('[PWA] Import from file failed:', error);
      this.showNotification('匯入失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  async exportCards() {
    try {
      const exportAll = document.getElementById('export-all')?.checked;
      const includeVersions = document.getElementById('export-versions')?.checked;
      const encrypt = document.getElementById('export-encrypt')?.checked;

      this.showLoading('匯出資料中...');

      if (this.transferManager && encrypt) {
        // 使用加密匯出
        const password = prompt('請輸入加密密碼：');
        if (!password) {
          this.hideLoading();
          return;
        }
        
        const result = await this.transferManager.exportEncrypted({
          exportAll,
          includeVersions,
          encryptWithPassword: true,
          password
        });

        if (result.success) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(result.file);
          link.download = result.filename;
          link.click();
          
          this.showNotification('加密匯出成功', 'success');
        } else {
          this.showNotification(result.error || '匯出失敗', 'error');
        }
      } else if (this.cardManager) {
        // 使用一般匯出
        const result = await this.cardManager.exportCards({
          exportAll,
          includeVersions,
          encrypt: false
        });

        if (result.success) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(result.file);
          link.download = result.filename;
          link.click();
          
          this.showNotification('匯出成功', 'success');
        } else {
          this.showNotification(result.error || '匯出失敗', 'error');
        }
      }
    } catch (error) {
      console.error('[PWA] Export failed:', error);
      this.showNotification('匯出失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  async scanQRCode() {
    try {
      
      if (this.qrScanner) {
        await this.qrScanner.openScannerModal();
      } else {
        this.showNotification('QR 掃描器未初始化', 'error');
        
        // 備用方案：顯示簡單的手動輸入介面
        this.showSimpleQRInput();
      }
    } catch (error) {
      console.error('[PWA] QR scan failed:', error);
      this.showNotification('QR 掃描功能啟動失敗', 'error');
      
      // 備用方案
      this.showSimpleQRInput();
    }
  }
  
  /**
   * 顯示簡單的 QR 輸入介面（備用方案）
   */
  showSimpleQRInput() {
    const modal = document.createElement('div');
    modal.className = 'modal qr-input-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>📱 名片匯入</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="input-section">
            <h3>手動輸入名片連結</h3>
            <p>請貼上完整的名片連結：</p>
            <input type="url" id="simple-manual-url" placeholder="https://example.com/index.html?data=... 或 ?c=..." class="url-input">
            <button id="simple-manual-import" class="btn btn-primary">匯入名片</button>
          </div>
          <div class="help-section">
            <h4>💡 使用說明</h4>
            <ul>
              <li>從其他人的數位名片複製完整連結</li>
              <li>確保連結包含 ?data= 或 ?c= 參數</li>
              <li>支援所有 DB-Card 格式的名片</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const manualImport = modal.querySelector('#simple-manual-import');
    const manualUrl = modal.querySelector('#simple-manual-url');
    
    // 關閉事件
    const closeModal = () => {
      modal.remove();
    };
    
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    
    // 手動匯入事件
    manualImport.addEventListener('click', async () => {
      const url = manualUrl.value.trim();
      if (url) {
        closeModal();
        try {
          // 解析 URL 並匯入名片 - 支援雙語版本
          const urlObj = new URL(url);
          const data = urlObj.searchParams.get('data') || urlObj.searchParams.get('c');
          
          if (data) {
            await this.importFromUrlData(data);
          } else if (urlObj.hash && urlObj.hash.startsWith('#c=')) {
            const hashData = urlObj.hash.substring(3);
            await this.importFromUrlData(hashData);
          } else if (urlObj.hash && urlObj.hash.startsWith('#data=')) {
            const hashData = urlObj.hash.substring(6);
            await this.importFromUrlData(hashData);
          } else {
            this.showNotification('無法解析名片連結，請確認連結格式正確', 'error');
          }
        } catch (error) {
          this.showNotification('連結格式不正確', 'error');
        }
      } else {
        this.showNotification('請輸入名片連結', 'warning');
      }
    });
    
    document.body.appendChild(modal);
  }

  async viewCard(cardId) {
    try {
      
      if (!this.cardManager) {
        this.showNotification('名片管理器未初始化', 'error');
        return;
      }

      const card = await this.storage.getCard(cardId);
      if (!card) {
        this.showNotification('名片不存在', 'error');
        return;
      }

      this.showCardModal(card);
    } catch (error) {
      console.error('[PWA] View card failed:', error);
      this.showNotification('檢視名片失敗', 'error');
    }
  }

  async generateQR(cardId) {
    try {
      
      if (!this.cardManager) {
        this.showNotification('CardManager 未初始化', 'error');
        return;
      }
      
      this.showLoading('生成 QR 碼中...');
      const result = await this.cardManager.generateQRCode(cardId, {
        size: 800, // 高解析度
        colorDark: '#6b7280',
        colorLight: '#ffffff'
      });
      
      
      if (result.success) {
        this.showQRModal(result.dataUrl, result.url, cardId);
      } else {
        this.showNotification(result.error || 'QR 碼生成失敗', 'error');
      }
    } catch (error) {
      console.error('[PWA] Generate QR failed:', error);
      this.showNotification('QR 碼生成失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  async exportVCard(cardId) {
    try {
      if (!this.cardManager) {
        this.showNotification('名片管理器未初始化', 'error');
        return;
      }
      
      const result = await this.cardManager.exportVCard(cardId, this.currentLanguage);
      if (result.success) {
        // 直接下載 vCard 檔案
        const link = document.createElement('a');
        link.href = URL.createObjectURL(result.file);
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(link.href);
        
        this.showNotification('vCard 已下載', 'success');
      } else {
        this.showNotification(result.error || 'vCard 匯出失敗', 'error');
      }
    } catch (error) {
      console.error('[PWA] Export vCard failed:', error);
      this.showNotification('vCard 匯出失敗', 'error');
    }
  }

  async searchCards(query) {
  }

  async filterCards(type) {
  }

  updateConnectionStatus() {
    const statusIndicator = document.getElementById('connection-status');
    if (statusIndicator) {
      if (this.isOnline) {
        statusIndicator.textContent = '線上模式';
        statusIndicator.className = 'status-indicator online';
      } else {
        statusIndicator.textContent = '離線模式';
        statusIndicator.className = 'status-indicator offline';
      }
    }
  }

  showCardModal(card) {
    
    const displayData = this.cardManager ? 
      this.cardManager.getBilingualCardData(card.data, this.currentLanguage) : 
      card.data;
    
    
    const labels = this.getUILabels();
    
    // 處理問候語顯示 - 支援雙語切換
    let greetingsHtml = '';
    if (displayData.greetings && Array.isArray(displayData.greetings) && displayData.greetings.length > 0) {
      const firstGreeting = displayData.greetings[0];
      let greetingText = this.extractStringFromGreeting(firstGreeting, this.currentLanguage);
      
      if (!greetingText) {
        greetingText = this.currentLanguage === 'en' ? 'Nice to meet you!' : '歡迎認識我';
      }
      
      greetingsHtml = `<div class="detail-item"><strong>${labels.greetings}:</strong><br><div class="greetings-container"><span class="greeting-item">${greetingText}</span></div></div>`;
    }
    
    // 處理社群資訊顯示 - 增強互動性（安全處理）
    let socialHtml = '';
    if (displayData.socialNote) {
      let socialText = '';
      
      // 安全處理 socialNote，可能是字串或物件
      if (typeof displayData.socialNote === 'string') {
        socialText = displayData.socialNote.trim();
      } else if (typeof displayData.socialNote === 'object' && displayData.socialNote !== null) {
        // 處理雙語物件格式
        socialText = displayData.socialNote.zh || displayData.socialNote.en || String(displayData.socialNote);
      } else {
        socialText = String(displayData.socialNote || '').trim();
      }
      
      if (socialText) {
        const socialContent = this.formatSocialContent(socialText);
        socialHtml = `<div class="detail-item"><strong>${labels.social}:</strong><br><div class="social-content">${socialContent}</div></div>`;
      }
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content card-modal">
        <div class="modal-header">
          <h2>${labels.cardDetails}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="card-preview">
            ${displayData.avatar ? `<img src="${displayData.avatar}" alt="${labels.avatar}" class="card-avatar">` : ''}
            <h3 class="card-name">${displayData.name || ''}</h3>
            ${displayData.title ? `<p class="card-title">${displayData.title}</p>` : ''}
            ${displayData.department ? `<p class="card-department">${displayData.department}</p>` : ''}
            ${displayData.organization ? `<p class="card-organization">${displayData.organization}</p>` : ''}
          </div>
          <div class="card-details">
            ${displayData.email ? `<div class="detail-item"><strong>${labels.email}:</strong> <a href="mailto:${displayData.email}" class="contact-link">${displayData.email}</a></div>` : ''}
            ${displayData.phone ? `<div class="detail-item"><strong>${labels.phone}:</strong> <a href="tel:${displayData.phone}" class="contact-link">${displayData.phone}</a></div>` : ''}
            ${displayData.mobile ? `<div class="detail-item"><strong>${labels.mobile}:</strong> <a href="tel:${displayData.mobile}" class="contact-link">${displayData.mobile}</a></div>` : ''}
            ${displayData.address ? `<div class="detail-item"><strong>${labels.address}:</strong> ${displayData.address}</div>` : ''}

            ${socialHtml}
          </div>
          <div class="card-actions">
            <button class="btn btn-primary generate-qr-btn" data-card-id="${card.id}">
              ${labels.generateQR}
            </button>
            <button class="btn btn-secondary export-vcard-btn" data-card-id="${card.id}">
              ${labels.downloadVCard}
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const generateQRBtn = modal.querySelector('.generate-qr-btn');
    const exportVCardBtn = modal.querySelector('.export-vcard-btn');
    
    overlay.addEventListener('click', () => modal.remove());
    closeBtn.addEventListener('click', () => modal.remove());
    generateQRBtn.addEventListener('click', () => this.generateQR(card.id));
    exportVCardBtn.addEventListener('click', () => this.exportVCard(card.id));
    
    // 設置社群按鈕事件
    this.setupSocialButtonEvents(modal);
    
    document.body.appendChild(modal);
  }

  /**
   * 新增：格式化社群內容，增加互動性
   */
  formatSocialContent(socialNote) {
    if (!socialNote) return '';
    
    let formatted = socialNote;
    
    // 轉換常見的社群媒體格式為可點擊連結
    const socialPatterns = [
      // Line ID
      {
        pattern: /Line ID[\uff1a:]​?\s*([^\s\n]+)/gi,
        replacement: 'Line ID: <button class="social-btn" data-action="copy" data-value="$1">$1 (點擊複製)</button>'
      },
      // Facebook
      {
        pattern: /Facebook[\uff1a:]\s*([^\s\n]+)/gi,
        replacement: 'Facebook: <a href="https://facebook.com/$1" target="_blank" class="social-btn">$1</a>'
      },
      // Instagram
      {
        pattern: /Instagram[\uff1a:]\s*@?([^\s\n]+)/gi,
        replacement: 'Instagram: <a href="https://instagram.com/$1" target="_blank" class="social-btn">@$1</a>'
      },
      // Twitter/X
      {
        pattern: /Twitter[\uff1a:]\s*@?([^\s\n]+)/gi,
        replacement: 'Twitter: <a href="https://twitter.com/$1" target="_blank" class="social-btn">@$1</a>'
      },
      // LinkedIn
      {
        pattern: /LinkedIn[\uff1a:]\s*([^\s\n]+)/gi,
        replacement: 'LinkedIn: <a href="https://linkedin.com/in/$1" target="_blank" class="social-btn">$1</a>'
      }
    ];
    
    socialPatterns.forEach(({ pattern, replacement }) => {
      formatted = formatted.replace(pattern, replacement);
    });
    
    // 將換行符轉換為 <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  /**
   * 新增：設置社群按鈕事件
   */
  setupSocialButtonEvents(modal) {
    const socialButtons = modal.querySelectorAll('.social-btn[data-action="copy"]');
    socialButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const value = e.target.dataset.value;
        if (value) {
          try {
            await navigator.clipboard.writeText(value);
            this.showNotification(`已複製: ${value}`, 'success');
          } catch (error) {
            this.showNotification('複製失敗', 'error');
          }
        }
      });
    });
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
    this.updateLanguageUI();
    
    // 重新載入名片列表
    if (this.currentPage === 'cards' && window.cardList) {
      window.cardList.refresh();
    }
    
    // 如果有開啟的名片模態視窗，重新渲染
    const existingModal = document.querySelector('.modal.card-modal');
    if (existingModal) {
      const cardId = existingModal.querySelector('.generate-qr-btn')?.dataset.cardId;
      if (cardId) {
        existingModal.remove();
        this.viewCard(cardId);
      }
    }
    
    this.showNotification(
      this.currentLanguage === 'zh' ? '已切換至中文' : 'Switched to English', 
      'success'
    );
  }

  updateLanguageUI() {
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.textContent = this.currentLanguage === 'zh' ? 'EN' : '中';
    }
  }

  getUILabels() {
    const labels = {
      zh: {
        cardDetails: '名片詳細資訊',
        avatar: '大頭貼',
        email: '電子郵件',
        phone: '電話',
        mobile: '手機',
        address: '地址',
        greetings: '問候語',
        social: '社群連結',
        generateQR: '生成 QR 碼',
        downloadVCard: '下載 vCard',
        qrCode: 'QR 碼',
        downloadQR: '下載 QR 碼',
        copyLink: '複製連結',
        qrTip: '掃描此 QR 碼即可開啟數位名片'
      },
      en: {
        cardDetails: 'Card Details',
        avatar: 'Avatar',
        email: 'Email',
        phone: 'Phone',
        mobile: 'Mobile',
        address: 'Address',
        greetings: 'Greetings',
        social: 'Social Links',
        generateQR: 'Generate QR',
        downloadVCard: 'Download vCard',
        qrCode: 'QR Code',
        downloadQR: 'Download QR Code',
        copyLink: 'Copy Link',
        qrTip: 'Scan this QR code to open the digital business card'
      }
    };
    
    return labels[this.currentLanguage] || labels.zh;
  }

  showQRModal(dataUrl, url, cardId = null) {
    const labels = this.getUILabels();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content qr-modal">
        <div class="modal-header">
          <h2>${labels.qrCode || 'QR 碼'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body text-center">
          <img src="${dataUrl}" alt="QR Code" class="qr-image">
          <p class="qr-url">${url}</p>
          <div class="qr-actions">
            <button class="btn btn-primary download-qr-btn" data-url="${dataUrl}" data-card-id="${cardId || ''}">
              📥 ${labels.downloadQR || '下載 QR 碼'}
            </button>
            <button class="btn btn-secondary copy-url-btn" data-url="${url}">
              📋 ${labels.copyLink || '複製連結'}
            </button>
          </div>
          <div class="qr-tip">
            <p>💡 ${labels.qrTip || '掃描此 QR 碼即可開啟數位名片'}</p>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const downloadQRBtn = modal.querySelector('.download-qr-btn');
    const copyUrlBtn = modal.querySelector('.copy-url-btn');
    
    overlay.addEventListener('click', () => modal.remove());
    closeBtn.addEventListener('click', () => modal.remove());
    downloadQRBtn.addEventListener('click', () => this.downloadQR(dataUrl, cardId || ''));
    copyUrlBtn.addEventListener('click', () => this.copyUrl(url));
    
    document.body.appendChild(modal);
  }

  async downloadQR(dataUrl, cardId) {
    try {
      if (!window.qrUtils) {
        this.showNotification('QR 碼工具未載入', 'error');
        return;
      }

      // 獲取名片資料以生成智慧檔名
      let filename = 'qr-code.png';
      if (cardId && this.storage) {
        try {
          const card = await this.storage.getCard(cardId);
          if (card && card.data) {
            const displayName = this.cardManager ? 
              this.cardManager.getDisplayName(card.data, this.currentLanguage) : 
              card.data.name;
            filename = window.qrUtils.generateSmartFilename(displayName, this.currentLanguage);
          }
        } catch (error) {
        }
      }

      const result = await window.qrUtils.downloadQRCode(dataUrl, filename);
      if (result.success) {
        this.showNotification('QR 碼已下載', 'success');
      } else {
        this.showNotification('QR 碼下載失敗', 'error');
      }
    } catch (error) {
      console.error('[PWA] Download QR failed:', error);
      this.showNotification('QR 碼下載失敗', 'error');
    }
  }

  async copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      this.showNotification('連結已複製到剪貼簿', 'success');
    } catch (error) {
      console.error('[PWA] Copy URL failed:', error);
      this.showNotification('複製失敗', 'error');
    }
  }

  showLoading(message = '載入中...') {
    const loading = document.getElementById('loading');
    const loadingText = document.querySelector('.loading-text');
    
    if (loading) {
      loading.classList.remove('hidden');
    }
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = document.querySelector('.notification-icon');
    const messageEl = document.querySelector('.notification-message');

    if (!notification || !icon || !messageEl) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    icon.textContent = icons[type] || icons.info;
    messageEl.textContent = message;

    notification.classList.remove('hidden');

    setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.classList.add('hidden');
    }
  }

  async handleConflictResolution(conflicts, importData) {
    // 簡化版衝突解決：顯示確認對話框
    const conflictCount = conflicts.length;
    const message = `發現 ${conflictCount} 個衝突的名片。\n\n選擇處理方式：\n- 確定：覆蓋現有名片\n- 取消：跳過衝突的名片`;
    
    const shouldReplace = confirm(message);
    const resolutions = conflicts.map(() => shouldReplace ? 'replace' : 'skip');
    
    try {
      const result = await this.transferManager.resolveConflictsAndImport(importData, resolutions);
      
      if (result.success) {
        this.showNotification(`成功匯入 ${result.importedCount} 張名片`, 'success');
        await this.updateStats();
      } else {
        this.showNotification(result.error || '衝突解決失敗', 'error');
      }
    } catch (error) {
      console.error('[PWA] Conflict resolution failed:', error);
      this.showNotification('衝突解決失敗', 'error');
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new PWACardApp();
  window.app = app;
  
  // 註冊 Service Worker 更新處理
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
});

window.addEventListener('error', (event) => {
  console.error('[PWA] Global error:', event.error);
  if (app) {
    app.showNotification('發生未預期的錯誤', 'error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[PWA] Unhandled promise rejection:', event.reason);
  if (app) {
    app.showNotification('操作失敗', 'error');
  }
});

