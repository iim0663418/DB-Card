/**
 * PWA 整合模組 - URL 暫存與類型識別
 * 解決名片頁面跳轉到 PWA 後 URL 識別問題
 */

class PWAIntegration {
  constructor() {
    this.STORAGE_KEY = 'pwa_card_source_url';
    this.STORAGE_EXPIRY = 5 * 60 * 1000; // 5分鐘過期
  }

  /**
   * 在名片頁面觸發儲存時暫存原始 URL
   */
  storeSourceUrl() {
    const sourceData = {
      url: window.location.href,
      timestamp: Date.now(),
      referrer: document.referrer
    };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sourceData));
      console.log('[PWA] 暫存來源 URL:', sourceData.url);
    } catch (error) {
      console.warn('[PWA] 無法暫存來源 URL:', error);
    }
  }

  /**
   * 在 PWA 中獲取暫存的原始 URL
   */
  getSourceUrl() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const sourceData = JSON.parse(stored);
      
      // 檢查是否過期
      if (Date.now() - sourceData.timestamp > this.STORAGE_EXPIRY) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      return sourceData.url;
    } catch (error) {
      console.warn('[PWA] 無法讀取來源 URL:', error);
      return null;
    }
  }

  /**
   * 清除暫存的 URL（使用後清理）
   */
  clearSourceUrl() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('[PWA] 無法清除來源 URL:', error);
    }
  }

  /**
   * 根據暫存的 URL 識別名片類型
   */
  identifyCardTypeFromSource() {
    const sourceUrl = this.getSourceUrl();
    if (!sourceUrl) return null;

    const url = sourceUrl.toLowerCase().trim();
    console.log('[PWA] 使用暫存 URL 識別類型:', url);

    // 精確匹配名片類型
    if (url.includes('index-bilingual-personal.html')) return 'personal-bilingual';
    if (url.includes('index1-bilingual.html')) return 'bilingual1';
    if (url.includes('index-bilingual.html')) return 'bilingual';
    if (url.includes('index-personal-en.html')) return 'personal-en';
    if (url.includes('index1-en.html')) return 'en1';
    if (url.includes('index-en.html')) return 'en';
    if (url.includes('index-personal.html')) return 'personal';
    if (url.includes('index1.html')) return 'index1';
    if (url.includes('index.html')) return 'index';

    return null;
  }
}

// 全域實例
window.pwaIntegration = new PWAIntegration();

// 自動檢測並暫存 URL（在名片頁面）
if (window.location.pathname.includes('index') && 
    !window.location.pathname.includes('pwa-card-storage')) {
  
  // 監聽 PWA 儲存按鈕點擊
  document.addEventListener('DOMContentLoaded', () => {
    // 查找所有可能的儲存按鈕
    const storageButtons = document.querySelectorAll('[onclick*="pwa"], [data-action="store"], .pwa-store-btn');
    
    storageButtons.forEach(button => {
      button.addEventListener('click', () => {
        window.pwaIntegration.storeSourceUrl();
      });
    });

    // 監聽 PWA 相關的連結點擊
    const pwaLinks = document.querySelectorAll('a[href*="pwa-card-storage"]');
    pwaLinks.forEach(link => {
      link.addEventListener('click', () => {
        window.pwaIntegration.storeSourceUrl();
      });
    });
  });
}