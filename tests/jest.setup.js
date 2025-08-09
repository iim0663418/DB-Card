/**
 * Jest Setup Configuration for Security Tests
 * Configures test environment and global mocks
 * 
 * @version 1.0.0
 * @author Security Testing Team
 */

// Global test timeout
jest.setTimeout(10000);

// Mock browser APIs
global.performance = {
  now: jest.fn(() => Date.now())
};

global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
    decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
    importKey: jest.fn(() => Promise.resolve({})),
    deriveKey: jest.fn(() => Promise.resolve({}))
  }
};

global.indexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          getAll: jest.fn(),
          createIndex: jest.fn(),
          index: jest.fn(() => ({
            getAll: jest.fn(),
            openCursor: jest.fn()
          }))
        }))
      })),
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn()
      })),
      objectStoreNames: {
        contains: jest.fn(() => false)
      }
    }
  }))
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock URL constructor
global.URL = class URL {
  constructor(url) {
    if (typeof url !== 'string') {
      throw new TypeError('Invalid URL');
    }
    
    // Simple URL parsing for tests
    const match = url.match(/^(https?|mailto|tel|javascript|data|file|ftp):(.*)$/);
    if (!match) {
      throw new TypeError('Invalid URL');
    }
    
    this.protocol = match[1] + ':';
    this.href = url;
    this.hostname = '';
    this.searchParams = new URLSearchParams();
    
    // Extract hostname for http/https URLs
    if (this.protocol === 'https:' || this.protocol === 'http:') {
      const hostMatch = match[2].match(/^\/\/([^\/]+)/);
      if (hostMatch) {
        this.hostname = hostMatch[1];
      }
    }
  }
  
  toString() {
    return this.href;
  }
};

global.URLSearchParams = class URLSearchParams {
  constructor() {
    this.params = new Map();
  }
  
  has(key) {
    return this.params.has(key);
  }
  
  set(key, value) {
    this.params.set(key, value);
  }
  
  delete(key) {
    this.params.delete(key);
  }
};

// Mock Blob for file operations
global.Blob = class Blob {
  constructor(parts, options = {}) {
    this.parts = parts;
    this.type = options.type || '';
    this.size = parts.reduce((size, part) => size + part.length, 0);
  }
};

// Mock File for file operations
global.File = class File extends Blob {
  constructor(parts, name, options = {}) {
    super(parts, options);
    this.name = name;
    this.lastModified = options.lastModified || Date.now();
  }
};

// Mock TextEncoder/TextDecoder
global.TextEncoder = class TextEncoder {
  encode(str) {
    return new Uint8Array(Buffer.from(str, 'utf8'));
  }
};

global.TextDecoder = class TextDecoder {
  decode(buffer) {
    return Buffer.from(buffer).toString('utf8');
  }
};

// Mock atob/btoa for base64 operations
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

// Mock console methods to capture security logs
const originalConsole = { ...console };
const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockDebug = jest.fn();
const mockInfo = jest.fn();

global.console = {
  ...originalConsole,
  log: mockLog,
  warn: mockWarn,
  error: mockError,
  debug: mockDebug,
  info: mockInfo
};

// Security test utilities
global.SecurityTestUtils = {
  // Generate malicious XSS payloads for testing
  generateXSSPayloads: () => [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(\'XSS\')">',
    'javascript:alert("XSS")',
    '<svg onload="alert(1)">',
    '"><script>alert(document.cookie)</script>',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<object data="javascript:alert(\'XSS\')"></object>',
    '<embed src="javascript:alert(\'XSS\')">',
    '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
    '<style>@import "javascript:alert(\'XSS\')"</style>'
  ],

  // Generate code injection payloads for testing
  generateCodeInjectionPayloads: () => [
    'eval("alert(1)")',
    'Function("return alert(1)")()',
    'setTimeout("alert(1)", 0)',
    'setInterval("alert(1)", 1000)',
    'document.write("malicious")',
    'window.location = "malicious"',
    'global.process.exit()',
    'require("fs")',
    'import("malicious")',
    '__proto__.constructor',
    'constructor.prototype'
  ],

  // Generate log injection payloads for testing
  generateLogInjectionPayloads: () => [
    'Normal text\nInjected line',
    'Log entry\rCarriage return attack',
    'Tab\tattack',
    'Null\x00byte attack',
    'Bell\x07character',
    'Escape\x1B[31msequence',
    'Form\x0Cfeed',
    'Vertical\x0Btab',
    'Backspace\x08attack'
  ],

  // Generate malicious URLs for testing
  generateMaliciousUrls: () => [
    'javascript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://malicious.com'
  ],

  // Create mock DOM element
  createMockElement: (tagName = 'div') => ({
    tagName: tagName.toUpperCase(),
    textContent: '',
    innerHTML: '',
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
      toggle: jest.fn()
    },
    style: {},
    href: '',
    target: '',
    rel: ''
  }),

  // Measure test performance
  measurePerformance: (testFn) => {
    const start = performance.now();
    const result = testFn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  },

  // Validate security event structure
  validateSecurityEvent: (event) => {
    expect(event).toHaveProperty('timestamp');
    expect(event).toHaveProperty('level');
    expect(event).toHaveProperty('message');
    expect(event).toHaveProperty('source');
    expect(typeof event.timestamp).toBe('string');
    expect(['INFO', 'WARN', 'ERROR', 'DEBUG']).toContain(event.level);
    expect(typeof event.message).toBe('string');
    expect(typeof event.source).toBe('string');
  }
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  
  // Reset console mocks
  mockLog.mockClear();
  mockWarn.mockClear();
  mockError.mockClear();
  mockDebug.mockClear();
  mockInfo.mockClear();
  
  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset sessionStorage mock
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress specific warnings in test environment
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that are expected in test environment
  const message = args.join(' ');
  if (message.includes('Warning: ReactDOM.render is deprecated') ||
      message.includes('Warning: componentWillMount has been renamed')) {
    return;
  }
  originalWarn.apply(console, args);
};