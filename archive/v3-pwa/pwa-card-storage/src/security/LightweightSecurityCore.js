/**
 * Lightweight Security Core - 靜態托管適配的輕量級安全核心
 * 替代複雜安全架構，專注客戶端安全最佳實踐
 * 
 * ⚠️ DEPRECATION WARNING: This file is deprecated in favor of ES6 modules.
 * Please migrate to: import { initializeSecurity } from './security-core.js'
 * 
 * Migration guide available at: ./migration-helper.js
 */
class LightweightSecurityCore {
  static #instance = null;
  static #config = {
    csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;",
    maxInputLength: 1000,
    rateLimit: { operations: 100, window: 60000 }
  };

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new LightweightSecurityCore();
    }
    return this.#instance;
  }

  constructor() {
    if (LightweightSecurityCore.#instance) {
      return LightweightSecurityCore.#instance;
    }
    this.init();
  }

  init() {
    this.setupCSP();
    this.setupRateLimit();
    console.log('[LightweightSecurity] Initialized');
  }

  /**
   * 設置 CSP 策略
   */
  setupCSP() {
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = LightweightSecurityCore.#config.csp;
      document.head.appendChild(meta);
    }
  }

  /**
   * 輸入驗證與清理 - 基於測試驗證的增強版本
   */
  static validateInput(input, maxLength = this.#config.maxInputLength) {
    if (!input || typeof input !== 'string') return { valid: false, sanitized: '' };
    
    if (input.length > maxLength) return { valid: false, sanitized: '' };
    
    // 增強 XSS 防護 - 基於測試成果
    let sanitized = input
      .replace(/on\w+\s*=/gi, '')        // 移除事件處理器
      .replace(/eval\s*\(/gi, '')         // 移除 eval 調用
      .replace(/function\s*\(/gi, '')     // 移除 Function 構造器
      .replace(/settimeout\s*\(/gi, '')   // 移除 setTimeout
      .replace(/setinterval\s*\(/gi, '')  // 移除 setInterval
      .replace(/import\s*\(/gi, '')       // 移除動態導入
      .replace(/require\s*\(/gi, '')      // 移除 require
      .replace(/\$\{[^}]*\}/gi, '')       // 移除模板字面量
      .replace(/\{\{[^}]*\}\}/gi, '')     // 移除模板表達式
      .replace(/javascript:/gi, '')       // 移除 javascript: URL
      .replace(/globalthis/gi, '')        // 移除 globalThis
      .trim();
    
    return { valid: true, sanitized };
  }

  /**
   * 輸出編碼 - 基於測試驗證的增強版本
   */
  static escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    
    // 先移除危險模式，再進行編碼
    let sanitized = String(str)
      .replace(/on\w+\s*=/gi, '')        // 移除事件處理器
      .replace(/eval\s*\(/gi, '')         // 移除 eval
      .replace(/javascript:/gi, '')       // 移除 JS URL
      .replace(/\$\{[^}]*\}/gi, '');      // 移除模板注入
    
    // HTML 編碼
    return sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * 簡單速率限制
   */
  setupRateLimit() {
    this.rateLimitData = new Map();
  }

  checkRateLimit(operation = 'default') {
    const now = Date.now();
    const key = `rate_${operation}`;
    const data = this.rateLimitData.get(key) || { count: 0, window: now };
    
    if (now - data.window > LightweightSecurityCore.#config.rateLimit.window) {
      data.count = 1;
      data.window = now;
    } else {
      data.count++;
    }
    
    this.rateLimitData.set(key, data);
    return data.count <= LightweightSecurityCore.#config.rateLimit.operations;
  }

  /**
   * 安全日誌 - 防止日誌注入攻擊
   */
  static log(level, message, details = {}) {
    // 清理日誌內容防止注入
    const cleanMessage = String(message)
      .replace(/[\n\r\t]/g, '_')          // 移除換行符
      .replace(/[\x00-\x1f\x7f]/g, '')   // 移除控制字符
      .replace(/\u001b\[[0-9;]*m/g, '')  // 移除 ANSI 轉義序列
      .substring(0, 500);                // 限制長度
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.escapeHtml(cleanMessage),
      source: 'LightweightSecurity'
    };
    
    if (level === 'error') {
      console.error('[Security]', entry);
    } else {
      console.log('[Security]', entry);
    }
  }
}

// 全域可用 (DEPRECATED)
if (!window.LightweightSecurityCore) {
  window.LightweightSecurityCore = LightweightSecurityCore;
}

// 自動初始化 (DEPRECATED)
document.addEventListener('DOMContentLoaded', () => {
  LightweightSecurityCore.getInstance();
});