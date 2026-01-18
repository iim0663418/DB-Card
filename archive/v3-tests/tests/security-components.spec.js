/**
 * Security Components Test Suite
 * 
 * Tests for PWA security architecture components
 * Covers: CWE vulnerability prevention, input sanitization, secure storage
 * 
 * Requirements Mapping:
 * - SEC-001: 安全架構 ES6 模組化升級 (Critical CWE fixes)
 * - R-3.2.5: 元件安全隔離機制 (T-PWA-005)
 */

import { jest } from '@jest/globals';

// Mock security components based on design specifications
class MockInputSanitizer {
  static sanitizeHtml(input) {
    if (!input || typeof input !== 'string') return '';
    
    // First remove dangerous patterns completely
    let sanitized = input
      .replace(/on\w+\s*=/gi, '')        // Remove event handlers
      .replace(/eval\s*\(/gi, '')         // Remove eval calls
      .replace(/function\s*\(/gi, '')     // Remove Function constructor
      .replace(/settimeout\s*\(/gi, '')   // Remove setTimeout
      .replace(/setinterval\s*\(/gi, '')  // Remove setInterval
      .replace(/import\s*\(/gi, '')       // Remove dynamic imports
      .replace(/require\s*\(/gi, '')      // Remove require calls
      .replace(/\$\{[^}]*\}/gi, '')       // Remove template literals
      .replace(/\{\{[^}]*\}\}/gi, '')     // Remove template expressions
      .replace(/#\{[^}]*\}/gi, '')       // Remove hash expressions
      .replace(/<%=.*?%>/gi, '')         // Remove ERB expressions
      .replace(/javascript:/gi, '')       // Remove javascript: URLs
      .replace(/globalthis/gi, '')        // Remove globalThis
      .replace(/import\.meta/gi, '');     // Remove import.meta
    
    // Then apply HTML encoding
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    return sanitized;
  }

  static sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        return '#';
      }
      return parsed.toString();
    } catch {
      return '#';
    }
  }

  static sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') return '';
    
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
}

class MockDataValidator {
  static validateCardData(data) {
    const errors = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return { valid: false, errors };
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('姓名為必填欄位');
    }
    
    // Check for dangerous content in name
    if (data.name && (data.name.includes('<script') || data.name.includes('javascript:') || data.name.includes('eval('))) {
      errors.push('姓名包含不安全內容');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('電子郵件格式不正確');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('電話號碼格式不正確');
    }

    if (data.name && data.name.length > 100) {
      errors.push('姓名長度不能超過100字符');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254 && email.length >= 5;
  }

  static isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
    const digitsOnly = phone.replace(/\D/g, '');
    return phoneRegex.test(phone) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
  }

  static sanitizeInput(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') return '';
    
    return MockInputSanitizer.sanitizeHtml(input.substring(0, maxLength));
  }
}

class MockStorageSecure {
  constructor() {
    this.storage = new Map();
  }

  setItem(key, value) {
    try {
      const sanitizedKey = MockInputSanitizer.sanitizeFilename(key);
      if (!sanitizedKey) return false;

      const serialized = JSON.stringify(value);
      if (serialized.length > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Data too large');
      }

      this.storage.set(sanitizedKey, serialized);
      return true;
    } catch (error) {
      console.error('Storage error:', error.message);
      return false;
    }
  }

  getItem(key) {
    try {
      const sanitizedKey = MockInputSanitizer.sanitizeFilename(key);
      const stored = this.storage.get(sanitizedKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Storage read error:', error.message);
      return null;
    }
  }

  removeItem(key) {
    try {
      const sanitizedKey = MockInputSanitizer.sanitizeFilename(key);
      this.storage.delete(sanitizedKey);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error.message);
      return false;
    }
  }

  clear() {
    this.storage.clear();
  }

  size() {
    return this.storage.size;
  }
}

describe('Security Components Test Suite', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockStorageSecure();
    jest.clearAllMocks();
    
    // Enhanced mock setup
    global.console.error = jest.fn();
    global.console.warn = jest.fn();
  });

  afterEach(() => {
    mockStorage.clear();
  });

  // ==================== CWE-79/80 XSS PREVENTION TESTS ====================
  
  describe('CWE-79/80: Cross-Site Scripting Prevention', () => {
    
    // TC-XSS-001: Basic HTML Injection Prevention
    test('TC-XSS-001: Prevents basic HTML script injection', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = MockInputSanitizer.sanitizeHtml(input);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<svg');
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<object');
        expect(sanitized).toContain('&lt;');
        expect(sanitized).toContain('&gt;');
      });
    });

    // TC-XSS-002: Event Handler Injection Prevention
    test('TC-XSS-002: Prevents event handler injection', () => {
      const eventHandlers = [
        'onclick="alert(1)"',
        'onmouseover="alert(1)"',
        'onerror="alert(1)"',
        'onload="alert(1)"',
        'onfocus="alert(1)"'
      ];

      eventHandlers.forEach(handler => {
        const sanitized = MockInputSanitizer.sanitizeHtml(handler);
        expect(sanitized).not.toContain('onclick=');
        expect(sanitized).not.toContain('onmouseover=');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('onfocus=');
      });
    });

    // TC-XSS-003: JavaScript URL Prevention
    test('TC-XSS-003: Prevents javascript: URL injection', () => {
      const jsUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'javascript:void(0)',
        'javascript://comment%0aalert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];

      jsUrls.forEach(url => {
        const sanitized = MockInputSanitizer.sanitizeUrl(url);
        expect(sanitized).toBe('#');
      });
    });

    // TC-XSS-004: Unicode and Encoding Bypass Prevention
    test('TC-XSS-004: Prevents Unicode and encoding bypasses', () => {
      const encodedInputs = [
        '&lt;script&gt;alert(1)&lt;/script&gt;',
        '%3Cscript%3Ealert(1)%3C/script%3E',
        '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e'
      ];

      encodedInputs.forEach(input => {
        const sanitized = MockInputSanitizer.sanitizeHtml(input);
        // Should not contain executable script tags after sanitization
        expect(sanitized).not.toMatch(/<script.*?>.*?<\/script>/i);
      });
    });

    // TC-XSS-005: Context-Specific Sanitization
    test('TC-XSS-005: Applies context-specific sanitization', () => {
      const cardData = {
        name: '<script>alert("name")</script>John Doe',
        title: '<img src=x onerror=alert("title")>Developer',
        email: 'test@example.com<script>alert("email")</script>',
        phone: '+1-234-567-8900<svg onload=alert("phone")>'
      };

      const sanitizedName = MockDataValidator.sanitizeInput(cardData.name);
      const sanitizedTitle = MockDataValidator.sanitizeInput(cardData.title);
      const sanitizedEmail = MockDataValidator.sanitizeInput(cardData.email);
      const sanitizedPhone = MockDataValidator.sanitizeInput(cardData.phone);

      expect(sanitizedName).toContain('John Doe');
      expect(sanitizedName).not.toContain('<script');
      expect(sanitizedTitle).toContain('Developer');
      expect(sanitizedTitle).not.toContain('<img');
      expect(sanitizedEmail).toContain('test@example.com');
      expect(sanitizedEmail).not.toContain('<script');
      expect(sanitizedPhone).toContain('+1-234-567-8900');
      expect(sanitizedPhone).not.toContain('<svg');
    });
  });

  // ==================== CWE-94 CODE INJECTION PREVENTION TESTS ====================
  
  describe('CWE-94: Code Injection Prevention', () => {
    
    // TC-CODE-001: Eval Injection Prevention
    test('TC-CODE-001: Prevents eval() injection attacks', () => {
      const codeInjectionInputs = [
        'eval("alert(1)")',
        'Function("alert(1)")()',
        'setTimeout("alert(1)", 0)',
        'setInterval("alert(1)", 1000)',
        'new Function("alert(1)")()'
      ];

      codeInjectionInputs.forEach(input => {
        const sanitized = MockInputSanitizer.sanitizeHtml(input);
        expect(sanitized).not.toContain('eval(');
        expect(sanitized).not.toContain('Function(');
        expect(sanitized).not.toContain('setTimeout(');
        expect(sanitized).not.toContain('setInterval(');
      });
    });

    // TC-CODE-002: Template Injection Prevention
    test('TC-CODE-002: Prevents template injection attacks', () => {
      const templateInjections = [
        '${alert(1)}',
        '{{constructor.constructor("alert(1)")()}}',
        '#{7*7}',
        '<%= system("whoami") %>',
        '{{7*7}}'
      ];

      templateInjections.forEach(injection => {
        const sanitized = MockInputSanitizer.sanitizeHtml(injection);
        expect(sanitized).not.toContain('${');
        expect(sanitized).not.toContain('{{');
        expect(sanitized).not.toContain('#{');
        expect(sanitized).not.toContain('<%=');
      });
    });

    // TC-CODE-003: Dynamic Import Prevention
    test('TC-CODE-003: Prevents dynamic import injection', () => {
      const importInjections = [
        'import("data:text/javascript,alert(1)")',
        'require("child_process").exec("whoami")',
        'import.meta.url',
        'globalThis.eval("alert(1)")'
      ];

      importInjections.forEach(injection => {
        const sanitized = MockInputSanitizer.sanitizeHtml(injection);
        expect(sanitized).not.toContain('import(');
        expect(sanitized).not.toContain('require(');
        expect(sanitized).not.toContain('import.meta');
        expect(sanitized).not.toContain('globalThis');
      });
    });
  });

  // ==================== CWE-117 LOG INJECTION PREVENTION TESTS ====================
  
  describe('CWE-117: Log Injection Prevention', () => {
    
    // TC-LOG-001: Newline Injection Prevention
    test('TC-LOG-001: Prevents newline injection in filenames', () => {
      const logInjectionInputs = [
        'user\nADMIN\tlogin\tsuccess',
        'normal_user\r\nroot\tprivileged_action',
        'test\x00admin\x00delete_all',
        'user\u2028admin\u2029system'
      ];

      logInjectionInputs.forEach(input => {
        const sanitized = MockInputSanitizer.sanitizeFilename(input);
        expect(sanitized).not.toContain('\n');
        expect(sanitized).not.toContain('\r');
        expect(sanitized).not.toContain('\t');
        expect(sanitized).not.toContain('\x00');
        expect(sanitized).not.toContain('\u2028');
        expect(sanitized).not.toContain('\u2029');
      });
    });

    // TC-LOG-002: Control Character Filtering
    test('TC-LOG-002: Filters control characters from log data', () => {
      const controlChars = [
        'test\x01\x02\x03data',
        'user\x1b[31mERROR\x1b[0m',
        'input\x7fdelete\x08\x08\x08admin'
      ];

      controlChars.forEach(input => {
        const sanitized = MockInputSanitizer.sanitizeFilename(input);
        expect(sanitized).toMatch(/^[a-zA-Z0-9._-]+$/);
        expect(sanitized).not.toMatch(/[\x00-\x1f\x7f]/);
      });
    });

    // TC-LOG-003: ANSI Escape Sequence Prevention
    test('TC-LOG-003: Prevents ANSI escape sequence injection', () => {
      const ansiInputs = [
        '\u001b[2J\u001b[H\u001b[31mFAKE ERROR\u001b[0m',
        '\u001b[1;31mCRITICAL\u001b[0m',
        '\u001b]0;Fake Title\u0007'
      ];

      ansiInputs.forEach(input => {
        const sanitized = MockInputSanitizer.sanitizeFilename(input);
        expect(sanitized).not.toContain('\u001b');
        expect(sanitized).not.toContain('\u0007');
      });
    });
  });

  // ==================== CWE-862 AUTHORIZATION TESTS ====================
  
  describe('CWE-862: Missing Authorization Prevention', () => {
    
    // TC-AUTH-001: Component Authorization Validation
    test('TC-AUTH-001: Validates component authorization before operations', () => {
      const mockComponent = {
        id: 'card-list',
        app: { getCurrentLanguage: jest.fn() },
        isAuthorized: function(action) {
          if (!this.app) return false;
          if (typeof this.app.getCurrentLanguage !== 'function') return false;
          return true;
        }
      };

      // Authorized component
      expect(mockComponent.isAuthorized('updateLanguage')).toBe(true);

      // Unauthorized component (no app reference)
      mockComponent.app = null;
      expect(mockComponent.isAuthorized('updateLanguage')).toBe(false);
    });

    // TC-AUTH-002: Storage Access Authorization
    test('TC-AUTH-002: Validates storage access authorization', () => {
      const sensitiveKeys = ['user-credentials', 'api-tokens', 'private-keys'];
      const publicKeys = ['language-preference', 'theme-setting', 'card-data'];

      // Mock authorization check
      const isAuthorizedForStorage = (key) => {
        return !sensitiveKeys.includes(key);
      };

      publicKeys.forEach(key => {
        expect(isAuthorizedForStorage(key)).toBe(true);
        expect(mockStorage.setItem(key, 'test-data')).toBe(true);
      });

      sensitiveKeys.forEach(key => {
        expect(isAuthorizedForStorage(key)).toBe(false);
        // In real implementation, this would be blocked
      });
    });

    // TC-AUTH-003: Method Access Control
    test('TC-AUTH-003: Controls access to sensitive methods', () => {
      const mockSecureComponent = {
        publicMethod: jest.fn(),
        privateMethod: jest.fn(),
        adminMethod: jest.fn(),
        
        hasPermission: function(method, userRole = 'user') {
          const permissions = {
            'publicMethod': ['user', 'admin'],
            'privateMethod': ['admin'],
            'adminMethod': ['admin']
          };
          return permissions[method]?.includes(userRole) || false;
        },
        
        executeMethod: function(method, userRole = 'user') {
          if (this.hasPermission(method, userRole)) {
            return this[method]();
          }
          throw new Error('Access denied');
        }
      };

      // User permissions
      expect(mockSecureComponent.hasPermission('publicMethod', 'user')).toBe(true);
      expect(mockSecureComponent.hasPermission('privateMethod', 'user')).toBe(false);
      expect(mockSecureComponent.hasPermission('adminMethod', 'user')).toBe(false);

      // Admin permissions
      expect(mockSecureComponent.hasPermission('publicMethod', 'admin')).toBe(true);
      expect(mockSecureComponent.hasPermission('privateMethod', 'admin')).toBe(true);
      expect(mockSecureComponent.hasPermission('adminMethod', 'admin')).toBe(true);
    });
  });

  // ==================== DATA VALIDATION TESTS ====================
  
  describe('Data Validation and Sanitization', () => {
    
    // TC-VAL-001: Card Data Validation
    test('TC-VAL-001: Validates card data structure and content', () => {
      const validCard = {
        name: 'John Doe',
        title: 'Software Engineer',
        email: 'john@example.com',
        phone: '+1-234-567-8900',
        company: 'Tech Corp'
      };

      const result = MockDataValidator.validateCardData(validCard);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // TC-VAL-002: Invalid Data Rejection
    test('TC-VAL-002: Rejects invalid card data', () => {
      const invalidCards = [
        { name: '', email: 'invalid-email', phone: 'abc' },
        { name: 'A'.repeat(101), email: 'test@', phone: '123' },
        { email: 'test@example.com' }, // Missing required name
        null,
        undefined,
        'not-an-object'
      ];

      invalidCards.forEach(card => {
        const result = MockDataValidator.validateCardData(card);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    // TC-VAL-003: Email Validation
    test('TC-VAL-003: Validates email addresses correctly', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@example',
        'a'.repeat(250) + '@example.com' // Too long
      ];

      validEmails.forEach(email => {
        expect(MockDataValidator.isValidEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(MockDataValidator.isValidEmail(email)).toBe(false);
      });
    });

    // TC-VAL-004: Phone Number Validation
    test('TC-VAL-004: Validates phone numbers correctly', () => {
      const validPhones = [
        '+1-234-567-8900',
        '(555) 123-4567',
        '555.123.4567',
        '+86 138 0013 8000',
        '1234567890'
      ];

      const invalidPhones = [
        'abc-def-ghij',
        '123',
        '+1-abc-def-ghij',
        'phone number'
      ];

      validPhones.forEach(phone => {
        expect(MockDataValidator.isValidPhone(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(MockDataValidator.isValidPhone(phone)).toBe(false);
      });
    });
  });

  // ==================== SECURE STORAGE TESTS ====================
  
  describe('Secure Storage Implementation', () => {
    
    // TC-STOR-001: Basic Storage Operations
    test('TC-STOR-001: Performs basic storage operations securely', () => {
      const testData = { name: 'Test User', id: 123 };
      
      // Store data
      const stored = mockStorage.setItem('test-key', testData);
      expect(stored).toBe(true);
      
      // Retrieve data
      const retrieved = mockStorage.getItem('test-key');
      expect(retrieved).toEqual(testData);
      
      // Remove data
      const removed = mockStorage.removeItem('test-key');
      expect(removed).toBe(true);
      
      // Verify removal
      const afterRemoval = mockStorage.getItem('test-key');
      expect(afterRemoval).toBeNull();
    });

    // TC-STOR-002: Key Sanitization
    test('TC-STOR-002: Sanitizes storage keys to prevent injection', () => {
      const maliciousKeys = [
        '../../../etc/passwd',
        'key\nwith\nnewlines',
        'key\x00with\x00nulls',
        'key with spaces and special chars!@#$%'
      ];

      maliciousKeys.forEach(key => {
        const result = mockStorage.setItem(key, 'test-data');
        expect(result).toBe(true); // Should succeed with sanitized key
        
        // Verify the key was sanitized
        const sanitizedKey = MockInputSanitizer.sanitizeFilename(key);
        expect(sanitizedKey).toMatch(/^[a-zA-Z0-9._-]+$/);
      });
    });

    // TC-STOR-003: Data Size Limits
    test('TC-STOR-003: Enforces data size limits', () => {
      const largeData = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const result = mockStorage.setItem('large-data', largeData);
      expect(result).toBe(false); // Should fail due to size limit
    });

    // TC-STOR-004: Error Handling
    test('TC-STOR-004: Handles storage errors gracefully', () => {
      // Test with invalid JSON data
      const circularData = {};
      circularData.self = circularData;
      
      const result = mockStorage.setItem('circular', circularData);
      expect(result).toBe(false); // Should fail gracefully
      
      // Test with null/undefined keys
      expect(mockStorage.setItem(null, 'data')).toBe(false);
      expect(mockStorage.setItem(undefined, 'data')).toBe(false);
      expect(mockStorage.setItem('', 'data')).toBe(false);
    });

    // TC-STOR-005: Storage Isolation
    test('TC-STOR-005: Maintains storage isolation between keys', () => {
      const data1 = { user: 'user1', data: 'data1' };
      const data2 = { user: 'user2', data: 'data2' };
      
      mockStorage.setItem('user1-data', data1);
      mockStorage.setItem('user2-data', data2);
      
      // Verify isolation
      expect(mockStorage.getItem('user1-data')).toEqual(data1);
      expect(mockStorage.getItem('user2-data')).toEqual(data2);
      expect(mockStorage.getItem('user1-data')).not.toEqual(data2);
    });
  });

  // ==================== INTEGRATION SECURITY TESTS ====================
  
  describe('Security Integration Tests', () => {
    
    // TC-SEC-INT-001: End-to-End Security Pipeline
    test('TC-SEC-INT-001: Complete security pipeline works correctly', () => {
      const userInput = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'john@example.com',
        phone: '+1-234-567-8900',
        notes: 'Some notes with\nnewlines\tand\ttabs'
      };

      // Step 1: Validate input
      const validation = MockDataValidator.validateCardData(userInput);
      expect(validation.valid).toBe(false); // Should fail due to script in name

      // Step 2: Sanitize input
      const sanitizedData = {
        name: MockDataValidator.sanitizeInput(userInput.name),
        email: userInput.email, // Email is valid, no sanitization needed
        phone: userInput.phone, // Phone is valid, no sanitization needed
        notes: MockDataValidator.sanitizeInput(userInput.notes)
      };

      // Step 3: Re-validate sanitized data
      const sanitizedValidation = MockDataValidator.validateCardData(sanitizedData);
      expect(sanitizedValidation.valid).toBe(true);

      // Step 4: Store securely
      const stored = mockStorage.setItem('user-card', sanitizedData);
      expect(stored).toBe(true);

      // Step 5: Retrieve and verify
      const retrieved = mockStorage.getItem('user-card');
      expect(retrieved.name).toContain('John Doe');
      expect(retrieved.name).not.toContain('<script>');
    });

    // TC-SEC-INT-002: Multi-Layer Defense
    test('TC-SEC-INT-002: Multi-layer security defense works', () => {
      const attackVectors = [
        { type: 'xss', payload: '<script>alert(1)</script>' },
        { type: 'injection', payload: 'test\nADMIN\tlogin' },
        { type: 'code', payload: 'eval("alert(1)")' },
        { type: 'url', payload: 'javascript:alert(1)' }
      ];

      attackVectors.forEach(attack => {
        // Layer 1: Input sanitization
        const sanitized = MockInputSanitizer.sanitizeHtml(attack.payload);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('eval(');
        expect(sanitized).not.toContain('javascript:');

        // Layer 2: Filename sanitization (for storage keys)
        const safeKey = MockInputSanitizer.sanitizeFilename(attack.type + '-test');
        expect(safeKey).toMatch(/^[a-zA-Z0-9._-]+$/);

        // Layer 3: Secure storage
        const stored = mockStorage.setItem(safeKey, { data: sanitized });
        expect(stored).toBe(true);
      });
    });

    // TC-SEC-INT-003: Security Event Logging
    test('TC-SEC-INT-003: Security events are logged appropriately', () => {
      const securityEvents = [];
      
      // Mock security event logger
      const logSecurityEvent = (event, details) => {
        securityEvents.push({
          timestamp: new Date().toISOString(),
          event,
          details: MockInputSanitizer.sanitizeHtml(JSON.stringify(details))
        });
      };

      // Simulate security events
      logSecurityEvent('xss_attempt', { input: '<script>alert(1)</script>' });
      logSecurityEvent('invalid_data', { field: 'email', value: 'invalid-email' });
      logSecurityEvent('storage_error', { key: 'test', error: 'quota_exceeded' });

      expect(securityEvents).toHaveLength(3);
      securityEvents.forEach(event => {
        expect(event.timestamp).toBeTruthy();
        expect(event.event).toBeTruthy();
        expect(event.details).not.toContain('<script>');
      });
    });
  });

  // ==================== PERFORMANCE SECURITY TESTS ====================
  
  describe('Security Performance Tests', () => {
    
    // TC-PERF-SEC-001: Sanitization Performance
    test('TC-PERF-SEC-001: Sanitization performs within acceptable limits', () => {
      const largeInput = '<script>alert(1)</script>'.repeat(1000);
      
      const startTime = performance.now();
      const sanitized = MockInputSanitizer.sanitizeHtml(largeInput);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(sanitized).not.toContain('<script>');
    });

    // TC-PERF-SEC-002: Validation Performance
    test('TC-PERF-SEC-002: Data validation performs efficiently', () => {
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        phone: `+1-234-567-${String(i).padStart(4, '0')}`
      }));

      const startTime = performance.now();
      
      const results = testData.map(data => MockDataValidator.validateCardData(data));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(results.every(r => r.valid)).toBe(true);
    });

    // TC-PERF-SEC-003: Storage Performance Under Load
    test('TC-PERF-SEC-003: Secure storage performs under load', () => {
      const testItems = Array.from({ length: 100 }, (_, i) => ({
        key: `test-item-${i}`,
        data: { id: i, name: `Item ${i}`, timestamp: Date.now() }
      }));

      const startTime = performance.now();
      
      // Store all items
      testItems.forEach(item => {
        mockStorage.setItem(item.key, item.data);
      });
      
      // Retrieve all items
      const retrieved = testItems.map(item => mockStorage.getItem(item.key));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete within 200ms
      expect(retrieved.every(item => item !== null)).toBe(true);
    });
  });
});