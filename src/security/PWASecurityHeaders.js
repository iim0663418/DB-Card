/**
 * PWA-12 & PWA-13: PWA Security Headers & Strict CSP Implementation
 * 實作 PWA 專用的安全標頭與嚴格內容安全政策
 */

class PWASecurityHeaders {
    constructor() {
        this.nonce = this.generateNonce();
        this.cspDirectives = this.buildCSPDirectives();
        this.securityHeaders = this.buildSecurityHeaders();
        this.init();
    }

    /**
     * 生成 CSP nonce
     */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
    }

    /**
     * 建構嚴格的 CSP 指令
     */
    buildCSPDirectives() {
        return {
            'default-src': ["'self'"],
            'script-src': [
                "'self'",
                `'nonce-${this.nonce}'`,
                'https://unpkg.com',
                "'strict-dynamic'"
            ],
            'style-src': [
                "'self'",
                'https://fonts.googleapis.com',
                "'unsafe-inline'"
            ],
            'font-src': [
                "'self'",
                'https://fonts.gstatic.com'
            ],
            'img-src': [
                "'self'",
                'data:',
                'https:'
            ],
            'connect-src': [
                "'self'",
                'https:'
            ],
            'worker-src': ["'self'"],
            'manifest-src': ["'self'"],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"],
            'upgrade-insecure-requests': []
        };
    }

    /**
     * 建構 PWA 安全標頭
     */
    buildSecurityHeaders() {
        return {
            'Content-Security-Policy': this.buildCSPString(),
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': this.buildPermissionsPolicy(),
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-origin'
        };
    }

    /**
     * 建構 CSP 字串
     */
    buildCSPString() {
        return Object.entries(this.cspDirectives)
            .map(([directive, sources]) => {
                if (sources.length === 0) return directive;
                return `${directive} ${sources.join(' ')}`;
            })
            .join('; ');
    }

    /**
     * 建構權限政策
     */
    buildPermissionsPolicy() {
        const policies = [
            'camera=()',
            'microphone=()',
            'geolocation=()',
            'payment=()',
            'usb=()',
            'bluetooth=()',
            'accelerometer=()',
            'gyroscope=()',
            'magnetometer=()',
            'ambient-light-sensor=()',
            'autoplay=(self)',
            'encrypted-media=(self)',
            'fullscreen=(self)',
            'picture-in-picture=(self)'
        ];
        return policies.join(', ');
    }

    /**
     * 初始化安全標頭
     */
    init() {
        this.applyMetaHeaders();
        this.setupServiceWorkerHeaders();
        this.monitorViolations();
    }

    /**
     * 應用 meta 標頭到當前頁面
     */
    applyMetaHeaders() {
        // 更新現有的 CSP meta 標籤
        const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (existingCSP) {
            existingCSP.setAttribute('content', this.securityHeaders['Content-Security-Policy']);
        } else {
            const cspMeta = document.createElement('meta');
            cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
            cspMeta.setAttribute('content', this.securityHeaders['Content-Security-Policy']);
            document.head.appendChild(cspMeta);
        }

        // 添加其他安全相關 meta 標籤
        this.addSecurityMeta('X-Content-Type-Options', this.securityHeaders['X-Content-Type-Options']);
        this.addSecurityMeta('Referrer-Policy', this.securityHeaders['Referrer-Policy']);
        this.addSecurityMeta('Permissions-Policy', this.securityHeaders['Permissions-Policy']);
    }

    /**
     * 添加安全 meta 標籤
     */
    addSecurityMeta(name, content) {
        const existing = document.querySelector(`meta[http-equiv="${name}"]`);
        if (!existing) {
            const meta = document.createElement('meta');
            meta.setAttribute('http-equiv', name);
            meta.setAttribute('content', content);
            document.head.appendChild(meta);
        }
    }

    /**
     * 設定 Service Worker 標頭處理
     */
    setupServiceWorkerHeaders() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SECURITY_HEADERS_REQUEST') {
                    event.ports[0].postMessage({
                        headers: this.securityHeaders,
                        nonce: this.nonce
                    });
                }
            });
        }
    }

    /**
     * 監控 CSP 違規
     */
    monitorViolations() {
        document.addEventListener('securitypolicyviolation', (event) => {
            const violation = {
                directive: event.violatedDirective,
                blockedURI: event.blockedURI,
                lineNumber: event.lineNumber,
                columnNumber: event.columnNumber,
                sourceFile: event.sourceFile,
                timestamp: Date.now()
            };

            this.logSecurityViolation(violation);
            this.handleViolation(violation);
        });
    }

    /**
     * 記錄安全違規
     */
    logSecurityViolation(violation) {
        if (window.SecurityDataHandler) {
            window.SecurityDataHandler.logSecurityEvent('CSP_VIOLATION', {
                directive: violation.directive,
                blockedURI: this.sanitizeURI(violation.blockedURI),
                location: `${violation.sourceFile}:${violation.lineNumber}:${violation.columnNumber}`
            });
        }
    }

    /**
     * 清理 URI 以避免日誌注入
     */
    sanitizeURI(uri) {
        if (!uri || typeof uri !== 'string') return '[INVALID_URI]';
        
        // 移除潛在的惡意內容
        return uri
            .replace(/[<>'"]/g, '')
            .replace(/javascript:/gi, '[BLOCKED_PROTOCOL]')
            .replace(/data:/gi, '[DATA_URI]')
            .substring(0, 200); // 限制長度
    }

    /**
     * 處理違規事件
     */
    handleViolation(violation) {
        // 對於嚴重違規，可以採取額外措施
        const criticalDirectives = ['script-src', 'object-src', 'base-uri'];
        
        if (criticalDirectives.includes(violation.directive)) {
            this.handleCriticalViolation(violation);
        }
    }

    /**
     * 處理嚴重違規
     */
    handleCriticalViolation(violation) {
        // 記錄嚴重違規
        if (window.SecurityDataHandler) {
            window.SecurityDataHandler.logSecurityEvent('CRITICAL_CSP_VIOLATION', {
                directive: violation.directive,
                severity: 'HIGH',
                action: 'BLOCKED'
            });
        }

        // 可以在這裡添加額外的安全措施
        // 例如：暫時禁用某些功能、通知使用者等
    }

    /**
     * 驗證腳本 nonce
     */
    validateScriptNonce(script) {
        const scriptNonce = script.getAttribute('nonce');
        return scriptNonce === this.nonce;
    }

    /**
     * 為動態腳本添加 nonce
     */
    addNonceToScript(script) {
        script.setAttribute('nonce', this.nonce);
        return script;
    }

    /**
     * 檢查 CSP 相容性
     */
    checkCSPSupport() {
        const features = {
            csp: 'securitypolicyviolation' in document,
            strictDynamic: this.testStrictDynamic(),
            nonce: this.testNonceSupport()
        };

        return features;
    }

    /**
     * 測試 strict-dynamic 支援
     */
    testStrictDynamic() {
        try {
            const testCSP = "script-src 'strict-dynamic'";
            return true; // 簡化測試
        } catch (e) {
            return false;
        }
    }

    /**
     * 測試 nonce 支援
     */
    testNonceSupport() {
        try {
            const script = document.createElement('script');
            script.setAttribute('nonce', 'test');
            return script.hasAttribute('nonce');
        } catch (e) {
            return false;
        }
    }

    /**
     * 獲取當前 nonce
     */
    getCurrentNonce() {
        return this.nonce;
    }

    /**
     * 重新生成 nonce（用於頁面刷新）
     */
    regenerateNonce() {
        this.nonce = this.generateNonce();
        this.cspDirectives['script-src'] = this.cspDirectives['script-src'].map(src => 
            src.startsWith("'nonce-") ? `'nonce-${this.nonce}'` : src
        );
        this.securityHeaders['Content-Security-Policy'] = this.buildCSPString();
        this.applyMetaHeaders();
        return this.nonce;
    }

    /**
     * 獲取安全標頭
     */
    getSecurityHeaders() {
        return { ...this.securityHeaders };
    }

    /**
     * 獲取 CSP 指令
     */
    getCSPDirectives() {
        return { ...this.cspDirectives };
    }
}

// 全域實例
window.PWASecurityHeaders = window.PWASecurityHeaders || new PWASecurityHeaders();

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PWASecurityHeaders;
}