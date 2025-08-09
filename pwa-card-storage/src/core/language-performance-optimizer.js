/**
 * Language Performance Optimizer
 * 語言切換效能優化與動畫效果
 */

export class LanguagePerformanceOptimizer {
  constructor() {
    this.translationCache = new Map();
    this.animationQueue = [];
    this.isAnimating = false;
    this.observers = new Set();
    
    // 效能監控
    this.metrics = {
      switchTime: [],
      cacheHitRate: 0,
      totalSwitches: 0,
      cacheHits: 0
    };
  }

  /**
   * 快取翻譯結果
   */
  cacheTranslation(key, language, text) {
    const cacheKey = `${language}:${key}`;
    this.translationCache.set(cacheKey, {
      text,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * 獲取快取的翻譯
   */
  getCachedTranslation(key, language) {
    const cacheKey = `${language}:${key}`;
    const cached = this.translationCache.get(cacheKey);
    
    if (cached) {
      cached.accessCount++;
      this.metrics.cacheHits++;
      return cached.text;
    }
    
    return null;
  }

  /**
   * 清理過期快取
   */
  cleanupCache(maxAge = 10 * 60 * 1000) { // 10分鐘
    const now = Date.now();
    for (const [key, value] of this.translationCache.entries()) {
      if (now - value.timestamp > maxAge && value.accessCount < 2) {
        this.translationCache.delete(key);
      }
    }
  }

  /**
   * 批次更新 DOM 元素
   */
  async batchUpdateElements(updates) {
    const startTime = performance.now();
    
    // 使用 requestAnimationFrame 優化 DOM 更新
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // 批次處理 DOM 更新
        const fragment = document.createDocumentFragment();
        const elementsToUpdate = [];
        
        updates.forEach(({ element, text, animate = true }) => {
          if (!element) return;
          
          if (animate) {
            elementsToUpdate.push({ element, text });
          } else {
            element.textContent = text;
          }
        });
        
        // 執行動畫更新
        if (elementsToUpdate.length > 0) {
          this.animateTextChanges(elementsToUpdate).then(() => {
            const endTime = performance.now();
            this.recordMetrics(endTime - startTime);
            resolve();
          });
        } else {
          const endTime = performance.now();
          this.recordMetrics(endTime - startTime);
          resolve();
        }
      });
    });
  }

  /**
   * 文字變更動畫
   */
  async animateTextChanges(elements) {
    if (this.isAnimating) {
      this.animationQueue.push(...elements);
      return;
    }
    
    this.isAnimating = true;
    
    try {
      // 淡出動畫
      await Promise.all(elements.map(({ element }) => 
        this.fadeOut(element)
      ));
      
      // 更新文字
      elements.forEach(({ element, text }) => {
        element.textContent = text;
      });
      
      // 淡入動畫
      await Promise.all(elements.map(({ element }) => 
        this.fadeIn(element)
      ));
      
      // 處理佇列中的動畫
      if (this.animationQueue.length > 0) {
        const nextBatch = this.animationQueue.splice(0);
        await this.animateTextChanges(nextBatch);
      }
      
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 淡出動畫
   */
  fadeOut(element) {
    return new Promise(resolve => {
      element.style.transition = 'opacity 0.15s ease-out';
      element.style.opacity = '0';
      
      setTimeout(() => {
        resolve();
      }, 150);
    });
  }

  /**
   * 淡入動畫
   */
  fadeIn(element) {
    return new Promise(resolve => {
      element.style.transition = 'opacity 0.15s ease-in';
      element.style.opacity = '1';
      
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, 150);
    });
  }

  /**
   * 預載入翻譯
   */
  async preloadTranslations(keys, languages) {
    const promises = [];
    
    keys.forEach(key => {
      languages.forEach(lang => {
        if (!this.getCachedTranslation(key, lang)) {
          // 這裡應該調用實際的翻譯獲取方法
          promises.push(
            this.loadTranslation(key, lang)
          );
        }
      });
    });
    
    await Promise.all(promises);
  }

  /**
   * 載入單個翻譯
   */
  async loadTranslation(key, language) {
    // 模擬異步翻譯載入
    return new Promise(resolve => {
      setTimeout(() => {
        // 這裡應該調用實際的語言管理器
        if (window.languageManager) {
          const text = window.languageManager.getText(key, language);
          this.cacheTranslation(key, language, text);
        }
        resolve();
      }, 1);
    });
  }

  /**
   * 記錄效能指標
   */
  recordMetrics(switchTime) {
    this.metrics.switchTime.push(switchTime);
    this.metrics.totalSwitches++;
    
    // 保持最近 100 次記錄
    if (this.metrics.switchTime.length > 100) {
      this.metrics.switchTime.shift();
    }
    
    // 計算快取命中率
    this.metrics.cacheHitRate = this.metrics.totalSwitches > 0 
      ? this.metrics.cacheHits / this.metrics.totalSwitches 
      : 0;
  }

  /**
   * 獲取效能報告
   */
  getPerformanceReport() {
    const switchTimes = this.metrics.switchTime;
    const avgSwitchTime = switchTimes.length > 0 
      ? switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length 
      : 0;
    
    return {
      averageSwitchTime: Math.round(avgSwitchTime * 100) / 100,
      cacheHitRate: Math.round(this.metrics.cacheHitRate * 100),
      totalSwitches: this.metrics.totalSwitches,
      cacheSize: this.translationCache.size,
      isOptimal: avgSwitchTime < 100 && this.metrics.cacheHitRate > 0.8
    };
  }

  /**
   * 優化建議
   */
  getOptimizationSuggestions() {
    const report = this.getPerformanceReport();
    const suggestions = [];
    
    if (report.averageSwitchTime > 100) {
      suggestions.push('考慮減少同時更新的 DOM 元素數量');
    }
    
    if (report.cacheHitRate < 0.8) {
      suggestions.push('增加翻譯預載入以提高快取命中率');
    }
    
    if (report.cacheSize > 200) {
      suggestions.push('定期清理快取以節省記憶體');
    }
    
    return suggestions;
  }

  /**
   * 註冊效能觀察者
   */
  addPerformanceObserver(callback) {
    this.observers.add(callback);
  }

  /**
   * 移除效能觀察者
   */
  removePerformanceObserver(callback) {
    this.observers.delete(callback);
  }

  /**
   * 通知效能觀察者
   */
  notifyObservers(data) {
    this.observers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[LanguagePerformanceOptimizer] Observer error:', error);
      }
    });
  }

  /**
   * 清理資源
   */
  cleanup() {
    this.translationCache.clear();
    this.animationQueue = [];
    this.observers.clear();
    this.isAnimating = false;
  }
}

// 全域實例
export const languageOptimizer = new LanguagePerformanceOptimizer();