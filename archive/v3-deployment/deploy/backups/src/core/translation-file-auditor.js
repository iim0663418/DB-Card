/**
 * Translation File Accessibility Auditor
 * Verifies translation files are properly accessible in static hosting environments
 * Compatible with GitHub Pages, Cloudflare Pages, and other static hosts
 */

class TranslationFileAuditor {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      translationPath: config.translationPath || 'assets/translations',
      supportedLanguages: config.supportedLanguages || ['zh', 'en'],
      timeout: config.timeout || 5000,
      retryAttempts: config.retryAttempts || 2,
      validateContent: config.validateContent !== false,
      logLevel: config.logLevel || 'warn',
      ...config
    };

    this.auditResults = new Map();
    this.fileLoadCache = new Map();
  }

  /**
   * Audit all translation files for accessibility
   * @returns {Promise<Object>} Audit results
   */
  async auditTranslationFiles() {
    const auditStartTime = performance.now();
    const results = {
      isAccessible: true,
      files: {},
      errors: [],
      warnings: [],
      performance: {},
      accessibility: {
        cors: true,
        paths: true,
        content: true,
        loading: true
      },
      timestamp: new Date().toISOString()
    };

    try {
      // Test each language file
      for (const language of this.config.supportedLanguages) {
        const fileResult = await this._auditLanguageFile(language);
        results.files[language] = fileResult;

        if (!fileResult.accessible) {
          results.isAccessible = false;
          results.errors.push(...fileResult.errors);
        }

        results.warnings.push(...fileResult.warnings);
      }

      // Check overall accessibility factors
      await this._checkCorsCompatibility(results);
      await this._checkPathAccessibility(results);
      
      // Performance analysis
      const auditEndTime = performance.now();
      results.performance = {
        totalAuditTime: auditEndTime - auditStartTime,
        averageLoadTime: this._calculateAverageLoadTime(),
        recommendations: this._generatePerformanceRecommendations()
      };

      // Cache results
      this.auditResults.set('lastAudit', results);
      
      this._logAuditResults(results);
      return results;

    } catch (error) {
      this._logError('Audit failed:', error);
      results.isAccessible = false;
      results.errors.push(`Audit error: ${this._sanitizeErrorMessage(error.message)}`);
      return results;
    }
  }

  /**
   * Audit individual language file
   * @param {string} language - Language code
   * @returns {Promise<Object>} File audit result
   */
  async _auditLanguageFile(language) {
    const startTime = performance.now();
    const fileResult = {
      language: language,
      accessible: false,
      url: '',
      loadTime: 0,
      size: 0,
      contentValid: false,
      errors: [],
      warnings: [],
      headers: {}
    };

    try {
      // Build file URL
      const fileName = `accessibility-${language}.json`;
      const fileUrl = this._buildFileUrl(fileName);
      fileResult.url = fileUrl;

      // Attempt to load file
      const loadResult = await this._loadTranslationFile(fileUrl, language);
      
      const endTime = performance.now();
      fileResult.loadTime = endTime - startTime;

      if (loadResult.success) {
        fileResult.accessible = true;
        fileResult.size = loadResult.size;
        fileResult.contentValid = loadResult.contentValid;
        fileResult.headers = loadResult.headers;

        // Content validation
        if (this.config.validateContent && loadResult.data) {
          const contentAudit = this._auditFileContent(loadResult.data, language);
          fileResult.contentValid = contentAudit.valid;
          fileResult.warnings.push(...contentAudit.warnings);
        }
      } else {
        fileResult.accessible = false;
        fileResult.errors.push(`Failed to load ${fileName}: ${loadResult.error}`);
      }

    } catch (error) {
      fileResult.accessible = false;
      fileResult.errors.push(`Audit error for ${language}: ${this._sanitizeErrorMessage(error.message)}`);
    }

    return fileResult;
  }

  /**
   * Load translation file with error handling and security checks
   * @param {string} url - File URL
   * @param {string} language - Language code
   * @returns {Promise<Object>} Load result
   */
  async _loadTranslationFile(url, language) {
    const result = {
      success: false,
      data: null,
      size: 0,
      error: '',
      contentValid: false,
      headers: {}
    };

    // Check cache first
    const cacheKey = `${url}-${language}`;
    if (this.fileLoadCache.has(cacheKey)) {
      const cached = this.fileLoadCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.result;
      }
    }

    let attempt = 0;
    while (attempt < this.config.retryAttempts) {
      try {
        const response = await this._fetchWithTimeout(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json,text/plain,*/*',
            'Cache-Control': 'no-cache'
          }
        }, this.config.timeout);

        // Extract response headers for analysis
        result.headers = this._extractResponseHeaders(response);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        result.size = text.length;

        // Validate JSON format
        try {
          const data = JSON.parse(text);
          result.data = data;
          result.contentValid = this._validateJsonStructure(data);
          result.success = true;

          // Cache successful result
          this.fileLoadCache.set(cacheKey, {
            timestamp: Date.now(),
            result: result
          });

          return result;

        } catch (parseError) {
          throw new Error(`Invalid JSON format: ${parseError.message}`);
        }

      } catch (error) {
        attempt++;
        result.error = `Attempt ${attempt}: ${this._sanitizeErrorMessage(error.message)}`;

        if (attempt >= this.config.retryAttempts) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return result;
  }

  /**
   * Fetch with timeout to prevent hanging requests
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Response>} Fetch response
   */
  async _fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Build file URL based on configuration
   * @param {string} fileName - Translation file name
   * @returns {string} Complete file URL
   */
  _buildFileUrl(fileName) {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const path = this.config.translationPath.replace(/^\/+|\/+$/g, '');
    
    if (base) {
      return `${base}/${path}/${fileName}`;
    } else {
      return `${path}/${fileName}`;
    }
  }

  /**
   * Validate JSON structure for translation data
   * @param {Object} data - Parsed JSON data
   * @returns {boolean} True if structure is valid
   */
  _validateJsonStructure(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for expected top-level structure
    const expectedSections = ['ariaLabels', 'screenReaderTexts'];
    const hasRequiredSections = expectedSections.some(section => 
      data.hasOwnProperty(section) && typeof data[section] === 'object'
    );

    return hasRequiredSections;
  }

  /**
   * Audit file content for completeness and security
   * @param {Object} data - Translation data
   * @param {string} language - Language code
   * @returns {Object} Content audit result
   */
  _auditFileContent(data, language) {
    const result = {
      valid: true,
      warnings: [],
      keyCount: 0,
      sections: []
    };

    try {
      // Count total keys
      result.keyCount = this._countKeys(data);
      result.sections = Object.keys(data);

      // Check for empty sections
      for (const section in data) {
        if (typeof data[section] === 'object' && Object.keys(data[section]).length === 0) {
          result.warnings.push(`Empty section '${section}' in ${language} translation`);
        }
      }

      // Check for potentially problematic content
      this._auditContentSecurity(data, result, language);

    } catch (error) {
      result.valid = false;
      result.warnings.push(`Content audit error: ${this._sanitizeErrorMessage(error.message)}`);
    }

    return result;
  }

  /**
   * Count total translation keys recursively
   * @param {Object} obj - Translation object
   * @returns {number} Total key count
   */
  _countKeys(obj) {
    let count = 0;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          count += this._countKeys(obj[key]);
        } else {
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Audit content for security issues
   * @param {Object} data - Translation data
   * @param {Object} result - Result object to update
   * @param {string} language - Language code
   */
  _auditContentSecurity(data, result, language) {
    const checkValue = (value, path) => {
      if (typeof value === 'string') {
        // Check for potential XSS patterns
        if (/<script|javascript:|on\w+=/i.test(value)) {
          result.warnings.push(`Potential XSS risk in ${language} at ${path}`);
        }
        
        // Check for suspicious URLs
        if (/data:|blob:|javascript:/i.test(value)) {
          result.warnings.push(`Suspicious URL scheme in ${language} at ${path}`);
        }
      }
    };

    const traverse = (obj, path = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            traverse(obj[key], currentPath);
          } else {
            checkValue(obj[key], currentPath);
          }
        }
      }
    };

    traverse(data);
  }

  /**
   * Check CORS compatibility for static hosting
   * @param {Object} results - Audit results to update
   */
  async _checkCorsCompatibility(results) {
    // CORS is typically handled by static hosts automatically for same-origin requests
    // This check verifies if cross-origin requests would work
    
    try {
      // Test a simple request to detect CORS configuration
      const testUrl = this._buildFileUrl('accessibility-en.json');
      const response = await this._fetchWithTimeout(testUrl, {
        method: 'HEAD'
      }, 3000);

      const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods'];
      const hasCorsHeaders = corsHeaders.some(header => 
        response.headers.has(header)
      );

      if (!hasCorsHeaders) {
        results.warnings.push('No CORS headers detected - may cause issues with cross-origin requests');
        results.accessibility.cors = false;
      }

    } catch (error) {
      // HEAD request might not be supported, this is okay
      results.warnings.push('Could not verify CORS configuration');
    }
  }

  /**
   * Check path accessibility
   * @param {Object} results - Audit results to update
   */
  async _checkPathAccessibility(results) {
    // Verify that translation paths are consistent and accessible
    const baseDir = this._buildFileUrl('');
    
    try {
      // Try to access the directory (this might not work on all static hosts)
      const response = await this._fetchWithTimeout(baseDir, { method: 'HEAD' }, 2000);
      
      if (!response.ok && response.status !== 403) {
        // 403 is okay (directory listing disabled), other errors are concerning
        results.warnings.push(`Translation directory may not be accessible: HTTP ${response.status}`);
        results.accessibility.paths = false;
      }

    } catch (error) {
      // This is expected on most static hosts, so don't mark as error
      // Just log for debugging if needed
      if (this.config.logLevel === 'debug') {
        console.debug('[TranslationFileAuditor] Directory check failed (expected on static hosts):', error.message);
      }
    }
  }

  /**
   * Extract relevant response headers
   * @param {Response} response - Fetch response
   * @returns {Object} Header information
   */
  _extractResponseHeaders(response) {
    const headers = {};
    
    const relevantHeaders = [
      'content-type',
      'content-length',
      'cache-control',
      'etag',
      'last-modified',
      'access-control-allow-origin'
    ];

    relevantHeaders.forEach(header => {
      if (response.headers.has(header)) {
        headers[header] = response.headers.get(header);
      }
    });

    return headers;
  }

  /**
   * Calculate average load time from cached results
   * @returns {number} Average load time in milliseconds
   */
  _calculateAverageLoadTime() {
    const lastAudit = this.auditResults.get('lastAudit');
    if (!lastAudit || !lastAudit.files) return 0;

    const loadTimes = Object.values(lastAudit.files)
      .filter(file => file.accessible)
      .map(file => file.loadTime);

    return loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;
  }

  /**
   * Generate performance recommendations
   * @returns {Array} Performance recommendations
   */
  _generatePerformanceRecommendations() {
    const recommendations = [];
    const avgLoadTime = this._calculateAverageLoadTime();

    if (avgLoadTime > 1000) {
      recommendations.push('Consider enabling gzip compression for translation files');
    }

    if (avgLoadTime > 2000) {
      recommendations.push('Translation files may be too large - consider splitting into smaller files');
    }

    const lastAudit = this.auditResults.get('lastAudit');
    if (lastAudit && lastAudit.files) {
      const totalSize = Object.values(lastAudit.files)
        .reduce((sum, file) => sum + (file.size || 0), 0);

      if (totalSize > 100000) { // 100KB
        recommendations.push('Consider optimizing translation file size - current total size is large');
      }
    }

    return recommendations;
  }

  /**
   * Sanitize error message to prevent information leakage
   * @param {string} message - Raw error message
   * @returns {string} Sanitized message
   */
  _sanitizeErrorMessage(message) {
    return message
      .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
      .replace(/https?:\/\/[^\s]+/g, '[URL]') // Replace URLs
      .substring(0, 200); // Limit length
  }

  /**
   * Log audit results
   * @param {Object} results - Audit results
   */
  _logAuditResults(results) {
    if (this.config.logLevel === 'none') return;

    const logMethod = results.isAccessible ? 'info' : 'warn';
    
    if (console[logMethod]) {
      console[logMethod]('[TranslationFileAuditor] Audit completed:', {
        accessible: results.isAccessible,
        files: Object.keys(results.files).length,
        errors: results.errors.length,
        warnings: results.warnings.length,
        avgLoadTime: results.performance?.averageLoadTime || 0
      });
    }

    if (results.errors.length > 0 && console.error) {
      console.error('[TranslationFileAuditor] Errors:', results.errors);
    }
  }

  /**
   * Log error with sanitization
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  _logError(message, error) {
    if (this.config.logLevel !== 'none' && console.error) {
      console.error(`[TranslationFileAuditor] ${message}`, this._sanitizeErrorMessage(error.message));
    }
  }

  /**
   * Get last audit results
   * @returns {Object|null} Last audit results
   */
  getLastAuditResults() {
    return this.auditResults.get('lastAudit') || null;
  }

  /**
   * Clear audit cache
   */
  clearCache() {
    this.auditResults.clear();
    this.fileLoadCache.clear();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationFileAuditor;
}

// Global window object for browser usage
if (typeof window !== 'undefined') {
  window.TranslationFileAuditor = TranslationFileAuditor;
}