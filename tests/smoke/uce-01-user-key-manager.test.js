/**
 * UCE-01 Smoke Test: UserKeyManager 核心實作
 * 驗證使用者金鑰管理器的核心功能
 * 
 * @version 3.2.2-user-controlled-encryption
 */

console.log('[UCE-01 Test] Starting UserKeyManager smoke tests...');

// 測試配置
const TEST_CONFIG = {
  timeout: 5000,
  maxKeyDerivationTime: 2000, // 2 seconds max for key derivation
  testPhrases: {
    valid: {
      adjective: '美麗',
      noun: '花朵',
      verb: '綻放',
      language: 'zh-TW'
    },
    validEnglish: {
      adjective: 'beautiful',
      noun: 'flower',
      verb: 'bloom',
      language: 'en-US'
    },
    invalid: {
      adjective: '',
      noun: 'flower',
      verb: 'bloom',
      language: 'en-US'
    }
  }
};

// 測試結果收集器
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * 測試工具函數
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function logTest(testName, result, error = null) {
  const status = result ? 'PASS' : 'FAIL';
  console.log(`[UCE-01 Test] ${testName}: ${status}`);
  
  if (result) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message });
      console.error(`[UCE-01 Test] Error in ${testName}:`, error.message);
    }
  }
}

async function runTest(testName, testFunction) {
  try {
    const startTime = performance.now();
    await testFunction();
    const duration = performance.now() - startTime;
    
    logTest(testName, true);
    console.log(`[UCE-01 Test] ${testName} completed in ${Math.round(duration)}ms`);
    return true;
  } catch (error) {
    logTest(testName, false, error);
    return false;
  }
}

/**
 * 測試 1: UserKeyManager 類別載入
 */
async function testUserKeyManagerLoading() {
  assert(typeof UserKeyManager === 'function', 'UserKeyManager class should be available');
  
  const manager = new UserKeyManager();
  assert(manager instanceof UserKeyManager, 'Should create UserKeyManager instance');
  assert(typeof manager.setUserPassphrase === 'function', 'Should have setUserPassphrase method');
  assert(typeof manager.verifyUserPassphrase === 'function', 'Should have verifyUserPassphrase method');
  assert(typeof manager.deriveEncryptionKey === 'function', 'Should have deriveEncryptionKey method');
  assert(typeof manager.detectKeyFailure === 'function', 'Should have detectKeyFailure method');
  assert(typeof manager.clearMemory === 'function', 'Should have clearMemory method');
}

/**
 * 測試 2: 密碼短語驗證
 */
async function testPassphraseValidation() {
  const manager = new UserKeyManager();
  
  // 測試有效的中文密碼短語
  const validResult = manager.validatePassphraseStructure(TEST_CONFIG.testPhrases.valid);
  assert(validResult.valid === true, 'Valid Chinese passphrase should pass validation');
  assert(validResult.entropy >= 60, 'Entropy should be at least 60 bits');
  
  // 測試有效的英文密碼短語
  const validEnglishResult = manager.validatePassphraseStructure(TEST_CONFIG.testPhrases.validEnglish);
  assert(validEnglishResult.valid === true, 'Valid English passphrase should pass validation');
  
  // 測試無效的密碼短語
  const invalidResult = manager.validatePassphraseStructure(TEST_CONFIG.testPhrases.invalid);
  assert(invalidResult.valid === false, 'Invalid passphrase should fail validation');
  assert(typeof invalidResult.error === 'string', 'Should provide error message');
  
  // 測試空輸入
  const nullResult = manager.validatePassphraseStructure(null);
  assert(nullResult.valid === false, 'Null input should fail validation');
}

/**
 * 測試 3: 確定性金鑰生成
 */
async function testDeterministicKeyGeneration() {
  const manager = new UserKeyManager();
  
  const startTime = performance.now();
  
  // 生成第一次金鑰
  const keyResult1 = await manager.generateDeterministicKey(TEST_CONFIG.testPhrases.valid);
  
  const derivationTime = performance.now() - startTime;
  assert(derivationTime < TEST_CONFIG.maxKeyDerivationTime, 
    `Key derivation should complete in <${TEST_CONFIG.maxKeyDerivationTime}ms, took ${Math.round(derivationTime)}ms`);
  
  assert(keyResult1.key instanceof CryptoKey, 'Should return CryptoKey');
  assert(typeof keyResult1.keyId === 'string', 'Should return keyId string');
  assert(keyResult1.salt instanceof Uint8Array, 'Should return salt as Uint8Array');
  assert(keyResult1.salt.length === 32, 'Salt should be 32 bytes');
  
  // 生成第二次金鑰（相同密碼短語）
  const keyResult2 = await manager.generateDeterministicKey(TEST_CONFIG.testPhrases.valid);
  
  // 驗證確定性
  assert(keyResult1.keyId === keyResult2.keyId, 'Same passphrase should generate same keyId');
  assert(keyResult1.salt.length === keyResult2.salt.length, 'Salt length should be consistent');
  
  // 驗證不同密碼短語產生不同金鑰
  const keyResult3 = await manager.generateDeterministicKey(TEST_CONFIG.testPhrases.validEnglish);
  assert(keyResult1.keyId !== keyResult3.keyId, 'Different passphrases should generate different keyIds');
}

/**
 * 測試 4: 金鑰加解密功能
 */
async function testKeyEncryptionDecryption() {
  const manager = new UserKeyManager();
  
  const keyResult = await manager.generateDeterministicKey(TEST_CONFIG.testPhrases.valid);
  const testData = 'Test encryption data 測試加密資料';
  
  // 測試加密
  const encrypted = await manager.testEncryption(keyResult.key, testData);
  assert(encrypted.data && Array.isArray(encrypted.data), 'Encrypted data should be array');
  assert(encrypted.iv && Array.isArray(encrypted.iv), 'IV should be array');
  assert(encrypted.iv.length === 12, 'IV should be 12 bytes for AES-GCM');
  
  // 測試解密
  const decrypted = await manager.testDecryption(keyResult.key, encrypted);
  assert(decrypted === testData, 'Decrypted data should match original');
  
  // 測試金鑰有效性
  const isValid = await manager.testKeyValidity(keyResult.key);
  assert(isValid === true, 'Generated key should be valid');
}

/**
 * 測試 5: 設定使用者密碼短語
 */
async function testSetUserPassphrase() {
  const manager = new UserKeyManager();
  
  const result = await manager.setUserPassphrase(TEST_CONFIG.testPhrases.valid);
  
  assert(result.success === true, 'Setting passphrase should succeed');
  assert(typeof result.keyId === 'string', 'Should return keyId');
  assert(typeof result.entropy === 'number', 'Should return entropy value');
  assert(result.entropy >= 60, 'Entropy should meet minimum requirement');
  
  // 驗證元數據已儲存
  const metadata = await manager.getStoredKeyMetadata();
  assert(metadata !== null, 'Key metadata should be stored');
  assert(metadata.keyId === result.keyId, 'Stored keyId should match');
  assert(metadata.version === '3.2.2', 'Should store correct version');
}

/**
 * 測試 6: 驗證使用者密碼短語
 */
async function testVerifyUserPassphrase() {
  const manager = new UserKeyManager();
  
  // 先設定密碼短語
  await manager.setUserPassphrase(TEST_CONFIG.testPhrases.valid);
  
  // 測試正確密碼短語驗證
  const validResult = await manager.verifyUserPassphrase(TEST_CONFIG.testPhrases.valid);
  assert(validResult.success === true, 'Valid passphrase should verify successfully');
  assert(typeof validResult.keyId === 'string', 'Should return keyId on success');
  
  // 測試錯誤密碼短語
  const invalidResult = await manager.verifyUserPassphrase(TEST_CONFIG.testPhrases.validEnglish);
  assert(invalidResult.success === false, 'Invalid passphrase should fail verification');
  assert(typeof invalidResult.remainingAttempts === 'number', 'Should return remaining attempts');
  assert(invalidResult.remainingAttempts < 3, 'Should decrease remaining attempts');
}

/**
 * 測試 7: 金鑰失效檢測
 */
async function testKeyFailureDetection() {
  const manager = new UserKeyManager();
  
  // 測試無金鑰狀態
  const noKeyResult = await manager.detectKeyFailure();
  assert(noKeyResult.isValid === false, 'Should detect no active key');
  assert(typeof noKeyResult.failureReason === 'string', 'Should provide failure reason');
  assert(typeof noKeyResult.suggestedAction === 'string', 'Should provide suggested action');
  
  // 設定金鑰後測試
  await manager.setUserPassphrase(TEST_CONFIG.testPhrases.valid);
  await manager.verifyUserPassphrase(TEST_CONFIG.testPhrases.valid);
  
  const withKeyResult = await manager.detectKeyFailure();
  assert(withKeyResult.isValid === true, 'Should detect valid key');
  assert(!withKeyResult.failureReason, 'Should not have failure reason when valid');
}

/**
 * 測試 8: 記憶體清理
 */
async function testMemoryClearing() {
  const manager = new UserKeyManager();
  
  // 設定金鑰
  await manager.setUserPassphrase(TEST_CONFIG.testPhrases.valid);
  await manager.verifyUserPassphrase(TEST_CONFIG.testPhrases.valid);
  
  // 驗證金鑰存在
  const statusBefore = manager.getStatus();
  assert(statusBefore.hasActiveKey === true, 'Should have active key before clearing');
  
  // 清理記憶體
  await manager.clearMemory();
  
  // 驗證金鑰已清除
  const statusAfter = manager.getStatus();
  assert(statusAfter.hasActiveKey === false, 'Should not have active key after clearing');
  assert(statusAfter.cacheSize === 0, 'Key cache should be empty');
}

/**
 * 測試 9: 失敗嘗試處理與鎖定機制
 */
async function testFailureHandlingAndLockout() {
  const manager = new UserKeyManager();
  
  // 設定密碼短語
  await manager.setUserPassphrase(TEST_CONFIG.testPhrases.valid);
  
  // 測試多次失敗嘗試
  for (let i = 0; i < 3; i++) {
    const result = await manager.verifyUserPassphrase(TEST_CONFIG.testPhrases.validEnglish);
    assert(result.success === false, `Attempt ${i + 1} should fail`);
  }
  
  // 驗證帳戶被鎖定
  const status = manager.getStatus();
  assert(status.isLocked === true, 'Account should be locked after 3 failed attempts');
  assert(status.failedAttempts === 3, 'Should record 3 failed attempts');
  assert(status.remainingLockoutTime > 0, 'Should have remaining lockout time');
  
  // 測試鎖定期間的驗證嘗試
  const lockedResult = await manager.verifyUserPassphrase(TEST_CONFIG.testPhrases.valid);
  assert(lockedResult.success === false, 'Should fail when locked');
  assert(lockedResult.error.includes('locked'), 'Error should mention account is locked');
}

/**
 * 測試 10: 狀態資訊獲取
 */
async function testStatusInformation() {
  const manager = new UserKeyManager();
  
  // 測試初始狀態
  const initialStatus = manager.getStatus();
  assert(typeof initialStatus === 'object', 'Should return status object');
  assert(initialStatus.hasActiveKey === false, 'Should not have active key initially');
  assert(initialStatus.isLocked === false, 'Should not be locked initially');
  assert(initialStatus.failedAttempts === 0, 'Should have 0 failed attempts initially');
  assert(initialStatus.cacheSize === 0, 'Cache should be empty initially');
  assert(initialStatus.keyMetadata === null, 'Should not have key metadata initially');
  
  // 設定金鑰後測試狀態
  await manager.setUserPassphrase(TEST_CONFIG.testPhrases.valid);
  await manager.verifyUserPassphrase(TEST_CONFIG.testPhrases.valid);
  
  const activeStatus = manager.getStatus();
  assert(activeStatus.hasActiveKey === true, 'Should have active key');
  assert(activeStatus.keyMetadata !== null, 'Should have key metadata');
  assert(typeof activeStatus.keyMetadata.keyId === 'string', 'Should have keyId in metadata');
}

/**
 * 執行所有測試
 */
async function runAllTests() {
  console.log('[UCE-01 Test] Starting comprehensive UserKeyManager tests...');
  
  const tests = [
    ['UserKeyManager Loading', testUserKeyManagerLoading],
    ['Passphrase Validation', testPassphraseValidation],
    ['Deterministic Key Generation', testDeterministicKeyGeneration],
    ['Key Encryption/Decryption', testKeyEncryptionDecryption],
    ['Set User Passphrase', testSetUserPassphrase],
    ['Verify User Passphrase', testVerifyUserPassphrase],
    ['Key Failure Detection', testKeyFailureDetection],
    ['Memory Clearing', testMemoryClearing],
    ['Failure Handling & Lockout', testFailureHandlingAndLockout],
    ['Status Information', testStatusInformation]
  ];
  
  const startTime = performance.now();
  
  for (const [testName, testFunction] of tests) {
    await runTest(testName, testFunction);
    
    // 清理 localStorage 避免測試間干擾
    try {
      localStorage.removeItem('userKeyConfig');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  const totalTime = performance.now() - startTime;
  
  // 輸出測試結果
  console.log('\n[UCE-01 Test] ===== TEST SUMMARY =====');
  console.log(`[UCE-01 Test] Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`[UCE-01 Test] Passed: ${testResults.passed}`);
  console.log(`[UCE-01 Test] Failed: ${testResults.failed}`);
  console.log(`[UCE-01 Test] Total Time: ${Math.round(totalTime)}ms`);
  
  if (testResults.errors.length > 0) {
    console.log('\n[UCE-01 Test] ===== ERRORS =====');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`[UCE-01 Test] ${test}: ${error}`);
    });
  }
  
  const success = testResults.failed === 0;
  console.log(`\n[UCE-01 Test] Overall Result: ${success ? 'PASS' : 'FAIL'}`);
  
  return {
    success,
    passed: testResults.passed,
    failed: testResults.failed,
    totalTime: Math.round(totalTime),
    errors: testResults.errors
  };
}

// 自動執行測試（如果在瀏覽器環境中）
if (typeof window !== 'undefined') {
  // 等待 UserKeyManager 載入
  if (typeof UserKeyManager !== 'undefined') {
    runAllTests().then(result => {
      window.UCE01TestResult = result;
    });
  } else {
    window.addEventListener('UserKeyManagerLoaded', () => {
      runAllTests().then(result => {
        window.UCE01TestResult = result;
      });
    });
  }
}

// Node.js 環境匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testResults };
}