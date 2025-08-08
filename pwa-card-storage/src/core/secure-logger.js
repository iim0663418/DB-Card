/**
 * SecureLogger - 安全日誌系統
 * 修復 CWE-117 日誌注入漏洞，實作 PII 保護和統一日誌格式
 * 
 * @version 1.0.0
 * @author PWA Security Team
 */

class SecureLogger {
  constructor() {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    
    // 預設日誌等級為 INFO
    this.currentLevel = this.levels.INFO;
    
    // PII 檢測模式 (常見敏感資料格式)
    this.piiPatterns = [
      // Email 地址
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      // 電話號碼 (多種格式)
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      /\b\d{4}[-.]?\d{3}[-.]?\d{3}\b/g,
      // 信用卡號碼
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      // 身分證字號 (台灣格式)
      /\b[A-Z]\d{9}\b/g,
      // IP 地址
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      // JWT Token (簡化檢測)
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
    ];
    
    // 最大日誌長度限制 (防止日誌洪水攻擊)
    this.maxLogLength = 1000;
    this.maxDataLength = 500;
    
    // 嘗試整合 XSS 保護模組
    this.xssProtection = null;
    this.initializeXSSProtection();
  }
  
  /**
   * 初始化 XSS 保護整合
   */
  initializeXSSProtection() {
    try {
      // 嘗試使用全域 XSS 保護模組 (來自 SEC-02)
      if (typeof window !== 'undefined' && window.xssProtection) {
        this.xssProtection = window.xssProtection;
      }
    } catch (error) {
      // XSS 保護模組不可用時的靜默處理
    }
  }
  
  /**
   * 主要安全日誌函數
   * @param {string} level - 日誌等級 (DEBUG, INFO, WARN, ERROR)
   * @param {string} message - 日誌訊息
   * @param {Object} data - 附加資料物件
   * @param {Object} options - 日誌選項
   */
  secureLog(level, message, data = {}, options = {}) {
    try {
      // 檢查日誌等級
      if (this.levels[level] < this.currentLevel) {
        return;
      }
      
      // 清理和驗證輸入
      const safeMessage = this.sanitizeLogInput(message);
      const safeData = this.sanitizeLogData(data);
      
      // 生成時間戳
      const timestamp = new Date().toISOString();
      
      // 格式化日誌輸出
      const logEntry = this.formatLogEntry(timestamp, level, safeMessage, safeData, options);
      
      // 輸出到適當的控制台方法
      this.outputLog(level, logEntry);
      
    } catch (error) {
      // 日誌系統本身的錯誤處理 - 使用最基本的輸出
      console.error('[SecureLogger] Internal error:', error.message);
    }
  }
  
  /**
   * 清理日誌輸入 (防止注入攻擊)
   * @param {any} input - 輸入內容
   * @returns {string} 清理後的安全字串
   */
  sanitizeLogInput(input) {
    if (input === null || input === undefined) {
      return '[null]';
    }
    
    let safeInput = String(input);
    
    // 使用 XSS 保護模組 (如果可用)
    if (this.xssProtection && typeof this.xssProtection.sanitizeInput === 'function') {
      safeInput = this.xssProtection.sanitizeInput(safeInput);
    } else {
      // 基本清理 (備用方案)
      safeInput = safeInput
        .replace(/[\r\n\t]/g, ' ')  // 移除換行符號 (防止日誌分割)
        .replace(/[<>"'&]/g, (match) => {
          const map = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return map[match];
        });
    }
    
    // PII 檢測和編輯
    safeInput = this.detectAndRedactPII(safeInput);
    
    // 長度限制
    if (safeInput.length > this.maxLogLength) {
      safeInput = safeInput.substring(0, this.maxLogLength) + '...[truncated]';
    }
    
    return safeInput;
  }
  
  /**
   * 清理日誌資料物件
   * @param {Object} data - 資料物件
   * @returns {Object} 清理後的安全物件
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }
    
    const safeData = {};
    let totalLength = 0;
    
    try {
      for (const [key, value] of Object.entries(data)) {
        // 檢查總長度限制
        if (totalLength > this.maxDataLength) {
          safeData['...'] = '[additional data truncated]';
          break;
        }
        
        const safeKey = this.sanitizeLogInput(key).substring(0, 50);
        let safeValue;
        
        if (typeof value === 'string') {
          safeValue = this.sanitizeLogInput(value);
        } else if (typeof value === 'object' && value !== null) {
          // 避免循環引用和深度嵌套
          try {
            safeValue = '[Object: ' + Object.keys(value).length + ' keys]';
          } catch (e) {
            safeValue = '[Object: circular reference]';
          }
        } else {
          safeValue = String(value).substring(0, 100);
        }
        
        safeData[safeKey] = safeValue;
        totalLength += safeKey.length + String(safeValue).length;
      }
    } catch (error) {
      return { error: 'Failed to sanitize log data' };
    }
    
    return safeData;
  }
  
  /**
   * PII 檢測和編輯
   * @param {string} text - 輸入文字
   * @returns {string} 編輯後的文字
   */
  detectAndRedactPII(text) {
    let redactedText = text;
    
    this.piiPatterns.forEach(pattern => {
      redactedText = redactedText.replace(pattern, '[REDACTED]');
    });
    
    return redactedText;
  }
  
  /**
   * 格式化日誌條目
   * @param {string} timestamp - 時間戳
   * @param {string} level - 日誌等級
   * @param {string} message - 訊息
   * @param {Object} data - 資料
   * @param {Object} options - 選項
   * @returns {string} 格式化的日誌條目
   */
  formatLogEntry(timestamp, level, message, data, options) {
    const prefix = `[${timestamp}] [${level}]`;
    const hasData = Object.keys(data).length > 0;
    
    if (hasData) {
      try {
        const dataStr = JSON.stringify(data);
        return `${prefix} ${message} | Data: ${dataStr}`;
      } catch (e) {
        return `${prefix} ${message} | Data: [serialization failed]`;
      }
    } else {
      return `${prefix} ${message}`;
    }
  }
  
  /**
   * 輸出日誌到控制台
   * @param {string} level - 日誌等級
   * @param {string} logEntry - 格式化的日誌條目
   */
  outputLog(level, logEntry) {
    switch (level) {
      case 'DEBUG':
        console.debug(logEntry);
        break;
      case 'INFO':
        console.log(logEntry);
        break;
      case 'WARN':
        console.warn(logEntry);
        break;
      case 'ERROR':
        console.error(logEntry);
        break;
      default:
        console.log(logEntry);
    }
  }
  
  /**
   * 便利方法 - DEBUG 等級日誌
   */
  debug(message, data = {}) {
    this.secureLog('DEBUG', message, data);
  }
  
  /**
   * 便利方法 - INFO 等級日誌
   */
  info(message, data = {}) {
    this.secureLog('INFO', message, data);
  }
  
  /**
   * 便利方法 - WARN 等級日誌
   */
  warn(message, data = {}) {
    this.secureLog('WARN', message, data);
  }
  
  /**
   * 便利方法 - ERROR 等級日誌
   */
  error(message, data = {}) {
    this.secureLog('ERROR', message, data);
  }
  
  /**
   * 設定日誌等級
   * @param {string} level - 新的日誌等級
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }
  
  /**
   * 取得目前日誌等級
   * @returns {string} 目前日誌等級
   */
  getLevel() {
    return Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel);
  }
}

// 建立全域實例
const secureLogger = new SecureLogger();

// 全域便利函數 (向下相容)
window.secureLog = (message, data = {}) => {
  secureLogger.info(message, data);
};

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureLogger, secureLogger };
}

// 全域可用性
if (typeof window !== 'undefined') {
  window.secureLogger = secureLogger;
  window.SecureLogger = SecureLogger;
}