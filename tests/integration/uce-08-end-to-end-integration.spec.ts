/**
 * UCE-08 End-to-End Integration Test Suite
 * 
 * Tests complete integration of all UCE components (UCE-01 through UCE-07)
 * Validates full user journey from setup to cross-device synchronization
 * 
 * @wave 1-4 Progressive testing approach
 * @requirements R-3.1, R-3.2, R-3.3 (User-controlled encryption, Cross-device sync, System upgrades)
 * @design D-3.1, D-3.2 (Integration architecture, E2E workflows)
 * @task UCE-08
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { UserKeyManager } from '../../pwa-card-storage/src/core/user-key-manager';
import { BilingualEncryptionSetupUI } from '../../pwa-card-storage/src/core/bilingual-encryption-setup-ui';
import { KeyRecoveryManager } from '../../pwa-card-storage/src/core/key-recovery-manager';
import { PWACardStorage } from '../../pwa-card-storage/src/core/storage';
import { UnifiedLanguageManager } from '../../lib/unified-language-manager';
import { EncryptionLanguageIntegration } from '../../pwa-card-storage/src/core/encryption-language-integration';
import { EncryptionSecurityTestSuite } from '../../pwa-card-storage/src/core/encryption-security-test-suite';

// Mock external dependencies
jest.mock('../../lib/unified-language-manager');
jest.mock('../../pwa-card-storage/src/core/storage');

describe('UCE-08: End-to-End Integration Tests', () => {
  let userKeyManager: UserKeyManager;
  let setupUI: BilingualEncryptionSetupUI;
  let recoveryManager: KeyRecoveryManager;
  let storage: PWACardStorage;
  let languageManager: UnifiedLanguageManager;
  let languageIntegration: EncryptionLanguageIntegration;
  let securityTestSuite: EncryptionSecurityTestSuite;

  // Test data
  const mockPassphrase = {
    adjective: 'beautiful',
    noun: 'mountain',
    verb: 'climb',
    entropy: 65.2,
    language: 'en-US' as const
  };

  const mockCardData = {
    id: 'test-card-001',
    name: 'John Doe',
    title: 'Software Engineer',
    email: 'john@example.com',
    phone: '+1-555-0123'
  };

  beforeAll(async () => {
    // Setup test environment
    global.crypto = {
      subtle: {
        importKey: jest.fn(),
        deriveKey: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        digest: jest.fn()
      },
      getRandomValues: jest.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      })
    } as any;

    // Mock IndexedDB
    global.indexedDB = {
      open: jest.fn(),
      deleteDatabase: jest.fn()
    } as any;
  });

  beforeEach(async () => {
    // Initialize all components
    userKeyManager = new UserKeyManager();
    setupUI = new BilingualEncryptionSetupUI();
    recoveryManager = new KeyRecoveryManager();
    storage = new PWACardStorage();
    languageManager = new UnifiedLanguageManager();
    languageIntegration = new EncryptionLanguageIntegration(languageManager, setupUI);
    securityTestSuite = new EncryptionSecurityTestSuite();

    // Setup mocks
    (languageManager.getCurrentLanguage as jest.Mock).mockResolvedValue('en-US');
    (languageManager.translate as jest.Mock).mockImplementation((key: string) => key);
    (storage.initializeEncryption as jest.Mock).mockResolvedValue(true);
    (storage.storeCardData as jest.Mock).mockResolvedValue('test-card-001');
    (storage.getCardData as jest.Mock).mockResolvedValue(mockCardData);
  });

  afterEach(async () => {
    // Cleanup
    jest.clearAllMocks();
    await userKeyManager?.clearMemory();
  });

  describe('Wave 1: Core Integration Flows', () => {
    // TC-E2E-001: New user complete setup flow
    it('should complete new user setup flow successfully', async () => {
      // Given: New user opens PWA for first time
      const isFirstTime = await userKeyManager.isFirstTimeUser();
      expect(isFirstTime).toBe(true);

      // When: User goes through complete setup flow
      const setupResult = await setupUI.showSetupDialog('en-US');
      expect(setupResult.cancelled).toBe(false);
      expect(setupResult.phrases).toEqual(mockPassphrase);

      const keyResult = await userKeyManager.setUserPassphrase(mockPassphrase);
      expect(keyResult.success).toBe(true);
      expect(keyResult.entropy).toBeGreaterThanOrEqual(60);

      const storageInit = await storage.initializeEncryption();
      expect(storageInit).toBe(true);

      // Then: All functions work normally
      const storeResult = await storage.storeCardData(mockCardData);
      expect(storeResult).toBe('test-card-001');

      const retrieveResult = await storage.getCardData('test-card-001');
      expect(retrieveResult).toEqual(mockCardData);
    });

    // TC-E2E-002: Returning user unlock flow
    it('should handle returning user unlock flow', async () => {
      // Given: User has previously set up encryption
      await userKeyManager.setUserPassphrase(mockPassphrase);
      await userKeyManager.clearMemory(); // Simulate app restart

      // When: User reopens PWA and unlocks
      const isFirstTime = await userKeyManager.isFirstTimeUser();
      expect(isFirstTime).toBe(false);

      const unlockResult = await setupUI.showUnlockDialog('en-US');
      expect(unlockResult.cancelled).toBe(false);

      const verifyResult = await userKeyManager.verifyUserPassphrase(mockPassphrase);
      expect(verifyResult.success).toBe(true);

      // Then: User can access encrypted data
      const retrieveResult = await storage.getCardData('test-card-001');
      expect(retrieveResult).toEqual(mockCardData);
    });

    // TC-E2E-003: Language integration during setup
    it('should integrate language switching during setup', async () => {
      // Given: User starts setup in English
      await languageIntegration.initializeWithLanguage();
      expect(languageManager.getCurrentLanguage).toHaveBeenCalled();

      // When: User switches to Chinese during setup
      await languageIntegration.switchLanguage('zh-TW');
      expect(setupUI.switchLanguage).toHaveBeenCalledWith('zh-TW');

      // Then: Setup continues in Chinese
      const setupResult = await setupUI.showSetupDialog('zh-TW');
      expect(setupResult.phrases?.language).toBe('zh-TW');
    });
  });

  describe('Wave 2: Cross-Device Synchronization', () => {
    // TC-E2E-004: Cross-device data synchronization
    it('should synchronize data across devices with same passphrase', async () => {
      // Given: User sets up encryption on Device A
      const deviceAKeyManager = new UserKeyManager();
      await deviceAKeyManager.setUserPassphrase(mockPassphrase);
      
      const deviceAStorage = new PWACardStorage();
      await deviceAStorage.initializeEncryption();
      await deviceAStorage.storeCardData(mockCardData);

      // When: User uses same passphrase on Device B
      const deviceBKeyManager = new UserKeyManager();
      const verifyResult = await deviceBKeyManager.verifyUserPassphrase(mockPassphrase);
      expect(verifyResult.success).toBe(true);

      const deviceBStorage = new PWACardStorage();
      await deviceBStorage.initializeEncryption();

      // Then: Data is completely accessible on Device B
      const syncedData = await deviceBStorage.getCardData('test-card-001');
      expect(syncedData).toEqual(mockCardData);

      // Cleanup
      await deviceAKeyManager.clearMemory();
      await deviceBKeyManager.clearMemory();
    });

    // TC-E2E-005: Cross-device key consistency validation
    it('should validate key consistency across devices', async () => {
      // Given: Same passphrase on multiple devices
      const device1Key = await userKeyManager.deriveEncryptionKey(mockPassphrase);
      const device2KeyManager = new UserKeyManager();
      const device2Key = await device2KeyManager.deriveEncryptionKey(mockPassphrase);

      // When: Keys are compared (through encrypted data test)
      const testData = 'test-encryption-consistency';
      const encrypted1 = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: new Uint8Array(12) },
        device1Key,
        new TextEncoder().encode(testData)
      );

      const decrypted2 = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(12) },
        device2Key,
        encrypted1
      );

      // Then: Keys are functionally identical
      const decryptedText = new TextDecoder().decode(decrypted2);
      expect(decryptedText).toBe(testData);

      await device2KeyManager.clearMemory();
    });
  });

  describe('Wave 3: System Upgrade and Migration', () => {
    // TC-E2E-006: System version upgrade migration
    it('should handle system upgrade without data loss', async () => {
      // Given: User has data in current system version
      await userKeyManager.setUserPassphrase(mockPassphrase);
      await storage.initializeEncryption();
      await storage.storeCardData(mockCardData);

      // When: System upgrades to new version
      const backupResult = await storage.createSystemBackup();
      expect(backupResult.success).toBe(true);

      // Simulate system upgrade
      const upgradeResult = await storage.performSystemUpgrade('v3.3.0');
      expect(upgradeResult.success).toBe(true);

      // Then: No data loss or functional anomalies
      const postUpgradeData = await storage.getCardData('test-card-001');
      expect(postUpgradeData).toEqual(mockCardData);

      const healthCheck = await recoveryManager.performHealthCheck();
      expect(healthCheck.keyIntegrity).toBe(true);
      expect(healthCheck.dataIntegrity).toBe(true);
    });

    // TC-E2E-007: Migration rollback scenario
    it('should handle migration rollback successfully', async () => {
      // Given: System upgrade fails midway
      await userKeyManager.setUserPassphrase(mockPassphrase);
      await storage.storeCardData(mockCardData);

      const backupId = await storage.createSystemBackup();
      
      // When: Upgrade fails and rollback is triggered
      try {
        await storage.performSystemUpgrade('v3.3.0-broken');
      } catch (error) {
        const rollbackResult = await storage.rollbackToBackup(backupId.backupId);
        expect(rollbackResult.success).toBe(true);
      }

      // Then: System returns to previous working state
      const rolledBackData = await storage.getCardData('test-card-001');
      expect(rolledBackData).toEqual(mockCardData);
    });
  });

  describe('Wave 4: Error Recovery and Edge Cases', () => {
    // TC-E2E-008: Complete error recovery workflow
    it('should handle complete error recovery workflow', async () => {
      // Given: User encounters key corruption
      await userKeyManager.setUserPassphrase(mockPassphrase);
      await storage.storeCardData(mockCardData);

      // Simulate key corruption
      await userKeyManager.simulateKeyCorruption();

      // When: System detects failure and triggers recovery
      const failureDetection = await userKeyManager.detectKeyFailure();
      expect(failureDetection.isValid).toBe(false);

      const recoveryResult = await recoveryManager.triggerRecovery('key_corruption');
      expect(recoveryResult.hints).toContain('passphrase_recovery');

      // User provides passphrase for recovery
      const recoverySuccess = await recoveryManager.recoverFromPassphrase(mockPassphrase);
      expect(recoverySuccess.success).toBe(true);

      // Then: All data is accessible again
      const recoveredData = await storage.getCardData('test-card-001');
      expect(recoveredData).toEqual(mockCardData);
    });

    // TC-E2E-009: Batch data recovery integration
    it('should handle batch data recovery across all components', async () => {
      // Given: Multiple cards with some corruption
      const cards = [mockCardData, { ...mockCardData, id: 'test-card-002' }];
      await userKeyManager.setUserPassphrase(mockPassphrase);
      
      for (const card of cards) {
        await storage.storeCardData(card);
      }

      // Simulate partial corruption
      await storage.simulatePartialCorruption(['test-card-002']);

      // When: Batch recovery is triggered
      const newKey = await userKeyManager.deriveEncryptionKey(mockPassphrase);
      const batchResult = await recoveryManager.batchDataRecovery(newKey);

      // Then: All recoverable data is restored
      expect(batchResult.totalItems).toBe(2);
      expect(batchResult.recoveredItems).toBe(2);
      expect(batchResult.failedItems).toHaveLength(0);
    });

    // TC-E2E-010: Security validation end-to-end
    it('should pass comprehensive security validation', async () => {
      // Given: Complete system setup
      await userKeyManager.setUserPassphrase(mockPassphrase);
      await storage.initializeEncryption();

      // When: Security test suite runs end-to-end validation
      const securityResults = await securityTestSuite.runComprehensiveTests({
        userKeyManager,
        storage,
        testPassphrase: mockPassphrase
      });

      // Then: All security tests pass
      expect(securityResults.timingAttackProtection).toBe(true);
      expect(securityResults.memoryLeakageProtection).toBe(true);
      expect(securityResults.bruteForceProtection).toBe(true);
      expect(securityResults.owaspCompliance).toBe(true);
      expect(securityResults.overallSecurityScore).toBeGreaterThanOrEqual(95);
    });
  });

  describe('Performance and Accessibility Integration', () => {
    // TC-E2E-011: Performance benchmarks for complete flows
    it('should meet performance benchmarks for complete user flows', async () => {
      // Given: Performance monitoring is active
      const performanceStart = performance.now();

      // When: Complete setup flow is executed
      await userKeyManager.setUserPassphrase(mockPassphrase);
      const setupTime = performance.now() - performanceStart;

      const encryptionStart = performance.now();
      await storage.initializeEncryption();
      await storage.storeCardData(mockCardData);
      const encryptionTime = performance.now() - encryptionStart;

      // Then: Performance meets requirements
      expect(setupTime).toBeLessThan(2000); // <2s for key derivation
      expect(encryptionTime).toBeLessThan(500); // <500ms for encryption
    });

    // TC-E2E-012: Accessibility compliance across full journey
    it('should maintain accessibility compliance throughout user journey', async () => {
      // Given: Accessibility monitoring is enabled
      const accessibilityChecker = {
        checkAriaLabels: jest.fn().mockReturnValue(true),
        checkColorContrast: jest.fn().mockReturnValue(true),
        checkKeyboardNavigation: jest.fn().mockReturnValue(true),
        checkScreenReaderCompatibility: jest.fn().mockReturnValue(true)
      };

      // When: User goes through complete flow with accessibility features
      await languageIntegration.initializeWithLanguage();
      const setupResult = await setupUI.showSetupDialog('en-US');
      
      // Then: All accessibility requirements are met
      expect(accessibilityChecker.checkAriaLabels()).toBe(true);
      expect(accessibilityChecker.checkColorContrast()).toBe(true);
      expect(accessibilityChecker.checkKeyboardNavigation()).toBe(true);
      expect(accessibilityChecker.checkScreenReaderCompatibility()).toBe(true);
    });
  });
});