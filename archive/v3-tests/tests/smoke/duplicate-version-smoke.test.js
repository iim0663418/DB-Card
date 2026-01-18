/**
 * 重複檢測與版本管理煙霧測試 - CORE-02
 * 驗證 DuplicateDetector 和 VersionManager 核心功能
 */

// 模擬瀏覽器環境
if (typeof indexedDB === 'undefined') {
  const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
  const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
  global.indexedDB = new FDBFactory();
  global.IDBKeyRange = FDBKeyRange;
  global.window = { indexedDB: global.indexedDB, IDBKeyRange: global.IDBKeyRange };
}

if (typeof crypto === 'undefined') {
  global.crypto = require('crypto').webcrypto;
}

// 載入依賴
const ContentFingerprintGenerator = require('../../pwa-card-storage/src/core/content-fingerprint-generator.js');
const PWACardStorage = require('../../pwa-card-storage/src/core/storage.js');
const DuplicateDetector = require('../../pwa-card-storage/src/core/duplicate-detector.js');
const VersionManager = require('../../pwa-card-storage/src/core/version-manager.js');

global.window = { ContentFingerprintGenerator };

async function runSmokeTests() {
  console.log('🧪 重複檢測與版本管理煙霧測試');
  console.log('==============================');
  
  let passed = 0;
  let failed = 0;

  // 初始化測試環境
  const storage = new PWACardStorage();
  const detector = new DuplicateDetector(storage);
  const versionManager = new VersionManager(storage);

  // Test 1: DuplicateDetector 初始化
  try {
    const initialized = await detector.initialize();
    
    if (initialized) {
      console.log('✅ Test 1: DuplicateDetector 初始化 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 1: DuplicateDetector 初始化 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1: DuplicateDetector 初始化 - ERROR:', error.message);
    failed++;
  }

  // Test 2: 重複檢測功能
  try {
    const testCard = {
      name: '測試用戶',
      email: 'test@example.com'
    };
    
    const result = await detector.detectDuplicates(testCard);
    
    if (result && typeof result.isDuplicate === 'boolean' && result.fingerprint) {
      console.log('✅ Test 2: 重複檢測功能 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 2: 重複檢測功能 - FAILED');
      console.log(`   Result: ${JSON.stringify(result)}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2: 重複檢測功能 - ERROR:', error.message);
    failed++;
  }

  // Test 3: 版本號遞增
  try {
    const currentVersion = 1.0;
    const nextVersion = versionManager.calculateNextVersion(currentVersion);
    
    if (nextVersion === 1.1) {
      console.log('✅ Test 3: 版本號遞增 (1.0→1.1) - PASSED');
      passed++;
    } else {
      console.log('❌ Test 3: 版本號遞增 (1.0→1.1) - FAILED');
      console.log(`   Expected: 1.1, got: ${nextVersion}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3: 版本號遞增 (1.0→1.1) - ERROR:', error.message);
    failed++;
  }

  // Test 4: 版本號遞增邊界測試
  try {
    const version19 = versionManager.calculateNextVersion(1.9);
    const version29 = versionManager.calculateNextVersion(2.9);
    
    if (version19 === 2.0 && version29 === 3.0) {
      console.log('✅ Test 4: 版本號遞增邊界 (1.9→2.0, 2.9→3.0) - PASSED');
      passed++;
    } else {
      console.log('❌ Test 4: 版本號遞增邊界 - FAILED');
      console.log(`   1.9→${version19}, 2.9→${version29}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4: 版本號遞增邊界 - ERROR:', error.message);
    failed++;
  }

  // Test 5: 處理建議邏輯
  try {
    const rec0 = detector.getRecommendation(0);
    const rec1 = detector.getRecommendation(1);
    const rec2 = detector.getRecommendation(2);
    
    if (rec0 === 'create' && rec1 === 'overwrite' && rec2 === 'version') {
      console.log('✅ Test 5: 處理建議邏輯 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 5: 處理建議邏輯 - FAILED');
      console.log(`   0→${rec0}, 1→${rec1}, 2→${rec2}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5: 處理建議邏輯 - ERROR:', error.message);
    failed++;
  }

  // Test 6: 顯示名稱提取
  try {
    const name1 = detector.extractDisplayName({ name: '王小明~Wang Xiaoming' });
    const name2 = detector.extractDisplayName({ name: { zh: '李小華', en: 'Li Xiaohua' } });
    const name3 = detector.extractDisplayName({ name: '張三' });
    
    if (name1 === '王小明' && name2 === '李小華' && name3 === '張三') {
      console.log('✅ Test 6: 顯示名稱提取 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 6: 顯示名稱提取 - FAILED');
      console.log(`   Results: ${name1}, ${name2}, ${name3}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 6: 顯示名稱提取 - ERROR:', error.message);
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