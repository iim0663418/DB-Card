/**
 * Mocha 測試環境設置
 * 為統一語言切換架構測試提供必要的全域設定
 */

// 引入測試框架
const { expect } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { JSDOM } = require('jsdom');

// 設置 chai 插件
require('chai').use(sinonChai);

// 設置 JSDOM 環境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.Event = dom.window.Event;

// 模擬 Web APIs
global.ResizeObserver = function() {
  return {
    observe: sinon.stub(),
    unobserve: sinon.stub(),
    disconnect: sinon.stub()
  };
};

global.IntersectionObserver = function() {
  return {
    observe: sinon.stub(),
    unobserve: sinon.stub(),
    disconnect: sinon.stub()
  };
};

global.MutationObserver = function() {
  return {
    observe: sinon.stub(),
    disconnect: sinon.stub()
  };
};

// 模擬 IndexedDB
global.indexedDB = {
  open: sinon.stub(),
  deleteDatabase: sinon.stub(),
  cmp: sinon.stub()
};

// 模擬 localStorage
const localStorageMock = {
  getItem: sinon.stub(),
  setItem: sinon.stub(),
  removeItem: sinon.stub(),
  clear: sinon.stub(),
  length: 0,
  key: sinon.stub()
};
global.localStorage = localStorageMock;
global.window.localStorage = localStorageMock;

// 模擬 sessionStorage
global.sessionStorage = localStorageMock;
global.window.sessionStorage = localStorageMock;

// 模擬 fetch API
global.fetch = sinon.stub().resolves({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  blob: () => Promise.resolve(new Blob())
});

// 模擬 URL API
global.URL = {
  createObjectURL: sinon.stub().returns('mock-url'),
  revokeObjectURL: sinon.stub()
};
global.window.URL = global.URL;

// 模擬 FileReader
global.FileReader = function() {
  return {
    readAsText: sinon.stub(),
    readAsDataURL: sinon.stub(),
    readAsArrayBuffer: sinon.stub(),
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
    result: null,
    error: null,
    readyState: 0
  };
};

// 模擬 performance API
global.performance = {
  now: sinon.stub().returns(Date.now()),
  mark: sinon.stub(),
  measure: sinon.stub(),
  getEntriesByName: sinon.stub().returns([]),
  getEntriesByType: sinon.stub().returns([])
};
global.window.performance = global.performance;

// 模擬 console 方法（避免測試輸出污染）
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  info: sinon.stub(),
  debug: sinon.stub()
};

// 模擬 CSS 支援檢查
global.CSS = {
  supports: sinon.stub().returns(true)
};
global.window.CSS = global.CSS;

// 模擬 matchMedia
global.matchMedia = sinon.stub().returns({
  matches: false,
  media: '',
  onchange: null,
  addListener: sinon.stub(),
  removeListener: sinon.stub(),
  addEventListener: sinon.stub(),
  removeEventListener: sinon.stub(),
  dispatchEvent: sinon.stub()
});
global.window.matchMedia = global.matchMedia;

// 設置預設的視窗尺寸
Object.defineProperty(global.window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(global.window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// 模擬 getComputedStyle
global.getComputedStyle = sinon.stub().returns({
  display: 'block',
  width: '100px',
  height: '100px',
  getPropertyValue: sinon.stub()
});
global.window.getComputedStyle = global.getComputedStyle;

// 設置測試用的語言環境
Object.defineProperty(global.navigator, 'language', {
  writable: true,
  value: 'zh-TW'
});

Object.defineProperty(global.navigator, 'languages', {
  writable: true,
  value: ['zh-TW', 'en-US']
});

// 清理函數 - 只在 Mocha 環境中定義
if (typeof afterEach === 'function') {
  afterEach(() => {
    // 清理 DOM
    global.document.body.innerHTML = '';
    global.document.head.innerHTML = '';
    
    // 重置所有模擬
    sinon.restore();
    
    // 重置全域變數
    delete global.window.languageManager;
    delete global.window.storage;
    delete global.window.DuplicateDialog;
    delete global.window.PWAUILanguageAdapter;
    delete global.window.EnhancedLanguageManager;
  });
} else {
  // 提供手動清理函數
  global.testCleanup = () => {
    global.document.body.innerHTML = '';
    global.document.head.innerHTML = '';
    sinon.restore();
    delete global.window.languageManager;
    delete global.window.storage;
    delete global.window.DuplicateDialog;
    delete global.window.PWAUILanguageAdapter;
    delete global.window.EnhancedLanguageManager;
  };
}

// 全域錯誤處理
process.on('uncaughtException', (error) => {
  console.error('Uncaught error in test:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection in test:', reason);
});

// 測試工具函數
global.testUtils = {
  // 等待 DOM 更新
  waitForDOMUpdate: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // 等待指定時間
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 模擬用戶點擊
  click: (element) => {
    const event = new global.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: global.window
    });
    element.dispatchEvent(event);
  },
  
  // 模擬鍵盤事件
  keydown: (element, key, options = {}) => {
    const event = new global.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    });
    element.dispatchEvent(event);
  },
  
  // 模擬表單輸入
  type: (element, text) => {
    element.value = text;
    const event = new global.Event('input', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  },
  
  // 創建模擬的語言管理器
  createMockLanguageManager: (initialLang = 'zh') => ({
    currentLanguage: initialLang,
    getCurrentLanguage() { return this.currentLanguage; },
    setLanguage(lang) { this.currentLanguage = lang; },
    getText: sinon.stub().returns('mock-text')
  }),
  
  // 創建模擬的儲存系統
  createMockStorage: () => {
    const storage = new Map();
    return {
      async getCard(id) { return storage.get(id); },
      async saveCard(card) { 
        storage.set(card.id, { ...card, saved: Date.now() });
        return card.id;
      },
      async updateCard(id, updates) {
        const existing = storage.get(id);
        if (existing) {
          storage.set(id, { ...existing, ...updates, updated: Date.now() });
        }
        return storage.get(id);
      },
      async deleteCard(id) { return storage.delete(id); },
      async getAllCards() { return Array.from(storage.values()); }
    };
  }
};

// 設置測試超時警告
const originalSetTimeout = global.setTimeout;
global.setTimeout = (fn, delay) => {
  if (delay > 5000) {
    console.warn(`Long timeout detected: ${delay}ms`);
  }
  return originalSetTimeout(fn, delay);
};

// 導出測試工具
module.exports = {
  expect,
  sinon,
  testUtils: global.testUtils
};