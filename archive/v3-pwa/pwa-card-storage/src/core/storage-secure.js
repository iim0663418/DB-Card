/**
 * Storage Secure - ES6 模組化安全存儲
 * 基於測試驗證的存儲邏輯，確保數據安全性和完整性
 * 
 * @module StorageSecure
 * @version 3.2.0
 */

import { sanitizeFilename } from './input-sanitizer.js';

/**
 * 安全存儲類
 */
export class StorageSecure {
  constructor() {
    this.storage = new Map();
    this.maxSize = 5 * 1024 * 1024; // 5MB 限制
  }

  /**
   * 安全設置項目
   * @param {string} key - 存儲鍵
   * @param {*} value - 存儲值
   * @returns {boolean} 是否成功
   */
  setItem(key, value) {
    try {
      const sanitizedKey = sanitizeFilename(key);
      if (!sanitizedKey) return false;

      const serialized = JSON.stringify(value);
      if (serialized.length > this.maxSize) {
        throw new Error('Data too large');
      }

      this.storage.set(sanitizedKey, serialized);
      return true;
    } catch (error) {
      console.error('Storage error:', error.message);
      return false;
    }
  }

  /**
   * 安全獲取項目
   * @param {string} key - 存儲鍵
   * @returns {*} 存儲值或 null
   */
  getItem(key) {
    try {
      const sanitizedKey = sanitizeFilename(key);
      const stored = this.storage.get(sanitizedKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Storage read error:', error.message);
      return null;
    }
  }

  /**
   * 安全移除項目
   * @param {string} key - 存儲鍵
   * @returns {boolean} 是否成功
   */
  removeItem(key) {
    try {
      const sanitizedKey = sanitizeFilename(key);
      this.storage.delete(sanitizedKey);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error.message);
      return false;
    }
  }

  /**
   * 清空存儲
   */
  clear() {
    this.storage.clear();
  }

  /**
   * 獲取存儲大小
   * @returns {number} 項目數量
   */
  size() {
    return this.storage.size;
  }
}

// 創建默認實例
export const secureStorage = new StorageSecure();