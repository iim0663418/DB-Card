/**
 * PWA 整合腳本
 * 為所有 9 個名片介面提供 PWA 儲存功能
 */

(function() {
    'use strict';
    
    // PWA 儲存功能
    function setupPWASaveButton(cardData) {
        const saveButton = document.getElementById('save-to-pwa-btn');
        if (!saveButton) return;
        
        saveButton.addEventListener('click', function() {
            // 檢查 PWA 是否可用
            if (window.location.protocol !== 'https:' && 
                window.location.hostname !== 'localhost' && 
                window.location.hostname !== '127.0.0.1') {
                alert('離線儲存功能需要 HTTPS 連線或本地環境');
                return;
            }
            
            // 獲取當前 URL 參數
            const urlParams = new URLSearchParams(window.location.search);
            const dataParam = urlParams.get('data') || urlParams.get('c');
            
            if (!dataParam) {
                alert('無法獲取名片資料');
                return;
            }
            
            // 構建 PWA URL（資料已經編碼過，不需要再次編碼）
            const pwaUrl = window.location.origin + '/pwa-card-storage/?c=' + dataParam;
            
            // 在新窗口開啟 PWA
            const pwaWindow = window.open(pwaUrl, '_blank');
            
            if (pwaWindow) {
                // 更新按鈕狀態
                const originalText = saveButton.textContent;
                const originalBg = saveButton.style.background;
                
                saveButton.textContent = '✅ 已開啟 PWA';
                saveButton.style.background = '#6c757d';
                saveButton.disabled = true;
                
                setTimeout(() => {
                    saveButton.textContent = originalText;
                    saveButton.style.background = originalBg;
                    saveButton.disabled = false;
                }, 3000);
            } else {
                alert('無法開啟 PWA，請檢查瀏覽器設定');
            }
        });
    }
    
    // 添加 PWA 儲存按鈕到頁面
    function addPWASaveButton() {
        // 尋找現有的下載按鈕
        const downloadBtn = document.getElementById('add-contact-btn');
        if (!downloadBtn) return;
        
        // 檢查是否已經添加過按鈕
        if (document.getElementById('save-to-pwa-btn')) return;
        
        // 創建 PWA 儲存按鈕
        const saveButton = document.createElement('button');
        saveButton.id = 'save-to-pwa-btn';
        saveButton.className = 'download-btn';
        saveButton.textContent = '💾 儲存到離線';
        saveButton.style.cssText = `
            background: #28a745; 
            border-color: #28a745; 
            margin-left: 10px;
            margin-top: 10px;
        `;
        
        // 在下載按鈕後插入
        downloadBtn.parentNode.insertBefore(saveButton, downloadBtn.nextSibling);
        
        return saveButton;
    }
    
    // 自動初始化
    function autoInit() {
        // 等待 DOM 載入完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoInit);
            return;
        }
        
        // 添加按鈕
        const saveButton = addPWASaveButton();
        if (!saveButton) return;
        
        // 等待名片資料載入
        let attempts = 0;
        const maxAttempts = 50; // 5 秒超時
        
        const checkForCardData = () => {
            attempts++;
            
            // 檢查是否有名片資料
            const urlParams = new URLSearchParams(window.location.search);
            const hasData = urlParams.get('data') || urlParams.get('c');
            
            if (hasData) {
                // 設定按鈕功能
                setupPWASaveButton();
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkForCardData, 100);
            } else {
                // 超時後隱藏按鈕
                saveButton.style.display = 'none';
            }
        };
        
        checkForCardData();
    }
    
    // 全域函數供手動調用
    window.PWAIntegration = {
        setupPWASaveButton: setupPWASaveButton,
        addPWASaveButton: addPWASaveButton,
        init: autoInit
    };
    
    // 自動初始化
    autoInit();
})();