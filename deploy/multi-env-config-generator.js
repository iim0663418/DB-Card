#!/usr/bin/env node

/**
 * Multi-Environment Configuration Generator
 * 
 * Production-grade tool for generating platform-specific configuration files
 * for PWA static hosting deployment compatibility.
 * 
 * Features:
 * - 5 hosting platform configurations (GitHub Pages, Cloudflare Pages, Netlify, Vercel, Local)
 * - JSON schema validation
 * - Security configuration integration
 * - Path prefix and feature settings per platform
 * - Configuration integrity verification
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MultiEnvConfigGenerator {
    constructor() {
        this.configDir = path.join(__dirname, '../pwa-card-storage/config');
        this.reportPath = path.join(__dirname, 'config-02-generation-report.json');
        this.platforms = ['github-pages', 'cloudflare-pages', 'netlify', 'vercel', 'local'];
        this.generatedConfigs = [];
        this.report = {
            timestamp: new Date().toISOString(),
            tool: 'multi-env-config-generator',
            version: '1.0.0',
            platforms: [],
            totalConfigs: 0,
            validationResults: [],
            securityFeatures: [],
            errors: []
        };
    }

    /**
     * Generate all platform-specific configuration files
     */
    async generateConfigurations() {
        try {
            console.log('🚀 Starting multi-environment configuration generation...');
            
            // Ensure config directory exists
            this.ensureConfigDirectory();
            
            // Generate configurations for each platform
            for (const platform of this.platforms) {
                await this.generatePlatformConfig(platform);
            }
            
            // Validate all generated configurations
            await this.validateConfigurations();
            
            // Generate integrity report
            await this.generateReport();
            
            console.log(`✅ Successfully generated ${this.generatedConfigs.length} configuration files`);
            console.log(`📊 Report saved to: ${this.reportPath}`);
            
            return {
                success: true,
                configsGenerated: this.generatedConfigs.length,
                platforms: this.platforms,
                reportPath: this.reportPath
            };
            
        } catch (error) {
            console.error('❌ Configuration generation failed:', error.message);
            this.report.errors.push({
                type: 'generation_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Ensure configuration directory exists
     */
    ensureConfigDirectory() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
            console.log(`📁 Created config directory: ${this.configDir}`);
        }
    }

    /**
     * Generate configuration for specific platform
     */
    async generatePlatformConfig(platform) {
        try {
            const config = this.createPlatformConfig(platform);
            const configPath = path.join(this.configDir, `${platform}-config.json`);
            
            // Write configuration file
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
            
            // Calculate file hash for integrity
            const content = fs.readFileSync(configPath, 'utf8');
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            
            const configInfo = {
                platform,
                path: configPath,
                size: content.length,
                hash,
                features: Object.keys(config.features || {}),
                securityLevel: config.security?.level || 'standard'
            };
            
            this.generatedConfigs.push(configInfo);
            this.report.platforms.push(configInfo);
            
            console.log(`✅ Generated ${platform} configuration (${content.length} bytes)`);
            
        } catch (error) {
            console.error(`❌ Failed to generate ${platform} configuration:`, error.message);
            this.report.errors.push({
                type: 'platform_config_error',
                platform,
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Create platform-specific configuration object
     */
    createPlatformConfig(platform) {
        const baseConfig = {
            platform: platform,
            version: "1.0.0",
            generated: new Date().toISOString(),
            environment: this.getEnvironmentType(platform)
        };

        switch (platform) {
            case 'github-pages':
                return {
                    ...baseConfig,
                    basePath: "/DB-Card/pwa-card-storage",
                    publicPath: "/DB-Card/pwa-card-storage/",
                    assetPath: "./assets/",
                    features: {
                        serviceWorker: true,
                        offlineSupport: true,
                        pushNotifications: false,
                        backgroundSync: false,
                        periodicSync: false
                    },
                    security: {
                        level: "standard",
                        csp: {
                            enabled: true,
                            reportOnly: false,
                            directives: {
                                "default-src": ["'self'"],
                                "script-src": ["'self'", "'unsafe-inline'"],
                                "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
                                "font-src": ["'self'", "fonts.gstatic.com"],
                                "img-src": ["'self'", "data:", "https:"],
                                "connect-src": ["'self'"]
                            }
                        },
                        headers: {
                            "X-Content-Type-Options": "nosniff",
                            "X-Frame-Options": "DENY",
                            "X-XSS-Protection": "1; mode=block"
                        }
                    },
                    cache: {
                        strategy: "cache-first",
                        maxAge: 86400,
                        resources: ["assets/", "src/", "config/"]
                    },
                    deployment: {
                        buildCommand: "npm run build",
                        outputDir: "dist",
                        customDomain: false,
                        httpsOnly: true
                    }
                };

            case 'cloudflare-pages':
                return {
                    ...baseConfig,
                    basePath: "/",
                    publicPath: "/",
                    assetPath: "./assets/",
                    features: {
                        serviceWorker: true,
                        offlineSupport: true,
                        pushNotifications: true,
                        backgroundSync: true,
                        periodicSync: false,
                        edgeFunctions: true
                    },
                    security: {
                        level: "enhanced",
                        csp: {
                            enabled: true,
                            reportOnly: false,
                            directives: {
                                "default-src": ["'self'"],
                                "script-src": ["'self'"],
                                "style-src": ["'self'", "fonts.googleapis.com"],
                                "font-src": ["'self'", "fonts.gstatic.com"],
                                "img-src": ["'self'", "data:", "https:"],
                                "connect-src": ["'self'"],
                                "worker-src": ["'self'"]
                            }
                        },
                        headers: {
                            "X-Content-Type-Options": "nosniff",
                            "X-Frame-Options": "DENY",
                            "X-XSS-Protection": "1; mode=block",
                            "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
                        }
                    },
                    cache: {
                        strategy: "stale-while-revalidate",
                        maxAge: 3600,
                        resources: ["assets/", "src/", "config/"],
                        edgeCache: true
                    },
                    deployment: {
                        buildCommand: "npm run build",
                        outputDir: "dist",
                        customDomain: true,
                        httpsOnly: true,
                        edgeLocations: true
                    }
                };

            case 'netlify':
                return {
                    ...baseConfig,
                    basePath: "/",
                    publicPath: "/",
                    assetPath: "./assets/",
                    features: {
                        serviceWorker: true,
                        offlineSupport: true,
                        pushNotifications: true,
                        backgroundSync: true,
                        periodicSync: false,
                        serverlessFunctions: true
                    },
                    security: {
                        level: "enhanced",
                        csp: {
                            enabled: true,
                            reportOnly: false,
                            directives: {
                                "default-src": ["'self'"],
                                "script-src": ["'self'", "'unsafe-inline'"],
                                "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
                                "font-src": ["'self'", "fonts.gstatic.com"],
                                "img-src": ["'self'", "data:", "https:"],
                                "connect-src": ["'self'"]
                            }
                        },
                        headers: {
                            "X-Content-Type-Options": "nosniff",
                            "X-Frame-Options": "DENY",
                            "X-XSS-Protection": "1; mode=block",
                            "Referrer-Policy": "strict-origin-when-cross-origin"
                        }
                    },
                    cache: {
                        strategy: "network-first",
                        maxAge: 3600,
                        resources: ["assets/", "src/", "config/"],
                        immutableAssets: true
                    },
                    deployment: {
                        buildCommand: "npm run build",
                        outputDir: "dist",
                        customDomain: true,
                        httpsOnly: true,
                        redirects: true
                    }
                };

            case 'vercel':
                return {
                    ...baseConfig,
                    basePath: "/",
                    publicPath: "/",
                    assetPath: "./assets/",
                    features: {
                        serviceWorker: true,
                        offlineSupport: true,
                        pushNotifications: true,
                        backgroundSync: true,
                        periodicSync: false,
                        edgeConfig: true,
                        serverlessApi: true
                    },
                    security: {
                        level: "enhanced",
                        csp: {
                            enabled: true,
                            reportOnly: false,
                            directives: {
                                "default-src": ["'self'"],
                                "script-src": ["'self'"],
                                "style-src": ["'self'", "fonts.googleapis.com"],
                                "font-src": ["'self'", "fonts.gstatic.com"],
                                "img-src": ["'self'", "data:", "https:"],
                                "connect-src": ["'self'"],
                                "frame-ancestors": ["'none'"]
                            }
                        },
                        headers: {
                            "X-Content-Type-Options": "nosniff",
                            "X-Frame-Options": "DENY",
                            "X-XSS-Protection": "1; mode=block",
                            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
                        }
                    },
                    cache: {
                        strategy: "stale-while-revalidate",
                        maxAge: 3600,
                        resources: ["assets/", "src/", "config/"],
                        edgeCache: true,
                        immutableAssets: true
                    },
                    deployment: {
                        buildCommand: "npm run build",
                        outputDir: "dist",
                        customDomain: true,
                        httpsOnly: true,
                        analytics: true
                    }
                };

            case 'local':
                return {
                    ...baseConfig,
                    basePath: "/",
                    publicPath: "/",
                    assetPath: "./assets/",
                    features: {
                        serviceWorker: true,
                        offlineSupport: true,
                        pushNotifications: false,
                        backgroundSync: false,
                        periodicSync: false,
                        devTools: true,
                        hotReload: true
                    },
                    security: {
                        level: "development",
                        csp: {
                            enabled: false,
                            reportOnly: true,
                            directives: {
                                "default-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                                "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                                "style-src": ["'self'", "'unsafe-inline'"],
                                "img-src": ["'self'", "data:", "http:", "https:"],
                                "connect-src": ["'self'", "ws:", "wss:"]
                            }
                        },
                        headers: {
                            "X-Content-Type-Options": "nosniff"
                        }
                    },
                    cache: {
                        strategy: "network-first",
                        maxAge: 0,
                        resources: [],
                        disabled: true
                    },
                    deployment: {
                        buildCommand: "npm run dev",
                        outputDir: "src",
                        customDomain: false,
                        httpsOnly: false,
                        port: 8080
                    }
                };

            default:
                throw new Error(`Unknown platform: ${platform}`);
        }
    }

    /**
     * Get environment type for platform
     */
    getEnvironmentType(platform) {
        switch (platform) {
            case 'local':
                return 'development';
            case 'github-pages':
                return 'production';
            default:
                return 'production';
        }
    }

    /**
     * Validate all generated configurations
     */
    async validateConfigurations() {
        console.log('🔍 Validating generated configurations...');
        
        for (const configInfo of this.generatedConfigs) {
            try {
                const content = fs.readFileSync(configInfo.path, 'utf8');
                const config = JSON.parse(content);
                
                const validation = this.validateConfigSchema(config, configInfo.platform);
                this.report.validationResults.push({
                    platform: configInfo.platform,
                    valid: validation.valid,
                    errors: validation.errors,
                    warnings: validation.warnings
                });
                
                if (!validation.valid) {
                    console.warn(`⚠️  ${configInfo.platform} configuration has validation errors:`, validation.errors);
                } else {
                    console.log(`✅ ${configInfo.platform} configuration validated successfully`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to validate ${configInfo.platform} configuration:`, error.message);
                this.report.validationResults.push({
                    platform: configInfo.platform,
                    valid: false,
                    errors: [error.message],
                    warnings: []
                });
            }
        }
    }

    /**
     * Validate configuration schema
     */
    validateConfigSchema(config, platform) {
        const errors = [];
        const warnings = [];
        
        // Required fields validation
        const requiredFields = ['platform', 'version', 'basePath', 'features', 'security', 'cache', 'deployment'];
        for (const field of requiredFields) {
            if (!config[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        // Platform consistency check
        if (config.platform !== platform) {
            errors.push(`Platform mismatch: expected ${platform}, got ${config.platform}`);
        }
        
        // Security configuration validation
        if (config.security) {
            if (!config.security.level) {
                errors.push('Missing security level');
            }
            
            if (config.security.csp && !config.security.csp.directives) {
                errors.push('CSP enabled but no directives specified');
            }
        }
        
        // Features validation
        if (config.features) {
            const booleanFeatures = ['serviceWorker', 'offlineSupport', 'pushNotifications'];
            for (const feature of booleanFeatures) {
                if (config.features[feature] !== undefined && typeof config.features[feature] !== 'boolean') {
                    errors.push(`Feature ${feature} must be boolean`);
                }
            }
        }
        
        // Path validation
        if (config.basePath && !config.basePath.startsWith('/')) {
            warnings.push('basePath should start with /');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Generate comprehensive report
     */
    async generateReport() {
        this.report.totalConfigs = this.generatedConfigs.length;
        this.report.securityFeatures = [
            'CSP (Content Security Policy) configuration',
            'Security headers implementation',
            'HTTPS enforcement',
            'XSS protection',
            'Content type validation'
        ];
        
        // Calculate summary statistics
        const validConfigs = this.report.validationResults.filter(r => r.valid).length;
        const totalErrors = this.report.validationResults.reduce((sum, r) => sum + r.errors.length, 0);
        const totalWarnings = this.report.validationResults.reduce((sum, r) => sum + r.warnings.length, 0);
        
        this.report.summary = {
            totalPlatforms: this.platforms.length,
            validConfigurations: validConfigs,
            totalErrors,
            totalWarnings,
            successRate: `${Math.round((validConfigs / this.platforms.length) * 100)}%`
        };
        
        // Write report
        fs.writeFileSync(this.reportPath, JSON.stringify(this.report, null, 2), 'utf8');
        console.log(`📊 Generated comprehensive report with ${this.report.totalConfigs} configurations`);
    }
}

// CLI execution
if (require.main === module) {
    const generator = new MultiEnvConfigGenerator();
    
    generator.generateConfigurations()
        .then(result => {
            console.log('\n🎉 Multi-environment configuration generation completed successfully!');
            console.log(`📁 Configurations saved to: ${generator.configDir}`);
            console.log(`📊 Report available at: ${generator.reportPath}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Configuration generation failed:', error.message);
            process.exit(1);
        });
}

module.exports = MultiEnvConfigGenerator;