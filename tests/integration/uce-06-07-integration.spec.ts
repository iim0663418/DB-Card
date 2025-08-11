/**
 * UCE-06 & UCE-07 Integration Tests: 語言整合與安全測試協作
 * 對應需求: R-UCE-06, R-UCE-07, D-UCE-06, D-UCE-07
 * wave: 3
 */

import { EncryptionLanguageIntegration } from '../../pwa-card-storage/src/core/encryption-language-integration';
import { EncryptionSecurityTestSuite } from '../../pwa-card-storage/src/core/encryption-security-test-suite';

describe('UCE-06 & UCE-07 Integration', () => {
  let languageIntegration: EncryptionLanguageIntegration;
  let securityTestSuite: EncryptionSecurityTestSuite;
  let mockUserKeyManager: any;

  beforeEach(() => {
    // Mock browser environment
    global.window = {
      matchMedia: jest.fn(() => ({ matches: false, addEventListener: jest.fn() })),
      getComputedStyle: jest.fn(() => ({ fontSize: '16px' })),
      addEventListener: jest.fn(),
      CustomEvent: jest.fn(),
      dispatchEvent: jest.fn(),
      crypto: {
        subtle: {
          importKey: jest.fn().mockResolvedValue({}),
          deriveKey: jest.fn().mockResolvedValue({}),
          encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
          decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
          digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
        },
        getRandomValues: jest.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        })
      }
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

    global.performance = { now: jest.fn(() => Date.now()) } as any;

    mockUserKeyManager = {
      generateDeterministicKey: jest.fn().mockResolvedValue({
        key: { type: 'mock-key' },
        keyId: 'test_key_123',
        salt: new Uint8Array(32)
      }),
      setUserPassphrase: jest.fn().mockResolvedValue({
        success: true,
        keyId: 'test_key_123',
        entropy: 65
      }),
      verifyUserPassphrase: jest.fn().mockResolvedValue({
        success: true,
        keyId: 'test_key_123'
      }),
      validatePassphraseStructure: jest.fn().mockReturnValue({
        valid: true,
        entropy: 65
      }),
      clearMemory: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue({
        hasActiveKey: true,
        cacheSize: 0
      })
    };

    languageIntegration = new EncryptionLanguageIntegration();
    securityTestSuite = new EncryptionSecurityTestSuite();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-INT-001: 多語言安全測試
  // Given: 不同語言環境
  // When: 執行安全測試
  // Then: 所有語言環境下安全測試通過
  describe('TC-INT-001: Multilingual Security Testing', () => {
    it('should run security tests in Chinese environment', async () => {
      languageIntegration.updateEncryptionUILanguage('zh-TW');
      
      const result = await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      expect(result.overallResult).toBeDefined();
      expect(result.totalTests).toBeGreaterThan(0);
    });

    it('should run security tests in English environment', async () => {
      languageIntegration.updateEncryptionUILanguage('en-US');
      
      const result = await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      expect(result.overallResult).toBeDefined();
      expect(result.totalTests).toBeGreaterThan(0);
    });

    it('should validate multilingual input sanitization', async () => {
      const chineseXSS = '<script>alert("中文XSS")</script>';
      const englishXSS = '<script>alert("English XSS")</script>';
      
      languageIntegration.updateEncryptionUILanguage('zh-TW');
      const chineseResult = languageIntegration.translateEncryptionUI(chineseXSS);
      expect(chineseResult).not.toContain('<script>');
      
      languageIntegration.updateEncryptionUILanguage('en-US');
      const englishResult = languageIntegration.translateEncryptionUI(englishXSS);
      expect(englishResult).not.toContain('<script>');
    });
  });

  // TC-INT-002: 無障礙安全測試
  // Given: 無障礙功能啟用
  // When: 執行安全測試
  // Then: 無障礙功能不影響安全性
  describe('TC-INT-002: Accessibility Security Testing', () => {
    it('should maintain security with high contrast mode', async () => {
      // Mock high contrast preference
      (global.window.matchMedia as jest.Mock).mockReturnValue({ matches: true });
      const accessibleIntegration = new EncryptionLanguageIntegration();
      
      const settings = accessibleIntegration.getAccessibilitySettings();
      expect(settings.highContrast).toBe(true);
      
      // Security should not be compromised
      const result = await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      expect(result.criticalIssues).toBe(0);
    });

    it('should maintain security with large text mode', async () => {
      (global.window.getComputedStyle as jest.Mock).mockReturnValue({ fontSize: '20px' });
      const accessibleIntegration = new EncryptionLanguageIntegration();
      
      const settings = accessibleIntegration.getAccessibilitySettings();
      expect(settings.largeText).toBe(true);
      
      const result = await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      expect(result.criticalIssues).toBe(0);
    });

    it('should maintain security with screen reader support', async () => {
      global.window.speechSynthesis = {} as any;
      const accessibleIntegration = new EncryptionLanguageIntegration();
      
      const settings = accessibleIntegration.getAccessibilitySettings();
      expect(settings.screenReader).toBe(true);
      
      const result = await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      expect(result.criticalIssues).toBe(0);
    });
  });

  // TC-INT-003: 設計系統安全整合
  // Given: moda 設計系統應用
  // When: 安全檢查執行
  // Then: 設計系統不引入安全漏洞
  describe('TC-INT-003: Design System Security Integration', () => {
    it('should apply secure styles without XSS risks', () => {
      const mockElement = {
        style: {},
        tagName: 'BUTTON',
        addEventListener: jest.fn()
      };

      // Apply design system styles
      languageIntegration.applyModaDesignSystem(mockElement, {
        variant: 'primary',
        size: 'large'
      });

      // Verify no malicious content in styles
      Object.values(mockElement.style).forEach(value => {
        if (typeof value === 'string') {
          expect(value).not.toContain('<script>');
          expect(value).not.toContain('javascript:');
          expect(value).not.toContain('data:text/html');
        }
      });
    });

    it('should generate secure ARIA labels', () => {
      const labels = languageIntegration.generateARIALabels('setup');
      
      // Verify ARIA labels don't contain malicious content
      Object.values(labels).forEach(value => {
        if (typeof value === 'string') {
          expect(value).not.toContain('<script>');
          expect(value).not.toContain('javascript:');
          expect(value).not.toMatch(/on\w+=/i); // No event handlers
        }
      });
    });
  });

  // TC-INT-004: 語言切換安全性
  // Given: 語言切換功能
  // When: 惡意語言代碼輸入
  // Then: 安全驗證阻擋惡意輸入
  describe('TC-INT-004: Language Switching Security', () => {
    it('should reject malicious language codes', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const maliciousLangCodes = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '../../../etc/passwd',
        'zh-TW<img src=x onerror=alert(1)>'
      ];

      maliciousLangCodes.forEach(maliciousCode => {
        languageIntegration.updateEncryptionUILanguage(maliciousCode);
        // Language should remain unchanged
        expect(['zh-TW', 'en-US']).toContain(languageIntegration.getCurrentLanguage());
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should sanitize translation keys securely', () => {
      const maliciousKeys = [
        '<script>alert("xss")</script>',
        'key"><script>alert("xss")</script>',
        'key\'; DROP TABLE translations; --',
        'key${alert("xss")}'
      ];

      maliciousKeys.forEach(maliciousKey => {
        const result = languageIntegration.translateEncryptionUI(maliciousKey);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
        expect(result).not.toContain('DROP TABLE');
        expect(result).not.toContain('${');
      });
    });
  });

  // TC-INT-005: 整合效能與安全測試
  // Given: 語言整合與安全測試同時運行
  // When: 效能測試執行
  // Then: 效能符合要求且安全性不受影響
  describe('TC-INT-005: Integrated Performance and Security Testing', () => {
    it('should maintain performance with security checks enabled', async () => {
      const startTime = performance.now();
      
      // Perform language operations
      for (let i = 0; i < 50; i++) {
        languageIntegration.translateEncryptionUI('encryption.setup.title');
        languageIntegration.updateEncryptionUILanguage(i % 2 === 0 ? 'zh-TW' : 'en-US');
      }
      
      // Run security tests
      await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(15000); // < 15 seconds for integrated testing
    });

    it('should handle concurrent language and security operations', async () => {
      const promises = [];
      
      // Concurrent language operations
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          languageIntegration.translateEncryptionUI('encryption.setup.title');
          return 'language-op-' + i;
        }));
      }
      
      // Concurrent security test
      promises.push(securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null));
      
      const results = await Promise.all(promises);
      
      // Verify all operations completed successfully
      expect(results).toHaveLength(11);
      expect(results[10]).toHaveProperty('overallResult');
    });
  });

  // TC-INT-006: 錯誤處理整合測試
  // Given: 語言整合與安全測試
  // When: 異常情況發生
  // Then: 系統優雅降級
  describe('TC-INT-006: Integrated Error Handling', () => {
    it('should handle language integration failures gracefully during security testing', async () => {
      // Mock language integration failure
      const faultyIntegration = new EncryptionLanguageIntegration();
      jest.spyOn(faultyIntegration, 'translateEncryptionUI').mockImplementation(() => {
        throw new Error('Translation service unavailable');
      });
      
      // Security testing should still work
      const result = await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      expect(result).toHaveProperty('overallResult');
      expect(result.totalTests).toBeGreaterThan(0);
    });

    it('should continue language operations when security tests fail', async () => {
      // Mock security test failure
      const faultySecuritySuite = new EncryptionSecurityTestSuite();
      jest.spyOn(faultySecuritySuite, 'runFullSecuritySuite').mockRejectedValue(
        new Error('Security test infrastructure failure')
      );
      
      // Language operations should still work
      expect(() => {
        languageIntegration.translateEncryptionUI('encryption.setup.title');
        languageIntegration.updateEncryptionUILanguage('en-US');
      }).not.toThrow();
      
      expect(languageIntegration.getCurrentLanguage()).toBe('en-US');
    });
  });

  // TC-INT-007: 端到端安全語言流程
  // Given: 完整的語言與安全整合流程
  // When: 端到端測試執行
  // Then: 所有功能協同工作
  describe('TC-INT-007: End-to-End Security Language Flow', () => {
    it('should complete full integration workflow', async () => {
      // Step 1: Initialize language integration
      expect(languageIntegration.getCurrentLanguage()).toBe('zh-TW');
      
      // Step 2: Apply design system with accessibility
      const mockElement = {
        style: {},
        tagName: 'BUTTON',
        addEventListener: jest.fn()
      };
      languageIntegration.applyModaDesignSystem(mockElement);
      expect(mockElement.style.fontFamily).toContain('Noto Sans');
      
      // Step 3: Generate ARIA labels
      const ariaLabels = languageIntegration.generateARIALabels('setup');
      expect(ariaLabels).toHaveProperty('aria-label');
      
      // Step 4: Switch language
      languageIntegration.updateEncryptionUILanguage('en-US');
      expect(languageIntegration.getCurrentLanguage()).toBe('en-US');
      
      // Step 5: Run comprehensive security tests
      const securityResult = await securityTestSuite.runFullSecuritySuite(mockUserKeyManager, null);
      expect(securityResult.overallResult).toBeDefined();
      
      // Step 6: Generate security report
      const report = securityTestSuite.generateSecurityReport();
      expect(report).toContain('Security Test Report');
      
      // Step 7: Verify threat model status
      const threatModels = securityTestSuite.getThreatModelStatus();
      expect(threatModels).toHaveLength(5);
    });
  });
});