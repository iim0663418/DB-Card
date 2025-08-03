/**
 * PWA 初始化和安裝提示處理
 * 從 index.html 移出以符合 CSP 安全政策
 */

// PWA 支援檢查
const isPWASupported = 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;

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
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt) {
        installPrompt.classList.remove('hidden');
    }
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