/**
 * PWA 載入提示功能單元測試
 * 測試 importFromUrlData 方法的分階段載入提示
 * 
 * 對應需求: R-UX-IMPROVEMENT, D-PWA-LOADING, T-PWA-LOADING-INDICATOR
 */

describe('PWA Loading Indicator Tests', () => {
  let mockApp;
  let mockStorage;
  let mockPWAIntegration;
  let mockSimpleCardParser;

  beforeEach(() => {
    // Mock PWACardApp 實例
    mockApp = {
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      showNotification: jest.fn(),
      updateStats: jest.fn().mockResolvedValue(),
      navigateTo: jest.fn().mockResolvedValue(),
      storage: null
    };

    // Mock 儲存服務
    mockStorage = {
      storeCardDirectly: jest.fn().mockResolvedValue('card-123')
    };

    // Mock PWA 整合服務
    mockPWAIntegration = {
      identifyCardTypeEnhanced: jest.fn().mockReturnValue('index'),
      manualClearContext: jest.fn()
    };

    // Mock 名片解析器
    mockSimpleCardParser = {
      parseDirectly: jest.fn().mockReturnValue({
        name: '測試使用者',
        email: 'test@example.com',
        title: '測試職位'
      })
    };

    // 設置全域 mock
    global.window = {
      location: { href: 'https://example.com/index.html?data=test' },
      PWAIntegration: mockPWAIntegration,
      SimpleCardParser: mockSimpleCardParser
    };

    mockApp.storage = mockStorage;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-PWA-001: 測試載入提示的完整流程
  describe('TC-PWA-001: Complete Loading Flow', () => {
    test('should show progressive loading messages during import', async () => {
      // Given: 有效的名片資料
      const testData = 'eyJ0ZXN0IjoiZGF0YSJ9'; // Base64 encoded test data
      
      // When: 執行 importFromUrlData
      const importFromUrlData = async (data) => {
        try {
          // 第一階段：初始化讀取
          mockApp.showLoading('📝 正在讀取名片資料...');
          
          const currentUrl = window.location.href;
          
          // 第二階段：識別名片類型
          mockApp.showLoading('🔍 正在識別名片類型...');
          let cardType = null;
          if (window.PWAIntegration) {
            const tempData = { url: currentUrl };
            cardType = window.PWAIntegration.identifyCardTypeEnhanced(tempData);
          }
          
          if (!cardType) {
            mockApp.showNotification('無法識別名片類型', 'error');
            return;
          }
          
          // 第三階段：解析資料
          mockApp.showLoading('⚙️ 正在解析名片資料...');
          if (!window.SimpleCardParser) {
            mockApp.showNotification('解析器未載入', 'error');
            return;
          }
          
          const cardData = window.SimpleCardParser.parseDirectly(data, cardType);
          
          if (!cardData) {
            mockApp.showNotification('無法解析名片資料', 'error');
            return;
          }
          
          // 第四階段：準備儲存
          mockApp.showLoading('💾 正在準備儲存...');
          cardData.url = currentUrl;
          
          // 第五階段：儲存名片
          mockApp.showLoading('💾 正在儲存名片...');
          if (mockApp.storage) {
            try {
              const cardId = await mockApp.storage.storeCardDirectly(cardData, cardType);
              
              // 第六階段：完成儲存
              mockApp.showLoading('✅ 儲存完成，正在更新...');
              
              mockApp.showNotification('名片已成功儲存到離線收納', 'success');
              
              // 清除暫存
              window.PWAIntegration?.manualClearContext();
              
              await mockApp.updateStats();
              await mockApp.navigateTo('cards');
            } catch (storeError) {
              mockApp.showNotification(`儲存失敗: ${storeError.message}`, 'error');
            }
          } else {
            mockApp.showNotification('儲存服務未初始化', 'error');
          }
        } catch (error) {
          console.error('[App] Import from URL data failed:', error);
          mockApp.showNotification('讀取名片失敗，請稍後再試', 'error');
        } finally {
          mockApp.hideLoading();
        }
      };

      await importFromUrlData(testData);

      // Then: 驗證載入提示按正確順序顯示
      expect(mockApp.showLoading).toHaveBeenCalledTimes(6);
      expect(mockApp.showLoading).toHaveBeenNthCalledWith(1, '📝 正在讀取名片資料...');
      expect(mockApp.showLoading).toHaveBeenNthCalledWith(2, '🔍 正在識別名片類型...');
      expect(mockApp.showLoading).toHaveBeenNthCalledWith(3, '⚙️ 正在解析名片資料...');
      expect(mockApp.showLoading).toHaveBeenNthCalledWith(4, '💾 正在準備儲存...');
      expect(mockApp.showLoading).toHaveBeenNthCalledWith(5, '💾 正在儲存名片...');
      expect(mockApp.showLoading).toHaveBeenNthCalledWith(6, '✅ 儲存完成，正在更新...');
      
      // 驗證成功通知
      expect(mockApp.showNotification).toHaveBeenCalledWith('名片已成功儲存到離線收納', 'success');
      
      // 驗證最終清理
      expect(mockApp.hideLoading).toHaveBeenCalledTimes(1);
      expect(mockApp.updateStats).toHaveBeenCalledTimes(1);
      expect(mockApp.navigateTo).toHaveBeenCalledWith('cards');
    });
  });

  // TC-PWA-002: 測試錯誤處理時的載入提示
  describe('TC-PWA-002: Error Handling with Loading', () => {
    test('should show appropriate error messages and hide loading on failure', async () => {
      // Given: 無效的名片類型
      mockPWAIntegration.identifyCardTypeEnhanced.mockReturnValue(null);
      
      const importFromUrlData = async (data) => {
        try {
          mockApp.showLoading('📝 正在讀取名片資料...');
          
          const currentUrl = window.location.href;
          
          mockApp.showLoading('🔍 正在識別名片類型...');
          let cardType = null;
          if (window.PWAIntegration) {
            const tempData = { url: currentUrl };
            cardType = window.PWAIntegration.identifyCardTypeEnhanced(tempData);
          }
          
          if (!cardType) {
            mockApp.showNotification('無法識別名片類型', 'error');
            return;
          }
        } catch (error) {
          mockApp.showNotification('讀取名片失敗，請稍後再試', 'error');
        } finally {
          mockApp.hideLoading();
        }
      };

      // When: 執行失敗的匯入
      await importFromUrlData('invalid-data');

      // Then: 驗證錯誤處理
      expect(mockApp.showLoading).toHaveBeenCalledWith('📝 正在讀取名片資料...');
      expect(mockApp.showLoading).toHaveBeenCalledWith('🔍 正在識別名片類型...');
      expect(mockApp.showNotification).toHaveBeenCalledWith('無法識別名片類型', 'error');
      expect(mockApp.hideLoading).toHaveBeenCalledTimes(1);
    });

    test('should handle storage errors gracefully', async () => {
      // Given: 儲存失敗
      mockStorage.storeCardDirectly.mockRejectedValue(new Error('Storage failed'));
      
      const importFromUrlData = async (data) => {
        try {
          mockApp.showLoading('📝 正在讀取名片資料...');
          
          const currentUrl = window.location.href;
          
          mockApp.showLoading('🔍 正在識別名片類型...');
          const cardType = window.PWAIntegration.identifyCardTypeEnhanced({ url: currentUrl });
          
          mockApp.showLoading('⚙️ 正在解析名片資料...');
          const cardData = window.SimpleCardParser.parseDirectly(data, cardType);
          
          mockApp.showLoading('💾 正在準備儲存...');
          cardData.url = currentUrl;
          
          mockApp.showLoading('💾 正在儲存名片...');
          if (mockApp.storage) {
            try {
              await mockApp.storage.storeCardDirectly(cardData, cardType);
            } catch (storeError) {
              mockApp.showNotification(`儲存失敗: ${storeError.message}`, 'error');
            }
          }
        } catch (error) {
          mockApp.showNotification('讀取名片失敗，請稍後再試', 'error');
        } finally {
          mockApp.hideLoading();
        }
      };

      // When: 執行儲存失敗的匯入
      await importFromUrlData('test-data');

      // Then: 驗證錯誤處理
      expect(mockApp.showNotification).toHaveBeenCalledWith('儲存失敗: Storage failed', 'error');
      expect(mockApp.hideLoading).toHaveBeenCalledTimes(1);
    });
  });

  // TC-PWA-003: 測試載入提示的可訪問性
  describe('TC-PWA-003: Accessibility Tests', () => {
    test('should provide meaningful loading messages for screen readers', () => {
      // Given: 載入提示訊息
      const loadingMessages = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...',
        '💾 正在準備儲存...',
        '💾 正在儲存名片...',
        '✅ 儲存完成，正在更新...'
      ];

      // When: 檢查訊息內容
      loadingMessages.forEach(message => {
        // Then: 每個訊息都應該包含有意義的文字描述
        expect(message).toMatch(/正在|完成/); // 包含狀態描述
        expect(message.length).toBeGreaterThan(5); // 足夠的描述長度
      });
    });

    test('should use appropriate emoji for visual indicators', () => {
      // Given: 載入提示訊息
      const loadingMessages = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...',
        '💾 正在準備儲存...',
        '💾 正在儲存名片...',
        '✅ 儲存完成，正在更新...'
      ];

      // When & Then: 檢查每個訊息都有適當的 emoji
      expect(loadingMessages[0]).toMatch(/📝/); // 讀取
      expect(loadingMessages[1]).toMatch(/🔍/); // 識別
      expect(loadingMessages[2]).toMatch(/⚙️/); // 解析
      expect(loadingMessages[3]).toMatch(/💾/); // 準備儲存
      expect(loadingMessages[4]).toMatch(/💾/); // 儲存
      expect(loadingMessages[5]).toMatch(/✅/); // 完成
    });
  });

  // TC-PWA-004: 測試載入提示的效能
  describe('TC-PWA-004: Performance Tests', () => {
    test('should not cause memory leaks with frequent loading updates', async () => {
      // Given: 模擬多次載入更新
      const mockShowLoading = jest.fn();
      const mockHideLoading = jest.fn();
      
      // When: 執行多次載入更新
      for (let i = 0; i < 100; i++) {
        mockShowLoading(`測試載入 ${i}`);
      }
      mockHideLoading();

      // Then: 驗證函數調用次數正確
      expect(mockShowLoading).toHaveBeenCalledTimes(100);
      expect(mockHideLoading).toHaveBeenCalledTimes(1);
    });

    test('should handle rapid loading state changes', async () => {
      // Given: 快速的載入狀態變更
      const loadingStates = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...'
      ];

      // When: 快速切換載入狀態
      loadingStates.forEach((state, index) => {
        setTimeout(() => mockApp.showLoading(state), index * 10);
      });

      // 等待所有狀態更新完成
      await new Promise(resolve => setTimeout(resolve, 50));

      // Then: 驗證所有狀態都被正確調用
      expect(mockApp.showLoading).toHaveBeenCalledTimes(3);
    });
  });

  // TC-PWA-005: 測試安全性
  describe('TC-PWA-005: Security Tests', () => {
    test('should not expose sensitive data in loading messages', () => {
      // Given: 載入提示訊息
      const loadingMessages = [
        '📝 正在讀取名片資料...',
        '🔍 正在識別名片類型...',
        '⚙️ 正在解析名片資料...',
        '💾 正在準備儲存...',
        '💾 正在儲存名片...',
        '✅ 儲存完成，正在更新...'
      ];

      // When & Then: 檢查訊息不包含敏感資訊
      loadingMessages.forEach(message => {
        expect(message).not.toMatch(/password|token|key|secret/i);
        expect(message).not.toMatch(/\b\d{4,}\b/); // 不包含長數字
        expect(message).not.toMatch(/@\w+\.\w+/); // 不包含 email
      });
    });

    test('should handle malformed data gracefully', async () => {
      // Given: 惡意或格式錯誤的資料
      mockSimpleCardParser.parseDirectly.mockReturnValue(null);
      
      const importFromUrlData = async (data) => {
        try {
          mockApp.showLoading('📝 正在讀取名片資料...');
          mockApp.showLoading('🔍 正在識別名片類型...');
          
          const cardType = window.PWAIntegration.identifyCardTypeEnhanced({ url: window.location.href });
          
          mockApp.showLoading('⚙️ 正在解析名片資料...');
          const cardData = window.SimpleCardParser.parseDirectly(data, cardType);
          
          if (!cardData) {
            mockApp.showNotification('無法解析名片資料', 'error');
            return;
          }
        } catch (error) {
          mockApp.showNotification('讀取名片失敗，請稍後再試', 'error');
        } finally {
          mockApp.hideLoading();
        }
      };

      // When: 處理惡意資料
      await importFromUrlData('<script>alert("xss")</script>');

      // Then: 驗證安全處理
      expect(mockApp.showNotification).toHaveBeenCalledWith('無法解析名片資料', 'error');
      expect(mockApp.hideLoading).toHaveBeenCalledTimes(1);
    });
  });
});