/**
 * Storage模組安全性測試
 * 測試重構後的安全機制保持完整
 * 
 * 對應需求:
 * - SEC-006: 授權檢查機制
 * - SEC-004: 安全日誌記錄
 * - OWASP-A03: 注入攻擊防護
 */

describe('Storage Security Tests', () => {
  let storage;
  let mockSecurityAuth;
  let mockSecurityData;

  beforeEach(async () => {
    // 模擬安全模組
    mockSecurityAuth = {
      validateAccess: jest.fn().mockReturnValue({ authorized: true })
    };
    
    mockSecurityData = {
      secureLog: jest.fn()
    };

    global.window = {
      SecurityAuthHandler: mockSecurityAuth,
      SecurityDataHandler: mockSecurityData
    };

    // 設置Storage
    storage = new (require('../../pwa-card-storage/src/core/storage.js'))();
    storage.db = createMockSecureDB();
    await storage.initializeManagers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.window;
  });

  // TC-SECURITY-001: 授權檢查測試
  describe('TC-SECURITY-001: Authorization Checks', () => {
    test('Given 有效授權 When 儲存名片 Then 應允許操作', async () => {
      // Given
      mockSecurityAuth.validateAccess.mockReturnValue({ authorized: true });
      const cardData = { name: '測試', email: 'test@example.com' };

      // When
      const result = await storage.storeCard(cardData);

      // Then
      expect(mockSecurityAuth.validateAccess).toHaveBeenCalledWith('card-data', 'write', {
        userId: 'current-user',
        timestamp: expect.any(Number)
      });
      expect(result).toBeDefined();
    });

    test('Given 無效授權 When 儲存名片 Then 應拒絕操作', async () => {
      // Given
      mockSecurityAuth.validateAccess.mockReturnValue({ 
        authorized: false, 
        reason: 'Access denied' 
      });
      const cardData = { name: '測試', email: 'test@example.com' };

      // When & Then
      await expect(storage.storeCard(cardData)).rejects.toThrow('存取被拒絕: Access denied');
    });

    test('Given 刪除操作 When 檢查授權 Then 應包含資源ID', async () => {
      // Given
      const cardId = 'card123';
      mockSecurityAuth.validateAccess.mockReturnValue({ authorized: true });

      // When
      await storage.deleteCard(cardId);

      // Then
      expect(mockSecurityAuth.validateAccess).toHaveBeenCalledWith('card-data', 'delete', {
        userId: 'current-user',
        resourceId: cardId,
        timestamp: expect.any(Number)
      });
    });
  });

  // TC-SECURITY-002: 安全日誌測試
  describe('TC-SECURITY-002: Security Logging', () => {
    test('Given 成功操作 When 記錄日誌 Then 應記錄適當資訊', async () => {
      // Given
      const cardId = 'card123';

      // When
      await storage.deleteCard(cardId);

      // Then
      expect(mockSecurityData.secureLog).toHaveBeenCalledWith('info', 'Card deleted', {
        cardId: cardId,
        operation: 'deleteCard'
      });
    });

    test('Given 操作失敗 When 記錄日誌 Then 應記錄錯誤資訊', async () => {
      // Given
      storage.db = null; // 模擬資料庫錯誤
      const cardData = { name: '測試' };

      // When
      try {
        await storage.storeCard(cardData);
      } catch (error) {
        // Expected error
      }

      // Then
      expect(mockSecurityData.secureLog).toHaveBeenCalledWith('error', 'Store card failed', {
        error: expect.any(String),
        operation: 'storeCard'
      });
    });

    test('Given 敏感資料 When 記錄日誌 Then 不應洩露敏感資訊', async () => {
      // Given
      const sensitiveData = {
        name: '機密人員',
        email: 'secret@classified.gov',
        phone: '0912345678'
      };

      // When
      try {
        await storage.storeCard(sensitiveData);
      } catch (error) {
        // Expected if auth fails
      }

      // Then - 檢查日誌不包含敏感資料
      const logCalls = mockSecurityData.secureLog.mock.calls;
      logCalls.forEach(call => {
        const logData = JSON.stringify(call);
        expect(logData).not.toContain('secret@classified.gov');
        expect(logData).not.toContain('0912345678');
      });
    });
  });

  // TC-SECURITY-003: 注入攻擊防護測試
  describe('TC-SECURITY-003: Injection Attack Protection', () => {
    test('Given XSS攻擊載荷 When 處理資料 Then 應安全處理', async () => {
      // Given
      const xssPayload = {
        name: '<script>alert("XSS")</script>',
        email: 'test@example.com',
        greetings: ['<img src=x onerror=alert("XSS")>']
      };

      // When
      const normalized = storage.normalizeCardDataForStorage(xssPayload);

      // Then
      expect(normalized.name).toBe('<script>alert("XSS")</script>'); // 保持原樣但不執行
      expect(normalized.greetings[0]).toBe('<img src=x onerror=alert("XSS")>');
      // 重要：資料被保存但不會在渲染時執行
    });

    test('Given SQL注入嘗試 When 生成指紋 Then 應安全處理', async () => {
      // Given
      const sqlInjection = {
        name: "'; DROP TABLE cards; --",
        email: 'test@example.com'
      };

      // When
      const fingerprint = await storage.generateFingerprintSafe(sqlInjection);

      // Then
      expect(fingerprint).toBeDefined();
      expect(fingerprint).toMatch(/^fingerprint_/);
      // 指紋生成不應受SQL注入影響
    });

    test('Given 物件注入 When 處理資料 Then 應防止原型污染', async () => {
      // Given
      const prototypePoison = {
        name: '測試',
        email: 'test@example.com',
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } }
      };

      // When
      const normalized = storage.normalizeCardDataForStorage(prototypePoison);

      // Then
      expect(normalized.__proto__).toBeUndefined();
      expect(normalized.constructor).toBe('');
      expect(Object.prototype.polluted).toBeUndefined();
    });
  });

  // TC-SECURITY-004: 資料完整性測試
  describe('TC-SECURITY-004: Data Integrity', () => {
    test('Given 篡改的校驗和 When 驗證資料 Then 應檢測到篡改', async () => {
      // Given
      const originalData = { name: '測試', email: 'test@example.com' };
      const validChecksum = await storage.calculateChecksum(originalData);
      const tamperedChecksum = 'tampered_checksum';

      // When
      const isValid = await storage.verifyDataIntegrity(originalData, tamperedChecksum);

      // Then
      expect(isValid).toBe(false);
    });

    test('Given 正確的校驗和 When 驗證資料 Then 應通過驗證', async () => {
      // Given
      const originalData = { name: '測試', email: 'test@example.com' };
      const validChecksum = await storage.calculateChecksum(originalData);

      // When
      const isValid = await storage.verifyDataIntegrity(originalData, validChecksum);

      // Then
      expect(isValid).toBe(true);
    });
  });

  // TC-SECURITY-005: 加密功能測試
  describe('TC-SECURITY-005: Encryption Features', () => {
    test('Given 加密金鑰可用 When 加密資料 Then 應成功加密', async () => {
      // Given
      storage.encryptionKey = await createMockEncryptionKey();
      storage.encryptionSalt = new Uint8Array(32);
      const sensitiveData = { name: '機密', email: 'secret@gov.tw' };

      // When
      const encrypted = await storage.encryptData(sensitiveData);

      // Then
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.algorithm).toBe('AES-GCM');
      expect(encrypted.data).not.toEqual(sensitiveData);
    });

    test('Given 加密資料 When 解密 Then 應還原原始資料', async () => {
      // Given
      storage.encryptionKey = await createMockEncryptionKey();
      storage.encryptionSalt = new Uint8Array(32);
      const originalData = { name: '測試', email: 'test@example.com' };
      const encrypted = await storage.encryptData(originalData);

      // When
      const decrypted = await storage.decryptData(encrypted);

      // Then
      expect(decrypted).toEqual(originalData);
    });
  });

  // 輔助函數
  function createMockSecureDB() {
    return {
      transaction: jest.fn().mockImplementation(() => ({
        objectStore: jest.fn().mockImplementation(() => ({
          add: jest.fn().mockImplementation(() => ({
            onsuccess: null,
            onerror: null
          })),
          delete: jest.fn().mockImplementation(() => ({
            onsuccess: null,
            onerror: null
          })),
          index: jest.fn().mockImplementation(() => ({
            openCursor: jest.fn().mockImplementation(() => ({
              onsuccess: null,
              onerror: null
            }))
          }))
        }))
      })),
      close: jest.fn()
    };
  }

  async function createMockEncryptionKey() {
    // 模擬加密金鑰
    return {
      algorithm: { name: 'AES-GCM' },
      extractable: false,
      type: 'secret',
      usages: ['encrypt', 'decrypt']
    };
  }
});