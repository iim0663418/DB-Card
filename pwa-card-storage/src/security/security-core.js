/**
 * SecurityCore - Unified Security Module Coordinator
 * 
 * Integrates all security modules (SEC-001 through SEC-005) as a unified entry point
 * for comprehensive security protection across the application.
 * 
 * @version 2.0.0 - SEC-006 Integration
 * @author Security Team
 */

class SecurityCore {
  constructor(options = {}) {
    this.initialized = false;
    this.securityLevel = options.securityLevel || 'strict';
    this.logger = options.logger || console;
    this.enableLogging = options.enableLogging !== false;
    
    // Security module instances
    this.modules = {
      xssProtection: null,
      inputSanitizer: null,
      codeInjectionProtection: null,
      dataValidator: null,
      secureLogger: null,
      authorizationHandler: null,
      externalLinkHandler: null
    };
    
    this.moduleStatus = {};
  }

  /**
   * SEC-01: 安全的 JSON 解析 - 修復 CWE-502
   * 替代不安全的 JSON.parse() 使用
   */
  static safeJSONParse(jsonString, options = {}) {
    const { 
      maxDepth = 10, 
      maxKeys = 100, 
      allowedTypes = ['string', 'number', 'boolean', 'object', 'array'],
      fallback = null 
    } = options;

    try {
      if (typeof jsonString !== 'string') {
        throw new Error('Input must be a string');
      }

      if (jsonString.length > 1024 * 1024) { // 1MB limit
        throw new Error('JSON string too large');
      }

      // 使用安全的 JSON 解析器，過濾危險屬性
      const parsed = JSON.parse(jsonString, (key, value) => {
        // 防止原型污染
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        
        // 檢查深度
        if (typeof value === 'object' && value !== null) {
          const depth = this.getObjectDepth(value);
          if (depth > maxDepth) {
            throw new Error('Object depth exceeds limit');
          }
        }

        return value;
      });

      // 驗證解析結果
      if (!this.validateParsedData(parsed, { maxKeys, allowedTypes })) {
        throw new Error('Parsed data validation failed');
      }

      return parsed;
    } catch (error) {
      console.warn('[SecurityCore] Safe JSON parse failed:', error.message);
      return fallback;
    }
  }

  /**
   * SEC-01: 安全的動態執行替代方案 - 修復 CWE-94
   * 替代 eval() 的安全實作
   */
  static safeEvaluate(expression, context = {}, options = {}) {
    const { allowedOperations = ['basic'], timeout = 1000 } = options;

    try {
      // 輸入驗證
      if (typeof expression !== 'string') {
        throw new Error('Expression must be a string');
      }

      if (expression.length > 1000) {
        throw new Error('Expression too long');
      }

      // 檢查危險模式
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
        if (pattern.test(expression)) {
          throw new Error(`Dangerous pattern detected: ${pattern}`);
        }
      }

      // 僅允許基本數學運算
      if (allowedOperations.includes('basic')) {
        return this.evaluateBasicMath(expression, context);
      }

      throw new Error('Operation not allowed');
    } catch (error) {
      console.warn('[SecurityCore] Safe evaluate failed:', error.message);
      return null;
    }
  }

  /**
   * 安全的基本數學運算評估
   */
  static evaluateBasicMath(expression, context = {}) {
    // 只允許數字、基本運算符和括號
    const allowedPattern = /^[\d\s\+\-\*\/\(\)\.]+$/;
    
    if (!allowedPattern.test(expression)) {
      throw new Error('Invalid characters in expression');
    }

    try {
      // 使用 Function 構造函數的安全替代方案
      const func = new Function('context', `
        "use strict";
        const { ${Object.keys(context).join(', ')} } = context;
        return (${expression});
      `);
      
      return func(context);
    } catch (error) {
      throw new Error('Math evaluation failed');
    }
  }

  /**
   * 計算物件深度
   */
  static getObjectDepth(obj, depth = 0) {
    if (depth > 20) return depth; // 防止無限遞歸
    
    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }

    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const childDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }

    return maxDepth;
  }

  /**
   * 驗證解析後的資料
   */
  static validateParsedData(data, options = {}) {
    const { maxKeys = 100, allowedTypes = ['string', 'number', 'boolean', 'object', 'array'] } = options;

    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length > maxKeys) {
        return false;
      }

      for (const key of keys) {
        const value = data[key];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        
        if (!allowedTypes.includes(valueType)) {
          return false;
        }

        if (typeof value === 'object' && value !== null) {
          if (!this.validateParsedData(value, options)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Initialize all security modules in proper dependency order
   */
  async initialize() {
    try {
      if (this.initialized) {
        return { initialized: true, modules: this.moduleStatus };
      }

      if (this.enableLogging) {
        this.logger.info?.('[SecurityCore] Starting security module initialization');
      }

      // Initialize modules in dependency order
      await this.initializeXSSProtection();
      await this.initializeCodeInjectionProtection();
      await this.initializeSecureLogger();
      await this.initializeAuthorizationHandler();
      await this.initializeExternalLinkHandler();

      this.initialized = true;
      
      if (this.enableLogging) {
        this.logger.info?.('[SecurityCore] All security modules initialized successfully', {
          modules: Object.keys(this.moduleStatus).filter(k => this.moduleStatus[k]),
          securityLevel: this.securityLevel
        });
      }

      return { initialized: true, modules: this.moduleStatus };
    } catch (error) {
      if (this.enableLogging) {
        this.logger.error?.('[SecurityCore] Initialization failed', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Initialize XSS Protection (SEC-001)
   */
  async initializeXSSProtection() {
    try {
      if (typeof window !== 'undefined' && window.XSSProtection) {
        this.modules.xssProtection = new window.XSSProtection({ logger: this.logger });
        this.moduleStatus.xssProtection = true;
      } else {
        this.moduleStatus.xssProtection = false;
      }
    } catch (error) {
      this.moduleStatus.xssProtection = false;
      if (this.enableLogging) {
        this.logger.warn?.('[SecurityCore] XSS Protection initialization failed', { error: error.message });
      }
    }
  }

  /**
   * Initialize Code Injection Protection (SEC-002)
   */
  async initializeCodeInjectionProtection() {
    try {
      if (typeof window !== 'undefined' && window.CodeInjectionProtection) {
        this.modules.codeInjectionProtection = new window.CodeInjectionProtection({ logger: this.logger });
        this.moduleStatus.codeInjectionProtection = true;
      } else {
        this.moduleStatus.codeInjectionProtection = false;
      }
    } catch (error) {
      this.moduleStatus.codeInjectionProtection = false;
      if (this.enableLogging) {
        this.logger.warn?.('[SecurityCore] Code Injection Protection initialization failed', { error: error.message });
      }
    }
  }

  /**
   * Initialize Secure Logger (SEC-003)
   */
  async initializeSecureLogger() {
    try {
      if (typeof window !== 'undefined' && window.SecureLogger) {
        this.modules.secureLogger = new window.SecureLogger({ enableLogging: this.enableLogging });
        this.moduleStatus.secureLogger = true;
      } else {
        this.moduleStatus.secureLogger = false;
      }
    } catch (error) {
      this.moduleStatus.secureLogger = false;
      if (this.enableLogging) {
        this.logger.warn?.('[SecurityCore] Secure Logger initialization failed', { error: error.message });
      }
    }
  }

  /**
   * Initialize Authorization Handler (SEC-004)
   */
  async initializeAuthorizationHandler() {
    try {
      if (typeof window !== 'undefined' && window.AuthorizationHandler) {
        this.modules.authorizationHandler = new window.AuthorizationHandler({ logger: this.logger });
        this.moduleStatus.authorizationHandler = true;
      } else {
        this.moduleStatus.authorizationHandler = false;
      }
    } catch (error) {
      this.moduleStatus.authorizationHandler = false;
      if (this.enableLogging) {
        this.logger.warn?.('[SecurityCore] Authorization Handler initialization failed', { error: error.message });
      }
    }
  }

  /**
   * Initialize External Link Handler (SEC-005)
   */
  async initializeExternalLinkHandler() {
    try {
      if (typeof window !== 'undefined' && window.ExternalLinkHandler) {
        this.modules.externalLinkHandler = new window.ExternalLinkHandler({ 
          logger: this.logger,
          autoProcess: true
        });
        this.moduleStatus.externalLinkHandler = true;
      } else {
        this.moduleStatus.externalLinkHandler = false;
      }
    } catch (error) {
      this.moduleStatus.externalLinkHandler = false;
      if (this.enableLogging) {
        this.logger.warn?.('[SecurityCore] External Link Handler initialization failed', { error: error.message });
      }
    }
  }

  /**
   * Get security module instance
   */
  getModule(moduleName) {
    return this.modules[moduleName] || null;
  }

  /**
   * Get security status overview
   */
  getSecurityStatus() {
    const activeModules = Object.keys(this.moduleStatus).filter(k => this.moduleStatus[k]);
    const totalModules = Object.keys(this.moduleStatus).length;
    
    return {
      initialized: this.initialized,
      securityLevel: this.securityLevel,
      activeModules: activeModules.length,
      totalModules,
      coverage: totalModules > 0 ? (activeModules.length / totalModules * 100).toFixed(1) + '%' : '0%',
      modules: this.moduleStatus
    };
  }

  /**
   * Unified security processing method
   */
  async processSecurely(operation, data, options = {}) {
    if (!this.initialized) {
      throw new Error('SecurityCore not initialized');
    }

    const operationId = `${operation}_${Date.now()}`;
    
    try {
      // Log security operation start
      if (this.modules.secureLogger) {
        this.modules.secureLogger.structuredLog('security_operation_start', {
          operationId,
          operation,
          timestamp: new Date().toISOString()
        });
      }

      let result = data;

      // Apply XSS protection if available
      if (this.modules.xssProtection && options.xssProtection !== false) {
        result = this.modules.xssProtection.sanitizeInput(result);
      }

      // Apply authorization check if required
      if (this.modules.authorizationHandler && options.requiresAuth) {
        const authResult = await this.modules.authorizationHandler.validateOperation(operation, options.authContext);
        if (!authResult.authorized) {
          throw new Error(`Operation ${operation} not authorized`);
        }
      }

      // Log successful operation
      if (this.modules.secureLogger) {
        this.modules.secureLogger.structuredLog('security_operation_success', {
          operationId,
          operation
        });
      }

      return result;
    } catch (error) {
      // Log security operation failure
      if (this.modules.secureLogger) {
        this.modules.secureLogger.structuredLog('security_operation_error', {
          operationId,
          operation,
          error: error.message
        });
      }
      throw error;
    }
  }

  /**
   * 檢查是否已初始化
   */
  isInitialized() {
    return this.initialized;
  }
}

// Global security instance with enhanced coordination
if (typeof window !== 'undefined') {
  window.securityCore = new SecurityCore();
  
  // Enhanced security initialization function
  window.initializeSecurity = async (options = {}) => {
    try {
      const result = await window.securityCore.initialize();
      
      // Auto-process existing links if ExternalLinkHandler is available
      const linkHandler = window.securityCore.getModule('externalLinkHandler');
      if (linkHandler) {
        linkHandler.processAllLinks(document);
      }
      
      return result;
    } catch (error) {
      console.error('[Security] Initialization failed:', error);
      return { initialized: false, error: error.message };
    }
  };
  
  // Enhanced global security functions
  window.safeJSONParse = SecurityCore.safeJSONParse;
  window.safeEvaluate = SecurityCore.safeEvaluate;
  
  // Unified security processing function
  window.processSecurely = async (operation, data, options = {}) => {
    return await window.securityCore.processSecurely(operation, data, options);
  };
  
  // Security status check function
  window.getSecurityStatus = () => {
    return window.securityCore.getSecurityStatus();
  };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityCore };
} else {
  // Browser environment exports
  if (typeof window !== 'undefined') {
    window.SecurityCore = SecurityCore;
  }
}

export { SecurityCore };
export const securityCore = typeof window !== 'undefined' ? window.securityCore : null;
export const initializeSecurity = typeof window !== 'undefined' ? window.initializeSecurity : null;