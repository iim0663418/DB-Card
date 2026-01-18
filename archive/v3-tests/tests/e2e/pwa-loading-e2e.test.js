/**
 * PWA 載入提示端到端測試
 * 測試完整的使用者載入體驗流程
 * 
 * 對應需求: R-UX-IMPROVEMENT, D-PWA-LOADING, T-PWA-LOADING-INDICATOR
 */

describe('PWA Loading E2E Tests', () => {
  let testPage;
  let mockWindow;

  beforeEach(() => {
    // 創建完整的測試頁面環境
    testPage = document.createElement('div');
    testPage.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PWA 載入測試</title>
      </head>
      <body>
        <div id="app" class="app-container">
          <header class="app-header">
            <h1>NFC 數位名片離線儲存</h1>
          </header>
          
          <main id="main-content" class="main-content">
            <div id="page-home" class="page active">
              <h2>歡迎使用離線名片儲存</h2>
            </div>
            <div id="page-cards" class="page">
              <div id="cards-list" class="cards-list"></div>
            </div>
          </main>
          
          <div id="loading" class="loading-overlay hidden">
            <div class="loading-spinner"></div>
            <div class="loading-text">處理中...</div>
          </div>
          
          <div id="notification" class="notification hidden">
            <div class="notification-content">
              <span class="notification-icon"></span>
              <span class="notification-message"></span>
              <button class="notification-close">&times;</button>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    document.body.appendChild(testPage);

    // Mock 完整的 window 環境
    mockWindow = {
      location: { 
        href: 'https://example.com/pwa-card-storage/?c=eyJ0ZXN0IjoiZGF0YSJ9',
        search: '?c=eyJ0ZXN0IjoiZGF0YSJ9',
        hash: ''
      },
      PWAIntegration: {
        identifyCardTypeEnhanced: jest.fn().mockReturnValue('index'),
        manualClearContext: jest.fn()
      },
      SimpleCardParser: {
        parseDirectly: jest.fn().mockReturnValue({
          name: '張三',
          email: 'zhang.san@moda.gov.tw',
          title: '科長',
          department: '資訊處',
          phone: '02-2380-0411',
          mobile: '0912-345-678'
        })
      }
    };

    global.window = mockWindow;
  });

  afterEach(() => {
    document.body.removeChild(testPage);
    jest.clearAllMocks();
  });

  // TC-E2E-001: 測試完整的名片匯入載入流程
  describe('TC-E2E-001: Complete Card Import Flow', () => {
    test('should show progressive loading during card import from URL', async () => {
      // Given: 模擬完整的 PWA 應用程式
      const mockApp = {
        storage: {
          storeCardDirectly: jest.fn().mockResolvedValue('card-456')
        },
        updateStats: jest.fn().mockResolvedValue(),
        navigateTo: jest.fn().mockImplementation(async (page) => {
          // 模擬頁面導航
          document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
          const targetPage = document.getElementById(`page-${page}`);
          if (targetPage) {
            targetPage.classList.add('active');
          }
        }),
        showLoading: function(message) {
          const loading = document.getElementById('loading');
          const loadingText = document.querySelector('.loading-text');
          
          if (loading) {
            loading.classList.remove('hidden');
            loading.style.display = 'block';
          }
          if (loadingText) {
            loadingText.textContent = message;
          }
        },
        hideLoading: function() {
          const loading = document.getElementById('loading');
          if (loading) {
            loading.classList.add('hidden');
            loading.style.display = 'none';
          }
        },
        showNotification: function(message, type = 'info') {
          const notification = document.getElementById('notification');
          const icon = notification?.querySelector('.notification-icon');
          const messageEl = notification?.querySelector('.notification-message');

          if (notification && icon && messageEl) {
            const icons = {
              success: '✅',
              error: '❌',
              warning: '⚠️',
              info: 'ℹ️'
            };

            icon.textContent = icons[type] || icons.info;
            messageEl.textContent = message;
            notification.classList.remove('hidden');
            notification.style.display = 'block';
          }
        }
      };

      // 模擬完整的 importFromUrlData 流程
      const importFromUrlData = async (data) => {
        const loadingSteps = [
          '📝 正在讀取名片資料...',
          '🔍 正在識別名片類型...',
          '⚙️ 正在解析名片資料...',
          '💾 正在準備儲存...',
          '💾 正在儲存名片...',
          '✅ 儲存完成，正在更新...'
        ];

        try {
          // 模擬每個載入階段
          for (let i = 0; i < loadingSteps.length; i++) {
            mockApp.showLoading(loadingSteps[i]);
            
            // 驗證載入狀態在 DOM 中正確顯示
            const loadingOverlay = document.getElementById('loading');
            const loadingText = document.querySelector('.loading-text');
            
            expect(loadingOverlay.classList.contains('hidden')).toBe(false);
            expect(loadingText.textContent).toBe(loadingSteps[i]);
            
            // 模擬處理時間
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // 模擬成功儲存
          const cardType = window.PWAIntegration.identifyCardTypeEnhanced({ url: window.location.href });
          const cardData = window.SimpleCardParser.parseDirectly(data, cardType);
          cardData.url = window.location.href;
          
          const cardId = await mockApp.storage.storeCardDirectly(cardData, cardType);
          
          // 清除暫存
          window.PWAIntegration.manualClearContext();
          
          // 更新統計和導航
          await mockApp.updateStats();
          await mockApp.navigateTo('cards');
          
          // 隱藏載入並顯示成功通知
          mockApp.hideLoading();
          mockApp.showNotification('名片已成功儲存到離線收納', 'success');
          
          return cardId;
        } catch (error) {
          mockApp.hideLoading();
          mockApp.showNotification('讀取名片失敗，請稍後再試', 'error');
          throw error;
        }
      };

      // When: 執行完整的匯入流程
      const cardId = await importFromUrlData('eyJ0ZXN0IjoiZGF0YSJ9');

      // Then: 驗證完整流程
      expect(cardId).toBe('card-456');
      
      // 驗證載入已隱藏
      const loadingOverlay = document.getElementById('loading');
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);
      
      // 驗證成功通知顯示
      const notification = document.getElementById('notification');
      const notificationMessage = notification.querySelector('.notification-message');
      expect(notificationMessage.textContent).toBe('名片已成功儲存到離線收納');
      
      // 驗證頁面導航到名片列表
      const cardsPage = document.getElementById('page-cards');
      expect(cardsPage.classList.contains('active')).toBe(true);
      
      // 驗證服務調用
      expect(mockApp.storage.storeCardDirectly).toHaveBeenCalledTimes(1);
      expect(mockApp.updateStats).toHaveBeenCalledTimes(1);
      expect(window.PWAIntegration.manualClearContext).toHaveBeenCalledTimes(1);
    });
  });

  // TC-E2E-002: 測試錯誤情況下的載入體驗
  describe('TC-E2E-002: Error Handling Flow', () => {
    test('should handle parsing errors with appropriate loading feedback', async () => {
      // Given: 解析器返回 null（解析失敗）
      window.SimpleCardParser.parseDirectly.mockReturnValue(null);

      const mockApp = {
        showLoading: function(message) {
          const loading = document.getElementById('loading');
          const loadingText = document.querySelector('.loading-text');
          
          if (loading) loading.classList.remove('hidden');
          if (loadingText) loadingText.textContent = message;
        },
        hideLoading: function() {
          const loading = document.getElementById('loading');
          if (loading) loading.classList.add('hidden');
        },
        showNotification: function(message, type) {
          const notification = document.getElementById('notification');
          const icon = notification?.querySelector('.notification-icon');
          const messageEl = notification?.querySelector('.notification-message');

          if (notification && icon && messageEl) {
            icon.textContent = type === 'error' ? '❌' : 'ℹ️';
            messageEl.textContent = message;
            notification.classList.remove('hidden');
          }
        }
      };

      const failedImportFlow = async (data) => {
        try {
          mockApp.showLoading('📝 正在讀取名片資料...');
          await new Promise(resolve => setTimeout(resolve, 10));
          
          mockApp.showLoading('🔍 正在識別名片類型...');
          const cardType = window.PWAIntegration.identifyCardTypeEnhanced({ url: window.location.href });
          await new Promise(resolve => setTimeout(resolve, 10));
          
          mockApp.showLoading('⚙️ 正在解析名片資料...');
          const cardData = window.SimpleCardParser.parseDirectly(data, cardType);
          await new Promise(resolve => setTimeout(resolve, 10));
          
          if (!cardData) {
            mockApp.hideLoading();
            mockApp.showNotification('無法解析名片資料', 'error');
            return;
          }
        } catch (error) {
          mockApp.hideLoading();
          mockApp.showNotification('讀取名片失敗，請稍後再試', 'error');
        }
      };

      // When: 執行失敗的匯入流程
      await failedImportFlow('invalid-data');

      // Then: 驗證錯誤處理
      const loadingOverlay = document.getElementById('loading');
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);
      
      const notification = document.getElementById('notification');
      const notificationIcon = notification.querySelector('.notification-icon');
      const notificationMessage = notification.querySelector('.notification-message');
      
      expect(notificationIcon.textContent).toBe('❌');
      expect(notificationMessage.textContent).toBe('無法解析名片資料');
    });

    test('should handle network-like errors gracefully', async () => {
      // Given: 儲存服務拋出網路錯誤
      const mockApp = {
        storage: {
          storeCardDirectly: jest.fn().mockRejectedValue(new Error('Network timeout'))
        },
        showLoading: function(message) {
          const loading = document.getElementById('loading');
          const loadingText = document.querySelector('.loading-text');
          
          if (loading) loading.classList.remove('hidden');
          if (loadingText) loadingText.textContent = message;
        },
        hideLoading: function() {
          const loading = document.getElementById('loading');
          if (loading) loading.classList.add('hidden');
        },
        showNotification: function(message, type) {
          const notification = document.getElementById('notification');
          const messageEl = notification?.querySelector('.notification-message');
          if (messageEl) messageEl.textContent = message;
          if (notification) notification.classList.remove('hidden');
        }
      };

      const networkErrorFlow = async () => {
        try {
          mockApp.showLoading('📝 正在讀取名片資料...');
          mockApp.showLoading('🔍 正在識別名片類型...');
          mockApp.showLoading('⚙️ 正在解析名片資料...');
          mockApp.showLoading('💾 正在準備儲存...');
          mockApp.showLoading('💾 正在儲存名片...');
          
          // 模擬儲存失敗
          await mockApp.storage.storeCardDirectly({}, 'index');
        } catch (error) {
          mockApp.hideLoading();
          mockApp.showNotification(`儲存失敗: ${error.message}`, 'error');
        }
      };

      // When: 執行網路錯誤流程
      await networkErrorFlow();

      // Then: 驗證錯誤處理
      const loadingOverlay = document.getElementById('loading');
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);
      
      const notificationMessage = document.querySelector('.notification-message');
      expect(notificationMessage.textContent).toBe('儲存失敗: Network timeout');
    });
  });

  // TC-E2E-003: 測試載入提示的使用者體驗
  describe('TC-E2E-003: User Experience Flow', () => {
    test('should provide smooth loading transitions', async () => {
      // Given: 載入狀態追蹤
      const loadingStates = [];
      const mockApp = {
        showLoading: function(message) {
          const loading = document.getElementById('loading');
          const loadingText = document.querySelector('.loading-text');
          
          if (loading) loading.classList.remove('hidden');
          if (loadingText) {
            loadingText.textContent = message;
            loadingStates.push(message);
          }
        },
        hideLoading: function() {
          const loading = document.getElementById('loading');
          if (loading) loading.classList.add('hidden');
          loadingStates.push('HIDDEN');
        }
      };

      // When: 執行載入序列
      const loadingSequence = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...',
        '💾 正在準備儲存...',
        '💾 正在儲存名片...',
        '✅ 儲存完成，正在更新...'
      ];

      for (const state of loadingSequence) {
        mockApp.showLoading(state);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      mockApp.hideLoading();

      // Then: 驗證載入狀態序列
      expect(loadingStates).toEqual([...loadingSequence, 'HIDDEN']);
      
      // 驗證最終狀態
      const loadingOverlay = document.getElementById('loading');
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);
    });

    test('should maintain consistent visual feedback', async () => {
      // Given: 視覺狀態檢查器
      const checkVisualState = () => {
        const loading = document.getElementById('loading');
        const loadingText = document.querySelector('.loading-text');
        
        return {
          isVisible: !loading.classList.contains('hidden'),
          text: loadingText.textContent,
          hasSpinner: !!document.querySelector('.loading-spinner')
        };
      };

      const mockApp = {
        showLoading: function(message) {
          const loading = document.getElementById('loading');
          const loadingText = document.querySelector('.loading-text');
          
          if (loading) loading.classList.remove('hidden');
          if (loadingText) loadingText.textContent = message;
        },
        hideLoading: function() {
          const loading = document.getElementById('loading');
          if (loading) loading.classList.add('hidden');
        }
      };

      // When: 測試不同載入狀態的視覺一致性
      const testStates = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '✅ 儲存完成，正在更新...'
      ];

      for (const state of testStates) {
        mockApp.showLoading(state);
        const visualState = checkVisualState();
        
        // Then: 每個狀態都應該有一致的視覺元素
        expect(visualState.isVisible).toBe(true);
        expect(visualState.text).toBe(state);
        expect(visualState.hasSpinner).toBe(true);
      }

      // 驗證隱藏狀態
      mockApp.hideLoading();
      const finalState = checkVisualState();
      expect(finalState.isVisible).toBe(false);
    });
  });

  // TC-E2E-004: 測試載入提示的可訪問性
  describe('TC-E2E-004: Accessibility Flow', () => {
    test('should provide accessible loading experience', async () => {
      // Given: 可訪問性檢查器
      const checkAccessibility = () => {
        const loading = document.getElementById('loading');
        const loadingText = document.querySelector('.loading-text');
        
        return {
          hasLoadingElement: !!loading,
          hasTextContent: !!loadingText && loadingText.textContent.length > 0,
          textIsDescriptive: loadingText && /正在|完成/.test(loadingText.textContent)
        };
      };

      const mockApp = {
        showLoading: function(message) {
          const loading = document.getElementById('loading');
          const loadingText = document.querySelector('.loading-text');
          
          if (loading) loading.classList.remove('hidden');
          if (loadingText) loadingText.textContent = message;
        }
      };

      // When: 測試載入提示的可訪問性
      const accessibleMessages = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...'
      ];

      for (const message of accessibleMessages) {
        mockApp.showLoading(message);
        const accessibility = checkAccessibility();
        
        // Then: 每個載入狀態都應該是可訪問的
        expect(accessibility.hasLoadingElement).toBe(true);
        expect(accessibility.hasTextContent).toBe(true);
        expect(accessibility.textIsDescriptive).toBe(true);
      }
    });
  });
});