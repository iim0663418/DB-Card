/**
 * Translation Loader with Retry Mechanism
 * Implements exponential backoff retry strategy for external translation loading
 * Provides fallback translations and prevents DoS attacks
 */

class TranslationLoaderWithRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second base delay
    this.maxDelay = options.maxDelay || 10000;   // 10 seconds max delay
    this.timeout = options.timeout || 5000;     // 5 seconds timeout
    this.jitterFactor = options.jitterFactor || 0.1; // 10% jitter
    
    // Rate limiting to prevent DoS
    this.requestCounts = new Map();
    this.maxRequestsPerMinute = options.maxRequestsPerMinute || 10;
    this.rateLimitWindow = 60000; // 1 minute
    
    // Cache for successful loads
    this.cache = new Map();
    this.cacheExpiry = options.cacheExpiry || 300000; // 5 minutes
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      cacheHits: 0,
      rateLimitedRequests: 0
    };
  }

  /**
   * Load translation file with retry mechanism
   * @param {string} url - Translation file URL
   * @param {string} language - Language code
   * @returns {Promise<Object>} Translation data
   */
  async loadTranslationWithRetry(url, language) {
    // Check cache first
    const cacheKey = `${url}:${language}`;
    const cached = this.getCachedTranslation(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    // Check rate limiting
    if (!this.checkRateLimit(url)) {
      this.metrics.rateLimitedRequests++;
      throw new Error(`Rate limit exceeded for ${url}. Max ${this.maxRequestsPerMinute} requests per minute.`);
    }

    this.metrics.totalRequests++;
    
    let lastError;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const translation = await this.attemptLoad(url, language, attempt);
        
        // Cache successful result
        this.cacheTranslation(cacheKey, translation);
        this.metrics.successfulRequests++;
        
        if (attempt > 0) {
          this.metrics.retriedRequests++;
          console.log(`[TranslationLoader] Successfully loaded ${url} after ${attempt} retries`);
        }
        
        return translation;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt <= this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.warn(`[TranslationLoader] Attempt ${attempt} failed for ${url}, retrying in ${delay}ms:`, error.message);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.metrics.failedRequests++;
    console.error(`[TranslationLoader] Failed to load ${url} after ${this.maxRetries} retries:`, lastError);
    
    // Return fallback translation
    return this.getFallbackTranslation(language);
  }

  /**
   * Attempt to load translation file
   * @param {string} url - Translation file URL
   * @param {string} language - Language code
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Translation data
   */
  async attemptLoad(url, language, attempt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': attempt === 0 ? 'no-cache' : 'max-age=300'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const data = await response.json();
      
      // Validate translation structure
      this.validateTranslationStructure(data, language);
      
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    
    // Apply jitter to prevent thundering herd
    const jitter = exponentialDelay * this.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maximum delay
    return Math.min(delayWithJitter, this.maxDelay);
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check rate limiting for URL
   * @param {string} url - Request URL
   * @returns {boolean} True if request is allowed
   */
  checkRateLimit(url) {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    
    // Get or create request history for this URL
    if (!this.requestCounts.has(url)) {
      this.requestCounts.set(url, []);
    }
    
    const requests = this.requestCounts.get(url);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requestCounts.set(url, recentRequests);
    
    // Check if we're under the limit
    if (recentRequests.length >= this.maxRequestsPerMinute) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    return true;
  }

  /**
   * Get cached translation if available and not expired
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached translation or null
   */
  getCachedTranslation(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Cache translation data
   * @param {string} cacheKey - Cache key
   * @param {Object} data - Translation data
   */
  cacheTranslation(cacheKey, data) {
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries periodically
    if (this.cache.size > 50) {
      this.cleanupCache();
    }
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    console.log(`[TranslationLoader] Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  /**
   * Validate translation structure
   * @param {Object} data - Translation data
   * @param {string} language - Language code
   */
  validateTranslationStructure(data, language) {
    if (!data || typeof data !== 'object') {
      throw new Error('Translation data must be an object');
    }
    
    // Check for required accessibility structure
    if (!data.ariaLabels || typeof data.ariaLabels !== 'object') {
      console.warn(`[TranslationLoader] Missing ariaLabels in ${language} translation`);
    }
    
    if (!data.screenReaderTexts || typeof data.screenReaderTexts !== 'object') {
      console.warn(`[TranslationLoader] Missing screenReaderTexts in ${language} translation`);
    }
  }

  /**
   * Get fallback translation when loading fails
   * @param {string} language - Language code
   * @returns {Object} Fallback translation
   */
  getFallbackTranslation(language) {
    console.warn(`[TranslationLoader] Using fallback translation for ${language}`);
    
    const isZh = language === 'zh';
    
    return {
      ariaLabels: {
        systemNotifications: isZh ? '系統通知' : 'System Notifications',
        closeNotification: isZh ? '關閉通知' : 'Close Notification',
        closeModal: isZh ? '關閉對話框' : 'Close Dialog',
        languageToggle: isZh ? '語言切換' : 'Language Toggle',
        themeToggle: isZh ? '主題切換' : 'Theme Toggle',
        cardList: isZh ? '名片列表' : 'Card List',
        searchCards: isZh ? '搜尋名片' : 'Search Cards',
        filterCards: isZh ? '篩選名片' : 'Filter Cards'
      },
      screenReaderTexts: {
        languageChanged: isZh ? '語言已切換至中文' : 'Language changed to English',
        modalOpened: isZh ? '對話框已開啟' : 'Dialog has been opened',
        modalClosed: isZh ? '對話框已關閉' : 'Dialog has been closed',
        cardAdded: isZh ? '名片已新增' : 'Card has been added',
        cardRemoved: isZh ? '名片已移除' : 'Card has been removed'
      },
      formLabels: {
        searchCards: isZh ? '搜尋名片' : 'Search Cards',
        filterCards: isZh ? '篩選名片' : 'Filter Cards',
        cardName: isZh ? '名片名稱' : 'Card Name',
        cardTitle: isZh ? '職稱' : 'Title',
        cardEmail: isZh ? '電子郵件' : 'Email'
      },
      placeholders: {
        searchPlaceholder: isZh ? '輸入關鍵字搜尋...' : 'Enter keywords to search...',
        noCardsFound: isZh ? '找不到符合條件的名片' : 'No cards found matching criteria'
      },
      validationMessages: {
        required: isZh ? '此欄位為必填' : 'This field is required',
        invalidEmail: isZh ? '請輸入有效的電子郵件地址' : 'Please enter a valid email address',
        invalidUrl: isZh ? '請輸入有效的網址' : 'Please enter a valid URL'
      },
      statusMessages: {
        loading: isZh ? '載入中...' : 'Loading...',
        saving: isZh ? '儲存中...' : 'Saving...',
        saved: isZh ? '已儲存' : 'Saved',
        error: isZh ? '發生錯誤' : 'An error occurred'
      }
    };
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      cacheSize: this.cache.size,
      activeRateLimits: this.requestCounts.size
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  reset() {
    this.cache.clear();
    this.requestCounts.clear();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      cacheHits: 0,
      rateLimitedRequests: 0
    };
    
    console.log('[TranslationLoader] Reset completed');
  }

  /**
   * Configure loader parameters
   * @param {Object} config - Configuration options
   */
  configure(config) {
    if (config.maxRetries !== undefined) {
      this.maxRetries = Math.max(0, Math.min(10, config.maxRetries));
    }
    if (config.baseDelay !== undefined) {
      this.baseDelay = Math.max(100, config.baseDelay);
    }
    if (config.maxDelay !== undefined) {
      this.maxDelay = Math.max(this.baseDelay, config.maxDelay);
    }
    if (config.timeout !== undefined) {
      this.timeout = Math.max(1000, config.timeout);
    }
    if (config.maxRequestsPerMinute !== undefined) {
      this.maxRequestsPerMinute = Math.max(1, config.maxRequestsPerMinute);
    }
    
    console.log('[TranslationLoader] Configuration updated:', {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      timeout: this.timeout,
      maxRequestsPerMinute: this.maxRequestsPerMinute
    });
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationLoaderWithRetry;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
  window.TranslationLoaderWithRetry = TranslationLoaderWithRetry;
}