/**
 * UCE-07 Unit Tests: 安全測試與驗證
 * 對應需求: R-UCE-07, D-UCE-07, T-UCE-07
 * wave: 2
 */

import { EncryptionSecurityTestSuite } from '../../pwa-card-storage/src/core/encryption-security-test-suite';

describe('EncryptionSecurityTestSuite', () => {
  let testSuite: EncryptionSecurityTestSuite;
  let mockUserKeyManager: any;
  let mockKeyRecoveryManager: any;

  beforeEach(() => {
    // Mock browser environment
    global.window = {
      crypto: {
        subtle: {
          importKey: jest.fn().mockResolvedValue({}),
          deriveKey: jest.fn().mockResolvedValue({}),
          encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
          decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
          digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
        },
        getRandomValues: jest.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        })
      },
      performance: { now: jest.fn(() => Date.now()) }
    } as any;

    global.performance = { now: jest.fn(() => Date.now()) } as any;

    // Mock UserKeyManager
    mockUserKeyManager = {
      generateDeterministicKey: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return {
          key: { type: 'mock-key' },
          keyId: 'test_key_' + Math.random().toString(36).substring(2, 8),
          salt: new Uint8Array(32)
        };
      }),
      setUserPassphrase: jest.fn().mockResolvedValue({
        success: true,
        keyId: 'test_key_123',
        entropy: 65
      }),
      verifyUserPassphrase: jest.fn().mockImplementation(async (phrases) => {
        if (phrases.adjective === '錯誤') {
          mockUserKeyManager.failCount = (mockUserKeyManager.failCount || 0) + 1;
          return {
            success: false,
            error: mockUserKeyManager.failCount >= 3 ? 'Account locked' : 'Invalid passphrase',
            remainingAttempts: Math.max(0, 3 - mockUserKeyManager.failCount)
          };
        }
        return { success: true, keyId: 'test_key_123' };
      }),
      validatePassphraseStructure: jest.fn().mockImplementation((phrases) => {
        if (!phrases.adjective || phrases.adjective.length < 2) {
          return { valid: false, entropy: 0 };
        }
        return { 
          valid: true, 
          entropy: phrases.adjective === 'a' ? 10 : 65
        };
      }),
      clearMemory: jest.fn().mockImplementation(async function() {
        this.hasActiveKey = false;
        this.cacheSize = 0;
      }),
      getStatus: jest.fn().mockImplementation(function() {
        return {
          hasActiveKey: this.hasActiveKey !== false,
          cacheSize: this.cacheSize || 0
        };
      }),
      failCount: 0
    };

    // Mock KeyRecoveryManager
    mockKeyRecoveryManager = {
      triggerRecovery: jest.fn().mockResolvedValue({
        recoveryId: 'recovery_' + Date.now(),
        hints: ['請確認您的三短語組合是否正確', '檢查是否有大小寫或拼寫錯誤']
      }),
      performHealthCheck: jest.fn().mockResolvedValue({
        keyIntegrity: true,
        dataIntegrity: true,
        recommendations: []
      })
    };

    testSuite = new EncryptionSecurityTestSuite();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TC-UCE07-001: 威脅模型初始化測試
  // Given: 安全測試套件初始化
  // When: 威脅模型載入
  // Then: 包含 T001-T005 所有威脅類型
  describe('TC-UCE07-001: Threat Model Initialization', () => {
    it('should initialize with 5 threat models', () => {
      const threatModels = testSuite.getThreatModelStatus();
      expect(threatModels).toHaveLength(5);
      expect(threatModels.map(t => t.id)).toEqual(['T001', 'T002', 'T003', 'T004', 'T005']);
    });

    it('should have correct threat categories', () => {
      const threatModels = testSuite.getThreatModelStatus();
      const t001 = threatModels.find(t => t.id === 'T001');
      expect(t001).toMatchObject({
        category: 'T001',
        severity: 'High',
        mitigated: false
      });
      expect(t001.description).toContain('PBKDF2');
    });

    it('should initialize all threats as unmitigated', () => {
      const threatModels = testSuite.getThreatModelStatus();
      threatModels.forEach(threat => {
        expect(threat.mitigated).toBe(false);
      });
    });
  });

  // TC-UCE07-002: PBKDF2 時間攻擊測試
  // Given: PBKDF2 實作
  // When: 時間分析攻擊測試
  // Then: 無時間洩露檢測
  describe('TC-UCE07-002: PBKDF2 Timing Attack Tests', () => {
    it('should run full security suite with timing attack tests', async () => {
      const result = await testSuite.runFullSecuritySuite(mockUserKeyManager, mockKeyRecoveryManager);
      
      expect(result).toMatchObject({
        overallResult: expect.stringMatching(/^(PASS|FAIL)$/),
        totalTests: expect.any(Number),
        passedTests: expect.any(Number),
        failedTests: expect.any(Number),
        criticalIssues: expect.any(Number)
      });

      expect(result.totalTests).toBeGreaterThan(0);
      expect(result.passedTests + result.failedTests).toBe(result.totalTests);
    });

    it('should test PBKDF2 timing consistency', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const timingTest = results.find(r => r.testId === 'T001-TIMING');
      expect(timingTest).toBeDefined();
      expect(timingTest.testName).toContain('Timing Attack Resistance');
    });

    it('should validate PBKDF2 performance', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const performanceTest = results.find(r => r.testId === 'T001-PERFORMANCE');
      expect(performanceTest).toBeDefined();
      expect(performanceTest.testName).toContain('PBKDF2 Performance');
    });
  });

  // TC-UCE07-003: 記憶體洩露防護測試
  // Given: 金鑰儲存
  // When: 記憶體傾印分析
  // Then: 無金鑰洩露發現
  describe('TC-UCE07-003: Memory Leakage Protection Tests', () => {
    it('should test memory clearing', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const memoryTest = results.find(r => r.testId === 'T002-MEMORY');
      expect(memoryTest).toBeDefined();
      expect(memoryTest.testName).toContain('Memory Leakage Protection');
    });

    it('should verify garbage collection trigger', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const gcTest = results.find(r => r.testId === 'T002-GC');
      expect(gcTest).toBeDefined();
      expect(gcTest.passed).toBe(true);
    });
  });

  // TC-UCE07-004: 暴力破解防護測試
  // Given: 密碼短語暴力破解
  // When: 60位元熵值測試
  // Then: 攻擊成本超過實用閾值
  describe('TC-UCE07-004: Brute Force Protection Tests', () => {
    it('should test lockout mechanism', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const lockoutTest = results.find(r => r.testId === 'T003-LOCKOUT');
      expect(lockoutTest).toBeDefined();
      expect(lockoutTest.testName).toContain('Brute Force Lockout Protection');
    });

    it('should test entropy requirements', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const entropyTest = results.find(r => r.testId === 'T003-ENTROPY');
      expect(entropyTest).toBeDefined();
      expect(entropyTest.testName).toContain('Weak Passphrase Protection');
    });
  });

  // TC-UCE07-005: XSS 防護測試
  // Given: 惡意輸入
  // When: XSS 注入測試
  // Then: 所有攻擊載荷被阻擋
  describe('TC-UCE07-005: XSS Protection Tests', () => {
    it('should test XSS injection protection', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const xssTest = results.find(r => r.testId === 'T004-XSS');
      expect(xssTest).toBeDefined();
      expect(xssTest.testName).toContain('XSS Injection Protection');
    });
  });

  // TC-UCE07-006: OWASP Top 10 合規測試
  // Given: OWASP 安全標準
  // When: 合規檢查執行
  // Then: 通過所有 OWASP Top 10 檢查
  describe('TC-UCE07-006: OWASP Top 10 Compliance Tests', () => {
    it('should test all OWASP Top 10 categories', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const owaspTests = results.filter(r => r.testId.startsWith('OWASP-A'));
      expect(owaspTests.length).toBeGreaterThanOrEqual(10);
    });

    it('should validate cryptographic implementation', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const cryptoTest = results.find(r => r.testId === 'OWASP-A02');
      expect(cryptoTest).toBeDefined();
      expect(cryptoTest.testName).toContain('Cryptographic Failures');
    });
  });

  // TC-UCE07-007: 會話安全測試
  // Given: 使用者會話
  // When: 會話安全檢查
  // Then: 會話管理安全
  describe('TC-UCE07-007: Session Security Tests', () => {
    it('should test session management', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const sessionTest = results.find(r => r.testId === 'T005-SESSION');
      expect(sessionTest).toBeDefined();
      expect(sessionTest.testName).toContain('Session Management');
    });

    it('should test session cleanup', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      const results = testSuite.getTestResults();
      
      const cleanupTest = results.find(r => r.testId === 'T005-CLEANUP');
      expect(cleanupTest).toBeDefined();
      expect(cleanupTest.testName).toContain('Session Cleanup');
    });
  });

  // TC-UCE07-008: 金鑰恢復安全測試
  // Given: 金鑰恢復流程
  // When: 安全檢查執行
  // Then: 恢復流程安全
  describe('TC-UCE07-008: Key Recovery Security Tests', () => {
    it('should test recovery process security', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, mockKeyRecoveryManager);
      const results = testSuite.getTestResults();
      
      const recoveryTest = results.find(r => r.testId === 'RECOVERY-SEC');
      expect(recoveryTest).toBeDefined();
      expect(recoveryTest.testName).toContain('Key Recovery Security');
    });

    it('should test recovery health check', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, mockKeyRecoveryManager);
      const results = testSuite.getTestResults();
      
      const healthTest = results.find(r => r.testId === 'RECOVERY-HEALTH');
      expect(healthTest).toBeDefined();
      expect(healthTest.testName).toContain('Recovery Health Check');
    });
  });

  // TC-UCE07-009: 安全報告生成測試
  // Given: 安全測試完成
  // When: 報告生成
  // Then: 包含完整安全資訊
  describe('TC-UCE07-009: Security Report Generation', () => {
    it('should generate comprehensive security report', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, mockKeyRecoveryManager);
      const report = testSuite.generateSecurityReport();
      
      expect(report).toContain('Security Test Report');
      expect(report).toContain('Total Tests:');
      expect(report).toContain('Passed:');
      expect(report).toContain('Failed:');
      expect(report).toContain('Critical Issues:');
      expect(report).toContain('Overall Status:');
    });

    it('should update threat model status after testing', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, mockKeyRecoveryManager);
      const threatModels = testSuite.getThreatModelStatus();
      
      // At least some threats should be mitigated after successful tests
      const mitigatedThreats = threatModels.filter(t => t.mitigated);
      expect(mitigatedThreats.length).toBeGreaterThan(0);
    });
  });

  // TC-UCE07-010: 錯誤處理測試
  // Given: 異常情況
  // When: 安全測試執行
  // Then: 優雅處理錯誤
  describe('TC-UCE07-010: Error Handling Tests', () => {
    it('should handle null user key manager', async () => {
      const result = await testSuite.runFullSecuritySuite(null, null);
      expect(result.overallResult).toBe('FAIL');
      expect(result.criticalIssues).toBeGreaterThan(0);
    });

    it('should handle invalid user key manager', async () => {
      const invalidManager = {};
      const result = await testSuite.runFullSecuritySuite(invalidManager, null);
      expect(result.overallResult).toBe('FAIL');
    });

    it('should continue testing after individual test failures', async () => {
      const faultyManager = {
        ...mockUserKeyManager,
        generateDeterministicKey: jest.fn().mockRejectedValue(new Error('Test error'))
      };
      
      const result = await testSuite.runFullSecuritySuite(faultyManager, null);
      expect(result.totalTests).toBeGreaterThan(0);
      expect(result.testResults.length).toBeGreaterThan(0);
    });
  });

  // TC-UCE07-011: 效能測試
  // Given: 安全測試套件
  // When: 執行完整測試
  // Then: 在合理時間內完成 (<10s)
  describe('TC-UCE07-011: Performance Tests', () => {
    it('should complete security testing within reasonable time', async () => {
      const startTime = Date.now();
      await testSuite.runFullSecuritySuite(mockUserKeyManager, mockKeyRecoveryManager);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10000); // < 10 seconds
    });

    it('should generate reports quickly', async () => {
      await testSuite.runFullSecuritySuite(mockUserKeyManager, null);
      
      const startTime = Date.now();
      testSuite.generateSecurityReport();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // < 100ms
    });
  });
});