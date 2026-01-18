/**
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
            const response = await fetch(`./config/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`[Security] Failed to load ${filename}, using defaults`);
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
                const existing = document.querySelector(`meta[http-equiv="${name}"]`);
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
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    /**
     * CSS 轉義
     */
    static #escapeCss(str) {
        return str.replace(/[<>"'&]/g, (match) => {
            return '\\' + match.charCodeAt(0).toString(16) + ' ';
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
}