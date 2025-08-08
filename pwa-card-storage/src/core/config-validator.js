/**
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
            errors.push(`Validation error: ${error.message}`);
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
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        // Check version format
        if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
            errors.push('Version must follow semantic versioning (x.y.z)');
        }
    }

    /**
     * Validate platform consistency
     */
    validatePlatformConsistency(config, expectedPlatform, errors) {
        if (config.platform !== expectedPlatform) {
            errors.push(`Platform mismatch: expected ${expectedPlatform}, got ${config.platform}`);
        }
        
        if (!this.platforms.includes(config.platform)) {
            errors.push(`Unsupported platform: ${config.platform}`);
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
            errors.push(`Invalid security level: ${security.level}`);
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
                        warnings.push(`Missing recommended CSP directive: ${directive}`);
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
                    warnings.push(`Missing recommended security header: ${header}`);
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
                warnings.push(`Core feature '${feature}' should be enabled`);
            }
        }
        
        // Boolean validation
        for (const [feature, value] of Object.entries(features)) {
            if (typeof value !== 'boolean') {
                errors.push(`Feature '${feature}' must be boolean, got ${typeof value}`);
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
            errors.push(`Invalid cache strategy: ${cache.strategy}`);
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
        
        // Remove potentially dangerous fields to prevent prototype pollution
        delete sanitized.__proto__;
        delete sanitized.constructor;
        
        // Check for dangerous patterns in object keys
        this.removeDangerousPatterns(sanitized);
        
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
     * Remove dangerous patterns from configuration object
     */
    removeDangerousPatterns(obj) {
        if (!obj || typeof obj !== 'object') return;
        
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        
        for (const key of dangerousKeys) {
            if (key in obj) {
                delete obj[key];
            }
        }
        
        // Recursively check nested objects
        for (const value of Object.values(obj)) {
            if (typeof value === 'object' && value !== null) {
                this.removeDangerousPatterns(value);
            }
        }
    }

    /**
     * Sanitize path string with path traversal protection
     */
    sanitizePath(path) {
        if (typeof path !== 'string') return path;
        
        // Remove dangerous patterns and path traversal attempts
        return path
            .replace(/\.\./g, '') // Remove parent directory references for path traversal protection
            .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
            .replace(/\0/g, ''); // Remove null bytes
    }
}

}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigValidator;
} else if (typeof window !== 'undefined') {
    window.ConfigValidator = ConfigValidator;
}