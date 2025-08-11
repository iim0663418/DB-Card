// 簡化的 PWA 安裝功能
// 用戶期望：點選"儲存到桌面" → 桌面出現 icon → 點選 icon 直接開啟該名片

let deferredPrompt;
let installBtnShown = false;

// 監聽 PWA 安裝提示事件
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // 顯示安裝按鈕
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
        installBtn.style.display = 'inline-flex';
        installBtnShown = true;
    }
});

// 備用顯示邏輯：如果 beforeinstallprompt 沒有觸發，在頁面載入後顯示按鈕
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!installBtnShown) {
            const installBtn = document.getElementById('install-pwa-btn');
            if (installBtn) {
                // 檢查是否為支援 PWA 的環境
                const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
                const hasServiceWorker = 'serviceWorker' in navigator;
                
                if (isHTTPS && hasServiceWorker) {
                    installBtn.style.display = 'inline-flex';
                    installBtnShown = true;
                }
            }
        }
    }, 2000); // 等待 2 秒讓 beforeinstallprompt 有機會觸發
});

// 處理安裝按鈕點擊
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                // 如果沒有 deferredPrompt，提供手動安裝指引
                const userAgent = navigator.userAgent.toLowerCase();
                let instructions = '';
                
                if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
                    instructions = '請點擊瀏覽器右上角的三點選單 → 「安裝應用程式」或「新增至主畫面」';
                } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
                    instructions = '請點擊分享按鈕 → 「加入至主畫面」';
                } else if (userAgent.includes('firefox')) {
                    instructions = '請點擊位址欄旁的安裝圖示或選單 → 「安裝」';
                } else {
                    instructions = '請查看瀏覽器選單中的「安裝應用程式」或「加入至主畫面」選項';
                }
                
                alert(`PWA 安裝指引：\n\n${instructions}\n\n注意：需要 HTTPS 環境才能安裝 PWA`);
                return;
            }
            
            try {
                // 顯示安裝提示
                const result = await deferredPrompt.prompt();
                console.log('PWA install result:', result);
                
                // 清理
                deferredPrompt = null;
                installBtn.style.display = 'none';
                
                if (result.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
            } catch (error) {
                console.error('PWA installation failed:', error);
                alert('安裝失敗，請重試');
            }
        });
    }
});

// 註冊 Service Worker - 根據當前頁面動態選擇
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 獲取當前頁面文件名
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // 使用絕對路徑註冊 Service Worker，確保每個頁面都能正確註冊
        const swPath = './sw.js';
        
        navigator.serviceWorker.register(swPath, {
            scope: './' // 設定 Service Worker 的作用域為當前目錄
        })
            .then(registration => {
                console.log(`SW registered for ${currentPage}:`, registration);
                // 確保 Service Worker 知道當前頁面
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'PAGE_INFO',
                        page: currentPage
                    });
                }
            })
            .catch(error => {
                console.log(`SW registration failed for ${currentPage}:`, error);
            });
    });
}