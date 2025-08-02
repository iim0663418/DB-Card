/**
 * PWA 初始化和安裝提示處理
 * 從 index.html 移出以符合 CSP 安全政策
 */

// PWA 安裝和初始化
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
            })
            .catch(registrationError => {
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
                    document.getElementById('install-prompt').classList.add('hidden');
                });
            }
        });
    }

    if (installDismiss) {
        installDismiss.addEventListener('click', () => {
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }
};