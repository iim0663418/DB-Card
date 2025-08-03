/**
 * TransferManager UX Enhancement Tests
 * 測試 TransferManager 所有 UX 功能
 * 
 * 測試範圍：
 * - 進度回調系統 (setProgressCallback, updateProgress)
 * - 檔案大小警告 (checkFileSizeWarning)
 * - 用戶友善錯誤訊息 (getUserFriendlyError)
 * - 檔案驗證工具 (validateFileIntegrity)
 * - 批量處理優化 (createBatchProcessor)
 * - 格式轉換工具 (convertFormat)
 */

describe('TransferManager UX Enhancements', () => {
  let transferManager;
  let mockCardManager;
  let mockStorage;

  beforeEach(() => {
    // Mock storage
    mockStorage = {
      storeCard: jest.fn().mockResolvedValue('test-card-id'),
      getCard: jest.fn().mockResolvedValue({ id: 'test-id', data: { name: 'Test' } }),
      listCards: jest.fn().mockResolvedValue([]),
      deleteCard: jest.fn().mockResolvedValue(true),
      updateCard: jest.fn().mockResolvedValue(true)
    };

    // Mock CardManager
    mockCardManager = {
      storage: mockStorage,
      detectCardType: jest.fn().mockReturnValue('personal'),
      applyCardTypeDefaults: jest.fn().mockImplementation(data => data)
    };

    // 創建 TransferManager 實例
    transferManager = new TransferManager(mockCardManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // 清理進度回調
    transferManager.progressCallbacks.clear();
  });

  describe('Progress Callback System', () => {
    // REQ-UX-001: 進度回調系統
    test('Given valid callback, When setProgressCallback is called, Then callback should be stored', () => {
      // Given
      const operationId = 'test-operation';
      const mockCallback = jest.fn();

      // When
      transferManager.setProgressCallback(operationId, mockCallback);

      // Then
      expect(transferManager.progressCallbacks.get(operationId)).toBe(mockCallback);
    });

    test('Given invalid callback, When setProgressCallback is called, Then callback should not be stored', () => {
      // Given
      const operationId = 'test-operation';
      const invalidCallback = 'not-a-function';

      // When
      transferManager.setProgressCallback(operationId, invalidCallback);

      // Then
      expect(transferManager.progressCallbacks.has(operationId)).toBe(false);
    });

    test('Given registered callback, When updateProgress is called, Then callback should be invoked with correct data', () => {
      // Given
      const operationId = 'test-operation';
      const mockCallback = jest.fn();
      const progress = 50;
      const message = 'Processing...';
      
      transferManager.setProgressCallback(operationId, mockCallback);

      // When
      transferManager.updateProgress(operationId, progress, message);

      // Then
      expect(mockCallback).toHaveBeenCalledWith({
        progress,
        message,
        timestamp: expect.any(Number)
      });
    });

    test('Given no registered callback, When updateProgress is called, Then no error should occur', () => {
      // Given
      const operationId = 'non-existent-operation';

      // When & Then
      expect(() => {
        transferManager.updateProgress(operationId, 50, 'Test');
      }).not.toThrow();
    });

    test('Given rapid calls, When updateProgress is called within debounce period, Then only first call should execute', () => {
      // Given
      const operationId = 'test-operation';
      const mockCallback = jest.fn();
      transferManager.setProgressCallback(operationId, mockCallback);

      // When
      transferManager.updateProgress(operationId, 10, 'First');
      transferManager.updateProgress(operationId, 20, 'Second'); // Should be debounced

      // Then
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({
        progress: 10,
        message: 'First',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('File Size Warning System', () => {
    // REQ-UX-002: 檔案大小警告
    test('Given small file, When checkFileSizeWarning is called, Then no warnings should be returned', () => {
      // Given
      const smallFileSize = 1024 * 1024; // 1MB

      // When
      const warnings = transferManager.checkFileSizeWarning(smallFileSize);

      // Then
      expect(warnings).toEqual([]);
    });

    test('Given large file (>5MB), When checkFileSizeWarning is called, Then warning should be returned', () => {
      // Given
      const largeFileSize = 6 * 1024 * 1024; // 6MB

      // When
      const warnings = transferManager.checkFileSizeWarning(largeFileSize);

      // Then
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        level: 'warning',
        message: '檔案較大（超過 5MB），處理時間可能較長',
        code: 'LARGE_FILE'
      });
    });

    test('Given very large file (>8MB), When checkFileSizeWarning is called, Then high warning should be returned', () => {
      // Given
      const veryLargeFileSize = 9 * 1024 * 1024; // 9MB

      // When
      const warnings = transferManager.checkFileSizeWarning(veryLargeFileSize);

      // Then
      expect(warnings).toHaveLength(2);
      expect(warnings[0].level).toBe('warning');
      expect(warnings[1]).toEqual({
        level: 'high',
        message: '檔案很大（超過 8MB），建議分批處理',
        code: 'VERY_LARGE_FILE'
      });
    });
  });

  describe('User-Friendly Error Messages', () => {
    // REQ-UX-003: 用戶友善錯誤訊息
    test('Given authorization error, When getUserFriendlyError is called, Then friendly message should be returned', () => {
      // Given
      const error = new Error('Permission denied');
      jest.spyOn(transferManager, 'classifyError').mockReturnValue('authorization');
      jest.spyOn(transferManager, 'detectLanguage').mockReturnValue('zh');

      // When
      const result = transferManager.getUserFriendlyError(error, 'import');

      // Then
      expect(result).toEqual({
        message: '沒有權限執行此操作，請檢查登入狀態',
        code: 'AUTHORIZATION',
        context: 'import',
        timestamp: expect.any(String)
      });
    });

    test('Given file operation error in English, When getUserFriendlyError is called, Then English message should be returned', () => {
      // Given
      const error = new Error('File read failed');
      jest.spyOn(transferManager, 'classifyError').mockReturnValue('file_operation');
      jest.spyOn(transferManager, 'detectLanguage').mockReturnValue('en');

      // When
      const result = transferManager.getUserFriendlyError(error, 'export');

      // Then
      expect(result.message).toBe('File processing failed. Please check if the file is complete.');
      expect(result.code).toBe('FILE_OPERATION');
      expect(result.context).toBe('export');
    });

    test('Given unknown error type, When getUserFriendlyError is called, Then default message should be returned', () => {
      // Given
      const error = new Error('Unknown error');
      jest.spyOn(transferManager, 'classifyError').mockReturnValue('unknown');
      jest.spyOn(transferManager, 'detectLanguage').mockReturnValue('zh');

      // When
      const result = transferManager.getUserFriendlyError(error);

      // Then
      expect(result.message).toBe('操作失敗，請稍後再試');
    });
  });

  describe('File Validation Tool', () => {
    // REQ-UX-004: 檔案驗證工具
    test('Given valid JSON file, When validateFileIntegrity is called, Then validation should pass', () => {
      // Given
      const validFile = {
        name: 'cards.json',
        size: 1024
      };

      // When
      const result = transferManager.validateFileIntegrity(validFile);

      // Then
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('Given unsupported file format, When validateFileIntegrity is called, Then validation should fail', () => {
      // Given
      const invalidFile = {
        name: 'cards.txt',
        size: 1024
      };

      // When
      const result = transferManager.validateFileIntegrity(invalidFile);

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('不支援的檔案格式');
    });

    test('Given empty file, When validateFileIntegrity is called, Then validation should fail', () => {
      // Given
      const emptyFile = {
        name: 'cards.json',
        size: 0
      };

      // When
      const result = transferManager.validateFileIntegrity(emptyFile);

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('檔案為空');
    });

    test('Given oversized file, When validateFileIntegrity is called, Then validation should fail', () => {
      // Given
      const oversizedFile = {
        name: 'cards.json',
        size: 11 * 1024 * 1024 // 11MB
      };

      // When
      const result = transferManager.validateFileIntegrity(oversizedFile);

      // Then
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('檔案過大（超過 10MB）');
    });

    test('Given file with unsafe name, When validateFileIntegrity is called, Then warning should be included', () => {
      // Given
      const unsafeFile = {
        name: '../cards.json',
        size: 1024
      };

      // When
      const result = transferManager.validateFileIntegrity(unsafeFile);

      // Then
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            message: '檔案名稱包含特殊字符',
            code: 'UNSAFE_FILENAME'
          })
        ])
      );
    });
  });

  describe('Batch Processing Tool', () => {
    // REQ-UX-005: 批量處理優化
    test('Given batch processor with default options, When createBatchProcessor is called, Then processor should have correct defaults', () => {
      // When
      const processor = transferManager.createBatchProcessor();

      // Then
      expect(processor.batchSize).toBe(10);
      expect(processor.delay).toBe(10);
      expect(processor.process).toBeInstanceOf(Function);
    });

    test('Given custom options, When createBatchProcessor is called, Then processor should use custom values', () => {
      // Given
      const options = { batchSize: 5, delay: 50 };

      // When
      const processor = transferManager.createBatchProcessor(options);

      // Then
      expect(processor.batchSize).toBe(5);
      expect(processor.delay).toBe(50);
    });

    test('Given items to process, When batch processor is used, Then items should be processed in batches', async () => {
      // Given
      const items = [1, 2, 3, 4, 5];
      const mockProcessor = jest.fn().mockResolvedValue('processed');
      const mockProgressCallback = jest.fn();
      const batchProcessor = transferManager.createBatchProcessor({ batchSize: 2 });

      // When
      const results = await batchProcessor.process(items, mockProcessor, mockProgressCallback);

      // Then
      expect(results).toHaveLength(5);
      expect(results.every(r => r === 'processed')).toBe(true);
      expect(mockProcessor).toHaveBeenCalledTimes(5);
      expect(mockProgressCallback).toHaveBeenCalledTimes(5);
    });

    test('Given processing error, When batch processor encounters error, Then error should be captured', async () => {
      // Given
      const items = [1, 2, 3];
      const mockProcessor = jest.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce('success');
      const batchProcessor = transferManager.createBatchProcessor();

      // When
      const results = await batchProcessor.process(items, mockProcessor);

      // Then
      expect(results).toHaveLength(3);
      expect(results[0]).toBe('success');
      expect(results[1]).toEqual({
        error: 'Processing failed',
        index: 1
      });
      expect(results[2]).toBe('success');
    });
  });

  describe('Format Conversion Tool', () => {
    // REQ-UX-006: 格式轉換工具
    test('Given same format conversion, When convertFormat is called, Then data should be returned unchanged', async () => {
      // Given
      const data = { name: 'Test Card' };
      const format = 'json';

      // When
      const result = await transferManager.convertFormat(data, format, format);

      // Then
      expect(result).toEqual({
        success: true,
        data
      });
    });

    test('Given vCard to JSON conversion, When convertFormat is called, Then vCard should be converted', async () => {
      // Given
      const vcardData = 'BEGIN:VCARD\nVERSION:3.0\nFN:Test Name\nEND:VCARD';
      jest.spyOn(transferManager, 'convertVCardToJSON').mockReturnValue({
        success: true,
        data: { name: 'Test Name' }
      });

      // When
      const result = await transferManager.convertFormat(vcardData, 'vcard', 'json');

      // Then
      expect(result.success).toBe(true);
      expect(transferManager.convertVCardToJSON).toHaveBeenCalledWith(vcardData);
    });

    test('Given JSON to vCard conversion, When convertFormat is called, Then JSON should be converted', async () => {
      // Given
      const jsonData = { name: 'Test Name', email: 'test@example.com' };
      jest.spyOn(transferManager, 'convertJSONToVCard').mockReturnValue({
        success: true,
        data: 'BEGIN:VCARD\nVERSION:3.0\nFN:Test Name\nEMAIL:test@example.com\nEND:VCARD'
      });

      // When
      const result = await transferManager.convertFormat(jsonData, 'json', 'vcard');

      // Then
      expect(result.success).toBe(true);
      expect(transferManager.convertJSONToVCard).toHaveBeenCalledWith(jsonData);
    });

    test('Given unsupported conversion, When convertFormat is called, Then error should be returned', async () => {
      // Given
      const data = { name: 'Test' };

      // When
      const result = await transferManager.convertFormat(data, 'unsupported', 'json');

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支援從 unsupported 轉換到 json');
    });

    test('Given conversion error, When convertFormat is called, Then error should be handled', async () => {
      // Given
      const data = { name: 'Test' };
      jest.spyOn(transferManager, 'convertVCardToJSON').mockImplementation(() => {
        throw new Error('Conversion failed');
      });

      // When
      const result = await transferManager.convertFormat(data, 'vcard', 'json');

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain('格式轉換失敗');
    });
  });

  describe('Enhanced Export Function', () => {
    // REQ-UX-007: 增強的匯出功能
    test('Given cards to export, When exportEncrypted is called with progress callback, Then progress should be reported', async () => {
      // Given
      const operationId = 'export-test';
      const mockCallback = jest.fn();
      transferManager.setProgressCallback(operationId, mockCallback);
      
      mockStorage.listCards.mockResolvedValue([
        { id: '1', data: { name: 'Card 1' }, type: 'personal' }
      ]);

      // When
      const result = await transferManager.exportEncrypted({ operationId });

      // Then
      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 10,
          message: '正在準備匯出資料...'
        })
      );
    });

    test('Given no cards to export, When exportEncrypted is called, Then friendly error should be returned', async () => {
      // Given
      mockStorage.listCards.mockResolvedValue([]);

      // When
      const result = await transferManager.exportEncrypted();

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('Given cards with large data, When exportEncrypted is called, Then warnings should be included', async () => {
      // Given
      const largeCardData = { name: 'x'.repeat(10000), content: 'y'.repeat(50000) };
      mockStorage.listCards.mockResolvedValue([
        { id: '1', data: largeCardData, type: 'personal' }
      ]);

      // When
      const result = await transferManager.exportEncrypted();

      // Then
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Import Function', () => {
    // REQ-UX-008: 增強的匯入功能
    test('Given import with progress callback, When importData is called, Then progress should be reported', async () => {
      // Given
      const operationId = 'import-test';
      const mockCallback = jest.fn();
      transferManager.setProgressCallback(operationId, mockCallback);
      
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        size: 1024
      };
      
      jest.spyOn(transferManager, 'secureReadFile').mockResolvedValue(
        JSON.stringify({ version: '1.0', cards: [] })
      );

      // When
      await transferManager.importData(mockFile, null, { operationId });

      // Then
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 5,
          message: '正在檢查匯入權限...'
        })
      );
    });

    test('Given file with warnings, When importData is called, Then warnings should be included in result', async () => {
      // Given
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        size: 6 * 1024 * 1024 // 6MB - should trigger warning
      };
      
      jest.spyOn(transferManager, 'secureReadFile').mockResolvedValue(
        JSON.stringify({ version: '1.0', cards: [] })
      );

      // When
      const result = await transferManager.importData(mockFile);

      // Then
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('Given emergency disable flag, When importData is called, Then import should be blocked', async () => {
      // Given
      window.EMERGENCY_DISABLE_IMPORT = true;
      const mockFile = { name: 'test.json', type: 'application/json', size: 1024 };

      // When
      const result = await transferManager.importData(mockFile);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Cleanup
      delete window.EMERGENCY_DISABLE_IMPORT;
    });
  });

  describe('Language Detection', () => {
    // REQ-UX-009: 語言檢測
    test('Given English navigator language, When detectLanguage is called, Then en should be returned', () => {
      // Given
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true
      });

      // When
      const language = transferManager.detectLanguage();

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
      const language = transferManager.detectLanguage();

      // Then
      expect(language).toBe('zh');
    });

    test('Given no navigator, When detectLanguage is called, Then zh should be returned as default', () => {
      // Given
      const originalNavigator = global.navigator;
      delete global.navigator;

      // When
      const language = transferManager.detectLanguage();

      // Then
      expect(language).toBe('zh');

      // Cleanup
      global.navigator = originalNavigator;
    });
  });

  describe('Security and Safety', () => {
    // REQ-SEC-001: 安全性測試
    test('Given malicious JSON, When secureJSONParse is used, Then prototype pollution should be prevented', () => {
      // Given
      const maliciousJSON = '{"__proto__": {"polluted": true}, "constructor": {"polluted": true}}';

      // When
      const result = transferManager.secureJSONParse(maliciousJSON);

      // Then
      expect(result.__proto__).toBeUndefined();
      expect(result.constructor).toBeUndefined();
      expect(Object.prototype.polluted).toBeUndefined();
    });

    test('Given sensitive data, When maskSensitiveData is called, Then data should be properly masked', () => {
      // Given
      const sensitiveData = 'user@example.com and phone 0912345678 and name 王小明';

      // When
      const masked = transferManager.maskSensitiveData(sensitiveData);

      // Then
      expect(masked).toBe('[email] and phone [number] and name [name]');
    });

    test('Given error with security implications, When handleSecureError is called, Then secure error should be returned', () => {
      // Given
      const securityError = new Error('Database password exposed');

      // When
      const result = transferManager.handleSecureError(securityError, 'security_violation');

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBe('操作失敗，請稍後再試');
      expect(result.errorId).toMatch(/^err_/);
    });
  });

  describe('Performance and Optimization', () => {
    // REQ-PERF-001: 性能測試
    test('Given large batch processing, When batch processor is used, Then processing should complete within reasonable time', async () => {
      // Given
      const largeItems = Array.from({ length: 100 }, (_, i) => i);
      const mockProcessor = jest.fn().mockImplementation(async (item) => {
        await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
        return `processed-${item}`;
      });
      const batchProcessor = transferManager.createBatchProcessor({ batchSize: 10, delay: 1 });

      const startTime = Date.now();

      // When
      const results = await batchProcessor.process(largeItems, mockProcessor);

      // Then
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(100);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockProcessor).toHaveBeenCalledTimes(100);
    });

    test('Given progress debouncing, When updateProgress is called rapidly, Then excessive calls should be throttled', () => {
      // Given
      const operationId = 'throttle-test';
      const mockCallback = jest.fn();
      transferManager.setProgressCallback(operationId, mockCallback);

      // When
      for (let i = 0; i < 10; i++) {
        transferManager.updateProgress(operationId, i * 10, `Step ${i}`);
      }

      // Then
      // Due to 100ms debouncing, only the first call should execute
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });
});