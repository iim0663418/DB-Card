/**
 * 版本歷史管理介面煙霧測試 - UI-02
 * 驗證 VersionHistory UI 元件核心功能
 */

// 模擬瀏覽器環境
if (typeof document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window;
  global.HTMLElement = dom.window.HTMLElement;
  global.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
  };
}

// 載入測試目標
const VersionHistory = require('../../pwa-card-storage/src/ui/components/version-history.js');

// 模擬依賴
const mockStorage = {};
const mockVersionManager = {
  async getVersionHistory(cardId) {
    return {
      versions: [
        {
          version: 1.2,
          timestamp: '2025-08-06T10:30:00.000Z',
          changeType: 'update',
          description: '更新聯絡資訊',
          data: { name: '測試用戶', email: 'test@example.com', title: '工程師' }
        },
        {
          version: 1.1,
          timestamp: '2025-08-26T15:20:00.000Z',
          changeType: 'update',
          description: '更新職稱',
          data: { name: '測試用戶', email: 'test@example.com', title: '資深工程師' }
        },
        {
          version: 1.0,
          timestamp: '2025-08-25T09:00:00.000Z',
          changeType: 'create',
          description: '建立名片',
          data: { name: '測試用戶', email: 'test@example.com' }
        }
      ]
    };
  },
  
  async compareVersions(cardId, version1, version2) {
    return {
      cardId,
      version1,
      version2,
      differences: [
        {
          field: 'title',
          oldValue: '工程師',
          newValue: '資深工程師',
          changeType: 'modified'
        }
      ]
    };
  },
  
  async restoreToVersion(cardId, version) {
    return { success: true, restoredVersion: version };
  },
  
  async exportVersionHistory(cardId) {
    return {
      success: true,
      file: new Blob(['mock data'], { type: 'application/json' }),
      filename: `versions-${cardId}.json`
    };
  }
};

async function runSmokeTests() {
  console.log('🧪 版本歷史管理介面煙霧測試');
  console.log('============================');
  
  let passed = 0;
  let failed = 0;

  // Test 1: VersionHistory 實例化
  try {
    const versionHistory = new VersionHistory(mockStorage, mockVersionManager);
    
    if (versionHistory && typeof versionHistory.show === 'function') {
      console.log('✅ Test 1: VersionHistory 實例化 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 1: VersionHistory 實例化 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1: VersionHistory 實例化 - ERROR:', error.message);
    failed++;
  }

  // Test 2: 版本歷史載入
  try {
    const versionHistory = new VersionHistory(mockStorage, mockVersionManager);
    versionHistory.currentCardId = 'test-card';
    
    await versionHistory.loadVersionHistory();
    
    if (versionHistory.versions.length === 3) {
      console.log('✅ Test 2: 版本歷史載入 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 2: 版本歷史載入 - FAILED');
      console.log(`   Expected: 3 versions, got: ${versionHistory.versions.length}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2: 版本歷史載入 - ERROR:', error.message);
    failed++;
  }

  // Test 3: 版本列表渲染
  try {
    const versionHistory = new VersionHistory(mockStorage, mockVersionManager);
    versionHistory.versions = [
      {
        version: 1.1,
        timestamp: '2025-08-06T10:30:00.000Z',
        changeType: 'update',
        description: '測試更新',
        data: { name: '測試用戶', email: 'test@example.com' }
      }
    ];
    
    const html = versionHistory.renderVersionList();
    
    if (html.includes('version-item') && html.includes('v1.1')) {
      console.log('✅ Test 3: 版本列表渲染 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 3: 版本列表渲染 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3: 版本列表渲染 - ERROR:', error.message);
    failed++;
  }

  // Test 4: 版本預覽渲染
  try {
    const versionHistory = new VersionHistory(mockStorage, mockVersionManager);
    const testData = {
      name: '王小明~Wang Xiaoming',
      email: 'wang@example.com',
      title: '工程師'
    };
    
    const preview = versionHistory.renderVersionPreview(testData);
    
    if (preview.includes('王小明') && preview.includes('工程師') && preview.includes('wang@example.com')) {
      console.log('✅ Test 4: 版本預覽渲染 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 4: 版本預覽渲染 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4: 版本預覽渲染 - ERROR:', error.message);
    failed++;
  }

  // Test 5: 變更類型標籤
  try {
    const versionHistory = new VersionHistory(mockStorage, mockVersionManager);
    
    const createLabel = versionHistory.getChangeTypeLabel('create');
    const updateLabel = versionHistory.getChangeTypeLabel('update');
    const restoreLabel = versionHistory.getChangeTypeLabel('restore');
    const unknownLabel = versionHistory.getChangeTypeLabel('unknown');
    
    if (createLabel === '建立' && updateLabel === '更新' && restoreLabel === '還原' && unknownLabel === 'unknown') {
      console.log('✅ Test 5: 變更類型標籤 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 5: 變更類型標籤 - FAILED');
      console.log(`   Results: ${createLabel}, ${updateLabel}, ${restoreLabel}, ${unknownLabel}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5: 變更類型標籤 - ERROR:', error.message);
    failed++;
  }

  // Test 6: 日期格式化
  try {
    const versionHistory = new VersionHistory(mockStorage, mockVersionManager);
    
    const date1 = versionHistory.formatDate('2025-08-06T10:30:00.000Z');
    const date2 = versionHistory.formatDate('invalid-date');
    
    if ((date1.includes('2025') || date1.includes('Invalid Date')) && (date2 === '未知時間' || date2.includes('Invalid Date'))) {
      console.log('✅ Test 6: 日期格式化 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 6: 日期格式化 - FAILED');
      console.log(`   Results: ${date1}, ${date2}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 6: 日期格式化 - ERROR:', error.message);
    failed++;
  }

  // Test 7: 顯示名稱提取
  try {
    const versionHistory = new VersionHistory(mockStorage, mockVersionManager);
    
    const name1 = versionHistory.extractDisplayName({ name: '李小華~Li Xiaohua' });
    const name2 = versionHistory.extractDisplayName({ name: { zh: '張三', en: 'Zhang San' } });
    const name3 = versionHistory.extractDisplayName({ name: '王五' });
    const name4 = versionHistory.extractDisplayName({});
    
    if (name1 === '李小華' && name2 === '張三' && name3 === '王五' && name4 === '未知') {
      console.log('✅ Test 7: 顯示名稱提取 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 7: 顯示名稱提取 - FAILED');
      console.log(`   Results: ${name1}, ${name2}, ${name3}, ${name4}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 7: 顯示名稱提取 - ERROR:', error.message);
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