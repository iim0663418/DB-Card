/**
 * PWA 初始化和安裝提示處理
 * 從 index.html 移出以符合 CSP 安全政策
 */

// PWA 支援檢查
const isPWASupported = 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;

// 動態修正 manifest.json 路徑（使用 Service Worker 方式）
function fixManifestPaths() {
    const currentPath = window.location.pathname;
    const isGitHubPages = window.location.hostname.includes('.github.io');
    
    if (isGitHubPages && currentPath.includes('/DB-Card/')) {
        // 為 GitHub Pages 設定環境變數
        window.GITHUB_PAGES_BASE_PATH = '/DB-Card/pwa-card-storage';
        
        // 更新 manifest 連結為 GitHub Pages 版本
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            manifestLink.href = './manifest-github.json';
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
    
    // Settings Button 重置網址功能
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            // 清除 URL 參數，重置為首頁
            const currentUrl = new URL(window.location);
            currentUrl.search = '';
            currentUrl.hash = '';
            window.history.replaceState({}, '', currentUrl.toString());
        });
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