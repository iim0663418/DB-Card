/**
 * UCE-06 Unit Tests: 語言與設計系統整合
 * 對應需求: R-UCE-06, D-UCE-06, T-UCE-06
 * wave: 1
 */

import { EncryptionLanguageIntegration } from '../../pwa-card-storage/src/core/encryption-language-integration';

describe('EncryptionLanguageIntegration', () => {
  let integration: EncryptionLanguageIntegration;

  beforeEach(() => {
    // Mock DOM environment
    global.window = {
      matchMedia: jest.fn(() => ({ matches: false, addEventListener: jest.fn() })),
      getComputedStyle: jest.fn(() => ({ fontSize: '16px' })),
      addEventListener: jest.fn(),
      CustomEvent: jest.fn(),
      dispatchEvent: jest.fn()
    } as any;

    global.document = {
      documentElement: { style: { fontSize: '16px' } },
      querySelectorAll: jest.fn(() => []),
      createElement: jest.fn(() => ({
        style: {},
        addEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn()
      }))
    } as any;

    integration = new EncryptionLanguageIntegration();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-UCE06-001: 基本初始化測試
  // Given: 新建 EncryptionLanguageIntegration 實例
  // When: 初始化執行
  // Then: 預設語言為 zh-TW，無障礙設定正確載入
  describe('TC-UCE06-001: Basic Initialization', () => {
    it('should initialize with default language zh-TW', () => {
      expect(integration.getCurrentLanguage()).toBe('zh-TW');
    });

    it('should initialize accessibility settings', () => {
      const settings = integration.getAccessibilitySettings();
      expect(settings).toHaveProperty('highContrast');
      expect(settings).toHaveProperty('largeText');
      expect(settings).toHaveProperty('screenReader');
      expect(typeof settings.highContrast).toBe('boolean');
    });
  });

  // TC-UCE06-002: 語言切換功能測試
  // Given: 使用者切換語言
  // When: 語言變更事件觸發
  // Then: 加密介面即時更新語言
  describe('TC-UCE06-002: Language Switching', () => {
    it('should switch language successfully', () => {
      integration.updateEncryptionUILanguage('en-US');
      expect(integration.getCurrentLanguage()).toBe('en-US');
    });

    it('should reject invalid language codes', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      integration.updateEncryptionUILanguage('invalid-lang');
      expect(integration.getCurrentLanguage()).toBe('zh-TW'); // Should remain unchanged
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should trigger language change event', () => {
      const dispatchSpy = jest.spyOn(global.window, 'dispatchEvent');
      integration.updateEncryptionUILanguage('en-US');
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'encryptionLanguageChanged'
        })
      );
    });
  });

  // TC-UCE06-003: 翻譯功能測試
  // Given: 翻譯鍵值輸入
  // When: translateEncryptionUI 執行
  // Then: 返回對應語言翻譯或原鍵值
  describe('TC-UCE06-003: Translation Features', () => {
    it('should translate keys in Chinese', () => {
      integration.updateEncryptionUILanguage('zh-TW');
      const result = integration.translateEncryptionUI('encryption.setup.title');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should translate keys in English', () => {
      integration.updateEncryptionUILanguage('en-US');
      const result = integration.translateEncryptionUI('encryption.setup.title');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should sanitize malicious input', () => {
      const maliciousKey = '<script>alert("xss")</script>';
      const result = integration.translateEncryptionUI(maliciousKey);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should limit key length', () => {
      const longKey = 'a'.repeat(200);
      const result = integration.translateEncryptionUI(longKey);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  // TC-UCE06-004: ARIA 標籤生成測試
  // Given: 螢幕閱讀器使用者
  // When: 導航加密介面
  // Then: 提供完整 ARIA 標籤
  describe('TC-UCE06-004: ARIA Labels Generation', () => {
    it('should generate setup dialog ARIA labels', () => {
      const labels = integration.generateARIALabels('setup');
      expect(labels).toHaveProperty('aria-label');
      expect(labels).toHaveProperty('role', 'dialog');
      expect(labels).toHaveProperty('aria-modal', 'true');
    });

    it('should generate unlock dialog ARIA labels', () => {
      const labels = integration.generateARIALabels('unlock');
      expect(labels).toHaveProperty('aria-label');
      expect(labels).toHaveProperty('role', 'dialog');
    });

    it('should generate recovery dialog ARIA labels', () => {
      const labels = integration.generateARIALabels('recovery');
      expect(labels).toHaveProperty('aria-label');
      expect(labels).toHaveProperty('role', 'dialog');
    });
  });

  // TC-UCE06-005: moda 設計系統應用測試
  // Given: 高齡使用者
  // When: 開啟加密對話框
  // Then: 顯示大字體高對比介面
  describe('TC-UCE06-005: Moda Design System Application', () => {
    let mockElement: any;

    beforeEach(() => {
      mockElement = {
        style: {},
        tagName: 'BUTTON',
        addEventListener: jest.fn()
      };
    });

    it('should apply basic moda styles', () => {
      integration.applyModaDesignSystem(mockElement);
      expect(mockElement.style.fontFamily).toContain('Noto Sans');
      expect(mockElement.style.borderRadius).toBe('0.5rem');
      expect(mockElement.style.transition).toContain('ease-in-out');
    });

    it('should apply variant styles', () => {
      integration.applyModaDesignSystem(mockElement, { variant: 'primary' });
      expect(mockElement.style.backgroundColor).toBe('#1976d2');
      expect(mockElement.style.color).toBe('#ffffff');
    });

    it('should apply size styles', () => {
      integration.applyModaDesignSystem(mockElement, { size: 'large' });
      expect(mockElement.style.fontSize).toBe('1.25rem');
      expect(mockElement.style.padding).toBe('1.5rem');
    });

    it('should ensure minimum touch target for buttons', () => {
      integration.applyModaDesignSystem(mockElement);
      expect(mockElement.style.minHeight).toBe('44px');
      expect(mockElement.style.minWidth).toBe('44px');
    });
  });

  // TC-UCE06-006: 無障礙功能測試
  // Given: 無障礙需求使用者
  // When: 使用加密介面
  // Then: 符合 WCAG 2.1 AA 標準
  describe('TC-UCE06-006: Accessibility Features', () => {
    it('should detect high contrast preference', () => {
      (global.window.matchMedia as jest.Mock).mockReturnValue({ matches: true });
      const newIntegration = new EncryptionLanguageIntegration();
      const settings = newIntegration.getAccessibilitySettings();
      expect(settings.highContrast).toBe(true);
    });

    it('should detect large text preference', () => {
      (global.window.getComputedStyle as jest.Mock).mockReturnValue({ fontSize: '20px' });
      const newIntegration = new EncryptionLanguageIntegration();
      const settings = newIntegration.getAccessibilitySettings();
      expect(settings.largeText).toBe(true);
    });

    it('should detect screen reader', () => {
      global.window.speechSynthesis = {} as any;
      const newIntegration = new EncryptionLanguageIntegration();
      const settings = newIntegration.getAccessibilitySettings();
      expect(settings.screenReader).toBe(true);
    });
  });

  // TC-UCE06-007: 效能測試
  // Given: 大量翻譯操作
  // When: 執行翻譯
  // Then: 回應時間 <100ms
  describe('TC-UCE06-007: Performance Tests', () => {
    it('should translate quickly', () => {
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        integration.translateEncryptionUI('encryption.setup.title');
      }
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should switch languages quickly', () => {
      const startTime = performance.now();
      for (let i = 0; i < 10; i++) {
        integration.updateEncryptionUILanguage(i % 2 === 0 ? 'zh-TW' : 'en-US');
      }
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});