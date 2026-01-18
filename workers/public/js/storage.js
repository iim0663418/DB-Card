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

        deleteTransaction.oncomplete = () => resolve();
        deleteTransaction.onerror = () => reject(deleteTransaction.error);
      }
    };

    request.onerror = () => reject(request.error);
  });
}
