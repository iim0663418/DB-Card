/**
 * Storage Secure - ES6 Module
 * Secure storage operations with encryption and integrity checks
 * 
 * Security Features:
 * - Client-side encryption for sensitive data
 * - Storage quota management
 * - Data integrity verification
 * - Secure key management
 */

// Storage configuration
const STORAGE_CONFIG = {
  maxStorageSize: 50 * 1024 * 1024, // 50MB
  encryptionKeyLength: 32,
  ivLength: 16,
  maxRetries: 3,
  compressionThreshold: 1024, // Compress data larger than 1KB
  storagePrefix: 'pwa_secure_'
};

// Storage types
const STORAGE_TYPES = {
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage',
  INDEXED_DB: 'indexedDB'
};

/**
 * Generate secure encryption key
 */
async function generateEncryptionKey() {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
async function encryptData(data, key) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  
  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(STORAGE_CONFIG.ivLength));
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return {
    data: Array.from(combined),
    timestamp: Date.now(),
    version: '1.0'
  };
}

/**
 * Decrypt data using AES-GCM
 */
async function decryptData(encryptedObj, key) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const combined = new Uint8Array(encryptedObj.data);
  const iv = combined.slice(0, STORAGE_CONFIG.ivLength);
  const encrypted = combined.slice(STORAGE_CONFIG.ivLength);
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decrypted);
  
  return JSON.parse(jsonString);
}

/**
 * Calculate data hash for integrity verification
 */
async function calculateHash(data) {
  if (!window.crypto || !window.crypto.subtle) {
    // Fallback to simple checksum
    return btoa(JSON.stringify(data)).slice(0, 16);
  }
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Compress data if it exceeds threshold
 */
function compressData(data) {
  const jsonString = JSON.stringify(data);
  
  if (jsonString.length < STORAGE_CONFIG.compressionThreshold) {
    return { compressed: false, data: jsonString };
  }
  
  // Simple compression using built-in methods
  try {
    const compressed = btoa(jsonString);
    return {
      compressed: true,
      data: compressed,
      originalSize: jsonString.length,
      compressedSize: compressed.length
    };
  } catch (error) {
    return { compressed: false, data: jsonString };
  }
}

/**
 * Decompress data if needed
 */
function decompressData(compressedObj) {
  if (!compressedObj.compressed) {
    return compressedObj.data;
  }
  
  try {
    return atob(compressedObj.data);
  } catch (error) {
    throw new Error('Failed to decompress data');
  }
}

/**
 * Secure storage class
 */
class SecureStorage {
  constructor(storageType = STORAGE_TYPES.LOCAL) {
    this.storageType = storageType;
    this.storage = this.getStorageInterface(storageType);
    this.encryptionKey = null;
  }
  
  /**
   * Get storage interface based on type
   */
  getStorageInterface(type) {
    switch (type) {
      case STORAGE_TYPES.LOCAL:
        return window.localStorage;
      case STORAGE_TYPES.SESSION:
        return window.sessionStorage;
      case STORAGE_TYPES.INDEXED_DB:
        // For now, fallback to localStorage for IndexedDB
        // TODO: Implement IndexedDB interface
        return window.localStorage;
      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }
  }
  
  /**
   * Initialize encryption key
   */
  async initializeEncryption() {
    if (!this.encryptionKey) {
      this.encryptionKey = await generateEncryptionKey();
    }
  }
  
  /**
   * Store data securely
   */
  async setItem(key, value, options = {}) {
    const { encrypt = false, compress = true } = options;
    
    try {
      let processedData = value;
      let metadata = {
        timestamp: Date.now(),
        encrypted: encrypt,
        compressed: false,
        hash: await calculateHash(value)
      };
      
      // Compress if enabled and data is large enough
      if (compress) {
        const compressed = compressData(value);
        processedData = compressed.data;
        metadata.compressed = compressed.compressed;
        if (compressed.compressed) {
          metadata.originalSize = compressed.originalSize;
          metadata.compressedSize = compressed.compressedSize;
        }
      }
      
      // Encrypt if requested
      if (encrypt) {
        await this.initializeEncryption();
        const encrypted = await encryptData(processedData, this.encryptionKey);
        processedData = encrypted;
      }
      
      const storageObject = {
        data: processedData,
        metadata
      };
      
      const storageKey = STORAGE_CONFIG.storagePrefix + key;
      this.storage.setItem(storageKey, JSON.stringify(storageObject));
      
      return { success: true, size: JSON.stringify(storageObject).length };
    } catch (error) {
      console.error('[StorageSecure] Failed to store data:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Retrieve data securely
   */
  async getItem(key, options = {}) {
    const { verifyIntegrity = true } = options;
    
    try {
      const storageKey = STORAGE_CONFIG.storagePrefix + key;
      const stored = this.storage.getItem(storageKey);
      
      if (!stored) {
        return { success: false, error: 'Item not found' };
      }
      
      const storageObject = JSON.parse(stored);
      let data = storageObject.data;
      const metadata = storageObject.metadata;
      
      // Decrypt if encrypted
      if (metadata.encrypted) {
        await this.initializeEncryption();
        data = await decryptData(data, this.encryptionKey);
      }
      
      // Decompress if compressed
      if (metadata.compressed) {
        data = decompressData({ compressed: true, data });
        data = JSON.parse(data);
      } else if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      
      // Verify integrity if requested
      if (verifyIntegrity && metadata.hash) {
        const currentHash = await calculateHash(data);
        if (currentHash !== metadata.hash) {
          return { success: false, error: 'Data integrity check failed' };
        }
      }
      
      return { success: true, data, metadata };
    } catch (error) {
      console.error('[StorageSecure] Failed to retrieve data:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Remove item from storage
   */
  removeItem(key) {
    try {
      const storageKey = STORAGE_CONFIG.storagePrefix + key;
      this.storage.removeItem(storageKey);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * List all stored keys
   */
  listKeys() {
    const keys = [];
    const prefix = STORAGE_CONFIG.storagePrefix;
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }
    
    return keys;
  }
  
  /**
   * Get storage usage statistics
   */
  getStorageStats() {
    let totalSize = 0;
    let itemCount = 0;
    const prefix = STORAGE_CONFIG.storagePrefix;
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = this.storage.getItem(key);
        if (value) {
          totalSize += value.length;
          itemCount++;
        }
      }
    }
    
    return {
      itemCount,
      totalSize,
      maxSize: STORAGE_CONFIG.maxStorageSize,
      usagePercentage: (totalSize / STORAGE_CONFIG.maxStorageSize) * 100
    };
  }
  
  /**
   * Clear all secure storage
   */
  clear() {
    const keys = this.listKeys();
    keys.forEach(key => this.removeItem(key));
    return { success: true, clearedItems: keys.length };
  }
}

/**
 * Create secure storage instance
 */
export function createSecureStorage(type = STORAGE_TYPES.LOCAL) {
  return new SecureStorage(type);
}

/**
 * Quick storage operations (convenience functions)
 */
const defaultStorage = new SecureStorage();

export async function secureSet(key, value, options = {}) {
  return await defaultStorage.setItem(key, value, options);
}

export async function secureGet(key, options = {}) {
  return await defaultStorage.getItem(key, options);
}

export function secureRemove(key) {
  return defaultStorage.removeItem(key);
}

export function secureList() {
  return defaultStorage.listKeys();
}

export function getStorageStats() {
  return defaultStorage.getStorageStats();
}

/**
 * Storage quota check
 */
export function checkStorageQuota() {
  const stats = getStorageStats();
  
  return {
    available: stats.usagePercentage < 90,
    usage: stats.usagePercentage,
    warning: stats.usagePercentage > 75,
    critical: stats.usagePercentage > 90
  };
}

/**
 * Cleanup old data based on timestamp
 */
export async function cleanupOldData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
  const keys = secureList();
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const key of keys) {
    try {
      const result = await secureGet(key, { verifyIntegrity: false });
      if (result.success && result.metadata) {
        const age = now - result.metadata.timestamp;
        if (age > maxAge) {
          secureRemove(key);
          cleanedCount++;
        }
      }
    } catch (error) {
      // Remove corrupted entries
      secureRemove(key);
      cleanedCount++;
    }
  }
  
  return { cleanedCount };
}

// Export storage types and configuration
export { STORAGE_TYPES, STORAGE_CONFIG };