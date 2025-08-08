/**
 * SW-02: Standardized Service Worker with Enhanced Cache Strategies
 * 
 * Implements standard PWA caching patterns:
 * - Cache First: Static resources (HTML, CSS, JS, images)
 * - Network First: Dynamic content with cache fallback
 * - Stale While Revalidate: Frequently updated resources
 * 
 * @version 3.2.0-standardized
 * @security Resource validation, storage quota management
 */

const CACHE_VERSION = 'pwa-card-storage-v3.2.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Storage quota limits (in bytes)
const STORAGE_QUOTA = {
    STATIC: 50 * 1024 * 1024,    // 50MB for static resources
    DYNAMIC: 25 * 1024 * 1024,   // 25MB for dynamic content
    RUNTIME: 10 * 1024 * 1024    // 10MB for runtime cache
};

/**
 * Simplified BASE_PATH detection for 5 platforms
 */
function getBasePath() {
    const { hostname, pathname } = self.location;
    
    // GitHub Pages: username.github.io/repo-name
    if (hostname.includes('.github.io')) {
        const pathParts = pathname.split('/').filter(Boolean);
        return pathParts.length > 1 ? `/${pathParts[0]}` : '';
    }
    
    // Cloudflare Pages: project.pages.dev
    if (hostname.includes('.pages.dev')) {
        return '';
    }
    
    // Netlify: project.netlify.app
    if (hostname.includes('.netlify.app')) {
        return '';
    }
    
    // Vercel: project.vercel.app
    if (hostname.includes('.vercel.app')) {
        return '';
    }
    
    // Local development: localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '';
    }
    
    // Default fallback
    return '';
}

const BASE_PATH = getBasePath();

/**
 * Enhanced core resources with validation
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
 * Resource classification for cache strategies
 */
const RESOURCE_PATTERNS = {
    STATIC: [
        /\.(html|css|js|json|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf)$/i,
        /\/pwa-card-storage\//,
        /\/assets\//
    ],
    DYNAMIC: [
        /\/api\//,
        /\/data\//,
        /\?/  // URLs with query parameters
    ],
    RUNTIME: [
        /\/cdn\./,
        /\/fonts\./,
        /\/images\./
    ]
};

/**
 * Install event - Enhanced caching with validation
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing standardized service worker');
    
    event.waitUntil(
        Promise.all([
            // Initialize static cache
            caches.open(STATIC_CACHE).then(async (cache) => {
                console.log('[SW] Caching core resources with validation');
                
                const cachePromises = CORE_RESOURCES.map(async (resource) => {
                    try {
                        const response = await fetch(resource);
                        if (response.ok) {
                            await validateResource(response.clone());
                            return cache.put(resource, response);
                        } else {
                            console.warn(`[SW] Failed to cache resource: ${resource}`);
                        }
                    } catch (error) {
                        console.warn(`[SW] Resource validation failed: ${resource}`, error);
                    }
                });
                
                return Promise.allSettled(cachePromises);
            }),
            
            // Initialize other caches
            caches.open(DYNAMIC_CACHE),
            caches.open(RUNTIME_CACHE),
            
            // Check storage quota
            checkStorageQuota()
            
        ]).then(() => {
            console.log('[SW] Installation completed with enhanced caching');
            return self.skipWaiting();
        }).catch(error => {
            console.error('[SW] Installation failed:', error);
            throw error;
        })
    );
});

/**
 * Activate event - Enhanced cache cleanup
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating standardized service worker');
    
    event.waitUntil(
        Promise.all([
            // Clean old caches with quota management
            cleanupOldCaches(),
            
            // Optimize cache storage
            optimizeCacheStorage(),
            
            // Take control of all pages
            self.clients.claim()
            
        ]).then(() => {
            console.log('[SW] Service worker activated with enhanced features');
            
            // Notify clients of successful activation
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_VERSION,
                        basePath: BASE_PATH,
                        features: ['enhanced-caching', 'quota-management', 'resource-validation']
                    });
                });
            });
        })
    );
});

/**
 * Fetch event - Standardized caching strategies
 */
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(handleRequestWithStrategy(event.request));
});

/**
 * Enhanced request handling with standardized strategies
 */
async function handleRequestWithStrategy(request) {
    const url = new URL(request.url);
    
    try {
        // Determine cache strategy based on resource type
        const strategy = getCacheStrategy(url);
        
        switch (strategy) {
            case 'cache-first':
                return await cacheFirstStrategy(request);
            case 'network-first':
                return await networkFirstStrategy(request);
            case 'stale-while-revalidate':
                return await staleWhileRevalidateStrategy(request);
            default:
                return await networkOnlyStrategy(request);
        }
        
    } catch (error) {
        console.error('[SW] Request handling failed:', error);
        return getEnhancedOfflineFallback(request);
    }
}

/**
 * Determine cache strategy based on resource patterns
 */
function getCacheStrategy(url) {
    const pathname = url.pathname.toLowerCase();
    
    // Static resources: Cache first
    if (RESOURCE_PATTERNS.STATIC.some(pattern => pattern.test(pathname))) {
        return 'cache-first';
    }
    
    // Dynamic content: Network first
    if (RESOURCE_PATTERNS.DYNAMIC.some(pattern => pattern.test(pathname))) {
        return 'network-first';
    }
    
    // Runtime resources: Stale while revalidate
    if (RESOURCE_PATTERNS.RUNTIME.some(pattern => pattern.test(pathname))) {
        return 'stale-while-revalidate';
    }
    
    // Default: Network first
    return 'network-first';
}

/**
 * Cache First Strategy - For static resources
 */
async function cacheFirstStrategy(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Validate cached resource integrity
        if (await validateCachedResource(cachedResponse.clone())) {
            return cachedResponse;
        } else {
            // Remove invalid cached resource
            await cache.delete(request);
        }
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        // Validate and cache successful responses
        await validateResource(networkResponse.clone());
        await cacheWithQuotaCheck(cache, request, networkResponse.clone(), 'STATIC');
    }
    
    return networkResponse;
}

/**
 * Network First Strategy - For dynamic content
 */
async function networkFirstStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses with quota check
            await cacheWithQuotaCheck(cache, request, networkResponse.clone(), 'DYNAMIC');
        }
        
        return networkResponse;
        
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse && await validateCachedResource(cachedResponse.clone())) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Stale While Revalidate Strategy - For runtime resources
 */
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Background fetch to update cache
    const fetchPromise = fetch(request).then(async (response) => {
        if (response.ok) {
            await cacheWithQuotaCheck(cache, request, response.clone(), 'RUNTIME');
        }
        return response;
    }).catch(error => {
        console.warn('[SW] Background fetch failed:', error);
    });
    
    // Return cached version immediately if available
    if (cachedResponse && await validateCachedResource(cachedResponse.clone())) {
        // Don't await the fetch promise - let it run in background
        fetchPromise;
        return cachedResponse;
    }
    
    // No cached version, wait for network
    return await fetchPromise;
}

/**
 * Network Only Strategy - For uncacheable resources
 */
async function networkOnlyStrategy(request) {
    return await fetch(request);
}

/**
 * Enhanced cache storage with quota management
 */
async function cacheWithQuotaCheck(cache, request, response, quotaType) {
    try {
        // Check current cache size
        const cacheSize = await getCacheSize(cache);
        const responseSize = await getResponseSize(response.clone());
        
        if (cacheSize + responseSize > STORAGE_QUOTA[quotaType]) {
            // Cleanup old entries to make space
            await cleanupCacheByLRU(cache, responseSize);
        }
        
        await cache.put(request, response);
        
    } catch (error) {
        console.warn('[SW] Cache storage failed:', error);
    }
}

/**
 * Resource validation for security
 */
async function validateResource(response) {
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    
    // Validate common resource types
    if (contentType.includes('text/html') || 
        contentType.includes('application/javascript') ||
        contentType.includes('text/css')) {
        
        const content = await response.text();
        
        // Basic security checks
        if (content.includes('<script>') && content.includes('eval(')) {
            throw new Error('Potentially unsafe script content detected');
        }
    }
    
    return true;
}

/**
 * Validate cached resource integrity
 */
async function validateCachedResource(response) {
    try {
        // Check if response is still valid
        const cacheControl = response.headers.get('cache-control');
        const expires = response.headers.get('expires');
        
        if (cacheControl && cacheControl.includes('no-cache')) {
            return false;
        }
        
        if (expires) {
            const expiryDate = new Date(expires);
            if (expiryDate < new Date()) {
                return false;
            }
        }
        
        return true;
        
    } catch (error) {
        console.warn('[SW] Cache validation failed:', error);
        return false;
    }
}

/**
 * Enhanced offline fallback
 */
function getEnhancedOfflineFallback(request) {
    // For navigation requests, return cached index.html
    if (request.mode === 'navigate') {
        return caches.open(STATIC_CACHE)
            .then(cache => cache.match(`${BASE_PATH}/pwa-card-storage/index.html`))
            .then(response => response || createOfflineResponse('text/html'));
    }
    
    // For API requests, return structured error
    if (request.url.includes('/api/')) {
        return createOfflineResponse('application/json', {
            error: 'Network unavailable',
            offline: true,
            timestamp: new Date().toISOString()
        });
    }
    
    // For other requests, return generic offline response
    return createOfflineResponse('text/plain', 'Network unavailable');
}

/**
 * Create offline response
 */
function createOfflineResponse(contentType, content = 'Offline') {
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
 * Storage quota management
 */
async function checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            const usedMB = Math.round(estimate.usage / 1024 / 1024);
            const quotaMB = Math.round(estimate.quota / 1024 / 1024);
            
            console.log(`[SW] Storage: ${usedMB}MB used of ${quotaMB}MB quota`);
            
            // Warn if storage is getting full
            if (estimate.usage / estimate.quota > 0.8) {
                console.warn('[SW] Storage quota is 80% full, consider cleanup');
                await optimizeCacheStorage();
            }
            
        } catch (error) {
            console.warn('[SW] Storage quota check failed:', error);
        }
    }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
        .filter(cacheName => 
            cacheName.startsWith('pwa-card-storage-') && 
            !cacheName.includes(CACHE_VERSION)
        )
        .map(cacheName => {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
        });
    
    return Promise.all(deletePromises);
}

/**
 * Optimize cache storage by removing old entries
 */
async function optimizeCacheStorage() {
    const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, RUNTIME_CACHE];
    
    for (const cacheName of cacheNames) {
        try {
            const cache = await caches.open(cacheName);
            await cleanupCacheByLRU(cache, 0, true);
        } catch (error) {
            console.warn(`[SW] Cache optimization failed for ${cacheName}:`, error);
        }
    }
}

/**
 * Cleanup cache using LRU (Least Recently Used) strategy
 */
async function cleanupCacheByLRU(cache, requiredSpace = 0, forceCleanup = false) {
    const requests = await cache.keys();
    
    if (requests.length === 0) return;
    
    // Sort by last access time (if available) or use FIFO
    const sortedRequests = requests.sort((a, b) => {
        // Simple FIFO cleanup - remove oldest entries first
        return a.url.localeCompare(b.url);
    });
    
    let freedSpace = 0;
    let deletedCount = 0;
    const maxDeletions = forceCleanup ? Math.floor(requests.length * 0.3) : Math.floor(requests.length * 0.1);
    
    for (const request of sortedRequests) {
        if (deletedCount >= maxDeletions && freedSpace >= requiredSpace) {
            break;
        }
        
        try {
            const response = await cache.match(request);
            if (response) {
                const size = await getResponseSize(response);
                await cache.delete(request);
                freedSpace += size;
                deletedCount++;
            }
        } catch (error) {
            console.warn('[SW] Failed to delete cache entry:', error);
        }
    }
    
    if (deletedCount > 0) {
        console.log(`[SW] Cleaned up ${deletedCount} cache entries, freed ${Math.round(freedSpace / 1024)}KB`);
    }
}

/**
 * Get cache size estimation
 */
async function getCacheSize(cache) {
    const requests = await cache.keys();
    let totalSize = 0;
    
    for (const request of requests.slice(0, 10)) { // Sample first 10 for estimation
        try {
            const response = await cache.match(request);
            if (response) {
                totalSize += await getResponseSize(response);
            }
        } catch (error) {
            // Ignore errors in size calculation
        }
    }
    
    // Estimate total size based on sample
    return Math.round(totalSize * requests.length / Math.min(10, requests.length));
}

/**
 * Get response size estimation
 */
async function getResponseSize(response) {
    try {
        const blob = await response.blob();
        return blob.size;
    } catch (error) {
        // Fallback estimation based on content length header
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 1024; // Default 1KB
    }
}

/**
 * Message handling with enhanced features
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
                    platform: getPlatformInfo(),
                    features: ['enhanced-caching', 'quota-management', 'resource-validation'],
                    cacheStrategies: ['cache-first', 'network-first', 'stale-while-revalidate']
                });
                break;
                
            case 'CLEAR_CACHE':
                clearAllCaches().then(() => {
                    event.ports[0].postMessage({ success: true });
                }).catch(error => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
                break;
                
            case 'GET_CACHE_STATUS':
                getCacheStatus().then(status => {
                    event.ports[0].postMessage({ success: true, status });
                }).catch(error => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
                break;
                
            case 'OPTIMIZE_STORAGE':
                optimizeCacheStorage().then(() => {
                    event.ports[0].postMessage({ success: true, message: 'Storage optimized' });
                }).catch(error => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
                break;
        }
    }
});

/**
 * Get comprehensive cache status
 */
async function getCacheStatus() {
    const cacheNames = await caches.keys();
    const status = {
        caches: {},
        totalSize: 0,
        quota: null
    };
    
    for (const cacheName of cacheNames) {
        if (cacheName.includes('pwa-card-storage')) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            const size = await getCacheSize(cache);
            
            status.caches[cacheName] = {
                entries: requests.length,
                estimatedSize: size
            };
            status.totalSize += size;
        }
    }
    
    // Get storage quota if available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            status.quota = await navigator.storage.estimate();
        } catch (error) {
            // Quota information not available
        }
    }
    
    return status;
}

/**
 * Get platform information
 */
function getPlatformInfo() {
    const { hostname } = self.location;
    
    if (hostname.includes('.github.io')) return 'GitHub Pages';
    if (hostname.includes('.pages.dev')) return 'Cloudflare Pages';
    if (hostname.includes('.netlify.app')) return 'Netlify';
    if (hostname.includes('.vercel.app')) return 'Vercel';
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'Local Development';
    
    return 'Unknown Platform';
}

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
 * Enhanced error handling
 */
self.addEventListener('error', (event) => {
    console.error('[SW] Service worker error:', event.error);
    
    // Report critical errors to clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_ERROR',
                error: event.error.message,
                timestamp: new Date().toISOString()
            });
        });
    });
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
    
    // Report unhandled rejections
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_UNHANDLED_REJECTION',
                reason: event.reason.toString(),
                timestamp: new Date().toISOString()
            });
        });
    });
});

console.log('[SW] Standardized Service Worker loaded successfully');
console.log('[SW] Platform:', getPlatformInfo());
console.log('[SW] Base Path:', BASE_PATH);
console.log('[SW] Cache Strategies: Cache-First, Network-First, Stale-While-Revalidate');
console.log('[SW] Features: Enhanced caching, quota management, resource validation');
