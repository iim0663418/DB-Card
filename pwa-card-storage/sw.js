/**
 * PWA-15: 部署與效能優化 - Service Worker
 * 實作離線優先快取策略與效能優化
 */

const CACHE_NAME = 'pwa-card-storage-v2.4';
const STATIC_CACHE_NAME = 'pwa-static-v2.4';
const DYNAMIC_CACHE_NAME = 'pwa-dynamic-v2.4';
const IMAGE_CACHE_NAME = 'pwa-images-v2.4';

// 動態獲取基礎路徑 - 支援 GitHub Pages 和 Cloudflare Pages
const getBasePath = () => {
  const location = self.location || { pathname: '/pwa-card-storage/', hostname: 'localhost' };
  const pathParts = location.pathname.split('/').filter(part => part);
  const pwaIndex = pathParts.findIndex(part => part === 'pwa-card-storage');
  
  // GitHub Pages 檢測
  if (location.hostname && location.hostname.includes('.github.io')) {
    if (pwaIndex > 0) {
      // GitHub Pages: /DB-Card/pwa-card-storage/
      return '/' + pathParts.slice(0, pwaIndex).join('/');
    } else {
      // 備用方案
      return '/DB-Card';
    }
  } else if (location.hostname && location.hostname.includes('.pages.dev')) {
    // Cloudflare Pages: 根域名部署
    return '';
  } else {
    // 本地開發或其他環境
    return '';
  }
};

const BASE_PATH = getBasePath();

// 核心靜態資源（必須快取）
const CORE_RESOURCES = [
  `${BASE_PATH}/pwa-card-storage/`,
  `${BASE_PATH}/pwa-card-storage/index.html`,
  `${BASE_PATH}/pwa-card-storage/manifest.json`,
  
  // 核心 JavaScript 檔案
  `${BASE_PATH}/pwa-card-storage/src/app.js`,
  `${BASE_PATH}/pwa-card-storage/src/pwa-init.js`,
  `${BASE_PATH}/pwa-card-storage/src/core/storage.js`,
  `${BASE_PATH}/pwa-card-storage/src/core/health-manager.js`,
  `${BASE_PATH}/pwa-card-storage/src/core/version-manager.js`,
  `${BASE_PATH}/pwa-card-storage/src/features/card-manager.js`,
  `${BASE_PATH}/pwa-card-storage/src/features/offline-tools.js`,
  `${BASE_PATH}/pwa-card-storage/src/features/transfer-manager.js`,

  `${BASE_PATH}/pwa-card-storage/src/ui/components/card-list.js`,
  `${BASE_PATH}/pwa-card-storage/src/ui/components/card-renderer.js`,
  `${BASE_PATH}/pwa-card-storage/src/ui/components/conflict-resolver.js`,
  `${BASE_PATH}/pwa-card-storage/src/ui/components/unified-interface.js`,
  `${BASE_PATH}/pwa-card-storage/src/integration/legacy-adapter.js`,
  `${BASE_PATH}/pwa-card-storage/src/integration/bilingual-bridge.js`
];

// 樣式資源
const STYLE_RESOURCES = [
  `${BASE_PATH}/pwa-card-storage/assets/styles/main.css`,
  `${BASE_PATH}/pwa-card-storage/assets/styles/components.css`,
  `${BASE_PATH}/assets/qrcode-style.css`,
  `${BASE_PATH}/assets/high-accessibility.css`
];

// 外部依賴資源
const EXTERNAL_RESOURCES = [
  `${BASE_PATH}/assets/bilingual-common.js`,
  `${BASE_PATH}/assets/qrcode.min.js`,
  `${BASE_PATH}/assets/qr-utils.js`,
  `${BASE_PATH}/assets/pwa-integration.js`,
  `${BASE_PATH}/assets/moda-logo.svg`
];

// 字體資源
const FONT_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Sans:wght@300;400;500;700&display=swap'
];

// 所有靜態資源
const STATIC_RESOURCES = [
  ...CORE_RESOURCES,
  ...STYLE_RESOURCES,
  ...EXTERNAL_RESOURCES,
  ...FONT_RESOURCES
];

// 動態快取的資源模式
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//,
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/i
];

/**
 * Service Worker 安裝事件 - 優化版本
 */
self.addEventListener('install', (event) => {
  
  event.waitUntil(
    Promise.all([
      // 分批快取核心資源
      cacheResourcesBatch(CORE_RESOURCES, STATIC_CACHE_NAME, '核心資源'),
      cacheResourcesBatch(STYLE_RESOURCES, STATIC_CACHE_NAME, '樣式資源'),
      cacheResourcesBatch(EXTERNAL_RESOURCES, STATIC_CACHE_NAME, '外部資源'),
      
      // 字體資源允許失敗
      cacheResourcesBatch(FONT_RESOURCES, STATIC_CACHE_NAME, '字體資源', true),
      
      // 初始化其他快取
      caches.open(DYNAMIC_CACHE_NAME),
      caches.open(IMAGE_CACHE_NAME)
    ]).then(() => {
      return self.skipWaiting();
    }).catch((error) => {
      console.error('[SW] Service worker installation failed:', error);
      throw error;
    })
  );
});

/**
 * 分批快取資源
 */
async function cacheResourcesBatch(resources, cacheName, description, allowFailure = false) {
  try {
    const cache = await caches.open(cacheName);
    
    if (allowFailure) {
      // 允許部分失敗的資源
      const results = await Promise.allSettled(
        resources.map(url => cache.add(new Request(url, { cache: 'reload' })))
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
      }
    } else {
      // 必須全部成功的資源
      await cache.addAll(resources.map(url => new Request(url, { cache: 'reload' })));
    }
    
  } catch (error) {
    console.error(`[SW] Failed to cache ${description}:`, error);
    if (!allowFailure) throw error;
  }
}

/**
 * Service Worker 啟用事件 - 優化版本
 */
self.addEventListener('activate', (event) => {
  
  event.waitUntil(
    Promise.all([
      // 清理舊的快取
      cleanupOldCaches(),
      
      // 立即控制所有頁面
      self.clients.claim(),
      
      // 初始化效能監控
      initializePerformanceMonitoring()
    ]).then(() => {
      
      // 通知所有客戶端更新完成
      return notifyClientsOfUpdate();
    })
  );
});

/**
 * 初始化效能監控
 */
async function initializePerformanceMonitoring() {
  try {
    // 檢查儲存空間
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usagePercent = Math.round((estimate.usage / estimate.quota) * 100);
      
      
      // 如果使用量超過 80%，清理動態快取
      if (usagePercent > 80) {
        await cleanupDynamicCache();
      }
    }
  } catch (error) {
  }
}

/**
 * 通知客戶端更新完成
 */
async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_UPDATED',
      version: CACHE_NAME,
      timestamp: Date.now()
    });
  });
}

/**
 * 網路請求攔截
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 只處理 GET 請求
  if (request.method !== 'GET') {
    return;
  }
  
  // 跳過 Chrome 擴展請求
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    handleFetchRequest(request)
  );
});

/**
 * 處理網路請求的核心邏輯
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    let response;
    
    // 1. 靜態資源：快取優先策略
    if (isStaticResource(request)) {
      response = await cacheFirstStrategy(request, STATIC_CACHE_NAME);
    }
    // 2. 動態資源：網路優先策略
    else if (isDynamicResource(request)) {
      response = await networkFirstStrategy(request, DYNAMIC_CACHE_NAME);
    }
    // 3. API 請求：網路優先，快取備用
    else if (isApiRequest(request)) {
      response = await networkFirstStrategy(request, DYNAMIC_CACHE_NAME);
    }
    // 4. 其他請求：網路優先
    else {
      response = await networkFirstStrategy(request, DYNAMIC_CACHE_NAME);
    }
    
    // 添加安全標頭
    return addSecurityHeaders(response, request);
    
  } catch (error) {
    console.error('[SW] Fetch request failed:', error);
    
    // 如果是導航請求且失敗，返回離線頁面
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const response = await cache.match(`${BASE_PATH}/pwa-card-storage/index.html`);
      return response ? addSecurityHeaders(response, request) : new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // 其他請求返回網路錯誤
    return new Response('Network error', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/**
 * 快取優先策略 - 增強版本
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // 檢查快取時效性
    const cacheAge = getCacheAge(cachedResponse);
    const maxAge = getMaxAge(request);
    
    if (cacheAge < maxAge) {
      // 快取仍然新鮮
      recordCacheHit(request.url);
      return addCacheHeaders(cachedResponse, 'HIT');
    }
    
    // 快取過期，背景更新
    updateCacheInBackground(request, cache);
    recordCacheHit(request.url, true); // 標記為過期命中
    return addCacheHeaders(cachedResponse, 'STALE');
  }
  
  // 快取未命中，從網路獲取
  try {
    const networkResponse = await fetchWithTimeout(request, 5000);
    
    if (networkResponse.ok) {
      // 異步更新快取
      queueCacheUpdate(cache, request, networkResponse.clone());
    }
    
    recordCacheMiss(request.url);
    return addCacheHeaders(networkResponse, 'MISS');
  } catch (error) {
    // 網路失敗，返回過期快取或離線頁面
    if (cachedResponse) {
      return addCacheHeaders(cachedResponse, 'OFFLINE');
    }
    
    return getOfflineFallback(request);
  }
}

/**
 * 獲取快取年齡（毫秒）
 */
function getCacheAge(response) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return Infinity;
  
  const cacheDate = new Date(dateHeader);
  return Date.now() - cacheDate.getTime();
}

/**
 * 獲取最大快取時間
 */
function getMaxAge(request) {
  const url = new URL(request.url);
  
  // 不同資源類型的快取時間
  if (url.pathname.endsWith('.html')) return 1 * 60 * 60 * 1000; // 1小時
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) return 24 * 60 * 60 * 1000; // 24小時
  if (url.hostname === 'fonts.googleapis.com') return 7 * 24 * 60 * 60 * 1000; // 7天
  
  return 24 * 60 * 60 * 1000; // 預設24小時
}

/**
 * 帶超時的 fetch
 */
function fetchWithTimeout(request, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(request, {
    signal: controller.signal,
    cache: 'no-cache'
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * 添加快取狀態標頭
 */
function addCacheHeaders(response, status) {
  const headers = new Headers(response.headers);
  headers.set('X-Cache-Status', status);
  headers.set('X-Cache-Date', new Date().toISOString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * 獲取離線備用回應
 */
function getOfflineFallback(request) {
  if (request.mode === 'navigate') {
    return caches.open(STATIC_CACHE_NAME)
      .then(cache => cache.match(`${BASE_PATH}/pwa-card-storage/index.html`))
      .then(response => response || new Response('離線模式', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }));
  }
  
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#999">離線</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  return new Response('網路錯誤', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

/**
 * 網路優先策略（優化版）
 */
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    // 網路請求優化
    const networkResponse = await fetch(request, {
      cache: 'no-cache',
      signal: AbortSignal.timeout(3000) // 3秒超時
    });
    
    if (networkResponse.ok) {
      // 批次快取更新
      queueCacheUpdate(cache, request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 網路失敗，嘗試從快取獲取
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// 效能監控
let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  staleHits: 0,
  networkErrors: 0,
  avgResponseTime: 0,
  requestCount: 0
};

function recordCacheHit(url, isStale = false) {
  if (isStale) {
    performanceMetrics.staleHits++;
  } else {
    performanceMetrics.cacheHits++;
  }
}

function recordCacheMiss(url) {
  performanceMetrics.cacheMisses++;
}

function recordNetworkError(url) {
  performanceMetrics.networkErrors++;
}

function recordResponseTime(duration) {
  performanceMetrics.requestCount++;
  performanceMetrics.avgResponseTime = 
    (performanceMetrics.avgResponseTime * (performanceMetrics.requestCount - 1) + duration) / 
    performanceMetrics.requestCount;
}

// 批次快取更新佇列 - 優化版本
let cacheUpdateQueue = [];
let cacheUpdateTimer = null;
const MAX_QUEUE_SIZE = 20;
const BATCH_DELAY = 150;

function queueCacheUpdate(cache, request, response) {
  // 防止佇列過大
  if (cacheUpdateQueue.length >= MAX_QUEUE_SIZE) {
    cacheUpdateQueue.shift(); // 移除最舊的項目
  }
  
  cacheUpdateQueue.push({ cache, request, response, timestamp: Date.now() });
  
  if (!cacheUpdateTimer) {
    cacheUpdateTimer = setTimeout(processCacheUpdates, BATCH_DELAY);
  }
}

async function processCacheUpdates() {
  const updates = cacheUpdateQueue.splice(0, 15); // 批次處理15個
  
  if (updates.length === 0) {
    cacheUpdateTimer = null;
    return;
  }
  
  const results = await Promise.allSettled(
    updates.map(async ({ cache, request, response }) => {
      try {
        await cache.put(request, response);
        return { success: true, url: request.url };
      } catch (error) {
        return { success: false, url: request.url, error };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  
  cacheUpdateTimer = null;
  
  // 如果還有待處理的項目，繼續處理
  if (cacheUpdateQueue.length > 0) {
    cacheUpdateTimer = setTimeout(processCacheUpdates, BATCH_DELAY);
  }
}

/**
 * 背景更新快取
 */
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // 背景更新失敗不影響主要流程
  }
}

/**
 * 清理舊的快取 - 優化版本
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, IMAGE_CACHE_NAME];
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      return caches.delete(cacheName);
    });
  
  const results = await Promise.allSettled(deletePromises);
  const deletedCount = results.filter(r => r.status === 'fulfilled').length;
  
  return results;
}

/**
 * 清理動態快取
 */
async function cleanupDynamicCache() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();
    
    // 保留最近 50 個請求
    if (requests.length > 50) {
      const toDelete = requests.slice(0, requests.length - 50);
      await Promise.all(toDelete.map(request => cache.delete(request)));
    }
  } catch (error) {
  }
}

/**
 * 判斷是否為靜態資源
 */
function isStaticResource(request) {
  const url = new URL(request.url);
  
  // PWA 核心檔案
  if (url.pathname.includes('/pwa-card-storage/')) {
    return url.pathname.endsWith('.html') ||
           url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.json');
  }
  
  // 共用資源
  if (url.pathname.includes('/assets/')) {
    return true;
  }
  
  // Google Fonts
  if (url.hostname === 'fonts.googleapis.com') {
    return true;
  }
  
  return false;
}

/**
 * 判斷是否為動態資源
 */
function isDynamicResource(request) {
  const url = new URL(request.url);
  
  return DYNAMIC_CACHE_PATTERNS.some(pattern => 
    pattern.test(request.url)
  );
}

/**
 * 判斷是否為 API 請求
 */
function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         url.pathname.includes('/api/');
}

/**
 * 背景同步事件
 */
self.addEventListener('sync', (event) => {
  
  if (event.tag === 'card-sync') {
    event.waitUntil(syncCards());
  } else if (event.tag === 'health-check') {
    event.waitUntil(performHealthCheck());
  }
});

/**
 * 推送通知事件
 */
self.addEventListener('push', (event) => {
  
  const options = {
    body: event.data ? event.data.text() : '您有新的名片更新',
    icon: `${BASE_PATH}/assets/moda-logo.svg`,
    badge: `${BASE_PATH}/assets/moda-logo.svg`,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看',
        icon: '/assets/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '關閉',
        icon: '/assets/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PWA 名片儲存', options)
  );
});

/**
 * 通知點擊事件
 */
self.addEventListener('notificationclick', (event) => {
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow(`${BASE_PATH}/pwa-card-storage/`)
    );
  }
});

/**
 * 同步名片資料（背景同步）
 */
async function syncCards() {
  try {
    
    // 這裡可以實作與伺服器同步的邏輯
    // 由於是純前端應用，這個功能暫時保留
    
  } catch (error) {
    console.error('[SW] Card sync failed:', error);
  }
}

/**
 * 執行健康檢查（背景同步）
 */
async function performHealthCheck() {
  try {
    
    // 檢查快取狀態
    const cacheNames = await caches.keys();
    const cacheStatus = {
      totalCaches: cacheNames.length,
      staticCacheExists: cacheNames.includes(STATIC_CACHE_NAME),
      dynamicCacheExists: cacheNames.includes(DYNAMIC_CACHE_NAME)
    };
    
    
    // 檢查儲存空間
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
    }
    
  } catch (error) {
    console.error('[SW] Health check failed:', error);
  }
}

/**
 * 訊息處理 - 增強版本
 */
self.addEventListener('message', (event) => {
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ 
          version: CACHE_NAME,
          timestamp: Date.now(),
          metrics: performanceMetrics
        });
        break;
        
      case 'GET_METRICS':
        event.ports[0].postMessage({
          metrics: performanceMetrics,
          cacheNames: [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, IMAGE_CACHE_NAME]
        });
        break;
        
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          // 重設效能指標
          performanceMetrics = {
            cacheHits: 0,
            cacheMisses: 0,
            staleHits: 0,
            networkErrors: 0,
            avgResponseTime: 0,
            requestCount: 0
          };
          event.ports[0].postMessage({ success: true });
        }).catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
        break;
        
      case 'FORCE_UPDATE':
        // 強制更新所有快取
        forceUpdateCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        }).catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
        break;
        
      default:
    }
  }
});

/**
 * 強制更新所有快取
 */
async function forceUpdateCaches() {
  
  // 清除現有快取
  await Promise.all([
    caches.delete(STATIC_CACHE_NAME),
    caches.delete(DYNAMIC_CACHE_NAME),
    caches.delete(IMAGE_CACHE_NAME)
  ]);
  
  // 重新快取靜態資源
  await cacheResourcesBatch(CORE_RESOURCES, STATIC_CACHE_NAME, '核心資源');
  await cacheResourcesBatch(STYLE_RESOURCES, STATIC_CACHE_NAME, '樣式資源');
  await cacheResourcesBatch(EXTERNAL_RESOURCES, STATIC_CACHE_NAME, '外部資源');
  await cacheResourcesBatch(FONT_RESOURCES, STATIC_CACHE_NAME, '字體資源', true);
  
}

/**
 * 添加安全標頭
 */
function addSecurityHeaders(response, request) {
  if (!response) {
    return new Response('Resource not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  
  const url = new URL(request.url);
  const headers = new Headers(response.headers);
  
  // HTML 文件添加 CSP 標頭
  if (url.pathname.endsWith('.html') || request.mode === 'navigate') {
    headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' https://unpkg.com 'unsafe-inline'; " +
      "style-src 'self' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    );
  }
  
  // 其他安全標頭
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * 清除所有快取
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
  return Promise.all(deletePromises);
}

/**
 * 錯誤處理
 */
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

// 定期報告效能指標
setInterval(() => {
  // Performance metrics collection removed for security
}, 5 * 60 * 1000); // 每5分鐘報告一次

