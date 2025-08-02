/**
 * moda CSS安全管理器
 * 負責CSS注入防護、內容安全政策和安全審計功能
 */

class CSSSecurityManager {
    constructor() {
        this.isInitialized = false;
        this.securityConfig = this.createSecurityConfig();
        this.auditLog = [];
        this.cspViolations = [];
    }

    /**
     * 初始化CSS安全管理器
     */
    async initialize() {
        try {
            this.setupCSP();
            this.setupSecurityValidation();
            this.setupViolationReporting();
            this.isInitialized = true;
            this.auditSecurityEvent('CSS_SECURITY_INITIALIZED', 'success');
        } catch (error) {
            this.auditSecurityEvent('CSS_SECURITY_INIT_FAILED', 'error', error.message);
            throw new Error(`CSS Security Manager initialization failed: ${error.message}`);
        }
    }

    /**
     * 建立安全配置
     */
    createSecurityConfig() {
        return {
            allowedProperties: [
                'color', 'background-color', 'font-family', 'font-size', 'font-weight',
                'margin', 'padding', 'border', 'border-radius', 'display', 'flex-direction',
                'justify-content', 'align-items', 'width', 'height', 'opacity', 'transform'
            ],
            blockedPatterns: [
                /javascript:/i,
                /expression\(/i,
                /url\(javascript:/i,
                /data:.*script/i,
                /@import/i,
                /behavior:/i,
                /binding:/i,
                /<script/i,
                /onclick/i,
                /onerror/i
            ],
            maxValueLength: 1000,
            cspDirectives: {
                'default-src': "'self'",
                'style-src': "'self' 'unsafe-inline' fonts.googleapis.com",
                'font-src': "'self' fonts.gstatic.com",
                'script-src': "'self'",
                'img-src': "'self' data: https:",
                'connect-src': "'self'"
            }
        };
    }

    /**
     * 設定內容安全政策
     */
    setupCSP() {
        const cspString = Object.entries(this.securityConfig.cspDirectives)
            .map(([directive, value]) => `${directive} ${value}`)
            .join('; ');

        // 檢查是否已存在CSP meta標籤
        let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (!cspMeta) {
            cspMeta = document.createElement('meta');
            cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
            document.head.appendChild(cspMeta);
        }
        cspMeta.setAttribute('content', cspString);
    }

    /**
     * 驗證CSS內容安全性
     */
    validateCSSContent(property, value) {
        // 檢查屬性是否在允許清單中
        if (!this.securityConfig.allowedProperties.includes(property)) {
            this.auditSecurityEvent('CSS_PROPERTY_BLOCKED', 'warning', `Property: ${property}`);
            return false;
        }

        // 檢查值長度
        if (value.length > this.securityConfig.maxValueLength) {
            this.auditSecurityEvent('CSS_VALUE_TOO_LONG', 'warning', `Length: ${value.length}`);
            return false;
        }

        // 檢查惡意模式
        for (const pattern of this.securityConfig.blockedPatterns) {
            if (pattern.test(value)) {
                this.auditSecurityEvent('CSS_MALICIOUS_CONTENT', 'critical', `Pattern: ${pattern}, Value: ${value}`);
                return false;
            }
        }

        return true;
    }

    /**
     * 安全設置CSS變數
     */
    secureSetCSSVariable(name, value) {
        // 驗證變數名稱
        if (!name.startsWith('--md-') && !name.startsWith('--bs-')) {
            this.auditSecurityEvent('CSS_INVALID_VARIABLE_NAME', 'warning', `Name: ${name}`);
            return false;
        }

        // 驗證內容安全性
        if (!this.validateCSSContent('custom-property', value)) {
            return false;
        }

        try {
            document.documentElement.style.setProperty(name, value);
            this.auditSecurityEvent('CSS_VARIABLE_SET', 'info', `${name}: ${value}`);
            return true;
        } catch (error) {
            this.auditSecurityEvent('CSS_VARIABLE_SET_FAILED', 'error', error.message);
            return false;
        }
    }

    /**
     * 清理CSS內容
     */
    sanitizeCSS(cssContent) {
        let sanitized = cssContent;

        // 移除潛在危險內容
        this.securityConfig.blockedPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '/* BLOCKED */');
        });

        // 限制長度
        if (sanitized.length > this.securityConfig.maxValueLength) {
            sanitized = sanitized.substring(0, this.securityConfig.maxValueLength) + '...';
        }

        return sanitized;
    }

    /**
     * 設定安全驗證
     */
    setupSecurityValidation() {
        // 監控DOM變更
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    this.validateInlineStyles(mutation.target);
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style']
        });

        this.domObserver = observer;
    }

    /**
     * 驗證內聯樣式
     */
    validateInlineStyles(element) {
        const style = element.getAttribute('style');
        if (!style) return;

        const declarations = style.split(';').filter(d => d.trim());
        declarations.forEach(declaration => {
            const [property, value] = declaration.split(':').map(s => s.trim());
            if (property && value && !this.validateCSSContent(property, value)) {
                element.removeAttribute('style');
                this.auditSecurityEvent('INLINE_STYLE_BLOCKED', 'warning', `Element: ${element.tagName}`);
            }
        });
    }

    /**
     * 設定CSP違規報告
     */
    setupViolationReporting() {
        document.addEventListener('securitypolicyviolation', (event) => {
            const violation = {
                timestamp: new Date().toISOString(),
                directive: event.violatedDirective,
                blockedURI: event.blockedURI,
                documentURI: event.documentURI,
                originalPolicy: event.originalPolicy
            };

            this.cspViolations.push(violation);
            this.auditSecurityEvent('CSP_VIOLATION', 'critical', JSON.stringify(violation));
        });
    }

    /**
     * 安全審計日誌
     */
    auditSecurityEvent(eventType, severity, details = '') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            eventType,
            severity,
            details: this.sanitizeLogContent(details),
            userAgent: navigator.userAgent.substring(0, 100)
        };

        this.auditLog.push(logEntry);

        // 保持日誌大小限制
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-500);
        }

        // 輸出到控制台（僅開發環境）
        if (severity === 'critical' || severity === 'error') {
            console.error(`[CSS Security] ${eventType}:`, details);
        }
    }

    /**
     * 清理日誌內容防止注入
     */
    sanitizeLogContent(content) {
        if (typeof content !== 'string') {
            content = String(content);
        }
        return content.replace(/[<>'"&]/g, '').substring(0, 500);
    }

    /**
     * 獲取安全狀態報告
     */
    getSecurityReport() {
        return {
            initialized: this.isInitialized,
            auditLogCount: this.auditLog.length,
            cspViolationsCount: this.cspViolations.length,
            recentEvents: this.auditLog.slice(-10),
            securityConfig: {
                allowedPropertiesCount: this.securityConfig.allowedProperties.length,
                blockedPatternsCount: this.securityConfig.blockedPatterns.length,
                cspDirectivesCount: Object.keys(this.securityConfig.cspDirectives).length
            }
        };
    }

    /**
     * 清理資源
     */
    cleanup() {
        if (this.domObserver) {
            this.domObserver.disconnect();
        }
        this.auditLog = [];
        this.cspViolations = [];
        this.isInitialized = false;
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSSSecurityManager;
} else if (typeof window !== 'undefined') {
    window.CSSSecurityManager = CSSSecurityManager;
}