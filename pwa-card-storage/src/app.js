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
      
      console.log('[PWA] Application initialized successfully');
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
      console.log('[PWA] Initializing services...');
      window.pwaErrorHandler?.logStep('Check PWACardStorage', 'CHECKING');
      
      // 初始化核心儲存
      if (typeof PWACardStorage !== 'undefined') {
        window.pwaErrorHandler?.logStep('PWACardStorage Found', 'SUCCESS');
        console.log('[PWA] Initializing storage...');
        
        window.pwaErrorHandler?.logStep('Create Storage Instance', 'STARTING');
        this.storage = new PWACardStorage();
        window.pwaErrorHandler?.logStep('Create Storage Instance', 'SUCCESS');
        
        window.pwaErrorHandler?.logStep('Storage Initialize', 'STARTING');
        await this.storage.initialize();
        window.pwaErrorHandler?.logStep('Storage Initialize', 'SUCCESS');
        
        console.log('[PWA] Storage initialized successfully');
      } else {
        window.pwaErrorHandler?.logStep('PWACardStorage Check', 'FAILED', 'PWACardStorage class not found');
        throw new Error('PWACardStorage not available');
      }
      
      // 初始化名片管理器
      if (typeof PWACardManager !== 'undefined') {
        console.log('[PWA] Initializing card manager...');
        try {
          this.cardManager = new PWACardManager(this.storage);
          await this.cardManager.initialize();
          console.log('[PWA] Card manager initialized successfully');
        } catch (error) {
          console.error('[PWA] Card manager initialization failed:', error);
          this.cardManager = null;
        }
      } else {
        console.error('[PWA] PWACardManager class not found');
        this.cardManager = null;
      }
      
      // 初始化健康管理器
      if (typeof HealthManager !== 'undefined' && this.storage) {
        console.log('[PWA] Initializing health manager...');
        this.healthManager = new HealthManager(this.storage);
        await this.healthManager.initialize();
        console.log('[PWA] Health manager initialized successfully');
      }
      
      // 初始化版本管理器
      if (typeof VersionManager !== 'undefined' && this.storage) {
        console.log('[PWA] Initializing version manager...');
        this.versionManager = new VersionManager(this.storage);
        await this.versionManager.initialize();
        console.log('[PWA] Version manager initialized successfully');
      }
      
      // 初始化離線工具
      if (typeof OfflineToolsManager !== 'undefined' && this.cardManager) {
        console.log('[PWA] Initializing offline tools...');
        this.offlineTools = new OfflineToolsManager(this.cardManager);
        console.log('[PWA] Offline tools initialized successfully');
      }
      
      // 初始化傳輸管理器
      if (typeof TransferManager !== 'undefined' && this.cardManager) {
        console.log('[PWA] Initializing transfer manager...');
        this.transferManager = new TransferManager(this.cardManager);
        console.log('[PWA] Transfer manager initialized successfully');
      }
      
      // 初始化 QR 掃描器（優雅降級）
      if (typeof QRScannerManager !== 'undefined' && this.cardManager) {
        console.log('[PWA] Initializing QR scanner...');
        try {
          this.qrScanner = new QRScannerManager(this.cardManager);
          await this.qrScanner.initialize();
          console.log('[PWA] QR scanner initialized successfully');
        } catch (error) {
          console.warn('[PWA] QR scanner initialization failed, using fallback:', error);
          this.qrScanner = null;
          // 不拋出錯誤，讓應用程式繼續運行
        }
      }
      
      console.log('[PWA] All services initialized successfully');
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

    console.log('[PWA] URL params:', { action, data: data ? 'present' : 'missing', dataLength: data ? data.length : 0 });

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
      
      // 使用統一的解析邏輯
      let cardData = null;
      
      // 優先使用 LegacyAdapter
      if (window.legacyAdapter) {
        cardData = window.legacyAdapter.parseCardData(data);
      }
      
      // 備用方案
      if (!cardData) {
        cardData = this.getCardDataFromNFC(data);
      }
      
      if (!cardData) {
        this.showNotification('無法解析名片資料', 'error');
        return;
      }
      
      console.log('[PWA] Parsed card data:', cardData);
      
      // 確保 greeting 和社群資訊完整性
      const enhancedData = this.ensureDataCompleteness(cardData.data);
      
      // 自動識別名片類型
      let cardType = 'personal';
      if (this.cardManager) {
        cardType = this.cardManager.detectCardType(enhancedData);
        console.log('[PWA] Detected card type:', cardType);
      }
      
      // 套用類型預設值
      let finalData = enhancedData;
      if (this.cardManager) {
        finalData = this.cardManager.applyCardTypeDefaults(enhancedData, cardType);
      }
      
      // 儲存名片
      if (this.storage) {
        try {
          const cardId = await this.storage.storeCard(finalData);
          console.log('[PWA] Card stored with ID:', cardId, 'Type:', cardType);
          console.log('[PWA] Stored data includes:', {
            hasGreetings: !!finalData.greetings,
            greetingsCount: Array.isArray(finalData.greetings) ? finalData.greetings.length : 0,
            hasSocialNote: !!finalData.socialNote,
            socialNoteLength: finalData.socialNote ? finalData.socialNote.length : 0
          });
          
          this.showNotification('名片已自動儲存（含問候語和社群資訊）', 'success');
          await this.updateStats();
          this.navigateTo('cards');
        } catch (storeError) {
          console.error('[PWA] Store card failed:', storeError);
          this.showNotification(`儲存失敗: ${storeError.message}`, 'error');
        }
      } else {
        this.showNotification('儲存服務未初始化', 'error');
        console.error('[PWA] Storage not available');
      }
    } catch (error) {
      console.error('[PWA] Import from URL data failed:', error);
      this.showNotification('讀取名片失敗', 'error');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 新增：確保資料完整性，特別是 greeting 和社群資訊
   * 修復 [object Object] 問題 - 直接修復版
   */
  ensureDataCompleteness(cardData) {
    const enhanced = { ...cardData };
    
    console.log('[PWA] Original greetings:', enhanced.greetings, typeof enhanced.greetings);
    
    // 直接處理問候語格式，避免 String() 轉換
    if (!enhanced.greetings) {
      enhanced.greetings = ['歡迎認識我！'];
    } else if (Array.isArray(enhanced.greetings)) {
      enhanced.greetings = enhanced.greetings
        .map(g => {
          if (typeof g === 'string') {
            if (g.includes('~')) {
              return g.split('~')[0].trim();
            }
            return g.trim();
          }
          if (typeof g === 'object' && g !== null && g.zh) {
            return g.zh;
          }
          if (typeof g === 'object' && g !== null && g.en) {
            return g.en;
          }
          // 避免 String()轉換，直接返回空字串
          return '';
        })
        .filter(g => g && g.length > 0);
      
      if (enhanced.greetings.length === 0) {
        enhanced.greetings = ['歡迎認識我！'];
      }
    } else {
      enhanced.greetings = ['歡迎認識我！'];
    }
    
    if (!enhanced.socialNote) {
      enhanced.socialNote = '';
    }
    
    console.log('[PWA] Fixed greetings:', enhanced.greetings);
    
    return enhanced;
  }

  /**
   * 處理單個問候語項目用於顯示
   */
  processGreetingForDisplay(greeting) {
    if (!greeting) return '';
    
    if (typeof greeting === 'string') {
      // 處理雙語格式 "中文~English"
      if (greeting.includes('~')) {
        const [chinese] = greeting.split('~');
        return chinese.trim();
      }
      return greeting.trim();
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      // 處理物件格式 {zh: "中文", en: "English"}
      if (greeting.zh) {
        return greeting.zh;
      } else if (greeting.en) {
        return greeting.en;
      }
      
      // 提取第一個字串值
      const firstString = Object.values(greeting)
        .find(v => v && typeof v === 'string');
      return firstString || '';
    }
    
    return String(greeting);
  }
  
  /**
   * 統一的名片資料解析器 - 支援所有現有格式
   * 完全相容兩大生成器的資料格式
   */
  getCardDataFromNFC(cardDataParam) {
    if (!cardDataParam) return null;
    
    console.log('[PWA] Parsing card data, length:', cardDataParam.length);
    
    try {
      // 1. 嘗試管道分隔格式（雙語版本 nfc-generator-bilingual.html） - 優先級
      const pipeResult = this.parsePipeFormat(cardDataParam);
      if (pipeResult) {
        console.log('[PWA] Successfully parsed pipe format (bilingual)');
        return pipeResult;
      }
      
      // 2. 嘗試 JSON 格式解析（單語版本 nfc-generator.html）
      const jsonResult = this.parseJSONFormat(cardDataParam);
      if (jsonResult) {
        console.log('[PWA] Successfully parsed JSON format');
        return jsonResult;
      }
      
      // 3. 嘗試 Legacy 格式（舊版本相容性）
      const legacyResult = this.parseLegacyFormat(cardDataParam);
      if (legacyResult) {
        console.log('[PWA] Successfully parsed legacy format');
        return legacyResult;
      }
      
      console.error('[PWA] All parsing methods failed');
      return null;
    } catch (error) {
      console.error('[PWA] Card data parsing failed:', error);
      return null;
    }
  }
  
  /**
   * 解析 JSON 格式（單語版本和雙語版本）
   */
  parseJSONFormat(cardDataParam) {
    try {
      // 嘗試標準 Base64 解碼（與原生成器一致）
      const decoded = decodeURIComponent(atob(cardDataParam));
      const jsonData = JSON.parse(decoded);
      
      // 確保 greetings 正確處理
      let greetings = [];
      if (Array.isArray(jsonData.g)) {
        greetings = jsonData.g;
      } else if (Array.isArray(jsonData.greetings)) {
        greetings = jsonData.greetings;
      } else if (jsonData.g && typeof jsonData.g === 'string') {
        greetings = [jsonData.g];
      } else if (jsonData.greetings && typeof jsonData.greetings === 'string') {
        greetings = [jsonData.greetings];
      } else {
        greetings = ['歡迎認識我！']; // 預設問候語
      }
      
      // 轉換為標準格式
      return {
        data: {
          name: jsonData.n || jsonData.name || '',
          title: jsonData.t || jsonData.title || '',
          department: jsonData.d || jsonData.department || '',
          organization: jsonData.o || jsonData.organization || '',
          email: jsonData.e || jsonData.email || '',
          phone: jsonData.p || jsonData.phone || '',
          mobile: jsonData.m || jsonData.mobile || '',
          avatar: jsonData.a || jsonData.avatar || '',
          address: jsonData.addr || jsonData.address || '',
          greetings: greetings,
          socialNote: jsonData.s || jsonData.socialNote || ''
        }
      };
    } catch (error) {
      console.log('[PWA] Standard JSON parsing failed, trying UTF-8 method:', error.message);
      
      // 備用方案：UTF-8 解碼（處理特殊編碼）
      try {
        const fixedBase64 = cardDataParam
          .replace(/\s/g, '+')
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .trim();
        
        const binaryString = atob(fixedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const jsonString = new TextDecoder('utf-8').decode(bytes);
        const jsonData = JSON.parse(jsonString);
        
        // 確保 greetings 正確處理（UTF-8 版本）
        let greetings = [];
        if (Array.isArray(jsonData.g)) {
          greetings = jsonData.g;
        } else if (Array.isArray(jsonData.greetings)) {
          greetings = jsonData.greetings;
        } else if (jsonData.g && typeof jsonData.g === 'string') {
          greetings = [jsonData.g];
        } else if (jsonData.greetings && typeof jsonData.greetings === 'string') {
          greetings = [jsonData.greetings];
        } else {
          greetings = ['歡迎認識我！']; // 預設問候語
        }
        
        return {
          data: {
            name: jsonData.n || jsonData.name || '',
            title: jsonData.t || jsonData.title || '',
            department: jsonData.d || jsonData.department || '',
            organization: jsonData.o || jsonData.organization || '',
            email: jsonData.e || jsonData.email || '',
            phone: jsonData.p || jsonData.phone || '',
            mobile: jsonData.m || jsonData.mobile || '',
            avatar: jsonData.a || jsonData.avatar || '',
            address: jsonData.addr || jsonData.address || '',
            greetings: greetings,
            socialNote: jsonData.s || jsonData.socialNote || ''
          }
        };
      } catch (utf8Error) {
        console.log('[PWA] UTF-8 JSON parsing also failed:', utf8Error.message);
        return null;
      }
    }
  }
  
  /**
   * 解析管道分隔格式（雙語版本） - 修復版本
   */
  parsePipeFormat(cardDataParam) {
    try {
      console.log('[PWA] Parsing pipe format, input length:', cardDataParam.length);
      
      // 嘗試 URL-safe Base64 解碼（與雙語生成器一致）
      const padding = '='.repeat((4 - cardDataParam.length % 4) % 4);
      const base64Fixed = cardDataParam.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const compact = decodeURIComponent(atob(base64Fixed));
      
      console.log('[PWA] Decoded pipe data:', compact);
      const parts = compact.split('|');
      console.log('[PWA] Split parts:', parts.length, parts);
      
      // 支援舊版本（8欄位）和新版本（9欄位）
      let parsedData;
      if (parts.length === 8) {
        // 舊版本格式（沒有手機號碼）
        const rawGreetings = parts[6] || '';
        console.log('[PWA] Raw greetings (8-field):', rawGreetings, typeof rawGreetings);
        const greetings = rawGreetings ? rawGreetings.split(',').map(g => g.trim()).filter(g => g) : ['歡迎認識我！'];
        console.log('[PWA] Processed greetings (8-field):', greetings);
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: '',
          avatar: parts[5] || '',
          greetings: greetings,
          socialNote: parts[7] || ''
        };
      } else if (parts.length >= 9) {
        // 新版本格式（包含手機號碼）
        const rawGreetings = parts[7] || '';
        console.log('[PWA] Raw greetings (9-field):', rawGreetings, typeof rawGreetings);
        const greetings = rawGreetings ? rawGreetings.split(',').map(g => g.trim()).filter(g => g) : ['歡迎認識我！'];
        console.log('[PWA] Processed greetings (9-field):', greetings);
        parsedData = {
          name: parts[0] || '',
          title: parts[1] || '',
          department: parts[2] || '',
          email: parts[3] || '',
          phone: parts[4] || '',
          mobile: parts[5] || '',
          avatar: parts[6] || '',
          greetings: greetings,
          socialNote: parts[8] || ''
        };
      } else {
        throw new Error(`Invalid pipe format: ${parts.length} parts`);
      }
      
      console.log('[PWA] Final parsed data:', parsedData);
      console.log('[PWA] Final greetings type:', typeof parsedData.greetings, 'isArray:', Array.isArray(parsedData.greetings));
      return { data: parsedData };
    } catch (error) {
      console.log('[PWA] URL-safe pipe parsing failed, trying standard method:', error.message);
      
      // 備用方案：標準 Base64 解碼
      try {
        const decoded = decodeURIComponent(atob(cardDataParam));
        const parts = decoded.split('|');
        
        let parsedData;
        if (parts.length === 8) {
          // 舊版本格式（沒有手機號碼） - 標準版本
          const greetings = parts[6] ? parts[6].split(',').map(g => g.trim()).filter(g => g) : ['歡迎認識我！'];
          parsedData = {
            name: parts[0] || '',
            title: parts[1] || '',
            department: parts[2] || '',
            email: parts[3] || '',
            phone: parts[4] || '',
            mobile: '',
            avatar: parts[5] || '',
            greetings: greetings,
            socialNote: parts[7] || ''
          };
        } else if (parts.length >= 9) {
          // 新版本格式（包含手機號碼） - 標準版本
          const greetings = parts[7] ? parts[7].split(',').map(g => g.trim()).filter(g => g) : ['歡迎認識我！'];
          parsedData = {
            name: parts[0] || '',
            title: parts[1] || '',
            department: parts[2] || '',
            email: parts[3] || '',
            phone: parts[4] || '',
            mobile: parts[5] || '',
            avatar: parts[6] || '',
            greetings: greetings,
            socialNote: parts[8] || ''
          };
        } else {
          throw new Error(`Invalid pipe format: ${parts.length} parts`);
        }
        
        return { data: parsedData };
      } catch (standardError) {
        console.log('[PWA] Standard pipe parsing also failed:', standardError.message);
        return null;
      }
    }
  }
  
  /**
   * 解析 Legacy 格式（向下相容性）
   */
  parseLegacyFormat(cardDataParam) {
    try {
      // 嘗試直接 Base64 解碼
      const decoded = atob(cardDataParam);
      const jsonData = JSON.parse(decoded);
      
      // 檢查是否為舊版本的完整格式
      if (jsonData.data && jsonData.data.name) {
        return jsonData;
      }
      
      return null;
    } catch (error) {
      console.log('[PWA] Legacy format parsing failed:', error.message);
      return null;
    }
  }
  
  // 轉換精簡格式為完整格式（優化版本）
  convertCompactToFull(compactData) {
    // 預設為延平大樓，後續由 detectCardType 自動識別修正
    return {
      data: {
        name: compactData.n || '',
        title: compactData.t || '',
        department: compactData.d || '',
        organization: compactData.o || '數位發展部',
        email: compactData.e || '',
        phone: compactData.p || '',
        mobile: compactData.m || '',
        avatar: compactData.a || '',
        address: compactData.addr || '100057臺北市中正區延平南路143號',
        greetings: compactData.g || ['歡迎認識我！'],
        socialLinks: {
          email: compactData.e ? `mailto:${compactData.e}` : '',
          socialNote: compactData.s || ''
        }
      }
    };
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
      console.log('[PWA] Updating stats...');
      
      if (!this.storage) {
        console.warn('[PWA] Storage not available for stats');
        return;
      }

      const stats = await this.storage.getStorageStats();
      console.log('[PWA] Storage stats:', stats);
      
      const totalCardsEl = document.getElementById('total-cards');
      const storageUsedEl = document.getElementById('storage-used');
      const lastSyncEl = document.getElementById('last-sync');
      
      if (totalCardsEl) totalCardsEl.textContent = stats.totalCards || 0;
      if (storageUsedEl) storageUsedEl.textContent = `${stats.storageUsedPercent || 0}%`;
      
      // 獲取健康檢查狀態
      if (this.healthManager) {
        const healthSummary = this.healthManager.getHealthSummary();
        if (lastSyncEl) {
          lastSyncEl.textContent = 
            healthSummary.lastCheck ? 
            new Date(healthSummary.lastCheck).toLocaleDateString() : 
            '從未';
        }
      } else {
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
      
      console.log('[PWA] Stats updated successfully');
    } catch (error) {
      console.error('[PWA] Failed to update stats:', error);
    }
  }

  async initializeCardsList() {
    try {
      const cardsList = document.getElementById('cards-list');
      if (cardsList && this.storage) {
        console.log('[PWA] Initializing cards list...');
        if (!window.cardList) {
          // 使用 storage 直接初始化，不依賴 cardManager
          window.cardList = new CardListComponent(cardsList, { storage: this.storage });
        }
        await window.cardList.loadCards();
        console.log('[PWA] Cards list initialized successfully');
      } else {
        console.warn('[PWA] Cards list initialization skipped:', {
          cardsList: !!cardsList,
          storage: !!this.storage
        });
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
      console.log('[PWA] Starting QR code scan...');
      
      if (this.qrScanner) {
        await this.qrScanner.openScannerModal();
      } else {
        console.error('[PWA] QR Scanner not initialized');
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
          console.error('[PWA] Manual import failed:', error);
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
      console.log('[PWA] View card:', cardId);
      
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
      console.log('[PWA] Generate QR for card:', cardId);
      
      if (!this.cardManager) {
        console.error('[PWA] CardManager not available');
        this.showNotification('CardManager 未初始化', 'error');
        return;
      }
      
      this.showLoading('生成 QR 碼中...');
      const result = await this.cardManager.generateQRCode(cardId, {
        size: 800, // 高解析度
        colorDark: '#6b7280',
        colorLight: '#ffffff'
      });
      
      console.log('[PWA] QR generation result:', result);
      
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
    console.log('[PWA] Search cards:', query);
  }

  async filterCards(type) {
    console.log('[PWA] Filter cards:', type);
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
    console.log('[PWA] showCardModal - card.data:', card.data);
    console.log('[PWA] showCardModal - card.data.greetings:', card.data.greetings);
    
    const displayData = this.cardManager ? 
      this.cardManager.getBilingualCardData(card.data, this.currentLanguage) : 
      card.data;
    
    console.log('[PWA] showCardModal - displayData:', displayData);
    console.log('[PWA] showCardModal - displayData.greetings:', displayData.greetings);
    
    const labels = this.getUILabels();
    
    // 處理問候語顯示 - 直接修復版
    let greetingsHtml = '';
    if (displayData.greetings && Array.isArray(displayData.greetings) && displayData.greetings.length > 0) {
      const firstGreeting = displayData.greetings[0];
      let greetingText = '';
      
      if (firstGreeting && typeof firstGreeting === 'object' && firstGreeting.zh) {
        greetingText = firstGreeting.zh;
      } else if (typeof firstGreeting === 'string') {
        greetingText = firstGreeting.includes('~') ? firstGreeting.split('~')[0] : firstGreeting;
      } else {
        greetingText = '歡迎認識我';
      }
      
      greetingsHtml = `<div class="detail-item"><strong>${labels.greetings}:</strong><br><div class="greetings-container"><span class="greeting-item">${greetingText}</span></div></div>`;
    }
    
    // 處理社群資訊顯示 - 增強互動性
    let socialHtml = '';
    if (displayData.socialNote && displayData.socialNote.trim()) {
      const socialContent = this.formatSocialContent(displayData.socialNote);
      socialHtml = `<div class="detail-item"><strong>${labels.social}:</strong><br><div class="social-content">${socialContent}</div></div>`;
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
            console.error('Copy failed:', error);
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
          console.warn('[PWA] Failed to get card data for filename:', error);
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

console.log('[PWA] App.js loaded with simplified greeting processing fix');