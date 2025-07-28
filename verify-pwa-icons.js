/**
 * PWA 圖示驗證腳本
 * 驗證所有 PWA 圖示檔案是否正確存在且可訪問
 */

async function verifyPWAIcons() {
  console.log('🔍 開始驗證 PWA 圖示...');
  
  try {
    // 讀取 manifest.json
    const manifestResponse = await fetch('/manifest.json');
    const manifest = await manifestResponse.json();
    
    console.log('📄 Manifest.json 載入成功');
    console.log('🎯 檢查的圖示路徑:');
    
    const results = [];
    
    // 檢查主要圖示
    for (const icon of manifest.icons) {
      try {
        const response = await fetch(icon.src);
        const status = response.ok ? '✅' : '❌';
        const message = `${status} ${icon.src} (${icon.sizes}) - HTTP ${response.status}`;
        console.log(message);
        results.push({ path: icon.src, status: response.ok, size: icon.sizes });
      } catch (error) {
        const message = `❌ ${icon.src} - Error: ${error.message}`;
        console.log(message);
        results.push({ path: icon.src, status: false, error: error.message });
      }
    }
    
    // 檢查快捷方式圖示
    const shortcutIcons = [
      { src: 'assets/scan-icon.png', sizes: '96x96' },
      { src: 'assets/collection-icon.png', sizes: '96x96' }
    ];
    
    console.log('\n🚀 檢查快捷方式圖示:');
    for (const icon of shortcutIcons) {
      try {
        const response = await fetch(icon.src);
        const status = response.ok ? '✅' : '❌';
        const message = `${status} ${icon.src} (${icon.sizes}) - HTTP ${response.status}`;
        console.log(message);
        results.push({ path: icon.src, status: response.ok, size: icon.sizes });
      } catch (error) {
        const message = `❌ ${icon.src} - Error: ${error.message}`;
        console.log(message);
        results.push({ path: icon.src, status: false, error: error.message });
      }
    }
    
    // 統計結果
    const totalIcons = results.length;
    const successIcons = results.filter(r => r.status).length;
    const failedIcons = totalIcons - successIcons;
    
    console.log('\n📊 驗證結果統計:');
    console.log(`✅ 成功: ${successIcons}/${totalIcons}`);
    console.log(`❌ 失敗: ${failedIcons}/${totalIcons}`);
    console.log(`📈 成功率: ${Math.round(successIcons/totalIcons*100)}%`);
    
    if (successIcons === totalIcons) {
      console.log('\n🎉 所有 PWA 圖示驗證通過！');
    } else {
      console.log('\n⚠️ 部分圖示檔案有問題，請檢查上述錯誤訊息');
    }
    
    return {
      total: totalIcons,
      success: successIcons,
      failed: failedIcons,
      results: results
    };
    
  } catch (error) {
    console.error('❌ 驗證過程發生錯誤:', error);
    return { error: error.message };
  }
}

// 如果在瀏覽器環境中，自動執行驗證
if (typeof window !== 'undefined') {
  window.verifyPWAIcons = verifyPWAIcons;
  
  // 頁面載入完成後自動執行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyPWAIcons);
  } else {
    verifyPWAIcons();
  }
}

// Node.js 環境支援
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyPWAIcons };
}