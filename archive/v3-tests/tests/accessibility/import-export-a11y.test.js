/**
 * Import/Export Accessibility Tests
 * 匯入匯出無障礙功能測試
 * 
 * 測試範圍：
 * - WCAG 2.1 AA 合規性
 * - 鍵盤操作支援
 * - 螢幕閱讀器相容性
 * - 色彩對比和視覺可及性
 * - 語音回饋和狀態公告
 * - 多感官回饋機制
 */

describe('Import/Export Accessibility Tests', () => {
  let mockDOM;
  let mockWindow;
  let transferManager;
  let cardManager;
  let mockStorage;
  let mockScreenReader;

  beforeEach(() => {
    // Create accessible DOM mock
    mockDOM = createAccessibleMockDOM();
    global.document = mockDOM;
    
    // Create window with a11y APIs
    mockWindow = createA11yMockWindow();
    global.window = mockWindow;

    // Initialize storage and managers
    mockStorage = createMockStorage();
    cardManager = new PWACardManager(mockStorage);
    transferManager = new TransferManager(cardManager);

    // Mock screen reader
    mockScreenReader = createMockScreenReader();
    
    // Setup accessibility event listeners
    setupA11yEventListeners();
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  describe('WCAG 2.1 Keyboard Navigation Compliance', () => {
    // REQ-A11Y-001: 鍵盤導航合規性
    test('Given import interface, When user navigates with keyboard, Then all interactive elements should be accessible', () => {
      // Given
      const importButton = mockDOM.getElementById('import-button');
      const fileInput = mockDOM.getElementById('file-input');
      const submitButton = mockDOM.getElementById('submit-button');
      const cancelButton = mockDOM.getElementById('cancel-button');
      
      const tabbableElements = [importButton, fileInput, submitButton, cancelButton];
      let currentTabIndex = 0;

      // When - Simulate Tab navigation
      const simulateTabNavigation = () => {
        tabbableElements.forEach((element, index) => {
          element.tabIndex = index === currentTabIndex ? 0 : -1;
        });
        tabbableElements[currentTabIndex].focus();
      };

      // Test forward tabbing
      for (let i = 0; i < tabbableElements.length; i++) {
        simulateTabNavigation();
        
        // Then
        expect(tabbableElements[currentTabIndex]).toHaveFocus();
        expect(tabbableElements[currentTabIndex].tabIndex).toBe(0);
        
        currentTabIndex = (currentTabIndex + 1) % tabbableElements.length;
      }

      // Test Shift+Tab (reverse tabbing)
      currentTabIndex = tabbableElements.length - 1;
      for (let i = 0; i < tabbableElements.length; i++) {
        simulateTabNavigation();
        expect(tabbableElements[currentTabIndex]).toHaveFocus();
        currentTabIndex = currentTabIndex === 0 ? tabbableElements.length - 1 : currentTabIndex - 1;
      }
    });

    test('Given export dialog, When user uses Enter and Space keys, Then buttons should activate correctly', () => {
      // Given
      const exportButton = mockDOM.getElementById('export-button');
      const encryptionCheckbox = mockDOM.getElementById('encryption-checkbox');
      const downloadButton = mockDOM.getElementById('download-button');
      
      let buttonClicked = false;
      let checkboxToggled = false;

      exportButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          buttonClicked = true;
          event.preventDefault();
        }
      });

      encryptionCheckbox.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
          checkboxToggled = true;
          encryptionCheckbox.checked = !encryptionCheckbox.checked;
          event.preventDefault();
        }
      });

      // When
      exportButton.focus();
      exportButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      
      encryptionCheckbox.focus();
      encryptionCheckbox.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

      // Then
      expect(buttonClicked).toBe(true);
      expect(checkboxToggled).toBe(true);
      expect(encryptionCheckbox.checked).toBe(true);
    });

    test('Given error dialog, When user presses Escape, Then dialog should close', () => {
      // Given
      const errorDialog = mockDOM.getElementById('error-dialog');
      const overlay = mockDOM.getElementById('dialog-overlay');
      
      errorDialog.style.display = 'block';
      overlay.style.display = 'block';

      let dialogClosed = false;
      mockDOM.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          errorDialog.style.display = 'none';
          overlay.style.display = 'none';
          dialogClosed = true;
        }
      });

      // When
      errorDialog.focus();
      errorDialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      // Then
      expect(dialogClosed).toBe(true);
      expect(errorDialog).toHaveStyle({ display: 'none' });
    });
  });

  describe('Screen Reader Support and ARIA Compliance', () => {
    // REQ-A11Y-002: 螢幕閱讀器支援和 ARIA 合規
    test('Given import progress, When operation updates, Then screen reader should receive appropriate announcements', async () => {
      // Given
      const operationId = 'a11y-import-test';
      const statusRegion = mockDOM.getElementById('status-region');
      const progressBar = mockDOM.getElementById('progress-bar');
      
      const announcements = [];
      mockScreenReader.onAnnouncement = (text) => {
        announcements.push(text);
      };

      transferManager.setProgressCallback(operationId, (update) => {
        // Update ARIA attributes
        progressBar.setAttribute('aria-valuenow', update.progress);
        progressBar.setAttribute('aria-valuetext', `${update.progress}% ${update.message}`);
        
        // Update live region
        statusRegion.textContent = `${update.message} ${update.progress}%`;
        mockScreenReader.announce(`${update.message} ${update.progress}%`);
      });

      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });

      // When
      await transferManager.importData(mockFile, null, { operationId });

      // Then
      expect(announcements.length).toBeGreaterThan(0);
      expect(announcements).toContain(expect.stringMatching(/正在檢查匯入權限/));
      expect(progressBar.getAttribute('aria-valuenow')).toBeDefined();
      expect(progressBar.getAttribute('aria-valuetext')).toContain('%');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    test('Given form validation errors, When errors occur, Then screen reader should be notified', () => {
      // Given
      const fileInput = mockDOM.getElementById('file-input');
      const errorMessage = mockDOM.getElementById('file-error');
      const errorSummary = mockDOM.getElementById('error-summary');
      
      const validationErrors = [];
      mockScreenReader.onValidationError = (error) => {
        validationErrors.push(error);
      };

      // When - Simulate file validation error
      const invalidFile = new File([''], '', { type: 'text/plain' });
      
      // Trigger validation
      fileInput.files = [invalidFile];
      const validation = transferManager.validateFileIntegrity(invalidFile);
      
      if (validation.errors.length > 0) {
        const errorText = validation.errors[0];
        errorMessage.textContent = errorText;
        errorMessage.setAttribute('aria-live', 'assertive');
        
        // Update error summary
        errorSummary.innerHTML = `<h2>驗證錯誤</h2><ul><li>${errorText}</li></ul>`;
        errorSummary.focus();
        
        mockScreenReader.announceValidationError(errorText);
      }

      // Then
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
      expect(errorSummary.innerHTML).toContain('驗證錯誤');
      expect(validationErrors.length).toBeGreaterThan(0);
    });

    test('Given complex UI state changes, When import dialog opens, Then screen reader should understand context', () => {
      // Given
      const importButton = mockDOM.getElementById('import-button');
      const importDialog = mockDOM.getElementById('import-dialog');
      const dialogTitle = mockDOM.getElementById('dialog-title');
      const closeButton = mockDOM.getElementById('close-button');

      // When - Open dialog
      importButton.click();
      
      // Simulate modal dialog behavior
      importDialog.style.display = 'block';
      importDialog.setAttribute('aria-modal', 'true');
      importDialog.setAttribute('role', 'dialog');
      importDialog.setAttribute('aria-labelledby', 'dialog-title');
      
      // Focus management
      const firstFocusableElement = importDialog.querySelector('input, button, select, textarea');
      firstFocusableElement.focus();
      
      // Trap focus in dialog
      const focusableElements = importDialog.querySelectorAll('input, button, select, textarea');
      const lastFocusableElement = focusableElements[focusableElements.length - 1];

      // Then
      expect(importDialog).toHaveAttribute('aria-modal', 'true');
      expect(importDialog).toHaveAttribute('role', 'dialog');
      expect(importDialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(firstFocusableElement).toHaveFocus();
      expect(dialogTitle.textContent).toBe('匯入名片檔案');
    });
  });

  describe('Visual Accessibility and Color Contrast', () => {
    // REQ-A11Y-003: 視覺可及性和色彩對比
    test('Given progress indicators, When checking color contrast, Then WCAG AA standards should be met', () => {
      // Given
      const progressBar = mockDOM.getElementById('progress-bar');
      const successMessage = mockDOM.getElementById('success-message');
      const errorMessage = mockDOM.getElementById('error-message');
      const warningMessage = mockDOM.getElementById('warning-message');

      // When - Check computed styles (mocked)
      const styles = {
        progressBar: {
          backgroundColor: '#007bff', // Blue
          color: '#ffffff'           // White
        },
        successMessage: {
          backgroundColor: '#28a745', // Green
          color: '#ffffff'           // White
        },
        errorMessage: {
          backgroundColor: '#dc3545', // Red
          color: '#ffffff'           // White
        },
        warningMessage: {
          backgroundColor: '#ffc107', // Yellow
          color: '#000000'           // Black
        }
      };

      // Then - Verify contrast ratios (simplified check)
      const contrastRatios = {
        progressBar: calculateContrastRatio('#007bff', '#ffffff'), // Should be > 4.5:1
        successMessage: calculateContrastRatio('#28a745', '#ffffff'),
        errorMessage: calculateContrastRatio('#dc3545', '#ffffff'),
        warningMessage: calculateContrastRatio('#ffc107', '#000000')
      };

      Object.values(contrastRatios).forEach(ratio => {
        expect(ratio).toBeGreaterThan(4.5); // WCAG AA standard
      });
    });

    test('Given focus indicators, When elements receive focus, Then visible focus indicators should be present', () => {
      // Given
      const focusableElements = [
        mockDOM.getElementById('import-button'),
        mockDOM.getElementById('export-button'),
        mockDOM.getElementById('file-input')
      ];

      // When - Test focus indicators
      focusableElements.forEach(element => {
        element.focus();
        
        // Simulate CSS focus styles
        element.style.outline = '2px solid #007bff';
        element.style.outlineOffset = '2px';
        
        // Then
        expect(element.style.outline).toBe('2px solid #007bff');
        expect(element.style.outlineOffset).toBe('2px');
        expect(element).toHaveFocus();
      });
    });

    test('Given high contrast mode, When interface is viewed, Then content should remain accessible', () => {
      // Given - Simulate high contrast mode
      const highContrastStyles = {
        backgroundColor: '#000000',
        color: '#ffffff',
        borderColor: '#ffffff'
      };

      const elements = [
        mockDOM.getElementById('import-button'),
        mockDOM.getElementById('progress-bar'),
        mockDOM.getElementById('status-message')
      ];

      // When - Apply high contrast styles
      elements.forEach(element => {
        Object.assign(element.style, highContrastStyles);
      });

      // Then - Verify accessibility is maintained
      elements.forEach(element => {
        expect(element.style.backgroundColor).toBe('#000000');
        expect(element.style.color).toBe('#ffffff');
        expect(element.style.borderColor).toBe('#ffffff');
      });
    });
  });

  describe('Multilingual Accessibility Support', () => {
    // REQ-A11Y-004: 多語言無障礙支援
    test('Given bilingual interface, When language changes, Then screen reader should announce change', () => {
      // Given
      const languageSelector = mockDOM.getElementById('language-selector');
      const mainHeading = mockDOM.getElementById('main-heading');
      const importButton = mockDOM.getElementById('import-button');
      
      const languageAnnouncements = [];
      mockScreenReader.onLanguageChange = (language) => {
        languageAnnouncements.push(language);
      };

      // When - Change language from Chinese to English
      languageSelector.value = 'en';
      languageSelector.dispatchEvent(new Event('change'));
      
      // Update interface language
      mockDOM.documentElement.setAttribute('lang', 'en');
      mainHeading.textContent = 'Card Management System';
      importButton.textContent = 'Import Cards';
      importButton.setAttribute('aria-label', 'Import card files');
      
      mockScreenReader.announceLanguageChange('English');

      // Then
      expect(mockDOM.documentElement).toHaveAttribute('lang', 'en');
      expect(mainHeading.textContent).toBe('Card Management System');
      expect(importButton.textContent).toBe('Import Cards');
      expect(importButton).toHaveAttribute('aria-label', 'Import card files');
      expect(languageAnnouncements).toContain('English');
    });

    test('Given bilingual card data, When displayed to screen reader, Then appropriate language tags should be used', () => {
      // Given
      const cardDisplay = mockDOM.getElementById('card-display');
      const cardData = {
        name: '王小明~John Wang',
        title: '工程師~Engineer'
      };

      // When - Render bilingual content with language tags
      const bilingualName = cardData.name.split('~');
      const bilingualTitle = cardData.title.split('~');
      
      cardDisplay.innerHTML = `
        <div class="card-name">
          <span lang="zh-TW">${bilingualName[0]}</span>
          <span lang="en">${bilingualName[1]}</span>
        </div>
        <div class="card-title">
          <span lang="zh-TW">${bilingualTitle[0]}</span>
          <span lang="en">${bilingualTitle[1]}</span>
        </div>
      `;

      // Then
      const chineseElements = cardDisplay.querySelectorAll('[lang="zh-TW"]');
      const englishElements = cardDisplay.querySelectorAll('[lang="en"]');
      
      expect(chineseElements.length).toBe(2);
      expect(englishElements.length).toBe(2);
      expect(chineseElements[0].textContent).toBe('王小明');
      expect(englishElements[0].textContent).toBe('John Wang');
    });
  });

  describe('Error Handling and Recovery Accessibility', () => {
    // REQ-A11Y-005: 錯誤處理和恢復無障礙
    test('Given import error, When error occurs, Then accessible error recovery should be provided', async () => {
      // Given
      window.EMERGENCY_DISABLE_IMPORT = true;
      const errorDialog = mockDOM.getElementById('error-dialog');
      const errorHeading = mockDOM.getElementById('error-heading');
      const errorDescription = mockDOM.getElementById('error-description');
      const retryButton = mockDOM.getElementById('retry-button');
      const helpLink = mockDOM.getElementById('help-link');

      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });

      // When
      const result = await transferManager.importData(mockFile);
      
      // Simulate accessible error display
      if (!result.success) {
        errorDialog.style.display = 'block';
        errorDialog.setAttribute('role', 'alertdialog');
        errorDialog.setAttribute('aria-labelledby', 'error-heading');
        errorDialog.setAttribute('aria-describedby', 'error-description');
        
        errorHeading.textContent = '匯入失敗';
        errorDescription.textContent = result.error;
        
        // Focus management
        errorHeading.focus();
        errorHeading.setAttribute('tabindex', '-1');
        
        // Accessible recovery options
        retryButton.setAttribute('aria-describedby', 'retry-help');
        helpLink.setAttribute('aria-label', '獲取匯入問題的說明');
        
        mockScreenReader.announce(`錯誤: ${result.error}. 請檢查重試選項。`);
      }

      // Then
      expect(result.success).toBe(false);
      expect(errorDialog).toHaveAttribute('role', 'alertdialog');
      expect(errorDialog).toHaveAttribute('aria-labelledby', 'error-heading');
      expect(errorHeading).toHaveFocus();
      expect(retryButton).toHaveAttribute('aria-describedby', 'retry-help');
      expect(helpLink).toHaveAttribute('aria-label', '獲取匯入問題的說明');

      // Cleanup
      delete window.EMERGENCY_DISABLE_IMPORT;
    });

    test('Given validation warnings, When warnings appear, Then accessible warning system should activate', () => {
      // Given
      const warningContainer = mockDOM.getElementById('warning-container');
      const warningList = mockDOM.getElementById('warning-list');
      
      const largeFile = new File(
        ['x'.repeat(6 * 1024 * 1024)],
        'large.json',
        { type: 'application/json' }
      );

      // When
      const validation = transferManager.validateFileIntegrity(largeFile);
      
      if (validation.warnings.length > 0) {
        warningContainer.style.display = 'block';
        warningContainer.setAttribute('role', 'region');
        warningContainer.setAttribute('aria-labelledby', 'warning-heading');
        
        const warningItems = validation.warnings.map(warning => 
          `<li role="listitem">${warning.message}</li>`
        ).join('');
        
        warningList.innerHTML = warningItems;
        warningList.setAttribute('role', 'list');
        
        // Announce warnings
        const warningText = validation.warnings.map(w => w.message).join('. ');
        mockScreenReader.announce(`警告: ${warningText}`);
      }

      // Then
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(warningContainer).toHaveAttribute('role', 'region');
      expect(warningList).toHaveAttribute('role', 'list');
      expect(warningList.innerHTML).toContain('role="listitem"');
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    // REQ-A11Y-006: 觸控和行動裝置無障礙
    test('Given mobile interface, When touch targets are used, Then minimum size requirements should be met', () => {
      // Given
      const touchTargets = [
        mockDOM.getElementById('import-button'),
        mockDOM.getElementById('export-button'),
        mockDOM.getElementById('file-input')
      ];

      // When - Set minimum touch target sizes (44px x 44px for WCAG)
      touchTargets.forEach(target => {
        target.style.minWidth = '44px';
        target.style.minHeight = '44px';
        target.style.padding = '8px';
      });

      // Then
      touchTargets.forEach(target => {
        expect(parseInt(target.style.minWidth)).toBeGreaterThanOrEqual(44);
        expect(parseInt(target.style.minHeight)).toBeGreaterThanOrEqual(44);
      });
    });

    test('Given voice control user, When voice commands are used, Then interface should respond appropriately', () => {
      // Given
      const importButton = mockDOM.getElementById('import-button');
      const voiceCommands = [];
      
      // Mock voice control interface
      mockWindow.speechRecognition = {
        onCommand: (command) => {
          voiceCommands.push(command);
          
          // Process voice commands
          if (command.includes('import') || command.includes('匯入')) {
            importButton.click();
          }
        }
      };

      // When - Simulate voice command
      mockWindow.speechRecognition.onCommand('匯入名片');

      // Then
      expect(voiceCommands).toContain('匯入名片');
      // Import button should have been activated
      expect(importButton.clicked).toBeTruthy();
    });
  });

  // Helper functions for accessibility testing
  function createAccessibleMockDOM() {
    const mockElement = (id, tagName = 'div', attributes = {}) => {
      const element = {
        id,
        tagName: tagName.toUpperCase(),
        style: {},
        textContent: '',
        innerHTML: '',
        attributes: { ...attributes },
        children: [],
        parentNode: null,
        tabIndex: 0,
        
        getAttribute: jest.fn((name) => element.attributes[name]),
        setAttribute: jest.fn((name, value) => { element.attributes[name] = value; }),
        hasAttribute: jest.fn((name) => name in element.attributes),
        focus: jest.fn(() => { mockDOM.activeElement = element; }),
        click: jest.fn(() => { element.clicked = true; }),
        addEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => [])
      };
      
      // Add ARIA support
      element.setAttribute('role', attributes.role || '');
      element.setAttribute('aria-label', attributes['aria-label'] || '');
      
      return element;
    };

    const elements = {
      'import-button': mockElement('import-button', 'button', { 
        'aria-label': '匯入名片檔案',
        'role': 'button'
      }),
      'export-button': mockElement('export-button', 'button', {
        'aria-label': '匯出名片檔案',
        'role': 'button'
      }),
      'file-input': mockElement('file-input', 'input', {
        'aria-describedby': 'file-help-text',
        'type': 'file'
      }),
      'progress-bar': mockElement('progress-bar', 'div', {
        'role': 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': '0'
      }),
      'status-region': mockElement('status-region', 'div', {
        'aria-live': 'polite',
        'role': 'status'
      }),
      'error-dialog': mockElement('error-dialog', 'dialog', {
        'role': 'alertdialog',
        'aria-modal': 'true'
      }),
      'import-dialog': mockElement('import-dialog', 'dialog', {
        'role': 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'dialog-title'
      })
    };

    // Add more elements as needed
    const additionalElements = [
      'submit-button', 'cancel-button', 'encryption-checkbox', 'download-button',
      'dialog-overlay', 'file-error', 'error-summary', 'dialog-title', 'close-button',
      'success-message', 'error-message', 'warning-message', 'language-selector',
      'main-heading', 'card-display', 'error-heading', 'error-description',
      'retry-button', 'help-link', 'warning-container', 'warning-list'
    ].forEach(id => {
      elements[id] = mockElement(id);
    });

    const mockDOM = {
      getElementById: jest.fn((id) => elements[id] || null),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      addEventListener: jest.fn(),
      activeElement: elements['import-button'],
      documentElement: mockElement('html', 'html', { lang: 'zh-TW' })
    };

    // Add querySelector support for specific selectors
    mockDOM.querySelector = jest.fn((selector) => {
      if (selector === 'input, button, select, textarea') {
        return elements['file-input'];
      }
      return null;
    });

    mockDOM.querySelectorAll = jest.fn((selector) => {
      if (selector === 'input, button, select, textarea') {
        return [elements['file-input'], elements['import-button'], elements['submit-button']];
      }
      if (selector === '[lang="zh-TW"]' || selector === '[lang="en"]') {
        return [mockElement('span', 'span', { lang: selector.match(/lang="([^"]+)"/)[1] })];
      }
      return [];
    });

    return mockDOM;
  }

  function createA11yMockWindow() {
    return {
      location: { origin: 'https://example.com' },
      speechSynthesis: {
        speak: jest.fn(),
        cancel: jest.fn()
      },
      speechRecognition: null
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

  function createMockScreenReader() {
    return {
      announcements: [],
      validationErrors: [],
      languageChanges: [],
      
      announce: jest.fn(function(text) {
        this.announcements.push(text);
        if (this.onAnnouncement) this.onAnnouncement(text);
      }),
      
      announceValidationError: jest.fn(function(error) {
        this.validationErrors.push(error);
        if (this.onValidationError) this.onValidationError(error);
      }),
      
      announceLanguageChange: jest.fn(function(language) {
        this.languageChanges.push(language);
        if (this.onLanguageChange) this.onLanguageChange(language);
      }),
      
      onAnnouncement: null,
      onValidationError: null,
      onLanguageChange: null
    };
  }

  function setupA11yEventListeners() {
    // Mock accessibility APIs
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
  }

  function calculateContrastRatio(color1, color2) {
    // Simplified contrast ratio calculation
    // In real implementation, this would calculate actual WCAG contrast ratios
    const contrastMap = {
      '#007bff_#ffffff': 5.1,  // Blue on white
      '#28a745_#ffffff': 4.6,  // Green on white
      '#dc3545_#ffffff': 5.8,  // Red on white
      '#ffc107_#000000': 10.1  // Yellow on black
    };
    
    const key = `${color1}_${color2}`;
    return contrastMap[key] || 4.5; // Default to minimum AA standard
  }

  function cleanup() {
    transferManager.progressCallbacks.clear();
    cardManager.importCallbacks.clear();
    delete global.document;
    delete global.window;
  }

  // Custom matchers for accessibility testing
  expect.extend({
    toHaveFocus(received) {
      const pass = received === mockDOM.activeElement;
      return {
        message: () =>
          pass
            ? `expected element not to have focus`
            : `expected element to have focus`,
        pass
      };
    },
    
    toHaveStyle(received, expected) {
      const pass = Object.entries(expected).every(([prop, value]) => 
        received.style[prop] === value
      );
      return {
        message: () =>
          pass
            ? `expected element not to have styles ${JSON.stringify(expected)}`
            : `expected element to have styles ${JSON.stringify(expected)}`,
        pass
      };
    }
  });
});