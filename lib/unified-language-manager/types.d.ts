/**
 * Unified Language Manager TypeScript 型別定義
 * @version 3.1.4
 */

// ================================================================
// 基本型別
// ================================================================

export type LanguageCode = 'zh-TW' | 'en-US';

export interface TranslationData {
    [key: string]: string | TranslationData;
}

export interface UnifiedLanguageManagerConfig {
    supportedLanguages?: LanguageCode[];
    defaultLanguage?: LanguageCode;
    fallbackLanguage?: LanguageCode;
    translationPath?: string;
    enableCache?: boolean;
    enableValidation?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableDebugPanel?: boolean;
    maxCacheSize?: number;
    cacheTTL?: number;
    securityMode?: 'strict' | 'normal' | 'disabled';
}

// ================================================================
// 事件相關型別
// ================================================================

export interface LanguageChangeEventData {
    language: LanguageCode;
    previousLanguage: LanguageCode;
    timestamp: number;
}

export interface LanguageChangeEvent extends CustomEvent<LanguageChangeEventData> {
    detail: LanguageChangeEventData;
}

// ================================================================
// 驗證相關型別
// ================================================================

export interface ValidationError {
    type: 'VALIDATION_ERROR' | 'INVALID_STRUCTURE' | 'INVALID_KEY' | 'INVALID_VALUE_TYPE' | 'SECURITY_XSS';
    message: string;
    path?: string;
    language?: LanguageCode;
}

export interface ValidationWarning {
    type: 'EMPTY_TRANSLATION' | 'LONG_TRANSLATION' | 'MISSING_KEY';
    message: string;
    path?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings?: ValidationWarning[];
}

export interface SecurityCheckResult {
    isSafe: boolean;
    issues: string[];
    sanitizedValue?: string;
}

// ================================================================
// 效能相關型別
// ================================================================

export interface PerformanceMetrics {
    languageSwitchTime: number | null;
    memoryUsage: number;
    cacheHitRate: number | null;
    domUpdateTime: number | null;
    measurementCount: number;
}

export interface PerformanceMeasurement {
    name: string;
    duration: number;
    timestamp: number;
    memoryDelta: number;
}

export interface PerformanceExport {
    measurements: PerformanceMeasurement[];
    summary: PerformanceMetrics;
    timestamp: string;
}

// ================================================================
// 快取相關型別
// ================================================================

export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: string;
}

export interface CacheItem<T = any> {
    value: T;
    timestamp: number;
    ttl: number;
}

export interface SmartCacheOptions {
    maxSize?: number;
    ttl?: number;
}

// ================================================================
// 核心類別
// ================================================================

export declare class EventEmitter {
    constructor();
    on(event: string, listener: Function): this;
    off(event: string, listener: Function): this;
    emit(event: string, ...args: any[]): this;
    once(event: string, listener: Function): this;
}

export declare class SmartCache {
    constructor(options?: SmartCacheOptions);
    
    get(key: string): any;
    set(key: string, value: any, customTTL?: number): this;
    delete(key: string): this;
    clear(): this;
    getStats(): CacheStats;
    cleanup(): number;
}

export declare class TranslationValidator {
    constructor(options?: { securityMode?: 'strict' | 'normal' | 'disabled' });
    
    validateTranslationData(translations: TranslationData, language: LanguageCode): ValidationResult;
    checkTranslationSecurity(value: string): SecurityCheckResult;
    sanitizeTranslationValue(value: string): string;
}

export declare class PerformanceMonitor {
    constructor();
    
    enable(): this;
    disable(): this;
    startMeasurement(name: string): void;
    endMeasurement(name: string): number;
    getLatestMetrics(): PerformanceMetrics;
    exportMetrics(): PerformanceExport;
}

export declare class UnifiedLanguageManager extends EventEmitter {
    constructor(config?: UnifiedLanguageManagerConfig);
    
    // 公共屬性
    readonly currentLanguage: LanguageCode;
    readonly isLoading: boolean;
    readonly config: Required<UnifiedLanguageManagerConfig>;
    
    // 核心方法
    getText(key: string, fallback?: string): string;
    switchLanguage(language: LanguageCode): Promise<boolean>;
    applyTranslations(): void;
    
    // 語言相關
    getCurrentLanguage(): LanguageCode;
    getSupportedLanguages(): LanguageCode[];
    isLanguageSupported(language: string): boolean;
    getLanguageName(language: LanguageCode): string;
    
    // 驗證和統計
    validateTranslations(language?: LanguageCode): ValidationResult;
    getCacheStats(): CacheStats;
    getPerformanceMetrics(): PerformanceMetrics;
    
    // 生命週期
    destroy(): void;
    
    // 事件方法 (繼承自 EventEmitter)
    on(event: 'languageChanged', listener: (data: LanguageChangeEventData) => void): this;
    on(event: string, listener: Function): this;
    
    off(event: 'languageChanged', listener: (data: LanguageChangeEventData) => void): this;
    off(event: string, listener: Function): this;
    
    emit(event: 'languageChanged', data: LanguageChangeEventData): this;
    emit(event: string, ...args: any[]): this;
}

// ================================================================
// 框架整合型別
// ================================================================

export interface ReactHookResult {
    language: LanguageCode;
    getText: (key: string, fallback?: string) => string;
    switchLanguage: (language: LanguageCode) => Promise<boolean>;
    manager: UnifiedLanguageManager;
}

export interface VueCompositionResult {
    language: Readonly<{ value: LanguageCode }>;
    getText: (key: string, fallback?: string) => string;
    switchLanguage: (language: LanguageCode) => Promise<boolean>;
    manager: UnifiedLanguageManager;
}

export declare namespace FrameworkIntegrations {
    function useLanguageManager(manager: UnifiedLanguageManager): ReactHookResult;
    function useLanguageManagerVue(manager: UnifiedLanguageManager): VueCompositionResult;
    function createAngularService(manager: UnifiedLanguageManager): any;
}

// ================================================================
// 常數和預設值
// ================================================================

export declare const VERSION: string;
export declare const DEFAULT_CONFIG: Required<UnifiedLanguageManagerConfig>;

// ================================================================
// 主要匯出
// ================================================================

export { UnifiedLanguageManager as default };

// ================================================================
// 全域型別擴展 (可選)
// ================================================================

declare global {
    interface Window {
        UnifiedLanguageManager?: typeof UnifiedLanguageManager;
        languageManager?: UnifiedLanguageManager;
    }
    
    interface Document {
        addEventListener(
            type: 'languageChanged', 
            listener: (event: LanguageChangeEvent) => void,
            options?: boolean | AddEventListenerOptions
        ): void;
        
        removeEventListener(
            type: 'languageChanged',
            listener: (event: LanguageChangeEvent) => void,
            options?: boolean | EventListenerOptions
        ): void;
    }
}

// ================================================================
// 工具型別
// ================================================================

export type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
        : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationData>;

// ================================================================
// 進階功能型別
// ================================================================

export interface DebugPanelOptions {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    theme?: 'dark' | 'light' | 'auto';
    enableExport?: boolean;
    enableSimulation?: boolean;
}

export interface LoadingOptions {
    showIndicator?: boolean;
    indicatorText?: string;
    timeout?: number;
}

export interface SecurityOptions {
    enableXSSProtection?: boolean;
    enableInputValidation?: boolean;
    allowHTML?: boolean;
    customSanitizer?: (input: string) => string;
}