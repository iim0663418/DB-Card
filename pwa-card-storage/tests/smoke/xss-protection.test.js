/**
 * SEC-02 Smoke Tests - XSS Protection
 * Basic validation of XSS protection mechanisms
 */

// Test XSS Protection Core Functionality
function testXSSProtectionCore() {
  console.log('[XSS Test] Testing core XSS protection...');
  
  if (!window.xssProtection) {
    throw new Error('XSS Protection not loaded');
  }
  
  // Test basic input sanitization
  const maliciousInput = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
  const sanitized = window.xssProtection.sanitizeInput(maliciousInput);
  
  if (sanitized.includes('<script>') || sanitized.includes('onerror=')) {
    throw new Error('XSS sanitization failed');
  }
  
  console.log('[XSS Test] ✅ Core protection working');
  return true;
}

// Test URL sanitization
function testURLSanitization() {
  console.log('[XSS Test] Testing URL sanitization...');
  
  const dangerousUrls = [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)'
  ];
  
  for (const url of dangerousUrls) {
    const sanitized = window.xssProtection.sanitizeURL(url);
    if (sanitized !== '') {
      throw new Error(`Dangerous URL not blocked: ${url}`);
    }
  }
  
  // Test safe URLs
  const safeUrl = 'https://example.com/safe';
  const sanitizedSafe = window.xssProtection.sanitizeURL(safeUrl);
  if (sanitizedSafe !== safeUrl) {
    throw new Error('Safe URL was incorrectly sanitized');
  }
  
  console.log('[XSS Test] ✅ URL sanitization working');
  return true;
}

// Test object sanitization
function testObjectSanitization() {
  console.log('[XSS Test] Testing object sanitization...');
  
  const maliciousObject = {
    name: '<script>alert("xss")</script>',
    email: 'test@example.com',
    nested: {
      value: '<img src=x onerror=alert(1)>'
    }
  };
  
  const sanitized = window.xssProtection.sanitizeObject(maliciousObject);
  
  if (sanitized.name.includes('<script>') || 
      sanitized.nested.value.includes('onerror=')) {
    throw new Error('Object sanitization failed');
  }
  
  console.log('[XSS Test] ✅ Object sanitization working');
  return true;
}

// Test safe DOM operations
function testSafeDOMOperations() {
  console.log('[XSS Test] Testing safe DOM operations...');
  
  // Create test element
  const testDiv = document.createElement('div');
  document.body.appendChild(testDiv);
  
  try {
    // Test safe HTML setting
    const maliciousContent = '<script>alert("xss")</script>Hello World';
    const result = window.xssProtection.safeSetHTML(testDiv, maliciousContent);
    
    if (!result || testDiv.innerHTML.includes('<script>')) {
      throw new Error('Safe HTML setting failed');
    }
    
    // Test safe attribute setting
    const safeResult = window.xssProtection.safeSetAttribute(testDiv, 'title', 'Safe Title');
    const unsafeResult = window.xssProtection.safeSetAttribute(testDiv, 'onclick', 'alert(1)');
    
    if (!safeResult || unsafeResult) {
      throw new Error('Safe attribute setting failed');
    }
    
    console.log('[XSS Test] ✅ Safe DOM operations working');
    return true;
  } finally {
    // Cleanup
    document.body.removeChild(testDiv);
  }
}

// Run all XSS protection tests
async function runXSSProtectionTests() {
  console.log('[XSS Test] Starting XSS protection smoke tests...');
  
  try {
    testXSSProtectionCore();
    testURLSanitization();
    testObjectSanitization();
    testSafeDOMOperations();
    
    console.log('[XSS Test] ✅ All XSS protection tests passed');
    return { success: true, message: 'XSS protection working correctly' };
  } catch (error) {
    console.error('[XSS Test] ❌ XSS protection test failed:', error);
    return { success: false, error: error.message };
  }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runXSSProtectionTests };
} else if (typeof window !== 'undefined') {
  window.runXSSProtectionTests = runXSSProtectionTests;
}