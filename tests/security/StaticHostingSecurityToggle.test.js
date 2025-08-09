/**
 * Test Suite: StaticHostingSecurityToggle
 * Requirement: R-2.4 安全架構輕量化
 * Design: D-3.1 Security Layer (Lightweight)
 * Tasks: T-SECURITY-01, T-SECURITY-02
 */

describe('StaticHostingSecurityToggle', () => {
  let securityToggle;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    global.localStorage = mockLocalStorage;
    global.console = { warn: jest.fn() };

    securityToggle = new StaticHostingSecurityToggle();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-TOG-001: 初始化測試
  describe('Initialization', () => {
    test('should initialize with default features enabled', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const toggle = new StaticHostingSecurityToggle();
      const features = toggle.getAllFeatures();
      
      expect(features.csp).toBe(true);
      expect(features.xssProtection).toBe(true);
      expect(features.inputValidation).toBe(true);
      expect(features.rateLimit).toBe(true);
      expect(features.logging).toBe(true);
    });

    test('should load saved settings from localStorage', () => {
      const savedSettings = {
        csp: false,
        xssProtection: true,
        inputValidation: false
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));
      
      const toggle = new StaticHostingSecurityToggle();
      const features = toggle.getAllFeatures();
      
      expect(features.csp).toBe(false);
      expect(features.xssProtection).toBe(true);
      expect(features.inputValidation).toBe(false);
      expect(features.rateLimit).toBe(true); // Default value
      expect(features.logging).toBe(true); // Default value
    });

    test('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const toggle = new StaticHostingSecurityToggle();
      
      expect(console.warn).toHaveBeenCalledWith('[SecurityToggle] Failed to load settings:', expect.any(Error));
      expect(toggle.getAllFeatures().csp).toBe(true); // Should use defaults
    });

    test('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      const toggle = new StaticHostingSecurityToggle();
      
      expect(console.warn).toHaveBeenCalled();
      expect(toggle.getAllFeatures().csp).toBe(true); // Should use defaults
    });
  });

  // TC-TOG-002: 功能檢查測試
  describe('Feature Checking', () => {
    test('should return correct feature status', () => {
      expect(securityToggle.isEnabled('csp')).toBe(true);
      expect(securityToggle.isEnabled('xssProtection')).toBe(true);
      expect(securityToggle.isEnabled('nonexistent')).toBe(false);
    });

    test('should handle undefined features', () => {
      expect(securityToggle.isEnabled('undefined')).toBe(false);
      expect(securityToggle.isEnabled(null)).toBe(false);
      expect(securityToggle.isEnabled('')).toBe(false);
    });
  });

  // TC-TOG-003: 功能切換測試
  describe('Feature Toggling', () => {
    test('should toggle existing feature', () => {
      expect(securityToggle.toggle('csp', false)).toBe(true);
      expect(securityToggle.isEnabled('csp')).toBe(false);
      
      expect(securityToggle.toggle('csp', true)).toBe(true);
      expect(securityToggle.isEnabled('csp')).toBe(true);
    });

    test('should not toggle non-existent feature', () => {
      expect(securityToggle.toggle('nonexistent', true)).toBe(false);
    });

    test('should convert values to boolean', () => {
      securityToggle.toggle('csp', 'true');
      expect(securityToggle.isEnabled('csp')).toBe(true);
      
      securityToggle.toggle('csp', 0);
      expect(securityToggle.isEnabled('csp')).toBe(false);
      
      securityToggle.toggle('csp', 'false');
      expect(securityToggle.isEnabled('csp')).toBe(true); // Non-empty string is truthy
      
      securityToggle.toggle('csp', null);
      expect(securityToggle.isEnabled('csp')).toBe(false);
    });

    test('should save settings after toggle', () => {
      securityToggle.toggle('csp', false);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pwa-security-features',
        expect.stringContaining('"csp":false')
      );
    });
  });

  // TC-TOG-004: 設定持久化測試
  describe('Settings Persistence', () => {
    test('should save settings to localStorage', () => {
      securityToggle.saveSettings();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pwa-security-features',
        expect.stringMatching(/^\{.*\}$/)
      );
    });

    test('should handle localStorage save errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage save error');
      });
      
      securityToggle.saveSettings();
      
      expect(console.warn).toHaveBeenCalledWith('[SecurityToggle] Failed to save settings:', expect.any(Error));
    });

    test('should load settings from localStorage', () => {
      const testSettings = { csp: false, xssProtection: true };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testSettings));
      
      securityToggle.loadSettings();
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('pwa-security-features');
      expect(securityToggle.isEnabled('csp')).toBe(false);
      expect(securityToggle.isEnabled('xssProtection')).toBe(true);
    });
  });

  // TC-TOG-005: 所有功能狀態測試
  describe('Get All Features', () => {
    test('should return copy of features object', () => {
      const features1 = securityToggle.getAllFeatures();
      const features2 = securityToggle.getAllFeatures();
      
      expect(features1).toEqual(features2);
      expect(features1).not.toBe(features2); // Should be different objects
    });

    test('should not allow external modification', () => {
      const features = securityToggle.getAllFeatures();
      features.csp = false;
      
      expect(securityToggle.isEnabled('csp')).toBe(true); // Original should be unchanged
    });

    test('should include all default features', () => {
      const features = securityToggle.getAllFeatures();
      
      expect(features).toHaveProperty('csp');
      expect(features).toHaveProperty('xssProtection');
      expect(features).toHaveProperty('inputValidation');
      expect(features).toHaveProperty('rateLimit');
      expect(features).toHaveProperty('logging');
    });
  });

  // TC-TOG-006: 邊界條件測試
  describe('Edge Cases', () => {
    test('should handle multiple rapid toggles', () => {
      for (let i = 0; i < 100; i++) {
        securityToggle.toggle('csp', i % 2 === 0);
      }
      
      expect(securityToggle.isEnabled('csp')).toBe(true); // Last toggle was true
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(100);
    });

    test('should handle concurrent access', () => {
      const toggle1 = new StaticHostingSecurityToggle();
      const toggle2 = new StaticHostingSecurityToggle();
      
      toggle1.toggle('csp', false);
      toggle2.toggle('xssProtection', false);
      
      // Both should have saved their changes
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });
});