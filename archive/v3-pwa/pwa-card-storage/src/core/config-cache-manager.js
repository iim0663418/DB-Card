/**
 * Configuration Cache Manager
 * 
 * Manages caching of configuration data with TTL, storage quotas,
 * and intelligent cache invalidation strategies.
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

// Import SecureLogger for CWE-117 protection
import { SecureLogger } from '../security/secure-logger.js';

class ConfigCacheManager {
    constructor() {
        this.cache = new Map();
        this.metadata = new Map();
        this.defaultTTL = 30 * 60 * 1000; // 30 minutes
        this.maxCacheSize = 50; // Maximum number of cached items
        this.storageKey = 'pwa-config-cache';
        this.secureLogger = new SecureLogger({ logLevel: 'INFO', enableMasking: true });
        
        // Initialize persistent storage if available
        this.initializePersistentStorage();
    }

    /**
     * Initialize persistent storage
     */
    initializePersistentStorage() {
        this.persistentStorage = null;
        
        if (typeof window !== 'undefined' && window.localStorage) {
            this.persistentStorage = {
                get: (key) => {
                    try {
                        const item = localStorage.getItem(key);
                        return item ? JSON.parse(item) : null;
                    } catch (error) {
                        this.secureLogger.warn('Failed to read from localStorage', { 
                            error: error.message, 
                            component: 'ConfigCacheManager' 
                        });
                        return null;
                    }
                },
                set: (key, value) => {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch (error) {
                        this.secureLogger.warn('Failed to write to localStorage', { 
                            error: error.message, 
                            component: 'ConfigCacheManager' 
                        });
                        return false;
                    }
                },
                remove: (key) => {
                    try {
                        localStorage.removeItem(key);
                        return true;
                    } catch (error) {
                        this.secureLogger.warn('Failed to remove from localStorage', { 
                            error: error.message, 
                            component: 'ConfigCacheManager' 
                        });
                        return false;
                    }
                }
            };
            
            // Load existing cache from persistent storage
            this.loadFromPersistentStorage();
        }
    }

    /**
     * Get cached item
     */
    get(key) {
        const item = this.cache.get(key);
        const meta = this.metadata.get(key);
        
        if (!item || !meta) {
            return null;
        }
        
        // Check if expired
        if (Date.now() > meta.expiry) {
            this.delete(key);
            return null;
        }
        
        // Update access time
        meta.lastAccess = Date.now();
        meta.accessCount++;
        
        return item;
    }

    /**
     * Set cached item
     */
    set(key, value, ttl = null) {
        const actualTTL = ttl || this.defaultTTL;
        const expiry = Date.now() + actualTTL;
        
        // Enforce cache size limit
        if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
            this.evictLeastRecentlyUsed();
        }
        
        // Store item and metadata
        this.cache.set(key, value);
        this.metadata.set(key, {
            expiry,
            created: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1,
            size: this.calculateSize(value)
        });
        
        // Persist to storage if available
        this.saveToPersistentStorage();
        
        return true;
    }

    /**
     * Delete cached item
     */
    delete(key) {
        const deleted = this.cache.delete(key) && this.metadata.delete(key);
        
        if (deleted) {
            this.saveToPersistentStorage();
        }
        
        return deleted;
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        const meta = this.metadata.get(key);
        
        if (!meta) {
            return false;
        }
        
        if (Date.now() > meta.expiry) {
            this.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * Clear all cached items
     */
    clear() {
        this.cache.clear();
        this.metadata.clear();
        
        if (this.persistentStorage) {
            this.persistentStorage.remove(this.storageKey);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let totalSize = 0;
        let expiredCount = 0;
        
        for (const [key, meta] of this.metadata.entries()) {
            totalSize += meta.size;
            if (now > meta.expiry) {
                expiredCount++;
            }
        }
        
        return {
            totalItems: this.cache.size,
            totalSize,
            expiredItems: expiredCount,
            hitRate: this.calculateHitRate(),
            oldestItem: this.getOldestItemAge(),
            newestItem: this.getNewestItemAge()
        };
    }

    /**
     * Cleanup expired items
     */
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, meta] of this.metadata.entries()) {
            if (now > meta.expiry) {
                expiredKeys.push(key);
            }
        }
        
        for (const key of expiredKeys) {
            this.delete(key);
        }
        
        return expiredKeys.length;
    }

    /**
     * Evict least recently used item
     */
    evictLeastRecentlyUsed() {
        let lruKey = null;
        let lruTime = Date.now();
        
        for (const [key, meta] of this.metadata.entries()) {
            if (meta.lastAccess < lruTime) {
                lruTime = meta.lastAccess;
                lruKey = key;
            }
        }
        
        if (lruKey) {
            this.delete(lruKey);
            this.secureLogger.info('Evicted LRU cache item', { 
                evictedKey: lruKey, 
                component: 'ConfigCacheManager' 
            });
        }
    }

    /**
     * Calculate approximate size of value
     */
    calculateSize(value) {
        try {
            return JSON.stringify(value).length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Calculate cache hit rate
     */
    calculateHitRate() {
        let totalAccess = 0;
        
        for (const meta of this.metadata.values()) {
            totalAccess += meta.accessCount;
        }
        
        return totalAccess > 0 ? (this.cache.size / totalAccess) * 100 : 0;
    }

    /**
     * Get oldest item age in milliseconds
     */
    getOldestItemAge() {
        let oldest = Date.now();
        
        for (const meta of this.metadata.values()) {
            if (meta.created < oldest) {
                oldest = meta.created;
            }
        }
        
        return Date.now() - oldest;
    }

    /**
     * Get newest item age in milliseconds
     */
    getNewestItemAge() {
        let newest = 0;
        
        for (const meta of this.metadata.values()) {
            if (meta.created > newest) {
                newest = meta.created;
            }
        }
        
        return newest > 0 ? Date.now() - newest : 0;
    }

    /**
     * Load cache from persistent storage
     */
    loadFromPersistentStorage() {
        if (!this.persistentStorage) return;
        
        try {
            const stored = this.persistentStorage.get(this.storageKey);
            if (!stored) return;
            
            const { cache, metadata } = stored;
            const now = Date.now();
            
            // Restore non-expired items
            for (const [key, value] of Object.entries(cache)) {
                const meta = metadata[key];
                if (meta && now <= meta.expiry) {
                    this.cache.set(key, value);
                    this.metadata.set(key, meta);
                }
            }
            
            this.secureLogger.info('Loaded items from persistent cache', { 
                itemCount: this.cache.size, 
                component: 'ConfigCacheManager' 
            });
            
        } catch (error) {
            this.secureLogger.warn('Failed to load cache from persistent storage', { 
                error: error.message, 
                component: 'ConfigCacheManager' 
            });
        }
    }

    /**
     * Save cache to persistent storage
     */
    saveToPersistentStorage() {
        if (!this.persistentStorage) return;
        
        try {
            const cache = {};
            const metadata = {};
            
            // Convert Maps to objects for serialization
            for (const [key, value] of this.cache.entries()) {
                cache[key] = value;
                metadata[key] = this.metadata.get(key);
            }
            
            this.persistentStorage.set(this.storageKey, { cache, metadata });
            
        } catch (error) {
            this.secureLogger.warn('Failed to save cache to persistent storage', { 
                error: error.message, 
                component: 'ConfigCacheManager' 
            });
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigCacheManager;
} else if (typeof window !== 'undefined') {
    window.ConfigCacheManager = ConfigCacheManager;
}