/**
 * EncryptionLanguageIntegration - UCE-06 語言與設計系統整合
 * 整合 UnifiedLanguageManager 與 moda 設計系統到加密介面
 * 
 * @version 3.2.2-user-controlled-encryption
 * @security OWASP: 多語言輸入驗證、UI 注入防護
 * @accessibility WCAG 2.1 AA 級合規、色彩對比 4.5:1 以上
 */

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
}

export class EncryptionLanguageIntegration {
  private languageManager: any;
  private currentLanguage: string = 'zh-TW';
  private accessibilitySettings: AccessibilitySettings;

  constructor() {
    this.initializeLanguageManager();
    this.initializeAccessibilitySettings();
    this.setupEventListeners();
  }

  /**
   * 初始化語言管理器
   */
  private initializeLanguageManager(): void {
    try {
      const UnifiedLanguageManager = (window as any).UnifiedLanguageManager || 
                                   (global as any).UnifiedLanguageManager;
      
      if (UnifiedLanguageManager) {
        this.languageManager = new UnifiedLanguageManager({
          defaultLanguage: 'zh-TW',
          supportedLanguages: ['zh-TW', 'en-US']
        });
      } else {
        this.languageManager = this.createFallbackLanguageManager();
      }
    } catch (error) {
      this.languageManager = this.createFallbackLanguageManager();
    }
  }

  /**
   * 建立備用語言管理器
   */
  private createFallbackLanguageManager(): any {
    const translations = {
      'zh-TW': {
        'encryption.setup.title': '設定您的加密密碼短語',
        'encryption.unlock.title': '解鎖您的數位名片',
        'encryption.passphrase.adjective': '形容詞',
        'encryption.passphrase.noun': '名詞',
        'encryption.passphrase.verb': '動詞',
        'encryption.security.weak': '安全性較低',
        'encryption.security.good': '安全性良好',
        'encryption.security.strong': '安全性極佳'
      },
      'en-US': {
        'encryption.setup.title': 'Set Your Encryption Passphrase',
        'encryption.unlock.title': 'Unlock Your Digital Cards',
        'encryption.passphrase.adjective': 'Adjective',
        'encryption.passphrase.noun': 'Noun',
        'encryption.passphrase.verb': 'Verb',
        'encryption.security.weak': 'Low security',
        'encryption.security.good': 'Good security',
        'encryption.security.strong': 'Excellent security'
      }
    };

    return {
      getCurrentLanguage: () => this.currentLanguage,
      setLanguage: (lang: string) => {
        this.currentLanguage = lang;
        this.notifyLanguageChange(lang);
      },
      translate: (key: string) => {
        const langTranslations = translations[this.currentLanguage as keyof typeof translations];
        return langTranslations?.[key as keyof typeof langTranslations] || key;
      }
    };
  }

  /**
   * 初始化無障礙設定
   */
  private initializeAccessibilitySettings(): void {
    this.accessibilitySettings = {
      highContrast: this.detectHighContrastPreference(),
      largeText: this.detectLargeTextPreference(),
      screenReader: this.detectScreenReader()
    };
  }

  /**
   * 設定事件監聽器
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('languagechange', (event: any) => {
        this.handleLanguageChange(event.detail?.language);
      });
    }
  }

  /**
   * 翻譯加密介面文字
   */
  public translateEncryptionUI(key: string): string {
    try {
      const sanitizedKey = this.sanitizeTranslationKey(key);
      return this.languageManager.translate(sanitizedKey);
    } catch (error) {
      return key;
    }
  }

  /**
   * 更新加密介面語言
   */
  public updateEncryptionUILanguage(language: string): void {
    try {
      if (!this.isValidLanguageCode(language)) {
        throw new Error(`Invalid language code: ${language}`);
      }

      this.languageManager.setLanguage(language);
      this.currentLanguage = language;
      this.updateAllEncryptionDialogs();
      
    } catch (error) {
      console.error('[EncryptionLanguageIntegration] Failed to update language:', error);
    }
  }

  /**
   * 應用 moda 設計系統樣式
   */
  public applyModaDesignSystem(element: HTMLElement, options: {
    variant?: 'primary' | 'secondary' | 'error';
    size?: 'small' | 'medium' | 'large';
  } = {}): void {
    try {
      const { variant = 'primary', size = 'medium' } = options;
      
      // 基礎樣式
      element.style.fontFamily = '"Noto Sans TC", "Noto Sans", sans-serif';
      element.style.borderRadius = '0.5rem';
      element.style.transition = 'all 0.2s ease-in-out';
      
      // 變體樣式
      const colors = {
        primary: '#1976d2',
        secondary: '#dc004e',
        error: '#f44336'
      };
      
      if (colors[variant]) {
        element.style.backgroundColor = colors[variant];
        element.style.color = '#ffffff';
      }
      
      // 尺寸樣式
      const sizes = {
        small: { fontSize: '0.875rem', padding: '0.5rem' },
        medium: { fontSize: '1rem', padding: '1rem' },
        large: { fontSize: '1.25rem', padding: '1.5rem' }
      };
      
      const sizeStyle = sizes[size];
      element.style.fontSize = sizeStyle.fontSize;
      element.style.padding = sizeStyle.padding;
      
      // 無障礙樣式
      this.applyAccessibilityStyles(element);
      
    } catch (error) {
      console.error('[EncryptionLanguageIntegration] Failed to apply design system:', error);
    }
  }

  /**
   * 生成無障礙 ARIA 標籤
   */
  public generateARIALabels(context: 'setup' | 'unlock' | 'recovery'): Record<string, string> {
    const baseLabels = {
      setup: {
        'aria-label': this.translateEncryptionUI('encryption.setup.title'),
        'role': 'dialog',
        'aria-modal': 'true'
      },
      unlock: {
        'aria-label': this.translateEncryptionUI('encryption.unlock.title'),
        'role': 'dialog',
        'aria-modal': 'true'
      },
      recovery: {
        'aria-label': this.translateEncryptionUI('encryption.recovery.title'),
        'role': 'dialog',
        'aria-modal': 'true'
      }
    };

    return baseLabels[context] || baseLabels.setup;
  }

  /**
   * 檢測高對比偏好
   */
  private detectHighContrastPreference(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      return window.matchMedia('(prefers-contrast: high)').matches;
    } catch {
      return false;
    }
  }

  /**
   * 檢測大字體偏好
   */
  private detectLargeTextPreference(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const fontSize = window.getComputedStyle(document.documentElement).fontSize;
      return parseFloat(fontSize) > 16;
    } catch {
      return false;
    }
  }

  /**
   * 檢測螢幕閱讀器
   */
  private detectScreenReader(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      return 'speechSynthesis' in window;
    } catch {
      return false;
    }
  }

  /**
   * 清理翻譯鍵值
   */
  private sanitizeTranslationKey(key: string): string {
    return key.replace(/[<>\"'&]/g, '').substring(0, 100);
  }

  /**
   * 驗證語言代碼
   */
  private isValidLanguageCode(language: string): boolean {
    return ['zh-TW', 'en-US'].includes(language);
  }

  /**
   * 更新所有加密對話框
   */
  private updateAllEncryptionDialogs(): void {
    if (typeof document === 'undefined') return;
    
    const dialogs = document.querySelectorAll('.encryption-dialog');
    dialogs.forEach(dialog => {
      this.updateDialogLanguage(dialog as HTMLElement);
    });
  }

  /**
   * 更新對話框語言
   */
  private updateDialogLanguage(dialog: HTMLElement): void {
    try {
      const labels = dialog.querySelectorAll('[data-i18n-key]');
      labels.forEach(label => {
        const key = label.getAttribute('data-i18n-key');
        if (key) {
          label.textContent = this.translateEncryptionUI(key);
        }
      });
    } catch (error) {
      console.error('[EncryptionLanguageIntegration] Failed to update dialog language:', error);
    }
  }

  /**
   * 應用無障礙樣式
   */
  private applyAccessibilityStyles(element: HTMLElement): void {
    if (this.accessibilitySettings.highContrast) {
      element.style.border = '2px solid currentColor';
    }

    if (this.accessibilitySettings.largeText) {
      const currentSize = parseFloat(element.style.fontSize || '1rem');
      element.style.fontSize = `${currentSize * 1.2}rem`;
    }

    // 確保最小觸控目標 44px
    if (element.tagName === 'BUTTON') {
      element.style.minHeight = '44px';
      element.style.minWidth = '44px';
    }

    // 焦點指示器
    element.addEventListener('focus', () => {
      element.style.boxShadow = '0 0 0 3px #1976d240';
    });
    element.addEventListener('blur', () => {
      element.style.boxShadow = 'none';
    });
  }

  /**
   * 處理語言變更
   */
  private handleLanguageChange(language: string): void {
    if (language && this.isValidLanguageCode(language)) {
      this.updateEncryptionUILanguage(language);
    }
  }

  /**
   * 通知語言變更
   */
  private notifyLanguageChange(language: string): void {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('encryptionLanguageChanged', {
        detail: { language, timestamp: Date.now() }
      }));
    }
  }

  /**
   * 獲取當前語言
   */
  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * 獲取無障礙設定
   */
  public getAccessibilitySettings(): AccessibilitySettings {
    return { ...this.accessibilitySettings };
  }
}

// 匯出類別
export default EncryptionLanguageIntegration;

// 全域可用性
if (typeof window !== 'undefined') {
  (window as any).EncryptionLanguageIntegration = EncryptionLanguageIntegration;
}

if (typeof global !== 'undefined') {
  (global as any).EncryptionLanguageIntegration = EncryptionLanguageIntegration;
}