/**
 * Unified Language Manager - 統一語言管理器
 * 
 * 一個功能完整、安全優先的多語言管理解決方案
 * 
 * 特性：
 * - 🌐 多語言支援 (i18n/l10n)
 * - 🚀 效能優化 (智能快取、增量更新)
 * - 🔒 安全防護 (XSS 防護、輸入驗證)
 * - 🎯 TypeScript 支援
 * - ♿ 無障礙友善 (WCAG 2.1 AA)
 * - 🐛 開發工具 (調試面板、效能監控)
 * 
 * @version 3.1.4
 * @author DB Card Storage Team
 * @license MIT
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' 
        ? factory(exports) 
        : typeof define === 'function' && define.amd 
        ? define(['exports'], factory) 
        : (global = typeof globalThis !== 'undefined' ? globalThis : global || self, 
           factory(global.UnifiedLanguageManager = {}));
}(this, (function (exports) { 
    'use strict';

    // ================================================================
    // 核心常數和配置
    // ================================================================

    const VERSION = '3.1.4';
    
    const DEFAULT_CONFIG = {
        supportedLanguages: ['zh-TW', 'en-US'],
        defaultLanguage: 'zh-TW',
        fallbackLanguage: 'zh-TW',
        translationPath: 'assets/translations',
        enableCache: true,
        enableValidation: true,
        enablePerformanceMonitoring: false,
        enableDebugPanel: false,
        maxCacheSize: 100,
        cacheTTL: 86400000, // 24 hours
        securityMode: 'strict'
    };

    const LANGUAGE_NAMES = {
        'zh-TW': '繁體中文',
        'en-US': 'English'
    };

    // ================================================================
    // 工具函式
    // ================================================================

    /**
     * 深度合併物件
     */
    function deepMerge(target, source) {
        const result = { ...target };
        
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });
        
        return result;
    }

    /**
     * HTML 編碼防護 XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 驗證翻譯鍵值格式
     */
    function isValidTranslationKey(key) {
        return typeof key === 'string' && /^[a-zA-Z0-9._-]+$/.test(key);
    }

    /**
     * 生成唯一 ID
     */
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * 安全的 JSON 解析
     */
    function safeJsonParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('[UnifiedLanguageManager] JSON parse error:', error);
            return fallback;
        }
    }

    // ================================================================
    // 事件發射器
    // ================================================================

    class EventEmitter {
        constructor() {
            this.events = {};
        }

        on(event, listener) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(listener);
            return this;
        }

        off(event, listener) {
            if (!this.events[event]) return this;
            
            const index = this.events[event].indexOf(listener);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
            return this;
        }

        emit(event, ...args) {
            if (!this.events[event]) return this;
            
            this.events[event].forEach(listener => {
                try {
                    listener.apply(this, args);
                } catch (error) {
                    console.error('[EventEmitter] Listener error:', error);
                }
            });
            return this;
        }

        once(event, listener) {
            const onceListener = (...args) => {
                this.off(event, onceListener);
                listener.apply(this, args);
            };
            return this.on(event, onceListener);
        }
    }

    // ================================================================
    // 智能快取管理器
    // ================================================================

    class SmartCache {
        constructor(options = {}) {
            this.maxSize = options.maxSize || 100;
            this.ttl = options.ttl || 86400000; // 24 hours
            this.cache = new Map();
            this.accessTimes = new Map();
            this.stats = { hits: 0, misses: 0 };
        }

        get(key) {
            const item = this.cache.get(key);
            
            if (!item) {
                this.stats.misses++;
                return null;
            }

            // 檢查 TTL
            if (Date.now() - item.timestamp > this.ttl) {
                this.delete(key);
                this.stats.misses++;
                return null;
            }

            // 更新存取時間 (LRU)
            this.accessTimes.set(key, Date.now());
            this.stats.hits++;
            return item.value;
        }

        set(key, value, customTTL = null) {
            const ttl = customTTL || this.ttl;
            
            // 檢查快取大小限制
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                this._evictLeastRecentlyUsed();
            }

            this.cache.set(key, {
                value,
                timestamp: Date.now(),
                ttl
            });
            this.accessTimes.set(key, Date.now());
            
            return this;
        }

        delete(key) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
            return this;
        }

        clear() {
            this.cache.clear();
            this.accessTimes.clear();
            this.stats = { hits: 0, misses: 0 };
            return this;
        }

        _evictLeastRecentlyUsed() {
            let lruKey = null;
            let oldestTime = Date.now();

            this.accessTimes.forEach((time, key) => {
                if (time < oldestTime) {
                    oldestTime = time;
                    lruKey = key;
                }
            });

            if (lruKey) {
                this.delete(lruKey);
            }
        }

        getStats() {
            const total = this.stats.hits + this.stats.misses;
            return {
                size: this.cache.size,
                hits: this.stats.hits,
                misses: this.stats.misses,
                hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : 0
            };
        }

        cleanup() {
            const now = Date.now();
            const keysToDelete = [];

            this.cache.forEach((item, key) => {
                if (now - item.timestamp > item.ttl) {
                    keysToDelete.push(key);
                }
            });

            keysToDelete.forEach(key => this.delete(key));
            return keysToDelete.length;
        }
    }

    // ================================================================
    // 翻譯驗證器
    // ================================================================

    class TranslationValidator {
        constructor(options = {}) {
            this.securityMode = options.securityMode || 'strict';
        }

        validateTranslationData(translations, language) {
            const errors = [];
            const warnings = [];

            try {
                this._validateStructure(translations, '', errors, warnings);
                this._validateSecurity(translations, '', errors, warnings);
            } catch (error) {
                errors.push({
                    type: 'VALIDATION_ERROR',
                    message: error.message,
                    language
                });
            }

            return { errors, warnings, isValid: errors.length === 0 };
        }

        _validateStructure(obj, path, errors, warnings) {
            if (!obj || typeof obj !== 'object') {
                errors.push({
                    type: 'INVALID_STRUCTURE',
                    message: `Invalid translation structure at ${path}`,
                    path
                });
                return;
            }

            Object.entries(obj).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;

                if (!isValidTranslationKey(key)) {
                    errors.push({
                        type: 'INVALID_KEY',
                        message: `Invalid translation key: ${key}`,
                        path: currentPath
                    });
                }

                if (typeof value === 'string') {
                    this._validateTranslationValue(value, currentPath, warnings);
                } else if (typeof value === 'object') {
                    this._validateStructure(value, currentPath, errors, warnings);
                } else {
                    errors.push({
                        type: 'INVALID_VALUE_TYPE',
                        message: `Translation value must be string or object: ${currentPath}`,
                        path: currentPath
                    });
                }
            });
        }

        _validateSecurity(obj, path, errors, warnings) {
            if (typeof obj === 'string') {
                if (this._containsXSS(obj)) {
                    errors.push({
                        type: 'SECURITY_XSS',
                        message: `Potential XSS detected: ${path}`,
                        path
                    });
                }
            } else if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    this._validateSecurity(value, currentPath, errors, warnings);
                });
            }
        }

        _validateTranslationValue(value, path, warnings) {
            // 檢查空字串
            if (value.trim() === '') {
                warnings.push({
                    type: 'EMPTY_TRANSLATION',
                    message: `Empty translation: ${path}`,
                    path
                });
            }

            // 檢查異常長度
            if (value.length > 1000) {
                warnings.push({
                    type: 'LONG_TRANSLATION',
                    message: `Unusually long translation: ${path}`,
                    path
                });
            }
        }

        _containsXSS(text) {
            const xssPatterns = [
                /<script[^>]*>/i,
                /javascript:/i,
                /on\w+\s*=/i,
                /<iframe[^>]*>/i,
                /<object[^>]*>/i,
                /<embed[^>]*>/i
            ];

            return xssPatterns.some(pattern => pattern.test(text));
        }

        sanitizeTranslationValue(value) {
            if (typeof value !== 'string') return value;
            
            // HTML 編碼
            return escapeHtml(value);
        }
    }

    // ================================================================
    // 效能監控器
    // ================================================================

    class PerformanceMonitor {
        constructor() {
            this.metrics = new Map();
            this.measurements = [];
            this.isEnabled = false;
        }

        enable() {
            this.isEnabled = true;
            return this;
        }

        disable() {
            this.isEnabled = false;
            return this;
        }

        startMeasurement(name) {
            if (!this.isEnabled) return;
            
            this.metrics.set(name, {
                startTime: performance.now(),
                startMemory: this._getMemoryUsage()
            });
        }

        endMeasurement(name) {
            if (!this.isEnabled || !this.metrics.has(name)) return 0;
            
            const start = this.metrics.get(name);
            const endTime = performance.now();
            const duration = endTime - start.startTime;
            
            this.measurements.push({
                name,
                duration,
                timestamp: Date.now(),
                memoryDelta: this._getMemoryUsage() - start.startMemory
            });

            this.metrics.delete(name);
            
            // 限制記錄數量
            if (this.measurements.length > 100) {
                this.measurements = this.measurements.slice(-50);
            }

            return duration;
        }

        getLatestMetrics() {
            const recent = this.measurements.slice(-10);
            
            return {
                languageSwitchTime: this._getAverageByName(recent, 'language_switch'),
                memoryUsage: this._getMemoryUsage(),
                cacheHitRate: this._getCacheHitRate(),
                domUpdateTime: this._getAverageByName(recent, 'dom_update'),
                measurementCount: this.measurements.length
            };
        }

        _getMemoryUsage() {
            if (performance.memory) {
                return performance.memory.usedJSHeapSize;
            }
            return 0;
        }

        _getAverageByName(measurements, name) {
            const filtered = measurements.filter(m => m.name === name);
            if (filtered.length === 0) return null;
            
            const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
            return Math.round(sum / filtered.length);
        }

        _getCacheHitRate() {
            // 這會由主要的語言管理器提供
            return null;
        }

        exportMetrics() {
            return {
                measurements: [...this.measurements],
                summary: this.getLatestMetrics(),
                timestamp: new Date().toISOString()
            };
        }
    }

    // ================================================================
    // 主要的統一語言管理器
    // ================================================================

    class UnifiedLanguageManager extends EventEmitter {
        constructor(config = {}) {
            super();
            
            this.config = deepMerge(DEFAULT_CONFIG, config);
            this.currentLanguage = this.config.defaultLanguage;
            this.translations = {};
            this.loadedLanguages = new Set();
            this.isLoading = false;
            
            // 子系統
            this.cache = new SmartCache({
                maxSize: this.config.maxCacheSize,
                ttl: this.config.cacheTTL
            });
            this.validator = new TranslationValidator({
                securityMode: this.config.securityMode
            });
            this.performance = new PerformanceMonitor();
            
            if (this.config.enablePerformanceMonitoring) {
                this.performance.enable();
            }

            // 初始化
            this._initialize();
        }

        // ============================================================
        // 公共 API
        // ============================================================

        /**
         * 獲取翻譯文字
         */
        getText(key, fallback = key) {
            if (!isValidTranslationKey(key)) {
                console.warn('[UnifiedLanguageManager] Invalid translation key:', key);
                return fallback;
            }

            const cacheKey = `${this.currentLanguage}:${key}`;
            let translation = this.cache.get(cacheKey);

            if (translation === null) {
                translation = this._getTranslationByPath(key);
                if (translation !== null) {
                    this.cache.set(cacheKey, translation);
                }
            }

            const result = translation !== null ? translation : fallback;
            
            // 安全檢查
            if (this.config.securityMode === 'strict' && typeof result === 'string') {
                return this.validator.sanitizeTranslationValue(result);
            }

            return result;
        }

        /**
         * 切換語言
         */
        async switchLanguage(language) {
            if (!this.isLanguageSupported(language)) {
                console.error('[UnifiedLanguageManager] Unsupported language:', language);
                return false;
            }

            if (language === this.currentLanguage) {
                return true;
            }

            this.performance.startMeasurement('language_switch');
            
            try {
                const previousLanguage = this.currentLanguage;
                
                await this._loadTranslation(language);
                this.currentLanguage = language;
                
                // 清除快取
                this.cache.clear();
                
                // 儲存偏好設定
                this._saveLanguagePreference(language);
                
                // 更新 DOM
                this._updateDocumentLanguage(language);
                
                // 發射事件
                this.emit('languageChanged', {
                    language,
                    previousLanguage,
                    timestamp: Date.now()
                });

                const switchTime = this.performance.endMeasurement('language_switch');
                console.log(`[UnifiedLanguageManager] Language switched to ${language} in ${switchTime}ms`);
                
                return true;
            } catch (error) {
                console.error('[UnifiedLanguageManager] Failed to switch language:', error);
                this.performance.endMeasurement('language_switch');
                return false;
            }
        }

        /**
         * 套用翻譯到 DOM 元素
         */
        applyTranslations() {
            this.performance.startMeasurement('dom_update');
            
            try {
                // 處理 data-translate 屬性
                const elements = document.querySelectorAll('[data-translate]');
                elements.forEach(element => {
                    const key = element.getAttribute('data-translate');
                    if (key) {
                        const translation = this.getText(key, element.textContent);
                        element.textContent = translation;
                    }
                });

                // 處理 data-translate-placeholder 屬性
                const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
                placeholderElements.forEach(element => {
                    const key = element.getAttribute('data-translate-placeholder');
                    if (key) {
                        const translation = this.getText(key, element.placeholder);
                        element.placeholder = translation;
                    }
                });

                // 處理 data-translate-aria 屬性
                const ariaElements = document.querySelectorAll('[data-translate-aria]');
                ariaElements.forEach(element => {
                    const key = element.getAttribute('data-translate-aria');
                    if (key) {
                        const translation = this.getText(key, element.getAttribute('aria-label'));
                        element.setAttribute('aria-label', translation);
                    }
                });

                this.performance.endMeasurement('dom_update');
                
            } catch (error) {
                console.error('[UnifiedLanguageManager] Failed to apply translations:', error);
                this.performance.endMeasurement('dom_update');
            }
        }

        /**
         * 獲取目前語言
         */
        getCurrentLanguage() {
            return this.currentLanguage;
        }

        /**
         * 獲取支援的語言
         */
        getSupportedLanguages() {
            return [...this.config.supportedLanguages];
        }

        /**
         * 檢查是否支援語言
         */
        isLanguageSupported(language) {
            return this.config.supportedLanguages.includes(language);
        }

        /**
         * 獲取語言名稱
         */
        getLanguageName(language) {
            return LANGUAGE_NAMES[language] || language;
        }

        /**
         * 驗證翻譯
         */
        validateTranslations(language = this.currentLanguage) {
            const translations = this.translations[language];
            if (!translations) {
                return { isValid: false, errors: [{ type: 'NO_TRANSLATIONS', message: 'No translations loaded' }] };
            }

            return this.validator.validateTranslationData(translations, language);
        }

        /**
         * 獲取快取統計
         */
        getCacheStats() {
            return this.cache.getStats();
        }

        /**
         * 獲取效能指標
         */
        getPerformanceMetrics() {
            const metrics = this.performance.getLatestMetrics();
            const cacheStats = this.getCacheStats();
            
            return {
                ...metrics,
                cacheHitRate: parseFloat(cacheStats.hitRate)
            };
        }

        /**
         * 清理資源
         */
        destroy() {
            this.cache.clear();
            this.translations = {};
            this.loadedLanguages.clear();
            this.events = {};
            
            // 移除 DOM 事件監聽器
            if (typeof document !== 'undefined') {
                document.removeEventListener('DOMContentLoaded', this._boundDOMContentLoaded);
            }
        }

        // ============================================================
        // 私有方法
        // ============================================================

        _initialize() {
            this._loadLanguagePreference();
            
            if (typeof document !== 'undefined') {
                if (document.readyState === 'loading') {
                    this._boundDOMContentLoaded = this._onDOMContentLoaded.bind(this);
                    document.addEventListener('DOMContentLoaded', this._boundDOMContentLoaded);
                } else {
                    this._onDOMContentLoaded();
                }
            }
        }

        _onDOMContentLoaded() {
            // 初始載入翻譯
            this._loadTranslation(this.currentLanguage).then(() => {
                this.applyTranslations();
            }).catch(error => {
                console.error('[UnifiedLanguageManager] Initial translation load failed:', error);
            });
        }

        async _loadTranslation(language) {
            if (this.loadedLanguages.has(language)) {
                return this.translations[language];
            }

            this.isLoading = true;
            
            try {
                const fileName = this._getTranslationFileName(language);
                const url = `${this.config.translationPath}/${fileName}.json`;
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to load translation: ${response.status} ${response.statusText}`);
                }

                const translations = await response.json();
                
                // 驗證翻譯資料
                if (this.config.enableValidation) {
                    const validation = this.validator.validateTranslationData(translations, language);
                    if (!validation.isValid) {
                        console.error('[UnifiedLanguageManager] Translation validation failed:', validation.errors);
                    }
                    if (validation.warnings.length > 0) {
                        console.warn('[UnifiedLanguageManager] Translation warnings:', validation.warnings);
                    }
                }

                this.translations[language] = translations;
                this.loadedLanguages.add(language);
                
                return translations;
                
            } finally {
                this.isLoading = false;
            }
        }

        _getTranslationFileName(language) {
            const mapping = {
                'zh-TW': 'zh',
                'en-US': 'en'
            };
            return mapping[language] || language.toLowerCase();
        }

        _getTranslationByPath(key) {
            const keys = key.split('.');
            let value = this.translations[this.currentLanguage];

            for (const k of keys) {
                if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
                    value = value[k];
                } else {
                    return null;
                }
            }

            return typeof value === 'string' ? value : null;
        }

        _saveLanguagePreference(language) {
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('unifiedLanguageManager.preferredLanguage', language);
                } catch (error) {
                    console.warn('[UnifiedLanguageManager] Failed to save language preference:', error);
                }
            }
        }

        _loadLanguagePreference() {
            if (typeof localStorage !== 'undefined') {
                try {
                    const saved = localStorage.getItem('unifiedLanguageManager.preferredLanguage');
                    if (saved && this.isLanguageSupported(saved)) {
                        this.currentLanguage = saved;
                    }
                } catch (error) {
                    console.warn('[UnifiedLanguageManager] Failed to load language preference:', error);
                }
            }
        }

        _updateDocumentLanguage(language) {
            if (typeof document !== 'undefined') {
                document.documentElement.lang = language;
            }
        }
    }

    // ================================================================
    // 框架整合輔助工具
    // ================================================================

    const FrameworkIntegrations = {
        /**
         * React Hook
         */
        useLanguageManager: function(manager) {
            if (typeof React === 'undefined') {
                throw new Error('React is not available');
            }

            const [language, setLanguage] = React.useState(manager.getCurrentLanguage());
            
            React.useEffect(() => {
                const handleLanguageChange = ({ language }) => {
                    setLanguage(language);
                };
                
                manager.on('languageChanged', handleLanguageChange);
                
                return () => {
                    manager.off('languageChanged', handleLanguageChange);
                };
            }, [manager]);

            const getText = React.useCallback((key, fallback) => {
                return manager.getText(key, fallback);
            }, [manager, language]);

            const switchLanguage = React.useCallback((lang) => {
                return manager.switchLanguage(lang);
            }, [manager]);

            return { language, getText, switchLanguage, manager };
        },

        /**
         * Vue 3 Composition API
         */
        useLanguageManagerVue: function(manager) {
            if (typeof Vue === 'undefined') {
                throw new Error('Vue is not available');
            }

            const language = Vue.ref(manager.getCurrentLanguage());

            const handleLanguageChange = ({ language: newLanguage }) => {
                language.value = newLanguage;
            };

            Vue.onMounted(() => {
                manager.on('languageChanged', handleLanguageChange);
            });

            Vue.onUnmounted(() => {
                manager.off('languageChanged', handleLanguageChange);
            });

            const getText = (key, fallback) => {
                return manager.getText(key, fallback);
            };

            const switchLanguage = (lang) => {
                return manager.switchLanguage(lang);
            };

            return { language: Vue.readonly(language), getText, switchLanguage, manager };
        },

        /**
         * Angular Service
         */
        createAngularService: function(manager) {
            if (typeof ng === 'undefined') {
                throw new Error('Angular is not available');
            }

            return class LanguageService {
                constructor() {
                    this.manager = manager;
                    this.language$ = new rxjs.Subject();
                    
                    this.manager.on('languageChanged', ({ language }) => {
                        this.language$.next(language);
                    });
                }

                getCurrentLanguage() {
                    return this.manager.getCurrentLanguage();
                }

                getText(key, fallback) {
                    return this.manager.getText(key, fallback);
                }

                switchLanguage(language) {
                    return this.manager.switchLanguage(language);
                }

                onLanguageChange() {
                    return this.language$.asObservable();
                }
            };
        }
    };

    // ================================================================
    // 匯出
    // ================================================================

    exports.UnifiedLanguageManager = UnifiedLanguageManager;
    exports.SmartCache = SmartCache;
    exports.TranslationValidator = TranslationValidator;
    exports.PerformanceMonitor = PerformanceMonitor;
    exports.FrameworkIntegrations = FrameworkIntegrations;
    exports.VERSION = VERSION;
    exports.DEFAULT_CONFIG = DEFAULT_CONFIG;

    // 預設實例
    exports.default = UnifiedLanguageManager;

    Object.defineProperty(exports, '__esModule', { value: true });

})));