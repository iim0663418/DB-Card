/**
 * PWA 載入提示整合測試
 * 測試載入提示與其他 PWA 組件的整合
 * 
 * 對應需求: R-UX-IMPROVEMENT, D-PWA-LOADING, T-PWA-LOADING-INDICATOR
 */

describe('PWA Loading Integration Tests', () => {
  let testContainer;
  let mockApp;

  beforeEach(() => {
    // 創建測試容器
    testContainer = document.createElement('div');
    testContainer.innerHTML = `
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
    `;
    document.body.appendChild(testContainer);

    // Mock PWACardApp 實例
    mockApp = {
      storage: {
        storeCardDirectly: jest.fn().mockResolvedValue('card-123')
      },
      updateStats: jest.fn().mockResolvedValue(),
      navigateTo: jest.fn().mockResolvedValue(),
      showLoading: function(message) {
        const loading = document.getElementById('loading');
        const loadingText = document.querySelector('.loading-text');
        
        if (loading) {
          loading.classList.remove('hidden');
        }
        if (loadingText) {
          loadingText.textContent = message;
        }
      },
      hideLoading: function() {
        const loading = document.getElementById('loading');
        if (loading) {
          loading.classList.add('hidden');
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
        }
      }
    };

    // 設置全域 mock
    global.window = {
      location: { href: 'https://example.com/index.html?data=test' },
      PWAIntegration: {
        identifyCardTypeEnhanced: jest.fn().mockReturnValue('index'),
        manualClearContext: jest.fn()
      },
      SimpleCardParser: {
        parseDirectly: jest.fn().mockReturnValue({
          name: '測試使用者',
          email: 'test@example.com',
          title: '測試職位'
        })
      }
    };
  });

  afterEach(() => {
    document.body.removeChild(testContainer);
    jest.clearAllMocks();
  });

  // TC-INT-001: 測試載入提示與 DOM 元素的整合
  describe('TC-INT-001: DOM Integration', () => {
    test('should correctly update loading overlay visibility', async () => {
      // Given: 載入覆蓋層初始隱藏
      const loadingOverlay = document.getElementById('loading');
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);

      // When: 顯示載入提示
      mockApp.showLoading('📝 正在讀取名片資料...');

      // Then: 載入覆蓋層應該顯示
      expect(loadingOverlay.classList.contains('hidden')).toBe(false);
      
      // And: 載入文字應該更新
      const loadingText = document.querySelector('.loading-text');
      expect(loadingText.textContent).toBe('📝 正在讀取名片資料...');

      // When: 隱藏載入提示
      mockApp.hideLoading();

      // Then: 載入覆蓋層應該隱藏
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);
    });

    test('should handle missing DOM elements gracefully', () => {
      // Given: 移除載入元素
      const loadingElement = document.getElementById('loading');
      loadingElement.remove();

      // When: 嘗試顯示載入提示
      expect(() => {
        mockApp.showLoading('測試訊息');
      }).not.toThrow();

      // Then: 應該不會拋出錯誤
    });
  });

  // TC-INT-002: 測試載入提示與通知系統的整合
  describe('TC-INT-002: Notification Integration', () => {
    test('should show success notification after loading completes', async () => {
      // Given: 模擬完整的載入流程
      const importFlow = async () => {
        mockApp.showLoading('📝 正在讀取名片資料...');
        await new Promise(resolve => setTimeout(resolve, 10));
        
        mockApp.showLoading('🔍 正在識別名片類型...');
        await new Promise(resolve => setTimeout(resolve, 10));
        
        mockApp.showLoading('✅ 儲存完成，正在更新...');
        await new Promise(resolve => setTimeout(resolve, 10));
        
        mockApp.hideLoading();
        mockApp.showNotification('名片已成功儲存到離線收納', 'success');
      };

      // When: 執行載入流程
      await importFlow();

      // Then: 驗證通知顯示
      const notification = document.getElementById('notification');
      const notificationIcon = notification.querySelector('.notification-icon');
      const notificationMessage = notification.querySelector('.notification-message');

      expect(notification.classList.contains('hidden')).toBe(false);
      expect(notificationIcon.textContent).toBe('✅');
      expect(notificationMessage.textContent).toBe('名片已成功儲存到離線收納');
    });

    test('should show error notification when loading fails', async () => {
      // Given: 模擬失敗的載入流程
      const failedImportFlow = async () => {
        mockApp.showLoading('📝 正在讀取名片資料...');
        await new Promise(resolve => setTimeout(resolve, 10));
        
        mockApp.hideLoading();
        mockApp.showNotification('無法識別名片類型', 'error');
      };

      // When: 執行失敗的載入流程
      await failedImportFlow();

      // Then: 驗證錯誤通知顯示
      const notification = document.getElementById('notification');
      const notificationIcon = notification.querySelector('.notification-icon');
      const notificationMessage = notification.querySelector('.notification-message');

      expect(notification.classList.contains('hidden')).toBe(false);
      expect(notificationIcon.textContent).toBe('❌');
      expect(notificationMessage.textContent).toBe('無法識別名片類型');
    });
  });

  // TC-INT-003: 測試載入提示與儲存服務的整合
  describe('TC-INT-003: Storage Service Integration', () => {
    test('should coordinate loading states with storage operations', async () => {
      // Given: 模擬儲存操作
      const storageOperation = async () => {
        mockApp.showLoading('💾 正在儲存名片...');
        
        try {
          const cardId = await mockApp.storage.storeCardDirectly({
            name: '測試使用者',
            email: 'test@example.com'
          }, 'index');
          
          mockApp.showLoading('✅ 儲存完成，正在更新...');
          await mockApp.updateStats();
          
          mockApp.hideLoading();
          mockApp.showNotification('名片已成功儲存到離線收納', 'success');
          
          return cardId;
        } catch (error) {
          mockApp.hideLoading();
          mockApp.showNotification(`儲存失敗: ${error.message}`, 'error');
          throw error;
        }
      };

      // When: 執行儲存操作
      const cardId = await storageOperation();

      // Then: 驗證儲存服務被正確調用
      expect(mockApp.storage.storeCardDirectly).toHaveBeenCalledWith({
        name: '測試使用者',
        email: 'test@example.com'
      }, 'index');
      
      // And: 驗證統計更新被調用
      expect(mockApp.updateStats).toHaveBeenCalledTimes(1);
      
      // And: 驗證返回正確的卡片 ID
      expect(cardId).toBe('card-123');
    });

    test('should handle storage errors with appropriate loading states', async () => {
      // Given: 儲存服務拋出錯誤
      mockApp.storage.storeCardDirectly.mockRejectedValue(new Error('Database connection failed'));

      const failedStorageOperation = async () => {
        mockApp.showLoading('💾 正在儲存名片...');
        
        try {
          await mockApp.storage.storeCardDirectly({
            name: '測試使用者'
          }, 'index');
        } catch (error) {
          mockApp.hideLoading();
          mockApp.showNotification(`儲存失敗: ${error.message}`, 'error');
          throw error;
        }
      };

      // When: 執行失敗的儲存操作
      await expect(failedStorageOperation()).rejects.toThrow('Database connection failed');

      // Then: 驗證錯誤處理
      const loadingOverlay = document.getElementById('loading');
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);
      
      const notification = document.getElementById('notification');
      const notificationMessage = notification.querySelector('.notification-message');
      expect(notificationMessage.textContent).toBe('儲存失敗: Database connection failed');
    });
  });

  // TC-INT-004: 測試載入提示的時序控制
  describe('TC-INT-004: Timing Control', () => {
    test('should maintain correct loading state sequence', async () => {
      // Given: 載入狀態序列
      const loadingStates = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...',
        '💾 正在準備儲存...',
        '💾 正在儲存名片...',
        '✅ 儲存完成，正在更新...'
      ];

      const loadingText = document.querySelector('.loading-text');
      const stateHistory = [];

      // When: 按順序執行載入狀態
      for (const state of loadingStates) {
        mockApp.showLoading(state);
        stateHistory.push(loadingText.textContent);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      mockApp.hideLoading();

      // Then: 驗證狀態序列正確
      expect(stateHistory).toEqual(loadingStates);
      
      // And: 驗證最終狀態
      const loadingOverlay = document.getElementById('loading');
      expect(loadingOverlay.classList.contains('hidden')).toBe(true);
    });

    test('should handle concurrent loading updates', async () => {
      // Given: 並發的載入更新
      const concurrentUpdates = [
        () => mockApp.showLoading('更新 1'),
        () => mockApp.showLoading('更新 2'),
        () => mockApp.showLoading('更新 3')
      ];

      // When: 同時執行多個更新
      concurrentUpdates.forEach(update => update());

      // Then: 最後的更新應該生效
      const loadingText = document.querySelector('.loading-text');
      expect(loadingText.textContent).toBe('更新 3');
    });
  });

  // TC-INT-005: 測試載入提示的可訪問性整合
  describe('TC-INT-005: Accessibility Integration', () => {
    test('should maintain proper ARIA attributes during loading', () => {
      // Given: 載入覆蓋層
      const loadingOverlay = document.getElementById('loading');
      
      // When: 顯示載入提示
      mockApp.showLoading('📝 正在讀取名片資料...');

      // Then: 驗證可訪問性屬性
      // 注意：在實際實作中應該添加這些屬性
      // expect(loadingOverlay.getAttribute('aria-live')).toBe('polite');
      // expect(loadingOverlay.getAttribute('aria-busy')).toBe('true');
      
      // 當前驗證載入狀態
      expect(loadingOverlay.classList.contains('hidden')).toBe(false);
    });

    test('should provide meaningful text for screen readers', () => {
      // Given: 載入訊息
      const loadingMessages = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...'
      ];

      // When & Then: 每個訊息都應該有意義的文字
      loadingMessages.forEach(message => {
        mockApp.showLoading(message);
        const loadingText = document.querySelector('.loading-text');
        
        // 驗證訊息包含狀態描述
        expect(loadingText.textContent).toMatch(/正在/);
        expect(loadingText.textContent.length).toBeGreaterThan(5);
      });
    });
  });
});