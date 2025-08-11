const CACHE_NAME = 'nfc-card-v2';
let currentPage = 'index.html'; // 預設頁面

// 基本資源緩存列表
const urlsToCache = [
  './assets/moda-logo.svg',
  './assets/images/moda-logo.svg',
  './assets/high-accessibility.css',
  './assets/qrcode.min.js',
  './assets/qrcode-style.css',
  './assets/pwa-install.js'
];

// 監聽來自頁面的消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PAGE_INFO') {
    currentPage = event.data.page;
    console.log('Service Worker received page info:', currentPage);
  }
});

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching resources...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting(); // 立即激活新的 Service Worker
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim(); // 立即控制所有客戶端
    })
  );
});

self.addEventListener('fetch', event => {
  // 只處理同源請求
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request).then(response => {
          // 檢查是否為有效響應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 克隆響應以便緩存
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        // 如果是 HTML 請求且網絡失敗，返回離線頁面
        if (event.request.destination === 'document') {
          return new Response(
            '<!DOCTYPE html><html><head><title>離線模式</title></head><body><h1>目前處於離線模式</h1><p>請檢查網絡連接後重試。</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        throw error;
      })
  );
});