/**
 * PWA 初始化和安裝提示處理
 * 從 index.html 移出以符合 CSP 安全政策
 */

// PWA 支援檢查
const isPWASupported = 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;

// 動態修正 manifest.json 路徑
function fixManifestPaths() {
    const currentPath = window.location.pathname;
    const isGitHubPages = window.location.hostname.includes('.github.io');
    const isCloudflarePages = window.location.hostname.includes('.pages.dev');
    
    if (isGitHubPages && currentPath.includes('/DB-Card/')) {
        // GitHub Pages 需要完整路徑
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            // 動態生成正確的 manifest 內容
            fetch('./manifest.json')
                .then(response => response.json())
                .then(manifest => {
                    const basePath = '/DB-Card/pwa-card-storage';
                    manifest.start_url = basePath + '/';
                    manifest.scope = basePath + '/';
                    manifest.id = basePath + '/';
                    
                    // 更新 shortcuts
                    manifest.shortcuts.forEach(shortcut => {
                        shortcut.url = shortcut.url.replace('./', basePath + '/');
                    });
                    
                    // 更新其他 URL
                    manifest.protocol_handlers[0].url = manifest.protocol_handlers[0].url.replace('./', basePath + '/');
                    manifest.share_target.action = basePath + '/';
                    manifest.file_handlers[0].action = manifest.file_handlers[0].action.replace('./', basePath + '/');
                    
                    // 創建新的 manifest blob
                    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
                    const manifestUrl = URL.createObjectURL(manifestBlob);
                    manifestLink.href = manifestUrl;
                })
                .catch(() => {});
        }
    }
}

// 在頁面載入時修正路徑
fixManifestPaths();

// Service Worker 註冊
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// PWA 安裝提示
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // 確保 manifest 路徑已修正
    setTimeout(() => {
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) {
            installPrompt.classList.remove('hidden');
        }
    }, 100);
});

// 立即載入應用版本
window.addEventListener('DOMContentLoaded', async () => {
    const appVersionEl = document.getElementById('app-version');
    if (appVersionEl) {
        try {
            const response = await fetch('./manifest.json');
            const manifest = await response.json();
            appVersionEl.textContent = `v${manifest.version}`;
        } catch (error) {
            appVersionEl.textContent = '無法取得';
        }
    }
});

// PWA 安裝按鈕初始化函數，由 app.js 調用
window.initPWAInstallButtons = function() {
    const installButton = document.getElementById('install-button');
    const installDismiss = document.getElementById('install-dismiss');
    
    if (installButton) {
        installButton.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    deferredPrompt = null;
                    const installPrompt = document.getElementById('install-prompt');
                    if (installPrompt) {
                        installPrompt.classList.add('hidden');
                    }
                });
            }
        });
    }

    if (installDismiss) {
        installDismiss.addEventListener('click', () => {
            const installPrompt = document.getElementById('install-prompt');
            if (installPrompt) {
                installPrompt.classList.add('hidden');
            }
        });
    }
    
    // 檢查是否已安裝
    if (window.matchMedia('(display-mode: standalone)').matches) {
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) {
            installPrompt.classList.add('hidden');
        }
    }
};