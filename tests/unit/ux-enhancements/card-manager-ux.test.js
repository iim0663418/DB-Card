/**
 * CardManager UX Enhancement Tests
 * 測試 CardManager 所有 UX 功能
 * 
 * 測試範圍：
 * - 匯入狀態回饋 (setImportCallback, updateImportStatus)
 * - 雙語訊息支援 (getMessage, detectLanguage)
 * - 增強名片類型檢測 (detectCardTypeEnhanced)
 * - 改善錯誤處理 (handleSecureError)
 * - 多語言資料處理 (getBilingualCardData, getDisplayGreetings)
 */

describe('CardManager UX Enhancements', () => {
  let cardManager;
  let mockStorage;

  beforeEach(() => {
    // Mock storage
    mockStorage = {
      storeCard: jest.fn().mockResolvedValue('test-card-id'),
      getCard: jest.fn().mockResolvedValue({ 
        id: 'test-id', 
        data: { name: 'Test Card', title: 'Engineer' },
        type: 'personal'
      }),
      listCards: jest.fn().mockResolvedValue([]),
      updateCard: jest.fn().mockResolvedValue(true),
      deleteCard: jest.fn().mockResolvedValue(true),
      getStorageStats: jest.fn().mockResolvedValue({
        totalCards: 5,
        storageUsedPercent: 25
      }),
      getSetting: jest.fn().mockResolvedValue(null)
    };

    // 創建 CardManager 實例
    cardManager = new PWACardManager(mockStorage);
    cardManager.language = 'zh'; // 設定預設語言
  });

  afterEach(() => {
    jest.clearAllMocks();
    // 清理匯入回調
    cardManager.importCallbacks.clear();
  });

  describe('Import Status Callback System', () => {
    // REQ-UX-010: 匯入狀態回饋系統
    test('Given valid callback, When setImportCallback is called, Then callback should be stored', () => {
      // Given
      const operationId = 'import-operation';
      const mockCallback = jest.fn();

      // When
      cardManager.setImportCallback(operationId, mockCallback);

      // Then
      expect(cardManager.importCallbacks.get(operationId)).toBe(mockCallback);
    });

    test('Given invalid callback, When setImportCallback is called, Then callback should not be stored', () => {
      // Given
      const operationId = 'import-operation';
      const invalidCallback = 'not-a-function';

      // When
      cardManager.setImportCallback(operationId, invalidCallback);

      // Then
      expect(cardManager.importCallbacks.has(operationId)).toBe(false);
    });

    test('Given registered callback, When updateImportStatus is called, Then callback should be invoked with correct data', () => {
      // Given
      const operationId = 'import-operation';
      const mockCallback = jest.fn();
      const status = 'processing';
      const progress = 75;
      const message = 'Processing cards...';
      
      cardManager.setImportCallback(operationId, mockCallback);

      // When
      cardManager.updateImportStatus(operationId, status, progress, message);

      // Then
      expect(mockCallback).toHaveBeenCalledWith({
        status,
        progress,
        message,
        timestamp: expect.any(String)
      });
    });

    test('Given no registered callback, When updateImportStatus is called, Then no error should occur', () => {
      // Given
      const operationId = 'non-existent-operation';

      // When & Then
      expect(() => {
        cardManager.updateImportStatus(operationId, 'processing', 50, 'Test');
      }).not.toThrow();
    });
  });

  describe('Multi-language Message System', () => {
    // REQ-UX-011: 雙語訊息支援
    test('Given Chinese language, When getMessage is called, Then Chinese message should be returned', () => {
      // Given
      cardManager.language = 'zh';

      // When
      const message = cardManager.getMessage('importing');

      // Then
      expect(message).toBe('正在匯入...');
    });

    test('Given English language, When getMessage is called, Then English message should be returned', () => {
      // Given
      cardManager.language = 'en';

      // When
      const message = cardManager.getMessage('importing');

      // Then
      expect(message).toBe('Importing...');
    });

    test('Given unknown message key, When getMessage is called, Then key should be returned as fallback', () => {
      // Given
      const unknownKey = 'unknown_message_key';

      // When
      const message = cardManager.getMessage(unknownKey);

      // Then
      expect(message).toBe(unknownKey);
    });

    test('Given message with parameters, When getMessage is called, Then parameters should be substituted', () => {
      // Given
      cardManager.language = 'zh';
      const params = { count: 5 };

      // When
      const message = cardManager.getMessage('card_imported', params);

      // Then
      expect(message).toBe('已匯入 5 張名片');
    });

    test('Given English with parameters, When getMessage is called, Then English message with parameters should be returned', () => {
      // Given
      cardManager.language = 'en';
      const params = { count: 3 };

      // When
      const message = cardManager.getMessage('card_skipped', params);

      // Then
      expect(message).toBe('Skipped 3 cards');
    });
  });

  describe('Language Detection', () => {
    // REQ-UX-012: 語言檢測
    test('Given English navigator language, When detectLanguage is called, Then en should be returned', () => {
      // Given
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true
      });

      // When
      const language = cardManager.detectLanguage();

      // Then
      expect(language).toBe('en');
    });

    test('Given Chinese navigator language, When detectLanguage is called, Then zh should be returned', () => {
      // Given
      Object.defineProperty(navigator, 'language', {
        value: 'zh-TW',
        configurable: true
      });

      // When
      const language = cardManager.detectLanguage();

      // Then
      expect(language).toBe('zh');
    });

    test('Given other language, When detectLanguage is called, Then zh should be returned as default', () => {
      // Given
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true
      });

      // When
      const language = cardManager.detectLanguage();

      // Then
      expect(language).toBe('zh');
    });

    test('Given no navigator, When detectLanguage is called, Then zh should be returned as default', () => {
      // Given
      const originalNavigator = global.navigator;
      delete global.navigator;

      // When
      const language = cardManager.detectLanguage();

      // Then
      expect(language).toBe('zh');

      // Cleanup
      global.navigator = originalNavigator;
    });
  });

  describe('Enhanced Card Type Detection', () => {
    // REQ-UX-013: 增強名片類型檢測
    test('Given government card with explicit type, When detectCardTypeEnhanced is called, Then explicit type should be returned', () => {
      // Given
      const cardData = {
        cardType: 'official-bilingual',
        organization: '數位發展部',
        greetings: ['您好！', 'Hello!']
      };

      // When
      const result = cardManager.detectCardTypeEnhanced(cardData);

      // Then
      expect(result).toBe('official-bilingual');
    });

    test('Given government card without explicit type, When detectCardTypeEnhanced is called, Then type should be detected', () => {
      // Given
      const cardData = {
        organization: '數位發展部',
        address: '臺北市中正區延平南路143號'
      };

      // When
      const result = cardManager.detectCardTypeEnhanced(cardData);

      // Then
      expect(result).toBe('index'); // Government card, Chinese, Yanping building
    });

    test('Given bilingual government card, When detectCardTypeEnhanced is called, Then bilingual type should be detected', () => {
      // Given
      const cardData = {
        organization: '數位發展部',
        greetings: ['您好！', 'Hello!'],
        address: '臺北市中正區延平南路143號'
      };

      // When
      const result = cardManager.detectCardTypeEnhanced(cardData);

      // Then
      expect(result).toBe('bilingual');
    });

    test('Given personal English card, When detectCardTypeEnhanced is called, Then personal-en should be detected', () => {
      // Given
      const cardData = {
        name: 'John Smith',
        organization: 'Private Company'
      };

      // When
      const result = cardManager.detectCardTypeEnhanced(cardData);

      // Then
      expect(result).toBe('personal-en');
    });

    test('Given personal bilingual card, When detectCardTypeEnhanced is called, Then personal-bilingual should be detected', () => {
      // Given
      const cardData = {
        name: 'John Smith',
        greetings: ['您好！', 'Hello!'],
        organization: 'Private Company'
      };

      // When
      const result = cardManager.detectCardTypeEnhanced(cardData);

      // Then
      expect(result).toBe('personal-bilingual');
    });

    test('Given card with XinGuang address, When detectCardTypeEnhanced is called, Then XinGuang type should be detected', () => {
      // Given
      const cardData = {
        organization: 'Ministry of Digital Affairs',
        address: '99 Songren Rd., Xinyi Dist., Taipei City'
      };

      // When
      const result = cardManager.detectCardTypeEnhanced(cardData);

      // Then
      expect(result).toBe('en1'); // English government card, XinGuang building
    });

    test('Given invalid card data, When detectCardTypeEnhanced is called, Then personal should be returned as default', () => {
      // Given
      const invalidCardData = null;

      // When
      const result = cardManager.detectCardTypeEnhanced(invalidCardData);

      // Then
      expect(result).toBe('personal');
    });
  });

  describe('Bilingual Data Processing', () => {
    // REQ-UX-014: 雙語資料處理
    test('Given bilingual card data, When getBilingualCardData is called with Chinese, Then Chinese data should be returned', () => {
      // Given
      const cardData = {
        name: '王小明~John Wang',
        title: '工程師~Engineer',
        greetings: ['您好！~Hello!', '歡迎認識我！~Nice to meet you!']
      };

      // When
      const result = cardManager.getBilingualCardData(cardData, 'zh');

      // Then
      expect(result.name).toBe('王小明');
      expect(result.title).toBe('工程師');
      expect(result.greetings).toEqual(['您好！~Hello!', '歡迎認識我！~Nice to meet you!']);
    });

    test('Given bilingual card data, When getBilingualCardData is called with English, Then English data should be returned', () => {
      // Given
      const cardData = {
        name: '王小明~John Wang',
        title: '工程師~Engineer',
        department: '數位策略司'
      };

      // When
      const result = cardManager.getBilingualCardData(cardData, 'en');

      // Then
      expect(result.name).toBe('John Wang');
      expect(result.title).toBe('Engineer');
      expect(result.department).toBe('數位策略司'); // Department remains in original language
    });

    test('Given object format bilingual data, When getBilingualCardData is called, Then correct language should be extracted', () => {
      // Given
      const cardData = {
        name: { zh: '王小明', en: 'John Wang' },
        title: { zh: '工程師', en: 'Engineer' }
      };

      // When
      const result = cardManager.getBilingualCardData(cardData, 'en');

      // Then
      expect(result.name).toBe('John Wang');
      expect(result.title).toBe('Engineer');
    });

    test('Given malformed object data, When getBilingualCardData is called, Then should handle gracefully', () => {
      // Given
      const cardData = {
        name: { invalid: 'data' },
        title: null,
        department: undefined
      };

      // When
      const result = cardManager.getBilingualCardData(cardData, 'zh');

      // Then
      expect(result.name).toBe('');
      expect(result.title).toBe('');
      expect(result.department).toBe('');
    });
  });

  describe('Display Greetings Processing', () => {
    // REQ-UX-015: 問候語顯示處理
    test('Given bilingual greetings array, When getDisplayGreetings is called with Chinese, Then Chinese greetings should be returned', () => {
      // Given
      const greetings = ['您好！~Hello!', '歡迎認識我！~Nice to meet you!'];

      // When
      const result = cardManager.getDisplayGreetings(greetings, 'zh');

      // Then
      expect(result).toEqual(['您好！', '歡迎認識我！']);
    });

    test('Given bilingual greetings array, When getDisplayGreetings is called with English, Then English greetings should be returned', () => {
      // Given
      const greetings = ['您好！~Hello!', '歡迎認識我！~Nice to meet you!'];

      // When
      const result = cardManager.getDisplayGreetings(greetings, 'en');

      // Then
      expect(result).toEqual(['Hello!', 'Nice to meet you!']);
    });

    test('Given single bilingual greeting string, When getDisplayGreetings is called, Then correct language should be extracted', () => {
      // Given
      const greetings = '您好！~Hello!';

      // When
      const resultZh = cardManager.getDisplayGreetings(greetings, 'zh');
      const resultEn = cardManager.getDisplayGreetings(greetings, 'en');

      // Then
      expect(resultZh).toEqual(['您好！']);
      expect(resultEn).toEqual(['Hello!']);
    });

    test('Given empty greetings, When getDisplayGreetings is called, Then default greeting should be returned', () => {
      // Given
      const greetings = null;

      // When
      const result = cardManager.getDisplayGreetings(greetings, 'zh');

      // Then
      expect(result).toEqual(['歡迎認識我！']);
    });

    test('Given malformed greetings, When getDisplayGreetings is called, Then should handle gracefully', () => {
      // Given
      const greetings = [null, '', '[object Object]', undefined];

      // When
      const result = cardManager.getDisplayGreetings(greetings, 'zh');

      // Then
      expect(result).toEqual(['歡迎認識我！']); // Should return default
    });
  });

  describe('Individual Greeting Display', () => {
    // REQ-UX-016: 單個問候語顯示
    test('Given bilingual greeting string, When getGreetingDisplayText is called, Then correct language should be returned', () => {
      // Given
      const greeting = '您好！~Hello!';

      // When
      const resultZh = cardManager.getGreetingDisplayText(greeting, 'zh');
      const resultEn = cardManager.getGreetingDisplayText(greeting, 'en');

      // Then
      expect(resultZh).toBe('您好！');
      expect(resultEn).toBe('Hello!');
    });

    test('Given monolingual greeting, When getGreetingDisplayText is called, Then original text should be returned', () => {
      // Given
      const greeting = 'Welcome!';

      // When
      const result = cardManager.getGreetingDisplayText(greeting, 'zh');

      // Then
      expect(result).toBe('Welcome!');
    });

    test('Given null greeting, When getGreetingDisplayText is called, Then null should be returned', () => {
      // Given
      const greeting = null;

      // When
      const result = cardManager.getGreetingDisplayText(greeting, 'zh');

      // Then
      expect(result).toBeNull();
    });

    test('Given empty greeting, When getGreetingDisplayText is called, Then null should be returned', () => {
      // Given
      const greeting = '';

      // When
      const result = cardManager.getGreetingDisplayText(greeting, 'zh');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('Bilingual Name and Title Processing', () => {
    // REQ-UX-017: 雙語姓名和職稱處理
    test('Given separated bilingual name, When getBilingualName is called, Then correct language should be returned', () => {
      // Given
      const cardData = {
        nameZh: '王小明',
        nameEn: 'John Wang'
      };

      // When
      const resultZh = cardManager.getBilingualName(cardData, 'zh');
      const resultEn = cardManager.getBilingualName(cardData, 'en');

      // Then
      expect(resultZh).toBe('王小明');
      expect(resultEn).toBe('John Wang');
    });

    test('Given combined bilingual name, When getBilingualName is called, Then correct language should be extracted', () => {
      // Given
      const cardData = {
        name: '王小明~John Wang'
      };

      // When
      const resultZh = cardManager.getBilingualName(cardData, 'zh');
      const resultEn = cardManager.getBilingualName(cardData, 'en');

      // Then
      expect(resultZh).toBe('王小明');
      expect(resultEn).toBe('John Wang');
    });

    test('Given object format name, When getBilingualName is called, Then correct language should be extracted', () => {
      // Given
      const cardData = {
        name: { zh: '王小明', en: 'John Wang' }
      };

      // When
      const resultZh = cardManager.getBilingualName(cardData, 'zh');
      const resultEn = cardManager.getBilingualName(cardData, 'en');

      // Then
      expect(resultZh).toBe('王小明');
      expect(resultEn).toBe('John Wang');
    });

    test('Given bilingual title with translation, When getBilingualTitle is called, Then translation should be applied', () => {
      // Given
      const cardData = {
        title: '司長'
      };

      // When
      const resultEn = cardManager.getBilingualTitle(cardData, 'en');

      // Then
      expect(resultEn).toBe('Director General'); // Should be translated
    });
  });

  describe('File Import with Enhanced UX', () => {
    // REQ-UX-018: 檔案匯入增強 UX
    test('Given valid file with progress callback, When importFromFile is called, Then progress should be reported', async () => {
      // Given
      const operationId = 'file-import-test';
      const mockCallback = jest.fn();
      cardManager.setImportCallback(operationId, mockCallback);
      
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        size: 1024
      };
      
      jest.spyOn(cardManager, 'secureReadFile').mockResolvedValue(
        JSON.stringify({ name: 'Test Card', email: 'test@example.com' })
      );

      // When
      await cardManager.importFromFile(mockFile, { operationId });

      // Then
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'validating',
          progress: 5,
          message: expect.stringContaining('驗證')
        })
      );
    });

    test('Given emergency disable flag, When importFromFile is called, Then import should be blocked with friendly message', async () => {
      // Given
      window.EMERGENCY_DISABLE_IMPORT = true;
      const mockFile = { name: 'test.json', type: 'application/json', size: 1024 };

      // When
      const result = await cardManager.importFromFile(mockFile);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBe(cardManager.getMessage('permission_denied'));

      // Cleanup
      delete window.EMERGENCY_DISABLE_IMPORT;
    });

    test('Given oversized file, When importFromFile is called, Then size error should be returned', async () => {
      // Given
      const oversizedFile = {
        name: 'large.json',
        type: 'application/json',
        size: 11 * 1024 * 1024 // 11MB
      };

      // When
      const result = await cardManager.importFromFile(oversizedFile);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBe(cardManager.getMessage('file_too_large'));
    });

    test('Given unsupported file type, When importFromFile is called, Then format error should be returned', async () => {
      // Given
      const unsupportedFile = {
        name: 'test.txt',
        type: 'text/plain',
        size: 1024
      };

      // When
      const result = await cardManager.importFromFile(unsupportedFile);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBe(cardManager.getMessage('invalid_format'));
    });
  });

  describe('Security and Data Validation', () => {
    // REQ-SEC-002: 安全性和資料驗證
    test('Given malicious JSON, When secureJSONParse is called, Then prototype pollution should be prevented', () => {
      // Given
      const maliciousJSON = '{"__proto__": {"polluted": true}, "constructor": {"polluted": true}}';

      // When
      const result = cardManager.secureJSONParse(maliciousJSON);

      // Then
      expect(result.__proto__).toBeUndefined();
      expect(result.constructor).toBeUndefined();
      expect(Object.prototype.polluted).toBeUndefined();
    });

    test('Given invalid card data, When validateSingleCardData is called, Then validation should fail', () => {
      // Given
      const invalidData = {
        // Missing required name field
        email: 'test@example.com'
      };

      // When
      const result = cardManager.validateSingleCardData(invalidData);

      // Then
      expect(result).toBe(false);
    });

    test('Given oversized card data, When validateSingleCardData is called, Then validation should fail', () => {
      // Given
      const oversizedData = {
        name: 'x'.repeat(200), // Exceeds 100 character limit
        email: 'test@example.com'
      };

      // When
      const result = cardManager.validateSingleCardData(oversizedData);

      // Then
      expect(result).toBe(false);
    });

    test('Given valid card data, When sanitizeCardData is called, Then data should be properly sanitized', () => {
      // Given
      const unsafeData = {
        name: 'John Doe',
        email: 'x'.repeat(200), // Will be truncated
        socialNote: 'x'.repeat(600), // Will be truncated
        greetings: ['Hello', 'Hi', 'x'.repeat(300)] // Last one will be truncated
      };

      // When
      const result = cardManager.sanitizeCardData(unsafeData);

      // Then
      expect(result.name).toBe('John Doe');
      expect(result.email.length).toBe(100); // Truncated to 100 chars
      expect(result.socialNote.length).toBe(500); // Truncated to 500 chars
      expect(result.greetings[2].length).toBe(200); // Truncated to 200 chars
    });

    test('Given malformed card data, When sanitizeCardData is called, Then should return null', () => {
      // Given
      const malformedData = 'not an object';

      // When
      const result = cardManager.sanitizeCardData(malformedData);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('Error Handling and User Experience', () => {
    // REQ-UX-019: 錯誤處理和用戶體驗
    test('Given processing error, When handleSecureError is called, Then user-friendly error should be returned', () => {
      // Given
      const error = new Error('Database connection failed');
      const context = 'card_import';

      // When
      const result = cardManager.handleSecureError(error, context);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBe('操作失敗，請稍後再試');
    });

    test('Given card processing with invalid data, When addCard is called, Then should handle gracefully', async () => {
      // Given
      const invalidCardData = {
        name: null,
        greetings: [{ invalid: 'object' }, null, undefined]
      };
      
      jest.spyOn(cardManager, 'preprocessCardData').mockReturnValue({
        name: '',
        greetings: ['歡迎認識我！~Nice to meet you!']
      });

      // When
      const result = await cardManager.addCard(invalidCardData);

      // Then
      expect(result.success).toBe(true);
      expect(mockStorage.storeCard).toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    // REQ-UX-020: 統計和監控
    test('Given storage stats, When getStats is called, Then formatted stats should be returned', async () => {
      // Given
      mockStorage.getStorageStats.mockResolvedValue({
        totalCards: 25,
        storageUsedPercent: 45
      });
      mockStorage.getSetting.mockResolvedValue({
        timestamp: '2023-12-01T10:00:00Z',
        status: 'healthy'
      });

      // When
      const result = await cardManager.getStats();

      // Then
      expect(result).toEqual({
        totalCards: 25,
        storageUsed: 45,
        lastSync: '2023/12/1',
        healthStatus: 'healthy'
      });
    });

    test('Given storage error, When getStats is called, Then default stats should be returned', async () => {
      // Given
      mockStorage.getStorageStats.mockRejectedValue(new Error('Storage error'));

      // When
      const result = await cardManager.getStats();

      // Then
      expect(result).toEqual({
        totalCards: 0,
        storageUsed: 0,
        lastSync: '從未',
        healthStatus: 'error'
      });
    });
  });

  describe('Data Preprocessing and Format Handling', () => {
    // REQ-UX-021: 資料預處理和格式處理
    test('Given complex bilingual data, When preprocessCardData is called, Then data should be properly normalized', () => {
      // Given
      const complexData = {
        name: { zh: '王小明', en: 'John Wang' },
        title: '工程師~Engineer',
        greetings: [
          { zh: '您好', en: 'Hello' },
          '歡迎~Welcome',
          null,
          undefined,
          { invalid: 'object' }
        ]
      };

      // When
      const result = cardManager.preprocessCardData(complexData);

      // Then
      expect(result.name).toBe('王小明~John Wang');
      expect(result.title).toBe('工程師~Engineer');
      expect(result.greetings).toEqual([
        '您好~Hello',
        '歡迎~Welcome',
        '歡迎認識我！~Nice to meet you!'
      ]);
    });

    test('Given object with [object Object] issue, When preprocessCardData is called, Then should be handled gracefully', () => {
      // Given
      const problematicData = {
        name: { corrupted: true },
        greetings: [{ corrupted: true }]
      };

      // When
      const result = cardManager.preprocessCardData(problematicData);

      // Then
      expect(result.name).toBe('');
      expect(result.greetings).toEqual(['歡迎認識我！~Nice to meet you!']); // Default fallback
    });
  });

  describe('Performance and Optimization', () => {
    // REQ-PERF-002: 性能優化
    test('Given large dataset, When listCards is called, Then should complete within reasonable time', async () => {
      // Given
      const largeCardSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `card-${i}`,
        data: { name: `Card ${i}`, email: `card${i}@example.com` }
      }));
      mockStorage.listCards.mockResolvedValue(largeCardSet);

      const startTime = Date.now();

      // When
      const result = await cardManager.listCards();

      // Then
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(result).toHaveLength(1000);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('Given bilingual processing of many cards, When getBilingualCardData is called multiple times, Then should be efficient', () => {
      // Given
      const cardData = {
        name: '王小明~John Wang',
        title: '工程師~Engineer',
        greetings: ['您好！~Hello!', '歡迎認識我！~Nice to meet you!']
      };

      const startTime = Date.now();

      // When
      for (let i = 0; i < 100; i++) {
        cardManager.getBilingualCardData(cardData, i % 2 === 0 ? 'zh' : 'en');
      }

      // Then
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});