/**
 * 統一移動端管理器
 * 整合所有移動端優化功能
 */

class UnifiedMobileManager {
  constructor() {
    this.isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 768;
    this.init();
  }

  init() {
    // Mobile 優化已暫時停用以進行偵錯
    console.log('[Mobile] Manager disabled for debugging');
    return;
  }

  applyMobileStyles() {
    const style = document.createElement('style');
    style.id = 'unified-mobile-styles';
    style.textContent = `
      /* 統一移動端樣式 */
      @media screen and (max-width: 768px) {
        /* 觸控優化 */
        .btn, .nav-item, .action-card, .card-item {
          min-height: 48px;
          min-width: 48px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        /* Settings Button 專門修復 */
        #settings-button {
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: rgba(104, 104, 172, 0.3) !important;
          cursor: pointer !important;
          position: relative !important;
          z-index: 1000 !important;
          min-width: 48px !important;
          min-height: 48px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        #settings-button .icon {
          pointer-events: none;
          user-select: none;
        }
        
        /* 統計卡片優化 */
        .stat-card {
          touch-action: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        .stat-card .stat-number,
        .stat-card .stat-label {
          pointer-events: none;
          user-select: none;
        }
        
        /* 文字處理 */
        .card-item .card-name,
        .card-item .card-title,
        .card-item .card-department,
        .card-item .card-email,
        .card-item .card-phone {
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
          white-space: normal;
        }
        
        /* 安全區域支援 */
        .app-header {
          padding-top: max(1.25rem, env(safe-area-inset-top, 0px));
        }
        
        .app-footer {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px));
        }
      }
    `;
    document.head.appendChild(style);
  }

  fixTouchTargets() {
    // Settings Button 特殊處理
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
      this.enhanceButton(settingsButton);
    }

    // 其他按鈕
    document.querySelectorAll('.btn, .btn-icon, .nav-item').forEach(button => {
      this.enhanceButton(button);
    });
  }

  enhanceButton(button) {
    button.style.touchAction = 'manipulation';
    button.style.webkitTapHighlightColor = 'rgba(104, 104, 172, 0.2)';
    
    // 確保最小觸控尺寸
    if (button.offsetWidth < 44 || button.offsetHeight < 44) {
      button.style.minWidth = '44px';
      button.style.minHeight = '44px';
    }

    // 觸控回饋
    button.addEventListener('touchstart', (e) => {
      e.currentTarget.style.opacity = '0.7';
    }, { passive: true });

    button.addEventListener('touchend', (e) => {
      setTimeout(() => {
        e.currentTarget.style.opacity = '';
      }, 150);
    }, { passive: true });
  }

  setupEventHandlers() {
    // Settings Button 增強事件處理 - 避免重複綁定
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton && window.app && !settingsButton.dataset.mobileHandlerAdded) {
      const homeHandler = (e) => {
        try {
          e.preventDefault();
          e.stopPropagation();
          window.app.navigateTo('home');
        } catch (error) {
          console.error('[Mobile] Settings button handler failed:', error);
        }
      };
      
      // 只在 mobile 端添加 touchend，避免與 click 衝突
      if (this.isMobile) {
        settingsButton.addEventListener('touchend', homeHandler, { passive: false });
      }
      
      settingsButton.dataset.mobileHandlerAdded = 'true';
    }
  }

  preventDoubleClick() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  // 診斷方法
  diagnose() {
    const settingsButton = document.getElementById('settings-button');
    return {
      isMobile: this.isMobile,
      settingsButton: {
        exists: !!settingsButton,
        touchAction: settingsButton ? getComputedStyle(settingsButton).touchAction : null,
        zIndex: settingsButton ? getComputedStyle(settingsButton).zIndex : null
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }
}

// 全域實例
window.unifiedMobileManager = new UnifiedMobileManager();
window.diagnoseMobile = () => window.unifiedMobileManager.diagnose();