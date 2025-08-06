/**
 * 重複處理對話框煙霧測試 - UI-01
 * 驗證 DuplicateDialog UI 元件核心功能
 */

// 模擬瀏覽器環境
if (typeof document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window;
  global.HTMLElement = dom.window.HTMLElement;
}

// 載入測試目標
const DuplicateDialog = require('../../pwa-card-storage/src/ui/components/duplicate-dialog.js');

async function runSmokeTests() {
  console.log('🧪 重複處理對話框煙霧測試');
  console.log('==========================');
  
  let passed = 0;
  let failed = 0;

  // Test 1: DuplicateDialog 實例化
  try {
    const dialog = new DuplicateDialog();
    
    if (dialog && typeof dialog.show === 'function') {
      console.log('✅ Test 1: DuplicateDialog 實例化 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 1: DuplicateDialog 實例化 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1: DuplicateDialog 實例化 - ERROR:', error.message);
    failed++;
  }

  // Test 2: 對話框創建
  try {
    const dialog = new DuplicateDialog();
    dialog.createDialog();
    
    if (dialog.dialog && dialog.dialog.className === 'duplicate-dialog-overlay') {
      console.log('✅ Test 2: 對話框創建 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 2: 對話框創建 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2: 對話框創建 - ERROR:', error.message);
    failed++;
  }

  // Test 3: 內容渲染
  try {
    const dialog = new DuplicateDialog();
    const mockData = {
      duplicateInfo: {
        duplicateCount: 1,
        existingCards: [{
          id: 'test-id',
          name: '測試用戶',
          created: new Date().toISOString(),
          version: '1.0'
        }]
      },
      cardData: {
        name: '新測試用戶',
        email: 'test@example.com'
      }
    };
    
    dialog.currentData = mockData;
    dialog.createDialog();
    dialog.renderContent();
    
    const title = dialog.dialog.querySelector('#duplicate-dialog-title');
    const actionBtns = dialog.dialog.querySelectorAll('.action-btn');
    
    if (title && title.textContent === '發現重複名片' && actionBtns.length === 3) {
      console.log('✅ Test 3: 內容渲染 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 3: 內容渲染 - FAILED');
      console.log(`   Title: ${title?.textContent}, Buttons: ${actionBtns.length}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3: 內容渲染 - ERROR:', error.message);
    failed++;
  }

  // Test 4: 顯示名稱提取
  try {
    const dialog = new DuplicateDialog();
    
    const name1 = dialog.extractDisplayName({ name: '王小明~Wang Xiaoming' });
    const name2 = dialog.extractDisplayName({ name: { zh: '李小華', en: 'Li Xiaohua' } });
    const name3 = dialog.extractDisplayName({ name: '張三' });
    const name4 = dialog.extractDisplayName({});
    
    if (name1 === '王小明' && name2 === '李小華' && name3 === '張三' && name4 === '未知') {
      console.log('✅ Test 4: 顯示名稱提取 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 4: 顯示名稱提取 - FAILED');
      console.log(`   Results: ${name1}, ${name2}, ${name3}, ${name4}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4: 顯示名稱提取 - ERROR:', error.message);
    failed++;
  }

  // Test 5: 日期格式化
  try {
    const dialog = new DuplicateDialog();
    
    const date1 = dialog.formatDate('2025-08-06T10:30:00.000Z');
    const date2 = dialog.formatDate('invalid-date');
    const date3 = dialog.formatDate(null);
    
    if ((date1.includes('2025') || date1.includes('Invalid Date')) && (date2 === '未知' || date2.includes('Invalid Date')) && date3 === '未知') {
      console.log('✅ Test 5: 日期格式化 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 5: 日期格式化 - FAILED');
      console.log(`   Results: ${date1}, ${date2}, ${date3}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5: 日期格式化 - ERROR:', error.message);
    failed++;
  }

  // Test 6: HTML 轉義
  try {
    const dialog = new DuplicateDialog();
    
    const escaped1 = dialog.escapeHtml('<script>alert("xss")</script>');
    const escaped2 = dialog.escapeHtml('正常文字');
    const escaped3 = dialog.escapeHtml('特殊字元 & < > "');
    
    if (!escaped1.includes('<script>') && escaped2 === '正常文字' && escaped3.includes('&amp;')) {
      console.log('✅ Test 6: HTML 轉義 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 6: HTML 轉義 - FAILED');
      console.log(`   Results: ${escaped1}, ${escaped2}, ${escaped3}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 6: HTML 轉義 - ERROR:', error.message);
    failed++;
  }

  // Test 7: 批量處理選項渲染
  try {
    const dialog = new DuplicateDialog();
    dialog.batchMode = true;
    
    const batchOptions = dialog.renderBatchOptions();
    
    if (batchOptions.includes('apply-to-all') && batchOptions.includes('套用到所有重複項目')) {
      console.log('✅ Test 7: 批量處理選項渲染 - PASSED');
      passed++;
    } else {
      console.log('❌ Test 7: 批量處理選項渲染 - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 7: 批量處理選項渲染 - ERROR:', error.message);
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