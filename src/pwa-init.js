/**
 * PWA 初始化和安裝提示處理
 * 從 index.html 移出以符合 CSP 安全政策
 */

// PWA 支援檢查
const isPWASupported = 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;

// Manifest 管理已由 unified-manifest-manager.js 處理

// Service Worker 註冊 - 僅在 PWA 環境中
if ('serviceWorker' in navigator && window.location.pathname.includes('/pwa-card-storage/')) {
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

// 版本顯示已由 unified-manifest-manager.js 處理
// Settings Button 事件處理已移至 app.js 統一管理，避免重複綁定

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