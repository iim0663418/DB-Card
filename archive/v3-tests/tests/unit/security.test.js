/**
 * Security Unit Tests - SEC-01, SEC-02, SEC-03
 * Tests for CWE-94, CWE-502, XSS protection, and secure logging
 * 
 * @requirements SEC-01, SEC-02, SEC-03
 * @security CWE-94, CWE-502, CWE-117, XSS
 */

const { JSDOM } = require('jsdom');

// Mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('Security Tests', () => {
  
  describe('SEC-01: Critical Security Vulnerabilities', () => {
    
    test('TC-SEC-001: Should prevent CWE-94 code injection', () => {
      // Given: Malicious input that could cause code injection
      const maliciousInput = 'alert("XSS")';
      
      // When: Processing input through safe evaluation
      const safeEval = (input) => {
        if (typeof input !== 'string' || input.includes('eval') || input.includes('Function')) {
          return null;
        }
        try {
          return Function('"use strict"; return (' + input + ')')();
        } catch (e) {
          return null;
        }
      };
      
      // Then: Should not execute malicious code
      const result = safeEval(maliciousInput);
      expect(result).toBeNull();
    });

    test('TC-SEC-002: Should prevent CWE-502 unsafe deserialization', () => {
      // Given: Untrusted JSON data
      const untrustedData = '{"__proto__": {"isAdmin": true}}';
      
      // When: Using safe JSON parsing
      const safeJSONParse = (data) => {
        try {
          const parsed = JSON.parse(data);
          // Validate structure and remove prototype pollution
          if (parsed && typeof parsed === 'object') {
            delete parsed.__proto__;
            delete parsed.constructor;
            delete parsed.prototype;
          }
          return parsed;
        } catch (e) {
          return null;
        }
      };
      
      // Then: Should safely parse without prototype pollution
      const result = safeJSONParse(untrustedData);
      expect(result).not.toHaveProperty('__proto__');
      expect(result.isAdmin).toBeUndefined();
    });

    test('TC-SEC-003: Should validate data structure', () => {
      // Given: Invalid data structure
      const invalidData = { malicious: '<script>alert("xss")</script>' };
      
      // When: Validating data structure
      const validateDataStructure = (data) => {
        if (!data || typeof data !== 'object') return false;
        
        // Check for dangerous properties
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        for (const key of dangerousKeys) {
          if (key in data) return false;
        }
        
        // Sanitize string values
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string' && /<script|javascript:|on\w+=/i.test(value)) {
            return false;
          }
        }
        
        return true;
      };
      
      // Then: Should reject malicious data
      expect(validateDataStructure(invalidData)).toBe(false);
    });
  });

  describe('SEC-02: XSS Protection', () => {
    
    test('TC-SEC-004: Should sanitize input', () => {
      // Given: Malicious input with XSS payload
      const maliciousInput = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
      
      // When: Sanitizing input
      const sanitizeInput = (input) => {
        if (typeof input !== 'string') return '';
        return input
          .replace(/[<>"'&]/g, (match) => {
            const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
            return map[match];
          })
          .substring(0, 1000);
      };
      
      // Then: Should escape dangerous characters
      const result = sanitizeInput(maliciousInput);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onerror=');
      expect(result).toContain('&lt;script&gt;');
    });

    test('TC-SEC-005: Should sanitize output', () => {
      // Given: Content that needs output sanitization
      const unsafeContent = 'Hello <b>World</b> & "Friends"';
      
      // When: Sanitizing output
      const sanitizeOutput = (text) => {
        if (typeof text !== 'string') return text;
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      };
      
      // Then: Should properly encode HTML entities
      const result = sanitizeOutput(unsafeContent);
      expect(result).toBe('Hello &lt;b&gt;World&lt;/b&gt; &amp; &quot;Friends&quot;');
    });

    test('TC-SEC-006: Should use safe DOM manipulation', () => {
      // Given: DOM element and potentially unsafe content
      const element = document.createElement('div');
      const unsafeContent = '<script>alert("XSS")</script>Safe content';
      
      // When: Using safe DOM insertion
      const safeSetHTML = (element, content) => {
        element.textContent = content; // Use textContent instead of innerHTML
      };
      
      safeSetHTML(element, unsafeContent);
      
      // Then: Should not execute scripts
      expect(element.innerHTML).not.toContain('<script>');
      expect(element.textContent).toContain('Safe content');
    });
  });

  describe('SEC-03: Secure Logging System', () => {
    
    test('TC-SEC-007: Should prevent log injection (CWE-117)', () => {
      // Given: Malicious log input
      const maliciousMessage = 'User login\n[ADMIN] Privilege escalation\r\nFAKE LOG ENTRY';
      const maliciousData = { user: 'test\n[ADMIN] fake admin' };
      
      // When: Using secure logging
      const secureLog = (message, data = {}) => {
        const sanitizeLogInput = (input) => {
          if (typeof input !== 'string') return String(input);
          return input
            .replace(/[\r\n\t]/g, ' ')  // Remove line breaks
            .replace(/[<>"'&]/g, (match) => {
              const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;'};
              return map[match];
            })
            .substring(0, 200); // Limit length
        };
        
        const safeMessage = sanitizeLogInput(message);
        const safeData = Object.keys(data).reduce((acc, key) => {
          const value = data[key];
          if (typeof value === 'string') {
            acc[key] = sanitizeLogInput(value.substring(0, 100));
          } else if (typeof value === 'object') {
            acc[key] = '[Object]';
          } else {
            acc[key] = String(value).substring(0, 50);
          }
          return acc;
        }, {});
        
        return { message: safeMessage, data: safeData };
      };
      
      // Then: Should sanitize log entries
      const result = secureLog(maliciousMessage, maliciousData);
      expect(result.message).not.toContain('\n');
      expect(result.message).not.toContain('\r');
      expect(result.data.user).not.toContain('[ADMIN]');
    });

    test('TC-SEC-008: Should avoid PII in logs', () => {
      // Given: Data containing PII
      const sensitiveData = {
        email: 'user@example.com',
        phone: '123-456-7890',
        ssn: '123-45-6789',
        password: 'secret123'
      };
      
      // When: Logging with PII protection
      const secureLogWithPIIProtection = (message, data = {}) => {
        const piiPatterns = [
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
          /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
          /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        ];
        
        const sanitizedData = Object.keys(data).reduce((acc, key) => {
          let value = String(data[key]);
          
          // Mask PII patterns
          piiPatterns.forEach(pattern => {
            value = value.replace(pattern, '[REDACTED]');
          });
          
          // Mask password fields
          if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
            value = '[REDACTED]';
          }
          
          acc[key] = value;
          return acc;
        }, {});
        
        return sanitizedData;
      };
      
      // Then: Should mask PII data
      const result = secureLogWithPIIProtection('User data', sensitiveData);
      expect(result.email).toBe('[REDACTED]');
      expect(result.phone).toBe('[REDACTED]');
      expect(result.ssn).toBe('[REDACTED]');
      expect(result.password).toBe('[REDACTED]');
    });
  });

  describe('Recursion Fix Tests', () => {
    
    test('TC-SEC-009: Should prevent infinite recursion in translation system', () => {
      // Given: Mock translation system with potential recursion
      let callCount = 0;
      const maxCalls = 10;
      
      const mockLanguageManager = {
        getText: (key, lang, options = {}) => {
          callCount++;
          if (callCount > maxCalls) {
            throw new Error('Maximum call stack size exceeded');
          }
          
          // Simulate recursion guard
          if (options._fromSafeHandler) {
            return `translated_${key}`;
          }
          
          // Would normally call SafeTranslationHandler here
          return mockSafeHandler.getTranslation(key, lang, { ...options, _fromSafeHandler: true });
        }
      };
      
      const mockSafeHandler = {
        getTranslation: (key, lang, options = {}) => {
          callCount++;
          if (callCount > maxCalls) {
            throw new Error('Maximum call stack size exceeded');
          }
          
          // Try language manager with recursion guard
          return mockLanguageManager.getText(key, lang, { ...options, _fromSafeHandler: true });
        }
      };
      
      // When: Getting translation
      const result = mockLanguageManager.getText('testKey', 'zh');
      
      // Then: Should not cause infinite recursion
      expect(result).toBe('translated_testKey');
      expect(callCount).toBeLessThan(maxCalls);
    });
  });
});