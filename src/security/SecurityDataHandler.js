/**
 * SecurityDataHandler - 統一安全資料處理模組
 * 提供XSS防護、資料完整性檢查、安全儲存等功能
 */
class SecurityDataHandler {
    static #encryptionKey = null;

    /**
     * 清理輸出資料防止XSS
     */
    static sanitizeOutput(data, context = 'html') {
        if (data === null || data === undefined) {
            return '';
        }

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
            return { 
                success: false, 
                error: `儲存失敗: ${error.message}` 
            };
        }
    }

    /**
     * 安全資料檢索
     */
    static async secureRetrieve(key, options = {}) {
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
            return { 
                success: false, 
                error: `檢索失敗: ${error.message}` 
            };
        }
    }

    /**
     * 安全日誌記錄 - 防止日誌注入
     */
    static secureLog(level, message, details = {}) {
        const sanitizedMessage = this.#sanitizeLogMessage(message);
        const sanitizedDetails = this.#sanitizeLogDetails(details);
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message: sanitizedMessage,
            details: sanitizedDetails,
            source: 'SecurityDataHandler'
        };

        // 根據級別決定輸出方式
        switch (level.toLowerCase()) {
            case 'error':
                console.error('[SECURITY]', logEntry);
                break;
            case 'warn':
                console.warn('[SECURITY]', logEntry);
                break;
            case 'info':
                console.info('[SECURITY]', logEntry);
                break;
            default:
                console.log('[SECURITY]', logEntry);
        }

        // 可選：發送到遠端日誌服務
        this.#sendToLogService(logEntry);
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
     * 清理日誌訊息
     */
    static #sanitizeLogMessage(message) {
        if (typeof message !== 'string') {
            message = String(message);
        }
        
        // 移除潛在的日誌注入字符
        return message
            .replace(/[\r\n]/g, ' ')
            .replace(/\t/g, ' ')
            .replace(/\x00-\x1f/g, '')
            .substring(0, 1000); // 限制長度
    }

    /**
     * 清理日誌詳情
     */
    static #sanitizeLogDetails(details) {
        if (!details || typeof details !== 'object') {
            return {};
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            const sanitizedKey = this.#sanitizeLogMessage(key);
            const sanitizedValue = typeof value === 'string' ? 
                this.#sanitizeLogMessage(value) : 
                JSON.stringify(value).substring(0, 500);
            
            sanitized[sanitizedKey] = sanitizedValue;
        }
        
        return sanitized;
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
            throw new Error(`加密失敗: ${error.message}`);
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
            throw new Error(`解密失敗: ${error.message}`);
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