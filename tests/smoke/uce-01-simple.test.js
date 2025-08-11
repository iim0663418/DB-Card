/**
 * UCE-01 Simple Smoke Test: UserKeyManager 核心實作
 * 簡化版本測試，專注於核心功能驗證
 */

const fs = require('fs');
const crypto = require('crypto').webcrypto;

// Mock browser environment
global.crypto = crypto;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;
global.performance = require('perf_hooks').performance;
global.console = console;
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; }
};

// Load UserKeyManager directly
const userKeyManagerCode = fs.readFileSync('./pwa-card-storage/src/core/user-key-manager.js', 'utf8');
eval(userKeyManagerCode);

async function runSimpleTests() {
  console.log('[UCE-01 Simple Test] Starting basic functionality tests...');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Class instantiation
    console.log('[UCE-01 Simple Test] Test 1: Class instantiation');
    const manager = new UserKeyManager();
    console.log('[UCE-01 Simple Test] ✓ UserKeyManager instantiated successfully');
    passed++;
    
    // Test 2: Passphrase validation
    console.log('[UCE-01 Simple Test] Test 2: Passphrase validation');
    const validPhrase = {
      adjective: '美麗',
      noun: '花朵', 
      verb: '綻放',
      language: 'zh-TW'
    };
    
    const validation = manager.validatePassphraseStructure(validPhrase);
    if (validation.valid && validation.entropy >= 32) {
      console.log(`[UCE-01 Simple Test] ✓ Passphrase validation works correctly (entropy: ${Math.round(validation.entropy)} bits)`);
      passed++;
    } else {
      console.log(`[UCE-01 Simple Test] ✗ Passphrase validation failed (entropy: ${Math.round(validation.entropy || 0)} bits)`);
      failed++;
    }
    
    // Test 3: Key generation performance
    console.log('[UCE-01 Simple Test] Test 3: Key generation performance');
    const startTime = performance.now();
    const keyResult = await manager.generateDeterministicKey(validPhrase);
    const duration = performance.now() - startTime;
    
    if (keyResult.key && keyResult.keyId && duration < 2000) {
      console.log(`[UCE-01 Simple Test] ✓ Key generated in ${Math.round(duration)}ms`);
      passed++;
    } else {
      console.log(`[UCE-01 Simple Test] ✗ Key generation failed or too slow (${Math.round(duration)}ms)`);
      failed++;
    }
    
    // Test 4: Deterministic key generation
    console.log('[UCE-01 Simple Test] Test 4: Deterministic key generation');
    const keyResult2 = await manager.generateDeterministicKey(validPhrase);
    
    if (keyResult.keyId === keyResult2.keyId) {
      console.log('[UCE-01 Simple Test] ✓ Keys are deterministic');
      passed++;
    } else {
      console.log('[UCE-01 Simple Test] ✗ Keys are not deterministic');
      failed++;
    }
    
    // Test 5: Encryption/Decryption
    console.log('[UCE-01 Simple Test] Test 5: Encryption/Decryption');
    const testData = 'Test encryption data';
    const encrypted = await manager.testEncryption(keyResult.key, testData);
    const decrypted = await manager.testDecryption(keyResult.key, encrypted);
    
    if (decrypted === testData) {
      console.log('[UCE-01 Simple Test] ✓ Encryption/Decryption works correctly');
      passed++;
    } else {
      console.log('[UCE-01 Simple Test] ✗ Encryption/Decryption failed');
      failed++;
    }
    
    // Test 6: Set and verify passphrase
    console.log('[UCE-01 Simple Test] Test 6: Set and verify passphrase');
    const setResult = await manager.setUserPassphrase(validPhrase);
    
    if (setResult.success) {
      const verifyResult = await manager.verifyUserPassphrase(validPhrase);
      if (verifyResult.success) {
        console.log('[UCE-01 Simple Test] ✓ Set and verify passphrase works');
        passed++;
      } else {
        console.log('[UCE-01 Simple Test] ✗ Verify passphrase failed');
        failed++;
      }
    } else {
      console.log('[UCE-01 Simple Test] ✗ Set passphrase failed');
      failed++;
    }
    
    // Test 7: Key failure detection
    console.log('[UCE-01 Simple Test] Test 7: Key failure detection');
    const failureResult = await manager.detectKeyFailure();
    
    if (typeof failureResult.isValid === 'boolean') {
      console.log('[UCE-01 Simple Test] ✓ Key failure detection works');
      passed++;
    } else {
      console.log('[UCE-01 Simple Test] ✗ Key failure detection failed');
      failed++;
    }
    
    // Test 8: Memory clearing
    console.log('[UCE-01 Simple Test] Test 8: Memory clearing');
    await manager.clearMemory();
    const statusAfterClear = manager.getStatus();
    
    if (!statusAfterClear.hasActiveKey) {
      console.log('[UCE-01 Simple Test] ✓ Memory clearing works');
      passed++;
    } else {
      console.log('[UCE-01 Simple Test] ✗ Memory clearing failed');
      failed++;
    }
    
  } catch (error) {
    console.error('[UCE-01 Simple Test] Test execution error:', error.message);
    failed++;
  }
  
  // Summary
  console.log('\n[UCE-01 Simple Test] ===== TEST SUMMARY =====');
  console.log(`[UCE-01 Simple Test] Passed: ${passed}`);
  console.log(`[UCE-01 Simple Test] Failed: ${failed}`);
  console.log(`[UCE-01 Simple Test] Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  const success = failed === 0;
  console.log(`[UCE-01 Simple Test] Overall Result: ${success ? 'PASS' : 'FAIL'}`);
  
  return { success, passed, failed };
}

// Run tests
runSimpleTests().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('[UCE-01 Simple Test] Fatal error:', error);
  process.exit(1);
});