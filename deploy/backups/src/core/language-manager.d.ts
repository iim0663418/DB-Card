/**
 * TypeScript definitions for LanguageManager
 * Core translation system with static hosting compatibility
 */

export type LanguageCode = 'zh' | 'en';

export interface TranslationData {
  [key: string]: string;
}

export interface TranslationDictionary {
  zh: TranslationData;
  en: TranslationData;
}

export interface LanguageObserver {
  (language: LanguageCode): void;
}

export interface NotificationMessages {
  cardSaved: () => string;
  cardImported: () => string;
  cardExported: () => string;
  qrGenerated: () => string;
  qrDownloaded: () => string;
  linkCopied: () => string;
  vcardDownloaded: () => string;
  languageChanged: () => string;
  themeChanged: (isDark: boolean) => string;
  importFailed: () => string;
  exportFailed: () => string;
  qrFailed: () => string;
  copyFailed: () => string;
  initFailed: () => string;
  cardNotFound: () => string;
  invalidUrl: () => string;
}

export declare class LanguageManager {
  public currentLanguage: LanguageCode;
  public translations: TranslationDictionary;
  public observers: LanguageObserver[];

  constructor();

  /**
   * Detect browser language preference
   * @returns Browser-detected language code
   */
  detectBrowserLanguage(): LanguageCode;

  /**
   * Initialize translation dictionary
   * @returns Complete translation dictionary
   */
  initializeTranslations(): TranslationDictionary;

  /**
   * Get translated text
   * @param key Translation key
   * @param lang Optional language override
   * @returns Translated text or key if not found
   */
  getText(key: string, lang?: LanguageCode | null): string;

  /**
   * Switch application language
   * @param lang Target language code
   */
  switchLanguage(lang: LanguageCode): void;

  /**
   * Toggle between Chinese and English
   * @returns New language code
   */
  toggleLanguage(): LanguageCode;

  /**
   * Update UI elements with current language
   */
  updateUI(): void;

  /**
   * Add language change observer
   * @param callback Observer function
   */
  addObserver(callback: LanguageObserver): void;

  /**
   * Remove language change observer
   * @param callback Observer function to remove
   */
  removeObserver(callback: LanguageObserver): void;

  /**
   * Notify all observers of language change
   * @param language New language code
   */
  notifyObservers(language: LanguageCode): void;

  /**
   * Get notification messages object
   * @returns Object with notification message functions
   */
  getNotificationMessages(): NotificationMessages;

  /**
   * Update theme-related labels
   */
  updateThemeLabels(): void;

  /**
   * Update form placeholders
   */
  updateFormPlaceholders(): void;

  /**
   * Update button titles
   */
  updateButtonTitles(): void;

  /**
   * Update status information
   */
  updateStatusInfo(): void;
}