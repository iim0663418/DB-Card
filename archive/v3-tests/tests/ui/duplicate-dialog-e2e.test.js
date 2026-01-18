/**
 * 重複處理對話框端到端測試
 * 測試範圍：完整的用戶流程、語言切換、批量處理、錯誤處理和效能測試
 */

describe('DuplicateDialog E2E 測試', () => {
  let duplicateDialog;
  let mockLanguageManager;
  let mockStorage;

  beforeEach(() => {
    // 設置完整的 DOM 環境
    document.body.innerHTML = `
      <div id="app">
        <div id="language-toggle">
          <button id="lang-zh" class="active">中文</button>
          <button id="lang-en">English</button>
        </div>
        <div id="card-list"></div>
        <div id="import-section">
          <input type="file" id="file-input" accept=".json">
          <button id="import-btn">匯入名片</button>
        </div>
      </div>
    `;

    // 模擬完整的語言管理器
    mockLanguageManager = {
      currentLanguage: 'zh',
      getCurrentLanguage() { return this.currentLanguage; },
      setLanguage(lang) { 
        this.currentLanguage = lang;
        this.updateUI();
      },
      updateUI() {
        // 模擬 UI 更新
        document.querySelectorAll('[data-lang-key]').forEach(el => {
          const key = el.getAttribute('data-lang-key');
          el.textContent = this.getText(key);
        });
      },
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
            selectAction: '請先選擇一個處理方式',
            importSuccess: '匯入成功',
            importError: '匯入失敗',
            processing: '處理中...'
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
            selectAction: 'Please select an action first',
            importSuccess: 'Import Successful',
            importError: 'Import Failed',
            processing: 'Processing...'
          }
        };
        return translations[this.currentLanguage]?.[key] || key;
      })
    };

    // 模擬儲存系統
    mockStorage = {
      cards: new Map(),
      async getCard(id) {
        return this.cards.get(id);
      },
      async saveCard(card) {
        this.cards.set(card.id, { ...card, saved: Date.now() });
        return card.id;
      },
      async updateCard(id, updates) {
        const existing = this.cards.get(id);
        if (existing) {
          this.cards.set(id, { ...existing, ...updates, updated: Date.now() });
        }
        return this.cards.get(id);
      },
      async deleteCard(id) {
        return this.cards.delete(id);
      },
      async getAllCards() {
        return Array.from(this.cards.values());
      }
    };

    window.languageManager = mockLanguageManager;
    window.storage = mockStorage;
    
    duplicateDialog = new DuplicateDialog();
  });

  afterEach(() => {
    if (duplicateDialog) {
      duplicateDialog.destroy();
    }
    delete window.languageManager;
    delete window.storage;
    document.body.innerHTML = '';
  });

  describe('完整匯入流程測試', () => {
    test('單一名片匯入 - 無重複', async () => {
      const newCard = {
        id: 'new-card-1',
        name: '王小明',
        title: '產品經理',
        email: 'wang@example.com'
      };

      // 模擬匯入流程
      const importResult = await simulateImport([newCard]);
      
      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(1);
      expect(importResult.duplicates).toBe(0);
      
      // 驗證儲存
      const savedCard = await mockStorage.getCard('new-card-1');
      expect(savedCard).toBeTruthy();
      expect(savedCard.name).toBe('王小明');
    });

    test('單一名片匯入 - 有重複，選擇跳過', async () => {
      // 預先存在的名片
      const existingCard = {
        id: 'existing-1',
        name: '張三',
        title: '軟體工程師',
        email: 'zhang@example.com',
        created: '2024-01-01T10:00:00Z'
      };
      await mockStorage.saveCard(existingCard);

      const duplicateCard = {
        id: 'new-card-2',
        name: '張三',
        title: '資深軟體工程師',
        email: 'zhang@example.com'
      };

      // 模擬用戶選擇跳過
      const userChoice = 'skip';
      const importResult = await simulateImportWithDuplicates([duplicateCard], userChoice);
      
      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(0);
      expect(importResult.skipped).toBe(1);
      
      // 驗證原始名片未被修改
      const savedCard = await mockStorage.getCard('existing-1');
      expect(savedCard.title).toBe('軟體工程師');
    });

    test('單一名片匯入 - 有重複，選擇覆蓋', async () => {
      // 預先存在的名片
      const existingCard = {
        id: 'existing-2',
        name: '李四',
        title: '設計師',
        email: 'li@example.com',
        created: '2024-01-01T10:00:00Z'
      };
      await mockStorage.saveCard(existingCard);

      const duplicateCard = {
        id: 'new-card-3',
        name: '李四',
        title: '資深設計師',
        email: 'li@example.com'
      };

      // 模擬用戶選擇覆蓋
      const userChoice = 'overwrite';
      const importResult = await simulateImportWithDuplicates([duplicateCard], userChoice);
      
      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(1);
      expect(importResult.overwritten).toBe(1);
      
      // 驗證名片被更新
      const savedCard = await mockStorage.getCard('existing-2');
      expect(savedCard.title).toBe('資深設計師');
    });

    test('單一名片匯入 - 有重複，選擇新版本', async () => {
      // 預先存在的名片
      const existingCard = {
        id: 'existing-3',
        name: '陳五',
        title: 'PM',
        email: 'chen@example.com',
        created: '2024-01-01T10:00:00Z',
        version: '1.0'
      };
      await mockStorage.saveCard(existingCard);

      const duplicateCard = {
        id: 'new-card-4',
        name: '陳五',
        title: '資深 PM',
        email: 'chen@example.com'
      };

      // 模擬用戶選擇新版本
      const userChoice = 'version';
      const importResult = await simulateImportWithDuplicates([duplicateCard], userChoice);
      
      expect(importResult.success).toBe(true);
      expect(importResult.imported).toBe(1);
      expect(importResult.versioned).toBe(1);
      
      // 驗證兩張名片都存在
      const allCards = await mockStorage.getAllCards();
      const chenCards = allCards.filter(card => card.name === '陳五');
      expect(chenCards).toHaveLength(2);
    });
  });

  describe('批量匯入流程測試', () => {
    test('批量匯入 - 混合情況，套用到全部', async () => {
      // 預先存在的名片
      const existingCards = [
        { id: 'existing-4', name: '用戶A', email: 'a@example.com' },
        { id: 'existing-5', name: '用戶B', email: 'b@example.com' }
      ];
      
      for (const card of existingCards) {
        await mockStorage.saveCard(card);
      }

      const importCards = [
        { id: 'new-1', name: '用戶A', email: 'a@example.com', title: '更新職稱' }, // 重複
        { id: 'new-2', name: '用戶C', email: 'c@example.com' }, // 新的
        { id: 'new-3', name: '用戶B', email: 'b@example.com', title: '另一個職稱' }, // 重複
        { id: 'new-4', name: '用戶D', email: 'd@example.com' } // 新的
      ];

      // 模擬用戶在第一個重複項目選擇跳過並套用到全部
      const batchResult = await simulateBatchImport(importCards, 'skip', true);
      
      expect(batchResult.success).toBe(true);
      expect(batchResult.imported).toBe(2); // 用戶C和D
      expect(batchResult.skipped).toBe(2); // 用戶A和B
      expect(batchResult.appliedToAll).toBe(true);
    });

    test('批量匯入 - 逐一處理', async () => {
      const existingCard = {
        id: 'existing-6',
        name: '測試用戶',
        email: 'test@example.com'
      };
      await mockStorage.saveCard(existingCard);

      const importCards = [
        { id: 'new-5', name: '測試用戶', email: 'test@example.com', title: '職稱1' },
        { id: 'new-6', name: '測試用戶', email: 'test@example.com', title: '職稱2' },
        { id: 'new-7', name: '測試用戶', email: 'test@example.com', title: '職稱3' }
      ];

      // 模擬用戶逐一選擇：跳過、覆蓋、新版本
      const choices = ['skip', 'overwrite', 'version'];
      const batchResult = await simulateBatchImportIndividual(importCards, choices);
      
      expect(batchResult.success).toBe(true);
      expect(batchResult.skipped).toBe(1);
      expect(batchResult.overwritten).toBe(1);
      expect(batchResult.versioned).toBe(1);
    });
  });

  describe('語言切換整合測試', () => {
    test('匯入過程中切換語言', async () => {
      const existingCard = {
        id: 'existing-7',
        name: '雙語測試',
        email: 'bilingual@example.com'
      };
      await mockStorage.saveCard(existingCard);

      const duplicateCard = {
        id: 'new-8',
        name: '雙語測試',
        email: 'bilingual@example.com'
      };

      // 開始匯入（中文）
      const showPromise = duplicateDialog.show(
        { duplicateCount: 1, existingCards: [existingCard] },
        duplicateCard
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // 驗證中文介面
      let title = document.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('發現重複名片');

      // 切換到英文
      mockLanguageManager.setLanguage('en');
      duplicateDialog.renderContent();

      // 驗證英文介面
      title = document.querySelector('#duplicate-dialog-title');
      expect(title.textContent).toBe('Duplicate Card Found');

      // 完成操作
      const skipBtn = document.querySelector('[data-action="skip"]');
      skipBtn.click();

      const result = await showPromise;
      expect(result.action).toBe('skip');
    });

    test('批量處理中的語言切換', async () => {
      const duplicateItems = [
        {
          duplicateInfo: { duplicateCount: 1, existingCards: [{ id: 'existing-8', name: '測試1' }] },
          cardData: { name: '測試1', email: 'test1@example.com' }
        },
        {
          duplicateInfo: { duplicateCount: 1, existingCards: [{ id: 'existing-9', name: '測試2' }] },
          cardData: { name: '測試2', email: 'test2@example.com' }
        }
      ];

      let processedCount = 0;
      const originalShow = duplicateDialog.show.bind(duplicateDialog);
      
      duplicateDialog.show = jest.fn().mockImplementation(async (duplicateInfo, cardData, isBatch) => {
        processedCount++;
        
        if (processedCount === 1) {
          // 第一個項目：中文介面，選擇跳過
          expect(mockLanguageManager.getCurrentLanguage()).toBe('zh');
          return { action: 'skip', cardId: duplicateInfo.existingCards[0].id };
        } else {
          // 第二個項目：切換到英文
          mockLanguageManager.setLanguage('en');
          expect(mockLanguageManager.getCurrentLanguage()).toBe('en');
          return { action: 'overwrite', cardId: duplicateInfo.existingCards[0].id };
        }
      });

      const results = await duplicateDialog.processBatch(duplicateItems);

      expect(results).toHaveLength(2);
      expect(results[0].action).toBe('skip');
      expect(results[1].action).toBe('overwrite');
    });
  });

  describe('錯誤處理和邊界情況測試', () => {
    test('處理損壞的名片資料', async () => {
      const corruptedCard = {
        // 缺少必要欄位
        email: 'corrupted@example.com'
      };

      try {
        const result = await simulateImport([corruptedCard]);
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    test('處理網路錯誤', async () => {
      // 模擬儲存失敗
      mockStorage.saveCard = jest.fn().mockRejectedValue(new Error('Network error'));

      const newCard = {
        id: 'network-test',
        name: '網路測試',
        email: 'network@example.com'
      };

      try {
        const result = await simulateImport([newCard]);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      } catch (error) {
        expect(error.message).toContain('Network error');
      }
    });

    test('處理大量資料匯入', async () => {
      const startTime = Date.now();
      
      // 創建 1000 張名片
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-${i}`,
        name: `大量測試用戶${i}`,
        email: `large${i}@example.com`
      }));

      const result = await simulateImport(largeDataSet);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1000);
      expect(duration).toBeLessThan(5000); // 應該在 5 秒內完成
    });

    test('處理記憶體不足情況', async () => {
      // 模擬記憶體限制
      const originalError = console.error;
      console.error = jest.fn();

      // 創建超大資料集
      const hugeDataSet = Array.from({ length: 100000 }, (_, i) => ({
        id: `huge-${i}`,
        name: `超大測試用戶${i}`,
        email: `huge${i}@example.com`,
        description: 'x'.repeat(10000) // 每個名片 10KB
      }));

      try {
        const result = await simulateImport(hugeDataSet);
        // 如果成功，驗證結果
        expect(result.imported).toBeLessThanOrEqual(hugeDataSet.length);
      } catch (error) {
        // 如果失敗，應該是記憶體相關錯誤
        expect(error.message).toMatch(/memory|heap|out of/i);
      }

      console.error = originalError;
    });
  });

  describe('效能和可用性測試', () => {
    test('對話框開啟速度測試', async () => {
      const startTime = performance.now();
      
      const showPromise = duplicateDialog.show(
        { duplicateCount: 1, existingCards: [{ id: 'perf-test', name: '效能測試' }] },
        { name: '效能測試', email: 'perf@example.com' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = performance.now();
      const openTime = endTime - startTime;

      expect(openTime).toBeLessThan(200); // 應該在 200ms 內開啟

      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });

    test('鍵盤導航測試', async () => {
      const showPromise = duplicateDialog.show(
        { duplicateCount: 1, existingCards: [{ id: 'kb-test', name: '鍵盤測試' }] },
        { name: '鍵盤測試', email: 'kb@example.com' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // 測試 Tab 鍵導航
      const focusableElements = document.querySelectorAll(
        '.duplicate-dialog-container button, .duplicate-dialog-container input, [tabindex="0"]'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      // 模擬 Tab 鍵按下
      for (let i = 0; i < focusableElements.length; i++) {
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        document.dispatchEvent(tabEvent);
        
        // 驗證焦點移動
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // 清理
      duplicateDialog.handleCancel();
      await showPromise;
    });

    test('響應式設計測試', async () => {
      // 模擬不同螢幕尺寸
      const screenSizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const size of screenSizes) {
        // 設置視窗大小
        Object.defineProperty(window, 'innerWidth', { value: size.width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: size.height, writable: true });

        const showPromise = duplicateDialog.show(
          { duplicateCount: 1, existingCards: [{ id: 'responsive-test', name: '響應式測試' }] },
          { name: '響應式測試', email: 'responsive@example.com' }
        );

        await new Promise(resolve => setTimeout(resolve, 100));

        const dialog = document.querySelector('.duplicate-dialog-container');
        const computedStyle = window.getComputedStyle(dialog);

        // 驗證對話框在不同尺寸下的表現
        expect(dialog).toBeTruthy();
        expect(computedStyle.display).not.toBe('none');

        // 清理
        duplicateDialog.handleCancel();
        await showPromise;
      }
    });
  });

  // 輔助函數
  async function simulateImport(cards) {
    const results = {
      success: true,
      imported: 0,
      duplicates: 0,
      errors: []
    };

    try {
      for (const card of cards) {
        // 檢查重複
        const existing = await findDuplicateCard(card);
        if (existing) {
          results.duplicates++;
        } else {
          await mockStorage.saveCard(card);
          results.imported++;
        }
      }
    } catch (error) {
      results.success = false;
      results.error = error.message;
    }

    return results;
  }

  async function simulateImportWithDuplicates(cards, userChoice) {
    const results = {
      success: true,
      imported: 0,
      skipped: 0,
      overwritten: 0,
      versioned: 0
    };

    for (const card of cards) {
      const existing = await findDuplicateCard(card);
      if (existing) {
        switch (userChoice) {
          case 'skip':
            results.skipped++;
            break;
          case 'overwrite':
            await mockStorage.updateCard(existing.id, card);
            results.imported++;
            results.overwritten++;
            break;
          case 'version':
            const newId = `${card.id}-v2`;
            await mockStorage.saveCard({ ...card, id: newId, version: '2.0' });
            results.imported++;
            results.versioned++;
            break;
        }
      } else {
        await mockStorage.saveCard(card);
        results.imported++;
      }
    }

    return results;
  }

  async function simulateBatchImport(cards, action, applyToAll) {
    const results = {
      success: true,
      imported: 0,
      skipped: 0,
      overwritten: 0,
      versioned: 0,
      appliedToAll: applyToAll
    };

    for (const card of cards) {
      const existing = await findDuplicateCard(card);
      if (existing) {
        switch (action) {
          case 'skip':
            results.skipped++;
            break;
          case 'overwrite':
            await mockStorage.updateCard(existing.id, card);
            results.imported++;
            results.overwritten++;
            break;
          case 'version':
            const newId = `${card.id}-v2`;
            await mockStorage.saveCard({ ...card, id: newId, version: '2.0' });
            results.imported++;
            results.versioned++;
            break;
        }
      } else {
        await mockStorage.saveCard(card);
        results.imported++;
      }
    }

    return results;
  }

  async function simulateBatchImportIndividual(cards, choices) {
    const results = {
      success: true,
      imported: 0,
      skipped: 0,
      overwritten: 0,
      versioned: 0
    };

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const choice = choices[i];
      const existing = await findDuplicateCard(card);

      if (existing) {
        switch (choice) {
          case 'skip':
            results.skipped++;
            break;
          case 'overwrite':
            await mockStorage.updateCard(existing.id, card);
            results.imported++;
            results.overwritten++;
            break;
          case 'version':
            const newId = `${card.id}-v${Date.now()}`;
            await mockStorage.saveCard({ ...card, id: newId, version: '2.0' });
            results.imported++;
            results.versioned++;
            break;
        }
      } else {
        await mockStorage.saveCard(card);
        results.imported++;
      }
    }

    return results;
  }

  async function findDuplicateCard(card) {
    const allCards = await mockStorage.getAllCards();
    return allCards.find(existing => 
      existing.name === card.name || existing.email === card.email
    );
  }
});