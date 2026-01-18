/**
 * Data Validator - ES6 模組化數據驗證
 * 基於測試驗證的驗證邏輯，確保數據完整性和安全性
 * 
 * @module DataValidator
 * @version 3.2.0
 */

import { sanitizeHtml } from './input-sanitizer.js';

/**
 * 驗證名片數據結構
 * @param {Object} data - 名片數據
 * @returns {Object} 驗證結果
 */
export function validateCardData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { valid: false, errors };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('姓名為必填欄位');
  }
  
  // 檢查姓名中的危險內容
  if (data.name && (data.name.includes('<script') || data.name.includes('javascript:') || data.name.includes('eval('))) {
    errors.push('姓名包含不安全內容');
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('電子郵件格式不正確');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('電話號碼格式不正確');
  }

  if (data.name && data.name.length > 100) {
    errors.push('姓名長度不能超過100字符');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 驗證電子郵件格式
 * @param {string} email - 電子郵件
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254 && email.length >= 5;
}

/**
 * 驗證電話號碼格式
 * @param {string} phone - 電話號碼
 * @returns {boolean} 是否有效
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

/**
 * 清理輸入數據
 * @param {string} input - 輸入內容
 * @param {number} maxLength - 最大長度
 * @returns {string} 清理後的內容
 */
export function sanitizeInput(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';
  return sanitizeHtml(input.substring(0, maxLength));
}