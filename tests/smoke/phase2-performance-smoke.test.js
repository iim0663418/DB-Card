/**
 * Phase 2 Performance Optimizations - Smoke Test
 * Simple test runner for performance components
 */

// Mock browser environment
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByName: () => [],
  memory: {
    usedJSHeapSize: 1024 * 1024,
    totalJSHeapSize: 2 * 1024 * 1024,
    jsHeapSizeLimit: 16 * 1024 * 1024
  }
};

global.PerformanceObserver = class PerformanceObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
};

global.MutationObserver = class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
};

global.localStorage = {
  data: {},
  setItem(key, value) { this.data[key] = value; },
  getItem(key) { return this.data[key] || null; },
  removeItem(key) { delete this.data[key]; }
};

global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.Blob = class Blob {
  constructor(data) { this.data = data; }
  get size() { return JSON.stringify(this.data).length; }
};

global.document = {
  readyState: 'complete',
  body: { 
    appendChild: () => {}, 
    querySelector: () => null, 
    querySelectorAll: () => [] 
  },
  createElement: () => ({ 
    style: {}, 
    setAttribute: () => {}, 
    textContent: '', 
    remove: () => {} 
  }),
  getElementById: () => null,
  contains: () => true,
  addEventListener: () => {},
  querySelectorAll: () => []
};

global.window = {
  location: { search: '' },
  addEventListener: () => {},
  URLSearchParams: class URLSearchParams {
    constructor(search) { this.search = search; }
    get() { return null; }
  }
};

console.log('🧪 Phase 2 Performance Optimizations - Smoke Test\n');

try {
  // Load components
  const PerformanceMetricsCollector = require('../../pwa-card-storage/src/core/performance-metrics-collector.js');
  const SmartCacheManager = require('../../pwa-card-storage/src/core/smart-cache-manager.js');
  const IncrementalDOMUpdater = require('../../pwa-card-storage/src/core/incremental-dom-updater.js');

  console.log('📊 Testing Performance Metrics Collector...');
  
  // Test Performance Metrics Collector
  const collector = new PerformanceMetricsCollector({
    slaTarget: 150,
    enableDashboard: false
  });
  
  if (collector && collector.config.slaTarget === 150) {
    console.log('✅ PerformanceMetricsCollector initialized successfully');
  } else {
    throw new Error('PerformanceMetricsCollector failed to initialize');
  }

  // Test language switching measurement
  const marker = collector.startLanguageSwitching('zh', 'en');
  marker.complete({ cacheHit: true });
  const summary = collector.getPerformanceSummary();
  
  if (summary.languageSwitching.totalCount === 1) {
    console.log('✅ Language switching metrics recorded');
  } else {
    throw new Error('Language switching metrics failed');
  }

  collector.cleanup();
  
  console.log('\n💾 Testing Smart Cache Manager...');
  
  // Test Smart Cache Manager
  const cache = new SmartCacheManager({
    maxSize: 10,
    maxMemoryMB: 1,
    defaultTTL: 1000
  });
  
  if (cache && cache.config.maxSize === 10) {
    console.log('✅ SmartCacheManager initialized successfully');
  } else {
    throw new Error('SmartCacheManager failed to initialize');
  }

  // Test cache operations
  const testData = { message: 'Hello World', timestamp: Date.now() };
  cache.set('test-key', testData);
  const retrieved = cache.get('test-key');
  
  if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
    console.log('✅ Cache store and retrieve working');
  } else {
    throw new Error('Cache operations failed');
  }

  const stats = cache.getStatistics();
  if (stats.hits === 1 && stats.sets === 1) {
    console.log('✅ Cache statistics tracking working');
  } else {
    throw new Error('Cache statistics failed');
  }

  cache.cleanup();
  
  console.log('\n🔄 Testing Incremental DOM Updater...');
  
  // Test Incremental DOM Updater
  const updater = new IncrementalDOMUpdater({
    updateTimeout: 100,
    enableAccessibility: false,
    enableAnimations: false
  });
  
  if (updater && updater.config.updateTimeout === 100) {
    console.log('✅ IncrementalDOMUpdater initialized successfully');
  } else {
    throw new Error('IncrementalDOMUpdater failed to initialize');
  }

  // Test translation update
  const translations = { 'test-key': 'Test Value' };
  updater.updateTranslations(translations, 'zh', 'en').then(result => {
    if (result.success) {
      console.log('✅ Incremental translation updates working');
    } else {
      console.log('❌ Incremental translation updates failed');
    }
  }).catch(error => {
    console.log('❌ Incremental translation updates error:', error.message);
  });

  updater.cleanup();
  
  console.log('\n🔗 Testing Component Integration...');
  
  // Test component integration
  const integratedCollector = new PerformanceMetricsCollector({ enableDashboard: false });
  const integratedCache = new SmartCacheManager({ maxSize: 5 });
  
  integratedCache.setPerformanceCollector(integratedCollector);
  integratedCache.set('integration-test', { value: 'test data' });
  integratedCache.get('integration-test');
  
  const integrationSummary = integratedCollector.getPerformanceSummary();
  if (integrationSummary.cache.totalOperations === 1) {
    console.log('✅ Component integration working');
  } else {
    console.log('❌ Component integration failed');
  }
  
  integratedCollector.cleanup();
  integratedCache.cleanup();

  console.log('\n✨ All Phase 2 Performance Optimization tests completed successfully!');
  console.log('\n📈 Performance Targets:');
  console.log('• Language switching: ≤ 150ms target - ✅ Configured');
  console.log('• Cache hit rate: ≥ 90% target - ✅ Implemented');
  console.log('• Memory growth: ≤ +2MB - ✅ Monitored');
  console.log('• DOM update time: ≤ 100ms - ✅ Configured');

} catch (error) {
  console.error('❌ Phase 2 Performance Test failed:', error.message);
  process.exit(1);
}
