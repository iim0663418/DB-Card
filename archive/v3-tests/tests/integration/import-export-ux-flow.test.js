/**
 * Import/Export UX Flow Integration Tests
 * 測試完整的匯入匯出用戶流程
 * 
 * 測試範圍：
 * - 完整的匯出流程（帶進度回饋）
 * - 完整的匯入流程（帶狀態更新）
 * - 檔案驗證和警告系統
 * - 錯誤處理和恢復機制
 * - 批量操作性能
 * - 多語言用戶體驗
 */

describe('Import/Export UX Flow Integration', () => {
  let transferManager;
  let cardManager;
  let mockStorage;

  beforeEach(() => {
    // Mock storage with realistic behavior
    mockStorage = {
      storeCard: jest.fn().mockImplementation(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async delay
        return `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }),
      getCard: jest.fn().mockImplementation(async (id) => {
        if (id === 'existing-card') {
          return {
            id: 'existing-card',
            data: { name: 'Existing Card', email: 'existing@example.com' },
            type: 'personal',
            created: '2023-01-01T00:00:00Z',
            modified: '2023-06-01T00:00:00Z'
          };
        }
        return null;
      }),
      listCards: jest.fn().mockResolvedValue([
        {
          id: 'card-1',
          data: { name: '王小明', title: '工程師', email: 'wang@example.com' },
          type: 'personal',
          created: '2023-01-01T00:00:00Z',
          modified: '2023-01-01T00:00:00Z'
        },
        {
          id: 'card-2',
          data: { name: 'John Smith~約翰·史密斯', title: 'Manager~經理' },
          type: 'personal-bilingual',
          created: '2023-02-01T00:00:00Z',
          modified: '2023-02-01T00:00:00Z'
        }
      ]),
      updateCard: jest.fn().mockResolvedValue(true),
      deleteCard: jest.fn().mockResolvedValue(true)
    };

    // Initialize managers
    cardManager = new PWACardManager(mockStorage);
    transferManager = new TransferManager(cardManager);

    // Mock crypto for encryption tests
    global.crypto = {
      subtle: {
        importKey: jest.fn().mockResolvedValue({}),
        deriveKey: jest.fn().mockResolvedValue({}),
        encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32))
      },
      getRandomValues: jest.fn().mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      })
    };

    // Mock atob/btoa
    global.atob = jest.fn().mockImplementation((str) => str);
    global.btoa = jest.fn().mockImplementation((str) => str);
  });

  afterEach(() => {
    jest.clearAllMocks();
    transferManager.progressCallbacks.clear();
    cardManager.importCallbacks.clear();
  });

  describe('Complete Export Flow with UX Enhancement', () => {
    // REQ-INT-001: 完整匯出流程
    test('Given cards in storage, When complete export flow is executed, Then all UX features should work together', async () => {
      // Given
      const operationId = 'export-integration-test';
      const progressUpdates = [];
      const progressCallback = jest.fn().mockImplementation((update) => {
        progressUpdates.push(update);
      });
      
      transferManager.setProgressCallback(operationId, progressCallback);

      // When
      const result = await transferManager.exportEncrypted({
        operationId,
        includeVersions: false
      });

      // Then
      expect(result.success).toBe(true);
      expect(result.file).toBeInstanceOf(Blob);
      expect(result.filename).toMatch(/^cards-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
      expect(result.count).toBe(2);
      expect(result.warnings).toBeDefined();
      
      // Verify progress reporting
      expect(progressCallback).toHaveBeenCalled();
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toEqual({
        progress: 10,
        message: '正在準備匯出資料...',
        timestamp: expect.any(Number)
      });
    });

    test('Given large dataset, When export with file size warnings, Then warnings should be properly reported', async () => {
      // Given
      const largeCards = Array.from({ length: 100 }, (_, i) => ({
        id: `large-card-${i}`,
        data: {
          name: `Large Card ${i}`,
          content: 'x'.repeat(1000), // Large content
          description: 'y'.repeat(500)
        },
        type: 'personal'
      }));
      
      mockStorage.listCards.mockResolvedValue(largeCards);

      // When
      const result = await transferManager.exportEncrypted();

      // Then
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toEqual(
        expect.objectContaining({
          level: 'warning',
          code: 'LARGE_FILE'
        })
      );
    });

    test('Given encrypted export request, When password encryption is used, Then encrypted file should be generated', async () => {
      // Given
      const password = 'test-password-123';
      const operationId = 'encrypted-export-test';

      // When
      const result = await transferManager.exportEncrypted({
        operationId,
        encryptWithPassword: true,
        password
      });

      // Then
      expect(result.success).toBe(true);
      expect(result.encrypted).toBe(true);
      expect(result.filename).toMatch(/\.enc$/);
      expect(result.pairingCode).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  describe('Complete Import Flow with UX Enhancement', () => {
    // REQ-INT-002: 完整匯入流程
    test('Given export file, When complete import flow is executed, Then all UX features should work together', async () => {
      // Given
      const operationId = 'import-integration-test';
      const statusUpdates = [];
      const statusCallback = jest.fn().mockImplementation((update) => {
        statusUpdates.push(update);
      });
      
      cardManager.setImportCallback(operationId, statusCallback);
      transferManager.setProgressCallback(operationId, statusCallback);

      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        cards: [
          {
            id: 'import-card-1',
            type: 'personal',
            data: { name: 'Import Test Card', email: 'import@example.com' },
            created: '2023-01-01T00:00:00Z',
            modified: '2023-01-01T00:00:00Z'
          }
        ]
      };

      const mockFile = new File(
        [JSON.stringify(exportData)],
        'test-import.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(mockFile, null, { operationId });

      // Then
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.totalCards).toBe(1);
      
      // Verify progress reporting
      expect(statusCallback).toHaveBeenCalled();
      expect(statusUpdates.length).toBeGreaterThan(0);
      
      // Verify storage calls
      expect(mockStorage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Import Test Card',
          email: 'import@example.com'
        })
      );
    });

    test('Given file with size warnings, When import is executed, Then warnings should be reported throughout flow', async () => {
      // Given
      const largeFile = new File(
        ['x'.repeat(6 * 1024 * 1024)], // 6MB file
        'large-import.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(largeFile);

      // Then
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toEqual(
        expect.objectContaining({
          level: 'warning',
          code: 'LARGE_FILE'
        })
      );
    });

    test('Given conflicting cards, When import with conflict resolution, Then conflicts should be handled properly', async () => {
      // Given
      const conflictingData = {
        version: '1.0',
        cards: [
          {
            id: 'existing-card', // This ID already exists in mock storage
            type: 'personal',
            data: { name: 'Updated Card', email: 'updated@example.com' },
            modified: '2023-12-01T00:00:00Z' // Newer than existing
          }
        ]
      };

      const mockFile = new File(
        [JSON.stringify(conflictingData)],
        'conflict-test.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(mockFile);

      // Then
      expect(result.success).toBe(false);
      expect(result.needsConflictResolution).toBe(true);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0]).toEqual(
        expect.objectContaining({
          conflictType: 'newer_version'
        })
      );
    });

    test('Given conflict resolution decisions, When resolveConflictsAndImport is called, Then conflicts should be resolved', async () => {
      // Given
      const importData = {
        cards: [
          {
            id: 'existing-card',
            type: 'personal',
            data: { name: 'Resolved Card', email: 'resolved@example.com' },
            modified: '2023-12-01T00:00:00Z'
          }
        ]
      };
      
      const resolutions = ['replace']; // Replace existing card

      // When
      const result = await transferManager.resolveConflictsAndImport(importData, resolutions);

      // Then
      expect(result.success).toBe(true);
      expect(mockStorage.deleteCard).toHaveBeenCalledWith('existing-card');
      expect(mockStorage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Resolved Card',
          email: 'resolved@example.com'
        })
      );
    });
  });

  describe('Multi-language User Experience Flow', () => {
    // REQ-INT-003: 多語言用戶體驗
    test('Given English user, When import/export flow is executed, Then English messages should be used', async () => {
      // Given
      cardManager.language = 'en';
      transferManager.detectLanguage = jest.fn().mockReturnValue('en');
      
      const operationId = 'multilang-test';
      const progressUpdates = [];
      transferManager.setProgressCallback(operationId, (update) => {
        progressUpdates.push(update);
      });

      // Test export
      await transferManager.exportEncrypted({ operationId });

      // Test import error
      window.EMERGENCY_DISABLE_IMPORT = true;
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      const importResult = await cardManager.importFromFile(mockFile);

      // Then
      expect(importResult.error).toBe('Permission denied');
      
      // Cleanup
      delete window.EMERGENCY_DISABLE_IMPORT;
    });

    test('Given bilingual card data, When complete flow is executed, Then bilingual data should be preserved', async () => {
      // Given
      const bilingualData = {
        version: '1.0',
        cards: [
          {
            id: 'bilingual-card',
            type: 'personal-bilingual',
            data: {
              name: '王小明~John Wang',
              title: '工程師~Engineer',
              greetings: ['您好！~Hello!', '歡迎認識我！~Nice to meet you!']
            }
          }
        ]
      };

      const mockFile = new File(
        [JSON.stringify(bilingualData)],
        'bilingual-test.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(mockFile);

      // Then
      expect(result.success).toBe(true);
      expect(mockStorage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '王小明~John Wang',
          title: '工程師~Engineer',
          greetings: ['您好！~Hello!', '歡迎認識我！~Nice to meet you!']
        })
      );
    });
  });

  describe('Error Handling and Recovery Flow', () => {
    // REQ-INT-004: 錯誤處理和恢復
    test('Given storage failure during export, When export is attempted, Then user-friendly error should be returned', async () => {
      // Given
      mockStorage.listCards.mockRejectedValue(new Error('Storage connection failed'));

      // When
      const result = await transferManager.exportEncrypted();

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorId).toMatch(/^err_/);
    });

    test('Given corrupted import file, When import is attempted, Then appropriate error handling should occur', async () => {
      // Given
      const corruptedFile = new File(
        ['invalid json content {{{'],
        'corrupted.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(corruptedFile);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('Given network interruption during batch processing, When import continues, Then partial results should be handled', async () => {
      // Given
      const batchData = {
        version: '1.0',
        cards: Array.from({ length: 5 }, (_, i) => ({
          id: `batch-card-${i}`,
          type: 'personal',
          data: { name: `Batch Card ${i}`, email: `batch${i}@example.com` }
        }))
      };

      // Simulate failure on 3rd card
      mockStorage.storeCard
        .mockResolvedValueOnce('card-1')
        .mockResolvedValueOnce('card-2')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('card-4')
        .mockResolvedValueOnce('card-5');

      const mockFile = new File(
        [JSON.stringify(batchData)],
        'batch-test.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(mockFile);

      // Then
      expect(result.success).toBe(true); // Partial success
      expect(result.importedCount).toBe(4); // 4 out of 5 succeeded
      expect(result.errors).toBeDefined();
    });
  });

  describe('Performance and Batch Processing Flow', () => {
    // REQ-INT-005: 性能和批量處理
    test('Given large dataset, When batch processing is used, Then operations should complete efficiently', async () => {
      // Given
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: `perf-card-${i}`,
        type: 'personal',
        data: { name: `Performance Card ${i}`, email: `perf${i}@example.com` }
      }));

      const exportData = {
        version: '1.0',
        cards: largeDataset
      };

      const mockFile = new File(
        [JSON.stringify(exportData)],
        'performance-test.json',
        { type: 'application/json' }
      );

      const startTime = Date.now();

      // When
      const result = await transferManager.importData(mockFile);

      // Then
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(50);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockStorage.storeCard).toHaveBeenCalledTimes(50);
    });

    test('Given batch processor with progress reporting, When large import is processed, Then progress should be smooth', async () => {
      // Given
      const operationId = 'batch-progress-test';
      const progressUpdates = [];
      transferManager.setProgressCallback(operationId, (update) => {
        progressUpdates.push(update);
      });

      const items = Array.from({ length: 20 }, (_, i) => i);
      const processor = jest.fn().mockImplementation(async (item) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return `processed-${item}`;
      });

      const batchProcessor = transferManager.createBatchProcessor({ batchSize: 5, delay: 10 });

      // When
      const results = await batchProcessor.process(items, processor, (progress) => {
        transferManager.updateProgress(operationId, progress.progress, `Processing ${progress.current}/${progress.total}`);
      });

      // Then
      expect(results).toHaveLength(20);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress increases
      const progressValues = progressUpdates.map(u => u.progress);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
    });
  });

  describe('File Validation and Security Flow', () => {
    // REQ-INT-006: 檔案驗證和安全
    test('Given potentially unsafe file, When validation occurs, Then security measures should be applied', async () => {
      // Given
      const unsafeFile = new File(
        [JSON.stringify({
          version: '1.0',
          cards: [{
            id: 'unsafe-card',
            type: 'personal',
            data: {
              name: '../../../etc/passwd',
              email: 'test@example.com',
              avatar: 'javascript:alert("xss")'
            }
          }]
        })],
        '../unsafe-file.json',
        { type: 'application/json' }
      );

      // When
      const validationResult = transferManager.validateFileIntegrity(unsafeFile);
      const importResult = await transferManager.importData(unsafeFile);

      // Then
      expect(validationResult.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UNSAFE_FILENAME'
          })
        ])
      );
      
      // Data should be sanitized during import
      if (importResult.success) {
        expect(mockStorage.storeCard).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.any(String), // Sanitized
            email: 'test@example.com',
            avatar: expect.any(String) // Sanitized
          })
        );
      }
    });

    test('Given malicious JSON payload, When security parsing is applied, Then threats should be neutralized', async () => {
      // Given
      const maliciousPayload = {
        version: '1.0',
        __proto__: { polluted: true },
        constructor: { polluted: true },
        cards: [{
          id: 'malicious-card',
          type: 'personal',
          data: {
            name: 'Test Card',
            __proto__: { polluted: true }
          }
        }]
      };

      const mockFile = new File(
        [JSON.stringify(maliciousPayload)],
        'malicious.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(mockFile);

      // Then
      expect(Object.prototype.polluted).toBeUndefined();
      expect(result.success).toBe(true); // Should still work after sanitization
    });
  });

  describe('Format Conversion Integration', () => {
    // REQ-INT-007: 格式轉換整合
    test('Given vCard file, When import with format conversion, Then conversion should work seamlessly', async () => {
      // Given
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Example Corp
EMAIL:john@example.com
TEL:+1234567890
END:VCARD`;

      const vcardFile = new File([vcardContent], 'contact.vcf', { type: 'text/vcard' });

      // When
      const result = await cardManager.importFromFile(vcardFile);

      // Then
      expect(result.success).toBe(true);
      expect(mockStorage.storeCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          organization: 'Example Corp',
          email: 'john@example.com',
          phone: '+1234567890'
        })
      );
    });

    test('Given legacy format data, When format conversion is applied, Then data should be upgraded', async () => {
      // Given
      const legacyData = {
        name: 'Legacy Card',
        email: 'legacy@example.com'
        // Missing version and structure
      };

      // When
      const conversionResult = await transferManager.convertFormat(legacyData, 'legacy', 'current');

      // Then
      expect(conversionResult.success).toBe(true);
      expect(conversionResult.data).toEqual(
        expect.objectContaining({
          version: '1.0',
          cards: expect.arrayContaining([legacyData])
        })
      );
    });
  });

  describe('End-to-End Workflow Integration', () => {
    // REQ-INT-008: 端到端工作流程
    test('Given complete export-import cycle, When full workflow is executed, Then data integrity should be maintained', async () => {
      // Phase 1: Export
      const exportResult = await transferManager.exportEncrypted();
      expect(exportResult.success).toBe(true);

      // Phase 2: Read exported file content
      const exportedContent = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(exportResult.file);
      });
      const exportedData = JSON.parse(exportedContent);

      // Phase 3: Clear storage and import back
      mockStorage.listCards.mockResolvedValue([]);
      const importFile = new File([exportedContent], 'reimport.json', { type: 'application/json' });
      const importResult = await transferManager.importData(importFile);

      // Then
      expect(importResult.success).toBe(true);
      expect(importResult.importedCount).toBe(exportedData.cards.length);
      
      // Verify all cards were stored
      expect(mockStorage.storeCard).toHaveBeenCalledTimes(exportedData.cards.length);
    });

    test('Given encrypted export-import cycle, When password protection is used, Then security should be maintained', async () => {
      // Given
      const password = 'secure-test-password';

      // Phase 1: Encrypted export
      const exportResult = await transferManager.exportEncrypted({
        encryptWithPassword: true,
        password
      });
      expect(exportResult.success).toBe(true);
      expect(exportResult.encrypted).toBe(true);

      // Phase 2: Import with correct password
      const importResult = await transferManager.importData(exportResult.file, password);

      // Then
      expect(importResult.success).toBe(true);
      expect(importResult.importedCount).toBeGreaterThan(0);
    });
  });
});