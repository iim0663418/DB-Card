/**
 * Input Sanitizer - ES6 Module
 * Enhanced input validation and sanitization with Critical CWE protection
 * 
 * Security Features:
 * - CWE-94: Code Injection Prevention
 * - CWE-79/80: XSS Protection with Context-Aware Encoding (Enhanced)
 * - CWE-117: Log Injection Prevention
 * 
 * @version 1.1.0 - SEC-001 Enhanced XSS Protection
 * @security Critical - Multi-CWE Protection
 */

// Configuration constants
const CONFIG = {
  maxInputLength: 1000,
  allowedTags: [], // Whitelist approach - no HTML tags allowed
  allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:'],
  logSanitization: true
};

/**
 * Enhanced input validation with whitelist approach
 * Fixes CWE-94: Code Injection
 */
export function validateInput(input, options = {}) {
  const config = { ...CONFIG, ...options };
  
  // Type and existence validation
  if (!input || typeof input !== 'string') {
    return { valid: false, sanitized: '', reason: 'Invalid input type' };
  }
  
  // Length validation
  if (input.length > config.maxInputLength) {
    return { valid: false, sanitized: '', reason: 'Input too long' };
  }
  
  // Enhanced sanitization with whitelist approach
  const sanitized = sanitizeWithWhitelist(input, config);
  
  // Validate sanitized result
  const isValid = sanitized.length > 0 && !containsMaliciousPatterns(sanitized);
  
  if (config.logSanitization && !isValid) {
    logSecurityEvent('input_validation_failed', { 
      originalLength: input.length,
      sanitizedLength: sanitized.length,
      reason: 'Failed security validation'
    });
  }
  
  return { valid: isValid, sanitized, reason: isValid ? 'Valid' : 'Security validation failed' };
}

/**
 * Whitelist-based sanitization
 * Prevents CWE-94 by only allowing safe characters
 */
function sanitizeWithWhitelist(input, config) {
  return input
    // Remove all HTML tags (whitelist approach - none allowed)
    .replace(/<[^>]*>/g, '')
    // Remove JavaScript protocols and event handlers
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove potentially dangerous characters
    .replace(/[<>'"&]/g, (match) => {
      const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
      return entities[match] || '';
    })
    // Remove control characters except common whitespace
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Enhanced HTML escaping with context awareness
 * Fixes CWE-79/80: Cross-site Scripting
 * SEC-001: Enhanced with additional context support
 */
export function escapeHtml(str, context = 'html') {
  if (!str) return '';
  
  const htmlStr = String(str);
  
  switch (context) {
    case 'attribute':
      return htmlStr
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    case 'url':
      return encodeURIComponent(htmlStr);
    
    case 'css':
      return htmlStr.replace(/[<>"'&\\]/g, '\\$&');
    
    case 'javascript':
      // Enhanced JavaScript context escaping
      return htmlStr
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'") 
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    
    default: // 'html'
      return htmlStr
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
  }
}

/**
 * URL validation with protocol whitelist
 * Prevents malicious URL injection
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, sanitized: '', reason: 'Invalid URL type' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Check against allowed protocols
    if (!CONFIG.allowedProtocols.includes(urlObj.protocol)) {
      return { valid: false, sanitized: '', reason: 'Protocol not allowed' };
    }
    
    // Additional security checks
    if (urlObj.hostname && (
      urlObj.hostname.includes('..') ||
      urlObj.hostname.startsWith('.') ||
      urlObj.hostname.endsWith('.')
    )) {
      return { valid: false, sanitized: '', reason: 'Invalid hostname' };
    }
    
    return { valid: true, sanitized: urlObj.toString(), reason: 'Valid URL' };
  } catch (error) {
    return { valid: false, sanitized: '', reason: 'Malformed URL' };
  }
}

/**
 * Detect malicious patterns
 * Enhanced detection for various attack vectors
 */
function containsMaliciousPatterns(input) {
  const maliciousPatterns = [
    // Script injection patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    
    // SQL injection patterns
    /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi,
    /(--|\/\*|\*\/)/g,
    
    // Command injection patterns
    /(\||&|;|`|\$\(|\${)/g,
    
    // Path traversal patterns
    /\.\.[\/\\]/g,
    
    // Data URI schemes
    /data:\s*[^;]*;base64/gi
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Secure logging with CWE-117 protection
 * Prevents log injection attacks
 */
function logSecurityEvent(eventType, details = {}) {
  // Sanitize log message to prevent CWE-117
  const sanitizedEventType = eventType.replace(/[\r\n\t]/g, '_');
  const sanitizedDetails = Object.keys(details).reduce((acc, key) => {
    const value = details[key];
    if (typeof value === 'string') {
      acc[key] = value.replace(/[\r\n\t]/g, '_').substring(0, 100);
    } else {
      acc[key] = String(value).substring(0, 50);
    }
    return acc;
  }, {});
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: sanitizedEventType,
    details: sanitizedDetails,
    source: 'InputSanitizer'
  };
  
  // Use structured logging to prevent injection
  console.warn('[Security]', JSON.stringify(logEntry));
}

/**
 * Batch input validation for forms
 * Optimized for multiple inputs
 */
export function validateInputBatch(inputs, options = {}) {
  const results = {};
  let allValid = true;
  
  for (const [key, value] of Object.entries(inputs)) {
    const result = validateInput(value, options);
    results[key] = result;
    if (!result.valid) {
      allValid = false;
    }
  }
  
  return { valid: allValid, results };
}

/**
 * Rate limiting for input validation
 * Prevents abuse of validation endpoints
 */
const rateLimitMap = new Map();

export function checkInputRateLimit(identifier = 'default', limit = 100, windowMs = 60000) {
  const now = Date.now();
  const key = `input_${identifier}`;
  const data = rateLimitMap.get(key) || { count: 0, window: now };
  
  // Reset window if expired
  if (now - data.window > windowMs) {
    data.count = 1;
    data.window = now;
  } else {
    data.count++;
  }
  
  rateLimitMap.set(key, data);
  
  const allowed = data.count <= limit;
  if (!allowed) {
    logSecurityEvent('rate_limit_exceeded', { identifier, count: data.count });
  }
  
  return { allowed, remaining: Math.max(0, limit - data.count) };
}

// Export configuration for testing
export { CONFIG };