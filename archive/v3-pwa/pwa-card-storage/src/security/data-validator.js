/**
 * Data Validator - ES6 Module
 * Comprehensive data validation and format checking
 * 
 * Security Features:
 * - Type safety validation
 * - Format validation with regex patterns
 * - Business logic validation
 * - Schema validation for complex objects
 * - CWE-94 Code Injection Prevention (SEC-002 Enhanced)
 * 
 * @version 1.1.0 - SEC-002 Code Injection Protection
 * @security Critical - Multi-CWE Protection
 */

// Validation schemas and patterns
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  name: /^[a-zA-Z\u4e00-\u9fff\s]{1,50}$/,
  title: /^[a-zA-Z0-9\u4e00-\u9fff\s\-\.]{1,100}$/,
  department: /^[a-zA-Z0-9\u4e00-\u9fff\s\-\.]{1,100}$/
};

const VALIDATION_CONFIG = {
  maxStringLength: 1000,
  maxArrayLength: 100,
  maxObjectDepth: 5,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxImageSize: 5 * 1024 * 1024 // 5MB
};

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email must be a string' };
  }
  
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) { // RFC 5321 limit
    return { valid: false, reason: 'Email too long' };
  }
  
  const isValid = VALIDATION_PATTERNS.email.test(trimmed);
  return {
    valid: isValid,
    sanitized: isValid ? trimmed : '',
    reason: isValid ? 'Valid email' : 'Invalid email format'
  };
}

/**
 * Validate phone number format
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, reason: 'Phone must be a string' };
  }
  
  // Remove common separators and spaces
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  const isValid = VALIDATION_PATTERNS.phone.test(cleaned);
  
  return {
    valid: isValid,
    sanitized: isValid ? cleaned : '',
    reason: isValid ? 'Valid phone' : 'Invalid phone format'
  };
}

/**
 * Validate URL format with security checks
 */
export function validateUrlFormat(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL must be a string' };
  }
  
  const trimmed = url.trim();
  
  // Basic format validation
  if (!VALIDATION_PATTERNS.url.test(trimmed)) {
    return { valid: false, reason: 'Invalid URL format' };
  }
  
  try {
    const urlObj = new URL(trimmed);
    
    // Security checks
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return { valid: false, reason: 'Only HTTP/HTTPS protocols allowed' };
    }
    
    // Prevent localhost and private IP access
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname.startsWith('127.') ||
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return { valid: false, reason: 'Private network URLs not allowed' };
    }
    
    return {
      valid: true,
      sanitized: urlObj.toString(),
      reason: 'Valid URL'
    };
  } catch (error) {
    return { valid: false, reason: 'Malformed URL' };
  }
}

/**
 * Validate name format (supports Chinese characters)
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'Name must be a string' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: 'Name cannot be empty' };
  }
  
  const isValid = VALIDATION_PATTERNS.name.test(trimmed);
  return {
    valid: isValid,
    sanitized: isValid ? trimmed : '',
    reason: isValid ? 'Valid name' : 'Name contains invalid characters'
  };
}

/**
 * Validate business card data schema
 */
export function validateBusinessCardData(data) {
  const errors = [];
  const sanitized = {};
  
  // Required fields validation
  const requiredFields = ['name'];
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }
  
  // Name validation
  if (data.name) {
    const nameResult = validateName(data.name);
    if (nameResult.valid) {
      sanitized.name = nameResult.sanitized;
    } else {
      errors.push(`Invalid name: ${nameResult.reason}`);
    }
  }
  
  // Email validation (optional)
  if (data.email) {
    const emailResult = validateEmail(data.email);
    if (emailResult.valid) {
      sanitized.email = emailResult.sanitized;
    } else {
      errors.push(`Invalid email: ${emailResult.reason}`);
    }
  }
  
  // Phone validation (optional)
  if (data.phone) {
    const phoneResult = validatePhone(data.phone);
    if (phoneResult.valid) {
      sanitized.phone = phoneResult.sanitized;
    } else {
      errors.push(`Invalid phone: ${phoneResult.reason}`);
    }
  }
  
  // Mobile validation (optional)
  if (data.mobile) {
    const mobileResult = validatePhone(data.mobile);
    if (mobileResult.valid) {
      sanitized.mobile = mobileResult.sanitized;
    } else {
      errors.push(`Invalid mobile: ${mobileResult.reason}`);
    }
  }
  
  // Avatar URL validation (optional)
  if (data.avatar) {
    const avatarResult = validateUrlFormat(data.avatar);
    if (avatarResult.valid) {
      sanitized.avatar = avatarResult.sanitized;
    } else {
      errors.push(`Invalid avatar URL: ${avatarResult.reason}`);
    }
  }
  
  // Title validation (optional)
  if (data.title) {
    const titleValid = VALIDATION_PATTERNS.title.test(data.title.trim());
    if (titleValid) {
      sanitized.title = data.title.trim();
    } else {
      errors.push('Invalid title format');
    }
  }
  
  // Department validation (optional)
  if (data.department) {
    const deptValid = VALIDATION_PATTERNS.department.test(data.department.trim());
    if (deptValid) {
      sanitized.department = data.department.trim();
    } else {
      errors.push('Invalid department format');
    }
  }
  
  // Greetings validation (optional array)
  if (data.greetings) {
    if (Array.isArray(data.greetings)) {
      const validGreetings = data.greetings
        .filter(g => typeof g === 'string' && g.trim().length > 0)
        .map(g => g.trim())
        .slice(0, 5); // Limit to 5 greetings
      
      if (validGreetings.length > 0) {
        sanitized.greetings = validGreetings;
      }
    } else {
      errors.push('Greetings must be an array');
    }
  }
  
  // Social links validation (optional object)
  if (data.socialLinks && typeof data.socialLinks === 'object') {
    const validSocialLinks = {};
    
    if (data.socialLinks.email) {
      const emailResult = validateEmail(data.socialLinks.email.replace('mailto:', ''));
      if (emailResult.valid) {
        validSocialLinks.email = `mailto:${emailResult.sanitized}`;
      }
    }
    
    if (data.socialLinks.socialNote && typeof data.socialLinks.socialNote === 'string') {
      const note = data.socialLinks.socialNote.trim();
      if (note.length > 0 && note.length <= 500) {
        validSocialLinks.socialNote = note;
      }
    }
    
    if (Object.keys(validSocialLinks).length > 0) {
      sanitized.socialLinks = validSocialLinks;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized,
    reason: errors.length === 0 ? 'Valid business card data' : 'Validation errors found'
  };
}

/**
 * Validate JSON data with depth and size limits
 * SEC-002: Enhanced with code injection protection
 */
export function validateJsonData(data, maxDepth = VALIDATION_CONFIG.maxObjectDepth) {
  try {
    let parsed;
    
    if (typeof data === 'string') {
      // SEC-002: Safe JSON parsing with prototype pollution protection
      parsed = JSON.parse(data, (key, value) => {
        // Block dangerous keys that could lead to code injection
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        
        // Block function strings that could be executed
        if (typeof value === 'string' && (
          value.includes('function(') ||
          value.includes('=>') ||
          value.includes('eval(') ||
          value.includes('Function(')
        )) {
          return '[BLOCKED_FUNCTION]';
        }
        
        return value;
      });
    } else {
      parsed = data;
    }
    
    // Check depth
    const depth = getObjectDepth(parsed);
    if (depth > maxDepth) {
      return { valid: false, reason: `Object depth exceeds limit (${maxDepth})` };
    }
    
    // Check size (approximate)
    const jsonString = JSON.stringify(parsed);
    if (jsonString.length > VALIDATION_CONFIG.maxStringLength * 10) {
      return { valid: false, reason: 'JSON data too large' };
    }
    
    // SEC-002: Additional security validation
    if (containsCodeInjectionPatterns(parsed)) {
      return { valid: false, reason: 'Data contains potentially dangerous patterns' };
    }
    
    return { valid: true, sanitized: parsed, reason: 'Valid JSON data' };
  } catch (error) {
    return { valid: false, reason: 'Invalid JSON format' };
  }
}

/**
 * Calculate object depth recursively
 */
function getObjectDepth(obj, currentDepth = 0) {
  if (obj === null || typeof obj !== 'object') {
    return currentDepth;
  }
  
  if (Array.isArray(obj)) {
    return Math.max(currentDepth, ...obj.map(item => getObjectDepth(item, currentDepth + 1)));
  }
  
  const depths = Object.values(obj).map(value => getObjectDepth(value, currentDepth + 1));
  return depths.length > 0 ? Math.max(currentDepth, ...depths) : currentDepth;
}

/**
 * Validate file type and size
 */
export function validateFile(file) {
  if (!file || !(file instanceof File)) {
    return { valid: false, reason: 'Invalid file object' };
  }
  
  // Check file size
  if (file.size > VALIDATION_CONFIG.maxImageSize) {
    return { valid: false, reason: 'File size exceeds limit' };
  }
  
  // Check file type
  if (!VALIDATION_CONFIG.allowedImageTypes.includes(file.type)) {
    return { valid: false, reason: 'File type not allowed' };
  }
  
  return { valid: true, reason: 'Valid file' };
}

/**
 * Sanitize string with length limit
 */
export function sanitizeString(str, maxLength = VALIDATION_CONFIG.maxStringLength) {
  if (!str || typeof str !== 'string') {
    return { valid: false, sanitized: '', reason: 'Invalid string' };
  }
  
  const trimmed = str.trim();
  if (trimmed.length === 0) {
    return { valid: false, sanitized: '', reason: 'Empty string' };
  }
  
  const sanitized = trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
  
  return {
    valid: true,
    sanitized,
    reason: sanitized.length < trimmed.length ? 'String truncated' : 'Valid string'
  };
}

/**
 * Batch validation for multiple fields
 */
export function validateBatch(validations) {
  const results = {};
  let allValid = true;
  
  for (const [field, { validator, value, options = {} }] of Object.entries(validations)) {
    let result;
    
    switch (validator) {
      case 'email':
        result = validateEmail(value);
        break;
      case 'phone':
        result = validatePhone(value);
        break;
      case 'url':
        result = validateUrlFormat(value);
        break;
      case 'name':
        result = validateName(value);
        break;
      case 'string':
        result = sanitizeString(value, options.maxLength);
        break;
      default:
        result = { valid: false, reason: 'Unknown validator' };
    }
    
    results[field] = result;
    if (!result.valid) {
      allValid = false;
    }
  }
  
  return { valid: allValid, results };
}

/**
 * SEC-002: Check for code injection patterns
 * @param {*} data - Data to check
 */
function containsCodeInjectionPatterns(data) {
  if (typeof data === 'string') {
    const dangerousPatterns = [
      /function\s*\(/i,
      /=>\s*{/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /new\s+Function/i,
      /\[\s*["']constructor["']\s*\]/i,
      /__proto__/i,
      /prototype\s*\[/i
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(data));
  }
  
  if (Array.isArray(data)) {
    return data.some(item => containsCodeInjectionPatterns(item));
  }
  
  if (data && typeof data === 'object') {
    return Object.values(data).some(value => containsCodeInjectionPatterns(value));
  }
  
  return false;
}

/**
 * SEC-002: Safe dynamic property access
 * @param {Object} obj - Object to access
 * @param {string} path - Property path
 * @param {Array} allowedPaths - Whitelist of allowed paths
 */
export function safeDynamicAccess(obj, path, allowedPaths = []) {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, reason: 'Invalid object' };
  }
  
  if (typeof path !== 'string' || !path.trim()) {
    return { valid: false, reason: 'Invalid path' };
  }
  
  // Check whitelist if provided
  if (allowedPaths.length > 0 && !allowedPaths.includes(path)) {
    return { valid: false, reason: 'Path not in whitelist' };
  }
  
  // Sanitize path to prevent injection
  const sanitizedPath = path.replace(/[^a-zA-Z0-9._]/g, '');
  if (sanitizedPath !== path) {
    return { valid: false, reason: 'Path contains invalid characters' };
  }
  
  try {
    const keys = sanitizedPath.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return { valid: true, value: undefined };
      }
      
      // Prevent dangerous property access
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return { valid: false, reason: 'Dangerous property access blocked' };
      }
      
      current = current[key];
    }
    
    return { valid: true, value: current };
  } catch (error) {
    return { valid: false, reason: `Property access failed: ${error.message}` };
  }
}

/**
 * SEC-002: Safe function name validation
 * @param {string} functionName - Function name to validate
 * @param {Array} allowedFunctions - Whitelist of allowed functions
 */
export function validateFunctionName(functionName, allowedFunctions = []) {
  if (typeof functionName !== 'string' || !functionName.trim()) {
    return { valid: false, reason: 'Invalid function name' };
  }
  
  // Check against whitelist
  if (allowedFunctions.length > 0 && !allowedFunctions.includes(functionName)) {
    return { valid: false, reason: 'Function not in whitelist' };
  }
  
  // Validate function name format
  const functionNamePattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  if (!functionNamePattern.test(functionName)) {
    return { valid: false, reason: 'Invalid function name format' };
  }
  
  // Block dangerous function names
  const dangerousFunctions = [
    'eval', 'Function', 'setTimeout', 'setInterval',
    'execScript', 'setImmediate', 'requestAnimationFrame'
  ];
  
  if (dangerousFunctions.includes(functionName)) {
    return { valid: false, reason: 'Dangerous function blocked' };
  }
  
  return { valid: true, sanitized: functionName };
}

// Export configuration for testing
export { VALIDATION_PATTERNS, VALIDATION_CONFIG };