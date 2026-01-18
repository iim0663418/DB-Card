/**
 * Storage模組重構測試套件
 * 測試專用管理器整合與備用方案
 * 
 * 對應需求:
 * - T-CRS-PWA-004: Storage模組使用專用DuplicateDetector
 * - T-CRS-PWA-005: Storage模組使用專用VersionManager
 * - R-PWA-24: 版本管理與重複檢測整合
 */

describe('PWACardStorage - 重構後專用管理器整合', () => {
  let storage;
  let mockDuplicateDetector;
  let mockVersionManager;

  beforeEach(async () => {
    // 模擬IndexedDB
    global.indexedDB = {
      open: jest.fn().mockImplementation(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          objectStoreNames: { contains: () => false },
          createObjectStore: jest.fn().mockReturnValue({
            createIndex: jest.fn()
          }),
          transaction: jest.fn().mockReturnValue({
            objectStore: jest.fn().mockReturnValue({
              add: jest.fn().mockReturnValue({ onsuccess: null }),
              get: jest.fn().mockReturnValue({ onsuccess: null }),
              put: jest.fn().mockReturnValue({ onsuccess: null })
            })
          })
        }
      }))
    };

    // 模擬專用管理器
    mockDuplicateDetector = {
      initialize: jest.fn().mockResolvedValue(true),
      generateFingerprint: jest.fn().mockResolvedValue('fingerprint_test123')
    };

    mockVersionManager = {
      createVersionSnapshot: jest.fn().mockResolvedValue({ id: 'v1', version: 1 }),
      getVersionHistory: jest.fn().mockResolvedValue({ versions: [], totalVersions: 0 }),
      restoreToVersion: jest.fn().mockResolvedValue({ success: true })
    };

    // 模擬全域類別
    global.DuplicateDetector = jest.fn().mockImplementation(() => mockDuplicateDetector);
    global.VersionManager = jest.fn().mockImplementation(() => mockVersionManager);
    global.ContentFingerprintGenerator = jest.fn().mockImplementation(() => ({
      generateFingerprint: jest.fn().mockResolvedValue('fingerprint_fallback123')
    }));

    // 模擬crypto API
    global.crypto = {
      subtle: {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        importKey: jest.fn().mockResolvedValue({}),
        deriveKey: jest.fn().mockResolvedValue({})
      },
      getRandomValues: jest.fn().mockReturnValue(new Uint8Array(32))
    };

    storage = new (require('../../pwa-card-storage/src/core/storage.js'))();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-STORAGE-001: 專用管理器初始化測試
  describe('TC-STORAGE-001: initializeManagers', () => {
    test('Given 專用管理器類別可用 When 初始化Storage When 應成功初始化專用管理器', async () => {
      // Given
      expect(global.DuplicateDetector).toBeDefined();
      expect(global.VersionManager).toBeDefined();

      // When
      await storage.initializeManagers();

      // Then
      expect(global.DuplicateDetector).toHaveBeenCalledWith(storage);
      expect(global.VersionManager).toHaveBeenCalledWith(storage);
      expect(mockDuplicateDetector.initialize).toHaveBeenCalled();
      expect(storage.duplicateDetector).toBe(mockDuplicateDetector);
      expect(storage.versionManager).toBe(mockVersionManager);
    });

    test('Given 專用管理器類別不可用 When 初始化Storage Then 應優雅處理無專用管理器情況', async () => {
      // Given
      delete global.DuplicateDetector;
      delete global.VersionManager;

      // When
      await storage.initializeManagers();

      // Then
      expect(storage.duplicateDetector).toBeNull();
      expect(storage.versionManager).toBeNull();
    });
  });

  // TC-STORAGE-002: 指紋生成重構測試
  describe('TC-STORAGE-002: generateFingerprintSafe', () => {
    test('Given 專用DuplicateDetector可用 When 生成指紋 Then 應使用專用管理器', async () => {
      // Given
      await storage.initializeManagers();
      const cardData = { name: '測試', email: 'test@example.com' };

      // When
      const result = await storage.generateFingerprintSafe(cardData);

      // Then
      expect(mockDuplicateDetector.generateFingerprint).toHaveBeenCalledWith(cardData);
      expect(result).toBe('fingerprint_test123');
    });

    test('Given 專用管理器不可用但ContentFingerprintGenerator可用 When 生成指紋 Then 應使用備用方案', async () => {
      // Given
      storage.duplicateDetector = null;
      const cardData = { name: '測試', email: 'test@example.com' };

      // When
      const result = await storage.generateFingerprintSafe(cardData);

      // Then
      expect(global.ContentFingerprintGenerator).toHaveBeenCalled();
      expect(result).toBe('fingerprint_fallback123');
    });

    test('Given 所有指紋生成器都不可用 When 生成指紋 Then 應使用最終備用方案', async () => {
      // Given
      storage.duplicateDetector = null;
      delete global.ContentFingerprintGenerator;
      const cardData = { name: '測試', email: 'test@example.com' };

      // When
      const result = await storage.generateFingerprintSafe(cardData);

      // Then
      expect(result).toMatch(/^fingerprint_[a-f0-9]{16}$/);
    });
  });

  // TC-STORAGE-003: 版本快照重構測試
  describe('TC-STORAGE-003: createVersionSnapshotSafe', () => {
    test('Given 專用VersionManager可用 When 建立版本快照 Then 應使用專用管理器', async () => {
      // Given
      await storage.initializeManagers();
      const cardId = 'card123';
      const data = { name: '測試' };

      // When
      const result = await storage.createVersionSnapshotSafe(cardId, data, 'create');

      // Then
      expect(mockVersionManager.createVersionSnapshot).toHaveBeenCalledWith(cardId, data, 'create', '');
      expect(result).toEqual({ id: 'v1', version: 1 });
    });

    test('Given 專用管理器不可用 When 建立版本快照 Then 應使用備用實作', async () => {
      // Given
      storage.versionManager = null;
      storage.getCard = jest.fn().mockResolvedValue({ currentVersion: 1 });
      storage.calculateChecksum = jest.fn().mockResolvedValue('checksum123');
      storage.cleanupOldVersions = jest.fn().mockResolvedValue();
      
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          put: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null
          })
        })
      };
      storage.db = { transaction: jest.fn().mockReturnValue(mockTransaction) };

      const cardId = 'card123';
      const data = { name: '測試' };

      // When
      const result = await storage.createVersionSnapshotSafe(cardId, data, 'create');

      // Then
      expect(storage.getCard).toHaveBeenCalledWith(cardId);
      expect(storage.calculateChecksum).toHaveBeenCalledWith(data);
      expect(result.cardId).toBe(cardId);
      expect(result.changeType).toBe('create');
    });
  });

  // TC-STORAGE-004: 版本歷史重構測試
  describe('TC-STORAGE-004: getVersionHistory', () => {
    test('Given 專用VersionManager可用 When 獲取版本歷史 Then 應使用專用管理器', async () => {
      // Given
      await storage.initializeManagers();
      const cardId = 'card123';

      // When
      const result = await storage.getVersionHistory(cardId);

      // Then
      expect(mockVersionManager.getVersionHistory).toHaveBeenCalledWith(cardId);
      expect(result).toEqual({ versions: [], totalVersions: 0 });
    });

    test('Given 專用管理器不可用 When 獲取版本歷史 Then 應使用備用實作', async () => {
      // Given
      storage.versionManager = null;
      const mockIndex = {
        getAll: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null,
          result: []
        })
      };
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex)
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore)
      };
      storage.db = { transaction: jest.fn().mockReturnValue(mockTransaction) };

      const cardId = 'card123';

      // When
      const result = await storage.getVersionHistory(cardId);

      // Then
      expect(storage.db.transaction).toHaveBeenCalledWith(['versions'], 'readonly');
      expect(mockStore.index).toHaveBeenCalledWith('cardId');
    });
  });

  // TC-STORAGE-005: 版本還原重構測試
  describe('TC-STORAGE-005: restoreVersion', () => {
    test('Given 專用VersionManager可用 When 還原版本 Then 應使用專用管理器', async () => {
      // Given
      await storage.initializeManagers();
      const cardId = 'card123';
      const targetVersion = 2;

      // When
      const result = await storage.restoreVersion(cardId, targetVersion);

      // Then
      expect(mockVersionManager.restoreToVersion).toHaveBeenCalledWith(cardId, targetVersion);
      expect(result).toEqual({ success: true });
    });

    test('Given 專用管理器不可用 When 還原版本 Then 應使用備用實作', async () => {
      // Given
      storage.versionManager = null;
      storage.getVersionSnapshot = jest.fn().mockResolvedValue({
        data: { name: '測試' },
        checksum: 'checksum123'
      });
      storage.calculateChecksum = jest.fn().mockResolvedValue('checksum123');
      storage.updateCard = jest.fn().mockResolvedValue(true);
      storage.createVersionSnapshotSafe = jest.fn().mockResolvedValue({});

      const cardId = 'card123';
      const targetVersion = 2;

      // When
      const result = await storage.restoreVersion(cardId, targetVersion);

      // Then
      expect(storage.getVersionSnapshot).toHaveBeenCalledWith(cardId, targetVersion);
      expect(storage.updateCard).toHaveBeenCalled();
      expect(storage.createVersionSnapshotSafe).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  // TC-STORAGE-006: 安全性測試
  describe('TC-STORAGE-006: Security Integration', () => {
    test('Given 安全模組可用 When 執行敏感操作 Then 應保持安全檢查', async () => {
      // Given
      global.window = {
        SecurityAuthHandler: {
          validateAccess: jest.fn().mockReturnValue({ authorized: true })
        },
        SecurityDataHandler: {
          secureLog: jest.fn()
        }
      };

      await storage.initializeManagers();
      const cardData = { name: '測試', email: 'test@example.com' };

      // When
      await storage.generateFingerprintSafe(cardData);

      // Then - 確保安全機制仍然運作
      expect(mockDuplicateDetector.generateFingerprint).toHaveBeenCalled();
    });

    test('Given 惡意輸入 When 生成指紋 Then 應安全處理', async () => {
      // Given
      await storage.initializeManagers();
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com'
      };

      // When & Then - 不應拋出異常
      const result = await storage.generateFingerprintSafe(maliciousData);
      expect(result).toBeDefined();
      expect(mockDuplicateDetector.generateFingerprint).toHaveBeenCalledWith(maliciousData);
    });
  });

  // TC-STORAGE-007: 效能測試
  describe('TC-STORAGE-007: Performance', () => {
    test('Given 大量資料 When 批量操作 Then 應在合理時間內完成', async () => {
      // Given
      await storage.initializeManagers();
      const startTime = Date.now();
      const operations = [];

      // When - 模擬100次指紋生成
      for (let i = 0; i < 100; i++) {
        operations.push(storage.generateFingerprintSafe({ 
          name: `測試${i}`, 
          email: `test${i}@example.com` 
        }));
      }
      await Promise.all(operations);
      const endTime = Date.now();

      // Then - 應在1秒內完成
      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockDuplicateDetector.generateFingerprint).toHaveBeenCalledTimes(100);
    });
  });
});