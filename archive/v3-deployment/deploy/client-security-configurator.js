#!/usr/bin/env node

/**
 * Client Security Configurator - SECURITY-02 Implementation
 * 配置適合靜態托管的客戶端安全設定
 * 
 * @version 1.0.0
 * @author PWA Deployment Compatibility Team
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ClientSecurityConfigurator {
    constructor() {
        this.pwaSrcDir = path.join(__dirname, '..', 'pwa-card-storage');
        this.securityDir = path.join(this.pwaSrcDir, 'src', 'security');
        this.configDir = path.join(this.pwaSrcDir, 'config');
        
        this.configurationReport = {
            timestamp: new Date().toISOString(),
            configurations: [],
            cspPolicies: [],
            xssProtections: [],
            securityHeaders: [],
            validationResults: []
        };
    }

    /**
     * 執行客戶端安全配置
     */
    async execute() {
        try {
            console.log('🔒 SECURITY-02: 客戶端安全配置開始...\n');
            
            // 1. 創建配置目錄
            await this.createConfigDirectory();
            
            // 2. 配置 CSP 策略
            await this.configureCSP();
            
            // 3. 配置 XSS 防護
            await this.configureXSSProtection();
            
            // 4. 配置安全標頭
            await this.configureSecurityHeaders();
            
            // 5. 創建安全配置管理器
            await this.createSecurityConfigManager();
            
            // 6. 驗證安全配置
            await this.validateSecurityConfiguration();
            
            // 7. 生成配置報告
            await this.generateConfigurationReport();
            
            console.log('✅ SECURITY-02 任務完成！');
            return this.configurationReport;
            
        } catch (error) {
            console.error('❌ SECURITY-02 執行失敗:', error.message);
            throw error;
        }
    }

    /**
     * 創建配置目錄
     */
    async createConfigDirectory() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        console.log('✓ 配置目錄創建完成');
    }

    /**
     * 配置 CSP 策略
     */
    async configureCSP() {
        const cspConfig = {
            'default-src': ["'self'"],
            'script-src': [
                "'self'",
                "'unsafe-inline'", // PWA 需要內聯腳本
                "https://cdn.jsdelivr.net", // QR 碼庫
                "blob:" // Service Worker
            ],
            'style-src': [
                "'self'",
                "'unsafe-inline'", // 內聯樣式
                "https://fonts.googleapis.com"
            ],
            'font-src': [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            'img-src': [
                "'self'",
                "data:", // Base64 圖片
                "https:", // 外部圖片
                "blob:" // 動態生成圖片
            ],
            'connect-src': [
                "'self'",
                "https:" // API 連接
            ],
            'worker-src': [
                "'self'",
                "blob:" // Service Worker
            ],
            'manifest-src': ["'self'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': []
        };

        const cspString = Object.entries(cspConfig)
            .map(([directive, sources]) => 
                sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
            )
            .join('; ');

        const cspConfigFile = {
            policy: cspString,
            directives: cspConfig,
            reportOnly: false,
            staticHostingOptimized: true
        };

        fs.writeFileSync(
            path.join(this.configDir, 'csp-config.json'),
            JSON.stringify(cspConfigFile, null, 2)
        );

        this.configurationReport.cspPolicies.push({
            type: 'Content Security Policy',
            policy: cspString,
            directives: Object.keys(cspConfig).length,
            status: 'configured'
        });

        console.log('✓ CSP 策略配置完成');
    }

    /**
     * 配置 XSS 防護
     */
    async configureXSSProtection() {
        const xssConfig = {
            enabled: true,
            mode: 'block',
            sanitization: {
                htmlEscape: true,
                attributeEscape: true,
                jsEscape: true,
                cssEscape: true
            },
            inputValidation: {
                maxLength: 10000,
                allowedTags: [],
                allowedAttributes: [],
                prototypePollutionProtection: true
            },
            outputEncoding: {
                contextAware: true,
                defaultContext: 'html'
            }
        };

        fs.writeFileSync(
            path.join(this.configDir, 'xss-protection.json'),
            JSON.stringify(xssConfig, null, 2)
        );

        this.configurationReport.xssProtections.push({
            type: 'XSS Protection',
            enabled: xssConfig.enabled,
            mode: xssConfig.mode,
            features: Object.keys(xssConfig).length,
            status: 'configured'
        });

        console.log('✓ XSS 防護配置完成');
    }

    /**
     * 配置安全標頭
     */
    async configureSecurityHeaders() {
        const securityHeaders = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-origin'
        };

        const headersConfig = {
            headers: securityHeaders,
            staticHosting: {
                netlify: {
                    file: '_headers',
                    format: 'netlify'
                },
                vercel: {
                    file: 'vercel.json',
                    format: 'vercel'
                },
                cloudflare: {
                    file: '_headers',
                    format: 'cloudflare'
                }
            }
        };

        fs.writeFileSync(
            path.join(this.configDir, 'security-headers.json'),
            JSON.stringify(headersConfig, null, 2)
        );

        this.configurationReport.securityHeaders.push({
            type: 'Security Headers',
            headers: Object.keys(securityHeaders),
            count: Object.keys(securityHeaders).length,
            platforms: Object.keys(headersConfig.staticHosting).length,
            status: 'configured'
        });

        console.log('✓ 安全標頭配置完成');
    }

    /**
     * 創建安全配置管理器
     */
    async createSecurityConfigManager() {
        const managerCode = `/**
 * Security Configuration Manager
 * 統一管理客戶端安全配置
 */
class SecurityConfigManager {
    static #config = null;
    static #initialized = false;

    /**
     * 初始化安全配置
     */
    static async initialize() {
        if (this.#initialized) return;

        try {
            // 載入配置檔案
            const [cspConfig, xssConfig, headersConfig] = await Promise.all([
                this.#loadConfig('csp-config.json'),
                this.#loadConfig('xss-protection.json'),
                this.#loadConfig('security-headers.json')
            ]);

            this.#config = {
                csp: cspConfig,
                xss: xssConfig,
                headers: headersConfig,
                environment: this.#detectEnvironment()
            };

            // 應用安全配置
            await this.#applySecurityConfiguration();
            
            this.#initialized = true;
            console.log('[Security] Configuration initialized successfully');
            
        } catch (error) {
            console.error('[Security] Configuration initialization failed:', error);
            throw error;
        }
    }

    /**
     * 獲取 CSP 策略
     */
    static getCSPPolicy() {
        this.#ensureInitialized();
        return this.#config.csp.policy;
    }

    /**
     * 獲取 XSS 防護配置
     */
    static getXSSConfig() {
        this.#ensureInitialized();
        return this.#config.xss;
    }

    /**
     * 驗證輸入安全性
     */
    static validateInput(input, context = 'html') {
        this.#ensureInitialized();
        
        const xssConfig = this.#config.xss;
        
        // 長度檢查
        if (input.length > xssConfig.inputValidation.maxLength) {
            return { valid: false, reason: 'Input too long' };
        }

        // 原型污染檢查
        if (xssConfig.inputValidation.prototypePollutionProtection) {
            if (this.#isPrototypePollutionAttempt(input)) {
                return { valid: false, reason: 'Prototype pollution detected' };
            }
        }

        return { valid: true };
    }

    /**
     * 安全輸出編碼
     */
    static encodeOutput(data, context = 'html') {
        this.#ensureInitialized();
        
        if (!data) return '';
        
        const str = String(data);
        
        switch (context) {
            case 'html':
                return this.#escapeHtml(str);
            case 'attribute':
                return this.#escapeAttribute(str);
            case 'javascript':
                return this.#escapeJavaScript(str);
            case 'css':
                return this.#escapeCss(str);
            default:
                return this.#escapeHtml(str);
        }
    }

    /**
     * 載入配置檔案
     */
    static async #loadConfig(filename) {
        try {
            const response = await fetch(\`./config/\${filename}\`);
            if (!response.ok) {
                throw new Error(\`Failed to load \${filename}\`);
            }
            return await response.json();
        } catch (error) {
            console.warn(\`[Security] Failed to load \${filename}, using defaults\`);
            return this.#getDefaultConfig(filename);
        }
    }

    /**
     * 應用安全配置
     */
    static async #applySecurityConfiguration() {
        // 設定 CSP Meta 標籤
        if (this.#config.csp && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = this.#config.csp.policy;
            document.head.appendChild(meta);
        }

        // 設定其他安全標頭 (通過 meta 標籤)
        const headers = this.#config.headers.headers;
        Object.entries(headers).forEach(([name, value]) => {
            if (name === 'X-Content-Type-Options' || name === 'X-Frame-Options') {
                const existing = document.querySelector(\`meta[http-equiv="\${name}"]\`);
                if (!existing) {
                    const meta = document.createElement('meta');
                    meta.httpEquiv = name;
                    meta.content = value;
                    document.head.appendChild(meta);
                }
            }
        });
    }

    /**
     * 檢測環境
     */
    static #detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('.github.io')) {
            return 'github-pages';
        } else if (hostname.includes('.netlify.app')) {
            return 'netlify';
        } else if (hostname.includes('.vercel.app')) {
            return 'vercel';
        } else if (hostname.includes('.pages.dev')) {
            return 'cloudflare-pages';
        } else {
            return 'production';
        }
    }

    /**
     * 確保已初始化
     */
    static #ensureInitialized() {
        if (!this.#initialized) {
            throw new Error('SecurityConfigManager not initialized. Call initialize() first.');
        }
    }

    /**
     * 檢測原型污染攻擊
     */
    static #isPrototypePollutionAttempt(input) {
        const dangerousPatterns = [
            /__proto__/i,
            /constructor/i,
            /prototype/i
        ];
        
        return dangerousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * HTML 轉義
     */
    static #escapeHtml(str) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
    }

    /**
     * 屬性轉義
     */
    static #escapeAttribute(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * JavaScript 轉義
     */
    static #escapeJavaScript(str) {
        return str
            .replace(/\\\\/g, '\\\\\\\\')
            .replace(/'/g, "\\\\'")
            .replace(/"/g, '\\\\"')
            .replace(/\\n/g, '\\\\n')
            .replace(/\\r/g, '\\\\r')
            .replace(/\\t/g, '\\\\t');
    }

    /**
     * CSS 轉義
     */
    static #escapeCss(str) {
        return str.replace(/[<>"'&]/g, (match) => {
            return '\\\\' + match.charCodeAt(0).toString(16) + ' ';
        });
    }

    /**
     * 獲取預設配置
     */
    static #getDefaultConfig(filename) {
        const defaults = {
            'csp-config.json': {
                policy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
                reportOnly: false
            },
            'xss-protection.json': {
                enabled: true,
                mode: 'block'
            },
            'security-headers.json': {
                headers: {
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY'
                }
            }
        };
        
        return defaults[filename] || {};
    }
}

// 全域可用
window.SecurityConfigManager = SecurityConfigManager;

// 自動初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SecurityConfigManager.initialize().catch(console.error);
    });
} else {
    SecurityConfigManager.initialize().catch(console.error);
}`;

        fs.writeFileSync(
            path.join(this.securityDir, 'SecurityConfigManager.js'),
            managerCode
        );

        this.configurationReport.configurations.push({
            type: 'Security Config Manager',
            file: 'SecurityConfigManager.js',
            features: ['CSP Management', 'XSS Protection', 'Input Validation', 'Output Encoding'],
            status: 'created'
        });

        console.log('✓ 安全配置管理器創建完成');
    }

    /**
     * 驗證安全配置
     */
    async validateSecurityConfiguration() {
        const validationResults = [];

        // 驗證配置檔案存在
        const configFiles = [
            'csp-config.json',
            'xss-protection.json',
            'security-headers.json'
        ];

        for (const file of configFiles) {
            const filePath = path.join(this.configDir, file);
            const exists = fs.existsSync(filePath);
            
            validationResults.push({
                file,
                check: 'file_exists',
                passed: exists,
                message: exists ? '配置檔案存在' : '配置檔案不存在'
            });

            if (exists) {
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    validationResults.push({
                        file,
                        check: 'json_valid',
                        passed: true,
                        message: 'JSON 格式正確'
                    });
                } catch (error) {
                    validationResults.push({
                        file,
                        check: 'json_valid',
                        passed: false,
                        message: 'JSON 格式錯誤'
                    });
                }
            }
        }

        // 驗證安全配置管理器
        const managerPath = path.join(this.securityDir, 'SecurityConfigManager.js');
        const managerExists = fs.existsSync(managerPath);
        
        validationResults.push({
            file: 'SecurityConfigManager.js',
            check: 'manager_exists',
            passed: managerExists,
            message: managerExists ? '安全配置管理器存在' : '安全配置管理器不存在'
        });

        if (managerExists) {
            const content = fs.readFileSync(managerPath, 'utf8');
            const hasRequiredMethods = [
                'initialize',
                'getCSPPolicy',
                'validateInput',
                'encodeOutput'
            ].every(method => content.includes(method));

            validationResults.push({
                file: 'SecurityConfigManager.js',
                check: 'required_methods',
                passed: hasRequiredMethods,
                message: hasRequiredMethods ? '必要方法完整' : '缺少必要方法'
            });
        }

        this.configurationReport.validationResults = validationResults;

        const failedChecks = validationResults.filter(r => !r.passed);
        if (failedChecks.length > 0) {
            console.warn(`⚠️  發現 ${failedChecks.length} 個驗證問題`);
            failedChecks.forEach(check => {
                console.warn(`   - ${check.file}: ${check.message}`);
            });
        } else {
            console.log('✓ 安全配置驗證通過');
        }
    }

    /**
     * 生成配置報告
     */
    async generateConfigurationReport() {
        const reportPath = path.join(__dirname, 'security-02-configuration-report.json');
        
        // 添加摘要資訊
        this.configurationReport.summary = {
            totalConfigurations: this.configurationReport.configurations.length,
            cspPoliciesCount: this.configurationReport.cspPolicies.length,
            xssProtectionsCount: this.configurationReport.xssProtections.length,
            securityHeadersCount: this.configurationReport.securityHeaders.length,
            validationsPassed: this.configurationReport.validationResults.filter(r => r.passed).length,
            validationsTotal: this.configurationReport.validationResults.length,
            allValidationsPassed: this.configurationReport.validationResults.every(r => r.passed)
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(this.configurationReport, null, 2));
        
        console.log('\n📊 配置報告摘要:');
        console.log(`   - 配置項目: ${this.configurationReport.summary.totalConfigurations} 個`);
        console.log(`   - CSP 策略: ${this.configurationReport.summary.cspPoliciesCount} 個`);
        console.log(`   - XSS 防護: ${this.configurationReport.summary.xssProtectionsCount} 個`);
        console.log(`   - 安全標頭: ${this.configurationReport.summary.securityHeadersCount} 個`);
        console.log(`   - 驗證通過: ${this.configurationReport.summary.validationsPassed}/${this.configurationReport.summary.validationsTotal}`);
        console.log(`   - 配置完整: ${this.configurationReport.summary.allValidationsPassed ? '✓' : '✗'}`);
        console.log(`   - 詳細報告: ${reportPath}`);
    }
}

// 主執行函數
async function main() {
    try {
        const configurator = new ClientSecurityConfigurator();
        const report = await configurator.execute();
        
        console.log('\n🎉 SECURITY-02 客戶端安全配置任務成功完成！');
        process.exit(0);
        
    } catch (error) {
        console.error('\n💥 SECURITY-02 任務執行失敗:', error.message);
        process.exit(1);
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    main();
}

module.exports = ClientSecurityConfigurator;