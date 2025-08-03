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
      this.showLoading('初始化應用程式...');
      
      await this.initializeServices();
      this.setupEventListeners();
      this.initializeUI();
      await this.loadInitialData();
      
      this.hideLoading();
      
    } catch (error) {
      console.error('[PWA] Initialization failed:', error);
      this.hideLoading();
      this.showNotification('應用程式初始化失敗', 'error');
    }
  }

  async initializeServices() {
    try {
      // 初始化核心儲存
      if (typeof PWACardStorage !== 'undefined') {
        this.storage = new PWACardStorage();
        await this.storage.initialize();
        this.setupCleanupHandlers();
      } else {
        throw new Error('PWACardStorage not available');
      }
      
      // 並行初始化其他服務
      const initPromises = [];
      
      if (typeof PWACardManager !== 'undefined') {
        initPromises.push(
          (async () => {
            try {
              this.cardManager = new PWACardManager(this.storage);
              await this.cardManager.initialize();
            } catch (error) {
              this.cardManager = null;
            }
          })()
        );
      }
      
      if (typeof HealthManager !== 'undefined' && this.storage) {
        initPromises.push(
          (async () => {
            this.healthManager = new HealthManager(this.storage);
            await this.healthManager.initialize();
          })()
        );
      }
      
      await Promise.all(initPromises);
      
      // 初始化依賴服務
      if (typeof OfflineToolsManager !== 'undefined' && this.cardManager) {
        this.offlineTools = new OfflineToolsManager(this.cardManager);
      }
      
      if (typeof TransferManager !== 'undefined' && this.cardManager) {
        this.transferManager = new TransferManager(this.cardManager);
      }
      
      // CLEAN-01: QR 掃描器已移除
      
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

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
      settingsButton.addEventListener('click', (e) => {
        try {
          e.preventDefault();
          e.stopPropagation();
          
          // 清除 URL 參數
          this.clearUrlParams();
          this.navigateTo('home');
        } catch (error) {
          console.error('[PWA] Settings button navigation failed:', error);
        }
      });
    }
    
    // 初始化 PWA 安裝按鈕
    if (window.initPWAInstallButtons) {
      window.initPWAInstallButtons();
    }
  }

  initializeUI() {
    this.updateConnectionStatus();
    this.loadThemePreference();
    this.updateThemeUI();
    
    // 初始化語言管理器
    if (window.languageManager) {
      this.currentLanguage = window.languageManager.getCurrentLanguage();
      this.updateLanguageUI();
      
      // 註冊語言變更觀察者
      window.languageManager.addObserver((lang) => {
        this.currentLanguage = lang;
        this.updateLanguageUI();
      });
    }
    
    this.navigateTo('home');
    this.handleUrlParams();
  }
  
  loadThemePreference() {
    const savedTheme = localStorage.getItem('pwa-theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // 檢測系統主題偏好
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
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
      
      const currentUrl = window.location.href;
      
      // 1. 單次識別，獲取類型
      let cardType = null;
      if (window.PWAIntegration) {
        const tempData = { url: currentUrl };
        cardType = window.PWAIntegration.identifyCardTypeEnhanced(tempData);
      }
      
      if (!cardType) {
        this.showNotification('無法識別名片類型', 'error');
        return;
      }
      
      // 2. 根據類型解析資料
      if (!window.SimpleCardParser) {
        this.showNotification('解析器未載入', 'error');
        return;
      }
      
      const cardData = window.SimpleCardParser.parseDirectly(data, cardType);
      
      if (!cardData) {
        this.showNotification('無法解析名片資料', 'error');
        return;
      }
      
      // 3. 添加 URL 資訊
      cardData.url = currentUrl;
      
      // 4. 傳遞類型進行儲存（避免重複識別）
      if (this.storage) {
        try {
          const cardId = await this.storage.storeCardDirectly(cardData, cardType);
          
          this.showNotification('名片已儲存', 'success');
          
          // 5. 最後清除暫存
          window.PWAIntegration?.manualClearContext();
          
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

  extractStringFromGreeting(greeting, language = 'zh') {
    if (!greeting) return '';
    if (typeof greeting === 'string') {
      if (greeting.includes('~')) {
        const parts = greeting.split('~');
        return language === 'en' ? (parts[1] || parts[0]) : parts[0];
      }
      return greeting;
    }
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
    try {
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
    } catch (error) {
      console.error('[PWA] Navigation failed:', error);
      // 不顯示錯誤通知，因為這是內部導航問題
    }
  }

  async initializePage(page) {
    try {
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
          const exportAll = document.getElementById('export-all');
          const exportVersions = document.getElementById('export-versions');
          const exportEncrypt = document.getElementById('export-encrypt');
          if (exportAll) exportAll.checked = true;
          if (exportVersions) exportVersions.checked = false;
          if (exportEncrypt) exportEncrypt.checked = false;
          break;
      }
    } catch (error) {
      console.error(`[PWA] Page initialization failed for ${page}:`, error);
      // 不顯示錯誤通知，因為這是內部初始化問題
    }
  }

  async handleQuickAction(action) {
    switch (action) {
      case 'add-card':
        this.navigateTo('import');
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
      
      // 更新應用版本顯示
      const appVersionEl = document.getElementById('app-version');
      if (appVersionEl && window.manifestManager) {
        appVersionEl.textContent = `v${window.manifestManager.getVersion()}`;
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
        const passwordResult = await SecurityInputHandler.securePrompt('請輸入解密密碼', {
          title: '解密檔案',
          inputType: 'password',
          validation: { minLength: 1, allowEmpty: false }
        });
        if (!passwordResult.confirmed) {
          this.hideLoading();
          return;
        }
        const password = passwordResult.value;
        
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
        const passwordResult = await SecurityInputHandler.securePrompt('請輸入加密密碼', {
          title: '設定加密密碼',
          inputType: 'password',
          validation: { minLength: 6, allowEmpty: false },
          placeholder: '至少6個字符'
        });
        if (!passwordResult.confirmed) {
          this.hideLoading();
          return;
        }
        const password = passwordResult.value;
        
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
      if (!this.offlineTools) {
        this.showNotification('離線工具未初始化', 'error');
        return;
      }
      
      // 使用 OfflineToolsManager 的 exportVCard 方法，確保名片類型正確傳遞
      const result = await this.offlineTools.exportVCard(cardId, this.currentLanguage);
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
    let displayData;
    if (this.cardManager) {
      displayData = this.cardManager.getBilingualCardData(card.data, this.currentLanguage);
    } else {
      displayData = {
        ...card.data,
        email: String(card.data.email || '').trim(),
        phone: String(card.data.phone || '').trim(),
        mobile: String(card.data.mobile || '').trim()
      };
    }
    
    
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
            ${this.getCorrectOrganization(displayData, card.type) ? `<p class="card-organization">${this.getCorrectOrganization(displayData, card.type)}</p>` : ''}
          </div>
          <div class="card-details">
            ${displayData.email ? `<div class="detail-item"><strong>${labels.email}:</strong> <a href="mailto:${displayData.email}" class="contact-link">${displayData.email}</a></div>` : '<!-- 無 email 資料 -->'}
            ${displayData.phone ? `<div class="detail-item"><strong>${labels.phone}:</strong> <a href="tel:${String(displayData.phone).trim()}" class="contact-link">${String(displayData.phone).trim()}</a></div>` : ''}
            ${displayData.mobile ? `<div class="detail-item"><strong>${labels.mobile}:</strong> <a href="tel:${String(displayData.mobile).trim()}" class="contact-link">${String(displayData.mobile).trim()}</a></div>` : ''}
            ${this.getCorrectAddress(displayData, card.type) ? `<div class="detail-item"><strong>${labels.address}:</strong> ${this.getCorrectAddress(displayData, card.type)}</div>` : ''}

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
   * 獲取正確的組織資訊
   */
  getCorrectOrganization(displayData, cardType) {
    // 對於政府機關版本，強制使用預設組織名稱
    if (cardType === 'index' || cardType === 'index1' || cardType === 'bilingual' || cardType === 'bilingual1') {
      return this.currentLanguage === 'en' ? 'Ministry of Digital Affairs' : '數位發展部';
    } else if (cardType === 'en' || cardType === 'en1') {
      return 'Ministry of Digital Affairs';
    }
    
    // 個人版使用實際的組織資訊
    if (displayData.organization && typeof displayData.organization === 'string') {
      return displayData.organization;
    }
    
    return '';
  }
  
  /**
   * 獲取正確的地址資訊
   */
  getCorrectAddress(displayData, cardType) {
    // 對於政府機關版本，強制使用預設地址
    if (cardType === 'index' || cardType === 'bilingual') {
      // 延平大樓
      return this.currentLanguage === 'en' ? 
        '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan' :
        '臺北市中正區延平南路143號';
    } else if (cardType === 'index1' || cardType === 'bilingual1') {
      // 新光大樓
      return this.currentLanguage === 'en' ? 
        '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)' :
        '臺北市中正區忠孝西路一段６６號（１７、１９樓）';
    } else if (cardType === 'en') {
      return '143 Yanping S. Rd., Zhongzheng Dist., Taipei City, Taiwan';
    } else if (cardType === 'en1') {
      return '66 Zhongxiao W. Rd. Sec. 1, Zhongzheng Dist., Taipei City, Taiwan (17F, 19F)';
    }
    
    // 個人版使用實際的地址資訊
    if (displayData.address && typeof displayData.address === 'string') {
      return displayData.address;
    }
    
    return '';
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

  async toggleTheme() {
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // 儲存主題偏好
      localStorage.setItem('pwa-theme', newTheme);
      
      // 更新主題按鈕 UI
      this.updateThemeUI();
      
      // 使用語言管理器獲取本地化訊息
      const message = window.languageManager ? 
        window.languageManager.getNotificationMessage('themeChanged', newTheme === 'dark') :
        (newTheme === 'dark' ? '已切換至深色模式' : '已切換至淺色模式');
      
      this.showNotification(message, 'success');
    } catch (error) {
      console.error('[PWA] Theme toggle failed:', error);
      const errorMessage = window.languageManager ? 
        window.languageManager.getText('themeFailed') : '主題切換失敗';
      this.showNotification(errorMessage, 'error');
    }
  }

  toggleLanguage() {
    if (!window.languageManager) {
      console.error('[PWA] Language manager not available');
      return;
    }
    
    const newLang = window.languageManager.toggleLanguage();
    this.currentLanguage = newLang;
    
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
    
    // 使用語言管理器獲取本地化訊息
    const message = window.languageManager.getNotificationMessage('languageChanged');
    this.showNotification(message, 'success');
  }

  updateLanguageUI() {
    // 語言 UI 更新現在由 LanguageManager 處理
    if (window.languageManager) {
      window.languageManager.updateLanguageButton();
    }
  }

  updateThemeUI() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('.icon');
      if (icon) {
        const isDark = document.documentElement.classList.contains('dark');
        icon.textContent = isDark ? '☀️' : '🌙';
        themeToggle.title = isDark ? '切換到淺色模式' : '切換到深色模式';
      }
    }
  }

  getUILabels() {
    // 使用語言管理器獲取翻譯
    if (window.languageManager) {
      return {
        cardDetails: window.languageManager.getText('cardDetails'),
        avatar: window.languageManager.getText('avatar'),
        email: window.languageManager.getText('email'),
        phone: window.languageManager.getText('phone'),
        mobile: window.languageManager.getText('mobile'),
        address: window.languageManager.getText('address'),
        greetings: window.languageManager.getText('greetings'),
        social: window.languageManager.getText('social'),
        generateQR: window.languageManager.getText('generateQR'),
        downloadVCard: window.languageManager.getText('downloadVCard'),
        qrCode: window.languageManager.getText('qrCode'),
        downloadQR: window.languageManager.getText('downloadQR'),
        copyLink: window.languageManager.getText('copyLink'),
        qrTip: window.languageManager.getText('qrTip')
      };
    }
    
    // 備用方案
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
    const icon = notification?.querySelector('.notification-icon');
    const messageEl = notification?.querySelector('.notification-message');

    if (!notification || !icon || !messageEl) {
      console.warn('[PWA] Notification elements not found');
      // 創建臨時通知
      this.createTemporaryNotification(message, type);
      return;
    }

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    // 設置通知內容
    icon.textContent = icons[type] || icons.info;
    messageEl.textContent = message;

    // 清除舊的類型類別
    notification.classList.remove('success', 'error', 'warning', 'info');
    // 添加新的類型類別
    notification.classList.add(type);

    // 確保通知位置正確
    notification.style.position = 'fixed';
    notification.style.top = '1rem';
    notification.style.right = '1rem';
    notification.style.left = 'auto';
    notification.style.bottom = 'auto';
    notification.style.zIndex = '1001';

    // 顯示通知
    notification.classList.remove('hidden');
    notification.style.display = 'block';
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';

    // 清除之前的計時器
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    
    // 設置自動隱藏
    this.notificationTimer = setTimeout(() => {
      this.hideNotification();
    }, type === 'error' ? 8000 : 5000); // 錯誤訊息顯示更久
  }

  hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        notification.classList.add('hidden');
        notification.style.display = 'none';
      }, 300);
    }
  }
  
  createTemporaryNotification(message, type) {
    // 創建臨時通知元素 - 使用 moda 設計系統
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed !important;
      top: 1rem !important;
      right: 1rem !important;
      left: auto !important;
      bottom: auto !important;
      background: var(--md-white-1, #ffffff);
      border: 2px solid var(--md-primary-1, #6868ac);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(104, 104, 172, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 1001;
      max-width: 400px;
      min-width: 320px;
      font-family: var(--pwa-font-family, 'Noto Sans TC', sans-serif);
      backdrop-filter: blur(10px);
      border-left-width: 6px;
    `;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const borderColors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: 'var(--md-primary-1, #6868ac)'
    };
    
    notification.style.borderLeftColor = borderColors[type] || borderColors.info;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; padding: 1.25rem; gap: 1rem; background: var(--md-white-1, #ffffff); color: var(--md-black-1, #1a1a1a); border-radius: 12px;">
        <span style="font-size: 1.5rem; flex-shrink: 0;">${icons[type] || icons.info}</span>
        <span style="flex: 1; font-size: 1rem; font-weight: 500; color: var(--md-black-1, #1a1a1a); line-height: 1.4; font-family: inherit;">${message}</span>
        <button style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--md-secondary-1, #565e62); padding: 0.5rem; border-radius: 6px; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">&times;</button>
      </div>
    `;
    
    const closeBtn = notification.querySelector('button');
    closeBtn.addEventListener('click', () => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    });
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'var(--md-neutral-9, #f3f5f6)';
      closeBtn.style.color = 'var(--md-black-1, #1a1a1a)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'none';
      closeBtn.style.color = 'var(--md-secondary-1, #565e62)';
    });
    
    document.body.appendChild(notification);
    
    // 自動移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, type === 'error' ? 8000 : 5000);
  }

  async handleConflictResolution(conflicts, importData) {
    // 簡化版衝突解決：顯示確認對話框
    const conflictCount = conflicts.length;
    const message = `發現 ${conflictCount} 個衝突的名片。\n\n選擇處理方式：\n- 確定：覆蓋現有名片\n- 取消：跳過衝突的名片`;
    
    const shouldReplace = await SecurityInputHandler.secureConfirm(message, {
      title: '衝突解決',
      confirmText: '覆蓋現有',
      cancelText: '跳過衝突',
      danger: true
    });
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

  /**
   * 設置清理處理器，確保應用程式關閉時正確清理資源
   */
  setupCleanupHandlers() {
    // 頁面關閉時清理
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // 頁面隱藏時清理（移動設備切換應用）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.cleanup();
      }
    });
    
    // PWA 安裝時的特殊處理
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed, reinitializing storage...');
      this.reinitializeStorage();
    });
  }
  
  /**
   * 清理資源
   */
  cleanup() {
    try {
      if (this.storage && typeof this.storage.cleanup === 'function') {
        this.storage.cleanup();
      }
      
      // 清理通知計時器
      if (this.notificationTimer) {
        clearTimeout(this.notificationTimer);
        this.notificationTimer = null;
      }
    } catch (error) {
      console.error('[PWA] Cleanup failed:', error);
    }
  }
  
  /**
   * 重新初始化儲存（用於連線復原）
   */
  async reinitializeStorage() {
    try {
      if (this.storage) {
        this.storage.cleanup();
        await this.storage.initialize();
        console.log('[PWA] Storage reinitialized successfully');
      }
    } catch (error) {
      console.error('[PWA] Storage reinitialization failed:', error);
      this.showNotification('資料庫重新連線失敗', 'error');
    }
  }



  clearUrlParams() {
    try {
      window.location.assign('./index.html');
    } catch (error) {
      console.error('[PWA] Clear URL params failed:', error);
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
});

window.addEventListener('error', (event) => {
  console.error('[PWA] Global error:', event.error);
  
  // 過濾內部導航和初始化錯誤，避免顯示不必要的通知
  const errorMessage = event.error?.message || '';
  const isInternalError = errorMessage.includes('Navigation') || 
                         errorMessage.includes('Page initialization') ||
                         errorMessage.includes('Settings button') ||
                         event.filename?.includes('app.js') ||
                         event.filename?.includes('unified-mobile-manager.js');
  
  if (app && !isInternalError) {
    app.showNotification('發生未預期的錯誤', 'error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[PWA] Unhandled promise rejection:', event.reason);
  
  // 過濾內部 Promise 錯誤
  const reason = event.reason?.message || event.reason || '';
  const isInternalError = String(reason).includes('Navigation') || 
                         String(reason).includes('Page initialization');
  
  if (app && !isInternalError) {
    app.showNotification('操作失敗', 'error');
  }
});

