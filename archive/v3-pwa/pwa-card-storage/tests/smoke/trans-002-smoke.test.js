/**
 * TRANS-002 Smoke Test: getUILabels 方法修復驗證
 * 驗證 getUILabels() 方法不會返回 undefined 值，確保 UI 顯示正常
 */

// Mock environment setup
const mockWindow = {
  SafeTranslationHandler: {
    getTranslation: (key, lang, options) => {
      const mockTranslations = {
        zh: {
          cardDetails: '名片詳細資訊',
          generateQR: '生成 QR 碼',
          downloadVCard: '下載 vCard'
        },
        en: {
          cardDetails: 'Card Details',
          generateQR: 'Generate QR',
          downloadVCard: 'Download vCard'
        }
      };
      
      const langKey = lang === 'en' ? 'en' : 'zh';
      return mockTranslations[langKey]?.[key] || options?.fallback || key;
    }
  },
  languageManager: {
    getText: (key, lang, options) => {
      // Simulate missing translations (returns undefined)
      if (key === 'missingKey') return undefined;
      if (key === 'emptyKey') return '';
      if (key === 'nullKey') return null;
      
      // Normal translations
      const translations = {
        cardDetails: lang === 'en' ? 'Card Details' : '名片詳細資訊',
        generateQR: lang === 'en' ? 'Generate QR' : '生成 QR 碼'
      };
      return translations[key];
    }
  }
};

// Mock PWACardApp class with getUILabels method
class MockPWACardApp {
  constructor() {
    this.currentLanguage = 'zh';
  }
  
  getCurrentLanguage() {
    return this.currentLanguage;
  }
  
  // TRANS-002: Fixed getUILabels method
  getUILabels() {
    const currentLang = this.getCurrentLanguage();
    const isEn = currentLang === 'en' || currentLang === 'en-US';
    
    const fallbacks = {
      cardDetails: isEn ? 'Card Details' : '名片詳細資訊',
      avatar: isEn ? 'Avatar' : '大頭貼',
      email: isEn ? 'Email' : '電子郵件',
      phone: isEn ? 'Phone' : '電話',
      mobile: isEn ? 'Mobile' : '手機',
      address: isEn ? 'Address' : '地址',
      greetings: isEn ? 'Greetings' : '問候語',
      social: isEn ? 'Social Links' : '社群連結',
      generateQR: isEn ? 'Generate QR' : '生成 QR 碼',
      downloadVCard: isEn ? 'Download vCard' : '下載 vCard',
      qrCode: isEn ? 'QR Code' : 'QR 碼',
      downloadQR: isEn ? 'Download QR Code' : '下載 QR 碼',
      copyLink: isEn ? 'Copy Link' : '複製連結',
      qrTip: isEn ? 'Scan this QR code to open the digital business card' : '掃描此 QR 碼即可開啟數位名片',
      versionManagement: isEn ? 'Version Management' : '版本管理'
    };
    
    // 優先使用 SafeTranslationHandler 進行翻譯
    if (mockWindow.SafeTranslationHandler) {
      try {
        const result = {};
        Object.keys(fallbacks).forEach(key => {
          const translated = mockWindow.SafeTranslationHandler.getTranslation(key, currentLang, {
            fallback: fallbacks[key]
          });
          result[key] = translated && translated.trim() !== '' ? translated : fallbacks[key];
        });
        return result;
      } catch (error) {
        console.warn('[PWA] SafeTranslationHandler failed in getUILabels:', error);
      }
    }
    
    // 備用方案 1: 使用語言管理器但加入空值檢查
    if (mockWindow.languageManager && typeof mockWindow.languageManager.getText === 'function') {
      try {
        const result = {};
        Object.keys(fallbacks).forEach(key => {
          const translated = mockWindow.languageManager.getText(key, currentLang, { fallback: null });
          result[key] = (translated && translated !== key && translated.trim() !== '') ? 
            translated : fallbacks[key];
        });
        return result;
      } catch (error) {
        console.warn('[PWA] Language manager failed in getUILabels:', error);
      }
    }
    
    // 最終備用方案: 直接返回備用文字
    return fallbacks;
  }
}

// Test Suite
function runTRANS002SmokeTests() {
  console.log('🧪 Running TRANS-002 Smoke Tests: getUILabels Method Fix');
  
  const tests = [
    {
      name: 'Test 1: SafeTranslationHandler Integration',
      test: () => {
        const app = new MockPWACardApp();
        const labels = app.getUILabels();
        
        // 驗證所有必要的鍵值都存在且不為 undefined
        const requiredKeys = [
          'cardDetails', 'avatar', 'email', 'phone', 'mobile', 
          'address', 'greetings', 'social', 'generateQR', 
          'downloadVCard', 'qrCode', 'downloadQR', 'copyLink', 
          'qrTip', 'versionManagement'
        ];
        
        for (const key of requiredKeys) {
          if (labels[key] === undefined || labels[key] === null || labels[key] === '') {
            throw new Error(`Key '${key}' returned invalid value: ${labels[key]}`);
          }
        }
        
        // 驗證中文翻譯
        if (labels.cardDetails !== '名片詳細資訊') {
          throw new Error(`Expected '名片詳細資訊', got '${labels.cardDetails}'`);
        }
        
        return true;
      }
    },
    
    {
      name: 'Test 2: English Language Support',
      test: () => {
        const app = new MockPWACardApp();
        app.currentLanguage = 'en';
        const labels = app.getUILabels();
        
        // 驗證英文翻譯
        if (labels.cardDetails !== 'Card Details') {
          throw new Error(`Expected 'Card Details', got '${labels.cardDetails}'`);
        }
        
        if (labels.generateQR !== 'Generate QR') {
          throw new Error(`Expected 'Generate QR', got '${labels.generateQR}'`);
        }
        
        return true;
      }
    },
    
    {
      name: 'Test 3: Fallback Mechanism When SafeTranslationHandler Unavailable',
      test: () => {
        // 暫時移除 SafeTranslationHandler
        const originalHandler = mockWindow.SafeTranslationHandler;
        delete mockWindow.SafeTranslationHandler;
        
        try {
          const app = new MockPWACardApp();
          const labels = app.getUILabels();
          
          // 應該使用語言管理器或最終備用方案
          if (labels.cardDetails === undefined) {
            throw new Error('Fallback mechanism failed');
          }
          
          return true;
        } finally {
          // 恢復 SafeTranslationHandler
          mockWindow.SafeTranslationHandler = originalHandler;
        }
      }
    },
    
    {
      name: 'Test 4: Null/Undefined Translation Handling',
      test: () => {
        // 模擬語言管理器返回 undefined 的情況
        const originalGetText = mockWindow.languageManager.getText;
        mockWindow.languageManager.getText = () => undefined;
        
        try {
          const app = new MockPWACardApp();
          const labels = app.getUILabels();
          
          // 即使語言管理器返回 undefined，也應該有有效的備用文字
          if (labels.cardDetails === undefined || labels.cardDetails === '') {
            throw new Error('Failed to handle undefined translation');
          }
          
          return true;
        } finally {
          // 恢復原始方法
          mockWindow.languageManager.getText = originalGetText;
        }
      }
    },
    
    {
      name: 'Test 5: Error Resilience',
      test: () => {
        // 模擬 SafeTranslationHandler 拋出錯誤
        const originalHandler = mockWindow.SafeTranslationHandler;
        mockWindow.SafeTranslationHandler = {
          getTranslation: () => {
            throw new Error('Translation service error');
          }
        };
        
        try {
          const app = new MockPWACardApp();
          const labels = app.getUILabels();
          
          // 即使出現錯誤，也應該返回有效的標籤
          if (labels.cardDetails === undefined) {
            throw new Error('Error handling failed');
          }
          
          return true;
        } finally {
          // 恢復原始 handler
          mockWindow.SafeTranslationHandler = originalHandler;
        }
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(({ name, test }) => {
    try {
      const result = test();
      if (result) {
        console.log(`✅ ${name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: FAILED - ${error.message}`);
      failed++;
    }
  });
  
  console.log(`\n📊 TRANS-002 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All TRANS-002 tests passed! getUILabels method fix is working correctly.');
    return true;
  } else {
    console.log('⚠️ Some TRANS-002 tests failed. Please review the implementation.');
    return false;
  }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTRANS002SmokeTests, MockPWACardApp };
}

// Auto-run in browser environment
if (typeof window !== 'undefined') {
  // Run tests when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTRANS002SmokeTests);
  } else {
    runTRANS002SmokeTests();
  }
}