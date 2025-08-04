/**
 * moda 設計系統整合工具
 * 為新實作的 UI 元件提供設計系統對齊功能
 */

class ModaIntegration {
  constructor() {
    this.designTokens = {
      colors: {
        primary: 'var(--pwa-primary, #6868ac)',
        secondary: 'var(--md-secondary-1, #565e62)',
        surface: 'var(--pwa-surface, white)',
        text: 'var(--pwa-text, #1a1a1a)',
        textSecondary: 'var(--pwa-text-secondary, #666)',
        border: 'var(--pwa-border, #e5e7ea)'
      },
      typography: {
        fontFamily: 'var(--pwa-font-family, "Noto Sans TC", sans-serif)',
        fontSize: {
          xs: 'var(--senior-font-size-xs, 0.9rem)',
          sm: 'var(--senior-font-size-sm, 1rem)',
          base: 'var(--senior-font-size-base, 1.125rem)',
          lg: 'var(--senior-font-size-lg, 1.25rem)',
          xl: 'var(--senior-font-size-xl, 1.5rem)',
          '2xl': 'var(--senior-font-size-2xl, 1.75rem)'
        },
        fontWeight: {
          normal: 'var(--pwa-font-weight-normal, 400)',
          medium: 'var(--pwa-font-weight-medium, 500)',
          bold: 'var(--pwa-font-weight-bold, 600)'
        },
        lineHeight: {
          tight: 'var(--senior-line-height-tight, 1.4)',
          normal: 'var(--senior-line-height-normal, 1.6)',
          relaxed: 'var(--senior-line-height-relaxed, 1.8)'
        }
      },
      spacing: {
        xs: 'var(--pwa-spacing-xs, 0.25rem)',
        sm: 'var(--pwa-spacing-sm, 0.5rem)',
        md: 'var(--pwa-spacing-md, 1rem)',
        lg: 'var(--pwa-spacing-lg, 1.5rem)',
        xl: 'var(--pwa-spacing-xl, 2rem)'
      },
      transitions: {
        duration: 'var(--pwa-transition-duration, 0.3s)',
        timing: 'var(--pwa-transition-timing, ease)'
      }
    };
  }

  /**
   * 應用 moda 設計系統樣式到元件
   * @param {HTMLElement} element - 目標元素
   * @param {Object} styles - 樣式配置
   */
  applyDesignSystem(element, styles = {}) {
    if (!element) return;

    // 應用基礎樣式
    element.style.fontFamily = this.designTokens.typography.fontFamily;
    element.style.color = this.designTokens.colors.text;
    element.style.transition = `${this.designTokens.transitions.duration} ${this.designTokens.transitions.timing}`;

    // 應用自訂樣式
    Object.entries(styles).forEach(([property, value]) => {
      if (typeof value === 'string' && value.startsWith('--')) {
        // CSS 變數
        element.style.setProperty(property, `var(${value})`);
      } else {
        element.style[property] = value;
      }
    });
  }

  /**
   * 創建符合 moda 設計系統的按鈕
   * @param {string} text - 按鈕文字
   * @param {string} variant - 按鈕變體 (primary, secondary)
   * @param {Object} options - 額外選項
   * @returns {HTMLButtonElement}
   */
  createButton(text, variant = 'primary', options = {}) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `btn btn-${variant}`;

    const baseStyles = {
      padding: `${this.designTokens.spacing.sm} ${this.designTokens.spacing.lg}`,
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: this.designTokens.typography.fontSize.base,
      fontFamily: this.designTokens.typography.fontFamily,
      fontWeight: this.designTokens.typography.fontWeight.medium,
      transition: `${this.designTokens.transitions.duration} ${this.designTokens.transitions.timing}`
    };

    const variantStyles = {
      primary: {
        backgroundColor: this.designTokens.colors.primary,
        color: 'var(--pwa-text-inverse, white)'
      },
      secondary: {
        backgroundColor: this.designTokens.colors.secondary,
        color: 'var(--pwa-text-inverse, white)'
      }
    };

    this.applyDesignSystem(button, {
      ...baseStyles,
      ...variantStyles[variant],
      ...options.styles
    });

    // 添加事件監聽器
    if (options.onClick) {
      button.addEventListener('click', options.onClick);
    }

    return button;
  }

  /**
   * 創建符合 moda 設計系統的輸入框
   * @param {string} type - 輸入框類型
   * @param {Object} options - 選項
   * @returns {HTMLInputElement}
   */
  createInput(type = 'text', options = {}) {
    const input = document.createElement('input');
    input.type = type;

    const styles = {
      backgroundColor: this.designTokens.colors.surface,
      border: `1px solid ${this.designTokens.colors.border}`,
      color: this.designTokens.colors.text,
      fontFamily: this.designTokens.typography.fontFamily,
      borderRadius: '6px',
      padding: `${this.designTokens.spacing.sm} ${this.designTokens.spacing.md}`,
      fontSize: this.designTokens.typography.fontSize.base,
      transition: `${this.designTokens.transitions.duration} ${this.designTokens.transitions.timing}`
    };

    this.applyDesignSystem(input, { ...styles, ...options.styles });

    // 焦點樣式
    input.addEventListener('focus', () => {
      input.style.borderColor = this.designTokens.colors.primary;
      input.style.outline = 'none';
      input.style.boxShadow = `0 0 0 2px rgba(104, 104, 172, 0.2)`;
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = this.designTokens.colors.border;
      input.style.boxShadow = 'none';
    });

    return input;
  }

  /**
   * 創建符合 moda 設計系統的卡片容器
   * @param {Object} options - 選項
   * @returns {HTMLDivElement}
   */
  createCard(options = {}) {
    const card = document.createElement('div');
    card.className = 'moda-card';

    const styles = {
      backgroundColor: this.designTokens.colors.surface,
      border: `1px solid ${this.designTokens.colors.border}`,
      borderRadius: '8px',
      padding: this.designTokens.spacing.lg,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: `${this.designTokens.transitions.duration} ${this.designTokens.transitions.timing}`
    };

    this.applyDesignSystem(card, { ...styles, ...options.styles });

    return card;
  }

  /**
   * 創建符合 moda 設計系統的標題
   * @param {string} text - 標題文字
   * @param {number} level - 標題層級 (1-6)
   * @param {Object} options - 選項
   * @returns {HTMLHeadingElement}
   */
  createHeading(text, level = 2, options = {}) {
    const heading = document.createElement(`h${level}`);
    heading.textContent = text;

    const fontSizes = {
      1: this.designTokens.typography.fontSize['2xl'],
      2: this.designTokens.typography.fontSize.xl,
      3: this.designTokens.typography.fontSize.lg,
      4: this.designTokens.typography.fontSize.base,
      5: this.designTokens.typography.fontSize.sm,
      6: this.designTokens.typography.fontSize.xs
    };

    const styles = {
      margin: '0',
      color: this.designTokens.colors.text,
      fontSize: fontSizes[level],
      fontWeight: this.designTokens.typography.fontWeight.bold,
      lineHeight: this.designTokens.typography.lineHeight.tight
    };

    this.applyDesignSystem(heading, { ...styles, ...options.styles });

    return heading;
  }

  /**
   * 檢查深色模式狀態
   * @returns {boolean}
   */
  isDarkMode() {
    return document.documentElement.classList.contains('dark') ||
           document.body.classList.contains('dark');
  }

  /**
   * 切換深色模式
   */
  toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    
    // 觸發自訂事件
    const event = new CustomEvent('moda:theme-changed', {
      detail: { isDark: this.isDarkMode() }
    });
    document.dispatchEvent(event);
  }

  /**
   * 初始化設計系統
   */
  initialize() {
    // 確保 moda 設計系統 CSS 已載入
    if (!document.getElementById('moda-design-system-styles')) {
      console.warn('[ModaIntegration] moda design system CSS not found');
    }

    // 監聽主題變更事件
    document.addEventListener('moda:theme-changed', (event) => {
      console.log('[ModaIntegration] Theme changed:', event.detail);
    });

    // 應用高齡友善設計
    this.applySeniorFriendlyDesign();
  }

  /**
   * 應用高齡友善設計
   */
  applySeniorFriendlyDesign() {
    // 確保最小字體大小
    const style = document.createElement('style');
    style.textContent = `
      .moda-senior-friendly {
        font-size: ${this.designTokens.typography.fontSize.base} !important;
        line-height: ${this.designTokens.typography.lineHeight.relaxed} !important;
        letter-spacing: var(--senior-letter-spacing, 0.02em) !important;
      }
      
      .moda-senior-friendly button,
      .moda-senior-friendly input,
      .moda-senior-friendly select {
        min-height: 44px !important;
        font-size: ${this.designTokens.typography.fontSize.base} !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModaIntegration;
} else if (typeof window !== 'undefined') {
  window.ModaIntegration = ModaIntegration;
}