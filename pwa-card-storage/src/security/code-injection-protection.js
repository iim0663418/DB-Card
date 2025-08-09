/**
 * Code Injection Protection Module - CWE-94 Prevention
 * Implements whitelist validation and safe code execution patterns
 * 
 * @version 1.0.0
 * @security Critical - CWE-94 Protection
 */

import { validateInput } from './input-sanitizer.js';

/**
 * Code Injection Protection Class
 * Prevents CWE-94 vulnerabilities through whitelist validation
 */
export class CodeInjectionProtection {
  
  /**
   * Safe JSON parsing with prototype pollution protection
   * @param {string} jsonString - JSON string to parse
   * @param {Object} options - Parsing options
   */
  static safeJSONParse(jsonString, options = {}) {
    const { maxDepth = 10, allowedKeys = null } = options;
    
    try {
      // Validate input first
      const validation = validateInput(jsonString, { maxInputLength: 100000 });
      if (!validation.valid) {
        throw new Error(`Invalid JSON input: ${validation.reason}`);
      }
      
      // Parse with reviver function to prevent prototype pollution
      const parsed = JSON.parse(validation.sanitized, (key, value) => {
        // Block dangerous keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        
        // Check against allowed keys if specified
        if (allowedKeys && !allowedKeys.includes(key) && key !== '') {
          return undefined;
        }
        
        return value;
      });
      
      // Validate object depth
      if (this.getObjectDepth(parsed) > maxDepth) {
        throw new Error(`Object depth exceeds limit: ${maxDepth}`);
      }
      
      return { success: true, data: parsed };
    } catch (error) {
      return { 
        success: false, 
        error: `JSON parsing failed: ${error.message}`,
        code: 'INVALID_JSON'
      };
    }
  }
  
  /**
   * Safe dynamic property access with whitelist
   * @param {Object} obj - Object to access
   * @param {string} path - Property path (e.g., 'user.profile.name')
   * @param {Array} allowedPaths - Whitelist of allowed paths
   */
  static safePropertyAccess(obj, path, allowedPaths = []) {
    if (!obj || typeof obj !== 'object') {
      return { success: false, error: 'Invalid object' };
    }
    
    // Validate path format
    if (typeof path !== 'string' || !path.trim()) {
      return { success: false, error: 'Invalid path' };
    }
    
    // Check against whitelist
    if (allowedPaths.length > 0 && !allowedPaths.includes(path)) {
      return { success: false, error: 'Path not allowed' };
    }
    
    // Sanitize path
    const sanitizedPath = path.replace(/[^a-zA-Z0-9._]/g, '');
    if (sanitizedPath !== path) {
      return { success: false, error: 'Path contains invalid characters' };
    }
    
    try {
      const keys = sanitizedPath.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current === null || current === undefined) {
          return { success: true, data: undefined };
        }
        
        // Prevent prototype pollution access
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return { success: false, error: 'Dangerous property access blocked' };
        }
        
        current = current[key];
      }
      
      return { success: true, data: current };
    } catch (error) {
      return { success: false, error: `Property access failed: ${error.message}` };
    }
  }
  
  /**
   * Safe function execution with whitelist
   * @param {string} functionName - Name of function to execute
   * @param {Array} allowedFunctions - Whitelist of allowed functions
   * @param {Array} args - Function arguments
   * @param {Object} context - Execution context
   */
  static safeFunctionExecution(functionName, allowedFunctions, args = [], context = window) {
    // Validate function name
    if (typeof functionName !== 'string' || !functionName.trim()) {
      return { success: false, error: 'Invalid function name' };
    }
    
    // Check against whitelist
    if (!allowedFunctions.includes(functionName)) {
      return { 
        success: false, 
        error: `Function '${functionName}' not allowed`,
        code: 'FUNCTION_NOT_ALLOWED'
      };
    }
    
    // Sanitize function name
    const sanitizedName = functionName.replace(/[^a-zA-Z0-9_$]/g, '');
    if (sanitizedName !== functionName) {
      return { success: false, error: 'Function name contains invalid characters' };
    }
    
    try {
      // Get function from context safely
      const func = this.safePropertyAccess(context, sanitizedName, allowedFunctions);
      if (!func.success || typeof func.data !== 'function') {
        return { success: false, error: 'Function not found or not callable' };
      }
      
      // Validate arguments
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          const validation = validateInput(arg);
          return validation.valid ? validation.sanitized : '';
        }
        return arg;
      });
      
      // Execute function safely
      const result = func.data.apply(context, sanitizedArgs);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: `Function execution failed: ${error.message}`,
        code: 'EXECUTION_ERROR'
      };
    }
  }
  
  /**
   * Safe eval replacement with whitelist operations
   * @param {string} expression - Expression to evaluate
   * @param {Object} allowedOperations - Whitelist of allowed operations
   * @param {Object} context - Evaluation context
   */
  static safeEvaluation(expression, allowedOperations = {}, context = {}) {
    // Block eval entirely - use whitelist approach instead
    if (typeof expression !== 'string') {
      return { success: false, error: 'Expression must be string' };
    }
    
    // Validate expression format
    const validation = validateInput(expression, { maxInputLength: 1000 });
    if (!validation.valid) {
      return { success: false, error: `Invalid expression: ${validation.reason}` };
    }
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /document\./i,
      /window\./i,
      /global\./i,
      /__proto__/i,
      /constructor/i,
      /prototype/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(validation.sanitized)) {
        return { 
          success: false, 
          error: 'Expression contains dangerous patterns',
          code: 'DANGEROUS_PATTERN'
        };
      }
    }
    
    // Use whitelist approach for safe operations
    return this.executeWhitelistOperation(validation.sanitized, allowedOperations, context);
  }
  
  /**
   * Execute whitelisted operations only
   * @param {string} operation - Operation to execute
   * @param {Object} allowedOperations - Whitelist of operations
   * @param {Object} context - Execution context
   */
  static executeWhitelistOperation(operation, allowedOperations, context) {
    const operationKey = operation.trim();
    
    if (!allowedOperations[operationKey]) {
      return { 
        success: false, 
        error: `Operation '${operationKey}' not allowed`,
        code: 'OPERATION_NOT_ALLOWED'
      };
    }
    
    try {
      const handler = allowedOperations[operationKey];
      if (typeof handler === 'function') {
        const result = handler(context);
        return { success: true, data: result };
      } else {
        return { success: true, data: handler };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Operation execution failed: ${error.message}`,
        code: 'OPERATION_ERROR'
      };
    }
  }
  
  /**
   * Safe template string processing
   * @param {string} template - Template string
   * @param {Object} data - Data for interpolation
   * @param {Array} allowedKeys - Whitelist of allowed data keys
   */
  static safeTemplateProcessing(template, data = {}, allowedKeys = []) {
    if (typeof template !== 'string') {
      return { success: false, error: 'Template must be string' };
    }
    
    // Validate template
    const validation = validateInput(template, { maxInputLength: 5000 });
    if (!validation.valid) {
      return { success: false, error: `Invalid template: ${validation.reason}` };
    }
    
    try {
      // Use safe replacement instead of template literals
      let processed = validation.sanitized;
      
      // Find all placeholders like {{key}}
      const placeholderRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
      const matches = [...processed.matchAll(placeholderRegex)];
      
      for (const match of matches) {
        const [placeholder, key] = match;
        
        // Check against whitelist
        if (allowedKeys.length > 0 && !allowedKeys.includes(key)) {
          continue; // Skip non-whitelisted keys
        }
        
        // Get safe value
        const valueAccess = this.safePropertyAccess(data, key, allowedKeys);
        const value = valueAccess.success ? String(valueAccess.data || '') : '';
        
        // Replace placeholder with sanitized value
        const sanitizedValue = validateInput(value).sanitized;
        processed = processed.replace(placeholder, sanitizedValue);
      }
      
      return { success: true, data: processed };
    } catch (error) {
      return { 
        success: false, 
        error: `Template processing failed: ${error.message}`,
        code: 'TEMPLATE_ERROR'
      };
    }
  }
  
  /**
   * Safe configuration loading with validation
   * @param {Object} config - Configuration object
   * @param {Object} schema - Expected schema
   */
  static safeConfigurationLoad(config, schema = {}) {
    if (!config || typeof config !== 'object') {
      return { success: false, error: 'Invalid configuration object' };
    }
    
    try {
      const sanitizedConfig = {};
      
      // Validate against schema
      for (const [key, expectedType] of Object.entries(schema)) {
        if (config.hasOwnProperty(key)) {
          const value = config[key];
          
          // Type validation
          if (expectedType === 'string' && typeof value === 'string') {
            const validation = validateInput(value);
            sanitizedConfig[key] = validation.valid ? validation.sanitized : '';
          } else if (expectedType === 'number' && typeof value === 'number') {
            sanitizedConfig[key] = isFinite(value) ? value : 0;
          } else if (expectedType === 'boolean' && typeof value === 'boolean') {
            sanitizedConfig[key] = value;
          } else if (expectedType === 'array' && Array.isArray(value)) {
            sanitizedConfig[key] = value.slice(0, 100); // Limit array size
          } else {
            // Type mismatch - use default
            sanitizedConfig[key] = this.getDefaultValue(expectedType);
          }
        } else {
          // Missing key - use default
          sanitizedConfig[key] = this.getDefaultValue(expectedType);
        }
      }
      
      return { success: true, data: sanitizedConfig };
    } catch (error) {
      return { 
        success: false, 
        error: `Configuration loading failed: ${error.message}`,
        code: 'CONFIG_ERROR'
      };
    }
  }
  
  /**
   * Get default value for type
   * @param {string} type - Expected type
   */
  static getDefaultValue(type) {
    switch (type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'array': return [];
      case 'object': return {};
      default: return null;
    }
  }
  
  /**
   * Calculate object depth recursively
   * @param {*} obj - Object to measure
   * @param {number} currentDepth - Current depth
   */
  static getObjectDepth(obj, currentDepth = 0) {
    if (obj === null || typeof obj !== 'object') {
      return currentDepth;
    }
    
    if (Array.isArray(obj)) {
      return Math.max(currentDepth, ...obj.map(item => 
        this.getObjectDepth(item, currentDepth + 1)
      ));
    }
    
    const depths = Object.values(obj).map(value => 
      this.getObjectDepth(value, currentDepth + 1)
    );
    
    return depths.length > 0 ? Math.max(currentDepth, ...depths) : currentDepth;
  }
  
  /**
   * Validate dynamic operation parameters
   * @param {Object} params - Parameters to validate
   * @param {Object} schema - Validation schema
   */
  static validateDynamicParams(params, schema) {
    if (!params || typeof params !== 'object') {
      return { success: false, error: 'Invalid parameters' };
    }
    
    const validated = {};
    const errors = [];
    
    for (const [key, rules] of Object.entries(schema)) {
      const value = params[key];
      
      // Required check
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${key} is required`);
        continue;
      }
      
      // Type check
      if (value !== undefined && rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be ${rules.type}`);
        continue;
      }
      
      // Length check for strings
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push(`${key} exceeds maximum length`);
        continue;
      }
      
      // Pattern check
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`${key} format is invalid`);
        continue;
      }
      
      // Whitelist check
      if (rules.allowedValues && !rules.allowedValues.includes(value)) {
        errors.push(`${key} value not allowed`);
        continue;
      }
      
      validated[key] = value;
    }
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    return { success: true, data: validated };
  }
}

/**
 * Secure dynamic operation executor
 * Replaces dangerous Function() constructor usage
 */
export class SecureDynamicExecutor {
  constructor(allowedOperations = {}) {
    this.allowedOperations = new Map(Object.entries(allowedOperations));
    this.executionLog = [];
  }
  
  /**
   * Execute operation safely
   * @param {string} operationName - Name of operation
   * @param {Array} args - Operation arguments
   * @param {Object} context - Execution context
   */
  execute(operationName, args = [], context = {}) {
    const startTime = Date.now();
    
    try {
      // Validate operation name
      if (!this.allowedOperations.has(operationName)) {
        throw new Error(`Operation '${operationName}' not allowed`);
      }
      
      // Get operation handler
      const handler = this.allowedOperations.get(operationName);
      if (typeof handler !== 'function') {
        throw new Error(`Operation '${operationName}' is not executable`);
      }
      
      // Sanitize arguments
      const sanitizedArgs = this.sanitizeArguments(args);
      
      // Execute with timeout
      const result = this.executeWithTimeout(handler, sanitizedArgs, context, 5000);
      
      // Log execution
      this.logExecution(operationName, true, Date.now() - startTime);
      
      return { success: true, data: result };
    } catch (error) {
      this.logExecution(operationName, false, Date.now() - startTime, error.message);
      return { 
        success: false, 
        error: error.message,
        code: 'EXECUTION_FAILED'
      };
    }
  }
  
  /**
   * Sanitize operation arguments
   * @param {Array} args - Arguments to sanitize
   */
  sanitizeArguments(args) {
    return args.map(arg => {
      if (typeof arg === 'string') {
        const validation = validateInput(arg);
        return validation.valid ? validation.sanitized : '';
      }
      if (typeof arg === 'object' && arg !== null) {
        return this.sanitizeObject(arg);
      }
      return arg;
    });
  }
  
  /**
   * Sanitize object recursively
   * @param {Object} obj - Object to sanitize
   */
  sanitizeObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      
      if (typeof value === 'string') {
        const validation = validateInput(value);
        sanitized[key] = validation.valid ? validation.sanitized : '';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Execute function with timeout
   * @param {Function} func - Function to execute
   * @param {Array} args - Function arguments
   * @param {Object} context - Execution context
   * @param {number} timeout - Timeout in milliseconds
   */
  executeWithTimeout(func, args, context, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Operation timeout'));
      }, timeout);
      
      try {
        const result = func.apply(context, args);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
  
  /**
   * Log execution for monitoring
   * @param {string} operation - Operation name
   * @param {boolean} success - Success status
   * @param {number} duration - Execution duration
   * @param {string} error - Error message if failed
   */
  logExecution(operation, success, duration, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      success,
      duration,
      error
    };
    
    this.executionLog.push(logEntry);
    
    // Keep only last 100 entries
    if (this.executionLog.length > 100) {
      this.executionLog.shift();
    }
    
    // Log security events
    if (window.SecurityMonitor) {
      window.SecurityMonitor.recordEvent('dynamic_execution', {
        operation,
        success,
        duration
      });
    }
  }
  
  /**
   * Get execution statistics
   */
  getStatistics() {
    const total = this.executionLog.length;
    const successful = this.executionLog.filter(log => log.success).length;
    const avgDuration = this.executionLog.reduce((sum, log) => sum + log.duration, 0) / total;
    
    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failureRate: ((total - successful) / total * 100).toFixed(2) + '%',
      averageDuration: Math.round(avgDuration) + 'ms'
    };
  }
}

export default CodeInjectionProtection;