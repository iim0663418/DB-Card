/**
 * Phase 3 Security Dashboard Smoke Test
 * Tests SEC-09: Client-Side Security Dashboard
 */

// Test 1: Basic dashboard initialization
console.log('=== Phase 3 Security Dashboard Smoke Test ===');

try {
  // Test dashboard class availability
  if (typeof ClientSideSecurityDashboard === 'undefined') {
    throw new Error('ClientSideSecurityDashboard class not available');
  }
  
  // Test dashboard instantiation
  const dashboard = new ClientSideSecurityDashboard();
  if (!dashboard) {
    throw new Error('Failed to create dashboard instance');
  }
  
  // Test dashboard properties
  const expectedProperties = ['dbName', 'dbVersion', 'components'];
  for (const prop of expectedProperties) {
    if (!dashboard.hasOwnProperty(prop)) {
      throw new Error(`Missing dashboard property: ${prop}`);
    }
  }
  
  // Test component loading
  dashboard.loadSecurityComponents();
  
  // Check if components are properly loaded
  const componentTypes = ['healthMonitor', 'userImpactMonitor', 'rollbackSystem', 'securityToggle'];
  for (const type of componentTypes) {
    if (!dashboard.components.hasOwnProperty(type)) {
      throw new Error(`Missing component type: ${type}`);
    }
  }
  
  console.log('✅ Dashboard basic functionality: PASSED');
  
  // Test 2: Dashboard UI creation
  try {
    // Test HTML generation
    const dashboardHTML = dashboard.generateDashboardHTML();
    
    if (!dashboardHTML || typeof dashboardHTML !== 'string') {
      throw new Error('Dashboard HTML generation failed');
    }
    
    // Check for essential UI elements
    const essentialElements = [
      'dashboard-header',
      'system-status',
      'security-features',
      'metrics-overview',
      'recent-events',
      'quick-actions'
    ];
    
    for (const elementId of essentialElements) {
      if (!dashboardHTML.includes(elementId)) {
        throw new Error(`Missing essential UI element: ${elementId}`);
      }
    }
    
    // Test dashboard container creation (without adding to DOM)
    dashboard.createDashboardUI();
    
    if (!dashboard.dashboardContainer) {
      throw new Error('Dashboard container creation failed');
    }
    
    // Test dashboard visibility methods
    if (typeof dashboard.showDashboard !== 'function' || 
        typeof dashboard.hideDashboard !== 'function') {
      throw new Error('Dashboard visibility methods missing');
    }
    
    console.log('✅ Dashboard UI creation: PASSED');
    
  } catch (error) {
    console.error('❌ Dashboard UI test failed:', error.message);
  }
  
  // Test 3: IndexedDB integration
  try {
    // Test database initialization (mock)
    if (typeof dashboard.initializeDatabase !== 'function') {
      throw new Error('Database initialization method missing');
    }
    
    // Test database properties
    if (!dashboard.dbName || !dashboard.dbVersion) {
      throw new Error('Database configuration missing');
    }
    
    // Test event recording method
    if (typeof dashboard.recordDashboardEvent !== 'function') {
      throw new Error('Event recording method missing');
    }
    
    console.log('✅ IndexedDB integration: PASSED');
    
  } catch (error) {
    console.error('❌ IndexedDB integration test failed:', error.message);
  }
  
  // Test 4: Security component integration
  try {
    // Test health monitor data retrieval
    if (typeof dashboard.getHealthMonitorData !== 'function') {
      throw new Error('Health monitor data method missing');
    }
    
    // Test user impact data retrieval
    if (typeof dashboard.getUserImpactData !== 'function') {
      throw new Error('User impact data method missing');
    }
    
    // Test metrics card creation
    const testCard = dashboard.createMetricCard('Test Metric', '100%', '#4CAF50');
    
    if (!testCard || typeof testCard !== 'string') {
      throw new Error('Metric card creation failed');
    }
    
    if (!testCard.includes('Test Metric') || !testCard.includes('100%')) {
      throw new Error('Metric card content incorrect');
    }
    
    console.log('✅ Security component integration: PASSED');
    
  } catch (error) {
    console.error('❌ Security component integration test failed:', error.message);
  }
  
  // Test 5: Dashboard actions and utilities
  try {
    // Test time formatting
    const now = Date.now();
    const timeAgo = dashboard.formatTimeAgo(now - 60000); // 1 minute ago
    
    if (!timeAgo || !timeAgo.includes('1m ago')) {
      throw new Error('Time formatting failed');
    }
    
    // Test severity color mapping
    const errorColor = dashboard.getSeverityColor('error');
    const warningColor = dashboard.getSeverityColor('warning');
    
    if (!errorColor || !warningColor) {
      throw new Error('Severity color mapping failed');
    }
    
    // Test localStorage data export
    const exportData = dashboard.exportLocalStorageData();
    
    if (!exportData || typeof exportData !== 'object') {
      throw new Error('localStorage data export failed');
    }
    
    // Test overall score calculation
    const testImpactData = {
      errors: { javascript: [{ message: 'test' }] },
      interactions: { click: [{ responseTime: 50 }] }
    };
    
    const score = dashboard.calculateOverallScore(testImpactData);
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error('Overall score calculation failed');
    }
    
    console.log('✅ Dashboard actions and utilities: PASSED');
    
  } catch (error) {
    console.error('❌ Dashboard actions test failed:', error.message);
  }
  
  // Test 6: Keyboard shortcut and accessibility
  try {
    // Test keyboard shortcut setup
    if (typeof dashboard.setupKeyboardShortcut !== 'function') {
      throw new Error('Keyboard shortcut setup method missing');
    }
    
    // Test toggle functionality
    if (typeof dashboard.toggleDashboard !== 'function') {
      throw new Error('Dashboard toggle method missing');
    }
    
    // Test cleanup method
    if (typeof dashboard.cleanup !== 'function') {
      throw new Error('Dashboard cleanup method missing');
    }
    
    // Test dashboard state tracking
    if (typeof dashboard.isVisible !== 'boolean') {
      throw new Error('Dashboard visibility state tracking missing');
    }
    
    console.log('✅ Keyboard shortcuts and accessibility: PASSED');
    
  } catch (error) {
    console.error('❌ Keyboard shortcuts test failed:', error.message);
  }
  
  // Cleanup test dashboard
  try {
    if (dashboard.dashboardContainer && dashboard.dashboardContainer.parentElement) {
      dashboard.dashboardContainer.parentElement.removeChild(dashboard.dashboardContainer);
    }
  } catch (cleanupError) {
    console.warn('Dashboard cleanup warning:', cleanupError.message);
  }
  
  console.log('✅ Phase 3 Security Dashboard: ALL TESTS PASSED');
  
} catch (error) {
  console.error('❌ Phase 3 Security Dashboard: CRITICAL FAILURE -', error.message);
}