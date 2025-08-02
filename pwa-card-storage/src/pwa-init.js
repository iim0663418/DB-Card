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

// 延遲初始化安裝按鈕事件，避免與 app.js 衝突
setTimeout(() => {
    const installButton = document.getElementById('install-button');
    const installDismiss = document.getElementById('install-dismiss');
    
    if (installButton && !installButton.hasAttribute('data-initialized')) {
        installButton.setAttribute('data-initialized', 'true');
        installButton.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                    }
                    deferredPrompt = null;
                    document.getElementById('install-prompt').classList.add('hidden');
                });
            }
        });
    }

    if (installDismiss && !installDismiss.hasAttribute('data-initialized')) {
        installDismiss.setAttribute('data-initialized', 'true');
        installDismiss.addEventListener('click', () => {
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }
}, 100);