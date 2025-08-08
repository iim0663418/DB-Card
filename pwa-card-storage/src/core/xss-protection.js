/**
 * XSS Protection Core Module - SEC-02 Implementation
 * Unified XSS protection and input sanitization
 * Addresses CWE-79 (Cross-site Scripting)
 */

class XSSProtection {
  constructor() {
    this.maxInputLength = 10000;
    this.htmlEntityMap = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    
    this.dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi
    ];
  }

  /**
   * SEC-02: Sanitize user input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return '';
    }

    if (input.length > this.maxInputLength) {
      input = input.substring(0, this.maxInputLength);
    }

    // Remove dangerous patterns
    let sanitized = input;
    for (const pattern of this.dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // HTML entity encoding
    sanitized = sanitized.replace(/[<>"'&\/`=]/g, (match) => {
      return this.htmlEntityMap[match] || match;
    });

    return sanitized.trim();
  }

  /**
   * SEC-02: Sanitize output for display
   */
  sanitizeOutput(text) {
    if (typeof text !== 'string') {
      return '';
    }

    return this.sanitizeInput(text);
  }

  /**
   * SEC-02: Safe DOM content insertion
   */
  safeSetHTML(element, content) {
    if (!element || typeof content !== 'string') {
      return false;
    }

    // Use textContent instead of innerHTML to prevent XSS
    element.textContent = this.sanitizeOutput(content);
    return true;
  }

  /**
   * SEC-02: Safe attribute setting
   */
  safeSetAttribute(element, attribute, value) {
    if (!element || typeof attribute !== 'string' || typeof value !== 'string') {
      return false;
    }

    // Whitelist safe attributes
    const safeAttributes = [
      'id', 'class', 'title', 'alt', 'src', 'href', 'data-*',
      'aria-*', 'role', 'tabindex', 'style'
    ];

    const isSafe = safeAttributes.some(safe => {
      if (safe.endsWith('*')) {
        return attribute.startsWith(safe.slice(0, -1));
      }
      return attribute === safe;
    });

    if (!isSafe) {
      console.warn(`[XSSProtection] Blocked unsafe attribute: ${attribute}`);
      return false;
    }

    // Special handling for URLs
    if (attribute === 'href' || attribute === 'src') {
      value = this.sanitizeURL(value);
    }

    element.setAttribute(attribute, this.sanitizeOutput(value));
    return true;
  }

  /**
   * SEC-02: URL sanitization
   */
  sanitizeURL(url) {
    if (typeof url !== 'string') {
      return '';
    }

    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return '';
      }
    }

    // Allow only safe protocols
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'];
    const hasProtocol = safeProtocols.some(protocol => lowerUrl.startsWith(protocol));
    
    if (lowerUrl.includes(':') && !hasProtocol) {
      return '';
    }

    return this.sanitizeInput(url);
  }

  /**
   * SEC-02: Sanitize object properties recursively
   */
  sanitizeObject(obj, maxDepth = 5, currentDepth = 0) {
    if (currentDepth >= maxDepth || obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, maxDepth, currentDepth + 1));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const safeKey = this.sanitizeInput(key);
      
      if (typeof value === 'string') {
        sanitized[safeKey] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[safeKey] = this.sanitizeObject(value, maxDepth, currentDepth + 1);
      } else {
        sanitized[safeKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * SEC-02: Create safe HTML template
   */
  createSafeTemplate(template, data = {}) {
    if (typeof template !== 'string') {
      return '';
    }

    let safeTemplate = template;
    
    // Replace placeholders with sanitized data
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      const safeValue = this.sanitizeOutput(String(value || ''));
      safeTemplate = safeTemplate.replace(new RegExp(placeholder, 'g'), safeValue);
    }

    return safeTemplate;
  }

  /**
   * SEC-02: Validate and sanitize form data
   */
  sanitizeFormData(formData) {
    const sanitized = {};
    
    if (formData instanceof FormData) {
      for (const [key, value] of formData.entries()) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(String(value));
      }
    } else if (typeof formData === 'object' && formData !== null) {
      for (const [key, value] of Object.entries(formData)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(String(value || ''));
      }
    }

    return sanitized;
  }
}

// Create global instance
const xssProtection = new XSSProtection();

// Export for both ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { XSSProtection, xssProtection };
} else if (typeof window !== 'undefined') {
  window.XSSProtection = XSSProtection;
  window.xssProtection = xssProtection;
}

export { XSSProtection, xssProtection };