/**
 * PWA 名片儲存核心模組
 * 基於 IndexedDB 的本地資料庫管理
 */

class PWACardStorage {
  constructor() {
    this.dbName = 'PWACardStorage';
    this.dbVersion = 1;
    this.db = null;
    this.encryptionKey = null;
    
    // 資料庫結構定義
    this.stores = {
      cards: {
        keyPath: 'id',
        indexes: {
          type: 'type',
          created: 'created',
          modified: 'modified',
          name: ['data', 'name']
        }
      },
      versions: {
        keyPath: 'id',
        indexes: {
          cardId: 'cardId',
          timestamp: 'timestamp'
        }
      },
      settings: {
        keyPath: 'key'
      },
      backups: {
        keyPath: 'id',
        indexes: {
          timestamp: 'timestamp'
        }
      }
    };
  }

  async initialize() {
    try {
      console.log('[Storage] Initializing IndexedDB...');
      
      // 開啟資料庫連線
      this.db = await this.openDatabase();
      
      // 初始化加密金鑰
      await this.initializeEncryption();
      
      // 執行健康檢查
      await this.performHealthCheck();
      
      console.log('[Storage] IndexedDB initialized successfully');
      return true;
    } catch (error) {
      console.error('[Storage] Initialization failed:', error);
      throw error;
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      console.log('[Storage] Opening database:', this.dbName, 'version:', this.dbVersion);
      
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('[Storage] Database open error:', event.target.error);
        reject(new Error(`Failed to open database: ${event.target.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        console.log('[Storage] Database opened successfully');
        console.log('[Storage] Object stores:', Array.from(db.objectStoreNames));
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[Storage] Upgrading database schema from version', event.oldVersion, 'to', event.newVersion);

        try {
          // 建立 cards store
          if (!db.objectStoreNames.contains('cards')) {
            console.log('[Storage] Creating cards store');
            const cardsStore = db.createObjectStore('cards', { keyPath: 'id' });
            cardsStore.createIndex('type', 'type', { unique: false });
            cardsStore.createIndex('created', 'created', { unique: false });
            cardsStore.createIndex('modified', 'modified', { unique: false });
          }

          // 建立 versions store
          if (!db.objectStoreNames.contains('versions')) {
            console.log('[Storage] Creating versions store');
            const versionsStore = db.createObjectStore('versions', { keyPath: 'id' });
            versionsStore.createIndex('cardId', 'cardId', { unique: false });
            versionsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // 建立 settings store
          if (!db.objectStoreNames.contains('settings')) {
            console.log('[Storage] Creating settings store');
            db.createObjectStore('settings', { keyPath: 'key' });
          }

          // 建立 backups store
          if (!db.objectStoreNames.contains('backups')) {
            console.log('[Storage] Creating backups store');
            const backupsStore = db.createObjectStore('backups', { keyPath: 'id' });
            backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          
          console.log('[Storage] Database schema upgrade completed');
        } catch (error) {
          console.error('[Storage] Schema upgrade failed:', error);
          reject(error);
        }
      };
      
      request.onblocked = (event) => {
        console.warn('[Storage] Database upgrade blocked. Please close other tabs.');
      };
    });
  }

  async initializeEncryption() {
    try {
      // 檢查是否已有加密金鑰資料
      let keyData = await this.getSetting('encryptionKey');
      
      if (!keyData) {
        // 生成新的加密金鑰資料
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const keyMaterial = await this.deriveKeyFromPBKDF2('default-password', salt);
        
        this.encryptionKey = keyMaterial;
        this.encryptionSalt = salt;
        
        // 儲存金鑰資料（不儲存實際金鑰）
        await this.setSetting('encryptionKey', {
          created: new Date().toISOString(),
          algorithm: 'AES-GCM',
          keyDerivation: 'PBKDF2',
          iterations: 100000,
          saltLength: 32,
          salt: Array.from(salt)
        });
        
        console.log('[Storage] New PBKDF2-derived encryption key generated');
      } else {
        // 使用已存在的鹽值重新生成金鑰
        const salt = new Uint8Array(keyData.salt);
        const keyMaterial = await this.deriveKeyFromPBKDF2('default-password', salt);
        
        this.encryptionKey = keyMaterial;
        this.encryptionSalt = salt;
        
        console.log('[Storage] PBKDF2 encryption key regenerated from existing salt');
      }
    } catch (error) {
      console.error('[Storage] Encryption initialization failed:', error);
      // 繼續運作但不加密
      this.encryptionKey = null;
      this.encryptionSalt = null;
    }
  }

  /**
   * 使用 PBKDF2 衍生加密金鑰
   */
  async deriveKeyFromPBKDF2(password, salt) {
    try {
      // 將密碼轉換為 ArrayBuffer
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      // 導入密碼材料
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );
      
      // 使用 PBKDF2 衍生金鑰
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000, // 100,000 次迭代
          hash: 'SHA-256'
        },
        keyMaterial,
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // 不可匯出
        ['encrypt', 'decrypt']
      );
      
      return derivedKey;
    } catch (error) {
      console.error('[Storage] PBKDF2 key derivation failed:', error);
      throw error;
    }
  }

  async performHealthCheck() {
    try {
      console.log('[Storage] Performing health check...');
      
      // 檢查資料庫連線
      if (!this.db) {
        throw new Error('Database connection lost');
      }

      // 檢查各個 store 是否正常
      const storeNames = ['cards', 'versions', 'settings', 'backups'];
      for (const storeName of storeNames) {
        if (!this.db.objectStoreNames.contains(storeName)) {
          throw new Error(`Store ${storeName} not found`);
        }
      }

      // 檢查資料完整性
      const cards = await this.listCards();
      let corruptedCount = 0;
      
      for (const card of cards) {
        if (!this.validateCardData(card)) {
          console.warn('[Storage] Corrupted card found:', card.id);
          corruptedCount++;
        }
      }

      // 記錄健康檢查結果
      await this.setSetting('lastHealthCheck', {
        timestamp: new Date().toISOString(),
        totalCards: cards.length,
        corruptedCards: corruptedCount,
        status: corruptedCount === 0 ? 'healthy' : 'warning'
      });

      console.log(`[Storage] Health check completed. ${corruptedCount} corrupted cards found.`);
      return { healthy: corruptedCount === 0, corruptedCount };
    } catch (error) {
      console.error('[Storage] Health check failed:', error);
      return { healthy: false, error: error.message };
    }
  }

  // 基本 CRUD 操作
  async storeCard(cardData) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const id = this.generateId();
      const now = new Date();
      
      const card = {
        id,
        type: this.detectCardType(cardData),
        data: cardData,
        created: now,
        modified: now,
        version: 1,
        checksum: await this.calculateChecksum(cardData),
        encrypted: false,
        tags: [],
        isFavorite: false
      };

      console.log('[Storage] Storing card:', id, card);
      
      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      
      transaction.onerror = (event) => {
        console.error('[Storage] Transaction error:', event.target.error);
      };
      
      await new Promise((resolve, reject) => {
        const request = store.add(card);
        request.onsuccess = () => {
          console.log('[Storage] Card added to store successfully');
          resolve(request.result);
        };
        request.onerror = (event) => {
          console.error('[Storage] Add card error:', event.target.error);
          reject(new Error(`Failed to store card: ${event.target.error?.message || 'Unknown error'}`));
        };
      });

      // 建立版本快照
      try {
        await this.createVersionSnapshot(id, cardData, 'create');
      } catch (versionError) {
        console.warn('[Storage] Version snapshot failed:', versionError);
        // 不阻斷主要操作
      }

      console.log('[Storage] Card stored successfully:', id);
      return id;
    } catch (error) {
      console.error('[Storage] Store card failed:', error);
      throw error;
    }
  }

  async getCard(id) {
    try {
      const transaction = this.db.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      
      const card = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!card) return null;

      // 直接返回資料，不進行解密
      return card;
    } catch (error) {
      console.error('[Storage] Get card failed:', error);
      throw error;
    }
  }

  async updateCard(id, updates) {
    try {
      const card = await this.getCard(id);
      if (!card) {
        throw new Error('Card not found');
      }

      // 更新資料
      const updatedData = { ...card.data, ...updates };
      card.data = updatedData;
      card.modified = new Date();
      card.version += 1;
      card.checksum = await this.calculateChecksum(updatedData);
      card.encrypted = false;

      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      
      await new Promise((resolve, reject) => {
        const request = store.put(card);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 建立版本快照
      await this.createVersionSnapshot(id, updatedData, 'update');

      console.log('[Storage] Card updated:', id);
      return true;
    } catch (error) {
      console.error('[Storage] Update card failed:', error);
      throw error;
    }
  }

  async deleteCard(id) {
    try {
      const transaction = this.db.transaction(['cards', 'versions'], 'readwrite');
      const cardsStore = transaction.objectStore('cards');
      const versionsStore = transaction.objectStore('versions');
      
      // 刪除名片
      await new Promise((resolve, reject) => {
        const request = cardsStore.delete(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 刪除版本歷史
      const versionIndex = versionsStore.index('cardId');
      const versionCursor = versionIndex.openCursor(IDBKeyRange.only(id));
      
      await new Promise((resolve, reject) => {
        versionCursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        versionCursor.onerror = () => reject(versionCursor.error);
      });

      console.log('[Storage] Card deleted:', id);
      return true;
    } catch (error) {
      console.error('[Storage] Delete card failed:', error);
      throw error;
    }
  }

  async listCards(filter = {}) {
    try {
      if (!this.db) {
        console.warn('[Storage] Database not initialized, returning empty array');
        return [];
      }
      
      console.log('[Storage] Listing cards with filter:', filter);
      
      const transaction = this.db.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      
      transaction.onerror = (event) => {
        console.error('[Storage] List transaction error:', event.target.error);
      };
      
      // 優化的查詢策略
      let cursor;
      const maxResults = filter.limit || 100;
      
      if (filter.type) {
        const index = store.index('type');
        cursor = index.openCursor(IDBKeyRange.only(filter.type));
      } else if (filter.dateRange) {
        const index = store.index('created');
        cursor = index.openCursor(IDBKeyRange.bound(filter.dateRange.start, filter.dateRange.end));
      } else {
        cursor = store.openCursor();
      }

      const cards = [];
      let processedCount = 0;
      
      await new Promise((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && processedCount < maxResults) {
            const card = cursor.value;
            
            // 應用篩選條件（優化版）
            if (this.matchesFilter(card, filter)) {
              // 返回完整的名片資料
              cards.push(card);
            }
            
            processedCount++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = (event) => {
          console.error('[Storage] Cursor error:', event.target.error);
          reject(new Error(`Failed to list cards: ${event.target.error?.message || 'Unknown error'}`));
        };
      });

      console.log(`[Storage] Found ${cards.length} cards (processed ${processedCount})`);
      return cards;
    } catch (error) {
      console.error('[Storage] List cards failed:', error);
      return [];
    }
  }

  // 版本控制
  async createVersionSnapshot(cardId, data, changeType) {
    try {
      const versionId = this.generateId();
      const version = {
        id: versionId,
        cardId,
        version: Date.now(),
        data: data, // 不加密
        timestamp: new Date(),
        changeType,
        checksum: await this.calculateChecksum(data)
      };

      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      
      await new Promise((resolve, reject) => {
        const request = store.add(version);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 清理舊版本（保留最近 10 個）
      await this.cleanupOldVersions(cardId);

      console.log('[Storage] Version snapshot created:', versionId);
    } catch (error) {
      console.error('[Storage] Create version snapshot failed:', error);
    }
  }

  async cleanupOldVersions(cardId) {
    try {
      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const index = store.index('cardId');
      
      const versions = [];
      const cursor = index.openCursor(IDBKeyRange.only(cardId));
      
      await new Promise((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            versions.push(cursor.value);
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      // 按時間戳排序，保留最新的 10 個
      versions.sort((a, b) => b.timestamp - a.timestamp);
      const versionsToDelete = versions.slice(10);

      // 刪除舊版本
      for (const version of versionsToDelete) {
        await new Promise((resolve, reject) => {
          const request = store.delete(version.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      if (versionsToDelete.length > 0) {
        console.log(`[Storage] Cleaned up ${versionsToDelete.length} old versions for card:`, cardId);
      }
    } catch (error) {
      console.error('[Storage] Cleanup old versions failed:', error);
    }
  }

  // 設定管理
  async getSetting(key) {
    try {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      
      const result = await new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return result ? result.value : null;
    } catch (error) {
      console.error('[Storage] Get setting failed:', error);
      return null;
    }
  }

  async setSetting(key, value) {
    try {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      await new Promise((resolve, reject) => {
        const request = store.put({ key, value, updated: new Date() });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return true;
    } catch (error) {
      console.error('[Storage] Set setting failed:', error);
      return false;
    }
  }

  // 工具方法
  generateId() {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  detectCardType(data) {
    // 根據資料內容自動偵測名片類型
    if (data.name && data.name.includes('~')) {
      return 'bilingual';
    }
    if (data.organization && data.organization.includes('數位發展部')) {
      return data.address && data.address.includes('新光') ? 'gov-sg' : 'gov-yp';
    }
    return 'personal';
  }

  async calculateChecksum(data) {
    try {
      const jsonString = JSON.stringify(data, Object.keys(data).sort());
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      
      // 使用 SHA-256 計算校驗和
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[Storage] Calculate checksum failed:', error);
      return '';
    }
  }

  /**
   * 驗證資料完整性
   */
  async verifyDataIntegrity(data, expectedChecksum) {
    try {
      const actualChecksum = await this.calculateChecksum(data);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      console.error('[Storage] Data integrity verification failed:', error);
      return false;
    }
  }

  validateCardData(card) {
    try {
      // 基本結構檢查
      if (!card.id || !card.data || !card.created) {
        return false;
      }

      // 必要欄位檢查
      if (!card.data.name) {
        return false;
      }

      // 校驗和檢查（如果有的話）
      if (card.checksum) {
        // 簡化版本：只檢查是否為有效的 hex 字串
        return /^[a-f0-9]{64}$/i.test(card.checksum);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  matchesFilter(card, filter) {
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      const name = (card.data.name || '').toLowerCase();
      const title = (card.data.title || '').toLowerCase();
      
      if (!name.includes(term) && !title.includes(term)) {
        return false;
      }
    }

    if (filter.isFavorite !== undefined && card.isFavorite !== filter.isFavorite) {
      return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const cardTags = card.tags || [];
      if (!filter.tags.some(tag => cardTags.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  // 加密/解密方法
  async encryptData(data) {
    if (!this.encryptionKey) return data;

    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encodedData
      );
      
      return {
        data: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        salt: Array.from(this.encryptionSalt),
        algorithm: 'AES-GCM',
        keyDerivation: 'PBKDF2',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[Storage] Encryption failed:', error);
      return data;
    }
  }

  async decryptData(encryptedData) {
    if (!this.encryptionKey || typeof encryptedData === 'string') {
      return encryptedData;
    }

    try {
      // 驗證加密資料格式
      if (!encryptedData.data || !encryptedData.iv) {
        throw new Error('Invalid encrypted data format');
      }
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        this.encryptionKey,
        new Uint8Array(encryptedData.data)
      );
      
      const decryptedText = new TextDecoder().decode(decrypted);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('[Storage] Decryption failed:', error);
      throw error;
    }
  }

  // 統計資訊
  async getStorageStats() {
    try {
      const cards = await this.listCards();
      const estimate = await navigator.storage?.estimate?.() || {};
      
      return {
        totalCards: cards.length,
        storageUsed: estimate.usage || 0,
        storageQuota: estimate.quota || 0,
        storageUsedPercent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0,
        lastHealthCheck: await this.getSetting('lastHealthCheck')
      };
    } catch (error) {
      console.error('[Storage] Get storage stats failed:', error);
      return {
        totalCards: 0,
        storageUsed: 0,
        storageQuota: 0,
        storageUsedPercent: 0
      };
    }
  }

  /**
   * 記憶體管理優化
   */
  async optimizeMemoryUsage() {
    try {
      // 清理過期的版本記錄
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await this.cleanupVersionsOlderThan(oneWeekAgo);
      
      // 清理過期的備份
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.cleanupBackupsOlderThan(oneMonthAgo);
      
      // 強制垃圾回收
      if (window.gc) {
        window.gc();
      }
      
      console.log('[Storage] Memory optimization completed');
    } catch (error) {
      console.error('[Storage] Memory optimization failed:', error);
    }
  }

  async cleanupVersionsOlderThan(date) {
    try {
      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const index = store.index('timestamp');
      
      const cursor = index.openCursor(IDBKeyRange.upperBound(date));
      let deletedCount = 0;
      
      await new Promise((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      console.log(`[Storage] Deleted ${deletedCount} old versions`);
    } catch (error) {
      console.error('[Storage] Cleanup old versions failed:', error);
    }
  }

  // 清理和維護
  async cleanup() {
    try {
      console.log('[Storage] Starting cleanup...');
      
      // 執行記憶體優化
      await this.optimizeMemoryUsage();
      
      // 清理孤立的版本記錄
      await this.cleanupOrphanedVersions();
      
      console.log('[Storage] Cleanup completed');
    } catch (error) {
      console.error('[Storage] Cleanup failed:', error);
    }
  }

  async cleanupBackupsOlderThan(date) {
    try {
      const transaction = this.db.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const index = store.index('timestamp');
      
      const cursor = index.openCursor(IDBKeyRange.upperBound(date));
      let deletedCount = 0;
      
      await new Promise((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      console.log(`[Storage] Deleted ${deletedCount} old backups`);
    } catch (error) {
      console.error('[Storage] Cleanup backups failed:', error);
    }
  }

  async cleanupOrphanedVersions() {
    try {
      const cards = await this.listCards();
      const cardIds = new Set(cards.map(card => card.id));
      
      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const cursor = store.openCursor();
      
      let deletedCount = 0;
      
      await new Promise((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const version = cursor.value;
            if (!cardIds.has(version.cardId)) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      console.log(`[Storage] Deleted ${deletedCount} orphaned versions`);
    } catch (error) {
      console.error('[Storage] Cleanup orphaned versions failed:', error);
    }
  }
}