/**
 * 統一 Mobile 優化器
 * 整合 Safari 和通用 Mobile 優化功能，避免重複腳本
 */

class UnifiedMobileOptimizer {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isSafari = this.detectSafari();
    this.isIOS = this.detectIOS();
    this.isAndroid = this.detectAndroid();
    this.isStandalone = this.detectStandalone();
    this.viewportHeight = window.innerHeight;
    this.orientation = this.getOrientation();
    
    if (this.isMobile) {
      this.init();
    }
  }
  
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }
  
  detectSafari() {
    return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  }
  
  detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  
  detectAndroid() {
    return /Android/i.test(navigator.userAgent);
  }
  
  detectStandalone() {
    return window.navigator.standalone === true || 
           window.matchMedia('(display-mode: standalone)').matches;
  }
  
  getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }
  
  init() {
    this.setupViewportFix();
    this.setupSafeAreaSupport();
    this.setupTouchOptimization();
    this.setupScrollOptimization();
    this.setupKeyboardHandling();
    this.setupOrientationHandling();
    this.setupPerformanceOptimization();
    
    // Safari 特定優化
    if (this.isSafari) {
      this.setupSafariSpecific();
    }
    
    // Android 特定優化
    if (this.isAndroid) {
      this.setupAndroidSpecific();
    }
    
    console.log('[Unified Mobile] Optimizer initialized:', this.getStatus());
  }
  
  setupViewportFix() {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.style.minHeight = `calc(var(--vh, 1vh) * 100)`;
      }
    };
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });
  }
  
  setupSafeAreaSupport() {
    if (this.isIOS && this.isStandalone) {
      document.documentElement.classList.add('ios-standalone');
      
      // 檢測 notch
      if (window.screen.height === 812 || window.screen.height === 896 || 
          window.screen.height === 844 || window.screen.height === 926) {
        document.documentElement.classList.add('has-notch');
      }
    }
  }
  
  setupTouchOptimization() {
    const touchElements = document.querySelectorAll('.btn, .nav-item, .action-card, .card-item');
    touchElements.forEach(element => {
      element.style.webkitTapHighlightColor = 'rgba(104, 104, 172, 0.2)';
      element.style.webkitTouchCallout = 'none';
      element.style.webkitUserSelect = 'none';
      element.style.userSelect = 'none';
      
      const rect = element.getBoundingClientRect();
      if (rect.width < 48 || rect.height < 48) {
        element.style.minWidth = '48px';
        element.style.minHeight = '48px';
      }
    });
    
    // 防止雙擊縮放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
    
    if (this.isIOS) {
      document.addEventListener('touchstart', () => {}, { passive: true });
    }
  }
  
  setupScrollOptimization() {
    const scrollElements = document.querySelectorAll('.app-nav, .modal-content, .cards-list, .main-content');
    scrollElements.forEach(element => {
      element.style.webkitOverflowScrolling = 'touch';
      element.style.scrollBehavior = 'smooth';
      element.style.overscrollBehavior = 'contain';
    });
    
    document.body.addEventListener('touchmove', (e) => {
      if (e.target === document.body) {
        e.preventDefault();
      }
    }, { passive: false });
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
            input.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 300);
      });
    });
  }
  
  setupOrientationHandling() {
    const handleOrientationChange = () => {
      setTimeout(() => {
        this.orientation = this.getOrientation();
        this.setupViewportFix();
        this.adjustLayoutForOrientation();
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    screen.orientation?.addEventListener('change', handleOrientationChange);
  }
  
  adjustLayoutForOrientation() {
    const isLandscape = this.orientation === 'landscape';
    const isSmallScreen = window.innerHeight < 500;
    
    if (isLandscape && isSmallScreen) {
      document.documentElement.classList.add('mobile-landscape-compact');
    } else {
      document.documentElement.classList.remove('mobile-landscape-compact');
    }
  }
  
  setupPerformanceOptimization() {
    // 硬體加速
    const acceleratedElements = document.querySelectorAll('.action-card, .card-item, .btn, .modal-content, .notification');
    acceleratedElements.forEach(element => {
      element.style.transform = 'translateZ(0)';
      element.style.backfaceVisibility = 'hidden';
    });
    
    // 滾動節流
    let lastScrollTime = 0;
    window.addEventListener('scroll', () => {
      const now = Date.now();
      if (now - lastScrollTime > 16) {
        lastScrollTime = now;
        this.optimizeVisibleElements();
      }
    }, { passive: true });
    
    // 記憶體管理
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.cleanupResources();
      } else {
        this.restoreResources();
      }
    });
  }
  
  // Safari 特定優化
  setupSafariSpecific() {
    // Safari 字體渲染
    document.body.style.webkitFontSmoothing = 'antialiased';
    document.body.style.mozOsxFontSmoothing = 'grayscale';
    
    // Safari 輸入框縮放防止
    const inputs = document.querySelectorAll('.search-input, .url-input, .file-input, .filter-select');
    inputs.forEach(input => {
      input.style.fontSize = '16px';
      input.style.webkitTextSizeAdjust = '100%';
    });
    
    // Safari 滾動條樣式
    if (window.innerWidth >= 1024) {
      const style = document.createElement('style');
      style.textContent = `
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--md-neutral-10); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--md-neutral-8); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--md-neutral-7); }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Android 特定優化
  setupAndroidSpecific() {
    // Android Chrome 地址欄處理
    const actualHeight = window.innerHeight;
    const expectedHeight = screen.height;
    const addressBarHeight = expectedHeight - actualHeight;
    
    if (addressBarHeight > 0) {
      document.documentElement.style.setProperty('--address-bar-height', `${addressBarHeight}px`);
    }
    
    // Android 輸入框優化
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.style.transform = 'none';
      });
    });
  }
  
  optimizeVisibleElements() {
    const cards = document.querySelectorAll('.card-item');
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    
    cards.forEach(card => {
      const cardTop = card.offsetTop;
      const cardBottom = cardTop + card.offsetHeight;
      
      if (cardBottom < viewportTop - 200 || cardTop > viewportBottom + 200) {
        card.style.willChange = 'auto';
      } else {
        card.style.willChange = 'transform';
      }
    });
  }
  
  cleanupResources() {
    const animations = document.querySelectorAll('[style*="animation"]');
    animations.forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  }
  
  restoreResources() {
    const animations = document.querySelectorAll('[style*="animation"]');
    animations.forEach(el => {
      el.style.animationPlayState = 'running';
    });
  }
  
  // 公開方法
  optimize() {
    this.setupViewportFix();
    this.optimizeVisibleElements();
    console.log('[Unified Mobile] Manual optimization completed');
  }
  
  getStatus() {
    return {
      isMobile: this.isMobile,
      isSafari: this.isSafari,
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      isStandalone: this.isStandalone,
      orientation: this.orientation,
      viewportHeight: this.viewportHeight,
      keyboardOpen: document.documentElement.classList.contains('keyboard-open')
    };
  }
}

// 全域實例
window.unifiedMobileOptimizer = new UnifiedMobileOptimizer();

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedMobileOptimizer;
}