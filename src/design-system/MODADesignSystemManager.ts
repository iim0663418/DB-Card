// moda-01: moda設計系統管理器核心實作
// Spec Refs: R-009, D-009, T-020

import { DesignTokens, DesignSystemState, DesignSystemError } from './types.js';

export class modaDesignSystemManager {
  private state: DesignSystemState = {
    initialized: false,
    tokensLoaded: false,
    cssVariablesApplied: false,
    loadTime: 0
  };

  private tokens: DesignTokens | null = null;

  // moda設計令牌定義 - 符合數位發展部官方規格
  private readonly modaTokens: DesignTokens = {
    colors: {
      primary: {
        1: '#6868ac',
        2: 'rgba(104, 104, 172, 0.89)',
        3: '#4e4e81',
        4: '#a4a4cd',
        5: '#dbdbeb'
      },
      secondary: {
        1: '#565e62',
        2: '#6E777C',
        3: '#7b868c',
        4: 'rgba(115, 125, 130, 0.5)',
        5: '#adb4b8'
      },
      neutral: {
        1: '#1a1a1a',
        2: '#3e4346',
        3: '#4d4d4d',
        4: '#666666',
        5: '#b3b3b3'
      }
    },
    typography: {
      fontFamily: "'PingFang TC', 'Noto Sans TC', sans-serif",
      fontWeight: 300,
      fontSize: '0.875rem'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    }
  };

  /**
   * 初始化設計系統 - 核心入口點
   * 必須在500ms內完成載入
   */
  public async initialize(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 安全檢查：防止重複初始化
      if (this.state.initialized) {
        throw new DesignSystemError('Design system already initialized', 'ALREADY_INITIALIZED');
      }

      // 載入設計令牌
      await this.loadDesignTokens();
      
      // 應用CSS變數
      this.applyCSSVariables();
      
      // 驗證載入結果
      this.validateInitialization();
      
      const loadTime = performance.now() - startTime;
      this.state = {
        initialized: true,
        tokensLoaded: true,
        cssVariablesApplied: true,
        loadTime
      };

      // 效能檢查：確保在500ms內完成
      if (loadTime > 500) {
        console.warn(`Design system initialization took ${loadTime.toFixed(2)}ms (>500ms target)`);
      }

    } catch (error) {
      const loadTime = performance.now() - startTime;
      this.state.loadTime = loadTime;
      
      throw new DesignSystemError(
        `Failed to initialize design system: ${error.message}`,
        'INITIALIZATION_FAILED',
        { originalError: error, loadTime }
      );
    }
  }

  /**
   * 載入設計令牌
   */
  private async loadDesignTokens(): Promise<void> {
    // 安全驗證：檢查令牌完整性
    if (!this.validateTokens(this.modaTokens)) {
      throw new DesignSystemError('Invalid design tokens', 'INVALID_TOKENS');
    }

    this.tokens = this.modaTokens;
    this.state.tokensLoaded = true;
  }

  /**
   * 應用CSS變數到DOM
   */
  private applyCSSVariables(): void {
    if (!this.tokens) {
      throw new DesignSystemError('Tokens not loaded', 'TOKENS_NOT_LOADED');
    }

    const root = document.documentElement;
    
    // 應用色彩變數
    Object.entries(this.tokens.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--md-primary-${key}`, value);
    });
    
    Object.entries(this.tokens.colors.secondary).forEach(([key, value]) => {
      root.style.setProperty(`--md-secondary-${key}`, value);
    });
    
    Object.entries(this.tokens.colors.neutral).forEach(([key, value]) => {
      root.style.setProperty(`--md-neutral-${key}`, value);
    });

    // 應用字體變數
    root.style.setProperty('--bs-body-font-family', this.tokens.typography.fontFamily);
    root.style.setProperty('--bs-body-font-weight', this.tokens.typography.fontWeight.toString());
    root.style.setProperty('--bs-body-font-size', this.tokens.typography.fontSize);

    // Bootstrap整合變數
    root.style.setProperty('--bs-primary', 'var(--md-primary-1)');
    root.style.setProperty('--bs-secondary', 'var(--md-secondary-1)');

    this.state.cssVariablesApplied = true;
  }

  /**
   * 驗證令牌完整性 - 安全檢查
   */
  private validateTokens(tokens: DesignTokens): boolean {
    try {
      // 檢查必要的色彩令牌
      const requiredColors = ['primary', 'secondary', 'neutral'];
      for (const colorType of requiredColors) {
        if (!tokens.colors[colorType] || !tokens.colors[colorType]['1']) {
          return false;
        }
      }

      // 檢查字體令牌
      if (!tokens.typography.fontFamily || !tokens.typography.fontSize) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 驗證初始化結果
   */
  private validateInitialization(): void {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    // 檢查關鍵CSS變數是否正確應用
    const primaryColor = computedStyle.getPropertyValue('--md-primary-1').trim();
    if (!primaryColor || primaryColor !== '#6868ac') {
      throw new DesignSystemError('CSS variables not properly applied', 'CSS_VARIABLES_FAILED');
    }
  }

  /**
   * 獲取當前狀態 - 用於監控和調試
   */
  public getState(): DesignSystemState {
    return { ...this.state };
  }

  /**
   * 獲取設計令牌 - 只讀訪問
   */
  public getTokens(): DesignTokens | null {
    return this.tokens ? { ...this.tokens } : null;
  }

  /**
   * 檢查是否已初始化
   */
  public isInitialized(): boolean {
    return this.state.initialized;
  }
}