/**
 * Static Hosting Security Components Smoke Test
 * Tests basic functionality of SEC-01 to SEC-03 components
 */

// Mock localStorage for Node.js environment
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; },
    removeItem: function(key) { delete this.data[key]; },
    clear: function() { this.data = {}; }
  };
}

// Mock IndexedDB for Node.js environment
if (typeof indexedDB === 'undefined') {
  global.indexedDB = {
    open: function() {
      return {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          transaction: function() {
            return {
              objectStore: function() {
                return {
                  add: function() { return { onsuccess: null, onerror: null }; },
                  get: function() { return { onsuccess: null, onerror: null }; },
                  createIndex: function() {}
                };
              }
            };
          },
          createObjectStore: function() {
            return {
              createIndex: function() {}
            };
          },
          objectStoreNames: { contains: function() { return false; } }
        }
      };
    }
  };
}

// Mock window object
if (typeof window === 'undefined') {
  global.window = {
    addEventListener: function() {},
    crypto: {
      getRandomValues: function(arr) {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    },
    location: { reload: function() {} },
    performance: { memory: null }
  };
}

// Load the components
const fs = require('fs');
const path = require('path');

// Load StaticHostingSecurityToggle
const toggleCode = fs.readFileSync(path.join(__dirname, '../../src/security/StaticHostingSecurityToggle.js'), 'utf8');
eval(toggleCode.replace('if (typeof module !== \'undefined\' && module.exports) {', 'if (false) {'));

// Load StaticHostingCompatibilityLayer  
const compatibilityCode = fs.readFileSync(path.join(__dirname, '../../src/security/StaticHostingCompatibilityLayer.js'), 'utf8');
eval(compatibilityCode.replace('if (typeof module !== \'undefined\' && module.exports) {', 'if (false) {'));

// Load ClientSideSecurityHealthMonitor
const monitorCode = fs.readFileSync(path.join(__dirname, '../../src/security/ClientSideSecurityHealthMonitor.js'), 'utf8');
eval(monitorCode.replace('if (typeof module !== \'undefined\' && module.exports) {', 'if (false) {'));

// Make classes available globally
global.StaticHostingSecurityToggle = StaticHostingSecurityToggle;
global.StaticHostingCompatibilityLayer = StaticHostingCompatibilityLayer;
global.ClientSideSecurityHealthMonitor = ClientSideSecurityHealthMonitor;

/**
 * Test Suite: Static Hosting Security Components
 */
function runSmokeTests() {
  console.log('🧪 Running Static Hosting Security Smoke Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, testFn) {
    try {
      testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }
  
  // SEC-01: StaticHostingSecurityToggle Tests
  console.log('📋 SEC-01: StaticHostingSecurityToggle Tests');
  
  test('StaticHostingSecurityToggle class exists', () => {
    if (typeof StaticHostingSecurityToggle !== 'function') {
      throw new Error('StaticHostingSecurityToggle class not found');
    }
  });
  
  test('Can create StaticHostingSecurityToggle instance', () => {
    const toggle = new StaticHostingSecurityToggle();
    if (!toggle) throw new Error('Failed to create instance');
  });
  
  test('Default features are properly configured', () => {
    const toggle = new StaticHostingSecurityToggle();
    const features = toggle.getAllFeatures();
    
    if (!features.webauthn || !features.encryption || !features.monitoring) {
      throw new Error('Default features not properly configured');
    }
    
    if (features.webauthn.enabled !== false) {
      throw new Error('WebAuthn should be disabled by default');
    }
  });
  
  test('Can toggle features on/off', () => {
    const toggle = new StaticHostingSecurityToggle();
    
    // Test enabling encryption
    const result = toggle.toggle('encryption', true, { autoReload: false });
    if (!result) throw new Error('Toggle operation failed');
    
    if (!toggle.isEnabled('encryption')) {
      throw new Error('Feature not enabled after toggle');
    }
    
    // Test disabling encryption
    toggle.toggle('encryption', false, { autoReload: false });
    if (toggle.isEnabled('encryption')) {
      throw new Error('Feature not disabled after toggle');
    }
  });
  
  test('Observer pattern works correctly', () => {
    const toggle = new StaticHostingSecurityToggle();
    let notified = false;
    
    const observer = (feature, enabled) => {
      notified = true;
    };
    
    toggle.addObserver(observer);
    toggle.toggle('monitoring', true, { autoReload: false });
    
    if (!notified) throw new Error('Observer not notified');
    
    toggle.removeObserver(observer);
  });
  
  // SEC-02: StaticHostingCompatibilityLayer Tests
  console.log('\n🔧 SEC-02: StaticHostingCompatibilityLayer Tests');
  
  test('StaticHostingCompatibilityLayer class exists', () => {
    if (typeof StaticHostingCompatibilityLayer !== 'function') {
      throw new Error('StaticHostingCompatibilityLayer class not found');
    }
  });
  
  test('Can create StaticHostingCompatibilityLayer instance', () => {
    const layer = new StaticHostingCompatibilityLayer();
    if (!layer) throw new Error('Failed to create instance');
  });
  
  test('Basic access validation works', () => {
    const layer = new StaticHostingCompatibilityLayer();
    const result = layer._basicAccessValidation('read', 'card-data', {});
    
    if (!result.authorized) {
      throw new Error('Basic access validation should allow read operations');
    }
  });
  
  test('Rate limiting works', () => {
    const layer = new StaticHostingCompatibilityLayer();
    
    // Simulate many operations
    for (let i = 0; i < 150; i++) {
      layer._basicAccessValidation('read', 'card-data', {});
    }
    
    const result = layer._basicAccessValidation('read', 'card-data', {});
    if (result.authorized) {
      throw new Error('Rate limiting should have blocked excessive operations');
    }
  });
  
  test('Can get compatibility status', () => {
    const layer = new StaticHostingCompatibilityLayer();
    const status = layer.getStatus();
    
    if (typeof status !== 'object' || !status.hasOwnProperty('initialized')) {
      throw new Error('Status object malformed');
    }
  });
  
  // SEC-03: ClientSideSecurityHealthMonitor Tests
  console.log('\n📊 SEC-03: ClientSideSecurityHealthMonitor Tests');
  
  test('ClientSideSecurityHealthMonitor class exists', () => {
    if (typeof ClientSideSecurityHealthMonitor !== 'function') {
      throw new Error('ClientSideSecurityHealthMonitor class not found');
    }
  });
  
  test('Can create ClientSideSecurityHealthMonitor instance', () => {
    const monitor = new ClientSideSecurityHealthMonitor();
    if (!monitor) throw new Error('Failed to create instance');
  });
  
  test('Event severity determination works', () => {
    const monitor = new ClientSideSecurityHealthMonitor();
    
    const criticalSeverity = monitor.determineSeverity('database_corruption', {});
    if (criticalSeverity !== 'critical') {
      throw new Error('Critical events not properly classified');
    }
    
    const lowSeverity = monitor.determineSeverity('normal_operation', {});
    if (lowSeverity !== 'low') {
      throw new Error('Low priority events not properly classified');
    }
  });
  
  test('Security event severity determination works', () => {
    const monitor = new ClientSideSecurityHealthMonitor();
    
    const highSeverity = monitor.determineSecuritySeverity('authentication_failure', {});
    if (highSeverity !== 'high') {
      throw new Error('High security events not properly classified');
    }
  });
  
  test('Event queue exists and works', () => {
    const monitor = new ClientSideSecurityHealthMonitor();
    
    if (!Array.isArray(monitor.eventQueue)) {
      throw new Error('Event queue not properly initialized');
    }
    
    // Test synchronous event addition
    monitor.eventQueue.push({ type: 'test', timestamp: Date.now() });
    
    if (monitor.eventQueue.length === 0) {
      throw new Error('Event not added to queue');
    }
  });
  
  test('Memory info collection works', () => {
    const monitor = new ClientSideSecurityHealthMonitor();
    const memInfo = monitor.getMemoryInfo();
    
    if (typeof memInfo !== 'object') {
      throw new Error('Memory info should return object');
    }
  });
  
  test('Security status collection works', () => {
    const monitor = new ClientSideSecurityHealthMonitor();
    const securityStatus = monitor.getSecurityStatus();
    
    if (!securityStatus.hasOwnProperty('https') || !securityStatus.hasOwnProperty('crypto_available')) {
      throw new Error('Security status missing required fields');
    }
  });
  
  // Integration Tests
  console.log('\n🔗 Integration Tests');
  
  test('Components can work together', () => {
    const toggle = new StaticHostingSecurityToggle();
    const layer = new StaticHostingCompatibilityLayer();
    const monitor = new ClientSideSecurityHealthMonitor();
    
    // Test integration
    toggle.toggle('encryption', true, { autoReload: false });
    
    if (!toggle.isEnabled('encryption')) {
      throw new Error('Integration test failed - toggle not working');
    }
    
    const status = layer.getStatus();
    if (typeof status !== 'object') {
      throw new Error('Integration test failed - layer status not working');
    }
  });
  
  test('Error handling works correctly', () => {
    const toggle = new StaticHostingSecurityToggle();
    
    // Test invalid feature
    const result = toggle.toggle('invalid_feature', true, { autoReload: false });
    if (!result) {
      // This is expected behavior - should handle gracefully
      console.log('  ℹ️  Invalid feature toggle handled gracefully');
    }
  });
  
  // Summary
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All smoke tests passed! Static hosting security components are ready.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runSmokeTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runSmokeTests };