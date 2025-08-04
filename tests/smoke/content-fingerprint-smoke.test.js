/**
 * ContentFingerprintGenerator 煙霧測試
 * 驗證核心功能和關鍵路徑
 */

// 模擬瀏覽器環境
if (typeof crypto === 'undefined') {
  global.crypto = require('crypto').webcrypto;
}

// 載入測試目標
const ContentFingerprintGenerator = require('../../pwa-card-storage/src/core/content-fingerprint-generator.js');

async function runSmokeTests() {
  console.log('🧪 ContentFingerprintGenerator Smoke Tests');
  console.log('==========================================');
  
  const generator = new ContentFingerprintGenerator();
  let passed = 0;
  let failed = 0;

  // Test 1: 基本指紋生成
  try {
    const cardData = {
      name: '王小明',
      email: 'wang@example.com'
    };
    
    const fingerprint = await generator.generateFingerprint(cardData);
    
    if (fingerprint.startsWith('fingerprint_') && fingerprint.length === 76) {
      console.log('✅ Test 1: 基本指紋生成 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 1: 基本指紋生成 - FAILED');
      console.log(`   Expected format: fingerprint_[64chars], got: ${fingerprint}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1: 基本指紋生成 - ERROR:', error.message);
    failed++;
  }

  // Test 2: 雙語格式標準化
  try {
    const bilingualData = {
      name: '王小明~Wang Xiaoming',
      email: 'wang@example.com'
    };
    
    const fingerprint = await generator.generateFingerprint(bilingualData);
    
    if (generator.validateFingerprint(fingerprint)) {
      console.log('✅ Test 2: 雙語格式標準化 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 2: 雙語格式標準化 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2: 雙語格式標準化 - ERROR:', error.message);
    failed++;
  }

  // Test 3: 指紋一致性
  try {
    const cardData = {
      name: '測試用戶',
      email: 'test@example.com'
    };
    
    const fingerprint1 = await generator.generateFingerprint(cardData);
    const fingerprint2 = await generator.generateFingerprint(cardData);
    
    if (fingerprint1 === fingerprint2) {
      console.log('✅ Test 3: 指紋一致性 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 3: 指紋一致性 - FAILED');
      console.log(`   fingerprint1: ${fingerprint1}`);
      console.log(`   fingerprint2: ${fingerprint2}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3: 指紋一致性 - ERROR:', error.message);
    failed++;
  }

  // Test 4: 錯誤處理
  try {
    const invalidData = null;
    const fingerprint = await generator.generateFingerprint(invalidData);
    
    if (fingerprint.includes('fallback') || fingerprint.includes('error')) {
      console.log('✅ Test 4: 錯誤處理 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 4: 錯誤處理 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('✅ Test 4: 錯誤處理 - PASSED (Expected error)');
    passed++;
  }

  // Test 5: 指紋驗證
  try {
    const validFingerprint = 'fingerprint_a1b2c3d4e5f67890123456789012345678901234567890123456789012345678';
    const invalidFingerprint = 'invalid_format';
    
    const isValid = generator.validateFingerprint(validFingerprint);
    const isInvalid = generator.validateFingerprint(invalidFingerprint);
    
    if (isValid && !isInvalid) {
      console.log('✅ Test 5: 指紋驗證 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 5: 指紋驗證 - FAILED');
      console.log(`   Valid check: ${isValid}, Invalid check: ${isInvalid}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5: 指紋驗證 - ERROR:', error.message);
    failed++;
  }

  console.log('\n📊 測試結果:');
  console.log(`✅ 通過: ${passed}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  return { passed, failed, success: failed === 0 };
}

// 執行測試
if (require.main === module) {
  runSmokeTests().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { runSmokeTests };