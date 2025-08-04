/**
 * Storage與專用管理器整合測試
 * 測試真實環境下的協同工作
 * 
 * 對應需求:
 * - R-PWA-24: 版本管理與重複檢測整合
 * - D-STORAGE-01: 指紋生成與重複檢測架構
 */

describe('Storage-Managers Integration', () => {
  let storage;
  let duplicateDetector;
  let versionManager;

  beforeAll(async () => {
    // 載入實際模組
    const PWACardStorage = require('../../pwa-card-storage/src/core/storage.js');
    const ContentFingerprintGenerator = require('../../pwa-card-storage/src/core/content-fingerprint-generator.js');
    const DuplicateDetector = require('../../pwa-card-storage/src/core/duplicate-detector.js');
    const VersionManager = require('../../pwa-card-storage/src/core/version-manager.js');

    // 設置全域環境
    global.ContentFingerprintGenerator = ContentFingerprintGenerator;
    global.DuplicateDetector = DuplicateDetector;
    global.VersionManager = VersionManager;

    // 模擬瀏覽器環境
    setupBrowserMocks();
  });

  beforeEach(async () => {
    storage = new (require('../../pwa-card-storage/src/core/storage.js'))();
    
    // 模擬資料庫初始化成功
    storage.db = createMockDB();
    await storage.initializeManagers();
    
    duplicateDetector = storage.duplicateDetector;
    versionManager = storage.versionManager;
  });

  // TC-INTEGRATION-001: 完整匯入流程測試
  describe('TC-INTEGRATION-001: Complete Import Flow', () => {
    test('Given 新名片資料 When 完整匯入流程 Then 應正確生成指紋並建立版本', async () => {
      // Given
      const cardData = {
        name: '蔡孟諭~Tsai Meng-Yu',
        title: '數位策略司司長~Director General',
        email: 'test@moda.gov.tw',
        department: '數位策略司'
      };

      // When
      const cardId = await storage.storeCard(cardData);

      // Then
      expect(cardId).toBeDefined();
      
      // 驗證指紋生成
      const storedCard = await storage.getCard(cardId);
      expect(storedCard.fingerprint).toMatch(/^fingerprint_[a-f0-9]{64}$/);
      
      // 驗證版本建立
      const versionHistory = await storage.getVersionHistory(cardId);
      expect(versionHistory.totalVersions).toBe(1);
      expect(versionHistory.versions[0].changeType).toBe('create');
    });

    test('Given 重複名片資料 When 檢測重複 Then 應正確識別', async () => {
      // Given - 先儲存一張名片
      const originalData = {
        name: '蔡孟諭~Tsai Meng-Yu',
        email: 'test@moda.gov.tw'
      };
      await storage.storeCard(originalData);

      // When - 嘗試儲存相同名片
      const duplicateResult = await duplicateDetector.detectDuplicates(originalData);

      // Then
      expect(duplicateResult.isDuplicate).toBe(true);
      expect(duplicateResult.duplicateCount).toBe(1);
      expect(duplicateResult.existingCards).toHaveLength(1);
    });
  });

  // TC-INTEGRATION-002: 版本管理整合測試
  describe('TC-INTEGRATION-002: Version Management Integration', () => {
    test('Given 現有名片 When 更新資料 Then 應建立新版本', async () => {
      // Given
      const originalData = { name: '測試', title: '原職稱' };
      const cardId = await storage.storeCard(originalData);

      // When
      const updatedData = { title: '新職稱' };
      await storage.updateCard(cardId, updatedData);

      // Then
      const versionHistory = await storage.getVersionHistory(cardId);
      expect(versionHistory.totalVersions).toBe(2);
      expect(versionHistory.versions[0].changeType).toBe('update');
      expect(versionHistory.versions[1].changeType).toBe('create');
    });

    test('Given 多個版本 When 還原到舊版本 Then 應正確還原並建立還原版本', async () => {
      // Given
      const originalData = { name: '測試', title: '版本1' };
      const cardId = await storage.storeCard(originalData);
      await storage.updateCard(cardId, { title: '版本2' });
      await storage.updateCard(cardId, { title: '版本3' });

      // When
      const restoreResult = await storage.restoreVersion(cardId, 1);

      // Then
      expect(restoreResult.success).toBe(true);
      
      const currentCard = await storage.getCard(cardId);
      expect(currentCard.data.title).toBe('版本1');
      
      const versionHistory = await storage.getVersionHistory(cardId);
      expect(versionHistory.totalVersions).toBe(4); // 原3版本 + 還原版本
      expect(versionHistory.versions[0].changeType).toBe('restore');
    });
  });

  // TC-INTEGRATION-003: 雙語資料處理測試
  describe('TC-INTEGRATION-003: Bilingual Data Processing', () => {
    test('Given 雙語格式資料 When 生成指紋 Then 應正確標準化處理', async () => {
      // Given
      const bilingualData1 = {
        name: '蔡孟諭~Tsai Meng-Yu',
        email: 'test@moda.gov.tw'
      };
      const bilingualData2 = {
        name: { zh: '蔡孟諭', en: 'Tsai Meng-Yu' },
        email: 'test@moda.gov.tw'
      };

      // When
      const fingerprint1 = await storage.generateFingerprintSafe(bilingualData1);
      const fingerprint2 = await storage.generateFingerprintSafe(bilingualData2);

      // Then - 不同格式但相同內容應產生相同指紋
      expect(fingerprint1).toBe(fingerprint2);
    });
  });

  // TC-INTEGRATION-004: 錯誤處理與恢復測試
  describe('TC-INTEGRATION-004: Error Handling and Recovery', () => {
    test('Given 專用管理器失效 When 執行操作 Then 應自動切換到備用方案', async () => {
      // Given
      storage.duplicateDetector = null; // 模擬管理器失效

      // When
      const cardData = { name: '測試', email: 'test@example.com' };
      const fingerprint = await storage.generateFingerprintSafe(cardData);

      // Then - 應使用備用方案成功生成指紋
      expect(fingerprint).toBeDefined();
      expect(fingerprint).toMatch(/^fingerprint_/);
    });

    test('Given 資料庫連線異常 When 執行操作 Then 應優雅處理錯誤', async () => {
      // Given
      storage.db = null; // 模擬資料庫連線失效

      // When & Then
      await expect(storage.getVersionHistory('test')).rejects.toThrow('Database not initialized');
    });
  });

  // TC-INTEGRATION-005: 效能整合測試
  describe('TC-INTEGRATION-005: Performance Integration', () => {
    test('Given 批量操作 When 同時進行指紋生成和版本管理 Then 應維持效能要求', async () => {
      // Given
      const testData = Array.from({ length: 50 }, (_, i) => ({
        name: `測試${i}`,
        email: `test${i}@example.com`
      }));

      // When
      const startTime = Date.now();
      const operations = testData.map(async (data) => {
        const cardId = await storage.storeCard(data);
        await storage.updateCard(cardId, { title: '更新' });
        return cardId;
      });
      
      const results = await Promise.all(operations);
      const endTime = Date.now();

      // Then
      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(5000); // 5秒內完成
      
      // 驗證每張名片都有正確的版本記錄
      for (const cardId of results.slice(0, 5)) { // 檢查前5張
        const history = await storage.getVersionHistory(cardId);
        expect(history.totalVersions).toBe(2);
      }
    });
  });

  // 輔助函數
  function setupBrowserMocks() {
    global.crypto = {
      subtle: {
        digest: jest.fn().mockImplementation(async () => {
          const hash = new ArrayBuffer(32);
          const view = new Uint8Array(hash);
          for (let i = 0; i < 32; i++) {
            view[i] = Math.floor(Math.random() * 256);
          }
          return hash;
        })
      },
      getRandomValues: jest.fn().mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      })
    };

    global.TextEncoder = class {
      encode(str) {
        return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
      }
    };

    global.indexedDB = {
      open: jest.fn().mockImplementation(() => {
        const request = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.result = createMockDB();
            request.onsuccess({ target: request });
          }
        }, 0);
        
        return request;
      })
    };
  }

  function createMockDB() {
    const stores = new Map();
    
    return {
      objectStoreNames: {
        contains: (name) => ['cards', 'versions', 'settings', 'backups'].includes(name)
      },
      transaction: jest.fn().mockImplementation((storeNames, mode) => ({
        objectStore: jest.fn().mockImplementation((storeName) => {
          if (!stores.has(storeName)) {
            stores.set(storeName, new Map());
          }
          
          const store = stores.get(storeName);
          
          return {
            add: jest.fn().mockImplementation((data) => ({
              onsuccess: null,
              onerror: null
            })),
            get: jest.fn().mockImplementation((key) => ({
              onsuccess: null,
              onerror: null,
              result: store.get(key)
            })),
            put: jest.fn().mockImplementation((data) => ({
              onsuccess: null,
              onerror: null
            })),
            index: jest.fn().mockImplementation(() => ({
              getAll: jest.fn().mockImplementation(() => ({
                onsuccess: null,
                onerror: null,
                result: Array.from(store.values())
              }))
            }))
          };
        })
      })),
      close: jest.fn()
    };
  }
});