/**
 * PWA 效能監控工具
 * 監控載入時間、記憶體使用量和電池消耗
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: 0,
      memoryUsage: 0,
      batteryLevel: null,
      networkSpeed: 'unknown'
    };
    this.observers = [];
  }

  /**
   * 初始化效能監控
   */
  async initialize() {
    console.log('[Performance] Initializing performance monitor...');
    
    // 監控頁面載入時間
    this.measureLoadTime();
    
    // 監控記憶體使用量
    this.monitorMemoryUsage();
    
    // 監控電池狀態
    await this.monitorBatteryStatus();
    
    // 監控網路速度
    this.measureNetworkSpeed();
    
    // 設定定期監控
    this.startPeriodicMonitoring();
    
    console.log('[Performance] Performance monitor initialized');
  }

  /**
   * 測量頁面載入時間
   */
  measureLoadTime() {
    try {
      if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        this.metrics.loadTime = loadTime;
        console.log(`[Performance] Page load time: ${loadTime}ms`);
      }
      
      // 使用 Performance Observer 監控更詳細的指標
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.metrics.loadTime = entry.loadEventEnd - entry.fetchStart;
              console.log(`[Performance] Navigation timing: ${this.metrics.loadTime}ms`);
            }
          }
        });
        
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.push(observer);
      }
    } catch (error) {
      console.warn('[Performance] Load time measurement failed:', error);
    }
  }

  /**
   * 監控記憶體使用量
   */
  monitorMemoryUsage() {
    try {
      if (performance.memory) {
        const updateMemoryMetrics = () => {
          this.metrics.memoryUsage = {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
          };
        };
        
        updateMemoryMetrics();
        
        // 每30秒更新一次記憶體指標
        setInterval(updateMemoryMetrics, 30000);
      }
    } catch (error) {
      console.warn('[Performance] Memory monitoring failed:', error);
    }
  }

  /**
   * 監控電池狀態
   */
  async monitorBatteryStatus() {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        
        const updateBatteryMetrics = () => {
          this.metrics.batteryLevel = {
            level: Math.round(battery.level * 100),
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          };
        };
        
        updateBatteryMetrics();
        
        // 監聽電池狀態變化
        battery.addEventListener('levelchange', updateBatteryMetrics);
        battery.addEventListener('chargingchange', updateBatteryMetrics);
      }
    } catch (error) {
      console.warn('[Performance] Battery monitoring failed:', error);
    }
  }

  /**
   * 測量網路速度
   */
  measureNetworkSpeed() {
    try {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        this.metrics.networkSpeed = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        };
        
        // 監聽網路狀態變化
        connection.addEventListener('change', () => {
          this.metrics.networkSpeed = {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          };
        });
      }
    } catch (error) {
      console.warn('[Performance] Network speed measurement failed:', error);
    }
  }

  /**
   * 開始定期監控
   */
  startPeriodicMonitoring() {
    // 每分鐘檢查一次效能指標
    setInterval(() => {
      this.checkPerformanceThresholds();
    }, 60000);
  }

  /**
   * 檢查效能閾值
   */
  checkPerformanceThresholds() {
    const warnings = [];
    
    // 檢查載入時間（超過3秒警告）
    if (this.metrics.loadTime > 3000) {
      warnings.push(`載入時間過長: ${this.metrics.loadTime}ms`);
    }
    
    // 檢查記憶體使用量（超過80%警告）
    if (this.metrics.memoryUsage && this.metrics.memoryUsage.used) {
      const memoryUsagePercent = (this.metrics.memoryUsage.used / this.metrics.memoryUsage.limit) * 100;
      if (memoryUsagePercent > 80) {
        warnings.push(`記憶體使用量過高: ${Math.round(memoryUsagePercent)}%`);
      }
    }
    
    // 檢查電池電量（低於20%警告）
    if (this.metrics.batteryLevel && this.metrics.batteryLevel.level < 20) {
      warnings.push(`電池電量低: ${this.metrics.batteryLevel.level}%`);
    }
    
    if (warnings.length > 0) {
      console.warn('[Performance] Performance warnings:', warnings);
      this.triggerOptimizations();
    }
  }

  /**
   * 觸發效能優化
   */
  async triggerOptimizations() {
    try {
      console.log('[Performance] Triggering performance optimizations...');
      
      // 清理記憶體
      if (window.PWACardStorage) {
        const storage = new window.PWACardStorage();
        await storage.optimizeMemoryUsage();
      }
      
      // 清理快取
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => !name.includes('v1.0.1'));
        await Promise.all(oldCaches.map(name => caches.delete(name)));
      }
      
      console.log('[Performance] Performance optimizations completed');
    } catch (error) {
      console.error('[Performance] Performance optimization failed:', error);
    }
  }

  /**
   * 獲取效能報告
   */
  getPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: { ...this.metrics },
      status: 'good'
    };
    
    // 評估整體效能狀態
    let score = 100;
    
    if (this.metrics.loadTime > 3000) score -= 20;
    if (this.metrics.memoryUsage?.used > this.metrics.memoryUsage?.limit * 0.8) score -= 15;
    if (this.metrics.batteryLevel?.level < 20) score -= 10;
    if (this.metrics.networkSpeed?.effectiveType === 'slow-2g') score -= 15;
    
    if (score >= 80) report.status = 'good';
    else if (score >= 60) report.status = 'warning';
    else report.status = 'poor';
    
    report.score = score;
    
    return report;
  }

  /**
   * 生成效能建議
   */
  getPerformanceRecommendations() {
    const recommendations = [];
    
    if (this.metrics.loadTime > 3000) {
      recommendations.push('考慮啟用快取策略以減少載入時間');
    }
    
    if (this.metrics.memoryUsage?.used > this.metrics.memoryUsage?.limit * 0.8) {
      recommendations.push('定期清理記憶體以避免效能下降');
    }
    
    if (this.metrics.batteryLevel?.level < 20) {
      recommendations.push('啟用省電模式以延長電池壽命');
    }
    
    if (this.metrics.networkSpeed?.effectiveType === 'slow-2g') {
      recommendations.push('在慢速網路下啟用離線模式');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('效能表現良好，無需特別優化');
    }
    
    return recommendations;
  }

  /**
   * 清理監控器
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('[Performance] Performance monitor destroyed');
  }
}

window.PerformanceMonitor = PerformanceMonitor;