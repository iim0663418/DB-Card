/**
 * Test Suite: LightweightSecurityCore
 * Requirement: R-2.4 安全架構輕量化
 * Design: D-3.1 Security Layer (Lightweight)
 * Tasks: T-SECURITY-01, T-SECURITY-02
 */

describe('LightweightSecurityCore', () => {
  let securityCore;
  let mockDocument;

  beforeEach(() => {
    // Reset singleton instance
    LightweightSecurityCore._instance = null;
    
    // Mock DOM
    mockDocument = {
      querySelector: jest.fn(),
      createElement: jest.fn(),
      head: { appendChild: jest.fn() }
    };
    global.document = mockDocument;
    global.console = { log: jest.fn(), error: jest.fn() };
    
    securityCore = LightweightSecurityCore.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-SEC-001: 單例模式測試
  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = LightweightSecurityCore.getInstance();
      const instance2 = LightweightSecurityCore.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  // TC-SEC-002: CSP 設置測試
  describe('CSP Setup', () => {
    test('should setup CSP meta tag when not exists', () => {
      mockDocument.querySelector.mockReturnValue(null);
      const mockMeta = { httpEquiv: '', content: '' };
      mockDocument.createElement.mockReturnValue(mockMeta);

      securityCore.setupCSP();

      expect(mockDocument.querySelector).toHaveBeenCalledWith('meta[http-equiv="Content-Security-Policy"]');
      expect(mockDocument.createElement).toHaveBeenCalledWith('meta');
      expect(mockMeta.httpEquiv).toBe('Content-Security-Policy');
      expect(mockMeta.content).toContain("default-src 'self'");
      expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockMeta);
    });

    test('should not setup CSP when already exists', () => {
      mockDocument.querySelector.mockReturnValue({});
      
      securityCore.setupCSP();
      
      expect(mockDocument.createElement).not.toHaveBeenCalled();
    });
  });

  // TC-SEC-003: 輸入驗證測試
  describe('Input Validation', () => {
    test('should validate normal input', () => {
      const result = LightweightSecurityCore.validateInput('normal text');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('normal text');
    });

    test('should reject empty input', () => {
      const result = LightweightSecurityCore.validateInput('');
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe('');
    });

    test('should reject null/undefined input', () => {
      expect(LightweightSecurityCore.validateInput(null).valid).toBe(false);
      expect(LightweightSecurityCore.validateInput(undefined).valid).toBe(false);
    });

    test('should reject non-string input', () => {
      expect(LightweightSecurityCore.validateInput(123).valid).toBe(false);
      expect(LightweightSecurityCore.validateInput({}).valid).toBe(false);
    });

    test('should reject input exceeding max length', () => {
      const longInput = 'a'.repeat(1001);
      const result = LightweightSecurityCore.validateInput(longInput);
      expect(result.valid).toBe(false);
    });

    test('should sanitize XSS attempts', () => {
      const xssInput = '<script>alert("xss")</script>';
      const result = LightweightSecurityCore.validateInput(xssInput);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('</script>');
    });

    test('should remove javascript: protocol', () => {
      const jsInput = 'javascript:alert("xss")';
      const result = LightweightSecurityCore.validateInput(jsInput);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
      const eventInput = 'onclick=alert("xss")';
      const result = LightweightSecurityCore.validateInput(eventInput);
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('onclick=');
    });
  });

  // TC-SEC-004: HTML 轉義測試
  describe('HTML Escaping', () => {
    test('should escape HTML entities', () => {
      const html = '<div>test & "quote" \'single\'</div>';
      const escaped = LightweightSecurityCore.escapeHtml(html);
      expect(escaped).toBe('&lt;div&gt;test &amp; &quot;quote&quot; &#x27;single&#x27;&lt;/div&gt;');
    });

    test('should handle empty input', () => {
      expect(LightweightSecurityCore.escapeHtml('')).toBe('');
      expect(LightweightSecurityCore.escapeHtml(null)).toBe('');
      expect(LightweightSecurityCore.escapeHtml(undefined)).toBe('');
    });

    test('should convert non-string to string', () => {
      expect(LightweightSecurityCore.escapeHtml(123)).toBe('123');
      expect(LightweightSecurityCore.escapeHtml(true)).toBe('true');
    });
  });

  // TC-SEC-005: 速率限制測試
  describe('Rate Limiting', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should allow operations within limit', () => {
      for (let i = 0; i < 100; i++) {
        expect(securityCore.checkRateLimit('test')).toBe(true);
      }
    });

    test('should block operations exceeding limit', () => {
      // Exceed limit
      for (let i = 0; i < 101; i++) {
        securityCore.checkRateLimit('test');
      }
      expect(securityCore.checkRateLimit('test')).toBe(false);
    });

    test('should reset after time window', () => {
      // Exceed limit
      for (let i = 0; i < 101; i++) {
        securityCore.checkRateLimit('test');
      }
      expect(securityCore.checkRateLimit('test')).toBe(false);

      // Advance time beyond window
      jest.advanceTimersByTime(61000);
      expect(securityCore.checkRateLimit('test')).toBe(true);
    });

    test('should handle different operations separately', () => {
      for (let i = 0; i < 100; i++) {
        securityCore.checkRateLimit('op1');
      }
      expect(securityCore.checkRateLimit('op2')).toBe(true);
    });
  });

  // TC-SEC-006: 安全日誌測試
  describe('Security Logging', () => {
    test('should log info messages', () => {
      LightweightSecurityCore.log('info', 'test message');
      expect(console.log).toHaveBeenCalledWith('[Security]', expect.objectContaining({
        level: 'info',
        message: 'test message',
        source: 'LightweightSecurity'
      }));
    });

    test('should log error messages', () => {
      LightweightSecurityCore.log('error', 'error message');
      expect(console.error).toHaveBeenCalledWith('[Security]', expect.objectContaining({
        level: 'error',
        message: 'error message'
      }));
    });

    test('should escape HTML in log messages', () => {
      LightweightSecurityCore.log('info', '<script>alert("xss")</script>');
      expect(console.log).toHaveBeenCalledWith('[Security]', expect.objectContaining({
        message: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      }));
    });

    test('should include timestamp', () => {
      const beforeTime = new Date().toISOString();
      LightweightSecurityCore.log('info', 'test');
      const afterTime = new Date().toISOString();
      
      const logCall = console.log.mock.calls[0][1];
      expect(logCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(logCall.timestamp >= beforeTime).toBe(true);
      expect(logCall.timestamp <= afterTime).toBe(true);
    });
  });
});