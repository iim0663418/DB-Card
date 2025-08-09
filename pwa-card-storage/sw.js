/**
 * DEPLOY-02: Simplified Service Worker for Static Hosting Compatibility
 * 
 * Simplified architecture with:
 * - Fixed path configuration per platform
 * - Basic cache strategies (cache-first, network-first)
 * - Essential security controls
 * - High registration success rate (≥95%)
 * 
 * @version 3.2.1-simplified
 * @security Origin policy checks, secure caching, resource access control
 */

const CACHE_VERSION = 'pwa-card-storage-v3.2.1-simplified';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

/**
 * Simplified environment detection with fixed paths
 * Supports 5 static hosting platforms
 */
function getBasePath() {
    const hostname = location.hostname;
    
    // GitHub Pages: Fixed path
    if (hostname.includes('.github.io')) {
        return '/DB-Card';
    }
    
    // Cloudflare Pages: Root path
    if (hostname.includes('.pages.dev')) {
        return '';
    }
    
    // Netlify: Root path
    if (hostname.includes('.netlify.app')) {
        return '';
    }
    
    // Vercel: Root path
    if (hostname.includes('.vercel.app')) {
        return '';
    }
    
    // Firebase Hosting: Root path
    if (hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')) {
        return '';
    }
    
    // Local development: Root path
    return '';
}

const BASE_PATH = getBasePath();

/**
 * Core resources for static caching
 */
const CORE_RESOURCES = [
    `${BASE_PATH}/pwa-card-storage/`,
    `${BASE_PATH}/pwa-card-storage/index.html`,
    `${BASE_PATH}/pwa-card-storage/manifest.json`,
    `${BASE_PATH}/pwa-card-storage/src/app.js`,
    `${BASE_PATH}/pwa-card-storage/assets/styles/main.css`,
    `${BASE_PATH}/pwa-card-storage/assets/styles/components.css`,
    `${BASE_PATH}/pwa-card-storage/assets/scripts/bilingual-common.js`,
    `${BASE_PATH}/pwa-card-storage/assets/scripts/qrcode.min.js`,
    `${BASE_PATH}/pwa-card-storage/assets/images/moda-logo.svg`
];

/**
 * Fixed cache strategies
 */
const CACHE_STRATEGIES = {
    static: 'cache-first',
    dynamic: 'network-first',
    images: 'cache-first'
};

/**
 * Simple resource classification
 */
function getResourceType(url) {
    const pathname = url.pathname.toLowerCase();
    
    // Static resources
    if (pathname.match(/\.(html|css|js|json|svg|woff|woff2|ttf)$/)) {
        return 'static';
    }
    
    // Images
    if (pathname.match(/\.(png|jpg|jpeg|gif|ico|webp)$/)) {
        return 'images';
    }
    
    // Dynamic content (API, data, query params)
    if (pathname.includes('/api/') || pathname.includes('/data/') || url.search) {
        return 'dynamic';
    }
    
    // Default to static
    return 'static';
}

/**
 * Install event - Simple caching
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing simplified service worker');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching core resources');
                return cache.addAll(CORE_RESOURCES.filter(url => url)); // Filter out empty URLs
            })
            .then(() => {
                console.log('[SW] Installation completed');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Installation failed:', error);
                // Don't throw - allow SW to install even if some resources fail
                return self.skipWaiting();
            })
    );
});

/**
 * Activate event - Simple cleanup
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating simplified service worker');
    
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => 
                            cacheName.startsWith('pwa-card-storage-') && 
                            !cacheName.includes(CACHE_VERSION)
                        )
                        .map(cacheName => {
                            console.log(`[SW] Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        })
                );
            }),
            
            // Take control of all pages
            self.clients.claim()
        ])
        .then(() => {
            console.log('[SW] Service worker activated');
            
            // Notify clients
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_VERSION,
                        basePath: BASE_PATH,
                        platform: getPlatform()
                    });
                });
            });
        })
        .catch(error => {
            console.error('[SW] Activation failed:', error);
            // Don't throw - allow activation to complete
        })
    );
});

/**
 * Fetch event - Simple strategy routing
 */
self.addEventListener('fetch', (event) => {
    // Only handle GET requests from same origin
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
        return;
    }
    
    // Origin policy check
    if (!isSameOrigin(event.request.url)) {
        return;
    }
    
    event.respondWith(handleRequest(event.request));
});

/**
 * Simple request handling with fixed strategies
 */
async function handleRequest(request) {
    const url = new URL(request.url);
    const resourceType = getResourceType(url);
    const strategy = CACHE_STRATEGIES[resourceType] || 'network-first';
    
    try {
        switch (strategy) {
            case 'cache-first':
                return await cacheFirstStrategy(request);
            case 'network-first':
                return await networkFirstStrategy(request);
            default:
                return await fetch(request);
        }
    } catch (error) {
        console.warn('[SW] Request failed:', error);
        return getOfflineFallback(request);
    }
}

/**
 * Cache First Strategy - For static resources
 */
async function cacheFirstStrategy(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Fetch from network and cache
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        throw error;
    }
}

/**
 * Network First Strategy - For dynamic content
 */
async function networkFirstStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

/**
 * Simple offline fallback
 */
function getOfflineFallback(request) {
    // For navigation requests, return cached index.html
    if (request.mode === 'navigate') {
        return caches.open(STATIC_CACHE)
            .then(cache => cache.match(`${BASE_PATH}/pwa-card-storage/index.html`))
            .then(response => response || createOfflineResponse());
    }
    
    // For API requests, return structured error
    if (request.url.includes('/api/')) {
        return createOfflineResponse('application/json', {
            error: 'Network unavailable',
            offline: true
        });
    }
    
    // Default offline response
    return createOfflineResponse();
}

/**
 * Create simple offline response
 */
function createOfflineResponse(contentType = 'text/html', content = 'Network unavailable') {
    const body = typeof content === 'object' ? JSON.stringify(content) : content;
    
    return new Response(body, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': `${contentType}; charset=utf-8`,
            'Cache-Control': 'no-cache'
        }
    });
}

/**
 * Origin policy check for security
 */
function isSameOrigin(url) {
    try {
        const requestOrigin = new URL(url).origin;
        const swOrigin = new URL(self.location).origin;
        return requestOrigin === swOrigin;
    } catch (error) {
        return false;
    }
}

/**
 * Get platform information
 */
function getPlatform() {
    const hostname = location.hostname;
    
    if (hostname.includes('.github.io')) return 'GitHub Pages';
    if (hostname.includes('.pages.dev')) return 'Cloudflare Pages';
    if (hostname.includes('.netlify.app')) return 'Netlify';
    if (hostname.includes('.vercel.app')) return 'Vercel';
    if (hostname.includes('.web.app') || hostname.includes('.firebaseapp.com')) return 'Firebase';
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'Local';
    
    return 'Unknown';
}

/**
 * Message handling
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'GET_VERSION':
                event.ports[0].postMessage({
                    version: CACHE_VERSION,
                    basePath: BASE_PATH,
                    platform: getPlatform(),
                    strategies: Object.keys(CACHE_STRATEGIES)
                });
                break;
                
            case 'CLEAR_CACHE':
                clearAllCaches().then(() => {
                    event.ports[0].postMessage({ success: true });
                }).catch(error => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
                break;
        }
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
        .filter(cacheName => cacheName.includes('pwa-card-storage'))
        .map(cacheName => caches.delete(cacheName));
    return Promise.all(deletePromises);
}

/**
 * Error handling
 */
self.addEventListener('error', (event) => {
    console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
    // Don't prevent default - let the error be handled normally
});

console.log('[SW] Simplified Service Worker loaded');
console.log('[SW] Platform:', getPlatform());
console.log('[SW] Base Path:', BASE_PATH);
console.log('[SW] Cache Strategies:', CACHE_STRATEGIES);