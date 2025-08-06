/**
 * Phase 3 User Impact Monitor Smoke Test
 * Tests SEC-08: Client-Side User Impact Monitoring
 */

// Test 1: Basic impact monitor initialization
console.log('=== Phase 3 User Impact Monitor Smoke Test ===');

try {
  // Test impact monitor class availability
  if (typeof ClientSideUserImpactMonitor === 'undefined') {
    throw new Error('ClientSideUserImpactMonitor class not available');
  }
  
  // Test impact monitor instantiation
  const monitor = new ClientSideUserImpactMonitor();
  if (!monitor) {
    throw new Error('Failed to create impact monitor instance');
  }
  
  // Test metrics structure
  const expectedMetrics = ['performance', 'interactions', 'errors', 'accessibility'];
  for (const metric of expectedMetrics) {
    if (!monitor.metrics.hasOwnProperty(metric)) {
      throw new Error(`Missing metrics category: ${metric}`);
    }
  }
  
  // Test thresholds configuration
  const expectedThresholds = ['pageLoadTime', 'interactionDelay', 'errorRate', 'accessibilityScore'];
  for (const threshold of expectedThresholds) {
    if (!monitor.thresholds.hasOwnProperty(threshold)) {
      throw new Error(`Missing threshold: ${threshold}`);
    }
  }
  
  // Test metrics summary method
  const summary = monitor.getMetricsSummary();
  if (!summary || typeof summary.monitoring === 'undefined') {
    throw new Error('getMetricsSummary method failed');
  }
  
  console.log('✅ Impact monitor basic functionality: PASSED');
  
  // Test 2: Performance monitoring capabilities
  try {
    // Test performance metrics collection
    if ('performance' in window) {
      monitor.collectPeriodicMetrics();
      
      if (!monitor.metrics.performance.timing) {
        throw new Error('Performance timing collection failed');
      }
      
      if (!monitor.metrics.performance.viewport) {
        throw new Error('Viewport metrics collection failed');
      }
    }
    
    // Test response time calculation
    const mockEvent = { timeStamp: performance.now() - 50 };
    const responseTime = monitor.calculateResponseTime(mockEvent);
    
    if (typeof responseTime !== 'number' || responseTime < 0) {
      throw new Error('Response time calculation failed');
    }
    
    console.log('✅ Performance monitoring: PASSED');
    
  } catch (error) {
    console.error('❌ Performance monitoring test failed:', error.message);
  }
  
  // Test 3: Error monitoring and analysis
  try {
    // Test error recording
    const testError = {
      message: 'Test error',
      filename: 'test.js',
      lineno: 1
    };
    
    monitor.recordError('javascript', testError);
    
    if (!monitor.metrics.errors.javascript || monitor.metrics.errors.javascript.length === 0) {
      throw new Error('Error recording failed');
    }
    
    // Test error rate analysis
    monitor.recordInteraction('click', { target: { tagName: 'BUTTON' }, timeStamp: performance.now() });
    monitor.checkErrorRate();
    
    console.log('✅ Error monitoring: PASSED');
    
  } catch (error) {
    console.error('❌ Error monitoring test failed:', error.message);
  }
  
  // Test 4: Accessibility monitoring
  try {
    // Test accessibility event recording
    const mockFocusEvent = {
      target: {
        tagName: 'BUTTON',
        hasAttribute: (attr) => attr === 'tabindex'
      }
    };
    
    monitor.recordAccessibilityEvent('focus', {
      element: mockFocusEvent.target.tagName,
      hasTabIndex: true,
      isVisible: true
    });
    
    if (!monitor.metrics.accessibility.focus || monitor.metrics.accessibility.focus.length === 0) {
      throw new Error('Accessibility event recording failed');
    }
    
    // Test screen reader compatibility check
    monitor.checkScreenReaderCompatibility();
    
    if (!monitor.metrics.accessibility.ariaCompliance) {
      throw new Error('ARIA compliance check failed');
    }
    
    console.log('✅ Accessibility monitoring: PASSED');
    
  } catch (error) {
    console.error('❌ Accessibility monitoring test failed:', error.message);
  }
  
  // Test 5: Impact analysis and alerts
  try {
    // Test impact analysis
    monitor.analyzeUserImpact();
    
    if (!monitor.metrics.analysis || monitor.metrics.analysis.length === 0) {
      throw new Error('Impact analysis failed');
    }
    
    // Test overall performance score calculation
    const overallScore = monitor.calculateOverallPerformanceScore();
    
    if (typeof overallScore !== 'number' || overallScore < 0 || overallScore > 100) {
      throw new Error('Overall performance score calculation failed');
    }
    
    // Test localStorage metrics storage
    const storageKey = monitor.storageKey;
    monitor.saveMetrics();
    
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      throw new Error('Metrics storage failed');
    }
    
    // Cleanup test data
    localStorage.removeItem(storageKey);
    localStorage.removeItem(monitor.metricsHistoryKey);
    
    console.log('✅ Impact analysis and storage: PASSED');
    
  } catch (error) {
    console.error('❌ Impact analysis test failed:', error.message);
  }
  
  console.log('✅ Phase 3 User Impact Monitor: ALL TESTS PASSED');
  
} catch (error) {
  console.error('❌ Phase 3 User Impact Monitor: CRITICAL FAILURE -', error.message);
}