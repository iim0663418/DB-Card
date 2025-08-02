// moda-01: moda設計系統管理器核心實作 (JavaScript版本)
// Spec Refs: R-009, D-009, T-020
// Security: CSR-moda01-001, CSR-moda01-002 修復

class DesignSystemError extends Error {
  constructor(message, code, context) {
    super(message);
    this.name = 'DesignSystemError';
    this.code = code;
    this.context = context;
  }
}

/**
 * CSS安全驗證器 - 防護CSS注入攻擊
 * 修復: CSR-moda01-001, CSR-moda01-002
 */
class CSSSecurityValidator {
  // 惡意模式檢測 - 防護javascript:、expression()等注入
  static MALICIOUS_PATTERNS = [
    /javascript:/i,
    /expression\s*\(/i,
    /url\s*\(\s*javascript:/i,
    /url\s*\(\s*data:/i,
    /@import/i,
    /behavior\s*:/i,
    /binding\s*:/i,
    /eval\s*\(/i,
    /<script/i,
    /on\w+\s*=/i
  ];

  // CSS變數名稱白名單
  static ALLOWED_VARIABLE_PREFIXES = [
    '--md-',
    '--bs-'
  ];

  /**
   * 驗證CSS變數值安全性
   * @param {string} value - CSS變數值
   * @returns {boolean} - 是否安全
   */
  static validateCSSValue(value) {
    if (typeof value !== 'string') {
      console.warn('CSS value must be string');
      return false;
    }
    
    // 檢測惡意模式
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(value)) {
        console.warn(`Blocked malicious CSS value: ${value}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * 驗證CSS變數名稱
   * @param {string} name - CSS變數名稱
   * @returns {boolean} - 是否符合白名單
   */
  static validateCSSVariableName(name) {
    if (typeof name !== 'string') {
      return false;
    }
    
    return this.ALLOWED_VARIABLE_PREFIXES.some(prefix => 
      name.startsWith(prefix)
    );
  }
}

class modaDesignSystemManager {
  constructor() {
    this.state = {
      initialized: false,
      tokensLoaded: false,
      cssVariablesApplied: false,
      loadTime: 0
    };

    this.tokens = null;

    // moda設計令牌定義 - 符合數位發展部官方規格
    this.modaTokens = {
      colors: {
        primary: {
          1: '#6868ac', // moda 主色
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
          1: '#1a1a1a', // 文字主色
          2: '#3e4346',
          3: '#4d4d4d',
          4: '#666666',
          5: '#b3b3b3',
          9: '#f5f5f5', // 背景色
          10: '#ffffff' // 純白
        },
        white: {
          1: '#ffffff'
        },
        black: {
          1: '#000000'
        }
      },
      typography: {
        fontFamily: "'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontWeight: 400, // 預設使用 400
        fontSize: '1rem' // 預設 16px
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem'
      }
    };
  }

  /**
   * 初始化設計系統 - 核心入口點
   * 必須在500ms內完成載入
   */
  async initialize() {
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
      
      // 如果是ALREADY_INITIALIZED錯誤，直接重新拋出
      if (error instanceof DesignSystemError && error.code === 'ALREADY_INITIALIZED') {
        throw error;
      }
      
      // 其他錯誤才包裝為INITIALIZATION_FAILED
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
  async loadDesignTokens() {
    // 安全驗證：檢查令牌完整性
    if (!this.validateTokens(this.modaTokens)) {
      throw new DesignSystemError('Invalid design tokens', 'INVALID_TOKENS');
    }

    this.tokens = this.modaTokens;
    this.state.tokensLoaded = true;
  }

  /**
   * 應用CSS變數到DOM - 含安全驗證
   * 修復: CSR-moda01-002 - 加入安全過濾機制
   */
  applyCSSVariables() {
    if (!this.tokens) {
      throw new DesignSystemError('Tokens not loaded', 'TOKENS_NOT_LOADED');
    }

    const root = document.documentElement;
    
    // 安全應用色彩變數
    this._applyColorVariables(root, 'primary', this.tokens.colors.primary);
    this._applyColorVariables(root, 'secondary', this.tokens.colors.secondary);
    this._applyColorVariables(root, 'neutral', this.tokens.colors.neutral);
    this._applyColorVariables(root, 'white', this.tokens.colors.white);
    this._applyColorVariables(root, 'black', this.tokens.colors.black);

    // 安全應用字體變數
    this._applyTypographyVariables(root);

    // 安全應用Bootstrap整合變數
    this._applyBootstrapVariables(root);

    this.state.cssVariablesApplied = true;
  }

  /**
   * 安全應用色彩變數
   * @private
   */
  _applyColorVariables(root, colorType, colorTokens) {
    Object.entries(colorTokens).forEach(([key, value]) => {
      const variableName = `--md-${colorType}-${key}`;
      
      // 安全驗證
      if (!CSSSecurityValidator.validateCSSVariableName(variableName)) {
        console.warn(`Blocked invalid CSS variable name: ${variableName}`);
        return;
      }
      
      if (!CSSSecurityValidator.validateCSSValue(value)) {
        console.warn(`Blocked malicious CSS value for ${variableName}: ${value}`);
        return;
      }
      
      root.style.setProperty(variableName, value);
    });
  }

  /**
   * 安全應用字體變數
   * @private
   */
  _applyTypographyVariables(root) {
    const typography = this.tokens.typography;
    
    // 驗證並應用字體家族
    if (CSSSecurityValidator.validateCSSValue(typography.fontFamily)) {
      root.style.setProperty('--bs-body-font-family', typography.fontFamily);
    } else {
      console.warn('Blocked malicious font family value');
    }
    
    // 驗證並應用字體大小
    if (CSSSecurityValidator.validateCSSValue(typography.fontSize)) {
      root.style.setProperty('--bs-body-font-size', typography.fontSize);
    } else {
      console.warn('Blocked malicious font size value');
    }
    
    // 字體重量（數字轉字串）
    const fontWeight = typography.fontWeight.toString();
    if (CSSSecurityValidator.validateCSSValue(fontWeight)) {
      root.style.setProperty('--bs-body-font-weight', fontWeight);
    }
  }

  /**
   * 安全應用Bootstrap整合變數
   * @private
   */
  _applyBootstrapVariables(root) {
    const bootstrapMappings = {
      '--bs-primary': 'var(--md-primary-1)',
      '--bs-secondary': 'var(--md-secondary-1)'
    };
    
    Object.entries(bootstrapMappings).forEach(([name, value]) => {
      if (CSSSecurityValidator.validateCSSVariableName(name) && 
          CSSSecurityValidator.validateCSSValue(value)) {
        root.style.setProperty(name, value);
      }
    });
  }

  /**
   * 驗證令牌完整性與安全性
   * 修復: CSR-moda01-004 - 加入內容安全檢查
   */
  validateTokens(tokens) {
    try {
      if (!tokens || typeof tokens !== 'object') {
        return false;
      }

      // 檢查必要的色彩令牌結構與安全性
      const requiredColors = ['primary', 'secondary', 'neutral'];
      for (const colorType of requiredColors) {
        if (!tokens.colors || !tokens.colors[colorType] || !tokens.colors[colorType]['1']) {
          return false;
        }
        
        // 安全內容檢查
        for (const [key, value] of Object.entries(tokens.colors[colorType])) {
          if (!CSSSecurityValidator.validateCSSValue(value)) {
            console.error(`Invalid CSS value detected in ${colorType}.${key}: ${value}`);
            return false;
          }
        }
      }

      // 檢查字體令牌結構與安全性
      if (!tokens.typography || !tokens.typography.fontFamily || !tokens.typography.fontSize) {
        return false;
      }
      
      // 字體安全檢查
      if (!CSSSecurityValidator.validateCSSValue(tokens.typography.fontFamily)) {
        console.error('Invalid font family value detected');
        return false;
      }
      
      if (!CSSSecurityValidator.validateCSSValue(tokens.typography.fontSize)) {
        console.error('Invalid font size value detected');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * 驗證初始化結果
   */
  validateInitialization() {
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
  getState() {
    return { ...this.state };
  }

  /**
   * 獲取設計令牌 - 只讀訪問
   */
  getTokens() {
    return this.tokens ? { ...this.tokens } : null;
  }

  /**
   * 檢查是否已初始化
   */
  isInitialized() {
    return this.state.initialized;
  }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { modaDesignSystemManager, DesignSystemError };
} else if (typeof window !== 'undefined') {
    window.modaDesignSystemManager = modaDesignSystemManager;
    window.DesignSystemError = DesignSystemError;
}