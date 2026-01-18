/**
 * QR Tip 顯示行為測試
 * 驗證 qrTip 在不同語言下的正確顯示
 */

// 模擬語言管理器
const mockLanguageManager = {
  currentLanguage: 'zh',
  translations: {
    zh: {
      qrTip: '掃描此 QR 碼即可開啟數位名片'
    },
    en: {
      qrTip: 'Scan this QR code to open the digital business card'
    }
  },
  
  getCurrentLanguage() {
    return this.currentLanguage;
  },
  
  getText(key, lang = null, options = {}) {
    const targetLang = lang || this.currentLanguage;
    const translation = this.translations[targetLang];
    
    if (!translation || !translation[key]) {
      return options.fallback || key;
    }
    
    return translation[key];
  }
};

// 模擬 PWA 應用
const mockApp = {
  languageManager: mockLanguageManager,
  
  getCurrentLanguage() {
    return this.languageManager.getCurrentLanguage();
  },
  
  getLocalizedText(key, fallback = null) {
    return this.languageManager.getText(key, null, { fallback });
  },
  
  getUILabels() {
    const currentLang = this.getCurrentLanguage();
    const isEn = currentLang === 'en' || currentLang === 'en-US';
    
    const fallbacks = {
      qrTip: isEn ? 'Scan this QR code to open the digital business card' : '掃描此 QR 碼即可開啟數位名片'
    };
    
    const result = {};
    Object.keys(fallbacks).forEach(key => {
      const translated = this.languageManager.getText(key, currentLang, { fallback: null });
      result[key] = (translated && translated !== key && translated.trim() !== '') ? 
        translated : fallbacks[key];
    });
    
    return result;
  }
};

// 測試函數
function testQRTipDisplay() {
  console.log('=== QR Tip 顯示行為測試 ===');
  
  // 測試中文顯示
  mockApp.languageManager.currentLanguage = 'zh';
  const zhLabels = mockApp.getUILabels();
  const zhTip = mockApp.getLocalizedText('qrTip');
  
  console.log('中文測試:');
  console.log('  getUILabels().qrTip:', zhLabels.qrTip);
  console.log('  getLocalizedText("qrTip"):', zhTip);
  console.log('  預期結果:', '掃描此 QR 碼即可開啟數位名片');
  console.log('  測試結果:', zhLabels.qrTip === '掃描此 QR 碼即可開啟數位名片' ? '✅ 通過' : '❌ 失敗');
  console.log('');
  
  // 測試英文顯示
  mockApp.languageManager.currentLanguage = 'en';
  const enLabels = mockApp.getUILabels();
  const enTip = mockApp.getLocalizedText('qrTip');
  
  console.log('英文測試:');
  console.log('  getUILabels().qrTip:', enLabels.qrTip);
  console.log('  getLocalizedText("qrTip"):', enTip);
  console.log('  預期結果:', 'Scan this QR code to open the digital business card');
  console.log('  測試結果:', enLabels.qrTip === 'Scan this QR code to open the digital business card' ? '✅ 通過' : '❌ 失敗');
  console.log('');
  
  // 模擬 showQRModal 中的使用
  console.log('模擬 showQRModal 中的使用:');
  
  // 中文模式
  mockApp.languageManager.currentLanguage = 'zh';
  const zhModalTip = mockApp.getLocalizedText('qrTip');
  console.log('  中文模式 - showQRModal 中的 qrTip:', zhModalTip);
  
  // 英文模式
  mockApp.languageManager.currentLanguage = 'en';
  const enModalTip = mockApp.getLocalizedText('qrTip');
  console.log('  英文模式 - showQRModal 中的 qrTip:', enModalTip);
  
  // 檢查是否有硬編碼問題
  console.log('');
  console.log('硬編碼檢查:');
  console.log('  是否包含 "💡 QR 碼提示":', zhModalTip.includes('💡 QR 碼提示') ? '❌ 發現硬編碼' : '✅ 無硬編碼');
  console.log('  是否包含 "💡 QR Tip":', enModalTip.includes('💡 QR Tip') ? '❌ 發現硬編碼' : '✅ 無硬編碼');
}

// 執行測試
if (typeof window !== 'undefined') {
  // 瀏覽器環境
  window.testQRTipDisplay = testQRTipDisplay;
  console.log('QR Tip 測試函數已載入，請在控制台執行 testQRTipDisplay()');
} else {
  // Node.js 環境
  testQRTipDisplay();
}

// 導出測試函數
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testQRTipDisplay, mockApp };
}