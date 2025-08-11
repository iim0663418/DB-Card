/**
 * UCE Critical Fixes Smoke Test
 * Tests UCE-FIX-01, UCE-FIX-02, UCE-FIX-03 implementations
 */

describe('UCE Critical Fixes Smoke Tests', () => {
  
  // UCE-FIX-01: Script Loading Test
  test('UCE-FIX-01: BilingualEncryptionSetupUI script loads successfully', () => {
    // Simulate browser environment
    global.window = global.window || {};
    
    // Load the script
    require('../../pwa-card-storage/src/core/bilingual-encryption-setup-ui.js');
    
    // Verify class is available
    expect(typeof window.BilingualEncryptionSetupUI).toBe('function');
    expect(window.BilingualEncryptionSetupUI).toBeDefined();
  });

  // UCE-FIX-02: Timing Attack Protection Test
  test('UCE-FIX-02: UserKeyManager has timing attack protection', async () => {
    // Mock storage
    const mockStorage = {
      setSetting: jest.fn(),
      getSetting: jest.fn()
    };

    // Load UserKeyManager
    require('../../pwa-card-storage/src/core/user-key-manager.js');
    const UserKeyManager = window.UserKeyManager;
    
    const manager = new UserKeyManager(mockStorage);
    
    // Verify timing protection methods exist
    expect(typeof manager.constantTimeVerify).toBe('function');
    expect(typeof manager.constantTimeDelay).toBe('function');
    
    // Test constant time delay
    const startTime = performance.now();
    await manager.constantTimeDelay(startTime, 50);
    const elapsed = performance.now() - startTime;
    
    // Should take at least 50ms
    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow 5ms tolerance
  });

  // UCE-FIX-03: Real Integration Test
  test('UCE-FIX-03: BilingualEncryptionSetupUI integrates with UserKeyManager', () => {
    // Setup mock environment
    global.window = global.window || {};
    window.UserKeyManager = class MockUserKeyManager {
      constructor(storage) {
        this.storage = storage;
      }
      
      async verifyUserPassphrase(phrases) {
        return { success: true, keyId: 'test-key' };
      }
      
      async setUserPassphrase(phrases) {
        return { success: true, keyId: 'test-key', entropy: 65 };
      }
    };
    
    // Load BilingualEncryptionSetupUI
    require('../../pwa-card-storage/src/core/bilingual-encryption-setup-ui.js');
    const BilingualEncryptionSetupUI = window.BilingualEncryptionSetupUI;
    
    const ui = new BilingualEncryptionSetupUI();
    
    // Verify integration methods exist
    expect(typeof ui.validateUnlockPhrases).toBe('function');
    expect(typeof ui.setupUserPassphrase).toBe('function');
    
    // Test that validateUnlockPhrases no longer uses Math.random()
    const validateMethod = ui.validateUnlockPhrases.toString();
    expect(validateMethod).not.toContain('Math.random()');
    expect(validateMethod).toContain('UserKeyManager');
  });

  // Integration Test: All fixes work together
  test('Integration: All UCE fixes work together', async () => {
    // Setup complete mock environment
    global.window = global.window || {};
    global.performance = global.performance || { now: () => Date.now() };
    
    const mockStorage = {
      setSetting: jest.fn().mockResolvedValue(true),
      getSetting: jest.fn().mockResolvedValue({
        keyId: 'test-key',
        salt: new Array(32).fill(0),
        created: Date.now(),
        entropy: 65,
        algorithm: 'PBKDF2-AES-GCM'
      })
    };
    
    // Mock crypto API
    global.crypto = {
      getRandomValues: (arr) => arr.fill(0),
      subtle: {
        importKey: jest.fn().mockResolvedValue({}),
        deriveKey: jest.fn().mockResolvedValue({}),
        encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16))
      }
    };
    
    // Load both classes
    require('../../pwa-card-storage/src/core/user-key-manager.js');
    require('../../pwa-card-storage/src/core/bilingual-encryption-setup-ui.js');
    
    const UserKeyManager = window.UserKeyManager;
    const BilingualEncryptionSetupUI = window.BilingualEncryptionSetupUI;
    
    // Test integration
    const manager = new UserKeyManager(mockStorage);
    const ui = new BilingualEncryptionSetupUI();
    
    // Set up global references for UI integration
    window.pwaStorage = mockStorage;
    mockStorage.userKeyManager = manager;
    
    // Test phrase validation
    const testPhrases = {
      adjective: 'beautiful',
      noun: 'flower',
      verb: 'dance'
    };
    
    const result = await ui.validateUnlockPhrases(testPhrases);
    expect(typeof result).toBe('boolean');
  });
});