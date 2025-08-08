/**
 * Configuration Manager ES6 Module
 * Secure configuration loading and validation for PWA deployment compatibility
 * 
 * @version 3.2.0
 * @author PWA Deployment Compatibility Team
 */

import { detectEnvironment, getCurrentPlatform } from './environment-detector.js';

// Configuration cache with TTL
const configCache = new Map();
const cacheExpiry = new Map();
const DEFAULT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Supported platforms
const SUPPORTED_PLATFORMS = [
    'github-pages', 
    'cloudflare-pages', 
    'netlify', 
    'vercel', 
    'firebase',
    'local'
];

// Configuration validation schema
const CONFIG_SCHEMA = {
    required: ['platform', 'basePath', 'features', 'security'],
    optional: ['version', 'environment', 'cache', 'deployment', 'allowedDomains'],
    features: ['serviceWorker', 'offlineSupport', 'pushNotifications'],
    security: ['level', 'csp', 'headers']
};

/**
 * Load configuration for specified or detected platform
 * @param {string|null} platform - Platform identifier (optional)
 * @returns {Promise<Object>} Configuration object
 */
export async function loadConfig(platform = null) {
    try {
        // Detect platform if not specified
        if (!platform) {
            const detection = await detectEnvironment();
            platform = detection.platform || 'local';
        }

        // Validate platform
        if (!SUPPORTED_PLATFORMS.includes(platform)) {
            console.warn(`[Config] Unsupported platform: ${platform}, falling back to default`);
            platform = 'local';
        }

        // Check cache first
        const cachedConfig = getCachedConfig(platform);
        if (cachedConfig) {
            console.log(`[Config] Using cached configuration for ${platform}`);
            return cachedConfig;
        }

        // Load configuration from file
        const config = await loadConfigFromFile(platform);
        
        // Validate configuration
        const validation = validateConfig(config);
        if (!validation.valid) {
            throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Sanitize configuration for security
        const sanitizedConfig = sanitizeConfig(config);

        // Cache configuration
        setCachedConfig(platform, sanitizedConfig);
        
        console.log(`[Config] Loaded configuration for ${platform}`);
        return sanitizedConfig;
        
    } catch (error) {
        console.error(`[Config] Failed to load configuration for ${platform}:`, error.message);
        
        // Try fallback to default configuration
        if (platform !== 'default') {
            console.log('[Config] Attempting fallback to default configuration...');
            return await loadDefaultConfig();
        }
        
        throw error;
    }
}

/**
 * Load configuration from file with security validation
 * @param {string} platform - Platform identifier
 * @returns {Promise<Object>} Raw configuration object
 */
async function loadConfigFromFile(platform) {
    const configPath = `./config/${platform === 'local' ? 'local' : platform}.json`;
    
    try {
        const response = await fetch(configPath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const config = await response.json();
        return config;
        
    } catch (error) {
        // Try alternative config file naming
        const altConfigPath = `./config/${platform}-config.json`;
        try {
            const response = await fetch(altConfigPath);
            if (!response.ok) {
                throw new Error(`Config file not found: ${configPath} or ${altConfigPath}`);
            }
            
            const config = await response.json();
            return config;
        } catch (altError) {
            throw new Error(`Failed to load config: ${error.message}`);
        }
    }
}

/**
 * Load default fallback configuration
 * @returns {Promise<Object>} Default configuration
 */
async function loadDefaultConfig() {
    try {
        const response = await fetch('./config/default.json');
        if (!response.ok) {
            return getHardcodedFallbackConfig();
        }
        
        const config = await response.json();
        return sanitizeConfig(config);
    } catch (error) {
        console.warn('[Config] Default config file not found, using hardcoded fallback');
        return getHardcodedFallbackConfig();
    }
}

/**
 * Get hardcoded fallback configuration (last resort)
 * @returns {Object} Minimal safe configuration
 */
function getHardcodedFallbackConfig() {
    return {
        platform: 'fallback',
        version: 'v3.2.0-pwa-deployment-compatibility',
        environment: 'development',
        basePath: '/',
        publicPath: '/',
        assetPath: './assets/',
        features: {
            serviceWorker: true,
            offlineSupport: true,
            pushNotifications: false,
            backgroundSync: false,
            periodicSync: false,
            analytics: false
        },
        security: {
            level: 'basic',
            csp: {
                enabled: true,
                reportOnly: true,
                directives: {
                    'default-src': ["'self'"],
                    'script-src': ["'self'", "'unsafe-inline'"],
                    'style-src': ["'self'", "'unsafe-inline'"],
                    'img-src': ["'self'", "data:", "https:"]
                }
            },
            headers: {
                'X-Content-Type-Options': 'nosniff'
            }
        },
        cache: {
            strategy: 'cache-first',
            maxAge: 86400,
            resources: ['assets/', 'src/']
        }
    };
}

/**
 * Validate configuration against schema
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateConfig(config) {
    const errors = [];
    
    // Check required fields
    for (const field of CONFIG_SCHEMA.required) {
        if (!config[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    
    // Validate platform value
    if (config.platform && !SUPPORTED_PLATFORMS.includes(config.platform) && config.platform !== 'fallback' && config.platform !== 'default') {
        errors.push(`Invalid platform: ${config.platform}`);
    }
    
    // Validate features structure
    if (config.features && typeof config.features !== 'object') {
        errors.push('Features must be an object');
    }
    
    // Validate security structure
    if (config.security && typeof config.security !== 'object') {
        errors.push('Security must be an object');
    }
    
    // Validate CSP directives
    if (config.security?.csp?.directives) {
        const csp = config.security.csp.directives;
        for (const [directive, values] of Object.entries(csp)) {
            if (!Array.isArray(values)) {
                errors.push(`CSP directive ${directive} must be an array`);
            }
        }
    }
    
    // Validate allowed domains
    if (config.allowedDomains && !Array.isArray(config.allowedDomains)) {
        errors.push('allowedDomains must be an array');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitize configuration to prevent injection attacks
 * @param {Object} config - Raw configuration
 * @returns {Object} Sanitized configuration
 */
function sanitizeConfig(config) {
    const sanitized = JSON.parse(JSON.stringify(config)); // Deep clone
    
    // Sanitize string values
    function sanitizeValue(value) {
        if (typeof value === 'string') {
            // Remove potentially dangerous characters
            return value.replace(/[<>\"'&]/g, '');
        }
        return value;
    }
    
    // Recursively sanitize object
    function sanitizeObject(obj) {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                sanitizeObject(value);
            } else {
                obj[key] = sanitizeValue(value);
            }
        }
    }
    
    sanitizeObject(sanitized);
    
    // Validate domain security
    if (sanitized.allowedDomains && Array.isArray(sanitized.allowedDomains)) {
        const currentDomain = window.location.hostname;
        const isAllowed = sanitized.allowedDomains.some(domain => {
            if (typeof domain === 'string') {
                return currentDomain === domain || currentDomain.endsWith(`.${domain}`);
            }
            return false;
        });
        
        if (!isAllowed && sanitized.platform !== 'local' && sanitized.platform !== 'fallback') {
            console.warn(`[Config] Domain ${currentDomain} not in allowed list for ${sanitized.platform}`);
        }
    }
    
    return sanitized;
}

/**
 * Get secure configuration with additional runtime validation
 * @param {string|null} platform - Platform identifier
 * @returns {Promise<Object>} Secure configuration
 */
export async function getSecureConfig(platform = null) {
    const config = await loadConfig(platform);
    
    // Additional runtime security checks
    if (config.security?.level === 'enhanced') {
        // Enforce HTTPS in production
        if (window.location.protocol !== 'https:' && config.environment === 'production') {
            console.warn('[Config] HTTPS required for enhanced security level');
        }
        
        // Validate CSP headers
        if (config.security.csp?.enabled && !config.security.csp.reportOnly) {
            console.log('[Config] CSP enforcement enabled');
        }
    }
    
    return config;
}

/**
 * Get cached configuration
 * @param {string} platform - Platform identifier
 * @returns {Object|null} Cached configuration or null
 */
function getCachedConfig(platform) {
    const cached = configCache.get(platform);
    const expiry = cacheExpiry.get(platform);
    
    if (cached && expiry && Date.now() < expiry) {
        return cached;
    }
    
    // Clean expired cache
    if (cached) {
        configCache.delete(platform);
        cacheExpiry.delete(platform);
    }
    
    return null;
}

/**
 * Set cached configuration
 * @param {string} platform - Platform identifier
 * @param {Object} config - Configuration to cache
 */
function setCachedConfig(platform, config) {
    configCache.set(platform, config);
    cacheExpiry.set(platform, Date.now() + DEFAULT_CACHE_TTL);
}

/**
 * Clear configuration cache
 * @param {string|null} platform - Platform to clear (null for all)
 */
export function clearConfigCache(platform = null) {
    if (platform) {
        configCache.delete(platform);
        cacheExpiry.delete(platform);
    } else {
        configCache.clear();
        cacheExpiry.clear();
    }
}

// Backward compatibility - deprecated
if (typeof window !== 'undefined') {
    window.ConfigManager = {
        loadConfig,
        validateConfig,
        getSecureConfig,
        clearConfigCache,
        // Deprecated warning
        _deprecated: 'Use ES6 imports: import { loadConfig } from "./config-manager.js"'
    };
    
    console.warn('[Config] Global ConfigManager is deprecated. Use ES6 imports instead.');
}