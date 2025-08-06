/**
 * Jest test setup for security initialization tests
 */

// Mock browser APIs
global.indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  databases: jest.fn().mockResolvedValue([])
};

global.crypto = {
  subtle: {
    generateKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
  },
  getRandomValues: jest.fn(arr => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// Mock navigator
global.navigator = {
  userAgent: 'test-agent',
  language: 'en-US',
  onLine: true,
  credentials: {
    create: jest.fn(),
    get: jest.fn()
  },
  storage: {
    estimate: jest.fn().mockResolvedValue({
      quota: 50 * 1024 * 1024,
      usage: 10 * 1024 * 1024
    })
  }
};

// Suppress console output during tests
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});