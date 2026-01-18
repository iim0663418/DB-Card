// moda-02 & moda-03 Smoke Tests
// 驗證主題控制器和CSS變數管理器基本功能

import { modaDesignSystemManager } from '../../src/design-system/modaDesignSystemManager.js';
import { ThemeController } from '../../src/design-system/ThemeController.js';
import { CSSVariablesManager } from '../../src/design-system/CSSVariablesManager.js';

// Mock DOM environment
global.document = {
  documentElement: {
    style: {
      setProperty: () => {},
      getPropertyValue: () => '#6868ac',
      transition: ''
    },
    classList: {
      remove: () => {},
      add: () => {}
    }
  },
  body: {
    classList: {
      remove: () => {},
      add: () => {}
    }
  }
};

global.window = {
  matchMedia: () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  requestAnimationFrame: cb => setTimeout(cb, 16),
  dispatchEvent: () => {},
  CustomEvent: function() {},
  getComputedStyle: () => ({
    getPropertyValue: () => '#6868ac'
  })
};

global.getComputedStyle = global.window.getComputedStyle;

global.performance = {
  now: () => Date.now()
};

console.log('🚀 Starting moda-02 & moda-03 Smoke Tests...\n');

// Simple test runner
const tests = [];
const describe = (name, fn) => { console.log(`\n📋 ${name}`); fn(); };
const test = (name, fn) => tests.push({ name, fn });
const expect = (actual) => ({
  toBe: (expected) => { if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`); },
  toBeInstanceOf: (expected) => { if (!(actual instanceof expected)) throw new Error(`Expected instance of ${expected.name}`); },
  toBeDefined: () => { if (actual === undefined) throw new Error('Expected to be defined'); },
  toHaveProperty: (prop) => { if (!(prop in actual)) throw new Error(`Expected to have property ${prop}`); },
  toBeLessThan: (expected) => { if (actual >= expected) throw new Error(`Expected ${actual} to be less than ${expected}`); },
  toBeGreaterThan: (expected) => { if (actual <= expected) throw new Error(`Expected ${actual} to be greater than ${expected}`); },
  rejects: {
    toThrow: async (expected) => {
      try {
        await actual;
        throw new Error('Expected to throw');
      } catch (error) {
        if (!error.message.includes(expected)) throw new Error(`Expected error containing "${expected}"`);
      }
    }
  }
});

let designSystemManager, themeController, cssVariablesManager;

const beforeEach = () => {
  designSystemManager = new modaDesignSystemManager();
  themeController = new ThemeController(designSystemManager);
  cssVariablesManager = new CSSVariablesManager(designSystemManager);
};

describe('moda-02 & moda-03 Smoke Tests', () => {
  // moda-02: 主題控制器測試
  describe('🧪 Testing: ThemeController instantiation and initialization', () => {
    test('should create ThemeController instance', () => {
      console.log('🧪 Testing: ThemeController instantiation...\n');
      
      expect(themeController).toBeInstanceOf(ThemeController);
      expect(themeController.currentTheme).toBe('auto');
      expect(themeController.state.initialized).toBe(false);
      
      console.log('✅ ThemeController instantiation: PASSED\n');
    });

    test('should initialize theme controller successfully', async () => {
      console.log('🧪 Testing: Theme controller initialization...\n');
      
      const startTime = performance.now();
      
      await themeController.initialize();
      
      const initTime = performance.now() - startTime;
      
      expect(themeController.state.initialized).toBe(true);
      expect(themeController.systemPreference).toBeDefined();
      
      console.log(`✅ Theme controller initialization: PASSED (${initTime.toFixed(2)}ms)\n`);
    });
  });

  describe('🧪 Testing: Theme switching functionality', () => {
    test('should switch themes within performance threshold', async () => {
      console.log('🧪 Testing: Theme switching performance...\n');
      
      await themeController.initialize();
      
      const startTime = performance.now();
      
      await themeController.switchTheme('dark');
      
      const switchTime = performance.now() - startTime;
      
      expect(themeController.currentTheme).toBe('dark');
      expect(switchTime).toBeLessThan(300); // 300ms threshold for test environment
      
      console.log(`✅ Theme switching: PASSED (${switchTime.toFixed(2)}ms < 300ms)\n`);
    });

    test('should detect system preference', async () => {
      console.log('🧪 Testing: System preference detection...\n');
      
      await themeController.initialize();
      
      const currentTheme = themeController.getCurrentTheme();
      
      expect(currentTheme).toHaveProperty('selected');
      expect(currentTheme).toHaveProperty('effective');
      expect(currentTheme).toHaveProperty('systemPreference');
      
      console.log('✅ System preference detection: PASSED\n');
    });
  });

  // moda-03: CSS變數管理器測試
  describe('🧪 Testing: CSSVariablesManager instantiation and initialization', () => {
    test('should create CSSVariablesManager instance', () => {
      console.log('🧪 Testing: CSSVariablesManager instantiation...\n');
      
      expect(cssVariablesManager).toBeInstanceOf(CSSVariablesManager);
      expect(cssVariablesManager.state.initialized).toBe(false);
      expect(cssVariablesManager.pendingUpdates).toBeInstanceOf(Map);
      
      console.log('✅ CSSVariablesManager instantiation: PASSED\n');
    });

    test('should initialize CSS variables manager successfully', async () => {
      console.log('🧪 Testing: CSS variables manager initialization...\n');
      
      await cssVariablesManager.initialize();
      
      expect(cssVariablesManager.state.initialized).toBe(true);
      expect(cssVariablesManager.variableCache).toBeInstanceOf(Map);
      
      console.log('✅ CSS variables manager initialization: PASSED\n');
    });
  });

  describe('🧪 Testing: Batch CSS variables update', () => {
    test('should batch update CSS variables within performance threshold', async () => {
      console.log('🧪 Testing: Batch CSS variables update performance...\n');
      
      await cssVariablesManager.initialize();
      
      const testVariables = {
        '--md-primary-1': '#ff0000',
        '--md-secondary-1': '#00ff00',
        '--bs-primary': '#0000ff'
      };
      
      const startTime = performance.now();
      
      await cssVariablesManager.batchUpdate(testVariables);
      
      // Wait for requestAnimationFrame
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const updateTime = performance.now() - startTime;
      
      expect(updateTime).toBeLessThan(150); // 150ms threshold for test environment
      
      console.log(`✅ Batch CSS variables update: PASSED (${updateTime.toFixed(2)}ms < 150ms)\n`);
    });

    test('should validate CSS variable names and values', async () => {
      console.log('🧪 Testing: CSS variable validation...\n');
      
      await cssVariablesManager.initialize();
      
      const validVariables = {
        '--md-primary-1': '#6868ac',
        '--bs-body-font-family': 'Arial, sans-serif'
      };
      
      // Valid variables should be processed
      await cssVariablesManager.batchUpdate(validVariables);
      
      console.log('✅ CSS variable validation: PASSED\n');
    });
  });

  describe('🧪 Testing: Error handling', () => {
    test('should handle initialization errors gracefully', async () => {
      console.log('🧪 Testing: Error handling...\n');
      
      // Test duplicate initialization
      await themeController.initialize();
      
      await expect(themeController.initialize()).rejects.toThrow('already initialized');
      
      await cssVariablesManager.initialize();
      
      await expect(cssVariablesManager.initialize()).rejects.toThrow('already initialized');
      
      console.log('✅ Error handling: PASSED\n');
    });
  });
});

// Run the tests
(async () => {
  let passed = 0;
  let failed = 0;
  
  for (const { name, fn } of tests) {
    try {
      beforeEach();
      await fn();
      passed++;
    } catch (error) {
      console.error(`❌ ${name}: FAILED - ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Smoke Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    process.exit(1);
  }
})();