/**
 * Security Settings Translation and Form Accessibility Fix Test
 * Tests the fixes for security-settings-modal translation and form field warnings
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Mock language manager
global.window.languageManager = {
  getCurrentLanguage: () => 'zh',
  getText: (key) => {
    const translations = {
      'security.title': '安全設定',
      'security.closeLabel': '關閉設定',
      'security.saveButton': '儲存並關閉',
      'security.exportButton': '匯出設定',
      'security.resetButton': '重設為預設值',
      'security.restartNotice': '⚠️ 某些設定需要重新載入頁面才能生效'
    };
    return translations[key] || key;
  },
  registerObserver: (id, observer) => {
    console.log(`Registered observer: ${id}`);
  },
  addObserver: (callback) => {
    console.log('Added observer (fallback)');
  }
};

// Load the security settings class
const ClientSideSecuritySettings = require('../../src/security/ClientSideSecuritySettings.js');

// Test execution starts here

// Run the tests
console.log('🧪 Running Security Settings Translation and Form Accessibility Fix Tests...\n');

const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Simple test runner
function runTest(testName, testFn) {
  testResults.total++;
  try {
    testFn();
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
    testResults.failed++;
  }
}

// Mock expect function
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error('Expected value to be truthy');
      }
    },
    not: {
      toThrow: () => {
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
        }
      }
    }
  };
}

// Run tests
try {
  const securitySettings = new ClientSideSecuritySettings();
  
  // Translation Integration Tests
  runTest('Translation integration with PWA language manager', () => {
    const title = securitySettings.getLocalizedText('title');
    expect(title).toBe('安全設定');
  });
  
  runTest('Language observer registration', () => {
    expect(securitySettings.languageObserver).toBeDefined();
  });
  
  runTest('Modal content update method exists', () => {
    expect(typeof securitySettings.updateModalContent).toBe('function');
  });
  
  // Form Accessibility Tests
  runTest('Form elements have proper id attributes', () => {
    const settingHtml = securitySettings.renderSetting('webauthn.enabled', {
      category: 'authentication',
      name: 'WebAuthn 生物識別',
      description: '使用指紋或臉部識別進行身份驗證',
      type: 'boolean',
      default: false
    });
    expect(settingHtml).toContain('id="toggle-webauthn.enabled"');
    expect(settingHtml).toContain('id="label-webauthn.enabled"');
  });
  
  runTest('Select elements have name attributes', () => {
    const settingHtml = securitySettings.renderSetting('encryption.algorithm', {
      category: 'encryption',
      name: '加密演算法',
      description: '選擇加密演算法',
      type: 'select',
      options: [
        { value: 'AES-GCM', label: 'AES-GCM (推薦)' },
        { value: 'AES-CBC', label: 'AES-CBC' }
      ],
      default: 'AES-GCM'
    });
    expect(settingHtml).toContain('name="setting-encryption.algorithm"');
  });
  
  runTest('ARIA attributes are properly set', () => {
    const settingHtml = securitySettings.renderSetting('monitoring.enabled', {
      category: 'monitoring',
      name: '安全監控',
      description: '監控系統安全狀態',
      type: 'boolean',
      default: true
    });
    expect(settingHtml).toContain('role="switch"');
    expect(settingHtml).toContain('aria-checked="true"');
    expect(settingHtml).toContain('aria-labelledby="label-monitoring.enabled"');
  });
  
  runTest('Keyboard navigation support added', () => {
    const settingHtml = securitySettings.renderSetting('privacy.analytics', {
      category: 'privacy',
      name: '使用統計',
      description: '收集匿名使用統計以改善服務',
      type: 'boolean',
      default: false
    });
    expect(settingHtml).toContain('onkeydown=');
    expect(settingHtml).toContain('event.key===\'Enter\'');
  });
  
  runTest('Data attributes for setting identification', () => {
    const settingHtml = securitySettings.renderSetting('webauthn.fallback', {
      category: 'authentication',
      name: 'PIN 備用驗證',
      description: '當生物識別不可用時使用 PIN 碼',
      type: 'boolean',
      default: true
    });
    expect(settingHtml).toContain('data-setting-key="webauthn.fallback"');
  });
  
  // Error Handling Tests
  runTest('Graceful handling of missing DOM elements', () => {
    expect(() => securitySettings.updateModalContent()).not.toThrow();
  });
  
  runTest('Recursive update prevention', () => {
    securitySettings.isUpdating = true;
    expect(() => securitySettings.updateLanguage()).not.toThrow();
    securitySettings.isUpdating = false;
  });
  
  // Cleanup
  if (securitySettings.cleanup) {
    securitySettings.cleanup();
  }
  
} catch (error) {
  console.error('Test setup failed:', error);
  testResults.failed++;
  testResults.total++;
}

console.log(`\n📊 Test Results: ${testResults.passed}/${testResults.total} passed`);
if (testResults.failed === 0) {
  console.log('🎉 All tests passed! Security settings translation and form accessibility fixes are working correctly.');
} else {
  console.log(`⚠️  ${testResults.failed} test(s) failed. Please review the implementation.`);
}