/**
 * Static Hosting Security Toggle - 靜態托管安全功能開關
 * 簡化的功能開關系統，適合無後端環境
 * 
 * ⚠️ DEPRECATION WARNING: This file is deprecated.
 * Security features are now managed automatically in security-core.js
 */
class StaticHostingSecurityToggle {
  constructor() {
    this.features = {
      csp: true,
      xssProtection: true,
      inputValidation: true,
      rateLimit: true,
      logging: true
    };
    this.loadSettings();
  }

  /**
   * 檢查功能是否啟用
   */
  isEnabled(feature) {
    return this.features[feature] === true;
  }

  /**
   * 切換功能狀態
   */
  toggle(feature, enabled) {
    if (this.features.hasOwnProperty(feature)) {
      this.features[feature] = Boolean(enabled);
      this.saveSettings();
      return true;
    }
    return false;
  }

  /**
   * 獲取所有功能狀態
   */
  getAllFeatures() {
    return { ...this.features };
  }

  /**
   * 載入設定
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('pwa-security-features');
      if (saved) {
        this.features = { ...this.features, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('[SecurityToggle] Failed to load settings:', error);
    }
  }

  /**
   * 儲存設定
   */
  saveSettings() {
    try {
      localStorage.setItem('pwa-security-features', JSON.stringify(this.features));
    } catch (error) {
      console.warn('[SecurityToggle] Failed to save settings:', error);
    }
  }
}

// 全域可用 (DEPRECATED)
if (!window.StaticHostingSecurityToggle) {
  window.StaticHostingSecurityToggle = StaticHostingSecurityToggle;
}