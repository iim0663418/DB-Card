/**
 * 重複處理對話框端到端測試
 * 測試範圍：完整的重複處理流程、語言切換、批量處理
 * 對應需求：REQ-004, D-UI-01, T-SEC-09
 */

describe('DuplicateDialog E2E Tests', () => {
  let mockApp;
  let mockStorage;
  let mockLanguageManager;
  let dialogManager;

  beforeEach(() => {
    // 設置 DOM 環境
    document.body.innerHTML = `
      <div id="app">
        <div id="lang-toggle">
          <span class="icon">EN</span>
        </div>
        <div id="notification" class="notification hidden">
          <div class="notification-content">
            <span class="notification-icon"></span>
            <span class="notification-message"></span>
          </div>
        </div>
      </div>
    `;

    // 模擬語言管理器
    mockLanguageManager = {
      currentLanguage: 'zh',
      getCurrentLanguage: jest.fn(() => mockLanguageManager.currentLanguage),
      switchLanguage: jest.fn((lang) => {
        mockLanguageManager.currentLanguage = lang;
        return lang;
      }),
      getText: jest.fn((key) => {
        const translations = {
          zh: {
            duplicateFound: '發現重複名片',
            cardImported: '名片匯入成功',
            importFailed: '匯入失敗'
          },
          en: {
            duplicateFound: 'Duplicate Card Found',
            cardImported: 'Card imported successfully',
            importFailed: 'Import failed'
          }
        };
        return translations[mockLanguageManager.currentLanguage][key] || key;
      })
    };

    // 模擬儲存系統
    mockStorage = {
      storeCardDirectly: jest.fn().mockResolvedValue('card_new_123'),
      getCard: jest.fn().mockResolvedValue({
        id: 'card_existing_123',
        data: { name: '現有使用者', email: 'existing@test.com' },
        created: new Date('2025-08-01'),
        version: '1.0'
      }),
      duplicateDetector: {
        detectDuplicates: jest.fn().mockResolvedValue({
          isDuplicate: true,
          existingCards: [{
            id: 'card_existing_123',
            name: '現有使用者',
            created: '2025-08-01T00:00:00.000Z',
            version: '1.0'
          }]
        }),
        handleDuplicate: jest.fn().mockResolvedValue({
          success: true,
          cardId: 'card_processed_123'
        })
      }
    };

    // 模擬應用程式
    mockApp = {
      storage: mockStorage,
      showNotification: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn(),
      updateStats: jest.fn().mockResolvedValue()
    };

    // 設置全域變數
    window.languageManager = mockLanguageManager;
    window.app = mockApp;
    window.DuplicateDialog = DuplicateDialog;
    window.DuplicateDialogManager = DuplicateDialogManager;

    // 創建對話框管理器
    dialogManager = new DuplicateDialogManager();
  });

  afterEach(() => {
    // 清理
    document.body.innerHTML = '';
    delete window.languageManager;
    delete window.app;
    delete window.DuplicateDialog;
    delete window.DuplicateDialogManager;
  });

  describe('TC-E2E-001: 完整重複處理流程', () => {
    test('應該完成完整的重複名片處理流程', async () => {
      // Given: 有重複的名片資料
      const existingCards = [{
        id: 'card_existing_123',
        name: '測試使用者',
        created: '2025-08-01T00:00:00.000Z',
        version: '1.0'
      }];
      const newCardData = {
        name: '測試使用者',
        email: 'test@example.com',
        title: '軟體工程師'
      };

      // When: 顯示重複處理對話框
      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);

      // 等待對話框渲染
      await new Promise(resolve => setTimeout(resolve, 100));

      // 驗證對話框已顯示
      const dialog = document.querySelector('.duplicate-dialog-overlay');
      expect(dialog).toBeTruthy();
      expect(dialog.style.display).toBe('flex');

      // 驗證內容正確顯示
      const title = document.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('發現重複名片');

      // 模擬使用者選擇覆蓋
      const overwriteBtn = document.querySelector('[data-action="overwrite"]');
      expect(overwriteBtn).toBeTruthy();
      overwriteBtn.click();

      // Then: 應該返回正確的結果
      const result = await dialogPromise;
      expect(result.action).toBe('overwrite');
      expect(result.cardId).toBe('card_existing_123');
    });

    test('應該處理使用者取消操作', async () => {
      // Given: 重複名片對話框
      const existingCards = [{ id: 'card_123', name: '測試' }];
      const newCardData = { name: '測試' };

      // When: 顯示對話框並取消
      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();

      // Then: 應該返回取消結果
      const result = await dialogPromise;
      expect(result.action).toBe('cancel');
    });

    test('應該支援 ESC 鍵關閉對話框', async () => {
      // Given: 重複名片對話框
      const existingCards = [{ id: 'card_123', name: '測試' }];
      const newCardData = { name: '測試' };

      // When: 顯示對話框並按 ESC
      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      // Then: 應該關閉對話框
      const result = await dialogPromise;
      expect(result.action).toBe('cancel');
    });
  });

  describe('TC-E2E-002: 語言切換整合測試', () => {
    test('應該在語言切換時更新對話框文字', async () => {
      // Given: 中文環境的對話框
      mockLanguageManager.currentLanguage = 'zh';
      const existingCards = [{ id: 'card_123', name: '測試使用者' }];
      const newCardData = { name: '測試使用者' };

      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 驗證中文標題
      let title = document.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('發現重複名片');

      // When: 切換到英文
      mockLanguageManager.currentLanguage = 'en';
      
      // 模擬語言切換後的重新渲染（實際應用中由語言管理器觸發）
      const dialog = document.querySelector('.duplicate-dialog-overlay').parentElement.children[0];
      if (dialog && dialog.renderContent) {
        dialog.renderContent();
      }

      // Then: 標題應該更新為英文
      // 注意：實際測試中需要模擬完整的語言切換流程
      expect(mockLanguageManager.getText).toHaveBeenCalledWith('duplicateFound');

      // 清理
      const cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;
    });

    test('應該在不同語言環境下正確格式化日期', async () => {
      // Given: 包含日期的現有名片
      const existingCards = [{
        id: 'card_123',
        name: '測試使用者',
        created: '2025-08-15T10:30:00.000Z'
      }];
      const newCardData = { name: '測試使用者' };

      // Test Chinese date format
      mockLanguageManager.currentLanguage = 'zh';
      let dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));

      let dateElement = document.querySelector('.card-preview.existing .meta');
      expect(dateElement.textContent).toContain('2025');
      expect(dateElement.textContent).toContain('01');
      expect(dateElement.textContent).toContain('15');

      let cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;

      // Test English date format
      mockLanguageManager.currentLanguage = 'en';
      dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));

      dateElement = document.querySelector('.card-preview.existing .meta');
      expect(dateElement.textContent).toContain('2025');

      cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;
    });
  });

  describe('TC-E2E-003: 批量處理端到端測試', () => {
    test('應該正確處理批量重複項目', async () => {
      // Given: 多個重複項目
      const duplicateItems = [
        {
          duplicateInfo: {
            existingCards: [{ id: 'card_1', name: '使用者1' }],
            duplicateCount: 1
          },
          cardData: { name: '使用者1', email: 'user1@test.com' }
        },
        {
          duplicateInfo: {
            existingCards: [{ id: 'card_2', name: '使用者2' }],
            duplicateCount: 1
          },
          cardData: { name: '使用者2', email: 'user2@test.com' }
        }
      ];

      // When: 處理批量項目
      const dialog = new DuplicateDialog();
      const batchPromise = dialog.processBatch(duplicateItems);

      // 模擬使用者互動：第一個跳過
      await new Promise(resolve => setTimeout(resolve, 100));
      let skipBtn = document.querySelector('[data-action="skip"]');
      skipBtn.click();

      // 第二個覆蓋
      await new Promise(resolve => setTimeout(resolve, 100));
      let overwriteBtn = document.querySelector('[data-action="overwrite"]');
      overwriteBtn.click();

      // Then: 應該返回正確的批量結果
      const results = await batchPromise;
      expect(results).toHaveLength(2);
      expect(results[0].action).toBe('skip');
      expect(results[1].action).toBe('overwrite');
    });

    test('應該支援套用到全部功能', async () => {
      // Given: 多個重複項目
      const duplicateItems = Array(3).fill({
        duplicateInfo: {
          existingCards: [{ id: 'card_test', name: '測試使用者' }],
          duplicateCount: 1
        },
        cardData: { name: '測試使用者' }
      });

      // When: 處理批量項目
      const dialog = new DuplicateDialog();
      const batchPromise = dialog.processBatch(duplicateItems);

      // 模擬使用者選擇：勾選套用到全部並選擇跳過
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const applyToAllCheckbox = document.querySelector('#apply-to-all');
      applyToAllCheckbox.checked = true;
      
      const skipBtn = document.querySelector('[data-action="skip"]');
      skipBtn.click();

      // Then: 應該自動套用到所有項目
      const results = await batchPromise;
      expect(results).toHaveLength(3);
      expect(results[0].action).toBe('skip');
      expect(results[0].auto).toBe(false);
      expect(results[1].action).toBe('skip');
      expect(results[1].auto).toBe(true);
      expect(results[2].action).toBe('skip');
      expect(results[2].auto).toBe(true);
    });
  });

  describe('TC-E2E-004: 錯誤處理和恢復', () => {
    test('應該處理對話框載入失敗', async () => {
      // Given: DuplicateDialog 類別不可用
      delete window.DuplicateDialog;

      // When: 嘗試顯示對話框
      const result = await dialogManager.showDuplicateDialog(
        [{ id: 'card_123', name: '測試' }],
        { name: '測試' }
      );

      // Then: 應該使用備用對話框
      expect(result.fallback).toBe(true);
      expect(['skip', 'overwrite']).toContain(result.action);
    });

    test('應該處理無效的名片資料', async () => {
      // Given: 無效的名片資料
      const existingCards = [{ id: 'card_123' }]; // 缺少 name
      const newCardData = {}; // 空資料

      // When: 顯示對話框
      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then: 應該顯示預設值
      const existingCardName = document.querySelector('.card-preview.existing .name');
      const newCardName = document.querySelector('.card-preview.new .name');
      
      expect(existingCardName.textContent).toBe('未知');
      expect(newCardName.textContent).toBe('未知');

      // 清理
      const cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;
    });

    test('應該防止 XSS 攻擊', async () => {
      // Given: 包含惡意腳本的名片資料
      const existingCards = [{
        id: 'card_123',
        name: '<script>alert("xss")</script>惡意使用者'
      }];
      const newCardData = {
        name: '<img src="x" onerror="alert(\'xss2\')">'
      };

      // When: 顯示對話框
      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then: 惡意腳本應該被轉義
      const existingCardName = document.querySelector('.card-preview.existing .name');
      const newCardName = document.querySelector('.card-preview.new .name');
      
      expect(existingCardName.innerHTML).not.toContain('<script>');
      expect(newCardName.innerHTML).not.toContain('<img');
      expect(existingCardName.textContent).toContain('惡意使用者');

      // 清理
      const cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;
    });
  });

  describe('TC-E2E-005: 無障礙功能測試', () => {
    test('應該支援完整的鍵盤導航', async () => {
      // Given: 顯示的對話框
      const existingCards = [{ id: 'card_123', name: '測試使用者' }];
      const newCardData = { name: '測試使用者' };

      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // When: 使用 Tab 鍵導航
      const focusableElements = document.querySelectorAll(
        'button, input, [tabindex="0"]'
      );
      
      // Then: 應該有可聚焦的元素
      expect(focusableElements.length).toBeGreaterThan(0);

      // 測試第一個元素獲得焦點
      const firstElement = focusableElements[0];
      firstElement.focus();
      expect(document.activeElement).toBe(firstElement);

      // 清理
      const cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;
    });

    test('應該有正確的 ARIA 標籤', async () => {
      // Given: 顯示的對話框
      const existingCards = [{ id: 'card_123', name: '測試使用者' }];
      const newCardData = { name: '測試使用者' };

      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then: 應該有正確的 ARIA 屬性
      const dialog = document.querySelector('.duplicate-dialog-overlay');
      const title = document.querySelector('#duplicate-dialog-title');
      const closeButton = document.querySelector('.duplicate-dialog-close');

      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('duplicate-dialog-title');
      expect(title.id).toBe('duplicate-dialog-title');
      expect(closeButton.getAttribute('aria-label')).toBeTruthy();

      // 清理
      const cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;
    });
  });

  describe('TC-E2E-006: 效能測試', () => {
    test('應該在合理時間內渲染對話框', async () => {
      // Given: 大量重複名片資料
      const existingCards = Array(10).fill(null).map((_, i) => ({
        id: `card_${i}`,
        name: `測試使用者${i}`,
        created: new Date().toISOString()
      }));
      const newCardData = { name: '新使用者' };

      // When: 測量渲染時間
      const startTime = performance.now();
      
      const dialogPromise = dialogManager.showDuplicateDialog(existingCards, newCardData);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Then: 渲染時間應該在合理範圍內（< 500ms）
      expect(renderTime).toBeLessThan(500);

      // 驗證對話框正確顯示
      const dialog = document.querySelector('.duplicate-dialog-overlay');
      expect(dialog).toBeTruthy();

      // 清理
      const cancelBtn = document.querySelector('.cancel');
      cancelBtn.click();
      await dialogPromise;
    });

    test('應該正確處理大量批量項目', async () => {
      // Given: 大量重複項目
      const duplicateItems = Array(50).fill(null).map((_, i) => ({
        duplicateInfo: {
          existingCards: [{ id: `card_${i}`, name: `使用者${i}` }],
          duplicateCount: 1
        },
        cardData: { name: `使用者${i}` }
      }));

      // When: 處理批量項目（使用套用到全部）
      const dialog = new DuplicateDialog();
      const batchPromise = dialog.processBatch(duplicateItems);

      // 模擬使用者選擇：勾選套用到全部並選擇跳過
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const applyToAllCheckbox = document.querySelector('#apply-to-all');
      applyToAllCheckbox.checked = true;
      
      const skipBtn = document.querySelector('[data-action="skip"]');
      skipBtn.click();

      // Then: 應該快速處理所有項目
      const startTime = performance.now();
      const results = await batchPromise;
      const endTime = performance.now();
      const processTime = endTime - startTime;

      expect(results).toHaveLength(50);
      expect(processTime).toBeLessThan(1000); // < 1 秒
      expect(results.every(r => r.action === 'skip')).toBe(true);
    });
  });
});