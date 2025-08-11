/**
 * UCE-05 儲存整合與資料遷移測試驗證
 * 測試用戶可控加密金鑰系統與 PWACardStorage 的整合
 * 
 * @version 3.2.2-user-controlled-encryption
 * @test-coverage 向下相容性、漸進遷移、回滾機制
 */

console.log('[UCE-05-Test] Starting storage integration tests...');

class UCE05StorageIntegrationTest {
  constructor() {
    this.testResults = [];
    this.storage = null;
    this.testData = this.generateTestData();
  }

  generateTestData() {
    return {
      legacyCard: {
        id: 'test_legacy_001',
        name: '測試用戶',
        title: '軟體工程師',
        email: 'test@example.com',
        phone: '02-1234-5678',
        mobile: '0912-345-678'
      },
      userPassphrase: {
        adjective: '聰明',
        noun: '工程師',
        verb: '開發',
        language: 'zh-TW'
      },
      migrationBatch: [
        { id: 'card_001', name: '用戶A', email: 'a@test.com' },
        { id: 'card_002', name: '用戶B', email: 'b@test.com' },
        { id: 'card_003', name: '用戶C', email: 'c@test.com' }
      ]
    };
  }

  async runAllTests() {
    console.log('[UCE-05-Test] Running comprehensive storage integration tests...');

    try {
      await this.initializeStorage();
      
      // 核心測試
      await this.testLegacyDataMigration();
      await this.testUserKeyIntegration();
      await this.testBackwardCompatibility();
      await this.testInterruptedMigration();
      await this.testRollbackMechanism();
      
      // 效能測試
      await this.testBatchMigrationPerformance();
      await this.testConcurrentAccess();
      
      // 安全測試
      await this.testEncryptionIntegrity();
      await this.testKeyRecoveryIntegration();
      
      this.generateTestReport();
      
    } catch (error) {
      console.error('[UCE-05-Test] Test suite failed:', error);
      this.addTestResult('CRITICAL', 'Test Suite Execution', false, error.message);
    }
  }

  async initializeStorage() {
    console.log('[UCE-05-Test] Initializing storage for testing...');
    
    try {
      // 確保 PWACardStorage 可用
      if (typeof PWACardStorage === 'undefined') {
        throw new Error('PWACardStorage not available');
      }

      this.storage = new PWACardStorage();
      await this.storage.initialize();
      
      this.addTestResult('SETUP', 'Storage Initialization', true, 'Storage initialized successfully');
      
    } catch (error) {
      this.addTestResult('SETUP', 'Storage Initialization', false, error.message);
      throw error;
    }
  }

  /**
   * 測試 1: 現有 'default-password' 資料遷移
   */
  async testLegacyDataMigration() {
    console.log('[UCE-05-Test] Testing legacy data migration...');
    
    try {
      // 1. 建立舊格式資料
      const legacyCardId = await this.storage.storeCardDirectly(this.testData.legacyCard, 'personal');
      
      // 2. 設定用戶密碼短語
      const passphraseResult = await this.storage.setUserPassphrase(this.testData.userPassphrase);
      
      if (!passphraseResult.success) {
        throw new Error('Failed to set user passphrase');
      }
      
      // 3. 執行遷移
      const migrationResult = await this.storage.migrateToUserEncryption(this.testData.userPassphrase);
      
      // 4. 驗證遷移結果
      const migratedCard = await this.storage.getCard(legacyCardId);
      
      const success = migrationResult.success && 
                     migratedCard && 
                     migratedCard.userEncrypted === true;
      
      this.addTestResult('MIGRATION', 'Legacy Data Migration', success, 
        success ? `Migrated ${migrationResult.migratedItems} items` : 'Migration failed');
      
    } catch (error) {
      this.addTestResult('MIGRATION', 'Legacy Data Migration', false, error.message);
    }
  }

  /**
   * 測試 2: 用戶金鑰管理器整合
   */
  async testUserKeyIntegration() {
    console.log('[UCE-05-Test] Testing user key manager integration...');
    
    try {
      // 1. 檢查用戶金鑰管理器是否可用
      if (!this.storage.userKeyManager) {
        throw new Error('UserKeyManager not initialized');
      }
      
      // 2. 測試密碼短語驗證
      const verifyResult = await this.storage.unlockWithPassphrase(this.testData.userPassphrase);
      
      if (!verifyResult.success) {
        throw new Error('Passphrase verification failed');
      }
      
      // 3. 測試加密狀態
      const encryptionStatus = this.storage.getEncryptionStatus();
      
      const success = encryptionStatus.enabled && 
                     encryptionStatus.userControlled && 
                     !encryptionStatus.requiresUnlock;
      
      this.addTestResult('INTEGRATION', 'User Key Manager Integration', success,
        success ? 'User key manager fully integrated' : 'Integration incomplete');
      
    } catch (error) {
      this.addTestResult('INTEGRATION', 'User Key Manager Integration', false, error.message);
    }
  }

  /**
   * 測試 3: 向下相容性
   */
  async testBackwardCompatibility() {
    console.log('[UCE-05-Test] Testing backward compatibility...');
    
    try {
      // 1. 建立新格式資料
      const newCardData = {
        name: '新格式用戶',
        title: '測試工程師',
        email: 'new@test.com'
      };
      
      const newCardId = await this.storage.storeCard(newCardData);
      
      // 2. 讀取並驗證
      const retrievedCard = await this.storage.getCard(newCardId);
      
      // 3. 檢查是否能正常處理新舊格式
      const allCards = await this.storage.listCards();
      const hasLegacyCards = allCards.some(card => !card.userEncrypted);
      const hasNewCards = allCards.some(card => card.userEncrypted);
      
      const success = retrievedCard && 
                     retrievedCard.data.name === newCardData.name &&
                     hasLegacyCards && hasNewCards;
      
      this.addTestResult('COMPATIBILITY', 'Backward Compatibility', success,
        success ? 'Both legacy and new formats supported' : 'Compatibility issues detected');
      
    } catch (error) {
      this.addTestResult('COMPATIBILITY', 'Backward Compatibility', false, error.message);
    }
  }

  /**
   * 測試 4: 中斷遷移恢復
   */
  async testInterruptedMigration() {
    console.log('[UCE-05-Test] Testing interrupted migration recovery...');
    
    try {
      // 1. 建立測試資料
      const testCards = [];
      for (let i = 0; i < 3; i++) {
        const cardId = await this.storage.storeCardDirectly({
          name: `中斷測試用戶${i}`,
          email: `interrupt${i}@test.com`
        }, 'personal');
        testCards.push(cardId);
      }
      
      // 2. 模擬中斷的遷移（設定部分卡片為 pending 狀態）
      const cards = await this.storage.listCards();
      const targetCard = cards.find(card => testCards.includes(card.id));
      
      if (targetCard) {
        targetCard.migrationStatus = 'pending';
        await this.storage.safeTransaction(['cards'], 'readwrite', async (transaction) => {
          const store = transaction.objectStore('cards');
          return new Promise((resolve, reject) => {
            const request = store.put(targetCard);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        });
      }
      
      // 3. 測試恢復機制
      const healthCheck = await this.storage.performEnhancedHealthCheck();
      
      // 4. 執行清理
      if (this.storage.migrationLogManager) {
        await this.storage.migrationLogManager.cleanupPartialMigrations();
      }
      
      const success = healthCheck && !healthCheck.error;
      
      this.addTestResult('RECOVERY', 'Interrupted Migration Recovery', success,
        success ? 'Recovery mechanism working' : 'Recovery failed');
      
    } catch (error) {
      this.addTestResult('RECOVERY', 'Interrupted Migration Recovery', false, error.message);
    }
  }

  /**
   * 測試 5: 回滾機制
   */
  async testRollbackMechanism() {
    console.log('[UCE-05-Test] Testing rollback mechanism...');
    
    try {
      // 1. 記錄當前狀態
      const beforeCards = await this.storage.listCards();
      const beforeCount = beforeCards.length;
      
      // 2. 建立備份
      const backupResult = await this.storage.createSecureBackup({
        includeVersions: false,
        encrypt: false
      });
      
      if (!backupResult.success) {
        throw new Error('Failed to create backup');
      }
      
      // 3. 進行一些變更
      await this.storage.storeCard({
        name: '回滾測試用戶',
        email: 'rollback@test.com'
      });
      
      // 4. 模擬回滾需求並執行
      const restoreResult = await this.storage.restoreFromSecureBackup(backupResult.data, {
        overwriteExisting: true
      });
      
      // 5. 驗證回滾結果
      const afterCards = await this.storage.listCards();
      const rollbackSuccess = restoreResult.success && afterCards.length >= beforeCount;
      
      this.addTestResult('ROLLBACK', 'Rollback Mechanism', rollbackSuccess,
        rollbackSuccess ? `Rollback completed: ${restoreResult.restoredCards} cards restored` : 'Rollback failed');
      
    } catch (error) {
      this.addTestResult('ROLLBACK', 'Rollback Mechanism', false, error.message);
    }
  }

  /**
   * 測試 6: 批量遷移效能
   */
  async testBatchMigrationPerformance() {
    console.log('[UCE-05-Test] Testing batch migration performance...');
    
    try {
      const startTime = performance.now();
      
      // 1. 建立批量測試資料
      const batchCards = [];
      for (let i = 0; i < 10; i++) {
        const cardId = await this.storage.storeCardDirectly({
          name: `批量測試${i}`,
          email: `batch${i}@test.com`,
          phone: `0912-${String(i).padStart(3, '0')}-${String(i).padStart(3, '0')}`
        }, 'personal');
        batchCards.push(cardId);
      }
      
      // 2. 執行批量遷移
      const migrationResult = await this.storage.migrateToUserEncryption(this.testData.userPassphrase);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 3. 效能評估（應在 5 秒內完成）
      const performanceOk = duration < 5000;
      const migrationOk = migrationResult.success && migrationResult.migratedItems >= 10;
      
      const success = performanceOk && migrationOk;
      
      this.addTestResult('PERFORMANCE', 'Batch Migration Performance', success,
        success ? `Migrated ${migrationResult.migratedItems} items in ${Math.round(duration)}ms` : 
                 `Performance issue: ${Math.round(duration)}ms`);
      
    } catch (error) {
      this.addTestResult('PERFORMANCE', 'Batch Migration Performance', false, error.message);
    }
  }

  /**
   * 測試 7: 並發存取
   */
  async testConcurrentAccess() {
    console.log('[UCE-05-Test] Testing concurrent access...');
    
    try {
      // 1. 並發讀取測試
      const readPromises = [];
      for (let i = 0; i < 5; i++) {
        readPromises.push(this.storage.listCards());
      }
      
      const readResults = await Promise.all(readPromises);
      const readSuccess = readResults.every(result => Array.isArray(result));
      
      // 2. 並發寫入測試
      const writePromises = [];
      for (let i = 0; i < 3; i++) {
        writePromises.push(this.storage.storeCard({
          name: `並發測試${i}`,
          email: `concurrent${i}@test.com`
        }));
      }
      
      const writeResults = await Promise.all(writePromises);
      const writeSuccess = writeResults.every(result => typeof result === 'string');
      
      const success = readSuccess && writeSuccess;
      
      this.addTestResult('CONCURRENCY', 'Concurrent Access', success,
        success ? 'Concurrent operations handled correctly' : 'Concurrency issues detected');
      
    } catch (error) {
      this.addTestResult('CONCURRENCY', 'Concurrent Access', false, error.message);
    }
  }

  /**
   * 測試 8: 加密完整性
   */
  async testEncryptionIntegrity() {
    console.log('[UCE-05-Test] Testing encryption integrity...');
    
    try {
      // 1. 建立加密資料
      const sensitiveData = {
        name: '加密測試用戶',
        email: 'encryption@test.com',
        phone: '02-8765-4321',
        mobile: '0987-654-321',
        address: '台北市信義區松仁路99號'
      };
      
      const cardId = await this.storage.storeCard(sensitiveData);
      
      // 2. 讀取並驗證解密
      const retrievedCard = await this.storage.getCard(cardId);
      
      // 3. 檢查敏感欄位是否正確解密
      const dataIntegrity = retrievedCard && 
                           retrievedCard.data.email === sensitiveData.email &&
                           retrievedCard.data.phone === sensitiveData.phone &&
                           retrievedCard.data.mobile === sensitiveData.mobile;
      
      // 4. 檢查加密狀態
      const encryptionStatus = this.storage.getEncryptionStatus();
      const encryptionActive = encryptionStatus.enabled && encryptionStatus.userControlled;
      
      const success = dataIntegrity && encryptionActive;
      
      this.addTestResult('ENCRYPTION', 'Encryption Integrity', success,
        success ? 'Encryption/decryption working correctly' : 'Encryption integrity issues');
      
    } catch (error) {
      this.addTestResult('ENCRYPTION', 'Encryption Integrity', false, error.message);
    }
  }

  /**
   * 測試 9: 金鑰恢復整合
   */
  async testKeyRecoveryIntegration() {
    console.log('[UCE-05-Test] Testing key recovery integration...');
    
    try {
      // 1. 檢查金鑰恢復管理器
      if (!this.storage.keyRecoveryManager) {
        throw new Error('KeyRecoveryManager not available');
      }
      
      // 2. 測試金鑰失效檢測
      const keyFailureResult = await this.storage.userKeyManager.detectKeyFailure();
      
      // 3. 如果檢測到問題，測試恢復流程
      if (!keyFailureResult.isValid) {
        const recoveryResult = await this.storage.triggerKeyRecovery('test-recovery');
        
        if (!recoveryResult.recoveryId) {
          throw new Error('Key recovery failed to start');
        }
      }
      
      // 4. 執行健康檢查
      const healthCheck = await this.storage.performEnhancedHealthCheck();
      
      const success = healthCheck.keyRecovery && 
                     healthCheck.keyRecovery.keyIntegrity &&
                     healthCheck.keyRecovery.dataIntegrity;
      
      this.addTestResult('KEY_RECOVERY', 'Key Recovery Integration', success,
        success ? 'Key recovery system integrated' : 'Key recovery issues detected');
      
    } catch (error) {
      this.addTestResult('KEY_RECOVERY', 'Key Recovery Integration', false, error.message);
    }
  }

  /**
   * 新增測試結果
   */
  addTestResult(category, testName, passed, details) {
    this.testResults.push({
      category,
      testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[UCE-05-Test] ${status} ${category}: ${testName} - ${details}`);
  }

  /**
   * 生成測試報告
   */
  generateTestReport() {
    console.log('\n[UCE-05-Test] ========== TEST REPORT ==========');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Pass Rate: ${passRate}%`);
    
    // 按類別分組顯示
    const categories = [...new Set(this.testResults.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n--- ${category} ---`);
      const categoryTests = this.testResults.filter(r => r.category === category);
      categoryTests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${status} ${test.testName}: ${test.details}`);
      });
    });
    
    // 失敗測試詳細資訊
    const failedTestDetails = this.testResults.filter(r => !r.passed);
    if (failedTestDetails.length > 0) {
      console.log('\n--- FAILED TESTS DETAILS ---');
      failedTestDetails.forEach(test => {
        console.log(`❌ ${test.category}/${test.testName}:`);
        console.log(`   Error: ${test.details}`);
        console.log(`   Time: ${test.timestamp}`);
      });
    }
    
    // 整體評估
    console.log('\n--- OVERALL ASSESSMENT ---');
    if (passRate >= 90) {
      console.log('🎉 EXCELLENT: UCE-05 implementation is ready for production');
    } else if (passRate >= 75) {
      console.log('⚠️  GOOD: UCE-05 implementation is mostly ready, minor issues need attention');
    } else if (passRate >= 50) {
      console.log('🔧 NEEDS WORK: UCE-05 implementation has significant issues that need fixing');
    } else {
      console.log('🚨 CRITICAL: UCE-05 implementation has major problems and is not ready');
    }
    
    console.log('[UCE-05-Test] ========== END REPORT ==========\n');
    
    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      ready: passRate >= 90
    };
  }
}

// 自動執行測試（如果在瀏覽器環境中）
if (typeof window !== 'undefined') {
  // 等待相關模組載入
  window.addEventListener('load', async () => {
    // 等待一段時間確保所有模組都已載入
    setTimeout(async () => {
      try {
        const testSuite = new UCE05StorageIntegrationTest();
        const results = await testSuite.runAllTests();
        
        // 將結果存到全域變數供檢查
        window.UCE05TestResults = results;
        
        // 觸發測試完成事件
        window.dispatchEvent(new CustomEvent('UCE05TestCompleted', {
          detail: results
        }));
        
      } catch (error) {
        console.error('[UCE-05-Test] Test execution failed:', error);
        window.UCE05TestError = error;
      }
    }, 2000);
  });
}

// 匯出供 Node.js 環境使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UCE05StorageIntegrationTest;
}

console.log('[UCE-05-Test] Storage integration test module loaded');