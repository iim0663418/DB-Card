// Jest 測試環境設置
// 提供全域測試工具和模擬

// DOM 環境增強
import 'jest-environment-jsdom';

// 全域測試工具
global.console = {
  ...console,
  // 在測試中靜音某些日誌
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
};

// 模擬 performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => [])
};

// 模擬 matchMedia API（用於響應式測試）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模擬 getComputedStyle
global.getComputedStyle = jest.fn(() => ({
  getPropertyValue: jest.fn(() => ''),
  setProperty: jest.fn(),
  removeProperty: jest.fn()
}));

// 測試前清理
beforeEach(() => {
  // 清理 DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  
  // 重置 CSS 變數
  if (document.documentElement.style) {
    document.documentElement.style.cssText = '';
  }
  
  // 清理 console mocks
  jest.clearAllMocks();
});

// 測試後清理
afterEach(() => {
  // 清理任何剩餘的定時器
  jest.clearAllTimers();
  
  // 清理任何剩餘的模擬
  jest.restoreAllMocks();
});