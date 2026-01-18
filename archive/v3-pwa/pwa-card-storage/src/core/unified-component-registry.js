/**
 * Unified Component Registry - v3.2.1-security-enhanced
 * COMP-02: 統一元件註冊系統 - 建立一致的生命週期管理
 * 
 * 設計原則：
 * - 統一元件註冊和初始化
 * - 依賴關係管理
 * - 錯誤隔離和恢復
 * - 健康狀態監控
 * 
 * @version 3.2.1-security-enhanced
 * @security Fixed CWE-117 log injection and XSS vulnerabilities
 */

// Import security modules for CWE-117 and XSS protection
let SecureLogger, XSSProtection;
try {
  if (typeof require !== 'undefined') {
    ({ SecureLogger } = require('../security/secure-logger.js'));
    ({ XSSProtection } = require('../security/xss-protection.js'));
  } else if (typeof window !== 'undefined') {
    SecureLogger = window.SecureLogger;
    XSSProtection = window.XSSProtection;
  }
} catch (error) {
  console.warn('[UnifiedComponentRegistry] Security modules not available, using fallback protection');
}

class UnifiedComponentRegistry {
  constructor() {
    this.components = new Map();
    this.dependencies = new Map();
    this.initializationOrder = [];
    this.healthMonitor = null;
    this.initialized = false;
    this.isInitializing = false;
    
    // Initialize secure logger for CWE-117 protection
    this.secureLogger = SecureLogger ? new SecureLogger({
      logLevel: 'INFO',
      enableMasking: true,
      maxLogLength: 500
    }) : null;
    
    // 初始化狀態追蹤
    this.initializationStatus = {
      total: 0,
      completed: 0,
      failed: 0,
      errors: []
    };
    
    // 安全配置
    this.config = {
      maxInitializationTime: 30000, // 30秒
      maxRetryAttempts: 3,
      retryDelay: 1000, // 1秒
      enableHealthMonitoring: true
    };
  }

  /**
   * 註冊元件
   * @param {string} name - 元件名稱
   * @param {Object} component - 元件實例或配置
   * @param {Object} options - 註冊選項
   */
  register(name, component, options = {}) {
    // 輸入驗證和 XSS 防護
    if (!name || typeof name !== 'string') {
      throw new Error('Component name must be a non-empty string');
    }
    
    // XSS 防護：清理元件名稱
    const sanitizedName = this.sanitizeInput(name, { maxLength: 100 });
    if (sanitizedName !== name) {
      this.safeLog('warn', 'Component name sanitized for security', { 
        originalName: name.substring(0, 50),
        sanitizedName 
      });
      name = sanitizedName;
    }
    
    if (!component) {
      throw new Error('Component cannot be null or undefined');
    }

    // 檢查重複註冊
    if (this.components.has(name)) {
      this.safeLog('warn', 'Component already registered, replacing', { componentName: name });
    }

    // 標準化元件配置
    const componentConfig = this.normalizeComponent(name, component, options);
    
    // 註冊元件
    this.components.set(name, componentConfig);
    
    // 註冊依賴關係
    if (options.dependencies && Array.isArray(options.dependencies)) {
      this.dependencies.set(name, options.dependencies);
    }
    
    // 如果健康監控已啟用，開始追蹤
    if (this.healthMonitor && this.config.enableHealthMonitoring) {
      this.healthMonitor.track(name, componentConfig);
    }
    
    this.safeLog('info', 'Component registered successfully', { componentName: name });
    
    return this;
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
        component: 'UnifiedComponentRegistry',
        ...context
      });
    } else {
      // 備用安全日誌記錄
      const sanitizedMessage = String(message).replace(/[\x00-\x1F\x7F-\x9F]/g, '').substring(0, 500);
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [UnifiedComponentRegistry] ${sanitizedMessage}`;
      
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
        .substring(0, options.maxLength || 1000);
    }
  }

  /**
   * 標準化元件配置
   */
  normalizeComponent(name, component, options) {
    const config = {
      name,
      instance: component,
      initialized: false,
      initializationTime: 0,
      lastError: null,
      retryCount: 0,
      priority: options.priority || 5,
      dependencies: options.dependencies || [],
      initializeMethod: options.initializeMethod || 'initialize',
      cleanupMethod: options.cleanupMethod || 'cleanup',
      healthCheckMethod: options.healthCheckMethod || 'getStatus',
      critical: options.critical || false,
      timeout: options.timeout || this.config.maxInitializationTime
    };

    // 驗證必要方法
    if (typeof component[config.initializeMethod] !== 'function') {
      console.warn(`[UnifiedComponentRegistry] Component '${name}' missing initialize method: ${config.initializeMethod}`);
    }

    return config;
  }

  /**
   * 初始化所有元件
   */
  async initializeAll() {
    if (this.initialized) {
      console.log('[UnifiedComponentRegistry] Already initialized');
      return this.getInitializationReport();
    }

    if (this.isInitializing) {
      console.log('[UnifiedComponentRegistry] Initialization already in progress');
      return this.waitForInitialization();
    }

    this.isInitializing = true;
    this.safeLog('info', 'Starting component initialization');

    try {
      // 重置狀態
      this.resetInitializationStatus();
      
      // 計算初始化順序
      this.calculateInitializationOrder();
      
      // 初始化健康監控器
      await this.initializeHealthMonitor();
      
      // 按順序初始化元件
      await this.initializeComponentsInOrder();
      
      this.initialized = true;
      this.safeLog('info', 'All components initialized successfully');
      
      return this.getInitializationReport();
      
    } catch (error) {
      this.safeLog('error', 'Component initialization failed', { error: error.message });
      this.initializationStatus.errors.push({
        type: 'initialization_failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
      
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 重置初始化狀態
   */
  resetInitializationStatus() {
    this.initializationStatus = {
      total: this.components.size,
      completed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * 計算初始化順序（拓撲排序）
   */
  calculateInitializationOrder() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (componentName) => {
      if (visiting.has(componentName)) {
        throw new Error(`Circular dependency detected involving component: ${componentName}`);
      }
      
      if (visited.has(componentName)) {
        return;
      }

      visiting.add(componentName);
      
      const dependencies = this.dependencies.get(componentName) || [];
      for (const dep of dependencies) {
        if (!this.components.has(dep)) {
          console.warn(`[UnifiedComponentRegistry] Dependency '${dep}' not found for component '${componentName}'`);
          continue;
        }
        visit(dep);
      }
      
      visiting.delete(componentName);
      visited.add(componentName);
      order.push(componentName);
    };

    // 按優先級排序元件名稱
    const componentNames = Array.from(this.components.keys()).sort((a, b) => {
      const priorityA = this.components.get(a).priority;
      const priorityB = this.components.get(b).priority;
      return priorityB - priorityA; // 高優先級先初始化
    });

    for (const name of componentNames) {
      visit(name);
    }

    this.initializationOrder = order;
    this.safeLog('info', 'Initialization order calculated', { orderCount: order.length });
  }

  /**
   * 按順序初始化元件
   */
  async initializeComponentsInOrder() {
    for (const componentName of this.initializationOrder) {
      await this.initializeComponent(componentName);
    }
  }

  /**
   * 初始化單個元件
   */
  async initializeComponent(name, retryCount = 0) {
    const config = this.components.get(name);
    if (!config) {
      throw new Error(`Component '${name}' not found`);
    }

    if (config.initialized) {
      console.log(`[UnifiedComponentRegistry] Component '${name}' already initialized`);
      return;
    }

    this.safeLog('info', 'Initializing component', { componentName: name });
    const startTime = performance.now();

    try {
      // 檢查依賴是否已初始化
      await this.waitForDependencies(name);
      
      // 執行初始化
      const component = config.instance;
      const initMethod = config.initializeMethod;
      
      if (typeof component[initMethod] === 'function') {
        // 設定超時
        const initPromise = component[initMethod]();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Initialization timeout for component: ${name}`)), config.timeout);
        });
        
        await Promise.race([initPromise, timeoutPromise]);
      }
      
      // 更新狀態
      config.initialized = true;
      config.initializationTime = performance.now() - startTime;
      config.lastError = null;
      config.retryCount = retryCount;
      
      this.initializationStatus.completed++;
      
      this.safeLog('info', 'Component initialized successfully', { 
        componentName: name,
        initializationTime: Math.round(config.initializationTime)
      });
      
    } catch (error) {
      console.error(`[UnifiedComponentRegistry] Failed to initialize component '${name}':`, error);
      
      config.lastError = error;
      config.initializationTime = performance.now() - startTime;
      
      // 重試邏輯
      if (retryCount < this.config.maxRetryAttempts) {
        console.log(`[UnifiedComponentRegistry] Retrying initialization for '${name}' (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (retryCount + 1)));
        return this.initializeComponent(name, retryCount + 1);
      }
      
      // 記錄失敗
      this.initializationStatus.failed++;
      this.initializationStatus.errors.push({
        component: name,
        error: error.message,
        retryCount,
        timestamp: new Date().toISOString(),
        critical: config.critical
      });
      
      // 如果是關鍵元件，拋出錯誤
      if (config.critical) {
        throw new Error(`Critical component '${name}' failed to initialize: ${error.message}`);
      }
      
      // 非關鍵元件失敗時繼續
      console.warn(`[UnifiedComponentRegistry] Non-critical component '${name}' failed, continuing...`);
    }
  }

  /**
   * 等待依賴元件初始化完成
   */
  async waitForDependencies(componentName) {
    const dependencies = this.dependencies.get(componentName) || [];
    
    for (const depName of dependencies) {
      const depConfig = this.components.get(depName);
      if (!depConfig) {
        throw new Error(`Dependency '${depName}' not found for component '${componentName}'`);
      }
      
      // 等待依賴初始化完成
      let attempts = 0;
      const maxAttempts = 100; // 10秒等待時間
      
      while (!depConfig.initialized && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!depConfig.initialized) {
        throw new Error(`Dependency '${depName}' failed to initialize within timeout`);
      }
    }
  }

  /**
   * 初始化健康監控器
   */
  async initializeHealthMonitor() {
    if (!this.config.enableHealthMonitoring) {
      return;
    }

    try {
      // 嘗試載入健康監控器
      const ComponentHealthMonitor = window.ComponentHealthMonitor || 
        (typeof require !== 'undefined' ? require('./component-health-monitor.js') : null);
      
      if (ComponentHealthMonitor) {
        this.healthMonitor = new ComponentHealthMonitor();
        await this.healthMonitor.initialize();
        console.log('[UnifiedComponentRegistry] Health monitor initialized');
      } else {
        console.warn('[UnifiedComponentRegistry] Health monitor not available, using fallback');
        this.healthMonitor = this.createFallbackHealthMonitor();
      }
    } catch (error) {
      console.warn('[UnifiedComponentRegistry] Failed to initialize health monitor:', error);
      this.healthMonitor = this.createFallbackHealthMonitor();
    }
  }

  /**
   * 建立回退健康監控器
   */
  createFallbackHealthMonitor() {
    return {
      track: (name, component) => {
        console.log(`[FallbackHealthMonitor] Tracking component: ${name}`);
      },
      
      reportFailure: (name, error) => {
        console.error(`[FallbackHealthMonitor] Component failure: ${name}`, error);
      },
      
      getHealthStatus: () => ({
        type: 'fallback',
        message: 'Using fallback health monitor'
      }),
      
      cleanup: () => {
        console.log('[FallbackHealthMonitor] Cleanup completed');
      }
    };
  }

  /**
   * 獲取元件實例
   */
  getComponent(name) {
    const config = this.components.get(name);
    return config ? config.instance : null;
  }

  /**
   * 檢查元件是否已初始化
   */
  isComponentInitialized(name) {
    const config = this.components.get(name);
    return config ? config.initialized : false;
  }

  /**
   * 獲取初始化報告
   */
  getInitializationReport() {
    const components = Array.from(this.components.entries()).map(([name, config]) => ({
      name,
      initialized: config.initialized,
      initializationTime: config.initializationTime,
      retryCount: config.retryCount,
      lastError: config.lastError?.message || null,
      critical: config.critical
    }));

    return {
      ...this.initializationStatus,
      components,
      healthMonitor: this.healthMonitor ? this.healthMonitor.getHealthStatus() : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 等待初始化完成
   */
  async waitForInitialization() {
    while (this.isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.getInitializationReport();
  }

  /**
   * 清理所有元件
   */
  async cleanup() {
    console.log('[UnifiedComponentRegistry] Starting cleanup...');
    
    // 反向順序清理元件
    const cleanupOrder = [...this.initializationOrder].reverse();
    
    for (const name of cleanupOrder) {
      await this.cleanupComponent(name);
    }
    
    // 清理健康監控器
    if (this.healthMonitor) {
      this.healthMonitor.cleanup();
      this.healthMonitor = null;
    }
    
    // 重置狀態
    this.components.clear();
    this.dependencies.clear();
    this.initializationOrder = [];
    this.initialized = false;
    this.isInitializing = false;
    
    console.log('[UnifiedComponentRegistry] Cleanup completed');
  }

  /**
   * 清理單個元件
   */
  async cleanupComponent(name) {
    const config = this.components.get(name);
    if (!config || !config.initialized) {
      return;
    }

    try {
      const component = config.instance;
      const cleanupMethod = config.cleanupMethod;
      
      if (typeof component[cleanupMethod] === 'function') {
        await component[cleanupMethod]();
      }
      
      config.initialized = false;
      console.log(`[UnifiedComponentRegistry] Component '${name}' cleaned up`);
      
    } catch (error) {
      console.error(`[UnifiedComponentRegistry] Failed to cleanup component '${name}':`, error);
    }
  }

  /**
   * 獲取系統狀態
   */
  getStatus() {
    return {
      initialized: this.initialized,
      isInitializing: this.isInitializing,
      componentCount: this.components.size,
      initializationOrder: this.initializationOrder,
      initializationStatus: this.initializationStatus,
      healthMonitor: this.healthMonitor ? this.healthMonitor.getHealthStatus() : null,
      config: this.config
    };
  }
}

// 模組匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedComponentRegistry;
}

// 瀏覽器全域
if (typeof window !== 'undefined') {
  window.UnifiedComponentRegistry = UnifiedComponentRegistry;
}