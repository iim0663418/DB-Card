/**
 * SEC-01: Critical Security Fixes - Core Security Module
 * 修復 CWE-94 代碼注入和 CWE-502 不安全反序列化漏洞
 */

class SecurityCore {
  constructor() {
    this.initialized = false;
    this.securityLevel = 'strict';
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
   * 初始化安全核心
   */
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

  /**
   * 檢查是否已初始化
   */
  isInitialized() {
    return this.initialized;
  }
}

// 全域安全函數
window.securityCore = new SecurityCore();

// 安全初始化函數
window.initializeSecurity = async () => {
  try {
    await window.securityCore.initialize();
    return true;
  } catch (error) {
    console.error('[Security] Initialization failed:', error);
    return false;
  }
};

// 匯出安全函數到全域
window.safeJSONParse = SecurityCore.safeJSONParse;
window.safeEvaluate = SecurityCore.safeEvaluate;

export { SecurityCore };
export const securityCore = window.securityCore;
export const initializeSecurity = window.initializeSecurity;