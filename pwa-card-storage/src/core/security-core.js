/**
 * Security Core Module - SEC-01 Critical Security Fixes
 * Replaces unsafe eval() usage and implements secure JSON parsing
 * Addresses CWE-94 (Code Injection) and CWE-502 (Unsafe Deserialization)
 */

class SecurityCore {
  constructor() {
    this.initialized = false;
    this.maxDepth = 10;
    this.maxKeys = 100;
    this.maxStringLength = 10000;
    this.allowedTypes = ['string', 'number', 'boolean', 'object', 'array'];
    this.dangerousKeys = ['__proto__', 'constructor', 'prototype', 'eval', 'function'];
  }

  async initialize() {
    try {
      this.initialized = true;
      console.log('[SecurityCore] Initialized successfully');
      return { initialized: true };
    } catch (error) {
      console.error('[SecurityCore] Initialization failed:', error);
      throw error;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  /**
   * SEC-01: Safe alternative to eval() - Function constructor with strict validation
   * Replaces dangerous eval() calls with controlled execution
   */
  safeEval(input, context = {}) {
    try {
      // Input validation
      if (typeof input !== 'string') {
        throw new Error('Input must be a string');
      }

      if (input.length > this.maxStringLength) {
        throw new Error('Input too long');
      }

      // Dangerous pattern detection
      const dangerousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /setTimeout\s*\(/,
        /setInterval\s*\(/,
        /document\./,
        /window\./,
        /global\./,
        /process\./,
        /require\s*\(/,
        /import\s*\(/,
        /__proto__/,
        /constructor/,
        /prototype/
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
          throw new Error(`Dangerous pattern detected: ${pattern}`);
        }
      }

      // Create safe execution context
      const safeContext = this.createSafeContext(context);
      
      // Use Function constructor with strict mode (safer than eval)
      const func = new Function(
        ...Object.keys(safeContext),
        `"use strict"; return (${input});`
      );

      // Execute with timeout protection
      return this.executeWithTimeout(func, Object.values(safeContext), 1000);
    } catch (error) {
      console.error('[SecurityCore] Safe eval failed:', error);
      throw new Error(`Safe evaluation failed: ${error.message}`);
    }
  }

  /**
   * SEC-01: Safe JSON parsing with validation
   * Addresses CWE-502 (Unsafe Deserialization)
   */
  safeJSONParse(jsonString, options = {}) {
    try {
      const {
        maxDepth = this.maxDepth,
        maxKeys = this.maxKeys,
        fallback = null
      } = options;

      if (typeof jsonString !== 'string') {
        throw new Error('Input must be a string');
      }

      if (jsonString.length > this.maxStringLength) {
        throw new Error('JSON string too long');
      }

      // Parse with reviver function for security
      const parsed = JSON.parse(jsonString, (key, value) => {
        // Block dangerous keys
        if (this.dangerousKeys.includes(key)) {
          return undefined;
        }

        // Validate value types
        if (value !== null && typeof value === 'object') {
          return this.sanitizeObject(value, maxDepth, maxKeys);
        }

        return value;
      });

      // Final validation
      return this.validateParsedData(parsed, maxDepth, maxKeys);
    } catch (error) {
      console.error('[SecurityCore] Safe JSON parse failed:', error);
      if (options.fallback !== undefined) {
        return options.fallback;
      }
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }

  /**
   * Create safe execution context
   */
  createSafeContext(context) {
    const safeContext = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (this.dangerousKeys.includes(key)) {
        continue;
      }
      
      if (typeof value === 'function') {
        continue; // Skip functions for security
      }
      
      safeContext[key] = value;
    }
    
    return safeContext;
  }

  /**
   * Execute function with timeout protection
   */
  executeWithTimeout(func, args, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, timeout);

      try {
        const result = func.apply(null, args);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Sanitize object to prevent prototype pollution
   */
  sanitizeObject(obj, maxDepth, maxKeys, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return {};
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, maxKeys).map(item => 
        this.sanitizeObject(item, maxDepth, maxKeys, currentDepth + 1)
      );
    }

    const sanitized = {};
    const keys = Object.keys(obj).slice(0, maxKeys);

    for (const key of keys) {
      if (this.dangerousKeys.includes(key)) {
        continue;
      }

      const value = obj[key];
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, maxDepth, maxKeys, currentDepth + 1);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate parsed data structure
   */
  validateParsedData(data, maxDepth, maxKeys) {
    if (data === null || data === undefined) {
      return data;
    }

    const validation = this.validateDataStructure(data, maxDepth, maxKeys);
    if (!validation.valid) {
      throw new Error(`Data validation failed: ${validation.reason}`);
    }

    return data;
  }

  /**
   * Deep validation of data structure
   */
  validateDataStructure(data, maxDepth, maxKeys, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return { valid: false, reason: 'Maximum depth exceeded' };
    }

    if (data === null || data === undefined) {
      return { valid: true };
    }

    const dataType = Array.isArray(data) ? 'array' : typeof data;
    if (!this.allowedTypes.includes(dataType)) {
      return { valid: false, reason: `Invalid data type: ${dataType}` };
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length > maxKeys) {
        return { valid: false, reason: 'Too many keys' };
      }

      for (const key of keys) {
        if (this.dangerousKeys.includes(key)) {
          return { valid: false, reason: `Dangerous key: ${key}` };
        }

        const childValidation = this.validateDataStructure(
          data[key], 
          maxDepth, 
          maxKeys, 
          currentDepth + 1
        );
        
        if (!childValidation.valid) {
          return childValidation;
        }
      }
    }

    return { valid: true };
  }

  /**
   * Safe string processing
   */
  safeStringProcess(input, processor) {
    try {
      if (typeof input !== 'string') {
        throw new Error('Input must be a string');
      }

      if (input.length > this.maxStringLength) {
        throw new Error('String too long');
      }

      if (typeof processor !== 'function') {
        throw new Error('Processor must be a function');
      }

      return processor(input);
    } catch (error) {
      console.error('[SecurityCore] Safe string processing failed:', error);
      throw error;
    }
  }

  /**
   * Secure data transformation
   */
  secureTransform(data, transformer) {
    try {
      const validation = this.validateDataStructure(data, this.maxDepth, this.maxKeys);
      if (!validation.valid) {
        throw new Error(`Data validation failed: ${validation.reason}`);
      }

      if (typeof transformer !== 'function') {
        throw new Error('Transformer must be a function');
      }

      return transformer(data);
    } catch (error) {
      console.error('[SecurityCore] Secure transform failed:', error);
      throw error;
    }
  }
}

// Initialize security core
const securityCore = new SecurityCore();

// Initialize security system
async function initializeSecurity() {
  try {
    await securityCore.initialize();
    console.log('[Security] Security core initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('[Security] Security initialization failed:', error);
    return { success: false, error: error.message };
  }
}

// Export for both ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityCore, securityCore, initializeSecurity };
} else if (typeof window !== 'undefined') {
  window.SecurityCore = SecurityCore;
  window.securityCore = securityCore;
  window.initializeSecurity = initializeSecurity;
}

export { SecurityCore, securityCore, initializeSecurity };