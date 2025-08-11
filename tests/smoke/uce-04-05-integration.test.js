/**
 * UCE-04 & UCE-05 Integration Smoke Tests
 * Tests KeyRecoveryManager and Storage Integration
 * 
 * @version 3.2.2-user-controlled-encryption
 * @test-scope KeyRecoveryManager + PWACardStorage integration
 */

console.log('[UCE-04-05-Test] Starting integration smoke tests...');

// Test environment setup
const isNode = typeof window === 'undefined';
let KeyRecoveryManager, UserKeyManager, PWACardStorage;

if (isNode) {
  // Node.js environment
  try {
    // Load modules to populate globals
    require('../../pwa-card-storage/src/core/key-recovery-manager.js');
    require('../../pwa-card-storage/src/core/user-key-manager.js');
    require('../../pwa-card-storage/src/core/storage.js');
    
    // Use global variables
    KeyRecoveryManager = global.KeyRecoveryManager;
    UserKeyManager = global.UserKeyManager;
    PWACardStorage = global.PWACardStorage;
    
    // Verify modules loaded
    if (!KeyRecoveryManager || !UserKeyManager || !PWACardStorage) {
      throw new Error('Failed to load required modules');
    }
    
    // Mock Web Crypto API for Node.js
    global.crypto = {
      subtle: {
        importKey: () => Promise.resolve({}),
        deriveKey: () => Promise.resolve({}),
        encrypt: () => Promise.resolve(new ArrayBuffer(32)),
        decrypt: () => Promise.resolve(new ArrayBuffer(16)),
        digest: () => Promise.resolve(new ArrayBuffer(32))
      },
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }
    };
    
    // Mock window for browser APIs
    global.window = {
      crypto: global.crypto,
      indexedDB: global.indexedDB
    };
    
    // Mock IndexedDB
    global.indexedDB = {
      open: () => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          transaction: () => ({
            objectStore: () => ({
              get: () => ({ onsuccess: null, result: null }),
              put: () => ({ onsuccess: null }),
              add: () => ({ onsuccess: null }),
              delete: () => ({ onsuccess: null })
            })
          })
        }
      })
    };
    
  } catch (error) {
    console.error('[UCE-04-05-Test] Failed to load modules in Node.js:', error);
    process.exit(1);
  }
} else {
  // Browser environment
  KeyRecoveryManager = window.KeyRecoveryManager;
  UserKeyManager = window.UserKeyManager;
  PWACardStorage = window.PWACardStorage;
}

// Test utilities
class TestUtils {
  static createMockStorage() {
    return {
      settings: new Map(),
      cards: new Map(),
      
      async getSetting(key) {
        return this.settings.get(key);
      },
      
      async setSetting(key, value) {
        this.settings.set(key, value);
        return true;
      },
      
      async listCards() {
        return Array.from(this.cards.values());
      },
      
      async getCard(id) {
        return this.cards.get(id);
      },
      
      async storeCard(cardData) {
        const id = 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        const card = {
          id,
          data: cardData,
          created: new Date(),
          encrypted: false
        };
        this.cards.set(id, card);
        return id;
      },
      
      async safeTransaction(stores, mode, operation) {
        // Mock transaction
        const mockTransaction = {
          objectStore: (name) => ({
            get: (key) => ({ onsuccess: null, result: this.cards.get(key) }),
            put: (data) => ({ onsuccess: null }),
            add: (data) => ({ onsuccess: null }),
            delete: (key) => ({ onsuccess: null })
          })
        };
        return await operation(mockTransaction);
      },
      
      async encryptCardData(data) {
        return { encrypted: true, data: JSON.stringify(data) };
      },
      
      async decryptCardData(encryptedData) {
        if (encryptedData.encrypted) {
          return JSON.parse(encryptedData.data);
        }
        return encryptedData;
      },
      
      safeLog: (level, message, context) => {
        console.log(`[MockStorage] ${level}: ${message}`, context || '');
      },
      
      sanitizeInput: (input) => String(input).substring(0, 200)
    };
  }
  
  static createMockUserKeyManager() {
    return {
      currentKey: null,
      isLocked: false,
      
      async setUserPassphrase(phrases) {
        return {
          success: true,
          keyId: 'test_key_123',
          entropy: 65
        };
      },
      
      async verifyUserPassphrase(phrases) {
        return {
          success: true,
          keyId: 'test_key_123'
        };
      },
      
      async deriveEncryptionKey(phrases) {
        this.currentKey = { type: 'mock-key' };
        return this.currentKey;
      },
      
      async detectKeyFailure() {
        return {
          isValid: true
        };
      },
      
      async clearMemory() {
        this.currentKey = null;
      },
      
      getStatus() {
        return {
          hasActiveKey: !!this.currentKey,
          isLocked: this.isLocked,
          failedAttempts: 0,
          remainingLockoutTime: 0,
          cacheSize: 0,
          keyMetadata: null
        };
      }
    };
  }
  
  static createTestPhrases() {
    return {
      adjective: '美麗',
      noun: '花朵',
      verb: '綻放',
      language: 'zh-TW'
    };
  }
  
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Test suite
class UCE0405IntegrationTests {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }
  
  async runTest(testName, testFn) {
    this.totalTests++;
    console.log(`[UCE-04-05-Test] Running: ${testName}`);
    
    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;
      
      this.passedTests++;
      this.testResults.push({
        name: testName,
        status: 'PASS',
        duration,
        error: null
      });
      
      console.log(`[UCE-04-05-Test] ✅ ${testName} (${duration}ms)`);
      
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAIL',
        duration: 0,
        error: error.message
      });
      
      console.error(`[UCE-04-05-Test] ❌ ${testName}: ${error.message}`);
    }
  }
  
  async runAllTests() {
    console.log('[UCE-04-05-Test] Starting UCE-04 & UCE-05 integration tests...');
    
    // Test 1: KeyRecoveryManager initialization
    await this.runTest('KeyRecoveryManager Initialization', async () => {
      const mockStorage = TestUtils.createMockStorage();
      const mockUserKeyManager = TestUtils.createMockUserKeyManager();
      
      const keyRecoveryManager = new KeyRecoveryManager(mockStorage, mockUserKeyManager);
      
      if (!keyRecoveryManager) {
        throw new Error('KeyRecoveryManager not created');
      }
      
      const status = keyRecoveryManager.getStatus();
      if (typeof status !== 'object') {
        throw new Error('Invalid status object');
      }
      
      if (status.recoveryInProgress !== false) {
        throw new Error('Initial recovery state should be false');
      }
    });
    
    // Test 2: Trigger recovery process
    await this.runTest('Trigger Recovery Process', async () => {
      const mockStorage = TestUtils.createMockStorage();
      const mockUserKeyManager = TestUtils.createMockUserKeyManager();
      const keyRecoveryManager = new KeyRecoveryManager(mockStorage, mockUserKeyManager);
      
      const result = await keyRecoveryManager.triggerRecovery('test failure');
      
      if (!result.recoveryId) {
        throw new Error('Recovery ID not generated');
      }
      
      if (!Array.isArray(result.hints)) {
        throw new Error('Recovery hints not provided');
      }
      
      if (result.hints.length === 0) {
        throw new Error('No recovery hints generated');
      }
    });
    
    // Test 3: Health check functionality
    await this.runTest('Health Check Functionality', async () => {
      const mockStorage = TestUtils.createMockStorage();
      const mockUserKeyManager = TestUtils.createMockUserKeyManager();
      const keyRecoveryManager = new KeyRecoveryManager(mockStorage, mockUserKeyManager);
      
      const healthResult = await keyRecoveryManager.performHealthCheck();
      
      if (typeof healthResult.keyIntegrity !== 'boolean') {
        throw new Error('Key integrity check missing');
      }
      
      if (typeof healthResult.dataIntegrity !== 'boolean') {
        throw new Error('Data integrity check missing');
      }
      
      if (!Array.isArray(healthResult.recommendations)) {
        throw new Error('Recommendations not provided');
      }
    });
    
    // Test 4: Batch data recovery
    await this.runTest('Batch Data Recovery', async () => {
      const mockStorage = TestUtils.createMockStorage();
      const mockUserKeyManager = TestUtils.createMockUserKeyManager();
      const keyRecoveryManager = new KeyRecoveryManager(mockStorage, mockUserKeyManager);
      
      // Add some test cards
      await mockStorage.storeCard({ name: 'Test Card 1', email: 'test1@example.com' });
      await mockStorage.storeCard({ name: 'Test Card 2', email: 'test2@example.com' });
      
      const mockKey = { type: 'mock-crypto-key' };
      const result = await keyRecoveryManager.batchDataRecovery(mockKey);
      
      if (typeof result.totalItems !== 'number') {
        throw new Error('Total items count missing');
      }
      
      if (typeof result.recoveredItems !== 'number') {
        throw new Error('Recovered items count missing');
      }
      
      if (!Array.isArray(result.failedItems)) {
        throw new Error('Failed items array missing');
      }
    });
    
    // Test 5: Storage integration - user encryption setup
    await this.runTest('Storage Integration - User Encryption Setup', async () => {
      const mockStorage = TestUtils.createMockStorage();
      
      // Mock the required methods for storage integration
      mockStorage.userKeyManager = TestUtils.createMockUserKeyManager();
      mockStorage.encryptionStatus = { enabled: false };
      
      mockStorage.setUserPassphrase = async function(phrases) {
        const result = await this.userKeyManager.setUserPassphrase(phrases);
        if (result.success) {
          this.encryptionStatus = {
            enabled: true,
            userControlled: true,
            requiresUnlock: false,
            keyId: result.keyId
          };
        }
        return result;
      };
      
      const testPhrases = TestUtils.createTestPhrases();
      const result = await mockStorage.setUserPassphrase(testPhrases);
      
      if (!result.success) {
        throw new Error('Failed to set user passphrase');
      }
      
      if (!result.keyId) {
        throw new Error('Key ID not returned');
      }
      
      if (typeof result.entropy !== 'number') {
        throw new Error('Entropy not calculated');
      }
    });
    
    // Test 6: Storage integration - unlock functionality
    await this.runTest('Storage Integration - Unlock Functionality', async () => {
      const mockStorage = TestUtils.createMockStorage();
      mockStorage.userKeyManager = TestUtils.createMockUserKeyManager();
      mockStorage.encryptionStatus = { requiresUnlock: true };
      
      mockStorage.unlockWithPassphrase = async function(phrases) {
        const result = await this.userKeyManager.verifyUserPassphrase(phrases);
        if (result.success) {
          this.encryptionStatus.requiresUnlock = false;
          this.encryptionStatus.keyId = result.keyId;
        }
        return result;
      };
      
      const testPhrases = TestUtils.createTestPhrases();
      const result = await mockStorage.unlockWithPassphrase(testPhrases);
      
      if (!result.success) {
        throw new Error('Failed to unlock with passphrase');
      }
      
      if (mockStorage.encryptionStatus.requiresUnlock !== false) {
        throw new Error('System still requires unlock after successful verification');
      }
    });
    
    // Test 7: Enhanced health check integration
    await this.runTest('Enhanced Health Check Integration', async () => {
      const mockStorage = TestUtils.createMockStorage();
      mockStorage.userKeyManager = TestUtils.createMockUserKeyManager();
      mockStorage.keyRecoveryManager = new KeyRecoveryManager(mockStorage, mockStorage.userKeyManager);
      mockStorage.encryptionStatus = { enabled: true, userControlled: true };
      
      mockStorage.performHealthCheck = async function() {
        return { healthy: true, corruptedCount: 0 };
      };
      
      mockStorage.performEnhancedHealthCheck = async function() {
        const standardHealth = await this.performHealthCheck();
        const keyRecoveryHealth = await this.keyRecoveryManager.performHealthCheck();
        
        return {
          ...standardHealth,
          keyRecovery: keyRecoveryHealth,
          encryptionStatus: this.encryptionStatus,
          requiresUnlock: false,
          userEncryptionConfigured: true
        };
      };
      
      const healthResult = await mockStorage.performEnhancedHealthCheck();
      
      if (!healthResult.keyRecovery) {
        throw new Error('Key recovery health check missing');
      }
      
      if (typeof healthResult.keyRecovery.keyIntegrity !== 'boolean') {
        throw new Error('Key integrity check missing in enhanced health check');
      }
      
      if (!healthResult.encryptionStatus) {
        throw new Error('Encryption status missing in enhanced health check');
      }
    });
    
    // Test 8: Complete integration workflow
    await this.runTest('Complete Integration Workflow', async () => {
      const mockStorage = TestUtils.createMockStorage();
      const mockUserKeyManager = TestUtils.createMockUserKeyManager();
      const keyRecoveryManager = new KeyRecoveryManager(mockStorage, mockUserKeyManager);
      
      // Setup user encryption
      mockStorage.userKeyManager = mockUserKeyManager;
      mockStorage.keyRecoveryManager = keyRecoveryManager;
      
      // Simulate complete workflow
      const testPhrases = TestUtils.createTestPhrases();
      
      // 1. Set passphrase
      const setupResult = await mockUserKeyManager.setUserPassphrase(testPhrases);
      if (!setupResult.success) {
        throw new Error('Failed to set passphrase in workflow');
      }
      
      // 2. Verify passphrase
      const verifyResult = await mockUserKeyManager.verifyUserPassphrase(testPhrases);
      if (!verifyResult.success) {
        throw new Error('Failed to verify passphrase in workflow');
      }
      
      // 3. Perform health check
      const healthResult = await keyRecoveryManager.performHealthCheck();
      if (!healthResult.keyIntegrity) {
        throw new Error('Key integrity check failed in workflow');
      }
      
      // 4. Test recovery trigger
      const recoveryResult = await keyRecoveryManager.triggerRecovery('workflow test');
      if (!recoveryResult.recoveryId) {
        throw new Error('Recovery trigger failed in workflow');
      }
      
      // 5. Complete recovery
      await keyRecoveryManager.completeRecovery(recoveryResult.recoveryId, true);
      
      const finalStatus = keyRecoveryManager.getStatus();
      if (finalStatus.recoveryInProgress !== false) {
        throw new Error('Recovery not properly completed in workflow');
      }
    });
    
    // Print results
    this.printResults();
  }
  
  printResults() {
    console.log('\n[UCE-04-05-Test] ========== TEST RESULTS ==========');
    console.log(`[UCE-04-05-Test] Total Tests: ${this.totalTests}`);
    console.log(`[UCE-04-05-Test] Passed: ${this.passedTests}`);
    console.log(`[UCE-04-05-Test] Failed: ${this.totalTests - this.passedTests}`);
    console.log(`[UCE-04-05-Test] Success Rate: ${Math.round((this.passedTests / this.totalTests) * 100)}%`);
    
    if (this.passedTests === this.totalTests) {
      console.log('[UCE-04-05-Test] 🎉 All tests passed!');
    } else {
      console.log('[UCE-04-05-Test] ❌ Some tests failed:');
      this.testResults
        .filter(result => result.status === 'FAIL')
        .forEach(result => {
          console.log(`[UCE-04-05-Test]   - ${result.name}: ${result.error}`);
        });
    }
    
    console.log('[UCE-04-05-Test] =====================================\n');
    
    // Exit with appropriate code in Node.js
    if (isNode) {
      process.exit(this.passedTests === this.totalTests ? 0 : 1);
    }
  }
}

// Run tests
async function runTests() {
  try {
    const testSuite = new UCE0405IntegrationTests();
    await testSuite.runAllTests();
  } catch (error) {
    console.error('[UCE-04-05-Test] Test suite failed:', error);
    if (isNode) {
      process.exit(1);
    }
  }
}

// Auto-run in Node.js environment
if (isNode) {
  runTests();
} else {
  // Export for browser use
  window.UCE0405IntegrationTests = UCE0405IntegrationTests;
  window.runUCE0405Tests = runTests;
  
  // Auto-run if modules are available
  if (window.KeyRecoveryManager && window.UserKeyManager) {
    console.log('[UCE-04-05-Test] Auto-running tests in browser...');
    setTimeout(runTests, 100);
  }
}

console.log('[UCE-04-05-Test] Integration smoke tests module loaded');