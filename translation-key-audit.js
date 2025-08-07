/**
 * Translation Key Audit Script
 * 用於檢測和報告缺失的翻譯鍵值
 */

class TranslationKeyAuditor {
  constructor() {
    this.missingKeys = new Map();
    this.foundKeys = new Set();
    this.originalGetText = null;
  }

  /**
   * 開始監控翻譯鍵值請求
   */
  startAudit() {
    if (!window.languageManager) {
      console.error('[Audit] LanguageManager not found');
      return;
    }

    // 保存原始的 getText 方法
    this.originalGetText = window.languageManager.getText.bind(window.languageManager);
    
    // 替換 getText 方法以監控請求
    window.languageManager.getText = (key, lang, options) => {
      const result = this.originalGetText(key, lang, options);
      
      // 記錄請求的鍵值
      const targetLang = lang || window.languageManager.getCurrentLanguage();
      const keyId = `${key}:${targetLang}`;
      
      if (result === key || result.includes('Translation key not found')) {
        // 記錄缺失的鍵值
        if (!this.missingKeys.has(targetLang)) {
          this.missingKeys.set(targetLang, new Set());
        }
        this.missingKeys.get(targetLang).add(key);
        console.warn(`[Audit] Missing key: "${key}" for language: "${targetLang}"`);
      } else {
        // 記錄找到的鍵值
        this.foundKeys.add(keyId);
      }
      
      return result;
    };

    console.log('[Audit] Translation key audit started');
  }

  /**
   * 停止監控
   */
  stopAudit() {
    if (this.originalGetText && window.languageManager) {
      window.languageManager.getText = this.originalGetText;
      this.originalGetText = null;
    }
    console.log('[Audit] Translation key audit stopped');
  }

  /**
   * 生成審計報告
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMissingKeys: 0,
        totalFoundKeys: this.foundKeys.size,
        languagesWithMissingKeys: this.missingKeys.size
      },
      missingKeys: {},
      foundKeys: Array.from(this.foundKeys).sort(),
      recommendations: []
    };

    // 統計缺失的鍵值
    for (const [language, keys] of this.missingKeys.entries()) {
      report.missingKeys[language] = Array.from(keys).sort();
      report.summary.totalMissingKeys += keys.size;
    }

    // 生成建議
    if (report.summary.totalMissingKeys > 0) {
      report.recommendations.push('Add missing translation keys to LanguageManager.initializeTranslations()');
      report.recommendations.push('Update _getRequiredTranslationKeys() to include new keys');
      report.recommendations.push('Consider implementing namespace-based key organization');
    }

    return report;
  }

  /**
   * 生成修復代碼
   */
  generateFixCode() {
    const report = this.generateReport();
    
    if (report.summary.totalMissingKeys === 0) {
      return 'No missing keys found. No fix needed.';
    }

    let fixCode = '// Add these keys to LanguageManager.initializeTranslations()\n\n';
    
    for (const [language, keys] of Object.entries(report.missingKeys)) {
      fixCode += `// ${language.toUpperCase()} translations:\n`;
      keys.forEach(key => {
        const defaultValue = this.generateDefaultTranslation(key, language);
        fixCode += `${key}: '${defaultValue}',\n`;
      });
      fixCode += '\n';
    }

    return fixCode;
  }

  /**
   * 生成預設翻譯值
   */
  generateDefaultTranslation(key, language) {
    const translations = {
      zh: {
        'languageChanged': '語言已切換',
        'operationFailed': '操作失敗',
        'themeFailed': '主題切換失敗',
        'view': '檢視',
        'share': '分享',
        'download': '下載',
        'notifications.languageChanged': '語言已切換',
        'notifications.operationFailed': '操作失敗',
        'cardTypes.index': '機關版-延平',
        'cardTypes.personal': '個人版'
      },
      en: {
        'languageChanged': 'Language changed',
        'operationFailed': 'Operation failed',
        'themeFailed': 'Theme switch failed',
        'view': 'View',
        'share': 'Share',
        'download': 'Download',
        'notifications.languageChanged': 'Language changed',
        'notifications.operationFailed': 'Operation failed',
        'cardTypes.index': 'Gov-Yanping',
        'cardTypes.personal': 'Personal'
      }
    };

    return translations[language]?.[key] || this.humanizeKey(key);
  }

  /**
   * 將鍵值轉換為人類可讀的文字
   */
  humanizeKey(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_.]/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * 打印報告到控制台
   */
  printReport() {
    const report = this.generateReport();
    
    console.group('🔍 Translation Key Audit Report');
    console.log('📊 Summary:', report.summary);
    
    if (report.summary.totalMissingKeys > 0) {
      console.group('❌ Missing Keys:');
      for (const [language, keys] of Object.entries(report.missingKeys)) {
        console.log(`${language.toUpperCase()}:`, keys);
      }
      console.groupEnd();
      
      console.group('🔧 Fix Code:');
      console.log(this.generateFixCode());
      console.groupEnd();
    }
    
    console.log('💡 Recommendations:', report.recommendations);
    console.groupEnd();
    
    return report;
  }
}

// 全域實例
window.translationAuditor = new TranslationKeyAuditor();

// 自動開始審計（如果在開發環境）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.translationAuditor.startAudit();
      console.log('🔍 Translation audit started. Use window.translationAuditor.printReport() to see results.');
    }, 1000);
  });
}