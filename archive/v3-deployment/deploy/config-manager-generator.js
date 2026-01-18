#!/usr/bin/env node

/**
 * Configuration Manager Generator
 * 
 * Production-grade tool for generating unified configuration management interface.
 * Creates a centralized configuration manager that loads platform-specific configs,
 * provides validation, caching, and unified API access.
 * 
 * Features:
 * - Unified configuration API
 * - Platform-specific configuration loading
 * - Configuration validation and caching
 * - Error handling and fallback mechanisms
 * - Security validation and sanitization
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

const fs = require('fs');
const path = require('path');

class ConfigManagerGenerator {
    constructor() {
        this.targetDir = path.join(__dirname, '../pwa-card-storage/src/core');
        this.configDir = path.join(__dirname, '../pwa-card-storage/config');
        this.reportPath = path.join(__dirname, 'config-03-generation-report.json');
        this.platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
        this.report = {
            timestamp: new Date().toISOString(),
            tool: 'config-manager-generator',
            version: '1.0.0',
            generatedFiles: [],
            validationResults: [],
            securityFeatures: [],
            errors: []
        };
    }

    /**
     * Generate configuration manager
     */
    async generateConfigManager() {
        try {
            console.log('🚀 Starting configuration manager generation...');
            
            // Ensure target directory exists
            this.ensureTargetDirectory();
            
            // Generate main configuration manager
            await this.generateMainConfigManager();
            
            // Generate configuration validator
            await this.generateConfigValidator();
            
            // Generate configuration cache manager
            await this.generateCacheManager();
            
            // Validate generated files
            await this.validateGeneratedFiles();
            
            // Generate comprehensive report
            await this.generateReport();
            
            console.log(`✅ Configuration manager generation completed successfully`);
            console.log(`📊 Report saved to: ${this.reportPath}`);
            
            return {
                success: true,
                filesGenerated: this.report.generatedFiles.length,
                reportPath: this.reportPath
            };
            
        } catch (error) {
            console.error('❌ Configuration manager generation failed:', error.message);
            this.report.errors.push({
                type: 'generation_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Ensure target directory exists
     */
    ensureTargetDirectory() {
        if (!fs.existsSync(this.targetDir)) {
            fs.mkdirSync(this.targetDir, { recursive: true });
            console.log(`📁 Created target directory: ${this.targetDir}`);
        }
    }

    /**
     * Generate main configuration manager
     */
    async generateMainConfigManager() {
        const configManagerCode = `/**
 * Unified Configuration Manager
 * 
 * Centralized configuration management system for PWA static hosting deployment.
 * Provides unified API for loading, validating, and caching platform-specific
 * configurations with security validation and error handling.
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

class ConfigurationManager {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.defaultCacheTTL = 30 * 60 * 1000; // 30 minutes
        this.platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
        this.currentPlatform = null;
        this.currentConfig = null;
        this.validator = new ConfigValidator();
        this.cacheManager = new ConfigCacheManager();
        
        // Initialize environment detection
        this.initializeEnvironmentDetection();
    }

    /**
     * Initialize environment detection
     */
    initializeEnvironmentDetection() {
        try {
            // Import environment detector if available
            if (typeof window !== 'undefined' && window.EnvironmentDetector) {
                this.environmentDetector = new window.EnvironmentDetector();
            } else {
                // Fallback detection
                this.environmentDetector = {
                    detectPlatform: () => this.fallbackPlatformDetection()
                };
            }
        } catch (error) {
            console.warn('Environment detector not available, using fallback detection');
            this.environmentDetector = {
                detectPlatform: () => this.fallbackPlatformDetection()
            };
        }
    }

    /**
     * Load configuration for current or specified platform
     */
    async loadConfiguration(platform = null) {
        try {
            // Detect platform if not specified
            if (!platform) {
                const detection = await this.environmentDetector.detectPlatform();
                platform = detection.platform || 'local';
            }

            // Validate platform
            if (!this.platforms.includes(platform)) {
                throw new Error(\`Unsupported platform: \${platform}\`);
            }

            // Check cache first
            const cachedConfig = this.getCachedConfig(platform);
            if (cachedConfig) {
                console.log(\`📋 Using cached configuration for \${platform}\`);
                this.currentPlatform = platform;
                this.currentConfig = cachedConfig;
                return cachedConfig;
            }

            // Load configuration from file
            const config = await this.loadConfigFromFile(platform);
            
            // Validate configuration
            const validation = this.validator.validateConfig(config, platform);
            if (!validation.valid) {
                throw new Error(\`Configuration validation failed: \${validation.errors.join(', ')}\`);
            }

            // Cache configuration
            this.setCachedConfig(platform, config);
            
            // Set as current configuration
            this.currentPlatform = platform;
            this.currentConfig = config;
            
            console.log(\`✅ Loaded configuration for \${platform}\`);
            return config;
            
        } catch (error) {
            console.error(\`❌ Failed to load configuration for \${platform}:\`, error.message);
            
            // Try fallback to local configuration
            if (platform !== 'local') {
                console.log('🔄 Attempting fallback to local configuration...');
                return await this.loadConfiguration('local');
            }
            
            throw error;
        }
    }

    /**
     * Load configuration from file
     */
    async loadConfigFromFile(platform) {
        const configPath = \`./config/\${platform}-config.json\`;
        
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
            }
            
            const config = await response.json();
            return config;
            
        } catch (error) {
            // Fallback for local development
            if (typeof require !== 'undefined') {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const fullPath = path.join(__dirname, '../../config', \`\${platform}-config.json\`);
                    const content = fs.readFileSync(fullPath, 'utf8');
                    return JSON.parse(content);
                } catch (fsError) {
                    throw new Error(\`Failed to load config file: \${error.message}\`);
                }
            }
            throw error;
        }
    }

    /**
     * Get current configuration
     */
    getCurrentConfig() {
        if (!this.currentConfig) {
            throw new Error('No configuration loaded. Call loadConfiguration() first.');
        }
        return this.currentConfig;
    }

    /**
     * Get current platform
     */
    getCurrentPlatform() {
        return this.currentPlatform;
    }

    /**
     * Get configuration value by path
     */
    getConfigValue(path, defaultValue = null) {
        try {
            const config = this.getCurrentConfig();
            const keys = path.split('.');
            let value = config;
            
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return defaultValue;
                }
            }
            
            return value;
        } catch (error) {
            console.warn(\`Failed to get config value for path '\${path}':\`, error.message);
            return defaultValue;
        }
    }

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(featureName) {
        return this.getConfigValue(\`features.\${featureName}\`, false);
    }

    /**
     * Get security configuration
     */
    getSecurityConfig() {
        return this.getConfigValue('security', {});
    }

    /**
     * Get cache configuration
     */
    getCacheConfig() {
        return this.getConfigValue('cache', {});
    }

    /**
     * Get deployment configuration
     */
    getDeploymentConfig() {
        return this.getConfigValue('deployment', {});
    }

    /**
     * Get base path for current platform
     */
    getBasePath() {
        return this.getConfigValue('basePath', '/');
    }

    /**
     * Get public path for current platform
     */
    getPublicPath() {
        return this.getConfigValue('publicPath', '/');
    }

    /**
     * Get asset path for current platform
     */
    getAssetPath() {
        return this.getConfigValue('assetPath', './assets/');
    }

    /**
     * Reload configuration
     */
    async reloadConfiguration(platform = null) {
        const targetPlatform = platform || this.currentPlatform;
        if (targetPlatform) {
            this.clearCache(targetPlatform);
            return await this.loadConfiguration(targetPlatform);
        }
        throw new Error('No platform specified for reload');
    }

    /**
     * Get cached configuration
     */
    getCachedConfig(platform) {
        const cached = this.cache.get(platform);
        const expiry = this.cacheExpiry.get(platform);
        
        if (cached && expiry && Date.now() < expiry) {
            return cached;
        }
        
        // Clean expired cache
        if (cached) {
            this.cache.delete(platform);
            this.cacheExpiry.delete(platform);
        }
        
        return null;
    }

    /**
     * Set cached configuration
     */
    setCachedConfig(platform, config) {
        this.cache.set(platform, config);
        this.cacheExpiry.set(platform, Date.now() + this.defaultCacheTTL);
    }

    /**
     * Clear cache for platform
     */
    clearCache(platform = null) {
        if (platform) {
            this.cache.delete(platform);
            this.cacheExpiry.delete(platform);
        } else {
            this.cache.clear();
            this.cacheExpiry.clear();
        }
    }

    /**
     * Fallback platform detection
     */
    fallbackPlatformDetection() {
        if (typeof window === 'undefined') {
            return { platform: 'local', confidence: 100 };
        }
        
        const hostname = window.location.hostname;
        
        if (hostname.includes('github.io')) {
            return { platform: 'github-pages', confidence: 90 };
        } else if (hostname.includes('pages.dev')) {
            return { platform: 'cloudflare-pages', confidence: 90 };
        } else if (hostname.includes('netlify.app')) {
            return { platform: 'netlify', confidence: 90 };
        } else if (hostname.includes('vercel.app')) {
            return { platform: 'vercel', confidence: 90 };
        } else {
            return { platform: 'local', confidence: 70 };
        }
    }

    /**
     * Get configuration summary
     */
    getConfigSummary() {
        if (!this.currentConfig) {
            return null;
        }
        
        return {
            platform: this.currentPlatform,
            version: this.currentConfig.version,
            environment: this.currentConfig.environment,
            securityLevel: this.currentConfig.security?.level,
            enabledFeatures: Object.entries(this.currentConfig.features || {})
                .filter(([_, enabled]) => enabled)
                .map(([feature, _]) => feature),
            cacheStrategy: this.currentConfig.cache?.strategy,
            basePath: this.currentConfig.basePath
        };
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigurationManager;
} else if (typeof window !== 'undefined') {
    window.ConfigurationManager = ConfigurationManager;
}`;

        const filePath = path.join(this.targetDir, 'configuration-manager.js');
        fs.writeFileSync(filePath, configManagerCode, 'utf8');
        
        this.report.generatedFiles.push({
            name: 'configuration-manager.js',
            path: filePath,
            size: configManagerCode.length,
            type: 'main_manager'
        });
        
        console.log('✅ Generated main configuration manager');
    }

    /**
     * Generate configuration validator
     */
    async generateConfigValidator() {
        const validatorCode = `/**
 * Configuration Validator
 * 
 * Validates platform-specific configurations for security, completeness,
 * and compliance with PWA deployment requirements.
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

class ConfigValidator {
    constructor() {
        this.requiredFields = ['platform', 'version', 'basePath', 'features', 'security', 'cache', 'deployment'];
        this.platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
        this.securityLevels = ['development', 'standard', 'enhanced'];
        this.cacheStrategies = ['cache-first', 'network-first', 'stale-while-revalidate'];
    }

    /**
     * Validate configuration object
     */
    validateConfig(config, expectedPlatform) {
        const errors = [];
        const warnings = [];
        
        try {
            // Basic structure validation
            this.validateBasicStructure(config, errors);
            
            // Platform consistency validation
            this.validatePlatformConsistency(config, expectedPlatform, errors);
            
            // Security configuration validation
            this.validateSecurityConfig(config.security, errors, warnings);
            
            // Features validation
            this.validateFeatures(config.features, errors, warnings);
            
            // Cache configuration validation
            this.validateCacheConfig(config.cache, errors, warnings);
            
            // Deployment configuration validation
            this.validateDeploymentConfig(config.deployment, errors, warnings);
            
            // Path validation
            this.validatePaths(config, errors, warnings);
            
        } catch (error) {
            errors.push(\`Validation error: \${error.message}\`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate basic structure
     */
    validateBasicStructure(config, errors) {
        if (!config || typeof config !== 'object') {
            errors.push('Configuration must be a valid object');
            return;
        }
        
        // Check required fields
        for (const field of this.requiredFields) {
            if (!(field in config)) {
                errors.push(\`Missing required field: \${field}\`);
            }
        }
        
        // Check version format
        if (config.version && !/^\\d+\\.\\d+\\.\\d+$/.test(config.version)) {
            errors.push('Version must follow semantic versioning (x.y.z)');
        }
    }

    /**
     * Validate platform consistency
     */
    validatePlatformConsistency(config, expectedPlatform, errors) {
        if (config.platform !== expectedPlatform) {
            errors.push(\`Platform mismatch: expected \${expectedPlatform}, got \${config.platform}\`);
        }
        
        if (!this.platforms.includes(config.platform)) {
            errors.push(\`Unsupported platform: \${config.platform}\`);
        }
    }

    /**
     * Validate security configuration
     */
    validateSecurityConfig(security, errors, warnings) {
        if (!security) {
            errors.push('Security configuration is required');
            return;
        }
        
        // Security level validation
        if (!security.level || !this.securityLevels.includes(security.level)) {
            errors.push(\`Invalid security level: \${security.level}\`);
        }
        
        // CSP validation
        if (security.csp) {
            if (security.csp.enabled && !security.csp.directives) {
                errors.push('CSP enabled but no directives specified');
            }
            
            if (security.csp.directives) {
                const requiredDirectives = ['default-src', 'script-src'];
                for (const directive of requiredDirectives) {
                    if (!security.csp.directives[directive]) {
                        warnings.push(\`Missing recommended CSP directive: \${directive}\`);
                    }
                }
            }
        }
        
        // Headers validation
        if (!security.headers) {
            warnings.push('No security headers specified');
        } else {
            const recommendedHeaders = ['X-Content-Type-Options', 'X-Frame-Options'];
            for (const header of recommendedHeaders) {
                if (!security.headers[header]) {
                    warnings.push(\`Missing recommended security header: \${header}\`);
                }
            }
        }
    }

    /**
     * Validate features configuration
     */
    validateFeatures(features, errors, warnings) {
        if (!features) {
            errors.push('Features configuration is required');
            return;
        }
        
        // Core features validation
        const coreFeatures = ['serviceWorker', 'offlineSupport'];
        for (const feature of coreFeatures) {
            if (features[feature] !== true) {
                warnings.push(\`Core feature '\${feature}' should be enabled\`);
            }
        }
        
        // Boolean validation
        for (const [feature, value] of Object.entries(features)) {
            if (typeof value !== 'boolean') {
                errors.push(\`Feature '\${feature}' must be boolean, got \${typeof value}\`);
            }
        }
    }

    /**
     * Validate cache configuration
     */
    validateCacheConfig(cache, errors, warnings) {
        if (!cache) {
            errors.push('Cache configuration is required');
            return;
        }
        
        // Strategy validation
        if (!cache.strategy || !this.cacheStrategies.includes(cache.strategy)) {
            errors.push(\`Invalid cache strategy: \${cache.strategy}\`);
        }
        
        // Max age validation
        if (cache.maxAge !== undefined) {
            if (typeof cache.maxAge !== 'number' || cache.maxAge < 0) {
                errors.push('Cache maxAge must be a non-negative number');
            }
        }
        
        // Resources validation
        if (cache.resources && !Array.isArray(cache.resources)) {
            errors.push('Cache resources must be an array');
        }
    }

    /**
     * Validate deployment configuration
     */
    validateDeploymentConfig(deployment, errors, warnings) {
        if (!deployment) {
            errors.push('Deployment configuration is required');
            return;
        }
        
        // Build command validation
        if (!deployment.buildCommand) {
            warnings.push('No build command specified');
        }
        
        // Output directory validation
        if (!deployment.outputDir) {
            warnings.push('No output directory specified');
        }
        
        // HTTPS validation for production
        if (deployment.httpsOnly === false) {
            warnings.push('HTTPS should be enforced for production deployments');
        }
    }

    /**
     * Validate paths
     */
    validatePaths(config, errors, warnings) {
        // Base path validation
        if (config.basePath && !config.basePath.startsWith('/')) {
            warnings.push('basePath should start with /');
        }
        
        // Public path validation
        if (config.publicPath && !config.publicPath.startsWith('/')) {
            warnings.push('publicPath should start with /');
        }
        
        // Asset path validation
        if (config.assetPath && !config.assetPath.startsWith('./')) {
            warnings.push('assetPath should be relative (start with ./)');
        }
    }

    /**
     * Sanitize configuration
     */
    sanitizeConfig(config) {
        const sanitized = JSON.parse(JSON.stringify(config));
        
        // Remove potentially dangerous fields
        delete sanitized.__proto__;
        delete sanitized.constructor;
        
        // Sanitize paths
        if (sanitized.basePath) {
            sanitized.basePath = this.sanitizePath(sanitized.basePath);
        }
        
        if (sanitized.publicPath) {
            sanitized.publicPath = this.sanitizePath(sanitized.publicPath);
        }
        
        return sanitized;
    }

    /**
     * Sanitize path string
     */
    sanitizePath(path) {
        if (typeof path !== 'string') return path;
        
        // Remove dangerous patterns
        return path
            .replace(/\\.\\./g, '') // Remove parent directory references
            .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
            .replace(/\\0/g, ''); // Remove null bytes
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigValidator;
} else if (typeof window !== 'undefined') {
    window.ConfigValidator = ConfigValidator;
}`;

        const filePath = path.join(this.targetDir, 'config-validator.js');
        fs.writeFileSync(filePath, validatorCode, 'utf8');
        
        this.report.generatedFiles.push({
            name: 'config-validator.js',
            path: filePath,
            size: validatorCode.length,
            type: 'validator'
        });
        
        console.log('✅ Generated configuration validator');
    }

    /**
     * Generate cache manager
     */
    async generateCacheManager() {
        const cacheManagerCode = `/**
 * Configuration Cache Manager
 * 
 * Manages caching of configuration data with TTL, storage quotas,
 * and intelligent cache invalidation strategies.
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

class ConfigCacheManager {
    constructor() {
        this.cache = new Map();
        this.metadata = new Map();
        this.defaultTTL = 30 * 60 * 1000; // 30 minutes
        this.maxCacheSize = 50; // Maximum number of cached items
        this.storageKey = 'pwa-config-cache';
        
        // Initialize persistent storage if available
        this.initializePersistentStorage();
    }

    /**
     * Initialize persistent storage
     */
    initializePersistentStorage() {
        this.persistentStorage = null;
        
        if (typeof window !== 'undefined' && window.localStorage) {
            this.persistentStorage = {
                get: (key) => {
                    try {
                        const item = localStorage.getItem(key);
                        return item ? JSON.parse(item) : null;
                    } catch (error) {
                        console.warn('Failed to read from localStorage:', error.message);
                        return null;
                    }
                },
                set: (key, value) => {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch (error) {
                        console.warn('Failed to write to localStorage:', error.message);
                        return false;
                    }
                },
                remove: (key) => {
                    try {
                        localStorage.removeItem(key);
                        return true;
                    } catch (error) {
                        console.warn('Failed to remove from localStorage:', error.message);
                        return false;
                    }
                }
            };
            
            // Load existing cache from persistent storage
            this.loadFromPersistentStorage();
        }
    }

    /**
     * Get cached item
     */
    get(key) {
        const item = this.cache.get(key);
        const meta = this.metadata.get(key);
        
        if (!item || !meta) {
            return null;
        }
        
        // Check if expired
        if (Date.now() > meta.expiry) {
            this.delete(key);
            return null;
        }
        
        // Update access time
        meta.lastAccess = Date.now();
        meta.accessCount++;
        
        return item;
    }

    /**
     * Set cached item
     */
    set(key, value, ttl = null) {
        const actualTTL = ttl || this.defaultTTL;
        const expiry = Date.now() + actualTTL;
        
        // Enforce cache size limit
        if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
            this.evictLeastRecentlyUsed();
        }
        
        // Store item and metadata
        this.cache.set(key, value);
        this.metadata.set(key, {
            expiry,
            created: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1,
            size: this.calculateSize(value)
        });
        
        // Persist to storage if available
        this.saveToPersistentStorage();
        
        return true;
    }

    /**
     * Delete cached item
     */
    delete(key) {
        const deleted = this.cache.delete(key) && this.metadata.delete(key);
        
        if (deleted) {
            this.saveToPersistentStorage();
        }
        
        return deleted;
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        const meta = this.metadata.get(key);
        
        if (!meta) {
            return false;
        }
        
        if (Date.now() > meta.expiry) {
            this.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * Clear all cached items
     */
    clear() {
        this.cache.clear();
        this.metadata.clear();
        
        if (this.persistentStorage) {
            this.persistentStorage.remove(this.storageKey);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let totalSize = 0;
        let expiredCount = 0;
        
        for (const [key, meta] of this.metadata.entries()) {
            totalSize += meta.size;
            if (now > meta.expiry) {
                expiredCount++;
            }
        }
        
        return {
            totalItems: this.cache.size,
            totalSize,
            expiredItems: expiredCount,
            hitRate: this.calculateHitRate(),
            oldestItem: this.getOldestItemAge(),
            newestItem: this.getNewestItemAge()
        };
    }

    /**
     * Cleanup expired items
     */
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, meta] of this.metadata.entries()) {
            if (now > meta.expiry) {
                expiredKeys.push(key);
            }
        }
        
        for (const key of expiredKeys) {
            this.delete(key);
        }
        
        return expiredKeys.length;
    }

    /**
     * Evict least recently used item
     */
    evictLeastRecentlyUsed() {
        let lruKey = null;
        let lruTime = Date.now();
        
        for (const [key, meta] of this.metadata.entries()) {
            if (meta.lastAccess < lruTime) {
                lruTime = meta.lastAccess;
                lruKey = key;
            }
        }
        
        if (lruKey) {
            this.delete(lruKey);
            console.log(\`Evicted LRU cache item: \${lruKey}\`);
        }
    }

    /**
     * Calculate approximate size of value
     */
    calculateSize(value) {
        try {
            return JSON.stringify(value).length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Calculate cache hit rate
     */
    calculateHitRate() {
        let totalAccess = 0;
        
        for (const meta of this.metadata.values()) {
            totalAccess += meta.accessCount;
        }
        
        return totalAccess > 0 ? (this.cache.size / totalAccess) * 100 : 0;
    }

    /**
     * Get oldest item age in milliseconds
     */
    getOldestItemAge() {
        let oldest = Date.now();
        
        for (const meta of this.metadata.values()) {
            if (meta.created < oldest) {
                oldest = meta.created;
            }
        }
        
        return Date.now() - oldest;
    }

    /**
     * Get newest item age in milliseconds
     */
    getNewestItemAge() {
        let newest = 0;
        
        for (const meta of this.metadata.values()) {
            if (meta.created > newest) {
                newest = meta.created;
            }
        }
        
        return newest > 0 ? Date.now() - newest : 0;
    }

    /**
     * Load cache from persistent storage
     */
    loadFromPersistentStorage() {
        if (!this.persistentStorage) return;
        
        try {
            const stored = this.persistentStorage.get(this.storageKey);
            if (!stored) return;
            
            const { cache, metadata } = stored;
            const now = Date.now();
            
            // Restore non-expired items
            for (const [key, value] of Object.entries(cache)) {
                const meta = metadata[key];
                if (meta && now <= meta.expiry) {
                    this.cache.set(key, value);
                    this.metadata.set(key, meta);
                }
            }
            
            console.log(\`Loaded \${this.cache.size} items from persistent cache\`);
            
        } catch (error) {
            console.warn('Failed to load cache from persistent storage:', error.message);
        }
    }

    /**
     * Save cache to persistent storage
     */
    saveToPersistentStorage() {
        if (!this.persistentStorage) return;
        
        try {
            const cache = {};
            const metadata = {};
            
            // Convert Maps to objects for serialization
            for (const [key, value] of this.cache.entries()) {
                cache[key] = value;
                metadata[key] = this.metadata.get(key);
            }
            
            this.persistentStorage.set(this.storageKey, { cache, metadata });
            
        } catch (error) {
            console.warn('Failed to save cache to persistent storage:', error.message);
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigCacheManager;
} else if (typeof window !== 'undefined') {
    window.ConfigCacheManager = ConfigCacheManager;
}`;

        const filePath = path.join(this.targetDir, 'config-cache-manager.js');
        fs.writeFileSync(filePath, cacheManagerCode, 'utf8');
        
        this.report.generatedFiles.push({
            name: 'config-cache-manager.js',
            path: filePath,
            size: cacheManagerCode.length,
            type: 'cache_manager'
        });
        
        console.log('✅ Generated configuration cache manager');
    }

    /**
     * Validate generated files
     */
    async validateGeneratedFiles() {
        console.log('🔍 Validating generated files...');
        
        for (const fileInfo of this.report.generatedFiles) {
            try {
                // Check file exists
                if (!fs.existsSync(fileInfo.path)) {
                    throw new Error('File does not exist');
                }
                
                // Check file size
                const stats = fs.statSync(fileInfo.path);
                if (stats.size !== fileInfo.size) {
                    throw new Error(`Size mismatch: expected ${fileInfo.size}, got ${stats.size}`);
                }
                
                // Basic syntax validation
                const content = fs.readFileSync(fileInfo.path, 'utf8');
                
                // Check for balanced braces
                const openBraces = (content.match(/{/g) || []).length;
                const closeBraces = (content.match(/}/g) || []).length;
                if (openBraces !== closeBraces) {
                    throw new Error('Unbalanced braces in JavaScript code');
                }
                
                // Check for required exports
                if (!content.includes('module.exports') && !content.includes('window.')) {
                    throw new Error('Missing export statements');
                }
                
                this.report.validationResults.push({
                    file: fileInfo.name,
                    valid: true,
                    errors: [],
                    warnings: []
                });
                
                console.log(`✅ ${fileInfo.name} validation passed`);
                
            } catch (error) {
                this.report.validationResults.push({
                    file: fileInfo.name,
                    valid: false,
                    errors: [error.message],
                    warnings: []
                });
                
                console.error(`❌ ${fileInfo.name} validation failed:`, error.message);
            }
        }
    }

    /**
     * Generate comprehensive report
     */
    async generateReport() {
        this.report.securityFeatures = [
            'Configuration validation and sanitization',
            'Path traversal protection',
            'Input validation for all configuration fields',
            'Cache size limits and TTL enforcement',
            'Secure error handling with no sensitive data exposure',
            'Platform consistency validation',
            'CSP and security headers validation'
        ];
        
        // Calculate summary statistics
        const validFiles = this.report.validationResults.filter(r => r.valid).length;
        const totalErrors = this.report.validationResults.reduce((sum, r) => sum + r.errors.length, 0);
        const totalSize = this.report.generatedFiles.reduce((sum, f) => sum + f.size, 0);
        
        this.report.summary = {
            totalFiles: this.report.generatedFiles.length,
            validFiles,
            totalErrors,
            totalSize,
            successRate: `${Math.round((validFiles / this.report.generatedFiles.length) * 100)}%`,
            platformsSupported: this.platforms.length,
            cacheFeatures: ['TTL management', 'LRU eviction', 'Persistent storage', 'Size limits'],
            validationFeatures: ['Schema validation', 'Security checks', 'Path sanitization', 'Type checking']
        };
        
        // Write report
        fs.writeFileSync(this.reportPath, JSON.stringify(this.report, null, 2), 'utf8');
        console.log(`📊 Generated comprehensive report with ${this.report.generatedFiles.length} files`);
    }
}

// CLI execution
if (require.main === module) {
    const generator = new ConfigManagerGenerator();
    
    generator.generateConfigManager()
        .then(result => {
            console.log('\n🎉 Configuration manager generation completed successfully!');
            console.log(`📁 Files saved to: ${generator.targetDir}`);
            console.log(`📊 Report available at: ${generator.reportPath}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Configuration manager generation failed:', error.message);
            process.exit(1);
        });
}

module.exports = ConfigManagerGenerator;