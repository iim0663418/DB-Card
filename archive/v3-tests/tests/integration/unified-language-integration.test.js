/**
 * 統一語言架構整合測試
 * 驗證所有雙語模組的完整整合
 */

describe('Unified Language Architecture Integration', () => {
  let app;
  let enhancedLanguageManager;
  let cardListComponent;
  let mockContainer;

  beforeEach(async () => {
    // Setup DOM environment
    document.body.innerHTML = `
      <div id="app">
        <!-- Navigation -->
        <nav class="pwa-navigation">
          <div class="nav-item" data-page="home">
            <span class="nav-text">首頁</span>
          </div>
          <div class="nav-item" data-page="cards">
            <span class="nav-text">我的名片</span>
          </div>
          <div class="nav-item" data-page="import">
            <span class="nav-text">匯入名片</span>
          </div>
        </nav>

        <!-- Language toggle -->
        <button id="lang-toggle">
          <span class="lang-text">EN</span>
        </button>

        <!-- Card list container -->
        <div class="card-list-container" id="cards-list">
          <div class="empty-state">
            <h3>還沒有儲存任何名片</h3>
            <p>匯入您的第一張數位名片，開始建立您的名片收藏</p>
            <button class="btn btn-primary" data-action="navigate-import">
              開始匯入名片
            </button>
          </div>
        </div>

        <!-- Notification container -->
        <div id="notification" class="notification hidden">
          <span class="notification-icon">ℹ️</span>
          <span class="notification-message">測試通知</span>
          <button class="notification-close">&times;</button>
        </div>

        <!-- Loading indicator -->
        <div id="loading" class="hidden">
          <div class="loading-text">載入中...</div>
        </div>
      </div>
    `;

    // Mock global dependencies
    global.window = global;
    global.localStorage = {
      getItem: sinon.stub().returns('zh'),
      setItem: sinon.stub()
    };
    global.navigator = {
      language: 'zh-TW'
    };

    // Initialize components
    mockContainer = document.getElementById('cards-list');
    
    // Mock storage
    const mockStorage = {
      listCards: sinon.stub().resolves([]),
      getCard: sinon.stub().resolves(null),
      deleteCard: sinon.stub().resolves(),
      initialize: sinon.stub().resolves()
    };

    // Initialize Enhanced Language Manager
    global.EnhancedLanguageManager = (await import('../../pwa-card-storage/src/core/enhanced-language-manager.js')).default;
    global.TranslationRegistry = (await import('../../pwa-card-storage/src/core/translation-registry.js')).default;
    global.UnifiedLanguageObserver = (await import('../../pwa-card-storage/src/core/unified-language-observer.js')).default;
    global.PWAUILanguageAdapter = (await import('../../pwa-card-storage/src/core/pwa-ui-language-adapter.js')).default;
    global.CardListComponent = (await import('../../pwa-card-storage/src/ui/components/card-list.js')).default;

    // Initialize enhanced language manager
    enhancedLanguageManager = new global.EnhancedLanguageManager();
    await enhancedLanguageManager.initialize();
    global.enhancedLanguageManager = enhancedLanguageManager;

    // Initialize card list component
    cardListComponent = new global.CardListComponent(mockContainer, { storage: mockStorage });
    global.cardList = cardListComponent;

    // Mock PWA app
    app = {
      enhancedLanguageManager,
      currentLanguage: 'zh',
      showNotification: sinon.stub(),
      getLocalizedText: (key, fallback) => enhancedLanguageManager.getUnifiedText(key) || fallback,
      updateNavigationLabels: sinon.stub()
    };
  });

  afterEach(() => {
    // Cleanup
    if (cardListComponent && cardListComponent.cleanup) {
      cardListComponent.cleanup();
    }
    if (enhancedLanguageManager && enhancedLanguageManager.cleanup) {
      enhancedLanguageManager.cleanup();
    }
    document.body.innerHTML = '';
  });

  describe('Enhanced Language Manager Integration', () => {
    it('should initialize enhanced language manager successfully', () => {
      expect(enhancedLanguageManager.initialized).to.be.true;
      expect(enhancedLanguageManager.translationRegistry).to.exist;
      expect(enhancedLanguageManager.unifiedObserver).to.exist;
      expect(enhancedLanguageManager.pwaAdapter).to.exist;
    });

    it('should provide unified text translation', () => {
      const zhText = enhancedLanguageManager.getUnifiedText('pwa.cardList.view');
      const enText = enhancedLanguageManager.getUnifiedText('pwa.cardList.view', 'en');
      
      expect(zhText).to.equal('檢視');
      expect(enText).to.equal('View');
    });

    it('should switch language through enhanced manager', async () => {
      const initialLang = enhancedLanguageManager.getCurrentLanguage();
      expect(initialLang).to.equal('zh');

      const newLang = await enhancedLanguageManager.toggleLanguage();
      expect(newLang).to.equal('en');
      expect(enhancedLanguageManager.getCurrentLanguage()).to.equal('en');
    });
  });

  describe('Card List Component Integration', () => {
    it('should register with unified language system', () => {
      expect(cardListComponent.currentLanguage).to.equal('zh');
      
      // Check if component is registered with PWA adapter
      const adapter = enhancedLanguageManager.pwaAdapter;
      const registeredComponents = adapter.registeredComponents;
      
      const cardListRegistered = Array.from(registeredComponents.keys())
        .some(key => key.includes('card-list'));
      expect(cardListRegistered).to.be.true;
    });

    it('should update language when language changes', async () => {
      // Initial state should be Chinese
      expect(cardListComponent.currentLanguage).to.equal('zh');
      
      // Switch to English
      await enhancedLanguageManager.switchLanguage('en');
      
      // Component should update
      expect(cardListComponent.currentLanguage).to.equal('en');
      
      // Check if UI elements are updated
      const emptyTitle = document.querySelector('.empty-state h3');
      expect(emptyTitle.textContent).to.equal('No Cards Saved Yet');
    });

    it('should provide localized text correctly', () => {
      const zhView = cardListComponent.getLocalizedText('cardList.view');
      expect(zhView).to.equal('檢視');
      
      cardListComponent.currentLanguage = 'en';
      const enView = cardListComponent.getLocalizedText('cardList.view');
      expect(enView).to.equal('View');
    });
  });

  describe('PWA UI Language Adapter Integration', () => {
    it('should register PWA components correctly', () => {
      const adapter = enhancedLanguageManager.pwaAdapter;
      const status = adapter.getStatus();
      
      expect(status.initialized).to.be.true;
      expect(status.registeredComponents).to.be.greaterThan(0);
      expect(status.componentsByType).to.have.property('card-list');
    });

    it('should update navigation language', async () => {
      const navItems = document.querySelectorAll('.nav-item .nav-text');
      
      // Initial Chinese state
      expect(navItems[0].textContent).to.equal('首頁');
      expect(navItems[1].textContent).to.equal('我的名片');
      
      // Switch to English
      await enhancedLanguageManager.switchLanguage('en');
      
      // Navigation should update
      expect(navItems[0].textContent).to.equal('Home');
      expect(navItems[1].textContent).to.equal('My Cards');
    });

    it('should update language toggle button', async () => {
      const langToggle = document.getElementById('lang-toggle');
      const langText = langToggle.querySelector('.lang-text');
      
      // Initial state (Chinese active, showing English option)
      expect(langText.textContent).to.equal('EN');
      
      // Switch to English
      await enhancedLanguageManager.switchLanguage('en');
      
      // Should show Chinese option
      expect(langText.textContent).to.equal('中');
    });
  });

  describe('Notification System Integration', () => {
    it('should show localized notifications', async () => {
      const notification = document.getElementById('notification');
      const messageEl = notification.querySelector('.notification-message');
      
      // Mock notification display
      const showNotification = (message, type) => {
        messageEl.textContent = message;
        notification.classList.remove('hidden');
      };
      
      // Test Chinese notification
      const zhMessage = enhancedLanguageManager.getUnifiedText('pwa.notifications.languageChanged');
      showNotification(zhMessage, 'success');
      expect(messageEl.textContent).to.equal('語言已切換');
      
      // Switch to English and test
      await enhancedLanguageManager.switchLanguage('en');
      const enMessage = enhancedLanguageManager.getUnifiedText('pwa.notifications.languageChanged');
      showNotification(enMessage, 'success');
      expect(messageEl.textContent).to.equal('Language switched');
    });
  });

  describe('Complete Language Switching Flow', () => {
    it('should perform complete language switch across all components', async () => {
      // Verify initial Chinese state
      expect(enhancedLanguageManager.getCurrentLanguage()).to.equal('zh');
      expect(cardListComponent.currentLanguage).to.equal('zh');
      
      const emptyTitle = document.querySelector('.empty-state h3');
      const emptyButton = document.querySelector('.empty-state .btn');
      const navHome = document.querySelector('[data-page="home"] .nav-text');
      
      expect(emptyTitle.textContent).to.equal('還沒有儲存任何名片');
      expect(emptyButton.textContent).to.equal('開始匯入名片');
      expect(navHome.textContent).to.equal('首頁');
      
      // Perform language switch
      await enhancedLanguageManager.switchLanguage('en');
      
      // Verify all components updated to English
      expect(enhancedLanguageManager.getCurrentLanguage()).to.equal('en');
      expect(cardListComponent.currentLanguage).to.equal('en');
      
      expect(emptyTitle.textContent).to.equal('No Cards Saved Yet');
      expect(emptyButton.textContent).to.equal('Start Importing Cards');
      expect(navHome.textContent).to.equal('Home');
      
      // Switch back to Chinese
      await enhancedLanguageManager.switchLanguage('zh');
      
      // Verify components switched back
      expect(enhancedLanguageManager.getCurrentLanguage()).to.equal('zh');
      expect(cardListComponent.currentLanguage).to.equal('zh');
      
      expect(emptyTitle.textContent).to.equal('還沒有儲存任何名片');
      expect(emptyButton.textContent).to.equal('開始匯入名片');
      expect(navHome.textContent).to.equal('首頁');
    });

    it('should handle language switching errors gracefully', async () => {
      // Mock error in language switching
      const originalSwitchLanguage = enhancedLanguageManager.switchLanguage;
      enhancedLanguageManager.switchLanguage = sinon.stub().rejects(new Error('Language switch failed'));
      
      try {
        await enhancedLanguageManager.switchLanguage('en');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Language switch failed');
        
        // Verify system remains in stable state
        expect(enhancedLanguageManager.getCurrentLanguage()).to.equal('zh');
        expect(cardListComponent.currentLanguage).to.equal('zh');
      }
      
      // Restore original method
      enhancedLanguageManager.switchLanguage = originalSwitchLanguage;
    });
  });

  describe('Performance and Memory Management', () => {
    it('should cleanup resources properly', () => {
      const adapter = enhancedLanguageManager.pwaAdapter;
      const initialComponentCount = adapter.registeredComponents.size;
      
      expect(initialComponentCount).to.be.greaterThan(0);
      
      // Cleanup card list component
      cardListComponent.cleanup();
      
      // Verify component was unregistered
      const finalComponentCount = adapter.registeredComponents.size;
      expect(finalComponentCount).to.be.lessThan(initialComponentCount);
    });

    it('should handle concurrent language switches', async () => {
      const promises = [
        enhancedLanguageManager.switchLanguage('en'),
        enhancedLanguageManager.switchLanguage('zh'),
        enhancedLanguageManager.switchLanguage('en')
      ];
      
      const results = await Promise.all(promises);
      
      // All promises should resolve
      expect(results).to.have.length(3);
      
      // Final state should be consistent
      const finalLang = enhancedLanguageManager.getCurrentLanguage();
      expect(['zh', 'en']).to.include(finalLang);
      expect(cardListComponent.currentLanguage).to.equal(finalLang);
    });
  });

  describe('Translation Registry Integration', () => {
    it('should provide comprehensive translations', () => {
      const registry = enhancedLanguageManager.translationRegistry;
      
      // Test PWA translations
      expect(registry.getTranslation('zh', 'pwa.cardList.view')).to.equal('檢視');
      expect(registry.getTranslation('en', 'pwa.cardList.view')).to.equal('View');
      
      // Test security translations
      expect(registry.getTranslation('zh', 'security.benefits')).to.equal('優點：');
      expect(registry.getTranslation('en', 'security.benefits')).to.equal('Benefits:');
      
      // Test navigation translations
      expect(registry.getTranslation('zh', 'pwa.navigation.cards')).to.equal('我的名片');
      expect(registry.getTranslation('en', 'pwa.navigation.cards')).to.equal('My Cards');
    });

    it('should validate translation completeness', () => {
      const registry = enhancedLanguageManager.translationRegistry;
      const validation = registry.validateTranslations();
      
      expect(validation.valid).to.be.true;
      expect(validation.missing).to.be.empty;
    });
  });
});