/**
 * Input Sanitizer - ES6 模組化安全輸入處理
 * 基於測試驗證的安全邏輯，防護 XSS 和代碼注入攻擊
 * 
 * @module InputSanitizer
 * @version 3.2.0
 */

/**
 * 清理 HTML 內容，移除危險模式
 * @param {string} input - 待清理的輸入
 * @returns {string} 清理後的安全內容
 */
export function sanitizeHtml(input) {
  if (!input || typeof input !== 'string') return '';
  
  // 先移除危險模式，再進行編碼
  let sanitized = input
    .replace(/on\w+\s*=/gi, '')        // 移除事件處理器
    .replace(/eval\s*\(/gi, '')         // 移除 eval 調用
    .replace(/function\s*\(/gi, '')     // 移除 Function 構造器
    .replace(/settimeout\s*\(/gi, '')   // 移除 setTimeout
    .replace(/setinterval\s*\(/gi, '')  // 移除 setInterval
    .replace(/import\s*\(/gi, '')       // 移除動態導入
    .replace(/require\s*\(/gi, '')      // 移除 require 調用
    .replace(/\$\{[^}]*\}/gi, '')       // 移除模板字面量
    .replace(/\{\{[^}]*\}\}/gi, '')     // 移除模板表達式
    .replace(/#\{[^}]*\}/gi, '')       // 移除 hash 表達式
    .replace(/<%=.*?%>/gi, '')         // 移除 ERB 表達式
    .replace(/javascript:/gi, '')       // 移除 javascript: URLs
    .replace(/globalthis/gi, '')        // 移除 globalThis
    .replace(/import\.meta/gi, '');     // 移除 import.meta
  
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
 * 驗證並清理 URL
 * @param {string} url - 待驗證的 URL
 * @returns {string} 安全的 URL 或 '#'
 */
export function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '#';
    }
    return parsed.toString();
  } catch {
    return '#';
  }
}

/**
 * 清理檔案名稱，防止路徑遍歷
 * @param {string} filename - 檔案名稱
 * @returns {string} 安全的檔案名稱
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return '';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * 輸入驗證與清理
 * @param {string} input - 輸入內容
 * @param {number} maxLength - 最大長度
 * @returns {Object} 驗證結果
 */
export function validateInput(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') {
    return { valid: false, sanitized: '' };
  }
  
  if (input.length > maxLength) {
    return { valid: false, sanitized: '' };
  }
  
  const sanitized = sanitizeHtml(input).trim();
  return { valid: true, sanitized };
}