/**
 * PWA-13: PWA 使用者介面整合
 * 統一所有功能模組的使用者介面與導航
 */

class UnifiedInterface {
  constructor() {
    this.currentView = 'home';
    this.isInitialized = false;
    this.components = new Map();
    this.eventListeners = new Map();
    
    this.init();
  }

  async init() {
    try {
      
      await this.initializeComponents();
      this.setupGlobalEventListeners();
      this.setupKeyboardShortcuts();
      this.setupAccessibility();
      
      this.isInitialized = true;
      
      // 觸發初始化完成事件
      this.dispatchEvent('interfaceReady', { timestamp: Date.now() });
    } catch (error) {
      console.error('[UnifiedInterface] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 初始化所有 UI 組件
   */
  async initializeComponents() {
    // 初始化導航組件
    await this.initializeNavigation();
    
    // 初始化主要頁面組件
    await this.initializePageComponents();
    
    // 初始化模態對話框組件
    await this.initializeModalComponents();
    
    // 初始化通知系統
    await this.initializeNotificationSystem();
    
    // 初始化載入指示器
    await this.initializeLoadingSystem();
  }

  /**
   * 初始化導航系統
   */
  async initializeNavigation() {
    const navigation = {
      container: document.querySelector('.main-nav'),
      items: document.querySelectorAll('.nav-item'),
      activeClass: 'active'
    };
    
    if (navigation.container) {
      // 設定導航點擊事件
      navigation.items.forEach(item => {
        const clickHandler = (e) => {
          e.preventDefault();
          const targetView = item.dataset.page;
          if (targetView) {
            this.navigateToView(targetView);
          }
        };
        
        item.addEventListener('click', clickHandler);
        this.eventListeners.set(`nav-${item.dataset.page}`, {
          element: item,
          event: 'click',
          handler: clickHandler
        });
      });
      
      // 設定響應式導航
      this.setupResponsiveNavigation(navigation);
    }
    
    this.components.set('navigation', navigation);
  }

  /**
   * 初始化頁面組件
   */
  async initializePageComponents() {
    const pages = {
      home: document.getElementById('page-home'),
      cards: document.getElementById('page-cards'),
      import: document.getElementById('page-import'),
      export: document.getElementById('page-export'),
      settings: document.getElementById('page-settings')
    };
    
    // 為每個頁面設定初始化邏輯
    Object.keys(pages).forEach(pageId => {
      const page = pages[pageId];
      if (page) {
        this.initializePageSpecificComponents(pageId, page);
      }
    });
    
    this.components.set('pages', pages);
  }

  /**
   * 初始化特定頁面的組件
   */
  initializePageSpecificComponents(pageId, pageElement) {
    switch (pageId) {
      case 'home':
        this.initializeHomePage(pageElement);
        break;
      case 'cards':
        this.initializeCardsPage(pageElement);
        break;
      case 'import':
        this.initializeImportPage(pageElement);
        break;
      case 'export':
        this.initializeExportPage(pageElement);
        break;
      case 'settings':
        this.initializeSettingsPage(pageElement);
        break;
    }
  }

  /**
   * 初始化首頁組件
   */
  initializeHomePage(pageElement) {
    // 統計卡片
    const statsCards = pageElement.querySelectorAll('.stat-card');
    statsCards.forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        if (action) {
          this.handleQuickAction(action);
        }
      });
    });
    
    // 快速操作按鈕
    const quickActions = pageElement.querySelectorAll('.quick-action-btn');
    quickActions.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action) {
          this.handleQuickAction(action);
        }
      });
    });
    
  }

  /**
   * 初始化名片頁面組件
   */
  initializeCardsPage(pageElement) {
    // 搜尋功能
    const searchInput = pageElement.querySelector('#card-search');
    if (searchInput) {
      const searchHandler = this.debounce((e) => {
        this.handleCardSearch(e.target.value);
      }, 300);
      
      searchInput.addEventListener('input', searchHandler);
      this.eventListeners.set('card-search', {
        element: searchInput,
        event: 'input',
        handler: searchHandler
      });
    }
    
    // 篩選功能
    const filterSelect = pageElement.querySelector('#card-filter');
    if (filterSelect) {
      const filterHandler = (e) => {
        this.handleCardFilter(e.target.value);
      };
      
      filterSelect.addEventListener('change', filterHandler);
      this.eventListeners.set('card-filter', {
        element: filterSelect,
        event: 'change',
        handler: filterHandler
      });
    }
    
    // 排序功能
    const sortSelect = pageElement.querySelector('#card-sort');
    if (sortSelect) {
      const sortHandler = (e) => {
        this.handleCardSort(e.target.value);
      };
      
      sortSelect.addEventListener('change', sortHandler);
      this.eventListeners.set('card-sort', {
        element: sortSelect,
        event: 'change',
        handler: sortHandler
      });
    }
    
    // 檢視模式切換
    const viewToggle = pageElement.querySelectorAll('.view-toggle-btn');
    viewToggle.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewMode = btn.dataset.view;
        this.handleViewModeChange(viewMode);
      });
    });
    
  }

  /**
   * 初始化匯入頁面組件
   */
  initializeImportPage(pageElement) {
    // URL 匯入
    const urlForm = pageElement.querySelector('#import-url-form');
    if (urlForm) {
      urlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUrlImport();
      });
    }
    
    // 檔案匯入
    const fileInput = pageElement.querySelector('#import-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileImport(e.target.files[0]);
      });
    }
    
    // 拖放匯入
    const dropZone = pageElement.querySelector('.import-drop-zone');
    if (dropZone) {
      this.setupDragAndDrop(dropZone);
    }
    
  }

  /**
   * 初始化匯出頁面組件
   */
  initializeExportPage(pageElement) {
    // 匯出選項
    const exportForm = pageElement.querySelector('#export-form');
    if (exportForm) {
      exportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleExport();
      });
    }
    
    // 匯出格式選擇
    const formatRadios = pageElement.querySelectorAll('input[name="export-format"]');
    formatRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.handleExportFormatChange(radio.value);
      });
    });
    
  }

  /**
   * 初始化設定頁面組件
   */
  initializeSettingsPage(pageElement) {
    // 語言設定
    const languageSelect = pageElement.querySelector('#language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.handleLanguageChange(e.target.value);
      });
    }
    
    // 主題設定
    const themeSelect = pageElement.querySelector('#theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.handleThemeChange(e.target.value);
      });
    }
    
    // 資料管理
    const clearDataBtn = pageElement.querySelector('#clear-data-btn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        this.handleClearData();
      });
    }
    
  }

  /**
   * 初始化模態對話框組件
   */
  async initializeModalComponents() {
    // 衝突解決器
    const conflictResolverContainer = document.getElementById('conflict-resolver');
    if (conflictResolverContainer && window.ConflictResolver) {
      const conflictResolver = new ConflictResolver(conflictResolverContainer, {
        language: window.bilingualBridge?.getCurrentLanguage() || 'zh',
        onResolve: (resolutions, importData) => {
          this.handleConflictResolution(resolutions, importData);
        },
        onCancel: () => {
          this.handleConflictCancel();
        }
      });
      
      this.components.set('conflictResolver', conflictResolver);
    }
    
    // 通用模態對話框
    this.setupGenericModals();
    
  }

  /**
   * 初始化通知系統
   */
  async initializeNotificationSystem() {
    const notificationContainer = document.getElementById('notification');
    
    if (notificationContainer) {
      const notificationSystem = {
        container: notificationContainer,
        queue: [],
        currentNotification: null,
        defaultDuration: 5000
      };
      
      // 設定關閉按鈕
      const closeBtn = notificationContainer.querySelector('.notification-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.hideNotification();
        });
      }
      
      this.components.set('notification', notificationSystem);
    }
    
  }

  /**
   * 初始化載入系統
   */
  async initializeLoadingSystem() {
    const loadingContainer = document.getElementById('loading');
    
    if (loadingContainer) {
      const loadingSystem = {
        container: loadingContainer,
        isVisible: false,
        queue: 0
      };
      
      this.components.set('loading', loadingSystem);
    }
    
  }

  /**
   * 設定全域事件監聽器
   */
  setupGlobalEventListeners() {
    // 語言變更事件
    window.addEventListener('languageChanged', (e) => {
      this.handleGlobalLanguageChange(e.detail.language);
    });
    
    // 網路狀態變更
    window.addEventListener('online', () => {
      this.handleNetworkStatusChange(true);
    });
    
    window.addEventListener('offline', () => {
      this.handleNetworkStatusChange(false);
    });
    
    // 視窗大小變更
    window.addEventListener('resize', this.debounce(() => {
      this.handleWindowResize();
    }, 250));
    
    // 應用程式狀態變更
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
  }

  /**
   * 設定鍵盤快捷鍵
   */
  setupKeyboardShortcuts() {
    const shortcuts = {
      'Ctrl+1': () => this.navigateToView('home'),
      'Ctrl+2': () => this.navigateToView('cards'),
      'Ctrl+3': () => this.navigateToView('import'),
      'Ctrl+4': () => this.navigateToView('export'),
      'Ctrl+5': () => this.navigateToView('settings'),
      'Ctrl+F': (e) => {
        e.preventDefault();
        this.focusSearch();
      },
      'Escape': () => this.handleEscapeKey()
    };
    
    document.addEventListener('keydown', (e) => {
      const key = this.getKeyboardShortcut(e);
      const handler = shortcuts[key];
      
      if (handler) {
        handler(e);
      }
    });
    
  }

  /**
   * 設定無障礙功能
   */
  setupAccessibility() {
    // ARIA 標籤更新
    this.updateAriaLabels();
    
    // 焦點管理
    this.setupFocusManagement();
    
    // 高對比度支援
    this.setupHighContrastSupport();
    
    // 螢幕閱讀器支援
    this.setupScreenReaderSupport();
    
  }

  /**
   * 導航到指定檢視
   */
  navigateToView(viewName) {
    if (this.currentView === viewName) return;
    
    
    // 隱藏當前檢視
    this.hideCurrentView();
    
    // 顯示目標檢視
    this.showView(viewName);
    
    // 更新導航狀態
    this.updateNavigationState(viewName);
    
    // 更新當前檢視
    this.currentView = viewName;
    
    // 觸發檢視變更事件
    this.dispatchEvent('viewChanged', {
      from: this.currentView,
      to: viewName,
      timestamp: Date.now()
    });
    
    // 初始化檢視特定功能
    this.initializeViewSpecificFeatures(viewName);
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info', duration = null) {
    const notification = this.components.get('notification');
    if (!notification) return;
    
    const { container } = notification;
    const icon = container.querySelector('.notification-icon');
    const messageEl = container.querySelector('.notification-message');
    
    if (!icon || !messageEl) return;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    icon.textContent = icons[type] || icons.info;
    messageEl.textContent = message;
    
    container.classList.remove('hidden');
    container.classList.add('show');
    
    // 自動隱藏
    const hideDelay = duration || notification.defaultDuration;
    setTimeout(() => {
      this.hideNotification();
    }, hideDelay);
    
  }

  /**
   * 隱藏通知
   */
  hideNotification() {
    const notification = this.components.get('notification');
    if (!notification) return;
    
    notification.container.classList.add('hidden');
    notification.container.classList.remove('show');
  }

  /**
   * 顯示載入指示器
   */
  showLoading(message = '載入中...') {
    const loading = this.components.get('loading');
    if (!loading) return;
    
    const { container } = loading;
    const messageEl = container.querySelector('.loading-text');
    
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    container.classList.remove('hidden');
    loading.isVisible = true;
    loading.queue++;
    
  }

  /**
   * 隱藏載入指示器
   */
  hideLoading() {
    const loading = this.components.get('loading');
    if (!loading) return;
    
    loading.queue = Math.max(0, loading.queue - 1);
    
    if (loading.queue === 0) {
      loading.container.classList.add('hidden');
      loading.isVisible = false;
    }
  }

  /**
   * 處理衝突解決
   */
  handleConflictResolution(resolutions, importData) {
    
    if (window.app && window.app.transferManager) {
      window.app.transferManager.resolveConflictsAndImport(importData, resolutions)
        .then(result => {
          if (result.success) {
            this.showNotification(`成功匯入 ${result.importedCount} 張名片`, 'success');
            if (window.app.updateStats) {
              window.app.updateStats();
            }
          } else {
            this.showNotification(result.error || '匯入失敗', 'error');
          }
        })
        .catch(error => {
          console.error('[UnifiedInterface] Conflict resolution failed:', error);
          this.showNotification('衝突解決失敗', 'error');
        });
    }
  }

  /**
   * 處理快速操作
   */
  handleQuickAction(action) {
    
    switch (action) {
      case 'add-card':
        this.navigateToView('import');
        break;
      case 'scan-qr':
        this.handleQRScan();
        break;
      case 'import-file':
        document.getElementById('import-file')?.click();
        break;
      case 'backup-all':
        this.navigateToView('export');
        break;
      case 'view-cards':
        this.navigateToView('cards');
        break;
      default:
    }
  }

  // 工具方法

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

  getKeyboardShortcut(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    if (event.key && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Shift' && event.key !== 'Meta') {
      parts.push(event.key);
    }
    
    return parts.join('+');
  }

  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(`unifiedInterface:${eventName}`, { detail });
    window.dispatchEvent(event);
  }

  // 存根方法（將由具體實作填充）
  hideCurrentView() { /* 實作隱藏當前檢視的邏輯 */ }
  showView(viewName) { /* 實作顯示檢視的邏輯 */ }
  updateNavigationState(viewName) { /* 實作更新導航狀態的邏輯 */ }
  initializeViewSpecificFeatures(viewName) { /* 實作檢視特定功能初始化 */ }
  setupResponsiveNavigation(navigation) { /* 實作響應式導航 */ }
  setupDragAndDrop(dropZone) { /* 實作拖放功能 */ }
  setupGenericModals() { /* 實作通用模態對話框 */ }
  updateAriaLabels() { /* 實作 ARIA 標籤更新 */ }
  setupFocusManagement() { /* 實作焦點管理 */ }
  setupHighContrastSupport() { /* 實作高對比度支援 */ }
  setupScreenReaderSupport() { /* 實作螢幕閱讀器支援 */ }
  handleCardSearch(query) { /* 實作名片搜尋 */ }
  handleCardFilter(filter) { /* 實作名片篩選 */ }
  handleCardSort(sort) { /* 實作名片排序 */ }
  handleViewModeChange(mode) { /* 實作檢視模式變更 */ }
  handleUrlImport() { /* 實作 URL 匯入 */ }
  handleFileImport(file) { /* 實作檔案匯入 */ }
  handleExport() { /* 實作匯出 */ }
  handleExportFormatChange(format) { /* 實作匯出格式變更 */ }
  handleLanguageChange(language) { /* 實作語言變更 */ }
  handleThemeChange(theme) { /* 實作主題變更 */ }
  handleClearData() { /* 實作清除資料 */ }
  handleConflictCancel() { /* 實作衝突取消 */ }
  handleGlobalLanguageChange(language) { /* 實作全域語言變更 */ }
  handleNetworkStatusChange(isOnline) { /* 實作網路狀態變更 */ }
  handleWindowResize() { /* 實作視窗大小變更 */ }
  handleVisibilityChange() { /* 實作可見性變更 */ }
  focusSearch() { /* 實作搜尋焦點 */ }
  handleEscapeKey() { /* 實作 ESC 鍵處理 */ }
  handleQRScan() { /* 實作 QR 碼掃描 */ }
}

// 全域實例
window.unifiedInterface = new UnifiedInterface();

