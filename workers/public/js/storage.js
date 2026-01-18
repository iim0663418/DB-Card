import { DB_NAME, DB_VERSION, CACHE_MAX_RECORDS, CACHE_MAX_DAYS } from './config.js';

let db = null;

/**
 * Initialize IndexedDB
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create object stores
      if (!database.objectStoreNames.contains('active_sessions')) {
        database.createObjectStore('active_sessions', { keyPath: 'uuid' });
      }
      if (!database.objectStoreNames.contains('exchange_history')) {
        database.createObjectStore('exchange_history', { keyPath: 'uuid' });
      }
    };
  });
}

/**
 * Save session data
 * @param {string} uuid - Card UUID
 * @param {object} session - Session data
 */
export async function saveSession(uuid, session) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['active_sessions'], 'readwrite');
    const store = transaction.objectStore('active_sessions');
    const request = store.put({ uuid, ...session, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get session data
 * @param {string} uuid - Card UUID
 */
export async function getSession(uuid) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['active_sessions'], 'readonly');
    const store = transaction.objectStore('active_sessions');
    const request = store.get(uuid);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete session data
 * @param {string} uuid - Card UUID
 */
export async function deleteSession(uuid) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['active_sessions'], 'readwrite');
    const store = transaction.objectStore('active_sessions');
    const request = store.delete(uuid);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save card data to cache
 * @param {string} uuid - Card UUID
 * @param {object} data - Card data
 */
export async function saveCard(uuid, data) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['exchange_history'], 'readwrite');
    const store = transaction.objectStore('exchange_history');
    const request = store.put({ uuid, ...data, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get card data from cache
 * @param {string} uuid - Card UUID
 */
export async function getCard(uuid) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['exchange_history'], 'readonly');
    const store = transaction.objectStore('exchange_history');
    const request = store.get(uuid);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clean up old cache entries
 * Removes entries older than CACHE_MAX_DAYS and keeps only CACHE_MAX_RECORDS
 */
export async function cleanupCache() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['exchange_history'], 'readwrite');
    const store = transaction.objectStore('exchange_history');
    const request = store.openCursor();
    const entries = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        entries.push({ key: cursor.key, timestamp: cursor.value.timestamp });
        cursor.continue();
      } else {
        // Remove old entries
        const maxAge = Date.now() - (CACHE_MAX_DAYS * 24 * 60 * 60 * 1000);
        const toDelete = entries.filter(e => e.timestamp < maxAge);

        // Keep only max records
        if (entries.length > CACHE_MAX_RECORDS) {
          entries.sort((a, b) => b.timestamp - a.timestamp);
          const overflow = entries.slice(CACHE_MAX_RECORDS);
          toDelete.push(...overflow);
        }

        // Delete entries
        const deleteTransaction = database.transaction(['exchange_history'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('exchange_history');
        toDelete.forEach(entry => deleteStore.delete(entry.key));

        deleteTransaction.oncomplete = () => {
          // Save cleanup timestamp
          localStorage.setItem('last_cleanup', new Date().toISOString());
          resolve();
        };
        deleteTransaction.onerror = () => reject(deleteTransaction.error);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get storage statistics
 * @returns {Promise<{sessions: number, cards: number, estimatedSize: string, lastCleanup: string}>}
 */
export async function getStorageStats() {
  const database = await initDB();
  
  const sessionCount = await countRecords(database, 'active_sessions');
  const cardCount = await countRecords(database, 'exchange_history');
  
  // Estimate size (simplified: 1KB per session, 10KB per card)
  const estimatedKB = sessionCount * 1 + cardCount * 10;
  const estimatedSize = estimatedKB < 1024 
    ? `~${estimatedKB}KB` 
    : `~${(estimatedKB / 1024).toFixed(1)}MB`;
  
  return {
    sessions: sessionCount,
    cards: cardCount,
    estimatedSize,
    lastCleanup: localStorage.getItem('last_cleanup') || 'Never'
  };
}

/**
 * Count records in an object store
 * @param {IDBDatabase} db - Database instance
 * @param {string} storeName - Object store name
 * @returns {Promise<number>}
 */
async function countRecords(db, storeName) {
  return new Promise((resolve) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
}

/**
 * Clear all storage data
 * @returns {Promise<void>}
 */
export async function clearAllStorage() {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['active_sessions', 'exchange_history'], 'readwrite');
    
    transaction.objectStore('active_sessions').clear();
    transaction.objectStore('exchange_history').clear();
    
    transaction.oncomplete = () => {
      localStorage.removeItem('last_cleanup');
      console.info('[IndexedDB] All storage cleared');
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
