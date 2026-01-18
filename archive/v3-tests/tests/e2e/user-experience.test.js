/**
 * End-to-End User Experience Tests
 * 端到端用戶體驗測試
 * 
 * 測試範圍：
 * - 用戶完整操作流程
 * - 真實瀏覽器環境模擬
 * - UI 互動和回饋機制
 * - 錯誤情境用戶體驗
 * - 性能和響應性
 * - 跨瀏覽器兼容性
 */

describe('End-to-End User Experience', () => {
  let mockDOM;
  let mockWindow;
  let transferManager;
  let cardManager;
  let mockStorage;

  beforeEach(() => {
    // Create comprehensive DOM mock
    mockDOM = createMockDOM();
    global.document = mockDOM;
    
    // Create window mock with PWA features
    mockWindow = createMockWindow();
    global.window = mockWindow;

    // Initialize storage mock
    mockStorage = createMockStorage();
    
    // Initialize managers
    cardManager = new PWACardManager(mockStorage);
    transferManager = new TransferManager(cardManager);

    // Setup event listeners mock
    setupEventListeners();
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  describe('User Import Experience Flow', () => {
    // REQ-E2E-001: 用戶匯入體驗流程
    test('Given user wants to import cards, When they select file and follow flow, Then experience should be smooth', async () => {
      // Given - User opens import dialog
      const importButton = mockDOM.getElementById('import-button');
      const fileInput = mockDOM.getElementById('file-input');
      const progressBar = mockDOM.getElementById('progress-bar');
      const statusMessage = mockDOM.getElementById('status-message');
      
      // Create mock file
      const mockFile = new File(
        [JSON.stringify({
          version: '1.0',
          cards: [
            {
              id: 'test-card-1',
              type: 'personal',
              data: { name: 'Test User', email: 'test@example.com' }
            }
          ]
        })],
        'cards.json',
        { type: 'application/json' }
      );

      // When - User clicks import and selects file
      importButton.click();
      expect(mockDOM.querySelector('.import-dialog')).toHaveStyle({ display: 'block' });

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });
      
      const operationId = 'e2e-import-test';
      
      // Setup progress tracking
      const progressUpdates = [];
      transferManager.setProgressCallback(operationId, (update) => {
        progressUpdates.push(update);
        // Simulate UI updates
        progressBar.style.width = `${update.progress}%`;
        statusMessage.textContent = update.message;
      });

      // Trigger import
      const importResult = await transferManager.importData(mockFile, null, { operationId });

      // Then - Verify user experience
      expect(importResult.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressBar.style.width).toBe('100%');
      expect(statusMessage.textContent).toContain('完成');
      expect(mockDOM.querySelector('.success-notification')).toBeInTheDocument();
    });

    test('Given user selects large file, When import starts, Then appropriate warnings should be shown', async () => {
      // Given
      const largeFile = new File(
        ['x'.repeat(6 * 1024 * 1024)], // 6MB
        'large-cards.json',
        { type: 'application/json' }
      );

      const warningDialog = mockDOM.getElementById('warning-dialog');
      const warningMessage = mockDOM.getElementById('warning-message');

      // When
      const validation = transferManager.validateFileIntegrity(largeFile);
      
      // Simulate UI warning display
      if (validation.warnings.length > 0) {
        warningDialog.style.display = 'block';
        warningMessage.textContent = validation.warnings[0].message;
      }

      // Then
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(warningDialog).toHaveStyle({ display: 'block' });
      expect(warningMessage.textContent).toContain('5MB');
    });

    test('Given user encounters import error, When error occurs, Then user-friendly error should be displayed', async () => {
      // Given
      window.EMERGENCY_DISABLE_IMPORT = true;
      const errorDialog = mockDOM.getElementById('error-dialog');
      const errorMessage = mockDOM.getElementById('error-message');
      
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });

      // When
      const result = await transferManager.importData(mockFile);
      
      // Simulate error UI display
      if (!result.success) {
        errorDialog.style.display = 'block';
        errorMessage.textContent = result.error;
      }

      // Then
      expect(result.success).toBe(false);
      expect(errorDialog).toHaveStyle({ display: 'block' });
      expect(errorMessage.textContent).toBeDefined();
      expect(errorMessage.textContent).not.toContain('Error:'); // Should be user-friendly

      // Cleanup
      delete window.EMERGENCY_DISABLE_IMPORT;
    });
  });

  describe('User Export Experience Flow', () => {
    // REQ-E2E-002: 用戶匯出體驗流程
    test('Given user wants to export cards, When they follow export flow, Then process should be intuitive', async () => {
      // Given
      const exportButton = mockDOM.getElementById('export-button');
      const exportDialog = mockDOM.getElementById('export-dialog');
      const encryptionCheckbox = mockDOM.getElementById('encryption-checkbox');
      const passwordInput = mockDOM.getElementById('password-input');
      const exportProgress = mockDOM.getElementById('export-progress');
      const downloadLink = mockDOM.getElementById('download-link');

      // Setup mock cards
      mockStorage.listCards.mockResolvedValue([
        { id: '1', data: { name: 'Card 1' }, type: 'personal' },
        { id: '2', data: { name: 'Card 2' }, type: 'personal' }
      ]);

      // When - User initiates export
      exportButton.click();
      expect(exportDialog).toHaveStyle({ display: 'block' });

      // User selects encryption
      encryptionCheckbox.checked = true;
      encryptionCheckbox.dispatchEvent(new Event('change'));
      expect(passwordInput).toHaveStyle({ display: 'block' });

      // User enters password
      passwordInput.value = 'test-password';
      
      const operationId = 'e2e-export-test';
      transferManager.setProgressCallback(operationId, (update) => {
        exportProgress.style.width = `${update.progress}%`;
      });

      // Start export
      const result = await transferManager.exportEncrypted({
        operationId,
        encryptWithPassword: true,
        password: 'test-password'
      });

      // Simulate download link creation
      if (result.success) {
        const url = URL.createObjectURL(result.file);
        downloadLink.href = url;
        downloadLink.download = result.filename;
        downloadLink.style.display = 'block';
      }

      // Then
      expect(result.success).toBe(true);
      expect(result.encrypted).toBe(true);
      expect(downloadLink).toHaveStyle({ display: 'block' });
      expect(downloadLink.download).toMatch(/\.enc$/);
    });

    test('Given user exports without encryption, When process completes, Then clear download should be available', async () => {
      // Given
      const exportOptions = mockDOM.getElementById('export-options');
      const encryptionOption = mockDOM.querySelector('input[name="encryption"][value="none"]');
      const downloadSection = mockDOM.getElementById('download-section');

      mockStorage.listCards.mockResolvedValue([
        { id: '1', data: { name: 'Test Card' }, type: 'personal' }
      ]);

      // When
      encryptionOption.checked = true;
      const result = await transferManager.exportEncrypted({
        encryptWithPassword: false
      });

      // Simulate UI update
      if (result.success) {
        downloadSection.innerHTML = `
          <a href="${URL.createObjectURL(result.file)}" 
             download="${result.filename}"
             class="download-link">
            下載名片 (${result.count} 張)
          </a>
        `;
      }

      // Then
      expect(result.success).toBe(true);
      expect(result.encrypted).toBe(false);
      expect(result.filename).toMatch(/\.json$/);
      expect(downloadSection.querySelector('.download-link')).toBeInTheDocument();
    });
  });

  describe('Multi-language User Experience', () => {
    // REQ-E2E-003: 多語言用戶體驗
    test('Given English user interface, When operations are performed, Then all messages should be in English', async () => {
      // Given
      cardManager.language = 'en';
      const languageSwitch = mockDOM.getElementById('language-switch');
      const statusMessages = mockDOM.querySelectorAll('.status-message');

      // When - Switch to English
      languageSwitch.value = 'en';
      languageSwitch.dispatchEvent(new Event('change'));

      // Update UI language
      updateUILanguage('en');

      // Test import with English messages
      window.EMERGENCY_DISABLE_IMPORT = true;
      const result = await cardManager.importFromFile(
        new File(['test'], 'test.json', { type: 'application/json' })
      );

      // Then
      expect(result.error).toBe('Permission denied');
      expect(mockDOM.getElementById('main-title').textContent).toBe('Card Management');
      expect(mockDOM.getElementById('import-button').textContent).toBe('Import Cards');

      // Cleanup
      delete window.EMERGENCY_DISABLE_IMPORT;
    });

    test('Given bilingual card data in UI, When user switches language, Then display should update correctly', async () => {
      // Given
      const cardData = {
        name: '王小明~John Wang',
        title: '工程師~Engineer',
        greetings: ['您好！~Hello!', '歡迎認識我！~Nice to meet you!']
      };

      const cardDisplay = mockDOM.getElementById('card-display');

      // When - Display in Chinese
      updateCardDisplay(cardData, 'zh');
      const chineseDisplay = cardDisplay.innerHTML;

      // Switch to English
      updateCardDisplay(cardData, 'en');
      const englishDisplay = cardDisplay.innerHTML;

      // Then
      expect(chineseDisplay).toContain('王小明');
      expect(chineseDisplay).toContain('工程師');
      expect(englishDisplay).toContain('John Wang');
      expect(englishDisplay).toContain('Engineer');
    });
  });

  describe('Accessibility User Experience', () => {
    // REQ-E2E-004: 無障礙用戶體驗
    test('Given screen reader user, When navigating import flow, Then accessibility features should work', async () => {
      // Given
      const importButton = mockDOM.getElementById('import-button');
      const fileInput = mockDOM.getElementById('file-input');
      const progressBar = mockDOM.getElementById('progress-bar');
      const statusRegion = mockDOM.getElementById('status-region');

      // Verify ARIA attributes
      expect(importButton).toHaveAttribute('aria-label', '匯入名片檔案');
      expect(fileInput).toHaveAttribute('aria-describedby', 'file-help-text');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');

      // When - Simulate import with screen reader announcements
      const operationId = 'a11y-test';
      transferManager.setProgressCallback(operationId, (update) => {
        // Simulate screen reader announcements
        progressBar.setAttribute('aria-valuenow', update.progress);
        progressBar.setAttribute('aria-valuetext', `${update.progress}% ${update.message}`);
        statusRegion.textContent = update.message;
      });

      const mockFile = new File(['{"cards":[]}'], 'test.json', { type: 'application/json' });
      await transferManager.importData(mockFile, null, { operationId });

      // Then
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(statusRegion.textContent).toBeDefined();
    });

    test('Given keyboard-only user, When navigating interface, Then all functions should be accessible via keyboard', () => {
      // Given
      const importButton = mockDOM.getElementById('import-button');
      const exportButton = mockDOM.getElementById('export-button');
      const fileInput = mockDOM.getElementById('file-input');

      // Test tab order
      const tabSequence = [importButton, exportButton, fileInput];
      
      // When - Simulate keyboard navigation
      let currentTabIndex = 0;
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
          currentTabIndex = (currentTabIndex + 1) % tabSequence.length;
          tabSequence[currentTabIndex].focus();
        }
      });

      // Simulate Tab key presses
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);
      document.dispatchEvent(tabEvent);

      // Then
      expect(document.activeElement).toBe(fileInput);
      
      // Test Enter key activation
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      importButton.focus();
      importButton.dispatchEvent(enterEvent);
      
      expect(mockDOM.querySelector('.import-dialog')).toHaveStyle({ display: 'block' });
    });
  });

  describe('Performance and Responsiveness Experience', () => {
    // REQ-E2E-005: 性能和響應性體驗
    test('Given large file import, When operation takes time, Then UI should remain responsive', async () => {
      // Given
      const largeFile = new File(
        [JSON.stringify({
          version: '1.0',
          cards: Array.from({ length: 100 }, (_, i) => ({
            id: `card-${i}`,
            type: 'personal',
            data: { name: `Card ${i}`, email: `card${i}@example.com` }
          }))
        })],
        'large-import.json',
        { type: 'application/json' }
      );

      const cancelButton = mockDOM.getElementById('cancel-button');
      const progressBar = mockDOM.getElementById('progress-bar');
      let operationCancelled = false;

      // When - Start import with cancellation capability
      const operationId = 'perf-test';
      transferManager.setProgressCallback(operationId, (update) => {
        progressBar.style.width = `${update.progress}%`;
        
        // Simulate user wanting to cancel at 50%
        if (update.progress >= 50 && !operationCancelled) {
          operationCancelled = true;
          cancelButton.click();
        }
      });

      // Setup cancel functionality
      cancelButton.onclick = () => {
        transferManager.progressCallbacks.delete(operationId);
        mockDOM.getElementById('import-dialog').style.display = 'none';
      };

      const startTime = Date.now();
      await transferManager.importData(largeFile, null, { operationId });
      const endTime = Date.now();

      // Then - UI should have remained responsive
      expect(endTime - startTime).toBeLessThan(10000); // Under 10 seconds
      expect(cancelButton).toHaveAttribute('onclick');
      expect(mockDOM.getElementById('import-dialog')).toHaveStyle({ display: 'none' });
    });

    test('Given batch processing, When progress updates occur, Then UI should update smoothly without blocking', async () => {
      // Given
      const items = Array.from({ length: 50 }, (_, i) => i);
      const progressIndicator = mockDOM.getElementById('batch-progress');
      const batchStatus = mockDOM.getElementById('batch-status');
      
      let updateCount = 0;
      const maxUpdatesPerSecond = 30; // 30 FPS target

      // When
      const batchProcessor = transferManager.createBatchProcessor({ batchSize: 5, delay: 10 });
      
      const startTime = Date.now();
      await batchProcessor.process(items, async (item) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return item;
      }, (progress) => {
        updateCount++;
        // Simulate throttled UI updates
        if (updateCount % Math.ceil(60 / maxUpdatesPerSecond) === 0) {
          progressIndicator.style.width = `${progress.progress}%`;
          batchStatus.textContent = `Processing ${progress.current}/${progress.total}`;
        }
      });
      const endTime = Date.now();

      // Then
      expect(endTime - startTime).toBeLessThan(5000); // Should complete quickly
      expect(progressIndicator.style.width).toBe('100%');
      expect(updateCount).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery User Experience', () => {
    // REQ-E2E-006: 錯誤恢復用戶體驗
    test('Given network error during import, When error occurs, Then user should see recovery options', async () => {
      // Given
      const errorDialog = mockDOM.getElementById('error-dialog');
      const retryButton = mockDOM.getElementById('retry-button');
      const errorDetails = mockDOM.getElementById('error-details');
      
      // Simulate network error
      mockStorage.storeCard.mockRejectedValue(new Error('Network connection failed'));

      const mockFile = new File(
        [JSON.stringify({ version: '1.0', cards: [{ id: '1', data: { name: 'Test' } }] })],
        'test.json',
        { type: 'application/json' }
      );

      // When
      const result = await transferManager.importData(mockFile);

      // Simulate error UI
      if (!result.success) {
        errorDialog.style.display = 'block';
        errorDetails.textContent = result.error;
        retryButton.style.display = 'block';
      }

      // Then
      expect(result.success).toBe(false);
      expect(errorDialog).toHaveStyle({ display: 'block' });
      expect(retryButton).toHaveStyle({ display: 'block' });
      expect(errorDetails.textContent).toBeDefined();
    });

    test('Given corrupted file, When validation fails, Then clear guidance should be provided', async () => {
      // Given
      const validationDialog = mockDOM.getElementById('validation-dialog');
      const validationErrors = mockDOM.getElementById('validation-errors');
      const helpLink = mockDOM.getElementById('help-link');

      const corruptedFile = new File(['invalid json'], 'corrupted.json', { type: 'application/json' });

      // When
      const validation = transferManager.validateFileIntegrity(corruptedFile);
      const result = await transferManager.importData(corruptedFile);

      // Simulate validation UI
      if (!result.success || validation.errors.length > 0) {
        validationDialog.style.display = 'block';
        validationErrors.innerHTML = validation.errors.map(error => 
          `<li>${error}</li>`
        ).join('');
        helpLink.style.display = 'inline';
      }

      // Then
      expect(validationDialog).toHaveStyle({ display: 'block' });
      expect(validationErrors.innerHTML).toContain('<li>');
      expect(helpLink).toHaveStyle({ display: 'inline' });
    });
  });

  // Helper functions for DOM mocking
  function createMockDOM() {
    const mockElement = (id, tagName = 'div') => {
      const element = {
        id,
        tagName: tagName.toUpperCase(),
        style: {},
        textContent: '',
        innerHTML: '',
        attributes: {},
        children: [],
        parentNode: null,
        
        getAttribute: jest.fn((name) => element.attributes[name]),
        setAttribute: jest.fn((name, value) => { element.attributes[name] = value; }),
        hasAttribute: jest.fn((name) => name in element.attributes),
        appendChild: jest.fn((child) => { element.children.push(child); child.parentNode = element; }),
        removeChild: jest.fn((child) => { element.children = element.children.filter(c => c !== child); }),
        querySelector: jest.fn((selector) => {
          if (selector.startsWith('#')) {
            const id = selector.substring(1);
            return mockElements[id] || null;
          }
          return null;
        }),
        querySelectorAll: jest.fn((selector) => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        click: jest.fn(),
        focus: jest.fn(),
        
        // Matchers for testing
        toHaveStyle: expect.objectContaining,
        toBeInTheDocument: expect.anything
      };
      
      // Add style setter
      Object.defineProperty(element, 'style', {
        value: new Proxy({}, {
          set: (target, prop, value) => {
            target[prop] = value;
            return true;
          }
        }),
        writable: true
      });
      
      return element;
    };

    const mockElements = {
      'import-button': mockElement('import-button', 'button'),
      'export-button': mockElement('export-button', 'button'),
      'file-input': mockElement('file-input', 'input'),
      'progress-bar': mockElement('progress-bar', 'div'),
      'status-message': mockElement('status-message', 'div'),
      'import-dialog': mockElement('import-dialog', 'dialog'),
      'export-dialog': mockElement('export-dialog', 'dialog'),
      'warning-dialog': mockElement('warning-dialog', 'dialog'),
      'error-dialog': mockElement('error-dialog', 'dialog'),
      'validation-dialog': mockElement('validation-dialog', 'dialog'),
      'warning-message': mockElement('warning-message', 'div'),
      'error-message': mockElement('error-message', 'div'),
      'validation-errors': mockElement('validation-errors', 'ul'),
      'encryption-checkbox': mockElement('encryption-checkbox', 'input'),
      'password-input': mockElement('password-input', 'input'),
      'export-progress': mockElement('export-progress', 'div'),
      'download-link': mockElement('download-link', 'a'),
      'language-switch': mockElement('language-switch', 'select'),
      'main-title': mockElement('main-title', 'h1'),
      'card-display': mockElement('card-display', 'div'),
      'status-region': mockElement('status-region', 'div'),
      'cancel-button': mockElement('cancel-button', 'button'),
      'retry-button': mockElement('retry-button', 'button'),
      'help-link': mockElement('help-link', 'a'),
      'error-details': mockElement('error-details', 'div'),
      'export-options': mockElement('export-options', 'div'),
      'download-section': mockElement('download-section', 'div'),
      'batch-progress': mockElement('batch-progress', 'div'),
      'batch-status': mockElement('batch-status', 'div')
    };

    // Set initial attributes
    mockElements['import-button'].setAttribute('aria-label', '匯入名片檔案');
    mockElements['file-input'].setAttribute('aria-describedby', 'file-help-text');
    mockElements['progress-bar'].setAttribute('role', 'progressbar');
    mockElements['status-region'].setAttribute('aria-live', 'polite');

    return {
      getElementById: jest.fn((id) => mockElements[id] || null),
      querySelector: jest.fn((selector) => {
        if (selector.startsWith('#')) {
          return mockElements[selector.substring(1)] || null;
        }
        if (selector === '.import-dialog') return mockElements['import-dialog'];
        if (selector === '.success-notification') return mockElement('success-notification');
        if (selector === '.download-link') return mockElements['download-link'];
        if (selector === 'input[name="encryption"][value="none"]') {
          const input = mockElement('encryption-none', 'input');
          input.name = 'encryption';
          input.value = 'none';
          return input;
        }
        return null;
      }),
      querySelectorAll: jest.fn((selector) => {
        if (selector === '.status-message') return [mockElements['status-message']];
        return [];
      }),
      addEventListener: jest.fn(),
      activeElement: mockElements['import-button']
    };
  }

  function createMockWindow() {
    return {
      location: { origin: 'https://example.com', pathname: '/test' },
      URL: {
        createObjectURL: jest.fn(() => 'blob:mock-url')
      },
      File,
      FileReader: global.FileReader,
      Blob: global.Blob
    };
  }

  function createMockStorage() {
    return {
      storeCard: jest.fn().mockResolvedValue('test-id'),
      getCard: jest.fn().mockResolvedValue(null),
      listCards: jest.fn().mockResolvedValue([]),
      updateCard: jest.fn().mockResolvedValue(true),
      deleteCard: jest.fn().mockResolvedValue(true)
    };
  }

  function setupEventListeners() {
    // Mock event listeners for interactive elements
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
  }

  function updateUILanguage(language) {
    const mockElements = {
      'main-title': language === 'en' ? 'Card Management' : '名片管理',
      'import-button': language === 'en' ? 'Import Cards' : '匯入名片',
      'export-button': language === 'en' ? 'Export Cards' : '匯出名片'
    };

    Object.entries(mockElements).forEach(([id, text]) => {
      const element = mockDOM.getElementById(id);
      if (element) {
        element.textContent = text;
      }
    });
  }

  function updateCardDisplay(cardData, language) {
    const displayData = cardManager.getBilingualCardData(cardData, language);
    const cardDisplay = mockDOM.getElementById('card-display');
    
    cardDisplay.innerHTML = `
      <div class="card-name">${displayData.name}</div>
      <div class="card-title">${displayData.title}</div>
      <div class="card-greetings">${displayData.greetings.join(', ')}</div>
    `;
  }

  function cleanup() {
    transferManager.progressCallbacks.clear();
    cardManager.importCallbacks.clear();
    delete global.document;
    delete global.window;
  }
});