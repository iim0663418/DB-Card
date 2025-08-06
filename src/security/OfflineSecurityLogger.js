/**
 * PWA-16: Offline Security Monitoring
 * Client-side security event logging with secure local storage
 */
class OfflineSecurityLogger {
    static #instance = null;
    static #logQueue = [];
    static #storage = null;
    static #config = {
        maxLogSize: 1000,
        syncInterval: 5 * 60 * 1000, // 5 minutes
        retentionDays: 7,
        piiFields: ['email', 'phone', 'mobile', 'address', 'name']
    };

    static getInstance() {
        if (!this.#instance) {
            this.#instance = new OfflineSecurityLogger();
        }
        return this.#instance;
    }

    constructor() {
        if (OfflineSecurityLogger.#instance) {
            return OfflineSecurityLogger.#instance;
        }
        this.initStorage();
    }

    async initStorage() {
        try {
            const request = indexedDB.open('SecurityLogs', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('logs')) {
                    const store = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('level', 'level', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                OfflineSecurityLogger.#storage = event.target.result;
                this.processQueuedLogs();
            };

            request.onerror = () => {
                console.warn('[OfflineSecurityLogger] IndexedDB unavailable, using memory storage');
            };
        } catch (error) {
            console.warn('[OfflineSecurityLogger] Storage init failed:', error.message);
        }
    }

    /**
     * Log security event with PII protection
     */
    static async logSecurityEvent(level, message, data = {}) {
        const logEntry = {
            timestamp: Date.now(),
            level: this.#sanitizeLevel(level),
            message: this.#sanitizeMessage(message),
            data: this.#scrubPII(data),
            integrity: null
        };

        // Add integrity hash
        logEntry.integrity = await this.#generateIntegrity(logEntry);

        if (this.#storage) {
            await this.#storeLog(logEntry);
        } else {
            this.#queueLog(logEntry);
        }

        // Trigger cleanup if needed
        if (Math.random() < 0.1) { // 10% chance
            this.#cleanupOldLogs();
        }
    }

    /**
     * Get security logs with integrity verification
     */
    static async getSecurityLogs(options = {}) {
        const {
            level = null,
            since = Date.now() - 24 * 60 * 60 * 1000, // Last 24h
            limit = 100
        } = options;

        if (!this.#storage) {
            return this.#logQueue.filter(log => log.timestamp >= since).slice(0, limit);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.#storage.transaction(['logs'], 'readonly');
            const store = transaction.objectStore('logs');
            const index = store.index('timestamp');
            const range = IDBKeyRange.lowerBound(since);
            const request = index.openCursor(range);
            
            const logs = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && logs.length < limit) {
                    const log = cursor.value;
                    
                    // Verify integrity
                    if (this.#verifyIntegrity(log)) {
                        if (!level || log.level === level) {
                            logs.push(log);
                        }
                    }
                    cursor.continue();
                } else {
                    resolve(logs);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Export logs for analysis
     */
    static async exportLogs() {
        const logs = await this.getSecurityLogs({ limit: 1000 });
        const exportData = {
            timestamp: Date.now(),
            version: '1.0',
            logs: logs.map(log => ({
                timestamp: log.timestamp,
                level: log.level,
                message: log.message,
                // Exclude raw data for privacy
            }))
        };

        return JSON.stringify(exportData, null, 2);
    }

    // Private methods
    static async #storeLog(logEntry) {
        try {
            const transaction = this.#storage.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            await store.add(logEntry);
        } catch (error) {
            this.#queueLog(logEntry);
        }
    }

    static #queueLog(logEntry) {
        this.#logQueue.push(logEntry);
        if (this.#logQueue.length > this.#config.maxLogSize) {
            this.#logQueue.shift(); // Remove oldest
        }
    }

    async processQueuedLogs() {
        for (const log of OfflineSecurityLogger.#logQueue) {
            await OfflineSecurityLogger.#storeLog(log);
        }
        OfflineSecurityLogger.#logQueue = [];
    }

    static #scrubPII(data) {
        if (!data || typeof data !== 'object') return {};
        
        const scrubbed = {};
        for (const [key, value] of Object.entries(data)) {
            if (this.#config.piiFields.some(field => key.toLowerCase().includes(field))) {
                scrubbed[key] = '[REDACTED]';
            } else if (typeof value === 'string' && value.length > 100) {
                scrubbed[key] = value.substring(0, 100) + '...';
            } else {
                scrubbed[key] = value;
            }
        }
        return scrubbed;
    }

    static async #generateIntegrity(logEntry) {
        try {
            const data = JSON.stringify({
                timestamp: logEntry.timestamp,
                level: logEntry.level,
                message: logEntry.message
            });
            const encoder = new TextEncoder();
            const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {
            return 'unavailable';
        }
    }

    static async #verifyIntegrity(logEntry) {
        if (!logEntry.integrity || logEntry.integrity === 'unavailable') return true;
        
        const expectedHash = await this.#generateIntegrity(logEntry);
        return expectedHash === logEntry.integrity;
    }

    static #sanitizeLevel(level) {
        const validLevels = ['debug', 'info', 'warn', 'error', 'critical'];
        const cleaned = String(level).toLowerCase().replace(/[^a-z]/g, '');
        return validLevels.includes(cleaned) ? cleaned : 'info';
    }

    static #sanitizeMessage(message) {
        return String(message)
            .replace(/[\r\n\t<>"'&]/g, '')
            .substring(0, 200);
    }

    static #cleanupOldLogs() {
        if (!this.#storage) return;

        const cutoff = Date.now() - (this.#config.retentionDays * 24 * 60 * 60 * 1000);
        const transaction = this.#storage.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoff);
        
        index.openCursor(range).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    }
}

window.OfflineSecurityLogger = OfflineSecurityLogger;