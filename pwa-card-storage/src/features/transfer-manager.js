/**
 * 跨設備傳輸管理器
 * 負責加密檔案匯出/匯入和衝突解決
 */

class TransferManager {
  constructor(cardManager) {
    this.cardManager = cardManager;
    this.compressionEnabled = false; // 簡化版本不使用壓縮
    this.progressCallbacks = new Map(); // 進度回調管理
    this.lastProgressUpdate = 0; // 防止過於頻繁的進度更新
  }

  /**
   * 設定進度回調
   */
  setProgressCallback(operationId, callback) {
    if (typeof callback === 'function') {
      this.progressCallbacks.set(operationId, callback);
    }
  }

  /**
   * 更新進度（防抖）
   */
  updateProgress(operationId, progress, message = '') {
    const now = Date.now();
    if (now - this.lastProgressUpdate < 100) return; // 100ms 防抖
    
    this.lastProgressUpdate = now;
    const callback = this.progressCallbacks.get(operationId);
    if (callback) {
      callback({ progress, message, timestamp: now });
    }
  }

  /**
   * 檢查檔案大小並提供警告
   */
  checkFileSizeWarning(fileSize) {
    const warnings = [];
    
    if (fileSize > 5 * 1024 * 1024) { // 5MB
      warnings.push({
        level: 'warning',
        message: '檔案較大（超過 5MB），處理時間可能較長',
        code: 'LARGE_FILE'
      });
    }
    
    if (fileSize > 8 * 1024 * 1024) { // 8MB
      warnings.push({
        level: 'high',
        message: '檔案很大（超過 8MB），建議分批處理',
        code: 'VERY_LARGE_FILE'
      });
    }
    
    return warnings;
  }

  /**
   * 產生友善的錯誤訊息
   */
  getUserFriendlyError(error, context = '') {
    const errorType = this.classifyError(error);
    
    const friendlyMessages = {
      'authorization': {
        zh: '沒有權限執行此操作，請檢查登入狀態',
        en: 'Permission denied. Please check your login status.'
      },
      'file_operation': {
        zh: '檔案處理失敗，請檢查檔案是否完整',
        en: 'File processing failed. Please check if the file is complete.'
      },
      'data_format': {
        zh: '資料格式不正確，請確認檔案格式',
        en: 'Invalid data format. Please check the file format.'
      },
      'encryption': {
        zh: '加密/解密失敗，請檢查密碼是否正確',
        en: 'Encryption/decryption failed. Please check your password.'
      },
      'network': {
        zh: '網路連線問題，請稍後再試',
        en: 'Network connection issue. Please try again later.'
      },
      'storage': {
        zh: '儲存空間不足或存取失敗',
        en: 'Storage full or access failed.'
      }
    };
    
    const language = this.detectLanguage();
    const message = friendlyMessages[errorType]?.[language] || 
                   friendlyMessages[errorType]?.['zh'] || 
                   (language === 'en' ? 'Operation failed. Please try again.' : '操作失敗，請稍後再試');
    
    return {
      message,
      code: errorType.toUpperCase(),
      context,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 偵測使用者語言
   */
  detectLanguage() {
    if (typeof navigator !== 'undefined') {
      const lang = navigator.language || navigator.userLanguage;
      return lang.startsWith('en') ? 'en' : 'zh';
    }
    return 'zh';
  }

  /**
   * 檔案驗證工具 - 檢查檔案完整性和安全性
   */
  validateFileIntegrity(file) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // 檢查檔案擴展名
    const allowedExtensions = ['.json', '.enc'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      validation.errors.push('不支援的檔案格式');
      validation.isValid = false;
    }

    // 檢查檔案大小
    if (file.size === 0) {
      validation.errors.push('檔案為空');
      validation.isValid = false;
    }

    if (file.size > 10 * 1024 * 1024) {
      validation.errors.push('檔案過大（超過 10MB）');
      validation.isValid = false;
    }

    // 檔案大小警告
    const sizeWarnings = this.checkFileSizeWarning(file.size);
    validation.warnings.push(...sizeWarnings);

    // 檢查檔案名稱安全性
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      validation.warnings.push({
        level: 'warning',
        message: '檔案名稱包含特殊字符',
        code: 'UNSAFE_FILENAME'
      });
    }

    return validation;
  }

  /**
   * 格式轉換器 - 支援不同格式間的轉換
   */
  async convertFormat(data, fromFormat, toFormat) {
    try {
      if (fromFormat === toFormat) {
        return { success: true, data };
      }

      switch (`${fromFormat}_to_${toFormat}`) {
        case 'vcard_to_json':
          return this.convertVCardToJSON(data);
          
        case 'json_to_vcard':
          return this.convertJSONToVCard(data);
          
        case 'legacy_to_current':
          return this.convertLegacyFormat(data);
          
        default:
          return {
            success: false,
            error: `不支援從 ${fromFormat} 轉換到 ${toFormat}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `格式轉換失敗: ${error.message}`
      };
    }
  }

  /**
   * 批量操作輔助工具
   */
  createBatchProcessor(options = {}) {
    return {
      batchSize: options.batchSize || 10,
      delay: options.delay || 10,
      
      async process(items, processor, progressCallback = null) {
        const results = [];
        const totalItems = items.length;
        
        for (let i = 0; i < totalItems; i += this.batchSize) {
          const batch = items.slice(i, Math.min(i + this.batchSize, totalItems));
          
          for (let j = 0; j < batch.length; j++) {
            const overallIndex = i + j;
            
            try {
              if (progressCallback) {
                progressCallback({
                  current: overallIndex + 1,
                  total: totalItems,
                  progress: Math.round(((overallIndex + 1) / totalItems) * 100)
                });
              }
              
              const result = await processor(batch[j], overallIndex);
              results.push(result);
            } catch (error) {
              results.push({ error: error.message, index: overallIndex });
            }
          }
          
          // 批次間暫停
          if (i + this.batchSize < totalItems) {
            await new Promise(resolve => setTimeout(resolve, this.delay));
          }
        }
        
        return results;
      }
    };
  }

  /**
   * PWA-11: 加密檔案匯出功能 - 增強版本
   */
  async exportEncrypted(options = {}) {
    const operationId = options.operationId || 'export_' + Date.now();
    
    try {
      this.updateProgress(operationId, 10, '正在準備匯出資料...');

      // 獲取要匯出的名片
      const cards = await this.getCardsForExport(options);
      if (cards.length === 0) {
        return { 
          success: false, 
          error: this.getUserFriendlyError(new Error('no_cards_to_export'), 'export').message
        };
      }

      this.updateProgress(operationId, 20, `正在處理 ${cards.length} 張名片...`);

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

      this.updateProgress(operationId, 40, '正在準備資料格式...');

      // 檢查檔案大小並提供警告
      const estimatedSize = JSON.stringify(exportData).length;
      const warnings = this.checkFileSizeWarning(estimatedSize);
      
      // 如果需要密碼加密
      if (options.encryptWithPassword && options.password) {
        this.updateProgress(operationId, 60, '正在加密資料...');
        const encryptedData = await this.encryptWithPassword(
          JSON.stringify(exportData), 
          options.password
        );
        
        this.updateProgress(operationId, 80, '正在生成加密檔案...');
        
        const blob = new Blob([JSON.stringify(encryptedData)], { 
          type: 'application/octet-stream' 
        });
        
        const filename = `cards-encrypted-${this.getTimestamp()}.enc`;
        const qrCode = await this.generateTransferQR(blob, options.password);
        
        this.updateProgress(operationId, 100, '匯出完成！');
        
        return {
          success: true,
          file: blob,
          filename,
          qrCode,
          pairingCode: this.generatePairingCode(),
          encrypted: true,
          count: cards.length,
          warnings,
          operationId
        };
      } else {
        this.updateProgress(operationId, 80, '正在生成檔案...');
        
        // 未加密匯出
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
          type: 'application/json' 
        });
        
        const filename = `cards-export-${this.getTimestamp()}.json`;
        
        this.updateProgress(operationId, 100, '匯出完成！');
        
        return {
          success: true,
          file: blob,
          filename,
          encrypted: false,
          count: cards.length,
          warnings,
          operationId
        };
      }
    } catch (error) {
      console.error('[Transfer] Export failed:', error);
      const friendlyError = this.getUserFriendlyError(error, 'export');
      return { 
        success: false, 
        error: friendlyError.message,
        code: friendlyError.code,
        operationId
      };
    }
  }

  /**
   * PWA-12: 資料匯入與衝突解決 - 安全修復版本（增強 UX）
   */
  async importData(file, password = null, options = {}) {
    const operationId = options.operationId || 'import_' + Date.now();
    
    try {
      this.updateProgress(operationId, 5, '正在檢查匯入權限...');
      
      // SEC-PWA-001: 緊急停用檢查
      if (window.EMERGENCY_DISABLE_IMPORT) {
        return { 
          success: false, 
          error: this.getUserFriendlyError(new Error('import_disabled'), 'import').message,
          operationId 
        };
      }

      // SEC-PWA-003: 授權檢查
      if (window.SecurityAuthHandler && !window.SecurityAuthHandler.hasPermission('import')) {
        return { 
          success: false, 
          error: this.getUserFriendlyError(new Error('authorization'), 'import').message,
          operationId 
        };
      }

      this.updateProgress(operationId, 10, '正在驗證檔案格式...');

      // SEC-PWA-001: 檔案類型白名單驗證
      const allowedTypes = ['application/json', 'application/octet-stream'];
      if (!allowedTypes.includes(file.type)) {
        return { 
          success: false, 
          error: this.getUserFriendlyError(new Error('file_type_not_supported'), 'import').message,
          operationId 
        };
      }

      // 檔案大小檢查與警告
      const warnings = this.checkFileSizeWarning(file.size);
      
      // SEC-PWA-001: 檔案大小限制 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return { 
          success: false, 
          error: this.getUserFriendlyError(new Error('file_too_large'), 'import').message,
          operationId 
        };
      }

      this.updateProgress(operationId, 20, '正在讀取檔案內容...');
      
      // SEC-PWA-005: 安全的檔案讀取
      const fileContent = await this.secureReadFile(file);
      let importData;

      this.updateProgress(operationId, 30, '正在解析檔案資料...');

      // 檢查是否為加密檔案
      if (file.name.endsWith('.enc')) {
        if (!password) {
          return { 
            success: false, 
            error: this.getUserFriendlyError(new Error('password_required'), 'import').message,
            operationId 
          };
        }
        
        this.updateProgress(operationId, 40, '正在解密檔案...');
        
        // SEC-PWA-002: 安全的 JSON 解析
        const encryptedData = this.secureJSONParse(fileContent);
        const decryptedContent = await this.decryptWithPassword(encryptedData, password);
        importData = this.secureJSONParse(decryptedContent);
      } else {
        // SEC-PWA-002: 安全的 JSON 解析
        importData = this.secureJSONParse(fileContent);
      }

      this.updateProgress(operationId, 50, '正在驗證資料格式...');

      // SEC-PWA-006: 輸入資料驗證和清理
      const sanitizedData = this.sanitizeImportData(importData);
      
      // SEC-PWA-007: 安全的資料格式驗證
      if (!this.validateImportData(sanitizedData)) {
        return { 
          success: false, 
          error: this.getUserFriendlyError(new Error('data_format'), 'import').message,
          operationId 
        };
      }

      // SEC-PWA-004: 記錄安全事件（不包含敏感資料）
      this.logSecurityEvent('import_attempt', {
        filename: this.maskSensitiveData(file.name),
        size: file.size,
        cardCount: sanitizedData.cards?.length || 0
      });

      this.updateProgress(operationId, 60, '正在檢查衝突...');

      // 檢測衝突
      const conflicts = await this.detectConflicts(sanitizedData.cards);
      
      if (conflicts.length > 0) {
        return {
          success: false,
          needsConflictResolution: true,
          conflicts,
          importData: sanitizedData,
          warnings,
          operationId
        };
      }

      this.updateProgress(operationId, 70, '正在匯入名片...');

      // 無衝突，直接匯入
      const result = await this.performImport(sanitizedData.cards, operationId);
      return {
        ...result,
        warnings,
        operationId
      };
    } catch (error) {
      // SEC-PWA-008: 安全的錯誤處理
      const secureError = this.handleSecureError(error, 'import_failed');
      return {
        ...secureError,
        operationId
      };
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

  // SEC-PWA-002: 安全的 JSON 解析
  secureJSONParse(jsonString) {
    try {
      return JSON.parse(jsonString, (key, value) => {
        // 防止 Prototype Pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (error) {
      throw new Error('JSON 格式錯誤');
    }
  }

  // SEC-PWA-006: 輸入資料清理
  sanitizeImportData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('無效的資料格式');
    }

    const sanitized = {
      version: String(data.version || '').slice(0, 10),
      timestamp: data.timestamp,
      cards: []
    };

    if (Array.isArray(data.cards)) {
      sanitized.cards = data.cards.map(card => this.sanitizeCardData(card)).filter(Boolean);
    }

    return sanitized;
  }

  // SEC-PWA-006: 名片資料清理
  sanitizeCardData(card) {
    if (!card || typeof card !== 'object') {
      return null;
    }

    const sanitized = {
      id: String(card.id || '').slice(0, 50),
      type: String(card.type || '').slice(0, 30),
      data: {},
      created: card.created,
      modified: card.modified,
      version: String(card.version || '').slice(0, 10)
    };

    if (card.data && typeof card.data === 'object') {
      const data = card.data;
      sanitized.data = {
        name: String(data.name || '').slice(0, 100),
        title: String(data.title || '').slice(0, 100),
        department: String(data.department || '').slice(0, 100),
        organization: String(data.organization || '').slice(0, 100),
        email: String(data.email || '').slice(0, 100),
        phone: String(data.phone || '').slice(0, 30),
        mobile: String(data.mobile || '').slice(0, 30),
        address: String(data.address || '').slice(0, 200),
        avatar: String(data.avatar || '').slice(0, 500),
        socialNote: String(data.socialNote || '').slice(0, 500),
        greetings: Array.isArray(data.greetings) ? 
          data.greetings.map(g => String(g || '').slice(0, 200)).slice(0, 10) : []
      };
    }

    return sanitized;
  }

  // SEC-PWA-007: 增強的資料格式驗證
  validateImportData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.version || typeof data.version !== 'string') {
      return false;
    }

    if (!Array.isArray(data.cards)) {
      return false;
    }

    // 限制名片數量
    if (data.cards.length > 1000) {
      return false;
    }

    return data.cards.every(card => this.validateSingleCardStrict(card));
  }

  // SEC-PWA-007: 嚴格的單張名片資料類型驗證
  validateSingleCardStrict(card) {
    if (!card || typeof card !== 'object') {
      return false;
    }
    
    // 必要欄位存在性和類型檢查
    if (!card.id || typeof card.id !== 'string') {
      return false;
    }
    if (!card.type || typeof card.type !== 'string') {
      return false;
    }
    if (!card.data || typeof card.data !== 'object') {
      return false;
    }

    // 名片資料欄位類型檢查
    const data = card.data;
    if (!data.name || typeof data.name !== 'string') {
      return false;
    }

    // 可選欄位的類型檢查
    const optionalStringFields = ['title', 'department', 'organization', 'email', 'phone', 'mobile', 'address', 'avatar', 'socialNote'];
    for (const field of optionalStringFields) {
      if (data[field] !== undefined && typeof data[field] !== 'string') {
        return false;
      }
    }

    // 問候語陣列類型檢查
    if (data.greetings !== undefined) {
      if (!Array.isArray(data.greetings)) {
        return false;
      }
      if (!data.greetings.every(g => typeof g === 'string')) {
        return false;
      }
    }

    // 時間戳類型檢查
    if (card.created !== undefined && typeof card.created !== 'string') {
      return false;
    }
    if (card.modified !== undefined && typeof card.modified !== 'string') {
      return false;
    }
    if (card.version !== undefined && typeof card.version !== 'string') {
      return false;
    }

    return true;
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

  async performImport(cards, operationId = null) {
    let importedCount = 0;
    const errors = [];
    const batchSize = 10; // 批量處理大小
    const totalCards = cards.length;
    
    // 分批處理大量名片以提升性能
    for (let batchStart = 0; batchStart < totalCards; batchStart += batchSize) {
      const batch = cards.slice(batchStart, Math.min(batchStart + batchSize, totalCards));
      
      for (let i = 0; i < batch.length; i++) {
        const card = batch[i];
        const overallIndex = batchStart + i;
        
        try {
          // 更新進度
          if (operationId) {
            const progress = 70 + Math.round((overallIndex / totalCards) * 25);
            this.updateProgress(operationId, progress, `正在匯入第 ${overallIndex + 1}/${totalCards} 張名片...`);
          }
          
          // SEC-PWA-006: 再次驗證每張名片
          if (!this.validateSingleCard(card)) {
            errors.push(`第 ${overallIndex + 1} 張名片資料格式錯誤`);
            continue;
          }

          // 確保有名片類型資訊
          const cardType = card.type || this.detectCardType(card.data);
          
          // 套用類型預設值
          const enhancedData = this.applyCardTypeDefaults(card.data, cardType);
          
          // 使用增強後的資料進行儲存
          await this.cardManager.storage.storeCard(enhancedData);
          importedCount++;
        } catch (error) {
          // SEC-PWA-004: 不洩露敏感資料
          errors.push(`第 ${overallIndex + 1} 張名片匯入失敗`);
        }
      }
      
      // 批次間的小暫停，避免阻塞 UI
      if (batchStart + batchSize < totalCards) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    if (operationId) {
      this.updateProgress(operationId, 95, '匯入完成，正在清理...');
    }
    
    return {
      success: importedCount > 0,
      importedCount,
      totalCards: cards.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // SEC-PWA-007: 單張名片驗證（用於匯入時的最終檢查）
  validateSingleCard(card) {
    // 使用嚴格驗證
    if (!this.validateSingleCardStrict(card)) {
      return false;
    }

    // 檢查必要欄位長度
    if (card.data.name.length > 100 || card.id.length > 50) {
      return false;
    }

    // 檢查名片類型是否支援 - 9 種名片介面 + 匯入類型
    const supportedTypes = [
      'official-zh',      // 機關版中文（延平大樓）
      'official-zh-sg',   // 機關版中文（新光大樓）
      'official-en',      // 機關版英文（延平大樓）
      'official-en-sg',   // 機關版英文（新光大樓）
      'personal-zh',      // 個人版中文
      'personal-en',      // 個人版英文
      'official-bilingual',    // 雙語版機關（延平大樓）
      'official-bilingual-sg', // 雙語版機關（新光大樓）
      'personal-bilingual',    // 雙語版個人
      'vcard', 'imported' // 匯入類型
    ];
    if (!supportedTypes.includes(card.type)) {
      return false;
    }

    return true;
  }

  // SEC-PWA-004: PII 資料遮罩
  maskSensitiveData(data) {
    if (!data || typeof data !== 'string') {
      return '[masked]';
    }
    
    // 遮罩檔案名稱中的敏感資訊
    return data.replace(/[\w.-]+@[\w.-]+/g, '[email]')
               .replace(/\d{4,}/g, '[number]')
               .replace(/[\u4e00-\u9fff]{2,}/g, '[name]');
  }

  // SEC-PWA-004: 安全事件記錄
  logSecurityEvent(eventType, data) {
    if (window.SecurityMonitor) {
      window.SecurityMonitor.recordEvent(eventType, data);
    }
  }

  // SEC-PWA-008: 安全的錯誤處理
  handleSecureError(error, context) {
    // 生成錯誤追蹤 ID
    const errorId = this.generateErrorId();
    
    // 記錄詳細的安全事件（不包含敏感資料）
    this.logSecurityEvent('error_occurred', {
      errorId,
      context,
      errorType: this.classifyError(error),
      severity: this.getErrorSeverity(error, context),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.pathname
    });

    // 記錄到安全日誌
    if (window.SecurityDataHandler) {
      window.SecurityDataHandler.secureLog('error', `Transfer error: ${context}`, {
        errorId,
        errorType: this.classifyError(error)
      });
    }

    // 返回通用錯誤訊息
    return {
      success: false,
      error: '操作失敗，請稍後再試',
      errorId // 提供錯誤追蹤 ID 供技術支援使用
    };
  }

  // SEC-PWA-008: 錯誤分類
  classifyError(error) {
    if (!error || !error.message) {
      return 'unknown';
    }
    
    const message = error.message.toLowerCase();
    
    if (message.includes('json') || message.includes('parse')) {
      return 'data_format';
    }
    if (message.includes('decrypt') || message.includes('encrypt')) {
      return 'encryption';
    }
    if (message.includes('file') || message.includes('read')) {
      return 'file_operation';
    }
    if (message.includes('permission') || message.includes('auth')) {
      return 'authorization';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    
    return 'general';
  }

  // SEC-PWA-008: 錯誤嚴重程度評估
  getErrorSeverity(error, context) {
    if (!error) {
      return 'low';
    }
    
    const errorType = this.classifyError(error);
    
    // Critical 級別錯誤
    if (errorType === 'authorization' || context === 'security_violation') {
      return 'critical';
    }
    
    // High 級別錯誤
    if (errorType === 'encryption' || errorType === 'data_format') {
      return 'high';
    }
    
    // Medium 級別錯誤
    if (errorType === 'file_operation' || context === 'import_failed') {
      return 'medium';
    }
    
    return 'low';
  }

  // SEC-PWA-008: 生成錯誤追蹤 ID
  generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${random}`;
  }

  // SEC-PWA-005: 安全的檔案讀取
  secureReadFile(file) {
    return new Promise((resolve, reject) => {
      // 檔案名稱驗證
      if (!file.name || file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        reject(new Error('不安全的檔案名稱'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          // 內容長度檢查
          if (content.length > 50 * 1024 * 1024) { // 50MB 文字限制
            reject(new Error('檔案內容過大'));
            return;
          }
          resolve(content);
        } catch (error) {
          reject(new Error('檔案內容處理失敗'));
        }
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsText(file);
    });
  }

  // 保持向下相容性
  readFile(file) {
    return this.secureReadFile(file);
  }

  // 名片類型檢測 - 支援 9 種名片介面
  detectCardType(data) {
    // 檢查是否為雙語版
    if (data.greetings && data.greetings.length > 1) {
      if (data.organization && data.organization.includes('數位發展部')) {
        return 'official-bilingual'; // 雙語版數位名片
      }
      return 'personal-bilingual'; // 雙語版個人名片
    }
    
    // 檢查是否為機關版
    if (data.organization && data.organization.includes('數位發展部')) {
      return 'official-zh'; // 機關版中文
    }
    
    // 預設為個人版
    return 'personal-zh'; // 個人版中文
  }

  // 套用名片類型預設值 - 支援 9 種名片介面
  applyCardTypeDefaults(data, cardType) {
    const enhanced = { ...data };
    
    switch (cardType) {
      case 'official-zh': // 機關版中文（延平/新光大樓）
        enhanced.organization = enhanced.organization || '數位發展部';
        enhanced.address = enhanced.address || '臺北市中正區延平南路143號';
        break;
      case 'official-en': // 機關版英文（延平/新光大樓）
        enhanced.organization = enhanced.organization || 'Ministry of Digital Affairs';
        enhanced.address = enhanced.address || '143 Yanping S. Rd., Zhongzheng Dist., Taipei City';
        break;
      case 'personal-zh': // 個人版中文
        // 個人版不需要預設組織資訊
        break;
      case 'personal-en': // 個人版英文
        // 個人版英文不需要預設組織資訊
        break;
      case 'official-bilingual': // 雙語版機關（延平/新光大樓）
        enhanced.organization = enhanced.organization || '數位發展部';
        enhanced.address = enhanced.address || '臺北市中正區延平南路143號';
        enhanced.greetings = enhanced.greetings || ['您好！', 'Hello!'];
        break;
      case 'personal-bilingual': // 雙語版個人
        enhanced.greetings = enhanced.greetings || ['您好！', 'Hello!'];
        break;
      case 'vcard':
      case 'imported':
        // 保持原始資料
        break;
    }
    
    return enhanced;
  }

  /**
   * 轉換 vCard 到 JSON 格式
   */
  convertVCardToJSON(vcardData) {
    try {
      // 完整的 vCard 解析，支援所有匯出欄位
      const lines = vcardData.split('\n');
      const cardData = {};
      let greetings = [];
      
      lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (!value) return;
        
        // 處理帶參數的欄位 (如 TEL;TYPE=WORK)
        const [fieldName, params] = key.split(';');
        const upperFieldName = fieldName.toUpperCase();
        
        switch(upperFieldName) {
          case 'FN':
            cardData.name = value;
            break;
          case 'TITLE':
            cardData.title = value;
            break;
          case 'ORG':
            cardData.organization = value;
            break;
          case 'X-DEPARTMENT':
            cardData.department = value;
            break;
          case 'EMAIL':
            cardData.email = value;
            break;
          case 'TEL':
            // 處理不同類型的電話
            if (params && params.includes('TYPE=CELL')) {
              cardData.mobile = value;
            } else {
              cardData.phone = value;
            }
            break;
          case 'ADR':
            // vCard 地址格式: PO Box;Extended;Street;City;State;Postal;Country
            // 我們取 Street 部分
            const addressParts = value.split(';');
            if (addressParts.length >= 3 && addressParts[2]) {
              cardData.address = addressParts[2];
            }
            break;
          case 'URL':
            cardData.website = value;
            break;
          case 'NOTE':
            cardData.socialNote = value;
            break;
          case 'X-GREETING':
            greetings.push(value);
            break;
          case 'X-GREETINGS':
            // 處理複數形式，可能包含多個問候語用分號分隔
            const greetingsList = value.split(';').map(g => g.trim()).filter(Boolean);
            greetings.push(...greetingsList);
            break;
          case 'X-CARD-TYPE':
            cardData.type = value;
            break;
        }
      });
      
      // 設定問候語陣列
      if (greetings.length > 0) {
        cardData.greetings = greetings;
      }
      
      return { success: true, data: cardData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 轉換 JSON 到 vCard 格式
   */
  convertJSONToVCard(jsonData) {
    try {
      let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
      
      if (jsonData.name) vcard += `FN:${jsonData.name}\n`;
      if (jsonData.organization) vcard += `ORG:${jsonData.organization}\n`;
      if (jsonData.title) vcard += `TITLE:${jsonData.title}\n`;
      if (jsonData.email) vcard += `EMAIL:${jsonData.email}\n`;
      if (jsonData.phone) vcard += `TEL:${jsonData.phone}\n`;
      
      vcard += 'END:VCARD';
      
      return { success: true, data: vcard };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 轉換舊版格式到目前格式
   */
  convertLegacyFormat(data) {
    try {
      // 處理舊版格式的轉換邏輯
      if (data.version && data.version === '1.0') {
        return { success: true, data }; // 已經是當前格式
      }

      // 轉換舊版格式
      const converted = {
        version: '1.0',
        cards: Array.isArray(data) ? data : [data]
      };

      return { success: true, data: converted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 緊急功能恢復
  static enableImportFunction() {
    if (window.EMERGENCY_DISABLE_IMPORT) {
      delete window.EMERGENCY_DISABLE_IMPORT;
      console.log('[Transfer] 匯入功能已恢復');
      return true;
    }
    return false;
  }

  // 檢查緊急停用狀態
  static isImportDisabled() {
    return !!window.EMERGENCY_DISABLE_IMPORT;
  }

  generateNewId() {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getTimestamp() {
    return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  }
}

window.TransferManager = TransferManager;