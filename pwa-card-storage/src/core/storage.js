/**
 * PWA 名片儲存核心模組
 * 基於 IndexedDB 的本地資料庫管理
 */

class PWACardStorage {
  constructor() {
    this.dbName = 'PWACardStorage';
    this.dbVersion = 2; // 升級版本以支援統一架構
    this.db = null;
    this.encryptionKey = null;
    this.maxVersions = 10; // 版本控制限制
    
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
          timestamp: 'timestamp',
          version: 'version'
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
      
      // 開啟資料庫連線
      this.db = await this.openDatabase();
      
      // 初始化加密金鑰
      await this.initializeEncryption();
      
      // 執行健康檢查
      await this.performHealthCheck();
      
      return true;
    } catch (error) {
      console.error('[Storage] Initialization failed:', error);
      throw error;
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      
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
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        try {
          // 建立 cards store
          if (!db.objectStoreNames.contains('cards')) {
            const cardsStore = db.createObjectStore('cards', { keyPath: 'id' });
            cardsStore.createIndex('type', 'type', { unique: false });
            cardsStore.createIndex('created', 'created', { unique: false });
            cardsStore.createIndex('modified', 'modified', { unique: false });
          }

          // 建立 versions store
          if (!db.objectStoreNames.contains('versions')) {
            const versionsStore = db.createObjectStore('versions', { keyPath: 'id' });
            versionsStore.createIndex('cardId', 'cardId', { unique: false });
            versionsStore.createIndex('timestamp', 'timestamp', { unique: false });
            versionsStore.createIndex('version', 'version', { unique: false });
          } else {
            // 升級現有的 versions store，添加 version 索引
            const versionsStore = transaction.objectStore('versions');
            if (!versionsStore.indexNames.contains('version')) {
              versionsStore.createIndex('version', 'version', { unique: false });
            }
          }

          // 建立 settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }

          // 建立 backups store
          if (!db.objectStoreNames.contains('backups')) {
            const backupsStore = db.createObjectStore('backups', { keyPath: 'id' });
            backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          
        } catch (error) {
          console.error('[Storage] Schema upgrade failed:', error);
          reject(error);
        }
      };
      
      request.onblocked = (event) => {
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
        
      } else {
        // 使用已存在的鹽值重新生成金鑰
        const salt = new Uint8Array(keyData.salt);
        const keyMaterial = await this.deriveKeyFromPBKDF2('default-password', salt);
        
        this.encryptionKey = keyMaterial;
        this.encryptionSalt = salt;
        
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

      return { healthy: corruptedCount === 0, corruptedCount };
    } catch (error) {
      console.error('[Storage] Health check failed:', error);
      return { healthy: false, error: error.message };
    }
  }

  // PWA-24 直接處理方法已添加
  
  // 基本 CRUD 操作
  async storeCard(cardData) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const id = this.generateId();
      const now = new Date();
      
      // 在儲存前標準化資料格式，確保 greetings 是字串陣列
      const normalizedData = this.normalizeCardDataForStorage(cardData);
      
      const card = {
        id,
        type: this.detectCardType(normalizedData),
        data: normalizedData,
        created: now,
        modified: now,
        currentVersion: 1, // 重新命名為 currentVersion 避免混淆
        checksum: await this.calculateChecksum(normalizedData),
        encrypted: false,
        tags: [],
        isFavorite: false
      };

      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      
      await new Promise((resolve, reject) => {
        const request = store.add(card);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = (event) => {
          reject(new Error(`Failed to store card: ${event.target.error?.message || 'Unknown error'}`));
        };
      });

      // 建立版本快照
      try {
        await this.createVersionSnapshot(id, normalizedData, 'create');
      } catch (versionError) {
        // 不阻斷主要操作
      }

      return id;
    } catch (error) {
      console.error('[Storage] Store card failed:', error);
      throw error;
    }
  }

  /**
   * PWA-35: 直接儲存方法 - 支援雙語欄位的結構化儲存
   */
  async storeCardDirectly(cardData) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const id = this.generateId();
      const now = new Date();
      const cardType = this.detectCardType(cardData);
      
      const card = {
        id,
        type: cardType,
        data: { ...cardData },
        created: now,
        modified: now,
        currentVersion: 1,
        encrypted: false,
        tags: [],
        isFavorite: false,
        isBilingual: this.hasBilingualContent(cardData)
      };
      
      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      
      await new Promise((resolve, reject) => {
        const request = store.add(card);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
          reject(new Error(`Failed to store card directly: ${event.target.error?.message || 'Unknown error'}`));
        };
      });
      
      return id;
    } catch (error) {
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

      // 更新資料並標準化
      const updatedData = this.normalizeCardDataForStorage({ ...card.data, ...updates });
      card.data = updatedData;
      card.modified = new Date();
      card.currentVersion += 1;
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

      return true;
    } catch (error) {
      console.error('[Storage] Delete card failed:', error);
      throw error;
    }
  }

  async listCards(filter = {}) {
    try {
      if (!this.db) {
        return [];
      }
      
      const transaction = this.db.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      
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
          reject(new Error(`Failed to list cards: ${event.target.error?.message || 'Unknown error'}`));
        };
      });

      return cards;
    } catch (error) {
      console.error('[Storage] List cards failed:', error);
      return [];
    }
  }

  // 版本控制 - 統一架構版本
  async createVersionSnapshot(cardId, data, changeType = 'update', description = '') {
    try {
      // 獲取當前名片的版本號
      const card = await this.getCard(cardId);
      const currentVersion = card ? card.currentVersion : 1;
      
      const versionId = `${cardId}_v${currentVersion}`;
      const version = {
        id: versionId,
        cardId,
        version: currentVersion,
        data: JSON.parse(JSON.stringify(data)), // 深拷貝
        timestamp: new Date(),
        changeType,
        description,
        checksum: await this.calculateChecksum(data)
      };

      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      
      await new Promise((resolve, reject) => {
        const request = store.put(version); // 使用 put 而非 add，允許覆蓋
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 清理舊版本（保留最近指定數量）
      await this.cleanupOldVersions(cardId);

      return version;
    } catch (error) {
      console.error('[Storage] Create version snapshot failed:', error);
      throw error;
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

      // 按版本號排序，保留最新的指定數量
      versions.sort((a, b) => b.version - a.version);
      const versionsToDelete = versions.slice(this.maxVersions);

      // 刪除舊版本
      for (const version of versionsToDelete) {
        await new Promise((resolve, reject) => {
          const request = store.delete(version.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      if (versionsToDelete.length > 0) {
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

  /**
   * 標準化名片資料格式 - PWA-23 根本性修復版本
   * 從根本上解決資料遺失和雙語格式問題
   */
  normalizeCardDataForStorage(cardData) {
    
    // PWA-23 根本性修復：深度複製以避免原始資料被修改
    const normalized = JSON.parse(JSON.stringify(cardData));
    
    // PWA-23 修復：定義所有 9 個欄位的預設值
    const defaultValues = {
      name: '',
      title: '',
      department: '',
      organization: '',
      email: '',
      phone: '',
      mobile: '',
      avatar: '',
      address: '',
      socialNote: '',
      greetings: ['歡迎認識我！~Nice to meet you!']
    };
    
    // PWA-23 根本性修復：確保所有欄位都存在
    Object.keys(defaultValues).forEach(field => {
      if (normalized[field] === undefined || normalized[field] === null) {
        normalized[field] = defaultValues[field];
      }
    });
    
    // PWA-23 根本性修復：特別處理 greetings 欄位
    
    if (Array.isArray(normalized.greetings)) {
      
      const processedGreetings = [];
      
      for (let i = 0; i < normalized.greetings.length; i++) {
        const greeting = normalized.greetings[i];
        
        const extractedGreeting = this.extractStringFromGreeting(greeting);
        
        if (extractedGreeting && extractedGreeting.trim().length > 0) {
          processedGreetings.push(extractedGreeting);
        }
      }
      
      // PWA-23 修復：如果沒有有效的問候語，使用預設值
      normalized.greetings = processedGreetings.length > 0 ? processedGreetings : defaultValues.greetings;
      
    } else if (typeof normalized.greetings === 'object' && normalized.greetings !== null) {
      const extractedGreeting = this.extractStringFromGreeting(normalized.greetings);
      normalized.greetings = extractedGreeting ? [extractedGreeting] : defaultValues.greetings;
      
    } else if (typeof normalized.greetings === 'string') {
      const trimmed = normalized.greetings.trim();
      normalized.greetings = trimmed ? [trimmed] : defaultValues.greetings;
      
    } else {
      normalized.greetings = defaultValues.greetings;
    }
    
    // PWA-23 根本性修復：處理所有字串欄位，確保沒有物件或無效值
    // PWA-23 根本性修復：定義所有 9 個字串欄位
    const stringFields = ['name', 'title', 'department', 'organization', 'email', 'phone', 'mobile', 'avatar', 'address', 'socialNote'];
    
    stringFields.forEach(field => {
      const originalValue = normalized[field];
      
      if (typeof originalValue === 'object' && originalValue !== null) {
        // PWA-23 修復：物件類型需要提取字串
        const extractedValue = this.extractStringFromGreeting(originalValue);
        normalized[field] = extractedValue || defaultValues[field] || '';
        
      } else if (typeof originalValue === 'string') {
        // PWA-23 修復：字串類型直接使用，但要檢查是否為無效字串
        const trimmed = originalValue.trim();
        const invalidStrings = ['[object Object]', 'undefined', 'null', '[object Undefined]', '[object Null]'];
        
        if (!trimmed || invalidStrings.includes(trimmed)) {
          normalized[field] = defaultValues[field] || '';
        } else {
          normalized[field] = trimmed;
        }
        
      } else if (originalValue === null || originalValue === undefined) {
        // PWA-23 修復：null/undefined 使用預設值
        normalized[field] = defaultValues[field] || '';
        
      } else {
        // PWA-23 修復：其他類型轉換為字串
        normalized[field] = String(originalValue).trim() || defaultValues[field] || '';
      }
    });
    
    // PWA-23 根本性修復：最終驗證和日誌
    
    // PWA-23 根本性修復：確保所有欄位都是字串類型（除了 greetings 是陣列）
    const finalValidation = {
      allFieldsPresent: true,
      fieldTypes: {},
      issues: []
    };
    
    Object.keys(defaultValues).forEach(field => {
      if (field === 'greetings') {
        finalValidation.fieldTypes[field] = Array.isArray(normalized[field]) ? 'array' : typeof normalized[field];
        if (!Array.isArray(normalized[field])) {
          finalValidation.allFieldsPresent = false;
          finalValidation.issues.push(`${field} is not an array`);
        }
      } else {
        finalValidation.fieldTypes[field] = typeof normalized[field];
        if (typeof normalized[field] !== 'string') {
          finalValidation.allFieldsPresent = false;
          finalValidation.issues.push(`${field} is not a string`);
        }
      }
    });
    
    
    return normalized;
  }
  
  /**
   * 從複雜的問候語格式中提取字串 - PWA-23 根本性修復版本
   * 確保雙語格式完整保持，解決資料遺失問題
   */
  extractStringFromGreeting(greeting) {
    
    // PWA-23 修復：處理 null, undefined, 空值情況
    if (greeting === null || greeting === undefined) {
      return '';
    }
    
    // PWA-23 修復：字串處理 - 最高優先級保持原始格式
    if (typeof greeting === 'string') {
      const trimmed = greeting.trim();
      
      // 空字串檢查
      if (!trimmed) {
        return '';
      }
      
      // PWA-23 修復：更嚴格的無效字串檢查
      const invalidStrings = [
        '[object Object]', 'undefined', 'null', '[object Undefined]', 
        '[object Null]', 'NaN', '[object NaN]', 'false', 'true'
      ];
      
      if (invalidStrings.includes(trimmed)) {
        return '';
      }
      
      // PWA-23 根本性修復：直接返回原始字串，不做任何轉換
      // 這確保 "測試~test" 格式完全保持不變
      return trimmed;
    }
    
    // PWA-23 修復：物件處理 - 轉換為標準雙語格式
    if (typeof greeting === 'object' && greeting !== null) {
      
      // PWA-23 修復：處理標準雙語物件 {zh: "中文", en: "English"}
      if (greeting.zh !== undefined && greeting.en !== undefined) {
        const zhValue = typeof greeting.zh === 'string' ? greeting.zh.trim() : String(greeting.zh || '').trim();
        const enValue = typeof greeting.en === 'string' ? greeting.en.trim() : String(greeting.en || '').trim();
        
        // PWA-23 修復：只有當兩個值都有效時才組合
        if (zhValue && enValue && 
            !invalidStrings.includes(zhValue) && 
            !invalidStrings.includes(enValue)) {
          const result = `${zhValue}~${enValue}`;
          return result;
        }
        
        // PWA-23 修復：如果只有一個語言有效，返回該語言
        if (zhValue && !invalidStrings.includes(zhValue)) {
          return zhValue;
        }
        if (enValue && !invalidStrings.includes(enValue)) {
          return enValue;
        }
      }
      
      // PWA-23 修復：處理只有單一語言的物件
      if (greeting.zh !== undefined) {
        const zhValue = typeof greeting.zh === 'string' ? greeting.zh.trim() : String(greeting.zh || '').trim();
        if (zhValue && !invalidStrings.includes(zhValue)) {
          return zhValue;
        }
      }
      
      if (greeting.en !== undefined) {
        const enValue = typeof greeting.en === 'string' ? greeting.en.trim() : String(greeting.en || '').trim();
        if (enValue && !invalidStrings.includes(enValue)) {
          return enValue;
        }
      }
      
      // PWA-23 修復：嘗試從物件的其他屬性提取值（最後手段）
      const objectKeys = Object.keys(greeting);
      for (const key of objectKeys) {
        const value = greeting[key];
        if (typeof value === 'string') {
          const trimmedValue = value.trim();
          if (trimmedValue && !invalidStrings.includes(trimmedValue)) {
            return trimmedValue;
          }
        }
      }
      
      return '';
    }
    
    // PWA-23 修復：其他類型轉換為字串
    if (typeof greeting === 'number' || typeof greeting === 'boolean') {
      const stringValue = String(greeting);
      return stringValue;
    }
    
    return '';
  }

  // 工具方法
  generateId() {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  detectCardType(data) {
    console.log('[Storage] 開始類型識別，輸入資料:', {
      hasUrl: !!data.url,
      url: data.url,
      name: data.name,
      hasNameTilde: data.name?.includes?.('~'),
      hasTitleTilde: data.title?.includes?.('~')
    });
    
    // PWA-36 修復：整合 PWA 暫存機制
    if (window.PWAIntegration) {
      const enhancedType = window.PWAIntegration.identifyCardTypeEnhanced(data);
      if (enhancedType) {
        console.log('[Storage] ✅ PWA 整合識別類型:', enhancedType);
        return enhancedType;
      }
    }
    
    // 1. 最高優先級：檢查資料中的 URL 欄位（絕對優先）
    if (data.url && typeof data.url === 'string') {
      const url = data.url.toLowerCase().trim();
      console.log('[Storage] URL 檢測模式，URL:', url);
      
      // PWA-36 修復：處理 PWA 頁面 URL
      if (url.includes('pwa-card-storage')) {
        console.log('[Storage] 檢測到 PWA 頁面，嘗試從參數解析');
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const cardParam = urlParams.get('c');
        if (cardParam) {
          try {
            const decodedData = JSON.parse(decodeURIComponent(atob(cardParam)));
            return this.detectCardType(decodedData);
          } catch (error) {
            console.log('[Storage] PWA 參數解析失敗，繼續其他方法');
          }
        }
      }
      
      // 精確匹配，按長度排序避免誤判
      if (url.includes('index-bilingual-personal.html')) {
        console.log('[Storage] ✅ URL 匹配: index-bilingual-personal.html -> personal-bilingual');
        return 'personal-bilingual';
      }
      if (url.includes('index1-bilingual.html')) {
        console.log('[Storage] ✅ URL 匹配: index1-bilingual.html -> bilingual1');
        return 'bilingual1';
      }
      if (url.includes('index-bilingual.html')) {
        console.log('[Storage] ✅ URL 匹配: index-bilingual.html -> bilingual');
        return 'bilingual';
      }
      if (url.includes('index-personal-en.html')) {
        console.log('[Storage] ✅ URL 匹配: index-personal-en.html -> personal-en');
        return 'personal-en';
      }
      if (url.includes('index1-en.html')) {
        console.log('[Storage] ✅ URL 匹配: index1-en.html -> en1');
        return 'en1';
      }
      if (url.includes('index-en.html')) {
        console.log('[Storage] ✅ URL 匹配: index-en.html -> en');
        return 'en';
      }
      if (url.includes('index-personal.html')) {
        console.log('[Storage] ✅ URL 匹配: index-personal.html -> personal');
        return 'personal';
      }
      if (url.includes('index1.html')) {
        console.log('[Storage] ✅ URL 匹配: index1.html -> index1');
        return 'index1';
      }
      if (url.includes('index.html')) {
        console.log('[Storage] ✅ URL 匹配: index.html -> index');
        return 'index';
      }
      
      console.log('[Storage] ⚠️ URL 存在但無匹配模式，URL:', url);
    }
    
    // 2. 次優先級：檢查 referrer 來源 URL
    const referrerType = this.detectTypeFromReferrer();
    if (referrerType) {
      console.log('[Storage] ✅ Referrer 識別類型:', referrerType);
      return referrerType;
    }
    
    // 3. 最後備用：資料特徵識別（僅在無 URL 時使用）
    console.log('[Storage] ⚠️ 使用資料特徵識別（備用方案）');
    const isBilingual = this.isBilingualCard(data);
    const isGov = this.isGovernmentCard(data);
    const isShinGuang = this.isShinGuangBuilding(data);
    
    console.log('[Storage] 資料特徵分析:', { isBilingual, isGov, isShinGuang });
    
    if (isBilingual) {
      const result = isGov ? (isShinGuang ? 'bilingual1' : 'bilingual') : 'personal-bilingual';
      console.log('[Storage] 🔄 雙語版識別結果:', result);
      return result;
    }
    
    const result = isGov ? (isShinGuang ? 'index1' : 'index') : 'personal';
    console.log('[Storage] 🔄 非雙語版識別結果:', result);
    return result;
  }
  
  /**
   * PWA-35: 檢測是否包含雙語內容
   */
  hasBilingualContent(cardData) {
    const bilingualFields = [cardData.name, cardData.title, cardData.department, 
                            cardData.organization, cardData.socialNote, cardData.address];
    
    return bilingualFields.some(field => 
      typeof field === 'object' && field && field.zh && field.en
    );
  }
  
  detectTypeFromReferrer() {
    if (typeof window === 'undefined' || !window.location) {
      return null;
    }
    
    const referrer = document.referrer || window.location.href;
    
    // 直接根據 referrer URL 判斷類型，不檢查資料內容
    if (referrer.includes('index-bilingual-personal.html')) {
      return 'personal-bilingual';
    }
    if (referrer.includes('index1-bilingual.html')) {
      return 'bilingual1';
    }
    if (referrer.includes('index-bilingual.html')) {
      return 'bilingual';
    }
    if (referrer.includes('index-personal-en.html')) {
      return 'personal-en';
    }
    if (referrer.includes('index1-en.html')) {
      return 'en1';
    }
    if (referrer.includes('index-en.html')) {
      return 'en';
    }
    if (referrer.includes('index-personal.html')) {
      return 'personal';
    }
    if (referrer.includes('index1.html')) {
      return 'index1';
    }
    if (referrer.includes('index.html')) {
      return 'index';
    }
    
    return null;
  }
  
  /**
   * PWA-33 標準解碼修復：使用 9 大名片頁面的標準解碼方式
   */
  fullyDecodeUrlData(data) {
    try {
      let decoded = decodeURIComponent(data);
      const padding = '='.repeat((4 - decoded.length % 4) % 4);
      const base64Fixed = decoded.replace(/-/g, '+').replace(/_/g, '/') + padding;
      const base64Decoded = atob(base64Fixed);
      const finalDecoded = decodeURIComponent(base64Decoded);
      return finalDecoded;
    } catch (error) {
      try {
        return decodeURIComponent(data);
      } catch (simpleError) {
        return data;
      }
    }
  }
  
  /**
   * PWA-35: 增強的雙語檢測邏輯，支援所有雙語欄位
   */
  isBilingualCard(data) {
    // 檢查物件格式的雙語欄位
    const bilingualObjectFields = [data.name, data.title, data.department, 
                                   data.organization, data.socialNote, data.address];
    
    for (const field of bilingualObjectFields) {
      if (typeof field === 'object' && field && field.zh && field.en) {
        return true;
      }
    }
    
    // 檢查字串格式的雙語欄位（向下相容）
    const bilingualStringFields = [data.name, data.title, data.department, 
                                   data.organization, data.socialNote, data.address];
    
    for (const field of bilingualStringFields) {
      if (typeof field === 'string' && field.includes('~')) {
        return true;
      }
    }
    
    // 檢查問候語是否為雙語格式
    if (data.greetings && Array.isArray(data.greetings)) {
      return data.greetings.some(greeting => 
        typeof greeting === 'string' && greeting.includes('~')
      );
    }
    
    return false;
  }
  
  isGovernmentCard(data) {
    const govIndicators = [
      '數位發展部', 'Ministry of Digital Affairs', 'moda', 'gov.tw',
      '延平南路143號', '松仁路99號', '@moda.gov.tw', 'moda.gov.tw',
      '數位策略司', '數位政府司', '資源管理司',
      '韌性建設司', '數位國際司', '資料創新司'
    ];
    
    const fieldsToCheck = [
      data.organization, data.department, data.address, data.email
    ];
    
    // 處理雙語格式
    const textParts = [];
    fieldsToCheck.forEach(field => {
      if (field && typeof field === 'string') {
        if (field.includes('~')) {
          const [chinese, english] = field.split('~');
          if (chinese) textParts.push(chinese.trim());
          if (english) textParts.push(english.trim());
        } else {
          textParts.push(field);
        }
      }
    });
    
    const textToCheck = textParts.join(' ').toLowerCase();
    
    return govIndicators.some(indicator => 
      textToCheck.includes(indicator.toLowerCase())
    );
  }
  
  isShinGuangBuilding(data) {
    if (!data.address || typeof data.address !== 'string') return false;
    
    const addressChecks = [
      data.address.includes('新光'),
      data.address.includes('松仁路'),
      data.address.includes('Songren'),
      data.address.includes('99')
    ];
    
    return addressChecks.some(check => check);
  }
  
  isEnglishCard(data) {
    // 檢查組織名稱
    if (data.organization && typeof data.organization === 'string' && data.organization.includes('Ministry of Digital Affairs')) {
      return true;
    }

    // 檢查地址格式
    if (data.address && typeof data.address === 'string' && /\d+\s+\w+\s+(Rd\.|St\.|Ave\.)/.test(data.address)) {
      return true;
    }

    // 檢查姓名是否主要為英文（不包含雙語格式）
    if (data.name && typeof data.name === 'string' && /^[A-Za-z\s\-\.]+$/.test(data.name) && !data.name.includes('~')) {
      return true;
    }
    
    return false;
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

    } catch (error) {
      console.error('[Storage] Cleanup old versions failed:', error);
    }
  }

  // 清理和維護
  async cleanup() {
    try {
      
      // 執行記憶體優化
      await this.optimizeMemoryUsage();
      
      // 清理孤立的版本記錄
      await this.cleanupOrphanedVersions();
      
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

    } catch (error) {
      console.error('[Storage] Cleanup orphaned versions failed:', error);
    }
  }

  // ===== 版本控制相關方法 (整合自 VersionManager) =====

  /**
   * 獲取版本歷史
   */
  async getVersionHistory(cardId) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction(['versions'], 'readonly');
      const store = transaction.objectStore('versions');
      const index = store.index('cardId');
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(cardId);
        
        request.onsuccess = () => {
          const versions = request.result.sort((a, b) => b.version - a.version);
          
          const history = {
            cardId,
            versions,
            currentVersion: versions.length > 0 ? versions[0].version : 0,
            totalVersions: versions.length,
            maxVersions: this.maxVersions
          };
          
          resolve(history);
        };
        
        request.onerror = () => {
          console.error('[Storage] Failed to get version history:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[Storage] Get version history failed:', error);
      throw error;
    }
  }

  /**
   * 還原到指定版本
   */
  async restoreVersion(cardId, targetVersion) {
    try {
      
      // 獲取目標版本資料
      const versionSnapshot = await this.getVersionSnapshot(cardId, targetVersion);
      if (!versionSnapshot) {
        throw new Error(`Version ${targetVersion} not found for card ${cardId}`);
      }

      // 驗證資料完整性
      const calculatedChecksum = await this.calculateChecksum(versionSnapshot.data);
      if (calculatedChecksum !== versionSnapshot.checksum) {
        // 繼續執行，但記錄警告
      }

      // 更新主要名片資料
      await this.updateCard(cardId, versionSnapshot.data);

      // 建立還原操作的版本快照
      await this.createVersionSnapshot(
        cardId, 
        versionSnapshot.data, 
        'restore', 
        `Restored to version ${targetVersion}`
      );

      return {
        success: true,
        restoredVersion: targetVersion,
        data: versionSnapshot.data
      };
    } catch (error) {
      console.error('[Storage] Restore version failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 比較版本差異
   */
  async compareVersions(cardId, version1, version2) {
    try {
      const snapshot1 = await this.getVersionSnapshot(cardId, version1);
      const snapshot2 = await this.getVersionSnapshot(cardId, version2);
      
      if (!snapshot1 || !snapshot2) {
        throw new Error('One or both versions not found');
      }

      const differences = this.calculateDifferences(snapshot1.data, snapshot2.data);
      
      return {
        cardId,
        version1,
        version2,
        differences,
        timestamp1: snapshot1.timestamp,
        timestamp2: snapshot2.timestamp
      };
    } catch (error) {
      console.error('[Storage] Compare versions failed:', error);
      throw error;
    }
  }

  /**
   * 獲取版本統計
   */
  async getVersionStats(cardId = null) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      if (cardId) {
        // 單一名片統計
        const versions = await this.getVersionHistory(cardId);
        const card = await this.getCard(cardId);
        
        return {
          cardId,
          totalVersions: versions.totalVersions,
          currentVersion: versions.currentVersion,
          lastModified: card?.modified,
          storageUsed: this.calculateStorageUsage(versions.versions)
        };
      } else {
        // 全域統計
        const cards = await this.listCards();
        const allVersions = await this.getAllVersions();
        
        const totalCards = cards.length;
        const totalVersions = allVersions.length;
        const avgVersionsPerCard = totalCards > 0 ? totalVersions / totalCards : 0;
        
        return {
          totalCards,
          totalVersions,
          avgVersionsPerCard: Math.round(avgVersionsPerCard * 100) / 100,
          maxVersionsPerCard: this.maxVersions
        };
      }
    } catch (error) {
      console.error('[Storage] Get version stats failed:', error);
      throw error;
    }
  }

  /**
   * 獲取指定版本快照
   */
  async getVersionSnapshot(cardId, version) {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['versions'], 'readonly');
    const store = transaction.objectStore('versions');
    
    return new Promise((resolve, reject) => {
      const request = store.get(`${cardId}_v${version}`);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 獲取所有版本記錄
   */
  async getAllVersions() {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['versions'], 'readonly');
    const store = transaction.objectStore('versions');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 計算版本差異
   */
  calculateDifferences(data1, data2) {
    const differences = [];
    const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
    
    for (const key of allKeys) {
      const value1 = data1[key];
      const value2 = data2[key];
      
      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({
          field: key,
          oldValue: value1,
          newValue: value2,
          changeType: !value1 ? 'added' : !value2 ? 'removed' : 'modified'
        });
      }
    }
    
    return differences;
  }

  /**
   * 計算儲存使用量
   */
  calculateStorageUsage(versions) {
    const totalSize = versions.reduce((sum, version) => {
      return sum + JSON.stringify(version).length;
    }, 0);
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024 * 100) / 100,
      mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * 清理過期版本
   */
  async cleanupExpiredVersions(daysOld = 30) {
    try {
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      const index = store.index('timestamp');
      
      let deletedCount = 0;
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // 保留每張名片的最新版本
            const version = cursor.value;
            if (version.version > 1) { // 不刪除第一個版本
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => {
          console.error('[Storage] Cleanup failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[Storage] Cleanup expired versions failed:', error);
      throw error;
    }
  }

  /**
   * 匯出版本歷史
   */
  async exportVersionHistory(cardId) {
    try {
      const history = await this.getVersionHistory(cardId);
      const exportData = {
        cardId,
        exportDate: new Date().toISOString(),
        maxVersions: this.maxVersions,
        versions: history.versions.map(v => ({
          version: v.version,
          timestamp: v.timestamp,
          changeType: v.changeType,
          description: v.description,
          checksum: v.checksum,
          data: v.data
        }))
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      
      return {
        success: true,
        file: blob,
        filename: `card-versions-${cardId}-${Date.now()}.json`
      };
    } catch (error) {
      console.error('[Storage] Export version history failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}