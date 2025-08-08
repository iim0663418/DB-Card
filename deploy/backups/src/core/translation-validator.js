/**
 * Translation Validation System
 * Client-side translation completeness validation with XSS prevention
 * Compatible with static hosting (GitHub Pages/Cloudflare Pages)
 */

class TranslationValidator {
  constructor(config = {}) {
    this.config = {
      enableXssProtection: config.enableXssProtection !== false,
      logLevel: config.logLevel || 'warn', // 'debug', 'info', 'warn', 'error'
      maxKeyDepth: config.maxKeyDepth || 10,
      allowedHtmlTags: config.allowedHtmlTags || [],
      strictMode: config.strictMode || false
    };
    
    this.validationCache = new Map();
    this.knownKeys = new Set();
    this.validationHistory = [];
  }

  /**
   * Validate translation completeness across languages
   * @param {Object} translations - Complete translation dictionary
   * @param {Array<string>} requiredKeys - Required translation keys  
   * @returns {Object} Validation result
   */
  validateTranslationCompleteness(translations, requiredKeys = []) {
    const result = {
      isValid: true,
      missingKeys: {},
      inconsistencies: {},
      warnings: [],
      errors: [],
      coverage: {},
      timestamp: new Date().toISOString()
    };

    const languages = Object.keys(translations);
    if (languages.length === 0) {
      result.isValid = false;
      result.errors.push('No translation languages found');
      return result;
    }

    // Extract all keys from all languages
    const allKeys = new Set();
    languages.forEach(lang => {
      if (translations[lang] && typeof translations[lang] === 'object') {
        this._extractKeys(translations[lang], allKeys);
      }
    });

    // Add required keys to the check
    requiredKeys.forEach(key => allKeys.add(key));

    // Check each language for completeness
    languages.forEach(lang => {
      const langTranslations = translations[lang];
      result.missingKeys[lang] = [];
      result.coverage[lang] = { found: 0, total: allKeys.size };

      if (!langTranslations || typeof langTranslations !== 'object') {
        result.isValid = false;
        result.errors.push(`Invalid translation object for language: ${lang}`);
        return;
      }

      allKeys.forEach(key => {
        const value = this._getNestedValue(langTranslations, key);
        if (value === null || value === undefined || value === '') {
          result.missingKeys[lang].push(key);
          result.isValid = false;
        } else {
          result.coverage[lang].found++;
          
          // Validate translation content for XSS
          if (this.config.enableXssProtection) {
            const xssResult = this._validateXss(key, value);
            if (!xssResult.isValid) {
              result.warnings.push(`Potential XSS in ${lang}.${key}: ${xssResult.reason}`);
            }
          }
        }
      });

      // Calculate coverage percentage
      result.coverage[lang].percentage = 
        (result.coverage[lang].found / result.coverage[lang].total * 100).toFixed(2);
    });

    // Find inconsistencies between languages
    this._findInconsistencies(translations, result);

    // Store in validation history
    this.validationHistory.push({
      timestamp: result.timestamp,
      isValid: result.isValid,
      languages: languages,
      totalKeys: allKeys.size,
      errors: result.errors.length,
      warnings: result.warnings.length
    });

    // Limit history size
    if (this.validationHistory.length > 100) {
      this.validationHistory = this.validationHistory.slice(-50);
    }

    this._logValidationResult(result);
    return result;
  }

  /**
   * Validate individual translation value for XSS and content security
   * @param {string} key - Translation key
   * @param {any} value - Translation value
   * @returns {Object} XSS validation result
   */
  _validateXss(key, value) {
    const result = { isValid: true, reason: '' };
    
    if (typeof value !== 'string') {
      return result; // Only validate string values
    }

    // Common XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /data:.*base64/gi,
      /vbscript:/gi,
      /livescript:/gi,
      /expression\s*\(/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        result.isValid = false;
        result.reason = `Matches XSS pattern: ${pattern.source}`;
        break;
      }
    }

    // Check for HTML tags if not explicitly allowed
    if (result.isValid && this.config.allowedHtmlTags.length === 0) {
      const htmlTagPattern = /<[^>]+>/g;
      const matches = value.match(htmlTagPattern);
      if (matches && matches.length > 0) {
        result.isValid = false;
        result.reason = `Contains HTML tags: ${matches.join(', ')}`;
      }
    }

    // Check for allowed HTML tags
    if (result.isValid && this.config.allowedHtmlTags.length > 0) {
      const htmlTagPattern = /<(\w+)[^>]*>/g;
      let match;
      while ((match = htmlTagPattern.exec(value)) !== null) {
        const tagName = match[1].toLowerCase();
        if (!this.config.allowedHtmlTags.includes(tagName)) {
          result.isValid = false;
          result.reason = `Disallowed HTML tag: ${tagName}`;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Extract all keys from nested translation object
   * @param {Object} obj - Translation object
   * @param {Set} keys - Set to store keys
   * @param {string} prefix - Key prefix for nested objects
   */
  _extractKeys(obj, keys, prefix = '') {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively extract nested keys
        this._extractKeys(obj[key], keys, fullKey);
      } else {
        keys.add(fullKey);
      }
    });
  }

  /**
   * Get nested value using dot notation
   * @param {Object} obj - Object to search
   * @param {string} key - Dot notation key
   * @returns {any} Found value or null
   */
  _getNestedValue(obj, key) {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return null;
      }
      current = current[k];
    }
    
    return current;
  }

  /**
   * Find inconsistencies between language translations
   * @param {Object} translations - Translation dictionary
   * @param {Object} result - Result object to populate
   */
  _findInconsistencies(translations, result) {
    const languages = Object.keys(translations);
    if (languages.length < 2) return;

    const baseLanguage = languages[0];
    const baseKeys = new Set();
    this._extractKeys(translations[baseLanguage], baseKeys);

    languages.slice(1).forEach(lang => {
      const langKeys = new Set();
      this._extractKeys(translations[lang], langKeys);

      // Find keys in base but not in current language
      const missingInLang = [...baseKeys].filter(key => !langKeys.has(key));
      // Find keys in current language but not in base
      const extraInLang = [...langKeys].filter(key => !baseKeys.has(key));

      if (missingInLang.length > 0 || extraInLang.length > 0) {
        result.inconsistencies[`${baseLanguage}-${lang}`] = {
          missingInTarget: missingInLang,
          extraInTarget: extraInLang
        };
      }
    });
  }

  /**
   * Sanitize translation value to prevent XSS
   * @param {string} value - Raw translation value
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized value
   */
  sanitizeTranslationValue(value, options = {}) {
    if (typeof value !== 'string') {
      return value;
    }

    const config = { ...this.config, ...options };

    // Basic HTML encoding for XSS prevention
    let sanitized = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Allow specific HTML tags if configured
    if (config.allowedHtmlTags && config.allowedHtmlTags.length > 0) {
      config.allowedHtmlTags.forEach(tag => {
        const openTag = new RegExp(`&lt;${tag}(\\s[^&]*)?&gt;`, 'gi');
        const closeTag = new RegExp(`&lt;/${tag}&gt;`, 'gi');
        
        sanitized = sanitized
          .replace(openTag, `<${tag}$1>`)
          .replace(closeTag, `</${tag}>`);
      });
    }

    return sanitized;
  }

  /**
   * Get validation history
   * @param {number} limit - Number of recent validations to return
   * @returns {Array} Validation history
   */
  getValidationHistory(limit = 10) {
    return this.validationHistory.slice(-limit);
  }

  /**
   * Clear validation cache and history
   */
  clearValidationCache() {
    this.validationCache.clear();
    this.validationHistory = [];
    this.knownKeys.clear();
  }

  /**
   * Log validation result based on configured log level
   * @param {Object} result - Validation result
   */
  _logValidationResult(result) {
    const { logLevel } = this.config;
    
    if (logLevel === 'debug' || (logLevel === 'info' && !result.isValid)) {
      console.info('[TranslationValidator] Validation completed:', {
        isValid: result.isValid,
        languages: Object.keys(result.coverage),
        coverage: result.coverage,
        errors: result.errors.length,
        warnings: result.warnings.length
      });
    }
    
    if ((logLevel === 'warn' || logLevel === 'error') && result.warnings.length > 0) {
      console.warn('[TranslationValidator] Warnings found:', result.warnings);
    }
    
    if (result.errors.length > 0) {
      console.error('[TranslationValidator] Errors found:', result.errors);
    }
  }

  /**
   * Create validation report for development/debugging
   * @param {Object} validationResult - Result from validateTranslationCompleteness
   * @returns {string} Human-readable report
   */
  generateValidationReport(validationResult) {
    let report = `Translation Validation Report\n`;
    report += `Generated: ${validationResult.timestamp}\n`;
    report += `Overall Status: ${validationResult.isValid ? 'VALID' : 'INVALID'}\n\n`;

    // Coverage summary
    report += `Coverage Summary:\n`;
    Object.entries(validationResult.coverage).forEach(([lang, coverage]) => {
      report += `  ${lang}: ${coverage.found}/${coverage.total} (${coverage.percentage}%)\n`;
    });
    report += `\n`;

    // Missing keys
    Object.entries(validationResult.missingKeys).forEach(([lang, missing]) => {
      if (missing.length > 0) {
        report += `Missing keys in ${lang} (${missing.length}):\n`;
        missing.forEach(key => report += `  - ${key}\n`);
        report += `\n`;
      }
    });

    // Inconsistencies
    if (Object.keys(validationResult.inconsistencies).length > 0) {
      report += `Inconsistencies:\n`;
      Object.entries(validationResult.inconsistencies).forEach(([pair, data]) => {
        if (data.missingInTarget.length > 0) {
          report += `  Missing in ${pair.split('-')[1]}: ${data.missingInTarget.join(', ')}\n`;
        }
        if (data.extraInTarget.length > 0) {
          report += `  Extra in ${pair.split('-')[1]}: ${data.extraInTarget.join(', ')}\n`;
        }
      });
      report += `\n`;
    }

    // Warnings and errors
    if (validationResult.warnings.length > 0) {
      report += `Warnings (${validationResult.warnings.length}):\n`;
      validationResult.warnings.forEach(warning => report += `     ${warning}\n`);
      report += `\n`;
    }

    if (validationResult.errors.length > 0) {
      report += `Errors (${validationResult.errors.length}):\n`;
      validationResult.errors.forEach(error => report += `  L ${error}\n`);
    }

    return report;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationValidator;
}

// Global window object for browser usage
if (typeof window !== 'undefined') {
  window.TranslationValidator = TranslationValidator;
}