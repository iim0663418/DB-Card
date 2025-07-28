/**
 * 安全工具函數庫
 * 提供 XSS 防護、輸入驗證、路徑清理等安全功能
 */

class SecurityUtils {
  // 允許的模組白名單
  static ALLOWED_MODULES = [
    'pwa-storage.js',
    'collection-manager.js', 
    'format-parser.js',
    'pwa-core.js',
    'qr-scanner.js',
    'bilingual-common.js',
    'security-utils.js'
  ];

  /**
   * 文本清理 - 防止 XSS 攻擊
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[<>&"']/g, (match) => {
      const escapeMap = { 
        '<': '&lt;', 
        '>': '&gt;', 
        '&': '&amp;', 
        '"': '&quot;', 
        "'": '&#x27;' 
      };
      return escapeMap[match];
    });
  }

  /**
   * 路徑清理 - 防止路徑遍歷攻擊
   */
  static sanitizePath(path) {
    if (typeof path !== 'string') return null;
    
    // 移除路徑遍歷字符
    const normalizedPath = path.replace(/\.\./g, '').replace(/\/+/g, '/');
    const filename = normalizedPath.split('/').pop();
    
    // 檢查白名單
    return this.ALLOWED_MODULES.includes(filename) ? normalizedPath : null;
  }

  /**
   * URL 清理 - 防止惡意 URL
   */
  static sanitizeUrl(url) {
    if (typeof url !== 'string') return '#';
    
    try {
      const parsed = new URL(url);
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      return allowedProtocols.includes(parsed.protocol) ? url : '#';
    } catch {
      return '#';
    }
  }

  /**
   * 安全 JSON 解析
   */
  static safeJSONParse(jsonString, fallback = null) {
    try {
      const parsed = JSON.parse(jsonString);
      return this.validateDataStructure(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * 驗證資料結構
   */
  static validateDataStructure(data) {
    return data && typeof data === 'object' && !Array.isArray(data);
  }

  /**
   * 安全的 DOM 元素創建
   */
  static createSecureElement(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);
    
    if (textContent) {
      element.textContent = this.sanitizeText(textContent);
    }
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'href') {
        element.setAttribute(key, this.sanitizeUrl(value));
      } else {
        element.setAttribute(key, this.sanitizeText(value));
      }
    });
    
    return element;
  }

  /**
   * 安全錯誤處理
   */
  static handleError(error, context) {
    const safeMessage = error.name === 'ValidationError' 
      ? '輸入格式不正確' 
      : '系統暫時無法處理請求';
    
    // 僅在開發環境記錄詳細錯誤
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}]`, error);
    }
    
    return { success: false, message: safeMessage };
  }

  /**
   * 輸入驗證
   */
  static validateInput(input, type) {
    if (!input || typeof input !== 'string') return false;
    
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      case 'phone':
        return /^[\d\s\-\(\)\+]+$/.test(input) && input.replace(/\D/g, '').length >= 8;
      case 'name':
        return input.trim().length > 0 && input.length <= 100;
      case 'url':
        try {
          new URL(input);
          return true;
        } catch {
          return false;
        }
      default:
        return input.trim().length > 0;
    }
  }
}

// 全域實例
window.SecurityUtils = SecurityUtils;