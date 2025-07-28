/**
 * PWA 名片收藏儲存管理
 * 使用 IndexedDB 進行本地資料儲存
 */

class PWAStorage {
  constructor() {
    this.dbName = 'NFCCardCollection';
    this.dbVersion = 1;
    this.db = null;
  }

  // 初始化資料庫
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 名片收藏表
        if (!db.objectStoreNames.contains('cards')) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('timestamp', 'timestamp', { unique: false });
          cardStore.createIndex('source', 'source', { unique: false });
          cardStore.createIndex('name', 'data.name', { unique: false });
          cardStore.createIndex('email', 'data.email', { unique: false });
          cardStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
        
        // 設定表
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // 統計表
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: 'key' });
        }
      };
    });
  }

  // 新增名片
  async saveCard(cardData, source = 'MANUAL', tags = [], notes = '', metadata = {}) {
    return this.addCard(cardData, source, tags, notes, metadata);
  }

  // 新增名片
  async addCard(cardData, source = 'MANUAL', tags = [], notes = '', metadata = {}) {
    if (!this.db) await this.init();
    
    const card = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      source: source,
      data: cardData,
      tags: tags,
      notes: notes,
      metadata: metadata,
      lastViewed: Date.now(),
      viewCount: 1
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      const request = store.add(card);
      
      request.onsuccess = () => resolve(card);
      request.onerror = () => reject(request.error);
    });
  }

  // 取得所有名片
  async getAllCards() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 根據 ID 取得名片
  async getCard(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      const request = store.get(id);
      
      request.onsuccess = () => {
        const card = request.result;
        if (card) {
          // 更新瀏覽統計
          card.lastViewed = Date.now();
          card.viewCount = (card.viewCount || 0) + 1;
          store.put(card);
        }
        resolve(card);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 更新名片
  async updateCard(id, updates) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const card = getRequest.result;
        if (card) {
          Object.assign(card, updates);
          const putRequest = store.put(card);
          putRequest.onsuccess = () => resolve(card);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('名片不存在'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // 刪除名片
  async deleteCard(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // 搜尋名片
  async searchCards(query) {
    const allCards = await this.getAllCards();
    const lowerQuery = query.toLowerCase();
    
    return allCards.filter(card => {
      const data = card.data;
      return (
        data.name?.toLowerCase().includes(lowerQuery) ||
        data.title?.toLowerCase().includes(lowerQuery) ||
        data.department?.toLowerCase().includes(lowerQuery) ||
        data.email?.toLowerCase().includes(lowerQuery) ||
        data.organization?.toLowerCase().includes(lowerQuery) ||
        card.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        card.notes?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  // 尋找特定名片（根據 email 或 name）
  async findCard(identifier) {
    if (!identifier) return null;
    
    const allCards = await this.getAllCards();
    const lowerIdentifier = identifier.toLowerCase();
    
    return allCards.find(card => {
      const data = card.data;
      return (
        data.email?.toLowerCase() === lowerIdentifier ||
        data.name?.toLowerCase() === lowerIdentifier
      );
    });
  }

  // 根據標籤篩選
  async getCardsByTag(tag) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      const index = store.index('tags');
      const request = index.getAll(tag);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 取得統計資料
  async getStats() {
    const allCards = await this.getAllCards();
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const recentCards = allCards.filter(card => card.timestamp > oneWeekAgo);
    const monthlyCards = allCards.filter(card => card.timestamp > oneMonthAgo);
    
    const sourceStats = allCards.reduce((acc, card) => {
      acc[card.source] = (acc[card.source] || 0) + 1;
      return acc;
    }, {});
    
    const tagStats = allCards.reduce((acc, card) => {
      card.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {});
    
    return {
      total: allCards.length,
      thisWeek: recentCards.length,
      thisMonth: monthlyCards.length,
      sources: sourceStats,
      tags: tagStats,
      mostViewed: allCards.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5)
    };
  }

  // 匯出資料
  async exportData() {
    const cards = await this.getAllCards();
    const stats = await this.getStats();
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      cards: cards,
      stats: stats
    };
  }

  // 安全匯入資料
  async importData(data) {
    // 驗證資料結構
    if (!SecurityUtils.validateDataStructure(data) || !data.cards || !Array.isArray(data.cards)) {
      throw new Error('無效的匯入資料格式');
    }
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const card of data.cards) {
      try {
        // 驗證名片資料
        if (!SecurityUtils.validateDataStructure(card) || !card.data) {
          results.errors.push('無效的名片資料格式');
          continue;
        }
        
        // 清理輸入資料
        const cleanData = {
          name: SecurityUtils.sanitizeText(card.data.name || ''),
          title: SecurityUtils.sanitizeText(card.data.title || ''),
          email: SecurityUtils.sanitizeText(card.data.email || ''),
          phone: SecurityUtils.sanitizeText(card.data.phone || ''),
          mobile: SecurityUtils.sanitizeText(card.data.mobile || ''),
          department: SecurityUtils.sanitizeText(card.data.department || ''),
          organization: SecurityUtils.sanitizeText(card.data.organization || ''),
          avatar: SecurityUtils.sanitizeUrl(card.data.avatar || ''),
          address: SecurityUtils.sanitizeText(card.data.address || ''),
          greetings: Array.isArray(card.data.greetings) ? card.data.greetings.map(g => SecurityUtils.sanitizeText(g)) : [],
          socialNote: SecurityUtils.sanitizeText(card.data.socialNote || '')
        };
        
        // 檢查是否已存在
        const existing = await this.searchCards(cleanData.email || cleanData.name);
        if (existing.length === 0) {
          await this.addCard(cleanData, card.source || 'IMPORT', card.tags || [], SecurityUtils.sanitizeText(card.notes || ''));
          results.imported++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push(`${SecurityUtils.sanitizeText(card.data?.name || 'Unknown')}: ${error.message}`);
      }
    }
    
    return results;
  }

  // 清空所有資料
  async clearAll() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cards', 'settings', 'stats'], 'readwrite');
      
      Promise.all([
        new Promise((res, rej) => {
          const req = transaction.objectStore('cards').clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise((res, rej) => {
          const req = transaction.objectStore('settings').clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise((res, rej) => {
          const req = transaction.objectStore('stats').clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        })
      ]).then(() => resolve(true)).catch(reject);
    });
  }
}

// 全域實例
window.pwaStorage = new PWAStorage();