// moda-03: CSS變數管理器與批次更新實作
// Spec Refs: R-009.1, D-009.1, T-020
// Dependencies: moda-01

// 移除 DesignSystemError 導入，使用內建 Error

/**
 * CSS變數管理器 - 提供批次CSS變數更新、效能優化和變數驗證
 */
class CSSVariablesManager {
  constructor(designSystemManager) {
    this.designSystemManager = designSystemManager;
    this.pendingUpdates = new Map();
    this.updateScheduled = false;
    this.performanceThreshold = 100; // ms
    
    // 變數快取
    this.variableCache = new Map();
    this.lastUpdateTime = 0;
    
    this.state = {
      initialized: false,
      pendingUpdates: 0,
      lastBatchSize: 0,
      averageUpdateTime: 0,
      cacheHitRate: 0
    };
  }

  /**
   * 初始化CSS變數管理器
   */
  async initialize() {
    if (this.state.initialized) {
      throw new Error('CSS Variables Manager already initialized');
    }

    try {
      // 初始化變數快取
      this.initializeVariableCache();
      
      // 設置效能監控
      this.setupPerformanceMonitoring();
      
      this.state.initialized = true;
      
    } catch (error) {
      throw new Error(`Failed to initialize CSS variables manager: ${error.message}`);
    }
  }

  /**
   * 初始化變數快取
   */
  initializeVariableCache() {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // 快取現有的moda變數
      const modaVariables = [
        '--md-primary-1', '--md-primary-2', '--md-primary-3', '--md-primary-4', '--md-primary-5',
        '--md-secondary-1', '--md-secondary-2', '--md-secondary-3',
        '--md-neutral-1', '--md-neutral-2', '--md-neutral-9', '--md-neutral-10',
        '--md-white-1', '--md-black-1',
        '--bs-body-font-family', '--bs-body-font-weight', '--bs-body-font-size',
        '--bs-primary', '--bs-secondary'
      ];
      
      modaVariables.forEach(varName => {
        const value = computedStyle.getPropertyValue(varName).trim();
        if (value) {
          this.variableCache.set(varName, value);
        }
      });
    }
  }

  /**
   * 設置效能監控
   */
  setupPerformanceMonitoring() {
    this.performanceObserver = {
      updateTimes: [],
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * 批次更新CSS變數
   * @param {Object} variables - 變數名稱和值的對應物件
   * @param {Object} options - 更新選項
   */
  async batchUpdate(variables, options = {}) {
    const startTime = performance.now();
    
    try {
      // 驗證輸入
      if (!variables || typeof variables !== 'object') {
        throw new Error('Invalid variables object');
      }

      // 安全驗證和預處理
      const validatedVariables = this.validateAndPreprocessVariables(variables);
      
      // 檢查快取，避免不必要的更新
      const filteredVariables = this.filterCachedVariables(validatedVariables);
      
      if (Object.keys(filteredVariables).length === 0) {
        return; // 沒有需要更新的變數
      }

      // 添加到待更新佇列
      Object.entries(filteredVariables).forEach(([name, value]) => {
        this.pendingUpdates.set(name, value);
      });

      this.state.pendingUpdates = this.pendingUpdates.size;

      // 排程批次更新
      if (!this.updateScheduled) {
        this.scheduleUpdate(options);
      }

      const updateTime = performance.now() - startTime;
      this.recordPerformanceMetrics(updateTime, Object.keys(filteredVariables).length);

    } catch (error) {
      throw new Error(`Failed to batch update CSS variables: ${error.message}`);
    }
  }

  /**
   * 驗證和預處理變數
   * @param {Object} variables - 原始變數物件
   * @returns {Object} - 驗證後的變數物件
   */
  validateAndPreprocessVariables(variables) {
    const validated = {};
    
    Object.entries(variables).forEach(([name, value]) => {
      // 驗證變數名稱
      if (!this.validateVariableName(name)) {
        console.warn(`Invalid CSS variable name: ${name}`);
        return;
      }
      
      // 驗證變數值
      if (!this.validateVariableValue(value)) {
        console.warn(`Invalid CSS variable value for ${name}: ${value}`);
        return;
      }
      
      validated[name] = value;
    });
    
    return validated;
  }

  /**
   * 驗證CSS變數名稱
   * @param {string} name - 變數名稱
   * @returns {boolean} - 是否有效
   */
  validateVariableName(name) {
    if (typeof name !== 'string') return false;
    
    // 檢查是否以--開頭
    if (!name.startsWith('--')) return false;
    
    // 檢查是否符合允許的前綴
    const allowedPrefixes = ['--md-', '--bs-'];
    return allowedPrefixes.some(prefix => name.startsWith(prefix));
  }

  /**
   * 驗證CSS變數值
   * @param {string} value - 變數值
   * @returns {boolean} - 是否安全
   */
  validateVariableValue(value) {
    if (typeof value !== 'string') return false;
    
    // 重用設計系統管理器的安全驗證
    if (this.designSystemManager && this.designSystemManager.validateCSSValue) {
      return this.designSystemManager.validateCSSValue(value);
    }
    
    // 基本安全檢查
    const maliciousPatterns = [
      /javascript:/i,
      /expression\s*\(/i,
      /url\s*\(\s*javascript:/i,
      /@import/i,
      /<script/i
    ];
    
    return !maliciousPatterns.some(pattern => pattern.test(value));
  }

  /**
   * 過濾已快取的變數，避免重複更新
   * @param {Object} variables - 變數物件
   * @returns {Object} - 需要更新的變數
   */
  filterCachedVariables(variables) {
    const filtered = {};
    let cacheHits = 0;
    
    Object.entries(variables).forEach(([name, value]) => {
      const cachedValue = this.variableCache.get(name);
      
      if (cachedValue === value) {
        cacheHits++;
      } else {
        filtered[name] = value;
        this.variableCache.set(name, value);
      }
    });
    
    // 更新快取命中率統計
    this.performanceObserver.cacheHits += cacheHits;
    this.performanceObserver.cacheMisses += Object.keys(filtered).length;
    
    this.updateCacheHitRate();
    
    return filtered;
  }

  /**
   * 排程批次更新
   * @param {Object} options - 更新選項
   */
  scheduleUpdate(options = {}) {
    this.updateScheduled = true;
    
    const updateFunction = () => {
      this.executeBatchUpdate(options);
      this.updateScheduled = false;
    };

    // 使用requestAnimationFrame確保在下一個渲染週期執行
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(updateFunction);
    } else {
      // 降級到setTimeout
      setTimeout(updateFunction, 0);
    }
  }

  /**
   * 執行批次更新
   * @param {Object} options - 更新選項
   */
  executeBatchUpdate(options = {}) {
    if (this.pendingUpdates.size === 0) return;

    const startTime = performance.now();
    const root = document.documentElement;
    const batchSize = this.pendingUpdates.size;

    try {
      // 批次應用所有變數
      this.pendingUpdates.forEach((value, name) => {
        root.style.setProperty(name, value);
      });

      // 清空待更新佇列
      this.pendingUpdates.clear();
      this.state.pendingUpdates = 0;
      this.state.lastBatchSize = batchSize;

      const updateTime = performance.now() - startTime;
      this.lastUpdateTime = updateTime;

      // 效能檢查
      if (updateTime > this.performanceThreshold) {
        console.warn(`CSS variables batch update took ${updateTime.toFixed(2)}ms (>${this.performanceThreshold}ms threshold)`);
      }

      // 觸發更新完成事件
      this.dispatchUpdateEvent(batchSize, updateTime);

    } catch (error) {
      console.error('Failed to execute batch update:', error);
      
      // 清空佇列避免無限重試
      this.pendingUpdates.clear();
      this.state.pendingUpdates = 0;
    }
  }

  /**
   * 記錄效能指標
   * @param {number} updateTime - 更新時間
   * @param {number} variableCount - 變數數量
   */
  recordPerformanceMetrics(updateTime, variableCount) {
    this.performanceObserver.updateTimes.push(updateTime);
    
    // 保持最近100次更新的記錄
    if (this.performanceObserver.updateTimes.length > 100) {
      this.performanceObserver.updateTimes.shift();
    }
    
    // 計算平均更新時間
    const avgTime = this.performanceObserver.updateTimes.reduce((sum, time) => sum + time, 0) / 
                   this.performanceObserver.updateTimes.length;
    
    this.state.averageUpdateTime = Math.round(avgTime * 100) / 100;
  }

  /**
   * 更新快取命中率
   */
  updateCacheHitRate() {
    const totalRequests = this.performanceObserver.cacheHits + this.performanceObserver.cacheMisses;
    
    if (totalRequests > 0) {
      this.state.cacheHitRate = Math.round((this.performanceObserver.cacheHits / totalRequests) * 100);
    }
  }

  /**
   * 觸發更新完成事件
   * @param {number} batchSize - 批次大小
   * @param {number} updateTime - 更新時間
   */
  dispatchUpdateEvent(batchSize, updateTime) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('cssvariablesupdate', {
        detail: {
          batchSize,
          updateTime,
          timestamp: Date.now(),
          cacheHitRate: this.state.cacheHitRate
        }
      });
      
      window.dispatchEvent(event);
    }
  }

  /**
   * 獲取單個CSS變數值
   * @param {string} name - 變數名稱
   * @returns {string|null} - 變數值
   */
  getVariable(name) {
    // 先檢查快取
    if (this.variableCache.has(name)) {
      this.performanceObserver.cacheHits++;
      return this.variableCache.get(name);
    }
    
    // 從DOM獲取
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const value = computedStyle.getPropertyValue(name).trim();
      
      if (value) {
        this.variableCache.set(name, value);
        this.performanceObserver.cacheMisses++;
        return value;
      }
    }
    
    return null;
  }

  /**
   * 清除變數快取
   */
  clearCache() {
    this.variableCache.clear();
    this.performanceObserver.cacheHits = 0;
    this.performanceObserver.cacheMisses = 0;
    this.state.cacheHitRate = 0;
  }

  /**
   * 獲取效能統計
   */
  getPerformanceStats() {
    return {
      averageUpdateTime: this.state.averageUpdateTime,
      lastUpdateTime: this.lastUpdateTime,
      cacheHitRate: this.state.cacheHitRate,
      pendingUpdates: this.state.pendingUpdates,
      lastBatchSize: this.state.lastBatchSize,
      totalCacheHits: this.performanceObserver.cacheHits,
      totalCacheMisses: this.performanceObserver.cacheMisses
    };
  }

  /**
   * 獲取管理器狀態
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 清理資源
   */
  destroy() {
    // 清空待更新佇列
    this.pendingUpdates.clear();
    
    // 清除快取
    this.clearCache();
    
    // 重置狀態
    this.state.initialized = false;
    this.updateScheduled = false;
  }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CSSVariablesManager };
} else if (typeof window !== 'undefined') {
    window.CSSVariablesManager = CSSVariablesManager;
}