/**
 * 跨設備傳輸管理器
 * 負責加密檔案匯出/匯入和衝突解決
 */

class TransferManager {
  constructor(cardManager) {
    this.cardManager = cardManager;
    this.compressionEnabled = false; // 簡化版本不使用壓縮
  }

  /**
   * PWA-11: 加密檔案匯出功能
   */
  async exportEncrypted(options = {}) {
    try {

      // 獲取要匯出的名片
      const cards = await this.getCardsForExport(options);
      if (cards.length === 0) {
        return { success: false, error: '沒有可匯出的名片' };
      }

      // 準備匯出資料
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        cards: cards.map(card => ({
          id: card.id,
          type: card.type,
          data: card.data,
          created: card.created,
          modified: card.modified,
          version: card.version
        })),
        includeVersionHistory: options.includeVersions || false
      };

      // 如果需要密碼加密
      if (options.encryptWithPassword && options.password) {
        const encryptedData = await this.encryptWithPassword(
          JSON.stringify(exportData), 
          options.password
        );
        
        const blob = new Blob([JSON.stringify(encryptedData)], { 
          type: 'application/octet-stream' 
        });
        
        const filename = `cards-encrypted-${this.getTimestamp()}.enc`;
        const qrCode = await this.generateTransferQR(blob, options.password);
        
        return {
          success: true,
          file: blob,
          filename,
          qrCode,
          pairingCode: this.generatePairingCode(),
          encrypted: true
        };
      } else {
        // 未加密匯出
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
          type: 'application/json' 
        });
        
        const filename = `cards-export-${this.getTimestamp()}.json`;
        
        return {
          success: true,
          file: blob,
          filename,
          encrypted: false
        };
      }
    } catch (error) {
      console.error('[Transfer] Export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * PWA-12: 資料匯入與衝突解決
   */
  async importData(file, password = null) {
    try {

      const fileContent = await this.readFile(file);
      let importData;

      // 檢查是否為加密檔案
      if (file.name.endsWith('.enc')) {
        if (!password) {
          return { success: false, error: '需要密碼解密檔案' };
        }
        
        const encryptedData = JSON.parse(fileContent);
        const decryptedContent = await this.decryptWithPassword(encryptedData, password);
        importData = JSON.parse(decryptedContent);
      } else {
        importData = JSON.parse(fileContent);
      }

      // 驗證資料格式
      if (!this.validateImportData(importData)) {
        return { success: false, error: '檔案格式不正確' };
      }

      // 檢測衝突
      const conflicts = await this.detectConflicts(importData.cards);
      
      if (conflicts.length > 0) {
        return {
          success: false,
          needsConflictResolution: true,
          conflicts,
          importData
        };
      }

      // 無衝突，直接匯入
      const result = await this.performImport(importData.cards);
      return result;
    } catch (error) {
      console.error('[Transfer] Import failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 解決衝突並匯入
   */
  async resolveConflictsAndImport(importData, resolutions) {
    try {

      const cardsToImport = [];
      
      for (let i = 0; i < importData.cards.length; i++) {
        const card = importData.cards[i];
        const resolution = resolutions[i];
        
        if (resolution === 'skip') {
          continue;
        } else if (resolution === 'replace') {
          // 刪除現有名片
          const existingCard = await this.findExistingCard(card);
          if (existingCard) {
            await this.cardManager.storage.deleteCard(existingCard.id);
          }
          cardsToImport.push(card);
        } else if (resolution === 'keep_both') {
          // 修改 ID 以避免衝突
          card.id = this.generateNewId();
          cardsToImport.push(card);
        } else if (resolution === 'merge') {
          // 簡化版本：使用較新的資料
          const existingCard = await this.findExistingCard(card);
          if (existingCard && new Date(card.modified) > new Date(existingCard.modified)) {
            await this.cardManager.storage.updateCard(existingCard.id, card.data);
          }
        }
      }

      return await this.performImport(cardsToImport);
    } catch (error) {
      console.error('[Transfer] Conflict resolution failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成配對代碼
   */
  generatePairingCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 驗證配對代碼
   */
  validatePairingCode(code) {
    return /^[A-Z0-9]{6}$/.test(code);
  }

  // 私有方法

  async getCardsForExport(options) {
    if (options.cardIds && options.cardIds.length > 0) {
      const cards = [];
      for (const cardId of options.cardIds) {
        const card = await this.cardManager.storage.getCard(cardId);
        if (card) cards.push(card);
      }
      return cards;
    } else {
      return await this.cardManager.storage.listCards();
    }
  }

  async encryptWithPassword(data, password) {
    try {
      // 使用 Web Crypto API 進行 AES-GCM 加密
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // 從密碼生成金鑰
      const passwordBuffer = encoder.encode(password);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer
      );
      
      return {
        encrypted: Array.from(new Uint8Array(encrypted)),
        salt: Array.from(salt),
        iv: Array.from(iv),
        algorithm: 'AES-GCM',
        iterations: 100000
      };
    } catch (error) {
      console.error('[Transfer] Encryption failed:', error);
      throw new Error('加密失敗');
    }
  }

  async decryptWithPassword(encryptedData, password) {
    try {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      // 重建金鑰
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new Uint8Array(encryptedData.salt),
          iterations: encryptedData.iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        key,
        new Uint8Array(encryptedData.encrypted)
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('[Transfer] Decryption failed:', error);
      throw new Error('解密失敗，請檢查密碼是否正確');
    }
  }

  async generateTransferQR(blob, password) {
    try {
      // 簡化版本：生成下載連結的 QR 碼
      const url = URL.createObjectURL(blob);
      const qrData = `${url}#password=${password}`;
      
      if (typeof QRCode !== 'undefined') {
        return new Promise((resolve, reject) => {
          QRCode.toDataURL(qrData, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, (err, url) => {
            if (err) reject(err);
            else resolve(url);
          });
        });
      }
      
      return null;
    } catch (error) {
      console.error('[Transfer] QR generation failed:', error);
      return null;
    }
  }

  validateImportData(data) {
    return data && 
           data.version && 
           Array.isArray(data.cards) && 
           data.cards.every(card => 
             card.id && card.type && card.data && card.data.name
           );
  }

  async detectConflicts(importCards) {
    const conflicts = [];
    
    for (const importCard of importCards) {
      const existingCard = await this.findExistingCard(importCard);
      
      if (existingCard) {
        const conflictType = this.determineConflictType(existingCard, importCard);
        conflicts.push({
          importCard,
          existingCard,
          conflictType
        });
      }
    }
    
    return conflicts;
  }

  async findExistingCard(importCard) {
    // 先嘗試 ID 匹配
    const cardById = await this.cardManager.storage.getCard(importCard.id);
    if (cardById) return cardById;
    
    // 再嘗試姓名和電子郵件匹配
    const allCards = await this.cardManager.storage.listCards();
    return allCards.find(card => 
      card.data.name === importCard.data.name && 
      card.data.email === importCard.data.email
    );
  }

  determineConflictType(existingCard, importCard) {
    if (existingCard.id === importCard.id) {
      return 'duplicate_id';
    }
    
    if (new Date(importCard.modified) > new Date(existingCard.modified)) {
      return 'newer_version';
    } else if (new Date(importCard.modified) < new Date(existingCard.modified)) {
      return 'older_version';
    }
    
    return 'data_mismatch';
  }

  async performImport(cards) {
    let importedCount = 0;
    const errors = [];
    
    for (const card of cards) {
      try {
        // 移除 ID 讓系統重新生成
        const cardData = { ...card.data };
        await this.cardManager.storage.storeCard(cardData);
        importedCount++;
      } catch (error) {
        errors.push(`匯入 ${card.data.name} 失敗: ${error.message}`);
      }
    }
    
    return {
      success: importedCount > 0,
      importedCount,
      totalCards: cards.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('檔案讀取失敗'));
      reader.readAsText(file);
    });
  }

  generateNewId() {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getTimestamp() {
    return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  }
}

window.TransferManager = TransferManager;