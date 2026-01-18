// moda-01 Smoke Test: 設計系統管理器基本功能驗證
// Task: moda-01, Spec: R-009, D-009

/**
 * 基本DOM環境模擬
 */
function setupTestEnvironment() {
  // 模擬document.documentElement
  global.document = {
    documentElement: {
      style: {
        properties: {},
        setProperty: function(name, value) {
          this.properties[name] = value;
        },
        getPropertyValue: function(name) {
          return this.properties[name] || '';
        }
      }
    }
  };

  // 模擬getComputedStyle
  global.getComputedStyle = function(element) {
    return {
      getPropertyValue: function(name) {
        return element.style.properties[name] || '';
      }
    };
  };

  // 模擬performance.now
  global.performance = {
    now: function() {
      return Date.now();
    }
  };
}

/**
 * Smoke Test 1: 設計系統管理器基本實例化
 */
async function testManagerInstantiation() {
  console.log('🧪 Testing: modaDesignSystemManager instantiation...');
  
  try {
    // 動態導入模組（避免編譯時依賴）
    const { modaDesignSystemManager } = await import('../../src/design-system/modaDesignSystemManager.js');
    
    const manager = new modaDesignSystemManager();
    
    // 驗證初始狀態
    const initialState = manager.getState();
    if (initialState.initialized !== false) {
      throw new Error('Initial state should be uninitialized');
    }
    
    console.log('✅ Manager instantiation: PASSED');
    return true;
  } catch (error) {
    console.error('❌ Manager instantiation: FAILED', error.message);
    return false;
  }
}

/**
 * Smoke Test 2: 設計系統初始化流程
 */
async function testInitialization() {
  console.log('🧪 Testing: Design system initialization...');
  
  try {
    const { modaDesignSystemManager } = await import('../../src/design-system/modaDesignSystemManager.js');
    
    const manager = new modaDesignSystemManager();
    const startTime = performance.now();
    
    // 執行初始化
    await manager.initialize();
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    // 驗證初始化狀態
    const state = manager.getState();
    if (!state.initialized) {
      throw new Error('Manager should be initialized');
    }
    
    if (!state.tokensLoaded) {
      throw new Error('Tokens should be loaded');
    }
    
    if (!state.cssVariablesApplied) {
      throw new Error('CSS variables should be applied');
    }
    
    // 驗證效能要求（500ms）
    if (loadTime > 500) {
      console.warn(`⚠️ Initialization took ${loadTime.toFixed(2)}ms (>500ms target)`);
    }
    
    console.log(`✅ Initialization: PASSED (${loadTime.toFixed(2)}ms)`);
    return true;
  } catch (error) {
    console.error('❌ Initialization: FAILED', error.message);
    return false;
  }
}

/**
 * Smoke Test 3: CSS變數應用驗證
 */
async function testCSSVariables() {
  console.log('🧪 Testing: CSS variables application...');
  
  try {
    const { modaDesignSystemManager } = await import('../../src/design-system/modaDesignSystemManager.js');
    
    const manager = new modaDesignSystemManager();
    await manager.initialize();
    
    // 檢查關鍵CSS變數
    const root = document.documentElement;
    const primaryColor = root.style.getPropertyValue('--md-primary-1');
    
    if (primaryColor !== '#6868ac') {
      throw new Error(`Primary color should be #6868ac, got: ${primaryColor}`);
    }
    
    // 檢查Bootstrap整合變數
    const bsPrimary = root.style.getPropertyValue('--bs-primary');
    if (bsPrimary !== 'var(--md-primary-1)') {
      throw new Error(`Bootstrap primary should be var(--md-primary-1), got: ${bsPrimary}`);
    }
    
    console.log('✅ CSS variables: PASSED');
    return true;
  } catch (error) {
    console.error('❌ CSS variables: FAILED', error.message);
    return false;
  }
}

/**
 * Smoke Test 4: 錯誤處理機制
 */
async function testErrorHandling() {
  console.log('🧪 Testing: Error handling...');
  
  try {
    const { modaDesignSystemManager } = await import('../../src/design-system/modaDesignSystemManager.js');
    
    const manager = new modaDesignSystemManager();
    await manager.initialize();
    
    // 測試重複初始化錯誤
    try {
      await manager.initialize();
      throw new Error('Should throw error on duplicate initialization');
    } catch (error) {
      if (error.name === 'DesignSystemError' && error.code === 'ALREADY_INITIALIZED') {
        // 正確的錯誤類型
      } else {
        throw new Error(`Expected ALREADY_INITIALIZED error, got: ${error.code || error.message}`);
      }
    }
    
    console.log('✅ Error handling: PASSED');
    return true;
  } catch (error) {
    console.error('❌ Error handling: FAILED', error.message);
    return false;
  }
}

/**
 * 執行所有Smoke Tests
 */
async function runSmokeTests() {
  console.log('🚀 Starting moda-01 Smoke Tests...\n');
  
  // 設置測試環境
  setupTestEnvironment();
  
  const tests = [
    testManagerInstantiation,
    testInitialization,
    testCSSVariables,
    testErrorHandling
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    console.log(''); // 空行分隔
  }
  
  console.log('📊 Smoke Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  return {
    ran: true,
    passed: failed === 0,
    total: tests.length,
    passedCount: passed,
    failedCount: failed,
    cases: [
      'Manager instantiation',
      'Design system initialization',
      'CSS variables application',
      'Error handling mechanism'
    ]
  };
}

// 執行測試（如果直接運行此檔案）
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTests().then(result => {
    process.exit(result.passed ? 0 : 1);
  });
}

export { runSmokeTests };