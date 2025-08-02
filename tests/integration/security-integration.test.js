// Security Integration Tests - 端到端安全驗證
// Bug Fix: CSR-moda01-001, CSR-moda01-002 整合測試
// Coverage: 完整安全流程驗證

import { modaDesignSystemManager } from '../../src/design-system/modaDesignSystemManager.js';

describe('Security Integration Tests', () => {
  let manager;
  let consoleSpy;

  beforeEach(() => {
    manager = new modaDesignSystemManager();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('End-to-End Security Flow', () => {
    // Given: 完整的初始化流程
    // When: 包含惡意內容的令牌
    // Then: 系統應安全地拒絕並記錄

    test('should block malicious tokens during full initialization', async () => {
      // 替換為包含惡意內容的令牌
      manager.modaTokens = {
        colors: {
          primary: {
            1: 'javascript:alert("xss")', // 惡意內容
            2: 'rgba(104, 104, 172, 0.89)'
          },
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      // 初始化應該失敗
      await expect(manager.initialize()).rejects.toThrow('Invalid design tokens');
      
      // 系統狀態應保持未初始化
      expect(manager.isInitialized()).toBe(false);
      expect(manager.getState().tokensLoaded).toBe(false);
    });

    test('should safely handle mixed valid and invalid tokens', async () => {
      manager.modaTokens = {
        colors: {
          primary: {
            1: '#6868ac', // 合法
            2: 'expression(alert("xss"))', // 惡意
            3: '#4e4e81' // 合法
          },
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      // 整個令牌集應被拒絕（一個惡意值污染整個集合）
      await expect(manager.initialize()).rejects.toThrow('Invalid design tokens');
    });

    test('should maintain security during DOM manipulation', async () => {
      // 使用合法令牌初始化
      await manager.initialize();
      
      // 檢查DOM中設置的CSS變數都是安全的
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // 驗證關鍵變數已正確設置
      const primaryColor = computedStyle.getPropertyValue('--md-primary-1').trim();
      expect(primaryColor).toBe('#6868ac');
      
      // 確保沒有安全警告
      const securityWarnings = consoleSpy.mock.calls.filter(call => 
        call[0] && (
          call[0].includes('Blocked malicious') || 
          call[0].includes('Blocked invalid')
        )
      );
      expect(securityWarnings).toHaveLength(0);
    });
  });

  describe('Security Logging and Monitoring', () => {
    test('should log security events with proper details', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const maliciousTokens = {
        colors: {
          primary: { 1: 'javascript:alert("logged")' },
          secondary: { 1: '#565e62' },
          neutral: { 1: '#1a1a1a' }
        },
        typography: {
          fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
          fontSize: '0.875rem'
        }
      };

      manager.validateTokens(maliciousTokens);

      // 檢查是否記錄了安全事件
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid CSS value detected')
      );

      consoleErrorSpy.mockRestore();
    });

    test('should not leak sensitive information in logs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await manager.initialize();
        
        // 模擬內部錯誤
        manager.validateInitialization = () => {
          throw new Error('Internal system error with sensitive data: password123');
        };
        
        await manager.initialize();
      } catch (error) {
        // 檢查錯誤日誌不包含敏感資訊
        const allLogs = consoleErrorSpy.mock.calls.flat();
        allLogs.forEach(log => {
          if (typeof log === 'string') {
            expect(log).not.toContain('password');
            expect(log).not.toContain('secret');
            expect(log).not.toContain('key');
          }
        });
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance Impact of Security Checks', () => {
    test('should maintain performance with security validation', async () => {
      const startTime = performance.now();
      
      await manager.initialize();
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      // 安全檢查不應顯著影響效能（仍應在500ms內）
      expect(initTime).toBeLessThan(500);
      expect(manager.getState().loadTime).toBeLessThan(500);
    });

    test('should handle large token sets efficiently', () => {
      // 創建大型令牌集
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

      // 添加大量合法色彩值
      for (let i = 1; i <= 100; i++) {
        largeTokens.colors.primary[i] = `#${i.toString(16).padStart(6, '0')}`;
      }

      const startTime = performance.now();
      const result = manager.validateTokens(largeTokens);
      const endTime = performance.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // 驗證應在100ms內完成
    });
  });

  describe('Security Regression Prevention', () => {
    test('should prevent bypass attempts', () => {
      // 嘗試各種繞過技巧
      const bypassAttempts = [
        'java\u0000script:alert(1)', // null byte
        'java\tscript:alert(1)', // tab character
        'java\nscript:alert(1)', // newline
        'java\rscript:alert(1)', // carriage return
        'JAVASCRIPT:alert(1)', // 大寫
        'JavaScript:alert(1)', // 混合大小寫
        'javascript\u00A0:alert(1)', // non-breaking space
        'javascript&#58;alert(1)', // HTML entity
        'javascript%3Aalert(1)' // URL encoding
      ];

      bypassAttempts.forEach(attempt => {
        const tokens = {
          colors: {
            primary: { 1: attempt },
            secondary: { 1: '#565e62' },
            neutral: { 1: '#1a1a1a' }
          },
          typography: {
            fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
            fontSize: '0.875rem'
          }
        };

        expect(manager.validateTokens(tokens)).toBe(false);
      });
    });

    test('should maintain whitelist integrity', async () => {
      await manager.initialize();
      
      // 檢查所有設置的CSS變數都符合白名單
      const setPropertySpy = jest.spyOn(document.documentElement.style, 'setProperty');
      
      manager.applyCSSVariables();
      
      setPropertySpy.mock.calls.forEach(call => {
        const variableName = call[0];
        expect(
          variableName.startsWith('--md-') || variableName.startsWith('--bs-')
        ).toBe(true);
      });

      setPropertySpy.mockRestore();
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    test('should recover gracefully from security violations', async () => {
      // 第一次嘗試：惡意令牌
      manager.modaTokens.colors.primary[1] = 'javascript:alert("test")';
      
      await expect(manager.initialize()).rejects.toThrow();
      expect(manager.isInitialized()).toBe(false);
      
      // 第二次嘗試：修復令牌
      manager.modaTokens.colors.primary[1] = '#6868ac';
      manager.state.initialized = false; // 重置狀態
      
      await expect(manager.initialize()).resolves.not.toThrow();
      expect(manager.isInitialized()).toBe(true);
    });

    test('should maintain system stability after security events', async () => {
      // 觸發多個安全事件
      const maliciousInputs = [
        'javascript:alert(1)',
        'expression(alert(2))',
        'url(javascript:alert(3))'
      ];

      maliciousInputs.forEach(input => {
        const tokens = {
          colors: {
            primary: { 1: input },
            secondary: { 1: '#565e62' },
            neutral: { 1: '#1a1a1a' }
          },
          typography: {
            fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
            fontSize: '0.875rem'
          }
        };
        
        expect(() => manager.validateTokens(tokens)).not.toThrow();
        expect(manager.validateTokens(tokens)).toBe(false);
      });

      // 系統應仍能正常處理合法輸入
      await expect(manager.initialize()).resolves.not.toThrow();
      expect(manager.isInitialized()).toBe(true);
    });
  });
});