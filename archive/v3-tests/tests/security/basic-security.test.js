/**
 * Basic Security Test - 基本安全測試
 * 驗證測試環境和基本安全功能
 */

describe('Basic Security Tests', () => {
  test('should have security test utilities available', () => {
    expect(global.SecurityTestUtils).toBeDefined();
    expect(global.SecurityTestUtils.generateXSSPayloads).toBeDefined();
    expect(global.SecurityTestUtils.generateCodeInjectionPayloads).toBeDefined();
  });

  test('should generate XSS payloads for testing', () => {
    const payloads = global.SecurityTestUtils.generateXSSPayloads();
    expect(Array.isArray(payloads)).toBe(true);
    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads).toContain('<script>alert("XSS")</script>');
  });

  test('should generate code injection payloads for testing', () => {
    const payloads = global.SecurityTestUtils.generateCodeInjectionPayloads();
    expect(Array.isArray(payloads)).toBe(true);
    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads).toContain('eval("alert(1)")');
  });

  test('should have mock DOM elements', () => {
    const element = global.SecurityTestUtils.createMockElement('div');
    expect(element).toBeDefined();
    expect(element.tagName).toBe('DIV');
    expect(element.setAttribute).toBeDefined();
    expect(element.textContent).toBe('');
  });

  test('should validate security event structure', () => {
    const validEvent = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Test security event',
      source: 'test-module'
    };

    expect(() => {
      global.SecurityTestUtils.validateSecurityEvent(validEvent);
    }).not.toThrow();
  });

  test('should measure performance', () => {
    const result = global.SecurityTestUtils.measurePerformance(() => {
      return 'test result';
    });

    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('duration');
    expect(result.result).toBe('test result');
    expect(typeof result.duration).toBe('number');
  });
});