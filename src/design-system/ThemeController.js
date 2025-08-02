// moda-02: 主題控制器與深色模式實作
// Spec Refs: R-009.2, D-009.2, T-020
// Dependencies: moda-01

// 移除 DesignSystemError 導入，使用內建 Error

/**
 * 主題控制器 - 支援light/dark/auto主題切換
 * 實作系統偏好檢測和主題切換動畫
 */
class ThemeController {
  constructor(designSystemManager) {
    this.designSystemManager = designSystemManager;
    this.currentTheme = 'auto';
    this.systemPreference = 'light';
    this.mediaQuery = null;
    this.transitionDuration = 250; // ms
    
    // 主題變數映射
    this.themeVariables = {
      light: {
        '--md-primary-1': '#6868ac',
        '--md-primary-2': 'rgba(104, 104, 172, 0.89)',
        '--md-secondary-1': '#565e62',
        '--md-neutral-1': '#1a1a1a',
        '--md-white-1': '#fff',
        '--md-black-1': '#000'
      },
      dark: {
        '--md-primary-1': '#a4a4cd',
        '--md-primary-2': 'rgba(164, 164, 205, 0.9)',
        '--md-secondary-1': '#adb4b8',
        '--md-neutral-1': '#f3f5f6',
        '--md-white-1': '#1a1a1a',
        '--md-black-1': '#fff'
      }
    };
    
    this.state = {
      initialized: false,
      currentTheme: 'auto',
      systemPreference: 'light',
      transitionActive: false
    };
  }

  /**
   * 初始化主題控制器
   */
  async initialize() {
    if (this.state.initialized) {
      throw new Error('Theme controller already initialized');
    }

    try {
      // 檢測系統偏好
      this.detectSystemPreference();
      
      // 設置媒體查詢監聽
      this.setupMediaQueryListener();
      
      // 應用初始主題
      await this.applyTheme(this.currentTheme);
      
      this.state.initialized = true;
      
    } catch (error) {
      throw new Error(`Failed to initialize theme controller: ${error.message}`);
    }
  }

  /**
   * 檢測系統主題偏好
   */
  detectSystemPreference() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPreference = darkModeQuery.matches ? 'dark' : 'light';
      this.state.systemPreference = this.systemPreference;
    }
  }

  /**
   * 設置媒體查詢監聽器
   */
  setupMediaQueryListener() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        this.systemPreference = e.matches ? 'dark' : 'light';
        this.state.systemPreference = this.systemPreference;
        
        // 如果當前是auto模式，自動切換主題
        if (this.currentTheme === 'auto') {
          this.applyTheme('auto');
        }
      };

      // 使用現代API或降級到舊API
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', handleChange);
      } else {
        this.mediaQuery.addListener(handleChange);
      }
    }
  }

  /**
   * 切換主題
   * @param {string} theme - 'light', 'dark', 'auto'
   */
  async switchTheme(theme) {
    if (!['light', 'dark', 'auto'].includes(theme)) {
      throw new Error(`Invalid theme: ${theme}`);
    }

    const startTime = performance.now();
    
    try {
      this.state.transitionActive = true;
      
      // 應用主題切換動畫
      await this.animateThemeTransition();
      
      // 應用新主題
      await this.applyTheme(theme);
      
      this.currentTheme = theme;
      this.state.currentTheme = theme;
      
      const switchTime = performance.now() - startTime;
      
      // 效能檢查：確保在250ms內完成
      if (switchTime > this.transitionDuration) {
        console.info(`Theme switch took ${switchTime.toFixed(2)}ms (>${this.transitionDuration}ms target)`);
      }
      
    } catch (error) {
      throw new Error(`Failed to switch theme: ${error.message}`);
    } finally {
      this.state.transitionActive = false;
    }
  }

  /**
   * 應用主題變數
   * @param {string} theme - 主題名稱
   */
  async applyTheme(theme) {
    const effectiveTheme = theme === 'auto' ? this.systemPreference : theme;
    const themeVars = this.themeVariables[effectiveTheme];
    
    if (!themeVars) {
      throw new Error(`Theme variables not found: ${effectiveTheme}`);
    }

    const root = document.documentElement;
    
    // 批次應用主題變數
    Object.entries(themeVars).forEach(([name, value]) => {
      // 安全驗證（重用moda-01的安全機制）
      if (this.designSystemManager && this.designSystemManager.validateCSSValue) {
        if (!this.designSystemManager.validateCSSValue(value)) {
          console.warn(`Blocked malicious theme value for ${name}: ${value}`);
          return;
        }
      }
      
      root.style.setProperty(name, value);
    });

    // 更新body類別
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${effectiveTheme}`);
    
    // 觸發主題變更事件
    this.dispatchThemeChangeEvent(effectiveTheme);
  }

  /**
   * 主題切換動畫
   */
  async animateThemeTransition() {
    return new Promise((resolve) => {
      const root = document.documentElement;
      
      // 添加過渡效果
      root.style.transition = `all ${this.transitionDuration}ms ease-in-out`;
      
      // 動畫完成後清理
      setTimeout(() => {
        root.style.transition = '';
        resolve();
      }, this.transitionDuration);
    });
  }

  /**
   * 觸發主題變更事件
   * @param {string} theme - 當前主題
   */
  dispatchThemeChangeEvent(theme) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('themechange', {
        detail: {
          theme,
          timestamp: Date.now(),
          systemPreference: this.systemPreference
        }
      });
      
      window.dispatchEvent(event);
    }
  }

  /**
   * 獲取當前主題
   */
  getCurrentTheme() {
    return {
      selected: this.currentTheme,
      effective: this.currentTheme === 'auto' ? this.systemPreference : this.currentTheme,
      systemPreference: this.systemPreference
    };
  }

  /**
   * 獲取主題控制器狀態
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 檢查是否支援深色模式
   */
  supportsDarkMode() {
    return typeof window !== 'undefined' && 
           window.matchMedia && 
           window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all';
  }

  /**
   * 清理資源
   */
  destroy() {
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener('change', this.handleMediaQueryChange);
      } else {
        this.mediaQuery.removeListener(this.handleMediaQueryChange);
      }
    }
    
    this.state.initialized = false;
  }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeController };
} else if (typeof window !== 'undefined') {
    window.ThemeController = ThemeController;
}