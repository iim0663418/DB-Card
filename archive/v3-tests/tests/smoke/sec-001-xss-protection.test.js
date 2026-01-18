/**
 * SEC-001 XSS Protection Smoke Tests
 * Validates enhanced XSS protection implementation
 * 
 * @version 1.0.0
 * @security Critical - CWE-79/80 Validation
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.URL = dom.window.URL;

// Import modules to test
const { XSSProtection, safeSetBilingualContent, safeSocialLinksProcessor } = require('../../pwa-card-storage/src/security/xss-protection.js');
const { validateInput, escapeHtml } = require('../../pwa-card-storage/src/security/input-sanitizer.js');

describe('SEC-001: XSS Protection Smoke Tests', () => {
  
  describe('Context-Aware HTML Escaping', () => {
    test('should escape HTML context properly', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(maliciousInput, 'html');
      
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).not.toContain('alert("XSS")');
    });
    
    test('should escape attribute context properly', () => {
      const maliciousAttr = 'value" onload="alert(1)"';
      const escaped = escapeHtml(maliciousAttr, 'attribute');
      
      expect(escaped).not.toContain('onload=');
      expect(escaped).toContain('&quot;');
    });
    
    test('should handle JavaScript context escaping', () => {
      const jsPayload = 'alert("XSS"); //';
      const escaped = escapeHtml(jsPayload, 'javascript');
      
      expect(escaped).toContain('\\"');
      expect(escaped).not.toContain('alert("XSS")');
    });
  });
  
  describe('Safe DOM Manipulation', () => {
    test('should safely set text content', () => {
      const element = document.createElement('div');
      const maliciousContent = '<img src=x onerror=alert(1)>';
      
      const result = XSSProtection.setTextContent(element, maliciousContent);
      
      expect(result).toBe(true);
      expect(element.textContent).not.toContain('<img');
      expect(element.innerHTML).not.toContain('onerror');
    });
    
    test('should create safe DOM elements', () => {
      const element = XSSProtection.createElement('div', {
        id: 'test',
        'data-value': '<script>alert(1)</script>'
      }, 'Safe content');
      
      expect(element.tagName).toBe('DIV');
      expect(element.id).toBe('test');
      expect(element.getAttribute('data-value')).not.toContain('<script>');
      expect(element.textContent).toBe('Safe content');
    });
    
    test('should reject dangerous tag names', () => {
      expect(() => {
        XSSProtection.createElement('script', {}, 'alert(1)');
      }).toThrow('not allowed');
    });
  });
  
  describe('URL Validation', () => {
    test('should validate safe URLs', () => {
      const safeUrl = 'https://example.com/page';
      const result = XSSProtection.validateURL(safeUrl);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(safeUrl);
    });
    
    test('should block dangerous protocols', () => {
      const dangerousUrl = 'javascript:alert(1)';
      const result = XSSProtection.validateURL(dangerousUrl);
      
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe('#');
    });
    
    test('should handle data URLs for images', () => {
      const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const result = XSSProtection.validateImageSrc(validDataUrl);
      
      expect(result).toBe(validDataUrl);
    });
    
    test('should block malicious data URLs', () => {
      const maliciousDataUrl = 'data:text/html,<script>alert(1)</script>';
      const result = XSSProtection.validateImageSrc(maliciousDataUrl);
      
      expect(result).toBe('');
    });
  });
  
  describe('Bilingual Content Protection', () => {
    test('should safely process bilingual content', () => {
      const element = document.createElement('span');
      const content = 'Hello~你好<script>alert(1)</script>';
      
      const result = safeSetBilingualContent(element, content, 'zh');
      
      expect(result).toBe(true);
      expect(element.textContent).not.toContain('<script>');
      expect(element.getAttribute('lang')).toBe('zh-TW');
    });
    
    test('should handle English language setting', () => {
      const element = document.createElement('span');
      const content = 'Hello World';
      
      safeSetBilingualContent(element, content, 'en');
      
      expect(element.getAttribute('lang')).toBe('en');
    });
  });
  
  describe('Social Links Protection', () => {
    test('should safely process social media links', () => {
      const socialNote = 'FB: facebook.com/test\\nIG: @instagram_user';
      const fragment = safeSocialLinksProcessor(socialNote, 'zh');
      
      expect(fragment.children.length).toBeGreaterThan(0);
      
      // Check that links have proper security attributes
      const links = fragment.querySelectorAll('a');
      links.forEach(link => {
        expect(link.getAttribute('rel')).toContain('noopener');
        expect(link.getAttribute('target')).toBe('_blank');
      });
    });
    
    test('should block malicious social content', () => {
      const maliciousSocial = 'FB: <script>alert(1)</script>';
      const fragment = safeSocialLinksProcessor(maliciousSocial, 'zh');
      
      // Should return empty fragment for invalid content
      expect(fragment.children.length).toBe(0);
    });
  });
  
  describe('Form Data Sanitization', () => {
    test('should sanitize form data object', () => {
      const formData = {
        name: 'John<script>alert(1)</script>',
        email: 'test@example.com',
        message: 'Hello & welcome'
      };
      
      const sanitized = XSSProtection.sanitizeFormData(formData);
      
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.message).toContain('&amp;');
    });
    
    test('should handle FormData instances', () => {
      const formData = new FormData();
      formData.append('field', '<img src=x onerror=alert(1)>');
      
      const sanitized = XSSProtection.sanitizeFormData(formData);
      
      expect(sanitized.field).not.toContain('onerror');
    });
  });
  
  describe('Event Handler Security', () => {
    test('should allow safe event types', () => {
      const element = document.createElement('button');
      const handler = jest.fn();
      
      const result = XSSProtection.addEventListener(element, 'click', handler);
      
      expect(result).toBe(true);
    });
    
    test('should block dangerous event types', () => {
      const element = document.createElement('button');
      const handler = jest.fn();
      
      const result = XSSProtection.addEventListener(element, 'onload', handler);
      
      expect(result).toBe(false);
    });
  });
  
  describe('Integration with Input Sanitizer', () => {
    test('should validate input before processing', () => {
      const maliciousInput = '<script>alert("XSS")</script>'.repeat(100);
      const validation = validateInput(maliciousInput);
      
      expect(validation.valid).toBe(false);
      expect(validation.sanitized).not.toContain('<script>');
    });
    
    test('should handle normal input correctly', () => {
      const normalInput = 'Hello, this is a normal message.';
      const validation = validateInput(normalInput);
      
      expect(validation.valid).toBe(true);
      expect(validation.sanitized).toBe(normalInput);
    });
  });
});

// Performance test
describe('SEC-001: Performance Tests', () => {
  test('should process large content efficiently', () => {
    const largeContent = 'Safe content '.repeat(1000);
    const element = document.createElement('div');
    
    const startTime = Date.now();
    XSSProtection.setTextContent(element, largeContent);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    expect(element.textContent).toContain('Safe content');
  });
});

console.log('✅ SEC-001 XSS Protection smoke tests completed');