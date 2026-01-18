/**
 * 統一移動端管理器
 * 整合移動端行為優化，不修改樣式
 */

class UnifiedMobileManager {
  constructor() {
    this.isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 768;
    this.isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isAndroid = /Android/i.test(navigator.userAgent);
    
    if (this.isMobile) {
      this.init();
    }
  }

  init() {
    this.setupTouchOptimization();
    this.setupViewportFix();
    this.setupKeyboardHandling();
    this.setupScrollOptimization();
    this.preventDoubleClick();
    
    if (this.isSafari) {
      this.setupSafariOptimization();
    }
    
    console.log('[Mobile] Manager initialized for', this.getDeviceInfo());
  }

  setupTouchOptimization() {
    try {
      const touchElements = document.querySelectorAll('.btn, .nav-item, .action-card, .card-item');
      touchElements.forEach(element => {
        if (element && element.style) {
          element.style.webkitTapHighlightColor = 'rgba(104, 104, 172, 0.2)';
          element.style.webkitTouchCallout = 'none';
          element.style.touchAction = 'manipulation';
          
          const rect = element.getBoundingClientRect();
          if (rect.width < 48 || rect.height < 48) {
            element.style.minWidth = '48px';
            element.style.minHeight = '48px';
          }
        }
      });
      
      // Settings button 特殊處理
      const settingsButton = document.getElementById('settings-button');
      if (settingsButton) {
        this.enhanceButton(settingsButton);
      }
    } catch (error) {
      console.warn('[Mobile] Touch optimization setup failed:', error);
    }
  }

  setupViewportFix() {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });
  }

  enhanceButton(button) {
    if (!button || !button.style) {
      console.warn('[Mobile] Invalid button element provided to enhanceButton');
      return;
    }
    
    try {
      button.style.touchAction = 'manipulation';
      button.style.webkitTapHighlightColor = 'rgba(104, 104, 172, 0.2)';
      
      // 確保最小觸控尺寸
      if (button.offsetWidth < 44 || button.offsetHeight < 44) {
        button.style.minWidth = '44px';
        button.style.minHeight = '44px';
      }
    } catch (error) {
      console.warn('[Mobile] Button enhancement failed:', error);
      return;
    }

    // 觸控回饋
    button.addEventListener('touchstart', (e) => {
      if (e.currentTarget && e.currentTarget.style) {
        e.currentTarget.style.opacity = '0.7';
      }
    }, { passive: true });

    button.addEventListener('touchend', (e) => {
      setTimeout(() => {
        if (e.currentTarget && e.currentTarget.style) {
          e.currentTarget.style.opacity = '';
        }
      }, 150);
    }, { passive: true });
  }

  setupKeyboardHandling() {
    let initialViewportHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      if (heightDifference > 150) {
        document.documentElement.classList.add('keyboard-open');
      } else {
        document.documentElement.classList.remove('keyboard-open');
      }
    });
    
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => {
          const rect = input.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          
          if (!isVisible) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      });
    });
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

  setupScrollOptimization() {
    const scrollElements = document.querySelectorAll('.main-content, .cards-list, .modal-content');
    scrollElements.forEach(element => {
      element.style.webkitOverflowScrolling = 'touch';
      element.style.overscrollBehavior = 'contain';
    });
    
    document.body.addEventListener('touchmove', (e) => {
      if (e.target === document.body) {
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  setupSafariOptimization() {
    document.body.style.webkitFontSmoothing = 'antialiased';
    
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.style.fontSize = '16px';
      input.style.webkitTextSizeAdjust = '100%';
    });
  }
  
  getDeviceInfo() {
    return {
      isMobile: this.isMobile,
      isSafari: this.isSafari,
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  }
  
  diagnose() {
    const settingsButton = document.getElementById('settings-button');
    return {
      ...this.getDeviceInfo(),
      settingsButton: {
        exists: !!settingsButton,
        touchAction: settingsButton ? getComputedStyle(settingsButton).touchAction : null
      }
    };
  }
}

// 全域實例
window.unifiedMobileManager = new UnifiedMobileManager();
window.diagnoseMobile = () => window.unifiedMobileManager.diagnose();