/**
 * moda Design System Integration
 * 統一版本管理介面的設計系統整合
 */

export class ModaDesignIntegration {
  constructor() {
    this.designTokens = {
      colors: {
        primary: 'var(--md-primary-1, #6868ac)',
        secondary: 'var(--md-secondary-1, #565e62)',
        success: 'var(--md-success-1, #4caf50)',
        warning: 'var(--md-warning-1, #ff9800)',
        error: 'var(--md-error-1, #f44336)',
        neutral: 'var(--md-neutral-9, #f3f5f6)',
        white: 'var(--md-white-1, #ffffff)',
        black: 'var(--md-black-1, #1a1a1a)'
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem'
      },
      typography: {
        fontFamily: 'var(--pwa-font-family, "Noto Sans TC", sans-serif)',
        fontSize: {
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem'
        }
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px'
      }
    };
  }

  /**
   * 應用 moda 設計系統到版本管理按鈕
   */
  applyVersionManagementStyles(element) {
    if (!element) return;

    const styles = {
      padding: `${this.designTokens.spacing.sm} ${this.designTokens.spacing.md}`,
      backgroundColor: this.designTokens.colors.primary,
      color: this.designTokens.colors.white,
      border: 'none',
      borderRadius: this.designTokens.borderRadius.md,
      fontFamily: this.designTokens.typography.fontFamily,
      fontSize: this.designTokens.typography.fontSize.base,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: this.designTokens.spacing.sm
    };

    Object.assign(element.style, styles);

    // 添加 hover 效果
    element.addEventListener('mouseenter', () => {
      element.style.backgroundColor = this.designTokens.colors.secondary;
    });

    element.addEventListener('mouseleave', () => {
      element.style.backgroundColor = this.designTokens.colors.primary;
    });
  }

  /**
   * 創建 moda 風格的模態框
   */
  createModaModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'moda-modal';
    
    modal.innerHTML = `
      <div class="moda-modal-overlay"></div>
      <div class="moda-modal-content">
        <div class="moda-modal-header">
          <h2 class="moda-modal-title">${title}</h2>
          <button class="moda-modal-close" aria-label="關閉">&times;</button>
        </div>
        <div class="moda-modal-body">
          ${content}
        </div>
      </div>
    `;

    this.applyModalStyles(modal);
    return modal;
  }

  /**
   * 應用模態框樣式
   */
  applyModalStyles(modal) {
    const overlay = modal.querySelector('.moda-modal-overlay');
    const content = modal.querySelector('.moda-modal-content');
    const header = modal.querySelector('.moda-modal-header');
    const title = modal.querySelector('.moda-modal-title');
    const closeBtn = modal.querySelector('.moda-modal-close');

    // 覆蓋層樣式
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: '1000',
      backdropFilter: 'blur(4px)'
    });

    // 內容區樣式
    Object.assign(content.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: this.designTokens.colors.white,
      borderRadius: this.designTokens.borderRadius.lg,
      boxShadow: '0 8px 32px rgba(104, 104, 172, 0.25)',
      zIndex: '1001',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      fontFamily: this.designTokens.typography.fontFamily
    });

    // 標題區樣式
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: this.designTokens.spacing.lg,
      borderBottom: `1px solid ${this.designTokens.colors.neutral}`
    });

    // 標題樣式
    Object.assign(title.style, {
      margin: '0',
      fontSize: this.designTokens.typography.fontSize.xl,
      fontWeight: '600',
      color: this.designTokens.colors.black
    });

    // 關閉按鈕樣式
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: this.designTokens.colors.secondary,
      padding: this.designTokens.spacing.sm,
      borderRadius: this.designTokens.borderRadius.sm,
      transition: 'all 0.2s ease'
    });

    // 關閉按鈕 hover 效果
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = this.designTokens.colors.neutral;
      closeBtn.style.color = this.designTokens.colors.black;
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.color = this.designTokens.colors.secondary;
    });
  }

  /**
   * 創建無障礙友好的按鈕
   */
  createAccessibleButton(text, onClick, variant = 'primary') {
    const button = document.createElement('button');
    button.textContent = text;
    button.setAttribute('type', 'button');
    
    const variantStyles = {
      primary: {
        backgroundColor: this.designTokens.colors.primary,
        color: this.designTokens.colors.white
      },
      secondary: {
        backgroundColor: this.designTokens.colors.neutral,
        color: this.designTokens.colors.black,
        border: `1px solid ${this.designTokens.colors.secondary}`
      },
      danger: {
        backgroundColor: this.designTokens.colors.error,
        color: this.designTokens.colors.white
      }
    };

    const baseStyles = {
      padding: `${this.designTokens.spacing.sm} ${this.designTokens.spacing.md}`,
      border: 'none',
      borderRadius: this.designTokens.borderRadius.md,
      fontFamily: this.designTokens.typography.fontFamily,
      fontSize: this.designTokens.typography.fontSize.base,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minHeight: '44px', // WCAG 觸控目標最小尺寸
      ...variantStyles[variant]
    };

    Object.assign(button.style, baseStyles);

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    return button;
  }
}

// 全域實例
export const modaDesign = new ModaDesignIntegration();