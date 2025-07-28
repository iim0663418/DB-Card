const CACHE_NAME = 'nfc-card-collection-v3';
const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';
const IMAGE_CACHE = 'images-v3';

// 動態路徑配置
const getBasePath = () => {
  const isGitHubPages = self.location.hostname.includes('github.io');
  return isGitHubPages ? `/${self.location.pathname.split('/')[1]}/` : '/';
};

const BASE_PATH = getBasePath();

// 核心檔案快取清單 (使用動態路徑) - 優化版本
const CORE_FILES = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}collection.html`,
  `${BASE_PATH}assets/bilingual-common.js`,
  `${BASE_PATH}assets/qrcode.min.js`,
  `${BASE_PATH}assets/high-accessibility.css`,
  `${BASE_PATH}assets/moda-logo.svg`,
  `${BASE_PATH}assets/icon-192.png`,
  `${BASE_PATH}assets/icon-512.png`,
  `${BASE_PATH}assets/scan-icon.png`,
  `${BASE_PATH}assets/collection-icon.png`,
  `${BASE_PATH}pwa-storage.js`,
  `${BASE_PATH}collection-manager.js`,
  `${BASE_PATH}qr-scanner.js`,
  `${BASE_PATH}format-parser.js`,
  `${BASE_PATH}pwa-core.js`,
  `${BASE_PATH}pwa-injector.js`,
  `${BASE_PATH}manifest.json`
];

// PWA 模組載入順序優化
const PWA_MODULES = [
  'format-parser.js',
  'pwa-storage.js', 
  'pwa-core.js',
  'pwa-injector.js'
];

// 預載入策略
const PRELOAD_RESOURCES = [
  `${BASE_PATH}assets/qrcode.min.js`,
  `${BASE_PATH}assets/bilingual-common.js`
];

// 安裝事件 - 優化快取策略
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      // 快取核心檔案
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching core files');
        return cache.addAll(CORE_FILES);
      }),
      // 預載入關鍵資源
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('Service Worker: Preloading critical resources');
        return Promise.allSettled(
          PRELOAD_RESOURCES.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(() => {})
          )
        );
      })
    ]).then(() => self.skipWaiting())
  );
});

// 啟動事件 - 清理舊快取
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch 事件 - 智慧快取策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳過非 GET 請求
  if (request.method !== 'GET') return;
  
  // 圖片資源 - 快取優先策略
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // 圖片載入失敗時返回預設圖示
            return caches.match('/assets/moda-logo.svg');
          });
        });
      })
    );
    return;
  }
  
  // 外部資源 - 網路優先
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }
  
  // PWA 模組 - 智慧載入策略
  if (PWA_MODULES.some(module => url.pathname.endsWith(module))) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(fetchResponse => {
          if (fetchResponse.ok) {
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, fetchResponse.clone());
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }
  
  // 核心檔案 - 快取優先
  if (CORE_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          // 背景更新
          fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, fetchResponse);
              });
            }
          }).catch(() => {});
          return response;
        }
        return fetch(request);
      })
    );
    return;
  }
  
  // 其他資源 - 網路優先
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(response => {
          if (response) {
            return response;
          }
          // HTML 請求返回離線頁面
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/collection.html');
          }
        });
      })
  );
});

// 背景同步 - 未來擴展用
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    // 未來可實作背景資料同步
  }
});

// 推送通知 - 未來擴展用
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('Service Worker: Push received:', data);
    // 未來可實作推送通知
  }
});