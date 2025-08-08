/**
 * SecurityDataHandler - 統一安全資料處理模組
 * 提供XSS防護、資料完整性檢查、安全儲存等功能
 */
class SecurityDataHandler {
    static #encryptionKey = null;

    /**
     * 清理輸出資料防止XSS - 增強版本
     */
    static sanitizeOutput(data, context = 'html') {
        if (data === null || data === undefined) {
            return '';
        }

        const str = String(data);
        
        // 預先檢查是否包含危險內容
        if (this.#containsMaliciousContent(str)) {
            return '[BLOCKED: Potentially malicious content]';
        }
        
        switch (context) {
            case 'html':
                return this.#escapeHtml(str);
            case 'attribute':
                return this.#escapeAttribute(str);
            case 'javascript':
                return this.#escapeJavaScript(str);
            case 'css':
                return this.#escapeCss(str);
            case 'text':
                return str; // 純文字不需轉義
            default:
                return this.#escapeHtml(str);
        }
    }

    /**
     * 檢測惡意內容
     */
    static #containsMaliciousContent(str) {
        const maliciousPatterns = [
            /<script[^>]*>/i,
            /<iframe[^>]*>/i,
            /<object[^>]*>/i,
            /<embed[^>]*>/i,
            /javascript:/i,
            /vbscript:/i,
            /data:text\/html/i,
            /on\w+\s*=/i,
            /<\w+[^>]*\son\w+/i
        ];
        
        return maliciousPatterns.some(pattern => pattern.test(str));
    }

    /**
     * 驗證資料完整性
     */
    static async validateDataIntegrity(data, expectedHash = null) {
        try {
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataString);
            
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const actualHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return {
                valid: expectedHash ? actualHash === expectedHash : true,
                actualHash
            };
        } catch (error) {
            return {
                valid: false,
                actualHash: null,
                error: error.message
            };
        }
    }

    /**
     * 安全儲存機制
     */
    static async secureStorage(key, value, options = {}) {
        // Authorization check
        if (window.SecurityAuthHandler) {
            const authResult = window.SecurityAuthHandler.validateAccess('storage', 'write');
            if (!authResult.authorized) {
                return { success: false, error: '無權限執行儲存操作' };
            }
        }
        
        const {
            encrypt = false,
            expiry = null,
            integrity = true
        } = options;

        try {
            let processedValue = value;
            let metadata = {
                timestamp: Date.now(),
                encrypted: encrypt,
                hasIntegrity: integrity
            };

            if (expiry) {
                metadata.expiry = Date.now() + expiry;
            }

            // 資料完整性檢查
            if (integrity) {
                const integrityResult = await this.validateDataIntegrity(processedValue);
                if (integrityResult.valid) {
                    metadata.hash = integrityResult.actualHash;
                }
            }

            // 加密處理
            if (encrypt) {
                processedValue = await this.#encryptData(processedValue);
            }

            const storageData = {
                value: processedValue,
                metadata
            };

            localStorage.setItem(key, JSON.stringify(storageData));
            
            return { success: true };
        } catch (error) {
            // Don't expose internal error details
            return { 
                success: false, 
                error: '儲存操作失敗' 
            };
        }
    }

    /**
     * 安全資料檢索
     */
    static async secureRetrieve(key, options = {}) {
        // Authorization check
        if (window.SecurityAuthHandler) {
            const authResult = window.SecurityAuthHandler.validateAccess('storage', 'read');
            if (!authResult.authorized) {
                return { success: false, error: '無權限執行讀取操作' };
            }
        }
        
        const {
            decrypt = false,
            verifyIntegrity = true
        } = options;

        try {
            const storedData = localStorage.getItem(key);
            if (!storedData) {
                return { success: false, error: '資料不存在' };
            }

            const parsedData = JSON.parse(storedData);
            const { value, metadata } = parsedData;

            // 檢查過期時間
            if (metadata.expiry && Date.now() > metadata.expiry) {
                localStorage.removeItem(key);
                return { success: false, error: '資料已過期' };
            }

            let processedValue = value;

            // 解密處理
            if (decrypt && metadata.encrypted) {
                processedValue = await this.#decryptData(processedValue);
            }

            // 完整性驗證
            if (verifyIntegrity && metadata.hasIntegrity && metadata.hash) {
                const integrityResult = await this.validateDataIntegrity(processedValue, metadata.hash);
                if (!integrityResult.valid) {
                    return { 
                        success: false, 
                        error: '資料完整性檢查失敗' 
                    };
                }
            }

            return { 
                success: true, 
                data: processedValue,
                metadata 
            };
        } catch (error) {
            // Don't expose internal error details
            return { 
                success: false, 
                error: '讀取操作失敗' 
            };
        }
    }

    /**
     * 安全日誌記錄 - 防止日誌注入 (增強版)
     */
    static secureLog(level, message, details = {}) {
        try {
            const sanitizedMessage = this.#sanitizeLogMessage(message);
            const sanitizedDetails = this.#sanitizeLogDetails(details);
            
            const logEntry = {
                timestamp: new Date().toISOString(),
                level: this.#sanitizeLogMessage(level.toUpperCase()),
                message: sanitizedMessage,
                details: sanitizedDetails,
                source: 'SecurityDataHandler',
                sessionId: this.#getSessionId()
            };

            // 檢查日誌大小限制
            const logSize = JSON.stringify(logEntry).length;
            if (logSize > 10000) {
                logEntry.details = { error: 'Log entry too large, details truncated' };
            }

            // 根據級別決定輸出方式
            const safeLevel = level.toLowerCase().replace(/[^a-z]/g, '');
            switch (safeLevel) {
                case 'error':
                    console.error('[SECURITY]', JSON.stringify(logEntry));
                    break;
                case 'warn':
                    console.warn('[SECURITY]', JSON.stringify(logEntry));
                    break;
                case 'info':
                    console.info('[SECURITY]', JSON.stringify(logEntry));
                    break;
                default:
                    console.log('[SECURITY]', JSON.stringify(logEntry));
            }

            // 可選：發送到遠端日誌服務
            this.#sendToLogService(logEntry);
        } catch (error) {
            // 日誌系統本身出錯時的備用記錄
            console.error('[SECURITY-LOG-ERROR]', 'Failed to log security event:', error.message);
        }
    }

    /**
     * 獲取會話 ID
     */
    static #getSessionId() {
        if (!this._sessionId) {
            this._sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        return this._sessionId;
    }

    /**
     * HTML 轉義 - 增強 XSS 防護
     */
    static #escapeHtml(str) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        return str.replace(/[&<>"'/`=]/g, (match) => htmlEscapes[match]);
    }

    /**
     * 安全 DOM 操作 - 防護 XSS
     */
    static createSafeElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        // 安全設定屬性
        for (const [key, value] of Object.entries(attributes)) {
            if (this.#isSafeAttribute(key)) {
                element.setAttribute(key, this.sanitizeOutput(value, 'attribute'));
            }
        }
        
        // 安全設定文字內容
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }

    /**
     * 檢查安全屬性
     */
    static #isSafeAttribute(attr) {
        const dangerousAttrs = [
            'onclick', 'onload', 'onerror', 'onmouseover',
            'onfocus', 'onblur', 'onchange', 'onsubmit',
            'javascript:', 'vbscript:', 'data:',
            'srcdoc', 'sandbox'
        ];
        
        return !dangerousAttrs.some(dangerous => 
            attr.toLowerCase().includes(dangerous.toLowerCase())
        );
    }

    /**
     * 安全更新 DOM 內容
     */
    static updateElementSafely(element, content, context = 'html') {
        if (!element) return;
        
        const sanitizedContent = this.sanitizeOutput(content, context);
        
        if (context === 'text') {
            element.textContent = sanitizedContent;
        } else {
            // 使用 textContent 而非 innerHTML 防止 XSS
            element.textContent = sanitizedContent;
        }
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
        const jsEscapes = {
            '\\': '\\\\',
            "'": "\\'",
            '"': '\\"',
            '\n': '\\n',
            '\r': '\\r',
            '\t': '\\t',
            '\b': '\\b',
            '\f': '\\f',
            '\v': '\\v',
            '\0': '\\0'
        };
        
        return str.replace(/[\\"'\n\r\t\b\f\v\0]/g, (match) => jsEscapes[match]);
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
     * 清理日誌訊息 - 增強版
     */
    static #sanitizeLogMessage(message) {
        if (typeof message !== 'string') {
            message = String(message);
        }
        
        // 移除潛在的日誌注入字符
        return message
            .replace(/[\r\n]/g, ' ')  // Remove line breaks
            .replace(/\t/g, ' ')      // Replace tabs with spaces
            .replace(/[\x00-\x1f\x7f]/g, '') // Remove all control characters
            .replace(/[<>"'&]/g, '')  // Remove potential HTML/script chars
            .replace(/\${.*?}/g, '')  // Remove template literals
            .replace(/eval\s*\(/gi, '') // Remove eval attempts
            .replace(/Function\s*\(/gi, '') // Remove Function constructor
            .substring(0, 1000);      // Limit length
    }

    /**
     * 清理日誌詳情 - 增強版
     */
    static #sanitizeLogDetails(details) {
        if (!details || typeof details !== 'object') {
            return {};
        }

        const sanitized = {};
        let entryCount = 0;
        const maxEntries = 20; // 限制詳情項目數量
        
        for (const [key, value] of Object.entries(details)) {
            if (entryCount >= maxEntries) {
                sanitized['...truncated'] = `${Object.keys(details).length - maxEntries} more entries`;
                break;
            }
            
            // 過濾敏感鍵名
            if (this.#isSensitiveKey(key)) {
                sanitized[this.#sanitizeLogMessage(key)] = '[REDACTED]';
            } else {
                const sanitizedKey = this.#sanitizeLogMessage(key);
                const sanitizedValue = this.#sanitizeLogValue(value);
                sanitized[sanitizedKey] = sanitizedValue;
            }
            
            entryCount++;
        }
        
        return sanitized;
    }

    /**
     * 檢查敏感鍵名
     */
    static #isSensitiveKey(key) {
        const sensitiveKeys = [
            'password', 'token', 'secret', 'key', 'auth',
            'credential', 'session', 'cookie', 'pin',
            'ssn', 'credit', 'card', 'phone', 'email'
        ];
        
        const lowerKey = key.toLowerCase();
        return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    }

    /**
     * 清理日誌值
     */
    static #sanitizeLogValue(value) {
        if (typeof value === 'string') {
            return this.#sanitizeLogMessage(value);
        } else if (typeof value === 'object' && value !== null) {
            try {
                const jsonStr = JSON.stringify(value, null, 0);
                return jsonStr.substring(0, 500);
            } catch (error) {
                return '[Object - cannot serialize]';
            }
        } else {
            return String(value).substring(0, 100);
        }
    }

    /**
     * 加密資料
     */
    static async #encryptData(data) {
        try {
            if (!this.#encryptionKey) {
                this.#encryptionKey = await this.#generateEncryptionKey();
            }

            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                this.#encryptionKey,
                dataBuffer
            );

            const encryptedArray = new Uint8Array(encryptedBuffer);
            const combined = new Uint8Array(iv.length + encryptedArray.length);
            combined.set(iv);
            combined.set(encryptedArray, iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            throw new Error('資料處理失敗');
        }
    }

    /**
     * 解密資料
     */
    static async #decryptData(encryptedData) {
        try {
            if (!this.#encryptionKey) {
                this.#encryptionKey = await this.#generateEncryptionKey();
            }

            const combined = new Uint8Array(
                atob(encryptedData).split('').map(c => c.charCodeAt(0))
            );
            
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                this.#encryptionKey,
                encrypted
            );

            const decoder = new TextDecoder();
            const decryptedString = decoder.decode(decryptedBuffer);
            
            return JSON.parse(decryptedString);
        } catch (error) {
            throw new Error('資料處理失敗');
        }
    }

    /**
     * 生成加密金鑰
     */
    static async #generateEncryptionKey() {
        return await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * 發送到日誌服務（佔位符）
     */
    static #sendToLogService(logEntry) {
        // 實際實作中可以發送到遠端日誌服務
        // 這裡只是佔位符，避免在開發環境中產生網路請求
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // 生產環境中的日誌發送邏輯
        }
    }
}

// 全域可用
window.SecurityDataHandler = SecurityDataHandler;