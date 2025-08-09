/**
 * PWA 名片儲存核心模組
 * 基於 IndexedDB 的本地資料庫管理
 * 
 * @version 3.2.1-security-enhanced
 * @security Fixed CWE-117 log injection and XSS vulnerabilities
 */

console.log('[Storage] Script loading started...');

try {

// Import security modules for CWE-117 and XSS protection
let SecureLogger, XSSProtection;
try {
  if (typeof require !== 'undefined') {
    ({ SecureLogger } = require('../security/secure-logger.js'));
    ({ XSSProtection } = require('../security/xss-protection.js'));
  } else if (typeof window !== 'undefined') {
    // Avoid duplicate loading - check if already available
    SecureLogger = window.SecureLogger || window.secureLogger;
    XSSProtection = window.XSSProtection || window.xssProtection;
  }
} catch (error) {
  // Fallback to global scope if available
  if (typeof window !== 'undefined') {
    SecureLogger = window.SecureLogger || window.secureLogger;
    XSSProtection = window.XSSProtection || window.xssProtection;
  }
  if (!SecureLogger && !XSSProtection) {
    console.warn('[Storage] Security modules not available, using fallback protection');
  }
}

class PWACardStorage {
  constructor() {
    this.initializeBasicProperties();
    this.initializeConstants();
    this.initializeSecureLogger();
    this.initializeSecurityComponents();
    this.initializeManagers();
    this.initializeDatabaseStores();
  }

  initializeBasicProperties() {
    this.dbName = 'PWACardStorage';
    this.dbVersion = 3; // v3: 新增 fingerprint 欄位與索引
    this.db = null;
    this.encryptionKey = null;
    this.maxVersions = 10; // 版本控制限制
  }

  initializeConstants() {
    this.CONSTANTS = {
      ENCRYPTION: {
        SALT_LENGTH: 32,
        IV_LENGTH: 12,
        PBKDF2_ITERATIONS: 100000,
        FIELD_PBKDF2_ITERATIONS: 50000,
        KEY_LENGTH: 256
      },
      PERFORMANCE: {
        SLOW_QUERY_THRESHOLD: 200,
        CONNECTION_TEST_TIMEOUT: 5000,
        TRANSACTION_TIMEOUT: 10000,
        MAX_RETRIES: 3
      },
      LIMITS: {
        MAX_LOG_LENGTH: 500,
        MAX_INPUT_LENGTH: 1000,
        MAX_FIELD_LENGTH: 2000,
        MAX_RESULTS: 100,
        FINGERPRINT_LENGTH: 16,
        BATCH_SIZE: 10,
        RATE_LIMIT_READ: 100,
        RATE_LIMIT_WRITE: 50,
        RATE_LIMIT_DELETE: 10
      },
      TIME: {
        SECONDS_PER_MINUTE: 60,
        MINUTES_PER_HOUR: 60,
        HOURS_PER_DAY: 24,
        DAYS_PER_WEEK: 7,
        DAYS_PER_MONTH: 30,
        MILLISECONDS_PER_SECOND: 1000,
        CONNECTION_CHECK_SECONDS: 30,
        CLEANUP_DAYS: 30,
        HEALTH_DATA_RETENTION_DAYS: 7,
        MIGRATION_LOG_RETENTION_DAYS: 90,
        // Calculated values
        ONE_MINUTE: null,
        ONE_HOUR: null,
        ONE_DAY: null,
        ONE_WEEK_MS: null,
        ONE_MONTH_MS: null,
        CONNECTION_CHECK_INTERVAL: null
      },
      STORAGE: {
        HASH_LENGTH: 64,
        SUBSTRING_LENGTH: 8,
        RANDOM_STRING_LENGTH: 8,
        STACK_TRACE_LENGTH: 1000
      },
      MATH: {
        BASE36_RADIX: 36,
        RANDOM_ID_LENGTH: 11,
        PADDING_MODULO: 4,
        FINGERPRINT_SUBSTRING_LENGTH: 16,
        PERCENTAGE_MULTIPLIER: 100,
        BYTES_PER_KB: 1024,
        BACKUP_ID_SUFFIX_LENGTH: 8,
        HEALTH_DATA_RETENTION_DAYS: 7,
        VERSION_THRESHOLD: 1
      }
    };
    
    // Calculate derived time constants
    const timeConstants = this.CONSTANTS.TIME;
    timeConstants.ONE_MINUTE = timeConstants.SECONDS_PER_MINUTE * timeConstants.MILLISECONDS_PER_SECOND;
    timeConstants.ONE_HOUR = timeConstants.MINUTES_PER_HOUR * timeConstants.ONE_MINUTE;
    timeConstants.ONE_DAY = timeConstants.HOURS_PER_DAY * timeConstants.ONE_HOUR;
    timeConstants.ONE_WEEK_MS = timeConstants.DAYS_PER_WEEK * timeConstants.ONE_DAY;
    timeConstants.ONE_MONTH_MS = timeConstants.DAYS_PER_MONTH * timeConstants.ONE_DAY;
    timeConstants.CONNECTION_CHECK_INTERVAL = timeConstants.CONNECTION_CHECK_SECONDS * timeConstants.MILLISECONDS_PER_SECOND;
  }

  initializeSecureLogger() {
    this.secureLogger = SecureLogger ? new SecureLogger({
      logLevel: 'INFO',
      enableMasking: true,
      maxLogLength: 500
    }) : null;
  }

  initializeSecurityComponents() {
    this.securityToggle = null;
    this.compatibilityLayer = null;
    this.healthMonitor = null;
    this.gracefulDegradation = null;
    this.errorRecovery = null;
    this.rollbackSystem = null; // SEC-07
    this.userImpactMonitor = null; // SEC-08
    this.securityDashboard = null; // SEC-09
    this.securityMode = 'compatibility'; // compatibility, secure, fallback
  }

  initializeManagers() {
    this.duplicateDetector = null;
    this.versionManager = null;
  }

  initializeDatabaseStores() {
    this.stores = {
      cards: {
        keyPath: 'id',
        indexes: {
          type: 'type',
          created: 'created',
          modified: 'modified',
          name: ['data', 'name'],
          fingerprint: 'fingerprint'
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
      this.safeLog('info', 'Storage initialization starting');
      
      await this.performInitializationSteps();
      
      this.safeLog('info', 'Storage initialization completed successfully');
      return true;
    } catch (error) {
      return await this.handleInitializationError(error);
    }
  }

  async performInitializationSteps() {
    await this.initializeSecurityComponents();
    this.db = await this.openDatabase();
    
    await this.initializeMigrationComponents();
    await this.handleMigrationIfNeeded();
    
    this.setupConnectionMonitoring();
    await this.initializeEncryption();
    await this.initializeManagers();
    
    const healthResult = await this.performHealthCheck();
    await this.recordInitializationComplete(healthResult);
    
    if (this.healthMonitor) {
      await this.healthMonitor.initialize();
    }
  }

  async initializeMigrationComponents() {
    this.migrationLogManager = new MigrationLogManager(this);
    this.migrationValidator = new DatabaseMigrationValidator(this);
    this.batchMigrator = new BatchDataMigrator(this, this.migrationValidator);
  }

  async handleMigrationIfNeeded() {
    const migrationNeeded = await this.checkMigrationNeeded();
    if (!migrationNeeded.required) return;
    
    this.safeLog('info', 'Migration required', { 
      reason: migrationNeeded.reason,
      fromVersion: migrationNeeded.fromVersion,
      toVersion: migrationNeeded.toVersion
    });
    
    await this.performMigration(migrationNeeded);
  }

  async performMigration(migrationNeeded) {
    const logId = await this.migrationLogManager.createMigrationLog(this.dbVersion, {
      reason: migrationNeeded.reason,
      fromVersion: migrationNeeded.fromVersion,
      toVersion: migrationNeeded.toVersion,
      beforeChecksum: await this.calculateSystemChecksum()
    });
    
    try {
      const migrationResult = await this.migrationValidator.performSafeMigration(this.dbVersion);
      
      if (migrationResult.success) {
        await this.completeMigrationSuccess(logId, migrationResult);
      } else {
        throw new Error(migrationResult.error);
      }
    } catch (migrationError) {
      await this.handleMigrationError(logId, migrationError);
    }
  }

  async completeMigrationSuccess(logId, migrationResult) {
    await this.migrationLogManager.completeMigrationLog(logId, 'completed', {
      processedCards: migrationResult.processedCards || 0,
      checksums: {
        beforeMigration: await this.calculateSystemChecksum(),
        afterMigration: await this.calculateSystemChecksum()
      }
    });
    
    this.safeLog('info', 'Migration completed successfully', {
      processedCards: migrationResult.processedCards || 0
    });
  }

  async handleMigrationError(logId, migrationError) {
    await this.migrationLogManager.completeMigrationLog(logId, 'failed', {
      error: migrationError.message
    });
    
    this.safeLog('warn', 'Migration failed, attempting graceful degradation', { 
      error: migrationError.message 
    });
    
    const degradationResult = await this.handleMigrationFailure(migrationError);
    if (!degradationResult.canContinue) {
      throw new Error(`Critical migration failure: ${migrationError.message}`);
    }
  }

  async handleInitializationError(error) {
    this.safeLog('error', 'Storage initialization failed', { error: error.message });
    
    if (this.healthMonitor) {
      await this.healthMonitor.recordSecurityEvent('initialization_failure', {
        error: error.message,
        timestamp: Date.now()
      });
    }
    
    if (this.gracefulDegradation) {
      await this.gracefulDegradation.handleModuleFailure('storage', error, {
        operation: 'initialization',
        timestamp: Date.now()
      });
    }
    
    const recoveryResult = await this.attemptErrorRecovery(error);
    if (recoveryResult) return recoveryResult;
    
    await this.recordInitializationFailure(error);
    throw error;
  }

  async attemptErrorRecovery(error) {
    if (!this.errorRecovery) return null;
    
    const recoveryResult = await this.errorRecovery.handleSecurityError(error, {
      module: 'storage',
      operation: 'initialization'
    });
    
    if (recoveryResult.recovered) {
      this.safeLog('info', 'Storage initialization recovered automatically');
      return this.initialize(); // Retry initialization
    }
    
    return null;
  }

  /**
   * SEC-01: Initialize security components for static hosting
   */
  async initializeSecurityComponents() {
    try {
      await this.initializeCoreSecurityComponents();
      await this.initializePhase2Components();
      await this.initializePhase3Components();
      await this.initializePhase4Components();
      
      this.logSecurityComponentsStatus();
    } catch (error) {
      this.handleSecurityInitializationError(error);
    }
  }

  async initializeCoreSecurityComponents() {
    if (window.StaticHostingSecurityToggle) {
      this.securityToggle = new window.StaticHostingSecurityToggle();
    }
    
    if (window.StaticHostingCompatibilityLayer) {
      this.compatibilityLayer = new window.StaticHostingCompatibilityLayer(this);
      await this.compatibilityLayer.initialize();
      this.determineSecurityMode();
    }
    
    if (window.HealthManager) {
      this.healthMonitor = new window.HealthManager(this);
    }
  }

  determineSecurityMode() {
    const status = this.compatibilityLayer.getStatus();
    if (status.secureStorageAvailable && status.authHandlerAvailable) {
      this.securityMode = 'secure';
    } else if (status.fallbackAvailable) {
      this.securityMode = 'compatibility';
    } else {
      this.securityMode = 'fallback';
    }
  }

  async initializePhase2Components() {
    if (window.ClientSideGracefulDegradation) {
      this.gracefulDegradation = new window.ClientSideGracefulDegradation();
      await this.gracefulDegradation.initialize();
    }
    
    if (window.ClientSideSecurityErrorRecovery) {
      this.errorRecovery = new window.ClientSideSecurityErrorRecovery();
      await this.errorRecovery.initialize();
    }
  }

  async initializePhase3Components() {
    if (window.ClientSideSecurityRollback) {
      this.rollbackSystem = new window.ClientSideSecurityRollback();
      await this.rollbackSystem.initialize();
    }
    
    if (window.ClientSideUserImpactMonitor) {
      this.userImpactMonitor = new window.ClientSideUserImpactMonitor();
      await this.userImpactMonitor.initialize();
    }
    
    if (window.ClientSideSecurityDashboard) {
      this.securityDashboard = new window.ClientSideSecurityDashboard();
      await this.securityDashboard.initialize();
    }
  }

  async initializePhase4Components() {
    if (window.ClientSideUserCommunication) {
      this.userCommunication = new window.ClientSideUserCommunication();
      await this.userCommunication.init();
    }
    
    if (window.ClientSideSecurityOnboarding) {
      this.securityOnboarding = new window.ClientSideSecurityOnboarding();
      await this.securityOnboarding.init();
    }
    
    if (window.ClientSideSecuritySettings) {
      this.securitySettings = new window.ClientSideSecuritySettings();
      await this.securitySettings.init();
    }
  }

  logSecurityComponentsStatus() {
    const componentStatus = {
      securityMode: this.securityMode,
      phase2Components: { 
        degradation: !!this.gracefulDegradation, 
        recovery: !!this.errorRecovery 
      },
      phase3Components: { 
        rollback: !!this.rollbackSystem, 
        impact: !!this.userImpactMonitor, 
        dashboard: !!this.securityDashboard 
      },
      phase4Components: { 
        communication: !!this.userCommunication, 
        onboarding: !!this.securityOnboarding, 
        settings: !!this.securitySettings 
      }
    };

    this.safeLog('info', 'Security components initialized', componentStatus);
  }

  handleSecurityInitializationError(error) {
    this.safeLog('warn', 'Security components initialization failed', { error: error.message });
    this.securityMode = 'fallback';
  }

  /**
   * 初始化專用管理器
   */
  async initializeManagers() {
    try {
      // 初始化重複檢測器
      if (typeof DuplicateDetector !== 'undefined') {
        this.duplicateDetector = new DuplicateDetector(this);
        await this.duplicateDetector.initialize();
      }
      
      // 初始化版本管理器
      if (typeof VersionManager !== 'undefined') {
        this.versionManager = new VersionManager(this);
      }
      
      // 確保批量遷移器已初始化
      if (!this.batchMigrator && typeof BatchDataMigrator !== 'undefined') {
        this.batchMigrator = new BatchDataMigrator(this, this.migrationValidator);
      }
    } catch (error) {
      // SEC-03: Use secure logging
      if (window.secureLogger) {
        window.secureLogger.error('Manager initialization failed', { error: error.message });
      } else {
        this.safeLog('error', 'Manager initialization failed', { 
          error: this.sanitizeInput(error.message, { maxLength: 200 }) 
        });
      }
      // 不阻斷主要初始化流程
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      
      // CRS-V31-005: 新增資料庫遷移驗證
      this.validateDatabaseMigration();
      
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        this.safeLog('error', 'Database open error', { 
          error: this.sanitizeInput(event.target.error?.message || 'Unknown database error', { maxLength: 200 }) 
        });
        reject(new Error(`Failed to open database: ${event.target.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        
        // 設置資料庫關閉監聽器
        db.onclose = () => {
          this.safeLog('warn', 'Database connection closed unexpectedly');
          this.db = null;
        };
        
        db.onversionchange = () => {
          this.safeLog('warn', 'Database version changed, closing connection');
          db.close();
          this.db = null;
        };
        
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        try {
          // 建立或升級 cards store
          let cardsStore;
          if (!db.objectStoreNames.contains('cards')) {
            cardsStore = db.createObjectStore('cards', { keyPath: 'id' });
            cardsStore.createIndex('type', 'type', { unique: false });
            cardsStore.createIndex('created', 'created', { unique: false });
            cardsStore.createIndex('modified', 'modified', { unique: false });
            cardsStore.createIndex('fingerprint', 'fingerprint', { unique: false });
          } else {
            // v3 升級：新增 fingerprint 索引
            const transaction = event.target.transaction;
            cardsStore = transaction.objectStore('cards');
            if (!cardsStore.indexNames.contains('fingerprint')) {
              cardsStore.createIndex('fingerprint', 'fingerprint', { unique: false });
            }
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
          
          // STORAGE-03: 建立 migration_log store
          if (!db.objectStoreNames.contains('migration_log')) {
            const migrationLogStore = db.createObjectStore('migration_log', { keyPath: 'id' });
            migrationLogStore.createIndex('migrationVersion', 'migrationVersion', { unique: false });
            migrationLogStore.createIndex('status', 'status', { unique: false });
            migrationLogStore.createIndex('startTime', 'startTime', { unique: false });
          }
          
        } catch (error) {
          this.safeLog('error', 'Schema upgrade failed', { 
            error: this.sanitizeInput(error.message, { maxLength: 200 }) 
          });
          reject(error);
        }
      };
      
      request.onblocked = (event) => {
      };
    });
  }

  async initializeEncryption() {
    try {
      // PWA-05: Enhanced field-level encryption initialization
      let keyData = await this.getSetting('encryptionKey');
      
      if (!keyData) {
        // Generate new encryption key with enhanced security
        const salt = crypto.getRandomValues(new Uint8Array(this.CONSTANTS.ENCRYPTION.SALT_LENGTH));
        const keyMaterial = await this.deriveKeyFromPBKDF2('default-password', salt);
        
        this.encryptionKey = keyMaterial;
        this.encryptionSalt = salt;
        
        // PWA-05: Initialize field-level encryption keys
        this.fieldEncryptionKeys = await this.generateFieldEncryptionKeys();
        
        // Store key metadata (never store actual keys)
        await this.setSetting('encryptionKey', {
          created: new Date().toISOString(),
          algorithm: 'AES-GCM',
          keyDerivation: 'PBKDF2',
          iterations: this.CONSTANTS.ENCRYPTION.PBKDF2_ITERATIONS,
          saltLength: this.CONSTANTS.ENCRYPTION.SALT_LENGTH,
          salt: Array.from(salt),
          fieldEncryption: true,
          version: '2.0'
        });
        
      } else {
        // Use existing salt to regenerate keys
        const salt = new Uint8Array(keyData.salt);
        const keyMaterial = await this.deriveKeyFromPBKDF2('default-password', salt);
        
        this.encryptionKey = keyMaterial;
        this.encryptionSalt = salt;
        
        // PWA-05: Regenerate field-level encryption keys
        this.fieldEncryptionKeys = await this.generateFieldEncryptionKeys();
      }
      
      // PWA-05: Initialize encryption status tracking
      this.encryptionStatus = {
        enabled: true,
        fieldLevel: true,
        algorithm: 'AES-GCM',
        keyDerivation: 'PBKDF2'
      };
      
    } catch (error) {
      this.safeLog('error', 'Encryption initialization failed', { 
        error: this.sanitizeInput(error.message, { maxLength: 200 }) 
      });
      // Continue operation without encryption
      this.encryptionKey = null;
      this.encryptionSalt = null;
      this.fieldEncryptionKeys = null;
      this.encryptionStatus = { enabled: false };
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
          iterations: this.CONSTANTS.ENCRYPTION.PBKDF2_ITERATIONS, // 100,000 次迭代
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
      this.safeLog('error', 'PBKDF2 key derivation failed', { 
        error: this.sanitizeInput(error.message, { maxLength: 200 }) 
      });
      throw error;
    }
  }

  async performHealthCheck() {
    try {
      
      // 檢查並重新建立資料庫連線
      await this.ensureConnection();

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
      this.safeLog('error', 'Health check failed', { 
        error: this.sanitizeInput(error.message, { maxLength: 200 }) 
      });
      return { healthy: false, error: error.message };
    }
  }

  // PWA-24 直接處理方法已添加
  
  // 基本 CRUD 操作
  async storeCard(cardData) {
    try {
      // SEC-02: Use compatibility layer for access validation
      let authResult;
      if (this.compatibilityLayer) {
        authResult = await this.compatibilityLayer.validateAccess('write', 'card-data');
      } else {
        // Fallback to original validation
        authResult = await this.validateDatabaseAccess('write', 'card-data');
      }
      
      if (!authResult.authorized) {
        throw new Error(`存取被拒絕: ${authResult.reason}`);
      }
      
      const id = this.generateId();
      const now = new Date();
      
      // Normalize data format
      const normalizedData = this.normalizeCardDataForStorage(cardData);
      
      // PWA-05: Apply field-level encryption to sensitive data
      const encryptedData = await this.encryptCardData(normalizedData);
      
      // Generate fingerprint
      const fingerprint = await this.generateFingerprintSafe(normalizedData);
      
      const card = {
        id,
        type: this.detectCardType(normalizedData),
        data: encryptedData,
        created: now,
        modified: now,
        currentVersion: 1,
        checksum: await this.calculateChecksum(normalizedData),
        fingerprint,
        encrypted: true, // PWA-05: Mark as encrypted
        encryptionVersion: '2.0',
        tags: [],
        isFavorite: false
      };

      // PWA-06: Use secure transaction with integrity checks
      await this.safeTransaction(['cards'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('cards');
        
        return new Promise((resolve, reject) => {
          const request = store.add(card);
          request.onsuccess = () => resolve(request.result);
          request.onerror = (event) => {
            reject(new Error(`Failed to store card: ${event.target.error?.message || 'Unknown error'}`));
          };
        });
      });

      // Create version snapshot with encrypted data
      try {
        await this.createVersionSnapshotSafe(id, normalizedData, 'create');
      } catch (versionError) {
        this.safeLog('warn', 'Version snapshot creation failed', { 
          error: this.sanitizeInput(versionError.message, { maxLength: 200 }) 
        });
      }

      // SEC-03: Record successful storage
      if (this.healthMonitor) {
        await this.healthMonitor.recordEvent('card_stored', {
          cardId: id.substring(0, this.CONSTANTS.STORAGE.SUBSTRING_LENGTH) + '...',
          securityMode: this.securityMode
        });
      }
      
      return id;
    } catch (error) {
      // SEC-03: Record storage failure
      if (this.healthMonitor) {
        await this.healthMonitor.recordSecurityEvent('store_card_failed', {
          error: error.message,
          operation: 'storeCard',
          securityMode: this.securityMode
        });
      }
      
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('error', 'Store card failed', {
          error: error.message,
          operation: 'storeCard'
        });
      }
      throw error;
    }
  }

  /**
   * PWA-38: 直接儲存方法 - 接受外部傳遞的類型，跳過識別
   */
  async storeCardDirectly(cardData, cardType) {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const id = this.generateId();
      const now = new Date();
      
      // 使用傳遞的類型，或備用識別
      const finalCardType = cardType || this.detectCardType(cardData);
      

      
      // CRS-V31-002: 新增指紋生成到 storeCardDirectly 方法
      const fingerprint = await this.generateFingerprintSafe(cardData);
      
      // CRS-V31-004: 備用方法 - 如果指紋生成失敗，使用時間戳+隨機數
      if (!fingerprint || fingerprint.includes('fallback') || fingerprint.includes('emergency')) {
        this.safeLog('warn', 'Using fallback fingerprint for card', { 
          cardName: this.sanitizeInput(cardData.name || 'unknown', { maxLength: 50 }) 
        });
      }
      
      const card = {
        id,
        type: finalCardType,  // 直接使用傳遞的類型
        data: { ...cardData },
        created: now,
        modified: now,
        currentVersion: 1,
        fingerprint, // 新增指紋欄位
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
      // SEC-02: Use compatibility layer for access validation
      let authResult;
      if (this.compatibilityLayer) {
        authResult = await this.compatibilityLayer.validateAccess('read', 'card-data');
      } else {
        authResult = await this.validateDatabaseAccess('read', 'card-data');
      }
      
      if (!authResult.authorized) {
        throw new Error(`讀取被拒絕: ${authResult.reason}`);
      }
      
      const card = await this.safeTransaction(['cards'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('cards');
        
        return new Promise((resolve, reject) => {
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      
      if (!card) return null;
      
      // PWA-05: Decrypt sensitive fields if encrypted
      if (card.encrypted && card.data) {
        card.data = await this.decryptCardData(card.data);
      }
      
      return card;
    } catch (error) {
      this.safeLog('error', 'Get card operation failed', { 
        error: this.sanitizeInput(error.message, { maxLength: 200 }) 
      });
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
      card.fingerprint = await this.generateFingerprintSafe(updatedData);
      card.encrypted = false;

      const transaction = this.db.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      
      await new Promise((resolve, reject) => {
        const request = store.put(card);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 建立版本快照 - 使用專用管理器
      await this.createVersionSnapshotSafe(id, updatedData, 'update');

      return true;
    } catch (error) {
      this.safeLog('error', 'Update card operation failed', { 
        error: this.sanitizeInput(error.message, { maxLength: 200 }) 
      });
      throw error;
    }
  }

  async deleteCard(id) {
    try {
      await this.ensureConnection();
      await this.validateDeleteAuthorization(id);
      
      return await this.performCardDeletion(id);
    } catch (error) {
      return this.handleDeleteError(id, error);
    }
  }

  async validateDeleteAuthorization(id) {
    if (!window.SecurityAuthHandler) return;
    
    try {
      const authResult = window.SecurityAuthHandler.validateAccess('card-data', 'delete', {
        userId: 'current-user',
        resourceId: id,
        timestamp: Date.now()
      });
      
      if (authResult && !authResult.authorized) {
        throw new Error(`刪除被拒絕: ${authResult.reason}`);
      }
    } catch (authError) {
      this.safeLog('warn', 'Authorization check failed, proceeding with deletion', { 
        error: this.sanitizeInput(authError.message, { maxLength: 200 }) 
      });
    }
  }

  async performCardDeletion(id) {
    return await this.safeTransaction(['cards', 'versions'], 'readwrite', async (transaction) => {
      const cardsStore = transaction.objectStore('cards');
      const versionsStore = transaction.objectStore('versions');
      
      await this.validateCardExists(cardsStore, id);
      await this.deleteCardRecord(cardsStore, id);
      await this.deleteVersionHistory(versionsStore, id);
      
      this.logSuccessfulDeletion(id);
      return true;
    });
  }

  async validateCardExists(cardsStore, id) {
    const cardExists = await new Promise((resolve, reject) => {
      const request = cardsStore.get(id);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (!cardExists) {
      throw new Error(`名片 ${id} 不存在`);
    }
  }

  async deleteCardRecord(cardsStore, id) {
    await new Promise((resolve, reject) => {
      const request = cardsStore.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`刪除名片失敗: ${request.error?.message || 'Unknown error'}`));
    });
  }

  async deleteVersionHistory(versionsStore, id) {
    try {
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
        versionCursor.onerror = () => reject(new Error(`刪除版本歷史失敗: ${versionCursor.error?.message || 'Unknown error'}`));
      });
    } catch (versionError) {
      this.safeLog('warn', 'Failed to delete version history, but card deletion succeeded', { 
        error: this.sanitizeInput(versionError.message, { maxLength: 200 }) 
      });
    }
  }

  logSuccessfulDeletion(id) {
    if (window.SecurityDataHandler) {
      try {
        window.SecurityDataHandler.secureLog('info', 'Card deleted successfully', {
          cardId: id,
          operation: 'deleteCard',
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        this.safeLog('warn', 'Failed to log deletion', { 
          error: this.sanitizeInput(logError.message, { maxLength: 200 }) 
        });
      }
    }
  }

  handleDeleteError(id, error) {
    this.safeLog('error', 'Delete card operation failed', { 
      error: this.sanitizeInput(error.message, { maxLength: 200 }) 
    });
    
    this.logDeletionError(id, error);
    
    if (error.message.includes('not found') || error.message.includes('不存在')) {
      throw new Error('要刪除的名片不存在');
    } else if (error.message.includes('Transaction')) {
      throw new Error('資料庫操作失敗，請稍後再試');
    } else if (error.message.includes('被拒絕')) {
      throw error;
    } else {
      throw new Error(`刪除名片失敗: ${error.message}`);
    }
  }

  logDeletionError(id, error) {
    if (window.SecurityDataHandler) {
      try {
        window.SecurityDataHandler.secureLog('error', 'Delete card failed', {
          cardId: id,
          error: error.message,
          operation: 'deleteCard',
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        this.safeLog('warn', 'Failed to log deletion error', { 
          error: this.sanitizeInput(logError.message, { maxLength: 200 }) 
        });
      }
    }
  }

  /**
   * CORE-03: 指紋索引與查詢優化
   * 高效能指紋查詢，支援批量查詢和快取
   */
  async findCardsByFingerprint(fingerprint, options = {}) {
    const startTime = performance.now();
    
    try {
      // 輸入驗證
      if (!fingerprint || typeof fingerprint !== 'string') {
        throw new Error('Invalid fingerprint parameter');
      }
      
      // 支援批量查詢
      if (Array.isArray(fingerprint)) {
        return await this.batchFindCardsByFingerprints(fingerprint, options);
      }
      
      const result = await this.safeTransaction(['cards'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('cards');
        const index = store.index('fingerprint');
        
        return new Promise((resolve, reject) => {
          const request = index.getAll(fingerprint);
          
          request.onsuccess = () => {
            const cards = request.result;
            
            // 應用額外篩選
            let filteredCards = cards;
            if (options.includeDeleted === false) {
              filteredCards = cards.filter(card => !card.deleted);
            }
            if (options.limit && options.limit > 0) {
              filteredCards = filteredCards.slice(0, options.limit);
            }
            
            resolve(filteredCards);
          };
          
          request.onerror = () => reject(request.error);
        });
      });
      
      const duration = performance.now() - startTime;
      
      // 效能監控
      if (duration > this.CONSTANTS.PERFORMANCE.SLOW_QUERY_THRESHOLD) {
        this.safeLog('warn', 'Slow fingerprint query detected', { 
          duration: Math.round(duration), 
          fingerprint: this.sanitizeInput(fingerprint.substring(0, 16) + '...', { maxLength: 20 }) 
        });
      }
      
      // 安全日誌
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('info', 'Fingerprint query completed', {
          fingerprint: fingerprint.substring(0, this.CONSTANTS.LIMITS.FINGERPRINT_LENGTH) + '...',
          resultCount: result.length,
          duration: Math.round(duration)
        });
      }
      
      return result;
    } catch (error) {
      console.error('[Storage] Find cards by fingerprint failed:', error);
      
      // 安全日誌記錄錯誤
      if (window.SecurityDataHandler) {
        window.SecurityDataHandler.secureLog('error', 'Fingerprint query failed', {
          error: error.message,
          fingerprint: fingerprint ? fingerprint.substring(0, this.CONSTANTS.LIMITS.FINGERPRINT_LENGTH) + '...' : 'invalid'
        });
      }
      
      return [];
    }
  }
  
  /**
   * CORE-03: 批量指紋查詢優化
   */
  async batchFindCardsByFingerprints(fingerprints, options = {}) {
    try {
      const batchSize = options.batchSize || this.CONSTANTS.LIMITS.BATCH_SIZE;
      const results = new Map();
      
      // 分批處理避免阻塞
      for (let i = 0; i < fingerprints.length; i += batchSize) {
        const batch = fingerprints.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (fp) => {
          const cards = await this.findCardsByFingerprint(fp, { ...options, limit: options.limit });
          return { fingerprint: fp, cards };
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ fingerprint, cards }) => {
          results.set(fingerprint, cards);
        });
        
        // 避免阻塞 UI
        if (i + batchSize < fingerprints.length) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
      
      return results;
    } catch (error) {
      console.error('[Storage] Batch fingerprint query failed:', error);
      return new Map();
    }
  }

  async listCards(filter = {}) {
    try {
      return await this.safeTransaction(['cards'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('cards');
        
        // 優化的查詢策略
        let cursor;
        const maxResults = filter.limit || this.CONSTANTS.LIMITS.MAX_RESULTS;
        
        if (filter.fingerprint) {
          const index = store.index('fingerprint');
          cursor = index.openCursor(IDBKeyRange.only(filter.fingerprint));
        } else if (filter.type) {
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
        
        return new Promise((resolve, reject) => {
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
              resolve(cards);
            }
          };
          cursor.onerror = (event) => {
            reject(new Error(`Failed to list cards: ${event.target.error?.message || 'Unknown error'}`));
          };
        });
      });
    } catch (error) {
      console.error('[Storage] List cards failed:', error);
      return [];
    }
  }

  /**
   * 安全建立版本快照 - 使用專用管理器或備用方案
   */
  async createVersionSnapshotSafe(cardId, data, changeType = 'update', description = '') {
    try {
      if (this.versionManager) {
        return await this.versionManager.createVersionSnapshot(cardId, data, changeType, description);
      }
      
      // 備用方案：直接實作
      const card = await this.getCard(cardId);
      const currentVersion = card ? card.currentVersion : 1;
      
      const versionId = `${cardId}_v${currentVersion}`;
      const version = {
        id: versionId,
        cardId,
        version: currentVersion,
        data: this.safeJSONClone(data),
        timestamp: new Date(),
        changeType,
        description,
        checksum: await this.calculateChecksum(data)
      };

      const transaction = this.db.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      
      await new Promise((resolve, reject) => {
        const request = store.put(version);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

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
      const result = await this.safeTransaction(['settings'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('settings');
        
        return new Promise((resolve, reject) => {
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      return result ? result.value : null;
    } catch (error) {
      console.error('[Storage] Get setting failed:', error);
      return null;
    }
  }

  async setSetting(key, value) {
    try {
      await this.safeTransaction(['settings'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('settings');
        
        return new Promise((resolve, reject) => {
          const request = store.put({ key, value, updated: new Date() });
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });

      return true;
    } catch (error) {
      console.error('[Storage] Set setting failed:', error);
      return false;
    }
  }

  /**
   * 安全日誌記錄方法 - CWE-117 防護
   * @param {string} level - 日誌級別
   * @param {string} message - 日誌訊息
   * @param {Object} context - 上下文資料
   */
  safeLog(level, message, context = {}) {
    if (this.secureLogger) {
      // 使用 SecureLogger 進行安全日誌記錄
      this.secureLogger[level](message, {
        component: 'PWACardStorage',
        ...context
      });
    } else {
      // 備用安全日誌記錄
      const sanitizedMessage = String(message).replace(/[\x00-\x1F\x7F-\x9F]/g, '').substring(0, this.CONSTANTS.LIMITS.MAX_LOG_LENGTH);
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [PWACardStorage] ${sanitizedMessage}`;
      
      switch (level) {
        case 'error':
          console.error(logEntry);
          break;
        case 'warn':
          console.warn(logEntry);
          break;
        case 'debug':
          console.debug(logEntry);
          break;
        default:
          console.log(logEntry);
      }
    }
  }

  /**
   * 安全輸入清理方法 - XSS 防護
   * @param {any} input - 需要清理的輸入
   * @param {Object} options - 清理選項
   */
  sanitizeInput(input, options = {}) {
    if (XSSProtection && XSSProtection.setTextContent) {
      // 使用 XSSProtection 進行安全清理
      const tempDiv = document.createElement('div');
      XSSProtection.setTextContent(tempDiv, String(input), options);
      return tempDiv.textContent;
    } else {
      // 備用安全清理
      if (typeof input !== 'string') {
        input = String(input);
      }
      return input
        .replace(/[<>"'&]/g, (match) => {
          const escapeMap = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return escapeMap[match];
        })
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .substring(0, options.maxLength || this.CONSTANTS.LIMITS.MAX_INPUT_LENGTH);
    }
  }

  /**
   * 標準化名片資料格式 - PWA-23 根本性修復版本 + XSS 防護
   * 從根本上解決資料遺失和雙語格式問題，並防護 XSS 攻擊
   */
  normalizeCardDataForStorage(cardData) {
    const normalized = this.safeJSONClone(cardData);
    const defaultValues = this.getDefaultCardValues();
    
    this.ensureAllFieldsExist(normalized, defaultValues);
    this.processGreetingsField(normalized, defaultValues);
    this.processStringFields(normalized, defaultValues);
    this.performFinalValidation(normalized, defaultValues);
    
    return normalized;
  }

  getDefaultCardValues() {
    return {
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
  }

  ensureAllFieldsExist(normalized, defaultValues) {
    Object.keys(defaultValues).forEach(field => {
      if (normalized[field] === undefined || normalized[field] === null) {
        normalized[field] = defaultValues[field];
      } else if (typeof normalized[field] === 'string') {
        normalized[field] = this.sanitizeInput(normalized[field], { 
          maxLength: this.CONSTANTS.LIMITS.MAX_FIELD_LENGTH 
        });
      }
    });
  }

  processGreetingsField(normalized, defaultValues) {
    if (Array.isArray(normalized.greetings)) {
      const processedGreetings = this.extractValidGreetings(normalized.greetings);
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
  }

  extractValidGreetings(greetingsArray) {
    const processedGreetings = [];
    for (let i = 0; i < greetingsArray.length; i++) {
      const extractedGreeting = this.extractStringFromGreeting(greetingsArray[i]);
      if (extractedGreeting && extractedGreeting.trim().length > 0) {
        processedGreetings.push(extractedGreeting);
      }
    }
    return processedGreetings;
  }

  processStringFields(normalized, defaultValues) {
    const stringFields = ['name', 'title', 'department', 'organization', 'email', 'phone', 'mobile', 'avatar', 'address', 'socialNote'];
    const invalidStrings = ['[object Object]', 'undefined', 'null', '[object Undefined]', '[object Null]'];
    
    stringFields.forEach(field => {
      const originalValue = normalized[field];
      
      if (typeof originalValue === 'object' && originalValue !== null) {
        const extractedValue = this.extractStringFromGreeting(originalValue);
        normalized[field] = extractedValue || defaultValues[field] || '';
      } else if (typeof originalValue === 'string') {
        const trimmed = originalValue.trim();
        normalized[field] = (!trimmed || invalidStrings.includes(trimmed)) ? 
          (defaultValues[field] || '') : trimmed;
      } else if (originalValue === null || originalValue === undefined) {
        normalized[field] = defaultValues[field] || '';
      } else {
        normalized[field] = String(originalValue).trim() || defaultValues[field] || '';
      }
    });
  }

  performFinalValidation(normalized, defaultValues) {
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
  }
  
  /**
   * 從複雜的問候語格式中提取字串 - PWA-23 根本性修復版本
   * 確保雙語格式完整保持，解決資料遺失問題
   */
  extractStringFromGreeting(greeting) {
    const invalidStrings = this.getInvalidStrings();
    
    if (this.isNullOrUndefined(greeting)) {
      return '';
    }
    
    if (typeof greeting === 'string') {
      return this.processStringGreeting(greeting, invalidStrings);
    }
    
    if (typeof greeting === 'object' && greeting !== null) {
      return this.processObjectGreeting(greeting, invalidStrings);
    }
    
    return this.processOtherTypeGreeting(greeting);
  }

  /**
   * 獲取無效字串列表
   */
  getInvalidStrings() {
    return [
      '[object Object]', 'undefined', 'null', '[object Undefined]', 
      '[object Null]', 'NaN', '[object NaN]', 'false', 'true'
    ];
  }

  /**
   * 檢查是否為 null 或 undefined
   */
  isNullOrUndefined(value) {
    return value === null || value === undefined;
  }

  /**
   * 處理字串類型的問候語
   */
  processStringGreeting(greeting, invalidStrings) {
    const trimmed = greeting.trim();
    
    if (!trimmed || invalidStrings.includes(trimmed)) {
      return '';
    }
    
    return trimmed;
  }

  /**
   * 處理物件類型的問候語
   */
  processObjectGreeting(greeting, invalidStrings) {
    // 處理標準雙語物件
    if (greeting.zh !== undefined && greeting.en !== undefined) {
      return this.processBilingualObject(greeting, invalidStrings);
    }
    
    // 處理單一語言物件
    const singleLangResult = this.processSingleLanguageObject(greeting, invalidStrings);
    if (singleLangResult) {
      return singleLangResult;
    }
    
    // 嘗試從其他屬性提取值
    return this.extractFromObjectProperties(greeting, invalidStrings);
  }

  /**
   * 處理雙語物件
   */
  processBilingualObject(greeting, invalidStrings) {
    const zhValue = this.normalizeLanguageValue(greeting.zh);
    const enValue = this.normalizeLanguageValue(greeting.en);
    
    if (this.isValidLanguageValue(zhValue, invalidStrings) && 
        this.isValidLanguageValue(enValue, invalidStrings)) {
      return `${zhValue}~${enValue}`;
    }
    
    if (this.isValidLanguageValue(zhValue, invalidStrings)) {
      return zhValue;
    }
    
    if (this.isValidLanguageValue(enValue, invalidStrings)) {
      return enValue;
    }
    
    return '';
  }

  /**
   * 處理單一語言物件
   */
  processSingleLanguageObject(greeting, invalidStrings) {
    if (greeting.zh !== undefined) {
      const zhValue = this.normalizeLanguageValue(greeting.zh);
      if (this.isValidLanguageValue(zhValue, invalidStrings)) {
        return zhValue;
      }
    }
    
    if (greeting.en !== undefined) {
      const enValue = this.normalizeLanguageValue(greeting.en);
      if (this.isValidLanguageValue(enValue, invalidStrings)) {
        return enValue;
      }
    }
    
    return null;
  }

  /**
   * 從物件屬性中提取值
   */
  extractFromObjectProperties(greeting, invalidStrings) {
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

  /**
   * 標準化語言值
   */
  normalizeLanguageValue(value) {
    return typeof value === 'string' ? value.trim() : String(value || '').trim();
  }

  /**
   * 檢查語言值是否有效
   */
  isValidLanguageValue(value, invalidStrings) {
    return value && !invalidStrings.includes(value);
  }

  /**
   * 處理其他類型的問候語
   */
  processOtherTypeGreeting(greeting) {
    if (typeof greeting === 'number' || typeof greeting === 'boolean') {
      return String(greeting);
    }
    return '';
  }

  // ===== 連線管理和監控方法 =====
  
  /**
   * 設置連線監控機制
   */
  setupConnectionMonitoring() {
    // 定期檢查連線狀態
    this.connectionCheckInterval = setInterval(async () => {
      try {
        await this.ensureConnection();
      } catch (error) {
        console.error('[Storage] Connection check failed:', error);
      }
    }, this.CONSTANTS.TIME.CONNECTION_CHECK_INTERVAL);
    
    // 監聽頁面可見性變化
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        try {
          await this.ensureConnection();
        } catch (error) {
          console.error('[Storage] Visibility change connection check failed:', error);
        }
      }
    });
  }
  
  /**
   * 確保資料庫連線有效，如無效則重新建立
   */
  async ensureConnection() {
    try {
      // 檢查連線是否存在且有效
      if (!this.db || this.db.readyState === 'closed') {
        console.log('[Storage] Reconnecting to database...');
        this.db = await this.openDatabase();
        console.log('[Storage] Database reconnected successfully');
        return true;
      }
      
      // 測試連線是否可用
      try {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        
        await new Promise((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          
          // 設置超時
          setTimeout(() => reject(new Error('Connection test timeout')), this.CONSTANTS.PERFORMANCE.CONNECTION_TEST_TIMEOUT);
        });
        
        return true;
      } catch (testError) {
        console.warn('[Storage] Connection test failed, reconnecting...', testError);
        this.db = await this.openDatabase();
        return true;
      }
    } catch (error) {
      console.error('[Storage] Failed to ensure connection:', error);
      throw error;
    }
  }
  
  /**
   * 安全執行資料庫事務
   */
  async safeTransaction(storeNames, mode, operation) {
    const maxRetries = this.CONSTANTS.PERFORMANCE.MAX_RETRIES;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 確保連線有效
        await this.ensureConnection();
        
        const transaction = this.db.transaction(storeNames, mode);
        
        // 設置事務超時
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Transaction timeout')), this.CONSTANTS.PERFORMANCE.TRANSACTION_TIMEOUT);
        });
        
        const operationPromise = operation(transaction);
        
        return await Promise.race([operationPromise, timeoutPromise]);
      } catch (error) {
        lastError = error;
        console.warn(`[Storage] Transaction attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // 等待後重試
          const retryDelayMs = this.CONSTANTS.TIME.MILLISECONDS_PER_SECOND * attempt;
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          // 強制重新連線
          this.db = null;
        }
      }
    }
    
    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError.message}`);
  }
  
  /**
   * 清理連線監控
   */
  cleanup() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // 工具方法
  generateId() {
    const randomPart = Math.random().toString(this.CONSTANTS.MATH.BASE36_RADIX)
      .substring(2, 2 + this.CONSTANTS.MATH.RANDOM_ID_LENGTH);
    return 'card_' + Date.now() + '_' + randomPart;
  }

  /**
   * CRS-V31-005: 檢查是否需要遷移
   */
  async checkMigrationNeeded() {
    try {
      const storedVersion = localStorage.getItem('pwa-db-version');
      const currentVersion = this.dbVersion;
      
      if (!storedVersion) {
        return {
          required: true,
          reason: 'First time initialization',
          fromVersion: 0,
          toVersion: currentVersion
        };
      }
      
      const stored = parseInt(storedVersion);
      if (stored < currentVersion) {
        return {
          required: true,
          reason: 'Database upgrade required',
          fromVersion: stored,
          toVersion: currentVersion
        };
      }
      
      // 檢查是否有名片缺少指紋
      const cardsWithoutFingerprints = await this.countCardsWithoutFingerprints();
      if (cardsWithoutFingerprints > 0) {
        return {
          required: true,
          reason: `${cardsWithoutFingerprints} cards missing fingerprints`,
          fromVersion: stored,
          toVersion: currentVersion
        };
      }
      
      return {
        required: false,
        reason: 'Database up to date'
      };
    } catch (error) {
      return {
        required: true,
        reason: `Migration check failed: ${error.message}`,
        fromVersion: 0,
        toVersion: this.dbVersion
      };
    }
  }

  /**
   * 統計缺少指紋的名片數量
   */
  async countCardsWithoutFingerprints() {
    try {
      const cards = await this.listCards();
      return cards.filter(card => 
        !card.fingerprint || 
        !card.fingerprint.startsWith('fingerprint_')
      ).length;
    } catch (error) {
      console.error('[Storage] Count cards without fingerprints failed:', error);
      return 0;
    }
  }

  /**
   * CRS-V31-005: 資料庫遷移驗證 (舊方法保留相容性)
   */
  validateDatabaseMigration() {
    try {
      const currentVersion = this.dbVersion;
      const storedVersion = localStorage.getItem('pwa-db-version');
      
      if (storedVersion && parseInt(storedVersion) > currentVersion) {
        console.warn('[Storage] Database downgrade detected, clearing storage');
        // 在降級情況下清理儲存
        localStorage.removeItem('pwa-db-version');
      }
      
      localStorage.setItem('pwa-db-version', currentVersion.toString());
    } catch (error) {
      console.error('[Storage] Migration validation failed:', error);
    }
  }

  /**
   * 安全生成指紋 - 使用專用管理器或備用方案
   */
  async generateFingerprintSafe(cardData) {
    try {
      if (this.duplicateDetector) {
        return await this.duplicateDetector.generateFingerprint(cardData);
      }
      
      // 備用方案：直接使用ContentFingerprintGenerator
      if (window.ContentFingerprintGenerator) {
        const generator = new window.ContentFingerprintGenerator();
        return await generator.generateFingerprint(cardData);
      }
      
      // 最終備用方案：簡單雜湊
      const content = `${cardData.name || ''}|${cardData.email || ''}`;
      const hash = await this.calculateChecksum({ content });
      return `fingerprint_${hash.substring(0, this.CONSTANTS.MATH.FINGERPRINT_SUBSTRING_LENGTH)}`;
    } catch (error) {
      console.error('[Storage] Generate fingerprint failed:', error);
      const timestamp = Date.now();
      const random = Math.random().toString(this.CONSTANTS.MATH.BASE36_RADIX)
        .substring(2, 2 + this.CONSTANTS.STORAGE.RANDOM_STRING_LENGTH);
      return `fingerprint_fallback_${timestamp}_${random}`;
    }
  }

  // 保留備用識別（僅在沒有傳遞類型時使用）
  detectCardType(data) {
    // PWA-38: 不再調用 PWA Integration，避免重複識別
    const isBilingual = this.isBilingualCard(data);
    const isGov = this.isGovernmentCard(data);
    const isShinGuang = this.isShinGuangBuilding(data);
    
    if (isBilingual) {
      return isGov ? (isShinGuang ? 'bilingual1' : 'bilingual') : 'personal-bilingual';
    }
    
    return isGov ? (isShinGuang ? 'index1' : 'index') : 'personal';
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
  

  
  /**
   * PWA-33 標準解碼修復：使用 9 大名片頁面的標準解碼方式
   */
  fullyDecodeUrlData(data) {
    try {
      let decoded = decodeURIComponent(data);
      const paddingLength = (this.CONSTANTS.MATH.PADDING_MODULO - decoded.length % this.CONSTANTS.MATH.PADDING_MODULO) % this.CONSTANTS.MATH.PADDING_MODULO;
      const padding = '='.repeat(paddingLength);
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
      // SEC-01: 安全的數據序列化 - 使用 SecurityCore
      let jsonString;
      try {
        if (this.securityCore && this.securityCore.safeJSONParse) {
          // Use SecurityCore for safe serialization
          jsonString = JSON.stringify(data, (key, value) => {
            // 過濾危險屬性
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
              return undefined;
            }
            return value;
          });
        } else {
          // Fallback safe serialization
          jsonString = JSON.stringify(data, (key, value) => {
            // 過濾危險屬性
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
              return undefined;
            }
            return value;
          });
        }
      } catch (error) {
        console.error('[Storage] Safe JSON stringify failed:', error);
        throw new Error('Data serialization failed');
      }
      
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      
      // 使用 SHA-256 計算校驗和
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      const hexBase = 16;
      const padLength = 2;
      return hashArray.map(b => b.toString(hexBase).padStart(padLength, '0')).join('');
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
        return new RegExp(`^[a-f0-9]{${this.CONSTANTS.STORAGE.HASH_LENGTH}}$`, 'i').test(card.checksum);
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

  // PWA-05: Enhanced field-level encryption methods
  async generateFieldEncryptionKeys() {
    try {
      const sensitiveFields = ['email', 'phone', 'mobile', 'address', 'socialNote'];
      const keys = {};
      
      for (const field of sensitiveFields) {
        // Derive unique key for each sensitive field
        const saltLength = this.CONSTANTS.MATH.FINGERPRINT_SUBSTRING_LENGTH;
        const fieldSalt = crypto.getRandomValues(new Uint8Array(saltLength));
        const fieldKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: fieldSalt,
            iterations: this.CONSTANTS.ENCRYPTION.FIELD_PBKDF2_ITERATIONS,
            hash: 'SHA-256'
          },
          await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(`field-${field}-${Date.now()}`),
            'PBKDF2',
            false,
            ['deriveKey']
          ),
          {
            name: 'AES-GCM',
            length: 256
          },
          false,
          ['encrypt', 'decrypt']
        );
        
        keys[field] = { key: fieldKey, salt: fieldSalt };
      }
      
      return keys;
    } catch (error) {
      console.error('[Storage] Field encryption key generation failed:', error);
      return null;
    }
  }

  async encryptSensitiveField(fieldName, value) {
    if (!this.fieldEncryptionKeys || !this.fieldEncryptionKeys[fieldName] || !value) {
      return value;
    }

    try {
      const { key } = this.fieldEncryptionKeys[fieldName];
      const iv = crypto.getRandomValues(new Uint8Array(this.CONSTANTS.ENCRYPTION.IV_LENGTH));
      const encodedData = new TextEncoder().encode(String(value));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );
      
      return {
        encrypted: true,
        data: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        field: fieldName,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`[Storage] Field encryption failed for ${fieldName}:`, error);
      return value;
    }
  }

  async decryptSensitiveField(fieldName, encryptedValue) {
    if (!encryptedValue || typeof encryptedValue !== 'object' || !encryptedValue.encrypted) {
      return encryptedValue;
    }

    if (!this.fieldEncryptionKeys || !this.fieldEncryptionKeys[fieldName]) {
      console.warn(`[Storage] No decryption key for field: ${fieldName}`);
      return '[ENCRYPTED]';
    }

    try {
      const { key } = this.fieldEncryptionKeys[fieldName];
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedValue.iv) },
        key,
        new Uint8Array(encryptedValue.data)
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error(`[Storage] Field decryption failed for ${fieldName}:`, error);
      return '[DECRYPTION_FAILED]';
    }
  }

  async encryptCardData(cardData) {
    if (!this.fieldEncryptionKeys) return cardData;

    try {
      const encryptedData = { ...cardData };
      const sensitiveFields = ['email', 'phone', 'mobile', 'address', 'socialNote'];
      
      for (const field of sensitiveFields) {
        if (encryptedData[field]) {
          encryptedData[field] = await this.encryptSensitiveField(field, encryptedData[field]);
        }
      }
      
      return encryptedData;
    } catch (error) {
      console.error('[Storage] Card data encryption failed:', error);
      return cardData;
    }
  }

  async decryptCardData(cardData) {
    if (!this.fieldEncryptionKeys) return cardData;

    try {
      const decryptedData = { ...cardData };
      const sensitiveFields = ['email', 'phone', 'mobile', 'address', 'socialNote'];
      
      for (const field of sensitiveFields) {
        if (decryptedData[field]) {
          decryptedData[field] = await this.decryptSensitiveField(field, decryptedData[field]);
        }
      }
      
      return decryptedData;
    } catch (error) {
      console.error('[Storage] Card data decryption failed:', error);
      return cardData;
    }
  }

  // Legacy encryption methods (maintained for compatibility)
  async encryptData(data) {
    if (!this.encryptionKey) return data;

    try {
      const iv = crypto.getRandomValues(new Uint8Array(this.CONSTANTS.ENCRYPTION.IV_LENGTH));
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
      if (!encryptedData.data || !encryptedData.iv) {
        throw new Error('Invalid encrypted data format');
      }
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        this.encryptionKey,
        new Uint8Array(encryptedData.data)
      );
      
      const decryptedText = new TextDecoder().decode(decrypted);
      return this.safeJSONParse(decryptedText);
    } catch (error) {
      console.error('[Storage] Decryption failed:', error);
      throw error;
    }
  }

  // PWA-06: Database access control methods
  async validateDatabaseAccess(operation, resourceType, context = {}) {
    try {
      // Check if WebAuthn authentication is available and valid
      if (window.SecurityAuthHandler) {
        const authResult = window.SecurityAuthHandler.validateAccess(resourceType, operation, {
          userId: 'current-user',
          timestamp: Date.now(),
          ...context
        });
        
        if (authResult && !authResult.authorized) {
          return {
            authorized: false,
            reason: authResult.reason || 'Access denied'
          };
        }
      }
      
      // Additional database-level access checks
      const dbAccessResult = await this.checkDatabasePermissions(operation, resourceType);
      if (!dbAccessResult.allowed) {
        return {
          authorized: false,
          reason: dbAccessResult.reason
        };
      }
      
      return {
        authorized: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[Storage] Database access validation failed:', error);
      return {
        authorized: false,
        reason: 'Access validation failed'
      };
    }
  }

  async checkDatabasePermissions(operation, resourceType) {
    try {
      // Check database connection health
      if (!this.db || this.db.readyState === 'closed') {
        return {
          allowed: false,
          reason: 'Database connection unavailable'
        };
      }
      
      // Check operation-specific permissions
      const operationLimits = {
        read: { maxPerMinute: 100 },
        write: { maxPerMinute: 50 },
        delete: { maxPerMinute: 10 }
      };
      
      const currentLimit = operationLimits[operation];
      if (currentLimit) {
        const rateLimitResult = await this.checkRateLimit(operation, currentLimit.maxPerMinute);
        if (!rateLimitResult.allowed) {
          return {
            allowed: false,
            reason: `Rate limit exceeded for ${operation} operations`
          };
        }
      }
      
      return {
        allowed: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[Storage] Permission check failed:', error);
      return {
        allowed: false,
        reason: 'Permission check failed'
      };
    }
  }

  async checkRateLimit(operation, maxPerMinute) {
    try {
      const rateLimitKey = `rateLimit_${operation}`;
      const now = Date.now();
      const oneMinuteAgo = now - this.CONSTANTS.TIME.ONE_MINUTE;
      
      // Get current rate limit data
      let rateLimitData = await this.getSetting(rateLimitKey) || {
        operations: [],
        lastCleanup: now
      };
      
      // Clean up old entries
      rateLimitData.operations = rateLimitData.operations.filter(timestamp => timestamp > oneMinuteAgo);
      
      // Check if limit exceeded
      if (rateLimitData.operations.length >= maxPerMinute) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: ${rateLimitData.operations.length}/${maxPerMinute} per minute`
        };
      }
      
      // Add current operation
      rateLimitData.operations.push(now);
      rateLimitData.lastCleanup = now;
      
      // Update rate limit data
      await this.setSetting(rateLimitKey, rateLimitData);
      
      return {
        allowed: true,
        remaining: maxPerMinute - rateLimitData.operations.length
      };
    } catch (error) {
      console.error('[Storage] Rate limit check failed:', error);
      // Allow operation if rate limit check fails
      return { allowed: true };
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
        storageUsedPercent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER) : 0,
        lastHealthCheck: await this.getSetting('lastHealthCheck'),
        encryptionStatus: this.encryptionStatus || { enabled: false }
      };
    } catch (error) {
      console.error('[Storage] Get storage stats failed:', error);
      return {
        totalCards: 0,
        storageUsed: 0,
        storageQuota: 0,
        storageUsedPercent: 0,
        encryptionStatus: { enabled: false }
      };
    }
  }

  /**
   * 記憶體管理優化
   */
  async optimizeMemoryUsage() {
    try {
      // 清理過期的版本記錄
      const oneWeekAgo = new Date(Date.now() - this.CONSTANTS.TIME.ONE_WEEK_MS);
      await this.cleanupVersionsOlderThan(oneWeekAgo);
      
      // 清理過期的備份
      const oneMonthAgo = new Date(Date.now() - this.CONSTANTS.TIME.ONE_MONTH_MS);
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

  /**
   * STORAGE-04: 處理遷移失敗
   */
  async handleMigrationFailure(error) {
    try {
      console.warn('[Storage] Handling migration failure:', error.message);
      
      // 檢查是否為非關鍵性錯誤
      const isNonCritical = this.isNonCriticalMigrationError(error);
      
      if (isNonCritical) {
        console.log('[Storage] Non-critical migration error, continuing with degraded functionality');
        return {
          canContinue: true,
          degradedMode: true,
          reason: error.message
        };
      }
      
      // 關鍵性錯誤，嘗試清理和重試
      console.error('[Storage] Critical migration error, attempting cleanup');
      
      try {
        // 清理部分遷移資料
        await this.cleanupPartialMigration();
        
        return {
          canContinue: false,
          requiresManualIntervention: true,
          reason: error.message
        };
      } catch (cleanupError) {
        console.error('[Storage] Cleanup also failed:', cleanupError);
        return {
          canContinue: false,
          criticalFailure: true,
          reason: `Migration and cleanup failed: ${error.message}`
        };
      }
    } catch (handlerError) {
      console.error('[Storage] Migration failure handler failed:', handlerError);
      return {
        canContinue: false,
        criticalFailure: true,
        reason: 'Migration failure handler crashed'
      };
    }
  }
  
  /**
   * STORAGE-04: 判斷是否為非關鍵性遷移錯誤
   */
  isNonCriticalMigrationError(error) {
    const nonCriticalPatterns = [
      'fingerprint generation failed',
      'version snapshot creation failed',
      'cleanup failed',
      'statistics update failed'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return nonCriticalPatterns.some(pattern => errorMessage.includes(pattern));
  }
  
  /**
   * STORAGE-04: 清理部分遷移資料
   */
  async cleanupPartialMigration() {
    try {
      console.log('[Storage] Cleaning up partial migration data...');
      
      // 清理可能的部分更新
      const cards = await this.listCards();
      let cleanedCount = 0;
      
      for (const card of cards) {
        // 檢查是否有部分更新的標記
        if (card.migrationStatus === 'pending' || card.migrationStatus === 'failed') {
          try {
            // 重設遷移狀態
            card.migrationStatus = null;
            await this.safeTransaction(['cards'], 'readwrite', async (transaction) => {
              const store = transaction.objectStore('cards');
              store.put(card);
            });
            cleanedCount++;
          } catch (cleanupError) {
            console.warn(`[Storage] Failed to cleanup card ${card.id}:`, cleanupError);
          }
        }
      }
      
      console.log(`[Storage] Cleaned up ${cleanedCount} partially migrated cards`);
    } catch (error) {
      console.error('[Storage] Cleanup partial migration failed:', error);
      throw error;
    }
  }
  
  /**
   * STORAGE-04: 計算系統校驗和
   */
  async calculateSystemChecksum() {
    try {
      const cards = await this.listCards();
      const cardChecksums = cards.map(card => card.checksum || '').join('|');
      const systemData = {
        dbVersion: this.dbVersion,
        cardCount: cards.length,
        cardChecksums,
        timestamp: Date.now()
      };
      
      return await this.calculateChecksum(systemData);
    } catch (error) {
      console.error('[Storage] Calculate system checksum failed:', error);
      return '';
    }
  }
  
  /**
   * STORAGE-04: 記錄初始化完成
   */
  async recordInitializationComplete(healthResult) {
    try {
      await this.setSetting('lastInitialization', {
        timestamp: new Date().toISOString(),
        dbVersion: this.dbVersion,
        healthStatus: healthResult.healthy ? 'healthy' : 'warning',
        corruptedCards: healthResult.corruptedCount || 0,
        managersInitialized: {
          migrationValidator: !!this.migrationValidator,
          batchMigrator: !!this.batchMigrator,
          migrationLogManager: !!this.migrationLogManager,
          duplicateDetector: !!this.duplicateDetector,
          versionManager: !!this.versionManager
        }
      });
    } catch (error) {
      console.warn('[Storage] Failed to record initialization completion:', error);
    }
  }
  
  /**
   * STORAGE-04: 記錄初始化失敗
   */
  async recordInitializationFailure(error) {
    try {
      await this.setSetting('lastInitializationFailure', {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack?.substring(0, this.CONSTANTS.STORAGE.STACK_TRACE_LENGTH),
        dbVersion: this.dbVersion
      });
    } catch (recordError) {
      console.warn('[Storage] Failed to record initialization failure:', recordError);
    }
  }

  // PWA-07: Secure data backup and restore functionality
  async createSecureBackup(options = {}) {
    try {
      await this.validateBackupPermissions();
      
      const backupOptions = this.parseBackupOptions(options);
      const backupData = await this.collectBackupData(backupOptions);
      const finalBackupData = await this.processBackupData(backupData, backupOptions);
      const backupRecord = await this.storeBackupRecord(finalBackupData, backupData);
      
      return this.createBackupSuccessResult(backupRecord, finalBackupData, backupData);
    } catch (error) {
      console.error('[Storage] Secure backup creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateBackupPermissions() {
    const authResult = await this.validateDatabaseAccess('read', 'backup-data');
    if (!authResult.authorized) {
      throw new Error(`Backup access denied: ${authResult.reason}`);
    }
    console.log('[Storage] Creating secure backup...');
  }

  parseBackupOptions(options) {
    return {
      includeVersions: options.includeVersions || false,
      encrypt: options.encrypt !== false,
      compressionLevel: options.compressionLevel || 'medium'
    };
  }

  async collectBackupData(backupOptions) {
    const cards = await this.listCards();
    const settings = await this.getAllSettings();
    let versions = [];
    
    if (backupOptions.includeVersions) {
      versions = await this.getAllVersions();
    }
    
    const decryptedCards = await this.decryptCardsForBackup(cards);
    
    return {
      cards: decryptedCards,
      settings: settings.filter(s => !s.key.includes('encryptionKey')),
      versions
    };
  }

  async decryptCardsForBackup(cards) {
    const decryptedCards = [];
    for (const card of cards) {
      if (card.encrypted && card.data) {
        const decryptedCard = { ...card };
        decryptedCard.data = await this.decryptCardData(card.data);
        decryptedCards.push(decryptedCard);
      } else {
        decryptedCards.push(card);
      }
    }
    return decryptedCards;
  }

  async processBackupData(collectedData, backupOptions) {
    const backupData = {
      metadata: {
        version: '2.0',
        created: new Date().toISOString(),
        dbVersion: this.dbVersion,
        totalCards: collectedData.cards.length,
        includeVersions: backupOptions.includeVersions,
        encrypted: backupOptions.encrypt,
        compressionLevel: backupOptions.compressionLevel
      },
      ...collectedData
    };
    
    const integrityHash = await this.calculateChecksum(backupData);
    backupData.metadata.integrityHash = integrityHash;
    
    return backupOptions.encrypt ? await this.encryptBackupData(backupData) : backupData;
  }

  async storeBackupRecord(finalBackupData, originalBackupData) {
    const randomSuffix = Math.random().toString(this.CONSTANTS.MATH.BASE36_RADIX)
      .substring(2, 2 + this.CONSTANTS.MATH.BACKUP_ID_SUFFIX_LENGTH);
    const backupId = `backup_${Date.now()}_${randomSuffix}`;
    
    const backupRecord = {
      id: backupId,
      timestamp: new Date(),
      size: JSON.stringify(finalBackupData).length,
      encrypted: originalBackupData.metadata.encrypted,
      integrityHash: originalBackupData.metadata.integrityHash,
      metadata: originalBackupData.metadata
    };
    
    await this.safeTransaction(['backups'], 'readwrite', async (transaction) => {
      const store = transaction.objectStore('backups');
      return new Promise((resolve, reject) => {
        const request = store.add(backupRecord);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    console.log(`[Storage] Secure backup created: ${backupId}`);
    return backupRecord;
  }

  createBackupSuccessResult(backupRecord, finalBackupData, originalBackupData) {
    return {
      success: true,
      backupId: backupRecord.id,
      data: finalBackupData,
      metadata: originalBackupData.metadata,
      size: backupRecord.size
    };
  }

  async restoreFromSecureBackup(backupData, options = {}) {
    try {
      await this.validateRestorePermissions(options);
      
      const processedBackupData = await this.prepareBackupData(backupData, options);
      
      const restoreResult = await this.performCardRestore(processedBackupData, options);
      
      return this.createRestoreSuccessResult(restoreResult, processedBackupData);
    } catch (error) {
      console.error('[Storage] Secure backup restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateRestorePermissions(options) {
    const authResult = await this.validateDatabaseAccess('write', 'backup-data');
    if (!authResult.authorized) {
      throw new Error(`Restore access denied: ${authResult.reason}`);
    }
    console.log('[Storage] Restoring from secure backup...');
  }

  async prepareBackupData(backupData, options) {
    let processedBackupData = backupData;
    
    if (backupData.encrypted) {
      processedBackupData = await this.decryptBackupData(backupData);
    }
    
    if (options.verifyIntegrity !== false && processedBackupData.metadata?.integrityHash) {
      await this.verifyBackupIntegrity(processedBackupData);
    }
    
    return processedBackupData;
  }

  async verifyBackupIntegrity(processedBackupData) {
    const currentHash = await this.calculateChecksum({
      cards: processedBackupData.cards,
      settings: processedBackupData.settings,
      versions: processedBackupData.versions
    });
    
    if (currentHash !== processedBackupData.metadata.integrityHash) {
      throw new Error('Backup integrity verification failed');
    }
  }

  async performCardRestore(processedBackupData, options) {
    let restoredCards = 0;
    let skippedCards = 0;
    
    for (const cardData of processedBackupData.cards || []) {
      const result = await this.restoreSingleCard(cardData, options);
      if (result.restored) {
        restoredCards++;
      } else {
        skippedCards++;
      }
    }
    
    console.log(`[Storage] Backup restore completed: ${restoredCards} restored, ${skippedCards} skipped`);
    return { restoredCards, skippedCards };
  }

  async restoreSingleCard(cardData, options) {
    try {
      const existingCard = await this.getCard(cardData.id);
      
      if (existingCard && !options.overwriteExisting) {
        return { restored: false };
      }
      
      const encryptedData = await this.encryptCardData(cardData.data);
      const restoredCard = {
        ...cardData,
        data: encryptedData,
        encrypted: true,
        restored: true,
        restoredAt: new Date()
      };
      
      await this.safeTransaction(['cards'], 'readwrite', async (transaction) => {
        const store = transaction.objectStore('cards');
        return new Promise((resolve, reject) => {
          const request = options.overwriteExisting ? store.put(restoredCard) : store.add(restoredCard);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
      
      return { restored: true };
    } catch (cardError) {
      console.warn(`[Storage] Failed to restore card ${cardData.id}:`, cardError);
      return { restored: false };
    }
  }

  createRestoreSuccessResult(restoreResult, processedBackupData) {
    return {
      success: true,
      restoredCards: restoreResult.restoredCards,
      skippedCards: restoreResult.skippedCards,
      totalCards: (processedBackupData.cards || []).length
    };
  }

  async encryptBackupData(backupData) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not available');
      }
      
      const iv = crypto.getRandomValues(new Uint8Array(this.CONSTANTS.ENCRYPTION.IV_LENGTH));
      const encodedData = new TextEncoder().encode(JSON.stringify(backupData));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encodedData
      );
      
      return {
        encrypted: true,
        data: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        algorithm: 'AES-GCM',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[Storage] Backup encryption failed:', error);
      throw error;
    }
  }

  async decryptBackupData(encryptedBackup) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not available');
      }
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedBackup.iv) },
        this.encryptionKey,
        new Uint8Array(encryptedBackup.data)
      );
      
      const decryptedText = new TextDecoder().decode(decrypted);
      return this.safeJSONParse(decryptedText);
    } catch (error) {
      console.error('[Storage] Backup decryption failed:', error);
      throw error;
    }
  }

  async getAllSettings() {
    try {
      return await this.safeTransaction(['settings'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('[Storage] Get all settings failed:', error);
      return [];
    }
  }

  async listBackups() {
    try {
      return await this.safeTransaction(['backups'], 'readonly', async (transaction) => {
        const store = transaction.objectStore('backups');
        return new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => {
            const backups = request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            resolve(backups);
          };
          request.onerror = () => reject(request.error);
        });
      });
    } catch (error) {
      console.error('[Storage] List backups failed:', error);
      return [];
    }
  }

  /**
   * SEC-01: Safe JSON parsing method
   * Addresses CWE-502 (Unsafe Deserialization)
   */
  safeJSONParse(jsonString, options = {}) {
    try {
      // Use SecurityCore if available
      if (this.securityCore && this.securityCore.safeJSONParse) {
        return this.securityCore.safeJSONParse(jsonString, options);
      }
      
      // Fallback safe parsing
      return JSON.parse(jsonString, (key, value) => {
        // Block dangerous keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (error) {
      console.error('[Storage] Safe JSON parse failed:', error);
      if (options.fallback !== undefined) {
        return options.fallback;
      }
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }

  /**
   * SEC-01: Safe JSON cloning method
   * Replaces unsafe JSON.parse(JSON.stringify()) pattern
   */
  safeJSONClone(data) {
    try {
      // Use SecurityCore if available
      if (this.securityCore && this.securityCore.safeJSONParse) {
        const jsonString = JSON.stringify(data, (key, value) => {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            return undefined;
          }
          return value;
        });
        return this.securityCore.safeJSONParse(jsonString);
      }
      
      // Fallback safe cloning
      const jsonString = JSON.stringify(data, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
      
      return JSON.parse(jsonString, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (error) {
      console.error('[Storage] Safe JSON clone failed:', error);
      throw new Error(`Data cloning failed: ${error.message}`);
    }
  }

  // 清理和維護
  async cleanup() {
    try {
      
      // 執行記憶體優化
      await this.optimizeMemoryUsage();
      
      // 清理孤立的版本記錄
      await this.cleanupOrphanedVersions();
      
      // STORAGE-04: 清理舊的遷移日誌
      if (this.migrationLogManager) {
        try {
          await this.migrationLogManager.cleanupOldLogs({ daysOld: 90 });
        } catch (logCleanupError) {
          console.warn('[Storage] Migration log cleanup failed:', logCleanupError);
        }
      }
      
      // SEC-03: Cleanup security components
      if (this.healthMonitor) {
        await this.healthMonitor.cleanup(this.CONSTANTS.MATH.HEALTH_DATA_RETENTION_DAYS);
        this.healthMonitor.cleanup();
      }
      
      if (this.compatibilityLayer) {
        this.compatibilityLayer.cleanup();
      }
      
      // SEC-04: Cleanup graceful degradation
      if (this.gracefulDegradation) {
        await this.gracefulDegradation.resetDegradation();
      }
      
      // SEC-06: Cleanup error recovery
      if (this.errorRecovery) {
        this.errorRecovery.resetRecovery();
      }
      
      // SEC-07: Cleanup rollback system
      if (this.rollbackSystem) {
        this.rollbackSystem.cleanup();
      }
      
      // SEC-08: Cleanup user impact monitor
      if (this.userImpactMonitor) {
        this.userImpactMonitor.cleanup();
      }
      
      // SEC-09: Cleanup security dashboard
      if (this.securityDashboard) {
        this.securityDashboard.cleanup();
      }
      
      // SEC-10 to SEC-12: Cleanup Phase 4 User Experience Components
      if (this.userCommunication) {
        this.userCommunication.clearAllMessages();
      }
      
      if (this.securityOnboarding) {
        this.securityOnboarding.hideOnboarding();
      }
      
      if (this.securitySettings) {
        this.securitySettings.hideSettings();
      }
      
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
   * 獲取版本歷史 - 使用專用管理器或備用方案
   */
  async getVersionHistory(cardId) {
    try {
      if (this.versionManager) {
        return await this.versionManager.getVersionHistory(cardId);
      }
      
      // 備用方案：直接實作
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
   * 還原到指定版本 - 使用專用管理器或備用方案
   */
  async restoreVersion(cardId, targetVersion) {
    try {
      if (this.versionManager) {
        return await this.versionManager.restoreToVersion(cardId, targetVersion);
      }
      
      // 備用方案：直接實作
      const versionSnapshot = await this.getVersionSnapshot(cardId, targetVersion);
      if (!versionSnapshot) {
        throw new Error(`Version ${targetVersion} not found for card ${cardId}`);
      }

      const calculatedChecksum = await this.calculateChecksum(versionSnapshot.data);
      if (calculatedChecksum !== versionSnapshot.checksum) {
        console.warn('[Storage] Version checksum mismatch, continuing anyway');
      }

      await this.updateCard(cardId, versionSnapshot.data);

      await this.createVersionSnapshotSafe(
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
          avgVersionsPerCard: Math.round(avgVersionsPerCard * this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER) / this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER,
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
    
    const kbDivisor = this.CONSTANTS.MATH.BYTES_PER_KB;
    const mbDivisor = kbDivisor * kbDivisor;
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / kbDivisor * this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER) / this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER,
      mb: Math.round(totalSize / mbDivisor * this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER) / this.CONSTANTS.MATH.PERCENTAGE_MULTIPLIER
    };
  }

  /**
   * 清理過期版本
   */
  async cleanupExpiredVersions(daysOld = this.CONSTANTS.TIME.CLEANUP_DAYS) {
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
            if (version.version > this.CONSTANTS.MATH.VERSION_THRESHOLD) { // 不刪除第一個版本
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

// 匯出類別 - 確保立即可用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWACardStorage;
} else if (typeof window !== 'undefined') {
  // 立即設定到全域範圍
  window.PWACardStorage = PWACardStorage;
  
  // 確保類別可用性
  if (typeof PWACardStorage === 'undefined') {
    window.PWACardStorage = PWACardStorage;
  }
  
  // Debug: 確認類別已正確設定
  console.log('[Storage] PWACardStorage class exported to window:', !!window.PWACardStorage);
  console.log('[Storage] PWACardStorage constructor available:', typeof window.PWACardStorage);
  
  // 觸發自訂事件通知類別已載入
  if (typeof CustomEvent !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('PWACardStorageLoaded', {
        detail: { timestamp: Date.now(), available: !!window.PWACardStorage }
      }));
      console.log('[Storage] PWACardStorageLoaded event dispatched');
    }, 10); // Small delay to ensure DOM is ready
  }
}

console.log('[Storage] Script loading completed successfully');

} catch (error) {
  console.error('[Storage] Critical error during script loading:', error);
  console.error('[Storage] Stack trace:', error.stack);
  
  // Try to provide a minimal fallback
  if (typeof window !== 'undefined') {
    window.PWACardStorageError = error;
    window.dispatchEvent(new CustomEvent('PWACardStorageError', {
      detail: { error: error.message, timestamp: Date.now() }
    }));
  }
}