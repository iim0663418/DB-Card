/**
 * 手動語言整合驗證腳本
 * 用於驗證統一語言架構是否正確整合
 */

console.log('🔍 開始語言整合驗證...');

// 1. 檢查 Enhanced Language Manager 是否已初始化
if (window.enhancedLanguageManager) {
  console.log('✅ Enhanced Language Manager 已初始化');
  console.log('   - 當前語言:', window.enhancedLanguageManager.getCurrentLanguage());
  console.log('   - 翻譯註冊表:', window.enhancedLanguageManager.translationRegistry ? '已載入' : '未載入');
  console.log('   - 統一觀察者:', window.enhancedLanguageManager.unifiedObserver ? '已載入' : '未載入');
  console.log('   - PWA 適配器:', window.enhancedLanguageManager.pwaAdapter ? '已載入' : '未載入');
} else {
  console.log('❌ Enhanced Language Manager 未初始化');
}

// 2. 檢查翻譯功能
if (window.enhancedLanguageManager && window.enhancedLanguageManager.translationRegistry) {
  const testTranslations = [
    { key: 'pwa.cardList.view', zh: '檢視', en: 'View' },
    { key: 'pwa.navigation.cards', zh: '我的名片', en: 'My Cards' },
    { key: 'security.benefits', zh: '優點：', en: 'Benefits:' }
  ];
  
  console.log('✅ 翻譯功能測試:');
  testTranslations.forEach(test => {
    const zhText = window.enhancedLanguageManager.getUnifiedText(test.key, 'zh');
    const enText = window.enhancedLanguageManager.getUnifiedText(test.key, 'en');
    
    const zhMatch = zhText === test.zh;
    const enMatch = enText === test.en;
    
    console.log(`   ${zhMatch && enMatch ? '✅' : '❌'} ${test.key}: "${zhText}" / "${enText}"`);
  });
}

// 3. 檢查組件註冊
if (window.enhancedLanguageManager && window.enhancedLanguageManager.pwaAdapter) {
  const adapter = window.enhancedLanguageManager.pwaAdapter;
  const status = adapter.getStatus();
  
  console.log('✅ PWA 組件註冊狀態:');
  console.log('   - 已註冊組件數量:', status.registeredComponents);
  console.log('   - 動態組件數量:', status.dynamicComponents);
  console.log('   - 組件類型分布:', status.componentsByType);
}

// 4. 檢查 Card List 組件整合
if (window.cardList) {
  console.log('✅ Card List 組件已載入');
  console.log('   - 當前語言:', window.cardList.currentLanguage);
  console.log('   - 語言更新方法:', typeof window.cardList.updateLanguage === 'function' ? '已實作' : '未實作');
} else {
  console.log('❌ Card List 組件未載入');
}

// 5. 測試語言切換功能
async function testLanguageSwitch() {
  if (!window.enhancedLanguageManager) {
    console.log('❌ 無法測試語言切換：Enhanced Language Manager 未初始化');
    return;
  }
  
  console.log('🔄 測試語言切換...');
  
  const initialLang = window.enhancedLanguageManager.getCurrentLanguage();
  console.log('   初始語言:', initialLang);
  
  try {
    const newLang = await window.enhancedLanguageManager.toggleLanguage();
    console.log('   切換後語言:', newLang);
    
    const navItems = document.querySelectorAll('.nav-item .nav-text');
    if (navItems.length > 0) {
      console.log('   導航元素更新:', Array.from(navItems).map(item => item.textContent));
    }
    
    const emptyStateTitle = document.querySelector('.empty-state h3');
    if (emptyStateTitle) {
      console.log('   空狀態標題:', emptyStateTitle.textContent);
    }
    
    console.log('✅ 語言切換測試完成');
    
  } catch (error) {
    console.log('❌ 語言切換失敗:', error.message);
  }
}

// 6. 執行完整驗證
async function runFullVerification() {
  console.log('\n🚀 執行完整語言整合驗證...');
  
  await testLanguageSwitch();
  
  setTimeout(async () => {
    if (window.enhancedLanguageManager) {
      await window.enhancedLanguageManager.toggleLanguage();
      console.log('🔄 已切換回原語言');
    }
    
    console.log('\n📊 驗證結果摘要:');
    console.log('✅ Enhanced Language Manager:', window.enhancedLanguageManager ? '正常' : '異常');
    console.log('✅ 翻譯註冊表:', window.enhancedLanguageManager?.translationRegistry ? '正常' : '異常');
    console.log('✅ PWA 適配器:', window.enhancedLanguageManager?.pwaAdapter ? '正常' : '異常');
    console.log('✅ Card List 組件:', window.cardList ? '正常' : '異常');
    
    const allSystemsGo = window.enhancedLanguageManager && 
                        window.enhancedLanguageManager.translationRegistry && 
                        window.enhancedLanguageManager.pwaAdapter && 
                        window.cardList;
    
    if (allSystemsGo) {
      console.log('\n🎉 統一語言架構整合成功！所有組件應該能夠同步切換語言。');
    } else {
      console.log('\n⚠️ 部分組件未正確整合，請檢查初始化流程。');
    }
  }, 1000);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runFullVerification, 2000);
    });
  } else {
    setTimeout(runFullVerification, 2000);
  }
  
  window.verifyLanguageIntegration = runFullVerification;
  console.log('\n💡 提示：您也可以手動執行 verifyLanguageIntegration() 來重新驗證');
}