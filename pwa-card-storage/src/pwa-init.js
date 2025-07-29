/**
 * PWA 初始化和安裝提示處理
 * 從 index.html 移出以符合 CSP 安全政策
 */

// PWA 安裝和初始化
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// PWA 安裝提示
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-prompt').classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
    // 安裝按鈕事件處理
    document.getElementById('install-button').addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                deferredPrompt = null;
                document.getElementById('install-prompt').classList.add('hidden');
            });
        }
    });

    // 關閉安裝提示按鈕事件處理
    document.getElementById('install-dismiss').addEventListener('click', () => {
        document.getElementById('install-prompt').classList.add('hidden');
    });
});