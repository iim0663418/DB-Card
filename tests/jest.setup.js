/**
 * Jest測試環境設置
 * 為所有測試提供通用的模擬和配置
 */

// 模擬瀏覽器API
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
  }
};

global.TextDecoder = class {
  decode(buffer) {
    return String.fromCharCode(...new Uint8Array(buffer));
  }
};

// 模擬Crypto API
global.crypto = {
  subtle: {
    digest: jest.fn().mockImplementation(async (algorithm, data) => {
      // 簡單的模擬雜湊
      const hash = new ArrayBuffer(32);
      const view = new Uint8Array(hash);
      for (let i = 0; i < 32; i++) {
        view[i] = Math.floor(Math.random() * 256);
      }
      return hash;
    }),
    importKey: jest.fn().mockResolvedValue({}),
    deriveKey: jest.fn().mockResolvedValue({}),
    encrypt: jest.fn().mockImplementation(async () => {
      return new ArrayBuffer(64);
    }),
    decrypt: jest.fn().mockImplementation(async () => {
      return new TextEncoder().encode('{"decrypted": "data"}');
    })
  },
  getRandomValues: jest.fn().mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

// 模擬IndexedDB
global.indexedDB = {
  open: jest.fn().mockImplementation(() => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: null
    };
    
    setTimeout(() => {
      request.result = createMockDB();
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    
    return request;
  })
};

// 模擬Storage API
global.navigator = {
  ...global.navigator,
  storage: {
    estimate: jest.fn().mockResolvedValue({
      usage: 1024 * 1024, // 1MB
      quota: 100 * 1024 * 1024 // 100MB
    })
  }
};

// 模擬Performance API
global.performance = {
  ...global.performance,
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  }
};

// 通用模擬資料庫
function createMockDB() {
  const stores = new Map();
  
  return {
    objectStoreNames: {
      contains: (name) => ['cards', 'versions', 'settings', 'backups'].includes(name)
    },
    createObjectStore: jest.fn().mockImplementation((name) => ({
      createIndex: jest.fn()
    })),
    transaction: jest.fn().mockImplementation((storeNames, mode) => {
      const transaction = {
        objectStore: jest.fn().mockImplementation((storeName) => {
          if (!stores.has(storeName)) {
            stores.set(storeName, new Map());
          }
          
          const store = stores.get(storeName);
          
          return {
            add: jest.fn().mockImplementation((data) => {
              const request = { onsuccess: null, onerror: null };
              setTimeout(() => {
                store.set(data.id, data);
                if (request.onsuccess) {
                  request.onsuccess({ target: { result: data.id } });
                }
              }, 0);
              return request;
            }),
            get: jest.fn().mockImplementation((key) => {
              const request = { onsuccess: null, onerror: null };
              setTimeout(() => {
                if (request.onsuccess) {
                  request.onsuccess({ target: { result: store.get(key) } });
                }
              }, 0);
              return request;
            }),
            put: jest.fn().mockImplementation((data) => {
              const request = { onsuccess: null, onerror: null };
              setTimeout(() => {
                store.set(data.id, data);
                if (request.onsuccess) {
                  request.onsuccess({ target: { result: data.id } });
                }
              }, 0);
              return request;
            }),
            delete: jest.fn().mockImplementation((key) => {
              const request = { onsuccess: null, onerror: null };
              setTimeout(() => {
                store.delete(key);
                if (request.onsuccess) {
                  request.onsuccess({ target: { result: undefined } });
                }
              }, 0);
              return request;
            }),
            count: jest.fn().mockImplementation(() => {
              const request = { onsuccess: null, onerror: null };
              setTimeout(() => {
                if (request.onsuccess) {
                  request.onsuccess({ target: { result: store.size } });
                }
              }, 0);
              return request;
            }),
            index: jest.fn().mockImplementation(() => ({
              getAll: jest.fn().mockImplementation(() => {
                const request = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (request.onsuccess) {
                    request.onsuccess({ target: { result: Array.from(store.values()) } });
                  }
                }, 0);
                return request;
              }),
              openCursor: jest.fn().mockImplementation(() => {
                const request = { onsuccess: null, onerror: null };
                setTimeout(() => {
                  if (request.onsuccess) {
                    request.onsuccess({ target: { result: null } }); // 簡化：無cursor
                  }
                }, 0);
                return request;
              })
            }))
          };
        })
      };
      return transaction;
    }),
    close: jest.fn(),
    onclose: null,
    onversionchange: null
  };
}

// 清理函數
afterEach(() => {
  jest.clearAllMocks();
});

// 全域錯誤處理
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};