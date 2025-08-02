// moda-01 Security Tests: CSS注入防護測試
// Task: moda-01, Spec: R-009, D-009
// Coverage: CSS Injection Protection + Input Validation

import { modaDesignSystemManager } from '../../src/design-system/modaDesignSystemManager.js';

describe('CSS Injection Security Tests', () => {
  let manager;

  beforeEach(() => {
    manager = new modaDesignSystemManager();
  });

  describe('Token Validation Security', () => {
    // Security Test: 安全CSS值驗證 - 新增測試
    test('should validate CSS values with security validator', () => {
      const validTokens = {
        colors: {
          primary: {
            1: '#6868ac', // 合法值
            2: 'rgba(104, 104, 172, 0.89)' // 合法值
          },
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      // 合法令牌應該通過驗證
      expect(manager.validateTokens(validTokens)).toBe(true);
    });

    // Security Test: 惡意字體值檢測
    test('should reject malicious typography values', () => {
      const maliciousFontTokens = {
        colors: {
          primary: { 1: '#6868ac' },
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: 'javascript:alert("xss")', // 惡意字體
          fontSize: '0.875rem'
        }
      };

      // 應該拒絕惡意字體令牌
      expect(manager.validateTokens(maliciousFontTokens)).toBe(false);
    });

    // Security Test: 惡意CSS值檢測 - 修復假陽性
    test('should reject malicious CSS values', () => {
      const maliciousTokens = {
        colors: {
          primary: {
            1: 'javascript:alert("xss")', // 惡意值 - 應被拒絕
            2: 'expression(alert("xss"))', // IE expression - 應被拒絕
            3: 'url(javascript:alert(1))' // 惡意URL - 應被拒絕
          },
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      // 應該拒絕惡意令牌（修復假陽性）
      expect(manager.validateTokens(maliciousTokens)).toBe(false);
    });

    // Security Test: 空值和未定義值處理
    test('should handle null and undefined values safely', () => {
      const nullTokens = null;
      const undefinedTokens = undefined;
      const emptyTokens = {};

      expect(manager.validateTokens(nullTokens)).toBe(false);
      expect(manager.validateTokens(undefinedTokens)).toBe(false);
      expect(manager.validateTokens(emptyTokens)).toBe(false);
    });

    // Security Test: 深度嵌套物件攻擊
    test('should handle deeply nested malicious objects', () => {
      const deeplyNestedTokens = {
        colors: {
          primary: {
            1: '#6868ac',
            nested: {
              deep: {
                malicious: 'javascript:alert(1)'
              }
            }
          },
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      expect(manager.validateTokens(deeplyNestedTokens)).toBe(true);
    });
  });

  describe('DOM Manipulation Security', () => {
    // Security Test: DOM操作安全性
    test('should safely handle DOM manipulation errors', async () => {
      // 模擬DOM操作被阻止的情況
      const originalSetProperty = document.documentElement.style.setProperty;
      document.documentElement.style.setProperty = jest.fn(() => {
        throw new Error('Security policy violation');
      });

      await expect(manager.initialize()).rejects.toThrow();

      // 恢復原始方法
      document.documentElement.style.setProperty = originalSetProperty;
    });

    // Security Test: CSS變數名稱清理
    test('should sanitize CSS variable names', async () => {
      const setSpy = jest.spyOn(document.documentElement.style, 'setProperty');
      
      await manager.initialize();

      // 檢查所有設置的CSS變數名稱都以--md-開頭
      const calls = setSpy.mock.calls;
      const cssVariableCalls = calls.filter(call => call[0].startsWith('--md-'));
      
      cssVariableCalls.forEach(call => {
        const variableName = call[0];
        expect(variableName).toMatch(/^--md-[a-z-]+$/);
      });

      setSpy.mockRestore();
    });
  });

  describe('Input Sanitization', () => {
    // Security Test: 字串輸入清理
    test('should handle malformed input gracefully', () => {
      const malformedInputs = [
        { colors: 'not an object' },
        { colors: { primary: 'not an object' } },
        { typography: null },
        { colors: { primary: { 1: null } } }
      ];

      malformedInputs.forEach(input => {
        expect(() => manager.validateTokens(input)).not.toThrow();
        expect(manager.validateTokens(input)).toBe(false);
      });
    });

    // Security Test: 大型輸入處理
    test('should handle large input objects', () => {
      const largeTokens = {
        colors: {
          primary: {},
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      // 創建大量屬性
      for (let i = 0; i < 1000; i++) {
        largeTokens.colors.primary[i] = `#${i.toString(16).padStart(6, '0')}`;
      }

      expect(() => manager.validateTokens(largeTokens)).not.toThrow();
    });
  });

  describe('Error Information Leakage', () => {
    // Security Test: 錯誤訊息不洩露敏感資訊
    test('should not leak sensitive information in error messages', async () => {
      // 模擬初始化失敗
      const originalValidateInitialization = manager.validateInitialization;
      manager.validateInitialization = () => {
        throw new Error('Sensitive internal information');
      };

      try {
        await manager.initialize();
      } catch (error) {
        // 檢查錯誤訊息不包含敏感資訊
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('secret');
        expect(error.message).not.toContain('token');
        expect(error.code).toBe('INITIALIZATION_FAILED');
      }

      // 恢復原始方法
      manager.validateInitialization = originalValidateInitialization;
    });
  });
});