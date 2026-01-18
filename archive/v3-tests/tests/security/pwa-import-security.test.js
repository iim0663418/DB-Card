/**
 * PWA 匯入功能完整安全測試套件
 * 覆蓋所有 8 個 Critical 級別安全漏洞
 * 符合 OWASP ASVS 4.0 標準
 */

describe('PWA 匯入功能安全測試', () => {
  let cardManager;
  let transferManager;
  let storage;

  beforeEach(() => {
    // 重置全域安全標誌
    global.EMERGENCY_DISABLE_IMPORT = false;
    global.MOCK_AUTH_FAIL = false;
    delete Object.prototype.polluted;

    // 模擬 PWA 儲存系統
    storage = {
      storeCard: jest.fn().mockResolvedValue('card_123'),
      getCard: jest.fn().mockResolvedValue(null),
      listCards: jest.fn().mockResolvedValue([])
    };

    // 模擬安全授權處理器
    global.SecurityAuthHandler = {
      hasPermission: jest.fn().mockReturnValue(true)
    };

    // 模擬安全監控器
    global.SecurityMonitor = {
      logSecurityEvent: jest.fn()
    };

    // 初始化管理器
    cardManager = new global.PWACardManager(storage);
    transferManager = new global.TransferManager(cardManager);
  });

  afterEach(() => {
    // 清理原型污染
    delete Object.prototype.polluted;
    delete Object.prototype.__proto__;
    delete Object.prototype.constructor;
    
    // 重置 mock
    jest.clearAllMocks();
  });

  // ========== SEC-PWA-001: 檔案上傳攻擊防護 ==========
  describe('SEC-PWA-001: 檔案上傳攻擊防護', () => {
    test('應拒絕不安全的檔案類型', async () => {
      const maliciousFile = new global.File(['test'], 'malicious.exe', { type: 'application/x-executable' });
      
      const result = await cardManager.importFromFile(maliciousFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支援的檔案格式');
    });

    test('應拒絕超大檔案', async () => {
      const hugeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const hugeFile = new global.File([hugeContent], 'huge.json', { type: 'application/json' });
      
      const result = await cardManager.importFromFile(hugeFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('檔案大小超過限制');
    });

    test('應檢測路徑遍歷攻擊', async () => {
      const maliciousFile = new global.File(['{}'], '../../../etc/passwd', { type: 'application/json' });
      
      const result = await cardManager.importFromFile(maliciousFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('操作失敗');
    });

    test('應限制檔案內容大小', async () => {
      const oversizeContent = 'x'.repeat(51 * 1024 * 1024); // 51MB 文字
      const oversizeFile = new global.File([oversizeContent], 'oversize.json', { type: 'application/json' });
      
      const result = await transferManager.importData(oversizeFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('操作失敗');
    });
  });

  // ========== SEC-PWA-002: JSON.parse Prototype Pollution 防護 ==========
  describe('SEC-PWA-002: JSON.parse Prototype Pollution 防護', () => {
    test('應防止 __proto__ 污染', async () => {
      const maliciousJson = JSON.stringify({
        "__proto__": { "polluted": true },
        "cards": [{ "id": "test", "type": "personal", "data": { "name": "Test" } }]
      });
      const maliciousFile = new global.File([maliciousJson], 'malicious.json', { type: 'application/json' });
      
      await transferManager.importData(maliciousFile);
      
      expect(Object.prototype.polluted).toBeUndefined();
    });

    test('應防止 constructor 污染', async () => {
      const maliciousJson = JSON.stringify({
        "constructor": { "prototype": { "polluted": true } },
        "cards": [{ "id": "test", "type": "personal", "data": { "name": "Test" } }]
      });
      const maliciousFile = new global.File([maliciousJson], 'constructor.json', { type: 'application/json' });
      
      await transferManager.importData(maliciousFile);
      
      expect(Object.prototype.polluted).toBeUndefined();
    });

    test('應防止 prototype 直接污染', async () => {
      const maliciousJson = JSON.stringify({
        "prototype": { "polluted": true },
        "cards": [{ "id": "test", "type": "personal", "data": { "name": "Test" } }]
      });
      const maliciousFile = new global.File([maliciousJson], 'prototype.json', { type: 'application/json' });
      
      await transferManager.importData(maliciousFile);
      
      expect(Object.prototype.polluted).toBeUndefined();
    });
  });

  // ========== SEC-PWA-003: 授權檢查缺失防護 ==========
  describe('SEC-PWA-003: 授權檢查缺失防護', () => {
    test('應檢查匯入權限', async () => {
      global.SecurityAuthHandler.hasPermission.mockReturnValue(false);
      
      const validFile = new global.File([JSON.stringify({ cards: [] })], 'valid.json', { type: 'application/json' });
      const result = await cardManager.importFromFile(validFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('無權限執行匯入操作');
      expect(global.SecurityAuthHandler.hasPermission).toHaveBeenCalledWith('import');
    });

    test('應檢查轉移管理器權限', async () => {
      global.SecurityAuthHandler.hasPermission.mockReturnValue(false);
      
      const validFile = new global.File([JSON.stringify({ cards: [] })], 'valid.json', { type: 'application/json' });
      const result = await transferManager.importData(validFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('無權限執行匯入操作');
    });

    test('應在有權限時允許操作', async () => {
      global.SecurityAuthHandler.hasPermission.mockReturnValue(true);
      
      const validData = { cards: [{ id: "test", type: "personal", data: { name: "Test User" } }] };
      const validFile = new global.File([JSON.stringify(validData)], 'valid.json', { type: 'application/json' });
      
      const result = await transferManager.importData(validFile);
      
      expect(global.SecurityAuthHandler.hasPermission).toHaveBeenCalledWith('import');
      expect(result.success).toBe(true);
    });
  });

  // ========== SEC-PWA-004: PII 資料洩露防護 ==========
  describe('SEC-PWA-004: PII 資料洩露防護', () => {
    test('應遮罩錯誤訊息中的電子郵件', () => {
      const sensitiveData = 'user@example.com failed to import';
      const masked = transferManager.maskSensitiveData(sensitiveData);
      
      expect(masked).toContain('[email]');
      expect(masked).not.toContain('user@example.com');
    });

    test('應遮罩錯誤訊息中的電話號碼', () => {
      const sensitiveData = 'Phone 1234567890 validation failed';
      const masked = transferManager.maskSensitiveData(sensitiveData);
      
      expect(masked).toContain('[number]');
      expect(masked).not.toContain('1234567890');
    });

    test('應遮罩中文姓名', () => {
      const sensitiveData = '張三的名片匯入失敗';
      const masked = transferManager.maskSensitiveData(sensitiveData);
      
      expect(masked).toContain('[name]');
      expect(masked).not.toContain('張三');
    });

    test('應記錄安全事件不含敏感資料', async () => {
      const fileWithSensitiveData = new global.File(['{}'], 'user@company.com-cards.json', { type: 'application/json' });
      
      await transferManager.importData(fileWithSensitiveData);
      
      expect(global.SecurityMonitor.logSecurityEvent).toHaveBeenCalledWith(
        'import_attempt',
        expect.objectContaining({
          filename: expect.stringContaining('[email]')
        })
      );
    });
  });

  // ========== SEC-PWA-005: 不安全的檔案處理防護 ==========
  describe('SEC-PWA-005: 不安全的檔案處理防護', () => {
    test('應檢測檔案名稱中的目錄遍歷', async () => {
      const traversalFile = new global.File(['{}'], '../config.json', { type: 'application/json' });
      
      const result = await transferManager.secureReadFile(traversalFile);
      
      await expect(result).rejects.toThrow('不安全的檔案名稱');
    });

    test('應檢測反斜線路徑分隔符', async () => {
      const windowsTraversal = new global.File(['{}'], '..\\config.json', { type: 'application/json' });
      
      const result = transferManager.secureReadFile(windowsTraversal);
      
      await expect(result).rejects.toThrow('不安全的檔案名稱');
    });

    test('應檢測絕對路徑', async () => {
      const absolutePath = new global.File(['{}'], '/etc/passwd', { type: 'application/json' });
      
      const result = transferManager.secureReadFile(absolutePath);
      
      await expect(result).rejects.toThrow('不安全的檔案名稱');
    });

    test('應限制檔案內容處理大小', async () => {
      const oversizeContent = 'x'.repeat(51 * 1024 * 1024); // 51MB
      const oversizeFile = new global.File([oversizeContent], 'huge.json', { type: 'application/json' });
      
      // 模擬 FileReader 返回超大內容
      const originalReadAsText = global.FileReader.prototype.readAsText;
      global.FileReader.prototype.readAsText = function(file) {
        setTimeout(() => {
          this.result = oversizeContent;
          this.readyState = 2;
          if (this.onload) {
            this.onload({ target: this });
          }
        }, 0);
      };
      
      const result = transferManager.secureReadFile(oversizeFile);
      
      await expect(result).rejects.toThrow('檔案內容過大');
      
      // 還原原始方法
      global.FileReader.prototype.readAsText = originalReadAsText;
    });
  });

  // ========== SEC-PWA-006: 資料注入攻擊防護 ==========
  describe('SEC-PWA-006: 資料注入攻擊防護', () => {
    test('應限制名稱欄位長度', async () => {
      const longName = 'x'.repeat(150); // 超過 100 字元限制
      const attackData = {
        cards: [{
          id: "test",
          type: "personal",
          data: { name: longName }
        }]
      };
      const attackFile = new global.File([JSON.stringify(attackData)], 'attack.json', { type: 'application/json' });
      
      const result = await transferManager.importData(attackFile);
      
      expect(result.success).toBe(true);
      expect(storage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^.{1,100}$/)
        })
      );
    });

    test('應限制問候語數量', async () => {
      const tooManyGreetings = Array(15).fill('Hello'); // 超過 10 個限制
      const attackData = {
        cards: [{
          id: "test",
          type: "personal",
          data: { 
            name: "Test",
            greetings: tooManyGreetings
          }
        }]
      };
      const attackFile = new global.File([JSON.stringify(attackData)], 'attack.json', { type: 'application/json' });
      
      const result = await transferManager.importData(attackFile);
      
      expect(result.success).toBe(true);
      expect(storage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          greetings: expect.arrayContaining([])
        })
      );
      const storedData = storage.storeCard.mock.calls[0][0];
      expect(storedData.greetings.length).toBeLessThanOrEqual(10);
    });

    test('應清理 HTML 標籤', async () => {
      const htmlInjection = '<script>alert("XSS")</script>Test Name';
      const attackData = {
        cards: [{
          id: "test",
          type: "personal",
          data: { name: htmlInjection }
        }]
      };
      const attackFile = new global.File([JSON.stringify(attackData)], 'attack.json', { type: 'application/json' });
      
      const result = await transferManager.importData(attackFile);
      
      expect(result.success).toBe(true);
      expect(storage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.not.stringContaining('<script>')
        })
      );
    });

    test('應限制名片總數', async () => {
      const tooManyCards = Array(1001).fill().map((_, i) => ({
        id: `card_${i}`,
        type: "personal",
        data: { name: `User ${i}` }
      }));
      const attackData = { cards: tooManyCards };
      const attackFile = new global.File([JSON.stringify(attackData)], 'attack.json', { type: 'application/json' });
      
      const result = await transferManager.importData(attackFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('操作失敗');
    });
  });

  // ========== SEC-PWA-007: 不安全的反序列化防護 ==========
  describe('SEC-PWA-007: 不安全的反序列化防護', () => {
    test('應驗證資料結構完整性', async () => {
      const invalidData = { invalid: "structure" };
      const invalidFile = new global.File([JSON.stringify(invalidData)], 'invalid.json', { type: 'application/json' });
      
      const result = await transferManager.importData(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('檔案格式不正確');
    });

    test('應驗證名片物件必要欄位', async () => {
      const incompleteCard = {
        cards: [{
          id: "test"
          // 缺少 type 和 data
        }]
      };
      const incompleteFile = new global.File([JSON.stringify(incompleteCard)], 'incomplete.json', { type: 'application/json' });
      
      const result = await transferManager.importData(incompleteFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('檔案格式不正確');
    });

    test('應驗證名片資料名稱欄位', async () => {
      const namelessCard = {
        cards: [{
          id: "test",
          type: "personal",
          data: { title: "Manager" } // 缺少 name
        }]
      };
      const namelessFile = new global.File([JSON.stringify(namelessCard)], 'nameless.json', { type: 'application/json' });
      
      const result = await transferManager.importData(namelessFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('檔案格式不正確');
    });

    test('應處理有效的資料結構', async () => {
      const validData = {
        version: "1.0",
        cards: [{
          id: "test",
          type: "personal",
          data: { name: "Valid User" }
        }]
      };
      const validFile = new global.File([JSON.stringify(validData)], 'valid.json', { type: 'application/json' });
      
      const result = await transferManager.importData(validFile);
      
      expect(result.success).toBe(true);
      expect(storage.storeCard).toHaveBeenCalled();
    });
  });

  // ========== SEC-PWA-008: 錯誤處理資訊洩露防護 ==========
  describe('SEC-PWA-008: 錯誤處理資訊洩露防護', () => {
    test('應返回通用錯誤訊息', async () => {
      // 強制拋出內部錯誤
      storage.storeCard.mockRejectedValue(new Error('Internal database connection failed at server 192.168.1.100'));
      
      const validData = {
        cards: [{
          id: "test",
          type: "personal", 
          data: { name: "Test User" }
        }]
      };
      const validFile = new global.File([JSON.stringify(validData)], 'test.json', { type: 'application/json' });
      
      const result = await transferManager.importData(validFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('操作失敗，請稍後再試');
      expect(result.error).not.toContain('192.168.1.100');
      expect(result.error).not.toContain('database');
    });

    test('應記錄安全事件', async () => {
      storage.storeCard.mockRejectedValue(new Error('Internal error'));
      
      const validData = {
        cards: [{
          id: "test",
          type: "personal",
          data: { name: "Test User" }
        }]
      };
      const validFile = new global.File([JSON.stringify(validData)], 'test.json', { type: 'application/json' });
      
      await transferManager.importData(validFile);
      
      expect(global.SecurityMonitor.logSecurityEvent).toHaveBeenCalledWith(
        'error_occurred',
        expect.objectContaining({
          context: 'import_failed',
          timestamp: expect.any(String)
        })
      );
    });

    test('應在名片管理器中使用安全錯誤處理', async () => {
      storage.storeCard.mockRejectedValue(new Error('Database connection lost'));
      
      const validData = { name: "Test User" };
      const validFile = new global.File([JSON.stringify(validData)], 'test.json', { type: 'application/json' });
      
      const result = await cardManager.importFromFile(validFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('操作失敗，請稍後再試');
    });
  });

  // ========== 緊急停用機制測試 ==========
  describe('緊急停用機制', () => {
    test('應在緊急停用時拒絕所有匯入', async () => {
      global.EMERGENCY_DISABLE_IMPORT = true;
      
      const validFile = new global.File([JSON.stringify({ cards: [] })], 'valid.json', { type: 'application/json' });
      
      const cardManagerResult = await cardManager.importFromFile(validFile);
      const transferManagerResult = await transferManager.importData(validFile);
      
      expect(cardManagerResult.success).toBe(false);
      expect(cardManagerResult.error).toContain('匯入功能已暫時停用');
      
      expect(transferManagerResult.success).toBe(false);
      expect(transferManagerResult.error).toContain('匯入功能已暫時停用');
    });

    test('應在正常狀態時允許匯入', async () => {
      global.EMERGENCY_DISABLE_IMPORT = false;
      
      const validData = {
        cards: [{
          id: "test",
          type: "personal",
          data: { name: "Test User" }
        }]
      };
      const validFile = new global.File([JSON.stringify(validData)], 'valid.json', { type: 'application/json' });
      
      const result = await transferManager.importData(validFile);
      
      expect(result.success).toBe(true);
    });
  });

  // ========== 正常功能驗證測試 ==========
  describe('正常功能驗證', () => {
    test('應成功匯入有效的名片資料', async () => {
      const validData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        cards: [
          {
            id: "card_1",
            type: "personal",
            data: {
              name: "張三",
              title: "軟體工程師",
              email: "zhang@example.com",
              phone: "02-1234-5678",
              mobile: "0912-345-678"
            },
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: "1.0"
          },
          {
            id: "card_2", 
            type: "bilingual",
            data: {
              name: "李四~John Lee",
              title: "產品經理~Product Manager",
              email: "lee@company.com",
              greetings: ["歡迎認識我！~Nice to meet you!"]
            }
          }
        ]
      };
      
      const validFile = new global.File([JSON.stringify(validData)], 'export.json', { type: 'application/json' });
      
      const result = await transferManager.importData(validFile);
      
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.totalCards).toBe(2);
      expect(storage.storeCard).toHaveBeenCalledTimes(2);
    });

    test('應正確處理不同的名片類型', async () => {
      const governmentCard = {
        cards: [{
          id: "gov_card",
          type: "index",
          data: {
            name: "王五",
            title: "科長", 
            department: "數位策略司",
            email: "wang@moda.gov.tw"
          }
        }]
      };
      
      const govFile = new global.File([JSON.stringify(governmentCard)], 'gov.json', { type: 'application/json' });
      
      const result = await transferManager.importData(govFile);
      
      expect(result.success).toBe(true);
      expect(storage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "王五",
          organization: "數位發展部" // 應套用類型預設值
        })
      );
    });

    test('應處理空的匯入檔案', async () => {
      const emptyData = { cards: [] };
      const emptyFile = new global.File([JSON.stringify(emptyData)], 'empty.json', { type: 'application/json' });
      
      const result = await transferManager.importData(emptyFile);
      
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
      expect(result.totalCards).toBe(0);
    });
  });

  // ========== OWASP ASVS 4.0 合規測試 ==========
  describe('OWASP ASVS 4.0 合規測試', () => {
    test('V5.1.1: 檔案上傳類型白名單驗證', async () => {
      const scriptFile = new global.File(['malicious'], 'script.js', { type: 'application/javascript' });
      
      const result = await cardManager.importFromFile(scriptFile);
      
      expect(result.success).toBe(false);
    });

    test('V5.1.2: 檔案大小限制', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const largeFile = new global.File([largeContent], 'large.json', { type: 'application/json' });
      
      const result = await transferManager.importData(largeFile);
      
      expect(result.success).toBe(false);
    });

    test('V4.1.1: 授權檢查機制', async () => {
      global.SecurityAuthHandler.hasPermission.mockReturnValue(false);
      
      const file = new global.File(['{}'], 'test.json', { type: 'application/json' });
      const result = await cardManager.importFromFile(file);
      
      expect(result.success).toBe(false);
      expect(global.SecurityAuthHandler.hasPermission).toHaveBeenCalledWith('import');
    });

    test('V7.1.1: 日誌安全處理', async () => {
      const sensitiveFile = new global.File(['{}'], 'user@secret.com.json', { type: 'application/json' });
      
      await transferManager.importData(sensitiveFile);
      
      expect(global.SecurityMonitor.logSecurityEvent).toHaveBeenCalledWith(
        'import_attempt',
        expect.objectContaining({
          filename: expect.not.stringContaining('secret.com')
        })
      );
    });
  });
});