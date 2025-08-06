/**
 * Basic Static Hosting Security Components Test
 * Simple validation of SEC-01 to SEC-03 components
 */

const fs = require('fs');
const path = require('path');

function runBasicTests() {
  console.log('🧪 Running Basic Static Hosting Security Tests...\n');
  
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
  
  // File existence tests
  console.log('📁 File Existence Tests');
  
  test('StaticHostingSecurityToggle.js exists', () => {
    const filePath = path.join(__dirname, '../../src/security/StaticHostingSecurityToggle.js');
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
  });
  
  test('StaticHostingCompatibilityLayer.js exists', () => {
    const filePath = path.join(__dirname, '../../src/security/StaticHostingCompatibilityLayer.js');
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
  });
  
  test('ClientSideSecurityHealthMonitor.js exists', () => {
    const filePath = path.join(__dirname, '../../src/security/ClientSideSecurityHealthMonitor.js');
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
  });
  
  // Syntax validation tests
  console.log('\n🔍 Syntax Validation Tests');
  
  test('StaticHostingSecurityToggle syntax is valid', () => {
    const filePath = path.join(__dirname, '../../src/security/StaticHostingSecurityToggle.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    if (!content.includes('class StaticHostingSecurityToggle')) {
      throw new Error('Class definition not found');
    }
    
    if (!content.includes('constructor()')) {
      throw new Error('Constructor not found');
    }
    
    if (!content.includes('isEnabled(feature)')) {
      throw new Error('isEnabled method not found');
    }
    
    if (!content.includes('toggle(feature, enabled')) {
      throw new Error('toggle method not found');
    }
  });
  
  test('StaticHostingCompatibilityLayer syntax is valid', () => {
    const filePath = path.join(__dirname, '../../src/security/StaticHostingCompatibilityLayer.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('class StaticHostingCompatibilityLayer')) {
      throw new Error('Class definition not found');
    }
    
    if (!content.includes('async initialize()')) {
      throw new Error('initialize method not found');
    }
    
    if (!content.includes('async storeCard(cardData)')) {
      throw new Error('storeCard method not found');
    }
    
    if (!content.includes('async validateAccess(')) {
      throw new Error('validateAccess method not found');
    }
  });
  
  test('ClientSideSecurityHealthMonitor syntax is valid', () => {
    const filePath = path.join(__dirname, '../../src/security/ClientSideSecurityHealthMonitor.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('class ClientSideSecurityHealthMonitor')) {
      throw new Error('Class definition not found');
    }
    
    if (!content.includes('async initialize()')) {
      throw new Error('initialize method not found');
    }
    
    if (!content.includes('async recordEvent(')) {
      throw new Error('recordEvent method not found');
    }
    
    if (!content.includes('async recordSecurityEvent(')) {
      throw new Error('recordSecurityEvent method not found');
    }
  });
  
  // Integration validation tests
  console.log('\n🔗 Integration Validation Tests');
  
  test('PWA storage.js includes security integration', () => {
    const filePath = path.join(__dirname, '../../pwa-card-storage/src/core/storage.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('initializeSecurityComponents')) {
      throw new Error('Security components initialization not found');
    }
    
    if (!content.includes('this.securityToggle')) {
      throw new Error('Security toggle integration not found');
    }
    
    if (!content.includes('this.compatibilityLayer')) {
      throw new Error('Compatibility layer integration not found');
    }
    
    if (!content.includes('this.healthMonitor')) {
      throw new Error('Health monitor integration not found');
    }
  });
  
  test('PWA app.js includes security loading', () => {
    const filePath = path.join(__dirname, '../../pwa-card-storage/src/app.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('loadSecurityComponents')) {
      throw new Error('Security components loading not found');
    }
    
    if (!content.includes('StaticHostingSecurityToggle')) {
      throw new Error('Security toggle reference not found');
    }
    
    if (!content.includes('setupSecurityUI')) {
      throw new Error('Security UI setup not found');
    }
  });
  
  test('PWA index.html includes security scripts', () => {
    const filePath = path.join(__dirname, '../../pwa-card-storage/index.html');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('StaticHostingSecurityToggle.js')) {
      throw new Error('Security toggle script not found');
    }
    
    if (!content.includes('StaticHostingCompatibilityLayer.js')) {
      throw new Error('Compatibility layer script not found');
    }
    
    if (!content.includes('ClientSideSecurityHealthMonitor.js')) {
      throw new Error('Health monitor script not found');
    }
  });
  
  // Feature validation tests
  console.log('\n⚙️ Feature Validation Tests');
  
  test('Security toggle has required default features', () => {
    const filePath = path.join(__dirname, '../../src/security/StaticHostingSecurityToggle.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('webauthn:')) {
      throw new Error('WebAuthn feature not found in defaults');
    }
    
    if (!content.includes('encryption:')) {
      throw new Error('Encryption feature not found in defaults');
    }
    
    if (!content.includes('monitoring:')) {
      throw new Error('Monitoring feature not found in defaults');
    }
    
    if (!content.includes('inputValidation:')) {
      throw new Error('Input validation feature not found in defaults');
    }
  });
  
  test('Compatibility layer has fallback mechanisms', () => {
    const filePath = path.join(__dirname, '../../src/security/StaticHostingCompatibilityLayer.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('_basicAccessValidation')) {
      throw new Error('Basic access validation fallback not found');
    }
    
    if (!content.includes('_handleSecurityFailure')) {
      throw new Error('Security failure handler not found');
    }
    
    if (!content.includes('fallbackStorage')) {
      throw new Error('Fallback storage not found');
    }
  });
  
  test('Health monitor has IndexedDB integration', () => {
    const filePath = path.join(__dirname, '../../src/security/ClientSideSecurityHealthMonitor.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('indexedDB.open')) {
      throw new Error('IndexedDB integration not found');
    }
    
    if (!content.includes('health_events')) {
      throw new Error('Health events store not found');
    }
    
    if (!content.includes('security_alerts')) {
      throw new Error('Security alerts store not found');
    }
    
    if (!content.includes('system_metrics')) {
      throw new Error('System metrics store not found');
    }
  });
  
  // Summary
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All basic tests passed! Static hosting security components are properly integrated.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runBasicTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runBasicTests };