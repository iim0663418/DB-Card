/**
 * 重複處理對話框雙語支援測試套件
 * 測試範圍：UI-01 重複處理對話框的雙語功能
 */

describe('DuplicateDialog 雙語支援測試', () => {
  let duplicateDialog;
  let mockLanguageManager;
  let mockDuplicateInfo;
  let mockCardData;

  beforeEach(() => {
    // 設置 DOM 環境
    document.body.innerHTML = '';
    
    // 模擬語言管理器
    mockLanguageManager = {
      getCurrentLanguage: jest.fn(() => 'zh'),
      getText: jest.fn((key) => {
        const translations = {
          zh: {
            duplicateFound: '發現重複名片',
            duplicateDetected: '檢測到',
            similarCards: '張相似名片',
            batchProcessing: '批量處理模式',
            existingCard: '現有名片',
            newCard: '新名片',
            createdTime: '建立時間',
            version: '版本',
            aboutToImport: '即將匯入',
            skip: '跳過',
            skipDesc: '保留現有名片，不匯入新名片',
            overwrite: '覆蓋',
            overwriteDesc: '用新名片資料覆蓋現有名片',
            createVersion: '新版本',
            createVersionDesc: '建立新版本，保留兩張名片',
            applyToAll: '將此選擇套用到所有重複項目',
            applyToAllBtn: '套用到全部',
            cancel: '取消',
            closeDialog: '關閉對話框',
            unknown: '未知',
            selectAction: '請先選擇一個處理方式'
          },
          en: {
            duplicateFound: 'Duplicate Card Found',
            duplicateDetected: 'Detected',
            similarCards: 'similar cards',
            batchProcessing: 'Batch Processing Mode',
            existingCard: 'Existing Card',
            newCard: 'New Card',
            createdTime: 'Created Time',
            version: 'Version',
            aboutToImport: 'About to Import',
            skip: 'Skip',
            skipDesc: 'Keep existing card, do not import new card',
            overwrite: 'Overwrite',
            overwriteDesc: 'Replace existing card with new card data',
            createVersion: 'New Version',
            createVersionDesc: 'Create new version, keep both cards',
            applyToAll: 'Apply this choice to all duplicate items',
            applyToAllBtn: 'Apply to All',
            cancel: 'Cancel',
            closeDialog: 'Close Dialog',
            unknown: 'Unknown',
            selectAction: 'Please select an action first'
          }
        };
        const currentLang = mockLanguageManager.getCurrentLanguage();
        return translations[currentLang]?.[key] || key;
      })
    };

    window.languageManager = mockLanguageManager;

    // 模擬測試資料
    mockDuplicateInfo = {
      duplicateCount: 1,
      existingCards: [{
        id: 'card-123',
        name: '張三',
        created: '2024-01-01T10:00:00Z',
        version: '1.0'
      }]
    };

    mockCardData = {
      name: '張三',
      title: '軟體工程師',
      email: 'zhang@example.com'
    };

    duplicateDialog = new DuplicateDialog();
  });

  afterEach(() => {
    if (duplicateDialog) {
      duplicateDialog.destroy();
    }
    delete window.languageManager;
    document.body.innerHTML = '';
  });

  describe('基本雙語功能測試', () => {
    test('應該正確獲取中文標籤', () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      
      const labels = duplicateDialog.getUILabels();
      
      expect(labels.duplicateFound).toBe('發現重複名片');
      expect(labels.skip).toBe('跳過');
      expect(labels.overwrite).toBe('覆蓋');
      expect(labels.createVersion).toBe('新版本');
    });

    test('應該正確獲取英文標籤', () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('en');
      
      const labels = duplicateDialog.getUILabels();
      
      expect(labels.duplicateFound).toBe('Duplicate Card Found');
      expect(labels.skip).toBe('Skip');
      expect(labels.overwrite).toBe('Overwrite');
      expect(labels.createVersion).toBe('New Version');
    });

    test('語言管理器不存在時應該使用備用中文標籤', () => {
      delete window.languageManager;
      
      const labels = duplicateDialog.getUILabels();
      
      expect(labels.duplicateFound).toBe('發現重複名片');
      expect(labels.skip).toBe('跳過');
    });
  });

  describe('對話框渲染測試', () => {
    test('應該以中文渲染對話框內容', async () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dialog = document.querySelector('.duplicate-dialog-overlay');
      expect(dialog).toBeTruthy();
      
      const title = dialog.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('發現重複名片');
      
      const skipBtn = dialog.querySelector('[data-action="skip"] .text');
      expect(skipBtn.textContent).toBe('跳過');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });

    test('應該以英文渲染對話框內容', async () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('en');
      
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dialog = document.querySelector('.duplicate-dialog-overlay');
      expect(dialog).toBeTruthy();
      
      const title = dialog.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('Duplicate Card Found');
      
      const skipBtn = dialog.querySelector('[data-action="skip"] .text');
      expect(skipBtn.textContent).toBe('Skip');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });

    test('批量模式應該顯示批量處理指示器', async () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData, true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const batchIndicator = document.querySelector('.batch-indicator');
      expect(batchIndicator).toBeTruthy();
      expect(batchIndicator.textContent).toBe('批量處理模式');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });
  });

  describe('日期格式化測試', () => {
    test('應該根據語言格式化日期 - 中文', () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      
      const formattedDate = duplicateDialog.formatDate('2024-01-01T10:30:00Z');
      
      // 檢查是否包含日期元素（格式可能因環境而異）
      expect(formattedDate).toMatch(/2024/);
      expect(formattedDate).toMatch(/01/);
    });

    test('應該根據語言格式化日期 - 英文', () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('en');
      
      const formattedDate = duplicateDialog.formatDate('2024-01-01T10:30:00Z');
      
      expect(formattedDate).toMatch(/2024/);
      expect(formattedDate).toMatch(/01/);
    });

    test('無效日期應該返回未知標籤', () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      
      const formattedDate = duplicateDialog.formatDate('invalid-date');
      
      expect(formattedDate).toBe('未知');
    });

    test('空日期應該返回未知標籤', () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('en');
      
      const formattedDate = duplicateDialog.formatDate('');
      
      expect(formattedDate).toBe('Unknown');
    });
  });

  describe('名稱提取測試', () => {
    test('應該提取雙語名稱的中文部分', () => {
      const cardData = { name: '張三~John Zhang' };
      
      const displayName = duplicateDialog.extractDisplayName(cardData);
      
      expect(displayName).toBe('張三');
    });

    test('應該處理物件格式的名稱', () => {
      const cardData = { name: { zh: '張三', en: 'John Zhang' } };
      
      const displayName = duplicateDialog.extractDisplayName(cardData);
      
      expect(displayName).toBe('張三');
    });

    test('應該處理單一語言名稱', () => {
      const cardData = { name: '張三' };
      
      const displayName = duplicateDialog.extractDisplayName(cardData);
      
      expect(displayName).toBe('張三');
    });

    test('空名稱應該返回未知標籤', () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      const cardData = {};
      
      const displayName = duplicateDialog.extractDisplayName(cardData);
      
      expect(displayName).toBe('未知');
    });
  });

  describe('用戶互動測試', () => {
    test('點擊跳過按鈕應該返回正確結果', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const skipBtn = document.querySelector('[data-action="skip"]');
      skipBtn.click();
      
      const result = await showPromise;
      
      expect(result.action).toBe('skip');
      expect(result.cardId).toBe('card-123');
    });

    test('ESC 鍵應該取消對話框', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);
      
      const result = await showPromise;
      
      expect(result.action).toBe('cancel');
    });

    test('Enter 鍵應該觸發按鈕動作', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const overwriteBtn = document.querySelector('[data-action="overwrite"]');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      overwriteBtn.dispatchEvent(enterEvent);
      
      const result = await showPromise;
      
      expect(result.action).toBe('overwrite');
    });
  });

  describe('批量處理測試', () => {
    test('批量模式應該顯示套用到全部選項', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData, true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const applyToAllCheckbox = document.querySelector('#apply-to-all');
      const applyToAllBtn = document.querySelector('.apply-all');
      
      expect(applyToAllCheckbox).toBeTruthy();
      expect(applyToAllBtn).toBeTruthy();
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });

    test('勾選套用到全部應該在結果中反映', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData, true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const applyToAllCheckbox = document.querySelector('#apply-to-all');
      applyToAllCheckbox.checked = true;
      
      const skipBtn = document.querySelector('[data-action="skip"]');
      skipBtn.click();
      
      const result = await showPromise;
      
      expect(result.action).toBe('skip');
      expect(result.applyToAll).toBe(true);
    });

    test('批量處理多個項目', async () => {
      const duplicateItems = [
        { duplicateInfo: mockDuplicateInfo, cardData: mockCardData },
        { duplicateInfo: { ...mockDuplicateInfo, duplicateCount: 2 }, cardData: { ...mockCardData, name: '李四' } }
      ];

      // 模擬用戶選擇：第一個跳過並套用到全部
      let callCount = 0;
      const originalShow = duplicateDialog.show.bind(duplicateDialog);
      duplicateDialog.show = jest.fn().mockImplementation(async (duplicateInfo, cardData, isBatch) => {
        callCount++;
        if (callCount === 1) {
          return { action: 'skip', applyToAll: true, cardId: 'card-123' };
        }
        return originalShow(duplicateInfo, cardData, isBatch);
      });

      const results = await duplicateDialog.processBatch(duplicateItems);

      expect(results).toHaveLength(2);
      expect(results[0].action).toBe('skip');
      expect(results[0].auto).toBe(false);
      expect(results[1].action).toBe('skip');
      expect(results[1].auto).toBe(true);
    });
  });

  describe('錯誤處理測試', () => {
    test('應該顯示錯誤訊息', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      duplicateDialog.showError('測試錯誤訊息');
      
      const errorDiv = document.querySelector('.duplicate-dialog-error');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.textContent).toBe('測試錯誤訊息');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });

    test('套用到全部但未選擇動作應該顯示錯誤', async () => {
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData, true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const applyAllBtn = document.querySelector('.apply-all');
      applyAllBtn.click();
      
      // 應該顯示錯誤而不是關閉對話框
      const dialog = document.querySelector('.duplicate-dialog-overlay');
      expect(dialog.style.display).not.toBe('none');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });
  });

  describe('無障礙功能測試', () => {
    test('對話框應該有正確的 ARIA 屬性', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dialog = document.querySelector('.duplicate-dialog-overlay');
      
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('duplicate-dialog-title');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });

    test('應該正確設置焦點', async () => {
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeTruthy();
      expect(focusedElement.tagName).toBe('BUTTON');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });
  });

  describe('語言切換整合測試', () => {
    test('語言切換時應該更新所有文字', async () => {
      // 初始為中文
      mockLanguageManager.getCurrentLanguage.mockReturnValue('zh');
      
      const showPromise = duplicateDialog.show(mockDuplicateInfo, mockCardData);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let title = document.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('發現重複名片');
      
      // 切換到英文
      mockLanguageManager.getCurrentLanguage.mockReturnValue('en');
      
      // 重新渲染
      duplicateDialog.renderContent();
      
      title = document.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('Duplicate Card Found');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });
  });

  describe('安全性測試', () => {
    test('應該正確轉義 HTML 內容', () => {
      const maliciousText = '<script>alert("xss")</script>';
      
      const escaped = duplicateDialog.escapeHtml(maliciousText);
      
      expect(escaped).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    test('應該安全處理惡意名稱資料', async () => {
      const maliciousCardData = {
        name: '<img src="x" onerror="alert(1)">'
      };
      
      const showPromise = duplicateDialog.show(mockDuplicateInfo, maliciousCardData);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const nameElement = document.querySelector('.card-preview.new .name');
      expect(nameElement.innerHTML).not.toContain('<img');
      expect(nameElement.innerHTML).toContain('&lt;img');
      
      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });
  });

  describe('效能測試', () => {
    test('大量批量處理應該在合理時間內完成', async () => {
      const startTime = Date.now();
      
      // 創建 100 個重複項目
      const duplicateItems = Array.from({ length: 100 }, (_, i) => ({
        duplicateInfo: { ...mockDuplicateInfo, duplicateCount: i + 1 },
        cardData: { ...mockCardData, name: `測試用戶${i}` }
      }));

      // 模擬自動套用到全部
      duplicateDialog.show = jest.fn().mockResolvedValue({
        action: 'skip',
        applyToAll: true,
        cardId: 'card-123'
      });

      const results = await duplicateDialog.processBatch(duplicateItems);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // 應該在 1 秒內完成
    });
  });
});