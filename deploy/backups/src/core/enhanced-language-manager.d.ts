/**
 * TypeScript definitions for EnhancedLanguageManager
 * Advanced language management with caching, retry logic and unified translation support
 */

import { LanguageCode, LanguageManager, TranslationData } from './language-manager';

export interface TranslationRegistryInterface {
  register(namespace: string, translations: Record<string, TranslationData>): void;
  get(namespace: string, key: string, lang: LanguageCode): string | null;
  hasNamespace(namespace: string): boolean;
  getAllNamespaces(): string[];
  validateTranslations(namespace: string, requiredKeys: string[]): ValidationResult;
}

export interface UnifiedLanguageObserverInterface {
  observe(target: HTMLElement, config: ObserverConfig): void;
  disconnect(): void;
  updateElement(element: HTMLElement, lang: LanguageCode): void;
}

export interface ObserverConfig {
  attributes?: boolean;
  childList?: boolean;
  subtree?: boolean;
  attributeFilter?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  warnings: string[];
}

export interface CacheConfig {
  maxSize: number;
  ttl: number;
  enablePersistence: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export interface EnhancedLanguageManagerConfig {
  cache?: Partial<CacheConfig>;
  retry?: Partial<RetryConfig>;
  enableUnifiedObserver?: boolean;
  enableSecurityValidation?: boolean;
}

export type TranslationValue = string | string[] | Record<string, any>;

export declare class EnhancedLanguageManager {
  public baseManager: LanguageManager;
  public translationRegistry: TranslationRegistryInterface | null;
  public unifiedObserver: UnifiedLanguageObserverInterface | null;
  public isUpdating: boolean;
  public updateQueue: (() => Promise<void>)[];
  public initialized: boolean;

  constructor(existingLanguageManager?: LanguageManager | null);

  /**
   * Initialize enhanced language manager
   * @param config Configuration options
   */
  initialize(config?: EnhancedLanguageManagerConfig): Promise<void>;

  /**
   * Switch language with enhanced features
   * @param lang Target language code
   * @param options Additional options for language switching
   */
  switchLanguage(lang: LanguageCode, options?: {
    updateUI?: boolean;
    notifyObservers?: boolean;
    validateTranslations?: boolean;
  }): Promise<void>;

  /**
   * Toggle language (Chinese <-> English)
   * @returns New language code
   */
  toggleLanguage(): Promise<LanguageCode>;

  /**
   * Get unified translation text with dot notation support
   * @param key Translation key with dot notation
   * @param lang Language code (optional)
   * @param options Additional options
   * @returns Translation value
   */
  getText(key: string, lang?: LanguageCode | null, options?: {
    fallback?: string;
    interpolation?: Record<string, string>;
    escapeHtml?: boolean;
  }): TranslationValue;

  /**
   * Register translation namespace
   * @param namespace Namespace identifier
   * @param translations Translation data
   */
  registerTranslations(namespace: string, translations: Record<string, TranslationData>): void;

  /**
   * Preload translations for better performance
   * @param namespaces Namespaces to preload
   */
  preloadTranslations(namespaces: string[]): Promise<void>;

  /**
   * Validate translation completeness
   * @param namespace Namespace to validate
   * @param requiredKeys Required translation keys
   * @returns Validation result
   */
  validateTranslations(namespace: string, requiredKeys: string[]): ValidationResult;

  /**
   * Enable unified language observer for automatic DOM updates
   * @param rootElement Root element to observe
   */
  enableUnifiedObserver(rootElement?: HTMLElement): void;

  /**
   * Disable unified language observer
   */
  disableUnifiedObserver(): void;

  /**
   * Clear translation cache
   * @param namespace Optional namespace to clear (clears all if not specified)
   */
  clearCache(namespace?: string): void;

  /**
   * Get current language from base manager
   */
  getCurrentLanguage(): LanguageCode;

  /**
   * Check if manager is fully initialized
   */
  isInitialized(): boolean;

  /**
   * Get available namespaces
   */
  getAvailableNamespaces(): string[];

  /**
   * Cleanup resources
   */
  destroy(): void;
}