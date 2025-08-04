/**
 * PWACardStorage Schema 升級煙霧測試 - STORAGE-01
 * 驗證資料庫版本升級和指紋欄位功能
 */

// 模擬瀏覽器環境
if (typeof indexedDB === 'undefined') {
  global.indexedDB = require('fake-indexeddb');
  global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
}

if (typeof crypto === 'undefined') {
  global.crypto = require('crypto').webcrypto;
}

// 載入依賴
const ContentFingerprintGenerator = require('../../pwa-card-storage/src/core/content-fingerprint-generator.js');
global.window = { ContentFingerprintGenerator };

// 載入測試目標
const PWACardStorage = require('../../pwa-card-storage/src/core/storage.js');

async function runSmokeTests() {
  console.log('🧪 PWACardStorage Schema 升級煙霧測試');
  console.log('=====================================');
  
  let passed = 0;
  let failed = 0;

  // Test 1: 資料庫版本升級
  try {
    const storage = new PWACardStorage();
    
    if (storage.dbVersion === 3) {
      console.log('✅ Test 1: 資料庫版本升級至 v3 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 1: 資料庫版本升級至 v3 - FAILED');
      console.log(`   Expected: 3, got: ${storage.dbVersion}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1: 資料庫版本升級至 v3 - ERROR:', error.message);
    failed++;
  }

  // Test 2: Schema 定義包含 fingerprint 索引
  try {
    const storage = new PWACardStorage();
    const cardsSchema = storage.stores.cards;
    
    if (cardsSchema.indexes.fingerprint === 'fingerprint') {
      console.log('✅ Test 2: Schema 包含 fingerprint 索引 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 2: Schema 包含 fingerprint 索引 - FAILED');
      console.log(`   Expected: 'fingerprint', got: ${cardsSchema.indexes.fingerprint}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2: Schema 包含 fingerprint 索引 - ERROR:', error.message);
    failed++;
  }

  // Test 3: 指紋生成功能
  try {
    const storage = new PWACardStorage();
    const testData = {
      name: '測試用戶',
      email: 'test@example.com'
    };
    
    const fingerprint = await storage.generateFingerprint(testData);
    
    if (fingerprint && fingerprint.startsWith('fingerprint_')) {
      console.log('✅ Test 3: 指紋生成功能 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 3: 指紋生成功能 - FAILED');
      console.log(`   Expected format: fingerprint_*, got: ${fingerprint}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3: 指紋生成功能 - ERROR:', error.message);
    failed++;
  }

  // Test 4: 指紋查詢方法
  try {
    const storage = new PWACardStorage();
    
    if (typeof storage.findCardsByFingerprint === 'function') {
      console.log('✅ Test 4: 指紋查詢方法 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 4: 指紋查詢方法 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4: 指紋查詢方法 - ERROR:', error.message);
    failed++;
  }

  // Test 5: 向下相容性檢查
  try {
    const storage = new PWACardStorage();
    
    // 檢查原有方法仍然存在
    const requiredMethods = ['storeCard', 'getCard', 'updateCard', 'deleteCard', 'listCards'];
    const allMethodsExist = requiredMethods.every(method => typeof storage[method] === 'function');
    
    if (allMethodsExist) {
      console.log('✅ Test 5: 向下相容性檢查 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 5: 向下相容性檢查 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5: 向下相容性檢查 - ERROR:', error.message);
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