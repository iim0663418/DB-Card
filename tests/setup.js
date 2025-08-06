/**
 * Jest 測試環境設置
 * 為重複處理對話框雙語支援測試提供必要的全域設定
 */

// 模擬 DOM 環境
import 'jest-dom/extend-expect';

// 模擬 Web APIs
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 模擬 IndexedDB
global.indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  cmp: jest.fn()
};

// 模擬 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// 模擬 sessionStorage
global.sessionStorage = localStorageMock;

// 模擬 fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob())
  })
);

// 模擬 URL API
global.URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn()
};

// 模擬 FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: null,
  error: null,
  readyState: 0
}));

// 模擬 performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => [])
};

// 模擬 console 方法（避免測試輸出污染）
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// 模擬 CSS 支援檢查
global.CSS = {
  supports: jest.fn(() => true)
};

// 模擬 matchMedia
global.matchMedia = jest.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// 設置預設的視窗尺寸
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// 模擬 getComputedStyle
global.getComputedStyle = jest.fn(() => ({
  display: 'block',
  width: '100px',
  height: '100px',
  getPropertyValue: jest.fn()
}));

// 設置測試用的語言環境
Object.defineProperty(navigator, 'language', {
  writable: true,
  value: 'zh-TW'
});

Object.defineProperty(navigator, 'languages', {
  writable: true,
  value: ['zh-TW', 'en-US']
});

// 清理函數
afterEach(() => {
  // 清理 DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // 重置所有模擬
  jest.clearAllMocks();
  
  // 重置全域變數
  delete window.languageManager;
  delete window.storage;
  delete window.DuplicateDialog;
});

// 全域錯誤處理
global.addEventListener('error', (event) => {
  console.error('Uncaught error in test:', event.error);
});

global.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in test:', event.reason);
});

// 測試工具函數
global.testUtils = {
  // 等待 DOM 更新
  waitForDOMUpdate: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // 等待指定時間
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 模擬用戶點擊
  click: (element) => {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
  },
  
  // 模擬鍵盤事件
  keydown: (element, key, options = {}) => {
    const event = new KeyboardEvent('keydown', {
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
    const event = new Event('input', {
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
    getText: jest.fn((key) => key)
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